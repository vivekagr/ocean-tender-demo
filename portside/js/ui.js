/**
 * Component kit — emits **Semantic UI markup** so Portside's own stylesheet
 * (vendor/ui/main.css, 6,054 `.ui.*` rules) renders the real component look.
 *
 * `h(tag, props, ...children)` builds real DOM nodes; data is never injected as HTML.
 *
 * Icons use Semantic's icon font (`<i class="ship icon">`), which in this build is
 * Portside's own webfont subset — the same glyphs the real product draws.
 */

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;            // trusted inline SVG only
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden' || k === 'readOnly') el[k] = !!v;
    else el.setAttribute(k, v);
  }
  add(el, children);
  return el;
}
function add(el, kids) {
  for (const c of kids.flat(4)) {
    if (c === null || c === undefined || c === false || c === true) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
export const frag = (...kids) => { const f = document.createDocumentFragment(); add(f, kids); return f; };
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const mount = (el, ...kids) => { clear(el); add(el, kids); return el; };
export const randInt = (a, b) => (b === undefined
  ? Math.floor(Math.random() * a)
  : a + Math.floor(Math.random() * (b - a + 1)));

/* ---------------------------------------------------------------- icons */
/** our short names -> Semantic UI icon names present in Portside's icon font */
const ICON = {
  ship:'ship', box:'box', tower:'warehouse', tag:'tag', calendar:'calendar',
  network:'sitemap', file:'file', layers:'clone', chart:'signal', gear:'cog',
  search:'search', bell:'bell', plus:'plus', check:'check', x:'times', warn:'warning',
  lock:'lock', user:'user', home:'home', refresh:'refresh', download:'download',
  upload:'upload', print:'print', sparkle:'magic', grid:'table', clock:'clock',
  route:'exchange', leaf:'leaf', flask:'flask', menu:'bars', arrowLeft:'undo',
  link:'linkify', copy:'copy', list:'list', truck:'truck', money:'money',
  plane:'plane', globe:'globe', tasks:'tasks', clipboard:'clipboard', building:'building',
  industry:'industry', anchor:'anchor', columns:'columns', signal:'signal',
};
export function icon(name, size) {
  const sui = ICON[name] || name || 'circle';
  const el = h('i', { class: sui + ' icon' });
  if (size) el.style.fontSize = Math.round(size * 0.9) + 'px';
  return el;
}

/* ---------------------------------------------------------------- atoms */
/** Semantic label colours */
const TONE = { grey:'', blue:'blue', green:'green', amber:'orange', red:'red', violet:'purple', teal:'teal' };
export const chip = (text, tone = 'grey') =>
  h('div', { class: 'ui ' + (TONE[tone] ?? tone) + ' tiny label' }, text);
/** a coloured status dot */
export const dot = (tone) => h('i', { class:'circle icon',
  style:{ color: tone === 'grey' ? 'var(--grey-400)' : 'var(--' + tone + '-500)', marginRight:'2px' } });

export function btn(label, { kind = '', iconName, onClick, disabled, title, size } = {}) {
  const classes = ['ui', 'button'];
  if (kind === 'primary') classes.push('primary');
  else if (kind === 'danger') classes.push('negative');
  else classes.push('basic');
  if (size === 'sm') classes.push('small');
  const el = h('button', { class: classes.join(' '), onClick, disabled, title });
  if (iconName) el.appendChild(icon(iconName, 15));
  if (label) el.appendChild(h('span', null, label));
  return el;
}

/** A panel = Semantic segment (their `.ui.segment` look) with a header row. */
export const card = (title, body, actions) => h('div', { class:'ui segment panel' },
  title !== null && title !== undefined
    ? h('div', { class:'panel-head' }, h('h4', { class:'ui header' }, title),
        actions ? h('div', { class:'spacer' }) : null, actions ? h('div', { class:'row' }, actions) : null)
    : null,
  body);
export const cardEl = (head, ...body) => h('div', { class:'ui segment panel' },
  head ? h('div', { class:'panel-head' }, ...head) : null, ...body);

export function kpi(label, value, delta, deltaDir) {
  return h('div', { class:'ui statistic' },
    h('div', { class:'value' }, value),
    h('div', { class:'label' }, label),
    delta ? h('div', { class:'delta ' + (deltaDir || '') }, delta) : null);
}

export function field(label, control) {
  return h('div', { class:'field' }, label ? h('label', null, label) : null, control);
}
export function select(options, value, onChange, { placeholder } = {}) {
  const s = h('select', { class:'ui dropdown', onChange: e => onChange(e.target.value) });
  if (placeholder) s.appendChild(h('option', { value:'' }, placeholder));
  for (const o of options) {
    const opt = typeof o === 'string' ? { value:o, label:o } : o;
    opt && s.appendChild(h('option', { value:opt.value, selected:String(opt.value) === String(value) }, opt.label));
  }
  s.value = value ?? '';
  return s;
}
export function toggle(checked, onChange, label) {
  return h('div', { class:'ui checkbox toggle app-toggle' },
    h('input', { type:'checkbox', checked, onChange: e => onChange(e.target.checked) }),
    h('label', null, label || ''));
}

export function kv(pairs) {
  const wrap = h('div', { class:'kv' });
  for (const [k, v] of pairs) {
    wrap.appendChild(h('div', null, k));
    wrap.appendChild(h('div', null, (v === null || v === undefined || v === '') ? h('span', { class:'empty' }, '—') : v));
  }
  return wrap;
}

export function tabs(items, activeId, onSelect) {
  return h('div', { class:'ui secondary pointing menu app-tabs' }, items.map(it =>
    h('a', { class:'item' + (it.id === activeId ? ' active' : ''), onClick: () => onSelect(it.id) },
      it.label, it.count !== undefined ? h('span', { class:'muted', style:{ marginLeft:'6px' } }, '(' + it.count + ')') : null)));
}

/* --------------------------------------------------------- data table */
export function table(columns, rows, opts = {}) {
  const { sort, onSort, rowKey = (r, i) => i, onRowClick, selected = new Set(), onSelect, emptyText = 'No records' } = opts;
  const thead = h('thead', null, h('tr', null,
    onSelect ? h('th', { class:'one wide' }, h('input', { type:'checkbox',
      checked: rows.length > 0 && selected.size === rows.length,
      onChange: e => onSelect(e.target.checked ? rows.map(r => rowKey(r)) : []) })) : null,
    columns.map(c => h('th', {
      class: [c.num ? 'right aligned' : '', c.sortable ? 'sorted' : ''].join(' '),
      style: c.width ? { width:c.width } : null,
      onClick: c.sortable && onSort ? () => onSort(c.key, sort && sort.key === c.key && sort.dir === 'asc' ? 'desc' : 'asc') : null,
      title: c.title || null,
    }, c.label, c.sortable ? h('i', { class:(sort && sort.key === c.key ? (sort.dir === 'asc' ? 'sort up' : 'sort down') : 'sort') + ' icon',
      style:{ opacity: sort && sort.key === c.key ? 1 : .35 } }) : null))));
  const tbody = h('tbody', null, rows.length ? rows.map((r, i) => h('tr', {
    class: (onRowClick ? 'selectable' : '') + (selected.has(rowKey(r, i)) ? ' active' : ''),
    style: onRowClick ? { cursor:'pointer' } : null,
    onClick: onRowClick ? (e) => { if (e.target.type === 'checkbox') return; onRowClick(r, i); } : null,
  },
    onSelect ? h('td', null, h('input', { type:'checkbox', checked:selected.has(rowKey(r, i)),
      onChange: e => { const next = new Set(selected); e.target.checked ? next.add(rowKey(r, i)) : next.delete(rowKey(r, i)); onSelect(next); } })) : null,
    columns.map(c => h('td', { class:[c.num ? 'right aligned' : '', c.mono ? 'mono' : ''].join(' ') }, c.render ? c.render(r) : r[c.key]))) )
    : h('tr', null, h('td', { colspan: columns.length + (onSelect ? 1 : 0) },
        h('div', { class:'empty-state' }, h('div', { class:'big' }, emptyText)))));
  return h('div', { class: opts.maxHeight ? 'table-wrap' : '', style: opts.maxHeight ? { maxHeight:opts.maxHeight } : null },
    h('table', { class:'ui celled selectable compact table' }, thead, tbody));
}

/* ------------------------------------------------------------- charts */
export function bars(values, labels) {
  const max = Math.max(1, ...values);
  return h('div', { class:'bars' }, values.map((v, i) =>
    h('i', { style:{ height: Math.round((v / max) * 100) + '%' }, title:(labels ? labels[i] + ': ' : '') + v })));
}
export function sparkline(values, { stroke = 'var(--blue-500)' } = {}) {
  const w = 320, hgt = 44, max = Math.max(...values), min = Math.min(...values);
  const span = Math.max(1, max - min);
  const pts = values.map((v, i) => ((i / (values.length - 1)) * w) + ',' + (hgt - ((v - min) / span) * (hgt - 6) - 3)).join(' ');
  return h('span', { html:
    '<svg class="spark" viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none"><polyline fill="none" stroke="' + stroke + '" stroke-width="2" points="' + pts + '"/></svg>' });
}
export function progress(pct, tone) {
  return h('div', { class:'ui small progress' },
    h('div', { class:'bar', style:{ width: Math.max(0, Math.min(100, pct)) + '%', background: tone ? 'var(--' + tone + ')' : null } }));
}
export function timeline(items) {
  return h('div', { class:'timeline' }, items.map(it => h('div', { class:'tl-item ' + (it.tone || '') },
    h('div', { class:'tl-when' }, it.when),
    h('div', { class:'tl-what' }, it.what),
    it.where ? h('div', { class:'tl-where' }, it.where) : null,
    it.extra || null)));
}

/* --------------------------------------------------------------- alerts */
const MSG = { bad:'negative', warn:'warning', good:'positive', info:'info' };
export const alert = (tone, text, extraArgs) => h('div', { class:'ui ' + (MSG[tone] || 'info') + ' message app-message' },
  icon(tone === 'good' ? 'check' : tone === 'info' ? 'sparkle' : 'warn', 16),
  h('div', { class:'content' }, text, extraArgs || null));

/* ---------------------------------------------------------- overlays */
export function toast(msg, tone) {
  const el = h('div', { class:'toast ' + (tone || '') }, msg);
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
export function openDrawer(title, body, actions) {
  const d = document.getElementById('drawer');
  const bd = document.getElementById('drawer-backdrop');
  mount(d,
    h('div', { class:'drawer-head' }, h('h4', { class:'ui header' }, title), h('div', { class:'spacer' }), actions || null,
      h('button', { class:'ui basic icon button', onClick: closeDrawer, title:'Close' }, icon('x', 15))),
    h('div', { class:'drawer-body' }, body));
  d.hidden = false; bd.hidden = false;
}
export function closeDrawer() {
  document.getElementById('drawer').hidden = true;
  document.getElementById('drawer-backdrop').hidden = true;
}

/* ------------------------------------------------------------- format */
export const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
export const fmtDateShort = (s) => s ? new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) : '—';
export const fmtDateTime = (s) => s ? new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—';
export const fmtNum = (n) => (n === null || n === undefined) ? '—' : Number(n).toLocaleString('en-US');
export const fmtMoney = (n, c = 'USD') => (n === null || n === undefined) ? '—' : new Intl.NumberFormat('en-US', { style:'currency', currency:c, maximumFractionDigits:0 }).format(n);
export const fmtWeight = (g) => g == null ? '—' : (g / 1000).toLocaleString('en-US', { maximumFractionDigits:0 }) + ' kg';
export const fmtVolume = (cm3) => cm3 == null ? '—' : (cm3 / 1e6).toLocaleString('en-US', { maximumFractionDigits:3 }) + ' m³';
export const fmtPct = (n) => (n == null ? '—' : Number(n).toFixed(1) + '%');
export const fmtCo2 = (g) => {
  if (g == null) return '—';
  if (g >= 1e6) return (g / 1e6).toFixed(1) + ' t';
  if (g >= 1e3) return Math.round(g / 1e3).toLocaleString('en-US') + ' kg';
  return Math.round(g) + ' g';
};
export const ago = (s) => {
  if (!s) return '—';
  const diff = (Date.now() - new Date(s).getTime()) / 86400000;
  if (diff < 1) return 'today';
  if (diff < 2) return 'yesterday';
  if (diff < 30) return Math.floor(diff) + ' days ago';
  return fmtDate(s);
};
export const rel = (s) => {
  if (!s) return '—';
  const d = Math.round((new Date(s).getTime() - Date.now()) / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d === -1) return 'yesterday';
  return d > 0 ? 'in ' + d + 'd' : (-d) + 'd ago';
};
export const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export function download(filename, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type:'text/plain' })), download: filename });
  document.body.appendChild(a); a.click(); a.remove();
}
export function downloadCsv(filename, columns, rows) {
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const csv = [columns.map(c => esc(c.label)).join(','),
    ...rows.map(r => columns.map(c => esc(c.value ? c.value(r) : r[c.key])).join(','))].join('\n');
  download(filename, csv);
}
