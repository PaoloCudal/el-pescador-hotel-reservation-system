document.addEventListener("DOMContentLoaded", async () => {

    const grid = document.getElementById("userFacilityGrid");
    if (!grid) return;

    
    const formatPrice = v =>
        "₱" + Number(v || 0).toLocaleString("en-PH");

    function getBadgeColor(badge) {
        switch (badge) {
            case "Most Popular": return "danger";
            case "Best Value": return "warning";
            case "Luxury": return "info";
            default: return "secondary";
        }
    }

    function getColSize(badge) {
        if (!badge) return "6";
        const b = badge.trim().toLowerCase();
        if (b === "most popular") return "7";
        if (b === "best value") return "5";
        if (b === "luxury") return "6";
        return "6";
    }

    /* ===============================
       RENDER ROOM CARD
    =============================== */
    function renderRoomCard(f) {
        if (!f) return null;

        // Use badge as fallback if homeIndexCategory is empty
        f.homeIndexCategory = (f.homeIndexCategory && f.homeIndexCategory.trim() !== "")
            ? f.homeIndexCategory
            : f.badge || "";

        const col = document.createElement("div");
        col.className = `col-md-${getColSize(f.homeIndexCategory)} fade-in`;
        col.dataset.id = f.facilityId;

        const firstImage = f.images?.[0]?.imagePath || "/images/placeholder.jpg";

        col.innerHTML = `
        <div class="card elegant-card hover-zoom shadow-lg border-0 rounded-4 room-card">

            ${f.homeIndexCategory ? `
                <span class="badge bg-${getBadgeColor(f.homeIndexCategory)}
                    text-${f.homeIndexCategory === "Best Value" ? "dark" : "light"}
                    position-absolute m-3 px-3 py-2 rounded-pill">
                    ${f.homeIndexCategory}
                </span>
            ` : ""}

            <img src="${firstImage}"
                 class="card-img-top rounded-top-4 room-img"
                 alt="${f.name || "Room"}" />

            <div class="card-body p-4">
                <h4 class="card-title fw-bold">${f.name || "Unnamed Room"}</h4>
                <p class="card-text text-muted">${f.description || ""}</p>
                <p class="price fw-semibold text-warning">
                    ${formatPrice(f.price)} / night
                </p>

                <a class="btn btn-warning w-100 shadow-sm view-btn"
                href="/Rooms?roomTypeId=${f.roomTypeId}">
                View Details
                </a>

            </div>
        </div>
        `;

        return col;
    }

    /* ===============================
       LOAD INITIAL DATA
    =============================== */
    async function loadFacilities() {
        const PLACEHOLDER_COUNT = 6;

        // ================= SKELETON =================
        grid.innerHTML = "";
        for (let i = 0; i < PLACEHOLDER_COUNT; i++) {
            const col = document.createElement("div");
            col.className = "col-md-6"; 

            col.innerHTML = `
    <div class="card elegant-card shadow-lg border-0 rounded-4 room-card skeleton-card">
        <div class="skeleton-image shimmer rounded-top-4"></div>
        <div class="card-body p-4">
            <div class="skeleton-line shimmer mb-2 w-75"></div>
            <div class="skeleton-line shimmer mb-2 w-50"></div>
            <div class="skeleton-line shimmer w-25"></div>
            <div class="skeleton-line shimmer mt-3 w-100"></div>
        </div>
    </div>`;
            grid.appendChild(col);
        }

        try {
            const res = await fetch("/api/customer/home-index");
            
            if (!res.ok) {
                grid.innerHTML = `<p class="text-danger">Failed to load rooms.</p>`;
                return;
            }

            const rooms = await res.json();
            await new Promise(r => setTimeout(r, 500));
            grid.innerHTML = "";

            if (!rooms || rooms.length === 0) {
                grid.innerHTML = `<p class="text-muted">No rooms available.</p>`;
                return;
            }

            rooms.forEach(f => {
                // Ensure fallback from badge
                f.homeIndexCategory = (f.homeIndexCategory && f.homeIndexCategory.trim() !== "")
                    ? f.homeIndexCategory
                    : f.badge || "";

                const card = renderRoomCard(f);
                if (!card) return;

                grid.appendChild(card);
                requestAnimationFrame(() => card.classList.add("show"));
            });

        } catch (err) {
            console.error("HomeIndex load error:", err);
            grid.innerHTML = `<p class="text-danger">Error loading rooms.</p>`;
        }
    }

    loadFacilities();

    /* ===============================
       SIGNALR (REFRESH ONLY)
    =============================== */
    if (window.signalR) {
        const connection = new signalR.HubConnectionBuilder()
        .withUrl("/hotelhub", { transport: signalR.HttpTransportType.LongPolling })
        .withAutomaticReconnect()
        .build();

        connection.on("FacilityAdded", loadFacilities);
        connection.on("FacilityUpdated", loadFacilities);
        connection.on("FacilityDeleted", loadFacilities);

        connection.start()
            .then(() => console.log("User SignalR connected"))
            .catch(err => console.error("SignalR error:", err));
    } else {
        console.warn("SignalR not loaded yet — skipping realtime updates");
    }

});
