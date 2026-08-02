// === CONFIG ===
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQj824lSoKDpnjPl2ChHFKw832dRjXXiDeF_xMlo4hbjyo6WtoefDiGT4PctBSU6muoXF9cnN6hkRSQ/pub?gid=1567229633&single=true&output=csv';

// === GLOBAL DATA ===
let allTasks = [];
let departmentChart = null;
let statusChart = null;

// === MAIN ===
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupFilters();
});

// === FETCH DATA ===
async function fetchData() {
    try {
        showLoading();
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error('Không thể tải dữ liệu');

        const csvText = await response.text();
        const tasks = parseCSV(csvText);
        allTasks = tasks;

        renderDashboard(tasks);
        updateLastUpdate();
    } catch (error) {
        console.error('Error:', error);
        showError('Lỗi tải dữ liệu: ' + error.message);
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
    renderTasksTable(tasks);
    populateDepartmentFilter(tasks);
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

    const labels = Object.keys(departments);
    const data = labels.map(dept => {
        const d = departments[dept];
        return d.totalWeight > 0 ? (d.weightedProgress / d.totalWeight) * 100 : 0;
    });

    const ctx = document.getElementById('departmentChart').getContext('2d');

    if (departmentChart) departmentChart.destroy();

    departmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '% Hoàn thành',
                data: data,
                backgroundColor: data.map(v => v >= 80 ? '#22c55e' : v >= 50 ? '#f59e0b' : '#ef4444'),
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => value + '%'
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
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
            <td>${task.hanHoanThanh}</td>
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
