/**
 * Portside replica — application shell, hash router and global search.
 *
 * The route tree, navigation labels and permission gates mirror the real product
 * (see ../reports/product-surface.md §2 and reports/bundle-routes.json).
 */
import { h, mount, icon, btn, chip, toast, openDrawer, closeDrawer, clear, fmtDate, titleCase } from './ui.js';
import { SHIPMENTS, CURRENT_USER, SAVED_VIEW_COUNTS, NOTIFICATIONS, findShipment, DATASET_META, ALL_PORTS } from './data.js';
import { ENTITLEMENTS, PERMISSIONS, SUPER_ROLES } from './enums.js';

/* ------------------------------------------------------------------ state */
export const state = {
  route: { name:'deals', params:{}, query:{} },
  role: 'organization_administrator',
  collapsed: false,
  listFilters: { savedView:'all', q:'', carrier:'', status:'', trade:'', page:1, pageSize:25, sort:{ key:'departure', dir:'asc' }, selection:new Set() },
  entitlements: { ...CURRENT_USER.entitlements },
  labOpen: true,
  dirty: {},
};

export function can(permission) {
  if (SUPER_ROLES.includes(state.role)) return true;
  const role = state.role;
  if (permission === 'deal_read') return true;
  if (role === 'organization_administrator') return true;
  if (role === 'manager') return !/destroy|cancel|set_acl|become_owner/.test(permission);
  if (role === 'operation') return /read|_write|send|upload|validate|deviations|comments|tasks|containers|attachments|participations_(read|write)|customs|vgm|shipping_instruction|bookings|tracking/.test(permission) && !/destroy|cancel|set_acl/.test(permission);
  if (role === 'sales') return /read|comments|tasks|participations_(read|write)|deal_duplicate/.test(permission) && !/send|destroy|cancel/.test(permission);
  if (role === 'support') return true;
  return false;
}
export const entitled = (key) => state.entitlements[key] !== false;

/* ------------------------------------------------------------------- nav */
const NAV = [
  { group:'Operate', items:[
    { id:'control-tower', label:'Control Tower', ico:'tower' },
    { id:'deals',         label:'My Shipments',  ico:'ship', badge:() => SAVED_VIEW_COUNTS.myPendingTasks },
    { id:'containers',    label:'Containers',    ico:'box' },
    { id:'container-groups', label:'Container groups', ico:'layers', ent:'groupContainers' },
    { id:'schedules',     label:'Schedules',     ico:'calendar' },
    { id:'mass-operations', label:'Mass operations', ico:'grid', ent:'shipmentsOperations', roles:['admin','organization_administrator','manager','operation','support'] },
  ]},
  { group:'Commerce', items:[
    { id:'rates',   label:'Rates & contracts', ico:'tag' },
    { id:'templates', label:'Templates', ico:'copy', ent:'templateAutomationRules' },
    { id:'reports', label:'Reports', ico:'chart', roles:['admin','organization_administrator','manager','operation','support'] },
  ]},
  { group:'Master data', items:[
    { id:'network', label:'Network', ico:'network' },
    { id:'contacts', label:'My contacts', ico:'user' },
    { id:'import-history', label:'Import history', ico:'upload' },
  ]},
  { group:'Insight', items:[
    { id:'co2', label:'CO₂ & sustainability', ico:'leaf', ent:'co2' },
    { id:'3d',  label:'3D container view', ico:'box', ent:'3D_IN_APP' },
    { id:'lab', label:'Portside Lab', ico:'flask', ent:'lab' },
  ]},
  { group:'Administration', items:[
    { id:'admin', label:'Admin', ico:'gear', roles:['admin','organization_administrator','support'] },
    { id:'interface-messages', label:'Interface messages', ico:'refresh' },
    { id:'settings', label:'My settings', ico:'gear' },
  ]},
];

/* ---------------------------------------------------------------- router */
const ROUTES = [
  [/^\/?$/,                        () => ({ name:'redirect', to:'#/deals' })],
  [/^\/deals$/,                    () => ({ name:'deals' })],
  // specific plan sub-routes MUST precede the generic workspace patterns below
  [/^\/deals\/([^/]+)\/plan\/vessel\/search$/, (m) => ({ name:'vessel-search', params:{ ref:decodeURIComponent(m[1]) } })],
  [/^\/deals\/([^/]+)\/plan\/calendar$/,      (m) => ({ name:'plan-calendar', params:{ ref:decodeURIComponent(m[1]) } })],
  [/^\/deals\/([^/]+)\/tracking-v1$/,          (m) => ({ name:'tracking-legacy', params:{ ref:decodeURIComponent(m[1]) } })],
  [/^\/deals\/([^/]+)\/([^/]+)\/([^/]+)$/, (m) => ({ name:'workspace', params:{ ref:decodeURIComponent(m[1]), tab:`${m[2]}/${m[3]}` } })],
  [/^\/deals\/([^/]+)\/([^/]+)$/,  (m) => ({ name:'workspace', params:{ ref:decodeURIComponent(m[1]), tab:m[2] } })],
  [/^\/deals\/([^/]+)$/,           (m) => ({ name:'workspace', params:{ ref:decodeURIComponent(m[1]), tab:'summary' } })],
  [/^\/booking-confirmations\/imports\/new$/,  () => ({ name:'bc-import-new' })],
  [/^\/mass-operations\/bookings\/simulations$/, () => ({ name:'simulations' })],
  [/^\/booking-confirmations$/,    () => ({ name:'booking-confirmations' })],
  [/^\/deviations$/,               () => ({ name:'deviations-board' })],
  [/^\/bookings$/,                 () => ({ name:'bookings-list' })],
  [/^\/containers\/(find|ungroup)$/, (m) => ({ name:'containers-tool', params:{ tool:m[1] } })],
  [/^\/calendar$/,                 () => ({ name:'global-calendar' })],
  [/^\/contacts\/(\d+)$/,          (m) => ({ name:'contact-detail', params:{ id:+m[1] } })],
  [/^\/403$/,                      () => ({ name:'forbidden' })],
  [/^\/schedules$/,                () => ({ name:'schedules' })],
  [/^\/control-tower$/,            () => ({ name:'control-tower' })],
  [/^\/containers$/,               () => ({ name:'containers' })],
  [/^\/container-groups$/,         () => ({ name:'container-groups' })],
  [/^\/mass-operations\/?([^/]*)$/, (m) => ({ name:'mass-operations', params:{ kind:m[1] || 'shipping-instructions' } })],
  [/^\/rates(?:\/([^/]+))?$/,      (m) => ({ name:'rates', params:{ kind:m[1] || 'ocean-carrier-rates' } })],
  [/^\/templates\/?([^/]*)$/,      (m) => ({ name:'templates', params:{ kind:m[1] || 'shipments' } })],
  [/^\/reports(?:\/([^/]+))?$/,    (m) => ({ name:'reports', params:{ kind:m[1] || 'list' } })],
  [/^\/network(?:\/([^/]+))?$/,    (m) => ({ name:'network', params:{ kind:m[1] || 'organizations' } })],
  [/^\/contacts$/,                 () => ({ name:'contacts' })],
  [/^\/import-history$/,           () => ({ name:'import-history' })],
  [/^\/co2$/,                      () => ({ name:'co2' })],
  [/^\/3d$/,                       () => ({ name:'3d' })],
  [/^\/lab$/,                      () => ({ name:'lab' })],
  [/^\/admin(?:\/([^/]+))?$/,      (m) => ({ name:'admin', params:{ kind:m[1] || 'organizations' } })],
  [/^\/interface-messages$/,       () => ({ name:'interface-messages' })],
  [/^\/settings$/,                 () => ({ name:'settings' })],
  [/^\/track-and-trace\/([^/]+)$/, (m) => ({ name:'public-track', params:{ ref:decodeURIComponent(m[1]) } })],
  [/^\/login$/,                    () => ({ name:'login' })],
  [/^\/logout$/,                   () => ({ name:'redirect', to:'#/login' })],
];

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  for (const [re, fn] of ROUTES) {
    const m = re.exec(path);
    if (m) { const r = fn(m); r.query = query; return r; }
  }
  return { name:'notfound', params:{ path }, query };
}

const viewCache = {};
const ENTRY_MAP = {};

/** route name -> exported view function */
const EXPORT_MAP = {
  deals:'deals', containers:'containers', 'container-groups':'containerGroups',
  'booking-confirmations':'bookingConfirmations',
  'control-tower':'controlTower', schedules:'schedules', rates:'rates', network:'network',
  contacts:'contacts', templates:'templates', 'mass-operations':'massOperations',
  reports:'reports', admin:'admin', settings:'settings', co2:'co2', '3d':'threeD',
  lab:'lab', 'import-history':'importHistory', 'interface-messages':'interfaceMessages',
  workspace:'renderWorkspace',
  'public-track':'publicTrack',
  login:'login',
  'vessel-search':'vesselSearch', 'plan-calendar':'planCalendar', 'tracking-legacy':'trackingLegacy',
  'bc-import-new':'bcImportNew', simulations:'simulations',
  'deviations-board':'deviationBoard', 'bookings-list':'bookingList',
  'containers-tool':'containersTool', 'global-calendar':'globalCalendar',
  'contact-detail':'contactDetail', forbidden:'forbidden',
};
const SHIPMENT_VIEWS = new Set(['deals','containers','containerGroups','bookingConfirmations']);
/** the workspace plan sub-routes (deals/:id/plan/*) */
const PLAN_VIEWS = new Set(['vessel-search','plan-calendar','tracking-legacy']);
/** list-level and detail screens */
const EXTRAS_VIEWS = new Set(['bc-import-new','simulations','deviations-board','bookings-list','containers-tool','global-calendar','contact-detail','forbidden']);

export const signedIn = () => sessionStorage.getItem('portside.session') === '1';

export async function navigate(hashOrRoute) {
  if (typeof hashOrRoute === 'string') { location.hash = hashOrRoute; return; }
  state.route = hashOrRoute;
  if (hashOrRoute.name === 'redirect') { location.replace(hashOrRoute.to); return; }
  // Everything except the login screen and the public share page needs a session,
  // exactly like the real app (which redirects to Keycloak).
  const openRoutes = new Set(['login', 'public-track']);
  if (!openRoutes.has(hashOrRoute.name) && !signedIn()) { location.replace('#/login'); return; }
  renderShell();
  const view = document.getElementById('view');
  view.scrollTop = 0;
  const name = hashOrRoute.name;
  try {
    if (!viewCache[name]) {
      const mod = name === 'public-track' ? await import('./views/share.js')
        : name === 'login' ? await import('./views/login.js')
        : PLAN_VIEWS.has(name) ? await import('./views/plan.js')
        : EXTRAS_VIEWS.has(name) ? await import('./views/extras.js')
        : name === 'workspace' ? await import('./views/workspace.js')
        : EXPORT_MAP[name] && SHIPMENT_VIEWS.has(EXPORT_MAP[name]) ? await import('./views/shipments.js')
        : await import('./views/modules.js');
      viewCache[name] = mod;
      ENTRY_MAP[name] = { mod, fn: EXPORT_MAP[name] || 'render' };
    }
    const { mod, fn } = ENTRY_MAP[name];
    const render = mod[fn] || mod.default || mod.render;
    if (typeof render !== 'function') {
      mount(view, h('div', { class:'ui segment panel' }, h('div', { class:'panel-body' }, h('div', { class:'empty-state' },
        h('div', { class:'big' }, '404 — page not found'),
        h('div', null, `No view is registered for the route "/${hashOrRoute.params?.path ?? name}".`),
        btn('Back to My Shipments', { kind:'primary', onClick: () => { location.hash = '#/deals'; } })))));
      return;
    }
    mount(view, render(state));
  } catch (err) {
    console.error(err);
    mount(view, h('div', { class:'ui negative message app-message' }, 'Failed to render view: ' + err.message));
  }
}

/* ---------------------------------------------------------------- shell */
function renderShell() {
  // chrome-free routes: the sign-in screen and the customer-facing share page
  const bare = state.route.name === 'public-track' || state.route.name === 'login';
  document.getElementById('sidebar').style.display = bare ? 'none' : '';
  document.getElementById('topbar').style.display = bare ? 'none' : '';
  document.querySelector('.app').classList.toggle('collapsed', state.collapsed);
  if (bare) return;
  renderSidebar();
  renderTopbar();
}

function renderSidebar() {
  const active = state.route.name;
  const activeTop = { deals:'deals', workspace:'deals', 'booking-confirmations':'deals' }[active] || active;
  const nav = h('nav', { class:'nav' });
  for (const g of NAV) {
    nav.appendChild(h('div', { class:'nav-group-title' }, g.group));
    for (const it of g.items) {
      const roleBlocked = it.roles && !it.roles.includes(state.role) && !SUPER_ROLES.includes(state.role);
      const entBlocked = it.ent && !entitled(it.ent === '3D_IN_APP' ? 'lab' : it.ent) && it.id !== '3d';
      const locked = roleBlocked || entBlocked;
      const isActive = activeTop === it.id;
      nav.appendChild(h('a', {
        class:`nav-item ${isActive ? 'active' : ''} ${locked ? 'locked' : ''}`,
        href:`#/${it.id}`,
        title: locked ? (roleBlocked ? `${it.label} — requires a different role (current: ${state.role})` : `${it.label} — not enabled for this organisation`) : it.label,
        onClick: locked ? (e) => { e.preventDefault(); toast(roleBlocked ? `Your role (${state.role}) cannot access ${it.label}.` : 'This module is not enabled for Meridian Logistics (us).', 'bad'); } : null,
      }, icon(it.ico, 16), h('span', { class:'nav-label' }, it.label),
        locked ? h('span', { class:'lock' }, '🔒')
        : (it.badge && it.badge() ? h('span', { class:'badge' }, it.badge()) : null)));
      if (it.id === 'deals' && !state.collapsed) {
        const sub = h('div', { class:'nav-sub' });
        const views = ['myPendingTasks','departuresFromPol','lateAtArrival','lateAtDeparture','totalOngoingShipments'];
        sub.appendChild(h('a', { class:`nav-item ${active === 'deals' && state.listFilters.savedView === 'all' ? 'active' : ''}`, href:'#/deals', onClick:() => { state.listFilters.savedView='all'; state.listFilters.page=1; } }, h('span', { class:'nav-label' }, `All shipments (${SAVED_VIEW_COUNTS.all})`)));
        for (const v of views) sub.appendChild(h('a', {
          class:`nav-item ${state.listFilters.savedView === v ? 'active' : ''}`, href:'#/deals',
          onClick:() => { state.listFilters.savedView = v; state.listFilters.page = 1; },
        }, h('span', { class:'nav-label' }, `${titleCase(v)} (${SAVED_VIEW_COUNTS[v] || 0})`)));
        nav.appendChild(sub);
      }
    }
  }
  const unread = NOTIFICATIONS.filter(n => !n.read).length;
  nav.appendChild(h('div', { class:'nav-group-title' }, 'Public link'));
  nav.appendChild(h('a', { class:'nav-item', href:`#/track-and-trace/${SHIPMENTS[0].shipmentRef}?token=demo-share-token`,
    title:'The customer-facing shared tracking page' },
    icon('link', 16), h('span', { class:'nav-label' }, 'Track & trace (shared)')));
  if (unread) nav.appendChild(h('div', { class:'nav-item', style:{ opacity:.6, fontSize:'11.5px' } }, h('span', { class:'nav-label' }, `${unread} unread notifications`)));

  mount(document.getElementById('sidebar'),
    h('div', { class:'brand' },
      h('div', { class:'brand-logo' }, 'B'),
      h('div', { class:'brand-text' }, h('div', { class:'brand-name' }, 'Portside'), h('div', { class:'brand-sub' }, 'Container Shipping'))),
    nav);
}

function renderTopbar() {
  const unread = NOTIFICATIONS.filter(n => !n.read).length;
  mount(document.getElementById('topbar'),
    h('button', { class:'icon-btn', title:'Toggle navigation', onClick: () => { state.collapsed = !state.collapsed; renderShell(); } }, icon('menu', 17)),
    h('button', { class:'search-trigger', onClick: () => openPalette() },
      icon('search', 15), h('span', null, 'Search shipments, containers, B/L, bookings…'), h('kbd', null, '⌘K')),
    h('div', { class:'topbar-right' },
      chip('production', 'green'),
      btn('Refresh', { iconName:'refresh', size:'sm', onClick: () => { viewCache[state.route.name] = null; navigate(parseHash()); toast('Refreshed (mock data)', 'good'); } }),
      h('button', { class:'icon-btn', title:`${unread} unread notifications`, onClick: showNotifications }, icon('bell', 17)),
      h('button', { class:'avatar-btn', onClick: showUserMenu, title:'Switch role to see the RBAC model in action' },
        h('div', { class:'avatar' }, CURRENT_USER.initials),
        h('div', { class:'who' }, h('div', null, CURRENT_USER.name), h('small', null, titleCase(state.role))))),
  );
}

function showNotifications() {
  openDrawer('Notifications', h('div', { class:'stack' }, NOTIFICATIONS.map(n =>
    h('div', { class:'row', style:{ alignItems:'flex-start', gap:'10px', opacity: n.read ? .6 : 1 } },
      chip(n.kind, n.kind === 'deviation' ? 'red' : n.kind === 'task' ? 'amber' : n.kind === 'document' ? 'blue' : 'grey'),
      h('div', null, h('div', null, n.text), h('div', { class:'tiny muted' }, fmtDate(n.at)))))));
}

function showUserMenu() {
  const body = h('div', { class:'stack' },
    h('div', { class:'ui info message app-message' }, h('div', null,
      h('b', null, 'Switch role'),
      h('div', { class:'tiny', style:{ marginTop:'2px' } }, 'The replica enforces the real permission model: navigation, actions and editable fields change with the role.'))),
    h('div', { class:'stack' }, ['organization_administrator','manager','operation','sales','support','admin'].map(r =>
      h('label', { class:'row', style:{ cursor:'pointer', padding:'8px', border:'1px solid var(--grey-200)', borderRadius:'6px' } },
        h('input', { type:'radio', name:'role', checked: state.role === r, onChange: () => { state.role = r; closeDrawer(); renderShell(); navigate(parseHash()); toast(`Signed in as ${titleCase(r)}`, 'good'); } }),
        h('div', null, h('div', { style:{ fontWeight:600 } }, titleCase(r)),
          h('div', { class:'tiny muted' }, r === 'admin' || r === 'support' ? 'Super-role — bypasses all permission checks' : `${Object.values(PERMISSIONS).flat().filter(p => can(p)).length} permissions granted`))))),
    h('hr', { class:'sep' }),
    h('div', { class:'kv' },
      h('div', null, 'Email'), h('div', null, CURRENT_USER.email),
      h('div', null, 'Organisation'), h('div', null, CURRENT_USER.organization),
      h('div', null, 'ACL'), h('div', null, chip(CURRENT_USER.aclCode, 'violet')),
      h('div', null, 'SSO'), h('div', null, 'Keycloak · realm portside')) ,
    h('div', { class:'tiny muted' }, 'In the real product this would be an OIDC session; here it is a local switch.'));
  openDrawer('Account', body, btn('Sign out', { onClick: () => { closeDrawer(); toast('Signed out (mock)', 'good'); } }));
}

/* ------------------------------------------------------- global search */
let paletteIndex = -1;
function openPalette() {
  const bd = document.getElementById('palette-backdrop');
  const input = document.getElementById('palette-input');
  bd.hidden = false; input.value = ''; paletteIndex = -1;
  renderPalette('');
  input.oninput = () => renderPalette(input.value);
  input.onkeydown = (e) => {
    const rows = [...document.querySelectorAll('.palette-row')];
    if (e.key === 'ArrowDown') { paletteIndex = Math.min(rows.length - 1, paletteIndex + 1); paint(rows); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { paletteIndex = Math.max(0, paletteIndex - 1); paint(rows); e.preventDefault(); }
    else if (e.key === 'Enter') { rows[Math.max(0, paletteIndex)]?.click(); }
    else if (e.key === 'Escape') closePalette();
  };
  bd.onclick = (e) => { if (e.target === bd) closePalette(); };
  input.focus();
}
function paint(rows) { rows.forEach((r, i) => r.classList.toggle('sel', i === paletteIndex)); }
export function closePalette() { document.getElementById('palette-backdrop').hidden = true; }

function searchAll(q) {
  const needle = q.trim().toLowerCase();
  if (!needle) {
    return SHIPMENTS.slice(0, 6).map(s => ({ kind:'shipment', ref:s.shipmentRef, title:`${s.shipmentRef} · ${s.polUnlocode} → ${s.podUnlocode}`, sub:`${s.carrierName} · ${s.bookingState} · ETD ${fmtDate(s.departure)}` }));
  }
  const out = [];
  for (const s of SHIPMENTS) {
    if (out.length > 24) break;
    const hay = [s.shipmentRef, s.bookingNumber, s.blNumber, s.bnvoccBookingNumber, s.exporterRef, s.importerRef, s.forwarderRef, s.polUnlocode, s.podUnlocode, s.carrierName, s.vesselName, ...s.containerNumbers].filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(needle)) out.push({ kind:'shipment', ref:s.shipmentRef, title:`${s.shipmentRef} · ${s.polUnlocode} → ${s.podUnlocode}`, sub:`${s.carrierName} · ${s.bookingState} · ETD ${fmtDate(s.departure)}` });
  }
  for (const p of ALL_PORTS) if (p.loc.toLowerCase().includes(needle) || p.name.toLowerCase().includes(needle))
    out.push({ kind:'port', title:`${p.loc} — ${p.name}`, sub:`${p.country} · ${p.region}` });
  return out.slice(0, 14);
}

function renderPalette(q) {
  const res = searchAll(q);
  paletteIndex = res.length ? 0 : -1;
  mount(document.getElementById('palette-results'),
    res.map((r, i) => h('div', { class:`palette-row ${i === paletteIndex ? 'sel' : ''}`, onClick: () => {
      closePalette();
      if (r.kind === 'shipment') location.hash = `#/deals/${encodeURIComponent(r.ref)}/summary`;
      else toast(`Location ${r.title} — mock data`, 'good');
    } }, icon(r.kind === 'shipment' ? 'ship' : 'route', 16),
      h('div', { class:'t' }, h('b', null, r.title), h('small', null, r.sub)))),
    h('div', { class:'palette-hint' }, q ? `${res.length} result(s) — this mirrors the real fuzzy /api/search/shipments endpoint` : `Recent shipments · type to search ${DATASET_META.shipments} shipments, ${DATASET_META.containers} containers`));
}

/* ------------------------------------------------------------- bootstrap */
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  if (e.key === 'Escape') { closePalette(); closeDrawer(); }
});
document.getElementById('drawer-backdrop').onclick = closeDrawer;
window.addEventListener('hashchange', () => navigate(parseHash()));

export function applyRole() { renderShell(); navigate(parseHash()); }
export { NAV, parseHash };

document.addEventListener('DOMContentLoaded', () => navigate(parseHash()));
if (document.readyState !== 'loading') navigate(parseHash());
