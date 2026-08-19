// === TẦNG DỮ LIỆU ===
// Bước 2: tải CSV từ Google Sheets rồi parse.
// Bước 3: thay bằng fetch('/api/tasks') — chỉ sửa file này.

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

        // Cảnh báo nếu scope trong leaders.js không khớp đơn vị nào trong Sheet
        validateLeaders();

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
    // Parse CSV với multiline support (xử lý fields trong quotes có newline)
    const rows = parseCSVWithMultiline(csv);
    const tasks = [];
    const staffSet = new Set();
    const deptSet = new Set();

    // Tìm dòng header (chứa "Mã việc")
    let headerIndex = -1;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].some(cell => cell.includes('Mã việc'))) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) return tasks;

    // Parse header để tạo column index mapping
    const headerRow = rows[headerIndex];
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

    // Cảnh báo nếu Sheet thiếu cột bắt buộc (giữ lại — hữu ích khi xã sửa Sheet)
    const missing = ['maViec', 'nhiemVu', 'phongBan', 'canBo', 'khoiLuong', 'phanTram', 'trangThai']
        .filter(c => columnIndex[c] === undefined);
    if (missing.length) {
        console.warn('[CSV] Sheet thiếu cột:', missing.join(', '), '— các cột này sẽ để trống.');
    }

    // CHỈ đọc những dòng LÀ NHIỆM VỤ THẬT.
    // Sheet còn chứa dòng khai báo lãnh đạo (đầu bảng), dòng chỗ trống chờ điền
    // (có mã việc nhưng chưa có tên nhiệm vụ) và dòng hướng dẫn (cuối bảng).
    // Trước đây allStaff/allDepartments gom từ MỌI dòng nên 2 Phó Chủ tịch lọt vào
    // danh sách cán bộ và "PCT UBND xã" lọt vào danh sách phòng ban.
    for (let i = headerIndex + 1; i < rows.length; i++) {
        const row = rows[i];

        // Lấy giá trị các cột quan trọng
        const maViec = getColumnValue(row, columnIndex, 'maViec', '').trim();
        const canBo = getColumnValue(row, columnIndex, 'canBo', '').trim();
        const phongBan = getColumnValue(row, columnIndex, 'phongBan', '').trim();

        if (!isValidTaskRow(row, columnIndex)) continue;

        // Chỉ dòng nhiệm vụ thật mới đóng góp vào danh mục cán bộ / phòng ban
        if (canBo) staffSet.add(canBo);
        if (phongBan) deptSet.add(phongBan);

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

        tasks.push(task);
    }

    // Danh mục cán bộ / phòng ban — chỉ từ nhiệm vụ thật
    allStaff = [...staffSet].sort();
    allDepartments = [...deptSet].sort();

    return tasks;
}


// Một dòng là NHIỆM VỤ THẬT khi có mã việc đúng dạng CV + số VÀ có tên nhiệm vụ.
// Loại được: dòng khai báo lãnh đạo (không có mã việc), dòng chỗ trống chờ điền
// (có mã nhưng chưa có tên nhiệm vụ), dòng hướng dẫn cuối Sheet.
function isValidTaskRow(row, columnIndex) {
    const maViec = getColumnValue(row, columnIndex, 'maViec', '').trim();
    const tenNhiemVu = getColumnValue(row, columnIndex, 'nhiemVu', '').trim();
    return /^CV\d+$/i.test(maViec) && tenNhiemVu.length > 0;
}


// Helper function để lấy giá trị cột an toàn
function getColumnValue(row, columnIndex, field, defaultValue) {
    const idx = columnIndex[field];
    if (idx === undefined || idx >= row.length) return defaultValue;
    return (row[idx] || '').trim() || defaultValue;
}


// Parse CSV với multiline support (xử lý fields trong quotes có newline)
function parseCSVWithMultiline(csv) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        const nextChar = csv[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote ""
                currentCell += '"';
                i++;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            // End of row (but not if inside quotes)
            currentRow.push(currentCell.trim());
            if (currentRow.length > 0 && currentRow.some(c => c)) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
            if (char === '\r') i++; // Skip \n after \r
        } else if (char === '\r' && !inQuotes) {
            // Handle \r alone
            currentRow.push(currentCell.trim());
            if (currentRow.length > 0 && currentRow.some(c => c)) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }

    // Don't forget last cell and row
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c)) {
            rows.push(currentRow);
        }
    }

    return rows;
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
