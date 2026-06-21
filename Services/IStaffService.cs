using  HotelReservationWeb.Models.Model_Staff;
using HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin;
namespace HotelReservationWeb.Services{
   public interface IStaffService
    {
        Task<string?> AuthenticateAsync(LoginRequestDTO loginDto);
    }
}