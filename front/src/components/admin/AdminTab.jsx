import { MIN_CRITERIA, MAX_CRITERIA, SCORE_LEVELS, NEW_ITEM } from '../../constants'

function AdminTestsPanel({
  jobs,
  technicalTests,
  editTestSelectValue,
  onSelectTest,
  onStartNewTest,
  isNewTest,
  draftTest,
  onDraftTestChange,
  onDefaultLanguageChange,
  onUpdateScoreScale,
  onUpdateCriterion,
  onAddCriterion,
  onRemoveCriterion,
  onSave,
  onCancel,
  adminSaving,
}) {
  return (
    <>
      <div className="admin-toolbar">
        <div className="form-group">
          <label>Prueba a editar o crear</label>
          <select value={editTestSelectValue} onChange={(e) => onSelectTest(e.target.value)}>
            <option value="">— Seleccione —</option>
            <option value={NEW_ITEM}>+ Crear nueva prueba técnica</option>
            {technicalTests.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-add" onClick={onStartNewTest}>
          + Nueva prueba
        </button>
      </div>
      {isNewTest && <p className="admin-new-hint">Nueva prueba — completa los datos y pulsa Aceptar para guardar.</p>}

      {draftTest && (
        <>
          <div className="form-group">
            <label>Título</label>
            <input
              value={draftTest.title || ''}
              onChange={(e) => onDraftTestChange((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Puesto vinculado (opcional)</label>
            <select
              value={draftTest.jobId ?? ''}
              onChange={(e) => onDraftTestChange((p) => ({
                ...p,
                jobId: e.target.value ? Number(e.target.value) : null,
              }))}
            >
              <option value="">— Sin vincular —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Enunciado</label>
            <textarea
              value={draftTest.brief || ''}
              onChange={(e) => onDraftTestChange((p) => ({ ...p, brief: e.target.value }))}
              rows={5}
            />
          </div>
          <div className="form-group">
            <label>Lenguaje por defecto</label>
            <select
              value={draftTest.defaultLanguage || 'python'}
              onChange={(e) => onDefaultLanguageChange(e.target.value)}
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="typescript">TypeScript</option>
              <option value="text">Otro / Texto</option>
            </select>
          </div>
          <div className="form-group">
            <label>Escala de calificación (0 a 5)</label>
            <p className="subtle">Define qué debe cumplir el código para cada nota. La IA puede usar valores intermedios (ej. 3.5).</p>
            <div className="score-scale-editor">
              {SCORE_LEVELS.map((level) => (
                <div key={level} className="score-scale-row">
                  <label className="level-label">{level}</label>
                  <textarea
                    rows={2}
                    value={draftTest.rubric?.scoreScale?.[level] ?? ''}
                    onChange={(e) => onUpdateScoreScale(level, e.target.value)}
                    placeholder={`Qué significa calificar con ${level}...`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Rúbrica ({MIN_CRITERIA}–{MAX_CRITERIA} criterios)</label>
            <div className="criteria-list">
              {(draftTest.rubric?.criteria || []).map((c, i) => (
                <div key={i} className="criterion-item">
                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      value={c.name}
                      onChange={(e) => onUpdateCriterion(i, 'name', e.target.value)}
                      placeholder="Ej: Legibilidad"
                    />
                  </div>
                  <div className="form-group">
                    <label>Descripción</label>
                    <input
                      value={c.description}
                      onChange={(e) => onUpdateCriterion(i, 'description', e.target.value)}
                      placeholder="Qué se evalúa"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-icon"
                    onClick={() => onRemoveCriterion(i)}
                    disabled={(draftTest.rubric?.criteria?.length || 0) <= MIN_CRITERIA}
                    title="Eliminar criterio"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-add"
              onClick={onAddCriterion}
              disabled={(draftTest.rubric?.criteria?.length || 0) >= MAX_CRITERIA}
            >
              + Añadir criterio
            </button>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={adminSaving}>
              {isNewTest ? 'Aceptar (crear)' : 'Aceptar'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={adminSaving}>
              Descartar cambios
            </button>
          </div>
        </>
      )}
    </>
  )
}

function AdminJobsPanel({
  jobs,
  editJobSelectValue,
  onSelectJob,
  onStartNewJob,
  isNewJob,
  draftJob,
  onDraftJobChange,
  onUpdateCharacteristic,
  onAddCharacteristic,
  onRemoveCharacteristic,
  onSave,
  onCancel,
  adminSaving,
}) {
  return (
    <>
      <div className="admin-toolbar">
        <div className="form-group">
          <label>Puesto a editar o crear</label>
          <select value={editJobSelectValue} onChange={(e) => onSelectJob(e.target.value)}>
            <option value="">— Seleccione —</option>
            <option value={NEW_ITEM}>+ Crear nuevo puesto</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn btn-add" onClick={onStartNewJob}>
          + Nuevo puesto
        </button>
      </div>
      {isNewJob && <p className="admin-new-hint">Nuevo puesto — completa los datos y pulsa Aceptar para guardar.</p>}

      {draftJob && (
        <>
          <div className="form-group">
            <label>Título del puesto</label>
            <input
              value={draftJob.title || ''}
              onChange={(e) => onDraftJobChange((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>Descripción del trabajo</label>
            <textarea
              value={draftJob.description || ''}
              onChange={(e) => onDraftJobChange((p) => ({ ...p, description: e.target.value }))}
              rows={6}
            />
          </div>
          <div className="form-group">
            <label>Características buscadas / rúbrica CV ({MIN_CRITERIA}–{MAX_CRITERIA})</label>
            <div className="criteria-list">
              {(draftJob.soughtCharacteristics || []).map((c, i) => (
                <div key={i} className="criterion-item">
                  <div className="form-group">
                    <label>Nombre</label>
                    <input
                      value={c.name}
                      onChange={(e) => onUpdateCharacteristic(i, 'name', e.target.value)}
                      placeholder="Ej: Python"
                    />
                  </div>
                  <div className="form-group">
                    <label>Descripción</label>
                    <input
                      value={c.description}
                      onChange={(e) => onUpdateCharacteristic(i, 'description', e.target.value)}
                      placeholder="Requisito detallado"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-icon"
                    onClick={() => onRemoveCharacteristic(i)}
                    disabled={(draftJob.soughtCharacteristics?.length || 0) <= MIN_CRITERIA}
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-add"
              onClick={onAddCharacteristic}
              disabled={(draftJob.soughtCharacteristics?.length || 0) >= MAX_CRITERIA}
            >
              + Añadir característica
            </button>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={adminSaving}>
              {isNewJob ? 'Aceptar (crear)' : 'Aceptar'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={adminSaving}>
              Descartar cambios
            </button>
          </div>
        </>
      )}
    </>
  )
}

function AdminTab({
  adminSubTab,
  onAdminSubTabChange,
  adminMessage,
  onClearAdminMessage,
  testsPanelProps,
  jobsPanelProps,
}) {
  return (
    <div className="card">
      <h2>Configuración (JSON Server)</h2>
      <p className="subtle">Los cambios se aplican solo al pulsar Aceptar. Hasta entonces no se guardan en el servidor.</p>

      <div className="tabs tabs-nested" style={{ marginTop: '1rem' }}>
        <button
          type="button"
          className={`tab-btn ${adminSubTab === 'tests' ? 'active' : ''}`}
          onClick={() => { onAdminSubTabChange('tests'); onClearAdminMessage() }}
        >
          Pruebas técnicas
        </button>
        <button
          type="button"
          className={`tab-btn ${adminSubTab === 'jobs' ? 'active' : ''}`}
          onClick={() => { onAdminSubTabChange('jobs'); onClearAdminMessage() }}
        >
          Puestos de trabajo
        </button>
      </div>

      {adminSubTab === 'tests' && <AdminTestsPanel {...testsPanelProps} />}
      {adminSubTab === 'jobs' && <AdminJobsPanel {...jobsPanelProps} />}

      {adminMessage && (
        <div className={adminMessage.type === 'success' ? 'success-msg' : 'error-msg'} style={{ marginTop: '1rem' }}>
          {adminMessage.text}
        </div>
      )}
    </div>
  )
}

export default AdminTab
