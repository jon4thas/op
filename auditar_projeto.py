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