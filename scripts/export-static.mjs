// Xuất bản xem trước tĩnh (cho GitHub Pages) từ máy chủ dev đang chạy.
// Cách dùng:  node scripts/export-static.mjs <thư-mục-đích> [tiền-tố] [địa-chỉ-dev]
// Ví dụ:      node scripts/export-static.mjs ../preview /Hoabright http://localhost:8787
// Bản tĩnh không có backend: biểu mẫu liên hệ, tìm kiếm và /admin không hoạt động.
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = resolve(process.argv[2] || 'preview');
const prefix = (process.argv[3] || '').replace(/\/+$/, '');
const origin = process.argv[4] || 'http://localhost:8787';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const NOTICE =
  '<p class="notice notice-error" role="note">Bản xem trước tĩnh trên GitHub Pages: biểu mẫu liên hệ, tìm kiếm và trang quản trị chỉ hoạt động sau khi publish lên Cloudflare.</p>';

function rewrite(html) {
  return html
    .replace(/\b(href|src|action|content)="\/(?!\/)/g, `$1="${prefix}/`)
    .replace('<main id="noi-dung">', `<main id="noi-dung">\n${NOTICE}`);
}

const seen = new Set();
const queue = ['/'];
let count = 0;

while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);
  const res = await fetch(origin + path);
  if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) continue;
  const html = await res.text();

  // Follow internal page links (skip files, API, admin, search and anchors).
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const clean = href.length > 1 ? href.replace(/\/+$/, '') : href;
    if (/\.[a-z0-9]+$/i.test(clean) || /^\/(api|admin|tim-kiem)/.test(clean)) continue;
    if (!seen.has(clean)) queue.push(clean);
  }

  const file = join(out, decodeURIComponent(path), 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, rewrite(html));
  count++;
}

const notFound = await (await fetch(origin + '/trang-khong-ton-tai')).text();
await writeFile(join(out, '404.html'), rewrite(notFound));

for (const dir of ['css', 'js', 'img']) await cp(join(root, 'public', dir), join(out, dir), { recursive: true });
await cp(join(root, 'public', 'favicon.svg'), join(out, 'favicon.svg'));
await rm(join(out, 'js', 'admin.js'), { force: true });
await rm(join(out, 'css', 'admin.css'), { force: true });
await writeFile(join(out, '.nojekyll'), '');

console.log(`Đã xuất ${count} trang + 404 vào ${out}`);
