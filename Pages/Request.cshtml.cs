using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace HotelReservationWeb.Pages
{
    public class RequestModel : PageModel
    {
        
            public string ReferenceCode { get; set; }
            public decimal Total { get; set; }

            public string ItemType { get; set; }
            public string ItemTypeDisplay => ItemType == "room" ? "Room Reservation" : "Venue Reservation";

            public DateTime CheckInDate { get; set; }
            public DateTime CheckOutDate { get; set; }
            public int Nights => (CheckOutDate - CheckInDate).Days;

            public void OnGet(string reference, decimal total, string itemType, DateTime checkin, DateTime checkout)
            {
                ReferenceCode = reference;
                Total = total;
                ItemType = itemType;

                CheckInDate = checkin;
                CheckOutDate = checkout;
            }
    }
}
