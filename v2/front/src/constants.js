export const API_BASE = '/api'
export const JSON_API = '/json-api'
export const MIN_CRITERIA = 3
export const MAX_CRITERIA = 10
export const SCORE_LEVELS = ['0', '1', '2', '3', '4', '5']
export const NEW_ITEM = '__new__'
export const EVALUATION_HISTORY_KEY = 'poc_evaluation_history'

// Archivos aceptados en la pestaña de Evaluación Técnica / Solución
// Incluye formatos de código (devs) y documentos enriquecidos (roles no técnicos)
export const SOLUTION_FILE_ACCEPT =
  '.zip,.pdf,.docx,.doc,.txt,.py,.js,.ts,.jsx,.tsx,.java,.cs,.rb,.go,.php,.rs,.cpp,.c,.h,.hpp,.swift,.scala,.sql,.json,.yml,.yaml,.toml,.ini,.md,application/zip,application/x-zip-compressed'

/** @deprecated usar SOLUTION_FILE_ACCEPT */
export const CODE_FILE_ACCEPT = SOLUTION_FILE_ACCEPT

export const WRITTEN_FILE_ACCEPT = '.pdf,.docx,.doc,.txt'
export const CV_FILE_ACCEPT = '.pdf,.docx,.txt'
export const NOTEBOOK_FILE_ACCEPT = '.ipynb'
export const TEST_DOC_ACCEPT = '.pdf,.docx,.doc,.txt'

// Etiquetas de formato/lenguaje disponibles en la prueba técnica
export const FORMAT_OPTIONS = [
  { value: 'python',       label: 'Python' },
  { value: 'javascript',   label: 'JavaScript' },
  { value: 'java',         label: 'Java' },
  { value: 'typescript',   label: 'TypeScript' },
  { value: 'text',         label: 'Texto / Ensayo' },
  { value: 'excel',        label: 'Excel / Análisis de datos' },
  { value: 'business',     label: 'Caso de negocio' },
  { value: 'design',       label: 'Diseño / Creatividad' },
  { value: 'other',        label: 'Otro / General' },
]
