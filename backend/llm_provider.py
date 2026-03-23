"""
Multi-provider LLM abstraction.
Supports OpenAI, Anthropic, and Google Gemini via direct HTTP calls.
"""

import json
import httpx

PROVIDERS = {
    "openai": {
        "models": {"main": "gpt-4o", "fast": "gpt-4o-mini"},
        "url": "https://api.openai.com/v1/chat/completions",
        "build_headers": lambda key: {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        "build_body": lambda model, messages, json_mode: {
            "model": model,
            "messages": messages,
            "temperature": 0.3,
            **({"response_format": {"type": "json_object"}} if json_mode else {}),
        },
        "extract_text": lambda data: data["choices"][0]["message"]["content"],
    },
    "anthropic": {
        "models": {"main": "claude-sonnet-4-20250514", "fast": "claude-haiku-4-5-20251001"},
        "url": "https://api.anthropic.com/v1/messages",
        "build_headers": lambda key: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        "build_body": lambda model, messages, json_mode: {
            "model": model,
            "max_tokens": 4096,
            "messages": _convert_to_anthropic_messages(messages),
            **(_anthropic_system(messages)),
        },
        "extract_text": lambda data: data["content"][0]["text"],
    },
    "gemini": {
        "models": {"main": "gemini-2.5-flash", "fast": "gemini-2.5-flash"},
        "build_url": lambda key, model: (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        ),
        "build_headers": lambda key: {
            "Content-Type": "application/json",
        },
        "build_body": lambda model, messages, json_mode: {
            "contents": _convert_to_gemini_messages(messages),
            **(_gemini_system(messages)),
            "generationConfig": {
                "temperature": 0.3,
                **({"responseMimeType": "application/json"} if json_mode else {}),
            },
        },
        "extract_text": lambda data: data["candidates"][0]["content"]["parts"][0]["text"],
    },
}


def _convert_to_anthropic_messages(messages):
    """Convert OpenAI-style messages to Anthropic format (no system role in messages)."""
    return [m for m in messages if m["role"] != "system"]


def _anthropic_system(messages):
    """Extract system message for Anthropic's top-level system param."""
    for m in messages:
        if m["role"] == "system":
            return {"system": m["content"]}
    return {}


def _convert_to_gemini_messages(messages):
    """Convert OpenAI-style messages to Gemini format."""
    contents = []
    for m in messages:
        if m["role"] == "system":
            continue
        role = "user" if m["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})
    return contents


def _gemini_system(messages):
    """Extract system instruction for Gemini."""
    for m in messages:
        if m["role"] == "system":
            return {"systemInstruction": {"parts": [{"text": m["content"]}]}}
    return {}


async def chat_complete(
    provider: str, api_key: str, model_tier: str, messages: list[dict], json_mode: bool = True
) -> str:
    """
    Send a chat completion request to the specified provider.

    Args:
        provider: "openai", "anthropic", or "gemini"
        api_key: The API key for the provider
        model_tier: "main" (powerful) or "fast" (cheaper/faster)
        messages: OpenAI-style messages list
        json_mode: Whether to request JSON output

    Returns:
        The text content of the response
    """
    config = PROVIDERS[provider]
    model = config["models"][model_tier]

    if provider == "gemini":
        url = config["build_url"](api_key, model)
    else:
        url = config["url"]

    headers = config["build_headers"](api_key)
    body = config["build_body"](model, messages, json_mode)

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(url, headers=headers, json=body)

        if response.status_code != 200:
            error_text = response.text
            raise Exception(f"{provider} API error ({response.status_code}): {error_text}")

        data = response.json()
        return config["extract_text"](data)
