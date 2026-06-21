
using HotelReservationWeb.Pages.Accounts.User.DTOs_Client;

namespace HotelReservationWeb.Services
{
    public interface IFavorites
    {
        Task<bool> ToggleFavoriteAsync(int clientId, int? roomTypeId = null, int? venueId = null);
        Task<List<FavoritePanelDTO>> GetFavoritesByClientAsync(int clientId, string type = "All");
        Task<MyAccountDTO> GetFavoriteCountsAsync(int clientId, string fullName, string email, DateTime joinDate);

        Task ClearRoomFavoritesAsync(int clientId);
        Task ClearVenueFavoritesAsync(int clientId);
    }
}
