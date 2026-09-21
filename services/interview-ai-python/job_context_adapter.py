"""Adapter from the original Empregare parser to the RH Connect job context."""

from __future__ import annotations

from typing import Any

from extrair_empregare_original import extrair_vaga


class JobContextAdapterError(Exception):
    """Controlled error raised when the original parser cannot provide a context."""

    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code


def extract_job_context(url: Any) -> dict[str, Any]:
    source_url = _as_string(url)
    if not source_url:
        raise JobContextAdapterError("Informe a URL da vaga.", 400)

    try:
        original_job = extrair_vaga(source_url)
    except Exception as exc:
        raise JobContextAdapterError("Nao foi possivel extrair a vaga informada.", 502) from exc

    if not isinstance(original_job, dict):
        raise JobContextAdapterError("O parser original retornou dados invalidos.", 502)

    contract_type = (
        _as_optional_string(original_job.get("regime_contratacao"))
        or _as_optional_string(original_job.get("tipo_contrato"))
    )

    return {
        "title": _as_optional_string(original_job.get("titulo")),
        "company": _as_optional_string(original_job.get("empresa")),
        "summary": "",
        "activities": _as_string_list(original_job.get("atividades")),
        "requirements": _as_string_list(original_job.get("requisitos")),
        "location": _as_optional_string(original_job.get("localizacao")),
        "contractType": contract_type,
        "workMode": None,
        "sourceUrl": source_url,
    }


def _as_string(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _as_optional_string(value: Any) -> str | None:
    parsed = _as_string(value)
    return parsed or None


def _as_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    return [_as_string(item) for item in value if _as_string(item)]
