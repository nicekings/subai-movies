# SubAI Movies

Dùng Node.js 24.12+ hoặc Docker Compose. Trong thư mục dự án:

1. Chép `.env.example` thành `.env`. Điền mật khẩu mạnh vào `ADMIN_PASSWORD`. Tạo khóa bằng `node -p "require('crypto').randomBytes(32).toString('hex')"` và điền vào `APP_KEY`. Giữ khóa này khi sao lưu SQLite.
2. Thử trên PC bằng `npm ci` và `node --env-file=.env server.ts`. Mở http://127.0.0.1:7000/configure rồi đăng nhập bằng tên **admin** và mật khẩu ở trên.
3. Để dùng TV, trỏ tên miền tới máy chủ, mở cổng 80/443. Đặt DOMAIN thành tên miền và PUBLIC_URL thành https:// cùng tên miền đó, sau đó chạy `docker compose up -d --build`. Mở /configure bằng đúng tên miền.
4. Với DEMO_MODE=1, cài add-on và mở **The Matrix (1999)**. Chọn mục AI có chữ DEMO, đợi vài giây rồi chọn lại. Tại giây 1–5 sẽ thấy “Xin chào!”. Trên Nuvio TV dán link manifest vào Add-ons và dùng trình phát nội bộ. Để kiểm tra tải trước, chọn hiển thị mọi phụ đề, tắt tự chọn ngôn ngữ, mở phim rồi kiểm tra trang tiến độ trước khi chọn mục AI. Lặp lại với ngôn ngữ ưu tiên. Nếu vẫn thấy thông báo chờ khi đã dịch xong, mở lại phim.
5. Mở **Subtitles API Keys** để chọn nguồn. Bật SubDL hoặc SubSource, bấm biểu tượng bút, nhập API key và kiểm tra kết nối ngay trong hộp thoại. Mặc định mỗi nguồn theo mục **Ngôn ngữ**. Khi bật dịch Anh → Việt, nguồn tìm cả tiếng Anh và tiếng Việt. Chế độ chỉ xem phụ đề có sẵn chỉ tìm tiếng Việt. Có thể giới hạn thêm ngôn ngữ riêng cho từng nguồn. Bấm **Áp dụng** rồi **Lưu cấu hình**. OpenSubtitles V3 dùng ngay, V3 Pro cấu hình trong SubAI Movies, còn SubSense dùng link manifest. Chọn **Chỉ xem phụ đề có sẵn** để chỉ lấy ngôn ngữ muốn xem, hoặc mở **AI Translation API Keys** và chọn nhà dịch chính. Trong **Nhà cung cấp khác**, tích từng hãng để mở ô API key và chọn model. Dán key của từng dịch vụ đang bật. OpenRouter, DeepSeek, OpenAI, Gemini, Anthropic (Claude), xAI (Grok) và Mistral tự tải danh sách model sau khi xác thực key. Nút kiểm tra bên dưới mỗi key chỉ xác thực dịch vụ đó. Google Cloud Translate dùng key có quyền Cloud Translation Basic. Mở **Ngôn ngữ** để chọn 1–3 nguồn và 1–6 đích. Trong **Cài đặt dịch**, chọn JSON hoặc XML cho model AI. Bấm **Lưu cấu hình**. Khi một nhóm câu lỗi, ứng dụng thử các nhà cung cấp đã tích theo thứ tự hiển thị cho nhóm đó. Nhóm kế tiếp dùng lại nhà dịch chính.
6. Tải tệp SRT/VTT UTF-8 lên nếu cần, nhập đúng IMDb và mùa/tập. Chọn đúng bản WEB-DL/BluRay và xem thử đầu, giữa, cuối phim. Khi hết hạn mức hoặc key sai, trang quản lý hiện lỗi và cho thử lại từ nhóm đã lưu.
7. Thu hồi link yêu cầu cài lại trên các thiết bị. Dừng app trước khi sao lưu thư mục data và giữ riêng APP_KEY. Chạy `npm test` để thử bằng HTTP trên máy, không cần key.

Trong trình phát, chọn **[Có sẵn]** để xem ngay. **[Tạo bản dịch AI]** khởi động dịch và **[Đã dịch AI]** mở kết quả đã lưu. Một số trình phát chỉ hiện ngôn ngữ ở danh sách ngoài; mở chi tiết từng bản phụ đề để xem nhãn.

**OpenSubtitles**: chọn V3 để dùng ngay hoặc Auth để đăng nhập trực tiếp với OpenSubtitles.com. Auth cần username, password và API key ứng dụng (có thể đặt OPENSUBTITLES_API_KEY trên máy chủ). Bấm kiểm tra rồi lưu. Với **V3 Pro**, đặt tên, timeout, ngôn ngữ, loại người đăng, tùy chọn bản đã dịch AI và tự điều chỉnh thời gian theo hash. Mặc định SubAI tự sinh manifest, chỉ nhập URL khi chủ động bật ghi đè.

**Custom Provider** dùng được cho cả nhà dịch chính và danh sách nhà cung cấp khác. Nhập URL API tương thích OpenAI (ví dụ `http://localhost:11434/v1` khi Ollama và SubAI cùng chạy trên máy), tên model và API key nếu cần. Trong Docker Desktop, dùng `host.docker.internal` thay cho `localhost` để kết nối tới dịch vụ trên máy chủ. Nút **Kiểm tra** gửi một câu dịch bằng model và định dạng đã chọn. Bấm **Lưu cấu hình** để dùng khi xem phim.

Trong **04 · Cài đặt dịch → Nâng cao**, **Dùng ngữ cảnh từ nhóm trước** mặc định tắt. Khi bật, model AI nhận tối đa 3 câu gốc và bản dịch ở cuối nhóm ngay trước để tham khảo. Trong **Custom Provider**, thời gian chờ mặc định là **60 giây**, chỉnh được từ **60 đến 300 giây** cho mỗi yêu cầu kiểm tra hoặc dịch.

Trong **Tiến độ dịch**, bấm **Xem chi tiết** để xem số nhóm và số đoạn đã dịch. Khi tác vụ gặp lỗi, bấm **Thử lại** để tiếp tục từ nhóm đã lưu.


## Hồ sơ cá nhân trên máy chủ công khai

`npm start` chạy cổng nhiều hồ sơ qua `public.ts`. Mở `/configure` để tạo hồ sơ. Trình duyệt nhớ hồ sơ bằng cookie HttpOnly trong một năm. Mở `/profiles` để đổi hồ sơ hoặc dán URL cài add-on vào Khôi phục cấu hình trên máy khác. URL là quyền truy cập hồ sơ, nên chỉ chia sẻ với người được phép sử dụng và chỉnh sửa cấu hình đó.

Cấu hình cũ trong `data/subai.db` được nhận diện tự động. Dùng URL cài cũ để khôi phục. Hồ sơ mới lưu riêng trong `data/profiles/`, danh mục lưu tại `data/profiles.db`. Sao lưu toàn bộ thư mục data cùng APP_KEY. Tác vụ chưa hoàn thành được tiếp tục khi khởi động lại. Mặc định tối đa 100 hồ sơ, chỉnh bằng MAX_PROFILES. Mỗi hồ sơ hoạt động có một phiên dịch vụ và SQLite riêng trong cùng tiến trình.

Để triển khai HTTPS, đặt DOMAIN và PUBLIC_URL theo tên miền rồi chạy Docker Compose. Việc tạo hồ sơ mới bắt đầu với cấu hình trống. Máy chủ cung cấp API key OpenSubtitles qua biến môi trường chỉ cho hồ sơ cũ.
