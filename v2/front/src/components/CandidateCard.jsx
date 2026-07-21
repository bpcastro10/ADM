function CandidateCard({
  candidateName,
  onCandidateNameChange,
  activeTab,
  onTabChange,
  evaluationHistoryCount,
}) {
  return (
    <div className="card">
      <h2>Datos del candidato</h2>
      <p className="subtle">Este nombre se usará en todos los reportes.</p>
      <div className="form-group" style={{ marginTop: '1rem' }}>
        <label>Nombre del candidato / Identificador</label>
        <input
          type="text"
          placeholder="Ej: Juan Pérez, Prueba #123"
          value={candidateName}
          onChange={(e) => onCandidateNameChange(e.target.value)}
        />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div className="tabs" role="tablist" aria-label="Tipo de evaluación">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => onTabChange('admin')}
            role="tab"
            aria-selected={activeTab === 'admin'}
          >
            Configuración
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'cv' ? 'active' : ''}`}
            onClick={() => onTabChange('cv')}
            role="tab"
            aria-selected={activeTab === 'cv'}
          >
            Evaluación de CV
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => onTabChange('code')}
            role="tab"
            aria-selected={activeTab === 'code'}
          >
            Evaluación de código
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'combined' ? 'active' : ''}`}
            onClick={() => onTabChange('combined')}
            role="tab"
            aria-selected={activeTab === 'combined'}
          >
            Análisis de aptitud
            {evaluationHistoryCount > 0 && (
              <span className="tab-badge">{evaluationHistoryCount}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CandidateCard
