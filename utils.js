// === TIỆN ÍCH DÙNG CHUNG ===
// escapeHtml (bảo mật), tính toán KPI, helper hiển thị.

// === BẢO MẬT ===
// Escape dữ liệu trước khi chèn vào innerHTML.
// BẮT BUỘC dùng cho MỌI giá trị đến từ Google Sheets / người dùng nhập:
// tên nhiệm vụ, tên người, tên đơn vị, ghi chú, trạng thái...
// Không cần dùng cho số hoặc chuỗi do chính code sinh ra (class name, URL cố định).
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


function renderScopeBanner() {
    // Chủ tịch không cần banner
    if (currentLeader.role === 'chutich') return '';

    const name = escapeHtml(currentLeader.name);
    const title = escapeHtml(currentLeader.title);

    let text = '';
    if (currentLeader.role === 'phochutich') {
        text = `${name} — ${title} · xem toàn xã`;
    } else {
        text = `${name} — ${title} · chỉ xem dữ liệu <strong>${escapeHtml(currentLeader.scope)}</strong>`;
    }

    return `<div class="scope-banner">
        <i class="ti ti-info-circle"></i>
        <span>${text}</span>
        <span class="banner-demo">chế độ mô phỏng</span>
    </div>`;
}


function calculateStats(tasks) {
    return {
        total: tasks.length,
        completed: tasks.filter(t => t.trangThai === 'Hoàn thành').length,
        inProgress: tasks.filter(t => t.trangThai === 'Đang thực hiện').length,
        overdue: tasks.filter(t => t.trangThai === 'Trễ hạn').length,
        pending: tasks.filter(t => t.trangThai === 'Chờ phê duyệt').length,
        noReport: tasks.filter(t => t.trangThai === 'Chưa báo cáo').length
    };
}


function calculateWeightedProgress(tasks) {
    let totalWeight = 0;
    let weightedSum = 0;

    tasks.forEach(task => {
        if (task.khoiLuong > 0) {
            totalWeight += task.khoiLuong;
            weightedSum += task.khoiLuong * task.phanTram;
        }
    });

    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
}


function getDepartmentData(tasks) {
    const deptMap = {};

    tasks.forEach(task => {
        const dept = task.phongBan;
        if (!dept) return;
        if (!deptMap[dept]) {
            deptMap[dept] = { name: dept, tasks: [] };
        }
        deptMap[dept].tasks.push(task);
    });

    return Object.values(deptMap).map(dept => {
        const deptStats = calculateStats(dept.tasks);
        const totalWeight = dept.tasks.reduce((s, t) => s + t.khoiLuong, 0);
        return {
            name: dept.name,
            taskCount: dept.tasks.length,
            totalWeight: totalWeight,
            progress: calculateWeightedProgress(dept.tasks),
            tasks: dept.tasks,
            stats: deptStats
        };
    }).sort((a, b) => b.progress - a.progress);
}


function getTaskClass(task) {
    if (task.trangThai === 'Hoàn thành') return 'task-completed';
    if (task.trangThai === 'Trễ hạn') return 'task-overdue';
    if (task.trangThai === 'Chưa báo cáo') return 'task-no-report';
    return '';
}


function getStatusClass(status) {
    const map = {
        'Hoàn thành': 'status-hoan-thanh',
        'Đang thực hiện': 'status-dang-thuc-hien',
        'Trễ hạn': 'status-tre-han',
        'Chờ phê duyệt': 'status-cho-phe-duyet',
        'Chưa báo cáo': 'status-chua-bao-cao'
    };
    return map[status] || '';
}


// === HELPERS ===
function updateLastUpdate() {
    const now = new Date();
    const formatted = now.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const el = document.getElementById('lastUpdate');
    if (el) el.textContent = formatted;
}


function showLoading() {
    const container = document.getElementById('mainContainer');
    container.innerHTML = `
        <div class="loading-page">
            <i class="ti ti-loader-2 spin"></i> Đang tải dữ liệu...
        </div>
    `;
}


function showError(message) {
    const container = document.getElementById('mainContainer');
    container.innerHTML = `
        <div class="error-page">
            <i class="ti ti-alert-triangle"></i>
            <p>${escapeHtml(message)}</p>
            <button id="retryBtn" class="btn-primary">Thử lại</button>
        </div>
    `;
    // addEventListener thay cho onclick inline (F1) — onclick sẽ hỏng khi tách module
    document.getElementById('retryBtn')?.addEventListener('click', () => fetchData());
}
