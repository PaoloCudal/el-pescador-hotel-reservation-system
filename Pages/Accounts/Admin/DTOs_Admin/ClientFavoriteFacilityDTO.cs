namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class ClientFavoriteFacilityDTO
    {
        public int FavoriteId { get; set; }
        public int FacilityId { get; set; }
        public string FacilityName { get; set; } = string.Empty;
        public string FacilityType { get; set; } = string.Empty; 

        // For aesthetic modal
        public decimal Price { get; set; }
        public string Description { get; set; } = string.Empty;
        public List<string> Images { get; set; } = new();
    }
}
