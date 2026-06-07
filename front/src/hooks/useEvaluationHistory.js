import { useState, useEffect } from 'react'
import { EVALUATION_HISTORY_KEY } from '../constants'

export function useEvaluationHistory() {
  const [evaluationHistory, setEvaluationHistory] = useState([])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(EVALUATION_HISTORY_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setEvaluationHistory(parsed)
      }
    } catch {
      /* ignorar historial corrupto */
    }
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(EVALUATION_HISTORY_KEY, JSON.stringify(evaluationHistory))
    } catch {
      /* quota exceeded, etc. */
    }
  }, [evaluationHistory])

  return { evaluationHistory, setEvaluationHistory }
}
