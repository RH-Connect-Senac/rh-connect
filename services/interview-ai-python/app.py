import logging
import os
import time

from flask import Flask, jsonify, request

from evaluation_limiter import EvaluationCapacityError, get_evaluation_limiter
from groq_service import GroqService, GroqServiceError, describe_groq_service_error
from job_context_adapter import JobContextAdapterError, extract_job_context

# QA de observabilidade: logger proprio do modulo app, usado para registrar
# eventos operacionais seguros do fluxo /evaluate. Campos de diagnostico sao
# embutidos na mensagem formatada, nao dependem de formatter estruturado, e
# nunca incluem prompt, payload, respostas do candidato ou segredos.
logger = logging.getLogger(__name__)
_LOG_FORMAT = "%(levelname)s:%(name)s:%(message)s"
_RH_CONNECT_LOG_HANDLER_MARKER = "_rh_connect_python_service_handler"


def configure_logging() -> None:
    """Configure safe process logging once for the local Python service."""
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    if root_logger.handlers:
        return

    handler = logging.StreamHandler()
    setattr(handler, _RH_CONNECT_LOG_HANDLER_MARKER, True)
    handler.setFormatter(logging.Formatter(_LOG_FORMAT))
    root_logger.addHandler(handler)


def _monotonic() -> float:
    return time.monotonic()


def create_app() -> Flask:
    configure_logging()
    app = Flask(__name__)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.post("/job-context")
    def job_context():
        payload = request.get_json(silent=True) or {}
        url = payload.get("url")

        try:
            context = extract_job_context(url)
        except JobContextAdapterError as exc:
            return jsonify({"error": str(exc)}), exc.status_code
        except Exception:
            return jsonify({"error": "Erro inesperado ao extrair a vaga."}), 500

        return jsonify(context)

    @app.post("/questions")
    def questions():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "Informe um payload JSON valido."}), 400

        context = payload.get("context")
        if not isinstance(context, dict):
            return jsonify({"error": "Informe o contexto da vaga."}), 400

        try:
            generated_questions = GroqService().generate_questions(context)
        except GroqServiceError as exc:
            return jsonify({"error": str(exc)}), exc.status_code
        except Exception:
            return jsonify({"error": "Erro inesperado ao gerar perguntas."}), 500

        return jsonify({"questions": generated_questions})

    @app.post("/evaluate")
    def evaluate():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify({"error": "Informe um payload JSON valido."}), 400

        context = payload.get("context")
        if not isinstance(context, dict):
            return jsonify({"error": "Informe o contexto da vaga."}), 400

        answers = payload.get("answers")
        if not isinstance(answers, list):
            return jsonify({"error": "Informe as respostas da entrevista."}), 400

        limiter = get_evaluation_limiter()
        request_started_at = _monotonic()

        try:
            with limiter.acquire() as lease:
                execution_started_at = _monotonic()
                try:
                    evaluation = GroqService().evaluate_interview(context, answers)
                finally:
                    finished_at = _monotonic()
                    execution_duration_ms = (finished_at - execution_started_at) * 1000
                    total_duration_ms = (finished_at - request_started_at) * 1000
                    snapshot = limiter.snapshot()
                    logger.info(
                        "POST /evaluate finalizado: %s",
                        {
                            "active_evaluations": snapshot.active_evaluations,
                            "waiting_evaluations": snapshot.waiting_evaluations,
                            "max_concurrency": snapshot.max_concurrency,
                            "queue_wait_ms": round(lease.queue_wait_ms, 1),
                            "execution_duration_ms": round(execution_duration_ms, 1),
                            "total_duration_ms": round(total_duration_ms, 1),
                        },
                    )
        except EvaluationCapacityError as exc:
            return jsonify({"error": str(exc)}), exc.status_code
        except GroqServiceError as exc:
            # QA de observabilidade (branch work/groq-avaliacao-502): antes,
            # nenhum log server-side identificava qual validação controlada
            # gerou o 502 — só o access log ("POST /evaluate HTTP/1.1" 502
            # -) e a mensagem na resposta HTTP ao cliente. Este log embute os
            # campos diretamente na mensagem (não via `extra=`) para
            # aparecer mesmo sem configuração de logging customizada.
            description = describe_groq_service_error(exc)
            logger.warning(
                "GroqServiceError em POST /evaluate: %s", description
            )
            return jsonify({"error": str(exc)}), exc.status_code
        except Exception:
            return jsonify({"error": "Erro inesperado ao avaliar entrevista."}), 500

        return jsonify(evaluation)

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port)
