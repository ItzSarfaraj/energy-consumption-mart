
from pathlib import Path

import duckdb
from fastapi import FastAPI, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from app.services.pipeline_service import (
    run_pipeline,
    get_pipeline_status,
)


# --------------------------------------------------
# Project paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = PROJECT_ROOT / "backend" / "energy_mart.duckdb"


# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="Energy Consumption Mart API",
    description="Analytics API for synthetic smart-meter consumption data.",
    version="1.0.0",
)

# Allow the Vite development server to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Database helper
# --------------------------------------------------

def query_database(sql: str, params: list | None = None):
    """Execute a read-only SQL query and return rows as dictionaries."""

    if not DB_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="DuckDB database not found. Run the data pipeline first.",
        )

    try:
        with duckdb.connect(str(DB_PATH), read_only=True) as con:
            cursor = con.execute(sql, params or [])
            columns = [item[0] for item in cursor.description]
            rows = cursor.fetchall()

            return [
                dict(zip(columns, row))
                for row in rows
            ]

    except duckdb.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database query failed: {exc}",
        ) from exc


# --------------------------------------------------
# General endpoints
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Energy Consumption Mart API is running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "database_exists": DB_PATH.exists(),
    }


# --------------------------------------------------
# Overview endpoint
# --------------------------------------------------

@app.get("/api/overview")
def get_overview():
    sql = """
        SELECT
            SUM(total_valid_consumption_kwh)
                AS total_consumption_kwh,
            SUM(valid_intervals) AS valid_intervals,
            SUM(expected_intervals) AS expected_intervals,
            ROUND(
                100.0 * SUM(valid_intervals)
                / NULLIF(SUM(expected_intervals), 0),
                2
            ) AS completeness_pct,
            COUNT(DISTINCT meter_id) AS total_meters,
            COUNT(DISTINCT site_id) AS total_sites,
            COUNT(*) FILTER (
                WHERE completeness_pct < 100
            ) AS incomplete_hours
        FROM hourly_quality_mart
    """

    rows = query_database(sql)
    return rows[0]


# --------------------------------------------------
# Hourly consumption endpoint
# --------------------------------------------------

@app.get("/api/hourly")
def get_hourly(
    meter_id: str | None = None,
    site_id: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
):
    sql = """
        SELECT
            meter_id,
            site_id,
            hour_start,
            total_valid_consumption_kwh AS consumption_kwh,
            valid_intervals,
            expected_intervals,
            completeness_pct
        FROM hourly_quality_mart
        WHERE 1 = 1
    """

    params = []

    if meter_id:
        sql += " AND meter_id = ?"
        params.append(meter_id)

    if site_id:
        sql += " AND site_id = ?"
        params.append(site_id)

    if start_date:
        sql += " AND hour_start >= CAST(? AS TIMESTAMP)"
        params.append(start_date)

    if end_date:
        sql += " AND hour_start < CAST(? AS TIMESTAMP) + INTERVAL '1 day'"
        params.append(end_date)

    sql += " ORDER BY hour_start, meter_id"

    return query_database(sql, params)


# --------------------------------------------------
# Daily consumption endpoint
# --------------------------------------------------

@app.get("/api/daily")
def get_daily(
    meter_id: str | None = None,
    site_id: str | None = None,
):
    sql = """
        SELECT
            meter_id,
            site_id,
            CAST(hour_start AS DATE) AS consumption_date,
            SUM(total_valid_consumption_kwh)
                AS daily_consumption_kwh,
            SUM(valid_intervals) AS valid_intervals,
            SUM(expected_intervals) AS expected_intervals,
            ROUND(
                100.0 * SUM(valid_intervals)
                / NULLIF(SUM(expected_intervals), 0),
                2
            ) AS completeness_pct
        FROM hourly_quality_mart
        WHERE (? IS NULL OR meter_id = ?)
          AND (? IS NULL OR site_id = ?)
        GROUP BY
            meter_id,
            site_id,
            CAST(hour_start AS DATE)
        ORDER BY consumption_date, meter_id
    """

    return query_database(
        sql,
        [meter_id, meter_id, site_id, site_id],
    )


# --------------------------------------------------
# Data quality endpoint
# --------------------------------------------------

@app.get("/api/quality")
def get_quality(
    limit: int = Query(default=100, ge=1, le=1000),
):
    summary_sql = """
        SELECT
            interval_status,
            COUNT(*) AS interval_count
        FROM fct_interval_consumption
        GROUP BY interval_status
        ORDER BY interval_status
    """

    incomplete_sql = """
        SELECT
            meter_id,
            site_id,
            hour_start,
            expected_intervals,
            valid_intervals,
            completeness_pct
        FROM hourly_quality_mart
        WHERE completeness_pct < 100
        ORDER BY completeness_pct, meter_id, hour_start
        LIMIT ?
    """

    return {
        "status_summary": query_database(summary_sql),
        "incomplete_hours": query_database(
            incomplete_sql,
            [limit],
        ),
    }


# --------------------------------------------------
# Pipeline control endpoints
# --------------------------------------------------

@app.get("/api/pipeline/status")
def pipeline_status():
    return get_pipeline_status()


@app.post("/api/pipeline/run")
async def start_pipeline():
    result = await run_in_threadpool(run_pipeline)

    if result.get("status") == "already_running":
        raise HTTPException(
            status_code=409,
            detail=result.get(
                "message",
                "A pipeline run is already in progress.",
            ),
        )

    return result
