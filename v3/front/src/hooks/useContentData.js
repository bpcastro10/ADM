import { useState, useCallback } from 'react'
import { JSON_API } from '../constants'

export function useContentData() {
  const [jobs, setJobs] = useState([])
  const [technicalTests, setTechnicalTests] = useState([])
  const [contentLoading, setContentLoading] = useState(true)
  const [contentError, setContentError] = useState(null)

  const loadContent = useCallback(async () => {
    setContentLoading(true)
    setContentError(null)
    try {
      const [jobsRes, testsRes] = await Promise.all([
        fetch(`${JSON_API}/jobs`),
        fetch(`${JSON_API}/technicalTests`),
      ])
      if (!jobsRes.ok || !testsRes.ok) {
        throw new Error('No se pudo cargar la configuración desde JSON Server (puerto 3000).')
      }
      const jobsData = await jobsRes.json()
      const testsData = await testsRes.json()
      setJobs(jobsData)
      setTechnicalTests(testsData)
    } catch (e) {
      setContentError(e.message || 'Error al cargar datos del JSON Server')
    } finally {
      setContentLoading(false)
    }
  }, [])

  return {
    jobs,
    setJobs,
    technicalTests,
    setTechnicalTests,
    contentLoading,
    contentError,
    loadContent,
  }
}
