using System.ComponentModel.DataAnnotations;

namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class FacilityDTO
    {
        public int FacilityId { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public string Category { get; set; } = string.Empty;

       
        public string? HomeIndexCategory { get; set; } = "None";

        public bool IsExploreHighlight { get; set; }

        // =========================
        // OPTIONAL (Category-based)
        // =========================
        public decimal? Price { get; set; }

        public string? RoomType { get; set; }

        public int CapacityMin { get; set; }

        public int CapacityMax { get; set; }

        public string? Feature1 { get; set; }

        public string? Feature2 { get; set; }

        public string? Meta { get; set; }
        // public string? BadgeColor { get; set; }

        public List<FacilityImageDTO> Images { get; set; } = new();
        public List<RoomTypecs> RoomTypes { get; set; } = new();
        public List<FacilityAvailabilityDTO> Availabilities { get; set; } = new();
        public List<VenueDTO> Venues { get; set; } = new();

        public bool IsDeleted { get; set; } = false;
    }
}
