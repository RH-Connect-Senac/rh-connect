"""Testes do Bloco 2: pool de keys + round-robin thread-safe.

Cobre exclusivamente `GroqKeyPool`/`GroqKeyPoolError` (key_pool.py).

Escopo explicito deste bloco (branch work/groq-roteamento-chaves):
- NAO testa `_client()`, `max_retries`, fallback 429, tratamento de erro por
  subclasse ou logging de fallback - nada disso foi implementado nesta
  rodada.
- NAO testa deduplicacao - duplicatas continuam preservadas de proposito.
- NAO cria nenhum singleton global do pool.
- Usa somente valores de chave obviamente falsos (ex.: "fake-key-A").
  Nenhuma chamada real a Groq acontece em nenhum destes testes.
"""

from __future__ import annotations

import threading
from collections import Counter

import pytest

from groq_service import parse_groq_api_keys
from key_pool import GroqKeyPool, GroqKeyPoolError


def test_tres_keys_faz_round_robin_a_b_c_a():
    pool = GroqKeyPool(["fake-key-A", "fake-key-B", "fake-key-C"])

    assert [pool.next_key() for _ in range(4)] == [
        "fake-key-A",
        "fake-key-B",
        "fake-key-C",
        "fake-key-A",
    ]


def test_next_key_with_slot_retorna_posicao_logica_sem_alterar_round_robin():
    pool = GroqKeyPool(["fake-key-A", "fake-key-B", "fake-key-C"])

    assert [pool.next_key_with_slot() for _ in range(4)] == [
        ("fake-key-A", 1),
        ("fake-key-B", 2),
        ("fake-key-C", 3),
        ("fake-key-A", 1),
    ]


def test_uma_unica_key_sempre_repete_a_mesma():
    pool = GroqKeyPool(["fake-key-single"])

    assert [pool.next_key() for _ in range(4)] == ["fake-key-single"] * 4


def test_duas_keys_alterna_a_b_a_b():
    pool = GroqKeyPool(["fake-key-A", "fake-key-B"])

    assert [pool.next_key() for _ in range(4)] == [
        "fake-key-A",
        "fake-key-B",
        "fake-key-A",
        "fake-key-B",
    ]


def test_quantidade_dinamica_de_keys_sem_limite_fixo():
    fake_keys = [f"fake-key-{i}" for i in range(5)]
    pool = GroqKeyPool(fake_keys)

    produced = [pool.next_key() for _ in range(len(fake_keys) * 2)]
    assert produced == fake_keys + fake_keys


def test_keys_expostas_sao_copia_imutavel_na_ordem_original():
    original = ["fake-key-A", "fake-key-B", "fake-key-C"]
    pool = GroqKeyPool(original)

    assert pool.keys == ("fake-key-A", "fake-key-B", "fake-key-C")
    assert isinstance(pool.keys, tuple)


def test_duplicatas_sao_preservadas_no_round_robin():
    pool = GroqKeyPool(["fake-key-A", "fake-key-A", "fake-key-B"])

    assert [pool.next_key() for _ in range(4)] == [
        "fake-key-A",
        "fake-key-A",
        "fake-key-B",
        "fake-key-A",
    ]


def test_lista_vazia_levanta_erro_controlado():
    with pytest.raises(GroqKeyPoolError):
        GroqKeyPool([])


def test_mensagem_de_erro_de_pool_vazio_nao_contem_keys():
    with pytest.raises(GroqKeyPoolError) as exc_info:
        GroqKeyPool([])

    message = str(exc_info.value)
    assert "fake-key" not in message


def test_pool_nao_e_afetado_por_mutacao_posterior_da_lista_original():
    original = ["fake-key-A", "fake-key-B"]
    pool = GroqKeyPool(original)

    # Mutacao externa DEPOIS de construir o pool - nao deve afetar o pool.
    original.append("fake-key-C")
    original[0] = "fake-key-mutada"

    assert [pool.next_key() for _ in range(3)] == [
        "fake-key-A",
        "fake-key-B",
        "fake-key-A",
    ]
    # A lista original do chamador tambem nao foi alterada pelo pool.
    assert original == ["fake-key-mutada", "fake-key-B", "fake-key-C"]


def test_pool_nao_loga_nada(caplog):
    with caplog.at_level("DEBUG"):
        pool = GroqKeyPool(["fake-key-A", "fake-key-B"])
        for _ in range(5):
            pool.next_key()

    assert caplog.records == []


def test_pool_pode_ser_construido_a_partir_do_parser_do_bloco_1(monkeypatch):
    # Demonstra que o pool (Bloco 2) compoe com `parse_groq_api_keys`
    # (Bloco 1) quando usado explicitamente em codigo de teste - sem criar
    # nenhuma conexao automatica/global entre os dois nesta rodada.
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B,fake-key-C")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    keys = parse_groq_api_keys()
    pool = GroqKeyPool(keys)

    assert [pool.next_key() for _ in range(4)] == [
        "fake-key-A",
        "fake-key-B",
        "fake-key-C",
        "fake-key-A",
    ]


def test_concorrencia_com_multiplas_threads_nao_causa_race_condition_no_indice():
    """Prova que o `threading.Lock` protege corretamente o indice.

    Sem lock (ou com um lock que nao protegesse de fato o
    read-modify-write do indice), chamadas concorrentes a `next_key()`
    poderiam: retornar a mesma key duas vezes para chamadas diferentes
    (leitura duplicada antes do avanco), ou perder avancos do indice
    (escrita perdida) - o que quebraria a contagem total e a distribuicao
    entre as keys.

    Com 3 keys e um total de chamadas multiplo de 3, distribuidas entre
    varias threads, o resultado esperado e deterministico independentemente
    da ordem de intercalacao das threads: cada key deve ter sido selecionada
    exatamente `total_calls / 3` vezes, e a soma de todas as selecoes deve
    ser exatamente `total_calls` (nenhuma selecao perdida ou duplicada).
    """
    keys = ["fake-key-A", "fake-key-B", "fake-key-C"]
    pool = GroqKeyPool(keys)

    num_threads = 8
    calls_per_thread = 300
    total_calls = num_threads * calls_per_thread  # 2400, multiplo de 3

    results: list[str] = []
    results_lock = threading.Lock()  # protege apenas a lista de resultado do teste

    def worker() -> None:
        local_results = [pool.next_key() for _ in range(calls_per_thread)]
        with results_lock:
            results.extend(local_results)

    threads = [threading.Thread(target=worker) for _ in range(num_threads)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert len(results) == total_calls

    counts = Counter(results)
    assert set(counts.keys()) == set(keys)

    expected_per_key = total_calls // len(keys)
    for key in keys:
        assert counts[key] == expected_per_key


def test_next_unique_key_pula_key_em_cooldown(monkeypatch):
    monkeypatch.setattr("key_pool.time.monotonic", lambda: 100.0)
    pool = GroqKeyPool(["fake-key-A", "fake-key-B"])

    pool.mark_rate_limited("fake-key-A", 30)

    assert pool.next_unique_key(set()) == "fake-key-B"


def test_next_unique_key_with_slot_retorna_slot_da_key_escolhida(monkeypatch):
    monkeypatch.setattr("key_pool.time.monotonic", lambda: 100.0)
    pool = GroqKeyPool(["fake-key-A", "fake-key-B", "fake-key-C"])

    pool.mark_rate_limited("fake-key-A", 30)

    assert pool.next_unique_key_with_slot(set()) == ("fake-key-B", 2)


def test_key_em_cooldown_volta_automaticamente_apos_expirar(monkeypatch):
    now = 100.0
    monkeypatch.setattr("key_pool.time.monotonic", lambda: now)
    pool = GroqKeyPool(["fake-key-A", "fake-key-B"])

    pool.mark_rate_limited("fake-key-A", 10)

    now = 111.0
    assert pool.next_unique_key(set()) == "fake-key-A"


def test_concorrencia_com_multiplas_threads_respeita_cooldown_em_next_unique_key(monkeypatch):
    monkeypatch.setattr("key_pool.time.monotonic", lambda: 100.0)
    pool = GroqKeyPool(["fake-key-A", "fake-key-B", "fake-key-C"])
    pool.mark_rate_limited("fake-key-A", 30)

    num_threads = 8
    calls_per_thread = 100
    results: list[str] = []
    results_lock = threading.Lock()

    def worker() -> None:
        local_results = [pool.next_unique_key(set()) for _ in range(calls_per_thread)]
        with results_lock:
            results.extend(key for key in local_results if key is not None)

    threads = [threading.Thread(target=worker) for _ in range(num_threads)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert "fake-key-A" not in results
    assert set(results) == {"fake-key-B", "fake-key-C"}
