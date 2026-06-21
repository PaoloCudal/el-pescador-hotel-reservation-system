using HotelReservationWeb.Models.Model_Staff;
using HotelReservationWeb.Models.Models_Client;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("tblBooking")]
[Index(nameof(BookingReference), IsUnique = true)]
public class Booking
{
    [Key]
    public int BookingId { get; set; }

    public int? RoomTypeId { get; set; }
    public int? VenueId { get; set; }

    public int ClientId { get; set; }

    [ForeignKey(nameof(ClientId))]
    public HotelClient Client { get; set; } = null!;

    [ForeignKey(nameof(RoomTypeId))]
    public RoomType? Room { get; set; }

    [ForeignKey(nameof(VenueId))]
    public Venue? Venue { get; set; }

    [Required]
    public DateTime CheckIn { get; set; }

    [Required]
    public DateTime CheckOut { get; set; }

    [Required, MaxLength(20)]
    public string Status { get; set; } = "Pending";

    [Required, MaxLength(50)]
    public string BookingReference { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? SpecialRequest { get; set; }

    [Required, MaxLength(20)]
    public string PaymentType { get; set; } = "Cash";

    [NotMapped]
    public bool IsValidBooking =>
        (RoomTypeId.HasValue && !VenueId.HasValue) ||
        (!RoomTypeId.HasValue && VenueId.HasValue);
}
