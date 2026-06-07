"""Servicio de evaluación con IA usando Claude."""
import json
import re
from typing import Optional
import anthropic
from anthropic import Anthropic
from config import ANTHROPIC_API_KEY, AI_MODEL, AI_TIMEOUT
from models.schemas import (
    RubricInput,
    AIEvaluationResponse,
)
from services.rubric_scale import SCORE_LEVEL_KEYS, normalize_evaluation_score, resolve_score_scale

SYSTEM_PROMPT = """Evaluador técnico de código. Califica solo con la rúbrica del usuario.

Reglas:
- Un ítem en criteria_evaluations por cada criterio; criterion_name igual al de la rúbrica (sin inventar ni renombrar).
- Notas 0-5 según la escala del mensaje; decimales (ej. 3.5) si el desempeño está entre niveles.
- Comentarios técnicos, objetivos y breves.
- Respuesta: solo JSON válido, sin markdown ni texto fuera del objeto."""

SYSTEM_PROMPT_WRITTEN = """Evaluador de pruebas escritas: cuestionarios, preguntas abiertas, casos teóricos o documentos similares.

Reglas ESTRICTAS:
- Lee el documento completo e identifica preguntas, secciones o competencias evaluadas.
- Define entre 3 y 10 criterios en criteria_evaluations según el contenido real del documento.
- criterion_name debe describir el área o pregunta evaluada (ej. "Pregunta 1: arquitectura REST", "Conocimiento en bases de datos").
- Notas 0-5 según la escala; usa decimales (ej. 2.5, 3.8) cuando el desempeño está entre niveles.
- Sé exigente: respuestas vagas, incompletas, sin evidencia o fuera de tema reciben nota baja.
- Comentarios técnicos, objetivos y breves citando qué falta o qué está bien.
- Respuesta: solo JSON válido, sin markdown ni texto fuera del objeto."""

USER_PROMPT_TEMPLATE = """Rúbrica:
{rubric_text}

Escala 0-5:
{score_scale_text}

Código ({language}):
```{language}
{code}
```

JSON único (sin markdown):
{{"criteria_evaluations":[{{"criterion_name":"<igual rúbrica>","score":0,"comments":"..."}}],"overall_score":0,"executive_summary":"...","strengths":["..."],"areas_for_improvement":["..."]}}

overall_score coherente con los criterios; strengths y areas_for_improvement: 2-4 ítems."""

USER_PROMPT_WRITTEN_TEMPLATE = """Documento del candidato (cuestionario, prueba escrita o similar):
---
{document_text}
---

Escala 0-5:
{score_scale_text}

JSON único (sin markdown):
{{"criteria_evaluations":[{{"criterion_name":"<área o pregunta evaluada>","score":0,"comments":"..."}}],"overall_score":0,"executive_summary":"...","strengths":["..."],"areas_for_improvement":["..."]}}

Entre 3 y 10 criterios según el documento; overall_score coherente con los criterios; strengths y areas_for_improvement: 2-4 ítems."""


def _build_score_scale_text(scale: dict[str, str]) -> str:
    return "\n".join(f"{k}: {scale.get(k, '')}" for k in SCORE_LEVEL_KEYS)


def _build_rubric_text(rubric: RubricInput) -> str:
    """Construye el texto de la rúbrica para el prompt."""
    lines = []
    for i, c in enumerate(rubric.criteria, 1):
        lines.append(f"{i}. {c.name}: {c.description}")
    return "\n".join(lines)


def _parse_ai_response(raw: str) -> Optional[AIEvaluationResponse]:
    """Extrae y parsea el JSON de la respuesta de la IA."""
    json_match = re.search(r"\{[\s\S]*\}", raw)
    if not json_match:
        return None

    try:
        data = json.loads(json_match.group())
        for ce in data.get("criteria_evaluations", []):
            ce["score"] = normalize_evaluation_score(ce.get("score", 0))
        data["overall_score"] = normalize_evaluation_score(data.get("overall_score", 0))

        return AIEvaluationResponse(**data)
    except (json.JSONDecodeError, Exception):
        return None


def evaluate_code(
    rubric: RubricInput,
    code: str,
    language: str = "python",
) -> AIEvaluationResponse:
    """
    Evalúa el código usando Claude según la rúbrica.
    Lanza anthropic.APIError o TimeoutError en caso de fallo.
    """
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY no está configurada. Configura la variable de entorno.")

    scale = resolve_score_scale(rubric.score_scale)
    rubric_text = _build_rubric_text(rubric)
    score_scale_text = _build_score_scale_text(scale)
    user_prompt = USER_PROMPT_TEMPLATE.format(
        rubric_text=rubric_text,
        score_scale_text=score_scale_text,
        language=language or "text",
        code=code,
    )

    client = Anthropic(api_key=ANTHROPIC_API_KEY)

    response = client.messages.create(
        model=AI_MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=AI_TIMEOUT,
    )

    raw_text = response.content[0].text if response.content else ""
    parsed = _parse_ai_response(raw_text)

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
    """
    Evalúa un documento escrito (cuestionario, prueba teórica, etc.) sin rúbrica externa.
    La IA deriva los criterios del contenido del documento.
    """
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY no está configurada. Configura la variable de entorno.")

    scale = resolve_score_scale(None)
    score_scale_text = _build_score_scale_text(scale)
    user_prompt = USER_PROMPT_WRITTEN_TEMPLATE.format(
        score_scale_text=score_scale_text,
        document_text=document_text,
    )

    client = Anthropic(api_key=ANTHROPIC_API_KEY)

    response = client.messages.create(
        model=AI_MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT_WRITTEN,
        messages=[{"role": "user", "content": user_prompt}],
        timeout=AI_TIMEOUT,
    )

    raw_text = response.content[0].text if response.content else ""
    parsed = _parse_ai_response(raw_text)

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
