"""Groq integration module."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from dotenv import load_dotenv
from groq import APIConnectionError, APIStatusError, APITimeoutError, Groq

from schemas import EVALUATION_CRITERIA, QUESTION_TYPES

logger = logging.getLogger(__name__)


class GroqServiceError(Exception):
    """Controlled error raised by Groq integrations."""

    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


class GroqConfigurationError(GroqServiceError):
    """Raised when the local Groq configuration is missing."""

    def __init__(self, message: str):
        super().__init__(message, 500)


class GroqService:
    def __init__(self) -> None:
        load_dotenv()

    def generate_questions(self, context: dict[str, Any]) -> list[dict[str, Any]]:
        self._validate_context(context)

        client = self._client()
        model = self._model()
        prompt = self._build_questions_prompt(context)

        try:
            completion = client.chat.completions.create(
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
        except APITimeoutError as exc:
            raise GroqServiceError("Tempo esgotado ao gerar perguntas.", 504) from exc
        except APIConnectionError as exc:
            raise GroqServiceError("Nao foi possivel conectar a Groq.", 502) from exc
        except APIStatusError as exc:
            raise GroqServiceError("A Groq retornou erro ao gerar perguntas.", 502) from exc
        except Exception as exc:
            raise GroqServiceError("Falha inesperada ao gerar perguntas.", 502) from exc

        content = completion.choices[0].message.content if completion.choices else ""
        return self._parse_questions_response(content)

    def evaluate_interview(self, context: dict[str, Any], answers: list[dict[str, Any]]) -> dict[str, Any]:
        self._validate_context(context)
        normalized_answers = self._validate_answers(answers)

        client = self._client()
        model = self._model()
        prompt = self._build_evaluation_prompt(context, normalized_answers)

        try:
            completion = client.chat.completions.create(
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
        except APITimeoutError as exc:
            raise GroqServiceError("Tempo esgotado ao avaliar entrevista.", 504) from exc
        except APIConnectionError as exc:
            raise GroqServiceError("Nao foi possivel conectar a Groq.", 502) from exc
        except APIStatusError as exc:
            logger.warning(
                "Groq APIStatusError while evaluating interview",
                extra={
                    "groq_status_code": getattr(exc, "status_code", None),
                    "groq_error_code": _extract_groq_error_code(exc),
                    "groq_request_id": getattr(exc, "request_id", None),
                },
            )
            raise GroqServiceError("A Groq retornou erro ao avaliar entrevista.", 502) from exc
        except Exception as exc:
            raise GroqServiceError("Falha inesperada ao avaliar entrevista.", 502) from exc

        content = completion.choices[0].message.content if completion.choices else ""
        return self._parse_evaluation_response(content, normalized_answers)

    def _client(self) -> Groq:
        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            raise GroqConfigurationError("GROQ_API_KEY nao configurada.")

        return Groq(api_key=api_key, timeout=self._request_timeout())

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
        required_requirements = _clean_list(context.get("requiredRequirements"))
        desirable_requirements = _clean_list(context.get("desirableRequirements"))
        differentials = _clean_list(context.get("differentials"))

        if not title and not summary and not activities and not requirements and not required_requirements and not desirable_requirements and not differentials:
            raise GroqServiceError("Informe contexto suficiente da vaga.", 400)

    def _build_questions_prompt(self, context: dict[str, Any]) -> str:
        prompt_context = {
            "title": _clean_text(context.get("title")),
            "company": _clean_text(context.get("company")),
            "summary": _clean_text(context.get("summary")),
            "activities": _clean_list(context.get("activities")),
            "requirements": _clean_list(context.get("requirements")),
            "requiredRequirements": _clean_list(context.get("requiredRequirements")),
            "desirableRequirements": _clean_list(context.get("desirableRequirements")),
            "differentials": _clean_list(context.get("differentials")),
            "location": _clean_text(context.get("location")),
            "contractType": _clean_text(context.get("contractType")),
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
            "- Priorize nesta ordem: titulo, resumo, atividades e requiredRequirements.\n"
            "- Use requirements como fallback consolidado apenas quando requiredRequirements, "
            "desirableRequirements e differentials estiverem ausentes ou vazios.\n"
            "- requiredRequirements representam conhecimentos, experiencias e condicoes esperadas "
            "pela vaga; eles podem orientar perguntas diretas.\n"
            "- desirableRequirements representam pontos desejaveis, nao obrigatorios; se forem usados, "
            "formule a pergunta sem pressupor que o candidato obrigatoriamente ja tenha essa experiencia.\n"
            "- differentials representam diferenciais ou plus; eles podem enriquecer a entrevista, "
            "mas nunca devem ser tratados como requisitos obrigatorios.\n"
            "- Ao usar desirableRequirements ou differentials, prefira formulacoes abertas como "
            "contato previo, estrategia, abordagem, oportunidade de uso ou como o candidato resolveria "
            "a situacao, sem exigir experiencia previa como fato.\n"
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
