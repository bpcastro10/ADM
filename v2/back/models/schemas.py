"""Esquemas Pydantic para la aplicación."""
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime


class RubricCriterion(BaseModel):
    """Criterio individual de la rúbrica."""
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=1000)


class RubricInput(BaseModel):
    """Rúbrica de evaluación."""
    criteria: List[RubricCriterion] = Field(
        ...,
        min_length=3,
        max_length=10,
        description="Entre 3 y 10 criterios de evaluación",
    )
    score_scale: Dict[str, str] = Field(
        default_factory=dict,
        description="Definición de calificaciones 0-5 para el prompt de la IA",
    )


class SoughtCharacteristic(BaseModel):
    """Característica o requisito buscado para el puesto (rúbrica de CV)."""
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=1000)


class EvaluationRequest(BaseModel):
    """Solicitud de evaluación."""
    candidate_name: str = Field(..., min_length=1, max_length=200)
    technical_test_id: int = Field(..., ge=1, description="ID de la prueba técnica en JSON Server")
    code: str = Field(..., min_length=1)
    language: Optional[str] = Field(None, max_length=50)


class CriterionEvaluation(BaseModel):
    """Evaluación de un criterio individual."""
    criterion_name: str
    score: float = Field(..., ge=0, le=5)
    comments: str


class AIEvaluationResponse(BaseModel):
    """Respuesta estructurada de la IA."""
    criteria_evaluations: List[CriterionEvaluation]
    overall_score: float = Field(..., ge=0, le=5)
    executive_summary: str
    strengths: List[str]
    areas_for_improvement: List[str]


class EvaluationResult(BaseModel):
    """Resultado completo de la evaluación."""
    candidate_name: str
    technical_test_id: Optional[int] = Field(default=None)
    technical_test_title: Optional[str] = Field(default=None)
    rubric_criteria: List[RubricCriterion]
    criteria_evaluations: List[CriterionEvaluation]
    overall_score: float
    executive_summary: str
    strengths: List[str]
    areas_for_improvement: List[str]
    evaluated_at: datetime
    # Opcional: cuando la evaluación proviene de un ZIP (proyecto multi-archivo)
    source_type: Optional[str] = Field(
        default=None,
        description="Origen evaluado. Ej: 'zip', 'single_file', 'written' o 'document'.",
    )
    project_tree: Optional[str] = Field(
        default=None,
        description="Árbol de carpetas/archivos del proyecto (si aplica).",
    )
    included_files: Optional[List[str]] = Field(
        default=None,
        description="Lista de archivos incluidos en el bundle enviado a la IA (si aplica).",
    )
    skipped_files: Optional[List[str]] = Field(
        default=None,
        description="Lista de archivos omitidos (por filtros o límites) (si aplica).",
    )


class ResumeEvaluationRequest(BaseModel):
    """Solicitud de evaluación de hoja de vida vs puesto definido en JSON Server."""

    candidate_name: str = Field(..., min_length=1, max_length=200)
    job_id: int = Field(..., ge=1, description="ID del puesto en JSON Server")
    resume_text: str = Field(..., min_length=1, max_length=200_000)


class ResumeEvaluationResult(BaseModel):
    """Resultado de evaluación de hoja de vida."""

    candidate_name: str
    job_id: Optional[int] = Field(default=None)
    job_title: Optional[str] = Field(default=None)
    match_score: float = Field(..., ge=1, le=5, description="Ajuste al rol: 1 bajo, 5 excelente (admite decimales)")
    executive_summary: str
    strengths: List[str]
    gaps: List[str]
    recommendations: List[str]
    overall_score_reason: str = Field(
        default="",
        description="Explicación del por qué de la nota general (match_score).",
    )
    job_requirements_checklist: List[dict] = Field(
        default_factory=list,
        description=(
            "Checklist de requisitos del puesto. "
            "Cada item debe incluir: requirement, status, evidence."
        ),
    )
    keyword_alignment: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    evaluated_at: datetime
    source_type: Optional[str] = Field(default=None, description="Origen del CV: 'file' o 'text'")
    resume_filename: Optional[str] = Field(default=None)


class CombinedAnalysisResult(BaseModel):
    """Resultado del análisis combinado CV + código (aptitud)."""

    applicable: bool = Field(
        default=True,
        description="Siempre True; el análisis unificado se ejecuta sin umbral mínimo.",
    )
    verdict: Optional[str] = Field(
        default=None,
        description="'apto' o 'no_apto'. None si applicable es False.",
    )
    detailed_reasoning: str = Field(..., description="Informe detallado del veredicto o motivo de omisión")
    red_flags_summary: Optional[str] = Field(
        default=None,
        description="Resumen de banderas rojas graves a tener en cuenta cuando el veredicto es apto.",
    )


class CombinedAnalyzeRequest(BaseModel):
    """Solicitud para análisis combinado de aptitud."""

    code_result: EvaluationResult
    resume_result: ResumeEvaluationResult


class UnifiedReportRequest(BaseModel):
    """Solicitud para generar un reporte unificado (código + CV)."""

    code_result: Optional[EvaluationResult] = None
    resume_result: Optional[ResumeEvaluationResult] = None
    combined_result: Optional[CombinedAnalysisResult] = Field(
        default=None,
        description="Análisis combinado (aptitud) si existe",
    )
