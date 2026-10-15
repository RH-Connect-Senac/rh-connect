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


def test_avaliacao_pede_limite_de_tokens_maior_que_o_padrao_da_groq(monkeypatch):
    import json
    from types import SimpleNamespace

    from groq_service import _EVALUATION_MAX_TOKENS

    answers = [
        {"questionId": 1, "questionText": "P1?", "answer": "Resposta detalhada o bastante para a pergunta."}
    ]
    payload = {
        "scores": {c: 7 for c in EVALUATION_CRITERIA},
        "strengths": [], "improvements": [], "recommendations": [], "summary": "ok",
        "questionsEvaluation": [{"questionId": 1, "score": 7, "reason": "r"}],
    }
    captured: list[dict] = []

    class _Completions:
        def create(self, **kwargs):
            captured.append(kwargs)
            message = SimpleNamespace(content=json.dumps(payload))
            return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    client = SimpleNamespace(chat=SimpleNamespace(completions=_Completions()))
    monkeypatch.setenv("GROQ_MODEL", "fake-model")
    monkeypatch.setattr(
        GroqService,
        "_execute_with_rate_limit_fallback",
        lambda self, call_groq, **kwargs: call_groq(client),
    )

    GroqService().evaluate_interview(CONTEXT, answers)

    assert _EVALUATION_MAX_TOKENS >= 8192
    assert captured[0]["max_tokens"] == _EVALUATION_MAX_TOKENS
    assert captured[0]["temperature"] == 0.2


def test_prompt_calibra_pelo_nivel_da_vaga_sem_premiar_texto_generico():
    prompt = _prompt()
    assert "Seja proporcional ao nivel da vaga" in prompt
    assert "recebe 5 ou 6" in prompt
    # o filtro de relevancia continua valendo
    assert "Avalie o conteudo, nao o tamanho nem a formalidade" in prompt


def test_escala_inteira_brevidade_e_variacao_entre_perguntas():
    prompt = _prompt()
    assert "10 = desempenho completo e sem lacunas relevantes" in prompt
    assert "merece 9 ou 10" in prompt
    assert "Brevidade nao e defeito por si so" in prompt
    assert "resposta curta, correta e objetiva vale mais que resposta curta, vaga ou errada" in prompt
    assert "as notas por pergunta devem variar" in prompt
    assert "reduz a nota de forma proporcional" in prompt


def test_teto_da_escala_nao_penaliza_o_que_a_pergunta_nao_pediu():
    prompt = _prompt()
    assert "10: completa e correta para o nivel da vaga, sem lacunas relevantes." in prompt
    assert "Nao desconte nota por itens que a pergunta nao pediu" in prompt
    assert "a nota e 9 ou 10" in prompt
