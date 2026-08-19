# Evaluador de Pruebas Técnicas con IA

Aplicación para evaluar pruebas técnicas de programación usando Claude (Anthropic) como motor de calificación.

## Arquitectura

```
┌──────────────── FRONTEND (React) ────────────────┐
│  /json-api → lee puestos y pruebas (solo lectura)│
│  /api      → envía código o CV + IDs             │
└────────┬──────────────────────┬──────────────────┘
         │                      │
         ▼                      ▼
┌──────────────── BACKEND ──────────────┐   ┌── JSON SERVER :3000 ──┐
│  Obtiene rúbrica y puesto por ID      │◄──│ jobs, technicalTests  │
│  Claude: revisión y calificación      │   └───────────────────────┘
└────────────────┬──────────────────────┘
                 ▼
        Anthropic Claude API
```

### Flujo de datos

1. **JSON Server**: Define puestos (`jobs`), pruebas técnicas (`technicalTests`) con rúbrica de código y características buscadas para CV.
2. **Frontend**: Muestra enunciado, rúbrica y descripción del puesto en solo lectura; el usuario envía candidato + código o CV.
3. **Backend**: Obtiene la rúbrica desde JSON Server; la IA solo revisa y asigna calificaciones (1–5) según esa rúbrica.
4. **Respuesta**: JSON con notas, comentarios y resumen; PDF con ReportLab.

## Requisitos

- Python 3.10+
- Node.js 18+
- Cuenta en Anthropic con API key

## Instalación

### Backend

```bash
cd back
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
```

Configura la variable de entorno (o crea `.env`):

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

### Frontend

```bash
cd front
npm install
```

### JSON Server

```bash
cd jsonserver
npm install
```

Edita `jsonserver/db.json` para definir puestos, pruebas técnicas y rúbricas.

## Ejecución

1. **Iniciar JSON Server** (puerto 3000):

```bash
cd jsonserver
npm start
```

2. **Iniciar backend** (puerto 8000):

```bash
cd back
uvicorn main:app --reload
```

3. **Iniciar frontend** (puerto 5173):

```bash
cd front
npm run dev
```

4. Abrir http://localhost:5173 en el navegador.

Variables opcionales en `back/.env`:

```
JSON_SERVER_URL=http://127.0.0.1:3000
```

## Ejemplo de prompt optimizado

El prompt enviado a Claude sigue esta estructura (ver `back/services/ai_evaluator.py`):

```
Eres un evaluador técnico experto de código...

REGLAS ESTRICTAS:
1. SOLO evalúa los criterios proporcionados en la rúbrica.
2. Notas ENTEROS 1–5: 1=deficiente, 5=excelente.
3. Comentarios técnicos, objetivos y constructivos.
4. Responde ÚNICAMENTE con JSON válido.

## RÚBRICA
1. Legibilidad: Claridad, nombres descriptivos...
2. Buenas prácticas: Patrones, convenciones...
...

## CÓDIGO
```python
def ejemplo(): ...
```

Responde con:
{
  "criteria_evaluations": [...],
  "overall_score": 4,
  "executive_summary": "...",
  "strengths": [...],
  "areas_for_improvement": [...]
}
```

## Ejemplo de reporte PDF

El PDF generado incluye:

- Nombre del candidato e identificador
- Fecha y hora de evaluación
- Nota global (1–5)
- Rúbrica utilizada
- Evaluación por criterio (nota + comentarios)
- Resumen ejecutivo
- Fortalezas
- Áreas de mejora

## Manejo de errores

- **Timeout**: Configurable con `AI_TIMEOUT` (default 120s).
- **Respuesta mal formateada**: Se intenta extraer JSON con regex; si falla, se devuelve error 400.
- **Campos vacíos**: Validación con Pydantic en backend y en frontend.
