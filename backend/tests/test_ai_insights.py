
from fastapi.testclient import TestClient

import app.main as main

client = TestClient(main.app)


def test_ai_insights_endpoint_returns_metrics_and_narrative(monkeypatch):
    """Verify the endpoint response without calling Hugging Face."""

    fake_result = {
        "metrics": {
            "overview": {
                "total_consumption_kwh": 1250.0,
                "completeness_pct": 99.5,
                "total_meters": 10,
                "total_sites": 3,
                "incomplete_hours": 2,
            },
            "peak_hours": [],
            "interval_quality": [],
        },
        "insights": "The synthetic dataset has high data completeness.",
        "generation_mode": "fallback",
    }

    monkeypatch.setattr(
        main,
        "generate_energy_insights",
        lambda: fake_result,
    )

    response = client.get("/api/ai/insights")

    assert response.status_code == 200

    body = response.json()
    assert body["metrics"]["overview"]["total_meters"] == 10
    assert "synthetic dataset" in body["insights"]
    assert body["generation_mode"] == "fallback"
