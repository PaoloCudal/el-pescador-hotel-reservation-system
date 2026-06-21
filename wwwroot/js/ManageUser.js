function normalizeImagePath(path) {
    if (!path) return "/images/fallback.png";

    return path.startsWith("http")
        ? path
        : `${window.location.origin}/${path.replace(/^\/+/, "")}`;
}

function getAuthHeaders() {

    const token = localStorage.getItem("adminToken");

    if (!token) {
        window.location.href = "/StaffLogin";
        return {};
    }

    return {
        "Authorization": `Bearer ${token}`
    };
}

function sortUsers(data, ascending = true) {

    return [...data].sort((a, b) => {

        const dir = ascending ? 1 : -1;

        return (a.fullName || "")
            .localeCompare(b.fullName || "") * dir;
    });
}

function applyUserFilters() {
    const term = document.getElementById("userSearchInput").value.toLowerCase();

    let filtered = allUsers.filter(u =>
        (u.fullName || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term)
    );

    filtered = sortUsers(filtered, isUserAscending);
    renderUsers(filtered, term);  
}

let allUsers = [];

let isUserAscending = true;

document.addEventListener("DOMContentLoaded", async () => {

    try {

        const res = await fetch("/api/admin/users", {
            headers: getAuthHeaders()
        });

        if (res.status === 401) {

            localStorage.removeItem("adminToken");

            window.location.href = "/StaffLogin";

            return;
        }

        allUsers = await res.json();

        renderUsers(
            sortUsers(allUsers, isUserAscending)
        );

        const searchInput =
            document.getElementById("userSearchInput");

        const sortBtn =
            document.getElementById("userSortBtn");

        const sortText =
            document.getElementById("userSortText");

        searchInput.addEventListener(
            "input",
            applyUserFilters
        );

        sortBtn.addEventListener("click", () => {

            isUserAscending = !isUserAscending;

            sortText.textContent =
                isUserAscending
                    ? "Sort A–Z"
                    : "Sort Z–A";

            applyUserFilters();
        });

    } catch (err) {

        console.error("Failed to load users:", err);
    }
});

function renderUsers(users, searchTerm = "") {
    const tbody = document.getElementById("userTableBody");
    tbody.innerHTML = "";

    const highlight = (text) => {
        if (!searchTerm || !text) return text;
        const regex = new RegExp(`(${searchTerm})`, "gi");
        return String(text).replace(regex, `<mark style="background-color:#2196f3;color:white;">$1</mark>`);
    };

    users.forEach(u => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
         <td>${highlight(u.fullName)}</td>
         <td>${u.totalBookings ?? 0}</td>
         <td>${new Date(u.joinDate).toLocaleDateString()}</td>
        `;

        tr.style.cursor = "pointer";

        tr.onclick = async () => {
            await loadUserBookings(u.clientId);
            await loadUserFavorites(u.clientId);
            const modal = new bootstrap.Modal(document.getElementById("userHistoryModal"));
            modal.show();
        };

        tbody.appendChild(tr);
    });
}

async function loadUserBookings(clientId) {

    const res = await fetch(
        `/api/admin/bookings/${clientId}`,
        {
            headers: getAuthHeaders()
        }
    );

    if (res.status === 401) {

        localStorage.removeItem("adminToken");

        window.location.href = "/StaffLogin";

        return;
    }

    const bookings = await res.json();

    const container =
        document.getElementById("bookingCardsContainer");

    container.innerHTML = "";

    bookings.forEach(b => {

        const card = document.createElement("div");

        card.className =
            "card p-2 shadow-sm facility-card";

        const checkInFormatted =
            new Date(b.checkIn).toLocaleDateString(
                "en-US",
                {
                    weekday: "short",
                    month: "numeric",
                    day: "numeric",
                    year: "numeric"
                }
            );

        const checkOutFormatted =
            new Date(b.checkOut).toLocaleDateString(
                "en-US",
                {
                    weekday: "short",
                    month: "numeric",
                    day: "numeric",
                    year: "numeric"
                }
            );

        const facilityData = {
            FacilityId: b.facilityId,
            Name: b.facilityName,
            Description: b.description || "",
            Price: b.price || 0,
            Images:
                b.images && b.images.length > 0
                    ? b.images.map(img => ({
                        ImagePath: normalizeImagePath(
                            typeof img === "string"
                                ? img
                                : img.imagePath || img.ImagePath
                        )
                    }))
                    : [
                        {
                            ImagePath:
                                "/images/fallback.png"
                        }
                    ]
        };

        card.dataset.facility =
            JSON.stringify(facilityData);

        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="mb-1">${b.facilityName}</h6>
                    <small class="text-muted">
                        ${checkInFormatted} - ${checkOutFormatted}
                    </small>
                </div>

                <div class="text-end">
                    <span class="badge bg-info">
                        ${b.status}
                    </span>
                </div>
            </div>
        `;

        container.appendChild(card);
    });

    makeCardsInteractive("bookingCardsContainer");
}

async function loadUserFavorites(clientId) {

    const res = await fetch(
        `/api/admin/favorites/${clientId}`,
        {
            headers: getAuthHeaders()
        }
    );

    if (res.status === 401) {

        localStorage.removeItem("adminToken");

        window.location.href = "/StaffLogin";

        return;
    }

    const favorites = await res.json();

    const container =
        document.getElementById("favoritesSwipeContainer");

    container.innerHTML = "";

    favorites.forEach(f => {

        const card = document.createElement("div");

        card.className =
            "card flex-shrink-0 shadow-sm facility-card";

        const imgSrc =
            f.images && f.images.length > 0
                ? `${window.location.origin}/${f.images[0].replace(/^\/+/, "")}`
                : "/images/fallback.png";

        const priceNumber =
            parseFloat(f.price) || 0;

        const formattedPrice =
            priceNumber.toLocaleString("en-PH");

        const facilityData = {
            FacilityId: f.facilityId,
            Name: f.facilityName,
            Description: f.description || "",
            Price: f.price || 0,
            Images:
                f.images && f.images.length > 0
                    ? f.images.map(img => ({
                        ImagePath:
                            typeof img === "string"
                                ? img
                                : img.imagePath || img.ImagePath
                    }))
                    : [
                        {
                            ImagePath: imgSrc
                        }
                    ]
        };

        card.dataset.facility =
            JSON.stringify(facilityData);

        card.innerHTML = `
            <img src="${imgSrc}"
                 class="card-img-top"
                 alt="${f.facilityName}">

            <div class="card-body p-2">
                <h6 class="card-title mb-1">
                    ${f.facilityName}
                </h6>

                <p class="card-text text-truncate">
                    ${f.facilityType} • ₱${formattedPrice}
                </p>
            </div>
        `;

        container.appendChild(card);
    });

    makeCardsInteractive("favoritesSwipeContainer");
}

function makeCardsInteractive(containerId) {

    const container =
        document.getElementById(containerId);

    if (!container) return;

    container.onclick = e => {

        const card =
            e.target.closest(".facility-card");

        if (!card) return;

        const facility =
            JSON.parse(card.dataset.facility);

        openFacilityModal(facility);
    };
}

function openFacilityModal(facility) {

    const modalId =
        `modal-${facility.FacilityId}`;

    const carouselId =
        `carousel-${facility.FacilityId}`;

    const hasMultipleImages =
        facility.Images.length > 1;

    const existing =
        document.getElementById(modalId);

    if (existing) existing.remove();

    const modalHTML = `
<div class="modal fade"
     id="${modalId}"
     tabindex="-1"
     aria-hidden="true">

  <div class="modal-dialog modal-xl modal-dialog-centered">

    <div class="modal-content">

      <div class="modal-header bg-dark text-white">

        <h5 class="modal-title">
            ${facility.Name}
        </h5>

        <button type="button"
                class="btn-close btn-close-white"
                data-bs-dismiss="modal">
        </button>

      </div>

      <div class="modal-body">

        <div class="row gx-0">

          <div class="col-md-7 pe-md-3">

            <div id="${carouselId}"
                 class="carousel slide">

              <div class="carousel-inner">

                ${facility.Images.map((img, i) => `
                  <div class="carousel-item ${i === 0 ? "active" : ""}">
                    <img src="${img.ImagePath}"
                         class="d-block w-100 rounded"
                         alt="${facility.Name}">
                  </div>
                `).join("")}

              </div>

              ${hasMultipleImages ? `
              <button class="carousel-control-prev"
                      type="button"
                      data-bs-target="#${carouselId}"
                      data-bs-slide="prev">

                <span class="carousel-control-prev-icon"></span>

              </button>

              <button class="carousel-control-next"
                      type="button"
                      data-bs-target="#${carouselId}"
                      data-bs-slide="next">

                <span class="carousel-control-next-icon"></span>

              </button>

              <div class="d-flex mt-2 overflow-auto">

                ${facility.Images.map((img, i) => `
                  <img src="${img.ImagePath}"
                       class="thumb img-thumbnail me-2 ${i === 0 ? "border-primary" : ""}"
                       style="width:60px; cursor:pointer;"
                       data-index="${i}">
                `).join("")}

              </div>
              ` : ""}

            </div>

          </div>

          <div class="col-md-5">

            <div class="p-3">

              <h4>${facility.Name}</h4>

              <p class="text-muted">
                ${facility.Description}
              </p>

              <p>
                <strong>Price:</strong>
                ₱${facility.Price}
              </p>

              <div class="mt-3">

                <button class="btn btn-gold w-100"
                        data-bs-dismiss="modal">
                    Close
                </button>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>

</div>
`;

    const container =
        document.getElementById(
            "dynamicFacilityModalsContainer"
        );

    container.insertAdjacentHTML(
        "beforeend",
        modalHTML
    );

    const carouselEl =
        document.getElementById(carouselId);

    const carousel =
        new bootstrap.Carousel(carouselEl, {
            interval:
                hasMultipleImages ? 3000 : false,

            ride:
                hasMultipleImages
                    ? "carousel"
                    : false
        });

    carouselEl
        .querySelectorAll(".thumb")
        .forEach(thumb => {

            thumb.addEventListener(
                "click",
                () => {

                    const index =
                        parseInt(
                            thumb.dataset.index,
                            10
                        );

                    carousel.to(index);
                }
            );
        });

    const modal = new bootstrap.Modal(
        document.getElementById(modalId)
    );

    modal.show();
}