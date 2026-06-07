"""Cliente para obtener puestos, pruebas técnicas y rúbricas desde JSON Server."""

from __future__ import annotations

from typing import Any, List

import httpx

from config import JSON_SERVER_URL
from models.schemas import RubricCriterion, RubricInput, SoughtCharacteristic
from services.rubric_scale import parse_raw_score_scale, resolve_score_scale


class ContentNotFoundError(ValueError):
    """Recurso no encontrado en JSON Server."""


def _get(path: str) -> Any:
    url = f"{JSON_SERVER_URL.rstrip('/')}{path}"
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url)
    except httpx.RequestError as e:
        raise ValueError(
            f"No se pudo conectar con JSON Server ({JSON_SERVER_URL}). "
            f"Asegúrate de ejecutar: cd jsonserver && npm start. Detalle: {e}"
        ) from e

    if response.status_code == 404:
        raise ContentNotFoundError(f"Recurso no encontrado: {path}")
    if response.status_code >= 400:
        raise ValueError(f"JSON Server respondió con error {response.status_code}: {path}")
    return response.json()


def get_job(job_id: int) -> dict:
    data = _get(f"/jobs/{job_id}")
    if not data:
        raise ContentNotFoundError(f"No existe el puesto con id={job_id}")
    return data


def get_technical_test(technical_test_id: int) -> dict:
    data = _get(f"/technicalTests/{technical_test_id}")
    if not data:
        raise ContentNotFoundError(f"No existe la prueba técnica con id={technical_test_id}")
    return data


def get_rubric_for_technical_test(technical_test_id: int) -> RubricInput:
    test = get_technical_test(technical_test_id)
    rubric_data = test.get("rubric") or {}
    criteria_raw = rubric_data.get("criteria") or []
    if len(criteria_raw) < 3:
        raise ValueError(
            f"La prueba técnica {technical_test_id} no tiene una rúbrica válida (mínimo 3 criterios)."
        )
    criteria = [
        RubricCriterion(name=c["name"], description=c["description"])
        for c in criteria_raw
        if c.get("name") and c.get("description")
    ]
    raw_scale = parse_raw_score_scale(
        rubric_data.get("scoreScale") or rubric_data.get("score_scale")
    )
    score_scale = resolve_score_scale(
        raw_scale,
        default_language=test.get("defaultLanguage"),
        title=str(test.get("title") or ""),
        brief=str(test.get("brief") or ""),
    )
    return RubricInput(criteria=criteria, score_scale=score_scale)


def get_sought_characteristics(job_id: int) -> List[SoughtCharacteristic]:
    job = get_job(job_id)
    items = job.get("soughtCharacteristics") or []
    return [
        SoughtCharacteristic(name=i["name"], description=i["description"])
        for i in items
        if i.get("name") and i.get("description")
    ]


def build_job_description_text(job: dict) -> str:
    """Texto completo del puesto para contexto en la evaluación del CV."""
    parts = [f"Título: {job.get('title', 'Puesto')}", "", job.get("description", "").strip()]
    characteristics = job.get("soughtCharacteristics") or []
    if characteristics:
        parts.append("")
        parts.append("Características y requisitos buscados:")
        for i, c in enumerate(characteristics, 1):
            parts.append(f"{i}. {c.get('name', '')}: {c.get('description', '')}")
    return "\n".join(parts).strip()


def build_rubric_checklist_text(characteristics: List[SoughtCharacteristic]) -> str:
    lines = []
    for i, c in enumerate(characteristics, 1):
        lines.append(f"{i}. {c.name}: {c.description}")
    return "\n".join(lines)
