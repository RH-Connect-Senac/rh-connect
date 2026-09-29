"""Groq integration module."""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any

from dotenv import load_dotenv
from groq import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    Groq,
    InternalServerError,
    PermissionDeniedError,
    RateLimitError,
)

from key_pool import GroqKeyPool, GroqKeyPoolError
from schemas import EVALUATION_CRITERIA, QUESTION_TYPES

logger = logging.getLogger(__name__)


class GroqServiceError(Exception):
    """Controlled error raised by Groq integrations."""

    def __init__(
        self,
        message: str,
        status_code: int = 502,
        category: str | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        # Bloco 4: categoria controlada e testavel do erro (ver
        # GROQ_ERROR_CATEGORY_* abaixo), para que o restante do servico
        # saiba qual tipo de erro da Groq aconteceu sem precisar analisar
        # texto de mensagem. `None` para erros que nao vem de uma chamada a
        # Groq (ex.: GroqConfigurationError, erros de validacao de
        # payload).
        self.category = category
        self.metadata = metadata or {}


class GroqConfigurationError(GroqServiceError):
    """Raised when the local Groq configuration is missing."""

    def __init__(self, message: str):
        super().__init__(message, 500)


# Bloco 4 - categorias controladas de erro da Groq.
#
# Strings simples, nao um enum/framework novo: o objetivo e so permitir que
# o restante do servico (e testes) verifiquem `exc.category == "rate_limit"`
# em vez de analisar o texto da mensagem. Nenhuma dessas categorias, por si
# so, provoca retry, troca de key ou qualquer outra acao nesta rodada - isso
# fica para o Bloco 5 (que vai reagir especificamente a
# GROQ_ERROR_CATEGORY_RATE_LIMIT).
GROQ_ERROR_CATEGORY_RATE_LIMIT = "rate_limit"
GROQ_ERROR_CATEGORY_BAD_REQUEST = "bad_request"
GROQ_ERROR_CATEGORY_AUTHENTICATION = "authentication"
GROQ_ERROR_CATEGORY_PERMISSION_DENIED = "permission_denied"
GROQ_ERROR_CATEGORY_UPSTREAM_SERVER_ERROR = "upstream_server_error"
GROQ_ERROR_CATEGORY_TIMEOUT = "timeout"
GROQ_ERROR_CATEGORY_CONNECTION_ERROR = "connection_error"
GROQ_ERROR_CATEGORY_API_STATUS_ERROR = "api_status_error"
GROQ_ERROR_CATEGORY_OUTPUT_VALIDATION_FAILED = "output_validation_failed"

# Categoria dedicada (nao vem de `_translate_groq_error`/de uma excecao da
# SDK Groq): marca especificamente um `GroqServiceError` levantado por
# `_normalize_questions_evaluation` quando a Groq respondeu HTTP 200, mas
# `questionsEvaluation` veio estruturalmente incompleto/invalido (item fora
# do formato, questionId invalido, ou item faltando para alguma pergunta
# enviada). E o UNICO gatilho do retry estrutural (no maximo 1 vez) em
# `evaluate_interview` - nao se aplica a `scores` incompletos, JSON
# invalido/vazio, nem a nenhuma categoria de `_translate_groq_error`
# (rate_limit, bad_request, etc.), que continuam com seu comportamento
# existente (fallback de credencial ou erro imediato, respectivamente).
GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION = "structural_incomplete_evaluation"

# Numero maximo de tentativas de `evaluate_interview` quando (e somente
# quando) o erro for `GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION`:
# 2 = 1a tentativa + no maximo 1 retry estrutural. Nao e reaproveitado por
# `generate_questions` nem por `_execute_with_rate_limit_fallback` (rate
# limit continua sem alteracao, com seu proprio `max_attempts` baseado no
# numero de credenciais distintas).
_MAX_STRUCTURAL_EVALUATION_ATTEMPTS = 2
_DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS = 30.0


def _translate_groq_error(exc: Exception, *, action: str) -> GroqServiceError:
    """Traduz uma excecao levantada pela chamada a Groq (ou qualquer outra
    excecao inesperada) para um `GroqServiceError` com uma categoria
    controlada, programatica e testavel - sem depender de comparacao de
    texto da mensagem.

    `action` e um texto curto e FIXO (ex.: "gerar perguntas",
    "avaliar entrevista"), usado apenas para compor a mensagem de erro.
    Nunca deve receber dado dinamico do payload do usuario, do prompt ou da
    resposta da Groq.

    IMPORTANTE (escopo do Bloco 4): esta funcao SO classifica o erro. Ela
    nao chama `next_key()`, nao tenta outra key, nao faz retry manual nem
    sleep/backoff - o erro classificado sobe normalmente. Em particular,
    `RateLimitError` (429) e identificado com
    `GROQ_ERROR_CATEGORY_RATE_LIMIT`, mas isso ainda NAO troca de key nesta
    rodada; a reacao a essa categoria fica para o Bloco 5.

    A ordem das checagens importa: subclasses mais especificas de
    `APIStatusError` (RateLimitError, BadRequestError, AuthenticationError,
    PermissionDeniedError, InternalServerError) sao checadas antes da
    classe base `APIStatusError`; e `APITimeoutError` (subclasse de
    `APIConnectionError` na SDK) e checado antes de `APIConnectionError`.

    Seguranca: a mensagem retornada nunca inclui a API key, headers,
    request/response completos, prompt, respostas do candidato ou o corpo
    bruto retornado pela Groq - apenas texto fixo, a categoria e o status
    code. Preservar mais contexto tecnico (ex.: error code seguro da Groq)
    fica para um bloco de observabilidade futuro.
    """
    if isinstance(exc, RateLimitError):
        return GroqServiceError(
            f"A Groq retornou limite de requisicoes (429) ao {action}.",
            502,
            category=GROQ_ERROR_CATEGORY_RATE_LIMIT,
        )
    if isinstance(exc, BadRequestError):
        if getattr(exc, "status_code", None) == 400 and _extract_groq_error_code(exc) == "json_validate_failed":
            return GroqServiceError(
                f"A Groq retornou falha de validacao da saida ao {action}.",
                502,
                category=GROQ_ERROR_CATEGORY_OUTPUT_VALIDATION_FAILED,
            )
        return GroqServiceError(
            f"A Groq retornou requisicao invalida (400) ao {action}.",
            502,
            category=GROQ_ERROR_CATEGORY_BAD_REQUEST,
        )
    if isinstance(exc, AuthenticationError):
        return GroqServiceError(
            f"A Groq retornou erro de autenticacao (401) ao {action}.",
            502,
            category=GROQ_ERROR_CATEGORY_AUTHENTICATION,
        )
    if isinstance(exc, PermissionDeniedError):
        return GroqServiceError(
            f"A Groq retornou erro de permissao (403) ao {action}.",
            502,
            category=GROQ_ERROR_CATEGORY_PERMISSION_DENIED,
        )
    if isinstance(exc, InternalServerError):
        return GroqServiceError(
            f"A Groq retornou erro interno (5xx) ao {action}.",
            502,
            category=GROQ_ERROR_CATEGORY_UPSTREAM_SERVER_ERROR,
        )
    if isinstance(exc, APITimeoutError):
        return GroqServiceError(
            f"Tempo esgotado ao {action}.",
            504,
            category=GROQ_ERROR_CATEGORY_TIMEOUT,
        )
    if isinstance(exc, APIConnectionError):
        return GroqServiceError(
            "Nao foi possivel conectar a Groq.",
            502,
            category=GROQ_ERROR_CATEGORY_CONNECTION_ERROR,
        )
    if isinstance(exc, APIStatusError):
        return GroqServiceError(
            f"A Groq retornou erro ao {action} (status nao classificado).",
            502,
            category=GROQ_ERROR_CATEGORY_API_STATUS_ERROR,
        )

    # Nao e nenhuma excecao conhecida da SDK da Groq - mesma categoria
    # "nao classificada" (None) e mesmo status/mensagem que o servico ja
    # usava antes do Bloco 4 para falhas inesperadas.
    return GroqServiceError(f"Falha inesperada ao {action}.", 502)


def parse_groq_api_keys() -> list[str]:
    """Resolve a lista de API keys da Groq configuradas via variaveis de ambiente.

    Escopo desta funcao (Bloco 1 - parse e configuracao das API keys):
    - Apenas leitura/normalizacao das chaves configuradas. NAO faz
      round-robin, NAO seleciona/rotaciona chave nenhuma, NAO decide pool e
      NAO e usada por `_client()` ainda (isso fica para um bloco futuro).

    Precedencia entre as duas variaveis de ambiente suportadas:
    - `GROQ_API_KEYS`: lista de chaves separadas por virgula. Cada entrada e
      normalizada com `.strip()` e entradas vazias sao descartadas. A ordem
      configurada e preservada e duplicatas NAO sao removidas nesta etapa.
      Quando resulta em pelo menos uma chave valida, tem prioridade total:
      `GROQ_API_KEY` e ignorada e as duas configuracoes NAO sao concatenadas.
    - `GROQ_API_KEY`: usada apenas como fallback, e somente quando
      `GROQ_API_KEYS` estiver ausente, vazia, ou não resultar em nenhuma
      chave valida apos o parsing acima. Tambem e normalizada com
      `.strip()`.

    Se nenhuma das duas fontes fornecer uma chave valida, levanta
    `GroqConfigurationError` (sem incluir qualquer valor de chave na
    mensagem). Nenhum valor de chave e logado por esta funcao.

    Nao ha limite maximo de chaves hardcoded: a quantidade e definida
    inteiramente pela configuracao.
    """
    raw_keys = os.getenv("GROQ_API_KEYS", "")
    parsed_keys = [key.strip() for key in raw_keys.split(",") if key.strip()]
    if parsed_keys:
        return parsed_keys

    single_key = os.getenv("GROQ_API_KEY", "").strip()
    if single_key:
        return [single_key]

    raise GroqConfigurationError(
        "Nenhuma API key da Groq configurada (defina GROQ_API_KEYS ou GROQ_API_KEY)."
    )


# Bloco 3 - pool de keys por processo.
#
# `_key_pool` guarda a UNICA instancia de `GroqKeyPool` deste processo
# Python, criada sob demanda (lazy initialization) na primeira chamada a
# `_get_key_pool()` e reutilizada em todas as chamadas seguintes. Isso e
# proposital: recriar o `GroqKeyPool` a cada chamada zeraria o indice
# round-robin sempre para a primeira key, quebrando a rotacao entre
# requisicoes. Nao usamos Redis, banco, singleton framework nem nenhuma
# infraestrutura nova - apenas uma variavel de modulo, que e o mecanismo
# mais simples possivel para manter um pool por processo em Python.
#
# Limitacao conhecida (fora do escopo deste bloco): esta variavel vive na
# memoria de UM processo Python. Se a aplicacao rodar com multiplos
# processos ou workers (ex.: `gunicorn -w N`), cada processo tera sua
# propria instancia de `_key_pool` e seu proprio indice round-robin, sem
# nenhuma coordenacao entre processos.
_key_pool: GroqKeyPool | None = None

# Lock dedicado EXCLUSIVAMENTE a inicializacao lazy de `_key_pool` (o
# "criar a instancia, uma vez, por processo"). E um lock diferente do
# `threading.Lock` interno de `GroqKeyPool` (que protege apenas a
# leitura/avanco do indice round-robin dentro de `next_key()`). Sao dois
# problemas de concorrencia distintos, cada um com seu proprio lock:
# - `_key_pool_init_lock`: garante que apenas UMA instancia de
#   `GroqKeyPool` seja criada, mesmo com threads concorrentes chamando
#   `_get_key_pool()` antes de `_key_pool` existir.
# - lock interno de `GroqKeyPool`: garante que, uma vez que a instancia
#   exista, `next_key()` avance o indice corretamente entre threads.
_key_pool_init_lock = threading.Lock()


def _get_key_pool() -> GroqKeyPool:
    """Retorna o pool de keys do processo, criando-o na primeira chamada.

    Thread safety da inicializacao (double-checked locking): sem protecao,
    duas threads Flask concorrentes poderiam ambas ver `_key_pool is None`
    ao mesmo tempo, cada uma construir seu proprio `GroqKeyPool` (cada um
    comecando no indice 0) e uma atribuicao sobrescrever a outra - quebrando
    a garantia de "um unico pool, com round-robin continuo, por processo".
    Para evitar isso:
    1. Primeiro checa `_key_pool is None` sem lock (caminho rapido, comum,
       depois que o pool ja foi criado - nao paga custo de lock a cada
       chamada).
    2. Se ainda nao existe, adquire `_key_pool_init_lock` e checa de novo
       ("double-check") antes de criar - assim, se duas threads chegarem
       quase juntas, so a primeira a entrar no lock efetivamente cria o
       pool; a segunda, ao reobter o lock, ve que `_key_pool` ja foi
       preenchido e reaproveita a mesma instancia.
    O lock e liberado antes do `return`; nenhuma chamada de rede, ao Groq,
    ou qualquer operacao externa acontece dentro da secao critica - so a
    leitura de variaveis de ambiente (via `parse_groq_api_keys()`) e a
    construcao do objeto `GroqKeyPool` em memoria.

    Constroi o `GroqKeyPool` a partir de `parse_groq_api_keys()` (Bloco 1),
    preservando a mesma precedencia entre `GROQ_API_KEYS`/`GROQ_API_KEY` e o
    mesmo comportamento de erro definidos naquele bloco. `parse_groq_api_keys`
    ja levanta `GroqConfigurationError` quando nenhuma key valida esta
    configurada, entao `GroqKeyPool` normalmente so e construido com uma
    lista nao vazia. Ainda assim, por seguranca e para reconciliar os dois
    erros de configuracao existentes no projeto sem criar uma hierarquia
    nova, qualquer `GroqKeyPoolError` (erro interno de `key_pool.py`, ex.:
    lista vazia) que eventualmente ocorra aqui e convertido para
    `GroqConfigurationError` - a mesma excecao de configuracao que o resto
    do servico (`_model`, `_request_timeout` e o antigo `_client`) ja usa.
    Nenhum valor de key e incluido na mensagem de erro em nenhum dos casos.
    """
    global _key_pool

    if _key_pool is None:
        with _key_pool_init_lock:
            if _key_pool is None:
                try:
                    _key_pool = GroqKeyPool(parse_groq_api_keys())
                except GroqKeyPoolError as exc:
                    raise GroqConfigurationError(
                        "Nenhuma API key da Groq configurada (defina GROQ_API_KEYS ou GROQ_API_KEY)."
                    ) from exc

    return _key_pool


def _reset_key_pool_for_tests() -> None:
    """Reseta o pool de keys do processo. Uso exclusivo dos testes.

    Fora de testes, o pool deve persistir durante toda a vida do processo -
    esta funcao nunca deve ser chamada em codigo de producao. Ela existe
    apenas para permitir isolamento entre casos de teste que dependem do
    estado lazy de `_get_key_pool()` (por exemplo, um teste que faz
    `monkeypatch` de `GROQ_API_KEYS`/`GROQ_API_KEY` e precisa que o proximo
    `_client()` reconstrua o pool a partir do novo valor, em vez de reusar
    a instancia criada por um teste anterior).

    O reset tambem e feito sob `_key_pool_init_lock`, pelo mesmo motivo que
    a criacao e: evitar que um reset de teste e uma inicializacao lazy
    concorrente (em tese, se algum teste rodasse em paralelo) pisem um no
    outro. Isso nao adiciona nenhum lock novo - reutiliza o mesmo
    `_key_pool_init_lock` ja usado por `_get_key_pool()`.
    """
    global _key_pool
    with _key_pool_init_lock:
        _key_pool = None


class GroqService:
    def __init__(self) -> None:
        load_dotenv()

    def generate_questions(self, context: dict[str, Any]) -> list[dict[str, Any]]:
        self._validate_context(context)

        model = self._model()
        prompt = self._build_questions_prompt(context)

        def _call_groq(client: Groq):
            return client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Voce e um especialista em entrevistas profissionais. "
                            "Responda somente com JSON valido, sem markdown."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
            )

        completion = self._execute_with_rate_limit_fallback(
            _call_groq, action="gerar perguntas", ai_operation="generate_questions"
        )

        content = completion.choices[0].message.content if completion.choices else ""
        return self._parse_questions_response(content)

    def evaluate_interview(self, context: dict[str, Any], answers: list[dict[str, Any]]) -> dict[str, Any]:
        self._validate_context(context)
        normalized_answers = self._validate_answers(answers)

        model = self._model()
        prompt = self._build_evaluation_prompt(context, normalized_answers)
        structural_retry_message: str | None = None
        evaluation_response_mode = _evaluation_response_mode()
        evaluation_response_format = _evaluation_response_format(
            normalized_answers,
            mode=evaluation_response_mode,
        )
        logger.info(
            "Groq: modo de response_format da avaliacao configurado: %s",
            {"evaluation_response_mode": evaluation_response_mode},
        )

        def _call_groq(client: Groq):
            # Bloco 6: o log de observabilidade por tentativa que existia
            # aqui (um `except APIStatusError` local, so em
            # `evaluate_interview`, logando `groq_status_code`/
            # `groq_error_code`/`groq_request_id` a cada tentativa que
            # falhasse com `APIStatusError`) foi REMOVIDO nesta rodada -
            # nao por perda de informacao, mas porque ficou estritamente
            # redundante: `_execute_with_rate_limit_fallback` agora loga,
            # de forma centralizada (para as duas operacoes, sem duplicar
            # logica entre elas), TODOS os mesmos casos que esse bloco
            # cobria - e com os MESMOS tres campos tecnicos seguros
            # (`status_code`/`groq_error_code`/`groq_request_id`, via
            # `_safe_groq_log_fields`, reaproveitando o mesmo
            # `_extract_groq_error_code` de sempre) - so que agora
            # enriquecidos com `ai_operation`/`attempt_number`/
            # `max_attempts`/`error_category`/`fallback_triggered`, o que
            # esse bloco antigo nao tinha. Nenhuma observabilidade foi
            # perdida: o unico ganho e a remocao de uma segunda mensagem de
            # log para o MESMO evento (ex.: um 429 em `evaluate_interview`
            # antes gerava duas linhas de log - uma aqui, outra no
            # fallback - agora gera so uma, mais completa). Como bonus,
            # `evaluate_interview` passa a ter cobertura de log tambem para
            # timeout/erro de conexao (categorias que este bloco antigo,
            # por so capturar `APIStatusError`, nunca cobria), alinhando o
            # comportamento com `generate_questions`.
            messages = [
                {
                    "role": "system",
                    "content": (
                        "Voce e um avaliador educacional de entrevistas profissionais. "
                        "Avalie com foco em desenvolvimento do candidato. "
                        "Responda somente com JSON valido, sem markdown."
                    ),
                },
                {"role": "user", "content": prompt},
            ]
            if structural_retry_message:
                messages.append({"role": "user", "content": structural_retry_message})

            return client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.2,
                response_format=evaluation_response_format,
            )

        # Retry estrutural (no maximo 1 vez, so aqui - nao dentro de
        # `_execute_with_rate_limit_fallback`, que continua tratando
        # exclusivamente rate limit/troca de credencial e permanece
        # intocado): a Groq pode responder HTTP 200 com
        # `questionsEvaluation` estruturalmente incompleto/invalido (ver
        # `GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION`). Cada
        # iteracao chama `_execute_with_rate_limit_fallback` de novo do
        # zero - com seu proprio `tried_keys` local - entao a credencial
        # usada na tentativa estrutural anterior NUNCA e marcada como
        # falha por isso; a rotacao normal de credenciais (429) continua
        # valendo, sem nenhuma alteracao, dentro de cada tentativa.
        # `_MAX_STRUCTURAL_EVALUATION_ATTEMPTS = 2` => 1a tentativa + no
        # maximo 1 repeticao. Qualquer outra categoria de erro (JSON
        # invalido/vazio, scores incompletos, rate limit, bad_request,
        # etc.) sobe imediatamente, sem retry estrutural.
        for structural_attempt in range(1, _MAX_STRUCTURAL_EVALUATION_ATTEMPTS + 1):
            attempt_metrics = _new_evaluation_attempt_metrics()
            attempt_started_at = time.monotonic()
            try:
                completion = self._execute_with_rate_limit_fallback(
                    _call_groq,
                    action="avaliar entrevista",
                    ai_operation="evaluate_interview",
                    structural_attempt=structural_attempt,
                    metrics=attempt_metrics,
                )
                content = completion.choices[0].message.content if completion.choices else ""
                evaluation = self._parse_evaluation_response(content, normalized_answers)
            except GroqServiceError as exc:
                is_corrective_retry_error = exc.category in {
                    GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION,
                    GROQ_ERROR_CATEGORY_OUTPUT_VALIDATION_FAILED,
                }
                structural_retry_triggered = (
                    is_corrective_retry_error
                    and structural_attempt < _MAX_STRUCTURAL_EVALUATION_ATTEMPTS
                )
                _log_evaluation_structural_attempt(
                    structural_attempt=structural_attempt,
                    max_structural_attempts=_MAX_STRUCTURAL_EVALUATION_ATTEMPTS,
                    metrics=attempt_metrics,
                    started_at=attempt_started_at,
                    structural_retry_triggered=structural_retry_triggered,
                    error_category=exc.category,
                )
                if (
                    not is_corrective_retry_error
                    or structural_attempt >= _MAX_STRUCTURAL_EVALUATION_ATTEMPTS
                ):
                    raise

                structural_retry_message = _build_corrective_retry_message(exc)
                # Log sanitizado: so contagens/flags tecnicas (mesmo padrao
                # do Bloco 6) - nunca prompt, resposta do candidato ou
                # payload bruto da Groq.
                logger.warning(
                    "Groq: retry corretivo de avaliacao - repetindo",
                    extra={
                        "ai_operation": "evaluate_interview",
                        "structural_attempt": structural_attempt,
                        "max_structural_attempts": _MAX_STRUCTURAL_EVALUATION_ATTEMPTS,
                        "correction_reason": exc.category,
                    },
                )
            else:
                _log_evaluation_structural_attempt(
                    structural_attempt=structural_attempt,
                    max_structural_attempts=_MAX_STRUCTURAL_EVALUATION_ATTEMPTS,
                    metrics=attempt_metrics,
                    started_at=attempt_started_at,
                    structural_retry_triggered=False,
                    error_category=None,
                )
                return evaluation

        # Estruturalmente inalcancavel: o loop acima sempre retorna (na
        # ultima iteracao, `structural_attempt >= _MAX_STRUCTURAL_EVALUATION_ATTEMPTS`
        # forca o `raise`) - mantido apenas como rede de seguranca
        # defensiva, no mesmo estilo do restante do arquivo.
        raise GroqServiceError("Falha inesperada ao avaliar entrevista.", 502)

    def _execute_with_rate_limit_fallback(
        self,
        call_groq,
        *,
        action: str,
        ai_operation: str,
        structural_attempt: int | None = None,
        metrics: dict[str, Any] | None = None,
    ) -> Any:
        """Executa `call_groq(client)` com fallback controlado, restrito a
        rate limit (429 / `RateLimitError` / categoria `rate_limit`).

        Bloco 5 - regra central (inalterada nesta correcao):
        1. seleciona uma key ainda nao tentada NESTA operacao;
        2. executa `call_groq(client)`;
        3. se der certo, retorna o resultado imediatamente;
        4. se a excecao classificar como `GROQ_ERROR_CATEGORY_RATE_LIMIT`,
           tenta a PROXIMA key ainda nao tentada (proxima iteracao do loop);
        5. qualquer OUTRA categoria (400/401/403/5xx/timeout/conexao/
           residual/inesperado) sobe IMEDIATAMENTE, sem tentar outra key -
           delega inteiramente para `_translate_groq_error` (Bloco 4), sem
           duplicar essa logica aqui.

        Correcao de concorrencia (nesta rodada): a versao anterior usava
        `self._client()` sem argumentos a cada tentativa, ou seja, cada
        tentativa chamava `next_key()` do pool global compartilhado. Sob
        concorrencia, o indice global pode avancar por causa de chamadas de
        OUTRAS operacoes entre duas tentativas desta mesma operacao, fazendo
        esta operacao repetir uma key que ja tinha tentado (ver relatorio,
        secao A). Alem disso, `max_attempts = len(_get_key_pool())` contava
        SLOTS do round-robin, nao credenciais distintas - com keys
        duplicadas na configuracao (ex.: `GROQ_API_KEYS=A,A,B`), a mesma
        credencial "A" podia ser selecionada duas vezes dentro de uma unica
        operacao mesmo sem nenhuma concorrencia.

        A correcao usa `GroqKeyPool.next_unique_key(tried_keys)`: cada
        operacao mantem seu proprio conjunto local `tried_keys` (nunca
        compartilhado com outras operacoes, nunca logado), e cada tentativa
        pede ao pool "a proxima key do round-robin global que eu, esta
        operacao, ainda nao tentei". O pool garante isso atomicamente (sob
        seu proprio lock interno, o mesmo de sempre) comparando POR VALOR,
        entao (a) mesmo que outra operacao concorrente tenha avancado o
        indice global entre duas tentativas desta operacao, o valor
        devolvido nunca esta em `tried_keys` desta operacao; e (b) mesmo com
        keys duplicadas na configuracao, o mesmo valor nunca e devolvido
        duas vezes para a mesma operacao. O parser global
        (`parse_groq_api_keys`) e a lista armazenada no pool NAO sao
        alterados - a deduplicacao acontece so nesta fronteira, por
        operacao.

        Numero maximo de tentativas: `len(set(_get_key_pool().keys))` - a
        quantidade de CREDENCIAIS DISTINTAS configuradas (nao o numero bruto
        de slots do round-robin), calculada a partir da propriedade `.keys`
        ja existente do pool. Isso garante, ao mesmo tempo, que (a) cada
        credencial distinta e tentada no maximo uma vez por operacao e (b)
        se TODAS as credenciais distintas disponiveis derem 429, o loop
        termina sozinho e levanta o ultimo erro `rate_limit` - nunca entra
        em loop infinito nem volta a tentar uma credencial ja usada nesta
        mesma operacao.

        Round-robin global: `next_unique_key` nunca reseta nem retrocede o
        indice global do pool - ele so pula (sem consumir permanentemente)
        posicoes cujo valor ja esta em `tried_keys` desta operacao. O indice
        continua avancando normalmente a cada posicao examinada, inclusive
        entre operacoes diferentes - esta funcao nao cria nenhum pool local
        nem reseta o indice, preservando a continuidade do round-robin
        global entre operacoes (ex.: op1 usa A e B, op2 comeca em C).

        Nenhum lock fica retido durante a chamada de rede: `next_unique_key`
        adquire e libera o lock do pool inteiramente ANTES do `return` -
        `self._client(api_key=...)` e `call_groq(client)` (que faz a
        chamada de rede) acontecem sempre FORA de qualquer lock.

        Sem retry manual tradicional (sleep, backoff, jitter, Retry-After):
        o "fallback" aqui e estritamente "tentar a proxima credencial ainda
        nao tentada", nunca tentar de novo a mesma credencial.

        Seguranca: nenhuma key, header, request ou corpo de resposta e
        registrado ou incluido na excecao final - so o numero de tentativas
        (implicito no numero de iteracoes) e a categoria do erro, via
        `_translate_groq_error`. `tried_keys` e uma variavel local desta
        chamada, nunca logada, nunca exposta.

        `action`: texto humano curto e FIXO, usado somente para compor a
        mensagem de erro via `_translate_groq_error` (ex.: "gerar
        perguntas") - nunca usado nos campos estruturados de log.
        `ai_operation`: identificador tecnico estavel, usado somente nos
        campos estruturados de log do Bloco 6 (ex.: "generate_questions") -
        recebido explicitamente do chamador, nunca inferido a partir de
        `action` nem de qualquer texto traduzido, para que observabilidade
        estruturada nao dependa (nem quebre por causa) de mudancas futuras
        no texto humano das mensagens de erro.
        """
        pool = _get_key_pool()
        max_attempts = len(set(pool.keys))

        # Bloco 6 - observabilidade segura do roteamento/fallback: os logs
        # abaixo NAO alteram nenhuma decisao de roteamento (nenhuma
        # condicao do loop, nenhum calculo de `max_attempts`/`tried_keys`
        # foi tocado nesta rodada) - so registram, para diagnostico na VPS,
        # qual operacao/tentativa/categoria estava em jogo. Campos usados
        # em todos os eventos abaixo: `ai_operation` (identificador tecnico
        # estavel recebido do chamador, ex.: "generate_questions"/
        # "evaluate_interview" - nunca dado dinamico do usuario, nunca o
        # texto humano `action`), `attempt_number` (1-based), `max_attempts`,
        # e, quando aplicavel, `error_category`/`fallback_triggered`/
        # `exhausted_credentials` mais os campos tecnicos seguros de
        # `_safe_groq_log_fields` (status_code/groq_error_code/
        # groq_request_id, quando disponiveis). Nunca inclui o valor de
        # nenhuma key, header, Authorization, prompt, resposta da
        # entrevista, contexto da vaga ou conteudo bruto da Groq.
        tried_keys: set[str] = set()
        last_rate_limit_error: GroqServiceError | None = None
        last_rate_limit_cause: Exception | None = None
        last_rate_limit_slot: int | None = None
        # Flag explicita e direta (nao inferida de `max_attempts`/
        # `attempt_number`): fica `True` assim que esta operacao realmente
        # chega a tentar OUTRA credencial apos um 429 - ou seja, no exato
        # momento em que o evento de fallback (abaixo) e emitido. Com uma
        # unica credencial distinta configurada, essa transicao nunca
        # acontece (a primeira e unica tentativa vai direto para o
        # esgotamento), entao a flag permanece `False` corretamente nesse
        # caso - sem depender de comparar `max_attempts > 1`.
        fallback_occurred = False

        for loop_index in range(max_attempts):
            attempt_number = loop_index + 1

            selected_key = pool.next_unique_key_with_slot(tried_keys)
            if selected_key is None:
                _set_metric(metrics, "fallback_exhausted", True)
                logger.warning(
                    "Groq: nenhuma credencial disponivel fora de cooldown por rate limit (429)",
                    extra={
                        "ai_operation": ai_operation,
                        "structural_attempt": structural_attempt,
                        "attempt_number": attempt_number,
                        "max_attempts": max_attempts,
                        "error_category": GROQ_ERROR_CATEGORY_RATE_LIMIT,
                        "fallback_triggered": fallback_occurred,
                        "exhausted_credentials": True,
                    },
                )
                raise GroqServiceError(
                    "Todas as credenciais da Groq estao temporariamente indisponiveis por rate limit.",
                    502,
                    category=GROQ_ERROR_CATEGORY_RATE_LIMIT,
                )

            api_key, credential_slot = selected_key
            tried_keys.add(api_key)
            client = self._client(api_key=api_key)
            try:
                _increment_metric(metrics, "sdk_attempt_count")
                result = call_groq(client)
            except Exception as exc:
                translated = _translate_groq_error(exc, action=action)
                log_extra = {
                    "ai_operation": ai_operation,
                    "structural_attempt": structural_attempt,
                    "attempt_number": attempt_number,
                    "max_attempts": max_attempts,
                    "credential_slot": credential_slot,
                    "error_category": translated.category,
                    **_safe_groq_log_fields(exc),
                }
                if translated.category != GROQ_ERROR_CATEGORY_RATE_LIMIT:
                    # Evento: erro nao-rate-limit encerra a operacao
                    # imediatamente, sem tentar outra credencial - nenhum
                    # fallback ocorreu.
                    no_fallback_log = {
                        "fallback_triggered": False,
                        **log_extra,
                    }
                    logger.warning(
                        "Groq: operacao encerrada sem fallback (categoria nao elegivel para nova tentativa): %s",
                        no_fallback_log,
                        extra=no_fallback_log,
                    )
                    raise translated from exc

                last_rate_limit_error = translated
                last_rate_limit_cause = exc
                last_rate_limit_slot = credential_slot
                _increment_metric(metrics, "rate_limit_count")
                pool.mark_rate_limited(api_key, _rate_limit_cooldown_seconds(exc))

                if attempt_number < max_attempts:
                    # Evento: fallback para a proxima credencial ainda nao
                    # tentada, por rate limit - ainda ha ao menos uma
                    # credencial distinta restante para esta operacao. Este
                    # e o UNICO ponto do codigo onde um fallback de fato
                    # ocorre (a operacao esta prestes a tentar outra
                    # credencial), entao e aqui, e so aqui, que
                    # `fallback_occurred` passa a `True`.
                    fallback_occurred = True
                    fallback_log = {
                        "fallback_triggered": True,
                        **log_extra,
                    }
                    logger.warning(
                        "Groq: fallback para proxima credencial por rate limit (429): %s",
                        fallback_log,
                        extra=fallback_log,
                    )
                # Quando `attempt_number == max_attempts`, esta era a
                # ultima credencial distinta disponivel - nao ha "proxima
                # credencial" para anunciar; o evento de esgotamento,
                # abaixo (apos o loop), cobre esse caso sozinho, sem
                # duplicar um log de fallback que seria enganoso (diria
                # "tentando a proxima" quando na verdade nao ha mais
                # nenhuma).
                continue
            else:
                sdk_success_log = {
                    "ai_operation": ai_operation,
                    "structural_attempt": structural_attempt,
                    "attempt_number": attempt_number,
                    "max_attempts": max_attempts,
                    "credential_slot": credential_slot,
                    "error_category": None,
                }
                logger.info(
                    "Groq: tentativa SDK concluida com sucesso: %s",
                    sdk_success_log,
                    extra=sdk_success_log,
                )
                if attempt_number > 1:
                    # Evento (opcional, so quando houve fallback): a
                    # operacao teve sucesso depois de ao menos uma troca de
                    # credencial por rate limit. Nao loga sucesso de
                    # primeira tentativa (Caso 1) para nao gerar ruido em
                    # volume alto de chamadas bem-sucedidas comuns.
                    fallback_success_log = {
                        "ai_operation": ai_operation,
                        "structural_attempt": structural_attempt,
                        "attempt_number": attempt_number,
                        "max_attempts": max_attempts,
                        "credential_slot": credential_slot,
                        "fallback_triggered": True,
                    }
                    logger.info(
                        "Groq: operacao teve sucesso apos fallback por rate limit: %s",
                        fallback_success_log,
                        extra=fallback_success_log,
                    )
                return result

        # As `max_attempts` tentativas (uma por credencial distinta
        # disponivel) esgotaram, todas com rate_limit. Evento: todas as
        # credenciais foram esgotadas por rate limit - nenhuma credencial
        # distinta restante para esta operacao.
        #
        # `fallback_triggered` aqui usa a flag explicita `fallback_occurred`
        # (setada so no ponto real de transicao para outra credencial,
        # acima) - NAO `max_attempts > 1` nem qualquer outra inferencia.
        # Com uma unica credencial distinta configurada (A -> 429 ->
        # esgotamento, sem nenhuma troca de credencial), `fallback_occurred`
        # permanece `False` e o esgotamento e corretamente reportado sem
        # fallback: so a mesma (unica) credencial foi tentada, uma vez.
        assert last_rate_limit_error is not None  # max_attempts >= 1 (pool nunca vazio)
        _set_metric(metrics, "fallback_exhausted", True)
        exhausted_log = {
            "ai_operation": ai_operation,
            "structural_attempt": structural_attempt,
            "attempt_number": max_attempts,
            "max_attempts": max_attempts,
            "error_category": GROQ_ERROR_CATEGORY_RATE_LIMIT,
            "credential_slot": last_rate_limit_slot,
            "fallback_triggered": fallback_occurred,
            "exhausted_credentials": True,
            **_safe_groq_log_fields(last_rate_limit_cause),
        }
        logger.warning(
            "Groq: todas as credenciais distintas disponiveis foram esgotadas por rate limit (429): %s",
            exhausted_log,
            extra=exhausted_log,
        )
        raise last_rate_limit_error from last_rate_limit_cause

    def _client(self, api_key: str | None = None) -> Groq:
        # Bloco 3: a key nao vem mais direto de GROQ_API_KEY. Ela vem do
        # pool de keys do processo (`_get_key_pool()`), que seleciona a
        # proxima key em round-robin a cada chamada (com uma unica key
        # configurada, `next_key()` sempre retorna essa mesma key, entao o
        # comportamento observavel continua equivalente ao anterior).
        #
        # `max_retries=0` desabilita o retry interno automatico do SDK da
        # Groq: sem isso, um 429 (ou outro status retryable) poderia ser
        # tentado novamente pelo proprio SDK, de forma invisivel para este
        # servico, antes de qualquer excecao chegar aqui. Com
        # `max_retries=0`, um erro sobe imediatamente na primeira tentativa.
        #
        # Bloco 5 (correcao de concorrencia): `_client()` ganha um parametro
        # opcional `api_key`. Quando chamado SEM argumentos (`api_key=None`,
        # o padrao), o comportamento e EXATAMENTE o mesmo de sempre -
        # `next_key()` do pool global - preservando 100% o comportamento
        # observado pelos testes dos Blocos 3 e 4, que chamam
        # `GroqService()._client()` sem argumentos. Quando `api_key` e
        # fornecido explicitamente, ele e usado diretamente, sem consultar o
        # pool novamente - e assim que `_execute_with_rate_limit_fallback`
        # usa este metodo agora: primeiro obtem uma credencial ainda nao
        # tentada nesta operacao via `GroqKeyPool.next_unique_key()`, depois
        # passa esse valor explicitamente para `_client(api_key=...)`, para
        # nao chamar o pool duas vezes (uma para escolher a key, outra
        # dentro de `_client()`) nem arriscar selecionar uma key diferente
        # da que acabou de ser reservada para esta tentativa.
        if api_key is None:
            api_key = _get_key_pool().next_key()

        return Groq(
            api_key=api_key,
            timeout=self._request_timeout(),
            max_retries=0,
        )

    def _model(self) -> str:
        model = os.getenv("GROQ_MODEL", "").strip()
        if not model:
            raise GroqConfigurationError("GROQ_MODEL nao configurado.")
        return model

    def _request_timeout(self) -> int:
        raw_timeout = os.getenv("REQUEST_TIMEOUT_SECONDS", "20")
        try:
            timeout = int(raw_timeout)
        except ValueError:
            timeout = 20
        return max(1, timeout)

    def _validate_context(self, context: dict[str, Any]) -> None:
        if not isinstance(context, dict):
            raise GroqServiceError("Contexto da vaga invalido.", 400)

        title = _clean_text(context.get("title"))
        summary = _clean_text(context.get("summary"))
        activities = _clean_list(context.get("activities"))
        requirements = _clean_list(context.get("requirements"))

        if not title and not summary and not activities and not requirements:
            raise GroqServiceError("Informe contexto suficiente da vaga.", 400)

    def _build_questions_prompt(self, context: dict[str, Any]) -> str:
        prompt_context = {
            "title": _clean_text(context.get("title")),
            "company": _clean_text(context.get("company")),
            "summary": _clean_text(context.get("summary")),
            "activities": _clean_list(context.get("activities")),
            "requirements": _clean_list(context.get("requirements")),
            "location": _clean_text(context.get("location")),
            "contractType": _clean_text(context.get("contractType")),
            "workMode": _clean_text(context.get("workMode")),
            "sourceUrl": _clean_text(context.get("sourceUrl")),
        }

        return (
            "Gere perguntas de entrevista para a vaga abaixo.\n\n"
            "Regras obrigatorias:\n"
            "- Retorne somente JSON valido.\n"
            "- Nao use markdown.\n"
            "- Nao inclua texto antes ou depois do JSON.\n"
            "- Gere exatamente 5 perguntas.\n"
            "- A pergunta 1 deve ser Tecnica.\n"
            "- A pergunta 2 deve ser Tecnica.\n"
            "- A pergunta 3 deve ser Comportamental.\n"
            "- A pergunta 4 deve ser Comportamental.\n"
            "- A pergunta 5 deve ser Carreira.\n"
            "- Use os requisitos e atividades reais da vaga.\n"
            "- A vaga deve ser a fonte principal para gerar as perguntas.\n"
            "- Priorize nesta ordem: titulo, resumo, atividades e requirements.\n"
            "- requirements contem requisitos, qualificacoes, conhecimentos, competencias "
            "e demais informacoes profissionais extraidas do anuncio.\n"
            "- Nao assuma que cada item de requirements seja eliminatorio ou obrigatorio.\n"
            "- Nao atribua peso obrigatorio, desejavel ou diferencial alem do que o proprio "
            "texto da vaga permita concluir.\n"
            "- Nao transforme contexto profissional em exigencia mais forte do que o anuncio.\n"
            "- As perguntas podem aprofundar moderadamente tecnologias, conhecimentos, "
            "competencias, atividades e responsabilidades explicitamente relacionados ao "
            "conteudo da vaga.\n"
            "- Esse aprofundamento pode envolver conceitos gerais e diretamente relacionados "
            "ao que foi citado, mas nao pode transformar conhecimentos correlatos em novos "
            "requisitos da vaga.\n"
            "- Nao introduza novas tecnologias, bibliotecas ou ferramentas que nao estejam "
            "na vaga.\n"
            "- Nao introduza metodos, recursos internos, padroes ou praticas muito "
            "especificas como se fossem requisitos obrigatorios.\n"
            "- Nao pressuponha dominio de algo apenas porque e comum naquela profissao ou "
            "tecnologia.\n"
            "- Nao transforme conhecimento implicito de mercado em requisito da vaga.\n"
            "- Se uma vaga citar React, voce pode perguntar sobre experiencia pratica com "
            "React, componentes, estado, formularios e decisoes de implementacao em nivel "
            "geral; evite Context API, Redux, React Query, bibliotecas especificas ou "
            "padroes muito especificos se eles nao aparecerem no contexto.\n"
            "- Se uma vaga citar Django, voce pode perguntar sobre desenvolvimento com "
            "Django, organizacao de funcionalidades, implementacao, integracao e "
            "experiencia pratica; evite class-based views, Celery, DRF, paginacao como "
            "requisito especifico ou recursos internos especificos se eles nao aparecerem "
            "no contexto.\n"
            "- Os exemplos de React e Django sao apenas ilustrativos do nivel de "
            "aprofundamento permitido; nao crie logica especifica para Tecnologia.\n"
            "- Se a vaga for de outra area profissional, use titulo, resumo, atividades, "
            "requisitos, competencias e demais informacoes disponiveis como fonte para "
            "gerar perguntas sem forcar a vaga para TI, RH ou Secretariado.\n"
            "- Quando houver pouco contexto tecnico ou profissional, prefira perguntas sobre "
            "experiencia, tomada de decisao, resolucao de problemas, aplicacao pratica, "
            "organizacao do trabalho e situacoes profissionais relacionadas ao contexto real "
            "da vaga.\n"
            "- Nao trate inferencias como requisitos oficiais da vaga.\n"
            "- Nao invente tecnologias, ferramentas, requisitos, beneficios ou "
            "caracteristicas da empresa que nao aparecem no contexto.\n"
            "- Evite perguntas genericas quando houver contexto suficiente.\n"
            "- Nao inclua resposta esperada, avaliacao ou explicacoes ao candidato.\n\n"
            "Formato obrigatorio:\n"
            '{ "questions": ['
            '{ "id": 1, "type": "Tecnica", "text": "..." },'
            '{ "id": 2, "type": "Tecnica", "text": "..." },'
            '{ "id": 3, "type": "Comportamental", "text": "..." },'
            '{ "id": 4, "type": "Comportamental", "text": "..." },'
            '{ "id": 5, "type": "Carreira", "text": "..." }'
            "] }\n\n"
            f"Contexto da vaga em JSON:\n{json.dumps(prompt_context, ensure_ascii=False)}"
        )

    def _validate_answers(self, answers: Any) -> list[dict[str, Any]]:
        if not isinstance(answers, list) or not answers:
            raise GroqServiceError("Informe as respostas da entrevista.", 400)

        normalized_answers: list[dict[str, Any]] = []
        for index, item in enumerate(answers, start=1):
            if not isinstance(item, dict):
                raise GroqServiceError("Resposta em formato invalido.", 400)

            question_id = item.get("questionId")
            question_text = _clean_text(item.get("questionText"))

            if question_id is None:
                raise GroqServiceError("Resposta sem questionId.", 400)
            if not question_text:
                raise GroqServiceError("Resposta sem questionText.", 400)
            if "answer" not in item:
                raise GroqServiceError("Resposta sem campo answer.", 400)

            try:
                normalized_question_id = int(question_id)
            except (TypeError, ValueError) as exc:
                raise GroqServiceError("questionId invalido.", 400) from exc

            normalized_answers.append(
                {
                    "questionId": normalized_question_id,
                    "questionText": question_text,
                    "questionType": _clean_text(item.get("questionType")),
                    "answer": _clean_text(item.get("answer")),
                }
            )

        return normalized_answers

    def _build_evaluation_prompt(self, context: dict[str, Any], answers: list[dict[str, Any]]) -> str:
        expected_question_ids = [answer["questionId"] for answer in answers]
        expected_question_count = len(expected_question_ids)
        questions_evaluation_skeleton = _questions_evaluation_skeleton(expected_question_ids)
        prompt_context = {
            "title": _clean_text(context.get("title")),
            "company": _clean_text(context.get("company")),
            "summary": _clean_text(context.get("summary")),
            "activities": _clean_list(context.get("activities")),
            "requirements": _clean_list(context.get("requirements")),
            "location": _clean_text(context.get("location")),
            "contractType": _clean_text(context.get("contractType")),
            "sourceUrl": _clean_text(context.get("sourceUrl")),
        }

        return (
            "Avalie as respostas do candidato para a vaga abaixo.\n\n"
            "Objetivo da avaliacao:\n"
            "- A avaliacao e educacional e de desenvolvimento.\n"
            "- Nao faca julgamento de contratacao, aprovacao ou reprovacao.\n"
            "- Nao avalie atributos pessoais protegidos ou irrelevantes para a entrevista.\n"
            "- Avalie cada resposta com base na pergunta realizada, no contexto real da vaga, "
            "nos requisitos, nas atividades e no conteudo efetivamente fornecido pelo candidato.\n"
            "- Avalie aderencia com base na pergunta e no contexto real da vaga.\n"
            "- Nao assuma requisitos tecnicos que nao aparecem no contexto da vaga.\n\n"
            "Criterios oficiais, todos em escala de 0 a 10:\n"
            "- Clareza: capacidade de se expressar de forma compreensivel.\n"
            "- Coerência: consistencia e conexao logica da resposta.\n"
            "- Objetividade: capacidade de responder diretamente sem dispersao excessiva.\n"
            "- Domínio: conhecimento demonstrado sobre o assunto/pergunta.\n"
            "- Organização: estrutura e sequencia da resposta.\n"
            "- Aderência: relacao da resposta com a pergunta e com o contexto/requisitos da vaga.\n"
            "- Exemplos: uso de exemplos concretos, experiencias, casos ou situacoes que sustentem a resposta.\n\n"
            "Escala de severidade por resposta:\n"
            "- 0: sem resposta.\n"
            "- 1: resposta equivalente a 'nao sei'.\n"
            "- 2: resposta extremamente curta ou inutil.\n"
            "- 3-4: superficial.\n"
            "- 5-6: razoavel.\n"
            "- 7-8: boa.\n"
            "- 9: muito boa.\n"
            "- 10: excepcional.\n\n"
            "Regras obrigatorias:\n"
            "- Retorne somente JSON valido.\n"
            "- Nao use markdown.\n"
            "- Nao inclua texto antes ou depois do JSON.\n"
            "- Retorne exatamente os 7 criterios oficiais em scores.\n"
            "- Nao inclua overallScore; ele sera calculado pelo sistema.\n"
            "- Inclua strengths, improvements e recommendations como arrays de strings.\n"
            "- Inclua summary como string.\n"
            "- Inclua questionsEvaluation com uma avaliacao para cada resposta recebida.\n"
            "- Cada item de questionsEvaluation deve conter questionId, score, reason, positives, improvements e suggestion.\n"
            f"- questionsEvaluation deve conter EXATAMENTE {expected_question_count} itens - nem a mais, nem a menos.\n"
            f"- A quantidade de itens em questionsEvaluation deve ser IGUAL a {expected_question_count}.\n"
            "- Cada item deve preservar o questionId original exatamente como recebido na respectiva pergunta/resposta.\n"
            f"- Os expectedQuestionIds sao: {json.dumps(expected_question_ids, ensure_ascii=False)}.\n"
            "- Retorne exatamente um item para CADA expectedQuestionId.\n"
            "- Nao retorne nenhum questionId fora de expectedQuestionIds.\n"
            "- Nao omita o questionId de nenhum item.\n"
            "- Nao renumere nem troque os questionId originais por uma nova sequencia.\n"
            "- Nao duplique questionId: cada questionId deve aparecer em no maximo um item de questionsEvaluation.\n"
            "- Nao invente nem preencha avaliacoes para perguntas que nao foram recebidas.\n\n"
            "Regras de fidelidade ao contexto:\n"
            "- Baseie a avaliacao principalmente no contexto real da vaga, atividades, "
            "requisitos, pergunta feita e resposta do candidato.\n"
            "- Voce pode aprofundar moderadamente conceitos diretamente relacionados ao que "
            "aparece na vaga, na pergunta ou na resposta.\n"
            "- Nao penalize o candidato por nao mencionar tecnologia, biblioteca, ferramenta, "
            "metodologia, padrao ou pratica especifica que nao esteja na vaga, na pergunta "
            "ou seja necessaria para avaliar diretamente a resposta dada.\n"
            "- Em improvements e recommendations, prefira orientar sobre clareza, "
            "profundidade, exemplos, justificativas, resultados, organizacao e relacao com "
            "a vaga.\n"
            "- Voce pode sugerir maior detalhamento tecnico dentro do assunto abordado, mas "
            "nao transforme ferramentas ou tecnologias externas em requisitos implicitos.\n"
            "- Se a resposta mencionar uma tecnologia, recomende explicar melhor a "
            "organizacao, decisao de implementacao, trade-offs ou aplicacao pratica; nao "
            "cobre ferramentas, bibliotecas, recursos internos ou padroes especificos que "
            "nao tenham sido exigidos.\n"
            "- A regra vale para qualquer area profissional; nao force a avaliacao para TI, "
            "RH ou Secretariado quando a vaga pertencer a outra area.\n\n"
            "Formato obrigatorio:\n"
            "{"
            '"scores": {'
            '"Clareza": 0, "Coerência": 0, "Objetividade": 0, "Domínio": 0, '
            '"Organização": 0, "Aderência": 0, "Exemplos": 0'
            "},"
            '"strengths": ["..."],'
            '"improvements": ["..."],'
            '"recommendations": ["..."],'
            '"summary": "...",'
            f'"questionsEvaluation": {json.dumps(questions_evaluation_skeleton, ensure_ascii=False)}'
            "}\n\n"
            f"expectedQuestionIds:\n{json.dumps(expected_question_ids, ensure_ascii=False)}\n\n"
            "Skeleton obrigatorio de questionsEvaluation, usando os IDs reais recebidos. "
            "Preserve estes questionId e substitua os placeholders por avaliacao real:\n"
            f"{json.dumps(questions_evaluation_skeleton, ensure_ascii=False)}\n\n"
            f"Contexto da vaga em JSON:\n{json.dumps(prompt_context, ensure_ascii=False)}\n\n"
            f"Perguntas e respostas em JSON:\n{json.dumps(answers, ensure_ascii=False)}"
        )

    def _parse_questions_response(self, content: str | None) -> list[dict[str, Any]]:
        if not content:
            raise GroqServiceError("A Groq retornou uma resposta vazia.", 502)

        try:
            payload = json.loads(content)
        except json.JSONDecodeError as exc:
            raise GroqServiceError("A Groq retornou JSON invalido.", 502) from exc

        questions = payload.get("questions") if isinstance(payload, dict) else None
        if not isinstance(questions, list) or len(questions) != 5:
            raise GroqServiceError("A Groq retornou quantidade invalida de perguntas.", 502)

        normalized: list[dict[str, Any]] = []
        for index, expected_type in enumerate(QUESTION_TYPES, start=1):
            item = questions[index - 1]
            if not isinstance(item, dict):
                raise GroqServiceError("A Groq retornou pergunta em formato invalido.", 502)

            text = _clean_text(item.get("text"))
            if not text:
                raise GroqServiceError("A Groq retornou pergunta sem texto.", 502)

            question_type = _normalize_question_type(item.get("type"))
            if question_type != expected_type:
                raise GroqServiceError("A Groq retornou tipos de pergunta invalidos.", 502)

            normalized.append({"id": index, "type": expected_type, "text": text})

        return normalized

    def _parse_evaluation_response(self, content: str | None, answers: list[dict[str, Any]]) -> dict[str, Any]:
        if not content:
            raise GroqServiceError("A Groq retornou uma avaliacao vazia.", 502)

        try:
            payload = json.loads(content)
        except json.JSONDecodeError as exc:
            raise GroqServiceError("A Groq retornou JSON invalido.", 502) from exc

        if not isinstance(payload, dict):
            raise GroqServiceError("A Groq retornou avaliacao em formato invalido.", 502)

        scores = self._normalize_scores(payload.get("scores"), answers)
        questions_evaluation = self._normalize_questions_evaluation(
            _extract_questions_evaluation(payload),
            answers,
        )
        overall_score = round(sum(scores.values()) / len(EVALUATION_CRITERIA), 1)

        return {
            "scores": scores,
            "overallScore": overall_score,
            "strengths": _normalize_string_array(payload.get("strengths")),
            "improvements": _normalize_string_array(payload.get("improvements")),
            "recommendations": _normalize_string_array(payload.get("recommendations")),
            "summary": _clean_text(payload.get("summary")),
            "questionsEvaluation": questions_evaluation,
        }

    def _normalize_scores(self, raw_scores: Any, answers: list[dict[str, Any]]) -> dict[str, float]:
        if not isinstance(raw_scores, dict):
            raise GroqServiceError("A Groq retornou scores em formato invalido.", 502)

        answer_cap = _aggregate_answer_score_cap(answers)
        scores_by_key = {_normalize_key(key): value for key, value in raw_scores.items()}
        normalized_scores: dict[str, float] = {}

        for criterion in EVALUATION_CRITERIA:
            criterion_key = _normalize_key(criterion)
            if criterion_key not in scores_by_key:
                raise GroqServiceError("A Groq retornou criterios incompletos.", 502)
            score = _coerce_score(scores_by_key[criterion_key])
            normalized_scores[criterion] = round(min(score, answer_cap), 1)

        return normalized_scores

    def _normalize_questions_evaluation(
        self,
        raw_questions_evaluation: Any,
        answers: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        if not isinstance(raw_questions_evaluation, list):
            raise GroqServiceError(
                "A Groq retornou avaliacao por pergunta invalida.",
                502,
                category=GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION,
            )

        expected_question_ids = [answer["questionId"] for answer in answers]
        expected_question_ids_set = set(expected_question_ids)
        by_question_id: dict[int, dict[str, Any]] = {}
        returned_question_ids: list[int] = []

        for index, item in enumerate(raw_questions_evaluation):
            if not isinstance(item, dict):
                raise GroqServiceError(
                    "A Groq retornou item de avaliacao invalido.",
                    502,
                    category=GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION,
                    metadata=_questions_evaluation_retry_metadata(
                        expected_question_ids,
                        returned_question_ids,
                    ),
                )

            try:
                question_id = int(item["questionId"])
            except (TypeError, ValueError) as exc:
                raise GroqServiceError(
                    "A Groq retornou questionId invalido na avaliacao.",
                    502,
                    category=GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION,
                    metadata=_questions_evaluation_retry_metadata(
                        expected_question_ids,
                        returned_question_ids,
                    ),
                ) from exc
            except KeyError as exc:
                raise GroqServiceError(
                    "A Groq retornou avaliacao sem questionId.",
                    502,
                    category=GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION,
                    metadata=_questions_evaluation_retry_metadata(
                        expected_question_ids,
                        returned_question_ids,
                    ),
                ) from exc
            if question_id not in expected_question_ids_set:
                logger.warning(
                    "Avaliacao por pergunta com questionId inesperado: %s",
                    {
                        "unexpected_question_id": question_id,
                        "expected_question_ids": expected_question_ids,
                        "returned_question_ids": returned_question_ids + [question_id],
                        "returned_count": len(raw_questions_evaluation),
                    },
                )
                raise GroqServiceError(
                    "A Groq retornou questionId inesperado na avaliacao.",
                    502,
                    category=GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION,
                    metadata=_questions_evaluation_retry_metadata(
                        expected_question_ids,
                        returned_question_ids + [question_id],
                    ),
                )
            if question_id in by_question_id:
                logger.warning(
                    "Avaliacao por pergunta com questionId duplicado: %s",
                    {
                        "duplicated_question_id": question_id,
                        "returned_question_ids": returned_question_ids + [question_id],
                        "returned_count": len(raw_questions_evaluation),
                    },
                )
                raise GroqServiceError(
                    "A Groq retornou questionId duplicado na avaliacao.",
                    502,
                    category=GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION,
                    metadata=_questions_evaluation_retry_metadata(
                        expected_question_ids,
                        returned_question_ids + [question_id],
                    ),
                )
            returned_question_ids.append(question_id)
            by_question_id[question_id] = item

        normalized: list[dict[str, Any]] = []
        for answer in answers:
            question_id = answer["questionId"]
            item = by_question_id.get(question_id)
            if not item:
                missing_question_ids = [
                    expected_id
                    for expected_id in expected_question_ids
                    if expected_id not in by_question_id
                ]
                logger.warning(
                    "Avaliacao por pergunta incompleta: %s",
                    {
                        "expected_question_ids": expected_question_ids,
                        "returned_question_ids": returned_question_ids,
                        "missing_question_ids": missing_question_ids,
                        "returned_count": len(raw_questions_evaluation),
                        "unique_returned_count": len(by_question_id),
                    },
                )
                raise GroqServiceError(
                    "A Groq retornou avaliacao por pergunta incompleta.",
                    502,
                    category=GROQ_ERROR_CATEGORY_STRUCTURAL_INCOMPLETE_EVALUATION,
                    metadata=_questions_evaluation_retry_metadata(
                        expected_question_ids,
                        returned_question_ids,
                    ),
                )

            max_score = _answer_score_cap(answer["answer"])
            score = round(min(_coerce_score(item.get("score")), max_score), 1)
            normalized.append(
                {
                    "questionId": question_id,
                    "score": score,
                    "reason": _clean_text(item.get("reason")),
                    "positives": _normalize_string_array(item.get("positives")),
                    "improvements": _normalize_string_array(item.get("improvements")),
                    "suggestion": _clean_text(item.get("suggestion")),
                }
            )

        return normalized


def _clean_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _questions_evaluation_skeleton(question_ids: list[int]) -> list[dict[str, Any]]:
    return [
        {
            "questionId": question_id,
            "score": 0,
            "reason": "...",
            "positives": ["..."],
            "improvements": ["..."],
            "suggestion": "...",
        }
        for question_id in question_ids
    ]


def _questions_evaluation_retry_metadata(
    expected_question_ids: list[int],
    returned_question_ids: list[int],
) -> dict[str, Any]:
    missing_question_ids = [
        expected_id
        for expected_id in expected_question_ids
        if expected_id not in returned_question_ids
    ]
    return {
        "expectedQuestionIds": expected_question_ids,
        "returnedQuestionIds": returned_question_ids,
        "missingQuestionIds": missing_question_ids,
    }


def _build_structural_retry_message(metadata: dict[str, Any]) -> str:
    expected_question_ids = metadata.get("expectedQuestionIds")
    returned_question_ids = metadata.get("returnedQuestionIds")
    missing_question_ids = metadata.get("missingQuestionIds")
    retry_payload = {
        "expectedQuestionIds": expected_question_ids if isinstance(expected_question_ids, list) else [],
        "returnedQuestionIds": returned_question_ids if isinstance(returned_question_ids, list) else [],
        "missingQuestionIds": missing_question_ids if isinstance(missing_question_ids, list) else [],
    }
    return (
        "A tentativa anterior retornou questionsEvaluation incompleto ou invalido.\n"
        "Use somente estes metadados estruturais para corrigir a nova resposta:\n"
        f"{json.dumps(retry_payload, ensure_ascii=False)}\n"
        "Retorne uma nova avaliacao completa com exatamente um item em questionsEvaluation "
        "para cada expectedQuestionId, sem IDs adicionais e sem IDs duplicados."
    )


def _build_output_validation_retry_message() -> str:
    return (
        "A tentativa anterior falhou na validacao JSON do provedor antes de retornar uma resposta utilizavel.\n"
        "Retorne uma nova avaliacao completa em JSON valido, obedecendo exatamente o formato solicitado no prompt original.\n"
        "Nao inclua texto fora do JSON, markdown, comentarios ou campos extras."
    )


def _build_corrective_retry_message(exc: GroqServiceError) -> str:
    if exc.category == GROQ_ERROR_CATEGORY_OUTPUT_VALIDATION_FAILED:
        return _build_output_validation_retry_message()
    return _build_structural_retry_message(exc.metadata)


def _new_evaluation_attempt_metrics() -> dict[str, Any]:
    return {
        "sdk_attempt_count": 0,
        "rate_limit_count": 0,
        "fallback_exhausted": False,
    }


def _evaluation_response_mode() -> str:
    raw_mode = os.getenv("GROQ_EVALUATION_RESPONSE_MODE", "strict").strip().lower()
    if raw_mode in {"strict", "schema", "json_object"}:
        return raw_mode
    return "strict"


def _evaluation_response_format(answers: list[dict[str, Any]], *, mode: str | None = None) -> dict[str, Any]:
    selected_mode = mode or _evaluation_response_mode()
    if selected_mode == "json_object":
        return {"type": "json_object"}

    expected_question_ids = [answer["questionId"] for answer in answers]
    expected_question_count = len(expected_question_ids)
    string_array_schema = {
        "type": "array",
        "items": {"type": "string"},
    }
    question_evaluation_item_schema = {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "questionId",
            "score",
            "reason",
            "positives",
            "improvements",
            "suggestion",
        ],
        "properties": {
            "questionId": {"type": "integer", "enum": expected_question_ids},
            "score": {"type": "number", "minimum": 0, "maximum": 10},
            "reason": {"type": "string"},
            "positives": string_array_schema,
            "improvements": string_array_schema,
            "suggestion": {"type": "string"},
        },
    }
    scores_schema = {
        "type": "object",
        "additionalProperties": False,
        "required": list(EVALUATION_CRITERIA),
        "properties": {
            criterion: {"type": "number", "minimum": 0, "maximum": 10}
            for criterion in EVALUATION_CRITERIA
        },
    }
    evaluation_schema = {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "scores",
            "strengths",
            "improvements",
            "recommendations",
            "summary",
            "questionsEvaluation",
        ],
        "properties": {
            "scores": scores_schema,
            "strengths": string_array_schema,
            "improvements": string_array_schema,
            "recommendations": string_array_schema,
            "summary": {"type": "string"},
            "questionsEvaluation": {
                "type": "array",
                "minItems": expected_question_count,
                "maxItems": expected_question_count,
                "items": question_evaluation_item_schema,
            },
        },
    }

    return {
        "type": "json_schema",
        "json_schema": {
            "name": "interview_evaluation",
            "strict": selected_mode == "strict",
            "schema": evaluation_schema,
        },
    }


def _increment_metric(metrics: dict[str, Any] | None, key: str) -> None:
    if metrics is None:
        return
    metrics[key] = int(metrics.get(key, 0)) + 1


def _set_metric(metrics: dict[str, Any] | None, key: str, value: Any) -> None:
    if metrics is None:
        return
    metrics[key] = value


def _log_evaluation_structural_attempt(
    *,
    structural_attempt: int,
    max_structural_attempts: int,
    metrics: dict[str, Any],
    started_at: float,
    structural_retry_triggered: bool,
    error_category: str | None,
) -> None:
    logger.info(
        "Groq: tentativa estrutural de avaliacao finalizada: %s",
        {
            "ai_operation": "evaluate_interview",
            "structural_attempt": structural_attempt,
            "max_structural_attempts": max_structural_attempts,
            "sdk_attempt_count": int(metrics.get("sdk_attempt_count", 0)),
            "rate_limit_count": int(metrics.get("rate_limit_count", 0)),
            "structural_retry_triggered": structural_retry_triggered,
            "fallback_exhausted": bool(metrics.get("fallback_exhausted", False)),
            "duration_ms": round((time.monotonic() - started_at) * 1000, 1),
            "error_category": error_category,
        },
    )


def _clean_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    cleaned: list[str] = []
    for item in value:
        text = _clean_text(item)
        if text:
            cleaned.append(text)
    return cleaned


def _extract_groq_error_code(exc: APIStatusError) -> str | None:
    response = getattr(exc, "response", None)
    if response is None:
        return None

    try:
        body = response.json()
    except Exception:
        return None

    if not isinstance(body, dict):
        return None

    error = body.get("error")
    if isinstance(error, dict):
        code = error.get("code") or error.get("type")
        return _clean_text(code) or None

    return None


def _safe_groq_log_fields(exc: Exception) -> dict[str, Any]:
    """Extrai, de forma segura, os unicos tres campos "tecnicos" que o
    Bloco 6 autoriza a incluir em log a partir da excecao original da SDK
    Groq (quando houver): `status_code`, `groq_error_code` (via o mesmo
    helper `_extract_groq_error_code` ja usado desde o Bloco 4) e
    `groq_request_id`.

    Usa somente `getattr(..., default=None)` - nunca acessa `.args`,
    `repr(exc)`, `str(exc)`, nem qualquer atributo que possa conter o corpo
    completo da requisicao/resposta, headers, prompt ou conteudo retornado
    pela Groq. Para uma excecao que nao e um `APIStatusError` (ex.:
    `APIConnectionError`/`APITimeoutError`, ou qualquer erro inesperado),
    `getattr` simplesmente nao encontra os atributos e todos os campos saem
    como `None` - nunca lanca excecao.

    So inclui no dict de retorno os campos que nao sao `None`, para manter
    os logs enxutos (sem `status_code=None, groq_error_code=None, ...`
    poluindo cada linha quando a informacao simplesmente nao existe para
    aquele tipo de erro).
    """
    status_code = getattr(exc, "status_code", None)
    groq_error_code = _extract_groq_error_code(exc) if isinstance(exc, APIStatusError) else None
    groq_request_id = getattr(exc, "request_id", None)

    fields: dict[str, Any] = {}
    if status_code is not None:
        fields["status_code"] = status_code
    if groq_error_code is not None:
        fields["groq_error_code"] = groq_error_code
    if groq_request_id is not None:
        fields["groq_request_id"] = groq_request_id
    return fields


def _rate_limit_cooldown_seconds(exc: Exception) -> float:
    retry_after_seconds = _extract_retry_after_seconds(exc)
    if retry_after_seconds is not None and retry_after_seconds > 0:
        return retry_after_seconds

    raw_value = os.getenv("GROQ_RATE_LIMIT_COOLDOWN_SECONDS", "").strip()
    if raw_value:
        try:
            configured = float(raw_value)
        except ValueError:
            configured = _DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS
        if configured > 0:
            return configured

    return _DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS


def _extract_retry_after_seconds(exc: Exception) -> float | None:
    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None)
    if headers is None:
        return None

    retry_after = None
    for header_name in ("retry-after", "Retry-After"):
        try:
            retry_after = headers.get(header_name)
        except AttributeError:
            retry_after = None
        if retry_after:
            break

    if retry_after is None:
        return None

    retry_after_text = _clean_text(retry_after)
    try:
        seconds = float(retry_after_text)
    except ValueError:
        seconds = _parse_retry_after_http_date(retry_after_text)

    if seconds is None or seconds <= 0:
        return None
    return seconds


def _parse_retry_after_http_date(value: str) -> float | None:
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return (parsed - datetime.now(timezone.utc)).total_seconds()


def _normalize_string_array(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [text for text in (_clean_text(item) for item in value) if text]


def _extract_questions_evaluation(payload: dict[str, Any]) -> Any:
    aliases = (
        "questionsEvaluation",
        "questionEvaluations",
        "questions_evaluation",
        "question_evaluations",
    )

    for alias in aliases:
        extracted = _unwrap_items(payload.get(alias))
        if extracted is not None:
            return extracted

    evaluation = payload.get("evaluation")
    if isinstance(evaluation, dict):
        extracted = _unwrap_items(evaluation.get("questionsEvaluation"))
        if extracted is not None:
            return extracted

    return None


def _unwrap_items(value: Any) -> Any:
    if isinstance(value, dict) and "items" in value:
        return value.get("items")
    return value


def _normalize_key(value: Any) -> str:
    return (
        _clean_text(value)
        .lower()
        .replace("ç", "c")
        .replace("ã", "a")
        .replace("á", "a")
        .replace("â", "a")
        .replace("é", "e")
        .replace("ê", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ô", "o")
        .replace("ú", "u")
    )


def _coerce_score(value: Any) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError) as exc:
        raise GroqServiceError("A Groq retornou score nao numerico.", 502) from exc
    return max(0.0, min(10.0, score))


def _answer_score_cap(answer: str) -> float:
    normalized = _clean_text(answer).lower()
    compact = " ".join(normalized.split())

    if not compact:
        return 0.0
    if compact in {"nao sei", "não sei", "n sei", "sei nao", "sei não"}:
        return 1.0
    if len(compact) < 20:
        return 2.0
    return 10.0


def _aggregate_answer_score_cap(answers: list[dict[str, Any]]) -> float:
    if not answers:
        return 0.0
    caps = [_answer_score_cap(answer.get("answer", "")) for answer in answers]
    return round(sum(caps) / len(caps), 1)


def _normalize_question_type(value: Any) -> str:
    cleaned = _clean_text(value).lower()
    replacements = {
        "técnica": "tecnica",
        "tecnica": "tecnica",
        "technical": "tecnica",
        "comportamental": "comportamental",
        "behavioral": "comportamental",
        "carreira": "carreira",
        "career": "carreira",
    }
    normalized = replacements.get(cleaned, cleaned)
    if normalized == "tecnica":
        return "Tecnica"
    if normalized == "comportamental":
        return "Comportamental"
    if normalized == "carreira":
        return "Carreira"
    return _clean_text(value)


def describe_groq_service_error(exc: GroqServiceError) -> dict[str, Any]:
    """QA de observabilidade (branch work/groq-avaliacao-502).

    Monta, a partir de um `GroqServiceError` já capturado, um dicionário
    seguro para log — nunca para resposta ao cliente (isso já é feito por
    `str(exc)`/`exc.status_code` em `app.py`).

    Inclui somente:
    - `status_code`: o status HTTP que a própria API já decidiu devolver
      (ex.: 502), nunca o status bruto da Groq quando ele não corresponde
      a um `APIStatusError` real (ver abaixo).
    - `message`: a mensagem controlada e estática do próprio
      `GroqServiceError` (ex.: "A Groq retornou avaliacao por pergunta
      invalida."). Nunca é o conteúdo gerado pela IA, nunca é o prompt,
      nunca é a resposta do candidato.
    - `groq_status_code` / `groq_error_code` / `groq_request_id`: só
      quando a causa raiz (`exc.__cause__`) for de fato um
      `APIStatusError` da Groq (ex.: um 429 real). Quando o 502 vem de uma
      falha de validação/parsing feita aqui mesmo depois de um 200 da
      Groq (como o caso já observado desta investigação), a Groq nunca
      retornou erro — então esses três campos simplesmente não existem e
      não são incluídos.

    Nunca inclui: API key, header de autorização, prompt, payload
    completo, respostas do candidato, resposta bruta da Groq (incluindo
    qualquer `failed_generation`), dados pessoais, tokens/cookies/JWT.
    `_extract_groq_error_code` (já usado hoje em `evaluate_interview`) só
    extrai `error.code`/`error.type` do corpo de erro da Groq — nunca o
    corpo inteiro.
    """
    description: dict[str, Any] = {
        "status_code": exc.status_code,
        "message": str(exc),
    }

    cause = exc.__cause__
    if isinstance(cause, APIStatusError):
        groq_status_code = getattr(cause, "status_code", None)
        if groq_status_code is not None:
            description["groq_status_code"] = groq_status_code

        groq_error_code = _extract_groq_error_code(cause)
        if groq_error_code:
            description["groq_error_code"] = groq_error_code

        groq_request_id = getattr(cause, "request_id", None)
        if groq_request_id:
            description["groq_request_id"] = groq_request_id

    return description
