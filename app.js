// === CONFIG ===
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQj824lSoKDpnjPl2ChHFKw832dRjXXiDeF_xMlo4hbjyo6WtoefDiGT4PctBSU6muoXF9cnN6hkRSQ/pub?gid=1567229633&single=true&output=csv';
const CORS_PROXY = 'https://corsproxy.io/?';
const AUTO_REFRESH_INTERVAL = 300000; // 5 phút

// === GLOBAL STATE ===
let allTasks = [];
let departmentChart = null;
let statusChart = null;
let isLoading = false;
let currentPage = 'dashboard';
let currentFilters = { department: '', status: '' };
let currentStaffProfile = null;

// === PAGE TITLES ===
const pageTitles = {
    'dashboard': { title: 'Dashboard', subtitle: 'Tổng quan KPI toàn xã · Kỳ 06/2026' },
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
    fetchData();

    // Auto-refresh mỗi 5 phút
    setInterval(() => {
        console.log('Auto-refresh triggered');
        fetchData();
    }, AUTO_REFRESH_INTERVAL);
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
        // Placeholder pages
        case 'bo-kpi':
        case 'capnhat-solieu':
        case 'kpi-canhan':
        case 'phancong':
        case 'nguoidung':
            renderPlaceholderPage(page);
            break;
        default:
            renderDashboardPage();
    }
}

// === PLACEHOLDER PAGE ===
function renderPlaceholderPage(page) {
    const container = document.getElementById('mainContainer');
    const pageInfo = pageTitles[page] || { title: page, subtitle: '' };

    container.innerHTML = `
        <div class="placeholder-page">
            <div class="placeholder-card">
                <i class="ti ti-lock placeholder-icon"></i>
                <h2>${pageInfo.title}</h2>
                <p class="placeholder-subtitle">${pageInfo.subtitle}</p>
                <p class="placeholder-note">Tính năng đang phát triển — sẽ hoàn thiện ở bước 3 (App riêng)</p>
            </div>
        </div>
    `;
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
            console.log('Manual refresh triggered');
            fetchData();
        });
    }
}

// === FETCH DATA ===
async function fetchData() {
    if (isLoading) {
        console.log('Already loading, skipping...');
        return;
    }

    isLoading = true;
    showLoading();

    try {
        let csvText;
        const cacheBuster = '&_t=' + Date.now();
        const urlWithCacheBust = SHEET_CSV_URL + cacheBuster;

        try {
            const response = await fetch(urlWithCacheBust, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (!response.ok) throw new Error('Direct fetch failed');
            csvText = await response.text();
            console.log('Direct fetch successful');
        } catch (e) {
            console.log('Direct fetch failed, trying CORS proxy...');
            const response = await fetch(CORS_PROXY + encodeURIComponent(urlWithCacheBust), {
                cache: 'no-store'
            });
            if (!response.ok) throw new Error('Không thể tải dữ liệu');
            csvText = await response.text();
            console.log('CORS proxy fetch successful');
        }

        allTasks = parseCSV(csvText);
        console.log(`Loaded ${allTasks.length} tasks`);

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
    const count = allTasks.filter(t => t.trangThai === 'Chưa báo cáo').length;
    const badge = document.getElementById('badgeChuaBaoCao');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

// === PARSE CSV ===
function parseCSV(csv) {
    const lines = csv.split('\n');
    const tasks = [];

    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Mã việc')) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) return tasks;

    for (let i = headerIndex + 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);

        if (!row[0] || row[0].startsWith('HƯỚNG DẪN') || !row[0].startsWith('CV')) continue;

        const task = {
            maViec: row[0] || '',
            nhiemVu: row[1] || '',
            phongBan: row[2] || '',
            canBo: row[3] || '',
            khoiLuong: parseFloat(row[4]) || 0,
            phanTram: parsePercent(row[5]),
            trangThai: row[6] || '',
            hanHoanThanh: row[7] || '',
            ngayCapNhat: row[8] || '',
            nguoiGiao: row[9] || '',
            donViPhoiHop: row[10] || '',
            ghiChu: row[11] || ''
        };

        if (task.maViec && task.nhiemVu) {
            tasks.push(task);
        }
    }

    return tasks;
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
    const stats = calculateStats(allTasks);
    const overallProgress = calculateWeightedProgress(allTasks);

    container.innerHTML = `
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
                <div class="kpi-sub">kỳ 06/2026</div>
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

    // Render data
    renderDepartmentTable(allTasks);
    renderCharts(allTasks);
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
            deptMap[dept] = {
                name: dept,
                tasks: [],
                totalWeight: 0,
                weightedProgress: 0
            };
        }

        deptMap[dept].tasks.push(task);
        deptMap[dept].totalWeight += task.khoiLuong;
        deptMap[dept].weightedProgress += task.khoiLuong * task.phanTram;
    });

    return Object.values(deptMap).map(dept => {
        const progress = dept.totalWeight > 0
            ? (dept.weightedProgress / dept.totalWeight) * 100
            : 0;

        return {
            name: dept.name,
            taskCount: dept.tasks.length,
            totalWeight: dept.totalWeight,
            progress: progress,
            tasks: dept.tasks,
            stats: {
                completed: dept.tasks.filter(t => t.trangThai === 'Hoàn thành').length,
                inProgress: dept.tasks.filter(t => t.trangThai === 'Đang thực hiện').length,
                overdue: dept.tasks.filter(t => t.trangThai === 'Trễ hạn').length,
                pending: dept.tasks.filter(t => t.trangThai === 'Chờ phê duyệt').length,
                noReport: dept.tasks.filter(t => t.trangThai === 'Chưa báo cáo').length
            }
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
    const departments = getDepartmentData(allTasks);

    container.innerHTML = `
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
    const departments = [...new Set(allTasks.map(t => t.phongBan).filter(d => d))];
    const statuses = ['Hoàn thành', 'Đang thực hiện', 'Trễ hạn', 'Chờ phê duyệt', 'Chưa báo cáo'];

    container.innerHTML = `
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

    let filtered = allTasks;

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
    renderTasksTable(allTasks);
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

    // Group tasks by staff
    const staffMap = {};
    allTasks.forEach(task => {
        const name = task.canBo;
        if (!name) return;

        if (!staffMap[name]) {
            staffMap[name] = {
                name: name,
                department: task.phongBan,
                tasks: [],
                totalWeight: 0,
                weightedProgress: 0
            };
        }
        staffMap[name].tasks.push(task);
        staffMap[name].totalWeight += task.khoiLuong;
        staffMap[name].weightedProgress += task.khoiLuong * task.phanTram;
    });

    const staffList = Object.values(staffMap).map(s => {
        const progress = s.totalWeight > 0 ? (s.weightedProgress / s.totalWeight) * 100 : 0;
        return {
            ...s,
            progress: progress,
            stats: {
                completed: s.tasks.filter(t => t.trangThai === 'Hoàn thành').length,
                inProgress: s.tasks.filter(t => t.trangThai === 'Đang thực hiện').length,
                overdue: s.tasks.filter(t => t.trangThai === 'Trễ hạn').length,
                noReport: s.tasks.filter(t => t.trangThai === 'Chưa báo cáo').length
            }
        };
    }).sort((a, b) => b.progress - a.progress);

    container.innerHTML = `
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

    const staffTasks = allTasks.filter(t => t.canBo === staffName);
    if (staffTasks.length === 0) {
        container.innerHTML = `<p>Không tìm thấy cán bộ: ${staffName}</p>`;
        return;
    }

    const department = staffTasks[0].phongBan;
    let totalWeight = 0, weightedProgress = 0;
    staffTasks.forEach(t => {
        totalWeight += t.khoiLuong;
        weightedProgress += t.khoiLuong * t.phanTram;
    });
    const progress = totalWeight > 0 ? (weightedProgress / totalWeight) * 100 : 0;

    const stats = {
        completed: staffTasks.filter(t => t.trangThai === 'Hoàn thành').length,
        inProgress: staffTasks.filter(t => t.trangThai === 'Đang thực hiện').length,
        overdue: staffTasks.filter(t => t.trangThai === 'Trễ hạn').length,
        pending: staffTasks.filter(t => t.trangThai === 'Chờ phê duyệt').length,
        noReport: staffTasks.filter(t => t.trangThai === 'Chưa báo cáo').length
    };

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

    const chuaBaoCao = allTasks.filter(t => t.trangThai === 'Chưa báo cáo');
    const treHan = allTasks.filter(t => t.trangThai === 'Trễ hạn');

    container.innerHTML = `
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
