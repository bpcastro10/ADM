import { useState } from 'react'
import { formatScore } from '../utils/format'
import { downloadCandidatesTableCsv } from '../utils/csv'
import BulkCandidatesTable from './common/BulkCandidatesTable'

// ── Sub-pestaña: Análisis individual ─────────────────────────────────────

function IndividualAptitudeSection({
  result,
  resumeResult,
  combinedLoading,
  loading,
  resumeLoading,
  evaluationHistory,
  onGenerateAnalysis,
  onDownloadUnifiedPdf,
  onClearHistory,
}) {
  const ready = !!(result && resumeResult)

  return (
    <div style={{ marginTop: '1rem' }}>
      <p className="subtle">
        Evalúa primero una <strong>prueba técnica</strong> y el <strong>CV</strong> del candidato
        en sus respectivas pestañas; luego genera aquí el informe de aptitud individual.
      </p>

      <div
        style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: ready ? undefined : 'var(--surface-alt, rgba(0,0,0,0.03))',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          <span>
            Prueba técnica:{' '}
            <strong style={{ color: result ? 'var(--success)' : 'var(--muted)' }}>
              {result ? `${formatScore(result.overall_score)}/5 — ${result.candidate_name}` : 'Sin evaluar'}
            </strong>
          </span>
          <span>
            CV:{' '}
            <strong style={{ color: resumeResult ? 'var(--success)' : 'var(--muted)' }}>
              {resumeResult ? `${formatScore(resumeResult.match_score)}/5 — ${resumeResult.candidate_name}` : 'Sin evaluar'}
            </strong>
          </span>
        </div>

        {combinedLoading && (
          <div className="loading">
            <div className="spinner" />
            <span>Analizando resultados con IA...</span>
          </div>
        )}

        <div className="actions" style={{ marginTop: '0.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={onGenerateAnalysis}
            disabled={combinedLoading || !ready}
            title={!ready ? 'Evalúa primero la prueba técnica y el CV del candidato' : ''}
          >
            Generar informe de aptitud
          </button>
          <button
            className="btn btn-secondary"
            onClick={onDownloadUnifiedPdf}
            disabled={loading || resumeLoading || !ready}
            title={!ready ? 'Evalúa primero la prueba técnica y el CV del candidato' : ''}
          >
            Descargar PDF unificado
          </button>
        </div>

        {!ready && (
          <p className="subtle" style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
            Para activar: evalúa el candidato en <strong>Evaluación Técnica</strong> y en <strong>Evaluación de CV</strong>.
          </p>
        )}
      </div>

      {/* Historial */}
      {evaluationHistory.length > 0 && (
        <div className="candidates-history" style={{ marginTop: '1.5rem' }}>
          <div className="candidates-history-header">
            <h3>Candidatos evaluados ({evaluationHistory.length})</h3>
            <div className="actions" style={{ marginTop: 0 }}>
              <button type="button" className="btn btn-primary" onClick={() => downloadCandidatesTableCsv(evaluationHistory)}>
                Descargar tabla (CSV)
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClearHistory}>
                Vaciar listado
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table className="candidates-table">
              <thead>
                <tr>
                  <th>Candidato</th>
                  <th>Puesto</th>
                  <th>Prueba técnica</th>
                  <th>Nota prueba</th>
                  <th>Nota CV</th>
                  <th>Promedio</th>
                  <th>Veredicto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {[...evaluationHistory].reverse().map((row) => {
                  const avg = (Number(row.codeScore) + Number(row.cvScore)) / 2
                  return (
                    <tr key={row.id}>
                      <td>{row.candidateName}</td>
                      <td>{row.jobTitle || '—'}</td>
                      <td>{row.technicalTestTitle || '—'}</td>
                      <td>{formatScore(row.codeScore)}/5</td>
                      <td>{formatScore(row.cvScore)}/5</td>
                      <td>{Number.isNaN(avg) ? '—' : `${formatScore(avg)}/5`}</td>
                      <td>
                        <span className={`verdict-pill ${row.verdict}`}>
                          {row.verdict === 'apto' ? 'APTO' : 'NO APTO'}
                        </span>
                      </td>
                      <td>{new Date(row.evaluatedAt).toLocaleString('es')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-pestaña: Análisis masivo ──────────────────────────────────────────

function BulkAptitudeSection({
  bulkCvResults,
  bulkTestResults,
  bulkCombinedLoading,
  bulkCombinedResults,
  bulkCombinedError,
  onAnalyze,
}) {
  const cvCount = bulkCvResults?.results?.length ?? 0
  const testCount = bulkTestResults?.results?.length ?? 0
  const hasData = cvCount > 0 || testCount > 0

  return (
    <div style={{ marginTop: '1rem' }}>
      <p className="subtle">
        Cruza automáticamente los resultados de la <strong>carga masiva de CVs</strong> y{' '}
        <strong>carga masiva de pruebas técnicas</strong> por nombre de candidato
        y genera el veredicto para cada par coincidente.
      </p>

      {/* Estado de datos */}
      <div
        style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: hasData ? undefined : 'var(--surface-alt, rgba(0,0,0,0.03))',
        }}
      >
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
          <span>
            CVs evaluados:{' '}
            <strong style={{ color: cvCount > 0 ? 'var(--success)' : 'var(--muted)' }}>{cvCount}</strong>
          </span>
          <span>
            Pruebas evaluadas:{' '}
            <strong style={{ color: testCount > 0 ? 'var(--success)' : 'var(--muted)' }}>{testCount}</strong>
          </span>
        </div>

        {bulkCombinedError && (
          <div className="error-msg" style={{ marginBottom: '0.75rem' }}>{bulkCombinedError}</div>
        )}

        <button
          type="button"
          className="btn btn-primary"
          onClick={onAnalyze}
          disabled={bulkCombinedLoading || !hasData}
          title={!hasData ? 'Primero evalúa candidatos en Carga masiva de CV y Carga masiva de Pruebas' : ''}
        >
          {bulkCombinedLoading ? 'Analizando aptitud…' : 'Analizar aptitud masiva'}
        </button>

        {!hasData && (
          <p className="subtle" style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
            Para activar: ve a <strong>Evaluación de CV → Carga masiva</strong> y/o{' '}
            <strong>Evaluación Técnica → Carga masiva</strong> y evalúa los candidatos primero.
          </p>
        )}

        {bulkCombinedLoading && (
          <div className="loading" style={{ marginTop: '0.75rem' }}>
            <div className="spinner" />
            <span>La IA analiza cada par candidato. Puede tardar varios minutos…</span>
          </div>
        )}
      </div>

      {/* Resultados */}
      {bulkCombinedResults && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span className="subtle">
              Pares analizados: <strong>{bulkCombinedResults.total_matched}</strong>
            </span>
            {bulkCombinedResults.unmatched_cvs?.length > 0 && (
              <span className="subtle">
                CVs sin prueba: <strong>{bulkCombinedResults.unmatched_cvs.join(', ')}</strong>
              </span>
            )}
            {bulkCombinedResults.unmatched_tests?.length > 0 && (
              <span className="subtle">
                Pruebas sin CV: <strong>{bulkCombinedResults.unmatched_tests.join(', ')}</strong>
              </span>
            )}
          </div>
          <BulkCandidatesTable
            results={bulkCombinedResults.results}
            skippedFiles={[]}
            type="combined"
          />
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────

function CombinedAnalysisTab({
  result,
  resumeResult,
  combinedLoading,
  loading,
  resumeLoading,
  evaluationHistory,
  onGenerateAnalysis,
  onDownloadUnifiedPdf,
  onClearHistory,
  bulkCvResults,
  bulkTestResults,
  bulkCombinedLoading,
  bulkCombinedResults,
  bulkCombinedError,
  onAnalyzeBulkCombined,
}) {
  const [subTab, setSubTab] = useState('individual')
  const bulkHasResults = !!(bulkCombinedResults?.results?.length)

  return (
    <div className="card">
      <h2>Análisis de Aptitud</h2>

      {/* Sub-pestañas */}
      <div className="tabs tabs-nested" style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className={`tab-btn ${subTab === 'individual' ? 'active' : ''}`}
          onClick={() => setSubTab('individual')}
        >
          Individual
          {evaluationHistory.length > 0 && (
            <span className="tab-badge">{evaluationHistory.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`tab-btn ${subTab === 'masivo' ? 'active' : ''}`}
          onClick={() => setSubTab('masivo')}
        >
          Carga masiva
          {bulkHasResults && (
            <span className="tab-badge">{bulkCombinedResults.results.length}</span>
          )}
        </button>
      </div>

      {subTab === 'individual' && (
        <IndividualAptitudeSection
          result={result}
          resumeResult={resumeResult}
          combinedLoading={combinedLoading}
          loading={loading}
          resumeLoading={resumeLoading}
          evaluationHistory={evaluationHistory}
          onGenerateAnalysis={onGenerateAnalysis}
          onDownloadUnifiedPdf={onDownloadUnifiedPdf}
          onClearHistory={onClearHistory}
        />
      )}

      {subTab === 'masivo' && (
        <BulkAptitudeSection
          bulkCvResults={bulkCvResults}
          bulkTestResults={bulkTestResults}
          bulkCombinedLoading={bulkCombinedLoading}
          bulkCombinedResults={bulkCombinedResults}
          bulkCombinedError={bulkCombinedError}
          onAnalyze={onAnalyzeBulkCombined}
        />
      )}
    </div>
  )
}

export default CombinedAnalysisTab
