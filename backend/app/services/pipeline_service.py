
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from time import perf_counter

import duckdb

from app.data.ingest import main as run_ingestion


# --------------------------------------------------
# Project paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[3]
SQL_DIR = PROJECT_ROOT / "backend" / "sql"
DATABASE_PATH = PROJECT_ROOT / "backend" / "energy_mart.duckdb"


# --------------------------------------------------
# Pipeline configuration
# --------------------------------------------------

TRANSFORMATION_FILES = [
    "02_staging.sql",
    "03_interval_consumption.sql",
    "04_hourly_mart.sql",
    "05_daily_mart.sql",
    "06_expected_intervals.sql",
    "07_hourly_quality_mart.sql",
]

pipeline_lock = Lock()
pipeline_history = []
latest_run = None


# --------------------------------------------------
# Execute one SQL transformation
# --------------------------------------------------

def execute_sql_file(filename: str):
    """Execute one SQL transformation against the DuckDB database."""

    if not DATABASE_PATH.exists():
        raise FileNotFoundError(
            f"DuckDB database not found: {DATABASE_PATH}"
        )

    sql_path = SQL_DIR / filename

    if not sql_path.exists():
        raise FileNotFoundError(
            f"SQL file not found: {sql_path}"
        )

    sql = sql_path.read_text(encoding="utf-8")

    with duckdb.connect(str(DATABASE_PATH)) as connection:
        connection.execute(sql)


# --------------------------------------------------
# Pipeline execution
# --------------------------------------------------

def run_pipeline():
    global latest_run

    # Prevent concurrent pipeline executions.
    if not pipeline_lock.acquire(blocking=False):
        return {
            "status": "already_running",
            "message": "A pipeline run is already in progress.",
            "steps": [],
        }

    started_at = datetime.now(timezone.utc).isoformat()
    pipeline_started = perf_counter()

    result = {
        "status": "running",
        "started_at": started_at,
        "finished_at": None,
        "duration_seconds": 0,
        "steps": [],
        "error": None,
    }

    def execute_step(name, action):
        """Track the status and execution time of one pipeline step."""

        step_started = perf_counter()

        step = {
            "name": name,
            "status": "running",
            "duration_seconds": 0,
            "error": None,
        }

        result["steps"].append(step)

        try:
            action()
            step["status"] = "success"

        except Exception as exc:
            step["status"] = "failed"
            step["error"] = str(exc)
            raise

        finally:
            step["duration_seconds"] = round(
                perf_counter() - step_started, 3
            )

    try:
        # Step 1: Load the source CSV files.
        execute_step("Ingest CSV data", run_ingestion)

        # Steps 2–7: Execute each SQL transformation separately.
        for filename in TRANSFORMATION_FILES:
            execute_step(
                filename,
                lambda filename=filename: execute_sql_file(filename),
            )

        result["status"] = "success"

    except Exception as exc:
        result["status"] = "failed"
        result["error"] = str(exc)

    finally:
        result["finished_at"] = datetime.now(
            timezone.utc
        ).isoformat()

        result["duration_seconds"] = round(
            perf_counter() - pipeline_started, 3
        )

        # Store recent execution history.
        pipeline_history.insert(0, result.copy())
        del pipeline_history[20:]

        latest_run = result

        # Always release the lock after execution.
        pipeline_lock.release()

    return result


# --------------------------------------------------
# Pipeline status and history
# --------------------------------------------------

def get_pipeline_status():
    """Return the latest execution, recent history, and configured steps."""

    return {
        "latest_run": latest_run,
        "history": pipeline_history[:20],
        "pipeline_steps": [
            "Ingest CSV data",
            *TRANSFORMATION_FILES,
        ],
    }
