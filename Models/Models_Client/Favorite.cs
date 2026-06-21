using HotelReservationWeb.Models.Model_Staff;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelReservationWeb.Models.Models_Client
{
    public class Favorite
    {
        [Key]
        public int FavoriteId { get; set; }

        public int ClientId { get; set; }  // FK to tblHotelClient
        [ForeignKey(nameof(ClientId))]
        public HotelClient Client { get; set; } = null!;

        public int? RoomTypeId { get; set; } // FK to tblRoomTypes
        [ForeignKey(nameof(RoomTypeId))]
        public RoomType? RoomType { get; set; }

        public int? VenueId { get; set; } // FK to tblVenues
        [ForeignKey(nameof(VenueId))]
        public Venue? Venue { get; set; }

        public bool IsDeleted { get; set; } = false;

        public DateTime AddedAt { get; set; } = DateTime.Now;
    }
}
