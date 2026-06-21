namespace HotelReservationWeb.Pages.Accounts.User.DTOs_Client
{
    public class CreateBookingDto
    {
            public int? FacilityId { get; set; }

            // Only ONE of these will be filled
            public int? RoomTypeId { get; set; }
            public int? VenueId { get; set; }

            public DateTime CheckIn { get; set; }
            public DateTime CheckOut { get; set; }

            public string? SpecialRequest { get; set; }

            public string PaymentType { get; set; } = string.Empty;

    }
}
