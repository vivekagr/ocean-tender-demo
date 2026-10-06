/**
 * The remaining product modules: Control Tower, Schedules, Rates & contracts,
 * Network, Contacts, Templates, Mass operations, Reports, Admin, Settings,
 * CO₂, 3D container view, Portside Lab, import history and interface messages.
 */
import {
  h, mount, icon, btn, chip, table, card, kpi, kv, tabs, toast, openDrawer, closeDrawer, alert,
  field, select, toggle, timeline, bars, sparkline, progress, fmtDate, fmtDateTime, fmtNum, fmtMoney,
  fmtWeight, fmtCo2, randInt, titleCase, download, downloadCsv, ago, rel, dot,
} from '../ui.js';
import {
  SHIPMENTS, OCEAN_RATES, TRANSPORT_CONTRACTS, MERCHANT_HAULAGE, ORGANIZATIONS, USERS, CONTACTS,
  TEMPLATES, ASYNC_OPERATIONS, REPORTS, REPORT_VERSIONS, CONTROL_TOWER_WIDGETS, CURRENT_USER,
  searchSchedules, ALL_PORTS, ALL_CARRIERS, NOTIFICATIONS,
} from '../data.js';
import {
  INCOTERMS, CONTAINER_TYPES, ENTITLEMENTS, ROLES, COMPARE_ATTRS, CARRIERS, CURRENCIES,
  TRACKING_PROVIDERS, DOCUMENT_TYPES, CHARGE_CODES, SAVED_VIEWS, PERMISSIONS, TASK_TYPES,
  DEVIATION_TYPES,
} from '../enums.js';
import { state, can } from '../app.js';

const pageHead = (title, sub, actions) => h('div', { class:'page-head' },
  h('div', null, h('div', { class:'page-title' }, title), h('div', { class:'page-sub' }, sub)),
  h('div', { class:'page-actions' }, actions));

const rows = () => SHIPMENTS;
const sum = (arr, f) => arr.reduce((n, x) => n + (f(x) || 0), 0);

/* ============================== CONTROL TOWER ========================== */
export function controlTower() {
  const s = rows();
  const ongoing = s.filter(x => x.dealState === 'open' && x.bookingState !== 'draft');
  const delayed = s.filter(x => x.currentTrackingStatus === 'delayed');
  const pendingTasks = s.reduce((n, x) => n + x.tasks.filter(t => t.state === 'pending').length, 0);
  const deviations = s.reduce((n, x) => n + x.deviations.length, 0);
  const byStatus = ['not_started','in_transit','at_pod','delivered','completed','delayed'].map(k => s.filter(x => x.currentTrackingStatus === k).length);
  const byWeek = Array.from({ length: 10 }, (_, i) => {
    const start = Date.now() + (i - 4) * 7 * 86400000, end = start + 7 * 86400000;
    return s.filter(x => { const d = new Date(x.departure).getTime(); return d >= start && d < end; }).length;
  });
  const carrierShare = ALL_CARRIERS.map(c => ({ c, n:s.filter(x => x.carrierScac === c.scac).length })).sort((a,b)=>b.n-a.n);
  const co2Trend = [0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
    const rows2 = s.filter((_, k) => k % 12 === i);
    return rows2.length ? Math.round(sum(rows2, x => x.co2GPerTeu) / rows2.length) : 0;
  });
  const widgetBody = (w) => {
    if (w.type === 'kpi') {
      const val = {
        totalOngoingShipments: ongoing.length,
        lateAtArrival: delayed.length,
        lateAtDeparture: s.filter(x => x.deviations.some(d => d.code === 'vesselDepartureDelay')).length,
        myPendingTasks: pendingTasks,
        documentsUploaded: sum(s, x => x.documents.length),
        newShipments: s.filter(x => Date.now() - new Date(x.createdAt).getTime() < 7 * 86400000).length,
      }[w.metric] ?? 0;
      const isLate = w.metric === 'lateAtArrival' || w.metric === 'lateAtDeparture';
      return h('div', null,
        h('div', { style:{ fontSize:'30px', fontWeight:650, lineHeight:'1.1', fontVariantNumeric:'tabular-nums' } }, fmtNum(val)),
        h('div', { class:'tiny muted', style:{ marginTop:'2px' } },
          isLate ? (val ? 'past booked date' : 'all on schedule') : (w.metric === 'documentsUploaded' ? 'documents' : 'shipments')));
    }
    if (w.type === 'bars') {
      if (w.metric === 'carrierShare') return h('div', { class:'stack' }, carrierShare.slice(0, 6).map(({ c, n }) =>
        h('div', { class:'row', style:{ gap:'8px' } }, h('span', { style:{ width:'96px', fontSize:'12px' } }, c.name),
          h('div', { style:{ flex:1 } }, progress((n / Math.max(1, carrierShare[0].n)) * 100)), h('b', { class:'tiny' }, String(n)))));
      if (w.metric === 'deviationMix') {
        const all = s.flatMap(x => x.deviations);
        const mix = [...new Set(all.map(d => d.label))].slice(0, 6).map(l => ({ l, n: all.filter(d => d.label === l).length }));
        return h('div', { class:'stack' }, mix.map(m => h('div', { class:'row', style:{ gap:'8px' } },
          h('span', { style:{ width:'190px', fontSize:'12px' } }, m.l),
          h('div', { style:{ flex:1 } }, progress((m.n / Math.max(1, mix[0].n)) * 100, 'orange-600')),
          h('b', { class:'tiny' }, String(m.n)))));
      }
      const labels = ['not started','in transit','at POD','delivered','completed','delayed'];
      if (w.metric === 'byStatus') return h('div', null,
        bars(byStatus, labels),
        h('div', { class:'row tiny muted', style:{ justifyContent:'space-between', marginTop:'4px' } }, labels.map(x => h('span', null, x))));
      return h('div', null, bars(byWeek), h('div', { class:'tiny muted', style:{ marginTop:'4px' } }, 'Departures per week (4 back → 5 forward)'));
    }
    if (w.type === 'spark') return sparkline(w.metric === 'otp' ? byWeek.map(x => 100 - x * 3) : co2Trend);
    return null;
  };

  return h('div', null,
    pageHead('Control Tower', `${widgets.length} widgets · live operational picture across ${s.length} shipments`, [
      btn('Add widget', { size:'sm', iconName:'plus', onClick:() => toast('Widget picker (mock)', 'good') }),
      btn('Reset layout', { size:'sm', onClick:() => toast('Layout reset', 'good') }),
    ]),
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Ongoing shipments', fmtNum(ongoing.length), '+3 vs last week', 'up'),
      kpi('Late at arrival', fmtNum(delayed.length), delayed.length ? 'needs attention' : 'all on time', delayed.length ? 'down' : 'up'),
      kpi('Pending tasks (total)', fmtNum(pendingTasks)),
      kpi('Open deviations', fmtNum(deviations)),
      kpi('Avg CO₂ / TEU', fmtCo2(Math.round(sum(s, x => x.co2GPerTeu) / s.length))),
      kpi('On-time performance', '87.4%', '+1.2 pts', 'up')),
    h('div', { class:'grid cols-4' }, widgets.map(w => h('div', { style:{ gridColumn: w.size === 'md' ? 'span 2' : 'span 1' } },
      card(w.title, h('div', { class:'panel-body' }, widgetBody(w)))))),
  );
}
const widgets = CONTROL_TOWER_WIDGETS;

/* ================================ SCHEDULES ============================ */
export function schedules() {
  const st = state.schedules || (state.schedules = {
    pol:'CNSHA', pod:'NLRTM', containers:2, type:'DRY', size:'40HC', date:new Date(Date.now()+14*86400000).toISOString().slice(0,10),
    directOnly:false, maxTransit:'', results:null, sort:'cost', compare:new Set(),
  });
  if (!st.results) st.results = searchSchedules({ pol:st.pol, pod:st.pod, containers:st.containers });
  const rerender = () => { st.results = searchSchedules({ pol:st.pol, pod:st.pod, containers:st.containers }); import('../app.js').then(m => m.navigate(m.parseHash())); };
  let results = st.results.filter(r => !st.directOnly || r.direct);
  if (st.maxTransit) results = results.filter(r => r.transitTimeInDays <= +st.maxTransit);
  results = results.slice().sort((a, b) => st.sort === 'co2' ? a.totalCo2GPerTeu - b.totalCo2GPerTeu : st.sort === 'transit' ? a.transitTimeInDays - b.transitTimeInDays : a.cost - b.cost);

  const cols = [
    { key:'carrier', label:'Carrier', render:r => h('span', { class:'row' }, h('i', { style:{ width:'8px',height:'8px',borderRadius:'50%',background:r.color,display:'inline-block' } }), r.carrier) },
    { key:'serviceName', label:'Service' },
    { key:'routing', label:'Routing', render:r => h('span', { class:'mono' }, `${r.pol} → ${r.transshipments.length ? r.transshipments.join(' → ') + ' → ' : ''}${r.pod}`) },
    { key:'direct', label:'Direct', render:r => r.direct ? chip('direct', 'green') : chip(`${r.transshipments.length} TS`, 'amber') },
    { key:'vessel', label:'Vessel / voyage', render:r => `${r.firstVesselName} ${r.firstVoyageNumber}` },
    { key:'etd', label:'ETD', render:r => fmtDate(r.etd) },
    { key:'eta', label:'ETA', render:r => fmtDate(r.eta) },
    { key:'transitTimeInDays', label:'Transit', num:true, render:r => `${r.transitTimeInDays} d` },
    { key:'totalCo2GPerTeu', label:'CO₂/TEU', num:true, render:r => fmtCo2(r.totalCo2GPerTeu) },
    { key:'avgDelayEtaAtaDays', label:'Avg delay', num:true, render:r => h('span', r.avgDelayEtaAtaDays > 1.5 ? { style:{ color:'var(--red-600)' } } : null, `${r.avgDelayEtaAtaDays > 0 ? '+' : ''}${r.avgDelayEtaAtaDays} d`) },
    { key:'allocations', label:'Allocation', render:r => r.allocations.overflow ? chip('overflow', 'red') : chip(`${r.allocations.remaining} left`, 'green') },
    { key:'source', label:'Source', render:r => chip(titleCase(r.source), r.source === 'contract' ? 'violet' : r.source === 'routing_algo' ? 'teal' : 'grey') },
    { key:'cost', label:'Cost', num:true, render:r => fmtMoney(r.cost, r.currency) },
    { key:'selected', label:'', render:r => btn('Select', { size:'sm', kind:'primary', onClick:() => toast(`Route selected — vessel ${r.firstVesselName} (mock)`, 'good') }) },
  ];

  return h('div', null,
    pageHead('Schedules', 'Search vessel schedules and rank routing options by cost, transit, CO₂ and allocation', [
      btn('Save search', { size:'sm', onClick:() => toast('Saved search (mock)', 'good') }),
    ]),
    card(null, h('div', { class:'panel-body' }, h('div', { class:'filters' },
      field('POL', select(ALL_PORTS.map(p => ({ value:p.loc, label:`${p.loc} — ${p.name}` })), st.pol, v => { st.pol = v; st.results = null; rerender(); })),
      field('POD', select(ALL_PORTS.map(p => ({ value:p.loc, label:`${p.loc} — ${p.name}` })), st.pod, v => { st.pod = v; st.results = null; rerender(); })),
      field('Containers', h('input', { type:'number', min:'1', value:st.containers, onInput:e => { st.containers = +e.target.value || 1; } })),
      field('Type', select(CONTAINER_TYPES.map(t => ({ value:t.code, label:t.label })), st.type, v => { st.type = v; })),
      field('Size', select(['20','40','40HC','45HC'].map(x => ({ value:x, label:x })), st.size, v => { st.size = v; })),
      field('Earliest ETD', h('input', { type:'date', value:st.date, onInput:e => { st.date = e.target.value; } })),
      field('Max transit', h('input', { type:'number', placeholder:'days', value:st.maxTransit, onInput:e => { st.maxTransit = e.target.value; rerender(); } })),
      field('Sort by', select([{value:'cost',label:'Cost'},{value:'transit',label:'Transit time'},{value:'co2',label:'CO₂'}], st.sort, v => { st.sort = v; rerender(); })),
      h('div', { class:'field' }, h('label', null,' '), h('div', { class:'row' }, toggle(st.directOnly, v => { st.directOnly = v; rerender(); }, 'Direct only'), btn('Search', { kind:'primary', iconName:'search', onClick:rerender }))),
    ))),
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Options found', fmtNum(results.length)),
      kpi('Cheapest', results.length ? fmtMoney(results[0].cost) : '—'),
      kpi('Fastest', results.length ? `${Math.min(...results.map(r=>r.transitTimeInDays))} d` : '—'),
      kpi('Lowest CO₂', results.length ? fmtNum(Math.min(...results.map(r => r.totalCo2GPerTeu))) + ' g' : '—')),
    card('Routing options', table(cols, results, { maxHeight:'calc(100vh - 420px)', emptyText:'No schedule options for this lane' })),
    card('Compare options', h('div', { class:'stack' },
      h('div', { class:'tiny muted' }, 'Comparison attributes come from the shipped enum: ' + COMPARE_ATTRS.map(a => a.id).join(', ')),
      table([
        { key:'attr', label:'Attribute' },
        ...results.slice(0,3).map((r, i) => ({ key:'c' + i, label:`${r.carrier} ${r.transitTimeInDays}d`, num:true, render:row => row['c' + i] })),
      ], comparing(results.slice(0,3))),
      h('div', { class:'row', style:{ marginTop:'10px' } }, btn('Select the recommended option', { kind:'primary', size:'sm', iconName:'sparkle',
        onClick:() => toast('Portside algorithm recommends the first option on cost + CO₂ (mock)', 'good') })),
    )),
  );
}


function comparing(opts) {
  if (!opts.length) return [];
  const r0 = opts[0];
  return [
    { attr:'Cost', c0: fmtMoney(opts[0]?.cost), c1: fmtMoney(opts[1]?.cost), c2: fmtMoney(opts[2]?.cost) },
    { attr:'Transit time', c0: (opts[0]?.transitTimeInDays ?? 0) + ' d', c1: (opts[1]?.transitTimeInDays ?? 0) + ' d', c2: (opts[2]?.transitTimeInDays ?? 0) + ' d' },
    { attr:'Transhipments', c0: String(opts[0]?.transshipments.length ?? 0), c1: String(opts[1]?.transshipments.length ?? 0), c2: String(opts[2]?.transshipments.length ?? 0) },
    { attr:'CO₂ / TEU', c0: fmtNum(opts[0]?.totalCo2GPerTeu) + ' g', c1: fmtNum(opts[1]?.totalCo2GPerTeu) + ' g', c2: fmtNum(opts[2]?.totalCo2GPerTeu) + ' g' },
    { attr:'Avg delay (ETA→ATA)', c0: (opts[0]?.avgDelayEtaAtaDays ?? 0) + ' d', c1: (opts[1]?.avgDelayEtaAtaDays ?? 0) + ' d', c2: (opts[2]?.avgDelayEtaAtaDays ?? 0) + ' d' },
    { attr:'Source', c0: titleCase(opts[0]?.source || ''), c1: titleCase(opts[1]?.source || ''), c2: titleCase(opts[2]?.source || '') },
    { attr:'Allocation', c0: opts[0]?.allocations.overflow ? 'overflow' : (opts[0]?.allocations.remaining ?? 0) + ' left', c1: opts[1]?.allocations.overflow ? 'overflow' : (opts[1]?.allocations.remaining ?? 0) + ' left', c2: opts[2]?.allocations.overflow ? 'overflow' : (opts[2]?.allocations.remaining ?? 0) + ' left' },
  ];
}

/* ================================== RATES ============================== */
export function rates() {
  const kind = state.route.params.kind;
  const kinds = [
    { id:'ocean-carrier-rates', label:'Ocean carrier rates' },
    { id:'transport-contracts', label:'Transport contracts' },
    { id:'merchant-haulage-at-origin', label:'Merchant haulage at origin' },
    { id:'merchant-haulage-to-destination', label:'Merchant haulage to destination' },
  ];
  const nav = () => h('div', { class:'pill-nav', style:{ marginBottom:'12px' } }, kinds.map(k =>
    h('button', { class:k.id === kind ? 'active' : '', onClick:() => location.hash = `#/rates/${k.id}` }, k.label)));

  if (kind === 'transport-contracts') {
    const cols = [
      { key:'contractNumber', label:'Contract', mono:true }, { key:'contractHolder', label:'Holder' },
      { key:'carrier', label:'Carrier' }, { key:'pol', label:'POL', mono:true }, { key:'pod', label:'POD', mono:true },
      { key:'totalTransitTimeHours', label:'Transit', num:true, render:r => `${Math.round(r.totalTransitTimeHours/24)} d` },
      { key:'stuffing', label:'Stuffing', render:r => r.stuffing ? chip('yes','teal') : '—' },
      { key:'stripping', label:'Stripping', render:r => r.stripping ? chip('yes','teal') : '—' },
      { key:'carrierPlaceOfReceipt', label:'Receipt', mono:true }, { key:'carrierPlaceOfDelivery', label:'Delivery', mono:true },
      { key:'co2GPerTeu', label:'CO₂/TEU', num:true, render:r => fmtCo2(r.co2GPerTeu) },
      { key:'sharingSettings', label:'Sharing', render:r => chip(r.sharingSettings, r.sharingSettings==='all'?'green':r.sharingSettings==='participants'?'blue':'grey') },
      { key:'legs', label:'Legs', num:true, render:r => r.legs.length },
    ];
    return h('div', null, pageHead('Transport contracts', `${TRANSPORT_CONTRACTS.length} contracts — legs, stuffing/stripping, cost breakdown`), nav(),
      card(null, table(cols, TRANSPORT_CONTRACTS, { maxHeight:'calc(100vh - 260px)' })));
  }
  if (kind.startsWith('merchant-haulage')) {
    const want = kind.endsWith('origin') ? 'origin' : 'destination';
    const rows2 = MERCHANT_HAULAGE.filter(r => r.type === want);
    const cols = [
      { key:'provider', label:'Provider' }, { key:'carrier', label:'Carrier' },
      { key:'unlocode', label:'Location', mono:true, render:r => `${r.unlocode} · ${r.placeName}` },
      { key:'country', label:'Country' }, { key:'containerSize', label:'Size' }, { key:'containerType', label:'Type' },
      { key: want === 'origin' ? 'stuffing' : 'stripping', label: want === 'origin' ? 'Stuffing' : 'Stripping', render:r => (want === 'origin' ? r.stuffing : r.stripping) ? chip('yes','teal') : '—' },
      { key:'transitTimeDays', label:'Transit', num:true, render:r => `${r.transitTimeDays} d` },
      { key:'freeDays', label:'Free days', num:true },
      { key:'co2GPerTeu', label:'CO₂/TEU', num:true, render:r => fmtCo2(r.co2GPerTeu) },
      { key:'amount', label:'Rate', num:true, render:r => fmtMoney(r.amount, r.currency) },
      { key:'validityTo', label:'Valid until', render:r => fmtDate(r.validityTo) },
    ];
    return h('div', null, pageHead(want === 'origin' ? 'Merchant haulage at origin' : 'Merchant haulage to destination',
      `${rows2.length} haulage rates — mirrors /api/routing/merchant-haulages/${want === 'origin' ? 'origins' : 'destinations'}`), nav(),
      card(null, table(cols, rows2, { maxHeight:'calc(100vh - 260px)' })));
  }

  const cols = [
    { key:'contractNumber', label:'Contract', mono:true }, { key:'carrier', label:'Carrier' },
    { key:'pol', label:'POL', mono:true }, { key:'pod', label:'POD', mono:true },
    { key:'containerSize', label:'Size' }, { key:'containerType', label:'Type' },
    { key:'amount', label:'Rate', num:true, render:r => h('b', null, fmtMoney(r.amount, r.currency)) },
    { key:'surcharges', label:'Surcharges', num:true, render:r => r.surcharges.length ? chip(`${r.surcharges.length} · ${fmtMoney(sum(r.surcharges, s=>s.amount), r.currency)}`, 'grey') : '—' },
    { key:'commitment', label:'Commitment', render:r => chip(titleCase(r.commitment), r.commitment === 'weekly_allocation' ? 'teal' : 'grey') },
    { key:'weeklyAllocation', label:'Alloc/wk', num:true, render:r => r.weeklyAllocation ?? '—' },
    { key:'freeDays', label:'Free days', num:true },
    { key:'transitTimeDays', label:'Transit', num:true, render:r => `${r.transitTimeDays} d` },
    { key:'co2GPerTeu', label:'CO₂/TEU', num:true, render:r => fmtCo2(r.co2GPerTeu) },
    { key:'validityTo', label:'Valid until', render:r => h('span', new Date(r.validityTo) < new Date() ? { style:{ color:'var(--red-600)' } } : null, fmtDate(r.validityTo)) },
    { key:'sharingSettings', label:'Sharing', render:r => chip(r.sharingSettings, r.sharingSettings==='all'?'green':r.sharingSettings==='participants'?'blue':'grey') },
  ];
  const expired = OCEAN_RATES.filter(r => new Date(r.validityTo) < new Date()).length;
  return h('div', null,
    pageHead('Ocean carrier rates', `${OCEAN_RATES.length} rates across ${ALL_CARRIERS.length} carriers · ${expired} expiring`, [
      btn('Import rates', { size:'sm', iconName:'upload', onClick:() => import('./shipments.js').then(m => m.importModal('rates')) }),
      btn('Export CSV', { size:'sm', iconName:'download', onClick:() => { downloadCsv('ocean-rates.csv', cols.map(c=>({key:c.key,label:c.label})), OCEAN_RATES); toast('Exported ocean-rates.csv','good'); } }),
      btn('New rate', { kind:'primary', size:'sm', iconName:'plus', onClick:() => toast('POST /api/rates (mock)', 'good') }),
    ]), nav(),
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Active rates', fmtNum(OCEAN_RATES.length - expired)),
      kpi('Expiring ≤30d', fmtNum(OCEAN_RATES.filter(r => { const d = new Date(r.validityTo) - Date.now(); return d > 0 && d < 30 * 86400000; }).length)),
      kpi('Avg rate', fmtMoney(sum(OCEAN_RATES, r => r.amount) / OCEAN_RATES.length)),
      kpi('Lanes covered', fmtNum(new Set(OCEAN_RATES.map(r => `${r.pol}-${r.pod}`)).size))),
    card(null, table(cols, OCEAN_RATES, { maxHeight:'calc(100vh - 420px)' })));
}

/* ================================ NETWORK ============================== */
export function network() {
  const kind = state.route.params.kind;
  const kinds = [{ id:'organizations', label:'Organizations' }, { id:'users', label:'Users' }];
  const nav = () => h('div', { class:'pill-nav', style:{ marginBottom:'12px' } }, kinds.map(k =>
    h('button', { class:k.id === kind ? 'active' : '', onClick:() => location.hash = `#/network/${k.id}` }, k.label)));

  if (kind === 'users') {
    const cols = [
      { key:'name', label:'Name', render:r => h('span', { class:'row' }, h('div', { class:'avatar', style:{ width:'22px',height:'22px',fontSize:'9px' } }, r.name.split(' ').map(x=>x[0]).join('').slice(0,2)), r.name, r.isMe ? chip('you','blue') : null) },
      { key:'email', label:'Email' }, { key:'role', label:'Role', render:r => chip(titleCase(r.role), r.role === 'admin' ? 'violet' : r.role === 'organization_administrator' ? 'blue' : 'grey') },
      { key:'organizationName', label:'Organization' }, { key:'phone', label:'Phone' },
      { key:'ssoEnforced', label:'SSO', render:r => r.ssoEnforced ? chip('enforced','green') : chip('password','amber') },
      { key:'active', label:'Status', render:r => r.active ? chip('active','green') : chip('disabled','grey') },
      { key:'lastLoginAt', label:'Last login', render:r => ago(r.lastLoginAt) },
      { key:'actions', label:'', render:r => can('participations_set_acl') ? btn('Manage', { size:'sm', onClick:() => toast(`Edit ${r.name} (mock)`, 'good') }) : null },
    ];
    return h('div', null, pageHead('Users', `${USERS.length} users in Meridian Logistics (us)`, [
      btn('Invite user', { kind:'primary', size:'sm', iconName:'plus', onClick:() => inviteUser() }),
    ]), nav(), card(null, table(cols, USERS, { maxHeight:'calc(100vh - 260px)' })));
  }

  const cols = [
    { key:'name', label:'Organization' }, { key:'role', label:'Role', render:r => chip(titleCase(r.role), 'violet') },
    { key:'country', label:'Country' }, { key:'city', label:'City' },
    { key:'taxIdentifier', label:'Tax id', mono:true }, { key:'eoriNumber', label:'EORI', mono:true },
    { key:'contacts', label:'Contacts', num:true }, { key:'activeShipments', label:'Shipments', num:true },
    { key:'sharingSettings', label:'Sharing', render:r => chip(r.sharingSettings, r.sharingSettings==='all'?'green':r.sharingSettings==='participants'?'blue':'grey') },
    { key:'entitlements', label:'Entitlements', render:r => btn('View', { size:'sm', onClick:() => orgEntitlements(r) }) },
    { key:'archived', label:'', render:r => r.archived ? chip('archived','grey') : '' },
  ];
  return h('div', null, pageHead('Organizations', `${ORGANIZATIONS.length} organizations in your network`, [
    btn('Add organization', { kind:'primary', size:'sm', iconName:'plus', onClick:() => toast('POST /api/organizations (mock)', 'good') }),
  ]), nav(), card(null, table(cols, ORGANIZATIONS, { maxHeight:'calc(100vh - 260px)' })));
}
function inviteUser() {
  openDrawer('Invite user', h('div', { class:'stack' },
    alert('info', 'Real users are created through Keycloak; Portside stores the role and organization.'),
    h('div', { class:'grid cols-2' }, field('First name', h('input', { type:'text' })), field('Last name', h('input', { type:'text' }))),
    field('Email', h('input', { type:'email', placeholder:'name@company.example' })),
    field('Role', select(ROLES.map(r => ({ value:r, label:titleCase(r) })), 'operation', () => {})),
    field('Organization', select(ORGANIZATIONS.map(o => ({ value:o.id, label:o.name })), 1200, () => {})),
    toggle(true, () => {}, 'Require SSO on first login')),
    btn('Send invitation', { kind:'primary', onClick:() => { closeDrawer(); toast('Invitation sent (mock)', 'good'); } }));
}
function orgEntitlements(org) {
  openDrawer(`Entitlements — ${org.name}`, h('div', { class:'stack' },
    alert('info', 'This is the real per-organisation entitlement map shipped in the client bundle.'),
    h('div', { class:'stack' }, ENTITLEMENTS.map(e => h('div', { class:'row', style:{ justifyContent:'space-between' } },
      h('span', null, e.label), toggle(org.id % 3 !== 0 ? true : !!state.entitlements[e.key], v => { state.entitlements[e.key] = v; }, ''))))));
}
export function contacts() {
  const cols = [
    { key:'name', label:'Name', render:r => h('span', { class:'row' }, r.type === 'corporation' ? chip('corp','violet') : chip('individual','grey'), r.name) },
    { key:'contactName', label:'Contact' }, { key:'email', label:'Email' }, { key:'phone', label:'Phone' },
    { key:'city', label:'City' }, { key:'country', label:'Country' },
    { key:'eoriNumber', label:'EORI', mono:true }, { key:'taxIdentifier', label:'Tax id', mono:true },
    { key:'facilityType', label:'Facility', render:r => r.facilityType ? chip(r.facilityType,'teal') : '—' },
    { key:'sharingSettings', label:'Sharing', render:r => chip(r.sharingSettings, r.sharingSettings==='all'?'green':r.sharingSettings==='participants'?'blue':'grey') },
  ];
  return h('div', null, pageHead('My contacts', `${CONTACTS.length} contacts · ${CONTACTS.filter(c=>c.type==='corporation').length} corporations, ${CONTACTS.filter(c=>c.type==='individual').length} individuals`, [
    btn('Import contacts', { size:'sm', iconName:'upload', onClick:() => toast('contacts_template_v1_3.xlsx (mock)', 'good') }),
    btn('New contact', { kind:'primary', size:'sm', iconName:'plus', onClick:() => toast('POST /api/contacts (mock)', 'good') }),
  ]), card(null, table(cols, CONTACTS, { maxHeight:'calc(100vh - 250px)' })));
}

/* =============================== TEMPLATES ============================= */
export function templates() {
  const kinds = ['shipments','documents-and-charges-repartition','cargoes','tasks','teams','algos'];
  const kind = state.route.params.kind || 'shipments';
  const list = TEMPLATES.filter(t => t.kind === kind);

  const cards = list.map(t => card(t.name, h('div', { class:'stack' },
    h('div', { class:'row' }, chip(titleCase(t.kind), 'violet'), t.active ? chip('active', 'green') : chip('inactive', 'grey'),
      t.automationRules ? chip(`${t.automationRules} rule(s)`, 'teal') : null),
    h('div', { class:'muted tiny' }, t.description),
    h('div', { class:'row', style:{ gap:'14px' } },
      h('div', null, h('div', { class:'tiny muted' }, 'Fields'), h('b', null, t.fields)),
      h('div', null, h('div', { class:'tiny muted' }, 'Used'), h('b', null, t.usage)),
      h('div', null, h('div', { class:'tiny muted' }, 'Updated'), h('b', null, ago(t.updatedAt)))),
    h('div', { class:'row' },
      btn('Edit', { size:'sm', onClick:() => toast(`Edit ${t.name} (mock)`, 'good') }),
      btn('Apply', { size:'sm', kind:'primary', onClick:() => toast(`Template "${t.name}" applied to 3 shipments (mock)`, 'good') })))));

  return h('div', null,
    pageHead('Templates', 'Reusable shipment, cargo, charges, task and team templates — with automation rules', [
      btn('New template', { kind:'primary', size:'sm', iconName:'plus', onClick:() => toast('POST /api/templates (mock)', 'good') }),
    ]),
    h('div', { class:'pill-nav', style:{ marginBottom:'12px' } }, kinds.map(k =>
      h('button', { class:k === kind ? 'active' : '', onClick:() => location.hash = `#/templates/${k}` }, titleCase(k)))),
    cards.length ? h('div', { class:'grid cols-3' }, cards)
      : h('div', { class:'ui segment panel' }, alert('info', 'No templates of this kind yet.')));
}

/* =========================== MASS OPERATIONS =========================== */
export function massOperations() {
  const kind = state.route.params.kind || 'shipping-instructions';
  const kinds = [
    { id:'shipping-instructions', label:'Shipping instructions' },
    { id:'bookings', label:'Bookings & simulations' },
    { id:'vgm', label:'VGM' },
  ];
  const cols = [
    { key:'id', label:'Job', mono:true, render:r => `#${r.id}` },
    { key:'kind', label:'Operation', render:r => chip(titleCase(r.kind), 'violet') },
    { key:'status', label:'Status', render:r => chip(titleCase(r.status), r.status === 'completed' ? 'green' : r.status === 'processing' ? 'blue' : r.status === 'queued' ? 'grey' : 'amber') },
    { key:'progress', label:'Progress', render:r => h('div', { style:{ minWidth:'160px' } }, progress((r.processed / r.total) * 100), h('div', { class:'tiny muted' }, `${r.processed} / ${r.total}${r.failed ? ` · ${r.failed} failed` : ''}`)) },
    { key:'owner', label:'Owner' }, { key:'createdAt', label:'Started', render:r => fmtDateTime(r.createdAt) },
    { key:'actions', label:'', render:r => btn('Open', { size:'sm', onClick:() => toast(`Job #${r.id} details (mock)`, 'good') }) },
  ];
  return h('div', null,
    pageHead('Mass operations', 'Batch jobs over a saved view — mirrors /api/v2/async-operations', [
      btn('New batch', { kind:'primary', size:'sm', iconName:'plus', onClick:() => newBatch() }),
    ]),
    h('div', { class:'pill-nav', style:{ marginBottom:'12px' } }, kinds.map(k => h('button', { class:k.id === kind ? 'active' : '', onClick:() => location.hash = `#/mass-operations/${k.id}` }, k.label))),
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Running jobs', fmtNum(ASYNC_OPERATIONS.filter(j => j.status === 'processing' || j.status === 'queued').length)),
      kpi('Completed jobs', fmtNum(ASYNC_OPERATIONS.filter(j => j.status.startsWith('completed')).length)),
      kpi('Shipments touched', fmtNum(sum(ASYNC_OPERATIONS, j => j.processed))),
      kpi('Failures', fmtNum(sum(ASYNC_OPERATIONS, j => j.failed)), 'review required', 'down')),
    card('Batch jobs', table(cols, ASYNC_OPERATIONS, { maxHeight:'360px' })),
    card('Bookings simulation', h('div', { class:'stack' },
      alert('info', 'Simulations rank routing options and booking feasibility across a set of shipments before anything is sent to a carrier.'),
      table([
        { key:'id', label:'Simulation', mono:true, render:r => `SIM-${r.id}` },
        { key:'totalShipments', label:'Shipments', num:true },
        { key:'processed', label:'Processed', num:true },
        { key:'status', label:'Status', render:r => chip(titleCase(r.status), r.status === 'completed' ? 'green' : 'blue') },
        { key:'owner', label:'Owner' },
        { key:'bookingBatchTotal', label:'Batch', num:true, render:r => `${r.bookingBatchCompleted}/${r.bookingBatchTotal}` },
      ], ASYNC_OPERATIONS.filter(j => j.kind === 'bookings')))));
}
function newBatch() {
  openDrawer('New batch operation', h('div', { class:'stack' },
    field('Operation', select([{value:'si',label:'Send shipping instructions'},{value:'vgm',label:'Send VGM declarations'},{value:'booking',label:'Send booking requests'},{value:'filing',label:'File export declarations'}], 'si', () => {})),
    field('Scope — saved view', select(SAVED_VIEWS.map(v => ({ value:v.id, label:v.label })), 'departuresFromPol', () => {})),
    field('Carrier filter', select([{value:'',label:'All carriers'}, ...ALL_CARRIERS.map(c => ({ value:c.scac, label:c.name }))], '', () => {})),
    field('Batch size', select([10,25,50,100].map(n => ({ value:n, label:String(n) })), 25, () => {})),
    toggle(true, () => {}, 'Stop on first error')),
    btn('Queue batch', { kind:'primary', onClick:() => { closeDrawer(); toast('Batch queued — see the job list', 'good'); } }));
}

/* ================================ REPORTS ============================== */
export function reports() {
  const kind = state.route.params.kind;
  if (kind === 'versions') {
    return h('div', null, pageHead('Report versions', `${REPORT_VERSIONS.length} versions`, [
      btn('Back to reports', { size:'sm', onClick:() => location.hash = '#/reports' })]),
      card(null, table([
        { key:'reportId', label:'Report', render:r => REPORTS.find(x => x.id === r.reportId)?.name || `#${r.reportId}` },
        { key:'version', label:'Version', mono:true }, { key:'createdBy', label:'Created by' },
        { key:'createdAt', label:'Created', render:r => fmtDateTime(r.createdAt) },
        { key:'note', label:'Change note' },
        { key:'current', label:'', render:r => r.current ? chip('current','green') : btn('Restore', { size:'sm', onClick:() => toast('Restored version (mock)', 'good') }) },
      ], REPORT_VERSIONS, { maxHeight:'calc(100vh - 250px)' })));
  }
  return h('div', null,
    pageHead('Reports', `${REPORTS.length} reports · Power BI Embedded`, [
      btn('Report versions', { size:'sm', onClick:() => location.hash = '#/reports/versions' }),
      btn('New report', { kind:'primary', size:'sm', iconName:'plus', onClick:() => toast('Opens Power BI authoring (mock)', 'good') }),
    ]),
    h('div', { class:'grid cols-3' }, REPORTS.map(r => card(r.name, h('div', { class:'stack' },
      h('div', { class:'row' }, chip(r.category, 'violet'), chip(r.scope, r.scope === 'organization' ? 'blue' : 'grey'), chip(r.accessibleTo, r.accessibleTo === 'all' ? 'green' : r.accessibleTo === 'private' ? 'grey' : 'amber')),
      h('div', { class:'muted tiny' }, `${r.pages} page(s) · refreshed ${ago(r.lastRefresh)} · ${r.schedule}`),
      h('div', { class:'tiny mono muted' }, `reportId ${r.reportId.slice(0, 18)}…`),
      h('div', { class:'ui segment panel', style:{ background:'linear-gradient(135deg,#f2f7fc,#e8f0f8)', padding:'18px', textAlign:'center' } },
        icon('chart', 26), h('div', { class:'tiny muted', style:{ marginTop:'6px' } }, 'Power BI report placeholder')),
      h('div', { class:'row' }, btn('Open', { size:'sm', kind:'primary', onClick:() => toast(`Would embed "${r.name}" from app.powerbi.com`, 'good') }),
        btn('Share', { size:'sm', onClick:() => toast('Sharing settings (mock)', 'good') })))))));
}

/* ================================= ADMIN =============================== */
export function admin() {
  const kind = state.route.params.kind || 'organizations';
  const kinds = [{id:'organizations',label:'Organizations'},{id:'report-versions',label:'Report versions'},{id:'settings',label:'Organisation settings'},{id:'bliss',label:'BLISS & documents'},{id:'features',label:'Feature flags'}];
  const nav = () => h('div', { class:'pill-nav', style:{ marginBottom:'12px' } }, kinds.map(k =>
    h('button', { class:k.id === kind ? 'active' : '', onClick:() => location.hash = `#/admin/${k.id}` }, k.label)));

  if (kind === 'report-versions') return h('div', null, pageHead('Admin — report versions', 'Publish and roll back report definitions'), nav(),
    card(null, table([{ key:'reportId', label:'Report', render:r => REPORTS.find(x=>x.id===r.reportId)?.name }, { key:'version', label:'Version', mono:true },
      { key:'createdBy', label:'Created by' }, { key:'createdAt', label:'Created', render:r => fmtDate(r.createdAt) },
      { key:'current', label:'', render:r => r.current ? chip('published','green') : btn('Publish', { size:'sm', onClick:() => toast('Published (mock)','good') }) }], REPORT_VERSIONS)));

  if (kind === 'bliss') return h('div', null, pageHead('Admin — BLISS & documents', 'Document policies, classifier and B/L validation switches'), nav(),
    card('Document policies', h('div', { class:'stack' },
      toggle(true, () => {}, 'Send draft B/L PDF to Portside'),
      toggle(true, () => {}, 'Send booking confirmation PDF to Portside'),
      toggle(true, () => {}, 'Run the document classifier on upload'),
      toggle(!!state.entitlements.siBlComparisonTool, v => { state.entitlements.siBlComparisonTool = v; }, 'Enable the SI ⇄ B/L comparison tool'),
      toggle(true, () => {}, 'Enforce document validation before B/L release'))),
    card('Validation rules', h('div', { class:'stack' },
      alert('info', 'These are the 40 blocking/warning codes shipped in the client.'),
      h('div', { class:'pill-nav' }, ['pol_unlocode__blank','pod_unlocode__blank','bl_information_payable_at__blank','requested_bl_copies__blank','hs_code__blank_maersk','container_number__duplicate'].map(c => h('button', { class:'mono', style:{ fontSize:'11px' } }, c))))));

  if (kind === 'features') return h('div', null, pageHead('Admin — feature flags', 'Per-organisation entitlements (values arrive at runtime from /api/me/configurations)'), nav(),
    card('Entitlements', h('div', { class:'stack' }, ENTITLEMENTS.map(e => h('div', { class:'row', style:{ justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--grey-100)' } },
      h('div', null, h('div', { style:{ fontWeight:600 } }, e.label), h('div', { class:'tiny mono muted' }, e.key)),
      toggle(state.entitlements[e.key] !== false, v => { state.entitlements[e.key] = v; toast(`${e.key} = ${v}`, v ? 'good' : 'bad'); }, ''))))),
    card('Runtime configuration the SPA reads', kv([
      ['apiRootUrl', 'https://app.portside.example'],
      ['notifApiRootUrl', 'https://notif-api.portside.example'],
      ['oidcAuthority', 'https://sso.portside.example/auth/realms/portside'],
      ['oidcClientId', 'portside-app'],
      ['cdnUrl', 'https://webapp.portside.example/v1'],
      ['env', 'production'],
      ['featureFlags.clientSideId', chip('delivered post-login — not in the bundle', 'amber')],
    ])));

  if (kind === 'settings') return h('div', null, pageHead('Admin — organisation settings', 'Organisation-wide defaults'), nav(),
    card('Defaults', h('div', { class:'grid cols-2' },
      field('Default incoterm', select(INCOTERMS, 'FOB', () => {})),
      field('Default shipping mode', select(['FCL','LCL','BULK'], 'FCL', () => {})),
      field('Default currency', select(CURRENCIES, 'USD', () => {})),
      field('Favourite deal ref', select(['exporter_ref','importer_ref','bl_number','booking_number','shipment_ref'], 'exporter_ref', () => {})),
      field('Second favourite ref', select(['exporter_ref','importer_ref','bl_number','booking_number','shipment_ref'], 'bl_number', () => {})),
      field('Tracking provider', select(['auto', ...TRACKING_PROVIDERS], 'auto', () => {}))),
      h('div', { class:'stack', style:{ marginTop:'12px' } },
        toggle(true, () => {}, 'Enforce SSO for all users (forceSsoOmniauth)'),
        toggle(true, () => {}, 'Enable CO₂ estimation'),
        toggle(true, () => {}, 'Enable the Portside algorithm for route ranking'),
        toggle(true, () => {}, 'Enable port data')))
    );

  return h('div', null,
    pageHead('Admin — organizations', `${ORGANIZATIONS.length} organizations`), nav(),
    card(null, table([
      { key:'name', label:'Organization' }, { key:'role', label:'Role', render:r => chip(titleCase(r.role), 'violet') },
      { key:'country', label:'Country' }, { key:'city', label:'City' },
      { key:'users', label:'Users', num:true, render:r => randInt(2, 40) },
      { key:'entitlements', label:'Entitlements', render:r => btn('Manage', { size:'sm', onClick:() => orgEntitlements(r) }) },
      { key:'archived', label:'Status', render:r => r.archived ? chip('archived','grey') : chip('active','green') },
    ], ORGANIZATIONS, { maxHeight:'calc(100vh - 260px)' })));
}

/* =============================== SETTINGS ============================== */
export function settings() {
  const st = state.settings || (state.settings = {
    tab:'general',
    email:{ deal:{ subjectPreferences:{ carrier:false, shipmentRef:true, poNumber:false, exporterRef:false, importerRef:false, forwarderRef:false, bookingNumber:false } },
      notificationPreferences:{ vgm:false, booking:true, comment:false, muteAll:false, participation:false, attachmentUploaded:false, emptyReleaseOrder:false, shippingInstructions:false } },
    notifications:{ deal:{ statusCanceled:true }, cutoff:{ bookingNotSent:true, bookingNotSentBefore:2, vgmDeclarationNotSent:false, shippingInstructionNotSent:false, vgmDeclarationNotSentBefore:2, shippingInstructionNotSentBefore:2 },
      booking:{ statusCanceled:true, statusDeclined:true, statusConfirmed:true },
      deviation:Object.fromEntries(DEVIATION_TYPES.map(d => [d.code, true])),
      dealTrackingStep:{ podArrival:true, polDeparture:true }, emptyReleaseOrder:{ statusPending:true, statusConfirmed:true } },
    general:{ favouriteDealRef:'exporter_ref', secondFavouriteDealRef:'bl_number', receiveNotifications:true },
  });
  const tabsList = [{ id:'general', label:'General' }, { id:'email', label:'Email' }, { id:'notifications', label:'Notifications' }, { id:'security', label:'Security' }];
  const rerender = () => import('../app.js').then(m => m.navigate(m.parseHash()));

  let body;
  if (st.tab === 'general') body = h('div', { class:'grid cols-2' },
    card('Identity', kv([['Name', CURRENT_USER.name], ['Email', CURRENT_USER.email], ['Role', chip(titleCase(state.role), 'blue')], ['Organisation', CURRENT_USER.organization], ['ACL', chip(CURRENT_USER.aclCode, 'violet')]])),
    card('Preferences', h('div', { class:'stack' },
      field('Favourite deal reference', select(['exporter_ref','importer_ref','bl_number','booking_number','shipment_ref'].map(v=>({value:v,label:titleCase(v)})), st.general.favouriteDealRef, v => { st.general.favouriteDealRef = v; })),
      field('Second favourite reference', select(['exporter_ref','importer_ref','bl_number','booking_number','shipment_ref'].map(v=>({value:v,label:titleCase(v)})), st.general.secondFavouriteDealRef, v => { st.general.secondFavouriteDealRef = v; })),
      toggle(st.general.receiveNotifications, v => { st.general.receiveNotifications = v; }, 'Receive notifications at all'))),
    card('My saved views', table([
      { key:'label', label:'View' }, { key:'description', label:'Definition' },
      { key:'actions', label:'', render:() => btn('Open', { size:'sm', onClick:() => location.hash = '#/deals' }) },
    ], SAVED_VIEWS)));
  else if (st.tab === 'email') body = h('div', { class:'grid cols-2' },
    card('Subject line preferences', h('div', { class:'stack' },
      h('div', { class:'tiny muted' }, 'Which references appear in the subject of deal emails.'),
      ...Object.keys(st.email.deal.subjectPreferences).map(k => toggle(st.email.deal.subjectPreferences[k], v => { st.email.deal.subjectPreferences[k] = v; }, titleCase(k))))),
    card('Email notification types', h('div', { class:'stack' },
      ...Object.keys(st.email.notificationPreferences).map(k => toggle(st.email.notificationPreferences[k], v => { st.email.notificationPreferences[k] = v; }, titleCase(k))),
      alert('warn', 'muteAll overrides every other email preference.'))));
  else if (st.tab === 'notifications') body = h('div', { class:'grid cols-2' },
    card('Deal & booking', h('div', { class:'stack' },
      toggle(st.notifications.deal.statusCanceled, v => { st.notifications.deal.statusCanceled = v; }, 'Deal status canceled'),
      toggle(st.notifications.booking.statusConfirmed, v => { st.notifications.booking.statusConfirmed = v; }, 'Booking confirmed'),
      toggle(st.notifications.booking.statusDeclined, v => { st.notifications.booking.statusDeclined = v; }, 'Booking declined'),
      toggle(st.notifications.booking.statusCanceled, v => { st.notifications.booking.statusCanceled = v; }, 'Booking canceled'),
      h('div', { class:'section-title' }, 'Cut-off alerts'),
      ...['bookingNotSent','vgmDeclarationNotSent','shippingInstructionNotSent'].map(k => h('div', { class:'row', style:{ justifyContent:'space-between' } },
        toggle(st.notifications.cutoff[k], v => { st.notifications.cutoff[k] = v; }, titleCase(k)),
        h('div', { class:'row' }, h('span', { class:'tiny muted' }, 'days before'), h('input', { type:'number', style:{ width:'70px' }, value: st.notifications.cutoff[k + 'Before'] || 2, onInput:e => { st.notifications.cutoff[k + 'Before'] = +e.target.value; } })))),
      h('div', { class:'section-title' }, 'Tracking steps'),
      toggle(st.notifications.dealTrackingStep.polDeparture, v => { st.notifications.dealTrackingStep.polDeparture = v; }, 'Departure from POL'),
      toggle(st.notifications.dealTrackingStep.podArrival, v => { st.notifications.dealTrackingStep.podArrival = v; }, 'Arrival at POD'),
      h('div', { class:'section-title' }, 'Empty release order'),
      toggle(st.notifications.emptyReleaseOrder.statusPending, v => { st.notifications.emptyReleaseOrder.statusPending = v; }, 'Pending'),
      toggle(st.notifications.emptyReleaseOrder.statusConfirmed, v => { st.notifications.emptyReleaseOrder.statusConfirmed = v; }, 'Confirmed'))),
    card('Deviations', h('div', { class:'stack' },
      h('div', { class:'tiny muted' }, 'Each deviation type can carry a day threshold — this is the real alerting taxonomy.'),
      ...DEVIATION_TYPES.map(d => h('div', { class:'row', style:{ justifyContent:'space-between' } },
        h('div', { class:'row' }, toggle(st.notifications.deviation[d.code] !== false, v => { st.notifications.deviation[d.code] = v; }, ''), h('span', { class:'tiny' }, d.label)),
        d.after ? h('div', { class:'row' }, h('span', { class:'tiny muted' }, 'after'), h('input', { type:'number', style:{ width:'64px' }, value:d.after }), h('span', { class:'tiny muted' }, 'day(s)')) : null)))));
  else body = h('div', { class:'grid cols-2' },
    card('Authentication', kv([['Provider', 'Keycloak'], ['Realm', 'portside'], ['Client', 'portside-app'], ['SSO', chip('enforced for this organisation', 'green')], ['Silent renew', 'refresh_token grant'], ['Session storage', 'localStorage (oidc-client-ts)']])),
    card('Sessions', h('div', { class:'stack' },
      h('div', { class:'tiny muted' }, 'Active sessions (mock)'),
      table([{ key:'device', label:'Device' }, { key:'ip', label:'IP' }, { key:'last', label:'Last seen' }, { key:'actions', label:'' }], [
        { device:'Chrome · macOS', ip:'203.0.113.24', last:'now' }, { device:'Safari · iPhone', ip:'198.51.100.9', last:'2 days ago' },
      ]),
      btn('Sign out everywhere', { kind:'danger', size:'sm', onClick:() => toast('Sessions revoked (mock)', 'bad') }))));

  return h('div', null,
    pageHead('My settings', 'Profile, notification preferences and security', [
      btn('Save', { kind:'primary', size:'sm', iconName:'check', onClick:() => toast('Settings saved locally (mock)', 'good') }),
    ]),
    h('div', { class:'pill-nav', style:{ marginBottom:'12px' } }, tabsList.map(t => h('button', { class:t.id === st.tab ? 'active' : '', onClick:() => { st.tab = t.id; rerender(); } }, t.label))),
    body);
}

/* ================================== CO₂ =============================== */
export function co2() {
  const s = rows();
  const lanes = {};
  s.forEach(x => { const k = `${x.polUnlocode}→${x.podUnlocode}`; (lanes[k] = lanes[k] || []).push(x); });
  const laneRows = Object.entries(lanes).map(([lane, list]) => ({
    lane, shipments:list.length, teu:sum(list, x => x.teu),
    avgCo2: Math.round(sum(list, x => x.co2GPerTeu) / list.length),
    totalCo2: sum(list, x => x.co2G),
    avgTransit: Math.round((new Date(list[0].arrival) - new Date(list[0].departure)) / 86400000),
  })).sort((a, b) => b.totalCo2 - a.totalCo2).slice(0, 18);
  return h('div', null,
    pageHead('CO₂ & sustainability', 'Emissions per trade lane, sourced from the searoute/routing model', [
      btn('Export CSV', { size:'sm', iconName:'download', onClick:() => { downloadCsv('co2-by-lane.csv', laneRows, Object.keys(laneRows[0] || {}).map(k => ({ key:k, label:k }))); toast('Exported co2-by-lane.csv','good'); } }),
    ]),
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Total CO₂', fmtCo2(sum(s, x => x.co2G))),
      kpi('Avg per TEU', fmtNum(Math.round(sum(s, x => x.co2GPerTeu) / s.length)) + ' g'),
      kpi('Lanes', fmtNum(Object.keys(lanes).length)),
      kpi('Best lane', laneRows.length ? fmtCo2(Math.min(...laneRows.map(l => l.avgCo2))) + '/TEU' : '—')),
    card('Emissions by trade lane', table([
      { key:'lane', label:'Lane', mono:true }, { key:'shipments', label:'Shipments', num:true },
      { key:'teu', label:'TEU', num:true }, { key:'avgTransit', label:'Avg transit', num:true, render:r => `${r.avgTransit} d` },
      { key:'avgCo2', label:'Avg / TEU', num:true, render:r => h('div', { class:'row', style:{ gap:'8px', justifyContent:'flex-end' } }, h('div', { style:{ width:'90px' } }, progress((r.avgCo2 / Math.max(...laneRows.map(l => l.avgCo2))) * 100)), fmtCo2(r.avgCo2)) },
      { key:'totalCo2', label:'Total CO₂', num:true, render:r => fmtCo2(r.totalCo2) },
    ], laneRows, { maxHeight:'calc(100vh - 400px)' })),
    card('Benchmark vs. alternatives', h('div', { class:'grid cols-3' },
      kpi('Sea (current)', '100%', 'baseline'),
      kpi('Sea + slow steaming', '−14%', 'if service allows', 'up'),
      kpi('Air freight', '+4,180%', 'not viable for FCL', 'down'))));
}

/* =================================== 3D =============================== */
export function threeD() {
  const s = SHIPMENTS[3];

  const faces = ['f-front','f-back','f-left','f-right','f-top','f-bottom']
    .map(c => h('div', { class:`face ${c}` }));

  const containerCard = card('Container', h('div', { class:'container3d' }, h('div', { class:'box3d' }, faces)));

  const cargoRows = table(
    [
      { key:'description', label:'Line' },
      { key:'packages', label:'Packages', num:true, render:r => `${r.packageCount} ${r.packageType}` },
      { key:'volume', label:'Volume', num:true, render:r => (r.volumeCm3 / 1e6).toFixed(2) + ' m³' },
    ],
    s.cargoes,
  );

  const planCard = card('Stowage plan', h('div', { class:'stack' },
    kv([
      ['Shipment', s.shipmentRef],
      ['Containers', `${s.containerCount} × ${s.containerSize}`],
      ['Type', titleCase(s.containerType)],
      ['Cargo', s.cargoDescriptions[0]],
    ]),
    h('div', { class:'section-title' }, 'Cargo lines'),
    cargoRows,
    alert('info', 'The real 3D view renders the stowage per container, including out-of-gauge and reefer airflow.')));

  return h('div', null,
    pageHead('3D container view', `Stowage preview for ${s.shipmentRef} — gated by the "enable-3-d-in-app" flag`, [
      btn('Back to shipment', { size:'sm', onClick:() => { location.hash = `#/deals/${s.shipmentRef}/containers`; } }),
    ]),
    h('div', { class:'grid cols-2' }, containerCard, planCard));
}

/* ================================== LAB =============================== */
export function lab() {
  const cards = [
    card('Document classifier', h('div', { class:'stack' },
      h('div', { class:'muted tiny' }, 'Upload a document and see which type the classifier predicts.'),
      h('input', { type:'file' }),
      btn('Classify', { size:'sm', onClick:() => toast('Predicted: Bill of lading (0.94) — mock', 'good') }))),

    card('OCR container extraction', h('div', { class:'stack' },
      h('div', { class:'muted tiny' }, 'Extract container numbers and seals from a scanned B/L or booking confirmation.'),
      h('textarea', { placeholder:'Paste OCR text or upload a scan…' }),
      btn('Extract', { size:'sm', onClick:() => toast('Found 3 containers — mock', 'good') }))),

    card('EDI mapper playground', h('div', { class:'stack' },
      h('div', { class:'muted tiny' }, 'Map a partner EDI message into the Portside model.'),
      field('Message', select([
        { value:'iftmbf', label:'IFTMBF (booking)' },
        { value:'iftmbc', label:'IFTMBC (confirmation)' },
        { value:'coprar', label:'COPRAR (loading)' },
        { value:'iftsta', label:'IFTSTA (status)' },
      ], 'iftmbf', () => {})),
      btn('Map message', { size:'sm', onClick:() => toast('Mapped to a booking request — mock', 'good') }))),

    card('SI ⇄ B/L diff', h('div', { class:'stack' },
      h('div', { class:'muted tiny' }, 'Compare a shipping instruction against an issued B/L.'),
      btn('Run comparison', { size:'sm', onClick:() => { location.hash = `#/deals/${SHIPMENTS[0].shipmentRef}/operations/bill-of-lading`; } }))),

    card('Drayage (from the public Lab app)', h('div', { class:'stack' },
      h('div', { class:'muted tiny' }, 'The separate Lab application exposes an inland-drayage workflow with trucker, PO and stuffing/stripping places.'),
      btn('Open drayage board', { size:'sm', onClick:() => toast('Drayage board (mock)', 'good') }))),

    card('3D stowage', h('div', { class:'stack' },
      h('div', { class:'muted tiny' }, 'Preview container stowage in 3D.'),
      btn('Open 3D view', { size:'sm', onClick:() => { location.hash = '#/3d'; } }))),
  ];

  return h('div', null,
    pageHead('Portside Lab', 'Early-access tooling — the "lab-url" config key points here in the real product', [
      btn('Open in new tab', { size:'sm', iconName:'link', onClick:() => toast('Would open the Portside Lab URL (mock)', 'good') }),
    ]),
    h('div', { class:'grid cols-3' }, cards));
}

/* ========================= IMPORT HISTORY / EDI ======================== */
export function importHistory() {
  const rows2 = SHIPMENTS.slice(0, 30).map((s, i) => ({
    id: 90000 + i, kind: i % 4 === 0 ? 'rate' : i % 4 === 1 ? 'shipment' : i % 4 === 2 ? 'contact' : 'booking_confirmation',
    file: `import-${1000 + i}.xlsx`, rows: 20 + i * 3, succeeded: 20 + i * 3 - (i % 3), failed: i % 3,
    by: CURRENT_USER.name, at: s.lastUpdate, status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'completed_with_errors' : 'completed',
  }));
  return h('div', null,
    pageHead('Import history', `${rows2.length} imports`, [btn('New import', { kind:'primary', size:'sm', iconName:'upload', onClick:() => import('./shipments.js').then(m => m.importModal('shipments')) })]),
    card(null, table([
      { key:'file', label:'File' }, { key:'kind', label:'Type', render:r => chip(titleCase(r.kind), 'violet') },
      { key:'rows', label:'Rows', num:true }, { key:'succeeded', label:'OK', num:true },
      { key:'failed', label:'Failed', num:true, render:r => r.failed ? chip(String(r.failed), 'red') : '0' },
      { key:'status', label:'Status', render:r => chip(titleCase(r.status), r.status === 'completed' ? 'green' : 'amber') },
      { key:'by', label:'Imported by' }, { key:'at', label:'When', render:r => fmtDateTime(r.at) },
      { key:'actions', label:'', render:r => btn('Errors', { size:'sm', onClick:() => toast(`${r.failed} error row(s) (mock)`, r.failed ? 'bad' : 'good') }) },
    ], rows2, { maxHeight:'calc(100vh - 250px)' })));
}
export function interfaceMessages() {
  const kinds = ['IFTMBF','IFTMBC','COPRAR','IFTSTA','IFTMBF','IFTMIN','COPARN','BAPLIE'];
  const rows2 = Array.from({ length: 32 }, (_, i) => {
    const s = SHIPMENTS[i % SHIPMENTS.length];
    return { id: 50000 + i, direction: i % 2 ? 'out' : 'in', type:kinds[i % kinds.length], partner: i % 2 ? s.carrierName : 'INTTRA',
      ref: s.bookingNumber || s.shipmentRef, state: ['accepted','processed','failed','pending'][i % 4], at: s.lastUpdate, attempts: (i % 3) + 1,
      message: `${kinds[i % kinds.length]}-${100000 + i}` };
  });
  return h('div', null,
    pageHead('Interface messages', 'EDI traffic with carriers and platforms — mirrors /api/v2/interface-messages', [
      btn('Resend failed', { size:'sm', iconName:'refresh', onClick:() => toast('Requeued failed messages (mock)', 'good') }),
    ]),
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Messages (30d)', fmtNum(rows2.length)),
      kpi('Failed', fmtNum(rows2.filter(r => r.state === 'failed').length), 'need attention', 'down'),
      kpi('Partners', fmtNum(new Set(rows2.map(r => r.partner)).size)),
      kpi('Providers', 'INTTRA · CargoSmart · Direct')),
    card(null, table([
      { key:'message', label:'Message id', mono:true },
      { key:'direction', label:'Dir', render:r => chip(r.direction === 'in' ? 'inbound' : 'outbound', r.direction === 'in' ? 'blue' : 'violet') },
      { key:'type', label:'Type', mono:true }, { key:'partner', label:'Partner' }, { key:'ref', label:'Reference', mono:true },
      { key:'state', label:'State', render:r => chip(titleCase(r.state), r.state === 'accepted' || r.state === 'processed' ? 'green' : r.state === 'failed' ? 'red' : 'amber') },
      { key:'attempts', label:'Attempts', num:true }, { key:'at', label:'When', render:r => fmtDateTime(r.at) },
      { key:'actions', label:'', render:r => btn('View', { size:'sm', onClick:() => messageDetail(r) }) },
    ], rows2, { maxHeight:'calc(100vh - 400px)' })));
}
function messageDetail(m) {
  openDrawer(`Message ${m.message}`, h('div', { class:'stack' },
    kv([['Direction', m.direction], ['Type', m.type], ['Partner', m.partner], ['Reference', m.ref], ['State', m.state], ['Attempts', m.attempts]]),
    h('div', { class:'section-title' }, 'Payload (mock)'),
    h('pre', { class:'mono tiny', style:{ background:'var(--grey-50)', padding:'10px', borderRadius:'6px', overflow:'auto' } },
      JSON.stringify({ messageType:m.type, reference:m.ref, partner:m.partner, segments:['UNB+UNOC:3', 'BGM+705+' + m.ref, 'DTM+137:20261005:102', 'UNZ+1+1'] }, null, 2))));
}
