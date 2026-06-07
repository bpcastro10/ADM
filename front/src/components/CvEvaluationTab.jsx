import FileUploadZone from './common/FileUploadZone'
import { CV_FILE_ACCEPT } from '../constants'

function CvEvaluationTab({
  jobs,
  selectedJob,
  selectedJobId,
  onJobChange,
  resumeFile,
  onResumeFileChange,
  fileInputKey,
  resumeError,
  resumeLoading,
  resumeResult,
  onEvaluateResume,
  onDownloadResumePdf,
}) {
  return (
    <div className="card">
      <h2>Evaluación de Hoja de Vida (CV)</h2>
      <p className="subtle">Selecciona el puesto; la rúbrica de requisitos viene de JSON Server.</p>

      <div className="form-group" style={{ marginTop: '1rem' }}>
        <label>Puesto</label>
        <select
          value={selectedJobId ?? ''}
          onChange={(e) => onJobChange(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— Seleccione un puesto —</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>
      </div>

      {selectedJob && (
        <div className="readonly-block">
          <h3>Descripción del trabajo</h3>
          <p>{selectedJob.description}</p>
          <h3>Características buscadas (rúbrica CV)</h3>
          <ul className="rubric-readonly">
            {selectedJob.soughtCharacteristics?.map((c, i) => (
              <li key={i}>
                <strong>{c.name}</strong>: {c.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-group">
        <label>CV (PDF/DOCX/TXT)</label>
        <FileUploadZone
          key={`cv-file-${fileInputKey}`}
          file={resumeFile}
          onChange={onResumeFileChange}
          accept={CV_FILE_ACCEPT}
          idleText="Haz clic para seleccionar archivo"
        />
        <p className="subtle">Si el PDF es escaneado, usa DOCX o TXT.</p>
      </div>
      {resumeError && <div className="error-msg">{resumeError}</div>}
      {resumeLoading && (
        <div className="loading">
          <div className="spinner" />
          <span>Evaluando CV con IA según la rúbrica del puesto...</span>
        </div>
      )}
      <div className="actions">
        <button className="btn btn-primary" onClick={onEvaluateResume} disabled={resumeLoading}>
          Evaluar CV
        </button>
        <button className="btn btn-secondary" onClick={onDownloadResumePdf} disabled={resumeLoading || !resumeResult}>
          Descargar PDF (CV)
        </button>
      </div>
    </div>
  )
}

export default CvEvaluationTab
