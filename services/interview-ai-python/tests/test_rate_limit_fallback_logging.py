"""Testes do Bloco 6: observabilidade segura do roteamento/fallback.

Cobre exclusivamente os logs adicionados a `GroqService._execute_with_rate_limit_fallback`
(usado por `generate_questions()`/`evaluate_interview()`). Nao testa (e nao
deveria, por design): a politica de roteamento em si (numero de tentativas,
qual credencial e escolhida, concorrencia) - isso ja esta coberto por
`test_rate_limit_fallback.py` e `test_rate_limit_fallback_concurrency.py` e
nao foi alterado nesta rodada.

Escopo explicito deste arquivo (branch work/groq-roteamento-chaves):
- NAO instancia nem chama a SDK Groq de verdade: mesmo dublê/abordagem dos
  arquivos de teste anteriores (excecoes construidas via `__new__`, sem
  rede). Usa somente valores de chave obviamente falsos.
- NAO usa `.env` real nem imprime/loga configuracao ou lista de keys.
- Verifica, para cada evento de log, que NENHUM `LogRecord` (mensagem OU
  campos de `extra`) contem o valor de nenhuma fake key usada no teste.
"""

from __future__ import annotations

import pytest
from groq import (
    AuthenticationError,
    BadRequestError,
    RateLimitError,
)

import groq_service
from groq_service import GroqService, GroqServiceError

FAKE_KEY_MARKER = "fake-key-que-nunca-deve-aparecer-em-log"


@pytest.fixture
def reset_key_pool():
    groq_service._reset_key_pool_for_tests()
    yield
    groq_service._reset_key_pool_for_tests()


@pytest.fixture
def valid_context():
    return {"title": "Vaga de Teste - Bloco 6"}


def _make_fake_api_status_error(cls: type, *, message: str = "Erro simulado da Groq.", status_code: int | None = None):
    exc = cls.__new__(cls)
    exc.args = (message,)
    exc.message = message
    exc.status_code = status_code if status_code is not None else getattr(cls, "status_code", 500)
    exc.response = None
    exc.body = None
    exc.request = None
    exc.request_id = None
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
    def __init__(self, outcomes: list):
        self._outcomes = list(outcomes)
        self.call_count = 0

    def create(self, **kwargs):
        self.call_count += 1
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


def _patch_groq(monkeypatch, *, keys: str, outcomes: list):
    monkeypatch.setenv("GROQ_API_KEYS", keys)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "fake-model-bloco6")

    completions = _FakeCompletions(outcomes)

    def _fake_groq(*, api_key: str, **kwargs):
        return _FakeGroqClient(completions, api_key=api_key, **kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)
    return completions


def _warning_records(caplog):
    return [r for r in caplog.records if r.levelname == "WARNING"]


def _info_records(caplog):
    return [r for r in caplog.records if r.levelname == "INFO"]


def _all_text(record) -> str:
    """Concatena a mensagem e todos os valores de `extra` de um LogRecord,
    para checagem de vazamento de segredo em um unico lugar."""
    parts = [record.getMessage()]
    for key, value in vars(record).items():
        if key in ("args", "msg"):
            continue
        parts.append(f"{key}={value!r}")
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Caso 1: sucesso de primeira - sem log de fallback.
# ---------------------------------------------------------------------------


def test_sucesso_de_primeira_nao_gera_log_de_fallback(monkeypatch, reset_key_pool, valid_context, caplog):
    _patch_groq(monkeypatch, keys="fake-key-A", outcomes=[SUCCESS_QUESTIONS_JSON])

    with caplog.at_level("INFO"):
        questions = GroqService().generate_questions(valid_context)

    assert len(questions) == 5
    assert _warning_records(caplog) == []
    assert _info_records(caplog) == []


# ---------------------------------------------------------------------------
# Caso 2: A -> 429 -> B sucesso - log de fallback com os campos esperados.
# ---------------------------------------------------------------------------


def test_a_429_b_sucesso_gera_log_de_fallback_com_campos_esperados(
    monkeypatch, reset_key_pool, valid_context, caplog
):
    exc_a = _make_fake_api_status_error(RateLimitError, status_code=429)
    _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc_a, SUCCESS_QUESTIONS_JSON],
    )

    with caplog.at_level("INFO"):
        questions = GroqService().generate_questions(valid_context)

    assert len(questions) == 5

    fallback_records = [
        r for r in _warning_records(caplog) if getattr(r, "fallback_triggered", None) is True
    ]
    assert len(fallback_records) == 1

    record = fallback_records[0]
    assert record.ai_operation == "generate_questions"
    assert record.attempt_number == 1
    assert record.max_attempts == 2
    assert record.error_category == "rate_limit"
    assert record.status_code == 429

    # Log opcional de sucesso apos fallback tambem deve existir.
    success_records = _info_records(caplog)
    assert len(success_records) == 1
    assert success_records[0].attempt_number == 2

    for r in caplog.records:
        assert FAKE_KEY_MARKER not in _all_text(r)
        assert "fake-key-A" not in _all_text(r)
        assert "fake-key-B" not in _all_text(r)


# ---------------------------------------------------------------------------
# Caso 3: A -> 429 -> B -> 429 -> C sucesso - cada fallback relevante logado.
# ---------------------------------------------------------------------------


def test_tres_keys_dois_fallbacks_logados_sem_expor_key(
    monkeypatch, reset_key_pool, valid_context, caplog
):
    exc_a = _make_fake_api_status_error(RateLimitError, status_code=429)
    exc_b = _make_fake_api_status_error(RateLimitError, status_code=429)
    _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B,fake-key-C",
        outcomes=[exc_a, exc_b, SUCCESS_QUESTIONS_JSON],
    )

    with caplog.at_level("INFO"):
        questions = GroqService().generate_questions(valid_context)

    assert len(questions) == 5

    fallback_records = [
        r for r in _warning_records(caplog) if getattr(r, "fallback_triggered", None) is True
    ]
    assert len(fallback_records) == 2
    assert [r.attempt_number for r in fallback_records] == [1, 2]
    assert all(r.max_attempts == 3 for r in fallback_records)
    assert all(r.error_category == "rate_limit" for r in fallback_records)

    for r in caplog.records:
        assert "fake-key-A" not in _all_text(r)
        assert "fake-key-B" not in _all_text(r)
        assert "fake-key-C" not in _all_text(r)


# ---------------------------------------------------------------------------
# Caso 4: todas as keys 429 - log final de esgotamento, nenhuma tentativa extra.
# ---------------------------------------------------------------------------


def test_todas_as_keys_429_gera_log_de_esgotamento(monkeypatch, reset_key_pool, valid_context, caplog):
    exc_a = _make_fake_api_status_error(RateLimitError, status_code=429)
    exc_b = _make_fake_api_status_error(RateLimitError, status_code=429)
    completions = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc_a, exc_b],
    )

    with caplog.at_level("INFO"):
        with pytest.raises(GroqServiceError):
            GroqService().generate_questions(valid_context)

    assert completions.call_count == 2  # nenhuma tentativa extra

    exhausted_records = [
        r for r in _warning_records(caplog) if getattr(r, "exhausted_credentials", None) is True
    ]
    assert len(exhausted_records) == 1
    record = exhausted_records[0]
    assert record.ai_operation == "generate_questions"
    assert record.max_attempts == 2
    assert record.error_category == "rate_limit"
    assert record.fallback_triggered is True

    for r in caplog.records:
        assert "fake-key-A" not in _all_text(r)
        assert "fake-key-B" not in _all_text(r)


def test_uma_unica_key_429_esgotamento_sem_fallback_real(
    monkeypatch, reset_key_pool, valid_context, caplog
):
    """Caso explicito pedido na revisao semantica: pool com 1 key, A -> 429
    -> esgotamento. Como so existe UMA credencial distinta, a operacao
    nunca chega a tentar OUTRA credencial - `fallback_triggered` deve ser
    `False` no evento de esgotamento (nao `True`, como a versao anterior
    reportava incondicionalmente)."""
    exc_a = _make_fake_api_status_error(RateLimitError, status_code=429)
    completions = _patch_groq(monkeypatch, keys="fake-key-A", outcomes=[exc_a])

    with caplog.at_level("INFO"):
        with pytest.raises(GroqServiceError):
            GroqService().generate_questions(valid_context)

    assert completions.call_count == 1  # uma unica tentativa - nenhuma extra

    exhausted_records = [
        r for r in _warning_records(caplog) if getattr(r, "exhausted_credentials", None) is True
    ]
    assert len(exhausted_records) == 1
    record = exhausted_records[0]
    assert record.max_attempts == 1
    assert record.error_category == "rate_limit"
    assert record.fallback_triggered is False

    # Nenhum log de fallback (fallback_triggered=True) deve existir - nao
    # houve nenhuma troca real de credencial.
    assert [r for r in caplog.records if getattr(r, "fallback_triggered", None) is True] == []

    assert "fake-key-A" not in _all_text(record)


def test_a_429_b_429_esgotamento_preserva_fallback_triggered_true(
    monkeypatch, reset_key_pool, valid_context, caplog
):
    """Preserva o caso ja existente: com 2 keys, ambas 429, houve uma troca
    real de credencial (A -> B) antes do esgotamento - `fallback_triggered`
    deve continuar `True` no evento final."""
    exc_a = _make_fake_api_status_error(RateLimitError, status_code=429)
    exc_b = _make_fake_api_status_error(RateLimitError, status_code=429)
    completions = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc_a, exc_b],
    )

    with caplog.at_level("INFO"):
        with pytest.raises(GroqServiceError):
            GroqService().generate_questions(valid_context)

    assert completions.call_count == 2

    exhausted_records = [
        r for r in _warning_records(caplog) if getattr(r, "exhausted_credentials", None) is True
    ]
    assert len(exhausted_records) == 1
    assert exhausted_records[0].fallback_triggered is True


# ---------------------------------------------------------------------------
# Caso 5: 400 na primeira key - erro imediato, sem log dizendo que houve
# fallback.
# ---------------------------------------------------------------------------


def test_400_na_primeira_key_nao_gera_log_de_fallback(monkeypatch, reset_key_pool, valid_context, caplog):
    exc = _make_fake_api_status_error(BadRequestError, status_code=400)
    completions = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc],
    )

    with caplog.at_level("INFO"):
        with pytest.raises(GroqServiceError):
            GroqService().generate_questions(valid_context)

    assert completions.call_count == 1

    fallback_true_records = [
        r for r in caplog.records if getattr(r, "fallback_triggered", None) is True
    ]
    assert fallback_true_records == []

    no_fallback_records = [
        r for r in _warning_records(caplog) if getattr(r, "fallback_triggered", None) is False
    ]
    assert len(no_fallback_records) == 1
    record = no_fallback_records[0]
    assert record.error_category == "bad_request"
    assert record.status_code == 400


# ---------------------------------------------------------------------------
# Caso 6: 401/403/5xx/timeout/conexao - nenhum registro de fallback.
# ---------------------------------------------------------------------------


def test_authentication_error_nao_registra_fallback(monkeypatch, reset_key_pool, valid_context, caplog):
    exc = _make_fake_api_status_error(AuthenticationError, status_code=401)
    completions = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B,fake-key-C",
        outcomes=[exc],
    )

    with caplog.at_level("INFO"):
        with pytest.raises(GroqServiceError):
            GroqService().generate_questions(valid_context)

    assert completions.call_count == 1
    assert [r for r in caplog.records if getattr(r, "fallback_triggered", None) is True] == []


# ---------------------------------------------------------------------------
# Caso 7: evaluate_interview - logging seguro, sem duplicacao indevida.
# ---------------------------------------------------------------------------


def test_evaluate_interview_a_429_b_sucesso_gera_apenas_um_log_de_fallback(
    monkeypatch, reset_key_pool, caplog
):
    exc_a = _make_fake_api_status_error(RateLimitError, status_code=429)
    _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B",
        outcomes=[exc_a, SUCCESS_EVALUATION_JSON],
    )

    context = {"title": "Vaga de Teste - Bloco 6"}
    answers = [
        {
            "questionId": 1,
            "questionText": "Pergunta de teste?",
            "answer": "Resposta de teste.",
        }
    ]

    with caplog.at_level("INFO"):
        result = GroqService().evaluate_interview(context, answers)

    assert result["summary"] == "Resposta solida."

    # Exatamente UM log de fallback para o unico 429 que ocorreu - nao dois
    # (um do bloco antigo especifico de evaluate_interview + um do
    # centralizado), confirmando que a reorganizacao removeu a duplicacao.
    fallback_records = [
        r for r in _warning_records(caplog) if getattr(r, "fallback_triggered", None) is True
    ]
    assert len(fallback_records) == 1
    assert fallback_records[0].ai_operation == "evaluate_interview"

    # Nenhum warning "orfao" de uma eventual mensagem antiga sobrevivente.
    other_warnings = [r for r in _warning_records(caplog) if r not in fallback_records]
    assert other_warnings == []


def test_evaluate_interview_erro_nao_rate_limit_ainda_loga_evento_seguro(
    monkeypatch, reset_key_pool, caplog
):
    # Cobre o caso que o bloco antigo (so `except APIStatusError`) tambem
    # cobria: uma categoria que nao seja rate_limit ainda deve gerar
    # exatamente um log seguro (agora vindo do helper centralizado).
    exc = _make_fake_api_status_error(BadRequestError, status_code=400)
    completions = _patch_groq(
        monkeypatch,
        keys="fake-key-A",
        outcomes=[exc],
    )

    context = {"title": "Vaga de Teste - Bloco 6"}
    answers = [
        {
            "questionId": 1,
            "questionText": "Pergunta de teste?",
            "answer": "Resposta de teste.",
        }
    ]

    with caplog.at_level("INFO"):
        with pytest.raises(GroqServiceError):
            GroqService().evaluate_interview(context, answers)

    assert completions.call_count == 1
    no_fallback_records = [
        r for r in _warning_records(caplog) if getattr(r, "fallback_triggered", None) is False
    ]
    assert len(no_fallback_records) == 1
    assert no_fallback_records[0].ai_operation == "evaluate_interview"
    assert no_fallback_records[0].error_category == "bad_request"


# ---------------------------------------------------------------------------
# Caso 8: nenhum LogRecord contem fake key, Authorization, prompt ou
# resposta simulada.
# ---------------------------------------------------------------------------


def test_nenhum_log_record_contem_segredo_prompt_ou_resposta(
    monkeypatch, reset_key_pool, caplog
):
    fake_keys = [FAKE_KEY_MARKER + "-A", FAKE_KEY_MARKER + "-B"]
    exc_a = _make_fake_api_status_error(RateLimitError, status_code=429)
    _patch_groq(monkeypatch, keys=",".join(fake_keys), outcomes=[exc_a, SUCCESS_EVALUATION_JSON])

    context = {"title": "Vaga de Teste - Bloco 6 - CONTEXTO_SIGILOSO"}
    candidate_answer_marker = "RESPOSTA_CONFIDENCIAL_DO_CANDIDATO"
    answers = [
        {
            "questionId": 1,
            "questionText": "Pergunta de teste?",
            "answer": candidate_answer_marker,
        }
    ]

    with caplog.at_level("DEBUG"):
        GroqService().evaluate_interview(context, answers)

    for record in caplog.records:
        text = _all_text(record)
        assert FAKE_KEY_MARKER not in text
        assert "Authorization" not in text
        assert "CONTEXTO_SIGILOSO" not in text
        assert candidate_answer_marker not in text


# ---------------------------------------------------------------------------
# Caso 9: observabilidade nao muda call_count (mesma quantidade de
# tentativas, com ou sem logging habilitado).
# ---------------------------------------------------------------------------


def test_observabilidade_nao_muda_call_count(monkeypatch, reset_key_pool, valid_context, caplog):
    exc_a = _make_fake_api_status_error(RateLimitError, status_code=429)
    exc_b = _make_fake_api_status_error(RateLimitError, status_code=429)
    completions = _patch_groq(
        monkeypatch,
        keys="fake-key-A,fake-key-B,fake-key-C",
        outcomes=[exc_a, exc_b, SUCCESS_QUESTIONS_JSON],
    )

    # Sem nenhum handler/nivel de log habilitado (caplog nao ativado).
    questions = GroqService().generate_questions(valid_context)

    assert len(questions) == 5
    assert completions.call_count == 3
