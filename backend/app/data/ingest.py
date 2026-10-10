##  Implementing a repeatable ingestion process using Pandas and DuckDB. 
# It loads separate clean and anomalous CSV datasets into typed raw tables, preserves problematic records for data-quality analysis, 
# and uses SQL files to keep the database schema separate from the ingestion logic.”

from pathlib import Path

import duckdb
import pandas as pd


# Locate the project directories independently of the terminal's location
PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_DIR = PROJECT_ROOT / "backend"
DATA_DIR = PROJECT_ROOT / "data"

DATABASE_PATH = BACKEND_DIR / "energy_mart.duckdb"
SCHEMA_PATH = BACKEND_DIR / "sql" / "01_create_tables.sql"

CLEAN_CSV = DATA_DIR / "sample_readings.csv"
ANOMALOUS_CSV = DATA_DIR / "sample_readings_with_anomalies.csv"


def main():
    # Fail clearly if a required input file is missing
    for path in [SCHEMA_PATH, CLEAN_CSV, ANOMALOUS_CSV]:
        if not path.exists():
            raise FileNotFoundError(f"Required file not found: {path}")

    # Open or create the local DuckDB database
    connection = duckdb.connect(str(DATABASE_PATH))

    try:
        # Create the raw tables from our SQL schema
        schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
        connection.execute(schema_sql)

        # Load and register the clean CSV
        clean_df = pd.read_csv(CLEAN_CSV)
        connection.register("clean_df", clean_df)

        # Replace existing table contents on every ingestion run
        connection.execute("DELETE FROM raw_clean_readings")
        connection.execute("""
            INSERT INTO raw_clean_readings
            SELECT
                meter_id,
                site_id,
                CAST(reading_timestamp AS TIMESTAMP),
                CAST(cumulative_kwh AS DOUBLE)
            FROM clean_df
        """)

        connection.unregister("clean_df")

        # Load and register the anomalous CSV
        anomalous_df = pd.read_csv(ANOMALOUS_CSV)
        connection.register("anomalous_df", anomalous_df)

        connection.execute("DELETE FROM raw_anomalous_readings")
        connection.execute("""
            INSERT INTO raw_anomalous_readings
            SELECT
                meter_id,
                site_id,
                CAST(reading_timestamp AS TIMESTAMP),
                CAST(cumulative_kwh AS DOUBLE)
            FROM anomalous_df
        """)

        connection.unregister("anomalous_df")

        # Report ingestion results
        for table_name in [
            "raw_clean_readings",
            "raw_anomalous_readings",
        ]:
            count = connection.execute(
                f"SELECT COUNT(*) FROM {table_name}"
            ).fetchone()[0]

            print(f"{table_name}: {count:,} rows loaded")

        print(f"Database created at: {DATABASE_PATH}")

    finally:
        connection.close()


if __name__ == "__main__":
    main()
