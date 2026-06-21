using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HotelReservationWeb.Models.Model_Staff;

namespace HotelReservationWeb.Models.Model_Staff
{
    public class FacilityAvailability
    {
        [Key]
        public int AvailabilityId { get; set; }

        // ---------------- Facility ----------------
        [Required]
        public int FacilityId { get; set; }

        [ForeignKey("FacilityId")]
        public Facility Facility { get; set; } = null!;

        // ---------------- RoomType (nullable for venues) ----------------
        public int? RoomTypeId { get; set; }

        [ForeignKey("RoomTypeId")]
        public RoomType? RoomType { get; set; }

        // ---------------- Venue (nullable for rooms) ----------------
        public int? VenueId { get; set; }

        [ForeignKey("VenueId")]
        public Venue? Venue { get; set; }

        // ---------------- Date ----------------
        [Required]
        public DateTime Date { get; set; }

        // ---------------- Slots ----------------
        [Required]
        public int TotalSlots { get; set; }

        public int BookedSlots { get; set; }

        public bool IsBlocked { get; set; }

        [NotMapped]
        public int AvailableSlots => TotalSlots - BookedSlots;

        [NotMapped]
        public bool IsAvailable => AvailableSlots > 0;

        public bool IsDeleted { get; set; } = false;

        // ---------------- Navigation ----------------
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    }
}
