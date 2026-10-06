/**
 * Real Portside business vocabulary, extracted from the shipped v5.266.0 bundle
 * (see ../reports/business-enums.md and ../reports/product-surface.json).
 *
 * These are the wire values the real API speaks, so the replica's screens,
 * filters and statuses behave like the product's.
 */

export const BOOKING_STATE = {
  none:'none', draft:'draft', not_ready:'not_ready', ready:'ready', sent:'sent',
  confirmed:'confirmed', amend_requested:'amend_requested', awaiting_validation:'awaiting_validation',
  pending:'pending', declined:'declined', failed:'failed', canceled:'canceled',
};
export const BOOKING_STATE_LABEL = {
  none:'None', draft:'Draft', not_ready:'Not ready', ready:'Ready', sent:'Sent',
  confirmed:'Confirmed', amend_requested:'Amend requested', awaiting_validation:'Awaiting validation',
  pending:'Pending', declined:'Declined', failed:'Failed', canceled:'Canceled',
};
export const BOOKING_STATE_TONE = {
  confirmed:'green', sent:'blue', ready:'teal', draft:'grey', not_ready:'grey', none:'grey',
  amend_requested:'amber', awaiting_validation:'amber', pending:'amber',
  declined:'red', failed:'red', canceled:'grey',
};

export const SI_STATE = { none:'none', draft:'draft', amend_sent:'amend_sent', approved:'approved', rejected:'rejected', failed:'failed' };
export const SI_STATE_LABEL = { none:'None', draft:'Draft', amend_sent:'Amend sent', approved:'Approved', rejected:'Rejected', failed:'Failed' };
export const SI_STATE_TONE  = { approved:'green', draft:'grey', amend_sent:'amber', rejected:'red', failed:'red', none:'grey' };

export const VGM_STATE = { NONE:'none', DRAFT:'draft', SENT:'sent', CONFIRMED:'confirmed', FAILED:'failed' };
export const VGM_STATE_LABEL = { none:'None', draft:'Draft', sent:'Sent', confirmed:'Confirmed', failed:'Failed' };
export const VGM_STATE_TONE  = { confirmed:'green', sent:'blue', draft:'grey', failed:'red', none:'grey' };

export const DEAL_STATE = { OPEN:'open', CLOSED:'closed', ARCHIVED:'archived', CANCELED:'canceled' };
export const DEAL_STATE_LABEL = { open:'Open', closed:'Closed', archived:'Archived', canceled:'Canceled' };

export const TRACKING_STATUS = {
  none:'none', not_started:'not_started', in_transit:'in_transit', at_pod:'at_pod',
  delivered:'delivered', completed:'completed', delayed:'delayed', blank:'blank',
};
export const TRACKING_STATUS_LABEL = {
  none:'No data', not_started:'Not started', in_transit:'In transit', at_pod:'At POD',
  delivered:'Delivered', completed:'Completed', delayed:'Delayed', blank:'—',
};
export const TRACKING_STATUS_TONE = {
  in_transit:'blue', at_pod:'teal', delivered:'green', completed:'green', delayed:'red',
  not_started:'grey', none:'grey', blank:'grey',
};

/** Tracking event codes — the real milestone taxonomy (`ys4`). */
export const EVENT_CODES = {
  PICK:{label:'Empty pickup',      stage:'origin'},
  GTIN:{label:'Gate in',           stage:'origin'},
  LOAD:{label:'Loaded',            stage:'origin'},
  DEPA:{label:'Departure',         stage:'origin'},
  STUF:{label:'Stuffing',          stage:'origin'},
  STRP:{label:'Stripping',         stage:'destination'},
  DISC:{label:'Unloaded',          stage:'destination'},
  ARRI:{label:'Arrival',           stage:'destination'},
  GTOT:{label:'Gate out',          stage:'destination'},
  DROP:{label:'Drop-off',          stage:'destination'},
  AVPU:{label:'Available for pickup', stage:'destination'},
  AVDO:{label:'Available for delivery', stage:'destination'},
  INSP:{label:'Inspection',        stage:'any'},
  PRVD:{label:'Provider milestone',stage:'any'},
  RMVD:{label:'Removed',           stage:'any'},
  RSEA:{label:'Released by sea',   stage:'any'},
  CUSS:{label:'Customs submitted', stage:'customs'},
  CUSI:{label:'Customs in progress',stage:'customs'},
  CUSR:{label:'Customs released',  stage:'customs'},
  CARR:{label:'Carrier milestone', stage:'any'},
  CROS:{label:'Crossing',          stage:'any'},
  FTEX:{label:'Fumigation exit',   stage:'any'},
  FUMI:{label:'Fumigation in',     stage:'any'},
  FUMN:{label:'Fumigation note',   stage:'any'},
};

export const CARRIERS = [
  { scac:'MAEU', name:'Maersk',            provider:'maersk',        color:'#42b0d5' },
  { scac:'MSCU', name:'MSC',               provider:'msc',           color:'#1b3d6d' },
  { scac:'CMDU', name:'CMA CGM',           provider:'cma_cgm',       color:'#e2231a' },
  { scac:'ONEY', name:'ONE',               provider:'one',           color:'#e6007e' },
  { scac:'EGLV', name:'Evergreen',         provider:'evergreen',     color:'#0f8a3d' },
  { scac:'HLCU', name:'Hapag-Lloyd',       provider:'hapag_lloyd',   color:'#f39a00' },
  { scac:'YMLU', name:'Yang Ming',         provider:'yang_ming',     color:'#0a4f9e' },
  { scac:'SUDU', name:'Hamburg Süd',       provider:'hamburg_sud',   color:'#00539b' },
];
export const TRACKING_PROVIDERS = ['fourkites','inttra','cargosmart','manual','hamburg_sud','hillebrand','cma_cgm','msc','one','yang_ming','evergreen','terminal49','portcast','maersk','arkas','gatehouse','hapag_lloyd'];

export const INCOTERMS = ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP','DAT','DAF','DES','DEQ','DDU'];

export const CONTAINER_SIZES = ['20','40','40HC','45HC','20RF','40RF','20OT','40OT','20TK','40TK','20FR','40FR'];
export const CONTAINER_TYPES = [
  { code:'DRY',  label:'Dry' },
  { code:'REEFER', label:'Reefer' },
  { code:'OPEN_TOP', label:'Open top' },
  { code:'FLAT_RACK', label:'Flat rack' },
  { code:'TANK', label:'Tank' },
  { code:'VENTILATED', label:'Ventilated' },
];
export const CARGO_NATURE = ['REGULAR','DANGEROUS','OUT_OF_GAUGE','REEFER','LIVE_ANIMAL'];
export const SHIPPING_MODE = ['FCL','LCL','BULK','BREAK_BULK'];
export const CARRIER_MOVE_TYPE = ['PORT_TO_PORT','DOOR_TO_PORT','PORT_TO_DOOR','DOOR_TO_DOOR'];
export const TRANSPORT_MODE = ['SEA','RAIL','ROAD','BARGE','AIR'];

export const CURRENCIES = ['USD','EUR','GBP','BRL','CNY','SGD','JPY','AUD','CAD','CHF','INR','MXN','ZAR','TRY','AED','NOK','SEK','DKK','PLN','CZK'];

/** Deviations — the real alerting taxonomy (`notifications.deviation`). */
export const DEVIATION_TYPES = [
  { code:'vesselArrivalDelay',          label:'Vessel arrival delay',           severity:'warn',  after:1 },
  { code:'vesselDepartureDelay',        label:'Vessel departure delay',         severity:'warn',  after:1 },
  { code:'vesselArrivalEstimatedDelay', label:'Estimated arrival delay',        severity:'warn',  after:1 },
  { code:'vesselDepartureEstimatedDelay',label:'Estimated departure delay',     severity:'warn',  after:1 },
  { code:'vesselArrivalNoInformationDelay',   label:'No arrival information',   severity:'bad',   after:1 },
  { code:'vesselDepartureNoInformationDelay', label:'No departure information', severity:'bad',   after:1 },
  { code:'vesselDifferentFromRequested',label:'Vessel differs from requested',  severity:'warn' },
  { code:'podDifferentFromRequested',   label:'POD differs from requested',     severity:'bad'  },
  { code:'polDifferentFromRequested',   label:'POL differs from requested',     severity:'bad'  },
  { code:'containersDifferentFromRequested', label:'Containers differ from requested', severity:'warn' },
  { code:'bookingConfirmationNotReceived', label:'Booking confirmation not received', severity:'bad', after:1 },
  { code:'manualDeviations',            label:'Manually raised deviation',      severity:'info' },
  { code:'vesselWishedArrivalDelay',    label:'Later than wished arrival',      severity:'warn', after:1 },
  { code:'vesselWishedDepartureDelay',  label:'Later than wished departure',    severity:'warn', after:1 },
];

/** Task types — the real action catalogue (`wP`). */
export const TASK_TYPES = [
  { code:'provide_booking_information', label:'Provide booking information' },
  { code:'confirm_booking',             label:'Confirm booking' },
  { code:'send_booking',                label:'Send booking' },
  { code:'amend_booking',               label:'Amend booking' },
  { code:'remind_carrier',              label:'Remind carrier' },
  { code:'select_rate',                 label:'Select rate' },
  { code:'select_vessel',               label:'Select vessel' },
  { code:'send_shipping_instructions',  label:'Send shipping instructions' },
  { code:'amend_shipping_instructions', label:'Amend shipping instructions' },
  { code:'send_vgm',                    label:'Send VGM' },
  { code:'amend_vgm',                   label:'Amend VGM' },
  { code:'send_export_filing',          label:'Send export filing' },
  { code:'amend_export_filing',         label:'Amend export filing' },
  { code:'upload_document',             label:'Upload document' },
  { code:'validate_document',           label:'Validate document' },
  { code:'upload_version',              label:'Upload version' },
  { code:'split_shipment',              label:'Split shipment' },
  { code:'complete_booking',            label:'Complete booking' },
  { code:'cancel_booking',              label:'Cancel booking' },
  { code:'postpone_booking',            label:'Postpone booking' },
  { code:'add_participants',            label:'Add participants' },
  { code:'validate_booking',            label:'Validate booking' },
  { code:'custom',                      label:'Custom task' },
];

/** Bill-of-lading blocking / warning rules (`BBg`, 40 codes). */
export const BL_RULES = [
  'pol_unlocode__blank','pod_unlocode__blank','place_of_receipt_unlocode__blank',
  'place_of_receipt_unlocode__invalid','final_destination_unlocode__blank',
  'final_destination_unlocode__invalid','bl_information_bl_type__blank',
  'bl_information_bl_receiving_mode__blank','bl_information_bl_receiving_party_type__blank',
  'bl_information_payable_at__blank','bl_information_ocean_freight_charges__blank',
  'bl_information_ocean_freight_charges__invalid','requested_bl_copies__blank',
  'bl_distribution_shipper__missing','bl_distribution_consignee__missing',
  'bl_distribution_forwarder__missing','bl_distribution_notify_1__missing',
  'bl_distribution_notify_2__missing','bl_distribution_notify_3__missing',
  'bl_distribution_booker__missing','bl_distribution_contract_owner__missing',
  'exporter_ref__too_long','importer_ref__too_long','forwarder_ref__too_long',
  'carrier_reference_type__blank','contract_ref__too_long','tariff_number__too_long',
  'international_transaction_number__too_long','booking_number__blank','vessel_name__blank',
  'vessel_name__too_long','voyage_number__blank','voyage_number__too_long',
  'container_number__duplicate','package_type__blank','temperature__blank',
  'ventilation_unit__blank','hs_code__blank','hs_code__blank_us_in','hs_code__blank_maersk',
];
export const BL_RULE_MESSAGE = (code) => {
  const ACRONYM = { bl:'B/L', pol:'POL', pod:'POD', hs:'HS', vgm:'VGM', dg:'DG', unlocode:'UN/LOCODE',
    eori:'EORI', itn:'ITN', aes:'AES', ncm:'NCM', lc:'L/C', po:'PO', cus:'CUS', dde:'DDE', si:'SI' };
  const [field, kind] = code.split('__');
  const human = field.split('_').map(w => ACRONYM[w] || (w.length <= 3 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  const suffix = { blank:'is required', invalid:'is invalid', too_long:'exceeds the allowed length',
    missing:'is missing from the B/L distribution', duplicate:'is duplicated' }[kind] || kind;
  return `${human} ${suffix}`;
};
/** Saved views / tracking filters (`Trl`). */
export const SAVED_VIEWS = [
  { id:'all',                     label:'All shipments',            description:'Every shipment you participate in' },
  { id:'myPendingTasks',          label:'My pending tasks',         description:'Shipments with a task assigned to me' },
  { id:'pendingTasksRequested',   label:'Tasks I requested',        description:'Tasks I asked someone else to action' },
  { id:'departuresFromPol',       label:'Departures from POL',      description:'Departing in the next 14 days' },
  { id:'lateAtArrival',           label:'Late at arrival',          description:'ATA later than the booking-confirmation ETA' },
  { id:'lateAtDeparture',         label:'Late at departure',        description:'ATD later than the booking-confirmation ETD' },
  { id:'totalOngoingShipments',   label:'Ongoing shipments',        description:'Booked and not yet completed' },
  { id:'newShipments',            label:'New shipments',            description:'Created in the last 7 days' },
  { id:'documentsUploaded',       label:'Documents uploaded',       description:'Documents added since my last visit' },
  { id:'newComments',             label:'New comments',             description:'Comments posted since my last visit' },
];

/** Deal comparison / KPI attributes (`zbD`). */
export const COMPARE_ATTRS = [
  { id:'co2', label:'CO₂ (g/TEU)' }, { id:'costs', label:'Costs' },
  { id:'etdWeek', label:'ETD week' }, { id:'eta', label:'ETA' },
  { id:'deltaBetweenEtaAndAta', label:'Δ ETA / ATA' },
  { id:'allocations', label:'Allocations' }, { id:'carrierSplitAllocation', label:'Carrier split allocation' },
  { id:'routing', label:'Routing' }, { id:'earlierArrival', label:'Earlier arrival' },
  { id:'slowDown', label:'Slow down' }, { id:'vesselServiceMismatch', label:'Vessel service mismatch' },
  { id:'allocationOverflow', label:'Allocation overflow' }, { id:'allocationRatio', label:'Allocation ratio' },
];

/** Roles and permissions — the real RBAC model shipped in the bundle. */
export const ROLES = ['organization_administrator','admin','manager','operation','sales','support'];
export const SUPER_ROLES = ['admin','support'];
export const ACL_CODES = ['RESTRICTED','LIMITED','FULL_ACCESS'];
export const PERMISSIONS = {
  DEAL:['deal_read','deal_write','deal_duplicate','deal_split','deal_cancel','deal_destroy'],
  BOOKINGS:['bookings_read','bookings_write','bookings_send'],
  SHIPPING_INSTRUCTION:['shipping_instruction_read','shipping_instruction_write','shipping_instruction_send'],
  OCEAN_PLAN:['ocean_plan_read','ocean_plan_write'],
  VGM_DECLARATION:['vgm_declaration_read','vgm_declaration_write','vgm_declaration_send'],
  EMPTY_RELEASE_ORDER:['empty_release_order_read','empty_release_order_write'],
  TASKS:['tasks_read','tasks_write'],
  COMMENTS:['comments_read','comments_write'],
  ATTACHMENTS:['attachments_read','attachments_write','attachments_delete'],
  ATTACHMENT_REQUESTS:['attachment_requests_read','attachment_requests_write'],
  SHIPMENT_TRACKING:['shipment_tracking_read','shipment_tracking_write'],
  TRACKING_EVENTS:['tracking_events_read','tracking_events_write'],
  COMPUTED_DEVIATIONS:['computed_deviations_read'],
  USER_DEVIATIONS:['user_deviations_read'],
  DEVIATIONS:['deviations_write'],
  CONTAINERS:['containers_read','containers_write'],
  CARGO_AND_CONTAINERS:['cargo_and_containers_read'],
  PARTICIPATIONS:['participations_read','participations_write','participations_become_owner','participations_set_acl'],
  EVENTS:['events_read','events_write'],
  CUSTOMS_AND_FILINGS:['customs_and_filings_read','customs_and_filings_write'],
};
export const PERMISSION_LIST = Object.values(PERMISSIONS).flat();

/** Per-organisation feature entitlements shipped in the client. */
export const ENTITLEMENTS = [
  { key:'shipmentsOperations', label:'Shipments & operations module' },
  { key:'groupContainers',     label:'Container groups' },
  { key:'lab',            label:'Portside Lab' },
  { key:'co2',                 label:'CO₂ estimation' },
  { key:'templateAutomationRules', label:'Template automation rules' },
  { key:'usExportFiling',      label:'US export filing (AES/ITN)' },
  { key:'forceSsoOmniauth',    label:'Enforce SSO for all users' },
  { key:'routingAlgo',           label:'Portside algorithm (route optimisation)' },
  { key:'draftBlPdfSentToPlatform', label:'Draft B/L PDF to Portside' },
  { key:'bookingConfirmationPdfSentToPlatform', label:'Booking confirmation PDF to Portside' },
  { key:'portDataEnabled',     label:'Port data' },
  { key:'documentClassifier',  label:'Document classifier' },
  { key:'discrepanciesValidationV3', label:'Discrepancies validation v3' },
  { key:'siBlComparisonTool',  label:'SI ⇄ B/L comparison tool' },
];

export const PORT_CALL_FIELDS = [
  ['originEmptyPickupTime','Empty pickup'], ['originGateInTime','Gate in'], ['originLoadingTime','Loaded'],
  ['originDepartureFromPolTime','Departure from POL'], ['destinationArrivalAtPodTime','Arrival at POD'],
  ['destinationDischargeTime','Discharge'], ['destinationGateOutTime','Gate out'],
  ['destinationEmptyReturnTime','Empty return'],
];

export const CO2_SOURCES = ['searoute','routing','carrier','estimated'];
export const DOCUMENT_TYPES = ['Bill of lading','Shipping instruction','Booking confirmation','Commercial invoice','Packing list','Dangerous goods declaration','Certificate of origin','Phytosanitary certificate','VGM certificate','Customs declaration','Fumigation certificate','Insurance certificate'];
export const CHARGE_CODES = [
  { code:'OFT', label:'Ocean freight' }, { code:'THC', label:'Terminal handling' },
  { code:'BAF', label:'Bunker adjustment' }, { code:'CAF', label:'Currency adjustment' },
  { code:'DOC', label:'Documentation fee' }, { code:'SEA', label:'Seal fee' },
  { code:'PSS', label:'Peak season surcharge' }, { code:'ERS', label:'Emergency risk surcharge' },
  { code:'HAU', label:'Haulage' }, { code:'CUS', label:'Customs clearance' },
];
