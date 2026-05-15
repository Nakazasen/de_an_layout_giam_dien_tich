# 0. Quy tắc Ứng xử (Rules of Engagement)

Trợ lý AI **PHẢI** tuân thủ các quy tắc sau khi làm việc với dự án này:

1. **Thẩm mỹ là Ưu tiên**: Giao diện (UI) phải luôn đẹp, hiện đại, sử dụng TailwindCSS với màu sắc hài hòa (palette Indigo/Blue/Slate). Không tạo ra giao diện sơ sài.
2. **Tính Nhất quán Visual**: Giữ tính nhất quán về visual giữa 2D và 3D.
    * Màu AGV: Xanh lá (`#22c55e` / `0x22c55e`).
    * Màu CTU: Xanh dương (`#3b82f6` / `0x3b82f6`).
    * Màu Trạm: Tím nhạt (`#6366f1` / `0x6366f1`).
    * Màu Kho: Vàng cam (`#fbbf24` / `0xfbbf24`).
3. **Tách Biệt File**:
    * Logic 2D chính nằm ở `fuser_line_simulation.html`.
    * Logic 3D phức tạp phải được tách ra các file riêng (`layoutX_3d_simulation.html`) để tránh làm file chính quá nặng.
4. **Cập nhật Đồng bộ**: Khi sửa logic đường đi 2D, phải kiểm tra và cập nhật logic 3D tương ứng (nếu có) để đảm bảo hai bên khớp nhau.
5. **Tài liệu hóa**: Cập nhật `README.md` sau khi hoàn thành một tính năng lớn hoặc thêm một layout mới.

## 1. Tổng quan Dự án

**De An Layout Giam Dien Tich** là dự án nghiên cứu và mô phỏng các phương án bố trí dây chuyền lắp ráp Fuser nhằm mục đích:

* Giảm diện tích chiếm dụng sàn (Footprint reduction).
* Tích hợp hệ thống cấp liệu tự động (CTU) và vận chuyển thành phẩm (AGV).
* Trực quan hóa luồng di chuyển để đánh giá hiệu quả.

## 2. Các Layout (Schemes)

Dự án hiện bao gồm 6 layout chính:

### Layout 1: Linear (Thẳng)

* Chuẩn mực, dễ tiếp cận.
* Nhược điểm: Chiếm dài, lãng phí lượt về của xe.

### Layout 2: U-Shape (Chữ U)

* Tiết kiệm diện tích chiều dài.
* **Lưu ý kỹ thuật**: Đường CTU bên trong phải nhỏ hơn đường AGV bên ngoài để tránh cắt nhau ở đáy chữ U.

### Layout 3: Back-to-Back (Đối xứng)

* Tiết kiệm nhất về diện tích lối đi (chung đường giữa).
* Khó bảo trì thiết bị ở giữa.

### Layout 4: Circular (Tròn/Đấu trường)

* **Điểm nhấn**: Không điểm chết, dòng chảy liên tục.
* Yêu cầu kỹ thuật cao về bàn máy cong.

### Layout 5: C-Shape (Chữ C - External Warehouse)

* Kết hối với kho nằm ngoài thông qua các đường dẫn song song.
* Dùng hình học `Torus` trong 3D cho đường cong chữ C.

### Layout 6: Square (Vuông)

* Biến thể của Layout 4 nhưng dùng hình vuông để hợp với nhà xưởng.
* Kết nối song song từ 2 góc với kho bên ngoài.

## 3. Cấu trúc Kỹ thuật

### A. 2D Simulation (Canvas)

* Hệ trục tọa độ: Gốc (0,0) góc trên trái.
* Đơn vị: Pixel (tương đối).
* Animation: Dùng `requestAnimationFrame` và nội suy điểm trên đường dẫn (`getPointOnPath`).
* Xe: Vẽ đơn giản là hình tròn màu.

### B. 3D Simulation (Three.js)

* Hệ trục tọa độ: Y hướng lên (Up-axis). X ngang, Z sâu.
* Đơn vị: Tương đối (Scale factor so với 2D).
* Công nghệ:
  * `THREE.TorusGeometry`: Cho đường cong.
  * `THREE.CylinderGeometry`: Cho đường thẳng/ống.
  * `OrbitControls`: Để quan sát.
* Animation: Tính toán vector vị trí theo tham số thời gian `t` (0..1).

## 4. Hướng dẫn Phát triển

1. **Thêm Layout mới**:
    * B1: Thêm ID và data (tên, ưu/nhược điểm) vào object `schemes` trong file chính.
    * B2: Viết hàm vẽ 2D `drawSchemeX()`.
    * B3: Thêm nút bấm vào menu HTML.
    * B4: Nếu cần 3D, tạo file `layoutX_3d_simulation.html` và link vào nút bấm.

2. **Sửa lỗi**:
    * Kiểm tra Console log trình duyệt. Các file 3D đã có cơ chế bắt lỗi (`window.onerror`) hiển thị lên màn hình.

3. **Deploy/View**:
    * Chạy trực tiếp file HTML trên trình duyệt (không cần server backend phức tạp, chỉ cần static file server nếu tải tài nguyên ngoài, nhưng hiện tại dùng CDN nên chạy file nội bộ vẫn ổn).
