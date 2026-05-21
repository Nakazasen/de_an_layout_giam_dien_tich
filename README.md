# Dự án Mô phỏng Layout Dây chuyền Sản xuất Fuser

Dự án này là một ứng dụng web mô phỏng các phương án bố trí (layout) cho dây chuyền sản xuất Fuser, nhằm mục tiêu tối ưu hóa diện tích và tích hợp hệ thống xe tự hành (AGV) và cấp liệu (CTU).

## Công nghệ sử dụng

* **HTML5 Canvas**: Để vẽ và mô phỏng 2D (các layout 1, 2, 3, 4, 5, 6).
* **Three.js**: Để hiển thị mô phỏng 3D tương tác (Layout 4, 5, 6).
* **TailwindCSS**: Để thiết kế giao diện người dùng (UI) hiện đại và chuyên nghiệp.

## Danh sách Layout

Dự án hiện tại đã thực hiện 11 phương án layout:

1. **Layout Thẳng (Linear)**: 15 trạm xếp thẳng hàng. Dòng chảy đơn giản nhưng tốn diện tích chiều dài.
2. **Layout Chữ U (U-Shape)**: Tối ưu diện tích, phù hợp xưởng ngắn. AGV chạy vòng ngoài, CTU chạy vòng trong.
3. **Layout Đối Xứng (Back-to-back)**: Hai hàng máy quay lưng vào nhau. Chung đường cấp liệu CTU ở giữa.
4. **Layout "Đấu Trường" (Circular)**: Hình tròn. CTU xoay tại tâm, AGV chạy vòng quanh. Không góc chết.
5. **Layout Chữ C (C-Shape)**: Kết nối kho bên ngoài. Đường đi hình chữ C với kết nối song song về kho.
6. **Layout Vuông (Vòng vuông)**: Hình vuông. Tương thích tốt với kết cấu cột nhà xưởng. 15 trạm bố trí 4 cạnh.
7. **Layout Xương Cá**: Các nhánh trạm xếp chéo theo sống chính, phù hợp khi muốn gom cấp phát và giảm giao cắt.
8. **Layout Chữ U Úp**: Biến thể nhiều nhánh của layout chữ U, tối ưu khi cần nén chiều ngang.
9. **Đề án A - FUSER 19K Vòng 1 chiều + 4 điểm dừng + OSS**: Chuyền FUSER 19 công đoạn chạy dạng vòng 1 chiều, dùng 4 hốc dừng tách khỏi làn chính và tích hợp OSS theo cụm.
10. **Đề án B - Bố trí 4 cụm cấp phát + OSS theo rủi ro**: Chia 19 công đoạn thành 4 cụm vận hành, mỗi cụm có điểm dừng, OSS, vùng đệm và cơ chế kiểm soát rủi ro theo R1/R2/R3/R4.
11. **Đề án C - Hai chuyền chung đường giữa + Cụm Cellcon phân tán**: Hai chuyền cạnh nhau dùng chung một đường giữa, với 4 cụm Cellcon phân tán để cấp phát cho cả FUSER và chuyền khác.

## Tính năng

* **Chuyển đổi Layout**: Dễ dàng chuyển đổi giữa các layout 2D trên cùng một giao diện.
* **Mô phỏng 2D**: Hiển thị hoạt hình xe AGV và CTU di chuyển theo quy trình.
* **Mô phỏng 3D**:
  * Hỗ trợ xem 3D cho các layout phức tạp (Layout 4, 5, 6).
  * Điều khiển camera xoay 360 độ, zoom, di chuyển.
  * Mô hình hình khối 3D trực quan cho trạm, xe và kho.
* **Phân tích**: Hiển thị ưu/nhược điểm chi tiết cho từng phương án ngay trên giao diện.

## Hướng dẫn sử dụng

1. Mở file `fuser_line_simulation.html` trên trình duyệt web.
2. Chọn các tab (1-11) để xem mô phỏng 2D tương ứng.
3. Với Layout 4, 5, và 6, nhấn nút "Xem Mô Phỏng 3D" để mở cửa sổ 3D riêng biệt.

## Cấu trúc file

* `fuser_line_simulation.html`: File chính, chứa giao diện và toàn bộ logic mô phỏng 2D.
* `layout4_3d_simulation.html`: Mô phỏng 3D cho Layout Tròn.
* `layout5_3d_simulation.html`: Mô phỏng 3D cho Layout Chữ C.
* `layout6_3d_simulation.html`: Mô phỏng 3D cho Layout Vuông.
* `layout9_3d_simulation.html`: Mô phỏng 3D cho Đề án A - FUSER 19K Vòng 1 chiều + 4 điểm dừng + OSS.
* `layout10_3d_simulation.html`: Mô phỏng 3D cho Đề án B - Bố trí 4 cụm cấp phát + OSS theo rủi ro.
* `layout11_3d_simulation.html`: Mô phỏng 3D cho Đề án C - Hai chuyền chung đường giữa + Cụm Cellcon phân tán.
