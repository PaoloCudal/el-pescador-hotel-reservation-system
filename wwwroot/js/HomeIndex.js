document.addEventListener("DOMContentLoaded", async function () {

    function getStatusBadge(status) {
        if (!status) return `<span class="badge bg-secondary">Unknown</span>`;
        switch (status.toLowerCase()) {
            case "cancelled": return `<span class="badge bg-danger text-white">Cancelled</span>`;
            case "approved":  return `<span class="badge bg-primary text-white">Approved</span>`;
            case "pending":   return `<span class="badge bg-warning text-dark">Pending</span>`;
            case "declined":  return `<span class="badge bg-info text-white">Declined</span>`;
            default:          return `<span class="badge bg-secondary text-white">${status}</span>`;
        }
    }

    window.openUserProfileModal = function (userId) {
        if (!userId) return;

        const modalElement = document.getElementById('userProfileModal');
        if (!modalElement) return;

        const profileModal = bootstrap.Modal.getOrCreateInstance(modalElement);
        profileModal.show();

        document.getElementById('profileFullName').textContent    = "Loading...";
        document.getElementById('profileEmail').textContent       = "Loading...";
        document.getElementById('profileJoinDate').textContent    = "Loading...";
        document.getElementById('profileFavoriteRooms').textContent  = "Favorite Rooms: 0";
        document.getElementById('profileFavoriteVenues').textContent = "Favorite Venues: 0";

        const list = document.getElementById('activeBookingsList');
        list.innerHTML = `<div class="d-flex justify-content-center py-3">
                            <div class="spinner-border text-primary"></div>
                          </div>`;

        fetch(`/api/booking/my-account/${userId}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (!data) return;
                document.getElementById('profileFullName').textContent  = data.fullName  ?? "N/A";
                document.getElementById('profileEmail').textContent     = data.email     ?? "N/A";
                if (data.joinDate) {
                    document.getElementById('profileJoinDate').textContent =
                        new Date(data.joinDate).toLocaleDateString();
                }
            })
            .catch(() => {
                document.getElementById('profileFullName').textContent = "Error loading data";
            });

        fetch("/api/favorites/account", { credentials: "include" })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (!data) return;
                document.getElementById('profileFavoriteRooms').textContent  =
                    `Favorite Rooms: ${data.roomCount  ?? 0}`;
                document.getElementById('profileFavoriteVenues').textContent =
                    `Favorite Venues: ${data.venueCount ?? 0}`;
            })
            .catch(() => {});

        fetch(`/api/booking/active/${userId}`)
            .then(res => res.ok ? res.json() : [])
            .then(bookings => {
                list.innerHTML = "";

                if (!bookings || bookings.length === 0) {
                    list.innerHTML = `
                        <div class="text-muted text-center py-4">
                            <i class="bi bi-calendar-x fs-2 d-block mb-2"></i>
                            No active bookings found.
                        </div>`;
                    return;
                }

                bookings.forEach(b => {
                    const card = document.createElement('div');
                    card.className = "card border-0 shadow-sm mb-2";

                    const canCancel = b.status?.toLowerCase() === "pending" ||
                                      b.status?.toLowerCase() === "approved";

                    card.innerHTML = `
                        <div class="card-body d-flex justify-content-between align-items-start">
                            <div>
                                <div class="fw-bold text-dark">${b.bookingReference}</div>
                                <div class="text-muted small">${b.facilityName}</div>
                                <div class="small">
                                    ${new Date(b.checkIn).toLocaleDateString()} —
                                    ${new Date(b.checkOut).toLocaleDateString()}
                                    <span class="text-primary fw-semibold">(${b.nights} night(s))</span>
                                </div>
                                <div class="small fw-bold mt-1">
                                  ₱${b.totalCost?.toLocaleString?.() ?? b.totalCost}
                                </div>
                                <div class="mt-2">${getStatusBadge(b.status)}</div>
                            </div>
                            ${canCancel ? `
                                <button class="btn btn-outline-danger btn-sm cancelBookingBtn">
                                    Cancel
                                </button>` : ``}
                        </div>`;

                    if (canCancel) {
                        card.querySelector('.cancelBookingBtn').addEventListener('click', async () => {
                            const isApproved = b.status?.toLowerCase() === "approved";
                            const confirm = await Swal.fire({
                                title: 'Cancel Booking?',
                                text: isApproved
                                    ? 'This booking has already been approved. Are you sure?'
                                    : 'This action cannot be undone.',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#d33',
                                confirmButtonText: 'Yes, cancel it!'
                            });

                            if (confirm.isConfirmed) {
                                const cancelRes = await fetch(
                                    `/api/booking/cancel/${b.bookingReference}`,
                                    { method: "POST" }
                                );
                                if (cancelRes.ok) {
                                    Swal.fire('Cancelled!', 'Your booking has been removed.', 'success');
                                    window.openUserProfileModal(userId);
                                }
                            }
                        });
                    }

                    list.appendChild(card);
                });
            })
            .catch(() => {
                list.innerHTML = `<div class="text-danger text-center">Failed to load bookings</div>`;
            });
    };

    const AUTH_STATE = {
        checked: false,
        isAuthenticated: false,
        user: null
    };

    async function checkAuth() {
        if (AUTH_STATE.checked) return AUTH_STATE;
        try {
            const res  = await fetch("/api/auth/me", { credentials: "include" });
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

    const profileDropdown = document.querySelector("#profileDropdown");
    const dropdownMenu    = profileDropdown?.querySelector("ul");
    const profileBtn      = profileDropdown?.querySelector("#profileMenuBtn");

    async function loadProfileDropdown() {
        if (!dropdownMenu || !profileBtn) return;

        const auth = await checkAuth();

        dropdownMenu.innerHTML = auth.isAuthenticated
            ? `<li><a class="dropdown-item" href="#" id="myAccountBtn">My Account</a></li>
               <li><a class="dropdown-item" href="/Logout">Logout</a></li>`
            : `<li><a class="dropdown-item" href="/UserLogin">Login</a></li>
               <li><a class="dropdown-item" href="/UserRegistration">Sign Up</a></li>`;

        dropdownMenu.addEventListener("click", (e) => {
            const btn = e.target.closest("#myAccountBtn");
            if (!btn) return;
            e.preventDefault();
            openUserProfileModal(auth.user?.userId);
        });

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

    const favoritesPanel     = document.getElementById("favoritesPanel");
    const favoritesEmpty     = document.getElementById("favoritesEmpty");
    const favoritesList      = document.getElementById("favoritesList");
    const toggleFavoritesBtn = document.getElementById("toggleFavoritesBtn");
    const closeFavoritesBtn  = document.getElementById("closeFavoritesBtn");
    const clearFavoritesBtn  = document.getElementById("clearFavoritesBtn");

    let currentFavTab = "Room";

    document.getElementById("tabRooms").addEventListener("click", () => switchFavTab("Room"));
    document.getElementById("tabVenues").addEventListener("click", () => switchFavTab("Venue"));

    function switchFavTab(type) {
        currentFavTab = type;
        document.getElementById("tabRooms").classList.toggle("active", type === "Room");
        document.getElementById("tabVenues").classList.toggle("active", type === "Venue");
        renderFavoritesPanel(type);
    }

    async function fetchFavorites(type) {
        const url = type === "Room" ? "/api/favorites/rooms" : "/api/favorites/venues";
        try {
            const res = await fetch(url, { credentials: "include" });
            if (res.status === 401) return null;
            if (!res.ok) return [];
            return await res.json();
        } catch {
            return [];
        }
    }

    async function renderFavoritesPanel(type = "Room") {
    favoritesList.innerHTML = "";
    favoritesEmpty.style.display = "none";

    const tpl = document.getElementById("favoriteSkeleton");
    for (let i = 0; i < 4; i++) {
        favoritesList.appendChild(tpl.content.cloneNode(true));
    }

    const list = await fetchFavorites(type);
    favoritesList.innerHTML = "";

    if (list === null) {
        favoritesEmpty.textContent = "Please log in to view your favorites.";
        favoritesEmpty.style.display = "block";
        return;
    }

    if (!list.length) {
        favoritesEmpty.textContent = type === "Room"
            ? "You have no favorite rooms yet."
            : "You have no favorite venues yet.";
        favoritesEmpty.style.display = "block";
        return;
    }

    list.forEach(fav => {
        const name   = type === "Room" ? (fav.roomTypeName || "") : (fav.venueName || "");
        const imgSrc = fav.imagePath || "/images/placeholder.jpg";
        const href   = type === "Room"
            ? `/Rooms?roomTypeId=${fav.roomTypeId}`
            : `/Venues?venueId=${fav.venueId}`;

        const thumb = document.createElement("div");
        thumb.className = "favorites-thumbnail";
        thumb.style.cursor = "pointer";
        thumb.innerHTML = `
            <img src="${imgSrc}" alt="${name}"
                style="width:80px;height:70px;object-fit:cover;border-radius:8px;display:block;">
            <div class="small mt-1 text-center"
                style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</div>
            <i class="bi bi-heart-fill text-danger fav-remove-icon"
                role="button" style="cursor:pointer;font-size:0.85rem;display:block;text-align:center;"></i>
        `;

        thumb.querySelector(".fav-remove-icon").addEventListener("click", async e => {
            e.stopPropagation();
            try {
                await fetch("/api/favorites/toggle", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(
                        type === "Room"
                            ? { RoomTypeId: fav.roomTypeId, FacilityId: fav.facilityId }
                            : { VenueId: fav.venueId, FacilityId: fav.facilityId }
                    )
                });
                await renderFavoritesPanel(type);
            } catch (err) {
                console.error(err);
                Swal.fire({ icon: "error", title: "Error", text: "Failed to remove favorite." });
            }
        });

        thumb.addEventListener("click", () => {
            window.location.href = href;
        });

        favoritesList.appendChild(thumb);
    });
}

    toggleFavoritesBtn.addEventListener("click", async () => {
        try {
            const auth = await checkAuth();
            if (!auth.isAuthenticated) {
                Swal.fire({
                    html: `
                        <div style="display:flex;flex-direction:column;align-items:center;">
                            <img src="/images/icon/icon.png" style="width:60px;margin-bottom:10px;">
                            <h3>Favorites</h3>
                            <p>Please log in or sign up to view your favorites</p>
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

            const isOpen = favoritesPanel.style.display === "block";
            if (isOpen) {
                favoritesPanel.style.display = "none";
                toggleFavoritesBtn.setAttribute("aria-expanded", "false");
            } else {
                favoritesPanel.style.display = "block";
                toggleFavoritesBtn.setAttribute("aria-expanded", "true");
                await renderFavoritesPanel(currentFavTab);
                favoritesPanel.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: "error", title: "Error", text: "Cannot check login status." });
        }
    });

    closeFavoritesBtn.addEventListener("click", () => {
        favoritesPanel.style.display = "none";
        toggleFavoritesBtn.setAttribute("aria-expanded", "false");
    });

    clearFavoritesBtn.addEventListener("click", async () => {
        const result = await Swal.fire({
            title: "Clear All Favorites?",
            text: currentFavTab === "Room"
                ? "This will remove all your favorite rooms."
                : "This will remove all your favorite venues.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, clear all",
            cancelButtonText: "Cancel",
            reverseButtons: true
        });

        if (!result.isConfirmed) return;

        try {
            const url = currentFavTab === "Room"
                ? "/api/favorites/clear/rooms"
                : "/api/favorites/clear/venues";

            const res = await fetch(url, { method: "POST", credentials: "include" });
            if (!res.ok) throw new Error();

            await renderFavoritesPanel(currentFavTab);
            Swal.fire({ icon: "success", title: "Cleared!", timer: 1200, showConfirmButton: false });
        } catch {
            Swal.fire({ icon: "error", title: "Error", text: "Failed to clear favorites." });
        }
    });

    loadProfileDropdown();

    const nav = document.getElementById('mainNav');
    if (nav) window.addEventListener('scroll', () =>
        nav.classList.toggle('scrolled', window.scrollY > 60)
    );

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    const faders = document.querySelectorAll('.fade-in');
    const appearObserver = new IntersectionObserver(entries => {
        entries.forEach(entry =>
            entry.target.classList.toggle('show', entry.isIntersecting)
        );
    }, { threshold: 0.2 });
    faders.forEach(f => appearObserver.observe(f));

    const counters = document.querySelectorAll('.counter');
    const counterObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el     = entry.target;
            const target = +el.dataset.target || +el.innerText || 0;
            let current  = 0;
            const step   = Math.max(1, Math.floor(target / 150));
            const interval = setInterval(() => {
                current += step;
                if (current >= target) {
                    el.innerText = target;
                    clearInterval(interval);
                } else {
                    el.innerText = current.toLocaleString();
                }
            }, 12);
            obs.unobserve(el);
        });
    }, { threshold: 0.4 });
    counters.forEach(c => counterObserver.observe(c));

    const discoverPhotos = document.querySelectorAll('.discover-photo');

    discoverPhotos.forEach((dp) => {
        const img = dp.querySelector('.discover-img');
        if (!img) return;
        const angle = (Math.random() * 12 - 6).toFixed(2);
        img.dataset.baseAngle = angle;
        img.style.transform = `rotate(${angle}deg)`;
    });

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        discoverPhotos.forEach((dp, i) => {
            const img = dp.querySelector('.discover-img');
            if (!img) return;
            const base  = parseFloat(img.dataset.baseAngle || 0);
            const delta = Math.sin((scrollY / 200) + i) * 2.5;
            img.style.transform =
                `rotate(${(base * 0.6) + delta}deg) translateY(${-Math.min(10, scrollY * 0.0008 * (i + 1))}px)`;
        });
    });

    const discoverObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('show');
            const caption = entry.target.querySelector('.photo-caption');
            if (caption) caption.classList.add('show');
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.25 });
    discoverPhotos.forEach(dp => discoverObserver.observe(dp));

    function handleResize() {
        const mobileNav = document.querySelector('.mobile-bottom-nav');
        if (!mobileNav) return;
        mobileNav.style.display = window.innerWidth > 768 ? 'none' : 'flex';
    }
    window.addEventListener('resize', handleResize);
    handleResize();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('.floating, .animate__animated')
            .forEach(el => el.style.animation = 'none');
    }

    const OPENWEATHERMAP_API_KEY = 'YOUR_OPENWEATHER_API_KEY';

    async function fetchWeather(city) {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`
        );
        return res.json();
    }

    async function renderWeather() {
        const el = document.getElementById('weatherContent');
        if (!el) return;
        el.innerHTML = 'Loading...';
        try {
            const data = await fetchWeather('Bolinao');
            if (!data.weather) throw new Error();
            const icon = `https://openweathermap.org/img/wn/${data.weather[0].icon}.png`;
            el.innerHTML = `
                <strong>${data.name}</strong>
                <img src="${icon}">
                ${Math.round(data.main.temp)}°C • ${data.weather[0].description}
            `;
        } catch {
            el.textContent = 'Weather unavailable';
        }
    }

    renderWeather();

    const floatingBook = document.getElementById("floatingBook");
    if (floatingBook) {
        floatingBook.addEventListener("click", function (e) {
            e.preventDefault();
            Swal.fire({
                html: `
                    <div style="display:flex;flex-direction:column;align-items:center;">
                        <img src="/images/icon/icon.png" style="width:60px;margin-bottom:10px;">
                        <h2>Book Now?</h2>
                        <p>Login or sign up first</p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: "Log In",
                cancelButtonText: "Sign Up",
                reverseButtons: true
            }).then(result => {
                if (result.isConfirmed) window.location.href = "/UserLogin";
                else if (result.dismiss === Swal.DismissReason.cancel)
                    window.location.href = "/UserRegistration";
            });
        });
    }

});