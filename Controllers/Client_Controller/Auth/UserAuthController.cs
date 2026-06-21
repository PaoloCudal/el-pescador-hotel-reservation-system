using HotelReservationWeb.Data.Client_Data;
using HotelReservationWeb.Models.Models_Client;
using HotelReservationWeb.Pages.Accounts.User.DTOs_Client;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Mail;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace HotelReservationWeb.Controllers.Client_Controller.Auth
{
    [Route("api/auth")]
    [ApiController]
    public class UserAuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public UserAuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // REGISTER
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegistration dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!dto.TermsAndConditions)
                return BadRequest(new { message = "You must agree to the Terms and Conditions." });

            var emailExists = await _context.tblHotelClient.AnyAsync(u => u.Email == dto.Email);
            if (emailExists)
                return Conflict(new { message = "Email is already registered." });

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, 10);

            var newUser = new HotelClient
            {
                FirstName = dto.Firstname,
                MiddleName = dto.Middlename,
                LastName = dto.Lastname,
                FullAddress = dto.FullAddress,
                Email = dto.Email,
                Password = passwordHash
            };

            await _context.tblHotelClient.AddAsync(newUser);
            await _context.SaveChangesAsync();

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, newUser.ClientId.ToString()),
                new Claim(ClaimTypes.Name, $"{newUser.FirstName} {newUser.LastName}"),
                new Claim(ClaimTypes.Email, newUser.Email),
                new Claim(ClaimTypes.Role, "Client")
            };

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(identity),
                new AuthenticationProperties
                {
                    IsPersistent = true,
                    ExpiresUtc = DateTimeOffset.UtcNow.AddDays(30)
                });

            return Ok(new { message = "Registration successful!" });
        }

        // =========================
        // LOGIN
        // =========================
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginDTO dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _context.tblHotelClient.FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.Password))
                return Unauthorized(new { message = "Invalid email or password." });

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.ClientId.ToString()),
                new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, "Client")
            };

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(identity),
                new AuthenticationProperties
                {
                    IsPersistent = true,
                    ExpiresUtc = DateTimeOffset.UtcNow.AddDays(30)
                });

            return Ok(new
            {
                message = "Login successful!",
                user = new
                {
                    id = user.ClientId,
                    name = $"{user.FirstName} {user.LastName}",
                    email = user.Email
                }
            });
        }

        // =========================
        // CHECK PASSWORD
        // =========================
        [HttpPost("check-password")]
        public async Task<IActionResult> CheckPassword([FromBody] UserLoginDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest(new { valid = false });

            var user = await _context.tblHotelClient.FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
                return Ok(new { valid = false });

            return Ok(new { valid = BCrypt.Net.BCrypt.Verify(dto.Password, user.Password) });
        }

        // =========================
        // CHECK EMAIL
        // =========================
        [HttpGet("check-email")]
        public async Task<IActionResult> CheckEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { exists = false });

            var exists = await _context.tblHotelClient.AnyAsync(u => u.Email == email);
            return Ok(new { exists });
        }

        // =========================
        // FORGOT PASSWORD
        // =========================
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDTO dto)
        {
            var user = await _context.tblHotelClient.FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null)
                return Ok(new { message = "If the email exists, a reset link has been sent." });

            var token = GenerateSecureToken();

            user.ResetPasswordToken = token;
            user.ResetPasswordTokenExpiry = DateTime.UtcNow.AddMinutes(30);

            await _context.SaveChangesAsync();

            var baseUrl = _configuration["App:BaseUrl"];
            var resetLink = $"{baseUrl}/ResetPassword?token={Uri.EscapeDataString(token)}";

            await SendResetPasswordEmail(user.Email, user.FirstName, resetLink);

            return Ok(new { message = "Password reset link sent." });
        }

        // =========================
        // RESET PASSWORD
        // =========================
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPassword dto)
        {
            var user = await _context.tblHotelClient
                .FirstOrDefaultAsync(u => u.ResetPasswordToken == dto.Token);

            if (user == null || user.ResetPasswordTokenExpiry < DateTime.UtcNow)
                return BadRequest(new { message = "Invalid or expired token." });

            user.Password = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            user.ResetPasswordToken = null;
            user.ResetPasswordTokenExpiry = null;

            await _context.SaveChangesAsync();

            await SendPasswordResetConfirmationEmail(
                user.Email,
                $"{user.FirstName} {user.LastName}"
            );

            return Ok(new { message = "Password reset successful!" });
        }

        // =========================
        // ME (SESSION CHECK)
        // =========================
        [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
        [HttpGet("me")]
        public IActionResult Me()
        {
            return Ok(new
            {
                isAuthenticated = true,
                userId = User.FindFirstValue(ClaimTypes.NameIdentifier),
                email = User.FindFirstValue(ClaimTypes.Email),
                fullName = User.FindFirstValue(ClaimTypes.Name),
                role = User.FindFirstValue(ClaimTypes.Role)
            });
        }

        // =========================
        // LOGOUT
        // =========================
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Ok(new { message = "Logged out successfully." });
        }

        // =========================
        // HELPERS
        // =========================
        private string GenerateSecureToken()
        {
            var bytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes)
                .Replace("+", "")
                .Replace("/", "")
                .Replace("=", "");
        }

        // =========================
        // EMAIL: RESET PASSWORD
        // =========================
        private async Task SendResetPasswordEmail(string toEmail, string firstName, string resetLink)
        {
            var smtp = new SmtpClient(
                _configuration["SMTP:Host"],
                int.Parse(_configuration["SMTP:Port"]))
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(
                    _configuration["SMTP:Username"],
                    _configuration["SMTP:Password"])
            };

            var message = new MailMessage
            {
                From = new MailAddress(_configuration["SMTP:Email"], "Hotel System"),
                Subject = "Reset Password",
                IsBodyHtml = true,
                Body = $"Reset link: {resetLink}"
            };

            message.To.Add(toEmail);
            await smtp.SendMailAsync(message);
        }

        // =========================
        // EMAIL: CONFIRM RESET
        // =========================
        private async Task SendPasswordResetConfirmationEmail(string toEmail, string fullName)
        {
            var smtp = new SmtpClient(
                _configuration["SMTP:Host"],
                int.Parse(_configuration["SMTP:Port"]))
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(
                    _configuration["SMTP:Username"],
                    _configuration["SMTP:Password"])
            };

            var message = new MailMessage
            {
                From = new MailAddress(_configuration["SMTP:Email"], "Hotel System"),
                Subject = "Password Changed",
                IsBodyHtml = true,
                Body = $"Hello {fullName}, your password has been changed successfully."
            };

            message.To.Add(toEmail);
            await smtp.SendMailAsync(message);
        }
    }
}