"""Lectura y extracción de contenido de notebooks Jupyter / Google Colab (.ipynb)."""

from __future__ import annotations

import json
from dataclasses import dataclass


@dataclass
class NotebookContent:
    instructions: str
    """Celdas markdown concatenadas — enunciado / instrucciones del reto."""
    solution_code: str
    """Celdas de código concatenadas — solución del candidato."""
    combined_text: str
    """Texto completo legible (markdown + código) para evaluación global."""
    cell_summary: str
    """Resumen breve de la estructura del notebook (cuenta de celdas)."""


def read_notebook_bytes(filename: str, content: bytes) -> NotebookContent:
    """
    Parsea un archivo .ipynb (Jupyter o Colab) y extrae instrucciones y solución.
    Lanza ValueError si el formato no es válido.
    """
    try:
        nb = json.loads(content.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(
            "El archivo no es un notebook .ipynb válido (JSON con encoding UTF-8)."
        ) from exc

    cells = nb.get("cells")
    if not isinstance(cells, list):
        raise ValueError(
            "El archivo no contiene celdas válidas. "
            "Asegúrate de exportar el notebook en formato .ipynb."
        )

    markdown_parts: list[str] = []
    code_parts: list[str] = []
    combined_parts: list[str] = []

    md_count = 0
    code_count = 0

    for cell in cells:
        cell_type = cell.get("cell_type", "")
        source = cell.get("source", [])
        if isinstance(source, list):
            text = "".join(source)
        else:
            text = str(source)
        text = text.strip()
        if not text:
            continue

        if cell_type == "markdown":
            md_count += 1
            markdown_parts.append(text)
            combined_parts.append(f"[INSTRUCCIÓN/MARKDOWN]\n{text}")
        elif cell_type == "code":
            code_count += 1
            code_parts.append(text)
            combined_parts.append(f"[CELDA DE CÓDIGO #{code_count}]\n{text}")
        elif cell_type == "raw":
            combined_parts.append(f"[CELDA RAW]\n{text}")

    instructions = "\n\n".join(markdown_parts) if markdown_parts else "(sin instrucciones en celdas markdown)"
    solution_code = "\n\n# --- siguiente celda ---\n\n".join(code_parts) if code_parts else "(sin celdas de código)"
    combined_text = "\n\n".join(combined_parts)
    cell_summary = (
        f"Notebook con {md_count} celda(s) markdown (instrucciones) "
        f"y {code_count} celda(s) de código (solución)."
    )

    return NotebookContent(
        instructions=instructions,
        solution_code=solution_code,
        combined_text=combined_text,
        cell_summary=cell_summary,
    )
