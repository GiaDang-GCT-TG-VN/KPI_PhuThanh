# Dashboard KPI UBND xã Phú Thành

Dashboard theo dõi tiến độ nhiệm vụ, đọc dữ liệu trực tiếp từ Google Sheets.

## Demo
🔗 **Live:** https://giadang-gct-tg-vn.github.io/KPI_PhuThanh/

## Trạng thái
🟢 **Đã deploy, đang chạy thử với xã.**

- Dashboard đã lên GitHub Pages tại link Live ở trên, cán bộ xã đang dùng thử trên dữ liệu thật.
- Danh sách lãnh đạo nằm ở `leaders.js` — tên hiện là placeholder `[Chưa cập nhật — ...]`, cần thay bằng tên thật.
- Phân quyền hiện chỉ là **mô phỏng phía client** (dropdown chọn vai), chưa có đăng nhập. Phân quyền thật sẽ có ở bản App riêng — Bước 3.

## Tính năng
- 6 card tổng quan (tổng, hoàn thành, đang TH, trễ hạn, chờ duyệt, chưa BC)
- Thanh tiến độ toàn xã (weighted average)
- Biểu đồ tiến độ theo phòng ban (bar chart)
- Biểu đồ phân bố trạng thái (doughnut)
- Bảng tổng hợp phòng ban
- Bảng chi tiết + bộ lọc
- Responsive (mobile + desktop)

## Công thức lõi
```
% phòng ban = Σ(khối lượng × % hoàn thành) ÷ Σ(khối lượng)
```

---

## Deploy lên GitHub Pages (FREE)

### Bước 1: Tạo GitHub Repository

1. Vào [github.com/new](https://github.com/new)
2. Đặt tên repo: `KPI_PhuThanh` (repo đang dùng)
3. Chọn **Public**
4. Click **Create repository**

### Bước 2: Upload code

**Cách 1: Kéo thả (đơn giản nhất)**
1. Mở repo vừa tạo trên GitHub
2. Click **uploading an existing file**
3. Kéo thả 5 file sau vào:
   - `index.html`
   - `style.css`
   - `leaders.js`
   - `app.js`
   - `.nojekyll`
4. Click **Commit changes**

**Cách 2: Git command**
```bash
cd "~/Projects/07_CDS_Phu Thanh/KPI_PhuThanh/05_Dashboard"
git init
git add .
git commit -m "Initial commit - KPI Dashboard"
git branch -M main
git remote add origin https://github.com/giadang-gct-tg-vn/KPI_PhuThanh.git
git push -u origin main
```

### Bước 3: Bật GitHub Pages

1. Vào repo → **Settings** → **Pages** (menu bên trái)
2. Source: chọn **Deploy from a branch**
3. Branch: chọn **main** → folder **/ (root)**
4. Click **Save**
5. Đợi 1-2 phút, refresh trang

### Bước 4: Truy cập Dashboard

URL của bạn:
```
https://giadang-gct-tg-vn.github.io/KPI_PhuThanh/
```

---

## Cập nhật dữ liệu

Dashboard tự động fetch dữ liệu mới từ Google Sheets mỗi khi refresh trang.

**Để cập nhật KPI:**
1. Mở Google Sheet
2. Sửa dữ liệu trong sheet `NhiemVu`
3. Refresh dashboard → dữ liệu mới hiện ngay

---

## Cấu trúc file

```
05_Dashboard/
├── index.html      # Trang chính
├── style.css       # Giao diện (tông xanh #15803d)
├── leaders.js      # Danh sách lãnh đạo (sửa ở đây khi thay đổi nhân sự)
├── app.js          # Logic fetch CSV + render
├── .nojekyll       # Bỏ qua Jekyll của GitHub
└── README.md       # File này
```

## Cập nhật danh sách lãnh đạo

Mở `leaders.js`, sửa trường `name` (thay các mục `[Chưa cập nhật — ...]` bằng tên thật).
Không cần đụng vào `app.js`.

Trường `scope` phải khớp **chính xác** giá trị cột "Phòng ban" trong Google Sheets.
Nếu lệch, mở dashboard rồi bấm F12 → tab Console sẽ thấy cảnh báo:
```
[LEADERS] scope "..." của ... không khớp đơn vị nào trong Sheet. Người này sẽ thấy 0 nhiệm vụ.
```

## CSV URL đang dùng
```
https://docs.google.com/spreadsheets/d/e/2PACX-1vQj824lSoKDpnjPl2ChHFKw832dRjXXiDeF_xMlo4hbjyo6WtoefDiGT4PctBSU6muoXF9cnN6hkRSQ/pub?gid=1567229633&single=true&output=csv
```

Nếu muốn đổi Google Sheet khác, sửa biến `CSV_URL` trong file `app.js`.
