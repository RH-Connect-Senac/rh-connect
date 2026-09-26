import logging
import os

from flask import Flask, jsonify, request

from groq_service import GroqService, GroqServiceError, describe_groq_service_error
from job_context_adapter import JobContextAdapterError, extract_job_context

# QA de observabilidade (branch work/groq-avaliacao-502): logger próprio do
# módulo app, usado apenas para registrar (sem expor ao cliente) qual
# validação controlada de GroqServiceError disparou um 502/erro no fluxo
# /evaluate. Nenhuma configuração de handler/formatter é feita aqui de
# propósito — sem isso, os campos de `describe_groq_service_error` não
# apareceriam se passados via `extra=`, por isso são embutidos diretamente
# na mensagem formatada abaixo, garantindo visibilidade mesmo com a
# configuração de logging padrão do Python (saída em stderr).
logger = logging.getLogger(__name__)


def create_app() -> Flask:
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

        try:
            evaluation = GroqService().evaluate_interview(context, answers)
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
