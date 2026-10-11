
from pathlib import Path

import duckdb
from fastapi import HTTPException

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DB_PATH = PROJECT_ROOT / "backend" / "energy_mart.duckdb"


def query_database(sql: str, params: list | None = None) -> list[dict]:
    """Execute a read-only SQL query and return rows as dictionaries."""

    if not DB_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="DuckDB database not found. Run the data pipeline first.",
        )

    try:
        with duckdb.connect(str(DB_PATH), read_only=True) as con:
            cursor = con.execute(sql, params or [])
            columns = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            return [dict(zip(columns, row)) for row in rows]

    except duckdb.Error as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Database query failed: {exc}",
        ) from exc
