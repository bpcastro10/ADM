import { useState } from 'react'
import { API_BASE } from '../constants'
import { isZipFile } from '../utils/files'
import { downloadBlob } from '../utils/download'

// ---------------------------------------------------------------------------
// Combina múltiples EvaluationResult en uno solo.
// - 0 resultados → null
// - 1 resultado  → se devuelve tal cual, SIN modificar (igual que antes)
// - 2+ resultados → promedio de notas, unión de criterios y detalles
// ---------------------------------------------------------------------------
function _mergeResults(results) {
  const valid = results.filter(Boolean)
  if (valid.length === 0) return null
  // Un solo resultado: se usa directamente, sin promedios ni etiquetas extra
  if (valid.length === 1) return valid[0]

  const avgScore =
    Math.round(
      (valid.reduce((s, r) => s + (r.overall_score || 0), 0) / valid.length) * 10
    ) / 10

  return {
    ...valid[valid.length - 1],
    candidate_name: valid[0].candidate_name,
    overall_score: avgScore,
    criteria_evaluations: valid.flatMap((r) => r.criteria_evaluations || []),
    strengths: [...new Set(valid.flatMap((r) => r.strengths || []))],
    areas_for_improvement: [...new Set(valid.flatMap((r) => r.areas_for_improvement || []))],
    executive_summary: valid
      .map((r, i) => `[Parte ${i + 1}] ${r.executive_summary || ''}`)
      .join('\n\n'),
    technical_test_title: valid
      .map((r) => r.technical_test_title || 'Evaluación')
      .join(' + '),
    source_type: 'combined_multiple',
  }
}

export function useCodeEvaluation({ candidateName, onClearCombined }) {
  // Archivos y código
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [codeEvalSubTab, setCodeEvalSubTab] = useState('code')

  // Evaluación escrita — hasta 2 documentos
  const [documentFile, setDocumentFile] = useState(null)
  const [documentFile2, setDocumentFile2] = useState(null)

  // Notebook — hasta 2 archivos
  const [notebookFile, setNotebookFile] = useState(null)
  const [notebookFile2, setNotebookFile2] = useState(null)

  const [selectedTechnicalTestId, setSelectedTechnicalTestId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Resultados por sub-pestaña (persisten al cambiar de pestaña)
  const [codeSubResult, setCodeSubResult] = useState(null)
  const [writtenSubResult, setWrittenSubResult] = useState(null)
  const [notebookSubResult, setNotebookSubResult] = useState(null)

  const zipUpload = isZipFile(uploadedFile)

  // Resultado de la sub-pestaña activa (para el panel derecho)
  const result = (() => {
    if (codeEvalSubTab === 'written') return writtenSubResult
    if (codeEvalSubTab === 'notebook') return notebookSubResult
    return codeSubResult
  })()

  // Resultado técnico combinado de todos los sub-resultados disponibles
  // (es lo que se pasa al análisis de aptitud)
  const techResult = _mergeResults([codeSubResult, writtenSubResult, notebookSubResult])

  const reset = () => {
    setCode('')
    setUploadedFile(null)
    setDocumentFile(null)
    setDocumentFile2(null)
    setNotebookFile(null)
    setNotebookFile2(null)
    setCodeEvalSubTab('code')
    setSelectedTechnicalTestId(null)
    setLoading(false)
    setError(null)
    setCodeSubResult(null)
    setWrittenSubResult(null)
    setNotebookSubResult(null)
  }

  const handleTechnicalTestChange = (testId, technicalTests) => {
    if (!testId) {
      setSelectedTechnicalTestId(null)
      return
    }
    const id = Number(testId)
    setSelectedTechnicalTestId(id)
    const test = technicalTests.find((t) => t.id === id)
    if (test?.defaultLanguage) setLanguage(test.defaultLanguage)
  }

  const clearUploadedFile = () => {
    setUploadedFile(null)
    setCode('')
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedFile(file)
    if (isZipFile(file)) {
      setCode('')
      setError(null)
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => setCode(ev.target?.result || '')
      reader.readAsText(file)
    }
  }

  // Evaluación escrita — archivos
  const handleDocumentFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) setDocumentFile(file)
  }
  const clearDocumentFile = () => setDocumentFile(null)

  const handleDocumentFile2Change = (e) => {
    const file = e.target.files?.[0]
    if (file) setDocumentFile2(file)
  }
  const clearDocumentFile2 = () => setDocumentFile2(null)

  // Notebook — archivos
  const handleNotebookFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) setNotebookFile(file)
  }
  const clearNotebookFile = () => setNotebookFile(null)

  const handleNotebookFile2Change = (e) => {
    const file = e.target.files?.[0]
    if (file) setNotebookFile2(file)
  }
  const clearNotebookFile2 = () => setNotebookFile2(null)

  // ---------------------------------------------------------------------------
  // Validaciones
  // ---------------------------------------------------------------------------
  const validate = () => {
    if (!candidateName.trim()) return 'Ingrese el nombre del candidato'
    if (!selectedTechnicalTestId) return 'Seleccione una prueba técnica'
    if (zipUpload) return null
    if (!uploadedFile && !code.trim()) return 'Ingrese o cargue el código a evaluar (o un proyecto .zip)'
    return null
  }

  const validateWritten = () => {
    if (!candidateName.trim()) return 'Ingrese el nombre del candidato'
    if (!documentFile) return 'Suba al menos el primer documento de evaluación escrita'
    return null
  }

  const validateNotebook = () => {
    if (!candidateName.trim()) return 'Ingrese el nombre del candidato'
    if (!notebookFile) return 'Suba al menos el primer archivo de notebook (.ipynb)'
    if (!notebookFile.name.toLowerCase().endsWith('.ipynb'))
      return 'Solo se aceptan archivos .ipynb (Jupyter / Google Colab)'
    if (notebookFile2 && !notebookFile2.name.toLowerCase().endsWith('.ipynb'))
      return 'El segundo archivo también debe ser .ipynb'
    return null
  }

  // ---------------------------------------------------------------------------
  // Helper: evaluar un documento escrito y devolver el resultado
  // ---------------------------------------------------------------------------
  const _evalWrittenFile = async (file) => {
    const form = new FormData()
    form.append('candidate_name', candidateName.trim())
    form.append('file', file, file.name)
    const res = await fetch(`${API_BASE}/evaluate/written`, { method: 'POST', body: form })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || res.statusText || 'Error en la evaluación escrita')
    }
    return res.json()
  }

  // Helper: evaluar un notebook y devolver el resultado
  const _evalNotebookFile = async (file) => {
    const form = new FormData()
    form.append('candidate_name', candidateName.trim())
    form.append('file', file, file.name)
    const res = await fetch(`${API_BASE}/evaluate/notebook`, { method: 'POST', body: form })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || res.statusText || 'Error al evaluar el notebook')
    }
    return res.json()
  }

  // Helper: descargar PDF de resultado existente
  const _downloadResultPdf = (res, prefix) => {
    fetch(`${API_BASE}/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(res),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Error al generar PDF')
        return r.blob()
      })
      .then((blob) => {
        downloadBlob(
          blob,
          `${prefix}_${res.candidate_name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
        )
      })
      .catch(() => setError('Error al generar el PDF'))
  }

  // ---------------------------------------------------------------------------
  // Evaluación escrita (1 o 2 documentos)
  // ---------------------------------------------------------------------------
  const evaluateWritten = async (downloadPdf = false) => {
    const err = validateWritten()
    if (err) { setError(err); return }
    setError(null)
    setWrittenSubResult(null)
    onClearCombined?.()
    setLoading(true)

    try {
      const r1 = await _evalWrittenFile(documentFile)
      let merged = r1

      if (documentFile2) {
        const r2 = await _evalWrittenFile(documentFile2)
        merged = _mergeResults([r1, r2])
      }

      setWrittenSubResult(merged)
      if (downloadPdf) _downloadResultPdf(merged, 'evaluacion_escrita')
    } catch (e) {
      setError(e.message || 'Error al evaluar documento escrito')
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Evaluación de notebook (1 o 2 archivos)
  // ---------------------------------------------------------------------------
  const evaluateNotebook = async (downloadPdf = false) => {
    const err = validateNotebook()
    if (err) { setError(err); return }
    setError(null)
    setNotebookSubResult(null)
    onClearCombined?.()
    setLoading(true)

    try {
      const r1 = await _evalNotebookFile(notebookFile)
      let merged = r1

      if (notebookFile2) {
        const r2 = await _evalNotebookFile(notebookFile2)
        merged = _mergeResults([r1, r2])
      }

      setNotebookSubResult(merged)
      if (downloadPdf) _downloadResultPdf(merged, 'evaluacion_notebook')
    } catch (e) {
      setError(e.message || 'Error al evaluar notebook')
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Evaluación de código fuente / ZIP / documento con rúbrica
  // ---------------------------------------------------------------------------
  const evaluate = async (downloadPdf = false) => {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setCodeSubResult(null)
    onClearCombined?.()
    setLoading(true)

    const payload = {
      candidate_name: candidateName.trim(),
      technical_test_id: selectedTechnicalTestId,
      code: code.trim(),
      language: language || 'text',
    }

    try {
      const useUploadEndpoint = Boolean(uploadedFile) || zipUpload
      const endpoint = useUploadEndpoint
        ? `${API_BASE}/evaluate/upload`
        : downloadPdf
        ? `${API_BASE}/evaluate/pdf`
        : `${API_BASE}/evaluate`

      const res = useUploadEndpoint
        ? await (async () => {
            const form = new FormData()
            form.append('candidate_name', payload.candidate_name)
            form.append('technical_test_id', String(payload.technical_test_id))
            if (payload.language) form.append('language', payload.language)
            if (uploadedFile) form.append('file', uploadedFile, uploadedFile.name)
            if (!uploadedFile && payload.code) form.append('code_text', payload.code)
            return fetch(endpoint, { method: 'POST', body: form })
          })()
        : await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || res.statusText || 'Error en la evaluación')
      }

      if (downloadPdf && !useUploadEndpoint) {
        const blob = await res.blob()
        downloadBlob(
          blob,
          `evaluacion_${candidateName.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
        )
        setCodeSubResult({ message: 'PDF descargado correctamente' })
      } else {
        const data = await res.json()
        setCodeSubResult(data)
        if (downloadPdf) _downloadResultPdf(data, 'evaluacion')
      }
    } catch (e) {
      setError(e.message || 'Error al evaluar')
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Descarga de PDF según sub-pestaña activa
  // ---------------------------------------------------------------------------
  const handleDownloadPdf = () => {
    if (codeEvalSubTab === 'written') {
      writtenSubResult && !writtenSubResult.message
        ? _downloadResultPdf(writtenSubResult, 'evaluacion_escrita')
        : evaluateWritten(true)
      return
    }
    if (codeEvalSubTab === 'notebook') {
      notebookSubResult && !notebookSubResult.message
        ? _downloadResultPdf(notebookSubResult, 'evaluacion_notebook')
        : evaluateNotebook(true)
      return
    }
    codeSubResult && !codeSubResult.message
      ? _downloadResultPdf(codeSubResult, 'evaluacion')
      : evaluate(true)
  }

  return {
    code,
    setCode,
    language,
    setLanguage,
    uploadedFile,
    codeEvalSubTab,
    setCodeEvalSubTab,
    documentFile,
    documentFile2,
    notebookFile,
    notebookFile2,
    selectedTechnicalTestId,
    loading,
    error,
    result,        // resultado de la sub-pestaña activa (para el panel derecho)
    techResult,    // resultado técnico combinado de todas las sub-pestañas (para aptitud)
    // indicadores de resultados disponibles por sub-pestaña
    codeSubResult,
    writtenSubResult,
    notebookSubResult,
    zipUpload,
    reset,
    handleTechnicalTestChange,
    clearUploadedFile,
    handleFileChange,
    handleDocumentFileChange,
    clearDocumentFile,
    handleDocumentFile2Change,
    clearDocumentFile2,
    handleNotebookFileChange,
    clearNotebookFile,
    handleNotebookFile2Change,
    clearNotebookFile2,
    setError,
    evaluate,
    evaluateWritten,
    evaluateNotebook,
    handleDownloadPdf,
  }
}
