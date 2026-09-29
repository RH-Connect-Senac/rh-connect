"""Pool de API keys da Groq com selecao round-robin thread-safe.

Bloco 2 (branch work/groq-roteamento-chaves): apenas a estrutura de pool e
round-robin. Escopo explicito do que este modulo NAO faz nesta rodada:

- NAO importa nem instancia o cliente Groq (`Groq`) nem qualquer classe do
  SDK `groq` - o pool conhece somente uma lista de strings, um indice
  inteiro e um `threading.Lock`. Nenhuma dependencia do SDK, de rede ou de
  qualquer outro modulo do projeto.
- NAO e usado por `_client()` ainda - a integracao com o cliente Groq real
  fica para um bloco futuro (Bloco 3).
- NAO implementa `max_retries=0`, fallback para status 429, tratamento de
  erro por subclasse, logging de fallback, nem qualquer outra politica de
  retry/observabilidade.
- NAO deduplica as keys recebidas e NAO impoe limite maximo de quantidade.
- NAO cria nenhum singleton global - cada `GroqKeyPool` e uma instancia
  isolada, criada explicitamente por quem for usa-la.
- NAO loga nenhuma key, em nenhum nivel de log, em nenhum momento.

Sobre thread safety: o `threading.Lock` usado aqui protege apenas threads
dentro do MESMO processo Python. Se a aplicacao rodar com multiplos
processos ou workers (ex.: `gunicorn -w N`), cada processo tera sua propria
instancia de `GroqKeyPool` e seu proprio indice, sem nenhuma coordenacao
entre processos - isso e uma limitacao conhecida e fora do escopo deste
bloco (ver item R do relatorio de entrega).
"""

from __future__ import annotations

import threading
import time


class GroqKeyPoolError(Exception):
    """Erro controlado do pool de keys (ex.: pool construido sem nenhuma key).

    Classe de erro dedicada e independente de `GroqServiceError`/
    `GroqConfigurationError` (definidas em `groq_service.py`), para que este
    modulo nao precise importar `groq_service` - e, por consequencia, nao
    precise importar o SDK `groq` - apenas para sinalizar um erro de
    configuracao do pool. Mensagem sempre fixa, sem incluir nenhum valor de
    key.
    """


class GroqKeyPool:
    """Selecao round-robin thread-safe sobre uma lista fixa de API keys.

    Conhece apenas tres coisas: a lista de keys (copiada na construcao, para
    nunca ser afetada por mutacoes externas posteriores nem afetar a lista
    original do chamador), um indice inteiro que aponta para a proxima key a
    ser retornada, e um `threading.Lock` que protege a leitura/avanco desse
    indice. Nao conhece nada sobre Groq, HTTP, retries ou qualquer outra
    infraestrutura - e uma unidade isolada e testavel por si so.
    """

    def __init__(self, keys: list[str]) -> None:
        if not keys:
            raise GroqKeyPoolError(
                "GroqKeyPool requer ao menos uma API key configurada."
            )

        # Copia defensiva: mutacoes feitas pelo chamador na lista original
        # (antes ou depois da construcao) nunca afetam o pool, e o pool
        # nunca expoe nem modifica a lista original recebida.
        self._keys: list[str] = list(keys)
        self._cooldowns: dict[str, float] = {}
        self._index = 0
        self._lock = threading.Lock()

    @property
    def keys(self) -> tuple[str, ...]:
        """Copia imutavel (tupla) das keys configuradas, na ordem original."""
        return tuple(self._keys)

    def next_key(self) -> str:
        """Retorna a proxima key em round-robin e avanca o indice.

        Secao critica minima, protegida pelo lock: ler o indice atual,
        selecionar a key correspondente e avancar o indice com modulo (para
        voltar ao inicio apos a ultima key). O lock e liberado antes do
        `return` - nenhuma operacao externa, de rede ou chamada a Groq
        acontece dentro da secao critica, nem em nenhum outro ponto deste
        metodo.

        Importante: o `threading.Lock` protege apenas threads dentro deste
        mesmo processo Python; nao ha nenhuma coordenacao entre processos ou
        workers distintos.
        """
        key, _slot = self.next_key_with_slot()
        return key

    def next_key_with_slot(self) -> tuple[str, int]:
        """Retorna a proxima key e o slot logico 1-based usado.

        O slot representa somente a posicao da credencial na lista carregada
        em memoria. Ele nao e derivado do valor da key e nao permite
        reconstruir a credencial.
        """
        with self._lock:
            slot = self._index + 1
            key = self._keys[self._index]
            self._index = (self._index + 1) % len(self._keys)

        return key, slot

    def mark_rate_limited(self, key: str, cooldown_seconds: float) -> None:
        """Marca uma credencial como temporariamente indisponivel por 429.

        O estado fica apenas em memoria, por processo, e nunca e logado ou
        exposto. A chave volta a ser elegivel automaticamente quando o
        timestamp monotonic armazenado expira.
        """
        if cooldown_seconds <= 0:
            return

        cooldown_until = time.monotonic() + cooldown_seconds
        with self._lock:
            current_until = self._cooldowns.get(key, 0.0)
            self._cooldowns[key] = max(current_until, cooldown_until)

    def next_unique_key(self, excluded: set[str]) -> str | None:
        """Retorna a proxima key em round-robin que NAO esteja em `excluded`.

        Resolve, em uma unica secao critica, dois problemas ao mesmo tempo:

        1. Concorrencia entre operacoes: como o indice global e compartilhado
           por todas as operacoes que usam o mesmo `GroqKeyPool`, uma chamada
           comum a `next_key()` pode devolver, para esta operacao, uma key
           que OUTRA operacao concorrente ja fez o indice avancar sobre - ou
           pior, uma key que a propria operacao chamadora ja tentou antes,
           caso o indice tenha dado a volta completa por causa de chamadas
           concorrentes de outras operacoes. `next_unique_key` elimina esse
           risco: quem chama informa o conjunto de keys (valores, nao
           posicoes) que ja tentou NESTA operacao, e o metodo garante que o
           valor devolvido nao esta nesse conjunto - nao importa quantas
           voltas o indice global tenha dado por causa de outras operacoes.
        2. Keys duplicadas na configuracao (ex.: `GROQ_API_KEYS=A,A,B`): sem
           este metodo, uma politica de "no maximo `len(pool)` tentativas"
           poderia selecionar o mesmo valor "A" duas vezes dentro de uma
           unica operacao, simplesmente porque ele ocupa duas posicoes/slots
           do round-robin. Como a comparacao aqui e por VALOR (`excluded` e
           um conjunto de valores de key, nao de indices), a segunda
           ocorrencia de "A" e pulada automaticamente, sem que o parser
           global (`parse_groq_api_keys`) ou a lista armazenada precisem
           mudar - a deduplicacao de fato acontece apenas na fronteira desta
           chamada, por operacao, e nunca de forma global/permanente.

        Comportamento e garantias:

        - Secao critica minima, protegida pelo MESMO `threading.Lock` usado
          por `next_key()` (nao ha lock adicional nem lock separado): varre,
          a partir do indice atual, no maximo `len(self._keys)` posicoes,
          avancando o indice a cada posicao examinada exatamente como
          `next_key()` faz (`(indice + 1) % len(self._keys)`), ate encontrar
          um valor que nao esteja em `excluded`. Assim que encontra, retorna
          esse valor - o lock e liberado antes do `return`.
        - Nunca reinicia nem retrocede o indice global: sempre continua a
          partir de onde o round-robin global estava, preservando a
          continuidade entre operacoes diferentes (a proxima operacao a
          chamar `next_key()`/`next_unique_key()` comeca de onde esta
          operacao parou, e nao do inicio).
        - Se a varredura completa (`len(self._keys)` posicoes examinadas) nao
          encontrar nenhum valor fora de `excluded`, retorna `None` - nao ha
          loop infinito, nao ha excecao lancada por este metodo, e nenhuma
          posicao e examinada mais de uma vez por chamada.
        - Nenhuma operacao de rede, chamada a Groq, log ou exposicao de
          valor de key acontece dentro da secao critica nem em nenhum outro
          ponto deste metodo - identico, nesse aspecto, a `next_key()`.
        - Assim como `next_key()`, o lock protege apenas threads dentro do
          mesmo processo Python; nao ha coordenacao entre processos ou
          workers distintos.
        """
        result = self.next_unique_key_with_slot(excluded)
        if result is None:
            return None
        key, _slot = result
        return key

    def next_unique_key_with_slot(self, excluded: set[str]) -> tuple[str, int] | None:
        """Retorna a proxima key unica e o slot logico 1-based usado.

        A politica de selecao e identica a `next_unique_key`; o segundo item
        da tupla e apenas observabilidade anonima da posicao no pool.
        """
        with self._lock:
            total = len(self._keys)
            now = time.monotonic()
            for _ in range(total):
                slot = self._index + 1
                candidate = self._keys[self._index]
                self._index = (self._index + 1) % total
                cooldown_until = self._cooldowns.get(candidate)
                if cooldown_until is not None and cooldown_until <= now:
                    self._cooldowns.pop(candidate, None)
                    cooldown_until = None
                if candidate not in excluded and cooldown_until is None:
                    return candidate, slot

        return None

    def __len__(self) -> int:
        return len(self._keys)
