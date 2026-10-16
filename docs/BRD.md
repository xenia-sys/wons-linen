WONS LINEN

Business Requirements Document

Website trưng bày và bán thời trang Women và Men

Phiên bản 1.0  |  Ngày 16 tháng 10 năm 2026  |  Chủ sản phẩm Mai Hồ Ánh Thư

1 Mục đích và cơ sở yêu cầu

Xây dựng website WONS LINEN để giới thiệu thương hiệu, giúp khách tìm sản phẩm nữ và nam, chọn biến thể, thêm giỏ hàng và đặt mua. Tài liệu này là cơ sở thống nhất phạm vi với thiết kế, phát triển, vận hành và kiểm thử trước khi triển khai.

Hướng mockup đã được Thư đánh giá là khá ổn. Các yêu cầu vận hành trong BRD là đề xuất để đưa website vào sử dụng, cần chủ sản phẩm xác nhận trước khi phát triển. Việc đồng ý hướng giao diện không đồng nghĩa đã chốt chính sách thương mại hoặc giải pháp kỹ thuật.

Nội dung | Trạng thái
Thương hiệu và sản phẩm | WONS LINEN; thời trang nữ và định hướng mở thêm đồ nam.
Ngôn ngữ website | Toàn bộ giao diện khách hàng bằng tiếng Anh.
Điều hướng đã thống nhất | Shop All / Women / Men; danh mục con theo sản phẩm.
Nhận diện | Dùng nguyên bản logo tách nền do chủ thương hiệu cung cấp; logo hiện có chữ WONS FASHION.
Mockup đính kèm | WONS_LINEN_Mockup_v1.html; bản tương tác minh họa, chưa kết nối dữ liệu hoặc thanh toán.


2 Mục tiêu kinh doanh

Tạo một điểm bán chính thức có nhận diện nhất quán; giảm số bước khách phải hỏi về giá, màu và size; ghi nhận đơn rõ ràng để vận hành xử lý; hỗ trợ mở rộng danh mục nam mà không phải thiết kế lại cấu trúc website.

Chỉ số đề xuất theo dõi sau ra mắt: lượt xem sản phẩm, tỷ lệ thêm giỏ, tỷ lệ hoàn thành đặt hàng, đơn bị hủy do hết hàng và yêu cầu hỗ trợ chọn size. Mục tiêu số và thời gian đo chưa được chốt; không dùng số giả định làm cam kết doanh thu.


3 Phạm vi và các bên liên quan

Phạm vi MVP đề xuất

Website responsive gồm trang chủ, danh mục Women và Men, danh sách sản phẩm, chi tiết sản phẩm, giỏ hàng, checkout cho khách không cần tài khoản và xác nhận đơn. Có trang thông tin thương hiệu, liên hệ, hướng dẫn size, chăm sóc sản phẩm, giao hàng, đổi trả và quyền riêng tư.

Khu vực quản trị tối thiểu phải quản lý được sản phẩm, biến thể màu và size, số lượng bán được, trạng thái hiển thị, đơn hàng và thông tin giao nhận. Có thể dùng nền tảng thương mại điện tử sẵn có hoặc phát triển riêng; BRD không mặc định một nhà cung cấp.

Mức | Hạng mục | Ghi chú
Must | Catalog, biến thể, giỏ, checkout, quản trị đơn và tồn | Điều kiện để nhận đơn thực.
Must | Phí giao hàng và tổng tiền trước xác nhận | Không được thu tiền khi tổng phí chưa rõ.
Must | Trang chính sách và thông tin sản phẩm | Nội dung thật được chủ thương hiệu duyệt.
Should | Tìm kiếm, lọc màu và size, email xác nhận | Ưu tiên sau khi dữ liệu catalog và kênh gửi sẵn sàng.
Later | Tài khoản khách, wishlist, đánh giá, loyalty | Ngoài MVP trừ khi có thay đổi phạm vi.
Later | Đa ngôn ngữ, đa tiền tệ, giao quốc tế, POS | Chưa được yêu cầu hoặc chốt vận hành.


Vai trò và trách nhiệm

Vai trò | Trách nhiệm
Chủ sản phẩm | Chốt phạm vi, tên thương hiệu, giá, chính sách, nội dung và nghiệm thu.
Thiết kế và phát triển | Hoàn thiện giao diện responsive, dữ liệu, tích hợp và kiểm thử kỹ thuật.
Vận hành cửa hàng | Cập nhật catalog và tồn, xác nhận và xử lý đơn, giao hàng, đổi trả.
QA và người nghiệm thu | Kiểm thử hành trình mua, tình huống lỗi, quyền truy cập và đối soát đơn.


Giả định cần xác nhận

MVP ưu tiên bán tại Việt Nam và hiển thị giá VND dù dùng tiếng Anh. Đây là giả định thiết kế, chưa phải quyết định thị trường. Men được thiết kế sẵn để mở bán; nếu chưa có hàng thật thì hiển thị Coming Soon và tắt thao tác mua cho sản phẩm chưa bán.


4 Cấu trúc thông tin và trải nghiệm

Màn hình | Thông tin và hành động chính
Home | Campaign thương hiệu; lối vào Women, Men và sản phẩm chọn lọc.
Shop All | Tất cả sản phẩm đang hiển thị; bộ lọc danh mục.
Women | Các danh mục theo hàng thực tế, ban đầu Shirts / Dresses / Sets.
Men | Các danh mục đề xuất Shirts / Trousers / Sets; không tạo mục rỗng.
Product details | Ảnh, giá, màu, size, số lượng có thể mua, size guide, chăm sóc và đổi trả.
Shopping Bag | Biến thể đã chọn, số lượng, giá từng dòng, tạm tính, xóa hoặc đổi số lượng.
Checkout | Thông tin giao nhận, phí, phương thức thanh toán, kiểm tra đơn và xác nhận.
Order confirmation | Mã đơn, tổng tiền, trạng thái thanh toán, bước tiếp theo và kênh hỗ trợ.


Hành trình mua chuẩn

Home → Women hoặc Men → danh mục → sản phẩm → màu và size còn bán → Add to Bag → Shopping Bag → Delivery details → chọn giao hàng và thanh toán → Review order → Place order → Order confirmation.

Nguyên tắc UX và UI

Giữ logo gốc và nền đủ tương phản. Noto Serif dùng cho tiêu đề; Noto Sans dùng cho nội dung, menu, giá và biểu mẫu. Dùng hệ khoảng cách nhất quán; tránh chữ quá nhỏ, tiêu đề đè lên ảnh, nút chỉ hiện khi hover hoặc danh mục bị cắt trên điện thoại.

Không mặc định chọn size. Nút Add to Bag chỉ bật khi biến thể hợp lệ còn bán. Màu và size phải có tên bằng chữ; thông báo lỗi nằm cạnh trường nhập. Khách có thể quay lại giỏ từ checkout và giữ thông tin đã nhập trong phiên phù hợp.

Ảnh campaign, ảnh sản phẩm và mô tả trong mockup là minh họa. Bản chính thức cần ảnh thật đủ góc, thông tin phom, độ dày và độ xuyên thấu. Không công bố thành phần hoặc tuyên bố bền vững nếu chưa được xác nhận.

Điểm cần hoàn thiện ngoài mockup

Mockup hiện có điều hướng Women và Men, lọc danh mục, chọn màu/size, giỏ và biểu mẫu giao hàng thử. Chưa có bộ đo size thật, tồn kho, tính phí giao hàng, thanh toán, lưu đơn, trang chính sách đầy đủ hoặc giao diện quản trị. Đây là phần công việc triển khai, không coi là chức năng đã hoàn tất.


5 Yêu cầu chức năng phía khách hàng

Mã | Yêu cầu MVP | Điều kiện nghiệm thu chính
FR01 | Home và nhận diện | Logo đúng bản; CTA dẫn vào catalog; mọi chữ giao diện là tiếng Anh.
FR02 | Women và Men | Chuyển nhóm chỉ hiện sản phẩm thuộc nhóm đó; Shop All hiện cả hai; giỏ không bị mất khi đổi nhóm.
FR03 | Danh mục và trạng thái bán | Chỉ hiển thị danh mục có nội dung; Coming Soon được phân biệt với hàng có thể mua.
FR04 | Danh sách sản phẩm | Ảnh, tên, giá và trạng thái bán đúng dữ liệu; không mở liên kết tới sản phẩm đã ẩn.
FR05 | Chi tiết sản phẩm | Đổi màu/size cập nhật đúng ảnh, giá và tồn nếu khác nhau; hiển thị size guide đúng sản phẩm.
FR06 | Kiểm tra biến thể | Không thêm giỏ khi thiếu size hoặc hết hàng; chỉ chấp nhận số lượng nguyên dương trong giới hạn bán.
FR07 | Giỏ hàng | Thêm, tăng giảm, xóa; gộp cùng SKU; tách SKU khác; cộng tiền đúng và lưu trong phiên theo chính sách đã chọn.
FR08 | Checkout khách vãng lai | Không bắt tạo tài khoản; kiểm tra dữ liệu bắt buộc; chọn phương thức khả dụng; cho sửa trước xác nhận.
FR09 | Kiểm tra và tạo đơn | Hiển thị sản phẩm, biến thể, phí và tổng tiền; kiểm tra giá/tồn phía máy chủ; chống tạo trùng khi bấm lại.
FR10 | Xác nhận đơn | Đơn tạo thành công có mã và trạng thái rõ; lỗi không hiển thị thành công; khách thấy bước cần làm tiếp.
FR11 | Thông tin và chính sách | Trang thương hiệu, liên hệ, giao hàng, đổi trả, size và quyền riêng tư có nội dung thật được duyệt.


Tìm kiếm, lọc theo màu/size và sắp xếp giá là yêu cầu Should. Nếu đưa vào MVP, phải lọc trên biến thể thực có thể mua và trả về trạng thái không có kết quả rõ ràng.


6 Quy tắc đơn hàng và thanh toán

Giá và tổng tiền

BR01 — Máy chủ là nguồn quyết định giá, ưu đãi và tồn khi tạo đơn. Giá trên giỏ phải được kiểm tra lại; nếu thay đổi, yêu cầu khách xem lại thay vì tự thay và thu tiền. Tổng tiền bằng giá các dòng hàng cộng phí giao hàng và khoản thuế hoặc phí được áp dụng, trừ ưu đãi hợp lệ. Cách hiển thị thuế và cơ chế ưu đãi cần chủ sản phẩm chốt.

BR02 — Không cho xác nhận khi địa chỉ ngoài vùng phục vụ hoặc chưa xác định được phí giao hàng. Nếu không có phương thức thanh toán khả dụng, hiển thị hướng xử lý và không tạo xác nhận mua thành công.

Tồn kho và tránh bán vượt

BR03 — Mỗi biến thể màu và size có SKU riêng. Hàng trong giỏ chưa được xem là đã giữ. Khi xác nhận mua, kiểm tra và giữ hoặc trừ tồn theo một thao tác nhất quán; hai khách mua chiếc cuối không được cùng nhận đơn hợp lệ vượt tồn.

BR04 — Đề xuất giữ tồn cho đơn chờ thanh toán và hoàn lại khi hết hạn hoặc hủy. Thời gian giữ, thời điểm trừ tồn của COD, cách hoàn tồn khi đổi trả và người có quyền điều chỉnh phải được chốt. Các trạng thái đã xử lý không được trừ hoặc hoàn tồn lần hai khi nhận thông báo lặp.

Thanh toán và trạng thái

BR05 — COD, chuyển khoản hoặc cổng thanh toán là các lựa chọn cần quyết định, không mặc định đã tích hợp. Thanh toán online chỉ đánh dấu đã thanh toán khi nhận xác nhận tin cậy từ nhà cung cấp; không dựa riêng vào trang khách được chuyển về.

Nhóm | Trạng thái đề xuất | Quy tắc
Đơn hàng | Pending confirmation / Confirmed / Processing / Shipped / Completed / Cancelled | Hủy chỉ khi điều kiện cho phép; đã giao cần quy trình đổi trả riêng.
Thanh toán | Unpaid / Pending / Paid / Failed / Refunded | Tách khỏi trạng thái giao hàng. COD chưa thu không được coi là Paid.
Giao hàng | Not dispatched / In transit / Delivered / Delivery failed | Cập nhật thủ công có kiểm soát hoặc từ đơn vị vận chuyển.


BR06 — Mã đơn là duy nhất. Lỗi gửi email không được làm mất đơn đã ghi nhận. Nếu lỗi mạng sau khi đặt, hệ thống phải có cách tìm lại kết quả theo yêu cầu đã gửi, tránh khách tạo đơn mới do không thấy phản hồi.


7 Quản trị dữ liệu và vận hành

Mã | Yêu cầu quản trị | Điều kiện nghiệm thu
AD01 | Đăng nhập và phân quyền | Chỉ tài khoản được cấp quyền mới vào quản trị; khách không đọc được đơn hoặc dữ liệu người khác.
AD02 | Catalog và nội dung | Tạo/sửa/ẩn sản phẩm, ảnh, giá, nhóm Women/Men, danh mục, mô tả, size guide và trạng thái Coming Soon.
AD03 | Biến thể và tồn | Quản lý SKU, màu, size, tồn; cảnh báo dữ liệu thiếu; ghi người và thời điểm điều chỉnh.
AD04 | Đơn hàng | Tìm theo mã, lọc trạng thái, xem chi tiết, xác nhận/hủy, cập nhật giao hàng và thanh toán theo quyền.
AD05 | Đối soát và xuất dữ liệu | Xuất đơn phục vụ vận hành; tổng tiền và trạng thái khớp dữ liệu gốc; lưu lịch sử cập nhật quan trọng.


Dữ liệu nghiệp vụ tối thiểu

Đối tượng | Các trường cần có
Product | ID, tên tiếng Anh, đường dẫn, nhóm Women/Men, danh mục, mô tả, ảnh, size guide, trạng thái hiển thị.
Variant và Inventory | SKU, product ID, màu, size, giá VND, tồn thực, tồn giữ, số lượng có thể bán; không lưu số lượng âm.
Cart và Order item | SKU, số lượng; đơn phải chụp lại tên, màu, size, đơn giá tại thời điểm mua để giữ lịch sử.
Order và Delivery | Mã đơn, người nhận, điện thoại, email nếu áp dụng, địa chỉ, phí, tổng, trạng thái, thời gian, mã vận đơn nếu có.
Payment và Audit | Phương thức, trạng thái, mã giao dịch, số tiền; người thao tác, hành động, giá trị trước/sau và thời điểm.


Quyền và thông tin cá nhân

Đề xuất Owner có toàn quyền; Operations xử lý đơn và tồn; Content chỉ quản lý nội dung. Quyền xem/xuất dữ liệu khách, thời gian lưu dữ liệu và cơ chế xử lý yêu cầu xóa cần được thống nhất. Không lưu dữ liệu thẻ thanh toán trực tiếp trong hệ thống cửa hàng.


8 Chất lượng và kế hoạch nghiệm thu

Các ngưỡng dưới đây là mục tiêu nghiệm thu đề xuất, cần đội phát triển xác nhận điều kiện đo và chủ sản phẩm phê duyệt.

Mã | Yêu cầu phi chức năng | Cách kiểm tra
NF01 | Responsive và trình duyệt | Không tràn ngang tại 320, 390, 768 và 1440 px; thử luồng mua trên Chrome, Safari và Edge hiện hành.
NF02 | Khả năng truy cập | Luồng mua dùng được bằng bàn phím; focus rõ; nhãn form và alt ảnh có nghĩa; tương phản chữ thường tối thiểu 4.5:1.
NF03 | Hiệu năng | Mục tiêu LCP ≤ 2.5 giây, CLS ≤ 0.1 và INP ≤ 200 ms ở phân vị 75 khi có đủ dữ liệu thực; trước ra mắt đo lab với cấu hình thống nhất.
NF04 | Bảo mật và riêng tư | HTTPS; kiểm tra quyền phía máy chủ; không lộ khóa bí mật; giới hạn yêu cầu tạo đơn; không ghi log dữ liệu thanh toán nhạy cảm.
NF05 | Khôi phục và giám sát | Có log lỗi tạo đơn/thanh toán, cảnh báo vận hành, sao lưu và thử khôi phục; mục tiêu mất dữ liệu và thời gian khôi phục cần chốt.
NF06 | SEO và nội dung | Tiêu đề, mô tả, URL và ảnh đúng sản phẩm; sitemap và trạng thái trang hợp lệ; dữ liệu có cấu trúc chỉ dùng thông tin thật.


Kịch bản UAT bắt buộc

Mã | Kịch bản và kết quả mong đợi
U01 | Women → Men → lọc Shirts; không lẫn nhóm; giỏ giữ nguyên.
U02 | Thiếu size, hết hàng hoặc quantity sai; chặn mua và báo lý do.
U03 | Giỏ gồm hàng nữ và nam; gộp đúng SKU, xóa và tổng tiền đúng.
U04 | Checkout thiếu dữ liệu, sai địa chỉ hoặc phí chưa tính; không xác nhận đơn.
U05 | Hai lượt mua hàng cuối và hai lần bấm Place order; không bán vượt hoặc tạo trùng.
U06 | Thanh toán thành công, thất bại, hủy và callback lặp; trạng thái và tồn nhất quán.
U07 | Quản trị sửa trạng thái; dữ liệu đơn gốc giữ nguyên; có lịch sử thao tác.
U08 | Khách truy cập dữ liệu đơn khác hoặc trang quản trị; từ chối truy cập.



9 Quyết định triển khai và bàn giao

Những điểm cần chủ sản phẩm chốt

Mã | Quyết định | Trạng thái
D01 | Cách dùng WONS FASHION trên logo và WONS LINEN trên website. | Chưa chốt
D02 | Ngày mở bán Men; danh mục, sản phẩm và size thực có. | Chưa chốt
D03 | Thị trường phục vụ, VND, giá đã gồm thuế hay chưa. | Giả định Việt Nam và VND
D04 | COD, chuyển khoản hoặc cổng thanh toán; tài khoản nhận tiền. | Chưa chốt
D05 | Vùng giao, đơn vị giao, biểu phí và miễn phí nếu có. | Chưa chốt
D06 | Đổi trả, hủy, hoàn tiền, thời gian giữ tồn và xử lý COD. | Chưa chốt
D07 | Nền tảng, domain, ngân sách, người quản trị và kênh gửi thông báo. | Chưa chốt
D08 | Ảnh thật, thành phần vải, size guide, liên hệ và chính sách dữ liệu. | Cần cung cấp và duyệt


Trình tự triển khai đề xuất

Bước 1 — Xác nhận các quyết định D01–D08 và phạm vi MVP. Bước 2 — Chuẩn bị catalog, ảnh và chính sách; hoàn thiện thiết kế desktop/mobile. Bước 3 — Xây dữ liệu, quản trị và luồng mua; tích hợp phương thức đã chọn. Bước 4 — Kiểm thử UAT và đối soát đơn thử; sửa lỗi. Bước 5 — Chủ sản phẩm nghiệm thu, cấu hình tên miền và mở bán; theo dõi đơn và lỗi sau ra mắt. Chưa cam kết thời gian hoặc chi phí khi chưa chọn nền tảng và tích hợp.

Điều kiện được phép mở bán

Tất cả yêu cầu Must và U01–U08 đạt; không còn lỗi nghiêm trọng khiến đặt nhầm, tính tiền sai, mất đơn hoặc lộ dữ liệu. Có người tiếp nhận đơn, tồn ban đầu đã đối soát, chính sách đã duyệt, thanh toán và giao hàng đã thử, có cách khôi phục và liên hệ hỗ trợ hoạt động.

Đối chiếu mockup và yêu cầu

Home và menu → FR01–FR03. Catalog và chi tiết → FR04–FR06. Shopping Bag → FR07. Biểu mẫu Delivery details → minh họa một phần FR08. FR09–FR11, AD01–AD05 và các yêu cầu chất lượng cần triển khai thêm. Tất cả tên, giá và tồn sản phẩm mẫu trong mockup không phải dữ liệu kinh doanh chính thức.

Tệp bàn giao: BRD này và WONS_LINEN_Mockup_v1.html. Mở HTML bằng trình duyệt để xem Women, Men, danh mục, chọn biến thể và giỏ. Font có thể cần Internet; khi không tải được sẽ dùng font dự phòng. Nguồn tham khảo bố cục: https://the31.vn/; không sử dụng ảnh hoặc nội dung của thương hiệu tham khảo.

Xác nhận phạm vi: Chủ sản phẩm __________________  Ngày __________Xác nhận phương án thực hiện: Đơn vị phát triển __________________  Ngày __________

