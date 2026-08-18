// === TRANG: Người dùng · Cập nhật số liệu ===

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
                                <td><strong>${escapeHtml(u.ten)}</strong></td>
                                <td>${escapeHtml(u.dept)}</td>
                                <td><span class="role-pill ${u.vai === 'Chủ tịch' ? 'role-admin' : 'role-user'}">${escapeHtml(u.vai)}</span></td>
                                <td>${escapeHtml(u.soViec)}</td>
                                <td>${escapeHtml(u.khoiLuong)}</td>
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
