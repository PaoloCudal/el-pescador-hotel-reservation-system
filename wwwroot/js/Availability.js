document.addEventListener("DOMContentLoaded", async () => {

    const token = localStorage.getItem('adminToken');

    const authHeaders = {
        'Authorization': `Bearer ${token}`
    };

    const authJsonHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const mainList = document.getElementById("mainFacilityList");
    const facilitySearch = document.getElementById("facilitySearch");
    const sortBtn = document.getElementById("sortBtn");

    const availabilityModalEl = document.getElementById("availabilityModal");
    const availabilityModal = new bootstrap.Modal(availabilityModalEl);

    const monthsGrid = document.getElementById("monthsGrid");
    const availabilityYearEl = document.getElementById("availabilityYear");
    const prevYearBtn = document.getElementById("prevYearBtn");
    const nextYearBtn = document.getElementById("nextYearBtn");

    const dailyModalEl = document.getElementById("dailyModal");
    const dailyModal = new bootstrap.Modal(dailyModalEl);
    const daysGrid = document.getElementById("daysGrid");
    const saveDaysBtn = document.getElementById("saveDaysBtn");

    const pencilEditorBtn = document.getElementById("pencilEditorBtn");

    let isAscending = true;
    const today = new Date();
    let currentYear = today.getFullYear();
    let selectedFacilityId = null;
    let selectedFacilityName = "";
    let selectedYear = today.getFullYear();
    let selectedMonth = null;
    let selectedDates = new Set();
    let unmarkMode = false;
    let facilities = [];
    let selectedRoomTypeId = null;

    function getFilteredFacilities(searchTerm = "") {
        searchTerm = searchTerm.toLowerCase();
        const priceFormatted = (f) => Number(f.price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return facilities
            .filter(f => f.category === "Room" || f.category === "Venue")
            .filter(f =>
                f.name.toLowerCase().includes(searchTerm) ||
                f.category.toLowerCase().includes(searchTerm) ||
                priceFormatted(f).includes(searchTerm) ||
                String(f.price).includes(searchTerm)
            );
    }

    function sortFacilitiesByCategoryAndName(data, ascending = true) {
        return [...data].sort((a, b) => {
            const dir = ascending ? 1 : -1;
            const catCompare = a.category.localeCompare(b.category);
            if (catCompare !== 0) return catCompare * dir;
            return a.name.localeCompare(b.name) * dir;
        });
    }

    function showFacilitySkeleton(count = 6) {
        mainList.innerHTML = "";
        for (let i = 0; i < count; i++) {
            const div = document.createElement("div");
            div.className = "skeleton-item";
            div.innerHTML = `
                <div class="skeleton-thumb"></div>
                <div class="skeleton-lines">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line small"></div>
                </div>
            `;
            mainList.appendChild(div);
        }
    }

    async function loadFacilities() {
        try {
            showFacilitySkeleton(6);
            const res = await fetch("/api/admin/facilities", {
                headers: authHeaders
            });
            if (!res.ok) throw new Error("Failed to fetch facilities");

            facilities = await res.json();

            renderFacilityList(
                sortFacilitiesByCategoryAndName(getFilteredFacilities(), isAscending)
            );
        } catch (err) {
            console.error(err);
            mainList.innerHTML = "<div class='text-danger'>Failed to load facilities</div>";
        }
    }

    function renderFacilityList(data) {
        mainList.innerHTML = "";
        if (!data.length) {
            mainList.innerHTML = "<div class='text-muted'>No available facilities</div>";
            return;
        }

        const search = facilitySearch.value.toLowerCase();

        const highlight = (text) => {
            if (!search) return text;
            const regex = new RegExp(`(${search})`, "gi");
            return text.replace(regex, `<mark style="background-color:#2196f3;color:white;">$1</mark>`);
        };

        data.forEach(f => {
            if (f.category === "Room" && f.roomTypes?.length > 0) {
                f.roomTypes.forEach(rt => {
                    const div = document.createElement("div");
                    div.className = "list-group-item d-flex align-items-center facility-item";

                    const imgSrc = f.images?.length > 0 ? f.images[0].imagePath : "/images/no-image.png";
                    const formattedPrice = Number(rt.basePrice).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                    const priceText = `₱${formattedPrice} — ${f.category} · ${rt.name}`;

                    div.innerHTML = `
                        <img src="${imgSrc}" class="facility-thumb me-3" />
                        <div class="flex-grow-1">
                            <div class="fw-bold">${highlight(f.name)}</div>
                            <small class="text-muted">${highlight(priceText)}</small>
                        </div>
                        <button class="btn btn-sm btn-primary set-date-btn">Set Dates</button>
                    `;

                    div.querySelector(".set-date-btn").addEventListener("click", () => {
                        openAvailabilityCalendar(f.facilityId, `${f.name} — ${rt.name}`, rt.roomTypeId);
                    });

                    mainList.appendChild(div);
                });

            } else {
                const div = document.createElement("div");
                div.className = "list-group-item d-flex align-items-center facility-item";

                const imgSrc = f.images?.length > 0 ? f.images[0].imagePath : "/images/no-image.png";
                const formattedPrice = Number(f.price).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                const priceText = `₱${formattedPrice} — ${f.category}`;

                div.innerHTML = `
                    <img src="${imgSrc}" class="facility-thumb me-3" />
                    <div class="flex-grow-1">
                        <div class="fw-bold">${highlight(f.name)}</div>
                        <small class="text-muted">${highlight(priceText)}</small>
                    </div>
                    <button class="btn btn-sm btn-primary set-date-btn">Set Dates</button>
                `;

                div.querySelector(".set-date-btn").addEventListener("click", () => {
                    openAvailabilityCalendar(f.facilityId, f.name, null);
                });

                mainList.appendChild(div);
            }
        });
    }

    facilitySearch.addEventListener("input", () => {
        renderFacilityList(sortFacilitiesByCategoryAndName(getFilteredFacilities(facilitySearch.value), isAscending));
    });

    sortBtn.addEventListener("click", () => {
        isAscending = !isAscending;
        renderFacilityList(sortFacilitiesByCategoryAndName(getFilteredFacilities(facilitySearch.value), isAscending));
        sortBtn.innerText = isAscending ? "Sort: Category A–Z" : "Sort: Category Z–A";
    });

    function openAvailabilityCalendar(facilityId, facilityName, roomTypeId = null) {
        selectedFacilityId = facilityId;
        selectedFacilityName = facilityName;
        selectedRoomTypeId = roomTypeId;
        availabilityModalEl.querySelector(".modal-title").textContent = `Set Availability for ${facilityName}`;
        currentYear = today.getFullYear();
        availabilityYearEl.textContent = currentYear;
        renderMonthsGrid();
        availabilityModal.show();
    }

    function renderMonthsGrid() {
        monthsGrid.innerHTML = "";
        const startMonth = currentYear === today.getFullYear() ? today.getMonth() : 0;

        for (let m = startMonth; m < 12; m++) {
            const monthPanel = document.createElement("div");
            monthPanel.className = "month-small-panel";

            const monthTitle = document.createElement("div");
            monthTitle.className = "month-title";
            monthTitle.textContent = new Date(currentYear, m).toLocaleString("default", { month: "short" });
            monthPanel.appendChild(monthTitle);

            const miniGrid = document.createElement("div");
            miniGrid.className = "calendar-grid";
            ["S", "M", "T", "W", "T", "F", "S"].forEach(d => {
                const div = document.createElement("div");
                div.className = "day-name";
                div.textContent = d;
                miniGrid.appendChild(div);
            });

            const firstDay = new Date(currentYear, m, 1).getDay();
            for (let i = 0; i < firstDay; i++) miniGrid.appendChild(document.createElement("div"));

            const daysInMonth = new Date(currentYear, m + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dateDiv = document.createElement("div");
                dateDiv.className = "calendar-date available";
                dateDiv.textContent = d;
                miniGrid.appendChild(dateDiv);
            }

            monthPanel.appendChild(miniGrid);
            monthPanel.addEventListener("click", () => {
                if (currentYear === today.getFullYear() && m < today.getMonth()) return;
                openDailyModal(m);
            });

            monthsGrid.appendChild(monthPanel);
        }
    }

    function openDailyModal(monthIndex) {
        selectedMonth = monthIndex;
        selectedYear = currentYear;
        selectedDates.clear();
        unmarkMode = false;

        pencilEditorBtn.classList.add("btn-outline-primary");
        pencilEditorBtn.classList.remove("btn-primary");
        pencilEditorBtn.innerHTML = '<i class="bi bi-pencil-square"></i> Edit';
        saveDaysBtn.style.display = "inline-block";

        dailyModalEl.querySelector(".modal-title").textContent =
            `Select Dates for ${selectedFacilityName} - ${new Date(selectedYear, monthIndex).toLocaleString('default', { month: 'long' })}`;

        renderDaysGrid();
        dailyModal.show();
    }

    pencilEditorBtn.addEventListener("click", () => {
        unmarkMode = !unmarkMode;
        pencilEditorBtn.classList.toggle("btn-primary", unmarkMode);
        pencilEditorBtn.classList.toggle("btn-outline-primary", !unmarkMode);
        pencilEditorBtn.innerHTML = `<i class="bi bi-pencil-square"></i> ${unmarkMode ? "Unmark Mode" : "Edit"}`;
        saveDaysBtn.style.display = unmarkMode ? "none" : "inline-block";
    });

    function attachSelectableDayClick(dayDiv, dateKey) {
        dayDiv.onclick = () => {
            if (selectedDates.has(dateKey)) {
                selectedDates.delete(dateKey);
                dayDiv.classList.remove("selected");
            } else {
                selectedDates.add(dateKey);
                dayDiv.classList.add("selected");
            }
        };
    }

    async function renderDaysGrid() {
        daysGrid.innerHTML = "";
        ["S", "M", "T", "W", "T", "F", "S"].forEach(d => {
            const header = document.createElement("div");
            header.className = "day-cell day-name";
            header.textContent = d;
            daysGrid.appendChild(header);
        });

        const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        for (let i = 0; i < firstDay; i++) daysGrid.appendChild(document.createElement("div"));

        const monthAvailability = await getMonthAvailability(selectedFacilityId, selectedYear, selectedMonth);

        // ── NEW: separate sets for pending vs approved/manual blocked dates ──
        const pendingDates = new Set();
        const blockedDates = new Set();

        if (monthAvailability?.days) {
            monthAvailability.days.forEach(d => {
                // handle both camelCase and PascalCase from API
                const isBlocked = d.isBlocked ?? d.IsBlocked;
                const dateStr = (d.date ?? d.Date ?? "").split("T")[0];
                const bookingStatus = d.bookingStatus ?? d.BookingStatus ?? null;

                if (!isBlocked || !dateStr) return;

                if (bookingStatus === "Pending") {
                    pendingDates.add(dateStr);
                } else {
                    // Approved booking or admin manual block — both fully blocked
                    blockedDates.add(dateStr);
                }
            });
        }

        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        for (let d = 1; d <= daysInMonth; d++) {
            const dayDiv = document.createElement("div");
            dayDiv.className = "day-cell";
            const dateOnly = new Date(selectedYear, selectedMonth, d);
            const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            dayDiv.textContent = d;

            if (dateOnly < todayOnly) {
                dayDiv.classList.add("past");
                dayDiv.title = "Past date (disabled)";
                dayDiv.style.pointerEvents = "none";

            } else if (pendingDates.has(dateKey)) {
                // ── NEW: pending booking — show as blocked, cannot unmark ──
                dayDiv.classList.add("pending-booked");
                dayDiv.title = "Pending booking — cannot modify";
                dayDiv.style.cursor = "not-allowed";
                dayDiv.addEventListener("click", () => {
                    dayDiv.classList.add("shake");
                    setTimeout(() => dayDiv.classList.remove("shake"), 500);
                });

            } else if (blockedDates.has(dateKey)) {
                dayDiv.classList.add("occupied");
                dayDiv.title = "Already booked";
                dayDiv.style.cursor = "pointer";

                dayDiv.addEventListener("click", async () => {
                    if (!unmarkMode) {
                        dayDiv.classList.add("shake");
                        setTimeout(() => dayDiv.classList.remove("shake"), 500);
                        return;
                    }
                    try {
                        const res = await fetch("/api/admin/availability/unblock", {
                            method: "POST",
                            headers: authJsonHeaders,
                            body: JSON.stringify({
                                FacilityId: selectedFacilityId,
                                RoomTypeId: selectedRoomTypeId,
                                VenueId: null,
                                Dates: [dateKey]
                            })
                        });
                        if (!res.ok) throw new Error("Failed to unmark date");

                        dayDiv.classList.remove("occupied");
                        dayDiv.classList.add("available");
                        blockedDates.delete(dateKey);
                        dayDiv.title = "Available";
                        dayDiv.classList.add("pulse");

                        attachSelectableDayClick(dayDiv, dateKey);

                    } catch (err) {
                        console.error(err);
                        alert("Error unmarking date: " + err.message);
                    }
                });

            } else {
                dayDiv.classList.add("available");
                attachSelectableDayClick(dayDiv, dateKey);
            }

            if (dateOnly.getTime() === todayOnly.getTime()) dayDiv.classList.add("today");
            daysGrid.appendChild(dayDiv);
        }
    }

    async function getMonthAvailability(facilityId, year, month) {
        try {
            const roomTypeParam = selectedRoomTypeId ? `&roomTypeId=${selectedRoomTypeId}` : "";
            const res = await fetch(
                `/api/admin/availability/month?facilityId=${facilityId}&year=${year}&month=${month + 1}${roomTypeParam}`,
                { headers: authHeaders }
            );
            if (!res.ok) throw new Error("Failed to fetch month availability");
            return await res.json();
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    function scheduleTodayUpdate() {
        const now = new Date();
        const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        setTimeout(() => {
            renderDaysGrid();
            scheduleTodayUpdate();
        }, nextDay - now);
    }

    saveDaysBtn.addEventListener("click", async () => {
        if (!selectedDates.size) {
            dailyModal.hide();
            return;
        }

        const datesArray = Array.from(selectedDates);

        try {
            const res = await fetch("/api/admin/availability", {
                method: "POST",
                headers: authJsonHeaders,
                body: JSON.stringify({
                    FacilityId: selectedFacilityId,
                    RoomTypeId: selectedRoomTypeId,
                    VenueId: null,
                    Dates: datesArray
                })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData?.message || "Failed to save availability");
            }

            const result = await res.json();
            dailyModal.hide();

            if (result.added && result.skipped) alert(`${result.added} date(s) added, ${result.skipped} date(s) skipped (already exist).`);
            else if (result.added) alert(`${result.added} date(s) added successfully.`);
            else if (result.skipped) alert(`All selected date(s) already exist.`);
            else alert("No changes were made.");

            selectedDates.clear();
            renderDaysGrid();
        } catch (err) {
            console.error(err);
            alert(`Error saving availability: ${err.message}`);
        }
    });

    prevYearBtn.addEventListener("click", () => {
        if (currentYear > today.getFullYear()) {
            currentYear--;
            availabilityYearEl.textContent = currentYear;
            renderMonthsGrid();
        }
    });

    nextYearBtn.addEventListener("click", () => {
        currentYear++;
        availabilityYearEl.textContent = currentYear;
        renderMonthsGrid();
    });

    await loadFacilities();
    scheduleTodayUpdate();

});