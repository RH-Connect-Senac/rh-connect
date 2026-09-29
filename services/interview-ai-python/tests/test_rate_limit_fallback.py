"""Testes do Bloco 5: fallback controlado para outra key, restrito a 429.

Cobre exclusivamente `GroqService._execute_with_rate_limit_fallback` (usado
por `generate_questions()`/`evaluate_interview()`).

Escopo explicito deste bloco (branch work/groq-roteamento-chaves):
- Fallback SOMENTE para a categoria `rate_limit` (429/RateLimitError).
  Qualquer outra categoria (400/401/403/5xx/timeout/conexao/residual/
  inesperado) sobe na primeira tentativa, sem tentar outra key - ja
  coberto por `test_error_classification.py`, mas reforcado aqui no
  contexto especifico do fallback (para provar que essas categorias nao
  disparam uma segunda tentativa mesmo quando existem multiplas keys
  disponiveis no pool).
- NAO ha sleep, backoff, jitter ou Retry-After - o "fallback" e
  estritamente "tentar a proxima key", nunca a mesma key de novo.
- NAO instancia nem chama a SDK Groq de verdade: o cliente `Groq` e
  substituido por um dublê local; as excecoes da SDK sao construidas com
  objetos minimos/fakes (via `__new__`), sem rede.
- Usa somente valores de chave obviamente falsos (ex.: "fake-key-A").
"""

from __future__ import annotations

from types import SimpleNamespace

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
    GROQ_ERROR_CATEGORY_AUTHENTICATION,
    GROQ_ERROR_CATEGORY_BAD_REQUEST,
    GROQ_ERROR_CATEGORY_CONNECTION_ERROR,
    GROQ_ERROR_CATEGORY_PERMISSION_DENIED,
    GROQ_ERROR_CATEGORY_RATE_LIMIT,
    GROQ_ERROR_CATEGORY_TIMEOUT,
    GROQ_ERROR_CATEGORY_UPSTREAM_SERVER_ERROR,
    GroqService,
    GroqServiceError,
)

FAKE_KEY_MARKER = "fake-key-que-nunca-deve-aparecer-em-mensagem"


@pytest.fixture
def reset_key_pool():
    """Isola o pool de keys do processo entre testes (uso exclusivo de teste)."""
    groq_service._reset_key_pool_for_tests()
    yield
    groq_service._reset_key_pool_for_tests()


@pytest.fixture
def valid_context():
    return {"title": "Vaga de Teste - Bloco 5"}


@pytest.fixture
def valid_answers():
    return [
        {
            "questionId": 1,
            "questionText": "Pergunta de teste?",
            "answer": "Resposta de teste.",
        }
    ]


def _make_fake_api_status_error(
    cls: type,
    *,
    message: str = "Erro simulado da Groq.",
    status_code: int | None = None,
    headers: dict[str, str] | None = None,
):
    """Constroi uma instancia minima de uma subclasse de `APIStatusError`
    sem chamar seu `__init__` real (evita exigir um `httpx.Response`/
    `httpx.Request` de verdade) e sem nenhuma chamada de rede."""
    exc = cls.__new__(cls)
    exc.args = (message,)
    exc.message = message
    exc.status_code = status_code if status_code is not None else getattr(cls, "status_code", 500)
    exc.response = SimpleNamespace(json=lambda: {}, headers=headers or {}) if headers is not None else None
    exc.body = None
    exc.request = None
    return exc


def _make_fake_connection_error(cls: type, *, message: str = "Erro de conexao simulado."):
    exc = cls.__new__(cls)
    exc.args = (message,)
    exc.message = message
    exc.request = None
    return exc


SUCCESS_QUESTIONS_JSON = (
    '{"questions": ['
    '{"id": 1, "type": "Tecnica", "text": "Pergunta tecnica 1?"},'
    '{"id": 2, "type": "Tecnica", "text": "Pergunta tecnica 2?"},'
    '{"id": 3, "type": "Comportamental", "text": "Pergunta comportamental 1?"},'
    '{"id": 4, "type": "Comportamental", "text": "Pergunta comportamental 2?"},'
    '{"id": 5, "type": "Carreira", "text": "Pergunta de carreira?"}'
    "]}"
)

SUCCESS_EVALUATION_JSON = (
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
    """Dublê de `client.chat.completions`: para cada chamada de
    `create()`, consome o proximo item de `outcomes` (uma excecao a
    levantar, ou uma string JSON de sucesso a devolver como resposta).
    Registra o `api_key` usado em cada chamada (via o dublê de `Groq`
    abaixo) para provar que cada tentativa realmente usou uma key
    diferente - nunca o VALOR de uma key real, so os fakes do teste.
    """

    def __init__(self, outcomes: list):
        self._outcomes = list(outcomes)
        self.call_count = 0

    def create(self, **kwargs):
        self.call_count += 1
        if self.call_count > len(self._outcomes):
            raise AssertionError(
                f"create() chamado {self.call_count} vezes, mas so havia "
                f"{len(self._outcomes)} resultado(s) programado(s) - "
                "possivel loop além do numero de keys do pool."
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
    """Configura `GROQ_API_KEYS` (fakes) e substitui `groq_service.Groq`
    por um dublê que devolve/levanta, em ordem, os itens de `outcomes` a
    cada chamada de `create()`. Retorna (completions, used_api_keys) onde
    `used_api_keys` registra, em ordem, a key usada em cada instanciacao
    do cliente - util para provar que cada tentativa usou uma key
    diferente, sem nunca expor valores reais (sao todos fakes de teste).
    """
    monkeypatch.setenv("GROQ_API_KEYS", keys)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "fake-model-bloco5")

    completions = _FakeCompletions(outcomes)
    used_api_keys: list[str] = []

    def _fake_groq(*, api_key: str, **kwargs):
        used_api_keys.append(api_key)
        return _FakeGroqClient(completions, api_key=api_key, **kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)
    return completions, used_api_keys


# ---------------------------------------------------------------------------
# Casos 1-2: uma unica key
# ---------------------------------------------------------------------------

def test_uma_key_sucesso_de_primeira_uma_unica_tentativa(monkeypatch, reset_key_pool, valid_context):
    completions, used_api_keys = _patch_groq(
        monkeypatch, keys="fake-key-A", outcomes=[SUCCESS_QUESTIONS_JSON]
    )

    questions = GroqService().generate_questions(valid_context)

    assert len(questions) == 5
    assert completions.call_count == 1
    assert used_api_keys == ["fake-key-A"]


def test_uma_key_429_uma_unica_tentativa_erro_final_sem_repetir_a_mesma_key(
    monkeypatch, reset_key_pool, valid_context
):
    exc = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(monkeypatch, keys="fake-key-A", outcomes=[exc])

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().generate_questions(valid_context)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_RATE_LIMIT
    # So existe uma key - exatamente 1 tentativa, e nao uma segunda
    # tentativa "reusando" a key A.
    assert completions.call_count == 1
    assert used_api_keys == ["fake-key-A"]


# ---------------------------------------------------------------------------
# Casos 3-5: tres keys
# ---------------------------------------------------------------------------

def test_tres_keys_a_429_b_sucesso_exatamente_duas_tentativas(
    monkeypatch, reset_key_pool, valid_context
):
    exc_a = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B,fake-key-C",
        outcomes=[exc_a, SUCCESS_QUESTIONS_JSON],
    )

    questions = GroqService().generate_questions(valid_context)

    assert len(questions) == 5
    assert completions.call_count == 2
    assert used_api_keys == ["fake-key-A", "fake-key-B"]


def test_tres_keys_a_429_b_429_c_sucesso_exatamente_tres_tentativas(
    monkeypatch, reset_key_pool, valid_context
):
    exc_a = _make_fake_api_status_error(RateLimitError)
    exc_b = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B,fake-key-C",
        outcomes=[exc_a, exc_b, SUCCESS_QUESTIONS_JSON],
    )

    questions = GroqService().generate_questions(valid_context)

    assert len(questions) == 5
    assert completions.call_count == 3
    assert used_api_keys == ["fake-key-A", "fake-key-B", "fake-key-C"]


def test_tres_keys_todas_429_exatamente_tres_tentativas_erro_final_sem_quarta(
    monkeypatch, reset_key_pool, valid_context
):
    exc_a = _make_fake_api_status_error(RateLimitError)
    exc_b = _make_fake_api_status_error(RateLimitError)
    exc_c = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B,fake-key-C",
        outcomes=[exc_a, exc_b, exc_c],
    )

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().generate_questions(valid_context)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_RATE_LIMIT
    # Exatamente 3 tentativas (uma por key) - NUNCA uma 4a chamada. O dublê
    # de completions ja levantaria AssertionError sozinho se isso
    # acontecesse (ver _FakeCompletions.create), entao chegar aqui sem
    # excecao de asserção ja e parte da prova.
    assert completions.call_count == 3
    assert used_api_keys == ["fake-key-A", "fake-key-B", "fake-key-C"]


# ---------------------------------------------------------------------------
# Caso 6: nenhuma key repetida na mesma operacao (reforco explicito)
# ---------------------------------------------------------------------------

def test_nenhuma_key_e_repetida_dentro_da_mesma_operacao(monkeypatch, reset_key_pool, valid_context):
    exc_a = _make_fake_api_status_error(RateLimitError)
    exc_b = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B,fake-key-C",
        outcomes=[exc_a, exc_b, SUCCESS_QUESTIONS_JSON],
    )

    GroqService().generate_questions(valid_context)

    assert len(used_api_keys) == len(set(used_api_keys)), (
        f"keys repetidas na mesma operacao: {used_api_keys}"
    )


# ---------------------------------------------------------------------------
# Caso 7: numero de tentativas e dinamico (N keys, nao hardcoded)
# ---------------------------------------------------------------------------

def test_cinco_keys_todas_429_exatamente_cinco_tentativas(monkeypatch, reset_key_pool, valid_context):
    fake_keys = [f"fake-key-{i}" for i in range(5)]
    outcomes = [_make_fake_api_status_error(RateLimitError) for _ in fake_keys]
    completions, used_api_keys = _patch_groq(
        monkeypatch, keys=",".join(fake_keys), outcomes=outcomes
    )

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().generate_questions(valid_context)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_RATE_LIMIT
    assert completions.call_count == 5
    assert used_api_keys == fake_keys


# ---------------------------------------------------------------------------
# Casos 8-14: outras categorias -> exatamente 1 tentativa, sem fallback
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "exc_factory,expected_category",
    [
        (lambda: _make_fake_api_status_error(BadRequestError), GROQ_ERROR_CATEGORY_BAD_REQUEST),
        (lambda: _make_fake_api_status_error(AuthenticationError), GROQ_ERROR_CATEGORY_AUTHENTICATION),
        (lambda: _make_fake_api_status_error(PermissionDeniedError), GROQ_ERROR_CATEGORY_PERMISSION_DENIED),
        (
            lambda: _make_fake_api_status_error(InternalServerError, status_code=503),
            GROQ_ERROR_CATEGORY_UPSTREAM_SERVER_ERROR,
        ),
        (lambda: _make_fake_connection_error(APITimeoutError), GROQ_ERROR_CATEGORY_TIMEOUT),
        (lambda: _make_fake_connection_error(APIConnectionError), GROQ_ERROR_CATEGORY_CONNECTION_ERROR),
        (lambda: _make_fake_api_status_error(APIStatusError, status_code=418), "api_status_error"),
    ],
    ids=[
        "bad_request_400",
        "authentication_401",
        "permission_denied_403",
        "internal_server_error_5xx",
        "timeout",
        "connection_error",
        "api_status_error_residual",
    ],
)
def test_categorias_nao_rate_limit_fazem_somente_uma_tentativa_mesmo_com_varias_keys(
    monkeypatch, reset_key_pool, valid_context, exc_factory, expected_category
):
    # Mesmo com 3 keys disponiveis no pool, nenhuma dessas categorias deve
    # disparar uma segunda tentativa - o fallback e EXCLUSIVO de rate_limit.
    exc = exc_factory()
    completions, used_api_keys = _patch_groq(
        monkeypatch, keys="fake-key-A,fake-key-B,fake-key-C", outcomes=[exc]
    )

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().generate_questions(valid_context)

    assert exc_info.value.category == expected_category
    assert completions.call_count == 1
    assert used_api_keys == ["fake-key-A"]


def test_bad_request_json_validate_failed_nao_troca_de_key(monkeypatch, reset_key_pool, valid_context):
    # Caso real ja observado: json_validate_failed chega como HTTP 400 e
    # NAO deve ser interpretado como problema da key.
    exc = _make_fake_api_status_error(BadRequestError, message="json_validate_failed")
    completions, used_api_keys = _patch_groq(
        monkeypatch, keys="fake-key-A,fake-key-B,fake-key-C", outcomes=[exc]
    )

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().generate_questions(valid_context)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_BAD_REQUEST
    assert completions.call_count == 1
    assert used_api_keys == ["fake-key-A"]


# ---------------------------------------------------------------------------
# Casos 15-16: generate_questions e evaluate_interview usam o fallback
# ---------------------------------------------------------------------------

def test_generate_questions_usa_fallback_429_corretamente(monkeypatch, reset_key_pool, valid_context):
    exc_a = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc_a, SUCCESS_QUESTIONS_JSON],
    )

    questions = GroqService().generate_questions(valid_context)

    assert len(questions) == 5
    assert used_api_keys == ["fake-key-A", "fake-key-B"]


def test_evaluate_interview_usa_fallback_429_corretamente(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    exc_a = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc_a, SUCCESS_EVALUATION_JSON],
    )

    evaluation = GroqService().evaluate_interview(valid_context, valid_answers)

    assert evaluation["summary"] == "Resposta solida."
    assert used_api_keys == ["fake-key-A", "fake-key-B"]


def test_evaluate_interview_loga_contadores_de_fallback_429(
    monkeypatch, reset_key_pool, valid_context, valid_answers, caplog
):
    exc_a = _make_fake_api_status_error(RateLimitError)
    exc_b = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B,fake-key-C",
        outcomes=[exc_a, exc_b, SUCCESS_EVALUATION_JSON],
    )

    with caplog.at_level("INFO"):
        evaluation = GroqService().evaluate_interview(valid_context, valid_answers)

    assert evaluation["summary"] == "Resposta solida."
    assert completions.call_count == 3
    assert used_api_keys == ["fake-key-A", "fake-key-B", "fake-key-C"]

    attempt_logs = [
        record.getMessage()
        for record in caplog.records
        if "tentativa estrutural de avaliacao finalizada" in record.getMessage()
    ]
    assert len(attempt_logs) == 1
    assert "'structural_attempt': 1" in attempt_logs[0]
    assert "'sdk_attempt_count': 3" in attempt_logs[0]
    assert "'rate_limit_count': 2" in attempt_logs[0]
    assert "'fallback_exhausted': False" in attempt_logs[0]
    assert "fake-key" not in attempt_logs[0]


def test_evaluate_interview_loga_fallback_exhausted_quando_todas_429(
    monkeypatch, reset_key_pool, valid_context, valid_answers, caplog
):
    fake_keys = ["fake-key-A", "fake-key-B"]
    outcomes = [_make_fake_api_status_error(RateLimitError) for _ in fake_keys]
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys=",".join(fake_keys),
        outcomes=outcomes,
    )

    with caplog.at_level("INFO"):
        with pytest.raises(GroqServiceError) as exc_info:
            GroqService().evaluate_interview(valid_context, valid_answers)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_RATE_LIMIT
    assert completions.call_count == 2
    assert used_api_keys == fake_keys

    attempt_logs = [
        record.getMessage()
        for record in caplog.records
        if "tentativa estrutural de avaliacao finalizada" in record.getMessage()
    ]
    assert len(attempt_logs) == 1
    assert "'sdk_attempt_count': 2" in attempt_logs[0]
    assert "'rate_limit_count': 2" in attempt_logs[0]
    assert "'fallback_exhausted': True" in attempt_logs[0]
    assert "'error_category': 'rate_limit'" in attempt_logs[0]
    assert "fake-key" not in attempt_logs[0]


# ---------------------------------------------------------------------------
# Caso 17: sucesso preserva o mesmo formato de saida
# ---------------------------------------------------------------------------

def test_sucesso_generate_questions_preserva_formato_apos_fallback(
    monkeypatch, reset_key_pool, valid_context
):
    exc_a = _make_fake_api_status_error(RateLimitError)
    completions, _ = _patch_groq(
        monkeypatch, keys="fake-key-A,fake-key-B", outcomes=[exc_a, SUCCESS_QUESTIONS_JSON]
    )

    questions = GroqService().generate_questions(valid_context)

    assert questions[0] == {"id": 1, "type": "Tecnica", "text": "Pergunta tecnica 1?"}
    assert [q["type"] for q in questions] == [
        "Tecnica",
        "Tecnica",
        "Comportamental",
        "Comportamental",
        "Carreira",
    ]


def test_sucesso_evaluate_interview_preserva_formato_apos_fallback(
    monkeypatch, reset_key_pool, valid_context, valid_answers
):
    exc_a = _make_fake_api_status_error(RateLimitError)
    completions, _ = _patch_groq(
        monkeypatch, keys="fake-key-A,fake-key-B", outcomes=[exc_a, SUCCESS_EVALUATION_JSON]
    )

    evaluation = GroqService().evaluate_interview(valid_context, valid_answers)

    assert evaluation["questionsEvaluation"][0]["questionId"] == 1
    assert set(evaluation["scores"].keys()) == {
        "Clareza",
        "Coerência",
        "Objetividade",
        "Domínio",
        "Organização",
        "Aderência",
        "Exemplos",
    }


# ---------------------------------------------------------------------------
# Caso 18: a proxima operacao continua o round-robin global do ponto certo
# ---------------------------------------------------------------------------

def test_proxima_operacao_continua_round_robin_global_do_ponto_certo(
    monkeypatch, reset_key_pool, valid_context
):
    # Operacao 1: A -> 429, B -> sucesso (indice do pool avanca ate C).
    exc_a = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B,fake-key-C",
        outcomes=[exc_a, SUCCESS_QUESTIONS_JSON, SUCCESS_QUESTIONS_JSON],
    )

    GroqService().generate_questions(valid_context)  # operacao 1
    assert used_api_keys == ["fake-key-A", "fake-key-B"]

    # Operacao 2: deve comecar em C (proxima posicao do MESMO pool), nunca
    # resetar para A.
    GroqService().generate_questions(valid_context)  # operacao 2
    assert used_api_keys == ["fake-key-A", "fake-key-B", "fake-key-C"]


# ---------------------------------------------------------------------------
# Caso 19: nenhuma key aparece em mensagem/log/repr
# ---------------------------------------------------------------------------

def test_nenhuma_key_aparece_em_mensagem_log_ou_repr_apos_fallback_esgotado(
    monkeypatch, reset_key_pool, valid_context, caplog
):
    fake_keys = [FAKE_KEY_MARKER + "-A", FAKE_KEY_MARKER + "-B"]
    outcomes = [_make_fake_api_status_error(RateLimitError) for _ in fake_keys]
    completions, used_api_keys = _patch_groq(monkeypatch, keys=",".join(fake_keys), outcomes=outcomes)

    with caplog.at_level("DEBUG"):
        with pytest.raises(GroqServiceError) as exc_info:
            GroqService().generate_questions(valid_context)

    assert FAKE_KEY_MARKER not in str(exc_info.value)
    assert FAKE_KEY_MARKER not in repr(exc_info.value)
    for record in caplog.records:
        assert FAKE_KEY_MARKER not in record.getMessage()


def test_nenhuma_key_aparece_em_mensagem_log_ou_repr_em_evaluate_interview(
    monkeypatch, reset_key_pool, valid_context, valid_answers, caplog
):
    # evaluate_interview loga um warning para APIStatusError (observabilidade
    # ja existente, preservada) - garante que mesmo esse log nao vaza key.
    fake_keys = [FAKE_KEY_MARKER + "-A", FAKE_KEY_MARKER + "-B"]
    outcomes = [_make_fake_api_status_error(RateLimitError) for _ in fake_keys]
    completions, used_api_keys = _patch_groq(monkeypatch, keys=",".join(fake_keys), outcomes=outcomes)

    with caplog.at_level("DEBUG"):
        with pytest.raises(GroqServiceError) as exc_info:
            GroqService().evaluate_interview(valid_context, valid_answers)

    assert FAKE_KEY_MARKER not in str(exc_info.value)
    for record in caplog.records:
        assert FAKE_KEY_MARKER not in record.getMessage()
        for value in getattr(record, "__dict__", {}).values():
            assert FAKE_KEY_MARKER not in str(value)


# ---------------------------------------------------------------------------
# Teste de limite: prova explicita de ausencia de loop infinito
# ---------------------------------------------------------------------------

def test_limite_tres_keys_todas_429_nunca_faz_quarta_tentativa(monkeypatch, reset_key_pool, valid_context):
    """Teste que provaria loop infinito (ou uso indevido de mais tentativas
    que keys disponiveis) caso a implementacao estivesse errada: 3 keys,
    todas 429. O dublê de completions conta as chamadas e este teste afirma
    `call_count == 3` explicitamente - nunca 4 ou mais.
    """
    outcomes = [_make_fake_api_status_error(RateLimitError) for _ in range(3)]
    completions, used_api_keys = _patch_groq(
        monkeypatch, keys="fake-key-A,fake-key-B,fake-key-C", outcomes=outcomes
    )

    with pytest.raises(GroqServiceError):
        GroqService().generate_questions(valid_context)

    assert completions.call_count == 3
    assert len(used_api_keys) == 3


def test_todas_as_keys_em_cooldown_nao_chama_groq(
    monkeypatch, reset_key_pool, valid_context
):
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[SUCCESS_QUESTIONS_JSON],
    )
    pool = groq_service._get_key_pool()
    pool.mark_rate_limited("fake-key-A", 30)
    pool.mark_rate_limited("fake-key-B", 30)

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().generate_questions(valid_context)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_RATE_LIMIT
    assert "fake-key" not in str(exc_info.value)
    assert completions.call_count == 0
    assert used_api_keys == []


def test_operacao_subsequente_nao_reutiliza_key_recem_limitada(
    monkeypatch, reset_key_pool, valid_context
):
    monkeypatch.setattr("key_pool.time.monotonic", lambda: 100.0)
    exc_a = _make_fake_api_status_error(RateLimitError)
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc_a, SUCCESS_QUESTIONS_JSON, SUCCESS_QUESTIONS_JSON],
    )

    GroqService().generate_questions(valid_context)
    GroqService().generate_questions(valid_context)

    assert completions.call_count == 3
    assert used_api_keys == ["fake-key-A", "fake-key-B", "fake-key-B"]


def test_retry_after_valido_define_cooldown_da_key(
    monkeypatch, reset_key_pool, valid_context
):
    now = 100.0
    monkeypatch.setattr("key_pool.time.monotonic", lambda: now)
    exc_a = _make_fake_api_status_error(
        RateLimitError,
        headers={"retry-after": "45"},
    )
    completions, used_api_keys = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc_a, SUCCESS_QUESTIONS_JSON],
    )

    GroqService().generate_questions(valid_context)
    pool = groq_service._get_key_pool()

    now = 144.0
    assert pool.next_unique_key(set()) == "fake-key-B"

    now = 146.0
    assert pool.next_unique_key(set()) == "fake-key-A"
    assert completions.call_count == 2
    assert used_api_keys == ["fake-key-A", "fake-key-B"]


def test_retry_after_ausente_ou_invalido_usa_cooldown_configurado(
    monkeypatch, reset_key_pool, valid_context
):
    now = 100.0
    monkeypatch.setattr("key_pool.time.monotonic", lambda: now)
    monkeypatch.setenv("GROQ_RATE_LIMIT_COOLDOWN_SECONDS", "12")
    exc_a = _make_fake_api_status_error(
        RateLimitError,
        headers={"retry-after": "valor-invalido"},
    )
    _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc_a, SUCCESS_QUESTIONS_JSON],
    )

    GroqService().generate_questions(valid_context)
    pool = groq_service._get_key_pool()

    now = 111.0
    assert pool.next_unique_key(set()) == "fake-key-B"

    now = 113.0
    assert pool.next_unique_key(set()) == "fake-key-A"


def test_erro_nao_429_nao_cria_cooldown(monkeypatch, reset_key_pool, valid_context):
    exc = _make_fake_api_status_error(BadRequestError, status_code=400)
    _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc],
    )

    with pytest.raises(GroqServiceError):
        GroqService().generate_questions(valid_context)

    pool = groq_service._get_key_pool()
    assert pool.next_unique_key({"fake-key-B"}) == "fake-key-A"
