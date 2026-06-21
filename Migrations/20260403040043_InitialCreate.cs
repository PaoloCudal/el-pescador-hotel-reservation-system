using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelReservationWeb.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "tblBuildings",
                columns: table => new
                {
                    BuildingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ShortDescription = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ImagePath = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblBuildings", x => x.BuildingId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "tblFacilities",
                columns: table => new
                {
                    FacilityId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Price = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    HomeIndexCategory = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Category = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsExploreHighlight = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblFacilities", x => x.FacilityId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "tblHotelClient",
                columns: table => new
                {
                    ClientId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    FirstName = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    MiddleName = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    LastName = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Email = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    JoinDate = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Password = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FullAddress = table.Column<string>(type: "varchar(60)", maxLength: 60, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ResetPasswordToken = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ResetPasswordTokenExpiry = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblHotelClient", x => x.ClientId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "tblFacilityImages",
                columns: table => new
                {
                    FacilityImageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ImagePath = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FacilityId = table.Column<int>(type: "int", nullable: false),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblFacilityImages", x => x.FacilityImageId);
                    table.ForeignKey(
                        name: "FK_tblFacilityImages_tblFacilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "tblFacilities",
                        principalColumn: "FacilityId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "tblRoomTypes",
                columns: table => new
                {
                    RoomTypeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BasePrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    MaxGuests = table.Column<int>(type: "int", nullable: false),
                    Category = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FacilityId = table.Column<int>(type: "int", nullable: false),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    BuildingId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblRoomTypes", x => x.RoomTypeId);
                    table.ForeignKey(
                        name: "FK_tblRoomTypes_tblBuildings_BuildingId",
                        column: x => x.BuildingId,
                        principalTable: "tblBuildings",
                        principalColumn: "BuildingId");
                    table.ForeignKey(
                        name: "FK_tblRoomTypes_tblFacilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "tblFacilities",
                        principalColumn: "FacilityId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "tblVenues",
                columns: table => new
                {
                    VenueId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    FacilityId = table.Column<int>(type: "int", nullable: false),
                    VenueCategory = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsExploreHighlight = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CapacityMin = table.Column<int>(type: "int", nullable: false),
                    CapacityMax = table.Column<int>(type: "int", nullable: false),
                    Feature1 = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Feature2 = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Meta = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblVenues", x => x.VenueId);
                    table.ForeignKey(
                        name: "FK_tblVenues_tblFacilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "tblFacilities",
                        principalColumn: "FacilityId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "tblRoomImages",
                columns: table => new
                {
                    RoomImageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ImagePath = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RoomTypeId = table.Column<int>(type: "int", nullable: false),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblRoomImages", x => x.RoomImageId);
                    table.ForeignKey(
                        name: "FK_tblRoomImages_tblRoomTypes_RoomTypeId",
                        column: x => x.RoomTypeId,
                        principalTable: "tblRoomTypes",
                        principalColumn: "RoomTypeId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "tblAvailability",
                columns: table => new
                {
                    AvailabilityId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    FacilityId = table.Column<int>(type: "int", nullable: false),
                    RoomTypeId = table.Column<int>(type: "int", nullable: true),
                    VenueId = table.Column<int>(type: "int", nullable: true),
                    Date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    TotalSlots = table.Column<int>(type: "int", nullable: false),
                    BookedSlots = table.Column<int>(type: "int", nullable: false),
                    IsBlocked = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblAvailability", x => x.AvailabilityId);
                    table.ForeignKey(
                        name: "FK_tblAvailability_tblFacilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "tblFacilities",
                        principalColumn: "FacilityId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tblAvailability_tblRoomTypes_RoomTypeId",
                        column: x => x.RoomTypeId,
                        principalTable: "tblRoomTypes",
                        principalColumn: "RoomTypeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tblAvailability_tblVenues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "tblVenues",
                        principalColumn: "VenueId");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "tblFavorites",
                columns: table => new
                {
                    FavoriteId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ClientId = table.Column<int>(type: "int", nullable: false),
                    RoomTypeId = table.Column<int>(type: "int", nullable: true),
                    VenueId = table.Column<int>(type: "int", nullable: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblFavorites", x => x.FavoriteId);
                    table.ForeignKey(
                        name: "FK_tblFavorites_tblHotelClient_ClientId",
                        column: x => x.ClientId,
                        principalTable: "tblHotelClient",
                        principalColumn: "ClientId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tblFavorites_tblRoomTypes_RoomTypeId",
                        column: x => x.RoomTypeId,
                        principalTable: "tblRoomTypes",
                        principalColumn: "RoomTypeId");
                    table.ForeignKey(
                        name: "FK_tblFavorites_tblVenues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "tblVenues",
                        principalColumn: "VenueId");
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "tblBooking",
                columns: table => new
                {
                    BookingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    RoomTypeId = table.Column<int>(type: "int", nullable: true),
                    VenueId = table.Column<int>(type: "int", nullable: true),
                    ClientId = table.Column<int>(type: "int", nullable: false),
                    CheckIn = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    CheckOut = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BookingReference = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SpecialRequest = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PaymentType = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FacilityAvailabilityAvailabilityId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tblBooking", x => x.BookingId);
                    table.ForeignKey(
                        name: "FK_tblBooking_tblAvailability_FacilityAvailabilityAvailabilityId",
                        column: x => x.FacilityAvailabilityAvailabilityId,
                        principalTable: "tblAvailability",
                        principalColumn: "AvailabilityId");
                    table.ForeignKey(
                        name: "FK_tblBooking_tblHotelClient_ClientId",
                        column: x => x.ClientId,
                        principalTable: "tblHotelClient",
                        principalColumn: "ClientId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tblBooking_tblRoomTypes_RoomTypeId",
                        column: x => x.RoomTypeId,
                        principalTable: "tblRoomTypes",
                        principalColumn: "RoomTypeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tblBooking_tblVenues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "tblVenues",
                        principalColumn: "VenueId",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_tblAvailability_FacilityId_RoomTypeId_VenueId_Date",
                table: "tblAvailability",
                columns: new[] { "FacilityId", "RoomTypeId", "VenueId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblAvailability_RoomTypeId",
                table: "tblAvailability",
                column: "RoomTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_tblAvailability_VenueId",
                table: "tblAvailability",
                column: "VenueId");

            migrationBuilder.CreateIndex(
                name: "IX_tblBooking_BookingReference",
                table: "tblBooking",
                column: "BookingReference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tblBooking_ClientId",
                table: "tblBooking",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_tblBooking_FacilityAvailabilityAvailabilityId",
                table: "tblBooking",
                column: "FacilityAvailabilityAvailabilityId");

            migrationBuilder.CreateIndex(
                name: "IX_tblBooking_RoomTypeId",
                table: "tblBooking",
                column: "RoomTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_tblBooking_VenueId",
                table: "tblBooking",
                column: "VenueId");

            migrationBuilder.CreateIndex(
                name: "IX_tblFacilityImages_FacilityId",
                table: "tblFacilityImages",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_tblFavorites_ClientId",
                table: "tblFavorites",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_tblFavorites_RoomTypeId",
                table: "tblFavorites",
                column: "RoomTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_tblFavorites_VenueId",
                table: "tblFavorites",
                column: "VenueId");

            migrationBuilder.CreateIndex(
                name: "IX_tblRoomImages_RoomTypeId",
                table: "tblRoomImages",
                column: "RoomTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_tblRoomTypes_BuildingId",
                table: "tblRoomTypes",
                column: "BuildingId");

            migrationBuilder.CreateIndex(
                name: "IX_tblRoomTypes_FacilityId",
                table: "tblRoomTypes",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_tblVenues_FacilityId",
                table: "tblVenues",
                column: "FacilityId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tblBooking");

            migrationBuilder.DropTable(
                name: "tblFacilityImages");

            migrationBuilder.DropTable(
                name: "tblFavorites");

            migrationBuilder.DropTable(
                name: "tblRoomImages");

            migrationBuilder.DropTable(
                name: "tblAvailability");

            migrationBuilder.DropTable(
                name: "tblHotelClient");

            migrationBuilder.DropTable(
                name: "tblRoomTypes");

            migrationBuilder.DropTable(
                name: "tblVenues");

            migrationBuilder.DropTable(
                name: "tblBuildings");

            migrationBuilder.DropTable(
                name: "tblFacilities");
        }
    }
}
