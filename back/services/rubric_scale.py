"""Escala 0-5: resolución desde la rúbrica de la prueba y plantillas por contexto."""

from __future__ import annotations

from typing import Any, Mapping

SCORE_LEVEL_KEYS = ("0", "1", "2", "3", "4", "5")


def normalize_evaluation_score(
    value,
    *,
    min_score: float = 0.0,
    max_score: float = 5.0,
) -> float:
    """Normaliza un puntaje a un decimal dentro del rango permitido."""
    try:
        score = float(value)
    except (TypeError, ValueError):
        score = 0.0
    score = max(min_score, min(max_score, score))
    return round(score, 1)


def format_evaluation_score(score: float) -> str:
    """Formatea un puntaje para reportes (entero si aplica, si no un decimal)."""
    if score == int(score):
        return str(int(score))
    return str(round(score, 1))

# Solo se usa si la rúbrica no define un nivel.
FALLBACK_SCORE_SCALE: dict[str, str] = {
    "0": "No cumple o sin evidencia en el código.",
    "1": "Deficiente: incumple lo esperado.",
    "2": "Insuficiente: mínimos con fallas importantes.",
    "3": "Aceptable: esencial cumplido, mejoras posibles.",
    "4": "Bueno: cumplimiento sólido, detalles menores.",
    "5": "Excelente: supera lo definido en el criterio.",
}

# Plantillas alineadas con las pruebas de jsonserver/db.json
_SCORE_SCALE_TEMPLATES: dict[str, dict[str, str]] = {
    "python": {
        "0": "Sin entrega evaluable, código vacío o sin relación con el enunciado.",
        "1": "Deficiente: no cumple lo mínimo del criterio.",
        "2": "Insuficiente: cumple parcialmente con errores graves.",
        "3": "Aceptable: cumple lo esencial con mejoras claras pendientes.",
        "4": "Bueno: cumple de forma sólida con detalles menores.",
        "5": "Excelente: cumplimiento destacado del criterio.",
    },
    "java": {
        "0": "Sin entrega evaluable o sin relación con el enunciado Java/Spring.",
        "1": "Deficiente: funcionalidad o criterio muy por debajo de lo pedido.",
        "2": "Insuficiente: avance parcial con fallas importantes.",
        "3": "Aceptable: requisitos centrales cubiertos con deuda técnica.",
        "4": "Bueno: implementación sólida con ajustes menores.",
        "5": "Excelente: solución completa y bien ejecutada.",
    },
    "javascript": {
        "0": "Sin entrega evaluable o sin relación con el enunciado.",
        "1": "Deficiente: no cumple lo mínimo del criterio.",
        "2": "Insuficiente: cumple parcialmente con errores graves.",
        "3": "Aceptable: cumple lo esencial con mejoras pendientes.",
        "4": "Bueno: cumplimiento sólido con detalles menores.",
        "5": "Excelente: cumplimiento destacado del criterio.",
    },
    "typescript": {
        "0": "Sin entrega evaluable o sin relación con el enunciado.",
        "1": "Deficiente: no cumple lo mínimo del criterio.",
        "2": "Insuficiente: cumple parcialmente con errores graves.",
        "3": "Aceptable: cumple lo esencial con mejoras pendientes.",
        "4": "Bueno: cumplimiento sólido con detalles menores.",
        "5": "Excelente: cumplimiento destacado del criterio.",
    },
}


def parse_raw_score_scale(raw: Mapping[str, Any] | None) -> dict[str, str]:
    """Normaliza scoreScale / score_scale del JSON de la prueba técnica."""
    if not raw:
        return {}
    parsed: dict[str, str] = {}
    for key in SCORE_LEVEL_KEYS:
        val = raw.get(key) or raw.get(str(key))
        if val is not None and str(val).strip():
            parsed[key] = str(val).strip()
    return parsed


def suggest_score_scale(
    *,
    default_language: str | None = None,
    title: str = "",
    brief: str = "",
) -> dict[str, str]:
    """Plantilla pertinente al crear o completar una rúbrica (no sustituye niveles ya definidos)."""
    lang = (default_language or "").strip().lower()
    text = f"{title} {brief}".lower()

    if lang == "java" or "java" in text or "spring" in text:
        return dict(_SCORE_SCALE_TEMPLATES["java"])
    if lang in ("javascript", "typescript"):
        return dict(_SCORE_SCALE_TEMPLATES[lang])
    if lang == "python" or "fastapi" in text or "flask" in text or "django" in text:
        return dict(_SCORE_SCALE_TEMPLATES["python"])
    if lang and lang in _SCORE_SCALE_TEMPLATES:
        return dict(_SCORE_SCALE_TEMPLATES[lang])
    return dict(FALLBACK_SCORE_SCALE)


def resolve_score_scale(
    rubric_scale: Mapping[str, str] | None,
    *,
    default_language: str | None = None,
    title: str = "",
    brief: str = "",
) -> dict[str, str]:
    """
    Escala efectiva para la IA: prioriza lo guardado en la rúbrica;
    completa huecos con plantilla contextual o fallback genérico.
    """
    from_rubric = {
        k: v.strip()
        for k, v in (rubric_scale or {}).items()
        if k in SCORE_LEVEL_KEYS and v and str(v).strip()
    }
    if len(from_rubric) == len(SCORE_LEVEL_KEYS):
        return {k: from_rubric[k] for k in SCORE_LEVEL_KEYS}

    template = suggest_score_scale(
        default_language=default_language,
        title=title,
        brief=brief,
    )
    resolved: dict[str, str] = {}
    for key in SCORE_LEVEL_KEYS:
        resolved[key] = from_rubric.get(key) or template.get(key) or FALLBACK_SCORE_SCALE[key]
    return resolved
