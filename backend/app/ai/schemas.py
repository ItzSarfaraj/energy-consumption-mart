from typing import Any, Literal

from pydantic import BaseModel, Field


class AIInsightsResponse(BaseModel):
    metrics: dict[str, Any] = Field(
        description="Authoritative metrics collected from DuckDB."
    )
    insights: str = Field(
        description="Narrative generated from the supplied metrics."
    )
    generation_mode: Literal["ai", "fallback"] = Field(
        description="Whether the report used AI or the deterministic fallback."
    )
