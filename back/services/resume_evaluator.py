"""Servicio de evaluación de CV usando Claude (calificación según rúbrica del puesto)."""

from __future__ import annotations

import json
import re
from typing import List, Optional

from anthropic import Anthropic

from config import ANTHROPIC_API_KEY, AI_MODEL, AI_TIMEOUT
from models.schemas import SoughtCharacteristic
from services.content_client import build_rubric_checklist_text
from services.rubric_scale import normalize_evaluation_score
from typing import TypedDict


SYSTEM_PROMPT = """Reclutador técnico. Califica el CV solo con la rúbrica del mensaje.

Reglas:
- Un ítem en job_requirements_checklist por requisito; requirement igual al de la rúbrica, mismo orden.
- status: cumple|parcial|no cumple|no evidenciado; sin inventar datos fuera del CV.
- match_score 1-5 con decimales (ej. 3.5) según ajuste global a la rúbrica.
- En evidence, gaps y executive_summary nunca uses "no tiene", "no posee" ni "carece de".
  Cuando el CV no demuestre un requisito, escribe "no evidencia" o "no evidencia en el CV".
- Respuesta: solo JSON válido, sin markdown ni texto extra."""

USER_PROMPT_TEMPLATE = """Rúbrica (evalúa solo esto):
{rubric_checklist}

Puesto (contexto):
{job_description}

CV:
{resume_text}

JSON único:
{{"match_score":1,"overall_score_reason":"...","executive_summary":"...","job_requirements_checklist":[{{"requirement":"<igual rúbrica>","status":"cumple|parcial|no cumple|no evidenciado","evidence":"..."}}],"strengths":[],"gaps":[],"recommendations":[],"keyword_alignment":[],"red_flags":[]}}

overall_score_reason 2-6 líneas; executive_summary 3-6; red_flags solo si hay evidencia en el CV.
Si un requisito no aparece en el CV, indica "No evidencia en el CV" (nunca "no tiene")."""


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
    normalized = text
    for pattern, replacement in _BIAS_REPLACEMENTS:
        normalized = pattern.sub(replacement, normalized)
    return normalized


def _normalize_text_fields(data: dict) -> None:
    for key in ("overall_score_reason", "executive_summary"):
        if key in data and data[key]:
            data[key] = _normalize_bias_language(str(data[key]))

    for field in ("strengths", "gaps", "recommendations", "keyword_alignment", "red_flags"):
        items = data.get(field) or []
        data[field] = [_normalize_bias_language(str(item)) for item in items]

    checklist = data.get("job_requirements_checklist") or []
    for item in checklist:
        if isinstance(item, dict) and item.get("evidence"):
            item["evidence"] = _normalize_bias_language(str(item["evidence"]))


def _parse_ai_response(raw: str) -> Optional[dict]:
    json_match = re.search(r"\{[\s\S]*\}", raw)
    if not json_match:
        return None
    try:
        return json.loads(json_match.group())
    except Exception:
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

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    user_prompt = USER_PROMPT_TEMPLATE.format(
        rubric_checklist=rubric_checklist,
        job_description=job_description.strip(),
        resume_text=resume_text.strip(),
    )

    response = client.messages.create(
        model=AI_MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=AI_TIMEOUT,
    )

    raw_text = response.content[0].text if response.content else ""
    data = _parse_ai_response(raw_text)
    if not data:
        raise ValueError("La IA no devolvió JSON válido para la evaluación del CV.")

    data["match_score"] = normalize_evaluation_score(
        data.get("match_score", 0),
        min_score=1.0,
        max_score=5.0,
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
