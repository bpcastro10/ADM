import AppHeader from './AppHeader'

function ErrorScreen({ theme, onToggleTheme, onResetForms, contentError }) {
  return (
    <div className="app">
      <AppHeader theme={theme} onToggleTheme={onToggleTheme} onResetForms={onResetForms} showReset />
      <div className="error-msg">{contentError}</div>
      <p className="subtle">
        Ejecuta en otra terminal: <code>cd jsonserver && npm install && npm start</code>
      </p>
    </div>
  )
}

export default ErrorScreen
