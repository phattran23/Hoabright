const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for safe use in HTML content and attributes. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Only allow site-relative or http(s) URLs in href/src; anything else becomes "#". */
export function safeUrl(value) {
  const url = String(value ?? '').trim();
  if (/^\/(?!\/)/.test(url) || /^https?:\/\//i.test(url)) return url;
  return '#';
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** Today's date in Vietnam (UTC+7) as YYYY-MM-DD. */
export function todayVN() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/** "2026-11-20" -> "20 tháng 11, 2026". Returns the fallback when the date is missing or invalid. */
export function formatDate(iso, fallback = '') {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return fallback;
  return `${Number(m[3])} tháng ${Number(m[2])}, ${m[1]}`;
}

export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Compare two secrets without leaking where they differ. */
export async function secretsMatch(a, b) {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** Escape LIKE wildcards so user input is matched literally (use with ESCAPE '\'). */
export function likePattern(q) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
