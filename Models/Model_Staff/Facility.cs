using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace HotelReservationWeb.Models.Model_Staff
{
    [Table("tblFacilities")]
    public class Facility
    {
        [Key]
        public int FacilityId { get; set; }

        [Required, MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [Required, MaxLength(200)]
        public string Description { get; set; } = string.Empty;

        [DisplayFormat(DataFormatString = "{0:N2}", ApplyFormatInEditMode = true)]
        public decimal? Price { get; set; }

        [StringLength(50)]
        public string? HomeIndexCategory { get; set; }

        [Required, MaxLength(50)]
        public string Category { get; set; } = string.Empty;

        public bool IsExploreHighlight { get; set; } 

        public bool IsDeleted { get; set; } = false;

        [JsonIgnore]
        public ICollection<RoomType> RoomTypes { get; set; } = new List<RoomType>();

        [JsonIgnore]
        public ICollection<FacilityAvailability> Availabilities { get; set; } = new List<FacilityAvailability>();

        [JsonIgnore]
        public ICollection<FacilityImage> FacilityImages { get; set; } = new List<FacilityImage>();

        
        public ICollection<Venue> Venues { get; set; } = new List<Venue>();
    }
}
