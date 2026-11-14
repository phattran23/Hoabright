-- HoaBright University — cấu trúc dữ liệu và nội dung khởi tạo.
-- Nội dung trong [ngoặc vuông] là chỗ trống cần điền; sửa tại trang /admin.

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE programs (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  level   TEXT NOT NULL CHECK (level IN ('bachelor', 'master')),
  name    TEXT NOT NULL,
  slug    TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL DEFAULT '',
  sort    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  event_date  TEXT,               -- YYYY-MM-DD, để trống nếu chưa chốt ngày
  location    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_events_date ON events (event_date);

CREATE TABLE posts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  excerpt      TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  image        TEXT NOT NULL DEFAULT '',
  published_at TEXT,              -- YYYY-MM-DD
  featured     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_posts_published ON posts (published_at);

CREATE TABLE inquiries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  topic      TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  province   TEXT NOT NULL DEFAULT '',
  field      TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'done')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_inquiries_created ON inquiries (created_at);

INSERT INTO settings (key, value) VALUES
  ('hero_title', '[Tiêu đề câu chuyện nổi bật của HoaBright University]'),
  ('hero_link', '/tin-tuc'),
  ('quote_text', '[Câu trích dẫn thể hiện triết lý giáo dục của HoaBright University]'),
  ('quote_author', '[Họ tên – Chức danh]'),
  ('impact_title', 'Kiến tạo tác động: từ nền tảng học thuật đến giá trị xã hội'),
  ('stat1_value', '[SỐ]'),  ('stat1_label', '[Năm hoạt động / di sản học thuật]'),
  ('stat2_value', '[SỐ]%'), ('stat2_label', '[Tỷ lệ sinh viên có việc làm sau tốt nghiệp]'),
  ('stat3_value', '[SỐ]+'), ('stat3_label', '[Mạng lưới cựu sinh viên]'),
  ('stat4_value', '[SỐ]'),  ('stat4_label', '[Đối tác học thuật trong và ngoài nước]'),
  ('testimonial_text', '[Chia sẻ của một sinh viên về trải nghiệm học tập tại HoaBright]'),
  ('testimonial_author', '[Họ tên] · [Ngành học, Khoá]'),
  ('accred_master', '[Tổ chức kiểm định và nội dung công nhận của chương trình]'),
  ('accred_bachelor', '[Tổ chức kiểm định và nội dung công nhận của chương trình]'),
  ('partners', '[Đối tác 1]
[Đối tác 2]
[Đối tác 3]
[Đối tác 4]
[Đối tác 5]'),
  ('contact_email', '[EMAIL]'),
  ('contact_phone', '[SỐ ĐIỆN THOẠI]'),
  ('address', '[Địa chỉ cơ sở chính]'),
  ('privacy', '[Nội dung chính sách quyền riêng tư của HoaBright University]');

INSERT INTO programs (level, name, slug, summary, sort) VALUES
  ('bachelor', '[Ngành học 1]', 'nganh-hoc-1', '', 1),
  ('bachelor', '[Ngành học 2]', 'nganh-hoc-2', '', 2),
  ('bachelor', '[Ngành học 3]', 'nganh-hoc-3', '', 3),
  ('bachelor', '[Ngành học 4]', 'nganh-hoc-4', '', 4),
  ('bachelor', '[Ngành học 5]', 'nganh-hoc-5', '', 5),
  ('bachelor', '[Ngành học 6]', 'nganh-hoc-6', '', 6),
  ('bachelor', '[Ngành học 7]', 'nganh-hoc-7', '', 7),
  ('bachelor', '[Ngành học 8]', 'nganh-hoc-8', '', 8),
  ('master', '[Chuyên ngành 1]', 'chuyen-nganh-1', '', 1),
  ('master', '[Chuyên ngành 2]', 'chuyen-nganh-2', '', 2);

INSERT INTO events (title, event_date, location) VALUES
  ('[Tên sự kiện 1]', NULL, ''),
  ('[Tên sự kiện 2]', NULL, ''),
  ('[Tên sự kiện 3]', NULL, ''),
  ('[Tên sự kiện 4]', NULL, ''),
  ('[Tên sự kiện 5]', NULL, '');

INSERT INTO posts (slug, title, excerpt, body, image, published_at, featured) VALUES
  ('bai-viet-noi-bat', '[Tiêu đề bài viết nổi bật]', '', '[Nội dung bài viết]', '/img/news-feature.svg', NULL, 1),
  ('bai-viet-2', '[Tiêu đề bài viết 2]', '', '[Nội dung bài viết]', '/img/news-books.svg', NULL, 0),
  ('bai-viet-3', '[Tiêu đề bài viết 3]', '', '[Nội dung bài viết]', '/img/news-graduation.svg', NULL, 0),
  ('bai-viet-4', '[Tiêu đề bài viết 4]', '', '[Nội dung bài viết]', '/img/news-globe.svg', NULL, 0),
  ('bai-viet-5', '[Tiêu đề bài viết 5]', '', '[Nội dung bài viết]', '/img/news-lab.svg', NULL, 0);
