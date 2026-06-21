using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HotelReservationWeb.Data.Client_Data;
using HotelReservationWeb.Models.Model_Staff;
using HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin;

namespace HotelReservationWeb.Services
{
    public class StaffService : IStaffService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;

        public StaffService(ApplicationDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public async Task<string?> AuthenticateAsync(LoginRequestDTO loginDto)
        {
            var staff = await _context.tblStaff
                .FirstOrDefaultAsync(s => s.Email == loginDto.Email);

            if (staff == null)
            {
                return null;
            }

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(loginDto.Password, staff.PasswordHash);

            if (!isPasswordValid)
            {
                return null;
            }

            return GenerateJwtToken(staff);
        }

        private string GenerateJwtToken(Staff staff)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, staff.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, staff.Email),
                new Claim("IsSuperAdmin", staff.IsSuperAdmin.ToString().ToLower()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                
                // Unified Role: Assigns "Admin" to satisfy your single-role admin pipeline
                new Claim(ClaimTypes.Role, "Admin")
            };

            // 4. Issue the signed Jwt Token structure matching appsettings.json/Program.cs rules
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8), 
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}