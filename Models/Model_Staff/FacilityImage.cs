using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelReservationWeb.Models.Model_Staff
{
    [Table("tblFacilityImages")]
    public class FacilityImage
    {
        [Key]
        public int FacilityImageId { get; set; }

        [Required(ErrorMessage = "Image path is required")]
        public string ImagePath { get; set; } = string.Empty; // initialize to avoid null errors

        [ForeignKey("Facility")]
        public int FacilityId { get; set; }

        public bool IsDeleted { get; set; } = false;

        // Initialize navigation property to avoid null reference
        public Facility Facility { get; set; } = null!;
    }
}
