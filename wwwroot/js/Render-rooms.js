document.addEventListener("DOMContentLoaded", () => {

    const buildingSelect = document.getElementById("buildingSelect");
    const seasideSection = document.getElementById("seaside");
    const twinSection = document.getElementById("twin");

    const seasideGrid = seasideSection.querySelector(".rooms-grid");
    const twinGrid = twinSection.querySelector(".rooms-grid");

    seasideSection.style.display = "none";
    twinSection.style.display = "none";

    // FETCH FROM DATABASE
    fetch("/api/admin/homeindex")
        .then(res => res.json())
        .then(data => renderRooms(data))
        .catch(err => console.error("Facility fetch error:", err));

    
    // RENDER ROOMS
    function renderRooms(facilities) {
        seasideGrid.innerHTML = "";
        twinGrid.innerHTML = "";

        facilities.forEach((f, index) => {

            const modalId = `modal-${f.facilityId}-${index}`;
            const carouselId = `carousel-${f.facilityId}-${index}`;

            const firstImage = f.images?.length
                ? f.images[0].imagePath
                : "/images/placeholder.jpg";

            const roomCard = document.createElement("div");
            roomCard.className = "room-card";
            roomCard.setAttribute("tabindex", "0");

            roomCard.innerHTML = `
                <img src="${firstImage}" alt="${f.name}">
                <i class="bi fav-icon bi-heart" role="button" tabindex="0"></i>
                <h5>${f.name}</h5>
                <p class="price">₱ ${Number(f.price).toLocaleString()} / night</p>
                <div class="px-3 pb-3 d-flex gap-2">
                    <button class="btn btn-outline-secondary flex-grow-1 view-details"
                        data-bs-toggle="modal"
                        data-bs-target="#${modalId}">
                        View Details
                    </button>
                </div>
            `;

            if (f.buildingName === "Seaside Grand") {
                seasideGrid.appendChild(roomCard);
            } else if (f.buildingName === "Twin Building") {
                twinGrid.appendChild(roomCard);
            }

            createModal(f, modalId, carouselId);
            setupModal(f, modalId, carouselId);
        });
    }

    // ==========================
    // CREATE MODAL HTML
    // ==========================
    function createModal(f, modalId, carouselId) {

        if (document.getElementById(modalId)) return;

        const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-dark text-white">
                        <h5 class="modal-title"></h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="${carouselId}" class="carousel slide" data-bs-ride="carousel">
                            <div class="carousel-inner"></div>
                            <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                                <span class="carousel-control-prev-icon"></span>
                            </button>
                            <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                                <span class="carousel-control-next-icon"></span>
                            </button>
                        </div>
                        <p class="text-muted mt-3"></p>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML("beforeend", modalHTML);
    }

    // ==========================
    // MODAL + CAROUSEL SETUP
    // ==========================
    function setupModal(f, modalId, carouselId) {

        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.querySelector(".modal-title").textContent =
            `${f.name} — ₱${Number(f.price).toLocaleString()}`;

        const desc = modal.querySelector(".text-muted");
        if (desc) desc.textContent = f.description || "";

        const carouselInner = modal.querySelector(".carousel-inner");
        carouselInner.innerHTML = "";

        f.images.forEach((img, index) => {
            const item = document.createElement("div");
            item.className = "carousel-item" + (index === 0 ? " active" : "");
            item.innerHTML = `<img src="${img.imagePath}" class="d-block w-100">`;
            carouselInner.appendChild(item);
        });
    }
    
    // BUILDING NAVIGATION
    window.showRooms = function (building) {
        buildingSelect.style.display = "none";
        seasideSection.style.display = building === "seaside" ? "block" : "none";
        twinSection.style.display = building === "twin" ? "block" : "none";
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.backToBuildings = function () {
        seasideSection.style.display = "none";
        twinSection.style.display = "none";
        buildingSelect.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
});
