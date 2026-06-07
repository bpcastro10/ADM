import { useState } from 'react'
import { API_BASE } from '../constants'
import { downloadBlob } from '../utils/download'

export function useResumeEvaluation({ candidateName, onClearCombined }) {
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [resumeFile, setResumeFile] = useState(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState(null)
  const [resumeResult, setResumeResult] = useState(null)

  const reset = () => {
    setSelectedJobId(null)
    setResumeFile(null)
    setResumeLoading(false)
    setResumeError(null)
    setResumeResult(null)
  }

  const handleResumeFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) setResumeFile(file)
  }

  const validateResume = () => {
    if (!candidateName.trim()) return 'Ingrese el nombre del candidato'
    if (!selectedJobId) return 'Seleccione el puesto a evaluar'
    if (!resumeFile) return 'Suba el CV (PDF/DOCX/TXT)'
    return null
  }

  const evaluateResume = async () => {
    const err = validateResume()
    if (err) {
      setResumeError(err)
      return
    }
    setResumeError(null)
    setResumeResult(null)
    onClearCombined?.()
    setResumeLoading(true)

    try {
      const form = new FormData()
      form.append('candidate_name', candidateName.trim())
      form.append('job_id', String(selectedJobId))
      form.append('file', resumeFile)

      const res = await fetch(`${API_BASE}/resume/evaluate/upload`, {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || res.statusText || 'Error en la evaluación del CV')
      }
      const data = await res.json()
      setResumeResult(data)
    } catch (e) {
      setResumeError(e.message || 'Error al evaluar CV')
    } finally {
      setResumeLoading(false)
    }
  }

  const downloadResumePdf = async () => {
    if (!resumeResult) return
    try {
      const res = await fetch(`${API_BASE}/resume/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeResult),
      })
      if (!res.ok) throw new Error('Error al generar PDF del CV')
      const blob = await res.blob()
      downloadBlob(blob, `cv_${resumeResult.candidate_name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e) {
      setResumeError(e.message || 'Error al descargar PDF del CV')
    }
  }

  return {
    selectedJobId,
    setSelectedJobId,
    resumeFile,
    resumeLoading,
    resumeError,
    resumeResult,
    reset,
    handleResumeFileChange,
    evaluateResume,
    downloadResumePdf,
  }
}
