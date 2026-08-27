const AdminUI = (() => {
  const icon = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M7 6H4a4 4 0 004 4M17 6h3a4 4 0 01-4 4"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    pay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    ops: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/></svg>',
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>',
    menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    logout: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  };

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function mediaUrl(url) {
    if (!url) return '';
    const s = String(url).trim();
    const upload = s.match(/\/uploads\/[^/?#]+/i);
    if (upload) return upload[0];
    if (s.startsWith('uploads/')) return `/${s}`;
    return s;
  }

  function img(url, className = '') {
    const src = mediaUrl(url);
    if (!src) return '';
    return `<img class="${className}" src="${esc(src)}" alt="" />`;
  }

  function toast(message, type = 'ok') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    document.getElementById('toast-root').appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
  }

  function modal(title, description, bodyHtml, footerHtml = '') {
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="modal-backdrop" data-close="1">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-head">
            <div>
              <h2>${esc(title)}</h2>
              ${description ? `<p>${esc(description)}</p>` : ''}
            </div>
            <button class="btn btn-icon" data-close="1" aria-label="Close">✕</button>
          </div>
          <div>${bodyHtml}</div>
          ${footerHtml ? `<div class="modal-foot">${footerHtml}</div>` : ''}
        </div>
      </div>`;
    root.querySelector('.modal-backdrop').addEventListener('click', (e) => {
      if (e.target.dataset.close) closeModal();
    });
    return root.querySelector('.modal');
  }

  function confirm(title, message) {
    return new Promise((resolve) => {
      modal(
        title,
        message,
        '',
        `<button class="btn btn-ghost" id="c-no">Cancel</button><button class="btn btn-danger" id="c-yes">Confirm</button>`
      );
      document.getElementById('c-no').onclick = () => { closeModal(); resolve(false); };
      document.getElementById('c-yes').onclick = () => { closeModal(); resolve(true); };
    });
  }

  function badgeClass(status) {
    const s = String(status || '').toLowerCase();
    if (['upcoming', 'incoming', 'active', 'paid', 'success', 'completed', 'verified', 'published', 'available', 'joined', 'confirmed'].includes(s)) return 'b-success';
    if (['ongoing', 'live', 'info'].includes(s)) return 'b-info';
    if (['draft', 'reserved', 'unpaid', 'reversed', 'refunded'].includes(s)) return 'b-muted';
    if (['pending', 'processing', 'locked'].includes(s)) return 'b-warning';
    if (['cancelled', 'banned', 'failed', 'suspended', 'error'].includes(s)) return 'b-danger';
    return 'b-primary';
  }

  function statusLabel(status) {
    const map = {
      upcoming: 'Upcoming', incoming: 'Upcoming', ongoing: 'Ongoing', live: 'Ongoing',
      completed: 'Completed', result_published: 'Results published', draft: 'Draft',
      cancelled: 'Cancelled', paid: 'Paid', pending: 'Pending', available: 'Available',
      joined: 'Joined', active: 'Active', banned: 'Banned', suspended: 'Suspended',
      success: 'Success', failed: 'Failed', refunded: 'Refunded', reversed: 'Refunded',
      reserved: 'Reserved', confirmed: 'Confirmed', locked: 'Locked',
    };
    return map[String(status || '').toLowerCase()] || status || '—';
  }

  function money(n) {
    return `₹${Number(n || 0).toLocaleString('en-IN')}`;
  }

  function dt(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function dateOnly(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function pager(meta) {
    if (!meta) return '';
    const { page = 1, pages = 1, total = 0 } = meta;
    return `
      <div class="pager">
        <span>${total} records · page ${page} of ${pages || 1}</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">Previous</button>
          <button class="btn btn-ghost" ${page >= pages ? 'disabled' : ''} data-page="${page + 1}">Next</button>
        </div>
      </div>`;
  }

  function bindPager(root, handler) {
    root.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => handler(Number(btn.dataset.page)));
    });
  }

  function closeMenus() {
    document.querySelectorAll('.menu.open').forEach((m) => m.classList.remove('open'));
    document.querySelectorAll('.menu-portal').forEach((m) => m.remove());
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.actions') && !e.target.closest('.menu-portal')) closeMenus();
  });
  window.addEventListener('scroll', closeMenus, true);
  window.addEventListener('resize', closeMenus);

  function actionsMenu(id, items) {
    const buttons = items
      .filter(Boolean)
      .map((item) => `<button type="button" data-act="${esc(item.act)}" class="${item.danger ? 'danger' : ''}">${esc(item.label)}</button>`)
      .join('');
    return `
      <div class="actions" data-id="${esc(id)}">
        <button type="button" class="more" data-menu="1" aria-label="Actions">⋮</button>
        <div class="menu">${buttons}</div>
      </div>`;
  }

  function placePortalMenu(btn, menuEl) {
    const rect = btn.getBoundingClientRect();
    const gap = 6;
    const maxH = Math.min(360, window.innerHeight - 16);
    menuEl.style.maxHeight = `${maxH}px`;
    const menuH = Math.min(menuEl.scrollHeight || 280, maxH);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const openUp = spaceBelow < Math.min(menuH, 240) && rect.top > spaceBelow;
    menuEl.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
    menuEl.style.left = 'auto';
    if (openUp) {
      menuEl.style.top = 'auto';
      menuEl.style.bottom = `${window.innerHeight - rect.top + gap}px`;
    } else {
      menuEl.style.bottom = 'auto';
      menuEl.style.top = `${rect.bottom + gap}px`;
    }
  }

  function bindActions(root, handler) {
    const run = (act, id) => {
      Promise.resolve(handler(act, id)).catch((err) => {
        toast(err?.message || 'Action failed', 'err');
      });
    };

    root.querySelectorAll('[data-menu]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const actions = btn.closest('.actions');
        const source = actions?.querySelector('.menu');
        if (!actions || !source) return;

        const existingPortal = document.querySelector('.menu-portal');
        const wasOpenForThis =
          existingPortal && String(existingPortal.dataset.id) === String(actions.dataset.id);
        closeMenus();
        // Toggle closed if this row's menu was already open
        if (wasOpenForThis) return;

        const clone = source.cloneNode(true);
        clone.classList.add('open', 'menu-portal');
        clone.dataset.id = actions.dataset.id;
        document.body.appendChild(clone);
        placePortalMenu(btn, clone);
        clone.querySelectorAll('[data-act]').forEach((item) => {
          item.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const id = clone.dataset.id;
            const act = item.dataset.act;
            closeMenus();
            run(act, id);
          });
        });
      });
    });
    root.querySelectorAll('[data-act]').forEach((btn) => {
      if (btn.closest('.menu')) return;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeMenus();
        const id = btn.closest('[data-id]')?.dataset.id || btn.dataset.id;
        run(btn.dataset.act, id);
      });
    });
  }

  function skeletonRows(cols = 6, rows = 6) {
    return `<tr>${Array.from({ length: cols }, () => '<td><div class="skel"></div></td>').join('')}</tr>`.repeat(rows);
  }

  function empty(title, hint) {
    return `<div class="empty"><strong>${esc(title)}</strong><div>${esc(hint || 'Nothing to show yet.')}</div></div>`;
  }

  function debounce(fn, ms = 350) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function navActive(active, id) {
    return active === id ? 'active' : '';
  }

  function layout(active, body) {
    const u = AdminAPI.user() || {};
    const initial = String(u.name || u.username || 'A').slice(0, 1).toUpperCase();
    return `
      <div class="shell">
        <div class="scrim" id="nav-overlay"></div>
        <aside class="sidebar" id="sidebar">
          <div class="brand">
            <div class="brand-mark">
              <img src="/brand/logo.png" alt="" />
              <div>
                <div class="brand-name">Arena Control</div>
                <div class="brand-sub">Professional match operations</div>
              </div>
            </div>
          </div>
          <nav class="nav">
            <button class="nav-link ${navActive(active, 'dashboard')}" data-nav="#/dashboard">${icon.dashboard}Dashboard</button>

            <div class="nav-group">TOURNAMENT</div>
            <button class="nav-sub ${navActive(active, 'tournaments')}" data-nav="#/tournaments">${icon.trophy}All Tournaments</button>
            <button class="nav-sub ${navActive(active, 'daily-auto')}" data-nav="#/daily-auto">Daily Auto Matches</button>
            <button class="nav-sub ${navActive(active, 'tournaments-live')}" data-nav="#/tournaments?status=live">Active</button>
            <button class="nav-sub ${navActive(active, 'tournaments-upcoming')}" data-nav="#/tournaments?status=upcoming">Upcoming</button>
            <button class="nav-sub ${navActive(active, 'tournaments-completed')}" data-nav="#/tournaments?status=completed">Completed</button>
            <button class="nav-sub ${navActive(active, 'tournaments-new')}" data-nav="#/tournaments/new">Create Tournament</button>

            <div class="nav-group">PLAYERS</div>
            <button class="nav-sub ${navActive(active, 'players')}" data-nav="#/players">${icon.users}Players</button>
            <button class="nav-sub ${navActive(active, 'teams')}" data-nav="#/teams">Teams</button>
            <button class="nav-sub ${navActive(active, 'participants')}" data-nav="#/participants">Participants</button>

            <div class="nav-group">PAYMENTS</div>
            <button class="nav-sub ${navActive(active, 'payments')}" data-nav="#/payments">${icon.pay}Transactions</button>
            <button class="nav-sub ${navActive(active, 'wallet')}" data-nav="#/wallet">Wallet</button>
            <button class="nav-sub ${navActive(active, 'withdrawals')}" data-nav="#/withdrawals">Withdrawals</button>

            <div class="nav-group">TOURNAMENT OPERATIONS</div>
            <button class="nav-sub ${navActive(active, 'ops-slots')}" data-nav="#/ops/slots">${icon.ops}Slots</button>
            <button class="nav-sub ${navActive(active, 'ops-rooms')}" data-nav="#/ops/rooms">Rooms</button>
            <button class="nav-sub ${navActive(active, 'ops-results')}" data-nav="#/ops/results">Results</button>
            <button class="nav-sub ${navActive(active, 'ops-winners')}" data-nav="#/ops/winners">Winners</button>
            <button class="nav-sub ${navActive(active, 'ops-kills')}" data-nav="#/ops/kills">Kill Rewards</button>

            <div class="nav-group">REPORTS</div>
            <button class="nav-sub ${navActive(active, 'history')}" data-nav="#/history">${icon.report}Tournament History</button>
            <button class="nav-sub ${navActive(active, 'payment-history')}" data-nav="#/payment-history">Payment History</button>
            <button class="nav-sub ${navActive(active, 'activity')}" data-nav="#/activity">Activity</button>

            <div class="nav-group">SETTINGS</div>
            <button class="nav-sub ${navActive(active, 'games')}" data-nav="#/games">${icon.settings}Games & Modes</button>
            <button class="nav-sub ${navActive(active, 'maps')}" data-nav="#/maps">Maps</button>
            <button class="nav-sub ${navActive(active, 'match-types')}" data-nav="#/match-types">Match Types</button>
            <button class="nav-sub ${navActive(active, 'sliders')}" data-nav="#/sliders">Home banners</button>
            <button class="nav-sub ${navActive(active, 'support')}" data-nav="#/support">Support</button>
            <button class="nav-sub ${navActive(active, 'announcements')}" data-nav="#/announcements">Announcements</button>
          </nav>
          <div class="side-user">
            <div class="avatar">${esc(initial)}</div>
            <div style="flex:1;min-width:0">
              <strong>${esc(u.name || u.username || 'Admin')}</strong>
              <span>${esc(u.email || '')}</span>
            </div>
            <button class="btn btn-icon" id="logout-btn" title="Logout">${icon.logout}</button>
          </div>
        </aside>
        <section class="workspace">
          <header class="topbar">
            <button class="menu-btn btn btn-icon" id="menu-toggle" aria-label="Open menu">${icon.menu}</button>
            <div class="search">${icon.search}<input id="global-search" placeholder="Search tournaments, players, payments..." /></div>
            <div class="top-right">
              <div class="avatar">${esc(initial)}</div>
            </div>
          </header>
          <div class="page">${body}</div>
        </section>
      </div>`;
  }

  function bindShell() {
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.onclick = () => { location.hash = btn.dataset.nav; };
    });
    const logout = document.getElementById('logout-btn');
    if (logout) logout.onclick = () => { AdminAPI.clearSession(); location.hash = '#/login'; };
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('nav-overlay');
    const close = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('show'); };
    if (toggle) toggle.onclick = () => { sidebar.classList.add('open'); overlay.classList.add('show'); };
    if (overlay) overlay.onclick = close;
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', close);
    });
    const gs = document.getElementById('global-search');
    if (gs) gs.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') location.hash = `#/tournaments?search=${encodeURIComponent(gs.value)}`;
    });
  }

  function pageHead(title, subtitle, actions = '') {
    return `
      <div class="page-head">
        <div>
          <h1>${esc(title)}</h1>
          <p>${esc(subtitle || '')}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${actions}</div>
      </div>`;
  }

  function imageField(name, current = '', label = 'Image', required = false) {
    const src = current || '';
    return `
      <div class="field full">
        <label>${esc(label)} ${required ? '<span class="req">*</span>' : ''}</label>
        <div class="uploader">
          <input type="hidden" name="${esc(name)}" id="img-${esc(name)}" value="${esc(src)}" />
          <div class="uploader-preview" id="prev-${esc(name)}">${src ? `<img src="${esc(mediaUrl(src))}" alt="" />` : '<span>Choose a JPG, PNG or WEBP</span>'}</div>
          <div class="uploader-actions">
            <label class="btn btn-ghost">Upload image<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden data-upload="${esc(name)}" /></label>
          </div>
          <span class="help">JPG, PNG or WEBP. Large photos are compressed before upload.</span>
        </div>
      </div>`;
  }

  function bindImageUploads(root = document) {
    root.querySelectorAll('[data-upload]').forEach((input) => {
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const name = input.dataset.upload;
        const prev = document.getElementById(`prev-${name}`);
        if (prev) prev.innerHTML = '<span>Uploading…</span>';
        try {
          const data = await AdminAPI.upload(file);
          const stored = data.path || data.url;
          const shown = mediaUrl(data.path || data.url);
          const hidden = document.getElementById(`img-${name}`);
          if (hidden) hidden.value = stored;
          if (prev) prev.innerHTML = `<img src="${esc(shown)}" alt="" />`;
          toast('Image uploaded');
        } catch (err) {
          toast(err.message || 'Upload failed', 'err');
          if (prev) prev.innerHTML = '<span>Upload failed. Try another image.</span>';
        } finally {
          input.value = '';
        }
      };
    });
  }

  return {
    icon, esc, mediaUrl, img, toast, modal, closeModal, confirm, badgeClass, statusLabel, money, dt, dateOnly,
    pager, bindPager, actionsMenu, bindActions, skeletonRows, empty, debounce, layout, bindShell, pageHead,
    imageField, bindImageUploads,
  };
})();
