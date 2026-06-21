using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class VenueDTO
    {
        public int VenueId { get; set; }
        public string VenueCategory { get; set; } = string.Empty;
        public bool IsDeleted { get; set; } = false;

        public int FacilityId { get; set; }

        public int CapacityMin { get; set; }
        
        public int CapacityMax { get; set; }
        
        public string VenueName { get; set; } = string.Empty;
       
        public decimal? VenuePrice { get; set; }
        
        public string Meta { get; set; } = string.Empty;
       
        public string Description { get; set; } = string.Empty;
        
        public string? Feature1 { get; set; }
        [Required]
        public string? Feature2 { get; set; }
        public List<FacilityImageDTO> Images { get; set; } = new();
        public List<FacilityAvailabilityDTO> Availabilities { get; set; } = new();
    }
}
