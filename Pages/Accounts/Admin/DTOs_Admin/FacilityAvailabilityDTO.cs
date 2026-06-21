namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class FacilityAvailabilityDTO
    {
        public int AvailabilityId { get; set; }

        public int FacilityId { get; set; }
        public int? RoomTypeId { get; set; }
        public int? VenueId { get; set; }

        public DateTime Date { get; set; }

        public bool IsBlocked { get; set; }

        public string? BookingStatus { get; set; }
    }

}
