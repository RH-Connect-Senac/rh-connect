"""Testes da variedade das perguntas (Entrega 2): prompt, angulos e temperatura.

Nenhum teste chama a Groq: o prompt e construido localmente e
`_execute_with_rate_limit_fallback` e substituido por um dublê.
"""

from __future__ import annotations

import json
from types import SimpleNamespace

import groq_service
from groq_service import _QUESTION_ANGLES, _QUESTIONS_TEMPERATURE, GroqService
from schemas import QUESTION_TYPES

CONTEXT = {
    "title": "Vaga de Teste",
    "summary": "Vaga ficticia",
    "activities": ["Atividade A"],
    "requirements": ["Requisito A"],
}

VALID_QUESTIONS = json.dumps(
    {
        "questions": [
            {"id": i, "type": t, "text": f"Pergunta {i}?"}
            for i, t in enumerate(QUESTION_TYPES, start=1)
        ]
    }
)


def test_prompt_inclui_um_angulo_por_pergunta_e_mantem_a_estrutura():
    prompt = GroqService()._build_questions_prompt(CONTEXT)

    for index in range(1, 6):
        assert f"- Pergunta {index}: " in prompt
    assert "Gere exatamente 5 perguntas." in prompt
    assert "A pergunta 5 deve ser Carreira." in prompt
    assert "Nao invente tecnologias" in prompt
    assert "Variedade das perguntas" in prompt


def test_angulos_pertencem_ao_tipo_de_cada_pergunta_e_nao_repetem_no_mesmo_tipo():
    for _ in range(50):
        angles = groq_service._pick_question_angles()
        assert len(angles) == len(QUESTION_TYPES)
        for angle, question_type in zip(angles, QUESTION_TYPES):
            assert angle in _QUESTION_ANGLES[question_type]
        assert angles[0] != angles[1]
        assert angles[2] != angles[3]


def test_geracoes_diferentes_produzem_prompts_diferentes():
    prompts = {GroqService()._build_questions_prompt(CONTEXT) for _ in range(30)}
    assert len(prompts) > 1


def test_generate_questions_usa_temperatura_moderada(monkeypatch):
    captured: list[dict] = []

    class _Completions:
        def create(self, **kwargs):
            captured.append(kwargs)
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=VALID_QUESTIONS))])

    client = SimpleNamespace(chat=SimpleNamespace(completions=_Completions()))
    monkeypatch.setenv("GROQ_MODEL", "fake-model")
    monkeypatch.setattr(
        GroqService,
        "_execute_with_rate_limit_fallback",
        lambda self, call_groq, **kwargs: call_groq(client),
    )

    questions = GroqService().generate_questions(CONTEXT)

    assert [q["type"] for q in questions] == list(QUESTION_TYPES)
    assert captured[0]["temperature"] == _QUESTIONS_TEMPERATURE == 0.7
    assert captured[0]["response_format"] == {"type": "json_object"}
