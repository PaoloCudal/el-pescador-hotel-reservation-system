using HotelReservationWeb.Pages.Accounts.User.DTOs_Client;
using Microsoft.Extensions.Configuration;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using System;
using System.Threading.Tasks;

namespace HotelReservationWeb.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendBookingConfirmationEmailAsync(string toEmail, string fullName, BookingSummaryDto booking)
        {
            var smtpHost = _configuration["SMTP:Host"];
            var smtpPortStr = _configuration["SMTP:Port"];
            var smtpUser = _configuration["SMTP:Username"];
            var smtpPassword = _configuration["SMTP:Password"];
            var fromEmail = _configuration["SMTP:Email"];

            if (string.IsNullOrWhiteSpace(smtpPassword) || string.IsNullOrWhiteSpace(fromEmail))
                throw new Exception("SMTP configuration is missing.");

            int smtpPort = int.TryParse(smtpPortStr, out var port) ? port : 587;

            // 1. Create the Message using MimeKit (replaces MailMessage)
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("El Pescador Resort", fromEmail));
            message.To.Add(new MailboxAddress(fullName, toEmail));
            message.Subject = $"Booking Approved – {booking.BookingReference}";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
                <div style='font-family: Arial, sans-serif; color:#333; max-width: 600px; border: 1px solid #D4AF37; padding: 20px; border-radius: 10px;'>
                    <h2 style='color:#0A1A2F;'>Booking Confirmation</h2>
                    <p>Hello <strong>{fullName}</strong>,</p>
                    <p>Your booking has been <strong>approved</strong>. Below is your e-receipt:</p>
                    <hr style='border:none; border-top: 1px solid #D4AF37;' />
                    <table cellpadding='8' cellspacing='0' style='width: 100%; border-collapse: collapse;'>
                        <tr>
                            <td style='border-bottom: 1px solid #eee;'><strong>Reference</strong></td>
                            <td style='border-bottom: 1px solid #eee;'>{booking.BookingReference}</td>
                        </tr>
                        <tr>
                            <td style='border-bottom: 1px solid #eee;'><strong>Facility</strong></td>
                            <td style='border-bottom: 1px solid #eee;'>{booking.FacilityName}</td>
                        </tr>
                        <tr>
                            <td style='border-bottom: 1px solid #eee;'><strong>Check-in</strong></td>
                            <td style='border-bottom: 1px solid #eee;'>{booking.CheckIn:MMM dd, yyyy}</td>
                        </tr>
                        <tr>
                            <td style='border-bottom: 1px solid #eee;'><strong>Check-out</strong></td>
                            <td style='border-bottom: 1px solid #eee;'>{booking.CheckOut:MMM dd, yyyy}</td>
                        </tr>
                        <tr>
                            <td style='border-bottom: 1px solid #eee;'><strong>Total Cost</strong></td>
                            <td style='border-bottom: 1px solid #eee;'><strong>₱{booking.TotalCost:N0}</strong></td>
                        </tr>
                        <tr>
                            <td><strong>Status</strong></td>
                            <td style='color:#10b981;'><strong>Approved</strong></td>
                        </tr>
                    </table>
                    <br/>
                    <p>We look forward to welcoming you!</p>
                    <p>— <strong>El Pescador Resort Hotel</strong></p>
                </div>"
            };

            message.Body = bodyBuilder.ToMessageBody();

            // 2. Use the MailKit SmtpClient (replaces System.Net.Mail.SmtpClient)
            using var client = new SmtpClient();
            try
            {
                client.Timeout = 20000; // 20 seconds

                // For Brevo/Standard SMTP, use StartTls on port 587
                await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);

                await client.AuthenticateAsync(smtpUser, smtpPassword);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                // Re-throw to trigger the Rollback in ApproveBookingAsync
                throw new Exception($"MailKit SMTP Error: {ex.Message}", ex);
            }
        }


        public async Task SendBookingCancellationEmailAsync(string toEmail, string fullName, string bookingReference, string facilityName, DateTime checkIn, DateTime checkOut)
        {
            var smtpHost = _configuration["SMTP:Host"];
            var smtpPortStr = _configuration["SMTP:Port"];
            var smtpUser = _configuration["SMTP:Username"];
            var smtpPassword = _configuration["SMTP:Password"];
            var fromEmail = _configuration["SMTP:Email"];

            if (string.IsNullOrWhiteSpace(smtpPassword) || string.IsNullOrWhiteSpace(fromEmail))
                throw new Exception("SMTP configuration is missing.");

            int smtpPort = int.TryParse(smtpPortStr, out var port) ? port : 587;

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("El Pescador Resort", fromEmail));
            message.To.Add(new MailboxAddress(fullName, toEmail));
            message.Subject = $"Booking Cancelled – {bookingReference}";

            var bodyBuilder = new BodyBuilder
            {
                HtmlBody = $@"
        <div style='font-family: Arial, sans-serif; color:#333; max-width: 600px; border: 1px solid #e53e3e; padding: 20px; border-radius: 10px;'>
            <h2 style='color:#0A1A2F;'>Booking Cancellation</h2>
            <p>Hello <strong>{fullName}</strong>,</p>
            <p>Your booking has been <strong style='color:#e53e3e;'>cancelled</strong>. Below are the details:</p>
            <hr style='border:none; border-top: 1px solid #e53e3e;' />
            <table cellpadding='8' cellspacing='0' style='width: 100%; border-collapse: collapse;'>
                <tr>
                    <td style='border-bottom: 1px solid #eee;'><strong>Reference</strong></td>
                    <td style='border-bottom: 1px solid #eee;'>{bookingReference}</td>
                </tr>
                <tr>
                    <td style='border-bottom: 1px solid #eee;'><strong>Facility</strong></td>
                    <td style='border-bottom: 1px solid #eee;'>{facilityName}</td>
                </tr>
                <tr>
                    <td style='border-bottom: 1px solid #eee;'><strong>Check-in</strong></td>
                    <td style='border-bottom: 1px solid #eee;'>{checkIn:MMM dd, yyyy}</td>
                </tr>
                <tr>
                    <td style='border-bottom: 1px solid #eee;'><strong>Check-out</strong></td>
                    <td style='border-bottom: 1px solid #eee;'>{checkOut:MMM dd, yyyy}</td>
                </tr>
                <tr>
                    <td><strong>Status</strong></td>
                    <td style='color:#e53e3e;'><strong>Cancelled</strong></td>
                </tr>
            </table>
            <br/>
            <p>If you did not request this cancellation or have any concerns, please contact us directly.</p>
            <p>We hope to welcome you another time!</p>
            <p>— <strong>El Pescador Resort Hotel</strong></p>
        </div>"
            };

            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            try
            {
                client.Timeout = 20000;
                await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(smtpUser, smtpPassword);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                throw new Exception($"MailKit SMTP Error: {ex.Message}", ex);
            }
        }
    }
}
    
    
