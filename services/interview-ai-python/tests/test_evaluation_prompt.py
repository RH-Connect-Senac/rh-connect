"""Testes do prompt de avaliacao (Entrega 3): rubrica, relevancia e tom.

Nada aqui chama a Groq; so o texto do prompt e o contrato de saida sao
verificados. A media dos 7 criterios e os tetos continuam no Python.
"""

from __future__ import annotations

from groq_service import GroqService
from schemas import EVALUATION_CRITERIA

CONTEXT = {"title": "Vaga de Teste", "requirements": ["Requisito A"]}
ANSWERS = [
    {"questionId": 7, "questionText": "P1?", "questionType": "Tecnica", "answer": "Resposta."},
    {"questionId": 9, "questionText": "P2?", "questionType": "Comportamental", "answer": "Resposta."},
]


def _prompt() -> str:
    return GroqService()._build_evaluation_prompt(CONTEXT, ANSWERS)


def test_rubrica_tem_ancora_para_cada_criterio():
    section = _prompt().split("Ancoras por criterio", 1)[1].split("Regras de conteudo", 1)[0]
    for criterion in EVALUATION_CRITERIA:
        assert f"- {criterion}:" in section


def test_regras_de_relevancia_e_tom_estao_presentes():
    prompt = _prompt()
    assert "Avalie o conteudo, nao o tamanho nem a formalidade" in prompt
    assert "Tom do feedback" in prompt
    assert "Nao invente elogios" in prompt
    assert "sem exigir nomes de ferramentas" in prompt


def test_prompt_informa_quantidade_e_ids_esperados():
    prompt = _prompt()
    assert "Foram recebidas 2 respostas" in prompt
    assert "[7, 9]" in prompt


def test_contrato_de_saida_e_a_media_continuam_no_sistema():
    prompt = _prompt()
    assert "Nao inclua overallScore; ele sera calculado pelo sistema." in prompt
    assert '"scores": {' in prompt and '"questionsEvaluation": [' in prompt
    assert "Retorne exatamente os 7 criterios oficiais em scores." in prompt


def test_prompt_nao_pede_para_citar_trechos_e_proibe_aspas_duplas():
    # Pedir para citar trechos da resposta coincidiu com erros 400
    # json_validate_failed na Groq; a regra foi removida para teste.
    prompt = _prompt()
    assert "cite um fato ou trecho" not in prompt
    assert "nao use aspas duplas (use aspas simples)" in prompt
