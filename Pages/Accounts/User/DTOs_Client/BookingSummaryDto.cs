namespace HotelReservationWeb.Pages.Accounts.User.DTOs_Client
{
    public class BookingSummaryDto
    {
        public string BookingReference { get; set; } = string.Empty;

        public string FacilityName { get; set; } = string.Empty;

        public DateTime CheckIn { get; set; }
        public DateTime CheckOut { get; set; }

        public int Nights { get; set; }
        public decimal TotalCost { get; set; }

        public string Status { get; set; } = string.Empty;

        public string PriceDetails { get; set; } = string.Empty;

        public string PaymentType { get; set; } = string.Empty;

        public int ClientId { get; set; } 
        }
}
