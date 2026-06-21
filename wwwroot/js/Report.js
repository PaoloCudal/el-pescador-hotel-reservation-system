const token = localStorage.getItem('adminToken');

async function downloadFile(url, filename) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.classList.remove('d-none');

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/pdf',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            alert('Failed to generate report.');
            return;
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);

    } catch (err) {
        console.error(err);
        alert('An error occurred while generating the report.');
    } finally {
        spinner.classList.add('d-none');
    }
}

function getDates() {
    const from = document.getElementById('fromDate').value;
    const to = document.getElementById('toDate').value;

    if (!from || !to) {
        alert('Please select both From and To dates.');
        throw 'Missing dates';
    }
    return { from, to };
}

function downloadFinancial() {
    const { from, to } = getDates();
    downloadFile(`/api/admin/reports/financial?from=${from}&to=${to}`, `Financial_Report_${from}_${to}.pdf`);
}

function downloadBooking() {
    const { from, to } = getDates();
    downloadFile(`/api/admin/reports/bookings?from=${from}&to=${to}`, `Booking_Report_${from}_${to}.pdf`);
}

function downloadOccupancy() {
    const { from, to } = getDates();
    downloadFile(`/api/admin/reports/occupancy?from=${from}&to=${to}`, `Occupancy_Report_${from}_${to}.pdf`);
}