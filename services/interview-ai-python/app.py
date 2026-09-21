import os

from flask import Flask, jsonify, request

from groq_service import GroqService, GroqServiceError
from job_context_adapter import JobContextAdapterError, extract_job_context


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
            return jsonify({"error": str(exc)}), exc.status_code
        except Exception:
            return jsonify({"error": "Erro inesperado ao avaliar entrevista."}), 500

        return jsonify(evaluation)

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port)
