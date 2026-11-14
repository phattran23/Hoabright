import { ARROW, layout } from './layout.js';
import { searchAll, TOPICS } from './api.js';
import { esc, formatDate, safeUrl, todayVN } from './util.js';

async function getSettings(env) {
  const { results } = await env.DB.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(results.map((r) => [r.key, r.value]));
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' },
  });
}

/* ---------- Shared pieces ---------- */

function pageHead(title, lead = '', crumbs = []) {
  const trail = [{ href: '/', label: 'Trang chủ' }, ...crumbs]
    .map((c) => `<a href="${c.href}">${esc(c.label)}</a>`)
    .join('<span aria-hidden="true">/</span>');
  return `<section class="page-head">
  <div class="container">
    <nav class="crumbs" aria-label="Đường dẫn">${trail}</nav>
    <h1>${esc(title)}</h1>
    ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
  </div>
</section>`;
}

function programList(items) {
  if (!items.length) return '<p class="muted">Đang cập nhật.</p>';
  return `<ul class="program-list">${items
    .map((p) => `<li><a href="/hoc-thuat/${esc(p.slug)}"><span>${esc(p.name)}</span>${ARROW}</a></li>`)
    .join('')}</ul>`;
}

function eventMeta(e) {
  return `${esc(formatDate(e.event_date, '[Ngày]'))} • ${esc(e.location || '[Địa điểm]')}`;
}

function eventDateBadge(e) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(e.event_date ?? '');
  return m
    ? `<span class="date-badge"><span class="date-day">${Number(m[3])}</span><span class="date-month">Th${Number(m[2])} ${m[1]}</span></span>`
    : `<span class="date-badge date-badge-empty"><span class="date-day">–</span><span class="date-month">Sắp có</span></span>`;
}

function postCard(p, variant = '') {
  return `<a class="post-card ${variant}" href="/tin-tuc/${esc(p.slug)}">
  <span class="post-media"><img src="${esc(safeUrl(p.image || '/img/news-feature.svg'))}" alt="" loading="lazy"></span>
  <span class="post-title">${esc(p.title)}</span>
  ${p.excerpt && variant ? `<span class="post-excerpt">${esc(p.excerpt)}</span>` : ''}
  <span class="post-date">${esc(formatDate(p.published_at, '[Ngày đăng]'))}</span>
</a>`;
}

function contactForm(programs = []) {
  const field = (name, label, type = 'text', extra = '') =>
    `<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" ${extra}><p class="field-error" data-error-for="${name}"></p></div>`;
  return `<form class="contact-form" action="/api/inquiries" method="post" novalidate data-contact-form>
  <div class="field field-wide">
    <label for="f-topic">Bạn quan tâm đến</label>
    <select id="f-topic" name="topic" required>${TOPICS.map((t) => `<option>${esc(t)}</option>`).join('')}</select>
    <p class="field-error" data-error-for="topic"></p>
  </div>
  ${field('first_name', 'Tên <span class="req" aria-hidden="true">*</span>', 'text', 'required maxlength="80" autocomplete="given-name"')}
  ${field('last_name', 'Họ <span class="req" aria-hidden="true">*</span>', 'text', 'required maxlength="80" autocomplete="family-name"')}
  ${field('email', 'Email <span class="req" aria-hidden="true">*</span>', 'email', 'required maxlength="160" autocomplete="email"')}
  ${field('phone', 'Số điện thoại', 'tel', 'maxlength="30" autocomplete="tel"')}
  ${field('province', 'Tỉnh/thành', 'text', 'maxlength="80" autocomplete="address-level1"')}
  <div class="field">
    <label for="f-field">Lĩnh vực quan tâm</label>
    <input id="f-field" name="field" type="text" maxlength="120" list="f-field-list">
    <datalist id="f-field-list">${programs.map((p) => `<option value="${esc(p.name)}">`).join('')}</datalist>
  </div>
  <div class="field field-wide">
    <label for="f-message">Nội dung</label>
    <textarea id="f-message" name="message" rows="4" maxlength="2000"></textarea>
  </div>
  <div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
  <div class="form-foot field-wide">
    <a href="/quyen-rieng-tu">Xem chính sách quyền riêng tư</a>
    <button class="btn btn-accent btn-lg" type="submit">Gửi thông tin</button>
  </div>
  <p class="form-status field-wide" role="status" data-form-status></p>
</form>`;
}

function contactSection(settings, programs, { heading = 'h2', notice = '' } = {}) {
  return `<section class="section section-soft" id="lien-he">
  <div class="container contact-grid">
    <div class="contact-intro">
      <${heading} class="display">Kết nối với HoaBright</${heading}>
      <p class="muted">Để lại thông tin, đội ngũ tuyển sinh sẽ liên hệ với bạn. Bạn cũng có thể liên hệ qua ${esc(settings.contact_email)} hoặc ${esc(settings.contact_phone)}.</p>
      <img src="/img/consult.svg" alt="Minh hoạ buổi tư vấn tuyển sinh" loading="lazy">
    </div>
    <div>
      ${notice}
      ${contactForm(programs)}
    </div>
  </div>
</section>`;
}

/* ---------- Pages ---------- */

export async function homePage(env, path) {
  const today = todayVN();
  const [settings, programsRes, eventsRes, postsRes] = await Promise.all([
    getSettings(env),
    env.DB.prepare('SELECT level, name, slug FROM programs ORDER BY sort, id').all(),
    env.DB.prepare(
      `SELECT title, event_date, location FROM events
       WHERE event_date IS NULL OR event_date >= ? ORDER BY event_date IS NULL, event_date, id LIMIT 5`
    ).bind(today).all(),
    env.DB.prepare(
      `SELECT slug, title, excerpt, image, published_at FROM posts
       ORDER BY featured DESC, published_at IS NULL, published_at DESC, id LIMIT 5`
    ).all(),
  ]);
  const programs = programsRes.results;
  const bachelor = programs.filter((p) => p.level === 'bachelor');
  const master = programs.filter((p) => p.level === 'master');
  const events = eventsRes.results;
  const [feature, ...otherPosts] = postsRes.results;
  const partners = String(settings.partners || '').split('\n').map((s) => s.trim()).filter(Boolean);

  const stats = [1, 2, 3, 4]
    .map(
      (i) => `<div class="stat reveal"><p class="stat-value">${esc(settings[`stat${i}_value`])}</p><p class="stat-label">${esc(settings[`stat${i}_label`])}</p></div>`
    )
    .join('');

  const body = `
<section class="hero">
  <img class="hero-img" src="/img/hero.svg" alt="Minh hoạ khuôn viên HoaBright University lúc hoàng hôn" fetchpriority="high">
  <div class="hero-shade"></div>
  <a class="hero-tab" href="/lien-he">Đặt lịch tư vấn</a>
  <div class="container hero-content">
    <p class="eyebrow eyebrow-light">Câu chuyện nổi bật</p>
    <h1>${esc(settings.hero_title)}</h1>
    <div class="hero-actions">
      <a class="btn btn-accent btn-lg" href="${esc(safeUrl(settings.hero_link || '/tin-tuc'))}">Đọc thêm</a>
      <a class="btn btn-ghost-light btn-lg" href="/hoc-thuat">Khám phá ngành học</a>
    </div>
  </div>
</section>

<section class="quicklinks" aria-label="Lối tắt">
  <div class="container quicklinks-grid">
    <a href="/hoc-thuat#cu-nhan"><span>Chương trình Cử nhân</span>${ARROW}</a>
    <a href="/hoc-thuat#thac-si"><span>Chương trình Thạc sĩ</span>${ARROW}</a>
    <a href="/#cong-dong"><span>Đời sống sinh viên</span>${ARROW}</a>
  </div>
</section>

<section class="section" id="hoc-thuat">
  <div class="container split">
    <img class="split-img reveal" src="/img/classroom.svg" alt="Minh hoạ sinh viên thảo luận trong lớp học" loading="lazy">
    <div class="stack-lg">
      <h2 class="display">Lĩnh vực học thuật</h2>
      <div class="stack-sm">
        <p class="eyebrow">Chương trình Cử nhân</p>
        ${programList(bachelor)}
      </div>
      <div class="stack-sm">
        <p class="eyebrow">Chương trình Thạc sĩ</p>
        ${programList(master)}
      </div>
      <a class="text-link" href="/hoc-thuat">Xem tất cả chương trình ${ARROW}</a>
    </div>
  </div>
</section>

<section class="quote">
  <figure class="container quote-inner reveal">
    <blockquote>“${esc(settings.quote_text)}”</blockquote>
    <figcaption>${esc(settings.quote_author)}</figcaption>
  </figure>
</section>

<section class="section" id="tac-dong">
  <div class="container container-narrow stack-xl">
    <h2 class="display display-sm impact-title">${esc(settings.impact_title)}</h2>
    <div class="stats">${stats}</div>
  </div>
</section>

<section class="section section-soft" id="cong-dong">
  <div class="container stack-lg">
    <div class="section-head">
      <h2 class="display display-sm">Cộng đồng HoaBright</h2>
      <a class="text-link" href="/tin-tuc">Xem tất cả bài viết ${ARROW}</a>
    </div>
    <div class="split split-center">
      <img class="split-img split-img-sm reveal" src="/img/student.svg" alt="Minh hoạ chân dung sinh viên HoaBright" loading="lazy">
      <div class="stack-md">
        <p class="testimonial">“${esc(settings.testimonial_text)}”</p>
        <p class="muted small">${esc(settings.testimonial_author)}</p>
        <a class="btn btn-accent" href="/tin-tuc">Đọc tiếp</a>
      </div>
    </div>
  </div>
</section>

<section class="section" id="kiem-dinh">
  <div class="container stack-lg">
    <h2 class="display display-sm">Kiểm định &amp; Công nhận</h2>
    <div class="accred-grid">
      <div class="accred reveal"><div class="logo-slot">[LOGO]</div><div><h3>Chương trình Thạc sĩ</h3><p>${esc(settings.accred_master)}</p></div></div>
      <div class="accred reveal"><div class="logo-slot">[LOGO]</div><div><h3>Chương trình Đại học</h3><p>${esc(settings.accred_bachelor)}</p></div></div>
    </div>
  </div>
</section>

<section class="section section-flush-top" id="su-kien">
  <div class="container container-narrow split split-top">
    <div class="stack-md">
      <h2 class="display display-sm">Sự kiện sắp diễn ra</h2>
      <img class="split-img split-img-xs reveal" src="/img/event.svg" alt="Minh hoạ sự kiện tại HoaBright" loading="lazy">
    </div>
    <div class="stack-md">
      ${
        events.length
          ? `<ul class="event-list">${events
              .map((e) => `<li><a href="/su-kien"><h3>${esc(e.title)}</h3><p>${eventMeta(e)}</p></a></li>`)
              .join('')}</ul>`
          : '<p class="muted">Chưa có sự kiện sắp diễn ra.</p>'
      }
      <a class="text-link" href="/su-kien">Xem tất cả sự kiện ${ARROW}</a>
    </div>
  </div>
</section>

<section class="section section-soft" id="tin-tuc">
  <div class="container stack-lg">
    <div class="section-head">
      <h2 class="display display-sm">Nhịp sống HoaBright</h2>
      <a class="text-link" href="/tin-tuc">Tất cả tin tức ${ARROW}</a>
    </div>
    ${
      feature
        ? `<div class="news-grid">
      ${postCard(feature, 'post-feature')}
      <div class="news-side">${otherPosts.map((p) => postCard(p)).join('')}</div>
    </div>`
        : '<p class="muted">Chưa có bài viết.</p>'
    }
  </div>
</section>

<section class="section" id="khuon-vien">
  <div class="container stack-lg">
    <h2 class="display display-sm">Khuôn viên</h2>
    <div class="campus-grid">
      <img class="reveal" src="/img/campus-1.svg" alt="Minh hoạ cơ sở 1 của HoaBright" loading="lazy">
      <img class="reveal" src="/img/campus-2.svg" alt="Minh hoạ cơ sở 2 của HoaBright về đêm" loading="lazy">
    </div>
  </div>
</section>

${
  partners.length
    ? `<section class="section section-flush-top">
  <div class="container container-narrow stack-md">
    <h2 class="eyebrow">Các đối tác chiến lược</h2>
    <ul class="partners">${partners.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
  </div>
</section>`
    : ''
}

${contactSection(settings, programs)}`;

  return html(layout({ title: '', path, settings, body }));
}

export async function programsPage(env, path) {
  const [settings, { results }] = await Promise.all([
    getSettings(env),
    env.DB.prepare('SELECT level, name, slug, summary FROM programs ORDER BY sort, id').all(),
  ]);
  const group = (level, id, title) => {
    const items = results.filter((p) => p.level === level);
    return `<section class="section" id="${id}">
  <div class="container stack-lg">
    <h2 class="display display-sm">${title}</h2>
    ${
      items.length
        ? `<div class="card-grid">${items
            .map(
              (p) => `<a class="card" href="/hoc-thuat/${esc(p.slug)}"><h3>${esc(p.name)}</h3>${
                p.summary ? `<p>${esc(p.summary.slice(0, 140))}${p.summary.length > 140 ? '…' : ''}</p>` : ''
              }<span class="card-more">Tìm hiểu ${ARROW}</span></a>`
            )
            .join('')}</div>`
        : '<p class="muted">Đang cập nhật.</p>'
    }
  </div>
</section>`;
  };
  const body = `${pageHead('Học thuật', 'Các chương trình đào tạo Cử nhân và Thạc sĩ tại HoaBright University.', [])}
${group('bachelor', 'cu-nhan', 'Chương trình Cử nhân')}
<hr class="rule">
${group('master', 'thac-si', 'Chương trình Thạc sĩ')}
${contactSection(settings, results)}`;
  return html(layout({ title: 'Học thuật', path, settings, body }));
}

export async function programPage(env, path, slug) {
  const [settings, program] = await Promise.all([
    getSettings(env),
    env.DB.prepare('SELECT level, name, slug, summary FROM programs WHERE slug = ?').bind(slug).first(),
  ]);
  if (!program) return notFoundPage(env, path);
  const levelLabel = program.level === 'master' ? 'Chương trình Thạc sĩ' : 'Chương trình Cử nhân';
  const body = `${pageHead(program.name, levelLabel, [{ href: '/hoc-thuat', label: 'Học thuật' }])}
<section class="section">
  <div class="container container-text stack-md">
    ${program.summary ? paragraphs(program.summary) : '<p class="muted">Thông tin chi tiết về chương trình đang được cập nhật.</p>'}
    <div class="cta-row">
      <a class="btn btn-accent btn-lg" href="/lien-he">Đăng ký tư vấn</a>
      <a class="btn btn-outline btn-lg" href="/hoc-thuat">Xem các chương trình khác</a>
    </div>
  </div>
</section>`;
  return html(layout({ title: program.name, description: program.summary.slice(0, 150), path, settings, body }));
}

export async function newsPage(env, path) {
  const [settings, { results }] = await Promise.all([
    getSettings(env),
    env.DB.prepare(
      `SELECT slug, title, excerpt, image, published_at FROM posts
       ORDER BY published_at IS NULL, published_at DESC, id DESC LIMIT 60`
    ).all(),
  ]);
  const body = `${pageHead('Tin tức', 'Nhịp sống HoaBright: câu chuyện, thành tựu và hoạt động của cộng đồng.')}
<section class="section">
  <div class="container">
    ${
      results.length
        ? `<div class="post-grid">${results.map((p) => postCard(p, 'post-tile')).join('')}</div>`
        : '<p class="muted">Chưa có bài viết.</p>'
    }
  </div>
</section>`;
  return html(layout({ title: 'Tin tức', path, settings, body }));
}

function paragraphs(text) {
  return String(text)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) =>
      block.startsWith('## ') ? `<h2>${esc(block.slice(3))}</h2>` : `<p>${esc(block).replace(/\n/g, '<br>')}</p>`
    )
    .join('\n');
}

export async function postPage(env, path, slug) {
  const [settings, post] = await Promise.all([
    getSettings(env),
    env.DB.prepare('SELECT * FROM posts WHERE slug = ?').bind(slug).first(),
  ]);
  if (!post) return notFoundPage(env, path);
  const { results: more } = await env.DB.prepare(
    `SELECT slug, title, excerpt, image, published_at FROM posts WHERE id != ?
     ORDER BY published_at IS NULL, published_at DESC, id DESC LIMIT 3`
  ).bind(post.id).all();

  const body = `<article>
${pageHead(post.title, formatDate(post.published_at, '[Ngày đăng]'), [{ href: '/tin-tuc', label: 'Tin tức' }])}
<section class="section section-tight">
  <div class="container container-text">
    ${post.image ? `<img class="article-img" src="${esc(safeUrl(post.image))}" alt="">` : ''}
    <div class="prose">
      ${post.excerpt ? `<p class="lead">${esc(post.excerpt)}</p>` : ''}
      ${paragraphs(post.body)}
    </div>
  </div>
</section>
</article>
${
  more.length
    ? `<section class="section section-soft">
  <div class="container stack-lg">
    <h2 class="display display-sm">Bài viết khác</h2>
    <div class="post-grid">${more.map((p) => postCard(p, 'post-tile')).join('')}</div>
  </div>
</section>`
    : ''
}`;
  return html(layout({ title: post.title, description: post.excerpt, path, settings, body }));
}

export async function eventsPage(env, path) {
  const today = todayVN();
  const [settings, { results }] = await Promise.all([
    getSettings(env),
    env.DB.prepare('SELECT * FROM events ORDER BY event_date IS NULL, event_date, id').all(),
  ]);
  const upcoming = results.filter((e) => !e.event_date || e.event_date >= today);
  const past = results.filter((e) => e.event_date && e.event_date < today).reverse();
  const list = (items) =>
    `<ul class="event-cards">${items
      .map(
        (e) => `<li class="event-card">${eventDateBadge(e)}<div><h3>${esc(e.title)}</h3><p class="muted small">${eventMeta(e)}</p>${
          e.description ? `<p>${esc(e.description)}</p>` : ''
        }</div></li>`
      )
      .join('')}</ul>`;
  const body = `${pageHead('Sự kiện', 'Hội thảo, ngày hội tuyển sinh và các hoạt động tại HoaBright University.')}
<section class="section">
  <div class="container container-narrow stack-lg">
    <h2 class="display display-sm">Sắp diễn ra</h2>
    ${upcoming.length ? list(upcoming) : '<p class="muted">Chưa có sự kiện sắp diễn ra.</p>'}
  </div>
</section>
${
  past.length
    ? `<section class="section section-soft">
  <div class="container container-narrow stack-lg">
    <h2 class="display display-sm">Đã diễn ra</h2>
    ${list(past)}
  </div>
</section>`
    : ''
}`;
  return html(layout({ title: 'Sự kiện', path, settings, body }));
}

export async function contactPage(env, path, url) {
  const [settings, { results: programs }] = await Promise.all([
    getSettings(env),
    env.DB.prepare('SELECT name FROM programs ORDER BY sort, id').all(),
  ]);
  let notice = '';
  if (url.searchParams.has('sent')) {
    notice = '<p class="notice notice-ok" role="status">Cảm ơn bạn! HoaBright đã nhận được thông tin và sẽ liên hệ sớm.</p>';
  } else if (url.searchParams.has('error')) {
    notice = '<p class="notice notice-error" role="alert">Thông tin chưa hợp lệ. Vui lòng kiểm tra họ tên và email rồi gửi lại.</p>';
  }
  const body = `${pageHead('Liên hệ', 'Đội ngũ tuyển sinh sẵn sàng giải đáp mọi câu hỏi của bạn.')}
${contactSection(settings, programs, { notice })}`;
  const res = html(layout({ title: 'Liên hệ', path, settings, body }));
  res.headers.set('cache-control', 'no-store');
  return res;
}

export async function searchPage(env, path, url) {
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
  const [settings, results] = await Promise.all([getSettings(env), searchAll(env, q)]);
  const body = `${pageHead('Tìm kiếm')}
<section class="section section-tight">
  <div class="container container-text stack-lg">
    <form class="search-inline" action="/tim-kiem" method="get" role="search">
      <label class="sr-only" for="page-q">Từ khoá</label>
      <input id="page-q" name="q" type="search" value="${esc(q)}" placeholder="Tìm ngành học, tin tức, sự kiện…">
      <button class="btn btn-primary" type="submit">Tìm</button>
    </form>
    ${
      q.length < 2
        ? '<p class="muted">Nhập ít nhất 2 ký tự để tìm kiếm.</p>'
        : results.length
          ? `<ul class="result-list">${results
              .map((r) => `<li><a href="${esc(r.url)}"><span class="tag">${esc(r.type)}</span><span>${esc(r.title)}</span></a></li>`)
              .join('')}</ul>`
          : `<p class="muted">Không tìm thấy kết quả cho “${esc(q)}”.</p>`
    }
  </div>
</section>`;
  const res = html(layout({ title: 'Tìm kiếm', path, settings, body }));
  res.headers.set('cache-control', 'no-store');
  return res;
}

export async function privacyPage(env, path) {
  const settings = await getSettings(env);
  const body = `${pageHead('Chính sách quyền riêng tư')}
<section class="section section-tight">
  <div class="container container-text prose">${paragraphs(settings.privacy || '')}</div>
</section>`;
  return html(layout({ title: 'Chính sách quyền riêng tư', path, settings, body }));
}

export async function notFoundPage(env, path) {
  const settings = await getSettings(env);
  const body = `<section class="section not-found">
  <div class="container container-text stack-md">
    <p class="eyebrow">Lỗi 404</p>
    <h1 class="display">Không tìm thấy trang</h1>
    <p class="muted">Trang bạn tìm có thể đã được chuyển đi hoặc không còn tồn tại.</p>
    <div class="cta-row">
      <a class="btn btn-primary btn-lg" href="/">Về trang chủ</a>
      <a class="btn btn-outline btn-lg" href="/tim-kiem">Tìm kiếm</a>
    </div>
  </div>
</section>`;
  const res = html(layout({ title: 'Không tìm thấy trang', path, settings, body }), 404);
  res.headers.set('cache-control', 'no-store');
  return res;
}
