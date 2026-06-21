using HotelReservationWeb.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
[ApiController]
[Route("api/admin/reports")]
public class AdminReportController : ControllerBase
{
    private readonly IReportService _reportService;

    public AdminReportController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("financial")]
    public async Task<IActionResult> Financial([FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        try
        {
            var pdf = await _reportService.GenerateFinancialReportPdf(from, to);
            return File(pdf, "application/pdf", $"Financial_Report_{from:yyyyMMdd}_{to:yyyyMMdd}.pdf");
        }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> Bookings([FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        try
        {
            var pdf = await _reportService.GenerateBookingReportPdf(from, to);
            return File(pdf, "application/pdf", $"Booking_Report_{from:yyyyMMdd}_{to:yyyyMMdd}.pdf");
        }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("occupancy")]
    public async Task<IActionResult> Occupancy([FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        try
        {
            var pdf = await _reportService.GenerateOccupancyReportPdf(from, to);
            return File(pdf, "application/pdf", $"Occupancy_Report_{from:yyyyMMdd}_{to:yyyyMMdd}.pdf");
        }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }
}