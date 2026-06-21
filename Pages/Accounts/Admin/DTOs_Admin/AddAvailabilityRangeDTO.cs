namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class AddAvailabilityRangeDTO
    {
        public int FacilityId { get; set; }
        public int? RoomTypeId { get; set; }
        public int? VenueId { get; set; }
        public List<DateTime> Dates { get; set; } = new();
    }
}
