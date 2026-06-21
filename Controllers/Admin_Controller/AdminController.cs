using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using HotelReservationWeb.Services;
using HotelReservationWeb.Hubs;
using Microsoft.AspNetCore.Authorization;

namespace HotelReservationWeb.Controllers.Admin_Controller
{
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly IFacilityService _facilityService;
        private readonly IWebHostEnvironment _env;
        private readonly IHubContext<HotelHub> _hub;
        private readonly IBookingService _bookingService;

        public AdminController(
            IFacilityService facilityService,
            IBookingService bookingService,
            IHubContext<HotelHub> hub,
            IWebHostEnvironment env)
        {
            _facilityService = facilityService;
            _bookingService = bookingService;
            _hub = hub;
            _env = env;
        }

        [HttpGet("facilities")]
        public async Task<IActionResult> GetFacilities()
        {
            var facilities = await _facilityService.GetAllAsync();
            return Ok(facilities);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var facility = await _facilityService.GetByIdAsync(id);
            if (facility == null) return NotFound();
            return Ok(facility);
        }

        [HttpPost("facility")]
        [RequestSizeLimit(50_000_000)]
        public async Task<IActionResult> AddFacility([FromForm] FacilityDTO dto, [FromForm] List<IFormFile>? ImageFiles)
        {
            try
            {
                var imagePaths = await SaveImagesAsync(ImageFiles);
                var facility = await _facilityService.AddAsync(dto, imagePaths);
                await _bookingService.LogActivityAsync("Facility Added", "Admin", $"'{facility.Name}' added");
                await _hub.Clients.All.SendAsync("FacilityAdded", facility);
                return Ok(facility);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("facility/{id}")]
        [RequestSizeLimit(50_000_000)]
        public async Task<IActionResult> UpdateFacility(int id, [FromForm] FacilityDTO dto, [FromForm] List<IFormFile>? NewImages, [FromForm] List<int>? RemovedImageIds)
        {
            try
            {
                var imagePaths = await SaveImagesAsync(NewImages);
                var updatedFacility = await _facilityService.UpdateAsync(id, dto, imagePaths, RemovedImageIds);
                await _bookingService.LogActivityAsync("Facility Updated", "Admin", $"'{updatedFacility.Name}' updated");
                await _hub.Clients.All.SendAsync("FacilityUpdated", updatedFacility);
                return Ok(updatedFacility);
            }
            catch (KeyNotFoundException) { return NotFound(new { message = "Facility not found" }); }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("facility/{id}/delete")]
        public async Task<IActionResult> DeleteFacility(int id)
        {
            try
            {
                await _facilityService.SoftDeleteAsync(id);
                await _bookingService.LogActivityAsync("Facility Deleted", "Admin", $"Facility ID {id} deleted");
                await _hub.Clients.All.SendAsync("FacilityDeleted", id);
                return Ok(new { success = true });
            }
            catch (KeyNotFoundException) { return NotFound(new { message = "Facility not found" }); }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("facility/{id}/undo")]
        public async Task<IActionResult> UndoDeleteFacility(int id)
        {
            try
            {
                var restored = await _facilityService.UndoDeleteAsync(id);
                await _bookingService.LogActivityAsync("Facility Restored", "Admin", $"'{restored.Name}' restored");
                await _hub.Clients.All.SendAsync("FacilityUpdated", restored);
                return Ok(restored);
            }
            catch (KeyNotFoundException) { return NotFound(new { message = "Facility not found" }); }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("facilities/deleted")]
        public async Task<IActionResult> GetDeletedFacilities()
        {
            var deletedFacilities = await _facilityService.GetDeletedAsync();
            return Ok(deletedFacilities);
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
                        monthAvailability.Days.Add(new FacilityAvailabilityDTO { FacilityId = facilityId, RoomTypeId = roomTypeId, VenueId = venueId, Date = new DateTime(year, month, d), IsBlocked = false });
                    }
                }
                return Ok(monthAvailability);
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

         [HttpPost("availability")]
    public async Task<IActionResult> AddOrUpdateAvailability([FromBody] AddAvailabilityRangeDTO dto)
{
    if (dto.Dates == null || !dto.Dates.Any()) 
        return BadRequest(new { message = "No dates selected" });
    try
    {
        var (addedCount, skippedCount) = await _facilityService.AddAvailabilityAsync(
            dto.FacilityId, 
            dto.Dates,
            dto.RoomTypeId,
            dto.VenueId
        );
        await _hub.Clients.All.SendAsync("AvailabilityRangeUpdated", dto);
        return Ok(new { success = true, added = addedCount, skipped = skippedCount });
    }
    catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
}

        [HttpPut("availability/{id}")]
        public async Task<IActionResult> UpdateAvailability(int id, [FromBody] FacilityAvailabilityDTO dto)
        {
            try
            {
                var updatedAvailability = await _facilityService.UpdateAvailabilityAsync(id, dto);
                await _hub.Clients.All.SendAsync("AvailabilityUpdated", updatedAvailability);
                return Ok(updatedAvailability);
            }
            catch (KeyNotFoundException) { return NotFound(new { message = "Availability not found" }); }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("availability/unblock")]
        public async Task<IActionResult> UnblockDates([FromBody] AddAvailabilityRangeDTO dto)
        {
            if (dto.Dates == null || dto.Dates.Count == 0) return BadRequest("No dates provided.");
            var unblockedCount = await _facilityService.UnblockAvailabilityAsync(dto.FacilityId, dto.Dates, dto.RoomTypeId, dto.VenueId);
            return Ok(new { unblocked = unblockedCount });
        }

        [HttpGet("bookings")]
        public async Task<IActionResult> GetBookingManagement()
        {
            var bookings = await _bookingService.GetBookingManagementAsync();
            return Ok(bookings);
        }

        [HttpPost("booking/{bookingId}/approve")]
        public async Task<IActionResult> ApproveBooking(int bookingId)
        {
            try
            {
                var success = await _bookingService.ApproveBookingAsync(bookingId);
                if (!success) return BadRequest(new { message = "Booking not found or already approved" });
                await _hub.Clients.All.SendAsync("BookingApproved", bookingId);
                return Ok(new { success = true, message = "Booking approved successfully" });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpPost("booking/{bookingId}/reject")]
        public async Task<IActionResult> RejectBooking(int bookingId)
        {
            try
            {
                var success = await _bookingService.CancelBookingAsync(bookingId);
                if (!success) return BadRequest(new { message = "Booking not found or already canceled" });
                await _hub.Clients.All.SendAsync("BookingRejected", bookingId);
                return Ok(new { success = true, message = "Booking rejected successfully" });
            }
            catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _bookingService.GetUsersForManagementAsync();
            return Ok(users);
        }

        [HttpGet("bookings/notifications")]
        public async Task<IActionResult> GetPendingNotifications()
        {
            var notifications = await _bookingService.GetPendingBookingNotificationsAsync();
            return Ok(notifications);
        }

        [HttpGet("bookings/{clientId}")]
        public async Task<IActionResult> GetUserBookings(int clientId)
        {
            var bookings = await _bookingService.GetActiveBookingsAsync(clientId);
            return Ok(bookings);
        }

        [HttpGet("favorites/{clientId}")]
        public async Task<IActionResult> GetClientFavorites(int clientId)
        {
            try
            {
                var favorites = await _bookingService.GetClientFavoriteFacilitiesAsync(clientId);
                return Ok(favorites);
            }
            catch (Exception ex) { return StatusCode(500, new { message = "Failed to fetch favorites", details = ex.Message }); }
        }

        [HttpDelete("activity-logs/{id}")]
        public async Task<IActionResult> DeleteActivityLog(int id)
        {
           try
           {
             var success = await _bookingService.DeleteActivityLogAsync(id);
             if (!success) return NotFound(new { message = "Log not found" });
             return Ok(new { success = true });
            }
             catch (Exception ex)
           {
             return StatusCode(500, new { message = "Failed to delete log", details = ex.Message });
           }
        }

        [HttpGet("dashboard/stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var stats = await _bookingService.GetDashboardStatsAsync();
            return Ok(stats);
        }

        [HttpGet("activity-logs")]
        public async Task<IActionResult> GetActivityLogs()
        {
            var logs = await _bookingService.GetRecentActivityLogsAsync();
            return Ok(logs);
        }

        private async Task<List<string>> SaveImagesAsync(List<IFormFile>? files)
        {
            var imagePaths = new List<string>();
            if (files == null || files.Count == 0) return imagePaths;

            var uploadRoot = Path.Combine(_env.WebRootPath, "uploads", "facilities");
            Directory.CreateDirectory(uploadRoot);

            foreach (var file in files)
            {
                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
                var fullPath = Path.Combine(uploadRoot, fileName);
                await using var stream = new FileStream(fullPath, FileMode.Create);
                await file.CopyToAsync(stream);
                imagePaths.Add("/uploads/facilities/" + fileName);
            }
            return imagePaths;
        }
    }
}