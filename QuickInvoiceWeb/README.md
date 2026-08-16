# Quick Invoice — Web App

An installable, mobile-first web app for creating quick invoices for customers. Works great on an iPhone (or any phone/desktop) straight from Safari or Chrome — no App Store, no build step, no backend.

## Features

- **Customers** — save name, email, phone, and address once, reuse on every invoice.
- **Quick invoice creation** — pick a customer, add line items (description, quantity, price), set a due date and tax rate; totals calculate live as you type.
- **Auto invoice numbering** — invoices are numbered `INV-0001`, `INV-0002`, ... automatically.
- **Status tracking** — mark invoices Draft, Sent, or Paid; the Home tab shows total outstanding.
- **Share / Save as PDF** — every invoice has a print-formatted view; use the browser's Print dialog (or the iOS share sheet's "Save to Files"/"Print" via AirPrint) to export or share a PDF.
- **Installable (PWA)** — "Add to Home Screen" on iPhone gives it a real app icon and a standalone, full-screen window.
- **Works offline** — a service worker caches the app shell after first load.
- **Local storage only** — all data lives in the browser's `localStorage`. No account, no server, no network access required.

## Running it

No build step, no dependencies. Use the included server:

```bash
cd QuickInvoiceWeb
python3 server.py            # http://127.0.0.1:8000
python3 server.py --open     # also opens it in your default browser
python3 server.py --port 8080 --host 0.0.0.0   # reachable from other devices on your network
```

`server.py` is a small stdlib-only wrapper around Python's built-in HTTP server — it just makes sure every file is served with the right `Content-Type` (including UTF-8, so the `×` in line-item quantities doesn't get mangled) and that `index.html`/`sw.js` aren't cached while you're developing. Any other static file server works too (`python3 -m http.server`, `npx serve`, etc.), or deploy the folder as-is to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3, etc.) — it's plain HTML/CSS/JS.

### Installing on iPhone

1. Open the deployed URL in Safari.
2. Tap the Share icon → **Add to Home Screen**.
3. Launch it from the home screen — it opens full-screen like a native app.

## Project layout

```
QuickInvoiceWeb/
  index.html        # app shell
  styles.css         # iOS-flavored design system (light + dark mode)
  app.js             # all app logic: state, routing, screens, PDF/print
  manifest.json       # PWA manifest
  sw.js               # offline-caching service worker
  icons/               # app icons (192px, 512px)
  server.py            # optional local static server (stdlib only)
```

`app.js` is plain vanilla JavaScript (no framework, no build tooling) organized into:
- **Persistence** — `localStorage`-backed store for customers/invoices.
- **Navigation** — a small per-tab stack (Home / Invoices / Customers) plus a modal stack for sheet-style forms (New/Edit Invoice, New/Edit Customer, customer picker), mirroring how the equivalent native SwiftUI app is structured.
- **Screens & modals** — each returns a title + DOM body; the renderer handles the navbar/tab bar chrome.
- **PDF/share** — builds a clean, print-only invoice layout and calls `window.print()`, which on iOS Safari lets you save as PDF or share directly from the print preview.

## Notes

- Amounts are formatted with the browser's currency defaulting to USD — change the `CURRENCY` constant at the top of `app.js` to switch.
- Deleting a customer also deletes their invoices (with a confirmation prompt first).
