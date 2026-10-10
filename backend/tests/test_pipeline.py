
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.services import pipeline_service


client = TestClient(app)


def test_pipeline_status_endpoint():
    response = client.get("/api/pipeline/status")

    assert response.status_code == 200

    data = response.json()

    assert "latest_run" in data
    assert "history" in data
    assert "pipeline_steps" in data


def test_pipeline_runs_all_steps():
    with patch.object(
        pipeline_service,
        "run_ingestion",
    ), patch.object(
        pipeline_service,
        "execute_sql_file",
    ):
        result = pipeline_service.run_pipeline()

    assert result["status"] == "success"
    assert len(result["steps"]) == 7
    assert all(
        step["status"] == "success"
        for step in result["steps"]
    )


def test_pipeline_stops_when_sql_step_fails():
    def fail_sql(filename):
        raise RuntimeError("Simulated SQL failure")

    with patch.object(
        pipeline_service,
        "run_ingestion",
    ), patch.object(
        pipeline_service,
        "execute_sql_file",
        side_effect=fail_sql,
    ):
        result = pipeline_service.run_pipeline()

    assert result["status"] == "failed"
    assert result["steps"][0]["status"] == "success"
    assert result["steps"][1]["status"] == "failed"
    assert "Simulated SQL failure" in result["error"]
    assert len(result["steps"]) == 2


def test_pipeline_prevents_concurrent_runs():
    assert pipeline_service.pipeline_lock.acquire(
        blocking=False
    )

    try:
        result = pipeline_service.run_pipeline()

        assert result["status"] == "already_running"
    finally:
        pipeline_service.pipeline_lock.release()
