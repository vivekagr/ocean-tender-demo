/* =============================================================================
 * Ocean Tender · data
 * -----------------------------------------------------------------------------
 * Ports, carriers, suppliers, cost structures, charge categories, equipment,
 * statuses and modes used across the demo.
 * ========================================================================== */
(function () {
  'use strict';

  /* --------------------------------------------------------------- reference */
  const PORTS = [
    ['CNSHA', 'Shanghai', 'CN', 'ASIA'], ['CNNGB', 'Ningbo', 'CN', 'ASIA'],
    ['SGSIN', 'Singapore', 'SG', 'ASIA'], ['KRPUS', 'Busan', 'KR', 'ASIA'],
    ['JPTYO', 'Tokyo', 'JP', 'ASIA'], ['MYPKG', 'Port Klang', 'MY', 'ASIA'],
    ['VNSGN', 'Ho Chi Minh City', 'VN', 'ASIA'], ['THLCH', 'Laem Chabang', 'TH', 'ASIA'],
    ['IDJKT', 'Jakarta', 'ID', 'ASIA'], ['INNSA', 'Nhava Sheva', 'IN', 'ASIA'],
    ['LKCMB', 'Colombo', 'LK', 'ASIA'], ['NLRTM', 'Rotterdam', 'NL', 'EUROPEAN_UNION'],
    ['DEHAM', 'Hamburg', 'DE', 'EUROPEAN_UNION'], ['GBFXT', 'Felixstowe', 'GB', 'EUROPE'],
    ['FRLEH', 'Le Havre', 'FR', 'EUROPEAN_UNION'], ['ESALG', 'Algeciras', 'ES', 'EUROPEAN_UNION'],
    ['ITGOA', 'Genoa', 'IT', 'EUROPEAN_UNION'], ['GRPIR', 'Piraeus', 'GR', 'EUROPEAN_UNION'],
    ['PLGDN', 'Gdansk', 'PL', 'EUROPEAN_UNION'], ['PTLEI', 'Leixões', 'PT', 'EUROPEAN_UNION'],
    ['MAPTM', 'Tanger Med', 'MA', 'AFRICA'], ['EGPSD', 'Port Said', 'EG', 'AFRICA'],
    ['ZADUR', 'Durban', 'ZA', 'AFRICA'], ['USLAX', 'Los Angeles', 'US', 'NORTH_AMERICA'],
    ['USNYC', 'New York', 'US', 'NORTH_AMERICA'], ['USSAV', 'Savannah', 'US', 'NORTH_AMERICA'],
    ['MXZLO', 'Manzanillo', 'MX', 'NORTH_AMERICA'], ['BRSSZ', 'Santos', 'BR', 'SOUTH_AMERICA'],
    ['CLVAP', 'Valparaíso', 'CL', 'SOUTH_AMERICA'], ['AUSYD', 'Sydney', 'AU', 'OCEANIA'],
    ['AEJEA', 'Jebel Ali', 'AE', 'MIDDLE_EAST'], ['TRMER', 'Mersin', 'TR', 'MIDDLE_EAST'],
  ].map(([code, name, country, region]) => ({ code, name, country, region }));

  const CARRIERS = [
    { code: 'MAEU', name: 'Maersk', scac: 'MAEU', reliability: 78.4 },
    { code: 'MSCU', name: 'MSC', scac: 'MSCU', reliability: 74.1 },
    { code: 'CMDU', name: 'CMA CGM', scac: 'CMDU', reliability: 71.8 },
    { code: 'HLCU', name: 'Hapag-Lloyd', scac: 'HLCU', reliability: 76.2 },
    { code: 'ONEY', name: 'Ocean Network Express', scac: 'ONEY', reliability: 73.5 },
    { code: 'EGLV', name: 'Evergreen', scac: 'EGLV', reliability: 70.9 },
    { code: 'COSU', name: 'COSCO', scac: 'COSU', reliability: 72.6 },
    { code: 'HDMU', name: 'HMM', scac: 'HDMU', reliability: 71.1 },
    { code: 'YMLU', name: 'Yang Ming', scac: 'YMLU', reliability: 69.4 },
    { code: 'ZIMU', name: 'ZIM', scac: 'ZIMU', reliability: 68.7 },
    { code: 'OOLU', name: 'OOCL', scac: 'OOLU', reliability: 75.3 },
    { code: 'PILU', name: 'Pacific International', scac: 'PILU', reliability: 67.8 },
  ];

  const SUPPLIERS = [
    { id: 'sup-kn', name: 'Kuehne + Nagel', country: 'CH', nda: true, questionnaire: true, rating: 4.6 },
    { id: 'sup-dhl', name: 'DHL Global Forwarding', country: 'DE', nda: true, questionnaire: true, rating: 4.4 },
    { id: 'sup-dsv', name: 'DSV', country: 'DK', nda: true, questionnaire: true, rating: 4.5 },
    { id: 'sup-dbs', name: 'DB Schenker', country: 'DE', nda: true, questionnaire: false, rating: 4.2 },
    { id: 'sup-exp', name: 'Expeditors', country: 'US', nda: true, questionnaire: true, rating: 4.3 },
    { id: 'sup-ceva', name: 'CEVA Logistics', country: 'FR', nda: false, questionnaire: false, rating: 3.9 },
    { id: 'sup-boll', name: 'Bolloré Logistics', country: 'FR', nda: true, questionnaire: true, rating: 4.1 },
    { id: 'sup-nx', name: 'Nippon Express', country: 'JP', nda: true, questionnaire: false, rating: 4.0 },
    { id: 'sup-hel', name: 'Hellmann Worldwide', country: 'DE', nda: false, questionnaire: false, rating: 3.8 },
    { id: 'sup-scan', name: 'Scan Global Logistics', country: 'DK', nda: true, questionnaire: true, rating: 4.2 },
    { id: 'sup-geo', name: 'GEODIS', country: 'FR', nda: true, questionnaire: true, rating: 4.3 },
    { id: 'sup-ags', name: 'AGS Transports', country: 'FR', nda: false, questionnaire: false, rating: 3.6 },
  ];

  const EQUIPMENT = [
    { code: '20GP', label: "20' Dry", mode: 'SEA_FCL', teu: 1 },
    { code: '40GP', label: "40' Dry", mode: 'SEA_FCL', teu: 2 },
    { code: '40HC', label: "40' High Cube", mode: 'SEA_FCL', teu: 2 },
    { code: '40RF', label: "40' Reefer", mode: 'SEA_FCL', teu: 2 },
    { code: '45HC', label: "45' High Cube", mode: 'SEA_FCL', teu: 2.25 },
    { code: 'LCL', label: 'LCL (CBM)', mode: 'SEA_LCL', teu: 0 },
    { code: 'AIR', label: 'Air freight (kg)', mode: 'AIR', teu: 0 },
    { code: 'PARCEL', label: 'Parcel', mode: 'PARCEL', teu: 0 },
  ];

  // Real enum values recovered from the unminified source (reports/source-domain.md)
  const MODES = ['SEA_FCL', 'SEA_LCL', 'SEA_CONSOL', 'AIR', 'PARCEL'];
  const TENDER_STATUS = ['DRAFT', 'OPEN', 'SIMULATION', 'OPENAWARDED', 'AWARDED', 'CLOSED', 'ARCHIVED'];
  const COST_TYPES = ['ALL_IN', 'ALL_IN_PER_UNIT', 'ALL_IN_FLAT', 'CHARGE'];

  /* Charge structure mirrors the real wide rate-card header (reports/grid-schemas.md):
     row0 = charge category, row1 = cost type, row3 = data header. */
  const CHARGE_CATEGORIES = [
    { name: 'Origin charges', charges: [
      { name: 'Origin THC', type: 'CHARGE', unit: 'per container', mandatory: true },
      { name: 'Origin Documentation', type: 'CHARGE', unit: 'per B/L', mandatory: true },
      { name: 'Export Customs', type: 'CHARGE', unit: 'per shipment', mandatory: false },
      { name: 'Origin Inland Haulage', type: 'CHARGE', unit: 'per container', mandatory: false },
      { name: 'Origin CFS', type: 'CHARGE', unit: 'per CBM', mandatory: false },
    ]},
    { name: 'Main carriage', charges: [
      { name: 'Ocean Freight', type: 'ALL_IN_PER_UNIT', unit: 'per container', mandatory: true },
      { name: 'BAF / Bunker', type: 'CHARGE', unit: 'per container', mandatory: true },
      { name: 'Peak Season Surcharge', type: 'CHARGE', unit: 'per container', mandatory: false },
      { name: 'Low Sulphur Surcharge', type: 'CHARGE', unit: 'per container', mandatory: false },
    ]},
    { name: 'Destination charges', charges: [
      { name: 'Destination THC', type: 'CHARGE', unit: 'per container', mandatory: true },
      { name: 'Destination Documentation', type: 'CHARGE', unit: 'per B/L', mandatory: true },
      { name: 'Import Customs', type: 'CHARGE', unit: 'per shipment', mandatory: false },
      { name: 'Destination Inland Haulage', type: 'CHARGE', unit: 'per container', mandatory: false },
    ]},
    { name: 'Additional', charges: [
      { name: 'Cargo Insurance', type: 'CHARGE', unit: 'per shipment', mandatory: false },
      { name: 'Dangerous Goods', type: 'CHARGE', unit: 'per container', mandatory: false },
      { name: 'Demurrage & Detention', type: 'CHARGE', unit: 'per container/day', mandatory: false },
    ]},
  ];

  /* Real randomisation seeds so the mock is stable across reloads */
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  /* ------------------------------------------------------------------ tenders */
  const TENDER_SEEDS = [
    ['Ocean Freight 2027 — Asia to North Europe', 'OPEN', 'SEA_FCL', 'CNSHA', 'NLRTM', 5, 640],
    ['Transpacific Eastbound — Q1 2027', 'OPEN', 'SEA_FCL', 'CNSHA', 'USLAX', 4, 880],
    ['Intra-Europe FTL & LTL Tender', 'SIMULATION', 'SEA_FCL', 'DEHAM', 'FRLEH', 3, 210],
    ['Latin America Export Programme', 'DRAFT', 'SEA_FCL', 'BRSSZ', 'ESALG', 2, 175],
    ['Air Freight Capacity 2027 — EU ↔ APAC', 'OPEN', 'AIR', 'DEHAM', 'SGSIN', 4, 96],
    ['LCL Consolidation — Mediterranean', 'OPENAWARDED', 'SEA_LCL', 'ITGOA', 'TRMER', 3, 340],
    ['Reefer Programme — Southern Hemisphere', 'OPEN', 'SEA_FCL', 'ZADUR', 'GBFXT', 3, 148],
    ['Middle East Gateway Lanes', 'AWARDED', 'SEA_FCL', 'AEJEA', 'INNSA', 2, 265],
    ['North America Inland Distribution', 'CLOSED', 'SEA_FCL', 'USNYC', 'USSAV', 2, 190],
    ['2026 Ocean Freight — awarded baseline', 'ARCHIVED', 'SEA_FCL', 'SGSIN', 'NLRTM', 6, 1020],
    ['Parcel & Express — Domestic EU', 'DRAFT', 'PARCEL', 'NLRTM', 'DEHAM', 1, 42],
    ['Transatlantic Westbound 2027', 'OPEN', 'SEA_FCL', 'DEHAM', 'USNYC', 4, 410],
  ];

  function makeLanes(seed, qty, mode) {
    const r = rng(seed);
    const lanes = [];
    for (let i = 0; i < qty; i++) {
      const from = PORTS[Math.floor(r() * PORTS.length)];
      let to = PORTS[Math.floor(r() * PORTS.length)];
      if (to.code === from.code) to = PORTS[(PORTS.indexOf(to) + 7) % PORTS.length];
      const equip = EQUIPMENT.filter((e) => e.mode === mode || mode === 'SEA_FCL')[Math.floor(r() * 5)] || EQUIPMENT[1];
      lanes.push({
        id: 'lane-' + seed + '-' + i,
        row: i + 1,
        origin: from.code,
        originName: from.name,
        destination: to.code,
        destinationName: to.name,
        equipment: equip.code,
        mode,
        volume: Math.round(40 + r() * 900),
        unit: mode === 'AIR' ? 'kg' : mode === 'SEA_LCL' ? 'cbm' : 'feu',
        transitTime: Math.round(14 + r() * 32),
        incoterm: ['FOB', 'CIF', 'EXW', 'DAP', 'FCA'][Math.floor(r() * 5)],
        targetRate: Math.round((900 + r() * 3400) * 100) / 100,
      });
    }
    return lanes;
  }

  const TENDERS = TENDER_SEEDS.map((s, i) => {
    const [title, status, mode, o, d, rounds, lanes] = s;
    const r = rng(1000 + i * 37);
    const created = new Date(2026, 6, 4 + i * 3);
    const close = new Date(2026, 8, 20 + (i % 9));
    const allLanes = makeLanes(1000 + i * 37, Math.min(lanes, 34), mode);
    const participants = SUPPLIERS.slice(0, 4 + Math.floor(r() * 7)).map((sp, k) => ({
      ...sp,
      invited: true,
      status: k < 3 ? 'SUBMITTED' : k < 6 ? 'IN_PROGRESS' : ['INVITED', 'DECLINED', 'NO_RESPONSE'][k % 3],
      quotesIn: k < 3 ? allLanes.length : Math.floor(allLanes.length * (0.3 + r() * 0.6)),
      lastActivity: new Date(2026, 8, 20 + ((i + k) % 8), 9 + (k % 9), (k * 13) % 60),
    }));
    return {
      id: 'TND-2026-' + String(100 + i),
      title,
      status,
      mode,
      origin: o,
      destination: d,
      laneCount: allLanes.length,
      lanes: allLanes,
      round: 1 + (i % rounds),
      totalRounds: rounds,
      created: created.toISOString(),
      closeDate: close.toISOString(),
      // owners are shipper-side colleagues only (the supplier/support personas are separate people)
      owner: ['A. Ruiz', 'M. Lindqvist', 'J. Okafor', 'M. Weber', 'P. Novak'][i % 5],
      company: 'Acme Logistics GmbH',
      currency: 'EUR',
      participants,
      savings: Math.round(r() * 22 * 10) / 10,
      awarded: status === 'AWARDED' || status === 'OPENAWARDED',
      spot: i % 4 === 3,
    };
  });

  /* --------------------------------------------------------------- rate cards */
  /* Wide table: one row per lane, one column group per charge. Every numeric cell
     carries the real format "0.[000000]" and the real cap 999999999999. */
  function makeRateCard(tender, round) {
    const r = rng((round || 1) * 7919 + tender.id.length);
    const charges = CHARGE_CATEGORIES.flatMap((c) => c.charges.map((ch) => ({ ...ch, category: c.name })));
    const cols = [];
    charges.forEach((ch, ci) => {
      const suppliers = tender.participants.filter((p) => p.nda).slice(0, 4);
      if (!suppliers.length) return;
      suppliers.forEach((sp, si) => {
        cols.push({
          uid: `c${ci}_${si}`,
          chargeId: `chg-${ci}`,
          id: ch.type === 'ALL_IN_PER_UNIT' ? 'allin' : null,
          field: ch.name,
          category: ch.category,
          type: ch.type,
          unit: ch.unit,
          mandatory: ch.mandatory,
          supplierId: sp.id,
          supplier: sp.name,
          notNegative: true,
        });
      });
    });
    const rows = tender.lanes.map((lane) => {
      const cells = [];
      cols.forEach((c) => {
        const base = c.type === 'ALL_IN_PER_UNIT' ? lane.targetRate : lane.targetRate * (0.06 + r() * 0.22);
        const v = c.supplierId.charCodeAt(4) % 3 === 0 ? null : Math.round(base * (0.82 + r() * 0.34) * 100) / 100;
        cells.push(v);
      });
      const errors = {};
      // A deterministic error so the validation surface is visible
      if (lane.row === 2 && cols.length > 3) errors[cols[3].uid] = 'Value must not be negative';
      return { e: cells, meta: { row: lane.row, recordId: 'rec-' + lane.id, origin: lane.origin, destination: lane.destination, equipment: lane.equipment, volume: lane.volume }, errors, warnings: {} };
    });
    return { columns: cols, rows, headerRows: 4, round: round || 1 };
  }

  /* --------------------------------------------------------------- spot bids */
  const SPOT_BIDS = [
    {
      id: 'SPOT-2026-041',
      title: 'Urgent — Shanghai → Rotterdam, 40HC × 8',
      status: 'LIVE',
      mode: 'SEA_FCL',
      closesInSec: 941,
      lanes: 1,
      currency: 'EUR',
      participants: SUPPLIERS.slice(0, 6).map((s) => s.name),
      bids: [
        { supplier: 'Kuehne + Nagel', amount: 2380, at: '14:02:11', rank: 1, delta: -6.2 },
        { supplier: 'DSV', amount: 2415, at: '14:01:38', rank: 2, delta: -3.1 },
        { supplier: 'DHL Global Forwarding', amount: 2490, at: '13:58:04', rank: 3, delta: -1.4 },
        { supplier: 'GEODIS', amount: 2521, at: '13:55:47', rank: 4, delta: -0.6 },
        { supplier: 'Expeditors', amount: 2560, at: '13:51:19', rank: 5, delta: 0 },
      ],
    },
    {
      id: 'SPOT-2026-040',
      title: 'Air freight — Frankfurt → Singapore, 1,200 kg',
      status: 'LIVE',
      mode: 'AIR',
      closesInSec: 10412,
      lanes: 1,
      currency: 'EUR',
      participants: SUPPLIERS.slice(3, 9).map((s) => s.name),
      bids: [
        { supplier: 'DB Schenker', amount: 4180, at: '13:47:02', rank: 1, delta: -4.8 },
        { supplier: 'Nippon Express', amount: 4290, at: '13:44:55', rank: 2, delta: -2.2 },
        { supplier: 'CEVA Logistics', amount: 4405, at: '13:40:12', rank: 3, delta: -0.9 },
      ],
    },
    {
      id: 'SPOT-2026-039',
      title: 'Reefer — Durban → Felixstowe, 40RF × 4',
      status: 'CLOSED',
      mode: 'SEA_FCL',
      closesInSec: 0,
      lanes: 1,
      currency: 'EUR',
      participants: SUPPLIERS.slice(1, 5).map((s) => s.name),
      bids: [
        { supplier: 'Maersk (direct)', amount: 5940, at: '11:22:41', rank: 1, delta: -7.5 },
        { supplier: 'Bolloré Logistics', amount: 6180, at: '11:18:03', rank: 2, delta: -2.0 },
      ],
    },
  ];

  /* ---------------------------------------------------------------- reporting */
  /* These are the REAL provider::method pairs dispatched by
     GET /reporting/json?provider=<pkg>/<Class>&method=<fn>  (reports/reporting-engine.json) */
  const REPORT_WIDGETS = [
    { provider: 'company_statistics/RunningTenders', method: 'openTenders', title: 'Open tenders', kind: 'kpi', value: 7, sub: 'of 12 this year' },
    { provider: 'company_statistics/RunningTenders', method: 'finalizedTenders', title: 'Finalized tenders', kind: 'kpi', value: 5, sub: 'avg 4.2 rounds' },
    { provider: 'company_statistics/Savings', method: 'totalAvgSavings', title: 'Average savings', kind: 'kpi', value: '11.4%', sub: 'vs. baseline 2026' },
    { provider: 'savings_widget/SavingsWidget', method: 'getSavings', title: 'Savings vs. baseline', kind: 'bar' },
    { provider: 'company_statistics/Savings', method: 'top5Tenders', title: 'Top 5 tenders by savings', kind: 'bars' },
    { provider: 'suppliers_widgets/SuppliersWidgets', method: 'quoteEvolution', title: 'Quote evolution by round', kind: 'line' },
    { provider: 'suppliers_widgets/SuppliersWidgets', method: 'rateCardSubmission', title: 'Rate-card submission', kind: 'donut', pct: 78 },
    { provider: 'suppliers_widgets/SuppliersWidgets', method: 'invitationAcceptance', title: 'Invitation acceptance', kind: 'donut', pct: 91 },
    { provider: 'suppliers_widgets/SuppliersWidgets', method: 'ndaAcceptance', title: 'NDA acceptance', kind: 'bar' },
    { provider: 'suppliers_widgets/SuppliersWidgets', method: 'questionnaireSubmission', title: 'Questionnaire submission', kind: 'bar' },
    { provider: 'suppliers_widgets/SuppliersWidgets', method: 'questionnaireScoring', title: 'Questionnaire scoring', kind: 'bars' },
    { provider: 'suppliers_widgets/SuppliersWidgets', method: 'latestReceipts', title: 'Latest receipts', kind: 'list' },
    { provider: 'nomination_widgets/NominationWidgets', method: 'NominatedSpend', title: 'Nominated spend', kind: 'kpi', value: '€18.4M', sub: 'across 9 tenders' },
    { provider: 'nomination_widgets/NominationWidgets', method: 'NominatedSuppliers', title: 'Nominated suppliers', kind: 'bars' },
    { provider: 'nomination_widgets/NominationWidgets', method: 'NominationProgressInLanes', title: 'Nomination progress — lanes', kind: 'progress' },
    { provider: 'nomination_widgets/NominationWidgets', method: 'NominationProgressInShipments', title: 'Nomination progress — shipments', kind: 'progress' },
  ];

  /* The other real dashboard providers (charts reached through the same dispatcher) */
  const REPORT_PROVIDERS = [
    'avg_leadtime_per_supplier/AvgLeadTimePerSupplier', 'impact_tree/ImpactTree',
    'incumbent_allocation/IncumbentAllocation', 'leadtime_geo_map/LeadtimeGeoMap',
    'nominated_scope_per_supplier/NominatedScopePerSupplier', 'nomination_geo_map/NominationGeoMap',
    'power_scenario/PowerScenarioReports', 'quick_view_charts/QuickViewCharts',
    'rank_statistics/RankStatisticsPerShipment', 'scope_geo_map/ScopeGeoMap',
    'score_card_dashboard/ScoreCardDashboard', 'theoretical_nomination/TheoreticalNomination',
    'total_cost_per_supplier/TotalCostPerSupplier', 'export_raw_data/ExportRawData',
    'company_statistics/RunningTenders', 'company_statistics/Savings',
    'nomination_widgets/NominationWidgets', 'savings_widget/SavingsWidget',
    'suppliers_widgets/SuppliersWidgets',
  ];

  /* -------------------------------------------------------------- topics/feed */
  /* The 110 real STOMP channels; these are the ones that surface in the UI. */
  const ACTIVITY = [
    { topic: '/topic/TENDER_UPDATED/', at: '2 min ago', who: 'M. Lindqvist', text: 'Round 2 opened on Ocean Freight 2027 — Asia to North Europe', kind: 'tender' },
    { topic: '/topic/QA_MESSAGE/', at: '18 min ago', who: 'Kuehne + Nagel', text: 'Q: Are the BAF charges fixed for the full validity period?', kind: 'qa' },
    { topic: '/topic/SPOT_PARTICIPANT_INVITED/', at: '41 min ago', who: 'System', text: '4 suppliers invited to SPOT-2026-041', kind: 'spot' },
    { topic: '/topic/RATE_CARD_STATUS_UPDATED/', at: '1 h ago', who: 'DSV', text: 'Rate card submitted for Ocean Freight 2027 (282 of 282 lanes)', kind: 'ratecard' },
    { topic: '/topic/ROUND_CANCELLED/', at: '3 h ago', who: 'A. Ruiz', text: 'Round 3 cancelled on Intra-Europe FTL & LTL Tender', kind: 'round' },
    { topic: '/topic/NEW_ANNOUNCEMENT/', at: '5 h ago', who: 'Corporate', text: 'New sustainability reporting requirements for 2027 tenders', kind: 'announcement' },
    { topic: '/topic/CUSTOMER_DEADLINE_UPDATED/', at: 'yesterday', who: 'System', text: 'Submission deadline moved to 30 Sep 2026, 17:00 CET', kind: 'deadline' },
    { topic: '/topic/DOCUMENTATION_DOWNLOAD_COMPLETE/', at: 'yesterday', who: 'System', text: 'Documentation package ready (14.2 MB)', kind: 'docs' },
    { topic: '/topic/TENDER_ARCHIVED/', at: '2 days ago', who: 'J. Okafor', text: '2026 Ocean Freight — awarded baseline archived', kind: 'tender' },
    { topic: '/topic/SUPPORT_TICKET_STATUS/', at: '3 days ago', who: 'Support', text: 'Ticket #4471 resolved — rate card import column mapping', kind: 'support' },
  ];

  const NOTIFICATIONS = ACTIVITY.map((a, i) => ({ id: 'ntf-' + i, ...a, read: i > 3 }));

  const DEADLINES = [
    { date: '2026-09-30', time: '17:00', label: 'Submission deadline', tender: 'Ocean Freight 2027 — Asia to North Europe', kind: 'submission', severity: 'high' },
    { date: '2026-10-04', time: '12:00', label: 'Questionnaire deadline', tender: 'Air Freight Capacity 2027 — EU ↔ APAC', kind: 'questionnaire', severity: 'medium' },
    { date: '2026-10-07', time: '17:00', label: 'Round 1 closes', tender: 'Transpacific Eastbound — Q1 2027', kind: 'round', severity: 'high' },
    { date: '2026-10-12', time: '09:00', label: 'Award decision', tender: 'Reefer Programme — Southern Hemisphere', kind: 'award', severity: 'medium' },
    { date: '2026-10-15', time: '17:00', label: 'Port validation deadline', tender: 'Latin America Export Programme', kind: 'validation', severity: 'low' },
    { date: '2026-10-21', time: '17:00', label: 'Supplier acceptance', tender: 'LCL Consolidation — Mediterranean', kind: 'acceptance', severity: 'medium' },
  ];

  /* --------------------------------------------------------------- support/faq */
  const TICKETS = [
    { id: '#4471', subject: 'Rate card import — column mapping rejected', status: 'RESOLVED', priority: 'HIGH', updated: '3 days ago', owner: 'Support' },
    { id: '#4468', subject: 'Cannot invite a supplier — domain not allowed', status: 'IN_PROGRESS', priority: 'NORMAL', updated: '4 days ago', owner: 'Platform' },
    { id: '#4460', subject: 'Questionnaire scoring weights not applied', status: 'WAITING_ON_CUSTOMER', priority: 'NORMAL', updated: '6 days ago', owner: 'Support' },
    { id: '#4455', subject: 'SSO login loops for one colleague', status: 'RESOLVED', priority: 'HIGH', updated: '1 week ago', owner: 'Platform' },
    { id: '#4451', subject: 'Export to XLSX omits the destination charges group', status: 'IN_PROGRESS', priority: 'LOW', updated: '1 week ago', owner: 'Reporting' },
  ];

  const FAQ = [
    ['How do I create a tender?', 'Use My events → Create. The wizard covers General Details, Documentation & NDA, Suppliers, Questionnaire, Rate Card and Additional Configuration before launch.'],
    ['What is a round?', 'A tender can run several rounds. Each round captures a fresh set of quotations; previous rounds stay available for comparison and for the quote-evolution chart.'],
    ['What is a scope?', 'A scope groups lanes so that a supplier can quote on part of a tender. Scopes can be mandatory or optional and are used for award splitting.'],
    ['How do all-in rates differ from charges?', 'ALL_IN is a single door-to-door price; ALL_IN_PER_UNIT is per container or per weight; ALL_IN_FLAT is a fixed amount. Charges are itemised under Origin, Main carriage, Destination and Additional.'],
    ['Who can see my tender?', 'Only the colleagues you invite and the suppliers you select. Supplier visibility can be set to Hidden at any time, which removes the tender from their list.'],
    ['What is a simulation?', 'A simulation models a scenario against submitted quotes — for example awarding 60% of the volume to one supplier — without changing the live tender.'],
    ['How are deadlines enforced?', 'Submission, questionnaire, port-validation and acceptance deadlines are all enforced server-side; the UI shows a countdown and blocks late edits.'],
  ];

  const RELEASE_NOTES = [
    { version: '2026.09.2', date: '2026-09-22', items: ['Nomination scenarios: per-lane scope split', 'Rate-card import: fuzzy column matching', 'Reporting: quote-evolution chart by round'] },
    { version: '2026.08.4', date: '2026-08-14', items: ['Spot bidding: bid ladder shows rank movement', 'Questionnaire scoring: weighted sections', 'New localisation: Turkish, Indonesian, Polish'] },
    { version: '2026.07.1', date: '2026-07-02', items: ['Documentation: letter templates with live variables', 'Support: operational dashboard for support staff', 'Baseline wizard for incumbent rate comparison'] },
  ];

  const DOCS = [
    { name: 'Getting started — creating your first tender', kind: 'Guide', size: '1.2 MB' },
    { name: 'Rate-card configuration reference', kind: 'Reference', size: '840 KB' },
    { name: 'Nominations and scenarios', kind: 'Guide', size: '760 KB' },
    { name: 'Questionnaires and scoring', kind: 'Guide', size: '610 KB' },
    { name: 'Reporting and data exports', kind: 'Reference', size: '980 KB' },
    { name: 'API & integration overview', kind: 'Reference', size: '320 KB' },
  ];

  /* ------------------------------------------------------ company configuration */
  const COMPANY = {
    id: 'cmp-acme',
    name: 'Acme Logistics GmbH',
    vat: 'DE814592773',
    country: 'DE',
    currency: 'EUR',
    address: { street: 'Hafenstrasse 12', city: 'Hamburg', postalCode: '20359', country: 'DE' },
    invoiceEmail: 'freight.invoices@acme.example',
    logo: 'ACME',
  };

  const ACCESS_CODES = [
    ['CREATE_OPEN_TENDER', 'Create and open tenders'],
    ['CHANGE_TENDER_STATUS_AWARD_FINISH_CANCEL', 'Award, finish or cancel a tender'],
    ['INVITE_COLLEAGUES', 'Invite colleagues'],
    ['VIEW_COMPANY_SETTINGS', 'View company settings'],
    ['VIEW_OVERALL_TENDER_STATS', 'View overall tender statistics'],
    ['SEARCH_TENDERS', 'Search tenders'],
    ['REVIEW_ONBOARDING', 'Review supplier onboarding'],
    ['CONSULTANT', 'Consultant access'],
  ];

  /* Real identities, so the permission model is demonstrable:
     `user.support` is the staff flag; `showSpotBiddingOverview()` is a regex on the
     email domain (the KWE tenant); `showPricing()` matches four hard-coded addresses. */
  const PERSONAS = [
    {
      id: 'shipper', label: 'Shipper admin (Acme)', userName: 'A. Ruiz',
      email: 'a.ruiz@acme.example', company: COMPANY.name, support: false,
      access: ACCESS_CODES.map((c) => c[0]), roles: ['Tender Manager'],
      flag: { calendarEnabled: true, ratesExportEnabled: true, localizationEnabled: true, anyFaq: true, sandbox: true, pricing: false },
    },
    {
      id: 'assistant', label: 'Tender assistant (limited)', userName: 'J. Okafor',
      email: 'j.okafor@acme.example', company: COMPANY.name, support: false,
      access: ['SEARCH_TENDERS', 'VIEW_COMPANY_SETTINGS'], roles: ['Tender Assistant'],
      flag: { calendarEnabled: true, ratesExportEnabled: false, localizationEnabled: true, anyFaq: true, sandbox: false, pricing: false },
    },
    {
      id: 'supplier', label: 'Supplier / participant', userName: 'S. Bergmann',
      email: 's.bergmann@kuehne-nagel.example', company: 'Kuehne + Nagel', support: false,
      access: [], roles: [], flag: { calendarEnabled: false, ratesExportEnabled: false, localizationEnabled: false, anyFaq: false, sandbox: false, pricing: false },
    },
    {
      id: 'support', label: 'Ocean Tender support', userName: 'L. Chen',
      email: 'l.chen@oceantender.com', company: null, support: true,
      access: ['REVIEW_ONBOARDING', 'VIEW_OVERALL_TENDER_STATS', 'SEARCH_TENDERS'], roles: ['Ocean Tender Support'],
      flag: { calendarEnabled: true, ratesExportEnabled: true, localizationEnabled: true, anyFaq: true, sandbox: false, pricing: false },
    },
    {
      id: 'kwe', label: 'KWE tenant build', userName: 'M. Lindqvist',
      email: 'm.lindqvist@kwe.example', company: 'KWE', support: false,
      access: ACCESS_CODES.map((c) => c[0]), roles: ['Tender Manager'],
      flag: { calendarEnabled: true, ratesExportEnabled: true, localizationEnabled: true, anyFaq: true, sandbox: true, pricing: true },
    },
  ];

  /* -------------------------------------------------------- investigation facts */
  /* Rendered by the "Evidence" drawer so the mock doubles as a map of the audit. */
  const EVIDENCE = {
    '/login': { template: 'app/components/login/login.html', auth: 'anonymous', api: ['POST /login', 'POST /logout', 'GET /api/v1/auth/saml/tenant?email=', 'GET /isLogined'], note: 'Login failure is HTTP 400, never 401. MFA is username="<email>~<code>". SSO leaves for a separate IdP host.' },
    '/': { template: 'app/components/home/home.html', auth: 'anonymous for the shell', api: ['GET /enabled', 'GET /users/getCurrentUser/', 'GET /company/current', 'GET /notification/unread/count/{userId}'], note: 'GET /enabled returns the deployment feature flags: calendar, ratesExport, ratesManagement, tendersReport, faq, ctmsApi.' },
    '/tenders': { template: 'app/components/searchTenders/tenders.html', auth: 'session', api: ['GET /tenders/meta', 'GET /tenders/search', 'GET /tender/participants/groups', 'GET /activity/fetch'], note: 'No server-side pagination exists anywhere in the API — 201 parameter names and zero page/size/offset. The client paginates an array it already holds.' },
    '/createTender/:id': { template: 'app/components/createTender/createTenderController.js', auth: 'session', api: ['POST /tender/new', 'POST /tender/save', 'POST /attachments/addConversationAttachment/{id}', 'POST /company/suppliers/upload'], note: 'Tender creation is a BODY-LESS POST: tender/new, tender/rfi/new, tender/sr/new and spot/new take no payload and the server seeds the skeleton.' },
    '/controlroom/:activeTab/:id': { template: 'app/components/controlRoom/controlroom.html', auth: 'session', api: ['GET /controlroom/shipper/scorecard', 'GET /controlroom/participant/getRateCardTable', 'GET /controlroom/shipper/profile/field/values', 'GET /reporting/json?provider=…'], note: 'The largest namespace on the service: 255 paths. Every /controlroom/shipper/<unknown> path returns 401 rather than 404, so the auth wall hides route existence entirely.' },
    '/spot/:id': { template: 'app/components/spot/spotBidController.js', auth: 'session', api: ['GET /spot/conversation/new/{spotId}', 'POST /spot/bidder/submit/batch', 'POST /spot/save', 'POST /spot/decline/'], note: 'spotBidController.js is the single largest source file recovered (152 KB). /spot/save is the one endpoint whose 405 the client treats as benign.' },
    '/reporting': { template: 'app/components/bi/bi.js', auth: 'session', api: ['GET /reporting/json?provider=<pkg>/<Class>&method=<fn>', 'GET /bi/list?tenderId=', 'GET /dash/get'], note: '28 providers / 71 provider::method pairs. The same dispatcher backs /reporting/json, /reporting/excel (POI), /reporting/excel_birt and /reporting/pdf. Every /reporting/** request is 401 + 0 bytes.' },
    '/companySettings': { template: 'app/components/companySettings/companySettingsController.js', auth: 'session', api: ['GET /company/api/settings', 'GET /company/structure/get', 'GET /company/tiers/get', 'POST /company/updateAccess?companyId='], note: 'The editable ACL is an opaque blob (company.aux.accessHelper) posted to /company/updateAccess — mass-assignment shaped.' },
    '/calendar': { template: 'app/components/calendar/calendar.js', auth: 'session', api: ['GET /calendar/fetch', 'GET /tender/canDecline?declineToken='], note: 'Calendar rendering uses mwl.calendar with moment; config pins the date formatter and week-number label.' },
    '/support': { template: 'app/components/support/support.js', auth: 'session', api: ['GET /support/ticket/counter', 'GET /support/export/all/rate/cards/get/companies', 'POST /support/email/mass'], note: 'First-party ticketing, not Zendesk — the Zendesk snippet is commented out in the served HTML. support.js sendMassEmail() validates the From domain but omits return, so the client posts regardless.' },
    '/tx/carriers/request/:txId/:requestId': { template: 'app/components/tx/txController.js', auth: 'anonymous + CSRF-exempt', api: ['POST /tx/carriers/request'], note: 'Reaches its handler with no token and no session (400 for a missing txId). /tx/** is CSRF-exempt as a namespace.' },
    '/onboard': { template: 'app/components/onboard/onboardingForm.html', auth: 'anonymous', api: ['POST /onboard/request', 'POST /onboard/confirm', 'GET /onboard/countries'], note: 'POST /onboard/request performs no visible server-side validation — {} and {"company":{}} both return 200 with an empty body. The full schema is public because the form is inside the anonymous /app/components/onboard/** mount.' },
    '/gdpr': { template: 'app/components/gdpr/gdpr.html', auth: 'anonymous', api: ['GET /gdpr/fetch?token=', 'POST /gdpr/erasure'], note: 'A bad token returns the custom status 420 Method Failure. The error renderer is content-negotiated: application/json leaks an internal class name, */* returns an HTML 500 page.' },
    '/unsubscribe/success': { template: 'app/components/unsubscribe/success.html', auth: 'anonymous', api: ['POST /unsubscribe/request'], note: 'One of the ten anonymous namespaces.' },
  };

  const STATS = {
    apiPaths: 1218, namespaces: 76, sources: 125, sourceBytes: '3.0 MB',
    templates: 357, anonymousTemplates: 23, routes: 41, topics: 110,
    i18nKeys: 5406, languages: 16, anonymousPaths: 74, checks: '55/55',
    publicData: '12.78 MB', findings: 39, angles: 75,
  };

  window.OT = {
    PORTS, CARRIERS, SUPPLIERS, EQUIPMENT, MODES, TENDER_STATUS, COST_TYPES,
    CHARGE_CATEGORIES, TENDERS, SPOT_BIDS, REPORT_WIDGETS, REPORT_PROVIDERS,
    ACTIVITY, NOTIFICATIONS, DEADLINES, TICKETS, FAQ, RELEASE_NOTES, DOCS,
    COMPANY, ACCESS_CODES, PERSONAS, EVIDENCE, STATS,
    makeRateCard, makeLanes,
  };
})();
