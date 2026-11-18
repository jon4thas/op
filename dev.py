#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
LOGIC — Development Environment
HTTP server + SSE Hot Reload + persistent logs + browser diagnostics.

Python 3.9+ | Standard Library only

Default:
    python3 dev.py

Explicit LAN access:
    python3 dev.py --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import argparse
import json
import logging
import logging.handlers
import os
import re
import select
import shutil
import socket
import sys
import threading
import time
import urllib.parse

from collections import deque, defaultdict
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


# ============================================================
# CONFIGURATION
# ============================================================

APP_NAME = "LOGIC"
VERSION = "2.0.0"

ROOT = Path(__file__).resolve().parent
LOG_DIR = ROOT / "logs"

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000

WATCH_EXT = {".html", ".css", ".js", ".json"}
POLL_INTERVAL = 0.5
MAX_DIAGNOSTIC_BYTES = 16 * 1024
MAX_DIAGNOSTICS_PER_MINUTE = 30

IGNORED_DIRS = {
    ".git", ".hg", ".svn", ".idea", ".vscode",
    "__pycache__", "node_modules", "venv", ".venv",
    "logs", "dist", "build"
}

# Nunca disponibilizar estes diretórios/arquivos por HTTP.
BLOCKED_NAMES = {
    ".env", ".git", ".hg", ".svn", ".idea",
    ".vscode", "__pycache__", "venv", ".venv",
    "logs", "id_rsa", "id_ed25519"
}

BLOCKED_SUFFIXES = {
    ".py", ".pyc", ".pyo", ".log", ".pem", ".key",
    ".sqlite", ".db", ".bak", ".swp"
}

# Estado global sincronizado.
state_lock = threading.RLock()
reload_condition = threading.Condition()
log_buffer = deque(maxlen=300)
diagnostic_limits = defaultdict(deque)

running = True
dashboard_active = False
httpd = None

server_status = "INICIALIZANDO"
server_started = None
server_requests = 0
reload_count = 0
reload_counter = 0
last_reload = "Nenhum"
last_browser_error = "Nenhum"

LOGGERS = {}


# ============================================================
# ANSI
# ============================================================

class C:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    CYAN = "\033[96m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    WHITE = "\033[97m"
    GRAY = "\033[90m"


def color(value, ansi):
    return f"{ansi}{value}{C.RESET}"


# ============================================================
# LOGGING PERSISTENTE
# ============================================================

class BufferHandler(logging.Handler):
    """Mantém os eventos recentes disponíveis para o dashboard."""

    def emit(self, record):
        try:
            entry = {
                "time": datetime.fromtimestamp(record.created).strftime("%H:%M:%S"),
                "level": record.levelname,
                "message": self.format(record),
            }
            with state_lock:
                log_buffer.append(entry)
        except Exception:
            self.handleError(record)


def setup_logging():
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(threadName)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    definitions = {
        "logic": ("logic.log", logging.INFO),
        "access": ("access.log", logging.INFO),
        "security": ("security.log", logging.WARNING),
        "errors": ("errors.log", logging.ERROR),
    }

    for name, (filename, level) in definitions.items():
        logger = logging.getLogger(f"logic.{name}")
        logger.setLevel(logging.DEBUG)
        logger.propagate = False

        # Evita duplicação de handlers em caso de reinicialização.
        for handler in list(logger.handlers):
            logger.removeHandler(handler)
            handler.close()

        file_handler = logging.handlers.RotatingFileHandler(
            LOG_DIR / filename,
            maxBytes=5 * 1024 * 1024,
            backupCount=5,
            encoding="utf-8",
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

        if name == "logic":
            buffer_handler = BufferHandler()
            buffer_handler.setLevel(logging.INFO)
            buffer_handler.setFormatter(logging.Formatter("%(message)s"))
            logger.addHandler(buffer_handler)

        LOGGERS[name] = logger


def log(message, level="INFO", channel="logic"):
    logger = LOGGERS.get(channel, LOGGERS.get("logic"))
    if logger is None:
        print(f"[{level}] {message}", flush=True)
        return

    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logger.log(numeric_level, str(message))

    if not dashboard_active:
        print(f"[{datetime.now():%H:%M:%S}] [{level}] {message}", flush=True)


def get_logs():
    with state_lock:
        return list(log_buffer)


# ============================================================
# NETWORK / ADDRESS
# ============================================================

def get_local_ip():
    """Descobre o IP de saída sem enviar pacotes para a Internet."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("192.0.2.1", 1))  # endereço TEST-NET, sem tráfego real
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


# ============================================================
# PATH SECURITY
# ============================================================

def is_inside_root(path: Path) -> bool:
    try:
        path.relative_to(ROOT)
        return True
    except ValueError:
        return False


def is_blocked_path(path: Path) -> bool:
    try:
        relative_parts = path.relative_to(ROOT).parts
    except ValueError:
        return True

    for part in relative_parts:
        if part in BLOCKED_NAMES or part.startswith("."):
            return True

    if path.suffix.lower() in BLOCKED_SUFFIXES:
        return True

    return False


def resolve_public_path(url_path: str) -> Path | None:
    """
    Converte o caminho HTTP em arquivo real e valida:
    - URL decodificada;
    - permanência dentro de ROOT;
    - ausência de arquivos/diretórios privados;
    - ausência de symlinks que escapem do projeto.
    """
    try:
        decoded = urllib.parse.unquote(url_path, errors="strict")
        decoded = decoded.replace("\\", "/")

        if "\x00" in decoded:
            return None

        relative = decoded.lstrip("/")
        if not relative:
            relative = "index.html"

        candidate = (ROOT / relative).resolve(strict=False)

        if not is_inside_root(candidate):
            return None

        if is_blocked_path(candidate):
            return None

        # Bloqueia diretórios privados mesmo quando ainda não existem.
        parts = Path(relative).parts
        if any(part in BLOCKED_NAMES or part.startswith(".") for part in parts):
            return None

        return candidate

    except (OSError, ValueError, UnicodeError):
        return None


# ============================================================
# FILE WATCHER
# ============================================================

def snapshot_files():
    snapshot = {}

    for current, dirs, files in os.walk(ROOT, followlinks=False):
        current_path = Path(current)

        dirs[:] = [
            name for name in dirs
            if name not in IGNORED_DIRS
            and not name.startswith(".")
            and not (current_path / name).is_symlink()
        ]

        for filename in files:
            path = current_path / filename

            if path.is_symlink():
                continue

            if path.suffix.lower() not in WATCH_EXT:
                continue

            try:
                stat = path.stat()
                snapshot[str(path)] = (stat.st_mtime_ns, stat.st_size)
            except OSError:
                continue

    return snapshot


def watch_loop():
    global reload_counter, reload_count, last_reload

    previous = snapshot_files()
    log("Monitoramento de arquivos iniciado.", "INFO")

    while running:
        time.sleep(POLL_INTERVAL)

        try:
            current = snapshot_files()
            if current == previous:
                continue

            changed = set(current) ^ set(previous)
            changed.update(
                path for path in set(current) & set(previous)
                if current[path] != previous[path]
            )
            previous = current

            with reload_condition:
                reload_counter += 1
                reload_count += 1
                reload_condition.notify_all()

            last_reload = datetime.now().strftime("%H:%M:%S")

            for filename in sorted(changed):
                log(
                    f"Arquivo alterado: {Path(filename).relative_to(ROOT)}",
                    "INFO",
                )

            log("Hot Reload disparado.", "INFO")

        except Exception:
            LOGGERS["errors"].exception("Falha no File Watcher")


# ============================================================
# BROWSER DIAGNOSTICS
# ============================================================

BROWSER_DIAGNOSTICS = r"""
<script>
(() => {
  if (window.__LOGIC_DIAGNOSTICS__) return;
  window.__LOGIC_DIAGNOSTICS__ = true;

  const endpoint = '/__diagnostics__';
  let lastSent = 0;

  function report(type, message, source, line, column, stack) {
    const now = Date.now();
    if (now - lastSent < 250) return;
    lastSent = now;

    const payload = {
      type: String(type || 'browser'),
      message: String(message || '').slice(0, 3000),
      source: String(source || '').slice(0, 1000),
      line: Number(line || 0),
      column: Number(column || 0),
      stack: String(stack || '').slice(0, 5000),
      page: location.pathname.slice(0, 500),
      timestamp: new Date().toISOString()
    };

    fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
      credentials: 'same-origin',
      keepalive: true
    }).catch(() => {});
  }

  window.addEventListener('error', event => {
    report(
      'javascript',
      event.message,
      event.filename,
      event.lineno,
      event.colno,
      event.error && event.error.stack
    );
  });

  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    report(
      'unhandledrejection',
      reason && reason.message ? reason.message : String(reason),
      '',
      0,
      0,
      reason && reason.stack
    );
  });

  const events = new EventSource('/__reload__');

  events.onmessage = event => {
    if (event.data === 'reload') location.reload();
  };

  events.onerror = () => {
    console.warn('[LOGIC] Conexão Hot Reload interrompida; tentando reconectar.');
  };
})();
</script>
"""


def inject_browser_tools(html: bytes) -> bytes:
    script = BROWSER_DIAGNOSTICS.encode("utf-8")

    if b"__LOGIC_DIAGNOSTICS__" in html:
        return html

    match = re.search(rb"</body\s*>", html, flags=re.IGNORECASE)
    if match:
        return html[:match.start()] + script + b"\n" + html[match.start():]

    return html + b"\n" + script


def allow_diagnostic_request(client_ip):
    now = time.monotonic()
    queue = diagnostic_limits[client_ip]

    while queue and now - queue[0] > 60:
        queue.popleft()

    if len(queue) >= MAX_DIAGNOSTICS_PER_MINUTE:
        return False

    queue.append(now)
    return True


# ============================================================
# HTTP HANDLER
# ============================================================

class DevHandler(SimpleHTTPRequestHandler):

    server_version = "LOGIC"
    sys_version = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        global server_requests

        with state_lock:
            server_requests += 1

        message = fmt % args if args else fmt
        status = 0

        if len(args) > 1:
            try:
                status = int(args[1])
            except (TypeError, ValueError):
                pass

        level = logging.INFO if status < 400 else logging.WARNING
        LOGGERS["access"].log(
            level,
            "%s | %s | %s",
            self.client_address[0],
            self.command,
            message[:1500],
        )

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        super().end_headers()

    def send_security_error(self, status, message):
        LOGGERS["security"].warning(
            "%s | %s | %s",
            self.client_address[0],
            status,
            message[:500],
        )
        self.send_error(status)

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        route = parsed.path

        if route == "/__reload__":
            self.handle_sse()
            return

        if route == "/__diagnostics__":
            self.send_error(405)
            return

        target = resolve_public_path(route)

        if target is None:
            self.send_security_error(403, f"Caminho bloqueado: {route}")
            return

        if not target.is_file():
            self.send_error(404)
            return

        if target.suffix.lower() == ".html":
            self.serve_html(target)
            return

        # Revalida o caminho e serve somente arquivos públicos.
        self.path = "/" + target.relative_to(ROOT).as_posix()
        super().do_GET()

    def do_HEAD(self):
        parsed = urllib.parse.urlsplit(self.path)
        target = resolve_public_path(parsed.path)

        if target is None:
            self.send_security_error(403, f"HEAD bloqueado: {parsed.path}")
            return

        if not target.is_file():
            self.send_error(404)
            return

        if target.suffix.lower() == ".html":
            try:
                body = inject_browser_tools(target.read_bytes())
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                return
            except OSError:
                self.send_error(500)
                return

        self.path = "/" + target.relative_to(ROOT).as_posix()
        super().do_HEAD()

    def serve_html(self, target):
        try:
            html = inject_browser_tools(target.read_bytes())
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html)))
            self.end_headers()
            self.wfile.write(html)
        except (OSError, BrokenPipeError, ConnectionResetError):
            LOGGERS["errors"].exception("Falha ao servir HTML: %s", target)

    def handle_sse(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        with reload_condition:
            last_seen = reload_counter

        log(f"Cliente Hot Reload conectado: {self.client_address[0]}")

        try:
            while running:
                with reload_condition:
                    reload_condition.wait_for(
                        lambda: reload_counter != last_seen or not running,
                        timeout=15,
                    )

                    if not running:
                        break

                    changed = reload_counter != last_seen
                    last_seen = reload_counter

                self.wfile.write(
                    b"data: reload\n\n" if changed else b": ping\n\n"
                )
                self.wfile.flush()

        except (BrokenPipeError, ConnectionResetError, TimeoutError, OSError):
            pass

    def do_POST(self):
        parsed = urllib.parse.urlsplit(self.path)

        if parsed.path != "/__diagnostics__":
            self.send_error(404)
            return

        # Endpoint restrito à própria origem.
        origin = self.headers.get("Origin")
        host = self.headers.get("Host", "")

        if origin:
            try:
                origin_host = urllib.parse.urlsplit(origin).netloc
                if origin_host.lower() != host.lower():
                    self.send_security_error(403, "Origin divergente no diagnóstico")
                    return
            except ValueError:
                self.send_security_error(403, "Origin inválida")
                return

        client_ip = self.client_address[0]
        if not allow_diagnostic_request(client_ip):
            self.send_security_error(429, "Limite de diagnósticos excedido")
            self.send_error(429)
            return

        content_type = self.headers.get_content_type()
        if content_type != "application/json":
            self.send_error(415)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(400)
            return

        if length <= 0 or length > MAX_DIAGNOSTIC_BYTES:
            self.send_error(413)
            return

        try:
            raw = self.rfile.read(length)
            data = json.loads(raw.decode("utf-8"))

            if not isinstance(data, dict):
                raise ValueError("JSON precisa ser um objeto")

            event_type = str(data.get("type", "browser"))[:80]
            message = str(data.get("message", ""))[:3000]
            source = str(data.get("source", ""))[:1000]
            page = str(data.get("page", ""))[:500]
            stack = str(data.get("stack", ""))[:5000]

            if not message:
                self.send_error(400, "Mensagem vazia")
                return

            global last_browser_error
            last_browser_error = f"{event_type}: {message[:120]}"

            LOGGERS["errors"].error(
                "BROWSER | ip=%s | page=%s | type=%s | source=%s | message=%s | stack=%s",
                client_ip,
                page,
                event_type,
                source,
                message,
                stack,
            )

            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()

        except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
            self.send_error(400, "Diagnóstico inválido")
        except Exception:
            LOGGERS["errors"].exception("Erro processando diagnóstico do navegador")
            self.send_error(500)


# ============================================================
# SERVER
# ============================================================

class LogicHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True
    block_on_close = False
    request_queue_size = 32


def start_server(host, port):
    global httpd, server_status, server_started

    try:
        httpd = LogicHTTPServer((host, port), DevHandler)

        with state_lock:
            server_status = "ONLINE"
            server_started = time.time()

        log(f"Servidor ativo em {host}:{port}")
        log(f"Raiz pública: {ROOT}")
        log(f"Logs persistentes: {LOG_DIR}")

        httpd.serve_forever(poll_interval=0.25)

    except OSError:
        with state_lock:
            server_status = "ERRO"
        LOGGERS["errors"].exception("Não foi possível iniciar o servidor")
    except Exception:
        with state_lock:
            server_status = "ERRO"
        LOGGERS["errors"].exception("Erro inesperado no servidor")


# ============================================================
# TERMINAL DASHBOARD
# ============================================================

def fit(value, width):
    value = str(value)
    if len(value) > width:
        value = value[:max(0, width - 3)] + "..."
    return value.ljust(width)


def panel(title, width, height, lines):
    if width < 8 or height < 4:
        return []

    output = [
        color("+" + "-" * (width - 2) + "+", C.CYAN),
        color("|", C.CYAN) + color(fit(" " + title, width - 4), C.BOLD + C.WHITE) + color("|", C.CYAN),
        color("+" + "-" * (width - 2) + "+", C.CYAN),
    ]

    for index in range(height - 4):
        if index < len(lines):
            item = lines[index]
            text, ansi = item if isinstance(item, tuple) else (item, C.WHITE)
            line = color("| ", C.CYAN) + color(fit(text, width - 4), ansi) + color(" |", C.CYAN)
        else:
            line = color("|", C.CYAN) + " " * (width - 2) + color("|", C.CYAN)
        output.append(line)

    output.append(color("+" + "-" * (width - 2) + "+", C.CYAN))
    return output


def make_logo():
    return [
        (r"██╗      ██████╗  ██████╗ ██╗ ██████╗", C.CYAN),
        (r"██║     ██╔═══██╗██╔════╝ ██║██╔════╝", C.BLUE),
        (r"██║     ██║   ██║██║  ███╗██║██║", C.MAGENTA),
        (r"██║     ██║   ██║██║   ██║██║██║", C.CYAN),
        (r"███████╗╚██████╔╝╚██████╔╝██║╚██████╗", C.BLUE),
        (r"╚══════╝ ╚═════╝  ╚═════╝ ╚═╝ ╚═════╝", C.MAGENTA),
    ]


def draw_dashboard(host, port):
    global dashboard_active
    dashboard_active = True

    size = shutil.get_terminal_size((100, 30))
    width, height = size.columns, size.lines

    if width < 60 or height < 20:
        sys.stdout.write("\033[2J\033[H")
        print("LOGIC — Terminal pequeno. Recomendado: 60x20.")
        return

    left_width = width // 2
    right_width = width - left_width

    ip = get_local_ip()
    local_url = f"http://127.0.0.1:{port}"

    with state_lock:
        status = server_status
        requests = server_requests
        reloads = reload_count
        last = last_reload
        browser_error = last_browser_error
        started = server_started

    left = list(make_logo())
    left += [
        ("", C.WHITE),
        ("DEVELOPMENT ENVIRONMENT", C.WHITE),
        (f"Python {sys.version.split()[0]}", C.GRAY),
        ("", C.WHITE),
        ("SERVER", C.MAGENTA),
        (f"Estado: {status}", C.GREEN if status == "ONLINE" else C.RED),
        (f"Bind: {host}:{port}", C.WHITE),
        (f"Local: {local_url}", C.CYAN),
        (f"Rede: http://{ip}:{port}" if host == "0.0.0.0" else "Rede: DESABILITADA (somente localhost)", C.YELLOW if host == "0.0.0.0" else C.GRAY),
        ("", C.WHITE),
        ("MONITORAMENTO", C.MAGENTA),
        ("Hot Reload: ATIVO", C.GREEN),
        (f"Extensões: {', '.join(sorted(WATCH_EXT))}", C.GRAY),
        (f"Intervalo: {POLL_INTERVAL}s", C.GRAY),
        (f"Recarregamentos: {reloads}", C.YELLOW),
        (f"Último Reload: {last}", C.WHITE),
        (f"Requisições HTTP: {requests}", C.YELLOW),
        (f"Uptime: {int(time.time() - started)}s" if started else "Uptime: --", C.GREEN),
        ("", C.WHITE),
        ("DIAGNÓSTICO", C.MAGENTA),
        (f"Último erro JS: {browser_error}", C.RED if browser_error != "Nenhum" else C.GRAY),
        ("", C.WHITE),
        ("Q - Encerrar", C.YELLOW),
        ("CTRL+C - Encerrar", C.YELLOW),
    ]

    right = [("EVENTOS RECENTES", C.MAGENTA), ("", C.WHITE)]
    for entry in get_logs()[-max(1, height - 9):]:
        level = entry["level"]
        ansi = {
            "ERROR": C.RED,
            "CRITICAL": C.RED,
            "WARNING": C.YELLOW,
        }.get(level, C.GREEN if level == "INFO" else C.WHITE)
        right.append((f"[{entry['time']}] {entry['message']}", ansi))

    panel_height = height - 4
    left_panel = panel("LOGIC / CONTROL CENTER", left_width, panel_height, left)
    right_panel = panel("LIVE LOGS / EVENTS", right_width, panel_height, right)

    sys.stdout.write("\033[H")
    for index in range(max(len(left_panel), len(right_panel))):
        a = left_panel[index] if index < len(left_panel) else ""
        b = right_panel[index] if index < len(right_panel) else ""
        sys.stdout.write(a + b + "\n")

    footer = (
        f" LOGIC v{VERSION} | Python {sys.version.split()[0]} | "
        f"Q: SAIR | {datetime.now():%d/%m/%Y %H:%M:%S}"
    )
    sys.stdout.write(color(fit(footer, width), C.BOLD + C.CYAN))
    sys.stdout.flush()


def read_key():
    if os.name == "nt":
        import msvcrt
        if msvcrt.kbhit():
            return msvcrt.getch().decode("utf-8", errors="ignore").lower()
        return None

    ready, _, _ = select.select([sys.stdin], [], [], 0)
    return sys.stdin.read(1).lower() if ready else None


def dashboard_loop(host, port):
    if not (sys.stdin.isatty() and sys.stdout.isatty()):
        print(f"LOGIC ativo: http://127.0.0.1:{port}/")
        while running:
            time.sleep(1)
        return

    old_settings = None

    if os.name != "nt":
        import termios
        import tty
        old_settings = termios.tcgetattr(sys.stdin)
        tty.setcbreak(sys.stdin.fileno())

    try:
        sys.stdout.write("\033[2J\033[H\033[?25l")
        while running:
            draw_dashboard(host, port)
            if read_key() == "q":
                break
            time.sleep(0.15)
    finally:
        if old_settings is not None:
            import termios
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)

        sys.stdout.write("\033[?25h\033[2J\033[H")
        sys.stdout.flush()


# ============================================================
# SHUTDOWN / MAIN
# ============================================================

def shutdown():
    global running, server_status

    running = False
    with state_lock:
        server_status = "ENCERRANDO"

    with reload_condition:
        reload_condition.notify_all()

    if httpd is not None:
        try:
            httpd.shutdown()
            httpd.server_close()
        except Exception:
            LOGGERS["errors"].exception("Erro durante encerramento do HTTP")

    log("LOGIC encerrado.", "INFO")


def parse_args():
    parser = argparse.ArgumentParser(
        description="LOGIC — servidor local de desenvolvimento"
    )
    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help="Endereço de bind. Padrão: 127.0.0.1 (somente local).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"Porta HTTP. Padrão: {DEFAULT_PORT}.",
    )
    return parser.parse_args()


def main():
    global running

    args = parse_args()

    if not 1 <= args.port <= 65535:
        raise SystemExit("ERRO: a porta precisa estar entre 1 e 65535.")

    setup_logging()

    print("\033[2J\033[H", end="")
    log(f"{APP_NAME} v{VERSION} iniciando.")
    log(f"Modo de rede: {'LAN' if args.host == '0.0.0.0' else 'LOCAL'}")

    if args.host == "0.0.0.0":
        log(
            "ATENÇÃO: servidor exposto às interfaces de rede. "
            "Use somente em rede confiável.",
            "WARNING",
            "security",
        )

    watcher = threading.Thread(
        target=watch_loop,
        daemon=True,
        name="LOGIC-Watcher",
    )
    watcher.start()

    server_thread = threading.Thread(
        target=start_server,
        args=(args.host, args.port),
        daemon=True,
        name="LOGIC-HTTP",
    )
    server_thread.start()

    time.sleep(0.25)

    try:
        if sys.stdout.isatty():
            for logo_line, ansi in make_logo():
                print(color(logo_line, C.BOLD + ansi))
                time.sleep(0.04)
            print(color("L O G I C  //  DEVELOPMENT ENVIRONMENT", C.BOLD + C.CYAN))

        dashboard_loop(args.host, args.port)

    except KeyboardInterrupt:
        pass
    finally:
        shutdown()
        server_thread.join(timeout=3)
        watcher.join(timeout=1)
        print(color("\nLOGIC finalizado.", C.BOLD + C.CYAN))


if __name__ == "__main__":
    main()
