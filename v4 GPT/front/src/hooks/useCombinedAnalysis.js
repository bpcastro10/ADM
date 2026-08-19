import { useState } from 'react'
import { API_BASE } from '../constants'
import { buildHistoryEntry } from '../utils/csv'
import { downloadBlob } from '../utils/download'

export function useCombinedAnalysis({
  result,
  resumeResult,
  candidateName,
  setEvaluationHistory,
  setError,
  loading,
  resumeLoading,
}) {
  const [combinedResult, setCombinedResult] = useState(null)
  const [combinedLoading, setCombinedLoading] = useState(false)

  const reset = () => {
    setCombinedResult(null)
    setCombinedLoading(false)
  }

  const generateCombinedAnalysis = async () => {
    if (!result || !resumeResult) return
    setCombinedLoading(true)
    setCombinedResult(null)
    try {
      const res = await fetch(`${API_BASE}/combined/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code_result: result, resume_result: resumeResult }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || res.statusText || 'Error al analizar')
      }
      const data = await res.json()
      setCombinedResult(data)
      if (data.applicable !== false && data.verdict) {
        const entry = buildHistoryEntry(result, resumeResult, {
          ...data,
          evaluated_at: new Date().toISOString(),
        })
        setEvaluationHistory((prev) => [...prev, entry])
      }
    } catch (e) {
      setError?.(e.message || 'Error al generar informe de aptitud')
    } finally {
      setCombinedLoading(false)
    }
  }

  const downloadUnifiedPdf = async () => {
    if (!result || !resumeResult) return
    try {
      const payload = { code_result: result, resume_result: resumeResult }
      if (combinedResult) payload.combined_result = combinedResult
      const res = await fetch(`${API_BASE}/report/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Error al generar PDF unificado')
      const blob = await res.blob()
      downloadBlob(blob, `reporte_unificado_${candidateName.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e) {
      setError?.(e.message || 'Error al descargar PDF unificado')
    }
  }

  return {
    combinedResult,
    combinedLoading,
    reset,
    generateCombinedAnalysis,
    downloadUnifiedPdf,
  }
}
