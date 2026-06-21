using System.ComponentModel.DataAnnotations;

namespace HotelReservationWeb.Models.Model_Staff
{
    public class ActivityLog
    {
        [Key]
        public int ActivityLogId { get; set; }

        [Required]
        public string Action { get; set; } = string.Empty;

        [Required]
        public string PerformedBy { get; set; } = string.Empty;

        public string? Details { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}