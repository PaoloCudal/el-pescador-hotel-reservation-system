namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class FacilityImageDTO
    {
        public int FacilityImageId { get; set; }
        public string ImagePath { get; set; } = string.Empty;
        public bool IsDeleted { get; set; } = false;
    }
}
