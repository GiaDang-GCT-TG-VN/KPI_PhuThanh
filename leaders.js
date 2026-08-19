// DANH SÁCH LÃNH ĐẠO — CẬP NHẬT KHI THAY ĐỔI NHÂN SỰ
//
// Chỉ cần sửa file này khi thay đổi nhân sự, KHÔNG cần đụng vào app.js.
//
// name:  tên cán bộ. Còn 5 mục "[Chưa cập nhật — ...]" là chỗ trống, hãy thay bằng tên thật.
//        9 tên hiện có được đối chiếu với Google Sheets (cột "Cán bộ phụ trách",
//        cột "Người giao", và dòng khai báo 2 Phó Chủ tịch ở đầu Sheet).
// role:  'chutich' | 'phochutich' | 'truongdonvi'
// scope: PHẢI KHỚP CHÍNH XÁC giá trị cột "Phòng ban" trong Google Sheets
//        (chỉ dùng cho role 'truongdonvi'; chutich/phochutich để null)
//        Sai một dấu cách hay dấu tiếng Việt là người đó sẽ thấy 0 nhiệm vụ.
//        Hàm validateLeaders() bên dưới sẽ cảnh báo ở Console (F12) nếu lệch.

const LEADERS = [
    // --- Lãnh đạo xã (xem toàn xã, scope = null) ---
    { id: 'ct',   name: 'Nguyễn Nam',         title: 'Chủ tịch UBND xã', role: 'chutich',    scope: null },
    { id: 'pct1', name: 'Dương Hoàng Lai',    title: 'Phó Chủ tịch',     role: 'phochutich', scope: null },
    { id: 'pct2', name: 'Phạm Thị Thanh Hoa', title: 'Phó Chủ tịch',     role: 'phochutich', scope: null },

    // --- Trưởng đơn vị (chỉ xem đơn vị mình) — 11 đơn vị theo Google Sheets ---
    { id: 'tp-kinhte',     name: 'Nguyễn Hữu Thắng',                                            title: 'Trưởng phòng Kinh tế',                       role: 'truongdonvi', scope: 'Phòng Kinh tế' },
    { id: 'tp-vhxh',       name: 'Lê Thị Hoa',                                                  title: 'Trưởng phòng Văn hoá - Xã hội',              role: 'truongdonvi', scope: 'Phòng Văn hoá - Xã hội' },
    { id: 'cvp',           name: 'Trần Văn Bình',                                               title: 'Chánh Văn phòng HĐND-UBND',                  role: 'truongdonvi', scope: 'Văn phòng HĐND&UBND' },
    { id: 'gd-hcc',        name: 'Mai Thị Minh Ánh',                                            title: 'Giám đốc Trung tâm phục vụ hành chính công', role: 'truongdonvi', scope: 'Trung tâm phục vụ hành chính công' },
    { id: 'gd-dvc',        name: '[Chưa cập nhật — Giám đốc Trung tâm cung ứng dịch vụ công]',   title: 'Giám đốc Trung tâm cung ứng dịch vụ công',   role: 'truongdonvi', scope: 'Trung tâm cung ứng dịch vụ công' },
    { id: 'tram-yte',      name: 'Vũ Đình Long',                                                title: 'Trưởng Trạm y tế',                           role: 'truongdonvi', scope: 'Trạm y tế' },
    { id: 'th-phuthanh',   name: '[Chưa cập nhật — Hiệu trưởng Trường tiểu học Phú Thành]',      title: 'Hiệu trưởng Trường tiểu học Phú Thành',      role: 'truongdonvi', scope: 'Trường tiểu học Phú Thành' },
    { id: 'mn-phuthanh',   name: '[Chưa cập nhật — Hiệu trưởng Trường Mầm non Phú Thành]',       title: 'Hiệu trưởng Trường Mầm non Phú Thành',       role: 'truongdonvi', scope: 'Trường Mầm non Phú Thành' },
    { id: 'ap-thokhuong',  name: 'Phạm Văn Tú',                                                 title: 'Trưởng ấp Thọ Khương',                       role: 'truongdonvi', scope: 'Ấp Thọ Khương' },
    { id: 'ap-binhphu',    name: '[Chưa cập nhật — Trưởng ấp Bình Phú]',                         title: 'Trưởng ấp Bình Phú',                         role: 'truongdonvi', scope: 'Ấp Bình Phú' },
    { id: 'ap-binhninh',   name: '[Chưa cập nhật — Trưởng ấp Bình Ninh]',                        title: 'Trưởng ấp Bình Ninh',                        role: 'truongdonvi', scope: 'Ấp Bình Ninh' },
];

// Đối chiếu danh sách LEADERS với dữ liệu thật trong Sheet, theo CẢ HAI chiều.
// Gọi sau khi parse CSV xong (trong fetchData của app.js).
// Cảnh báo hiện ở Console trình duyệt (F12), không hiện cho người dùng cuối.
function validateLeaders() {
    // Đếm số nhiệm vụ theo từng đơn vị
    const taskCount = {};
    allTasks.forEach(t => {
        if (t.phongBan) taskCount[t.phongBan] = (taskCount[t.phongBan] || 0) + 1;
    });

    const truongDonVi = LEADERS.filter(l => l.role === 'truongdonvi');
    const scopes = new Set(truongDonVi.map(l => l.scope).filter(Boolean));

    // Chiều 1 — scope trong leaders.js không khớp đơn vị nào trong Sheet.
    // Thường do gõ sai tên đơn vị hoặc xã đổi tên đơn vị.
    truongDonVi.forEach(l => {
        if (l.scope && taskCount[l.scope] === undefined) {
            console.warn(`[LEADERS] scope "${l.scope}" của ${l.name} không khớp đơn vị nào trong Sheet. Người này sẽ thấy 0 nhiệm vụ.`);
        }
    });

    // Chiều 2 — đơn vị có nhiệm vụ trong Sheet nhưng chưa có Trưởng đơn vị.
    // Thường do xã điền thêm dòng nhiệm vụ cho một ấp/đơn vị mới.
    Object.keys(taskCount).sort().forEach(d => {
        if (!scopes.has(d)) {
            console.warn(`[LEADERS] Đơn vị "${d}" có ${taskCount[d]} nhiệm vụ nhưng chưa có Trưởng đơn vị trong leaders.js — không ai xem được ở vai Trưởng đơn vị.`);
        }
    });
}
