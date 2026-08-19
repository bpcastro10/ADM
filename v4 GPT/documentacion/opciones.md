# Opciones de reemplazo: Claude → GPT en Azure OpenAI

> Análisis del proyecto **Evaluador de Candidatos con IA** y alternativas en **Azure OpenAI** para sustituir **Claude Sonnet 4.5** (`claude-sonnet-4-5`) sin alterar el comportamiento funcional actual.

**Fecha de referencia:** agosto 2026  
**Modelo actual:** `claude-sonnet-4-5` vía API directa de Anthropic

---

## Contexto de la suscripción Azure

Este documento asume una **suscripción Azure de nivel más alto (Enterprise / Premium)** con:

| Capacidad | Estado |
|-----------|--------|
| Catálogo completo de modelos OpenAI en Azure AI Foundry | ✅ Disponible |
| GPT-4.x, GPT-5.x, o-series (o1, o3, o4-mini) | ✅ Sin restricción de acceso |
| Cuotas elevadas (TPM/RPM) | ✅ Adecuadas para producción y carga masiva |
| PTU (Provisioned Throughput Units) | ✅ Opcional para latencia predecible |
| Priority Processing | ✅ Disponible en modelos compatibles |
| Batch API | ✅ Disponible para evaluaciones masivas |

> **Implicación práctica:** no hay que solicitar acceso a modelos ni limitarse a GPT-4o por cuota. Se desplegará **un único modelo** en Azure que cubra **todas** las tareas del evaluador (código, CV, aptitud, scanners y carga masiva).

---

## 1. Cómo usa IA el proyecto hoy

### 1.1 Integración actual

| Aspecto | Valor actual |
|---------|--------------|
| Proveedor | Anthropic (API directa) |
| SDK | `anthropic` ≥ 0.45.2 |
| Modelo por defecto | `claude-sonnet-4-5` (`back/config.py`) |
| Variable de entorno | `ANTHROPIC_API_KEY`, `AI_MODEL`, `AI_TIMEOUT` |
| Patrón de llamada | `client.messages.create(model, system, messages, max_tokens, timeout)` |
| Formato de salida esperado | JSON estructurado (parseado con `_parse_ai_response`) |

### 1.2 Archivos que llaman a la IA

| Archivo | Función | Uso |
|---------|---------|-----|
| `back/services/ai_evaluator.py` | `_call_ai()` | Evaluación de código, escrito y notebooks |
| `back/services/resume_evaluator.py` | llamada directa | Evaluación de CV vs puesto |
| `back/services/combined_analyzer.py` | llamada directa | Análisis de aptitud (CV + prueba) |
| `back/services/test_scanner.py` | llamada directa | Escaneo de documentos → prueba técnica |
| `back/services/job_scanner.py` | llamada directa | Escaneo de documentos → puesto de trabajo |

### 1.3 Tareas que ejecuta la IA en este proyecto

1. **Evaluar entregas técnicas** con rúbrica fija (código, ZIP, documentos).
2. **Evaluar documentos escritos** derivando criterios del contenido.
3. **Evaluar notebooks** (.ipynb) contra instrucciones en markdown.
4. **Evaluar CVs** contra descripción del puesto y características buscadas.
5. **Análisis combinado de aptitud** (veredicto APTO / NO APTO + razonamiento).
6. **Extracción estructurada** de PDFs/DOCX para admin (pruebas y puestos).
7. **Evaluación masiva** (delega en los servicios anteriores).

> **Requisito crítico para cualquier reemplazo:** respuestas en **JSON válido**, prompts con **system + user**, manejo de **documentos largos** (CVs, ZIPs, notebooks) y **notas decimales 0–5** con criterio estricto.

---

## 2. Modelo actual de referencia (Claude Sonnet 4.5)

| Concepto | Valor |
|----------|-------|
| ID Anthropic | `claude-sonnet-4-5` |
| Contexto | 200 K tokens |
| Precio input | **$3.00** / millón de tokens |
| Precio output | **$15.00** / millón de tokens |
| Precio input cacheado | $0.30 / millón |
| Fortalezas en este proyecto | Buen seguimiento de instrucciones, JSON estructurado, evaluación de texto largo |
| Debilidades | Costo de salida alto; proveedor fuera del ecosistema Azure |

**Ejemplo de costo orientativo** (1 evaluación típica: ~8 K input + ~2 K output):

```
(8 × $3.00 + 2 × $15.00) / 1000 ≈ $0.054 por evaluación
```

Con **50 evaluaciones/día** → ~**$81/mes** solo en tokens.

---

## 3. Ranking Top 5 — igual o mejor que Claude Sonnet 4.5

> **Criterio de este ranking:** capacidad para reemplazar a Sonnet 4.5 en **todas** las tareas del evaluador con **un solo modelo** (JSON estricto, rúbricas, CVs largos, código, aptitud, scanners y bulk).  
> **El costo se muestra solo como referencia** — **no influye** en el orden.

### Criterios evaluados (peso en el ranking)

| Criterio | Por qué importa en este proyecto |
|----------|----------------------------------|
| Seguimiento de instrucciones / rúbrica | Notas 0–5 decimales firmes, un ítem por criterio |
| JSON estructurado fiable | `_parse_ai_response` depende de respuestas parseables |
| Evaluación de código y ZIP | Pestaña Solución / Entrega |
| Análisis de CV vs puesto | Checklist, gaps, match_score |
| Documentos largos | CVs, notebooks, ZIPs concatenados |
| Razonamiento para aptitud | Veredicto cuando promedio ≤ 3.8 |
| Estabilidad en producción | Consistencia entre evaluaciones similares |
| **Uso único en todo el flujo** | Mismo modelo en evaluación, aptitud, scanners y carga masiva |

### Referencia: Claude Sonnet 4.5 (baseline)

| Métrica | Valor |
|---------|-------|
| Input / Output | $3.00 / $15.00 por 1M tokens |
| Contexto | 200 K |
| Veredicto global | **Referencia actual** — muy bueno en instrucciones, JSON y texto largo |

---

### 🥇 1. GPT-5.2

| Aspecto | Detalle |
|---------|---------|
| **Veredicto vs Sonnet 4.5** | **Superior** |
| **Input / Output** | ~$1.75 / ~$14.00 por 1M tokens |
| **Contexto** | 128 K+ |
| **Deployment sugerido** | `gpt-5-2-eval` (único deployment) |
| **Por qué #1** | Mayor capacidad general que Sonnet 4.5 en coding, agentes e instrucciones complejas. Mejor candidato como **único modelo** para evaluación técnica, CV, aptitud, escaneo admin y bulk. |
| **Fortaleza clave** | Rúbricas estrictas, código, resúmenes ejecutivos |
| **Limitación** | Contexto menor que GPT-4.1 para ZIP/CV extremadamente largos (>128 K) |

---

### 🥈 2. GPT-5.4

| Aspecto | Detalle |
|---------|---------|
| **Veredicto vs Sonnet 4.5** | **Superior** |
| **Input / Output** | ~$2.00 / ~$8.00 por 1M tokens |
| **Contexto** | 272 K+ (standard) / ampliado en variantes long |
| **Deployment sugerido** | `gpt-5-4-eval` (único deployment) |
| **Por qué #2** | Generación más reciente del catálogo Azure. Supera a Sonnet 4.5 en comprensión de instrucciones. Contexto **272 K** (vs 200 K de Sonnet) — mejor opción única si priorizas documentos largos sin llegar a 1 M. |
| **Fortaleza clave** | Un solo modelo para evaluaciones, aptitud y bulk con contexto amplio |
| **Limitación** | Catálogo más nuevo — conviene calibrar notas vs Sonnet en muestra real |

---

### 🥉 3. GPT-4.1

| Aspecto | Detalle |
|---------|---------|
| **Veredicto vs Sonnet 4.5** | **Igual** en calidad / **Superior** en contexto largo |
| **Input / Output** | $2.00 / $8.00 por 1M tokens |
| **Contexto** | **1 M tokens** |
| **Deployment sugerido** | `gpt-4-1-eval` (único deployment) |
| **Por qué #3** | Calidad equivalente a Sonnet 4.5 en evaluación con rúbrica. **Ventaja decisiva como modelo único:** contexto 5× mayor — crítico para CVs extensos, notebooks grandes, ZIPs y bulk sin truncar. |
| **Fortaleza clave** | Documentos largos, evaluación escrita, notebooks, carga masiva |
| **Limitación** | Ligeramente por debajo de GPT-5.2/5.4 en razonamiento fino |

---

### 4º — o3

| Aspecto | Detalle |
|---------|---------|
| **Veredicto vs Sonnet 4.5** | **Superior** (razonamiento) / **Igual** (tareas simples) |
| **Input / Output** | $2.00 / $8.00 por 1M tokens |
| **Contexto** | 200 K |
| **Deployment sugerido** | `o3-eval` (único deployment) |
| **Por qué #4** | Modelo de **razonamiento profundo**. Supera a Sonnet 4.5 en análisis de aptitud difícil. Como **único modelo**, baja en el ranking por **latencia alta** en scanners y bulk masivo. |
| **Fortaleza clave** | Veredictos de aptitud con razonamiento detallado |
| **Limitación** | Latencia y costo de tokens internos — poco práctico para 20–100+ evaluaciones en ZIP |

---

### 5º — GPT-5

| Aspecto | Detalle |
|---------|---------|
| **Veredicto vs Sonnet 4.5** | **Igual o ligeramente superior** |
| **Input / Output** | ~$1.25 / ~$10.00 por 1M tokens |
| **Contexto** | 128 K+ |
| **Deployment sugerido** | `gpt-5-eval` (único deployment) |
| **Por qué #5** | Flagship probado en Azure antes de GPT-5.2/5.4. Capacidad general sólida, comparable o superior a Sonnet 4.5 en la mayoría de tareas. Buena opción única si GPT-5.2 aún no está desplegado. |
| **Fortaleza clave** | Balance madurez + capacidad, GA estable |
| **Limitación** | Superado en calidad por GPT-5.2 y GPT-5.4; contexto menor que GPT-4.1 |

---

### Resumen visual del ranking

```
Calidad vs Claude Sonnet 4.5 — modelo único para todo (sin considerar costo)

  Superior  ████████████████████  GPT-5.2   (#1)  ← recomendado
  Superior  ██████████████████    GPT-5.4   (#2)
  Igual/+   ██████████████        GPT-4.1   (#3)  +contexto 1M
  Superior* ████████████████      o3        (#4)  *latencia alta en bulk
  Igual/+   ██████████████        GPT-5     (#5)

  Referencia ───────────────────  Sonnet 4.5 (actual)
```

### Modelos que NO entran al Top 5 (pero disponibles en tu suscripción)

| Modelo | Motivo de exclusión |
|--------|---------------------|
| GPT-4o | Igual a Sonnet 4.5, no superior — contexto 128 K |
| o4-mini / o3-mini | Razonamiento bueno pero por debajo de Sonnet en rúbricas estrictas |
| GPT-4.1-mini / GPT-5-mini | **Inferiores** a Sonnet 4.5 — no aptos como modelo único |
| o1 | Superior en calidad pura, pero latencia y costo lo hacen impracticable como único modelo |
| GPT-4.1-nano / GPT-4o-mini | Claramente inferiores — no sustituyen a Sonnet 4.5 |

### Recomendación según el ranking (un solo modelo)

| Si buscas… | Elige del ranking |
|------------|-------------------|
| **Mejor calidad general en todo el flujo** | **#1 GPT-5.2** ⭐ |
| **Última generación + contexto 272 K** | **#2 GPT-5.4** |
| **Máximo contexto (CVs/ZIP enormes) + calidad igual** | **#3 GPT-4.1** |
| **Máximo razonamiento en aptitud** (aceptando latencia en bulk) | **#4 o3** |
| **Opción probada y estable** | **#5 GPT-5** |

---

## 4. Catálogo GPT disponible en tu suscripción Azure

En Azure el código referencia el **nombre del deployment** (ej. `gpt-5-2-eval`), no el ID interno del modelo. Con suscripción premium puedes elegir cualquier modelo del catálogo; el proyecto usará **uno solo** para todas las tareas.

Precios de referencia: **Global deployment**, USD por millón de tokens ([Azure OpenAI Pricing](https://azure.microsoft.com/pricing/details/azure-openai/)). En suscripciones enterprise pueden aplicarse descuentos por contrato (EA/CSP).

### 4.1 Candidatos viables como modelo único (Top 5 del ranking)

| Modelo Azure | Versión en catálogo | Input ($/1M) | Output ($/1M) | Contexto | vs Sonnet 4.5 |
|--------------|---------------------|-------------|---------------|----------|---------------|
| **GPT-5.2** ⭐ | `gpt-5.2-2025-xx` | ~$1.75 | ~$14.00 | 128 K+ | **Mejor calidad general** |
| **GPT-5.4** | `gpt-5.4` | ~$2.00 | ~$8.00 | 272 K+ | Última generación, contexto amplio |
| **GPT-4.1** | `gpt-4.1-2025-04-14` | **$2.00** | **$8.00** | **1 M** | Igual calidad, **mejor para docs largos** |
| **o3** | `o3-2025-04-16` | $2.00 | $8.00 | 200 K | Superior en razonamiento, **latencia alta** |
| **GPT-5** | `gpt-5-2025-08-07` | ~$1.25 | ~$10.00 | 128 K+ | Estable, comparable a Sonnet |

### 4.2 Otros modelos del catálogo (no recomendados como único)

| Modelo | Motivo de no usarlo como único |
|--------|-------------------------------|
| GPT-4o | Igual a Sonnet 4.5, no superior |
| o4-mini / o3-mini | Por debajo de Sonnet en rúbricas estrictas |
| GPT-4.1-mini / GPT-5-mini | Inferiores para evaluación principal |
| o1 | Calidad alta pero costo y latencia inaceptables para bulk |
| GPT-5.x Codex | Especializado en código; no cubre bien CV/aptitud como único |

### 4.3 Costo comparativo (8 K input + 2 K output por evaluación)

| Modelo | Costo/evaluación | vs Claude Sonnet 4.5 |
|--------|-----------------|----------------------|
| Claude Sonnet 4.5 | **$0.054** | — (referencia) |
| GPT-5.2 | **~$0.042** | −22 % |
| GPT-5.4 | **~$0.032** | −41 % |
| GPT-4.1 | **$0.032** | −41 % |
| GPT-5 | **~$0.030** | −44 % |
| o3 | **$0.032** | −41 % |
| GPT-4o | **$0.040** | −26 % |
| o1 | **$0.240** | +344 % ❌ |

> Con **un solo modelo**, el costo de bulk masivo es el mismo por evaluación que el individual. Para 50 evaluaciones/día con GPT-5.2 → ~**$63/mes** (vs ~$81/mes con Sonnet 4.5).

---

## 5. Arquitectura recomendada — un solo modelo

El proyecto usará **un único deployment** de Azure OpenAI para **todas** las tareas: evaluación técnica, CV, aptitud, scanners admin y carga masiva. No hay routing por tarea ni modelos auxiliares.

### 5.1 Modelo recomendado ⭐

| Decisión | Valor |
|----------|-------|
| **Modelo elegido** | **GPT-5.2** |
| **Deployment** | `gpt-5-2-eval` |
| **Motivo** | #1 del ranking; superior a Sonnet 4.5 en calidad general, rúbricas, código y JSON estructurado |

### 5.2 Alternativas si GPT-5.2 no está disponible aún

| Prioridad | Modelo | Deployment | Cuándo elegirla |
|-----------|--------|------------|-----------------|
| **A — Calidad máxima** | **GPT-5.2** | `gpt-5-2-eval` | Opción por defecto |
| **B — Contexto largo** | **GPT-4.1** | `gpt-4-1-eval` | CVs/ZIP/notebooks que superen 128 K tokens |
| **C — Última generación** | **GPT-5.4** | `gpt-5-4-eval` | Balance calidad + contexto 272 K |
| **D — Estable** | **GPT-5** | `gpt-5-eval` | Deployment ya probado en tu tenant |

### 5.3 Variables de entorno (modelo único)

```env
AI_PROVIDER=azure

AZURE_OPENAI_ENDPOINT=https://TU-RECURSO.openai.azure.com/
AZURE_OPENAI_API_KEY=tu-api-key
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_DEPLOYMENT=gpt-5-2-eval

AI_TIMEOUT=300
```

> **Nota:** `AZURE_OPENAI_DEPLOYMENT` es el **único** identificador de modelo. Todos los servicios (`ai_evaluator`, `resume_evaluator`, `combined_analyzer`, `test_scanner`, `job_scanner`, `bulk_evaluator`) usan el mismo valor.

---

## 6. Ventajas y desventajas del modelo único elegido

### GPT-5.2 ⭐ (recomendado)

| Ventajas | Desventajas |
|----------|-------------|
| Superior a Sonnet 4.5 en calidad general | Output más caro que GPT-4.1 ($14 vs $8 /1M) |
| Un solo deployment para todo el flujo | Contexto 128 K (menor que GPT-4.1 para docs enormes) |
| Excelente en coding, rúbricas y JSON | Mismo costo en bulk que en evaluación individual |
| Disponible sin restricciones en tu suscripción | |
| Priority Processing disponible | |

### GPT-5.4 (alternativa)

| Ventajas | Desventajas |
|----------|-------------|
| Contexto 272 K — superior a Sonnet | Menos referencias que GPT-4.1 |
| Última generación del catálogo | Catálogo más nuevo — calibrar notas |
| Buen balance input/output ($2/$8) | |
| Un solo modelo para evaluación + bulk | |

### GPT-4.1 (alternativa — documentos largos)

| Ventajas | Desventajas |
|----------|-------------|
| **1 M tokens** — ideal si un solo modelo debe cubrir ZIP/CV enormes | Calidad ligeramente inferior a GPT-5.2 en código |
| Mejor relación calidad/precio ($2/$8) | |
| GA estable, bien documentado | |
| Mismo modelo en individual y masivo | |

### o3 (alternativa — solo si priorizas razonamiento)

| Ventajas | Desventajas |
|----------|-------------|
| Razonamiento profundo para aptitud difícil | **Alta latencia** en scanners y bulk (20–100+ llamadas) |
| Mismo precio que GPT-4.1 ($2/$8) | Tokens de razonamiento internos aumentan tiempo de respuesta |
| 200 K contexto | No recomendado como único salvo bajo volumen |

---

## 7. Cambios de código necesarios (sin romper funcionalidad)

### 7.1 Resumen de cambios

| Archivo | Acción |
|---------|--------|
| `back/requirements.txt` | Añadir `openai>=1.40.0` |
| `back/config.py` | `AI_PROVIDER`, `AZURE_OPENAI_*`, `AZURE_OPENAI_DEPLOYMENT` |
| `back/.env.example` | Documentar configuración Azure (un deployment) |
| `back/services/ai_client.py` | **NUEVO** — cliente unificado Anthropic / Azure |
| `back/services/ai_evaluator.py` | Usar `call_ai(system, user)` |
| `back/services/resume_evaluator.py` | Usar `call_ai(system, user)` |
| `back/services/combined_analyzer.py` | Usar `call_ai(system, user)` |
| `back/services/test_scanner.py` | Usar `call_ai(system, user)` |
| `back/services/job_scanner.py` | Usar `call_ai(system, user)` |
| `back/services/bulk_evaluator.py` | Sin cambio de lógica — delega en servicios anteriores |
| `back/main.py` | `/health` con proveedor y deployment activo |

**No requiere cambios en frontend** ni en JSON Server.

### 7.2 Cliente unificado (`ai_client.py`)

```python
"""Cliente unificado de IA: Anthropic o Azure OpenAI (un solo deployment)."""
from config import (
    AI_PROVIDER, ANTHROPIC_API_KEY, AI_MODEL, AI_TIMEOUT,
    AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_VERSION, AZURE_OPENAI_DEPLOYMENT,
)


def is_ai_configured() -> bool:
    if AI_PROVIDER == "azure":
        return bool(AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY and AZURE_OPENAI_DEPLOYMENT)
    return bool(ANTHROPIC_API_KEY)


def call_ai(system: str, user: str, max_tokens: int = 8192) -> str:
    if not is_ai_configured():
        raise ValueError("El servicio de IA no está configurado.")
    if AI_PROVIDER == "azure":
        return _call_azure(system, user, max_tokens)
    return _call_anthropic(system, user, max_tokens)


def _call_azure(system: str, user: str, max_tokens: int) -> str:
    from openai import AzureOpenAI
    client = AzureOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
    )
    response = client.chat.completions.create(
        model=AZURE_OPENAI_DEPLOYMENT,
        max_tokens=max_tokens,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system + "\nResponde ÚNICAMENTE con un objeto JSON válido."},
            {"role": "user", "content": user},
        ],
        timeout=AI_TIMEOUT,
    )
    return response.choices[0].message.content or ""


def _call_anthropic(system: str, user: str, max_tokens: int) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=AI_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        timeout=AI_TIMEOUT,
    )
    return response.content[0].text if response.content else ""
```

### 7.3 `config.py` — un solo deployment

```python
AI_PROVIDER = os.getenv("AI_PROVIDER", "azure").lower()

# Anthropic (fallback / revertir)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
AI_MODEL = os.getenv("AI_MODEL", "claude-sonnet-4-5")

# Azure OpenAI — un único deployment para todas las tareas
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-21")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5-2-eval")

AI_TIMEOUT = int(os.getenv("AI_TIMEOUT", "300"))
```

### 7.4 Ejemplo de uso en servicios

```python
# Todos los servicios usan la misma firma — sin parámetro task
raw = call_ai(SYSTEM_PROMPT, user_prompt)

# ai_evaluator.py — código, escrito, notebook
# resume_evaluator.py — CV
# combined_analyzer.py — aptitud (cuando promedio ≤ 3.8)
# test_scanner.py / job_scanner.py — escaneo admin
# bulk_evaluator.py — delega en los servicios anteriores (mismo modelo)
```

---

## 8. Diferencias API Anthropic vs Azure OpenAI

| Aspecto | Anthropic (actual) | Azure OpenAI (GPT) |
|---------|-------------------|-------------------|
| Identificador | `AI_MODEL=claude-sonnet-4-5` | **Nombre del deployment** |
| System prompt | Parámetro `system=` | Mensaje `role: system` |
| JSON estructurado | Solo vía prompt | `response_format={"type": "json_object"}` ✅ |
| Multi-modelo | Un solo `AI_MODEL` | **Un solo `AZURE_OPENAI_DEPLOYMENT`** |
| Autenticación | `ANTHROPIC_API_KEY` | Endpoint + API key Azure |
| Batch (masivo) | No nativo | **Batch API** — 50 % descuento |
| Priority Processing | No | ✅ Disponible en tu suscripción |
| PTU (throughput reservado) | No | ✅ Para latencia predecible en producción |

---

## 9. Pasos de migración (modelo único)

1. En **Azure AI Foundry** → crear recurso Azure OpenAI (si no existe).
2. **Crear un deployment** en Model deployments:

   | Deployment name | Modelo base | Uso |
   |-----------------|-------------|-----|
   | `gpt-5-2-eval` | GPT-5.2 | **Todas** las tareas del evaluador |

   *(Alternativa: `gpt-4-1-eval` con GPT-4.1 si necesitas contexto 1 M)*

3. Copiar **Endpoint** y **Key** → configurar `.env`.
4. Implementar `ai_client.py` (cliente único, sin routing por tarea).
5. Refactorizar los 5 servicios para usar `call_ai(system, user)`.
6. Probar todos los flujos (checklist sección 11).
7. *(Opcional)* Activar **Batch API** para carga masiva → 50 % ahorro (mismo modelo).
8. *(Opcional)* Reservar **PTU** si el volumen diario supera ~500 evaluaciones.

---

## 10. Matriz de decisión (un solo modelo)

| Prioridad | Modelo único | Deployment |
|-----------|--------------|------------|
| **Máxima calidad** ⭐ | GPT-5.2 | `gpt-5-2-eval` |
| **Documentos muy largos** | GPT-4.1 | `gpt-4-1-eval` |
| **Última generación** | GPT-5.4 | `gpt-5-4-eval` |
| **Estable / probado** | GPT-5 | `gpt-5-eval` |
| **Revertir a Claude** | Sonnet 4.5 | `AI_PROVIDER=anthropic` |

---

## 11. Checklist de regresión funcional

- [ ] Notas 0–5 con decimales en todas las evaluaciones
- [ ] JSON válido en CV, código, escrito, notebook y scanners
- [ ] Regla automática: promedio > 3.8 → APTO (sin llamada extra a IA)
- [ ] Evaluación con 1 vs 2 archivos (escrito/notebook)
- [ ] Combinación código + escrito → promedio técnico para aptitud
- [ ] Carga masiva ZIP con el **mismo** deployment
- [ ] Generación de PDFs (independiente del proveedor)
- [ ] `/health` responde `api_configured: true` y nombre del deployment
- [ ] Timeout 300 s en documentos largos
- [ ] Comparar 10–20 evaluaciones: notas GPT vs Claude (calibración)

---

## 12. Referencias

- [Azure OpenAI — Precios](https://azure.microsoft.com/pricing/details/azure-openai/)
- [Azure AI Foundry — Catálogo de modelos](https://ai.azure.com/catalog)
- [OpenAI SDK — Azure endpoints](https://learn.microsoft.com/azure/ai-services/openai/how-to/switching-endpoints)
- [Batch API — Azure OpenAI](https://learn.microsoft.com/azure/ai-services/openai/how-to/batch)
- [Provisioned Throughput (PTU)](https://learn.microsoft.com/azure/ai-services/openai/concepts/provisioned-throughput)
- Documentación interna: `documentacion/03_COMPONENTES_BACKEND_C4.md`

---

## 13. Conclusión

| Pregunta | Respuesta |
|----------|-----------|
| ¿Cuántos modelos usar? | **Uno solo** — mismo deployment en todo el flujo |
| ¿Mejor reemplazo por calidad? | **GPT-5.2** (`gpt-5-2-eval`) — #1 del ranking |
| ¿Alternativa para docs muy largos? | **GPT-4.1** (`gpt-4-1-eval`) — contexto 1 M |
| ¿Alternativa última generación? | **GPT-5.4** (`gpt-5-4-eval`) — contexto 272 K |
| ¿Hay restricciones de modelos? | **No** — suscripción premium con catálogo completo |
| ¿Hay que tocar el frontend? | **No** |
| ¿Se puede revertir? | **Sí** — `AI_PROVIDER=anthropic` |

La migración consiste en **un deployment de Azure OpenAI** (`gpt-5-2-eval` recomendado) consumido por `ai_client.py` desde todos los servicios backend, manteniendo prompts, parsers JSON, reglas de aptitud y PDFs sin cambios.
