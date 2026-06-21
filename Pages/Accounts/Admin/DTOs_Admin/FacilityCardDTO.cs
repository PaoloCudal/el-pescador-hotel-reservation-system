namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class FacilityCardDTO
    {
        public int FacilityId { get; set; }
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public int RoomTypeId { get; set; }
        public decimal Price { get; set; }
        public string HomeIndexCategory { get; set; } = "";
        public int BuildingId { get; set; }
        public string? Badge { get; set; }
        public string BuildingName { get; set; } = "";
        public string? BadgeColor { get; set; }
        public bool IsDeleted { get; set; } = false;
        public List<FacilityImageDTO> Images { get; set; } = new();
        public List<FacilityAvailabilityDTO> Availabilities { get; set; } = new();
    }
}
