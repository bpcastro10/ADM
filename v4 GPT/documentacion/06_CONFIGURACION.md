# Guía de Configuración e Instalación

> Instrucciones paso a paso para tener el sistema funcionando en un entorno local (Windows, macOS o Linux).

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar con |
|-------------|---------------|---------------|
| Python | 3.10+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | Cualquiera | `git --version` |
| Clave API Anthropic | Activa | [console.anthropic.com](https://console.anthropic.com) |

---

## Estructura de directorios

```
poc_pru/
├── back/          ← Backend Python (FastAPI)
├── front/         ← Frontend React (Vite)
├── jsonserver/    ← Mock database (JSON Server)
└── docs/          ← Esta documentación
```

---

## Paso 1 — Configurar el Backend

### 1.1 Crear y activar el entorno virtual

```powershell
# PowerShell (Windows)
cd back
python -m venv venv
.\venv\Scripts\Activate.ps1
```

```bash
# Bash (macOS / Linux)
cd back
python -m venv venv
source venv/bin/activate
```

### 1.2 Instalar dependencias

```bash
pip install -r requirements.txt
```

**Dependencias principales:**
| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `fastapi` | 0.109.2 | Framework web |
| `uvicorn[standard]` | 0.27.1 | Servidor ASGI |
| `anthropic` | ≥0.45.2 | Cliente de Claude |
| `python-multipart` | 0.0.9 | Subida de archivos |
| `reportlab` | 4.1.0 | Generación de PDFs |
| `pydantic` | 2.6.1 | Validación de datos |
| `pypdf` | 4.2.0 | Lectura de PDFs |
| `python-docx` | 1.1.2 | Lectura de DOCX |
| `python-dotenv` | 1.0.1 | Carga de `.env` |
| `httpx` | 0.27.0 | HTTP client |

### 1.3 Crear el archivo `.env`

```bash
# Copia la plantilla
cp .env.example .env   # macOS/Linux
copy .env.example .env  # Windows CMD
```

Edita `back/.env`:

```env
# OBLIGATORIO
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OPCIONALES (los valores por defecto ya funcionan)
AI_MODEL=claude-sonnet-4-5
AI_TIMEOUT=300
JSON_SERVER_URL=http://localhost:3000
MIN_PASSING_CODE_SCORE=3.0
MIN_PASSING_CV_SCORE=3.0
```

> **Importante en Windows:** Si anteriormente configuraste variables de entorno del sistema con `setx` (como `ANTHROPIC_BASE_URL` o `ANTHROPIC_AUTH_TOKEN` apuntando a Ollama), elimínalas antes de arrancar:
> ```powershell
> REG DELETE "HKCU\Environment" /V ANTHROPIC_BASE_URL /F
> REG DELETE "HKCU\Environment" /V ANTHROPIC_AUTH_TOKEN /F
> Remove-Item Env:\ANTHROPIC_BASE_URL -ErrorAction SilentlyContinue
> Remove-Item Env:\ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue
> ```

### 1.4 Arrancar el backend

```bash
# Desde el directorio back/, con venv activo
uvicorn main:app --reload
```

Salida esperada:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

Verificar: `http://localhost:8000/health` debe devolver:
```json
{"status": "ok", "api_configured": true}
```

Documentación interactiva: `http://localhost:8000/docs` (Swagger UI)

---

## Paso 2 — Configurar JSON Server

### 2.1 Instalar dependencias

```bash
cd jsonserver
npm install
```

### 2.2 Arrancar el servidor

```bash
npm start
```

Salida esperada:
```
JSON Server started on PORT :3000
```

Verificar: `http://localhost:3000/jobs` debe devolver la lista de puestos.

> Los datos se almacenan en `jsonserver/db.json`. Puedes editarlo manualmente para agregar o modificar puestos y pruebas iniciales.

---

## Paso 3 — Configurar el Frontend

### 3.1 Instalar dependencias

```bash
cd front
npm install
```

### 3.2 Verificar las URLs (si es necesario)

Edita `front/src/constants.js` solo si cambiaste los puertos por defecto:

```js
export const API_BASE = 'http://localhost:8000'        // URL del backend
export const JSON_SERVER_BASE = 'http://localhost:3000' // URL del JSON Server
```

### 3.3 Arrancar el frontend

```bash
npm run dev
```

Salida esperada:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Abre `http://localhost:5173` en el navegador.

---

## Resumen: tres terminales simultáneas

```
Terminal 1 (backend)        Terminal 2 (jsonserver)     Terminal 3 (frontend)
──────────────────────      ──────────────────────      ──────────────────────
cd back                     cd jsonserver               cd front
.\venv\Scripts\Activate     npm start                   npm run dev
uvicorn main:app --reload
```

---

## Verificación rápida del sistema

1. Abre `http://localhost:5173`
2. La pantalla de inicio NO debe mostrar error de conexión.
3. Ve a la pestaña **Administración** → deberías ver los puestos y pruebas de ejemplo.
4. Ve a **Evaluación de CV**, selecciona un puesto, escribe un nombre de candidato y pega texto de prueba en el campo de texto → clic **Evaluar CV** → debe aparecer una nota y resumen.

---

## Solución de problemas comunes

### Error: "api_configured: false" en /health
→ `ANTHROPIC_API_KEY` no está cargada. Verifica el archivo `back/.env` y que el servidor se arrancó **después** de crear/editar el `.env`.

### Error: "Connection error" al evaluar
→ Variables de entorno del sistema sobrescriben la URL de la API. Ejecuta los comandos `REG DELETE` del paso 1.3.

### Error: "model not found" (404 Anthropic)
→ El valor de `AI_MODEL` en `.env` no es un ID válido. Usa `claude-sonnet-4-5` o consulta [docs.anthropic.com/models](https://docs.anthropic.com/en/docs/about-claude/models).

### Error: JSON Server no arranca
→ Verifica que Node.js ≥ 18 está instalado: `node --version`. Ejecuta `npm install` dentro de `jsonserver/`.

### La pestaña de carga masiva no muestra resultados
→ Verifica que los archivos dentro del ZIP siguen la convención:
- CVs: `nombre-apellido-cv.pdf`
- Pruebas: `nombre-apellido-prueba.py`

### El PDF generado está vacío o da error
→ El resultado en memoria puede haberse perdido al recargar la página. Los resultados son solo de sesión; no se persisten.

---

## Cambiar el modelo de IA

Para usar un modelo diferente de Anthropic, edita `back/.env`:

```env
AI_MODEL=claude-opus-4-5        # Modelo más potente (mayor costo)
AI_MODEL=claude-haiku-3-5       # Modelo más rápido y económico
AI_MODEL=claude-sonnet-4-5      # Balance recomendado (default)
```

Reinicia el backend después de cambiar la variable.

---

## Consideraciones de producción

> El sistema en su estado actual está diseñado para uso local/prototipo. Para producción considera:

| Aspecto | Solución actual | Solución para producción |
|---------|----------------|--------------------------|
| Base de datos | JSON Server (archivo) | PostgreSQL + SQLAlchemy o similar |
| Autenticación | Ninguna | JWT + middleware FastAPI |
| Persistencia de resultados | Solo en sesión de navegador | Base de datos con tabla de evaluaciones |
| CORS | `allow_origins=["*"]` | Restricción a dominio específico |
| Variables de entorno | `.env` local | Secrets Manager (AWS, GCP, Azure) o variables de entorno del servidor |
| Escalabilidad | Un proceso Uvicorn | Gunicorn + workers + load balancer |
