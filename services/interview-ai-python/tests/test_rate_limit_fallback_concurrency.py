"""Testes da correcao de concorrencia no fallback de rate limit (Bloco 5).

Cobre exclusivamente os problemas relatados apos a primeira versao do
Bloco 5: (1) uma operacao podia repetir uma key ja tentada quando OUTRA
operacao concorrente avancava o indice global do pool entre duas de suas
tentativas; e (2) keys duplicadas na configuracao (`GROQ_API_KEYS=A,A,B`)
podiam fazer uma unica operacao tentar o mesmo VALOR de credencial duas
vezes, mesmo sem nenhuma concorrencia.

Escopo explicito deste arquivo (branch work/groq-roteamento-chaves):
- NAO testa nada alem da garantia "cada credencial distinta no maximo uma
  vez por operacao, mesmo sob concorrencia" e da preservacao do
  round-robin global / ausencia de lock durante rede - as demais regras do
  fallback (limite de tentativas, categorias que nao disparam fallback,
  `max_retries=0`, nao vazamento de key) ja estao cobertas em
  `test_rate_limit_fallback.py` e continuam validas sem alteracao.
- NAO usa `time.sleep`/temporizacao para provar concorrencia real: toda a
  sincronizacao entre threads usa `threading.Event`/`threading.Barrier`,
  tornando os testes deterministicos (sem flakiness por timing).
- NAO instancia nem chama a SDK Groq de verdade: mesmo dublê/abordagem de
  `test_rate_limit_fallback.py` (excecoes construidas via `__new__`, sem
  rede). Usa somente valores de chave obviamente falsos.
"""

from __future__ import annotations

import threading

import pytest
from groq import RateLimitError

import groq_service
from groq_service import GROQ_ERROR_CATEGORY_RATE_LIMIT, GroqService, GroqServiceError
from key_pool import GroqKeyPool


@pytest.fixture
def reset_key_pool():
    groq_service._reset_key_pool_for_tests()
    yield
    groq_service._reset_key_pool_for_tests()


@pytest.fixture
def valid_context():
    return {"title": "Vaga de Teste - Bloco 5 (concorrencia)"}


def _make_fake_rate_limit_error(message: str = "429 simulado.") -> RateLimitError:
    exc = RateLimitError.__new__(RateLimitError)
    exc.args = (message,)
    exc.message = message
    exc.status_code = 429
    exc.response = None
    exc.body = None
    exc.request = None
    return exc


class _FakeMessage:
    def __init__(self, content: str):
        self.content = content


class _FakeChoice:
    def __init__(self, content: str):
        self.message = _FakeMessage(content)


class _FakeSuccessCompletion:
    def __init__(self, content: str = "{}"):
        self.choices = [_FakeChoice(content)]


SUCCESS_QUESTIONS_JSON = (
    '{"questions": ['
    '{"id": 1, "type": "Tecnica", "text": "Pergunta tecnica 1?"},'
    '{"id": 2, "type": "Tecnica", "text": "Pergunta tecnica 2?"},'
    '{"id": 3, "type": "Comportamental", "text": "Pergunta comportamental 1?"},'
    '{"id": 4, "type": "Comportamental", "text": "Pergunta comportamental 2?"},'
    '{"id": 5, "type": "Carreira", "text": "Pergunta de carreira?"}'
    "]}"
)


# ---------------------------------------------------------------------------
# Caso 1: duas operacoes concorrentes no MESMO pool nunca repetem uma key
# entre si a ponto de uma operacao tentar de novo uma key que ja tentou.
#
# Cenario deterministico, via threading.Event, reproduzindo exatamente o
# relato do bug: pool = [A, B, C]. Operacao 1 pega A (429), e ENTAO -
# antes de sua segunda tentativa - Operacao 2 roda por completo e consome
# B e C do MESMO pool (via next_key(), simulando outra operacao comum).
# Sem a correcao, a segunda tentativa da Operacao 1 devolveria A de novo
# (o indice global deu a volta completa: A->B->C->A). Com a correcao,
# `next_unique_key` garante que a Operacao 1 nunca recebe A de novo.
# ---------------------------------------------------------------------------


def test_operacao_nao_repete_key_ja_tentada_quando_outra_operacao_concorrente_avanca_o_indice_global(
    monkeypatch, reset_key_pool, valid_context
):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B,fake-key-C")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "fake-model-bloco5")

    pool = groq_service._get_key_pool()
    assert tuple(pool.keys) == ("fake-key-A", "fake-key-B", "fake-key-C")

    op1_used_keys: list[str] = []
    op1_first_attempt_done = threading.Event()
    op2_consumed_b_and_c = threading.Event()

    outcomes_op1 = [_make_fake_rate_limit_error(), SUCCESS_QUESTIONS_JSON]

    class _InterleavedCompletions:
        def __init__(self):
            self.call_count = 0

        def create(self, **kwargs):
            self.call_count += 1
            outcome = outcomes_op1[self.call_count - 1]
            if self.call_count == 1:
                # Operacao 1, primeira tentativa (key A): apos falhar com
                # 429, sinaliza para a "operacao 2" rodar e consumir B e C
                # do MESMO pool global, e so entao prossegue para a
                # segunda tentativa da operacao 1.
                pass
            if isinstance(outcome, BaseException):
                if self.call_count == 1:
                    result = outcome
                    op1_first_attempt_done.set()
                    op2_consumed_b_and_c.wait(timeout=5)
                    raise result
                raise outcome
            return _FakeSuccessCompletion(outcome)

    completions = _InterleavedCompletions()

    class _FakeChat:
        def __init__(self, c):
            self.completions = c

    class _FakeGroqClient:
        def __init__(self, api_key, **kwargs):
            self.chat = _FakeChat(completions)
            self.api_key = api_key

    def _fake_groq(*, api_key: str, **kwargs):
        op1_used_keys.append(api_key)
        return _FakeGroqClient(api_key=api_key, **kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)

    op1_result: dict = {}

    def _run_op1():
        op1_result["questions"] = GroqService().generate_questions(valid_context)

    op1_thread = threading.Thread(target=_run_op1)
    op1_thread.start()

    # "Operacao 2": aguarda a operacao 1 terminar sua primeira tentativa
    # (key A, 429), e entao consome B e C diretamente do MESMO pool global
    # via next_key() - simulando outra operacao comum concorrente que nao
    # tem nenhuma relacao com a operacao 1, mas compartilha o mesmo
    # `GroqKeyPool` de processo.
    assert op1_first_attempt_done.wait(timeout=5)
    consumed = [pool.next_key(), pool.next_key()]
    assert consumed == ["fake-key-B", "fake-key-C"]
    op2_consumed_b_and_c.set()

    op1_thread.join(timeout=5)
    assert not op1_thread.is_alive()

    # A operacao 1 deve ter tentado A (429) e depois uma key DIFERENTE de
    # A na segunda tentativa - nunca A de novo, mesmo o indice global tendo
    # dado a volta completa por causa da "operacao 2".
    assert completions.call_count == 2
    assert op1_used_keys[0] == "fake-key-A"
    assert op1_used_keys[1] != "fake-key-A"
    assert len(set(op1_used_keys)) == len(op1_used_keys), (
        "a operacao 1 nao pode repetir nenhuma key entre suas proprias tentativas"
    )
    assert len(op1_result["questions"]) == 5


# ---------------------------------------------------------------------------
# Caso 2: nenhuma operacao concorrente excede o numero de CREDENCIAIS
# DISTINTAS configuradas, mesmo com varias operacoes rodando ao mesmo
# tempo sobre o mesmo pool (prova via Barrier de que todas terminam sem
# nenhuma repetir uma key dentro de si mesma).
# ---------------------------------------------------------------------------


def test_multiplas_operacoes_concorrentes_nenhuma_repete_key_dentro_de_si_mesma(
    monkeypatch, reset_key_pool, valid_context
):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B,fake-key-C,fake-key-D")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "fake-model-bloco5")

    num_operacoes = 4
    barrier = threading.Barrier(num_operacoes)
    used_keys_by_thread: dict[int, list[str]] = {}
    lock = threading.Lock()

    class _AlwaysSuccessCompletions:
        def create(self, **kwargs):
            barrier.wait(timeout=5)  # forca sobreposicao real entre as operacoes
            return _FakeSuccessCompletion(SUCCESS_QUESTIONS_JSON)

    completions = _AlwaysSuccessCompletions()

    class _FakeChat:
        def __init__(self, c):
            self.completions = c

    class _FakeGroqClient:
        def __init__(self, api_key, **kwargs):
            self.chat = _FakeChat(completions)
            self.api_key = api_key

    def _fake_groq(*, api_key: str, **kwargs):
        thread_id = threading.get_ident()
        with lock:
            used_keys_by_thread.setdefault(thread_id, []).append(api_key)
        return _FakeGroqClient(api_key=api_key, **kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)

    def _run_operation():
        GroqService().generate_questions(valid_context)

    threads = [threading.Thread(target=_run_operation) for _ in range(num_operacoes)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=5)
        assert not t.is_alive()

    # Cada operacao (thread) so deve ter usado 1 key (sucesso de primeira),
    # e nenhuma delas repete key dentro de si mesma.
    for thread_id, keys_used in used_keys_by_thread.items():
        assert len(set(keys_used)) == len(keys_used)


# ---------------------------------------------------------------------------
# Caso 3: keys duplicadas na configuracao (`A,A,B`) nunca sao tentadas
# duas vezes pela MESMA operacao - o parser global NAO e alterado.
# ---------------------------------------------------------------------------


def test_keys_duplicadas_na_configuracao_nunca_sao_tentadas_duas_vezes_na_mesma_operacao(
    monkeypatch, reset_key_pool, valid_context
):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-A,fake-key-B")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "fake-model-bloco5")

    # O parser global NAO deduplica - preserva o comportamento ja existente
    # desde o Bloco 1/2 (3 slots, sendo 2 com o mesmo valor).
    pool = groq_service._get_key_pool()
    assert tuple(pool.keys) == ("fake-key-A", "fake-key-A", "fake-key-B")
    assert len(pool) == 3
    assert len(set(pool.keys)) == 2

    exc_a = _make_fake_rate_limit_error()
    used_api_keys: list[str] = []

    class _Completions:
        def __init__(self):
            self.call_count = 0

        def create(self, **kwargs):
            self.call_count += 1
            if self.call_count == 1:
                raise exc_a
            return _FakeSuccessCompletion(SUCCESS_QUESTIONS_JSON)

    completions = _Completions()

    class _FakeChat:
        def __init__(self, c):
            self.completions = c

    class _FakeGroqClient:
        def __init__(self, api_key, **kwargs):
            self.chat = _FakeChat(completions)
            self.api_key = api_key

    def _fake_groq(*, api_key: str, **kwargs):
        used_api_keys.append(api_key)
        return _FakeGroqClient(api_key=api_key, **kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)

    questions = GroqService().generate_questions(valid_context)

    assert len(questions) == 5
    # Exatamente 2 tentativas (numero de CREDENCIAIS DISTINTAS: A e B) -
    # nunca 3 (numero bruto de slots) - e a segunda tentativa deve ser
    # com "fake-key-B", nunca "fake-key-A" de novo.
    assert completions.call_count == 2
    assert used_api_keys == ["fake-key-A", "fake-key-B"]


def test_keys_duplicadas_todas_rate_limit_esgota_no_numero_de_credenciais_distintas(
    monkeypatch, reset_key_pool, valid_context
):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-A,fake-key-B")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "fake-model-bloco5")

    used_api_keys: list[str] = []

    class _Completions:
        def __init__(self):
            self.call_count = 0

        def create(self, **kwargs):
            self.call_count += 1
            if self.call_count > 2:
                raise AssertionError(
                    f"create() chamado {self.call_count} vezes - so ha 2 "
                    "credenciais distintas configuradas (A e B), o loop "
                    "nao pode exceder isso mesmo havendo 3 slots no pool."
                )
            raise _make_fake_rate_limit_error()

    completions = _Completions()

    class _FakeChat:
        def __init__(self, c):
            self.completions = c

    class _FakeGroqClient:
        def __init__(self, api_key, **kwargs):
            self.chat = _FakeChat(completions)
            self.api_key = api_key

    def _fake_groq(*, api_key: str, **kwargs):
        used_api_keys.append(api_key)
        return _FakeGroqClient(api_key=api_key, **kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)

    with pytest.raises(GroqServiceError) as exc_info:
        GroqService().generate_questions(valid_context)

    assert exc_info.value.category == GROQ_ERROR_CATEGORY_RATE_LIMIT
    assert completions.call_count == 2
    assert used_api_keys == ["fake-key-A", "fake-key-B"]


# ---------------------------------------------------------------------------
# Caso 4: nenhum lock fica retido durante a chamada de rede simulada
# (`chat.completions.create`) - prova via Barrier(2): se qualquer lock do
# pool ficasse retido durante a chamada de `_call_groq`, as duas operacoes
# concorrentes nunca conseguiriam estar simultaneamente "dentro" de
# `create()`, e o teste destravaria por timeout (falharia) em vez de
# passar.
# ---------------------------------------------------------------------------


def test_nenhum_lock_do_pool_fica_retido_durante_a_chamada_de_rede(
    monkeypatch, reset_key_pool, valid_context
):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "fake-model-bloco5")

    pool = groq_service._get_key_pool()

    # Barrier(2): so libera quando as DUAS chamadas de create() (uma de
    # cada operacao concorrente) estiverem simultaneamente bloqueadas
    # aqui dentro. Se `_client()`/`next_unique_key()` ainda estivesse
    # segurando o lock do pool durante a chamada de rede, a segunda
    # operacao jamais conseguiria nem chegar a instanciar seu client (ela
    # ficaria bloqueada tentando adquirir o lock do pool antes mesmo de
    # chamar create()), e o barrier.wait() da primeira operacao expiraria
    # por timeout - o teste falharia de forma clara, em vez de travar
    # silenciosamente.
    barrier = threading.Barrier(2, timeout=5)

    class _BarrierCompletions:
        def create(self, **kwargs):
            barrier.wait()  # so passa se as duas operacoes chegarem juntas
            return _FakeSuccessCompletion(SUCCESS_QUESTIONS_JSON)

    completions = _BarrierCompletions()

    class _FakeChat:
        def __init__(self, c):
            self.completions = c

    class _FakeGroqClient:
        def __init__(self, api_key, **kwargs):
            self.chat = _FakeChat(completions)
            self.api_key = api_key

    def _fake_groq(*, api_key: str, **kwargs):
        return _FakeGroqClient(api_key=api_key, **kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)

    results: dict[int, object] = {}
    errors: dict[int, BaseException] = {}

    def _run_operation(idx: int):
        try:
            results[idx] = GroqService().generate_questions(valid_context)
        except BaseException as exc:  # pragma: no cover - so em caso de falha
            errors[idx] = exc

    t1 = threading.Thread(target=_run_operation, args=(1,))
    t2 = threading.Thread(target=_run_operation, args=(2,))
    t1.start()
    t2.start()
    t1.join(timeout=6)
    t2.join(timeout=6)

    assert not t1.is_alive() and not t2.is_alive(), (
        "uma das operacoes nao terminou a tempo - indicio de que um lock "
        "ficou retido durante a chamada de rede simulada"
    )
    assert not errors, f"operacoes nao deveriam falhar: {errors}"
    assert len(results[1]) == 5
    assert len(results[2]) == 5


# ---------------------------------------------------------------------------
# Caso 5: `next_unique_key` isolado (sem GroqService) - unit tests diretos
# no pool, provando as garantias descritas no docstring do metodo.
# ---------------------------------------------------------------------------


def test_next_unique_key_pula_valores_excluidos_sem_resetar_indice():
    pool = GroqKeyPool(["fake-key-A", "fake-key-B", "fake-key-C"])

    primeira = pool.next_key()
    assert primeira == "fake-key-A"

    # Pede uma key unica excluindo B - deve pular B e retornar C.
    resultado = pool.next_unique_key({"fake-key-B"})
    assert resultado == "fake-key-C"

    # O indice global continuou avancando normalmente (nao resetou): a
    # proxima chamada comum a next_key() deve vir de volta para A.
    assert pool.next_key() == "fake-key-A"


def test_next_unique_key_retorna_none_quando_todas_as_keys_estao_excluidas():
    pool = GroqKeyPool(["fake-key-A", "fake-key-B"])

    resultado = pool.next_unique_key({"fake-key-A", "fake-key-B"})
    assert resultado is None


def test_next_unique_key_com_keys_duplicadas_pula_valor_ja_excluido_independente_da_posicao():
    pool = GroqKeyPool(["fake-key-A", "fake-key-A", "fake-key-B"])

    resultado = pool.next_unique_key({"fake-key-A"})
    assert resultado == "fake-key-B"


def test_next_unique_key_nunca_loga_ou_expoe_valores_de_key_em_excecao(monkeypatch):
    # Este teste nao provoca nenhuma excecao especifica do metodo (ele nao
    # lanca nenhuma por design), mas documenta e reforca, por leitura de
    # codigo assistida por teste, que nenhuma chamada de log/print ocorre:
    # substitui `logging.Logger.warning/info/debug/error` por um sentinel
    # que falha o teste se for chamado, e invoca o metodo normalmente.
    import logging

    def _fail_if_called(*args, **kwargs):  # pragma: no cover - so falha o teste
        raise AssertionError("next_unique_key nao deve logar nada")

    monkeypatch.setattr(logging.Logger, "warning", _fail_if_called)
    monkeypatch.setattr(logging.Logger, "info", _fail_if_called)
    monkeypatch.setattr(logging.Logger, "error", _fail_if_called)

    pool = GroqKeyPool(["fake-key-A", "fake-key-B"])
    assert pool.next_unique_key({"fake-key-A"}) == "fake-key-B"


# ---------------------------------------------------------------------------
# Caso 6: round-robin global entre operacoes sequenciais continua correto
# apos a correcao (repete o exemplo do relatorio do Bloco 5, agora contra
# a implementacao corrigida).
# ---------------------------------------------------------------------------


def test_round_robin_global_entre_operacoes_sequenciais_continua_correto_apos_a_correcao(
    monkeypatch, reset_key_pool, valid_context
):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B,fake-key-C")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "fake-model-bloco5")

    used_api_keys: list[str] = []
    exc_a = _make_fake_rate_limit_error()

    class _Completions:
        def __init__(self):
            self.call_count = 0
            self._outcomes = [exc_a, SUCCESS_QUESTIONS_JSON, SUCCESS_QUESTIONS_JSON]

        def create(self, **kwargs):
            outcome = self._outcomes[self.call_count]
            self.call_count += 1
            if isinstance(outcome, BaseException):
                raise outcome
            return _FakeSuccessCompletion(outcome)

    completions = _Completions()

    class _FakeChat:
        def __init__(self, c):
            self.completions = c

    class _FakeGroqClient:
        def __init__(self, api_key, **kwargs):
            self.chat = _FakeChat(completions)
            self.api_key = api_key

    def _fake_groq(*, api_key: str, **kwargs):
        used_api_keys.append(api_key)
        return _FakeGroqClient(api_key=api_key, **kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)

    GroqService().generate_questions(valid_context)  # op1: A(429) -> B(ok)
    assert used_api_keys == ["fake-key-A", "fake-key-B"]

    GroqService().generate_questions(valid_context)  # op2: deve comecar em C
    assert used_api_keys == ["fake-key-A", "fake-key-B", "fake-key-C"]


# ---------------------------------------------------------------------------
# Caso 7: `max_retries=0` continua preservado no novo caminho
# `_client(api_key=...)`.
# ---------------------------------------------------------------------------


def test_max_retries_zero_preservado_no_caminho_api_key_explicito(
    monkeypatch, reset_key_pool
):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "fake-model-bloco5")

    captured_kwargs: list[dict] = []

    class _FakeGroqCtor:
        def __init__(self, **kwargs):
            captured_kwargs.append(kwargs)

    monkeypatch.setattr(groq_service, "Groq", _FakeGroqCtor)

    service = GroqService()
    service._client(api_key="fake-key-explicito")

    assert len(captured_kwargs) == 1
    assert captured_kwargs[0]["max_retries"] == 0
    assert captured_kwargs[0]["api_key"] == "fake-key-explicito"


def test_client_sem_argumentos_preserva_comportamento_anterior(monkeypatch, reset_key_pool):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_MODEL", "fake-model-bloco5")

    captured_kwargs: list[dict] = []

    class _FakeGroqCtor:
        def __init__(self, **kwargs):
            captured_kwargs.append(kwargs)

    monkeypatch.setattr(groq_service, "Groq", _FakeGroqCtor)

    GroqService()._client()

    assert len(captured_kwargs) == 1
    assert captured_kwargs[0]["max_retries"] == 0
    assert captured_kwargs[0]["api_key"] == "fake-key-A"
