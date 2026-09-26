# QA de observabilidade (branch work/groq-avaliacao-502): este projeto ainda
# não tinha nenhuma infraestrutura de testes Python (sem pytest, sem pasta
# tests/). Este conftest.py é o mínimo necessário para permitir que os testes
# em tests/ importem os módulos deste diretório (app.py, groq_service.py)
# sem precisar transformar o serviço num pacote instalável.
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
