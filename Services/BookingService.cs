using HotelReservationWeb.Data.Client_Data;
using HotelReservationWeb.Models.Model_Staff;
using HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin;
using HotelReservationWeb.Pages.Accounts.User.DTOs_Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using HotelReservationWeb.Hubs;

namespace HotelReservationWeb.Services
{
    public class BookingService : IBookingService
    {
        private readonly ApplicationDbContext _context;
        private readonly IFacilityService _facilityService;
        private readonly IEmailService _emailService;
        private readonly IHubContext<HotelHub> _hub;

        public BookingService(ApplicationDbContext context, IFacilityService facilityService, IEmailService emailService, IHubContext<HotelHub> hub)
        {
            _context = context;
            _facilityService = facilityService;
            _emailService = emailService;
            _hub = hub;
        }

        private static int CalculateNights(DateTime checkIn, DateTime checkOut)
        {
            int nights = (checkOut - checkIn).Days;
            return nights < 1 ? 1 : nights;
        }



     public async Task<BookingSummaryDto> CreateBookingAsync(CreateBookingDto dto, int clientId)
{
    int facilityId = 0;

    if (dto.CheckOut <= dto.CheckIn)
        dto.CheckOut = dto.CheckIn.AddDays(1);

    int nights = CalculateNights(dto.CheckIn, dto.CheckOut);

    var dates = Enumerable.Range(0, (dto.CheckOut.Date - dto.CheckIn.Date).Days + 1)
        .Select(i => dto.CheckIn.Date.AddDays(i))
        .ToList();

    decimal totalCost = 0m;
    string priceDetails = "";
    string facilityName = "";

    using var transaction = await _context.Database.BeginTransactionAsync();

    if (dto.RoomTypeId.HasValue)
    {
        var room = await _context.tblRoomTypes
            .Include(r => r.Facility)
            .FirstOrDefaultAsync(r => r.RoomTypeId == dto.RoomTypeId && !r.IsDeleted)
            ?? throw new Exception("Room not found");

        totalCost = room.BasePrice * nights;
        priceDetails = $"₱{room.BasePrice:N0} × {nights} night(s)";
        facilityName = room.Facility.Name;
        facilityId = room.FacilityId;

        var blocked = await _context.tblAvailability.AnyAsync(a =>
            a.FacilityId == facilityId &&
            (a.RoomTypeId == dto.RoomTypeId || a.RoomTypeId == null) &&
            dates.Contains(a.Date) &&
            a.IsBlocked &&
            a.Date >= DateTime.Today
        );

        if (blocked)
            throw new Exception("Selected dates are no longer available.");
    }
    else if (dto.VenueId.HasValue)
    {
        var venue = await _context.tblVenues
            .Include(v => v.Facility)
            .FirstOrDefaultAsync(v => v.VenueId == dto.VenueId && !v.IsDeleted)
            ?? throw new Exception("Venue not found");

        totalCost = (venue.Facility.Price ?? 0m) * nights;
        priceDetails = $"₱{venue.Facility.Price:N0} × {nights} day(s)";
        facilityName = venue.VenueCategory;
        facilityId = venue.FacilityId;

        var blocked = await _context.tblAvailability.AnyAsync(a =>
            a.FacilityId == facilityId &&
            (a.VenueId == dto.VenueId || a.VenueId == null) &&
            dates.Contains(a.Date) &&
            a.IsBlocked &&
            a.Date >= DateTime.Today
        );

        if (blocked)
            throw new Exception("Selected dates are no longer available.");

        // Only block if dates actually overlap with an existing active booking
        var hasActiveBooking = await _context.tblBooking.AnyAsync(b =>
            b.VenueId == dto.VenueId &&
            (b.Status == "Pending" || b.Status == "Approved") &&
            b.CheckIn.Date <= dto.CheckOut.Date &&
            b.CheckOut.Date >= dto.CheckIn.Date
        );

        if (hasActiveBooking)
            throw new Exception("This venue is already booked for the selected dates.");
    }
    else
    {
        throw new Exception("Either RoomTypeId or VenueId must be provided");
    }

    var booking = new Booking
    {
        RoomTypeId = dto.RoomTypeId,
        VenueId = dto.VenueId,
        CheckIn = dto.CheckIn,
        CheckOut = dto.CheckOut,
        Status = "Pending",
        BookingReference = Guid.NewGuid().ToString("N")[..8].ToUpper(),
        ClientId = clientId
    };

    _context.tblBooking.Add(booking);
    await _context.SaveChangesAsync();

    await _facilityService.AddAvailabilityAsync(
        facilityId,
        dates,
        booking.RoomTypeId,
        booking.VenueId
    );

    await transaction.CommitAsync();

    try
    {
        await _hub.Clients.Group("Admins").SendAsync("NewBookingRequest", new
        {
            bookingReference = booking.BookingReference,
            facilityName = facilityName,
            checkIn = booking.CheckIn.ToString("MMM dd, yyyy"),
            checkOut = booking.CheckOut.ToString("MMM dd, yyyy"),
            createdAt = DateTime.UtcNow.ToString("hh:mm tt")
        });

        await _hub.Clients.All.SendAsync("DatesBlocked", new
        {
            roomTypeId = booking.RoomTypeId,
            venueId = booking.VenueId,
            facilityId = facilityId,
            dates = dates.Select(d => d.ToString("yyyy-MM-dd")).ToList()
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"SignalR notification failed: {ex.Message}");
    }

    return new BookingSummaryDto
    {
        BookingReference = booking.BookingReference,
        FacilityName = facilityName,
        CheckIn = booking.CheckIn,
        CheckOut = booking.CheckOut,
        Nights = nights,
        TotalCost = totalCost,
        Status = booking.Status,
        PriceDetails = priceDetails,
    };
}

        public async Task<BookingSummaryDto?> GetBookingSummaryAsync(string bookingReference)
        {
            var booking = await _context.tblBooking
                .FirstOrDefaultAsync(b => b.BookingReference == bookingReference);

            if (booking == null) return null;

            int nights = CalculateNights(booking.CheckIn, booking.CheckOut);

            decimal totalCost = 0m;
            string priceDetails = "";
            string facilityName = "";

            if (booking.RoomTypeId.HasValue)
            {
                var room = await _context.tblRoomTypes
                    .Include(r => r.Facility)
                    .FirstOrDefaultAsync(r => r.RoomTypeId == booking.RoomTypeId && !r.IsDeleted);

                if (room != null)
                {
                    totalCost = room.BasePrice * nights;
                    priceDetails = $"₱{room.BasePrice:N0} × {nights} night(s)";
                    facilityName = room.Facility.Name;
                }
            }
            else if (booking.VenueId.HasValue)
            {
                var venue = await _context.tblVenues
                    .Include(v => v.Facility)
                    .FirstOrDefaultAsync(v => v.VenueId == booking.VenueId && !v.IsDeleted);

                if (venue != null)
                {
                    totalCost = (venue.Facility.Price ?? 0m) * nights;
                    priceDetails = $"₱{venue.Facility.Price:N0} × {nights} day(s)";
                    facilityName = venue.VenueCategory;
                }
            }

            return new BookingSummaryDto
            {
                BookingReference = booking.BookingReference,
                FacilityName = facilityName,
                CheckIn = booking.CheckIn,
                CheckOut = booking.CheckOut,
                Nights = nights,
                TotalCost = totalCost,
                Status = booking.Status,
                PriceDetails = priceDetails,
            };
        }

        public async Task<bool> DeleteActivityLogAsync(int activityLogId)
       {
             var log = await _context.tblActivityLogs
            .FirstOrDefaultAsync(a => a.ActivityLogId == activityLogId);

             if (log == null) return false;

             _context.tblActivityLogs.Remove(log);
             await _context.SaveChangesAsync();
             return true;
        }

        public async Task<List<BookingNotificationDto>> GetPendingBookingNotificationsAsync()
      {
        var bookings = await _context.tblBooking
        .Where(b => b.Status == "Pending")
        .Include(b => b.Room).ThenInclude(r => r!.Facility)
        .Include(b => b.Venue).ThenInclude(v => v!.Facility)
        .OrderByDescending(b => b.BookingId)
        .ToListAsync();

        var result = new List<BookingNotificationDto>();

        foreach (var b in bookings)
        {
        string facilityName = "";

        if (b.RoomTypeId.HasValue && b.Room != null)
            facilityName = b.Room.Facility.Name;
        else if (b.VenueId.HasValue && b.Venue != null)
            facilityName = b.Venue.VenueCategory;

        result.Add(new BookingNotificationDto
        {
            BookingReference = b.BookingReference,
            FacilityName = facilityName,
            CheckIn = b.CheckIn.ToString("MMM dd, yyyy"),
            CheckOut = b.CheckOut.ToString("MMM dd, yyyy"),
            CreatedAt = b.CheckIn.ToString("hh:mm tt")
        });
      }

    return result;
   }

        public async Task<BookingSummaryDto> PreviewBookingAsync(CreateBookingDto dto)
        {
            if (dto.CheckOut <= dto.CheckIn)
                dto.CheckOut = dto.CheckIn.AddDays(1);

            int nights = CalculateNights(dto.CheckIn, dto.CheckOut);

            decimal totalCost = 0m;
            string priceDetails = "";
            string facilityName = "";

            if (dto.RoomTypeId.HasValue)
            {
                var room = await _context.tblRoomTypes
                    .Include(r => r.Facility)
                    .FirstOrDefaultAsync(r => r.RoomTypeId == dto.RoomTypeId && !r.IsDeleted)
                    ?? throw new Exception("Room not found");

                totalCost = room.BasePrice * nights;
                priceDetails = $"₱{room.BasePrice:N0} × {nights} night(s)";
                facilityName = room.Facility.Name;
            }
            else if (dto.VenueId.HasValue)
            {
                var venue = await _context.tblVenues
                    .Include(v => v.Facility)
                    .FirstOrDefaultAsync(v => v.VenueId == dto.VenueId && !v.IsDeleted)
                    ?? throw new Exception("Venue not found");

                totalCost = (venue.Facility.Price ?? 0m) * nights;
                priceDetails = $"₱{venue.Facility.Price:N0} × {nights} day(s)";
                facilityName = venue.VenueCategory;
            }

            return new BookingSummaryDto
            {
                FacilityName = facilityName,
                CheckIn = dto.CheckIn,
                CheckOut = dto.CheckOut,
                Nights = nights,
                TotalCost = totalCost,
                PriceDetails = priceDetails,
                Status = "Preview",
            };
        }

        public async Task<MyAccountDTO?> GetMyAccountAsync(int clientId)
        {
            var client = await _context.tblHotelClient
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.ClientId == clientId);

            if (client == null) return null;

            var favoriteRoomsCount = await _context.tblFavorites
                .Where(f => f.ClientId == clientId && f.RoomTypeId != null && !f.IsDeleted)
                .CountAsync();

            var favoriteVenuesCount = await _context.tblFavorites
                .Where(f => f.ClientId == clientId && f.VenueId != null && !f.IsDeleted)
                .CountAsync();

            return new MyAccountDTO
            {
                FullName = $"{client.FirstName} {client.MiddleName} {client.LastName}",
                Email = client.Email,
                JoinDate = client.JoinDate,
                FavoriteRoomsCount = favoriteRoomsCount,
                FavoriteVenuesCount = favoriteVenuesCount
            };
        }

     public async Task<List<UserBookingDto>> GetActiveBookingsAsync(int clientId)
{
    var now = DateTime.Now;

    var bookings = await _context.tblBooking
        .Where(b => b.ClientId == clientId && b.CheckOut >= now)
        .OrderByDescending(b => b.CheckIn)
        .ToListAsync();

    var result = new List<UserBookingDto>();

    foreach (var b in bookings)
    {
        int nights = CalculateNights(b.CheckIn, b.CheckOut);

        decimal totalCost = 0m;
        decimal price = 0m;
        string facilityName = "";
        string description = "";
        string priceDetails = "";
        int facilityId = 0;
        List<string> images = new();

        if (b.RoomTypeId.HasValue)
        {
            var room = await _context.tblRoomTypes
                .Include(r => r.Facility)
                    .ThenInclude(f => f.FacilityImages)
                .FirstOrDefaultAsync(r => r.RoomTypeId == b.RoomTypeId
                    && !r.IsDeleted
                    && !r.Facility.IsDeleted);  

            if (room == null) continue;  

            facilityId = room.FacilityId;
            facilityName = room.Facility.Name;
            description = room.Facility.Description ?? "";
            price = room.BasePrice;
            totalCost = price * nights;
            priceDetails = $"₱{price:N0} × {nights} night(s)";
            images = room.Facility.FacilityImages
                .Where(img => !img.IsDeleted)
                .Select(img => img.ImagePath)
                .ToList();
        }
        else if (b.VenueId.HasValue)
        {
            var venue = await _context.tblVenues
                .Include(v => v.Facility)
                    .ThenInclude(f => f.FacilityImages)
                .FirstOrDefaultAsync(v => v.VenueId == b.VenueId
                    && !v.IsDeleted
                    && !v.Facility.IsDeleted);  // ← ADD THIS

            if (venue == null) continue;  // ← SKIP soft-deleted facility

            facilityId = venue.FacilityId;
            facilityName = venue.Facility.Name;
            description = venue.Facility.Description ?? "";
            price = venue.Facility.Price ?? 0m;
            totalCost = price * nights;
            priceDetails = $"₱{price:N0} × {nights} day(s)";
            images = venue.Facility.FacilityImages
                .Where(img => !img.IsDeleted)
                .Select(img => img.ImagePath)
                .ToList();
        }

        result.Add(new UserBookingDto
        {
            BookingReference = b.BookingReference,
            FacilityId = facilityId,
            FacilityName = facilityName,
            Description = description,
            Price = price,
            Images = images,
            CheckIn = b.CheckIn,
            CheckOut = b.CheckOut,
            Nights = nights,
            TotalCost = totalCost,
            PriceDetails = priceDetails,
            Status = b.Status,
            SpecialRequest = b.SpecialRequest
        });
    }

    return result;
}

        public async Task<bool> ApproveBookingAsync(int bookingId)
{
         using var transaction = await _context.Database.BeginTransactionAsync();

            try
          {
               var booking = await _context.tblBooking
               .Include(b => b.Client)
               .FirstOrDefaultAsync(b => b.BookingId == bookingId);

               if (booking == null)
               return false;

               booking.Status = "Approved";

               if (booking.RoomTypeId.HasValue)
               {
                var room = await _context.tblRoomTypes
                .FirstOrDefaultAsync(r => r.RoomTypeId == booking.RoomTypeId.Value);

                if (room == null) throw new Exception("Facility not found for room");
               }

                else if (booking.VenueId.HasValue)
               {
                  var venue = await _context.tblVenues
                .FirstOrDefaultAsync(v => v.VenueId == booking.VenueId.Value);

                if (venue == null) throw new Exception("Facility not found for venue");
               }
            else
           {
            throw new Exception("Booking has neither RoomTypeId nor VenueId");
           }

             await _context.SaveChangesAsync();

            var summary = await GetBookingSummaryAsync(booking.BookingReference);

            if (summary != null)
           {
            await _emailService.SendBookingConfirmationEmailAsync(
                booking.Client.Email,
                booking.Client.FirstName,
                summary);
            }

            await transaction.CommitAsync();

            await LogActivityAsync(
            "Booking Approved",
            "Admin",
            $"Booking {booking.BookingReference} approved"
            );

            return true;
        }
            catch (Exception ex)
          {
            await transaction.RollbackAsync();
            Console.WriteLine($"Approval Failed: {ex.Message}");
            throw;
          }
     }

        public async Task<List<BookingManagementDTO>> GetBookingManagementAsync()
        {
            var bookings = await _context.tblBooking
                .Where(b => b.Status != "Cancelled")
                .Include(b => b.Client)
                .Include(b => b.Room).ThenInclude(rt => rt!.Facility)
                .Include(b => b.Venue).ThenInclude(v => v!.Facility)
                .OrderByDescending(b => b.BookingId)
                .ToListAsync();

            var result = new List<BookingManagementDTO>();

            foreach (var b in bookings)
            {
                string facilityName = "";
                string facilityCategory = "";

                if (b.RoomTypeId.HasValue && b.Room != null)
                {
                    facilityName = b.Room.Facility.Name;
                    facilityCategory = b.Room.Facility.Category;

                    bool isOccupied = b.Status == "Approved";

                    result.Add(new BookingManagementDTO
                    {
                        BookingId = b.BookingId,
                        BookingReference = b.BookingReference,
                        FacilityCategory = facilityCategory,
                        FacilityName = facilityName,
                        IsOccupied = isOccupied,
                        BookingStatus = b.Status
                    });
                }
                else if (b.VenueId.HasValue && b.Venue != null)
                {
                    facilityName = b.Venue.Facility.Name;
                    facilityCategory = b.Venue.Facility.Category;

                    bool isOccupied = b.Status == "Approved";

                    result.Add(new BookingManagementDTO
                    {
                        BookingId = b.BookingId,
                        BookingReference = b.BookingReference,
                        FacilityCategory = facilityCategory,
                        FacilityName = facilityName,
                        IsOccupied = isOccupied,
                        BookingStatus = b.Status
                    });
                }
            }

            return result;
        }

        public async Task<List<ClientFavoriteFacilityDTO>> GetClientFavoriteFacilitiesAsync(int clientId)
        {
            var data = await _context.tblFavorites
                .Where(f => f.ClientId == clientId && !f.IsDeleted)
                .Include(f => f.RoomType)
                .ThenInclude(r => r!.Facility)
                .ThenInclude(fac => fac.FacilityImages)
                .Include(f => f.Venue)
                .ThenInclude(v => v!.Facility)
                .ThenInclude(fac => fac.FacilityImages)
                .OrderByDescending(f => f.FavoriteId)
                .AsNoTracking()
                .ToListAsync();

            return data.Select(f => new ClientFavoriteFacilityDTO
            {
                FavoriteId = f.FavoriteId,
                FacilityId = f.RoomTypeId != null
                    ? f.RoomType!.FacilityId
                    : f.Venue!.FacilityId,
                FacilityName = f.RoomTypeId != null
                    ? f.RoomType!.Facility.Name
                    : f.Venue!.Facility.Name,
                FacilityType = f.RoomTypeId != null ? "Room" : "Venue",
                Price = f.RoomTypeId != null
                    ? f.RoomType!.BasePrice
                    : f.Venue!.Facility.Price ?? 0m,
                Description = f.RoomTypeId != null
                    ? f.RoomType!.Facility.Description ?? ""
                    : f.Venue!.Facility.Description ?? "",
                Images = f.RoomTypeId != null
                    ? f.RoomType!.Facility.FacilityImages
                        .Where(img => !img.IsDeleted)
                        .Select(img => img.ImagePath)
                        .ToList()
                    : f.Venue!.Facility.FacilityImages
                        .Where(img => !img.IsDeleted)
                        .Select(img => img.ImagePath)
                        .ToList()
            }).ToList();
        }

        public async Task<List<UserManagementDTO>> GetUsersForManagementAsync()
{
    var clients = await _context.tblHotelClient
        .OrderByDescending(c => c.JoinDate)
        .ToListAsync();

    var result = new List<UserManagementDTO>();

    foreach (var c in clients)
    {
        var totalBookings = await _context.tblBooking
            .CountAsync(b => b.ClientId == c.ClientId);

        result.Add(new UserManagementDTO
        {
            ClientId = c.ClientId,
            FullName = $"{c.FirstName} {c.MiddleName} {c.LastName}",
            Email = c.Email,
            JoinDate = c.JoinDate,
            TotalBookings = totalBookings
        });
    }

    return result;
}

   public async Task<bool> CancelBookingAsync(int bookingId)
{
    var booking = await _context.tblBooking
        .Include(b => b.Client)
        .FirstOrDefaultAsync(b => b.BookingId == bookingId);

    if (booking == null) return false;

    booking.Status = "Cancelled";

    int facilityId;
    List<DateTime> dates;
    string facilityName = "";

    if (booking.RoomTypeId.HasValue)
    {
        var room = await _context.tblRoomTypes
            .Include(r => r.Facility)
            .FirstOrDefaultAsync(r => r.RoomTypeId == booking.RoomTypeId.Value);

        facilityId = room?.FacilityId ?? throw new Exception("Facility not found for room");
        facilityName = room?.Facility.Name ?? "";

        dates = Enumerable.Range(0, (booking.CheckOut.Date - booking.CheckIn.Date).Days + 1)
            .Select(offset => booking.CheckIn.Date.AddDays(offset))
            .ToList();

        await _facilityService.UnblockAvailabilityAsync(facilityId, dates, booking.RoomTypeId, null);
    }
    else if (booking.VenueId.HasValue)
    {
        var venue = await _context.tblVenues
            .FirstOrDefaultAsync(v => v.VenueId == booking.VenueId.Value);

        facilityId = venue?.FacilityId ?? throw new Exception("Facility not found for venue");
        facilityName = venue?.VenueCategory ?? "";

        dates = Enumerable.Range(0, (booking.CheckOut.Date - booking.CheckIn.Date).Days + 1)
            .Select(offset => booking.CheckIn.Date.AddDays(offset))
            .ToList();

        await _facilityService.UnblockAvailabilityAsync(facilityId, dates, null, booking.VenueId);
    }
    else return false;

    await _context.SaveChangesAsync();

    await LogActivityAsync(
        "Booking Rejected",
        "Admin",
        $"Booking {booking.BookingReference} rejected/cancelled"
    );

    try
    {
        await _emailService.SendBookingCancellationEmailAsync(
            booking.Client.Email,
            booking.Client.FirstName,
            booking.BookingReference,
            facilityName,
            booking.CheckIn,
            booking.CheckOut
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Cancellation email failed: {ex.Message}");
    }

    try
    {
        await _hub.Clients.All.SendAsync("DatesUnblocked", new
        {
            roomTypeId = booking.RoomTypeId,
            venueId = booking.VenueId,
            facilityId = facilityId,
            dates = dates.Select(d => d.ToString("yyyy-MM-dd")).ToList()
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"SignalR notification failed: {ex.Message}");
    }

    return true;
}


public async Task<bool> CancelBookingAsync(string bookingReference)
{
    var booking = await _context.tblBooking
        .Include(b => b.Client)
        .FirstOrDefaultAsync(b => b.BookingReference == bookingReference);

    if (booking == null) return false;

    booking.Status = "Cancelled";

    int facilityId;
    List<DateTime> dates;
    string facilityName = "";

    if (booking.RoomTypeId.HasValue)
    {
        var room = await _context.tblRoomTypes
            .Include(r => r.Facility)
            .FirstOrDefaultAsync(r => r.RoomTypeId == booking.RoomTypeId.Value);

        facilityId = room?.FacilityId ?? throw new Exception("Facility not found for room");
        facilityName = room?.Facility.Name ?? "";

        dates = Enumerable.Range(0, (booking.CheckOut.Date - booking.CheckIn.Date).Days + 1)
            .Select(offset => booking.CheckIn.Date.AddDays(offset))
            .ToList();

        await _facilityService.UnblockAvailabilityAsync(facilityId, dates, booking.RoomTypeId, null);
    }
    else if (booking.VenueId.HasValue)
    {
        var venue = await _context.tblVenues
            .FirstOrDefaultAsync(v => v.VenueId == booking.VenueId.Value);

        facilityId = venue?.FacilityId ?? throw new Exception("Facility not found for venue");
        facilityName = venue?.VenueCategory ?? "";

        dates = Enumerable.Range(0, (booking.CheckOut.Date - booking.CheckIn.Date).Days + 1)
            .Select(offset => booking.CheckIn.Date.AddDays(offset))
            .ToList();

        await _facilityService.UnblockAvailabilityAsync(facilityId, dates, null, booking.VenueId);
    }
    else return false;

    await _context.SaveChangesAsync();

    try
    {
        await _emailService.SendBookingCancellationEmailAsync(
            booking.Client.Email,
            booking.Client.FirstName,
            booking.BookingReference,
            facilityName,
            booking.CheckIn,
            booking.CheckOut
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Cancellation email failed: {ex.Message}");
    }

    try
    {
        await _hub.Clients.All.SendAsync("DatesUnblocked", new
        {
            roomTypeId = booking.RoomTypeId,
            venueId = booking.VenueId,
            facilityId = facilityId,
            dates = dates.Select(d => d.ToString("yyyy-MM-dd")).ToList()
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"SignalR notification failed: {ex.Message}");
    }

    return true;
}

        public async Task LogActivityAsync(string action, string performedBy, string? details = null)
        {
            _context.tblActivityLogs.Add(new ActivityLog
            {
                Action = action,
                PerformedBy = performedBy,
                Details = details,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }

       public async Task<List<ActivityLogDto>> GetRecentActivityLogsAsync(int count = 20)
     {
         return await _context.tblActivityLogs
         .OrderByDescending(a => a.CreatedAt)
         .Take(count)
         .Select(a => new ActivityLogDto
        {
            ActivityLogId = a.ActivityLogId,
            Action = a.Action,
            PerformedBy = a.PerformedBy,
            Details = a.Details,
            CreatedAt = a.CreatedAt.ToString("MMM dd, yyyy hh:mm tt")
        })
        .ToListAsync();
     }

       public async Task<DashboardStatsDto> GetDashboardStatsAsync()
{
    var bookings = await _context.tblBooking
        .Where(b => b.Status != "Cancelled")
        .Include(b => b.Room).ThenInclude(r => r!.Facility)
        .Include(b => b.Venue).ThenInclude(v => v!.Facility)
        .ToListAsync();

    int totalBookings = bookings.Count;
    int pendingCheckins = bookings.Count(b => b.Status == "Pending");

    decimal totalRevenue = 0m;

    foreach (var b in bookings.Where(b => b.Status == "Approved"))
    {
        int nights = CalculateNights(b.CheckIn, b.CheckOut);

        Console.WriteLine($"Booking {b.BookingReference} | Room: {b.Room?.BasePrice} | Venue: {b.Venue?.Facility?.Price} | Nights: {nights}");

        if (b.RoomTypeId.HasValue && b.Room?.Facility != null)
            totalRevenue += b.Room.BasePrice * nights;
        else if (b.VenueId.HasValue && b.Venue?.Facility != null)
            totalRevenue += (b.Venue.Facility.Price ?? 0m) * nights;
    }

    return new DashboardStatsDto
    {
        TotalBookings = totalBookings,
        PendingCheckins = pendingCheckins,
        TotalRevenue = totalRevenue
    };
}
    
   public async Task<bool> IsRoomAvailableAsync(int roomTypeId, DateTime checkIn, DateTime checkOut)
{
    if (checkOut <= checkIn)
        checkOut = checkIn.AddDays(1);

    // ✅ +1 to include checkout date
    var dates = Enumerable.Range(0, (checkOut.Date - checkIn.Date).Days + 1)
        .Select(i => checkIn.Date.AddDays(i))
        .ToList();

    var room = await _context.tblRoomTypes
        .AsNoTracking()
        .FirstOrDefaultAsync(r => r.RoomTypeId == roomTypeId && !r.IsDeleted);

    if (room == null)
        return false;

    // ✅ Also catch admin manual blocks (null RoomTypeId)
    bool isBlocked = await _context.tblAvailability.AnyAsync(a =>
        a.FacilityId == room.FacilityId &&
        (a.RoomTypeId == roomTypeId || a.RoomTypeId == null) &&
        dates.Contains(a.Date) &&
        a.IsBlocked &&
        a.Date >= DateTime.Today
    );

    return !isBlocked;
}

    public async Task<bool> IsVenueAvailableAsync(int facilityId, int venueId, DateTime checkIn, DateTime checkOut)
{
    if (checkOut <= checkIn)
        checkOut = checkIn.AddDays(1);

    // ✅ +1 to include checkout date
    var dates = Enumerable.Range(0, (checkOut.Date - checkIn.Date).Days + 1)
        .Select(i => checkIn.Date.AddDays(i))
        .ToList();

    // ✅ Also catch admin manual blocks (null VenueId)
    bool isBlocked = await _context.tblAvailability.AnyAsync(a =>
        a.FacilityId == facilityId &&
        (a.VenueId == venueId || a.VenueId == null) &&
        dates.Contains(a.Date) &&
        a.IsBlocked &&
        a.Date >= DateTime.Today
    );

    return !isBlocked;
     }
  }
}