
from pathlib import Path

import duckdb


# Locate the project root from this Python file.
PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Open the existing DuckDB database.
DB_PATH = PROJECT_ROOT / "backend" / "energy_mart.duckdb"
con = duckdb.connect(str(DB_PATH), read_only=True)

checks = [
    (
        "Expected intervals",
        """
        SELECT COUNT(*)
        FROM expected_intervals
        """,
        28800,
    ),
    (
        "Hourly quality rows",
        """
        SELECT COUNT(*)
        FROM hourly_quality_mart
        """,
        7200,
    ),
    (
        "Duplicate expected interval keys",
        """
        SELECT COUNT(*)
        FROM (
            SELECT meter_id, interval_start
            FROM expected_intervals
            GROUP BY meter_id, interval_start
            HAVING COUNT(*) > 1
        ) duplicates
        """,
        0,
    ),
    (
        "Duplicate hourly keys",
        """
        SELECT COUNT(*)
        FROM (
            SELECT meter_id, hour_start
            FROM hourly_quality_mart
            GROUP BY meter_id, hour_start
            HAVING COUNT(*) > 1
        ) duplicates
        """,
        0,
    ),
]

try:
    print(f"Database: {DB_PATH}\n")

    for name, query, expected in checks:
        actual = con.execute(query).fetchone()[0]
        status = "PASS" if actual == expected else "CHECK"
        print(
            f"[{status}] {name}: "
            f"actual={actual}, expected={expected}"
        )

    print("\nHourly completeness summary:")

    summary = con.execute("""
        SELECT
            MIN(completeness_pct),
            MAX(completeness_pct),
            AVG(completeness_pct),
            COUNT(*) FILTER (
                WHERE completeness_pct < 100
            )
        FROM hourly_quality_mart
    """).fetchone()

    print(f"Minimum completeness: {summary[0]}%")
    print(f"Maximum completeness: {summary[1]}%")
    print(f"Average completeness: {summary[2]:.2f}%")
    print(f"Incomplete hours: {summary[3]}")

    print("\nInterval status counts:")

    statuses = con.execute("""
        SELECT
            interval_status,
            COUNT(*) AS row_count
        FROM fct_interval_consumption
        GROUP BY interval_status
        ORDER BY interval_status
    """).fetchall()

    for status, count in statuses:
        print(f"{status}: {count}")

finally:
    con.close()