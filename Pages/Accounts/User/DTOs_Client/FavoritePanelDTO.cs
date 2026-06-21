namespace HotelReservationWeb.Pages.Accounts.User.DTOs_Client
{
    public class FavoritePanelDTO
    {
        public int FavoriteId { get; set; }
        public int? RoomTypeId { get; set; }
        public string? RoomTypeName { get; set; }
        public int? VenueId { get; set; }
        public string? VenueName { get; set; }
        public string? ImagePath { get; set; }
    }
}
