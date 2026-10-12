
from fastapi.testclient import TestClient

import app.main as main

client = TestClient(main.app)

import app.services.insights_service as insights_service


def test_ai_insights_endpoint_returns_metrics_and_narrative(monkeypatch):
    """Verify the endpoint response without calling an AI provider."""

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

    # Accept the optional refresh argument used by the endpoint.
    monkeypatch.setattr(
        main,
        "generate_energy_insights",
        lambda force_refresh=False: fake_result,
    )

    response = client.get("/api/ai/insights")

    assert response.status_code == 200

    body = response.json()
    assert body["metrics"]["overview"]["total_meters"] == 10
    assert "synthetic dataset" in body["insights"]
    assert body["generation_mode"] == "fallback"


def test_ai_insights_endpoint_supports_forced_refresh(monkeypatch):
    """Verify the endpoint forwards the force_refresh query parameter."""

    calls = []

    def fake_generate(force_refresh=False):
        calls.append(force_refresh)
        return {
            "metrics": {"overview": {}},
            "insights": "Synthetic test report.",
            "generation_mode": "fallback",
        }

    monkeypatch.setattr(
        main,
        "generate_energy_insights",
        fake_generate,
    )

    response = client.get(
        "/api/ai/insights",
        params={"force_refresh": "true"},
    )

    assert response.status_code == 200
    assert calls == [True]




def test_ai_provider_failure_returns_fallback_report(monkeypatch):
    """Verify that AI failure produces a usable fallback report."""

    fake_metrics = {
        "overview": {
            "total_consumption_kwh": 1250.0,
            "completeness_pct": 99.5,
            "total_meters": 10,
            "total_sites": 3,
            "incomplete_hours": 2,
            "valid_intervals": 995,
            "expected_intervals": 1000,
        },
        "peak_hours": [],
        "interval_quality": [
            {"interval_status": "valid", "interval_count": 995},
            {"interval_status": "missing_reading", "interval_count": 5},
        ],
    }

    # Prevent the test from using the real database.
    monkeypatch.setattr(
        insights_service,
        "collect_energy_metrics",
        lambda: fake_metrics,
    )

    # Simulate Ollama or another AI provider being unavailable.
    def failing_model():
        raise RuntimeError("Simulated AI provider outage")

    monkeypatch.setattr(
        insights_service,
        "get_chat_model",
        failing_model,
    )

    # Ensure this test generates a new report.
    insights_service.clear_insights_cache()

    try:
        report = insights_service.generate_energy_insights(
            force_refresh=True
        )

        assert report["generation_mode"] == "fallback"
        assert report["metrics"] == fake_metrics
        assert isinstance(report["insights"], str)
        assert report["insights"].strip()
        assert "synthetic" in report["insights"].lower()
        assert "missing_reading" in report["insights"]
    finally:
        insights_service.clear_insights_cache()

