namespace HotelReservationWeb.Pages.Accounts.User.DTOs_Client
{
    public class UserBookingDto
    {
        public string BookingReference { get; set; } = "";
        public int FacilityId { get; set; }
        public string FacilityName { get; set; } = "";
        public string Description { get; set; } = "";
        public decimal Price { get; set; }
        public List<string> Images { get; set; } = new();

        public DateTime CheckIn { get; set; }
        public DateTime CheckOut { get; set; }
        public int Nights { get; set; }
        public decimal TotalCost { get; set; }
        public string PriceDetails { get; set; } = "";
        public string Status { get; set; } = "";
        public string PaymentType { get; set; } = "";
        public string? SpecialRequest { get; set; }
    }

}
