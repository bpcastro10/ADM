/**
 * Plantillas de escala 0-5.
 * Alineadas con back/services/rubric_scale.py y jsonserver/db.json.
 * Aplican a cualquier tipo de puesto: técnico, analítico, creativo, etc.
 */

// Escala genérica — se usa cuando no hay plantilla específica
export const FALLBACK_SCORE_SCALE = {
  0: 'No cumple o sin evidencia de lo requerido.',
  1: 'Deficiente: incumple lo esperado en el criterio.',
  2: 'Insuficiente: cumple mínimos con fallas importantes.',
  3: 'Aceptable: esencial cubierto, mejoras pendientes.',
  4: 'Bueno: cumplimiento sólido con detalles menores.',
  5: 'Excelente: supera lo requerido en el criterio.',
}

export const SCORE_SCALE_TEMPLATES = {
  // --- Lenguajes de programación ---
  python: {
    0: 'Sin entrega evaluable o sin relación con el enunciado.',
    1: 'Deficiente: no cumple lo mínimo del criterio.',
    2: 'Insuficiente: cumple parcialmente con errores graves.',
    3: 'Aceptable: cumple lo esencial con mejoras claras pendientes.',
    4: 'Bueno: cumple de forma sólida con detalles menores.',
    5: 'Excelente: cumplimiento destacado del criterio.',
  },
  java: {
    0: 'Sin entrega evaluable o sin relación con el enunciado Java/Spring.',
    1: 'Deficiente: funcionalidad o criterio muy por debajo de lo pedido.',
    2: 'Insuficiente: avance parcial con fallas importantes.',
    3: 'Aceptable: requisitos centrales cubiertos con deuda técnica.',
    4: 'Bueno: implementación sólida con ajustes menores.',
    5: 'Excelente: solución completa y bien ejecutada.',
  },
  javascript: {
    0: 'Sin entrega evaluable o sin relación con el enunciado.',
    1: 'Deficiente: no cumple lo mínimo del criterio.',
    2: 'Insuficiente: cumple parcialmente con errores graves.',
    3: 'Aceptable: cumple lo esencial con mejoras pendientes.',
    4: 'Bueno: cumplimiento sólido con detalles menores.',
    5: 'Excelente: cumplimiento destacado del criterio.',
  },
  typescript: {
    0: 'Sin entrega evaluable o sin relación con el enunciado.',
    1: 'Deficiente: no cumple lo mínimo del criterio.',
    2: 'Insuficiente: cumple parcialmente con errores graves.',
    3: 'Aceptable: cumple lo esencial con mejoras pendientes.',
    4: 'Bueno: cumplimiento sólido con detalles menores.',
    5: 'Excelente: cumplimiento destacado del criterio.',
  },
  // --- Roles no técnicos ---
  text: {
    0: 'Sin entrega o sin relación con lo solicitado.',
    1: 'Deficiente: respuesta muy por debajo del nivel esperado.',
    2: 'Insuficiente: aborda el tema parcialmente con errores relevantes.',
    3: 'Aceptable: cubre los aspectos esenciales con margen de mejora.',
    4: 'Bueno: respuesta sólida y bien fundamentada, detalles menores.',
    5: 'Excelente: respuesta completa, precisa y supera lo esperado.',
  },
  excel: {
    0: 'Sin entrega o archivo sin contenido relevante.',
    1: 'Deficiente: análisis o datos muy por debajo de lo requerido.',
    2: 'Insuficiente: estructura básica presente pero con errores importantes.',
    3: 'Aceptable: cumple lo esencial; el análisis puede mejorarse.',
    4: 'Bueno: análisis sólido y bien organizado, ajustes menores.',
    5: 'Excelente: análisis riguroso, completo y bien presentado.',
  },
  business: {
    0: 'Sin entrega o propuesta sin relación con el caso.',
    1: 'Deficiente: análisis superficial y sin sustento.',
    2: 'Insuficiente: identifica el problema pero el análisis es débil.',
    3: 'Aceptable: propuesta razonable con justificación básica.',
    4: 'Bueno: análisis sólido con propuesta bien argumentada.',
    5: 'Excelente: análisis integral, propuesta innovadora y bien sustentada.',
  },
  design: {
    0: 'Sin entrega o trabajo sin relación con el brief.',
    1: 'Deficiente: propuesta muy por debajo de lo esperado.',
    2: 'Insuficiente: concepto presente pero con deficiencias importantes.',
    3: 'Aceptable: cumple el brief con aspectos mejorables.',
    4: 'Bueno: propuesta sólida, coherente y bien ejecutada.',
    5: 'Excelente: propuesta creativa, cohesiva y supera el brief.',
  },
}

/**
 * Devuelve la plantilla más adecuada según lenguaje/formato y texto del enunciado.
 */
export function suggestScoreScale({ defaultLanguage = 'text', title = '', brief = '' } = {}) {
  const lang = String(defaultLanguage || '').toLowerCase()
  const text = `${title} ${brief}`.toLowerCase()

  if (lang === 'java' || text.includes('java') || text.includes('spring')) {
    return { ...SCORE_SCALE_TEMPLATES.java }
  }
  if (lang === 'javascript' || lang === 'typescript') {
    return { ...(SCORE_SCALE_TEMPLATES[lang] || SCORE_SCALE_TEMPLATES.javascript) }
  }
  if (lang === 'python' || text.includes('fastapi') || text.includes('flask') || text.includes('django')) {
    return { ...SCORE_SCALE_TEMPLATES.python }
  }
  if (SCORE_SCALE_TEMPLATES[lang]) return { ...SCORE_SCALE_TEMPLATES[lang] }
  return { ...FALLBACK_SCORE_SCALE }
}

/** Prioriza la escala guardada en la rúbrica; completa niveles vacíos con la plantilla contextual. */
export function mergeScoreScale(saved = {}, context = {}) {
  const suggested = suggestScoreScale(context)
  const merged = {}
  for (const level of ['0', '1', '2', '3', '4', '5']) {
    const fromSaved = saved[level]?.trim()
    merged[level] = fromSaved || suggested[level] || FALLBACK_SCORE_SCALE[level]
  }
  return merged
}
