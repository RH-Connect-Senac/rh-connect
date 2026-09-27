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
        with self._lock:
            key = self._keys[self._index]
            self._index = (self._index + 1) % len(self._keys)

        return key

    def __len__(self) -> int:
        return len(self._keys)
