# Báo cáo Audit Hệ thống KPI Dashboard
**Ngày:** 09/08/2026
**Phiên bản:** Trước bàn giao cho UBND xã Phú Thành

---

## 1. Tổng quan cấu trúc

| File | Số dòng | Ghi chú |
|------|---------|---------|
| index.html | 124 | Layout + sidebar + header |
| style.css | 2,206 | Nhiều class trùng lặp |
| app.js | 2,074 | 47 functions, 15 biến global |
| **Tổng** | **4,404** | |

### 1.1 Danh sách biến Global (15 biến)

| # | Tên | Dòng | Mục đích |
|---|-----|------|----------|
| 1 | SHEET_CSV_URL | 2 | URL fetch CSV từ Google Sheets |
| 2 | SHEET_EDIT_URL | 3 | URL mở Google Sheets để edit |
| 3 | CORS_PROXY | 4 | Proxy URL khi fetch trực tiếp fail |
| 4 | AUTO_REFRESH_INTERVAL | 5 | Thời gian auto-refresh (5 phút) |
| 5 | allTasks | 8 | Mảng TẤT CẢ nhiệm vụ (KHÔNG lọc theo role) |
| 6 | allStaff | 9 | Mảng TẤT CẢ cán bộ (KHÔNG lọc theo role) |
| 7 | allDepartments | 10 | Mảng TẤT CẢ phòng ban (KHÔNG lọc theo role) |
| 8 | departmentChart | 11 | Instance Chart.js phòng ban |
| 9 | statusChart | 12 | Instance Chart.js trạng thái |
| 10 | isLoading | 13 | Flag tránh fetch trùng |
| 11 | currentPage | 14 | Trang hiện tại |
| 12 | currentFilters | 15 | Bộ lọc trang Theo dõi |
| 13 | currentStaffProfile | 16 | Cán bộ đang xem ở Nhân sự |
| 14 | LEADERS | 20-33 | Mảng 9 lãnh đạo (hardcode) |
| 15 | currentLeader | 34 | Lãnh đạo đang được chọn |
| 16 | MENU_ACCESS | 37-41 | Quyền menu theo role |
| 17 | pageTitles | 44-55 | Tiêu đề các trang |
| 18 | COLUMN_MAP | 396-412 | Map header CSV → field name |
| 19 | selectedStaffKPI | 1707 | Cán bộ đang xem ở KPI cá nhân |

### 1.2 Danh sách Functions (47 hàm)

| # | Tên | Dòng | Mục đích |
|---|-----|------|----------|
| 1 | setupNavigation | 73-81 | Setup click handler cho sidebar |
| 2 | navigateTo | 83-109 | Điều hướng giữa các trang |
| 3 | renderPage | 111-153 | Switch render trang theo page name |
| 4 | renderPlaceholderPage | 155-170 | Render trang placeholder (không dùng) |
| 5 | setupMobileMenu | 172-187 | Setup menu mobile |
| 6 | setupRefreshButton | 189-198 | Setup nút refresh |
| 7 | setupRoleSwitcher | 200-205 | Setup dropdown chọn vai |
| 8 | populateLeaderDropdown | 207-234 | Render options cho dropdown LEADERS |
| 9 | onLeaderChange | 236-247 | Handler khi đổi leader |
| 10 | getVisibleTasks | 249-256 | **QUAN TRỌNG** - Lọc tasks theo scope |
| 11 | updateSidebarForRole | 258-291 | Ẩn/hiện menu theo role |
| 12 | updateUserInfoDisplay | 293-309 | Cập nhật user info sidebar |
| 13 | renderScopeBanner | 311-328 | Render banner phạm vi xem |
| 14 | fetchData | 330-379 | Fetch CSV từ Google Sheets |
| 15 | updateBadge | 383-393 | Cập nhật badge "Cần cập nhật" |
| 16 | parseCSV | 414-501 | Parse CSV thành array tasks |
| 17 | getColumnValue | 504-508 | Helper lấy giá trị cột |
| 18 | parseCSVRow | 510-528 | Parse 1 dòng CSV |
| 19 | parsePercent | 530-540 | Parse giá trị % |
| 20 | renderDashboardPage | 543-632 | **PAGE 1** - Dashboard tổng quan |
| 21 | calculateStats | 634-643 | Tính thống kê từ tasks |
| 22 | calculateWeightedProgress | 645-657 | Tính % theo khối lượng |
| 23 | renderDepartmentTable | 659-688 | Render bảng phòng ban (Dashboard) |
| 24 | getDepartmentData | 690-731 | Group tasks theo phòng ban |
| 25 | renderCharts | 733-736 | Wrapper render 2 chart |
| 26 | renderDepartmentChart | 738-796 | Render chart phòng ban |
| 27 | renderStatusChart | 798-835 | Render chart trạng thái |
| 28 | renderKpiPhongBanPage | 837-891 | **PAGE 2** - KPI Phòng ban |
| 29 | getTaskClass | 893-901 | Helper CSS class cho task |
| 30 | renderTheodoiPage | 903-956 | **PAGE 3** - Theo dõi công việc |
| 31 | applyFilters | 958-976 | Apply filter Theo dõi |
| 32 | resetFilters | 978-983 | Reset filter Theo dõi |
| 33 | renderTasksTable | 985-1037 | Render bảng nhiệm vụ (Theo dõi) |
| 34 | getStatusClass | 1039-1051 | Helper CSS class cho status |
| 35 | renderNhanSuPage | 1053-1132 | **PAGE 4** - Nhân sự |
| 36 | renderStaffProfile | 1134-1265 | Render chi tiết cán bộ (Nhân sự) |
| 37 | renderCanCapNhatPage | 1267-1352 | **PAGE 5** - Cần cập nhật |
| 38 | renderBoKPIPage | 1354-1523 | **PAGE 6** - Bộ KPI |
| 39 | renderCapNhatSoLieuPage | 1525-1705 | **PAGE 7** - Cập nhật số liệu |
| 40 | renderKPICaNhanPage | 1709-1763 | **PAGE 8** - KPI cá nhân |
| 41 | renderKPICaNhanProfile | 1765-1872 | Render chi tiết (KPI cá nhân) |
| 42 | renderPhanCongPage | 1874-1962 | **PAGE 9** - Phân công công việc |
| 43 | renderNguoiDungPage | 1964-2041 | **PAGE 10** - Người dùng |
| 44 | updateLastUpdate | 2043-2054 | Cập nhật thời gian fetch |
| 45 | showLoading | 2056-2063 | Hiện loading |
| 46 | showError | 2065-2074 | Hiện lỗi |

### 1.3 Sơ đồ luồng dữ liệu

```
DOMContentLoaded
    ├── setupNavigation()
    ├── setupMobileMenu()
    ├── setupRefreshButton()
    ├── setupRoleSwitcher()
    └── fetchData()
            ├── fetch(CSV_URL) hoặc fetch(CORS_PROXY + CSV_URL)
            ├── parseCSV(csvText)
            │       ├── parseCSVRow() x N dòng
            │       ├── parsePercent()
            │       └── Ghi vào: allTasks, allStaff, allDepartments
            ├── populateLeaderDropdown()
            ├── updateSidebarForRole()
            ├── updateUserInfoDisplay()
            ├── updateBadge()
            ├── updateLastUpdate()
            └── renderPage(currentPage)
                    └── renderXxxPage()
                            └── getVisibleTasks() → lọc theo scope
```

---

## 2. Trùng lặp phát hiện

### 2.1 Function trùng logic

| # | Vấn đề | Vị trí | Đề xuất |
|---|--------|--------|---------|
| 1 | **Tính % weighted** lặp lại 5 lần với logic giống hệt | Dòng 645-657, 707-708, 1073-1074, 1147-1148, 1775-1776 | Gộp thành 1 helper `calcWeightedPct(tasks)` |
| 2 | **Tính stats (completed, overdue, noReport...)** lặp 5 lần | Dòng 634-643, 723-727, 1083-1086, 1153-1157, 1782-1786 | Đã có `calculateStats()` nhưng nhiều chỗ tính inline |
| 3 | **Render bảng nhiệm vụ** có 6 template khác nhau | Dòng 985-1037, 1208-1244, 1279-1300, 1311-1332, 1826-1856, 2005-2028 | Tạo 1 helper `renderTaskTable(tasks, columns[])` |
| 4 | **CSS class cho status** tính 2 chỗ | Dòng 893-901 (getTaskClass), 1039-1051 (getStatusClass) | Gộp thành 1 helper |
| 5 | **Lấy danh sách phòng ban** tính 4 chỗ | Dòng 907-908, 1877, 1995, 690-731 | Dùng chung `getDepartmentData()` |
| 6 | **Render profile cán bộ** có 2 hàm gần giống | Dòng 1134-1265 (renderStaffProfile), 1765-1872 (renderKPICaNhanProfile) | Gộp thành 1, khác chỉ ở context |

### 2.2 CSS trùng lặp

| # | Vấn đề | Vị trí | Đề xuất |
|---|--------|--------|---------|
| 1 | `.kpi-cards` và `.kpi-grid` cùng style | Dòng 257-258 | Gộp thành 1 class |
| 2 | `.overview-cards` giống `.kpi-grid` | Dòng 326 | Gộp vào `.kpi-grid` |
| 3 | Progress bar có 6 variant khác nhau | Dòng 396, 518, 691, 865, 958, 1396 | Tạo 1 base `.progress-*` + modifier |
| 4 | Card có 5 variant | Dòng 265, 333, 659, 803, 1212 | Tạo 1 base `.card` + modifier |
| 5 | Table style lặp nhiều chỗ | Dòng 421, 474, 716, 830, 911 | Tạo base `.data-table` |

### 2.3 Trang trùng chức năng

| Trang A | Trang B | Mức trùng | Phân tích |
|---------|---------|-----------|-----------|
| **KPI Phòng ban** | **Bộ KPI** (phần phòng ban) | 70% | Cùng hiện danh sách phòng ban + % hoàn thành. Bộ KPI thêm target + đánh giá. |
| **Theo dõi công việc** | **Phân công công việc** | 60% | Cùng list nhiệm vụ. Theo dõi có filter, Phân công nhóm theo phòng ban. |
| **Nhân sự** | **KPI cá nhân** | 80% | Cùng xem theo cán bộ. Nhân sự có grid card, KPI cá nhân có dropdown. **NÊN GỘP.** |
| **Nhân sự** | **Người dùng** | 50% | Cùng danh sách người. Nhân sự xem KPI, Người dùng xem quyền. |
| **Cần cập nhật** | **Theo dõi** (filter "Chưa báo cáo") | 90% | Cần cập nhật = Theo dõi với filter sẵn. **NÊN GỘP.** |

**Đề xuất gộp trang:**
1. Gộp **Nhân sự** + **KPI cá nhân** → **KPI cá nhân** (có grid + dropdown)
2. Gộp **Cần cập nhật** vào **Theo dõi** (thêm tab hoặc filter mặc định)
3. Giữ **Phân công** riêng (view theo cấu trúc tổ chức)
4. Giữ **Người dùng** riêng (quản lý quyền, chỉ Chủ tịch thấy)

→ Giảm từ **10 trang** xuống **7-8 trang**

---

## 3. LỖI PHÂN QUYỀN (ƯU TIÊN CAO)

### 3.1 Tổng quan kiểm tra

| Kiểm tra | Kết quả |
|----------|---------|
| `getVisibleTasks()` được định nghĩa? | ✅ Có, dòng 249-256 |
| Mọi render page dùng `getVisibleTasks()`? | ❌ KHÔNG - có 3 chỗ dùng `allTasks` trực tiếp |
| Dropdown lọc theo scope? | ❌ KHÔNG - `allStaff`, `allDepartments` không lọc |
| Badge đếm đúng? | ✅ Dòng 385 dùng `getVisibleTasks()` |

### 3.2 Chi tiết lỗi

| # | Lỗi | Vị trí | Ảnh hưởng | Mức độ | Cách sửa |
|---|-----|--------|-----------|--------|----------|
| **1** | `renderStaffProfile()` dùng `allTasks` | Dòng 1138 | Trang Nhân sự: Trưởng đơn vị click vào cán bộ → thấy được nhiệm vụ của đơn vị khác | **NGHIÊM TRỌNG** | Đổi `allTasks` → `getVisibleTasks()` |
| **2** | `renderCapNhatSoLieuPage()` tính `maxCV` từ `allTasks` | Dòng 1535 | Không ảnh hưởng bảo mật nhưng không nhất quán | Thấp | Đổi sang `getVisibleTasks()` |
| **3** | `renderKPICaNhanPage()` dùng `allStaff` cho dropdown | Dòng 1713-1715 | **LỖI ĐÃ BÁO:** Trưởng ấp Thọ Khương thấy dropdown có Lê Thị Hoa (đơn vị khác) | **NGHIÊM TRỌNG** | Lọc `allStaff` theo `getVisibleTasks()` |
| **4** | `renderTheodoiPage()` dùng `allDepartments` cho filter | Dòng 907-908 | Trưởng đơn vị thấy dropdown có phòng ban khác | Trung bình | Lọc `allDepartments` theo scope |
| **5** | `renderNhanSuPage()` liệt kê cán bộ từ `visibleTasks` nhưng click vào gọi `renderStaffProfile()` dùng `allTasks` | Dòng 1055 + 1138 | Kết hợp lỗi #1: thấy đúng danh sách nhưng xem chi tiết bị rò rỉ | **NGHIÊM TRỌNG** | Sửa cả 2 chỗ |
| **6** | `renderNguoiDungPage()` dùng `visibleTasks` nhưng thêm hardcode "Nguyễn Nam" (Chủ tịch) | Dòng 1985-1992 | Trưởng đơn vị vào trang Người dùng (nếu menu cho phép) thấy CT | Thấp | Menu đã ẩn trang này cho truongdonvi |

### 3.3 Hàm cần tạo helper

Để tránh lặp lại lỗi, cần tạo:

```javascript
// Helper lấy danh sách cán bộ TRONG PHẠM VI
function getVisibleStaff() {
    const visibleTasks = getVisibleTasks();
    return [...new Set(visibleTasks.map(t => t.canBo).filter(Boolean))].sort();
}

// Helper lấy danh sách phòng ban TRONG PHẠM VI
function getVisibleDepartments() {
    const visibleTasks = getVisibleTasks();
    return [...new Set(visibleTasks.map(t => t.phongBan).filter(Boolean))].sort();
}
```

---

## 4. Lỗi khác

### 4.1 Console.log còn sót (11 chỗ)

| Dòng | Nội dung | Đề xuất |
|------|----------|---------|
| 67 | `Auto-refresh triggered` | Giữ hoặc xóa |
| 193 | `Manual refresh triggered` | Xóa |
| 241 | `Leader changed: ...` | Xóa |
| 332 | `Already loading, skipping...` | Giữ (debug) |
| 351 | `Direct fetch successful` | Xóa |
| 353 | `Direct fetch failed, trying CORS proxy...` | Giữ (debug) |
| 359 | `CORS proxy fetch successful` | Xóa |
| 363 | `Loaded ${allTasks.length} tasks` | Xóa |
| 448 | `Dynamic column mapping: ...` | Xóa |
| 497-498 | `All staff/departments collected: ...` | Xóa |

### 4.2 Hardcode cần đưa vào config

| Vị trí | Giá trị hardcode | Đề xuất |
|--------|------------------|---------|
| Dòng 5 | `300000` (5 phút) | Đã có constant ✅ |
| Dòng 20-33 | LEADERS array | Nên load từ config/Sheet riêng |
| Dòng 1362-1368 | Targets KPI: 80%, 8, 0, 2 | Nên đưa vào config |
| Dòng 1985-1992 | Hardcode "Nguyễn Nam" là Chủ tịch | Nên lấy từ LEADERS |
| Dòng 18 | Kỳ "06/2026" | Nên đọc từ Sheet hoặc config |

### 4.3 Xử lý lỗi

| Tình huống | Xử lý hiện tại | Đề xuất |
|------------|----------------|---------|
| CSV fetch fail | Hiện `showError()` với message | ✅ OK |
| CSV rỗng / không có header | Return `[]`, trang trắng | Nên hiện thông báo "Không có dữ liệu" |
| Sheet thiếu cột | `getColumnValue()` return default | ✅ OK |
| Trùng fetch | `isLoading` flag chặn | ✅ OK |

### 4.4 Dead code

| # | Vị trí | Nội dung | Lý do |
|---|--------|----------|-------|
| 1 | Dòng 155-170 | `renderPlaceholderPage()` | Không ai gọi |
| 2 | Dòng 16 | `currentStaffProfile` | Chỉ gán, không đọc lại |
| 3 | Dòng 733-736 | `renderCharts()` | Wrapper không cần thiết, gọi trực tiếp 2 chart |

---

## 5. Đề xuất tái cấu trúc

### Phương án A — Gộp trang (giảm từ 10 xuống 7 trang)

| Trang hiện tại | Sau gộp | Lý do |
|----------------|---------|-------|
| Dashboard | Dashboard | Giữ nguyên |
| Bộ KPI | Bộ KPI | Giữ nguyên |
| Cập nhật số liệu | Cập nhật số liệu | Giữ nguyên |
| KPI cá nhân | **KPI cá nhân** | Gộp với Nhân sự |
| KPI phòng ban | KPI phòng ban | Giữ nguyên |
| Phân công | Phân công | Giữ nguyên |
| Theo dõi | **Theo dõi** | Gộp với Cần cập nhật (thêm tab) |
| Nhân sự | *(xóa)* | Gộp vào KPI cá nhân |
| Cần cập nhật | *(xóa)* | Gộp vào Theo dõi |
| Người dùng | Người dùng | Giữ nguyên |

**Rủi ro:**
- Người dùng quen UI cũ có thể bị confused
- Cần test kỹ sau khi gộp

### Phương án B — Tách file (nếu tiếp tục phát triển)

```
app/
├── config.js      // URL, constants, LEADERS, targets
├── data.js        // fetchData, parseCSV, helpers
├── roles.js       // getVisibleTasks, updateSidebar, MENU_ACCESS
├── helpers.js     // calcStats, calcWeightedPct, getStatusClass
├── pages/
│   ├── dashboard.js
│   ├── bokpi.js
│   ├── theodoi.js
│   └── ...
└── main.js        // Entry point, setup navigation
```

**Lợi ích:** Dễ maintain, test riêng từng module
**Rủi ro:** Cần bundler (webpack/vite), phức tạp hơn cho deploy static

---

## 6. Thứ tự ưu tiên sửa

### Ưu tiên 1 — Lỗi phân quyền (LÀM NGAY trước bàn giao)

| # | Task | Effort |
|---|------|--------|
| 1.1 | Tạo `getVisibleStaff()` và `getVisibleDepartments()` | 15 phút |
| 1.2 | Sửa `renderStaffProfile()` dòng 1138 | 5 phút |
| 1.3 | Sửa `renderKPICaNhanPage()` dòng 1713-1715 | 5 phút |
| 1.4 | Sửa `renderTheodoiPage()` dòng 907-908 | 5 phút |
| 1.5 | Test toàn bộ với role Trưởng đơn vị | 30 phút |

### Ưu tiên 2 — Dọn dẹp code

| # | Task | Effort |
|---|------|--------|
| 2.1 | Xóa 8 console.log không cần | 10 phút |
| 2.2 | Xóa dead code | 5 phút |
| 2.3 | Đưa hardcode targets vào config | 15 phút |

### Ưu tiên 3 — Gộp function trùng (có thể làm sau)

| # | Task | Effort |
|---|------|--------|
| 3.1 | Tạo helper `calcWeightedPct()` | 20 phút |
| 3.2 | Tạo helper `renderTaskTable()` | 45 phút |
| 3.3 | Gộp `getTaskClass` + `getStatusClass` | 10 phút |

### Ưu tiên 4 — Gộp trang (tùy chọn)

| # | Task | Effort |
|---|------|--------|
| 4.1 | Gộp Cần cập nhật → Theo dõi | 1 giờ |
| 4.2 | Gộp Nhân sự → KPI cá nhân | 1.5 giờ |

---

## 7. Checklist trước bàn giao

- [ ] Sửa hết 6 lỗi phân quyền (mục 3.2)
- [ ] Test với 3 role: Chủ tịch, Phó CT, Trưởng đơn vị
- [ ] Xóa console.log production
- [ ] Verify dropdown chỉ hiện đúng phạm vi
- [ ] Verify bảng chỉ hiện đúng phạm vi
- [ ] Thay tên LEADERS bằng tên thật (nếu có)
- [ ] Commit + push + deploy GitHub Pages
- [ ] Gửi link cho xã test thử

---

**Người lập báo cáo:** Claude AI
**Cần duyệt bởi:** Gia Dang
