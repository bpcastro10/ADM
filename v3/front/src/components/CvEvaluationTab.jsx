import { useRef, useState } from 'react'
import FileUploadZone from './common/FileUploadZone'
import { CV_FILE_ACCEPT } from '../constants'
import BulkCandidatesTable from './common/BulkCandidatesTable'

// ── Sección de carga masiva de CVs ────────────────────────────────────────

function BulkCvSection({
  jobs,
  bulkCvZip,
  bulkCvJobId,
  onJobChange,
  onZipChange,
  onClearZip,
  bulkCvLoading,
  bulkCvResults,
  bulkCvError,
  onEvaluate,
  fileInputKey,
}) {
  const zipRef = useRef(null)

  return (
    <div style={{ marginTop: '1rem' }}>
      <p className="subtle">
        Sube un ZIP con los CVs de todos los candidatos. Cada archivo debe llamarse
        <code> nombre-apellido-cv.pdf</code> (o .docx / .txt).
        Los resultados quedarán disponibles para el análisis de aptitud masiva.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <div className="form-group">
          <label>Puesto de trabajo <span style={{ color: 'var(--error)' }}>*</span></label>
          <select value={bulkCvJobId} onChange={(e) => onJobChange(e.target.value)}>
            <option value="">— Seleccione un puesto —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>ZIP con CVs <span style={{ color: 'var(--error)' }}>*</span></label>
          <input
            key={`bulk-cv-zip-${fileInputKey}`}
            ref={zipRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={onZipChange}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => zipRef.current?.click()}
              disabled={bulkCvLoading}
            >
              {bulkCvZip ? '↑ Cambiar ZIP' : '↑ Seleccionar ZIP'}
            </button>
            {bulkCvZip && (
              <>
                <span className="subtle" style={{ fontSize: '0.85rem' }}>
                  {bulkCvZip.name} ({(bulkCvZip.size / 1024).toFixed(0)} KB)
                </span>
                <button type="button" className="btn btn-danger btn-icon" onClick={onClearZip} disabled={bulkCvLoading} title="Quitar">✕</button>
              </>
            )}
          </div>
        </div>

        {bulkCvError && <div className="error-msg">{bulkCvError}</div>}

        <div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onEvaluate}
            disabled={bulkCvLoading || !bulkCvZip || !bulkCvJobId}
          >
            {bulkCvLoading ? 'Evaluando CVs…' : 'Evaluar todos los CVs'}
          </button>
          {bulkCvLoading && (
            <p className="subtle" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              La IA evalúa cada CV individualmente. Puede tardar varios minutos.
            </p>
          )}
        </div>
      </div>

      {bulkCvResults && (
        <BulkCandidatesTable
          results={bulkCvResults.results}
          skippedFiles={bulkCvResults.skipped_files}
          type="cv"
        />
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────

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
  // Bulk
  bulkCvZip,
  bulkCvJobId,
  onBulkCvJobChange,
  onBulkCvZipChange,
  onClearBulkCvZip,
  bulkCvLoading,
  bulkCvResults,
  bulkCvError,
  onEvaluateBulkCv,
}) {
  const [subTab, setSubTab] = useState('individual')

  return (
    <div className="card">
      <h2>Evaluación de Hoja de Vida (CV)</h2>

      <div className="tabs tabs-nested" style={{ marginTop: '0.75rem' }}>
        <button
          type="button"
          className={`tab-btn ${subTab === 'individual' ? 'active' : ''}`}
          onClick={() => setSubTab('individual')}
        >
          Individual
        </button>
        <button
          type="button"
          className={`tab-btn ${subTab === 'masivo' ? 'active' : ''}`}
          onClick={() => setSubTab('masivo')}
        >
          Carga masiva
          {bulkCvResults?.results?.length > 0 && (
            <span className="tab-badge">{bulkCvResults.results.length}</span>
          )}
        </button>
      </div>

      {subTab === 'individual' && (
        <>
          <p className="subtle" style={{ marginTop: '0.75rem' }}>
            Selecciona el puesto; la rúbrica de requisitos viene de JSON Server.
          </p>

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
                  <li key={i}><strong>{c.name}</strong>: {c.description}</li>
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
        </>
      )}

      {subTab === 'masivo' && (
        <BulkCvSection
          jobs={jobs}
          bulkCvZip={bulkCvZip}
          bulkCvJobId={bulkCvJobId}
          onJobChange={onBulkCvJobChange}
          onZipChange={onBulkCvZipChange}
          onClearZip={onClearBulkCvZip}
          bulkCvLoading={bulkCvLoading}
          bulkCvResults={bulkCvResults}
          bulkCvError={bulkCvError}
          onEvaluate={onEvaluateBulkCv}
          fileInputKey={fileInputKey}
        />
      )}
    </div>
  )
}

export default CvEvaluationTab
