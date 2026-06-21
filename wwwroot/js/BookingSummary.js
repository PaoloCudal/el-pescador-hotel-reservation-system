document.addEventListener("DOMContentLoaded", () => {
    const rawData = sessionStorage.getItem("bookingSummary");

    if (!rawData) {
        console.warn("No booking data found.");
        return;
    }

    try {
        const summary = JSON.parse(rawData);

      
        const updates = {
            "resRef": summary.bookingReference,
            "resFacility": summary.facilityName,
            "resDates": `${new Date(summary.checkIn).toLocaleDateString()} - ${new Date(summary.checkOut).toLocaleDateString()}`,
            "resPayment": summary.paymentType,
            "resStatus": summary.status,
            "resPrice": `₱${summary.totalCost.toLocaleString()}`,
            "resDetails": summary.priceDetails
        };

        for (const [id, value] of Object.entries(updates)) {
            const el = document.getElementById(id);
            if (el && value !== undefined) {
                el.innerText = value;
            }
        }
    } catch (err) {
        console.error("Error parsing booking data:", err);
    }
});