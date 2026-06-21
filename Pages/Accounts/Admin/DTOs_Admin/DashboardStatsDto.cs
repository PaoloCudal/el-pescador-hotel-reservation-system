namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class DashboardStatsDto
    {
        public int TotalBookings { get; set; }
        public int PendingCheckins { get; set; }
        public decimal TotalRevenue { get; set; }
    }
}