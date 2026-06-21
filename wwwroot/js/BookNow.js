const params = new URLSearchParams(window.location.search);

const roomTypeIdEl = document.getElementById("roomTypeId");
const venueIdEl = document.getElementById("venueId");
const facilityIdEl = document.getElementById("facilityId");

const liveTotalCostEl = document.getElementById("liveTotalCost");
const livePriceDetailsEl = document.getElementById("livePriceDetails");

const checkInEl = document.getElementById("checkIn");
const checkOutEl = document.getElementById("checkOut");
const specialRequestEl = document.getElementById("specialRequest");

const submitBtn = document.getElementById("submitBookingBtn");
const btnText = document.getElementById("btnText");
const btnSpinner = document.getElementById("btnSpinner");

const urlCheckIn = params.get("checkIn");
const urlCheckOut = params.get("checkOut");

roomTypeIdEl.value = params.get("roomTypeId") || "";
venueIdEl.value = params.get("venueId") || "";
facilityIdEl.value = params.get("facilityId") || "";

const isRoom = !!roomTypeIdEl.value;
const isVenue = !roomTypeIdEl.value && !!venueIdEl.value;

const roomPrice = parseFloat(params.get("roomPrice")) || 0;
const venuePrice = parseFloat(params.get("venuePrice")) || 0;

if (urlCheckIn) checkInEl.value = urlCheckIn;
if (urlCheckOut) checkOutEl.value = urlCheckOut;

if (urlCheckIn) checkOutEl.setAttribute("min", urlCheckIn);

function paymentTypeEl() {
    const el = document.querySelector('input[name="paymentType"]:checked');
    return el ? el.value : "Cash";
}

function computeNights(checkIn, checkOut) {
    const diff = new Date(checkOut) - new Date(checkIn);
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const today = new Date().toISOString().split("T")[0];

checkInEl.setAttribute("min", today);
checkOutEl.setAttribute("min", today);

checkInEl.addEventListener("change", () => {
    if (checkInEl.value) {
        checkOutEl.setAttribute("min", checkInEl.value);

        if (checkOutEl.value && checkOutEl.value < checkInEl.value) {
            checkOutEl.value = checkInEl.value;
        }
    }
    updatePricePreview();
});

checkOutEl.addEventListener("change", updatePricePreview);

let previewTimeout = null;

/* =========================
   PRICE PREVIEW
========================= */
async function updatePricePreview() {
    const checkIn = checkInEl.value;
    const checkOut = checkOutEl.value;

    if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
        return;
    }

    const nights = computeNights(checkIn, checkOut);

    if (isRoom) {
        liveTotalCostEl.innerText = `₱${(roomPrice * nights).toLocaleString()}`;
        livePriceDetailsEl.innerText = `₱${roomPrice.toLocaleString()} × ${nights} night(s)`;
    } else if (isVenue) {
        liveTotalCostEl.innerText = `₱${(venuePrice * nights).toLocaleString()}`;
        livePriceDetailsEl.innerText = `₱${venuePrice.toLocaleString()} × ${nights} day(s)`;
    }

    clearTimeout(previewTimeout);

    previewTimeout = setTimeout(async () => {
        try {
            const payload = {
                RoomTypeId: isRoom && roomTypeIdEl.value ? Number(roomTypeIdEl.value) : null,
                VenueId: isVenue && venueIdEl.value ? Number(venueIdEl.value) : null,
                CheckIn: checkIn,
                CheckOut: checkOut,
                PaymentType: paymentTypeEl()
            };

            const response = await fetch("/api/booking/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "include"
            });

            if (!response.ok) return;

            const data = await response.json();

            liveTotalCostEl.innerText = `₱${data.totalCost.toLocaleString()}`;
            livePriceDetailsEl.innerText = data.priceDetails;

        } catch (err) {
            console.error("Preview error:", err);
        }
    }, 400);
}

/* =========================
   AUTH CHECK (IMPORTANT FIX)
========================= */
async function checkAuth() {
    try {
        const res = await fetch("/api/auth/me", {
            credentials: "include"
        });

        const data = await res.json();
        return data.isAuthenticated === true;
    } catch {
        return false;
    }
}

/* =========================
   AVAILABILITY CHECK
========================= */
async function validateAvailability() {
    if (!checkInEl.value || !checkOutEl.value) return true;

    try {
        const url = isRoom
            ? `/api/customer/availability/check?roomTypeId=${roomTypeIdEl.value}&checkIn=${checkInEl.value}&checkOut=${checkOutEl.value}`
            : `/api/customer/availability/check-venue?facilityId=${facilityIdEl.value}&venueId=${venueIdEl.value}&checkIn=${checkInEl.value}&checkOut=${checkOutEl.value}`;

        const res = await fetch(url, { credentials: "include" });

        if (!res.ok) return false;

        const data = await res.json();
        return data.available === true;

    } catch (err) {
        console.error("Availability check failed:", err);
        return false;
    }
}

/* =========================
   INIT
========================= */
updatePricePreview();

/* =========================
   SUBMIT BOOKING (FIXED)
========================= */
document.getElementById("bookingForm")?.addEventListener("submit", async function (e) {
    e.preventDefault();

    // 🔥 PREVENT 500 CAUSED BY NOT LOGGED IN
    const isLoggedIn = await checkAuth();

    if (!isLoggedIn) {
        alert("Please login first before booking.");
        window.location.href = "/UserLogin";
        return;
    }

    const payload = {
        RoomTypeId: isRoom && roomTypeIdEl.value ? Number(roomTypeIdEl.value) : null,
        VenueId: isVenue && venueIdEl.value ? Number(venueIdEl.value) : null,
        CheckIn: checkInEl.value,
        CheckOut: checkOutEl.value,
        SpecialRequest: specialRequestEl.value || "",
        PaymentType: paymentTypeEl()
    };

    if (!payload.CheckIn || !payload.CheckOut) {
        alert("Please select valid check-in and check-out dates.");
        return;
    }

    if (!(await validateAvailability())) {
        alert(isRoom ? "Selected room is not available." : "Selected venue is not available.");
        return;
    }

    submitBtn.disabled = true;
    btnText.textContent = "Processing...";
    btnSpinner.classList.remove("d-none");

    try {
        const response = await fetch("/api/booking/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "include"
        });

        if (!response.ok) {
            const err = await response.json().catch(() => null);

            alert(err?.message || "Booking failed.");

            submitBtn.disabled = false;
            btnText.textContent = "Submit Booking";
            btnSpinner.classList.add("d-none");
            return;
        }

        const summary = await response.json();

        sessionStorage.setItem("bookingSummary", JSON.stringify(summary));

        window.location.href = "/BookingSummary";

    } catch (err) {
        console.error("Booking error:", err);

        alert("Something went wrong.");

        submitBtn.disabled = false;
        btnText.textContent = "Submit Booking";
        btnSpinner.classList.add("d-none");
    }
});