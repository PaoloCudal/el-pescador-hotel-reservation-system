using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.ComponentModel.DataAnnotations;
using HotelReservationWeb.Data.Client_Data;
using HotelReservationWeb.Models.Models_Client;
using System.Threading.Tasks;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;

namespace HotelReservationWeb.Pages.Accounts.User
{
    public class UserRegistrationModel : PageModel
    {
        
    }
}
