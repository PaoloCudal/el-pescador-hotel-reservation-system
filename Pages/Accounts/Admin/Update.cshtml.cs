using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using HotelReservationWeb.Data.Client_Data; // HotelDbContext
using HotelReservationWeb.Models.Model_Staff; // Facility & RoomType & FacilityImage
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using System.Linq;
using System.Threading.Tasks;

namespace HotelReservationWeb.Pages.Accounts.Admin
{
    
    public class UpdateModel : PageModel
    {
        
    }
}
