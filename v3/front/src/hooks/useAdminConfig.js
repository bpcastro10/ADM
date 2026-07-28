import { useState } from 'react'
import { mergeScoreScale, suggestScoreScale } from '../scoreScaleTemplates'
import { API_BASE, JSON_API, MIN_CRITERIA, MAX_CRITERIA, SCORE_LEVELS, NEW_ITEM } from '../constants'
import { clone, emptyCriteria, scoreScaleForTest } from '../utils/adminHelpers'

export function useAdminConfig({ jobs, technicalTests, setJobs, setTechnicalTests }) {
  const [adminSubTab, setAdminSubTab] = useState('tests')
  const [editTestId, setEditTestId] = useState(null)
  const [editJobId, setEditJobId] = useState(null)
  const [draftTest, setDraftTest] = useState(null)
  const [draftJob, setDraftJob] = useState(null)
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminMessage, setAdminMessage] = useState(null)

  const isNewTest = editTestId === 'new'
  const isNewJob = editJobId === 'new'
  const editTestSelectValue = isNewTest ? NEW_ITEM : (editTestId ?? '')
  const editJobSelectValue = isNewJob ? NEW_ITEM : (editJobId ?? '')

  const startNewTest = () => {
    setAdminMessage(null)
    setEditTestId('new')
    setDraftTest({
      title: '',
      brief: '',
      defaultLanguage: 'python',
      jobId: jobs[0]?.id ?? null,
      rubric: {
        criteria: emptyCriteria(),
        scoreScale: suggestScoreScale({ defaultLanguage: 'python' }),
      },
    })
  }

  const startNewJob = () => {
    setAdminMessage(null)
    setEditJobId('new')
    setDraftJob({
      title: '',
      description: '',
      soughtCharacteristics: emptyCriteria(),
    })
  }

  const selectTestForEdit = (rawId) => {
    setAdminMessage(null)
    if (!rawId) {
      setEditTestId(null)
      setDraftTest(null)
      return
    }
    if (rawId === NEW_ITEM) {
      startNewTest()
      return
    }
    const id = Number(rawId)
    setEditTestId(id)
    const t = technicalTests.find((x) => x.id === id)
    if (t) {
      const cloned = clone(t)
      cloned.rubric = cloned.rubric || { criteria: emptyCriteria() }
      cloned.rubric.scoreScale = scoreScaleForTest(cloned)
      setDraftTest(cloned)
    }
  }

  const selectJobForEdit = (rawId) => {
    setAdminMessage(null)
    if (!rawId) {
      setEditJobId(null)
      setDraftJob(null)
      return
    }
    if (rawId === NEW_ITEM) {
      startNewJob()
      return
    }
    const id = Number(rawId)
    setEditJobId(id)
    const j = jobs.find((x) => x.id === id)
    if (j) setDraftJob(clone(j))
  }

  const updateDraftScoreScale = (level, value) => {
    setDraftTest((prev) => {
      if (!prev) return prev
      const next = clone(prev)
      next.rubric = next.rubric || { criteria: emptyCriteria(), scoreScale: suggestScoreScale(next) }
      next.rubric.scoreScale = { ...(next.rubric.scoreScale || suggestScoreScale(next)), [level]: value }
      return next
    })
  }

  const updateDraftCriterion = (index, field, value) => {
    setDraftTest((prev) => {
      if (!prev) return prev
      const next = clone(prev)
      next.rubric.criteria[index] = { ...next.rubric.criteria[index], [field]: value }
      return next
    })
  }

  const addDraftCriterion = () => {
    setDraftTest((prev) => {
      if (!prev) return prev
      const criteria = prev.rubric?.criteria || []
      if (criteria.length >= MAX_CRITERIA) return prev
      const next = clone(prev)
      next.rubric = next.rubric || { criteria: [] }
      next.rubric.criteria = [...criteria, { name: '', description: '' }]
      return next
    })
  }

  const removeDraftCriterion = (index) => {
    setDraftTest((prev) => {
      if (!prev?.rubric?.criteria || prev.rubric.criteria.length <= MIN_CRITERIA) return prev
      const next = clone(prev)
      next.rubric.criteria = next.rubric.criteria.filter((_, i) => i !== index)
      return next
    })
  }

  const updateDraftCharacteristic = (index, field, value) => {
    setDraftJob((prev) => {
      if (!prev) return prev
      const next = clone(prev)
      next.soughtCharacteristics[index] = { ...next.soughtCharacteristics[index], [field]: value }
      return next
    })
  }

  const addDraftCharacteristic = () => {
    setDraftJob((prev) => {
      if (!prev) return prev
      const list = prev.soughtCharacteristics || []
      if (list.length >= MAX_CRITERIA) return prev
      const next = clone(prev)
      next.soughtCharacteristics = [...list, { name: '', description: '' }]
      return next
    })
  }

  const removeDraftCharacteristic = (index) => {
    setDraftJob((prev) => {
      if (!prev?.soughtCharacteristics || prev.soughtCharacteristics.length <= MIN_CRITERIA) return prev
      const next = clone(prev)
      next.soughtCharacteristics = next.soughtCharacteristics.filter((_, i) => i !== index)
      return next
    })
  }

  const validateDraftTest = () => {
    if (!draftTest?.title?.trim()) return 'El título de la prueba es obligatorio'
    if (!draftTest?.brief?.trim()) return 'El enunciado es obligatorio'
    const valid = (draftTest.rubric?.criteria || []).filter((c) => c.name?.trim() && c.description?.trim())
    if (valid.length < MIN_CRITERIA) return `La rúbrica debe tener al menos ${MIN_CRITERIA} criterios completos`
    const scale = draftTest.rubric?.scoreScale || {}
    for (const level of SCORE_LEVELS) {
      if (!scale[level]?.trim()) return `Defina qué significa la calificación ${level} en la escala`
    }
    return null
  }

  const validateDraftJob = () => {
    if (!draftJob?.title?.trim()) return 'El título del puesto es obligatorio'
    if (!draftJob?.description?.trim()) return 'La descripción del trabajo es obligatoria'
    const valid = (draftJob.soughtCharacteristics || []).filter((c) => c.name?.trim() && c.description?.trim())
    if (valid.length < MIN_CRITERIA) return `Debe haber al menos ${MIN_CRITERIA} características completas`
    return null
  }

  const acceptSaveTest = async () => {
    const err = validateDraftTest()
    if (err) {
      setAdminMessage({ type: 'error', text: err })
      return
    }
    const payload = {
      title: draftTest.title.trim(),
      brief: draftTest.brief.trim(),
      defaultLanguage: draftTest.defaultLanguage || 'python',
      jobId: draftTest.jobId ?? null,
      rubric: {
        scoreScale: Object.fromEntries(
          SCORE_LEVELS.map((level) => [
            level,
            (draftTest.rubric.scoreScale?.[level] || '').trim(),
          ]),
        ),
        criteria: draftTest.rubric.criteria
          .filter((c) => c.name?.trim() && c.description?.trim())
          .map((c) => ({ name: c.name.trim(), description: c.description.trim() })),
      },
    }
    setAdminSaving(true)
    setAdminMessage(null)
    try {
      const url = isNewTest
        ? `${JSON_API}/technicalTests`
        : `${JSON_API}/technicalTests/${draftTest.id}`
      const res = await fetch(url, {
        method: isNewTest ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('No se pudo guardar en JSON Server')
      const updated = await res.json()
      setTechnicalTests((prev) =>
        isNewTest ? [...prev, updated] : prev.map((t) => (t.id === updated.id ? updated : t)),
      )
      setEditTestId(updated.id)
      setDraftTest(clone(updated))
      setAdminMessage({
        type: 'success',
        text: isNewTest ? 'Prueba técnica creada en JSON Server.' : 'Prueba técnica guardada en JSON Server.',
      })
    } catch (e) {
      setAdminMessage({ type: 'error', text: e.message || 'Error al guardar' })
    } finally {
      setAdminSaving(false)
    }
  }

  const acceptSaveJob = async () => {
    const err = validateDraftJob()
    if (err) {
      setAdminMessage({ type: 'error', text: err })
      return
    }
    const payload = {
      title: draftJob.title.trim(),
      description: draftJob.description.trim(),
      soughtCharacteristics: draftJob.soughtCharacteristics
        .filter((c) => c.name?.trim() && c.description?.trim())
        .map((c) => ({ name: c.name.trim(), description: c.description.trim() })),
    }
    setAdminSaving(true)
    setAdminMessage(null)
    try {
      const url = isNewJob ? `${JSON_API}/jobs` : `${JSON_API}/jobs/${draftJob.id}`
      const res = await fetch(url, {
        method: isNewJob ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('No se pudo guardar en JSON Server')
      const updated = await res.json()
      setJobs((prev) =>
        isNewJob ? [...prev, updated] : prev.map((j) => (j.id === updated.id ? updated : j)),
      )
      setEditJobId(updated.id)
      setDraftJob(clone(updated))
      setAdminMessage({
        type: 'success',
        text: isNewJob ? 'Puesto creado en JSON Server.' : 'Puesto guardado en JSON Server.',
      })
    } catch (e) {
      setAdminMessage({ type: 'error', text: e.message || 'Error al guardar' })
    } finally {
      setAdminSaving(false)
    }
  }

  const cancelEditTest = () => {
    if (isNewTest) {
      setEditTestId(null)
      setDraftTest(null)
    } else {
      const t = technicalTests.find((x) => x.id === editTestId)
      if (t) setDraftTest(clone(t))
    }
    setAdminMessage(null)
  }

  const cancelEditJob = () => {
    if (isNewJob) {
      setEditJobId(null)
      setDraftJob(null)
    } else {
      const j = jobs.find((x) => x.id === editJobId)
      if (j) setDraftJob(clone(j))
    }
    setAdminMessage(null)
  }

  // ---------------------------------------------------------------------------
  // Escaneo de documento → guarda directamente en JSON Server
  // ---------------------------------------------------------------------------
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [scanJobLoading, setScanJobLoading] = useState(false)
  const [scanJobError, setScanJobError] = useState(null)

  const scanTestFile = async (file) => {
    if (!file) return
    setScanError(null)
    setAdminMessage(null)
    setScanLoading(true)
    try {
      // 1. Llamar al backend para extraer la estructura del documento con IA
      const form = new FormData()
      form.append('file', file, file.name)
      const scanRes = await fetch(`${API_BASE}/admin/scan-test-file`, { method: 'POST', body: form })
      if (!scanRes.ok) {
        const errData = await scanRes.json().catch(() => ({}))
        throw new Error(errData.detail || scanRes.statusText || 'Error al escanear el documento')
      }
      const scanned = await scanRes.json()

      // 2. Construir el payload completo listo para JSON Server
      const lang = scanned.defaultLanguage || 'python'
      const criteria = (scanned.criteria || [])
        .filter((c) => c.name?.trim() && c.description?.trim())
        .map((c) => ({ name: c.name.trim(), description: c.description.trim() }))

      if (criteria.length < MIN_CRITERIA) {
        throw new Error(`El documento escaneado solo produjo ${criteria.length} criterio(s); se requieren al menos ${MIN_CRITERIA}.`)
      }

      const scoreScale = suggestScoreScale({ defaultLanguage: lang, title: scanned.title, brief: scanned.brief })

      const payload = {
        title: (scanned.title || '').trim() || `Prueba técnica — ${file.name}`,
        brief: (scanned.brief || '').trim(),
        defaultLanguage: lang,
        jobId: null,
        rubric: { criteria, scoreScale },
      }

      // 3. Guardar directamente en JSON Server (siempre crea una nueva prueba)
      const saveRes = await fetch(`${JSON_API}/technicalTests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!saveRes.ok) throw new Error('El documento se escaneó correctamente pero no se pudo guardar en JSON Server.')
      const saved = await saveRes.json()

      // 4. Actualizar estado local con el resultado guardado
      setTechnicalTests((prev) => [...prev, saved])
      setEditTestId(saved.id)
      setDraftTest(clone(saved))
      setAdminMessage({
        type: 'success',
        text: `✓ "${saved.title}" importada y guardada. Puedes ajustar los campos y pulsar Aceptar si deseas modificarla.`,
      })
    } catch (e) {
      setScanError(e.message || 'Error al importar el documento')
    } finally {
      setScanLoading(false)
    }
  }

  const scanJobFile = async (file) => {
    if (!file) return
    setScanJobError(null)
    setAdminMessage(null)
    setScanJobLoading(true)
    try {
      const form = new FormData()
      form.append('file', file, file.name)
      const scanRes = await fetch(`${API_BASE}/admin/scan-job-file`, { method: 'POST', body: form })
      if (!scanRes.ok) {
        const errData = await scanRes.json().catch(() => ({}))
        throw new Error(errData.detail || scanRes.statusText || 'Error al escanear el documento')
      }
      const scanned = await scanRes.json()

      const characteristics = (scanned.soughtCharacteristics || [])
        .filter((c) => c.name?.trim() && c.description?.trim())
        .map((c) => ({ name: c.name.trim(), description: c.description.trim() }))

      if (characteristics.length < MIN_CRITERIA) {
        throw new Error(`El documento solo produjo ${characteristics.length} característica(s); se requieren al menos ${MIN_CRITERIA}.`)
      }

      const payload = {
        title: (scanned.title || '').trim() || `Puesto — ${file.name}`,
        description: (scanned.description || '').trim(),
        soughtCharacteristics: characteristics,
      }

      const saveRes = await fetch(`${JSON_API}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!saveRes.ok) throw new Error('El documento se escaneó pero no se pudo guardar en JSON Server.')
      const saved = await saveRes.json()

      setJobs((prev) => [...prev, saved])
      setEditJobId(saved.id)
      setDraftJob(clone(saved))
      setAdminMessage({
        type: 'success',
        text: `✓ "${saved.title}" importado y guardado. Puedes ajustar los campos y pulsar Aceptar si deseas modificarlo.`,
      })
    } catch (e) {
      setScanJobError(e.message || 'Error al importar el documento')
    } finally {
      setScanJobLoading(false)
    }
  }

  const handleDefaultLanguageChange = (defaultLanguage) => {
    setDraftTest((p) => {
      if (!p) return p
      const next = { ...p, defaultLanguage }
      const ctx = { defaultLanguage, title: p.title, brief: p.brief }
      next.rubric = next.rubric || { criteria: emptyCriteria() }
      next.rubric.scoreScale =
        editTestId === 'new'
          ? suggestScoreScale(ctx)
          : mergeScoreScale(p.rubric?.scoreScale, ctx)
      return next
    })
  }

  return {
    adminSubTab,
    setAdminSubTab,
    draftTest,
    setDraftTest,
    draftJob,
    setDraftJob,
    adminSaving,
    adminMessage,
    setAdminMessage,
    isNewTest,
    isNewJob,
    editTestSelectValue,
    editJobSelectValue,
    startNewTest,
    startNewJob,
    selectTestForEdit,
    selectJobForEdit,
    updateDraftScoreScale,
    updateDraftCriterion,
    addDraftCriterion,
    removeDraftCriterion,
    updateDraftCharacteristic,
    addDraftCharacteristic,
    removeDraftCharacteristic,
    acceptSaveTest,
    acceptSaveJob,
    cancelEditTest,
    cancelEditJob,
    handleDefaultLanguageChange,
    scanTestFile,
    scanLoading,
    scanError,
    setScanError,
    scanJobFile,
    scanJobLoading,
    scanJobError,
    setScanJobError,
  }
}
