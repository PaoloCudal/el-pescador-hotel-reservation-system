namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class BookingNotificationDto
    {
        public string BookingReference { get; set; } = "";
        public string FacilityName { get; set; } = "";
        public string CheckIn { get; set; } = "";
        public string CheckOut { get; set; } = "";
        public string PaymentType { get; set; } = "";
        public string CreatedAt { get; set; } = "";
    }
}