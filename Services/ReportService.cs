using HotelReservationWeb.Data.Client_Data;
using HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin;
using HotelReservationWeb.Services;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

public class ReportService : IReportService
{
    private readonly ApplicationDbContext _context;

    public ReportService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<byte[]> GenerateFinancialReportPdf(DateTime from, DateTime to)
    {
        var bookings = await GetApprovedBookings(from, to);
        return GenerateFinancialPdf("FINANCIAL REPORT", from, to, bookings);
    }

    public async Task<byte[]> GenerateBookingReportPdf(DateTime from, DateTime to)
    {
        var bookings = await _context.tblBooking
            .Include(b => b.Room).ThenInclude(r => r!.Facility)
            .Include(b => b.Venue).ThenInclude(v => v!.Facility)
            .Where(b => b.CheckIn.Date >= from.Date
                && b.CheckIn.Date <= to.Date)
            .ToListAsync();

        var result = bookings.Select(b => new FinancialReportDTO
        {
            BookingReference = b.BookingReference,
            FacilityName = b.Room != null
                ? b.Room.Facility.Name + (b.Room.Facility.IsDeleted ? " (Deleted)" : "")
                : (b.Venue?.Facility.Name ?? "Unknown") + (b.Venue?.Facility.IsDeleted == true ? " (Deleted)" : ""),
            CheckIn = b.CheckIn,
            CheckOut = b.CheckOut,
            Status = b.Status,
            TotalCost = 0
        })
        .OrderByDescending(b => b.CheckIn)
        .ToList();

        return GenerateBookingPdf("BOOKING REPORT", from, to, result);
    }

   
 public async Task<byte[]> GenerateOccupancyReportPdf(DateTime from, DateTime to)
{
    var availability = await _context.tblAvailability
        .Include(a => a.RoomType).ThenInclude(r => r!.Facility)
        .Include(a => a.Venue).ThenInclude(v => v!.Facility)
        .Where(a => a.Date.Date >= from.Date
            && a.Date.Date <= to.Date
            && !a.IsDeleted)
        .ToListAsync();

    // Load bookings in range for status lookup
    var bookings = await _context.tblBooking
        .Where(b => b.Status != "Cancelled"
            && b.CheckIn.Date <= to.Date
            && b.CheckOut.Date >= from.Date)
        .Select(b => new { b.RoomTypeId, b.VenueId, b.CheckIn, b.CheckOut, b.Status })
        .ToListAsync();

    int totalDays = (to.Date - from.Date).Days + 1;

    var breakdown = new List<OccupancyRowItem>();

    // ROOMS — grouped by facility + building type (one row per room type)
    var roomGroups = availability
        .Where(a => a.RoomType != null)
        .GroupBy(a => new
        {
            FacilityName = a.RoomType!.Facility.Name,
            BuildingType = a.RoomType.Name
        });

    foreach (var g in roomGroups.OrderBy(g => g.Key.FacilityName))
    {
        int occupied = g.Count(x => x.IsBlocked);
        int avail = totalDays - occupied;

        var roomTypeIds = g.Select(x => x.RoomTypeId).Distinct().ToList();
        int pendingDays = bookings
            .Where(b => b.Status == "Pending" && roomTypeIds.Contains(b.RoomTypeId))
            .Sum(b => Math.Min((b.CheckOut.Date - b.CheckIn.Date).Days + 1, totalDays));
        int approvedDays = bookings
            .Where(b => b.Status == "Approved" && roomTypeIds.Contains(b.RoomTypeId))
            .Sum(b => Math.Min((b.CheckOut.Date - b.CheckIn.Date).Days + 1, totalDays));

        breakdown.Add(new OccupancyRowItem
        {
            FacilityType = "Room",
            FacilityName = g.Key.FacilityName,
            BuildingType = g.Key.BuildingType,
            Occupied = occupied,
            Available = avail < 0 ? 0 : avail,
            PendingDays = pendingDays,
            ApprovedDays = approvedDays
        });
    }

    // VENUES — separate row per booking
    var venueAvailability = availability
        .Where(a => a.Venue != null)
        .ToList();

    var distinctVenues = venueAvailability
        .GroupBy(a => new
        {
            VenueId = a.VenueId,
            FacilityName = a.Venue!.Facility.Name,
            BuildingType = a.Venue.VenueCategory
        })
        .Select(g => new
        {
            g.Key.VenueId,
            g.Key.FacilityName,
            g.Key.BuildingType,
            AvailabilityRecords = g.ToList()
        })
        .OrderBy(v => v.FacilityName)
        .ToList();

    foreach (var venue in distinctVenues)
    {
        var venueBookingRecords = bookings
            .Where(b => b.VenueId == venue.VenueId)
            .ToList();

        if (venueBookingRecords.Any())
        {
            // Separate row per booking
            foreach (var vb in venueBookingRecords)
            {
                int occupied = venue.AvailabilityRecords.Count(x => x.IsBlocked
                    && x.Date.Date >= vb.CheckIn.Date
                    && x.Date.Date <= vb.CheckOut.Date);
                int avail = totalDays - venue.AvailabilityRecords.Count(x => x.IsBlocked);

                breakdown.Add(new OccupancyRowItem
                {
                    FacilityType = "Venue",
                    FacilityName = venue.FacilityName,
                    BuildingType = venue.BuildingType,
                    Occupied = occupied,
                    Available = avail < 0 ? 0 : avail,
                    PendingDays = vb.Status == "Pending"
                        ? Math.Min((vb.CheckOut.Date - vb.CheckIn.Date).Days + 1, totalDays)
                        : 0,
                    ApprovedDays = vb.Status == "Approved"
                        ? Math.Min((vb.CheckOut.Date - vb.CheckIn.Date).Days + 1, totalDays)
                        : 0
                });
            }
        }
        else
        {
            // No bookings but has availability records — show as one row
            int occupied = venue.AvailabilityRecords.Count(x => x.IsBlocked);
            int avail = totalDays - occupied;

            breakdown.Add(new OccupancyRowItem
            {
                FacilityType = "Venue",
                FacilityName = venue.FacilityName,
                BuildingType = venue.BuildingType,
                Occupied = occupied,
                Available = avail < 0 ? 0 : avail,
                PendingDays = 0,
                ApprovedDays = 0
            });
        }
    }

    int totalOccupied = breakdown.Sum(x => x.Occupied);
    int totalAvailable = breakdown.Sum(x => x.Available);
    int grandTotal = totalOccupied + totalAvailable;
    double rate = grandTotal > 0 ? Math.Round((double)totalOccupied / grandTotal * 100, 1) : 0;

    var document = Document.Create(container =>
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(30);

            page.Header().Column(col =>
            {
                col.Item().Row(row =>
                {
                    var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images/icon/icon.png");
                    if (File.Exists(logoPath))
                        row.ConstantItem(80).Image(logoPath);

                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text("ELPESCADOR HOTEL RESERVATION SYSTEM").Bold().FontSize(16);
                        c.Item().Text("OCCUPANCY REPORT").FontSize(13);
                        c.Item().Text($"Period: {from:MMM dd, yyyy} – {to:MMM dd, yyyy}")
                            .FontSize(9).FontColor(Colors.Grey.Medium);
                    });
                });
                col.Item().PaddingTop(10).LineHorizontal(1);
            });

            page.Content().PaddingTop(10).Column(col =>
            {
                // Summary cards
                col.Item().Row(row =>
                {
                    row.RelativeItem().Border(1).Padding(10).Column(c =>
                    {
                        c.Item().Text("TOTAL DAYS IN RANGE").FontSize(9).FontColor(Colors.Grey.Medium);
                        c.Item().Text(totalDays.ToString()).Bold().FontSize(18);
                    });
                    row.ConstantItem(10);
                    row.RelativeItem().Border(1).Padding(10).Column(c =>
                    {
                        c.Item().Text("OCCUPIED").FontSize(9).FontColor(Colors.Grey.Medium);
                        c.Item().Text(totalOccupied.ToString()).Bold().FontSize(18).FontColor(Colors.Red.Medium);
                    });
                    row.ConstantItem(10);
                    row.RelativeItem().Border(1).Padding(10).Column(c =>
                    {
                        c.Item().Text("AVAILABLE").FontSize(9).FontColor(Colors.Grey.Medium);
                        c.Item().Text(totalAvailable.ToString()).Bold().FontSize(18).FontColor(Colors.Green.Medium);
                    });
                    row.ConstantItem(10);
                    row.RelativeItem().Border(1).Padding(10).Column(c =>
                    {
                        c.Item().Text("OCCUPANCY RATE").FontSize(9).FontColor(Colors.Grey.Medium);
                        c.Item().Text($"{rate}%").Bold().FontSize(18);
                    });
                });

                // ROOMS TABLE
                col.Item().PaddingTop(20).Text("Rooms").Bold().FontSize(12);
                col.Item().PaddingTop(5).Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.RelativeColumn(2);
                        cols.RelativeColumn(3);
                        cols.RelativeColumn(3);
                        cols.RelativeColumn(2);
                        cols.RelativeColumn(2);
                    });

                    table.Header(header =>
                    {
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Type").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Facility Name").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Building Type").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Occupied Days").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Available Days").Bold();
                    });

                    var roomRows = breakdown.Where(x => x.FacilityType == "Room").ToList();

                    if (!roomRows.Any())
                    {
                        table.Cell().ColumnSpan(5).AlignCenter().Padding(20).Text("NO ROOM RECORDS FOUND").Bold();
                    }
                    else
                    {
                        int i = 0;
                        foreach (var item in roomRows)
                        {
                            i++;
                            var bg = i % 2 == 0 ? Colors.Grey.Lighten3 : Colors.White;

                            var statusParts = new List<string>();
                            if (item.ApprovedDays > 0) statusParts.Add("Approved");
                            if (item.PendingDays > 0) statusParts.Add("Pending");
                            string statusSuffix = statusParts.Any()
                                ? $" ({string.Join(", ", statusParts)})"
                                : "";

                            table.Cell().Border(1).Background(bg).Padding(5).Text(item.FacilityType);
                            table.Cell().Border(1).Background(bg).Padding(5).Text(item.FacilityName + statusSuffix);
                            table.Cell().Border(1).Background(bg).Padding(5).Text(item.BuildingType);
                            table.Cell().Border(1).Background(bg).Padding(5).Text(item.Occupied.ToString());
                            table.Cell().Border(1).Background(bg).Padding(5).Text(item.Available.ToString());
                        }
                    }
                });

                // VENUES TABLE
                col.Item().PaddingTop(20).Text("Venues").Bold().FontSize(12);
                col.Item().PaddingTop(5).Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.RelativeColumn(2);
                        cols.RelativeColumn(3);
                        cols.RelativeColumn(3);
                        cols.RelativeColumn(2);
                        cols.RelativeColumn(2);
                    });

                    table.Header(header =>
                    {
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Type").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Facility Name").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Venue Category").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Occupied Days").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Available Days").Bold();
                    });

                    var venueRows = breakdown.Where(x => x.FacilityType == "Venue").ToList();

                    if (!venueRows.Any())
                    {
                        table.Cell().ColumnSpan(5).AlignCenter().Padding(20).Text("NO VENUE RECORDS FOUND").Bold();
                    }
                    else
                    {
                        int i = 0;
                        foreach (var item in venueRows)
                        {
                            i++;
                            var bg = i % 2 == 0 ? Colors.Grey.Lighten3 : Colors.White;

                            // Each row is one booking so only one status per row
                            string statusSuffix = item.ApprovedDays > 0 ? " (Approved)"
                                : item.PendingDays > 0 ? " (Pending)"
                                : "";

                            table.Cell().Border(1).Background(bg).Padding(5).Text(item.FacilityType);
                            table.Cell().Border(1).Background(bg).Padding(5).Text(item.FacilityName + statusSuffix);
                            table.Cell().Border(1).Background(bg).Padding(5).Text(item.BuildingType);
                            table.Cell().Border(1).Background(bg).Padding(5).Text(item.Occupied.ToString());
                            table.Cell().Border(1).Background(bg).Padding(5).Text(item.Available.ToString());
                        }
                    }
                });
            });

            page.Footer().AlignCenter().Text(text =>
            {
                text.Span("Generated: ");
                text.Span(DateTime.Now.ToString("MMM dd, yyyy"));
                text.Span("    Page ");
                text.CurrentPageNumber();
            });
        });
    });

    return document.GeneratePdf();
}

  
private async Task<List<FinancialReportDTO>> GetApprovedBookings(DateTime from, DateTime to)
{
    var bookings = await _context.tblBooking
        .Include(b => b.Room).ThenInclude(r => r!.Facility)
        .Include(b => b.Venue).ThenInclude(v => v!.Facility)
        .Where(b => b.Status == "Approved"
            && b.CheckIn.Date >= from.Date
            && b.CheckIn.Date <= to.Date)
        .ToListAsync();

    return bookings.Select(b =>
    {
        int nights = Math.Max(1, (b.CheckOut.Date - b.CheckIn.Date).Days);
        decimal price = b.Room != null
            ? b.Room.BasePrice
            : b.Venue?.Facility.Price ?? 0m;
        decimal total = price * nights;

        return new FinancialReportDTO
        {
            BookingReference = b.BookingReference,
            FacilityName = b.Room != null
                ? b.Room.Facility.Name + (b.Room.Facility.IsDeleted ? " (Deleted)" : "")
                : (b.Venue?.Facility.Name ?? "Unknown") + (b.Venue?.Facility.IsDeleted == true ? " (Deleted)" : ""),
            BuildingType = b.Room != null
                ? b.Room.Name
                : b.Venue?.VenueCategory ?? "",
            FacilityCategory = b.Room != null ? "Room" : "Venue",
            CheckIn = b.CheckIn,
            CheckOut = b.CheckOut,
            Status = b.Status,
            TotalCost = total
        };
    }).OrderByDescending(x => x.CheckIn).ToList();
}

  private byte[] GenerateFinancialPdf(string title, DateTime from, DateTime to, List<FinancialReportDTO> rows)
{
    decimal grandTotal = rows.Sum(x => x.TotalCost);

    var document = Document.Create(container =>
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(30);

            page.Header().Column(col =>
            {
                col.Item().Row(row =>
                {
                    var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images/icon/icon.png");
                    if (File.Exists(logoPath))
                        row.ConstantItem(80).Image(logoPath);

                    row.RelativeItem().Column(c =>
                    {
                        c.Item().Text("ELPESCADOR HOTEL RESERVATION SYSTEM").Bold().FontSize(16);
                        c.Item().Text(title).FontSize(13);
                        c.Item().Text($"Period: {from:MMM dd, yyyy} – {to:MMM dd, yyyy}")
                            .FontSize(9).FontColor(Colors.Grey.Medium);
                    });
                });
                col.Item().PaddingTop(10).LineHorizontal(1);
            });

            page.Content().PaddingTop(10).Column(col =>
            {
                // TOTAL REVENUE card only
                col.Item().Row(row =>
                {
                    row.RelativeItem().Border(1).Padding(10).Column(c =>
                    {
                        c.Item().Text("TOTAL REVENUE").FontSize(9).FontColor(Colors.Grey.Medium);
                        c.Item().Text($"₱{grandTotal:N2}").Bold().FontSize(16);
                    });
                });

                // ROOMS TABLE
                col.Item().PaddingTop(15).Text("Rooms").Bold().FontSize(12);
                col.Item().PaddingTop(5).Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.RelativeColumn(2); // Reference
                        cols.RelativeColumn(3); // Facility
                        cols.RelativeColumn(2); // Building Type
                        cols.RelativeColumn(2); // Check In
                        cols.RelativeColumn(2); // Check Out
                        cols.RelativeColumn(2); // Amount
                    });

                    table.Header(header =>
                    {
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Reference").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Facility").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Building Type").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Check In").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Check Out").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Amount").Bold();
                    });

                    var roomRows = rows.Where(x => x.FacilityCategory == "Room").ToList();

                    if (!roomRows.Any())
                        table.Cell().ColumnSpan(6).AlignCenter().Padding(20).Text("NO ROOM RECORDS FOUND").Bold();

                    int i = 0;
                    foreach (var row in roomRows)
                    {
                        i++;
                        var bg = i % 2 == 0 ? Colors.Grey.Lighten3 : Colors.White;
                        table.Cell().Border(1).Background(bg).Padding(5).Text(row.BookingReference);
                        table.Cell().Border(1).Background(bg).Padding(5).Text(row.FacilityName);
                        table.Cell().Border(1).Background(bg).Padding(5).Text(row.BuildingType ?? "");
                        table.Cell().Border(1).Background(bg).Padding(5).Text(row.CheckIn.ToString("MMM dd yyyy"));
                        table.Cell().Border(1).Background(bg).Padding(5).Text(row.CheckOut.ToString("MMM dd yyyy"));
                        table.Cell().Border(1).Background(bg).Padding(5).Text($"₱{row.TotalCost:N2}");
                    }
                });

                // VENUES TABLE
                col.Item().PaddingTop(20).Text("Venues").Bold().FontSize(12);
                col.Item().PaddingTop(5).Table(table =>
                {
                    table.ColumnsDefinition(cols =>
                    {
                        cols.RelativeColumn(2); // Reference
                        cols.RelativeColumn(3); // Facility
                        cols.RelativeColumn(2); // Check In
                        cols.RelativeColumn(2); // Check Out
                        cols.RelativeColumn(2); // Amount
                    });

                    table.Header(header =>
                    {
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Reference").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Facility").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Check In").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Check Out").Bold();
                        header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Amount").Bold();
                    });

                    var venueRows = rows.Where(x => x.FacilityCategory == "Venue").ToList();

                    if (!venueRows.Any())
                        table.Cell().ColumnSpan(5).AlignCenter().Padding(20).Text("NO VENUE RECORDS FOUND").Bold();

                    int i = 0;
                    foreach (var row in venueRows)
                    {
                        i++;
                        var bg = i % 2 == 0 ? Colors.Grey.Lighten3 : Colors.White;
                        table.Cell().Border(1).Background(bg).Padding(5).Text(row.BookingReference);
                        table.Cell().Border(1).Background(bg).Padding(5).Text(row.FacilityName);
                        table.Cell().Border(1).Background(bg).Padding(5).Text(row.CheckIn.ToString("MMM dd yyyy"));
                        table.Cell().Border(1).Background(bg).Padding(5).Text(row.CheckOut.ToString("MMM dd yyyy"));
                        table.Cell().Border(1).Background(bg).Padding(5).Text($"₱{row.TotalCost:N2}");
                    }
                });
            });

            page.Footer().AlignCenter().Text(text =>
            {
                text.Span("Generated: ");
                text.Span(DateTime.Now.ToString("MMM dd, yyyy"));
                text.Span("    Page ");
                text.CurrentPageNumber();
            });
        });
    });

    return document.GeneratePdf();
}
    private byte[] GenerateBookingPdf(string title, DateTime from, DateTime to, List<FinancialReportDTO> rows)
    {
        int approved = rows.Count(x => x.Status == "Approved");
        int pending = rows.Count(x => x.Status == "Pending");
        int cancelled = rows.Count(x => x.Status == "Cancelled");

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        var logoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/images/icon/icon.png");
                        if (File.Exists(logoPath))
                            row.ConstantItem(80).Image(logoPath);

                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("ELPESCADOR HOTEL RESERVATION SYSTEM").Bold().FontSize(16);
                            c.Item().Text(title).FontSize(13);
                            c.Item().Text($"Period: {from:MMM dd, yyyy} – {to:MMM dd, yyyy}")
                                .FontSize(9).FontColor(Colors.Grey.Medium);
                        });
                    });
                    col.Item().PaddingTop(10).LineHorizontal(1);
                });

                page.Content().PaddingTop(10).Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Border(1).Padding(10).Column(c =>
                        {
                            c.Item().Text("TOTAL BOOKINGS").FontSize(9).FontColor(Colors.Grey.Medium);
                            c.Item().Text(rows.Count.ToString()).Bold().FontSize(18);
                        });
                        row.ConstantItem(10);
                        row.RelativeItem().Border(1).Padding(10).Column(c =>
                        {
                            c.Item().Text("APPROVED").FontSize(9).FontColor(Colors.Grey.Medium);
                            c.Item().Text(approved.ToString()).Bold().FontSize(18).FontColor(Colors.Green.Medium);
                        });
                        row.ConstantItem(10);
                        row.RelativeItem().Border(1).Padding(10).Column(c =>
                        {
                            c.Item().Text("PENDING").FontSize(9).FontColor(Colors.Grey.Medium);
                            c.Item().Text(pending.ToString()).Bold().FontSize(18).FontColor(Colors.Orange.Medium);
                        });
                        row.ConstantItem(10);
                        row.RelativeItem().Border(1).Padding(10).Column(c =>
                        {
                            c.Item().Text("CANCELLED").FontSize(9).FontColor(Colors.Grey.Medium);
                            c.Item().Text(cancelled.ToString()).Bold().FontSize(18).FontColor(Colors.Red.Medium);
                        });
                    });

                    col.Item().PaddingTop(15).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(3);
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(2);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Reference").Bold();
                            header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Facility").Bold();
                            header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Check In").Bold();
                            header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Check Out").Bold();
                            header.Cell().Border(1).Padding(5).Background(Colors.Grey.Lighten2).Text("Status").Bold();
                        });

                        if (!rows.Any())
                            table.Cell().ColumnSpan(5).AlignCenter().Padding(20).Text("NO RECORDS FOUND").Bold();

                        int i = 0;
                        foreach (var row in rows)
                        {
                            i++;
                            var bg = i % 2 == 0 ? Colors.Grey.Lighten3 : Colors.White;
                            table.Cell().Border(1).Background(bg).Padding(5).Text(row.BookingReference);
                            table.Cell().Border(1).Background(bg).Padding(5).Text(row.FacilityName);
                            table.Cell().Border(1).Background(bg).Padding(5).Text(row.CheckIn.ToString("MMM dd yyyy"));
                            table.Cell().Border(1).Background(bg).Padding(5).Text(row.CheckOut.ToString("MMM dd yyyy"));
                            table.Cell().Border(1).Background(bg).Padding(5).Text(row.Status ?? "");
                        }
                    });
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Generated: ");
                    text.Span(DateTime.Now.ToString("MMM dd, yyyy"));
                    text.Span("    Page ");
                    text.CurrentPageNumber();
                });
            });
        });

        return document.GeneratePdf();
    }

    private class OccupancyRowItem
  {
    public string FacilityType { get; set; } = "";
    public string FacilityName { get; set; } = "";
    public string BuildingType { get; set; } = "";
    public int Occupied { get; set; }
    public int Available { get; set; }
    public int PendingDays { get; set; }   
    public int ApprovedDays { get; set; }
  }
}