using HotelReservationWeb.Pages.Accounts.Admin;
using HotelReservationWeb.Pages.Accounts.Admin.DTOs_Admin;

public interface IFacilityService
{
    Task<List<FacilityDTO>> GetAllAsync();

    Task<FacilityDTO> AddAsync(FacilityDTO dto, List<string>? imagePaths);

    Task<FacilityDTO> UpdateAsync(
        int id,
        FacilityDTO dto,
        List<string>? imagePaths,
        List<int>? removedImageIds = null);

    Task<FacilityDTO> GetByIdAsync(int id);

    Task SoftDeleteAsync(int id);

    Task<FacilityDTO> UndoDeleteAsync(int id);

    Task<List<FacilityCardDTO>> GetHomeIndexAsync();

    Task<FacilityAvailabilityDTO> UpdateAvailabilityAsync(int id, FacilityAvailabilityDTO dto);

    Task<List<FacilityDTO>> GetDeletedAsync();

    Task<List<VenueDTO>> GetVenueCardsAsync();

    Task<List<FacilityCardDTO>> GetRoomsByBuildingAsync();

    Task<List<AmenityCardDTO>> GetAmenityCardsAsync();

    Task<List<ResortHighlightDTO>> GetResortHighlightsAsync();

    Task<AvailabilityMonthDTO> GetAvailabilityMonthAsync(
        int facilityId,
        int year,
        int month,
        int? roomTypeId = null,
        int? venueId = null
    );

    Task<(int added, int skipped)> AddAvailabilityAsync(
        int facilityId,
        List<DateTime> dates,
        int? roomTypeId = null,
        int? venueId = null
    );

    Task<int> UnblockAvailabilityAsync(
        int facilityId,
        List<DateTime> dates,
        int? roomTypeId = null,
        int? venueId = null
    );
}