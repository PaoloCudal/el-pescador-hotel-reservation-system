namespace HotelReservationWeb.Models.Model_Staff
{
    public class Staff
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public bool IsSuperAdmin { get; set; }
    }
}