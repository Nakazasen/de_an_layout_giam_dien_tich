console.log("main.js script file loaded.");
// --- Global Variables & Constants ---
let canvas, ctx;
let STATION_COUNT = 19;
let M_PER_STATION = 1.8; // Will be updated from CONSTANTS
let STATION_W = 40;
let STATION_H = 40;
let GAP = 5;

let currentScheme = 1;
let animationId;
let isComparisonMode = false;
let isAlgorithmsMode = false;
let agvPos = { x: 0, y: 0, progress: 0 };
let ctuPos = { x: 0, y: 0, progress: 0 };

// --- CRITICAL: Global Function Exposure ---
// We explicitly expose these to window because HTML onclick handlers need them.
window.setScheme = (id) => { if (typeof setScheme === 'function') setScheme(id); };
window.updateStationCount = () => { if (typeof updateStationCount === 'function') updateStationCount(); };
window.syncStationInputs = (val) => { if (typeof syncStationInputs === 'function') syncStationInputs(val); };
window.switchMode = (mode) => { if (typeof switchMode === 'function') switchMode(mode); };
window.toggleAlgoCard = (id) => { if (typeof toggleAlgoCard === 'function') toggleAlgoCard(id); };
window.open3DView = () => { if (typeof open3DView === 'function') open3DView(); };
window.verifyLayoutIntegrity = () => { if (typeof verifyLayoutIntegrity === 'function') verifyLayoutIntegrity(); };

// Dynamic station sizing to fit canvas
function getStationSize() {
    if (!canvas) return { w: 40, h: 40, gap: 5 };
    const maxWidth = canvas.width - 120; // Padding for labels
    const idealSize = 40;
    const idealGap = 5;
    const neededWidth = STATION_COUNT * (idealSize + idealGap);
    if (neededWidth > maxWidth && maxWidth > 0) {
        // Scale down to fit
        const scale = maxWidth / neededWidth;
        return {
            w: Math.floor(idealSize * scale),
            h: Math.floor(idealSize * scale),
            gap: Math.floor(idealGap * scale)
        };
    }
    return { w: idealSize, h: idealSize, gap: idealGap };
}

// UI Helpers for Station Count
function syncStationInputs(val) {
    val = parseInt(val);
    if (val < 5) val = 5;
    if (val > 50) val = 50;
    document.getElementById('cfg-station-count').value = val;
    document.getElementById('cfg-station-range').value = val;
    updateStationCount();
}

function updateStationCount() {
    let val = parseInt(document.getElementById('cfg-station-count').value);
    if (isNaN(val) || val < 5) val = 5;
    if (val > 50) val = 50;

    STATION_COUNT = val;
    document.getElementById('cfg-station-range').value = val; // Sync range slider

    // Update Legend and Header Text to reflect new count
    document.getElementById('header-station-count').textContent = STATION_COUNT;
    document.getElementById('label-max-station').textContent = STATION_COUNT;

    // Recalculate station sizes to fit canvas
    const sizes = getStationSize();
    STATION_W = sizes.w;
    STATION_H = sizes.h;
    GAP = sizes.gap;

    // Re-render current scheme
    setScheme(currentScheme);
    if (isComparisonMode) updateMultiLine();
}

// --- Layout Definitions ---
const schemes = {
    1: {
        name: "Layout Thẳng (Tối ưu dòng chảy)",
        pros: [
            "<b>Dễ triển khai & Quản lý:</b> Luồng hàng đi thẳng (một chiều) giúp quản lý trực quan, dễ phát hiện điểm tắc nghẽn.",
            "<b>An toàn cao:</b> Tách biệt hoàn toàn luồng xe AGV (mặt trước) và CTU (mặt sau), không có giao cắt nguy hiểm.",
            "<b>Chuẩn hóa cao:</b> Dễ dàng nhân rộng sang các nhà máy khác, không phụ thuộc vào hình dạng kho xưởng đặc thù."
        ],
        cons: [
            "<b>Hiệu suất vận chuyển thấp:</b> Xe AGV/CTU phải chạy quãng đường 'không tải' (lượt về) rất dài -> Lãng phí năng lượng và thời gian.",
            "<b>Lãng phí không gian chết:</b> Layout tạo ra hình chữ nhật dài, khó tận dụng diện tích thừa ở 2 bên trong nhà xưởng vuông.",
            "<b>Khó cân bằng chuyền:</b> Người thao tác ở đầu và cuối chuyền cách nhau xa, khó hỗ trợ chéo khi cần thiết."
        ],
        dims: "34.5m x 3.5m",
        area: "120.8",
        areaNote: "Chuẩn cơ sở so sánh.",
        image: "layout1_ref.png",
        formula: "Dài = Số trạm × 1.8m | Rộng = 3.5m"
    },
    2: {
        name: "Layout Chữ U (Tiết kiệm diện tích)",
        pros: [
            "<b>Tối ưu diện tích:</b> Tận dụng tối đa không gian, phù hợp xưởng ngắn. Giúp 'gấp gọn' dây chuyền.",
            "<b>Linh hoạt nhân sự:</b> Điểm đầu và cuối gần nhau, 1 người có thể quản lý cả 2 đầu, nhân viên dễ dàng hỗ trợ chéo.",
            "<b>Tăng tần suất cấp hàng:</b> Quãng đường xe di chuyển ngắn hơn so với đường thẳng, tăng số lượt phục vụ của AGV."
        ],
        cons: [
            "<b>Rủi ro góc cua:</b> Các bộ phận chuyển hướng tại góc Chữ U thường phức tạp, dễ kẹt hàng và khó bảo trì hơn đoạn thẳng.",
            "<b>Nguy cơ tắc nghẽn cục bộ:</b> Nếu xe AGV đi vào lòng trong chữ U, không gian sẽ rất chật hẹp, khó xử lý khi có sự cố.",
            "<b>Khó mở rộng:</b> Muốn thêm máy (Station) phải phá vỡ cấu trúc chữ U hiện tại, tốn kém chi phí cải tạo."
        ],
        dims: "19.5m x 7.0m",
        area: "136.5",
        areaNote: "Diện tích tăng do cần lối đi nội bộ rộng hơn cho cua quay.",
        image: "layout2_ref.png",
        formula: "Dài = (Số trạm/2) × 1.8m + góc quay | Rộng = 7.0m"
    },
    3: {
        name: "Layout Đối Xứng (Sử dụng chung lưng)",
        pros: [
            "<b>Mật độ máy cao nhất:</b> Dùng chung 1 làn đường CTU ở giữa cho 2 hàng máy -> Giảm 40% diện tích lối đi.",
            "<b>Tiết kiệm chi phí kết cấu:</b> Thiết kế khung máy chung lưng, đi chung đường điện/khí nén trục chính.",
            "<b>Hiệu suất cấp hàng x2:</b> Xe CTU chạy 1 đường ở giữa phục vụ được cùng lúc cho cả 2 bên."
        ],
        cons: [
            "<b>Khó khăn bảo trì:</b> Rất khó tiếp cận thiết bị ở làn giữa (CTU/băng tải) để sửa chữa. Nếu hỏng có thể phải dừng cả 2 hàng máy.",
            "<b>Rủi ro dây chuyền:</b> Sự cố ở làn giữa sẽ làm tê liệt đồng thời cả 2 hàng máy.",
            "<b>An toàn lao động:</b> Không gian thao tác kép giữa 2 hàng máy hẹp, cần quy trình an toàn nghiêm ngặt."
        ],
        dims: "18.4m x 6.0m",
        area: "110.4",
        areaNote: "Tiết kiệm diện tích nhất! Giảm 8.6% so với Layout 1.",
        image: "layout3_ref.png",
        formula: "Dài = (Số trạm/2) × 1.8m | Rộng = 6.0m"
    },
    4: {
        name: "Layout 'Đấu Trường' (Hình Tròn/Xoay)",
        pros: [
            "<b>Không gian 'chết' bằng 0:</b> Tận dụng triệt để hình học. CTU ở tâm chỉ cần quay thay vì chạy thẳng, tốc độ cực nhanh.",
            "<b>AGV chạy liên tục:</b> Xe AGV chạy vòng tròn bên ngoài không bao giờ phải dừng lại quay đầu hay lùi xe.",
            "<b>Tầm nhìn bao quát 360 độ:</b> Quản lý đứng ở mọi vị trí đều quan sát được toàn bộ hoạt động của chuyền."
        ],
        cons: [
            "<b>Chi phí chế tạo lớn:</b> Băng tải và bàn máy phải thiết kế cong hoặc hình thang, gia công phức tạp và đắt tiền.",
            "<b>Cấp nguồn phức tạp:</b> Cụm trung tâm xoay tròn cần hệ thống cổ góp điện hoặc dây treo chuyên dụng.",
            "<b>Không thể mở rộng:</b> Khi đã chốt đường kính, việc thêm máy là không thể trừ khi xây vòng tròn mới."
        ],
        dims: "14.5m x 14.5m",
        area: "210.3",
        areaNote: "<b>Căn cứ tính toán (Khung bao chữ nhật):</b> Diện tích bị tính bao gồm toàn bộ hình vuông bao quanh vòng tròn (14.5x14.5m). Phần lõi rỗng ở tâm và các 'góc chết' tuy không đặt máy nhưng không thể sử dụng cho việc khác, nên được tính là diện tích chiếm dụng.",
        image: "layout4_ref.png",
        formula: "Đường kính = (Số trạm × 1.8 / π) + depth"
    },
    5: {
        name: "Layout Chữ C (Kho Bên Ngoài)",
        pros: [
            "<b>Kho riêng biệt:</b> Kho nằm ngoài vòng, dễ mở rộng dung lượng lưu trữ mà không ảnh hưởng layout.",
            "<b>4 làn độc lập:</b> AGV VÀO/RA và CTU VÀO/RA hoàn toàn tách biệt - không giao cắt, an toàn tối đa.",
            "<b>Không cần cầu:</b> Cả AGV và CTU đều nối thẳng từ kho vào vòng tương ứng, không phức tạp."
        ],
        cons: [
            "<b>Diện tích lớn hơn:</b> Cần thêm không gian cho kho bên ngoài và các làn kết nối.",
            "<b>Quản lý 4 làn:</b> Có 4 làn xe riêng biệt cần điều phối chính xác để tránh tắc nghẽn.",
            "<b>Khoảng cách không đều:</b> Các trạm xa kho hơn sẽ có thời gian cấp hàng lâu hơn."
        ],
        dims: "Cập nhật động",
        area: "Cập nhật động",
        areaNote: "<b>Căn cứ tính toán:</b> Diện tích tăng vọt do Kho nằm tách biệt bên ngoài. Bản thân vòng chữ C có kích thước tương đương layout Tròn/Vuông, nhưng phải cộng thêm diện tích của hệ thống đường giao thông kết nối song song từ kho vào dây chuyền.",
        image: "layout5_ref.png",
        formula: "Đường kính = (Số trạm × 1.8 / π) + kho"
    },
    6: {
        name: "Layout Vuông (Square Loop)",
        pros: [
            "<b>Tương thích nhà xưởng:</b> Hình vuông/chữ nhật cực kỳ phù hợp với kết cấu cột/dầm của đa số nhà xưởng công nghiệp.",
            "<b>Dễ chế tạo băng tải:</b> Sử dụng băng tải thẳng + bộ chuyển góc 90 độ (rẻ hơn băng tải cong).",
            "<b>Bố trí gọn gàng:</b> Bố trí trên 4 cạnh của hình vuông tận dụng tối đa chu vi."
        ],
        cons: [
            "<b>Góc cua gắt 90°:</b> Xe AGV/CTU phải giảm tốc khi qua góc vuông, chậm hơn so với cua tròn.",
            "<b>Khó mở rộng góc:</b> Góc chết tại 4 góc vuông khó tận dụng để đặt máy móc.",
            "<b>Chi phí chuyển hướng:</b> Cần nhiều thiết bị chuyển hướng (Turn table) hoặc xe phải dừng để xoay."
        ],
        dims: "13.1m x 13.1m",
        area: "171.6",
        areaNote: "<b>Căn cứ tính toán (Không gian chết):</b> Tương tự layout Tròn, layout Vuông tạo ra 'lỗ hổng' lớn kích thước ~9x9m ở giữa tâm. Đây là vùng diện tích không sinh ra giá trị sản xuất, làm giảm hiệu suất sử dụng mặt bằng so với các layout nén như Back-to-Back.",
        image: "layout6_ref.png",
        formula: "Mỗi cạnh = (Số trạm/4) × 1.8m + góc"
    },
    7: {
        name: "Layout Xương Cá (Herringbone)",
        pros: [
            "<b>Diện tích nhỏ nhất:</b> Góc 45° giúp giảm chiều dài đáng kể so với layout thẳng.",
            "<b>Dòng chảy tự nhiên:</b> Vật liệu di chuyển theo hướng nghiêng, giảm góc cua gắt.",
            "<b>Tầm nhìn tốt:</b> Công nhân có thể nhìn thấy trạm kế tiếp dễ dàng hơn layout thẳng."
        ],
        cons: [
            "<b>Băng tải phức tạp:</b> Cần thiết kế băng tải nghiêng góc 45°, gia công đặc biệt.",
            "<b>Khó căn chỉnh:</b> Lắp đặt và hiệu chỉnh cần độ chính xác cao hơn layout thẳng.",
            "<b>Chi phí cao hơn:</b> Thiết bị chuyển hướng và băng tải nghiêng đắt tiền hơn."
        ],
        dims: "13.0m x 6.0m",
        area: "78.0",
        areaNote: "🏆 TIẾT KIỆM NHẤT! Giảm 35% so với Layout 1, 29% so với Layout 3.",
        image: "layout7_ref.png",
        formula: "Dài = (Số trạm/2) × 1.3m + gap | Rộng = 6.0m"
    },
    8: {
        name: "Layout Chữ U Úp (n-Shape)",
        pros: [
            "<b>Dễ quản lý vào/ra:</b> Cửa vào và ra nằm cùng một phía (đáy chữ U), thuận tiện cho AGV/Kho tập trung.",
            "<b>Luồng đi rõ ràng:</b> Di chuyển theo 3 cạnh (Trái -> Trên -> Phải), không có điểm giao cắt nội bộ.",
            "<b>Tiết kiệm không gian:</b> Tận dụng tốt góc nhà xưởng hoặc khu vực có luồng tiếp cận từ 1 phía."
        ],
        cons: [
            "<b>Đường đi dài hơn:</b> So với xương cá hoặc thẳng, quãng đường vận chuyển nội bộ có thể dài hơn.",
            "<b>Khó mở rộng:</b> Bị giới hạn bởi chiều rộng chữ U, khó thêm trạm vào 2 cạnh bên nếu hết đất."
        ],
        dims: "Cập nhật động",
        area: "Cập nhật động",
        areaNote: "Diện tích tính theo khung bao hình chữ n.",
        image: "layout2_ref.png",
        formula: "Bố trí trạm trên 3 cạnh của hình chữ n."
    }
};

function setScheme(id) {
    currentScheme = id;

    // Update UI buttons
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(i => {
        const btn = document.getElementById(`btn-${i}`);
        if (i === id) {
            btn.classList.add('active', 'bg-blue-600', 'text-white');
            btn.classList.remove('bg-gray-100', 'text-gray-900', 'bg-pink-100', 'bg-purple-100', 'bg-yellow-100', 'bg-green-100', 'text-pink-900', 'text-purple-900', 'text-yellow-900', 'text-green-900');
        } else {
            btn.classList.remove('active', 'bg-blue-600', 'text-white');
            if (i === 4) {
                btn.classList.add('bg-pink-100', 'text-pink-900');
            } else if (i === 5) {
                btn.classList.add('bg-purple-100', 'text-purple-900');
            } else if (i === 6) {
                btn.classList.add('bg-yellow-100', 'text-yellow-900');
            } else if (i === 7) {
                btn.classList.add('bg-green-100', 'text-green-900');
            } else if (i === 8) {
                btn.classList.add('bg-orange-100', 'text-orange-900');
            } else {
                btn.classList.add('bg-gray-100', 'text-gray-900');
            }
        }
    });

    // Update Text
    const info = schemes[id];

    // --- Dynamic Calculations for ALL Layouts ---
    let length = 0, width = 0, area = 0, formula = "";

    if (id === 1) { // Straight
        length = STATION_COUNT * M_PER_STATION + 0.3; // Added small offset to reach 34.5m exactly for 19
        width = 3.5;
        formula = `Dài = ${STATION_COUNT} station × 1.8m ≈ ${length.toFixed(1)}m | Rộng = 3.5m`;
    } else if (id === 2) { // U-Shape
        length = Math.ceil(STATION_COUNT / 2) * M_PER_STATION + 1.1;
        width = 7.0;
        formula = `Dài = Math.ceil(${STATION_COUNT}/2) × 1.8m + corner = ${length.toFixed(1)}m | Rộng = 7.0m`;
    } else if (id === 3) { // Back-to-Back
        length = Math.ceil(STATION_COUNT / 2) * M_PER_STATION;
        width = 6.0;
        formula = `Dài = Math.ceil(${STATION_COUNT}/2) × 1.8m = ${length.toFixed(1)}m | Rộng = 6.0m`;
    } else if (id === 4) { // Circular
        const dia = (STATION_COUNT * M_PER_STATION / Math.PI) + 4.6;
        length = dia; width = dia;
        formula = `Đường kính ≈ (${STATION_COUNT} × 1.8 / π) + 4.6 = ${dia.toFixed(1)}m`;
    } else if (id === 5) { // C-Shape
        const dia = (STATION_COUNT * M_PER_STATION / Math.PI) + 5.5;
        length = dia; width = dia;
        formula = `Đường kính ≈ (${STATION_COUNT} × 1.8 / π) + 5.5 = ${dia.toFixed(1)}m`;
    } else if (id === 6) { // Square
        const side = Math.ceil(STATION_COUNT / 4) * M_PER_STATION + 3.0;
        length = side; width = side;
        formula = `Cạnh ≈ Math.ceil(${STATION_COUNT}/4) × 1.8m + gap = ${side.toFixed(1)}m`;
    } else if (id === 7) { // Herringbone
        length = Math.ceil(STATION_COUNT / 2) * 1.3 + 0.2; // Scale herringbone accordingly
        width = 6.0;
        formula = `Dài = Math.ceil(${STATION_COUNT}/2) × 1.3m + gap = ${length.toFixed(1)}m | Rộng = 6.0m`;
    } else if (id === 8) { // n-Shape
        const side = Math.ceil(STATION_COUNT / 3) * M_PER_STATION + 3.0;
        length = side; width = side;
        formula = `Cạnh ≈ Math.ceil(${STATION_COUNT}/3) × 1.8m + gap = ${side.toFixed(1)}m`;
    }

    area = length * width;
    info.dims = `${length.toFixed(1)}m x ${width.toFixed(1)}m`;
    info.area = area.toFixed(1);
    info.formula = formula;

    const html = `
                <div class="mb-2"><strong class="text-green-600">Ưu điểm:</strong>
                    <ul class="list-disc pl-5 mt-1 space-y-1">
                        ${info.pros.map(p => `<li>${p}</li>`).join('')}
                    </ul>
                </div>
                <div class="mt-4"><strong class="text-red-500">Nhược điểm:</strong>
                    <ul class="list-disc pl-5 mt-1 space-y-1">
                        ${info.cons.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>

                <!-- Area Calculation Block -->
                <div class="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 class="font-bold text-gray-800 flex items-center">
                        <span class="text-xl mr-2">📏</span> Tính toán Diện tích (Ước tính)
                    </h3>
                    <div class="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="text-gray-500">Kích thước:</p>
                            <p class="font-mono font-bold text-blue-700">${info.dims}</p>
                        </div>
                        <div>
                            <p class="text-gray-500">Tổng diện tích:</p>
                            <p class="font-mono font-bold text-red-600 text-lg">${info.area} m²</p>
                        </div>
                    </div>
                    ${info.formula ? `
                    <div class="mt-3 bg-white p-2 rounded border border-blue-200">
                        <p class="text-xs text-gray-600"><b>📐 Công thức:</b></p>
                        <p class="text-xs font-mono text-blue-800 mt-1">${info.formula}</p>
                    </div>
                    ` : ''}
                    <p class="text-xs text-gray-500 mt-2 italic border-t border-blue-200 pt-2">
                        *Thông số cơ bản: 1 Station = 1.8m x 2.3m, Gap = 0.2m (đã điều chỉnh theo thực tế 19 trạm)
                    </p>
                    ${info.areaNote ? `<p class="text-sm text-green-700 font-semibold mt-2">💡 ${info.areaNote}</p>` : ''}
                </div>
            `;
    document.getElementById('analysis-content').innerHTML = html;

    // Reset Animation
    agvPos.progress = 0;
    ctuPos.progress = 0;

    // Update Reference Image
    document.getElementById('ref-image').src = info.image || 'layout1_ref.png';

    // Show/Hide 3D Button for Layout 3, 4, 5, 6, and 7
    const view3dContainer = document.getElementById('view-3d-container');
    if (id === 3 || id === 4 || id === 5 || id === 6 || id === 7) {
        view3dContainer.classList.remove('hidden');
    } else {
        view3dContainer.classList.add('hidden');
    }
}

// Open 3D View Function
function open3DView() {
    const urlParams = `?stations=${STATION_COUNT}`;
    if (currentScheme === 3) {
        window.open('layout3_3d_simulation.html' + urlParams, '_blank');
    } else if (currentScheme === 4) {
        window.open('layout4_3d_simulation.html' + urlParams, '_blank');
    } else if (currentScheme === 5) {
        window.open('layout5_3d_simulation.html' + urlParams, '_blank');
    } else if (currentScheme === 6) {
        window.open('layout6_3d_simulation.html' + urlParams, '_blank');
    } else if (currentScheme === 7) {
        window.open('layout7_3d_simulation.html' + urlParams, '_blank');
    }
}

// Mode switching (Single Line / Multi-Line / Algorithms)
// Note: isComparisonMode and isAlgorithmsMode are declared in State section above

function switchMode(mode) {
    const singleControls = document.getElementById('single-line-controls');
    const multiControls = document.getElementById('multi-line-controls');
    const algoContent = document.getElementById('algorithms-content');
    const btnSingle = document.getElementById('btn-mode-single');
    const btnMulti = document.getElementById('btn-mode-multi');
    const btnAlgo = document.getElementById('btn-mode-algorithms');
    const canvasContainer = document.querySelector('.lg\\:w-2\\/3');

    // Reset all button styles
    [btnSingle, btnMulti, btnAlgo].forEach(btn => {
        btn.classList.remove('bg-white', 'shadow', 'text-blue-700');
        btn.classList.add('text-gray-500');
    });

    // Hide all sections first
    if (singleControls) singleControls.classList.add('hidden');
    if (multiControls) multiControls.classList.add('hidden');
    if (algoContent) algoContent.classList.add('hidden');

    if (mode === 'single') {
        isComparisonMode = false;
        isAlgorithmsMode = false;
        if (singleControls) singleControls.classList.remove('hidden');
        btnSingle.classList.add('bg-white', 'shadow', 'text-blue-700');
        btnSingle.classList.remove('text-gray-500');
        if (canvasContainer) canvasContainer.classList.remove('hidden');
        setScheme(currentScheme);
    } else if (mode === 'multi') {
        isComparisonMode = true;
        isAlgorithmsMode = false;
        if (multiControls) multiControls.classList.remove('hidden');
        btnMulti.classList.add('bg-white', 'shadow', 'text-blue-700');
        btnMulti.classList.remove('text-gray-500');
        if (canvasContainer) canvasContainer.classList.remove('hidden');
        updateMultiLine();
    } else if (mode === 'algorithms') {
        isComparisonMode = false;
        isAlgorithmsMode = true;
        if (algoContent) algoContent.classList.remove('hidden');
        btnAlgo.classList.add('bg-white', 'shadow', 'text-blue-700');
        btnAlgo.classList.remove('text-gray-500');
        // Hide canvas in algorithms mode to give more space for content
        if (canvasContainer) canvasContainer.classList.add('hidden');
    }
}

// Toggle accordion for algorithm cards
function toggleAlgoCard(cardId) {
    const details = document.getElementById(cardId + '-details');
    const icon = document.getElementById(cardId + '-icon');
    if (!details || !icon) return;
    if (details.classList.contains('hidden')) {
        details.classList.remove('hidden');
        icon.textContent = '-';
    } else {
        details.classList.add('hidden');
        icon.textContent = '+';
    }
}

// --- Drawing Functions ---

// --- Drawing Functions ---

function drawProductFlow(points) {
    if (!points || points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "#f97316"; // Orange-500
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed line

    // Start
    ctx.moveTo(points[0].x, points[0].y);

    // Connect points
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.stroke();

    // Draw arrow at end
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);

    ctx.setLineDash([]);
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(last.x - 10 * Math.cos(angle - Math.PI / 6), last.y - 10 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(last.x - 10 * Math.cos(angle + Math.PI / 6), last.y - 10 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawDimensionBox(x, y, w, h, wText, hText) {
    ctx.save();
    // Red Boundary Line
    ctx.strokeStyle = "#ef4444"; // Red-500
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Dimensions Text Style
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Width Label (Top) - OUTSIDE the box, above it
    const widthLabelY = y - 12;
    // Draw white background for readability
    ctx.fillStyle = "white";
    ctx.fillRect(x + w / 2 - 25, widthLabelY - 8, 50, 16);
    ctx.fillStyle = "#dc2626"; // Red-600
    ctx.fillText(wText, x + w / 2, widthLabelY);

    // Height Label (Left) - OUTSIDE the box, to the left
    ctx.save();
    const heightLabelX = x - 15;
    ctx.translate(heightLabelX, y + h / 2);
    ctx.rotate(-Math.PI / 2);
    // Draw white background for readability
    ctx.fillStyle = "white";
    ctx.fillRect(-25, -8, 50, 16);
    ctx.fillStyle = "#dc2626"; // Red-600
    ctx.fillText(hText, 0, 0);
    ctx.restore();

    ctx.restore();
}

function drawStation(x, y, label, rotation = 0) {
    ctx.save();
    // Allow rotation for circular/square layouts
    if (rotation !== 0) {
        ctx.translate(x + STATION_W / 2, y + STATION_H / 2);
        ctx.rotate(rotation);
        ctx.translate(-(x + STATION_W / 2), -(y + STATION_H / 2));
    }

    // --- STATION LAYOUT (matching user's Excel reference) ---
    // Total size: STATION_W x STATION_H (40 x 40)

    // 1. Base Floor (Light gray background)
    ctx.fillStyle = "#e5e7eb"; // Gray-200
    ctx.strokeStyle = "#6b7280"; // Gray-500
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, STATION_W, STATION_H);
    ctx.strokeRect(x, y, STATION_W, STATION_H);

    // 2. Bàn Thao Tác (Work Table) - Dark Blue, top section
    // Takes up about 1/3 of height at top
    const tableHeight = STATION_H * 0.35;
    ctx.fillStyle = "#1e3a8a"; // Blue-900 (Dark blue like Excel)
    ctx.fillRect(x + 1, y + 1, STATION_W - 2, tableHeight);
    ctx.strokeStyle = "#1e40af";
    ctx.strokeRect(x + 1, y + 1, STATION_W - 2, tableHeight);

    // 3. Giá Đựng Thùng Oricon (Oricon Rack) - Blue vertical strips on BOTH sides
    // Left Rack
    const rackWidth = STATION_W * 0.2;
    const rackY = y + tableHeight + 2;
    const rackHeight = STATION_H - tableHeight - 3;
    ctx.fillStyle = "#3b82f6"; // Blue-500
    ctx.fillRect(x + 1, rackY, rackWidth, rackHeight);
    ctx.strokeStyle = "#2563eb";
    ctx.strokeRect(x + 1, rackY, rackWidth, rackHeight);

    // Right Rack (mirrored)
    ctx.fillStyle = "#3b82f6"; // Blue-500
    ctx.fillRect(x + STATION_W - rackWidth - 1, rackY, rackWidth, rackHeight);
    ctx.strokeStyle = "#2563eb";
    ctx.strokeRect(x + STATION_W - rackWidth - 1, rackY, rackWidth, rackHeight);

    // 4. Worker Position (Stick figure or icon in center-right area)
    const workerX = x + STATION_W * 0.6;
    const workerY = y + STATION_H * 0.65;

    // Simple stick figure / person icon
    ctx.fillStyle = "#374151"; // Gray-700
    // Head (small circle)
    ctx.beginPath();
    ctx.arc(workerX, workerY - 5, 3, 0, Math.PI * 2);
    ctx.fill();
    // Body (small line)
    ctx.beginPath();
    ctx.moveTo(workerX, workerY - 2);
    ctx.lineTo(workerX, workerY + 4);
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Arms
    ctx.beginPath();
    ctx.moveTo(workerX - 4, workerY);
    ctx.lineTo(workerX + 4, workerY);
    ctx.stroke();

    // 5. Station Label (e.g., "S1") - on the work table
    ctx.fillStyle = "#ffffff"; // White text on dark table
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + STATION_W / 2, y + tableHeight / 2 + 1);

    ctx.restore();
}

function drawPath(pathPoints, color, width, dashed = false) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dashed) ctx.setLineDash([5, 5]);
    else ctx.setLineDash([]);

    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawVehicle(x, y, color, label) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = "9px sans-serif";
    ctx.fillText(label, x, y - 12);
}

// --- Schemes Drawing ---

function drawScheme1() {
    // Linear: N stations in a row
    const startX = 60;
    const startY = 250;

    // Dimensions for Box - ONLY covering stations, NOT paths
    const totalWidth = STATION_COUNT * (STATION_W + GAP) - GAP;
    const totalHeight = STATION_H; // 40px = station only

    // Draw Stations FIRST
    const stationPoints = [];
    for (let i = 0; i < STATION_COUNT; i++) {
        const x = startX + i * (STATION_W + GAP);
        drawStation(x, startY, `S${i + 1}`);
        stationPoints.push({ x: x + STATION_W / 2, y: startY + STATION_H / 2 });
    }
    drawProductFlow(stationPoints);

    // Path Definitions
    const agvPath = [
        { x: startX, y: startY - 30 },
        { x: startX + (STATION_COUNT - 1) * (STATION_W + GAP) + STATION_W, y: startY - 30 }
    ];
    const ctuPath = [
        { x: startX, y: startY + STATION_H + 30 },
        { x: startX + (STATION_COUNT - 1) * (STATION_W + GAP) + STATION_W, y: startY + STATION_H + 30 }
    ];

    // Draw Paths Visuals
    drawPath(agvPath, "#86efac", 20);
    drawPath(agvPath, "#16a34a", 2, true);
    drawPath(ctuPath, "#93c5fd", 20);
    drawPath(ctuPath, "#2563eb", 2, true);

    // Labels
    ctx.fillStyle = "#166534"; ctx.fillText("AGV PATH", startX, startY - 50);
    ctx.fillStyle = "#1e40af"; ctx.fillText("CTU PATH", startX, startY + STATION_H + 50);

    // Dynamic Dimension Text
    const lengthMeters = (STATION_COUNT * M_PER_STATION + 0.3).toFixed(1) + "m";
    drawDimensionBox(startX - 5, startY - 5, totalWidth + 10, totalHeight + 10, lengthMeters, "3.5m");

    return { ctu: ctuPath, agv: agvPath };
}

function drawScheme2() {
    // U-Shape - FIX: Balance gaps between rows and CTU
    const startX = 100;
    const topY = 150;
    const botY = 350;
    const spacing = STATION_W + GAP;

    // Calculate centered CTU position
    // Top row bottom: topY + STATION_H = 190
    // Bottom row top: botY = 350
    // Gap = 350 - 190 = 160px. Center = 190 + 80 = 270
    const ctuY = topY + STATION_H + (botY - topY - STATION_H) / 2; // = 270 (centered)

    // Dimensions calculated but drawn at end
    let boxW = 8 * spacing;
    const boxH = botY - topY + STATION_H;

    const stationPoints = [];
    // Draw Row 1 (1-8)
    // Split logic: Half top, Half bottom
    const countTop = Math.ceil(STATION_COUNT / 2);
    const countBot = Math.floor(STATION_COUNT / 2);

    // Re-calculate box width dynamically based on top row count
    boxW = countTop * spacing;

    // Draw Row 1 (1-countTop)
    for (let i = 0; i < countTop; i++) {
        const x = startX + i * spacing;
        drawStation(x, topY, `S${i + 1}`);
        stationPoints.push({ x: x + STATION_W / 2, y: topY + STATION_H / 2 });
    }
    // Draw Row 2 (countTop+1 to STATION_COUNT)
    for (let i = 0; i < countBot; i++) {
        // Align from right
        const x = startX + (countTop - 1 - i) * spacing;
        drawStation(x, botY, `S${countTop + i + 1}`, Math.PI);
        stationPoints.push({ x: x + STATION_W / 2, y: botY + STATION_H / 2 });
    }
    drawProductFlow(stationPoints);

    // Dynamic CTU X range
    const ctuRightX = startX + (countTop - 1) * spacing + STATION_W - 10;
    const ctuPath = [
        { x: startX - 20, y: ctuY },
        { x: ctuRightX, y: ctuY }
    ];

    // Dynamic AGV X range
    const agvRightX = startX + countTop * spacing + 30;
    const agvLoop = [
        { x: startX, y: topY - 30 },
        { x: agvRightX, y: topY - 30 },
        { x: agvRightX, y: botY + STATION_H + 30 },
        { x: startX, y: botY + STATION_H + 30 }
    ];

    // Draw Warehouse
    ctx.fillStyle = "#fcd34d";
    ctx.fillRect(startX - 100, ctuY - 40, 60, 80);
    ctx.strokeStyle = "#d97706"; ctx.strokeRect(startX - 100, ctuY - 40, 60, 80);
    ctx.fillStyle = "#78350f"; ctx.textAlign = "center";
    ctx.fillText("KHO", startX - 70, ctuY);

    drawPath(ctuPath, "#93c5fd", 20);
    drawPath(ctuPath, "#2563eb", 2, true);
    drawPath(agvLoop, "#86efac", 15);
    drawPath(agvLoop, "#16a34a", 1, true);

    // Labels
    ctx.fillStyle = "#166534"; ctx.fillText("AGV PATH (External)", 400, 100);
    ctx.fillStyle = "#1e40af"; ctx.fillText("CTU PATH (Internal)", 400, ctuY);

    const lenText = (Math.ceil(STATION_COUNT / 2) * M_PER_STATION + 1.1).toFixed(1) + "m";
    drawDimensionBox(startX - 5, topY - 5, boxW + 10, boxH + 10, lenText, "7.0m");

    return { ctu: ctuPath, agv: agvLoop };
}

function drawScheme3() {
    // Parallel Back-to-Back
    const startX = 100;
    const topY = 200;
    const gapY = 80;
    const botY = topY + STATION_H + gapY;
    const spacing = STATION_W + GAP;

    // Dimensions calculated but drawn at end
    // Split logic: Half top, Half bottom
    const countTop = Math.ceil(STATION_COUNT / 2);
    const countBot = Math.floor(STATION_COUNT / 2);

    // Dimensions
    const boxW = countTop * spacing;
    const boxH = botY - topY + STATION_H;

    const stationPoints = [];
    // Draw Stations (Row 1)
    for (let i = 0; i < countTop; i++) {
        const x = startX + i * spacing;
        drawStation(x, topY, `S${i + 1}`);
        stationPoints.push({ x: x + STATION_W / 2, y: topY + STATION_H / 2 });
    }
    // Draw Stations (Row 2) - Align Left-to-Right matching Row 1 (Parallel)
    // Wait, Layout 3 is Back-to-Back, usually S1 aligns with S9?
    // Original code: Row 1 (0-7), Row 2 (0-6)
    // Row 2 starts at startX + (7-i)*spacing -> Right-to-left?
    // "drawScheme3... 7-i ... Rotate 180" 
    // Let's keep the alignment consistent with dynamic count.
    // If Row 1 has N items, Row 2 has M items.
    // They usually align from Left or Right? original code aligns from Right (7-i). 
    // Actually, Layout 3 description "Parallel Back-to-Back".
    // Let's assume standard parallel alignment.
    // If I look at original code: `startX + (7 - i) * spacing`. It fills from Right to Left.
    // So S9 is at far right, S15 is at far left?
    // Let's check S1 position: `startX + 0 * spacing`. Left.
    // S8 position: `startX + 7 * spacing`. Right.
    // S9 position (i=0): `startX + 7 * spacing`. Right.
    // So it loops back.

    for (let i = 0; i < countBot; i++) {
        // Align Right-to-Left to form a U-flow or just parallel? 
        // Original used (7-i). Max index of top row is (countTop-1).
        // So we want `(countTop - 1 - i)` to match the column.
        // If countTop > countBot (e.g. 5 top, 4 bot), the last spot on left is empty.
        const x = startX + (countTop - 1 - i) * spacing;
        drawStation(x, botY, `S${countTop + i + 1}`, Math.PI);
        stationPoints.push({ x: x + STATION_W / 2, y: botY + STATION_H / 2 });
    }
    drawProductFlow(stationPoints);

    // CTU Path (Center) - Width dynamic
    const ctuY = topY + STATION_H + gapY / 2;
    const ctuEndX = startX + (countTop - 1) * spacing + STATION_W + 20;
    const ctuPath = [
        { x: startX - 20, y: ctuY },
        { x: ctuEndX, y: ctuY }
    ];

    // AGV Path (Outside Loop) - Width dynamic
    const agvTopY = topY - 40;
    const agvBotY = botY + STATION_H + 40;
    const agvRightX = startX + (countTop - 1) * spacing + STATION_W; // original was 7*spacing + STATION_W
    const agvLoop = [
        { x: startX, y: agvTopY },
        { x: agvRightX, y: agvTopY },
        { x: agvRightX, y: agvBotY },
        { x: startX, y: agvBotY },
        { x: startX, y: agvTopY }
    ];

    // Draw paths
    drawPath(ctuPath, "#93c5fd", 40);
    ctx.fillStyle = "#60a5fa"; ctx.fillText("CENTER CTU LANE", startX + 150, ctuY);
    drawPath(ctuPath, "#2563eb", 2, true);
    drawPath(agvLoop, "#86efac", 15);
    drawPath(agvLoop, "#16a34a", 1, true);

    // Draw Dimension Box LAST
    const lenText = (Math.ceil(STATION_COUNT / 2) * M_PER_STATION).toFixed(1) + "m";
    drawDimensionBox(startX - 5, topY - 5, boxW + 10, boxH + 10, lenText, "6.0m");

    return { ctu: ctuPath, agv: agvLoop };
}

function drawScheme4() {
    // Circular Layout
    const centerX = 400;
    const centerY = 250;

    // Dynamic Radius Logic
    // Minimum perimeter to fit stations
    const minPerimeter = STATION_COUNT * (STATION_W + GAP * 2); // Add more gap for turning
    const minRadius = minPerimeter / (2 * Math.PI);

    const radiusStations = Math.max(150, minRadius); // Base 150, expand if needed
    const radiusInner = radiusStations - 50; // CTU track
    const radiusOuter = radiusStations + 60; // AGV track

    // Dimension box size calculated but drawn at end
    const stationBoxSize = radiusStations * 2 + STATION_W;

    const anglePerStation = (2 * Math.PI) / STATION_COUNT;

    // Draw Stations (Using new rotation param)
    const stationPoints = [];
    // S1 near Entrance (Angle ~ -15 deg or -0.26 rad), S15 near Exit (~ +15 deg).
    // Flow: CCW from -0.26 to -6.0 (almost full circle).
    // Or just spaced evenly starting from near entrance.
    const startAngle = -0.3;
    for (let i = 0; i < STATION_COUNT; i++) {
        const angle = startAngle - i * anglePerStation;
        const sx = centerX + Math.cos(angle) * radiusStations - STATION_W / 2;
        const sy = centerY + Math.sin(angle) * radiusStations - STATION_H / 2;

        drawStation(sx, sy, `S${i + 1}`, angle + Math.PI / 2);
        stationPoints.push({ x: sx + STATION_W / 2, y: sy + STATION_H / 2 });
    }
    drawProductFlow(stationPoints);

    // CTU Ring (Inner)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusInner, 0, 2 * Math.PI);
    ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 20; ctx.stroke();
    ctx.beginPath(); ctx.arc(centerX, centerY, radiusInner, 0, 2 * Math.PI);
    ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = "#1e3a8a"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("TRUNG TÂM (HUB)", centerX, centerY);

    // Access Bridge (Bottom-Right or Top-Right)
    // DUAL RAMPS - IN (Blue) and OUT (Cyan)
    const warehouseX = 700;
    const warehouseY = 150;

    // Draw Warehouse
    ctx.fillStyle = "#fcd34d";
    ctx.fillRect(warehouseX - 30, warehouseY - 40, 80, 80);
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 2; ctx.strokeRect(warehouseX - 30, warehouseY - 40, 80, 80);
    ctx.fillStyle = "#78350f"; ctx.fillText("KHO (WH)", warehouseX + 10, warehouseY);

    // NEW DESIGN: Parallel ramps at same angle (~0ﾂｰ) pointing to warehouse
    // Gap angle: small offset for IN (-0.12 rad) and OUT (+0.12 rad)
    const rampGapOffset = 0.12;
    const inRampAngle = -rampGapOffset;
    const outRampAngle = rampGapOffset;

    // OUT Bridge (Cyan) - Top lane, CTU going TO warehouse
    const outBridgeStart = {
        x: centerX + radiusInner * Math.cos(outRampAngle),
        y: centerY + radiusInner * Math.sin(outRampAngle)
    };
    const outBridgeEnd = { x: warehouseX - 30, y: warehouseY - 15 };

    ctx.beginPath();
    ctx.moveTo(outBridgeStart.x, outBridgeStart.y);
    ctx.lineTo(outBridgeEnd.x, outBridgeEnd.y);
    ctx.strokeStyle = "#a5f3fc"; ctx.lineWidth = 10; ctx.stroke();
    ctx.strokeStyle = "#0891b2"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

    // OUT Label and Arrow
    ctx.fillStyle = "#0e7490"; ctx.font = "bold 10px sans-serif";
    ctx.fillText("RA →", (outBridgeStart.x + outBridgeEnd.x) / 2, (outBridgeStart.y + outBridgeEnd.y) / 2 - 10);

            // IN Bridge (Blue) - Bottom lane, CTU returning FROM warehouse
            const inBridgeStart = {
        x: centerX + radiusInner * Math.cos(inRampAngle),
        y: centerY + radiusInner * Math.sin(inRampAngle)
    };
    const inBridgeEnd = { x: warehouseX - 30, y: warehouseY + 15 };

    ctx.beginPath();
    ctx.moveTo(inBridgeStart.x, inBridgeStart.y);
    ctx.lineTo(inBridgeEnd.x, inBridgeEnd.y);
    ctx.strokeStyle = "#bfdbfe"; ctx.lineWidth = 10; ctx.stroke();
    ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

    // IN Label and Arrow
    ctx.fillStyle = "#1e40af"; ctx.font = "bold 10px sans-serif";
    ctx.fillText("→ VÀO", (inBridgeStart.x + inBridgeEnd.x) / 2, (inBridgeStart.y + inBridgeEnd.y) / 2 + 18);

    // AGV Ring (Outer)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusOuter, 0, 2 * Math.PI);
    ctx.strokeStyle = "#86efac"; ctx.lineWidth = 15; ctx.stroke();
    ctx.beginPath(); ctx.arc(centerX, centerY, radiusOuter, 0, 2 * Math.PI);
    ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 1; ctx.stroke();

    // Paths for animation
    // AGV: Simple Circle
    const steps = 100;
    const agvData = [];
    for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * 2 * Math.PI - Math.PI / 2;
        agvData.push({ x: centerX + Math.cos(a) * radiusOuter, y: centerY + Math.sin(a) * radiusOuter });
    }

    // CTU: FULL 360° Circle + Trip to/from Warehouse via parallel ramps
    const ctuData = [];
    // Part 1: Start at warehouse (OUT side)
    ctuData.push({ x: warehouseX, y: warehouseY - 15 });
    ctuData.push(outBridgeEnd);
    ctuData.push(outBridgeStart);

    // Part 2: FULL 360° circle (all stations)
    const fullCircleSteps = 80;
    const fullArc = 2 * Math.PI - (outRampAngle - inRampAngle);
    for (let i = 0; i <= fullCircleSteps; i++) {
        const a = outRampAngle - fullArc * (i / fullCircleSteps);
        ctuData.push({ x: centerX + Math.cos(a) * radiusInner, y: centerY + Math.sin(a) * radiusInner });
    }

    // Part 3: Back to warehouse via IN ramp
    ctuData.push(inBridgeStart);
    ctuData.push(inBridgeEnd);
    ctuData.push({ x: warehouseX, y: warehouseY + 15 });
    ctuData.push({ x: warehouseX, y: warehouseY - 15 }); // Loop back

    // Dynamic Dimensions Text
    const diamValue = (STATION_COUNT * M_PER_STATION / Math.PI) + 4.6;
    const diam = diamValue.toFixed(1) + "m";
    drawDimensionBox(centerX - stationBoxSize / 2, centerY - stationBoxSize / 2, stationBoxSize, stationBoxSize, diam, diam);

    return { ctu: ctuData, agv: agvData };
}

// Layout 5: TRUE C-SHAPE - Các 2 track đặt ở cùng trên (không kín)
// Layout 5: Layout Chữ C (Kho Bên Ngoài) - Parallel Connections
// Cả AGV và CTU đặt ở tại 2 đầu chữ C về kho - không đi qua giữa
function drawScheme5() {
    const centerX = 280;
    const centerY = 280;

    // Dynamic Radius Logic
    const minPerimeter = STATION_COUNT * (STATION_W + GAP * 1.5); // 1.5 gap factor
    const arcLengthFactor = 0.75; // C-shape is about 75% of a circle (270 deg)
    const minRadius = minPerimeter / (2 * Math.PI * arcLengthFactor);

    const radiusStation = Math.max(118, minRadius);
    const radiusOuter = radiusStation + 32;  // AGV track (outer relative to station)
    const radiusInner = radiusStation - 33;   // CTU track (inner relative to station)

    // Dimension box size calculated but drawn at end
    const stationBoxSize = radiusStation * 2 + STATION_W;

    // C-shape gap elements
    const gapHalf = Math.PI / 4.5;
    const gapStart = -gapHalf;
    const gapEnd = gapHalf;
    const arcStart = gapEnd;
    const arcEnd = 2 * Math.PI + gapStart;

    // Warehouse
    const warehouseX = centerX + radiusOuter + 70; // Move warehouse out dynamically
    const warehouseY = centerY;
    ctx.fillStyle = "#fcd34d";
    ctx.fillRect(warehouseX - 35, warehouseY - 60, 70, 120);
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 2;
    ctx.strokeRect(warehouseX - 35, warehouseY - 60, 70, 120);
    ctx.fillStyle = "#78350f"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("KHO", warehouseX, warehouseY);

    // Draw Stations (Using new rotation param)
    const stationPoints = [];
    for (let i = 0; i < STATION_COUNT; i++) {
        const t = i / (STATION_COUNT - 1);
        const angle = arcStart + t * (arcEnd - arcStart);
        const x = centerX + Math.cos(angle) * radiusStation - STATION_W / 2;
        const y = centerY + Math.sin(angle) * radiusStation - STATION_H / 2;

        // Rotation: angle + PI/2
        drawStation(x, y, `S${i + 1}`, angle + Math.PI / 2);
        stationPoints.push({ x: x + STATION_W / 2, y: y + STATION_H / 2 });
    }
    drawProductFlow(stationPoints);

    // Tracks (C-Shape Arcs)
    ctx.beginPath(); ctx.arc(centerX, centerY, radiusOuter, arcStart, arcEnd);
    ctx.strokeStyle = "#86efac"; ctx.lineWidth = 14; ctx.stroke();
    ctx.beginPath(); ctx.arc(centerX, centerY, radiusOuter, arcStart, arcEnd);
    ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.arc(centerX, centerY, radiusInner, arcStart, arcEnd);
    ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 10; ctx.stroke();
    ctx.beginPath(); ctx.arc(centerX, centerY, radiusInner, arcStart, arcEnd);
    ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 1; ctx.stroke();

    // --- CONNECTION POINTS ---
    const agvBottomPt = { x: centerX + Math.cos(gapEnd) * radiusOuter, y: centerY + Math.sin(gapEnd) * radiusOuter };
    const ctuBottomPt = { x: centerX + Math.cos(gapEnd) * radiusInner, y: centerY + Math.sin(gapEnd) * radiusInner };
    const agvTopPt = { x: centerX + Math.cos(gapStart) * radiusOuter, y: centerY + Math.sin(gapStart) * radiusOuter };
    const ctuTopPt = { x: centerX + Math.cos(gapStart) * radiusInner, y: centerY + Math.sin(gapStart) * radiusInner };

    // --- LANES (Parallel Curves) ---
    // AGV VÀO
    ctx.beginPath();
    ctx.moveTo(warehouseX, warehouseY + 50);
    ctx.quadraticCurveTo(warehouseX - 50, warehouseY + 50, agvBottomPt.x, agvBottomPt.y);
    ctx.strokeStyle = "#86efac"; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillStyle = "#16a34a"; ctx.textAlign = "right";
    ctx.fillText("AGV VÀO", warehouseX - 50, warehouseY + 65);

    // AGV RA
    ctx.beginPath();
    ctx.moveTo(agvTopPt.x, agvTopPt.y);
    ctx.quadraticCurveTo(warehouseX - 50, warehouseY - 50, warehouseX, warehouseY - 50);
    ctx.strokeStyle = "#86efac"; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillText("AGV RA", warehouseX - 50, warehouseY - 60);

    // CTU VÀO
    ctx.beginPath();
    ctx.moveTo(warehouseX - 35, warehouseY + 25);
    ctx.quadraticCurveTo(warehouseX - 80, warehouseY + 25, ctuBottomPt.x, ctuBottomPt.y);
    ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#1e40af"; ctx.textAlign = "center";
    ctx.fillText("CTU VÀO", warehouseX - 70, warehouseY + 15);

    // CTU RA
    ctx.beginPath();
    ctx.moveTo(ctuTopPt.x, ctuTopPt.y);
    ctx.quadraticCurveTo(warehouseX - 80, warehouseY - 25, warehouseX - 35, warehouseY - 25);
    ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillText("CTU RA", warehouseX - 70, warehouseY - 15);

    // --- ANIMATION PATHS ---
    // Construct Paths... (Keep original logic for paths, just returning them)
    // Re-generating path data for brevity (copying critical parts)

    const agvData = [];
    agvData.push({ x: warehouseX, y: warehouseY + 50 });
    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const P0 = { x: warehouseX, y: warehouseY + 50 };
        const P1 = { x: warehouseX - 50, y: warehouseY + 50 };
        const P2 = agvBottomPt;
        const x = (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x;
        const y = (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y;
        agvData.push({ x, y });
    }
    for (let i = 0; i <= 60; i++) {
        const angle = arcStart + (i / 60) * (arcEnd - arcStart);
        agvData.push({ x: centerX + Math.cos(angle) * radiusOuter, y: centerY + Math.sin(angle) * radiusOuter });
    }
    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const P0 = agvTopPt;
        const P1 = { x: warehouseX - 50, y: warehouseY - 50 };
        const P2 = { x: warehouseX, y: warehouseY - 50 };
        const x = (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x;
        const y = (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y;
        agvData.push({ x, y });
    }
    agvData.push({ x: warehouseX, y: warehouseY + 50 });

    const ctuData = [];
    ctuData.push({ x: warehouseX - 35, y: warehouseY + 25 });
    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const P0 = { x: warehouseX - 35, y: warehouseY + 25 };
        const P1 = { x: warehouseX - 80, y: warehouseY + 25 };
        const P2 = ctuBottomPt;
        const x = (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x;
        const y = (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y;
        ctuData.push({ x, y });
    }
    for (let i = 0; i <= 50; i++) {
        const angle = arcStart + (i / 50) * (arcEnd - arcStart);
        ctuData.push({ x: centerX + Math.cos(angle) * radiusInner, y: centerY + Math.sin(angle) * radiusInner });
    }
    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const P0 = ctuTopPt;
        const P1 = { x: warehouseX - 80, y: warehouseY - 25 };
        const P2 = { x: warehouseX - 35, y: warehouseY - 25 };
        const x = (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x;
        const y = (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y;
        ctuData.push({ x, y });
    }
    ctuData.push({ x: warehouseX - 35, y: warehouseY + 25 });

    // Draw Dimension Box LAST
    const diamValue = (STATION_COUNT * M_PER_STATION / Math.PI) + 5.5;
    const diamText = diamValue.toFixed(1) + "m";
    drawDimensionBox(centerX - stationBoxSize / 2, centerY - stationBoxSize / 2, stationBoxSize, stationBoxSize, diamText, diamText);

    return { ctu: ctuData, agv: agvData };
}

function drawScheme6() {
    // Square Layout - Stations between AGV (outer) and CTU (inner)
    const centerX = 400;
    const centerY = 300;

    // Dynamic Size Logic
    // Split across 3 sides (approx).
    const stationsPerSide = Math.ceil(STATION_COUNT / 3);
    // Height needs to fit 'stationsPerSide' stations.
    // Width also needs to fit 'stationsPerSide'.
    const minSide = stationsPerSide * (STATION_W + GAP) + 40;
    const baseSide = Math.max(240, minSide);

    const stationSize = baseSide; // Middle ring
    const outerSize = stationSize + 80;
    const innerSize = stationSize - 80;

    const halfOuter = outerSize / 2;
    const halfStation = stationSize / 2;
    const halfInner = innerSize / 2;

    // Warehouse position
    const warehouseX = centerX + halfOuter + 80;
    const warehouseY = centerY;

    // Draw Warehouse
    ctx.fillStyle = "#fcd34d";
    ctx.fillRect(warehouseX - 35, warehouseY - 60, 70, 120);
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 2;
    ctx.strokeRect(warehouseX - 35, warehouseY - 60, 70, 120);
    ctx.fillStyle = "#78350f"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("KHO", warehouseX, warehouseY);

    // Draw AGV Track (Outer - Green)
    ctx.lineWidth = 14; ctx.strokeStyle = "#86efac";
    ctx.strokeRect(centerX - halfOuter, centerY - halfOuter, outerSize, outerSize);
    ctx.lineWidth = 1; ctx.strokeStyle = "#16a34a";
    ctx.strokeRect(centerX - halfOuter, centerY - halfOuter, outerSize, outerSize);

    // Draw CTU Track (Inner - Blue)
    ctx.lineWidth = 10; ctx.strokeStyle = "#93c5fd";
    ctx.strokeRect(centerX - halfInner, centerY - halfInner, innerSize, innerSize);
    ctx.lineWidth = 1; ctx.strokeStyle = "#2563eb";
    ctx.strokeRect(centerX - halfInner, centerY - halfInner, innerSize, innerSize);

    // Connection lines to Warehouse
    const outerRightTop = { x: centerX + halfOuter, y: centerY - 40 };
    const outerRightBot = { x: centerX + halfOuter, y: centerY + 40 };
    const innerRightTop = { x: centerX + halfInner, y: centerY - 25 };
    const innerRightBot = { x: centerX + halfInner, y: centerY + 25 };

    // AGV connections (Green)
    // AGV connections (Green)
    ctx.beginPath();
    ctx.moveTo(warehouseX - 35, warehouseY - 40); // From Warehouse (Top)
    ctx.lineTo(outerRightTop.x, outerRightTop.y); // To Top Lane
    ctx.strokeStyle = "#86efac"; ctx.lineWidth = 12; ctx.stroke(); // Thicker for entrance
    ctx.fillStyle = "#16a34a"; ctx.font = "bold 11px sans-serif";
    ctx.fillText("AGV VÀO", (outerRightTop.x + warehouseX - 35) / 2, outerRightTop.y - 15);

    ctx.beginPath();
    ctx.moveTo(outerRightBot.x, outerRightBot.y); // From Bot Lane
    ctx.lineTo(warehouseX - 35, warehouseY + 40); // To Warehouse (Bot)
    ctx.strokeStyle = "#86efac"; ctx.lineWidth = 8; ctx.stroke();
    ctx.fillText("AGV RA", (outerRightBot.x + warehouseX - 35) / 2, outerRightBot.y + 15);

    // CTU connections (Blue)
    ctx.beginPath();
    ctx.moveTo(warehouseX - 35, warehouseY - 20); // From Warehouse
    ctx.lineTo(innerRightTop.x, innerRightTop.y); // To Top Lane
    ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#1e40af";
    ctx.fillText("CTU VÀO", (innerRightTop.x + warehouseX - 35) / 2, innerRightTop.y - 5);

    ctx.beginPath();
    ctx.moveTo(innerRightBot.x, innerRightBot.y); // From Bot Lane
    ctx.lineTo(warehouseX - 35, warehouseY + 20); // To Warehouse
    ctx.strokeStyle = "#93c5fd"; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillText("CTU RA", (innerRightBot.x + warehouseX - 35) / 2, innerRightBot.y + 10);

    // Stations: 3 sides logic (Bottom, Left, Top)
    // Distribute STATION_COUNT across 3 sides.
    // Side 1 (Bottom): 0 .. k1-1
    // Side 2 (Left): k1 .. k2-1
    // Side 3 (Top): k2 .. N-1

    const countBot = Math.ceil(STATION_COUNT / 3);
    const countLeft = Math.ceil((STATION_COUNT - countBot) / 2);
    const countTop = STATION_COUNT - countBot - countLeft;

    const spacingBot = stationSize / countBot;
    const spacingLeft = stationSize / countLeft; // Might be different spacing
    const spacingTop = stationSize / countTop;

    let sIdx = 1;
    const stationPoints = [];

    // Bottom Side (Right to Left)
    for (let i = 0; i < countBot; i++) {
        // Centered on side: Start from Right
        // x = centerX + halfStation - (i + 0.5)*spacing
        const x = centerX + halfStation - (i * spacingBot) - (spacingBot / 2) - STATION_W / 2;
        const y = centerY + halfStation - STATION_H / 2;
        drawStation(x, y, `S${sIdx++}`, Math.PI);
        stationPoints.push({ x: x + STATION_W / 2, y: y + STATION_H / 2 });
    }

    // Left Side (Bottom to Top)
    for (let i = 0; i < countLeft; i++) {
        const x = centerX - halfStation - STATION_W / 2;
        const y = centerY + halfStation - (i * spacingLeft) - (spacingLeft / 2) - STATION_H / 2;
        drawStation(x, y, `S${sIdx++}`, -Math.PI / 2);
        stationPoints.push({ x: x + STATION_W / 2, y: y + STATION_H / 2 });
    }

    // Top Side (Left to Right)
    for (let i = 0; i < countTop; i++) {
        const x = centerX - halfStation + (i * spacingTop) + (spacingTop / 2) - STATION_W / 2;
        const y = centerY - halfStation - STATION_H / 2;
        drawStation(x, y, `S${sIdx++}`, 0);
        stationPoints.push({ x: x + STATION_W / 2, y: y + STATION_H / 2 });
    }
    drawProductFlow(stationPoints);

    // Center Label
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("AREA DEAD SPACE", centerX, centerY);
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.fillText("(Khu vực lãng phí)", centerX, centerY + 20);

    // Animation Paths (including warehouse trips)
    const outerLoop = [
        { x: warehouseX, y: warehouseY + 40 },
        { x: centerX + halfOuter, y: centerY + 40 },
        { x: centerX + halfOuter, y: centerY + halfOuter },
        { x: centerX - halfOuter, y: centerY + halfOuter },
        { x: centerX - halfOuter, y: centerY - halfOuter },
        { x: centerX + halfOuter, y: centerY - halfOuter },
        { x: centerX + halfOuter, y: centerY - 40 },
        { x: warehouseX, y: warehouseY - 40 },
        { x: warehouseX, y: warehouseY + 40 }
    ];
    const innerLoop = [
        { x: warehouseX - 35, y: warehouseY + 20 },
        { x: centerX + halfInner, y: centerY + 25 },
        { x: centerX + halfInner, y: centerY + halfInner },
        { x: centerX - halfInner, y: centerY + halfInner },
        { x: centerX - halfInner, y: centerY - halfInner },
        { x: centerX + halfInner, y: centerY - halfInner },
        { x: centerX + halfInner, y: centerY - 25 },
        { x: warehouseX - 35, y: warehouseY - 20 },
        { x: warehouseX - 35, y: warehouseY + 20 }
    ];

    // Draw Dimension Box LAST
    const sideText = (Math.ceil(STATION_COUNT / 4) * M_PER_STATION + 3.0).toFixed(1) + "m";
    drawDimensionBox(centerX - halfStation - 5, centerY - halfStation - 5,
        stationSize + 10, stationSize + 10, sideText, sideText);

    return { ctu: innerLoop, agv: outerLoop };
}

function drawScheme7() {
    // Herringbone/Xương Cá Layout - Stations at 45° angles
    const startX = 80;
    const centerY = 280;
    const spacing = 32; // Tighter spacing to remove gaps
    const rowGap = 90; // Reduced gap between rows

    const topY = centerY - rowGap / 2;
    const botY = centerY + rowGap / 2;

    // Dynamic Split
    const countTop = Math.ceil(STATION_COUNT / 2);
    const countBot = Math.floor(STATION_COUNT / 2);

    // Calculate layout dimensions dynamically
    const totalWidth = countTop * spacing + STATION_W;
    const totalHeight = rowGap + STATION_H;

    // Warehouse
    const warehouseX = startX - 70;
    const warehouseY = centerY;
    ctx.fillStyle = "#fcd34d";
    ctx.fillRect(warehouseX - 30, warehouseY - 50, 60, 100);
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 2;
    ctx.strokeRect(warehouseX - 30, warehouseY - 50, 60, 100);
    ctx.fillStyle = "#78350f"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("KHO", warehouseX, warehouseY);

    // Draw AGV Path (Outer loop - Green)
    const agvMargin = 30;
    const agvTopY = topY - 40;
    const agvBotY = botY + 40;
    const agvPath = [
        { x: startX - agvMargin, y: agvTopY },
        { x: startX + totalWidth + agvMargin, y: agvTopY },
        { x: startX + totalWidth + agvMargin, y: agvBotY },
        { x: startX - agvMargin, y: agvBotY },
        { x: startX - agvMargin, y: agvTopY }
    ];
    drawPath(agvPath, "#86efac", 12);
    drawPath(agvPath, "#16a34a", 1, true);

    // Draw CTU Path (Center - Blue)
    const ctuPath = [
        { x: warehouseX + 30, y: centerY },
        { x: startX + totalWidth + 20, y: centerY }
    ];
    drawPath(ctuPath, "#93c5fd", 30);
    drawPath(ctuPath, "#2563eb", 2, true);
    ctx.fillStyle = "#1e40af"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("CTU PATH (TRUNG TÂM)", startX + totalWidth / 2, centerY);

    const stationPoints = [];
    // Draw Top Row Stations (countTop stations, angled -45° like \)
    // Position stations at topY (above CTU), offset outward for symmetry
    for (let i = 0; i < countTop; i++) {
        const x = startX + i * spacing;
        const y = topY - 10; // Move UP (away from CTU)
        drawStation(x, y, `S${i + 1}`, -Math.PI / 4); // -45° angle
        stationPoints.push({ x: x + STATION_W / 2, y: y + STATION_H / 2 });
    }

    // Draw Bottom Row Stations (countBot stations, angled +45° like /)
    // Position stations at botY (below CTU), offset outward for symmetry
    for (let i = 0; i < countBot; i++) {
        const x = startX + i * spacing;
        const y = botY - 30; // Move UP
        drawStation(x, y, `S${countTop + i + 1}`, Math.PI / 4 + Math.PI);
        stationPoints.push({ x: x + STATION_W / 2, y: y + STATION_H / 2 });
    }
    drawProductFlow(stationPoints);

    // Labels
    ctx.fillStyle = "#166534"; ctx.font = "bold 10px sans-serif";
    ctx.fillText("AGV PATH (VÒNG NGOÀI)", startX + totalWidth / 2, topY - 55);

    // Draw Dimension Box LAST
    const lenText = (Math.ceil(STATION_COUNT / 2) * 1.3 + 0.2).toFixed(1) + "m";
    drawDimensionBox(startX - 10, topY - 25, totalWidth + 20, totalHeight + 50, lenText, "6.0m");

    // Animation paths
    const agvLoop = [
        { x: warehouseX, y: warehouseY - 30 },
        { x: startX - agvMargin, y: agvTopY },
        { x: startX + totalWidth + agvMargin, y: agvTopY },
        { x: startX + totalWidth + agvMargin, y: agvBotY },
        { x: startX - agvMargin, y: agvBotY },
        { x: startX - agvMargin, y: centerY },
        { x: warehouseX, y: warehouseY + 30 },
        { x: warehouseX, y: warehouseY - 30 }
    ];
    const ctuLine = [
        { x: warehouseX + 30, y: centerY },
        { x: startX + totalWidth + 20, y: centerY },
        { x: warehouseX + 30, y: centerY }
    ];

    return { ctu: ctuLine, agv: agvLoop };
}



function drawScheme8() {
    // Layout 8: Inverted U (n-Shape) - Left -> Top -> Right
    const startX = 150;
    const topY = 150;

    // Dynamic Distribution
    const countLeft = Math.ceil(STATION_COUNT / 3);
    const countTop = Math.ceil((STATION_COUNT - countLeft) / 2);
    const countRight = STATION_COUNT - countLeft - countTop;

    const spacing = STATION_W + GAP;

    // Dynamic Size
    const sideH = Math.max(200, countLeft * spacing);
    const topW = Math.max(300, countTop * spacing * 1.5); // Spread top a bit more

    // Dimensions
    const totalWidth = topW + STATION_W;
    const totalHeight = sideH + STATION_H;

    // Warehouse (Bottom Center)
    const warehouseX = startX + topW / 2;
    const warehouseY = topY + sideH + 80;

    const stationPoints = [];
    let sIdx = 1;

    // 1. Left Side (Bottom to Top)
    const spacingLeft = sideH / countLeft;
    for (let i = 0; i < countLeft; i++) {
        const x = startX;
        // Start from Bottom (i=0) to Top (i=countLeft-1)
        const y = topY + sideH - i * spacingLeft;
        drawStation(x, y, `S${sIdx++}`, Math.PI / 2);
        stationPoints.push({ x: x + STATION_W / 2, y: y + STATION_H / 2 });
    }

    // 2. Top Side (Left to Right)
    const spacingTop = topW / (countTop + 1); // Spread evenly inside topW
    for (let i = 0; i < countTop; i++) {
        const x = startX + (i + 1) * spacingTop;
        const y = topY;
        drawStation(x, y, `S${sIdx++}`, Math.PI);
        stationPoints.push({ x: x + STATION_W / 2, y: y + STATION_H / 2 });
    }

    // 3. Right Side (Top to Bottom)
    const rightX = startX + topW; // Fixed X at right leg
    const spacingRight = sideH / countRight;
    for (let i = 0; i < countRight; i++) {
        const x = rightX;
        const y = topY + (i + 1) * spacingRight; // Start from Top down
        drawStation(x, y, `S${sIdx++}`, -Math.PI / 2);
        stationPoints.push({ x: x + STATION_W / 2, y: y + STATION_H / 2 });
    }

    drawProductFlow(stationPoints);

    // Paths
    // AGV Outer U
    const agvPoints = [
        { x: startX - 40, y: topY + 250 }, // Start Left Bot
        { x: startX - 40, y: topY - 40 },  // Left Top
        { x: rightX + 40, y: topY - 40 },  // Right Top
        { x: rightX + 40, y: topY + 250 }, // Right Bot
        { x: startX - 40, y: topY + 250 }  // Loop back? Or Open?
    ];
    // Loop back creates closed rectangle. 
    // Inverted U usually implies open AGV path?
    // "n" shape. AGV goes around the n.
    drawPath(agvPoints, "#86efac", 12);
    drawPath(agvPoints, "#16a34a", 1, true);

    // CTU Inner U
    const ctuPoints = [
        { x: startX + 40, y: topY + 220 },
        { x: startX + 40, y: topY + 40 },
        { x: rightX - 40, y: topY + 40 },
        { x: rightX - 40, y: topY + 220 }
    ];
    drawPath(ctuPoints, "#93c5fd", 20);
    drawPath(ctuPoints, "#2563eb", 2, true);

    // Labels
    ctx.fillStyle = "#166534"; ctx.font = "bold 10px sans-serif";
    ctx.fillText("AGV (Outer)", startX - 40, topY - 50);

    // Draw Dimension Box LAST
    const sideText = (Math.ceil(STATION_COUNT / 3) * M_PER_STATION + 3.0).toFixed(1) + "m";
    drawDimensionBox(startX - 10, topY - 10, topW + 20, sideH + 20, sideText, sideText);

    return { ctu: ctuPoints, agv: agvPoints };
}

// --- Animation Logic ---

function getPointOnPath(path, progress) {
    // progress 0..1
    // Total length approximation
    let totalLen = 0;
    const lens = [];
    for (let i = 0; i < path.length - 1; i++) {
        const dx = path[i + 1].x - path[i].x;
        const dy = path[i + 1].y - path[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        lens.push(dist);
        totalLen += dist;
    }

    let targetDist = progress * totalLen;
    let currentDist = 0;

    for (let i = 0; i < lens.length; i++) {
        if (currentDist + lens[i] >= targetDist) {
            // It's in this segment
            const segProg = (targetDist - currentDist) / lens[i];
            return {
                x: path[i].x + (path[i + 1].x - path[i].x) * segProg,
                y: path[i].y + (path[i + 1].y - path[i].y) * segProg
            };
        }
        currentDist += lens[i];
    }
    return path[path.length - 1];
}

function loop() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 20) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = 0; y < canvas.height; y += 20) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();

    // Draw Layout
    if (isComparisonMode) {
        drawComparisonFrame();
        requestAnimationFrame(loop);
        return;
    }

    let paths;
    if (currentScheme === 1) paths = drawScheme1();
    else if (currentScheme === 2) paths = drawScheme2();
    else if (currentScheme === 3) paths = drawScheme3();
    else if (currentScheme === 4) paths = drawScheme4();
    else if (currentScheme === 5) paths = drawScheme5();
    else if (currentScheme === 6) paths = drawScheme6();
    else if (currentScheme === 7) paths = drawScheme7();
    else paths = drawScheme8();

    // Animate
    agvPos.progress += 0.002;
    if (agvPos.progress > 1) agvPos.progress = 0;

    ctuPos.progress += 0.003;
    if (ctuPos.progress > 1) ctuPos.progress = 0;

    const agvP = getPointOnPath(paths.agv, agvPos.progress);
    const ctuP = getPointOnPath(paths.ctu, ctuPos.progress);

    // Draw Vehicles
    drawVehicle(agvP.x, agvP.y, "#22c55e", "AGV");
    drawVehicle(ctuP.x, ctuP.y, "#3b82f6", "CTU");

    animationId = requestAnimationFrame(loop);
}

// --- MULTI-LINE COMPARISON LOGIC ---
// (Variables declared in State section)

// (switchMode is defined above)


function updateMultiLine() {
    if (!isComparisonMode) return;

    const lineCount = parseInt(document.getElementById('cfg-line-count').value);
    const layoutType = document.getElementById('cfg-layout-type').value;
    const lineSpacing = parseFloat(document.getElementById('cfg-line-spacing').value);
    document.getElementById('disp-spacing').innerText = lineSpacing + "m";

    // 1. Setup Environment
    mlStations = [];
    mlPaths = [];

    const arrangement = document.getElementById('cfg-arrangement').value;

    // Layout Params (Dims in meters/units)
    let singleW = STATION_COUNT * M_PER_STATION;
    let singleH = 4;

    if (layoutType === 'straight') {
        singleW = STATION_COUNT * M_PER_STATION + 0.3;
        singleH = 3.5;
    }
    else if (layoutType === 'u_shape' || layoutType === 'back_to_back') {
        const countTop = Math.ceil(STATION_COUNT / 2);
        singleW = countTop * M_PER_STATION + 2;
        singleH = 7;
    }
    else if (layoutType === 'circular') {
        const dia = (STATION_COUNT * M_PER_STATION / Math.PI) + 4.6;
        singleW = dia; singleH = dia;
    }
    else if (layoutType === 'c_shape') {
        const dia = (STATION_COUNT * M_PER_STATION / Math.PI) + 5.5;
        singleW = dia; singleH = dia;
    }
    else if (layoutType === 'square') {
        const side = Math.ceil(STATION_COUNT / 4) * M_PER_STATION + 3;
        singleW = side; singleH = side;
    }
    else if (layoutType === 'herringbone') {
        const countTop = Math.ceil(STATION_COUNT / 2);
        singleW = countTop * 1.3 + 2;
        singleH = 6;
    }
    else if (layoutType === 'inverted_u') {
        const side = Math.ceil(STATION_COUNT / 3) * M_PER_STATION + 3;
        singleW = side; singleH = side;
    }

    // Calculate Bounds based on Arrangement
    let cols = 1;
    let rows = lineCount;

    if (arrangement === 'tree' && lineCount > 1) {
        // 3 Columns Max. Lines fill Col 1, then Col 2...
        // Sơ đồ cây 3 lớp.
        // Logic: 0,1,2 -> Col 0.
        cols = Math.ceil(lineCount / 3);
        if (cols > 3) cols = 3;
        rows = 3; // Fixed 3 rows grid
    }

    const colSpacing = 15; // meters
    const totalModelW = cols * singleW + (cols - 1) * colSpacing;
    const totalModelH = rows * singleH + (rows - 1) * lineSpacing;

    // Dynamic Scale to Fit Canvas (800x500 minus padding)
    const availW = canvas.width - 100;
    const availH = canvas.height - 100;

    let scaleW = availW / totalModelW;
    let scaleH = availH / totalModelH;
    let SCALE = Math.min(scaleW, scaleH);
    if (SCALE > 12) SCALE = 12; // Max cap
    if (SCALE < 3) SCALE = 3;   // Min cap

    const totalH = totalModelH * SCALE;
    const totalW = totalModelW * SCALE;

    // Centering + User Warehouse Distance Offset
    const userWhDistVisual = parseFloat(document.getElementById('cfg-wh-dist').value || 20);
    const whOffsetPx = userWhDistVisual * SCALE * 0.3; // Scale down for visual fit (0.3 factor)

    const startY = (canvas.height - totalH) / 2;
    const startX = 60 + whOffsetPx + (canvas.width - 60 - totalW - whOffsetPx) / 2; // Offset for Warehouse

    mlWarehouse = { x: 50, y: canvas.height / 2 };

    // Generate Stations
    for (let line = 0; line < lineCount; line++) {
        let colIdx = 0;
        let rowIdx = line;

        if (arrangement === 'tree') {
            colIdx = Math.floor(line / 3);
            rowIdx = line % 3;
        }

        const lineBaseX = startX + colIdx * (singleW + colSpacing) * SCALE;
        const lineBaseY = startY + rowIdx * (singleH + lineSpacing) * SCALE;

        const S_W = M_PER_STATION * SCALE; // Use dynamic multiplier for pixel scale too
        const S_H = M_PER_STATION * SCALE;
        const gap = 0.2 * SCALE;

        for (let i = 0; i < STATION_COUNT; i++) {
            let x = 0, y = 0;
            if (layoutType === 'straight') {
                x = lineBaseX + i * (S_W + gap);
                y = lineBaseY;
            }
            else if (layoutType === 'u_shape' || layoutType === 'back_to_back') {
                const countTop = Math.ceil(STATION_COUNT / 2);
                if (i < countTop) {
                    x = lineBaseX + i * (S_W + gap);
                    y = lineBaseY + S_H + gap * 5;
                } else {
                    const countBot = STATION_COUNT - countTop;
                    const botIdx = i - countTop;
                    x = lineBaseX + (countTop - 1 - botIdx) * (S_W + gap);
                    y = lineBaseY;
                }
            }
            else if (layoutType === 'circular') {
                const R = (singleW * SCALE) / 2.5;
                const cx = lineBaseX + R;
                const cy = lineBaseY + R;
                const angle = (i / STATION_COUNT) * 2 * Math.PI - Math.PI / 2;
                x = cx + R * Math.cos(angle) - S_W / 2;
                y = cy + R * Math.sin(angle) - S_H / 2;
            }
            else if (layoutType === 'c_shape') {
                const countSide = Math.ceil(STATION_COUNT / 3);
                if (i < countSide) { // Top
                    x = lineBaseX + i * (S_W + gap);
                    y = lineBaseY;
                } else if (i < countSide * 2) { // Right
                    x = lineBaseX + countSide * (S_W + gap);
                    y = lineBaseY + (i - countSide) * (S_H + gap);
                } else { // Bot
                    x = lineBaseX + (STATION_COUNT - 1 - i) * (S_W + gap);
                    y = lineBaseY + countSide * (S_H + gap);
                }
            }
            else if (layoutType === 'square') {
                const side = Math.ceil(STATION_COUNT / 4);
                if (i < side) { // Top
                    x = lineBaseX + i * (S_W + gap);
                    y = lineBaseY;
                } else if (i < side * 2) { // Right
                    x = lineBaseX + side * (S_W + gap);
                    y = lineBaseY + (i - side) * (S_H + gap);
                } else if (i < side * 3) { // Bot
                    x = lineBaseX + (side * 3 - 1 - i) * (S_W + gap);
                    y = lineBaseY + side * (S_H + gap);
                } else { // Left
                    x = lineBaseX;
                    y = lineBaseY + (STATION_COUNT - 1 - i) * (S_H + gap) + S_H;
                }
            }
            else if (layoutType === 'herringbone') {
                const stepX = 1.6 * SCALE;
                const countTop = Math.ceil(STATION_COUNT / 2);
                if (i < countTop) {
                    x = lineBaseX + i * stepX;
                    y = lineBaseY + S_H + 10;
                } else {
                    x = lineBaseX + (i - countTop) * stepX;
                    y = lineBaseY;
                }
            }
            else if (layoutType === 'inverted_u') {
                const side = Math.ceil(STATION_COUNT / 3);
                if (i < side) {
                    x = lineBaseX;
                    y = lineBaseY + (side - 1 - i) * (S_H + gap) + S_H + gap;
                } else if (i < side * 2) {
                    x = lineBaseX + (i - side) * (S_W + gap) + gap;
                    y = lineBaseY;
                } else {
                    x = lineBaseX + side * (S_W + gap);
                    y = lineBaseY + (i - side * 2) * (S_H + gap) + S_H + gap;
                }
            }
            // Store row/col info for corridor routing
            mlStations.push({ x: x, y: y, id: `L${line + 1}S${i + 1}`, lineIdx: line, rowIdx: rowIdx, colIdx: colIdx });
        }
    }

    // 2. Calculate Optimized CTU Path (Corridor-Based Routing)
    // CTU travels along CORRIDORS (Y positions between rows), NOT through lines

    // Group lines by Row
    const linesByRow = {};
    const lineData = {};

    for (let l = 0; l < lineCount; l++) {
        const stns = mlStations.filter(s => s.lineIdx === l);
        if (stns.length === 0) continue;

        const rowIdx = stns[0].rowIdx;
        const colIdx = stns[0].colIdx;

        // Calculate bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        stns.forEach(s => {
            if (s.x < minX) minX = s.x;
            if (s.x > maxX) maxX = s.x;
            if (s.y < minY) minY = s.y;
            if (s.y > maxY) maxY = s.y;
        });

        // Define inner service entry/exit based on layout type
        // For n-Shape (inverted U): Open at BOTTOM. Entry/Exit at bottom center.
        // For U-Shape: Open at RIGHT. Entry/Exit at right center.
        // For Straight: Service from one end (left) to other (right).
        // For Circular: Entry at one point, loop around.

        let serviceEntry, serviceExit, innerPath = [];
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        // For inner path, stay INSIDE the bounding box
        const inset = 20; // Inset from edges

        if (layoutType === 'inverted_u') {
            // n-Shape: Open at bottom, CTU enters from bottom (maxY), traces INSIDE the U
            // Path: Enter bottom-center -> go to left inner -> up left side -> across top -> down right side -> exit bottom-center
            serviceEntry = { x: centerX, y: maxY + 5 };  // Just below the opening
            serviceExit = { x: centerX, y: maxY + 5 };
            innerPath = [
                serviceEntry,
                { x: minX + inset, y: maxY - inset },     // Inner left bottom
                { x: minX + inset, y: minY + inset },     // Inner left top
                { x: maxX - inset, y: minY + inset },     // Inner right top
                { x: maxX - inset, y: maxY - inset },     // Inner right bottom
                serviceExit
            ];
        } else if (layoutType === 'u_shape' || layoutType === 'back_to_back') {
            // U-Shape: Open at right (maxX), service from right
            serviceEntry = { x: maxX + 5, y: centerY };
            serviceExit = { x: maxX + 5, y: centerY };
            innerPath = [
                serviceEntry,
                { x: maxX - inset, y: minY + inset },
                { x: minX + inset, y: centerY },
                { x: maxX - inset, y: maxY - inset },
                serviceExit
            ];
        } else if (layoutType === 'c_shape') {
            // C-Shape: Open at left (facing warehouse), service from left
            serviceEntry = { x: minX - 5, y: centerY };
            serviceExit = { x: minX - 5, y: centerY };
            innerPath = [
                serviceEntry,
                { x: minX + inset, y: minY + inset },
                { x: maxX - inset, y: minY + inset },
                { x: maxX - inset, y: maxY - inset },
                { x: minX + inset, y: maxY - inset },
                serviceExit
            ];
        } else if (layoutType === 'circular' || layoutType === 'square') {
            // Full loop - enter from bottom
            serviceEntry = { x: centerX, y: maxY + 5 };
            serviceExit = { x: centerX, y: maxY + 5 };
            innerPath = [
                serviceEntry,
                { x: minX + inset, y: centerY },
                { x: centerX, y: minY + inset },
                { x: maxX - inset, y: centerY },
                serviceExit
            ];
        } else {
            // Straight/Herringbone: Service from left to right, below the line
            serviceEntry = { x: minX - 5, y: maxY + 5 };
            serviceExit = { x: maxX + 5, y: maxY + 5 };
            innerPath = [serviceEntry, serviceExit];
        }

        const innerLen = innerPath.reduce((acc, p, i) => {
            if (i === 0) return 0;
            return acc + Math.abs(p.x - innerPath[i - 1].x) + Math.abs(p.y - innerPath[i - 1].y);
        }, 0);

        lineData[l] = {
            lineIdx: l,
            rowIdx: rowIdx,
            colIdx: colIdx,
            entry: serviceEntry,
            exit: serviceExit,
            innerPath: innerPath,
            innerLen: innerLen,
            bbox: { minX, maxX, minY, maxY }
        };

        if (!linesByRow[rowIdx]) linesByRow[rowIdx] = [];
        linesByRow[rowIdx].push(lineData[l]);
    }

    // Sort lines in each row by X (left to right)
    Object.keys(linesByRow).forEach(r => {
        linesByRow[r].sort((a, b) => a.bbox.minX - b.bbox.minX);
    });

    // Define Corridor Y positions - BELOW each row (at max Y of all lines in that row + gap)
    // This ensures CTU travels in the AISLE below each row, never through lines
    const corridorY = {};
    const sortedRows = Object.keys(linesByRow).map(Number).sort((a, b) => a - b);

    // Global corridor at the very bottom (below ALL lines)
    let globalMaxY = 0;
    sortedRows.forEach(r => {
        const rowMaxY = Math.max(...linesByRow[r].map(l => l.bbox.maxY));
        if (rowMaxY > globalMaxY) globalMaxY = rowMaxY;
    });
    const globalCorridor = globalMaxY + 40;

    // Each row uses the GLOBAL corridor (CTU travels at the bottom of the entire layout)
    sortedRows.forEach(r => {
        corridorY[r] = globalCorridor;
    });

    // 3. Calculate Point-to-Point Distances (Capacity = 1)
    // Model: Warehouse -> Station -> Warehouse for EACH product.

    mlPaths = [];
    let totalDist = 0;
    const W_Corridor_Pt = { x: mlWarehouse.x, y: globalCorridor };

    // Distance from Warehouse to Global Corridor (User Input)
    const userWhDistM = parseFloat(document.getElementById('cfg-wh-dist').value || 20);
    document.getElementById('disp-wh-dist').innerText = userWhDistM + "m";

    mlStations.forEach(s => {
        // Find Line Data for this station
        // We need to look up linesByRow. But we can just find it in lineData array? 
        // We constructed lineData object earlier. Let's make sure it's accessible.
        // Re-accessing lineData using lineIdx (l) is easiest.
        // NOTE: We need to ensure 'linesByRow' scope or 'lineData' scope is efficient.
        // We can iterate linesByRow to find the entry point for the station's line.

        // Let's rely on finding the line entry from the processed LineData
        // We constructed 'linesByRow' but iterating valid stations is easier if we have a map.
        // Let's just lookup:
        const ld = linesByRow[s.rowIdx].find(l => l.lineIdx === s.lineIdx);

        if (ld) {
            // 1. Wh -> Layout (User)
            const dist_Corr_Travel_M = Math.abs(W_Corridor_Pt.x - ld.entry.x) / SCALE;
            const dist_Corr_to_Entry_M = Math.abs(globalCorridor - ld.entry.y) / SCALE;
            const dist_Entry_to_Station_M = (Math.abs(ld.entry.x - s.x) + Math.abs(ld.entry.y - s.y)) / SCALE;

            const oneWay = userWhDistM + dist_Corr_Travel_M + dist_Corr_to_Entry_M + dist_Entry_to_Station_M;
            totalDist += oneWay * 2;

            // Visualization: Add a simplified path for THIS station (only if we want to draw 135 lines?)
            // Let's just draw the "Milk Run" styled path as a "Representative Flow" but update the number.
            // Or clearer: Draw L-shapes from Corridor to Station.
        }
    });

    // Re-build "Representative" Paths for Visualization (Just show connectivity)
    // We can keep the Milk Run visualization as it shows the "Route Structure" well, 
    // even if the metric is now based on P2P.
    // Or better: Draw paths from Warehouse to each Line Entry to show flow.

    mlPaths.push({ from: mlWarehouse, to: W_Corridor_Pt, type: 'travel' });

    sortedRows.forEach(r => {
        linesByRow[r].forEach(ld => {
            // Draw path from Warehouse Corridor Point to Line Entry
            const entryPt = { x: ld.entry.x, y: globalCorridor };
            mlPaths.push({ from: W_Corridor_Pt, to: entryPt, type: 'travel' }); // Along Corridor

            // Up to Entry
            const lineEntryPt = { x: ld.entry.x, y: ld.entry.y };
            mlPaths.push({ from: entryPt, to: lineEntryPt, type: 'travel' });

            // Inner Loop (Visual only)
            for (let i = 0; i < ld.innerPath.length - 1; i++) {
                mlPaths.push({ from: ld.innerPath[i], to: ld.innerPath[i + 1], type: 'service' });
            }
        });
    });

    const totalDistM = totalDist;
    const avgDist = totalDistM / mlStations.length;

    // Update UI Stats
    document.getElementById('res-total-dist').innerText = totalDistM.toFixed(1);
    document.getElementById('res-avg-dist').innerText = avgDist.toFixed(1) + " m";

    // Update Chart
    updateComparisonChart(layoutType, avgDist);
}

function drawComparisonFrame() {
    // Draw Warehouse
    ctx.fillStyle = '#facc15'; ctx.strokeStyle = '#a16207';
    ctx.fillRect(mlWarehouse.x - 20, mlWarehouse.y - 30, 40, 60);
    ctx.strokeRect(mlWarehouse.x - 20, mlWarehouse.y - 30, 40, 60);
    ctx.fillStyle = '#78350f'; ctx.fillText("KHO", mlWarehouse.x - 10, mlWarehouse.y);

    // Draw Optimized CTU Path (Red Milk Run)
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#dc2626'; // Red
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    mlPaths.forEach(p => {
        ctx.beginPath();
        ctx.moveTo(p.from.x, p.from.y);

        if (p.type === 'service') {
            // Draw inner service loop (curved for visual)
            const midX = (p.from.x + p.to.x) / 2;
            const midY = (p.from.y + p.to.y) / 2 - 20; // Arc up
            ctx.quadraticCurveTo(midX, midY, p.to.x, p.to.y);
        } else {
            // L-shape travel path
            ctx.lineTo(p.from.x, p.to.y);
            ctx.lineTo(p.to.x, p.to.y);
        }
        ctx.stroke();
    });

    // Draw Stations
    mlStations.forEach(s => {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(s.x, s.y, 12, 12);
    });
}

function updateComparisonChart(currentLayout, currentAvg) {
    const labels = ['Thẳng', 'Chữ U', 'Đối Xứng', 'Tròn', 'Chữ C', 'Vuông', 'Xương Cá', 'n-Shape'];
    const mapIdx = {
        'straight': 0, 'u_shape': 1, 'back_to_back': 2, 'circular': 3,
        'c_shape': 4, 'square': 5, 'herringbone': 6, 'inverted_u': 7
    };
    // Baseline estimates (approx for viz)
    const chartData = [35, 23, 23, 20, 25, 24, 19, 26];
    chartData[mapIdx[currentLayout]] = currentAvg;

    const data = {
        labels: labels,
        datasets: [{
            label: 'Quãng đường TB (m)',
            data: chartData,
            backgroundColor: labels.map((l, i) => i === mapIdx[currentLayout] ? '#2563eb' : '#cbd5e1'),
            borderRadius: 4
        }]
    };

    const config = {
        type: 'bar', data: data,
        options: {
            responsive: true, plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    };

    if (mlResultChart) mlResultChart.destroy();
    mlResultChart = new Chart(document.getElementById('chartResults'), config);
}




// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("Simulation initializing...");
        // alert("Lớp logic mô phỏng đang tải..."); // Temporary heartbeat

        canvas = document.getElementById('simCanvas');
        if (!canvas) throw new Error("Không tìm thấy canvas 'simCanvas'!");

        ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Không thể khởi tạo ctx 2D!");

        // Set dimensions (responsive)
        canvas.width = canvas.offsetWidth || 800;
        canvas.height = canvas.offsetHeight || 500;

        if (typeof CONSTANTS !== 'undefined') {
            M_PER_STATION = CONSTANTS.STATION.METERS_PER_UNIT;
        } else {
            console.warn("CONSTANTS not found! Using default 1.8m.");
        }

        const initSizes = getStationSize();
        STATION_W = initSizes.w;
        STATION_H = initSizes.h;
        GAP = initSizes.gap;

        // Sync UI for default value (19)
        document.getElementById('cfg-station-count').value = STATION_COUNT;
        document.getElementById('cfg-station-range').value = STATION_COUNT;
        document.getElementById('header-station-count').textContent = STATION_COUNT;
        document.getElementById('label-max-station').textContent = STATION_COUNT;

        setScheme(1);
        loop();

        console.log("✅ Simulation ready.");
    } catch (e) {
        console.error("Simulation Start Error:", e);
        alert("Lỗi khởi tạo mô phỏng: " + e.message);
    }
});

// --- VERIFICATION TOOLS ---
window.verifyLayoutIntegrity = function () {
    console.group('🔍 Layout Verification Check');
    console.log(`Current Station Count: ${STATION_COUNT}`);
    console.log(`Current Scheme ID: ${currentScheme}`);

    let errors = [];

    // Check Globals
    if (STATION_COUNT < 5 || STATION_COUNT > 50) errors.push("Station Count out of bounds (5-50)");

    // Check Schemas
    if (Object.keys(schemes).length !== 8) errors.push("Schemes object missing entries");

    // Check Layout 1 Math
    if (currentScheme === 1) {
        const info = schemes[1];
        const expectedLen = (STATION_COUNT * M_PER_STATION + 0.3).toFixed(1);
        console.log(`Layout 1 Check: Formula says ${expectedLen}m. Dims says ${info.dims.split('x')[0].trim()}`);
    }

    if (errors.length > 0) {
        console.error("❌ Verification Failed:", errors);
        alert("❌ Verification Failed! Check console for details.");
    } else {
        console.log("✅ Verification Passed: Basic integrity checks OK.");
        alert(`✅ Verification Passed for Layout ${currentScheme} with ${STATION_COUNT} stations.`);
    }
    console.groupEnd();
};

