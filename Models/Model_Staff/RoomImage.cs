using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;


namespace HotelReservationWeb.Models.Model_Staff
    {
        [Table("tblRoomImages")]
        public class RoomImage
        {
            [Key]
            public int RoomImageId { get; set; }

            [Required(ErrorMessage = "Image path is required")]
            public string ImagePath { get; set; } = string.Empty; // The relative file path to the image

            // Foreign Key: Links this image back to the specific Room Type
            [ForeignKey("RoomType")]
            public int RoomTypeId { get; set; }

        public bool IsDeleted { get; set; } = false;

        public RoomType RoomType { get; set; } = null!; // Navigation property (must be non-nullable if RoomTypeId is non-nullable)
        }
 }
