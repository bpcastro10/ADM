function CvResultPanel({
  resumeResult,
  hasCodeResult,
  resumeLoading,
  loading,
  onDownloadResumePdf,
  onDownloadUnifiedPdf,
}) {
  if (!resumeResult) return null

  return (
    <div className="result-section">
      <div className="result-card">
        <h3>Resultado (CV)</h3>
        {resumeResult.job_title && (
          <p className="subtle">Puesto: {resumeResult.job_title}</p>
        )}
        <div className="overall-score">{resumeResult.match_score}/5</div>
        <p className="subtle">{new Date(resumeResult.evaluated_at).toLocaleString('es')}</p>
        {resumeResult.resume_filename && (
          <p className="subtle">CV: {resumeResult.resume_filename}</p>
        )}
      </div>
      {resumeResult.overall_score_reason && (
        <div className="result-card">
          <h3>Por qué de la nota general</h3>
          <p>{resumeResult.overall_score_reason}</p>
        </div>
      )}
      <div className="result-card">
        <h3>Resumen ejecutivo</h3>
        <p>{resumeResult.executive_summary}</p>
      </div>
      {resumeResult.job_requirements_checklist?.length > 0 && (
        <div className="result-card">
          <h3>Rúbrica del puesto (evaluación)</h3>
          {resumeResult.job_requirements_checklist.map((item, i) => (
            <div key={i} className="criterion-eval">
              <div className="name">{item.requirement || 'Requisito'}</div>
              <div className="score">Estado: {(item.status || 'no evidenciado').toUpperCase()}</div>
              <div className="comments">{item.evidence || 'Sin evidencia'}</div>
            </div>
          ))}
        </div>
      )}
      <div className="result-card">
        <h3>Fortalezas</h3>
        <ul className="strengths-list">
          {resumeResult.strengths?.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
      <div className="result-card">
        <h3>Brechas (gaps)</h3>
        <ul className="improvements-list">
          {resumeResult.gaps?.map((g, i) => <li key={i}>{g}</li>)}
        </ul>
      </div>
      <div className="result-card">
        <h3>Recomendaciones</h3>
        <ul className="improvements-list">
          {resumeResult.recommendations?.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
      {hasCodeResult && (
        <div className="result-card">
          <h3>Reportes</h3>
          <div className="actions">
            <button className="btn btn-secondary" onClick={onDownloadResumePdf} disabled={resumeLoading}>
              Descargar PDF (CV)
            </button>
            <button className="btn btn-primary" onClick={onDownloadUnifiedPdf} disabled={loading || resumeLoading}>
              Descargar PDF unificado
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CvResultPanel
