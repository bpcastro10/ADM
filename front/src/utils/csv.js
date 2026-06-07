import { formatScore } from './format'

const escapeCsvCell = (value) => {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export const buildHistoryEntry = (codeResult, resumeResult, combinedResult) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  candidateName: codeResult.candidate_name || resumeResult.candidate_name || '',
  jobTitle: resumeResult.job_title || '',
  technicalTestTitle: codeResult.technical_test_title || '',
  codeScore: codeResult.overall_score,
  cvScore: resumeResult.match_score,
  verdict: combinedResult.verdict,
  evaluatedAt: combinedResult.evaluated_at || new Date().toISOString(),
})

export const downloadCandidatesTableCsv = (rows) => {
  const headers = [
    'Candidato',
    'Puesto',
    'Prueba técnica',
    'Nota prueba (0-5)',
    'Nota CV (0-5)',
    'Nota promedio (0-5)',
    'Veredicto',
    'Fecha evaluación',
  ]
  const lines = [
    headers.join(','),
    ...rows.map((r) => {
      const avg = (Number(r.codeScore) + Number(r.cvScore)) / 2
      const avgFmt = Number.isNaN(avg) ? '' : formatScore(avg)
      return [
        escapeCsvCell(r.candidateName),
        escapeCsvCell(r.jobTitle),
        escapeCsvCell(r.technicalTestTitle),
        escapeCsvCell(formatScore(r.codeScore)),
        escapeCsvCell(formatScore(r.cvScore)),
        escapeCsvCell(avgFmt),
        escapeCsvCell(r.verdict === 'apto' ? 'APTO' : 'NO APTO'),
        escapeCsvCell(new Date(r.evaluatedAt).toLocaleString('es')),
      ].join(',')
    }),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `candidatos_evaluados_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
