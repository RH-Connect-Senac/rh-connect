"""Tests for the local full-evaluation concurrency limiter."""

from __future__ import annotations

import threading
import time

import pytest

import evaluation_limiter
from evaluation_limiter import (
    EvaluationCapacityError,
    EvaluationLimiter,
    get_evaluation_limiter,
    reset_evaluation_limiter_for_tests,
)


@pytest.fixture(autouse=True)
def reset_limiter(monkeypatch):
    monkeypatch.delenv("GROQ_EVALUATE_MAX_CONCURRENCY", raising=False)
    monkeypatch.delenv("GROQ_EVALUATE_QUEUE_TIMEOUT_SECONDS", raising=False)
    reset_evaluation_limiter_for_tests()
    yield
    reset_evaluation_limiter_for_tests()


def test_defaults_seguros_quando_env_nao_existe():
    limiter = get_evaluation_limiter()

    assert limiter.max_concurrency == 2
    assert limiter.queue_timeout_seconds == 10.0


@pytest.mark.parametrize(
    "max_value,timeout_value",
    [
        ("0", "-1"),
        ("valor-invalido", "valor-invalido"),
    ],
)
def test_valores_invalidos_nao_criam_semaphore_invalido(monkeypatch, max_value, timeout_value):
    monkeypatch.setenv("GROQ_EVALUATE_MAX_CONCURRENCY", max_value)
    monkeypatch.setenv("GROQ_EVALUATE_QUEUE_TIMEOUT_SECONDS", timeout_value)

    limiter = get_evaluation_limiter()

    assert limiter.max_concurrency == 2
    assert limiter.queue_timeout_seconds == 10.0


def test_env_customizado_e_aplicado(monkeypatch):
    monkeypatch.setenv("GROQ_EVALUATE_MAX_CONCURRENCY", "3")
    monkeypatch.setenv("GROQ_EVALUATE_QUEUE_TIMEOUT_SECONDS", "0.25")

    limiter = get_evaluation_limiter()

    assert limiter.max_concurrency == 3
    assert limiter.queue_timeout_seconds == 0.25


def test_max_concurrency_um_impede_duas_avaliacoes_simultaneas():
    limiter = EvaluationLimiter(max_concurrency=1, queue_timeout_seconds=0.02)

    first_lease = limiter.acquire()

    with pytest.raises(EvaluationCapacityError):
        limiter.acquire()

    snapshot = limiter.snapshot()
    assert snapshot.active_evaluations == 1
    assert snapshot.max_concurrency == 1

    first_lease.release()
    assert limiter.snapshot().active_evaluations == 0


def test_segunda_avaliacao_aguarda_e_executa_se_primeira_liberar_antes_do_timeout():
    limiter = EvaluationLimiter(max_concurrency=1, queue_timeout_seconds=1.0)
    first_lease = limiter.acquire()
    acquired = threading.Event()
    finished = threading.Event()
    errors: list[BaseException] = []

    def _worker():
        try:
            with limiter.acquire():
                acquired.set()
        except BaseException as exc:  # pragma: no cover - surfaced by assertion below
            errors.append(exc)
        finally:
            finished.set()

    thread = threading.Thread(target=_worker)
    thread.start()

    deadline = time.monotonic() + 1
    while limiter.snapshot().waiting_evaluations == 0 and time.monotonic() < deadline:
        time.sleep(0.005)

    assert limiter.snapshot().waiting_evaluations == 1
    assert not acquired.is_set()

    first_lease.release()

    assert finished.wait(1)
    thread.join(timeout=1)
    assert acquired.is_set()
    assert errors == []
    assert limiter.snapshot().active_evaluations == 0


def test_requisicao_aguardando_falha_ao_ultrapassar_queue_timeout():
    limiter = EvaluationLimiter(max_concurrency=1, queue_timeout_seconds=0.02)
    first_lease = limiter.acquire()

    started_at = time.monotonic()
    with pytest.raises(EvaluationCapacityError):
        limiter.acquire()
    elapsed = time.monotonic() - started_at

    assert elapsed >= 0.015
    first_lease.release()


def test_semaphore_e_liberado_apos_sucesso():
    limiter = EvaluationLimiter(max_concurrency=1, queue_timeout_seconds=0.02)

    with limiter.acquire():
        assert limiter.snapshot().active_evaluations == 1

    assert limiter.snapshot().active_evaluations == 0
    with limiter.acquire():
        assert limiter.snapshot().active_evaluations == 1


def test_semaphore_e_liberado_apos_excecao():
    limiter = EvaluationLimiter(max_concurrency=1, queue_timeout_seconds=0.02)

    with pytest.raises(RuntimeError):
        with limiter.acquire():
            raise RuntimeError("falha simulada")

    assert limiter.snapshot().active_evaluations == 0
    with limiter.acquire():
        assert limiter.snapshot().active_evaluations == 1


def test_concorrencia_com_threads_nao_gera_deadlock():
    limiter = EvaluationLimiter(max_concurrency=1, queue_timeout_seconds=1.0)
    execution_order: list[int] = []
    errors: list[BaseException] = []
    start_barrier = threading.Barrier(4)

    def _worker(index: int):
        try:
            start_barrier.wait(timeout=1)
            with limiter.acquire():
                execution_order.append(index)
                time.sleep(0.01)
        except BaseException as exc:  # pragma: no cover - surfaced by assertion below
            errors.append(exc)

    threads = [threading.Thread(target=_worker, args=(index,)) for index in range(3)]
    for thread in threads:
        thread.start()

    start_barrier.wait(timeout=1)
    for thread in threads:
        thread.join(timeout=2)

    assert errors == []
    assert len(execution_order) == 3
    assert limiter.snapshot().active_evaluations == 0


def test_logs_nao_expoem_payload_ou_segredo(caplog):
    marker = "resposta-do-candidato-nao-deve-aparecer"
    secret_marker = "fake-key-nao-deve-aparecer"
    limiter = EvaluationLimiter(max_concurrency=1, queue_timeout_seconds=0.0)
    first_lease = limiter.acquire()

    with caplog.at_level("INFO"):
        with pytest.raises(EvaluationCapacityError):
            limiter.acquire()

    first_lease.release()

    for record in caplog.records:
        message = record.getMessage()
        assert marker not in message
        assert secret_marker not in message
