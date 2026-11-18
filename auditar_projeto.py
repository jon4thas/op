#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
auditar_projeto.py  -  Auditor de erros para projetos web (HTML + CSS + JS ES Modules, Three.js)

O QUE FAZ
  1. Percorre TODOS os arquivos do projeto (HTML, CSS, JS, PY) e levanta problemas.
  2. Classifica cada achado por TIPO, SEVERIDADE e BLOCO do projeto (core, ui/screens, world...).
  3. Para cada achado informa arquivo:linha, evidência, causa provável e COMO CORRIGIR.
  4. (Opcional) Lê logs/errors.log e logs/access.log do dev.py, agrupa os erros,
     cruza com o código atual e diz se o erro ainda existe ou parece corrigido.
  5. Gera: relatorio_auditoria.md, relatorio_auditoria.json e prompt_para_ia.md
     (este último é para colar na IA, junto com os arquivos citados).

COMO USAR
  python auditar_projeto.py                       # analisa a pasta atual
  python auditar_projeto.py C:\\caminho\\projeto   # analisa outra pasta
  python auditar_projeto.py . --logs logs --saida auditoria

REQUISITOS
  Python 3.8+ (só biblioteca padrão). Node.js é opcional: se existir, é usado para
  validar a sintaxe de cada .js de verdade (`node --check`). Sem Node, usa uma heurística.

LIMITES (seja honesto no Relatório)
  É análise ESTÁTICA: não abre o navegador. Vazamentos de memória, FPS e colisão
  precisam ser confirmados medindo no navegador (renderer.info, performance.memory...).
  Achados marcados como "possível" são heurísticas e podem ser falsos positivos.
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path

VERSION = "1.0"
SEV_ORDER = {"CRITICO": 0, "ALTO": 1, "MEDIO": 2, "BAIXO": 3, "INFO": 4}
IGNORE_DIRS = {".git", "node_modules", "__pycache__", "logs", ".idea", ".vscode",
               "auditoria", "projeto_original"}
ASSET_EXT = r"glb|gltf|fbx|exr|hdr|png|jpe?g|webp|svg|gif|mp3|ogg|wav|woff2?|ttf|bin"

BLOCKS = [
    ("js/core/", "Núcleo (js/core: loop, mundo, colisão, player)"),
    ("js/game/oz/", "API global OZ (js/game/oz)"),
    ("js/game/missoes/", "Missões (js/game/missoes)"),
    ("js/game/", "Regras do jogo (js/game)"),
    ("js/ui/screens/", "Telas (js/ui/screens)"),
    ("js/ui/", "Interface (js/ui)"),
    ("js/world/", "Mundo 3D (js/world)"),
    ("js/physics/", "Física (js/physics)"),
    ("js/", "JS raiz (js/)"),
    ("lib/", "Bibliotecas (lib)"),
    ("styles/", "CSS modular (styles/)"),
    ("style.css", "CSS monolítico (style.css)"),
    ("index.html", "HTML (index.html)"),
    ("dev.py", "Servidor dev (dev.py)"),
]


# ----------------------------------------------------------------------------
# utilidades
# ----------------------------------------------------------------------------
def strip_js(code: str, strings: str = "keep") -> str:
    """Remove comentários JS mantendo o tamanho/linhas. strings='blank' também apaga o
    conteúdo de strings (útil para contar chaves/parênteses)."""
    out, i, n, state = [], 0, len(code), None
    while i < n:
        c = code[i]
        nx = code[i + 1] if i + 1 < n else ""
        if state is None:
            if c == "/" and nx == "/":
                state = "line"; out.append("  "); i += 2; continue
            if c == "/" and nx == "*":
                state = "block"; out.append("  "); i += 2; continue
            if c in "'\"`":
                state = c
            out.append(c); i += 1; continue
        if state == "line":
            if c == "\n":
                state = None; out.append("\n")
            else:
                out.append(" ")
            i += 1; continue
        if state == "block":
            if c == "*" and nx == "/":
                state = None; out.append("  "); i += 2; continue
            out.append("\n" if c == "\n" else " "); i += 1; continue
        # dentro de string
        if c == "\\":
            if strings == "keep":
                out.append(c + nx)
            else:
                out.append("\n" if nx == "\n" else " ")
                out.append(" " if nx != "\n" else "\n")
            i += 2; continue
        if c == state:
            state = None; out.append(c); i += 1; continue
        if state != "`" and c == "\n":
            state = None; out.append("\n"); i += 1; continue
        if strings == "keep":
            out.append(c)
        else:
            out.append("\n" if c == "\n" else " ")
        i += 1
    return "".join(out)


def line_of(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def short(s: str, n: int = 170) -> str:
    s = s.strip().replace("\t", " ")
    return s if len(s) <= n else s[: n - 3] + "..."


@dataclass
class Finding:
    tipo: str
    severidade: str
    bloco: str
    arquivo: str
    linha: int
    titulo: str
    evidencia: str = ""
    causa: str = ""
    solucao: str = ""
    origem: str = "codigo"
    id: str = ""


# ----------------------------------------------------------------------------
# auditor de código
# ----------------------------------------------------------------------------
class Auditor:
    def __init__(self, root: Path, incluir_lib: bool = False):
        self.root = root.resolve()
        self.incluir_lib = incluir_lib
        self.findings: list[Finding] = []
        self.notes: list[str] = []
        self._text: dict[Path, str] = {}
        self._ls: dict[Path, set] = {}
        self.node = shutil.which("node")
        self.importmap: dict[str, str] = {}
        self._exports: dict[Path, set] = {}
        self.edges: dict[Path, set] = defaultdict(set)
        self.dyn_unresolved = False
        self.oz_defined: set[str] = set()
        self.syntax_ok: dict[str, bool] = {}
        self.files: list[Path] = []
        self.stats = Counter()

    # -- helpers ------------------------------------------------------------
    def rel(self, p: Path) -> str:
        try:
            return p.resolve().relative_to(self.root).as_posix()
        except ValueError:
            return str(p)

    def read(self, p: Path) -> str:
        if p not in self._text:
            try:
                self._text[p] = p.read_text(encoding="utf-8", errors="replace")
            except OSError:
                self._text[p] = ""
        return self._text[p]

    def is_lib(self, p: Path) -> bool:
        return self.rel(p).startswith("lib/")

    def block_of(self, rel: str) -> str:
        for prefix, name in BLOCKS:
            if rel == prefix or rel.startswith(prefix):
                return name
        top = rel.split("/")[0] if "/" in rel else "(raiz)"
        return f"Outros ({top})"

    def add(self, tipo, sev, path, linha, titulo, evidencia="", causa="", solucao="", origem="codigo"):
        rel = self.rel(path) if isinstance(path, Path) else str(path)
        self.findings.append(Finding(tipo, sev, self.block_of(rel), rel, int(linha or 0),
                                     titulo, short(evidencia, 300), causa, solucao, origem))

    def exact_exists(self, path: Path) -> bool:
        """Existência com diferenciação de maiúsculas/minúsculas (mesmo no Windows)."""
        try:
            parts = path.resolve().relative_to(self.root).parts
        except ValueError:
            return path.exists()
        cur = self.root
        for part in parts:
            if cur not in self._ls:
                try:
                    self._ls[cur] = set(os.listdir(cur))
                except OSError:
                    return False
            if part not in self._ls[cur]:
                return False
            cur = cur / part
        return True

    def resolve_target(self, src: str, from_file: Path):
        if src.startswith("."):
            base = from_file.parent / src
        elif src.startswith("/"):
            base = self.root / src.lstrip("/")
        else:
            mapped = None
            for k, v in self.importmap.items():
                if k.endswith("/") and src.startswith(k):
                    mapped = v + src[len(k):]; break
                if k == src:
                    mapped = v; break
            if mapped is None:
                return "bare", None
            base = self.root / mapped.lstrip("/")
        base = Path(os.path.normpath(str(base)))
        cands = [base]
        if base.suffix == "":
            cands.append(base.with_name(base.name + ".js"))
        cands.append(base / "index.js")
        for c in cands:
            if c.is_file():
                return ("ok" if self.exact_exists(c) else "case"), c
        return "missing", base

    # -- execução -----------------------------------------------------------
    def run(self):
        for dp, dns, fns in os.walk(self.root):
            dns[:] = [d for d in dns if d not in IGNORE_DIRS]
            for fn in fns:
                self.files.append(Path(dp) / fn)
        self.files.sort()
        htmls = [p for p in self.files if p.suffix.lower() in (".html", ".htm")]
        self.js = [p for p in self.files
                   if p.suffix.lower() in (".js", ".mjs")
                   and (self.incluir_lib or not self.is_lib(p))]
        self.css = [p for p in self.files if p.suffix.lower() == ".css" and not self.is_lib(p)]
        self.pys = [p for p in self.files if p.suffix.lower() == ".py"]
        self.stats.update(js=len(self.js), css=len(self.css), html=len(htmls), py=len(self.pys),
                          total=len(self.files))

        for h in htmls:
            self._load_importmap(h)
        self.check_accidental()
        self.check_duplicates()
        self.check_syntax()
        self.check_python()
        self.check_imports()
        self.check_orphans(htmls)
        self.check_html(htmls)
        self.check_css(htmls)
        self.check_oz_api(htmls)
        self.check_ids(htmls)
        self.check_listeners_timers()
        self.check_three_dispose()
        self.check_physics()
        self.check_assets()
        self.check_storage()
        self.check_loading()
        self.check_size_and_debug()

    # -- 1. arquivos acidentais / duplicados ---------------------------------
    def check_accidental(self):
        pat = re.compile(r"(\.bak|\.swp|\.swo|\.tmp|\.orig|\.rej|~)$", re.I)
        for p in self.files:
            n = p.name.lower()
            hit = pat.search(n) or "backup" in n or re.search(r"(^|[_\-. ])(old|copy|copia)([_\-. ]|$)", p.stem.lower())
            if hit:
                self.add("Dívida acidental", "MEDIO", p, 1, "Arquivo temporário/backup dentro do projeto",
                         p.name,
                         "Sobra de edição (.swp do Vim), backup manual ou saída de script de refatoração.",
                         "1) Guarde uma cópia em projeto_original/ se precisar do 'antes'. "
                         "2) Apague do código-fonte. 3) Adicione ao .gitignore: *.bak, *.swp, *~.")

    def check_duplicates(self):
        groups = defaultdict(list)
        for p in self.files:
            try:
                if p.stat().st_size < 200:
                    continue
                groups[hashlib.sha1(p.read_bytes()).hexdigest()].append(p)
            except OSError:
                continue
        for _h, ps in groups.items():
            if len(ps) > 1:
                names = ", ".join(self.rel(x) for x in ps)
                self.add("Dívida acidental", "BAIXO", ps[0], 1, "Arquivos idênticos (duplicata)", names,
                         "Mesmo conteúdo em mais de um lugar.",
                         "Descubra qual é importado/usado (procure o nome do arquivo no código e no "
                         "access.log) e remova a cópia não usada.")
        by_name = defaultdict(list)
        for p in self.js:
            by_name[p.name].append(p)
        for name, ps in by_name.items():
            if len(ps) > 1 and name not in ("index.js",):
                self.add("Dívida estrutural", "BAIXO", ps[0], 1, f"Mesmo nome de módulo em pastas diferentes: {name}",
                         ", ".join(self.rel(x) for x in ps),
                         "Nomes repetidos confundem imports e indicam duplicidade ou responsabilidades misturadas.",
                         "Confirme se os dois são usados (ver 'código órfão'). Renomeie para refletir a "
                         "responsabilidade (ex.: core/player-physics.js vs game/player-view.js) ou remova o morto.")

    # -- 2. sintaxe ------------------------------------------------------------
    def check_syntax(self):
        if not self.node:
            self.notes.append("Node.js não encontrado: sintaxe validada por heurística de parênteses/chaves "
                              "(instale o Node para validação completa).")
        for p in self.js:
            code = self.read(p)
            ok, msg, ln = True, "", 0
            if self.node:
                tmpdir = Path(tempfile.mkdtemp())
                tmp = tmpdir / (p.stem + ".mjs")
                tmp.write_text(code, encoding="utf-8")
                try:
                    r = subprocess.run([self.node, "--check", str(tmp)], capture_output=True, text=True, timeout=60)
                    if r.returncode != 0:
                        ok = False
                        first = r.stderr.strip().splitlines()[0] if r.stderr.strip() else ""
                        m = re.search(r":(\d+)\s*$", first)
                        ln = int(m.group(1)) if m else 1
                        mm = re.search(r"^(\w*Error: .*)$", r.stderr, re.M)
                        msg = mm.group(1) if mm else "erro de sintaxe"
                except Exception as e:  # noqa
                    self.notes.append(f"node --check falhou em {self.rel(p)}: {e}")
                finally:
                    shutil.rmtree(tmpdir, ignore_errors=True)
            else:
                s = strip_js(code, "blank")
                stack, pairs, bad = [], {")": "(", "]": "[", "}": "{"}, None
                for i, c in enumerate(s):
                    if c in "([{":
                        stack.append((c, i))
                    elif c in ")]}":
                        if not stack or stack[-1][0] != pairs[c]:
                            bad = i; break
                        stack.pop()
                if bad is None and stack:
                    bad = stack[-1][1]
                if bad is not None:
                    ok, ln, msg = False, line_of(s, bad), "possível erro de sintaxe (parênteses/chaves desbalanceados)"
            self.syntax_ok[self.rel(p)] = ok
            if not ok:
                lines = code.splitlines()
                ev = lines[ln - 1] if 0 < ln <= len(lines) else ""
                self.add("Erro de sintaxe", "CRITICO", p, ln, msg, ev,
                         "O módulo não compila: o navegador recusa o arquivo e TUDO que o importa deixa de carregar "
                         "(tela sem render).",
                         "Abra a linha indicada e a ANTERIOR: procure ')' ou '}' faltando, vírgula entre parâmetros, "
                         "aspas não fechadas. Valide com `node --check arquivo.js`. Se o erro apareceu depois de um "
                         "script/refatoração automática, compare com o .bak e refaça a edição manualmente.")

    def check_python(self):
        for p in self.pys:
            try:
                compile(self.read(p), str(p), "exec")
            except SyntaxError as e:
                self.add("Erro de sintaxe", "CRITICO", p, e.lineno or 1, f"Python: {e.msg}", e.text or "",
                         "Arquivo Python inválido.", "Corrija a linha apontada e rode `python -m py_compile arquivo.py`.")

    # -- 3. imports / exports --------------------------------------------------
    def _load_importmap(self, html: Path):
        m = re.search(r'<script[^>]*type=["\']importmap["\'][^>]*>(.*?)</script>', self.read(html), re.S | re.I)
        if m:
            try:
                self.importmap.update(json.loads(m.group(1)).get("imports", {}))
            except json.JSONDecodeError:
                self.add("Erro de configuração", "ALTO", html, 1, "importmap com JSON inválido", m.group(1)[:150],
                         "Vírgula sobrando ou aspas erradas.", "Valide o JSON do <script type=\"importmap\">.")

    def exports_of(self, p: Path, depth: int = 0) -> set:
        if p in self._exports:
            return self._exports[p]
        code = strip_js(self.read(p))
        names: set = set()
        self._exports[p] = names
        for m in re.finditer(r"(?m)^\s*export\s+(?:async\s+)?(?:function\s*\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)", code):
            names.add(m.group(1))
        if re.search(r"(?m)^\s*export\s+default\b", code):
            names.add("default")
        for m in re.finditer(r"(?m)^\s*export\s*\{([^}]*)\}", code):
            for part in m.group(1).split(","):
                mm = re.match(r"\s*([\w$]+)(?:\s+as\s+([\w$]+))?\s*$", part)
                if mm:
                    names.add(mm.group(2) or mm.group(1))
        if depth < 5:
            for m in re.finditer(r"(?m)^\s*export\s*\*\s*(?:as\s+([\w$]+)\s*)?from\s*(['\"])([^'\"]+)\2", code):
                if m.group(1):
                    names.add(m.group(1)); continue
                st, tp = self.resolve_target(m.group(3), p)
                if tp and st in ("ok", "case") and not self.is_lib(tp):
                    names |= self.exports_of(tp, depth + 1)
        return names

    @staticmethod
    def _parse_import_names(what):
        named, default, ns = [], None, None
        if not what:
            return named, default, ns
        what = what.strip()
        m = re.search(r"\{([^}]*)\}", what)
        if m:
            for part in m.group(1).split(","):
                mm = re.match(r"\s*([\w$]+)", part)
                if mm:
                    named.append(mm.group(1))
            what = what.replace(m.group(0), "")
        m2 = re.search(r"\*\s*as\s+([\w$]+)", what)
        if m2:
            ns = m2.group(1); what = what.replace(m2.group(0), "")
        d = what.replace(",", " ").split()
        if d:
            default = d[0]
        return named, default, ns

    def check_imports(self):
        imp_re = re.compile(r"(?m)^\s*import\s+(?:(?P<what>[^'\";]*?)\s+from\s+)?(?P<q>['\"])(?P<src>[^'\"]+)(?P=q)")
        exp_from = re.compile(r"(?m)^\s*export\s*(?:\*|\{[^}]*\})\s*(?:as\s+[\w$]+\s*)?from\s*(?P<q>['\"])(?P<src>[^'\"]+)(?P=q)")
        dyn_re = re.compile(r"\bimport\s*\(\s*(['\"])([^'\"]+)\1\s*\)")
        for p in self.js:
            code = strip_js(self.read(p))
            if re.search(r"\bimport\s*\(\s*[^'\"\s)]", code):
                self.dyn_unresolved = True
            targets = []
            for m in imp_re.finditer(code):
                targets.append((m.start(), m.group("src"), m.group("what")))
            for m in exp_from.finditer(code):
                targets.append((m.start(), m.group("src"), None))
            for m in dyn_re.finditer(code):
                targets.append((m.start(), m.group(2), None))
            for pos, src, what in targets:
                ln = line_of(code, pos)
                status, tp = self.resolve_target(src, p)
                src_line = self.read(p).splitlines()[ln - 1] if ln - 1 < len(self.read(p).splitlines()) else src
                if status == "bare":
                    self.add("Import quebrado", "ALTO", p, ln, f"Módulo '{src}' sem entrada no importmap", src_line,
                             "O navegador só resolve nomes 'soltos' (three, cannon-es) via <script type=importmap>.",
                             "Adicione o nome ao importmap do index.html ou use caminho relativo ('./x.js').")
                    continue
                if status == "missing":
                    self.add("Import quebrado", "ALTO", p, ln, f"Arquivo importado não existe: {src}", src_line,
                             "Caminho errado, arquivo movido/renomeado na refatoração ou extensão faltando (.js).",
                             f"Corrija o caminho relativo a partir de {self.rel(p.parent)}/ . O navegador devolve 404 "
                             "e o módulo inteiro falha.")
                    continue
                if status == "case":
                    self.add("Path de asset/módulo", "ALTO", p, ln, f"Diferença de maiúsculas/minúsculas em '{src}'",
                             src_line, "Funciona no Windows, mas QUEBRA em servidor Linux (deploy).",
                             f"Use exatamente o nome real do arquivo: {tp.name}.")
                if tp is not None and tp.suffix in (".js", ".mjs"):
                    self.edges[p].add(tp)
                if what is None or tp is None or self.is_lib(tp) or tp.suffix not in (".js", ".mjs"):
                    continue
                named, default, ns = self._parse_import_names(what)
                exports = self.exports_of(tp)
                for nm in named:
                    if nm not in exports:
                        close = difflib.get_close_matches(nm, sorted(exports), n=2)
                        self.add("Import/Export inconsistente", "ALTO", p, ln,
                                 f"'{nm}' não é exportado por {self.rel(tp)}", src_line,
                                 "Função renomeada, movida para outro módulo ou esquecida na divisão de arquivos "
                                 "(erro do navegador: \"doesn't provide an export named\").",
                                 f"Em {self.rel(tp)} adicione `export` à declaração de {nm}, ou corrija o import. "
                                 + (f"Exports existentes parecidos: {', '.join(close)}." if close else
                                    f"Exports disponíveis: {', '.join(sorted(exports)) or '(nenhum)'}."))
                if default and "default" not in exports:
                    self.add("Import/Export inconsistente", "ALTO", p, ln,
                             f"{self.rel(tp)} não tem export default", src_line,
                             "Import default de módulo que só tem exports nomeados.",
                             "Use `import { nome } from ...` ou adicione `export default`.")

    # -- 4. código órfão -----------------------------------------------------
    def check_orphans(self, htmls):
        entries = []
        for h in htmls:
            for m in re.finditer(r"<script\b[^>]*\bsrc=[\"']([^\"']+)[\"']", self.read(h), re.I):
                if m.group(1).startswith("http"):
                    continue
                st, tp = self.resolve_target(m.group(1) if m.group(1).startswith((".", "/")) else "./" + m.group(1), h)
                if tp and tp.suffix in (".js", ".mjs"):
                    entries.append(tp)
        if not entries:
            self.notes.append("Nenhum <script src> encontrado nos HTML: análise de código órfão ignorada.")
            return
        seen, stack = set(), list(entries)
        while stack:
            f = stack.pop()
            if f in seen:
                continue
            seen.add(f)
            stack.extend(self.edges.get(f, ()))
        for p in self.js:
            if self.is_lib(p) or p in seen:
                continue
            code = self.read(p)
            sev = "BAIXO" if not self.dyn_unresolved else "INFO"
            extra = " (há import() dinâmico com caminho variável: pode ser falso positivo)" if self.dyn_unresolved else ""
            self.add("Código órfão", sev, p, 1, "Módulo nunca importado a partir do index.html" + extra,
                     f"{len(code.splitlines())} linhas",
                     "Resto da refatoração, código morto ou módulo preparado e nunca ligado.",
                     "Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a "
                     "decisão no Relatório) ou documente como dívida remanescente.")

    # -- 5. HTML ----------------------------------------------------------------
    def check_html(self, htmls):
        for h in htmls:
            text = self.read(h)
            for m in re.finditer(r"<script\b[^>]*\bsrc=[\"']([^\"']+)[\"']", text, re.I):
                src = m.group(1)
                ln = line_of(text, m.start())
                if src.startswith(("http://", "https://", "//")):
                    self.add("Dependência externa", "BAIXO", h, ln, "Script carregado de CDN", src,
                             "Falha offline e adiciona latência ao primeiro render.",
                             "Baixe a biblioteca para lib/ e use caminho local.")
                    continue
                st, tp = self.resolve_target(src if src.startswith((".", "/")) else "./" + src, h)
                if st in ("missing",):
                    self.add("Path de asset/módulo", "ALTO", h, ln, f"<script src> não existe: {src}", src,
                             "Caminho errado.", "Corrija o src ou restaure o arquivo.")
            for tag in re.finditer(r"<link\b[^>]*>", text, re.I):
                t = tag.group(0)
                if not re.search(r"rel=[\"']stylesheet", t, re.I):
                    continue
                mh = re.search(r"href=[\"']([^\"']+)[\"']", t)
                if not mh:
                    continue
                href, ln = mh.group(1), line_of(text, tag.start())
                if href.startswith(("http://", "https://", "//")):
                    self.add("Dependência externa", "BAIXO", h, ln, "CSS carregado de CDN", href,
                             "Bloqueia a renderização e falha offline.", "Hospede localmente.")
                    continue
                target = Path(os.path.normpath(str(h.parent / href.split("?")[0])))
                if not target.is_file() or not self.exact_exists(target):
                    self.add("Path de asset/módulo", "ALTO", h, ln, f"CSS não encontrado: {href}", t.strip(),
                             "Arquivo movido/renomeado ou maiúsculas diferentes.",
                             "Corrija o href. (No access.log aparece como 404 de /style.css.)")
            ids = re.findall(r"\bid=[\"']([^\"']+)[\"']", text)
            for i, c in Counter(ids).items():
                if c > 1:
                    self.add("HTML inválido", "MEDIO", h, 1, f"id duplicado no HTML: '{i}' ({c}x)", i,
                             "getElementById devolve só o primeiro; eventos/estilos vão para o elemento errado.",
                             "Deixe cada id único (use class para repetir).")

    # -- 6. CSS ------------------------------------------------------------------
    def check_css(self, htmls):
        linked: set[Path] = set()
        for h in htmls:
            for tag in re.finditer(r"<link\b[^>]*>", self.read(h), re.I):
                if re.search(r"rel=[\"']stylesheet", tag.group(0), re.I):
                    mh = re.search(r"href=[\"']([^\"']+)[\"']", tag.group(0))
                    if mh and not mh.group(1).startswith(("http", "//")):
                        linked.add(Path(os.path.normpath(str(h.parent / mh.group(1).split("?")[0]))))
        reach, stack = set(), list(linked)
        imp_re = re.compile(r"@import\s+(?:url\(\s*)?['\"]?([^'\")\s;]+)['\"]?\s*\)?")
        url_re = re.compile(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)")
        while stack:
            f = stack.pop()
            if f in reach or not f.is_file():
                continue
            reach.add(f)
            for m in imp_re.finditer(self.read(f)):
                if not m.group(1).startswith(("http", "//", "data:")):
                    stack.append(Path(os.path.normpath(str(f.parent / m.group(1)))))
        for f in self.css:
            text = self.read(f)
            for m in imp_re.finditer(text):
                ref, ln = m.group(1), line_of(text, m.start())
                if ref.startswith(("http", "//")):
                    self.add("Dependência externa", "BAIXO", f, ln, "@import de CSS externo (fontes/CDN)", ref,
                             "Requisição bloqueante no caminho crítico de renderização.",
                             "Use <link rel=preload>/font-display: swap ou hospede a fonte em fonts/.")
                    continue
                target = Path(os.path.normpath(str(f.parent / ref)))
                if not target.is_file() or not self.exact_exists(target):
                    self.add("Path de asset/módulo", "ALTO", f, ln, f"@import aponta para arquivo inexistente: {ref}",
                             text.splitlines()[ln - 1],
                             "O @import é relativo à pasta DO CSS (não ao HTML). Arquivo não criado ou pasta errada. "
                             "No access.log aparece como 404 na raiz (ex.: GET /09-loja.css).",
                             f"Crie {ref} em {self.rel(f.parent)}/ (ou remova o @import) e confira o caminho relativo.")
            for m in url_re.finditer(text):
                ref = m.group(1)
                if ref.startswith(("data:", "http", "//", "#")):
                    continue
                target = Path(os.path.normpath(str(f.parent / ref.split("?")[0].split("#")[0])))
                if not target.is_file():
                    self.add("Path de asset/módulo", "MEDIO", f, line_of(text, m.start()),
                             f"url() aponta para arquivo inexistente: {ref}", m.group(0),
                             "Imagem/fonte movida ou nome errado.", "Corrija o caminho relativo ao CSS.")
        unreach = [f for f in self.css if f not in reach]
        if unreach and reach:
            lines_in = sum(len(self.read(x).splitlines()) for x in reach)
            lines_out = sum(len(self.read(x).splitlines()) for x in unreach)
            self.add("Dívida estrutural", "MEDIO", unreach[0], 1,
                     f"{len(unreach)} arquivo(s) CSS não são carregados por nenhuma página",
                     f"em uso: {lines_in} linhas | fora de uso: {lines_out} linhas | ex.: "
                     + ", ".join(self.rel(x) for x in unreach[:4]),
                     "Divisão do CSS feita mas não ligada ao HTML (ou incompleta). Trocar o <link> pode causar "
                     "regressão visual se faltar regra.",
                     "Compare cobertura (linhas/seletores) entre o CSS em uso e o modular. Só migre o <link> depois de "
                     "provar com prints antes/depois; senão registre como dívida remanescente com o motivo.")

    # -- 7. API global window.OZ -----------------------------------------------
    def check_oz_api(self, htmls):
        defined: set[str] = set()
        for p in self.js:
            raw = self.read(p)
            blank = strip_js(raw, "blank")
            for m in re.finditer(r"window\.OZ\s*=\s*\{", blank):
                i, depth, start = m.end() - 1, 0, m.end()
                for j in range(i, len(blank)):
                    if blank[j] == "{":
                        depth += 1
                    elif blank[j] == "}":
                        depth -= 1
                        if depth == 0:
                            body = blank[start:j]; break
                else:
                    body = ""
                lvl, cur, pieces = 0, [], []
                for ch in body:
                    if ch in "{[(":
                        lvl += 1
                    elif ch in "}])":
                        lvl -= 1
                    if ch == "," and lvl == 0:
                        pieces.append("".join(cur)); cur = []
                    else:
                        cur.append(ch)
                pieces.append("".join(cur))
                for pc in pieces:
                    mm = re.match(r"\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*(?::|\(|$)", pc)
                    if mm:
                        defined.add(mm.group(1))
            for m in re.finditer(r"window\.OZ\.([A-Za-z_$][\w$]*)\s*=(?!=)", blank):
                defined.add(m.group(1))
            for m in re.finditer(r"Object\.assign\(\s*window\.OZ\s*,\s*\{([^}]*)\}", blank):
                for nm in re.findall(r"([A-Za-z_$][\w$]*)\s*[:,]", m.group(1)):
                    defined.add(nm)
        self.oz_defined = defined
        inline = Counter()
        for p in self.js + htmls:
            raw = self.read(p)
            code = strip_js(raw) if p.suffix in (".js", ".mjs") else raw
            inline[self.rel(p)] += len(re.findall(r"\bon(?:click|change|input|submit|keydown)\s*=", code))
            for m in re.finditer(r"window\.OZ\.([A-Za-z_$][\w$]*)", code):
                tail = code[m.end(): m.end() + 6]
                if re.match(r"\s*=(?!=)", tail):
                    continue
                if defined and m.group(1) not in defined:
                    ln = line_of(code, m.start())
                    self.add("Chamada a API global inexistente", "ALTO", p, ln,
                             f"window.OZ.{m.group(1)} não é definido em lugar nenhum", code.splitlines()[ln - 1],
                             "Função esquecida ao montar window.OZ (típico após dividir main.js/screens.js). "
                             f"Erro no console: \"window.OZ.{m.group(1)} is not a function\".",
                             f"No instalarOZ()/módulo da tela adicione `window.OZ.{m.group(1)} = {m.group(1)};` "
                             "ou troque o onclick inline por addEventListener no módulo.")
        total = sum(inline.values())
        if total:
            top = ", ".join(f"{k} ({v})" for k, v in inline.most_common(4) if v)
            self.add("Dívida estrutural", "BAIXO", "index.html" if (self.root / "index.html").exists() else "js/main.js", 1,
                     f"{total} handlers inline (onclick=...) acoplados a window.OZ", top,
                     "HTML gerado como string chama funções globais: qualquer função fora de window.OZ vira TypeError.",
                     "Prefira data-attributes + addEventListener com delegação num módulo (ex.: data-acao=\"abrirLoja\"). "
                     "Se não der tempo, declare como dívida remanescente.")

    # -- 8. ids usados e nunca criados --------------------------------------
    def check_ids(self, htmls):
        known = set()
        for p in self.js + htmls:
            t = self.read(p)
            known |= set(re.findall(r"\bid\s*=\s*\\?[\"']([\w\-:]+)", t))
            known |= set(re.findall(r"\.id\s*=\s*['\"`]([\w\-:]+)['\"`]", t))
            known |= set(re.findall(r"\bid\s*:\s*['\"`]([\w\-:]+)['\"`]", t))
            known |= set(re.findall(r"setAttribute\(\s*['\"]id['\"]\s*,\s*['\"`]([\w\-:]+)", t))
        for p in self.js:
            code = strip_js(self.read(p))
            for m in re.finditer(r"getElementById\(\s*(['\"])([\w\-:]+)\1\s*\)", code):
                if m.group(2) not in known:
                    ln = line_of(code, m.start())
                    self.add("Elemento inexistente", "MEDIO", p, ln, f"getElementById('{m.group(2)}'): id nunca criado",
                             code.splitlines()[ln - 1],
                             "Id renomeado/removido no HTML ou na divisão de telas: retorna null e causa "
                             "\"Cannot read properties of null\".",
                             f"Crie o elemento com id=\"{m.group(2)}\" ou corrija o id; proteja com `if (!el) return;`.")

    # -- 9. listeners, timers, observers ----------------------------------------
    def check_listeners_timers(self):
        for p in self.js:
            code = strip_js(self.read(p))
            lines = code.splitlines()
            adds = [(i + 1, l) for i, l in enumerate(lines)
                    if re.search(r"\b(window|document|document\.body|canvas|renderer\.domElement)\.addEventListener\(", l)]
            rems = len(re.findall(r"removeEventListener\(", code))
            if adds and rems == 0:
                self.add("Possível vazamento (listener)", "MEDIO", p, adds[0][0],
                         f"{len(adds)} listener(s) global(is) sem removeEventListener neste arquivo",
                         "; ".join(f"L{n}: {short(l, 70)}" for n, l in adds[:3]),
                         "Listeners em window/document/canvas continuam ativos mesmo depois que a tela/missão fecha; "
                         "se o código roda mais de uma vez eles se acumulam (callbacks duplicados, memória).",
                         "Guarde a referência da função (`const onKey = e => {...}`) e chame "
                         "`removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` "
                         "com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. "
                         "Confirme medindo getEventListeners(window) antes/depois.")
            for kind, stop in (("ResizeObserver", "disconnect("), ("MutationObserver", "disconnect("),
                               ("IntersectionObserver", "disconnect(")):
                if re.search(rf"new\s+{kind}\(", code) and stop not in code:
                    ln = line_of(code, re.search(rf"new\s+{kind}\(", code).start())
                    self.add("Possível vazamento (observer)", "MEDIO", p, ln, f"{kind} sem disconnect()", lines[ln - 1],
                             "Observer nunca é desconectado.", f"Chame `observer.disconnect()` quando o elemento sair da tela.")
            if "setInterval(" in code and "clearInterval(" not in code:
                ln = line_of(code, code.index("setInterval("))
                self.add("Possível vazamento (timer)", "MEDIO", p, ln, "setInterval sem clearInterval", lines[ln - 1],
                         "Timer continua rodando depois que a tela fecha.", "Guarde o id e chame clearInterval ao fechar.")

    # -- 10. Three.js dispose ------------------------------------------------------
    def check_three_dispose(self):
        creators = re.compile(r"new\s+(?:THREE\.)?(\w*(?:Geometry|Material|Texture|RenderTarget)|WebGLRenderer)\s*\(")
        for p in self.js:
            code = strip_js(self.read(p))
            lines = code.splitlines()
            made = [(line_of(code, m.start()), m.group(1)) for m in creators.finditer(code)]
            loads = [(i + 1) for i, l in enumerate(lines) if re.search(r"\b(load|loadAsync)\(", l)
                     and re.search(r"(?i)texture|exr|hdr|gltf|fbx|glb", l)]
            if not made and not loads:
                continue
            disposes = code.count(".dispose(")
            removes = len(re.findall(r"\.(?:remove|removeFromParent)\(", code))
            if disposes == 0:
                first = (made[0][0] if made else loads[0])
                risky = removes > 0
                self.add("Possível vazamento (GPU)", "MEDIO" if risky else "BAIXO", p, first,
                         "Recursos Three.js criados/carregados sem nenhum .dispose() neste arquivo"
                         + (" e objetos são removidos da cena" if risky else ""),
                         f"{len(made)} criação(ões): " + ", ".join(sorted({n for _, n in made}))[:120]
                         if made else "carrega modelos/texturas",
                         "Remover do scene NÃO libera GPU: geometry/material/texture continuam em memória. "
                         "Cada abrir/fechar de tela/missão aumenta renderer.info.memory."
                         if risky else
                         "Se os recursos vivem o app inteiro, não há vazamento real.",
                         "Ao descartar: `obj.traverse(o=>{o.geometry?.dispose(); [].concat(o.material||[]).forEach(m=>{"
                         "Object.values(m).forEach(v=>v?.isTexture&&v.dispose()); m.dispose();});}); scene.remove(obj);` "
                         "e `renderer.dispose()` ao destruir o canvas. Prove com renderer.info.memory antes/depois de "
                         "abrir/fechar 10x." if risky else
                         "Só aja se a medição (renderer.info.memory) crescer a cada uso.")

    # -- 11. física (cannon-es) ----------------------------------------------------
    def check_physics(self):
        for p in self.js:
            code = strip_js(self.read(p))
            if re.search(r"\.addBody\(", code) and not re.search(r"\.removeBody\(", code):
                ln = line_of(code, re.search(r"\.addBody\(", code).start())
                self.add("Possível vazamento (física)", "MEDIO", p, ln, "addBody sem removeBody", code.splitlines()[ln - 1],
                         "Corpos físicos ficam em world.bodies para sempre: o passo de simulação fica mais lento.",
                         "Ao remover o mesh chame `world.removeBody(body)` e meça world.bodies.length no ciclo criar/destruir.")

    # -- 12. paths de assets -----------------------------------------------------------
    def check_assets(self):
        asset_re = re.compile(rf"""(['"`])([^'"`\n]{{1,200}}?\.(?:{ASSET_EXT}))\1""", re.I)
        by_name = defaultdict(list)
        for p in self.files:
            if re.search(rf"\.({ASSET_EXT})$", p.name, re.I) and not self.is_lib(p):
                by_name[p.name].append(p)
        if not by_name:
            self.notes.append("Nenhum arquivo de asset (glb/fbx/exr/png...) encontrado na pasta analisada: "
                              "verificação de existência de paths foi PULADA. Rode o script na raiz completa do projeto.")
        styles = {}
        spaces = []
        for p in self.js:
            raw = self.read(p)
            code = strip_js(raw)
            for m in asset_re.finditer(code):
                ref = m.group(2)
                if ref.startswith(("http", "data:", "blob:")) or "${" in ref:
                    continue
                ln = line_of(code, m.start())
                text_line = raw.splitlines()[ln - 1] if ln - 1 < len(raw.splitlines()) else ref
                style = "new URL(...)" if "new URL(" in text_line or "import.meta.url" in text_line else "literal"
                styles.setdefault(style, []).append(f"{self.rel(p)}:{ln}")
                if " " in ref:
                    spaces.append((p, ln, ref))
                if not by_name:
                    continue
                cand = (self.root / ref.lstrip("./")) if ("/" in ref) else None
                ok = False
                if cand is not None and cand.is_file():
                    if self.exact_exists(cand):
                        ok = True
                    else:
                        self.add("Path de asset/módulo", "ALTO", p, ln, "Maiúsculas/minúsculas diferentes do arquivo real",
                                 ref, "Funciona no Windows, 404 em Linux.", f"Use o nome real: {cand.name}")
                        ok = True
                if not ok:
                    base = ref.split("/")[-1]
                    if base in by_name:
                        if "/" in ref:
                            self.add("Path de asset/módulo", "MEDIO", p, ln,
                                     f"Caminho '{ref}' não existe, mas '{base}' existe em outro lugar", ref,
                                     "Arquivo movido de pasta.",
                                     "Aponte para: " + ", ".join(self.rel(x) for x in by_name[base][:2]))
                    else:
                        self.add("Path de asset/módulo", "ALTO", p, ln, f"Asset referenciado não existe: {ref}", text_line,
                                 "Arquivo não está no projeto (nome errado, renomeado ou nunca copiado). "
                                 "Gera 404 no access.log e erro no loader.",
                                 "Confira o nome na pasta real, restaure o arquivo ou remova a referência.")
        if spaces:
            files = sorted({self.rel(x[0]) for x in spaces})
            self.add("Path de asset/módulo", "BAIXO", spaces[0][0], spaces[0][1],
                     f"{len(spaces)} referências a assets com espaço no nome/pasta (em {len(files)} arquivo(s))",
                     "; ".join(sorted({x[2] for x in spaces})[:3]),
                     "Espaços viram %20 na URL e quebram facilmente em scripts, deploy e comparação de nomes.",
                     "Renomeie pasta/arquivos sem espaços (ex.: female-locomotion-pack/left-strafe-walk.fbx) e "
                     "atualize o código em um único ponto (config de paths). Só faça se der tempo de refazer o "
                     "checklist de não-regressão; senão registre como dívida remanescente.")
        if len(styles) > 1:
            first = list(styles.values())[0][0].split(":")
            self.add("Dívida estrutural", "BAIXO", first[0], int(first[1]), "Caminhos de assets definidos de formas diferentes",
                     "; ".join(f"{k}: {len(v)} usos" for k, v in styles.items()),
                     "Cada módulo monta o caminho do seu jeito: quebra quando a pasta muda.",
                     "Centralize em js/config/paths.js: `export const MODELS = new URL('../../models/', import.meta.url);` "
                     "e `export const modelo = f => new URL(f, MODELS).href;`.")

    # -- 13. storage sem proteção ---------------------------------------------------------
    def check_storage(self):
        for p in self.js:
            code = strip_js(self.read(p))
            lines = code.splitlines()
            for i, l in enumerate(lines):
                if re.search(r"\b(localStorage|sessionStorage)\s*\.", l):
                    window = "\n".join(lines[max(0, i - 6): i + 1])
                    if not re.search(r"\btry\b", window):
                        self.add("Erro em tempo de execução", "ALTO", p, i + 1,
                                 "Acesso a localStorage/sessionStorage sem try/catch", l,
                                 "Navegador com armazenamento bloqueado (Firefox/aba privada/cookies bloqueados) lança "
                                 "\"SecurityError: The operation is insecure\" e derruba a inicialização.",
                                 "Envolva em try/catch com fallback em memória: "
                                 "`let v=null; try{v=localStorage.getItem(K)}catch{}` e idem para setItem/removeItem.")

    # -- 14. carregamento / performance estática ---------------------------------------------
    def check_loading(self):
        for p in self.js:
            code = strip_js(self.read(p))
            lines = code.splitlines()
            for m in re.finditer(r"(?m)^await\s", code):
                ln = line_of(code, m.start())
                self.add("Carregamento síncrono", "MEDIO", p, ln, "await no topo do módulo bloqueia o grafo de módulos",
                         lines[ln - 1], "Nada que importa este módulo executa até o await terminar (atrasa o 1º render).",
                         "Mova para uma função async chamada DEPOIS do primeiro render e mostre um estado de loading.")
            for i, l in enumerate(lines):
                if re.search(r"\bawait\b.*\b(load|loadAsync|fetch)\(", l):
                    ctx = "\n".join(lines[max(0, i - 4): i + 1])
                    if re.search(r"\bfor\s*(await\s*)?\(|\bwhile\s*\(", ctx):
                        self.add("Carregamento síncrono", "MEDIO", p, i + 1, "Carregamento sequencial (await dentro de loop)",
                                 l, "Cada arquivo espera o anterior terminar: soma dos tempos em vez do maior.",
                                 "Use `await Promise.all(lista.map(f => loader.loadAsync(f)))` e carregue o que não é "
                                 "crítico depois do primeiro render.")

    # -- 15. tamanho e debug ----------------------------------------------------------------------
    def check_size_and_debug(self):
        logs = Counter()
        for p in self.js:
            code = self.read(p)
            n = len(code.splitlines())
            if n > 500:
                self.add("Dívida estrutural", "MEDIO" if n < 1000 else "ALTO", p, 1,
                         f"Arquivo muito grande: {n} linhas", f"{n} linhas",
                         "Várias responsabilidades no mesmo módulo (difícil de testar, revisar e dividir autoria).",
                         "Divida por responsabilidade (entrada/estado/UI/lógica), mantendo a API pública. "
                         "Faça em commits/INT separadas e prove a não-regressão.")
            c = strip_js(code)
            logs[self.rel(p)] += c.count("console.log(") + c.count("debugger")
            for m in re.finditer(r"//\s*(TODO|FIXME|HACK|XXX)\b.*", code):
                self.add("Pendência no código", "INFO", p, line_of(code, m.start()), m.group(0).strip()[:100], m.group(0),
                         "Marcador deixado no código.", "Resolva ou registre na dívida remanescente.")
        tot = sum(logs.values())
        if tot:
            top = ", ".join(f"{k} ({v})" for k, v in logs.most_common(4) if v)
            self.add("Qualidade", "INFO", "js/", 0, f"{tot} console.log/debugger no código", top,
                     "Ruído no console e custo em produção.", "Remova ou proteja por flag de debug.")


# ----------------------------------------------------------------------------
# análise de logs do dev.py
# ----------------------------------------------------------------------------
KB = [
    (r"doesn'?t provide an export named:?\s*'?([\w$]+)'?", "Import/Export inconsistente",
     "O módulo importado não exporta esse nome (renomeado, movido ou esquecido na divisão de arquivos).",
     "Adicione `export` à função {1} no módulo de origem ou corrija o import no módulo que a usa."),
    (r"window\.OZ\.([\w$]+) is not a function", "Chamada a API global inexistente",
     "onclick inline chama window.OZ.{1}, que não foi registrada.",
     "Registre `window.OZ.{1} = {1}` no módulo que define a função (ex.: instalarOZ) ou troque o onclick por addEventListener."),
    (r"([\w$.()\s]+)\.([\w$]+) is not a function", "Método inexistente (TypeError)",
     "O objeto não tem o método '{2}' (API mudou, objeto errado ou módulo não inicializado).",
     "Confira o objeto no ponto indicado (console.log do tipo), a ordem de inicialização e o nome do método."),
    (r"missing \) after formal parameters|Unexpected token|Unexpected identifier|Invalid or unexpected token|Unexpected end of input",
     "Erro de sintaxe (SyntaxError)", "Arquivo JS inválido: o navegador recusa o módulo inteiro.",
     "Rode `node --check` no arquivo, corrija parênteses/chaves/vírgulas na linha apontada e na anterior."),
    (r"SecurityError.*insecure", "Armazenamento bloqueado (SecurityError)",
     "localStorage/sessionStorage inacessível (Firefox, aba privada, cookies bloqueados).",
     "Envolva todo acesso em try/catch com fallback em memória."),
    (r"Error in input stream", "Requisição abortada (rejeição não tratada)",
     "Carregamento de FBX/GLB/EXR cancelado por reload/hot-reload no meio do download; a Promise rejeita sem catch.",
     "Adicione try/catch/.catch nos loaders e ignore AbortError/erros de cancelamento; trate como ruído de dev se só ocorre em reload."),
    (r"Cannot read propert(?:y|ies) of (?:null|undefined)", "Acesso a objeto nulo (TypeError)",
     "Elemento do DOM ou objeto ainda não existe quando é acessado.",
     "Verifique id/ordem de inicialização e proteja com `if (!el) return;` ou `?.`."),
    (r"([\w$]+) is not defined", "Variável não definida (ReferenceError)",
     "Falta import/declaração de '{1}' (típico após dividir arquivos).",
     "Importe '{1}' no módulo que o usa ou declare-o."),
    (r"Failed to resolve module specifier", "Import sem importmap",
     "Nome de módulo 'solto' sem entrada no importmap.", "Adicione ao importmap do index.html ou use caminho relativo."),
    (r"Failed to fetch|NetworkError|Load failed", "Falha de rede/asset",
     "Arquivo não encontrado ou bloqueado.", "Veja o access.log: procure o 404/403 do mesmo horário e corrija o path."),
    (r"CONTEXT_LOST|WebGL.*lost", "Contexto WebGL perdido", "Memória de GPU esgotada ou muitos canvases.",
     "Libere recursos (dispose), limite renderers simultâneos e reutilize o renderer."),
]


def fill(text: str, gs: dict) -> str:
    for k, v in gs.items():
        text = text.replace("{" + k + "}", v)
    return text


def parse_ts(s: str):
    try:
        return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


class LogAnalyzer:
    def __init__(self, aud: Auditor, logs_dir: Path):
        self.aud, self.dir = aud, logs_dir
        self.groups: list[dict] = []
        self.http: list[dict] = []
        self.sessions: list[dict] = []
        self.last_ts = None

    def path_to_file(self, url_or_path: str):
        m = re.search(r"(?:https?://[^/\s]+)?(/[^\s:)?]*\.(?:js|mjs|html|css))", url_or_path or "")
        if not m:
            return None
        rel = m.group(1).lstrip("/")
        return rel

    def run(self):
        self._errors(self.dir / "errors.log")
        self._access(self.dir / "access.log")
        self._security(self.dir / "security.log")

    def _errors(self, f: Path):
        if not f.is_file():
            return
        entries, cur = [], None
        for line in f.read_text(encoding="utf-8", errors="replace").splitlines():
            m = re.match(r"^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) \| (\w+)\s*\|", line)
            if m:
                if cur:
                    entries.append(cur)
                cur = {"ts": parse_ts(m.group(1)), "raw": line}
            elif cur and line.strip():
                cur["raw"] += "\n" + line
        if cur:
            entries.append(cur)
        grouped: dict = {}
        for e in entries:
            raw = e["raw"]
            mt = re.search(r"type=(\S+)", raw)
            ms = re.search(r"source=(\S*)", raw)
            mm = re.search(r"message=(.*?)(?: \| stack=|$)", raw.split("\n")[0])
            mk = re.search(r"stack=(.*)", raw, re.S)
            typ = mt.group(1) if mt else "desconhecido"
            msg = (mm.group(1).strip() if mm else raw[:150])
            stack = (mk.group(1).strip() if mk else "")
            norm = re.sub(r"https?://[^/\s]+", "", msg)
            key = (typ, norm)
            g = grouped.setdefault(key, {"tipo_log": typ, "mensagem": norm, "n": 0, "primeira": e["ts"], "ultima": e["ts"],
                                         "fontes": Counter(), "stack": stack})
            g["n"] += 1
            if e["ts"]:
                g["primeira"] = min(g["primeira"], e["ts"]) if g["primeira"] else e["ts"]
                g["ultima"] = max(g["ultima"], e["ts"]) if g["ultima"] else e["ts"]
                self.last_ts = max(self.last_ts, e["ts"]) if self.last_ts else e["ts"]
            if ms and ms.group(1):
                g["fontes"][self.path_to_file(ms.group(1)) or ms.group(1)] += 1
            if not g["stack"] and stack:
                g["stack"] = stack
        self.groups = list(grouped.values())

    def _access(self, f: Path):
        if not f.is_file():
            return
        rows = []
        for line in f.read_text(encoding="utf-8", errors="replace").splitlines():
            m = re.match(r"^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) .*\"(GET|POST|HEAD) (\S+) HTTP/[\d.]+\" (\d{3})", line)
            if m:
                rows.append((parse_ts(m.group(1)), m.group(2), m.group(3), int(m.group(4))))
        if rows:
            ts = [r[0] for r in rows if r[0]]
            if ts:
                self.last_ts = max(self.last_ts, max(ts)) if self.last_ts else max(ts)
        bad = defaultdict(lambda: {"n": 0, "primeira": None, "ultima": None})
        for t, meth, path, st in rows:
            if st >= 400:
                b = bad[(st, path.split("?")[0])]
                b["n"] += 1
                b["primeira"] = min(b["primeira"], t) if b["primeira"] and t else (t or b["primeira"])
                b["ultima"] = max(b["ultima"], t) if b["ultima"] and t else (t or b["ultima"])
        self.http = [{"status": k[0], "path": k[1], **v} for k, v in sorted(bad.items(), key=lambda x: -x[1]["n"])]
        # sessões de carregamento
        cur = None
        for t, meth, path, st in rows:
            if meth == "GET" and path.split("?")[0] == "/":
                if cur:
                    self.sessions.append(cur)
                cur = {"inicio": t, "fim": t, "req": 0, "js": 0, "assets": 0, "erros": 0, "css": 0}
            if cur is None or t is None:
                continue
            if (t - cur["fim"]) > timedelta(seconds=40) and cur["req"] > 3:
                self.sessions.append(cur); cur = None
                continue
            if path == "/__reload__":
                continue
            cur["fim"] = max(cur["fim"], t)
            cur["req"] += 1
            p0 = path.split("?")[0].lower()
            cur["js"] += p0.endswith(".js")
            cur["css"] += p0.endswith(".css")
            cur["assets"] += bool(re.search(r"\.(glb|gltf|fbx|exr|hdr|png|jpe?g|webp)$", p0.replace("%20", " ")))
            cur["erros"] += st >= 400
        if cur:
            self.sessions.append(cur)

    def _security(self, f: Path):
        if not f.is_file():
            return
        for line in f.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.strip():
                self.aud.notes.append("security.log: " + short(line, 160))

    def to_findings(self):
        aud = self.aud
        for g in sorted(self.groups, key=lambda x: -x["n"]):
            tipo, causa, sol = "Erro de runtime", "Sem padrão conhecido.", "Reproduza e leia a stack no console do navegador."
            check = ""
            for rx, t, c, s in KB:
                m = re.search(rx, g["mensagem"], re.I)
                if m:
                    tipo = t
                    gs = {str(i + 1): (m.group(i + 1) or "") for i in range(len(m.groups()))}
                    causa, sol = fill(c, gs), fill(s, gs)
                    check = self._check_current(g, rx, m)
                    break
            fonte = g["fontes"].most_common(1)[0][0] if g["fontes"] else (self.path_to_file(g["stack"]) or "(origem não informada)")
            if fonte.startswith("http") or fonte in ("", "/"):
                fonte = "index.html"   # handler inline (onclick) ou erro sem arquivo
            if fonte == "(origem não informada)":
                fonte = "js/"
            ln = 0
            ml = re.search(r":(\d+):\d+", g["stack"] or "")
            if ml:
                ln = int(ml.group(1))
            status = self._status(g["ultima"])
            sev = "ALTO" if "ATIVO" in status else "BAIXO"
            if tipo.startswith("Erro de sintaxe") and "ATIVO" in status:
                sev = "CRITICO"
            ev = (f"{g['n']}x | {g['primeira']:%d/%m %H:%M:%S} → {g['ultima']:%d/%m %H:%M:%S} | {g['mensagem'][:140]}"
                  if g["primeira"] else g["mensagem"][:160])
            aud.add(tipo, sev, fonte, ln, f"[LOG] {g['mensagem'][:150]}", ev + (" | " + check if check else ""),
                    causa, sol + f" Status: {status}", origem="log")
        for h in self.http:
            if h["status"] == 403 and ".well-known" in h["path"]:
                aud.add("Segurança (esperado)", "INFO", "dev.py", 0, f"403 em {h['path']} ({h['n']}x)", "",
                        "Chrome DevTools sondando arquivo oculto; o dev.py bloqueia caminhos que começam com ponto.",
                        "Nenhuma. Use como EVIDÊNCIA no mini-desafio de segurança (proteção funcionou).", origem="log")
                continue
            ext = os.path.splitext(h["path"])[1].lower()
            sev = "BAIXO" if "favicon" in h["path"] else ("ALTO" if ext in (".js", ".css", ".glb", ".fbx", ".exr", ".png", ".json") else "MEDIO")
            status = self._status(h["ultima"])
            if "ATIVO" not in status and sev == "ALTO":
                sev = "BAIXO"
            sol = ("Adicione um favicon (`<link rel=\"icon\" href=\"data:,\">` resolve sem arquivo)."
                   if "favicon" in h["path"] else
                   "Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). "
                   "Se vem de @import/url() do CSS, o caminho é relativo ao CSS.")
            aud.add("Path de asset/módulo", sev, h["path"].lstrip("/") or "/", 0,
                    f"[ACCESS.LOG] HTTP {h['status']} em {h['path']} ({h['n']}x)",
                    f"{h['n']}x | {h['primeira']:%H:%M:%S} → {h['ultima']:%H:%M:%S}" if h["primeira"] else "",
                    "O navegador pediu um arquivo que o servidor não tem/ não liberou.", sol + f" Status: {status}", origem="log")

    def _status(self, last):
        if not last or not self.last_ts:
            return "indeterminado"
        gap = self.last_ts - last
        if gap > timedelta(minutes=15):
            return f"SEM RECORRÊNCIA há {int(gap.total_seconds() // 60)} min (provável corrigido; confirme rodando de novo)"
        return "ATIVO (ocorreu perto do fim do log)"

    def _check_current(self, g, rx, m):
        aud = self.aud
        msg = g["mensagem"]
        if "window\\.OZ" in rx:
            name = m.group(1)
            return (f"código atual: window.OZ.{name} {'DEFINIDO' if name in aud.oz_defined else 'AINDA AUSENTE'}")
        if "provide an export" in rx:
            name = m.group(1)
            src = re.search(r"module '([^']+)'", msg)
            if src:
                rel = self.path_to_file(src.group(1))
                p = aud.root / rel if rel else None
                if p and p.is_file():
                    return f"código atual: {rel} {'exporta' if name in aud.exports_of(p) else 'NÃO exporta'} {name}"
                if rel:
                    return f"código atual: {rel} não existe mais"
        if "is not a function" in rx and m.lastindex and m.lastindex >= 2:
            name = m.group(2)
            hits = 0
            for pth in aud.js:
                hits += len(re.findall(r"\." + re.escape(name) + r"\s*\(", strip_js(aud.read(pth))))
            return (f"código atual: {hits} chamada(s) a .{name}() restante(s)" if hits else
                    f"código atual: nenhuma chamada a .{name}() (provável corrigido)")
        if "SyntaxError" in msg or "Erro de sintaxe" in rx or "formal parameters" in rx:
            for f in g["fontes"]:
                if f in aud.syntax_ok:
                    return f"código atual: {f} {'passa' if aud.syntax_ok[f] else 'AINDA FALHA'} na checagem de sintaxe"
        if "insecure" in rx:
            ung = [x for x in aud.findings if x.tipo == "Erro em tempo de execução" and x.origem == "codigo"]
            return ("código atual: ainda há acesso a storage sem try/catch" if ung else "código atual: acessos protegidos")
        return ""


# ----------------------------------------------------------------------------
# relatórios
# ----------------------------------------------------------------------------
def assign_ids(findings):
    findings.sort(key=lambda f: (f.origem != "codigo", SEV_ORDER[f.severidade], f.bloco, f.arquivo, f.linha))
    c = {"codigo": 0, "log": 0}
    for f in findings:
        c[f.origem] += 1
        f.id = ("A-" if f.origem == "codigo" else "L-") + f"{c[f.origem]:03d}"


def build_markdown(aud: Auditor, la: LogAnalyzer | None, findings) -> str:
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    out = [f"# Relatório de auditoria do projeto\n",
           f"- Gerado em: {now}  |  auditar_projeto.py v{VERSION}",
           f"- Pasta analisada: `{aud.root}`",
           f"- Arquivos: {aud.stats['total']} (JS {aud.stats['js']}, CSS {aud.stats['css']}, HTML {aud.stats['html']}, PY {aud.stats['py']})",
           f"- Validação de sintaxe: {'node --check' if aud.node else 'heurística (sem Node)'}",
           f"- Total de achados: {len(findings)}\n"]
    sev = Counter(f.severidade for f in findings)
    out.append("## 1. Resumo\n\n| Severidade | Qtde |\n|---|---|")
    for s in SEV_ORDER:
        out.append(f"| {s} | {sev.get(s, 0)} |")
    blocks = defaultdict(Counter)
    for f in findings:
        blocks[f.bloco][f.severidade] += 1
    out.append("\n### Por bloco do projeto\n\n| Bloco | CRIT | ALTO | MEDIO | BAIXO | INFO |\n|---|---|---|---|---|---|")
    for b, c in sorted(blocks.items(), key=lambda kv: (-kv[1]["CRITICO"], -kv[1]["ALTO"], kv[0])):
        out.append(f"| {b} | {c['CRITICO']} | {c['ALTO']} | {c['MEDIO']} | {c['BAIXO']} | {c['INFO']} |")
    tipos = Counter(f.tipo for f in findings)
    out.append("\n### Por tipo de erro\n\n| Tipo | Qtde |\n|---|---|")
    for t, n in tipos.most_common():
        out.append(f"| {t} | {n} |")
    if aud.notes:
        out.append("\n### Avisos do auditor\n")
        out += [f"- {n}" for n in aud.notes[:30]]

    out.append("\n## 2. Achados por bloco\n")
    for b in sorted(blocks, key=lambda b: (-blocks[b]["CRITICO"], -blocks[b]["ALTO"], b)):
        out.append(f"\n### {b}\n")
        for f in [x for x in findings if x.bloco == b]:
            out.append(f"**[{f.id}] {f.severidade} · {f.tipo}** — `{f.arquivo}:{f.linha}`  \n{f.titulo}")
            if f.evidencia:
                out.append(f"- Evidência: `{f.evidencia}`")
            if f.causa:
                out.append(f"- Causa provável: {f.causa}")
            if f.solucao:
                out.append(f"- **Como corrigir:** {f.solucao}")
            out.append("")
    if la and (la.groups or la.http):
        out.append("\n## 3. Logs do dev.py\n")
        if la.groups:
            out.append("### errors.log (agrupado)\n\n| Qtde | Tipo | Mensagem | Origem | 1ª | Última |\n|---|---|---|---|---|---|")
            for g in sorted(la.groups, key=lambda x: -x["n"]):
                src = g["fontes"].most_common(1)[0][0] if g["fontes"] else "-"
                p, u = (g["primeira"], g["ultima"])
                out.append(f"| {g['n']} | {g['tipo_log']} | {g['mensagem'][:90].replace('|', '/')} | {src} | "
                           f"{p:%H:%M:%S} | {u:%H:%M:%S} |" if p else f"| {g['n']} | {g['tipo_log']} | {g['mensagem'][:90]} | {src} | - | - |")
        if la.http:
            out.append("\n### access.log (HTTP >= 400)\n\n| Qtde | Status | Caminho |\n|---|---|---|")
            for h in la.http[:25]:
                out.append(f"| {h['n']} | {h['status']} | `{h['path']}` |")
        if la.sessions:
            out.append("\n### Sessões de carregamento (GET /) — use para baseline x depois\n\n"
                       "| Início | Duração (s) | Requisições | JS | CSS | Assets 3D | 4xx/5xx |\n|---|---|---|---|---|---|---|")
            sess = la.sessions if len(la.sessions) <= 8 else la.sessions[:4] + la.sessions[-4:]
            for s in sess:
                dur = int((s["fim"] - s["inicio"]).total_seconds())
                out.append(f"| {s['inicio']:%d/%m %H:%M:%S} | {dur} | {s['req']} | {s['js']} | {s['css']} | {s['assets']} | {s['erros']} |")
            out.append("\n> Resolução de 1 s e hot-reload podem cancelar cargas: confirme tempos no DevTools (Performance).")
    out.append("\n## 4. Checklist de não-regressão (após corrigir)\n\n"
               "- [ ] Rodar `python auditar_projeto.py` de novo e comparar a contagem (ALTO/CRITICO devem cair).\n"
               "- [ ] Carregar cena → criar objeto → colidir → quiz → salvar/recarregar → fechar, SEM erro no console.\n"
               "- [ ] errors.log sem entradas novas durante o roteiro; access.log sem 404 novos.\n"
               "- [ ] Prints antes/depois de 2–3 cenas-chave; renderer.info.memory antes/depois de abrir/fechar a loja 10x.\n")
    return "\n".join(out)


def build_prompt(md_findings: str, aud: Auditor) -> str:
    return f"""# PROMPT PARA A IA (cole este arquivo inteiro e anexe os arquivos citados)

Você é um engenheiro de software sênior fazendo MANUTENÇÃO de um sistema legado
(Three.js + ES Modules + dev.py). NÃO reescreva módulos do zero. Faça mudanças mínimas,
cada uma rastreável, sem quebrar o que já funciona (princípio de não-regressão).

Abaixo está o relatório gerado por `auditar_projeto.py`. Cada achado traz ID, severidade,
tipo, bloco do projeto, arquivo:linha, evidência e a solução sugerida.

## O que eu preciso de você
1. Trabalhe em ordem: CRITICO → ALTO → MEDIO. Ignore INFO por enquanto.
2. Para cada achado: (a) confirme se é erro real ou falso positivo (heurística), olhando o arquivo
   que eu anexar; (b) mostre o trecho ANTES e DEPOIS (diff curto); (c) explique o motivo em 1–2 frases;
   (d) diga como eu provo que funcionou (comando, print, métrica ou linha do log).
3. Se faltar o conteúdo de um arquivo para decidir, PEÇA o arquivo pelo caminho; não invente código.
4. Agrupe correções que mexem no mesmo arquivo numa única intervenção (INT-01, INT-02...).
5. No fim entregue: tabela (ID | arquivo | tipo | corrigido? | evidência de não-regressão) e uma lista
   de dívida remanescente (o que NÃO vale corrigir agora e por quê).

## Regras
- Responda em português. Não use commits/PR (este trabalho não usa Git): registre cada mudança como INT-xx.
- Não remova arquivos sem eu confirmar que nada os importa (veja 'Código órfão' e o access.log).
- Quando houver risco visual (CSS), exija prints antes/depois.

## Relatório (resumo dos achados)
{md_findings}
"""


def compact_findings(findings, limit=120):
    rows = []
    for f in findings:
        if f.severidade == "INFO":
            continue
        rows.append(f"- [{f.id}] {f.severidade} | {f.tipo} | bloco: {f.bloco} | {f.arquivo}:{f.linha}\n"
                    f"  problema: {f.titulo}\n  evidência: {f.evidencia}\n  sugestão: {f.solucao}")
        if len(rows) >= limit:
            rows.append(f"... (+ {sum(1 for x in findings if x.severidade != 'INFO') - limit} achados; veja o relatorio_auditoria.md)")
            break
    return "\n".join(rows)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:  # noqa
            pass
    ap = argparse.ArgumentParser(description="Auditor de erros do projeto (estático + logs).")
    ap.add_argument("raiz", nargs="?", default=".", help="pasta raiz do projeto (padrão: .)")
    ap.add_argument("--logs", default=None, help="pasta dos logs (padrão: <raiz>/logs)")
    ap.add_argument("--saida", default=None, help="pasta de saída (padrão: <raiz>/auditoria)")
    ap.add_argument("--incluir-lib", action="store_true", help="também analisa lib/ (lento)")
    a = ap.parse_args()

    root = Path(a.raiz).resolve()
    if not root.is_dir():
        print(f"Pasta não encontrada: {root}"); sys.exit(2)
    outdir = Path(a.saida) if a.saida else root / "auditoria"
    outdir.mkdir(parents=True, exist_ok=True)

    print(f"[1/4] Analisando código em {root} ...")
    aud = Auditor(root, a.incluir_lib)
    aud.run()

    logs_dir = Path(a.logs) if a.logs else root / "logs"
    la = None
    if logs_dir.is_dir():
        print(f"[2/4] Lendo logs em {logs_dir} ...")
        la = LogAnalyzer(aud, logs_dir)
        la.run()
        la.to_findings()
    else:
        print("[2/4] Pasta de logs não encontrada (use --logs) — pulando.")

    print("[3/4] Montando relatórios ...")
    assign_ids(aud.findings)
    md = build_markdown(aud, la, aud.findings)
    (outdir / "relatorio_auditoria.md").write_text(md, encoding="utf-8")
    (outdir / "relatorio_auditoria.json").write_text(
        json.dumps([asdict(f) for f in aud.findings], ensure_ascii=False, indent=2), encoding="utf-8")
    (outdir / "prompt_para_ia.md").write_text(build_prompt(compact_findings(aud.findings), aud), encoding="utf-8")

    sev = Counter(f.severidade for f in aud.findings)
    print("[4/4] Pronto.\n")
    print("RESUMO:", "  ".join(f"{s}={sev.get(s, 0)}" for s in SEV_ORDER), f"| total={len(aud.findings)}")
    for f in aud.findings:
        if f.severidade in ("CRITICO", "ALTO"):
            print(f"  [{f.id}] {f.severidade:7} {f.arquivo}:{f.linha}  {f.titulo[:90]}")
    print(f"\nArquivos gerados em: {outdir}")
    print("  - relatorio_auditoria.md   (para você e para o Relatório da atividade)")
    print("  - relatorio_auditoria.json (para a IA/scripts)")
    print("  - prompt_para_ia.md        (cole na IA e anexe os arquivos citados)")


if __name__ == "__main__":
    main()
