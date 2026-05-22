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
let ammPos = { x: 0, y: 0, progress: 0 };
const SCHEME9_STATION_COUNT = 19;

// HTML inline onclick cﾃｳ th盻・g盻絞 tr盻ｱc ti蘯ｿp cﾃ｡c function declaration bﾃｪn dﾆｰ盻嬖.
// Khﾃｴng c蘯ｧn wrap l蘯｡i qua window, n蘯ｿu khﾃｴng s蘯ｽ d盻・gﾃ｢y ﾄ黛ｻ・quy vﾃｴ h蘯｡n.

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
            "<b>Dễ triển khai:</b> Dòng vật tư đi thẳng, dễ nhìn và dễ tổ chức vận hành.",
            "<b>An toàn cao:</b> Luồng AGV phía trước và CTU phía sau tách rõ, ít giao cắt.",
            "<b>Dễ nhân rộng:</b> Phù hợp làm chuẩn so sánh cho các line tương tự."
        ],
        cons: [
            "<b>Tốn chiều dài:</b> Cần mặt bằng dài nếu số trạm tăng nhiều.",
            "<b>Quãng chạy rỗng lớn:</b> Xe quay đầu và hồi tuyến dễ phát sinh lãng phí.",
            "<b>Ít linh hoạt nhân sự:</b> Hai đầu chuyền cách xa nhau, khó hỗ trợ chéo."
        ],
        dims: "34.5m x 3.5m",
        area: "120.8",
        areaNote: "Phương án chuẩn để so sánh với các bố trí khác.",
        image: "layout1_ref.png",
        formula: "Dài = Số trạm × 1.8m | Rộng = 3.5m"
    },
    2: {
        name: "Layout Chữ U (Tiết kiệm diện tích)",
        pros: [
            "<b>Rút ngắn mặt bằng:</b> Gập chuyền lại giúp giảm chiều dài tổng thể.",
            "<b>Thuận lợi hỗ trợ chéo:</b> Đầu vào và đầu ra gần nhau hơn.",
            "<b>Tăng tốc độ tiếp liệu:</b> Quãng đường cấp phát ngắn hơn layout thẳng."
        ],
        cons: [
            "<b>Nhạy với góc cua:</b> Điểm chuyển hướng dễ trở thành nơi chậm xe.",
            "<b>Dễ nghẽn cục bộ:</b> Nếu làn trong hẹp, xử lý sự cố sẽ khó hơn.",
            "<b>Khó mở rộng:</b> Thêm trạm thường phải phá lại cấu trúc hiện có."
        ],
        dims: "19.5m x 7.0m",
        area: "136.5",
        areaNote: "Cần chừa đủ bề rộng cho xe quay và thao tác ở phần đáy chữ U.",
        image: "layout2_ref.png",
        formula: "Dài = (Số trạm / 2) × 1.8m + vùng quay | Rộng = 7.0m"
    },
    3: {
        name: "Layout Đối Xứng (Sử dụng chung lưng)",
        pros: [
            "<b>Giảm diện tích lối đi:</b> Hai dãy dùng chung khu sau lưng và đường cấp phát.",
            "<b>Tăng hiệu quả CTU:</b> Một tuyến sau có thể phục vụ đồng thời hai bên.",
            "<b>Khai thác mặt bằng tốt:</b> Phù hợp khi cần nén chiều rộng."
        ],
        cons: [
            "<b>Bảo trì khó hơn:</b> Thiết bị nằm giữa hai dãy khó tiếp cận khi sửa chữa.",
            "<b>Rủi ro lan ảnh hưởng:</b> Một sự cố giữa dãy có thể tác động cả hai bên.",
            "<b>Không gian thao tác hẹp:</b> Cần kiểm soát an toàn kỹ hơn."
        ],
        dims: "18.4m x 6.0m",
        area: "110.4",
        areaNote: "Phương án tiết kiệm diện tích tốt khi quy hoạch đường sau hợp lý.",
        image: "layout3_ref.png",
        formula: "Dài = (Số trạm / 2) × 1.8m | Rộng = 6.0m"
    },
    4: {
        name: "Layout Đấu Trường (Hình tròn / xoay)",
        pros: [
            "<b>Dòng chạy liên tục:</b> AGV đi vòng ngoài, CTU xử lý quanh tâm quay.",
            "<b>Tầm nhìn bao quát:</b> Dễ quan sát toàn bộ cụm từ một số vị trí.",
            "<b>Giảm điểm chết tuyến:</b> Không có đầu cụt như layout thẳng."
        ],
        cons: [
            "<b>Chi phí cơ khí cao:</b> Băng tải cong hoặc cụm xoay phức tạp hơn.",
            "<b>Khó mở rộng:</b> Muốn tăng trạm thường phải thay đổi toàn bộ đường kính.",
            "<b>Hiệu quả mặt bằng không cao:</b> Có khoảng rỗng ở tâm và vùng bao ngoài."
        ],
        dims: "14.5m x 14.5m",
        area: "210.3",
        areaNote: "Bố trí trực quan nhưng cần cân nhắc kỹ phần diện tích không tạo giá trị ở vùng tâm.",
        image: "layout4_ref.png",
        formula: "Đường kính ≈ (Số trạm × 1.8 / π) + chiều sâu thao tác"
    },
    5: {
        name: "Layout Chữ C (Kho bên ngoài)",
        pros: [
            "<b>Kho tách riêng:</b> Dễ mở rộng dung lượng lưu trữ mà ít ảnh hưởng khu thao tác.",
            "<b>Tuyến vào ra rõ:</b> Luồng AGV và CTU có thể tổ chức tách nhánh dễ hơn.",
            "<b>Phù hợp cấp phát theo phía:</b> Hữu ích khi kho đặt lệch một bên nhà xưởng."
        ],
        cons: [
            "<b>Tăng chiều dài kết nối:</b> Cần thêm phần giao thông nối kho vào chuyền.",
            "<b>Nhiều tuyến phải điều phối:</b> Nếu tổ chức không tốt dễ phát sinh giao cắt.",
            "<b>Trạm xa kho bất lợi:</b> Thời gian đáp ứng ở cuối cụm có thể chậm hơn."
        ],
        dims: "Cập nhật theo số trạm",
        area: "Cập nhật theo số trạm",
        areaNote: "Hiệu quả phụ thuộc mạnh vào vị trí kho và cách tổ chức các tuyến cấp phát song song.",
        image: "layout5_ref.png",
        formula: "Kích thước phụ thuộc số trạm và khoảng cách kho bên ngoài"
    },
    6: {
        name: "Layout Vuông (Vòng vuông)",
        pros: [
            "<b>Hợp nhà xưởng:</b> Dễ đặt theo cột, tường và ô lưới mặt bằng hiện hữu.",
            "<b>Chu vi rõ ràng:</b> Trạm bám theo bốn cạnh nên dễ quy hoạch làn cấp phát.",
            "<b>Dễ chia khu:</b> Có thể tách theo cạnh để cấp vật tư hoặc bảo trì."
        ],
        cons: [
            "<b>Góc cua gắt:</b> Xe phải giảm tốc ở bốn góc vuông.",
            "<b>Khó tận dụng vùng giữa:</b> Tâm vuông dễ thành khoảng trống ít giá trị.",
            "<b>Cần thiết bị đổi hướng:</b> Nếu cơ khí hóa, góc 90 độ làm tăng độ phức tạp."
        ],
        dims: "13.1m x 13.1m",
        area: "171.6",
        areaNote: "Dễ hiểu và dễ dựng, nhưng cần xử lý tốt bốn góc cua và vùng giữa.",
        image: "layout6_ref.png",
        formula: "Mỗi cạnh ≈ (Số trạm / 4) × 1.8m + vùng góc"
    },
    7: {
        name: "Layout Xương Cá",
        pros: [
            "<b>Tiết kiệm diện tích:</b> Các nhánh chéo giúp nén chiều dài rất tốt.",
            "<b>Dòng vật tư tự nhiên:</b> Giảm cảm giác gãy khúc so với nhiều góc vuông.",
            "<b>Dễ gom cấp phát:</b> Thuận lợi khi muốn dồn vật tư về sống chính."
        ],
        cons: [
            "<b>Thi công khó hơn:</b> Băng tải và kệ theo góc nghiêng phức tạp hơn bố trí thẳng.",
            "<b>Căn chỉnh khắt khe:</b> Sai số lắp đặt dễ làm mất đều khoảng cách giữa các nhánh.",
            "<b>Chi phí ban đầu cao hơn:</b> Cần gia công và tiêu chuẩn hóa cẩn thận."
        ],
        dims: "13.0m x 6.0m",
        area: "78.0",
        areaNote: "Phương án nén diện tích rất mạnh, phù hợp khi mặt bằng hẹp nhưng dài.",
        image: "layout7_ref.png",
        formula: "Dài ≈ (Số trạm / 2) × 1.3m + khoảng cách nhánh | Rộng ≈ 6.0m"
    },
    8: {
        name: "Layout Chữ U Úp",
        pros: [
            "<b>Điểm vào ra tập trung:</b> Thuận lợi cho kho hoặc AGV tiếp cận từ một phía.",
            "<b>Dòng chảy rõ:</b> Luồng đi theo ba cạnh nên dễ mô phỏng và phân khu.",
            "<b>Phù hợp góc nhà xưởng:</b> Tận dụng tốt mặt bằng có một phía tiếp cận chính."
        ],
        cons: [
            "<b>Quãng đường trong chuyền dài hơn:</b> Vật tư đi qua ba cạnh nên có thể tăng thời gian nội bộ.",
            "<b>Mở rộng hạn chế:</b> Khi số trạm tăng, hai cạnh bên dễ quá tải.",
            "<b>Cần tính kỹ vị trí đầu cuối:</b> Nếu đặt sai sẽ ảnh hưởng luồng người và xe."
        ],
        dims: "Cập nhật theo số trạm",
        area: "Cập nhật theo số trạm",
        areaNote: "Hiệu quả tốt khi cần gom đầu vào và đầu ra về cùng một phía.",
        image: "layout2_ref.png",
        formula: "Trạm phân trên ba cạnh của hình chữ U úp"
    }
};


schemes[9] = {
    name: "Đề án A - FUSER 19K Vòng 1 chiều + 4 điểm dừng + OSS",
    title: "Đề án A: FUSER 19K Vòng 1 chiều + 4 điểm dừng + OSS",
    description: "Chuyền FUSER 19 công đoạn được bố trí dạng vòng 1 chiều. AGV-CTU-AMM dùng chung đường phía trước, nhưng chỉ dừng ở 4 điểm dừng tách khỏi làn chính. OSS quản lý linh kiện thường, Cellcon/Oricon/Hancon cấp theo cụm.",
    pros: [
        "<b>Giảm quay đầu:</b> Giảm nhu cầu AMM/AGV/CTU quay 180 độ trên làn chính.",
        "<b>Giảm điểm dừng:</b> Rút từ 19 điểm cấp phát xuống còn 4 điểm dừng theo cụm.",
        "<b>Phù hợp cấp phát theo cụm:</b> Cellcon/Oricon/Hancon cấp theo điểm dừng thay vì vào từng K.",
        "<b>Gắn OSS dễ hơn:</b> Có thể quản lý khoảng 50% linh kiện thường tại cụm cấp phát.",
        "<b>Phù hợp thử nghiệm:</b> Hình học rõ ràng, dễ mô phỏng và triển khai nhanh cho chuyền FUSER."
    ],
    cons: [
        "<b>Điểm dừng nhỏ vẫn có thể gây chắn:</b> Nếu hốc dừng không đủ rộng, xe chờ hàng vẫn ảnh hưởng làn chính.",
        "<b>K10 là điểm nghẽn tự nhiên:</b> Vùng cua phải vẫn là nơi dễ dồn xe nhất của vòng.",
        "<b>Không phù hợp cấp phát từng K:</b> Nếu quay lại cấp phát riêng lẻ, làn dùng chung sẽ dễ nghẽn.",
        "<b>Cần tính toán vận hành:</b> Phải tính tần suất cấp, vùng đệm tại điểm dừng và thời gian chờ xe.",
        "<b>OSS chưa xác nhận lắp đúng:</b> OSS tốt cho quản lý linh kiện nhưng chưa thay thế kiểm soát lắp ráp."
    ],
    dims: "17.8m x 10.8m",
    area: "192.2",
    areaNote: "Hốc dừng được tách khỏi làn chính để giữ dòng xe 1 chiều liên tục quanh chuyền.",
    image: "assets/reference/layout9_reference_main.png",
    formula: "Bố trí cố định 19K dạng vòng 1 chiều với 4 điểm dừng tách khỏi làn chính.",
    metrics: [
        ["Số K", "19"],
        ["Số điểm dừng", "4"],
        ["Số điểm dừng xe chính", "4"],
        ["Hướng xe", "1 chiều"],
        ["Có quay 180 trên làn chính", "Không"],
        ["Mức rủi ro nghẽn", "Trung bình thấp nếu điểm dừng đủ rộng"],
        ["Mức phù hợp thử nghiệm", "Cao"]
    ]
};

schemes[10] = {
    name: "Đề án B - Bố trí 4 cụm cấp phát + OSS theo rủi ro",
    title: "Đề án B: Bố trí 4 cụm cấp phát + OSS theo rủi ro",
    description: "19 công đoạn FUSER được chia thành 4 cụm theo tải cấp phát và rủi ro thao tác. Mỗi cụm có điểm dừng riêng, vùng OSS cho linh kiện thường, vùng Cellcon/Oricon/Hancon và vùng đệm. OSS chỉ dùng cho linh kiện hoặc công đoạn rủi ro cao thay vì lắp đại trà.",
    pros: [
        "<b>Giảm điểm cấp phát:</b> Gom 19 công đoạn thành 4 cụm logistics để cấp phát theo nhóm.",
        "<b>Phù hợp tỷ lệ linh kiện:</b> Tách rõ nhóm Oricon/Hancon/Cellcon và nhóm linh kiện thường có OSS.",
        "<b>Triển khai từng phần:</b> Có thể triển khai theo từng cụm mà không phải thay đổi toàn line ngay.",
        "<b>Kiểm soát thao tác rủi ro:</b> Cho phép đặt đèn chỉ thị, bộ đếm, cân và camera đúng nơi cần thiết.",
        "<b>Khu cấp phát theo cụm rõ ràng:</b> Điểm dừng, hàng rỗng, vùng đệm và OSS được chuẩn hóa theo từng cụm."
    ],
    cons: [
        "<b>Nguy cơ lệch tải:</b> Nếu chia cụm không đúng, luồng logistics sẽ mất cân bằng.",
        "<b>Chi phí OSS tăng:</b> Quá nhiều cảm biến hoặc camera sẽ làm vận hành phức tạp hơn.",
        "<b>OSS chưa thay xác nhận lắp:</b> Chỉ kiểm soát hành động lấy chứ chưa đảm bảo lắp đúng 100%.",
        "<b>Cần cơ chế ngoại lệ:</b> Phải có thao tác thử lại, quay lui, mở khóa trưởng nhóm và phục hồi tay.",
        "<b>Diện tích có thể phình:</b> Nếu không giới hạn WIP, mini supermarket sẽ ăn thêm diện tích."
    ],
    dims: "18.2m x 11.4m",
    area: "207.5",
    areaNote: "Bố trí này tập trung vào cụm vận hành và kiểm soát rủi ro hơn là chỉ tối ưu hình học.",
    image: "assets/reference/layout10_reference_main.png",
    formula: "4 cụm cấp phát + 4 điểm dừng + OSS theo rủi ro + vùng đệm và hàng rỗng cho từng cụm.",
    metrics: [
        ["Số K", "19"],
        ["Số cụm", "4"],
        ["Số điểm dừng", "4"],
        ["Nhóm linh kiện", "Oricon/Hancon/Cellcon 50%, linh kiện thường 50%"],
        ["Chiến lược OSS", "Theo rủi ro"],
        ["Điểm mạnh", "Kiểm soát thao tác"],
        ["Mức phù hợp triển khai từng phần", "Cao"]
    ]
};

schemes[11] = {
    name: "Đề án C - Hai chuyền chung đường giữa + Cụm Cellcon phân tán",
    title: "Đề án C: Hai chuyền chung đường giữa + Cụm Cellcon phân tán",
    description: "Hai chuyền cạnh nhau dùng chung một đường AGV-CTU-AMM ở giữa. Cụm Cellcon được phân tán theo từng khu phục vụ thay vì gom ở một đầu. Oricon/Hancon được đưa tới cụm, sau đó Cellcon nhỏ cấp ra chuyền. Mỗi cụm có hốc dừng riêng cho FUSER và chuyền khác, làn chính không dừng.",
    pros: [
        "<b>Giảm diện tích vận chuyển:</b> Hai chuyền dùng chung một đường giữa thay vì tách đôi đường cấp phát.",
        "<b>Giảm Oricon lớn tại chuyền:</b> Chỉ đưa Cellcon nhỏ vào khu thao tác, giúp mặt bằng gọn hơn.",
        "<b>Phù hợp mở rộng dài hạn:</b> Dễ nhân rộng sang chuyền hoặc cụm mới mà không phải thay đổi triết lý cấp phát.",
        "<b>Cụm phân tán giảm quãng đường AMM:</b> Không cần kéo Cellcon từ một đầu chuyền đi khắp hệ thống.",
        "<b>Tách rõ dòng vật tư:</b> Thùng đầy, hàng rỗng, Cellcon, OSS và vùng đệm được phân vai rõ ràng."
    ],
    cons: [
        "<b>Điều phối phức tạp hơn:</b> AGV-CTU-AMM cùng phục vụ 2 chuyền nên luật ưu tiên phải chặt chẽ.",
        "<b>Đường chung là điểm ảnh hưởng lớn:</b> Nếu xe lỗi trên làn giữa, cả hai chuyền đều có thể bị tác động.",
        "<b>Hốc dừng phải đủ rộng:</b> Nếu hốc dừng hẹp, xe dừng vẫn có thể lấn vào làn chính.",
        "<b>Cần luật ưu tiên gọi hàng:</b> Khi hai chuyền gọi cùng lúc, phải ưu tiên theo mức vùng đệm thấp hơn.",
        "<b>AMM có thể quá tải:</b> Nếu cấp từng Cellcon lẻ, cần gom theo cụm hoặc tăng số Cellcon mỗi chuyến."
    ],
    dims: "20.4m x 11.8m",
    area: "240.7",
    areaNote: "Bố trí 2 chuyền song song với đường giữa dùng chung giúp nén diện tích dài hạn tốt hơn nhưng đổi lại cần luật điều phối rõ ràng.",
    image: "assets/reference/layout11_reference_main.png",
    formula: "2 chuyền song song + 1 đường giữa 1 chiều + 4 cụm Cellcon phân tán, mỗi cụm có hốc dừng trên / dưới riêng.",
    metrics: [
        ["Số chuyền", "2"],
        ["FUSER K", "19"],
        ["UNIT khác", "15 giả lập"],
        ["Số cụm phân tán", "4"],
        ["Đường vận chuyển", "Đường chung 1 chiều"],
        ["Điểm dừng chính", "8 hốc dừng"],
        ["Rủi ro nghẽn", "Cao nếu không có hốc dừng, trung bình nếu có hốc dừng"],
        ["Tiềm năng giảm diện tích dài hạn", "Rất cao"],
        ["Mức phức tạp triển khai", "Cao"]
    ]
};

function setScheme(id) {
    currentScheme = id;

    // Update UI buttons
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach(i => {
        const btn = document.getElementById(`btn-${i}`);
        if (i === id) {
            btn.classList.add('active', 'bg-blue-600', 'text-white');
            btn.classList.remove('bg-gray-100', 'text-gray-900', 'bg-pink-100', 'bg-purple-100', 'bg-yellow-100', 'bg-green-100', 'bg-orange-100', 'bg-cyan-100', 'bg-rose-100', 'bg-emerald-100', 'text-pink-900', 'text-purple-900', 'text-yellow-900', 'text-green-900', 'text-orange-900', 'text-cyan-900', 'text-rose-900', 'text-emerald-900');
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
            } else if (i === 9) {
                btn.classList.add('bg-cyan-100', 'text-cyan-900');
            } else if (i === 10) {
                btn.classList.add('bg-rose-100', 'text-rose-900');
            } else if (i === 11) {
                btn.classList.add('bg-emerald-100', 'text-emerald-900');
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
        formula = `Dài = ${STATION_COUNT} station × 1.8m = ${length.toFixed(1)}m | Rộng = 3.5m`;
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

    if (id === 9) { // FUSER loop 19K + 4 dock + OSS
        length = 17.8;
        width = 10.8;
        formula = 'Bố trí cố định 19K dạng vòng 1 chiều với 4 điểm dừng tách khỏi làn chính.';
    } else if (id === 10) { // 4 cell docking + risk-based OSS
        length = 18.2;
        width = 11.4;
        formula = '4 cụm cấp phát với điểm dừng riêng, OSS theo rủi ro, khu hàng rỗng và vùng đệm theo cụm.';
    } else if (id === 11) { // Dual-line shared road + distributed hub
        length = 20.4;
        width = 11.8;
        formula = '2 chuyền song song + 1 đường giữa 1 chiều + 4 cụm phân tán, mỗi cụm có hốc dừng trên / dưới riêng.';
    }

    area = length * width;
    info.dims = `${length.toFixed(1)}m x ${width.toFixed(1)}m`;
    info.area = area.toFixed(1);
    info.formula = formula;

        let html = `
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
                        *Thông số cơ bản: 1 Station = 1.8m x 2.3m, Gap = 0.2m (được điều chỉnh theo thực tế 19 trạm)
                    </p>
                    ${info.areaNote ? `<p class="text-sm text-green-700 font-semibold mt-2">💡 ${info.areaNote}</p>` : ''}
                </div>
            `;
    if (info.description) {
        const metricsHtml = Array.isArray(info.metrics) ? `
                <div class="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h3 class="font-bold text-slate-800 mb-3">Chỉ số mô phỏng</h3>
                    <div class="grid grid-cols-1 gap-2 text-sm">
                        ${info.metrics.map(([label, value]) => `<div class="flex items-start justify-between gap-3"><span class="text-slate-500">${label}</span><span class="font-semibold text-slate-800 text-right">${value}</span></div>`).join('')}
                    </div>
                </div>
        ` : '';
        html = `
                <div class="mb-4">
                    <h3 class="text-base font-bold text-slate-900">${info.title || info.name}</h3>
                    <p class="mt-2 text-sm text-slate-600">${info.description}</p>
                </div>
        ` + metricsHtml + html;
    }
    document.getElementById('analysis-content').innerHTML = html;

    // Reset Animation
    agvPos.progress = 0;
    ctuPos.progress = 0;
    ammPos.progress = 0;

    // Update Reference Image
    document.getElementById('ref-image').src = info.image || 'layout1_ref.png';
    const captionEl = document.getElementById('ref-image-caption');
    if (captionEl) {
        if (id === 9) {
            captionEl.textContent = "Minh họa concept Đề án A: FUSER loop 1 chiều, 4 dock cấp phát, OSS và Cellcon theo cụm.";
        } else if (id === 10) {
            captionEl.textContent = "Minh họa concept Đề án B: 4 cell cấp phát, OSS theo mức rủi ro, Oricon/Hancon/Cellcon tách vùng.";
        } else if (id === 11) {
            captionEl.textContent = "Minh họa concept Đề án C: hai chuyền dùng chung đường giữa, Cellcon hub phân tán, pocket hai bên.";
        } else {
            captionEl.textContent = "Hình ảnh minh họa ý tưởng layout trong thực tế";
        }
    }

    // Show/Hide 3D Button for layouts that have dedicated 3D pages
    const view3dContainer = document.getElementById('view-3d-container');
    if (id === 3 || id === 4 || id === 5 || id === 6 || id === 7 || id === 9 || id === 10 || id === 11) {
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
    } else if (currentScheme === 9) {
        window.open('layout9_3d_simulation.html' + urlParams, '_blank');
    } else if (currentScheme === 10) {
        window.open('layout10_3d_simulation.html' + urlParams, '_blank');
    } else if (currentScheme === 11) {
        window.open('layout11_3d_simulation.html' + urlParams, '_blank');
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

    // 2. Bﾃn Thao Tﾃ｡c (Work Table) - Dark Blue, top section
    // Takes up about 1/3 of height at top
    const tableHeight = STATION_H * 0.35;
    ctx.fillStyle = "#1e3a8a"; // Blue-900 (Dark blue like Excel)
    ctx.fillRect(x + 1, y + 1, STATION_W - 2, tableHeight);
    ctx.strokeStyle = "#1e40af";
    ctx.strokeRect(x + 1, y + 1, STATION_W - 2, tableHeight);

    // 3. Giﾃ｡ ﾄ雪ｻｱng Thﾃｹng Oricon (Oricon Rack) - Blue vertical strips on BOTH sides
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

function drawRoundedRectPath(x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}


function drawVehicleBox(x, y, color, label) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1.5;
    drawRoundedRectPath(x - 12, y - 8, 24, 16, 4);
    ctx.fill();
    ctx.stroke();
    if (label) {
        ctx.fillStyle = "#111827";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, x, y - 14);
    }
    ctx.restore();
}

function drawArrowHead(x, y, angle, color, size = 7) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, size * 0.55);
    ctx.lineTo(-size, -size * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawOneWayArrowMarkers(pathPoints, color) {
    for (let i = 0; i < pathPoints.length - 1; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        drawArrowHead(mx, my, angle, color, 8);
    }
}

function drawRectLabel(x, y, w, h, fill, stroke, label, textColor = "#111827") {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    drawRoundedRectPath(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();
    if (label) {
        ctx.fillStyle = textColor;
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x + w / 2, y + h / 2);
    }
    ctx.restore();
}

function drawLayout9Station(x, y, label, rotation = 0) {
    ctx.save();
    if (rotation !== 0) {
        ctx.translate(x + STATION_W / 2, y + STATION_H / 2);
        ctx.rotate(rotation);
        ctx.translate(-(x + STATION_W / 2), -(y + STATION_H / 2));
    }
    // 1. Khung station (xanh lá nhạt, viền đậm)
    ctx.fillStyle = "#e2f0d9"; // Light green
    ctx.strokeStyle = "#385723"; // Dark green border
    ctx.lineWidth = 1.5;
    drawRoundedRectPath(x, y, STATION_W, STATION_H, 6);
    ctx.fill();
    ctx.stroke();

    // 2. Bàn thao tác / workbench (xám nhạt)
    ctx.fillStyle = "#f3f4f6";
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.fillRect(x + 4, y + 4, STATION_W - 8, 12);
    ctx.strokeRect(x + 4, y + 4, STATION_W - 8, 12);

    // 3. Người thao tác / operator (icon tròn xanh cyan/teal)
    ctx.fillStyle = "#06b6d4";
    ctx.strokeStyle = "#0891b2";
    ctx.beginPath();
    ctx.arc(x + STATION_W / 2, y + STATION_H - 8, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. Vùng nhận linh kiện nhỏ (màu tím/cyan)
    ctx.fillStyle = "#c7d2fe"; // Indigo-200
    ctx.fillRect(x + 5, y + 20, 6, 6);

    // 5. Khay/Tray Cellcon (vàng)
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x + STATION_W - 11, y + 20, 6, 6);

    // 6. Label K (bold green text)
    ctx.fillStyle = "#065f46";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + STATION_W / 2, y + 10);
    ctx.restore();
}

function drawCompactStation(x, y, w, h, label, fill, stroke, textColor = "#0f172a") {
    ctx.save();
    // 1. Khung station
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    drawRoundedRectPath(x, y, w, h, 4);
    ctx.fill();
    ctx.stroke();

    // 2. Bàn thao tác / workbench
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(x + 2, y + 2, w - 4, 8);

    // 3. Người thao tác / operator (icon tròn xanh)
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h - 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // 4. Label
    ctx.fillStyle = textColor;
    ctx.font = "bold 7px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + 6);
    ctx.restore();
}

function drawDockCluster(cfg) {
    const { x, y, w, h, dockLabel, clusterLabel } = cfg;
    
    // 1. Pocket/hốc dừng lệch làn chính (cam nhạt, viền nét đứt cam đậm)
    ctx.save();
    ctx.fillStyle = "#fff7ed"; // Orange-50
    ctx.strokeStyle = "#ea580c"; // Orange-600
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    drawRoundedRectPath(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.save();
    // Tiêu đề hốc dừng
    ctx.fillStyle = "#c2410c";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`${dockLabel} (${clusterLabel})`, x + 8, y + 6);

    // Hàng trên: OSS, ĐỆM, RỖNG
    // OSS (Tím nhạt)
    drawRectLabel(x + 8, y + 18, 48, 16, "#f3e8ff", "#a855f7", "OSS", "#6b21a8");
    // ĐỆM/Buffer (Xanh mint)
    drawRectLabel(x + 60, y + 18, 44, 16, "#d1fae5", "#059669", "ĐỆM", "#065f46");
    // RỖNG/Empty return (Xám)
    drawRectLabel(x + 108, y + 18, 50, 16, "#f3f4f6", "#6b7280", "Rỗng", "#374151");

    // Hàng dưới: Ô Cellcon, ORI/HAN
    // 5 ô Cellcon (vàng)
    for (let i = 0; i < 5; i++) {
        drawRectLabel(x + 8 + i * 14, y + 38, 11, 11, "#fef9c3", "#ca8a04", "");
    }
    // ORI rack (xanh dương nhạt)
    drawRectLabel(x + 82, y + 38, 38, 16, "#dbeafe", "#3b82f6", "ORI", "#1e40af");
    // HAN rack (cyan nhạt)
    drawRectLabel(x + 124, y + 38, 34, 16, "#ecfeff", "#06b6d4", "HAN", "#0891b2");

    ctx.restore();
}

function drawDistributedCellconHub(cfg) {
    const { x, y, w, h, name, serves } = cfg;
    const innerX = x + 8;
    const innerW = w - 16;
    const smallGap = 6;
    const smallW = Math.floor((innerW - smallGap * 2) / 3);
    ctx.save();
    // Khung Hub phân tán (vàng cam nhạt)
    ctx.fillStyle = "#fffbeb";
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 1.6;
    drawRoundedRectPath(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();

    // Tiêu đề
    ctx.fillStyle = "#78350f";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(name, x + w / 2, y + 8);
    ctx.font = "8px sans-serif";
    ctx.fillStyle = "#4b5563";
    ctx.fillText(serves, x + w / 2, y + 22);

    // Giá đầu vào ORI/HAN
    drawRectLabel(innerX, y + 34, innerW, 16, "#dbeafe", "#3b82f6", "Đầu vào ORI/HAN", "#1e40af");

    // Racks: OSS, ĐỆM, RỖNG
    drawRectLabel(innerX, y + 54, smallW, 16, "#f3e8ff", "#a855f7", "OSS", "#6b21a8");
    drawRectLabel(innerX + smallW + smallGap, y + 54, smallW, 16, "#d1fae5", "#059669", "ĐỆM", "#065f46");
    drawRectLabel(innerX + (smallW + smallGap) * 2, y + 54, smallW, 16, "#f3f4f6", "#6b7280", "Rỗng", "#374151");

    // Ô Cellcon (vàng)
    for (let i = 0; i < 6; i++) {
        drawRectLabel(innerX + i * 18, y + 74, 13, 13, "#fef9c3", "#ca8a04", "");
    }

    // Mũi tên luồng
    ctx.strokeStyle = "#ea580c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(innerX + 4, y + 96);
    ctx.lineTo(x + w - 12, y + 96);
    ctx.stroke();
    drawArrowHead(x + w - 16, y + 96, 0, "#ea580c", 6);

    ctx.fillStyle = "#ea580c";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ORI/HAN → Cellcon → Line", x + w / 2, y + 108);
    
    ctx.restore();
}

function drawCanvasLegend(items, x, y, width = 190) {
    const height = 34 + items.length * 16 + 12;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    drawRoundedRectPath(x, y, width, height, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("CHÚ GIẢI", x + 12, y + 16);
    items.forEach((item, index) => {
        const itemY = y + 34 + index * 16;
        ctx.fillStyle = item.color;
        ctx.fillRect(x + 12, itemY - 8, 14, 10);
        ctx.strokeStyle = item.stroke || item.color;
        ctx.strokeRect(x + 12, itemY - 8, 14, 10);
        ctx.fillStyle = "#334155";
        ctx.font = "10px sans-serif";
        ctx.fillText(item.label, x + 34, itemY);
    });
    ctx.restore();
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

    // NEW DESIGN: Parallel ramps at same angle (~0・ゑｽｰ) pointing to warehouse
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
    ctx.fillText("RA", (outBridgeStart.x + outBridgeEnd.x) / 2, (outBridgeStart.y + outBridgeEnd.y) / 2 - 10);

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
    ctx.fillText("VÀO", (inBridgeStart.x + inBridgeEnd.x) / 2, (inBridgeStart.y + inBridgeEnd.y) / 2 + 18);

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

    // CTU: FULL 360ﾂｰ Circle + Trip to/from Warehouse via parallel ramps
    const ctuData = [];
    // Part 1: Start at warehouse (OUT side)
    ctuData.push({ x: warehouseX, y: warehouseY - 15 });
    ctuData.push(outBridgeEnd);
    ctuData.push(outBridgeStart);

    // Part 2: FULL 360ﾂｰ circle (all stations)
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

// Layout 5: TRUE C-SHAPE - Cﾃ｡c 2 track ﾄ黛ｺｷt 盻・cﾃｹng trﾃｪn (khﾃｴng kﾃｭn)
// Layout 5: Layout Ch盻ｯ C (Kho Bﾃｪn Ngoﾃi) - Parallel Connections
// C蘯｣ AGV vﾃ CTU ﾄ黛ｺｷt 盻・t蘯｡i 2 ﾄ黛ｺｧu ch盻ｯ C v盻・kho - khﾃｴng ﾄ訴 qua gi盻ｯa
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
    // AGV VﾃO
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

    // CTU VﾃO
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
    // Herringbone/Xﾆｰﾆ｡ng Cﾃ｡ Layout - Stations at 45ﾂｰ angles
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
    // Draw Top Row Stations (countTop stations, angled -45ﾂｰ like \)
    // Position stations at topY (above CTU), offset outward for symmetry
    for (let i = 0; i < countTop; i++) {
        const x = startX + i * spacing;
        const y = topY - 10; // Move UP (away from CTU)
        drawStation(x, y, `S${i + 1}`, -Math.PI / 4); // -45ﾂｰ angle
        stationPoints.push({ x: x + STATION_W / 2, y: y + STATION_H / 2 });
    }

    // Draw Bottom Row Stations (countBot stations, angled +45ﾂｰ like /)
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


function drawScheme9() {
    // Layout 9: FUSER 19K loop 1 chiều + 4 dock + OSS
    const startX = 166;
    const topY = 120;
    const bottomY = 326;
    const spacing = 58;
    const roadTop = 92;
    const roadBottom = 432;
    const roadLeft = 130;
    const roadRight = 732;

    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Đề án A - FUSER 19K Vòng 1 chiều + 4 điểm dừng + OSS", 32, 34);
    ctx.restore();

    drawRectLabel(30, 68, 80, 42, "#fcd34d", "#d97706", "KHO", "#78350f");

    const roadPath = [
        { x: roadLeft, y: roadTop },
        { x: roadRight, y: roadTop },
        { x: roadRight, y: roadBottom },
        { x: roadLeft, y: roadBottom },
        { x: roadLeft, y: roadTop }
    ];
    drawPath(roadPath, "#93c5fd", 22);
    drawPath(roadPath, "#1d4ed8", 3, true);
    drawOneWayArrowMarkers(roadPath, "#1d4ed8");
    ctx.save();
    ctx.fillStyle = "#1e40af";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Làn chung AGV / CTU / AMM chạy 1 chiều", roadLeft + 182, roadTop - 14);
    ctx.restore();

    const stationPoints = [];
    for (let i = 0; i < 9; i++) {
        const x = startX + i * spacing;
        drawLayout9Station(x, topY, `K${i + 1}`);
        stationPoints.push({ x: x + STATION_W / 2, y: topY + STATION_H / 2 });
    }

    const k10X = startX + 9 * spacing - 6;
    const k10Y = 212;
    drawLayout9Station(k10X, k10Y, "K10", Math.PI / 2);
    stationPoints.push({ x: k10X + STATION_W / 2, y: k10Y + STATION_H / 2 });

    const bottomStartX = startX + 8 * spacing;
    for (let i = 0; i < 9; i++) {
        const x = bottomStartX - i * spacing;
        drawLayout9Station(x, bottomY, `K${11 + i}`, Math.PI);
        stationPoints.push({ x: x + STATION_W / 2, y: bottomY + STATION_H / 2 });
    }

    ctx.save();
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(stationPoints[0].x, stationPoints[0].y);
    for (let i = 1; i < stationPoints.length; i++) {
        ctx.lineTo(stationPoints[i].x, stationPoints[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < stationPoints.length - 1; i++) {
        const p1 = stationPoints[i];
        const p2 = stationPoints[i + 1];
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const px = p1.x + (p2.x - p1.x) * 0.55;
        const py = p1.y + (p2.y - p1.y) * 0.55;
        drawArrowHead(px, py, angle, "#f97316", 6);
    }
    ctx.restore();

    const noStopX = roadRight - 88;
    const noStopY = 152;
    ctx.save();
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    drawRoundedRectPath(noStopX, noStopY, 80, 170, 18);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#b91c1c";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("KHÔNG DỪNG", noStopX + 40, noStopY + 74);
    ctx.fillText("TẠI CUA", noStopX + 40, noStopY + 88);
    ctx.fillText("Không cấp phát", noStopX + 40, noStopY + 110);
    ctx.fillText("tại cua K10", noStopX + 40, noStopY + 124);
    ctx.restore();

    const docks = [
        { x: 166, y: 186, w: 166, h: 70, dockLabel: "Điểm dừng A", clusterLabel: "K1-K5" },
        { x: 446, y: 186, w: 166, h: 70, dockLabel: "Điểm dừng B", clusterLabel: "K6-K10" },
        { x: 446, y: 282, w: 166, h: 70, dockLabel: "Điểm dừng C", clusterLabel: "K11-K15" },
        { x: 166, y: 282, w: 166, h: 70, dockLabel: "Điểm dừng D", clusterLabel: "K16-K19" }
    ];
    docks.forEach(drawDockCluster);

    drawCanvasLegend([
        { color: "#d1fae5", stroke: "#059669", label: "Trạm K" },
        { color: "#fed7aa", stroke: "#f97316", label: "Hốc dừng" },
        { color: "#e9d5ff", stroke: "#a855f7", label: "OSS và đệm" },
        { color: "#bfdbfe", stroke: "#3b82f6", label: "Giá ORI/HAN" },
        { color: "#fde68a", stroke: "#eab308", label: "Ô Cellcon" },
        { color: "#93c5fd", stroke: "#1d4ed8", label: "Làn 1 chiều" }
    ], 18, 344, 148);

    drawVehicleBox(138, 96, "#fb923c", "AMM");

    const sharedLoop = [
        { x: roadLeft, y: roadTop },
        { x: roadRight, y: roadTop },
        { x: roadRight, y: roadBottom },
        { x: roadLeft, y: roadBottom },
        { x: roadLeft, y: roadTop }
    ];

    return {
        agv: sharedLoop,
        ctu: sharedLoop,
        amm: sharedLoop,
        vehicleStyle: "box",
        vehicleOffsets: { ctu: 0.22, amm: 0.48 },
        hideVehicleLabels: true
    };
}

function drawCellBoundary(cell) {
    ctx.save();
    ctx.strokeStyle = cell.border;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    drawRoundedRectPath(cell.x, cell.y, cell.w, cell.h, 14);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = cell.fill;
    drawRoundedRectPath(cell.x, cell.y, cell.w, cell.h, 14);
    ctx.globalAlpha = 0.16;
    ctx.fill();
    ctx.restore();
}

function drawDockPocket(x, y, w, h, label) {
    drawRectLabel(x, y, w, h, "#fed7aa", "#f97316", label, "#9a3412");
}

function drawOssZone(x, y, w, h, riskLevel = "", options = {}) {
    const { subtitle = true } = options;
    drawRectLabel(x, y, w, h, "#ede9fe", "#a855f7", "OSS", "#6b21a8");
    if (!subtitle || !riskLevel) return;
    ctx.save();
    ctx.fillStyle = "#7c3aed";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Đèn chỉ thị", x + 6, y + h + 12);
    ctx.fillText(riskLevel, x + 6, y + h + 24);
    ctx.restore();
}

function drawCellconSlots(x, y, count) {
    for (let i = 0; i < count; i++) {
        drawRectLabel(x + i * 18, y, 14, 14, "#fde68a", "#eab308", "");
    }
}

function drawRiskMarker(x, y, label, fill) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y + 0.5);
    ctx.restore();
}

function drawBufferZone(x, y, w, h, label = "ĐỆM") {
    drawRectLabel(x, y, w, h, "#dbeafe", "#60a5fa", label, "#1d4ed8");
}

function drawScheme10() {
    // Layout 10: 4 cell docking + risk-based OSS
    const roadY = 424;
    const roadLeft = 96;
    const roadRight = 734;
    const cells = [
        {
            name: "Cụm A",
            subline: "K1-K5 | OSS mức cao",
            ks: ["K1", "K2", "K3", "K4", "K5"],
            x: 62, y: 72, w: 320, h: 142,
            border: "#ef4444", fill: "#fee2e2",
            dock: "Điểm dừng A", status: "Thử lại"
        },
        {
            name: "Cụm B",
            subline: "K6-K10 | ORI/HAN / Cellcon",
            ks: ["K6", "K7", "K8", "K9", "K10"],
            x: 412, y: 72, w: 320, h: 142,
            border: "#f59e0b", fill: "#fef3c7",
            dock: "Điểm dừng B", status: "Bộ đếm"
        },
        {
            name: "Cụm C",
            subline: "K11-K15 | Sẵn sàng AMM",
            ks: ["K11", "K12", "K13", "K14", "K15"],
            x: 62, y: 230, w: 320, h: 142,
            border: "#8b5cf6", fill: "#f3e8ff",
            dock: "Điểm dừng C", status: "Camera"
        },
        {
            name: "Cụm D",
            subline: "K16-K19 | Hoàn thiện / WIP",
            ks: ["K16", "K17", "K18", "K19"],
            x: 412, y: 230, w: 320, h: 142,
            border: "#14b8a6", fill: "#ccfbf1",
            dock: "Điểm dừng D", status: "Kiểm tra"
        }
    ];

    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Đề án B - Bố trí 4 cụm cấp phát + OSS theo rủi ro", 28, 34);
    ctx.restore();

    drawRectLabel(24, 58, 78, 44, "#fcd34d", "#d97706", "KHO", "#78350f");

    const sharedRoad = [
        { x: roadLeft, y: roadY },
        { x: roadRight, y: roadY }
    ];
    drawPath(sharedRoad, "#93c5fd", 28);
    drawPath(sharedRoad, "#1d4ed8", 3, true);
    drawArrowHead(260, roadY, 0, "#1d4ed8", 8);
    drawArrowHead(490, roadY, 0, "#1d4ed8", 8);
    drawArrowHead(670, roadY, 0, "#1d4ed8", 8);

    cells.forEach((cell, cellIdx) => {
        drawCellBoundary(cell);

        ctx.save();
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(cell.name, cell.x + 10, cell.y + 18);
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "#475569";
        ctx.fillText(cell.subline, cell.x + 10, cell.y + 34);
        ctx.restore();
        drawRectLabel(cell.x + cell.w - 84, cell.y + 10, 72, 18, "#ffffff", cell.border, cell.status, "#334155");

        cell.ks.forEach((k, idx) => {
            const stationX = cell.x + 14 + idx * 58;
            const stationY = cell.y + 50;
            drawLayout9Station(stationX, stationY, k);
        });

        drawDockPocket(cell.x + 12, cell.y + 102, 82, 20, cell.dock);
        drawRectLabel(cell.x + 102, cell.y + 102, 64, 20, "#bfdbfe", "#3b82f6", "ORI/HAN", "#1e3a8a");
        drawRectLabel(cell.x + 174, cell.y + 102, 72, 20, "#d1d5db", "#6b7280", "RỖNG", "#374151");
        drawBufferZone(cell.x + 254, cell.y + 102, 52, 20, "ĐỆM");
        drawOssZone(cell.x + 12, cell.y + 126, 56, 16, "", { subtitle: false });
        drawCellconSlots(cell.x + 76, cell.y + 127, cellIdx === 3 ? 4 : 5);

        if (cellIdx === 0) {
            drawRiskMarker(cell.x + 278, cell.y + 64, "R1", "#ef4444");
            drawRiskMarker(cell.x + 306, cell.y + 90, "R1", "#ef4444");
            drawRectLabel(cell.x + 176, cell.y + 126, 128, 16, "#fef2f2", "#ef4444", "Thử lại / Lui / Mở khóa", "#991b1b");
        } else if (cellIdx === 1) {
            drawRiskMarker(cell.x + 278, cell.y + 64, "R2", "#f97316");
            drawRiskMarker(cell.x + 306, cell.y + 90, "R1", "#ef4444");
            drawRectLabel(cell.x + 188, cell.y + 126, 116, 16, "#fff7ed", "#f97316", "Bộ đếm / Cân", "#9a3412");
        } else if (cellIdx === 2) {
            drawRiskMarker(cell.x + 278, cell.y + 64, "R3", "#8b5cf6");
            drawRiskMarker(cell.x + 306, cell.y + 90, "R2", "#f97316");
            drawRectLabel(cell.x + 176, cell.y + 126, 128, 16, "#faf5ff", "#8b5cf6", "Hình ảnh / Sẵn sàng AMM", "#6b21a8");
            drawVehicleBox(cell.x + 278, cell.y + 118, "#fb923c", "AMM");
        } else {
            drawRiskMarker(cell.x + 278, cell.y + 64, "R4", "#9ca3af");
            drawRiskMarker(cell.x + 306, cell.y + 90, "R3", "#8b5cf6");
            drawRectLabel(cell.x + 222, cell.y + 74, 82, 18, "#e0f2fe", "#0284c7", "KIỂM TRA", "#0f172a");
            drawRectLabel(cell.x + 192, cell.y + 126, 112, 16, "#ecfeff", "#14b8a6", "Mở khóa trưởng nhóm", "#115e59");
        }
    });

    ctx.save();
    ctx.fillStyle = "#1e40af";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Đường chung AGV-CTU-AMM chạy 1 chiều", roadLeft, roadY - 22);
    ctx.fillText("Chỉ dừng ở điểm dừng | OSS theo mức rủi ro từng cụm", roadLeft, roadY - 8);
    ctx.restore();

    drawCanvasLegend([
        { color: "#fed7aa", stroke: "#f97316", label: "Hốc dừng xe" },
        { color: "#ede9fe", stroke: "#a855f7", label: "Vùng OSS" },
        { color: "#fde68a", stroke: "#eab308", label: "Ô Cellcon" },
        { color: "#bfdbfe", stroke: "#3b82f6", label: "Giá Oricon/Hancon" },
        { color: "#dbeafe", stroke: "#60a5fa", label: "Đệm và hàng rỗng" },
        { color: "#ef4444", stroke: "#ef4444", label: "Mốc rủi ro R1-R4" }
    ], 540, 344, 188);

    return {
        agv: [
            { x: roadLeft, y: roadY },
            { x: roadRight, y: roadY }
        ],
        ctu: [
            { x: roadLeft + 30, y: roadY },
            { x: roadRight - 20, y: roadY }
        ],
        amm: [
            { x: 560, y: roadY },
            { x: 620, y: roadY },
            { x: 620, y: 338 },
            { x: 560, y: 338 },
            { x: 560, y: roadY }
        ],
        vehicleStyle: "box",
        vehicleOffsets: { ctu: 0.14, amm: 0.42 },
        hideVehicleLabels: true
    };
}

function drawScheme11() {
    // Layout 11: 2 chuyền song song + đường giữa dùng chung + cụm Cellcon phân tán
    const roadLeft = 98;
    const roadRight = 734;
    const roadTop = 206;
    const roadBottom = 294;
    const topLineY = 92;
    const bottomLineY = 364;
    const stationW = 26;
    const stationH = 26;
    const fuserSpacing = 31;
    const unitSpacing = 35;
    const fuserStartX = 118;
    const unitStartX = 154;
    const hubXs = [170, 314, 458, 602];

    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Đề án C - Hai chuyền chung đường giữa + Cụm Cellcon phân tán", 28, 34);
    ctx.restore();

    drawRectLabel(20, 222, 72, 46, "#fcd34d", "#d97706", "KHO", "#78350f");

    ctx.save();
    ctx.fillStyle = "#166534";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("FUSER 19K", 28, 82);
    ctx.fillStyle = "#0f766e";
    ctx.fillText("UNIT KHÁC / CHUYỀN TƯƠNG LAI", 28, 404);
    ctx.restore();

    const roadPath = [
        { x: roadLeft, y: roadTop },
        { x: roadRight, y: roadTop },
        { x: roadRight, y: roadBottom },
        { x: roadLeft, y: roadBottom },
        { x: roadLeft, y: roadTop }
    ];
    drawPath(roadPath, "#93c5fd", 24);
    drawPath(roadPath, "#1d4ed8", 3, true);
    drawOneWayArrowMarkers(roadPath, "#1d4ed8");

    ctx.save();
    ctx.fillStyle = "#1e40af";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ĐƯỜNG CHUNG AGV-CTU-AMM - 1 CHIỀU", (roadLeft + roadRight) / 2, 250);
    ctx.restore();

    for (let i = 0; i < 19; i++) {
        drawCompactStation(fuserStartX + i * fuserSpacing, topLineY, stationW, stationH, `K${i + 1}`, "#d1fae5", "#059669", "#065f46");
    }

    for (let i = 0; i < 15; i++) {
        drawCompactStation(unitStartX + i * unitSpacing, bottomLineY, stationW, stationH, `U${i + 1}`, "#ccfbf1", "#0f766e", "#134e4a");
    }

    const hubs = [
        { name: "Cụm A", serves: "K1-K5 / U1-U4", x: hubXs[0], y: 170, w: 124, h: 128, topDock: "Dừng FUSER", bottomDock: "Dừng UNIT" },
        { name: "Cụm B", serves: "K6-K10 / U5-U8", x: hubXs[1], y: 170, w: 124, h: 128, topDock: "Dừng FUSER", bottomDock: "Dừng UNIT" },
        { name: "Cụm C", serves: "K11-K15 / U9-U12", x: hubXs[2], y: 170, w: 124, h: 128, topDock: "Dừng FUSER", bottomDock: "Dừng UNIT" },
        { name: "Cụm D", serves: "K16-K19 / U13-U15", x: hubXs[3], y: 170, w: 124, h: 128, topDock: "Dừng FUSER", bottomDock: "Dừng UNIT" }
    ];

    hubs.forEach((hub) => {
        drawRectLabel(hub.x, 146, hub.w, 18, "#fed7aa", "#f97316", hub.topDock, "#9a3412");
        drawDistributedCellconHub(hub);
        drawRectLabel(hub.x, 304, hub.w, 18, "#fed7aa", "#f97316", hub.bottomDock, "#9a3412");

        ctx.save();
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(hub.x + hub.w / 2, 146);
        ctx.lineTo(hub.x + hub.w / 2, topLineY + stationH + 6);
        ctx.moveTo(hub.x + hub.w / 2, 322);
        ctx.lineTo(hub.x + hub.w / 2, bottomLineY - 8);
        ctx.stroke();
        drawArrowHead(hub.x + hub.w / 2, topLineY + stationH + 6, -Math.PI / 2, "#f97316", 6);
        drawArrowHead(hub.x + hub.w / 2, bottomLineY - 8, Math.PI / 2, "#f97316", 6);
        ctx.restore();
    });

    ctx.save();
    ctx.fillStyle = "#475569";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("AMM1: ORI/HAN → Cellcon", 28, 198);
    ctx.fillText("AMM2: Cellcon → Chuyền", 526, 340);
    ctx.fillStyle = "#b91c1c";
    ctx.fillText("Không dừng trên làn chính", 564, 196);
    ctx.fillText("Chỉ dùng hốc dừng", 600, 212);
    ctx.fillText("Đệm 1-2 chu kỳ", 600, 228);
    ctx.restore();

    drawCanvasLegend([
        { color: "#d1fae5", stroke: "#059669", label: "Trạm FUSER" },
        { color: "#ccfbf1", stroke: "#0f766e", label: "Trạm UNIT" },
        { color: "#fef9c3", stroke: "#f59e0b", label: "Cụm phân tán" },
        { color: "#facc15", stroke: "#ca8a04", label: "Ô Cellcon" },
        { color: "#fed7aa", stroke: "#f97316", label: "Hốc dừng" }
    ], 18, 336, 130);

    drawVehicleBox(132, 250, "#fb923c", "AMM1");
    drawVehicleBox(564, 286, "#fb923c", "AMM2");

    const ammHubLoop = [
        { x: 546, y: 286 },
        { x: 620, y: 286 },
        { x: 620, y: 330 },
        { x: 546, y: 330 },
        { x: 546, y: 286 }
    ];

    return {
        agv: roadPath,
        ctu: roadPath,
        amm: ammHubLoop,
        vehicleStyle: "box",
        vehicleOffsets: { ctu: 0.24, amm: 0.1 },
        hideVehicleLabels: true
    };
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
    else if (currentScheme === 8) paths = drawScheme8();
    else if (currentScheme === 9) paths = drawScheme9();
    else if (currentScheme === 10) paths = drawScheme10();
    else paths = drawScheme11();

    // Animate
    agvPos.progress += 0.002;
    if (agvPos.progress > 1) agvPos.progress = 0;

    ctuPos.progress += 0.003;
    if (ctuPos.progress > 1) ctuPos.progress = 0;

    const ctuOffset = paths.vehicleOffsets ? paths.vehicleOffsets.ctu || 0 : 0;
    const ammOffset = paths.vehicleOffsets ? paths.vehicleOffsets.amm || 0 : 0;
    const agvP = getPointOnPath(paths.agv, agvPos.progress);
    const ctuP = getPointOnPath(paths.ctu, (ctuPos.progress + ctuOffset) % 1);

    if (paths.amm) {
        ammPos.progress += 0.0018;
        if (ammPos.progress > 1) ammPos.progress = 0;
    }

    const drawVehicleFn = paths.vehicleStyle === "box" ? drawVehicleBox : drawVehicle;
    const agvLabel = paths.hideVehicleLabels ? "" : "AGV";
    const ctuLabel = paths.hideVehicleLabels ? "" : "CTU";
    drawVehicleFn(agvP.x, agvP.y, "#22c55e", agvLabel);
    drawVehicleFn(ctuP.x, ctuP.y, "#3b82f6", ctuLabel);

    if (paths.amm) {
        const ammP = getPointOnPath(paths.amm, (ammPos.progress + ammOffset) % 1);
        drawVehicleFn(ammP.x, ammP.y, "#fb923c", paths.hideVehicleLabels ? "" : "AMM");
    }

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
        // Sﾆ｡ ﾄ黛ｻ・cﾃ｢y 3 l盻孅.
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
    const labels = ['Thẳng', 'Chữ U', 'Đối xứng', 'Tròn', 'Chữ C', 'Vuông', 'Xương cá', 'Chữ U úp'];
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
            label: 'Quãng đường trung bình (m)',
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
        // alert("L盻孅 logic mﾃｴ ph盻熟g ﾄ疎ng t蘯｣i..."); // Temporary heartbeat

        canvas = document.getElementById('simCanvas');
        if (!canvas) throw new Error("Không tìm thấy canvas 'simCanvas'!");

        ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Không thể khởi tạo ngữ cảnh 2D!");

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

        console.log("笨・Simulation ready.");
    } catch (e) {
        console.error("Simulation Start Error:", e);
        alert("Lỗi khởi tạo mô phỏng: " + e.message);
    }
});

// --- VERIFICATION TOOLS ---
window.verifyLayoutIntegrity = function () {
    console.group('Kiểm tra bố cục');
    console.log(`Current Station Count: ${STATION_COUNT}`);
    console.log(`Current Scheme ID: ${currentScheme}`);

    let errors = [];

    // Check Globals
    if (STATION_COUNT < 5 || STATION_COUNT > 50) errors.push("Station Count out of bounds (5-50)");

    // Check Schemas
    if (Object.keys(schemes).length !== 11) errors.push("Schemes object missing entries");

    // Check Layout 1 Math
    if (currentScheme === 1) {
        const info = schemes[1];
        const expectedLen = (STATION_COUNT * M_PER_STATION + 0.3).toFixed(1);
        console.log(`Layout 1 Check: Formula says ${expectedLen}m. Dims says ${info.dims.split('x')[0].trim()}`);
    }

    if (errors.length > 0) {
        console.error("笶・Verification Failed:", errors);
        alert("笶・Verification Failed! Check console for details.");
    } else {
        console.log("笨・Verification Passed: Basic integrity checks OK.");
        alert(`笨・Verification Passed for Layout ${currentScheme} with ${STATION_COUNT} stations.`);
    }
    console.groupEnd();
};



