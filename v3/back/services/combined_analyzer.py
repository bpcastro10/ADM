"""Servicio de análisis combinado CV + Código para determinar aptitud del candidato."""

from __future__ import annotations

import json
import re
from typing import Optional

from anthropic import Anthropic

from config import ANTHROPIC_API_KEY, AI_MODEL, AI_TIMEOUT
from models.schemas import EvaluationResult, ResumeEvaluationResult
from services.rubric_scale import format_evaluation_score

# Umbral mínimo: si ambas notas lo superan, el candidato es APTO automáticamente.
_APPROVAL_THRESHOLD = 3.8


SYSTEM_PROMPT = (
    "Reclutador técnico. Veredicto APTO o NO_APTO integrando CV y prueba técnica. Solo JSON sin markdown.\n"
    "- Usa ambas evaluaciones; APTO si el conjunto es sólido o hay compensación justificada.\n"
    "- detailed_reasoning: 1-3 párrafos concretos.\n"
    "- red_flags_summary: banderas graves para el puesto si es APTO (vacío si no aplica)."
)

USER_PROMPT_TEMPLATE = """\
{context}

JSON: {{"verdict":"apto|no_apto","detailed_reasoning":"...","red_flags_summary":"..."}}"""

_MAX_TOKENS = 8192


def _join_items(items: list, limit: int = 5) -> str:
    return "; ".join(items[:limit]) if items else "-"


def _test_type_label(code_result: EvaluationResult) -> str:
    source = (code_result.source_type or "").lower()
    if source in ("written", "document"):
        return "Evaluación escrita"
    if source == "notebook":
        return "Notebook Jupyter/Colab"
    if source == "zip":
        return "Prueba (ZIP)"
    return "Prueba técnica (código)"


def _build_context(code_result: EvaluationResult, resume_result: ResumeEvaluationResult) -> str:
    cv = (
        f"CV {format_evaluation_score(resume_result.match_score)}/5 | {resume_result.executive_summary}\n"
        f"Fort: {_join_items(resume_result.strengths)} | Brechas: {_join_items(resume_result.gaps)}"
        + (f" | Flags: {_join_items(resume_result.red_flags)}" if resume_result.red_flags else "")
    )
    criteria = " | ".join(
        f"{ce.criterion_name} {format_evaluation_score(ce.score)}/5: {(ce.comments or '')[:120]}"
        for ce in (code_result.criteria_evaluations or [])
    )
    test = (
        f"{_test_type_label(code_result)} {format_evaluation_score(code_result.overall_score)}/5 | "
        f"{code_result.executive_summary}\n"
        f"Fort: {_join_items(code_result.strengths)} | Mejoras: {_join_items(code_result.areas_for_improvement)}\n"
        + (f"Criterios: {criteria}" if criteria else "")
    )
    return f"{cv}\n{test}"


def _parse_ai_response(raw: str) -> Optional[dict]:
    """
    Extrae el primer objeto JSON completo de la respuesta.
    Maneja markdown, texto previo/posterior y bloques de código.
    """
    text = re.sub(r"```(?:json)?\s*", "", raw).strip()
    decoder = json.JSONDecoder()
    start = text.find("{")
    while start != -1:
        try:
            obj, _ = decoder.raw_decode(text, start)
            if isinstance(obj, dict):
                return obj
        except (json.JSONDecodeError, Exception):
            pass
        start = text.find("{", start + 1)
    return None


def _build_red_flags_summary(ai_summary: str, resume_result: ResumeEvaluationResult) -> Optional[str]:
    summary = (ai_summary or "").strip()
    if summary:
        return summary
    flags = [f.strip() for f in (resume_result.red_flags or []) if f and f.strip()]
    if not flags:
        return None
    return "Banderas rojas para el puesto: " + "; ".join(flags[:5]) + "."


def _average_above_threshold(code_result: EvaluationResult, resume_result: ResumeEvaluationResult) -> bool:
    """Retorna True si el promedio de ambas notas supera el umbral de aprobación."""
    promedio = ((code_result.overall_score or 0) + (resume_result.match_score or 0)) / 2
    return promedio > _APPROVAL_THRESHOLD


def analyze_combined(
    code_result: EvaluationResult,
    resume_result: ResumeEvaluationResult,
) -> dict:
    """Analiza CV + prueba técnica y devuelve veredicto de aptitud."""
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY no está configurada.")

    context = _build_context(code_result, resume_result)

    # Regla determinista: promedio de ambas notas > 3.8 → APTO directo, sin depender del criterio de la IA.
    auto_apto = _average_above_threshold(code_result, resume_result)

    user_prompt = USER_PROMPT_TEMPLATE.format(context=context)

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=AI_MODEL,
        max_tokens=_MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=AI_TIMEOUT,
    )
    raw = response.content[0].text
    parsed = _parse_ai_response(raw)
    if not parsed:
        raise ValueError("La IA no devolvió un JSON válido.")

    # Si ambas notas superan 3.8, el veredicto siempre es APTO independientemente de la IA.
    verdict = "apto" if auto_apto else (parsed.get("verdict") or "no_apto").lower().strip()
    if verdict not in ("apto", "no_apto"):
        verdict = "no_apto"

    red_flags_summary = None
    if verdict == "apto":
        red_flags_summary = _build_red_flags_summary(
            parsed.get("red_flags_summary", ""), resume_result,
        )

    return {
        "applicable": True,
        "verdict": verdict,
        "detailed_reasoning": parsed.get("detailed_reasoning", "No se pudo generar el razonamiento."),
        "red_flags_summary": red_flags_summary,
    }
