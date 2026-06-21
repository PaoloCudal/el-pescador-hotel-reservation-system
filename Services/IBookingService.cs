using HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin;
using HotelReservationWeb.Pages.Accounts.User.DTOs_Client;
using Microsoft.AspNetCore.Mvc;

namespace HotelReservationWeb.Services
{
    public interface IBookingService
    {
        Task<BookingSummaryDto> CreateBookingAsync(CreateBookingDto dto, int clientId);
        Task<BookingSummaryDto?> GetBookingSummaryAsync(string bookingReference);
        Task<BookingSummaryDto> PreviewBookingAsync(CreateBookingDto dto);
        Task<MyAccountDTO?> GetMyAccountAsync(int clientId);
        Task<List<UserBookingDto>> GetActiveBookingsAsync(int clientId);
        Task<bool> CancelBookingAsync(int bookingId);
        Task<bool> CancelBookingAsync(string bookingReference);
        Task<bool> ApproveBookingAsync(int bookingId);
        Task<List<BookingManagementDTO>> GetBookingManagementAsync();
        Task<List<ClientFavoriteFacilityDTO>> GetClientFavoriteFacilitiesAsync(int clientId);
        Task<List<UserManagementDTO>> GetUsersForManagementAsync();
        Task<List<BookingNotificationDto>> GetPendingBookingNotificationsAsync();
        Task<bool> IsRoomAvailableAsync(int roomTypeId, DateTime checkIn, DateTime checkOut);
        Task<bool> IsVenueAvailableAsync(int facilityId, int venueId, DateTime checkIn, DateTime checkOut);
        Task LogActivityAsync(string action, string performedBy, string? details = null);
        Task<List<ActivityLogDto>> GetRecentActivityLogsAsync(int count = 20);
        Task<DashboardStatsDto> GetDashboardStatsAsync();

        Task<bool> DeleteActivityLogAsync(int activityLogId);
    }
}