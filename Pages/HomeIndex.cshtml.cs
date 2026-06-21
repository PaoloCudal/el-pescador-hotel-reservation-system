using HotelReservationWeb.Data;
using HotelReservationWeb.Data.Client_Data;
using HotelReservationWeb.Models.Model_Staff;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HotelReservationWeb.Pages
{
    public class HomeIndexModel : PageModel
    {
        private readonly ApplicationDbContext _context;

        public HomeIndexModel(ApplicationDbContext context)
        {
            _context = context;
        }

        // List of facilities to pass to the partial vie

        // GET handler
        public async Task OnGetAsync()
        {
            
        }
    }
}
