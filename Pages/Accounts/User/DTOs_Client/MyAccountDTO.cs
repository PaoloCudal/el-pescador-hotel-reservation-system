namespace HotelReservationWeb.Pages.Accounts.User.DTOs_Client
{
    public class MyAccountDTO
    {
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public DateTime JoinDate { get; set; }
        public int FavoriteRoomsCount { get; set; }
        public int FavoriteVenuesCount { get; set; }
    }
}
