/**
 * Deterministic mock dataset for the Portside replica.
 *
 * Field names, statuses, identifiers and enum values follow the real data model
 * recovered from the shipped bundle (see ../reports/data-model.md):
 * the core Deal aggregate, containers, cargo lines, VGM, shipping instructions,
 * B/L, deviations, tasks, documents, participations, rates and schedules.
 *
 * All data is generated locally — there is no backend.
 */
import {
  BOOKING_STATE, SI_STATE, VGM_STATE, DEAL_STATE, TRACKING_STATUS, EVENT_CODES,
  CARRIERS, INCOTERMS, CONTAINER_SIZES, CONTAINER_TYPES, CARGO_NATURE, SHIPPING_MODE,
  CARRIER_MOVE_TYPE, TRANSPORT_MODE, CURRENCIES, DEVIATION_TYPES, TASK_TYPES,
  DOCUMENT_TYPES, CHARGE_CODES, TRACKING_PROVIDERS, BL_RULES, PORT_CALL_FIELDS,
} from './enums.js';

/* ---------------- seeded RNG so the dataset is stable ---------------- */
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const rnd = mulberry32(20261005);
const R = () => rnd();
const pick = (a) => a[Math.floor(R()*a.length)];
const pickN = (a,n) => { const c=[...a]; const o=[]; while(o.length<n && c.length) o.push(c.splice(Math.floor(R()*c.length),1)[0]); return o; };
const int = (a,b) => a + Math.floor(R()*(b-a+1));
const dec = (a,b,d=2) => +(a + R()*(b-a)).toFixed(d);
const chance = (p) => R() < p;
const iso = (d) => new Date(d).toISOString().slice(0,10);
const isoFull = (d) => new Date(d).toISOString();
const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };

/* ---------------- reference data ---------------- */
const PORTS = [
  { loc:'CNSHA', name:'Shanghai',        country:'CN', region:'East Asia' },
  { loc:'CNNGB', name:'Ningbo',          country:'CN', region:'East Asia' },
  { loc:'CNYTN', name:'Yantian',         country:'CN', region:'East Asia' },
  { loc:'HKHKG', name:'Hong Kong',       country:'HK', region:'East Asia' },
  { loc:'SGSIN', name:'Singapore',       country:'SG', region:'South East Asia' },
  { loc:'MYPKG', name:'Port Klang',      country:'MY', region:'South East Asia' },
  { loc:'INNSA', name:'Nhava Sheva',     country:'IN', region:'South Asia' },
  { loc:'NLRTM', name:'Rotterdam',       country:'NL', region:'North Europe' },
  { loc:'BEANR', name:'Antwerp',         country:'BE', region:'North Europe' },
  { loc:'DEHAM', name:'Hamburg',         country:'DE', region:'North Europe' },
  { loc:'GBFXT', name:'Felixstowe',      country:'GB', region:'North Europe' },
  { loc:'FRLEH', name:'Le Havre',        country:'FR', region:'North Europe' },
  { loc:'ESALG', name:'Algeciras',       country:'ES', region:'Mediterranean' },
  { loc:'ITGOA', name:'Genoa',           country:'IT', region:'Mediterranean' },
  { loc:'USNYC', name:'New York',        country:'US', region:'North America' },
  { loc:'USLAX', name:'Los Angeles',     country:'US', region:'North America' },
  { loc:'USLGB', name:'Long Beach',      country:'US', region:'North America' },
  { loc:'USHOU', name:'Houston',         country:'US', region:'North America' },
  { loc:'BRSSZ', name:'Santos',          country:'BR', region:'South America' },
  { loc:'BRPNG', name:'Paranaguá',       country:'BR', region:'South America' },
  { loc:'ARBUE', name:'Buenos Aires',    country:'AR', region:'South America' },
  { loc:'ZADUR', name:'Durban',          country:'ZA', region:'Africa' },
  { loc:'AUSYD', name:'Sydney',          country:'AU', region:'Oceania' },
  { loc:'AEJEA', name:'Jebel Ali',       country:'AE', region:'Middle East' },
  { loc:'TRMER', name:'Mersin',          country:'TR', region:'Mediterranean' },
  { loc:'MAPTM', name:'Tanger Med',      country:'MA', region:'Mediterranean' },
];
const VESSELS = [
  ['MSC ISABELLA','MAEU'],['MSC GULSUN','MAEU'],['MAERSK MC-KINNEY MOLLER','MAEU'],['MAERSK HIDALGO','MAEU'],
  ['CMA CGM ANTOINE DE SAINT EXUPERY','CMDU'],['CMA CGM MARCO POLO','CMDU'],['ONE APUS','ONEY'],['ONE COLUMBA','ONEY'],
  ['EVER GIVEN','EGLV'],['EVER ACE','EGLV'],['HAPAG-LLOYD BERLIN EXPRESS','HLCU'],['AL ZUBARA','HLCU'],
  ['YM WELLNESS','YMLU'],['YM WITNESS','YMLU'],['CAP SAN LORENZO','SUDU'],['MONTE VERDE','SUDU'],
];
const SERVICES = ['AE7','NEU1','FAL3','Far East Loop 4','Mediterranean Express','South America Express 2','Transpacific 8','Oceania Loop 1'];
const COMPANIES = ['Amberline Industries','Nordkap Trading BV','Vertex Consumer Goods','Sunda Components Pte Ltd','Kestrel Apparel GmbH','Rivergate Foods SA','Ironbark Metals Pty','Meridian Chemicals NV','Blue Harbour Retail Ltd','Solstice Electronics Co','Prairie Grain Partners','Atlas Auto Parts Inc'];
const PEOPLE = ['Elena Marchetti','Tomás Ferreira','Anouk de Vries','Rahul Iyer','Mei Lin Chen','Jonas Berg','Priya Nair','Diego Salas','Sofia Karlsson','Hassan Al-Farsi','Grace Mwangi','Peter Okafor'];
const FIRST = ['Elena','Tomás','Anouk','Rahul','Mei','Jonas','Priya','Diego','Sofia','Hassan','Grace','Peter','Lucia','Ben','Nina','Omar'];
const LAST = ['Marchetti','Ferreira','de Vries','Iyer','Chen','Berg','Nair','Salas','Karlsson','Al-Farsi','Mwangi','Okafor','Rossi','Novak','Haddad','Kim'];

const cargoDescs = ['Household appliances, non-hazardous','Auto spare parts (HS 8708)','Polyester fabric rolls','Frozen poultry, -18°C','Ceramic tiles, palletised','Laptop computers','Furniture, flat packed','Steel coils','Coffee, green beans, in bulk bags','Pharmaceutical excipients','Wine in glass bottles','Rubber tyres','Chemical additive, non-DG','Timber, kiln dried','Plastic resin pellets','Aluminium profiles'];

/* ---------------- shipments (the Deal aggregate) ---------------- */
let refSeq = 24000000;
const nextRef = () => `LH${++refSeq}`;

function makeShipment(i) {
  const carrier = pick(CARRIERS);
  const [vesselName, vesselScac] = pick(VESSELS.filter(v => v[1] === carrier.scac)) || pick(VESSELS);
  const pol = pick(PORTS);
  let pod = pick(PORTS); let guard = 0;
  while (pod.loc === pol.loc && guard++ < 20) pod = pick(PORTS);
  const origin = chance(0.6) ? pol : pick(PORTS);
  const delivery = chance(0.55) ? pod : pick(PORTS);
  const containerCount = int(1, 9);
  const type = chance(0.72) ? 'DRY' : pick(['REEFER','OPEN_TOP','FLAT_RACK','TANK','VENTILATED']);
  const size = type === 'REEFER' ? pick(['20RF','40RF']) : type === 'OPEN_TOP' ? pick(['20OT','40OT']) : type === 'FLAT_RACK' ? pick(['20FR','40FR']) : type === 'TANK' ? pick(['20TK','40TK']) : pick(['20','40','40HC','45HC']);
  const created = addDays(new Date(), -int(0, 118));
  const etd = addDays(created, int(6, 30));
  const transit = int(14, 46);
  const eta = addDays(etd, transit);
  const today = new Date();

  // lifecycle stage drives every downstream state
  const phase = i % 10;
  const stageOf = ['draft','booked','in_transit','arrived','delivered','completed'][Math.min(5, Math.floor(phase * 0.6))];

  const bookingState =
    stageOf === 'draft'      ? pick([BOOKING_STATE.draft, BOOKING_STATE.not_ready]) :
    stageOf === 'booked'     ? pick([BOOKING_STATE.ready, BOOKING_STATE.sent, BOOKING_STATE.amend_requested]) :
    BOOKING_STATE.confirmed;
  const trackingStatus =
    stageOf === 'draft' || stageOf === 'booked' ? TRACKING_STATUS.not_started :
    stageOf === 'in_transit' ? (chance(0.22) ? TRACKING_STATUS.delayed : TRACKING_STATUS.in_transit) :
    stageOf === 'arrived' ? TRACKING_STATUS.at_pod :
    stageOf === 'delivered' ? TRACKING_STATUS.delivered : TRACKING_STATUS.completed;

  const siState = stageOf === 'draft' ? SI_STATE.none
    : stageOf === 'booked' ? pick([SI_STATE.draft, SI_STATE.none, SI_STATE.amend_sent])
    : pick([SI_STATE.approved, SI_STATE.approved, SI_STATE.amend_sent, SI_STATE.rejected]);
  const vgmState = stageOf === 'draft' || stageOf === 'booked' ? VGM_STATE.NONE
    : pick([VGM_STATE.CONFIRMED, VGM_STATE.SENT, VGM_STATE.DRAFT, VGM_STATE.CONFIRMED]);
  const eroState = stageOf === 'draft' ? 'none' : pick(['none','none','pending','confirmed']);

  const charges = pickN(CHARGE_CODES, int(3, 6)).map(c => ({
    code: c.code, label: c.label, basis: pick(['per_container','per_shipment','per_bl','per_teu']),
    currency: pick(['USD','EUR','BRL','GBP']), amount: dec(35, 2400, 2),
    payer: pick(['shipper','consignee','forwarder','third_party']), prepaid: chance(0.5),
  }));

  const containers = Array.from({ length: containerCount }, (_, k) => {
    const c = { id:`CT${i}${k}`, identificationNumber:`${pick(['MSKU','TCLU','CMAU','ONEU','EGHU','HLXU','SUDU','YMLU'])}${int(1000000,9999999)}`,
      size, type, grade: chance(0.85) ? 'A' : 'B', shipperOwned: chance(0.08),
      seals: [String(int(100000,999999))],
      stuffingDate: iso(addDays(etd, -int(2,8))), stuffingReference: `STF-${int(10000,99999)}`,
      measuredWeightG: int(2400000, 28500000), tareWeightG: int(2200000, 4800000),
      netWeightG: int(1800000, 26000000), volumeCm3: int(28, 68) * 1000000,
      packageCount: int(120, 1800), packageType: pick(['Cartons','Pallets','Bags','Drums','Crates']),
      temperature: type === 'REEFER' ? dec(-20, 6, 1) : null,
      ventilation: type === 'VENTILATED' ? `${int(15,60)} m³/h` : null,
      identificationNumberActual: chance(0.7) ? null : `${pick(['MSKU','TCLU','CMAU'])}${int(1000000,9999999)}`,
    };
    return c;
  });

  const cargoes = Array.from({ length: int(1, 4) }, (_, k) => ({
    id:`CG${i}${k}`, description: pick(cargoDescs),
    hsCode: String(int(100000, 9999999)), marksAndNumbers:`${CARRIERS[0].scac}${int(1000,9999)}`,
    salesOrderNumber:`SO-${int(100000,999999)}`, purchaseOrderNumber:`PO-${int(100000,999999)}`,
    deliveryNumber:`DN-${int(10000,99999)}`, invoiceNumber:`INV-${int(10000,99999)}`,
    grossWeightG: int(1200000, 26000000), netWeightG: int(1000000, 24000000),
    volumeCm3: int(6, 66) * 1000000, packageCount: int(40, 1400),
    packageType: pick(['Cartons','Pallets','Bags','Drums','Crates']),
    cargoValue: dec(4000, 480000, 2), cargoValueCurrency: pick(['USD','EUR','BRL']),
    dangerousGood: chance(0.12) ? { imoClass: pick(['3','8','9']), unNumber:`UN${int(1000,3500)}`, packingGroup: pick(['I','II','III']) } : null,
    ddeNumber: chance(0.2) ? `DDE${int(100000000,999999999)}` : null,
    ncmCode: chance(0.25) ? String(int(10000000, 99999999)) : null,
  }));

  const hasDeviations = trackingStatus === TRACKING_STATUS.delayed || chance(0.3);
  const deviations = hasDeviations
    ? pickN(DEVIATION_TYPES, int(1, 3)).map((d, k) => ({
        id:`DV${i}${k}`, code:d.code, label:d.label, severity:d.severity,
        occurredAt: isoFull(addDays(today, -int(0, 20))), causedBy: pick(['carrier','provider','data','user']),
        reasonCode: pick(['CARRIER_SCHEDULE_CHANGE','PORT_CONGESTION','WEATHER','VESSEL_PHASE_OUT','DOCUMENT_DELAY']),
        automatic: d.code !== 'manualDeviations', acknowledgedBy: chance(0.4) ? pick(PEOPLE) : null,
        comment: chance(0.5) ? pick(['Carrier advised a new proforma schedule.','Port congestion at transhipment hub.','Requested vessel was phased out; substitute deployed.','Awaiting revised ETA from the carrier.']) : null,
      }))
    : [];

  const openTasks = chance(0.55) ? pickN(TASK_TYPES, int(1, 3)).map((t, k) => ({
    id:`TK${i}${k}`, code:t.code, label:t.label,
    assignee: pick(PEOPLE), requestedBy: pick(PEOPLE),
    dueDate: iso(addDays(today, int(-3, 14))), state: chance(0.35) ? 'completed' : 'pending',
    priority: pick(['low','normal','high']),
  })) : [];

  const documents = pickN(DOCUMENT_TYPES, int(1, 5)).map((d, k) => ({
    id:`DOC${i}${k}`, name:`${d}.pdf`, type:d,
    uploadedBy: pick(PEOPLE), uploadedAt: isoFull(addDays(today, -int(1, 60))), sizeKb: int(48, 4200),
    sharing: pick(['private','participants','all']), state: chance(0.1) ? 'failed' : 'ready',
    version: int(1, 4),
  }));

  const comments = chance(0.6) ? Array.from({ length: int(1, 4) }, (_, k) => ({
    id:`CM${i}${k}`, author: pick(PEOPLE), authorType: pick(['user','organization']),
    createdAt: isoFull(addDays(today, -int(0, 30))), text: pick([
      'Carrier confirmed the booking; awaiting the shipping instruction.',
      'Please review the draft B/L before we release it to the shipper.',
      'VGM figures corrected for container 2 — re-sent to the carrier.',
      'Customer asked to postpone departure by one week.',
      'Document set is complete; handing over to operations.',
      'Deviation acknowledged, no action required from the customer.',
    ]),
  })) : [];

  const participations = [
    { id:`PA${i}0`, type:'organization', name:'Meridian Logistics (us)', role:'owner', aclCode:'FULL_ACCESS', isOwner:true },
    { id:`PA${i}1`, type:'organization', name: pick(COMPANIES), role:'forwarder', aclCode: pick(['FULL_ACCESS','LIMITED']), isOwner:false },
    ...(chance(0.5) ? [{ id:`PA${i}2`, type:'organization', name: pick(COMPANIES), role:'shipper', aclCode:'RESTRICTED', isOwner:false }] : []),
    { id:`PA${i}3`, type:'user', name: pick(PEOPLE), role:'operation', aclCode:'FULL_ACCESS', isOwner:false },
  ];

  const events = buildEvents({ pol, pod, etd, eta, stageOf, trackingStatus, containers, i });

  const teu = containers.reduce((s,c) => s + (c.size.startsWith('40') || c.size === '45HC' ? 2 : 1), 0);
  const routeDistNm = int(4200, 12400);
  const co2 = Math.round(routeDistNm * teu * dec(150, 260, 2));

  return {
    /* identity */
    dealId: 410000 + i, shipmentRef: nextRef(), shipmentBookingRef: chance(0.7) ? `BB${int(1000000,9999999)}` : null,
    externalId: chance(0.35) ? `EXT-${int(10000,99999)}` : null, flag: pick([0,0,0,1,2]), archived: stageOf === 'completed' && chance(0.3),
    /* references */
    bookingNumber: stageOf === 'draft' ? null : `${carrier.scac.slice(0,3)}${int(100000000,999999999)}`,
    nvoccBookingNumber: chance(0.3) ? `NV${int(10000000,99999999)}` : null,
    forwarderRef: `FWD-${int(10000,99999)}`, exporterRef: `EXP-${int(10000,99999)}`,
    importerRef: chance(0.8) ? `IMP-${int(10000,99999)}` : null, lcRef: chance(0.15) ? `LC${int(100000,999999)}` : null,
    blNumber: stageOf === 'draft' ? null : `${carrier.scac.slice(0,3)}${int(100000000,999999999)}`,
    stuffingReferences: [`STF-${int(10000,99999)}`], additionalReferences: [], purchaseOrderNumbers: cargoes.map(c=>c.purchaseOrderNumber),
    invoiceNumbers: cargoes.map(c=>c.invoiceNumber),
    /* state */
    bookingState, emptyReleaseOrderState: eroState, vgmDeclarationState: vgmState,
    dealState: stageOf === 'completed' ? DEAL_STATE.CLOSED : DEAL_STATE.OPEN,
    currentTrackingStatus: trackingStatus, shippingInstructionsState: siState,
    usExportFilingState: chance(0.25) ? pick(['none','draft','sent','accepted','rejected']) : 'none',
    bookingVersion: pick(['V1','V2']),
    /* routing */
    shippingMode: chance(0.95) ? SHIPPING_MODE[0] : pick(SHIPPING_MODE), carrierMoveType: pick(CARRIER_MOVE_TYPE),
    transportMode: chance(0.9) ? 'SEA' : pick(TRANSPORT_MODE),
    polUnlocode: pol.loc, podUnlocode: pod.loc, originUnlocode: origin.loc, deliveryUnlocode: delivery.loc,
    incotermCode: pick(INCOTERMS), incotermLocationUnlocode: chance(0.6) ? origin.loc : null,
    vesselName: stageOf === 'draft' ? null : vesselName, voyageNumber: stageOf === 'draft' ? null : `${int(100,999)}W`,
    serviceName: pick(SERVICES), carrierScac: carrier.scac, carrierName: carrier.name,
    shippingLineScac: carrier.scac, transshipments: pickN(PORTS, int(0, 2)).map(p=>p.loc),
    /* cargo */
    cargoDescriptions: cargoes.map(c=>c.description), cargoNature: chance(0.85) ? 'REGULAR' : pick(CARGO_NATURE),
    containerNumbers: containers.map(c=>c.identificationNumber), containers, containerType: type,
    containerSize: size, containerCount, teu,
    cargoes, charges,
    /* commercial */
    rate: { id:`RT${i}`, carrierScac: carrier.scac, contractNumber: `TC-${int(10000,99999)}`, amount: dec(900, 4800, 2),
      currency: pick(['USD','EUR']), validityFrom: iso(addDays(today,-90)), validityTo: iso(addDays(today,90)),
      source: pick(['contract','spot','allocation']) },
    totalCosts: dec(2400, 38000, 2), hiddenCosts: chance(0.4) ? dec(0, 900, 2) : 0, costCurrency: pick(['USD','EUR']),
    /* co2 */
    co2G: co2, co2GPerTeu: teu ? Math.round(co2/teu) : 0, co2Source: pick(['searoute','routing','carrier']),
    distanceNm: routeDistNm,
    /* dates */
    createdAt: isoFull(created), lastUpdate: isoFull(addDays(today, -int(0, 4))),
    departure: iso(etd), arrival: iso(eta), etaComputed: iso(addDays(eta, chance(0.3) ? int(-3,5) : 0)),
    cargoReadinessDate: iso(addDays(etd, -int(3,10))), cutoffDate: iso(addDays(etd, -int(3,7))),
    vgmCutoffDate: iso(addDays(etd, -int(2,5))), documentCutoffDate: iso(addDays(etd, -int(4,9))),
    wishedEmptyPickupDate: iso(addDays(etd, -int(5,12))), wishedFinalDeliveryDate: iso(addDays(eta, int(1,7))),
    shippingInstructionsSendingDate: siState !== 'none' ? iso(addDays(etd, -int(2,8))) : null,
    bookingSendingDate: bookingState !== 'draft' ? iso(addDays(created, int(1,5))) : null,
    portCalls: buildPortCalls(etd, eta, stageOf, trackingStatus),
    /* relations */
    carrier: { scac: carrier.scac, name: carrier.name, color: carrier.color, provider: carrier.provider },
    parties: {
      shipper: { name:'Meridian Logistics (us)', contact: pick(PEOPLE), eori: `NL${int(100000000,999999999)}` },
      consignee: { name: pick(COMPANIES), contact: pick(PEOPLE) },
      forwarder: { name: pick(COMPANIES), contact: pick(PEOPLE), ein: chance(0.3) ? String(int(10,99))+'-'+int(1000000,9999999) : null },
      notify: [{ name: pick(COMPANIES), contact: pick(PEOPLE) }, ...(chance(0.4) ? [{ name: pick(COMPANIES), contact: pick(PEOPLE) }] : [])],
    },
    bank: chance(0.2) ? { name: pick(['ING','BNP Paribas','HSBC','Deutsche Bank']), lcNumber: `LC${int(100000,999999)}` } : null,
    participations, events, deviations, tasks: openTasks, documents, comments,
    activities: buildActivities(events, deviations, documents, comments, openTasks),
    trackingProvider: pick(TRACKING_PROVIDERS),
    blValidation: buildBlValidation(stageOf),
    /* saved-view membership flags */
    viewedAt: isoFull(addDays(today, -int(0, 10))),
  };
}

function buildPortCalls(etd, eta, stageOf, trackingStatus) {
  const base = { originEmptyPickupTime:null, originGateInTime:null, originLoadingTime:null, originDepartureFromPolTime:null,
    destinationArrivalAtPodTime:null, destinationDischargeTime:null, destinationGateOutTime:null, destinationEmptyReturnTime:null };
  const reached = {
    draft:[], booked:['originEmptyPickupTime','originGateInTime'],
    in_transit:['originEmptyPickupTime','originGateInTime','originLoadingTime','originDepartureFromPolTime'],
    arrived:['originEmptyPickupTime','originGateInTime','originLoadingTime','originDepartureFromPolTime','destinationArrivalAtPodTime','destinationDischargeTime'],
    delivered:['originEmptyPickupTime','originGateInTime','originLoadingTime','originDepartureFromPolTime','destinationArrivalAtPodTime','destinationDischargeTime','destinationGateOutTime'],
    completed:Object.keys(base),
  }[stageOf] || [];
  reached.forEach((k, idx) => { base[k] = isoFull(addDays(etd, idx * 3 + (k.includes('destination') ? Math.round((eta - etd)/86400000) - 6 : 0))); });
  return base;
}

function buildEvents({ pol, pod, etd, eta, stageOf, trackingStatus, containers, i }) {
  const plan = [
    { code:'PICK', day:-6, place:pol.loc },
    { code:'GTIN', day:-4, place:pol.loc },
    { code:'LOAD', day:-1, place:pol.loc },
    { code:'DEPA', day:0,   place:pol.loc },
    { code:'ARRI', day:Math.round((eta-etd)/86400000)-1, place:pod.loc },
    { code:'DISC', day:Math.round((eta-etd)/86400000), place:pod.loc },
    { code:'GTOT', day:Math.round((eta-etd)/86400000)+2, place:pod.loc },
    { code:'AVDO', day:Math.round((eta-etd)/86400000)+2, place:pod.loc },
    { code:'DROP', day:Math.round((eta-etd)/86400000)+3, place:pod.loc },
  ];
  const upTo = { draft:-1, booked:2, in_transit:4, arrived:6, delivered:7, completed:9 }[stageOf] ?? 4;
  const out = [];
  plan.slice(0, Math.max(0, upTo)).forEach((p, idx) => {
    const variance = trackingStatus === TRACKING_STATUS.delayed && idx >= 3 ? int(1, 5) : int(-1, 1);
    const when = addDays(etd, p.day + variance);
    out.push({
      id:`EV${i}${idx}`, code:p.code, label:EVENT_CODES[p.code].label, stage:EVENT_CODES[p.code].stage,
      unlocode:p.place, facility:pick(['Terminal A','Terminal B','Berth 7','CFS 3','Depot North']),
      timestamp:isoFull(when), provider:pick(TRACKING_PROVIDERS), source:pick(['carrier','terminal','aggregator','manual']),
      vessel:null, voyage:null, container: containers.length ? containers[idx % containers.length].identificationNumber : null,
      estimated:false, delayDays:variance > 0 ? variance : 0, rawCode:p.code,
    });
  });
  // add the next estimated milestone so the timeline shows what's coming
  if (upTo >= 0 && upTo < plan.length) {
    const p = plan[upTo];
    out.push({
      id:`EV${i}est`, code:p.code, label:`${EVENT_CODES[p.code].label} (estimated)`, stage:EVENT_CODES[p.code].stage,
      unlocode:p.place, facility:null, timestamp:isoFull(addDays(etd, p.day)), provider:pick(TRACKING_PROVIDERS),
      source:'carrier', vessel:null, voyage:null, container:null, estimated:true, delayDays:0, rawCode:p.code,
    });
  }
  return out.sort((a,b) => a.timestamp.localeCompare(b.timestamp));
}

function buildActivities(events, deviations, documents, comments, tasks) {
  const a = [];
  events.slice(-3).forEach(e => a.push({ at:e.timestamp, kind:'event', text:`${e.label}${e.estimated ? ' (estimated)' : ''} — ${e.unlocode}` }));
  deviations.forEach(d => a.push({ at:d.occurredAt, kind:'deviation', text:`Deviation: ${d.label}` }));
  documents.slice(0,3).forEach(d => a.push({ at:d.uploadedAt, kind:'document', text:`${d.type} uploaded by ${d.uploadedBy}` }));
  comments.forEach(c => a.push({ at:c.createdAt, kind:'comment', text:`${c.author}: ${c.text.slice(0, 70)}` }));
  tasks.filter(t=>t.state==='pending').forEach(t => a.push({ at:new Date().toISOString(), kind:'task', text:`Task pending: ${t.label}` }));
  return a.sort((x,y) => y.at.localeCompare(x.at));
}

function buildBlValidation(stageOf) {
  if (stageOf === 'draft' || stageOf === 'booked') return { blocking:[], warnings:[] };
  const blocking = chance(0.35) ? pickN(BL_RULES, int(1,3)) : [];
  const warnings = chance(0.6) ? pickN(BL_RULES.filter(r => !blocking.includes(r)), int(1,4)) : [];
  return { blocking, warnings };
}

export const SHIPMENTS = Array.from({ length: 84 }, (_, i) => makeShipment(i));

/* ---------------- schedule search results (routing options) ---------------- */
export function searchSchedules({ pol, pod, containers = 1 }) {
  const results = Array.from({ length: int(4, 8) }, (_, k) => {
    const carrier = pick(CARRIERS);
    const [vessel] = pick(VESSELS.filter(v => v[1] === carrier.scac)) || pick(VESSELS);
    const direct = chance(0.45);
    const transshipments = direct ? [] : pickN(PORTS.filter(p => p.loc !== pol && p.loc !== pod), int(1,2)).map(p=>p.loc);
    const transit = int(16, 45) + transshipments.length * int(3, 7);
    const etd = addDays(new Date(), int(2, 26));
    const eta = addDays(etd, transit);
    const teu = containers * 2;
    const dist = int(4200, 12400);
    return {
      index: k, carrier: carrier.name, carrierScac: carrier.scac, carrierId: 900 + k, color: carrier.color,
      source: pick(['contract','spot','allocation','routing_algo']), direct,
      etd: iso(etd), eta: iso(eta), etdComputed: iso(addDays(etd, int(-1,1))), etaComputed: iso(addDays(eta, int(-2,2))),
      cutoffDate: iso(addDays(etd, -int(3,7))), documentCutoffDate: iso(addDays(etd, -int(5,9))), vgmCutoffDate: iso(addDays(etd, -int(2,5))),
      pol, pod, destination: pod, origin: pol,
      firstVesselName: vessel, firstVoyageNumber: `${int(100,999)}W`, serviceName: pick(SERVICES),
      transshipments, transitTimeInDays: transit, legs: buildLegs(pol, pod, transshipments, etd, transit, vessel),
      transportContractId: chance(0.6) ? 5000 + k : null, allocationPoolId: chance(0.5) ? 700 + k : null,
      rateId: 3000 + k, totalCo2GPerTeu: Math.round(dist * dec(150, 260, 2) / Math.max(1, teu)),
      co2Source: pick(['searoute','routing','carrier']), totalCo2G: Math.round(dist * teu * dec(150,260,2)),
      avgDelayEtaAtaDays: dec(-1.4, 3.6, 1), averageDelayAta: dec(-1.4, 3.6, 1),
      allocations: { pool: `AP-${int(1000,9999)}`, remaining: int(0, 240), overflow: chance(0.2) },
      rank: k + 1, selected:false, isFakeSchedule: chance(0.06), manualUpdate: chance(0.1),
      cost: dec(1150, 4800, 2), currency: 'USD',
      score: dec(55, 98, 1),
    };
  });
  return results.sort((a,b) => a.cost - b.cost);
}

function buildLegs(pol, pod, transshipments, etd, transit, vessel) {
  const stops = [pol, ...transshipments, pod];
  const legs = [];
  let cursor = addDays(etd, 0);
  const perLeg = Math.max(4, Math.round(transit / (stops.length - 1)));
  for (let i = 0; i < stops.length - 1; i++) {
    const dep = addDays(cursor, 0); const arr = addDays(dep, perLeg);
    legs.push({ from:stops[i], to:stops[i+1], departure:iso(dep), arrival:iso(arr),
      vessel, voyageNumber:`${int(100,999)}W`, serviceName:pick(SERVICES), transitDays:perLeg,
      transportMode: i===0 && chance(0.2) ? 'RAIL' : 'SEA', co2G: int(220, 900) * 1000 });
    cursor = arr;
  }
  return legs;
}

/* ---------------- rates & contracts ---------------- */
export const OCEAN_RATES = Array.from({ length: 46 }, (_, i) => {
  const carrier = pick(CARRIERS); const pol = pick(PORTS);
  let pod = pick(PORTS); while (pod.loc === pol.loc) pod = pick(PORTS);
  return {
    id: 3000 + i, carrier: carrier.name, carrierScac: carrier.scac, color: carrier.color,
    contractNumber: `TC-${int(10000,99999)}`, owner: 'Meridian Logistics (us)', contractHolder: pick(COMPANIES),
    pol: pol.loc, pod: pod.loc, origin: null, destination: null,
    containerType: pick(['DRY','REEFER','OPEN_TOP']), containerSize: pick(['20','40','40HC']),
    currency: pick(['USD','EUR']), amount: dec(780, 4600, 2), surcharges: pickN(CHARGE_CODES, int(0,3)).map(c=>({code:c.code,label:c.label,amount:dec(20,320,2)})),
    validityFrom: iso(addDays(new Date(), -int(30,120))), validityTo: iso(addDays(new Date(), int(15,180))),
    minEndValidity: iso(addDays(new Date(), -30)), maxStartValidity: iso(addDays(new Date(), 90)),
    sharingSettings: pick(['private','participants','all']), commitment: pick(['none','fixed','weekly_allocation']),
    weeklyAllocation: chance(0.4) ? int(20, 200) : null, freeDays: int(3, 21),
    transitTimeDays: int(16, 44), co2GPerTeu: Math.round(int(4200,12400) * dec(150,260,2)),
    linkedRates: [], externalId: `EXT-${int(10000,99999)}`, updatedAt: isoFull(addDays(new Date(), -int(0,40))),
  };
});

export const TRANSPORT_CONTRACTS = Array.from({ length: 18 }, (_, i) => {
  const carrier = pick(CARRIERS); const pol = pick(PORTS); let pod = pick(PORTS); while (pod.loc === pol.loc) pod = pick(PORTS);
  return {
    id: 5000 + i, owner:'Meridian Logistics (us)', contractHolder: pick(COMPANIES), contractNumber:`TC-${int(10000,99999)}`,
    carrier: carrier.name, carrierScac: carrier.scac, pol: pol.loc, pod: pod.loc,
    totalTransitTimeHours: int(340, 1080), stuffing: chance(0.5), stripping: chance(0.5),
    carrierPlaceOfReceipt: chance(0.5) ? pol.loc : null, carrierPlaceOfDelivery: chance(0.5) ? pod.loc : null,
    co2GPerTeu: Math.round(int(4200,12400) * dec(150,260,2)),
    sharingSettings: pick(['private','participants','all']), linkedRates: [],
    legs: buildLegs(pol.loc, pod.loc, [], addDays(new Date(), int(2,20)), int(16,44), pick(VESSELS)[0]),
    costs: pickN(CHARGE_CODES, int(2,5)).map(c=>({code:c.code,label:c.label,amount:dec(40,1800,2),currency:pick(['USD','EUR'])})),
    externalId:`EXT-${int(10000,99999)}`,
  };
});

export const MERCHANT_HAULAGE = Array.from({ length: 24 }, (_, i) => {
  const place = pick(PORTS); const carrier = pick(CARRIERS);
  return {
    id: 6000 + i, type: i % 2 ? 'origin' : 'destination',
    carrier: carrier.name, carrierScac: carrier.scac, provider: pick(COMPANIES),
    unlocode: place.loc, placeName: place.name, country: place.country, region: place.region,
    containerType: pick(['DRY','REEFER']), containerSize: pick(['20','40','40HC']),
    stuffing: i % 2 === 1, stripping: i % 2 === 0, receipt: chance(0.5), delivery: chance(0.5),
    currency: pick(['USD','EUR','BRL']), amount: dec(180, 1450, 2), transitTimeDays: int(1, 9),
    validityFrom: iso(addDays(new Date(), -60)), validityTo: iso(addDays(new Date(), 120)),
    freeDays: int(2, 10), co2GPerTeu: Math.round(int(60, 900) * dec(150,260,2)),
  };
});

/* ---------------- network ---------------- */
export const ORGANIZATIONS = Array.from({ length: 22 }, (_, i) => {
  const name = pick(COMPANIES);
  return {
    id: 1200 + i, name, role: pick(['shipper','forwarder','consignee','carrier_agent','both']),
    country: pick(['NL','DE','US','BR','CN','SG','GB','FR','IN','ZA']),
    taxIdentifier: `${pick(['NL','DE','US','BR'])}${int(100000000,999999999)}`,
    officialIdentifier: chance(0.7) ? String(int(10000000,99999999)) : null,
    eoriNumber: chance(0.5) ? `NL${int(100000000,999999999)}` : null,
    employerIdentificationNumberUs: chance(0.3) ? `${int(10,99)}-${int(1000000,9999999)}` : null,
    externalId: `ORG-${int(10000,99999)}`, archived: chance(0.12), city: pick(['Rotterdam','Hamburg','Santos','Shanghai','Singapore','New York','Mumbai']),
    contacts: int(2, 18), activeShipments: int(0, 46),
    sharingSettings: pick(['private','participants','all']), createdAt: iso(addDays(new Date(), -int(60, 1400))),
  };
});

export const USERS = Array.from({ length: 34 }, (_, i) => {
  const first = pick(FIRST), last = pick(LAST);
  return {
    id: 8000 + i, firstName: first, lastName: last, name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g,'')}@meridian-logistics.example`,
    phone: `+31 10 ${int(100,999)} ${int(1000,9999)}`, role: pick(['organization_administrator','manager','operation','sales','support']),
    organizationId: 1200 + (i % 22), organizationName: pick(COMPANIES),
    lastLoginAt: isoFull(addDays(new Date(), -int(0, 45))), active: chance(0.88),
    isMe: i === 0, ssoEnforced: chance(0.7), invitationPending: chance(0.1),
  };
});

export const CONTACTS = Array.from({ length: 40 }, (_, i) => {
  const first = pick(FIRST), last = pick(LAST);
  const corp = chance(0.65);
  return {
    id: 9000 + i, type: corp ? 'corporation' : 'individual',
    name: corp ? pick(COMPANIES) : `${first} ${last}`,
    contactName: `${first} ${last}`, email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g,'')}@${corp?'corp':'mail'}.example`,
    phone: `+${int(1,99)} ${int(100,999)} ${int(1000000,9999999)}`,
    city: pick(['Rotterdam','Hamburg','Santos','Shanghai','Antwerp','Le Havre','New York','Mumbai']),
    country: pick(['NL','DE','BR','CN','BE','FR','US','IN']), archived: chance(0.1),
    taxIdentifier: corp ? `${pick(['NL','DE','BR'])}${int(100000000,999999999)}` : null,
    eoriNumber: chance(0.4) ? `NL${int(100000000,999999999)}` : null,
    organizationId: 1200 + int(0, 21), facilityType: corp ? pick(['terminal','depot','warehouse','office']) : null,
    sharingSettings: pick(['private','participants','all']),
  };
});

/* ---------------- templates / automations ---------------- */
export const TEMPLATES = [
  { id:1, kind:'shipments', name:'Standard FCL export', description:'Pre-fills routing, parties and the SI for a standard FCL export.', fields:52, usage:214, updatedAt:isoFull(addDays(new Date(),-8)), automationRules:3, active:true },
  { id:2, kind:'shipments', name:'Reefer import to EU', description:'Adds temperature and ventilation requirements plus EU customs fields.', fields:52, usage:96, updatedAt:isoFull(addDays(new Date(),-19)), automationRules:5, active:true },
  { id:3, kind:'documents-and-charges-repartition', name:'Charges repartition — prepaid', description:'Splits ocean freight, THC and documentation between parties.', fields:18, usage:142, updatedAt:isoFull(addDays(new Date(),-3)), automationRules:2, active:true },
  { id:4, kind:'cargoes', name:'Auto parts cargo set', description:'HS codes, marks and package types for automotive spares.', fields:23, usage:61, updatedAt:isoFull(addDays(new Date(),-27)), automationRules:0, active:false },
  { id:5, kind:'tasks', name:'Standard document checklist', description:'Creates the document validation tasks on booking confirmation.', fields:14, usage:308, updatedAt:isoFull(addDays(new Date(),-1)), automationRules:4, active:true },
  { id:6, kind:'teams', name:'Ops pod — Europe imports', description:'Default participants and ACLs for the Europe import desk.', fields:9, usage:44, updatedAt:isoFull(addDays(new Date(),-34)), automationRules:0, active:true },
  { id:7, kind:'algos', name:'Cheapest compliant routing', description:'Weights cost, CO₂ and allocation availability when ranking options.', fields:11, usage:77, updatedAt:isoFull(addDays(new Date(),-12)), automationRules:1, active:true },
];

/* ---------------- mass operations (async) ---------------- */
export const ASYNC_OPERATIONS = Array.from({ length: 9 }, (_, i) => {
  const kind = pick(['shipping-instructions','bookings','vgm','export-filing']);
  const total = int(12, 480);
  const processed = int(0, total);
  return {
    id: 70000 + i, kind, status: processed === 0 ? 'queued' : processed >= total ? (chance(0.85) ? 'completed' : 'completed_with_errors') : 'processing',
    total, processed, failed: processed >= total ? int(0, 9) : 0, bookingBatchTotal: 25,
    bookingBatchCompleted: Math.floor(processed / 25 * 25),
    owner: pick(PEOPLE), createdAt: isoFull(addDays(new Date(), -int(0, 12))), updatedAt: isoFull(addDays(new Date(), -int(0, 1))),
    filters: { savedView: pick(['all','myPendingTasks','departuresFromPol']), carrier: chance(0.5) ? pick(CARRIERS).name : null },
    errors: [], templateId: pick(TEMPLATES).id,
  };
});

/* ---------------- reports (Power BI style) ---------------- */
export const REPORTS = [
  { id:1, name:'Shipment execution overview', owner:'Meridian Logistics (us)', scope:'organization', pages:6, schedule:'daily 06:00', lastRefresh:isoFull(addDays(new Date(),-1)), reportId:'91363ee9-ebfb-4146-bb57-f667b5a1af39', accessibleTo:'all', category:'Operations' },
  { id:2, name:'Carrier performance & delays', owner:'Meridian Logistics (us)', scope:'organization', pages:4, schedule:'weekly Mon 07:00', lastRefresh:isoFull(addDays(new Date(),-3)), reportId:'2f4b9c11-77aa-4d2e-9d31-3a0e5b7c1122', accessibleTo:'managers', category:'Performance' },
  { id:3, name:'CO₂ per TEU by trade lane', owner:'Meridian Logistics (us)', scope:'organization', pages:3, schedule:'monthly', lastRefresh:isoFull(addDays(new Date(),-11)), reportId:'8a1d2c33-4f55-4a11-9c77-6b2e8d9a4455', accessibleTo:'all', category:'Sustainability' },
  { id:4, name:'Demurrage & detention exposure', owner:'Meridian Logistics (us)', scope:'organization', pages:5, schedule:'daily 06:00', lastRefresh:isoFull(addDays(new Date(),-1)), reportId:'c9e0a1b2-3d44-4e55-8f66-7a8b9c0d1e2f', accessibleTo:'managers', category:'Cost' },
  { id:5, name:'Customs filing compliance', owner:'Meridian Logistics (us)', scope:'organization', pages:4, schedule:'weekly Tue 06:00', lastRefresh:isoFull(addDays(new Date(),-4)), reportId:'d1f2e3a4-5b66-4c77-9d88-8e9f0a1b2c3d', accessibleTo:'all', category:'Compliance' },
  { id:6, name:'My shipments — private view', owner:'Elena Marchetti', scope:'user', pages:2, schedule:'on demand', lastRefresh:isoFull(addDays(new Date(),-0.4)), reportId:'e2a3b4c5-6d77-4e88-9f99-9a0b1c2d3e4f', accessibleTo:'private', category:'Personal' },
];
export const REPORT_VERSIONS = Array.from({ length: 12 }, (_, i) => ({
  id: 200 + i, reportId: pick(REPORTS).id, version: `v${int(1,9)}.${int(0,9)}`,
  createdBy: pick(PEOPLE), createdAt: isoFull(addDays(new Date(), -int(1, 180))), note: pick(['Adds demurrage column set.','Filters moved to the reporting layer.','CO₂ source switched to routing.','Breakdown by carrier SCAC.']),
  current: i === 0,
}));

/* ---------------- control tower widgets ---------------- */
export const CONTROL_TOWER_WIDGETS = [
  { id:1, title:'Ongoing shipments', type:'kpi', metric:'totalOngoingShipments', owner:'Elena Marchetti', size:'sm', settings:{} },
  { id:2, title:'Late at arrival', type:'kpi', metric:'lateAtArrival', owner:'Elena Marchetti', size:'sm', settings:{} },
  { id:3, title:'Late at departure', type:'kpi', metric:'lateAtDeparture', owner:'Jonas Berg', size:'sm', settings:{} },
  { id:4, title:'My pending tasks', type:'kpi', metric:'myPendingTasks', owner:'Elena Marchetti', size:'sm', settings:{} },
  { id:5, title:'Shipments by status', type:'bars', metric:'byStatus', owner:'Elena Marchetti', size:'md', settings:{} },
  { id:6, title:'Departures by week', type:'bars', metric:'departuresByWeek', owner:'Jonas Berg', size:'md', settings:{} },
  { id:7, title:'CO₂ trend per TEU', type:'spark', metric:'co2Trend', owner:'Priya Nair', size:'md', settings:{} },
  { id:8, title:'Deviation mix', type:'bars', metric:'deviationMix', owner:'Priya Nair', size:'md', settings:{} },
  { id:9, title:'Carrier share', type:'bars', metric:'carrierShare', owner:'Elena Marchetti', size:'md', settings:{} },
  { id:10, title:'Documents uploaded', type:'kpi', metric:'documentsUploaded', owner:'Mei Lin Chen', size:'sm', settings:{} },
  { id:11, title:'New shipments (7d)', type:'kpi', metric:'newShipments', owner:'Elena Marchetti', size:'sm', settings:{} },
  { id:12, title:'On-time performance', type:'spark', metric:'otp', owner:'Jonas Berg', size:'md', settings:{} },
];

/* ---------------- notifications ---------------- */
export const NOTIFICATIONS = Array.from({ length: 14 }, (_, i) => ({
  id: i+1, at: isoFull(addDays(new Date(), -int(0, 12))), read: i > 3,
  kind: pick(['deviation','task','comment','document','booking']),
  text: pick([
    'New deviation: vessel arrival delay on LH24000031',
    'Task assigned to you: provide booking information',
    'Anouk de Vries commented on LH24000066',
    'Shipping instruction approved for LH24000012',
    'Booking confirmation received for LH24000048',
    'Cut-off approaching for LH24000005 (2 days)',
    'VGM declaration rejected by carrier for LH24000019',
    'Document classifier matched a B/L to LH24000073',
  ]),
}));

/* ---------------- derived views ---------------- */
export const CURRENT_USER = {
  id: 8000, name:'Elena Marchetti', email:'elena.marchetti@meridian-logistics.example',
  role:'organization_administrator', organization:'Meridian Logistics (us)', organizationId:1200,
  aclCode:'FULL_ACCESS', initials:'EM', entitlements:Object.fromEntries(
    ['shipmentsOperations','groupContainers','lab','co2','templateAutomationRules','usExportFiling','routingAlgo','portDataEnabled','documentClassifier','discrepanciesValidationV3','siBlComparisonTool','draftBlPdfSentToPlatform','bookingConfirmationPdfSentToPlatform']
      .map(k => [k, true])),
};

export const SAVED_VIEW_COUNTS = (() => {
  const today = new Date();
  const ongoing = SHIPMENTS.filter(s => s.dealState === 'open' && s.bookingState !== 'draft');
  return {
    all: SHIPMENTS.length,
    totalOngoingShipments: ongoing.length,
    myPendingTasks: SHIPMENTS.filter(s => s.tasks.some(t => t.state === 'pending')).length,
    pendingTasksRequested: SHIPMENTS.filter(s => s.tasks.some(t => t.state === 'pending' && t.requestedBy === CURRENT_USER.name)).length,
    departuresFromPol: SHIPMENTS.filter(s => { const d = new Date(s.departure); return d > today && d < addDays(today, 14); }).length,
    lateAtArrival: SHIPMENTS.filter(s => s.currentTrackingStatus === 'delayed').length,
    lateAtDeparture: SHIPMENTS.filter(s => s.deviations.some(d => d.code === 'vesselDepartureDelay')).length,
    newShipments: SHIPMENTS.filter(s => new Date(s.createdAt) > addDays(today, -7)).length,
    documentsUploaded: SHIPMENTS.filter(s => new Date(s.lastUpdate) > addDays(today, -3) && s.documents.length).length,
    newComments: SHIPMENTS.filter(s => new Date(s.lastUpdate) > addDays(today, -3) && s.comments.length).length,
  };
})();

/* ---------------- helpers used by the UI ---------------- */
export const ALL_PORTS = PORTS;
export const ALL_CARRIERS = CARRIERS;
export function findShipment(ref) { return SHIPMENTS.find(s => s.shipmentRef === ref || s.bookingNumber === ref || s.blNumber === ref); }
export function dealsForOrg(id) { return SHIPMENTS.filter(s => s.participations.some(p => p.id.endsWith('0'))); }
export const DATASET_META = {
  shipments: SHIPMENTS.length,
  containers: SHIPMENTS.reduce((n,s) => n + s.containers.length, 0),
  events: SHIPMENTS.reduce((n,s) => n + s.events.length, 0),
  deviations: SHIPMENTS.reduce((n,s) => n + s.deviations.length, 0),
  documents: SHIPMENTS.reduce((n,s) => n + s.documents.length, 0),
  rates: OCEAN_RATES.length, contracts: TRANSPORT_CONTRACTS.length, haulages: MERCHANT_HAULAGE.length,
  organizations: ORGANIZATIONS.length, users: USERS.length, contacts: CONTACTS.length,
};
