using HotelReservationWeb.Data.Client_Data;
using HotelReservationWeb.Hubs;
using HotelReservationWeb.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using QuestPDF.Infrastructure;
using System.Globalization;
using System.Security.Claims;
using System.Text;

namespace HotelReservationWeb
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // ✅ SAFE QUESTPDF INIT
            try
            {
                QuestPDF.Settings.License = LicenseType.Community;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"QuestPDF init warning: {ex.Message}");
            }

            builder.WebHost.ConfigureKestrel(options =>
            {
                options.Limits.MaxRequestBodySize = 52_428_800;
            });

            builder.Services.Configure<IISServerOptions>(options =>
            {
                options.MaxRequestBodySize = 52_428_800;
            });

            var connectionString =
                builder.Configuration.GetConnectionString("DefaultConnection");

            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseMySql(
                    connectionString,
                    new MySqlServerVersion(new Version(8, 0, 30))
                )
            );

            // ✅ FORWARDED HEADERS — required for MonsterASP proxy
            builder.Services.AddHttpContextAccessor();
            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor |
                                           ForwardedHeaders.XForwardedProto;
                options.KnownNetworks.Clear();
                options.KnownProxies.Clear();
            });

            builder.Services.AddControllers();
            builder.Services.AddRazorPages();
            builder.Services.AddSignalR();

            // =========================
            // CORS
            // =========================
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("Frontend", policy =>
                {
                    policy.WithOrigins(
                    "https://localhost:7065",
                    "http://localhost:3000",
                    "https://elpescador2026.tryasp.net"
                    )
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
                });
            });

            // =========================
            // AUTH
            // =========================
            builder.Services
                .AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                    options.DefaultSignInScheme       = CookieAuthenticationDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme    = CookieAuthenticationDefaults.AuthenticationScheme;
                })

                // =========================
                // COOKIE AUTH
                // =========================
                .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
                {
                    options.LoginPath        = "/Accounts/User/UserLogin";
                    options.AccessDeniedPath = "/Accounts/User/AccessDenied";

                    options.ExpireTimeSpan    = TimeSpan.FromDays(30);
                    options.SlidingExpiration = true;

                    options.Cookie.HttpOnly = true;
                    options.Cookie.Name     = ".ElPescador.Auth";

                    // ✅ FIX FOR MONSTERASP PROXY
                    options.Cookie.SameSite     = SameSiteMode.Lax;
                    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;

                    options.Events = new CookieAuthenticationEvents
                    {
                        OnRedirectToLogin = ctx =>
                        {
                            if (ctx.Request.Path.StartsWithSegments("/api"))
                            {
                                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                                return Task.CompletedTask;
                            }
                            ctx.Response.Redirect(ctx.RedirectUri);
                            return Task.CompletedTask;
                        },

                        OnRedirectToAccessDenied = ctx =>
                        {
                            if (ctx.Request.Path.StartsWithSegments("/api"))
                            {
                                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                                return Task.CompletedTask;
                            }
                            ctx.Response.Redirect(ctx.RedirectUri);
                            return Task.CompletedTask;
                        }
                    };
                })

                // =========================
                // JWT
                // =========================
                .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    options.RequireHttpsMetadata = false;
                    options.SaveToken            = true;

                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer           = true,
                        ValidateAudience         = true,
                        ValidateLifetime         = true,
                        ValidateIssuerSigningKey = true,

                        ValidIssuer   = builder.Configuration["Jwt:Issuer"],
                        ValidAudience = builder.Configuration["Jwt:Audience"],

                        IssuerSigningKey = new SymmetricSecurityKey(
                            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!)
                        ),

                        ClockSkew     = TimeSpan.Zero,
                        RoleClaimType = ClaimTypes.Role
                    };

                    options.Events = new JwtBearerEvents
                    {
                        OnMessageReceived = context =>
                        {
                            var accessToken = context.Request.Query["access_token"];
                            var path        = context.HttpContext.Request.Path;

                            if (!string.IsNullOrEmpty(accessToken)
                                && path.StartsWithSegments("/hotelhub"))
                            {
                                context.Token = accessToken;
                            }
                            else
                            {
                                var token = context.Request.Headers["Authorization"]
                                    .FirstOrDefault()
                                    ?.Split(" ")
                                    .Last();

                                if (!string.IsNullOrEmpty(token))
                                    context.Token = token;
                            }

                            return Task.CompletedTask;
                        }
                    };
                });

            builder.Services.AddDistributedMemoryCache();

            builder.Services.AddSession(options =>
            {
                options.IdleTimeout        = TimeSpan.FromMinutes(30);
                options.Cookie.HttpOnly    = true;
                options.Cookie.IsEssential = true;
            });

            // =========================
            // SERVICES
            // =========================
            builder.Services.AddScoped<IFacilityService, FacilityService>();
            builder.Services.AddScoped<IFavorites,       FavoriteService>();
            builder.Services.AddScoped<IBookingService,  BookingService>();
            builder.Services.AddScoped<IEmailService,    EmailService>();
            builder.Services.AddScoped<IReportService,   ReportService>();
            builder.Services.AddScoped<IStaffService,    StaffService>();

            var app = builder.Build();

            // ✅ MUST BE FIRST — before any other middleware
            app.UseForwardedHeaders(new ForwardedHeadersOptions
            {
                ForwardedHeaders = ForwardedHeaders.XForwardedFor |
                                   ForwardedHeaders.XForwardedProto
            });

            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                db.Database.EnsureCreated();
            }

            var cultureInfo = new CultureInfo("en-US");
            CultureInfo.DefaultThreadCurrentCulture   = cultureInfo;
            CultureInfo.DefaultThreadCurrentUICulture = cultureInfo;

            app.UseCors("Frontend");

            if (!app.Environment.IsDevelopment())
            {
                app.UseExceptionHandler("/HomeIndex");
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();

            app.UseRouting();

            app.UseSession();
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapRazorPages();
            app.MapHub<HotelHub>("/hotelhub");

            app.MapGet("/", context =>
            {
                context.Response.Redirect("/HomeIndex");
                return Task.CompletedTask;
            });

            app.Run();
        }
    }
}