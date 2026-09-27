"""Configuracao minima do pytest para os testes do Bloco 1 (parse de API keys).

Criado do zero nesta rodada, especificamente para a branch
work/groq-roteamento-chaves. Nao foi copiado nem faz cherry-pick de nenhum
arquivo criado em outra branch (ex.: work/groq-avaliacao-502) - conteudo
minimo, restrito a permitir `import groq_service` a partir de tests/.
"""

from __future__ import annotations

import sys
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent.parent
if str(SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(SERVICE_DIR))
