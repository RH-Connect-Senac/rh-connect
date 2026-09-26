"""QA de observabilidade (branch work/groq-avaliacao-502).

Cobre a nova função `describe_groq_service_error` (groq_service.py) e o
logging adicionado ao tratamento de GroqServiceError em POST /evaluate
(app.py). Nenhum destes testes faz qualquer chamada real à Groq: toda
falha é simulada localmente, construindo os objetos de exceção diretamente
(inclusive um `groq.APIStatusError` real, mas instanciado via `__new__`
para não depender da assinatura do construtor da SDK nem de rede).

Não testa (e não deveria, por design): lógica de prompts, de schema de
avaliação, de mocks de entrevista, nem o round-robin de chaves — nada
disso foi alterado nesta tarefa.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest
from groq import APIStatusError

from app import create_app
from groq_service import GroqServiceError, describe_groq_service_error


def _make_fake_groq_api_status_error(
    *, status_code: int, error_code: str, request_id: str
) -> APIStatusError:
    """Constrói um `APIStatusError` real da SDK da Groq sem chamar seu
    `__init__` (cuja assinatura exata não precisamos reproduzir aqui) e sem
    nenhuma chamada de rede — só para exercitar o `isinstance` real que
    `describe_groq_service_error` usa."""
    err = APIStatusError.__new__(APIStatusError)
    err.status_code = status_code
    err.request_id = request_id
    err.response = SimpleNamespace(json=lambda: {"error": {"code": error_code}})
    return err


class TestDescribeGroqServiceError:
    def test_erro_de_validacao_pos_200_nao_inclui_campos_da_groq(self):
        # Caso real já observado: a Groq respondeu 200, mas o parsing da
        # avaliação falhou aqui mesmo (ex.: questionsEvaluation não é uma
        # lista) — não existe status/código/request_id da Groq para expor,
        # porque a Groq nunca retornou erro.
        exc = GroqServiceError("A Groq retornou avaliacao por pergunta invalida.", 502)

        description = describe_groq_service_error(exc)

        assert description == {
            "status_code": 502,
            "message": "A Groq retornou avaliacao por pergunta invalida.",
        }
        assert "groq_status_code" not in description
        assert "groq_error_code" not in description
        assert "groq_request_id" not in description

    def test_erro_real_da_groq_inclui_status_codigo_e_request_id(self):
        cause = _make_fake_groq_api_status_error(
            status_code=429, error_code="rate_limit_exceeded", request_id="req_abc123"
        )
        exc = GroqServiceError("A Groq retornou erro ao avaliar entrevista.", 502)
        exc.__cause__ = cause

        description = describe_groq_service_error(exc)

        assert description["status_code"] == 502
        assert description["message"] == "A Groq retornou erro ao avaliar entrevista."
        assert description["groq_status_code"] == 429
        assert description["groq_error_code"] == "rate_limit_exceeded"
        assert description["groq_request_id"] == "req_abc123"

    def test_causa_que_nao_e_apistatuserror_e_ignorada(self):
        # Ex.: o branch "except Exception as exc" genérico de
        # evaluate_interview, que também relança como GroqServiceError.
        exc = GroqServiceError("Falha inesperada ao avaliar entrevista.", 502)
        exc.__cause__ = ValueError("qualquer outra causa interna")

        description = describe_groq_service_error(exc)

        assert description == {
            "status_code": 502,
            "message": "Falha inesperada ao avaliar entrevista.",
        }

    def test_nunca_inclui_chaves_sensiveis(self):
        # Trava de segurança: mesmo que alguém amplie describe_groq_service_error
        # no futuro, este teste falha se qualquer chave sensível vazar.
        cause = _make_fake_groq_api_status_error(
            status_code=400, error_code="json_validate_failed", request_id="req_xyz"
        )
        exc = GroqServiceError("A Groq retornou JSON invalido.", 502)
        exc.__cause__ = cause

        description = describe_groq_service_error(exc)

        forbidden_keys = {
            "api_key",
            "authorization",
            "prompt",
            "payload",
            "answers",
            "context",
            "failed_generation",
            "raw_response",
        }
        assert forbidden_keys.isdisjoint(description.keys())


class TestEvaluateRouteLogging:
    @pytest.fixture
    def client(self):
        app = create_app()
        app.testing = True
        return app.test_client()

    def test_groq_service_error_no_evaluate_gera_log_sem_expor_dados_sensiveis(
        self, client, monkeypatch, caplog
    ):
        # Mock total do GroqService.evaluate_interview — nenhuma chamada real
        # à Groq acontece neste teste.
        def _raise_groq_service_error(self, context, answers):
            raise GroqServiceError(
                "A Groq retornou avaliacao por pergunta invalida.", 502
            )

        monkeypatch.setattr(
            "app.GroqService.evaluate_interview", _raise_groq_service_error
        )

        candidate_answer_marker = "RESPOSTA_CONFIDENCIAL_DO_CANDIDATO_NAO_DEVE_VAZAR"

        with caplog.at_level("WARNING"):
            response = client.post(
                "/evaluate",
                json={
                    "context": {"title": "Vaga Teste"},
                    "answers": [
                        {
                            "questionId": 1,
                            "questionText": "Pergunta teste?",
                            "answer": candidate_answer_marker,
                        }
                    ],
                },
            )

        assert response.status_code == 502
        assert (
            response.get_json()["error"]
            == "A Groq retornou avaliacao por pergunta invalida."
        )

        warning_records = [r for r in caplog.records if r.levelname == "WARNING"]
        assert len(warning_records) == 1

        logged_text = warning_records[0].getMessage()
        assert "GroqServiceError em POST /evaluate" in logged_text
        assert "A Groq retornou avaliacao por pergunta invalida." in logged_text
        assert "502" in logged_text

        # A resposta do candidato (dado sensível) nunca deve aparecer no log.
        assert candidate_answer_marker not in logged_text
