"""Lectura segura de proyectos comprimidos (ZIP) para evaluación."""

from __future__ import annotations

import os
import shutil
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class ZipProjectReadResult:
    """Resultado del procesamiento del ZIP."""

    project_tree: str
    bundled_code: str
    included_files: list[str]
    skipped_files: list[str]


DEFAULT_ALLOWED_EXTENSIONS = {
    ".py",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".java",
    ".kt",
    ".cs",
    ".go",
    ".rb",
    ".php",
    ".rs",
    ".cpp",
    ".c",
    ".h",
    ".hpp",
    ".swift",
    ".scala",
    ".sql",
    ".json",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".md",
    ".txt",
    ".env.example",
    "dockerfile",
    "makefile",
}


DEFAULT_IGNORE_DIRS = {
    "__pycache__",
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    "dist",
    "build",
    "target",
    ".venv",
    "venv",
    ".idea",
    ".vscode",
    ".pytest_cache",
}


DEFAULT_IGNORE_FILES = {
    ".ds_store",
    "package-lock.json",  # puede ser enorme y no aporta demasiado
}


def _is_path_within_directory(base_dir: Path, target: Path) -> bool:
    try:
        base_dir = base_dir.resolve()
        target = target.resolve()
        return str(target).startswith(str(base_dir))
    except Exception:
        return False


def _safe_extract_zip(zip_path: Path, extract_to: Path) -> None:
    """Extrae el ZIP evitando ZipSlip (paths maliciosos)."""
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.infolist():
            member_path = Path(member.filename)
            # ignorar entradas vacías
            if not member.filename or member.filename.endswith("/"):
                continue

            dest = extract_to / member_path
            if not _is_path_within_directory(extract_to, dest):
                raise ValueError("ZIP inválido: contiene rutas fuera del directorio (ZipSlip).")

        zf.extractall(extract_to)


def _should_include_file(path: Path) -> bool:
    name = path.name.lower()
    if name in DEFAULT_IGNORE_FILES:
        return False
    if name.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico")):
        return False
    if name.endswith((".pdf", ".mp4", ".mov", ".zip", ".7z", ".rar", ".exe", ".dll")):
        return False

    if name in {"dockerfile", "makefile"}:
        return True

    ext = path.suffix.lower()
    if ext in DEFAULT_ALLOWED_EXTENSIONS:
        return True

    return False


def _walk_project_files(root: Path) -> Iterable[Path]:
    for dirpath, dirnames, filenames in os.walk(root):
        # filtrar directorios ignorados (in-place para que os.walk no baje ahí)
        dirnames[:] = [d for d in dirnames if d not in DEFAULT_IGNORE_DIRS and not d.startswith(".")]
        for fname in filenames:
            p = Path(dirpath) / fname
            yield p


def _build_tree(root: Path, max_lines: int = 500) -> str:
    """Genera un árbol simple de carpetas/archivos."""
    lines: list[str] = []
    root = root.resolve()

    # recolectar paths relativos
    rel_paths: list[Path] = []
    for p in _walk_project_files(root):
        try:
            rel_paths.append(p.relative_to(root))
        except Exception:
            continue

    rel_paths.sort(key=lambda x: (len(x.parts), str(x).lower()))
    for rel in rel_paths:
        indent = "  " * (len(rel.parts) - 1)
        lines.append(f"{indent}- {rel.as_posix()}")
        if len(lines) >= max_lines:
            lines.append("... (árbol truncado)")
            break

    return "\n".join(lines) if lines else "(sin archivos detectados)"


def read_zip_project(
    zip_bytes: bytes,
    *,
    max_total_chars: int = 120_000,
    max_files: int = 80,
    max_file_chars: int = 12_000,
) -> ZipProjectReadResult:
    """
    Procesa un ZIP de proyecto:
    - Extrae de forma segura
    - Genera árbol de estructura
    - Empaqueta contenidos en un solo texto para el prompt
    """
    tmp_dir = Path(tempfile.mkdtemp(prefix="zip_proj_"))
    zip_path = tmp_dir / "upload.zip"
    zip_path.write_bytes(zip_bytes)

    extract_dir = tmp_dir / "extracted"
    extract_dir.mkdir(parents=True, exist_ok=True)

    try:
        _safe_extract_zip(zip_path, extract_dir)

        project_tree = _build_tree(extract_dir)

        included: list[str] = []
        skipped: list[str] = []

        chunks: list[str] = []
        total = 0

        for p in _walk_project_files(extract_dir):
            rel = p.relative_to(extract_dir).as_posix()
            if not _should_include_file(p):
                skipped.append(rel)
                continue

            if len(included) >= max_files:
                skipped.append(rel)
                continue

            try:
                raw = p.read_bytes()
                # intento utf-8; si falla, saltar (binary o encoding raro)
                text = raw.decode("utf-8")
            except Exception:
                skipped.append(rel)
                continue

            if len(text) > max_file_chars:
                text = text[:max_file_chars] + "\n... (archivo truncado)\n"

            header = f"\n\n===== FILE: {rel} =====\n"
            block = header + text

            if total + len(block) > max_total_chars:
                skipped.append(rel)
                continue

            chunks.append(block)
            total += len(block)
            included.append(rel)

        bundled_code = (
            "## ESTRUCTURA DEL PROYECTO (ÁRBOL)\n"
            f"{project_tree}\n\n"
            "## CONTENIDO DE ARCHIVOS (selección)\n"
            + "".join(chunks)
        )

        return ZipProjectReadResult(
            project_tree=project_tree,
            bundled_code=bundled_code,
            included_files=included,
            skipped_files=skipped,
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

