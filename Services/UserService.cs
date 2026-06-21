using HotelReservationWeb.Data.Client_Data;
using HotelReservationWeb.Pages.Accounts.User.DTOs_Client;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
namespace HotelReservationWeb.Services
{
    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _context;

        public UserService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<MyAccountDTO> GetMyAccountAsync(int clientId) {
        // Fetch client info
        var client = await _context.tblHotelClient
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ClientId == clientId);

        if (client == null) return null!;

        // Count favorites
        var favoriteRoomsCount = await _context.tblFavorites
            .CountAsync(f => f.ClientId == clientId && f.RoomTypeId != null);

        var favoriteVenuesCount = await _context.tblFavorites
            .CountAsync(f => f.ClientId == clientId && f.VenueId != null);

        return new MyAccountDTO
        {
            FullName = $"{client.FirstName} {client.MiddleName} {client.LastName}",
            Email = client.Email,
            JoinDate = client.JoinDate,
            FavoriteRoomsCount = favoriteRoomsCount,
            FavoriteVenuesCount = favoriteVenuesCount
        };
    }

}
}
