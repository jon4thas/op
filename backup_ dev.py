#!/usr/bin/env python3
"""
Dev server 100% stdlib:
- sem cache
- auto-reload via SSE (polling de mtime)
- injeta <script> no HTML servido automaticamente
"""

import http.server
import socketserver
import threading
import time
import sys
import json
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = Path(__file__).resolve().parent
WATCH_EXT = {".js", ".html", ".css", ".json"}
POLL_INTERVAL = 0.5

# ---------- estado global de mudanças ----------
_last_mtime = {}
_cond = threading.Condition()
_reload_counter = 0


def _snapshot():
    snap = {}
    for p in ROOT.rglob("*"):
        if p.is_file() and p.suffix.lower() in WATCH_EXT:
            # ignora node_modules, .git
            if any(part.startswith(".") for part in p.parts):
                continue
            snap[str(p)] = p.stat().st_mtime
    return snap


def _watch_loop():
    global _last_mtime, _reload_counter
    _last_mtime = _snapshot()
    while True:
        time.sleep(POLL_INTERVAL)
        snap = _snapshot()
        if snap != _last_mtime:
            _last_mtime = snap
            with _cond:
                _reload_counter += 1
                _cond.notify_all()


INJECT = b"""
<script>
(function(){
  const es = new EventSource('/__reload__');
  es.onmessage = (e) => {
    if (e.data === 'reload') {
      console.log('[dev] reload');
      location.reload();
    }
  };
})();
</script>
"""


class DevHandler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        if self.path == "/__reload__":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()

            # Se browser conecta, manda versão atual e depois espera mudança
            last = _reload_counter
            try:
                while True:
                    with _cond:
                        _cond.wait_for(lambda: _reload_counter != last, timeout=15)
                        if _reload_counter != last:
                            last = _reload_counter
                            self.wfile.write(b"data: reload\n\n")
                            self.wfile.flush()
                        else:
                            # heartbeat para manter conexão
                            self.wfile.write(b": ping\n\n")
                            self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                return
            return

        # HTML: serve com injeção
        if self.path == "/" or self.path.endswith(".html"):
            path = ROOT / (self.path.lstrip("/") or "index.html")
            if path.is_file():
                html = path.read_bytes()
                if b"</body>" in html:
                    html = html.replace(b"</body>", INJECT + b"</body>", 1)
                else:
                    html += INJECT
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(html)))
                self.end_headers()
                self.wfile.write(html)
                return

        super().do_GET()


class ReuseServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    threading.Thread(target=_watch_loop, daemon=True).start()
    with ReuseServer(("0.0.0.0", PORT), DevHandler) as httpd:
        print(f"🚀 http://localhost:{PORT}/  (auto-reload ativo)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋")


if __name__ == "__main__":
    main()
