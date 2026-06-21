using Microsoft.EntityFrameworkCore;
using HotelReservationWeb.Models.Model_Staff;
using HotelReservationWeb.Models.Models_Client;

namespace HotelReservationWeb.Data.Client_Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }
        
        // ADD THIS: Your Staff table
        public DbSet<Staff> tblStaff { get; set; } = default!; 

        public DbSet<HotelClient> tblHotelClient { get; set; } = default!;    
        public DbSet<Facility> tblFacilities { get; set; } = default!;
        public DbSet<FacilityAvailability> tblAvailability { get; set; } = default!;
        public DbSet<Booking> tblBooking { get; set; } = default!;
        public DbSet<FacilityImage> tblFacilityImages { get; set; } = default!;
        public DbSet<Building> tblBuildings { get; set; } = default!;
        public DbSet<RoomType> tblRoomTypes { get; set; } = default!;
        public DbSet<RoomImage> tblRoomImages { get; set; } = default!;
        public DbSet<Venue> tblVenues { get; set; } = default!;
        public DbSet<Favorite> tblFavorites { get; set; } = default!;
        public DbSet<ActivityLog> tblActivityLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Staff>().HasData(new Staff
            {
                Id = 1,
                Email = "admin@hotel.com",
                PasswordHash = "$2a$11$Hen47zE3WX3U70QkLekeMewY1FrZ3BIWCNvwHiyZw14YpvuxlBVmW", 
                IsSuperAdmin = true
            });

            // Ensure the table name matches your naming convention
            modelBuilder.Entity<Staff>().ToTable("tblStaff");

            // --- Your Existing Configurations ---
            modelBuilder.Entity<Venue>().ToTable("tblVenues");

            modelBuilder.Entity<Facility>()
                .HasMany(f => f.RoomTypes)
                .WithOne(rt => rt.Facility)
                .HasForeignKey(rt => rt.FacilityId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Facility>()
                .HasMany(f => f.Availabilities)
                .WithOne(a => a.Facility)
                .HasForeignKey(a => a.FacilityId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RoomType>()
                .HasMany(rt => rt.Availabilities)
                .WithOne(a => a.RoomType)
                .HasForeignKey(a => a.RoomTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Facility>()
                .HasMany(f => f.FacilityImages)
                .WithOne(i => i.Facility)
                .HasForeignKey(i => i.FacilityId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Building>()
                .HasMany(b => b.RoomTypes)
                .WithOne(rt => rt.Building)
                .HasForeignKey(rt => rt.BuildingId);

            modelBuilder.Entity<RoomType>()
                .HasMany(rt => rt.RoomImages)
                .WithOne(ri => ri.RoomType)
                .HasForeignKey(ri => ri.RoomTypeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<FacilityAvailability>()
                .HasIndex(x => new { x.FacilityId, x.RoomTypeId, x.VenueId, x.Date })
                .IsUnique();

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Room)
                .WithMany()
                .HasForeignKey(b => b.RoomTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Venue)
                .WithMany()
                .HasForeignKey(b => b.VenueId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}