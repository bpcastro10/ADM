"""Servicio de análisis combinado CV + Código para determinar aptitud del candidato."""

from __future__ import annotations

import json
import re
from typing import Optional

from anthropic import Anthropic

from config import (
    ANTHROPIC_API_KEY,
    AI_MODEL,
    AI_TIMEOUT,
)
from models.schemas import EvaluationResult, ResumeEvaluationResult
from services.rubric_scale import format_evaluation_score


SYSTEM_PROMPT = """Reclutador técnico. Veredicto APTO o NO APTO integrando CV y prueba técnica.

Reglas:
- La prueba técnica puede ser código fuente o evaluación escrita (cuestionario, documento); trátalas con igual peso.
- Evalúa aptitud global integrando CV y prueba técnica, sin importar las notas individuales.
- Usa ambas evaluaciones; APTO si el conjunto es sólido o hay compensación justificada.
- Banderas rojas graves para el puesto: riesgos del CV que impacten el rol aunque el candidato sea APTO.
- Si el veredicto es apto y existen banderas rojas graves, red_flags_summary debe resumirlas (2-5 líneas).
- Si no hay banderas graves o el veredicto es no_apto, red_flags_summary debe ser cadena vacía.
- detailed_reasoning: 1-3 párrafos con datos concretos de CV y prueba técnica.
- Respuesta: solo JSON con verdict (apto|no_apto), detailed_reasoning y red_flags_summary."""

USER_PROMPT_TEMPLATE = """{context}

JSON único:
{{"verdict":"apto|no_apto","detailed_reasoning":"...","red_flags_summary":"..."}}"""


def _join_items(items: list, limit: int = 5) -> str:
    if not items:
        return "-"
    return "; ".join(items[:limit])


def _format_score(score: float) -> str:
    return format_evaluation_score(score)


def _test_type_label(code_result: EvaluationResult) -> str:
    source = (code_result.source_type or "").lower()
    if source in ("written", "document"):
        return "Evaluación escrita"
    if source == "zip":
        return "Prueba técnica (proyecto ZIP)"
    return "Prueba técnica (código)"


def _build_context(code_result: EvaluationResult, resume_result: ResumeEvaluationResult) -> str:
    """Contexto compacto a partir de ambas evaluaciones."""
    cv = (
        f"CV {_format_score(resume_result.match_score)}/5 | {resume_result.executive_summary}\n"
        f"Fort: {_join_items(resume_result.strengths)} | "
        f"Brechas: {_join_items(resume_result.gaps)} | "
        f"Flags: {_join_items(resume_result.red_flags) or '-'}"
    )
    criteria = []
    for ce in code_result.criteria_evaluations or []:
        comment = (ce.comments or "")[:150]
        if len(ce.comments or "") > 150:
            comment += "..."
        criteria.append(
            f"{ce.criterion_name} {_format_score(ce.score)}/5: {comment}"
        )
    test_label = _test_type_label(code_result)
    test = (
        f"{test_label} {_format_score(code_result.overall_score)}/5 | {code_result.executive_summary}\n"
        f"Fort: {_join_items(code_result.strengths)} | "
        f"Mejoras: {_join_items(code_result.areas_for_improvement)}\n"
        f"Criterios: {' | '.join(criteria) if criteria else '-'}"
    )
    return f"{cv}\n{test}"


def _parse_ai_response(raw: str) -> Optional[dict]:
    json_match = re.search(r"\{[\s\S]*\}", raw)
    if not json_match:
        return None
    try:
        return json.loads(json_match.group())
    except Exception:
        return None


def _build_red_flags_summary(
    ai_summary: str,
    resume_result: ResumeEvaluationResult,
) -> Optional[str]:
    summary = (ai_summary or "").strip()
    if summary:
        return summary

    flags = [flag.strip() for flag in (resume_result.red_flags or []) if flag and flag.strip()]
    if not flags:
        return None

    joined = "; ".join(flags[:5])
    return (
        "Banderas rojas a tener en cuenta para el puesto: "
        f"{joined}."
    )


def analyze_combined(
    code_result: EvaluationResult,
    resume_result: ResumeEvaluationResult,
) -> dict:
    """
    Analiza los resultados de CV y código para determinar si el candidato es apto.
    Retorna un dict con:
      - applicable: bool
      - verdict: "apto" | "no_apto"
      - detailed_reasoning: str
      - red_flags_summary: str | None
    """
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY no está configurada.")

    user_prompt = USER_PROMPT_TEMPLATE.format(
        context=_build_context(code_result, resume_result),
    )

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=AI_MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=AI_TIMEOUT,
    )
    raw = response.content[0].text
    parsed = _parse_ai_response(raw)
    if not parsed:
        raise ValueError("La IA no devolvió un JSON válido.")

    verdict = (parsed.get("verdict") or "no_apto").lower().strip()
    if verdict not in ("apto", "no_apto"):
        verdict = "no_apto"

    red_flags_summary = None
    if verdict == "apto":
        red_flags_summary = _build_red_flags_summary(
            parsed.get("red_flags_summary", ""),
            resume_result,
        )

    return {
        "applicable": True,
        "verdict": verdict,
        "detailed_reasoning": parsed.get("detailed_reasoning", "No se pudo generar el razonamiento."),
        "red_flags_summary": red_flags_summary,
    }
