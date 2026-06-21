using HotelReservationWeb.Data.Client_Data;
using HotelReservationWeb.Models.Model_Staff;
using HotelReservationWeb.Pages.Accounts.Admin;
using HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace HotelReservationWeb.Services
{
    public class FacilityService : IFacilityService
    {
        private readonly ApplicationDbContext _context;

        public FacilityService(ApplicationDbContext context)
        {
            _context = context;
        }

        // ADMIN: GET ALL FACILITIES (Full DTO)
        
        public async Task<List<FacilityDTO>> GetAllAsync()
{
       var facilities = await _context.tblFacilities
        .AsNoTracking()
        .Where(f => !f.IsDeleted)
        .Select(f => new FacilityDTO
        {
            FacilityId = f.FacilityId,
            Name = f.Name,
            Description = f.Description,
            Price = f.Price,
            Category = f.Category,
            IsDeleted = f.IsDeleted,
            HomeIndexCategory = f.HomeIndexCategory,
            Images = f.FacilityImages
                .Where(i => !i.IsDeleted)
                .Select(i => new FacilityImageDTO
                {
                    FacilityImageId = i.FacilityImageId,
                    ImagePath = i.ImagePath,
                    IsDeleted = i.IsDeleted
                }).ToList(),
            RoomTypes = f.RoomTypes
                .Where(rt => !rt.IsDeleted)
                .Select(rt => new RoomTypecs
                {
                    RoomTypeId = rt.RoomTypeId,
                    Name = rt.Name,
                    Description = rt.Description,
                    BasePrice = rt.BasePrice,
                    MaxGuests = rt.MaxGuests,
                    Category = rt.Category,
                    FacilityId = rt.FacilityId,
                    BuildingId = rt.BuildingId,
                    RoomImages = rt.RoomImages
                        .Where(img => !img.IsDeleted)
                        .Select(img => new RoomImageDTO
                        {
                            RoomImageId = img.RoomImageId,
                            ImagePath = img.ImagePath,
                            IsDeleted = img.IsDeleted
                        }).ToList()
                }).ToList(),
            Availabilities = f.Availabilities
                .Select(a => new FacilityAvailabilityDTO
                {
                    AvailabilityId = a.AvailabilityId,
                    FacilityId = a.FacilityId,
                    RoomTypeId = a.RoomTypeId,
                    VenueId = a.VenueId,
                    Date = a.Date,
                    IsBlocked = a.IsBlocked
                }).ToList(),
            Venues = f.Venues
                .Where(v => !v.IsDeleted)
                .Select(v => new VenueDTO
                {
                    VenueId = v.VenueId,
                    CapacityMin = v.CapacityMin,
                    CapacityMax = v.CapacityMax,
                    VenueCategory = v.VenueCategory,
                    Feature1 = v.Feature1,
                    Feature2 = v.Feature2,
                    Availabilities = v.Availabilities
                        .Select(av => new FacilityAvailabilityDTO
                        {
                            AvailabilityId = av.AvailabilityId,
                            FacilityId = av.FacilityId,
                            RoomTypeId = av.RoomTypeId,
                            VenueId = av.VenueId,
                            Date = av.Date
                        }).ToList()
                }).ToList()
        })
        .ToListAsync();

    // Normalize image paths client-side after fetch
    foreach (var f in facilities)
    {
        f.Images = f.Images
            .Select(i => { i.ImagePath = NormalizeImagePath(i.ImagePath); return i; })
            .Where(i => !string.IsNullOrEmpty(i.ImagePath))
            .ToList();

        f.RoomTypes = f.RoomTypes.Select(rt =>
        {
            rt.RoomImages = rt.RoomImages
                .Select(img => { img.ImagePath = NormalizeImagePath(img.ImagePath); return img; })
                .Where(img => !string.IsNullOrEmpty(img.ImagePath))
                .ToList();
            return rt;
        }).ToList();
    }

    return facilities;
}

       public async Task<List<FacilityCardDTO>> GetHomeIndexAsync()
{
    
    var facilities = await _context.tblFacilities
        .AsNoTracking()
        .Include(f => f.RoomTypes)
        .Include(f => f.FacilityImages)
        .Where(f =>
            !f.IsDeleted &&
            f.Category == "Room" &&
            f.HomeIndexCategory != null &&
            f.HomeIndexCategory != "None")
        .ToListAsync();

    
    var results = facilities
        .SelectMany(f => f.RoomTypes
            .Where(rt => !rt.IsDeleted)
            .Select(rt => new FacilityCardDTO
            {
                FacilityId = f.FacilityId,
                Name = f.Name,
                RoomTypeId = rt.RoomTypeId,
                Description = f.Description,
                Price = rt.BasePrice,
                Badge = f.HomeIndexCategory,
                BuildingName = rt.Name,

                Images = f.FacilityImages
                    .Where(i => !i.IsDeleted)
                    .Select(i => new FacilityImageDTO
                    {
                        FacilityImageId = i.FacilityImageId,
                        ImagePath = NormalizeImagePath(i.ImagePath)
                    })
                    .Where(i => !string.IsNullOrEmpty(i.ImagePath))
                    .ToList()
            }))
        .ToList();

    return results;
}

        
        // ADMIN: ADD FACILITY
        public async Task<FacilityDTO> AddAsync(FacilityDTO dto, List<string>? imagePaths = null)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Facility name cannot be empty.");

            ValidateByCategory(dto);

            using var transaction = await _context.Database.BeginTransactionAsync();

            var entity = new Facility
            {
                Name = dto.Name,
                Description = dto.Description,
                Price = dto.Price,
                Category = dto.Category,
                HomeIndexCategory = dto.HomeIndexCategory,
                IsExploreHighlight = dto.IsExploreHighlight,
                IsDeleted = false
            };

            _context.tblFacilities.Add(entity);
            await _context.SaveChangesAsync();

            // Normalize paths before saving to DB
            var normalizedPaths = imagePaths?
                .Select(p => NormalizeImagePath(p))
                .Where(p => !string.IsNullOrEmpty(p))
                .ToList();

            if (normalizedPaths != null && normalizedPaths.Count > 0)
            {
                _context.tblFacilityImages.AddRange(normalizedPaths.Select(path => new FacilityImage
                {
                    FacilityId = entity.FacilityId,
                    ImagePath = path,
                    IsDeleted = false
                }));
            }

            if (dto.Category == "Room" && !string.IsNullOrEmpty(dto.RoomType))
            {
                _context.tblRoomTypes.Add(new RoomType
                {
                    FacilityId = entity.FacilityId,
                    Name = dto.RoomType,
                    Description = "",
                    BasePrice = dto.Price ?? 0m,
                    Category = dto.Category,
                    IsDeleted = false
                });
            }

            if (dto.Category == "Venue")
            {
                _context.tblVenues.Add(new Venue
                {
                    FacilityId = entity.FacilityId,
                    VenueCategory = dto.Name,
                    Meta = dto.Meta,
                    CapacityMin = dto.CapacityMin,
                    CapacityMax = dto.CapacityMax,
                    Feature1 = dto.Feature1,
                    Feature2 = dto.Feature2,
                    IsDeleted = false
                });
            }

            if (dto.Category == "Amenity")
            {
                _context.tblVenues.Add(new Venue
                {
                    FacilityId = entity.FacilityId,
                    VenueCategory = dto.Name,
                    Feature1 = dto.Feature1,
                    Feature2 = dto.Feature2,
                    Meta = dto.Meta,
                    IsDeleted = false
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            dto.FacilityId = entity.FacilityId;
            dto.Images = normalizedPaths?.Select(p => new FacilityImageDTO { ImagePath = p }).ToList() ?? new List<FacilityImageDTO>();
            return dto;
        }

        // ===============================
        // ADMIN: UPDATE FACILITY
        // ===============================
        public async Task<FacilityDTO> UpdateAsync(int id, FacilityDTO dto, List<string>? newImagePaths = null, List<int>? removedImageIds = null)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                throw new ArgumentException("Facility name cannot be empty.");

            ValidateByCategory(dto);

            using var transaction = await _context.Database.BeginTransactionAsync();

            var entity = await _context.tblFacilities
                .Include(f => f.FacilityImages)
                .Include(f => f.RoomTypes)
                .Include(f => f.Venues)
                .FirstOrDefaultAsync(f => f.FacilityId == id);

            if (entity == null)
                throw new KeyNotFoundException("Facility not found.");

            entity.Name = dto.Name;
            entity.Description = dto.Description;
            entity.Price = dto.Price;
            entity.Category = dto.Category;
            entity.HomeIndexCategory = dto.HomeIndexCategory;
            entity.IsExploreHighlight = dto.IsExploreHighlight;

            if (removedImageIds != null && removedImageIds.Count > 0)
            {
                var imagesToRemove = entity.FacilityImages
                    .Where(i => removedImageIds.Contains(i.FacilityImageId) && !i.IsDeleted);

                foreach (var img in imagesToRemove)
                    img.IsDeleted = true;
            }

            // Normalize new image paths before saving
            var normalizedNewPaths = newImagePaths?
                .Select(p => NormalizeImagePath(p))
                .Where(p => !string.IsNullOrEmpty(p))
                .ToList();

            if (normalizedNewPaths != null && normalizedNewPaths.Count > 0)
            {
                _context.tblFacilityImages.AddRange(normalizedNewPaths.Select(path => new FacilityImage
                {
                    FacilityId = entity.FacilityId,
                    ImagePath = path,
                    IsDeleted = false
                }));
            }

            if (dto.Category == "Room" && !string.IsNullOrEmpty(dto.RoomType))
            {
                var room = entity.RoomTypes.FirstOrDefault();
                if (room != null)
                {
                    room.Name = dto.RoomType;
                    room.BasePrice = dto.Price ?? 0m;
                    room.Category = dto.Category;
                    room.IsDeleted = false;
                    _context.tblRoomTypes.Update(room);
                }
                else
                {
                    _context.tblRoomTypes.Add(new RoomType
                    {
                        FacilityId = entity.FacilityId,
                        Name = dto.RoomType,
                        Description = "",
                        BasePrice = dto.Price ?? 0m,
                        Category = dto.Category,
                        IsDeleted = false
                    });
                }
            }

            if (dto.Category == "Venue")
            {
                var venue = entity.Venues.FirstOrDefault();
                if (venue != null)
                {
                    venue.VenueCategory = dto.Name;
                    venue.CapacityMin = dto.CapacityMin;
                    venue.CapacityMax = dto.CapacityMax;
                    venue.Meta = dto.Meta;
                    venue.Feature1 = dto.Feature1;
                    venue.Feature2 = dto.Feature2;
                    venue.IsDeleted = false;
                    _context.tblVenues.Update(venue);
                }
                else
                {
                    _context.tblVenues.Add(new Venue
                    {
                        FacilityId = entity.FacilityId,
                        VenueCategory = dto.Name,
                        Meta = dto.Meta,
                        CapacityMin = dto.CapacityMin,
                        CapacityMax = dto.CapacityMax,
                        Feature1 = dto.Feature1,
                        Feature2 = dto.Feature2,
                        IsDeleted = false
                    });
                }
            }

            if (dto.Category == "Amenity")
            {
                var venue = entity.Venues.FirstOrDefault();
                if (venue != null)
                {
                    venue.VenueCategory = dto.Name;
                    venue.Feature1 = dto.Feature1;
                    venue.Feature2 = dto.Feature2;
                    venue.Meta = dto.Meta;
                    venue.IsDeleted = false;
                    _context.tblVenues.Update(venue);
                }
                else
                {
                    _context.tblVenues.Add(new Venue
                    {
                        FacilityId = entity.FacilityId,
                        VenueCategory = "Amenity",
                        Feature1 = dto.Feature1,
                        Feature2 = dto.Feature2,
                        Meta = dto.Meta,
                        IsDeleted = false
                    });
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            dto.FacilityId = entity.FacilityId;
            dto.Images = entity.FacilityImages
                .Where(i => !i.IsDeleted)
                .Select(i => new FacilityImageDTO
                {
                    FacilityImageId = i.FacilityImageId,
                    ImagePath = NormalizeImagePath(i.ImagePath)
                })
                .Where(i => !string.IsNullOrEmpty(i.ImagePath))
                .ToList();

            return dto;
        }

        // ===============================
        // GET VENUE CARDS
        // ===============================
        public async Task<List<VenueDTO>> GetVenueCardsAsync()
        {
            var results = await _context.tblVenues
                .Include(v => v.Facility)
                    .ThenInclude(f => f.FacilityImages)
                .AsNoTracking()
                .Where(v => !v.IsDeleted
                            && v.Facility != null
                            && v.Facility.Price.HasValue && v.Facility.Price > 0
                            && v.CapacityMin > 0
                            && v.CapacityMax > 0)
                .Select(v => new VenueDTO
                {
                    VenueId = v.VenueId,
                    VenueName = v.VenueCategory,
                    FacilityId = v.FacilityId,
                    Description = v.Facility.Description,
                    VenuePrice = v.Facility.Price,
                    CapacityMin = v.CapacityMin,
                    CapacityMax = v.CapacityMax,
                    Meta = v.Meta,
                    Feature1 = v.Feature1,
                    Feature2 = v.Feature2,
                    Images = v.Facility.FacilityImages
                        .Where(i => !i.IsDeleted)
                        .Select(i => new FacilityImageDTO
                        {
                            FacilityImageId = i.FacilityImageId,
                            ImagePath = i.ImagePath
                        }).ToList()
                })
                .ToListAsync();

            foreach (var venue in results)
                venue.Images = venue.Images.Select(i => { i.ImagePath = NormalizeImagePath(i.ImagePath); return i; })
                                           .Where(i => !string.IsNullOrEmpty(i.ImagePath))
                                           .ToList();

            return results;
        }

        public async Task<List<AmenityCardDTO>> GetAmenityCardsAsync()
        {
            var results = await _context.tblVenues
                .Include(v => v.Facility)
                    .ThenInclude(f => f.FacilityImages)
                .AsNoTracking()
                .Where(v =>
                    !v.IsDeleted &&
                    v.Facility != null &&
                    v.Facility.Category == "Amenity" &&
                    v.Facility.Price.HasValue &&
                    v.Facility.Price > 0)
                .Select(v => new AmenityCardDTO
                {
                    FacilityId = v.FacilityId,
                    VenueId = v.VenueId,
                    Name = v.VenueCategory ?? "",
                    Price = v.Facility!.Price!.Value,
                    Feature1 = v.Feature1 ?? "",
                    Feature2 = v.Feature2 ?? "",
                    Feature3 = v.Meta ?? "",
                    Images = v.Facility.FacilityImages
                        .Where(i => !i.IsDeleted)
                        .Select(i => new FacilityImageDTO
                        {
                            FacilityImageId = i.FacilityImageId,
                            ImagePath = i.ImagePath ?? ""
                        })
                        .ToList()
                })
                .ToListAsync();

            foreach (var amenity in results)
                amenity.Images = amenity.Images.Select(i => { i.ImagePath = NormalizeImagePath(i.ImagePath); return i; })
                                               .Where(i => !string.IsNullOrEmpty(i.ImagePath))
                                               .ToList();

            return results;
        }

        public async Task<List<ResortHighlightDTO>> GetResortHighlightsAsync()
   {
    var results = await _context.tblVenues
        .Include(v => v.Facility)
            .ThenInclude(f => f.FacilityImages)
        .AsNoTracking()
        .Where(v =>
            !v.IsDeleted &&
            v.Facility != null &&
            v.Facility.Category == "Amenity")
        .Select(v => new ResortHighlightDTO
        {
            VenueId = v.VenueId,
            FacilityId = v.FacilityId,

            Name = v.VenueCategory ?? string.Empty,
            Description = v.Facility.Description ?? string.Empty,

            Feature1 = v.Feature1 ?? string.Empty,
            Feature2 = v.Feature2 ?? string.Empty,
            Feature3 = v.Meta ?? string.Empty,

            IsExploreHighlight = v.IsExploreHighlight,

            Images = v.Facility.FacilityImages
                .Where(i => !i.IsDeleted)
                .Select(i => new FacilityImageDTO
                {
                    FacilityImageId = i.FacilityImageId,
                    ImagePath = i.ImagePath ?? string.Empty
                })
                .ToList()
            })
           .ToListAsync();

          foreach (var highlight in results)
        {
        highlight.Images = highlight.Images
            .Select(i =>
            {
                i.ImagePath = NormalizeImagePath(i.ImagePath);
                return i;
            })
            .Where(i => !string.IsNullOrEmpty(i.ImagePath))
            .ToList();
        }

       return results;
     }

        // SOFT DELETE
    public async Task SoftDeleteAsync(int id)
{
    using var transaction = await _context.Database.BeginTransactionAsync();

    var entity = await _context.tblFacilities
        .Include(f => f.RoomTypes).ThenInclude(rt => rt.RoomImages)
        .Include(f => f.FacilityImages)
        .Include(f => f.Venues)
        .FirstOrDefaultAsync(f => f.FacilityId == id);

    if (entity == null) throw new KeyNotFoundException("Facility not found.");

    // Collect roomTypeIds and venueIds for cascading
    var roomTypeIds = entity.RoomTypes.Select(rt => rt.RoomTypeId).ToList();
    var venueIds = entity.Venues.Select(v => v.VenueId).ToList();

    // Soft delete facility and its direct children
    entity.IsDeleted = true;
    foreach (var rt in entity.RoomTypes)
    {
        rt.IsDeleted = true;
        foreach (var img in rt.RoomImages) img.IsDeleted = true;
    }
    foreach (var img in entity.FacilityImages) img.IsDeleted = true;
    foreach (var venue in entity.Venues) venue.IsDeleted = true;

    // Only cancel Pending bookings — Approved bookings stay intact
    // so they remain visible in financial report history
    var bookings = await _context.tblBooking
        .Where(b =>
            b.Status == "Pending" &&
            (roomTypeIds.Contains(b.RoomTypeId ?? 0) ||
             venueIds.Contains(b.VenueId ?? 0)))
        .ToListAsync();

    foreach (var booking in bookings)
        booking.Status = "Cancelled";

    // Soft delete availability records so occupancy history is preserved
    var availabilities = await _context.tblAvailability
        .Where(a => a.FacilityId == id)
        .ToListAsync();

    foreach (var a in availabilities)
        a.IsDeleted = true;

    // Soft delete favorites so they can be restored on undo
    var favorites = await _context.tblFavorites
        .Where(f =>
            roomTypeIds.Contains(f.RoomTypeId ?? 0) ||
            venueIds.Contains(f.VenueId ?? 0))
        .ToListAsync();

    foreach (var fav in favorites)
        fav.IsDeleted = true;

    await _context.SaveChangesAsync();
    await transaction.CommitAsync();
}
        // UNDO DELETE
        public async Task<FacilityDTO> UndoDeleteAsync(int id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            var entity = await _context.tblFacilities
                .Include(f => f.RoomTypes).ThenInclude(rt => rt.RoomImages)
                .Include(f => f.FacilityImages)
                .Include(f => f.Venues)
                .FirstOrDefaultAsync(f => f.FacilityId == id);

            if (entity == null) throw new KeyNotFoundException("Facility not found.");

            // Restore facility and its direct children
            entity.IsDeleted = false;
            foreach (var rt in entity.RoomTypes)
            {
                rt.IsDeleted = false;
                foreach (var img in rt.RoomImages) img.IsDeleted = false;
            }
            foreach (var img in entity.FacilityImages) img.IsDeleted = false;
            foreach (var venue in entity.Venues) venue.IsDeleted = false;

            var roomTypeIds = entity.RoomTypes.Select(rt => rt.RoomTypeId).ToList();
            var venueIds = entity.Venues.Select(v => v.VenueId).ToList();


            var cancelledBookings = await _context.tblBooking
                .Where(b =>
                    b.Status == "Cancelled" &&
                    b.CheckOut >= DateTime.Today &&
                    (roomTypeIds.Contains(b.RoomTypeId ?? 0) ||
                     venueIds.Contains(b.VenueId ?? 0)))
                .ToListAsync();

            foreach (var booking in cancelledBookings)
            {
                booking.Status = "Pending";

                var dates = Enumerable.Range(0, (booking.CheckOut.Date - booking.CheckIn.Date).Days + 1)
                    .Select(i => booking.CheckIn.Date.AddDays(i))
                    .ToList();

                await AddAvailabilityAsync(
                    id,
                    dates,
                    booking.RoomTypeId,
                    booking.VenueId
                );
            }

            // Restore soft-deleted favorites
            var deletedFavorites = await _context.tblFavorites
                .Where(f =>
                    f.IsDeleted &&
                    (roomTypeIds.Contains(f.RoomTypeId ?? 0) ||
                     venueIds.Contains(f.VenueId ?? 0)))
                .ToListAsync();

            foreach (var fav in deletedFavorites)
                fav.IsDeleted = false;

            // Restore soft-deleted availability records
            var deletedAvailabilities = await _context.tblAvailability
                .Where(a => a.FacilityId == id && a.IsDeleted)
                .ToListAsync();

            foreach (var a in deletedAvailabilities)
                a.IsDeleted = false;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return new FacilityDTO
            {
                FacilityId = entity.FacilityId,
                Name = entity.Name,
                Description = entity.Description,
                Price = entity.Price,
                Category = entity.Category,
                IsDeleted = entity.IsDeleted,
                HomeIndexCategory = entity.HomeIndexCategory,
                Images = entity.FacilityImages
                    .Where(i => !i.IsDeleted)
                    .Select(i => new FacilityImageDTO
                    {
                        FacilityImageId = i.FacilityImageId,
                        ImagePath = NormalizeImagePath(i.ImagePath)
                    })
                    .Where(i => !string.IsNullOrEmpty(i.ImagePath))
                    .ToList()
            };
        }
        
 public async Task<(int added, int skipped)> AddAvailabilityAsync(
    int facilityId,
    List<DateTime> dates,
    int? roomTypeId = null,
    int? venueId = null)
{
    var cleanDates = dates.Select(d => d.Date).Distinct().ToList();

    var existing = await _context.tblAvailability
        .Where(a =>
            a.FacilityId == facilityId &&
            cleanDates.Contains(a.Date) &&
            (roomTypeId == null || a.RoomTypeId == roomTypeId) &&
            (venueId == null || a.VenueId == venueId))
        .ToListAsync();

    int added = 0;
    int skipped = 0;

    foreach (var date in cleanDates)
    {
        var record = existing.FirstOrDefault(e => e.Date == date);

        if (record != null)
        {
            if (!record.IsBlocked || record.IsDeleted)
            {
                record.IsBlocked = true;
                record.IsDeleted = false;
                added++;
            }
            else
            {
                skipped++;
            }
        }
        else
        {
            _context.tblAvailability.Add(new FacilityAvailability
            {
                FacilityId = facilityId,
                RoomTypeId = roomTypeId,
                VenueId = venueId,
                Date = date,
                IsBlocked = true,
                IsDeleted = false,
            });
            added++;
        }
    }

    await _context.SaveChangesAsync();
    return (added, skipped);
}

    
// GET ROOMS BY BUILDING
public async Task<List<FacilityCardDTO>> GetRoomsByBuildingAsync()
{
    // 1. Load into memory first — avoids JOIN LATERAL on MariaDB
    var facilities = await _context.tblFacilities
        .AsNoTracking()
        .Include(f => f.RoomTypes.Where(rt => !rt.IsDeleted))
        .Include(f => f.FacilityImages.Where(i => !i.IsDeleted))
        .Include(f => f.Availabilities)
        .Where(f => !f.IsDeleted && f.Category == "Room")
        .ToListAsync();

    // 2. Project in memory — same pattern as GetHomeIndexAsync
    var results = facilities
        .SelectMany(f => f.RoomTypes.Select(rt => new FacilityCardDTO
        {
            FacilityId   = f.FacilityId,
            RoomTypeId   = rt.RoomTypeId,
            Name         = f.Name,
            Description  = f.Description,
            Price        = rt.BasePrice,
            Badge        = f.HomeIndexCategory,
            BuildingName = rt.Name,
            Images = f.FacilityImages
                .Select(i => new FacilityImageDTO
                {
                    FacilityImageId = i.FacilityImageId,
                    ImagePath       = NormalizeImagePath(i.ImagePath)
                })
                .Where(i => !string.IsNullOrEmpty(i.ImagePath))
                .ToList(),
            Availabilities = f.Availabilities
                .Where(a => a.RoomTypeId == rt.RoomTypeId)
                .Select(a => new FacilityAvailabilityDTO
                {
                    AvailabilityId = a.AvailabilityId,
                    FacilityId     = a.FacilityId,
                    RoomTypeId     = a.RoomTypeId,
                    VenueId        = a.VenueId,
                    Date           = a.Date,
                    IsBlocked      = a.IsBlocked
                })
                .ToList()
        }))
        .ToList();

    return results;
}

        
        // GET DELETED FACILITIES
        public async Task<List<FacilityDTO>> GetDeletedAsync()
        {
            var results = await _context.tblFacilities
                .AsNoTracking()
                .Where(f => f.IsDeleted)
                .Select(f => new FacilityDTO
                {
                    FacilityId = f.FacilityId,
                    Name = f.Name,
                    Description = f.Description,
                    Price = f.Price,
                    Category = f.Category,
                    HomeIndexCategory = f.HomeIndexCategory,
                    IsDeleted = f.IsDeleted,
                    Images = f.FacilityImages
                        .Select(i => new FacilityImageDTO
                        {
                            FacilityImageId = i.FacilityImageId,
                            ImagePath = i.ImagePath
                        }).ToList()
                }).ToListAsync();

            foreach (var facility in results)
                facility.Images = facility.Images.Select(i => { i.ImagePath = NormalizeImagePath(i.ImagePath); return i; })
                                                 .Where(i => !string.IsNullOrEmpty(i.ImagePath))
                                                 .ToList();

            return results;
        }

        public async Task<FacilityDTO> GetByIdAsync(int id)
        {
            var facility = await _context.tblFacilities
                .Include(f => f.FacilityImages)
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.FacilityId == id && !f.IsDeleted);

            if (facility == null) return null!;

            return new FacilityDTO
            {
                FacilityId = facility.FacilityId,
                Name = facility.Name,
                Description = facility.Description,
                Price = facility.Price,
                Category = facility.Category,
                HomeIndexCategory = facility.HomeIndexCategory,
                Images = facility.FacilityImages
                    .Where(i => !i.IsDeleted)
                    .Select(i => new FacilityImageDTO
                    {
                        FacilityImageId = i.FacilityImageId,
                        ImagePath = NormalizeImagePath(i.ImagePath)
                    })
                    .Where(i => !string.IsNullOrEmpty(i.ImagePath))
                    .ToList()
            };
        }
        
        public async Task<AvailabilityMonthDTO> GetAvailabilityMonthAsync(int facilityId, int year, int month, int? roomTypeId = null, int? venueId = null)
{
    var bookedDates = await _context.tblAvailability
        .Where(a =>
            a.FacilityId == facilityId &&
            a.Date.Year == year &&
            a.Date.Month == month &&
            a.Date >= DateTime.Today &&
            (roomTypeId == null || a.RoomTypeId == roomTypeId || a.RoomTypeId == null) &&
            (venueId == null || a.VenueId == venueId || a.VenueId == null)
        )
        .ToListAsync();

    // ── NEW: fetch booking statuses for this facility/roomtype/venue ──
    var bookingStatuses = await _context.tblBooking
        .Where(b =>
            b.Status != "Cancelled" &&
            (roomTypeId == null || b.RoomTypeId == roomTypeId) &&
            (venueId == null || b.VenueId == venueId)
        )
        .Select(b => new { b.CheckIn, b.CheckOut, b.Status })
        .ToListAsync();

    int daysInMonth = DateTime.DaysInMonth(year, month);
    var days = new List<FacilityAvailabilityDTO>();

    for (int d = 1; d <= daysInMonth; d++)
    {
        var date = new DateTime(year, month, d);
        var booked = bookedDates.FirstOrDefault(b => b.Date.Date == date.Date);

        // ── NEW: find the booking status for this specific date ──
        string? bookingStatus = null;
        if (booked?.IsBlocked == true)
        {
            var match = bookingStatuses.FirstOrDefault(b =>
                date.Date >= b.CheckIn.Date && date.Date <= b.CheckOut.Date);
            bookingStatus = match?.Status ?? null; // null = admin manual block
        }

        days.Add(new FacilityAvailabilityDTO
        {
            FacilityId = facilityId,
            RoomTypeId = roomTypeId,
            VenueId = venueId,
            Date = date,
            AvailabilityId = booked?.AvailabilityId ?? 0,
            IsBlocked = booked?.IsBlocked == true,
            BookingStatus = bookingStatus  // ── NEW ──
        });
    }

    return new AvailabilityMonthDTO
    {
        FacilityId = facilityId,
        RoomTypeId = roomTypeId,
        VenueId = venueId,
        Year = year,
        Month = month,
        Days = days
    };
}
       
       public async Task<int> UnblockAvailabilityAsync(int facilityId, List<DateTime> dates, int? roomTypeId = null, int? venueId = null)
    {
    var cleanDates = dates.Select(d => d.Date).Distinct().ToList();

    var records = await _context.tblAvailability
        .Where(a =>
            a.FacilityId == facilityId &&
            cleanDates.Contains(a.Date) &&
            a.IsBlocked == true &&
            (roomTypeId == null || a.RoomTypeId == roomTypeId) &&
            (venueId == null || a.VenueId == venueId))
        .ToListAsync();

    if (!records.Any()) return 0;

    _context.tblAvailability.RemoveRange(records);
    await _context.SaveChangesAsync();
    return records.Count;
  }
    
        public async Task<FacilityAvailabilityDTO> UpdateAvailabilityAsync(int id, FacilityAvailabilityDTO dto)
        {
            var entity = await _context.tblAvailability.FindAsync(id);
            if (entity == null) throw new KeyNotFoundException("Availability not found.");

            entity.Date = dto.Date;
            entity.RoomTypeId = dto.RoomTypeId;
            entity.VenueId = dto.VenueId;

            await _context.SaveChangesAsync();

            dto.AvailabilityId = entity.AvailabilityId;
            return dto;
        }

        // ===============================
        // PRIVATE HELPERS
        // ===============================
        private static string NormalizeImagePath(string? path)
        {
            if (string.IsNullOrWhiteSpace(path)) return string.Empty;

            // Normalize backslashes to forward slashes
            path = path.Replace("\\", "/");

            // Already a valid absolute URL (e.g. blob storage)
            if (path.StartsWith("http://") || path.StartsWith("https://"))
                return path;

            // Valid wwwroot-relative path — ensure leading slash
            if (path.StartsWith("/uploads/"))
                return path;

            // Legacy/broken path (e.g. "images/new/new photos/..." or physical paths)
            // Return empty so the UI can fall back to a placeholder instead of 404ing
            return string.Empty;
        }

        private static void ValidateByCategory(FacilityDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Category))
                throw new ArgumentException("Category is required.");

            switch (dto.Category)
            {
                case "Room":
                    if (dto.Price == null)
                        throw new ArgumentException("Price is required for Room.");
                    break;

                case "Venue":
                    if (dto.Price == null)
                        throw new ArgumentException("Price is required for Venue.");
                    if (dto.CapacityMin <= 0 || dto.CapacityMax <= 0)
                        throw new ArgumentException("Venue capacity is required.");
                    if (string.IsNullOrWhiteSpace(dto.Feature1) || string.IsNullOrWhiteSpace(dto.Feature2))
                        throw new ArgumentException("Venue features are required.");
                    break;

                case "Amenity":
                    if (string.IsNullOrWhiteSpace(dto.Feature1) || string.IsNullOrWhiteSpace(dto.Feature2))
                        throw new ArgumentException("Amenity features are required.");
                    break;

                default:
                    throw new ArgumentException("Invalid category.");
            }
        }
    }
}