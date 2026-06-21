using HotelReservationWeb.Pages.Accounts.User.DTOs_Client;
using HotelReservationWeb.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

[ApiController]
[Route("api/booking")]
public class BookNowController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookNowController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    // ==========================
    // CREATE BOOKING
    // ==========================
    [Authorize(AuthenticationSchemes = CookieAuthenticationDefaults.AuthenticationScheme)]
    [HttpPost("create")]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingDto dto)
{
    var clientIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

    if (string.IsNullOrEmpty(clientIdClaim))
        return Unauthorized(new { message = "Client session not found." });

    if (!int.TryParse(clientIdClaim, out int clientId))
        return Unauthorized(new { message = "Invalid client session." });

    if (!dto.RoomTypeId.HasValue && !dto.VenueId.HasValue)
        return BadRequest(new { message = "You must provide either RoomTypeId or VenueId." });

    if (dto.CheckIn == default || dto.CheckOut == default)
        return BadRequest(new { message = "CheckIn and CheckOut dates are required." });

    if (dto.CheckOut <= dto.CheckIn)
        return BadRequest(new { message = "CheckOut date must be after CheckIn date." });

    try
    {
        var bookingSummary = await _bookingService.CreateBookingAsync(dto, clientId);

        if (bookingSummary == null)
            return BadRequest(new { message = "Failed to create booking. Please check your input." });

        return Ok(bookingSummary);
    }
    catch (Exception ex)
    {
        return BadRequest(new { message = $"Error creating booking: {ex.Message}" });
    }
}

    // ==========================
    // BOOKING SUMMARY
    // ==========================
    [HttpGet("summary")]
    public async Task<IActionResult> GetBookingSummary([FromQuery] string reference)
    {
        if (string.IsNullOrWhiteSpace(reference))
            return BadRequest(new { message = "Booking reference is required" });

        var bookingSummary = await _bookingService.GetBookingSummaryAsync(reference);

        if (bookingSummary == null)
            return NotFound(new { message = "Booking not found" });

        return Ok(bookingSummary);
    }

    // ==========================
    // PREVIEW BOOKING
    // ==========================
    [HttpPost("preview")]
    public async Task<IActionResult> PreviewBooking([FromBody] CreateBookingDto dto)
{
    if (!dto.RoomTypeId.HasValue && !dto.VenueId.HasValue)
        return BadRequest(new { message = "RoomTypeId or VenueId is required." });

    try
    {
        var preview = await _bookingService.PreviewBookingAsync(dto);
        return Ok(preview);
    }
    catch (Exception ex)
    {
        return BadRequest(new { message = ex.Message });
    }
}

    // ==========================
    // MY ACCOUNT
    // ==========================
    [HttpGet("my-account/{clientId}")]
    public async Task<IActionResult> GetMyAccount(int clientId)
    {
        var accountDto = await _bookingService.GetMyAccountAsync(clientId);

        if (accountDto == null)
            return NotFound(new { message = "Client not found" });

        return Ok(accountDto);
    }

    // ==========================
    // ACTIVE BOOKINGS
    // ==========================
    [HttpGet("active/{clientId}")]
    public async Task<IActionResult> GetActiveBookings(int clientId)
    {
        var bookings = await _bookingService.GetActiveBookingsAsync(clientId);
        return Ok(bookings);
    }

    // ==========================
    // CANCEL BOOKING
    // ==========================
    [HttpPost("cancel/{bookingReference}")]
    public async Task<IActionResult> CancelBooking(string bookingReference)
    {
        var success = await _bookingService.CancelBookingAsync(bookingReference);

        if (!success)
            return BadRequest(new { message = "Failed to cancel booking" });

        return Ok(new { message = "Booking cancelled successfully" });
    }
}