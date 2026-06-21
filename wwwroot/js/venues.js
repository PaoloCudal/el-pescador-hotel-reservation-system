const _blockedDatesCache = {};
// AUTH STATE (GLOBAL)
let AUTH_STATE = {
    checked: false,
    isAuthenticated: false,
    user: null
};

async function checkAuth() {
    if (AUTH_STATE.checked) return AUTH_STATE;

    try {
        const res = await fetch("/api/auth/me", {
            credentials: "include"
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        AUTH_STATE.isAuthenticated = !!data.isAuthenticated;
        AUTH_STATE.user = data;
    } catch {
        AUTH_STATE.isAuthenticated = false;
        AUTH_STATE.user = null;
    }

    AUTH_STATE.checked = true;
    return AUTH_STATE;
}

document.addEventListener("DOMContentLoaded", async function () {

    // 1️⃣ USER PROFILE MODAL
    const modalElement = document.getElementById('userProfileModal');
    if (!modalElement) return;

    const profileModal = new bootstrap.Modal(modalElement);
    window.profileModal = profileModal;

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
        if (!userId) {
            console.error("openUserProfileModal: userId missing");
            return;
        }

        if (!window.profileModal) {
            console.error("Profile modal not initialized");
            return;
        }

        // 🧹 FORCE CLEAN BOOTSTRAP STATE (VENUES FIX)
        document.querySelectorAll(".modal.show").forEach(m => {
            bootstrap.Modal.getInstance(m)?.hide();
        });

        document.body.classList.remove("modal-open");
        document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());

        await new Promise(r => setTimeout(r, 50));

        // ✅ SHOW PROFILE MODAL
        profileModal.show();

        // ===============================
        // USER INFO
        // ===============================
        try {
            const res = await fetch(`/api/booking/my-account/${userId}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Profile fetch failed");

            const data = await res.json();

            document.getElementById("profileFullName").textContent = data.fullName ?? "—";
            document.getElementById("profileEmail").textContent = data.email ?? "—";
            document.getElementById("profileJoinDate").textContent =
                data.joinDate ? new Date(data.joinDate).toLocaleDateString() : "—";

            document.getElementById("profileFavoriteRooms").textContent =
                `Favorite Rooms: ${data.favoriteRoomsCount ?? 0}`;

            document.getElementById("profileFavoriteVenues").textContent =
                `Favorite Venues: ${data.favoriteVenuesCount ?? 0}`;
        } catch (err) {
            console.error("Profile fetch error:", err);
        }

        // ACTIVE BOOKINGS
        try {
            const res = await fetch(`/api/booking/active/${userId}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Bookings fetch failed");

            const bookings = await res.json();
            const list = document.getElementById("activeBookingsList");
            list.innerHTML = "";

            if (!bookings.length) {
                list.innerHTML = `
                <div class="text-muted text-center py-4">
                    No active bookings
                </div>`;
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
                <div class="mt-2">
                    ${statusBadge}
                </div>
            </div>

            ${canCancel ? `
                <button class="btn btn-outline-danger btn-sm cancelBookingBtn">
                    Cancel
                </button>` : ``}
        </div>
    `;

                if (canCancel) {
                    card.querySelector('.cancelBookingBtn')
                        .addEventListener('click', async () => {
                           const isApproved = b.status?.toLowerCase() === "approved";

                           const result = await Swal.fire({
                             title: 'Cancel Booking?',
                             text: isApproved
                             ? 'This booking has already been approved. Are you sure you want to cancel it?'
                             : 'This action cannot be undone.',
                             icon: 'warning',
                             showCancelButton: true,
                             confirmButtonColor: '#d33',
                             confirmButtonText: 'Yes, cancel it!'
                            });

                            if (!result.isConfirmed) return;

                            const res = await fetch(`/api/booking/cancel/${b.bookingReference}`, {
                                method: "POST"
                            });

                            if (res.ok) {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Cancelled',
                                    timer: 1200,
                                    showConfirmButton: false
                                });
                                openUserProfileModal(userId);
                            }
                        });
                }

                list.appendChild(card);
            });
        } catch (err) {
            console.error("Bookings fetch error:", err);
        }
    };

    await loadProfileDropdown();
    if (document.getElementById("venuesGrid")) {
        await loadVenues();
    }

    const clearFavoritesBtn = document.getElementById("clearFavoritesBtn");
    if (clearFavoritesBtn) {
        clearFavoritesBtn.addEventListener("click", async e => {
            e.preventDefault();
            await clearVenueFavorites();
        });
    }

});

async function fetchVenueFavorites() {
    const res = await fetch('/api/favorites/venues', {
        credentials: 'include'
    });

    if (res.status === 401) return null; // not logged in
    if (!res.ok) throw new Error('Failed to fetch');

    return await res.json();
}

async function toggleVenueFavorite({ venueId, facilityId }) {
    const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ venueId, facilityId })
    });

    if (res.status === 401) throw new Error('AUTH');
    if (!res.ok) throw new Error('Toggle failed');
}

async function renderVenueFavorites() {
    // Panel should already be visible BEFORE calling this
    favoritesList.innerHTML = '';
    favoritesEmpty.style.display = 'none';

    const skeletonTpl = document.getElementById('favoriteSkeleton');

    for (let i = 0; i < 4; i++) {
        favoritesList.appendChild(
            skeletonTpl.content.cloneNode(true)
        );
    }

    let list;

    try {
        list = await fetchVenueFavorites();
    } catch (err) {
        console.error(err);

        favoritesList.innerHTML = '';
        favoritesEmpty.textContent = 'Failed to load favorites.';
        favoritesEmpty.style.display = 'block';
        return;
    }

    favoritesList.innerHTML = '';

    //  NOT LOGGED IN
    if (list === null) {
        favoritesEmpty.textContent = 'Please log in to view your favorites.';
        favoritesEmpty.style.display = 'block';
        return;
    }

    //  NO FAVORITES
    if (!Array.isArray(list) || list.length === 0) {
        favoritesEmpty.textContent = "You haven't added any favorites yet.";
        favoritesEmpty.style.display = 'block';
        return;
    }

    list.forEach(fav => {
        const card = document.querySelector(
            `.venue-card[data-venue-id="${fav.venueId}"]`
        );

        const imgSrc =
            card?.querySelector('img')?.src ||
            '/images/placeholder.jpg';

        const thumb = document.createElement('div');
        thumb.className = 'favorites-thumbnail';
        thumb.dataset.venueId = fav.venueId;
        thumb.dataset.facilityId = fav.facilityId;

        thumb.innerHTML = `
            <img src="${imgSrc}" alt="${fav.venueName}">
            <div class="small mt-1">${fav.venueName}</div>
            <i class="bi bi-heart-fill text-danger fav-icon"></i>
        `;

        thumb.querySelector('.fav-icon').addEventListener('click', async e => {
            e.stopPropagation();

            try {
                await toggleVenueFavorite({
                    venueId: fav.venueId,
                    facilityId: fav.facilityId
                });

                await renderVenueFavorites();
                syncVenueCardFavorites();

            } catch (err) {
                console.error(err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Unable to update favorite'
                });
            }
        });

        favoritesList.appendChild(thumb);
    });
}

function setHeartIcon(icon, isFav) {
    if (!icon) return;

    if (isFav) {
        icon.classList.remove('bi-heart');
        icon.classList.add('bi-heart-fill', 'text-danger');
    } else {
        icon.classList.remove('bi-heart-fill', 'text-danger');
        icon.classList.add('bi-heart');
    }
}

function initVenueFavIcons() {
    document.querySelectorAll('.venue-card .fav-icon').forEach(icon => {
        if (icon.dataset.bound) return;
        icon.dataset.bound = "true";

        icon.addEventListener('click', async e => {
            e.stopPropagation();
            e.preventDefault();

            const card = icon.closest('.venue-card');
            if (!card) return;

            const venueId = card.dataset.venueId;
            const facilityId = card.dataset.facilityId;
            const wasFilled = icon.classList.contains('bi-heart-fill');

            try {
                const auth = await checkAuth();
                if (!auth.isAuthenticated) {
                    Swal.fire({
                        html: `
                            <div style="display:flex; flex-direction:column; align-items:center;">
                                <img src="/images/icon/icon.png" style="width:60px; margin-bottom:10px;">
                                <h3>Favorites</h3>
                                <p>Please log in or sign up to save venues</p>
                            </div>
                        `,
                        showCancelButton: true,
                        confirmButtonText: "Log In",
                        cancelButtonText: "Sign Up",
                        reverseButtons: true
                    }).then(result => {
                        if (result.isConfirmed) window.location.href = "/UserLogin";
                        else if (result.dismiss === Swal.DismissReason.cancel) window.location.href = "/UserRegistration";
                    });
                    return;
                }

                // Optimistic UI
                setHeartIcon(icon, !wasFilled);

                // Backend toggle
                await toggleVenueFavorite({ venueId, facilityId });

                // Open panel
                if (favoritesPanel.style.display !== 'block') {
                    favoritesPanel.style.display = 'block';
                    toggleFavoritesBtn.setAttribute('aria-expanded', 'true');
                }

                // Sync panel and cards
                await renderVenueFavorites();
                await syncVenueCardFavorites();

            } catch (err) {
                console.error(err);
                // Rollback UI
                setHeartIcon(icon, wasFilled);

                if (err.message === 'AUTH') {
                    Swal.fire("Please log in to save favorites");
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Cannot update favorite'
                    });
                }
            }
        });
    });
}

async function syncVenueCardFavorites() {
    const list = await fetchVenueFavorites();
    if (!Array.isArray(list)) return;

    const ids = list.map(f => String(f.venueId));

    document.querySelectorAll('.venue-card').forEach(card => {
        const icon = card.querySelector('.fav-icon');
        if (!icon) return;

        const isFav = ids.includes(card.dataset.venueId);
        setHeartIcon(icon, isFav);
    });
}

async function checkVenueAvailabilityRange({
    facilityId,
    venueId,
    checkIn,
    checkOut
}) {
    try {
        const res = await fetch(
            `/api/admin/availability/check-venue` +
            `?facilityId=${facilityId}` +
            `&venueId=${venueId}` +
            `&checkIn=${checkIn}` +
            `&checkOut=${checkOut}`
        );

        if (!res.ok) return false;

        const data = await res.json();
        return data.available === true;
    } catch {
        return false;
    }
}


async function clearVenueFavorites() {
    try {
        const auth = await checkAuth();
        if (!auth.isAuthenticated) {
            Swal.fire({
                icon: 'warning',
                title: 'Not Logged In',
                text: 'Please log in to clear favorites'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Clear All Favorites?',
            text: "This will remove all your favorite venues.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, clear',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            const res = await fetch('/api/favorites/clear/venues', {
                method: 'POST',
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to clear favorites');

            await renderVenueFavorites();
            await syncVenueCardFavorites();

            Swal.fire({
                icon: 'success',
                title: 'Cleared!',
                text: 'All favorites have been removed.'
            });
        }

    } catch (err) {
        console.error(err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Unable to clear favorites'
        });
    }
}

function showFavoritesSkeleton(count = 3) {
    favoritesList.innerHTML = '';
    favoritesEmpty.style.display = 'none';

    const tpl = document.getElementById('favoriteSkeleton');
    for (let i = 0; i < count; i++) {
        favoritesList.appendChild(tpl.content.cloneNode(true));
    }
}

function hideFavoritesSkeleton() {
    favoritesList.innerHTML = '';
}

document.body.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-book-now");
    if (!btn) return;

    e.preventDefault();

    const venueName = btn.dataset.venueName || "this venue";
    const venueId = btn.dataset.venueId;
    const facilityId = btn.dataset.facilityId;

    try {
        const auth = await checkAuth();

        if (auth.isAuthenticated) {

            const modal = btn.closest(".modal");

            const ciInput = modal?.querySelector(".venue-checkin-date");
            const coInput = modal?.querySelector(".venue-checkout-date");

            const formatDate = (date) => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            };

            let checkIn = ciInput?._flatpickr?.selectedDates[0]
                ? formatDate(ciInput._flatpickr.selectedDates[0])
                : "";
            let checkOut = coInput?._flatpickr?.selectedDates[0]
                ? formatDate(coInput._flatpickr.selectedDates[0])
                : "";

            const venuePrice = btn.dataset.price;

            const query = new URLSearchParams({
                facilityId: facilityId,
                venueId: venueId,
                venuePrice: venuePrice
            });

            if (checkIn) query.append("checkIn", checkIn);
            if (checkOut) query.append("checkOut", checkOut);

            window.location.href = `/BookNow?${query.toString()}`;

        } else {
            Swal.fire({
                html: `
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <img src="/images/icon/icon.png" style="width:60px;margin-bottom:10px;">
                        <h3>Book ${venueName}</h3>
                        <p>Please log in or sign up before booking</p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: "Log In",
                cancelButtonText: "Sign Up",
                reverseButtons: true
            }).then(result => {
                if (result.isConfirmed) {
                    window.location.href = "/UserLogin";
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    window.location.href = "/UserRegistration";
                }
            });
        }
    } catch (err) {
        console.error(err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Cannot check login status"
        });
    }
});

toggleFavoritesBtn.addEventListener('click', async () => {
    try {
        const auth = await checkAuth(); // SAME auth check you already use

        if (!auth.isAuthenticated) {
            Swal.fire({
                html: `
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <img src="/images/icon/icon.png" style="width:60px; margin-bottom:10px;">
                        <h3>Favorites</h3>
                        <p>Please log in or sign up to view your favorite venues</p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: "Log In",
                cancelButtonText: "Sign Up",
                reverseButtons: true,
                backdrop: 'rgba(0,0,0,0.75)'
            }).then(result => {
                if (result.isConfirmed) {
                    window.location.href = "/UserLogin";
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    window.location.href = "/UserRegistration";
                }
            });
            return;
        }

        const isOpen = favoritesPanel.style.display === 'block';

        if (isOpen) {
            favoritesPanel.style.display = 'none';
            toggleFavoritesBtn.setAttribute('aria-expanded', 'false');
        } else {
            favoritesPanel.style.display = 'block';
            toggleFavoritesBtn.setAttribute('aria-expanded', 'true');

            showFavoritesSkeleton();

            // fetch + render
            await renderVenueFavorites();

            favoritesPanel.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }

    } catch (err) {
        console.error(err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Unable to check login status'
        });
    }
});

// ===============================
// PROFILE DROPDOWN
// ===============================
const profileDropdown = document.querySelector("#profileDropdown");
const dropdownMenu = profileDropdown?.querySelector("ul");
const profileBtn = profileDropdown?.querySelector("#profileMenuBtn");

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

    profileBtn.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        bsDropdown.toggle();
    });

    document.addEventListener("click", (e) => {
        if (!profileDropdown.contains(e.target)) bsDropdown.hide();
    });
}

async function loadVenues() {
    const grid = document.getElementById("venuesGrid");
    const modals = document.getElementById("venueModalsContainer");

    // ===== Skeleton placeholders =====
    const PLACEHOLDER_COUNT = 6;
    grid.innerHTML = "";
    for (let i = 0; i < PLACEHOLDER_COUNT; i++) {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4";
        col.innerHTML = `
            <div class="venue-card skeleton-card position-relative">
                <div class="skeleton-image shimmer"></div>
                <div class="venue-body p-2">
                    <div class="skeleton-line shimmer mb-2"></div>
                    <div class="skeleton-line shimmer mb-2"></div>
                    <div class="skeleton-line shimmer w-50"></div>
                </div>
            </div>`;
        grid.appendChild(col);
    }

    // ===== Fetch real data =====
    let venues = [];
    try {
        const res = await fetch("/api/customer/venues");
        venues = await res.json();
    } catch (err) {
        console.error("Failed to fetch venues:", err);
        return;
    }

    await new Promise(r => setTimeout(r, 300));

    // ===== Render venues and modals =====
    grid.innerHTML = "";
    modals.innerHTML = "";

    venues.forEach(v => {
        grid.appendChild(createVenueCard(v));
        const modalEl = createVenueModal(v);
        modals.appendChild(modalEl);

        // ✅ Initialize Flatpickr with per-month blocked dates + SignalR support
        initVenueDateInput(modalEl, v.venueId, v.facilityId);
    });

    initVenueSearchAndSort();
    initVenueFavIcons();
    await syncVenueCardFavorites();
}


function initVenueSearchAndSort() {
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const venuesGrid = document.getElementById("venuesGrid");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const q = searchInput.value.toLowerCase().trim();
            document.querySelectorAll(".venue-card").forEach(card => {
                const name = (card.dataset.name || "").toLowerCase();
                const metaEl = card.querySelector(".venue-meta");
                const meta = (metaEl ? metaEl.textContent : "").toLowerCase();

                // include price with comma formatting in search
                const rawPrice = Number(card.dataset.price) || 0;
                const priceFormatted = rawPrice.toLocaleString();
                const priceRaw = rawPrice.toString();

                const match = name.includes(q)
                    || meta.includes(q)
                    || priceFormatted.includes(q)
                    || priceRaw.includes(q);

                const wrapper = card.parentElement;
                if (wrapper) wrapper.style.display = match ? "" : "none";
            });
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            const mode = sortSelect.value;
            const items = [...venuesGrid.children];
            items.sort((A, B) => {
                const a = A.querySelector(".venue-card");
                const b = B.querySelector(".venue-card");
                if (!a || !b) return 0;

                if (mode === "price-asc" || mode === "price-desc") {
                    const pa = Number(a.dataset.price) || 0;
                    const pb = Number(b.dataset.price) || 0;
                    return mode === "price-asc" ? pa - pb : pb - pa;
                }

                if (mode === "capacity-desc" || mode === "capacity-asc") {
                    const ca = Number(a.dataset.capacityMax) || 0;
                    const cb = Number(b.dataset.capacityMax) || 0;
                    return mode === "capacity-desc" ? cb - ca : ca - cb;
                }

                return 0;
            });

            items.forEach(i => venuesGrid.appendChild(i));
        });
    }
}

// VENUE FLATPICKR — per-month blocked dates

async function fetchMonthBlockedDatesVenue(venueId, facilityId, year, month) {
    const key = `venue_${venueId}_${year}_${month}`;
    if (_blockedDatesCache[key]) return _blockedDatesCache[key];

    try {
        const res = await fetch(
            `/api/customer/availability/month?facilityId=${facilityId}&year=${year}&month=${month}&venueId=${venueId}`
        );
        if (!res.ok) return [];
        const data = await res.json();
        const blocked = [];
        if (data?.days) {
            data.days.forEach(day => {
                if (day.isBlocked) blocked.push(day.date.split('T')[0]);
            });
        }
        _blockedDatesCache[key] = blocked;
        return blocked;
    } catch (err) {
        console.error('Failed to fetch venue blocked dates', err);
        return [];
    }
}

function invalidateVenueCache(venueId) {
    Object.keys(_blockedDatesCache).forEach(key => {
        if (key.startsWith(`venue_${venueId}_`)) delete _blockedDatesCache[key];
    });
}

function initVenueDateInput(modalEl, venueId, facilityId) {
    const ciInput = modalEl.querySelector(".venue-checkin-date");
    const coInput = modalEl.querySelector(".venue-checkout-date");
    if (!ciInput || !coInput) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    let fpCheckin, fpCheckout;

    const hideAdjacentDays = (fp) => {
        fp.calendarContainer.querySelectorAll('.flatpickr-day.prevMonthDay, .flatpickr-day.nextMonthDay')
            .forEach(el => el.style.visibility = 'hidden');
    };

    const initialYear = now.getFullYear();
    const initialMonth = now.getMonth() + 1;

    fetchMonthBlockedDatesVenue(venueId, facilityId, initialYear, initialMonth).then(initialBlocked => {
        const blockedSet = new Set(initialBlocked);

        ciInput._blockedSet = blockedSet;
        coInput._blockedSet = blockedSet;
        ciInput._venueId = venueId;
        coInput._venueId = venueId;

        async function loadMonthIntoSet(year, month) {
            const dates = await fetchMonthBlockedDatesVenue(venueId, facilityId, year, month);
            let added = false;
            dates.forEach(d => { if (!blockedSet.has(d)) { blockedSet.add(d); added = true; } });
            return added;
        }

        const onMonthChange = async function(selectedDates, dateStr, fp) {
            hideAdjacentDays(fp);
            const year = fp.currentYear;
            const month = fp.currentMonth + 1;
            const added = await loadMonthIntoSet(year, month);
            if (added) {
                fp.redraw();
                hideAdjacentDays(fp);
            }
        };

        const commonConfig = {
            disableMobile: true,
            dateFormat: "Y-m-d",
            minDate: todayStr,
            showMonths: 1,
            nextArrow: '<i class="bi bi-chevron-right"></i>',
            prevArrow: '<i class="bi bi-chevron-left"></i>',
            disable: [
                function(date) {
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                if (date < today) return true;
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                return blockedSet.has(dateStr);
          }
            ],
            locale: { firstDayOfWeek: 0 },
            onReady: function(selectedDates, dateStr, fp) {
                fp.calendarContainer.style.zIndex = "99999";
                hideAdjacentDays(fp);
                const yearInput = fp.calendarContainer.querySelector('.numInput.cur-year');
                if (yearInput) yearInput.style.color = 'black';
            },
            onOpen: function(selectedDates, dateStr, fp) {
                fp.calendarContainer.style.zIndex = "99999";
                if (fp.calendarContainer.parentNode !== document.body) {
                    document.body.appendChild(fp.calendarContainer);
                }
                hideAdjacentDays(fp);
                const yearInput = fp.calendarContainer.querySelector('.numInput.cur-year');
                if (yearInput) yearInput.style.color = 'black';
            },
            onMonthChange: onMonthChange,
            onYearChange: onMonthChange,
            onDayCreate: function(dObj, dStr, fp, dayElem) {
                const d = dayElem.dateObj;
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (blockedSet.has(dateStr)) {
                    dayElem.classList.add("booked-date");
                    dayElem.title = "Already booked";
                }
            }
        };

        fpCheckin = flatpickr(ciInput, {
            ...commonConfig,
            placeholder: "Check-in date",
            defaultDate: null,
            onChange: function(selectedDates) {
                if (!selectedDates[0]) return;
                const nextDay = new Date(
                    selectedDates[0].getFullYear(),
                    selectedDates[0].getMonth(),
                    selectedDates[0].getDate() + 1
                );
                fpCheckout.set('minDate', nextDay);
                if (fpCheckout.selectedDates[0] && fpCheckout.selectedDates[0] <= selectedDates[0]) {
                    fpCheckout.clear();
                }
            }
        });

        fpCheckout = flatpickr(coInput, {
            ...commonConfig,
            placeholder: "Check-out date",
            defaultDate: null,
            minDate: tomorrowDate
        });

        // ✅ Force redraw so initial blocked dates render immediately
        fpCheckin.redraw();
        fpCheckout.redraw();
    });
}

/* ======================= CAROUSEL ======================= */
document.addEventListener("shown.bs.modal", function (e) {
    const modal = e.target;
    const carouselEl = modal.querySelector(".carousel");
    if (!carouselEl) return;

    let carousel = bootstrap.Carousel.getInstance(carouselEl);
    if (!carousel) {
        carousel = new bootstrap.Carousel(carouselEl, { interval: 3500, pause: false, wrap: true });
    }
    carousel.to(0);
    carousel.cycle();
});


/* ======================= CARD & MODAL TEMPLATES ======================= */
function createVenueCard(v) {
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";
    let img = "/images/placeholder.jpg";
    if (v.images && v.images.length > 0 && v.images[0].imagePath) {
        img = v.images[0].imagePath;
    }

    col.innerHTML = `
    <div class="venue-card position-relative"
        data-venue-id="${v.venueId}"
        data-name="${v.venueName}"
        data-facility-id="${v.facilityId}"
        data-price="${v.venuePrice}"
        data-capacity-max="${v.capacityMax}"
        tabindex="0">
        <div class="fav-icon bi bi-heart" role="button" aria-label="favorite"></div>
        <img src="${img}" class="venue-image" alt="${v.venueName}">
        <div class="venue-body p-2">
            <div class="venue-title">${v.venueName}</div>
            <div class="venue-meta">
                ${v.capacityMin} - ${v.capacityMax} pax · ${v.meta} · ${v.feature1} · ${v.feature2}
            </div>
            <div class="venue-footer">
                <div class="venue-price">₱${Number(v.venuePrice).toLocaleString()}</div>
                <button class="btn btn-venue btn-sm"
                    data-bs-toggle="modal"
                    data-bs-target="#venueModal-${v.venueId}">
                    View
                </button>
            </div>
        </div>
    </div>`;
    return col;
}

function createVenueModal(v) {
    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = `venueModal-${v.venueId}`;
    modal.tabIndex = -1;
    modal.dataset.facility = v.facilityId;

    const hasMultiple = (v.images || []).length > 1;

    modal.innerHTML = `
    <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title">${v.venueName} — ₱${Number(v.venuePrice).toLocaleString()}</h5>
                <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="row gx-0">
                    <div class="col-md-7">
                        <div id="carousel-${v.venueId}" class="carousel slide" data-bs-ride="carousel" data-bs-interval="3000">
                            <div class="carousel-inner">
                                ${(v.images || []).map((img, i) => `
                                    <div class="carousel-item ${i === 0 ? "active" : ""}">
                                       <img src="${img.imagePath}" class="d-block w-100 venue-modal-img">
                                    </div>
                                `).join("")}
                            </div>
                            ${hasMultiple ? `
                            <button class="carousel-control-prev" type="button"
                                data-bs-target="#carousel-${v.venueId}" data-bs-slide="prev">
                                <span class="carousel-control-prev-icon"></span>
                            </button>
                            <button class="carousel-control-next" type="button"
                                data-bs-target="#carousel-${v.venueId}" data-bs-slide="next">
                                <span class="carousel-control-next-icon"></span>
                            </button>` : ''}
                        </div>
                    </div>
                    <div class="col-md-5 p-3">
                        <div class="modal-venue-title">${v.venueName}</div>
                        <p class="text-muted mt-2">${v.description || "Perfect venue for events and celebrations."}</p>
                        <div class="mb-2">
                            ${v.meta ? `<span class="chip">${v.meta}</span>` : ""}
                            ${v.feature1 ? `<span class="chip">${v.feature1}</span>` : ""}
                            ${v.feature2 ? `<span class="chip">${v.feature2}</span>` : ""}
                        </div>
                        <p class="text-muted small">
                            Capacity: ${v.capacityMin} - ${v.capacityMax} pax<br>
                            Price: ₱${Number(v.venuePrice).toLocaleString()}
                        </p>
                        <div class="mt-3">
                            <div class="fp-input-wrapper mb-2">
                                <i class="bi bi-calendar-event fp-icon"></i>
                                <input type="text" class="flatpickr-input venue-checkin-date" placeholder="Check-in date" readonly>
                            </div>
                            <div class="fp-input-wrapper mb-2">
                                <i class="bi bi-calendar-check fp-icon"></i>
                                <input type="text" class="flatpickr-input venue-checkout-date" placeholder="Check-out date" readonly>
                            </div>
                            <div class="date-legend mb-2">
                                <div class="date-legend-item">
                                    <div class="legend-dot selected"></div>
                                    <span>Selected</span>
                                </div>
                                <div class="date-legend-item">
                                    <div class="legend-dot available"></div>
                                    <span>Available</span>
                                </div>
                                <div class="date-legend-item">
                                    <div class="legend-dot booked"></div>
                                    <span>Booked</span>
                                </div>
                            </div>
                            <button class="btn btn-venue w-100 mb-2 btn-book-now"
                                data-venue-id="${v.venueId}"
                                data-venue-name="${v.venueName}"
                                data-facility-id="${v.facilityId}"
                                data-price="${v.venuePrice}">
                                Book Now
                            </button>
                            <button class="btn btn-outline-secondary mt-2 w-100" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    return modal;
}

const venueBookingConnection = new signalR.HubConnectionBuilder()
    .withUrl("/bookingHub")
    .withAutomaticReconnect()
    .build();

venueBookingConnection.on("DatesBlocked", (data) => {
    const venueId = data.venueId;
    if (!venueId) return;
    data.dates.forEach(dateStr => {
        const [year, month] = dateStr.split('-').map(Number);
        const key = `venue_${venueId}_${year}_${month}`;
        if (_blockedDatesCache[key] && !_blockedDatesCache[key].includes(dateStr)) {
            _blockedDatesCache[key].push(dateStr);
        }
    });
    redrawVenuePickersForVenue(venueId);
});

venueBookingConnection.on("DatesUnblocked", (data) => {
    const venueId = data.venueId;
    if (!venueId) return;
    data.dates.forEach(dateStr => {
        const [year, month] = dateStr.split('-').map(Number);
        const key = `venue_${venueId}_${year}_${month}`;
        if (_blockedDatesCache[key]) {
            _blockedDatesCache[key] = _blockedDatesCache[key].filter(d => d !== dateStr);
        }
    });
    redrawVenuePickersForVenue(venueId);
});

function redrawVenuePickersForVenue(venueId) {
    ['.venue-checkin-date', '.venue-checkout-date'].forEach(sel => {
        document.querySelectorAll(sel).forEach(input => {
            if (String(input._venueId) !== String(venueId)) return;
            if (!input._flatpickr) return;
            if (input._blockedSet) {
                input._blockedSet.clear();
                Object.keys(_blockedDatesCache).forEach(key => {
                    if (key.startsWith(`venue_${venueId}_`)) {
                        _blockedDatesCache[key].forEach(d => input._blockedSet.add(d));
                    }
                });
            }
            input._flatpickr.redraw();
        });
    });
}

venueBookingConnection.start().catch(err => console.error('SignalR venue connection error:', err));
