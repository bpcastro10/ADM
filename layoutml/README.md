# LayoutLM Web

Aplicación web local con:

- Frontend: React + Vite
- Backend: FastAPI
- OCR: Tesseract
- IA: LayoutLMv3
- Comunicación: API REST

## Arquitectura

Navegador
   |
   | POST /api/analyze
   v
FastAPI
   |
   +--> Tesseract OCR
   |
   +--> texto + coordenadas
   |
   +--> LayoutLMv3
   |
   v
JSON
   |
   v
React muestra el resultado

## Requisitos

- Python 3.10/3.11/3.12 recomendado
- Node.js 18+
- npm
- Tesseract OCR

Verifica:

```bash
python --version
node --version
npm --version
tesseract --version
```

## Tesseract en Windows

Si `tesseract --version` no funciona, instala Tesseract OCR y agrega su carpeta al PATH.

Ruta habitual:

```text
C:\Program Files\Tesseract-OCR
```

Si no quieres modificar PATH, agrega en `backend/app.py`:

```python
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
```

## Ejecutar

Abre DOS terminales.

### Terminal 1 - backend

Windows:

```cmd
run_backend.bat
```

O manualmente:

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Backend:

```text
http://127.0.0.1:8000
```

Documentación API:

```text
http://127.0.0.1:8000/docs
```

### Terminal 2 - frontend

```cmd
run_frontend.bat
```

O manualmente:

```cmd
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## Uso

1. Abre `http://localhost:5173`.
2. Sube una imagen.
3. Presiona "Analizar con LayoutLM".
4. El frontend envía la imagen al backend.
5. Tesseract obtiene las palabras y coordenadas.
6. LayoutLMv3 procesa el documento.
7. El backend devuelve JSON.
8. React muestra tokens, etiquetas y texto OCR.

## Importante

`microsoft/layoutlmv3-base` es un modelo base. No está fine-tuned para reconocer específicamente RUC, proveedor, fecha, total, etc.

Para extracción real de campos de facturas se debe utilizar/fine-tunear un modelo para el dominio correspondiente.
