import { formatScore } from '../utils/format'
import { downloadCandidatesTableCsv } from '../utils/csv'

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
}) {
  return (
    <div className="card">
      <h2>Análisis de Aptitud (CV + Prueba técnica)</h2>
      <p className="subtle">
        Genera el veredicto integrando el CV y la prueba técnica (código fuente o evaluación escrita).
        Al completar el análisis se añade a la tabla de candidatos evaluados.
      </p>
      {result && resumeResult ? (
        <>
          {combinedLoading && (
            <div className="loading">
              <div className="spinner" />
              <span>Analizando resultados con IA...</span>
            </div>
          )}
          <div className="actions">
            <button className="btn btn-primary" onClick={onGenerateAnalysis} disabled={combinedLoading}>
              Generar informe de aptitud
            </button>
            <button className="btn btn-secondary" onClick={onDownloadUnifiedPdf} disabled={loading || resumeLoading}>
              Descargar PDF unificado
            </button>
          </div>
        </>
      ) : (
        <p className="subtle">
          Evalúa una prueba técnica (código o escrito) y el CV del candidato para generar un informe de aptitud.
        </p>
      )}

      {evaluationHistory.length > 0 && (
        <div className="candidates-history" style={{ marginTop: '1.5rem' }}>
          <div className="candidates-history-header">
            <h3>Candidatos evaluados ({evaluationHistory.length})</h3>
            <div className="actions" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => downloadCandidatesTableCsv(evaluationHistory)}
              >
                Descargar tabla (CSV)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClearHistory}
              >
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

export default CombinedAnalysisTab
