import { useState } from 'react'
import { API_BASE } from '../constants'
import { isZipFile } from '../utils/files'
import { downloadBlob } from '../utils/download'

export function useCodeEvaluation({ candidateName, onClearCombined }) {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [codeEvalSubTab, setCodeEvalSubTab] = useState('code')
  const [documentFile, setDocumentFile] = useState(null)
  const [selectedTechnicalTestId, setSelectedTechnicalTestId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const zipUpload = isZipFile(uploadedFile)

  const reset = () => {
    setCode('')
    setUploadedFile(null)
    setDocumentFile(null)
    setCodeEvalSubTab('code')
    setSelectedTechnicalTestId(null)
    setLoading(false)
    setError(null)
    setResult(null)
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

  const handleDocumentFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) setDocumentFile(file)
  }

  const clearDocumentFile = () => setDocumentFile(null)

  const validate = () => {
    if (!candidateName.trim()) return 'Ingrese el nombre del candidato'
    if (!selectedTechnicalTestId) return 'Seleccione una prueba técnica'
    if (zipUpload) return null
    if (!uploadedFile && !code.trim()) return 'Ingrese o cargue el código a evaluar (o un proyecto .zip)'
    return null
  }

  const validateWritten = () => {
    if (!candidateName.trim()) return 'Ingrese el nombre del candidato'
    if (!documentFile) return 'Suba el documento de evaluación escrita (PDF/DOCX/TXT)'
    return null
  }

  const evaluateWritten = async (downloadPdf = false) => {
    const err = validateWritten()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setResult(null)
    onClearCombined?.()
    setLoading(true)

    try {
      const form = new FormData()
      form.append('candidate_name', candidateName.trim())
      form.append('file', documentFile, documentFile.name)

      const res = await fetch(`${API_BASE}/evaluate/written`, {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || res.statusText || 'Error en la evaluación escrita')
      }

      const data = await res.json()
      setResult(data)
      if (downloadPdf) {
        const pdfRes = await fetch(`${API_BASE}/generate-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!pdfRes.ok) throw new Error('Error al generar PDF')
        const blob = await pdfRes.blob()
        downloadBlob(blob, `evaluacion_escrita_${data.candidate_name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
      }
    } catch (e) {
      setError(e.message || 'Error al evaluar documento escrito')
    } finally {
      setLoading(false)
    }
  }

  const evaluate = async (downloadPdf = false) => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setResult(null)
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
        : (downloadPdf ? `${API_BASE}/evaluate/pdf` : `${API_BASE}/evaluate`)

      const res = useUploadEndpoint
        ? await (async () => {
          const form = new FormData()
          form.append('candidate_name', payload.candidate_name)
          form.append('technical_test_id', String(payload.technical_test_id))
          if (payload.language) form.append('language', payload.language)
          if (uploadedFile) {
            form.append('file', uploadedFile, uploadedFile.name)
          }
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
        downloadBlob(blob, `evaluacion_${candidateName.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
        setResult({ message: 'PDF descargado correctamente' })
      } else {
        const data = await res.json()
        setResult(data)
        if (downloadPdf) {
          const pdfRes = await fetch(`${API_BASE}/generate-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
          if (!pdfRes.ok) throw new Error('Error al generar PDF')
          const blob = await pdfRes.blob()
          downloadBlob(blob, `evaluacion_${data.candidate_name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
        }
      }
    } catch (e) {
      setError(e.message || 'Error al evaluar')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = () => {
    if (codeEvalSubTab === 'written') {
      if (result && !result.message) {
        fetch(`${API_BASE}/generate-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
        })
          .then((res) => {
            if (!res.ok) throw new Error('Error al generar PDF')
            return res.blob()
          })
          .then((blob) => {
            downloadBlob(blob, `evaluacion_${result.candidate_name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
          })
          .catch(() => setError('Error al generar el PDF'))
      } else {
        evaluateWritten(true)
      }
      return
    }
    if (result && !result.message) {
      fetch(`${API_BASE}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      })
        .then((res) => {
          if (!res.ok) throw new Error('Error al generar PDF')
          return res.blob()
        })
        .then((blob) => {
          downloadBlob(blob, `evaluacion_${result.candidate_name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
        })
        .catch(() => setError('Error al generar el PDF'))
    } else {
      evaluate(true)
    }
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
    selectedTechnicalTestId,
    loading,
    error,
    result,
    zipUpload,
    reset,
    handleTechnicalTestChange,
    clearUploadedFile,
    handleFileChange,
    handleDocumentFileChange,
    clearDocumentFile,
    setError,
    evaluate,
    evaluateWritten,
    handleDownloadPdf,
  }
}
