using HotelReservationWeb.Attributes;
using System.ComponentModel.DataAnnotations;

namespace HotelReservationWeb.Pages.Accounts.User.DTOs_Client
{
    public class UserRegistration
    {
        [Required]
        public string Firstname { get; set; } = string.Empty;

        public string? Middlename { get; set; }

        [Required]
        public string Lastname { get; set; } = string.Empty;

        [Required]
        public string FullAddress { get; set; } = string.Empty;

        [Required]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StrongPassword]
        public string Password { get; set; } = string.Empty;

        [Required]
        [Compare("Password", ErrorMessage = "Password and Confirm Password do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;

        // ✅ Remove [Required] — bool defaults to false which fails Required validation
        public bool TermsAndConditions { get; set; }
    }
}