using System.ComponentModel.DataAnnotations;

namespace HotelReservationWeb.Pages.Accounts.User.DTOs_Client
{
    public class ResetPassword
    {
        [Required(ErrorMessage = "Password is required")]
        [DataType(DataType.Password)]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
        [RegularExpression(@"(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).+",
            ErrorMessage = "Password must contain uppercase, lowercase, number, and special character")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirm Password is required")]
        [DataType(DataType.Password)]
        [Compare("Password", ErrorMessage = "Passwords do not match")]
        public string ConfirmPassword { get; set; } = string.Empty;

        [Required]
        public string Token { get; set; } = string.Empty; 
    }
}
