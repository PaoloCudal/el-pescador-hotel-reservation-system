using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HotelReservationWeb.Services;
using HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin;

namespace HotelReservationWeb.Controllers
{
    [AllowAnonymous] 
    [ApiController]
    [Route("api/customer")]
    public class CustomerController : ControllerBase
    {
        private readonly IFacilityService _facilityService;
        private readonly IBookingService _bookingService;

        public CustomerController(IFacilityService facilityService, IBookingService bookingService)
        {
            _facilityService = facilityService;
            _bookingService = bookingService;
        }

        // FACILITY DISPLAY (HOME & LISTS)
        
        [HttpGet("home-index")]
        public async Task<IActionResult> GetHomeIndexFacilities()
        {
            var facilities = await _facilityService.GetHomeIndexAsync();
            return Ok(facilities);
        }

        [HttpGet("venues")]
        public async Task<IActionResult> GetVenues()
        {
            try
            {
                var venues = await _facilityService.GetVenueCardsAsync();
                return Ok(venues);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching venues", details = ex.Message });
            }
        }

        [HttpGet("amenities")]
        public async Task<IActionResult> GetAmenityCards()
        {
            try
            {
                var amenities = await _facilityService.GetAmenityCardsAsync();
                return Ok(amenities);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching amenities", details = ex.Message });
            }
        }

        [HttpGet("resort-highlights")]
        public async Task<IActionResult> GetResortHighlights()
        {
            try
            {
                var highlights = await _facilityService.GetResortHighlightsAsync();
                return Ok(highlights);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching resort highlights", details = ex.Message });
            }
        }

        [HttpGet("facility/{id}")]
        public async Task<IActionResult> GetFacilityById(int id)
        {
            var facility = await _facilityService.GetByIdAsync(id);
            if (facility == null) return NotFound();
            return Ok(facility);
        }

        [HttpGet("rooms")]
        public async Task<IActionResult> GetRoomsByBuilding()
        {
            try
            {
                var rooms = await _facilityService.GetRoomsByBuildingAsync();
                return Ok(rooms);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching rooms", details = ex.Message });
            }
        }

        // AVAILABILITY CALENDAR & CHECKS
        
        [HttpGet("availability/month")]
        public async Task<IActionResult> GetAvailabilityMonth([FromQuery] int facilityId, [FromQuery] int year, [FromQuery] int month, [FromQuery] int? roomTypeId = null, [FromQuery] int? venueId = null)
        {
            try
            {
                var monthAvailability = await _facilityService.GetAvailabilityMonthAsync(facilityId, year, month, roomTypeId, venueId);
                
                
                if (monthAvailability.Days == null || !monthAvailability.Days.Any())
                {
                    var daysInMonth = DateTime.DaysInMonth(year, month);
                    monthAvailability.Days = new List<FacilityAvailabilityDTO>();
                    for (int d = 1; d <= daysInMonth; d++)
                    {
                        monthAvailability.Days.Add(new FacilityAvailabilityDTO 
                        { 
                            FacilityId = facilityId, 
                            RoomTypeId = roomTypeId, 
                            VenueId = venueId, 
                            Date = new DateTime(year, month, d), 
                            IsBlocked = false 
                        });
                    }
                }
                return Ok(monthAvailability);
            }
            catch (Exception ex) 
            { 
                return BadRequest(new { message = ex.Message }); 
            }
        }

        [HttpGet("availability/check")]
        public async Task<IActionResult> CheckAvailability(
            [FromQuery] int roomTypeId,
            [FromQuery] DateTime checkIn,
            [FromQuery] DateTime checkOut)
        {
            var isAvailable = await _bookingService.IsRoomAvailableAsync(roomTypeId, checkIn, checkOut);
            return Ok(new { available = isAvailable });
        }

        [HttpGet("availability/check-venue")]
        public async Task<IActionResult> CheckVenueAvailability(
            [FromQuery] int facilityId,
            [FromQuery] int venueId,
            [FromQuery] DateTime checkIn,
            [FromQuery] DateTime checkOut)
        {
            var isAvailable = await _bookingService.IsVenueAvailableAsync(facilityId, venueId, checkIn, checkOut);
            return Ok(new { available = isAvailable });
        }
    }
}