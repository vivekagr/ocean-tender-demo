/**
 * My Shipments — the deals list, container list and container groups.
 * Mirrors the real list view: saved views (tracking filters), column categories,
 * status lifecycle chips, bulk actions and CSV export.
 */
import {
  h, mount, icon, btn, chip, table, card, kpi, select, field, toast, openDrawer, closeDrawer,
  fmtDate, fmtNum, fmtMoney, fmtCo2, titleCase, downloadCsv, progress, bars, alert, rel, dot,
} from '../ui.js';
import { SHIPMENTS, SAVED_VIEW_COUNTS, ALL_CARRIERS, ALL_PORTS } from '../data.js';
import {
  BOOKING_STATE_LABEL, BOOKING_STATE_TONE, TRACKING_STATUS_LABEL, TRACKING_STATUS_TONE,
  SI_STATE_LABEL, SI_STATE_TONE, VGM_STATE_LABEL, VGM_STATE_TONE, SAVED_VIEWS, TASK_TYPES,
} from '../enums.js';
import { state, can } from '../app.js';

/* ------------------------------------------------------------ filtering */
export function filterShipments(f = state.listFilters) {
  let rows = SHIPMENTS.slice();
  const today = Date.now();
  const view = f.savedView || 'all';
  if (view === 'myPendingTasks') rows = rows.filter(s => s.tasks.some(t => t.state === 'pending' && t.assignee === 'Elena Marchetti'));
  if (view === 'pendingTasksRequested') rows = rows.filter(s => s.tasks.some(t => t.state === 'pending' && t.requestedBy === 'Elena Marchetti'));
  if (view === 'departuresFromPol') rows = rows.filter(s => { const d = new Date(s.departure).getTime(); return d > today && d < today + 14 * 86400000; });
  if (view === 'lateAtArrival') rows = rows.filter(s => s.currentTrackingStatus === 'delayed');
  if (view === 'lateAtDeparture') rows = rows.filter(s => s.deviations.some(d => d.code === 'vesselDepartureDelay'));
  if (view === 'totalOngoingShipments') rows = rows.filter(s => s.dealState === 'open' && s.bookingState !== 'draft');
  if (view === 'newShipments') rows = rows.filter(s => Date.now() - new Date(s.createdAt).getTime() < 7 * 86400000);
  if (view === 'documentsUploaded') rows = rows.filter(s => s.documents.length);
  if (view === 'newComments') rows = rows.filter(s => s.comments.length);

  if (f.q) {
    const n = f.q.toLowerCase();
    rows = rows.filter(s => [s.shipmentRef, s.bookingNumber, s.blNumber, s.exporterRef, s.importerRef, s.forwarderRef, s.polUnlocode, s.podUnlocode, s.carrierName, s.vesselName]
      .filter(Boolean).join(' ').toLowerCase().includes(n));
  }
  if (f.carrier) rows = rows.filter(s => s.carrierScac === f.carrier);
  if (f.status) rows = rows.filter(s => s.bookingState === f.status || s.currentTrackingStatus === f.status);
  if (f.trade) rows = rows.filter(s => { const p = ALL_PORTS.find(p => p.loc === f.trade); return p && (s.polUnlocode === p.loc || s.podUnlocode === p.loc); });

  const sort = f.sort || { key:'departure', dir:'asc' };
  const dir = sort.dir === 'asc' ? 1 : -1;
  const val = (s, k) => ({
    shipmentRef:s.shipmentRef, carrier:s.carrierName, pol:s.polUnlocode, pod:s.podUnlocode,
    departure:s.departure, arrival:s.arrival, bookingState:s.bookingState,
    tracking:s.currentTrackingStatus, containers:s.containerCount, tasks:s.tasks.filter(t=>t.state==='pending').length,
    deviations:s.deviations.length, co2:s.co2GPerTeu, costs:s.totalCosts,
  }[k] ?? '');
  rows.sort((a, b) => { const x = val(a, sort.key), y = val(b, sort.key); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
  return rows;
}

/* --------------------------------------------------------------- header */
function pageHeader(title, sub, actions) {
  return h('div', { class:'page-head' },
    h('div', null, h('div', { class:'page-title' }, title), h('div', { class:'page-sub' }, sub)),
    h('div', { class:'page-actions' }, actions));
}

/* ----------------------------------------------------------- list screen */
export function deals() {
  const f = state.listFilters;
  const view = SAVED_VIEWS.find(v => v.id === f.savedView) || SAVED_VIEWS[0];
  const rows = filterShipments(f);
  const totalPages = Math.max(1, Math.ceil(rows.length / f.pageSize));
  f.page = Math.min(f.page, totalPages);
  const pageRows = rows.slice((f.page - 1) * f.pageSize, f.page * f.pageSize);

  const cols = [
    { key:'flag', label:'', width:'26px', render:s => flagIcon(s.flag) },
    { key:'shipmentRef', label:'Portside ref', sortable:true, mono:true, render:s => h('a', { href:`#/deals/${s.shipmentRef}/summary`, onClick:e=>e.stopPropagation() }, s.shipmentRef) },
    { key:'carrier', label:'Carrier', sortable:true, render:s => h('span', { class:'row', style:{ gap:'6px' } }, h('i', { style:{ width:'8px',height:'8px',borderRadius:'50%',background:s.carrier.color,display:'inline-block' } }), s.carrierName) },
    { key:'pol', label:'POL → POD', sortable:true, render:s => h('span', { class:'mono' }, `${s.polUnlocode} → ${s.podUnlocode}`), title:'Port of loading → port of discharge' },
    { key:'containers', label:'CNT', num:true, sortable:true, render:s => `${s.containerCount}× ${s.containerSize}${s.containerType === 'DRY' ? '' : ' ' + TYPE_ABBR[s.containerType]}` },
    { key:'departure', label:'ETD', sortable:true, render:s => h('span', null, fmtDate(s.departure), h('div', { class:'tiny muted' }, rel(s.departure))) },
    { key:'arrival', label:'ETA', sortable:true, render:s => h('span', null, fmtDate(s.arrival), s.currentTrackingStatus === 'delayed' ? h('div', { class:'tiny', style:{ color:'var(--red-600)' } }, 'delayed') : null) },
    { key:'bookingState', label:'Booking', sortable:true, render:s => chip(BOOKING_STATE_LABEL[s.bookingState], BOOKING_STATE_TONE[s.bookingState]) },
    { key:'tracking', label:'Tracking', sortable:true, render:s => chip(TRACKING_STATUS_LABEL[s.currentTrackingStatus], TRACKING_STATUS_TONE[s.currentTrackingStatus]) },
    { key:'si', label:'SI', render:s => chip(SI_STATE_LABEL[s.shippingInstructionsState], SI_STATE_TONE[s.shippingInstructionsState]) },
    { key:'vgm', label:'VGM', render:s => chip(VGM_STATE_LABEL[s.vgmDeclarationState], VGM_STATE_TONE[s.vgmDeclarationState]) },
    { key:'tasks', label:'Tasks', num:true, sortable:true, render:s => { const n = s.tasks.filter(t=>t.state==='pending').length; return n ? chip(String(n), 'amber') : h('span', { class:'muted' }, '—'); } },
    { key:'deviations', label:'Dev.', num:true, sortable:true, render:s => { const n = s.deviations.length; return n ? chip(String(n), s.deviations.some(d=>d.severity==='bad') ? 'red' : 'amber') : h('span', { class:'muted' }, '—'); } },
    { key:'co2', label:'CO₂/TEU', num:true, sortable:true, render:s => fmtCo2(s.co2GPerTeu) },
    { key:'costs', label:'Costs', num:true, sortable:true, render:s => fmtMoney(s.totalCosts, s.costCurrency) },
  ];

  const activeCols = cols.filter(c => !f.hiddenCols?.includes(c.key));

  const toolbar = h('div', { class:'panel-head', style:{ gap:'10px', flexWrap:'wrap' } },
    h('div', { class:'filters' },
      field('Saved view', select(SAVED_VIEWS.map(v => ({ value:v.id, label:`${v.label} (${SAVED_VIEW_COUNTS[v.id] || 0})` })), f.savedView, v => { f.savedView = v; f.page = 1; rerender(); })),
      field('Carrier', select([{ value:'', label:'All carriers' }, ...ALL_CARRIERS.map(c => ({ value:c.scac, label:c.name }))], f.carrier, v => { f.carrier = v; f.page = 1; rerender(); })),
      field('Status', select([{ value:'', label:'Any status' }, ...Object.entries(BOOKING_STATE_LABEL).map(([k,v]) => ({ value:k, label:'Booking: ' + v })), { value:'delayed', label:'Tracking: Delayed' }, { value:'in_transit', label:'Tracking: In transit' }], f.status, v => { f.status = v; f.page = 1; rerender(); })),
      field('Port', select([{ value:'', label:'Any port' }, ...ALL_PORTS.map(p => ({ value:p.loc, label:`${p.loc} — ${p.name}` }))], f.trade, v => { f.trade = v; f.page = 1; rerender(); })),
      h('div', { class:'field' }, h('label', null, 'Search'), h('input', { type:'search', value:f.q, placeholder:'ref, B/L, container…', onInput: e => { f.q = e.target.value; f.page = 1; clearTimeout(window.__qT); window.__qT = setTimeout(rerender, 180); } })),
      h('div', { class:'field' }, h('label', null,' '), h('div', { class:'row' },
        f.q || f.carrier || f.status || f.trade || f.savedView !== 'all'
          ? btn('Clear', { size:'sm', onClick: () => { state.listFilters = { ...state.listFilters, q:'', carrier:'', status:'', trade:'', savedView:'all', page:1, selection:new Set() }; rerender(); } }) : null)),
    ),
    h('div', { class:'spacer' }),
    h('div', { class:'row' },
      btn('Columns', { size:'sm', iconName:'grid', onClick: () => columnPicker(cols, activeCols) }),
      btn('Export CSV', { size:'sm', iconName:'download', onClick: () => {
        downloadCsv(`${f.savedView}-shipments.csv`, [
          { key:'shipmentRef', label:'shipment_ref' }, { key:'bookingNumber', label:'booking_number' }, { key:'blNumber', label:'bl_number' },
          { key:'carrierName', label:'carrier' }, { key:'polUnlocode', label:'pol' }, { key:'podUnlocode', label:'pod' },
          { key:'departure', label:'etd' }, { key:'arrival', label:'eta' }, { key:'bookingState', label:'booking_state' },
          { key:'currentTrackingStatus', label:'tracking_status' }, { key:'containerCount', label:'containers' }, { key:'totalCosts', label:'costs' },
        ], rows);
        toast(`Exported ${rows.length} rows to CSV (mock)`, 'good');
      } }),
      can('deal_write') ? btn('New shipment', { kind:'primary', iconName:'plus', size:'sm', onClick: () => newShipment() }) : null),
  );

  const selection = f.selection || new Set();
  const body = h('div', { class:'tight' },
    table(activeCols, pageRows, {
      sort:f.sort, maxHeight:'calc(100vh - 330px)',
      rowKey:r => r.shipmentRef,
      onSort:(key, dir) => { f.sort = { key, dir }; rerender(); },
      onRowClick:r => { location.hash = `#/deals/${r.shipmentRef}/summary`; },
      selected:selection,
      onSelect:next => { f.selection = next instanceof Set ? next : new Set(next); rerender(); },
      emptyText:'No shipments match this view',
    }),
    selection.size ? h('div', { class:'row', style:{ padding:'10px 14px', borderTop:'1px solid var(--grey-200)', background:'var(--blue-50)' } },
      h('b', null, `${selection.size} selected`),
      h('div', { class:'spacer' }),
      can('deal_duplicate') ? btn('Duplicate', { size:'sm', onClick:() => toast(`Duplicated ${selection.size} shipment(s) (mock)`, 'good') }) : null,
      can('shipping_instruction_send') ? btn('Send shipping instructions', { size:'sm', onClick:() => toast(`Queued ${selection.size} shipping instruction(s)`, 'good') }) : null,
      can('vgm_declaration_send') ? btn('Send VGM', { size:'sm', onClick:() => toast(`Queued ${selection.size} VGM declaration(s)`, 'good') }) : null,
      can('bookings_send') ? btn('Remind carrier', { size:'sm', onClick:() => toast(`Reminder sent to carrier for ${selection.size} shipment(s)`, 'good') }) : null,
      can('deal_cancel') ? btn('Cancel shipments', { kind:'danger', size:'sm', onClick:() => toast('Cancel requires confirmation in the real product', 'bad') }) : null,
    ) : null,
    h('div', { class:'row', style:{ padding:'8px 14px', borderTop:'1px solid var(--grey-200)' } },
      h('span', { class:'tiny muted' }, `${rows.length} shipment(s) · page ${f.page} of ${totalPages}`),
      h('div', { class:'spacer' }),
      btn('⟨ Prev', { size:'sm', disabled:f.page <= 1, onClick:() => { f.page--; rerender(); } }),
      btn('Next ⟩', { size:'sm', disabled:f.page >= totalPages, onClick:() => { f.page++; rerender(); } }),
      select([10,25,50,100].map(n => ({ value:n, label:`${n} / page` })), f.pageSize, v => { f.pageSize = +v; f.page = 1; rerender(); })),
  );

  const late = rows.filter(s => s.currentTrackingStatus === 'delayed').length;
  const pending = rows.reduce((n,s) => n + s.tasks.filter(t=>t.state==='pending').length, 0);
  const teu = rows.reduce((n,s) => n + s.teu, 0);

  return h('div', null,
    pageHeader('My Shipments', `${view.label} — ${view.description}`, [
      chip(`${SAVED_VIEW_COUNTS.myPendingTasks} pending tasks`, 'amber'),
      chip(`${SAVED_VIEW_COUNTS.lateAtArrival} late`, 'red'),
      btn('Control tower', { size:'sm', iconName:'tower', onClick:() => location.hash = '#/control-tower' }),
    ]),
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Shipments in view', fmtNum(rows.length), `${SAVED_VIEW_COUNTS.all} total`),
      kpi('TEU in view', fmtNum(teu)),
      kpi('Pending tasks (total)', fmtNum(pending), pending ? 'needs action' : 'all clear', pending ? 'down' : 'up'),
      kpi('Late / delayed', fmtNum(late), late ? 'past booked ETA' : 'on schedule', late ? 'down' : 'up'),
    ),
    h('div', { class:'ui segment panel' }, toolbar, body),
  );
}

function rerender() { import('../app.js').then(m => m.navigate(m.parseHash())); }

function flagIcon(flag) {
  const map = { 0:['', ''], 1:['red', 'Priority'], 2:['amber', 'Watch'] };
  const [tone, title] = map[flag] || ['', ''];
  if (!tone) return h('span', null, '');
  return h('span', { title, style:{ color:`var(--${tone}-600)`, fontSize:'13px' } }, '⚑');
}

function columnPicker(cols, activeCols) {
  const f = state.listFilters;
  const local = new Set(activeCols.map(c => c.key));
  openDrawer('Column categories', h('div', { class:'stack' },
    h('div', { class:'ui info message app-message' }, h('div', null, h('b', null, 'Column categories'),
      h('div', { class:'tiny', style:{ marginTop:'2px' } }, 'The real product groups columns into categories and warns that changes may break internal macros. Same idea here.'))),
    h('div', { class:'grid cols-2' }, cols.filter(c => c.key !== 'flag').map(c =>
      h('label', { class:'row', style:{ gap:'8px' } },
        h('input', { type:'checkbox', checked:local.has(c.key), onChange:e => { e.target.checked ? local.add(c.key) : local.delete(c.key); } }),
        h('span', null, c.label || c.key)))),
  ), btn('Apply', { kind:'primary', onClick:() => {
    f.hiddenCols = cols.filter(c => c.key !== 'flag' && !local.has(c.key)).map(c => c.key);
    closeDrawer(); rerender(); toast('Column layout updated', 'good');
  } }));
}

function newShipment() {
  openDrawer('New shipment', h('div', { class:'stack' },
    alert('info', 'In the real product this creates a deal via POST /api/deals. The replica stores it locally only.'),
    h('div', { class:'grid cols-2' },
      field('POL (UN/LOCODE)', select(ALL_PORTS.map(p => ({ value:p.loc, label:`${p.loc} — ${p.name}` })), 'CNSHA', () => {})),
      field('POD (UN/LOCODE)', select(ALL_PORTS.map(p => ({ value:p.loc, label:`${p.loc} — ${p.name}` })), 'NLRTM', () => {})),
      field('Carrier', select(ALL_CARRIERS.map(c => ({ value:c.scac, label:c.name })), 'MAEU', () => {})),
      field('Containers', h('input', { type:'number', value:'1', min:'1' })),
    )), btn('Create shipment', { kind:'primary', onClick:() => { closeDrawer(); toast('Shipment created locally (mock — e.g. LH24000085)', 'good'); } }));
}

/* ------------------------------------------------------------ containers */
export function containers() {
  const rows = SHIPMENTS.flatMap(s => s.containers.map(c => ({ ...c, shipmentRef:s.shipmentRef, carrier:s.carrierName, pol:s.polUnlocode, pod:s.podUnlocode, group:c.shipperOwned ? null : (Math.abs(hash(c.identificationNumber)) % 3 === 0 ? `GRP-${100 + Math.abs(hash(c.identificationNumber)) % 40}` : null) })));
  const cols = [
    { key:'identificationNumber', label:'Container no.', mono:true, sortable:true, render:r => h('a', { href:`#/deals/${r.shipmentRef}/containers` }, r.identificationNumber) },
    { key:'shipmentRef', label:'Shipment', mono:true, render:r => h('a', { href:`#/deals/${r.shipmentRef}/summary` }, r.shipmentRef) },
    { key:'size', label:'Size' }, { key:'type', label:'Type' },
    { key:'group', label:'Group', render:r => r.group ? chip(r.group, 'teal') : h('span', { class:'muted' }, '—') },
    { key:'seals', label:'Seal', render:r => r.seals.join(', ') },
    { key:'stuffingDate', label:'Stuffed', render:r => fmtDate(r.stuffingDate) },
    { key:'measuredWeightG', label:'VGM', num:true, render:r => fmtNum(Math.round(r.measuredWeightG / 1000)) + ' kg' },
    { key:'volumeCm3', label:'Volume', num:true, render:r => (r.volumeCm3 / 1e6).toFixed(2) + ' m³' },
    { key:'packageCount', label:'Packages', num:true, render:r => fmtNum(r.packageCount) },
    { key:'carrier', label:'Carrier' },
    { key:'pol', label:'Route', render:r => h('span', { class:'mono' }, `${r.pol} → ${r.pod}`) },
  ];
  return h('div', null,
    pageHeader('Containers', `${rows.length} containers across ${SHIPMENTS.length} shipments`, [
      btn('Group containers', { size:'sm', iconName:'layers', onClick:() => toast('Container grouping uses POST /api/container-groups (mock)', 'good') }),
      btn('Export CSV', { size:'sm', iconName:'download', onClick:() => { downloadCsv('containers.csv', cols.map(c=>({key:c.key,label:c.label})), rows); toast('Exported containers.csv','good'); } }),
    ]),
    h('div', { class:'ui segment panel' }, h('div', { class:'tight' }, table(cols, rows, { maxHeight:'calc(100vh - 250px)', emptyText:'No containers' }))));
}
const TYPE_ABBR = { REEFER:'RF', OPEN_TOP:'OT', FLAT_RACK:'FR', TANK:'TK', VENTILATED:'VE', DRY:'' };
const hash = (s) => { let x = 0; for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) | 0; return x; };

export function containerGroups() {
  const groups = {};
  SHIPMENTS.forEach(s => s.containers.forEach(c => {
    if (c.shipperOwned) return;
    const hh = hash(c.identificationNumber);
    if (hh % 3 !== 0) return;
    const g = `GRP-${100 + Math.abs(hh) % 40}`;
    (groups[g] = groups[g] || []).push({ ...c, shipmentRef:s.shipmentRef, route:`${s.polUnlocode} → ${s.podUnlocode}` });
  }));
  const list = Object.entries(groups).map(([id, members]) => ({ id, members:members.length, teu:members.reduce((n,m) => n + (m.size.startsWith('40') ? 2 : 1), 0),
    weight:members.reduce((n,m) => n + m.measuredWeightG, 0), routes:[...new Set(members.map(m=>m.route))], rule:members.length > 3 ? 'consolidation' : 'same booking' }));
  const cards = list
    .sort((a, b) => b.members - a.members)
    .slice(0, 18)
    .map(g => card(g.id, h('div', { class:'stack' },
      h('div', { class:'row' }, chip(`${g.members} containers`, 'blue'), chip(`${g.teu} TEU`, 'grey'), chip(g.rule, 'teal')),
      h('div', null, h('div', { class:'tiny muted' }, 'Gross weight'), h('b', null, fmtNum(Math.round(g.weight / 1000)) + ' kg')),
      h('div', null, h('div', { class:'tiny muted' }, 'Routes'), h('div', { class:'mono tiny' }, g.routes.join(' · '))))));

  return h('div', null,
    pageHeader('Container groups', `${list.length} pool groups — supports the groupContainers entitlement`, [
      btn('New group', { kind:'primary', size:'sm', iconName:'plus', onClick:() => toast('POST /api/container-groups (mock)', 'good') }),
    ]),
    cards.length
      ? h('div', { class:'grid cols-3' }, cards)
      : h('div', { class:'ui segment panel' }, alert('info', 'No groups in the mock dataset.')));
}

/* --------------------------------------------------- booking confirmations */
export function bookingConfirmations() {
  const rows = SHIPMENTS.filter(s => s.bookingState === 'confirmed' || s.bookingState === 'sent').slice(0, 40);
  const cols = [
    { key:'shipmentRef', label:'Portside ref', mono:true, render:r => h('a', { href:`#/deals/${r.shipmentRef}/booking` }, r.shipmentRef) },
    { key:'carrierName', label:'Carrier' },
    { key:'bookingNumber', label:'Carrier booking', mono:true },
    { key:'blNumber', label:'B/L', mono:true },
    { key:'vesselName', label:'Vessel / voyage', render:r => `${r.vesselName || '—'} / ${r.voyageNumber || '—'}` },
    { key:'departure', label:'ETD', render:r => fmtDate(r.departure) },
    { key:'arrival', label:'ETA', render:r => fmtDate(r.arrival) },
    { key:'bookingState', label:'State', render:r => chip(BOOKING_STATE_LABEL[r.bookingState], BOOKING_STATE_TONE[r.bookingState]) },
    { key:'actions', label:'', render:r => btn('Open', { size:'sm', onClick:() => location.hash = `#/deals/${r.shipmentRef}/booking` }) },
  ];
  return h('div', null,
    pageHeader('Booking confirmations', 'Import a carrier confirmation by Excel, EDI or Carrier Direct-Link', [
      btn('Import confirmations', { size:'sm', iconName:'upload', onClick:() => importModal('booking_confirmations') }),
      btn('Import history', { size:'sm', onClick:() => location.hash = '#/import-history' }),
    ]),
    h('div', { class:'ui segment panel' }, h('div', { class:'tight' }, table(cols, rows, { maxHeight:'calc(100vh - 240px)' }))));
}

export function importModal(kind) {
  openDrawer(`Import ${titleCase(kind)}`, h('div', { class:'stack' },
    alert('info', 'The real product accepts an Excel template here (`/api/imports`, multipart) or an EDI message.'),
    h('div', { class:'ui segment panel' }, h('div', { class:'panel-body' }, h('div', { class:'stack' },
      h('div', null, h('b', null, '1. Download the template')),
      h('div', { class:'row' }, btn('Rates template v0.17', { size:'sm', iconName:'download', onClick:() => toast('Would download rates_template_v0.17.xlsx', 'good') }),
        btn('Shipments template v3.5', { size:'sm', iconName:'download', onClick:() => toast('Would download shipments_template_v3_5.xlsx', 'good') })),
      h('hr', { class:'sep' }),
      h('div', null, h('b', null, '2. Upload the filled file')),
      h('div', { class:'field' }, h('label', null, 'File'), h('input', { type:'file' })),
      h('div', { class:'grid cols-2' },
        field('Importable type', select([{value:'deal',label:'Shipment (deal)'},{value:'rate',label:'Rate'},{value:'contact',label:'Contact'}], 'deal', () => {})),
        field('Sharing', select(['private','participants','all'], 'participants', () => {})),
      ),
    )))),
    btn('Start import', { kind:'primary', onClick: () => { closeDrawer(); toast('Import queued — see Mass operations for progress', 'good'); location.hash = '#/mass-operations/shipping-instructions'; } }));
}
