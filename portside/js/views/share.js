/**
 * Public track & trace — the login-free page a customer receives.
 *
 * Mirrors the real share app: route `track-and-trace/:shipmentRef` with a `token` search
 * param, calling the `/shared/api/**` namespace with that token as a Bearer credential.
 * Here it is rendered locally with mock data and a deliberately limited field set.
 */
import {
  h, icon, chip, card, kv, table, timeline, btn, toast, alert, fmtDate, fmtDateTime, fmtNum, fmtWeight, fmtVolume,
} from '../ui.js';
import { findShipment, ALL_PORTS } from '../data.js';
import { EVENT_CODES, TRACKING_STATUS_LABEL, TRACKING_STATUS_TONE } from '../enums.js';

const PUBLIC_FIELDS_HIDDEN = ['totalCosts','hiddenCosts','charges','rate','internalNotes','forwarderRef','importerRef','lcRef'];

export function publicTrack() {
  const { ref } = state_params();
  const token = new URLSearchParams(location.hash.split('?')[1] || '').get('token');
  const s = findShipment(ref);

  if (!token) return gate(ref, 'missing');
  if (!s) return gate(ref, 'notfound');
  if (token !== 'demo-share-token' && !token.startsWith('demo')) {
    // any other token is treated as expired, matching the real 401 contract
    return gate(ref, 'expired');
  }

  return h('div', { class:'public-page' },
    h('header', { class:'public-bar' },
      h('div', { class:'brand-logo' }, 'B'),
      h('div', null, h('div', { style:{ fontWeight:700, letterSpacing:'2.4px', textTransform:'uppercase' } }, 'Portside'),
        h('div', { class:'tiny', style:{ color:'#9fb3c8' } }, 'Track & trace')),
      h('div', { class:'spacer' }),
      chip('shared link', 'teal'),
      btn('Back to the replica', { size:'sm', onClick:() => location.hash = '#/deals' })),
    h('div', { class:'public-wrap' },
      hero(s),
      h('div', { class:'grid cols-2' },
        card('Milestones', h('div', { class:'panel-body' }, timeline(s.events.map(e => ({
          when: fmtDateTime(e.timestamp) + (e.estimated ? ' (estimated)' : ''),
          what: e.label, where: placeName(e.unlocode) + (e.facility ? ' · ' + e.facility : ''),
          tone: e.estimated ? '' : e.delayDays ? 'warn' : 'done',
        }))))),
        h('div', { class:'stack' },
          card('Shipment', kv(publicFields(s))),
          card('Containers', table([
            { key:'identificationNumber', label:'Container', mono:true },
            { key:'size', label:'Size' }, { key:'type', label:'Type' },
            { key:'lastEvent', label:'Last event', render:r => { const e = s.events.filter(x => x.container === r.identificationNumber).pop(); return e ? `${e.label} · ${placeName(e.unlocode)}` : '—'; } },
            { key:'measured', label:'Gross weight', num:true, render:r => fmtWeight(r.measuredWeightG) },
          ], s.containers, { maxHeight:'300px' })),
          card('Need help?', h('div', { class:'panel-body stack' },
            h('div', { class:'muted' }, 'Contact your Portside account team quoting the reference below.'),
            h('div', { class:'mono', style:{ fontWeight:600 } }, s.shipmentRef),
            alert('info', 'This page is a local replica of the login-free tracking page. It shows only the fields a customer share link exposes — no costs, internal references or participant data.')))))));
}

function state_params() { return { ref: location.hash.split('/')[2]?.split('?')[0] || '' }; }

function hero(s) {
  const p = ALL_PORTS.find(x => x.loc === s.podUnlocode);
  const o = ALL_PORTS.find(x => x.loc === s.polUnlocode);
  const pct = Math.min(100, Math.round((s.events.filter(e => !e.estimated).length / 8) * 100));
  return h('div', { class:'ui segment panel', style:{ marginBottom:'14px' } }, h('div', { class:'panel-body' },
    h('div', { class:'row', style:{ flexWrap:'wrap' } },
      h('div', null,
        h('div', { class:'tiny muted' }, 'Shipment reference'),
        h('div', { style:{ fontSize:'22px', fontWeight:650 } }, s.shipmentRef),
        h('div', { class:'muted', style:{ marginTop:'2px' } }, `${s.carrierName}${s.vesselName ? ' · ' + s.vesselName + ' ' + (s.voyageNumber || '') : ''}`)),
      h('div', { class:'spacer' }),
      chip(TRACKING_STATUS_LABEL[s.currentTrackingStatus] || s.currentTrackingStatus, TRACKING_STATUS_TONE[s.currentTrackingStatus] || 'grey')),
    h('div', { class:'row', style:{ margin:'18px 0', alignItems:'flex-start', gap:'18px' } },
      h('div', null, h('div', { class:'tiny muted' }, 'Port of loading'), h('div', { style:{ fontWeight:600 } }, o ? o.name : s.polUnlocode), h('div', { class:'mono tiny' }, s.polUnlocode), h('div', { class:'tiny muted' }, 'ETD ' + fmtDate(s.departure))),
      h('div', { style:{ flex:1, paddingTop:'16px' } },
        h('div', { class:'progress' }, h('i', { style:{ width:pct + '%' } })),
        h('div', { class:'tiny muted', style:{ textAlign:'center', marginTop:'6px' } }, `${pct}% of the journey milestones recorded`)),
      h('div', { class:'right' }, h('div', { class:'tiny muted' }, 'Port of discharge'), h('div', { style:{ fontWeight:600 } }, p ? p.name : s.podUnlocode), h('div', { class:'mono tiny' }, s.podUnlocode), h('div', { class:'tiny muted' }, 'ETA ' + fmtDate(s.arrival)))),
    h('div', { class:'kpis' },
      kpiPub('Containers', String(s.containerCount)),
      kpiPub('TEU', String(s.teu)),
      kpiPub('Cargo', s.cargoDescriptions[0]?.slice(0, 28) + (s.cargoDescriptions[0]?.length > 28 ? '…' : '')),
      kpiPub('Last update', lastActual(s) ? fmtDate(lastActual(s)) : '—'))));
}
const kpiPub = (l, v) => h('div', { class:'ui statistic' }, h('div', { class:'lbl' }, l), h('div', { class:'val', style:{ fontSize:'17px' } }, v));

function publicFields(s) {
  const o = ALL_PORTS.find(x => x.loc === s.polUnlocode), d = ALL_PORTS.find(x => x.loc === s.podUnlocode);
  return [
    ['Reference', h('span', { class:'mono' }, s.shipmentRef)],
    ['Booking number', h('span', { class:'mono' }, s.bookingNumber)],
    ['Bill of lading', h('span', { class:'mono' }, s.blNumber)],
    ['Carrier', s.carrierName],
    ['Vessel / voyage', s.vesselName ? `${s.vesselName} ${s.voyageNumber}` : null],
    ['From', `${o?.name || s.polUnlocode} (${s.polUnlocode})`],
    ['To', `${d?.name || s.podUnlocode} (${s.podUnlocode})`],
    ['ETD / ETA', `${fmtDate(s.departure)} → ${fmtDate(s.arrival)}`],
    ['Incoterm', s.incotermCode],
    ['Shipping mode', s.shippingMode],
    ['Containers', `${s.containerCount} × ${s.containerSize}`],
    ['Last update', fmtDateTime(lastActual(s))],
  ];
}
/** the newest non-estimated milestone — what a customer means by "last update" */
const lastActual = (s) => {
  const actual = s.events.filter(e => !e.estimated);
  return actual.length ? actual[actual.length - 1].timestamp : s.lastUpdate;
};
const placeName = (loc) => { const p = ALL_PORTS.find(x => x.loc === loc); return p ? `${p.name} (${loc})` : loc; };

function gate(ref, reason) {
  const messages = {
    missing: ['A token is required', 'This tracking link must include its share token, e.g. ?token=…', 'In the real product the page calls GET /api/shipments/{shipment_ref}/tracking/shared-token and passes the result to the /shared API.'],
    expired: ['This link is no longer valid', 'The share token was rejected (HTTP 401 from the /shared API).', 'Ask your Portside contact for a fresh link.'],
    notfound: ['Shipment not found', `No shipment matches the reference "${ref}".`, 'Check the reference, or ask your Portside contact to re-share the link.'],
  }[reason];
  return h('div', { class:'public-page', style:{ display:'grid', placeItems:'center', padding:'22px' } },
    h('div', { class:'ui segment panel', style:{ maxWidth:'520px' } }, h('div', { style:{ textAlign:'center', padding:'32px' } },
      h('div', { style:{ color:'var(--orange-600)', marginBottom:'8px' } }, icon('lock', 30)),
      h('h2', { style:{ fontSize:'18px' } }, messages[0]),
      h('p', { class:'muted', style:{ marginTop:'8px' } }, messages[1]),
      h('p', { class:'tiny muted' }, messages[2]),
      h('div', { class:'row', style:{ justifyContent:'center', marginTop:'14px' } },
        btn('Open a demo link', { kind:'primary', onClick:() => location.hash = '#/track-and-trace/LH24000018?token=demo-share-token' }),
        btn('Back to the replica', { onClick:() => location.hash = '#/deals' })))));
}
