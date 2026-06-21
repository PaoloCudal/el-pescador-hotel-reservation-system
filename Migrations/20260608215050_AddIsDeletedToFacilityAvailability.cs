using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelReservationWeb.Migrations
{
    /// <inheritdoc />
    public partial class AddIsDeletedToFacilityAvailability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "tblAvailability",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "tblAvailability");
        }
    }
}
