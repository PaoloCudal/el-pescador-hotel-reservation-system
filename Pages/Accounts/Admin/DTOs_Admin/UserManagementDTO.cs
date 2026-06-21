namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class UserManagementDTO
{
    public int ClientId { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public DateTime JoinDate { get; set; }
    public int TotalBookings { get; set; }
}
}
