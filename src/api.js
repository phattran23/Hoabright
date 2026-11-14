import { json, likePattern, secretsMatch, slugify } from './util.js';

export const TOPICS = [
  'Điều kiện tuyển sinh',
  'Học phí',
  'Tư vấn chương trình',
  'Học bổng / hỗ trợ tài chính',
  'Câu hỏi khác',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+()\s.-]{8,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ---------- Public: contact form ---------- */

function validateInquiry(input) {
  const str = (k, max) => String(input[k] ?? '').trim().slice(0, max);
  const data = {
    topic: str('topic', 80),
    first_name: str('first_name', 80),
    last_name: str('last_name', 80),
    email: str('email', 160),
    phone: str('phone', 30),
    province: str('province', 80),
    field: str('field', 120),
    message: str('message', 2000),
  };
  const errors = {};
  if (!TOPICS.includes(data.topic)) errors.topic = 'Vui lòng chọn nội dung bạn quan tâm.';
  if (!data.first_name) errors.first_name = 'Vui lòng nhập tên.';
  if (!data.last_name) errors.last_name = 'Vui lòng nhập họ.';
  if (!EMAIL_RE.test(data.email)) errors.email = 'Email chưa đúng định dạng.';
  if (data.phone && !PHONE_RE.test(data.phone)) errors.phone = 'Số điện thoại chưa đúng định dạng.';
  return { data, errors };
}

export async function createInquiry(request, env) {
  // Reject cross-site form posts.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return json({ ok: false, error: 'Yêu cầu không hợp lệ.' }, 403);
  }

  const isJson = (request.headers.get('content-type') || '').includes('application/json');
  let input;
  try {
    input = isJson ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return json({ ok: false, error: 'Dữ liệu không hợp lệ.' }, 400);
  }
  if (!input || typeof input !== 'object') return json({ ok: false, error: 'Dữ liệu không hợp lệ.' }, 400);

  const respond = (ok, body, status) =>
    isJson ? json(body, status) : Response.redirect(new URL(ok ? '/lien-he?sent=1' : '/lien-he?error=1', request.url), 303);

  // Honeypot: real visitors never fill this hidden field. Pretend success to bots.
  if (String(input.website ?? '').trim()) return respond(true, { ok: true }, 200);

  const { data, errors } = validateInquiry(input);
  if (Object.keys(errors).length) return respond(false, { ok: false, errors }, 422);

  await env.DB.prepare(
    `INSERT INTO inquiries (topic, first_name, last_name, email, phone, province, field, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(data.topic, data.first_name, data.last_name, data.email, data.phone, data.province, data.field, data.message)
    .run();

  return respond(true, { ok: true }, 201);
}

/* ---------- Public: search ---------- */

export async function searchAll(env, q) {
  q = String(q ?? '').trim().slice(0, 80);
  if (q.length < 2) return [];
  const p = likePattern(q);
  const [programs, posts, events] = await env.DB.batch([
    env.DB.prepare(`SELECT name, slug, level FROM programs WHERE name LIKE ? ESCAPE '\\' ORDER BY sort LIMIT 8`).bind(p),
    env.DB.prepare(
      `SELECT title, slug FROM posts WHERE title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\'
       ORDER BY published_at DESC LIMIT 8`
    ).bind(p, p),
    env.DB.prepare(`SELECT title FROM events WHERE title LIKE ? ESCAPE '\\' ORDER BY event_date LIMIT 8`).bind(p),
  ]);
  return [
    ...programs.results.map((r) => ({
      type: r.level === 'master' ? 'Thạc sĩ' : 'Cử nhân',
      title: r.name,
      url: `/hoc-thuat/${r.slug}`,
    })),
    ...posts.results.map((r) => ({ type: 'Tin tức', title: r.title, url: `/tin-tuc/${r.slug}` })),
    ...events.results.map((r) => ({ type: 'Sự kiện', title: r.title, url: '/su-kien' })),
  ];
}

/* ---------- Admin ---------- */

const text = (max) => (v) => String(v ?? '').trim().slice(0, max);
const dateOrNull = (v) => (DATE_RE.test(String(v ?? '')) ? String(v) : null);

// Whitelisted columns per collection; each maps to a normaliser.
const COLLECTIONS = {
  programs: {
    order: 'level, sort, id',
    fields: {
      level: (v) => (v === 'master' ? 'master' : 'bachelor'),
      name: text(160),
      slug: (v) => slugify(v),
      summary: text(4000),
      sort: (v) => Number.parseInt(v, 10) || 0,
    },
    required: 'name',
  },
  events: {
    order: 'event_date IS NULL, event_date, id',
    fields: { title: text(200), event_date: dateOrNull, location: text(200), description: text(4000) },
    required: 'title',
  },
  posts: {
    order: 'published_at IS NULL, published_at DESC, id DESC',
    fields: {
      title: text(200),
      slug: (v) => slugify(v),
      excerpt: text(400),
      body: text(40000),
      image: text(400),
      published_at: dateOrNull,
      featured: (v) => (v === true || v === 1 || v === '1' ? 1 : 0),
    },
    required: 'title',
  },
};

async function authorize(request, env) {
  if (!env.ADMIN_TOKEN) return json({ error: 'Chưa cấu hình ADMIN_TOKEN trên máy chủ.' }, 503);
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !(await secretsMatch(token, env.ADMIN_TOKEN))) {
    return json({ error: 'Mật khẩu quản trị không đúng.' }, 401);
  }
  return null;
}

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

export async function handleAdmin(request, env, segments) {
  const denied = await authorize(request, env);
  if (denied) return denied;

  const [name, idRaw] = segments;
  const method = request.method;
  const id = idRaw ? Number.parseInt(idRaw, 10) : null;
  if (idRaw && !Number.isInteger(id)) return json({ error: 'ID không hợp lệ.' }, 400);

  if (name === 'settings') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare('SELECT key, value FROM settings ORDER BY key').all();
      return json(Object.fromEntries(results.map((r) => [r.key, r.value])));
    }
    if (method === 'PUT') {
      const body = await readBody(request);
      if (!body) return json({ error: 'Dữ liệu không hợp lệ.' }, 400);
      const entries = Object.entries(body).filter(([k]) => /^[a-z0-9_]{1,40}$/.test(k));
      if (entries.length) {
        await env.DB.batch(
          entries.map(([k, v]) =>
            env.DB.prepare(
              'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
            ).bind(k, String(v ?? '').slice(0, 20000))
          )
        );
      }
      return json({ ok: true });
    }
    return json({ error: 'Phương thức không được hỗ trợ.' }, 405);
  }

  if (name === 'inquiries') {
    if (method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM inquiries ORDER BY created_at DESC, id DESC LIMIT 500').all();
      return json(results);
    }
    if (method === 'PUT' && id) {
      const body = await readBody(request);
      const status = body?.status === 'done' ? 'done' : 'new';
      await env.DB.prepare('UPDATE inquiries SET status = ? WHERE id = ?').bind(status, id).run();
      return json({ ok: true });
    }
    if (method === 'DELETE' && id) {
      await env.DB.prepare('DELETE FROM inquiries WHERE id = ?').bind(id).run();
      return json({ ok: true });
    }
    return json({ error: 'Phương thức không được hỗ trợ.' }, 405);
  }

  const col = COLLECTIONS[name];
  if (!col) return json({ error: 'Không tìm thấy.' }, 404);

  if (method === 'GET') {
    const { results } = await env.DB.prepare(`SELECT * FROM ${name} ORDER BY ${col.order}`).all();
    return json(results);
  }

  if (method === 'DELETE' && id) {
    await env.DB.prepare(`DELETE FROM ${name} WHERE id = ?`).bind(id).run();
    return json({ ok: true });
  }

  if ((method === 'POST' && !id) || (method === 'PUT' && id)) {
    const body = await readBody(request);
    if (!body) return json({ error: 'Dữ liệu không hợp lệ.' }, 400);
    const row = {};
    for (const [key, normalise] of Object.entries(col.fields)) row[key] = normalise(body[key]);
    if (!row[col.required]) return json({ error: 'Vui lòng nhập tiêu đề / tên.' }, 422);
    if ('slug' in row && !row.slug) row.slug = slugify(row[col.required]) || `muc-${Date.now()}`;

    const keys = Object.keys(row);
    try {
      if (method === 'POST') {
        const res = await env.DB.prepare(
          `INSERT INTO ${name} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
        )
          .bind(...keys.map((k) => row[k]))
          .run();
        return json({ ok: true, id: res.meta.last_row_id }, 201);
      }
      await env.DB.prepare(`UPDATE ${name} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`)
        .bind(...keys.map((k) => row[k]), id)
        .run();
      return json({ ok: true });
    } catch (err) {
      if (String(err?.message).includes('UNIQUE')) {
        return json({ error: 'Đường dẫn (slug) đã tồn tại, hãy chọn đường dẫn khác.' }, 409);
      }
      throw err;
    }
  }

  return json({ error: 'Phương thức không được hỗ trợ.' }, 405);
}
