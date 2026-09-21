"""Shared schema helpers for the interview AI service."""

JOB_CONTEXT_RESPONSE_FIELDS = (
    "title",
    "company",
    "summary",
    "activities",
    "requirements",
    "requiredRequirements",
    "desirableRequirements",
    "differentials",
    "location",
    "contractType",
    "workMode",
    "sourceUrl",
)

QUESTION_TYPES = (
    "Tecnica",
    "Tecnica",
    "Comportamental",
    "Comportamental",
    "Carreira",
)

EVALUATION_CRITERIA = (
    "Clareza",
    "Coerência",
    "Objetividade",
    "Domínio",
    "Organização",
    "Aderência",
    "Exemplos",
)
