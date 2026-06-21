using HotelReservationWeb.Models.Models_Client;
using HotelReservationWeb.Pages.Accounts.User.DTOs_Client;
using HotelReservationWeb.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HotelReservationWeb.Controllers.FavoriteController
{
    [ApiController]
    [Route("api/favorites")]

    // ✅ Force browser cookie authentication
    [Authorize(
        AuthenticationSchemes =
            CookieAuthenticationDefaults.AuthenticationScheme
    )]

    public class FavoriteController : ControllerBase
    {
        private readonly IFavorites _favorites;

        public FavoriteController(IFavorites favorites)
        {
            _favorites = favorites;
        }

        // =====================================================
        // CLIENT ID
        // =====================================================

        private int? ClientId
        {
            get
            {
                var claim =
                    User.FindFirst(ClaimTypes.NameIdentifier);

                if (claim == null)
                    return null;

                return int.Parse(claim.Value);
            }
        }

        // =====================================================
        // TOGGLE FAVORITE
        // =====================================================

        [HttpPost("toggle")]
        public async Task<IActionResult> Toggle(
            [FromBody] FavoritePanelDTO dto
        )
        {
            if (ClientId == null)
                return Unauthorized();

            var added =
                await _favorites.ToggleFavoriteAsync(
                    ClientId.Value,
                    dto.RoomTypeId,
                    dto.VenueId
                );

            return Ok(new { added });
        }

        // =====================================================
        // ROOM FAVORITES
        // =====================================================

        [HttpGet("rooms")]
        public async Task<IActionResult> RoomFavorites()
        {
            if (ClientId == null)
                return Unauthorized();

            var favorites =
                await _favorites.GetFavoritesByClientAsync(
                    ClientId.Value,
                    "Room"
                );

            return Ok(favorites);
        }

        // =====================================================
        // VENUE FAVORITES
        // =====================================================

        [HttpGet("venues")]
        public async Task<IActionResult> VenueFavorites()
        {
            if (ClientId == null)
                return Unauthorized();

            var favorites =
                await _favorites.GetFavoritesByClientAsync(
                    ClientId.Value,
                    "Venue"
                );

            return Ok(favorites);
        }

        // =====================================================
        // ACCOUNT FAVORITE COUNTS
        // =====================================================

        [HttpGet("account")]
        public async Task<IActionResult> Account()
        {
            if (ClientId == null)
                return Unauthorized();

            var email =
                User.FindFirst(ClaimTypes.Email)?.Value
                ?? "";

            var name =
                User.Identity?.Name
                ?? "";

            var result =
                await _favorites.GetFavoriteCountsAsync(
                    ClientId.Value,
                    name,
                    email,
                    DateTime.Now
                );

            return Ok(result);
        }

        // =====================================================
        // CLEAR ROOM FAVORITES
        // =====================================================

        [HttpPost("clear/rooms")]
        public async Task<IActionResult> ClearRoomFavorites()
        {
            if (ClientId == null)
                return Unauthorized();

            await _favorites.ClearRoomFavoritesAsync(
                ClientId.Value
            );

            return Ok(new
            {
                cleared = "rooms"
            });
        }

        

        [HttpPost("clear/venues")]
        public async Task<IActionResult> ClearVenueFavorites()
        {
            if (ClientId == null)
                return Unauthorized();

            await _favorites.ClearVenueFavoritesAsync(
                ClientId.Value
            );

            return Ok(new
            {
                cleared = "venues"
            });
        }
    }
}