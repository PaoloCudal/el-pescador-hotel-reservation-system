document.addEventListener("DOMContentLoaded", async () => {

    
    const token = localStorage.getItem("adminToken");

    if (!token) {
        window.location.href = "/StaffLogin";
        return;
    }

    try {
        const authCheck = await fetch("/api/admin/facilities", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (authCheck.status === 401) {
            localStorage.removeItem("adminToken");
            window.location.href = "/StaffLogin";
            return;
        }
    } catch (err) {
        console.error("Auth check failed:", err);
        window.location.href = "/StaffLogin";
        return;
    }
    // ==========================================

    let initialLoaded = false;

    const mainList = document.getElementById("mainFacilityList");
    const addModalEl = document.getElementById("addFacilityModal");
    const editModalEl = document.getElementById("facilityEditModal");
    const restoreUndoModalEl = document.getElementById("restoreUndoModal");

    const addModal = bootstrap.Modal.getOrCreateInstance(addModalEl);
    const editModal = bootstrap.Modal.getOrCreateInstance(editModalEl);

    const addForm = document.getElementById("addFacilityForm");
    const editForm = document.getElementById("editFacilityForm");

    const addPreview = document.getElementById("addImagePreview");
    const editPreview = document.getElementById("editImagePreview");
    const existingPreview = document.getElementById("existingImagePreview");
    const restoreUndoList = document.getElementById("restoreUndoList");

    const addCategory = document.getElementById("addFacilityCategory");
    const editCategory = document.getElementById("editFacilityCategory");

    const addRoomToggle = document.getElementById("addRoomTypeToggle");
    const addRoomHidden = document.getElementById("addRoomTypeHidden");
    const editRoomToggle = document.getElementById("editRoomTypeToggle");
    const editRoomHidden = document.getElementById("editRoomTypeHidden");

    const addPriceGroup = document.getElementById("addPriceGroup");
    const editPriceGroup = document.getElementById("editPriceGroup");

    const addHomeIndexHidden = document.getElementById("addHomeIndexHidden");
    const editHomeIndexHidden = document.getElementById("editHomeIndexHidden");

    const addRoomTypeSelect = document.getElementById("addRoomTypeSelect");
    const editRoomTypeSelect = document.getElementById("editRoomTypeSelect");

    const addCapacityMinGroup = document.getElementById("addCapacityGroup");
    const addCapacityMaxGroup = document.getElementById("addCapacityMaxGroup");
    const editCapacityMinGroup = document.getElementById("editCapacityGroup");
    const editCapacityMaxGroup = document.getElementById("editCapacityMaxGroup");

    const addVenueFeaturesGroup = document.getElementById("addVenueFeatures");
    const editVenueFeaturesGroup = document.getElementById("editVenueFeatures");

    const addAmenityFeaturesGroup = document.getElementById("addAmenityFeatures");
    const editAmenityFeaturesGroup = document.getElementById("editAmenityFeatures");

    // ----- Toast function -----
    function showToast(message, type = "error", duration = 3000) {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;

        const msgSpan = document.createElement("span");
        msgSpan.textContent = message;
        toast.appendChild(msgSpan);

        const closeBtn = document.createElement("span");
        closeBtn.className = "close-btn";
        closeBtn.innerHTML = "&times;";
        closeBtn.addEventListener("click", () => {
            clearTimeout(timeout);
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        });
        toast.appendChild(closeBtn);

        const progress = document.createElement("div");
        progress.className = "progress";
        progress.style.animation = `progressAnim ${duration}ms linear forwards`;
        toast.appendChild(progress);

        container.appendChild(toast);
        setTimeout(() => toast.classList.add("show"), 50);

        const timeout = setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    const searchInput = document.getElementById("facilitySearch");
    const sortBtn = document.getElementById("sortBtn");
    let sortAscending = true;

    sortBtn.classList.add("sort-asc");
    sortBtn.addEventListener("click", () => {
        sortAscending = !sortAscending;
        sortBtn.classList.toggle("sort-asc", sortAscending);
        sortBtn.classList.toggle("sort-desc", !sortAscending);
        sortFacilitiesByCategory(sortAscending);
    });

    const safeNumber = v => {
        if (!v) return 0;
        v = typeof v === "string" ? v.replace(/,/g, "") : v;
        return Number.isFinite(+v) ? +v : 0;
    };

    const normalizeRoomType = v => !v || v === "None" ? "" : v;

    const fetchJsonSafe = async (url, opts = {}) => {
        const token = localStorage.getItem("adminToken");

        opts.headers = {
            ...opts.headers,
            "Authorization": `Bearer ${token}`
        };

        const r = await fetch(url, opts);

        if (r.status === 401) {
            window.location.href = "/StaffLogin";
            return;
        }

        if (!r.ok) throw new Error(await r.text());

        return r.headers.get("content-type")?.includes("json")
            ? r.json()
            : null;
    };

    // FILTER + SEARCH
    searchInput.addEventListener("input", filterFacilities);
    function filterFacilities() {
        const search = searchInput.value.toLowerCase();
        mainList.querySelectorAll(".update-item").forEach(i => {
        const priceFormatted = i.dataset.price
        ? Number(i.dataset.price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
         : "";
        const searchableText = [
        i.dataset.name,
        i.dataset.description,
        i.dataset.category,
        priceFormatted,
        i.dataset.price,          
        i.dataset.homeIndexCategory  
        ].join(" ").toLowerCase();
            const searchMatch = !search || searchableText.includes(search);
            i.style.display = searchMatch ? "flex" : "none";

            const nameEl = i.querySelector("strong");
            if (nameEl) {
                nameEl.innerHTML = i.dataset.name;
                if (search && searchMatch) {
                    const regex = new RegExp(`(${search})`, "gi");
                    nameEl.innerHTML = i.dataset.name.replace(regex, `<mark style="background-color:#2196f3;color:white;">$1</mark>`);
                }
            }

            const priceLineEl = i.querySelector(".small.text-muted");
            if (priceLineEl) {
                let priceText = (i.dataset.category === "Amenity" || !i.dataset.price)
                    ? i.dataset.category
                    : "₱" + Number(i.dataset.price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " — " + i.dataset.category;
                if (search && searchMatch) {
                    const regex = new RegExp(`(${search})`, "gi");
                    priceText = priceText.replace(regex, `<mark style="background-color:#2196f3;color:white;">$1</mark>`);
                }
                priceLineEl.innerHTML = priceText;
            }

            const badgeEl = i.querySelector(".room-badge");
            if (badgeEl && i.dataset.homeIndexCategory) {
                let badgeText = i.dataset.homeIndexCategory;
                if (search && searchMatch) {
                    const regex = new RegExp(`(${search})`, "gi");
                    badgeText = badgeText.replace(regex, `<mark style="background-color:#2196f3;color:white;">$1</mark>`);
                }
                badgeEl.innerHTML = badgeText;
            }
        });
    }

    // ROOM TOGGLE
    function setupToggle(toggle, hidden) {
        if (!toggle) return;
        toggle.querySelectorAll(".toggle-option").forEach(btn => {
            btn.addEventListener("click", () => {
                toggle.querySelectorAll(".toggle-option").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                hidden.value = btn.dataset.roomType;
            });
        });
    }
    setupToggle(addRoomToggle, addRoomHidden);
    setupToggle(editRoomToggle, editRoomHidden);

    // PRICE FORMAT
    document.querySelectorAll(".price-input").forEach(input => {
        input.addEventListener("input", () => {
            const val = input.value.replace(/,/g, "");
            if (!isNaN(val)) input.value = Number(val).toLocaleString("en-PH");
        });
    });

    // IMAGE PREVIEW
    function previewImages(input, preview) {
    if (!input._accumulatedFiles) input._accumulatedFiles = [];

    [...input.files].forEach(f => input._accumulatedFiles.push(f));

    const dt = new DataTransfer();
    input._accumulatedFiles.forEach(f => dt.items.add(f));
    input.files = dt.files;

    preview.innerHTML = "";
    input._accumulatedFiles.forEach((f, index) => {
        const container = document.createElement("div");
        container.className = "image-thumb-container";

        const img = document.createElement("img");
        img.className = "thumb";
        img.src = URL.createObjectURL(f);

        const removeBtn = document.createElement("span");
        removeBtn.className = "image-thumb-remove";
        removeBtn.innerHTML = "&times;";
        removeBtn.addEventListener("click", () => {
            input._accumulatedFiles.splice(index, 1);
            const dt2 = new DataTransfer();
            input._accumulatedFiles.forEach(file => dt2.items.add(file));
            input.files = dt2.files;
            container.remove();
        });

        container.appendChild(img);
        container.appendChild(removeBtn);
        preview.appendChild(container);
    });
  }

    function sortFacilitiesByCategory(asc = true) {
        const items = [...mainList.querySelectorAll(".update-item")];

        items.sort((a, b) => {
            const catA = a.dataset.category || "";
            const catB = b.dataset.category || "";
            const categoryComparison = catA.localeCompare(catB);

            if (categoryComparison !== 0) {
                return asc ? categoryComparison : -categoryComparison;
            }

            const nameA = a.dataset.name.toLowerCase();
            const nameB = b.dataset.name.toLowerCase();
            return asc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });

        items.forEach(i => mainList.appendChild(i));
    }

    addForm.ImageFiles?.addEventListener("change", e => previewImages(e.target, addPreview));
    editForm.NewImages?.addEventListener("change", e => previewImages(e.target, editPreview));

    function handleCategory(
    cat,
    roomGroup,
    priceGroup,
    capacityMinGroup,
    capacityMaxGroup,
    venueFeaturesGroup,
    amenityFeaturesGroup,
    ) {
    const priceInput = priceGroup?.querySelector("input");

    
    priceGroup.style.display = "block";
    priceInput?.setAttribute("required", "required");

    roomGroup.style.display = "none";
    capacityMinGroup.style.display = "none";
    capacityMaxGroup.style.display = "none";

    [...venueFeaturesGroup.querySelectorAll("input")].forEach(i => i.disabled = true);
    [...amenityFeaturesGroup.querySelectorAll("input")].forEach(i => i.disabled = true);

    venueFeaturesGroup.style.display = "none";
    amenityFeaturesGroup.style.display = "none";

    if (cat === "Room") {
        roomGroup.style.display = "block";
    } else if (cat === "Venue") {
        capacityMinGroup.style.display = "block";
        capacityMaxGroup.style.display = "block";
        venueFeaturesGroup.style.display = "block";
        [...venueFeaturesGroup.querySelectorAll("input")].forEach(i => i.disabled = false);
    } else if (cat === "Amenity") {
        priceGroup.style.display = "none";
        priceInput?.removeAttribute("required");
        if (priceInput) priceInput.value = "";
        amenityFeaturesGroup.style.display = "block";
        [...amenityFeaturesGroup.querySelectorAll("input")].forEach(i => i.disabled = false);
    }
  }

    function toggleVenueRequirements(form, isVenue) {
    ["CapacityMin", "CapacityMax"].forEach(name => {
        const input = form.querySelector(`[name='${name}']`);
        if (!input) return;

        if (isVenue) {
            input.required = true;
            input.disabled = false;
        } else {
            input.required = false;
            input.disabled = true;
            input.value = "";
        }
    });
   }

    addCategory.addEventListener("change", e => {
        const category = e.target.value;
        const isVenue = category === "Venue";
        handleCategory(category, addRoomToggle.parentElement, addPriceGroup, addCapacityMinGroup, addCapacityMaxGroup, addVenueFeaturesGroup, addAmenityFeaturesGroup);
        toggleVenueRequirements(addForm, isVenue);
    });

    editCategory.addEventListener("change", e => {
        const category = e.target.value;
        const isVenue = category === "Venue";
        handleCategory(category, editRoomToggle.parentElement, editPriceGroup, editCapacityMinGroup, editCapacityMaxGroup, editVenueFeaturesGroup, editAmenityFeaturesGroup);
        toggleVenueRequirements(editForm, isVenue);
    });

    addRoomTypeSelect.addEventListener("change", () => addHomeIndexHidden.value = addRoomTypeSelect.value);
    editRoomTypeSelect.addEventListener("change", () => editHomeIndexHidden.value = editRoomTypeSelect.value);

    function getHomeIndexBadge(homeIndexCategory) {
        if (!homeIndexCategory || homeIndexCategory === "None") return "";

        homeIndexCategory = homeIndexCategory.replace(/\s+/g, " ").trim();

        const cls =
            homeIndexCategory === "Luxury" ? "luxury" :
            homeIndexCategory === "Best Value" ? "best-value" :
            homeIndexCategory === "Most Popular" ? "most-popular" :
            "";

        return cls
            ? `<span class="room-badge ${cls} ms-2">${homeIndexCategory}</span>`
            : "";
    }

    function renderFacility(f) {
        const item = document.createElement("div");
        item.className = "list-group-item update-item";
        item.dataset.id = f.facilityId;
        item.dataset.name = f.name || "";
        item.dataset.description = f.description || "";
        item.dataset.category = f.category || "";
        item.dataset.price = safeNumber(f.price);
        item.dataset.imageIds = (f.images || []).map(i => i.facilityImageId).join(",");
        item.dataset.images = (f.images || []).map(i => i.imagePath).join(",");
        item.dataset.roomType = f.roomType || "";
        item.dataset.homeIndexCategory = f.homeIndexCategory || "";
        item.dataset.isdeleted = !!f.isDeleted;
        item.dataset.capacityMin = f.capacityMin ?? "";
        item.dataset.capacityMax = f.capacityMax ?? "";
        item.dataset.feature1 = f.feature1 || "";
        item.dataset.feature2 = f.feature2 || "";
        item.dataset.meta = f.meta || "";
        item.dataset.isExploreHighlight = f.isExploreHighlight ? "true" : "false";

        const firstImg = (f.images && f.images[0]?.imagePath) || "";
        const priceText = (f.category === "Amenity" || !f.price)
            ? f.category
            : "₱" + Number(f.price).toLocaleString("en-PH", { maximumFractionDigits: 0 }) + " — " + f.category;

        const actionButtons = [];
        actionButtons.push(`<button type="button" class="btn btn-sm btn-danger btn-delete-facility" data-id="${f.facilityId}"><i class="bi bi-trash"></i></button>`);
        actionButtons.push(`<button type="button" class="btn btn-sm btn-outline-secondary ms-1 btn-edit-facility">Edit</button>`);
        if (f.isDeleted) actionButtons.push(`<button type="button" class="btn btn-sm btn-success ms-1 btn-undo-facility" data-id="${f.facilityId}">Undo</button>`);

        const badgeHtml = f.homeIndexCategory ? getHomeIndexBadge(f.homeIndexCategory) : "";

        item.innerHTML = `
        <div class="d-flex align-items-center">
        ${firstImg ? `<img src="${firstImg}" class="thumb me-2"/>` : ""}
        <div>
        <div>
            <strong>${f.name}</strong>
            ${badgeHtml}
        </div>
        <div class="small text-mutead">${priceText}</div>
        </div>
        </div>
        <div>${actionButtons.join(" ")}</div>`;
        return item;
    }

    async function loadFacilitiesOnce() {
        if (initialLoaded) return;
        initialLoaded = true;

        mainList.style.pointerEvents = "none";
        renderFacilitySkeleton(15);

        try {
            const facilities = await fetchJsonSafe("/api/admin/facilities");
            mainList.innerHTML = "";
            facilities.forEach(f => mainList.appendChild(renderFacility(f)));
            sortFacilitiesByCategory(true);
        } catch (err) {
            console.error("Failed to load facilities:", err);
        } finally {
            mainList.style.pointerEvents = "auto";
        }
    }

    document.addEventListener("click", e => {
    const addBtn = e.target.closest("#openAddFacility");
    if (!addBtn) return;

    e.preventDefault();
    addForm.reset();
    addPreview.innerHTML = "";
    if (addForm.ImageFiles) addForm.ImageFiles._accumulatedFiles = [];
    addHomeIndexHidden.value = "None";
    handleCategory(addCategory.value, addRoomToggle.parentElement, addPriceGroup, addCapacityMinGroup, addCapacityMaxGroup, addVenueFeaturesGroup, addAmenityFeaturesGroup);
    toggleVenueRequirements(addForm, addCategory.value === "Venue");
    addModal.show();
 });

    // SIGNALR
    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/hotelhub", {
        transport: signalR.HttpTransportType.LongPolling,
            accessTokenFactory: () => {
                const token = localStorage.getItem("adminToken");
                console.log("Connecting to SignalR with token:", token ? "Token Found" : "Token Missing");
                return token;
            }
        })
        .withAutomaticReconnect()
        .build();

    connection.on("FacilityAdded", f => {
        console.log("Real-time: Facility Added", f);
        const newItem = renderFacility(f);
        if (!mainList.querySelector(`[data-id="${f.facilityId}"]`)) {
            mainList.appendChild(newItem);
            sortFacilitiesByCategory(sortAscending);
        }
    });

    connection.on("FacilityUpdated", f => {
        console.log("Real-time: Facility Updated", f);
        const old = mainList.querySelector(`[data-id="${f.facilityId}"]`);
        const fresh = renderFacility(f);
        old ? mainList.replaceChild(fresh, old) : mainList.prepend(fresh);
    });

    connection.on("FacilityDeleted", id => {
        console.log("Real-time: Facility Deleted", id);
        mainList.querySelector(`[data-id="${id}"]`)?.remove();
    });

    connection.start()
        .then(() => console.log("SignalR Connected successfully!"))
        .catch(err => console.error("SignalR failed to connect. Check if your token is valid.", err));

    // ADD FACILITY
    addForm.addEventListener("submit", async e => {
        e.preventDefault();

        if (!addForm.checkValidity()) {
            addForm.reportValidity();
            return;
        }

        if (addCategory.value !== "Venue") {
            const capMin = addForm.querySelector("[name='CapacityMin']");
            const capMax = addForm.querySelector("[name='CapacityMax']");
            if (capMin) capMin.value = "";
            if (capMax) capMax.value = "";
        }

        addRoomHidden.value = normalizeRoomType(addRoomHidden.value);
        addRoomToggle?.querySelectorAll(".toggle-option").forEach(b => b.classList.remove("active"));
        [...addForm.querySelectorAll(".price-input")].forEach(i => i.value = i.value.replace(/,/g, ""));

        const formData = new FormData(addForm);

        try {
            const res = await fetch("/api/admin/facility", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
                },
                body: formData
            });

            if (res.status === 401) {
                showToast("Session expired. Please log in again.", "danger");
                window.location.href = "/StaffLogin";
                return;
            }

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || "Add facility failed");
            }

            addForm.reset();
            addPreview.innerHTML = "";
            if (addForm.ImageFiles) addForm.ImageFiles._accumulatedFiles = []; 
            addModal.hide();
            showToast("Facility added successfully", "success");
        } catch (err) {
            console.error("Add Error:", err);
            showToast(`Failed to add facility: ${err.message}`, "danger");
        }
    });

    // EDIT FACILITY
    editForm.addEventListener("submit", async e => {
        e.preventDefault();

        if (!editForm.checkValidity()) {
            editForm.reportValidity();
            return;
        }

        editRoomHidden.value = normalizeRoomType(editRoomHidden.value);
        [...editForm.querySelectorAll(".price-input")].forEach(i => i.value = i.value.replace(/,/g, ""));

        const id = editForm.querySelector("#editFacilityId").value;
        const formData = new FormData(editForm);

        editForm.querySelectorAll("input[name='RemovedImageIds']").forEach(input => {
            if (input.value) formData.append("RemovedImageIds", input.value);
        });

        try {
            const res = await fetch(`/api/admin/facility/${id}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
                },
                body: formData
            });

            if (res.status === 401) {
                showToast("Session expired. Please log in again.", "danger");
                window.location.href = "/StaffLogin";
                return;
            }

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || "Update failed");
            }

            editForm.reset();
            editPreview.innerHTML = "";
            existingPreview.innerHTML = "";
            if (editForm.NewImages) editForm.NewImages._accumulatedFiles = [];
            editModal.hide();
            showToast("Facility updated successfully", "success");

            if (typeof loadFacilitiesOnce === "function") loadFacilitiesOnce();
        } catch (err) {
            console.error("Edit Error:", err);
            showToast(`Failed to edit the facility: ${err.message}`, "danger");
        }
    });

    function renderFacilitySkeleton(count = 5) {
        mainList.innerHTML = "";
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement("div");
            skeleton.className = "list-group-item update-item";
            skeleton.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="skeleton-thumb me-2"></div>
                    <div class="flex-grow-1">
                        <div class="skeleton-line mb-1"></div>
                        <div class="skeleton-line short"></div>
                    </div>
                </div>
                <div class="skeleton-line button-skeleton"></div>
            `;
            mainList.appendChild(skeleton);
        }
    }

    mainList.addEventListener("click", async e => {
        const editBtn = e.target.closest(".btn-edit-facility");
        const delBtn = e.target.closest(".btn-delete-facility");
        const undoBtn = e.target.closest(".btn-undo-facility");

        if (editBtn) {
            const item = editBtn.closest(".update-item");
            if (!item) return;
            existingPreview.innerHTML = "";
            editPreview.innerHTML = "";
            editForm.querySelector("#editFacilityId").value = item.dataset.id;
            editForm.querySelector("#editFacilityName").value = item.dataset.name;
            editForm.querySelector("#editFacilityDescription").value = item.dataset.description;
            editForm.querySelector("#editFacilityCategory").value = item.dataset.category;
            editForm.querySelector("#editFacilityPrice").value = safeNumber(item.dataset.price);
            editHomeIndexHidden.value = item.dataset.homeIndexCategory || "None";
            editForm.querySelector("#editCapacityMin").value = item.dataset.capacityMin || "";
            editForm.querySelector("#editCapacityMax").value = item.dataset.capacityMax || "";
            editForm.querySelector("[name='Feature1']").value = item.dataset.feature1 || "";
            editForm.querySelector("[name='Feature2']").value = item.dataset.feature2 || "";
            editForm.querySelector("[name='Meta']").value = item.dataset.meta || "";

            handleCategory(item.dataset.category, editRoomToggle.parentElement, editPriceGroup, editCapacityMinGroup, editCapacityMaxGroup, editVenueFeaturesGroup, editAmenityFeaturesGroup);

            if (item.dataset.category === "Room") {
                const currentBadge = item.dataset.homeIndexCategory || "None";
                editHomeIndexHidden.value = currentBadge;
                editRoomTypeSelect.value = currentBadge;
                editRoomToggle.querySelectorAll(".toggle-option").forEach(btn => {
                    btn.classList.remove("active");
                    if (btn.dataset.roomType === currentBadge) btn.classList.add("active");
                });
            }

            const imgIds = (item.dataset.imageIds || "").split(",");
            const srcImages = (item.dataset.images || "").split(",").filter(s => s.trim());

            srcImages.forEach((src, index) => {
                const imgId = imgIds[index] || "";
                const container = document.createElement("div");
                container.className = "image-thumb-container";
                container.dataset.imageId = imgId;

                const img = document.createElement("img");
                img.className = "thumb";
                img.src = src.startsWith("http") ? src : `${window.location.origin}/${src.replace(/^\/+/, '')}`;

                const removeBtn = document.createElement("span");
                removeBtn.className = "image-thumb-remove";
                removeBtn.innerHTML = "&times;";
                removeBtn.addEventListener("click", () => {
                    container.remove();
                    const hidden = document.createElement("input");
                    hidden.type = "hidden";
                    hidden.name = "RemovedImageIds";
                    hidden.value = container.dataset.imageId;
                    editForm.appendChild(hidden);
                });

                container.appendChild(img);
                container.appendChild(removeBtn);
                existingPreview.appendChild(container);
            });

            toggleVenueRequirements(editForm, item.dataset.category === "Venue");
            editModal.show();
            return;
        }

        if (delBtn) {
            if (!confirm("Delete this facility?")) return;

            try {
                const token = localStorage.getItem("adminToken");
                const res = await fetch(`/api/admin/facility/${delBtn.dataset.id}/delete`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (res.status === 401) {
                    showToast("Session expired. Please log in again.", "danger");
                    window.location.href = "/StaffLogin";
                    return;
                }

                if (!res.ok) throw new Error(await res.text());

                delBtn.closest(".update-item")?.remove();
                showToast("Facility deleted successfully", "success");
            } catch (err) {
                console.error(err);
                showToast("Failed to delete facility", "danger");
            }
            return;
        }

        if (undoBtn) {
            try {
                const id = undoBtn.dataset.id;
                const restored = await fetchJsonSafe(`/api/admin/facility/${id}/undo`, {
                    method: "POST"
                });

                const oldItem = mainList.querySelector(`[data-id="${id}"]`);
                const newItem = renderFacility(restored);
                oldItem ? mainList.replaceChild(newItem, oldItem) : mainList.prepend(newItem);
                showToast("Facility restored successfully", "success");
            } catch (err) {
                console.error(err);
                showToast("Failed to restore facility", "danger");
            }
        }
    });

    // RESTORE UNDO MODAL
    document.getElementById("openRestoreUndo").addEventListener("click", async e => {
        e.preventDefault();
        restoreUndoList.innerHTML = "";

        try {
            const deleted = await fetchJsonSafe("/api/admin/facilities/deleted");

            deleted.forEach(f => {
                const item = document.createElement("div");
                item.className = "list-group-item update-item d-flex justify-content-between align-items-center";
                item.dataset.id = f.facilityId;
                item.dataset.name = f.name || "";
                item.dataset.description = f.description || "";
                item.dataset.category = f.category || "";
                item.dataset.roomType = f.roomType || "";
                item.dataset.homeIndexCategory = f.homeIndexCategory || f.badge || "";
                item.dataset.price = safeNumber(f.price);
                item.dataset.images = (f.images || []).map(i => i.imagePath).join(",");

                const priceText = (f.category === "Amenity" || !f.price)
                    ? f.category
                    : "₱" + Number(f.price).toLocaleString("en-PH") + " — " + f.category;

                const badgeHtml = f.homeIndexCategory ? getHomeIndexBadge(f.homeIndexCategory) : "";

                const leftDiv = document.createElement("div");
                leftDiv.className = "d-flex align-items-center";

                const previewContainer = document.createElement("div");
                previewContainer.className = "d-flex flex-wrap me-2";
                const firstImage = f.images?.[0]?.imagePath;
                if (firstImage) {
                    const container = document.createElement("div");
                    container.className = "image-thumb-container me-2";
                    const img = document.createElement("img");
                    img.className = "thumb";
                    img.src = firstImage;
                    container.appendChild(img);
                    previewContainer.appendChild(container);
                }

                leftDiv.appendChild(previewContainer);

                const infoDiv = document.createElement("div");
                infoDiv.innerHTML = `<div><strong>${f.name}</strong>${badgeHtml}</div>
                                     <div class="small text-muted">${priceText}</div>`;
                leftDiv.appendChild(infoDiv);

                const actionDiv = document.createElement("div");
                const undoBtn = document.createElement("button");
                undoBtn.type = "button";
                undoBtn.className = "btn btn-sm btn-success btn-undo-facility";
                undoBtn.dataset.id = f.facilityId;
                undoBtn.textContent = "Undo";
                actionDiv.appendChild(undoBtn);

                item.appendChild(leftDiv);
                item.appendChild(actionDiv);
                restoreUndoList.appendChild(item);
            });

            bootstrap.Modal.getOrCreateInstance(restoreUndoModalEl).show();
        } catch (err) {
            console.error(err);
            showToast("Failed to load deleted facilities", "danger");
        }
    });

    restoreUndoList.addEventListener("click", async e => {
        const undoBtn = e.target.closest(".btn-undo-facility");
        if (!undoBtn) return;

        try {
            const id = undoBtn.dataset.id;
            const restored = await fetchJsonSafe(`/api/admin/facility/${id}/undo`, {
                method: "POST"
            });

            const oldItem = mainList.querySelector(`[data-id="${id}"]`);
            const newItem = renderFacility(restored);
            oldItem ? mainList.replaceChild(newItem, oldItem) : mainList.prepend(newItem);

            undoBtn.closest(".update-item")?.remove();
            showToast("Facility restored successfully", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to restore facility", "danger");
        }
    });

    loadFacilitiesOnce();
});