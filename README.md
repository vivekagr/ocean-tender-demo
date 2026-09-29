# Ocean Tender — front-end demo

A self-contained demo of the Ocean Tender freight-procurement application.
**No backend, no build step, no network.** Open `index.html` in a browser — `file://` works.

```bash
open index.html                 # macOS
# or a local server, if you prefer a URL:
node serve.mjs                  # → http://127.0.0.1:4173
```

---

## Using it

1. **Sign in** with any of the five persona buttons. Each is a different access profile:
   - **Shipper admin** — all 8 access codes
   - **Tender assistant** — `SEARCH_TENDERS` + `VIEW_COMPANY_SETTINGS` only
   - **Supplier / participant** — no company, so the shipper sections are hidden
   - **Ocean Tender support** — the staff flag, which unlocks the operational dashboard
   - **KWE tenant** — a tenant-specific build
2. **Walk the product:** Home → My events → open a tender → Control room (9 tabs) → Rate card →
   Nomination. Then Spot bidding, Reporting sandbox and Configure.
3. **Switch persona from the sidebar** at any time and watch the navigation change.
4. **Click the info button** on any screen for the route, the template and the endpoints behind it.

### Worth a look

| Screen | What makes it interesting |
| --- | --- |
| **Control room → Rate card** | The wide grid: 4-row header (charge category → charge → supplier), sticky lane column, cell format `"0.[000000]"`, inline validation errors |
| **Control room → Nomination** | Award splitting across five nominees with a parallel scope matrix and backups |
| **Reporting sandbox** | 16 dashboard widgets driven by one dispatcher: `GET /reporting/json?provider=<pkg>/<Class>&method=<fn>` |
| **Surface map** | The endpoints, real-time channels and reference data the application is built on |
| **Spot bidding** | Live auction with a ticking countdown, bid ladder and rank movement |
| **Persona switch** | The access-code model — the sidebar genuinely re-renders |

---

## Layout

| File | Contents |
| --- | --- |
| `index.html` | The shell. Classic `<script>` tags, so `file://` works without a server |
| `styles.css` | Visual language: Roboto, dark utility rail, green accent |
| `data.js` | Ports, carriers, suppliers, tenders, rate cards, spot bids, reporting widgets |
| `screens.js` | One render function per screen |
| `app.js` | Hash router, sidebar with access-code gates, drawer, toasts |
| `serve.mjs` | Optional static server |

## Routes

Hash routing covers the application's route table, including `#/login`, `#tenders`,
`#/controlRoom/:tab/:id`, `#/createTender/:id`, `#/spot/:id`, `#/reporting`, `#/companySettings`,
`#/calendar`, `#/support`, plus the public `#/onboard`, `#/gdpr` and
`#/tx/carriers/request/:txId/:requestId`.

## Checks

```bash
node --check data.js && node --check screens.js && node --check app.js
```
