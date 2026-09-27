"""Testes do Bloco 1: parse e configuracao das API keys da Groq.

Cobre exclusivamente a nova funcao `parse_groq_api_keys` (groq_service.py):
leitura de `GROQ_API_KEYS` (lista separada por virgula) com fallback para
`GROQ_API_KEY` (chave unica), e o erro de configuracao quando nenhuma das
duas fornece uma chave valida.

Escopo explicito deste bloco (branch work/groq-roteamento-chaves):
- NAO testa round-robin, pool, threading.Lock, max_retries ou fallback 429 -
  nada disso foi implementado nesta rodada.
- NAO conecta com `_client()` - a funcao ainda nao e usada pelo cliente Groq
  real; essa integracao fica para um bloco futuro (Bloco 3).
- NAO testa deduplicacao - nesta etapa, duplicatas sao preservadas de
  proposito (decisao explicita, nao implementada ainda).
- Usa somente valores de chave obviamente falsos (ex.: "fake-key-A").
  Nenhuma chamada real a Groq acontece em nenhum destes testes.
"""

from __future__ import annotations

import pytest

from groq_service import GroqConfigurationError, parse_groq_api_keys


def test_uma_chave_em_groq_api_keys(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    assert parse_groq_api_keys() == ["fake-key-A"]


def test_multiplas_chaves_em_groq_api_keys(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B,fake-key-C")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    assert parse_groq_api_keys() == ["fake-key-A", "fake-key-B", "fake-key-C"]


def test_chaves_com_espacos_sao_removidos(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", " fake-key-A , fake-key-B ")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    assert parse_groq_api_keys() == ["fake-key-A", "fake-key-B"]


def test_entradas_vazias_sao_descartadas(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,,fake-key-B,")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    assert parse_groq_api_keys() == ["fake-key-A", "fake-key-B"]


def test_apenas_espacos_e_virgulas_sem_fallback_levanta_erro(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", " , , ")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    with pytest.raises(GroqConfigurationError):
        parse_groq_api_keys()


def test_groq_api_keys_ausente_usa_groq_api_key(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEYS", raising=False)
    monkeypatch.setenv("GROQ_API_KEY", "fake-key-single")

    assert parse_groq_api_keys() == ["fake-key-single"]


def test_groq_api_keys_vazia_usa_groq_api_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "")
    monkeypatch.setenv("GROQ_API_KEY", "fake-key-single")

    assert parse_groq_api_keys() == ["fake-key-single"]


def test_groq_api_keys_so_com_espacos_e_virgulas_usa_groq_api_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", " , , ")
    monkeypatch.setenv("GROQ_API_KEY", "fake-key-single")

    assert parse_groq_api_keys() == ["fake-key-single"]


def test_groq_api_keys_tem_precedencia_quando_ambas_definidas(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-B")
    monkeypatch.setenv("GROQ_API_KEY", "fake-key-single")

    assert parse_groq_api_keys() == ["fake-key-A", "fake-key-B"]


def test_nenhuma_configurada_levanta_erro_de_configuracao(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEYS", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    with pytest.raises(GroqConfigurationError):
        parse_groq_api_keys()


def test_groq_api_key_somente_com_espacos_levanta_erro(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEYS", raising=False)
    monkeypatch.setenv("GROQ_API_KEY", "   ")

    with pytest.raises(GroqConfigurationError):
        parse_groq_api_keys()


def test_quantidade_dinamica_de_chaves_sem_limite_fixo(monkeypatch):
    fake_keys = [f"fake-key-{i}" for i in range(5)]
    monkeypatch.setenv("GROQ_API_KEYS", ",".join(fake_keys))
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    assert parse_groq_api_keys() == fake_keys


def test_duplicatas_sao_preservadas_sem_deduplicacao(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", "fake-key-A,fake-key-A,fake-key-B")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    assert parse_groq_api_keys() == ["fake-key-A", "fake-key-A", "fake-key-B"]


def test_mensagem_de_erro_nao_contem_valores_de_chave(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEYS", " , , ")
    monkeypatch.setenv("GROQ_API_KEY", "   ")

    with pytest.raises(GroqConfigurationError) as exc_info:
        parse_groq_api_keys()

    message = str(exc_info.value)
    for fake_key in ("fake-key", "fake-key-A", "fake-key-B", "fake-key-single"):
        assert fake_key not in message
