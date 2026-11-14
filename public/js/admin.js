(() => {
  'use strict';

  const KEY = 'hb_admin_token';
  const $ = (sel) => document.querySelector(sel);

  /** Tiny DOM builder: h('td', { class: 'x' }, 'text', childNode) */
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = Boolean(v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    el.append(...children.filter((c) => c != null && c !== false));
    return el;
  }

  /* ---------- Schemas ---------- */

  const COLLECTIONS = {
    posts: {
      title: 'Bài viết',
      singular: 'bài viết',
      columns: [
        ['Tiêu đề', (r) => [r.title, h('span', { class: 'sub' }, `/tin-tuc/${r.slug}`)]],
        ['Ngày đăng', (r) => r.published_at || '—'],
        ['Nổi bật', (r) => (r.featured ? 'Có' : '')],
      ],
      fields: [
        { name: 'title', label: 'Tiêu đề', wide: true, required: true },
        { name: 'slug', label: 'Đường dẫn (để trống sẽ tự tạo)' },
        { name: 'published_at', label: 'Ngày đăng', type: 'date' },
        { name: 'image', label: 'Ảnh (đường dẫn, ví dụ /img/news-lab.svg hoặc https://…)', wide: true },
        { name: 'excerpt', label: 'Tóm tắt', type: 'textarea', rows: 2, wide: true },
        { name: 'body', label: 'Nội dung (cách đoạn bằng một dòng trống; "## " ở đầu để tạo tiêu đề phụ)', type: 'textarea', rows: 10, wide: true },
        { name: 'featured', label: 'Bài nổi bật trên trang chủ', type: 'checkbox', wide: true },
      ],
    },
    events: {
      title: 'Sự kiện',
      singular: 'sự kiện',
      columns: [
        ['Tên sự kiện', (r) => r.title],
        ['Ngày', (r) => r.event_date || '—'],
        ['Địa điểm', (r) => r.location || '—'],
      ],
      fields: [
        { name: 'title', label: 'Tên sự kiện', wide: true, required: true },
        { name: 'event_date', label: 'Ngày diễn ra', type: 'date' },
        { name: 'location', label: 'Địa điểm' },
        { name: 'description', label: 'Mô tả', type: 'textarea', rows: 4, wide: true },
      ],
    },
    programs: {
      title: 'Ngành học',
      singular: 'ngành học',
      columns: [
        ['Tên', (r) => [r.name, h('span', { class: 'sub' }, `/hoc-thuat/${r.slug}`)]],
        ['Bậc', (r) => (r.level === 'master' ? 'Thạc sĩ' : 'Cử nhân')],
        ['Thứ tự', (r) => String(r.sort)],
      ],
      fields: [
        { name: 'name', label: 'Tên ngành / chuyên ngành', wide: true, required: true },
        { name: 'level', label: 'Bậc đào tạo', type: 'select', options: [['bachelor', 'Cử nhân'], ['master', 'Thạc sĩ']] },
        { name: 'sort', label: 'Thứ tự hiển thị', type: 'number' },
        { name: 'slug', label: 'Đường dẫn (để trống sẽ tự tạo)', wide: true },
        { name: 'summary', label: 'Giới thiệu', type: 'textarea', rows: 6, wide: true },
      ],
    },
  };

  const SETTINGS = [
    ['Trang chủ – phần mở đầu', [
      ['hero_title', 'Tiêu đề lớn', 'textarea'],
      ['hero_link', 'Liên kết nút "Đọc thêm"'],
    ]],
    ['Trích dẫn', [
      ['quote_text', 'Câu trích dẫn', 'textarea'],
      ['quote_author', 'Họ tên – Chức danh'],
    ]],
    ['Số liệu tác động', [
      ['impact_title', 'Tiêu đề phần', 'textarea'],
      ['stat1_value', 'Số liệu 1'], ['stat1_label', 'Chú thích 1'],
      ['stat2_value', 'Số liệu 2'], ['stat2_label', 'Chú thích 2'],
      ['stat3_value', 'Số liệu 3'], ['stat3_label', 'Chú thích 3'],
      ['stat4_value', 'Số liệu 4'], ['stat4_label', 'Chú thích 4'],
    ]],
    ['Cộng đồng', [
      ['testimonial_text', 'Chia sẻ của sinh viên', 'textarea'],
      ['testimonial_author', 'Họ tên · Ngành, Khoá'],
    ]],
    ['Kiểm định & Đối tác', [
      ['accred_master', 'Kiểm định – Thạc sĩ', 'textarea'],
      ['accred_bachelor', 'Kiểm định – Đại học', 'textarea'],
      ['partners', 'Đối tác chiến lược (mỗi dòng một tên)', 'textarea'],
    ]],
    ['Thông tin liên hệ', [
      ['contact_email', 'Email'],
      ['contact_phone', 'Số điện thoại'],
      ['address', 'Địa chỉ cơ sở chính', 'textarea'],
    ]],
    ['Chính sách quyền riêng tư', [['privacy', 'Nội dung (cách đoạn bằng một dòng trống)', 'textarea-lg']]],
  ];

  /* ---------- State + API ---------- */

  let token = sessionStorage.getItem(KEY) || '';
  let tab = 'inquiries';
  let editing = null; // { collection, id }

  const els = {
    login: $('[data-login]'),
    loginForm: $('[data-login-form]'),
    loginStatus: $('[data-login-status]'),
    app: $('[data-app]'),
    tabs: $('[data-tabs]'),
    title: $('[data-title]'),
    add: $('[data-add]'),
    status: $('[data-status]'),
    view: $('[data-view]'),
    editor: $('[data-editor]'),
    editorForm: $('[data-editor-form]'),
    editorTitle: $('[data-editor-title]'),
    editorFields: $('[data-editor-fields]'),
    editorStatus: $('[data-editor-status]'),
  };

  function setStatus(el, text, kind) {
    el.textContent = text || '';
    el.className = `form-status${kind ? ` is-${kind}` : ''}`;
  }

  async function api(path, options = {}) {
    const res = await fetch(`/api/admin/${path}`, {
      ...options,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      logout();
      throw new Error(data.error || 'Phiên đăng nhập đã hết hạn.');
    }
    if (!res.ok) throw new Error(data.error || 'Đã có lỗi xảy ra.');
    return data;
  }

  function logout() {
    token = '';
    sessionStorage.removeItem(KEY);
    els.app.hidden = true;
    els.login.hidden = false;
  }

  /* ---------- Views ---------- */

  function table(headers, rows) {
    return h('div', { class: 'table-wrap' },
      h('table', {},
        h('thead', {}, h('tr', {}, ...headers.map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, ...rows)));
  }

  async function showInquiries() {
    const rows = await api('inquiries');
    if (!rows.length) return els.view.replaceChildren(h('p', { class: 'empty' }, 'Chưa có liên hệ nào.'));
    els.view.replaceChildren(
      table(['Thời gian', 'Người gửi', 'Quan tâm', 'Nội dung', 'Trạng thái', ''],
        rows.map((r) => {
          const done = r.status === 'done';
          return h('tr', { class: done ? 'row-done' : '' },
            h('td', {}, r.created_at.replace('T', ' ').slice(0, 16), h('span', { class: 'sub' }, 'UTC')),
            h('td', {}, `${r.last_name} ${r.first_name}`,
              h('span', { class: 'sub' }, r.email),
              r.phone && h('span', { class: 'sub' }, r.phone),
              r.province && h('span', { class: 'sub' }, r.province)),
            h('td', {}, r.topic, r.field && h('span', { class: 'sub' }, r.field)),
            h('td', { class: 'msg' }, r.message || '—'),
            h('td', {}, h('span', { class: `pill${done ? ' done' : ''}` }, done ? 'Đã xử lý' : 'Mới')),
            h('td', { class: 'actions' },
              h('button', { class: 'link-btn', type: 'button', onclick: () => act(() => api(`inquiries/${r.id}`, { method: 'PUT', body: { status: done ? 'new' : 'done' } })) },
                done ? 'Đánh dấu mới' : 'Đã xử lý'),
              ' ',
              h('button', { class: 'link-btn danger', type: 'button', onclick: () => confirm('Xoá liên hệ này? Không thể khôi phục.') && act(() => api(`inquiries/${r.id}`, { method: 'DELETE' })) }, 'Xoá')));
        })));
  }

  async function showCollection(name) {
    const col = COLLECTIONS[name];
    const rows = await api(name);
    if (!rows.length) return els.view.replaceChildren(h('p', { class: 'empty' }, `Chưa có ${col.singular} nào. Bấm "Thêm mới" để bắt đầu.`));
    els.view.replaceChildren(
      table([...col.columns.map((c) => c[0]), ''],
        rows.map((r) =>
          h('tr', {},
            ...col.columns.map(([, render]) => h('td', {}, ...[].concat(render(r)))),
            h('td', { class: 'actions' },
              h('button', { class: 'link-btn', type: 'button', onclick: () => openEditor(name, r) }, 'Sửa'),
              ' ',
              h('button', { class: 'link-btn danger', type: 'button', onclick: () => confirm(`Xoá ${col.singular} này? Không thể khôi phục.`) && act(() => api(`${name}/${r.id}`, { method: 'DELETE' })) }, 'Xoá'))))));
  }

  async function showSettings() {
    const values = await api('settings');
    const form = h('form', { class: 'settings-form' },
      ...SETTINGS.map(([group, fields]) =>
        h('div', { class: 'settings-group' },
          h('h2', {}, group),
          ...fields.map(([key, label, type]) => {
            const id = `s-${key}`;
            const area = type && type.startsWith('textarea');
            const input = area
              ? h('textarea', { id, name: key, rows: type === 'textarea-lg' ? 12 : 3, value: values[key] || '' })
              : h('input', { id, name: key, type: 'text', value: values[key] || '' });
            return h('div', { class: `field${area ? ' field-wide' : ''}` }, h('label', { for: id }, label), input);
          }))),
      h('button', { class: 'btn btn-primary btn-lg settings-save', type: 'submit' }, 'Lưu thay đổi'));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('settings', { method: 'PUT', body: Object.fromEntries(new FormData(form)) });
        setStatus(els.status, 'Đã lưu nội dung trang. Trang công khai cập nhật sau khoảng 1 phút.', 'ok');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        setStatus(els.status, err.message, 'error');
      }
    });
    els.view.replaceChildren(form);
  }

  async function render() {
    els.tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.tab === tab)));
    const col = COLLECTIONS[tab];
    els.title.textContent = col ? col.title : tab === 'settings' ? 'Nội dung trang' : 'Liên hệ từ biểu mẫu';
    els.add.hidden = !col;
    els.view.replaceChildren(h('p', { class: 'empty' }, 'Đang tải…'));
    try {
      if (tab === 'inquiries') await showInquiries();
      else if (tab === 'settings') await showSettings();
      else await showCollection(tab);
    } catch (err) {
      els.view.replaceChildren();
      setStatus(els.status, err.message, 'error');
    }
  }

  async function act(fn) {
    try {
      await fn();
      setStatus(els.status, 'Đã cập nhật.', 'ok');
      await render();
    } catch (err) {
      setStatus(els.status, err.message, 'error');
    }
  }

  /* ---------- Editor dialog ---------- */

  function openEditor(name, row) {
    const col = COLLECTIONS[name];
    editing = { collection: name, id: row ? row.id : null };
    els.editorTitle.textContent = `${row ? 'Sửa' : 'Thêm'} ${col.singular}`;
    setStatus(els.editorStatus, '');
    els.editorFields.replaceChildren(
      ...col.fields.map((f) => {
        const id = `e-${f.name}`;
        const value = row ? row[f.name] ?? '' : f.type === 'number' ? 0 : '';
        if (f.type === 'checkbox') {
          return h('div', { class: 'field field-wide check' },
            h('input', { id, name: f.name, type: 'checkbox', checked: Boolean(value) }),
            h('label', { for: id }, f.label));
        }
        let input;
        if (f.type === 'textarea') input = h('textarea', { id, name: f.name, rows: f.rows || 4, value });
        else if (f.type === 'select') {
          input = h('select', { id, name: f.name }, ...f.options.map(([v, t]) => h('option', { value: v }, t)));
          input.value = value || f.options[0][0];
        } else input = h('input', { id, name: f.name, type: f.type || 'text', value, required: f.required });
        return h('div', { class: `field${f.wide ? ' field-wide' : ''}` }, h('label', { for: id }, f.label), input);
      }));
    els.editor.showModal();
  }

  els.editorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { collection, id } = editing;
    const body = {};
    for (const f of COLLECTIONS[collection].fields) {
      const input = els.editorForm.elements[f.name];
      body[f.name] = f.type === 'checkbox' ? (input.checked ? 1 : 0) : input.value;
    }
    try {
      await api(id ? `${collection}/${id}` : collection, { method: id ? 'PUT' : 'POST', body });
      els.editor.close();
      setStatus(els.status, 'Đã lưu. Trang công khai cập nhật sau khoảng 1 phút.', 'ok');
      await render();
    } catch (err) {
      setStatus(els.editorStatus, err.message, 'error');
    }
  });
  $('[data-editor-cancel]').addEventListener('click', () => els.editor.close());

  /* ---------- Wiring ---------- */

  els.tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    tab = btn.dataset.tab;
    setStatus(els.status, '');
    render();
  });
  els.add.addEventListener('click', () => openEditor(tab, null));
  $('[data-logout]').addEventListener('click', logout);

  async function enter() {
    els.login.hidden = true;
    els.app.hidden = false;
    await render();
  }

  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    token = $('#token').value;
    setStatus(els.loginStatus, '');
    try {
      const res = await fetch('/api/admin/inquiries', { headers: { authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        token = '';
        return setStatus(els.loginStatus, data.error || 'Không đăng nhập được.', 'error');
      }
      sessionStorage.setItem(KEY, token);
      $('#token').value = '';
      await enter();
    } catch {
      token = '';
      setStatus(els.loginStatus, 'Mất kết nối. Vui lòng thử lại.', 'error');
    }
  });

  if (token) enter();
})();
