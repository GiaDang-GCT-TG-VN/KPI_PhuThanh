// === TRANG: Dashboard · KPI phòng ban · Bộ KPI ===

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


function renderDepartmentTable(tasks) {
    const departments = getDepartmentData(tasks);
    const tbody = document.querySelector('#departmentTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    departments.forEach(dept => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(dept.name)}</strong></td>
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
                        <h4>${escapeHtml(dept.name)}</h4>
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
                                    <span class="task-name">${escapeHtml(task.nhiemVu)}</span>
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
                                    <td><strong>${escapeHtml(dept.name)}</strong></td>
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
