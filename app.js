// === CONFIG ===
// Link CSV trực tiếp từ Google Sheets (đã publish)
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQj824lSoKDpnjPl2ChHFKw832dRjXXiDeF_xMlo4hbjyo6WtoefDiGT4PctBSU6muoXF9cnN6hkRSQ/pub?gid=1567229633&single=true&output=csv';

// Thử fetch trực tiếp, nếu lỗi CORS thì dùng proxy
const CORS_PROXY = 'https://corsproxy.io/?';

// Auto-refresh interval (5 phút = 300000ms)
const AUTO_REFRESH_INTERVAL = 300000;

// === GLOBAL DATA ===
let allTasks = [];
let departmentChart = null;
let statusChart = null;
let isLoading = false;

// === MAIN ===
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupFilters();
    setupRefreshButton();

    // Auto-refresh mỗi 5 phút
    setInterval(() => {
        console.log('Auto-refresh triggered');
        fetchData();
    }, AUTO_REFRESH_INTERVAL);
});

// === FETCH DATA ===
async function fetchData() {
    // Tránh fetch trùng lặp
    if (isLoading) {
        console.log('Already loading, skipping...');
        return;
    }

    isLoading = true;

    try {
        showLoading();

        let response;
        let csvText;

        // Thêm cache-busting timestamp để tránh browser cache
        const cacheBuster = '&_t=' + Date.now();
        const urlWithCacheBust = SHEET_CSV_URL + cacheBuster;

        // Thử fetch trực tiếp trước
        try {
            response = await fetch(urlWithCacheBust, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (!response.ok) throw new Error('Direct fetch failed');
            csvText = await response.text();
            console.log('Direct fetch successful');
        } catch (e) {
            // Nếu lỗi CORS, dùng proxy
            console.log('Direct fetch failed, trying CORS proxy...');
            response = await fetch(CORS_PROXY + encodeURIComponent(urlWithCacheBust), {
                cache: 'no-store'
            });
            if (!response.ok) throw new Error('Không thể tải dữ liệu');
            csvText = await response.text();
            console.log('CORS proxy fetch successful');
        }

        const tasks = parseCSV(csvText);
        allTasks = tasks;

        console.log(`Loaded ${tasks.length} tasks`);

        renderDashboard(tasks);
        updateLastUpdate();
    } catch (error) {
        console.error('Error:', error);
        showError('Lỗi tải dữ liệu: ' + error.message + '. Vui lòng kiểm tra Google Sheets đã Publish to web chưa.');
    } finally {
        isLoading = false;
    }
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

// === PARSE CSV ===
function parseCSV(csv) {
    const lines = csv.split('\n');
    const tasks = [];

    // Find header row (contains "Mã việc")
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Mã việc')) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) return tasks;

    // Parse data rows (skip header)
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);

        // Skip empty rows or instruction rows
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

// Parse CSV row handling quoted fields
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

// Parse percent (handles "80%" or "0.8")
function parsePercent(value) {
    if (!value) return 0;
    const str = value.toString().trim();
    if (str.includes('%')) {
        return parseFloat(str.replace('%', '')) / 100;
    }
    const num = parseFloat(str);
    return num > 1 ? num / 100 : num;
}

// === RENDER DASHBOARD ===
function renderDashboard(tasks) {
    renderOverviewCards(tasks);
    renderOverallProgress(tasks);
    renderDepartmentTable(tasks);
    renderCharts(tasks);
    renderUrgentSection(tasks);
    renderTasksTable(tasks);
    populateDepartmentFilter(tasks);
}

// === URGENT SECTION (Cần cập nhật ngay) ===
function renderUrgentSection(tasks) {
    const urgentTasks = tasks.filter(t => t.trangThai === 'Chưa báo cáo');
    const section = document.getElementById('urgentSection');
    const tbody = document.querySelector('#urgentTable tbody');
    const emptyMsg = document.getElementById('urgentEmpty');
    const table = document.getElementById('urgentTable');

    if (urgentTasks.length === 0) {
        table.style.display = 'none';
        emptyMsg.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyMsg.style.display = 'none';
    tbody.innerHTML = '';

    urgentTasks.forEach(task => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${task.nhiemVu}</strong></td>
            <td>${task.canBo}</td>
            <td>${task.phongBan}</td>
            <td>${task.khoiLuong}</td>
            <td>${task.hanHoanThanh}</td>
        `;
        tbody.appendChild(row);
    });
}

// === OVERVIEW CARDS ===
function renderOverviewCards(tasks) {
    const stats = calculateStats(tasks);

    document.getElementById('totalTasks').textContent = stats.total;
    document.getElementById('completedTasks').textContent = stats.completed;
    document.getElementById('inProgressTasks').textContent = stats.inProgress;
    document.getElementById('overdueTasks').textContent = stats.overdue;
    document.getElementById('pendingTasks').textContent = stats.pending;
    document.getElementById('noReportTasks').textContent = stats.noReport;
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

// === OVERALL PROGRESS ===
function renderOverallProgress(tasks) {
    const progress = calculateWeightedProgress(tasks);
    const progressBar = document.getElementById('overallProgress');
    const progressText = document.getElementById('overallProgressText');

    progressBar.style.width = progress + '%';
    progressText.textContent = progress.toFixed(1) + '%';

    // Change text color based on progress
    if (progress > 50) {
        progressText.style.color = 'white';
    }
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

// === DEPARTMENT TABLE ===
function renderDepartmentTable(tasks) {
    const departments = {};

    tasks.forEach(task => {
        const dept = task.phongBan;
        if (!dept) return;

        if (!departments[dept]) {
            departments[dept] = {
                name: dept,
                tasks: [],
                totalWeight: 0,
                weightedProgress: 0
            };
        }

        departments[dept].tasks.push(task);
        departments[dept].totalWeight += task.khoiLuong;
        departments[dept].weightedProgress += task.khoiLuong * task.phanTram;
    });

    const tbody = document.querySelector('#departmentTable tbody');
    tbody.innerHTML = '';

    Object.values(departments).forEach(dept => {
        const progress = dept.totalWeight > 0
            ? (dept.weightedProgress / dept.totalWeight) * 100
            : 0;

        const stats = {
            completed: dept.tasks.filter(t => t.trangThai === 'Hoàn thành').length,
            inProgress: dept.tasks.filter(t => t.trangThai === 'Đang thực hiện').length,
            overdue: dept.tasks.filter(t => t.trangThai === 'Trễ hạn').length,
            pending: dept.tasks.filter(t => t.trangThai === 'Chờ phê duyệt').length,
            noReport: dept.tasks.filter(t => t.trangThai === 'Chưa báo cáo').length
        };

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${dept.name}</strong></td>
            <td>${dept.tasks.length}</td>
            <td>${dept.totalWeight}</td>
            <td>
                <div class="progress-cell">
                    <div class="progress-mini">
                        <div class="progress-mini-bar" style="width: ${progress}%"></div>
                    </div>
                    <span>${progress.toFixed(0)}%</span>
                </div>
            </td>
            <td>${stats.completed}</td>
            <td>${stats.inProgress}</td>
            <td style="color: ${stats.overdue > 0 ? '#ef4444' : 'inherit'}">${stats.overdue}</td>
            <td>${stats.pending}</td>
            <td>${stats.noReport}</td>
        `;
        tbody.appendChild(row);
    });
}

// === CHARTS ===
function renderCharts(tasks) {
    renderDepartmentChart(tasks);
    renderStatusChart(tasks);
}

function renderDepartmentChart(tasks) {
    const departments = {};

    tasks.forEach(task => {
        const dept = task.phongBan;
        if (!dept) return;

        if (!departments[dept]) {
            departments[dept] = { totalWeight: 0, weightedProgress: 0 };
        }
        departments[dept].totalWeight += task.khoiLuong;
        departments[dept].weightedProgress += task.khoiLuong * task.phanTram;
    });

    // Tính % và sắp xếp giảm dần
    const deptData = Object.keys(departments).map(dept => {
        const d = departments[dept];
        const pct = d.totalWeight > 0 ? (d.weightedProgress / d.totalWeight) * 100 : 0;
        return { name: dept, pct: pct };
    }).sort((a, b) => b.pct - a.pct); // Sắp giảm dần

    const labels = deptData.map(d => d.name);
    const data = deptData.map(d => d.pct);

    const ctx = document.getElementById('departmentChart').getContext('2d');

    if (departmentChart) departmentChart.destroy();

    departmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '% Hoàn thành',
                data: data,
                backgroundColor: '#16a34a',
                borderRadius: 6,
                barThickness: 20
            }]
        },
        options: {
            indexAxis: 'y', // Biểu đồ ngang
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => value + '%'
                    },
                    grid: {
                        color: '#e5e7eb'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function renderStatusChart(tasks) {
    const stats = calculateStats(tasks);

    const ctx = document.getElementById('statusChart').getContext('2d');

    if (statusChart) statusChart.destroy();

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Hoàn thành', 'Đang thực hiện', 'Trễ hạn', 'Chờ phê duyệt', 'Chưa báo cáo'],
            datasets: [{
                data: [stats.completed, stats.inProgress, stats.overdue, stats.pending, stats.noReport],
                backgroundColor: ['#22c55e', '#3b82f6', '#ef4444', '#8b5cf6', '#9ca3af'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// === TASKS TABLE ===
function renderTasksTable(tasks) {
    const tbody = document.querySelector('#tasksTable tbody');
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

        // Cột hạn tô đỏ nếu trễ hạn
        const hanStyle = task.trangThai === 'Trễ hạn' ? 'color: #dc2626; font-weight: 600;' : '';

        row.innerHTML = `
            <td><strong>${task.maViec}</strong></td>
            <td>${task.nhiemVu}</td>
            <td>${task.phongBan}</td>
            <td>${task.canBo}</td>
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

// === FILTERS ===
function setupFilters() {
    document.getElementById('filterDepartment').addEventListener('change', applyFilters);
    document.getElementById('filterStatus').addEventListener('change', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
}

function populateDepartmentFilter(tasks) {
    const departments = [...new Set(tasks.map(t => t.phongBan).filter(d => d))];
    const select = document.getElementById('filterDepartment');

    // Keep first option
    select.innerHTML = '<option value="">Tất cả phòng ban</option>';

    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        select.appendChild(option);
    });
}

function applyFilters() {
    const deptFilter = document.getElementById('filterDepartment').value;
    const statusFilter = document.getElementById('filterStatus').value;

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
    document.getElementById('filterDepartment').value = '';
    document.getElementById('filterStatus').value = '';
    renderTasksTable(allTasks);
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
    document.getElementById('lastUpdate').textContent = formatted;
}

function showLoading() {
    const tbody = document.querySelector('#tasksTable tbody');
    tbody.innerHTML = '<tr><td colspan="10" class="loading">Đang tải dữ liệu...</td></tr>';
}

function showError(message) {
    const tbody = document.querySelector('#tasksTable tbody');
    tbody.innerHTML = `<tr><td colspan="10" class="error">${message}</td></tr>`;
}
