namespace HotelReservationWeb.Services
{
    public interface IReportService
    {
        Task<byte[]> GenerateFinancialReportPdf(DateTime from, DateTime to);
        Task<byte[]> GenerateBookingReportPdf(DateTime from, DateTime to);
        Task<byte[]> GenerateOccupancyReportPdf(DateTime from, DateTime to);
    }
}