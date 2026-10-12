
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from langchain_core.messages import AIMessage

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")


def get_chat_model():
    """Return the configured local Ollama chat model."""
    return OllamaChatModel(
        base_url=os.getenv(
            "OLLAMA_BASE_URL",
            "http://localhost:11434",
        ),
        model=os.getenv("OLLAMA_MODEL", "qwen2.5:3b"),
        timeout=float(os.getenv("OLLAMA_TIMEOUT", "120")),
    )


class OllamaChatModel:
    """Minimal LangChain-compatible wrapper around Ollama's local API."""

    def __init__(
        self,
        base_url: str,
        model: str,
        timeout: float = 120,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def invoke(self, prompt: str) -> AIMessage:
        """Send a prompt to Ollama and return its response."""
        response = httpx.post(
            f"{self.base_url}/api/chat",
            json={
                "model": self.model,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "stream": False,
                "options": {
                    "temperature": 0.2,
                },
            },
            timeout=self.timeout,
        )

        response.raise_for_status()
        data = response.json()
        content = data.get("message", {}).get("content", "").strip()

        if not content:
            raise ValueError("Ollama returned an empty response.")

        return AIMessage(content=content)