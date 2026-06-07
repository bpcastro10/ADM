import FileUploadZone from './common/FileUploadZone'
import ScoreScaleReadonly from './common/ScoreScaleReadonly'
import { CODE_FILE_ACCEPT, WRITTEN_FILE_ACCEPT } from '../constants'

function CodeEvaluationTab({
  technicalTests,
  selectedTest,
  codeEvalSubTab,
  onSubTabChange,
  selectedTechnicalTestId,
  onTechnicalTestChange,
  language,
  onLanguageChange,
  uploadedFile,
  onFileChange,
  onClearUploadedFile,
  zipUpload,
  code,
  onCodeChange,
  documentFile,
  onDocumentFileChange,
  onClearDocumentFile,
  fileInputKey,
  error,
  loading,
  onEvaluate,
  onEvaluateWritten,
  onDownloadPdf,
}) {
  return (
    <>
      <div className="card">
        <h2>Evaluación de Código</h2>
        <p className="subtle">Envía código fuente o un documento con evaluación escrita (cuestionario, prueba teórica, etc.).</p>

        <div className="tabs tabs-nested" role="tablist" aria-label="Modo de evaluación" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className={`tab-btn ${codeEvalSubTab === 'code' ? 'active' : ''}`}
            onClick={() => onSubTabChange('code')}
            role="tab"
            aria-selected={codeEvalSubTab === 'code'}
          >
            Código fuente
          </button>
          <button
            type="button"
            className={`tab-btn ${codeEvalSubTab === 'written' ? 'active' : ''}`}
            onClick={() => onSubTabChange('written')}
            role="tab"
            aria-selected={codeEvalSubTab === 'written'}
          >
            Evaluación escrita
          </button>
        </div>

        {codeEvalSubTab === 'code' && (
          <>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Prueba técnica</label>
              <select
                value={selectedTechnicalTestId ?? ''}
                onChange={(e) => onTechnicalTestChange(e.target.value)}
              >
                <option value="">— Seleccione una prueba técnica —</option>
                {technicalTests.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            {selectedTest && (
              <div className="readonly-block">
                <h3>Enunciado</h3>
                <p>{selectedTest.brief}</p>
                <h3>Rúbrica oficial</h3>
                <ul className="rubric-readonly">
                  {selectedTest.rubric?.criteria?.map((c, i) => (
                    <li key={i}>
                      <strong>{c.name}</strong>: {c.description}
                    </li>
                  ))}
                </ul>
                <ScoreScaleReadonly test={selectedTest} />
              </div>
            )}

            <div className="form-group">
              <label>Lenguaje</label>
              <select value={language} onChange={(e) => onLanguageChange(e.target.value)}>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="typescript">TypeScript</option>
                <option value="text">Otro / Texto</option>
              </select>
            </div>
            <div className="form-group">
              <label>Archivo o proyecto ZIP</label>
              <FileUploadZone
                key={`code-file-${fileInputKey}`}
                file={uploadedFile}
                onChange={onFileChange}
                onClear={onClearUploadedFile}
                isZip={zipUpload}
                accept={CODE_FILE_ACCEPT}
                idleText="Selecciona un archivo de código o un proyecto .zip"
              />
              {zipUpload && (
                <p className="subtle">
                  El backend extraerá el ZIP, analizará la estructura de carpetas y evaluará los archivos de texto del proyecto.
                </p>
              )}
            </div>
            <div className="form-group">
              <label>{zipUpload ? 'Código (no necesario con ZIP)' : 'Código (opcional si subes archivo)'}</label>
              <textarea
                className="code-input"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                disabled={zipUpload}
                placeholder={
                  zipUpload
                    ? 'Con un ZIP cargado la evaluación usa el contenido del proyecto.'
                    : 'Pega el código fuente del candidato...'
                }
                rows={10}
              />
            </div>
          </>
        )}

        {codeEvalSubTab === 'written' && (
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Documento de evaluación escrita (PDF/DOCX/TXT)</label>
            <FileUploadZone
              key={`written-file-${fileInputKey}`}
              file={documentFile}
              onChange={onDocumentFileChange}
              onClear={onClearDocumentFile}
              accept={WRITTEN_FILE_ACCEPT}
              idleText="Selecciona un cuestionario, prueba escrita o documento similar"
            />
            <p className="subtle">
              La IA analizará el documento (cuestionario, preguntas abiertas, casos teóricos, etc.),
              derivará criterios del contenido y calificará con exigencia (0–5 con decimales).
            </p>
          </div>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading && (
        <div className="loading">
          <div className="spinner" />
          <span>
            {codeEvalSubTab === 'written'
              ? 'Extrayendo texto y evaluando documento escrito con IA...'
              : zipUpload
                ? 'Procesando proyecto ZIP y evaluando con IA...'
                : 'Evaluando código con IA según la rúbrica oficial...'}
          </span>
        </div>
      )}
      <div className="actions">
        {codeEvalSubTab === 'code' ? (
          <>
            <button className="btn btn-primary" onClick={() => onEvaluate(false)} disabled={loading}>
              Evaluar código
            </button>
            <button className="btn btn-secondary" onClick={onDownloadPdf} disabled={loading}>
              Descargar PDF (código)
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary" onClick={() => onEvaluateWritten(false)} disabled={loading}>
              Evaluar escrito
            </button>
            <button className="btn btn-secondary" onClick={onDownloadPdf} disabled={loading}>
              Descargar PDF (escrito)
            </button>
          </>
        )}
      </div>
    </>
  )
}

export default CodeEvaluationTab
