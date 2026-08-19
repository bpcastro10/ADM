"""Servicio de evaluación con IA."""
import json
import re
from typing import Optional
from models.schemas import RubricInput, AIEvaluationResponse
from services.ai_client import call_ai, is_ai_configured
from services.rubric_scale import SCORE_LEVEL_KEYS, normalize_evaluation_score, resolve_score_scale

# ---------------------------------------------------------------------------
# System prompts compactos — misma semántica, menos tokens
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "Evalúa la entrega del candidato con la rúbrica dada. Solo JSON sin markdown.\n"
    "- criterion_name = nombre exacto de la rúbrica; un ítem por criterio.\n"
    "- score 0-5 con decimal (ej. 3.5); parcial→1-3; completo y correcto→4-5.\n"
    "- comments ≤2 frases objetivas; adapta el lenguaje al tipo de entrega (código, texto, análisis, diseño, etc.)."
)

SYSTEM_PROMPT_WRITTEN = (
    "Evalúa prueba escrita. Solo JSON sin markdown.\n"
    "- Usa tantos criterios como sean necesarios según el contenido; criterion_name = área/pregunta evaluada.\n"
    "- score 0-5 con decimal; vago/incompleto→1-2; correcto y completo→4-5.\n"
    "- comments ≤2 frases técnicas."
)

SYSTEM_PROMPT_NOTEBOOK = (
    "Evalúa notebook Jupyter/Colab: instrucciones en celdas markdown, solución en código. Solo JSON sin markdown.\n"
    "- Usa tantos criterios como sean necesarios según las instrucciones; criterion_name = aspecto evaluado.\n"
    "- score 0-5 con decimal; vacío/error→0-1; parcial→2-3; correcto y completo→4-5.\n"
    "- comments: cita instrucción y estado de la solución (≤2 frases)."
)

# ---------------------------------------------------------------------------
# User prompts compactos
# ---------------------------------------------------------------------------
_JSON_EVAL = (
    '{"criteria_evaluations":[{"criterion_name":"...","score":0.0,"comments":"..."}],'
    '"overall_score":0.0,"executive_summary":"...","strengths":["..."],"areas_for_improvement":["..."]}'
)

USER_PROMPT_TEMPLATE = """\
Rúbrica:
{rubric_text}

Escala: {score_scale_text}

Entrega del candidato ({language}):
```{language}
{code}
```

JSON (overall_score coherente; 2-4 strengths/improvements):
{json_schema}"""

USER_PROMPT_WRITTEN_TEMPLATE = """\
Documento:
---
{document_text}
---
Escala: {score_scale_text}

JSON (criterios según el documento; overall_score coherente; 2-4 strengths/improvements):
{json_schema}"""

USER_PROMPT_NOTEBOOK_TEMPLATE = """\
INSTRUCCIONES (markdown):
{instructions}

SOLUCIÓN (código):
{solution_code}

{cell_summary}
Escala: {score_scale_text}

JSON (criterios según las instrucciones; overall_score coherente; 2-4 strengths/improvements):
{json_schema}"""

# Tokens output máximos por tipo de llamada
_MAX_TOKENS_EVAL = 8192


# ---------------------------------------------------------------------------
# Helpers internos
# ---------------------------------------------------------------------------
def _build_score_scale_text(scale: dict[str, str]) -> str:
    """Escala en una línea compacta para reducir tokens."""
    parts = []
    for k in SCORE_LEVEL_KEYS:
        desc = (scale.get(k) or "").strip()[:70]
        parts.append(f"{k}={desc}")
    return " | ".join(parts)


def _build_rubric_text(rubric: RubricInput) -> str:
    return "\n".join(f"{i}. {c.name}: {c.description}" for i, c in enumerate(rubric.criteria, 1))


def _parse_ai_response(raw: str) -> Optional[AIEvaluationResponse]:
    """
    Extrae el primer objeto JSON completo de la respuesta.
    Maneja markdown, texto previo/posterior y bloques de código.
    """
    text = re.sub(r"```(?:json)?\s*", "", raw).strip()
    decoder = json.JSONDecoder()
    start = text.find("{")
    while start != -1:
        try:
            data, _ = decoder.raw_decode(text, start)
            if isinstance(data, dict):
                for ce in data.get("criteria_evaluations", []):
                    ce["score"] = normalize_evaluation_score(ce.get("score", 0))
                data["overall_score"] = normalize_evaluation_score(data.get("overall_score", 0))
                return AIEvaluationResponse(**data)
        except (json.JSONDecodeError, Exception):
            pass
        start = text.find("{", start + 1)
    return None


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------
def evaluate_code(
    rubric: RubricInput,
    code: str,
    language: str = "python",
) -> AIEvaluationResponse:
    """Evalúa código fuente usando la rúbrica oficial."""
    if not is_ai_configured():
        raise ValueError("El servicio de IA no está configurado.")

    scale = resolve_score_scale(rubric.score_scale)
    user_prompt = USER_PROMPT_TEMPLATE.format(
        rubric_text=_build_rubric_text(rubric),
        score_scale_text=_build_score_scale_text(scale),
        language=language or "text",
        code=code,
        json_schema=_JSON_EVAL,
    )

    raw = call_ai(SYSTEM_PROMPT, user_prompt, max_tokens=_MAX_TOKENS_EVAL)
    parsed = _parse_ai_response(raw)

    if not parsed:
        raise ValueError(
            "La IA no devolvió una respuesta en el formato esperado. "
            "Intenta de nuevo o revisa la rúbrica."
        )
    if len(parsed.criteria_evaluations) != len(rubric.criteria):
        raise ValueError(
            f"La IA evaluó {len(parsed.criteria_evaluations)} criterios "
            f"pero la rúbrica tiene {len(rubric.criteria)}. Intenta de nuevo."
        )
    return parsed


def evaluate_written_test(document_text: str) -> AIEvaluationResponse:
    """Evalúa un documento escrito; la IA deriva los criterios del contenido."""
    if not is_ai_configured():
        raise ValueError("El servicio de IA no está configurado.")

    scale = resolve_score_scale(None)
    user_prompt = USER_PROMPT_WRITTEN_TEMPLATE.format(
        score_scale_text=_build_score_scale_text(scale),
        document_text=document_text,
        json_schema=_JSON_EVAL,
    )

    raw = call_ai(SYSTEM_PROMPT_WRITTEN, user_prompt, max_tokens=_MAX_TOKENS_EVAL)
    parsed = _parse_ai_response(raw)

    if not parsed:
        raise ValueError(
            "La IA no devolvió una respuesta en el formato esperado. "
            "Intenta de nuevo con un documento más claro."
        )
    n = len(parsed.criteria_evaluations)
    if n < 3 or n > 10:
        raise ValueError(
            f"La IA evaluó {n} criterios; se esperaban entre 3 y 10. Intenta de nuevo."
        )
    return parsed


def evaluate_notebook(
    instructions: str,
    solution_code: str,
    cell_summary: str,
) -> AIEvaluationResponse:
    """Evalúa un notebook Jupyter/Colab (instrucciones en markdown + solución en código)."""
    if not is_ai_configured():
        raise ValueError("El servicio de IA no está configurado.")

    scale = resolve_score_scale(None)
    user_prompt = USER_PROMPT_NOTEBOOK_TEMPLATE.format(
        instructions=instructions,
        solution_code=solution_code,
        cell_summary=cell_summary,
        score_scale_text=_build_score_scale_text(scale),
        json_schema=_JSON_EVAL,
    )

    raw = call_ai(SYSTEM_PROMPT_NOTEBOOK, user_prompt, max_tokens=_MAX_TOKENS_EVAL)
    parsed = _parse_ai_response(raw)

    if not parsed:
        raise ValueError(
            "La IA no devolvió una respuesta en el formato esperado. "
            "Intenta de nuevo con el notebook."
        )
    n = len(parsed.criteria_evaluations)
    if n < 3 or n > 10:
        raise ValueError(
            f"La IA evaluó {n} criterios; se esperaban entre 3 y 10. Intenta de nuevo."
        )
    return parsed
