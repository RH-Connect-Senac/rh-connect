"""Groq integration module."""

from __future__ import annotations

import json
import logging
import os
import threading
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

    def __init__(self, message: str, status_code: int = 502, category: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        # Bloco 4: categoria controlada e testavel do erro (ver
        # GROQ_ERROR_CATEGORY_* abaixo), para que o restante do servico
        # saiba qual tipo de erro da Groq aconteceu sem precisar analisar
        # texto de mensagem. `None` para erros que nao vem de uma chamada a
        # Groq (ex.: GroqConfigurationError, erros de validacao de
        # payload).
        self.category = category


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

        completion = self._execute_with_rate_limit_fallback(_call_groq, action="gerar perguntas")

        content = completion.choices[0].message.content if completion.choices else ""
        return self._parse_questions_response(content)

    def evaluate_interview(self, context: dict[str, Any], answers: list[dict[str, Any]]) -> dict[str, Any]:
        self._validate_context(context)
        normalized_answers = self._validate_answers(answers)

        model = self._model()
        prompt = self._build_evaluation_prompt(context, normalized_answers)

        def _call_groq(client: Groq):
            try:
                return client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "Voce e um avaliador educacional de entrevistas profissionais. "
                                "Avalie com foco em desenvolvimento do candidato. "
                                "Responda somente com JSON valido, sem markdown."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.2,
                    response_format={"type": "json_object"},
                )
            except APIStatusError as exc:
                # Preserva o logging de observabilidade ja existente nesta
                # branch (inalterado - mesmos campos, mesmo nivel, nenhum
                # dado sensivel). Como agora pode haver mais de uma
                # tentativa por operacao (Bloco 5, somente para 429), este
                # log pode disparar uma vez por tentativa que falhar com
                # APIStatusError - nao e observabilidade nova, e o mesmo
                # log de sempre, agora natural de mais de uma tentativa
                # existir. Ver secao de riscos da entrega do Bloco 5.
                logger.warning(
                    "Groq APIStatusError while evaluating interview",
                    extra={
                        "groq_status_code": getattr(exc, "status_code", None),
                        "groq_error_code": _extract_groq_error_code(exc),
                        "groq_request_id": getattr(exc, "request_id", None),
                    },
                )
                raise

        completion = self._execute_with_rate_limit_fallback(_call_groq, action="avaliar entrevista")

        content = completion.choices[0].message.content if completion.choices else ""
        return self._parse_evaluation_response(content, normalized_answers)

    def _execute_with_rate_limit_fallback(self, call_groq, *, action: str) -> Any:
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
        """
        pool = _get_key_pool()
        max_attempts = len(set(pool.keys))

        tried_keys: set[str] = set()
        last_rate_limit_error: GroqServiceError | None = None
        last_rate_limit_cause: Exception | None = None

        for _attempt_number in range(max_attempts):
            api_key = pool.next_unique_key(tried_keys)
            if api_key is None:
                # Estruturalmente inalcancavel: `max_attempts` e o numero de
                # credenciais distintas, entao ha sempre uma credencial nao
                # tentada disponivel para cada uma das `max_attempts`
                # iteracoes. Mantido como rede de seguranca defensiva,
                # consistente com o estilo do restante do codigo - encerra o
                # loop sem tentar novamente em vez de arriscar qualquer
                # comportamento inesperado.
                break

            tried_keys.add(api_key)
            client = self._client(api_key=api_key)
            try:
                return call_groq(client)
            except Exception as exc:
                translated = _translate_groq_error(exc, action=action)
                if translated.category != GROQ_ERROR_CATEGORY_RATE_LIMIT:
                    raise translated from exc

                # Categoria rate_limit: NAO sobe ainda - tenta a proxima
                # credencial ainda nao tentada na proxima iteracao (se
                # houver alguma restante).
                last_rate_limit_error = translated
                last_rate_limit_cause = exc

        # As `max_attempts` tentativas (uma por credencial distinta
        # disponivel) esgotaram, todas com rate_limit. Levanta o ultimo erro
        # classificado, preservando o encadeamento da causa original.
        assert last_rate_limit_error is not None  # max_attempts >= 1 (pool nunca vazio)
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
            "- Cada item de questionsEvaluation deve conter questionId, score, reason, positives, improvements e suggestion.\n\n"
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
            '"questionsEvaluation": ['
            '{"questionId": 1, "score": 0, "reason": "...", "positives": ["..."], '
            '"improvements": ["..."], "suggestion": "..."}'
            "]"
            "}\n\n"
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
            raise GroqServiceError("A Groq retornou avaliacao por pergunta invalida.", 502)

        by_question_id: dict[int, dict[str, Any]] = {}
        for index, item in enumerate(raw_questions_evaluation):
            if not isinstance(item, dict):
                raise GroqServiceError("A Groq retornou item de avaliacao invalido.", 502)

            fallback_question_id = answers[index]["questionId"] if index < len(answers) else None
            try:
                question_id = int(
                    item.get("questionId")
                    or item.get("question_id")
                    or item.get("id")
                    or fallback_question_id
                )
            except (TypeError, ValueError) as exc:
                raise GroqServiceError("A Groq retornou questionId invalido na avaliacao.", 502) from exc
            by_question_id[question_id] = item

        normalized: list[dict[str, Any]] = []
        for answer in answers:
            question_id = answer["questionId"]
            item = by_question_id.get(question_id)
            if not item:
                raise GroqServiceError("A Groq retornou avaliacao por pergunta incompleta.", 502)

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
