"""Testes do retry estrutural de `evaluate_interview` (branch
fix/groq-avaliacao-retry-estrutural).

Cobre exclusivamente o novo comportamento: quando a Groq responde HTTP 200
mas `questionsEvaluation` vem estruturalmente incompleto/invalido (categoria
`GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION`), `evaluate_interview`
repete a operacao de avaliacao no maximo 1 vez.

Nao testa (e nao deveria, por design - ja coberto em outros arquivos deste
mesmo diretorio):
- o fallback/round-robin de credenciais por rate limit
  (`test_rate_limit_fallback.py`, `test_rate_limit_fallback_concurrency.py`);
- a classificacao de erro da Groq em categorias
  (`test_error_classification.py`);
- o logging sanitizado do caso "avaliacao por pergunta incompleta" em si
  (`test_groq_service_error_logging.py`, funcao
  `test_avaliacao_incompleta_loga_apenas_metadados_estruturais`).

Nenhum destes testes faz qualquer chamada real a Groq: usa o mesmo dublê de
`Groq`/`client.chat.completions.create` de `test_rate_limit_fallback.py`
(reimplementado aqui, sem importar aquele modulo de teste, para manter os
arquivos independentes), e so valores de key obviamente falsos.
"""

from __future__ import annotations

import pytest
from groq import BadRequestError, RateLimitError

import groq_service
from groq_service import (
    GROQ_ERROR_CATEGORY_OUTPUT_VALIDATION_FAILED,
    GROQ_ERROR_CATEGORY_RATE_LIMIT,
    GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION,
    GroqService,
    GroqServiceError,
)


@pytest.fixture
def reset_key_pool():
    """Isola o pool de keys do processo entre testes (uso exclusivo de teste)."""
    groq_service._reset_key_pool_for_tests()
    yield
    groq_service._reset_key_pool_for_tests()


@pytest.fixture
def valid_context():
    return {"title": "Vaga de Teste - Retry Estrutural"}


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


class _FakeGroqErrorResponse:
    def __init__(self, error_code: str):
        self._error_code = error_code

    def json(self):
        return {"error": {"code": self._error_code}}


def _make_fake_api_status_error(
    cls: type,
    *,
    message: str = "Erro simulado da Groq.",
    status_code: int | None = None,
    error_code: str | None = None,
):
    """Constroi uma instancia minima de uma subclasse de `APIStatusError` sem
    chamar seu `__init__` real e sem nenhuma chamada de rede (mesmo padrao de
    `test_rate_limit_fallback.py`)."""
    exc = cls.__new__(cls)
    exc.args = (message,)
    exc.message = message
    exc.status_code = status_code if status_code is not None else getattr(cls, "status_code", 500)
    exc.response = _FakeGroqErrorResponse(error_code) if error_code else None
    exc.body = None
    exc.request = None
    return exc


def _evaluation_json(items: list[dict]) -> str:
    import json as _json

    return _json.dumps(
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

# Estruturalmente incompleto: falta a avaliacao da pergunta 2 (categoria
# GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION, status 502).
INCOMPLETE_QUESTIONS_EVALUATION = [VALID_QUESTIONS_EVALUATION[0]]

SUCCESS_EVALUATION_JSON = _evaluation_json(VALID_QUESTIONS_EVALUATION)
INCOMPLETE_EVALUATION_JSON = _evaluation_json(INCOMPLETE_QUESTIONS_EVALUATION)

# Nao-estrutural: JSON sintaticamente invalido (falha em `json.loads`, sem
# `category` nenhuma - GroqServiceError generico, 502).
INVALID_JSON_RESPONSE = "isto nao e um JSON valido"


class _FakeMessage:
    def __init__(self, content: str):
        self.content = content


class _FakeChoice:
    def __init__(self, content: str):
        self.message = _FakeMessage(content)


class _FakeSuccessCompletion:
    def __init__(self, content: str = "{}"):
        self.choices = [_FakeChoice(content)]


class _FakeCompletions:
    """Dublê de `client.chat.completions`: para cada chamada de `create()`,
    consome o proximo item de `outcomes` (uma excecao a levantar, ou uma
    string JSON de "resposta HTTP 200 da Groq" a devolver)."""

    def __init__(self, outcomes: list):
        self._outcomes = list(outcomes)
        self.call_count = 0
        self.calls: list[dict] = []

    def create(self, **kwargs):
        self.call_count += 1
        self.calls.append(kwargs)
        if self.call_count > len(self._outcomes):
            raise AssertionError(
                f"create() chamado {self.call_count} vezes, mas so havia "
                f"{len(self._outcomes)} resultado(s) programado(s) - "
                "possivel retry alem do limite estrutural (no maximo 1)."
            )
        outcome = self._outcomes[self.call_count - 1]
        if isinstance(outcome, BaseException):
            raise outcome
        return _FakeSuccessCompletion(outcome)


class _FakeChat:
    def __init__(self, completions: _FakeCompletions):
        self.completions = completions


class _FakeGroqClient:
    def __init__(self, completions: _FakeCompletions, api_key: str, **kwargs):
        self.chat = _FakeChat(completions)
        self.api_key = api_key
        self.kwargs = kwargs


def _patch_groq(monkeypatch, *, keys: str, outcomes: list):
    monkeypatch.setenv("GROQ_API_KEYS", keys)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "fake-model-retry-estrutural")

    completions = _FakeCompletions(outcomes)
    used_api_keys: list[str] = []

    def _fake_groq(*, api_key: str, **kwargs):
        used_api_keys.append(api_key)
        return _FakeGroqClient(completions, api_key=api_key, **kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)
    return completions, used_api_keys


# ---------------------------------------------------------------------------
# Caso 1: valida na primeira tentativa -> sem retry
# ---------------------------------------------------------------------------

def test_avaliacao_valida_na_primeira_tentativa_nao_faz_retry(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    completions, used_api_keys = _patch_groq(
        monkeypatch, keys="fake-key-A", outcomes=[SUCCESS_EVALUATION_JSON]
    )

    result = GroqService().evaluate_interview(valid_context, valid_answers)

    assert completions.call_count == 1
    assert used_api_keys == ["fake-key-A"]
    assert [item["questionId"] for item in result["questionsEvaluation"]] == [1, 2]


# ---------------------------------------------------------------------------
# Caso 2: invalida (estrutural) -> valida -> exatamente 1 retry, sucesso
# ---------------------------------------------------------------------------

def test_avaliacao_incompleta_depois_valida_repete_exatamente_uma_vez(
    monkeypatch, reset_key_pool, valid_context, valid_answers, caplog
):
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A",
        outcomes=[INCOMPLETE_EVALUATION_JSON, SUCCESS_EVALUATION_JSON],
    )

    with caplog.at_level("INFO"):
        result = GroqService().evaluate_interview(valid_context, valid_answers)

    assert completions.call_count == 2
    # Mesma (unica) credencial usada nas duas tentativas - a estrutural
    # incompleta NAO marca a credencial como falha nem avanca o round-robin
    # de forma diferente do normal.
    assert used_api_keys == ["fake-key-A", "fake-key-A"]
    assert [item["questionId"] for item in result["questionsEvaluation"]] == [1, 2]
    attempt_logs = [
        record.getMessage()
        for record in caplog.records
        if "tentativa estrutural de avaliacao finalizada" in record.getMessage()
    ]
    assert len(attempt_logs) == 2
    assert "'structural_attempt': 1" in attempt_logs[0]
    assert "'structural_retry_triggered': True" in attempt_logs[0]
    assert "'sdk_attempt_count': 1" in attempt_logs[0]
    assert "'rate_limit_count': 0" in attempt_logs[0]
    assert "'structural_attempt': 2" in attempt_logs[1]
    assert "'structural_retry_triggered': False" in attempt_logs[1]
    assert "'sdk_attempt_count': 1" in attempt_logs[1]
    sdk_success_records = [
        record
        for record in caplog.records
        if "tentativa SDK concluida com sucesso" in record.getMessage()
    ]
    assert len(sdk_success_records) == 2
    assert [record.structural_attempt for record in sdk_success_records] == [1, 2]
    assert [record.credential_slot for record in sdk_success_records] == [1, 1]
    for record in sdk_success_records:
        assert "credential_slot" in record.getMessage()
        assert "'credential_slot': 1" in record.getMessage()
        assert "fake-key-A" not in record.getMessage()
    first_messages = completions.calls[0]["messages"]
    retry_messages = completions.calls[1]["messages"]
    assert len(first_messages) == 2
    assert len(retry_messages) == 3
    retry_message = retry_messages[2]["content"]
    assert '"expectedQuestionIds": [1, 2]' in retry_message
    assert '"returnedQuestionIds": [1]' in retry_message
    assert '"missingQuestionIds": [2]' in retry_message
    assert "Resposta detalhada" not in retry_message
    assert "Boa comunicacao" not in retry_message


# ---------------------------------------------------------------------------
# Caso 3: invalida (estrutural) duas vezes -> mantem o erro 502 atual
# ---------------------------------------------------------------------------

def test_avaliacao_incompleta_duas_vezes_mantem_erro_502_sem_terceira_tentativa(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A",
        outcomes=[INCOMPLETE_EVALUATION_JSON, INCOMPLETE_EVALUATION_JSON],
    )

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().evaluate_interview(valid_context, valid_answers)

    assert exc_info.value.status_code == 502
    assert exc_info.value.category == GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION
    assert str(exc_info.value) == "A Groq retornou avaliacao por pergunta incompleta."
    # Exatamente 2 tentativas (1a + 1 retry) - a terceira chamada faria o
    # dublê levantar AssertionError sozinho (ver _FakeCompletions.create).
    assert completions.call_count == 2
    assert used_api_keys == ["fake-key-A", "fake-key-A"]


def test_json_validate_failed_depois_valida_repete_exatamente_uma_vez(
    monkeypatch, reset_key_pool, valid_context, valid_answers, caplog
):
    exc = _make_fake_api_status_error(
        BadRequestError,
        status_code=400,
        error_code="json_validate_failed",
    )
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A",
        outcomes=[exc, SUCCESS_EVALUATION_JSON],
    )

    with caplog.at_level("INFO"):
        result = GroqService().evaluate_interview(valid_context, valid_answers)

    assert completions.call_count == 2
    assert used_api_keys == ["fake-key-A", "fake-key-A"]
    assert [item["questionId"] for item in result["questionsEvaluation"]] == [1, 2]
    retry_messages = completions.calls[1]["messages"]
    assert len(retry_messages) == 3
    retry_message = retry_messages[2]["content"]
    assert "validacao JSON do provedor" in retry_message
    assert "Resposta detalhada" not in retry_message
    assert "Boa comunicacao" not in retry_message

    attempt_logs = [
        record.getMessage()
        for record in caplog.records
        if "tentativa estrutural de avaliacao finalizada" in record.getMessage()
    ]
    assert len(attempt_logs) == 2
    assert "'error_category': 'output_validation_failed'" in attempt_logs[0]
    assert "'structural_retry_triggered': True" in attempt_logs[0]
    assert "'structural_attempt': 2" in attempt_logs[1]


def test_json_validate_failed_duas_vezes_mantem_erro_502_sem_terceira_tentativa(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    outcomes = [
        _make_fake_api_status_error(
            BadRequestError,
            status_code=400,
            error_code="json_validate_failed",
        ),
        _make_fake_api_status_error(
            BadRequestError,
            status_code=400,
            error_code="json_validate_failed",
        ),
    ]
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A",
        outcomes=outcomes,
    )

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().evaluate_interview(valid_context, valid_answers)

    assert exc_info.value.status_code == 502
    assert exc_info.value.category == GROQ_ERROR_CATEGORY_OUTPUT_VALIDATION_FAILED
    assert completions.call_count == 2
    assert used_api_keys == ["fake-key-A", "fake-key-A"]


def test_avaliacao_incompleta_depois_json_validate_failed_nao_faz_terceira_tentativa(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    exc = _make_fake_api_status_error(
        BadRequestError,
        status_code=400,
        error_code="json_validate_failed",
    )
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A",
        outcomes=[INCOMPLETE_EVALUATION_JSON, exc],
    )

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().evaluate_interview(valid_context, valid_answers)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_OUTPUT_VALIDATION_FAILED
    assert completions.call_count == 2
    assert used_api_keys == ["fake-key-A", "fake-key-A"]


def test_json_validate_failed_depois_avaliacao_incompleta_nao_faz_terceira_tentativa(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    exc = _make_fake_api_status_error(
        BadRequestError,
        status_code=400,
        error_code="json_validate_failed",
    )
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A",
        outcomes=[exc, INCOMPLETE_EVALUATION_JSON],
    )

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().evaluate_interview(valid_context, valid_answers)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION
    assert completions.call_count == 2
    assert used_api_keys == ["fake-key-A", "fake-key-A"]


# ---------------------------------------------------------------------------
# Caso 4: 429 continua exclusivamente no fallback/rotacao de credenciais
# existente - retry estrutural nao interfere nem soma tentativas extras.
# ---------------------------------------------------------------------------

def test_429_continua_no_fallback_existente_sem_retry_estrutural_extra(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    # Uma unica credencial distinta: `_execute_with_rate_limit_fallback` faz
    # exatamente 1 tentativa e esgota (comportamento existente, inalterado)
    # - o loop de retry estrutural nem chega a ser avaliado, porque a
    # excecao rate_limit sobe de dentro de `_execute_with_rate_limit_fallback`,
    # fora do `try/except` que so cobre `_parse_evaluation_response`.
    exc = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(monkeypatch, keys="fake-key-A", outcomes=[exc])

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().evaluate_interview(valid_context, valid_answers)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_RATE_LIMIT
    assert completions.call_count == 1
    assert used_api_keys == ["fake-key-A"]


def test_429_com_multiplas_keys_usa_fallback_normal_ate_sucesso(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    # Reforco: com 2 credenciais, um 429 na primeira usa a rotacao existente
    # (troca de credencial), NAO o retry estrutural - resultado em exatamente
    # 2 chamadas (1 fallback de rate limit), nao 3 (que seria o caso se o
    # retry estrutural tivesse, por engano, tratado o 429 como estrutural).
    exc = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc, SUCCESS_EVALUATION_JSON],
    )

    result = GroqService().evaluate_interview(valid_context, valid_answers)

    assert completions.call_count == 2
    assert used_api_keys == ["fake-key-A", "fake-key-B"]
    assert [item["questionId"] for item in result["questionsEvaluation"]] == [1, 2]


def test_retry_estrutural_respeita_cooldown_de_key_limitada(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    monkeypatch.setattr("key_pool.time.monotonic", lambda: 100.0)
    exc = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc, INCOMPLETE_EVALUATION_JSON, SUCCESS_EVALUATION_JSON],
    )

    result = GroqService().evaluate_interview(valid_context, valid_answers)

    assert completions.call_count == 3
    assert used_api_keys == ["fake-key-A", "fake-key-B", "fake-key-B"]
    assert [item["questionId"] for item in result["questionsEvaluation"]] == [1, 2]


# ---------------------------------------------------------------------------
# Caso 5: erro nao-estrutural (JSON invalido) -> sem retry indevido
# ---------------------------------------------------------------------------

def test_json_invalido_nao_ganha_retry_estrutural(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    completions, used_api_keys = _patch_groq(
        monkeypatch, keys="fake-key-A", outcomes=[INVALID_JSON_RESPONSE]
    )

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().evaluate_interview(valid_context, valid_answers)

    assert exc_info.value.status_code == 502
    assert exc_info.value.category is None
    assert str(exc_info.value) == "A Groq retornou JSON invalido."
    # Exatamente 1 tentativa - JSON invalido nao e a categoria estrutural
    # que dispara retry.
    assert completions.call_count == 1
    assert used_api_keys == ["fake-key-A"]


def test_scores_incompletos_nao_ganha_retry_estrutural(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    # `scores` incompleto tambem e um GroqServiceError sem `category`
    # (levantado direto em `_normalize_scores`, nao em
    # `_normalize_questions_evaluation`) - nao deve ganhar retry, mesmo
    # sendo, em certo sentido, outra forma de "resposta estruturalmente
    # incompleta". O escopo desta tarefa e exclusivamente
    # `questionsEvaluation`.
    import json as _json

    missing_scores_json = _json.dumps(
        {
            "scores": {"Clareza": 8},  # faltam os outros 6 criterios
            "strengths": [],
            "improvements": [],
            "recommendations": [],
            "summary": "",
            "questionsEvaluation": VALID_QUESTIONS_EVALUATION,
        },
        ensure_ascii=False,
    )

    completions, used_api_keys = _patch_groq(
        monkeypatch, keys="fake-key-A", outcomes=[missing_scores_json]
    )

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().evaluate_interview(valid_context, valid_answers)

    assert exc_info.value.status_code == 502
    assert exc_info.value.category is None
    assert str(exc_info.value) == "A Groq retornou criterios incompletos."
    assert completions.call_count == 1
    assert used_api_keys == ["fake-key-A"]
