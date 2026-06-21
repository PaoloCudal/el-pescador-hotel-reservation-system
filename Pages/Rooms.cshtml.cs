using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using HotelReservationWeb.Data.Client_Data; // your DbContext
using HotelReservationWeb.Models.Model_Staff;
using System.Globalization;

namespace HotelReservationWeb.Pages.Rooms
{
    public class RoomsModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public RoomsModel(ApplicationDbContext context)
        {
            _context = context;
        }

    }
}
