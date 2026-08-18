// === ĐIỀU PHỐI ===
// Trạng thái toàn cục, khởi tạo, điều hướng, phân quyền hiển thị.
// Các file khác được nạp TRƯỚC file này (xem index.html).

// === GLOBAL STATE ===
let allTasks = [];

let allStaff = [];  // Danh sách TẤT CẢ cán bộ (kể cả không có nhiệm vụ)

let allDepartments = [];  // Danh sách TẤT CẢ phòng ban

let departmentChart = null;

let statusChart = null;

let isLoading = false;

let currentPage = 'dashboard';

let currentFilters = { department: '', status: '' };

let currentStaffProfile = null;


// === ROLE-BASED VIEW (Mô phỏng) ===
// Danh sách LEADERS nằm ở file riêng leaders.js (load trước app.js trong index.html)
// -> Thay đổi nhân sự chỉ cần sửa leaders.js, không đụng vào file này.
let currentLeader = LEADERS[0]; // Mặc định Chủ tịch


// === MAIN ===
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupMobileMenu();
    setupRefreshButton();
    setupRoleSwitcher();
    fetchData();

    // Auto-refresh mỗi 5 phút
    setInterval(() => {
        fetchData();
    }, CONFIG.REFRESH_INTERVAL);
});


// === NAVIGATION ===
function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
}


function navigateTo(page, data = null) {
    // Reset staff profile nếu không phải trang nhân sự
    if (page !== 'nhansu') {
        currentStaffProfile = null;
    }

    // Cập nhật active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Đóng sidebar trên mobile
    document.getElementById('sidebar').classList.remove('open');

    currentPage = page;

    // Cập nhật header
    const pageInfo = pageTitles[page] || { title: 'Dashboard', subtitle: '' };
    document.getElementById('pageTitle').textContent = pageInfo.title;
    document.getElementById('pageSubtitle').textContent = pageInfo.subtitle;

    // Render trang tương ứng
    renderPage(page, data);
}


function renderPage(page, data = null) {
    const container = document.getElementById('mainContainer');

    switch (page) {
        case 'dashboard':
            renderDashboardPage();
            break;
        case 'kpi-phongban':
            renderKpiPhongBanPage();
            break;
        case 'theodoi':
            renderTheodoiPage();
            break;
        case 'nhansu':
            if (data && data.staff) {
                renderStaffProfile(data.staff);
            } else {
                renderNhanSuPage();
            }
            break;
        case 'can-capnhat':
            renderCanCapNhatPage();
            break;
        case 'bo-kpi':
            renderBoKPIPage();
            break;
        case 'capnhat-solieu':
            renderCapNhatSoLieuPage();
            break;
        case 'kpi-canhan':
            renderKPICaNhanPage(data);
            break;
        case 'phancong':
            renderPhanCongPage();
            break;
        case 'nguoidung':
            renderNguoiDungPage();
            break;
        default:
            renderDashboardPage();
    }
}


// === MOBILE MENU ===
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Đóng sidebar khi click ngoài
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}


// === REFRESH BUTTON ===
function setupRefreshButton() {
    const btn = document.getElementById('refreshBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            fetchData();
        });
    }
}


// === ROLE SWITCHER (Chế độ xem mô phỏng) ===
function setupRoleSwitcher() {
    const leaderSelect = document.getElementById('leaderSelect');
    if (leaderSelect) {
        leaderSelect.addEventListener('change', onLeaderChange);
    }
}


function populateLeaderDropdown() {
    const leaderSelect = document.getElementById('leaderSelect');
    if (!leaderSelect) return;

    // Chia LEADERS thành 2 nhóm
    const lanhdao = LEADERS.filter(l => l.role === 'chutich' || l.role === 'phochutich');
    const truongdonvi = LEADERS.filter(l => l.role === 'truongdonvi');

    let html = '';

    // Optgroup: Lãnh đạo xã
    html += '<optgroup label="Lãnh đạo xã">';
    lanhdao.forEach(l => {
        const selected = l.id === currentLeader.id ? 'selected' : '';
        html += `<option value="${escapeHtml(l.id)}" ${selected}>${escapeHtml(l.name)} — ${escapeHtml(l.title)}</option>`;
    });
    html += '</optgroup>';

    // Optgroup: Trưởng đơn vị
    html += '<optgroup label="Trưởng đơn vị">';
    truongdonvi.forEach(l => {
        const selected = l.id === currentLeader.id ? 'selected' : '';
        html += `<option value="${escapeHtml(l.id)}" ${selected}>${escapeHtml(l.name)} — ${escapeHtml(l.title)}</option>`;
    });
    html += '</optgroup>';

    leaderSelect.innerHTML = html;
}


function onLeaderChange() {
    const leaderSelect = document.getElementById('leaderSelect');
    const id = leaderSelect.value;
    currentLeader = LEADERS.find(l => l.id === id) || LEADERS[0];

    updateSidebarForRole();
    updateUserInfoDisplay();
    updateBadge();
    renderPage(currentPage);
}


function getVisibleTasks() {
    // Trưởng đơn vị chỉ thấy đơn vị mình
    if (currentLeader.role === 'truongdonvi' && currentLeader.scope) {
        return allTasks.filter(t => t.phongBan === currentLeader.scope);
    }
    // Chủ tịch + Phó Chủ tịch thấy tất cả
    return allTasks;
}


function getVisibleStaff() {
    // Trưởng đơn vị chỉ thấy cán bộ trong đơn vị mình
    if (currentLeader.role === 'truongdonvi' && currentLeader.scope) {
        // Lọc cán bộ có nhiệm vụ thuộc đơn vị này
        const staffInScope = new Set();
        allTasks.forEach(t => {
            if (t.phongBan === currentLeader.scope && t.canBo) {
                staffInScope.add(t.canBo);
            }
        });
        // Trả về cán bộ thuộc scope (kể cả chưa có nhiệm vụ nếu họ thuộc phòng ban đó)
        return allStaff.filter(s => staffInScope.has(s));
    }
    // Chủ tịch + Phó Chủ tịch thấy tất cả cán bộ
    return allStaff;
}


function getVisibleDepartments() {
    // Trưởng đơn vị chỉ thấy đơn vị mình
    if (currentLeader.role === 'truongdonvi' && currentLeader.scope) {
        return [currentLeader.scope];
    }
    // Chủ tịch + Phó Chủ tịch thấy tất cả phòng ban
    return allDepartments;
}


function updateSidebarForRole() {
    const allowed = MENU_ACCESS[currentLeader.role] || [];

    // Ẩn/hiện các menu item
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        const page = item.dataset.page;
        item.style.display = allowed.includes(page) ? 'flex' : 'none';
    });

    // Nếu trang hiện tại không được phép → chuyển về dashboard
    if (!allowed.includes(currentPage)) {
        currentPage = 'dashboard';
        // Update active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === 'dashboard') {
                item.classList.add('active');
            }
        });
    }

    // Ẩn nav-group nếu tất cả item bên dưới bị ẩn
    document.querySelectorAll('.nav-group').forEach(group => {
        let next = group.nextElementSibling;
        let hasVisible = false;
        while (next && !next.classList.contains('nav-group')) {
            if (next.classList.contains('nav-item') && next.style.display !== 'none') {
                hasVisible = true;
            }
            next = next.nextElementSibling;
        }
        group.style.display = hasVisible ? 'block' : 'none';
    });
}


function updateUserInfoDisplay() {
    const initial = currentLeader.name.trim().split(' ').pop()[0] || '?';

    const avatarEl = document.querySelector('.user-avatar');
    const nameEl = document.querySelector('.user-name');
    const roleEl = document.querySelector('.user-role');

    if (avatarEl) avatarEl.textContent = initial.toUpperCase();
    if (nameEl) nameEl.textContent = currentLeader.name;

    // Role text: nếu trưởng đơn vị thì hiện scope
    if (roleEl) {
        roleEl.textContent = currentLeader.role === 'truongdonvi'
            ? `${currentLeader.title}`
            : currentLeader.title;
    }
}


// === UPDATE BADGE ===
function updateBadge() {
    // Badge đếm theo phạm vi vai trò hiện tại
    const visibleTasks = getVisibleTasks();
    const count = visibleTasks.filter(t => t.trangThai === 'Chưa báo cáo').length;
    const badge = document.getElementById('badgeChuaBaoCao');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}
