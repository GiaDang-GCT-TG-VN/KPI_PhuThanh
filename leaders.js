// DANH SÁCH LÃNH ĐẠO — CẬP NHẬT KHI THAY ĐỔI NHÂN SỰ
//
// Chỉ cần sửa file này khi thay đổi nhân sự, KHÔNG cần đụng vào app.js.
//
// name:  tên cán bộ. Các mục "[Chưa cập nhật — ...]" là chỗ trống, hãy thay bằng tên thật.
// role:  'chutich' | 'phochutich' | 'truongdonvi'
// scope: PHẢI KHỚP CHÍNH XÁC giá trị cột "Phòng ban" trong Google Sheets
//        (chỉ dùng cho role 'truongdonvi'; chutich/phochutich để null)
//        Sai một dấu cách hay dấu tiếng Việt là người đó sẽ thấy 0 nhiệm vụ.
//        Hàm validateLeaders() bên dưới sẽ cảnh báo ở Console (F12) nếu lệch.

const LEADERS = [
    // --- Lãnh đạo xã (xem toàn xã, scope = null) ---
    { id: 'ct',   name: '[Chưa cập nhật — Chủ tịch UBND xã]', title: 'Chủ tịch UBND xã', role: 'chutich',    scope: null },
    { id: 'pct1', name: '[Chưa cập nhật — Phó Chủ tịch 1]',   title: 'Phó Chủ tịch',     role: 'phochutich', scope: null },
    { id: 'pct2', name: '[Chưa cập nhật — Phó Chủ tịch 2]',   title: 'Phó Chủ tịch',     role: 'phochutich', scope: null },

    // --- Trưởng đơn vị (chỉ xem đơn vị mình) — 11 đơn vị theo Google Sheets ---
    { id: 'tp-kinhte',     name: '[Chưa cập nhật — Trưởng phòng Kinh tế]',                       title: 'Trưởng phòng Kinh tế',                       role: 'truongdonvi', scope: 'Phòng Kinh tế' },
    { id: 'tp-vhxh',       name: '[Chưa cập nhật — Trưởng phòng Văn hoá - Xã hội]',              title: 'Trưởng phòng Văn hoá - Xã hội',              role: 'truongdonvi', scope: 'Phòng Văn hoá - Xã hội' },
    { id: 'cvp',           name: '[Chưa cập nhật — Chánh Văn phòng HĐND-UBND]',                  title: 'Chánh Văn phòng HĐND-UBND',                  role: 'truongdonvi', scope: 'Văn phòng HĐND&UBND' },
    { id: 'gd-hcc',        name: '[Chưa cập nhật — Giám đốc Trung tâm phục vụ hành chính công]', title: 'Giám đốc Trung tâm phục vụ hành chính công', role: 'truongdonvi', scope: 'Trung tâm phục vụ hành chính công' },
    { id: 'gd-dvc',        name: '[Chưa cập nhật — Giám đốc Trung tâm cung ứng dịch vụ công]',   title: 'Giám đốc Trung tâm cung ứng dịch vụ công',   role: 'truongdonvi', scope: 'Trung tâm cung ứng dịch vụ công' },
    { id: 'tram-yte',      name: '[Chưa cập nhật — Trưởng Trạm y tế]',                           title: 'Trưởng Trạm y tế',                           role: 'truongdonvi', scope: 'Trạm y tế' },
    { id: 'th-phuthanh',   name: '[Chưa cập nhật — Hiệu trưởng Trường tiểu học Phú Thành]',      title: 'Hiệu trưởng Trường tiểu học Phú Thành',      role: 'truongdonvi', scope: 'Trường tiểu học Phú Thành' },
    { id: 'mn-phuthanh',   name: '[Chưa cập nhật — Hiệu trưởng Trường Mầm non Phú Thành]',       title: 'Hiệu trưởng Trường Mầm non Phú Thành',       role: 'truongdonvi', scope: 'Trường Mầm non Phú Thành' },
    { id: 'ap-thokhuong',  name: '[Chưa cập nhật — Trưởng ấp Thọ Khương]',                       title: 'Trưởng ấp Thọ Khương',                       role: 'truongdonvi', scope: 'Ấp Thọ Khương' },
    { id: 'ap-binhphu',    name: '[Chưa cập nhật — Trưởng ấp Bình Phú]',                         title: 'Trưởng ấp Bình Phú',                         role: 'truongdonvi', scope: 'Ấp Bình Phú' },
    { id: 'ap-binhninh',   name: '[Chưa cập nhật — Trưởng ấp Bình Ninh]',                        title: 'Trưởng ấp Bình Ninh',                        role: 'truongdonvi', scope: 'Ấp Bình Ninh' },
];

// Kiểm tra scope của Trưởng đơn vị có khớp cột "Phòng ban" trong Sheet không.
// Gọi sau khi parse CSV xong (trong fetchData của app.js).
function validateLeaders() {
    const depts = new Set(allTasks.map(t => t.phongBan).filter(Boolean));
    LEADERS.filter(l => l.role === 'truongdonvi').forEach(l => {
        if (l.scope && !depts.has(l.scope)) {
            console.warn(`[LEADERS] scope "${l.scope}" của ${l.name} không khớp đơn vị nào trong Sheet. Người này sẽ thấy 0 nhiệm vụ.`);
        }
    });
}
