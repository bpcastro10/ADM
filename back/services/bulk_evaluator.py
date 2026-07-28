"""
Evaluación masiva de candidatos desde ZIPs separados.

Convención de nombres:
  - nombre-apellido-cv.ext       → CV del candidato
  - nombre-apellido-prueba.ext   → Entrega técnica del candidato
"""

from __future__ import annotations

import io
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from models.schemas import (
    EvaluationResult,
    ResumeEvaluationResult,
    RubricCriterion,
    SoughtCharacteristic,
)
from services.ai_evaluator import evaluate_code, evaluate_notebook, evaluate_written_test
from services.combined_analyzer import analyze_combined
from services.content_client import (
    ContentNotFoundError,
    build_job_description_text,
    get_job,
    get_rubric_for_technical_test,
    get_sought_characteristics,
    get_technical_test,
)
from services.notebook_reader import read_notebook_bytes
from services.resume_evaluator import evaluate_resume
from services.resume_reader import read_resume_bytes
from services.zip_project_reader import read_zip_project

_CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp", ".h", ".hpp",
    ".cs", ".go", ".rb", ".php", ".kt", ".swift", ".rs", ".scala", ".sql",
    ".html", ".css", ".sh", ".r", ".m",
}
_DOC_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".md"}

CV_SUFFIX = "-cv"
TEST_SUFFIX = "-prueba"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_filename(filename: str) -> Tuple[Optional[str], Optional[str]]:
    stem = Path(filename).stem
    stem_lower = stem.lower()
    if stem_lower.endswith(CV_SUFFIX):
        return stem[: -len(CV_SUFFIX)].lower(), "cv"
    if stem_lower.endswith(TEST_SUFFIX):
        return stem[: -len(TEST_SUFFIX)].lower(), "prueba"
    return None, None


def _display_name(candidate_key: str) -> str:
    return " ".join(p.capitalize() for p in candidate_key.replace("-", " ").split())


def _detect_eval_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".ipynb":
        return "notebook"
    if ext == ".zip":
        return "zip"
    if ext in _DOC_EXTENSIONS:
        return "written"
    return "code"


def _extract_zip_files(zip_bytes: bytes, expected_suffix: str) -> Tuple[Dict[str, Tuple[str, bytes]], List[str]]:
    """Extrae archivos del ZIP con el sufijo esperado. Retorna (dict candidatos, archivos_ignorados)."""
    try:
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    except zipfile.BadZipFile as exc:
        raise ValueError("El archivo no es un ZIP válido.") from exc

    files: Dict[str, Tuple[str, bytes]] = {}
    skipped: List[str] = []

    for entry in zf.infolist():
        if entry.is_dir():
            continue
        base = Path(entry.filename).name
        if base.startswith(".") or base.startswith("__"):
            continue
        candidate_key, file_type = _parse_filename(base)
        if candidate_key is None or file_type != expected_suffix:
            skipped.append(entry.filename)
            continue
        content = zf.read(entry.filename)
        files[candidate_key] = (base, content)

    return files, skipped


# ---------------------------------------------------------------------------
# Evaluación de CV individual (con captura de errores)
# ---------------------------------------------------------------------------

def _eval_single_cv(
    candidate_key: str,
    filename: str,
    content: bytes,
    job: dict,
    sought_characteristics: List[SoughtCharacteristic],
) -> dict:
    try:
        resume_text = read_resume_bytes(filename, content)
        if not resume_text or not resume_text.strip():
            return {"candidate_key": candidate_key, "display_name": _display_name(candidate_key),
                    "score": None, "error": "No se pudo extraer texto del archivo.", "result": None}
        job_description = build_job_description_text(job)
        data = evaluate_resume(job_description, resume_text, sought_characteristics)
        result = ResumeEvaluationResult(
            candidate_name=_display_name(candidate_key),
            job_id=job.get("id"),
            job_title=job.get("title"),
            match_score=data.get("match_score", 0),
            executive_summary=data.get("executive_summary", ""),
            strengths=data.get("strengths", []),
            gaps=data.get("gaps", []),
            recommendations=data.get("recommendations", []),
            overall_score_reason=data.get("overall_score_reason", ""),
            job_requirements_checklist=data.get("job_requirements_checklist", []),
            keyword_alignment=data.get("keyword_alignment", []),
            red_flags=data.get("red_flags", []),
            evaluated_at=datetime.now(),
            source_type="file",
            resume_filename=filename,
        )
        return {
            "candidate_key": candidate_key,
            "display_name": _display_name(candidate_key),
            "score": result.match_score,
            "error": None,
            "result": result.model_dump(),
        }
    except Exception as exc:
        return {
            "candidate_key": candidate_key,
            "display_name": _display_name(candidate_key),
            "score": None,
            "error": str(exc),
            "result": None,
        }


# ---------------------------------------------------------------------------
# Evaluación de prueba técnica individual (con captura de errores)
# ---------------------------------------------------------------------------

def _eval_single_test(
    candidate_key: str,
    filename: str,
    content: bytes,
    rubric_data: Optional[dict],
) -> dict:
    eval_type = _detect_eval_type(filename)
    try:
        if eval_type == "notebook":
            nb = read_notebook_bytes(content)
            ai = evaluate_notebook(nb.instructions, nb.solution_code, nb.cell_summary)
            result = EvaluationResult(
                candidate_name=_display_name(candidate_key),
                technical_test_id=None, technical_test_title=None,
                rubric_criteria=[RubricCriterion(name=ce.criterion_name, description="") for ce in ai.criteria_evaluations],
                criteria_evaluations=ai.criteria_evaluations,
                overall_score=ai.overall_score,
                executive_summary=ai.executive_summary,
                strengths=ai.strengths,
                areas_for_improvement=ai.areas_for_improvement,
                evaluated_at=datetime.now(), source_type="notebook",
            )
        elif eval_type == "zip":
            if not rubric_data:
                return {"candidate_key": candidate_key, "display_name": _display_name(candidate_key),
                        "score": None, "eval_type": "zip",
                        "error": "Para evaluar ZIPs se requiere seleccionar una prueba técnica.", "result": None}
            zip_res = read_zip_project(content)
            bundled = f"PROYECTO ZIP\nArchivos: {len(zip_res.included_files)}\n\n{zip_res.bundled_code}"
            test, rubric = rubric_data["test"], rubric_data["rubric"]
            ai = evaluate_code(rubric=rubric, code=bundled, language=test.get("defaultLanguage") or "text")
            result = _build_code_result(candidate_key, ai, rubric, test, "zip")
        elif eval_type == "code" and rubric_data:
            test, rubric = rubric_data["test"], rubric_data["rubric"]
            try:
                code_text = content.decode("utf-8")
            except UnicodeDecodeError:
                code_text = content.decode("latin-1", errors="replace")
            ai = evaluate_code(rubric=rubric, code=code_text, language=test.get("defaultLanguage") or "text")
            result = _build_code_result(candidate_key, ai, rubric, test, "single_file")
        else:
            # Código sin rubrica → evaluación escrita; o documento
            if eval_type in ("code",):
                try:
                    doc_text = content.decode("utf-8")
                except UnicodeDecodeError:
                    doc_text = content.decode("latin-1", errors="replace")
            else:
                doc_text = read_resume_bytes(filename, content)
                if not doc_text or not doc_text.strip():
                    return {"candidate_key": candidate_key, "display_name": _display_name(candidate_key),
                            "score": None, "eval_type": "written",
                            "error": "No se pudo extraer texto del documento.", "result": None}
            ai = evaluate_written_test(doc_text)
            result = EvaluationResult(
                candidate_name=_display_name(candidate_key),
                technical_test_id=None, technical_test_title=None,
                rubric_criteria=[RubricCriterion(name=ce.criterion_name, description="") for ce in ai.criteria_evaluations],
                criteria_evaluations=ai.criteria_evaluations,
                overall_score=ai.overall_score,
                executive_summary=ai.executive_summary,
                strengths=ai.strengths,
                areas_for_improvement=ai.areas_for_improvement,
                evaluated_at=datetime.now(), source_type="written",
            )
            eval_type = "written"

        return {
            "candidate_key": candidate_key,
            "display_name": _display_name(candidate_key),
            "score": result.overall_score,
            "eval_type": eval_type,
            "error": None,
            "result": result.model_dump(),
        }
    except Exception as exc:
        return {
            "candidate_key": candidate_key,
            "display_name": _display_name(candidate_key),
            "score": None,
            "eval_type": eval_type,
            "error": str(exc),
            "result": None,
        }


def _build_code_result(candidate_key, ai, rubric, test, source_type) -> EvaluationResult:
    return EvaluationResult(
        candidate_name=_display_name(candidate_key),
        technical_test_id=test.get("id"), technical_test_title=test.get("title"),
        rubric_criteria=rubric.criteria,
        criteria_evaluations=ai.criteria_evaluations,
        overall_score=ai.overall_score,
        executive_summary=ai.executive_summary,
        strengths=ai.strengths,
        areas_for_improvement=ai.areas_for_improvement,
        evaluated_at=datetime.now(), source_type=source_type,
    )


# ---------------------------------------------------------------------------
# Funciones públicas principales
# ---------------------------------------------------------------------------

def process_bulk_cv_zip(zip_bytes: bytes, job_id: int) -> dict:
    """Procesa un ZIP de CVs. Retorna lista de resultados por candidato."""
    try:
        job = get_job(job_id)
    except (ContentNotFoundError, ValueError) as exc:
        raise ValueError(f"No se pudo cargar el puesto (id={job_id}): {exc}") from exc

    sought = get_sought_characteristics(job_id)
    if not sought:
        raise ValueError(f"El puesto id={job_id} no tiene características buscadas definidas.")

    files, skipped = _extract_zip_files(zip_bytes, "cv")
    if not files:
        raise ValueError("No se encontraron archivos con el formato 'nombre-apellido-cv.ext' en el ZIP.")

    results = [_eval_single_cv(k, fname, data, job, sought) for k, (fname, data) in files.items()]
    return {"results": results, "skipped_files": skipped}


def process_bulk_test_zip(zip_bytes: bytes, technical_test_id: Optional[int]) -> dict:
    """Procesa un ZIP de entregas técnicas. Retorna lista de resultados por candidato."""
    rubric_data: Optional[dict] = None
    if technical_test_id:
        try:
            test = get_technical_test(technical_test_id)
            rubric = get_rubric_for_technical_test(technical_test_id)
            rubric_data = {"test": test, "rubric": rubric}
        except (ContentNotFoundError, ValueError) as exc:
            raise ValueError(f"No se pudo cargar la prueba técnica (id={technical_test_id}): {exc}") from exc

    files, skipped = _extract_zip_files(zip_bytes, "prueba")
    if not files:
        raise ValueError("No se encontraron archivos con el formato 'nombre-apellido-prueba.ext' en el ZIP.")

    results = [_eval_single_test(k, fname, data, rubric_data) for k, (fname, data) in files.items()]
    return {"results": results, "skipped_files": skipped}


def process_bulk_combined(cv_results: List[dict], test_results: List[dict]) -> dict:
    """
    Cruza resultados de CVs y pruebas técnicas por candidate_key.
    Ejecuta análisis de aptitud para cada par coincidente.
    """
    cv_map: Dict[str, dict] = {r["candidate_key"]: r for r in cv_results if r.get("candidate_key")}
    test_map: Dict[str, dict] = {r["candidate_key"]: r for r in test_results if r.get("candidate_key")}

    matched_keys = sorted(set(cv_map) & set(test_map))
    unmatched_cvs = [_display_name(k) for k in cv_map if k not in test_map]
    unmatched_tests = [_display_name(k) for k in test_map if k not in cv_map]

    combined_results = []
    for key in matched_keys:
        cv_entry = cv_map[key]
        test_entry = test_map[key]

        verdict = error = reasoning = red_flags = avg = None

        cv_result_dict = cv_entry.get("result")
        test_result_dict = test_entry.get("result")

        if cv_result_dict and test_result_dict:
            try:
                cv_model = ResumeEvaluationResult.model_validate(cv_result_dict)
                test_model = EvaluationResult.model_validate(test_result_dict)
                combined = analyze_combined(test_model, cv_model)
                verdict = combined.get("verdict")
                reasoning = combined.get("detailed_reasoning")
                red_flags = combined.get("red_flags_summary")
                avg = round(((cv_entry.get("score") or 0) + (test_entry.get("score") or 0)) / 2, 2)
            except Exception as exc:
                error = str(exc)
        else:
            error = "Falta resultado de CV o prueba técnica para este candidato."

        combined_results.append({
            "candidate_key": key,
            "display_name": _display_name(key),
            "cv_score": cv_entry.get("score"),
            "cv_error": cv_entry.get("error"),
            "test_score": test_entry.get("score"),
            "test_eval_type": test_entry.get("eval_type"),
            "test_error": test_entry.get("error"),
            "average": avg,
            "verdict": verdict,
            "reasoning": reasoning,
            "red_flags": red_flags,
            "error": error,
        })

    return {
        "results": combined_results,
        "unmatched_cvs": unmatched_cvs,
        "unmatched_tests": unmatched_tests,
        "total_matched": len(matched_keys),
    }
