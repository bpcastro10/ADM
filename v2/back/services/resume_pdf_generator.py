"""Generador de reportes PDF para evaluación de CV."""

from __future__ import annotations

from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from models.schemas import ResumeEvaluationResult
from services.rubric_scale import format_evaluation_score


def generate_resume_pdf(result: ResumeEvaluationResult) -> bytes:
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
        name="CvTitle",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        name="CvHeading",
        parent=styles["Heading2"],
        fontSize=14,
        spaceAfter=8,
        spaceBefore=12,
    )
    body_style = ParagraphStyle(
        name="CvBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        spaceAfter=2,
    )
    small_muted_style = ParagraphStyle(
        name="CvMuted",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#5B6770"),
    )
    table_header_style = ParagraphStyle(
        name="CvTableHeader",
        parent=styles["Normal"],
        fontSize=9,
        leading=11,
        textColor=colors.whitesmoke,
        spaceAfter=0,
    )
    table_cell_style = ParagraphStyle(
        name="CvTableCell",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        spaceAfter=0,
        wordWrap="CJK",
    )

    def P(text: str, style: ParagraphStyle) -> Paragraph:
        return Paragraph(escape(text or ""), style)

    story = []

    story.append(Paragraph("Reporte de Evaluación de Hoja de Vida (CV)", title_style))
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("Información General", heading_style))
    info_rows = [
        [P("Candidato / Identificador:", table_cell_style), P(result.candidate_name, table_cell_style)],
        [P("Fecha y hora de evaluación:", table_cell_style), P(result.evaluated_at.strftime("%d/%m/%Y %H:%M"), table_cell_style)],
        [P("Origen:", table_cell_style), P(result.source_type or "N/A", table_cell_style)],
    ]
    if result.resume_filename:
        info_rows.append([P("Archivo CV:", table_cell_style), P(result.resume_filename, table_cell_style)])
    info_table = Table(info_rows, colWidths=[5 * cm, doc.width - 5 * cm], hAlign="LEFT")
    info_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(info_table)
    story.append(Spacer(1, 0.8 * cm))

    story.append(Paragraph("Match Score", heading_style))
    match_score = result.match_score
    score_fmt = format_evaluation_score(match_score)
    score_text = f"<b>{score_fmt}/5</b>"
    if match_score <= 2:
        score_text += " - Bajo"
    elif match_score < 3.5:
        score_text += " - Medio"
    elif match_score < 4.5:
        score_text += " - Alto"
    else:
        score_text += " - Excelente"
    story.append(Paragraph(score_text, body_style))
    story.append(Spacer(1, 0.6 * cm))

    if result.overall_score_reason:
        story.append(Paragraph("Por qué de la nota general", heading_style))
        story.append(P(result.overall_score_reason, body_style))
        story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph("Resumen Ejecutivo", heading_style))
    story.append(P(result.executive_summary, body_style))

    if result.job_requirements_checklist:
        story.append(Paragraph("Checklist de requisitos del puesto", heading_style))
        checklist_rows = [[
            P("Requisito / Cualidad", table_header_style),
            P("Estado", table_header_style),
            P("Evidencia", table_header_style),
        ]]
        for item in result.job_requirements_checklist:
            requirement = str(item.get("requirement", ""))
            status = str(item.get("status", ""))
            evidence = str(item.get("evidence", ""))
            checklist_rows.append([
                P(requirement, table_cell_style),
                P(status, table_cell_style),
                P(evidence, table_cell_style),
            ])

        checklist_table = Table(
            checklist_rows,
            colWidths=[5.5 * cm, 2.8 * cm, doc.width - (5.5 * cm + 2.8 * cm)],
            repeatRows=1,
            hAlign="LEFT",
        )
        checklist_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#E7E6E6")]),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        story.append(checklist_table)

    def bullet_list(title: str, items: list[str]) -> None:
        story.append(Paragraph(title, heading_style))
        if not items:
            story.append(P("Sin datos.", small_muted_style))
            return
        for it in items:
            story.append(P(f"• {it}", body_style))

    bullet_list("Fortalezas", result.strengths)
    bullet_list("Brechas (Gaps)", result.gaps)
    bullet_list("Recomendaciones", result.recommendations)

    if result.keyword_alignment:
        story.append(Paragraph("Palabras clave alineadas", heading_style))
        story.append(P(", ".join(result.keyword_alignment), body_style))

    if result.red_flags:
        story.append(Paragraph("Banderas rojas", heading_style))
        for rf in result.red_flags:
            story.append(P(f"• {rf}", body_style))

    doc.build(story)
    return buffer.getvalue()

