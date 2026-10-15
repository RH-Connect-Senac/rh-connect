"""Adapter from the original Empregare parser to the RH Connect job context."""

from __future__ import annotations

import logging
import socket
from typing import Any

import requests

from extrair_empregare_original import (
    AcessoBloqueadoError,
    PaginaBloqueadaError,
    VagaNaoEncontradaError,
    extrair_vaga_estrito,
)
from http_segura import (
    DestinoBloqueadoError,
    FalhaDnsError,
    RedirecionamentoNaoPermitidoError,
    RespostaMuitoGrandeError,
    UrlNaoPermitidaError,
)

logger = logging.getLogger(__name__)

# Codigos estaveis de erro (contrato com a API NestJS). Nunca devem carregar
# detalhes internos (IPs, hosts, stack traces): so o motivo em alto nivel.
CODIGO_URL_AUSENTE = "URL_AUSENTE"
CODIGO_URL_NAO_PERMITIDA = "URL_NAO_PERMITIDA"
CODIGO_REDIRECIONAMENTO_NAO_PERMITIDO = "REDIRECIONAMENTO_NAO_PERMITIDO"
CODIGO_DESTINO_BLOQUEADO = "DESTINO_BLOQUEADO"
CODIGO_DNS_FALHOU = "DNS_FALHOU"
CODIGO_ACESSO_VAGA_FALHOU = "ACESSO_VAGA_FALHOU"
CODIGO_TEMPO_ESGOTADO = "TEMPO_ESGOTADO"
CODIGO_REDIRECIONAMENTOS_EXCESSIVOS = "REDIRECIONAMENTOS_EXCESSIVOS"
CODIGO_RESPOSTA_MUITO_GRANDE = "RESPOSTA_MUITO_GRANDE"
CODIGO_VAGA_NAO_ENCONTRADA = "VAGA_NAO_ENCONTRADA"
CODIGO_VAGA_ACESSO_BLOQUEADO = "VAGA_ACESSO_BLOQUEADO"
CODIGO_VAGA_SEM_DADOS = "VAGA_SEM_DADOS"
CODIGO_EXTRACAO_FALHOU = "EXTRACAO_FALHOU"

# codigo -> (status HTTP, mensagem segura)
_ERROS: dict[str, tuple[int, str]] = {
    CODIGO_URL_AUSENTE: (400, "Informe a URL da vaga."),
    CODIGO_URL_NAO_PERMITIDA: (422, "Link da vaga nao permitido."),
    CODIGO_REDIRECIONAMENTO_NAO_PERMITIDO: (422, "Link da vaga nao permitido."),
    CODIGO_VAGA_SEM_DADOS: (422, "A vaga nao possui informacoes suficientes."),
    CODIGO_VAGA_NAO_ENCONTRADA: (404, "Vaga nao encontrada."),
    CODIGO_DESTINO_BLOQUEADO: (502, "Nao foi possivel acessar a vaga."),
    CODIGO_DNS_FALHOU: (502, "Nao foi possivel acessar a vaga."),
    CODIGO_ACESSO_VAGA_FALHOU: (502, "Nao foi possivel acessar a vaga."),
    CODIGO_REDIRECIONAMENTOS_EXCESSIVOS: (502, "Nao foi possivel acessar a vaga."),
    CODIGO_RESPOSTA_MUITO_GRANDE: (502, "Nao foi possivel acessar a vaga."),
    CODIGO_VAGA_ACESSO_BLOQUEADO: (502, "Nao foi possivel acessar a vaga."),
    CODIGO_TEMPO_ESGOTADO: (504, "Tempo esgotado ao acessar a vaga."),
    CODIGO_EXTRACAO_FALHOU: (500, "Nao foi possivel extrair a vaga informada."),
}


class JobContextAdapterError(Exception):
    """Controlled error raised when the original parser cannot provide a context."""

    def __init__(self, message: str, status_code: int = 422, code: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


def erro_por_codigo(codigo: str) -> JobContextAdapterError:
    status, mensagem = _ERROS[codigo]
    return JobContextAdapterError(mensagem, status, codigo)


def _cadeia_de_excecoes(exc: BaseException | None) -> list[BaseException]:
    """Percorre __cause__/__context__/.reason/.args (requests e urllib3 embrulham
    a excecao original, p.ex. DestinoBloqueadoError dentro de ConnectionError)."""
    vistas: list[BaseException] = []
    fila: list[Any] = [exc]
    while fila and len(vistas) < 50:
        atual = fila.pop()
        if not isinstance(atual, BaseException) or any(atual is v for v in vistas):
            continue
        vistas.append(atual)
        fila.append(atual.__cause__)
        fila.append(atual.__context__)
        fila.append(getattr(atual, "reason", None))
        fila.extend(getattr(atual, "args", ()) or ())
    return vistas


def classificar_erro_extracao(exc: BaseException) -> str:
    """Traduz uma excecao da extracao para um dos codigos estaveis."""
    cadeia = _cadeia_de_excecoes(exc)

    def contem(*tipos: type) -> bool:
        return any(isinstance(item, tipos) for item in cadeia)

    # Ordem importa: politica (nossa recusa) antes de falha de rede.
    if contem(RedirecionamentoNaoPermitidoError):
        return CODIGO_REDIRECIONAMENTO_NAO_PERMITIDO
    if contem(UrlNaoPermitidaError):
        return CODIGO_URL_NAO_PERMITIDA
    if contem(DestinoBloqueadoError):
        return CODIGO_DESTINO_BLOQUEADO
    if contem(requests.exceptions.Timeout, socket.timeout, TimeoutError):
        return CODIGO_TEMPO_ESGOTADO
    if contem(FalhaDnsError):
        return CODIGO_DNS_FALHOU
    if contem(RespostaMuitoGrandeError):
        return CODIGO_RESPOSTA_MUITO_GRANDE
    if contem(requests.exceptions.TooManyRedirects):
        return CODIGO_REDIRECIONAMENTOS_EXCESSIVOS
    if contem(VagaNaoEncontradaError):
        return CODIGO_VAGA_NAO_ENCONTRADA
    if contem(AcessoBloqueadoError, PaginaBloqueadaError):
        return CODIGO_VAGA_ACESSO_BLOQUEADO
    if contem(requests.exceptions.RequestException, OSError):
        return CODIGO_ACESSO_VAGA_FALHOU
    return CODIGO_EXTRACAO_FALHOU


def extract_job_context(url: Any) -> dict[str, Any]:
    source_url = _as_string(url)
    if not source_url:
        raise erro_por_codigo(CODIGO_URL_AUSENTE)

    try:
        original_job = extrair_vaga_estrito(source_url)
    except Exception as exc:
        codigo = classificar_erro_extracao(exc)
        # Log so com o tipo da excecao e o codigo: a mensagem pode conter
        # detalhes de infraestrutura e nunca vai para a resposta.
        logger.warning(
            "Falha ao extrair vaga: codigo=%s tipo=%s", codigo, type(exc).__name__
        )
        raise erro_por_codigo(codigo) from exc

    if not isinstance(original_job, dict):
        raise erro_por_codigo(CODIGO_EXTRACAO_FALHOU)

    contract_type = (
        _as_optional_string(original_job.get("regime_contratacao"))
        or _as_optional_string(original_job.get("tipo_contrato"))
    )

    title = _as_optional_string(original_job.get("titulo"))
    activities = _as_string_list(original_job.get("atividades"))
    requirements = _as_string_list(original_job.get("requisitos"))

    # Contexto vazio/insuficiente nunca vira sucesso: sem titulo, ou sem
    # nenhuma atividade/requisito, nao ha o que gerar perguntas.
    if not title or not (activities or requirements):
        logger.warning("Falha ao extrair vaga: codigo=%s", CODIGO_VAGA_SEM_DADOS)
        raise erro_por_codigo(CODIGO_VAGA_SEM_DADOS)

    return {
        "title": title,
        "company": _as_optional_string(original_job.get("empresa")),
        "summary": "",
        "activities": activities,
        "requirements": requirements,
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
