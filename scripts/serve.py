"""Локальный сервер для разработки: отдаёт файлы проекта без кэширования браузером.

Запуск: python scripts/serve.py  →  http://localhost:5173
"""
import http.server
import os
import socketserver
import sys
from pathlib import Path

PORT = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 5173))
ROOT = Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json",
        ".webmanifest": "application/manifest+json",
        ".svg": "image/svg+xml",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


os.chdir(ROOT)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"Brezel: http://localhost:{PORT}", flush=True)
    httpd.serve_forever()
