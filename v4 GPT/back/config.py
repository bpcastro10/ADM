"""Configuración de la aplicación."""
import os
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# IA — Azure OpenAI GPT-5.4 (activo)
# =============================================================================
AI_PROVIDER = os.getenv("AI_PROVIDER", "azure").lower()

AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-21")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5-4-eval")

# GPT-5.2 (alternativa): descomenta en .env → AZURE_OPENAI_DEPLOYMENT=gpt-5-2-eval

# =============================================================================
# Anthropic — no usado con GPT-5.4 (descomenta en .env y aquí si cambias de proveedor)
# =============================================================================
# ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
# AI_MODEL = os.getenv("AI_MODEL", "claude-sonnet-4-5")

AI_TIMEOUT = int(os.getenv("AI_TIMEOUT", "300"))  # segundos (sin límite de tokens, permite respuestas largas)
MAX_RUBRIC_CRITERIA = 50
MIN_RUBRIC_CRITERIA = 3
JSON_SERVER_URL = os.getenv("JSON_SERVER_URL", "http://localhost:3000")

# Puntaje mínimo (0-5) para considerar aprobada la prueba técnica o la revisión de CV
# antes de ejecutar el análisis unificado de aptitud.
MIN_PASSING_CODE_SCORE = float(os.getenv("MIN_PASSING_CODE_SCORE", "3.0"))
MIN_PASSING_CV_SCORE = float(os.getenv("MIN_PASSING_CV_SCORE", "3.0"))
