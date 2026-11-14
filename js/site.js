(() => {
  'use strict';
  document.documentElement.classList.add('js');

  /* Header shadow on scroll */
  const header = document.querySelector('[data-header]');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  const nav = document.querySelector('[data-nav]');
  const menuBtn = document.querySelector('[data-menu-toggle]');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
  };
  if (nav && menuBtn) {
    menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => e.target.closest('a') && setMenu(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        menuBtn.focus();
      }
    });
  }

  /* Search dialog with live results */
  const dialog = document.querySelector('[data-search-dialog]');
  const openBtn = document.querySelector('[data-search-open]');
  if (dialog && openBtn && typeof dialog.showModal === 'function') {
    const input = dialog.querySelector('[data-search-input]');
    const box = dialog.querySelector('[data-search-results]');
    let timer;
    let lastQuery = '';

    const message = (text) => {
      const p = document.createElement('p');
      p.textContent = text;
      box.replaceChildren(p);
    };

    const render = (items, q) => {
      if (!items.length) return message(`Không tìm thấy kết quả cho “${q}”.`);
      box.replaceChildren(
        ...items.map((item) => {
          const a = document.createElement('a');
          a.href = item.url;
          const tag = document.createElement('span');
          tag.className = 'tag';
          tag.textContent = item.type;
          const title = document.createElement('span');
          title.textContent = item.title;
          a.append(tag, title);
          return a;
        })
      );
    };

    const run = async () => {
      const q = input.value.trim();
      lastQuery = q;
      if (q.length < 2) return box.replaceChildren();
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const items = await res.json();
        if (q === lastQuery) render(Array.isArray(items) ? items : [], q);
      } catch {
        if (q === lastQuery) message('Không tải được kết quả. Nhấn Enter để tìm.');
      }
    };

    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      dialog.showModal();
      input.focus();
    });
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(run, 200);
    });
    dialog.querySelector('[data-search-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => e.target === dialog && dialog.close());
  }

  /* Contact form: inline validation + submit without leaving the page */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^[0-9+()\s.-]{8,20}$/;

  document.querySelectorAll('[data-contact-form]').forEach((form) => {
    const status = form.querySelector('[data-form-status]');
    const submit = form.querySelector('button[type="submit"]');

    const setError = (name, text) => {
      const field = form.elements[name];
      const slot = form.querySelector(`[data-error-for="${name}"]`);
      if (slot) slot.textContent = text || '';
      if (field) {
        if (text) field.setAttribute('aria-invalid', 'true');
        else field.removeAttribute('aria-invalid');
      }
    };

    const setStatus = (text, kind) => {
      status.textContent = text;
      status.className = `form-status field-wide${kind ? ` is-${kind}` : ''}`;
      if (kind) status.scrollIntoView({ block: 'nearest' });
    };

    const validate = (data) => {
      const errors = {};
      if (!data.first_name.trim()) errors.first_name = 'Vui lòng nhập tên.';
      if (!data.last_name.trim()) errors.last_name = 'Vui lòng nhập họ.';
      if (!EMAIL_RE.test(data.email.trim())) errors.email = 'Email chưa đúng định dạng.';
      if (data.phone.trim() && !PHONE_RE.test(data.phone.trim())) errors.phone = 'Số điện thoại chưa đúng định dạng.';
      return errors;
    };

    const showErrors = (errors) => {
      ['topic', 'first_name', 'last_name', 'email', 'phone'].forEach((n) => setError(n, errors[n]));
      const first = Object.keys(errors)[0];
      if (first && form.elements[first]) form.elements[first].focus();
    };

    form.addEventListener('input', (e) => e.target.name && setError(e.target.name, ''));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const errors = validate(data);
      showErrors(errors);
      if (Object.keys(errors).length) return setStatus('Vui lòng kiểm tra lại các ô được đánh dấu.', 'error');

      submit.disabled = true;
      setStatus('Đang gửi…', '');
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body.ok) {
          form.reset();
          setStatus('Cảm ơn bạn! HoaBright đã nhận được thông tin và sẽ liên hệ sớm.', 'ok');
        } else if (body.errors) {
          showErrors(body.errors);
          setStatus('Vui lòng kiểm tra lại các ô được đánh dấu.', 'error');
        } else {
          setStatus(body.error || 'Chưa gửi được thông tin. Vui lòng thử lại.', 'error');
        }
      } catch {
        setStatus('Mất kết nối. Vui lòng kiểm tra mạng và thử lại.', 'error');
      } finally {
        submit.disabled = false;
      }
    });
  });

  /* Reveal on scroll */
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }),
      { rootMargin: '0px 0px -8% 0px' }
    );
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('is-visible'));
  }
})();
