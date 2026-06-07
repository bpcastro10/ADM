import { formatScore } from '../../utils/format'
import { isWrittenResult } from '../../utils/files'

function CodeResultPanel({ result }) {
  if (!result || result.message) return null

  return (
    <div className="result-section">
      <div className="result-card">
        <h3>{isWrittenResult(result) ? 'Resultado (Evaluación escrita)' : 'Resultado (Código)'}</h3>
        {result.technical_test_title && (
          <p className="subtle">Prueba: {result.technical_test_title}</p>
        )}
        <div className="overall-score">{formatScore(result.overall_score)}/5</div>
        <p className="subtle">{new Date(result.evaluated_at).toLocaleString('es')}</p>
        {result.source_type === 'zip' && (
          <p className="subtle">Origen: proyecto ZIP</p>
        )}
        {isWrittenResult(result) && (
          <p className="subtle">
            Origen: evaluación escrita
            {result.included_files?.[0] ? ` (${result.included_files[0]})` : ''}
          </p>
        )}
      </div>
      {result.source_type === 'zip' && (
        <div className="result-card">
          <h3>Proyecto ZIP analizado</h3>
          {result.included_files?.length > 0 && (
            <p className="subtle">
              Archivos incluidos en la evaluación ({result.included_files.length}):
              {' '}
              {result.included_files.slice(0, 12).join(', ')}
              {result.included_files.length > 12 ? '…' : ''}
            </p>
          )}
          {result.skipped_files?.length > 0 && (
            <p className="subtle">
              Archivos omitidos ({result.skipped_files.length}):
              {' '}
              {result.skipped_files.slice(0, 8).join(', ')}
              {result.skipped_files.length > 8 ? '…' : ''}
            </p>
          )}
          {result.project_tree && (
            <pre className="project-tree">{result.project_tree}</pre>
          )}
        </div>
      )}
      <div className="result-card">
        <h3>Evaluación por criterio</h3>
        {result.criteria_evaluations?.map((ce, i) => (
          <div key={i} className="criterion-eval">
            <div className="name">{ce.criterion_name}</div>
            <div className="score">Nota: {formatScore(ce.score)}/5</div>
            <div className="comments">{ce.comments}</div>
          </div>
        ))}
      </div>
      <div className="result-card">
        <h3>Resumen ejecutivo</h3>
        <p>{result.executive_summary}</p>
      </div>
      <div className="result-card">
        <h3>Fortalezas</h3>
        <ul className="strengths-list">
          {result.strengths?.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
      <div className="result-card">
        <h3>Áreas de mejora</h3>
        <ul className="improvements-list">
          {result.areas_for_improvement?.map((a, i) => <li key={i}>{a}</li>)}
        </ul>
      </div>
    </div>
  )
}

export default CodeResultPanel
