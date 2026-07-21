import { useRef } from 'react'
import FileUploadZone from './common/FileUploadZone'
import ScoreScaleReadonly from './common/ScoreScaleReadonly'
import BulkCandidatesTable from './common/BulkCandidatesTable'
import { SOLUTION_FILE_ACCEPT, WRITTEN_FILE_ACCEPT, NOTEBOOK_FILE_ACCEPT, FORMAT_OPTIONS } from '../constants'

function BulkTestSection({
  technicalTests,
  bulkTestZip,
  bulkTestId,
  onTestChange,
  onZipChange,
  onClearZip,
  bulkTestLoading,
  bulkTestResults,
  bulkTestError,
  onEvaluate,
  fileInputKey,
}) {
  const zipRef = useRef(null)
  return (
    <div style={{ marginTop: '1rem' }}>
      <p className="subtle">
        Sube un ZIP con las entregas de todos los candidatos. Cada archivo debe llamarse
        <code> nombre-apellido-prueba.ext</code>.
        Admite código, PDF, DOCX, TXT, .ipynb y .zip de proyecto.
        Los resultados quedarán disponibles para el análisis de aptitud masiva.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <div className="form-group">
          <label>Prueba técnica <span className="subtle">(opcional — necesaria para código fuente y ZIP)</span></label>
          <select value={bulkTestId} onChange={(e) => onTestChange(e.target.value)}>
            <option value="">— Sin prueba técnica (evaluación escrita automática) —</option>
            {technicalTests.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>ZIP con entregas técnicas <span style={{ color: 'var(--error)' }}>*</span></label>
          <input
            key={`bulk-test-zip-${fileInputKey}`}
            ref={zipRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={onZipChange}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={() => zipRef.current?.click()} disabled={bulkTestLoading}>
              {bulkTestZip ? '↑ Cambiar ZIP' : '↑ Seleccionar ZIP'}
            </button>
            {bulkTestZip && (
              <>
                <span className="subtle" style={{ fontSize: '0.85rem' }}>
                  {bulkTestZip.name} ({(bulkTestZip.size / 1024).toFixed(0)} KB)
                </span>
                <button type="button" className="btn btn-danger btn-icon" onClick={onClearZip} disabled={bulkTestLoading} title="Quitar">✕</button>
              </>
            )}
          </div>
        </div>
        {bulkTestError && <div className="error-msg">{bulkTestError}</div>}
        <div>
          <button type="button" className="btn btn-primary" onClick={onEvaluate} disabled={bulkTestLoading || !bulkTestZip}>
            {bulkTestLoading ? 'Evaluando entregas…' : 'Evaluar todas las entregas'}
          </button>
          {bulkTestLoading && (
            <p className="subtle" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              La IA evalúa cada entrega individualmente. Puede tardar varios minutos.
            </p>
          )}
        </div>
      </div>
      {bulkTestResults && (
        <BulkCandidatesTable
          results={bulkTestResults.results}
          skippedFiles={bulkTestResults.skipped_files}
          type="test"
        />
      )}
    </div>
  )
}

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
  notebookFile,
  onNotebookFileChange,
  onClearNotebookFile,
  fileInputKey,
  error,
  loading,
  onEvaluate,
  onEvaluateWritten,
  onEvaluateNotebook,
  onDownloadPdf,
  // Bulk
  bulkTestZip,
  bulkTestId,
  onBulkTestIdChange,
  onBulkTestZipChange,
  onClearBulkTestZip,
  bulkTestLoading,
  bulkTestResults,
  bulkTestError,
  onEvaluateBulkTest,
}) {
  const isZipUpload = zipUpload
  const isPdfOrDoc = uploadedFile && /\.(pdf|docx|doc)$/i.test(uploadedFile.name)

  const loadingLabel = () => {
    if (codeEvalSubTab === 'written') return 'Extrayendo texto y evaluando documento escrito con IA...'
    if (codeEvalSubTab === 'notebook') return 'Leyendo notebook y evaluando solución con IA...'
    if (isZipUpload) return 'Procesando proyecto ZIP y evaluando con IA...'
    if (isPdfOrDoc) return 'Extrayendo texto del documento y evaluando con IA...'
    return 'Evaluando entrega con IA según la rúbrica de la prueba...'
  }

  return (
    <>
      <div className="card">
        <h2>Evaluación Técnica</h2>
        <p className="subtle">
          Envía la solución del candidato para evaluarla según la rúbrica de la prueba.
          Admite código, documentos, archivos ZIP y notebooks Jupyter/Colab.
        </p>

        {/* Sub-pestañas */}
        <div className="tabs tabs-nested" role="tablist" aria-label="Modo de evaluación" style={{ marginTop: '1rem' }}>
          <button type="button" className={`tab-btn ${codeEvalSubTab === 'code' ? 'active' : ''}`} onClick={() => onSubTabChange('code')} role="tab">
            Solución / Entrega
          </button>
          <button type="button" className={`tab-btn ${codeEvalSubTab === 'written' ? 'active' : ''}`} onClick={() => onSubTabChange('written')} role="tab">
            Evaluación escrita
          </button>
          <button type="button" className={`tab-btn ${codeEvalSubTab === 'notebook' ? 'active' : ''}`} onClick={() => onSubTabChange('notebook')} role="tab">
            Notebook Jupyter/Colab
          </button>
          <button type="button" className={`tab-btn ${codeEvalSubTab === 'masivo' ? 'active' : ''}`} onClick={() => onSubTabChange('masivo')} role="tab">
            Carga masiva
            {bulkTestResults?.results?.length > 0 && (
              <span className="tab-badge">{bulkTestResults.results.length}</span>
            )}
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Solución / Entrega (código, ZIP, PDF, DOCX, texto)                 */}
        {/* ------------------------------------------------------------------ */}
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
              <label>Formato de la entrega</label>
              <select value={language} onChange={(e) => onLanguageChange(e.target.value)}>
                {FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Archivo de solución</label>
              <FileUploadZone
                key={`code-file-${fileInputKey}`}
                file={uploadedFile}
                onChange={onFileChange}
                onClear={onClearUploadedFile}
                isZip={isZipUpload}
                accept={SOLUTION_FILE_ACCEPT}
                idleText="Código, proyecto .zip, PDF, DOCX o texto plano"
              />
              {isZipUpload && (
                <p className="subtle">
                  Se analizará la estructura del proyecto ZIP y todos los archivos de texto que contiene.
                </p>
              )}
              {isPdfOrDoc && (
                <p className="subtle">
                  El texto del documento será extraído automáticamente y evaluado contra la rúbrica.
                </p>
              )}
            </div>
            <div className="form-group">
              <label>
                {isZipUpload
                  ? 'Texto (no requerido con ZIP)'
                  : 'Texto de la entrega (opcional si subes archivo)'}
              </label>
              <textarea
                className="code-input"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                disabled={isZipUpload}
                placeholder={
                  isZipUpload
                    ? 'Con un ZIP cargado la evaluación usa el contenido del proyecto.'
                    : 'Pega aquí la solución del candidato (código, texto, análisis, etc.)...'
                }
                rows={10}
              />
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Evaluación escrita (cuestionario, caso, prueba teórica)             */}
        {/* ------------------------------------------------------------------ */}
        {codeEvalSubTab === 'written' && (
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Documento de evaluación escrita (PDF / DOCX / TXT)</label>
            <FileUploadZone
              key={`written-file-${fileInputKey}`}
              file={documentFile}
              onChange={onDocumentFileChange}
              onClear={onClearDocumentFile}
              accept={WRITTEN_FILE_ACCEPT}
              idleText="Cuestionario, prueba escrita, caso de negocio, ensayo u otro documento"
            />
            <p className="subtle">
              Válido para cualquier puesto. La IA analiza el documento completo,
              identifica los temas evaluados y califica con criterios estrictos (0–5 con decimales).
              No requiere seleccionar una prueba técnica del sistema.
            </p>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Notebook Jupyter / Colab                                            */}
        {/* ------------------------------------------------------------------ */}
        {codeEvalSubTab === 'notebook' && (
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Archivo Jupyter / Google Colab (.ipynb)</label>
            <FileUploadZone
              key={`notebook-file-${fileInputKey}`}
              file={notebookFile}
              onChange={onNotebookFileChange}
              onClear={onClearNotebookFile}
              accept={NOTEBOOK_FILE_ACCEPT}
              idleText="Selecciona un archivo .ipynb (Jupyter o Google Colab)"
            />
            <p className="subtle">
              El notebook puede contener <strong>instrucciones en celdas markdown</strong> y{' '}
              <strong>solución en celdas de código</strong> en el mismo archivo.
              La IA evalúa la solución contra las instrucciones del notebook con criterios estrictos (0–5 con decimales).
            </p>
          </div>
        )}

        {/* Sub-pestaña Masivo — dentro del card */}
        {codeEvalSubTab === 'masivo' && (
          <BulkTestSection
            technicalTests={technicalTests}
            bulkTestZip={bulkTestZip}
            bulkTestId={bulkTestId}
            onTestChange={onBulkTestIdChange}
            onZipChange={onBulkTestZipChange}
            onClearZip={onClearBulkTestZip}
            bulkTestLoading={bulkTestLoading}
            bulkTestResults={bulkTestResults}
            bulkTestError={bulkTestError}
            onEvaluate={onEvaluateBulkTest}
            fileInputKey={fileInputKey}
          />
        )}
      </div>

      {/* Error, loading y botones solo para pestañas individuales */}
      {codeEvalSubTab !== 'masivo' && (
        <>
          {error && <div className="error-msg">{error}</div>}
          {loading && (
            <div className="loading">
              <div className="spinner" />
              <span>{loadingLabel()}</span>
            </div>
          )}
          <div className="actions">
            {codeEvalSubTab === 'code' && (
              <>
                <button className="btn btn-primary" onClick={() => onEvaluate(false)} disabled={loading}>
                  Evaluar entrega
                </button>
                <button className="btn btn-secondary" onClick={onDownloadPdf} disabled={loading}>
                  Descargar PDF
                </button>
              </>
            )}
            {codeEvalSubTab === 'written' && (
              <>
                <button className="btn btn-primary" onClick={() => onEvaluateWritten(false)} disabled={loading}>
                  Evaluar escrito
                </button>
                <button className="btn btn-secondary" onClick={onDownloadPdf} disabled={loading}>
                  Descargar PDF
                </button>
              </>
            )}
            {codeEvalSubTab === 'notebook' && (
              <>
                <button className="btn btn-primary" onClick={() => onEvaluateNotebook(false)} disabled={loading}>
                  Evaluar notebook
                </button>
                <button className="btn btn-secondary" onClick={onDownloadPdf} disabled={loading}>
                  Descargar PDF
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}

export default CodeEvaluationTab
