"""Empregare job extraction module."""

from __future__ import annotations

import json
import os
import re
from html import unescape
from typing import Any
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup


class JobExtractionError(Exception):
    """Controlled error raised when job extraction cannot be completed."""

    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code


SECTION_ACTIVITIES = "activities"
SECTION_REQUIRED = "required"
SECTION_DESIRABLE = "desirable"
SECTION_DIFFERENTIAL = "differential"
SECTION_IGNORE = "ignore"


ACTIVITY_LABELS = [
    "atividades",
    "principais atividades",
    "atribuicoes",
    "atribuições",
    "responsabilidades",
    "o que voce vai fazer",
    "o que você vai fazer",
    "como voce vai atuar",
    "como você vai atuar",
    "como voce vai impactar",
    "como você vai impactar",
    "como voce vai interagir e impactar",
    "como você vai interagir e impactar",
]

REQUIRED_LABELS = [
    "requisitos",
    "requisitos obrigatorios",
    "requisitos obrigatórios",
    "requisitos indispensaveis",
    "requisitos indispensáveis",
    "obrigatorio",
    "obrigatório",
    "necessario",
    "necessário",
    "formacao exigida",
    "formação exigida",
    "educacao",
    "educação",
    "formacao",
    "formação",
    "escolaridade",
    "experiencia requerida",
    "experiência requerida",
    "experiencia",
    "experiência",
    "disponibilidade",
    "o que esperamos de voce",
    "o que esperamos de você",
    "conhecimentos",
    "qualificacoes",
    "qualificações",
    "habilidades",
    "competencias tecnicas",
    "competências técnicas",
    "competencias comportamentais",
    "competências comportamentais",
    "competencias necessarias",
    "competências necessárias",
]

DESIRABLE_LABELS = [
    "desejavel",
    "desejável",
    "requisitos desejaveis",
    "requisitos desejáveis",
    "sera desejavel",
    "será desejável",
    "preferencialmente",
    "preferivel",
    "preferível",
    "experiencia desejavel",
    "experiência desejável",
    "conhecimento desejavel",
    "conhecimento desejável",
]

DIFFERENTIAL_LABELS = [
    "diferenciais",
    "diferencial",
    "sera um diferencial",
    "será um diferencial",
    "e um diferencial",
    "é um diferencial",
    "conta como diferencial",
    "sera um plus",
    "será um plus",
    "sera um plus se voce possuir",
    "será um plus se você possuir",
    "plus",
    "sera considerado um plus",
    "será considerado um plus",
]

IGNORE_LABELS = [
    "beneficios",
    "benefícios",
    "oferecemos",
    "o que oferecemos",
    "salario",
    "salário",
    "remuneracao",
    "remuneração",
    "sobre a empresa",
    "observacoes",
    "observações",
    "atencao! e importante voce saber",
    "atenção! é importante você saber",
    "importante voce saber",
    "importante você saber",
    "quer saber mais",
    "processo seletivo",
    "etapas do processo",
    "inscricao",
    "inscrição",
    "como se candidatar",
]

ADMIN_SECTION_END_LABELS = [
    "informacoes adicionais",
    "informações adicionais",
    "informacoes complementares",
    "informações complementares",
    "outras informacoes",
    "outras informações",
    "observacoes",
    "observações",
    "beneficios",
    "benefícios",
    "etapas do processo seletivo",
    "sobre a empresa",
]

METADATA_LABELS = [
    "horario",
    "horário",
    "nivel",
    "nível",
    "regime de contratacao",
    "regime de contratação",
    "modelo de contratacao",
    "modelo de contratação",
    "modalidade de trabalho",
    "modalidade",
    "tipo de contratacao",
    "tipo de contratação",
    "localizacao",
    "localização",
    "localidade",
    "local",
    "vaga",
    "codigo da vaga",
    "código da vaga",
    "data de publicacao",
    "data de publicação",
    "validade",
    "prazo",
    "contratacao imediata",
    "contratação imediata",
    "inicio imediato",
    "início imediato",
    "jornada",
    "quantidade de vagas",
    "numero de vagas",
    "número de vagas",
]

WORK_MODE_LABELS = [
    "modalidade",
    "modalidade de trabalho",
    "modelo de trabalho",
    "forma de trabalho",
    "regime de trabalho",
]

DESCRIPTION_LABELS = [
    "descricao",
    "descrição",
    "descricao e responsabilidades",
    "descrição e responsabilidades",
]

INLINE_VALUE_LABELS = [
    "educacao",
    "educação",
    "formacao",
    "formação",
    "escolaridade",
    "experiencia",
    "experiência",
    "conhecimentos",
    "idiomas",
    "idioma",
    "certificacao",
    "certificação",
    "certificacoes",
    "certificações",
    "disponibilidade",
    "competencias",
    "competências",
    "competencias necessarias",
    "competências necessárias",
    "competencias tecnicas",
    "competências técnicas",
    "competencias comportamentais",
    "competências comportamentais",
]


def extract_job_context(url: str) -> dict[str, Any]:
    source_url = _validate_url(url)
    html = _fetch_html(source_url)
    soup = BeautifulSoup(html, "html.parser")
    job_posting = _find_job_posting_json_ld(soup)

    if job_posting:
        context = _context_from_job_posting(job_posting, source_url, soup)
    else:
        context = _context_from_html(soup, source_url)

    context = _normalize_final_job_context(context)

    if not context["title"]:
        raise JobExtractionError("Nao foi possivel identificar o titulo da vaga.")

    if not context["summary"] and not context["activities"] and not context["requirements"]:
        raise JobExtractionError("Nao foi possivel extrair contexto suficiente da vaga.")

    return context


def _validate_url(url: str) -> str:
    normalized = (url or "").strip()
    if not normalized:
        raise JobExtractionError("Informe a URL da vaga.", 400)

    parsed = urlparse(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise JobExtractionError("Informe uma URL valida da vaga.", 400)

    return normalized


def _fetch_html(url: str) -> str:
    timeout = _request_timeout()
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    try:
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
    except requests.Timeout as exc:
        raise JobExtractionError("Tempo esgotado ao acessar a vaga.", 504) from exc
    except requests.RequestException as exc:
        raise JobExtractionError("Nao foi possivel acessar a vaga informada.", 502) from exc

    return response.text


def _request_timeout() -> int:
    raw_timeout = os.getenv("REQUEST_TIMEOUT_SECONDS", "20")
    try:
        timeout = int(raw_timeout)
    except ValueError:
        timeout = 20
    return max(1, timeout)


def _find_job_posting_json_ld(soup: BeautifulSoup) -> dict[str, Any] | None:
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = script.string or script.get_text(strip=True)
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue

        found = _find_job_posting_node(data)
        if found:
            return found
    return None


def _find_job_posting_node(data: Any) -> dict[str, Any] | None:
    if isinstance(data, list):
        for item in data:
            found = _find_job_posting_node(item)
            if found:
                return found
        return None

    if not isinstance(data, dict):
        return None

    node_type = data.get("@type")
    if _matches_job_posting_type(node_type):
        return data

    graph = data.get("@graph")
    if graph:
        return _find_job_posting_node(graph)

    for value in data.values():
        found = _find_job_posting_node(value)
        if found:
            return found

    return None


def _matches_job_posting_type(value: Any) -> bool:
    if isinstance(value, str):
        return value.lower() == "jobposting"
    if isinstance(value, list):
        return any(_matches_job_posting_type(item) for item in value)
    return False


def _context_from_job_posting(job: dict[str, Any], source_url: str, soup: BeautifulSoup) -> dict[str, Any]:
    description = _clean_text(job.get("description"))
    page_text = soup.get_text("\n")
    responsibilities_text = _clean_text(job.get("responsibilities"))
    responsibilities = _list_from_value(job.get("responsibilities"))
    qualifications = _list_from_value(job.get("qualifications"))
    skills = _list_from_value(job.get("skills"))
    experience = _list_from_value(job.get("experienceRequirements"))
    education = _list_from_value(job.get("educationRequirements"))
    parsed = _extract_structured_job_content(description)

    activities = (
        _dedupe_items(responsibilities + parsed["activities"])
        or _extract_job_activities(responsibilities_text or description)
    )
    external_requirements = qualifications + skills + experience + education
    classified_external = _classify_requirement_items(external_requirements)
    required_requirements = _dedupe_items(
        classified_external["requiredRequirements"] + parsed["requiredRequirements"]
    )
    desirable_requirements = _dedupe_items(
        classified_external["desirableRequirements"] + parsed["desirableRequirements"]
    )
    differentials = _dedupe_items(classified_external["differentials"] + parsed["differentials"])
    general_requirements = _dedupe_items(
        classified_external["requirements"] + (parsed["requirements"] or _extract_job_requirements(description))
    )
    requirements = _dedupe_items(
        required_requirements + desirable_requirements + differentials + general_requirements
    )

    return _build_context(
        source_url=source_url,
        title=_best_job_title(_clean_text(job.get("title")), soup),
        company=_extract_company(job.get("hiringOrganization")),
        summary=parsed["summary"] or _summary_from_job_description(description, activities),
        activities=activities,
        requirements=requirements,
        required_requirements=required_requirements,
        desirable_requirements=desirable_requirements,
        differentials=differentials,
        location=_extract_location(job.get("jobLocation")) or _extract_visible_location(page_text),
        contract_type=_extract_explicit_contract_type(soup.get_text("\n")) or _extract_contract_type(job.get("employmentType")),
        work_mode=_extract_work_mode(
            json_ld_value=job.get("jobLocationType"),
            page_text=page_text,
            title=_best_job_title(_clean_text(job.get("title")), soup),
        ),
    )


def _context_from_html(soup: BeautifulSoup, source_url: str) -> dict[str, Any]:
    page_text = _clean_text(soup.get_text("\n"))
    title = _best_job_title(
        _first_text(
            soup,
            [
                "h1",
                "[data-testid*='title']",
                ".job-title",
                ".vaga-titulo",
                "meta[property='og:title']",
                "title",
            ],
        ),
        soup,
    )
    company = _first_text(
        soup,
        [
            "[data-testid*='company']",
            ".company",
            ".empresa",
            ".nome-empresa",
            "meta[property='og:site_name']",
        ],
    )
    summary = _first_text(
        soup,
        [
            "meta[name='description']",
            "meta[property='og:description']",
            ".description",
            ".descricao",
            ".job-description",
            ".vaga-descricao",
        ],
    )

    parsed = _extract_structured_job_content(page_text)
    activities = parsed["activities"] or _extract_job_activities(page_text)
    required_requirements = parsed["requiredRequirements"]
    desirable_requirements = parsed["desirableRequirements"]
    differentials = parsed["differentials"]
    general_requirements = parsed["requirements"] or _extract_job_requirements(page_text)
    requirements = _dedupe_items(
        required_requirements + desirable_requirements + differentials + general_requirements
    )
    location = _extract_label_value(page_text, ["localizacao", "localização", "local"]) or _extract_visible_location(page_text)
    contract_type = _extract_explicit_contract_type(page_text)
    work_mode = _extract_work_mode(page_text=page_text, title=title)

    return _build_context(
        source_url=source_url,
        title=title,
        company=company,
        summary=parsed["summary"] or _summary_from_job_description(summary or page_text, activities),
        activities=activities,
        requirements=requirements,
        required_requirements=required_requirements,
        desirable_requirements=desirable_requirements,
        differentials=differentials,
        location=location,
        contract_type=contract_type,
        work_mode=work_mode,
    )


def _build_context(
    *,
    source_url: str,
    title: str | None,
    company: str | None,
    summary: str | None,
    activities: list[str],
    requirements: list[str],
    required_requirements: list[str],
    desirable_requirements: list[str],
    differentials: list[str],
    location: str | None,
    contract_type: str | None,
    work_mode: str | None,
) -> dict[str, Any]:
    return {
        "title": title or None,
        "company": company or None,
        "summary": summary or "",
        "activities": _dedupe_items(activities),
        "requirements": _dedupe_items(requirements),
        "requiredRequirements": _dedupe_items(required_requirements),
        "desirableRequirements": _dedupe_items(desirable_requirements),
        "differentials": _dedupe_items(differentials),
        "location": location or None,
        "contractType": contract_type or None,
        "workMode": work_mode or None,
        "sourceUrl": source_url,
    }


def _normalize_final_job_context(context: dict[str, Any]) -> dict[str, Any]:
    activities_source = _ensure_list(context.get("activities"))
    existing_required = _ensure_list(context.get("requiredRequirements"))
    existing_desirable = _ensure_list(context.get("desirableRequirements"))
    existing_differentials = _ensure_list(context.get("differentials"))
    classified_keys = {
        _clean_text(item).lower()
        for item in existing_required + existing_desirable + existing_differentials
        if _clean_text(item)
    }
    requirements_source = [
        item
        for item in _ensure_list(context.get("requirements"))
        if _clean_text(item).lower() not in classified_keys
    ]

    parsed_activities = _redistribute_context_lines(activities_source, SECTION_ACTIVITIES)
    parsed_requirements = _redistribute_context_lines(requirements_source, SECTION_REQUIRED)
    parsed_existing_required = _redistribute_context_lines(existing_required, SECTION_REQUIRED)
    parsed_existing_desirable = _redistribute_context_lines(existing_desirable, SECTION_DESIRABLE)
    parsed_existing_differentials = _redistribute_context_lines(existing_differentials, SECTION_DIFFERENTIAL)

    activities = _dedupe_items(parsed_activities["activities"] + parsed_requirements["activities"])
    required_requirements = _dedupe_items(
        parsed_requirements["requiredRequirements"]
        + parsed_existing_required["requiredRequirements"]
        + parsed_existing_desirable["requiredRequirements"]
        + parsed_existing_differentials["requiredRequirements"]
    )
    desirable_requirements = _dedupe_items(parsed_requirements["desirableRequirements"])
    desirable_requirements = _dedupe_items(
        desirable_requirements
        + parsed_existing_required["desirableRequirements"]
        + parsed_existing_desirable["desirableRequirements"]
        + parsed_existing_differentials["desirableRequirements"]
    )
    differentials = _dedupe_items(
        parsed_requirements["differentials"]
        + parsed_existing_required["differentials"]
        + parsed_existing_desirable["differentials"]
        + parsed_existing_differentials["differentials"]
    )
    general_requirements = _dedupe_items(
        parsed_requirements["requirements"]
        + parsed_existing_required["requirements"]
        + parsed_existing_desirable["requirements"]
        + parsed_existing_differentials["requirements"]
    )
    requirements = _dedupe_items(
        required_requirements + desirable_requirements + differentials + general_requirements
    )
    summary = _normalize_summary(
        context.get("summary"),
        activities,
        required_requirements=required_requirements,
        title=context.get("title"),
        company=context.get("company"),
        location=context.get("location"),
    )
    activities = _dedupe_items(
        item
        for item in activities
        if not _is_internal_title_line(item, context.get("title"), context.get("company"), context.get("location"))
        and _strip_internal_title_prefix(item, context.get("title"), context.get("company"), context.get("location")) == item
        and not _is_summary_duplicate_non_activity(item, summary)
        and not _is_disconnected_institutional_summary(
            item,
            [activity for activity in activities if activity != item],
            title=context.get("title"),
        )
    )

    return {
        "title": context.get("title") or None,
        "company": context.get("company") or None,
        "summary": summary,
        "activities": activities,
        "requirements": requirements,
        "requiredRequirements": required_requirements,
        "desirableRequirements": desirable_requirements,
        "differentials": differentials,
        "location": context.get("location") or None,
        "contractType": _extract_contract_type(context.get("contractType")) or None,
        "workMode": _normalize_work_mode(context.get("workMode")) or None,
        "sourceUrl": context.get("sourceUrl") or None,
    }


def _redistribute_context_lines(items: list[Any], initial_section: str) -> dict[str, list[str]]:
    result = {
        "activities": [],
        "requirements": [],
        "requiredRequirements": [],
        "desirableRequirements": [],
        "differentials": [],
    }
    current_section = initial_section

    for item in items:
        for line in _expand_context_item(item):
            heading = _classify_heading(line)
            if heading:
                current_section = heading
                inline_items = _inline_items_after_heading(line)
                if inline_items and heading != SECTION_IGNORE:
                    _append_items_to_structured_result(result, heading, inline_items)
                continue

            if _heading_matches_any(_normalize_heading(line), DESCRIPTION_LABELS):
                current_section = initial_section
                continue

            if _is_metadata_line(line) or _is_ignored_content_line(line):
                if current_section in {SECTION_REQUIRED, SECTION_DESIRABLE, SECTION_DIFFERENTIAL}:
                    current_section = SECTION_IGNORE
                continue

            if current_section == SECTION_IGNORE:
                if _looks_like_requirement_line(line):
                    current_section = SECTION_REQUIRED
                    _append_items_to_structured_result(result, current_section, _list_from_value(line))
                    continue
                continue

            _append_items_to_structured_result(result, current_section, _list_from_value(line))

    return {key: _dedupe_items(value) for key, value in result.items()}


def _expand_context_item(item: Any) -> list[str]:
    text = _clean_text(item)
    if not text:
        return []
    return _content_lines(text)


def _ensure_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _normalize_summary(
    value: Any,
    activities: list[str],
    *,
    required_requirements: list[str] | None = None,
    title: Any = None,
    company: Any = None,
    location: Any = None,
) -> str:
    lines = _content_lines(_clean_text(value))
    summary_lines: list[str] = []

    for raw_line in lines:
        line = _strip_internal_title_prefix(raw_line, title, company, location)
        if not line:
            continue

        if _is_internal_title_line(line, title, company, location):
            continue

        if _heading_matches_any(_normalize_heading(line), DESCRIPTION_LABELS):
            inline_items = _inline_items_after_heading(line)
            if inline_items:
                summary_lines.extend(inline_items)
            continue

        if _classify_heading(line):
            break

        if _is_metadata_line(line) or _is_ignored_content_line(line):
            continue

        if _looks_like_professional_bullet(line):
            continue

        summary_lines.append(line)

    summary = " ".join(summary_lines).strip()
    activity_summary = _summary_from_representative_activities(
        activities,
        required_requirements=required_requirements or [],
        title=title,
        company=company,
        location=location,
    )
    if activity_summary and _is_inadequate_summary(summary, title=title, company=company, location=location):
        return activity_summary

    summary = _truncate(summary, 900)
    if activity_summary and _should_replace_summary_with_activity_summary(
        summary,
        activities,
        title=title,
        company=company,
        location=location,
    ):
        return activity_summary

    if summary and not _is_inadequate_summary(summary, title=title, company=company, location=location):
        return summary

    if activity_summary:
        return activity_summary

    return ""


def _summary_from_representative_activities(
    activities: list[str],
    *,
    required_requirements: list[str] | None = None,
    title: Any = None,
    company: Any = None,
    location: Any = None,
) -> str:
    candidates = [
        activity
        for activity in activities
        if not _is_inadequate_summary(activity, title=title, company=company, location=location)
        and not _is_disconnected_institutional_summary(
            activity,
            [item for item in activities if item != activity],
            title=title,
        )
    ]
    if not candidates:
        candidates = []

    selected = _select_complementary_summary_items(candidates)

    if len(selected) < 2:
        requirement = _select_central_requirement(required_requirements or [], selected)
        if requirement:
            selected.append(requirement)

    return _truncate_summary_text(" ".join(_normalize_summary_piece(item) for item in selected), 430)


def _should_replace_summary_with_activity_summary(
    summary: str,
    activities: list[str],
    *,
    title: Any = None,
    company: Any = None,
    location: Any = None,
) -> bool:
    text = _clean_text(summary).replace("\n", " ").strip()
    useful_activities = [
        activity
        for activity in activities
        if not _is_inadequate_summary(activity, title=title, company=company, location=location)
    ]
    if not text or len(useful_activities) < 2:
        return False

    if _has_administrative_summary_content(text):
        return True

    if _is_single_activity_like_summary(text, useful_activities):
        return True

    reference_activities = [
        activity
        for activity in useful_activities
        if not _is_similar_summary_item(text, activity)
    ]
    return _is_disconnected_institutional_summary(text, reference_activities, title=title)


def _is_single_activity_like_summary(summary: str, activities: list[str]) -> bool:
    if len(summary) > 180:
        return False

    if _looks_like_professional_bullet(summary):
        return True

    return any(_is_similar_summary_item(summary, activity) for activity in activities)


def _is_disconnected_institutional_summary(summary: str, activities: list[str], *, title: Any = None) -> bool:
    normalized = _normalize_label(summary)
    institutional_starts = [
        "a area",
        "a área",
        "o departamento",
        "o setor",
        "a unidade",
        "a empresa",
    ]
    institutional_terms = [
        "atua na",
        "atua no",
        "atua em",
        "responsavel por",
        "responsável por",
    ]
    if not any(normalized.startswith(start) for start in institutional_starts):
        return False
    if not _contains_any_label(normalized, institutional_terms):
        return False

    summary_tokens = _summary_tokens(summary)
    reference_tokens = _summary_tokens(_clean_text(title))
    for activity in activities[:5]:
        reference_tokens.update(_summary_tokens(activity))

    if not summary_tokens or not reference_tokens:
        return False

    overlap_ratio = len(summary_tokens & reference_tokens) / min(len(summary_tokens), len(reference_tokens))
    return overlap_ratio < 0.2


def _select_complementary_summary_items(items: list[str]) -> list[str]:
    if not items:
        return []

    preferred = [item for item in items if _looks_like_professional_bullet(item)]
    ordered = _dedupe_items(preferred + items)
    selected: list[str] = []

    for item in ordered:
        if not selected:
            selected.append(item)
            continue
        if not _is_similar_summary_item(item, selected[0]):
            selected.append(item)
            break

    return selected


def _select_central_requirement(requirements: list[str], selected_items: list[str]) -> str:
    for requirement in requirements:
        text = _clean_text(requirement).replace("\n", " ").strip()
        if (
            not text
            or _is_inadequate_summary(text)
            or _is_generic_education_requirement(text)
            or _is_ignored_content_line(text)
        ):
            continue
        if any(_is_similar_summary_item(text, item) for item in selected_items):
            continue
        return text
    return ""


def _normalize_summary_piece(value: Any) -> str:
    text = _clean_text(value).replace("\n", " ").strip()
    text = re.sub(r"\s*[;.]+\s*$", "", text).strip()
    if text and text[-1] not in ".!?":
        return f"{text}."
    return text


def _truncate_summary_text(value: str, max_length: int) -> str:
    text = _clean_text(value).replace("\n", " ").strip()
    if len(text) <= max_length:
        return text

    truncated = text[:max_length].rstrip()
    for separator in [". ", "; ", "."]:
        index = truncated.rfind(separator)
        if index >= 120:
            return truncated[: index + len(separator.rstrip())].rstrip()
    return _truncate(text, max_length)


def _is_similar_summary_item(first: str, second: str) -> bool:
    first_tokens = _summary_tokens(first)
    second_tokens = _summary_tokens(second)
    if not first_tokens or not second_tokens:
        return False
    overlap = len(first_tokens & second_tokens)
    return overlap / min(len(first_tokens), len(second_tokens)) >= 0.65


def _summary_tokens(value: str) -> set[str]:
    stop_words = {
        "para",
        "com",
        "dos",
        "das",
        "uma",
        "por",
        "que",
        "aos",
        "nas",
        "nos",
        "sua",
        "seu",
        "em",
        "de",
        "da",
        "do",
        "e",
        "o",
        "a",
    }
    normalized = _normalize_label(value)
    return {
        token
        for token in re.findall(r"[a-z0-9]+", normalized)
        if len(token) > 2 and token not in stop_words
    }


def _is_generic_education_requirement(value: str) -> bool:
    normalized = _normalize_label(value)
    generic_starts = [
        "ensino medio",
        "ensino médio",
        "ensino superior",
        "superior completo",
        "graduacao em",
        "graduação em",
        "formacao em",
        "formação em",
    ]
    return any(normalized.startswith(_normalize_label(start)) for start in generic_starts)


def _is_inadequate_summary(
    value: Any,
    *,
    title: Any = None,
    company: Any = None,
    location: Any = None,
) -> bool:
    text = _clean_text(value).replace("\n", " ").strip()
    if not text:
        return True

    if len(text) < 40:
        return True

    normalized = _normalize_label(text.rstrip(":"))
    normalized_title = _normalize_label(_clean_text(title))
    if normalized_title and (normalized == normalized_title or normalized in normalized_title):
        return True

    if _is_internal_title_line(text, title, company, location):
        return True
    if _classify_heading(text) or _looks_like_section_heading(text):
        return True
    if _has_non_functional_summary_content(text):
        return True
    if _is_metadata_line(text) or _is_ignored_content_line(text):
        return True

    return False


def _has_non_functional_summary_content(value: str) -> bool:
    normalized = _normalize_label(value)
    non_functional_terms = [
        "processo seletivo",
        "etapas do processo",
        "analise curricular",
        "análise curricular",
        "teste tecnico",
        "teste técnico",
        "carater eliminatorio",
        "caráter eliminatório",
        "candidatos aprovados",
        "proxima etapa",
        "próxima etapa",
        "inscricoes",
        "inscrições",
        "prazo de inscricao",
        "prazo de inscrição",
    ]
    return _contains_any_label(normalized, non_functional_terms) or _has_administrative_summary_content(value)


def _has_administrative_summary_content(value: str) -> bool:
    normalized = _normalize_label(value)
    administrative_terms = [
        "contratacao imediata",
        "contratação imediata",
        "inicio imediato",
        "início imediato",
        "modelo de contratacao",
        "modelo de contratação",
        "regime de contratacao",
        "regime de contratação",
        "tipo de contratacao",
        "tipo de contratação",
        "carteira assinada",
        "salario",
        "salário",
        "remuneracao",
        "remuneração",
        "horario",
        "horário",
        "jornada",
        "quantidade de vagas",
        "numero de vagas",
        "número de vagas",
        "prazo de inscricao",
        "prazo de inscrição",
    ]
    return _contains_any_label(normalized, administrative_terms)


def _best_job_title(current_title: str | None, soup: BeautifulSoup) -> str | None:
    candidates = [_clean_title_candidate(current_title)]
    title_selectors = [
        "h1",
        "[data-testid*='title']",
        ".job-title",
        ".vaga-titulo",
        "meta[property='og:title']",
        "meta[name='twitter:title']",
        "title",
    ]

    for selector in title_selectors:
        candidate = _first_text(soup, [selector])
        cleaned = _clean_title_candidate(candidate)
        if cleaned:
            candidates.append(cleaned)

    candidates = _dedupe_items([candidate for candidate in candidates if candidate])
    if not candidates:
        return None

    best = candidates[0]
    for candidate in candidates[1:]:
        if _is_more_complete_title(best, candidate):
            best = candidate

    return best


def _clean_title_candidate(value: Any) -> str:
    title = _clean_text(value)
    if not title:
        return ""

    title = re.sub(r"\s+", " ", title).strip()
    title = re.sub(r"\s+[-|]\s+Empregare.*$", "", title, flags=re.IGNORECASE).strip()
    has_vaga_prefix = bool(re.match(r"^vaga\s+", title, flags=re.IGNORECASE))
    title = re.sub(r"^vaga\s+", "", title, flags=re.IGNORECASE).strip()
    if has_vaga_prefix:
        title = re.sub(r"\s+na\s+.+$", "", title, flags=re.IGNORECASE).strip()
    return title


def _is_more_complete_title(current: str, candidate: str) -> bool:
    if not candidate or candidate == current:
        return False
    normalized_current = _normalize_label(current)
    normalized_candidate = _normalize_label(candidate)

    if normalized_candidate.startswith(normalized_current):
        suffix = candidate[len(current):].lstrip()
        return suffix.startswith(("-", "–", "—", ":", "/"))

    return len(candidate) > len(current) and normalized_current in normalized_candidate


def _first_text(soup: BeautifulSoup, selectors: list[str]) -> str | None:
    for selector in selectors:
        element = soup.select_one(selector)
        if not element:
            continue
        if element.name == "meta":
            value = element.get("content")
        else:
            value = element.get_text(" ", strip=True)
        cleaned = _clean_text(value)
        if cleaned:
            return cleaned
    return None


def _clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        value = value.get("name") or value.get("text") or ""
    if isinstance(value, list):
        value = " ".join(_clean_text(item) for item in value)
    text = BeautifulSoup(str(value), "html.parser").get_text("\n")
    text = unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _summary_from_description(description: str | None, activities: list[str]) -> str:
    description_text = _clean_text(description)
    if description_text:
        return _truncate(description_text.replace("\n", " "), 900)
    if activities:
        return _truncate(" ".join(activities[:3]), 900)
    return ""


def _summary_from_job_description(description: str | None, activities: list[str]) -> str:
    description_text = _clean_text(description)
    if not description_text:
        return _summary_from_description(description, activities)

    section_starts = [
        "o que voce vai fazer",
        "o que esperamos de voce",
        "requisitos",
        "o que oferecemos",
        "beneficios",
        "diferenciais",
    ]
    lines = _content_lines(description_text)
    summary_lines: list[str] = []

    for line in lines:
        if _line_matches_any_label(line, section_starts):
            break
        if _line_matches_any_label(line, ["descricao", "descricao e responsabilidades"]):
            after_colon = line.split(":", 1)[1].strip() if ":" in line else ""
            if after_colon:
                summary_lines.append(after_colon)
            continue
        if "|" in line and len(line) <= 140:
            continue
        summary_lines.append(line)

    summary = " ".join(summary_lines).strip()
    if summary:
        return _truncate(summary, 900)

    return _summary_from_description(description, activities)


def _is_internal_title_line(line: str, title: Any = None, company: Any = None, location: Any = None) -> bool:
    cleaned = _clean_text(line).replace("\n", " ")
    if not cleaned or len(cleaned) > 180:
        return False

    has_title_separator = bool(re.search(r"\s[|–—-]\s", cleaned))
    if not has_title_separator:
        return False

    normalized = _normalize_label(cleaned)
    normalized_title = _normalize_label(_clean_text(title))
    normalized_company = _normalize_label(_clean_text(company))
    normalized_location = _normalize_label(_clean_text(location))

    title_matches = bool(normalized_title and normalized_title in normalized)
    company_matches = bool(normalized_company and normalized_company in normalized)
    location_matches = bool(normalized_location and any(
        part and part in normalized
        for part in re.split(r"\s*[-;,]\s*", normalized_location)
    ))

    return title_matches and (company_matches or location_matches or has_title_separator)


def _strip_internal_title_prefix(line: str, title: Any = None, company: Any = None, location: Any = None) -> str:
    cleaned = _clean_text(line).replace("\n", " ").strip()
    normalized_title = _clean_text(title)
    normalized_company = _clean_text(company)

    if not cleaned or not normalized_title:
        return cleaned

    escaped_title = re.escape(normalized_title)
    separator = r"\s*[|–—-]\s*"

    patterns: list[str] = []
    normalized_location = _clean_text(location)
    if normalized_company:
        escaped_company = re.escape(normalized_company)
        if normalized_location:
            patterns.append(
                rf"^\s*{escaped_title}{separator}{escaped_company}{separator}{re.escape(normalized_location)}\s+"
            )
        patterns.append(rf"^\s*{escaped_title}{separator}{escaped_company}{separator}[^.;:!?]{{2,60}}?,\s*[A-Z]{{2}}\s+")
        patterns.append(rf"^\s*{escaped_title}{separator}{escaped_company}\s+")

    patterns.append(rf"^\s*{escaped_title}{separator}[^.;:!?]{{2,60}},\s*[A-Z]{{2}}\s+")

    for pattern in patterns:
        stripped = re.sub(pattern, "", cleaned, count=1, flags=re.IGNORECASE).strip()
        if stripped != cleaned and len(stripped) >= 20:
            company_prefix = rf"^{re.escape(normalized_company)}\s+"
            if normalized_company and re.match(company_prefix, stripped, flags=re.IGNORECASE):
                stripped = f"A {stripped}"
            return stripped

    return cleaned


def _is_summary_duplicate_non_activity(item: str, summary: str) -> bool:
    if not item or not summary or _looks_like_professional_bullet(item):
        return False

    normalized_item = _normalize_label(item)
    normalized_summary = _normalize_label(summary)
    if len(normalized_item) < 40 or len(normalized_summary) < 40:
        return False

    return normalized_item.startswith(normalized_summary[:80]) or normalized_summary.startswith(normalized_item[:80])


def _extract_structured_job_content(text: str | None) -> dict[str, list[str] | str]:
    cleaned = _clean_text(text)
    result: dict[str, list[str] | str] = {
        "summary": "",
        "activities": [],
        "requirements": [],
        "requiredRequirements": [],
        "desirableRequirements": [],
        "differentials": [],
    }
    if not cleaned:
        return result

    lines = _content_lines(cleaned)
    current_section: str | None = None
    summary_lines: list[str] = []

    for line in lines:
        heading = _classify_heading(line)

        if heading:
            current_section = heading
            inline_items = _inline_items_after_heading(line)
            if inline_items and heading != SECTION_IGNORE:
                _append_items_to_structured_result(result, heading, inline_items)
            continue

        if _heading_matches_any(_normalize_heading(line), DESCRIPTION_LABELS):
            current_section = None
            inline_items = _inline_items_after_heading(line)
            if inline_items:
                summary_lines.extend(inline_items)
            continue

        if _is_metadata_line(line) or _is_ignored_content_line(line):
            if current_section in {SECTION_REQUIRED, SECTION_DESIRABLE, SECTION_DIFFERENTIAL}:
                current_section = SECTION_IGNORE
            continue

        if current_section == SECTION_IGNORE:
            if _looks_like_requirement_line(line):
                current_section = SECTION_REQUIRED
                _append_items_to_structured_result(result, current_section, items)
                continue
            continue

        items = _list_from_value(line)
        if current_section == SECTION_ACTIVITIES and _looks_like_requirement_line(line):
            _append_items_to_structured_result(result, SECTION_REQUIRED, items)
            continue
        if current_section:
            _append_items_to_structured_result(result, current_section, items)
            continue

        if _looks_like_professional_bullet(line):
            result["activities"] = _dedupe_items([*result["activities"], *items])  # type: ignore[list-item]
            continue

        summary_lines.append(line)

    result["summary"] = _truncate(" ".join(summary_lines).strip(), 900)
    result["activities"] = _dedupe_items(result["activities"])  # type: ignore[arg-type]
    result["requirements"] = _dedupe_items(result["requirements"])  # type: ignore[arg-type]
    result["requiredRequirements"] = _dedupe_items(result["requiredRequirements"])  # type: ignore[arg-type]
    result["desirableRequirements"] = _dedupe_items(result["desirableRequirements"])  # type: ignore[arg-type]
    result["differentials"] = _dedupe_items(result["differentials"])  # type: ignore[arg-type]
    return result


def _classify_requirement_items(
    items: list[str],
    default_bucket: str = "requirements",
    preserve_required_section: bool = False,
) -> dict[str, list[str]]:
    result = {
        "requirements": [],
        "requiredRequirements": [],
        "desirableRequirements": [],
        "differentials": [],
    }

    for item in items:
        cleaned = _clean_text(item)
        if not cleaned or _is_metadata_line(cleaned) or _is_ignored_content_line(cleaned):
            continue
        for part, explicit_bucket in _split_requirement_by_qualifier(cleaned):
            if not part or _is_metadata_line(part) or _is_ignored_content_line(part):
                continue
            target = (
                _classify_required_section_item(part)
                if preserve_required_section and default_bucket == "requiredRequirements"
                else explicit_bucket or _classify_requirement_item(part, default_bucket)
            )
            result[target].append(part)

    return {key: _dedupe_items(value) for key, value in result.items()}


def _split_requirement_by_qualifier(item: str) -> list[tuple[str, str | None]]:
    sentences = [
        _clean_text(sentence)
        for sentence in re.split(r"(?<=[.!?])\s+", item)
        if _clean_text(sentence)
    ]
    if len(sentences) <= 1:
        return [(item, None)]

    split_items: list[tuple[str, str | None]] = []
    has_explicit_bucket = False

    for sentence in sentences:
        target = _classify_requirement_item(sentence, default_bucket="")
        explicit_bucket = target or None
        if explicit_bucket:
            has_explicit_bucket = True
        split_items.append((sentence, explicit_bucket))

    return split_items if has_explicit_bucket else [(item, None)]


def _classify_requirement_item(item: str, default_bucket: str = "requirements") -> str:
    normalized = _normalize_label(item)
    if _contains_any_label(normalized, DIFFERENTIAL_LABELS):
        return "differentials"
    if _contains_any_label(normalized, DESIRABLE_LABELS):
        return "desirableRequirements"
    if _contains_any_label(normalized, REQUIRED_LABELS):
        return "requiredRequirements"
    return default_bucket


def _classify_required_section_item(item: str) -> str:
    normalized = _normalize_label(item)
    if _contains_any_label(normalized, DIFFERENTIAL_LABELS):
        return "differentials"

    for label in DESIRABLE_LABELS:
        normalized_label = _normalize_label(label)
        if normalized == normalized_label or normalized.startswith(f"{normalized_label} "):
            return "desirableRequirements"

    return "requiredRequirements"


def _append_items_to_structured_result(
    result: dict[str, list[str] | str],
    section: str,
    items: list[str],
) -> None:
    cleaned_items = [
        item
        for item in _dedupe_items(items)
        if not _is_metadata_line(item) and not _is_ignored_content_line(item)
    ]

    if not cleaned_items:
        return

    if section == SECTION_ACTIVITIES:
        result["activities"] = _dedupe_items([*result["activities"], *cleaned_items])  # type: ignore[list-item]
        return

    if section == SECTION_DESIRABLE:
        result["desirableRequirements"] = _dedupe_items(
            [*result["desirableRequirements"], *cleaned_items]  # type: ignore[list-item]
        )
        return

    if section == SECTION_DIFFERENTIAL:
        result["differentials"] = _dedupe_items([*result["differentials"], *cleaned_items])  # type: ignore[list-item]
        return

    if section == SECTION_REQUIRED:
        classified = _classify_requirement_items(
            cleaned_items,
            default_bucket="requiredRequirements",
            preserve_required_section=True,
        )
        result["requirements"] = _dedupe_items(
            [*result["requirements"], *classified["requirements"]]  # type: ignore[list-item]
        )
        result["requiredRequirements"] = _dedupe_items(
            [*result["requiredRequirements"], *classified["requiredRequirements"]]  # type: ignore[list-item]
        )
        result["desirableRequirements"] = _dedupe_items(
            [*result["desirableRequirements"], *classified["desirableRequirements"]]  # type: ignore[list-item]
        )
        result["differentials"] = _dedupe_items(
            [*result["differentials"], *classified["differentials"]]  # type: ignore[list-item]
        )


def _classify_heading(line: str) -> str | None:
    normalized = _normalize_heading(line)
    if not normalized:
        return None
    if _heading_matches_any(normalized, ADMIN_SECTION_END_LABELS):
        return SECTION_IGNORE
    if _heading_matches_any(normalized, DESCRIPTION_LABELS):
        return None
    if _heading_matches_any(normalized, IGNORE_LABELS):
        return SECTION_IGNORE
    if _heading_matches_any(normalized, ACTIVITY_LABELS):
        return SECTION_ACTIVITIES
    if _heading_matches_any(normalized, DIFFERENTIAL_LABELS):
        return SECTION_DIFFERENTIAL
    if _heading_matches_any(normalized, DESIRABLE_LABELS):
        return SECTION_DESIRABLE
    if _heading_matches_any(normalized, REQUIRED_LABELS):
        return SECTION_REQUIRED
    return None


def _inline_items_after_heading(line: str) -> list[str]:
    if ":" not in line:
        return []
    if _heading_matches_any(_normalize_heading(line), INLINE_VALUE_LABELS):
        return [_clean_text(line)]
    value = line.split(":", 1)[1].strip()
    return _list_from_value(value)


def _normalize_heading(line: str) -> str:
    base = line.split(":", 1)[0] if ":" in line else line
    return _normalize_label(base.strip(" -*•\t"))


def _heading_matches_any(normalized_heading: str, labels: list[str]) -> bool:
    return any(normalized_heading == _normalize_label(label) for label in labels)


def _contains_any_label(normalized_text: str, labels: list[str]) -> bool:
    return any(_normalize_label(label) in normalized_text for label in labels)


def _is_metadata_line(line: str) -> bool:
    normalized = _normalize_label(line)
    return any(normalized.startswith(f"{_normalize_label(label)}:") for label in METADATA_LABELS)


def _is_ignored_content_line(line: str) -> bool:
    normalized = _normalize_label(line)
    has_ignore_label = _contains_any_label(normalized, IGNORE_LABELS)
    starts_with_ignore_label = any(
        normalized.startswith(_normalize_label(label))
        for label in IGNORE_LABELS
    )
    if has_ignore_label and not (_has_professional_requirement_signal(line) and not starts_with_ignore_label):
        return True

    benefit_terms = [
        "vale transporte",
        "vale-transporte",
        "vale refeicao",
        "vale-refeicao",
        "vale alimentacao",
        "vale-alimentacao",
        "plano de saude",
        "plano de saúde",
        "plano odontologico",
        "plano odontológico",
        "seguro de vida",
        "auxilio",
        "auxílio",
    ]
    process_terms = [
        "inscricoes prorrogadas",
        "inscrições prorrogadas",
        "inscricoes ate",
        "inscrições até",
        "prazo de inscricao",
        "prazo de inscrição",
        "caixa de entrada",
        "spam",
        "email",
        "e-mail",
        "equipamentos",
        "internet",
        "agendamento",
        "reagendamento",
        "inscricao duplicada",
        "inscrição duplicada",
        "suporte da plataforma",
        "feedback do processo seletivo",
        "acesse aqui as informacoes gerais",
        "acesse aqui as informações gerais",
        "informacoes gerais",
        "informações gerais",
        "atividades relacionadas ao cargo",
    ]
    has_benefit_term = _contains_any_label(normalized, benefit_terms)
    has_process_term = _contains_any_label(normalized, process_terms)

    return (
        (has_benefit_term and not _has_professional_requirement_signal(line))
        or has_process_term
        or _is_promotional_content_line(line)
    )


def _is_promotional_content_line(line: str) -> bool:
    normalized = _normalize_label(line)
    if not normalized:
        return False

    promotional_terms = [
        "venha fazer parte",
        "vem fazer parte",
        "junte-se",
        "junte se",
        "vem pra",
        "venha para",
        "essa vaga e para voce",
        "essa vaga é para você",
        "essa vaga nao e pra voce",
        "essa vaga não é pra você",
        "vaga perfeita para voce",
        "vaga perfeita para você",
        "se identificou",
        "candidate-se",
        "candidate se",
        "inscreva-se",
        "inscreva se",
        "quer construir",
        "quer crescer",
        "crescer rapido",
        "crescer rápido",
        "busca conforto",
        "tecnologia de ponta",
        "ambiente desafiador",
        "ambiente dinamico",
        "ambiente dinâmico",
        "time incrivel",
        "time incrível",
        "nosso time",
        "nossa equipe",
    ]
    if _contains_any_label(normalized, promotional_terms):
        return True

    if _has_professional_requirement_signal(line):
        return False

    second_person_terms = ["voce", "você", "seu perfil", "sua carreira"]
    attraction_terms = ["vaga", "oportunidade", "crescer", "desafio", "time", "equipe", "fazer parte"]
    return (
        _contains_any_label(normalized, second_person_terms)
        and _contains_any_label(normalized, attraction_terms)
    )


def _has_professional_requirement_signal(line: str) -> bool:
    normalized = _normalize_label(line)
    professional_terms = [
        "experiencia",
        "experiência",
        "conhecimento",
        "conhecimentos",
        "dominio",
        "domínio",
        "familiaridade",
        "nocao",
        "noção",
        "nocoes",
        "noções",
        "habilidade",
        "habilidades",
        "competencia",
        "competência",
        "competencias",
        "competências",
        "formacao",
        "formação",
        "graduacao",
        "graduação",
        "certificacao",
        "certificação",
        "curso",
        "cursos",
        "idioma",
        "ingles",
        "inglês",
        "espanhol",
        "fluencia",
        "fluência",
        "ferramenta",
        "ferramentas",
        "tecnologia",
        "tecnologias",
        "atuacao",
        "atuação",
        "vivencia",
        "vivência",
        "pratica",
        "prática",
        "capacidade de",
        "saber",
        "conhecer",
        "basico",
        "básico",
        "intermediario",
        "intermediário",
        "avancado",
        "avançado",
    ]
    return _contains_any_label(normalized, professional_terms)


def _looks_like_requirement_line(line: str) -> bool:
    if _is_metadata_line(line) or _is_ignored_content_line(line):
        return False

    normalized = _normalize_label(line)
    requirement_starts = [
        "ensino",
        "educacao",
        "educação",
        "formacao",
        "formação",
        "graduacao",
        "graduação",
        "experiencia",
        "experiência",
        "conhecimento",
        "conhecimentos",
        "competencia",
        "competência",
        "competencias",
        "competências",
        "habilidade",
        "habilidades",
        "idioma",
        "idiomas",
        "ingles",
        "inglês",
        "fluencia",
        "fluência",
        "certificacao",
        "certificação",
        "curso",
        "cursos",
    ]
    return any(normalized.startswith(prefix) for prefix in requirement_starts)


def _looks_like_professional_bullet(line: str) -> bool:
    if _is_metadata_line(line) or _is_ignored_content_line(line):
        return False

    normalized = _normalize_label(line)
    professional_verbs = [
        "desenvolver",
        "implementar",
        "integrar",
        "configurar",
        "realizar",
        "executar",
        "acompanhar",
        "apoiar",
        "atender",
        "atuar",
        "analisar",
        "elaborar",
        "controlar",
        "organizar",
        "gerenciar",
        "participar",
        "conduzir",
        "prestar suporte",
    ]
    return any(normalized.startswith(verb) for verb in professional_verbs)


def _list_from_value(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return _dedupe_items([item for entry in value for item in _list_from_value(entry)])
    if isinstance(value, dict):
        return _list_from_value(value.get("description") or value.get("text") or value.get("name"))

    text = _clean_text(value)
    if not text:
        return []

    chunks = [
        chunk
        for line in _content_lines(text)
        for chunk in re.split(r"(?:^|\s)[\-•*]\s+", line)
    ]
    items = [_clean_text(chunk) for chunk in chunks if _clean_text(chunk)]
    return items or [text]


def _extract_company(value: Any) -> str | None:
    if isinstance(value, list):
        for item in value:
            company = _extract_company(item)
            if company:
                return company
        return None
    if isinstance(value, dict):
        return _clean_text(value.get("name"))
    return _clean_text(value) or None


def _extract_location(value: Any) -> str | None:
    if isinstance(value, list):
        locations = [_extract_location(item) for item in value]
        return "; ".join(item for item in locations if item) or None
    if isinstance(value, dict):
        address = value.get("address")
        if isinstance(address, dict):
            parts = [
                address.get("addressLocality"),
                address.get("addressRegion"),
                address.get("addressCountry"),
            ]
            cleaned = [_clean_text(part) for part in parts if _clean_text(part)]
            if cleaned:
                return " - ".join(cleaned)
        return _clean_text(value.get("name") or value.get("address")) or None
    return _clean_text(value) or None


def _extract_visible_location(text: str | None) -> str | None:
    cleaned = _clean_text(text)
    if not cleaned:
        return None

    for line in _content_lines(cleaned):
        candidate = re.sub(r"\s*\([^)]*vaga[^)]*\)\s*$", "", line, flags=re.IGNORECASE).strip()
        if not candidate:
            continue
        match = re.match(r"^(.{2,80}?),\s*([A-Z]{2}),\s*BR$", candidate)
        if not match:
            continue
        city = _clean_text(match.group(1))
        state = _clean_text(match.group(2))
        if city and state and _normalize_work_mode(city) is None:
            return f"{city} - {state} - BR"
    return None


def _extract_contract_type(value: Any) -> str | None:
    if isinstance(value, list):
        cleaned = []
        for item in value:
            extracted = _extract_contract_type(item)
            if extracted:
                cleaned.append(extracted)
        return ", ".join(cleaned) if cleaned else None
    cleaned = _clean_text(value)
    if not cleaned:
        return None

    employment_type_labels = {
        "FULL_TIME": "Tempo integral",
        "PART_TIME": "Meio período",
        "CONTRACTOR": "Contrato",
        "TEMPORARY": "Temporário",
        "INTERN": "Estágio",
    }
    return employment_type_labels.get(cleaned.upper(), _normalize_contract_type_display(cleaned))


def _normalize_contract_type_display(value: str) -> str:
    return re.sub(r"\s*[–—]\s*", " - ", value).strip()


def _extract_explicit_contract_type(text: str | None) -> str | None:
    return _extract_label_value(
        text,
        [
            "regime de contratacao",
            "regime de contratação",
            "tipo de contratacao",
            "tipo de contratação",
            "contrato",
            "regime",
        ],
    )


def _extract_work_mode(
    *,
    json_ld_value: Any = None,
    page_text: str | None = None,
    title: str | None = None,
) -> str | None:
    structured = _normalize_work_mode(json_ld_value)
    if structured:
        return structured

    labeled = _extract_labeled_work_mode(page_text)
    if labeled:
        return labeled

    isolated = _extract_isolated_work_mode(page_text)
    if isolated:
        return isolated

    return _extract_title_work_mode(title)


def _extract_labeled_work_mode(text: str | None) -> str | None:
    cleaned = _clean_text(text)
    if not cleaned:
        return None

    lines = _content_lines(cleaned)
    normalized_labels = [_normalize_label(label) for label in WORK_MODE_LABELS]

    for index, line in enumerate(lines):
        normalized_line = _normalize_label(line.rstrip(":"))
        if normalized_line.startswith("regime de contratacao") or normalized_line.startswith("regime de contratação"):
            continue

        for normalized_label in normalized_labels:
            if normalized_line.startswith(f"{normalized_label}:"):
                value = line.split(":", 1)[1].strip()
                work_mode = _normalize_work_mode(value)
                if work_mode:
                    return work_mode
            if normalized_line == normalized_label and index + 1 < len(lines):
                value = lines[index + 1]
                if value and not _looks_like_section_heading(value):
                    work_mode = _normalize_work_mode(value)
                    if work_mode:
                        return work_mode

    return None


def _extract_isolated_work_mode(text: str | None) -> str | None:
    cleaned = _clean_text(text)
    if not cleaned:
        return None

    for line in _content_lines(cleaned):
        normalized = _normalize_label(line.rstrip(":"))
        if normalized in {
            "presencial",
            "hibrido",
            "híbrido",
            "totalmente remoto",
            "temporariamente remoto",
        }:
            return _normalize_work_mode(line)

    return None


def _extract_title_work_mode(title: str | None) -> str | None:
    normalized = _normalize_label(_clean_text(title))
    if not normalized:
        return None

    if re.search(r"\b(home office|remoto|remota)\b", normalized):
        return "REMOTE"
    if re.search(r"\bhibrid[oa]\b", normalized):
        return "HYBRID"
    return None


def _normalize_work_mode(value: Any) -> str | None:
    if isinstance(value, list):
        for item in value:
            work_mode = _normalize_work_mode(item)
            if work_mode:
                return work_mode
        return None

    cleaned = _clean_text(value)
    if not cleaned:
        return None

    normalized = _normalize_label(cleaned)
    if normalized in {"telecommute", "remote", "remoto", "remota"}:
        return "REMOTE"
    if normalized in {"onsite", "on site", "on-site", "presencial"}:
        return "ONSITE"
    if normalized in {"hybrid", "hibrido", "híbrido"}:
        return "HYBRID"

    has_remote = bool(re.search(r"\b(remot[oa]|home office|home-office|teletrabalho)\b", normalized))
    has_onsite = bool(re.search(r"\b(presencial|presenciais)\b", normalized))
    has_hybrid = bool(re.search(r"\bhibrid[oa]\b", normalized))

    if has_hybrid or (has_remote and has_onsite):
        return "HYBRID"
    if has_remote:
        return "REMOTE"
    if has_onsite:
        return "ONSITE"
    return None


def _extract_job_activities(text: str | None) -> list[str]:
    specific = _extract_section_items(
        text,
        start_labels=["o que voce vai fazer"],
        stop_labels=[
            "o que oferecemos",
            "beneficios",
            "diferenciais",
            "requisitos",
            "o que esperamos de voce",
            "regime",
            "localizacao",
            "localização",
            "tipo de contratacao",
            "tipo de contratação",
        ],
    )
    if specific:
        return specific

    return _extract_labeled_items(text, ["atividades", "atribuicoes", "atribuições", "responsabilidades"])


def _extract_job_requirements(text: str | None) -> list[str]:
    specific = _extract_section_items(
        text,
        start_labels=["o que esperamos de voce", "requisitos"],
        stop_labels=[
            "o que oferecemos",
            "beneficios",
            "diferenciais",
            "regime",
            "localizacao",
            "localização",
            "tipo de contratacao",
            "tipo de contratação",
            "descricao e responsabilidades",
            "o que voce vai fazer",
        ],
    )
    if specific:
        return specific

    return _extract_labeled_items(
        text,
        [
            "requisitos",
            "qualificacoes",
            "qualificações",
            "graduacao",
            "graduação",
            "formacao",
            "formação",
            "conhecimentos",
            "competencias necessarias",
            "competências necessárias",
        ],
    )


def _extract_section_items(text: str | None, start_labels: list[str], stop_labels: list[str]) -> list[str]:
    cleaned = _clean_text(text)
    if not cleaned:
        return []

    lines = _content_lines(cleaned)
    collecting = False
    collected: list[str] = []

    for line in lines:
        if _line_matches_any_label(line, start_labels):
            collecting = True
            after_colon = line.split(":", 1)[1].strip() if ":" in line else ""
            if after_colon:
                collected.extend(_list_from_value(after_colon))
            continue

        if not collecting:
            continue

        if _line_matches_any_label(line, stop_labels) or _looks_like_section_heading(line):
            break

        collected.extend(_list_from_value(line))

    return _dedupe_items(collected)


def _content_lines(text: str) -> list[str]:
    lines = [line.strip(" -*•\t") for line in _clean_text(text).split("\n") if line.strip(" -*•\t")]
    return _merge_inline_label_lines(lines)


def _merge_inline_label_lines(lines: list[str]) -> list[str]:
    merged: list[str] = []
    index = 0

    while index < len(lines):
        line = lines[index]
        next_line = lines[index + 1] if index + 1 < len(lines) else ""

        if _should_merge_inline_label_line(line, next_line):
            separator = "" if next_line.startswith(":") else " "
            merged.append(f"{line}{separator}{next_line}".strip())
            index += 2
            continue

        if merged and _should_merge_continuation_line(merged[-1], line):
            merged[-1] = f"{merged[-1]} {line}".strip()
            index += 1
            continue

        merged.append(line)
        index += 1

    return merged


def _should_merge_inline_label_line(line: str, next_line: str) -> bool:
    if not next_line:
        return False

    normalized = _normalize_heading(line)
    if not _heading_matches_any(normalized, INLINE_VALUE_LABELS):
        return False

    if not line.endswith(":") and not next_line.startswith(":"):
        return False

    if _classify_heading(next_line) or _looks_like_section_heading(next_line):
        return False

    return True


def _should_merge_continuation_line(previous_line: str, current_line: str) -> bool:
    if not previous_line or not current_line:
        return False
    if _classify_heading(current_line) or _looks_like_section_heading(current_line):
        return False
    normalized_previous = _normalize_label(previous_line.rstrip())
    if previous_line.rstrip().endswith(",") or normalized_previous.endswith((" e", " de", " da", " do", " das", " dos")):
        return True
    return current_line[:1].islower()


def _line_matches_any_label(line: str, labels: list[str]) -> bool:
    normalized_line = _normalize_label(line.rstrip(":"))
    normalized_line = re.sub(r"\s+", " ", normalized_line)

    for label in labels:
        normalized_label = re.sub(r"\s+", " ", _normalize_label(label))
        if normalized_line == normalized_label:
            return True
        if normalized_line.startswith(f"{normalized_label}:"):
            return True
    return False


def _extract_labeled_items(text: str | None, labels: list[str]) -> list[str]:
    cleaned = _clean_text(text)
    if not cleaned:
        return []

    normalized_labels = [_normalize_label(label) for label in labels]
    lines = _content_lines(cleaned)
    collecting = False
    collected: list[str] = []

    for line in lines:
        line_label = _normalize_label(line.rstrip(":"))
        is_heading = any(label == line_label or label in line_label[:60] for label in normalized_labels)
        if is_heading:
            collecting = True
            after_colon = line.split(":", 1)[1].strip() if ":" in line else ""
            if after_colon:
                collected.extend(_list_from_value(after_colon))
            elif not any(label == line_label for label in normalized_labels):
                collected.extend(_list_from_value(line))
            continue
        if collecting:
            if _looks_like_section_heading(line):
                break
            collected.extend(_list_from_value(line))

    return _dedupe_items(collected)


def _extract_label_value(text: str | None, labels: list[str]) -> str | None:
    cleaned = _clean_text(text)
    if not cleaned:
        return None
    lines = _content_lines(cleaned)
    normalized_labels = [_normalize_label(label) for label in labels]

    for index, line in enumerate(lines):
        normalized_line = _normalize_label(line.rstrip(":"))
        for normalized_label in normalized_labels:
            if normalized_line.startswith(f"{normalized_label}:"):
                value = line.split(":", 1)[1].strip()
                if value:
                    return _clean_text(value) or None
            if normalized_line == normalized_label and index + 1 < len(lines):
                value = lines[index + 1]
                if value and not _looks_like_section_heading(value):
                    return _clean_text(value) or None

    for label in labels:
        pattern = re.compile(rf"{re.escape(label)}\s*:\s*(.+)", re.IGNORECASE)
        match = pattern.search(cleaned)
        if match:
            return _clean_text(match.group(1).split("\n", 1)[0]) or None
    return None


def _normalize_label(value: str) -> str:
    return (
        value.lower()
        .replace("ç", "c")
        .replace("õ", "o")
        .replace("ã", "a")
        .replace("á", "a")
        .replace("à", "a")
        .replace("â", "a")
        .replace("é", "e")
        .replace("ê", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ô", "o")
        .replace("ú", "u")
        .strip()
    )


def _looks_like_section_heading(value: str) -> bool:
    normalized = _normalize_label(value.rstrip(":"))
    known_headings = {
        "beneficios",
        "horario",
        "salario",
        "remuneracao",
        "localizacao",
        "local",
        "empresa",
        "observacoes",
        "escolaridade",
        "dados da vaga",
    }
    return normalized in known_headings or (len(value) <= 45 and value.endswith(":"))


def _dedupe_items(items: list[Any]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for item in items:
        cleaned = _truncate(_clean_text(item).replace("\n", " "), 500)
        if not cleaned:
            continue
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(cleaned)
    return result


def _truncate(value: str, max_length: int) -> str:
    if len(value) <= max_length:
        return value
    return f"{value[: max_length - 3].rstrip()}..."
