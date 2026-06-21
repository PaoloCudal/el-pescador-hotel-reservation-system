namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class ClientBookingHistoryDTO
    {
        public string BookingReference { get; set; } = string.Empty;
        public string FacilityName { get; set; } = string.Empty;
        public DateTime CheckIn { get; set; }
        public DateTime CheckOut { get; set; }
        public List<string> Images { get; set; } = new();
        public string Status { get; set; } = string.Empty;
        public string PaymentType { get; set; } = string.Empty;
    }
}
