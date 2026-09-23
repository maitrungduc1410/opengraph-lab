# Link preview (Open Graph) — nhật ký vọc

Câu hỏi chính: khi dán một link vào app chat / mạng xã hội, **ai** đi tải trang đó (server của app hay máy mình), tải bằng danh tính gì, tải mấy lần, ảnh đi đường nào.

## Setup

- Worker Cloudflare: `https://opengraph-lab.maitrungduc1410.workers.dev` (code trong `src/index.js`).
- Mỗi lần thử dùng 1 tag riêng để tránh cache, ví dụ `/p/zalo-web-2`.
- Route:
  - `/p/<tag>`: HTML có sẵn thẻ OG, `og:image` trỏ về `/img/<tag>.png?c=<màu>`.
  - `/js/<tag>`: thẻ OG chỉ được chèn bằng JS; nếu fetcher chạy JS sẽ có request `BEACON`.
  - `/r/<tag>`: 302 sang `/p/<tag>`.
  - `/slow/<tag>?ms=`: trả chậm.
  - `/img/<tag>.png?c=orange|blue|green|red`: ảnh 1200×630 sọc chéo (sinh sẵn bởi `scripts/gen-images.js`).
- Log: `wrangler tail --format json > .tmp/tail.ndjson`, đọc gọn bằng `npm run logs -- .tmp/tail.ndjson [tag]`. Mỗi dòng có IP, ASN, tên nhà mạng (`asOrg`), quốc gia/thành phố, user agent.
- ⚠️ Máy thử là máy công ty: request "của mình" đi ra bằng IP BytePlus Singapore (AS150436). Khi quay clip nhớ che IP/tên mạng, hoặc quay lại trên máy cá nhân.

## Zalo web (chat.zalo.me) — My Documents, chỉ dán link, không gửi

Thời điểm: 2026-09-23 ~18:37 (UTC+8). Log gốc lần này bị mất khi sync repo; dưới đây là bản tóm tắt đã in ra lúc đó.

### Phía trình duyệt (DevTools Network)

1. Dán link → client gọi `GET https://tt-files-wpa.chat.zalo.me/api/message/parselink?...&params=<mã hoá>` (params đã mã hoá, giống các API Zalo khác).
2. Ảnh preview hiển thị qua proxy của Zalo:
   `https://photo-link-talk.zadn.vn/photolinkv2/720/zlv2...<base64>`
   Đoạn base64 cuối giải ra đúng URL ảnh gốc: `https://opengraph-lab.maitrungduc1410.workers.dev/img/zalo-web-1.png?c=orange`.
   Trình duyệt gọi proxy này nhiều lần: `HEAD` (200) ×2, `GET` (206 — range request) và `GET` (200).
3. ⚠️ Có thêm 1 request trình duyệt gọi **thẳng** ảnh gốc `https://opengraph-lab.../img/zalo-web-1.png?c=orange` (lúc chụp còn pending). Nếu tái hiện được → trang gốc vẫn thấy IP của người dán link. **CẦN VERIFY** (lần đó tail chưa chạy nên Worker chưa bắt được).

### Phía server (log Worker, link `/p/zalo-web-2`)

| Bước | Ai gọi | Mạng | User agent |
|---|---|---|---|
| Tải trang HTML (1 lần) | `15.235.162.57` | AS16276 **OVH Singapore** | `facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php) _zbot` |
| Tải ảnh | `49.213.78.31` | AS38244 **VNG Corporation**, TP.HCM | `Mozilla/5.0 (X11; Linux x86_64) ... Chrome/100.0.4896.60 Safari/537.36 _zbot` |
| Tải ảnh (×2) | `118.102.2.29` | AS38244 VNG (Vi Na Group), TP.HCM | `Mozilla/5.0 (Windows NT 6.2; Win64; x64) ... Chrome/32.0.1667.0 Safari/537.36 _zbot` |

Nhận xét:

- **Zalo giả danh bot Facebook** khi tải trang: UA là `facebookexternalhit/1.1` + hậu tố `_zbot`. Giả thuyết: nhiều site chỉ trả thẻ OG / whitelist cho bot Facebook, nên đội lốt để "ăn theo" (chưa xác nhận động cơ).
- Trang được tải từ **server thuê ở OVH Singapore**, không phải dải IP của VNG. Ảnh thì tải từ dải IP của **VNG ở TP.HCM** → tách 2 hệ thống: bộ đọc HTML và bộ tải/xử lý ảnh (khả năng chính là proxy `photo-link-talk.zadn.vn`).
- Ảnh bị tải **3 lần** bởi 2 fetcher khác nhau, UA giả trình duyệt (Chrome 100 Linux, và Chrome 32 trên Windows 8 — rất cũ).
- Máy người dùng **không** tự tải trang HTML; nó chỉ nhận kết quả từ `parselink`.

### Gõ link → mỗi ký tự một lần fetch? (CẦN VERIFY lại cho sạch)

Lúc xoá link cũ rồi gõ link mới (bị lỗi focus nên text bị nối), trong ~0,5 giây Worker nhận **8 lần tải trang** với URL bị cắt dở: `/p/zalo-web-1h`, `…1ht`, `…1htt`, `…1http`, `…1https`, `…1https:`, `…1https:/` và **~20 lần tải ảnh** tương ứng.
→ Có vẻ Zalo gọi `parselink` sau gần như mỗi lần nội dung ô chat đổi, không debounce kỹ. Cần gõ chậm trong ô trống để xác nhận.

## Messenger web — chat E2EE (`/messages/e2ee/t/...`, chat với chính mình), chỉ soạn nháp

Thời điểm: 2026-09-23 ~22:30 (UTC+8).

### Link ngoài (`/p/msg-e2ee-1`)

- Bản nháp chỉ hiện **domain + URL**, không có tiêu đề, mô tả, ảnh.
- Worker **không nhận request nào** (đợi > 30 giây). Không có bot Meta nào tải trang.
- Khớp với ảnh chụp Messenger iPhone ban đầu: 2 tin `jamesisme.com` đầu chỉ hiện chữ domain, không có card.

### Link bài viết Facebook

- `https://www.facebook.com/share/p/1Jk4wwRHRi/?mibextid=wwXIfr` → card nhỏ: ảnh thumbnail, "Mai Trung Đức", "Năm mới, hành trình mới và những thành viên mới 🥰", `www.facebook.com`.
- `https://www.facebook.com/share/p/1N5kdr3kZ2/` → card nhỏ: tiêu đề/mô tả bài + thumbnail.
- DevTools Network: **chính trình duyệt** gọi `GET https://www.facebook.com/share/p/...` (UA Chrome thường của mình), rồi tự tải thumbnail từ `scontent-*.xx.fbcdn.net`.
- → Trong chat E2EE, preview được dựng **phía client**, không nhờ server (hợp lý: server không được biết link trong tin nhắn mã hoá).
- Giả thuyết giải thích vì sao link ngoài không có card: client chỉ `fetch` được trang cùng origin (`facebook.com`); trang ngoài bị **CORS** chặn đọc HTML, nên chỉ còn hiện domain. **CẦN VERIFY**: thêm route trả `Access-Control-Allow-Origin: *` rồi dán lại, xem card có hiện không.
- Nếu dán 2 link cùng lúc, Messenger chỉ làm preview cho link đầu tiên.
- Card nhiều ảnh kiểu "+32" (thấy ở tin đã gửi trước đây) **không** hiện lúc soạn nháp; lúc nháp chỉ là card nhỏ. Chưa thử gửi thật.

## Facebook — Create post (`/post/create`, audience Public), chỉ soạn, không đăng

### Link ngoài (`/p/fb-post-1`)

- Preview hiện đầy đủ: ảnh lớn (sọc cam), domain viết hoa, `OG Lab: fb-post-1`.
- Ảnh hiển thị qua proxy `https://external-sin11-1.xx.fbcdn.net/emg1/v/t13/...?url=<URL ảnh gốc>&utld=workers.dev...`. Trình duyệt **không** gọi thẳng Worker.
- Phía server: bot thật `facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)`, AS32934 **Meta Platforms**, IPv6 `2a03:2880:...`, từ rất nhiều data center Mỹ: Mesa, Fort Worth, Springfield, Ashburn, Altoona, Prineville, Social Circle, Kansas City, Gallatin.
- Bot đọc `/robots.txt` trước (10 lần), header `range: bytes=0-512000`.
- Lượt tải trang đầu có `range: bytes=0-524287` → **chỉ lấy 512 KB đầu** của HTML. Thẻ OG nằm sau 512 KB sẽ không được đọc (**CẦN VERIFY** bằng route có HTML > 512 KB).
- **Tải theo từng ký tự đang gõ**: Worker nhận `/`, `/p`, `/p/`, `/p/f`, `/p/fb`, `/p/fb-`, … `/p/fb-post-1`, **mỗi tiền tố 5 lần**, từ nhiều IP/data center khác nhau.
- Ảnh bị tải **~520 lần** (tất cả từ Meta/Mesa), trong đó **483 lần dồn vào khoảng 1 phút sau** khi dán. Chưa rõ lý do (resize nhiều kích thước? retry?). **CẦN VERIFY** lại, và thử với 1 link dán một lần (paste) thay vì gõ.
- ⚠️ Lần này MCP "gõ" link từng ký tự; người dùng thật thường **paste** cả link một lần → số tiền tố sẽ ít hơn nhiều. Khi quay clip nên thử cả 2 kiểu.

### Link bài viết Facebook

- `https://www.facebook.com/share/p/1Jk4wwRHRi/?mibextid=wwXIfr` → không phải card OG mà là **bài chia sẻ nội bộ**: lưới nhiều ảnh (album cưới). Tức là với link của chính mình, Facebook render UI riêng, không đi đường Open Graph.

## X (x.com/home, composer), chỉ soạn, không đăng

- Client gọi `GET /i/api/graphql/.../ComposerJetfuelPreviewQuery?variables={"view":"<url>"}` **nhiều lần theo từng đoạn URL đang gõ** (`https://opengraph-lab.ma`, `...maitrungduc1410.work`, `...workers.de`, URL đầy đủ). Response: `{"data":{}}`.
- Sau đó gọi `POST https://caps.x.com/v2/cards/preview.json?status=<url>&cards_platform=Web-12&include_cards=true` → **HTTP 202, body rỗng** (đã nhận, đang xử lý).
- Phía server: `Twitterbot/1.0`, AS13414 **Twitter Inc.**, SeaTac (Mỹ), tải trang **2 lần** gần như cùng lúc từ 2 IP (`192.133.77.14`, `.16`). Sau đó còn tải `/p/x-web-` (tiền tố) 2 lần.
- Twitterbot **không tải ảnh** trong suốt ~1 phút theo dõi.
- Composer **không hiện card** (chỉ có vòng loading). Khớp với ảnh X desktop ban đầu (card không có ảnh). Giả thuyết: X web chỉ render card khi `caps` đã xử lý xong, và web client không poll lại; app iPhone hiển thị được vì đi đường khác / cache. **CẦN VERIFY**.
- ❓ Lúc 14:37:30 UTC có 1 request `GET /p/x-web-1` từ **IP BytePlus của máy mình**, UA Chrome 153 của chính trình duyệt. Chưa rõ ai gọi: có thể mở link bằng tay, hoặc Chrome prefetch/preconnect. **CẦN VERIFY**.

## LinkedIn (`/sharing/compose`), chỉ soạn, không đăng

- Composer báo **"Cannot display preview. You can post as is, or try another link."**
- Worker **không nhận request nào** → LinkedIn không hề đi tải link này.
- Trước đó `https://jamesisme.com/` vẫn có preview trên LinkedIn. Giả thuyết: LinkedIn chặn cả domain `*.workers.dev` (domain miễn phí hay bị lạm dụng). **CẦN VERIFY** bằng custom domain trỏ vào cùng Worker.

## Facebook — post từ trang cá nhân, **paste** link (không gõ từng ký tự)

Link `/p/fb-profile-paste-1`, chèn cả chuỗi một lần (giống paste):

- Preview giống hệt trang Create post (ảnh lớn + domain + title).
- Trang chỉ bị tải **2 lần** (Altoona, Sandston), ảnh **1 lần** (Ashburn) ngay lúc dán → mấy trăm request ở lần trước là do **gõ từng ký tự**.
- NHƯNG ~1 phút sau vẫn có **đợt tải ảnh dồn dập: 63 request** trong phút 14:50 UTC, tất cả từ Meta **Mesa**, nhiều IP khác nhau bắn cùng lúc, không có header `range`.
- Giả thuyết: Worker trả `cache-control: no-store` nên proxy ảnh của Facebook (`external-*.fbcdn.net`) không cache được, mỗi node lại tự tải. `jamesisme.com` trả `max-age=600`. **CẦN VERIFY** bằng `?cache=1`.

## Vì sao `jamesisme.com` ra card trên X/LinkedIn mà Worker thì không?

So sánh thực tế (curl với UA `Twitterbot/1.0`):

| | `jamesisme.com` | Worker |
|---|---|---|
| Ảnh | `og.png`, 1200×630, PNG | PNG 1200×630 (y hệt kích thước) |
| `cache-control` HTML/ảnh | `max-age=600` | `no-store` |
| URL ảnh | không có query | có `?c=orange` |
| Domain | domain riêng (DNS trên Cloudflare, host GitHub Pages) | `*.workers.dev` |
| `robots.txt` | 404 | Worker trả 404, Cloudflare thay bằng **managed robots.txt** (chỉ comment "content signals", **không có Disallow**) |

→ **Không phải do image dimension.** `robots.txt` cũng không chặn ai.

- **LinkedIn Post Inspector** với `/p/li-inspect-1`: *"Error: Unable to connect to server. Bad DNS, bad gateway, or invalid server address."*, và Worker **không nhận request nào**. Trong khi `curl` giả `LinkedInBot` thì vào được bình thường (200). → Phía LinkedIn không kết nối tới `workers.dev` (nhiều khả năng chặn cả domain này vì hay bị dùng cho phishing). **CẦN VERIFY** bằng custom domain.
- **X**: Twitterbot có tải trang nhưng không tải ảnh, `caps` trả 202 rỗng. Nghi 2 khả năng: (1) domain `workers.dev` bị hạ uy tín, (2) `no-store`. Test tách biến: `?cache=1` trên `workers.dev` trước, rồi custom domain.
- Request "lạ" từ IP/Chrome của máy mình (14:37, 14:41, 14:43 UTC) là lúc tự mở link bằng tay, không phải app.

## Code mới (cần push + deploy)

- `?cache=1` trên `/p/<tag>`: HTML + ảnh trả `cache-control: public, max-age=600` (giống `jamesisme.com`), URL ảnh trong `og:image` cũng mang `cache=1`.
- `/cors/<tag>`: giống `/p` nhưng có `Access-Control-Allow-Origin: *` (ảnh màu xanh dương) để test giả thuyết CORS của Messenger E2EE.
- Ảnh luôn có `Access-Control-Allow-Origin: *`.

## Bảng tổng hợp (tạm thời)

| App | Ai tải trang | Danh tính (UA) | Mạng | Ảnh đi đường nào | Ghi chú |
|---|---|---|---|---|---|
| Zalo web | Server | `facebookexternalhit/1.1 ... _zbot` (giả bot FB) | OVH Singapore | Proxy `photo-link-talk.zadn.vn`, tải bởi VNG TP.HCM (UA Chrome giả) | Có thể fetch theo từng ký tự |
| Messenger E2EE (link ngoài) | Không ai | — | — | — | Chỉ hiện domain |
| Messenger E2EE (link FB) | **Trình duyệt mình** | Chrome thường | Mạng mình | Tải thẳng `fbcdn` | Dựng preview phía client |
| Facebook Create post / trang cá nhân | Server | `facebookexternalhit/1.1` (thật) | Meta, nhiều DC ở Mỹ | Proxy `external-*.fbcdn.net/emg1` | Range 512 KB; gõ thì fetch mọi tiền tố, paste thì 2 lần; ảnh bị tải dồn dập ~1 phút sau |
| X web | Server | `Twitterbot/1.0` | Twitter Inc., SeaTac | Chưa tải ảnh | `caps` trả 202, không có card (với `workers.dev`) |
| LinkedIn | Không ai | — | — | — | Post Inspector: "Unable to connect to server", nghi chặn `workers.dev` |

## Việc cần làm tiếp

1. Messenger: thêm route có header CORS, dán lại trong chat E2EE → xác nhận giả thuyết CORS.
2. Messenger: gửi thật 1 link ngoài + 1 link FB vào chat với chính mình, xem sau khi gửi thì ai tải (có bot Meta không, card nhiều ảnh hiện thế nào).
3. Messenger: so với 1 chat **không** E2EE (URL `/messages/t/...`).
4. Zalo: gõ chậm trong ô trống để xác nhận fetch theo ký tự; paste nguyên link để so sánh; gửi thật vào chat E2EE với người khác (nếu có người đồng ý).
5. Facebook: paste (không gõ) để đếm lại số lần tải; thêm route HTML > 512 KB, đặt thẻ OG sau mốc 512 KB.
6. X: thử `/p/<tag>?cache=1`; nếu vẫn không ra card thì thử custom domain.
7. LinkedIn + X: gắn custom domain (vd `og.jamesisme.com`, DNS đã ở Cloudflare) vào Worker, dán lại cùng link.
7b. Facebook: paste `/p/<tag>?cache=1`, xem đợt tải ảnh dồn dập sau 1 phút có còn không.
8. Thử route `/js/<tag>` (OG chèn bằng JS), `/r/<tag>` (redirect), `/slow/<tag>` trên từng app.
