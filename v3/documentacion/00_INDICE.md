# Evaluador de Candidatos con IA — Documentación C4

> Documentación técnica completa del sistema siguiendo el modelo C4 (Context → Containers → Components → Code).  
> Cualquier persona, desarrollador o no, puede seguir esta guía para entender, configurar y extender el proyecto.

---

## ¿Qué hace este sistema?

Automatiza el proceso de selección de candidatos mediante inteligencia artificial. Permite:

| Acción | Descripción |
|--------|-------------|
| **Evaluar pruebas técnicas** | Código fuente, proyectos ZIP, documentos escritos, notebooks Jupyter/Colab |
| **Evaluar hojas de vida (CV)** | PDF, DOCX, TXT comparados contra el perfil del puesto |
| **Análisis de aptitud** | Veredicto final (APTO / NO APTO) cruzando la nota técnica y la nota del CV |
| **Carga masiva** | Evaluar decenas de candidatos a la vez subiendo un ZIP con sus archivos |
| **Panel de administración** | Crear y gestionar puestos de trabajo y pruebas técnicas; importar desde documentos PDF/DOCX |

---

## Índice de la documentación

| Archivo | Nivel C4 | Contenido |
|---------|----------|-----------|
| [01_CONTEXTO_C4.md](./01_CONTEXTO_C4.md) | **Nivel 1 — Contexto** | El sistema en el mundo: actores, sistemas externos |
| [02_CONTENEDORES_C4.md](./02_CONTENEDORES_C4.md) | **Nivel 2 — Contenedores** | Las tres aplicaciones que componen el sistema |
| [03_COMPONENTES_BACKEND_C4.md](./03_COMPONENTES_BACKEND_C4.md) | **Nivel 3 — Backend** | Todos los módulos Python y sus responsabilidades |
| [04_COMPONENTES_FRONTEND_C4.md](./04_COMPONENTES_FRONTEND_C4.md) | **Nivel 3 — Frontend** | Todos los componentes React, hooks y utilidades |
| [05_FLUJOS.md](./05_FLUJOS.md) | **Flujos** | Diagramas de secuencia de los flujos principales |
| [06_CONFIGURACION.md](./06_CONFIGURACION.md) | **Guía operativa** | Cómo instalar, configurar y arrancar el sistema |
| [07_EXTENDER.md](./07_EXTENDER.md) | **Guía de extensión** | Cómo agregar nuevas funcionalidades sin romper lo existente |

---

## Stack tecnológico de un vistazo

```
┌─────────────────────────────────────────────────────────┐
│                     NAVEGADOR (SPA)                      │
│   React 18 + Vite 5    →    http://localhost:5173        │
└──────────────────┬──────────────────────────────────────┘
                   │  HTTP / REST
┌──────────────────▼──────────────────────────────────────┐
│                   API BACKEND (Python)                   │
│   FastAPI + Uvicorn     →    http://localhost:8000       │
│   ├─ Lectura de archivos (PDF, DOCX, ZIP, IPYNB)        │
│   ├─ Llamadas a Claude (Anthropic)                       │
│   └─ Generación de PDFs (ReportLab)                     │
└──────────┬──────────────────────┬───────────────────────┘
           │  HTTP                │  HTTPS
┌──────────▼──────────┐  ┌───────▼────────────────────────┐
│   JSON Server        │  │   Anthropic Claude API          │
│   (mock database)    │  │   claude-sonnet-4-5            │
│   port 3000          │  │   (evaluación con IA)          │
└─────────────────────┘  └────────────────────────────────┘
```

---

## Escala de calificación

Todas las evaluaciones usan una escala **0 – 5 con decimales**:

| Nota | Significado |
|------|-------------|
| 0 | Sin entrega evaluable |
| 1 | Deficiente |
| 2 | Insuficiente |
| 3 | Aceptable |
| 4 | Bueno |
| 5 | Excelente |

**Regla de aprobación automática:** si el promedio entre la nota de la prueba técnica y la nota del CV supera **3.8**, el sistema marca automáticamente al candidato como **APTO** sin necesidad de análisis adicional de la IA.
