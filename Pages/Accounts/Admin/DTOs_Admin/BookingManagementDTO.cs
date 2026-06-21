namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class BookingManagementDTO
    {
        public int BookingId { get; set; }

        public string BookingReference { get; set; } = string.Empty;

        public string FacilityCategory { get; set; } = "";

        public string FacilityName { get; set; } = "";

        public bool IsOccupied { get; set; }

        public string BookingStatus { get; set; } = "";
    }
}
