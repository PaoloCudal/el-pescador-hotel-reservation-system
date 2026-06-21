namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class AmenityCardDTO
    {
        public int VenueId { get; set; }
        public int FacilityId { get; set; }
        public string Name { get; set; } = "";
        public decimal Price { get; set; }
        public string Feature1 { get; set; } = "";
        public string Feature2 { get; set; } = "";
        public string? Feature3  { get; set; }   // 👈 include
        public List<FacilityImageDTO> Images { get; set; } = new();
    }
}
