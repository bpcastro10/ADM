import { useState } from 'react'
import { API_BASE } from '../constants'

/**
 * Hook que gestiona el estado de la evaluación masiva en tres fases:
 *  1. bulkCv   → carga masiva de CVs (ZIP con nombre-apellido-cv.ext)
 *  2. bulkTest → carga masiva de pruebas técnicas (ZIP con nombre-apellido-prueba.ext)
 *  3. bulkCombined → análisis de aptitud masivo cruzando los resultados anteriores
 */
export function useBulkEvaluation() {
  // ── Bulk CV ──────────────────────────────────────────────────────────────
  const [bulkCvZip, setBulkCvZip] = useState(null)
  const [bulkCvJobId, setBulkCvJobId] = useState('')
  const [bulkCvLoading, setBulkCvLoading] = useState(false)
  const [bulkCvResults, setBulkCvResults] = useState(null)  // { results: [], skipped_files: [] }
  const [bulkCvError, setBulkCvError] = useState(null)

  // ── Bulk Test ─────────────────────────────────────────────────────────────
  const [bulkTestZip, setBulkTestZip] = useState(null)
  const [bulkTestId, setBulkTestId] = useState('')
  const [bulkTestLoading, setBulkTestLoading] = useState(false)
  const [bulkTestResults, setBulkTestResults] = useState(null) // { results: [], skipped_files: [] }
  const [bulkTestError, setBulkTestError] = useState(null)

  // ── Bulk Combined ─────────────────────────────────────────────────────────
  const [bulkCombinedLoading, setBulkCombinedLoading] = useState(false)
  const [bulkCombinedResults, setBulkCombinedResults] = useState(null)
  const [bulkCombinedError, setBulkCombinedError] = useState(null)

  // ── Handlers CV ──────────────────────────────────────────────────────────
  const handleBulkCvZipChange = (e) => {
    const file = e.target.files?.[0]
    setBulkCvZip(file || null)
    setBulkCvResults(null)
    setBulkCvError(null)
    setBulkCombinedResults(null)
  }

  const clearBulkCvZip = () => {
    setBulkCvZip(null)
    setBulkCvResults(null)
    setBulkCvError(null)
    setBulkCombinedResults(null)
  }

  const evaluateBulkCv = async () => {
    if (!bulkCvZip) { setBulkCvError('Selecciona un ZIP con los CVs.'); return }
    if (!bulkCvJobId) { setBulkCvError('Selecciona el puesto de trabajo.'); return }
    setBulkCvError(null)
    setBulkCvResults(null)
    setBulkCombinedResults(null)
    setBulkCvLoading(true)
    try {
      const form = new FormData()
      form.append('zip_file', bulkCvZip, bulkCvZip.name)
      form.append('job_id', bulkCvJobId)
      const res = await fetch(`${API_BASE}/evaluate/bulk-cv`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || res.statusText)
      }
      setBulkCvResults(await res.json())
    } catch (e) {
      setBulkCvError(e.message || 'Error en la evaluación masiva de CVs.')
    } finally {
      setBulkCvLoading(false)
    }
  }

  // ── Handlers Test ─────────────────────────────────────────────────────────
  const handleBulkTestZipChange = (e) => {
    const file = e.target.files?.[0]
    setBulkTestZip(file || null)
    setBulkTestResults(null)
    setBulkTestError(null)
    setBulkCombinedResults(null)
  }

  const clearBulkTestZip = () => {
    setBulkTestZip(null)
    setBulkTestResults(null)
    setBulkTestError(null)
    setBulkCombinedResults(null)
  }

  const evaluateBulkTest = async () => {
    if (!bulkTestZip) { setBulkTestError('Selecciona un ZIP con las entregas técnicas.'); return }
    setBulkTestError(null)
    setBulkTestResults(null)
    setBulkCombinedResults(null)
    setBulkTestLoading(true)
    try {
      const form = new FormData()
      form.append('zip_file', bulkTestZip, bulkTestZip.name)
      if (bulkTestId) form.append('technical_test_id', bulkTestId)
      const res = await fetch(`${API_BASE}/evaluate/bulk-test`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || res.statusText)
      }
      setBulkTestResults(await res.json())
    } catch (e) {
      setBulkTestError(e.message || 'Error en la evaluación masiva de pruebas.')
    } finally {
      setBulkTestLoading(false)
    }
  }

  // ── Handlers Combined ─────────────────────────────────────────────────────
  const analyzeBulkCombined = async () => {
    if (!bulkCvResults?.results?.length && !bulkTestResults?.results?.length) {
      setBulkCombinedError('Se necesitan resultados de CVs y/o pruebas para el análisis.')
      return
    }
    setBulkCombinedError(null)
    setBulkCombinedResults(null)
    setBulkCombinedLoading(true)
    try {
      const res = await fetch(`${API_BASE}/analyze/bulk-combined`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cv_results: bulkCvResults?.results || [],
          test_results: bulkTestResults?.results || [],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || res.statusText)
      }
      setBulkCombinedResults(await res.json())
    } catch (e) {
      setBulkCombinedError(e.message || 'Error en el análisis masivo de aptitud.')
    } finally {
      setBulkCombinedLoading(false)
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setBulkCvZip(null); setBulkCvJobId(''); setBulkCvLoading(false)
    setBulkCvResults(null); setBulkCvError(null)
    setBulkTestZip(null); setBulkTestId(''); setBulkTestLoading(false)
    setBulkTestResults(null); setBulkTestError(null)
    setBulkCombinedLoading(false); setBulkCombinedResults(null); setBulkCombinedError(null)
  }

  return {
    // CV
    bulkCvZip, bulkCvJobId, setBulkCvJobId,
    bulkCvLoading, bulkCvResults, bulkCvError, setBulkCvError,
    handleBulkCvZipChange, clearBulkCvZip, evaluateBulkCv,
    // Test
    bulkTestZip, bulkTestId, setBulkTestId,
    bulkTestLoading, bulkTestResults, bulkTestError, setBulkTestError,
    handleBulkTestZipChange, clearBulkTestZip, evaluateBulkTest,
    // Combined
    bulkCombinedLoading, bulkCombinedResults, bulkCombinedError, setBulkCombinedError,
    analyzeBulkCombined,
    // General
    reset,
  }
}
