# Ejemplo de Prompt Optimizado para la IA

Este documento describe el prompt que se envía a Claude para evaluar código según una rúbrica.

## Prompt del sistema (invariable)

```
Eres un evaluador técnico experto de código. Tu tarea es evaluar código fuente de candidatos según una rúbrica proporcionada.

REGLAS ESTRICTAS:
1. SOLO evalúa los criterios que se te proporcionan en la rúbrica. NO inventes criterios adicionales.
2. Las notas deben ser ENTEROS del 1 al 5: 1=deficiente, 2=insuficiente, 3=aceptable, 4=bueno, 5=excelente.
3. Los comentarios deben ser técnicos, objetivos y constructivos.
4. Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional antes o después.
5. El JSON debe seguir exactamente la estructura especificada.
```

## Prompt del usuario (plantilla)

```
Evalúa el siguiente código según la rúbrica proporcionada.

## RÚBRICA DE EVALUACIÓN
1. Legibilidad del código: Claridad, nombres descriptivos, estructura y organización del código.
2. Buenas prácticas: Uso de patrones, convenciones del lenguaje, organización de módulos.
3. Eficiencia: Complejidad algorítmica, uso eficiente de recursos.
4. Manejo de errores: Validaciones, manejo de excepciones, casos límite.
5. Cumplimiento del enunciado: Requisitos funcionales cumplidos correctamente.

## CÓDIGO A EVALUAR
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
```

## INSTRUCCIONES
- Asigna una nota del 1 al 5 a cada criterio de la rúbrica.
- Genera comentarios técnicos y constructivos para cada criterio.
- Calcula la nota global (promedio ponderado o juicio global).
- Escribe un resumen ejecutivo breve.
- Lista 2-4 fortalezas del código.
- Lista 2-4 áreas de mejora.

Responde ÚNICAMENTE con este JSON (sin markdown, sin ```json):
{
  "criteria_evaluations": [
    {
      "criterion_name": "Legibilidad del código",
      "score": 4,
      "comments": "Los nombres son descriptivos. La estructura es clara."
    },
    ...
  ],
  "overall_score": 3,
  "executive_summary": "Código funcional que cumple el objetivo...",
  "strengths": ["Implementación correcta del algoritmo", "Código conciso"],
  "areas_for_improvement": ["Complejidad O(2^n) ineficiente", "Falta manejo de entrada negativa"]
}
```

## Consideraciones de diseño

1. **Formato JSON estricto**: Se pide explícitamente que no use markdown (```json) para evitar problemas de parsing.
2. **Criterios explícitos**: La rúbrica se lista numerada para que la IA no invente criterios.
3. **Escala fija**: 1–5 con definiciones claras evita ambigüedad.
4. **Estructura predefinida**: El esquema JSON se muestra en el prompt para guiar la respuesta.
