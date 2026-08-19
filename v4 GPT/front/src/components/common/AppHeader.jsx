function AppHeader({ theme, onToggleTheme, onResetForms, showReset = true }) {
  return (
    <header className="header">
      <div className="header-top">
        <button type="button" className="theme-toggle" onClick={onToggleTheme}>
          {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
        </button>
        {showReset && (
          <button type="button" className="theme-toggle" onClick={onResetForms}>
            Limpiar formularios
          </button>
        )}
      </div>
      <h1>Evaluador IA</h1>
      {showReset && (
        <p>La rúbrica, La IA solo revisa y califica.</p>
      )}
    </header>
  )
}

export default AppHeader
