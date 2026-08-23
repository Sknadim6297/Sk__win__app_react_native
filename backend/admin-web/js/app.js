const App = (() => {
  const root = () => document.getElementById('app');

  function parseHash() {
    const raw = (location.hash || '#/dashboard').replace(/^#/, '');
    const [path, query = ''] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const params = Object.fromEntries(new URLSearchParams(query));
    return {
      parts,
      params,
      section: parts[0] || 'dashboard',
      id: parts[1] || '',
      extra: parts[2] || '',
    };
  }

  function go(hash) {
    location.hash = hash.startsWith('#') ? hash : `#/${hash}`;
  }

  function qs(obj) {
    const sp = new URLSearchParams();
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') sp.set(k, v);
    });
    const s = sp.toString();
    return s ? `?${s}` : '';
  }

  function isCustom(row) {
    const type = String(row.matchType || '');
    return (
      row.matchKind === 'team_vs_team' ||
      row.category === 'custom' ||
      row.category === 'custom_match' ||
      row.tournamentType === 'custom_match' ||
      /custom match|clash squad/i.test(type)
    );
  }

  function toPlayerMatchLabel(text) {
    return String(text || '').replace(/Custom Match/gi, 'Clash Squad');
  }

  function displayMatchType(row) {
    if (row.matchTypeName && String(row.matchTypeName) !== 'undefined') return String(row.matchTypeName);
    if (row.matchType && typeof row.matchType === 'object' && row.matchType.name) {
      return String(row.matchType.name);
    }
    if (typeof row.matchType === 'string' && row.matchType && !/^[a-f0-9]{24}$/i.test(row.matchType)) {
      return toPlayerMatchLabel(row.matchType);
    }
    if (isCustom(row)) return 'Clash Squad';
    return 'Battle Royale';
  }

  function formatLabel(row) {
    if (row.playerFormatLabel) return row.playerFormatLabel;
    if (row.modeLabel && /^(Solo|Duo|Squad|Team)$/i.test(String(row.modeLabel))) return row.modeLabel;
    const mode = String(row.playerFormat || row.mode || '').toLowerCase();
    if (mode === 'solo') return 'Solo';
    if (mode === 'duo') return 'Duo';
    if (mode === 'squad') return 'Squad';
    if (mode === 'team') return 'Team';
    return row.modeLabel || row.mode || '—';
  }

  const DEFAULT_RULES_TEXT = [
    'Minimum level 40+ required to join.',
    'Room ID and password shared 8–10 minutes before match.',
    'No hacks, emulators, or teaming — instant disqualification.',
    'Wrong gaming ID / UID = no refund.',
    'Review prize pool distribution before joining.',
  ].join('\n');

  function parseRulesList(rules) {
    if (!rules) return [];
    const lines = Array.isArray(rules) ? rules : String(rules).split(/\r?\n/);
    return lines.flatMap((line) => String(line).split(/\r?\n/)).map((line) => line.trim()).filter(Boolean);
  }

  function rulesToText(rules) {
    return parseRulesList(rules).join('\n');
  }

  function playerFormatOptions(selected) {
    const opts = [
      ['solo', 'Solo'],
      ['duo', 'Duo'],
      ['squad', 'Squad'],
    ];
    return opts.map(([value, label]) =>
      `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`
    ).join('');
  }

  function playersPerTeamFor(format) {
    if (format === 'duo') return 2;
    if (format === 'squad' || format === 'team') return 4;
    return 1;
  }

  function defaultSlotsFor(format, isTeamVsTeam) {
    if (isTeamVsTeam) return 2;
    if (format === 'duo') return 24;
    if (format === 'squad') return 12;
    return 48;
  }

  function infoCell(label, value) {
    return `<div class="info-cell"><div class="lbl">${AdminUI.esc(label)}</div><div class="val">${value || '—'}</div></div>`;
  }

  function textBlock(value, empty = 'Not added yet') {
    const text = String(value || '').trim();
    if (!text) return `<span style="color:var(--text-2)">${AdminUI.esc(empty)}</span>`;
    return text.split(/\r?\n/).map((line) => AdminUI.esc(line) || '&nbsp;').join('<br>');
  }

  function modeDisplay(detail, t, custom) {
    const ppt = detail.playersPerTeam || playersPerTeamFor(t.playerFormat || t.mode);
    const label = detail.playerFormatLabel || formatLabel(t);
    if (custom) {
      return `${label} · ${ppt} player${ppt > 1 ? 's' : ''} per team`;
    }
    return label;
  }

  async function guarded(fn) {
    try {
      await fn();
    } catch (err) {
      AdminUI.toast(err.message || 'Something went wrong', 'err');
    }
  }

  function badge(status) {
    return `<span class="badge ${AdminUI.badgeClass(status)}">${AdminUI.esc(AdminUI.statusLabel(status))}</span>`;
  }

  function loginPage(error = '') {
    root().innerHTML = `
      <div class="login">
        <form class="login-card" id="login-form">
          <img src="/brand/logo.png" alt="WAREZONE" style="width:auto;height:40px;max-width:160px;object-fit:contain;border-radius:0" />
          <h1>Arena Control</h1>
          <p style="color:var(--text-2);margin:0 0 18px">Sign in to manage tournaments, players and payouts.</p>
          ${error ? `<div class="alert">${AdminUI.esc(error)}</div>` : ''}
          <div class="field"><label>Email address <span class="req">*</span></label><input name="email" type="email" required autocomplete="username" placeholder="admin@company.com" /></div>
          <div class="field"><label>Password <span class="req">*</span></label><input name="password" type="password" required autocomplete="current-password" placeholder="Enter password" /></div>
          <button class="btn btn-primary" style="width:100%;margin-top:8px" type="submit">Sign in</button>
        </form>
      </div>`;
    document.getElementById('login-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const data = await AdminAPI.login(fd.get('email'), fd.get('password'));
        AdminAPI.setSession(data);
        go('dashboard');
      } catch (err) {
        loginPage(err.message);
      }
    };
  }

  async function dashboard() {
    root().innerHTML = AdminUI.layout('dashboard', '<div class="loading">Loading analytics…</div>');
    AdminUI.bindShell();
    const [stats, pay, recentT, recentTx] = await Promise.all([
      AdminAPI.stats(),
      AdminAPI.paymentStats().catch(() => ({})),
      AdminAPI.tournaments({ page: 1, limit: 6 }).catch(() => ({ items: [] })),
      AdminAPI.transactions({ page: 1, limit: 6 }).catch(() => ({ transactions: [] })),
    ]);
    const t = pay.tournaments || {};
    const tournaments = recentT.items || recentT || [];
    const txs = recentTx.transactions || recentTx.items || [];
    const maxCount = Math.max(t.upcoming || 0, t.live || 0, t.completed || 0, 1);
    root().innerHTML = AdminUI.layout('dashboard', `
      ${AdminUI.pageHead('Dashboard', 'Operations snapshot for matches, players and payouts.')}
      <div class="kpi-grid">
        <div class="kpi"><div class="lbl">Total tournaments</div><div class="val">${t.total || 0}</div><div class="hint">${t.cancelled || 0} cancelled</div></div>
        <div class="kpi"><div class="lbl">Active tournaments</div><div class="val">${t.live || 0}</div><div class="hint">${t.upcoming || 0} upcoming</div></div>
        <div class="kpi"><div class="lbl">Total players</div><div class="val">${stats.totalUsers || 0}</div><div class="hint">${stats.verifiedUsers || 0} verified</div></div>
        <div class="kpi"><div class="lbl">Wallet float</div><div class="val">${AdminUI.money(stats.totalWalletBalance)}</div><div class="hint">Held in player wallets</div></div>
        <div class="kpi"><div class="lbl">Prize distributed</div><div class="val">${AdminUI.money(pay.payouts?.totalPrizePaid)}</div><div class="hint">${pay.payouts?.paid || 0} paid payouts</div></div>
        <div class="kpi"><div class="lbl">Pending payments</div><div class="val">${pay.payouts?.pending || 0}</div><div class="hint">${pay.refunds?.pending || 0} refunds in queue</div></div>
      </div>
      <div class="split">
        <div class="card card-pad">
          <h3 style="margin:0 0 14px">Tournament performance</h3>
          <div class="bars">
            ${[['Upcoming', t.upcoming], ['Ongoing', t.live], ['Completed', t.completed]].map(([label, n]) => `
              <div class="bar-row"><span>${label}</span><div class="bar"><span style="width:${Math.round((Number(n || 0) / maxCount) * 100)}%"></span></div><b>${n || 0}</b></div>
            `).join('')}
          </div>
          <h3 style="margin:22px 0 10px">Recent tournaments</h3>
          ${tournaments.length ? tournaments.map((row) => `
            <div class="list-row">
              <div>
                <a class="name-link" href="#/tournaments/${row._id}">${AdminUI.esc(row.name)}</a>
                <div style="color:var(--text-2);font-size:12px">${AdminUI.esc(displayMatchType(row))} · ${AdminUI.esc(formatLabel(row))}${row.map ? ` · ${AdminUI.esc(row.map)}` : ''}</div>
              </div>
              ${badge(row.status)}
            </div>`).join('') : AdminUI.empty('No tournaments yet')}
        </div>
        <div class="card card-pad">
          <h3 style="margin:0 0 14px">Recent transactions</h3>
          ${txs.length ? txs.map((tx) => `
            <div class="list-row">
              <div>
                <strong>${AdminUI.esc(tx.userId?.username || 'Player')}</strong>
                <div style="color:var(--text-2);font-size:12px">${AdminUI.esc(tx.type || '')} · ${AdminUI.dt(tx.createdAt)}</div>
              </div>
              <div style="text-align:right">
                <div>${AdminUI.money(tx.amount)}</div>
                ${badge(txStatus(tx.status))}
              </div>
            </div>`).join('') : AdminUI.empty('No transactions yet')}
        </div>
      </div>`);
    AdminUI.bindShell();
  }

  function txStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'completed') return 'success';
    if (s === 'reversed' || s === 'refunded') return 'refunded';
    return s;
  }

  function tournamentActions(row) {
    const s = row.status || row.lifecycleStatus;
    const custom = isCustom(row);
    return [
      s === 'draft' ? { act: 'publish', label: 'Publish to Upcoming' } : null,
      { act: 'view', label: 'View' },
      { act: 'edit', label: 'Edit' },
      { act: 'slots', label: custom ? 'Manage teams' : 'Manage slots' },
      { act: 'room', label: 'Room details' },
      { act: 'winners', label: 'Winners' },
      { act: 'results', label: 'Results' },
      s === 'upcoming' || s === 'incoming' ? { act: 'start', label: 'Start match' } : null,
      s === 'ongoing' || s === 'live' ? { act: 'complete', label: 'Complete match' } : null,
      { act: 'lock', label: row.locked ? 'Unlock tournament' : 'Lock tournament' },
      s !== 'cancelled' ? { act: 'cancel', label: 'Cancel', danger: true } : null,
      { act: 'delete', label: 'Delete', danger: true },
    ];
  }

  function rowActions(row) {
    const s = row.status || row.lifecycleStatus;
    return `
      <div class="row-actions" data-id="${row._id}">
        ${s === 'draft' ? '<button type="button" class="btn btn-primary btn-sm" data-act="publish">Publish</button>' : ''}
        ${AdminUI.actionsMenu(row._id, tournamentActions(row))}
      </div>`;
  }

  function renderTournamentTable(items) {
    return items.map((row) => {
      const booked = row.joinedCount ?? row.bookedSlots ?? 0;
      const total = row.capacity ?? row.totalSlots ?? row.maxParticipants ?? 0;
      return `
        <tr>
          <td>
            <a class="name-link" href="#/tournaments/${row._id}">${AdminUI.esc(row.name)}</a>
            ${row.isAutoGenerated ? `<span class="auto-source">Daily Auto · ${AdminUI.esc(row.autoMatchDisplayId || row.autoMatchName || 'AUTO')}</span>` : ''}
          </td>
          <td>${AdminUI.esc(displayMatchType(row))}</td>
          <td>${AdminUI.esc(formatLabel(row))}</td>
          <td>${AdminUI.esc(row.map || '—')}</td>
          <td>${booked}/${total}</td>
          <td>${AdminUI.money(row.entryFee)}</td>
          <td>${AdminUI.money(row.prizePool)}</td>
          <td>${booked}</td>
          <td>${badge(row.status)}</td>
          <td>${AdminUI.dt(row.startDate || row.matchDate)}</td>
          <td>${rowActions(row)}</td>
        </tr>`;
    }).join('');
  }

  function renderTournamentCards(items) {
    return `<div class="mobile-list">${items.map((row) => {
      const booked = row.joinedCount ?? 0;
      const total = row.capacity ?? 0;
      return `
        <div class="m-card">
          <div style="display:flex;justify-content:space-between;gap:8px">
            <a class="name-link" href="#/tournaments/${row._id}">${AdminUI.esc(row.name)}</a>
            ${rowActions(row)}
          </div>
          ${row.isAutoGenerated ? `<div class="auto-source">Daily Auto · ${AdminUI.esc(row.autoMatchDisplayId || row.autoMatchName || 'AUTO')}</div>` : ''}
          <div class="m-row"><span>Type</span><b>${AdminUI.esc(displayMatchType(row))}</b></div>
          <div class="m-row"><span>Player Format</span><b>${AdminUI.esc(formatLabel(row))}</b></div>
          ${row.map ? `<div class="m-row"><span>Map</span><b>${AdminUI.esc(row.map)}</b></div>` : ''}
          <div class="m-row"><span>Slots</span><b>${booked}/${total}</b></div>
          <div class="m-row"><span>Entry</span><b>${AdminUI.money(row.entryFee)}</b></div>
          <div class="m-row"><span>Status</span>${badge(row.status)}</div>
        </div>`;
    }).join('')}</div>`;
  }

  async function handleTournamentAction(act, id) {
    await guarded(async () => {
      if (act === 'view') return go(`tournaments/${id}`);
      if (act === 'edit') return go(`tournaments/${id}/edit`);
      if (act === 'slots') return go(`tournaments/${id}?tab=slots`);
      if (act === 'room') return go(`tournaments/${id}?tab=room`);
      if (act === 'winners') return go(`tournaments/${id}?tab=winners`);
      if (act === 'results') return go(`tournaments/${id}?tab=results`);
      if (act === 'publish') {
        await AdminAPI.publish(id);
        AdminUI.toast('Published — status is now Upcoming. Players can see and join it.');
        return render();
      }
      if (act === 'start') { await AdminAPI.startMatch(id); AdminUI.toast('Match started'); return render(); }
      if (act === 'complete') { await AdminAPI.completeMatch(id); AdminUI.toast('Match completed'); return render(); }
      if (act === 'lock') {
        const detail = await AdminAPI.tournament(id);
        const locked = Boolean(detail.tournament?.locked);
        await AdminAPI.lockTournament(id, !locked);
        AdminUI.toast(locked ? 'Unlocked' : 'Locked');
        return render();
      }
      if (act === 'cancel') {
        if (!(await AdminUI.confirm('Cancel tournament', 'Eligible entries will be refunded.'))) return;
        await AdminAPI.cancelMatch(id);
        AdminUI.toast('Cancelled');
        return render();
      }
      if (act === 'delete') {
        if (!(await AdminUI.confirm('Delete tournament', 'This cannot be undone.'))) return;
        await AdminAPI.deleteTournament(id);
        AdminUI.toast('Deleted');
        return render();
      }
    });
  }

  function tournamentsNav(params, id) {
    if (id === 'new') return 'tournaments-new';
    if (params.status === 'live') return 'tournaments-live';
    if (params.status === 'upcoming') return 'tournaments-upcoming';
    if (params.status === 'completed') return 'tournaments-completed';
    return 'tournaments';
  }

  async function tournaments() {
    const { params } = parseHash();
    const nav = tournamentsNav(params);
    const titles = {
      live: ['Active tournaments', 'Matches currently in play.'],
      upcoming: ['Upcoming tournaments', 'Published matches waiting to start.'],
      completed: ['Completed tournaments', 'Finished matches ready for results and payouts.'],
    };
    const [title, subtitle] = titles[params.status] || ['All tournaments'];
    root().innerHTML = AdminUI.layout(nav, '<div class="loading">Loading tournaments…</div>');
    AdminUI.bindShell();
    const data = await AdminAPI.tournaments({
      page: Number(params.page) || 1,
      limit: 15,
      search: params.search || '',
      status: params.status || '',
      category: params.category || '',
      mode: params.mode || '',
      from: params.from || '',
      to: params.to || '',
      entryMin: params.entryMin || '',
      entryMax: params.entryMax || '',
    });
    const items = data.items || data || [];
    const meta = data.items ? data : { page: 1, pages: 1, total: items.length };
    root().innerHTML = AdminUI.layout(nav, `
      ${AdminUI.pageHead(title, subtitle, `<button class="btn btn-primary" id="add-t">${AdminUI.icon.plus} Create tournament</button>`)}
      <div class="filters">
        <input id="t-search" placeholder="Search tournaments..." value="${AdminUI.esc(params.search || '')}" />
        <select id="t-status">
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="upcoming">Upcoming</option>
          <option value="live">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select id="t-cat">
          <option value="">Match type</option>
          <option value="custom">Clash Squad</option>
          <option value="battle_royale">Battle Royale</option>
        </select>
        <select id="t-mode">
          <option value="">Player Format</option>
          <option value="solo">Solo</option>
          <option value="duo">Duo</option>
          <option value="squad">Squad</option>
        </select>
        <input id="t-from" type="date" value="${AdminUI.esc(params.from || '')}" />
        <input id="t-to" type="date" value="${AdminUI.esc(params.to || '')}" />
        <input id="t-fee" type="number" min="0" placeholder="Entry fee min" value="${AdminUI.esc(params.entryMin || '')}" style="max-width:140px" />
        <button class="btn btn-primary" id="t-go">Search</button>
      </div>
      <div class="card">
        <div class="table-wrap desktop-table">
          <table>
            <thead><tr>
              <th>Tournament</th><th>Match type</th><th>Player Format</th><th>Map</th><th>Slots</th>
              <th>Entry fee</th><th>Prize pool</th><th>Participants</th><th>Status</th><th>Start time</th><th>Actions</th>
            </tr></thead>
            <tbody>${items.length ? renderTournamentTable(items) : `<tr><td colspan="11">${AdminUI.empty('No tournaments found', 'Try a different filter or create a new match.')}</td></tr>`}</tbody>
          </table>
        </div>
        ${items.length ? renderTournamentCards(items) : `<div class="mobile-list">${AdminUI.empty('No tournaments found')}</div>`}
        ${AdminUI.pager(meta)}
      </div>`);
    AdminUI.bindShell();
    document.getElementById('t-status').value = params.status || '';
    document.getElementById('t-cat').value = params.category || '';
    document.getElementById('t-mode').value = params.mode || '';
    document.getElementById('add-t').onclick = () => go('tournaments/new');
    const apply = (page = 1) => go(`tournaments${qs({
      search: document.getElementById('t-search').value,
      status: document.getElementById('t-status').value,
      category: document.getElementById('t-cat').value,
      mode: document.getElementById('t-mode').value,
      from: document.getElementById('t-from').value,
      to: document.getElementById('t-to').value,
      entryMin: document.getElementById('t-fee').value,
      page,
    })}`);
    document.getElementById('t-go').onclick = () => apply(1);
    document.getElementById('t-search').addEventListener('input', AdminUI.debounce(() => apply(1), 400));
    AdminUI.bindPager(root(), (p) => apply(p));
    AdminUI.bindActions(root(), handleTournamentAction);
  }

  function localInput(value) {
    if (!value) return '';
    const d = new Date(value);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  async function tournamentForm(id) {
    const nav = id ? 'tournaments' : 'tournaments-new';
    root().innerHTML = AdminUI.layout(nav, '<div class="loading">Loading form…</div>');
    AdminUI.bindShell();
    const [games, maps, existing, matchTypes] = await Promise.all([
      AdminAPI.games(),
      AdminAPI.maps().catch(() => []),
      id ? AdminAPI.tournament(id) : null,
      AdminAPI.matchTypes().catch(() => []),
    ]);
    const t = existing?.tournament || {};
    if (!(games || []).length) {
      root().innerHTML = AdminUI.layout(nav, `
        ${AdminUI.pageHead('Create tournament', 'Add a game and at least one mode before creating a match.', `<button class="btn btn-secondary" id="back">Back</button>`)}
        <div class="panel">${AdminUI.empty('No games yet', 'Go to Games & Modes, upload a game image, add modes, then create tournaments.')}
          <div style="margin-top:16px"><button class="btn btn-primary" id="to-games">Open Games & Modes</button></div>
        </div>`);
      AdminUI.bindShell();
      document.getElementById('back').onclick = () => go('tournaments');
      document.getElementById('to-games').onclick = () => go('games');
      return;
    }
    const modesByGame = {};
    await Promise.all((games || []).map(async (g) => {
      modesByGame[g._id] = await AdminAPI.modes(g._id).catch(() => []);
    }));
    const gameId = t.game?._id || t.game || games[0]?._id || '';
    root().innerHTML = AdminUI.layout(nav, `
      ${AdminUI.pageHead(
        id ? 'Edit tournament' : 'Create new tournament',
        id ? 'Update match settings without changing player entries.' : 'Add a new match to the operations calendar.',
        `<button class="btn btn-secondary" id="back">Back to tournaments</button>`
      )}
      <form id="t-form" class="form-card">
        <div class="form-grid">
          <div class="form-section">
            <h3>Match identity</h3>
            <p>Name and catalog shown to players in the app.</p>
          </div>
          <div class="field full"><label>Tournament name <span class="req">*</span></label><input name="name" required value="${AdminUI.esc(t.name || '')}" placeholder="e.g. 1 VS 1 CLASH SQUAD TOURNAMENT" /></div>
          <div class="field"><label>Game <span class="req">*</span></label>
            <select name="game" id="f-game">${(games || []).map((g) => `<option value="${g._id}" ${g._id === gameId ? 'selected' : ''}>${AdminUI.esc(g.name)}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Game mode <span class="req">*</span></label><select name="gameMode" id="f-mode"></select></div>

          <div class="form-section">
            <h3>Match setup</h3>
            <p><b>Match Type</b> is the game category (from catalog). <b>Player Format</b> is Solo / Duo / Squad. Entry fee is always <b>per player</b>; backend multiplies by roster size.</p>
          </div>
          <div class="field"><label>Match Type <span class="req">*</span></label>
            <select name="matchType" id="f-match-type" required>
              ${(matchTypes || []).filter((mt) => mt.active !== false).map((mt) => {
                const selectedId = String(t.matchType?._id || t.matchType || '');
                const sel = selectedId === String(mt._id) ? 'selected' : '';
                return `<option value="${mt._id}" ${sel} data-kill="${mt.hasKillRewards ? 1 : 0}" data-tvt="${mt.isTeamVsTeam ? 1 : 0}" data-default-slots="${mt.defaultSlots || 48}">${AdminUI.esc(mt.name)}</option>`;
              }).join('') || '<option value="">Create Match Types first</option>'}
            </select>
            <span class="help">Managed under Settings → Match Types. Shown to players as Match Type.</span>
          </div>
          <div class="field"><label>Player Format <span class="req">*</span></label>
            <select name="playerFormat" id="f-player-format" required>
              ${playerFormatOptions(t.playerFormat || t.mode || 'solo')}
            </select>
            <span class="help">Solo = 1, Duo = 2, Squad = 4 players per entry.</span>
          </div>
          <div class="field"><label>Map</label>
            <select name="map">${(maps || []).map((m) => `<option value="${AdminUI.esc(m.name)}" ${m.name === t.map ? 'selected' : ''}>${AdminUI.esc(m.name)}</option>`).join('') || '<option value="Bermuda">Bermuda</option>'}</select>
          </div>
          <div class="field">
            <label>Players per entry</label>
            <input id="f-ppt" type="number" readonly value="1" />
            <span class="help">Fixed 48-slot grid. Solo picks 1 slot, Duo 2, Squad 4 when joining.</span>
          </div>
          <div class="field"><label>Start date & time <span class="req">*</span></label><input name="startDate" type="datetime-local" required value="${localInput(t.startDate)}" /></div>

          <div class="form-section">
            <h3>Entry & prizes</h3>
            <p>Entry fee is <b>per player</b>. Backend calculates payable = fee × players for the selected Player Format.</p>
          </div>
          <div class="field"><label>Entry Fee / Player (₹)</label><input name="entryFee" type="number" min="0" value="${t.entryFee ?? 0}" /></div>
          <div class="field"><label>Prize pool</label><input name="prizePool" type="number" min="0" value="${t.prizePool ?? 0}" /><span class="help">Leave 0 to hide Prize Pool on the player app.</span></div>
          <div class="field" id="kill-wrap"><label>Prize per Kill</label><input name="perKill" type="number" min="0" value="${t.perKill ?? 0}" /><span class="help">Leave 0 to hide Prize per Kill. Only used when Match Type allows kill rewards.</span></div>

          <div class="form-section">
            <h3>Banner & description</h3>
            <p>Banner and about text appear at the top of player match details.</p>
          </div>
          <div class="field full"><label>Banner title</label><input name="bannerTitle" value="${AdminUI.esc(t.bannerTitle || '')}" placeholder="e.g. 1 VS 1 CLASH SQUAD TOURNAMENT" /></div>
          ${AdminUI.imageField('bannerImage', t.bannerImage || '', 'Tournament banner', false)}
          <div class="field full"><label>About this match</label><textarea name="description" placeholder="Short description shown under match details">${AdminUI.esc(t.description || '')}</textarea></div>

          <div class="form-section">
            <h3>Rules & regulations</h3>
            <p>One rule per line. Players see this list on match details. Leave the defaults or write your own.</p>
          </div>
          <div class="field full"><label>Match rules</label>
            <textarea name="rules" style="min-height:140px">${AdminUI.esc(rulesToText(t.rules) || DEFAULT_RULES_TEXT)}</textarea>
          </div>

          <div class="form-section">
            <h3>Match ID &amp; Password</h3>
            <p>Optional now. Only players who have <b>joined this match</b> can see these (when unlocked or force-shown). Non-joined users never see them.</p>
          </div>
          <div class="field"><label>Match ID</label><input name="roomId" value="${AdminUI.esc(t.roomId || '')}" placeholder="Game Match / Room ID" /></div>
          <div class="field"><label>Password</label><input name="roomPassword" value="${AdminUI.esc(t.roomPassword || '')}" placeholder="Match password" /></div>
          <div class="field full"><label style="display:flex;gap:8px;align-items:center;font-weight:600">
            <input type="checkbox" name="showRoomCredentials" ${t.showRoomCredentials ? 'checked' : ''} />
            Show Match ID and Password to joined players now
          </label></div>
          ${id ? '' : `<div class="field full"><label style="display:flex;gap:8px;align-items:center;font-weight:600">
            <input type="checkbox" name="publishNow" value="true" checked />
            Publish now — make this Upcoming so players can see and join it
          </label>
          <span class="help">Leave unchecked to save as Draft. You can publish later from the tournament list.</span></div>`}
        </div>
        <div class="modal-foot" style="padding-top:8px">
          <button class="btn btn-ghost" type="button" id="cancel">Cancel</button>
          <button class="btn btn-primary" type="submit">${id ? 'Save changes' : 'Create tournament'}</button>
        </div>
      </form>`);
    AdminUI.bindShell();
    const fillModes = () => {
      const gid = document.getElementById('f-game').value;
      const modes = modesByGame[gid] || [];
      const current = String(t.gameMode?._id || t.gameMode || '');
      document.getElementById('f-mode').innerHTML = modes.map((m) =>
        `<option value="${m._id}" ${String(m._id) === current ? 'selected' : ''}>${AdminUI.esc(m.name)}</option>`
      ).join('') || '<option value="">No modes</option>';
    };
    const syncStructureFields = () => {
      const opt = document.getElementById('f-match-type')?.selectedOptions?.[0];
      const allowKill = opt?.dataset?.kill === '1';
      const wrap = document.getElementById('kill-wrap');
      if (wrap) wrap.style.display = allowKill ? '' : 'none';
      if (!allowKill) {
        const pk = document.querySelector('#t-form [name="perKill"]');
        if (pk) pk.value = '0';
      }
      const format = document.getElementById('f-player-format')?.value || 'solo';
      const pptEl = document.getElementById('f-ppt');
      if (pptEl) pptEl.value = String(playersPerTeamFor(format));
    };
    fillModes();
    syncStructureFields();
    AdminUI.bindImageUploads(document.getElementById('t-form'));
    document.getElementById('f-game').onchange = fillModes;
    document.getElementById('f-match-type').onchange = syncStructureFields;
    document.getElementById('f-player-format').onchange = syncStructureFields;
    document.getElementById('back').onclick = () => go('tournaments');
    document.getElementById('cancel').onclick = () => go('tournaments');
    document.getElementById('t-form').onsubmit = (e) => {
      e.preventDefault();
      guarded(async () => {
        const fd = new FormData(e.target);
        const body = Object.fromEntries(fd.entries());
        body.entryFee = Number(body.entryFee || 0);
        body.prizePool = Number(body.prizePool || 0);
        body.playerFormat = body.playerFormat || 'solo';
        body.mode = body.playerFormat;
        body.slots = 48;
        const opt = document.getElementById('f-match-type')?.selectedOptions?.[0];
        const allowKill = opt?.dataset?.kill === '1';
        body.perKill = allowKill ? Number(body.perKill || 0) : 0;
        body.rules = parseRulesList(body.rules);
        body.bannerTitle = String(body.bannerTitle || '').trim();
        body.showRoomCredentials = fd.get('showRoomCredentials') === 'on';
        if (!body.name || !body.game || !body.gameMode || !body.matchType || !body.startDate) {
          AdminUI.toast('Name, game, game mode, Match Type, Player Format and start time are required', 'err');
          return;
        }
        body.startDate = new Date(body.startDate).toISOString();
        const publishNow = body.publishNow === 'true';
        delete body.publishNow;
        delete body.category;
        if (id) {
          await AdminAPI.updateTournament(id, body);
          AdminUI.toast('Tournament updated');
          go(`tournaments/${id}`);
          return;
        }
        const created = await AdminAPI.createTournament(body);
        const newId = created.tournament?._id || created._id;
        if (publishNow && newId) {
          await AdminAPI.publish(newId);
          AdminUI.toast('Created and published as Upcoming. Players can join.');
        } else {
          AdminUI.toast('Saved as Draft. Click Publish on the list to make it Upcoming.');
        }
        go(newId ? `tournaments/${newId}` : 'tournaments');
      });
    };
  }

  function tabBtn(id, label, current) {
    return `<button class="tab ${current === id ? 'active' : ''}" data-tab="${id}">${label}</button>`;
  }

  function slotState(slot) {
    const pay = String(slot.paymentStatus || slot.players?.[0]?.paymentStatus || '').toUpperCase();
    if (slot.locked) return 'locked';
    if (pay === 'PAID' || pay === 'SUCCESS') return slot.available ? 'paid' : 'confirmed';
    if (!slot.available && pay === 'PENDING') return 'reserved';
    if (slot.available) return 'available';
    return 'reserved';
  }

  async function tournamentDetail(id, tab = 'overview') {
    root().innerHTML = AdminUI.layout('tournaments', '<div class="loading">Loading tournament…</div>');
    AdminUI.bindShell();
    const [detail, entries, prize] = await Promise.all([
      AdminAPI.tournament(id),
      AdminAPI.entries(id).catch(() => ({ slots: [] })),
      AdminAPI.prize(id).catch(() => ({})),
    ]);
    const t = detail.tournament || {};
    const custom = detail.matchKind === 'team_vs_team' || isCustom(t);
    const slots = entries.slots || [];
    const teams = detail.teams || [];
    const participants = detail.participants || [];
    const usesTeams = Boolean(detail.usesTeams || custom);
    const prizeData = prize?.prizeDistribution || prize || detail.prizeDistribution || {};
    const rules = parseRulesList(t.rules);
    const gameName = t.game?.name || '—';
    const gameModeName = t.gameMode?.name || '—';
    const bannerSrc = AdminUI.mediaUrl(t.bannerImage || t.gameMode?.image || t.game?.image || '');
    const format = detail.playerFormatLabel || detail.modeLabel || formatLabel(t);
    const modeLabel = modeDisplay(detail, t, custom);
    const teamSetup = detail.teamSetup || (custom ? 'Team A vs Team B' : usesTeams ? `${modeLabel} teams` : 'Solo — individual slots');
    const joinUnit = 'player';
    const ppt = Number(detail.playersPerTeam || detail.playersCharged || (t.mode === 'squad' || t.mode === 'team' ? 4 : t.mode === 'duo' ? 2 : 1));
    const feePerPlayer = Number(detail.feePerPlayer ?? t.entryFee ?? 0);
    const teamTotal = Number(detail.entryChargeTotal ?? (custom || usesTeams ? feePerPlayer * ppt : feePerPlayer));
    const entryFeeDisplay =
      custom || usesTeams
        ? `${AdminUI.money(feePerPlayer)} / player · team total ${AdminUI.money(teamTotal)}`
        : `${AdminUI.money(feePerPlayer)} / player`;
    const slotUnit = detail.slotUnit || (custom ? 'teams' : 'slots');
    let current = tab || 'overview';
    if (custom && current === 'slots') current = 'teams';
    if (!usesTeams && current === 'teams') current = 'slots';
    if (custom && current === 'kills') current = 'overview';
    const tabDefs = [
      ['overview', 'Match details'],
      ['participants', 'Participants'],
      custom ? null : ['slots', 'Slots'],
      usesTeams ? ['teams', 'Teams'] : null,
      ['payments', 'Payments'],
      ['room', 'Room'],
      ['results', 'Results'],
      ['winners', 'Winners'],
      custom ? null : ['kills', 'Kill rewards'],
      ['activity', 'Activity'],
    ].filter(Boolean);
    if (!tabDefs.some(([key]) => key === current)) current = 'overview';

    const winnerPrize = prizeData.winnerPrize ?? t.prizes?.first ?? 0;
    const runnerUp = prizeData.runnerUpPrize ?? t.prizes?.second ?? 0;
    const r1 = prizeData.rankTiers?.[0]?.prize ?? t.prizes?.first ?? 0;
    const r2 = prizeData.rankTiers?.[1]?.prize ?? t.prizes?.second ?? 0;
    const r3 = prizeData.rankTiers?.[2]?.prize ?? t.prizes?.third ?? 0;

    const overview = `
      <div class="match-banner">
        ${bannerSrc
          ? `<img src="${AdminUI.esc(bannerSrc)}" alt="" />`
          : `<div class="banner-fallback">${AdminUI.esc(t.bannerTitle || t.name || 'Match banner')}</div>`}
      </div>
      <div class="info-grid">
        ${infoCell('Player Format', AdminUI.esc(format))}
        ${infoCell('Mode', AdminUI.esc(displayMatchType(detail)))}
        ${infoCell('Map', AdminUI.esc((t.map || 'Bermuda').toString()))}
        ${infoCell('Game', AdminUI.esc(gameName))}
        ${infoCell('Game mode', AdminUI.esc(gameModeName))}
        ${infoCell('Team setup', AdminUI.esc(teamSetup))}
        ${infoCell('Slots', `${detail.joinedCount ?? 0}/${detail.capacity ?? 0} ${AdminUI.esc(slotUnit)}`)}
        ${infoCell('Entry fee', entryFeeDisplay)}
        ${infoCell('Prize pool', AdminUI.money(t.prizePool))}
        ${infoCell('Per kill', detail.hasKillRewards ? AdminUI.money(t.perKill) : 'Not applicable')}
        ${infoCell('Start time', AdminUI.dt(t.startDate))}
        ${t.isAutoGenerated ? infoCell('Source', `Daily Auto · ${AdminUI.esc(t.autoMatchId?.displayId || t.autoMatchId?.name || 'AUTO')} — edits here apply only to this match`) : ''}
      </div>
      <div class="split">
        <div class="panel">
          <h3 style="margin-top:0">Rules &amp; regulations</h3>
          ${rules.length
            ? `<ol class="rules-list">${rules.map((rule) => `<li>${AdminUI.esc(rule)}</li>`).join('')}</ol>`
            : `<ol class="rules-list"><li>Follow fair play. No hacks or teaming.</li></ol>
               <p class="help" style="margin-top:12px">Players currently see this fallback. Add official match rules so they appear here and in the app.</p>
               <button class="btn btn-primary" id="add-rules" type="button">Add rules &amp; regulations</button>`}
        </div>
        <div class="panel">
          <h3 style="margin-top:0">Prize details</h3>
          <div class="prize-lines">
            <div class="prize-line"><span>Prize pool</span><b>${AdminUI.money(t.prizePool)}</b></div>
            ${detail.hasKillRewards ? `<div class="prize-line"><span>Per kill</span><b>${AdminUI.money(t.perKill)}</b></div>` : '<div class="prize-line"><span>Per kill</span><b>Not applicable</b></div>'}
            ${custom
              ? `<div class="prize-line"><span>Winner</span><b>${AdminUI.money(winnerPrize)}</b></div>
                 <div class="prize-line"><span>Runner-up</span><b>${AdminUI.money(runnerUp)}</b></div>`
              : `<div class="prize-line"><span>1st place</span><b>${AdminUI.money(r1)}</b></div>
                 <div class="prize-line"><span>2nd place</span><b>${AdminUI.money(r2)}</b></div>
                 <div class="prize-line"><span>3rd place</span><b>${AdminUI.money(r3)}</b></div>`}
          </div>
          <button class="btn btn-primary" id="edit-prize" style="margin-top:16px">Edit prize pool</button>
        </div>
      </div>
      <div class="panel" style="margin-top:16px">
        <h3 style="margin-top:0">About this match</h3>
        <div style="font-size:14px;line-height:1.6">${textBlock(t.description, 'No description added.')}</div>
      </div>
      <div class="panel" style="margin-top:16px">
        <h3 style="margin-top:0">Full match record</h3>
        <dl class="kv">
          <dt>Match ID</dt><dd>#${AdminUI.esc(t.matchNumber || t._id || '—')}</dd>
          <dt>Status</dt><dd>${badge(detail.status)}</dd>
          <dt>Match type</dt><dd>${AdminUI.esc(displayMatchType(detail))}</dd>
          <dt>Player Format</dt><dd>${AdminUI.esc(format)}</dd>
          <dt>Map</dt><dd>${AdminUI.esc(t.map || '—')}</dd>
          <dt>Game</dt><dd>${AdminUI.esc(gameName)}</dd>
          <dt>Game mode</dt><dd>${AdminUI.esc(gameModeName)}</dd>
          <dt>Banner title</dt><dd>${AdminUI.esc(t.bannerTitle || '—')}</dd>
          <dt>Match ID (room)</dt><dd>${AdminUI.esc(t.roomId || 'Not set')}</dd>
          <dt>Password</dt><dd>${t.roomPassword ? '••••••' : 'Not set'}</dd>
          <dt>Credentials for joined players</dt><dd>${t.showRoomCredentials ? 'Forced visible' : 'Auto (2 min before start)'}</dd>
          <dt>Locked</dt><dd>${t.locked ? 'Yes' : 'No'}</dd>
          <dt>Results published</dt><dd>${detail.resultsPublished ? 'Yes' : 'No'}</dd>
        </dl>
      </div>`;

    const participantRows = (participants.length ? participants : slots.flatMap((s) => (s.players || []).map((p) => ({ ...p, slotNumber: s.slotNumber, label: s.label }))))
      .map((p) => `
        <tr>
          <td>${AdminUI.esc(p.label || p.slotNumber || '—')}</td>
          <td>${AdminUI.esc(p.gamingUsername || p.displayName || p.userId?.username || '—')}</td>
          <td>${AdminUI.esc(p.userId?.email || p.email || p.username || '—')}</td>
          <td>${badge(p.paymentStatus || p.status)}</td>
          <td>${AdminUI.dt(p.joinedAt)}</td>
        </tr>`).join('');

    const participantsHtml = `
      <div class="card">
        <div class="table-wrap desktop-table"><table>
          <thead><tr><th>Slot</th><th>Player</th><th>Account</th><th>Payment</th><th>Joined</th></tr></thead>
          <tbody>${participantRows || `<tr><td colspan="5">${AdminUI.empty('No participants yet')}</td></tr>`}</tbody>
        </table></div>
        <div class="mobile-list">${(participants.length ? participants : slots.flatMap((s) => s.players || [])).map((p) => `
          <div class="m-card"><strong>${AdminUI.esc(p.gamingUsername || p.displayName || p.userId?.username || 'Player')}</strong>
            <div class="m-row"><span>Payment</span>${badge(p.paymentStatus || p.status)}</div>
          </div>`).join('') || AdminUI.empty('No participants yet')}</div>
      </div>`;

    const slotsHtml = custom ? `
      <div class="panel">${AdminUI.empty('Slot grid is for Battle Royale', 'Use the Teams tab for 1v1 / 2v2 / 4v4.')}</div>
    ` : `
      <div class="slots">${(slots.length ? slots : Array.from({ length: detail.capacity || 50 }, (_, i) => ({ slotNumber: i + 1, available: true }))).map((s) => {
        const state = slotState(s);
        const who = s.displayName || s.teamName || s.players?.[0]?.displayName || s.players?.[0]?.gamingUsername || 'Open';
        return `<div class="slot ${state}">
          <div class="n">Slot ${String(s.slotNumber || s.label || '').padStart(2, '0')}</div>
          <strong>${AdminUI.esc(who)}</strong>
          <div style="margin-top:6px">${badge(state)}</div>
        </div>`;
      }).join('')}</div>`;

    const teamBoxes = (teams.length ? teams : slots.filter((s) => s.side)).map((team) => `
      <div class="team-box">
        <h3>${AdminUI.esc(team.side ? `Team ${team.side}` : team.name || team.label || 'Team')}</h3>
        <div class="m-row"><span>Status</span>${badge(team.status || team.paymentStatus || 'available')}</div>
        <div class="m-row"><span>Entry</span><b>${AdminUI.money(team.entryFee || t.entryFee)}</b></div>
        ${(team.members || team.players || []).map((m) => `<div class="member">${AdminUI.esc(m.gamingUsername || m.displayName || m.userId?.username || 'Player')} · ${AdminUI.esc(m.paymentStatus || '')}</div>`).join('') || '<div class="member">No members yet</div>'}
      </div>`).join('');

    const teamsHtml = `
      <div class="team-grid">${teamBoxes || `<div class="panel">${AdminUI.empty('No teams registered')}</div>`}</div>`;

    const payRows = slots.flatMap((s) => {
      const people = (s.players && s.players.length) ? s.players : [s];
      return people.map((p) => `
        <tr>
          <td>${AdminUI.esc(p.orderId || p.transactionId || s.orderId || '—')}</td>
          <td>${AdminUI.esc(p.displayName || p.gamingUsername || s.displayName || '—')}</td>
          <td>${AdminUI.money(p.entryFee ?? s.entryFee ?? t.entryFee)}</td>
          <td>${badge(txStatus(p.paymentStatus || s.paymentStatus))}</td>
        </tr>`);
    }).join('');

    const paymentsHtml = `<div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Transaction</th><th>Player</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${payRows || `<tr><td colspan="4">${AdminUI.empty('No payments yet')}</td></tr>`}</tbody>
    </table></div></div>`;

    const roomHtml = `
      <div class="form-card" style="max-width:640px">
        <p style="color:var(--text-2);font-size:13px;margin:0 0 12px">Match ID and Password are visible only to players who joined this match. Non-joined users never see them. Auto-unlock is 2 minutes before start unless you force-show below.</p>
        <div class="form-grid">
          <div class="field"><label>Match ID</label><input id="room-id" value="${AdminUI.esc(t.roomId || '')}" /></div>
          <div class="field"><label>Password</label><input id="room-pw" value="${AdminUI.esc(t.roomPassword || '')}" /></div>
          <div class="field full"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="room-show" ${t.showRoomCredentials ? 'checked' : ''} /> Show Match ID &amp; Password to joined players now</label></div>
        </div>
        <button class="btn btn-primary" id="save-room" style="margin-top:12px">Save match credentials</button>
      </div>`;

    const resultsHtml = `<div class="panel" id="results-panel"><div class="loading">Loading results…</div></div>`;
    const winnersHtml = `<div class="panel" id="winners-panel"><div class="loading">Loading winners…</div></div>`;
    const killsHtml = custom
      ? `<div class="panel">${AdminUI.empty('Kill rewards apply to Battle Royale only')}</div>`
      : `<div class="panel"><p>Per-kill: <strong>${AdminUI.money(t.perKill)}</strong></p><p style="color:var(--text-2)">Enter kills on the Results tab after the match is completed.</p></div>`;
    const activityHtml = `<div class="panel" id="activity-panel"><div class="loading">Loading activity…</div></div>`;

    const bodies = {
      overview, participants: participantsHtml, slots: slotsHtml, teams: teamsHtml,
      payments: paymentsHtml, room: roomHtml, results: resultsHtml, winners: winnersHtml,
      kills: killsHtml, activity: activityHtml,
    };

    root().innerHTML = AdminUI.layout('tournaments', `
      <div class="detail-head">
        <div>
          <h1 style="margin:0;font-size:28px;color:var(--primary)">${AdminUI.esc(t.name)}</h1>
          <div style="color:var(--text-2);font-size:13px;margin-top:4px">Match ID #${AdminUI.esc(t.matchNumber || '—')} · ${AdminUI.esc(gameName)} · ${AdminUI.esc(gameModeName)}</div>
          <div class="chip-row">
            ${badge(detail.status)}
            ${t.isAutoGenerated ? '<span class="badge b-primary">Daily Auto</span>' : ''}
            <span class="badge b-primary">${AdminUI.esc(displayMatchType(detail))}</span>
            <span class="badge b-muted">${AdminUI.esc(custom ? format : modeLabel)}</span>
            <span class="badge b-muted">${AdminUI.esc(t.map || 'Map')}</span>
            <span class="badge b-muted">${AdminUI.dt(t.startDate)}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost" id="back">Back</button>
          ${detail.status === 'draft' ? '<button class="btn btn-primary" id="publish-t">Publish to Upcoming</button>' : ''}
          <button class="btn btn-ghost" id="edit">Edit match</button>
        </div>
      </div>
      <div class="tabs">${tabDefs.map(([key, label]) => tabBtn(key, label, current)).join('')}</div>
      ${bodies[current] || overview}
    `);
    AdminUI.bindShell();
    document.getElementById('back').onclick = () => go('tournaments');
    document.getElementById('edit').onclick = () => go(`tournaments/${id}/edit`);
    const addRules = document.getElementById('add-rules');
    if (addRules) addRules.onclick = () => go(`tournaments/${id}/edit`);
    const publishBtn = document.getElementById('publish-t');
    if (publishBtn) publishBtn.onclick = () => guarded(async () => {
      await AdminAPI.publish(id);
      AdminUI.toast('Published — status is now Upcoming. Players can see and join it.');
      go(`tournaments/${id}`);
    });
    document.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.onclick = () => go(`tournaments/${id}?tab=${btn.dataset.tab}`);
    });
    const prizeBtn = document.getElementById('edit-prize');
    if (prizeBtn) prizeBtn.onclick = () => prizeModal(id, custom, prize);
    const saveRoom = document.getElementById('save-room');
    if (saveRoom) saveRoom.onclick = () => guarded(async () => {
      await AdminAPI.setRoom(id, {
        roomId: document.getElementById('room-id').value,
        roomPassword: document.getElementById('room-pw').value,
        showRoomCredentials: document.getElementById('room-show').checked,
      });
      AdminUI.toast('Room details saved');
    });
    if (current === 'results') loadResults(id, custom);
    if (current === 'winners') loadWinners(id);
    if (current === 'activity') loadActivity(id);
  }

  async function prizeModal(id, custom, data) {
    const p = data?.prizeDistribution || data || {};
    AdminUI.modal('Prize pool', 'Set the payout amounts for this tournament.', `
      <form id="p-form" class="form-grid">
        ${custom ? `
          <div class="field"><label>Winner prize</label><input name="winnerPrize" type="number" value="${p.winnerPrize || 0}" /></div>
          <div class="field"><label>Runner-up prize</label><input name="runnerUpPrize" type="number" value="${p.runnerUpPrize || 0}" /></div>
        ` : `
          <div class="field"><label>Rank 1</label><input name="r1" type="number" value="${p.rankTiers?.[0]?.prize || 0}" /></div>
          <div class="field"><label>Rank 2</label><input name="r2" type="number" value="${p.rankTiers?.[1]?.prize || 0}" /></div>
          <div class="field full"><label>Rank 3</label><input name="r3" type="number" value="${p.rankTiers?.[2]?.prize || 0}" /></div>
        `}
      </form>
    `, `<button class="btn btn-ghost" data-close="1">Cancel</button><button class="btn btn-primary" id="p-save">Save</button>`);
    document.getElementById('p-save').onclick = () => guarded(async () => {
      const fd = new FormData(document.getElementById('p-form'));
      const body = custom
        ? { winnerPrize: Number(fd.get('winnerPrize') || 0), runnerUpPrize: Number(fd.get('runnerUpPrize') || 0) }
        : {
            rankTiers: [
              { rankFrom: 1, rankTo: 1, prize: Number(fd.get('r1') || 0) },
              { rankFrom: 2, rankTo: 2, prize: Number(fd.get('r2') || 0) },
              { rankFrom: 3, rankTo: 3, prize: Number(fd.get('r3') || 0) },
            ],
          };
      await AdminAPI.savePrize(id, body);
      AdminUI.closeModal();
      AdminUI.toast('Prize pool saved');
    });
  }

  async function loadResults(id, custom) {
    const panel = document.getElementById('results-panel');
    if (!panel) return;
    try {
      if (custom) {
        const data = await AdminAPI.customResults(id);
        const teams = data.teams || [];
        panel.innerHTML = `
          <form id="res-form">
            <div class="field"><label>Winning team</label>
              <select name="winnerTeamId">${teams.map((t) => `<option value="${t._id}" ${String(data.result?.winnerTeamId?._id || data.result?.winnerTeamId) === String(t._id) ? 'selected' : ''}>${AdminUI.esc(t.name || t.side || 'Team')}</option>`).join('') || '<option value="">No teams</option>'}</select>
            </div>
            <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary" type="submit">Save result</button>
              <button class="btn btn-success" id="publish-res" type="button">Publish results</button>
            </div>
          </form>`;
        document.getElementById('res-form').onsubmit = (e) => {
          e.preventDefault();
          guarded(async () => {
            const fd = new FormData(e.target);
            await AdminAPI.saveCustomResults(id, { winnerTeamId: fd.get('winnerTeamId') });
            AdminUI.toast('Result saved');
          });
        };
        document.getElementById('publish-res').onclick = () => guarded(async () => {
          await AdminAPI.publishResults(id);
          AdminUI.toast('Results published');
        });
        return;
      }
      const data = await AdminAPI.brResults(id);
      const rows = data.isTeamMode ? (data.teams || []) : (data.participants || []);
      const saved = data.isTeamMode ? data.teamResults : data.results;
      panel.innerHTML = `
        <div class="table-wrap"><table>
          <thead><tr><th>${data.isTeamMode ? 'Team' : 'Player'}</th><th>Position</th><th>Kills</th></tr></thead>
          <tbody>${rows.map((row, i) => {
            const sid = data.isTeamMode ? String(row._id) : String(row.userId?._id || row.userId);
            const found = (saved || []).find((r) => String(data.isTeamMode ? r.teamId : r.userId?._id || r.userId) === sid);
            return `<tr>
              <td>${AdminUI.esc(data.isTeamMode ? (row.name || `Slot ${row.slotNumber}`) : (row.gamingUsername || row.userId?.username || 'Player'))}</td>
              <td><input data-id="${sid}" data-f="position" type="number" min="1" value="${found?.position || i + 1}" style="width:80px" /></td>
              <td><input data-id="${sid}" data-f="kills" type="number" min="0" value="${found?.kills ?? found?.teamKills ?? 0}" style="width:80px" /></td>
            </tr>`;
          }).join('') || `<tr><td colspan="3">${AdminUI.empty('No joined players')}</td></tr>`}</tbody>
        </table></div>
        <div style="margin-top:14px;display:flex;gap:8px">
          <button class="btn btn-primary" id="save-br">Save results</button>
          <button class="btn btn-success" id="publish-res">Publish results</button>
        </div>`;
      document.getElementById('save-br').onclick = () => guarded(async () => {
        const grouped = {};
        panel.querySelectorAll('input[data-id]').forEach((input) => {
          grouped[input.dataset.id] = grouped[input.dataset.id] || {};
          grouped[input.dataset.id][input.dataset.f] = Number(input.value || 0);
        });
        const entries = Object.entries(grouped).map(([key, val]) => (
          data.isTeamMode
            ? { teamId: key, position: val.position, teamKills: val.kills }
            : { userId: key, position: val.position, kills: val.kills }
        ));
        await AdminAPI.saveBrResults(id, { entries });
        AdminUI.toast('Results saved');
      });
      document.getElementById('publish-res').onclick = () => guarded(async () => {
        await AdminAPI.publishResults(id);
        AdminUI.toast('Results published');
      });
    } catch (err) {
      panel.innerHTML = `<div class="error-box">${AdminUI.esc(err.message)}</div>`;
    }
  }

  async function loadWinners(id) {
    const panel = document.getElementById('winners-panel');
    if (!panel) return;
    try {
      const data = await AdminAPI.tournamentPayouts(id);
      const items = data.payouts || data.items || data || [];
      panel.innerHTML = `<div class="table-wrap"><table>
        <thead><tr><th>Player</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${(items || []).map((p) => `
          <tr><td>${AdminUI.esc(p.userId?.username || p.username || '—')}</td>
          <td>${AdminUI.money(p.amount)}</td><td>${badge(p.status)}</td></tr>`).join('') || `<tr><td colspan="3">${AdminUI.empty('No winner payouts yet')}</td></tr>`}
        </tbody></table></div>`;
    } catch (err) {
      panel.innerHTML = `<div class="error-box">${AdminUI.esc(err.message)}</div>`;
    }
  }

  async function loadActivity(id) {
    const panel = document.getElementById('activity-panel');
    if (!panel) return;
    try {
      const data = await AdminAPI.auditLogs({ tournamentId: id, page: 1, limit: 30 });
      const items = data.logs || data.items || [];
      panel.innerHTML = items.length ? items.map((log) => `
        <div class="list-row">
          <div><strong>${AdminUI.esc(log.action || 'Activity')}</strong>
            <div style="color:var(--text-2);font-size:12px">${AdminUI.esc(log.adminId?.username || 'Admin')} · ${AdminUI.dt(log.createdAt)}</div>
          </div>
        </div>`).join('') : AdminUI.empty('No activity recorded');
    } catch (err) {
      panel.innerHTML = `<div class="error-box">${AdminUI.esc(err.message)}</div>`;
    }
  }

  async function history() {
    const { params } = parseHash();
    root().innerHTML = AdminUI.layout('history', '<div class="loading">Loading history…</div>');
    AdminUI.bindShell();
    const data = await AdminAPI.history({
      page: Number(params.page) || 1, limit: 15, search: params.search || '', status: params.status || '', category: params.category || '',
    });
    const items = data.items || data || [];
    const meta = data.items ? data : { page: 1, pages: 1, total: items.length };
    root().innerHTML = AdminUI.layout('history', `
      ${AdminUI.pageHead('Tournament history', 'Closed-loop view of collections, prizes and kill rewards.')}
      <div class="filters">
        <input id="h-search" placeholder="Search tournaments..." value="${AdminUI.esc(params.search || '')}" />
        <select id="h-status"><option value="">All status</option><option value="upcoming">Upcoming</option><option value="live">Ongoing</option><option value="completed">Completed</option></select>
        <button class="btn btn-primary" id="h-go">Search</button>
      </div>
      <div class="card">
        <div class="table-wrap desktop-table"><table>
          <thead><tr>
            <th>Tournament</th><th>Match type</th><th>Participants</th><th>Entry collection</th>
            <th>Prize pool</th><th>Kill rewards</th><th>Status</th><th>Completed / start</th><th>Actions</th>
          </tr></thead>
          <tbody>${items.map((row) => `
            <tr>
              <td><strong>${AdminUI.esc(row.name)}</strong></td>
              <td>${AdminUI.esc(displayMatchType(row))}</td>
              <td>${row.bookedSlots}/${row.totalSlots}</td>
              <td>${AdminUI.money(row.collectedAmount)}</td>
              <td>${AdminUI.money(row.prizePool)}</td>
              <td>${row.hasKillRewards ? AdminUI.money(row.killRewardsDistributed) : '—'}</td>
              <td>${badge(row.status)}</td>
              <td>${AdminUI.dateOnly(row.startDate)}</td>
              <td>${AdminUI.actionsMenu(row._id, [{ act: 'view', label: 'View details' }])}</td>
            </tr>`).join('') || `<tr><td colspan="9">${AdminUI.empty('No history yet')}</td></tr>`}</tbody>
        </table></div>
        <div class="mobile-list">${items.map((row) => `
          <div class="m-card">
            <div style="display:flex;justify-content:space-between"><strong>${AdminUI.esc(row.name)}</strong>${AdminUI.actionsMenu(row._id, [{ act: 'view', label: 'View details' }])}</div>
            <div class="m-row"><span>Collected</span><b>${AdminUI.money(row.collectedAmount)}</b></div>
            <div class="m-row"><span>Status</span>${badge(row.status)}</div>
          </div>`).join('')}</div>
        ${AdminUI.pager(meta)}
      </div>`);
    AdminUI.bindShell();
    document.getElementById('h-status').value = params.status || '';
    document.getElementById('h-go').onclick = () => go(`history${qs({ search: document.getElementById('h-search').value, status: document.getElementById('h-status').value })}`);
    AdminUI.bindPager(root(), (p) => go(`history${qs({ ...params, page: p })}`));
    AdminUI.bindActions(root(), (act, id) => go(`history/${id}`));
  }

  async function historyDetail(id) {
    root().innerHTML = AdminUI.layout('history', '<div class="loading">Loading record…</div>');
    AdminUI.bindShell();
    const data = await AdminAPI.entries(id);
    const t = data.tournament || {};
    const slots = data.slots || [];
    root().innerHTML = AdminUI.layout('history', `
      ${AdminUI.pageHead(t.name || 'History detail', `${displayMatchType(t)} · booked ${t.bookedSlots}/${t.totalSlots}`, `<button class="btn btn-secondary" id="back">Back to history</button>`)}
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Slot / team</th><th>Player</th><th>Payment</th><th>Order</th><th>Kills</th><th>Kill reward</th><th>Winnings</th></tr></thead>
        <tbody>${slots.flatMap((s) => {
          const people = (s.players && s.players.length) ? s.players : [s];
          return people.map((p) => `<tr>
            <td>${AdminUI.esc(s.label || s.side || s.slotNumber || '—')}</td>
            <td>${AdminUI.esc(p.displayName || p.gamingUsername || s.displayName || '—')}</td>
            <td>${badge(p.paymentStatus || s.paymentStatus)}</td>
            <td>${AdminUI.esc(p.orderId || p.transactionId || '—')}</td>
            <td>${p.kills ?? s.kills ?? '—'}</td>
            <td>${t.hasKillRewards ? AdminUI.money(p.killReward ?? s.killReward) : '—'}</td>
            <td>${AdminUI.money(p.finalWinnings ?? s.finalWinnings)}</td>
          </tr>`);
        }).join('') || `<tr><td colspan="7">${AdminUI.empty('No entries')}</td></tr>`}</tbody>
      </table></div></div>`);
    AdminUI.bindShell();
    document.getElementById('back').onclick = () => go('history');
  }

  async function players() {
    const { params } = parseHash();
    root().innerHTML = AdminUI.layout('players', '<div class="loading">Loading players…</div>');
    AdminUI.bindShell();
    const data = await AdminAPI.users({ page: Number(params.page) || 1, limit: 20, search: params.search || '', status: params.status || '' });
    const items = data.items || data || [];
    const meta = data.items ? data : { page: 1, pages: 1, total: items.length };
    root().innerHTML = AdminUI.layout('players', `
      ${AdminUI.pageHead('Players', 'Search, verify and control player accounts.')}
      <div class="filters">
        <input id="u-search" placeholder="Search players..." value="${AdminUI.esc(params.search || '')}" />
        <select id="u-status"><option value="">All</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="banned">Banned</option></select>
        <button class="btn btn-primary" id="u-go">Search</button>
      </div>
      <div class="card">
        <div class="table-wrap desktop-table"><table>
          <thead><tr><th>Player</th><th>Email</th><th>Wallet</th><th>Status</th><th>Verified</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>${items.map((u) => `
            <tr>
              <td><strong>${AdminUI.esc(u.username)}</strong></td>
              <td>${AdminUI.esc(u.email || '—')}</td>
              <td>${AdminUI.money(u.wallet?.balance)}</td>
              <td>${badge(u.status)}</td>
              <td>${u.verified ? 'Yes' : 'No'}</td>
              <td>${AdminUI.dt(u.createdAt)}</td>
              <td>${AdminUI.actionsMenu(u._id, [
                { act: 'view', label: 'View' },
                !u.verified ? { act: 'verify', label: 'Verify' } : null,
                u.status !== 'suspended' ? { act: 'suspend', label: 'Disable' } : { act: 'activate', label: 'Enable' },
                u.status !== 'banned' ? { act: 'ban', label: 'Ban', danger: true } : null,
              ])}</td>
            </tr>`).join('') || `<tr><td colspan="7">${AdminUI.empty('No players')}</td></tr>`}</tbody>
        </table></div>
        <div class="mobile-list">${items.map((u) => `
          <div class="m-card">
            <div style="display:flex;justify-content:space-between"><strong>${AdminUI.esc(u.username)}</strong>${AdminUI.actionsMenu(u._id, [{ act: 'view', label: 'View' }])}</div>
            <div class="m-row"><span>Wallet</span><b>${AdminUI.money(u.wallet?.balance)}</b></div>
            <div class="m-row"><span>Status</span>${badge(u.status)}</div>
          </div>`).join('')}</div>
        ${AdminUI.pager(meta)}
      </div>`);
    AdminUI.bindShell();
    document.getElementById('u-status').value = params.status || '';
    document.getElementById('u-go').onclick = () => go(`players${qs({ search: document.getElementById('u-search').value, status: document.getElementById('u-status').value })}`);
    document.getElementById('u-search').addEventListener('input', AdminUI.debounce(() => {
      go(`players${qs({ search: document.getElementById('u-search').value, status: document.getElementById('u-status').value })}`);
    }, 400));
    AdminUI.bindPager(root(), (p) => go(`players${qs({ ...params, page: p })}`));
    AdminUI.bindActions(root(), async (act, id) => {
      await guarded(async () => {
        if (act === 'view') return go(`players/${id}`);
        if (act === 'verify') { await AdminAPI.verifyUser(id); AdminUI.toast('Verified'); }
        if (act === 'suspend') { await AdminAPI.suspendUser(id); AdminUI.toast('Disabled'); }
        if (act === 'activate') { await AdminAPI.activateUser(id); AdminUI.toast('Enabled'); }
        if (act === 'ban') {
          if (!(await AdminUI.confirm('Ban player', 'This player will not be able to sign in.'))) return;
          await AdminAPI.banUser(id, 'Banned from admin panel');
          AdminUI.toast('Banned');
        }
        players();
      });
    });
  }

  async function playerDetail(id) {
    root().innerHTML = AdminUI.layout('players', '<div class="loading">Loading player…</div>');
    AdminUI.bindShell();
    const data = await AdminAPI.userDetails(id);
    const u = data.user || {};
    root().innerHTML = AdminUI.layout('players', `
      ${AdminUI.pageHead(u.username || 'Player', u.email || '', `<button class="btn btn-secondary" id="back">Back to players</button>`)}
      <div class="split">
        <div class="panel">
          <h3 style="margin-top:0">Matches</h3>
          ${(data.tournaments || []).map((t) => `<div class="list-row"><div>${AdminUI.esc(t.tournament?.name || 'Match')}</div><span>${AdminUI.esc(t.status || '')}</span></div>`).join('') || AdminUI.empty('No matches')}
        </div>
        <div class="panel">
          <dl class="kv">
            <dt>Status</dt><dd>${AdminUI.esc(u.status)}</dd>
            <dt>Wallet</dt><dd>${AdminUI.money(data.walletStats?.balance)}</dd>
            <dt>Deposited</dt><dd>${AdminUI.money(data.walletStats?.totalDeposited)}</dd>
            <dt>Winnings</dt><dd>${AdminUI.money(data.walletStats?.totalWinnings)}</dd>
          </dl>
        </div>
      </div>`);
    AdminUI.bindShell();
    document.getElementById('back').onclick = () => go('players');
  }

  async function opsList(nav, title, subtitle, filter) {
    root().innerHTML = AdminUI.layout(nav, '<div class="loading">Loading…</div>');
    AdminUI.bindShell();
    const data = await AdminAPI.tournaments({ page: 1, limit: 30, ...filter });
    const items = data.items || data || [];
    root().innerHTML = AdminUI.layout(nav, `
      ${AdminUI.pageHead(title, subtitle)}
      <div class="card">
        <div class="table-wrap desktop-table"><table>
          <thead><tr><th>Tournament</th><th>Type</th><th>Status</th><th>Start</th><th>Actions</th></tr></thead>
          <tbody>${items.map((row) => `<tr>
            <td><strong>${AdminUI.esc(row.name)}</strong></td>
            <td>${AdminUI.esc(displayMatchType(row))}</td>
            <td>${badge(row.status)}</td>
            <td>${AdminUI.dt(row.startDate)}</td>
            <td>${rowActions(row)}</td>
          </tr>`).join('') || `<tr><td colspan="5">${AdminUI.empty('No matching tournaments')}</td></tr>`}</tbody>
        </table></div>
        <div class="mobile-list">${items.map((row) => `
          <div class="m-card"><div style="display:flex;justify-content:space-between"><strong>${AdminUI.esc(row.name)}</strong>${rowActions(row)}</div>
          <div class="m-row"><span>Status</span>${badge(row.status)}</div></div>`).join('')}</div>
      </div>`);
    AdminUI.bindShell();
    AdminUI.bindActions(root(), handleTournamentAction);
  }

  async function payments(nav = 'payments', extra = {}) {
    const { params } = parseHash();
    root().innerHTML = AdminUI.layout(nav, '<div class="loading">Loading transactions…</div>');
    AdminUI.bindShell();
    const data = await AdminAPI.transactions({
      page: Number(params.page) || 1,
      limit: 20,
      search: params.search || '',
      status: params.status || extra.status || '',
      type: extra.type || params.type || '',
    });
    const items = data.transactions || data.items || [];
    const meta = data.page ? data : { page: 1, pages: 1, total: items.length };
    const title = extra.title || 'Transactions';
    root().innerHTML = AdminUI.layout(nav, `
      ${AdminUI.pageHead(title, extra.subtitle || 'Wallet and entry payments across the platform.')}
      <div class="filters">
        <input id="p-search" placeholder="Search player or transaction ID..." value="${AdminUI.esc(params.search || '')}" />
        <select id="p-status">
          <option value="">All status</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <button class="btn btn-primary" id="p-go">Search</button>
      </div>
      <div class="card">
        <div class="table-wrap desktop-table"><table>
          <thead><tr><th>Transaction ID</th><th>Player</th><th>Tournament</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>${items.map((tx) => `
            <tr>
              <td>${AdminUI.esc(tx.transactionId || tx.zapupiTxnId || tx.cashfreePaymentId || tx._id)}</td>
              <td>${AdminUI.esc(tx.userId?.username || tx.userId?.email || '—')}</td>
              <td>${AdminUI.esc(tx.tournamentId?.name || extraType(tx.type))}</td>
              <td>${AdminUI.money(tx.amount)}</td>
              <td>${AdminUI.esc(tx.paymentMethod || tx.type || 'wallet')}</td>
              <td>${badge(txStatus(tx.status))}</td>
              <td>${AdminUI.dt(tx.createdAt)}</td>
              <td>${AdminUI.actionsMenu(tx.userId?._id || tx._id, [
                tx.userId?._id ? { act: 'player', label: 'View player' } : null,
                tx.tournamentId?._id ? { act: 'tournament:' + tx.tournamentId._id, label: 'View tournament' } : null,
              ])}</td>
            </tr>`).join('') || `<tr><td colspan="8">${AdminUI.empty('No transactions')}</td></tr>`}</tbody>
        </table></div>
        <div class="mobile-list">${items.map((tx) => `
          <div class="m-card">
            <strong>${AdminUI.esc(tx.userId?.username || 'Player')}</strong>
            <div class="m-row"><span>Amount</span><b>${AdminUI.money(tx.amount)}</b></div>
            <div class="m-row"><span>Status</span>${badge(txStatus(tx.status))}</div>
          </div>`).join('')}</div>
        ${AdminUI.pager(meta)}
      </div>`);
    AdminUI.bindShell();
    document.getElementById('p-status').value = params.status || extra.status || '';
    const apply = (page = 1) => go(`${nav === 'withdrawals' ? 'withdrawals' : nav === 'payment-history' ? 'payment-history' : 'payments'}${qs({
      search: document.getElementById('p-search').value,
      status: document.getElementById('p-status').value,
      type: extra.type || '',
      page,
    })}`);
    document.getElementById('p-go').onclick = () => apply(1);
    AdminUI.bindPager(root(), (p) => apply(p));
    AdminUI.bindActions(root(), (act, id) => {
      if (act === 'player') return go(`players/${id}`);
      if (String(act).startsWith('tournament:')) return go(`tournaments/${String(act).slice(11)}`);
    });
  }

  function extraType(type) {
    const map = { deposit: 'Wallet top-up', withdraw: 'Withdrawal', tournament_entry: 'Entry', tournament_reward: 'Reward', winning: 'Winning', refund: 'Refund' };
    return map[type] || type || '—';
  }

  async function wallet() {
    const { params } = parseHash();
    root().innerHTML = AdminUI.layout('wallet', '<div class="loading">Loading wallets…</div>');
    AdminUI.bindShell();
    const data = await AdminAPI.users({ page: Number(params.page) || 1, limit: 20, search: params.search || '' });
    const items = data.items || data || [];
    const meta = data.items ? data : { page: 1, pages: 1, total: items.length };
    root().innerHTML = AdminUI.layout('wallet', `
      ${AdminUI.pageHead('Wallet', 'Player wallet balances across the platform.')}
      <div class="filters"><input id="w-search" placeholder="Search players..." value="${AdminUI.esc(params.search || '')}" /><button class="btn btn-primary" id="w-go">Search</button></div>
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Player</th><th>Email</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${items.map((u) => `<tr>
          <td><strong>${AdminUI.esc(u.username)}</strong></td><td>${AdminUI.esc(u.email || '—')}</td>
          <td>${AdminUI.money(u.wallet?.balance)}</td><td>${badge(u.status)}</td>
          <td>${AdminUI.actionsMenu(u._id, [{ act: 'view', label: 'View player' }])}</td>
        </tr>`).join('')}</tbody>
      </table></div>${AdminUI.pager(meta)}</div>`);
    AdminUI.bindShell();
    document.getElementById('w-go').onclick = () => go(`wallet${qs({ search: document.getElementById('w-search').value })}`);
    AdminUI.bindPager(root(), (p) => go(`wallet${qs({ ...params, page: p })}`));
    AdminUI.bindActions(root(), (act, id) => go(`players/${id}`));
  }

  async function winnersOps() {
    root().innerHTML = AdminUI.layout('ops-winners', '<div class="loading">Loading payouts…</div>');
    AdminUI.bindShell();
    const data = await AdminAPI.payouts({ page: 1, limit: 40 });
    const items = data.payouts || data.items || data || [];
    root().innerHTML = AdminUI.layout('ops-winners', `
      ${AdminUI.pageHead('Winners & payouts', 'Track prize credits after results are published.')}
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Player</th><th>Tournament</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>${(items || []).map((p) => `<tr>
          <td>${AdminUI.esc(p.userId?.username || '—')}</td>
          <td>${AdminUI.esc(p.tournamentId?.name || '—')}</td>
          <td>${AdminUI.money(p.amount)}</td>
          <td>${badge(p.status)}</td>
          <td>${AdminUI.dt(p.createdAt || p.paidAt)}</td>
        </tr>`).join('') || `<tr><td colspan="5">${AdminUI.empty('No payouts yet')}</td></tr>`}</tbody>
      </table></div></div>`);
    AdminUI.bindShell();
  }

  async function activity() {
    const { params } = parseHash();
    root().innerHTML = AdminUI.layout('activity', '<div class="loading">Loading activity…</div>');
    AdminUI.bindShell();
    const data = await AdminAPI.auditLogs({ page: Number(params.page) || 1, limit: 30 });
    const items = data.logs || data.items || [];
    const meta = data.page ? data : { page: 1, pages: 1, total: items.length };
    root().innerHTML = AdminUI.layout('activity', `
      ${AdminUI.pageHead('Activity', 'Admin actions across tournaments, wallets and users.')}
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Action</th><th>Admin</th><th>Player</th><th>Date</th></tr></thead>
        <tbody>${items.map((log) => `<tr>
          <td>${AdminUI.esc(log.action || '—')}</td>
          <td>${AdminUI.esc(log.adminId?.username || '—')}</td>
          <td>${AdminUI.esc(log.userId?.username || '—')}</td>
          <td>${AdminUI.dt(log.createdAt)}</td>
        </tr>`).join('') || `<tr><td colspan="4">${AdminUI.empty('No activity yet')}</td></tr>`}</tbody>
      </table></div>${AdminUI.pager(meta)}</div>`);
    AdminUI.bindShell();
    AdminUI.bindPager(root(), (p) => go(`activity?page=${p}`));
  }

  function catalogForm(title, description, fieldsHtml, onSave) {
    AdminUI.modal(title, description, `<form id="s-form">${fieldsHtml}</form>`,
      `<button class="btn btn-ghost" data-close="1">Cancel</button><button class="btn btn-primary" id="s-save">Save</button>`);
    AdminUI.bindImageUploads(document.getElementById('modal-root'));
    document.getElementById('s-save').onclick = () => guarded(async () => {
      const body = Object.fromEntries(new FormData(document.getElementById('s-form')).entries());
      const ok = await onSave(body);
      if (ok !== false) AdminUI.closeModal();
    });
  }

  function simpleForm(title, fields, onSave) {
    catalogForm(title, 'Fill in the required details, then save.', fields.map(([name, label, value = '']) =>
      `<div class="field"><label>${label}</label><input name="${name}" value="${AdminUI.esc(value || '')}" ${name === 'name' || name === 'title' ? 'required' : ''} /></div>`
    ).join(''), onSave);
  }

  function gameFields(g = {}) {
    return `
      <div class="field"><label>Game name <span class="req">*</span></label><input name="name" required value="${AdminUI.esc(g.name || '')}" placeholder="Free Fire" /></div>
      <div class="field" style="background:#fff7ed;border:1px solid #fdba74;border-radius:12px;padding:12px">
        <label>Display order <span class="req">*</span> (0 = first on player app)</label>
        <input name="sortOrder" type="number" min="0" step="1" required value="${AdminUI.esc(String(g.sortOrder ?? 0))}" />
        <span class="help">Lower number shows first. Example: 0, then 1, then 2…</span>
      </div>
      ${AdminUI.imageField('image', g.image || '', 'Game image', true)}
      <div class="field"><label>Status</label>
        <select name="status">
          <option value="active" ${(g.status || 'active') !== 'inactive' ? 'selected' : ''}>Active</option>
          <option value="inactive" ${g.status === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
      </div>
      <div class="field full"><label>Description</label><textarea name="description" placeholder="Shown on the game page">${AdminUI.esc(g.description || '')}</textarea></div>
      <label class="help" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="isPopular" value="true" ${g.isPopular ? 'checked' : ''} /> Show on home as popular</label>`;
  }

  function modeFields(m = {}) {
    return `
      <div class="field"><label>Mode name <span class="req">*</span></label><input name="name" required value="${AdminUI.esc(m.name || '')}" placeholder="Battle Royale / Clash Squad" /></div>
      <div class="field" style="background:#fff7ed;border:1px solid #fdba74;border-radius:12px;padding:12px">
        <label>Display order <span class="req">*</span> (0 = first on player app)</label>
        <input name="sortOrder" type="number" min="0" step="1" required value="${AdminUI.esc(String(Number.isFinite(Number(m.sortOrder)) ? m.sortOrder : 0))}" />
        <span class="help">This controls Home / Game List order. 0 shows first, 1 second, and so on.</span>
      </div>
      ${AdminUI.imageField('image', m.image || '', 'Mode image', true)}
      <div class="field"><label>Status</label>
        <select name="status">
          <option value="active" ${(m.status || 'active') !== 'inactive' ? 'selected' : ''}>Active</option>
          <option value="inactive" ${m.status === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
      </div>
      <div class="field full"><label>Description</label><textarea name="description">${AdminUI.esc(m.description || '')}</textarea></div>`;
  }

  async function games() {
    root().innerHTML = AdminUI.layout('games', '<div class="loading">Loading catalog…</div>');
    AdminUI.bindShell();
    const list = await AdminAPI.games();
    const blocks = [];
    const sortModes = (modes) => [...(modes || [])].sort((a, b) => {
      const ao = Number(a?.sortOrder); const bo = Number(b?.sortOrder);
      const aOrder = Number.isFinite(ao) ? ao : 0;
      const bOrder = Number.isFinite(bo) ? bo : 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' });
    });
    for (const g of list || []) {
      blocks.push({ game: g, modes: sortModes(await AdminAPI.modes(g._id).catch(() => [])) });
    }

    async function reorderModes(gameId, modeId, direction) {
      const block = blocks.find((b) => String(b.game._id) === String(gameId));
      if (!block) return;
      const sorted = [...block.modes];
      const i = sorted.findIndex((m) => String(m._id) === String(modeId));
      const j = direction === 'up' ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= sorted.length) return;
      const next = [...sorted];
      const [moved] = next.splice(i, 1);
      next.splice(j, 0, moved);
      await Promise.all(next.map((m, idx) => AdminAPI.updateMode(m._id, { sortOrder: idx })));
      AdminUI.toast('Mode order updated — 0 is first on the player app');
      games();
    }

    root().innerHTML = AdminUI.layout('games', `
      ${AdminUI.pageHead('Games & modes', 'Set <b>Order</b> so players see modes correctly. <b>0 = first</b> on Home / Game List. Use ↑ ↓ or Edit → Order.', `<button class="btn btn-primary" id="add-game">${AdminUI.icon.plus} Add game</button>`)}
      ${blocks.length ? blocks.map(({ game, modes }) => `
        <div class="panel" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap">
            <div style="display:flex;gap:12px;align-items:center;min-width:0">
              ${game.image ? AdminUI.img(game.image, 'game-hero') : '<div class="game-hero"></div>'}
              <div>
                <strong>${AdminUI.esc(game.name)}</strong>
                <div style="color:var(--text-2);font-size:13px">Order ${AdminUI.esc(String(game.sortOrder ?? 0))} · ${AdminUI.esc(game.status || 'active')}${game.isPopular ? ' · Popular' : ''}</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <button class="btn btn-ghost" data-toggle-game="${game._id}" data-status="${game.status === 'inactive' ? 'inactive' : 'active'}">${game.status === 'inactive' ? 'Set active' : 'Set inactive'}</button>
              <button class="btn btn-ghost" data-addmode="${game._id}">Add mode</button>
              ${AdminUI.actionsMenu(game._id, [{ act: 'edit', label: 'Edit' }, { act: 'delete', label: 'Delete', danger: true }])}
            </div>
          </div>
          <div class="table-wrap" style="margin-top:12px"><table>
            <thead><tr><th>Mode</th><th style="min-width:140px">Order (0=first)</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${modes.map((m, idx) => `<tr>
              <td>${m.image ? AdminUI.img(m.image, 'mode-thumb') : ''}${AdminUI.esc(toPlayerMatchLabel(m.name))}</td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value="${AdminUI.esc(String(Number.isFinite(Number(m.sortOrder)) ? m.sortOrder : idx))}"
                    data-order-input="${m._id}"
                    data-game="${game._id}"
                    style="width:64px;height:36px;border:1px solid var(--border);border-radius:8px;padding:0 8px;font-weight:700"
                    title="0 = first on player app"
                  />
                  <button type="button" class="btn btn-ghost btn-icon" title="Save order" data-save-order="${m._id}" data-game="${game._id}">Save</button>
                  <button type="button" class="btn btn-ghost btn-icon" title="Move up (lower order)" data-move-mode="${m._id}" data-game="${game._id}" data-dir="up" ${idx === 0 ? 'disabled' : ''}>↑</button>
                  <button type="button" class="btn btn-ghost btn-icon" title="Move down (higher order)" data-move-mode="${m._id}" data-game="${game._id}" data-dir="down" ${idx === modes.length - 1 ? 'disabled' : ''}>↓</button>
                </div>
              </td>
              <td>${badge(m.status || 'active')}</td>
              <td style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                <button class="btn btn-ghost" data-toggle-mode="${m._id}" data-status="${m.status === 'inactive' ? 'inactive' : 'active'}">${m.status === 'inactive' ? 'Activate' : 'Deactivate'}</button>
                ${AdminUI.actionsMenu('mode:' + m._id, [{ act: 'edit-mode', label: 'Edit' }, { act: 'delete-mode', label: 'Delete', danger: true }])}
              </td>
            </tr>`).join('') || `<tr><td colspan="4">${AdminUI.empty('No modes yet', 'Add Battle Royale and Clash Squad modes with images.')}</td></tr>`}</tbody>
          </table></div>
        </div>`).join('') : `<div class="panel">${AdminUI.empty('No games yet', 'Add your first game, upload its image, then add modes.')}</div>`}
    `);
    AdminUI.bindShell();
    const saveGame = async (body, id) => {
      if (!body.name) {
        AdminUI.toast('Game name is required', 'err');
        return false;
      }
      if (!body.image && !id) {
        AdminUI.toast('Game image is required', 'err');
        return false;
      }
      if (!body.image && id) delete body.image;
      body.isPopular = body.isPopular === 'true';
      body.sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
      body.status = body.status === 'inactive' ? 'inactive' : 'active';
      if (id) await AdminAPI.updateGame(id, body);
      else await AdminAPI.createGame(body);
      AdminUI.toast(id ? 'Game updated' : 'Game created');
      games();
      return true;
    };
    const saveMode = async (body, gameId, modeId) => {
      if (!body.name) {
        AdminUI.toast('Mode name is required', 'err');
        return false;
      }
      if (!body.image && !modeId) {
        AdminUI.toast('Mode image is required', 'err');
        return false;
      }
      if (!body.image && modeId) delete body.image;
      body.sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
      body.status = body.status === 'inactive' ? 'inactive' : 'active';
      if (modeId) await AdminAPI.updateMode(modeId, body);
      else await AdminAPI.createMode({ ...body, gameId });
      AdminUI.toast(modeId ? 'Mode updated' : 'Mode created');
      games();
      return true;
    };
    document.getElementById('add-game').onclick = () => catalogForm('Add game', 'Upload the poster players will see on Home.', gameFields(), (body) => saveGame(body));
    document.querySelectorAll('[data-addmode]').forEach((btn) => {
      btn.onclick = () => catalogForm('Add mode', 'Upload the mode poster. Order 0 shows first on the player app.', modeFields(), (body) => saveMode(body, btn.dataset.addmode));
    });
    document.querySelectorAll('[data-move-mode]').forEach((btn) => {
      btn.onclick = () => guarded(async () => {
        await reorderModes(btn.dataset.game, btn.dataset.moveMode, btn.dataset.dir);
      });
    });
    document.querySelectorAll('[data-save-order]').forEach((btn) => {
      btn.onclick = () => guarded(async () => {
        const modeId = btn.dataset.saveOrder;
        const input = root().querySelector(`[data-order-input="${modeId}"]`);
        const sortOrder = Number(input?.value);
        if (!Number.isFinite(sortOrder) || sortOrder < 0) {
          AdminUI.toast('Enter a valid order number (0 or higher)', 'err');
          return;
        }
        await AdminAPI.updateMode(modeId, { sortOrder });
        AdminUI.toast(`Order saved as ${sortOrder} — lower shows first on app`);
        games();
      });
    });
    document.querySelectorAll('[data-toggle-game]').forEach((btn) => {
      btn.onclick = () => guarded(async () => {
        const next = btn.dataset.status === 'inactive' ? 'active' : 'inactive';
        await AdminAPI.updateGame(btn.dataset.toggleGame, { status: next });
        AdminUI.toast(next === 'active' ? 'Game activated' : 'Game deactivated');
        games();
      });
    });
    document.querySelectorAll('[data-toggle-mode]').forEach((btn) => {
      btn.onclick = () => guarded(async () => {
        const next = btn.dataset.status === 'inactive' ? 'active' : 'inactive';
        await AdminAPI.updateMode(btn.dataset.toggleMode, { status: next });
        AdminUI.toast(next === 'active' ? 'Mode activated' : 'Mode deactivated');
        games();
      });
    });
    AdminUI.bindActions(root(), async (act, id) => {
      await guarded(async () => {
        if (act === 'delete' && await AdminUI.confirm('Delete game', 'Modes under this game will also be removed.')) {
          await AdminAPI.deleteGame(id); AdminUI.toast('Deleted'); return games();
        }
        if (act === 'edit') {
          const g = (list || []).find((x) => x._id === id);
          return catalogForm('Edit game', 'Change Display order (0 = first), image, or name.', gameFields(g || {}), (body) => saveGame(body, id));
        }
        if (act === 'edit-mode') {
          const modeId = id.replace('mode:', '');
          const found = blocks.flatMap((b) => b.modes.map((m) => ({ ...m, gameId: b.game._id }))).find((m) => String(m._id) === String(modeId));
          return catalogForm('Edit mode', 'Set Display order first (0 = first on Home / Game List), then image/name.', modeFields(found || {}), (body) => saveMode(body, found?.gameId, modeId));
        }
        if (act === 'delete-mode') {
          const modeId = id.replace('mode:', '');
          if (await AdminUI.confirm('Delete mode', 'This mode will be removed.')) {
            await AdminAPI.deleteMode(modeId); AdminUI.toast('Deleted'); games();
          }
        }
      });
    });
  }

  async function matchTypesPage() {
    root().innerHTML = AdminUI.layout('match-types', '<div class="loading">Loading Match Types…</div>');
    AdminUI.bindShell();
    const list = await AdminAPI.matchTypes();
    root().innerHTML = AdminUI.layout('match-types', `
      ${AdminUI.pageHead('Match Types', 'Simple catalog shown as Match Type on tournaments. Add a name, activate/deactivate, or delete.', `<button class="btn btn-primary" id="add-mt">${AdminUI.icon.plus} Add Match Type</button>`)}
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${(list || []).map((m) => `<tr>
          <td><b>${AdminUI.esc(m.name)}</b></td>
          <td>${m.active === false ? badge('draft') : badge('active')}</td>
          <td>${AdminUI.actionsMenu(m._id, [
            { act: 'edit', label: 'Edit' },
            { act: m.active === false ? 'activate' : 'deactivate', label: m.active === false ? 'Activate' : 'Deactivate' },
            { act: 'delete', label: 'Delete', danger: true },
          ])}</td>
        </tr>`).join('') || `<tr><td colspan="3">${AdminUI.empty('No Match Types')}</td></tr>`}</tbody>
      </table></div></div>`);
    AdminUI.bindShell();
    const openMt = (item = {}) => {
      AdminUI.modal(
        item._id ? 'Edit Match Type' : 'Add Match Type',
        'Only the name and active status. Example: Battle Royale, Clash Squad, Lone Wolf.',
        `<form id="mt-form" class="form-card" style="box-shadow:none;border:0;padding:0">
          <div class="form-grid">
            <div class="field full"><label>Name <span class="req">*</span></label><input name="name" required value="${AdminUI.esc(item.name || '')}" placeholder="e.g. Battle Royale" /></div>
            <div class="field full"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="active" ${item.active !== false ? 'checked' : ''} /> Active</label></div>
          </div>
          <div class="modal-foot" style="padding:16px 0 0;margin:0"><button type="button" class="btn btn-ghost" id="mt-cancel">Cancel</button><button class="btn btn-primary" type="submit">Save</button></div>
        </form>`
      );
      document.getElementById('mt-cancel').onclick = () => AdminUI.closeModal();
      document.getElementById('mt-form').onsubmit = (e) => {
        e.preventDefault();
        guarded(async () => {
          const fd = new FormData(e.target);
          const body = {
            name: String(fd.get('name') || '').trim(),
            active: fd.get('active') === 'on',
          };
          if (!body.name) {
            AdminUI.toast('Name required', 'err');
            return;
          }
          if (item._id) await AdminAPI.updateMatchType(item._id, body);
          else await AdminAPI.createMatchType(body);
          AdminUI.closeModal();
          AdminUI.toast('Saved');
          matchTypesPage();
        });
      };
    };
    document.getElementById('add-mt').onclick = () => openMt();
    AdminUI.bindActions(root(), async (act, id) => {
      const item = (list || []).find((x) => String(x._id) === String(id));
      if (act === 'edit') return openMt(item || {});
      if (act === 'activate') {
        await AdminAPI.setMatchTypeActive(id, true);
        AdminUI.toast('Activated');
        return matchTypesPage();
      }
      if (act === 'deactivate') {
        await AdminAPI.setMatchTypeActive(id, false);
        AdminUI.toast('Deactivated');
        return matchTypesPage();
      }
      if (act === 'delete' && await AdminUI.confirm('Delete Match Type', 'This permanently removes it from the catalog. Existing tournaments keep their saved Match Type name.')) {
        await AdminAPI.deleteMatchType(id);
        AdminUI.toast('Deleted');
        matchTypesPage();
      }
    });
  }

  async function maps() {
    root().innerHTML = AdminUI.layout('maps', '<div class="loading">Loading maps…</div>');
    AdminUI.bindShell();
    const list = await AdminAPI.maps();
    root().innerHTML = AdminUI.layout('maps', `
      ${AdminUI.pageHead('Maps', 'Maps available on tournament forms.', `<button class="btn btn-primary" id="add-map">${AdminUI.icon.plus} Add map</button>`)}
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${(list || []).map((m) => `<tr><td>${AdminUI.esc(m.name)}</td><td>${m.active === false ? badge('draft') : badge('active')}</td>
          <td>${AdminUI.actionsMenu(m._id, [{ act: 'edit', label: 'Edit' }, { act: 'delete', label: 'Delete', danger: true }])}</td></tr>`).join('') || `<tr><td colspan="3">${AdminUI.empty('No maps')}</td></tr>`}</tbody>
      </table></div></div>`);
    AdminUI.bindShell();
    document.getElementById('add-map').onclick = () => simpleForm('Add map', [['name', 'Name']], async (body) => {
      await AdminAPI.createMap(body); AdminUI.toast('Created'); maps();
    });
    AdminUI.bindActions(root(), async (act, id) => {
      if (act === 'delete' && await AdminUI.confirm('Delete map', 'Remove this map?')) {
        await AdminAPI.deleteMap(id); AdminUI.toast('Deleted'); maps();
      }
      if (act === 'edit') {
        const m = (list || []).find((x) => x._id === id);
        simpleForm('Edit map', [['name', 'Name', m?.name]], async (body) => {
          await AdminAPI.updateMap(id, body); AdminUI.toast('Updated'); maps();
        });
      }
    });
  }

  async function sliders() {
    root().innerHTML = AdminUI.layout('sliders', '<div class="loading">Loading banners…</div>');
    AdminUI.bindShell();
    const list = await AdminAPI.sliders();
    const items = Array.isArray(list) ? list : [];
    root().innerHTML = AdminUI.layout('sliders', `
      ${AdminUI.pageHead('Home banners', 'Upload the images shown on the player home slider.', `<button class="btn btn-primary" id="add-s">${AdminUI.icon.plus} Add banner</button>`)}
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Preview</th><th>Link</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${items.map((s) => `<tr>
          <td>${s.image ? AdminUI.img(s.image, 'thumb') : '—'}</td>
          <td>${AdminUI.esc(s.link || '—')}</td>
          <td>${s.active === false ? badge('draft') : badge('active')}</td>
          <td>${AdminUI.actionsMenu(s._id || s.id, [{ act: 'edit', label: 'Edit' }, { act: 'delete', label: 'Delete', danger: true }])}</td>
        </tr>`).join('') || `<tr><td colspan="4">${AdminUI.empty('No banners yet', 'Upload home slider images from here.')}</td></tr>`}</tbody>
      </table></div></div>`);
    AdminUI.bindShell();
    const openSlider = (item = {}) => catalogForm(
      item._id ? 'Edit banner' : 'Add banner',
      'Upload a wide banner image for the home screen.',
      `${AdminUI.imageField('image', item.image || '', 'Banner image', true)}
       <div class="field"><label>Optional link</label><input name="link" value="${AdminUI.esc(item.link || '')}" placeholder="https://..." /></div>`,
      async (body) => {
        if (!body.image) {
          AdminUI.toast('Banner image is required', 'err');
          return false;
        }
        if (item._id || item.id) await AdminAPI.updateSlider(item._id || item.id, body);
        else await AdminAPI.createSlider(body);
        AdminUI.toast('Banner saved');
        sliders();
        return true;
      }
    );
    document.getElementById('add-s').onclick = () => openSlider();
    AdminUI.bindActions(root(), async (act, id) => {
      const item = items.find((x) => String(x._id || x.id) === String(id));
      if (act === 'edit') return openSlider(item || {});
      if (act === 'delete' && await AdminUI.confirm('Delete banner', 'Remove this home banner?')) {
        await AdminAPI.deleteSlider(id);
        AdminUI.toast('Deleted');
        sliders();
      }
    });
  }

  async function support() {
    root().innerHTML = AdminUI.layout('support', '<div class="loading">Loading tickets…</div>');
    AdminUI.bindShell();
    const data = await AdminAPI.tickets();
    const items = Array.isArray(data) ? data : (data.tickets || data.items || []);
    root().innerHTML = AdminUI.layout('support', `
      ${AdminUI.pageHead('Support', 'Player tickets and operational follow-up.')}
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Ticket</th><th>Player</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
        <tbody>${items.map((t) => `<tr>
          <td>${AdminUI.esc(t.ticketCode || t.category || 'Ticket')}</td>
          <td>${AdminUI.esc(t.user?.username || t.userId?.username || '—')}</td>
          <td>${badge(t.status || 'open')}</td>
          <td>${AdminUI.dt(t.updatedAt || t.createdAt)}</td>
          <td>${AdminUI.actionsMenu(t.id || t._id, [{ act: 'close', label: 'Mark closed' }])}</td>
        </tr>`).join('') || `<tr><td colspan="5">${AdminUI.empty('No tickets')}</td></tr>`}</tbody>
      </table></div></div>`);
    AdminUI.bindShell();
    AdminUI.bindActions(root(), async (act, id) => {
      if (act === 'close') {
        await AdminAPI.updateTicket(id, { status: 'closed' });
        AdminUI.toast('Updated');
        support();
      }
    });
  }

  async function announcements() {
    root().innerHTML = AdminUI.layout('announcements', '<div class="loading">Loading…</div>');
    AdminUI.bindShell();
    const list = await AdminAPI.announcements();
    const items = Array.isArray(list) ? list : (list.items || []);
    root().innerHTML = AdminUI.layout('announcements', `
      ${AdminUI.pageHead('Announcements', 'Home ticker and important updates.', `<button class="btn btn-primary" id="add-a">${AdminUI.icon.plus} Add</button>`)}
      <div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Title</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>${items.map((a) => `<tr>
          <td>${AdminUI.esc(a.title || '—')}</td>
          <td>${a.isActive === false ? badge('draft') : badge('active')}</td>
          <td>${AdminUI.dt(a.createdAt)}</td>
          <td>${AdminUI.actionsMenu(a.id || a._id, [
            { act: 'toggle', label: a.isActive === false ? 'Enable' : 'Disable' },
            { act: 'delete', label: 'Delete', danger: true },
          ])}</td>
        </tr>`).join('') || `<tr><td colspan="4">${AdminUI.empty('No announcements')}</td></tr>`}</tbody>
      </table></div></div>`);
    AdminUI.bindShell();
    document.getElementById('add-a').onclick = () => simpleForm('Add announcement', [['title', 'Title'], ['description', 'Message']], async (body) => {
      await AdminAPI.createAnnouncement(body); AdminUI.toast('Created'); announcements();
    });
    AdminUI.bindActions(root(), async (act, id) => {
      const a = items.find((x) => String(x.id || x._id) === String(id));
      if (act === 'toggle') {
        await AdminAPI.updateAnnouncement(id, { isActive: a?.isActive === false });
        AdminUI.toast('Updated'); announcements();
      }
      if (act === 'delete' && await AdminUI.confirm('Delete', 'Remove this announcement?')) {
        await AdminAPI.deleteAnnouncement(id); AdminUI.toast('Deleted'); announcements();
      }
    });
  }

  function autoMatchActions(row) {
    const active = row.isActive !== false;
    return [
      { act: 'edit', label: 'Edit' },
      { act: 'generate', label: "Generate today's match" },
      { act: 'generated', label: 'View generated tournaments' },
      { act: active ? 'deactivate' : 'activate', label: active ? 'Deactivate' : 'Activate' },
      { act: 'duplicate', label: 'Duplicate' },
      { act: 'delete', label: 'Delete', danger: true },
    ];
  }

  function dailyAutoRowMeta(row) {
    const matchType = row.matchTypeName || row.matchType?.name || displayMatchType(row);
    const pf = row.playerFormatLabel || formatLabel(row);
    const map = row.map || '—';
    const slots = row.slotsLabel || (row.slots ? `${row.slots} Slots` : '48 Slots');
    const ppt = row.playersPerTeam || playersPerTeamFor(row.playerFormat || row.mode);
    return { matchType, pf, map, slots, ppt };
  }

  async function dailyAutoMatches() {
    root().innerHTML = AdminUI.layout('daily-auto', '<div class="loading">Loading Daily Auto Matches…</div>');
    AdminUI.bindShell();
    const items = await AdminAPI.dailyAutoMatches();
    const todayReady = items.filter((r) => r.todayTournamentExists).length;
    root().innerHTML = AdminUI.layout('daily-auto', `
      ${AdminUI.pageHead(
        'Daily Auto Matches',
        'Master templates run daily at 12:05 AM IST. Each active master creates a real Upcoming tournament players can join.',
        `<div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" id="seed-auto">Add 5 sample matches</button>
          <button class="btn btn-primary" id="add-auto">${AdminUI.icon.plus} Create Daily Auto Match</button>
        </div>`
      )}
      <div class="panel" style="margin-bottom:16px">
        <div style="display:grid;gap:10px">
          <div><strong>Full feature preview</strong> — click <em>Add 5 sample matches</em> to seed:</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;font-size:13px;color:var(--muted)">
            <div>① BR Solo · 1 slot · kill rewards</div>
            <div>② BR Duo · 2 slots · pay ×2</div>
            <div>③ BR Squad · 4 slots · pay ×4</div>
            <div>④ Clash Squad · Team A/B</div>
            <div>⑤ Lone Wolf Solo · late night</div>
          </div>
          <div style="font-size:13px;color:var(--muted)">
            Maps / fees are randomized each seed. Today’s tournaments are generated automatically —
            then open <a class="name-link" href="#/tournaments">All Tournaments</a> to inspect join, slots, and Clash Squad registration.
            ${items.length ? ` · <b>${items.length}</b> masters · <b>${todayReady}</b> ready today` : ''}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap desktop-table">
          <table>
            <thead><tr>
              <th>ID</th><th>Tournament</th><th>Match Type</th><th>Player Format</th><th>Map</th>
              <th>Time</th><th>Entry / Player</th><th>Prize</th><th>Kill</th><th>Slots</th>
              <th>Generated</th><th>Status</th><th>Next</th><th>Actions</th>
            </tr></thead>
            <tbody>${items.length ? items.map((row) => {
              const meta = dailyAutoRowMeta(row);
              const kill = Number(row.perKill) || 0;
              return `<tr>
                <td><strong>${AdminUI.esc(row.displayId || `AUTO${row.autoMatchNumber}`)}</strong></td>
                <td>
                  <a class="name-link" href="#/daily-auto/${row._id}/edit">${AdminUI.esc(row.name)}</a>
                  <span class="auto-source">${AdminUI.esc(row.game?.name || '—')} · ${AdminUI.esc(row.gameMode?.name || 'Mode')}</span>
                  ${row.description ? `<div class="auto-source" style="max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${AdminUI.esc(row.description)}</div>` : ''}
                </td>
                <td>${AdminUI.esc(meta.matchType)}</td>
                <td>${AdminUI.esc(meta.pf)} <span class="auto-source">×${meta.ppt}</span></td>
                <td>${AdminUI.esc(meta.map)}</td>
                <td>${AdminUI.esc(row.startTimeLabel || row.startTime)}</td>
                <td>${AdminUI.money(row.entryFee)}</td>
                <td>${AdminUI.money(row.prizePool)}</td>
                <td>${kill > 0 ? AdminUI.money(kill) : '—'}</td>
                <td>${AdminUI.esc(meta.slots)}</td>
                <td>${row.todayTournamentId
                  ? `<a class="name-link" href="#/tournaments/${row.todayTournamentId}">${row.generatedCount ?? 0} · today ✓</a>`
                  : `${row.generatedCount ?? 0}`}</td>
                <td>${row.isActive ? badge('active') : '<span class="badge b-muted">Inactive</span>'}</td>
                <td>${AdminUI.esc(row.nextMatchLabel || 'Paused')}</td>
                <td>
                  <div class="row-actions" data-id="${row._id}">
                    <button type="button" class="btn btn-primary btn-sm" data-act="generate">Generate today</button>
                    ${AdminUI.actionsMenu(row._id, autoMatchActions(row))}
                  </div>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="14">${AdminUI.empty('No Daily Auto Matches yet', 'Click “Add 5 sample matches” to create BR Solo/Duo/Squad, Clash Squad, and Lone Wolf templates with today’s tournaments.')}</td></tr>`}</tbody>
          </table>
        </div>
        ${items.length ? `<div class="mobile-list">${items.map((row) => {
          const meta = dailyAutoRowMeta(row);
          const kill = Number(row.perKill) || 0;
          return `<div class="m-card">
            <div style="display:flex;justify-content:space-between;gap:8px">
              <a class="name-link" href="#/daily-auto/${row._id}/edit">${AdminUI.esc(row.name)}</a>
              <div class="row-actions" data-id="${row._id}">${AdminUI.actionsMenu(row._id, autoMatchActions(row))}</div>
            </div>
            ${row.description ? `<div class="auto-source" style="margin:6px 0">${AdminUI.esc(row.description)}</div>` : ''}
            <div class="m-row"><span>ID</span><b>${AdminUI.esc(row.displayId)}</b></div>
            <div class="m-row"><span>Match Type</span><b>${AdminUI.esc(meta.matchType)}</b></div>
            <div class="m-row"><span>Player Format</span><b>${AdminUI.esc(meta.pf)} (×${meta.ppt})</b></div>
            <div class="m-row"><span>Map</span><b>${AdminUI.esc(meta.map)}</b></div>
            <div class="m-row"><span>Time</span><b>${AdminUI.esc(row.startTimeLabel || row.startTime)}</b></div>
            <div class="m-row"><span>Entry / Player</span><b>${AdminUI.money(row.entryFee)}</b></div>
            <div class="m-row"><span>Prize Pool</span><b>${AdminUI.money(row.prizePool)}</b></div>
            ${kill > 0 ? `<div class="m-row"><span>Prize / Kill</span><b>${AdminUI.money(kill)}</b></div>` : ''}
            <div class="m-row"><span>Slots</span><b>${AdminUI.esc(meta.slots)}</b></div>
            <div class="m-row"><span>Generated</span><b>${row.generatedCount ?? 0}${row.todayTournamentExists ? ' · today ready' : ''}</b></div>
            <div class="m-row"><span>Status</span>${row.isActive ? badge('active') : '<span class="badge b-muted">Inactive</span>'}</div>
            <div class="m-row"><span>Next</span><b>${AdminUI.esc(row.nextMatchLabel || 'Paused')}</b></div>
            <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn btn-primary btn-sm" data-act="generate" data-id="${row._id}">Generate today</button>
              ${row.todayTournamentId ? `<a class="btn btn-secondary btn-sm" href="#/tournaments/${row.todayTournamentId}">Open today</a>` : ''}
            </div>
          </div>`;
        }).join('')}</div>` : `<div class="mobile-list">${AdminUI.empty('No Daily Auto Matches yet', 'Tap “Add 5 sample matches” above.')}</div>`}
      </div>`);
    AdminUI.bindShell();
    document.getElementById('add-auto').onclick = () => go('daily-auto/new');
    document.getElementById('seed-auto').onclick = () => guarded(async () => {
      if (!(await AdminUI.confirm(
        'Add 5 sample Daily Auto Matches?',
        'Creates (or reuses) BR Solo, Duo, Squad, Clash Squad 4v4, and Lone Wolf with randomized maps/fees, then generates today’s tournaments so you can open them in All Tournaments.'
      ))) return;
      const result = await AdminAPI.seedDailyAutoSamples({ generateToday: true });
      AdminUI.toast(result.message || 'Samples ready');
      const firstReady = (result.generated || []).find((g) => g.tournamentId);
      if (firstReady?.tournamentId) {
        if (await AdminUI.confirm('Samples ready', 'Open a generated tournament now to review Match Type, Player Format, slots, and join flow?')) {
          return go(`tournaments/${firstReady.tournamentId}`);
        }
      }
      dailyAutoMatches();
    });
    AdminUI.bindActions(root(), handleDailyAutoAction);
    root().querySelectorAll('button[data-act="generate"]').forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id') || btn.closest('[data-id]')?.getAttribute('data-id');
        if (id) handleDailyAutoAction('generate', id);
      };
    });
  }

  async function handleDailyAutoAction(act, id) {
    await guarded(async () => {
      if (act === 'edit') return go(`daily-auto/${id}/edit`);
      if (act === 'generated') return go(`daily-auto/${id}/generated`);
      if (act === 'generate') {
        const result = await AdminAPI.generateDailyAutoMatchToday(id);
        AdminUI.toast(result.message || (result.alreadyExists ? "Today's match already exists." : "Today's match generated successfully."));
        if (result.tournament?._id && result.created) return go(`tournaments/${result.tournament._id}`);
        return dailyAutoMatches();
      }
      if (act === 'activate') {
        await AdminAPI.activateDailyAutoMatch(id);
        AdminUI.toast('Activated — future daily generation will run');
        return dailyAutoMatches();
      }
      if (act === 'deactivate') {
        await AdminAPI.deactivateDailyAutoMatch(id);
        AdminUI.toast('Deactivated — no new tournaments will be generated. Existing matches are unchanged.');
        return dailyAutoMatches();
      }
      if (act === 'duplicate') {
        const copy = await AdminAPI.duplicateDailyAutoMatch(id);
        AdminUI.toast('Duplicated as inactive. Edit it, then activate.');
        return go(`daily-auto/${copy._id}/edit`);
      }
      if (act === 'delete') {
        if (!(await AdminUI.confirm('Remove Daily Auto Match', 'The master config will be removed. Existing generated tournaments stay in All Tournaments.'))) return;
        await AdminAPI.deleteDailyAutoMatch(id);
        AdminUI.toast('Master removed. Generated tournaments were not deleted.');
        return dailyAutoMatches();
      }
    });
  }

  async function dailyAutoGenerated(id) {
    root().innerHTML = AdminUI.layout('daily-auto', '<div class="loading">Loading generated tournaments…</div>');
    AdminUI.bindShell();
    const data = await AdminAPI.dailyAutoMatchTournaments(id);
    const auto = data.autoMatch || {};
    const items = data.tournaments || [];
    const autoMeta = dailyAutoRowMeta(auto);
    root().innerHTML = AdminUI.layout('daily-auto', `
      ${AdminUI.pageHead(
        `${auto.name || 'Daily Auto Match'} — generated tournaments`,
        `${auto.displayId || ''} · ${AdminUI.esc(autoMeta.matchType)} · ${AdminUI.esc(autoMeta.pf)} · ${AdminUI.esc(autoMeta.map)} · Entry ${AdminUI.money(auto.entryFee)} / Player`,
        `<div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-secondary" id="back">Back</button>
          <button class="btn btn-primary" id="gen-today">Generate today</button>
        </div>`
      )}
      <div class="card">
        <div class="table-wrap desktop-table">
          <table>
            <thead><tr>
              <th>Date</th><th>Tournament</th><th>Match #</th><th>Match Type</th><th>Map</th><th>Player Format</th>
              <th>Entry / Player</th><th>Prize pool</th><th>Kill</th><th>Slots</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>${items.length ? items.map((row) => `
              <tr>
                <td>${AdminUI.esc(row.generatedDateLabel || row.generatedDate)}</td>
                <td><a class="name-link" href="#/tournaments/${row._id}">${AdminUI.esc(row.name)}</a></td>
                <td>${AdminUI.esc(row.matchNumber || '—')}</td>
                <td>${AdminUI.esc(row.matchTypeName || autoMeta.matchType)}</td>
                <td>${AdminUI.esc(row.map || '—')}</td>
                <td>${AdminUI.esc(row.playerFormatLabel || formatLabel(row))}${row.playersPerTeam ? ` <span class="auto-source">×${row.playersPerTeam}</span>` : ''}</td>
                <td>${AdminUI.money(row.entryFee)}</td>
                <td>${AdminUI.money(row.prizePool)}</td>
                <td>${Number(row.perKill) > 0 ? AdminUI.money(row.perKill) : '—'}</td>
                <td>${AdminUI.esc(row.slotsLabel || '—')}</td>
                <td>${badge(row.status)}</td>
                <td><a class="name-link" href="#/tournaments/${row._id}">Open</a></td>
              </tr>`).join('') : `<tr><td colspan="12">${AdminUI.empty('No generated tournaments yet', 'Use Generate today or wait for the 12:05 AM IST job.')}</td></tr>`}</tbody>
          </table>
        </div>
        ${items.length ? `<div class="mobile-list">${items.map((row) => `
          <div class="m-card">
            <a class="name-link" href="#/tournaments/${row._id}">${AdminUI.esc(row.generatedDateLabel || row.generatedDate)} · ${AdminUI.esc(row.name)}</a>
            <div class="m-row"><span>Match Type</span><b>${AdminUI.esc(row.matchTypeName || autoMeta.matchType)}</b></div>
            <div class="m-row"><span>Player Format</span><b>${AdminUI.esc(row.playerFormatLabel || formatLabel(row))}</b></div>
            <div class="m-row"><span>Map</span><b>${AdminUI.esc(row.map || '—')}</b></div>
            <div class="m-row"><span>Entry / Player</span><b>${AdminUI.money(row.entryFee)}</b></div>
            <div class="m-row"><span>Prize</span><b>${AdminUI.money(row.prizePool)}</b></div>
            <div class="m-row"><span>Slots</span><b>${AdminUI.esc(row.slotsLabel || '—')}</b></div>
            <div class="m-row"><span>Status</span>${badge(row.status)}</div>
          </div>`).join('')}</div>` : ''}
      </div>`);
    AdminUI.bindShell();
    document.getElementById('back').onclick = () => go('daily-auto');
    document.getElementById('gen-today').onclick = () => handleDailyAutoAction('generate', id);
  }

  async function dailyAutoForm(id) {
    root().innerHTML = AdminUI.layout('daily-auto', '<div class="loading">Loading form…</div>');
    AdminUI.bindShell();
    const [games, maps, existing, matchTypes] = await Promise.all([
      AdminAPI.games(),
      AdminAPI.maps().catch(() => []),
      id ? AdminAPI.dailyAutoMatch(id) : null,
      AdminAPI.matchTypes().catch(() => []),
    ]);
    const t = existing || {};
    if (!(games || []).length) {
      root().innerHTML = AdminUI.layout('daily-auto', `
        ${AdminUI.pageHead('Create Daily Auto Match', 'Add a game and at least one mode first.', `<button class="btn btn-secondary" id="back">Back</button>`)}
        <div class="panel">${AdminUI.empty('No games yet', 'Go to Games & Modes, then come back here.')}
          <div style="margin-top:16px"><button class="btn btn-primary" id="to-games">Open Games & Modes</button></div>
        </div>`);
      AdminUI.bindShell();
      document.getElementById('back').onclick = () => go('daily-auto');
      document.getElementById('to-games').onclick = () => go('games');
      return;
    }
    const modesByGame = {};
    await Promise.all((games || []).map(async (g) => {
      modesByGame[g._id] = await AdminAPI.modes(g._id).catch(() => []);
    }));
    const gameId = t.game?._id || t.game || games[0]?._id || '';
    root().innerHTML = AdminUI.layout('daily-auto', `
      ${AdminUI.pageHead(
        id ? `Edit ${t.displayId || 'Daily Auto Match'}` : 'Create Daily Auto Match',
        id
          ? 'Changes apply to future generated tournaments only. Already created matches keep their own values.'
          : 'Save this master once. An actual tournament is created every day at 12:05 AM IST.',
        `<button class="btn btn-secondary" id="back">Back</button>`
      )}
      <form id="auto-form" class="form-card">
        <div class="form-grid">
          <div class="form-section">
            <h3>Match identity</h3>
            <p>Same fields as All Tournaments. This is the template, not a playable match.</p>
          </div>
          <div class="field full"><label>Tournament name <span class="req">*</span></label><input name="name" required value="${AdminUI.esc(t.name || '')}" placeholder="e.g. Daily Solo" /></div>
          <div class="field"><label>Game <span class="req">*</span></label>
            <select name="game" id="f-game">${(games || []).map((g) => `<option value="${g._id}" ${g._id === gameId ? 'selected' : ''}>${AdminUI.esc(g.name)}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Game mode <span class="req">*</span></label><select name="gameMode" id="f-mode"></select></div>

          <div class="form-section">
            <h3>Match setup</h3>
            <p>Copied onto each day's tournament. Match Type and Player Format are independent.</p>
          </div>
          <div class="field"><label>Match Type <span class="req">*</span></label>
            <select name="matchType" id="f-match-type" required>
              ${(matchTypes || []).filter((mt) => mt.active !== false).map((mt) => {
                const selectedId = String(t.matchType?._id || t.matchType || '');
                const sel = selectedId === String(mt._id) ? 'selected' : '';
                return `<option value="${mt._id}" ${sel} data-kill="${mt.hasKillRewards ? 1 : 0}" data-tvt="${mt.isTeamVsTeam ? 1 : 0}">${AdminUI.esc(mt.name)}</option>`;
              }).join('') || '<option value="">Create Match Types first</option>'}
            </select>
          </div>
          <div class="field"><label>Player Format <span class="req">*</span></label>
            <select name="playerFormat" id="f-player-format" required>
              ${playerFormatOptions(t.playerFormat || t.mode || 'solo')}
            </select>
          </div>
          <div class="field"><label>Map</label>
            <select name="map">${(maps || []).map((m) => `<option value="${AdminUI.esc(m.name)}" ${m.name === t.map ? 'selected' : ''}>${AdminUI.esc(m.name)}</option>`).join('') || '<option value="Bermuda">Bermuda</option>'}</select>
          </div>
          <div class="field">
            <label>Players per entry</label>
            <input id="f-ppt" type="number" readonly value="1" />
            <span class="help">Fixed 48 slots. Solo=1, Duo=2, Squad=4 when joining.</span>
          </div>
          <div class="field"><label>Daily start time <span class="req">*</span></label>
            <input name="startTime" type="time" required value="${AdminUI.esc((t.startTime || '10:00').slice(0, 5))}" />
            <span class="help">Asia/Kolkata. Repeat is Daily.</span>
          </div>
          <div class="field"><label>Repeat</label>
            <select name="repeat" disabled><option value="daily" selected>Daily</option></select>
          </div>

          <div class="form-section">
            <h3>Entry & prizes</h3>
            <p>Copied onto each day's tournament. You can still override that day's match in All Tournaments.</p>
          </div>
          <div class="field"><label>Entry Fee / Player (₹)</label><input name="entryFee" type="number" min="0" value="${t.entryFee ?? 0}" /></div>
          <div class="field"><label>Prize pool</label><input name="prizePool" type="number" min="0" value="${t.prizePool ?? 0}" /></div>
          <div class="field" id="kill-wrap"><label>Prize per Kill</label><input name="perKill" type="number" min="0" value="${t.perKill ?? 0}" /></div>

          <div class="form-section">
            <h3>Banner & description</h3>
          </div>
          <div class="field full"><label>Banner title</label><input name="bannerTitle" value="${AdminUI.esc(t.bannerTitle || '')}" /></div>
          ${AdminUI.imageField('bannerImage', t.bannerImage || '', 'Tournament banner', false)}
          <div class="field full"><label>About this match</label><textarea name="description">${AdminUI.esc(t.description || '')}</textarea></div>
          <div class="field full"><label>Match rules</label>
            <textarea name="rules" style="min-height:140px">${AdminUI.esc(rulesToText(t.rules) || DEFAULT_RULES_TEXT)}</textarea>
          </div>

          <div class="form-section">
            <h3>Match ID &amp; Password</h3>
            <p>Optional. Copied to each generated match. Only <b>joined</b> players can see them on Match Details.</p>
          </div>
          <div class="field"><label>Match ID</label><input name="roomId" value="${AdminUI.esc(t.roomId || '')}" /></div>
          <div class="field"><label>Password</label><input name="roomPassword" value="${AdminUI.esc(t.roomPassword || '')}" /></div>
          <div class="field full"><label style="display:flex;gap:8px;align-items:center;font-weight:600">
            <input type="checkbox" name="showRoomCredentials" ${t.showRoomCredentials ? 'checked' : ''} />
            Show Match ID and Password to joined players
          </label></div>
          <div class="field full"><label style="display:flex;gap:8px;align-items:center;font-weight:600">
            <input type="checkbox" name="isActive" ${t.isActive !== false ? 'checked' : ''} />
            Active — generate a tournament every day
          </label></div>
          <div class="field full"><label style="display:flex;gap:8px;align-items:center;font-weight:600">
            <input type="checkbox" name="publishOnGenerate" ${t.publishOnGenerate !== false ? 'checked' : ''} />
            Publish generated matches as Upcoming so players can join
          </label></div>
        </div>
        <div class="modal-foot" style="padding-top:8px">
          <button class="btn btn-ghost" type="button" id="cancel">Cancel</button>
          <button class="btn btn-primary" type="submit">${id ? 'Save master' : 'Create Daily Auto Match'}</button>
        </div>
      </form>`);
    AdminUI.bindShell();
    const fillModes = () => {
      const gid = document.getElementById('f-game').value;
      const modes = modesByGame[gid] || [];
      const current = String(t.gameMode?._id || t.gameMode || '');
      document.getElementById('f-mode').innerHTML = modes.map((m) =>
        `<option value="${m._id}" ${String(m._id) === current ? 'selected' : ''}>${AdminUI.esc(m.name)}</option>`
      ).join('') || '<option value="">No modes</option>';
    };
    const syncStructureFields = () => {
      const opt = document.getElementById('f-match-type')?.selectedOptions?.[0];
      const allowKill = opt?.dataset?.kill === '1';
      document.getElementById('kill-wrap').style.display = allowKill ? '' : 'none';
      if (!allowKill) {
        const pk = document.querySelector('#auto-form [name="perKill"]');
        if (pk) pk.value = '0';
      }
      const format = document.getElementById('f-player-format')?.value || 'solo';
      const ppt = playersPerTeamFor(format);
      const pptEl = document.getElementById('f-ppt');
      if (pptEl) pptEl.value = String(ppt);
      };
    fillModes();
    syncStructureFields();
    AdminUI.bindImageUploads(document.getElementById('auto-form'));
    document.getElementById('f-game').onchange = fillModes;
    document.getElementById('f-match-type').onchange = syncStructureFields;
    document.getElementById('f-player-format').onchange = syncStructureFields;
    document.getElementById('back').onclick = () => go('daily-auto');
    document.getElementById('cancel').onclick = () => go('daily-auto');
    document.getElementById('auto-form').onsubmit = (e) => {
      e.preventDefault();
      guarded(async () => {
        const fd = new FormData(e.target);
        const body = Object.fromEntries(fd.entries());
        body.entryFee = Number(body.entryFee || 0);
        body.prizePool = Number(body.prizePool || 0);
        body.playerFormat = body.playerFormat || 'solo';
        body.mode = body.playerFormat;
        body.slots = 48;
        const opt = document.getElementById('f-match-type')?.selectedOptions?.[0];
        const allowKill = opt?.dataset?.kill === '1';
        body.perKill = allowKill ? Number(body.perKill || 0) : 0;
        body.rules = parseRulesList(body.rules);
        body.bannerTitle = String(body.bannerTitle || '').trim();
        body.showRoomCredentials = fd.get('showRoomCredentials') === 'on';
        body.isActive = fd.get('isActive') === 'on';
        body.publishOnGenerate = fd.get('publishOnGenerate') === 'on';
        body.repeat = 'daily';
        delete body.category;
        if (!body.name || !body.game || !body.gameMode || !body.matchType || !body.startTime) {
          AdminUI.toast('Name, game, game mode, Match Type, Player Format and start time are required', 'err');
          return;
        }
        if (id) {
          await AdminAPI.updateDailyAutoMatch(id, body);
          AdminUI.toast('Master updated. Existing generated tournaments were not changed.');
        } else {
          await AdminAPI.createDailyAutoMatch(body);
          AdminUI.toast('Daily Auto Match created');
        }
        go('daily-auto');
      });
    };
  }

  async function render() {
    const { section, id, extra, params } = parseHash();
    if (!AdminAPI.token() || section === 'login') {
      loginPage();
      return;
    }
    try {
      if (section === 'dashboard') return await dashboard();
      if (section === 'tournaments' && id === 'new') return await tournamentForm();
      if (section === 'tournaments' && extra === 'edit') return await tournamentForm(id);
      if (section === 'tournaments' && id) return await tournamentDetail(id, params.tab || 'overview');
      if (section === 'tournaments') return await tournaments();
      if (section === 'daily-auto' && id === 'new') return await dailyAutoForm();
      if (section === 'daily-auto' && extra === 'edit') return await dailyAutoForm(id);
      if (section === 'daily-auto' && extra === 'generated') return await dailyAutoGenerated(id);
      if (section === 'daily-auto' && id) return await dailyAutoForm(id);
      if (section === 'daily-auto') return await dailyAutoMatches();
      if (section === 'history' && id) return await historyDetail(id);
      if (section === 'history') return await history();
      if (section === 'players' && id) return await playerDetail(id);
      if (section === 'players') return await players();
      if (section === 'teams') return await opsList('teams', 'Teams', 'Clash Squad team occupancy. Open a match to manage Team A / Team B.', { category: 'custom' });
      if (section === 'participants') return await opsList('participants', 'Participants', 'Open a tournament to review joined players and payment state.', {});
      if (section === 'payments') return await payments('payments');
      if (section === 'payment-history') return await payments('payment-history', { title: 'Payment history', subtitle: 'Historical wallet and entry ledger.' });
      if (section === 'wallet') return await wallet();
      if (section === 'withdrawals') return await payments('withdrawals', { type: 'withdraw', title: 'Withdrawals', subtitle: 'Player withdrawal requests and settlements.' });
      if (section === 'ops' && id === 'slots') return await opsList('ops-slots', 'Slots', 'Battle Royale slot boards. Open a match to manage the 50-slot grid.', { category: 'battle_royale' });
      if (section === 'ops' && id === 'rooms') return await opsList('ops-rooms', 'Rooms', 'Set room ID and password before going live.', { status: 'upcoming' });
      if (section === 'ops' && id === 'results') return await opsList('ops-results', 'Results', 'Completed matches waiting for result entry.', { status: 'completed' });
      if (section === 'ops' && id === 'winners') return await winnersOps();
      if (section === 'ops' && id === 'kills') return await opsList('ops-kills', 'Kill rewards', 'Battle Royale matches where per-kill rewards apply.', { category: 'battle_royale' });
      if (section === 'activity') return await activity();
      if (section === 'games') return await games();
      if (section === 'maps') return await maps();
      if (section === 'match-types') return await matchTypesPage();
      if (section === 'sliders') return await sliders();
      if (section === 'support') return await support();
      if (section === 'announcements') return await announcements();
      return await dashboard();
    } catch (err) {
      if (err.status === 401 || /session expired|user not found/i.test(err.message || '')) {
        return loginPage('Session expired. Please sign in again.');
      }
      root().innerHTML = AdminUI.layout(section, `<div class="error-box">${AdminUI.esc(err.message)}</div>`);
      AdminUI.bindShell();
    }
  }

  window.addEventListener('hashchange', render);
  if (!location.hash) location.hash = AdminAPI.token() ? '#/dashboard' : '#/login';
  else render();

  return { render };
})();
