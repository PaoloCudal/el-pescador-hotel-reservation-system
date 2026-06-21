let AUTO_OPEN_DONE = false;
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

async function fetchFavorites(type = 'Room') {
    const url = type === 'Room' ? '/api/favorites/rooms' : '/api/favorites/venues';
    try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

async function toggleFavorite({ roomTypeId, facilityId }) {
    const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            RoomTypeId: roomTypeId,
            FacilityId: facilityId
        })
    });

    if (!res.ok) {
        throw new Error('Toggle favorite failed');
    }
}

function setHeartIcon(icon, isFav) {
    if (isFav) {
        icon.classList.remove('bi-heart');
        icon.classList.add('bi-heart-fill', 'text-danger');
    } else {
        icon.classList.remove('bi-heart-fill', 'text-danger');
        icon.classList.add('bi-heart');
    }
}

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

// ✅ FIX 2: Moved OUTSIDE DOMContentLoaded so inline onclick handlers work immediately
function updateSortOptions(view) {
    const sortSelect = document.getElementById('sort');
    sortSelect.value = 'default';

    if (view === 'building') {
        sortSelect.innerHTML = `
            <option value="default">Sort: Default</option>
            <option value="rooms-desc">Most Rooms</option>
            <option value="rooms-asc">Least Rooms</option>
            <option value="name-asc">Name: A → Z</option>
            <option value="name-desc">Name: Z → A</option>
        `;
    } else {
        sortSelect.innerHTML = `
            <option value="default">Sort: Default</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="name-asc">Name: A → Z</option>
            <option value="name-desc">Name: Z → A</option>
        `;
    }
}

window.showRooms = function (building) {
    const buildingSelect = document.getElementById('buildingSelect');
    const seasideSection = document.getElementById('seaside');
    const twinSection = document.getElementById('twin');

    buildingSelect.style.display = "none";
    seasideSection.style.display = building === "seaside" ? "block" : "none";
    twinSection.style.display = building === "twin" ? "block" : "none";
    updateSortOptions('room');
    window.scrollTo({ top: 0, behavior: "smooth" });
};

window.backToBuildings = function () {
    const buildingSelect = document.getElementById('buildingSelect');
    const seasideSection = document.getElementById('seaside');
    const twinSection = document.getElementById('twin');

    seasideSection.style.display = twinSection.style.display = "none";
    buildingSelect.style.display = "block";
    updateSortOptions('building');
    window.scrollTo({ top: 0, behavior: "smooth" });
};

// FAVORITES PANEL
async function renderFavoritesPanel(type = 'Room') {
    favoritesEmpty.style.display = 'none';
    favoritesList.innerHTML = '';
    favoritesPanel.style.display = 'block';
    const skeletonTemplate = document.getElementById('favoriteSkeleton');
    const skeletonCount = 3;
    for (let i = 0; i < skeletonCount; i++) {
        const skeleton = skeletonTemplate.content.cloneNode(true);
        favoritesList.appendChild(skeleton);
    }

    let list = [];
    try {
        list = await fetchFavorites(type);
    } catch (err) {
        console.error('Failed to fetch favorites', err);
        list = [];
    }

    favoritesList.innerHTML = '';

    if (!list.length) {
        favoritesEmpty.style.display = 'block';
        return;
    }

    list.forEach(fav => {
        const card = document.querySelector(`.room-card[data-room-type-id="${fav.roomTypeId}"]`);
        if (!card) return;

        const img = card.querySelector('img');
        const thumb = document.createElement('div');
        thumb.className = 'favorites-thumbnail';

        thumb.dataset.roomTypeId = fav.roomTypeId;
        thumb.dataset.facilityId = fav.facilityId;

        thumb.innerHTML = `
            <img src="${img ? img.src : '/images/placeholder.jpg'}" alt="">
            <div class="small mt-1">${card.dataset.name || fav.roomTypeName || fav.venueName}</div>
            <i class="fav-icon bi bi-heart-fill text-danger favorite-toggle"
               role="button" style="cursor:pointer"></i>
        `;

        const favIcon = thumb.querySelector('.fav-icon');
        favIcon.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const roomTypeId = thumb.dataset.roomTypeId;
                const facilityId = thumb.dataset.facilityId;

                await toggleFavorite({ roomTypeId, facilityId });
                await renderFavoritesPanel(type);
                await syncRoomCardFavorites();
            } catch (err) {
                console.error(err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to update favorite'
                });
            }
        });

        thumb.addEventListener('click', () => {
            const modalId = card.dataset.modal;
            const modalEl = document.getElementById(modalId);
            if (modalEl) new bootstrap.Modal(modalEl).show();
        });

        favoritesList.appendChild(thumb);
    });
}

const favoritesPanel = document.getElementById("favoritesPanel");
const favoritesEmpty = document.getElementById("favoritesEmpty");
const favoritesList = document.getElementById("favoritesList");
const toggleFavoritesBtn = document.getElementById("toggleFavoritesBtn");

document.addEventListener("DOMContentLoaded", () => {

    const buildingSelect = document.getElementById("buildingSelect");
    const seasideSection = document.getElementById("seaside");
    const twinSection = document.getElementById("twin");
    const seasideGrid = seasideSection.querySelector(".rooms-grid");
    const twinGrid = twinSection.querySelector(".rooms-grid");
    const clearFavoritesBtn = document.getElementById('clearFavoritesBtn');
    const modalElement = document.getElementById('userProfileModal');
    const profileModal = new bootstrap.Modal(modalElement);

    window.openUserProfileModal = function (userId) {
        profileModal.show();

        // USER INFO
        fetch(`/api/booking/my-account/${userId}`)
            .then(res => res.json())
            .then(data => {
                document.getElementById('profileFullName').textContent = data.fullName;
                document.getElementById('profileEmail').textContent = data.email;
                document.getElementById('profileJoinDate').textContent =
                    new Date(data.joinDate).toLocaleDateString();
                document.getElementById('profileFavoriteRooms').textContent = `Favorite Rooms: ${data.favoriteRoomsCount}`;
                document.getElementById('profileFavoriteVenues').textContent = `Favorite Venues: ${data.favoriteVenuesCount}`;
            });

        // ACTIVE BOOKINGS
        fetch(`/api/booking/active/${userId}`)
            .then(res => res.json())
            .then(bookings => {
                const list = document.getElementById('activeBookingsList');
                list.innerHTML = '';

                if (!bookings.length) {
                    list.innerHTML = `<div class="text-muted text-center py-4">No active bookings</div>`;
                    return;
                }

                bookings.forEach(b => {
                    const card = document.createElement('div');
                    card.className = "card border-0 shadow-sm mb-2";

                    const statusBadge = getStatusBadge(b.status);
                    const canCancel = b.status.toLowerCase() === "pending" || b.status.toLowerCase() === "approved";

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
                                const isApproved = b.status.toLowerCase() === "approved";

                                const result = await Swal.fire({
                                    title: 'Cancel Booking?',
                                    text: isApproved
                                        ? 'This booking has already been approved. Are you sure you want to cancel it?'
                                        : 'Are you sure you want to cancel this booking?',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonText: 'Yes, cancel it!',
                                    cancelButtonText: 'No',
                                    reverseButtons: true
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
            });
    };

    // TOGGLE FAVORITES PANE
    toggleFavoritesBtn.addEventListener('click', async () => {
        try {
            const auth = await checkAuth();

            if (!auth.isAuthenticated) {
                Swal.fire({
                    html: `
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            <img src="/images/icon/icon.png" style="width:60px; margin-bottom:10px;">
                            <h3>Favorites</h3>
                            <p>Please log in or sign up to view your favorites</p>
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

                return;
            }

            const isOpen = favoritesPanel.style.display === 'block';
            if (isOpen) {
                favoritesPanel.style.display = 'none';
                toggleFavoritesBtn.setAttribute('aria-expanded', 'false');
            } else {
                favoritesPanel.style.display = 'block';
                await renderFavoritesPanel('Room');
                toggleFavoritesBtn.setAttribute('aria-expanded', 'true');
                favoritesPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Cannot check login status'
            });
        }
    });

    // hide sections initially
    seasideSection.style.display = "none";
    twinSection.style.display = "none";

    // PROFILE DROPDOWN
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

    clearFavoritesBtn?.addEventListener('click', async () => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This will remove all your favorite rooms!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, clear all',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch('/api/favorites/clear/rooms', {
                    method: 'POST',
                    credentials: 'include'
                });

                if (!res.ok) throw new Error();

                await renderFavoritesPanel('Room');
                await syncRoomCardFavorites();

                Swal.fire({
                    icon: 'success',
                    title: 'Cleared!',
                    text: 'All your favorite rooms have been removed.'
                });

            } catch {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to clear favorites'
                });
            }
        }
    });

    async function syncRoomCardFavorites() {
        const favs = await fetchFavorites('Room');
        const favIds = favs.map(f => String(f.roomTypeId));

        document.querySelectorAll('.room-card').forEach(card => {
            const icon = card.querySelector('.fav-icon');
            if (!icon) return;

            const id = card.dataset.roomTypeId;

            if (favIds.includes(id)) {
                icon.classList.remove('bi-heart');
                icon.classList.add('bi-heart-fill', 'text-danger');
            } else {
                icon.classList.remove('bi-heart-fill', 'text-danger');
                icon.classList.add('bi-heart');
            }
        });
    }

    function initProfileDropdown() {
        if (!profileBtn) return;

        const bsDropdown = bootstrap.Dropdown.getOrCreateInstance(profileBtn, {
            autoClose: true
        });

        if (!profileBtn.dataset.bound) {
            profileBtn.dataset.bound = "true";

            profileBtn.addEventListener("click", e => {
                e.preventDefault();
                e.stopPropagation();
                bsDropdown.toggle();
            });
        }
    }

    loadProfileDropdown();

    fetch("/api/customer/rooms")
        .then(res => res.json())
        .then(data => {
            renderRooms(data);
        })
        .catch(err => console.error("Facility fetch error:", err));

    function initFavIcons() {
        document.querySelectorAll('.room-card .fav-icon').forEach(icon => {
            icon.addEventListener('click', async (e) => {
                e.stopPropagation();

                const card = icon.closest('.room-card');
                const roomTypeId = card.dataset.roomTypeId;
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
                                    <p>Please log in or sign up to view your favorites</p>
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

                        return;
                    }

                    setHeartIcon(icon, !wasFilled);

                    await toggleFavorite({ roomTypeId, facilityId });

                    await renderFavoritesPanel('Room');

                } catch (err) {
                    console.error(err);

                    setHeartIcon(icon, wasFilled);

                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Cannot update favorite'
                    });
                }
            });
        });
    }

    // RENDER ROOMS
    function renderRooms(facilities) {
        seasideGrid.innerHTML = "";
        twinGrid.innerHTML = "";

        facilities.forEach((f, index) => {
            const modalId = `modal-${f.roomTypeId}`;
            const carouselId = `carousel-${f.roomTypeId}`;
            const availabilityId = `availability-${f.roomTypeId}`;

            const firstImage =
                f.images && f.images.length > 0
                    ? f.images[0].imagePath
                    : "/images/placeholder.jpg";

            const roomCard = document.createElement("div");
            roomCard.className = "room-card";
            roomCard.dataset.modal = modalId;
            roomCard.dataset.roomTypeId = f.roomTypeId;
            roomCard.dataset.name = f.name;
            roomCard.dataset.price = f.price;
            roomCard.dataset.facilityId = f.facilityId;

            roomCard.innerHTML = `
                <img src="${firstImage}" alt="${f.name}">
                <i class="bi bi-heart fav-icon"></i>
                <h5>${f.name}</h5>
                <p class="price">₱ ${Number(f.price).toLocaleString()} / night</p>
                <div class="px-3 pb-3">
                    <button class="btn btn-outline-secondary w-100 view-details"
                        data-bs-toggle="modal"
                        data-bs-target="#${modalId}">
                        View Details
                    </button>
                </div>
            `;

            if (f.buildingName === "Twin Building") twinGrid.appendChild(roomCard);
            if (f.buildingName === "Seaside Grand") seasideGrid.appendChild(roomCard);

            createModal(f, modalId, carouselId, availabilityId);
            setupModal(f, modalId, carouselId, availabilityId);
        });

        initFavIcons();
        setupCardClick();
        syncRoomCardFavorites();
        autoOpenRoomByType();

        const seasideCount = seasideGrid.querySelectorAll('.room-card').length;
        const twinCount = twinGrid.querySelectorAll('.room-card').length;

        const seasideCard = document.querySelector('.building-card[data-name="Seaside Grand"]');
        const twinCard = document.querySelector('.building-card[data-name="Twin Building"]');

        if (seasideCard) seasideCard.dataset.roomCount = seasideCount;
        if (twinCard) twinCard.dataset.roomCount = twinCount;
    }

    async function fetchMonthBlockedDates(roomTypeId, facilityId, year, month) {
    const key = `room_${roomTypeId}_${year}_${month}`;
    if (_blockedDatesCache[key]) return _blockedDatesCache[key];

    try {
        const res = await fetch(
            `/api/customer/availability/month?facilityId=${facilityId}&year=${year}&month=${month}&roomTypeId=${roomTypeId}`
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
        console.error('Failed to fetch blocked dates', err);
        return [];
    }
   }

   function invalidateRoomCache(roomTypeId) {
    Object.keys(_blockedDatesCache).forEach(key => {
        if (key.startsWith(`room_${roomTypeId}_`)) delete _blockedDatesCache[key];
    });
}


    // FLATPICKR — initialize date pickers inside a modal scope
    function initDateInputs(scope = document) {
    const ciInput = scope.querySelector(".checkin-date");
    const coInput = scope.querySelector(".checkout-date");
    if (!ciInput || !coInput) return;

    const bookBtn = scope.querySelector(".book-now");
    const roomTypeId = bookBtn?.dataset.roomTypeId;
    const facilityId = bookBtn?.dataset.facilityId;

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

    fetchMonthBlockedDates(roomTypeId, facilityId, initialYear, initialMonth).then(initialBlocked => {

        const blockedSet = new Set(initialBlocked);

        // ✅ Expose to SignalR so real-time updates can sync the live picker
        ciInput._blockedSet = blockedSet;
        coInput._blockedSet = blockedSet;

        async function loadMonthIntoSet(year, month) {
            const dates = await fetchMonthBlockedDates(roomTypeId, facilityId, year, month);
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
                    return date < today;
                }
            ],
            locale: { firstDayOfWeek: 0 },
            onReady: function(selectedDates, dateStr, fp) {
                fp.calendarContainer.style.zIndex = "99999";
                hideAdjacentDays(fp);
                const yearInput = fp.calendarContainer.querySelector('.numInput.cur-year');
                if (yearInput) yearInput.style.color = 'white';
            },
            onOpen: function(selectedDates, dateStr, fp) {
                fp.calendarContainer.style.zIndex = "99999";
                if (fp.calendarContainer.parentNode !== document.body) {
                    document.body.appendChild(fp.calendarContainer);
                }
                hideAdjacentDays(fp);
                const yearInput = fp.calendarContainer.querySelector('.numInput.cur-year');
                if (yearInput) yearInput.style.color = 'white';
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
    });
}

    // CREATE MODAL
    function createModal(f, modalId, carouselId, availabilityId) {
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
                        <div class="row gx-0">
                            <div class="col-md-7 pe-md-3">
                                <div id="${carouselId}" class="carousel slide" data-bs-ride="carousel" data-bs-interval="3000">
                                    <div class="carousel-inner modal-gallery"></div>
                                    <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                                        <span class="carousel-control-prev-icon"></span>
                                    </button>
                                    <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                                        <span class="carousel-control-next-icon"></span>
                                    </button>
                                    <div class="d-flex mt-2 modal-thumbs"></div>
                                </div>
                            </div>
                            <div class="col-md-5">
                                <div class="p-3">
                                    <h4 class="room-name"></h4>
                                    <p class="text-muted room-desc"></p>
                                    <button class="btn btn-availability-toggle btn-outline-secondary w-100" type="button" data-bs-toggle="collapse" data-bs-target="#${availabilityId}">
                                        <i class="bi bi-chevron-down rotate-icon me-2"></i>
                                        Check Room Availability
                                    </button>
                                    <div class="collapse mt-3 availability-collapse" id="${availabilityId}">
                                        <div class="p-3 rounded" style="background:#f9f7f2; border: 1px solid #e8e0cc;">
                                            <div class="fp-input-wrapper">
                                                <i class="bi bi-calendar-event fp-icon"></i>
                                                <input type="text" class="flatpickr-input checkin-date" placeholder="Check-in date" readonly>
                                            </div>
                                            <div class="fp-input-wrapper">
                                                <i class="bi bi-calendar-check fp-icon"></i>
                                                <input type="text" class="flatpickr-input checkout-date" placeholder="Check-out date" readonly>
                                            </div>
                                            <div class="date-legend">
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
                                        </div>
                                    </div>
                                    <div class="mt-4 d-flex gap-2">
                                        <a class="btn btn-gold flex-grow-1 book-now"
                                           data-room="${f.name}"
                                           data-facility-id="${f.facilityId}"
                                           data-room-type-id="${f.roomTypeId}"
                                           data-price="${f.price}">Book Now</a>
                                        <button class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="border-top:none;"></div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML("beforeend", modalHTML);
        const modalEl = document.getElementById(modalId);

        const collapseEl = modalEl.querySelector(`#${availabilityId}`);
        let datePickersInitialized = false;

        collapseEl.addEventListener('shown.bs.collapse', function () {
            if (!datePickersInitialized) {
                datePickersInitialized = true;
                initDateInputs(modalEl);
            }
        });
    }

    // SETUP MODAL (images, carousel, title)
    function setupModal(f, modalId, carouselId, availabilityId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.querySelector(".modal-title").textContent = `${f.name} — ₱${Number(f.price).toLocaleString()}`;
        modal.querySelector(".room-name").textContent = f.name;
        modal.querySelector(".room-desc").textContent = f.description || "";

        const carouselInner = modal.querySelector(".carousel-inner");
        const thumbs = modal.querySelector(".modal-thumbs");

        carouselInner.innerHTML = "";
        thumbs.innerHTML = "";

        f.images.forEach((img, i) => {
            carouselInner.insertAdjacentHTML(
                "beforeend",
                `<div class="carousel-item ${i === 0 ? "active" : ""}">
                    <img src="${img.imagePath}" class="d-block w-100" style="height:400px; object-fit:cover;">
                </div>`
            );

            thumbs.insertAdjacentHTML(
                "beforeend",
                `<img class="modal-thumb" src="${img.imagePath}" data-bs-target="#${carouselId}" data-bs-slide-to="${i}" style="width:60px; cursor:pointer; margin-right:5px;">`
            );
        });

        const hasMultiple = f.images.length > 1;
        const prevBtn = modal.querySelector(".carousel-control-prev");
        const nextBtn = modal.querySelector(".carousel-control-next");
        if (prevBtn) prevBtn.style.display = hasMultiple ? "" : "none";
        if (nextBtn) nextBtn.style.display = hasMultiple ? "" : "none";
        if (thumbs) thumbs.style.display = hasMultiple ? "" : "none";
    }

    // BOOK NOW click handler
    document.body.addEventListener("click", async function (e) {

        if (e.target && e.target.classList.contains("book-now")) {

            e.preventDefault();

            const roomName = e.target.dataset.room || "this room";
            const facilityId = e.target.dataset.facilityId;
            const roomTypeId = e.target.dataset.roomTypeId;
            const roomPrice = e.target.dataset.price;

            const modal = e.target.closest(".modal");

            const checkIn = modal.querySelector(".checkin-date")?.value;
            const checkOut = modal.querySelector(".checkout-date")?.value;

            if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
                Swal.fire({
                    icon: "warning",
                    title: "Invalid Dates",
                    text: "Check-out must be after check-in."
                });
                return;
            }

            try {
                const auth = await checkAuth();

                if (auth.isAuthenticated) {
                    window.location.href =
                        `/BookNow?facilityId=${facilityId}` +
                        `&roomTypeId=${roomTypeId}` +
                        `&roomPrice=${roomPrice}` +
                        (checkIn ? `&checkIn=${encodeURIComponent(checkIn)}` : '') +
                        (checkOut ? `&checkOut=${encodeURIComponent(checkOut)}` : '');
                } else {
                    Swal.fire({
                        html: `
                            <div style="display:flex; flex-direction:column; align-items:center;">
                                <img src="/images/icon/icon.png" style="width:60px; margin-bottom:10px;">
                                <h3>Book ${roomName}</h3>
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
        }
    });

    function setupCardClick() {
        document.querySelectorAll(".room-card").forEach(card => {
            card.addEventListener("click", e => {
                if (e.target.closest("button") || e.target.closest(".fav-icon")) return;
                const modalId = card.dataset.modal;
                const modalEl = document.getElementById(modalId);
                if (modalEl) new bootstrap.Modal(modalEl).show();
            });
        });
    }

    function filterAndSort() {
        const searchInput = document.getElementById('search');
        const sortSelect = document.getElementById('sort');
        const q = (searchInput.value || '').trim().toLowerCase();
        const mode = sortSelect.value;

        const buildingSelect = document.getElementById('buildingSelect');
        if (buildingSelect && buildingSelect.offsetParent !== null) {
            const grid = buildingSelect.querySelector('.building-grid');
            const cards = Array.from(grid.querySelectorAll('.building-card'));

            cards.forEach(card => {
                const name = (card.dataset.name || '').toLowerCase();
                card.style.display = (!q || name.includes(q)) ? '' : 'none';
            });

            const visible = cards.filter(c => c.style.display !== 'none');
            visible.sort((a, b) => {
                if (mode === 'name-asc') return (a.dataset.name || '').localeCompare(b.dataset.name || '');
                if (mode === 'name-desc') return (b.dataset.name || '').localeCompare(a.dataset.name || '');
                if (mode === 'rooms-desc') {
                    const countA = parseInt(a.dataset.roomCount || 0, 10);
                    const countB = parseInt(b.dataset.roomCount || 0, 10);
                    return countB - countA;
                }
                if (mode === 'rooms-asc') {
                    const countA = parseInt(a.dataset.roomCount || 0, 10);
                    const countB = parseInt(b.dataset.roomCount || 0, 10);
                    return countA - countB;
                }
                return 0;
            });
            visible.forEach(c => grid.appendChild(c));

            return;
        }

        document.querySelectorAll('.rooms-section').forEach(section => {
            let visibleCount = 0;
            section.querySelectorAll('.room-card').forEach(c => {
                const name = (c.dataset.name || '').toLowerCase();
                const room = (c.dataset.roomTypeId || '').toLowerCase();
                const building = section.id;
                const price = (c.dataset.price || '').toString();
                const ok = name.includes(q) || room.includes(q) || building.includes(q) || price.includes(q);
                c.style.display = ok ? "block" : "none";
                if (ok) visibleCount++;
            });

            let noResults = section.querySelector('.no-results');
            if (!noResults) {
                noResults = document.createElement('p');
                noResults.className = 'no-results text-center text-muted mt-3';
                section.appendChild(noResults);
            }
            noResults.style.display = visibleCount === 0 && q.length > 0 ? "block" : "none";
            if (visibleCount === 0) noResults.textContent = `No rooms found matching "${q}"`;

            const container = section.querySelector('.rooms-grid');
            const cards = Array.from(container.querySelectorAll('.room-card')).filter(c => c.style.display !== 'none');
            cards.sort((a, b) => {
                if (mode === 'price-asc' || mode === 'price-desc') {
                    const pa = parseInt(a.dataset.price || 0, 10);
                    const pb = parseInt(b.dataset.price || 0, 10);
                    return mode === 'price-asc' ? pa - pb : pb - pa;
                } else if (mode === 'name-asc') {
                    return (a.dataset.name || '').localeCompare(b.dataset.name || '');
                } else if (mode === 'name-desc') {
                    return (b.dataset.name || '').localeCompare(a.dataset.name || '');
                }
                return 0;
            });
            cards.forEach(c => container.appendChild(c));
        });
    }

    const OPENWEATHERMAP_API_KEY = 'YOUR_OPENWEATHER_API_KEY';
    async function renderWeather() {
        const el = document.getElementById('weatherContent');
        if (!el) return;
        try {
            const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Bolinao&units=metric&appid=${OPENWEATHERMAP_API_KEY}`);
            const data = await res.json();
            const icon = `https://openweathermap.org/img/wn/${data.weather[0].icon}.png`;
            el.innerHTML = `<strong>${data.name}</strong> <img src="${icon}" width="30"> ${Math.round(data.main.temp)}°C`;
        } catch {
            el.textContent = 'Weather unavailable';
        }
    }

    document.addEventListener('hidden.bs.modal', () => {
        document.body.style.overflow = '';
    });

    document.addEventListener('shown.bs.modal', function (e) {
        document.body.style.overflow = 'hidden';
        const modal = e.target;
        const carouselEl = modal.querySelector('.carousel');
        if (!carouselEl) return;
        let carousel = bootstrap.Carousel.getInstance(carouselEl) || new bootstrap.Carousel(carouselEl, { interval: 3500 });
        carousel.to(0);
        carousel.cycle();
    });

    function autoOpenRoomByType() {
        if (AUTO_OPEN_DONE) return;
        const params = new URLSearchParams(window.location.search);
        const roomTypeId = params.get("roomTypeId");
        if (!roomTypeId) return;
        const card = document.querySelector(`.room-card[data-room-type-id="${roomTypeId}"]`);
        if (!card) return;
        AUTO_OPEN_DONE = true;
        if (card.closest("#seaside")) showRooms("seaside");
        else if (card.closest("#twin")) showRooms("twin");
        requestAnimationFrame(() => {
            const modalEl = document.getElementById(card.dataset.modal);
            if (modalEl) {
                new bootstrap.Modal(modalEl).show();
                card.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            history.replaceState({}, document.title, "/Rooms");
        });
    }

    renderWeather();
    setupCardClick();
    const searchInput = document.getElementById('search');
    const sortSelect = document.getElementById('sort');
    if (searchInput) searchInput.addEventListener('input', filterAndSort);
    if (sortSelect) sortSelect.addEventListener('change', filterAndSort);
    autoOpenRoomByType();
});

// SIGNALR — real-time calendar updates
const bookingConnection = new signalR.HubConnectionBuilder()
    .withUrl("/bookingHub")
    .withAutomaticReconnect()
    .build();

// When a booking is made — add dates to cache and redraw
bookingConnection.on("DatesBlocked", (data) => {
    const roomTypeId = data.roomTypeId;
    if (!roomTypeId) return;

    // Add the new blocked dates directly into the cache for each affected month
    data.dates.forEach(dateStr => {
        const [year, month] = dateStr.split('-').map(Number);
        const key = `room_${roomTypeId}_${year}_${month}`;
        if (_blockedDatesCache[key]) {
            if (!_blockedDatesCache[key].includes(dateStr)) {
                _blockedDatesCache[key].push(dateStr);
            }
        }
        // If that month isn't cached yet, just leave it — it'll fetch fresh on navigate
    });

    redrawPickersForRoom(roomTypeId);
});

bookingConnection.on("DatesUnblocked", (data) => {
    const roomTypeId = data.roomTypeId;
    if (!roomTypeId) return;

    data.dates.forEach(dateStr => {
        const [year, month] = dateStr.split('-').map(Number);
        const key = `room_${roomTypeId}_${year}_${month}`;
        if (_blockedDatesCache[key]) {
            _blockedDatesCache[key] = _blockedDatesCache[key].filter(d => d !== dateStr);
        }
    });

    redrawPickersForRoom(roomTypeId);
});

function redrawPickersForRoom(roomTypeId) {
    document.querySelectorAll('.room-card').forEach(card => {
        if (String(card.dataset.roomTypeId) !== String(roomTypeId)) return;
        const modal = document.getElementById(card.dataset.modal);
        if (!modal) return;

        ['.checkin-date', '.checkout-date'].forEach(sel => {
            const input = modal.querySelector(sel);
            if (!input?._flatpickr) return;

            // Sync blockedSet from the updated cache before redrawing
            if (input._blockedSet) {
                input._blockedSet.clear();
                Object.keys(_blockedDatesCache).forEach(key => {
                    if (key.startsWith(`room_${roomTypeId}_`)) {
                        _blockedDatesCache[key].forEach(d => input._blockedSet.add(d));
                    }
                });
            }

            input._flatpickr.redraw();
        });
    });
}

bookingConnection.start().catch(err => console.error('SignalR connection error:', err));