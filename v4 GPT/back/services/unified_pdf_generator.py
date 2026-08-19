"""Generador de PDF unificado (código + CV + análisis combinado)."""

from __future__ import annotations

from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from models.schemas import EvaluationResult, ResumeEvaluationResult, CombinedAnalysisResult
from services.pdf_generator import generate_evaluation_pdf
from services.resume_pdf_generator import generate_resume_pdf


def _generate_combined_pdf(combined: CombinedAnalysisResult) -> bytes:
    """Genera el PDF de la sección de análisis combinado (aptitud)."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="CombinedTitle",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        name="CombinedHeading",
        parent=styles["Heading2"],
        fontSize=14,
        spaceAfter=8,
        spaceBefore=12,
    )
    body_style = ParagraphStyle(
        name="CombinedBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        spaceAfter=8,
    )
    verdict_style = ParagraphStyle(
        name="Verdict",
        parent=styles["Heading2"],
        fontSize=16,
        textColor=colors.HexColor("#0D9488") if combined.verdict == "apto" else colors.HexColor("#DC2626"),
        spaceAfter=12,
    )

    def P(text: str, style: ParagraphStyle) -> Paragraph:
        return Paragraph(escape(text or ""), style)

    story = []
    story.append(Paragraph("Informe de Aptitud del Candidato", title_style))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("Veredicto", heading_style))
    verdict_text = "APTO" if combined.verdict == "apto" else "NO APTO"
    story.append(P(verdict_text, verdict_style))
    story.append(Paragraph("Informe Detallado", heading_style))
    for para in (combined.detailed_reasoning or "").split("\n\n"):
        if para.strip():
            story.append(P(para.strip(), body_style))

    if combined.red_flags_summary:
        story.append(Paragraph("Banderas rojas a tener en cuenta", heading_style))
        story.append(P(combined.red_flags_summary, body_style))

    doc.build(story)
    return buffer.getvalue()


def generate_unified_pdf(
    *,
    code_result: EvaluationResult | None,
    resume_result: ResumeEvaluationResult | None,
    combined_result: CombinedAnalysisResult | None = None,
) -> bytes:
    """
    Genera un PDF unificado:
    - Si solo hay código: devuelve el PDF de código.
    - Si solo hay CV: devuelve el PDF de CV.
    - Si hay ambos: fusiona ambos PDFs (páginas) en uno solo.
    - Si hay combined_result aplicable, lo incluye como primera sección cuando hay ambos.
    """
    if not code_result and not resume_result:
        raise ValueError("Debe proporcionar al menos code_result o resume_result.")

    if code_result and not resume_result:
        return generate_evaluation_pdf(code_result)
    if resume_result and not code_result:
        return generate_resume_pdf(resume_result)

    # Ambos presentes: merge con pypdf
    from pypdf import PdfReader, PdfWriter

    code_pdf = generate_evaluation_pdf(code_result)  # type: ignore[arg-type]
    resume_pdf = generate_resume_pdf(resume_result)  # type: ignore[arg-type]

    pdfs_to_merge = []
    if combined_result and combined_result.applicable and combined_result.verdict:
        pdfs_to_merge.append(_generate_combined_pdf(combined_result))
    pdfs_to_merge.extend([code_pdf, resume_pdf])

    writer = PdfWriter()
    for pdf_bytes in pdfs_to_merge:
        reader = PdfReader(BytesIO(pdf_bytes))
        for page in reader.pages:
            writer.add_page(page)

    out = BytesIO()
    writer.write(out)
    return out.getvalue()

