# Flujos principales del sistema

> Diagramas de secuencia que muestran cómo interactúan los actores y componentes en cada caso de uso.

---

## Flujo 1 — Evaluación técnica individual (código fuente)

```mermaid
sequenceDiagram
    actor R as Reclutador
    participant FE as Frontend
    participant BE as Backend
    participant JS as JSON Server
    participant AI as Claude API

    R->>FE: Selecciona prueba técnica y sube archivo de código
    FE->>BE: POST /api/evaluate/upload
    BE->>JS: GET /technicalTests/id
    JS-->>BE: title, brief, rubric con criteria y scoreScale
    BE->>AI: Prompt con rúbrica + código del candidato
    AI-->>BE: criteria_evaluations, overall_score, executive_summary
    BE->>BE: Construye EvaluationResult
    BE-->>FE: EvaluationResult en JSON
    FE->>FE: Muestra resultado en CodeResultPanel
    R->>FE: Clic "Descargar PDF"
    FE->>BE: POST /api/generate-pdf
    BE-->>FE: PDF en bytes
    FE->>R: Descarga evaluacion_candidato_fecha.pdf
```

---

## Flujo 2 — Evaluación de CV individual

```mermaid
sequenceDiagram
    actor R as Reclutador
    participant FE as Frontend
    participant BE as Backend
    participant JS as JSON Server
    participant AI as Claude API

    R->>FE: Selecciona puesto y sube PDF del CV
    FE->>BE: POST /api/resume/evaluate/upload
    BE->>JS: GET /jobs/id
    JS-->>BE: title, description, soughtCharacteristics
    BE->>BE: Extrae texto del PDF con resume_reader
    BE->>AI: Prompt con descripción del puesto + texto del CV
    AI-->>BE: match_score, executive_summary, strengths, gaps, checklist
    BE->>BE: Construye ResumeEvaluationResult
    BE-->>FE: ResumeEvaluationResult en JSON
    FE->>FE: Muestra resultado en CvResultPanel
```

---

## Flujo 3 — Análisis de aptitud individual

> **Prerrequisito:** Ya existe un resultado de prueba técnica y un resultado de CV en memoria del navegador.

```mermaid
sequenceDiagram
    actor R as Reclutador
    participant FE as Frontend
    participant BE as Backend
    participant AI as Claude API

    R->>FE: Clic "Generar informe de aptitud"
    FE->>BE: POST /api/combined/analyze

    alt Promedio de notas mayor a 3.8
        BE->>BE: _average_above_threshold devuelve True
        BE->>BE: Veredicto forzado a apto sin llamar a la IA
        BE-->>FE: CombinedAnalysisResult con verdict apto
    else Promedio menor o igual a 3.8
        BE->>AI: Prompt con ambos resultados para análisis profundo
        AI-->>BE: verdict, detailed_reasoning, red_flags_summary
        BE-->>FE: CombinedAnalysisResult
    end

    FE->>FE: Muestra veredicto en CombinedResultPanel
    FE->>FE: Agrega candidato al historial de sesión
    R->>FE: Clic "Descargar PDF unificado"
    FE->>BE: POST /api/report/generate-pdf
    BE-->>FE: PDF en bytes
    FE->>R: Descarga reporte_unificado_candidato_fecha.pdf
```

---

## Flujo 4 — Evaluación de notebook Jupyter/Colab

```mermaid
sequenceDiagram
    actor R as Reclutador
    participant FE as Frontend
    participant BE as Backend
    participant AI as Claude API

    R->>FE: Sub-pestaña Notebook, sube archivo .ipynb
    FE->>BE: POST /api/evaluate/notebook
    BE->>BE: notebook_reader separa instrucciones y código
    Note over BE: Celdas markdown se toman como instrucciones
    Note over BE: Celdas code se toman como solución del candidato
    BE->>AI: Prompt con instrucciones + código del notebook
    AI-->>BE: criteria_evaluations, overall_score, executive_summary
    BE-->>FE: EvaluationResult con source_type notebook
    FE->>FE: Muestra resultado en CodeResultPanel
```

---

## Flujo 5 — Evaluación escrita (PDF/DOCX sin rúbrica predefinida)

```mermaid
sequenceDiagram
    actor R as Reclutador
    participant FE as Frontend
    participant BE as Backend
    participant AI as Claude API

    R->>FE: Sub-pestaña Evaluacion escrita, sube PDF del cuestionario
    FE->>BE: POST /api/evaluate/written
    BE->>BE: resume_reader extrae texto del documento
    BE->>AI: Evalúa este documento y deriva los criterios del contenido
    AI-->>BE: criteria_evaluations de 3 a 10 criterios, overall_score
    BE->>BE: Construye rúbrica dinámica a partir de la respuesta
    BE-->>FE: EvaluationResult con source_type written
    FE->>FE: Muestra resultado en CodeResultPanel
```

---

## Flujo 6 — Carga masiva de CVs

```mermaid
sequenceDiagram
    actor R as Reclutador
    participant FE as Frontend
    participant BE as Backend
    participant JS as JSON Server
    participant AI as Claude API

    Note over R: Prepara ZIP con archivos nombrados como nombre-apellido-cv.pdf

    R->>FE: Sub-pestaña Carga masiva en CV, selecciona puesto y sube ZIP
    FE->>BE: POST /api/evaluate/bulk-cv con zip_file y job_id
    BE->>JS: GET /jobs/job_id
    JS-->>BE: Descripción y características del puesto

    loop Por cada archivo que termina en -cv dentro del ZIP
        BE->>BE: _parse_filename extrae el nombre del candidato
        BE->>BE: resume_reader extrae texto del CV
        BE->>AI: Evalúa CV contra el perfil del puesto
        AI-->>BE: ResumeEvaluationResult con nota y análisis
    end

    BE-->>FE: results con lista de evaluados y skipped_files
    FE->>FE: Muestra BulkCandidatesTable de tipo cv
```

---

## Flujo 7 — Carga masiva de pruebas técnicas

```mermaid
sequenceDiagram
    actor R as Reclutador
    participant FE as Frontend
    participant BE as Backend
    participant JS as JSON Server
    participant AI as Claude API

    Note over R: Prepara ZIP con archivos nombrados como nombre-apellido-prueba.ext

    R->>FE: Sub-pestaña Carga masiva en Evaluacion Tecnica, sube ZIP
    FE->>BE: POST /api/evaluate/bulk-test con zip_file y technical_test_id opcional

    opt Si se especificó technical_test_id
        BE->>JS: GET /technicalTests/id para obtener rúbrica
    end

    loop Por cada archivo que termina en -prueba dentro del ZIP
        BE->>BE: _detect_eval_type detecta notebook, zip, written o code
        BE->>AI: Evalúa según el tipo de entrega detectado
        AI-->>BE: EvaluationResult con nota y análisis
    end

    BE-->>FE: results con lista de evaluados y skipped_files
    FE->>FE: Muestra BulkCandidatesTable de tipo test
```

---

## Flujo 8 — Análisis masivo de aptitud (cruce por nombre)

```mermaid
sequenceDiagram
    actor R as Reclutador
    participant FE as Frontend
    participant BE as Backend
    participant AI as Claude API

    Note over R: Ya realizó carga masiva de CVs y carga masiva de pruebas

    R->>FE: Pestaña Analisis de Aptitud sub-pestaña Carga masiva
    R->>FE: Clic Analizar aptitud masiva
    FE->>BE: POST /api/analyze/bulk-combined con cv_results y test_results

    BE->>BE: process_bulk_combined cruza por clave nombre-apellido

    loop Por cada par coincidente con el mismo nombre-apellido
        alt Promedio de notas mayor a 3.8
            BE->>BE: Veredicto automático apto sin IA
        else Promedio menor o igual a 3.8
            BE->>AI: analyze_combined con resultado CV y resultado técnico
            AI-->>BE: CombinedAnalysisResult con veredicto razonado
        end
    end

    BE-->>FE: results, total_matched, unmatched_cvs, unmatched_tests
    FE->>FE: Muestra BulkCandidatesTable de tipo combined
```

---

## Flujo 9 — Importar prueba técnica desde documento (Admin)

```mermaid
sequenceDiagram
    actor R as Reclutador
    participant FE as Frontend
    participant BE as Backend
    participant JS as JSON Server
    participant AI as Claude API

    R->>FE: Administracion - Pruebas tecnicas - Importar desde documento
    R->>FE: Sube PDF con la descripción de la prueba
    FE->>BE: POST /api/admin/scan-test-file con el archivo
    BE->>BE: resume_reader extrae texto del documento
    BE->>AI: Extrae título, enunciado, lenguaje y criterios del documento
    AI-->>BE: title, brief, defaultLanguage, criteria
    BE-->>FE: Estructura de la prueba extraída
    FE->>FE: Pre-rellena el formulario de nueva prueba
    FE->>JS: POST /technicalTests para guardar automáticamente
    JS-->>FE: Confirmación con id asignado
    FE->>FE: Muestra mensaje Prueba guardada correctamente
```

---

## Regla de aprobación automática

```mermaid
flowchart LR
    A["Nota prueba técnica\n+ Nota CV"] --> B["Calcular promedio\n(suma / 2)"]
    B --> C{Promedio > 3.8?}
    C -- Sí --> D["✅ APTO\nVeredicto automático\nsin llamar a la IA"]
    C -- No --> E["🤖 Claude analiza\nen profundidad"]
    E --> F["APTO o NO APTO\ncon razonamiento detallado"]
```

Esta regla aplica tanto al análisis **individual** (`combined_analyzer.py`) como al **masivo** (`bulk_evaluator.py`).
