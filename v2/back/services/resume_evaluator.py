"""Servicio de evaluación de CV usando Claude (calificación según rúbrica del puesto)."""

from __future__ import annotations

import json
import re
from typing import List, Optional, TypedDict

from anthropic import Anthropic

from config import ANTHROPIC_API_KEY, AI_MODEL, AI_TIMEOUT
from models.schemas import SoughtCharacteristic
from services.content_client import build_rubric_checklist_text
from services.rubric_scale import normalize_evaluation_score


SYSTEM_PROMPT = (
    "Evalúa CV con la rúbrica dada. Solo JSON sin markdown.\n"
    "- requirement = nombre exacto de la rúbrica; status: cumple|parcial|no cumple|no evidenciado.\n"
    "- match_score 1-5 con decimal según ajuste global.\n"
    "- evidence/gaps/summary: usa 'no evidencia en el CV' (nunca 'no tiene' ni 'carece de')."
)

_JSON_CV = (
    '{"match_score":1.0,"overall_score_reason":"...","executive_summary":"...",'
    '"job_requirements_checklist":[{"requirement":"...","status":"cumple|parcial|no cumple|no evidenciado","evidence":"..."}],'
    '"strengths":[],"gaps":[],"recommendations":[],"keyword_alignment":[],"red_flags":[]}'
)

USER_PROMPT_TEMPLATE = """\
Rúbrica:
{rubric_checklist}

Puesto:
{job_description}

CV:
{resume_text}

JSON (overall_score_reason 2-6 líneas; summary 3-6; red_flags solo con evidencia en el CV):
{json_schema}"""

_MAX_TOKENS = 8192

_BIAS_REPLACEMENTS = (
    (re.compile(r"\bno\s+tiene\b", re.IGNORECASE), "no evidencia"),
    (re.compile(r"\bno\s+posee\b", re.IGNORECASE), "no evidencia"),
    (re.compile(r"\bcarece\s+de\b", re.IGNORECASE), "no evidencia"),
    (re.compile(r"\bdoes\s+not\s+have\b", re.IGNORECASE), "does not evidence"),
    (re.compile(r"\blacks\b", re.IGNORECASE), "does not evidence"),
)


def _normalize_bias_language(text: str) -> str:
    if not text:
        return text
    for pattern, replacement in _BIAS_REPLACEMENTS:
        text = pattern.sub(replacement, text)
    return text


def _normalize_text_fields(data: dict) -> None:
    for key in ("overall_score_reason", "executive_summary"):
        if data.get(key):
            data[key] = _normalize_bias_language(str(data[key]))

    for field in ("strengths", "gaps", "recommendations", "keyword_alignment", "red_flags"):
        data[field] = [_normalize_bias_language(str(item)) for item in (data.get(field) or [])]

    for item in (data.get("job_requirements_checklist") or []):
        if isinstance(item, dict) and item.get("evidence"):
            item["evidence"] = _normalize_bias_language(str(item["evidence"]))


def _parse_ai_response(raw: str) -> Optional[dict]:
    """
    Extrae el primer objeto JSON completo de la respuesta.
    Maneja respuestas con markdown, texto previo/posterior y bloques de código.
    """
    # Eliminar bloques de código markdown si los hubiera
    text = re.sub(r"```(?:json)?\s*", "", raw).strip()

    # Usar JSONDecoder.raw_decode para encontrar el PRIMER objeto JSON válido
    decoder = json.JSONDecoder()
    start = text.find("{")
    while start != -1:
        try:
            obj, _ = decoder.raw_decode(text, start)
            if isinstance(obj, dict):
                return obj
        except json.JSONDecodeError:
            pass
        start = text.find("{", start + 1)
    return None


class ResumeAIParsed(TypedDict, total=False):
    match_score: float
    overall_score_reason: str
    executive_summary: str
    job_requirements_checklist: List[dict]
    strengths: List[str]
    gaps: List[str]
    recommendations: List[str]
    keyword_alignment: List[str]
    red_flags: List[str]


def evaluate_resume(
    job_description: str,
    resume_text: str,
    sought_characteristics: List[SoughtCharacteristic],
) -> ResumeAIParsed:
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY no está configurada.")

    if not sought_characteristics:
        raise ValueError("El puesto no tiene características buscadas definidas en JSON Server.")

    rubric_checklist = build_rubric_checklist_text(sought_characteristics)
    expected_count = len(sought_characteristics)

    # Sin truncado — se envía el contenido completo
    user_prompt = USER_PROMPT_TEMPLATE.format(
        rubric_checklist=rubric_checklist,
        job_description=job_description.strip(),
        resume_text=resume_text.strip(),
        json_schema=_JSON_CV,
    )

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=AI_MODEL,
        max_tokens=_MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=AI_TIMEOUT,
    )

    raw_text = response.content[0].text if response.content else ""
    data = _parse_ai_response(raw_text)
    if not data:
        raise ValueError("La IA no devolvió JSON válido para la evaluación del CV.")

    data["match_score"] = normalize_evaluation_score(
        data.get("match_score", 0), min_score=1.0, max_score=5.0,
    )

    checklist = data.get("job_requirements_checklist") or []
    if len(checklist) != expected_count:
        raise ValueError(
            f"La IA evaluó {len(checklist)} requisitos pero la rúbrica del puesto tiene {expected_count}. "
            "Intenta de nuevo."
        )

    _normalize_text_fields(data)
    data.setdefault("overall_score_reason", "")
    data.setdefault("keyword_alignment", [])
    data.setdefault("red_flags", [])

    return data  # type: ignore[return-value]
