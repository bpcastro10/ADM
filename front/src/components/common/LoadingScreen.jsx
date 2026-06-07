import AppHeader from './AppHeader'

function LoadingScreen({ theme, onToggleTheme }) {
  return (
    <div className="app">
      <AppHeader theme={theme} onToggleTheme={onToggleTheme} showReset={false} />
      <div className="loading">
        <div className="spinner" />
        <span>Cargando pruebas técnicas y puestos desde JSON Server...</span>
      </div>
    </div>
  )
}

export default LoadingScreen
