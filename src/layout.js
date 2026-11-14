import { esc } from './util.js';

const NAV = [
  { href: '/hoc-thuat', label: 'Học thuật' },
  { href: '/tin-tuc', label: 'Tin tức' },
  { href: '/su-kien', label: 'Sự kiện' },
  { href: '/#cong-dong', label: 'Đời sống sinh viên' },
  { href: '/#tac-dong', label: 'Về HoaBright' },
];

const LOGO = `<svg class="logo-mark" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="20" cy="11" rx="5" ry="9"/><ellipse cx="20" cy="11" rx="5" ry="9" transform="rotate(72 20 20)"/><ellipse cx="20" cy="11" rx="5" ry="9" transform="rotate(144 20 20)"/><ellipse cx="20" cy="11" rx="5" ry="9" transform="rotate(216 20 20)"/><ellipse cx="20" cy="11" rx="5" ry="9" transform="rotate(288 20 20)"/></g><circle cx="20" cy="20" r="3" fill="#FFAD1D"/></svg>`;

const ICON_SEARCH = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`;
const ICON_MENU = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`;
const ICON_CLOSE = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

export const ARROW = `<svg class="arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

function isActive(href, path) {
  if (href.includes('#')) return false;
  return path === href || path.startsWith(href + '/');
}

export function layout({ title, description = '', path = '/', settings = {}, body }) {
  const fullTitle = title ? `${title} – HoaBright University` : 'HoaBright University';
  const nav = NAV.map(
    (n) => `<a href="${n.href}"${isActive(n.href, path) ? ' aria-current="page"' : ''}>${n.label}</a>`
  ).join('');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || 'HoaBright University – chương trình Cử nhân và Thạc sĩ, đời sống sinh viên, tin tức và sự kiện.')}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:type" content="website">
<meta property="og:image" content="/img/hero.svg">
<meta name="theme-color" content="#00196E">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/css/site.css">
<script src="/js/site.js" defer></script>
</head>
<body>
<a class="skip-link" href="#noi-dung">Bỏ qua, đến nội dung chính</a>

<div class="utility">
  <div class="container utility-inner">
    <a href="/tin-tuc">Bản tin</a>
    <a href="/su-kien">Sự kiện</a>
    <a href="/lien-he">Liên hệ</a>
  </div>
</div>

<header class="site-header" data-header>
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="HoaBright University – Trang chủ">
      ${LOGO}
      <span class="brand-text"><span class="brand-name">HoaBright</span><span class="brand-sub">University</span></span>
    </a>
    <nav class="main-nav" id="main-nav" aria-label="Điều hướng chính" data-nav>
      ${nav}
      <a class="btn btn-primary nav-cta" href="/lien-he">Hỏi HoaBright</a>
    </nav>
    <div class="header-actions">
      <a class="btn btn-primary header-cta" href="/lien-he">Hỏi HoaBright</a>
      <a class="icon-btn" href="/tim-kiem" aria-label="Tìm kiếm" data-search-open>${ICON_SEARCH}</a>
      <button class="icon-btn menu-btn" type="button" aria-label="Mở menu" aria-expanded="false" aria-controls="main-nav" data-menu-toggle>
        <span class="menu-open">${ICON_MENU}</span><span class="menu-close">${ICON_CLOSE}</span>
      </button>
    </div>
  </div>
</header>

<dialog class="search-dialog" data-search-dialog aria-label="Tìm kiếm">
  <form class="search-form" action="/tim-kiem" method="get" role="search">
    <label class="sr-only" for="search-q">Tìm kiếm ngành học, tin tức, sự kiện</label>
    ${ICON_SEARCH}
    <input id="search-q" name="q" type="search" placeholder="Tìm ngành học, tin tức, sự kiện…" autocomplete="off" data-search-input>
    <button class="icon-btn icon-btn-plain" type="button" aria-label="Đóng tìm kiếm" data-search-close>${ICON_CLOSE}</button>
  </form>
  <div class="search-results" data-search-results aria-live="polite"></div>
</dialog>

<main id="noi-dung">
${body}
</main>

<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <span class="footer-name">HoaBright University</span>
        <span>${esc(settings.address)}</span>
        <span>${esc(settings.contact_email)} · ${esc(settings.contact_phone)}</span>
      </div>
      <div class="footer-col">
        <h2>Học tập tại HoaBright</h2>
        <a href="/hoc-thuat#cu-nhan">Chương trình Cử nhân</a>
        <a href="/hoc-thuat#thac-si">Chương trình Thạc sĩ</a>
        <a href="/lien-he">Hỏi đáp về tuyển sinh</a>
      </div>
      <div class="footer-col">
        <h2>Đời sống sinh viên</h2>
        <a href="/#cong-dong">Cộng đồng HoaBright</a>
        <a href="/#khuon-vien">Khuôn viên</a>
        <a href="/su-kien">Sự kiện</a>
      </div>
      <div class="footer-col">
        <h2>Về HoaBright</h2>
        <a href="/#tac-dong">Tác động</a>
        <a href="/#kiem-dinh">Kiểm định &amp; Công nhận</a>
        <a href="/tin-tuc">Tin tức</a>
        <a href="/lien-he">Liên hệ</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>Copyright © ${new Date().getFullYear()} HoaBright University</span>
      <a href="/quyen-rieng-tu">Chính sách quyền riêng tư</a>
    </div>
  </div>
</footer>
</body>
</html>`;
}
