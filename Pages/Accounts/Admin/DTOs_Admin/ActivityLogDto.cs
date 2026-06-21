namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class ActivityLogDto
    {
        public int ActivityLogId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string PerformedBy { get; set; } = string.Empty;
        public string? Details { get; set; }
        public string CreatedAt { get; set; } = string.Empty;
    }
}