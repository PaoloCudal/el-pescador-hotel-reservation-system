
using HotelReservationWeb.Pages.Accounts.User.DTOs_Client;

namespace HotelReservationWeb.Services
{
    public interface IEmailService
    {
        Task SendBookingConfirmationEmailAsync(string toEmail, string fullName, BookingSummaryDto booking);
        Task SendBookingCancellationEmailAsync(string toEmail, string fullName, string bookingReference, string facilityName, DateTime checkIn, DateTime checkOut);
    }
}
