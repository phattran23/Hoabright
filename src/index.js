import { createInquiry, handleAdmin, searchAll } from './api.js';
import {
  contactPage,
  eventsPage,
  homePage,
  newsPage,
  notFoundPage,
  postPage,
  privacyPage,
  programPage,
  programsPage,
  searchPage,
} from './pages.js';
import { json } from './util.js';

const SECURITY_HEADERS = {
  'content-security-policy':
    "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
};

async function route(request, env) {
  const url = new URL(request.url);
  // Normalise trailing slashes so each page has one address.
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/';
  const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
  const method = request.method;

  if (seg[0] === 'api') {
    if (seg[1] === 'inquiries' && seg.length === 2) {
      return method === 'POST' ? createInquiry(request, env) : json({ error: 'Phương thức không được hỗ trợ.' }, 405);
    }
    if (seg[1] === 'search' && seg.length === 2 && method === 'GET') {
      return json(await searchAll(env, url.searchParams.get('q')));
    }
    if (seg[1] === 'admin' && seg.length >= 3 && seg.length <= 4) {
      return handleAdmin(request, env, seg.slice(2));
    }
    return json({ error: 'Không tìm thấy.' }, 404);
  }

  if (method !== 'GET' && method !== 'HEAD') return new Response('Method Not Allowed', { status: 405 });

  if (seg.length === 0) return homePage(env, path);
  if (seg.length === 1) {
    switch (seg[0]) {
      case 'hoc-thuat': return programsPage(env, path);
      case 'tin-tuc': return newsPage(env, path);
      case 'su-kien': return eventsPage(env, path);
      case 'lien-he': return contactPage(env, path, url);
      case 'tim-kiem': return searchPage(env, path, url);
      case 'quyen-rieng-tu': return privacyPage(env, path);
    }
  }
  if (seg.length === 2 && seg[0] === 'hoc-thuat') return programPage(env, path, seg[1]);
  if (seg.length === 2 && seg[0] === 'tin-tuc') return postPage(env, path, seg[1]);

  return notFoundPage(env, path);
}

export default {
  async fetch(request, env) {
    let response;
    try {
      response = await route(request, env);
    } catch (err) {
      console.error(err);
      const isApi = new URL(request.url).pathname.startsWith('/api/');
      response = isApi
        ? json({ error: 'Đã có lỗi xảy ra. Vui lòng thử lại.' }, 500)
        : new Response('Đã có lỗi xảy ra. Vui lòng thử lại sau.', {
            status: 500,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          });
    }
    // Redirect responses are immutable; copy before adding headers.
    response = new Response(response.body, response);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) response.headers.set(k, v);
    return response;
  },
};
