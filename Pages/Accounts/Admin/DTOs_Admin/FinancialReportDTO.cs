namespace HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin
{
    public class FinancialReportDTO
    {
        public string BookingReference { get; set; } = string.Empty;
        public string FacilityName { get; set; } = string.Empty;
        public string? BuildingType { get; set; }
        public string? FacilityCategory { get; set; }
        public DateTime CheckIn { get; set; }
        public DateTime CheckOut { get; set; }
        public decimal TotalCost { get; set; }
        public string PaymentType { get; set; } = string.Empty;
        public string? Status { get; set; }
    }
}