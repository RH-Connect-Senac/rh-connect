"""Local concurrency limiter for full Groq interview evaluations."""

from __future__ import annotations

import logging
import os
import threading
import time
from dataclasses import dataclass

logger = logging.getLogger(__name__)

_DEFAULT_MAX_CONCURRENCY = 2
_DEFAULT_QUEUE_TIMEOUT_SECONDS = 10.0


class EvaluationCapacityError(Exception):
    """Raised when no local evaluation slot is available in time."""

    status_code = 503

    def __init__(self) -> None:
        super().__init__(
            "Capacidade temporariamente indisponivel para avaliar entrevista. "
            "Tente novamente em instantes."
        )


@dataclass(frozen=True)
class EvaluationLimiterSnapshot:
    active_evaluations: int
    waiting_evaluations: int
    max_concurrency: int


class EvaluationLease:
    def __init__(self, limiter: "EvaluationLimiter", queue_wait_ms: float) -> None:
        self._limiter = limiter
        self.queue_wait_ms = queue_wait_ms
        self._released = False

    def release(self) -> None:
        if self._released:
            return
        self._released = True
        self._limiter.release()

    def __enter__(self) -> "EvaluationLease":
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        self.release()


class EvaluationLimiter:
    """Thread-safe, per-process limiter for complete evaluation operations."""

    def __init__(self, *, max_concurrency: int, queue_timeout_seconds: float) -> None:
        self.max_concurrency = max(1, max_concurrency)
        self.queue_timeout_seconds = max(0.0, queue_timeout_seconds)
        self._semaphore = threading.BoundedSemaphore(self.max_concurrency)
        self._lock = threading.Lock()
        self._active_evaluations = 0
        self._waiting_evaluations = 0

    def acquire(self) -> EvaluationLease:
        started_at = time.monotonic()
        with self._lock:
            self._waiting_evaluations += 1

        acquired = self._semaphore.acquire(timeout=self.queue_timeout_seconds)
        queue_wait_ms = (time.monotonic() - started_at) * 1000

        with self._lock:
            self._waiting_evaluations -= 1
            if acquired:
                self._active_evaluations += 1
            snapshot = self.snapshot()

        if not acquired:
            logger.warning(
                "Capacidade local esgotada em POST /evaluate: %s",
                {
                    "active_evaluations": snapshot.active_evaluations,
                    "waiting_evaluations": snapshot.waiting_evaluations,
                    "max_concurrency": snapshot.max_concurrency,
                    "queue_wait_ms": round(queue_wait_ms, 1),
                    "capacity_rejected": True,
                },
            )
            raise EvaluationCapacityError()

        logger.info(
            "Vaga local adquirida para POST /evaluate: %s",
            {
                "active_evaluations": snapshot.active_evaluations,
                "waiting_evaluations": snapshot.waiting_evaluations,
                "max_concurrency": snapshot.max_concurrency,
                "queue_wait_ms": round(queue_wait_ms, 1),
                "capacity_rejected": False,
            },
        )
        return EvaluationLease(self, queue_wait_ms)

    def release(self) -> None:
        with self._lock:
            if self._active_evaluations > 0:
                self._active_evaluations -= 1
            snapshot = self.snapshot()

        self._semaphore.release()
        logger.info(
            "Vaga local liberada para POST /evaluate: %s",
            {
                "active_evaluations": snapshot.active_evaluations,
                "waiting_evaluations": snapshot.waiting_evaluations,
                "max_concurrency": snapshot.max_concurrency,
            },
        )

    def snapshot(self) -> EvaluationLimiterSnapshot:
        return EvaluationLimiterSnapshot(
            active_evaluations=self._active_evaluations,
            waiting_evaluations=self._waiting_evaluations,
            max_concurrency=self.max_concurrency,
        )


_evaluation_limiter: EvaluationLimiter | None = None
_evaluation_limiter_init_lock = threading.Lock()


def get_evaluation_limiter() -> EvaluationLimiter:
    global _evaluation_limiter

    if _evaluation_limiter is None:
        with _evaluation_limiter_init_lock:
            if _evaluation_limiter is None:
                _evaluation_limiter = EvaluationLimiter(
                    max_concurrency=_parse_max_concurrency(),
                    queue_timeout_seconds=_parse_queue_timeout_seconds(),
                )

    return _evaluation_limiter


def reset_evaluation_limiter_for_tests() -> None:
    global _evaluation_limiter
    with _evaluation_limiter_init_lock:
        _evaluation_limiter = None


def _parse_max_concurrency() -> int:
    raw_value = os.getenv("GROQ_EVALUATE_MAX_CONCURRENCY", "").strip()
    if not raw_value:
        return _DEFAULT_MAX_CONCURRENCY

    try:
        parsed = int(raw_value)
    except ValueError:
        return _DEFAULT_MAX_CONCURRENCY

    if parsed < 1:
        return _DEFAULT_MAX_CONCURRENCY
    return parsed


def _parse_queue_timeout_seconds() -> float:
    raw_value = os.getenv("GROQ_EVALUATE_QUEUE_TIMEOUT_SECONDS", "").strip()
    if not raw_value:
        return _DEFAULT_QUEUE_TIMEOUT_SECONDS

    try:
        parsed = float(raw_value)
    except ValueError:
        return _DEFAULT_QUEUE_TIMEOUT_SECONDS

    if parsed < 0:
        return _DEFAULT_QUEUE_TIMEOUT_SECONDS
    return parsed
