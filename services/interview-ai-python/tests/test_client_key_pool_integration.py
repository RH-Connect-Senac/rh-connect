"""Testes do Bloco 3: integracao do parser + pool com `_client()`, e `max_retries=0`.

Cobre exclusivamente a conexao entre `parse_groq_api_keys()` (Bloco 1),
`GroqKeyPool` (Bloco 2) e `GroqService._client()` (Bloco 3): construcao
lazy do pool por processo, selecao round-robin real usada por `_client()`,
`max_retries=0`, preservacao do timeout, reconciliacao de
`GroqKeyPoolError` -> `GroqConfigurationError`, e a correcao pontual de
concorrencia na propria inicializacao lazy do pool (`_key_pool_init_lock`,
double-checked locking).

Escopo explicito deste bloco (branch work/groq-roteamento-chaves):
- NAO testa fallback 429, subclasses de erro Groq ou qualquer
  observabilidade de fallback - nada disso foi implementado nesta rodada.
- NAO instancia nem chama a SDK Groq de verdade: `Groq` e substituido por um
  dublê (fake) que so registra os argumentos recebidos, sem nenhuma rede.
- Usa somente valores de chave obviamente falsos (ex.: "fake-key-A").

Isolamento entre testes: o pool de keys (`groq_service._key_pool`) e
mantido em uma variavel de modulo e persiste durante a vida do processo por
design (Bloco 3, requisito 1-2). Para testar isso sem vazar estado de um
teste para o outro, cada teste que depende do pool chama a fixture
`reset_key_pool`, que reseta esse estado antes e depois do teste usando
`groq_service._reset_key_pool_for_tests()` - uma funcao privada, criada
exclusivamente para uso em teste (nunca chamada em codigo de producao).
"""

from __future__ import annotations

import threading
import time
from collections import Counter

import pytest

import groq_service
from groq_service import GroqConfigurationError, GroqService


@pytest.fixture
def reset_key_pool():
    """Garante que cada teste comeca e termina sem pool de keys herdado."""
    groq_service._reset_key_pool_for_tests()
    yield
    groq_service._reset_key_pool_for_tests()


class _FakeGroqClient:
    """Dublê de `groq.Groq`: so registra os kwargs recebidos, sem rede."""

    def __init__(self, **kwargs):
        self.kwargs = kwargs


def _patch_groq_client(monkeypatch, calls: list[dict]):
    """Substitui `groq_service.Groq` por um dublê que grava cada chamada.

    `calls` recebe um dict por instanciacao, com os kwargs usados - isso e
    o que os testes usam para verificar api_key/timeout/max_retries sem
    tocar a SDK real.
    """

    def _fake_groq(**kwargs):
        calls.append(kwargs)
        return _FakeGroqClient(**kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)


def test_client_com_uma_unica_key(monkeypatch, reset_key_pool):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-single")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("REQUEST_TIMEOUT_SECONDS", "20")

    calls: list[dict] = []
    _patch_groq_client(monkeypatch, calls)

    service = GroqService()
    service._client()

    assert len(calls) == 1
    assert calls[0]["api_key"] == "fake-key-single"
    assert calls[0]["max_retries"] == 0
    assert calls[0]["timeout"] == 20


def test_client_com_multiplas_keys_faz_round_robin_a_b_c_a(monkeypatch, reset_key_pool):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B,fake-key-C")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    calls: list[dict] = []
    _patch_groq_client(monkeypatch, calls)

    service = GroqService()
    for _ in range(4):
        service._client()

    selected_keys = [call["api_key"] for call in calls]
    assert selected_keys == ["fake-key-A", "fake-key-B", "fake-key-C", "fake-key-A"]


def test_fallback_sem_groq_api_keys_usa_groq_api_key(monkeypatch, reset_key_pool):
    monkeypatch.delenv("GROQ_API_KEYS", raising=False)
    monkeypatch.setenv("GROQ_API_KEY", "fake-key-single")

    calls: list[dict] = []
    _patch_groq_client(monkeypatch, calls)

    GroqService()._client()

    assert calls[0]["api_key"] == "fake-key-single"


def test_groq_api_keys_tem_precedencia_sobre_groq_api_key(monkeypatch, reset_key_pool):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B")
    monkeypatch.setenv("GROQ_API_KEY", "fake-key-single")

    calls: list[dict] = []
    _patch_groq_client(monkeypatch, calls)

    GroqService()._client()

    assert calls[0]["api_key"] == "fake-key-A"


def test_nenhuma_key_configurada_levanta_groq_configuration_error(monkeypatch, reset_key_pool):
    # `GroqService.__init__` chama `load_dotenv()` (comportamento de
    # producao, nao alterado aqui). Sem isolar isso, ao remover
    # GROQ_API_KEYS/GROQ_API_KEY do ambiente do teste, `load_dotenv()`
    # preencheria essas variaveis de volta a partir do `.env` REAL de quem
    # estiver rodando os testes (python-dotenv nao sobrescreve variaveis ja
    # presentes, mas PREENCHE as que estao ausentes) - fazendo este teste
    # "achar" uma key valida no `.env` real e nunca exercitar o cenario
    # "nenhuma key configurada" que ele diz testar. Substituir
    # `groq_service.load_dotenv` por um no-op garante que o teste dependa
    # somente do ambiente controlado por `monkeypatch`, nunca do `.env`
    # real da maquina.
    monkeypatch.setattr(groq_service, "load_dotenv", lambda *args, **kwargs: None)

    monkeypatch.delenv("GROQ_API_KEYS", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    with pytest.raises(GroqConfigurationError):
        GroqService()._client()


def test_pool_nao_e_recriado_a_cada_chamada_de_client(monkeypatch, reset_key_pool):
    # Se _client() recriasse o GroqKeyPool a cada chamada, o indice sempre
    # voltaria a 0 e toda chamada retornaria a primeira key ("fake-key-A").
    # O round-robin real (A -> B -> C) so e possivel se o mesmo pool
    # persistir entre chamadas dentro do processo.
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B,fake-key-C")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    calls: list[dict] = []
    _patch_groq_client(monkeypatch, calls)

    service = GroqService()
    service._client()
    service._client()
    service._client()

    selected_keys = [call["api_key"] for call in calls]
    assert selected_keys == ["fake-key-A", "fake-key-B", "fake-key-C"]
    assert selected_keys != ["fake-key-A", "fake-key-A", "fake-key-A"]


def test_client_passa_api_key_timeout_e_max_retries_para_groq(monkeypatch, reset_key_pool):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("REQUEST_TIMEOUT_SECONDS", "35")

    calls: list[dict] = []
    _patch_groq_client(monkeypatch, calls)

    GroqService()._client()

    assert calls[0] == {
        "api_key": "fake-key-A",
        "timeout": 35,
        "max_retries": 0,
    }


def test_nenhum_cliente_real_e_instanciado_nem_chama_rede(monkeypatch, reset_key_pool):
    # O dublê usado em todos os testes deste arquivo nunca importa nem
    # instancia a classe `groq.Groq` real - apenas o dublê `_FakeGroqClient`
    # local, sem nenhuma dependencia de rede. Este teste documenta e reforça
    # essa garantia checando o tipo do objeto retornado por _client().
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    calls: list[dict] = []
    _patch_groq_client(monkeypatch, calls)

    client = GroqService()._client()

    # `groq_service.Groq` foi substituido pelo dublê `_patch_groq_client`;
    # o objeto retornado e sempre o dublê local, nunca a SDK real.
    assert isinstance(client, _FakeGroqClient)


def test_nenhuma_key_e_logada_ao_construir_client(monkeypatch, reset_key_pool, caplog):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    calls: list[dict] = []
    _patch_groq_client(monkeypatch, calls)

    with caplog.at_level("DEBUG"):
        GroqService()._client()
        GroqService()._client()

    for record in caplog.records:
        assert "fake-key" not in record.getMessage()


def test_mensagem_de_erro_de_configuracao_nao_contem_valores_de_key(monkeypatch, reset_key_pool):
    monkeypatch.setenv("GROQ_API_KEYS", "   ")
    monkeypatch.setenv("GROQ_API_KEY", "   ")

    with pytest.raises(GroqConfigurationError) as exc_info:
        GroqService()._client()

    message = str(exc_info.value)
    assert "fake-key" not in message


def test_inicializacao_lazy_do_pool_e_thread_safe(monkeypatch, reset_key_pool):
    """Cobre a correcao de concorrencia na inicializacao lazy do pool.

    Sem `_key_pool_init_lock` (double-checked locking), threads
    concorrentes poderiam todas ver `_key_pool is None` ao mesmo tempo,
    cada uma construir seu proprio `GroqKeyPool` (cada um comecando no
    indice 0) e uma atribuicao sobrescrever a outra - quebrando a garantia
    de um unico pool, com parsing feito uma unica vez, por processo.

    Usa um `threading.Barrier` para maximizar a chance de todas as threads
    chamarem `_get_key_pool()` o mais simultaneamente possivel, e um
    pequeno `time.sleep()` dentro do parsing (via monkeypatch) para alargar
    de proposito a janela entre o "check" e a atribuicao de `_key_pool` -
    sem esse alargamento, a secao critica real e rapida demais (poucas
    operacoes de string/lista, sem I/O) para o agendador de threads do
    Python trocar de contexto durante ela com frequencia, e o teste
    acabaria "passando" mesmo contra uma versao sem lock, sem provar nada.
    (Verifiquei isso manualmente: sem o `time.sleep`, este teste nao
    detectou a race condition em 15/15 execucoes contra uma copia
    deliberadamente sem `_key_pool_init_lock`; com o `time.sleep`, ele
    detecta a regressao de forma consistente - ver secao E da entrega.)
    """
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B,fake-key-C")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    # Ponto de partida: nenhum pool criado ainda neste processo (de teste).
    assert groq_service._key_pool is None

    # Conta quantas vezes o parsing das keys realmente executa - se a
    # inicializacao rodasse uma vez por thread (bug que esta correcao
    # evita), essa contagem seria > 1. O sleep alarga de proposito a janela
    # de corrida (ver docstring acima); e so instrumentacao de teste, nao
    # existe em `_get_key_pool()`/`parse_groq_api_keys()` reais.
    parse_calls: list[None] = []
    parse_calls_lock = threading.Lock()
    original_parse = groq_service.parse_groq_api_keys

    def _counting_parse():
        time.sleep(0.05)
        result = original_parse()
        with parse_calls_lock:
            parse_calls.append(None)
        return result

    monkeypatch.setattr(groq_service, "parse_groq_api_keys", _counting_parse)

    num_threads = 20
    barrier = threading.Barrier(num_threads)
    pool_instances: list[object] = []
    instances_lock = threading.Lock()

    def worker() -> None:
        barrier.wait()  # segura todas as threads ate todas estarem prontas
        pool = groq_service._get_key_pool()
        with instances_lock:
            pool_instances.append(pool)

    threads = [threading.Thread(target=worker) for _ in range(num_threads)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    # Todas as threads chamaram _get_key_pool() concorrentemente.
    assert len(pool_instances) == num_threads

    # Todas devem ter observado exatamente a MESMA instancia de
    # GroqKeyPool - apenas uma inicializacao aconteceu, nao uma por thread.
    first_instance = pool_instances[0]
    assert all(instance is first_instance for instance in pool_instances)

    # O parsing das keys so deve ter acontecido UMA vez, mesmo com 20
    # threads concorrentes chamando _get_key_pool() pela primeira vez.
    assert len(parse_calls) == 1


def test_round_robin_nao_reinicia_no_indice_0_com_chamadas_concorrentes_a_client(
    monkeypatch, reset_key_pool
):
    """Exercita o cenario real via `_client()` (nao so `_get_key_pool()`):
    varias threads chamando `_client()` concorrentemente, bem no momento da
    primeira inicializacao do pool, nao devem "reiniciar" o round-robin no
    indice 0 para cada uma. Com um numero de chamadas multiplo da
    quantidade de keys, a distribuicao final deve ser exatamente uniforme -
    prova de que existe um unico pool compartilhado com um unico indice,
    mesmo quando a inicializacao e disputada por multiplas threads.

    Como no teste anterior, um pequeno `time.sleep()` e injetado (via
    monkeypatch) no parsing das keys, so para esta instrumentacao de teste,
    para alargar de proposito a janela de corrida na primeira
    inicializacao - sem isso, a secao critica real e rapida demais para o
    agendador de threads do Python exercitar a corrida com confiabilidade.
    """
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B,fake-key-C")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    original_parse = groq_service.parse_groq_api_keys

    def _slow_parse():
        time.sleep(0.05)
        return original_parse()

    monkeypatch.setattr(groq_service, "parse_groq_api_keys", _slow_parse)

    calls: list[dict] = []
    calls_lock = threading.Lock()

    def _fake_groq(**kwargs):
        with calls_lock:
            calls.append(kwargs)
        return _FakeGroqClient(**kwargs)

    monkeypatch.setattr(groq_service, "Groq", _fake_groq)

    assert groq_service._key_pool is None

    num_threads = 9  # multiplo de 3 keys, para permitir contagem exata
    barrier = threading.Barrier(num_threads)
    service = GroqService()

    def worker() -> None:
        barrier.wait()
        service._client()

    threads = [threading.Thread(target=worker) for _ in range(num_threads)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert len(calls) == num_threads

    selected_keys = [call["api_key"] for call in calls]
    counts = Counter(selected_keys)
    assert set(counts.keys()) == {"fake-key-A", "fake-key-B", "fake-key-C"}

    expected_per_key = num_threads // 3
    for key in ("fake-key-A", "fake-key-B", "fake-key-C"):
        assert counts[key] == expected_per_key
