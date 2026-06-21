using Microsoft.AspNetCore.SignalR;

namespace HotelReservationWeb.Hubs
{
    public class HotelHub : Hub
    {
        public async Task JoinAdminGroup()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
        }
    }
}