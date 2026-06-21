using HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin;

namespace HotelReservationWeb.Pages.Accounts.Admin
{
    public class AvailabilityMonthDTO
    {
        public int FacilityId { get; set; }
        public int? RoomTypeId { get; set; }
        public int? VenueId { get; set; }

        public int Year { get; set; }
        public int Month { get; set; }

        public List<FacilityAvailabilityDTO> Days { get; set; } = new();
    }
}
