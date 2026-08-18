// === TRANG: Nhân sự · Hồ sơ cán bộ · KPI cá nhân ===

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
                <div class="staff-card" data-staff="${escapeHtml(staff.name)}">
                    <div class="staff-header">
                        <div class="staff-avatar">${escapeHtml(staff.name.charAt(0).toUpperCase())}</div>
                        <div class="staff-info">
                            <h4>${escapeHtml(staff.name)}</h4>
                            <span class="staff-dept">${escapeHtml(staff.department)}</span>
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
                <p class="error-sub">Cán bộ "${escapeHtml(staffName)}" không thuộc phạm vi quản lý của bạn.</p>
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
        container.innerHTML = `<p>Không tìm thấy nhiệm vụ của cán bộ: ${escapeHtml(staffName)}</p>`;
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
            <div class="profile-avatar">${escapeHtml(staffName.charAt(0).toUpperCase())}</div>
            <div class="profile-info">
                <h2>${escapeHtml(staffName)}</h2>
                <p>${escapeHtml(department)}</p>
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
                                    <td><strong>${escapeHtml(task.maViec)}</strong></td>
                                    <td>${escapeHtml(task.nhiemVu)}</td>
                                    <td>${task.khoiLuong}</td>
                                    <td>
                                        <div class="progress-cell">
                                            <div class="progress-mini">
                                                <div class="progress-mini-bar" style="width: ${pct}%"></div>
                                            </div>
                                            <span>${pct}%</span>
                                        </div>
                                    </td>
                                    <td><span class="status-badge ${statusClass}">${escapeHtml(task.trangThai)}</span></td>
                                    <td>${escapeHtml(task.hanHoanThanh)}</td>
                                    <td>${escapeHtml(task.ngayCapNhat)}</td>
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
                ${staffList.map(s => `<option value="${escapeHtml(s)}" ${selectedStaffKPI === s ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
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
        return `<p class="error-msg">Không tìm thấy nhiệm vụ của cán bộ: ${escapeHtml(staffName)}</p>`;
    }

    const department = staffTasks[0].phongBan;
    const totalWeight = staffTasks.reduce((s, t) => s + t.khoiLuong, 0);
    const progress = calculateWeightedProgress(staffTasks);
    const stats = calculateStats(staffTasks);

    return `
        <div class="kpi-canhan-profile">
            <div class="profile-header">
                <div class="profile-avatar">${escapeHtml(staffName.charAt(0).toUpperCase())}</div>
                <div class="profile-info">
                    <h2>${escapeHtml(staffName)}</h2>
                    <p>${escapeHtml(department)} · Kỳ ${CONFIG.KY_HIEN_TAI}</p>
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
                                        <td><strong>${escapeHtml(task.maViec)}</strong></td>
                                        <td>${escapeHtml(task.nhiemVu)}</td>
                                        <td>${task.khoiLuong}</td>
                                        <td>
                                            <div class="progress-cell">
                                                <div class="progress-mini">
                                                    <div class="progress-mini-bar" style="width: ${pct}%"></div>
                                                </div>
                                                <span>${pct}%</span>
                                            </div>
                                        </td>
                                        <td><span class="status-badge ${statusClass}">${escapeHtml(task.trangThai)}</span></td>
                                        <td>${escapeHtml(task.hanHoanThanh)}</td>
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
