"""Generador de reportes PDF."""
from io import BytesIO

from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from models.schemas import EvaluationResult
from services.rubric_scale import format_evaluation_score


def generate_evaluation_pdf(result: EvaluationResult) -> bytes:
    """
    Genera un PDF con el reporte de evaluación.
    Retorna los bytes del archivo PDF.
    """
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
        name="CustomTitle",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        name="CustomHeading",
        parent=styles["Heading2"],
        fontSize=14,
        spaceAfter=8,
        spaceBefore=12,
    )
    body_style = ParagraphStyle(
        name="Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        spaceAfter=2,
    )
    table_header_style = ParagraphStyle(
        name="TableHeader",
        parent=styles["Normal"],
        fontSize=9,
        leading=11,
        textColor=colors.whitesmoke,
        spaceAfter=0,
    )
    table_cell_style = ParagraphStyle(
        name="TableCell",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        spaceAfter=0,
        wordWrap="CJK",  # fuerza wrapping en palabras largas
    )
    def P(text: str, style: ParagraphStyle) -> Paragraph:
        # Paragraph interpreta HTML/XML, así que escapamos.
        return Paragraph(escape(text or ""), style)

    story = []

    # Título
    story.append(Paragraph("Reporte de Evaluación Técnica", title_style))
    story.append(Spacer(1, 0.5 * cm))

    # Información del candidato
    story.append(Paragraph("Información General", heading_style))
    info_data = [
        [P("Candidato / Identificador:", table_cell_style), P(result.candidate_name, table_cell_style)],
        [P("Fecha y hora de evaluación:", table_cell_style), P(result.evaluated_at.strftime("%d/%m/%Y %H:%M"), table_cell_style)],
    ]
    info_table = Table(info_data, colWidths=[5 * cm, 11 * cm])
    info_table.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    story.append(info_table)
    story.append(Spacer(1, 0.8 * cm))

    # Nota global
    story.append(Paragraph("Nota Global", heading_style))
    score_text = f"<b>{format_evaluation_score(result.overall_score)}/5</b>"
    story.append(Paragraph(score_text, body_style))
    story.append(Spacer(1, 0.8 * cm))

    # Rúbrica utilizada
    story.append(Paragraph("Rúbrica Utilizada", heading_style))
    rubric_data = [[P("#", table_header_style), P("Criterio", table_header_style), P("Descripción", table_header_style)]]
    for i, c in enumerate(result.rubric_criteria, 1):
        rubric_data.append([
            P(str(i), table_cell_style),
            P(c.name, table_cell_style),
            P(c.description, table_cell_style),
        ])
    rubric_table = Table(
        rubric_data,
        colWidths=[1.1 * cm, 4.2 * cm, doc.width - (1.1 * cm + 4.2 * cm)],
        repeatRows=1,
        hAlign="LEFT",
    )
    rubric_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#E7E6E6")]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    story.append(rubric_table)
    story.append(Spacer(1, 0.8 * cm))

    # Evaluación por criterio
    story.append(Paragraph("Evaluación por Criterio", heading_style))
    eval_data = [[P("Criterio", table_header_style), P("Nota", table_header_style), P("Comentarios", table_header_style)]]
    for ce in result.criteria_evaluations:
        eval_data.append([
            P(ce.criterion_name, table_cell_style),
            P(
                f"{format_evaluation_score(ce.score)}/5",
                table_cell_style,
            ),
            P(ce.comments, table_cell_style),
        ])
    # Anchos dinámicos para evitar desbordes y dar más espacio a comentarios
    eval_table = Table(
        eval_data,
        colWidths=[5.0 * cm, 1.6 * cm, doc.width - (5.0 * cm + 1.6 * cm)],
        repeatRows=1,
        hAlign="LEFT",
    )
    eval_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#E7E6E6")]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    story.append(eval_table)
    story.append(Spacer(1, 0.8 * cm))

    # Resumen ejecutivo
    story.append(Paragraph("Resumen Ejecutivo", heading_style))
    story.append(P(result.executive_summary, body_style))
    story.append(Spacer(1, 0.8 * cm))

    # Fortalezas
    story.append(Paragraph("Fortalezas", heading_style))
    for s in result.strengths:
        story.append(P(f"• {s}", body_style))
    story.append(Spacer(1, 0.8 * cm))

    # Áreas de mejora
    story.append(Paragraph("Áreas de Mejora", heading_style))
    for a in result.areas_for_improvement:
        story.append(P(f"• {a}", body_style))

    doc.build(story)
    return buffer.getvalue()
