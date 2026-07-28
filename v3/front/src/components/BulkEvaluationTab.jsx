import { useRef, useState } from 'react'

const EVAL_TYPE_LABEL = {
  code: 'Código',
  written: 'Escrito',
  notebook: 'Notebook',
  zip: 'Proyecto ZIP',
}

function ScoreBadge({ score }) {
  if (score == null) return <span className="subtle">—</span>
  const val = Number(score).toFixed(1)
  const color =
    score >= 4.0 ? 'var(--success)' : score >= 3.0 ? 'var(--warning, #e6a817)' : 'var(--error)'
  return <strong style={{ color }}>{val}</strong>
}

function VerdictBadge({ verdict }) {
  if (!verdict) return <span className="subtle">—</span>
  const isApto = verdict.toLowerCase() === 'apto'
  return (
    <span
      style={{
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '0.8rem',
        fontWeight: 700,
        background: isApto ? 'var(--success)' : 'var(--error)',
        color: '#fff',
      }}
    >
      {isApto ? 'APTO' : 'NO APTO'}
    </span>
  )
}

function CandidateRow({ row, expanded, onToggle }) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          background: expanded ? 'var(--surface-alt, rgba(0,0,0,0.04))' : undefined,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <td style={{ padding: '0.5rem' }}><strong>{row.display_name}</strong></td>
        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
          {row.cv_error
            ? <span style={{ color: 'var(--error)', fontSize: '0.78rem' }} title={row.cv_error}>Error</span>
            : <ScoreBadge score={row.cv_score} />}
        </td>
        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
          {row.test_error
            ? <span style={{ color: 'var(--error)', fontSize: '0.78rem' }} title={row.test_error}>Error</span>
            : <>{EVAL_TYPE_LABEL[row.test_eval_type] || '—'}&nbsp;·&nbsp;<ScoreBadge score={row.test_score} /></>}
        </td>
        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
          <ScoreBadge score={row.combined_average} />
        </td>
        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
          <VerdictBadge verdict={row.combined_verdict} />
        </td>
        <td style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
          {expanded ? '▲' : '▼'}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td
            colSpan={6}
            style={{
              padding: '0.75rem 1rem 1rem',
              background: 'var(--surface-alt, rgba(0,0,0,0.04))',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              borderBottom: '2px solid var(--border)',
            }}
          >
            {/* CV */}
            {row.cv_result && (
              <div style={{ marginBottom: '0.6rem' }}>
                <strong>CV:</strong> {row.cv_result.executive_summary}
                {row.cv_result.gaps?.length > 0 && (
                  <div className="subtle"><em>Brechas:</em> {row.cv_result.gaps.join(' · ')}</div>
                )}
                {row.cv_result.red_flags?.length > 0 && (
                  <div style={{ color: 'var(--error)' }}><em>Alertas:</em> {row.cv_result.red_flags.join(' · ')}</div>
                )}
              </div>
            )}
            {row.cv_error && (
              <div style={{ color: 'var(--error)', marginBottom: '0.5rem' }}>
                <strong>Error CV:</strong> {row.cv_error}
              </div>
            )}

            {/* Prueba técnica */}
            {row.test_result && (
              <div style={{ marginBottom: '0.6rem' }}>
                <strong>Prueba técnica ({EVAL_TYPE_LABEL[row.test_eval_type] || row.test_eval_type}):</strong>{' '}
                {row.test_result.executive_summary}
                {row.test_result.areas_for_improvement?.length > 0 && (
                  <div className="subtle"><em>Mejoras:</em> {row.test_result.areas_for_improvement.join(' · ')}</div>
                )}
              </div>
            )}
            {row.test_error && (
              <div style={{ color: 'var(--error)', marginBottom: '0.5rem' }}>
                <strong>Error prueba:</strong> {row.test_error}
              </div>
            )}

            {/* Análisis de aptitud */}
            {row.combined_reasoning && (
              <div>
                <strong>Análisis de aptitud:</strong> {row.combined_reasoning}
                {row.combined_red_flags && (
                  <div style={{ color: 'var(--error)', marginTop: '0.25rem' }}>
                    <strong>Alertas:</strong> {row.combined_red_flags}
                  </div>
                )}
              </div>
            )}
            {row.combined_error && (
              <div style={{ color: 'var(--error)' }}>
                <strong>Error aptitud:</strong> {row.combined_error}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function BulkResultsTable({ results }) {
  const [expandedKeys, setExpandedKeys] = useState({})

  const toggleRow = (key) =>
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }))

  const { results: rows = [], unmatched_cvs = [], unmatched_tests = [],
    skipped_files = [], total_cv, total_test, total_combined } = results

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {/* Resumen */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <span className="subtle">CVs procesados: <strong>{total_cv}</strong></span>
        <span className="subtle">Pruebas procesadas: <strong>{total_test}</strong></span>
        <span className="subtle">Análisis de aptitud: <strong>{total_combined}</strong></span>
        <span className="subtle">Candidatos totales: <strong>{rows.length}</strong></span>
      </div>

      {rows.length === 0 ? (
        <p className="subtle">No se encontraron candidatos en el ZIP.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', background: 'var(--surface-alt, rgba(0,0,0,0.04))' }}>
                <th style={{ padding: '0.5rem' }}>Candidato</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Nota CV</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Prueba técnica</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Promedio</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Veredicto</th>
                <th style={{ padding: '0.5rem', textAlign: 'center' }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <CandidateRow
                  key={row.candidate_key}
                  row={row}
                  expanded={!!expandedKeys[row.candidate_key]}
                  onToggle={() => toggleRow(row.candidate_key)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sin coincidencia */}
      {(unmatched_cvs.length > 0 || unmatched_tests.length > 0) && (
        <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
          {unmatched_cvs.length > 0 && (
            <p className="subtle">
              <strong>CVs sin prueba técnica asociada:</strong> {unmatched_cvs.join(', ')}
            </p>
          )}
          {unmatched_tests.length > 0 && (
            <p className="subtle">
              <strong>Pruebas sin CV asociado:</strong> {unmatched_tests.join(', ')}
            </p>
          )}
        </div>
      )}

      {skipped_files.length > 0 && (
        <details style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
          <summary className="subtle" style={{ cursor: 'pointer' }}>
            {skipped_files.length} archivo(s) ignorado(s) — no siguen el formato esperado
          </summary>
          <ul style={{ margin: '0.5rem 0 0 1rem', color: 'var(--muted)' }}>
            {skipped_files.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </details>
      )}
    </div>
  )
}

function BulkEvaluationTab({
  jobs,
  technicalTests,
  zipFile,
  selectedJobId,
  onJobChange,
  selectedTestId,
  onTestChange,
  onZipFileChange,
  onClearZipFile,
  fileInputKey,
  loading,
  results,
  error,
  onEvaluate,
}) {
  const fileInputRef = useRef(null)

  return (
    <div className="card">
      <h2>Evaluación masiva</h2>
      <p className="subtle">
        Sube un ZIP con los archivos de todos los candidatos. El sistema los evalúa en lote y realiza
        el análisis de aptitud para los que tengan CV y prueba técnica con el mismo nombre.
      </p>

      {/* Instrucciones de formato */}
      <div
        className="subtle"
        style={{
          background: 'var(--surface-alt, rgba(0,0,0,0.04))',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginTop: '1rem',
          fontSize: '0.85rem',
          lineHeight: 1.7,
        }}
      >
        <strong>Formato de nombres de archivos dentro del ZIP:</strong>
        <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
          <li><code>juan-perez-cv.pdf</code> — CV del candidato</li>
          <li><code>juan-perez-prueba.py</code> — Entrega técnica (código, PDF, DOCX, .ipynb, ZIP…)</li>
        </ul>
        <div style={{ marginTop: '0.25rem' }}>
          El prefijo <strong>nombre-apellido</strong> debe coincidir exactamente para calcular el análisis de aptitud.
        </div>
      </div>

      <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Puesto */}
        <div className="form-group">
          <label>Puesto de trabajo <span style={{ color: 'var(--error)' }}>*</span></label>
          <select value={selectedJobId} onChange={(e) => onJobChange(e.target.value)}>
            <option value="">— Seleccione un puesto —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>

        {/* Prueba técnica */}
        <div className="form-group">
          <label>Prueba técnica <span className="subtle">(opcional — necesaria para archivos de código fuente y ZIP)</span></label>
          <select value={selectedTestId} onChange={(e) => onTestChange(e.target.value)}>
            <option value="">— Sin prueba técnica (evaluación escrita automática) —</option>
            {technicalTests.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        {/* ZIP */}
        <div className="form-group">
          <label>Archivo ZIP con los candidatos <span style={{ color: 'var(--error)' }}>*</span></label>
          <input
            key={fileInputKey}
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={onZipFileChange}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              {zipFile ? '↑ Cambiar ZIP' : '↑ Seleccionar ZIP'}
            </button>
            {zipFile && (
              <>
                <span className="subtle" style={{ fontSize: '0.85rem' }}>
                  {zipFile.name} ({(zipFile.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  className="btn btn-danger btn-icon"
                  onClick={onClearZipFile}
                  disabled={loading}
                  title="Quitar archivo"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onEvaluate}
            disabled={loading || !zipFile || !selectedJobId}
          >
            {loading ? 'Evaluando candidatos…' : 'Evaluar todos los candidatos'}
          </button>
          {loading && (
            <p className="subtle" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              La IA procesa cada archivo individualmente. Puede tomar varios minutos según la cantidad de candidatos.
            </p>
          )}
        </div>
      </div>

      {results && <BulkResultsTable results={results} />}
    </div>
  )
}

export default BulkEvaluationTab
