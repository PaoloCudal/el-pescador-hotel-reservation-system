function showBookingSkeleton(rows = 6) {
    const tbody = document.querySelector('#bookingTable tbody');
    tbody.innerHTML = '';

    for (let i = 0; i < rows; i++) {
        const tr = document.createElement('tr');
        tr.classList.add('skeleton-row');
        tr.innerHTML = `
            <td><div class="skeleton"></div></td>
            <td><div class="skeleton"></div></td>
            <td><div class="skeleton"></div></td>
            <td><div class="skeleton badge"></div></td>
            <td><div class="skeleton button"></div></td>
        `;
        tbody.appendChild(tr);
    }
}

const token = localStorage.getItem("adminToken");

async function loadBookingManagement() {
    showBookingSkeleton();

    try {
        const res = await fetch('/api/admin/bookings', {
            headers: {
                'Authorization': `Bearer ${token || ''}`,
                'Accept': 'application/json'
            }
        });

        if (!res.ok) {
            const tbody = document.querySelector('#bookingTable tbody');
            if (res.status === 401) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Unauthorized: Please log in as an administrator.</td></tr>`;
            } else {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load data (Status: ${res.status}).</td></tr>`;
            }
            return;
        }

        const bookings = await res.json();
        const tbody = document.querySelector('#bookingTable tbody');
        tbody.innerHTML = '';

        bookings.forEach(b => {
            if (b.bookingStatus === 'Cancelled') return;

            let statusText = '';
            let statusClass = '';

            if (b.bookingStatus === 'Approved' || b.isOccupied) {
                statusClass = 'badge-occupied';
                if (b.startDate && b.endDate) {
                    statusText = `<span class="badge ${statusClass}" data-bs-toggle="tooltip" title="From ${b.startDate} to ${b.endDate}">Occupied</span>`;
                } else {
                    statusText = `<span class="badge ${statusClass}">Occupied</span>`;
                }
            } else if (b.bookingStatus === 'Pending') {
                statusClass = 'badge-pending';
                statusText = `<span class="badge ${statusClass}">Pending</span>`;
            }

            let actionHtml = '';

            if (b.bookingStatus === 'Approved') {
                actionHtml = `<span class="badge badge-approved">Approved</span>`;
            } else if (b.bookingStatus === 'Pending' && !b.isOccupied) {
                actionHtml = `
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-accept" data-id="${b.bookingId}">Accept</button>
                        <button class="btn btn-sm btn-reject" data-id="${b.bookingId}">Reject</button>
                    </div>
                `;
            }

            if (!actionHtml.trim()) return;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="searchable">${escapeHtml(b.bookingReference)}</span></td>
                <td><span class="searchable">${escapeHtml(b.facilityCategory)}</span></td>
                <td><span class="searchable">${escapeHtml(b.facilityName)}</span></td>
                <td>${statusText}</td>
                <td>${actionHtml}</td>
            `;

            tbody.appendChild(row);
            row.querySelectorAll('.searchable').forEach(span => {
                span.dataset.originalText = span.textContent;
            });
        });

        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(el => {
            if (el._tooltip) el._tooltip.dispose();
            el._tooltip = new bootstrap.Tooltip(el, {
                trigger: 'hover',
                placement: 'top',
                container: 'body'
            });
        });

        document.querySelectorAll('.btn-accept').forEach(btn => {
            btn.addEventListener('click', async () => {
                const bookingId = btn.dataset.id;

                const result = await Swal.fire({
                    title: 'Are you sure?',
                    text: "Do you want to approve this booking?",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#1E3A8A',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes, approve it!',
                    cancelButtonText: 'Cancel'
                });

                if (result.isConfirmed) {
                    try {
                        const res = await fetch(`/api/admin/booking/${bookingId}/approve`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token || ''}` }
                        });

                        if (res.ok) {
                            Swal.fire({
                                title: 'Approved!',
                                text: 'Booking has been approved.',
                                icon: 'success',
                                confirmButtonColor: '#1E3A8A'
                            });
                            loadBookingManagement();
                        } else {
                            const data = await res.json();
                            Swal.fire({
                                title: 'Error',
                                text: data.message || 'Failed to approve booking',
                                icon: 'error',
                                confirmButtonColor: '#1E3A8A'
                            });
                        }
                    } catch (err) {
                        console.error('Approve error:', err);
                        Swal.fire({
                            title: 'Error',
                            text: 'Something went wrong!',
                            icon: 'error',
                            confirmButtonColor: '#1E3A8A'
                        });
                    }
                }
            });
        });

        document.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', async () => {
                const bookingId = btn.dataset.id;

                const result = await Swal.fire({
                    title: 'Are you sure?',
                    text: "Do you want to reject this booking?",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, reject it!',
                    cancelButtonText: 'Cancel'
                });

                if (result.isConfirmed) {
                    try {
                        const res = await fetch(`/api/admin/booking/${bookingId}/reject`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token || ''}` }
                        });

                        if (res.ok) {
                            Swal.fire({
                                title: 'Rejected!',
                                text: 'Booking has been successfully rejected.',
                                icon: 'success',
                                confirmButtonColor: '#1E3A8A'
                            });
                            loadBookingManagement();
                        } else {
                            const data = await res.json();
                            Swal.fire({
                                title: 'Error',
                                text: data.message || 'Failed to reject booking',
                                icon: 'error',
                                confirmButtonColor: '#1E3A8A'
                            });
                        }
                    } catch (err) {
                        console.error('Reject error:', err);
                        Swal.fire({
                            title: 'Error',
                            text: 'Something went wrong!',
                            icon: 'error',
                            confirmButtonColor: '#1E3A8A'
                        });
                    }
                }
            });
        });

    } catch (err) {
        console.error('Error loading booking management:', err);
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(cell, keyword) {
    const originalText = cell.dataset.originalText;
    if (!keyword) {
        cell.textContent = originalText;
        return;
    }
    const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
    cell.innerHTML = originalText.replace(regex, `<span class="search-highlight">$1</span>`);
}

let sortAscending = true;

function sortBookingsByCategoryAndName(data, ascending = true) {
    return [...data].sort((a, b) => {
        const dir = ascending ? 1 : -1;
        const catCompare = a.facilityCategory.localeCompare(b.facilityCategory);
        if (catCompare !== 0) return catCompare * dir;
        return a.facilityName.localeCompare(b.facilityName) * dir;
    });
}

let notifications = [];
let unreadCount = 0;

function updateBadge() {
    const notifBadge = document.getElementById('notifBadge');
    if (!notifBadge) return;
    if (unreadCount > 0) {
        notifBadge.classList.remove('d-none');
        notifBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    } else {
        notifBadge.classList.add('d-none');
    }
}

// ─── UPDATED TO DIRECTLY TARGET CLEAN CAMELCASE PAYLOAD KEYS ───
function renderNotifications() {
    const notifList = document.getElementById('notifList');
    const notifDropdown = document.getElementById('notifDropdown');
    if (!notifList) return;

    notifList.innerHTML = '';

    if (!notifications.length) {
        notifList.innerHTML = `
            <li class="list-group-item text-muted text-center small py-3">
                <i class="bi bi-bell-slash d-block fs-4 mb-1"></i>
                No new notifications
            </li>`;
        return;
    }

    notifications.forEach((n, i) => {
        const ref   = n.bookingReference || '';
        const name  = n.facilityName || '';
        const start = n.checkIn || '';
        const end   = n.checkOut || '';
        const pay   = n.paymentType || '';
        const time  = n.createdAt || '';

        const li = document.createElement('li');
        li.className = `list-group-item list-group-item-action py-2 ${n.isNew ? 'bg-light' : ''}`;
        li.style.cursor = 'pointer';
        li.innerHTML = `
           <div class="d-flex justify-content-between align-items-start gap-2">
    <div class="flex-grow-1" style="min-width:0;">
        <div class="d-flex align-items-center gap-1">
            ${n.isNew ? `<span style="width:8px;height:8px;border-radius:50%;background:#0d6efd;display:inline-block;flex-shrink:0;"></span>` : '<span style="width:8px;height:8px;display:inline-block;flex-shrink:0;"></span>'}
            <span class="small ${n.isNew ? 'fw-bold text-dark' : 'fw-normal text-secondary'}">${escapeHtml(ref)}</span>
        </div>
        <div class="${n.isNew ? 'fw-semibold text-dark' : 'text-muted'} small ms-3">${escapeHtml(name)}</div>
        <div class="small text-secondary ms-3">${escapeHtml(start)} → ${escapeHtml(end)}</div>
        <div class="small text-primary ms-3">${escapeHtml(pay)}</div>
    </div>
    <div class="d-flex flex-column align-items-end gap-1 flex-shrink-0">
        <button class="btn p-0 border-0 bg-transparent text-danger delete-notif-btn"
                title="Remove notification"
                style="font-size:0.8rem; line-height:1;">
            <i class="bi bi-trash3"></i>
        </button>
    </div>
</div>`;

        li.querySelector('.delete-notif-btn').addEventListener('click', (e) => {
            e.stopPropagation();

            if (notifications[i].isNew) {
                unreadCount = Math.max(0, unreadCount - 1);
                updateBadge();
            }

            const readRefs = JSON.parse(localStorage.getItem('readNotifRefs') || '[]');
            const updated = readRefs.filter(r => r !== ref);
            localStorage.setItem('readNotifRefs', JSON.stringify(updated));

            notifications.splice(i, 1);
            renderNotifications();
        });

        li.addEventListener('click', async () => {
            if (notifications[i].isNew) {
                notifications[i].isNew = false;
                unreadCount = Math.max(0, unreadCount - 1);
                updateBadge();

                const readRefs = JSON.parse(localStorage.getItem('readNotifRefs') || '[]');
                if (!readRefs.includes(ref)) {
                    readRefs.push(ref);
                    localStorage.setItem('readNotifRefs', JSON.stringify(readRefs));
                }

                renderNotifications();
            }

            if (notifDropdown) notifDropdown.style.display = 'none';

            const result = await Swal.fire({
                title: `Booking: ${escapeHtml(ref)}`,
                html: `
                    <div class="text-start">
                        <p class="mb-1"><strong>Facility:</strong> ${escapeHtml(name)}</p>
                        <p class="mb-1"><strong>Check-In:</strong> ${escapeHtml(start)}</p>
                        <p class="mb-1"><strong>Check-Out:</strong> ${escapeHtml(end)}</p>
                        <p class="mb-0"><strong>Payment:</strong> ${escapeHtml(pay)}</p>
                    </div>
                `,
                icon: 'info',
                showCloseButton: true,
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: 'Approve',
                denyButtonText: 'Reject',
                cancelButtonText: 'Close',
                confirmButtonColor: '#1E3A8A',
                denyButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                reverseButtons: false
            });

            if (result.isConfirmed) {
                await handleApproveFromNotif(ref);
            } else if (result.isDenied) {
                await handleRejectFromNotif(ref);
            }
        });

        notifList.appendChild(li);
    });
}

async function handleApproveFromNotif(bookingReference) {
    try {
        const bookingRes = await fetch('/api/admin/bookings', {
            headers: { 'Authorization': `Bearer ${token || ''}` }
        });
        const bookings = await bookingRes.json();
        const booking = bookings.find(b => b.bookingReference === bookingReference);
        if (!booking) {
            Swal.fire({ icon: 'error', title: 'Booking not found' });
            return;
        }

        const res = await fetch(`/api/admin/booking/${booking.bookingId}/approve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token || ''}` }
        });

        if (res.ok) {
            notifications = notifications.filter(n => n.bookingReference !== bookingReference);
            const readRefs = JSON.parse(localStorage.getItem('readNotifRefs') || '[]');
            const updated = readRefs.filter(r => r !== bookingReference);
            localStorage.setItem('readNotifRefs', JSON.stringify(updated));

            updateBadge();
            renderNotifications();
            loadBookingManagement();
            Swal.fire({
                icon: 'success',
                title: 'Approved!',
                text: 'Booking has been approved.',
                confirmButtonColor: '#1E3A8A'
            });
        } else {
            const data = await res.json();
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to approve' });
        }
    } catch (err) {
        console.error('Approve from notif error:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Something went wrong!' });
    }
}

async function handleRejectFromNotif(bookingReference) {
    try {
        const bookingRes = await fetch('/api/admin/bookings', {
            headers: { 'Authorization': `Bearer ${token || ''}` }
        });
        const bookings = await bookingRes.json();
        const booking = bookings.find(b => b.bookingReference === bookingReference);
        if (!booking) {
            Swal.fire({ icon: 'error', title: 'Booking not found' });
            return;
        }

        const res = await fetch(`/api/admin/booking/${booking.bookingId}/reject`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token || ''}` }
        });

        if (res.ok) {
            notifications = notifications.filter(n => n.bookingReference !== bookingReference);
            const readRefs = JSON.parse(localStorage.getItem('readNotifRefs') || '[]');
            const updated = readRefs.filter(r => r !== bookingReference);
            localStorage.setItem('readNotifRefs', JSON.stringify(updated));

            updateBadge();
            renderNotifications();
            loadBookingManagement();
            Swal.fire({
                icon: 'success',
                title: 'Rejected!',
                text: 'Booking has been rejected.',
                confirmButtonColor: '#1E3A8A'
            });
        } else {
            const data = await res.json();
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to reject' });
        }
    } catch (err) {
        console.error('Reject from notif error:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Something went wrong!' });
    }
}

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/hotelhub", {
        transport: signalR.HttpTransportType.LongPolling,
        accessTokenFactory: () => localStorage.getItem("adminToken") || "",
        transport: signalR.HttpTransportType.LongPolling
    })
    .withAutomaticReconnect()
    .build();

// ─── UPDATED TO DIRECTLY TARGET CLEAN CAMELCASE PAYLOAD KEYS ───
connection.on("NewBookingRequest", (data) => {
    notifications.unshift({ ...data, isNew: true });
    unreadCount++;
    updateBadge();
    renderNotifications();

    const ref   = data.bookingReference || '';
    const name  = data.facilityName || '';
    const start = data.checkIn || '';
    const end   = data.checkOut || '';

    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'New booking request!',
        html: `<strong>${escapeHtml(ref)}</strong><br>${escapeHtml(name)}<br>${escapeHtml(start)} → ${escapeHtml(end)}`,
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true
    });
});

async function startSignalR() {
    try {
        if (connection.state === signalR.HubConnectionState.Disconnected) {
            await connection.start();
        }
        await connection.invoke("JoinAdminGroup");
        console.log("SignalR connected to admin group");
    } catch (err) {
        console.error("SignalR failed:", err);
        if (connection.state === signalR.HubConnectionState.Disconnected) {
            setTimeout(startSignalR, 5000);
        }
    }
}

async function loadPendingNotifications() {
    try {
        const res = await fetch('/api/admin/bookings/notifications', {
            headers: { 'Authorization': `Bearer ${token || ''}` }
        });

        if (!res.ok) return;

        const data = await res.json();
        if (!data.length) return;

        const readRefs = JSON.parse(localStorage.getItem('readNotifRefs') || '[]');

        notifications = data.map(n => ({
            bookingReference: n.bookingReference,
            facilityName: n.facilityName,
            checkIn: n.checkIn,
            checkOut: n.checkOut,
            paymentType: n.paymentType,
            createdAt: n.createdAt,
            isNew: !readRefs.includes(n.bookingReference)
        }));

        unreadCount = notifications.filter(n => n.isNew).length;
        updateBadge();
        renderNotifications();

    } catch (err) {
        console.error('Failed to load pending notifications:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadBookingManagement();
    loadPendingNotifications();
    startSignalR();

    const notifBtn      = document.getElementById('notifBtn');
    const notifBadge    = document.getElementById('notifBadge');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifList     = document.getElementById('notifList');
    const clearNotifsBtn = document.getElementById('clearNotifsBtn');

    notifDropdown.style.display = 'none';

    notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (notifDropdown.style.display === 'none') {
        notifDropdown.style.display = 'block';
        renderNotifications();
    } else {
        notifDropdown.style.display = 'none';
    }
  });

    document.addEventListener('click', (e) => {
        const wrapper = document.getElementById('notifWrapper');
        if (wrapper && !wrapper.contains(e.target)) {
            notifDropdown.style.display = 'none';
        }
    });

    clearNotifsBtn.addEventListener('click', () => {
    notifications = [];
    unreadCount = 0;
    localStorage.removeItem('readNotifRefs');
    updateBadge();
    renderNotifications();
   });

    const searchInput = document.getElementById('bookingSearch');
    searchInput.addEventListener('input', function () {
        const rawQuery = this.value.trim();
        const query = rawQuery.toLowerCase();
        const rows = document.querySelectorAll('#bookingTable tbody tr');

        rows.forEach(row => {
            const cells = row.querySelectorAll('.searchable');
            let rowMatches = false;
            cells.forEach(cell => {
                const text = cell.dataset.originalText || cell.textContent;
                if (text.toLowerCase().includes(query)) {
                    rowMatches = true;
                    highlightText(cell, rawQuery);
                } else {
                    highlightText(cell, '');
                }
            });
            row.style.display = rowMatches ? '' : 'none';
        });
    });

    const sortBtn = document.getElementById("sortCategoryBtn");
    sortBtn.addEventListener("click", () => {
        sortAscending = !sortAscending;
        const tbody = document.querySelector("#bookingTable tbody");
        const rows = Array.from(tbody.querySelectorAll("tr"));

        const rowData = rows.map(row => ({
            rowEl: row,
            facilityCategory: row.cells[1].textContent.trim(),
            facilityName: row.cells[2].textContent.trim()
        }));

        rowData.sort((a, b) => {
            const dir = sortAscending ? 1 : -1;
            const catCompare = a.facilityCategory.localeCompare(b.facilityCategory);
            if (catCompare !== 0) return catCompare * dir;
            return a.facilityName.localeCompare(b.facilityName) * dir;
        });

        rowData.forEach(item => tbody.appendChild(item.rowEl));

        sortBtn.querySelector(".sort-text").textContent = sortAscending
            ? "Sort: Category A–Z"
            : "Sort: Category Z–A";
    });
});