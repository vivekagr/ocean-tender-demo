# Portside — container shipping platform (front-end demo)

A self-contained demo of a container-shipping execution platform: bookings, shipping
instructions, bills of lading, VGM declarations, customs filings, tracking and rates.

**No backend, no build step.** All data is generated locally and every action is simulated —
where useful the UI names the API call it would make.

## Two ways to open it

| | |
| --- | --- |
| **Single file** | open `portside.html` — one self-contained file, works straight from `file://` |
| **Served** | `index.html` needs a static server (ES modules are blocked on `file://`): `python3 -m http.server 8080` then open <http://127.0.0.1:8080> |

## What to look at

1. **Sign in** — any credentials work; it is a mock, nothing is sent anywhere.
2. **My Shipments** — 84 shipments with 10 saved views, sortable columns, bulk actions and CSV export.
3. **Open a shipment** (`LH24000018` is the richest) — the lifecycle roadmap, the bill-of-lading
   blocking points, then the tabs: requirements, tracking, containers & cargo, documents,
   deviations, comments, tasks.
4. **Operations** — the seven execution modules, including shipping instructions that are amended
   section by section and a bill of lading with its validation rules and distribution matrix.
5. **Plan → Vessel & schedule search** — routing options ranked by cost, transit, CO₂ and allocation.
6. **Control Tower** — the operational dashboard; **Deviation board** and **Company calendar** for the
   network view.
7. **Switch role** from the avatar menu (top right) — navigation and actions re-gate on the real
   permission model.
8. **Track & trace** in the sidebar — the customer-facing page a share link opens, token-gated.

## Layout

| Path | Contents |
| --- | --- |
| `index.html` | The shell |
| `app.css` | Application chrome, layout utilities and the few custom widgets |
| `js/` | Data, vocabulary, component kit, router and one module per screen group |
| `vendor/ui/` | The component framework stylesheet (Semantic UI) plus the theme layer and icon webfonts |
| `portside.html` | The whole app bundled into a single offline file |

## Keyboard

- `⌘K` / `Ctrl+K` — global search across shipments, containers, B/L numbers and ports
- `Esc` — close the search palette or a drawer
