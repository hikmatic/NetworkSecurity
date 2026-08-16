#!/usr/bin/env python3
"""Static file server for the Quick Invoice web app.

Usage:
    python3 server.py [--port 8000] [--host 127.0.0.1] [--open]

No dependencies beyond the Python standard library.
"""

import argparse
import http.server
import socketserver
import sys
import webbrowser
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent

# Ensure every text response declares UTF-8 explicitly. Without this, some
# browsers/servers guess a different encoding for local files and mangle
# non-ASCII characters used in the UI (e.g. "×", "−").
TEXT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
}


class QuickInvoiceHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP_DIR), **kwargs)

    def guess_type(self, path):
        # manifest.json is named "manifest.json" here, not ".webmanifest",
        # so give it the right content type by filename first.
        if Path(path).name == "manifest.json":
            return "application/manifest+json; charset=utf-8"
        suffix = Path(path).suffix.lower()
        if suffix in TEXT_TYPES:
            return TEXT_TYPES[suffix]
        return super().guess_type(path)

    def end_headers(self):
        # Service workers must be served from the root scope they control;
        # this app's sw.js already lives at "/", so no extra header needed,
        # but disabling caching keeps local testing predictable.
        if self.path.endswith((".html", "sw.js")):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        sys.stderr.write(f"[quick-invoice] {self.address_string()} - {format % args}\n")


def main():
    parser = argparse.ArgumentParser(description="Serve the Quick Invoice web app.")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind (default: 8000)")
    parser.add_argument("--open", action="store_true", help="Open the app in your default browser")
    args = parser.parse_args()

    if not (APP_DIR / "index.html").exists():
        sys.exit(f"error: index.html not found in {APP_DIR}")

    with socketserver.TCPServer((args.host, args.port), QuickInvoiceHandler) as httpd:
        url = f"http://{args.host}:{args.port}/"
        print(f"Quick Invoice running at {url}")
        print("Press Ctrl+C to stop.")

        if args.open:
            webbrowser.open(url)

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
