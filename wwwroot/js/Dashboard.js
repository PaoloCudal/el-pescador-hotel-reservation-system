const token = localStorage.getItem("adminToken");

let bookingChart;
let allActivityLogs = [];
let currentSort = 'newest';
let currentQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('bookingChart').getContext('2d');
    bookingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Total Bookings', 'Pending Bookings', 'Revenue (₱)'],
            datasets: [{
                label: 'Hotel Stats',
                data: [0, 0, 0],
                backgroundColor: ['#0d6efd', '#ffc107', '#198754']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Live Hotel Performance' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    createToastContainer();
    loadDashboardStats();
    loadActivityLog();
    setInterval(loadDashboardStats, 30000);
    setInterval(loadActivityLog, 30000);
});

function createToastContainer() {
    if (document.getElementById('toastContainer')) return;
    const container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
}

function showToast(message, type = 'success') {
    const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
        <div class="toast-body">
            <i class="bi ${icon}" style="font-size: 16px; flex-shrink: 0;"></i>
            <span>${message}</span>
        </div>
        <div class="toast-progress-track">
            <div class="toast-progress-bar"></div>
        </div>
    `;

    document.getElementById('toastContainer').appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('toast-show'));
    });

    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/admin/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${token || ''}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) return;

        const data = await response.json();

        const totalBookingsEl = document.getElementById('totalBookings');
        const pendingCheckinsEl = document.getElementById('pendingCheckins');
        const totalRevenueEl = document.getElementById('totalRevenue');

        if (totalBookingsEl)
            totalBookingsEl.textContent = data.totalBookings.toLocaleString();

        if (pendingCheckinsEl)
            pendingCheckinsEl.textContent = data.pendingCheckins.toLocaleString();

        if (totalRevenueEl)
            totalRevenueEl.textContent =
                `₱${(data.totalRevenue ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

        if (bookingChart) {
            bookingChart.data.datasets[0].data = [
                data.totalBookings,
                data.pendingCheckins,
                data.totalRevenue
            ];
            bookingChart.update();
        }

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
    }
}

function getActionBadge(action) {
    switch (action) {
        case 'Booking Approved':
            return `<span class="badge bg-success">${action}</span>`;
        case 'Booking Rejected':
            return `<span class="badge bg-danger">${action}</span>`;
        case 'Facility Added':
            return `<span class="badge bg-primary">${action}</span>`;
        case 'Facility Updated':
            return `<span class="badge bg-warning text-dark">${action}</span>`;
        case 'Facility Deleted':
            return `<span class="badge bg-secondary">${action}</span>`;
        case 'Facility Restored':
            return `<span class="badge bg-success">${action}</span>`;
        default:
            return `<span class="badge bg-info">${action}</span>`;
    }
}

function highlightText(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<mark style="background:#e2e8f0; color:#1e293b; border-radius:3px; padding:0 3px;">$1</mark>');
}

function getBadgeWithHighlight(action, query) {
    if (!query) return getActionBadge(action);
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const highlighted = action.replace(regex,
        '<mark style="background:#e2e8f0; color:#1e293b; border-radius:3px; padding:0 3px;">$1</mark>'
    );
    return getActionBadge(action).replace(action, highlighted);
}

async function loadActivityLog() {
    try {
        const response = await fetch('/api/admin/activity-logs', {
            headers: {
                'Authorization': `Bearer ${token || ''}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) return;

        allActivityLogs = await response.json();
        renderActivityTable(allActivityLogs.slice(0, 10), 'activityLogBody');

    } catch (error) {
        console.error("Error fetching activity log:", error);
    }
}

function renderActivityTable(logs, targetId) {
    const tbody = document.getElementById(targetId);

    if (!tbody) {
        console.warn(`${targetId} element not found in DOM`);
        return;
    }

    tbody.innerHTML = '';

    if (!logs.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">No matching activity found.</td></tr>`;
        return;
    }

    const query = targetId === 'allActivityLogBody' ? currentQuery : '';
    const isModal = targetId === 'allActivityLogBody';

    logs.forEach(log => {
        const tr = document.createElement('tr');
        const dateOnly = new Date(log.createdAt).toLocaleDateString('en-PH', {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        const highlightedDetails = highlightText(log.details ?? '-', query);
        const highlightedBy = highlightText(log.performedBy, query);

        tr.innerHTML = `
            <td>${getBadgeWithHighlight(log.action, query)}</td>
            <td class="text-muted small">${highlightedDetails}</td>
            <td class="small">${highlightedBy}</td>
            <td class="small text-secondary">${dateOnly}</td>
            ${isModal ? `
            <td class="text-center">
                <button class="btn btn-sm btn-outline-danger border-1 px-2 py-1 delete-log-btn"
                    onclick="deleteActivityLog(${log.activityLogId}, this)"
                    title="Delete log"
                    style="border-radius: 6px; line-height: 1;">
                    <i class="bi bi-trash3" style="font-size: 13px;"></i>
                </button>
            </td>` : ''}
        `;
        tbody.appendChild(tr);
    });
}

async function deleteActivityLog(id, btn) {
    if (!confirm('Are you sure you want to delete this log entry?')) return;

    try {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`;

        const response = await fetch(`/api/admin/activity-logs/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token || ''}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-trash3" style="font-size: 13px;"></i>`;
            showToast('Failed to delete log. Please try again.', 'error');
            return;
        }

        allActivityLogs = allActivityLogs.filter(log => log.activityLogId !== id);

        const filtered = getSortedLogs(currentSort).filter(log => {
            if (!currentQuery) return true;
            const q = currentQuery.toLowerCase();
            return (
                log.action.toLowerCase().includes(q) ||
                (log.details ?? '').toLowerCase().includes(q) ||
                log.performedBy.toLowerCase().includes(q)
            );
        });

        renderActivityTable(filtered, 'allActivityLogBody');
        renderActivityTable(allActivityLogs.slice(0, 10), 'activityLogBody');
        showToast('Activity log deleted successfully.', 'success');

    } catch (error) {
        console.error("Error deleting log:", error);
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-trash3" style="font-size: 13px;"></i>`;
        showToast('An error occurred. Please try again.', 'error');
    }
}

function openActivityModal() {
    currentQuery = '';
    const searchInput = document.getElementById('activitySearchInput');
    if (searchInput) searchInput.value = '';

    document.getElementById('sortNewest').classList.add('active');
    document.getElementById('sortOldest').classList.remove('active');
    currentSort = 'newest';

    renderActivityTable(getSortedLogs('newest'), 'allActivityLogBody');
    const modal = new bootstrap.Modal(document.getElementById('activityModal'));
    modal.show();
}

function sortActivityLogs(order) {
    currentSort = order;
    document.getElementById('sortNewest').classList.toggle('active', order === 'newest');
    document.getElementById('sortOldest').classList.toggle('active', order === 'oldest');

    const filtered = getSortedLogs(order).filter(log => {
        if (!currentQuery) return true;
        const q = currentQuery.toLowerCase();
        return (
            log.action.toLowerCase().includes(q) ||
            (log.details ?? '').toLowerCase().includes(q) ||
            log.performedBy.toLowerCase().includes(q)
        );
    });

    renderActivityTable(filtered, 'allActivityLogBody');
}

function getSortedLogs(order) {
    return [...allActivityLogs].sort((a, b) => {
        const diff = new Date(a.createdAt) - new Date(b.createdAt);
        return order === 'newest' ? -diff : diff;
    });
}

function filterActivityLogs(query) {
    currentQuery = query;
    const filtered = getSortedLogs(currentSort).filter(log => {
        const q = query.toLowerCase();
        return (
            log.action.toLowerCase().includes(q) ||
            (log.details ?? '').toLowerCase().includes(q) ||
            log.performedBy.toLowerCase().includes(q)
        );
    });
    renderActivityTable(filtered, 'allActivityLogBody');
}