import React, { useState } from "react"
import { createRoot } from "react-dom/client"
import "./style.css"

const API = "http://127.0.0.1:8000"

function formatTokenCoords(token) {
  if (!token || typeof token !== "object") return "sin ubicación"
  if (typeof token.coords === "string" && token.coords.trim()) {
    return token.coords
  }

  const pixel = token.location && token.location.pixel
  if (pixel && [pixel.x0, pixel.y0, pixel.x1, pixel.y1].every((v) => v != null)) {
    return `px (${pixel.x0}, ${pixel.y0}) -> (${pixel.x1}, ${pixel.y1})`
  }

  const loc = token.location
  if (loc && [loc.x0, loc.y0, loc.x1, loc.y1].every((v) => v != null)) {
    return `layout [${loc.x0}, ${loc.y0}, ${loc.x1}, ${loc.y1}]`
  }

  const box = Array.isArray(token.box) ? token.box : null
  if (box && box.length >= 4) {
    return `layout [${box[0]}, ${box[1]}, ${box[2]}, ${box[3]}]`
  }

  return "sin ubicación"
}

function App() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function selectFile(e) {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    setResult(null)
    setError("")

    if (selected.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(selected))
    } else {
      setPreview("")
    }
  }

  async function analyze() {
    if (!file) {
      setError("Selecciona una imagen o PDF antes de procesar.")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const form = new FormData()
      form.append("file", file)

      const response = await fetch(`${API}/api/analyze`, {
        method: "POST",
        body: form
      })

      if (!response.ok) {
        let message = "El backend no pudo procesar el documento."
        try {
          const payload = await response.json()
          if (typeof payload.detail === "string") {
            message = payload.detail
          }
        } catch {
          // Keep the default message if the body is not JSON.
        }
        throw new Error(message)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "No se pudo conectar con el backend. Verifica que FastAPI esté ejecutándose."
        )
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <header>
        <span className="badge">AI DOCUMENT ANALYSIS</span>
        <h1>LayoutLM Document Analyzer</h1>
        <p>
          Sube una imagen o PDF y analiza su contenido utilizando OCR + LayoutLMv3.
        </p>
      </header>

      <section className="workspace">
        <div className="card">
          <h2>1. Documento</h2>

          <label className="upload">
            {preview ? (
              <img src={preview} alt="Documento seleccionado" />
            ) : (
              <>
                <div className="uploadIcon">↑</div>
                <strong>Subir documento</strong>
                <span>PNG, JPG, WEBP o PDF</span>
              </>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={selectFile}
            />
          </label>

          {file && (
            <div className="filename">
              <span>{file.name}</span>
              <small>{Math.round(file.size / 1024)} KB</small>
            </div>
          )}

          <button onClick={analyze} disabled={!file || loading}>
            {loading ? "Procesando..." : "Analizar con LayoutLM"}
          </button>

          {error && <div className="error">{error}</div>}
        </div>

        <div className="card resultCard">
          <div className="resultHeader">
            <div>
              <h2>2. Salida de LayoutLM</h2>
              <p>Tokens detectados y su ubicación en el documento.</p>
            </div>
            {result && <span className="status">Procesado</span>}
          </div>

          {!result && !loading && (
            <div className="empty">
              <div>◇</div>
              <p>El resultado aparecerá aquí</p>
            </div>
          )}

          {loading && (
            <div className="empty">
              <div className="spinner"></div>
              <p>Ejecutando OCR y LayoutLMv3...</p>
            </div>
          )}

          {result && (
            <>
              <div className="summary">
                <div>
                  <span>ARCHIVO</span>
                  <strong>{result.filename}</strong>
                </div>
                <div>
                  <span>TOKENS</span>
                  <strong>{result.tokens.length}</strong>
                </div>
              </div>

              <div className="tokenList">
                {result.tokens.map((token, index) => {
                  const coords = formatTokenCoords(token)
                  return (
                    <div className="token" key={index}>
                      <span>{token.text}</span>
                      <code>{coords}</code>
                    </div>
                  )
                })}
              </div>

              <div className="rawText">
                <h3>Texto obtenido por OCR</h3>
                <p>{result.text}</p>
              </div>
            </>
          )}
        </div>
      </section>

      <footer>
        Pipeline: <b>Imagen → Tesseract OCR → coordenadas → LayoutLMv3 → salida</b>
      </footer>
    </main>
  )
}

createRoot(document.getElementById("root")).render(<App />)
