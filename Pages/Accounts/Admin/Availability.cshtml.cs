using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using HotelReservationWeb.Data.Client_Data;
using HotelReservationWeb.Models.Model_Staff;

namespace HotelReservationWeb.Pages.Rooms
{
    public class AvailabilityModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public AvailabilityModel(ApplicationDbContext context)
        {
            _context = context;
        }

        
        public async Task OnGetAsync()
        {
            
        }
    }
}
