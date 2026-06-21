using Microsoft.AspNetCore.Mvc;
using HotelReservationWeb.Services;
using HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin;

[ApiController]
[Route("api/[controller]")]
public class StaffController : ControllerBase
{
    private readonly IStaffService _staffService;

    public StaffController(IStaffService staffService)
    {
        _staffService = staffService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDTO loginDto)
    {
    
        var token = await _staffService.AuthenticateAsync(loginDto);

        if (token == null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(new { 
            message = "Login successful", 
            token = token 
        });
    }
}