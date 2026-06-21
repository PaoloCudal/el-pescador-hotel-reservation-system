using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace HotelReservationWeb.Models.Model_Staff
{
    [Table("tblRoomTypes")]
    public class RoomType
    {
        [Key]
        public int RoomTypeId { get; set; }

        [Required, StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required, Column(TypeName = "decimal(18,2)")]
        public decimal BasePrice { get; set; }

        [Required]
        public int MaxGuests { get; set; }

        public string? Category { get; set; }

        // Facility relationship
        public int FacilityId { get; set; }
        public Facility Facility { get; set; } = null!;

        public bool IsDeleted { get; set; } = false;

        
        public int? BuildingId { get; set; }
        public Building? Building { get; set; }

       
        public ICollection<RoomImage> RoomImages { get; set; } = new List<RoomImage>();

        public ICollection<FacilityAvailability> Availabilities { get; set; } = new List<FacilityAvailability>();
    }
}
