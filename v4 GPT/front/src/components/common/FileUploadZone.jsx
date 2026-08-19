function FileUploadZone({ file, onChange, accept, idleText, onClear, isZip = false }) {
  return (
    <div className="file-upload-wrap">
      <label className="file-upload">
        <input type="file" accept={accept} onChange={onChange} />
        {file ? (
          <span className="file-upload-status">
            <span className={`file-upload-icon ${isZip ? 'file-upload-icon-zip' : ''}`} aria-hidden="true">
              {isZip ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M12 11v6M9 14h6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
            </span>
            <span className="file-upload-label">{isZip ? 'Proyecto ZIP cargado' : 'Archivo cargado'}</span>
            <span className="file-upload-name">{file.name}</span>
          </span>
        ) : (
          <span className="file-upload-idle">{idleText}</span>
        )}
      </label>
      {file && onClear && (
        <button type="button" className="btn btn-secondary btn-clear-file" onClick={onClear}>
          Quitar archivo
        </button>
      )}
    </div>
  )
}

export default FileUploadZone
