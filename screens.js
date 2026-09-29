/* =============================================================================
 * Ocean Tender · screens
 * One render function per screen, keyed by the route name.
 * ========================================================================== */
(function () {
  'use strict';
  const D = window.OT;
  const S = {};

  /* ------------------------------------------------------------------ utils */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n, c) => (c || 'EUR') === 'EUR' ? '€' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Number(n).toLocaleString('en-GB');
  const int = (n) => Number(n).toLocaleString('en-GB');
  const pct = (n) => (Math.round(Number(n) * 10) / 10) + '%';
  const dt = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const badge = (v) => `<span class="badge b-${esc(v)}">${esc(String(v).replace(/_/g, ' '))}</span>`;
  const flagTxt = (cc) => `<span class="flag">${esc(cc)}</span>`;
  const portByName = (code) => D.PORTS.find((p) => p.code === code) || { code, name: code, country: '--' };
  const lanePort = (code) => `${flagTxt(portByName(code).country)} <b class="mono">${esc(code)}</b> <span class="muted small">${esc(portByName(code).name)}</span>`;

  /* ------------------------------------------------------------------ charts */
  function chartBars(items, opts) {
    const max = Math.max(...items.map((i) => i.v), 1);
    return items.map((i) => `
      <div class="bar-row">
        <div class="nm" title="${esc(i.n)}">${esc(i.n)}</div>
        <div class="track"><div class="fill" style="width:${Math.max(2, (i.v / max) * 100)}%"></div></div>
        <div class="val">${esc(i.l || int(i.v))}</div>
      </div>`).join('');
  }
  function chartLine(points, labels, opts) {
    const w = 560, h = 170, pad = 26;
    /* Pad the axis around the data rather than forcing a zero baseline, so small
       movements (a bid ladder, a savings index) stay legible. */
    const hi0 = Math.max(...points), lo0 = Math.min(...points);
    const span = (hi0 - lo0) || Math.abs(hi0) * 0.1 || 1;
    const max = hi0 + span * 0.35, min = Math.max(0, lo0 - span * 0.35);
    const x = (i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
    const y = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    const path = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const area = `${path} L${x(points.length - 1).toFixed(1)},${h - pad} L${x(0).toFixed(1)},${h - pad} Z`;
    const grid = [0, .25, .5, .75, 1].map((f) => `<line x1="${pad}" x2="${w - pad}" y1="${(h - pad - f * (h - pad * 2)).toFixed(1)}" y2="${(h - pad - f * (h - pad * 2)).toFixed(1)}" stroke="#eef3f5"/>`).join('');
    const dots = points.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="#0f8a5f"/>`).join('');
    const lx = labels.map((l, i) => `<text x="${x(i).toFixed(1)}" y="${h - 6}" font-size="10" fill="#7d919c" text-anchor="middle">${esc(l)}</text>`).join('');
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${grid}
      <path d="${area}" fill="rgba(15,138,95,.10)"/><path d="${path}" fill="none" stroke="#0f8a5f" stroke-width="2"/>${dots}${lx}</svg>`;
  }
  function chartDonut(pctVal, label) {
    const r = 52, c = 2 * Math.PI * r, on = (pctVal / 100) * c;
    return `<svg class="chart" viewBox="0 0 140 140" style="height:150px">
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="#eef3f5" stroke-width="15"/>
      <circle cx="70" cy="70" r="${r}" fill="none" stroke="#0f8a5f" stroke-width="15"
        stroke-dasharray="${on.toFixed(1)} ${(c - on).toFixed(1)}" transform="rotate(-90 70 70)" stroke-linecap="round"/>
      <text x="70" y="68" text-anchor="middle" font-size="24" font-weight="600" fill="#1c2b33">${pctVal}%</text>
      <text x="70" y="86" text-anchor="middle" font-size="10" fill="#7d919c">${esc(label || '')}</text></svg>`;
  }
  function chartProgress(label, done, total) {
    const p = total ? Math.round((done / total) * 100) : 0;
    return `<div style="margin-bottom:.7rem">
      <div class="spread small"><span>${esc(label)}</span><span class="muted">${int(done)} / ${int(total)} · ${p}%</span></div>
      <div class="track" style="height:9px;background:var(--line-2);border-radius:5px;overflow:hidden;margin-top:.25rem">
        <div style="height:100%;width:${p}%;background:linear-gradient(90deg,var(--accent),var(--accent-2))"></div></div></div>`;
  }
  /* Each reporting widget shows a series that matches its own method name, so the
     dashboard is not a wall of identical placeholders. */
  const SUP = () => window.OT.SUPPLIERS;
  const WIDGET_SERIES = {
    top5Tenders: () => [
      { n: 'Ocean Freight 2027 — Asia→N.Eu', v: 14.2, l: '14.2%' },
      { n: 'Transpacific Eastbound Q1', v: 12.8, l: '12.8%' },
      { n: 'Middle East Gateway Lanes', v: 11.1, l: '11.1%' },
      { n: 'LCL Consolidation — Med', v: 9.4, l: '9.4%' },
      { n: 'Reefer — S. Hemisphere', v: 7.9, l: '7.9%' },
    ],
    getSavings: () => [
      { n: 'Baseline (incumbent)', v: 100, l: 'index 100' },
      { n: 'After round 1', v: 95.8, l: '−4.2%' },
      { n: 'After round 2', v: 92.1, l: '−7.9%' },
      { n: 'After round 3', v: 89.7, l: '−10.3%' },
      { n: 'Awarded', v: 88.6, l: '−11.4%' },
    ],
    ndaAcceptance: () => SUP().slice(0, 8).map((sp, i) => ({ n: sp.name, v: [100, 100, 100, 100, 100, 80, 60, 40][i], l: [100, 100, 100, 100, 100, 80, 60, 40][i] + '%' })),
    questionnaireSubmission: () => SUP().slice(0, 8).map((sp, i) => ({ n: sp.name, v: [100, 100, 100, 90, 80, 70, 50, 30][i], l: [100, 100, 100, 90, 80, 70, 50, 30][i] + '%' })),
    questionnaireScoring: () => SUP().slice(0, 7).map((sp, i) => ({ n: sp.name, v: [92, 88, 86, 81, 77, 71, 64][i], l: [92, 88, 86, 81, 77, 71, 64][i] + ' / 100' })),
    NominatedSuppliers: () => SUP().slice(0, 6).map((sp, i) => ({ n: sp.name, v: [42, 31, 24, 18, 11, 6][i], l: [42, 31, 24, 18, 11, 6][i] + ' lanes' })),
    __default: () => [
      { n: 'Round 1', v: 100, l: '100%' }, { n: 'Round 2', v: 93, l: '93%' },
      { n: 'Round 3', v: 88, l: '88%' }, { n: 'Round 4', v: 84, l: '84%' },
    ],
  };

  function widgetCard(w) {
    let body = '';
    if (w.kind === 'kpi') body = `<div class="kpi"><div class="v">${esc(w.value)}</div><div class="l">${esc(w.title)}</div><div class="s">${esc(w.sub || '')}</div></div>`;
    else if (w.kind === 'bar' || w.kind === 'bars') {
      body = chartBars(WIDGET_SERIES[w.method] ? WIDGET_SERIES[w.method]() : WIDGET_SERIES.__default());
    } else if (w.kind === 'line') {
      body = chartLine([100, 94.2, 90.8, 88.6, 87.9, 87.4], ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']);
    } else if (w.kind === 'donut') {
      body = chartDonut(w.pct != null ? w.pct : 74, w.title.split(' ')[0]);
    } else if (w.kind === 'progress') {
      body = chartProgress('Lanes nominated', 210, 282) + chartProgress('Shipments nominated', 1840, 2610)
           + chartProgress('Scopes awarded', 7, 9);
    } else if (w.kind === 'list') {
      body = `<div class="stack small">${['DSV — Ocean Freight 2027 (282 lanes)', 'Kuehne + Nagel — Transpacific Q1 (188 lanes)', 'GEODIS — Reefer Programme (96 lanes)']
        .map((t) => `<div class="spread"><span>${esc(t)}</span><span class="muted">2 h ago</span></div>`).join('')}</div>`;
    }
    return `<div class="card"><div class="hd"><h4>${esc(w.title)}</h4>
      <span class="grow"></span><span class="chip mono" title="dispatched by GET /reporting/json">${esc(w.provider.split('/')[1])}.${esc(w.method)}</span></div>
      <div class="bd">${body}</div></div>`;
  }

  /* A clean KPI tile — deliberately NOT derived by string-surgery on widgetCard(). */
  function kpiTile(w) {
    return `<div class="card"><div class="bd"><div class="kpi">
      <div class="v">${esc(w.value)}</div>
      <div class="l">${esc(w.title)}</div>
      <div class="s">${esc(w.sub || '')}</div>
      <div style="margin-top:.5rem"><span class="chip mono" title="dispatched by GET /reporting/json?provider=…">${esc(w.provider.split('/')[1])}.${esc(w.method)}</span></div>
    </div></div></div>`;
  }

  /* --------------------------------------------------------- access helpers */
  function hasAccess(code) { return (window.OT_STATE.user.access || []).indexOf(code) >= 0; }
  function isSupport() { return !!window.OT_STATE.user.support; }
  function showSpotOverview() { return !window.OT_STATE.user.company || /@.*(kwe)/i.test(window.OT_STATE.user.email); }
  function showPricing() { return window.OT_STATE.user.flag.pricing; }

  /* ============================================================== 1. LOGIN === */
  S.login = function () {
    return `<div class="login-wrap">
      <div class="login-art">
        <div class="brand">Ocean<span>&nbsp;Tender</span></div>
        <h2>Freight procurement, from RFQ to nomination.</h2>
        <p>Run ocean, air and parcel tenders end to end: build the rate card, invite suppliers, collect
           quotations over multiple rounds, model award scenarios and nominate — with savings tracked
           against your incumbent baseline.</p>
        <ul>
          <li>Tender creation with documentation, NDA and questionnaire</li>
          <li>Multi-round quotation collection and quote-evolution analysis</li>
          <li>Spot bidding with a live bid ladder</li>
          <li>Nomination scenarios, savings and CO₂ reporting</li>
        </ul>
      </div>
      <div class="login-card">
        <div class="logo">OCEAN<b>&nbsp;TENDER</b></div>
        <h3>Sign in</h3>
        <div class="field"><label>Email or username</label>
          <input id="lg-user" autocomplete="off" value="${esc(window.OT_STATE.user.email)}"></div>
        <div class="field"><label>Password</label>
          <input id="lg-pass" type="password" autocomplete="off" value="demo-password"></div>
        <div class="login-row">
          <label class="row small"><input type="checkbox" checked> Remember me</label>
          <a href="#/forgotPassword" data-nav>Forgot password?</a>
        </div>
        <button class="btn primary" style="width:100%;justify-content:center" data-action="login">Sign in</button>
        <div style="text-align:center;margin:1rem 0 .6rem" class="muted small">or</div>
        <button class="btn" style="width:100%;justify-content:center" data-action="sso">
          Sign in with SSO <span class="muted small">(SAML&nbsp;2.0)</span></button>
        <hr>
        <div class="small muted" style="margin-bottom:.4rem">Or explore a role — the navigation is gated by these:</div>
        <div class="stack">
          ${D.PERSONAS.map((p) => `<button class="btn sm" style="justify-content:flex-start" data-action="persona" data-id="${p.id}">
            ${esc(p.label)}</button>`).join('')}
        </div>
      </div>
    </div>`;
  };

  S.forgotPassword = function () {
    return `<div class="login-wrap"><div class="login-art">
      <div class="brand">Ocean<span>&nbsp;Tender</span></div>
      <h2>Reset your password.</h2>
      <p>Enter the email address on your account and we will send a reset link. The link carries a
         one-time token; a consumed or unknown token returns <code class="mono">421 Destination Locked</code>.</p>
      </div><div class="login-card">
      <div class="logo">OCEAN<b>&nbsp;TENDER</b></div><h3>Forgot password</h3>
      <div class="field"><label>Email address</label><input value="a.ruiz@acme.example"></div>
      <button class="btn primary" style="width:100%;justify-content:center" data-action="toast" data-msg="Reset link sent (mock). The real endpoint answers with a bare boolean.">Send reset link</button>
      <p style="margin-top:1rem"><a href="#/login" data-nav>← Back to sign in</a></p>
      </div></div>`;
  };

  /* =============================================================== 2. HOME === */
  S.home = function () {
    const mine = D.TENDERS.filter((t) => !t.spot).slice(0, 6);
    const kpis = D.REPORT_WIDGETS.filter((w) => w.kind === 'kpi');
    return `
    <div class="spread" style="margin-bottom:1rem">
      <div><h1>Good afternoon, ${esc(window.OT_STATE.user.userName)}</h1>
        <p style="margin:0">${esc(D.COMPANY.name)} · ${esc(D.TENDERS.filter((t) => t.status === 'OPEN').length)} tenders open ·
          next deadline in <b>6 days</b></p></div>
      <div class="row">
        <button class="btn" data-action="open-evidence" data-key="/">ⓘ Evidence</button>
        <button class="btn primary" data-action="create-tender">+ Create tender</button>
      </div>
    </div>

    <div class="grid g4" style="margin-bottom:1rem">
      ${kpis.map(kpiTile).join('')}
    </div>

    <div class="grid g2" style="margin-bottom:1rem">
      <div class="card"><div class="hd"><h3>Savings vs. incumbent baseline</h3>
        <span class="grow"></span><span class="chip mono">savings_widget/SavingsWidget.getSavings</span></div>
        <div class="bd">${chartLine([100, 97, 94, 91, 88.6], ['R1', 'R2', 'R3', 'R4', 'Award'])}
          <div class="spread small muted" style="margin-top:.3rem"><span>Baseline index 100 = incumbent rates</span><span><b style="color:var(--accent)">−11.4%</b> achieved</span></div></div></div>
      <div class="card"><div class="hd"><h3>Top suppliers by submitted lanes</h3>
        <span class="grow"></span><span class="chip mono">suppliers_widgets/SuppliersWidgets</span></div>
        <div class="bd">${chartBars(D.SUPPLIERS.slice(0, 7).map((s, i) => ({ n: s.name, v: 282 - i * 31, l: (282 - i * 31) + ' lanes' })))}</div></div>
    </div>

    <div class="grid g3" style="margin-bottom:1rem">
      <div class="card" style="grid-column:span 2"><div class="hd"><h3>Running tenders</h3>
        <span class="grow"></span><a href="#tenders" data-nav class="small">View all →</a></div>
        <table class="tbl"><thead><tr><th>Tender</th><th>Status</th><th>Round</th><th class="num">Lanes</th><th>Closes</th><th class="num">Savings</th></tr></thead>
        <tbody>${mine.map((t) => `<tr class="click" data-nav="#/controlroom/overview/${t.id}">
          <td><b>${esc(t.title)}</b><div class="muted small mono">${esc(t.id)} · ${esc(t.mode)}</div></td>
          <td>${badge(t.status)}</td><td>${t.round} / ${t.totalRounds}</td>
          <td class="num">${t.laneCount}</td><td>${dt(t.closeDate)}</td>
          <td class="num" style="color:var(--accent)">${t.savings ? '−' + pct(t.savings) : '—'}</td></tr>`).join('')}</tbody></table></div>

      <div class="card"><div class="hd"><h3>Upcoming deadlines</h3></div><div class="bd">
        ${D.DEADLINES.slice(0, 4).map((d) => `<div class="spread" style="padding:.4rem 0;border-bottom:1px solid var(--line-2)">
          <div><div><b>${esc(d.label)}</b></div><div class="muted small">${esc(d.tender)}</div></div>
          <div class="right nowrap"><div class="mono small">${esc(d.date)}</div>${badge(d.severity)}</div></div>`).join('')}
      </div></div>
    </div>

    <div class="grid g2">
      <div class="card"><div class="hd"><h3>Activity</h3><span class="grow"></span>
        <span class="chip mono">STOMP /topic/…</span></div><div class="bd">
        ${D.ACTIVITY.slice(0, 6).map((a) => `<div class="spread" style="padding:.4rem 0;border-bottom:1px solid var(--line-2)">
          <div><div>${esc(a.text)}</div><div class="muted small">${esc(a.who)} · <code class="mono">${esc(a.topic)}</code></div></div>
          <div class="muted small nowrap">${esc(a.at)}</div></div>`).join('')}
      </div></div>
      <div class="card"><div class="hd"><h3>Nomination progress</h3>
        <span class="grow"></span><span class="chip mono">nomination_widgets/NominationWidgets</span></div>
        <div class="bd">${chartProgress('Lanes nominated', 210, 282)}${chartProgress('Shipments nominated', 1840, 2610)}
        ${chartProgress('Scopes awarded', 7, 9)}</div></div>
    </div>`;
  };

  /* ============================================================ 3. TENDERS === */
  S.tenders = function (q) {
    const filter = q.filter || 'ALL', search = (q.q || '').toLowerCase();
    let list = D.TENDERS.slice();
    if (filter !== 'ALL') list = list.filter((t) => t.status === filter);
    if (search) list = list.filter((t) => (t.title + t.id + t.origin + t.destination).toLowerCase().includes(search));
    return `
    <div class="spread" style="margin-bottom:1rem">
      <div><h1>My events</h1><p style="margin:0">${list.length} of ${D.TENDERS.length} tenders · ${int(D.TENDERS.reduce((a, t) => a + t.laneCount, 0))} lanes in total</p></div>
      <div class="row">
        <button class="btn" data-action="open-evidence" data-key="/tenders">ⓘ Evidence</button>
        <button class="btn" data-action="toast" data-msg="Exports are async jobs: POST /tender/participants/export/dump then GET /download/async/{id}.">Export</button>
        <button class="btn primary" data-action="create-tender">+ Create</button>
      </div>
    </div>
    <div class="toolbar">
      <div class="row" style="gap:.3rem">
        ${['ALL', 'DRAFT', 'OPEN', 'SIMULATION', 'OPENAWARDED', 'AWARDED', 'CLOSED', 'ARCHIVED'].map((f) =>
          `<button class="btn sm ${f === filter ? 'primary' : ''}" data-action="tender-filter" data-f="${f}">${f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}</button>`).join('')}
      </div>
      <div class="filters">
        <input placeholder="Search tenders, lanes, IDs…" value="${esc(q.q || '')}" data-input="tender-search" style="width:240px">
        <select><option>All modes</option>${D.MODES.map((m) => `<option>${m}</option>`).join('')}</select>
        <select><option>All owners</option><option>A. Ruiz</option><option>M. Lindqvist</option><option>J. Okafor</option></select>
      </div>
    </div>
    <div class="card"><table class="tbl">
      <thead><tr><th style="width:26px"><input type="checkbox"></th><th>Tender</th><th>Status</th><th>Mode</th>
        <th>Lane</th><th class="num">Lanes</th><th class="num">Volume</th><th>Round</th><th>Closes</th><th>Owner</th><th class="num">Savings</th><th></th></tr></thead>
      <tbody>${list.map((t) => {
        const vol = t.lanes.reduce((a, l) => a + l.volume, 0);
        return `<tr class="click" data-nav="#/controlroom/overview/${t.id}">
          <td><input type="checkbox" onclick="event.stopPropagation()"></td>
          <td><b>${esc(t.title)}</b><div class="muted small mono">${esc(t.id)}${t.spot ? ' · SPOT' : ''}</div></td>
          <td>${badge(t.status)}</td><td class="mono small">${esc(t.mode)}</td>
          <td class="nowrap">${lanePort(t.origin)} <span class="muted">→</span> ${lanePort(t.destination)}</td>
          <td class="num">${t.laneCount}</td>
          <td class="num">${int(vol)} <span class="muted small">${t.mode === 'AIR' ? 'kg' : t.mode === 'SEA_LCL' ? 'cbm' : 'feu'}</span></td>
          <td>${t.round} / ${t.totalRounds}</td><td class="nowrap">${dt(t.closeDate)}</td>
          <td>${esc(t.owner)}</td><td class="num" style="color:var(--accent)">${t.savings ? '−' + pct(t.savings) : '—'}</td>
          <td class="right nowrap"><button class="btn sm" data-action="toast" data-msg="Action copied from the real toolbar (open, copy, archive, export).">⋯</button></td></tr>`;
      }).join('')}</tbody></table>
      <div class="ft small muted">No server-side pagination exists in this API — the client paginates the array it already holds
        <span class="chip">client-side paging: 10 / 25 / 50</span></div></div>`;
  };

  /* ==================================================== 4. CREATE / DETAIL === */
  S.tenderDetail = function (q) {
    const t = D.TENDERS.find((x) => x.id === q.id) || D.TENDERS[0];
    const step = Number(q.step || 0);
    const steps = ['General details', 'Documentation & NDA', 'Suppliers', 'Questionnaire', 'Rate card', 'Additional configuration', 'Launch'];
    const body = [
      /* 0 */() => `<div class="grid g2">
        <div class="field"><label>Tender title</label><input value="${esc(t.title)}"></div>
        <div class="field"><label>Reference</label><input value="${esc(t.id)}" readonly></div>
        <div class="field"><label>Mode</label><select>${D.MODES.map((m) => `<option ${m === t.mode ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <div class="field"><label>Currency</label><select><option>EUR</option><option>USD</option><option>GBP</option></select></div>
        <div class="field"><label>Submission deadline</label><input type="date" value="${t.closeDate.slice(0, 10)}"></div>
        <div class="field"><label>Number of rounds</label><input type="number" value="${t.totalRounds}" min="1" max="10"></div>
        <div class="field" style="grid-column:span 2"><label>Description</label>
          <textarea rows="3">Annual ocean freight procurement for ${esc(t.origin)} → ${esc(t.destination)}, ${t.laneCount} lanes.</textarea></div>
      </div>`,
      /* 1 */() => `<div class="stack">
        <div class="ev"><div class="k">Documentation</div>Upload the tender documentation package. Suppliers see it only after NDA acceptance.
          <div style="margin-top:.5rem"><button class="btn sm" data-action="toast" data-msg="Multipart upload · field name 'file' · 200 MiB cap, then the maxFileSizeMb cookie is authoritative.">⬆ Upload documents</button></div></div>
        <div class="card"><div class="bd">
          <label class="row"><input type="checkbox" checked> Require NDA acceptance before suppliers can view the rate card</label>
          <label class="row" style="margin-top:.4rem"><input type="checkbox" checked> Use the company default NDA template</label>
          <div class="muted small" style="margin-top:.4rem">NDA is uploaded per tender (<span class="mono">/tender/nda/template/upload/{id}</span>) or defaulted from
            the company (<span class="mono">/company/uploadDefaultNDA/{id}</span>).</div></div></div>
        <table class="tbl"><thead><tr><th>Document</th><th>Type</th><th class="num">Size</th><th>Visibility</th></tr></thead><tbody>
          <tr><td>Tender instructions.pdf</td><td>Instructions</td><td class="num">412 KB</td><td>All participants</td></tr>
          <tr><td>Rate card template.xlsx</td><td>Template</td><td class="num">88 KB</td><td>All participants</td></tr>
          <tr><td>Non-disclosure agreement.pdf</td><td>NDA</td><td class="num">96 KB</td><td>Mandatory</td></tr>
          <tr><td>Incumbent baseline.xlsx</td><td>Internal</td><td class="num">220 KB</td><td>${badge('DRAFT')} hidden from suppliers</td></tr>
        </tbody></table></div>`,
      /* 2 */() => `<div class="stack">
        <div class="grid g2"><div class="field"><label>Allowed email domains</label>
          <input value="kuehne-nagel.example, dhl.example, dsv.example"></div>
          <div class="field"><label>Invitation deadline</label><input type="date" value="2026-09-24"></div></div>
        <div class="split spread"><div class="small muted">Selected suppliers automatically receive an email invitation.</div>
          <button class="btn sm" data-action="toast" data-msg="You have insufficient permissions to invite colleagues. (A real access-code gate.)">Invite colleagues</button></div>
        <table class="tbl"><thead><tr><th style="width:26px"><input type="checkbox" checked></th><th>Supplier</th><th>Country</th>
          <th>NDA</th><th>Questionnaire</th><th class="num">Rating</th><th>Status</th></tr></thead><tbody>
          ${D.SUPPLIERS.map((s, i) => `<tr><td><input type="checkbox" ${i < 8 ? 'checked' : ''}></td>
            <td><b>${esc(s.name)}</b></td><td>${flagTxt(s.country)} ${esc(s.country)}</td>
            <td>${s.nda ? '✓' : '<span class="muted">—</span>'}</td><td>${s.questionnaire ? '✓' : '<span class="muted">—</span>'}</td>
            <td class="num">${s.rating.toFixed(1)}</td><td>${badge(i < 5 ? 'INVITED' : 'NO_RESPONSE')}</td></tr>`).join('')}
        </tbody></table></div>`,
      /* 3 */() => `<div class="stack">
        <div class="ev"><div class="k">Questionnaire</div>Scored sections are weighted and combined into a supplier score.
          Feedback statuses: <span class="chip">INVITED</span> <span class="chip">IN_PROGRESS</span> <span class="chip">SUBMITTED</span></div>
        ${[['Company profile & certifications', 20, ['ISO 9001', 'ISO 14001', 'AEO', 'IATA']],
           ['Operational capability', 30, ['Ocean FCL', 'Ocean LCL', 'Air', 'Reefer', 'DG', 'Project cargo']],
           ['Digital integration', 25, ['API', 'EDI', 'Portal', 'Track & trace']],
           ['Sustainability & compliance', 25, ['CO₂ reporting', 'Green fuels', 'Modern fleet']]]
          .map(([sec, w, opts], i) => `<div class="card"><div class="hd"><h4>${esc(sec)}</h4><span class="grow"></span>
            <span class="chip">weight ${w}%</span></div><div class="bd"><div class="chiplist">
            ${opts.map((o) => `<label class="chip"><input type="checkbox" ${i < 2 ? 'checked' : ''}> ${esc(o)}</label>`).join('')}
            </div></div></div>`).join('')}</div>`,
      /* 4 */() => rateCardScreen(t, 1, true),
      /* 5 */() => `<div class="grid g2">
        <div class="field"><label>Bid validity (days)</label><input type="number" value="90"></div>
        <div class="field"><label>Volume tolerance</label><input value="±10%"></div>
        <div class="field"><label>Incoterms allowed</label><input value="FOB, CIF, EXW, DAP, FCA"></div>
        <div class="field"><label>Equipment allowed</label><input value="20GP, 40GP, 40HC, 40RF, 45HC"></div>
        <div class="field"><label>Currency conversion</label><select><option>Company presets</option><option>ECB daily</option></select></div>
        <div class="field"><label>Supplier visibility</label><select><option>Visible to selected suppliers</option><option>Hidden from suppliers</option></select></div>
        <div style="grid-column:span 2"><label class="row"><input type="checkbox" checked> Allow suppliers to propose alternative routings</label>
          <label class="row" style="margin-top:.4rem"><input type="checkbox" checked> Require a questionnaire before rate-card submission</label>
          <label class="row" style="margin-top:.4rem"><input type="checkbox" id="cb-set" ${hasAccess('CHANGE_TENDER_STATUS_AWARD_FINISH_CANCEL') ? '' : 'disabled'}>
            Permit award and finish (requires <span class="mono">CHANGE_TENDER_STATUS_AWARD_FINISH_CANCEL</span>)</label></div>
      </div>`,
      /* 6 */() => `<div class="stack">
        ${['General details', 'Documentation & NDA', 'Suppliers', 'Questionnaire', 'Rate card', 'Additional configuration'].map((s, i) =>
          `<div class="spread" style="padding:.5rem 0;border-bottom:1px solid var(--line-2)"><span>${esc(s)}</span>
           <span style="color:var(--accent)">✓ complete</span></div>`).join('')}
        <div class="ev" style="margin-top:.6rem"><div class="k">Launch</div>
          Launching is a body-less POST (<span class="mono">POST /tender/new</span> then <span class="mono">POST /tender/save</span>).
          The server seeds the skeleton and the client mutates it afterwards.</div>
        <div class="row"><button class="btn primary" data-action="launch-tender">Launch tender</button>
          <button class="btn" data-action="toast" data-msg="Saved as draft.">Save draft</button></div></div>`,
    ][step]();

    return `
    <div class="spread" style="margin-bottom:.6rem">
      <div><div class="crumbs"><a href="#tenders" data-nav>My events</a> / ${esc(t.title)}</div>
        <h1 style="margin:.2rem 0 .3rem">${esc(t.title)}</h1>
        <div class="row">${badge(t.status)} <span class="mono small muted">${esc(t.id)}</span>
          <span class="muted small">${esc(t.mode)} · ${t.laneCount} lanes · closes ${dt(t.closeDate)}</span></div></div>
      <div class="row"><button class="btn" data-action="open-evidence" data-key="/createTender/:id">ⓘ Evidence</button>
        <button class="btn" data-nav="#/controlroom/overview/${t.id}">Open control room</button></div>
    </div>
    <div class="steps">${steps.map((s, i) => `<button class="st ${i === step ? 'on' : i < step ? 'done' : ''}"
        data-action="wizard-step" data-step="${i}" data-id="${t.id}"><span class="n">${i < step ? '✓' : i + 1}</span>${esc(s)}</button>`).join('')}</div>
    <div class="card"><div class="bd">${body}</div>
      <div class="ft"><button class="btn" data-action="wizard-step" data-step="${Math.max(0, step - 1)}" data-id="${t.id}" ${step === 0 ? 'disabled' : ''}>← Back</button>
        <span class="grow" style="flex:1"></span>
        <span class="muted small">Step ${step + 1} of ${steps.length}</span>
        <button class="btn primary" data-action="wizard-step" data-step="${Math.min(steps.length - 1, step + 1)}" data-id="${t.id}" ${step === steps.length - 1 ? 'disabled' : ''}>Next →</button>
      </div></div>`;
  };

  /* ================================================= 5. RATE CARD (sheet) === */
  function rateCardScreen(t, round, embedded) {
    const rc = D.makeRateCard(t, round);
    /* The real rate card has a 4–6 row header: row 0 is the charge CATEGORY (which spans
       several charges), row 1 is the individual CHARGE, then the supplier columns. */
    const chargeGroups = [];
    rc.columns.forEach((c) => {
      let g = chargeGroups.find((x) => x.field === c.field);
      if (!g) { g = { field: c.field, category: c.category, type: c.type, unit: c.unit, mandatory: c.mandatory, cols: [] }; chargeGroups.push(g); }
      g.cols.push(c);
    });
    const catGroups = [];
    chargeGroups.forEach((g) => {
      let c = catGroups.find((x) => x.category === g.category);
      if (!c) { c = { category: g.category, cols: 0 }; catGroups.push(c); }
      c.cols += g.cols.length;
    });
    const catClass = (cat) => 'cat-' + cat.split(' ')[0].toLowerCase();

    const head = `
      <thead>
        <tr><th class="sticky" rowspan="3">Lane / Row</th>
          ${catGroups.map((g) => `<th colspan="${g.cols}" class="${catClass(g.category)} cat-head">${esc(g.category)}</th>`).join('')}</tr>
        <tr>${chargeGroups.map((g) => `<th colspan="${g.cols.length}" class="${catClass(g.category)}">${esc(g.field)}
          ${g.mandatory ? '<span title="mandatory" style="color:var(--danger)">*</span>' : ''}
          <div class="muted" style="font-weight:400;font-size:.68rem">${esc(g.type)} · ${esc(g.unit)}</div></th>`).join('')}</tr>
        <tr>${rc.columns.map((c) => `<th style="font-weight:500">${esc(c.supplier.split(' ')[0])}</th>`).join('')}</tr>
      </thead>`;

    return `
      <div class="spread" style="margin-bottom:.6rem">
        <div class="row"><h3 style="margin:0">Rate card — round ${round}</h3>
          <span class="chip mono">columns: ${rc.columns.length}</span>
          <span class="chip mono">rows: ${rc.rows.length}</span>
          <span class="chip mono">headerRows: ${rc.headerRows}</span>
          <span class="chip mono">MAX_NUMERIC_VALUE 999999999999</span></div>
        <div class="row">${[1, 2, 3].map((r) => `<button class="btn sm ${r === round ? 'primary' : ''}"
          data-action="rc-round" data-id="${t.id}" data-r="${r}">R${r}</button>`).join('')}
          <button class="btn sm" data-action="toast" data-msg="Applied column mapping. Dumps post the whole tableModel back with params.columns=dumpColumns.">Columns…</button>
          <button class="btn sm" data-action="toast" data-msg="POST /rc/dump then GET /rc/dump/export — exports are async and server-generated (Apache POI).">Export ▾</button></div>
      </div>
      <div class="sheet-wrap"><table class="sheet">${head}
        <tbody>${rc.rows.slice(0, 40).map((r) => `<tr>
          <td class="sticky"><b class="mono">${esc(r.meta.origin)}→${esc(r.meta.destination)}</b>
            <div class="muted" style="font-size:.7rem">${esc(r.meta.equipment)} · ${int(r.meta.volume)} · row ${r.meta.row}</div></td>
          ${r.e.map((v, i) => {
            const uid = rc.columns[i].uid;
            const err = r.errors[uid];
            return `<td class="cell ${v == null ? 'empty' : ''} ${err ? 'err' : ''}" contenteditable="true"
              title="${err || rc.columns[i].chargeId}" data-cell="${uid}">${v == null ? '—' : money(v).replace('€', '')}</td>`;
          }).join('')}</tr>`).join('')}
        </tbody></table></div>
      <div class="row" style="margin-top:.5rem">
        <span class="muted small">Showing 40 of ${rc.rows.length} rows. Cell format <span class="mono">"0.[000000]"</span> ·
          negatives rejected · <span class="mono">column.id==="max"</span> must be non-zero.</span>
        <span class="grow" style="flex:1"></span>
        <span class="badge b-HIGH">1 validation error on row 2</span>
      </div>
      ${embedded ? '' : ''}`;
  }

  /* ======================================================= 6. CONTROL ROOM == */
  S.controlroom = function (q) {
    const t = D.TENDERS.find((x) => x.id === q.id) || D.TENDERS[0];
    const tab = q.tab || 'overview';
    const TABS = [['overview', 'Overview'], ['rounds', 'Rounds'], ['participants', 'Participants'],
      ['quotes', 'Quotations'], ['ratecard', 'Rate card'], ['nomination', 'Nomination'],
      ['reports', 'Reports'], ['comms', 'Documents & Q&A'], ['progress', 'Progress']];

    const bodies = {
      overview: () => `<div class="grid g4" style="margin-bottom:1rem">
          <div class="card"><div class="bd"><div class="kpi"><div class="v">${t.laneCount}</div><div class="l">Lanes in scope</div>
            <div class="s">${int(t.lanes.reduce((a, l) => a + l.volume, 0))} ${t.mode === 'AIR' ? 'kg' : 'feu'}</div></div></div></div>
          <div class="card"><div class="bd"><div class="kpi"><div class="v">${t.participants.filter((p) => p.status === 'SUBMITTED').length}/${t.participants.length}</div>
            <div class="l">Quotations received</div><div class="s">round ${t.round} of ${t.totalRounds}</div></div></div></div>
          <div class="card"><div class="bd"><div class="kpi"><div class="v" style="color:var(--accent)">−${pct(t.savings)}</div>
            <div class="l">Savings vs. baseline</div><div class="s">${esc(t.currency)} ${int(t.savings * 168000)}</div></div></div></div>
          <div class="card"><div class="bd"><div class="kpi"><div class="v">${t.laneCount ? Math.round(t.lanes.reduce((a, l) => a + l.transitTime, 0) / t.laneCount) : 0}</div>
            <div class="l">Avg transit time</div><div class="s">days, door to door</div></div></div></div></div>
        <div class="grid g2"><div class="card"><div class="hd"><h3>Quotation coverage by supplier</h3></div><div class="bd">
          ${chartBars(t.participants.map((p) => ({ n: p.name, v: p.quotesIn, l: p.quotesIn + '/' + t.laneCount })))}</div></div>
          <div class="card"><div class="hd"><h3>Tender details</h3></div><div class="bd"><dl class="kv">
            <dt>Reference</dt><dd class="mono">${esc(t.id)}</dd>
            <dt>Status</dt><dd>${badge(t.status)}</dd>
            <dt>Mode</dt><dd class="mono">${esc(t.mode)}</dd>
            <dt>Owner</dt><dd>${esc(t.owner)}</dd>
            <dt>Created</dt><dd>${dt(t.created)}</dd>
            <dt>Submission deadline</dt><dd>${dt(t.closeDate)} <span class="muted small">17:00 CET</span></dd>
            <dt>Currency</dt><dd>${esc(t.currency)}</dd>
            <dt>Visibility</dt><dd>${badge('OPEN')} visible to selected suppliers</dd>
          </dl></div></div></div>`,
      rounds: () => `<div class="card"><table class="tbl">
          <thead><tr><th>Round</th><th>Opened</th><th>Deadline</th><th class="num">Quotes</th><th class="num">Best all-in</th><th class="num">vs. R1</th><th>Status</th><th></th></tr></thead>
          <tbody>${Array.from({ length: t.totalRounds }, (_, i) => {
            const r = i + 1, open = r <= t.round;
            const best = 2680 - i * 132, delta = i === 0 ? 0 : Math.round(((best - 2680) / 2680) * 1000) / 10;
            return `<tr><td><b>Round ${r}</b></td><td>${open ? dt(new Date(2026, 7, 1 + i * 14).toISOString()) : '—'}</td>
              <td>${open ? dt(new Date(2026, 7, 15 + i * 14).toISOString()) : '—'}</td>
              <td class="num">${open ? t.participants.length - i : 0}</td>
              <td class="num">${open ? money(best) : '—'}</td>
              <td class="num" style="color:${delta < 0 ? 'var(--accent)' : 'inherit'}">${delta ? delta + '%' : '—'}</td>
              <td>${open ? badge(r === t.round ? 'OPEN' : 'CLOSED') : badge('DRAFT')}</td>
              <td class="right">${r <= t.round ? `<button class="btn sm" data-action="rc-round" data-id="${t.id}" data-r="${r}">View quotes</button>` : ''}</td></tr>`;
          }).join('')}</tbody></table>
          <div class="ft"><button class="btn primary sm" data-action="toast" data-msg="POST /controlroom/shipper/round/open — opening a round notifies participants over /topic/TENDER_UPDATED/.">+ Open next round</button>
            <span class="muted small">Cancelling a round emits <span class="mono">/topic/ROUND_CANCELLED/</span></span></div></div>`,
      participants: () => `<div class="card"><table class="tbl">
          <thead><tr><th>Participant</th><th>Country</th><th>NDA</th><th>Questionnaire</th><th class="num">Quotes</th><th>Coverage</th><th>Status</th><th>Last activity</th></tr></thead>
          <tbody>${t.participants.map((p) => `<tr><td><b>${esc(p.name)}</b></td><td>${flagTxt(p.country)} ${esc(p.country)}</td>
            <td>${p.nda ? '✓ accepted' : '<span class="badge b-NO_RESPONSE">pending</span>'}</td>
            <td>${p.questionnaire ? '✓ submitted' : '<span class="badge b-NO_RESPONSE">pending</span>'}</td>
            <td class="num">${p.quotesIn} / ${t.laneCount}</td>
            <td style="min-width:140px"><div class="track" style="height:8px;background:var(--line-2);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${Math.round((p.quotesIn / t.laneCount) * 100)}%;background:var(--accent)"></div></div></td>
            <td>${badge(p.status)}</td><td class="muted small">${p.lastActivity.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td></tr>`).join('')}
          </tbody></table>
          <div class="ft"><button class="btn sm" data-action="toast" data-msg="POST /spot/bidder/reset/submit/{id} · /topic/DISCONTINUE_PARTICIPANT/">Reset submission</button>
            <button class="btn sm" data-action="toast" data-msg="Rate-card upload per participant: POST /controlroom/participant/uploadRateCard">Upload rate card</button>
            <span class="muted small">Batch scorecard upload is supported: <span class="mono">/controlroom/shipper/batchScorecardUpload</span></span></div></div>`,
      quotes: () => `<div class="grid g2" style="margin-bottom:1rem">
          <div class="card"><div class="hd"><h3>All-in comparison — first 8 lanes</h3>
            <span class="grow"></span><span class="chip mono">controlroom/shipper/scorecard</span></div>
            <div class="bd">${chartBars(t.lanes.slice(0, 8).map((l) => ({ n: l.origin + '→' + l.destination, v: l.targetRate, l: money(l.targetRate) })))}</div></div>
          <div class="card"><div class="hd"><h3>Quote evolution</h3>
            <span class="grow"></span><span class="chip mono">suppliers_widgets/SuppliersWidgets.quoteEvolution</span></div>
            <div class="bd">${chartLine([100, 94, 90, 87, 85], ['R1', 'R2', 'R3', 'R4', 'R5'])}</div></div></div>
        <div class="card"><table class="tbl"><thead><tr><th>Lane</th><th>Equipment</th><th class="num">Volume</th>
          ${t.participants.slice(0, 5).map((p) => `<th class="num">${esc(p.name.split(' ')[0])}</th>`).join('')}<th class="num">Target</th><th class="num">Best</th><th class="num">vs. target</th></tr></thead>
          <tbody>${t.lanes.slice(0, 16).map((l, li) => {
            const vals = t.participants.slice(0, 5).map((p, pi) => l.targetRate * (0.84 + ((li + pi) % 7) * 0.035));
            const best = Math.min(...vals);
            return `<tr><td class="nowrap">${lanePort(l.origin)} <span class="muted">→</span> ${lanePort(l.destination)}</td>
              <td class="mono small">${esc(l.equipment)}</td><td class="num">${int(l.volume)}</td>
              ${vals.map((v, i) => `<td class="num" style="${v === best ? 'color:var(--accent);font-weight:600' : ''}">${money(v)}</td>`).join('')}
              <td class="num muted">${money(l.targetRate)}</td><td class="num"><b>${money(best)}</b></td>
              <td class="num" style="color:var(--accent)">−${pct(((l.targetRate - best) / l.targetRate) * 100)}</td></tr>`;
          }).join('')}</tbody></table>
          <div class="ft small muted">16 of ${t.laneCount} lanes · the grid is server-driven: no column definition is static in this product</div></div>`,
      ratecard: () => rateCardScreen(t, t.round, false),
      nomination: () => `<div class="grid g3" style="margin-bottom:1rem">
          ${[['Balanced', 4, 11.4], ['Lowest cost', 3, 14.1], ['Incumbent-weighted', 5, 8.2]].map(([n, sup, sav]) =>
            `<div class="card"><div class="hd"><h4>${esc(n)}</h4></div><div class="bd">
              <div class="kpi"><div class="v" style="color:var(--accent)">−${sav}%</div><div class="l">projected savings</div>
              <div class="s">${sup} suppliers nominated</div></div>
              <button class="btn sm" style="margin-top:.5rem" data-action="toast" data-msg="Scenario applied to the nomination grid.">Apply scenario</button></div></div>`).join('')}
        </div>
        <div class="card"><div class="hd"><h3>Nomination grid</h3><span class="grow"></span>
          <span class="chip mono">aux: firstNomineeIndex … fifthNomineeIndex</span></div>
          <div class="bd" style="padding:0"><div class="sheet-wrap"><table class="sheet"><thead>
            <tr><th class="sticky" rowspan="2">Lane</th><th colspan="5">Awarded volume by nominee</th><th colspan="3">Backup</th><th rowspan="2">Target</th></tr>
            <tr><th>1st</th><th>2nd</th><th>3rd</th><th>4th</th><th>5th</th><th>1st</th><th>2nd</th><th>3rd</th></tr></thead>
            <tbody>${t.lanes.slice(0, 14).map((l, i) => {
              const a = [60, 25, 15, 0, 0], b = ['DSV', 'KN', 'GEODIS'];
              return `<tr><td class="sticky nowrap">${lanePort(l.origin)}→${lanePort(l.destination)}</td>
                ${a.map((v, k) => `<td class="cell">${v ? v + '%' : '—'}<div class="muted" style="font-size:.65rem">${v ? esc(t.participants[k % t.participants.length].name.split(' ')[0]) : ''}</div></td>`).join('')}
                ${b.map((s) => `<td class="cell">${esc(s)}</td>`).join('')}
                <td class="cell">${money(l.targetRate)}</td></tr>`;
            }).join('')}</tbody></table></div></div>
          <div class="bd" style="padding-top:0">${chartProgress('Lanes nominated', 210, 282)}</div>
          <div class="ft"><button class="btn primary sm" data-action="toast" data-msg="Nomination submitted. /topic/TENDER_OPERATION_UPDATE/">Submit nomination</button>
            <span class="muted small">Nomination is only available after the submission deadline.</span></div></div>`,
      reports: () => `<div class="grid g3">${D.REPORT_WIDGETS.map(widgetCard).join('')}</div>`,
      comms: () => `<div class="grid g2"><div class="card"><div class="hd"><h3>Q&amp;A</h3>
            <span class="grow"></span><span class="chip mono">/topic/QA_MESSAGE/</span></div><div class="bd stack">
            ${[['Kuehne + Nagel', 'Are the BAF charges fixed for the full validity period?', '2 h ago', true],
               ['DSV', 'Can we propose an alternative routing via Tanger Med?', '5 h ago', true],
               ['GEODIS', 'Is the destination inland haulage mandatory for all lanes?', '1 d ago', false]]
              .map(([w, txt, at, ans]) => `<div style="border-bottom:1px solid var(--line-2);padding-bottom:.6rem">
                <div class="spread"><b>${esc(w)}</b><span class="muted small">${esc(at)}</span></div>
                <div>${esc(txt)}</div>
                ${ans ? `<div class="ev" style="margin-top:.4rem"><div class="k">Answer — A. Ruiz</div>
                  Yes — fixed for 90 days from award. Any extension is renegotiated per round.</div>`
                  : `<div class="row" style="margin-top:.4rem"><input placeholder="Answer…" style="flex:1;padding:.35rem .5rem;border:1px solid var(--line);border-radius:4px">
                     <button class="btn sm primary" data-action="toast" data-msg="Answer published to all participants.">Publish</button></div>`}</div>`).join('')}
            </div></div>
          <div class="stack"><div class="card"><div class="hd"><h3>Documents</h3></div><div class="bd stack">
            ${['Tender instructions.pdf', 'Rate card template.xlsx', 'Non-disclosure agreement.pdf', 'Sustainability annex.pdf']
              .map((f) => `<div class="spread"><span>${esc(f)}</span><button class="btn sm" data-action="toast" data-msg="Downloads use the jquery.fileDownload downloadId_<epoch> cookie handshake.">Download</button></div>`).join('')}
            <button class="btn sm" data-action="toast" data-msg="POST /attachments/addConversationAttachment/{tenderId}">+ Upload</button></div></div>
          <div class="card"><div class="hd"><h3>Announcements</h3></div><div class="bd stack">
            <div><b>Sustainability reporting requirement</b><div class="muted small">Published 5 h ago · /topic/NEW_ANNOUNCEMENT/</div></div>
            <div><b>Deadline extended to 30 Sep</b><div class="muted small">Published yesterday · /topic/CUSTOMER_DEADLINE_UPDATED/</div></div>
          </div></div></div></div>`,
      progress: () => `<div class="grid g2"><div class="card"><div class="hd"><h3>Submission progress</h3></div><div class="bd">
            ${t.participants.map((p) => chartProgress(p.name, p.quotesIn, t.laneCount)).join('')}</div></div>
          <div class="card"><div class="hd"><h3>Activity timeline</h3></div><div class="bd"><div class="timeline">
            ${D.ACTIVITY.slice(0, 7).map((a) => `<div class="ti"><div>${esc(a.text)}</div>
              <div class="muted small">${esc(a.who)} · ${esc(a.at)} · <code class="mono">${esc(a.topic)}</code></div></div>`).join('')}
          </div></div></div></div>`,
    };

    return `
      <div class="spread" style="margin-bottom:.6rem">
        <div><div class="crumbs"><a href="#tenders" data-nav>My events</a> / Control room</div>
          <h1 style="margin:.2rem 0 .3rem">${esc(t.title)}</h1>
          <div class="row">${badge(t.status)}<span class="mono small muted">${esc(t.id)}</span>
            <span class="muted small">Round ${t.round}/${t.totalRounds} · ${t.laneCount} lanes · ${esc(t.owner)}</span></div></div>
        <div class="row"><button class="btn" data-action="open-evidence" data-key="/controlroom/:activeTab/:id">ⓘ Evidence</button>
          <button class="btn" data-nav="#/tender/${t.id}/0">Edit tender</button></div></div>
      <div class="tabs">${TABS.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}"
        data-nav="#/controlroom/${k}/${t.id}">${esc(l)}</button>`).join('')}</div>
      ${bodies[tab] ? bodies[tab]() : bodies.overview()}`;
  };

  /* ============================================================ 7. SPOT BID == */
  S.spot = function (q) {
    const b = D.SPOT_BIDS.find((x) => x.id === q.id) || D.SPOT_BIDS[0];
    const best = b.bids[0];
    return `
      <div class="spread" style="margin-bottom:1rem">
        <div><div class="crumbs"><a href="#/spot-bids" data-nav>Spot bidding</a> / ${esc(b.id)}</div>
          <h1 style="margin:.2rem 0 .3rem">${esc(b.title)}</h1>
          <div class="row">${badge(b.status)}<span class="mono small muted">${esc(b.id)}</span>
            <span class="muted small">${esc(b.mode)} · ${b.participants.length} participants · ${esc(b.currency)}</span></div></div>
        <div class="row"><button class="btn" data-action="open-evidence" data-key="/spot/:id">ⓘ Evidence</button>
          <button class="btn" data-action="toast" data-msg="POST /spot/bidder/submit/batch — suppliers submit a batch of lane bids.">Submit bid</button></div></div>

      <div class="grid g3" style="margin-bottom:1rem">
        <div class="card"><div class="bd"><div class="kpi">
          <div class="l">Time remaining</div>
          <div class="countdown" data-countdown="${b.closesInSec}">--:--:--</div>
          <div class="s">${b.status === 'LIVE' ? 'auction is live' : 'auction closed'}</div></div></div></div>
        <div class="card"><div class="bd"><div class="kpi"><div class="l">Best bid</div>
          <div class="v" style="color:var(--accent)">${money(best.amount)}</div>
          <div class="s">${esc(best.supplier)} · ${esc(best.at)}</div></div></div></div>
        <div class="card"><div class="bd"><div class="kpi"><div class="l">Spread best → worst</div>
          <div class="v">${money(b.bids[b.bids.length - 1].amount - best.amount)}</div>
          <div class="s">${pct(((b.bids[b.bids.length - 1].amount - best.amount) / best.amount) * 100)} of best bid</div></div></div></div>
      </div>

      <div class="grid g2">
        <div class="card"><div class="hd"><h3>Bid ladder</h3><span class="grow"></span>
          <span class="chip mono">/topic/SPOT_BID_UPDATED/</span></div>
          <table class="tbl"><thead><tr><th>#</th><th>Supplier</th><th class="num">Amount</th><th class="num">Δ vs. previous</th><th>Time</th></tr></thead>
          <tbody>${b.bids.map((x) => `<tr><td><b>${x.rank}</b></td><td>${esc(x.supplier)}</td>
            <td class="num" style="${x.rank === 1 ? 'color:var(--accent);font-weight:600' : ''}">${money(x.amount)}</td>
            <td class="num" style="color:${x.delta < 0 ? 'var(--accent)' : 'inherit'}">${x.delta ? x.delta + '%' : '—'}</td>
            <td class="mono small">${esc(x.at)}</td></tr>`).join('')}</tbody></table>
          <div class="ft"><span class="muted small">Auction dynamics: each new bid must improve the current best by the configured decrement.</span></div></div>
        <div class="stack">
          <div class="card"><div class="hd"><h3>Participants &amp; scopes</h3></div><div class="bd">
            <div class="chiplist">${b.participants.map((p) => `<span class="chip">${esc(p)}</span>`).join('')}</div>
            <div class="muted small" style="margin-top:.6rem">Inviting a supplier emits <span class="mono">/topic/SPOT_PARTICIPANT_INVITED/</span>.</div></div></div>
          <div class="card"><div class="hd"><h3>Saving over time</h3></div><div class="bd">
            ${chartLine(b.bids.map((x) => x.amount).reverse(), b.bids.map((x) => x.at.slice(0, 5)).reverse())}</div></div>
          <div class="card"><div class="hd"><h3>Permissions</h3></div><div class="bd small">
            <div class="ev"><div class="k">Real gate</div><span class="mono">You have insufficient permissions to launch spot bids.</span>
              Spot-bid visibility is gated client-side by an email-domain regex —
              <span class="mono">/@.*(kwe)/.test(user.email)</span> — which is how the KWE tenant sees this section.</div></div></div>
        </div>
      </div>`;
  };

  /* =========================================================== 8. REPORTING = */
  S.reporting = function () {
    return `
      <div class="spread" style="margin-bottom:1rem">
        <div><h1>Reporting sandbox</h1>
          <p style="margin:0">Every widget below is dispatched by the same endpoint:
            <code class="mono">GET /reporting/json?provider=&lt;pkg&gt;/&lt;Class&gt;&amp;method=&lt;fn&gt;</code></p></div>
        <div class="row"><button class="btn" data-action="open-evidence" data-key="/reporting">ⓘ Evidence</button>
          <button class="btn primary" data-action="toast" data-msg="POST /reporting/excel?provider=… renders server-side with Apache POI.">Export XLSX</button></div></div>

      <div class="grid g3" style="margin-bottom:1rem">${D.REPORT_WIDGETS.map(widgetCard).join('')}</div>

      <div class="grid g2">
        <div class="card"><div class="hd"><h3>All report providers</h3>
          <span class="grow"></span><span class="chip mono">${D.REPORT_PROVIDERS.length} providers</span></div>
          <div class="bd"><div class="stack small">${D.REPORT_PROVIDERS.map((p) =>
            `<div class="spread"><code class="mono">${esc(p)}</code>
             <button class="btn sm" data-action="toast" data-msg="Every /reporting/** request answers 401 + 0 bytes anonymously.">Run</button></div>`).join('')}</div></div></div>
        <div class="stack">
          <div class="card"><div class="hd"><h3>Renderers behind the dispatcher</h3></div><div class="bd">
            <table class="tbl"><thead><tr><th>Endpoint</th><th>Renderer</th><th>Output</th></tr></thead><tbody>
              <tr><td class="mono">/reporting/json</td><td>Dispatcher</td><td>JSON</td></tr>
              <tr><td class="mono">/reporting/excel</td><td>Apache POI</td><td>XLSX</td></tr>
              <tr><td class="mono">/reporting/excel_birt</td><td>BIRT</td><td>XLSX</td></tr>
              <tr><td class="mono">/reporting/pdf</td><td>Dispatcher</td><td>PDF</td></tr>
              <tr><td class="mono">/letter/*</td><td>Thymeleaf</td><td>Letter / document</td></tr>
            </tbody></table></div></div>
          <div class="card"><div class="hd"><h3>Async exports</h3></div><div class="bd small">
            <p>Exports are asynchronous. The client starts a dump, then waits for a topic:</p>
            <div class="stack">
              <div><span class="mono">POST /&lt;x&gt;/dump</span> → materialise session-scoped artifact</div>
              <div><span class="mono">/topic/ASYNC_READY/{clientChosenId}</span> → parsed grid is ready</div>
              <div><span class="mono">/topic/REPORTING_LOCKED/*</span> → reporting is busy</div>
              <div><span class="mono">/topic/DOCUMENTATION_DOWNLOAD_COMPLETE/</span> → file ready</div>
              <div><span class="mono">GET /download/async/{id}</span> → stream the artifact</div>
            </div></div></div>
        </div>
      </div>`;
  };

  /* ================================================== 9. COMPANY SETTINGS == */
  S.companySettings = function (q) {
    const tab = q.tab || 'general';
    const tabs = [['general', 'General'], ['scopes', 'Scopes'], ['tiers', 'Tiers'], ['lane', 'Lane service types'],
      ['users', 'Users & access'], ['currency', 'Currencies'], ['gpm', 'GPM profiles'], ['templates', 'Templates']];
    const bodies = {
      general: () => `<div class="grid g2"><div class="card"><div class="hd"><h3>Company profile</h3></div><div class="bd">
          <div class="field"><label>Legal name</label><input value="${esc(D.COMPANY.name)}"></div>
          <div class="field"><label>VAT number</label><input value="${esc(D.COMPANY.vat)}"></div>
          <div class="field"><label>Registered address</label>
            <input value="${esc(D.COMPANY.address.street)}, ${esc(D.COMPANY.address.postalCode)} ${esc(D.COMPANY.address.city)}, ${esc(D.COMPANY.address.country)}"></div>
          <div class="field"><label>Invoice email</label><input value="${esc(D.COMPANY.invoiceEmail)}"></div>
          <button class="btn primary" data-action="toast" data-msg="POST /company/api/settings/save">Save changes</button></div></div>
        <div class="stack"><div class="card"><div class="hd"><h3>Default logo</h3></div><div class="bd">
            <div style="border:1px dashed var(--line);border-radius:6px;padding:1.5rem;text-align:center">
              <div style="font-weight:700;letter-spacing:1px;color:var(--rail)">ACME</div>
              <div class="muted small" style="margin-top:.3rem">${esc(D.COMPANY.logo)} · 240×64 PNG</div></div>
            <button class="btn sm" style="margin-top:.6rem" data-action="toast" data-msg="GET /company/defaultLogo/{companyId} serves the logo as base64.">Replace logo</button></div></div>
          <div class="card"><div class="hd"><h3>Spot bidding limits</h3></div><div class="bd">
            <div class="field"><label>Maximum value per spot bid</label><input value="€ 250,000"></div>
            <div class="field"><label>Allowed requesters</label><input value="Tender Manager, Tender Assistant"></div>
            <button class="btn sm" data-action="toast" data-msg="GET /company/spot/limits/get">Save limits</button></div></div></div></div>`,
      scopes: () => `<div class="spread" style="margin-bottom:.6rem"><div class="small muted">Scopes group lanes so a supplier can quote on part of a tender.</div>
          <button class="btn sm primary" data-action="toast" data-msg="POST /scopes/reset/{id} resets a scope.">+ Add scope</button></div>
        <table class="tbl"><thead><tr><th>Scope</th><th>Lanes</th><th>Type</th><th>Assignment</th><th class="num">Volume</th><th></th></tr></thead><tbody>
          ${[['Europe import — full container', 84, 'Mandatory', 'All participants', 12400],
             ['Europe import — LCL', 42, 'Optional', 'Selected participants', 3100],
             ['Transatlantic westbound', 61, 'Mandatory', 'All participants', 8900],
             ['Mediterranean feeder', 38, 'Optional', 'Selected participants', 2400],
             ['Reefer — temperature controlled', 27, 'Mandatory', 'Reefer-certified only', 1600]]
            .map(([n, l, t, a, v]) => `<tr><td><b>${esc(n)}</b></td><td>${l}</td><td>${esc(t)}</td>
              <td>${esc(a)}</td><td class="num">${int(v)}</td>
              <td class="right"><button class="btn sm" data-action="toast" data-msg="Scopes are published over /topic/SCOPES_UPDATED/.">Edit</button></td></tr>`).join('')}
        </tbody></table>`,
      tiers: () => `<div class="card"><div class="hd"><h3>Supplier tiers</h3>
          <span class="grow"></span><button class="btn sm" data-action="toast" data-msg="POST /company/tiers/import">Import</button></div>
        <table class="tbl"><thead><tr><th>Tier</th><th>Criteria</th><th class="num">Suppliers</th><th>Discount</th></tr></thead><tbody>
          ${[['Strategic', '> 5,000 FEU / year, ISO 14001', 6, '5.0%'], ['Preferred', '> 1,000 FEU / year', 14, '2.5%'],
             ['Approved', 'Qualified, active', 38, '0.0%'], ['Probation', 'Under review', 4, '—']]
            .map(([t, c, n, d]) => `<tr><td><b>${esc(t)}</b></td><td class="muted small">${esc(c)}</td>
              <td class="num">${n}</td><td>${esc(d)}</td></tr>`).join('')}</tbody></table></div>`,
      lane: () => `<div class="card"><div class="hd"><h3>Lane service types</h3>
          <span class="grow"></span><span class="chip mono">company.settings.tab.header.lane.service</span></div>
        <div class="bd"><div class="chiplist">${['Port to port', 'Door to door', 'Door to port', 'Port to door', 'CY to CY', 'CFS to CFS', 'Rail pre-carriage', 'Barge feeder']
          .map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
          <p class="small muted" style="margin-top:.6rem">Lane service types drive which charge groups are shown on the rate card.</p></div></div>`,
      users: () => `<div class="spread" style="margin-bottom:.6rem">
          <div class="small muted">Access is granted with <b>access codes</b>, not roles alone. The editable ACL is posted as an opaque blob.</div>
          <button class="btn sm primary" data-action="toast" data-msg="POST /company/updateAccess?companyId= — the ACL is company.aux.accessHelper.">+ Invite colleague</button></div>
        <div class="card"><table class="tbl"><thead><tr><th>User</th><th>Roles</th><th>Access codes</th><th>Status</th></tr></thead><tbody>
          ${[['A. Ruiz', 'Tender Manager', 8, 'ACTIVE'], ['J. Okafor', 'Tender Assistant', 2, 'ACTIVE'],
             ['M. Weber', 'Tender Manager', 7, 'ACTIVE'], ['P. Novak', 'Consultant', 1, 'INVITED']]
            .map(([u, r, n, s]) => `<tr><td><b>${esc(u)}</b></td><td>${esc(r)}</td>
              <td><span class="chip">${n} of ${D.ACCESS_CODES.length} codes</span></td><td>${badge(s)}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="card" style="margin-top:1rem"><div class="hd"><h3>Access codes</h3>
          <span class="grow"></span><span class="chip mono">hasAccess(code)</span></div>
          <table class="tbl"><thead><tr><th>Code</th><th>Meaning</th><th>Your access</th></tr></thead><tbody>
          ${D.ACCESS_CODES.map(([c, m]) => `<tr><td class="mono small">${esc(c)}</td><td>${esc(m)}</td>
            <td>${hasAccess(c) ? '<span style="color:var(--accent)">✓ granted</span>' : '<span class="muted">— not granted</span>'}</td></tr>`).join('')}
        </tbody></table></div>`,
      currency: () => `<div class="grid g2"><div class="card"><div class="hd"><h3>Currency presets</h3></div>
          <table class="tbl"><thead><tr><th>From</th><th>To</th><th class="num">Rate</th><th>Source</th></tr></thead><tbody>
            ${[['EUR', 'USD', 1.0842], ['EUR', 'GBP', 0.8412], ['EUR', 'CNY', 7.8210], ['EUR', 'SGD', 1.4615], ['USD', 'CNY', 7.2130]]
              .map(([f, t, r]) => `<tr><td class="mono">${f}</td><td class="mono">${t}</td><td class="num">${r}</td><td class="muted small">ECB daily</td></tr>`).join('')}
          </tbody></table>
          <div class="ft"><button class="btn sm" data-action="toast" data-msg="POST /company/conversions/import · /company/currency/presets/import">Import rates</button></div></div>
        <div class="card"><div class="hd"><h3>Surcharge indices</h3></div><div class="bd">
          ${chartBars([{ n: 'BAF (bunker)', v: 100, l: 'index 100' }, { n: 'Low sulphur', v: 128, l: '+28%' },
            { n: 'Peak season', v: 141, l: '+41%' }, { n: 'Canal transit', v: 119, l: '+19%' }])}
          <p class="small muted">Surcharges are stored per company and applied to the rate card at award time.</p></div></div></div>`,
      gpm: () => `<div class="spread" style="margin-bottom:.6rem"><div class="small muted">GPM = global price management: profiles, clients, costs, equipment and ports.</div>
          <div class="row"><button class="btn sm" data-action="toast" data-msg="POST /company/gpm/clients/import">Import clients</button>
            <button class="btn sm" data-action="toast" data-msg="POST /company/gpm/costs/import">Import costs</button></div></div>
        <div class="grid g4">
          ${[['Profiles', 24], ['Clients', 186], ['Costs', 1420], ['Equipment', 38]].map(([n, v]) =>
            `<div class="card"><div class="bd"><div class="kpi"><div class="v">${int(v)}</div><div class="l">${esc(n)}</div></div></div></div>`).join('')}
        </div>`,
      templates: () => `<div class="card"><div class="hd"><h3>Templates</h3></div><div class="bd stack">
          ${['Tender profile template', 'Rate card template', 'NDA template', 'Questionnaire template', 'Letter template', 'Scorecard template']
            .map((t) => `<div class="spread"><span>${esc(t)}</span>
              <div class="row"><button class="btn sm" data-action="toast" data-msg="Template downloads are auth-gated and were not recoverable anonymously.">Download</button>
                <button class="btn sm" data-action="toast" data-msg="Upload a replacement template.">Replace</button></div></div>`).join('')}
        </div></div>`,
    };
    return `
      <div class="spread" style="margin-bottom:1rem">
        <div><h1>Configure</h1><p style="margin:0">${esc(D.COMPANY.name)} · company settings and master data</p></div>
        <button class="btn" data-action="open-evidence" data-key="/companySettings">ⓘ Evidence</button></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-nav="#/companySettings/${k}">${esc(l)}</button>`).join('')}</div>
      ${bodies[tab] ? bodies[tab]() : bodies.general()}`;
  };

  /* ============================================================ 10. CALENDAR */
  S.calendar = function () {
    const month = 8 /* September (0-based) */, year = 2026;
    const first = new Date(year, month, 1);
    const startDow = (first.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const events = {};
    D.DEADLINES.forEach((d) => {
      const day = Number(d.date.slice(8, 10));
      (events[day] ??= []).push(d);
    });
    let cells = '';
    for (let i = 0; i < startDow; i++) cells += '<td style="background:#fafcfc"></td>';
    for (let d = 1; d <= days; d++) {
      const ev = events[d] || [];
      cells += `<td style="vertical-align:top;height:96px;border:1px solid var(--line-2);padding:.3rem">
        <div class="small ${ev.length ? 'mono' : 'muted'}" style="${ev.length ? 'font-weight:600;color:var(--accent)' : ''}">${d}</div>
        ${ev.map((e) => `<div style="background:var(--accent-soft);color:#0a6b4a;border-radius:3px;padding:.1rem .25rem;font-size:.68rem;margin-top:.15rem"
          title="${esc(e.tender)}">${esc(e.label)}</div>`).join('')}</td>`;
      if ((startDow + d) % 7 === 0) cells += '</tr><tr>';
    }
    return `<div class="spread" style="margin-bottom:1rem">
        <div><h1>Calendar</h1><p style="margin:0">September 2026 · ${D.DEADLINES.length} deadlines</p></div>
        <div class="row"><button class="btn" data-action="open-evidence" data-key="/calendar">ⓘ Evidence</button>
          <button class="btn" data-action="toast" data-msg="Calendar events come from GET /calendar/fetch.">Subscribe (iCal)</button></div></div>
      <div class="card"><div class="bd" style="padding:0"><table style="width:100%;border-collapse:collapse">
        <thead><tr>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) =>
          `<th style="padding:.5rem;font-size:.74rem;text-transform:uppercase;color:var(--ink-3);border-bottom:1px solid var(--line)">${d}</th>`).join('')}</tr></thead>
        <tbody><tr>${cells}</tr></tbody></table></div></div>
      <div class="card" style="margin-top:1rem"><div class="hd"><h3>Upcoming deadlines</h3>
        <span class="grow"></span><span class="chip mono">/topic/CUSTOMER_DEADLINE_UPDATED/</span></div>
        <table class="tbl"><thead><tr><th>Date</th><th>Time</th><th>Deadline</th><th>Tender</th><th>Type</th><th>Severity</th></tr></thead>
        <tbody>${D.DEADLINES.map((d) => `<tr><td class="mono small">${esc(d.date)}</td><td class="mono small">${esc(d.time)}</td>
          <td><b>${esc(d.label)}</b></td><td>${esc(d.tender)}</td><td class="small">${esc(d.kind)}</td><td>${badge(d.severity)}</td></tr>`).join('')}
        </tbody></table></div>`;
  };

  S.deadlines = S.calendar;

  /* ============================================================= 11. SUPPORT */
  S.support = function (q) {
    const tab = q.tab || 'tickets';
    const tabs = [['tickets', 'Tickets'], ['faq', 'F.A.Q.'], ['docs', 'Documentation'], ['releases', 'Release notes']];
    const bodies = {
      tickets: () => `<div class="spread" style="margin-bottom:.6rem">
          <div class="row"><span class="chip">${D.TICKETS.filter((t) => t.status !== 'RESOLVED').length} open</span>
            <span class="chip">avg first response 2 h 14 m</span><span class="chip">SLA 8 h</span></div>
          <button class="btn sm primary" data-action="toast" data-msg="POST /support/ticket — creates a ticket. Support desk is first-party, not Zendesk.">+ New ticket</button></div>
        <div class="card"><table class="tbl"><thead><tr><th>Ticket</th><th>Subject</th><th>Status</th><th>Priority</th><th>Owner</th><th>Updated</th></tr></thead>
          <tbody>${D.TICKETS.map((t) => `<tr class="click" data-action="toast" data-msg="Ticket detail: /support/ticket/{id} · comments via /support/ticket/comment.">
            <td class="mono">${esc(t.id)}</td><td><b>${esc(t.subject)}</b></td><td>${badge(t.status)}</td>
            <td>${badge(t.priority)}</td><td>${esc(t.owner)}</td><td class="muted small">${esc(t.updated)}</td></tr>`).join('')}
        </tbody></table>
        <div class="ft small muted">The Zendesk widget is present in the served HTML but <b>commented out</b> — this is a first-party desk
          (<span class="mono">/support/**</span>).</div></div>`,
      faq: () => `<div class="card"><div class="hd"><h3>Frequently asked questions</h3></div><div class="bd stack">
          ${D.FAQ.map(([q2, a]) => `<details style="border-bottom:1px solid var(--line-2);padding-bottom:.5rem">
            <summary style="cursor:pointer;font-weight:500;padding:.3rem 0">${esc(q2)}</summary>
            <p class="small" style="margin:.4rem 0 0">${esc(a)}</p></details>`).join('')}
        </div></div>`,
      docs: () => `<div class="grid g3">${D.DOCS.map((d) => `<div class="card"><div class="bd">
          <div style="font-size:1.6rem">📄</div><h4 style="margin:.3rem 0">${esc(d.name)}</h4>
          <div class="muted small">${esc(d.kind)} · ${esc(d.size)}</div>
          <button class="btn sm" style="margin-top:.5rem" data-action="toast" data-msg="Documentation packages are generated asynchronously (/topic/DOCUMENTATION_DOWNLOAD_COMPLETE/).">Open</button>
        </div></div>`).join('')}</div>`,
      releases: () => `<div class="card"><div class="hd"><h3>Release notes</h3></div><div class="bd"><div class="timeline">
          ${D.RELEASE_NOTES.map((r) => `<div class="ti"><div class="spread"><b>${esc(r.version)}</b>
            <span class="muted small">${esc(r.date)}</span></div>
            <ul style="margin:.3rem 0 0;padding-left:1.1rem">${r.items.map((i) => `<li class="small">${esc(i)}</li>`).join('')}</ul></div>`).join('')}
        </div></div></div>`,
    };
    return `<div class="spread" style="margin-bottom:1rem">
        <div><h1>Support</h1><p style="margin:0">Tickets, documentation, FAQ and release notes</p></div>
        <button class="btn" data-action="open-evidence" data-key="/support">ⓘ Evidence</button></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-nav="#/support/${k}">${esc(l)}</button>`).join('')}</div>
      ${bodies[tab] ? bodies[tab]() : bodies.tickets()}`;
  };

  /* ======================================================= 12. NOTIFICATION */
  S.notifications = function () {
    return `<div class="spread" style="margin-bottom:1rem">
        <div><h1>Notifications</h1><p style="margin:0">${D.NOTIFICATIONS.filter((n) => !n.read).length} unread ·
          every entry maps to a real STOMP channel</p></div>
        <div class="row"><button class="btn" data-action="mark-read">Mark all read</button>
          <button class="btn" data-action="open-evidence" data-key="/">ⓘ Evidence</button></div></div>
      <div class="card"><table class="tbl"><thead><tr><th style="width:8px"></th><th>Event</th><th>Channel</th><th>Source</th><th>When</th></tr></thead>
        <tbody>${D.NOTIFICATIONS.map((n) => `<tr style="${n.read ? '' : 'background:#f7fbfa'}">
          <td>${n.read ? '' : '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--accent)"></span>'}</td>
          <td>${esc(n.text)}</td><td><code class="mono small">${esc(n.topic)}</code></td>
          <td>${esc(n.who)}</td><td class="muted small nowrap">${esc(n.at)}</td></tr>`).join('')}
      </tbody></table>
      <div class="ft small muted">All 110 channels are subscriptions — the client never sends to the broker.</div></div>`;
  };

  S.chat = function () {
    return `<div class="grid g2"><div class="card" style="grid-column:span 2"><div class="hd"><h3>Chat</h3>
        <span class="grow"></span><span class="chip mono">/topic/CONVERSATION_CREATED/</span></div>
      <div class="bd" style="max-height:56vh;overflow-y:auto">
        ${[['Kuehne + Nagel', 'Can we get the volume forecast per lane for Q2?', '10:12'],
           ['A. Ruiz', 'Yes — uploading the forecast annex to the documentation section today.', '10:31'],
           ['DSV', 'Thanks. Also confirming our reefer capacity for Durban → Felixstowe.', '11:04'],
           ['A. Ruiz', 'Noted, please submit it through the rate card so it is captured against the lane.', '11:20']]
          .map(([w, t, at]) => `<div style="margin-bottom:.7rem"><div class="spread"><b class="small">${esc(w)}</b>
            <span class="muted small">${esc(at)}</span></div><div>${esc(t)}</div></div>`).join('')}
      </div>
      <div class="ft"><input placeholder="Message the tender participants…" style="flex:1;padding:.4rem .6rem;border:1px solid var(--line);border-radius:4px">
        <button class="btn primary sm" data-action="toast" data-msg="Conversations are per-tender; the client subscribes to /topic/QA_MESSAGE/.">Send</button></div>
    </div></div>`;
  };

  S.announcement = function () {
    return `<div class="grid g2">
      ${[['Sustainability reporting requirement for 2027 tenders', 'Corporate', '5 h ago', 'From 1 January 2027 all tenders above 500 FEU must include a CO₂ reporting annex. Suppliers will be asked to provide emission factors per lane in the questionnaire.'],
         ['New spot-bidding limits', 'Operations', 'yesterday', 'The maximum value per spot bid has been raised to €250,000 for Tender Manager role holders.'],
         ['Portal maintenance window', 'IT', '3 days ago', 'The portal will be unavailable on Sunday 04:00–06:00 CET for scheduled maintenance.']]
        .map(([t, w, at, b]) => `<div class="card"><div class="hd"><h3>${esc(t)}</h3></div><div class="bd">
          <p>${esc(b)}</p><div class="muted small">${esc(w)} · ${esc(at)}</div></div></div>`).join('')}</div>`;
  };

  /* ============================================================= 13. PROFILE */
  S.profile = function () {
    const u = window.OT_STATE.user;
    return `<div class="spread" style="margin-bottom:1rem">
        <div><h1>Profile</h1><p style="margin:0">${esc(u.userName)} · ${esc(u.email)}</p></div>
        <button class="btn" data-action="open-evidence" data-key="/login">ⓘ Evidence</button></div>
      <div class="grid g2"><div class="card"><div class="hd"><h3>Account</h3></div><div class="bd">
          <div class="field"><label>Name</label><input value="${esc(u.userName)}"></div>
          <div class="field"><label>Email</label><input value="${esc(u.email)}"></div>
          <div class="field"><label>Company</label><input value="${esc(u.company || '—')}" readonly></div>
          <div class="field"><label>Language</label><select>
            ${['English', 'Deutsch', 'Français', 'Español', 'Italiano', 'Português (PT)', 'Nederlands', 'Polski', 'Türkçe', 'Čeština', 'Slovenčina', 'Українська', 'Русский', '日本語', '한국어', '中文', 'Bahasa Indonesia', 'ไทย']
              .map((l) => `<option>${l}</option>`).join('')}</select>
            <div class="muted small" style="margin-top:.2rem">16 languages are advertised; Thai exists in the database but is not offered.</div></div>
          <button class="btn primary" data-action="toast" data-msg="GET /users/avatar · POST /users/changePassword">Save</button></div></div>
        <div class="stack">
          <div class="card"><div class="hd"><h3>Roles &amp; access</h3></div><div class="bd">
            <dl class="kv"><dt>Roles</dt><dd>${u.roles.map((r) => `<span class="chip">${esc(r)}</span>`).join(' ') || '<span class="muted">none</span>'}</dd>
              <dt>Staff flag</dt><dd>${u.support ? '<b style="color:var(--danger)">user.support = true</b> (client-side superpower flag)' : '<span class="muted">false</span>'}</dd>
              <dt>Access codes</dt><dd>${u.access.length ? u.access.map((c) => `<span class="chip mono">${esc(c)}</span>`).join(' ') : '<span class="muted">none</span>'}</dd></dl>
            <div class="ev" style="margin-top:.6rem"><div class="k">Why this matters</div>
              Route guards are authentication-only in this product — the screens are authorised inside controllers after the view loads,
              so the server matcher on each endpoint is the real control.</div></div></div>
          <div class="card"><div class="hd"><h3>Security</h3></div><div class="bd stack small">
            <div class="spread"><span>Multi-factor authentication</span>
              <span>${window.OT_STATE.mfa ? '<span class="badge b-OPEN">enabled</span>' : '<span class="muted">disabled</span>'}</span></div>
            <div class="spread"><span>Remember me</span><span class="muted mono">remember-me-angular</span></div>
            <div class="spread"><span>Session idle timeout</span><span class="muted mono">1740 s</span></div>
            <button class="btn sm" data-action="toggle-mfa">${window.OT_STATE.mfa ? 'Disable' : 'Enable'} MFA</button></div></div>
        </div></div>`;
  };

  /* ================================================ 14. PUBLIC CARRIER FORM = */
  S.txrequest = function (q) {
    return `<div class="content" style="max-width:820px;margin:0 auto">
      <div class="card"><div class="hd"><h3>Carrier rate request</h3>
        <span class="grow"></span><span class="chip mono">POST /tx/carriers/request</span></div>
        <div class="bd">
          <div class="ev" style="margin-bottom:1rem"><div class="k">This screen is genuinely public</div>
            <span class="mono">/tx/**</span> is CSRF-exempt and auth-free — it reaches its handler with no token and no session.</div>
          <div class="grid g2">
            <div class="field"><label>Request ID</label><input value="${esc(q.requestId || 'REQ-88213')}" readonly></div>
            <div class="field"><label>Tender reference</label><input value="${esc(q.txId || 'TND-2026-104')}" readonly></div>
            <div class="field"><label>Carrier name</label><input placeholder="Your company"></div>
            <div class="field"><label>Contact email</label><input placeholder="rates@carrier.example"></div>
          </div>
          <hr>
          <table class="tbl"><thead><tr><th>Lane</th><th>Equipment</th><th class="num">Volume</th><th class="num">Your rate (EUR)</th><th class="num">Transit (days)</th></tr></thead>
            <tbody>${D.TENDERS[0].lanes.slice(0, 5).map((l) => `<tr>
              <td>${lanePort(l.origin)} → ${lanePort(l.destination)}</td><td class="mono">${esc(l.equipment)}</td>
              <td class="num">${int(l.volume)}</td>
              <td class="num"><input style="width:110px;text-align:right;padding:.25rem .4rem;border:1px solid var(--line);border-radius:4px" placeholder="0.00"></td>
              <td class="num"><input style="width:70px;text-align:right;padding:.25rem .4rem;border:1px solid var(--line);border-radius:4px" placeholder="0"></td></tr>`).join('')}
          </tbody></table>
          <div class="row" style="margin-top:1rem"><button class="btn primary" data-action="toast" data-msg="Rate request submitted. The carrier will be notified by email.">Submit rate request</button></div>
        </div></div></div>`;
  };

  /* ==================================================== 15. PUBLIC ONBOARD = */
  S.onboard = function () {
    return `<div class="content" style="max-width:900px;margin:0 auto">
      <div class="spread" style="margin-bottom:1rem"><div><h1>Supplier registration</h1>
        <p style="margin:0">Register your company to receive tender invitations.</p></div>
        <span class="chip mono">POST /onboard/request</span></div>
      <div class="card"><div class="bd">
        <div class="ev" style="margin-bottom:1rem"><div class="k">This screen is genuinely public</div>
          The whole onboarding form is inside the anonymous <span class="mono">/app/components/onboard/**</span> mount, which is why its
          complete schema is publicly readable — and <span class="mono">POST /onboard/request</span> performs no visible server-side validation.</div>
        <h3>Company</h3>
        <div class="grid g2">
          <div class="field"><label>Company name</label><input></div>
          <div class="field"><label>VAT / Tax number</label><input></div>
          <div class="field"><label>Purchase order reference</label><input></div>
          <div class="field"><label>Invoice email</label><input></div>
          <div class="field" style="grid-column:span 2"><label>Registered address</label>
            <input placeholder="Street"><div class="row" style="margin-top:.4rem">
              <input placeholder="City" style="flex:2"><input placeholder="Postal code" style="flex:1">
              <select style="flex:1.4">${D.PORTS.map((p) => p.country).filter((c, i, a) => a.indexOf(c) === i).sort()
                .map((c) => `<option>${c}</option>`).join('')}</select></div></div>
        </div>
        <h3 style="margin-top:1rem">Requested by</h3>
        <div class="grid g3">
          <div class="field"><label>Full name</label><input></div>
          <div class="field"><label>Email</label><input></div>
          <div class="field"><label>Phone</label><input></div>
        </div>
        <h3 style="margin-top:1rem">Access</h3>
        <div class="grid g2">
          <div class="field"><label>Currency</label><select><option>EUR</option><option>USD</option><option>GBP</option></select></div>
          <div class="field"><label>Access start date</label><input type="date" value="2026-10-01"></div>
          <div class="field"><label>Allowed email domains</label><input placeholder="yourcompany.example"></div>
          <div class="field"><label>Modules requested</label>
            <div class="chiplist" style="margin-top:.3rem">
              <label class="chip"><input type="checkbox" checked> canTender</label>
              <label class="chip"><input type="checkbox"> canSpot</label>
              <label class="chip"><input type="checkbox"> itm</label></div></div>
        </div>
        <div class="row" style="margin-top:1rem">
          <button class="btn primary" data-action="toast" data-msg="Registration submitted. We will review it and contact you within two business days.">Submit registration</button></div>
      </div></div>
      <div class="card" style="margin-top:1rem"><div class="hd"><h3>Country reference data</h3>
        <span class="grow"></span><span class="chip mono">GET /onboard/countries · 252 records</span></div>
        <table class="tbl"><thead><tr><th>Code</th><th>Country</th><th>Region</th><th class="num">Latitude</th><th class="num">Longitude</th></tr></thead>
          <tbody>${[['ES', 'Spain', 'EUROPEAN_UNION', 40.463667, -3.74922], ['NL', 'Netherlands', 'EUROPEAN_UNION', 52.132633, 5.291266],
            ['DE', 'Germany', 'EUROPEAN_UNION', 51.165691, 10.451526], ['SG', 'Singapore', 'ASIA', 1.352083, 103.819836],
            ['CN', 'China', 'ASIA', 35.86166, 104.195397], ['US', 'United States', 'NORTH_AMERICA', 37.09024, -95.712891]]
            .map(([c, n, r, la, lo]) => `<tr><td class="mono">${c}</td><td>${esc(n)}</td><td class="small">${esc(r)}</td>
              <td class="num mono small">${la}</td><td class="num mono small">${lo}</td></tr>`).join('')}
        </tbody></table></div></div>`;
  };

  /* ========================================================== 16. GDPR ===== */
  S.gdpr = function () {
    return `<div class="content" style="max-width:820px;margin:0 auto">
      <h1>Your data &amp; privacy</h1>
      <div class="grid g2">
        <div class="card"><div class="hd"><h3>Export your personal data</h3></div><div class="bd">
          <p>Request a machine-readable copy of the personal data held about you.</p>
          <div class="field"><label>Access token</label><input placeholder="Paste the token from your email"></div>
          <button class="btn primary" data-action="toast" data-msg="GET /gdpr/fetch?token= · an unknown token returns the custom status 420 Method Failure.">Fetch my data</button>
          <div class="ev" style="margin-top:.7rem"><div class="k">Real behaviour</div>
            An unknown token returns <span class="mono">420 Method Failure</span>. The error body is content-negotiated:
            <span class="mono">Accept: application/json</span> leaks an internal class name, <span class="mono">*/*</span> returns an HTML 500 page.</div>
        </div></div>
        <div class="card"><div class="hd"><h3>Request erasure</h3></div><div class="bd">
          <p>Ask for your personal data to be erased. Some records must be retained for statutory reasons.</p>
          <label class="row"><input type="checkbox"> I understand this is irreversible</label>
          <button class="btn" style="margin-top:.6rem" data-action="toast" data-msg="POST /gdpr/erasure — anonymous but POST-only.">Request erasure</button>
        </div></div>
      </div>
      <div class="card" style="margin-top:1rem"><div class="hd"><h3>What we hold</h3></div><div class="bd">
        <table class="tbl"><thead><tr><th>Category</th><th>Purpose</th><th>Retention</th></tr></thead><tbody>
          <tr><td>Account &amp; contact details</td><td>Authentication, tender notifications</td><td>Contract term + 6 months</td></tr>
          <tr><td>Tender activity</td><td>Audit, dispute resolution</td><td>7 years</td></tr>
          <tr><td>Quotations &amp; awards</td><td>Contract performance</td><td>7 years</td></tr>
          <tr><td>Client error logs</td><td>Diagnostics</td><td>90 days</td></tr>
        </tbody></table></div></div></div>`;
  };

  /* ======================================================= 17. SURFACE MAP == */
  S.apimap = function () {
    const st = D.STATS;
    return `<div class="spread" style="margin-bottom:1rem">
        <div><h1>Surface map</h1>
          <p style="margin:0">The endpoints, real-time channels and reference data this environment is built on.</p></div>
        <button class="btn" data-action="open-evidence" data-key="/">ⓘ Evidence</button></div>

      <div class="grid g4" style="margin-bottom:1rem">
        ${[['API paths', st.apiPaths], ['Namespaces', st.namespaces], ['Screens (routes)', st.routes],
           ['STOMP topics', st.topics], ['UI templates', st.templates], ['Unminified source files', st.sources],
           ['Translation keys', st.i18nKeys], ['Languages', st.languages], ['Paths not 401', st.anonymousPaths],
           ['Public data', st.publicData], ['Findings', st.findings], ['Angles completed', st.angles + ' / 75']]
          .map(([l, v]) => `<div class="card"><div class="bd"><div class="kpi"><div class="v">${esc(v)}</div>
            <div class="l">${esc(l)}</div></div></div></div>`).join('')}
      </div>

      <div class="grid g2">
        <div class="card"><div class="hd"><h3>The anonymous surface</h3>
          <span class="grow"></span><span class="chip mono">401 = auth-gated</span></div>
          <table class="tbl"><thead><tr><th>Path</th><th>What it returns</th></tr></thead><tbody>
            ${[['/users/isLogined', '200 · false'], ['/session/keepAlive', '200 · false'],
               ['/onboard/countries', '200 · 252 country records'],
               ['/langs/list', '200 · 16 languages'], ['/langs/get', '200 · language display map'],
               ['/langs/load?lang=en', '200 · 5,406 translation keys'],
               ['/langs/lookup/db?sought=', '200 · 40,145 rows / 5.65 MB'],
               ['/tender/canDecline?declineToken=', '200 · {"canDecline":"false"}'],
               ['/sandbox/export/test', '200 · a generated XLSX (Apache POI)'],
               ['/tendersocket/info', '200 · SockJS contract, origins ["*:*"]'],
               ['/app/components/**/*.js', '200 · unminified application source']]
              .map(([p, w]) => `<tr><td class="mono small">${esc(p)}</td><td class="small">${esc(w)}</td></tr>`).join('')}
          </tbody></table></div>
        <div class="stack">
          <div class="card"><div class="hd"><h3>Evidence classes used</h3></div><div class="bd">
            <table class="tbl"><thead><tr><th>Class</th><th>Meaning</th></tr></thead><tbody>
              <tr><td><span class="badge b-OPEN">validated</span></td><td>Observed over plain HTTP</td></tr>
              <tr><td><span class="badge b-SIMULATION">source</span></td><td>Read from the unminified deployed code</td></tr>
              <tr><td><span class="badge b-DRAFT">callsite</span></td><td>Recovered from the shipped bundle</td></tr>
              <tr><td><span class="badge b-ARCHIVED">inferred</span></td><td>Reasoned from the above</td></tr>
            </tbody></table></div></div>
        </div>
      </div>

      <div class="card" style="margin-top:1rem"><div class="hd"><h3>Namespaces</h3>
        <span class="grow"></span><span class="chip mono">the largest is /controlroom with 255 paths</span></div>
        <div class="bd"><div class="chiplist">
          ${[['controlroom', 255], ['tender', 143], ['topic (STOMP)', 110], ['company', 105], ['spot', 85],
             ['reporting', 77], ['support', 65], ['rc', 51], ['scopes', 30], ['pv', 26], ['rm (not deployed)', 26],
             ['ps', 22], ['conversations', 21], ['users', 21], ['targetprice', 19], ['nomination', 18], ['langs', 15],
             ['mview', 15], ['baseline', 12], ['notificationConfig', 11], ['questionnaire', 11], ['datasource', 10],
             ['sandbox', 10], ['xrates', 10], ['bi', 9], ['notification', 9], ['ports', 9], ['wh', 8], ['ctms', 7],
             ['gpm', 7], ['attachments', 6], ['docs', 6], ['role', 6], ['calendar', 5], ['faq', 5], ['onboard', 5]]
            .map(([n, c]) => `<span class="chip"><b>${esc(n)}</b> <span class="muted">${c}</span></span>`).join('')}
        </div></div></div>`;
  };

  /* ================================================ 18. PRICING / OPS DASH == */
  S.pricing = function () {
    return `<div class="spread" style="margin-bottom:1rem"><div><h1>Pricing &amp; licence</h1>
        <p style="margin:0">Visible only to the four hard-coded Ocean Tender addresses.</p></div></div>
      <div class="grid g3">
        ${[['Tender', 'Per tender, per year', '€ 24,000', ['Unlimited rounds', 'Unlimited suppliers', 'Rate-card import/export', 'Email support']],
           ['Enterprise', 'Annual licence', '€ 96,000', ['Unlimited tenders', 'SSO / SAML', 'API & integration', 'Named support', 'Onboarding programme']],
           ['Spot', 'Pay per use', '€ 400', ['Per spot bid', 'Live bid ladder', 'Unlimited participants']]]
          .map(([n, s, p, f]) => `<div class="card"><div class="hd"><h3>${esc(n)}</h3></div><div class="bd">
            <div class="kpi"><div class="v">${esc(p)}</div><div class="l">${esc(s)}</div></div>
            <ul class="small" style="margin:.6rem 0 0;padding-left:1.1rem">${f.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`).join('')}
      </div>
      <div class="card" style="margin-top:1rem"><div class="hd"><h3>Contract status</h3></div><div class="bd">
        <dl class="kv"><dt>Unlimited usage contract</dt><dd><span class="badge b-HIGH">expired</span>
          <span class="muted small">— custom status <span class="mono">419</span>; contact sales@oceantender.com</span></dd>
          <dt>Billable tenders this year</dt><dd>12</dd><dt>Spot bids this year</dt><dd>41</dd></dl></div></div>`;
  };

  S.operational = function () {
    return `<div class="spread" style="margin-bottom:1rem"><div><h1>Operational dashboard</h1>
        <p style="margin:0">Visible to support staff (<span class="mono">user.support</span>) and the Ocean Tender role.</p></div></div>
      <div class="grid g4" style="margin-bottom:1rem">
        ${[['Open tickets', 18], ['Tenders in flight', 412], ['Companies', 186], ['Suppliers', 3120]]
          .map(([l, v]) => `<div class="card"><div class="bd"><div class="kpi"><div class="v">${int(v)}</div><div class="l">${esc(l)}</div></div></div></div>`).join('')}
      </div>
      <div class="grid g2">
        <div class="card"><div class="hd"><h3>Tenders by status (all companies)</h3></div><div class="bd">
          ${chartBars([{ n: 'Draft', v: 96, l: '96' }, { n: 'Open', v: 184, l: '184' }, { n: 'Simulation', v: 41, l: '41' },
            { n: 'Awarded', v: 63, l: '63' }, { n: 'Archived', v: 128, l: '128' }])}</div></div>
        <div class="card"><div class="hd"><h3>Platform health</h3></div><div class="bd">
          ${chartProgress('API availability (30 d)', 9997, 10000)}
          ${chartProgress('Median report render', 340, 1000)}
          ${chartProgress('Message broker lag', 12, 1000)}
          <div class="small muted">The real stack also exposes Zabbix (<span class="mono">zabbix-neo</span>) on the same host as the app.</div></div></div>
      </div>`;
  };

  /* -------------------------------------------------- 19. rate card standalone */
  S.ratecard = function (q) {
    const t = D.TENDERS.find((x) => x.id === q.id) || D.TENDERS[0];
    return `<div class="crumbs"><a href="#tenders" data-nav>My events</a> / <a href="#/controlroom/ratecard/${t.id}" data-nav>${esc(t.title)}</a> / Rate card</div>
      ${rateCardScreen(t, Number(q.round || 1), false)}`;
  };

  S.notFound = function (q) {
    return `<div class="content" style="max-width:640px;margin:3rem auto;text-align:center">
      <h1>Route not reconstructed</h1>
      <p>The real application has this route in its route table, but the template behind it is authentication-gated,
         so there is no markup to rebuild from.</p>
      <p class="mono small">requested: ${esc(q.raw || '')}</p>
      <a class="btn primary" href="#/" data-nav>Back to home</a></div>`;
  };

  /* helpers reused by the shell screens defined in app.js */
  window.OT_HELPERS = { esc, money, int, pct, dt, badge, flagTxt, lanePort, chartBars, widgetCard, rateCardScreen, portByName };

  window.OT_SCREENS = S;
})();
