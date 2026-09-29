"""Tests for strict Structured Outputs in interview evaluation."""

from __future__ import annotations

import json
import logging

import pytest

import groq_service
from groq_service import (
    GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION,
    EVALUATION_CRITERIA,
    GroqService,
    GroqServiceError,
)


@pytest.fixture
def reset_key_pool():
    groq_service._reset_key_pool_for_tests()
    yield
    groq_service._reset_key_pool_for_tests()


@pytest.fixture
def valid_context():
    return {"title": "Vaga de Teste - Structured Outputs"}


@pytest.fixture
def valid_answers():
    return [
        {
            "questionId": 1,
            "questionText": "Pergunta 1?",
            "answer": "Resposta detalhada o suficiente para a pergunta 1.",
        },
        {
            "questionId": 2,
            "questionText": "Pergunta 2?",
            "answer": "Resposta detalhada o suficiente para a pergunta 2.",
        },
    ]


def _evaluation_json(items: list[dict]) -> str:
    return json.dumps(
        {
            "scores": {
                "Clareza": 8,
                "Coerência": 8,
                "Objetividade": 8,
                "Domínio": 8,
                "Organização": 8,
                "Aderência": 8,
                "Exemplos": 8,
            },
            "strengths": ["Boa comunicacao"],
            "improvements": ["Aprofundar exemplos"],
            "recommendations": ["Estudar mais sobre o tema"],
            "summary": "Resposta solida.",
            "questionsEvaluation": items,
        },
        ensure_ascii=False,
    )


VALID_QUESTIONS_EVALUATION = [
    {
        "questionId": 1,
        "score": 8,
        "reason": "ok",
        "positives": ["clareza"],
        "improvements": ["profundidade"],
        "suggestion": "detalhar mais",
    },
    {
        "questionId": 2,
        "score": 7,
        "reason": "ok",
        "positives": ["organizacao"],
        "improvements": ["exemplos"],
        "suggestion": "trazer um exemplo concreto",
    },
]


class _FakeMessage:
    def __init__(self, content: str):
        self.content = content


class _FakeChoice:
    def __init__(self, content: str):
        self.message = _FakeMessage(content)


class _FakeSuccessCompletion:
    def __init__(self, content: str):
        self.choices = [_FakeChoice(content)]


class _FakeCompletions:
    def __init__(self, content: str):
        self.content = content
        self.calls: list[dict] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return _FakeSuccessCompletion(self.content)


class _FakeChat:
    def __init__(self, completions: _FakeCompletions):
        self.completions = completions


class _FakeGroqClient:
    def __init__(self, completions: _FakeCompletions, **kwargs):
        self.chat = _FakeChat(completions)
        self.kwargs = kwargs


def _patch_groq(monkeypatch, *, content: str):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-20b")
    monkeypatch.setenv("GROQ_EVALUATION_RESPONSE_MODE", "strict")

    completions = _FakeCompletions(content)

    def _fake_groq(**kwargs):
        return _FakeGroqClient(completions, **kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)
    return completions


def _object_schemas(schema: dict):
    if isinstance(schema, dict):
        if schema.get("type") == "object":
            yield schema
        for value in schema.values():
            yield from _object_schemas(value)
    elif isinstance(schema, list):
        for item in schema:
            yield from _object_schemas(item)


def test_evaluate_interview_usa_json_schema_strict(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    completions = _patch_groq(
        monkeypatch,
        content=_evaluation_json(VALID_QUESTIONS_EVALUATION),
    )

    GroqService().evaluate_interview(valid_context, valid_answers)

    response_format = completions.calls[0]["response_format"]
    assert response_format["type"] == "json_schema"
    assert response_format["json_schema"]["name"] == "interview_evaluation"
    assert response_format["json_schema"]["strict"] is True


def test_evaluate_interview_default_preserva_modo_strict(
    monkeypatch,
):
    monkeypatch.delenv("GROQ_EVALUATION_RESPONSE_MODE", raising=False)

    response_format = groq_service._evaluation_response_format(
        [
            {"questionId": 1},
            {"questionId": 2},
        ]
    )
    assert response_format["type"] == "json_schema"
    assert response_format["json_schema"]["strict"] is True


def test_evaluate_interview_modo_schema_usa_mesmo_schema_com_strict_false(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    completions = _patch_groq(
        monkeypatch,
        content=_evaluation_json(VALID_QUESTIONS_EVALUATION),
    )
    monkeypatch.setenv("GROQ_EVALUATION_RESPONSE_MODE", "schema")

    GroqService().evaluate_interview(valid_context, valid_answers)

    response_format = completions.calls[0]["response_format"]
    assert response_format["type"] == "json_schema"
    assert response_format["json_schema"]["name"] == "interview_evaluation"
    assert response_format["json_schema"]["strict"] is False
    questions_evaluation_schema = response_format["json_schema"]["schema"]["properties"][
        "questionsEvaluation"
    ]
    assert questions_evaluation_schema["minItems"] == 2
    assert questions_evaluation_schema["maxItems"] == 2
    assert questions_evaluation_schema["items"]["properties"]["questionId"]["enum"] == [1, 2]


def test_evaluate_interview_modo_json_object_usa_json_object_e_parser_local(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    completions = _patch_groq(
        monkeypatch,
        content=_evaluation_json(VALID_QUESTIONS_EVALUATION),
    )
    monkeypatch.setenv("GROQ_EVALUATION_RESPONSE_MODE", "json_object")

    result = GroqService().evaluate_interview(valid_context, valid_answers)

    assert completions.calls[0]["response_format"] == {"type": "json_object"}
    assert [item["questionId"] for item in result["questionsEvaluation"]] == [1, 2]


def test_evaluate_interview_modo_invalido_volta_para_strict(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    completions = _patch_groq(
        monkeypatch,
        content=_evaluation_json(VALID_QUESTIONS_EVALUATION),
    )
    monkeypatch.setenv("GROQ_EVALUATION_RESPONSE_MODE", "valor-invalido")

    GroqService().evaluate_interview(valid_context, valid_answers)

    response_format = completions.calls[0]["response_format"]
    assert response_format["type"] == "json_schema"
    assert response_format["json_schema"]["strict"] is True


def test_evaluate_interview_loga_modo_sem_dados_sensiveis(
    monkeypatch, caplog, reset_key_pool, valid_context, valid_answers
):
    _patch_groq(
        monkeypatch,
        content=_evaluation_json(VALID_QUESTIONS_EVALUATION),
    )
    monkeypatch.setenv("GROQ_EVALUATION_RESPONSE_MODE", "schema")
    caplog.set_level(logging.INFO, logger="groq_service")

    GroqService().evaluate_interview(valid_context, valid_answers)

    log_text = caplog.text
    assert "evaluation_response_mode" in log_text
    assert "schema" in log_text
    assert "fake-key-A" not in log_text
    assert "Resposta detalhada" not in log_text
    assert "Pergunta 1" not in log_text
    assert "json_schema" not in log_text


def test_evaluation_schema_define_required_e_additional_properties_false(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    completions = _patch_groq(
        monkeypatch,
        content=_evaluation_json(VALID_QUESTIONS_EVALUATION),
    )

    GroqService().evaluate_interview(valid_context, valid_answers)

    schema = completions.calls[0]["response_format"]["json_schema"]["schema"]
    assert schema["required"] == [
        "scores",
        "strengths",
        "improvements",
        "recommendations",
        "summary",
        "questionsEvaluation",
    ]
    for object_schema in _object_schemas(schema):
        assert object_schema["additionalProperties"] is False

    scores_schema = schema["properties"]["scores"]
    assert scores_schema["required"] == list(EVALUATION_CRITERIA)
    question_item_schema = schema["properties"]["questionsEvaluation"]["items"]
    assert question_item_schema["required"] == [
        "questionId",
        "score",
        "reason",
        "positives",
        "improvements",
        "suggestion",
    ]


def test_questions_evaluation_schema_aceita_estrutura_esperada(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    completions = _patch_groq(
        monkeypatch,
        content=_evaluation_json(VALID_QUESTIONS_EVALUATION),
    )

    result = GroqService().evaluate_interview(valid_context, valid_answers)

    question_item_schema = completions.calls[0]["response_format"]["json_schema"]["schema"][
        "properties"
    ]["questionsEvaluation"]["items"]
    questions_evaluation_schema = completions.calls[0]["response_format"]["json_schema"]["schema"][
        "properties"
    ]["questionsEvaluation"]
    assert questions_evaluation_schema["minItems"] == 2
    assert questions_evaluation_schema["maxItems"] == 2
    assert question_item_schema["properties"]["questionId"]["type"] == "integer"
    assert question_item_schema["properties"]["questionId"]["enum"] == [1, 2]
    assert question_item_schema["properties"]["score"]["type"] == "number"
    assert question_item_schema["properties"]["positives"]["items"]["type"] == "string"
    assert [item["questionId"] for item in result["questionsEvaluation"]] == [1, 2]


def test_questions_evaluation_schema_para_cinco_respostas_define_cardinalidade_e_enum(
    monkeypatch, reset_key_pool, valid_context
):
    answers = [
        {
            "questionId": question_id,
            "questionText": f"Pergunta {question_id}?",
            "answer": f"Resposta detalhada o suficiente para a pergunta {question_id}.",
        }
        for question_id in [1, 2, 3, 4, 5]
    ]
    questions_evaluation = [
        {**VALID_QUESTIONS_EVALUATION[0], "questionId": question_id}
        for question_id in [1, 2, 3, 4, 5]
    ]
    completions = _patch_groq(
        monkeypatch,
        content=_evaluation_json(questions_evaluation),
    )

    GroqService().evaluate_interview(valid_context, answers)

    questions_evaluation_schema = completions.calls[0]["response_format"]["json_schema"]["schema"][
        "properties"
    ]["questionsEvaluation"]
    question_id_schema = questions_evaluation_schema["items"]["properties"]["questionId"]

    assert questions_evaluation_schema["minItems"] == 5
    assert questions_evaluation_schema["maxItems"] == 5
    assert question_id_schema["enum"] == [1, 2, 3, 4, 5]


def test_questions_evaluation_schema_e_dinamico_para_quantidade_diferente_de_cinco(
    monkeypatch, reset_key_pool, valid_context
):
    answers = [
        {
            "questionId": 10,
            "questionText": "Pergunta 10?",
            "answer": "Resposta detalhada o suficiente para a pergunta 10.",
        },
        {
            "questionId": 20,
            "questionText": "Pergunta 20?",
            "answer": "Resposta detalhada o suficiente para a pergunta 20.",
        },
        {
            "questionId": 30,
            "questionText": "Pergunta 30?",
            "answer": "Resposta detalhada o suficiente para a pergunta 30.",
        },
    ]
    questions_evaluation = [
        {**VALID_QUESTIONS_EVALUATION[0], "questionId": 10},
        {**VALID_QUESTIONS_EVALUATION[0], "questionId": 20},
        {**VALID_QUESTIONS_EVALUATION[0], "questionId": 30},
    ]
    completions = _patch_groq(
        monkeypatch,
        content=_evaluation_json(questions_evaluation),
    )

    GroqService().evaluate_interview(valid_context, answers)

    questions_evaluation_schema = completions.calls[0]["response_format"]["json_schema"]["schema"][
        "properties"
    ]["questionsEvaluation"]
    question_id_schema = questions_evaluation_schema["items"]["properties"]["questionId"]

    assert questions_evaluation_schema["minItems"] == 3
    assert questions_evaluation_schema["maxItems"] == 3
    assert question_id_schema["enum"] == [10, 20, 30]


def test_prompt_de_avaliacao_inclui_expected_question_ids_e_skeleton_completo(valid_context):
    answers = [
        {
            "questionId": question_id,
            "questionText": f"Pergunta {question_id}?",
            "answer": f"Resposta detalhada o suficiente para a pergunta {question_id}.",
        }
        for question_id in [1, 2, 3, 4, 5]
    ]

    prompt = GroqService()._build_evaluation_prompt(valid_context, answers)

    assert "expectedQuestionIds" in prompt
    assert "[1, 2, 3, 4, 5]" in prompt
    assert '"questionId": 1' in prompt
    assert '"questionId": 2' in prompt
    assert '"questionId": 3' in prompt
    assert '"questionId": 4' in prompt
    assert '"questionId": 5' in prompt
    assert "EXATAMENTE 5 itens" in prompt


def test_prompt_de_avaliacao_adapta_skeleton_para_quantidade_dinamica(valid_context):
    answers = [
        {
            "questionId": 10,
            "questionText": "Pergunta 10?",
            "answer": "Resposta detalhada o suficiente para a pergunta 10.",
        },
        {
            "questionId": 20,
            "questionText": "Pergunta 20?",
            "answer": "Resposta detalhada o suficiente para a pergunta 20.",
        },
        {
            "questionId": 30,
            "questionText": "Pergunta 30?",
            "answer": "Resposta detalhada o suficiente para a pergunta 30.",
        },
    ]

    prompt = GroqService()._build_evaluation_prompt(valid_context, answers)

    assert "[10, 20, 30]" in prompt
    assert '"questionId": 10' in prompt
    assert '"questionId": 20' in prompt
    assert '"questionId": 30' in prompt
    assert '"questionId": 1, "score": 0' not in prompt
    assert "EXATAMENTE 3 itens" in prompt


def test_parser_rejeita_item_faltante(valid_answers):
    incomplete = [VALID_QUESTIONS_EVALUATION[0]]

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService()._parse_evaluation_response(_evaluation_json(incomplete), valid_answers)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION
    assert str(exc_info.value) == "A Groq retornou avaliacao por pergunta incompleta."


def test_parser_rejeita_question_id_ausente(valid_answers):
    missing_question_id = [
        {key: value for key, value in VALID_QUESTIONS_EVALUATION[0].items() if key != "questionId"},
        VALID_QUESTIONS_EVALUATION[1],
    ]

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService()._parse_evaluation_response(
            _evaluation_json(missing_question_id),
            valid_answers,
        )

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION
    assert str(exc_info.value) == "A Groq retornou avaliacao sem questionId."


def test_parser_rejeita_question_id_duplicado(valid_answers):
    duplicated = [
        VALID_QUESTIONS_EVALUATION[0],
        {**VALID_QUESTIONS_EVALUATION[1], "questionId": 1},
    ]

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService()._parse_evaluation_response(_evaluation_json(duplicated), valid_answers)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION
    assert str(exc_info.value) == "A Groq retornou questionId duplicado na avaliacao."


def test_parser_rejeita_question_id_inesperado(valid_answers):
    unexpected = [
        VALID_QUESTIONS_EVALUATION[0],
        {**VALID_QUESTIONS_EVALUATION[1], "questionId": 999},
    ]

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService()._parse_evaluation_response(_evaluation_json(unexpected), valid_answers)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION
    assert str(exc_info.value) == "A Groq retornou questionId inesperado na avaliacao."
