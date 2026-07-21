"""Aplicación FastAPI para evaluación de pruebas técnicas con IA."""
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from config import ANTHROPIC_API_KEY
from models.schemas import (
    EvaluationRequest,
    EvaluationResult,
    RubricCriterion,
    CriterionEvaluation,
    ResumeEvaluationRequest,
    ResumeEvaluationResult,
    UnifiedReportRequest,
    CombinedAnalysisResult,
    CombinedAnalyzeRequest,
)
from services.ai_evaluator import evaluate_code, evaluate_written_test, evaluate_notebook
from services.notebook_reader import read_notebook_bytes
from services.test_scanner import scan_test_document
from services.job_scanner import scan_job_document
from services.bulk_evaluator import process_bulk_cv_zip, process_bulk_test_zip, process_bulk_combined
from services.content_client import (
    get_job,
    get_technical_test,
    get_rubric_for_technical_test,
    get_sought_characteristics,
    build_job_description_text,
    ContentNotFoundError,
)
from services.pdf_generator import generate_evaluation_pdf
from services.zip_project_reader import read_zip_project
from services.resume_reader import read_resume_bytes
from services.resume_evaluator import evaluate_resume
from services.resume_pdf_generator import generate_resume_pdf
from services.unified_pdf_generator import generate_unified_pdf
from services.combined_analyzer import analyze_combined
from services.rubric_scale import suggest_score_scale

app = FastAPI(
    title="Evaluador de Pruebas Técnicas con IA",
    description="API para evaluar código de candidatos usando Claude según rúbricas personalizadas.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Verificación de salud del servicio."""
    return {"status": "ok", "api_configured": bool(ANTHROPIC_API_KEY)}


@app.get("/api/rubric/score-scale-template")
def score_scale_template(
    defaultLanguage: str = "python",
    title: str = "",
    brief: str = "",
):
    """Plantilla de escala 0-5 según lenguaje y enunciado (misma lógica que al evaluar)."""
    return suggest_score_scale(
        default_language=defaultLanguage,
        title=title,
        brief=brief,
    )


def _load_technical_test_context(technical_test_id: int):
    try:
        test = get_technical_test(technical_test_id)
        rubric = get_rubric_for_technical_test(technical_test_id)
    except ContentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return test, rubric


@app.post("/api/evaluate", response_model=EvaluationResult)
async def evaluate(request: EvaluationRequest):
    """
    Evalúa el código del candidato según la rúbrica de JSON Server.
    La IA solo revisa y asigna calificaciones; la rúbrica no viene del cliente.
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="El servicio de IA no está configurado. Configure ANTHROPIC_API_KEY.",
        )

    test, rubric = _load_technical_test_context(request.technical_test_id)
    lang = request.language or test.get("defaultLanguage") or "text"

    try:
        ai_response = evaluate_code(
            rubric=rubric,
            code=request.code,
            language=lang,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error al comunicarse con la IA: {str(e)}",
        )

    result = EvaluationResult(
        candidate_name=request.candidate_name,
        technical_test_id=request.technical_test_id,
        technical_test_title=test.get("title"),
        rubric_criteria=rubric.criteria,
        criteria_evaluations=ai_response.criteria_evaluations,
        overall_score=ai_response.overall_score,
        executive_summary=ai_response.executive_summary,
        strengths=ai_response.strengths,
        areas_for_improvement=ai_response.areas_for_improvement,
        evaluated_at=datetime.now(),
        source_type="single_file",
    )

    return result


@app.post("/api/evaluate/upload")
async def evaluate_with_file_upload(
    candidate_name: str = Form(...),
    technical_test_id: int = Form(...),
    language: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    code_text: Optional[str] = Form(None),
):
    """
    Evalúa la entrega del candidato cargada desde archivo o texto pegado.
    - Código fuente / texto plano (.py, .js, .java, .txt, etc.)
    - Proyectos multi-archivo (.zip)
    - Documentos de texto enriquecido (.pdf, .docx, .doc) para roles no técnicos
    """
    if not file and not code_text:
        raise HTTPException(
            status_code=400,
            detail="Debe proporcionar un archivo o texto de entrega.",
        )

    _DOC_EXTENSIONS = (".pdf", ".docx", ".doc")
    zip_meta = None
    source_type_override = None

    if file:
        content = await file.read()
        filename = (file.filename or "").lower()

        if filename.endswith(".zip"):
            try:
                zip_result = read_zip_project(content)
                zip_meta = zip_result
                code = (
                    "PROYECTO ZIP CARGADO\n"
                    + f"Archivos incluidos: {len(zip_result.included_files)}\n"
                    + (f"Archivos omitidos: {len(zip_result.skipped_files)}\n\n" if zip_result.skipped_files else "\n")
                    + zip_result.bundled_code
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="No se pudo procesar el ZIP. Verifica que sea un ZIP válido con archivos de texto.",
                )

        elif any(filename.endswith(ext) for ext in _DOC_EXTENSIONS):
            # Documento enriquecido (PDF, DOCX) — roles no técnicos
            try:
                code = read_resume_bytes(file.filename or "", content)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            if not code or not code.strip():
                raise HTTPException(status_code=400, detail="No se pudo extraer texto del documento.")
            source_type_override = "document"

        else:
            try:
                code = content.decode("utf-8")
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "El archivo no es texto plano (UTF-8). "
                        "Para entregar PDFs o documentos Word, selecciona un archivo .pdf o .docx."
                    ),
                )
    else:
        code = code_text

    if not code or not code.strip():
        raise HTTPException(status_code=400, detail="La entrega está vacía.")

    request = EvaluationRequest(
        candidate_name=candidate_name,
        technical_test_id=technical_test_id,
        code=code.strip(),
        language=language,
    )
    result = await evaluate(request)

    if zip_meta is not None:
        result.source_type = "zip"
        result.project_tree = zip_meta.project_tree
        result.included_files = zip_meta.included_files
        result.skipped_files = zip_meta.skipped_files
    elif source_type_override:
        result.source_type = source_type_override
        result.included_files = [file.filename] if file and file.filename else None

    return result


@app.post("/api/evaluate/written", response_model=EvaluationResult)
async def evaluate_written_upload(
    candidate_name: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Evalúa un documento escrito (cuestionario, prueba teórica, PDF/DOCX/TXT).
    La IA deriva los criterios del contenido del documento; no requiere prueba técnica del JSON Server.
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="El servicio de IA no está configurado. Configure ANTHROPIC_API_KEY.",
        )

    filename = (file.filename or "").lower()
    allowed = (".pdf", ".docx", ".txt", ".doc")
    if not any(filename.endswith(ext) for ext in allowed):
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Use PDF, DOCX, DOC o TXT.",
        )

    content = await file.read()
    try:
        document_text = read_resume_bytes(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not document_text or not document_text.strip():
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del documento (está vacío).")

    try:
        ai_response = evaluate_written_test(document_text=document_text.strip())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error al comunicarse con la IA: {str(e)}",
        )

    rubric_criteria = [
        RubricCriterion(
            name=ce.criterion_name,
            description=(ce.comments or "Criterio derivado del documento evaluado.")[:1000],
        )
        for ce in ai_response.criteria_evaluations
    ]

    return EvaluationResult(
        candidate_name=candidate_name,
        technical_test_id=None,
        technical_test_title="Evaluación escrita",
        rubric_criteria=rubric_criteria,
        criteria_evaluations=ai_response.criteria_evaluations,
        overall_score=ai_response.overall_score,
        executive_summary=ai_response.executive_summary,
        strengths=ai_response.strengths,
        areas_for_improvement=ai_response.areas_for_improvement,
        evaluated_at=datetime.now(),
        source_type="written",
        included_files=[file.filename] if file.filename else None,
    )


@app.post("/api/evaluate/notebook", response_model=EvaluationResult)
async def evaluate_notebook_upload(
    candidate_name: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Evalúa un notebook Jupyter / Google Colab (.ipynb).
    Las instrucciones se extraen de las celdas markdown y la solución de las celdas de código.
    La IA genera los criterios a partir de las instrucciones del propio notebook.
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="El servicio de IA no está configurado. Configure ANTHROPIC_API_KEY.",
        )

    filename = (file.filename or "").lower()
    if not filename.endswith(".ipynb"):
        raise HTTPException(
            status_code=400,
            detail="Solo se aceptan archivos .ipynb (Jupyter / Google Colab).",
        )

    content = await file.read()
    try:
        nb_content = read_notebook_bytes(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        ai_response = evaluate_notebook(
            instructions=nb_content.instructions,
            solution_code=nb_content.solution_code,
            cell_summary=nb_content.cell_summary,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error al comunicarse con la IA: {str(e)}",
        )

    rubric_criteria = [
        RubricCriterion(
            name=ce.criterion_name,
            description=(ce.comments or "Criterio derivado de las instrucciones del notebook.")[:1000],
        )
        for ce in ai_response.criteria_evaluations
    ]

    return EvaluationResult(
        candidate_name=candidate_name,
        technical_test_id=None,
        technical_test_title="Notebook Jupyter/Colab",
        rubric_criteria=rubric_criteria,
        criteria_evaluations=ai_response.criteria_evaluations,
        overall_score=ai_response.overall_score,
        executive_summary=ai_response.executive_summary,
        strengths=ai_response.strengths,
        areas_for_improvement=ai_response.areas_for_improvement,
        evaluated_at=datetime.now(),
        source_type="notebook",
        included_files=[file.filename] if file.filename else None,
    )


@app.post("/api/admin/scan-test-file")
async def scan_test_file(
    file: UploadFile = File(...),
):
    """
    Escanea un documento de prueba técnica (PDF/DOCX/TXT) usando IA y devuelve
    la estructura extraída: título, enunciado, lenguaje y criterios de evaluación.
    Útil para pre-rellenar el formulario de creación/edición en el panel de administración.
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="El servicio de IA no está configurado. Configure ANTHROPIC_API_KEY.",
        )

    filename = (file.filename or "").lower()
    allowed = (".pdf", ".docx", ".doc", ".txt")
    if not any(filename.endswith(ext) for ext in allowed):
        raise HTTPException(
            status_code=400,
            detail="Formato no soportado. Use PDF, DOCX, DOC o TXT.",
        )

    content = await file.read()
    try:
        document_text = read_resume_bytes(file.filename or "", content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not document_text or not document_text.strip():
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del documento.")

    try:
        scanned = scan_test_document(document_text.strip())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error al analizar el documento con IA: {str(e)}",
        )

    return {
        "title": scanned.title,
        "brief": scanned.brief,
        "defaultLanguage": scanned.defaultLanguage,
        "criteria": scanned.criteria,
    }


@app.post("/api/evaluate/pdf")
async def evaluate_and_download_pdf(request: EvaluationRequest):
    """
    Evalúa el código y devuelve directamente el PDF para descarga.
    """
    result = await evaluate(request)
    pdf_bytes = generate_evaluation_pdf(result)

    filename = f"evaluacion_{request.candidate_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/generate-pdf")
async def generate_pdf_from_result(result: EvaluationResult):
    """
    Genera el PDF a partir de un resultado de evaluación ya existente.
    Útil para descargar el reporte sin volver a llamar a la IA.
    """
    pdf_bytes = generate_evaluation_pdf(result)
    filename = f"evaluacion_{result.candidate_name.replace(' ', '_')}_{result.evaluated_at.strftime('%Y%m%d_%H%M')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/resume/evaluate", response_model=ResumeEvaluationResult)
async def resume_evaluate(request: ResumeEvaluationRequest):
    """Evalúa una hoja de vida contra una descripción de empleo."""
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="El servicio de IA no está configurado. Configure ANTHROPIC_API_KEY.",
        )

    try:
        job = get_job(request.job_id)
        characteristics = get_sought_characteristics(request.job_id)
        job_text = build_job_description_text(job)
        parsed = evaluate_resume(
            job_description=job_text,
            resume_text=request.resume_text,
            sought_characteristics=characteristics,
        )
    except ContentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al comunicarse con la IA: {str(e)}")

    return ResumeEvaluationResult(
        candidate_name=request.candidate_name,
        job_id=request.job_id,
        job_title=job.get("title"),
        evaluated_at=datetime.now(),
        source_type="text",
        resume_filename=None,
        **parsed,
    )


@app.post("/api/resume/evaluate/upload", response_model=ResumeEvaluationResult)
async def resume_evaluate_upload(
    candidate_name: str = Form(...),
    job_id: int = Form(...),
    file: Optional[UploadFile] = File(None),
    resume_text: Optional[str] = Form(None),
):
    """
    Evalúa CV subido (PDF/DOCX/TXT) o texto pegado.
    - Si se adjunta `file`, se prioriza su contenido.
    - Si no se adjunta file (frontend puede mandar solo texto), usa `resume_text`.
    """
    if not file and not resume_text:
        raise HTTPException(status_code=400, detail="Debe proporcionar un archivo o el texto del CV.")

    extracted_text = ""
    resume_filename = None

    if file:
        resume_filename = file.filename
        content = await file.read()
        try:
            extracted_text = read_resume_bytes(file.filename or "", content)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    if (not extracted_text) and resume_text:
        extracted_text = resume_text

    if not extracted_text or not extracted_text.strip():
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del CV (está vacío).")

    req = ResumeEvaluationRequest(
        candidate_name=candidate_name,
        job_id=job_id,
        resume_text=extracted_text,
    )

    result = await resume_evaluate(req)
    result.source_type = "file" if file else "text"
    result.resume_filename = resume_filename
    return result


@app.post("/api/resume/generate-pdf")
async def resume_generate_pdf(result: ResumeEvaluationResult):
    """Genera PDF a partir del resultado de evaluación de CV."""
    pdf_bytes = generate_resume_pdf(result)
    filename = f"cv_{result.candidate_name.replace(' ', '_')}_{result.evaluated_at.strftime('%Y%m%d_%H%M')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/combined/analyze", response_model=CombinedAnalysisResult)
async def combined_analyze(request: CombinedAnalyzeRequest):
    """
    Analiza los resultados de CV y código para emitir un veredicto de aptitud.
    Retorna apto/no_apto con razonamiento detallado.
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="El servicio de IA no está configurado. Configure ANTHROPIC_API_KEY.",
        )
    try:
        parsed = analyze_combined(
            code_result=request.code_result,
            resume_result=request.resume_result,
        )
        return CombinedAnalysisResult(**parsed)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error al analizar: {str(e)}",
        )


@app.post("/api/admin/scan-job-file")
async def scan_job_file(file: UploadFile = File(...)):
    """
    Escanea un documento (PDF, DOCX, TXT) con la descripción de un puesto
    y extrae título, descripción y características buscadas usando IA.
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="El servicio de IA no está configurado. Configure ANTHROPIC_API_KEY.",
        )
    content = await file.read()
    filename = file.filename or ""
    try:
        document_text = read_resume_bytes(filename, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not document_text or not document_text.strip():
        raise HTTPException(status_code=400, detail="No se pudo extraer texto del documento.")
    try:
        scanned = scan_job_document(document_text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al analizar el documento con IA: {str(e)}")
    return {
        "title": scanned.title,
        "description": scanned.description,
        "soughtCharacteristics": scanned.soughtCharacteristics,
    }


@app.post("/api/evaluate/bulk-cv")
async def evaluate_bulk_cv(
    zip_file: UploadFile = File(...),
    job_id: int = Form(...),
):
    """
    Evaluación masiva de CVs desde un ZIP.
    Los archivos deben llamarse nombre-apellido-cv.ext
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY no configurada.")
    content = await zip_file.read()
    try:
        return process_bulk_cv_zip(zip_bytes=content, job_id=job_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error en la evaluación masiva de CVs: {str(e)}")


@app.post("/api/evaluate/bulk-test")
async def evaluate_bulk_test(
    zip_file: UploadFile = File(...),
    technical_test_id: Optional[int] = Form(None),
):
    """
    Evaluación masiva de entregas técnicas desde un ZIP.
    Los archivos deben llamarse nombre-apellido-prueba.ext
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY no configurada.")
    content = await zip_file.read()
    try:
        return process_bulk_test_zip(zip_bytes=content, technical_test_id=technical_test_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error en la evaluación masiva de pruebas: {str(e)}")


@app.post("/api/analyze/bulk-combined")
async def analyze_bulk_combined(body: dict):
    """
    Cruza resultados de CVs y pruebas técnicas por nombre de candidato
    y ejecuta el análisis de aptitud para cada par coincidente.
    Body: { "cv_results": [...], "test_results": [...] }
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY no configurada.")
    cv_results = body.get("cv_results") or []
    test_results = body.get("test_results") or []
    if not cv_results and not test_results:
        raise HTTPException(status_code=400, detail="Se requieren cv_results y/o test_results.")
    try:
        return process_bulk_combined(cv_results=cv_results, test_results=test_results)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error en el análisis masivo de aptitud: {str(e)}")


@app.post("/api/report/generate-pdf")
async def report_generate_pdf(request: UnifiedReportRequest):
    """Genera un PDF unificado (código + CV) si se proporcionan resultados."""
    try:
        pdf_bytes = generate_unified_pdf(
            code_result=request.code_result,
            resume_result=request.resume_result,
            combined_result=request.combined_result,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    candidate = None
    if request.code_result:
        candidate = request.code_result.candidate_name
    if request.resume_result:
        candidate = candidate or request.resume_result.candidate_name
    candidate = candidate or "reporte"
    filename = f"reporte_unificado_{candidate.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
