
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["database_exists"] is True


def test_overview_endpoint():
    response = client.get("/api/overview")

    assert response.status_code == 200

    data = response.json()

    assert data["total_meters"] == 10
    assert data["total_sites"] == 5
    assert data["expected_intervals"] == 28800
    assert 0 <= data["completeness_pct"] <= 100


def test_hourly_endpoint_filters_by_meter():
    response = client.get("/api/hourly?meter_id=M001")

    assert response.status_code == 200

    data = response.json()

    assert len(data) > 0
    assert all(row["meter_id"] == "M001" for row in data)


def test_daily_endpoint_returns_30_days():
    response = client.get("/api/daily?meter_id=M001")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 30
    assert all(row["meter_id"] == "M001" for row in data)

    dates = [row["consumption_date"] for row in data]
    assert len(set(dates)) == 30


def test_quality_endpoint():
    response = client.get("/api/quality")

    assert response.status_code == 200

    data = response.json()

    assert "status_summary" in data
    assert "incomplete_hours" in data
    assert len(data["status_summary"]) > 0
    assert all(
        row["completeness_pct"] < 100
        for row in data["incomplete_hours"]
    )
