"""Cliente unificado de IA: Azure OpenAI (GPT-5.2 / GPT-5.4) o Anthropic (fallback)."""
from __future__ import annotations

import os

from config import (
    AI_PROVIDER,
    AI_TIMEOUT,
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_DEPLOYMENT,
    AZURE_OPENAI_ENDPOINT,
)

_JSON_SYSTEM_SUFFIX = "\nResponde ÚNICAMENTE con un objeto JSON válido."


def is_ai_configured() -> bool:
    if AI_PROVIDER == "azure":
        return bool(AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY and AZURE_OPENAI_DEPLOYMENT)
    return bool(os.getenv("ANTHROPIC_API_KEY", ""))


def get_ai_status() -> dict:
    configured = is_ai_configured()
    if AI_PROVIDER == "azure":
        return {
            "api_configured": configured,
            "ai_provider": "azure",
            "ai_model": AZURE_OPENAI_DEPLOYMENT,
        }
    return {
        "api_configured": configured,
        "ai_provider": "anthropic",
        "ai_model": os.getenv("AI_MODEL", "claude-sonnet-4-5"),
    }


def call_ai(system: str, user: str, max_tokens: int = 8192) -> str:
    if not is_ai_configured():
        raise ValueError(
            "El servicio de IA no está configurado. "
            "Configure Azure OpenAI (AI_PROVIDER=azure) o ANTHROPIC_API_KEY (AI_PROVIDER=anthropic)."
        )
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
            {"role": "system", "content": system + _JSON_SYSTEM_SUFFIX},
            {"role": "user", "content": user},
        ],
        timeout=AI_TIMEOUT,
    )
    return response.choices[0].message.content or ""


def _call_anthropic(system: str, user: str, max_tokens: int) -> str:
    from anthropic import Anthropic

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    model = os.getenv("AI_MODEL", "claude-sonnet-4-5")
    client = Anthropic(api_key=api_key)
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        timeout=AI_TIMEOUT,
    )
    return response.content[0].text if response.content else ""
