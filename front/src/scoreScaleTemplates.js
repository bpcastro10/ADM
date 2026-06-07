/** Plantillas de escala 0-5 (alineadas con back/services/rubric_scale.py y jsonserver/db.json). */

export const FALLBACK_SCORE_SCALE = {
  0: 'No cumple o sin evidencia en el código.',
  1: 'Deficiente: incumple lo esperado.',
  2: 'Insuficiente: mínimos con fallas importantes.',
  3: 'Aceptable: esencial cumplido, mejoras posibles.',
  4: 'Bueno: cumplimiento sólido, detalles menores.',
  5: 'Excelente: supera lo definido en el criterio.',
}

export const SCORE_SCALE_TEMPLATES = {
  python: {
    0: 'Sin entrega evaluable, código vacío o sin relación con el enunciado.',
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
}

/**
 * Plantilla sugerida según lenguaje y texto de la prueba (título/enunciado).
 */
export function suggestScoreScale({ defaultLanguage = 'python', title = '', brief = '' } = {}) {
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
