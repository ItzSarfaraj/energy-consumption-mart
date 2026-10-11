import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
import httpx

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")


def get_chat_model():
    """Return the configured local or cloud chat model."""

    provider = os.getenv("AI_PROVIDER", "ollama").lower()

    if provider == "ollama":
        return OllamaChatModel(
            base_url=os.getenv(
                "OLLAMA_BASE_URL",
                "http://localhost:11434",
            ),
            model=os.getenv("OLLAMA_MODEL", "qwen2.5:3b"),
            timeout=float(os.getenv("OLLAMA_TIMEOUT", "120")),
        )

    if provider == "gemini":
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        location = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
        model_id = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

        if not project_id:
            raise RuntimeError(
                "GOOGLE_CLOUD_PROJECT is missing from the project-root .env."
            )

        if os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "").lower() != "true":
            raise RuntimeError(
                "Set GOOGLE_GENAI_USE_VERTEXAI=true in the project-root .env."
            )

        return ChatGoogleGenerativeAI(
            model=model_id,
            project=project_id,
            location=location,
            temperature=0.2,
            max_tokens=500,
        )

    raise ValueError(
        f"Unsupported AI_PROVIDER: {provider}. "
        "Choose 'ollama' or 'gemini'."
    )


class OllamaChatModel:
    """Minimal LangChain-compatible wrapper around Ollama's local API."""

    def __init__(self, base_url: str, model: str, timeout: float = 120):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def invoke(self, prompt: str):
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


from langchain_core.messages import AIMessage