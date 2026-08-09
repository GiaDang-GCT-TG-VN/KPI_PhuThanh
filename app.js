// === CONFIG ===
const CONFIG = {
    CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQj824lSoKDpnjPl2ChHFKw832dRjXXiDeF_xMlo4hbjyo6WtoefDiGT4PctBSU6muoXF9cnN6hkRSQ/pub?gid=1567229633&single=true&output=csv',
    SHEET_EDIT_URL: 'https://docs.google.com/spreadsheets/d/1aMBYqbOkC3xAmgEZUDOvQNBz6yOFU0AeJIsBMdjMxHk/edit?gid=1567229633#gid=1567229633',
    CORS_PROXY: 'https://corsproxy.io/?',
    REFRESH_INTERVAL: 300000,  // 5 phút
    KY_HIEN_TAI: '06/2026',
    MUC_TIEU_PCT: 80,          // mục tiêu 80% dùng ở trang Bộ KPI
    DON_VI: 'UBND xã Phú Thành',
};

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
// Danh sách lãnh đạo - scope phải khớp CHÍNH XÁC với cột "Phòng ban" trong Google Sheets
const LEADERS = [
    // Lãnh đạo xã (toàn xã)
    { id: 'ct',     name: 'Nguyễn Nam',           title: 'Chủ tịch UBND xã',              role: 'chutich',     scope: null },
    { id: 'pct1',   name: 'Dương Hoàng Lai',      title: 'Phó Chủ tịch',                  role: 'phochutich',  scope: null },
    { id: 'pct2',   name: 'Phạm Thị Thanh Hoa',   title: 'Phó Chủ tịch',                  role: 'phochutich',  scope: null },
    // Trưởng đơn vị (chỉ đơn vị mình)
    { id: 'cvp',    name: 'Trần Văn Bình',        title: 'Chánh Văn phòng HĐND-UBND',     role: 'truongdonvi', scope: 'Văn phòng HĐND&UBND' },
    { id: 'tpkt',   name: 'Nguyễn Hữu Thắng',     title: 'Trưởng phòng Kinh tế',          role: 'truongdonvi', scope: 'Phòng Kinh tế' },
    { id: 'tpvhxh', name: 'Lê Thị Hoa',           title: 'Trưởng phòng Văn hóa - Xã hội', role: 'truongdonvi', scope: 'Phòng Văn hoá - Xã hội' },
    { id: 'gdhcc',  name: 'Mai Thị Minh Ánh',     title: 'Giám đốc Trung tâm HCC',        role: 'truongdonvi', scope: 'Trung tâm phục vụ hành chính công' },
    { id: 'gdtt',   name: 'Phạm Văn Tú',          title: 'Trưởng ấp Thọ Khương',          role: 'truongdonvi', scope: 'Ấp Thọ Khương' },
    { id: 'tram',   name: 'Vũ Đình Long',         title: 'Trưởng Trạm y tế',              role: 'truongdonvi', scope: 'Trạm y tế' },
];

let currentLeader = LEADERS[0]; // Mặc định Chủ tịch

// Menu access by role (chỉ 3 role, bỏ canbo)
const MENU_ACCESS = {
    chutich:     ['dashboard', 'bo-kpi', 'capnhat-solieu', 'kpi-canhan', 'kpi-phongban', 'phancong', 'theodoi', 'nhansu', 'can-capnhat', 'nguoidung'],
    phochutich:  ['dashboard', 'bo-kpi', 'capnhat-solieu', 'kpi-canhan', 'kpi-phongban', 'phancong', 'theodoi', 'nhansu', 'can-capnhat'],
    truongdonvi: ['dashboard', 'bo-kpi', 'capnhat-solieu', 'kpi-canhan', 'phancong', 'theodoi', 'nhansu', 'can-capnhat']
};

// === PAGE TITLES ===
const pageTitles = {
    'dashboard': { title: 'Dashboard', subtitle: `Tổng quan KPI toàn xã · Kỳ ${CONFIG.KY_HIEN_TAI}` },
    'bo-kpi': { title: 'Bộ KPI', subtitle: 'Quản lý các chỉ tiêu KPI' },
    'capnhat-solieu': { title: 'Cập nhật số liệu', subtitle: 'Nhập liệu KPI định kỳ' },
    'kpi-canhan': { title: 'KPI cá nhân', subtitle: 'Theo dõi KPI từng cán bộ' },
    'kpi-phongban': { title: 'KPI Phòng ban', subtitle: 'Chi tiết tiến độ từng phòng ban' },
    'phancong': { title: 'Phân công công việc', subtitle: 'Giao việc và theo dõi' },
    'theodoi': { title: 'Theo dõi công việc', subtitle: 'Danh sách nhiệm vụ và tiến độ' },
    'nhansu': { title: 'Nhân sự', subtitle: 'Danh sách cán bộ và nhiệm vụ' },
    'can-capnhat': { title: 'Cần cập nhật', subtitle: 'Nhiệm vụ chưa báo cáo, trễ hạn' },
    'nguoidung': { title: 'Người dùng', subtitle: 'Quản lý tài khoản hệ thống' }
};

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
        html += `<option value="${l.id}" ${selected}>${l.name} — ${l.title}</option>`;
    });
    html += '</optgroup>';

    // Optgroup: Trưởng đơn vị
    html += '<optgroup label="Trưởng đơn vị">';
    truongdonvi.forEach(l => {
        const selected = l.id === currentLeader.id ? 'selected' : '';
        html += `<option value="${l.id}" ${selected}>${l.name} — ${l.title}</option>`;
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

function renderScopeBanner() {
    // Chủ tịch không cần banner
    if (currentLeader.role === 'chutich') return '';

    let text = '';
    if (currentLeader.role === 'phochutich') {
        text = `${currentLeader.name} — ${currentLeader.title} · xem toàn xã`;
    } else {
        text = `${currentLeader.name} — ${currentLeader.title} · chỉ xem dữ liệu <strong>${currentLeader.scope}</strong>`;
    }

    return `<div class="scope-banner">
        <i class="ti ti-info-circle"></i>
        <span>${text}</span>
        <span class="banner-demo">chế độ mô phỏng</span>
    </div>`;
}

// === FETCH DATA ===
async function fetchData() {
    if (isLoading) return;

    isLoading = true;
    showLoading();

    try {
        let csvText;
        const cacheBuster = '&_t=' + Date.now();
        const urlWithCacheBust = CONFIG.CSV_URL + cacheBuster;

        try {
            const response = await fetch(urlWithCacheBust, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (!response.ok) throw new Error('Direct fetch failed');
            csvText = await response.text();
        } catch (e) {
            const response = await fetch(CONFIG.CORS_PROXY + encodeURIComponent(urlWithCacheBust), {
                cache: 'no-store'
            });
            if (!response.ok) throw new Error('Không thể tải dữ liệu');
            csvText = await response.text();
        }

        allTasks = parseCSV(csvText);

        // Kiểm tra dữ liệu rỗng
        if (allTasks.length === 0) {
            showError('Không có dữ liệu nhiệm vụ. Kiểm tra Google Sheet hoặc cấu trúc file CSV.');
            return;
        }

        // Populate leader dropdown
        populateLeaderDropdown();
        updateSidebarForRole();
        updateUserInfoDisplay();

        updateBadge();
        updateLastUpdate();
        renderPage(currentPage);

    } catch (error) {
        console.error('Error:', error);
        showError('Lỗi tải dữ liệu: ' + error.message);
    } finally {
        isLoading = false;
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

// === PARSE CSV ===
// Dynamic column mapping - tự động đọc header từ CSV
const COLUMN_MAP = {
    'Mã việc': 'maViec',
    'Nhiệm vụ': 'nhiemVu',
    'Phòng ban': 'phongBan',
    'Cán bộ phụ trách': 'canBo',
    'Khối lượng': 'khoiLuong',
    'Khối lượng (trọng số)': 'khoiLuong',
    '% hoàn thành': 'phanTram',
    'Trạng thái': 'trangThai',
    'Hạn hoàn thành': 'hanHoanThanh',
    'Ngày cập nhật': 'ngayCapNhat',
    'Người giao': 'nguoiGiao',
    'Đơn vị phối hợp': 'donViPhoiHop',
    'Ghi chú': 'ghiChu',
    'Người Báo Cáo': 'nguoiBaoCao',
    'Ngày Chỉnh Sửa': 'ngayChinhSua'
};

function parseCSV(csv) {
    const lines = csv.split('\n');
    const tasks = [];
    const staffSet = new Set();  // Thu thập TẤT CẢ cán bộ
    const deptSet = new Set();   // Thu thập TẤT CẢ phòng ban

    // Tìm dòng header (chứa "Mã việc")
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Mã việc')) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) return tasks;

    // Parse header để tạo column index mapping
    const headerRow = parseCSVRow(lines[headerIndex]);
    const columnIndex = {};

    headerRow.forEach((header, index) => {
        // Normalize header: remove extra whitespace, newlines
        const normalizedHeader = header.replace(/\s+/g, ' ').trim();

        // Tìm trong COLUMN_MAP
        for (const [key, value] of Object.entries(COLUMN_MAP)) {
            if (normalizedHeader.includes(key) || key.includes(normalizedHeader)) {
                columnIndex[value] = index;
                break;
            }
        }
    });

    // Parse ALL data rows (bao gồm cả dòng không có Mã việc)
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);

        // Lấy giá trị các cột quan trọng
        const maViec = getColumnValue(row, columnIndex, 'maViec', '').trim();
        const canBo = getColumnValue(row, columnIndex, 'canBo', '').trim();
        const phongBan = getColumnValue(row, columnIndex, 'phongBan', '').trim();

        // Thu thập TẤT CẢ cán bộ và phòng ban (kể cả dòng không có Mã việc)
        if (canBo && !canBo.startsWith('HƯỚNG DẪN')) {
            staffSet.add(canBo);
        }
        if (phongBan && !phongBan.startsWith('HƯỚNG DẪN')) {
            deptSet.add(phongBan);
        }

        // Chỉ tạo task nếu có Mã việc bắt đầu bằng CV
        if (!maViec || !maViec.startsWith('CV')) continue;

        // Tạo task object từ dynamic mapping
        const task = {
            maViec: maViec,
            nhiemVu: getColumnValue(row, columnIndex, 'nhiemVu', ''),
            phongBan: phongBan,
            canBo: canBo,
            khoiLuong: parseFloat(getColumnValue(row, columnIndex, 'khoiLuong', '0')) || 0,
            phanTram: parsePercent(getColumnValue(row, columnIndex, 'phanTram', '0')),
            trangThai: getColumnValue(row, columnIndex, 'trangThai', ''),
            hanHoanThanh: getColumnValue(row, columnIndex, 'hanHoanThanh', ''),
            ngayCapNhat: getColumnValue(row, columnIndex, 'ngayCapNhat', ''),
            nguoiGiao: getColumnValue(row, columnIndex, 'nguoiGiao', ''),
            donViPhoiHop: getColumnValue(row, columnIndex, 'donViPhoiHop', ''),
            ghiChu: getColumnValue(row, columnIndex, 'ghiChu', ''),
            nguoiBaoCao: getColumnValue(row, columnIndex, 'nguoiBaoCao', ''),
            ngayChinhSua: getColumnValue(row, columnIndex, 'ngayChinhSua', '')
        };

        if (task.maViec && task.nhiemVu) {
            tasks.push(task);
        }
    }

    // Cập nhật global state với TẤT CẢ cán bộ và phòng ban
    allStaff = [...staffSet].sort();
    allDepartments = [...deptSet].sort();

    return tasks;
}

// Helper function để lấy giá trị cột an toàn
function getColumnValue(row, columnIndex, field, defaultValue) {
    const idx = columnIndex[field];
    if (idx === undefined || idx >= row.length) return defaultValue;
    return (row[idx] || '').trim() || defaultValue;
}

function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parsePercent(value) {
    if (!value) return 0;
    const str = value.toString().trim();
    if (str.includes('%')) {
        return parseFloat(str.replace('%', '')) / 100;
    }
    const num = parseFloat(str);
    return num > 1 ? num / 100 : num;
}

// ====================================================
// PAGE 1: DASHBOARD
// ====================================================
function renderDashboardPage() {
    const container = document.getElementById('mainContainer');
    const visibleTasks = getVisibleTasks();
    const stats = calculateStats(visibleTasks);
    const overallProgress = calculateWeightedProgress(visibleTasks);

    container.innerHTML = `
        ${renderScopeBanner()}
        <!-- KPI Cards -->
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label"><i class="ti ti-gauge"></i> % hoàn thành toàn xã</div>
                <div class="kpi-number" style="color: #15803d;">${overallProgress.toFixed(1)}%</div>
                <div class="kpi-sub">theo khối lượng công việc</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label"><i class="ti ti-clipboard-list"></i> Tổng nhiệm vụ</div>
                <div class="kpi-number" style="color: #14211b;">${stats.total}</div>
                <div class="kpi-sub">kỳ ${CONFIG.KY_HIEN_TAI}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label"><i class="ti ti-circle-check"></i> Hoàn thành</div>
                <div class="kpi-number" style="color: #16a34a;">${stats.completed}</div>
                <div class="kpi-sub"></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label"><i class="ti ti-refresh"></i> Đang thực hiện</div>
                <div class="kpi-number" style="color: #2563eb;">${stats.inProgress}</div>
                <div class="kpi-sub"></div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label"><i class="ti ti-alert-triangle"></i> Trễ hạn</div>
                <div class="kpi-number" style="color: #dc2626;">${stats.overdue}</div>
                <div class="kpi-sub">cần xử lý</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label"><i class="ti ti-file-alert"></i> Chưa báo cáo</div>
                <div class="kpi-number" style="color: #64748b;">${stats.noReport}</div>
                <div class="kpi-sub">tính là chưa thực hiện</div>
            </div>
        </div>

        <!-- Charts -->
        <div class="charts-grid">
            <div class="section-card">
                <h3>Tiến độ theo phòng ban</h3>
                <div class="chart-container">
                    <canvas id="departmentChart"></canvas>
                </div>
            </div>
            <div class="section-card">
                <h3>Phân bố trạng thái</h3>
                <div class="chart-container chart-small" style="position: relative;">
                    <canvas id="statusChart"></canvas>
                    <div class="donut-center" id="donutCenter">
                        <div class="donut-center-value">${overallProgress.toFixed(0)}%</div>
                        <div class="donut-center-label">hoàn thành</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Department Table -->
        <div class="section-card">
            <h3>Tổng hợp phòng ban</h3>
            <div class="table-container">
                <table id="departmentTable">
                    <thead>
                        <tr>
                            <th>Phòng ban</th>
                            <th>Số việc</th>
                            <th>Khối lượng</th>
                            <th>Tiến độ</th>
                            <th>HT</th>
                            <th>ĐTH</th>
                            <th>Trễ</th>
                            <th>Chờ</th>
                            <th>Chưa BC</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `;

    // Render data với visibleTasks
    renderDepartmentTable(visibleTasks);
    renderCharts(visibleTasks);
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

function renderDepartmentTable(tasks) {
    const departments = getDepartmentData(tasks);
    const tbody = document.querySelector('#departmentTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    departments.forEach(dept => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${dept.name}</strong></td>
            <td>${dept.taskCount}</td>
            <td>${dept.totalWeight}</td>
            <td>
                <div class="progress-cell">
                    <div class="progress-mini">
                        <div class="progress-mini-bar" style="width: ${dept.progress}%"></div>
                    </div>
                    <span>${dept.progress.toFixed(0)}%</span>
                </div>
            </td>
            <td>${dept.stats.completed}</td>
            <td>${dept.stats.inProgress}</td>
            <td style="color: ${dept.stats.overdue > 0 ? '#ef4444' : 'inherit'}">${dept.stats.overdue}</td>
            <td>${dept.stats.pending}</td>
            <td>${dept.stats.noReport}</td>
        `;
        tbody.appendChild(row);
    });
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

function renderCharts(tasks) {
    renderDepartmentChart(tasks);
    renderStatusChart(tasks);
}

function renderDepartmentChart(tasks) {
    const departments = getDepartmentData(tasks);
    const labels = departments.map(d => d.name);
    const data = departments.map(d => d.progress);

    const ctx = document.getElementById('departmentChart');
    if (!ctx) return;

    if (departmentChart) departmentChart.destroy();

    // Register datalabels plugin if available
    const plugins = [];
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
        plugins.push(ChartDataLabels);
    }

    departmentChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '% Hoàn thành',
                data: data,
                backgroundColor: '#16a34a',
                borderRadius: 6,
                barThickness: 28
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    formatter: (value) => Math.round(value) + '%',
                    font: { weight: 'bold', size: 12 },
                    color: '#14211b'
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: value => value + '%' },
                    grid: { color: '#e5e9e7' }
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 12 } }
                }
            }
        },
        plugins: plugins
    });
}

function renderStatusChart(tasks) {
    const stats = calculateStats(tasks);
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    if (statusChart) statusChart.destroy();

    statusChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Hoàn thành', 'Đang thực hiện', 'Trễ hạn', 'Chờ phê duyệt', 'Chưa báo cáo'],
            datasets: [{
                data: [stats.completed, stats.inProgress, stats.overdue, stats.pending, stats.noReport],
                backgroundColor: ['#16a34a', '#2563eb', '#dc2626', '#d97706', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: { size: 12 }
                    }
                },
                datalabels: { display: false }
            }
        }
    });
}

// ====================================================
// PAGE 2: KPI PHÒNG BAN
// ====================================================
function renderKpiPhongBanPage() {
    const container = document.getElementById('mainContainer');
    const visibleTasks = getVisibleTasks();
    const departments = getDepartmentData(visibleTasks);

    container.innerHTML = `
        ${renderScopeBanner()}
        <div class="dept-grid">
            ${departments.map((dept, index) => `
                <div class="dept-card">
                    <div class="dept-header">
                        <span class="rank-badge">#${index + 1}</span>
                        <h4>${dept.name}</h4>
                    </div>
                    <div class="dept-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${dept.progress}%"></div>
                            <span class="progress-text">${dept.progress.toFixed(1)}%</span>
                        </div>
                    </div>
                    <div class="dept-stats">
                        <div class="stat-item">
                            <span class="stat-label">Số việc</span>
                            <span class="stat-value">${dept.taskCount}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Khối lượng</span>
                            <span class="stat-value">${dept.totalWeight}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Hoàn thành</span>
                            <span class="stat-value text-green">${dept.stats.completed}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Trễ hạn</span>
                            <span class="stat-value text-red">${dept.stats.overdue}</span>
                        </div>
                    </div>
                    <div class="dept-tasks">
                        <h5>Danh sách nhiệm vụ:</h5>
                        <ul>
                            ${dept.tasks.slice(0, 5).map(task => `
                                <li class="${getTaskClass(task)}">
                                    <span class="task-name">${task.nhiemVu}</span>
                                    <span class="task-progress">${(task.phanTram * 100).toFixed(0)}%</span>
                                </li>
                            `).join('')}
                            ${dept.tasks.length > 5 ? `<li class="more">+ ${dept.tasks.length - 5} nhiệm vụ khác...</li>` : ''}
                        </ul>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function getTaskClass(task) {
    if (task.trangThai === 'Hoàn thành') return 'task-completed';
    if (task.trangThai === 'Trễ hạn') return 'task-overdue';
    if (task.trangThai === 'Chưa báo cáo') return 'task-no-report';
    return '';
}

// ====================================================
// PAGE 3: THEO DÕI CÔNG VIỆC
// ====================================================
function renderTheodoiPage() {
    const container = document.getElementById('mainContainer');
    const visibleTasks = getVisibleTasks();
    // Sử dụng getVisibleDepartments() để lọc theo phạm vi vai trò
    const visibleDepts = getVisibleDepartments();
    const departments = visibleDepts.length > 0
        ? visibleDepts
        : [...new Set(visibleTasks.map(t => t.phongBan).filter(d => d))];
    const statuses = ['Hoàn thành', 'Đang thực hiện', 'Trễ hạn', 'Chờ phê duyệt', 'Chưa báo cáo'];

    container.innerHTML = `
        ${renderScopeBanner()}
        <div class="filter-bar">
            <select id="filterDepartment">
                <option value="">Tất cả phòng ban</option>
                ${departments.map(d => `<option value="${d}" ${currentFilters.department === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
            <select id="filterStatus">
                <option value="">Tất cả trạng thái</option>
                ${statuses.map(s => `<option value="${s}" ${currentFilters.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button id="resetFilters" class="btn-secondary">Đặt lại</button>
        </div>

        <div class="section-card">
            <div class="table-container">
                <table id="tasksTable">
                    <thead>
                        <tr>
                            <th>Mã</th>
                            <th>Nhiệm vụ</th>
                            <th>Phòng ban</th>
                            <th>Cán bộ</th>
                            <th>KL</th>
                            <th>Tiến độ</th>
                            <th>Trạng thái</th>
                            <th>Hạn</th>
                            <th>Cập nhật</th>
                            <th>Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `;

    // Setup filters
    document.getElementById('filterDepartment').addEventListener('change', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);

    // Render with current filters
    applyFilters();
}

function applyFilters() {
    const deptFilter = document.getElementById('filterDepartment')?.value || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';

    currentFilters.department = deptFilter;
    currentFilters.status = statusFilter;

    let filtered = getVisibleTasks();

    if (deptFilter) {
        filtered = filtered.filter(t => t.phongBan === deptFilter);
    }

    if (statusFilter) {
        filtered = filtered.filter(t => t.trangThai === statusFilter);
    }

    renderTasksTable(filtered);
}

function resetFilters() {
    currentFilters = { department: '', status: '' };
    document.getElementById('filterDepartment').value = '';
    document.getElementById('filterStatus').value = '';
    renderTasksTable(getVisibleTasks());
}

function renderTasksTable(tasks) {
    const tbody = document.querySelector('#tasksTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    tasks.forEach(task => {
        const row = document.createElement('tr');
        const statusClass = getStatusClass(task.trangThai);
        const progressPercent = (task.phanTram * 100).toFixed(0);

        // Highlight dòng theo trạng thái
        if (task.trangThai === 'Chưa báo cáo') {
            row.style.background = '#fef2f2';
            row.style.borderLeft = '3px solid #dc2626';
        } else if (task.trangThai === 'Trễ hạn') {
            row.style.background = '#fff7ed';
            row.style.borderLeft = '3px solid #f59e0b';
        }

        const hanStyle = task.trangThai === 'Trễ hạn' ? 'color: #dc2626; font-weight: 600;' : '';

        row.innerHTML = `
            <td><strong>${task.maViec}</strong></td>
            <td>${task.nhiemVu}</td>
            <td>${task.phongBan}</td>
            <td><a href="#" class="name-link" data-staff="${task.canBo}">${task.canBo}</a></td>
            <td>${task.khoiLuong}</td>
            <td>
                <div class="progress-cell">
                    <div class="progress-mini">
                        <div class="progress-mini-bar" style="width: ${progressPercent}%"></div>
                    </div>
                    <span>${progressPercent}%</span>
                </div>
            </td>
            <td><span class="status-badge ${statusClass}">${task.trangThai}</span></td>
            <td style="${hanStyle}">${task.hanHoanThanh}</td>
            <td>${task.ngayCapNhat}</td>
            <td>${task.ghiChu}</td>
        `;
        tbody.appendChild(row);
    });

    // Add click handlers for staff names
    document.querySelectorAll('.name-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const staffName = link.dataset.staff;
            navigateTo('nhansu', { staff: staffName });
        });
    });
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

// ====================================================
// PAGE 4: NHÂN SỰ
// ====================================================
function renderNhanSuPage() {
    const container = document.getElementById('mainContainer');
    const visibleTasks = getVisibleTasks();

    // Group tasks by staff
    const staffMap = {};
    visibleTasks.forEach(task => {
        const name = task.canBo;
        if (!name) return;
        if (!staffMap[name]) {
            staffMap[name] = { name, department: task.phongBan, tasks: [] };
        }
        staffMap[name].tasks.push(task);
    });

    const staffList = Object.values(staffMap).map(s => {
        const staffStats = calculateStats(s.tasks);
        const totalWeight = s.tasks.reduce((sum, t) => sum + t.khoiLuong, 0);
        return {
            ...s,
            totalWeight,
            progress: calculateWeightedProgress(s.tasks),
            stats: staffStats
        };
    }).sort((a, b) => b.progress - a.progress);

    container.innerHTML = `
        ${renderScopeBanner()}
        <div class="staff-grid">
            ${staffList.map((staff, index) => `
                <div class="staff-card" data-staff="${staff.name}">
                    <div class="staff-header">
                        <div class="staff-avatar">${staff.name.charAt(0).toUpperCase()}</div>
                        <div class="staff-info">
                            <h4>${staff.name}</h4>
                            <span class="staff-dept">${staff.department}</span>
                        </div>
                        <span class="rank-badge">#${index + 1}</span>
                    </div>
                    <div class="staff-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${staff.progress}%"></div>
                            <span class="progress-text">${staff.progress.toFixed(1)}%</span>
                        </div>
                    </div>
                    <div class="staff-stats">
                        <span class="stat-pill completed">${staff.stats.completed} HT</span>
                        <span class="stat-pill in-progress">${staff.stats.inProgress} ĐTH</span>
                        <span class="stat-pill overdue">${staff.stats.overdue} Trễ</span>
                        <span class="stat-pill no-report">${staff.stats.noReport} Chưa BC</span>
                    </div>
                    <div class="staff-meta">
                        <span>${staff.tasks.length} nhiệm vụ</span>
                        <span>KL: ${staff.totalWeight}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Add click handlers
    document.querySelectorAll('.staff-card').forEach(card => {
        card.addEventListener('click', () => {
            const staffName = card.dataset.staff;
            navigateTo('nhansu', { staff: staffName });
        });
    });
}

function renderStaffProfile(staffName) {
    currentStaffProfile = staffName;
    const container = document.getElementById('mainContainer');

    // Kiểm tra quyền xem cán bộ này
    const visibleStaff = getVisibleStaff();
    if (!visibleStaff.includes(staffName)) {
        container.innerHTML = `
            <button class="back-btn" id="backToStaffList">
                <i class="ti ti-arrow-left"></i> Quay lại danh sách
            </button>
            <div class="error-page">
                <i class="ti ti-lock"></i>
                <p>Không có quyền xem cán bộ này</p>
                <p class="error-sub">Cán bộ "${staffName}" không thuộc phạm vi quản lý của bạn.</p>
            </div>
        `;
        document.getElementById('backToStaffList')?.addEventListener('click', () => {
            currentStaffProfile = null;
            document.getElementById('pageTitle').textContent = 'Nhân sự';
            document.getElementById('pageSubtitle').textContent = 'Danh sách cán bộ và nhiệm vụ';
            renderNhanSuPage();
        });
        return;
    }

    // Lọc nhiệm vụ theo phạm vi vai trò hiện tại
    const visibleTasks = getVisibleTasks();
    const staffTasks = visibleTasks.filter(t => t.canBo === staffName);
    if (staffTasks.length === 0) {
        container.innerHTML = `<p>Không tìm thấy nhiệm vụ của cán bộ: ${staffName}</p>`;
        return;
    }

    const department = staffTasks[0].phongBan;
    const progress = calculateWeightedProgress(staffTasks);
    const stats = calculateStats(staffTasks);

    // Update header
    document.getElementById('pageTitle').textContent = staffName;
    document.getElementById('pageSubtitle').textContent = `Hồ sơ cán bộ · ${department}`;

    container.innerHTML = `
        <button class="back-btn" id="backToStaffList">
            <i class="ti ti-arrow-left"></i> Quay lại danh sách
        </button>

        <div class="profile-header">
            <div class="profile-avatar">${staffName.charAt(0).toUpperCase()}</div>
            <div class="profile-info">
                <h2>${staffName}</h2>
                <p>${department}</p>
            </div>
            <div class="profile-progress">
                <div class="progress-circle" style="--progress: ${progress}%">
                    <span>${progress.toFixed(1)}%</span>
                </div>
                <span>Tiến độ chung</span>
            </div>
        </div>

        <div class="profile-stats">
            <div class="stat-box total">
                <span class="stat-num">${staffTasks.length}</span>
                <span class="stat-label">Tổng việc</span>
            </div>
            <div class="stat-box completed">
                <span class="stat-num">${stats.completed}</span>
                <span class="stat-label">Hoàn thành</span>
            </div>
            <div class="stat-box in-progress">
                <span class="stat-num">${stats.inProgress}</span>
                <span class="stat-label">Đang TH</span>
            </div>
            <div class="stat-box overdue">
                <span class="stat-num">${stats.overdue}</span>
                <span class="stat-label">Trễ hạn</span>
            </div>
            <div class="stat-box no-report">
                <span class="stat-num">${stats.noReport}</span>
                <span class="stat-label">Chưa BC</span>
            </div>
        </div>

        <div class="section-card">
            <h3>Danh sách nhiệm vụ</h3>
            <div class="table-container">
                <table id="staffTasksTable">
                    <thead>
                        <tr>
                            <th>Mã</th>
                            <th>Nhiệm vụ</th>
                            <th>KL</th>
                            <th>Tiến độ</th>
                            <th>Trạng thái</th>
                            <th>Hạn</th>
                            <th>Cập nhật</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${staffTasks.map(task => {
                            const statusClass = getStatusClass(task.trangThai);
                            const pct = (task.phanTram * 100).toFixed(0);
                            let rowStyle = '';
                            if (task.trangThai === 'Chưa báo cáo') {
                                rowStyle = 'background: #fef2f2; border-left: 3px solid #dc2626;';
                            } else if (task.trangThai === 'Trễ hạn') {
                                rowStyle = 'background: #fff7ed; border-left: 3px solid #f59e0b;';
                            }
                            return `
                                <tr style="${rowStyle}">
                                    <td><strong>${task.maViec}</strong></td>
                                    <td>${task.nhiemVu}</td>
                                    <td>${task.khoiLuong}</td>
                                    <td>
                                        <div class="progress-cell">
                                            <div class="progress-mini">
                                                <div class="progress-mini-bar" style="width: ${pct}%"></div>
                                            </div>
                                            <span>${pct}%</span>
                                        </div>
                                    </td>
                                    <td><span class="status-badge ${statusClass}">${task.trangThai}</span></td>
                                    <td>${task.hanHoanThanh}</td>
                                    <td>${task.ngayCapNhat}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('backToStaffList').addEventListener('click', () => {
        currentStaffProfile = null;
        document.getElementById('pageTitle').textContent = 'Nhân sự';
        document.getElementById('pageSubtitle').textContent = 'Danh sách cán bộ và nhiệm vụ';
        renderNhanSuPage();
    });
}

// ====================================================
// PAGE 5: CẦN CẬP NHẬT
// ====================================================
function renderCanCapNhatPage() {
    const container = document.getElementById('mainContainer');
    const visibleTasks = getVisibleTasks();

    const chuaBaoCao = visibleTasks.filter(t => t.trangThai === 'Chưa báo cáo');
    const treHan = visibleTasks.filter(t => t.trangThai === 'Trễ hạn');

    container.innerHTML = `
        ${renderScopeBanner()}
        <div class="urgent-section">
            <h3><i class="ti ti-alert-circle"></i> Chưa báo cáo (${chuaBaoCao.length})</h3>
            ${chuaBaoCao.length === 0 ? '<p class="empty-msg">Không có nhiệm vụ nào chưa báo cáo.</p>' : `
                <div class="table-container">
                    <table class="urgent-table">
                        <thead>
                            <tr>
                                <th>Mã</th>
                                <th>Nhiệm vụ</th>
                                <th>Phòng ban</th>
                                <th>Cán bộ</th>
                                <th>KL</th>
                                <th>Hạn</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${chuaBaoCao.map(task => `
                                <tr>
                                    <td><strong>${task.maViec}</strong></td>
                                    <td>${task.nhiemVu}</td>
                                    <td>${task.phongBan}</td>
                                    <td><a href="#" class="name-link" data-staff="${task.canBo}">${task.canBo}</a></td>
                                    <td>${task.khoiLuong}</td>
                                    <td>${task.hanHoanThanh}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>

        <div class="warning-section">
            <h3><i class="ti ti-clock-exclamation"></i> Trễ hạn (${treHan.length})</h3>
            ${treHan.length === 0 ? '<p class="empty-msg">Không có nhiệm vụ nào trễ hạn.</p>' : `
                <div class="table-container">
                    <table class="warning-table">
                        <thead>
                            <tr>
                                <th>Mã</th>
                                <th>Nhiệm vụ</th>
                                <th>Phòng ban</th>
                                <th>Cán bộ</th>
                                <th>Tiến độ</th>
                                <th>Hạn</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${treHan.map(task => `
                                <tr>
                                    <td><strong>${task.maViec}</strong></td>
                                    <td>${task.nhiemVu}</td>
                                    <td>${task.phongBan}</td>
                                    <td><a href="#" class="name-link" data-staff="${task.canBo}">${task.canBo}</a></td>
                                    <td>${(task.phanTram * 100).toFixed(0)}%</td>
                                    <td style="color: #dc2626; font-weight: 600;">${task.hanHoanThanh}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;

    // Add click handlers for staff names
    document.querySelectorAll('.name-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const staffName = link.dataset.staff;
            navigateTo('nhansu', { staff: staffName });
        });
    });
}

// ====================================================
// PAGE 6: BỘ KPI
// ====================================================
function renderBoKPIPage() {
    const container = document.getElementById('mainContainer');
    const visibleTasks = getVisibleTasks();
    const stats = calculateStats(visibleTasks);
    const overallProgress = calculateWeightedProgress(visibleTasks);
    const departments = getDepartmentData(visibleTasks);
    const totalKL = visibleTasks.reduce((s, t) => s + t.khoiLuong, 0);

    // KPI targets (có thể config)
    const targets = {
        pctHoanThanh: CONFIG.MUC_TIEU_PCT,
        hoanThanhTasks: stats.total,
        treHan: 0,
        chuaBaoCao: 0,
        choPhe: 0
    };

    // Đánh giá function
    function evaluate(actual, target, isLowerBetter = false) {
        if (isLowerBetter) {
            if (actual === 0) return { class: 'eval-pass', text: '✅ Đạt' };
            return { class: 'eval-fail', text: `🔴 Còn ${actual}` };
        }
        const ratio = actual / target;
        if (ratio >= 1) return { class: 'eval-pass', text: '✅ Đạt' };
        if (ratio >= 0.7) return { class: 'eval-warning', text: '🟡 Gần đạt' };
        return { class: 'eval-fail', text: '🔴 Chưa đạt' };
    }

    const evalPct = evaluate(overallProgress, targets.pctHoanThanh);
    const evalHT = evaluate(stats.completed, targets.hoanThanhTasks);
    const evalTre = evaluate(stats.overdue, targets.treHan, true);
    const evalChuaBC = evaluate(stats.noReport, targets.chuaBaoCao, true);
    const evalCho = stats.pending > 0
        ? { class: 'eval-warning', text: `🟡 Cần duyệt ${stats.pending}` }
        : { class: 'eval-pass', text: '✅ Đã duyệt hết' };

    container.innerHTML = `
        ${renderScopeBanner()}
        <div class="section-card">
            <h3><i class="ti ti-target"></i> Bảng KPI toàn xã · Kỳ ${CONFIG.KY_HIEN_TAI}</h3>
            <div class="table-container">
                <table class="kpi-table">
                    <thead>
                        <tr>
                            <th>Chỉ tiêu</th>
                            <th>Mục tiêu</th>
                            <th>Thực tế</th>
                            <th>Đánh giá</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>% hoàn thành toàn xã</strong></td>
                            <td>${targets.pctHoanThanh}%</td>
                            <td><strong>${overallProgress.toFixed(1)}%</strong></td>
                            <td><span class="eval-pill ${evalPct.class}">${evalPct.text}</span></td>
                        </tr>
                        <tr>
                            <td><strong>Tổng nhiệm vụ</strong></td>
                            <td>${stats.total}</td>
                            <td><strong>${stats.total}</strong></td>
                            <td><span class="eval-pill eval-pass">✅ Đạt</span></td>
                        </tr>
                        <tr>
                            <td><strong>Nhiệm vụ hoàn thành</strong></td>
                            <td>${targets.hoanThanhTasks} (100%)</td>
                            <td><strong>${stats.completed}</strong></td>
                            <td><span class="eval-pill ${evalHT.class}">${evalHT.text}</span></td>
                        </tr>
                        <tr>
                            <td><strong>Trễ hạn</strong></td>
                            <td>0</td>
                            <td style="color: ${stats.overdue > 0 ? '#dc2626' : 'inherit'}"><strong>${stats.overdue}</strong></td>
                            <td><span class="eval-pill ${evalTre.class}">${evalTre.text}</span></td>
                        </tr>
                        <tr>
                            <td><strong>Chưa báo cáo</strong></td>
                            <td>0</td>
                            <td style="color: ${stats.noReport > 0 ? '#dc2626' : 'inherit'}"><strong>${stats.noReport}</strong></td>
                            <td><span class="eval-pill ${evalChuaBC.class}">${evalChuaBC.text}</span></td>
                        </tr>
                        <tr>
                            <td><strong>Chờ phê duyệt</strong></td>
                            <td>0</td>
                            <td><strong>${stats.pending}</strong></td>
                            <td><span class="eval-pill ${evalCho.class}">${evalCho.text}</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="section-card">
            <h3><i class="ti ti-building"></i> KPI theo phòng ban</h3>
            <div class="table-container">
                <table class="kpi-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Phòng ban</th>
                            <th>Mục tiêu</th>
                            <th>Thực tế</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${departments.map((dept, i) => {
                            const deptEval = evaluate(dept.progress, targets.pctHoanThanh);
                            let statusText = deptEval.text;
                            if (dept.progress >= targets.pctHoanThanh) {
                                statusText = dept.progress > targets.pctHoanThanh ? '✅ Vượt' : '✅ Đạt';
                            }
                            return `
                                <tr>
                                    <td><span class="rank-badge">${i + 1}</span></td>
                                    <td><strong>${dept.name}</strong></td>
                                    <td>${targets.pctHoanThanh}%</td>
                                    <td>
                                        <div class="progress-cell">
                                            <div class="progress-mini">
                                                <div class="progress-mini-bar" style="width: ${dept.progress}%"></div>
                                            </div>
                                            <span><strong>${dept.progress.toFixed(1)}%</strong></span>
                                        </div>
                                    </td>
                                    <td><span class="eval-pill ${deptEval.class}">${statusText}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="kpi-summary-cards">
            <div class="summary-card">
                <div class="summary-icon"><i class="ti ti-list-check"></i></div>
                <div class="summary-content">
                    <div class="summary-value">${stats.total}</div>
                    <div class="summary-label">Tổng nhiệm vụ</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon"><i class="ti ti-weight"></i></div>
                <div class="summary-content">
                    <div class="summary-value">${totalKL}</div>
                    <div class="summary-label">Tổng khối lượng</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon"><i class="ti ti-users"></i></div>
                <div class="summary-content">
                    <div class="summary-value">${departments.length}</div>
                    <div class="summary-label">Phòng ban</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon"><i class="ti ti-user"></i></div>
                <div class="summary-content">
                    <div class="summary-value">${[...new Set(visibleTasks.map(t => t.canBo).filter(Boolean))].length}</div>
                    <div class="summary-label">Cán bộ</div>
                </div>
            </div>
        </div>
    `;
}

// ====================================================
// PAGE 7: CẬP NHẬT SỐ LIỆU
// ====================================================
function renderCapNhatSoLieuPage() {
    const container = document.getElementById('mainContainer');
    const visibleTasks = getVisibleTasks();
    const stats = calculateStats(visibleTasks);
    const reported = stats.total - stats.noReport;

    const lastUpdateEl = document.getElementById('lastUpdate');
    const lastUpdateTime = lastUpdateEl ? lastUpdateEl.textContent : '--';

    // Tìm mã việc tiếp theo (CỐ Ý dùng allTasks vì mã việc phải unique toàn hệ thống)
    const maxCV = allTasks.reduce((max, t) => {
        const num = parseInt(t.maViec.replace('CV', '')) || 0;
        return num > max ? num : max;
    }, 0);
    const nextCV = 'CV' + String(maxCV + 1).padStart(3, '0');

    container.innerHTML = `
        ${renderScopeBanner()}
        <div class="capnhat-container">
            <!-- PHẦN 1: CÁN BỘ -->
            <div class="section-card capnhat-guide capnhat-canbo">
                <h3><i class="ti ti-user"></i> Cán bộ — cập nhật báo cáo</h3>
                <div class="guide-steps">
                    <div class="guide-step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <strong>Mở Google Sheets</strong>
                            <p>Bấm nút bên dưới để mở file báo cáo</p>
                        </div>
                    </div>
                    <div class="guide-step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <strong>Tìm dòng nhiệm vụ của mình</strong>
                            <p>Tra theo Mã việc (CV001, CV002...) hoặc tên cán bộ</p>
                        </div>
                    </div>
                    <div class="guide-step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <strong>Sửa cột "% hoàn thành"</strong>
                            <p>Nhập số từ 0 đến 100 (không cần dấu %)</p>
                        </div>
                    </div>
                    <div class="guide-step">
                        <div class="step-number">4</div>
                        <div class="step-content">
                            <strong>Chọn "Trạng thái"</strong>
                            <p>Dropdown: Hoàn thành, Đang TH, Trễ hạn, Chờ duyệt</p>
                        </div>
                    </div>
                    <div class="guide-step">
                        <div class="step-number">5</div>
                        <div class="step-content">
                            <strong>Ghi chú (nếu cần)</strong>
                            <p>Thêm thông tin bổ sung vào cột Ghi chú</p>
                        </div>
                    </div>
                </div>

                <a href="${CONFIG.SHEET_EDIT_URL}" target="_blank" rel="noopener" class="btn-open-sheet">
                    <i class="ti ti-external-link"></i> Mở Google Sheets
                </a>

                <div class="capnhat-note-inline">
                    <h4><i class="ti ti-alert-circle"></i> Lưu ý</h4>
                    <ul>
                        <li><strong>CHỈ</strong> sửa: % hoàn thành, Trạng thái, Ngày cập nhật, Ghi chú</li>
                        <li><strong>KHÔNG</strong> sửa: Mã việc, Nhiệm vụ, Phòng ban, Cán bộ, Khối lượng, Hạn</li>
                        <li>Dashboard tự cập nhật sau <strong>~5 phút</strong></li>
                    </ul>
                </div>
            </div>

            <!-- PHẦN 2: ADMIN -->
            <div class="section-card capnhat-admin">
                <h3><i class="ti ti-shield-check"></i> Admin — quản lý nhiệm vụ</h3>
                <p class="admin-subtitle">Cán bộ chuyên trách CĐS hoặc Văn phòng UBND</p>

                <div class="admin-sections">
                    <!-- Giao việc mới -->
                    <div class="admin-section">
                        <h4><i class="ti ti-plus"></i> Giao việc mới</h4>
                        <ol class="admin-steps">
                            <li>Mở Google Sheets</li>
                            <li>Thêm 1 dòng mới ở cuối bảng</li>
                            <li>Điền đầy đủ các cột:
                                <div class="column-guide">
                                    <span><strong>A:</strong> Mã việc (${nextCV}, ${String(maxCV + 2).padStart(3, '0') > 999 ? 'CV' + (maxCV + 2) : 'CV' + String(maxCV + 2).padStart(3, '0')}...)</span>
                                    <span><strong>B:</strong> Tên nhiệm vụ</span>
                                    <span><strong>C:</strong> Phòng ban</span>
                                    <span><strong>D:</strong> Cán bộ phụ trách</span>
                                    <span><strong>E:</strong> Khối lượng (trọng số)</span>
                                    <span><strong>F:</strong> 0 (% ban đầu)</span>
                                    <span><strong>G:</strong> Chưa báo cáo</span>
                                    <span><strong>H:</strong> Hạn hoàn thành</span>
                                    <span><strong>J:</strong> Người giao</span>
                                </div>
                            </li>
                            <li>Dashboard tự cập nhật sau ~5 phút</li>
                        </ol>
                    </div>

                    <!-- Nhắc cán bộ -->
                    <div class="admin-section">
                        <h4><i class="ti ti-bell"></i> Nhắc cán bộ chưa báo cáo</h4>
                        <ul class="admin-tips">
                            <li>Xem trang <a href="#" class="link-internal" data-page="can-capnhat">"Cần cập nhật"</a> trên dashboard</li>
                            <li>Hoặc lọc cột G trong Sheet = "Chưa báo cáo"</li>
                            <li>Gửi Zalo/tin nhắn nhắc cán bộ</li>
                        </ul>
                    </div>

                    <!-- Chốt kỳ -->
                    <div class="admin-section">
                        <h4><i class="ti ti-archive"></i> Chốt kỳ (cuối tháng/quý)</h4>
                        <ol class="admin-steps">
                            <li>Click phải tab "NhiemVu" → <strong>Duplicate</strong></li>
                            <li>Đổi tên bản copy: <code>NhiemVu_06_2026</code> (lưu trữ)</li>
                            <li>Trên sheet NhiemVu gốc: cập nhật nhiệm vụ cho kỳ mới</li>
                        </ol>
                    </div>

                    <!-- Quản lý quyền -->
                    <div class="admin-section">
                        <h4><i class="ti ti-users-group"></i> Quản lý quyền truy cập</h4>
                        <ul class="admin-tips">
                            <li><strong>Thêm cán bộ:</strong> Sheet → Share → thêm email (Editor)</li>
                            <li><strong>Xóa cán bộ nghỉ:</strong> Sheet → Share → xóa email</li>
                            <li><strong>Bảo mật:</strong> Tắt "Editors can change permissions"</li>
                        </ul>
                    </div>
                </div>

                <a href="${CONFIG.SHEET_EDIT_URL}" target="_blank" rel="noopener" class="btn-open-sheet btn-admin">
                    <i class="ti ti-external-link"></i> Mở Google Sheets (Admin)
                </a>
            </div>

            <!-- Trạng thái báo cáo -->
            <div class="section-card capnhat-status">
                <h3><i class="ti ti-chart-pie"></i> Trạng thái báo cáo hiện tại</h3>
                <div class="status-grid">
                    <div class="status-item">
                        <div class="status-progress">
                            <div class="status-progress-bar" style="width: ${(reported / stats.total * 100).toFixed(0)}%"></div>
                        </div>
                        <div class="status-text">
                            <strong>${reported}/${stats.total}</strong> nhiệm vụ đã báo cáo
                        </div>
                    </div>
                    <div class="status-item ${stats.noReport > 0 ? 'highlight-red' : ''}">
                        <i class="ti ti-file-alert"></i>
                        <div class="status-text">
                            <strong>${stats.noReport}</strong> nhiệm vụ chưa báo cáo
                            ${stats.noReport > 0 ? '<span class="status-note">(hiện đỏ trên dashboard)</span>' : ''}
                        </div>
                    </div>
                    <div class="status-item">
                        <i class="ti ti-clock"></i>
                        <div class="status-text">
                            Cập nhật lần cuối: <strong>${lastUpdateTime}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Setup internal links
    document.querySelectorAll('.link-internal').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        });
    });
}

// ====================================================
// PAGE 8: KPI CÁ NHÂN
// ====================================================
let selectedStaffKPI = null;

function renderKPICaNhanPage(data = null) {
    const container = document.getElementById('mainContainer');

    // Sử dụng getVisibleStaff() để lọc theo phạm vi vai trò
    const visibleStaff = getVisibleStaff();
    const staffList = visibleStaff.length > 0
        ? visibleStaff
        : [...new Set(getVisibleTasks().map(t => t.canBo).filter(Boolean))].sort();

    // Nếu có data.staff từ navigation, set selected
    if (data && data.staff) {
        selectedStaffKPI = data.staff;
    }

    let profileHTML = '';
    if (selectedStaffKPI) {
        profileHTML = renderKPICaNhanProfile(selectedStaffKPI);
    } else {
        profileHTML = `
            <div class="kpi-canhan-empty">
                <i class="ti ti-user-search"></i>
                <p>Chọn cán bộ từ dropdown để xem KPI cá nhân</p>
            </div>
        `;
    }

    container.innerHTML = `
        ${renderScopeBanner()}
        <div class="kpi-canhan-header">
            <label for="selectStaff">Chọn cán bộ:</label>
            <select id="selectStaff" class="staff-select">
                <option value="">-- Chọn cán bộ --</option>
                ${staffList.map(s => `<option value="${s}" ${selectedStaffKPI === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
        </div>
        <div id="kpiCaNhanProfile">
            ${profileHTML}
        </div>
    `;

    // Setup dropdown handler
    document.getElementById('selectStaff').addEventListener('change', (e) => {
        selectedStaffKPI = e.target.value;
        const profileContainer = document.getElementById('kpiCaNhanProfile');
        if (selectedStaffKPI) {
            profileContainer.innerHTML = renderKPICaNhanProfile(selectedStaffKPI);
        } else {
            profileContainer.innerHTML = `
                <div class="kpi-canhan-empty">
                    <i class="ti ti-user-search"></i>
                    <p>Chọn cán bộ từ dropdown để xem KPI cá nhân</p>
                </div>
            `;
        }
    });
}

function renderKPICaNhanProfile(staffName) {
    const visibleTasks = getVisibleTasks();
    const staffTasks = visibleTasks.filter(t => t.canBo === staffName);
    if (staffTasks.length === 0) {
        return `<p class="error-msg">Không tìm thấy nhiệm vụ của cán bộ: ${staffName}</p>`;
    }

    const department = staffTasks[0].phongBan;
    const totalWeight = staffTasks.reduce((s, t) => s + t.khoiLuong, 0);
    const progress = calculateWeightedProgress(staffTasks);
    const stats = calculateStats(staffTasks);

    return `
        <div class="kpi-canhan-profile">
            <div class="profile-header">
                <div class="profile-avatar">${staffName.charAt(0).toUpperCase()}</div>
                <div class="profile-info">
                    <h2>${staffName}</h2>
                    <p>${department} · Kỳ ${CONFIG.KY_HIEN_TAI}</p>
                </div>
                <div class="profile-progress">
                    <div class="progress-circle" style="--progress: ${progress}%">
                        <span>${progress.toFixed(1)}%</span>
                    </div>
                    <span>Tiến độ KPI</span>
                </div>
            </div>

            <div class="kpi-canhan-cards">
                <div class="mini-card">
                    <div class="mini-value">${stats.total}</div>
                    <div class="mini-label">Nhiệm vụ</div>
                </div>
                <div class="mini-card">
                    <div class="mini-value">${totalWeight}</div>
                    <div class="mini-label">Khối lượng</div>
                </div>
                <div class="mini-card highlight-green">
                    <div class="mini-value">${stats.completed}</div>
                    <div class="mini-label">Hoàn thành</div>
                </div>
                <div class="mini-card ${stats.noReport > 0 ? 'highlight-red' : ''}">
                    <div class="mini-value">${stats.noReport}</div>
                    <div class="mini-label">Chưa BC</div>
                </div>
            </div>

            <div class="section-card">
                <h3>Danh sách nhiệm vụ</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Mã</th>
                                <th>Nhiệm vụ</th>
                                <th>KL</th>
                                <th>Tiến độ</th>
                                <th>Trạng thái</th>
                                <th>Hạn</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${staffTasks.map(task => {
                                const statusClass = getStatusClass(task.trangThai);
                                const pct = (task.phanTram * 100).toFixed(0);
                                let rowClass = '';
                                if (task.trangThai === 'Chưa báo cáo') rowClass = 'row-unreported';
                                else if (task.trangThai === 'Trễ hạn') rowClass = 'row-overdue';
                                return `
                                    <tr class="${rowClass}">
                                        <td><strong>${task.maViec}</strong></td>
                                        <td>${task.nhiemVu}</td>
                                        <td>${task.khoiLuong}</td>
                                        <td>
                                            <div class="progress-cell">
                                                <div class="progress-mini">
                                                    <div class="progress-mini-bar" style="width: ${pct}%"></div>
                                                </div>
                                                <span>${pct}%</span>
                                            </div>
                                        </td>
                                        <td><span class="status-badge ${statusClass}">${task.trangThai}</span></td>
                                        <td>${task.hanHoanThanh}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ====================================================
// PAGE 9: PHÂN CÔNG CÔNG VIỆC
// ====================================================
function renderPhanCongPage() {
    const container = document.getElementById('mainContainer');
    const visibleTasks = getVisibleTasks();
    const departments = [...new Set(visibleTasks.map(t => t.phongBan).filter(Boolean))];
    const totalKL = visibleTasks.reduce((s, t) => s + t.khoiLuong, 0);

    let html = '';
    departments.forEach(dept => {
        const deptTasks = visibleTasks.filter(t => t.phongBan === dept);
        const deptKL = deptTasks.reduce((s, t) => s + t.khoiLuong, 0);
        const staffInDept = [...new Set(deptTasks.map(t => t.canBo).filter(Boolean))];

        html += `
            <div class="phancong-dept" data-dept="${dept}">
                <div class="dept-header-pc" onclick="this.parentElement.classList.toggle('collapsed')">
                    <i class="ti ti-folder"></i>
                    <strong>${dept}</strong>
                    <span class="dept-meta-pc">${deptTasks.length} việc · KL: ${deptKL}</span>
                    <i class="ti ti-chevron-down toggle-icon"></i>
                </div>
                <div class="dept-body-pc">
        `;

        staffInDept.forEach(staff => {
            const staffTasks = deptTasks.filter(t => t.canBo === staff);
            const staffKL = staffTasks.reduce((s, t) => s + t.khoiLuong, 0);

            html += `
                <div class="staff-group-pc">
                    <div class="staff-name-pc">
                        <i class="ti ti-user"></i> ${staff}
                        <span class="staff-meta-pc">${staffTasks.length} việc · KL: ${staffKL}</span>
                    </div>
                    <div class="task-list-pc">
            `;

            staffTasks.forEach(task => {
                const pct = (task.phanTram * 100).toFixed(0);
                const statusClass = getStatusClass(task.trangThai);
                let taskClass = '';
                if (task.trangThai === 'Chưa báo cáo') taskClass = 'task-unreported';
                else if (task.trangThai === 'Trễ hạn') taskClass = 'task-overdue-pc';

                html += `
                    <div class="task-row-pc ${taskClass}">
                        <span class="task-code-pc">${task.maViec}</span>
                        <span class="task-name-pc">${task.nhiemVu}</span>
                        <span class="task-pct-pc">${pct}%</span>
                        <span class="status-badge ${statusClass}">${task.trangThai}</span>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = `
        ${renderScopeBanner()}
        <div class="phancong-summary">
            <div class="summary-item">
                <i class="ti ti-list-check"></i>
                <span><strong>${visibleTasks.length}</strong> nhiệm vụ</span>
            </div>
            <div class="summary-item">
                <i class="ti ti-building"></i>
                <span><strong>${departments.length}</strong> phòng ban</span>
            </div>
            <div class="summary-item">
                <i class="ti ti-weight"></i>
                <span>Tổng KL: <strong>${totalKL}</strong></span>
            </div>
        </div>
        <div class="phancong-tree">
            ${html}
        </div>
    `;
}

// ====================================================
// PAGE 10: NGƯỜI DÙNG
// ====================================================
function renderNguoiDungPage() {
    const container = document.getElementById('mainContainer');
    const visibleTasks = getVisibleTasks();

    // Lấy danh sách người dùng unique từ tasks
    const users = [];
    const seen = new Set();
    visibleTasks.forEach(t => {
        if (t.canBo && !seen.has(t.canBo)) {
            seen.add(t.canBo);
            const userTasks = visibleTasks.filter(x => x.canBo === t.canBo);
            users.push({
                ten: t.canBo,
                dept: t.phongBan,
                soViec: userTasks.length,
                khoiLuong: userTasks.reduce((s, x) => s + x.khoiLuong, 0),
                vai: 'Cán bộ'
            });
        }
    });

    // Thêm Chủ tịch (hardcode)
    users.unshift({
        ten: 'Nguyễn Nam',
        dept: 'Lãnh đạo UBND',
        soViec: '-',
        khoiLuong: '-',
        vai: 'Chủ tịch'
    });

    const departments = [...new Set(visibleTasks.map(t => t.phongBan).filter(Boolean))];

    container.innerHTML = `
        ${renderScopeBanner()}
        <div class="nguoidung-summary">
            <span><strong>${users.length}</strong> người dùng</span>
            <span>·</span>
            <span><strong>${departments.length}</strong> phòng ban</span>
        </div>

        <div class="section-card">
            <div class="table-container">
                <table class="nguoidung-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Họ tên</th>
                            <th>Phòng ban</th>
                            <th>Vai trò</th>
                            <th>Số việc</th>
                            <th>Khối lượng</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map((u, i) => `
                            <tr>
                                <td>${i + 1}</td>
                                <td><strong>${u.ten}</strong></td>
                                <td>${u.dept}</td>
                                <td><span class="role-pill ${u.vai === 'Chủ tịch' ? 'role-admin' : 'role-user'}">${u.vai}</span></td>
                                <td>${u.soViec}</td>
                                <td>${u.khoiLuong}</td>
                                <td><span class="status-pill active"><i class="ti ti-circle-filled"></i> Hoạt động</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="nguoidung-note">
            <i class="ti ti-info-circle"></i>
            <span>Thêm/sửa/xóa tài khoản và phân quyền chi tiết sẽ có trong phiên bản <strong>App riêng (Bước 3 — FastAPI + JWT)</strong></span>
        </div>
    `;
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
            <p>${message}</p>
            <button onclick="fetchData()" class="btn-primary">Thử lại</button>
        </div>
    `;
}
