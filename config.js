// === CẤU HÌNH ===
// Nguồn dữ liệu, hằng số, quyền menu, tiêu đề trang.

// === CONFIG ===
const CONFIG = {
    CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQj824lSoKDpnjPl2ChHFKw832dRjXXiDeF_xMlo4hbjyo6WtoefDiGT4PctBSU6muoXF9cnN6hkRSQ/pub?gid=1567229633&single=true&output=csv',
    SHEET_EDIT_URL: 'https://docs.google.com/spreadsheets/d/1aMBYqbOkC3xAmgEZUDOvQNBz6yOFU0AeJIsBMdjMxHk/edit?gid=1567229633#gid=1567229633',
    CORS_PROXY: 'https://corsproxy.io/?',
    REFRESH_INTERVAL: 300000,  // 5 phút
    KY_HIEN_TAI: '06/2026',
    MUC_TIEU_PCT: 80,          // mục tiêu 80% dùng ở trang Bộ KPI
    DON_VI: 'UBND xã Phú Thành',
};


// Menu access by role (chỉ 3 role, bỏ canbo)
const MENU_ACCESS = {
    chutich:     ['dashboard', 'bo-kpi', 'capnhat-solieu', 'kpi-canhan', 'kpi-phongban', 'phancong', 'theodoi', 'nhansu', 'can-capnhat', 'nguoidung'],
    phochutich:  ['dashboard', 'bo-kpi', 'capnhat-solieu', 'kpi-canhan', 'kpi-phongban', 'phancong', 'theodoi', 'nhansu', 'can-capnhat'],
    truongdonvi: ['dashboard', 'bo-kpi', 'capnhat-solieu', 'kpi-canhan', 'phancong', 'theodoi', 'nhansu', 'can-capnhat']
};


// === PAGE TITLES ===
const pageTitles = {
    'dashboard': { title: 'Dashboard', subtitle: `Tổng quan KPI toàn xã · Kỳ ${CONFIG.KY_HIEN_TAI}` },
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
