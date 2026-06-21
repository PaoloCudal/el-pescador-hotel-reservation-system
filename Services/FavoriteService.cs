using HotelReservationWeb.Data.Client_Data;
using HotelReservationWeb.Models.Models_Client;
using Microsoft.EntityFrameworkCore;
using HotelReservationWeb.Pages.Accounts.User.DTOs_Client;

namespace HotelReservationWeb.Services
{
    public class FavoriteService : IFavorites
    {
        private readonly ApplicationDbContext _context;

        public FavoriteService(ApplicationDbContext context)
        {
            _context = context;
        }

        // Add or Remove Favorite (toggle)
        public async Task<bool> ToggleFavoriteAsync(int clientId, int? roomTypeId = null, int? venueId = null)
        {
            if (roomTypeId == null && venueId == null)
                throw new ArgumentException("Either roomTypeId or venueId must be provided.");

            var existing = await _context.tblFavorites
                .FirstOrDefaultAsync(f => f.ClientId == clientId
                    && f.RoomTypeId == roomTypeId
                    && f.VenueId == venueId);

            if (existing != null)
            {
                // Soft delete toggle
                existing.IsDeleted = !existing.IsDeleted;
                await _context.SaveChangesAsync();
                return !existing.IsDeleted; // true if now added, false if now removed
            }

            // Add new favorite
            var favorite = new Favorite
            {
                ClientId = clientId,
                RoomTypeId = roomTypeId,
                VenueId = venueId,
                AddedAt = DateTime.Now,
                IsDeleted = false
            };

            _context.tblFavorites.Add(favorite);
            await _context.SaveChangesAsync();
            return true; // added
        }


        // FavoriteService.cs
        public async Task<List<FavoritePanelDTO>> GetFavoritesByClientAsync(int clientId, string type = "All")
{
    var query = _context.tblFavorites
        .Where(f => f.ClientId == clientId && !f.IsDeleted)
        .AsQueryable();

    if (type == "Room")
        query = query.Where(f => f.RoomTypeId != null);
    else if (type == "Venue")
        query = query.Where(f => f.VenueId != null);

    var results = await query
        .Include(f => f.RoomType)
            .ThenInclude(rt => rt.Facility)
                .ThenInclude(fac => fac.FacilityImages)
        .Include(f => f.Venue)
            .ThenInclude(v => v.Facility)
                .ThenInclude(fac => fac.FacilityImages)
        .Select(f => new FavoritePanelDTO
        {
            FavoriteId   = f.FavoriteId,
            RoomTypeId   = f.RoomTypeId,
            RoomTypeName = f.RoomType != null ? f.RoomType.Facility.Name : null,
            VenueId      = f.VenueId,
            VenueName    = f.Venue != null ? f.Venue.VenueCategory : null,
            ImagePath    = f.RoomType != null
                ? f.RoomType.Facility.FacilityImages
                    .Where(i => !i.IsDeleted)
                    .Select(i => i.ImagePath)
                    .FirstOrDefault()
                : f.Venue != null
                    ? f.Venue.Facility.FacilityImages
                        .Where(i => !i.IsDeleted)
                        .Select(i => i.ImagePath)
                        .FirstOrDefault()
                    : null
        })
        .ToListAsync();

    foreach (var item in results)
        item.ImagePath = NormalizeImagePath(item.ImagePath);

    return results;
}

        // ✅ CLEAR ROOM FAVORITES
        public async Task ClearRoomFavoritesAsync(int clientId)
        {
            var roomFavorites = await _context.tblFavorites
                .Where(f => f.ClientId == clientId && f.RoomTypeId != null && !f.IsDeleted)
                .ToListAsync();

            if (roomFavorites.Any())
            {
                roomFavorites.ForEach(f => f.IsDeleted = true);
                await _context.SaveChangesAsync();
            }
        }

        private static string NormalizeImagePath(string? path)
     {
            if (string.IsNullOrWhiteSpace(path)) return string.Empty;
            path = path.Replace("\\", "/");
            if (path.StartsWith("http://") || path.StartsWith("https://")) return path;
            if (path.StartsWith("/uploads/")) return path;
            return string.Empty;
     }

        public async Task ClearVenueFavoritesAsync(int clientId)
        {
            var venueFavorites = await _context.tblFavorites
                .Where(f => f.ClientId == clientId && f.VenueId != null && !f.IsDeleted)
                .ToListAsync();

            if (venueFavorites.Any())
            {
                venueFavorites.ForEach(f => f.IsDeleted = true);
                await _context.SaveChangesAsync();
            }
        }

        // Get counts for MyAccount modal
        public async Task<MyAccountDTO> GetFavoriteCountsAsync(int clientId, string fullName, string email, DateTime joinDate)
        {
          // Filter by !f.IsDeleted so un-toggled items are NOT counted
          var favRoomsCount = await _context.tblFavorites
          .CountAsync(f => f.ClientId == clientId && f.RoomTypeId != null && !f.IsDeleted);

          var favVenuesCount = await _context.tblFavorites
          .CountAsync(f => f.ClientId == clientId && f.VenueId != null && !f.IsDeleted);

          return new MyAccountDTO
          {
             FullName = fullName,
             Email = email,
             JoinDate = joinDate,
             FavoriteRoomsCount = favRoomsCount,
             FavoriteVenuesCount = favVenuesCount
          };
        }
    }
}
