/**
 * The shipment plan & tracking sub-screens, mirroring the real route tree:
 *   deals/:ref/plan/vessel/search  — vessel/schedule search scoped to the deal's lane
 *   deals/:ref/plan/calendar       — month calendar of the deal's key dates
 *   deals/:ref/tracking-v1         — the previous tracking version
 *                                    (feature flag enable-access-tracking-previous-version)
 *
 * Each export takes no arguments and reads `state.route.params` itself, exactly like
 * the workspace views do. All components come from the shared kit (Semantic UI markup);
 * no page-specific CSS is added.
 */
import {
  h, btn, chip, table, card, kpi, kv, toast, openDrawer, closeDrawer, alert, field, select,
  toggle, fmtDate, fmtDateTime, fmtNum, fmtMoney, fmtCo2, titleCase, rel,
} from '../ui.js';
import { findShipment, searchSchedules, ALL_PORTS } from '../data.js';
import {
  COMPARE_ATTRS, PORT_CALL_FIELDS, TRACKING_STATUS_LABEL, TRACKING_STATUS_TONE, CO2_SOURCES,
} from '../enums.js';
import { state, can } from '../app.js';

/* ------------------------------------------------------------------ shared */
const rerenderPlan = () => import('../app.js').then(m => m.navigate(m.parseHash()));
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoDay(new Date());
/** split a wire date ("2026-04-18" or an ISO timestamp) without a timezone shift */
const parts = (v) => { const [y, m, d] = String(v).slice(0, 10).split('-').map(Number); return { y, m, d }; };
const dayKey = (v) => { const { y, m, d } = parts(v); return `${y}-${pad(m)}-${pad(d)}`; };

function notFoundPlan(ref) {
  return h('div', { class:'ui segment panel' }, h('div', { class:'panel-body' },
    h('div', { class:'empty-state' }, h('div', { class:'big' }, `Shipment ${ref} not found`),
      h('div', null, 'It may not be in the mock dataset (84 shipments, LH24000001–LH24000084).'),
      btn('Back to My Shipments', { kind:'primary', onClick:() => location.hash = '#/deals' }))));
}

/** page head + crumbs back to the shipment, like the workspace header */
function planHead(s, title, sub, actions) {
  return h('div', null,
    h('div', { class:'crumbs' },
      h('a', { href:'#/deals' }, 'My Shipments'), ' / ',
      h('a', { href:`#/deals/${s.shipmentRef}/summary` }, s.shipmentRef), ' / ',
      h('span', null, title)),
    h('div', { class:'page-head' },
      h('div', null,
        h('div', { class:'page-title' }, title),
        h('div', { class:'page-sub' }, sub)),
      h('div', { class:'page-actions' }, actions)));
}

const lane = (s) => h('span', null,
  h('span', { class:'mono' }, `${s.polUnlocode} → ${s.podUnlocode}`), ' · ',
  s.carrierName, ' · ',
  `${s.containerCount} × ${s.containerSize}${s.containerType === 'DRY' ? '' : ' ' + titleCase(s.containerType)}`,
  ' · ', `${s.teu} TEU`, ' · ',
  s.vesselName ? `${s.vesselName} ${s.voyageNumber || ''}` : 'vessel not assigned');

const backToSummary = (s) => btn('Back to summary', { size:'sm', iconName:'arrowLeft',
  onClick:() => location.hash = `#/deals/${s.shipmentRef}/summary` });

const STAGE_TONE = { origin:'blue', destination:'teal', customs:'violet', any:'grey' };

/* ============================ VESSEL SEARCH ============================ */
/** module-level filter/search state — survives re-renders, keyed by shipment ref */
const vs = {
  ref:null, pol:'', pod:'', containers:1, etd:'', maxTransit:'', directOnly:false,
  sort:'cost', compare:new Set(), results:null,
};

export function vesselSearch() {
  const ref = state.route.params.ref;
  const s = findShipment(ref);
  if (!s) return notFoundPlan(ref);

  if (vs.ref !== s.shipmentRef) {
    vs.ref = s.shipmentRef;
    vs.pol = s.polUnlocode; vs.pod = s.podUnlocode; vs.containers = s.containerCount;
    vs.etd = today(); vs.maxTransit = ''; vs.directOnly = false; vs.sort = 'cost';
    vs.compare = new Set(); vs.results = null;
  }
  if (!vs.results) vs.results = searchSchedules({ pol:vs.pol, pod:vs.pod, containers:vs.containers });

  const refetch = () => {
    vs.results = searchSchedules({ pol:vs.pol, pod:vs.pod, containers:vs.containers });
    vs.compare = new Set();
    rerenderPlan();
  };

  let options = vs.results.filter(r => !vs.directOnly || r.direct);
  if (vs.etd) options = options.filter(r => r.etd >= vs.etd);
  if (vs.maxTransit) options = options.filter(r => r.transitTimeInDays <= +vs.maxTransit);
  options = options.slice().sort((a, b) =>
    vs.sort === 'co2' ? a.totalCo2GPerTeu - b.totalCo2GPerTeu
    : vs.sort === 'transit' ? a.transitTimeInDays - b.transitTimeInDays
    : vs.sort === 'delay' ? a.avgDelayEtaAtaDays - b.avgDelayEtaAtaDays
    : a.cost - b.cost);

  const direct = options.filter(r => r.direct).length;
  const cheapest = options.length ? Math.min(...options.map(r => r.cost)) : null;
  const fastest = options.length ? Math.min(...options.map(r => r.transitTimeInDays)) : null;
  const greenest = options.length ? Math.min(...options.map(r => r.totalCo2GPerTeu)) : null;

  const cols = [
    { key:'carrier', label:'Carrier', render:r => h('span', { class:'row' },
      h('i', { style:{ width:'8px', height:'8px', borderRadius:'50%', background:r.color, display:'inline-block' } }),
      h('span', { class:'nowrap' }, r.carrier),
      h('span', { class:'tiny muted mono' }, r.carrierScac)) },
    { key:'serviceName', label:'Service' },
    { key:'routing', label:'Routing', render:r => h('span', { class:'mono' },
      `${r.pol} → ${r.transshipments.length ? r.transshipments.join(' → ') + ' → ' : ''}${r.pod}`) },
    { key:'direct', label:'Direct', render:r => r.direct ? chip('direct', 'green') : chip(`${r.transshipments.length} TS`, 'amber') },
    { key:'vessel', label:'Vessel / voyage', render:r => h('span', { class:'nowrap' }, `${r.firstVesselName} `, h('span', { class:'mono' }, r.firstVoyageNumber)) },
    { key:'etd', label:'ETD', render:r => h('span', { class:'nowrap' }, fmtDate(r.etd), r.manualUpdate ? chip('manual', 'grey') : null) },
    { key:'eta', label:'ETA', render:r => h('span', { class:'nowrap' }, fmtDate(r.eta), r.etaComputed !== r.eta ? h('span', { class:'tiny muted' }, ` (${fmtDate(r.etaComputed)})`) : null) },
    { key:'transitTimeInDays', label:'Transit', num:true, render:r => `${r.transitTimeInDays} d` },
    { key:'totalCo2GPerTeu', label:'CO₂ / TEU', num:true, render:r => h('span', { class:'nowrap' }, fmtCo2(r.totalCo2GPerTeu), h('span', { class:'tiny muted' }, ` ${r.co2Source}`)) },
    { key:'avgDelayEtaAtaDays', label:'Avg delay', num:true, render:r => h('span', r.avgDelayEtaAtaDays > 1.5 ? { style:{ color:'var(--red-600)' } } : null,
      `${r.avgDelayEtaAtaDays > 0 ? '+' : ''}${r.avgDelayEtaAtaDays} d`) },
    { key:'allocations', label:'Allocation', render:r => r.allocations.overflow ? chip('overflow', 'red')
      : chip(`${r.allocations.remaining} left`, r.allocations.remaining > 20 ? 'green' : 'amber') },
    { key:'source', label:'Source', render:r => chip(titleCase(r.source), r.source === 'contract' ? 'violet' : r.source === 'routing_algo' ? 'teal' : 'grey') },
    { key:'isFakeSchedule', label:'Quality', render:r => r.isFakeSchedule ? chip('fake schedule', 'red') : chip('ok', 'green') },
    { key:'cost', label:'Cost', num:true, render:r => h('b', null, fmtMoney(r.cost, r.currency)) },
    { key:'actions', label:'', render:r => btn('Select vessel', { size:'sm', kind:'primary', iconName:'check',
      onClick:() => selectVessel(s, r) }) },
  ];

  const picked = [...vs.compare].map(i => options.find(r => r.index === i)).filter(Boolean);
  const compared = picked.length ? picked : options.slice(0, 3);

  return h('div', null,
    planHead(s, 'Vessel & schedule search', h('span', null, lane(s), ' · options ranked on the deal lane'),
      [backToSummary(s),
        btn('Search options', { kind:'primary', size:'sm', iconName:'search', onClick:refetch })]),

    card(null, h('div', { class:'panel-body' }, h('div', { class:'filters' },
      field('POL', select(ALL_PORTS.map(p => ({ value:p.loc, label:`${p.loc} — ${p.name}` })), vs.pol,
        v => { vs.pol = v; refetch(); })),
      field('POD', select(ALL_PORTS.map(p => ({ value:p.loc, label:`${p.loc} — ${p.name}` })), vs.pod,
        v => { vs.pod = v; refetch(); })),
      field('Containers', h('input', { type:'number', min:'1', value:vs.containers,
        onInput:e => { vs.containers = +e.target.value || 1; } })),
      field('Earliest ETD', h('input', { type:'date', value:vs.etd,
        onChange:e => { vs.etd = e.target.value; rerenderPlan(); } })),
      field('Max transit', h('input', { type:'number', placeholder:'days', value:vs.maxTransit,
        onInput:e => { vs.maxTransit = e.target.value; rerenderPlan(); } })),
      field('Sort by', select([
        { value:'cost', label:'Cost' }, { value:'transit', label:'Transit time' },
        { value:'co2', label:'CO₂ / TEU' }, { value:'delay', label:'Average delay' },
      ], vs.sort, v => { vs.sort = v; rerenderPlan(); })),
      h('div', { class:'field' }, h('label', null, ' '), h('div', { class:'row' },
        toggle(vs.directOnly, v => { vs.directOnly = v; rerenderPlan(); }, 'Direct only'),
        btn('Search', { kind:'primary', iconName:'search', onClick:refetch }))),
    ))),

    h('div', { class:'grid', style:{ gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', marginBottom:'14px' } },
      kpi('Options found', fmtNum(options.length)),
      kpi('Direct', fmtNum(direct), direct ? `${Math.round((direct / Math.max(1, options.length)) * 100)}% of the lane` : 'none on this lane'),
      kpi('Cheapest', cheapest == null ? '—' : fmtMoney(cheapest)),
      kpi('Fastest', fastest == null ? '—' : `${fastest} d`),
      kpi('Lowest CO₂ / TEU', greenest == null ? '—' : fmtCo2(greenest))),

    card(`Routing options (${options.length})`, table(cols, options, {
      maxHeight:'calc(100vh - 470px)', rowKey:r => r.index, selected:vs.compare,
      onSelect:next => { vs.compare = new Set(Array.isArray(next) ? next : [...next]); rerenderPlan(); },
      emptyText:'No schedule options for this lane and filter set',
    })),

    card('Compare options', h('div', { class:'stack' },
      h('div', { class:'tiny muted' },
        'Tick rows above to compare them — comparison attributes come from the shipped enum: ',
        COMPARE_ATTRS.map(a => a.id).join(', ')),
      compared.length
        ? table([
            { key:'attr', label:'Attribute' },
            ...compared.map((r, i) => ({
              key:'c' + i, label:`${r.carrierScac} · ${r.transitTimeInDays}d`, num:true, render:row => row['c' + i],
            })),
          ], compareMatrix(compared))
        : h('div', { class:'muted' }, 'No options to compare.'),
      h('div', { class:'row', style:{ marginTop:'10px' } },
        btn('Compare selected', { size:'sm', onClick:() => toast(`${picked.length} option(s) selected for comparison`, 'good') }),
        btn('Export options CSV', { size:'sm', iconName:'download',
          onClick:() => toast('Would export the routing options (mock)', 'good') }),
        btn('Pick the recommended option', { kind:'primary', size:'sm', iconName:'sparkle',
          onClick:() => options.length ? selectVessel(s, options[0]) : toast('No option to select', 'bad') })),
      alert('info', h('div', null,
        h('b', null, 'How the ranking works'),
        h('div', { class:'tiny' },
          'The real client queries the schedule search with the deal lane, the container count and the rate/contract scope, ',
          'then scores every option on cost, transit time, CO₂ (' + CO2_SOURCES.join(' / ') + ') and allocation availability.')))),
    ),
  );
}

function compareMatrix(opts) {
  if (!opts.length) return [];
  const row = (attr, fn) => {
    const out = { attr };
    opts.forEach((r, i) => { out['c' + i] = fn(r); });
    return out;
  };
  return [
    row('Carrier', r => `${r.carrier} (${r.carrierScac})`),
    row('Routing', r => `${r.pol} → ${r.transshipments.length ? r.transshipments.join(' → ') + ' → ' : ''}${r.pod}`),
    row('Transhipments', r => String(r.transshipments.length)),
    row('Vessel / voyage', r => `${r.firstVesselName} ${r.firstVoyageNumber}`),
    row('Service', r => r.serviceName),
    row('ETD → ETA', r => `${fmtDate(r.etd)} → ${fmtDate(r.eta)}`),
    row('Transit time', r => `${r.transitTimeInDays} d`),
    row('CO₂ / TEU', r => `${fmtNum(r.totalCo2GPerTeu)} g`),
    row('Δ ETA / ATA', r => `${r.avgDelayEtaAtaDays > 0 ? '+' : ''}${r.avgDelayEtaAtaDays} d`),
    row('Allocation', r => r.allocations.overflow ? 'overflow' : `${r.allocations.remaining} left of ${r.allocations.pool}`),
    row('Source', r => titleCase(r.source)),
    row('Cost', r => fmtMoney(r.cost, r.currency)),
  ];
}

function selectVessel(s, r) {
  toast(`Vessel ${r.firstVesselName} ${r.firstVoyageNumber} on ${r.carrier} selected (mock)`, 'good');
  openDrawer('Confirm vessel selection', h('div', { class:'stack' },
    alert('info', h('div', null,
      h('b', null, `${r.firstVesselName} ${r.firstVoyageNumber} — ${r.carrier}`),
      h('div', { class:'tiny' },
        'The real product attaches the chosen routing option to the shipment and re-opens the booking request ',
        'with the schedule snapshot (POST /api/shipments/{shipment_ref}/booking/request).'))),
    kv([
      ['Shipment', h('span', { class:'mono' }, s.shipmentRef)],
      ['Lane', h('span', { class:'mono' }, `${r.pol} → ${r.pod}`)],
      ['Routing', h('span', { class:'mono' }, r.transshipments.length ? r.transshipments.join(' → ') : 'direct')],
      ['ETD → ETA', `${fmtDate(r.etd)} → ${fmtDate(r.eta)}`],
      ['Transit', `${r.transitTimeInDays} d`],
      ['CO₂ / TEU', `${fmtCo2(r.totalCo2GPerTeu)} (${r.co2Source})`],
      ['Average delay', `${r.avgDelayEtaAtaDays > 0 ? '+' : ''}${r.avgDelayEtaAtaDays} d`],
      ['Allocation', r.allocations.overflow ? chip('overflow', 'red') : chip(`${r.allocations.remaining} of ${r.allocations.pool}`, 'green')],
      ['Source', chip(titleCase(r.source), r.source === 'contract' ? 'violet' : r.source === 'routing_algo' ? 'teal' : 'grey')],
      ['Cost', h('b', null, fmtMoney(r.cost, r.currency))],
      ['Rate id', h('span', { class:'mono' }, String(r.rateId))],
      ['Transport contract', r.transportContractId ? h('span', { class:'mono' }, String(r.transportContractId)) : null],
    ]),
    h('div', { class:'section-title' }, 'Legs'),
    table([
      { key:'from', label:'From', mono:true }, { key:'to', label:'To', mono:true },
      { key:'departure', label:'Departure', render:x => fmtDate(x.departure) },
      { key:'arrival', label:'Arrival', render:x => fmtDate(x.arrival) },
      { key:'transitDays', label:'Transit', num:true, render:x => `${x.transitDays} d` },
      { key:'transportMode', label:'Mode', render:x => chip(x.transportMode, x.transportMode === 'SEA' ? 'blue' : 'violet') },
      { key:'co2G', label:'CO₂', num:true, render:x => fmtCo2(x.co2G) },
    ], r.legs, { emptyText:'Direct sailing — no legs to show' }),
    h('div', { class:'row' },
      can('ocean_plan_write')
        ? btn('Confirm selection', { kind:'primary', onClick:() => { closeDrawer(); toast(`Routing option attached to ${s.shipmentRef} (mock)`, 'good'); } })
        : null,
      btn('Open shipment summary', { size:'sm', iconName:'arrowLeft',
        onClick:() => { closeDrawer(); location.hash = `#/deals/${s.shipmentRef}/summary`; } }),
      h('div', { class:'spacer' }),
      btn('Close', { size:'sm', onClick:closeDrawer })),
  ));
}

/* ============================= PLAN CALENDAR ============================ */
/** the deal's own date fields, in the vocabulary the workspace summary uses */
const PLAN_DATES = [
  ['cargoReadinessDate', 'Cargo readiness', 'Cargo ready', 'teal'],
  ['departure', 'ETD (departure)', 'ETD', 'blue'],
  ['arrival', 'ETA (arrival)', 'ETA', 'green'],
  ['documentCutoffDate', 'Document cutoff', 'Doc cutoff', 'violet'],
  ['vgmCutoffDate', 'VGM cutoff', 'VGM cutoff', 'amber'],
  ['cutoffDate', 'Terminal cutoff', 'Terminal cutoff', 'red'],
  ['wishedEmptyPickupDate', 'Wished empty pickup', 'Empty pickup', 'grey'],
  ['wishedFinalDeliveryDate', 'Wished final delivery', 'Final delivery', 'grey'],
];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const cal = { ref:null, y:0, m:0 };

const planDates = (s) => PLAN_DATES
  .filter(([key]) => s[key])
  .map(([key, label, short, tone]) => ({ key, label, short, tone, date:dayKey(s[key]) }))
  .sort((a, b) => a.date.localeCompare(b.date));

export function planCalendar() {
  const ref = state.route.params.ref;
  const s = findShipment(ref);
  if (!s) return notFoundPlan(ref);

  const dates = planDates(s);
  if (cal.ref !== s.shipmentRef) {
    cal.ref = s.shipmentRef;
    // open on the month the plan starts in (cargo readiness / wished empty pickup),
    // not on the ETD — the cutoffs sit before departure
    const anchor = parts((dates[0] && dates[0].date) || s.departure || s.createdAt);
    cal.y = anchor.y; cal.m = anchor.m - 1;
  }
  const shift = (n) => {
    const d = new Date(cal.y, cal.m + n, 1);
    cal.y = d.getFullYear(); cal.m = d.getMonth();
    rerenderPlan();
  };
  const goToday = () => { const t = new Date(); cal.y = t.getFullYear(); cal.m = t.getMonth(); rerenderPlan(); };
  const goEtd = () => { const d = parts(s.departure); cal.y = d.y; cal.m = d.m - 1; rerenderPlan(); };

  const firstOfMonth = new Date(cal.y, cal.m, 1);
  const monthLabel = firstOfMonth.toLocaleDateString('en-GB', { month:'long', year:'numeric' });
  const daysInMonth = new Date(cal.y, cal.m + 1, 0).getDate();
  const leading = (firstOfMonth.getDay() + 6) % 7;          // Monday-first
  const byDay = {};
  dates.forEach(d => { (byDay[d.date] = byDay[d.date] || []).push(d); });
  const todayKey = today();

  const cell = (dt, opts = {}) => {
    const key = isoDay(dt);
    const chips = byDay[key] || [];
    const isToday = !opts.blank && key === todayKey;
    return h('div', {
      style:{
        minHeight:'98px', padding:'6px', borderRadius:'4px', display:'flex', flexDirection:'column', gap:'3px',
        border:'1px solid ' + (isToday ? 'var(--blue-500)' : 'var(--border)'),
        background: opts.blank ? 'var(--grey-50)' : (chips.length ? 'var(--blue-25)' : '#fff'),
        opacity: opts.blank ? .55 : 1,
      },
      title: chips.length ? chips.map(c => `${c.label}: ${fmtDate(c.date)}`).join('\n') : null,
    },
      h('div', { class:'tiny ' + (isToday ? '' : 'muted'), style:{ textAlign:'right', fontWeight:isToday ? 700 : 400 } }, String(dt.getDate())),
      chips.map(c => {
        const el = chip(c.short, c.tone);
        el.style.margin = '0';
        el.style.whiteSpace = 'normal';
        el.style.lineHeight = '1.15';
        el.style.maxWidth = '100%';
        return el;
      }));
  };

  const cells = [];
  for (let i = leading; i > 0; i--) cells.push(cell(new Date(cal.y, cal.m, 1 - i), { blank:true }));
  for (let day = 1; day <= daysInMonth; day++) cells.push(cell(new Date(cal.y, cal.m, day)));
  const trailing = (7 - ((leading + daysInMonth) % 7)) % 7;
  for (let day = 1; day <= trailing; day++) cells.push(cell(new Date(cal.y, cal.m + 1, day), { blank:true }));

  const monthCard = card(`${monthLabel}${cal.y === new Date().getFullYear() && cal.m === new Date().getMonth() ? ' · current month' : ''}`,
    h('div', { class:'stack' },
      h('div', { style:{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', gap:'6px' } },
        DOW.map(d => h('div', { class:'tiny muted', style:{ textAlign:'center', fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px' } }, d)),
        cells),
      h('div', { class:'row', style:{ marginTop:'8px', flexWrap:'wrap' } },
        h('span', { class:'tiny muted' }, 'Legend:'),
        PLAN_DATES.map(([key, , short, tone]) => chip(short, tone))),
      h('div', { class:'tiny muted' },
        `${dates.length} key date(s) on ${s.shipmentRef} · all dates are the deal's own wire fields (cargo readiness, ETD/ETA, cutoffs, wished dates)`)),
    [btn('← Prev', { size:'sm', onClick:() => shift(-1) }),
      btn('Today', { size:'sm', onClick:goToday }),
      btn('Jump to ETD', { size:'sm', onClick:goEtd }),
      btn('Next →', { size:'sm', onClick:() => shift(1) })]);

  const upNext = dates.find(d => d.date >= todayKey);
  const sidebar = h('div', { class:'stack' },
    card('Key dates in order', kv(dates.map(d => [d.label,
      h('div', null,
        h('b', null, fmtDate(d.date)),
        h('span', { class:'tiny muted' }, ` · ${rel(d.date)}`),
        d.key === 'departure' || d.key === 'arrival' ? chip(d.short, d.tone) : null)]))),
    card('Next milestone', h('div', { class:'stack' },
      upNext
        ? kv([
            ['Milestone', chip(upNext.short, upNext.tone)],
            ['Date', h('b', null, fmtDate(upNext.date))],
            ['Countdown', rel(upNext.date)],
            ['Lane', h('span', { class:'mono' }, `${s.polUnlocode} → ${s.podUnlocode}`)],
          ])
        : h('div', { class:'muted' }, 'Every planned date is in the past.'),
      alert('info', 'Cutoffs are set by the carrier on the booking confirmation; the wished dates are the shipper’s targets.'))));

  return h('div', null,
    planHead(s, 'Plan calendar', h('span', null, lane(s), ' · key dates for this shipment'),
      [backToSummary(s),
        btn('Vessel search', { size:'sm', iconName:'search', onClick:() => location.hash = `#/deals/${s.shipmentRef}/plan/vessel/search` }),
        btn('Back to this month', { size:'sm', iconName:'calendar', onClick:goToday })]),
    h('div', { class:'grid', style:{ gridTemplateColumns:'minmax(0,2.4fr) minmax(0,1fr)', alignItems:'start' } },
      monthCard, sidebar));
}

/* =========================== TRACKING (legacy) ========================== */
/** shipment port-call field -> the tracking event code that fills it */
const FIELD_CODE = {
  originEmptyPickupTime:'PICK', originGateInTime:'GTIN', originLoadingTime:'LOAD',
  originDepartureFromPolTime:'DEPA', destinationArrivalAtPodTime:'ARRI',
  destinationDischargeTime:'DISC', destinationGateOutTime:'GTOT', destinationEmptyReturnTime:'DROP',
};

export function trackingLegacy() {
  const ref = state.route.params.ref;
  const s = findShipment(ref);
  if (!s) return notFoundPlan(ref);

  const events = s.events.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const estimated = events.filter(e => e.estimated).length;
  const delayed = events.filter(e => e.delayDays).length;
  const withContainer = events.filter(e => e.container).length;
  const modernLink = `#/deals/${s.shipmentRef}/tracking`;

  const cols = [
    { key:'code', label:'Code', mono:true },
    { key:'label', label:'Milestone' },
    { key:'stage', label:'Stage', render:r => chip(r.stage, STAGE_TONE[r.stage] || 'grey') },
    { key:'unlocode', label:'Location', mono:true },
    { key:'facility', label:'Facility', render:r => r.facility || h('span', { class:'muted' }, '—') },
    { key:'timestamp', label:'Timestamp', render:r => h('span', { class:'nowrap' }, fmtDateTime(r.timestamp),
      r.estimated ? chip('estimated', 'amber') : null) },
    { key:'delayDays', label:'Delay', num:true, render:r => r.delayDays ? chip(`+${r.delayDays} d`, 'red') : h('span', { class:'muted' }, 'on time') },
    { key:'provider', label:'Provider', render:r => chip(r.provider, 'teal') },
    { key:'source', label:'Source', render:r => chip(r.source, r.source === 'manual' ? 'violet' : r.source === 'carrier' ? 'blue' : 'grey') },
    { key:'container', label:'Container', mono:true, render:r => r.container || h('span', { class:'muted' }, '—') },
  ];

  /* the plain container-milestone grid the previous version rendered */
  const gridCols = [
    { key:'milestone', label:'Milestone' },
    ...s.containers.map(c => ({
      key:c.identificationNumber, label:c.identificationNumber, mono:true,
      render:row => row[c.identificationNumber],
    })),
  ];
  const gridRows = PORT_CALL_FIELDS.map(([key, label]) => {
    const code = FIELD_CODE[key];
    const row = { milestone: h('span', null, label, ' ', h('span', { class:'tiny mono muted' }, code)) };
    s.containers.forEach(c => {
      const e = s.events.find(x => x.container === c.identificationNumber && x.code === code);
      row[c.identificationNumber] = e
        ? h('span', { class:'nowrap' }, fmtDate(e.timestamp), e.delayDays ? chip(`+${e.delayDays} d`, 'red') : null)
        : (s.portCalls[key] ? h('span', { class:'muted' }, fmtDate(s.portCalls[key])) : h('span', { class:'muted' }, '—'));
    });
    return row;
  });

  return h('div', null,
    planHead(s, 'Tracking — previous version', h('span', null, lane(s), ' · legacy table view ',
      chip(TRACKING_STATUS_LABEL[s.currentTrackingStatus], TRACKING_STATUS_TONE[s.currentTrackingStatus])),
      [backToSummary(s),
        btn('Open current tracking', { kind:'primary', size:'sm', iconName:'link',
          onClick:() => location.hash = modernLink })]),

    alert('info', h('div', null,
      h('b', null, 'You are viewing the previous tracking version'),
      h('div', { class:'tiny' },
        'This screen is the legacy rendering, kept in the real product behind the feature flag ',
        h('span', { class:'mono' }, 'enable-access-tracking-previous-version'),
        '. It lists the raw aggregated tracking events as a flat table instead of the modern timeline; ',
        'the current view is at ',
        h('a', { href:modernLink }, modernLink), '.')),
      h('div', { class:'row', style:{ marginTop:'6px' } },
        btn('Go to the current tracking view', { size:'sm', kind:'primary', iconName:'link',
          onClick:() => location.hash = modernLink }),
        btn('Dismiss and stay on the legacy version', { size:'sm',
          onClick:() => toast('The previous version stays active for this session (mock)', 'good') }))),

    h('div', { class:'grid', style:{ gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', marginBottom:'14px' } },
      kpi('Tracking events', fmtNum(events.length)),
      kpi('Estimated', fmtNum(estimated), estimated ? 'not yet actual' : 'all actual'),
      kpi('Events with delay', fmtNum(delayed), delayed ? 'late against plan' : 'on plan', delayed ? 'down' : 'up'),
      kpi('Container-linked', fmtNum(withContainer)),
      kpi('Tracking status', TRACKING_STATUS_LABEL[s.currentTrackingStatus]),
      kpi('Provider', s.trackingProvider)),

    card(`Tracking events (${events.length})`, table(cols, events, {
      maxHeight:'calc(100vh - 480px)', emptyText:'No tracking events received for this shipment',
    })),

    card(`Container milestones (${s.containers.length} container(s))`, h('div', null,
      table(gridCols, gridRows, { emptyText:'No containers on this shipment' }),
      h('div', { class:'tiny muted', style:{ marginTop:'8px' } },
        'Plain grid: rows are the port-call fields (' + PORT_CALL_FIELDS.map(([, l]) => l).join(', ') + '), ',
        'columns are the containers; a cell shows the event recorded for that container, falling back to the shipment port call.'))),

    card('Provider & source breakdown', h('div', { class:'stack' },
      table([
        { key:'provider', label:'Provider', render:r => chip(r.provider, 'teal') },
        { key:'events', label:'Events', num:true },
        { key:'last', label:'Last event', render:r => fmtDateTime(r.last) },
        { key:'sources', label:'Sources', render:r => r.sources.join(', ') },
      ], providerBreakdown(events), { emptyText:'No providers reported events' }),
      alert('warn', 'The previous version has no alias resolution: the same milestone can appear several times under different providers.'))));
}

function providerBreakdown(events) {
  const map = new Map();
  for (const e of events) {
    const row = map.get(e.provider) || { provider:e.provider, events:0, last:e.timestamp, sources:new Set() };
    row.events += 1;
    if (e.timestamp > row.last) row.last = e.timestamp;
    row.sources.add(e.source);
    map.set(e.provider, row);
  }
  return [...map.values()]
    .map(r => ({ ...r, sources:[...r.sources] }))
    .sort((a, b) => b.events - a.events);
}
