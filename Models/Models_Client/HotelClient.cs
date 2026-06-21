using System.ComponentModel.DataAnnotations;

namespace HotelReservationWeb.Models.Models_Client
{
    public class HotelClient
    {
        [Key]
        public int ClientId { get; set; }

        [Required, MaxLength(20)]
        public string FirstName { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? MiddleName { get; set; }

        [Required, MaxLength(20)]
        public string LastName { get; set; } = string.Empty;

        [Required, MaxLength(30)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public DateTime JoinDate { get; set; } = DateTime.UtcNow;

        [Required, MaxLength(255)]
        public string Password { get; set; } = string.Empty;

        [Required, MaxLength(60)]
        public string FullAddress { get; set; } = string.Empty;

        public string? ResetPasswordToken { get; set; }

        public DateTime? ResetPasswordTokenExpiry { get; set; }
    }
}