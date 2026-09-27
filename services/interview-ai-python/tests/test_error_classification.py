"""Testes do Bloco 4: classificacao controlada dos erros da Groq.

Cobre exclusivamente `_translate_groq_error` (groq_service.py) e o uso
dessa classificacao dentro de `generate_questions()`/`evaluate_interview()`.

Escopo explicito deste bloco (branch work/groq-roteamento-chaves):
- NAO testa fallback para outra key, retry manual, sleep/backoff ou
  qualquer coordenacao entre keys - nada disso foi implementado nesta
  rodada. `RateLimitError` (429) e identificado, mas nao troca de key
  (isso fica para o Bloco 5).
- NAO testa mudanca no parser de keys, no pool ou no round-robin - so a
  classificacao de erro e a integracao dela com `_client()` sao exercidas
  (usando o pool real, com uma unica key fake, para provar que so existe
  UMA tentativa de chamada a Groq por operacao).
- NAO instancia nem chama a SDK Groq de verdade: nenhum teste faz request
  HTTP. As excecoes da SDK sao construidas com objetos minimos/fakes
  (via `__new__`, sem chamar o `__init__` real, que exigiria um
  `httpx.Request`/`httpx.Response` de verdade) e o cliente `Groq` e
  substituido por um dublê local.
- Usa somente valores de chave obviamente falsos (ex.: "fake-key-A").
"""

from __future__ import annotations

import pytest
from groq import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    InternalServerError,
    PermissionDeniedError,
    RateLimitError,
)

import groq_service
from groq_service import (
    GROQ_ERROR_CATEGORY_API_STATUS_ERROR,
    GROQ_ERROR_CATEGORY_AUTHENTICATION,
    GROQ_ERROR_CATEGORY_BAD_REQUEST,
    GROQ_ERROR_CATEGORY_CONNECTION_ERROR,
    GROQ_ERROR_CATEGORY_PERMISSION_DENIED,
    GROQ_ERROR_CATEGORY_RATE_LIMIT,
    GROQ_ERROR_CATEGORY_TIMEOUT,
    GROQ_ERROR_CATEGORY_UPSTREAM_SERVER_ERROR,
    GroqService,
    GroqServiceError,
    _translate_groq_error,
)

FAKE_KEY = "fake-key-error-classification"
FAKE_MODEL = "fake-model-error-classification"

# Marcador obviamente falso usado para checar vazamento em mensagens - nunca
# uma key real, e distinto de FAKE_KEY para nao colidir com asserts.
FAKE_KEY_MARKER = "fake-key-que-nunca-deve-aparecer-em-mensagem"


@pytest.fixture
def reset_key_pool():
    """Isola o pool de keys do processo entre testes (uso exclusivo de teste)."""
    groq_service._reset_key_pool_for_tests()
    yield
    groq_service._reset_key_pool_for_tests()


@pytest.fixture
def valid_context():
    return {"title": "Vaga de Teste - Bloco 4"}


@pytest.fixture
def valid_answers():
    return [
        {
            "questionId": 1,
            "questionText": "Pergunta de teste?",
            "answer": "Resposta de teste.",
        }
    ]


def _make_fake_api_status_error(cls: type, *, message: str = "Erro simulado da Groq.", status_code: int | None = None):
    """Constroi uma instancia minima de uma subclasse de `APIStatusError`
    sem chamar seu `__init__` real (que exige um `httpx.Response`/
    `httpx.Request` de verdade) e sem nenhuma chamada de rede - so o
    suficiente para exercitar o `isinstance` real usado por
    `_translate_groq_error`.
    """
    exc = cls.__new__(cls)
    exc.args = (message,)
    exc.message = message
    exc.status_code = status_code if status_code is not None else getattr(cls, "status_code", 500)
    exc.response = None
    exc.body = None
    exc.request = None
    return exc


def _make_fake_connection_error(cls: type, *, message: str = "Erro de conexao simulado."):
    """Mesma ideia de `_make_fake_api_status_error`, para
    `APIConnectionError`/`APITimeoutError` (cujo `__init__` real exige um
    `httpx.Request` de verdade)."""
    exc = cls.__new__(cls)
    exc.args = (message,)
    exc.message = message
    exc.request = None
    return exc


class _FakeCompletions:
    def __init__(self, exc_to_raise: Exception | None):
        self._exc_to_raise = exc_to_raise
        self.call_count = 0

    def create(self, **kwargs):
        self.call_count += 1
        if self._exc_to_raise is not None:
            raise self._exc_to_raise
        return _FakeSuccessCompletion()


class _FakeChat:
    def __init__(self, completions: _FakeCompletions):
        self.completions = completions


class _FakeGroqClient:
    def __init__(self, completions: _FakeCompletions, **kwargs):
        self.chat = _FakeChat(completions)
        self.kwargs = kwargs


class _FakeMessage:
    def __init__(self, content: str):
        self.content = content


class _FakeChoice:
    def __init__(self, content: str):
        self.message = _FakeMessage(content)


class _FakeSuccessCompletion:
    """Resposta minima e valida o suficiente para passar pelos parsers
    existentes de `generate_questions`/`evaluate_interview`, sem alterar
    nada desses parsers."""

    def __init__(self, content: str | None = None):
        self.choices = [_FakeChoice(content or "{}")]


def _patch_groq_with_fake_completions(monkeypatch, exc_to_raise: Exception | None = None) -> _FakeCompletions:
    """Configura o ambiente (uma unica fake key + fake model) e substitui
    `groq_service.Groq` por um dublê cujo `chat.completions.create` levanta
    `exc_to_raise` (ou devolve uma resposta minima valida, se `None`) -
    contando quantas vezes foi chamado. Usa o pool/`_client()` REAIS, para
    provar que so existe UMA tentativa de chamada a Groq por operacao.
    """
    monkeypatch.setenv("GROQ_API_KEYS", FAKE_KEY)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", FAKE_MODEL)

    completions = _FakeCompletions(exc_to_raise)

    def _fake_groq(**kwargs):
        return _FakeGroqClient(completions, **kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)
    return completions


# ---------------------------------------------------------------------------
# Classificacao: cada excecao da SDK vira a categoria correta (casos 1-8)
# ---------------------------------------------------------------------------

def test_rate_limit_error_vira_categoria_rate_limit():
    exc = _make_fake_api_status_error(RateLimitError)
    translated = _translate_groq_error(exc, action="gerar perguntas")

    assert isinstance(translated, GroqServiceError)
    assert translated.category == GROQ_ERROR_CATEGORY_RATE_LIMIT
    assert translated.status_code == 502


def test_bad_request_error_vira_categoria_bad_request():
    # Caso real ja observado: json_validate_failed pode chegar como HTTP
    # 400 - isso NAO deve ser interpretado como problema da key.
    exc = _make_fake_api_status_error(BadRequestError, message="json_validate_failed")
    translated = _translate_groq_error(exc, action="avaliar entrevista")

    assert translated.category == GROQ_ERROR_CATEGORY_BAD_REQUEST
    assert translated.status_code == 502


def test_authentication_error_vira_categoria_authentication():
    exc = _make_fake_api_status_error(AuthenticationError)
    translated = _translate_groq_error(exc, action="gerar perguntas")

    assert translated.category == GROQ_ERROR_CATEGORY_AUTHENTICATION
    assert translated.status_code == 502


def test_permission_denied_error_vira_categoria_permission_denied():
    exc = _make_fake_api_status_error(PermissionDeniedError)
    translated = _translate_groq_error(exc, action="gerar perguntas")

    assert translated.category == GROQ_ERROR_CATEGORY_PERMISSION_DENIED
    assert translated.status_code == 502


def test_internal_server_error_vira_categoria_upstream_server_error():
    exc = _make_fake_api_status_error(InternalServerError, status_code=503)
    translated = _translate_groq_error(exc, action="avaliar entrevista")

    assert translated.category == GROQ_ERROR_CATEGORY_UPSTREAM_SERVER_ERROR
    assert translated.status_code == 502


def test_api_timeout_error_vira_categoria_timeout():
    exc = _make_fake_connection_error(APITimeoutError, message="Request timed out.")
    translated = _translate_groq_error(exc, action="gerar perguntas")

    assert translated.category == GROQ_ERROR_CATEGORY_TIMEOUT
    assert translated.status_code == 504


def test_api_connection_error_vira_categoria_connection_error():
    exc = _make_fake_connection_error(APIConnectionError, message="Connection error.")
    translated = _translate_groq_error(exc, action="avaliar entrevista")

    assert translated.category == GROQ_ERROR_CATEGORY_CONNECTION_ERROR
    assert translated.status_code == 502


def test_api_status_error_generico_vira_categoria_residual():
    # Ex.: 404/409/422 (NotFoundError/ConflictError/UnprocessableEntityError)
    # nao tem categoria dedicada nesta rodada - caem no residual.
    exc = _make_fake_api_status_error(APIStatusError, status_code=418)
    translated = _translate_groq_error(exc, action="gerar perguntas")

    assert translated.category == GROQ_ERROR_CATEGORY_API_STATUS_ERROR
    assert translated.status_code == 502


def test_excecao_desconhecida_vira_falha_inesperada_sem_categoria():
    translated = _translate_groq_error(ValueError("qualquer coisa"), action="gerar perguntas")

    assert translated.category is None
    assert translated.status_code == 502
    assert "gerar perguntas" in str(translated)


# ---------------------------------------------------------------------------
# Caso 9: nenhuma mensagem contem fake API key
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "make_exc",
    [
        lambda: _make_fake_api_status_error(RateLimitError, message=f"429 for key {FAKE_KEY_MARKER}"),
        lambda: _make_fake_api_status_error(BadRequestError, message=f"bad request, key={FAKE_KEY_MARKER}"),
        lambda: _make_fake_api_status_error(AuthenticationError, message=f"invalid key {FAKE_KEY_MARKER}"),
        lambda: _make_fake_api_status_error(PermissionDeniedError, message=f"denied for {FAKE_KEY_MARKER}"),
        lambda: _make_fake_api_status_error(InternalServerError, message=f"server error {FAKE_KEY_MARKER}"),
        lambda: _make_fake_connection_error(APITimeoutError, message=f"timeout {FAKE_KEY_MARKER}"),
        lambda: _make_fake_connection_error(APIConnectionError, message=f"conn error {FAKE_KEY_MARKER}"),
        lambda: _make_fake_api_status_error(APIStatusError, message=f"status error {FAKE_KEY_MARKER}"),
    ],
    ids=[
        "rate_limit",
        "bad_request",
        "authentication",
        "permission_denied",
        "upstream_server_error",
        "timeout",
        "connection_error",
        "api_status_error",
    ],
)
def test_nenhuma_mensagem_contem_fake_api_key(make_exc):
    # A excecao "original" da SDK pode ate conter a key na sua propria
    # mensagem (como aconteceria numa excecao real do SDK, que inclui texto
    # da resposta HTTP) - o que importa e que `_translate_groq_error` NUNCA
    # repasse esse texto para a mensagem do GroqServiceError resultante.
    exc = make_exc()
    translated = _translate_groq_error(exc, action="gerar perguntas")

    assert FAKE_KEY_MARKER not in str(translated)
    assert FAKE_KEY_MARKER not in repr(translated)


# ---------------------------------------------------------------------------
# Caso 10: a classificacao usa isinstance, nao o texto da mensagem
# ---------------------------------------------------------------------------

def test_classificacao_nao_depende_do_texto_da_excecao():
    # Mensagens deliberadamente "erradas"/enganosas: se a classificacao
    # dependesse de comparacao textual, estes casos classificariam errado.
    misleading_cases = [
        (RateLimitError, "Bad request error occurred", GROQ_ERROR_CATEGORY_RATE_LIMIT),
        (BadRequestError, "Rate limit exceeded, try again", GROQ_ERROR_CATEGORY_BAD_REQUEST),
        (AuthenticationError, "403 forbidden", GROQ_ERROR_CATEGORY_AUTHENTICATION),
        (PermissionDeniedError, "401 unauthorized", GROQ_ERROR_CATEGORY_PERMISSION_DENIED),
    ]

    for exc_cls, misleading_message, expected_category in misleading_cases:
        exc = _make_fake_api_status_error(exc_cls, message=misleading_message)
        translated = _translate_groq_error(exc, action="gerar perguntas")
        assert translated.category == expected_category


# ---------------------------------------------------------------------------
# Caso 11: 429 (e as demais categorias) nao causam segunda tentativa/troca
# de key - integrado via generate_questions()/evaluate_interview() reais,
# usando o pool real com uma unica key.
# ---------------------------------------------------------------------------

def test_429_em_generate_questions_faz_somente_uma_tentativa_groq(
    monkeypatch, reset_key_pool, valid_context
):
    exc = _make_fake_api_status_error(RateLimitError)
    completions = _patch_groq_with_fake_completions(monkeypatch, exc_to_raise=exc)

    service = GroqService()
    with pytest.raises(GroqServiceError) as exc_info:
        service.generate_questions(valid_context)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_RATE_LIMIT
    # Nenhum retry manual, nenhuma segunda tentativa com outra key: so uma
    # chamada a create() aconteceu.
    assert completions.call_count == 1


def test_429_em_evaluate_interview_faz_somente_uma_tentativa_groq(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    exc = _make_fake_api_status_error(RateLimitError)
    completions = _patch_groq_with_fake_completions(monkeypatch, exc_to_raise=exc)

    service = GroqService()
    with pytest.raises(GroqServiceError) as exc_info:
        service.evaluate_interview(valid_context, valid_answers)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_RATE_LIMIT
    assert completions.call_count == 1


@pytest.mark.parametrize(
    "exc_factory,expected_category",
    [
        (lambda: _make_fake_api_status_error(RateLimitError), GROQ_ERROR_CATEGORY_RATE_LIMIT),
        (lambda: _make_fake_api_status_error(BadRequestError), GROQ_ERROR_CATEGORY_BAD_REQUEST),
        (lambda: _make_fake_api_status_error(AuthenticationError), GROQ_ERROR_CATEGORY_AUTHENTICATION),
        (lambda: _make_fake_api_status_error(PermissionDeniedError), GROQ_ERROR_CATEGORY_PERMISSION_DENIED),
        (lambda: _make_fake_api_status_error(InternalServerError, status_code=503), GROQ_ERROR_CATEGORY_UPSTREAM_SERVER_ERROR),
        (lambda: _make_fake_connection_error(APITimeoutError), GROQ_ERROR_CATEGORY_TIMEOUT),
        (lambda: _make_fake_connection_error(APIConnectionError), GROQ_ERROR_CATEGORY_CONNECTION_ERROR),
    ],
    ids=[
        "rate_limit",
        "bad_request",
        "authentication",
        "permission_denied",
        "upstream_server_error",
        "timeout",
        "connection_error",
    ],
)
def test_nenhuma_categoria_faz_segunda_tentativa_groq(
    monkeypatch, reset_key_pool, valid_context, exc_factory, expected_category
):
    # Cobertura ampliada do caso 11: nenhuma das categorias (nao so 429)
    # provoca uma segunda tentativa nesta rodada - o fallback so existe a
    # partir do Bloco 5, e la sera restrito a rate_limit.
    exc = exc_factory()
    completions = _patch_groq_with_fake_completions(monkeypatch, exc_to_raise=exc)

    service = GroqService()
    with pytest.raises(GroqServiceError) as exc_info:
        service.generate_questions(valid_context)

    assert exc_info.value.category == expected_category
    assert completions.call_count == 1


# ---------------------------------------------------------------------------
# Caso 12: comportamento de sucesso existente nao deve quebrar
# ---------------------------------------------------------------------------

def test_generate_questions_sucesso_nao_foi_alterado(monkeypatch, reset_key_pool, valid_context):
    success_json = (
        '{"questions": ['
        '{"id": 1, "type": "Tecnica", "text": "Pergunta tecnica 1?"},'
        '{"id": 2, "type": "Tecnica", "text": "Pergunta tecnica 2?"},'
        '{"id": 3, "type": "Comportamental", "text": "Pergunta comportamental 1?"},'
        '{"id": 4, "type": "Comportamental", "text": "Pergunta comportamental 2?"},'
        '{"id": 5, "type": "Carreira", "text": "Pergunta de carreira?"}'
        "]}"
    )
    completions = _patch_groq_with_fake_completions(monkeypatch, exc_to_raise=None)

    def _create(**kwargs):
        completions.call_count += 1
        return _FakeSuccessCompletion(success_json)

    completions.create = _create

    service = GroqService()
    questions = service.generate_questions(valid_context)

    assert len(questions) == 5
    assert questions[0] == {"id": 1, "type": "Tecnica", "text": "Pergunta tecnica 1?"}
    assert completions.call_count == 1


def test_evaluate_interview_sucesso_nao_foi_alterado(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    success_json = (
        "{"
        '"scores": {"Clareza": 8, "Coerência": 8, "Objetividade": 8, "Domínio": 8, '
        '"Organização": 8, "Aderência": 8, "Exemplos": 8},'
        '"strengths": ["Boa comunicacao"],'
        '"improvements": ["Aprofundar exemplos"],'
        '"recommendations": ["Estudar mais sobre o tema"],'
        '"summary": "Resposta solida.",'
        '"questionsEvaluation": [{"questionId": 1, "score": 8, "reason": "ok", '
        '"positives": ["clareza"], "improvements": ["profundidade"], "suggestion": "detalhar mais"}]'
        "}"
    )
    completions = _patch_groq_with_fake_completions(monkeypatch, exc_to_raise=None)

    def _create(**kwargs):
        completions.call_count += 1
        return _FakeSuccessCompletion(success_json)

    completions.create = _create

    service = GroqService()
    evaluation = service.evaluate_interview(valid_context, valid_answers)

    assert evaluation["summary"] == "Resposta solida."
    assert evaluation["questionsEvaluation"][0]["questionId"] == 1
    assert completions.call_count == 1
