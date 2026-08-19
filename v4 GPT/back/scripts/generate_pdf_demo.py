import os
import sys
from datetime import datetime

BACK_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACK_DIR not in sys.path:
    sys.path.insert(0, BACK_DIR)

from models.schemas import EvaluationResult, RubricCriterion, CriterionEvaluation  # noqa: E402
from services.pdf_generator import generate_evaluation_pdf  # noqa: E402


def main() -> None:
    result = EvaluationResult(
        candidate_name="Candidato Demo",
        evaluated_at=datetime.now(),
        overall_score=4,
        rubric_criteria=[
            RubricCriterion(name="Legibilidad del código", description="Claridad, nombres descriptivos y estructura."),
            RubricCriterion(name="Buenas prácticas", description="Convenciones, separación de responsabilidades, estilo."),
            RubricCriterion(name="Eficiencia", description="Complejidad temporal/espacial y elección de algoritmos."),
        ],
        criteria_evaluations=[
            CriterionEvaluation(
                criterion_name="Legibilidad del código",
                score=4,
                comments=(
                    "Código bastante legible con estructura clara. Sin embargo, en algunos puntos los nombres de variables "
                    "podrían ser más descriptivos y falta documentación (docstring) para explicar decisiones no obvias. "
                    "Recomendación: añadir ejemplos de uso y mejorar consistencia en el formateo."
                ),
            ),
            CriterionEvaluation(
                criterion_name="Buenas prácticas",
                score=3,
                comments=(
                    "Se observan buenas bases, pero hay oportunidades: dividir funciones grandes, evitar duplicación y "
                    "agregar pruebas unitarias. Considerar validar entradas y utilizar tipado cuando aplique."
                ),
            ),
            CriterionEvaluation(
                criterion_name="Eficiencia",
                score=5,
                comments=(
                    "Excelente: complejidad adecuada y uso eficiente de memoria. La solución escala bien para tamaños de entrada "
                    "moderados y evita operaciones costosas innecesarias."
                ),
            ),
        ],
        executive_summary=(
            "Buen desempeño general. La solución es correcta y eficiente, con mejoras posibles en documentación y organización."
        ),
        strengths=[
            "Solución eficiente y clara",
            "Manejo razonable de casos base",
        ],
        areas_for_improvement=[
            "Agregar docstrings y ejemplos",
            "Mejorar nombres de variables",
        ],
    )

    pdf_bytes = generate_evaluation_pdf(result)
    out_path = "pdf_demo.pdf"
    with open(out_path, "wb") as f:
        f.write(pdf_bytes)
    print(f"OK: {out_path} generado")


if __name__ == "__main__":
    main()

