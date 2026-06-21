using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;
using HotelReservationWeb.Models.Model_Staff;


namespace HotelReservationWeb.Models.Model_Staff
    {
    [Table("tblBuildings")]
    public class Building
    {
        [Key]
        public int BuildingId { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public string? ShortDescription { get; set; }
        public string? ImagePath { get; set; }

        public ICollection<RoomType> RoomTypes { get; set; } = new List<RoomType>();
    }
}


