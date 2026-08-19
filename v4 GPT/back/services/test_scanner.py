"""Escaneo de documentos para extraer la estructura de una prueba técnica."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

from config import MIN_RUBRIC_CRITERIA
from services.ai_client import call_ai, is_ai_configured


SCAN_SYSTEM_PROMPT = (
    "Extrae de un documento de prueba técnica un JSON con:\n"
    "- title: título corto (≤80 chars)\n"
    "- brief: enunciado completo fiel al documento\n"
    "- defaultLanguage: python|javascript|java|typescript|text|excel|business|design|other\n"
    "  (text para ensayos/redacción, excel para análisis de datos, business para casos de negocio, design para creatividad)\n"
    "- criteria: tantos objetos {\"name\":\"...\",\"description\":\"...\"} como sean necesarios según lo evaluable en el documento\n"
    "Solo JSON válido, sin texto adicional."
)

SCAN_USER_TEMPLATE = """\
Documento:
---
{document_text}
---
JSON: {{"title":"...","brief":"...","defaultLanguage":"python","criteria":[{{"name":"...","description":"..."}}]}}"""

_MAX_TOKENS = 8192


@dataclass
class ScannedTest:
    title: str
    brief: str
    defaultLanguage: str
    criteria: list[dict]


def scan_test_document(document_text: str) -> ScannedTest:
    """Extrae título, enunciado, lenguaje y criterios de un documento de prueba técnica."""
    if not is_ai_configured():
        raise ValueError("El servicio de IA no está configurado.")

    # Sin truncado — se envía el documento completo
    user_prompt = SCAN_USER_TEMPLATE.format(document_text=document_text)

    raw = call_ai(SCAN_SYSTEM_PROMPT, user_prompt, max_tokens=_MAX_TOKENS)

    # Parser robusto: elimina markdown y usa raw_decode para el primer JSON válido
    text = re.sub(r"```(?:json)?\s*", "", raw).strip()
    decoder = json.JSONDecoder()
    data = None
    start = text.find("{")
    while start != -1:
        try:
            obj, _ = decoder.raw_decode(text, start)
            if isinstance(obj, dict):
                data = obj
                break
        except json.JSONDecodeError:
            pass
        start = text.find("{", start + 1)

    if data is None:
        raise ValueError("La IA no devolvió un JSON válido al escanear el documento.")

    criteria = [
        c for c in (data.get("criteria") or [])
        if isinstance(c, dict) and c.get("name", "").strip() and c.get("description", "").strip()
    ]

    if len(criteria) < MIN_RUBRIC_CRITERIA:
        raise ValueError(
            f"La IA extrajo solo {len(criteria)} criterio(s); se requieren al menos {MIN_RUBRIC_CRITERIA}. "
            "Intenta con un documento más detallado."
        )

    _VALID_LANGS = ("python", "javascript", "java", "typescript", "text", "excel", "business", "design", "other")
    lang = str(data.get("defaultLanguage", "text")).lower()
    if lang not in _VALID_LANGS:
        lang = "text"

    return ScannedTest(
        title=(str(data.get("title", "")).strip() or "Prueba técnica importada")[:80],
        brief=str(data.get("brief", "")).strip() or document_text[:2000],
        defaultLanguage=lang,
        criteria=criteria,
    )
