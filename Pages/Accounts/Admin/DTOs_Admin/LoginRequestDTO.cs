using System.ComponentModel.DataAnnotations;
namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin;

    public class LoginRequestDTO
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }
