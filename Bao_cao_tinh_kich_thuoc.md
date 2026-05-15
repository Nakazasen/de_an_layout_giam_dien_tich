# Giải Thích Công Thức Tính Kích Thước Layout

## Các Thông Số Cơ Bản

| Chiều rộng 1 Station | 1.8m | Bao gồm bàn thao tác + giá Oricon |
| Chiều sâu 1 Station | 2.3m | Bao gồm vị trí công nhân |
| Khoảng cách giữa các Station | 0.2m | Lối đi/không gian an toàn (rút gọn) |
| Chiều rộng đường AGV | 1.0m | Đường đi robot AGV |
| Chiều rộng đường CTU | 0.8m | Đường đi xe đẩy CTU |
| Số Station | 19 | Cố định theo layout gốc thực thế |

---

## Layout 1: Thẳng (Linear)

**Kích thước: 34.5m x 3.5m = 120.8 m²**

### Công thức

- **Chiều dài** = (Số station × Chiều rộng station) + Offset
  - = (19 × 1.8) + 0.3 ≈ **34.5m**
- **Chiều rộng** = Chiều sâu station + Lối đi 2 bên
  - = 2.3 + 0.6 + 0.6 ≈ **3.5m**

---

## Layout 2: Chữ U (U-Shape)

**Kích thước: 19.5m x 7.0m = 136.5 m²**

### Công thức

- **Chiều dài** = (10 station × 1.8) + 1.1 ≈ **19.1m**
- **Chiều rộng** = 2 hàng station + Khoảng cách giữa (cho CTU)
  - = (2 × 2.3) + 2.4 ≈ **7.0m**

---

## Layout 3: Đối Xứng (Back-to-Back)

**Kích thước: 18.4m x 6.0m = 110.4 m² (Tiết kiệm nhất!)**

### Công thức

- **Chiều dài** = (8 station × 2.3) + (7 × 0.3)
  - = 18.4 + 2.1 ≈ **18.4m**
- **Chiều rộng** = 2 hàng station + Đường CTU giữa (chung)
  - = (2 × 2.3) + 1.4 ≈ **6.0m**
  - *Đường CTU nằm giữa nên tiết kiệm không gian*

---

## Layout 4: Vòng Tròn (Circular)

**Kích thước: 14.5m x 14.5m = 210.3 m²**

### Công thức

- **Đường kính** = 2 × Bán kính vòng station
  - Bán kính = (15 station × 2.3) / (2π) + Station depth
  - ≈ 5.5 + 1.8 = **7.25m** bán kính
  - Đường kính ≈ **14.5m**

*Lưu ý: Layout vòng tròn có diện tích thực tế lớn do "dead space" ở trung tâm*

---

## Layout 5: Chữ C (C-Shape)

**Kích thước: 13.0m x 13.0m = 169.0 m²**

### Công thức

- Tương tự vòng tròn nhưng có phần mở cho kho
- **Cung 270°** thay vì 360°
- Kích thước bounding box ≈ **13.0m × 13.0m**

---

## Layout 6: Vuông (Square Loop)

**Kích thước: 13.1m x 13.1m = 171.6 m²**

### Công thức

- **Mỗi cạnh** = (4 station × 2.3) + (3 × 0.3) + Góc quay
  - = 9.2 + 0.9 + 3.0 ≈ **13.1m**

*Lưu ý: Có "dead space" ở trung tâm hình vuông*

---

## Bảng So Sánh

| Layout | Kích thước | Diện tích | So với Layout 1 |
|--------|-----------|-----------|-----------------|
| 1. Thẳng | 34.5m × 3.5m | 120.8 m² | Chuẩn (100%) |
| 2. Chữ U | 19.5m × 7.0m | 136.5 m² | +13% |
| 3. **Đối Xứng** | 18.4m × 6.0m | **110.4 m²** | **-8.6%** ✅ |
| 4. Vòng Tròn | 14.5m × 14.5m | 210.3 m² | +74% |
| 5. Chữ C | 13.0m × 13.0m | 169.0 m² | +40% |
| 6. Vuông | 13.1m × 13.1m | 171.6 m² | +42% |

---

## Kết Luận

**Layout 3 (Đối Xứng/Back-to-Back)** là phương án tối ưu nhất về diện tích vì:

1. Hai hàng station quay lưng vào nhau
2. **Chia sẻ đường CTU ở giữa** → Tiết kiệm không gian
3. Giảm 8.6% diện tích so với layout thẳng truyền thống
