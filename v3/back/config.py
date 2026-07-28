"""Configuración de la aplicación."""
import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
# Modelo por defecto: usar un ID válido para la API key actual.
# Puedes sobreescribirlo con la variable de entorno AI_MODEL.
AI_MODEL = os.getenv("AI_MODEL", "claude-sonnet-4-5")
AI_TIMEOUT = int(os.getenv("AI_TIMEOUT", "300"))  # segundos (sin límite de tokens, permite respuestas largas)
MAX_RUBRIC_CRITERIA = 50
MIN_RUBRIC_CRITERIA = 3
JSON_SERVER_URL = os.getenv("JSON_SERVER_URL", "http://localhost:3000")

# Puntaje mínimo (0-5) para considerar aprobada la prueba técnica o la revisión de CV
# antes de ejecutar el análisis unificado de aptitud.
MIN_PASSING_CODE_SCORE = float(os.getenv("MIN_PASSING_CODE_SCORE", "3.0"))
MIN_PASSING_CV_SCORE = float(os.getenv("MIN_PASSING_CV_SCORE", "3.0"))
