function CombinedResultPanel({
  result,
  resumeResult,
  combinedResult,
  combinedLoading,
  loading,
  resumeLoading,
  onDownloadUnifiedPdf,
}) {
  if (result && resumeResult && !combinedResult && !combinedLoading) {
    return (
      <div className="result-section">
        <div className="result-card">
          <h3>Análisis de aptitud</h3>
          <p className="subtle">Genera el informe de aptitud a partir del CV y la prueba técnica del candidato actual.</p>
        </div>
      </div>
    )
  }

  if (!combinedResult) return null

  return (
    <div className="result-section">
      {combinedResult.applicable !== false && combinedResult.verdict ? (
        <div className={`result-card ${combinedResult.verdict === 'apto' ? 'verdict-apto' : 'verdict-no-apto'}`}>
          <h3>Veredicto</h3>
          <div className={`overall-score verdict-badge ${combinedResult.verdict}`}>
            {combinedResult.verdict === 'apto' ? 'APTO' : 'NO APTO'}
          </div>
        </div>
      ) : (
        <div className="result-card">
          <h3>Análisis no disponible</h3>
          <p className="detailed-reasoning">{combinedResult.detailed_reasoning}</p>
        </div>
      )}
      {combinedResult.applicable !== false && combinedResult.verdict && (
        <div className="result-card">
          <h3>Informe detallado</h3>
          <p className="detailed-reasoning">{combinedResult.detailed_reasoning}</p>
        </div>
      )}
      <div className="result-card">
        <button
          className="btn btn-primary"
          onClick={onDownloadUnifiedPdf}
          disabled={loading || resumeLoading || !result || !resumeResult}
        >
          Descargar PDF unificado
        </button>
      </div>
    </div>
  )
}

export default CombinedResultPanel
