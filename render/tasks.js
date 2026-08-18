// === TRANG: Theo dõi · Cần cập nhật · Phân công ===

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
                ${departments.map(d => `<option value="${escapeHtml(d)}" ${currentFilters.department === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}
            </select>
            <select id="filterStatus">
                <option value="">Tất cả trạng thái</option>
                ${statuses.map(s => `<option value="${escapeHtml(s)}" ${currentFilters.status === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
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
            <td><strong>${escapeHtml(task.maViec)}</strong></td>
            <td>${escapeHtml(task.nhiemVu)}</td>
            <td>${escapeHtml(task.phongBan)}</td>
            <td><a href="#" class="name-link" data-staff="${escapeHtml(task.canBo)}">${escapeHtml(task.canBo)}</a></td>
            <td>${task.khoiLuong}</td>
            <td>
                <div class="progress-cell">
                    <div class="progress-mini">
                        <div class="progress-mini-bar" style="width: ${progressPercent}%"></div>
                    </div>
                    <span>${progressPercent}%</span>
                </div>
            </td>
            <td><span class="status-badge ${statusClass}">${escapeHtml(task.trangThai)}</span></td>
            <td style="${hanStyle}">${escapeHtml(task.hanHoanThanh)}</td>
            <td>${escapeHtml(task.ngayCapNhat)}</td>
            <td>${escapeHtml(task.ghiChu)}</td>
        `;
        tbody.appendChild(row);
    });
    // Click tên cán bộ do setupDelegatedClicks() trong app.js xử lý (data-staff)
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
                                    <td><strong>${escapeHtml(task.maViec)}</strong></td>
                                    <td>${escapeHtml(task.nhiemVu)}</td>
                                    <td>${escapeHtml(task.phongBan)}</td>
                                    <td><a href="#" class="name-link" data-staff="${escapeHtml(task.canBo)}">${escapeHtml(task.canBo)}</a></td>
                                    <td>${task.khoiLuong}</td>
                                    <td>${escapeHtml(task.hanHoanThanh)}</td>
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
                                    <td><strong>${escapeHtml(task.maViec)}</strong></td>
                                    <td>${escapeHtml(task.nhiemVu)}</td>
                                    <td>${escapeHtml(task.phongBan)}</td>
                                    <td><a href="#" class="name-link" data-staff="${escapeHtml(task.canBo)}">${escapeHtml(task.canBo)}</a></td>
                                    <td>${(task.phanTram * 100).toFixed(0)}%</td>
                                    <td style="color: #dc2626; font-weight: 600;">${escapeHtml(task.hanHoanThanh)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;

    // Click tên cán bộ do setupDelegatedClicks() trong app.js xử lý (data-staff)
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
            <div class="phancong-dept" data-dept-group="${escapeHtml(dept)}">
                <div class="dept-header-pc" data-action="toggle-dept">
                    <i class="ti ti-folder"></i>
                    <strong>${escapeHtml(dept)}</strong>
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
                        <i class="ti ti-user"></i> ${escapeHtml(staff)}
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
                        <span class="task-code-pc">${escapeHtml(task.maViec)}</span>
                        <span class="task-name-pc">${escapeHtml(task.nhiemVu)}</span>
                        <span class="task-pct-pc">${pct}%</span>
                        <span class="status-badge ${statusClass}">${escapeHtml(task.trangThai)}</span>
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

    // Gập/mở nhóm do setupDelegatedClicks() xử lý (data-action="toggle-dept")
}
