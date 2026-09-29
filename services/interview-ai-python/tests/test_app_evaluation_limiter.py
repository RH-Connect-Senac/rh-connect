"""Integration tests for the /evaluate local concurrency limiter."""

from __future__ import annotations

import logging
import threading
import time

import pytest

import app as app_module
from evaluation_limiter import get_evaluation_limiter, reset_evaluation_limiter_for_tests
from groq_service import GroqServiceError


VALID_PAYLOAD = {
    "context": {"title": "Vaga de Teste"},
    "answers": [
        {
            "questionId": 1,
            "questionText": "Pergunta?",
            "questionType": "Tecnica",
            "answer": "Resposta suficientemente detalhada para teste.",
        }
    ],
}

SUCCESS_EVALUATION = {
    "scores": {
        "Clareza": 8,
        "Coerência": 8,
        "Objetividade": 8,
        "Domínio": 8,
        "Organização": 8,
        "Aderência": 8,
        "Exemplos": 8,
    },
    "overallScore": 8,
    "strengths": [],
    "improvements": [],
    "recommendations": [],
    "summary": "ok",
    "questionsEvaluation": [],
}


@pytest.fixture(autouse=True)
def reset_limiter(monkeypatch):
    monkeypatch.delenv("GROQ_EVALUATE_MAX_CONCURRENCY", raising=False)
    monkeypatch.delenv("GROQ_EVALUATE_QUEUE_TIMEOUT_SECONDS", raising=False)
    reset_evaluation_limiter_for_tests()
    yield
    reset_evaluation_limiter_for_tests()


def _client():
    return app_module.create_app().test_client()


def test_configuracao_de_logging_exibe_info_sem_duplicar_handlers():
    app_module.configure_logging()
    app_module.configure_logging()

    root_logger = logging.getLogger()
    marked_handlers = [
        handler
        for handler in root_logger.handlers
        if getattr(handler, app_module._RH_CONNECT_LOG_HANDLER_MARKER, False)
    ]

    assert root_logger.level <= logging.INFO
    assert len(marked_handlers) <= 1


def test_evaluate_rejeita_por_capacidade_sem_chamar_groq(monkeypatch):
    monkeypatch.setenv("GROQ_EVALUATE_MAX_CONCURRENCY", "1")
    monkeypatch.setenv("GROQ_EVALUATE_QUEUE_TIMEOUT_SECONDS", "0")
    limiter = get_evaluation_limiter()
    held_lease = limiter.acquire()
    calls = 0

    class _FakeGroqService:
        def evaluate_interview(self, context, answers):
            nonlocal calls
            calls += 1
            return SUCCESS_EVALUATION

    monkeypatch.setattr(app_module, "GroqService", _FakeGroqService)

    response = _client().post("/evaluate", json=VALID_PAYLOAD)

    held_lease.release()
    assert response.status_code == 503
    assert "Capacidade temporariamente indisponivel" in response.get_json()["error"]
    assert calls == 0


def test_evaluate_libera_vaga_apos_sucesso(monkeypatch):
    monkeypatch.setenv("GROQ_EVALUATE_MAX_CONCURRENCY", "1")
    monkeypatch.setenv("GROQ_EVALUATE_QUEUE_TIMEOUT_SECONDS", "0.1")
    calls = 0

    class _FakeGroqService:
        def evaluate_interview(self, context, answers):
            nonlocal calls
            calls += 1
            return SUCCESS_EVALUATION

    monkeypatch.setattr(app_module, "GroqService", _FakeGroqService)
    client = _client()

    first = client.post("/evaluate", json=VALID_PAYLOAD)
    second = client.post("/evaluate", json=VALID_PAYLOAD)

    assert first.status_code == 200
    assert second.status_code == 200
    assert calls == 2
    assert get_evaluation_limiter().snapshot().active_evaluations == 0


def test_log_final_do_evaluate_separa_fila_execucao_e_total(monkeypatch, caplog):
    monkeypatch.setenv("GROQ_EVALUATE_MAX_CONCURRENCY", "1")
    monkeypatch.setenv("GROQ_EVALUATE_QUEUE_TIMEOUT_SECONDS", "0.1")
    monotonic_values = iter([100.0, 105.0, 112.0])
    monkeypatch.setattr(app_module, "_monotonic", lambda: next(monotonic_values))

    class _FakeGroqService:
        def evaluate_interview(self, context, answers):
            return SUCCESS_EVALUATION

    monkeypatch.setattr(app_module, "GroqService", _FakeGroqService)

    with caplog.at_level("INFO"):
        response = _client().post("/evaluate", json=VALID_PAYLOAD)

    assert response.status_code == 200
    final_logs = [
        record.getMessage()
        for record in caplog.records
        if "POST /evaluate finalizado" in record.getMessage()
    ]
    assert len(final_logs) == 1
    assert "queue_wait_ms" in final_logs[0]
    assert "'execution_duration_ms': 7000.0" in final_logs[0]
    assert "'total_duration_ms': 12000.0" in final_logs[0]
    assert "evaluation_duration_ms" not in final_logs[0]


def test_evaluate_libera_vaga_apos_groq_service_error(monkeypatch):
    monkeypatch.setenv("GROQ_EVALUATE_MAX_CONCURRENCY", "1")
    monkeypatch.setenv("GROQ_EVALUATE_QUEUE_TIMEOUT_SECONDS", "0.1")
    outcomes = ["error", "success"]

    class _FakeGroqService:
        def evaluate_interview(self, context, answers):
            outcome = outcomes.pop(0)
            if outcome == "error":
                raise GroqServiceError("falha controlada", 502)
            return SUCCESS_EVALUATION

    monkeypatch.setattr(app_module, "GroqService", _FakeGroqService)
    client = _client()

    first = client.post("/evaluate", json=VALID_PAYLOAD)
    second = client.post("/evaluate", json=VALID_PAYLOAD)

    assert first.status_code == 502
    assert second.status_code == 200
    assert get_evaluation_limiter().snapshot().active_evaluations == 0


def test_duas_requisicoes_concorrentes_nao_executam_groq_ao_mesmo_tempo(monkeypatch):
    monkeypatch.setenv("GROQ_EVALUATE_MAX_CONCURRENCY", "1")
    monkeypatch.setenv("GROQ_EVALUATE_QUEUE_TIMEOUT_SECONDS", "1")

    entered_first = threading.Event()
    release_first = threading.Event()
    first_started = True
    max_active_inside_groq = 0
    active_inside_groq = 0
    lock = threading.Lock()

    class _FakeGroqService:
        def evaluate_interview(self, context, answers):
            nonlocal first_started, active_inside_groq, max_active_inside_groq
            with lock:
                active_inside_groq += 1
                max_active_inside_groq = max(max_active_inside_groq, active_inside_groq)
                is_first = first_started
                first_started = False

            try:
                snapshot = get_evaluation_limiter().snapshot()
                assert snapshot.active_evaluations == 1
                if is_first:
                    entered_first.set()
                    assert release_first.wait(1)
                return SUCCESS_EVALUATION
            finally:
                with lock:
                    active_inside_groq -= 1

    monkeypatch.setattr(app_module, "GroqService", _FakeGroqService)
    responses: list[int] = []
    errors: list[BaseException] = []

    def _post():
        try:
            response = _client().post("/evaluate", json=VALID_PAYLOAD)
            responses.append(response.status_code)
        except BaseException as exc:  # pragma: no cover - surfaced by assertion below
            errors.append(exc)

    first_thread = threading.Thread(target=_post)
    second_thread = threading.Thread(target=_post)
    first_thread.start()
    assert entered_first.wait(1)
    second_thread.start()
    time.sleep(0.05)

    assert max_active_inside_groq == 1

    release_first.set()
    first_thread.join(timeout=2)
    second_thread.join(timeout=2)

    assert errors == []
    assert sorted(responses) == [200, 200]
    assert max_active_inside_groq == 1
    assert get_evaluation_limiter().snapshot().active_evaluations == 0


def test_retry_e_fallback_permanecem_dentro_da_mesma_vaga(monkeypatch):
    monkeypatch.setenv("GROQ_EVALUATE_MAX_CONCURRENCY", "1")
    monkeypatch.setenv("GROQ_EVALUATE_QUEUE_TIMEOUT_SECONDS", "0.1")
    snapshots_during_internal_work = []

    class _FakeGroqService:
        def evaluate_interview(self, context, answers):
            # Simula trabalho interno composto por fallback/retry estrutural:
            # a rota deve ter adquirido uma unica vaga antes de entrar aqui,
            # e o trabalho interno completo deve permanecer dentro dela.
            for _ in range(3):
                snapshots_during_internal_work.append(
                    get_evaluation_limiter().snapshot().active_evaluations
                )
            return SUCCESS_EVALUATION

    monkeypatch.setattr(app_module, "GroqService", _FakeGroqService)

    response = _client().post("/evaluate", json=VALID_PAYLOAD)

    assert response.status_code == 200
    assert snapshots_during_internal_work == [1, 1, 1]
    assert get_evaluation_limiter().snapshot().active_evaluations == 0


def test_logs_do_limiter_nao_expoem_payload(monkeypatch, caplog):
    payload_marker = "resposta-sensivel-nao-deve-aparecer"
    secret_marker = "fake-key-nao-deve-aparecer"
    payload = {
        "context": {"title": secret_marker},
        "answers": [
            {
                "questionId": 1,
                "questionText": "Pergunta?",
                "answer": payload_marker,
            }
        ],
    }
    monkeypatch.setenv("GROQ_EVALUATE_MAX_CONCURRENCY", "1")
    monkeypatch.setenv("GROQ_EVALUATE_QUEUE_TIMEOUT_SECONDS", "0")
    held_lease = get_evaluation_limiter().acquire()

    with caplog.at_level("INFO"):
        response = _client().post("/evaluate", json=payload)

    held_lease.release()
    assert response.status_code == 503
    for record in caplog.records:
        message = record.getMessage()
        assert payload_marker not in message
        assert secret_marker not in message
