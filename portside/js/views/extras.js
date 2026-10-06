/**
 * Extras — the organisation-wide screens the real router serves outside the
 * shipment workspace: the deviation board, the booking-request list, the
 * container tools, the company calendar, the booking-confirmation import
 * wizard, booking simulations, contact detail and the 403 page.
 *
 * House rules are the same as the other views: the component kit in ../ui.js
 * emits real Semantic UI markup, every status comes from ../enums.js and all
 * data from the mock dataset in ../data.js. Interactive controls re-render
 * through the hash router.
 */
import {
  h, icon, btn, chip, table, card, kpi, kv, field, select, toggle, alert, timeline, bars,
  progress, toast, openDrawer, closeDrawer, fmtDate, fmtDateTime, fmtNum, fmtMoney, fmtCo2,
  fmtWeight, titleCase, rel, ago, downloadCsv, randInt,
} from '../ui.js';
import {
  SHIPMENTS, CONTACTS, ORGANIZATIONS, ASYNC_OPERATIONS, ALL_CARRIERS, ALL_PORTS, CURRENT_USER,
  TEMPLATES, searchSchedules, DATASET_META,
} from '../data.js';
import {
  BOOKING_STATE_LABEL, BOOKING_STATE_TONE, DEVIATION_TYPES, TRACKING_STATUS_LABEL,
  TRACKING_STATUS_TONE, CONTAINER_SIZES, CONTAINER_TYPES, ROLES, ACL_CODES, SUPER_ROLES,
  PERMISSIONS, PERMISSION_LIST, ENTITLEMENTS, SAVED_VIEWS,
} from '../enums.js';
import { state, can } from '../app.js';

/* ------------------------------------------------------------- helpers */
const pageHeadEx = (title, sub, actions) => h('div', { class:'page-head' },
  h('div', null, h('div', { class:'page-title' }, title), h('div', { class:'page-sub' }, sub)),
  h('div', { class:'page-actions' }, actions));

const rerenderExtras = () => import('../app.js').then(m => m.navigate(m.parseHash()));
const rerenderSoon = (fn) => { clearTimeout(window.__exT); window.__exT = setTimeout(fn, 180); };
const sumEx = (arr, f) => arr.reduce((n, x) => n + (f(x) || 0), 0);
const swatch = (color) => h('i', { style:{ width:'8px', height:'8px', borderRadius:'50%', background:color, display:'inline-block', flex:'0 0 8px' } });
const emptyState = (big, sub, actions) => h('div', { class:'empty-state' },
  h('div', { class:'big' }, big),
  sub ? h('div', null, sub) : null,
  actions ? h('div', { class:'row', style:{ justifyContent:'center', marginTop:'12px' } }, actions) : null);
const clearBtn = (onClick) => btn('Clear', { size:'sm', onClick });

/** shared sort helper for the tables on these screens */
function sortRows(rows, sort, val) {
  if (!sort || !sort.key) return rows;
  const dir = sort.dir === 'asc' ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const x = val(a, sort.key), y = val(b, sort.key);
    return (x > y ? 1 : x < y ? -1 : 0) * dir;
  });
}
const sevTone = (severity) => severity === 'bad' ? 'red' : severity === 'warn' ? 'amber' : 'grey';
const sevLabel = (severity) => severity === 'bad' ? 'critical' : severity === 'warn' ? 'warning' : 'info';
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayOf = (s) => String(s || '').slice(0, 10);
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const excelCol = (i) => i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26);

/* ======================================================== DEVIATION BOARD */
/** every deviation of every shipment, with its owning shipment flattened in */
function allDeviations() {
  return SHIPMENTS.flatMap(s => s.deviations.map(d => ({
    ...d, shipmentRef:s.shipmentRef, carrier:s.carrierName, route:`${s.polUnlocode} → ${s.podUnlocode}`,
  })));
}
const devFilters = { severity:'', cause:'', source:'', q:'' };
const devSort = { key:'occurredAt', dir:'desc' };
const devAcked = new Set();   // deviations acknowledged in this session

export function deviationBoard() {
  const all = allDeviations();
  const f = devFilters;
  let rows = all.slice();
  if (f.severity) rows = rows.filter(d => d.severity === f.severity);
  if (f.cause) rows = rows.filter(d => d.causedBy === f.cause);
  if (f.source) rows = rows.filter(d => (f.source === 'manual') === !d.automatic);
  if (f.q) {
    const n = f.q.toLowerCase();
    rows = rows.filter(d => [d.shipmentRef, d.label, d.code, d.reasonCode, d.carrier, d.route, d.causedBy, d.comment]
      .filter(Boolean).join(' ').toLowerCase().includes(n));
  }
  rows = sortRows(rows, devSort, (d, k) => d[k] ?? '');
  const isAck = (d) => !!d.acknowledgedBy || devAcked.has(d.id);

  const critical = all.filter(d => d.severity === 'bad').length;
  const warning = all.filter(d => d.severity === 'warn').length;
  const manual = all.filter(d => !d.automatic).length;
  const ackPct = all.length ? Math.round((all.filter(isAck).length / all.length) * 100) : 0;

  const cols = [
    { key:'shipmentRef', label:'Shipment', mono:true, sortable:true,
      render:d => h('a', { href:`#/deals/${d.shipmentRef}/deviations`, title:`Open the deviations tab of ${d.shipmentRef}` }, d.shipmentRef) },
    { key:'severity', label:'Severity', sortable:true, render:d => chip(sevLabel(d.severity), sevTone(d.severity)) },
    { key:'label', label:'Deviation', sortable:true },
    { key:'code', label:'Code', mono:true, sortable:true },
    { key:'occurredAt', label:'Occurred', sortable:true, render:d => h('span', { class:'nowrap' }, fmtDateTime(d.occurredAt), h('div', { class:'tiny muted' }, ago(d.occurredAt))) },
    { key:'causedBy', label:'Caused by', render:d => chip(d.causedBy, 'grey') },
    { key:'reasonCode', label:'Reason', render:d => h('span', { class:'mono tiny' }, d.reasonCode) },
    { key:'automatic', label:'Source', sortable:true, render:d => chip(d.automatic ? 'computed' : 'manual', d.automatic ? 'blue' : 'violet') },
    { key:'ack', label:'Acknowledged', render:d => isAck(d)
      ? chip(d.acknowledgedBy || CURRENT_USER.name, 'green')
      : (can('deviations_write')
        ? btn('Acknowledge', { size:'sm', onClick:() => {
            devAcked.add(d.id);
            toast(`Acknowledged "${d.label}" on ${d.shipmentRef} — POST /api/deals/{id}/deviations/{deviationId}/acknowledge`, 'good');
            rerenderExtras();
          } })
        : h('span', { class:'tiny muted' }, 'read-only')) },
  ];

  const byType = DEVIATION_TYPES
    .map(t => ({ ...t, n: all.filter(d => d.code === t.code).length }))
    .sort((a, b) => b.n - a.n);
  const byCause = ['carrier', 'provider', 'data', 'user'].map(c => ({ cause:c, n:all.filter(d => d.causedBy === c).length }));
  const byShipment = {};
  all.forEach(d => { (byShipment[d.shipmentRef] = byShipment[d.shipmentRef] || []).push(d); });
  const worst = Object.entries(byShipment).map(([ref, list]) => ({ ref, n:list.length, critical:list.filter(d => d.severity === 'bad').length, carrier:list[0].carrier, route:list[0].route }))
    .sort((a, b) => b.critical - a.critical || b.n - a.n).slice(0, 6);

  const toolbar = h('div', { class:'panel-head', style:{ gap:'10px', flexWrap:'wrap' } },
    h('div', { class:'filters' },
      field('Severity', select([{ value:'', label:'Any severity' }, { value:'bad', label:'Critical' }, { value:'warn', label:'Warning' }, { value:'info', label:'Info' }],
        f.severity, v => { f.severity = v; rerenderExtras(); })),
      field('Cause', select([{ value:'', label:'Any cause' }, { value:'carrier', label:'Carrier' }, { value:'provider', label:'Provider' }, { value:'data', label:'Data' }, { value:'user', label:'User' }],
        f.cause, v => { f.cause = v; rerenderExtras(); })),
      field('Source', select([{ value:'', label:'Automatic + manual' }, { value:'automatic', label:'Computed' }, { value:'manual', label:'Manual' }],
        f.source, v => { f.source = v; rerenderExtras(); })),
      field('Search', h('input', { type:'search', value:f.q, placeholder:'ref, code, reason, carrier…',
        onInput:e => { f.q = e.target.value; rerenderSoon(rerenderExtras); } })),
      h('div', { class:'field' }, h('label', null, ' '),
        h('div', { class:'row' }, (f.severity || f.cause || f.source || f.q)
          ? clearBtn(() => { f.severity = ''; f.cause = ''; f.source = ''; f.q = ''; rerenderExtras(); })
          : null)),
    ),
    h('div', { class:'spacer' }),
    h('div', { class:'row' }, chip(`${rows.length} of ${all.length}`, 'grey'),
      btn('Export CSV', { size:'sm', iconName:'download', onClick:() => {
        downloadCsv('deviations.csv', [
          { key:'shipmentRef', label:'shipment_ref' }, { key:'carrier', label:'carrier' }, { key:'route', label:'route' },
          { key:'label', label:'deviation' }, { key:'code', label:'code' }, { key:'severity', label:'severity' },
          { key:'occurredAt', label:'occurred_at' }, { key:'causedBy', label:'caused_by' }, { key:'reasonCode', label:'reason_code' },
          { key:null, label:'source', value:d => d.automatic ? 'computed' : 'manual' },
          { key:null, label:'acknowledged_by', value:d => d.acknowledgedBy || '' },
        ], rows);
        toast(`Exported ${rows.length} deviation(s) to CSV (mock)`, 'good');
      } })),
  );

  return h('div', null,
    pageHeadEx('Deviation board', `${all.length} deviations across ${SHIPMENTS.length} shipments — computed and manually raised alerts`, [
      chip(`${critical} critical`, critical ? 'red' : 'grey'),
      chip(`${warning} warning`, warning ? 'amber' : 'grey'),
      btn('Notification settings', { size:'sm', iconName:'gear', onClick:() => { location.hash = '#/settings'; } }),
    ]),
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Deviations recorded', fmtNum(all.length), `across ${Object.keys(byShipment).length} shipments`),
      kpi('Critical', fmtNum(critical), critical ? 'past booked milestone' : 'none', critical ? 'down' : 'up'),
      kpi('Warning', fmtNum(warning)),
      kpi('Computed / manual', `${fmtNum(all.length - manual)} / ${fmtNum(manual)}`),
      kpi('Acknowledged', ackPct + '%', `${fmtNum(all.filter(isAck).length)} of ${fmtNum(all.length)}`)),
    h('div', { class:'ui segment panel' }, toolbar,
      h('div', { class:'panel-body tight' }, table(cols, rows, {
        maxHeight:'calc(100vh - 430px)',
        sort:devSort,
        rowKey:d => d.id,
        onSort:(key, dir) => { devSort.key = key; devSort.dir = dir; rerenderExtras(); },
        emptyText:'No deviations match these filters',
      }))),
    h('div', { class:'grid cols-2', style:{ marginTop:'14px' } },
      card('Breakdown by deviation type', h('div', { class:'panel-body' }, h('div', { class:'stack' },
        h('div', { class:'tiny muted' }, 'The real alerting taxonomy (`notifications.deviation`) — count per type in this organisation.'),
        bars(byType.map(t => t.n), byType.map(t => t.label)),
        h('div', { class:'stack' }, byType.slice(0, 7).map(t => h('div', { class:'row' },
          h('span', { style:{ flex:'1 1 auto', fontSize:'12.5px' } }, t.label),
          chip(sevLabel(t.severity), sevTone(t.severity)),
          h('b', { class:'tiny', style:{ minWidth:'22px', textAlign:'right' } }, String(t.n)))))))),
      card('Causes & most affected shipments', h('div', { class:'panel-body' }, h('div', { class:'stack' },
        h('div', { class:'section-title' }, 'Caused by'),
        byCause.map(c => h('div', { class:'row', style:{ gap:'8px' } },
          h('span', { style:{ width:'90px', fontSize:'12.5px' } }, titleCase(c.cause)),
          h('div', { style:{ flex:1 } }, progress((c.n / Math.max(1, all.length)) * 100, c.cause === 'carrier' ? 'orange-600' : null)),
          h('b', { class:'tiny' }, String(c.n)))),
        h('div', { class:'section-title' }, 'Shipments with the most deviations'),
        worst.length ? table([
          { key:'ref', label:'Shipment', mono:true, render:r => h('a', { href:`#/deals/${r.ref}/deviations` }, r.ref) },
          { key:'carrier', label:'Carrier' },
          { key:'route', label:'Route', mono:true },
          { key:'critical', label:'Critical', num:true, render:r => r.critical ? chip(String(r.critical), 'red') : h('span', { class:'muted' }, '—') },
          { key:'n', label:'Total', num:true },
        ], worst) : h('div', { class:'muted' }, 'No deviations recorded.'),
      )))),
  );
}

/* ====================================================== BOOKING REQUESTS */
const bookFilters = { state:'', carrier:'', q:'' };
const bookSort = { key:'departure', dir:'asc' };
/** deviation codes that represent a confirmation ≠ request discrepancy */
const DISC_CODES = ['vesselDifferentFromRequested', 'podDifferentFromRequested', 'polDifferentFromRequested',
  'containersDifferentFromRequested', 'bookingConfirmationNotReceived'];
const discrepanciesOf = (s) => s.deviations.filter(d => DISC_CODES.includes(d.code));

export function bookingList() {
  const f = bookFilters;
  let rows = SHIPMENTS.slice();
  if (f.state) rows = rows.filter(s => s.bookingState === f.state);
  if (f.carrier) rows = rows.filter(s => s.carrierScac === f.carrier);
  if (f.q) {
    const n = f.q.toLowerCase();
    rows = rows.filter(s => [s.shipmentRef, s.bookingNumber, s.nvoccBookingNumber, s.blNumber, s.shipmentBookingRef,
      s.vesselName, s.voyageNumber, s.carrierName, s.polUnlocode, s.podUnlocode]
      .filter(Boolean).join(' ').toLowerCase().includes(n));
  }
  rows = sortRows(rows, bookSort, (s, k) => ({
    shipmentRef:s.shipmentRef, carrier:s.carrierName, bookingNumber:s.bookingNumber || '',
    nvocc:s.nvoccBookingNumber || '', departure:s.departure, arrival:s.arrival,
    bookingState:s.bookingState, version:s.bookingVersion, sent:s.bookingSendingDate || '',
    discrepancies:discrepanciesOf(s).length,
  }[k] ?? ''));

  const pending = SHIPMENTS.filter(s => ['ready', 'sent', 'awaiting_validation', 'amend_requested', 'pending'].includes(s.bookingState)).length;
  const confirmed = SHIPMENTS.filter(s => s.bookingState === 'confirmed').length;
  const withDisc = SHIPMENTS.filter(s => discrepanciesOf(s).length).length;

  const cols = [
    { key:'shipmentRef', label:'Portside ref', mono:true, sortable:true,
      render:s => h('a', { href:`#/deals/${s.shipmentRef}/operations/booking`, title:`Open the booking module of ${s.shipmentRef}` }, s.shipmentRef) },
    { key:'carrier', label:'Carrier', sortable:true,
      render:s => h('span', { class:'row', style:{ gap:'6px' } }, swatch(s.carrier.color), s.carrierName) },
    { key:'bookingNumber', label:'Booking no.', mono:true, sortable:true, render:s => s.bookingNumber || h('span', { class:'muted' }, '—') },
    { key:'nvocc', label:'NVOCC no.', mono:true, render:s => s.nvoccBookingNumber || h('span', { class:'muted' }, '—') },
    { key:'vessel', label:'Vessel / voyage', render:s => s.vesselName ? h('span', null, s.vesselName, h('div', { class:'tiny muted' }, `${s.voyageNumber} · ${s.serviceName}`)) : h('span', { class:'muted' }, 'not nominated') },
    { key:'departure', label:'ETD', sortable:true, render:s => h('span', { class:'nowrap' }, fmtDate(s.departure), h('div', { class:'tiny muted' }, rel(s.departure))) },
    { key:'arrival', label:'ETA', sortable:true, render:s => h('span', { class:'nowrap' }, fmtDate(s.arrival), s.currentTrackingStatus === 'delayed' ? h('div', { class:'tiny', style:{ color:'var(--red-600)' } }, 'delayed') : null) },
    { key:'bookingState', label:'Booking state', sortable:true, render:s => chip(BOOKING_STATE_LABEL[s.bookingState], BOOKING_STATE_TONE[s.bookingState]) },
    { key:'version', label:'Version', render:s => chip(s.bookingVersion, 'grey') },
    { key:'sent', label:'Sent', sortable:true, render:s => s.bookingSendingDate ? fmtDate(s.bookingSendingDate) : h('span', { class:'muted' }, 'not sent') },
    { key:'discrepancies', label:'Discrepancies', num:true, sortable:true, render:s => {
      const d = discrepanciesOf(s);
      return d.length ? chip(String(d.length), d.some(x => x.severity === 'bad') ? 'red' : 'amber') : h('span', { class:'muted' }, '—');
    }, title:'Vessel, POL, POD or container differs from the request, or no confirmation received' },
  ];

  const toolbar = h('div', { class:'panel-head', style:{ gap:'10px', flexWrap:'wrap' } },
    h('div', { class:'filters' },
      field('Booking state', select([{ value:'', label:'Any state' },
        ...Object.entries(BOOKING_STATE_LABEL).map(([k, v]) => ({ value:k, label:v }))], f.state, v => { f.state = v; rerenderExtras(); })),
      field('Carrier', select([{ value:'', label:'All carriers' }, ...ALL_CARRIERS.map(c => ({ value:c.scac, label:c.name }))],
        f.carrier, v => { f.carrier = v; rerenderExtras(); })),
      field('Search', h('input', { type:'search', value:f.q, placeholder:'ref, booking no., vessel…',
        onInput:e => { f.q = e.target.value; rerenderSoon(rerenderExtras); } })),
      h('div', { class:'field' }, h('label', null, ' '),
        h('div', { class:'row' }, (f.state || f.carrier || f.q) ? clearBtn(() => { f.state = ''; f.carrier = ''; f.q = ''; rerenderExtras(); }) : null)),
    ),
    h('div', { class:'spacer' }),
    h('div', { class:'row' }, chip(`${rows.length} of ${SHIPMENTS.length}`, 'grey'),
      btn('Import confirmation', { size:'sm', iconName:'upload', onClick:() => { location.hash = '#/booking-confirmations/imports/new'; } }),
      btn('Export CSV', { size:'sm', iconName:'download', onClick:() => {
        downloadCsv('bookings.csv', [
          { key:'shipmentRef', label:'shipment_ref' }, { key:'carrierName', label:'carrier' },
          { key:'bookingNumber', label:'booking_number' }, { key:'nvoccBookingNumber', label:'nvocc_booking_number' },
          { key:'vesselName', label:'vessel_name' }, { key:'voyageNumber', label:'voyage_number' },
          { key:'departure', label:'etd' }, { key:'arrival', label:'eta' },
          { key:'bookingState', label:'booking_state' }, { key:'bookingVersion', label:'booking_version' },
          { key:'bookingSendingDate', label:'booking_sending_date' },
          { key:null, label:'discrepancies', value:s => discrepanciesOf(s).length },
        ], rows);
        toast(`Exported ${rows.length} booking(s) to CSV (mock)`, 'good');
      } })),
  );

  return h('div', null,
    pageHeadEx('Booking requests', `${SHIPMENTS.length} shipments with a booking request — carrier references, state and discrepancies`, [
      chip(`${pending} awaiting carrier`, pending ? 'amber' : 'grey'),
      chip(`${confirmed} confirmed`, 'green'),
      chip(`${withDisc} with discrepancies`, withDisc ? 'red' : 'grey'),
    ]),
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Bookings in view', fmtNum(rows.length), `${SHIPMENTS.length} total`),
      kpi('Awaiting confirmation', fmtNum(pending), 'ready, sent or amend requested', pending ? 'down' : 'up'),
      kpi('Confirmed', fmtNum(confirmed)),
      kpi('With discrepancies', fmtNum(withDisc), 'confirmation ≠ request', withDisc ? 'down' : 'up'),
      kpi('Sent to carrier (7d)', fmtNum(SHIPMENTS.filter(s => s.bookingSendingDate && Date.now() - new Date(s.bookingSendingDate).getTime() < 7 * 86400000).length))),
    h('div', { class:'ui segment panel' }, toolbar,
      h('div', { class:'panel-body tight' }, table(cols, rows, {
        maxHeight:'calc(100vh - 430px)',
        sort:bookSort,
        rowKey:s => s.shipmentRef,
        onSort:(key, dir) => { bookSort.key = key; bookSort.dir = dir; rerenderExtras(); },
        emptyText:'No bookings match these filters',
      }))),
  );
}

/* ===================================================== CONTAINER TOOLS */
/** the same synthetic grouping rule the container-groups screen uses */
const cHash = (s) => { let x = 0; for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) | 0; return x; };
const groupOf = (c) => {
  if (c.shipperOwned) return null;
  const hh = cHash(c.identificationNumber);
  return hh % 3 === 0 ? `GRP-${100 + Math.abs(hh) % 40}` : null;
};
function allContainers() {
  return SHIPMENTS.flatMap(s => s.containers.map(c => ({
    ...c, shipmentRef:s.shipmentRef, carrier:s.carrierName, route:`${s.polUnlocode} → ${s.podUnlocode}`, group:groupOf(c),
  })));
}
function syntheticGroups() {
  const groups = {};
  SHIPMENTS.forEach(s => s.containers.forEach(c => {
    if (c.shipperOwned) return;
    const hh = cHash(c.identificationNumber);
    if (hh % 3 !== 0) return;
    const g = `GRP-${100 + Math.abs(hh) % 40}`;
    (groups[g] = groups[g] || []).push({ ...c, shipmentRef:s.shipmentRef, route:`${s.polUnlocode} → ${s.podUnlocode}` });
  }));
  return Object.entries(groups).map(([id, members]) => ({
    id, members:members.length,
    teu:members.reduce((n, m) => n + (m.size.startsWith('40') ? 2 : 1), 0),
    weight:members.reduce((n, m) => n + m.measuredWeightG, 0),
    routes:[...new Set(members.map(m => m.route))],
    shipments:[...new Set(members.map(m => m.shipmentRef))],
    rule: members.length > 3 ? 'consolidation' : 'same booking',
    sample: members.slice(0, 3),
  }));
}
const containerFind = { q:'', size:'', type:'' };
const containerSort = { key:'identificationNumber', dir:'asc' };
const ungroupFilters = { q:'', rule:'' };
const ungroupedGroups = new Set();

export function containersTool() {
  const tool = state.route.params.tool === 'ungroup' ? 'ungroup' : 'find';
  const nav = h('div', { class:'pill-nav', style:{ marginBottom:'12px' } },
    [{ id:'find', label:'Find containers' }, { id:'ungroup', label:'Ungroup containers' }].map(t =>
      h('button', { class:t.id === tool ? 'active' : '', onClick:() => { location.hash = `#/containers/${t.id}`; } }, t.label)));
  return h('div', null,
    pageHeadEx(tool === 'ungroup' ? 'Ungroup containers' : 'Find containers',
      tool === 'ungroup'
        ? `${syntheticGroups().length} synthetic pool groups — release containers back to their shipment`
        : `Search ${DATASET_META.containers} containers by number, seal or size across ${SHIPMENTS.length} shipments`,
      [chip(tool === 'ungroup' ? 'grouping' : 'lookup', 'violet'),
        btn('Group containers', { size:'sm', iconName:'layers', onClick:() => toast('Container grouping uses POST /api/container-groups (mock)', 'good') })]),
    nav,
    tool === 'ungroup' ? ungroupMode() : findMode());
}

function findMode() {
  const f = containerFind;
  let rows = allContainers();
  if (f.size) rows = rows.filter(c => c.size === f.size);
  if (f.type) rows = rows.filter(c => c.type === f.type);
  if (f.q) {
    const n = f.q.toLowerCase();
    rows = rows.filter(c => [c.identificationNumber, c.identificationNumberActual, c.shipmentRef, c.route,
      c.group, ...c.seals, c.stuffingReference, c.size, c.type].filter(Boolean).join(' ').toLowerCase().includes(n));
  }
  rows = sortRows(rows, containerSort, (c, k) => ({
    identificationNumber:c.identificationNumber, shipmentRef:c.shipmentRef, size:c.size, type:c.type,
    seal:c.seals.join(','), stuffingDate:c.stuffingDate, measuredWeightG:c.measuredWeightG, group:c.group || '',
  }[k] ?? ''));

  const cols = [
    { key:'identificationNumber', label:'Container no.', mono:true, sortable:true,
      render:c => h('a', { href:`#/deals/${c.shipmentRef}/containers`, title:`Open the containers tab of ${c.shipmentRef}` }, c.identificationNumber,
        c.identificationNumberActual ? h('div', { class:'tiny muted' }, 'actual ' + c.identificationNumberActual) : null) },
    { key:'shipmentRef', label:'Owning shipment', mono:true, sortable:true, render:c => h('a', { href:`#/deals/${c.shipmentRef}/summary` }, c.shipmentRef) },
    { key:'size', label:'Size / type', sortable:true, render:c => h('span', { class:'row' }, chip(c.size, 'grey'), h('span', { class:'tiny' }, titleCase(c.type)),
        c.grade ? h('span', { class:'tiny muted' }, 'grade ' + c.grade) : null) },
    { key:'route', label:'Route', mono:true, render:c => h('span', null, c.route, h('div', { class:'tiny muted' }, c.carrier)) },
    { key:'seal', label:'Seal', mono:true, sortable:true, render:c => c.seals.join(', ') },
    { key:'measuredWeightG', label:'VGM', num:true, sortable:true, render:c => fmtWeight(c.measuredWeightG) },
    { key:'stuffingDate', label:'Stuffed', sortable:true, render:c => fmtDate(c.stuffingDate) },
    { key:'group', label:'Current group', sortable:true, render:c => c.group
      ? (ungroupedGroups.has(c.group) ? h('span', { class:'tiny muted' }, 'released from ' + c.group) : chip(c.group, 'teal'))
      : h('span', { class:'muted' }, '—') },
    { key:'shipperOwned', label:'Ownership', render:c => c.shipperOwned ? chip('shipper owned', 'violet') : chip('carrier', 'grey') },
    { key:'temperature', label:'Temp. / ventilation', render:c => c.temperature !== null && c.temperature !== undefined
      ? h('span', null, c.temperature + ' °C', c.ventilation ? h('div', { class:'tiny muted' }, c.ventilation) : null)
      : h('span', { class:'muted' }, '—') },
  ];

  const teu = rows.reduce((n, c) => n + (c.size.startsWith('40') ? 2 : 1), 0);
  return h('div', null,
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Containers in view', fmtNum(rows.length), `${DATASET_META.containers} total`),
      kpi('TEU', fmtNum(teu)),
      kpi('Grouped', fmtNum(rows.filter(c => c.group && !ungroupedGroups.has(c.group)).length), 'synthetic pool groups'),
      kpi('Shipper owned', fmtNum(rows.filter(c => c.shipperOwned).length)),
      kpi('Reefer / tank', fmtNum(rows.filter(c => ['REEFER', 'TANK'].includes(c.type)).length))),
    h('div', { class:'ui segment panel' },
      h('div', { class:'panel-head', style:{ gap:'10px', flexWrap:'wrap' } },
        h('div', { class:'filters' },
          field('Number, seal or shipment', h('input', { type:'search', value:f.q, placeholder:'MSKU1234567, 448213, LH24000018…',
            onInput:e => { f.q = e.target.value; rerenderSoon(rerenderExtras); } })),
          field('Size', select([{ value:'', label:'Any size' }, ...CONTAINER_SIZES.map(s => ({ value:s, label:s }))], f.size, v => { f.size = v; rerenderExtras(); })),
          field('Type', select([{ value:'', label:'Any type' }, ...CONTAINER_TYPES.map(t => ({ value:t.code, label:t.label }))], f.type, v => { f.type = v; rerenderExtras(); })),
          h('div', { class:'field' }, h('label', null, ' '),
            h('div', { class:'row' }, (f.q || f.size || f.type) ? clearBtn(() => { f.q = ''; f.size = ''; f.type = ''; rerenderExtras(); }) : null)),
        ),
        h('div', { class:'spacer' }),
        h('div', { class:'row' }, chip(`${rows.length} result(s)`, 'grey'),
          btn('Export CSV', { size:'sm', iconName:'download', onClick:() => {
            downloadCsv('containers-find.csv', [
              { key:'identificationNumber', label:'container_number' }, { key:'shipmentRef', label:'shipment_ref' },
              { key:'size', label:'size' }, { key:'type', label:'type' },
              { key:null, label:'seal', value:c => c.seals.join('|') },
              { key:'measuredWeightG', label:'vgm_g' }, { key:'stuffingDate', label:'stuffing_date' },
              { key:null, label:'group', value:c => c.group || '' },
            ], rows);
            toast(`Exported ${rows.length} container(s) to CSV (mock)`, 'good');
          } }))),
      h('div', { class:'panel-body tight' }, table(cols, rows, {
        maxHeight:'calc(100vh - 470px)',
        sort:containerSort,
        rowKey:c => c.id,
        onSort:(key, dir) => { containerSort.key = key; containerSort.dir = dir; rerenderExtras(); },
        emptyText:'No container matches this search',
      }))),
  );
}

function ungroupMode() {
  const f = ungroupFilters;
  let groups = syntheticGroups().filter(g => !ungroupedGroups.has(g.id));
  if (f.rule) groups = groups.filter(g => g.rule === f.rule);
  if (f.q) {
    const n = f.q.toLowerCase();
    groups = groups.filter(g => [g.id, g.rule, ...g.routes, ...g.shipments].join(' ').toLowerCase().includes(n));
  }
  groups.sort((a, b) => b.members - a.members);

  const cols = [
    { key:'id', label:'Group', mono:true, render:g => h('b', null, g.id) },
    { key:'members', label:'Containers', num:true },
    { key:'teu', label:'TEU', num:true },
    { key:'weight', label:'Gross weight', num:true, render:g => fmtWeight(g.weight) },
    { key:'shipments', label:'Shipments', num:true, render:g => `${g.shipments.length}${g.shipments.length > 1 ? ' (cross-booking)' : ''}` },
    { key:'routes', label:'Routes', render:g => h('span', { class:'mono tiny' }, g.routes.slice(0, 3).join(' · ')) },
    { key:'sample', label:'Members', render:g => h('span', { class:'row', style:{ gap:'4px' } },
        g.sample.map(m => chip(m.identificationNumber.slice(-4), 'grey')), g.members > 3 ? h('span', { class:'tiny muted' }, `+${g.members - 3}`) : null) },
    { key:'rule', label:'Grouping rule', render:g => chip(g.rule, g.rule === 'consolidation' ? 'teal' : 'grey') },
    { key:'action', label:'', render:g => can('containers_write')
      ? btn('Ungroup', { size:'sm', kind:'danger', onClick:() => confirmUngroup(g) })
      : h('span', { class:'tiny muted' }, 'read-only') },
  ];

  return h('div', null,
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Groups', fmtNum(groups.length)),
      kpi('Containers grouped', fmtNum(sumEx(groups, g => g.members))),
      kpi('TEU grouped', fmtNum(sumEx(groups, g => g.teu))),
      kpi('Cross-booking pools', fmtNum(groups.filter(g => g.shipments.length > 1).length), 'span several shipments'),
      kpi('Released this session', fmtNum(ungroupedGroups.size), ungroupedGroups.size ? 'ungrouped' : 'none')),
    h('div', { class:'ui segment panel' },
      h('div', { class:'panel-head', style:{ gap:'10px', flexWrap:'wrap' } },
        h('div', { class:'filters' },
          field('Group or route', h('input', { type:'search', value:f.q, placeholder:'GRP-118, CNSHA → NLRTM…',
            onInput:e => { f.q = e.target.value; rerenderSoon(rerenderExtras); } })),
          field('Grouping rule', select([{ value:'', label:'Any rule' }, { value:'consolidation', label:'Consolidation' }, { value:'same booking', label:'Same booking' }],
            f.rule, v => { f.rule = v; rerenderExtras(); })),
          h('div', { class:'field' }, h('label', null, ' '),
            h('div', { class:'row' }, (f.q || f.rule) ? clearBtn(() => { f.q = ''; f.rule = ''; rerenderExtras(); }) : null)),
        ),
        h('div', { class:'spacer' }),
        h('div', { class:'row' }, chip(`${groups.length} group(s)`, 'grey'),
          ungroupedGroups.size ? btn('Restore released groups', { size:'sm', iconName:'refresh', onClick:() => { ungroupedGroups.clear(); toast('Groups restored for this session', 'good'); rerenderExtras(); } }) : null)),
      h('div', { class:'panel-body' }, alert('info', 'Ungrouping releases the containers back to their owning shipment — in the real product this calls POST /api/container-groups/{id}/ungroup and is audited.'),
        h('div', { class:'panel-body tight' }, table(cols, groups, {
          maxHeight:'calc(100vh - 520px)',
          rowKey:g => g.id,
          emptyText: groups.length ? 'No group matches this filter' : 'Every group has been released',
        })))),
  );
}

function confirmUngroup(g) {
  openDrawer(`Ungroup ${g.id}`, h('div', { class:'stack' },
    alert('warn', `This releases ${g.members} container(s) from the pool. The containers stay on their shipments and can be regrouped later.`),
    kv([
      ['Group', h('b', null, g.id)],
      ['Containers', String(g.members)],
      ['TEU', String(g.teu)],
      ['Gross weight', fmtWeight(g.weight)],
      ['Shipments', g.shipments.join(', ')],
      ['Routes', h('span', { class:'mono tiny' }, g.routes.join(' · '))],
      ['Grouping rule', chip(g.rule, g.rule === 'consolidation' ? 'teal' : 'grey')],
    ]),
    h('div', { class:'tiny muted' }, 'Endpoint: POST /api/container-groups/' + g.id + '/ungroup')),
    btn('Ungroup', { kind:'danger', onClick:() => {
      closeDrawer();
      ungroupedGroups.add(g.id);
      toast(`Group ${g.id} ungrouped — ${g.members} container(s) released (POST /api/container-groups/${g.id}/ungroup)`, 'good');
      rerenderExtras();
    } }));
}

/* ==================================================== GLOBAL CALENDAR */
const calState = { month:new Date().toISOString().slice(0, 7), day:'', mode:'carrier' };
const STATUS_COLOR = {
  in_transit:'var(--blue-500)', at_pod:'var(--blue-400)', delivered:'var(--green-500)',
  completed:'var(--green-600)', delayed:'var(--red-500)', not_started:'var(--grey-400)',
  none:'var(--grey-400)', blank:'var(--grey-400)',
};
const entryColor = (s) => calState.mode === 'carrier'
  ? s.carrier.color
  : (STATUS_COLOR[s.currentTrackingStatus] || 'var(--grey-400)');

export function globalCalendar() {
  const [y, m] = calState.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const monthLabel = first.toLocaleDateString('en-GB', { month:'long', year:'numeric' });
  const startDow = (first.getDay() + 6) % 7;                     // Monday-first
  const gridStart = new Date(y, m - 1, 1 - startDow);
  const days = Array.from({ length:42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));

  // every ETD and ETA that falls inside the displayed month
  const entries = [];
  for (const s of SHIPMENTS) {
    if (dayOf(s.departure).slice(0, 7) === calState.month) entries.push({ s, kind:'ETD', date:dayOf(s.departure) });
    if (dayOf(s.arrival).slice(0, 7) === calState.month) entries.push({ s, kind:'ETA', date:dayOf(s.arrival) });
  }
  const byDay = {};
  entries.forEach(e => { (byDay[e.date] = byDay[e.date] || []).push(e); });
  const departures = entries.filter(e => e.kind === 'ETD');
  const arrivals = entries.filter(e => e.kind === 'ETA');
  const todayKey = isoOf(new Date());
  const busiest = Object.entries(byDay).sort((a, b) => b[1].length - a[1].length)[0];

  const shift = (n) => {
    const d = new Date(y, m - 1 + n, 1);
    calState.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    calState.day = '';
    rerenderExtras();
  };

  const headerCells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d =>
    h('div', { class:'tiny muted', style:{ textAlign:'center', fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px' } }, d));

  const cells = days.map(d => {
    const key = isoOf(d);
    const inMonth = d.getMonth() === m - 1;
    const items = byDay[key] || [];
    const isSel = calState.day === key;
    return h('div', {
      onClick:() => { calState.day = isSel ? '' : key; rerenderExtras(); },
      title: items.length ? `${items.length} movement(s) on ${fmtDate(key)}` : fmtDate(key),
      style:{
        minHeight:'92px', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'5px 6px',
        background: isSel ? 'var(--blue-50)' : (inMonth ? '#fff' : 'var(--grey-50)'),
        boxShadow: isSel ? '0 0 0 2px var(--blue-200)' : null,
        display:'flex', flexDirection:'column', gap:'3px', cursor:'pointer', overflow:'hidden',
      },
    },
      h('div', { class:'row', style:{ gap:'4px' } },
        h('span', { class: inMonth ? 'tiny' : 'tiny muted',
          style:{ fontWeight: key === todayKey ? 800 : 600, color: key === todayKey ? 'var(--blue-600)' : null } }, String(d.getDate())),
        h('div', { class:'spacer' }),
        items.length ? chip(String(items.length), items.some(i => i.s.currentTrackingStatus === 'delayed') ? 'red' : 'blue') : null),
      ...items.slice(0, 3).map(it => h('div', { class:'row', style:{ gap:'3px', overflow:'hidden' }, title:`${it.kind} ${it.s.shipmentRef} · ${it.s.polUnlocode} → ${it.s.podUnlocode}` },
        h('i', { style:{ width:'7px', height:'7px', borderRadius:'2px', background:entryColor(it.s), display:'inline-block', flex:'0 0 7px' } }),
        h('span', { style:{ fontSize:'9.5px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } },
          `${it.kind} ${it.s.shipmentRef}`))),
      items.length > 3 ? h('div', { class:'tiny muted' }, `+${items.length - 3} more`) : null);
  });

  // month activity grouped into Monday-first weeks (one per grid row)
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const weekDays = days.slice(w * 7, w * 7 + 7);
    const items = weekDays.flatMap(d => byDay[isoOf(d)] || []);
    if (!items.length) continue;
    weeks.push({ start: weekDays[0], items,
      dep: items.filter(i => i.kind === 'ETD').length,
      arr: items.filter(i => i.kind === 'ETA').length });
  }

  const selected = calState.day ? (byDay[calState.day] || []) : [];
  const dayRows = selected.map(e => ({ ...e, ref:e.s.shipmentRef, carrier:e.s.carrierName, route:`${e.s.polUnlocode} → ${e.s.podUnlocode}` }));
  const dayTable = table([
    { key:'kind', label:'Movement', render:r => chip(r.kind, r.kind === 'ETD' ? 'blue' : 'teal') },
    { key:'ref', label:'Shipment', mono:true, render:r => h('a', { href:`#/deals/${r.ref}/summary` }, r.ref) },
    { key:'carrier', label:'Carrier', render:r => h('span', { class:'row', style:{ gap:'6px' } }, swatch(r.s.carrier.color), r.carrier) },
    { key:'route', label:'Route', mono:true },
    { key:'vessel', label:'Vessel / voyage', render:r => r.s.vesselName ? `${r.s.vesselName} ${r.s.voyageNumber}` : h('span', { class:'muted' }, 'not nominated') },
    { key:'state', label:'Booking', render:r => chip(BOOKING_STATE_LABEL[r.s.bookingState], BOOKING_STATE_TONE[r.s.bookingState]) },
    { key:'tracking', label:'Tracking', render:r => chip(TRACKING_STATUS_LABEL[r.s.currentTrackingStatus], TRACKING_STATUS_TONE[r.s.currentTrackingStatus]) },
    { key:'open', label:'', render:r => btn('Open', { size:'sm', onClick:() => { location.hash = `#/deals/${r.ref}/tracking`; } }) },
  ], dayRows, { maxHeight:'320px', emptyText:'Nothing moved on this day', rowKey:r => r.s.shipmentRef + r.kind });

  const legendItems = calState.mode === 'carrier'
    ? ALL_CARRIERS.filter(c => entries.some(e => e.s.carrierScac === c.scac)).map(c => ({ label:c.name, color:c.color, n:entries.filter(e => e.s.carrierScac === c.scac).length }))
    : Object.keys(STATUS_COLOR).filter(k => entries.some(e => e.s.currentTrackingStatus === k))
      .map(k => ({ label:TRACKING_STATUS_LABEL[k], color:STATUS_COLOR[k], n:entries.filter(e => e.s.currentTrackingStatus === k).length }));

  return h('div', null,
    pageHeadEx('Company calendar', `${monthLabel} — ${entries.length} planned movement(s) across ${SHIPMENTS.length} shipments`, [
      btn('Today', { size:'sm', onClick:() => { calState.month = new Date().toISOString().slice(0, 7); calState.day = ''; rerenderExtras(); } }),
      btn('Control tower', { size:'sm', iconName:'tower', onClick:() => { location.hash = '#/control-tower'; } }),
    ]),
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Departures (ETD)', fmtNum(departures.length), monthLabel),
      kpi('Arrivals (ETA)', fmtNum(arrivals.length), monthLabel),
      kpi('Busiest day', busiest ? busiest[0].slice(8) + '/' + busiest[0].slice(5, 7) : '—', busiest ? `${busiest[1].length} movements` : 'no activity'),
      kpi('Late in month', fmtNum(entries.filter(e => e.s.currentTrackingStatus === 'delayed').length), 'tracking status delayed', 'down'),
      kpi('Carriers', fmtNum(new Set(entries.map(e => e.s.carrierScac)).size))),
    card(null, h('div', { class:'panel-head', style:{ gap:'10px' } },
      btn('⟨ Prev', { size:'sm', onClick:() => shift(-1) }),
      h('b', { style:{ minWidth:'150px', textAlign:'center' } }, monthLabel),
      btn('Next ⟩', { size:'sm', onClick:() => shift(1) }),
      h('div', { class:'spacer' }),
      h('div', { class:'row' },
        h('span', { class:'tiny muted' }, 'Colour by'),
        select([{ value:'carrier', label:'Carrier' }, { value:'status', label:'Tracking status' }], calState.mode,
          v => { calState.mode = v; rerenderExtras(); })))),
    h('div', { style:{ display:'grid', gridTemplateColumns:'minmax(0, 2.4fr) minmax(0, 1fr)', gap:'14px', alignItems:'start', marginTop:'14px' } },
      card(null, h('div', { class:'panel-body' }, h('div', { class:'stack' },
        h('div', { style:{ display:'grid', gridTemplateColumns:'repeat(7, minmax(0,1fr))', gap:'5px' } }, headerCells),
        h('div', { style:{ display:'grid', gridTemplateColumns:'repeat(7, minmax(0,1fr))', gap:'5px' } }, cells),
        h('div', { class:'tiny muted' }, 'Coloured markers are planned ETDs and ETAs; the badge counts the movements on that day. Click a day to list it below.')))),
      h('div', { class:'stack' },
        card('Month by week', h('div', { class:'panel-body' }, weeks.length
          ? h('div', { class:'stack' }, weeks.map(w => h('div', null,
              h('div', { class:'section-title' }, 'Week of ' + fmtDate(w.start)),
              h('div', { class:'row', style:{ marginBottom:'6px' } },
                chip(`${w.dep} departure(s)`, 'blue'), chip(`${w.arr} arrival(s)`, 'teal')),
              h('div', { class:'stack' }, w.items.slice(0, 6).map(it => h('div', { class:'row', style:{ gap:'6px' } },
                h('i', { style:{ width:'7px', height:'7px', borderRadius:'2px', background:entryColor(it.s), display:'inline-block', flex:'0 0 7px' } }),
                chip(it.kind, it.kind === 'ETD' ? 'blue' : 'teal'),
                h('a', { class:'mono tiny', href:`#/deals/${it.s.shipmentRef}/summary` }, it.s.shipmentRef),
                h('div', { class:'spacer' }),
                h('span', { class:'tiny muted nowrap' }, fmtDate(it.date))))),
              w.items.length > 6 ? h('div', { class:'tiny muted' }, `+${w.items.length - 6} more`) : null)))
          : alert('info', 'No departures or arrivals in this month.'))),
        card('Legend', h('div', { class:'panel-body' }, h('div', { class:'stack' },
          legendItems.map(l => h('div', { class:'row', style:{ gap:'8px' } }, swatch(l.color),
            h('span', { style:{ flex:'1 1 auto', fontSize:'12.5px' } }, l.label), h('b', { class:'tiny' }, String(l.n)))),
          h('div', { class:'tiny muted' }, calState.mode === 'carrier' ? 'Colour = carrier SCAC.' : 'Colour = current tracking status.')))))),
    h('div', { style:{ marginTop:'14px' } }, card(calState.day ? `Movements on ${fmtDate(calState.day)}` : 'Day detail',
      h('div', { class:'panel-body' }, calState.day
        ? dayTable
        : alert('info', 'Click a day in the grid to list its departures and arrivals here.')))),
  );
}

/* ==================================== BOOKING-CONFIRMATION IMPORT WIZARD */
/** the 52 columns of the shipments import template (v3.5) */
const TEMPLATE_V35 = [
  ['shipment_ref', 'text', true, 'deal.shipment_ref', 'LH24000042'],
  ['exporter_ref', 'text', false, 'deal.exporter_ref', 'EXP-48213'],
  ['importer_ref', 'text', false, 'deal.importer_ref', 'IMP-90231'],
  ['forwarder_ref', 'text', false, 'deal.forwarder_ref', 'FWD-11740'],
  ['booking_number', 'text', false, 'deal.booking_number', 'MAE482019377'],
  ['nvocc_booking_number', 'text', false, 'deal.nvocc_booking_number', 'NV48201937'],
  ['bl_number', 'text', false, 'deal.bl_number', 'MAE391028441'],
  ['carrier_scac', 'enum', true, 'deal.carrier_scac', 'MAEU'],
  ['shipping_line_scac', 'enum', false, 'deal.shipping_line_scac', 'MAEU'],
  ['shipping_mode', 'enum', false, 'deal.shipping_mode', 'FCL'],
  ['carrier_move_type', 'enum', false, 'deal.carrier_move_type', 'PORT_TO_PORT'],
  ['transport_mode', 'enum', false, 'deal.transport_mode', 'SEA'],
  ['incoterm_code', 'enum', false, 'deal.incoterm_code', 'FOB'],
  ['pol_unlocode', 'enum', true, 'deal.pol_unlocode', 'CNSHA'],
  ['pod_unlocode', 'enum', true, 'deal.pod_unlocode', 'NLRTM'],
  ['origin_unlocode', 'enum', false, 'deal.origin_unlocode', 'CNSHA'],
  ['delivery_unlocode', 'enum', false, 'deal.delivery_unlocode', 'NLRTM'],
  ['vessel_name', 'text', false, 'deal.vessel_name', 'MSC ISABELLA'],
  ['voyage_number', 'text', false, 'deal.voyage_number', '421W'],
  ['service_name', 'text', false, 'deal.service_name', 'AE7'],
  ['departure', 'date', true, 'deal.departure', '2026-10-14'],
  ['arrival', 'date', true, 'deal.arrival', '2026-11-03'],
  ['cargo_readiness_date', 'date', false, 'deal.cargo_readiness_date', '2026-10-09'],
  ['cutoff_date', 'date', false, 'deal.cutoff_date', '2026-10-08'],
  ['vgm_cutoff_date', 'date', false, 'deal.vgm_cutoff_date', '2026-10-10'],
  ['document_cutoff_date', 'date', false, 'deal.document_cutoff_date', '2026-10-07'],
  ['container_identification_number', 'text', true, 'container.identificationNumber', 'MSKU1234567'],
  ['container_size', 'enum', true, 'container.size', '40HC'],
  ['container_type', 'enum', false, 'container.type', 'DRY'],
  ['container_grade', 'enum', false, 'container.grade', 'A'],
  ['shipper_owned', 'boolean', false, 'container.shipperOwned', 'false'],
  ['container_seal', 'text', false, 'container.seals[0]', '448213'],
  ['stuffing_date', 'date', false, 'container.stuffingDate', '2026-10-06'],
  ['stuffing_reference', 'text', false, 'container.stuffingReference', 'STF-40218'],
  ['measured_weight_g', 'number', false, 'container.measuredWeightG', '18400000'],
  ['tare_weight_g', 'number', false, 'container.tareWeightG', '3800000'],
  ['net_weight_g', 'number', false, 'container.netWeightG', '14600000'],
  ['volume_cm3', 'number', false, 'container.volumeCm3', '67000000'],
  ['package_count', 'number', false, 'container.packageCount', '880'],
  ['package_type', 'enum', false, 'container.packageType', 'Pallets'],
  ['temperature', 'number', false, 'container.temperature', '-18.0'],
  ['ventilation', 'text', false, 'container.ventilation', '40 m³/h'],
  ['cargo_description', 'text', true, 'cargo.description', 'Auto spare parts (HS 8708)'],
  ['hs_code', 'text', false, 'cargo.hsCode', '870899'],
  ['marks_and_numbers', 'text', false, 'cargo.marksAndNumbers', 'MAEU4821'],
  ['sales_order_number', 'text', false, 'cargo.salesOrderNumber', 'SO-482910'],
  ['purchase_order_number', 'text', false, 'cargo.purchaseOrderNumber', 'PO-771204'],
  ['invoice_number', 'text', false, 'cargo.invoiceNumber', 'INV-33981'],
  ['gross_weight_g', 'number', false, 'cargo.grossWeightG', '18400000'],
  ['dangerous_good_un_number', 'text', false, 'cargo.dangerousGood.unNumber', 'UN1263'],
  ['cargo_value', 'number', false, 'cargo.cargoValue', '148500'],
  ['cargo_value_currency', 'enum', false, 'cargo.cargoValueCurrency', 'USD'],
];
const NEEDS_REVIEW = ['nvocc_booking_number', 'temperature', 'ventilation', 'dangerous_good_un_number', 'cargo_value_currency'];
const wiz = { step:1, template:'shipments_template_v3_5.xlsx', reviewedAll:false, stopOnError:true, sharing:'participants', duplicates:'skip' };
const WIZ_STEPS = [
  { n:1, title:'Choose the template', description:'Download the Portside Excel template and fill it in' },
  { n:2, title:'Upload & map columns', description:'Map the 52 template columns onto the Portside model' },
  { n:3, title:'Review & import', description:'Confirm the file and start the asynchronous import' },
];

export function bcImportNew() {
  const go = (step) => { wiz.step = Math.max(1, Math.min(3, step)); rerenderExtras(); };
  const stepClass = (n) => n === wiz.step ? 'active' : (n < wiz.step ? 'completed' : '');
  const steps = h('div', { class:'ui steps', style:{ marginBottom:'14px', flexWrap:'wrap' } }, WIZ_STEPS.map(st =>
    h('div', { class:'step ' + stepClass(st.n), style:{ cursor:'pointer' }, onClick:() => go(st.n) },
      chip(String(st.n), st.n === wiz.step ? 'blue' : st.n < wiz.step ? 'green' : 'grey'),
      h('div', { class:'content' },
        h('div', { class:'title' }, st.title),
        h('div', { class:'description' }, st.description)))));

  const mapped = (header) => wiz.reviewedAll || !NEEDS_REVIEW.includes(header);
  const mappingRows = TEMPLATE_V35.map(([header, type, required, target, sample], i) => ({
    col:excelCol(i), header, type, required, target, sample, i,
    status: mapped(header) ? 'mapped' : 'review',
  }));
  const reviewCount = mappingRows.filter(r => r.status === 'review').length;

  let panel;
  if (wiz.step === 1) {
    panel = card('Step 1 — download the carrier booking-confirmation template',
      h('div', { class:'panel-body' }, h('div', { class:'stack' },
        alert('info', 'Portside imports carrier booking confirmations from an Excel template (52 columns per shipment/container line), from EDI or from a manually filled sheet. The same template is used for shipments, VGM and shipping instructions.'),
        h('div', { class:'row wrap' }, [
          btn(wiz.template, { kind:'primary', iconName:'download', onClick:() => toast(`Would download ${wiz.template} (mock)`, 'good') }),
          btn('Rates template v0.17', { iconName:'download', onClick:() => toast('Would download rates_template_v0.17.xlsx', 'good') }),
          btn('Contacts template v1.3', { iconName:'download', onClick:() => toast('Would download contacts_template_v1_3.xlsx', 'good') }),
        ]),
        field('Template to fill', select([
          { value:'shipments_template_v3_5.xlsx', label:'Shipments template v3.5 — 52 columns' },
          { value:'booking_confirmation_template_v2_1.xlsx', label:'Booking confirmation template v2.1 — 38 columns' },
          { value:'vgm_template_v1_4.xlsx', label:'VGM template v1.4 — 19 columns' },
        ], wiz.template, v => { wiz.template = v; rerenderExtras(); })),
        h('div', { class:'section-title' }, 'Template library'),
        table([
          { key:'name', label:'Template' },
          { key:'fields', label:'Columns', num:true },
          { key:'usage', label:'Imports', num:true },
          { key:'automationRules', label:'Automation rules', num:true },
          { key:'updatedAt', label:'Updated', render:r => ago(r.updatedAt) },
          { key:'active', label:'Status', render:r => r.active ? chip('active', 'green') : chip('inactive', 'grey') },
        ], TEMPLATES.filter(t => t.kind === 'shipments')),
        h('div', { class:'row' }, h('div', { class:'spacer' }),
          btn('Next: upload the file', { kind:'primary', iconName:'upload', onClick:() => go(2) })))));
  } else if (wiz.step === 2) {
    panel = card('Step 2 — upload the file and map the columns',
      h('div', { class:'panel-body' }, h('div', { class:'stack' },
        h('div', { class:'grid cols-2' },
          field('Excel file', h('input', { type:'file', accept:'.xlsx,.xls,.csv' })),
          field('Worksheet', select([
            { value:'sheet1', label:'Sheet1 — Bookings (default)' },
            { value:'sheet2', label:'Sheet2 — Containers' },
          ], 'sheet1', () => {}))),
        h('div', { class:'row wrap' },
          chip(`${mappingRows.length} columns detected`, 'blue'),
          chip(`${mappingRows.length - reviewCount} auto-mapped`, 'green'),
          reviewCount ? chip(`${reviewCount} need review`, 'amber') : null,
          h('div', { class:'spacer' }),
          btn('Auto-map columns', { size:'sm', iconName:'sparkle', onClick:() => {
            wiz.reviewedAll = true;
            toast(`Auto-mapped ${mappingRows.length} of ${mappingRows.length} columns by header similarity`, 'good');
            rerenderExtras();
          } }),
          btn('Download the mapping report', { size:'sm', iconName:'download', onClick:() => toast('Would download mapping-report.xlsx (mock)', 'good') })),
        h('div', { class:'section-title' }, `Column mapping — ${wiz.template} (${mappingRows.length} columns)`),
        table([
          { key:'col', label:'Col', mono:true, width:'52px' },
          { key:'header', label:'Template header', mono:true,
            render:r => h('span', null, r.header, r.required ? chip('required', 'red') : null) },
          { key:'type', label:'Type', render:r => chip(r.type, r.type === 'date' ? 'violet' : r.type === 'number' ? 'blue' : r.type === 'enum' ? 'teal' : 'grey') },
          { key:'target', label:'Portside target field', mono:true },
          { key:'sample', label:'Sample from file', mono:true },
          { key:'status', label:'Mapping', render:r => r.status === 'mapped' ? chip('mapped', 'green') : chip('review', 'amber') },
          { key:'action', label:'', render:r => h('div', { class:'right' },
              btn('Ignore', { size:'sm', onClick:() => toast(`Column ${r.col} (${r.header}) will be ignored`, 'bad') })) },
        ], mappingRows, { maxHeight:'340px' }),
        h('div', { class:'row' },
          toggle(wiz.stopOnError, v => { wiz.stopOnError = v; }, 'Stop the import on the first rejected row'),
          h('div', { class:'spacer' }),
          btn('Back', { onClick:() => go(1) }),
          btn('Next: review', { kind:'primary', onClick:() => go(3) })))));
  } else {
    panel = card('Step 3 — review and start the import',
      h('div', { class:'panel-body' }, h('div', { class:'grid cols-2' },
        h('div', { class:'stack' },
          h('div', { class:'section-title' }, 'File'),
          kv([
            ['File', 'booking-confirmations-october.xlsx'],
            ['Template', wiz.template],
            ['Columns', `${mappingRows.length} (${mappingRows.length - reviewCount} mapped, ${reviewCount} to review)`],
            ['Rows detected', '128'],
            ['Importable type', chip('shipment (deal)', 'violet')],
            ['Sharing', chip(wiz.sharing, wiz.sharing === 'all' ? 'green' : wiz.sharing === 'participants' ? 'blue' : 'grey')],
            ['Stop on first error', wiz.stopOnError ? chip('yes', 'amber') : chip('no', 'grey')],
          ]),
          field('Sharing of the imported shipments', select(['private', 'participants', 'all'], wiz.sharing, v => { wiz.sharing = v; })),
          field('If a booking already exists', select([
            { value:'skip', label:'Skip the row and report it' },
            { value:'update', label:'Update the existing booking' },
            { value:'create', label:'Create a duplicate shipment' },
          ], wiz.duplicates, v => { wiz.duplicates = v; }))),
        h('div', { class:'stack' },
          h('div', { class:'section-title' }, 'What will happen'),
          alert('info', 'The file is posted as multipart/form-data to POST /api/imports. The API answers with an asynchronous operation id; progress is visible under Mass operations → Shipping instructions.'),
          kv([
            ['Endpoint', h('span', { class:'mono tiny' }, 'POST /api/imports')],
            ['Content type', 'multipart/form-data'],
            ['Body', h('span', { class:'mono tiny' }, 'file, importableType=deal, templateId, sharingSettings')],
            ['Errors', 'row-level report, downloadable as CSV'],
            ['Related', 'booking confirmations can also arrive by EDI (IFTMBC) or Carrier Direct-Link'],
          ]),
          alert('warn', `${reviewCount} column(s) still need a human decision — they will be imported as unmapped and reported in the row-level result.`))),
      ));
  }

  const actions = wiz.step === 3
    ? [
        btn('Back', { onClick:() => { wiz.step = 2; rerenderExtras(); } }),
        btn('Start import', { kind:'primary', iconName:'upload', onClick:() => {
          toast('Import queued — POST /api/imports (multipart/form-data). Follow the job under Mass operations.', 'good');
          location.hash = '#/mass-operations/shipping-instructions';
        } }),
        btn('View mass operations', { size:'sm', iconName:'grid', onClick:() => { location.hash = '#/mass-operations/shipping-instructions'; } }),
      ]
    : [btn('Cancel', { onClick:() => { location.hash = '#/booking-confirmations'; } })];

  return h('div', null,
    pageHeadEx('Import carrier booking confirmations', 'Guided Excel import — 3 steps from template to asynchronous job', [
      chip(`step ${wiz.step} of 3`, 'blue'),
      chip('POST /api/imports', 'violet'),
      btn('Import history', { size:'sm', iconName:'clock', onClick:() => { location.hash = '#/import-history'; } }),
    ]),
    steps,
    panel,
    h('div', { class:'row', style:{ marginTop:'14px' } }, actions),
  );
}

/* ==================================================== BOOKING SIMULATIONS */
const simState = { selected:null };
const extraSims = [];

export function simulations() {
  const runs = [...ASYNC_OPERATIONS.filter(o => o.kind === 'bookings'), ...extraSims];
  const run = runs.find(r => r.id === simState.selected) || runs[0];

  const cols = [
    { key:'id', label:'Simulation', mono:true, render:r => h('a', { href:'#/mass-operations/bookings/simulations', onClick:e => { e.preventDefault(); simState.selected = r.id; rerenderExtras(); } }, `SIM-${r.id}`) },
    { key:'status', label:'Status', render:r => chip(titleCase(r.status), r.status === 'completed' ? 'green' : r.status === 'completed_with_errors' ? 'amber' : r.status === 'processing' ? 'blue' : 'grey') },
    { key:'progress', label:'Progress', render:r => h('div', { style:{ minWidth:'170px' } },
        progress((r.processed / Math.max(1, r.total)) * 100, r.status === 'processing' ? 'blue-500' : null),
        h('div', { class:'tiny muted' }, `${fmtNum(r.processed)} / ${fmtNum(r.total)} shipments${r.failed ? ` · ${r.failed} failed` : ''}`)) },
    { key:'bookingBatch', label:'Booking batch', num:true, render:r => `${r.bookingBatchCompleted}/${r.bookingBatchTotal}` },
    { key:'filters2', label:'Scope', render:r => h('span', { class:'row' }, chip(titleCase(r.filters?.savedView || 'all'), 'grey'), r.filters?.carrier ? chip(r.filters.carrier, 'violet') : null) },
    { key:'owner', label:'Owner' },
    { key:'createdAt', label:'Started', render:r => h('span', { class:'nowrap' }, fmtDateTime(r.createdAt), h('div', { class:'tiny muted' }, ago(r.createdAt))) },
    { key:'open', label:'', render:r => btn('Open', { size:'sm', kind: r.id === run?.id ? 'primary' : '', onClick:() => { simState.selected = r.id; rerenderExtras(); } }) },
  ];

  let detail = alert('info', 'No booking simulation in this organisation yet — queue one to rank routing options.');
  if (run) {
    const pi = run.id % ALL_PORTS.length;
    const qi = (pi + 7) % ALL_PORTS.length;
    const pol = ALL_PORTS[pi].loc, pod = ALL_PORTS[qi].loc;
    const options = searchSchedules({ pol, pod, containers: Math.max(1, Math.min(6, run.bookingBatchTotal / 5 | 0)) })
      .map(o => ({ ...o, feasibility:o.allocations.overflow ? 'blocked' : o.score < 62 ? 'at risk' : 'feasible' }))
      .sort((a, b) => b.score - a.score)
      .map((o, i) => ({ ...o, rank:i + 1 }));
    const feasible = options.filter(o => o.feasibility === 'feasible').length;
    const feasibilityPct = options.length ? Math.round((feasible / options.length) * 100) : 0;
    const costTotal = sumEx(options, o => o.cost) * 12;
    const co2Total = sumEx(options, o => o.totalCo2G) * 3;
    const scope = SHIPMENTS.filter(s => !run.filters?.carrier || s.carrierName === run.filters.carrier);
    const errorRows = scope.filter(s => ['declined', 'failed', 'amend_requested', 'awaiting_validation'].includes(s.bookingState)).slice(0, 8)
      .map(s => ({ ref:s.shipmentRef, carrier:s.carrierName, state:s.bookingState,
        deviation:s.deviations[0]?.code || 'bookingConfirmationNotReceived',
        reason:s.deviations[0]?.reasonCode || 'CARRIER_SCHEDULE_CHANGE' }));

    const optionCols = [
      { key:'rank', label:'#', num:true, render:o => h('b', null, '#' + o.rank) },
      { key:'carrier', label:'Carrier', render:o => h('span', { class:'row', style:{ gap:'6px' } }, swatch(o.color), o.carrier) },
      { key:'routing', label:'Routing', render:o => h('span', { class:'mono' }, `${o.pol} → ${o.transshipments.length ? o.transshipments.join(' → ') + ' → ' : ''}${o.pod}`) },
      { key:'etd', label:'ETD', render:o => fmtDate(o.etd) },
      { key:'eta', label:'ETA', render:o => fmtDate(o.eta) },
      { key:'transitTimeInDays', label:'Transit', num:true, render:o => `${o.transitTimeInDays} d` },
      { key:'cost', label:'Freight', num:true, render:o => fmtMoney(o.cost, o.currency) },
      { key:'totalCo2GPerTeu', label:'CO₂/TEU', num:true, render:o => fmtCo2(o.totalCo2GPerTeu) },
      { key:'allocations', label:'Allocation', render:o => o.allocations.overflow ? chip('overflow', 'red') : chip(`${o.allocations.remaining} left`, 'green') },
      { key:'score', label:'Score', num:true, render:o => { const v = h('div', { style:{ minWidth:'90px' } }, progress(o.score, o.score > 80 ? 'green-500' : o.score > 62 ? 'blue-500' : 'orange-600'), h('div', { class:'tiny muted right' }, o.score.toFixed(1))); return v; } },
      { key:'feasibility', label:'Feasibility', render:o => chip(o.feasibility, o.feasibility === 'feasible' ? 'green' : o.feasibility === 'at risk' ? 'amber' : 'red') },
      { key:'select', label:'', render:o => btn('Select', { size:'sm', onClick:() => toast(`Ranked option #${o.rank} (${o.carrier}) selected for the simulation — POST /api/mass-operations/bookings/simulations/${run.id}/apply`, 'good') }) },
    ];

    detail = h('div', { class:'stack' },
      h('div', { class:'kpis' },
        kpi('Shipments in scope', fmtNum(run.total), `SIM-${run.id}`),
        kpi('Processed', `${fmtNum(run.processed)} / ${fmtNum(run.total)}`),
        kpi('Feasibility', feasibilityPct + '%', `${feasible} of ${options.length} options`, feasibilityPct > 60 ? 'up' : 'down'),
        kpi('Estimated freight', fmtMoney(costTotal)),
        kpi('Estimated CO₂', fmtCo2(co2Total)),
        kpi('Errors', fmtNum(run.failed), errorRows.length ? 'rows to review' : 'none', errorRows.length ? 'down' : 'up')),
      h('div', { class:'grid cols-2' },
        card('Run totals', h('div', { class:'panel-body' }, kv([
          ['Simulation', 'SIM-' + run.id],
          ['Status', chip(titleCase(run.status), run.status === 'processing' ? 'blue' : 'green')],
          ['Scope', titleCase(run.filters?.savedView || 'all') + (run.filters?.carrier ? ' · ' + run.filters.carrier : '')],
          ['Lane simulated', pol + ' → ' + pod],
          ['Booking batch', `${run.bookingBatchCompleted}/${run.bookingBatchTotal}`],
          ['Ranked options', String(options.length)],
          ['Total freight', fmtMoney(costTotal)],
          ['Total CO₂', fmtCo2(co2Total)],
          ['Average transit', options.length ? Math.round(sumEx(options, o => o.transitTimeInDays) / options.length) + ' d' : '—'],
          ['Allocation overflow', String(options.filter(o => o.allocations.overflow).length)],
          ['Owner', run.owner],
          ['Started', fmtDateTime(run.createdAt)],
        ]))),
        card('Run log', h('div', { class:'panel-body' }, timeline([
          { when:fmtDateTime(run.createdAt), what:'Simulation queued', where:`${run.owner} · ${titleCase(run.filters?.savedView || 'all')}` },
          { when:fmtDateTime(run.updatedAt), what:`${fmtNum(run.processed)} of ${fmtNum(run.total)} shipments evaluated`, where:'ranked by cost, transit time, CO₂ and allocation', tone:'done' },
          { when:run.status === 'queued' ? 'pending' : fmtDateTime(run.updatedAt), what:run.status === 'completed' ? 'Simulation completed' : 'Waiting for the async worker', where:'async operation #' + run.id, tone:run.status === 'completed' ? 'done' : 'warn' },
        ])))),
      card('Ranked routing options', h('div', { class:'panel-body tight' },
        table(optionCols, options, { maxHeight:'420px', emptyText:'No routing option could be ranked for this scope' }))),
      card('Feasibility & errors', h('div', { class:'panel-body' }, h('div', { class:'stack' },
        h('div', { class:'row' }, h('span', { class:'tiny muted', style:{ width:'180px' } }, 'Booking feasibility'),
          h('div', { style:{ flex:1, maxWidth:'360px' } }, progress(feasibilityPct, feasibilityPct > 60 ? 'green-500' : 'orange-600')),
          h('b', null, feasibilityPct + '%')),
        errorRows.length
          ? table([
              { key:'ref', label:'Shipment', mono:true, render:r => h('a', { href:`#/deals/${r.ref}/operations/booking` }, r.ref) },
              { key:'carrier', label:'Carrier' },
              { key:'state', label:'Booking state', render:r => chip(BOOKING_STATE_LABEL[r.state], BOOKING_STATE_TONE[r.state]) },
              { key:'deviation', label:'Deviation', mono:true },
              { key:'reason', label:'Reason', mono:true },
              { key:'action', label:'', render:r => btn('Remind carrier', { size:'sm', onClick:() => toast(`Reminder queued for ${r.ref} (mock)`, 'good') }) },
            ], errorRows, { maxHeight:'260px' })
          : alert('good', 'No blocking booking errors for this simulation scope.'),
        h('div', { class:'tiny muted' }, 'Row-level errors of the import/send step are reported per shipment and can be downloaded as CSV.')))));
  }

  return h('div', null,
    pageHeadEx('Booking simulations', 'Rank routing options and check booking feasibility before anything is sent to a carrier', [
      chip(`${runs.length} run(s)`, 'violet'),
      btn('Schedules', { size:'sm', iconName:'calendar', onClick:() => { location.hash = '#/schedules'; } }),
      btn('New simulation', { kind:'primary', size:'sm', iconName:'plus', onClick:newSimulation }),
    ]),
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Simulations', fmtNum(runs.length)),
      kpi('Running', fmtNum(runs.filter(r => r.status === 'processing' || r.status === 'queued').length), 'async jobs', 'up'),
      kpi('Shipments simulated', fmtNum(sumEx(runs, r => r.processed))),
      kpi('Bookings confirmed by simulation', fmtNum(sumEx(runs, r => r.bookingBatchCompleted))),
      kpi('Failures', fmtNum(sumEx(runs, r => r.failed)), 'review required', sumEx(runs, r => r.failed) ? 'down' : 'up')),
    card('Simulation runs', h('div', { class:'panel-body tight' },
      table(cols, runs, { maxHeight:'300px', rowKey:r => r.id, emptyText:'No booking simulation has been queued' }))),
    h('div', { style:{ marginTop:'14px' } }, detail),
  );
}

function newSimulation() {
  const containers = randInt(1, 9);
  openDrawer('New booking simulation', h('div', { class:'stack' },
    alert('info', 'A simulation reads a set of shipments, searches schedules for each lane and ranks the options — nothing is sent to a carrier.'),
    field('Scope — saved view', select(SAVED_VIEWS.map(v => ({ value:v.id, label:v.label })), 'totalOngoingShipments', () => {})),
    field('Carrier', select([{ value:'', label:'All carriers' }, ...ALL_CARRIERS.map(c => ({ value:c.scac, label:c.name }))], '', () => {})),
    h('div', { class:'grid cols-2' },
      field('POL', select(ALL_PORTS.map(p => ({ value:p.loc, label:`${p.loc} — ${p.name}` })), 'CNSHA', () => {})),
      field('POD', select(ALL_PORTS.map(p => ({ value:p.loc, label:`${p.loc} — ${p.name}` })), 'NLRTM', () => {})),
      field('Containers per shipment', h('input', { type:'number', min:'1', value:String(containers) })),
      field('Rank by', select([{ value:'cost', label:'Cost' }, { value:'transit', label:'Transit time' }, { value:'co2', label:'CO₂' }], 'cost', () => {}))),
    toggle(true, () => {}, 'Only consider options with available allocation'),
    toggle(false, () => {}, 'Include Portside algorithm suggestions'),
    h('div', { class:'tiny muted' }, 'POST /api/mass-operations/bookings/simulations')),
    btn('Queue simulation', { kind:'primary', onClick:() => {
      closeDrawer();
      const id = 71000 + extraSims.length;
      extraSims.unshift({
        id, kind:'bookings', status:'queued', total:randInt(40, 320), processed:0, failed:0,
        bookingBatchTotal:25, bookingBatchCompleted:0, owner:CURRENT_USER.name,
        createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
        filters:{ savedView:'totalOngoingShipments', carrier:null }, errors:[], templateId:TEMPLATES[0].id,
      });
      simState.selected = id;
      toast(`Simulation SIM-${id} queued — POST /api/mass-operations/bookings/simulations`, 'good');
      rerenderExtras();
    } }));
}

/* ======================================================== CONTACT DETAIL */
export function contactDetail() {
  const id = state.route.params.id;
  const contact = CONTACTS.find(c => c.id === id || String(c.id) === String(id));
  if (!contact) {
    return h('div', null,
      pageHeadEx('Contact', 'No contact matches this URL'),
      h('div', { class:'ui segment panel' }, h('div', { class:'panel-body' },
        emptyState(`Contact ${id === undefined ? '' : '#' + id} not found`,
          `The URL /contacts/${id === undefined ? '' : id} does not match any of the ${CONTACTS.length} contacts in your network. In the real product this would be a 404 from GET /api/contacts/${id === undefined ? ':id' : id}.`,
          [btn('Back to My contacts', { kind:'primary', iconName:'user', onClick:() => { location.hash = '#/contacts'; } }),
            btn('Back to My Shipments', { onClick:() => { location.hash = '#/deals'; } })]))));
  }

  const org = ORGANIZATIONS.find(o => o.id === contact.organizationId);
  const needle = norm(contact.name);
  const person = norm(contact.contactName);
  // loose match: participants, parties and notify entries of every shipment
  const matches = SHIPMENTS.map(s => {
    const roles = [];
    for (const p of s.participations) if (loose(p.name, needle) || loose(p.name, person)) roles.push({ role:p.role, name:p.name, acl:p.aclCode, type:p.type });
    const parties = [
      ['shipper', s.parties.shipper], ['consignee', s.parties.consignee], ['forwarder', s.parties.forwarder],
      ...(s.parties.notify || []).map((n, i) => [`notify ${i + 1}`, n]),
    ];
    for (const [role, p] of parties) {
      if (!p) continue;
      if (loose(p.name, needle) || loose(p.contact, person)) roles.push({ role, name:p.name, acl:'—', type:'organization' });
    }
    return roles.length ? { s, roles } : null;
  }).filter(Boolean);

  const addressRows = [];
  if (org) addressRows.push({ label:'Registered office (organization)', name:org.name, city:org.city, country:org.country, role:chip('organization', 'violet'), extra:`tax ${org.taxIdentifier}` });
  addressRows.push({ label:'Contact address', name:contact.name, city:contact.city, country:contact.country, role:chip(contact.type, contact.type === 'corporation' ? 'violet' : 'grey'), extra:contact.facilityType ? `facility: ${contact.facilityType}` : 'no facility type' });
  for (const m of matches.slice(0, 8)) {
    for (const r of m.roles) {
      const partyOrg = ORGANIZATIONS.find(o => o.name === r.name);
      addressRows.push({ label:`Used as ${r.role} on ${m.s.shipmentRef}`, name:r.name, city:partyOrg?.city || contact.city, country:partyOrg?.country || contact.country, role:chip(r.role, 'blue'), extra:`ACL ${r.acl}` });
    }
  }

  const shipCols = [
    { key:'ref', label:'Shipment', mono:true, render:r => h('a', { href:`#/deals/${r.s.shipmentRef}/summary` }, r.s.shipmentRef) },
    { key:'role', label:'Participates as', render:r => h('span', { class:'row', style:{ gap:'4px' } }, r.roles.map(x => chip(x.role, x.role === 'owner' ? 'violet' : 'grey'))) },
    { key:'carrier', label:'Carrier', render:r => h('span', { class:'row', style:{ gap:'6px' } }, swatch(r.s.carrier.color), r.s.carrierName) },
    { key:'route', label:'Route', mono:true, render:r => `${r.s.polUnlocode} → ${r.s.podUnlocode}` },
    { key:'departure', label:'ETD', render:r => fmtDate(r.s.departure) },
    { key:'arrival', label:'ETA', render:r => fmtDate(r.s.arrival) },
    { key:'bookingState', label:'Booking', render:r => chip(BOOKING_STATE_LABEL[r.s.bookingState], BOOKING_STATE_TONE[r.s.bookingState]) },
    { key:'open', label:'', render:r => btn('Open', { size:'sm', onClick:() => { location.hash = `#/deals/${r.s.shipmentRef}/summary`; } }) },
  ];

  const detailsCard = card('Contact details', h('div', { class:'panel-body' }, kv([
    ['Type', chip(contact.type, contact.type === 'corporation' ? 'violet' : 'grey')],
    ['Name', contact.name],
    ['Contact person', contact.contactName],
    ['Email', h('a', { href:'mailto:' + contact.email }, contact.email)],
    ['Phone', contact.phone],
    ['City', contact.city],
    ['Country', contact.country],
    ['Tax identifier', contact.taxIdentifier ? h('span', { class:'mono' }, contact.taxIdentifier) : null],
    ['EORI number', contact.eoriNumber ? h('span', { class:'mono' }, contact.eoriNumber) : null],
    ['Facility type', contact.facilityType ? chip(contact.facilityType, 'teal') : null],
    ['Sharing', chip(contact.sharingSettings, contact.sharingSettings === 'all' ? 'green' : contact.sharingSettings === 'participants' ? 'blue' : 'grey')],
    ['Organization', org ? h('a', { href:'#/network/organizations' }, `${org.name} · ${titleCase(org.role)}`) : h('span', { class:'muted' }, 'not linked (# ' + contact.organizationId + ')')],
    ['Archived', contact.archived ? chip('archived', 'grey') : chip('active', 'green')],
  ])));

  const addressList = addressRows.slice(0, 10).map(a => h('div', { class:'row', style:{ alignItems:'flex-start', gap:'10px', paddingBottom:'8px', borderBottom:'1px solid var(--grey-100)' } },
    icon('building', 16),
    h('div', { style:{ flex:1 } },
      h('div', { class:'row' }, h('b', null, a.name), a.role),
      h('div', { class:'tiny muted' }, `${a.label} · ${a.city}, ${a.country}`),
      h('div', { class:'tiny muted' }, a.extra))));
  const addressesCard = card('Addresses & places', h('div', { class:'panel-body' }, h('div', { class:'stack' },
    alert('info', 'The local dataset stores a contact’s city/country and facility type, not a full street address; the rows below are the places this party is used at, derived from its shipments.'),
    addressList)));

  const shipmentsCard = card(`Shipments this party participates in (${matches.length})`,
    h('div', { class:'panel-body' }, matches.length
      ? table(shipCols, matches, { maxHeight:'420px', rowKey:r => r.s.shipmentRef })
      : emptyState('No shipment participation found',
          `None of the ${SHIPMENTS.length} shipments lists "${contact.name}" or "${contact.contactName}" among its participants, shipper, consignee, forwarder or notify parties. The dataset draws these names from a fixed list, so a contact created from that list may simply not be used on a shipment yet.`,
          [btn('Back to My Shipments', { kind:'primary', iconName:'ship', onClick:() => { location.hash = '#/deals'; } }),
            btn('My contacts', { onClick:() => { location.hash = '#/contacts'; } })])));

  return h('div', null,
    pageHeadEx(contact.name, `${titleCase(contact.type)} · contact #${contact.id} · ${matches.length} shipment(s) in your organisation`, [
      chip(contact.type, contact.type === 'corporation' ? 'violet' : 'grey'),
      contact.archived ? chip('archived', 'grey') : chip('active', 'green'),
      btn('My contacts', { size:'sm', iconName:'user', onClick:() => { location.hash = '#/contacts'; } }),
      can('participations_write') ? btn('Edit contact', { kind:'primary', size:'sm', iconName:'gear', onClick:() => toast(`PUT /api/contacts/${contact.id} (mock)`, 'good') }) : null,
    ]),
    h('div', { class:'grid cols-2' }, detailsCard, addressesCard),
    h('div', { style:{ marginTop:'14px' } }, shipmentsCard));
}
/** loose name match used for the participation search */
function loose(name, needle) {
  if (!needle) return false;
  const n = norm(name);
  if (!n) return false;
  return n === needle || n.includes(needle) || (needle.length > 4 && needle.includes(n) && n.length > 4);
}

/* ================================================================= 403 */
export function forbidden() {
  const role = state.role;
  const groups = Object.entries(PERMISSIONS).map(([group, perms]) => ({
    group, total:perms.length, granted:perms.filter(p => can(p)).length,
  }));
  const granted = PERMISSION_LIST.filter(p => can(p));
  const missing = PERMISSION_LIST.filter(p => !can(p));
  const isSuper = SUPER_ROLES.includes(role);
  const allGranted = granted.length === PERMISSION_LIST.length;

  return h('div', null,
    pageHeadEx('403 — Access denied', `The route you asked for is not available to the role “${titleCase(role)}”`, [
      chip('RBAC', 'violet'),
      chip(`role: ${role}`, 'grey'),
      btn('My Shipments', { size:'sm', iconName:'ship', onClick:() => { location.hash = '#/deals'; } }),
    ]),
    h('div', { style:{ maxWidth:'880px', margin:'0 auto' } },
      card(null, h('div', { class:'panel-body' }, emptyState(
        'Your role does not grant access to this page',
        `You are signed in as ${CURRENT_USER.name} with the role ${titleCase(role)}${isSuper ? ' (super-role — every permission is granted)' : ''}. ${allGranted
          ? `Your role grants all ${PERMISSION_LIST.length} permissions in the model, so nothing is actually hidden from you — this screen only shows because the URL was opened directly.`
          : `Your role holds ${granted.length} of the ${PERMISSION_LIST.length} permissions in the model; the missing ones are listed below.`} The real router resolves the same RBAC rules before it renders a route, so a bookmarked URL like this one shows this page instead of the module.`,
        [btn('Back to My Shipments', { kind:'primary', iconName:'ship', onClick:() => { location.hash = '#/deals'; } }),
          btn('Switch role from the avatar menu', { iconName:'user', onClick:() => toast('Open the avatar menu (top right of the topbar) and pick another role — navigation and actions change immediately.', 'info') })])))),
      h('div', { class:'grid cols-2', style:{ marginTop:'14px' } },
        card('Current session', h('div', { class:'panel-body' }, h('div', { class:'stack' },
          kv([
            ['Signed in as', CURRENT_USER.name],
            ['Email', CURRENT_USER.email],
            ['Role', chip(titleCase(role), isSuper ? 'violet' : 'blue')],
            ['ACL code', chip(CURRENT_USER.aclCode, 'violet')],
            ['Organisation', CURRENT_USER.organization],
            ['Super-roles', SUPER_ROLES.map(r => chip(r, 'grey'))],
            ['Role catalogue', ROLES.map(r => chip(r, r === role ? 'blue' : 'grey'))],
            ['ACL codes', ACL_CODES.map(a => chip(a, a === 'FULL_ACCESS' ? 'green' : a === 'LIMITED' ? 'amber' : 'red'))],
          ]),
          h('div', { class:'section-title' }, 'Entitlements'),
          h('div', { class:'row wrap' }, ENTITLEMENTS.slice(0, 8).map(e => chip(e.label, state.entitlements[e.key] === false ? 'grey' : 'teal')))))),
        card('Permission model', h('div', { class:'panel-body' }, h('div', { class:'stack' },
          h('div', { class:'row' },
            h('span', { class:'tiny muted', style:{ width:'120px' } }, 'Granted'),
            h('div', { style:{ flex:1 } }, progress((granted.length / Math.max(1, PERMISSION_LIST.length)) * 100, 'green-500')),
            h('b', null, `${granted.length}/${PERMISSION_LIST.length}`)),
          h('div', { class:'row' },
            h('span', { class:'tiny muted', style:{ width:'120px' } }, 'Missing'),
            h('div', { style:{ flex:1 } }, progress((missing.length / Math.max(1, PERMISSION_LIST.length)) * 100, 'orange-600')),
            h('b', null, String(missing.length))),
          h('div', { class:'tiny muted' }, 'Permissions are grouped by module; the detail table below lists every permission the client knows about.')))),
      h('div', { style:{ marginTop:'14px' } },
        card(`Permissions for the role “${titleCase(role)}”`, h('div', { class:'panel-body' }, h('div', { class:'stack' },
          table([
            { key:'group', label:'Module', render:g => h('b', null, titleCase(g.group)) },
            { key:'total', label:'Permissions', num:true },
            { key:'granted', label:'Granted', num:true, render:g => chip(`${g.granted}/${g.total}`, g.granted === g.total ? 'green' : g.granted ? 'amber' : 'red') },
            { key:'bar', label:'', render:g => h('div', { style:{ minWidth:'160px' } }, progress((g.granted / Math.max(1, g.total)) * 100, g.granted === g.total ? 'green-500' : g.granted ? 'blue-500' : 'orange-600')) },
          ], groups),
          h('div', { class:'section-title' }, 'Every permission'),
          table([
            { key:'code', label:'Permission', mono:true },
            { key:'state', label:'State', render:p => can(p.code) ? chip('granted', 'green') : chip('denied', 'red') },
          ], PERMISSION_LIST.map(code => ({ code })), { maxHeight:'320px' })))))),
  );
}
