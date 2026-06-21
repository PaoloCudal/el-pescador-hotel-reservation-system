const OPENWEATHERMAP_API_KEY = 'YOUR_OPENWEATHER_API_KEY';
const defaultCity = 'Bolinao';

// AUTH STATE & PROFILE DROPDOWN
let AUTH_STATE = { checked: false, isAuthenticated: false, user: null };

async function checkAuth() {
    if (AUTH_STATE.checked) return AUTH_STATE;
    try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) throw new Error("Auth fetch failed");
        const data = await res.json();
        AUTH_STATE.isAuthenticated = !!data.isAuthenticated;
        AUTH_STATE.user = data;
        console.log("[Auth] Fetched auth state:", AUTH_STATE);
    } catch (err) {
        AUTH_STATE.isAuthenticated = false;
        AUTH_STATE.user = null;
        console.error("[Auth] Error fetching auth:", err);
    }
    AUTH_STATE.checked = true;
    return AUTH_STATE;
}

// AUTO-CYCLE CAROUSEL ON MODAL OPEN
document.addEventListener("shown.bs.modal", function (e) {
    const modal = e.target;
    const carouselEl = modal.querySelector(".carousel");
    if (!carouselEl) return;
    let carousel = bootstrap.Carousel.getInstance(carouselEl);
    if (!carousel) {
        carousel = new bootstrap.Carousel(carouselEl, { interval: 3000, pause: false, wrap: true });
    }
    carousel.to(0);
    carousel.cycle();
});

document.addEventListener("DOMContentLoaded", function () {
    const profileDropdown = document.querySelector("#profileDropdown");
    const dropdownMenu = profileDropdown?.querySelector("ul");
    const profileBtn = profileDropdown?.querySelector("#profileMenuBtn");

    // ✅ MOVED: profileModal initialized BEFORE openUserProfileModal is defined
    const modalElement = document.getElementById('userProfileModal');
    if (!modalElement) return;
    const profileModal = new bootstrap.Modal(modalElement);

    function getStatusBadge(status) {
        switch (status.toLowerCase()) {
            case "cancelled":
                return `<span class="badge bg-danger text-white">Cancelled</span>`;
            case "approved":
                return `<span class="badge bg-primary text-white">Approved</span>`;
            case "pending":
                return `<span class="badge bg-warning text-dark">Pending</span>`;
            case "declined":
                return `<span class="badge bg-info text-white">Declined</span>`;
            default:
                return `<span class="badge bg-secondary text-white">${status}</span>`;
        }
    }

    
    window.openUserProfileModal = async function (userId) {
        if (!userId) { console.error("openUserProfileModal: userId missing"); return; }

        document.querySelectorAll(".modal.show").forEach(m => { bootstrap.Modal.getInstance(m)?.hide(); });
        document.body.classList.remove("modal-open");
        document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());
        await new Promise(r => setTimeout(r, 50));

        profileModal.show(); 

        try {
            const res = await fetch(`/api/booking/my-account/${userId}`, { credentials: "include" });
            if (!res.ok) throw new Error("Profile fetch failed");
            const data = await res.json();
            document.getElementById("profileFullName").textContent = data.fullName ?? "—";
            document.getElementById("profileEmail").textContent = data.email ?? "—";
            document.getElementById("profileJoinDate").textContent =
                data.joinDate ? new Date(data.joinDate).toLocaleDateString() : "—";
            document.getElementById("profileFavoriteRooms").textContent = `Favorite Rooms: ${data.favoriteRoomsCount ?? 0}`;
            document.getElementById("profileFavoriteVenues").textContent = `Favorite Venues: ${data.favoriteVenuesCount ?? 0}`;
        } catch (err) { console.error("Profile fetch error:", err); }

        try {
            const res = await fetch(`/api/booking/active/${userId}`, { credentials: "include" });
            if (!res.ok) throw new Error("Bookings fetch failed");
            const bookings = await res.json();
            const list = document.getElementById("activeBookingsList");
            list.innerHTML = "";

            if (!bookings.length) {
                list.innerHTML = `<div class="text-muted text-center py-4">No active bookings</div>`;
                return;
            }

            bookings.forEach(b => {
                const card = document.createElement('div');
                card.className = "card border-0 shadow-sm mb-2";
                const statusBadge = getStatusBadge(b.status);
                const canCancel = b.status?.toLowerCase() === "pending" || b.status?.toLowerCase() === "approved";

                card.innerHTML = `
                    <div class="card-body d-flex justify-content-between align-items-start">
                        <div>
                            <div class="fw-bold">${b.bookingReference}</div>
                            <div class="text-muted small">${b.facilityName}</div>
                            <div class="small">
                                ${new Date(b.checkIn).toLocaleDateString()} →
                                ${new Date(b.checkOut).toLocaleDateString()}
                                (${b.nights} night(s))
                            </div>
                            <div class="small fw-semibold mt-1">
                                ₱${b.totalCost.toLocaleString()}
                            </div>
                            <div class="mt-2">${statusBadge}</div>
                        </div>
                        ${canCancel ? `<button class="btn btn-outline-danger btn-sm cancelBookingBtn">Cancel</button>` : ``}
                    </div>
                `;

                if (canCancel) {
                    card.querySelector('.cancelBookingBtn').addEventListener('click', async () => {
                        const isApproved = b.status?.toLowerCase() === "approved";
                        const result = await Swal.fire({
                            title: 'Cancel Booking?',
                            text: isApproved ? 'This booking has already been approved. Are you sure you want to cancel it?' : 'This action cannot be undone.',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#d33',
                            confirmButtonText: 'Yes, cancel it!'
                        });
                        if (!result.isConfirmed) return;
                        const res = await fetch(`/api/booking/cancel/${b.bookingReference}`, { method: "POST" });
                        if (res.ok) {
                            Swal.fire({ icon: 'success', title: 'Cancelled', timer: 1200, showConfirmButton: false });
                            openUserProfileModal(userId);
                        }
                    });
                }

                list.appendChild(card);
            });
        } catch (err) { console.error("Bookings fetch error:", err); }
    };

    async function loadProfileDropdown() {
        if (!dropdownMenu || !profileBtn) return;

        const auth = await checkAuth();

        dropdownMenu.innerHTML = auth.isAuthenticated
            ? `<li><a class="dropdown-item" href="#" id="myAccountBtn">My Account</a></li>
           <li><a class="dropdown-item" href="/Logout/">Logout</a></li>`
            : `<li><a class="dropdown-item" href="/UserLogin">Login</a></li>
           <li><a class="dropdown-item" href="/UserRegistration">Sign Up</a></li>`;

        const myAccountBtn = document.getElementById("myAccountBtn");
        if (myAccountBtn && auth.user?.userId) {
            myAccountBtn.addEventListener("click", (e) => {
                e.preventDefault();
                openUserProfileModal(auth.user.userId);
            });
        }

        initProfileDropdown();
    }

    function initProfileDropdown() {
        if (!profileBtn || !dropdownMenu) return;

        const bsDropdown = new bootstrap.Dropdown(profileBtn, { autoClose: false });

        profileBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            bsDropdown.toggle();
        });

        document.addEventListener("click", () => {
            bsDropdown.hide();
        });
    }

    loadProfileDropdown();
});


// WEATHER WIDGET
async function fetchWeather(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;
    const res = await fetch(url);
    return res.json();
}

async function renderWeather() {
    const el = document.getElementById('weatherContent');
    if (!el) return;
    el.innerHTML = '<i class="bi bi-cloud-sun"></i> Loading...';
    try {
        const data = await fetchWeather(defaultCity);
        if (data.weather) {
            const icon = `https://openweathermap.org/img/wn/${data.weather[0].icon}.png`;
            el.innerHTML = `<strong>${data.name}</strong> <img src="${icon}" alt="${data.weather[0].description}" /> ${Math.round(data.main.temp)}°C • ${data.weather[0].description}`;
            console.log("[Weather] Rendered weather:", data);
        } else {
            el.textContent = '⚠️ Weather unavailable';
        }
    } catch (err) {
        el.textContent = '⚠️ Error loading weather';
        console.error("[Weather] Error fetching weather:", err);
    }
}


// FADE-IN OBSERVER
function initFadeInAnimation() {
    console.log("[FadeIn] Initializing fade-in observer");
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.1 });
    document.querySelectorAll(".fade-in").forEach(el => observer.observe(el));
}


// CAROUSELS
function initCarousels() {
    console.log("[Carousel] Initializing carousels");
    document.querySelectorAll('.carousel').forEach(carouselEl => {
        if (!bootstrap.Carousel.getInstance(carouselEl)) {
            new bootstrap.Carousel(carouselEl, { interval: 3000, ride: 'carousel', pause: false, wrap: true });
        }
    });
}

// AMENITIES
async function loadAmenities() {
    const grid = document.getElementById("amenitiesGrid");
    const modalContainer = document.getElementById("amenityModalsContainer");

    if (!grid || !modalContainer) return;

    console.log("[Amenities] Loading amenities from Resort Highlights API...");

    grid.innerHTML = "";
    modalContainer.innerHTML = "";

    const PLACEHOLDER_COUNT = 6;

    for (let i = 0; i < PLACEHOLDER_COUNT; i++) {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4";

        col.innerHTML = `
            <div class="amenity-card skeleton-card">
                <div class="skeleton-image shimmer"></div>
                <div class="amenity-body">
                    <div class="skeleton-line shimmer mb-2"></div>
                    <div class="skeleton-line shimmer mb-2 w-75"></div>
                    <div class="skeleton-line shimmer w-50"></div>
                </div>
            </div>
        `;

        grid.appendChild(col);
    }

    try {
        const res = await fetch("/api/customer/resort-highlights");
        const amenities = await res.json();

        await new Promise(r => setTimeout(r, 250));

        grid.innerHTML = "";
        modalContainer.innerHTML = "";

        amenities.forEach(a => {

            const modalId = `amenityModal-${a.facilityId}`;
            const coverImg = a.images?.[0]?.imagePath || "/images/placeholder.jpg";
            const hasMultiple = (a.images || []).length > 1;

            // CARD
    
    grid.insertAdjacentHTML("beforeend", `
    <div class="col-md-6 col-lg-4 fade-in">
    <div class="amenity-card"
         data-bs-toggle="modal"
         data-bs-target="#${modalId}">

        <img src="${coverImg}"
             alt="${a.name}"
             class="amenity-image">

        <div class="amenity-body">

            <div class="meta-chips">
                ${a.feature1 ? `<span class="chip">${a.feature1}</span>` : ""}
                ${a.feature2 ? `<span class="chip">${a.feature2}</span>` : ""}
                ${a.feature3 ? `<span class="chip">${a.feature3}</span>` : ""}
            </div>

            ${a.description ? `<p class="amenity-desc text-muted small mt-1 mb-0">${a.description}</p>` : ""} 

            <div class="amenity-title">
                ${a.name}
            </div>
        </div>
    </div>
    </div>
`);

            // MODAL
            modalContainer.insertAdjacentHTML("beforeend", `
                <div class="modal fade"
                     id="${modalId}"
                     tabindex="-1"
                     aria-hidden="true">

                    <div class="modal-dialog modal-xl modal-dialog-centered">
                        <div class="modal-content">

                            <div class="modal-header bg-dark text-white">
                                <h5 class="modal-title">${a.name}</h5>

                                <button type="button"
                                        class="btn-close btn-close-white"
                                        data-bs-dismiss="modal">
                                </button>
                            </div>

                            <div class="modal-body">

                                <div class="row gx-0">

                                    <div class="col-md-6 pe-md-3">

                                        <div id="carousel-amenity-${a.facilityId}"
                                             class="carousel slide"
                                             data-bs-ride="carousel"
                                             data-bs-interval="3000">

                                            <div class="carousel-inner">

                                                ${(a.images || []).map((img, i) => `
                                                    <div class="carousel-item ${i === 0 ? "active" : ""}">
                                                        <img src="${img.imagePath}"
                                                             class="d-block w-100 rounded"
                                                             style="height:380px; object-fit:cover;"
                                                             alt="${a.name}">
                                                    </div>
                                                `).join("")}

                                            </div>

                                            ${hasMultiple ? `
                                                <button class="carousel-control-prev"
                                                        type="button"
                                                        data-bs-target="#carousel-amenity-${a.facilityId}"
                                                        data-bs-slide="prev">
                                                    <span class="carousel-control-prev-icon"></span>
                                                </button>

                                                <button class="carousel-control-next"
                                                        type="button"
                                                        data-bs-target="#carousel-amenity-${a.facilityId}"
                                                        data-bs-slide="next">
                                                    <span class="carousel-control-next-icon"></span>
                                                </button>
                                            ` : ""}

                                        </div>

                                    </div>

                                    <div class="col-md-6">

                                        <div style="padding:18px;">

                                            <h4>${a.name}</h4>

                                            <p class="text-muted">
                                                ${a.description || ""}
                                            </p>

                                            <div class="mb-3">
                                                ${buildChips(a)}
                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>
                    </div>

                </div>
            `);
        });

        initFadeInAnimation();

        console.log("[Amenities] Loaded", amenities.length);

    } catch (err) {

        console.error("[Amenities] Failed:", err);

        grid.innerHTML = `
            <p class="text-danger">
                Failed to load amenities.
            </p>
        `;
    }
}


// RESORT HIGHLIGHTS
async function loadResortHighlights() {
    const grid = document.getElementById("resortHighlightsGrid");
    const modalContainer = document.getElementById("resortHighlightModals");
    if (!grid || !modalContainer) return;

    console.log("[Highlights] Loading resort highlights...");
    grid.innerHTML = "";
    modalContainer.innerHTML = "";

    const PLACEHOLDER_COUNT = 6;
    for (let i = 0; i < PLACEHOLDER_COUNT; i++) {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4";
        col.innerHTML = `<div class="highlight-card skeleton-card">
            <div class="skeleton-image shimmer"></div>
            <div class="highlight-body">
                <div class="skeleton-line shimmer mb-2"></div>
                <div class="skeleton-line shimmer w-75"></div>
            </div>
        </div>`;
        grid.appendChild(col);
    }

    try {
        const res = await fetch("/api/customer/resort-highlights");
        const highlights = await res.json();
        await new Promise(r => setTimeout(r, 250));

        grid.innerHTML = "";
        modalContainer.innerHTML = "";

        highlights.forEach(h => {
            const modalId = `highlightModal-${h.venueId}`;
            const coverImg = h.images?.[0]?.imagePath || "/images/placeholder.jpg";
            const carouselId = `carousel-${h.venueId}`;
            const hasMultiple = (h.images || []).length > 1;

            grid.insertAdjacentHTML("beforeend", `
                <div class="col-md-6 col-lg-4 fade-in">
                    <div class="highlight-card" data-bs-toggle="modal" data-bs-target="#${modalId}">
                        <img src="${coverImg}" alt="${h.name}" class="highlight-image">
                        <div class="highlight-body">
                            <h5 class="highlight-title">${h.name}</h5>
                            <p class="highlight-desc text-muted small">${h.description || ''}</p>
                        </div>
                    </div>
                </div>
            `);

            modalContainer.insertAdjacentHTML("beforeend", `
                <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-lg modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-dark text-white">
                                <h5 class="modal-title">${h.name}</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div id="${carouselId}" class="carousel slide mb-3" data-bs-ride="carousel" data-bs-interval="3000">
                                    <div class="carousel-inner">
                                        ${(h.images || []).map((img, idx) => `
                                            <div class="carousel-item ${idx === 0 ? 'active' : ''}">
                                                <img src="${img.imagePath}" class="d-block w-100 rounded" style="height:380px; object-fit:cover;">
                                            </div>
                                        `).join('')}
                                    </div>
                                    ${hasMultiple ? `
                                    <button class="carousel-control-prev" type="button"
                                        data-bs-target="#${carouselId}" data-bs-slide="prev">
                                        <span class="carousel-control-prev-icon"></span>
                                    </button>
                                    <button class="carousel-control-next" type="button"
                                        data-bs-target="#${carouselId}" data-bs-slide="next">
                                        <span class="carousel-control-next-icon"></span>
                                    </button>` : ''}
                                </div>
                                <p class="text-center text-muted">${h.description || ''}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `);
        });

        const cards = grid.querySelectorAll(".highlight-card");
        if (cards.length > 0) {
            const lastCard = cards[cards.length - 1];
            lastCard.classList.add("wide");
            const lastCol = lastCard.closest(".col-md-6, .col-lg-4");
            if (lastCol) {
                lastCol.classList.remove("col-md-6", "col-lg-4");
                lastCol.classList.add("col-12");
            }
        }

        initFadeInAnimation();
        console.log("[Highlights] Loaded", highlights.length, "highlights");
    } catch (err) {
        console.error("[Highlights] Failed to load highlights:", err);
        grid.innerHTML = `<p class="text-danger">Failed to load resort highlights.</p>`;
    }
}

// ===============================
// HELPER: CHIPS
// ===============================
function buildChips(a) {
    return [a.feature1, a.feature2, a.feature3]
        .filter(Boolean)
        .map(f => `<span class="chip">${f}</span>`)
        .join("  ");
}

// ===============================
// PAGE INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    console.log("[Page] DOMContentLoaded fired");
    renderWeather();
    loadAmenities();
    loadResortHighlights();
    initCarousels();
    initFadeInAnimation();
});