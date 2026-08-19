import { useState } from 'react'

const EVAL_TYPE_LABEL = {
  code: 'Código',
  written: 'Escrito',
  notebook: 'Notebook',
  zip: 'ZIP',
}

function ScoreBadge({ score }) {
  if (score == null) return <span className="subtle">—</span>
  const val = Number(score).toFixed(1)
  const color = score >= 4.0 ? 'var(--success)' : score >= 3.0 ? '#e6a817' : 'var(--error)'
  return <strong style={{ color }}>{val}</strong>
}

function VerdictBadge({ verdict }) {
  if (!verdict) return <span className="subtle">—</span>
  const isApto = verdict.toLowerCase() === 'apto'
  return (
    <span style={{
      padding: '2px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
      background: isApto ? 'var(--success)' : 'var(--error)', color: '#fff',
    }}>
      {isApto ? 'APTO' : 'NO APTO'}
    </span>
  )
}

/**
 * type = 'cv' | 'test' | 'combined'
 * results shape:
 *   cv/test:     [{candidate_key, display_name, score, eval_type?, error}]
 *   combined:    [{candidate_key, display_name, cv_score, test_score, test_eval_type, average, verdict, error}]
 */
export default function BulkCandidatesTable({ results = [], skippedFiles = [], type = 'cv' }) {
  const [expanded, setExpanded] = useState({})
  const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }))

  if (!results.length) return <p className="subtle" style={{ marginTop: '1rem' }}>No se procesaron candidatos.</p>

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--surface-alt, rgba(0,0,0,0.04))' }}>
              <th style={{ padding: '0.45rem 0.6rem', textAlign: 'left' }}>Candidato</th>

              {type === 'combined' ? (
                <>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>Nota CV</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>Prueba técnica</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>Promedio</th>
                  <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>Veredicto</th>
                </>
              ) : (
                <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>
                  {type === 'cv' ? 'Nota CV' : 'Nota prueba'}
                </th>
              )}
              <th style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>▾</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <>
                <tr
                  key={row.candidate_key}
                  onClick={() => toggle(row.candidate_key)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: expanded[row.candidate_key] ? 'var(--surface-alt, rgba(0,0,0,0.04))' : undefined,
                  }}
                >
                  <td style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>{row.display_name}</td>

                  {type === 'combined' ? (
                    <>
                      <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>
                        {row.cv_error
                          ? <span style={{ color: 'var(--error)', fontSize: '0.78rem' }} title={row.cv_error}>Error</span>
                          : <ScoreBadge score={row.cv_score} />}
                      </td>
                      <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>
                        {row.test_error
                          ? <span style={{ color: 'var(--error)', fontSize: '0.78rem' }} title={row.test_error}>Error</span>
                          : <>{EVAL_TYPE_LABEL[row.test_eval_type] || '—'}&nbsp;·&nbsp;<ScoreBadge score={row.test_score} /></>}
                      </td>
                      <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}><ScoreBadge score={row.average} /></td>
                      <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}><VerdictBadge verdict={row.verdict} /></td>
                    </>
                  ) : (
                    <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center' }}>
                      {row.error
                        ? <span style={{ color: 'var(--error)', fontSize: '0.78rem' }} title={row.error}>Error</span>
                        : <>
                            {type === 'test' && row.eval_type
                              ? <>{EVAL_TYPE_LABEL[row.eval_type] || row.eval_type}&nbsp;·&nbsp;</>
                              : null}
                            <ScoreBadge score={row.score} />
                          </>}
                    </td>
                  )}
                  <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center', color: 'var(--muted)' }}>
                    {expanded[row.candidate_key] ? '▲' : '▼'}
                  </td>
                </tr>

                {expanded[row.candidate_key] && (
                  <tr key={`${row.candidate_key}-detail`}>
                    <td
                      colSpan={type === 'combined' ? 6 : 3}
                      style={{
                        padding: '0.6rem 1rem 0.75rem',
                        background: 'var(--surface-alt, rgba(0,0,0,0.04))',
                        fontSize: '0.83rem',
                        lineHeight: 1.6,
                        borderBottom: '2px solid var(--border)',
                      }}
                    >
                      {/* CV/Test individual detail */}
                      {(type === 'cv' || type === 'test') && row.result && (
                        <>
                          <div><strong>Resumen:</strong> {row.result.executive_summary || row.result.overall_score_reason || '—'}</div>
                          {(row.result.strengths || row.result.gaps) && (
                            <div className="subtle">
                              {row.result.strengths?.length > 0 && <><strong>Fortalezas:</strong> {row.result.strengths.join(' · ')}<br /></>}
                              {row.result.gaps?.length > 0 && <><strong>Brechas:</strong> {row.result.gaps.join(' · ')}</>}
                              {row.result.areas_for_improvement?.length > 0 && <><strong>Mejoras:</strong> {row.result.areas_for_improvement.join(' · ')}</>}
                            </div>
                          )}
                          {row.result.red_flags?.length > 0 && (
                            <div style={{ color: 'var(--error)' }}><strong>Alertas:</strong> {row.result.red_flags.join(' · ')}</div>
                          )}
                        </>
                      )}
                      {(type === 'cv' || type === 'test') && row.error && (
                        <div style={{ color: 'var(--error)' }}><strong>Error:</strong> {row.error}</div>
                      )}

                      {/* Combined detail */}
                      {type === 'combined' && (
                        <>
                          {row.reasoning && <div><strong>Análisis de aptitud:</strong> {row.reasoning}</div>}
                          {row.red_flags && <div style={{ color: 'var(--error)', marginTop: '0.2rem' }}><strong>Alertas:</strong> {row.red_flags}</div>}
                          {row.error && <div style={{ color: 'var(--error)' }}><strong>Error:</strong> {row.error}</div>}
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {skippedFiles?.length > 0 && (
        <details style={{ marginTop: '0.6rem', fontSize: '0.8rem' }}>
          <summary className="subtle" style={{ cursor: 'pointer' }}>
            {skippedFiles.length} archivo(s) ignorado(s) — no siguen el formato esperado
          </summary>
          <ul style={{ margin: '0.4rem 0 0 1rem', color: 'var(--muted)' }}>
            {skippedFiles.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </details>
      )}
    </div>
  )
}
