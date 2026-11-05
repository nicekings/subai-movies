<div align="center">

# SubAI Movies

**Phụ đề có sẵn và dịch phụ đề bằng AI cho Stremio & Nuvio.**

Tự host · Hồ sơ riêng cho từng người · Giao diện Việt / Anh

[Hướng dẫn sử dụng](#-bắt-đầu-sử-dụng) · [Chạy trên máy tính](#-chạy-trên-máy-tính) · [Đưa lên hosting](#-đưa-lên-hosting) · [Câu hỏi thường gặp](#-câu-hỏi-thường-gặp)

</div>

---

## ✨ Ứng dụng làm được gì?

| Bạn cần | SubAI Movies hỗ trợ |
|---|---|
| Xem phụ đề đã có | Tìm từ các nguồn phụ đề đã bật |
| Dịch sang ngôn ngữ muốn xem | Dùng model AI bạn chọn, giữ mốc thời gian gốc |
| Dùng tệp của mình | Tải SRT/VTT lên, quản lý và tải xuống |
| Theo dõi tác vụ | Xem tiến độ, nhóm đã lưu và lỗi dịch |
| Dùng trên nhiều thiết bị | Cài và khôi phục hồ sơ bằng cùng một URL |

**Không cần tải video lên máy chủ.** Ứng dụng xử lý tệp phụ đề; hiện chưa tạo phụ đề từ giọng nói hoặc tự căn lại thời gian.

## 🚀 Bắt đầu sử dụng

Nếu đã có máy chủ SubAI Movies, mở trang `/configure`, tạo hồ sơ rồi chọn một trong hai cách:

### Cách 1 — Chỉ xem phụ đề có sẵn

1. Mở **Nguồn phụ đề**, bật **OpenSubtitles V3** ở chế độ V3 để dùng không cần API key.
2. Bật **Chỉ xem phụ đề có sẵn (không dùng AI)**.
3. Trong **Ngôn ngữ**, chọn các tiếng bạn muốn đọc khi xem phim.
4. Bấm **Lưu cấu hình** và cài add-on vào ứng dụng.

> Chỉ có kết quả khi nguồn tìm được phụ đề đúng phim và ngôn ngữ bạn chọn. SubDL không bắt buộc; bạn có thể bật thêm nguồn để tăng khả năng tìm thấy.

### Cách 2 — Dịch phụ đề bằng AI

1. Bật ít nhất một nguồn phụ đề dùng được, hoặc tải tệp riêng lên.
2. Tắt **Chỉ xem phụ đề có sẵn (không dùng AI)**.
3. Mở **API dịch AI** → chọn nhà dịch → nhập key → **Kiểm tra** → chọn model.
4. Chọn **ngôn ngữ nguồn** của phụ đề gốc và **ngôn ngữ muốn xem**.
5. Bấm **Lưu cấu hình**. Trong trình phát, chọn **Tạo bản dịch AI**.

```text
Phụ đề gốc → Model AI → Phụ đề bằng ngôn ngữ bạn chọn
                       Giữ thời gian của bản gốc
```

**Phân biệt hai loại dịch vụ:**

| Dịch vụ | Dùng để làm gì? | Cần gì? |
|---|---|---|
| OpenSubtitles V3 — chế độ V3 | Lấy phụ đề gốc / có sẵn | Không cần API key |
| SubDL, SubSource | Lấy phụ đề gốc / có sẵn | API key của từng nguồn |
| OpenSubtitles — chế độ Auth | Kết nối tài khoản OpenSubtitles.com | Tài khoản và API key ứng dụng |
| OpenSubtitles V3 Pro | Lấy phụ đề qua add-on Pro | Cấu hình trong hộp thoại của nguồn |
| SubSense | Lấy phụ đề qua add-on ngoài | URL manifest đã cấu hình |
| OpenRouter, Gemini, DeepSeek, OpenAI, Claude, Grok, Mistral, Google Cloud Translate | Dịch lời thoại | API key của dịch vụ dịch |
| Custom Provider | Dùng API tương thích OpenAI | URL, model và key nếu máy chủ yêu cầu |

Key của nguồn phụ đề **không thay thế** key của dịch vụ AI.

### Cài vào Stremio / Nuvio

| Ứng dụng | Thao tác sau khi lưu cấu hình |
|---|---|
| **Stremio** | Bấm **Cài vào Stremio**, xác nhận trong ứng dụng |
| **Nuvio** | Bấm **Sao chép URL**, thêm URL đó trong mục **Add-ons** của Nuvio |
| **Máy khác** | Mở trang chủ SubAI → **Khôi phục cấu hình** → dán URL cài đã lưu |

> Giữ URL cài add-on riêng tư. Người có URL có thể sử dụng và chỉnh sửa hồ sơ của bạn. Thu hồi URL sẽ yêu cầu cập nhật lại trên các thiết bị.

### Khi đang xem phim

| Nhãn phụ đề | Ý nghĩa |
|---|---|
| **[Có sẵn]** | Chọn để xem ngay, không gọi AI |
| **[Tạo bản dịch AI]** | Bắt đầu dịch khi trình phát tải mục này |
| **[Đã dịch AI]** | Dùng kết quả đã lưu |

Nếu hiện **Đang dịch**, mở tab **Tiến độ dịch**. Khi hoàn tất, chọn lại phụ đề; nếu ứng dụng vẫn giữ thông báo cũ, mở lại trình phát.

Một số trình phát tự tải phụ đề theo ngôn ngữ ưu tiên và có thể kích hoạt dịch AI. Kiểm tra tùy chọn tự chọn phụ đề nếu muốn chọn thủ công.

### Thêm phụ đề thủ công

Trong **Cấu hình → Thêm phụ đề thủ công**:

1. Nhập IMDb đúng phim, ví dụ `tt23289160`. Phim bộ dùng `mã:mùa:tập`, ví dụ `tt1234567:1:2`.
2. Nhập bản phát hành nếu biết, hoặc để trống để dùng tên tệp.
3. Chọn đúng ngôn ngữ của tệp và tệp **SRT/VTT**.
4. Bấm **Tải lên phụ đề**.

Vào **Phụ đề của tôi** để tìm, tải xuống hoặc gỡ tệp. Gỡ tệp khỏi nguồn không xóa các bản dịch đã lưu.

## 💻 Chạy trên máy tính

**Yêu cầu:** Node.js **24.12 trở lên** và npm.

### 1. Lấy mã nguồn và cài thư viện

```sh
git clone https://github.com/nicekings/subai-movies.git
cd subai-movies
npm ci
```

### 2. Tạo cấu hình máy chủ

Sao chép `.env.example` thành `.env`. Tạo khóa mã hóa bằng:

```sh
node -p "require('crypto').randomBytes(32).toString('hex')"
```

Điền `.env`:

```dotenv
ADMIN_PASSWORD=thay-bang-mat-khau-manh-cua-ban
APP_KEY=dan-khoa-64-ky-tu-hex-vua-tao
PUBLIC_URL=http://127.0.0.1:7000
DEMO_MODE=0
```

`APP_KEY` và `ADMIN_PASSWORD` là thiết lập của người vận hành máy chủ. Người dùng nhập API key riêng trên web sau khi tạo hồ sơ.

### 3. Chạy ứng dụng

```sh
npm start
```

Mở **http://127.0.0.1:7000/configure** → tạo hồ sơ → cấu hình theo hướng dẫn bên trên.

> `npm start` chạy chế độ nhiều hồ sơ qua `public.ts`. URL `127.0.0.1` chỉ dùng trên chính máy chạy ứng dụng; để dùng trên TV hoặc máy khác, triển khai URL HTTPS có thể truy cập từ thiết bị đó.

## ☁️ Đưa lên hosting

### cPanel / CloudLinux có Setup Node.js App

1. Tạo tên miền phụ, trỏ DNS về hosting và bật SSL.
2. Tạo ứng dụng trong **Setup Node.js App**:

   | Trường | Giá trị |
   |---|---|
   | Node.js version | **24.12+** |
   | Application mode | **Production** |
   | Application root | Ví dụ `subai-movies` |
   | Application URL | Tên miền phụ của bạn |
   | Application startup file | **`app.cjs`** |

3. Tải mã nguồn vào Application root, gồm các tệp `.ts`, `app.cjs`, `package.json` và `package-lock.json`. Không tải `node_modules` từ Windows lên hosting.
4. Thêm biến môi trường:

   | Biến | Giá trị |
   |---|---|
   | `ADMIN_PASSWORD` | Mật khẩu mạnh của máy chủ |
   | `APP_KEY` | Khóa 64 ký tự hex đã tạo |
   | `PUBLIC_URL` | `https://sub.example.com` — thay bằng tên miền của bạn |
   | `DATA_DIR` | `./data` |
   | `DEMO_MODE` | `0` |

5. Bấm **Run NPM Install**, rồi **Restart**.
6. Mở `https://sub.example.com/configure` bằng tên miền thật của bạn.

Nếu cPanel báo không truy cập được ứng dụng, kiểm tra DNS/SSL trước, sau đó xem log khởi động. Shared hosting có thể giới hạn tài nguyên hoặc dừng tiến trình khi nhàn rỗi; cần kiểm tra tác vụ dịch dài trên gói hosting thực tế.

### VPS với Docker Compose

Chuẩn bị `.env` như phần local, đổi:

```dotenv
DOMAIN=sub.example.com
PUBLIC_URL=https://sub.example.com
```

Trỏ DNS tới VPS, mở cổng **80/443**, rồi chạy:

```sh
docker compose up -d --build
```

Caddy xử lý HTTPS. Dữ liệu ứng dụng nằm trong Docker volume `data` được Compose quản lý.

### Cập nhật phiên bản

- Sao lưu dữ liệu trước khi cập nhật.
- Thay mã nguồn, giữ nguyên `.env`, `APP_KEY` và dữ liệu.
- cPanel: chạy lại cài thư viện nếu dependencies thay đổi, rồi **Restart**.
- Docker: chạy lại `docker compose up -d --build`.
- Trình duyệt: **Ctrl + F5** nếu vẫn thấy giao diện cũ.

## 💾 Dữ liệu và sao lưu

Mặc định, ứng dụng lưu trong thư mục `data` ở Application root:

| Đường dẫn | Nội dung |
|---|---|
| `data/profiles.db` | Danh mục hồ sơ |
| `data/profiles/` | Dữ liệu riêng của các hồ sơ mới |
| `data/subai.db` | Dữ liệu hồ sơ cũ, nếu có |

Nếu đặt `DATA_DIR`, dữ liệu nằm ở đường dẫn đó. Với Docker, sao lưu volume dữ liệu thay vì thư mục local.

**Dừng ứng dụng trước khi sao lưu, sao lưu toàn bộ dữ liệu và giữ riêng `APP_KEY`.** Mất khóa này sẽ không giải mã được các API key đã lưu. Không đưa `.env`, database hoặc URL hồ sơ lên GitHub.

## ❓ Câu hỏi thường gặp

<details>
<summary><strong>Dịch AI có mất phí không?</strong></summary>

Có thể có. Chi phí phụ thuộc dịch vụ và model bạn dùng. Thử lại nhóm lỗi hoặc chuyển nhà dịch dự phòng cũng có thể tính phí. Bản dịch đã lưu phù hợp được dùng lại. Nguồn phụ đề có thể có hạn mức riêng.

</details>

<details>
<summary><strong>Vì sao phim có tiếng Anh nhưng không có phụ đề?</strong></summary>

Âm thanh và phụ đề là hai dữ liệu khác nhau. SubAI cần một tệp phụ đề gốc để dịch; hiện không nhận dạng giọng nói. Kiểm tra đúng IMDb, phần phim, mùa/tập, ngôn ngữ, nguồn và API key.

</details>

<details>
<summary><strong>AI dịch xong nhưng phụ đề lệch?</strong></summary>

AI giữ mốc thời gian của tệp gốc. Chọn bản phát hành khớp video như WEB-DL hoặc BluRay, hoặc tải một tệp phù hợp hơn. Tên bản phát hành khớp không bảo đảm thời gian khớp hoàn toàn.

</details>

<details>
<summary><strong>Bật nhiều nhà cung cấp thì dùng bên nào trước?</strong></summary>

AI dùng nhà dịch chính trước. Khi nhóm câu lỗi, thử nhà cung cấp khác theo thứ tự đã lưu; nhóm kế tiếp dùng lại nhà dịch chính. Kéo tên hoặc dùng mũi tên để đổi thứ tự, rồi lưu.

Nguồn phụ đề có cách xếp hạng riêng: ưu tiên tên bản phát hành khớp, sau đó ngôn ngữ và thứ tự nguồn khi tương đương. Đây không phải luôn là tìm lần lượt từng nguồn.

</details>

<details>
<summary><strong>Custom Provider cài thế nào?</strong></summary>

Nhập URL API tương thích OpenAI, model và key nếu cần. Máy chủ SubAI phải truy cập được URL này. Ví dụ Ollama chạy cùng máy: `http://localhost:11434/v1`; trong Docker Desktop có thể dùng `host.docker.internal` để tới máy chủ.

Nút Kiểm tra gửi một yêu cầu nhỏ bằng model đã chọn. Timeout mặc định 60 giây, có thể chỉnh tới 300 giây.

</details>

<details>
<summary><strong>Người mới nên để cài đặt dịch thế nào?</strong></summary>

Giữ **JSON theo ID** và tắt **ngữ cảnh nhóm trước**. Chỉ thử XML nếu model thường trả JSON không hợp lệ. Ngữ cảnh có thể giúp giữ tên riêng và cách xưng hô nhưng dùng thêm token.

</details>

<details>
<summary><strong>“Nhóm đã lưu” có phải số lần bấm không?</strong></summary>

Không. Đó là số nhóm lời thoại đã dịch và lưu. Thời gian còn lại chỉ là ước tính. Mở **Tiến độ dịch → Xem chi tiết** để xem lỗi; tác vụ lỗi có thể thử lại từ các nhóm đã lưu.

</details>

## 🛠️ Kiểm tra mã nguồn

```sh
npm run typecheck
npm test
```

Các bài kiểm tra dùng mô phỏng API, không cần API key thật. Chúng không thay thế việc thử trên Stremio/Nuvio và dịch vụ bạn sử dụng.

---

**Cần trợ giúp?** Gửi IMDb, tên bản phát hành, ứng dụng/thiết bị và nội dung lỗi. Không gửi API key hoặc URL cài chứa quyền truy cập hồ sơ.
