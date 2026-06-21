using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelReservationWeb.Models.Model_Staff
{
    public class Venue
    {
        [Key]
        public int VenueId { get; set; }

        [Required]
        public int FacilityId { get; set; }  // Reference to Facility


        // navigation property - keep nullable so EF can set it
        [ForeignKey(nameof(FacilityId))]
        public Facility? Facility { get; set; }

        [Required]
        public string VenueCategory { get; set; } = string.Empty;  // e.g. "Kubo Hall"

        public bool IsDeleted { get; set; } = false;

        public bool IsExploreHighlight { get; set; }

        public int CapacityMin { get; set; }
        public int CapacityMax { get; set; }

        public string? Feature1 { get; set; }
        public string? Feature2 { get; set; }

        public string Meta { get; set; } = string.Empty;

        // availability nav
        public ICollection<FacilityAvailability> Availabilities { get; set; } = new List<FacilityAvailability>();
    }
}
