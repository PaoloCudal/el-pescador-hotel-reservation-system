using System.Collections.Generic;
namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class RoomTypecs
    {
        public int RoomTypeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal BasePrice { get; set; }
        public int MaxGuests { get; set; }
        public string? Category { get; set; }
        public int FacilityId { get; set; }
        public int? BuildingId { get; set; }
        public List<RoomImageDTO> RoomImages { get; set; } = new();
    }
}
