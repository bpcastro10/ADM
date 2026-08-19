# Guía para Modificar y Extender el Sistema

> Recetas prácticas para los cambios más comunes. Cada receta indica exactamente qué archivos tocar y en qué orden.

---

## Tabla de cambios frecuentes

| Quiero… | Sección |
|---------|---------|
| Cambiar el modelo de IA | [Cambiar modelo de Claude](#1-cambiar-el-modelo-de-ia) |
| Cambiar el umbral de aprobación automática | [Umbral de aprobación](#2-cambiar-el-umbral-de-aprobación-automática) |
| Agregar un nuevo tipo de archivo soportado | [Nuevo formato de archivo](#3-agregar-soporte-para-un-nuevo-tipo-de-archivo) |
| Agregar una nueva pestaña en el frontend | [Nueva pestaña](#4-agregar-una-nueva-pestaña-en-el-frontend) |
| Agregar un nuevo endpoint al backend | [Nuevo endpoint](#5-agregar-un-nuevo-endpoint-al-backend) |
| Cambiar los prompts de la IA | [Modificar prompts](#6-modificar-los-prompts-de-la-ia) |
| Cambiar la escala de calificación | [Escala de calificación](#7-cambiar-la-escala-de-calificación) |
| Agregar un campo nuevo al resultado de evaluación | [Nuevo campo en resultado](#8-agregar-un-campo-nuevo-al-resultado) |
| Conectar una base de datos real | [Base de datos real](#9-reemplazar-json-server-por-una-base-de-datos-real) |
| Agregar autenticación | [Autenticación](#10-agregar-autenticación) |

---

## 1. Cambiar el modelo de IA

**Solo `.env`** — no se necesita cambiar código:

```env
# back/.env
AI_MODEL=claude-opus-4-5       # Más potente, más costoso
AI_MODEL=claude-haiku-3-5      # Más rápido, más económico
AI_MODEL=claude-sonnet-4-5     # Recomendado (balance)
```

Reinicia el backend. El modelo se lee en `back/config.py` y se pasa a todos los servicios vía `from config import AI_MODEL`.

---

## 2. Cambiar el umbral de aprobación automática

**Archivo:** `back/services/combined_analyzer.py`

```python
# Línea ~10
_APPROVAL_THRESHOLD = 3.8   # ← Cambia este valor (0-5)
```

El mismo umbral se aplica en `back/services/bulk_evaluator.py` a través de `analyze_combined()`, por lo que el cambio en `combined_analyzer.py` es suficiente.

---

## 3. Agregar soporte para un nuevo tipo de archivo

**Ejemplo:** agregar soporte para `.odt` (OpenDocument Text).

### Paso 1 — Backend: parser
Edita `back/services/resume_reader.py`:

```python
def read_resume_bytes(filename: str, content: bytes) -> str:
    ext = filename.lower()
    if ext.endswith(".pdf"):
        ...
    elif ext.endswith(".docx"):
        ...
    elif ext.endswith(".odt"):          # ← Nuevo bloque
        from odf import text, teletype  # pip install odfpy
        from odf.opendocument import load
        import io
        doc = load(io.BytesIO(content))
        paragraphs = doc.getElementsByType(text.P)
        return "\n".join(teletype.extractText(p) for p in paragraphs)
    ...
```

Agrega `odfpy` a `back/requirements.txt`.

### Paso 2 — Frontend: tipos aceptados
Edita `front/src/constants.js`:

```js
export const RESUME_FILE_ACCEPT = '.pdf,.docx,.doc,.txt,.odt'  // ← agrega .odt
export const DOC_FILE_ACCEPT = '.pdf,.docx,.doc,.txt,.odt'
```

### Paso 3 — Backend: validaciones en endpoints
Busca en `back/main.py` los endpoints que validan extensiones (ej. `/api/resume/evaluate/upload`) y agrega `.odt` a la lista `allowed`:

```python
allowed = (".pdf", ".docx", ".txt", ".doc", ".odt")  # ← añade .odt
```

---

## 4. Agregar una nueva pestaña en el frontend

**Ejemplo:** Agregar una pestaña "Reportes" que muestre el historial en tabla.

### Paso 1 — Crear el componente de la pestaña
Crea `front/src/components/ReportesTab.jsx`:

```jsx
function ReportesTab({ evaluationHistory }) {
  return (
    <div className="card">
      <h2>Historial de evaluaciones</h2>
      {/* ... tu contenido ... */}
    </div>
  )
}
export default ReportesTab
```

### Paso 2 — Agregar el botón de pestaña en `CandidateCard.jsx`
Busca la sección de botones de pestaña y agrega:

```jsx
<button
  className={`tab-btn ${activeTab === 'reportes' ? 'active' : ''}`}
  onClick={() => onTabChange('reportes')}
>
  Reportes
</button>
```

### Paso 3 — Renderizar en `App.jsx`

```jsx
import ReportesTab from './components/ReportesTab'

// Dentro del JSX:
{activeTab === 'reportes' && (
  <ReportesTab evaluationHistory={evaluationHistory} />
)}
```

---

## 5. Agregar un nuevo endpoint al backend

**Ejemplo:** `GET /api/stats` que devuelva estadísticas básicas del JSON Server.

### Paso 1 — Definir el endpoint en `main.py`

```python
@app.get("/api/stats")
async def get_stats():
    """Devuelve estadísticas básicas: total de puestos y pruebas."""
    jobs = content_client.get_all_jobs()       # función a crear
    tests = content_client.get_all_tests()
    return {
        "total_jobs": len(jobs),
        "total_tests": len(tests),
    }
```

### Paso 2 — Agregar la función en `services/content_client.py`

```python
def get_all_jobs() -> list:
    resp = httpx.get(f"{JSON_SERVER_URL}/jobs", timeout=10)
    resp.raise_for_status()
    return resp.json()
```

### Paso 3 — Consumir desde el frontend (si aplica)

```js
// En el hook correspondiente
const response = await fetch(`${API_BASE}/api/stats`)
const data = await response.json()
```

---

## 6. Modificar los prompts de la IA

Todos los prompts están en `back/services/`:

| Archivo | Qué modifica |
|---------|-------------|
| `ai_evaluator.py` | `SYSTEM_PROMPT`, `SYSTEM_PROMPT_WRITTEN`, `SYSTEM_PROMPT_NOTEBOOK`, `USER_PROMPT_TEMPLATE`, `USER_PROMPT_WRITTEN_TEMPLATE`, `USER_PROMPT_NOTEBOOK_TEMPLATE` |
| `resume_evaluator.py` | `SYSTEM_PROMPT`, `USER_PROMPT_TEMPLATE` |
| `combined_analyzer.py` | `SYSTEM_PROMPT`, `USER_PROMPT_TEMPLATE` |
| `test_scanner.py` | `SYSTEM_PROMPT`, `USER_PROMPT` |
| `job_scanner.py` | `SYSTEM_PROMPT`, `USER_PROMPT` |

**Buenas prácticas al modificar prompts:**
1. Mantén el formato JSON pedido al final del prompt (`{json_schema}`).
2. No elimines las instrucciones de "Solo JSON sin markdown" — son críticas para el parsing.
3. Si cambias los campos del JSON de respuesta, también actualiza el modelo Pydantic correspondiente en `models/schemas.py` y la función `_parse_ai_response`.

---

## 7. Cambiar la escala de calificación

**Archivo:** `back/services/rubric_scale.py`

La función `suggest_score_scale(default_language, title, brief)` devuelve un diccionario con las descripciones de cada nivel (0-5). Puedes:

- Cambiar las descripciones de los niveles para todos los tipos de prueba.
- Agregar un nuevo tipo de prueba detectado por palabras clave en `title` o `brief`.

```python
# Ejemplo: agregar tipo "diseño gráfico"
if any(kw in combined for kw in ["diseño", "figma", "ux", "ui", "prototipo"]):
    return {
        "0": "Sin entrega.",
        "1": "Diseño muy básico o sin relación con el brief.",
        ...
        "5": "Diseño profesional, original y alineado con el brief."
    }
```

---

## 8. Agregar un campo nuevo al resultado

**Ejemplo:** Agregar `experience_years_inferred` (años de experiencia inferidos) al resultado del CV.

### Paso 1 — Modelo Pydantic (`back/models/schemas.py`)

```python
class ResumeEvaluationResult(BaseModel):
    ...
    experience_years_inferred: Optional[int] = Field(
        default=None,
        description="Años de experiencia inferidos del CV por la IA."
    )
```

### Paso 2 — Prompt (`back/services/resume_evaluator.py`)

Agrega el campo al JSON schema pedido en el prompt:

```python
# En USER_PROMPT_TEMPLATE, en el bloque JSON de ejemplo:
'"experience_years_inferred": 5,'
```

Y añade una instrucción en el system prompt:
```
- experience_years_inferred: número entero con los años de experiencia total inferidos del CV.
```

### Paso 3 — Frontend: mostrar el campo

Edita `front/src/components/results/CvResultPanel.jsx` para mostrar el nuevo campo:

```jsx
{resumeResult.experience_years_inferred && (
  <p>Experiencia estimada: <strong>{resumeResult.experience_years_inferred} años</strong></p>
)}
```

---

## 9. Reemplazar JSON Server por una base de datos real

JSON Server es conveniente para desarrollo, pero en producción necesitas una base de datos real.

### Cambios necesarios

1. **Crea una base de datos** (PostgreSQL recomendado) con tablas `jobs` y `technical_tests`.

2. **Reemplaza `content_client.py`** con una capa de acceso a datos real:

```python
# Ejemplo con SQLAlchemy + PostgreSQL
from sqlalchemy import create_engine, text
from config import DATABASE_URL  # nueva variable en config.py

engine = create_engine(DATABASE_URL)

def get_job(job_id: int) -> dict:
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT * FROM jobs WHERE id = :id"), {"id": job_id}
        ).fetchone()
    if not row:
        raise ContentNotFoundError(str(job_id), "Job")
    return dict(row._mapping)
```

3. **Agrega `DATABASE_URL` al `.env`:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/evaluador
```

4. **El frontend** llama a JSON Server directamente para las listas (puestos, pruebas). Reemplaza esas llamadas en `useContentData.js` por llamadas al backend:

```js
// Antes (directo a JSON Server):
fetch('http://localhost:3000/jobs')

// Después (a través del backend):
fetch('http://localhost:8000/api/jobs')
```
Y crea los endpoints `GET /api/jobs` y `GET /api/technical-tests` en `main.py`.

---

## 10. Agregar autenticación

Para un entorno multi-usuario, agrega autenticación JWT.

### Backend

```bash
pip install python-jose[cryptography] passlib[bcrypt]
```

Crea `back/auth.py` con la lógica de tokens y un endpoint `POST /auth/login`.

Protege los endpoints con un `Depends`:

```python
from auth import get_current_user

@app.post("/api/evaluate", response_model=EvaluationResult)
async def evaluate(request: EvaluationRequest, user=Depends(get_current_user)):
    ...
```

### Frontend

Guarda el token JWT en `localStorage` al hacer login y adjúntalo como header en cada llamada al backend:

```js
fetch(`${API_BASE}/api/evaluate`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
})
```

---

## Referencia rápida: qué archivo tocar según el cambio

| Cambio | Archivos principales |
|--------|---------------------|
| URL del backend o JSON Server | `front/src/constants.js` |
| Modelo de IA, timeout, umbral mínimo | `back/.env` → `back/config.py` |
| Umbral de aprobación automática | `back/services/combined_analyzer.py` |
| Prompts de evaluación técnica | `back/services/ai_evaluator.py` |
| Prompts de evaluación de CV | `back/services/resume_evaluator.py` |
| Prompts de análisis de aptitud | `back/services/combined_analyzer.py` |
| Prompts de escaneo admin | `back/services/test_scanner.py`, `back/services/job_scanner.py` |
| Tipos de archivo soportados | `back/services/resume_reader.py` + `front/src/constants.js` + endpoints en `back/main.py` |
| Campos del resultado de evaluación | `back/models/schemas.py` + prompts IA + componentes de resultado en frontend |
| Escala de calificación | `back/services/rubric_scale.py` + `front/src/scoreScaleTemplates.js` |
| Estilos visuales | `front/src/App.css` |
| Tema claro/oscuro | `front/src/hooks/useTheme.js` + `front/src/App.css` |
| Lógica de carga masiva | `back/services/bulk_evaluator.py` + `front/src/hooks/useBulkEvaluation.js` |
