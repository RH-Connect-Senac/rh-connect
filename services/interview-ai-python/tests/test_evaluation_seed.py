"""Testes do experimento de seed na avaliacao (GROQ_EVALUATION_SEED)."""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from groq_service import GroqService
from schemas import EVALUATION_CRITERIA

CONTEXT = {"title": "Vaga de Teste"}
ANSWERS = [{"questionId": 1, "questionText": "P1?", "answer": "Resposta detalhada para a pergunta."}]
PAYLOAD = {
    "scores": {c: 7 for c in EVALUATION_CRITERIA},
    "strengths": [], "improvements": [], "recommendations": [], "summary": "ok",
    "questionsEvaluation": [{"questionId": 1, "score": 7, "reason": "r"}],
}


def _run(monkeypatch) -> dict:
    captured: list[dict] = []

    class _Completions:
        def create(self, **kwargs):
            captured.append(kwargs)
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(PAYLOAD)))])

    client = SimpleNamespace(chat=SimpleNamespace(completions=_Completions()))
    monkeypatch.setenv("GROQ_MODEL", "fake-model")
    monkeypatch.setattr(
        GroqService, "_execute_with_rate_limit_fallback", lambda self, call_groq, **kw: call_groq(client)
    )
    GroqService().evaluate_interview(CONTEXT, ANSWERS)
    return captured[0]


def test_sem_variavel_nao_envia_seed(monkeypatch):
    monkeypatch.delenv("GROQ_EVALUATION_SEED", raising=False)
    assert "seed" not in _run(monkeypatch)


def test_com_variavel_envia_seed_inteira(monkeypatch):
    monkeypatch.setenv("GROQ_EVALUATION_SEED", "42")
    assert _run(monkeypatch)["seed"] == 42


@pytest.mark.parametrize("raw", ["abc", "4.2", "  "])
def test_valor_invalido_e_ignorado(monkeypatch, raw):
    monkeypatch.setenv("GROQ_EVALUATION_SEED", raw)
    assert "seed" not in _run(monkeypatch)


def test_retry_estrutural_usa_seed_diferente_na_segunda_tentativa(monkeypatch):
    incomplete = {**PAYLOAD, "questionsEvaluation": []}
    outputs = [json.dumps(incomplete), json.dumps(PAYLOAD)]
    seeds: list[int] = []

    class _Completions:
        def create(self, **kwargs):
            seeds.append(kwargs["seed"])
            content = outputs[len(seeds) - 1]
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

    client = SimpleNamespace(chat=SimpleNamespace(completions=_Completions()))
    monkeypatch.setenv("GROQ_MODEL", "fake-model")
    monkeypatch.setenv("GROQ_EVALUATION_SEED", "42")
    monkeypatch.setattr(
        GroqService, "_execute_with_rate_limit_fallback", lambda self, call_groq, **kw: call_groq(client)
    )

    GroqService().evaluate_interview(CONTEXT, ANSWERS)

    assert seeds == [42, 43]
