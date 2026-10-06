/**
 * Shipment workspace — the deal detail screen with its lifecycle tabs and
 * the seven operations sub-modules, mirroring the real route tree:
 *   deals/:id/{summary,requirements,tracking,containers,documents,deviations,comments,tasks}
 *   deals/:id/operations/{booking,vgm-declaration,shipping-instructions,export-filing,
 *                         empty-release-order,customs-and-filings,bill-of-lading}
 */
import {
  h, mount, icon, btn, chip, table, card, kv, tabs, toast, openDrawer, closeDrawer, alert,
  timeline, field, select, toggle, fmtDate, fmtDateTime, fmtNum, fmtMoney, fmtWeight, fmtVolume, fmtCo2, randInt,
  titleCase, download, downloadCsv, progress, ago, rel, timeline as tl,
} from '../ui.js';
import { findShipment, SHIPMENTS, ALL_PORTS } from '../data.js';
import {
  BOOKING_STATE_LABEL, BOOKING_STATE_TONE, TRACKING_STATUS_LABEL, TRACKING_STATUS_TONE,
  SI_STATE_LABEL, SI_STATE_TONE, VGM_STATE_LABEL, VGM_STATE_TONE, EVENT_CODES,
  CHARGE_CODES, PORT_CALL_FIELDS, BL_RULE_MESSAGE, DEVIATION_TYPES, TASK_TYPES, DOCUMENT_TYPES,
} from '../enums.js';
import { state, can } from '../app.js';

const TABS = [
  { id:'summary', label:'Summary' },
  { id:'requirements', label:'Requirements' },
  { id:'tracking', label:'Tracking' },
  { id:'containers', label:'Containers & cargo' },
  { id:'documents', label:'Documents' },
  { id:'deviations', label:'Deviations' },
  { id:'comments', label:'Comments' },
  { id:'tasks', label:'Tasks' },
];
const OPS = [
  { id:'booking', label:'Booking' },
  { id:'vgm-declaration', label:'VGM declaration' },
  { id:'shipping-instructions', label:'Shipping instructions' },
  { id:'export-filing', label:'Export filing' },
  { id:'empty-release-order', label:'Empty release order' },
  { id:'customs-and-filings', label:'Customs & filings' },
  { id:'bill-of-lading', label:'Bill of lading' },
];

export function renderWorkspace() {
  const { ref, tab } = state.route.params;
  const s = findShipment(ref);
  if (!s) return notFound(ref);
  const body = tab.startsWith('operations/') ? operationView(s, tab.split('/')[1])
    : tab === 'operations' ? operationView(s, 'booking')
    : (TAB_VIEWS[tab] || TAB_VIEWS.summary)(s);
  return h('div', null, header(s), roadmap(s), lifecycleAlerts(s), tabBar(s, tab), h('div', { class:'tabpanel' }, body));
}

function notFound(ref) {
  return h('div', { class:'ui segment panel' }, h('div', { class:'panel-body' },
    h('div', { class:'empty-state' }, h('div', { class:'big' }, `Shipment ${ref} not found`),
      h('div', null, 'It may not be in the mock dataset (84 shipments, LH24000001–LH24000084).'),
      btn('Back to My Shipments', { kind:'primary', onClick:() => location.hash = '#/deals' }))));
}

/* ------------------------------------------------------------------ header */
function header(s) {
  const tab = state.route.params.tab;
  return h('div', null,
    h('div', { class:'crumbs' }, h('a', { href:'#/deals' }, 'My Shipments'), ' / ', h('span', null, s.shipmentRef)),
    h('div', { class:'page-head' },
      h('div', null,
        h('div', { class:'row', style:{ gap:'10px' } },
          h('div', { class:'page-title' }, s.shipmentRef),
          s.flag ? chip(s.flag === 1 ? 'Priority' : 'Watch', s.flag === 1 ? 'red' : 'amber') : null,
          chip(BOOKING_STATE_LABEL[s.bookingState], BOOKING_STATE_TONE[s.bookingState]),
          chip(TRACKING_STATUS_LABEL[s.currentTrackingStatus], TRACKING_STATUS_TONE[s.currentTrackingStatus]),
          s.archived ? chip('Archived', 'grey') : null),
        h('div', { class:'page-sub' },
          h('span', { class:'mono' }, `${s.polUnlocode} → ${s.podUnlocode}`),
          ' · ', s.carrierName, s.vesselName ? ` · ${s.vesselName} ${s.voyageNumber || ''}` : ' · vessel not assigned',
          ' · ', `${s.containerCount} × ${s.containerSize}${s.containerType === 'DRY' ? '' : ' ' + titleCase(s.containerType)}`,
          ' · ', `${s.teu} TEU`),
      ),
      h('div', { class:'page-actions' },
        btn('Share tracking link', { size:'sm', iconName:'link', onClick:() => shareLink(s) }),
        btn('Open B/L', { size:'sm', iconName:'file', onClick:() => location.hash = `#/deals/${s.shipmentRef}/operations/bill-of-lading` }),
        can('deal_write') ? btn('Edit', { size:'sm', iconName:'gear', onClick:() => toast('Edit drawer would open here', 'good') }) : null,
        btn('More', { size:'sm', onClick:() => moreMenu(s) }))),
  );
}

function shareLink(s) {
  const url = `${location.origin}${location.pathname}#/track-and-trace/${s.shipmentRef}?token=demo-share-token`;
  openDrawer('Share tracking link', h('div', { class:'stack' },
    alert('info', 'The real product mints this via GET /api/shipments/{shipment_ref}/tracking/shared-token and publishes a login-free page on the public share app.'),
    h('div', { class:'field' }, h('label', null, 'Public URL'), h('input', { type:'text', value:url, readOnly:true, style:{ minWidth:'100%' } })),
    h('div', { class:'row' }, btn('Copy', { size:'sm', iconName:'copy', onClick:() => { navigator.clipboard?.writeText(url); toast('Copied to clipboard', 'good'); } }),
      btn('Preview', { size:'sm', iconName:'link', onClick:() => { closeDrawer(); location.hash = `#/track-and-trace/${s.shipmentRef}?token=demo-share-token`; } })),
  ));
}

function moreMenu(s) {
  openDrawer('Actions', h('div', { class:'stack' },
    h('div', { class:'section-title' }, 'Shipment'),
    can('deal_duplicate') ? btn('Duplicate shipment', { onClick:() => { closeDrawer(); toast('Duplicated (mock)', 'good'); } }) : null,
    can('deal_split') ? btn('Split shipment', { onClick:() => { closeDrawer(); toast('Split into sub-shipments (mock)', 'good'); } }) : null,
    can('participations_set_acl') ? btn('Manage participants & ACL', { onClick:() => { closeDrawer(); participants(s); } }) : null,
    h('div', { class:'section-title' }, 'Data'),
    btn('Export shipment as JSON', { iconName:'download', onClick:() => { download(`${s.shipmentRef}.json`, JSON.stringify(s, null, 2)); toast('Exported JSON snapshot', 'good'); } }),
    btn('Export charges as CSV', { iconName:'download', onClick:() => { downloadCsv(`${s.shipmentRef}-charges.csv`, [{key:'code',label:'code'},{key:'label',label:'label'},{key:'basis',label:'basis'},{key:'currency',label:'currency'},{key:'amount',label:'amount'},{key:'payer',label:'payer'}], s.charges); toast('Exported charges.csv','good'); } }),
    h('div', { class:'section-title' }, 'Danger zone'),
    can('deal_cancel') ? btn('Cancel shipment', { kind:'danger', onClick:() => { closeDrawer(); toast('Cancel needs confirmation in the real product', 'bad'); } }) : null,
    can('deal_destroy') ? btn('Delete shipment', { kind:'danger', onClick:() => { closeDrawer(); toast('Delete needs confirmation', 'bad'); } }) : null,
  ));
}

function participants(s) {
  const cols = [
    { key:'name', label:'Participant' }, { key:'type', label:'Type' }, { key:'role', label:'Role' },
    { key:'aclCode', label:'ACL', render:r => chip(r.aclCode, r.aclCode === 'FULL_ACCESS' ? 'green' : r.aclCode === 'LIMITED' ? 'amber' : 'red') },
    { key:'isOwner', label:'Owner', render:r => r.isOwner ? chip('owner', 'violet') : '' },
    { key:'actions', label:'', render:r => h('div', { class:'row' }, btn('Set ACL', { size:'sm', onClick:() => toast(`ACL editor for ${r.name} (mock)`, 'good') }),
      !r.isOwner && can('participations_become_owner') ? btn('Become owner', { size:'sm', onClick:() => toast('Ownership transferred (mock)', 'good') }) : null) },
  ];
  openDrawer('Participants', h('div', { class:'stack' },
    alert('info', 'ACL codes are the real ones: RESTRICTED / LIMITED / FULL_ACCESS.'),
    table(cols, s.participations), btn('Add participant', { kind:'primary', iconName:'plus', onClick:() => toast('POST /api/shipments/{ref}/participations (mock)', 'good') })));
}

/* ----------------------------------------------------------------- roadmap */
function roadmap(s) {
  const stages = [
    { label:'Draft', done:s.bookingState !== 'draft' },
    { label:'Booking sent', done:['sent','confirmed','amend_requested'].includes(s.bookingState) },
    { label:'Booked', done:s.bookingState === 'confirmed' },
    { label:'SI', done:s.shippingInstructionsState === 'approved' },
    { label:'VGM', done:s.vgmDeclarationState === 'confirmed' },
    { label:'B/L', done:!!s.blNumber },
    { label:'Departed', done:!!s.portCalls.originDepartureFromPolTime },
    { label:'Arrived', done:!!s.portCalls.destinationArrivalAtPodTime },
    { label:'Delivered', done:!!s.portCalls.destinationGateOutTime },
  ];
  // highlight the next stage after the furthest completed one — a not-done stage in the
  // middle (e.g. a rejected SI) should not look like "where we are".
  const lastDone = stages.reduce((acc, st, i) => (st.done ? i : acc), -1);
  const currentIdx = lastDone + 1 < stages.length ? lastDone + 1 : -1;
  return h('div', { class:'ui segment panel', style:{ marginBottom:'14px' } }, h('div', { class:'panel-body' },
    h('div', { class:'roadmap' }, stages.map((st, i) => frag2(
      h('div', { class:`step ${st.done ? 'done' : i === currentIdx ? 'current' : 'pending'}` },
        h('div', { class:'node' }, st.done ? '✓' : String(i + 1)), h('div', { class:'tiny' }, st.label)),
      i < stages.length - 1 ? h('div', { class:`line ${st.done ? 'done' : ''}` }) : null)))));
}
const frag2 = (...k) => { const f = document.createDocumentFragment(); k.flat().filter(Boolean).forEach(x => f.appendChild(x)); return f; };

function lifecycleAlerts(s) {
  const out = [];
  if (s.blValidation?.blocking?.length) out.push(alert('bad', h('div', null,
    h('b', null, `${s.blValidation.blocking.length} blocking point${s.blValidation.blocking.length > 1 ? 's' : ''} on the bill of lading`),
    h('div', { class:'tiny', style:{ marginTop:'3px' } }, s.blValidation.blocking.map(BL_RULE_MESSAGE).join(' · ')),
    btn('Review', { size:'sm', onClick:() => location.hash = `#/deals/${s.shipmentRef}/operations/bill-of-lading`, style:{ marginTop:'6px' } }))));
  if (s.currentTrackingStatus === 'delayed') out.push(alert('warn', h('div', null,
    h('b', null, 'Vessel is running late'),
    h('div', { class:'tiny' }, `Booked ETA ${fmtDate(s.arrival)} · ${s.deviations.filter(d=>d.severity!=='info').length} deviation(s) recorded`))));
  const pending = s.tasks.filter(t => t.state === 'pending');
  if (pending.length) out.push(alert('info', h('div', null, h('b', null, `${pending.length} pending task(s)`),
    h('div', { class:'tiny' }, pending.map(t => t.label).join(' · ')))));
  if (!out.length) return null;
  return h('div', { class:'stack', style:{ marginBottom:'14px' } }, out);
}

/* ------------------------------------------------------------------ tabs */
function tabBar(s, tab) {
  const isOps = tab.startsWith('operations');
  const opId = isOps ? tab.split('/')[1] || 'booking' : null;
  return h('div', null,
    tabs([{ id:'overview', label:'Shipment' }, { id:'operations', label:'Operations' }],
      isOps ? 'operations' : 'overview',
      id => location.hash = `#/deals/${s.shipmentRef}/${id === 'operations' ? 'operations/' + (opId || 'booking') : 'summary'}`),
    isOps
      ? h('div', { class:'pill-nav', style:{ marginTop:'10px' } }, OPS.map(o =>
          h('button', { class:o.id === opId ? 'active' : '', onClick:() => location.hash = `#/deals/${s.shipmentRef}/operations/${o.id}` }, o.label)))
      : h('div', { class:'pill-nav', style:{ marginTop:'10px' } }, TABS.map(t =>
          h('button', { class:t.id === tab ? 'active' : '', onClick:() => location.hash = `#/deals/${s.shipmentRef}/${t.id}` }, t.label,
            t.id === 'deviations' && s.deviations.length ? h('span', { class:'muted' }, ` (${s.deviations.length})`) : null,
            t.id === 'documents' && s.documents.length ? h('span', { class:'muted' }, ` (${s.documents.length})`) : null,
            t.id === 'tasks' && s.tasks.filter(x=>x.state==='pending').length ? h('span', { class:'muted' }, ` (${s.tasks.filter(x=>x.state==='pending').length})`) : null))),
  );
}

/* --------------------------------------------------------------- overview */
const TAB_VIEWS = {
  summary: summaryView,
  requirements: requirementsView,
  tracking: trackingView,
  containers: containersView,
  documents: documentsView,
  deviations: deviationsView,
  comments: commentsView,
  tasks: tasksView,
};

function summaryView(s) {
  return h('div', { class:'grid cols-2' },
    card('Shipment', kv([
      ['Portside ref', h('span', { class:'mono' }, s.shipmentRef)],
      ['Deal id', s.dealId],
      ['External id', s.externalId],
      ['Booking number', h('span', { class:'mono' }, s.bookingNumber)],
      ['NVOCC booking', h('span', { class:'mono' }, s.nvoccBookingNumber)],
      ['B/L number', h('span', { class:'mono' }, s.blNumber)],
      ['Deal state', chip(titleCase(s.dealState), 'grey')],
      ['Created', fmtDate(s.createdAt)],
      ['Last update', ago(s.lastUpdate)],
      ['Tracking provider', chip(s.trackingProvider, 'teal')],
    ])),
    card('Routing', kv([
      ['POL', portLink(s.polUnlocode)],
      ['POD', portLink(s.podUnlocode)],
      ['Place of receipt', s.originUnlocode ? portLink(s.originUnlocode) : null],
      ['Place of delivery', s.deliveryUnlocode ? portLink(s.deliveryUnlocode) : null],
      ['Transhipment(s)', s.transshipments.length ? s.transshipments.map(p => h('span', { class:'mono' }, p)).reduce((a,b)=>[a, ' · ', b]) : 'direct'],
      ['Carrier', s.carrierName],
      ['Vessel / voyage', s.vesselName ? `${s.vesselName} ${s.voyageNumber}` : null],
      ['Service', s.serviceName],
      ['Move type', chip(titleCase(s.carrierMoveType), 'grey')],
      ['Incoterm', chip(s.incotermCode, 'blue')],
    ])),
    card('Key dates', kv([
      ['Cargo readiness', fmtDate(s.cargoReadinessDate)],
      ['ETD', h('b', null, fmtDate(s.departure))],
      ['ETA', h('b', null, fmtDate(s.arrival))],
      ['Computed ETA', fmtDate(s.etaComputed)],
      ['Document cutoff', fmtDate(s.documentCutoffDate)],
      ['VGM cutoff', fmtDate(s.vgmCutoffDate)],
      ['Terminal cutoff', fmtDate(s.cutoffDate)],
      ['Wished empty pickup', fmtDate(s.wishedEmptyPickupDate)],
      ['Wished final delivery', fmtDate(s.wishedFinalDeliveryDate)],
    ])),
    card('Commercial', h('div', null, kv([
      ['Rate source', chip(titleCase(s.rate.source), 'violet')],
      ['Contract', h('span', { class:'mono' }, s.rate.contractNumber)],
      ['Rate', fmtMoney(s.rate.amount, s.rate.currency)],
      ['Total costs', h('b', null, fmtMoney(s.totalCosts, s.costCurrency))],
      ['Hidden costs', s.hiddenCosts ? chip(fmtMoney(s.hiddenCosts, s.costCurrency), 'amber') : '—'],
      ['CO₂ total', fmtCo2(s.co2G)],
      ['CO₂ per TEU', fmtCo2(s.co2GPerTeu)],
      ['Distance', `${fmtNum(s.distanceNm)} nm`],
    ]), h('div', { class:'section-title' }, 'Charges'), chargesTable(s))),
    card('Port calls & milestones', kv(PORT_CALL_FIELDS.map(([k, label]) => [label, s.portCalls[k] ? h('span', null, fmtDateTime(s.portCalls[k]), h('span', { class:'tiny muted' }, ` · ${rel(s.portCalls[k])}`)) : null]))),
    card('Parties', kv([
      ['Shipper', s.parties.shipper.name],
      ['Consignee', s.parties.consignee.name],
      ['Forwarder', s.parties.forwarder.name],
      ['Notify', s.parties.notify.map(n => n.name).join(', ')],
      ['Bank', s.bank ? `${s.bank.name} · ${s.bank.lcNumber}` : null],
      ['Exporter ref', s.exporterRef],
      ['Importer ref', s.importerRef],
      ['Forwarder ref', s.forwarderRef],
      ['L/C ref', s.lcRef],
    ])),
    card('Activity', h('div', { class:'stack' }, s.activities.slice(0, 8).map(a =>
      h('div', { class:'row', style:{ alignItems:'flex-start', gap:'8px' } },
        chip(a.kind, a.kind === 'deviation' ? 'red' : a.kind === 'task' ? 'amber' : a.kind === 'document' ? 'blue' : 'grey'),
        h('div', null, h('div', null, a.text), h('div', { class:'tiny muted' }, fmtDateTime(a.at))))))),
  );
}
const portLink = (loc) => { const p = ALL_PORTS.find(x => x.loc === loc); return h('a', { href:'#/schedules', title:p ? `${p.name}, ${p.country}` : '' }, h('span', { class:'mono' }, loc), p ? h('span', { class:'tiny muted' }, ` ${p.name}`) : null); };

function chargesTable(s) {
  return table([
    { key:'code', label:'Code' }, { key:'label', label:'Charge' }, { key:'basis', label:'Basis' },
    { key:'payer', label:'Payer', render:r => chip(titleCase(r.payer), 'grey') },
    { key:'prepaid', label:'Terms', render:r => chip(r.prepaid ? 'prepaid' : 'collect', r.prepaid ? 'blue' : 'amber') },
    { key:'amount', label:'Amount', num:true, render:r => fmtMoney(r.amount, r.currency) },
  ], s.charges, { maxHeight:'260px' });
}

/* ----------------------------------------------------------- requirements */
function requirementsView(s) {
  return h('div', { class:'grid cols-2' },
    card('References', kv([
      ['Exporter ref', s.exporterRef], ['Importer ref', s.importerRef], ['Forwarder ref', s.forwarderRef],
      ['L/C ref', s.lcRef], ['PO numbers', s.purchaseOrderNumbers.join(', ')],
      ['Invoice numbers', s.invoiceNumbers.join(', ')], ['Stuffing refs', s.stuffingReferences.join(', ')],
      ['Additional refs', s.additionalReferences.length ? s.additionalReferences.join(', ') : null],
    ])),
    card('Cargo requirements', h('div', null,
      kv([['Shipping mode', chip(s.shippingMode, 'grey')], ['Cargo nature', chip(titleCase(s.cargoNature), s.cargoNature === 'REGULAR' ? 'grey' : 'amber')],
        ['Container type', `${s.containerSize} ${titleCase(s.containerType)}`], ['Transport mode', chip(s.transportMode, 'grey')],
        ['Incoterm', `${s.incotermCode}${s.incotermLocationUnlocode ? ' · ' + s.incotermLocationUnlocode : ''}`],
        ['Cargo readiness', fmtDate(s.cargoReadinessDate)]]),
      h('div', { class:'section-title' }, 'Cargo lines'),
      table([
        { key:'description', label:'Description' },
        { key:'hsCode', label:'HS code', mono:true },
        { key:'packages', label:'Packages', num:true, render:r => `${fmtNum(r.packageCount)} ${r.packageType}` },
        { key:'gross', label:'Gross', num:true, render:r => fmtWeight(r.grossWeightG) },
        { key:'volume', label:'Volume', num:true, render:r => fmtVolume(r.volumeCm3) },
        { key:'danger', label:'DG', render:r => r.dangerousGood ? chip(`${r.dangerousGood.unNumber} cl.${r.dangerousGood.imoClass}`, 'red') : h('span', { class:'muted' }, '—') },
        { key:'customs', label:'Customs', render:r => h('span', { class:'tiny mono' }, [r.ncmCode ? `NCM ${r.ncmCode}` : null, r.ddeNumber].filter(Boolean).join(' · ') || '—') },
      ], s.cargoes, { maxHeight:'320px' }))),
    card('Equipment', h('div', null,
      kv([['Containers', `${s.containerCount} × ${s.containerSize}${s.containerType === 'DRY' ? '' : ' ' + titleCase(s.containerType)}`],
        ['TEU', s.teu], ['Carrier move type', titleCase(s.carrierMoveType)],
        ['Wished empty pickup', fmtDate(s.wishedEmptyPickupDate)], ['Wished final delivery', fmtDate(s.wishedFinalDeliveryDate)]]),
      s.containerType === 'REEFER' ? alert('warn', `Reefer equipment — setpoint ${s.containers[0].temperature ?? '—'}°C, ventilation ${s.containers[0].ventilation ?? 'n/a'}`) : null,
      s.cargoNature !== 'REGULAR' ? alert('warn', `Cargo nature ${titleCase(s.cargoNature)} — dangerous goods documentation required`) : null)),
    card('Validation', h('div', { class:'stack' },
      s.blValidation.blocking.length ? alert('bad', `${s.blValidation.blocking.length} blocking point(s) — see the B/L tab`) : alert('good', 'No blocking points recorded'),
      s.blValidation.warnings.length ? alert('warn', h('div', null, h('b', null, `${s.blValidation.warnings.length} warning(s)`),
        h('ul', { style:{ margin:'4px 0 0 16px', padding:0 } }, s.blValidation.warnings.map(w => h('li', { class:'tiny' }, BL_RULE_MESSAGE(w)))))) : null)),
  );
}

/* -------------------------------------------------------------- tracking */
function trackingView(s) {
  const byStage = {};
  s.events.forEach(e => (byStage[e.stage] = byStage[e.stage] || []).push(e));
  return h('div', { class:'grid cols-2' },
    card(`Milestones (${s.events.length})`, timeline(s.events.map(e => ({
      when: h('span', null, fmtDateTime(e.timestamp), ' ', e.estimated ? chip('estimated', 'amber') : chip('actual', 'green')),
      what: e.label + (e.delayDays ? ` · +${e.delayDays}d` : ''),
      where: `${e.unlocode}${e.facility ? ' · ' + e.facility : ''} · ${e.provider} (${e.source})`,
      tone: e.estimated ? '' : e.delayDays ? 'warn' : 'done',
    })))),
    h('div', { class:'stack' },
      card('Milestone summary', kv(PORT_CALL_FIELDS.map(([k, label]) => [label, s.portCalls[k] ? fmtDateTime(s.portCalls[k]) : null]))),
      card('Tracking provider', h('div', { class:'stack' },
        kv([['Provider', chip(s.trackingProvider, 'teal')], ['Events received', s.events.length],
          ['Last event', s.events.length ? ago(s.events[s.events.length - 1].timestamp) : null],
          ['Estimated next', (() => { const e = s.events.find(x => x.estimated); return e ? `${e.label} · ${fmtDate(e.timestamp)}` : null; })()]]),
        alert('info', 'The real product aggregates carriers, terminals and providers (fourkites, inttra, terminal49, portcast…) into one timeline with unlocode aliasing.'))),
      card('Containers', table([
        { key:'identificationNumber', label:'Container', mono:true },
        { key:'size', label:'Size' }, { key:'type', label:'Type' },
        { key:'lastEvent', label:'Last event', render:r => { const e = s.events.filter(x => x.container === r.identificationNumber).pop(); return e ? `${e.label} · ${e.unlocode}` : h('span', { class:'muted' }, '—'); } },
        { key:'delay', label:'Delay', num:true, render:r => { const e = s.events.filter(x => x.container === r.identificationNumber).pop(); return e && e.delayDays ? chip(`+${e.delayDays}d`, 'red') : h('span', { class:'muted' }, '—'); } },
      ], s.containers, { maxHeight:'300px' })),
    ));
}

/* ------------------------------------------------------------ containers */
function containersView(s) {
  return h('div', null,
    card(`Containers (${s.containers.length})`, table([
      { key:'identificationNumber', label:'Container no.', mono:true },
      { key:'size', label:'Size' }, { key:'type', label:'Type' }, { key:'grade', label:'Grade' },
      { key:'seals', label:'Seal', render:r => r.seals.join(', ') },
      { key:'tare', label:'Tare', num:true, render:r => fmtWeight(r.tareWeightG) },
      { key:'measured', label:'VGM (measured)', num:true, render:r => fmtWeight(r.measuredWeightG) },
      { key:'net', label:'Net', num:true, render:r => fmtWeight(r.netWeightG) },
      { key:'volume', label:'Volume', num:true, render:r => fmtVolume(r.volumeCm3) },
      { key:'packages', label:'Packages', num:true, render:r => `${fmtNum(r.packageCount)} ${r.packageType}` },
      { key:'stuffing', label:'Stuffed', render:r => fmtDate(r.stuffingDate) },
      { key:'spec', label:'Spec', render:r => [r.temperature != null ? `${r.temperature}°C` : null, r.ventilation].filter(Boolean).join(' · ') || h('span', { class:'muted' }, '—') },
      { key:'so', label:'SOC', render:r => r.shipperOwned ? chip('shipper owned', 'violet') : '' },
      { key:'actual', label:'Actual no.', render:r => r.identificationNumberActual ? h('span', { class:'mono', style:{ color:'var(--red-600)' } }, r.identificationNumberActual) : h('span', { class:'muted' }, 'matches') },
    ], s.containers, { maxHeight:'420px' })),
    h('div', { class:'section-title' }, 'Cargo lines'),
    card(null, table([
      { key:'description', label:'Description' }, { key:'hsCode', label:'HS', mono:true },
      { key:'marks', label:'Marks & numbers', mono:true, render:r => r.marksAndNumbers },
      { key:'so', label:'Sales order', mono:true, render:r => r.salesOrderNumber },
      { key:'po', label:'PO', mono:true, render:r => r.purchaseOrderNumber },
      { key:'gross', label:'Gross', num:true, render:r => fmtWeight(r.grossWeightG) },
      { key:'value', label:'Value', num:true, render:r => fmtMoney(r.cargoValue, r.cargoValueCurrency) },
      { key:'dg', label:'Dangerous goods', render:r => r.dangerousGood ? `${r.dangerousGood.unNumber} · class ${r.dangerousGood.imoClass} · PG ${r.dangerousGood.packingGroup}` : h('span', { class:'muted' }, '—') },
    ], s.cargoes)),
    card('Physical container details', table([
      { key:'id', label:'Ref' }, { key:'temperature', label:'Temperature', render:r => r.temperature != null ? `${r.temperature} °C` : '—' },
      { key:'ventilation', label:'Ventilation', render:r => r.ventilation || '—' },
      { key:'stuffingReference', label:'Stuffing ref' }, { key:'volumeCm3', label:'Volume', num:true, render:r => fmtVolume(r.volumeCm3) },
    ], s.containers, { maxHeight:'260px' })),
  );
}

/* ------------------------------------------------------------- documents */
function documentsView(s) {
  return card(`Documents (${s.documents.length})`, h('div', null,
    table([
      { key:'name', label:'Name' }, { key:'type', label:'Type', render:r => chip(r.type, 'blue') },
      { key:'version', label:'v', num:true }, { key:'sizeKb', label:'Size', num:true, render:r => `${fmtNum(r.sizeKb)} KB` },
      { key:'sharing', label:'Sharing', render:r => chip(r.sharing, r.sharing === 'all' ? 'green' : r.sharing === 'participants' ? 'blue' : 'grey') },
      { key:'state', label:'State', render:r => r.state === 'failed' ? chip('failed', 'red') : chip('ready', 'green') },
      { key:'uploadedBy', label:'Uploaded by' }, { key:'uploadedAt', label:'When', render:r => fmtDateTime(r.uploadedAt) },
      { key:'actions', label:'', render:r => h('div', { class:'row' },
        btn('Download', { size:'sm', onClick:() => toast(`Would download ${r.name} (mock)`, 'good') }),
        can('attachments_delete') ? btn('Delete', { size:'sm', kind:'danger', onClick:() => toast('DELETE /api/shipments/{ref}/documents/{id} (mock)', 'bad') }) : null) },
    ], s.documents, { maxHeight:'340px' }),
    h('div', { class:'row', style:{ marginTop:'12px' } },
      can('attachments_write') ? btn('Upload document', { kind:'primary', iconName:'upload', onClick:() => uploadDoc(s) }) : null,
      btn('Request a document', { size:'sm', onClick:() => toast('Creates an attachment request task (mock)', 'good') })),
  ));
}
function uploadDoc(s) {
  openDrawer('Upload document', h('div', { class:'stack' },
    alert('info', 'Real endpoint: POST /api/shipments/{shipment_ref}/documents (multipart) with sharing_type, type_id, name, description, sharing_participations_list[] and validation_task.'),
    h('div', { class:'field' }, h('label', null, 'File'), h('input', { type:'file' })),
    h('div', { class:'grid cols-2' },
      field('Type', select(DOCUMENT_TYPES, 'Bill of lading', () => {})),
      field('Sharing', select(['private','participants','all'], 'participants', () => {})),
      field('Name', h('input', { type:'text', placeholder:'B/L draft v1' })),
      field('Description', h('input', { type:'text', placeholder:'Issued by carrier' }))),
    toggle(true, () => {}, 'Run document classifier on upload')),
    btn('Upload', { kind:'primary', onClick:() => { closeDrawer(); toast('Document uploaded (mock)', 'good'); } }));
}

/* ------------------------------------------------------------ deviations */
function deviationsView(s) {
  if (!s.deviations.length) return card('Deviations', alert('good', 'No deviations recorded on this shipment.'));
  return h('div', null,
    card(`Deviations (${s.deviations.length})`, table([
      { key:'label', label:'Deviation', render:r => h('span', { class:'row' }, chip(r.severity === 'bad' ? 'critical' : r.severity === 'warn' ? 'warning' : 'info', r.severity === 'bad' ? 'red' : r.severity === 'warn' ? 'amber' : 'grey'), r.label) },
      { key:'code', label:'Code', mono:true },
      { key:'occurredAt', label:'Occurred', render:r => fmtDateTime(r.occurredAt) },
      { key:'causedBy', label:'Caused by', render:r => chip(r.causedBy, 'grey') },
      { key:'reasonCode', label:'Reason', render:r => h('span', { class:'mono tiny' }, r.reasonCode) },
      { key:'automatic', label:'Source', render:r => chip(r.automatic ? 'computed' : 'manual', r.automatic ? 'blue' : 'violet') },
      { key:'ack', label:'Acknowledged', render:r => r.acknowledgedBy ? chip(r.acknowledgedBy, 'green') : btn('Acknowledge', { size:'sm', onClick:() => toast(`Acknowledged ${r.label}`, 'good') }) },
    ], s.deviations)),
    s.deviations.some(d => d.comment) ? card('Comments on deviations', h('div', { class:'stack' }, s.deviations.filter(d=>d.comment).map(d =>
      h('div', null, h('b', null, d.label), h('div', null, d.comment), h('div', { class:'tiny muted' }, fmtDateTime(d.occurredAt)))))) : null);
}

/* -------------------------------------------------------------- comments */
function commentsView(s) {
  return card(`Comments (${s.comments.length})`, h('div', { class:'stack' },
    s.comments.length ? s.comments.map(c => h('div', { class:'row', style:{ alignItems:'flex-start', gap:'10px', paddingBottom:'10px', borderBottom:'1px solid var(--grey-100)' } },
      h('div', { class:'avatar' }, c.author.split(' ').map(x=>x[0]).join('').slice(0,2)),
      h('div', { style:{ flex:1 } }, h('div', { class:'row' }, h('b', null, c.author), chip(c.authorType, 'grey'), h('span', { class:'tiny muted' }, fmtDateTime(c.createdAt))), h('div', null, c.text)))) : h('div', { class:'muted' }, 'No comments yet.'),
    can('comments_write') ? h('div', { class:'stack', style:{ marginTop:'10px' } },
      h('textarea', { placeholder:'Add a comment for the shipment participants…', id:'new-comment' }),
      h('div', { class:'row' }, btn('Post comment', { kind:'primary', size:'sm', onClick:() => { toast('Comment posted (mock)', 'good'); } }),
        h('label', { class:'row tiny muted' }, h('input', { type:'checkbox' }), 'Notify participants by email'))) : null,
  ));
}

/* ----------------------------------------------------------------- tasks */
function tasksView(s) {
  const cols = [
    { key:'label', label:'Task', render:r => h('span', { class:'row' }, chip(r.state === 'completed' ? 'done' : 'pending', r.state === 'completed' ? 'green' : 'amber'), r.label) },
    { key:'code', label:'Type', mono:true },
    { key:'assignee', label:'Assignee' }, { key:'requestedBy', label:'Requested by' },
    { key:'dueDate', label:'Due', render:r => h('span', r.state === 'pending' && new Date(r.dueDate) < new Date() ? { style:{ color:'var(--red-600)' } } : null, fmtDate(r.dueDate)) },
    { key:'priority', label:'Priority', render:r => chip(r.priority, r.priority === 'high' ? 'red' : r.priority === 'normal' ? 'blue' : 'grey') },
    { key:'actions', label:'', render:r => r.state === 'pending' ? btn('Complete', { size:'sm', kind:'primary', onClick:() => toast(`Completed: ${r.label}`, 'good') }) : h('span', { class:'tiny muted' }, 'closed') },
  ];
  return h('div', null,
    card(`Tasks (${s.tasks.length})`, h('div', null,
      table(cols, s.tasks, { emptyText:'No tasks on this shipment' }),
      h('div', { class:'row', style:{ marginTop:'12px' } },
        btn('Create task', { kind:'primary', size:'sm', iconName:'plus', onClick:() => createTask(s) }),
        btn('Create all from template', { size:'sm', onClick:() => toast('Applied the "Standard document checklist" template (mock)', 'good') })))),
    card('Available task types', h('div', { class:'pill-nav' }, TASK_TYPES.map(t => h('button', { title:t.code, onClick:() => toast(`Would create task: ${t.label}`, 'good') }, t.label)))),
  );
}
function createTask(s) {
  openDrawer('Create task', h('div', { class:'stack' },
    field('Task type', select(TASK_TYPES.map(t => ({ value:t.code, label:t.label })), 'provide_booking_information', () => {})),
    field('Assignee', select(['Elena Marchetti','Jonas Berg','Priya Nair','Anouk de Vries'], 'Jonas Berg', () => {})),
    field('Due date', h('input', { type:'date', value:new Date(Date.now()+7*86400000).toISOString().slice(0,10) })),
    field('Comment', h('textarea', { placeholder:'What needs doing?' })),
    toggle(true, () => {}, 'Notify the assignee by email')),
    btn('Create', { kind:'primary', onClick:() => { closeDrawer(); toast('Task created (mock)', 'good'); } }));
}

/* ============================ OPERATIONS ================================ */
function operationView(s, op) {
  const map = {
    booking: bookingOp, 'vgm-declaration': vgmOp, 'shipping-instructions': siOp,
    'export-filing': exportFilingOp, 'empty-release-order': eroOp,
    'customs-and-filings': customsOp, 'bill-of-lading': blOp,
  };
  return (map[op] || bookingOp)(s);
}

function opHeader(s, title, stateChip, actions, note) {
  return h('div', { class:'stack', style:{ marginBottom:'12px' } },
    h('div', { class:'row', style:{ flexWrap:'wrap' } }, h('h3', null, title), stateChip, h('div', { class:'spacer' }), ...actions),
    note || null);
}

/* -------- booking -------- */
function bookingOp(s) {
  const canSend = can('bookings_send');
  return h('div', null,
    opHeader(s, 'Booking', chip(BOOKING_STATE_LABEL[s.bookingState], BOOKING_STATE_TONE[s.bookingState]), [
      canSend && s.bookingState === 'ready' ? btn('Send booking request', { kind:'primary', size:'sm', iconName:'upload', onClick:() => toast('POST /api/shipments/{ref}/booking/request (mock)', 'good') }) : null,
      canSend ? btn('Remind carrier', { size:'sm', onClick:() => toast('POST /api/shipments/{ref}/booking/remind (mock)', 'good') }) : null,
      canSend ? btn('Amend', { size:'sm', onClick:() => toast('POST /api/shipments/{ref}/booking/amend (mock)', 'good') }) : null,
      canSend ? btn('Cancel booking', { kind:'danger', size:'sm', onClick:() => toast('POST /api/shipments/{ref}/booking/cancel (mock)', 'bad') }) : null,
    ], s.bookingState === 'amend_requested' ? alert('warn', 'The carrier requested an amendment — review the confirmation below.') : null),
    h('div', { class:'grid cols-2' },
      card('Booking request', kv([
        ['Portside ref', h('span', { class:'mono' }, s.shipmentRef)], ['Portside booking ref', h('span', { class:'mono' }, s.shipmentBookingRef)],
        ['Carrier', s.carrierName], ['Carrier booking no.', h('span', { class:'mono' }, s.bookingNumber)],
        ['NVOCC booking no.', h('span', { class:'mono' }, s.nvoccBookingNumber)], ['Vessel / voyage', s.vesselName ? `${s.vesselName} ${s.voyageNumber}` : null],
        ['Sent at', s.bookingSendingDate ? fmtDate(s.bookingSendingDate) : null],
        ['Booking version', chip(s.bookingVersion, 'grey')],
        ['Split by carrier', s.splitByCarrier ? chip('yes', 'amber') : 'no'],
      ])),
      card('Confirmation', kv([
        ['State', chip(BOOKING_STATE_LABEL[s.bookingState], BOOKING_STATE_TONE[s.bookingState])],
        ['Carrier SCAC', s.carrierScac], ['Shipping line SCAC', s.shippingLineScac],
        ['Service', s.serviceName], ['B/L number', h('span', { class:'mono' }, s.blNumber)],
        ['ETD / ETA', `${fmtDate(s.departure)} → ${fmtDate(s.arrival)}`],
        ['Source', chip('Carrier Direct-Link', 'teal')],
      ])),
      card('Booking discrepancies', table([
        { key:'field', label:'Field' }, { key:'requested', label:'Requested' }, { key:'confirmed', label:'Confirmed' },
        { key:'action', label:'' , render:() => btn('Accept', { size:'sm', onClick:() => toast('Accepted (mock)', 'good') }) },
      ], bookingDiscrepancies(s), { emptyText:'No discrepancies between the request and the confirmation' })),
      card('Import a confirmation', h('div', { class:'stack' },
        alert('info', 'Confirmations arrive by Excel, EDI (IFTMBF/IFTMBC) or the carrier API.'),
        h('div', { class:'row' }, btn('Import by Excel', { size:'sm', iconName:'upload', onClick:() => import('./shipments.js').then(m => m.importModal('booking_confirmations')) }),
          btn('Pull from carrier', { size:'sm', iconName:'refresh', onClick:() => toast('Polled carrier API (mock)', 'good') })))),
    ));
}
function bookingDiscrepancies(s) {
  if (s.bookingState === 'confirmed' && s.currentTrackingStatus !== 'delayed') return [];
  const out = [];
  if (s.vesselName?.includes('SUBSTITUTE')) out.push({ field:'vessel', requested:s.vesselName, confirmed:'MAERSK HIDALGO' });
  if (s.currentTrackingStatus === 'delayed') out.push({ field:'eta', requested:fmtDate(s.arrival), confirmed:fmtDate(s.etaComputed) });
  if (s.deviations.some(d => d.code === 'podDifferentFromRequested')) out.push({ field:'pod', requested:s.podUnlocode, confirmed:s.transshipments[0] || 'NLRTM' });
  if (s.deviations.some(d => d.code === 'containersDifferentFromRequested')) out.push({ field:'containers', requested:`${s.containerCount} × ${s.containerSize}`, confirmed:`${s.containerCount - 1} × ${s.containerSize}` });
  return out;
}

/* -------- VGM -------- */
function vgmOp(s) {
  const total = s.containers.reduce((n,c) => n + c.measuredWeightG, 0);
  const cols = [
    { key:'identificationNumber', label:'Container', mono:true },
    { key:'size', label:'Size' }, { key:'type', label:'Type' },
    { key:'tareWeightG', label:'Tare', num:true, render:r => fmtWeight(r.tareWeightG) },
    { key:'netWeightG', label:'Cargo net', num:true, render:r => fmtWeight(r.netWeightG) },
    { key:'measuredWeightG', label:'VGM', num:true, render:r => h('b', null, fmtWeight(r.measuredWeightG)) },
    { key:'method', label:'Method', render:() => chip(pickMethod(s), 'grey') },
    { key:'declState', label:'State', render:() => chip(VGM_STATE_LABEL[s.vgmDeclarationState], VGM_STATE_TONE[s.vgmDeclarationState]) },
  ];
  return h('div', null,
    opHeader(s, 'VGM declaration', chip(VGM_STATE_LABEL[s.vgmDeclarationState], VGM_STATE_TONE[s.vgmDeclarationState]), [
      can('vgm_declaration_write') ? btn('Amend', { size:'sm', onClick:() => toast('PATCH /api/deals/{deal_id}/vgm-declaration/amend (mock)', 'good') }) : null,
      can('vgm_declaration_send') ? btn('Send to carrier', { kind:'primary', size:'sm', iconName:'upload', onClick:() => toast('POST /api/deals/{deal_id}/vgm-declaration/send (mock)', 'good') }) : null,
    ], alert('info', h('div', null, h('b', null, 'SOLAS VGM'), h('div', { class:'tiny' }, 'Verified Gross Mass must be declared before the VGM cutoff. The real declaration carries weightMethod, sendingMode, EDI flag and email recipients.')))),
    h('div', { class:'kpis', style:{ marginBottom:'14px' } },
      kpi('Total VGM', fmtWeight(total)),
      kpi('Containers', fmtNum(s.containers.length)),
      kpi('Cutoff', fmtDate(s.vgmCutoffDate), rel(s.vgmCutoffDate)),
      kpi('Method', pickMethod(s))),
    card('Container declarations', table(cols, s.containers, { maxHeight:'380px' })),
    card('Declaration', kv([
      ['Deal id', s.dealId], ['Carrier', s.carrierName], ['EDI connection', chip('active', 'green')],
      ['Weight method', pickMethod(s)], ['Sending mode', chip('EDI', 'teal')], ['State', chip(VGM_STATE_LABEL[s.vgmDeclarationState], VGM_STATE_TONE[s.vgmDeclarationState])],
      ['Sent at', s.vgmDeclarationState !== 'none' ? fmtDate(s.shippingInstructionsSendingDate || s.lastUpdate) : null],
      ['Email recipients', 'ops@meridian-logistics.example, carrier-edi@example'],
    ])));
}
const pickMethod = (s) => ['SM1 — weighed by shipper', 'SM2 — calculated from tare + cargo'][s.dealId % 2];

/* -------- shipping instructions -------- */
function siOp(s) {
  const SECTIONS = [
    { id:'parties', label:'Parties', fields:['Shipper','Consignee','Notify party 1','Notify party 2','Forwarder'] },
    { id:'references', label:'References', fields:['Exporter ref','Importer ref','Forwarder ref','L/C ref','PO numbers'] },
    { id:'containers-and-cargo', label:'Containers & cargo', fields:['Container numbers','Seal numbers','Packages','Gross weight','Volume','HS codes'] },
    { id:'documents-and-charges', label:'Documents & charges', fields:['B/L type','Freight terms','Charges repartition','Requested B/L copies'] },
    { id:'customs-declaration', label:'Customs declaration', fields:['HS codes','NCM codes','DDD number','Exporter EORI'] },
  ];
  const stateFor = (i) => ['approved','approved','amend_sent','draft','none'][i % 5];
  return h('div', null,
    opHeader(s, 'Shipping instructions', chip(SI_STATE_LABEL[s.shippingInstructionsState], SI_STATE_TONE[s.shippingInstructionsState]), [
      can('shipping_instruction_write') ? btn('Reset', { size:'sm', onClick:() => toast('POST …/shipping-instruction/{ref}/reset (mock)', 'good') }) : null,
      can('shipping_instruction_write') ? btn('Amend', { size:'sm', onClick:() => toast('POST …/shipping-instruction/{ref}/amend (mock)', 'good') }) : null,
      can('shipping_instruction_send') ? btn('Send to carrier', { kind:'primary', size:'sm', iconName:'upload', onClick:() => toast('POST …/shipping-instruction/{ref}/send (mock)', 'good') }) : null,
      can('shipping_instruction_send') ? btn('Resend', { size:'sm', onClick:() => toast('POST …/shipping-instruction/{ref}/resend (mock)', 'good') }) : null,
    ], alert('info', h('div', null, h('b', null, 'The SI is amended section by section'),
      h('div', { class:'tiny' }, 'Real endpoints: PATCH …/shipping-instruction/{shipment_ref}/{parties|references|containers-and-cargo|documents-and-charges|customs-declaration}.')))),
    h('div', { class:'grid cols-2' },
      card('Section status', table([
        { key:'label', label:'Section' },
        { key:'state', label:'State', render:r => chip(SI_STATE_LABEL[r.state], SI_STATE_TONE[r.state]) },
        { key:'fields', label:'Fields', num:true, render:r => r.fields.length },
        { key:'actions', label:'', render:r => btn('Edit', { size:'sm', onClick:() => siSection(s, r) }) },
      ], SECTIONS.map((x, i) => ({ ...x, state:stateFor(i) })))),
      card('Parties as declared', kv([
        ['Shipper', s.parties.shipper.name], ['Consignee', s.parties.consignee.name],
        ['Forwarder', s.parties.forwarder.name], ['Notify 1', s.parties.notify[0]?.name],
        ['Notify 2', s.parties.notify[1]?.name || null], ['Bank', s.bank?.name || null],
      ])),
      card('Documents & charges', h('div', null, kv([
        ['B/L type', chip('Original', 'grey')], ['Freight terms', chip(s.charges[0]?.prepaid ? 'prepaid' : 'collect', 'blue')],
        ['Requested B/L copies', 3], ['Charges repartition', chip('template applied', 'teal')],
      ]), chargesTable(s))),
      card('Customs declaration section', kv([
        ['HS codes', s.cargoes.map(c => c.hsCode).join(', ')],
        ['NCM codes', s.cargoes.map(c => c.ncmCode).filter(Boolean).join(', ') || null],
        ['DDE number', s.cargoes.map(c => c.ddeNumber).filter(Boolean)[0] || null],
        ['Exporter EORI', s.parties.shipper.eori],
      ])),
    ));
}
function siSection(s, section) {
  openDrawer(`Edit SI — ${section.label}`, h('div', { class:'stack' },
    alert('info', `PATCH /api/bookings/{booking_number}/shipping-instruction/{shipment_ref}/${section.id}`),
    ...section.fields.map(f => field(f, h('input', { type:'text', value:siValue(s, section.id, f) }))),
    toggle(true, () => {}, 'Validate before saving')),
    btn('Save section', { kind:'primary', onClick:() => { closeDrawer(); toast(`${section.label} saved (mock)`, 'good'); } }));
}
function siValue(s, sectionId, fieldName) {
  const map = {
    parties: { Shipper:s.parties.shipper.name, Consignee:s.parties.consignee.name, 'Notify party 1':s.parties.notify[0]?.name, 'Notify party 2':s.parties.notify[1]?.name || '', Forwarder:s.parties.forwarder.name },
    references: { 'Exporter ref':s.exporterRef, 'Importer ref':s.importerRef, 'Forwarder ref':s.forwarderRef, 'L/C ref':s.lcRef || '', 'PO numbers':s.purchaseOrderNumbers.join(', ') },
    'containers-and-cargo': { 'Container numbers':s.containerNumbers.join(', '), 'Seal numbers':s.containers.flatMap(c=>c.seals).join(', '), Packages:String(s.containers.reduce((n,c)=>n+c.packageCount,0)), 'Gross weight':fmtWeight(s.containers.reduce((n,c)=>n+c.measuredWeightG,0)), Volume:fmtVolume(s.cargoes.reduce((n,c)=>n+c.volumeCm3,0)), 'HS codes':s.cargoes.map(c=>c.hsCode).join(', ') },
    'documents-and-charges': { 'B/L type':'Original', 'Freight terms':s.charges[0]?.prepaid ? 'prepaid' : 'collect', 'Charges repartition':'template applied', 'Requested B/L copies':'3' },
    'customs-declaration': { 'HS codes':s.cargoes.map(c=>c.hsCode).join(', '), 'NCM codes':s.cargoes.map(c=>c.ncmCode).filter(Boolean).join(', '), 'DDD number':s.cargoes.map(c=>c.ddeNumber).filter(Boolean)[0] || '', 'Exporter EORI':s.parties.shipper.eori || '' },
  };
  return map[sectionId]?.[fieldName] ?? '';
}

/* -------- export filing -------- */
function exportFilingOp(s) {
  const itn = `X${randInt(9)}${s.dealId}${randInt(1000,9999)}`;
  return h('div', null,
    opHeader(s, 'Export filing', chip(titleCase(s.usExportFilingState), s.usExportFilingState === 'accepted' ? 'green' : s.usExportFilingState === 'rejected' ? 'red' : s.usExportFilingState === 'none' ? 'grey' : 'amber'), [
      can('customs_and_filings_write') ? btn('File with AES', { kind:'primary', size:'sm', onClick:() => toast('POST /api/ddd/... filing (mock)', 'good') }) : null,
      can('customs_and_filings_write') ? btn('Amend filing', { size:'sm', onClick:() => toast('Amend export filing (mock)', 'good') }) : null,
    ]),
    h('div', { class:'grid cols-2' },
      card('US AES / ITN', kv([
        ['Filing state', chip(titleCase(s.usExportFilingState), 'grey')],
        ['ITN', s.usExportFilingState === 'none' ? null : h('span', { class:'mono' }, itn)],
        ['Filer', 'Meridian Logistics (us)'], ['USPPI', s.parties.shipper.name],
        ['Ultimate consignee', s.parties.consignee.name],
        ['Country of ultimate destination', ALL_PORTS.find(p => p.loc === s.podUnlocode)?.country],
        ['Port of export', s.polUnlocode],
        ['Mode of transport', 'Vessel'],
        ['AES submission', s.usExportFilingState === 'none' ? null : fmtDateTime(s.lastUpdate)],
      ])),
      card('Compliance checks', h('div', { class:'stack' },
        s.cargoes.some(c => !c.hsCode) ? alert('bad', 'HS code missing on at least one cargo line') : alert('good', 'HS codes present on all cargo lines'),
        alert('warn', 'Validate ECCN / license requirements before filing'),
        alert('info', 'The real product supports US (AES/ITN), EU (ENS) and Brazil (NCM / DUE) filings.'))),
      card('Cargo declarations', table([
        { key:'description', label:'Line' }, { key:'hsCode', label:'HS / Schedule B', mono:true },
        { key:'value', label:'Value', num:true, render:r => fmtMoney(r.cargoValue, r.cargoValueCurrency) },
        { key:'dg', label:'DG', render:r => r.dangerousGood ? chip(r.dangerousGood.unNumber, 'red') : '' },
      ], s.cargoes)),
      card('Filing history', timeline([
        { when: fmtDateTime(s.createdAt), what:'Filing draft created', where:'Portside', tone:'done' },
        { when: fmtDateTime(s.lastUpdate), what: s.usExportFilingState === 'none' ? 'Not filed yet' : `State: ${titleCase(s.usExportFilingState)}`, where:'AES', tone: s.usExportFilingState === 'rejected' ? 'bad' : 'done' },
      ])),
    ));
}

/* -------- empty release order -------- */
function eroOp(s) {
  const depot = pickRandom(['Depot North — Rotterdam','ECT Delta — Rotterdam','Antwerp Gateway','Container Terminal Altenwerder']);
  return h('div', null,
    opHeader(s, 'Empty release order', chip(titleCase(s.emptyReleaseOrderState), s.emptyReleaseOrderState === 'confirmed' ? 'green' : s.emptyReleaseOrderState === 'pending' ? 'amber' : 'grey'), [
      can('empty_release_order_write') ? btn('Release empties', { kind:'primary', size:'sm', onClick:() => toast('Release order sent to depot (mock)', 'good') }) : null,
    ]),
    h('div', { class:'grid cols-2' },
      card('Release order', kv([
        ['State', chip(titleCase(s.emptyReleaseOrderState), 'grey')],
        ['Depot', depot], ['Container type', `${s.containerSize} ${titleCase(s.containerType)}`],
        ['Quantity', s.containerCount], ['Carrier', s.carrierName],
        ['Wished empty pickup', fmtDate(s.wishedEmptyPickupDate)],
        ['Pickup reference', h('span', { class:'mono' }, `ERD-${s.dealId}`)],
      ])),
      card('Empty pickup container references', table([
        { key:'identificationNumber', label:'Container', mono:true }, { key:'size', label:'Size' },
        { key:'pickupStatus', label:'Pickup', render:() => chip(s.emptyReleaseOrderState === 'confirmed' ? 'collected' : 'pending', s.emptyReleaseOrderState === 'confirmed' ? 'green' : 'amber') },
        { key:'depot', label:'Depot', render:() => depot },
      ], s.containers)),
    ));
}

/* -------- customs & filings -------- */
function customsOp(s) {
  const declTypes = [
    { type:'EU import declaration (ENS)', ref:`ENS${s.dealId}`, state:'accepted' },
    { type:'EU export declaration (EXS)', ref:`EXS${s.dealId}`, state:s.bookingState === 'confirmed' ? 'accepted' : 'draft' },
    { type:'Brazil — DU-E', ref:`DUE${s.dealId}`, state:s.cargoes.some(c=>c.ncmCode) ? 'submitted' : 'not_required' },
    { type:'US — AES/ITN', ref:s.usExportFilingState === 'none' ? null : `X${s.dealId}`, state:s.usExportFilingState },
  ];
  return h('div', null,
    opHeader(s, 'Customs & filings', chip(`${declTypes.filter(d => ['accepted','submitted'].includes(d.state)).length} / 4 filed`, 'blue'), [
      can('customs_and_filings_write') ? btn('New declaration', { kind:'primary', size:'sm', iconName:'plus', onClick:() => toast('POST /api/ddd/declarations (mock)', 'good') }) : null,
    ], alert('info', h('div', null, h('b', null, 'Declaration types'), h('div', { class:'tiny' }, 'The client ships EU / US / Brazil declaration types and a facets + summary search over containers (permission: customs_and_filings_read).')))),
    h('div', { class:'grid cols-2' },
      card('Declarations', table([
        { key:'type', label:'Declaration' }, { key:'ref', label:'Reference', mono:true },
        { key:'state', label:'State', render:r => chip(titleCase(r.state), r.state === 'accepted' ? 'green' : r.state === 'submitted' ? 'blue' : r.state === 'rejected' ? 'red' : r.state === 'not_required' ? 'grey' : 'amber') },
        { key:'actions', label:'', render:r => btn('Open', { size:'sm', onClick:() => toast(`Declaration ${r.ref || '—'} (mock)`, 'good') }) },
      ], declTypes)),
      card('Container facets', table([
        { key:'facet', label:'Facet' }, { key:'value', label:'Value' },
      ], [
        { facet:'Containers under declaration', value:String(s.containerCount) },
        { facet:'Container types', value:[...new Set(s.containers.map(c=>`${c.size} ${c.type}`))].join(', ') },
        { facet:'DG containers', value:String(s.cargoes.filter(c=>c.dangerousGood).length) },
        { facet:'NCM declared', value:String(s.cargoes.filter(c=>c.ncmCode).length) },
        { facet:'Declaration summary', value: s.cargoes.some(c=>c.dangerousGood) ? 'Requires DG filing' : 'Standard' },
      ])),
      card('Customs parties', kv([
        ['Exporter', s.parties.shipper.name], ['Exporter EORI', s.parties.shipper.eori],
        ['Importer', s.parties.consignee.name], ['Forwarder EIN', s.parties.forwarder.ein],
        ['Customs broker', 'Meridian Customs Services'],
      ])),
      card('Filing timeline', timeline([
        { when: fmtDate(s.departure), what:'Export declaration prepared', where:'Portside', tone:'done' },
        { when: fmtDate(s.departure), what:'ENS transmitted to EU customs', where:'EU', tone:'done' },
        { when: fmtDate(s.arrival), what:'Import declaration', where:'Destination', tone:'' },
      ])),
    ));
}

/* -------- bill of lading -------- */
function blOp(s) {
  const distribution = [
    { party:'Shipper', name:s.parties.shipper.name, copies:3, missing:!s.parties.shipper.name },
    { party:'Consignee', name:s.parties.consignee.name, copies:3, missing:!s.parties.consignee.name },
    { party:'Forwarder', name:s.parties.forwarder.name, copies:1, missing:!s.parties.forwarder.name },
    { party:'Notify 1', name:s.parties.notify[0]?.name, copies:1, missing:!s.parties.notify[0] },
    { party:'Notify 2', name:s.parties.notify[1]?.name, copies:0, missing:false },
    { party:'Notify 3', name:null, copies:0, missing:true },
    { party:'Booker', name:'Meridian Logistics (us)', copies:1, missing:false },
    { party:'Contract owner', name:'Meridian Logistics (us)', copies:1, missing:false },
  ];
  return h('div', null,
    opHeader(s, 'Bill of lading', chip(s.blNumber ? 'issued' : 'draft', s.blNumber ? 'green' : 'amber'), [
      can('shipping_instruction_write') ? btn('Compare SI ⇄ B/L', { size:'sm', iconName:'refresh', onClick:() => compareSiBl(s) }) : null,
      btn('Download BLISS annotated PDF', { size:'sm', iconName:'download', onClick:() => toast('GET …/bill-of-lading/annotated-pdf (mock)', 'good') }),
      can('shipping_instruction_send') ? btn('Send draft to Portside', { kind:'primary', size:'sm', iconName:'upload', onClick:() => toast('Draft B/L sent (mock)', 'good') }) : null,
    ]),
    h('div', { class:'grid cols-2' },
      card('B/L information', kv([
        ['B/L number', h('span', { class:'mono' }, s.blNumber)], ['B/L type', chip('Original', 'grey')],
        ['Port of loading', s.polUnlocode], ['Port of discharge', s.podUnlocode],
        ['Place of receipt', s.originUnlocode], ['Place of delivery', s.deliveryUnlocode],
        ['Payment place', chip(s.charges[0]?.prepaid ? 'prepaid at origin' : 'payable at destination', 'blue')],
        ['Ocean freight charges', s.charges[0]?.prepaid ? 'prepaid' : 'collect'],
        ['Vessel / voyage', s.vesselName ? `${s.vesselName} ${s.voyageNumber}` : null],
        ['Requested copies', 3],
        ['Carrier', s.carrierName], ['Release office', `${s.podUnlocode} office`],
      ])),
      card('Validation', h('div', { class:'stack' },
        s.blValidation.blocking.length ? alert('bad', h('div', null, h('b', null, `${s.blValidation.blocking.length} blocking point(s)`),
          h('ul', { style:{ margin:'6px 0 0 16px', padding:0 } }, s.blValidation.blocking.map(c => h('li', { class:'tiny' }, BL_RULE_MESSAGE(c), h('span', { class:'mono muted' }, ` (${c})`))))))
          : alert('good', 'No blocking points — the B/L can be released'),
        s.blValidation.warnings.length ? alert('warn', h('div', null, h('b', null, `${s.blValidation.warnings.length} warning(s)`),
          h('ul', { style:{ margin:'6px 0 0 16px', padding:0 } }, s.blValidation.warnings.map(c => h('li', { class:'tiny' }, BL_RULE_MESSAGE(c)))))) : null,
        h('div', { class:'tiny muted' }, `Rules come from the shipped blocking-point enum (${40} codes).`))),
      card('B/L distribution matrix', table([
        { key:'party', label:'Party' }, { key:'name', label:'Name' },
        { key:'copies', label:'Copies', num:true },
        { key:'status', label:'Status', render:r => r.missing ? chip('missing', 'red') : chip('complete', 'green') },
      ], distribution.map(d => ({ ...d, status: d.missing ? 'missing' : 'complete' })))),
      card('Parties & addresses', table([
        { key:'role', label:'Role' }, { key:'name', label:'Name' }, { key:'contact', label:'Contact' },
      ], [
        { role:'Shipper', name:s.parties.shipper.name, contact:s.parties.shipper.contact },
        { role:'Consignee', name:s.parties.consignee.name, contact:s.parties.consignee.contact },
        { role:'Forwarder', name:s.parties.forwarder.name, contact:s.parties.forwarder.contact },
        ...s.parties.notify.map((n, i) => ({ role:`Notify ${i + 1}`, name:n.name, contact:n.contact })),
      ])),
    ));
}
function compareSiBl(s) {
  const rows = [
    { field:'Shipper', si:s.parties.shipper.name, bl:s.parties.shipper.name },
    { field:'Consignee', si:s.parties.consignee.name, bl:s.parties.consignee.name },
    { field:'Notify', si:s.parties.notify.map(n=>n.name).join(', '), bl:s.parties.notify.map(n=>n.name).join(', ') },
    { field:'Port of loading', si:s.polUnlocode, bl:s.polUnlocode },
    { field:'Port of discharge', si:s.podUnlocode, bl:s.podUnlocode === s.podUnlocode ? s.podUnlocode : 'NLRTM' },
    { field:'Containers', si:String(s.containerCount), bl:String(s.containerCount) },
    { field:'Gross weight', si:fmtWeight(s.containers.reduce((n,c)=>n+c.measuredWeightG,0)), bl:fmtWeight(s.containers.reduce((n,c)=>n+c.measuredWeightG,0)) },
    { field:'Freight terms', si:s.charges[0]?.prepaid ? 'prepaid' : 'collect', bl:s.charges[0]?.prepaid ? 'prepaid' : 'collect' },
  ];
  openDrawer('SI ⇄ B/L comparison', h('div', { class:'stack' },
    alert('info', 'The real product ships this as the siBlComparisonTool entitlement — it diffs the shipping instruction against the issued B/L and flags every mismatch.'),
    table([{ key:'field', label:'Field' }, { key:'si', label:'Shipping instruction' }, { key:'bl', label:'Bill of lading' },
      { key:'ok', label:'', render:r => r.si === r.bl ? chip('match', 'green') : chip('differs', 'red') }],
      rows.map(r => ({ ...r, ok:r.si === r.bl })))));
}

/* --------------------------------------------------------------- footer */
function pickRandom(a) { return a[Math.floor(Math.random() * a.length)]; }
