using System.ComponentModel.DataAnnotations;
namespace HotelReservationWeb.Pages.Accounts.User.DTOs_Client
{
    public class ForgotPasswordDTO
    {
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; } = string.Empty;
    }
}
