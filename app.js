/* =============================================================================
 * Ocean Tender · app shell, router, evidence drawer
 * Hash routing mirrors the real Angular route table (reports/routes.json).
 * The sidebar reproduces the real navigation and its real access-code gates.
 * ========================================================================== */
(function () {
  'use strict';
  const D = window.OT, S = window.OT_SCREENS, H = window.OT_HELPERS;

  /* ------------------------------------------------------------------ state */
  window.OT_STATE = {
    user: D.PERSONAS[0],
    authenticated: false,
    mfa: false,
    notificationsRead: false,
    route: { name: 'login', q: {} },
  };

  const $ = (sel) => document.querySelector(sel);
  const hasAccess = (code) => (window.OT_STATE.user.access || []).indexOf(code) >= 0;
  const isSupport = () => !!window.OT_STATE.user.support;
  const showSpotOverview = () => !window.OT_STATE.user.company || /@.*(kwe)/i.test(window.OT_STATE.user.email);
  const showPricing = () => window.OT_STATE.user.flag.pricing;
  const hasRole = (r) => (window.OT_STATE.user.roles || []).indexOf(r) >= 0;

  /* -------------------------------------------------------------------- nav */
  /* Each entry: [label, hash, gate, icon] — gates are the real ones recovered
     from the served shell (hasAccess codes, user.support, tenant regex, flags). */
  function navModel() {
    const f = window.OT_STATE.user.flag;
    const n = D.NOTIFICATIONS.filter((x) => !x.read).length;
    return [
      { sec: 'Tendering' },
      ['Home', '#/', () => true, '⌂'],
      ['My events', '#tenders', () => hasAccess('CREATE_OPEN_TENDER') || hasAccess('SEARCH_TENDERS'), '▤'],
      ['Tender summary', '#/tender/TND-2026-100/0', () => hasAccess('CREATE_OPEN_TENDER'), '＋'],
      ['Upcoming deadlines', '#deadlines', () => isSupport(), '⏱'],
      ['Calendar / News', '#calendar', () => f.calendarEnabled, '▦'],
      { sec: 'Spot bidding' },
      ['Spot bidding overview', '#/spot-bids', () => showSpotOverview(), '◈'],
      ['Spot bids', '#/spot/SPOT-2026-041', () => true, '⚡'],
      { sec: 'Analytics' },
      ['Reporting sandbox', '#/reporting', () => f.sandbox || isSupport(), '◫'],
      ['Rates export', '#/rates-export', () => f.ratesExportEnabled, '⇩'],
      ['Operational dashboard', '#/operational', () => isSupport() || hasRole('Ocean Tender Support'), '◉'],
      ['Tenders overview', '#/tenders-overview', () => hasAccess('REVIEW_ONBOARDING'), '▣'],
      ['Onboarding requests', '#/onboarding-requests', () => hasAccess('REVIEW_ONBOARDING'), '☰'],
      { sec: 'Support & admin' },
      ['Notifications', '#/notification', () => true, '◔', n],
      ['Chat', '#/chat', () => !!window.OT_STATE.user.company, '❝'],
      ['Announcements', '#/highlights', () => !!window.OT_STATE.user.company, '◈'],
      ['Documentation', '#/support/docs', () => !!window.OT_STATE.user.company, '▤'],
      ['Release notes', '#/support/releases', () => true, '☰'],
      ['F.A.Q.', '#/support/faq', () => f.anyFaq, '?'],
      ['Support', '#/support', () => true, '☎'],
      ['Configure', '#/companySettings', () => hasAccess('VIEW_COMPANY_SETTINGS'), '⚙'],
      ['Profile', '#/profile', () => true, '☺'],
      ['Pricing', '#/pricing', () => showPricing(), '€'],
      ['Surface map', '#/apimap', () => true, 'ⓘ'],
      ['Logout', '#/logout', () => true, '⇥'],
    ];
  }

  function renderRail() {
    const cur = location.hash || '#/';
    const items = navModel().map((it) => {
      if (it.sec) return `<div class="sec">${it.sec}</div>`;
      const [label, hash, gate, icon, pill] = it;
      if (!gate()) return '';
      const active = cur === hash || (hash !== '#/' && cur.startsWith(hash.replace(/\/$/, '')) && hash.length > 3);
      return `<a class="nav ${active ? 'active' : ''}" href="${hash}">
        <span class="ic">${icon}</span><span class="t">${esc(label)}</span>
        ${pill ? `<span class="pill">${pill}</span>` : ''}</a>`;
    }).join('');
    const u = window.OT_STATE.user;
    return `<aside class="rail">
      <div class="brand">Ocean<b>&nbsp;Tender</b><div class="tenant">${esc(u.company || 'Ocean Tender')}${u.support ? ' · staff' : ''}</div></div>
      <nav>${items}</nav>
      <div class="me">
        <div class="nm">${esc(u.userName)}</div>
        <div style="color:#7fa0ab;font-size:.72rem">${esc(u.email)}</div>
        <select id="persona-switch" title="Switch persona — the nav really changes">
          ${D.PERSONAS.map((p) => `<option value="${p.id}" ${p.id === u.id ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}
        </select>
      </div></aside>`;
  }

  function renderTopbar(route) {
    const M14 = D.STATS;
    return `<header class="topbar">
      <div class="crumbs">${crumbsFor(route)}</div>
      <div class="grow"></div>
      <div class="search"><input placeholder="Search tenders, lanes, suppliers…" data-input="global-search"></div>
      <button class="btn ghost" data-action="open-notifications" title="Notifications">◔
        ${D.NOTIFICATIONS.filter((x) => !x.read).length ? `<span class="badge b-HIGH">${D.NOTIFICATIONS.filter((x) => !x.read).length}</span>` : ''}</button>
      <button class="btn ghost" data-action="open-evidence" data-key="${esc(route.q.key || '')}" title="Evidence for this screen">ⓘ</button>
      <span class="chip mono" title="Investigation scale">${M14.apiPaths} endpoints · ${M14.angles}/75 angles</span>
    </header>`;
  }
  function crumbsFor(route) {
    const n = route.name;
    const t = D.TENDERS.find((x) => x.id === route.q.id);
    const map = {
      home: '<b>Home</b>', tenders: 'Home / <b>My events</b>',
      tenderDetail: `Home / <a href="#tenders" data-nav>My events</a> / <b>${esc(t ? t.title : '')}</b>`,
      controlroom: `Home / <a href="#tenders" data-nav>My events</a> / <b>Control room</b>`,
      spot: 'Home / <a href="#/spot-bids" data-nav>Spot bidding</a> / <b>Auction</b>',
      spotbids: 'Home / <b>Spot bidding</b>',
      reporting: 'Home / <b>Reporting sandbox</b>',
      companySettings: 'Home / <b>Configure</b>',
      calendar: 'Home / <b>Calendar</b>', deadlines: 'Home / <b>Upcoming deadlines</b>',
      support: 'Home / <b>Support</b>', notifications: 'Home / <b>Notifications</b>',
      chat: 'Home / <b>Chat</b>', announcement: 'Home / <b>Announcements</b>',
      profile: 'Home / <b>Profile</b>', apimap: 'Home / <b>Surface map</b>',
      pricing: 'Home / <b>Pricing</b>', operational: 'Home / <b>Operational dashboard</b>',
      txrequest: 'Public / <b>Carrier rate request</b>', onboard: 'Public / <b>Supplier registration</b>',
      gdpr: 'Public / <b>Your data &amp; privacy</b>', ratecard: 'Home / <b>Rate card</b>',
      standard: 'Home / <b>Standard rates</b>', sandbox: 'Home / <b>Scenario sandbox</b>',
      stats: 'Home / <b>Tender statistics</b>', carriers: 'Home / <b>Carrier database</b>',
      notFound: 'Home / <b>Not reconstructed</b>',
    };
    return map[n] || '<b>Home</b>';
  }

  /* ---------------------------------------------------------------- routing */
  function parseHash() {
    const raw = location.hash || '#/';
    const clean = raw.replace(/^#\/?/, '');
    const [pathPart, queryPart] = clean.split('?');
    const q = {};
    if (queryPart) queryPart.split('&').forEach((kv) => { const [k, v] = kv.split('='); q[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    const seg = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
    const head = seg[0] || '';

    const routes = [
      [/^$/, 'home'],
      [/^login$/, 'login'],
      [/^forgotPassword$/, 'forgotPassword'],
      [/^logout$/, 'logout'],
      [/^tenders$/, 'tenders'],
      [/^tender\/([^/]+)\/(\d+)$/, 'tenderDetail', (m) => ({ id: m[1], step: m[2] })],
      [/^controlroom\/([^/]+)\/([^/]+)$/, 'controlroom', (m) => ({ tab: m[1], id: m[2] })],
      [/^controlroom\/([^/]+)$/, 'controlroom', (m) => ({ tab: m[1] })],
      [/^ratecard\/([^/]+)\/(\d+)$/, 'ratecard', (m) => ({ id: m[1], round: m[2] })],
      [/^spot-bids$/, 'spotbids'],
      [/^spot\/([^/]+)$/, 'spot', (m) => ({ id: m[1] })],
      [/^reporting$/, 'reporting'],
      [/^companySettings$/, 'companySettings'],
      [/^companySettings\/([^/]+)$/, 'companySettings', (m) => ({ tab: m[1] })],
      [/^calendar$/, 'calendar'],
      [/^deadlines$/, 'deadlines'],
      [/^notification$/, 'notifications'],
      [/^chat$/, 'chat'],
      [/^highlights$/, 'announcement'],
      [/^profile$/, 'profile'],
      [/^apimap$/, 'apimap'],
      [/^pricing$/, 'pricing'],
      [/^operational$/, 'operational'],
      [/^support$/, 'support'],
      [/^support\/([^/]+)$/, 'support', (m) => ({ tab: m[1] })],
      [/^tx\/carriers\/request\/([^/]+)\/([^/]+)$/, 'txrequest', (m) => ({ txId: m[1], requestId: m[2] })],
      [/^tx\/carriers\/request$/, 'txrequest'],
      [/^onboard$/, 'onboard'],
      [/^gdpr$/, 'gdpr'],
      [/^standard$/, 'standard'],
      [/^sandbox$/, 'sandbox'],
      [/^stats$/, 'stats'],
      [/^carriers$/, 'carriers'],
      [/^tenders-overview$/, 'stats'],
      [/^onboarding-requests$/, 'onboardingRequests'],
      [/^rates-export$/, 'ratesExport'],
      [/^unsubscribe\/success$/, 'unsubscribed'],
      [/^rm$/, 'notFound'],
    ];
    for (const [re, name, ex] of routes) {
      const m = re.exec(pathPart);
      if (m) return { name, q: { ...q, ...(ex ? ex(m) : {}), raw: raw } };
    }
    return { name: 'notFound', q: { ...q, raw: raw } };
  }

  function render() {
    const route = parseHash();
    window.OT_STATE.route = route;

    /* logged-out routes */
    if (!window.OT_STATE.authenticated && ['login', 'forgotPassword', 'onboard', 'gdpr', 'txrequest'].indexOf(route.name) < 0) {
      location.hash = '#/login';
      return;
    }
    if (route.name === 'logout') {
      window.OT_STATE.authenticated = false;
      location.hash = '#/login';
      toast('Signed out. (Local only — no session was ever created.)');
      return;
    }

    const root = $('#root');
    if (!window.OT_STATE.authenticated) {
      root.innerHTML = route.name === 'forgotPassword' ? S.forgotPassword() : route.name === 'login' ? S.login()
        : route.name === 'onboard' ? wrapPublic(S.onboard()) : route.name === 'gdpr' ? wrapPublic(S.gdpr())
        : wrapPublic(S.txrequest(route.q));
      return;
    }

    const body = (S[route.name] || S.notFound)(route.q);
    root.innerHTML = `<div class="shell">${renderRail()}
      <div class="main">${renderTopbar(route)}<div class="content">${body}</div></div></div>`;
    if (route.name === 'spot') startCountdown();
  }
  const wrapPublic = (html) => `<div class="main" style="padding:1.5rem">${html}</div>`;

  /* ---------------------------------------------------------------- toasts */
  function toast(msg, kind) {
    let host = $('.toast-host');
    if (!host) { host = document.createElement('div'); host.className = 'toast-host'; document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  /* ------------------------------------------------------- evidence drawer */
  function openEvidence(key) {
    const data = D.EVIDENCE[key] || D.EVIDENCE['/'];
    const host = document.createElement('div');
    host.className = 'drawer-host';
    host.innerHTML = `<div class="drawer">
      <div class="hd"><h3 style="margin:0">Evidence for this screen</h3><span style="flex:1"></span>
        <button class="btn sm" data-action="close-drawer">Close</button></div>
      <div class="bd">
        <div class="ev"><div class="k">Real route</div><code>${esc(key || '/')}</code></div>
        <div class="ev" style="margin-top:.7rem"><div class="k">Template in the shipped app</div><code>${esc(data.template)}</code></div>
        <div class="ev" style="margin-top:.7rem"><div class="k">Access</div>${esc(data.auth)}</div>
        <div style="margin-top:1rem"><div class="k muted small">Endpoints behind this screen</div>
          <div class="stack" style="margin-top:.3rem">${data.api.map((a) => `<code class="mono">${esc(a)}</code>`).join('')}</div></div>
        <div style="margin-top:1rem"><div class="k muted small">Note</div><p class="small">${esc(data.note)}</p></div>
      </div></div>`;
    document.body.appendChild(host);
  }

  function openNotifications() {
    const host = document.createElement('div');
    host.className = 'drawer-host';
    host.innerHTML = `<div class="drawer">
      <div class="hd"><h3 style="margin:0">Notifications</h3><span style="flex:1"></span>
        <button class="btn sm" data-action="close-drawer">Close</button></div>
      <div class="bd"><div class="stack">${D.NOTIFICATIONS.map((n) => `<div style="border-bottom:1px solid var(--line-2);padding-bottom:.5rem">
        <div>${esc(n.text)}</div><div class="muted small">${esc(n.who)} · ${esc(n.at)} · <code class="mono">${esc(n.topic)}</code></div>
      </div>`).join('')}</div></div></div>`;
    document.body.appendChild(host);
  }

  /* -------------------------------------------------------------- countdown */
  let cdTimer = null;
  function startCountdown() {
    clearInterval(cdTimer);
    const el = document.querySelector('[data-countdown]');
    if (!el) return;
    let s = Number(el.getAttribute('data-countdown')) || 0;
    const paint = () => {
      const h = String(Math.floor(s / 3600)).padStart(2, '0');
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      el.textContent = s > 0 ? `${h}:${m}:${ss}` : 'CLOSED';
      if (s <= 0) clearInterval(cdTimer);
    };
    paint();
    cdTimer = setInterval(() => { s -= 1; paint(); }, 1000);
  }

  /* ----------------------------------------------------------------- events */
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      const target = nav.getAttribute('data-nav');
      if (target) { e.preventDefault(); location.hash = target; return; }
    }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.getAttribute('data-action');
    const st = window.OT_STATE;

    switch (a) {
      case 'login':
        st.authenticated = true;
        location.hash = '#/';
        toast('Signed in as ' + st.user.userName + ' (' + st.user.label + ')', 'ok');
        break;
      case 'sso':
        st.authenticated = true;
        location.hash = '#/';
        toast('SSO: the real app redirects to a separate IdP host with the tenant registration id.', 'ok');
        break;
      case 'persona': {
        const id = el.getAttribute('data-id');
        const p = D.PERSONAS.find((x) => x.id === id);
        if (p) {
          st.user = p;
          st.authenticated = true;
          location.hash = '#/';
          toast('Now acting as ' + p.label + ' — watch the navigation change.', 'ok');
        }
        break;
      }
      case 'logout':
        st.authenticated = false; location.hash = '#/login'; break;
      case 'create-tender':
        location.hash = '#/tender/TND-2026-103/0'; break;
      case 'wizard-step':
        location.hash = `#/tender/${el.getAttribute('data-id')}/${el.getAttribute('data-step')}`; break;
      case 'tender-filter':
        location.hash = '#tenders'; setTimeout(() => {
          const btn = document.querySelector(`[data-action="tender-filter"][data-f="${el.getAttribute('data-f')}"]`);
          if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }, 0);
        window.OT_STATE.tenderFilter = el.getAttribute('data-f');
        render();
        break;
      case 'rc-round':
        location.hash = `#/ratecard/${el.getAttribute('data-id')}/${el.getAttribute('data-r')}`; break;
      case 'launch-tender':
        toast('Tender launched. POST /tender/new is body-less — the server seeds the skeleton.', 'ok'); break;
      case 'mark-read':
        D.NOTIFICATIONS.forEach((n) => { n.read = true; }); render(); toast('All notifications marked read.', 'ok'); break;
      case 'toggle-mfa':
        st.mfa = !st.mfa;
        toast(st.mfa ? 'MFA enabled — the mfa cookie switches the client into a challenge state.' : 'MFA disabled.');
        render(); break;
      case 'open-evidence':
        openEvidence(el.getAttribute('data-key') || (location.hash || '#/')); break;
      case 'open-notifications':
        openNotifications(); break;
      case 'close-drawer':
        document.querySelectorAll('.drawer-host').forEach((h) => h.remove()); break;
      case 'toast':
        toast(el.getAttribute('data-msg') || 'Done.'); break;
      case 'gated':
        toast('Blocked: this control is gated by ' + (el.getAttribute('data-gate') || 'an access code') + ' that the current persona lacks.', 'warn'); break;
      default: break;
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'persona-switch') {
      const p = D.PERSONAS.find((x) => x.id === e.target.value);
      if (p) {
        window.OT_STATE.user = p;
        render();
        toast('Now acting as ' + p.label + ' — the navigation is gated by real access codes.', 'ok');
      }
    }
  });

  document.addEventListener('input', (e) => {
    const kind = e.target.getAttribute('data-input');
    if (kind === 'tender-search') {
      window.OT_STATE.tenderSearch = e.target.value;
      clearTimeout(window.__searchT);
      window.__searchT = setTimeout(render, 220);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.drawer-host, .modal-host').forEach((h) => h.remove());
  });

  /* patch the tenders screen to honour the search + filter state */
  const baseTenders = S.tenders;
  S.tenders = function (q) {
    const st = window.OT_STATE;
    return baseTenders.call(S, { ...q, filter: st.tenderFilter || q.filter, q: st.tenderSearch ?? q.q });
  };

  /* screens that exist in the real route table and can be shown simply */
  S.spotbids = function () {
    return `<div class="spread" style="margin-bottom:1rem"><div><h1>Spot bidding</h1>
        <p style="margin:0">${D.SPOT_BIDS.length} spot bids · live auctions close automatically</p></div>
      <button class="btn" data-action="open-evidence" data-key="/spot/:id">ⓘ Evidence</button></div>
      <div class="grid g3">${D.SPOT_BIDS.map((b) => `<div class="card"><div class="bd">
        <div class="spread"><b>${esc(b.id)}</b>${H.badge(b.status)}</div>
        <div style="margin:.4rem 0">${esc(b.title)}</div>
        <div class="muted small">${b.participants.length} participants · best ${b.bids.length ? '€' + b.bids[0].amount.toLocaleString('en-GB') : '—'}</div>
        <button class="btn sm primary" style="margin-top:.6rem" data-nav="#/spot/${b.id}">Open auction</button>
      </div></div>`).join('')}</div>`;
  };
  S.standard = function () {
    const t = D.TENDERS[0];
    return `<div class="crumbs">Home / <b>Standard rates</b></div>
      <div class="spread" style="margin:1rem 0"><div><h1>Standard rates</h1>
        <p style="margin:0">Agreed baseline rates used for comparison and benchmarking.</p></div>
        <span class="chip mono">searchStandardRatesController.js</span></div>
      <div class="card"><table class="tbl"><thead><tr><th>Lane</th><th>Equipment</th><th>Carrier</th>
        <th class="num">Standard rate</th><th class="num">Valid from</th><th class="num">Valid to</th><th class="num">vs. tender</th></tr></thead>
        <tbody>${t.lanes.slice(0, 14).map((l, i) => {
          const std = l.targetRate * (1.04 + (i % 5) * 0.02);
          const delta = Math.round(((std - l.targetRate) / std) * 1000) / 10;
          return `<tr><td class="nowrap">${H.lanePort(l.origin)} → ${H.lanePort(l.destination)}</td>
            <td class="mono small">${esc(l.equipment)}</td>
            <td class="small">${esc(D.CARRIERS[i % D.CARRIERS.length].name)}</td>
            <td class="num">${H.money(std)}</td><td class="num mono small">2026-01-01</td><td class="num mono small">2026-12-31</td>
            <td class="num" style="color:var(--accent)">−${delta}%</td></tr>`;
        }).join('')}</tbody></table></div>`;
  };
  S.sandbox = function () {
    return `<div class="crumbs">Home / <b>Scenario sandbox</b></div>
      <div class="spread" style="margin:1rem 0"><div><h1>Scenario sandbox</h1>
        <p style="margin:0">Model award scenarios without touching the live tender.</p></div>
        <span class="chip mono">sandbox/ai/prompt/test · sandbox/gpm/request/batch</span></div>
      <div class="grid g3">
        ${[['Balanced — 4 suppliers', 'Best mix of price and coverage', '−11.4%'],
           ['Lowest cost — 3 suppliers', 'Aggressive: fewest suppliers', '−14.1%'],
           ['Incumbent-weighted — 5 suppliers', 'Protects existing relationships', '−8.2%']]
          .map(([n, d, s]) => `<div class="card"><div class="hd"><h3>${esc(n)}</h3></div><div class="bd">
            <p class="small">${esc(d)}</p><div class="kpi"><div class="v" style="color:var(--accent)">${esc(s)}</div>
            <div class="l">projected savings</div></div></div></div>`).join('')}
      </div>
      <div class="card" style="margin-top:1rem"><div class="hd"><h3>Ask the AI assistant</h3>
        <span class="grow"></span><span class="chip mono">POST /sandbox/ai/prompt/test</span></div>
        <div class="bd"><div class="field"><label>Prompt</label>
          <textarea rows="2" placeholder="Which three suppliers give the best coverage-to-price ratio for the Mediterranean lanes?"></textarea></div>
          <button class="btn primary" data-action="toast" data-msg="The real endpoint takes {prompt, data} and returns {response, aiChartOptions}. It is auth-gated.">Ask</button></div></div>`;
  };
  S.stats = function () {
    return `<div class="crumbs">Home / <b>Tender statistics</b></div>
      <div class="spread" style="margin:1rem 0"><div><h1>Tender statistics</h1>
        <p style="margin:0">Company-wide tender performance</p></div>
        <span class="chip mono">VIEW_OVERALL_TENDER_STATS</span></div>
      <div class="grid g4" style="margin-bottom:1rem">
        ${[['Tenders run', 12], ['Avg rounds per tender', '4.2'], ['Avg suppliers invited', 9], ['Avg savings', '11.4%']]
          .map(([l, v]) => `<div class="card"><div class="bd"><div class="kpi"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div></div></div>`).join('')}
      </div>
      <div class="grid g2">
        <div class="card"><div class="hd"><h3>Savings by tender</h3></div><div class="bd">
          ${H.chartBars(D.TENDERS.slice(0, 8).map((t) => ({ n: t.title.slice(0, 26), v: t.savings || 0, l: (t.savings || 0) + '%' })))}</div></div>
        <div class="card"><div class="hd"><h3>Rounds to award</h3></div><div class="bd">
          ${H.chartBars(D.TENDERS.slice(0, 8).map((t) => ({ n: t.title.slice(0, 26), v: t.totalRounds, l: t.totalRounds + ' rounds' })))}</div></div>
      </div>`;
  };
  S.carriers = function () {
    return `<div class="crumbs">Home / <b>Carrier database</b></div>
      <div class="spread" style="margin:1rem 0"><div><h1>Carrier database</h1>
        <p style="margin:0">${D.CARRIERS.length} carriers with schedule reliability</p></div>
        <span class="chip mono">carrierdb/search/new</span></div>
      <div class="card"><table class="tbl"><thead><tr><th>Carrier</th><th>SCAC</th><th>Reliability</th><th>Alliance</th><th></th></tr></thead>
        <tbody>${D.CARRIERS.map((c, i) => `<tr><td><b>${esc(c.name)}</b></td><td class="mono">${esc(c.scac)}</td>
          <td style="min-width:180px">${H.chartBars([{ n: '', v: c.reliability, l: c.reliability + '%' }])}</td>
          <td class="small">${['2M', 'Ocean Alliance', 'THE Alliance', 'Independent'][i % 4]}</td>
          <td class="right"><button class="btn sm" data-action="toast" data-msg="Adding a carrier to a tender closes the lane to alternatives.">Add to tender</button></td></tr>`).join('')}
        </tbody></table></div>`;
  };
  S.onboardingRequests = function () {
    return `<div class="crumbs">Home / <b>Onboarding requests</b></div>
      <div class="spread" style="margin:1rem 0"><div><h1>Onboarding requests</h1>
        <p style="margin:0">Supplier self-registrations awaiting review · <span class="mono">REVIEW_ONBOARDING</span></p></div></div>
      <div class="card"><table class="tbl"><thead><tr><th>Company</th><th>Country</th><th>Requested by</th><th>Modules</th><th>Status</th><th></th></tr></thead>
        <tbody>${[['Baltic Freight OÜ', 'EE', 'M. Tamm', 'canTender', 'PENDING'],
               ['Adriatic Shipping d.o.o.', 'SI', 'I. Novak', 'canTender, canSpot', 'PENDING'],
               ['Meridian Cargo SA', 'ES', 'C. Ferrer', 'canTender', 'APPROVED'],
               ['Cape Logistics (Pty)', 'ZA', 'T. Dlamini', 'canTender, itm', 'PENDING']]
          .map(([c, co, u, m, s]) => `<tr><td><b>${esc(c)}</b></td><td>${H.flagTxt(co)} ${esc(co)}</td><td>${esc(u)}</td>
            <td class="small mono">${esc(m)}</td><td>${H.badge(s === 'APPROVED' ? 'AWARDED' : 'IN_PROGRESS')}</td>
            <td class="right"><div class="row"><button class="btn sm" data-action="toast" data-msg="GET /onboard/requests returns 403 anonymously.">Review</button></div></td></tr>`).join('')}
      </tbody></table></div>`;
  };
  S.ratesExport = function () {
    return `<div class="crumbs">Home / <b>Rates export</b></div>
      <div class="spread" style="margin:1rem 0"><div><h1>Rates export</h1>
        <p style="margin:0">Export agreed rates to downstream systems</p></div>
        <span class="chip mono">/reporting/rates/export/mapping/get</span></div>
      <div class="grid g2">
        <div class="card"><div class="hd"><h3>Export configuration</h3></div><div class="bd">
          <div class="field"><label>Profile type</label><select><option>Ocean FCL</option><option>Ocean LCL</option><option>Air</option></select></div>
          <div class="field"><label>From</label><input type="date" value="2026-09-01"></div>
          <div class="field"><label>Till</label><input type="date" value="2026-09-30"></div>
          <div class="field"><label>Column mapping</label><select><option>Default mapping</option><option>Customer-specific</option></select></div>
          <button class="btn primary" data-action="toast" data-msg="The mapping is configurable and saved via /reporting/rates/export/mapping/save.">Export rates</button></div></div>
        <div class="card"><div class="hd"><h3>Column mapping</h3></div><div class="bd">
          <table class="tbl"><thead><tr><th>Source column</th><th>Target field</th></tr></thead><tbody>
            ${[['Origin UN/LOCODE', 'origin_code'], ['Destination UN/LOCODE', 'destination_code'],
               ['Equipment', 'equipment_type'], ['All-in rate', 'rate_all_in'], ['Currency', 'currency'],
               ['Validity from', 'valid_from'], ['Validity to', 'valid_to'], ['Carrier', 'carrier_scac']]
              .map(([s, t]) => `<tr><td class="small">${esc(s)}</td><td class="mono small">${esc(t)}</td></tr>`).join('')}
          </tbody></table></div></div>
      </div>`;
  };
  S.unsubscribed = function () {
    return `<div class="content" style="max-width:560px;margin:4rem auto;text-align:center">
      <h1>You have been unsubscribed</h1>
      <p>You will no longer receive tender notifications at this address.</p>
      <a class="btn primary" href="#/login" data-nav>Back to sign in</a></div>`;
  };

  /* ------------------------------------------------------------------- boot */
  window.addEventListener('hashchange', render);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  window.OT_ESC = esc;

  if (!location.hash) location.hash = '#/login';
  render();
})();
