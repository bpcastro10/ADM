"""Escaneo de documentos para extraer la descripción de un puesto de trabajo."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import List

from services.ai_client import call_ai, is_ai_configured

_MIN_CHARACTERISTICS = 3

SCAN_SYSTEM_PROMPT = (
    "Extrae de un documento de oferta o descripción de puesto un JSON con:\n"
    "- title: título del puesto (≤80 chars)\n"
    "- description: descripción general del rol (1-3 párrafos)\n"
    "- soughtCharacteristics: 3-10 objetos {\"name\":\"...\",\"description\":\"...\"} con requisitos y habilidades buscadas\n"
    "Solo JSON válido, sin texto adicional."
)

SCAN_USER_TEMPLATE = """\
Documento:
---
{document_text}
---
JSON: {{"title":"...","description":"...","soughtCharacteristics":[{{"name":"...","description":"..."}}]}}"""

_MAX_TOKENS = 8192


@dataclass
class ScannedJob:
    title: str
    description: str
    soughtCharacteristics: List[dict] = field(default_factory=list)


def scan_job_document(document_text: str) -> ScannedJob:
    """Extrae título, descripción y características buscadas de un documento de puesto."""
    if not is_ai_configured():
        raise ValueError("El servicio de IA no está configurado.")

    user_prompt = SCAN_USER_TEMPLATE.format(document_text=document_text)

    raw = call_ai(SCAN_SYSTEM_PROMPT, user_prompt, max_tokens=_MAX_TOKENS)

    # Parser robusto: elimina markdown y usa raw_decode
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

    characteristics = [
        {"name": c["name"].strip(), "description": c["description"].strip()}
        for c in (data.get("soughtCharacteristics") or [])
        if isinstance(c, dict) and c.get("name", "").strip() and c.get("description", "").strip()
    ][:10]

    if len(characteristics) < _MIN_CHARACTERISTICS:
        raise ValueError(
            f"La IA extrajo solo {len(characteristics)} característica(s); "
            f"se requieren al menos {_MIN_CHARACTERISTICS}. "
            "Intenta con un documento más detallado."
        )

    return ScannedJob(
        title=(str(data.get("title", "")).strip() or "Puesto importado")[:80],
        description=str(data.get("description", "")).strip() or document_text[:1000],
        soughtCharacteristics=characteristics,
    )
