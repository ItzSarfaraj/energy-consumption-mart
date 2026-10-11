# Energy Consumption Mart

A full-stack analytics engineering project that transforms synthetic smart-meter readings into reusable hourly and daily consumption marts, measures data quality, identifies peak consumption periods, and generates metric-grounded energy insights.

> **Data notice:** This project uses synthetic smart-meter data for demonstration and testing. It does not represent actual household or commercial electricity consumption.

## Features

- Reproducible synthetic smart-meter data generation.
- Data ingestion and SQL transformations using DuckDB.
- Interval-level, hourly, and daily consumption models.
- Data-quality monitoring for duplicates, missing intervals, null and negative readings, and possible meter resets.
- Hourly completeness metrics and peak-consumption analysis.
- React dashboard with consumption charts and data-quality views.
- FastAPI endpoints for analytics, pipeline execution, and AI insights.
- Deterministic insight generation when an AI model is unavailable.
- Automated backend tests and warehouse validation checks.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS v4, Recharts, Axios |
| Backend | Python, FastAPI, Uvicorn |
| Analytics | DuckDB, SQL, Pandas, NumPy |
| Testing | Pytest, HTTPX |
| Optional AI | Ollama local models or a configured external model provider |

## Architecture

```text
Synthetic Smart-Meter Readings
              |
              v
        Data Ingestion
              |
              v
       Raw Reading Tables
              |
              v
      Staging / Data Quality
              |
              v
  Interval Consumption Fact
              |
        +-----+-------------------+
        |                         |
        v                         v
 Hourly Consumption        Expected Intervals
        |                         |
        v                         |
 Daily Consumption                |
                                  |
 Interval Consumption Fact -------+
              |
              v
      Hourly Quality Mart

Hourly / Daily / Quality Marts
              |
              v
            FastAPI
              |
              v
       React Dashboard

DuckDB Metrics --> Insights Service --> AI or Fallback Narrative
```

The hourly and daily consumption marts summarize observed interval data. The independent expected-interval grid supports hourly completeness analysis, including periods where readings are missing or invalid.

## Project Structure

```text
energy-consumption-mart/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   ├── data/
│   │   ├── services/
│   │   └── main.py
│   ├── sql/
│   │   ├── 01_create_tables.sql
│   │   ├── 02_staging.sql
│   │   ├── 03_interval_consumption.sql
│   │   ├── 04_hourly_mart.sql
│   │   ├── 05_daily_mart.sql
│   │   ├── 06_expected_intervals.sql
│   │   └── 07_hourly_quality_mart.sql
│   ├── tests/
│   ├── requirements.txt
│   ├── verify_marts.py
│   └── energy_mart.duckdb
├── data/
│   ├── generate_data.py
│   ├── sample_readings.csv
│   └── sample_readings_with_anomalies.csv
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── .gitignore
└── README.md
```

The DuckDB database is generated locally and excluded from version control. The database tables are created or refreshed when the analytics pipeline runs.

## Prerequisites

- Python 3.11 or newer recommended.
- Node.js and npm compatible with the installed Vite version.
- Git.
- Ollama only if local AI inference is desired.

## Getting Started

Run the backend and frontend in separate terminals.

### 1. Clone the repository

```bash
git clone <repository-url>
cd energy-consumption-mart
```

Replace `<repository-url>` with the actual repository URL.

### 2. Configure environment variables

The repository includes a root `.env.example` file containing configuration placeholders. Copy it to `.env` if you need the optional provider configuration:

```powershell
Copy-Item .env.example .env
```

Edit `.env` only with settings for the provider you intend to use. Do not commit credentials, access tokens, or private API keys.

The analytics pipeline and deterministic fallback should remain usable without external AI credentials.

### 3. Set up the backend

From the repository root, open a PowerShell terminal:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks virtual-environment activation, follow the appropriate execution-policy guidance for your machine or invoke `.venv\Scripts\python.exe` directly.

### 4. Generate synthetic data

Run this command from the **repository root**, not the `backend` directory:

```powershell
python .\data\generate_data.py
```

The generator uses a fixed random seed and creates:

- `data/sample_readings.csv` — clean baseline readings.
- `data/sample_readings_with_anomalies.csv` — readings with intentionally introduced data-quality issues.

The sample configuration contains 10 meters, 5 sites, 30 days, and 15-minute readings. Regenerating the files overwrites the existing CSV outputs.

### 5. Start the backend

From the `backend` directory, with the virtual environment active:

```powershell
uvicorn app.main:app --reload
```

The API should be available at:

- API root: http://127.0.0.1:8000/
- Health check: http://127.0.0.1:8000/health
- Interactive API documentation: http://127.0.0.1:8000/docs

The pipeline may need to run before analytics endpoints can return complete results.

### 6. Configure and start the frontend

Open a second PowerShell terminal. From the repository root, create `frontend/.env` with the local backend URL:

```powershell
"VITE_API_BASE_URL=http://127.0.0.1:8000" |
  Set-Content .\frontend\.env
```

Then start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

The frontend uses `VITE_API_BASE_URL` as the Axios base URL for backend requests. Vite environment variables prefixed with `VITE_` are exposed to frontend code, so never put secrets in them.

## Data Pipeline and Warehouse Models

The SQL transformations are organized into the following files:

| Script | Purpose |
|---|---|
| `01_create_tables.sql` | Creates clean and anomalous raw-reading tables. |
| `02_staging.sql` | Adds flags for duplicate readings, null and negative values, time gaps, and possible meter resets. |
| `03_interval_consumption.sql` | Deduplicates readings, compares consecutive cumulative readings, calculates consumption deltas, and classifies interval status. |
| `04_hourly_mart.sql` | Aggregates interval consumption by meter and hour and calculates valid-interval counts and completeness. |
| `05_daily_mart.sql` | Aggregates daily consumption, completeness, and the peak-consumption hour. |
| `06_expected_intervals.sql` | Generates the expected 15-minute interval grid for completeness analysis. |
| `07_hourly_quality_mart.sql` | Compares expected intervals with valid fact records to produce hourly quality metrics. |

### Key warehouse tables

- `raw_clean_readings` — clean baseline cumulative readings.
- `raw_anomalous_readings` — readings with intentional data-quality anomalies.
- `stg_anomalous_readings` — anomaly flags and previous-reading context.
- `fct_interval_consumption` — interval consumption and interval status.
- `hourly_consumption_mart` — hourly consumption summaries.
- `daily_consumption_mart` — daily totals and peak-hour information.
- `expected_intervals` — the complete expected timestamp grid for each meter.
- `hourly_quality_mart` — hourly completeness and valid-consumption metrics.

The expected-interval grid is generated from `raw_clean_readings`, while the interval fact table is calculated from `raw_anomalous_readings`. The quality mart joins these datasets to assess completeness.

The pipeline service coordinates ingestion and SQL transformations. Use the pipeline endpoint or the application's pipeline procedure rather than executing individual SQL scripts out of order.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API root information. |
| GET | `/health` | Service and database health check. |
| GET | `/api/overview` | Summary analytics. |
| GET | `/api/hourly` | Hourly consumption data. |
| GET | `/api/daily` | Daily consumption data. |
| GET | `/api/quality` | Data-quality metrics. |
| GET | `/api/pipeline/status` | Pipeline status. |
| POST | `/api/pipeline/run` | Trigger the analytics pipeline. |
| GET | `/api/ai/insights` | Return metrics and an AI or fallback narrative. |

For exact query parameters and response schemas, use the interactive API documentation at `/docs`.

## Data Quality and Validation

The synthetic dataset introduces five anomaly types:

1. Duplicate reading.
2. Missing reading.
3. Null cumulative reading.
4. Negative cumulative reading.
5. Simulated meter-counter reset.

The validation script checks expected interval counts, hourly quality row counts, and duplicate keys.

From the `backend` directory, run:

```powershell
python verify_marts.py
```

### Verified warehouse results

The validation run for the current local database reported:

| Check | Actual | Expected | Result |
|---|---:|---:|---|
| Expected intervals | 28,800 | 28,800 | PASS |
| Hourly quality rows | 7,200 | 7,200 | PASS |
| Duplicate expected-interval keys | 0 | 0 | PASS |
| Duplicate hourly keys | 0 | 0 | PASS |

The same run reported:

- Minimum hourly completeness: 75.0%.
- Maximum hourly completeness: 100.0%.
- Average hourly completeness: 99.98%.
- Incomplete hours: 6.

These figures describe the local database at the time of validation. Rerun the script after regenerating data or changing pipeline logic.

## Testing

Run the backend tests from the `backend` directory:

```powershell
python -m pytest -v
```

The current verified test run completed with **10 passed in 3.48 seconds**.

The tests cover:

- Health and analytics API endpoints.
- Meter filtering and daily results.
- Data-quality endpoint behavior.
- AI insights endpoint response.
- Pipeline execution and failure handling.
- Prevention of concurrent pipeline runs.

Rerun the tests after making code changes and update this section if the results change.

## AI Insights

The insights service collects metrics from DuckDB and produces a narrative based on those metrics.

Supported operating modes depend on the configured provider:

- **AI mode:** a configured model generates the narrative.
- **Fallback mode:** deterministic application logic generates the narrative when model generation fails or is unavailable.

### Optional local inference with Ollama

Install Ollama from https://ollama.com/download/windows.

Download and run a model compatible with your hardware:

```powershell
ollama run qwen2.5:3b
```

Ollama runs locally and does not require paid model API credits. The backend must be configured to call the local Ollama service before this model can power the insights endpoint.

The deterministic fallback should remain available if Ollama is stopped or returns an error.

## Reproducibility and Security

- The data generator uses a fixed random seed for reproducible synthetic data.
- Keep `.env` files and credentials out of Git.
- Do not commit local virtual environments, `node_modules`, build output, or DuckDB database files.
- Use synthetic or appropriately anonymized data only.
- Treat AI-generated narratives as explanations of supplied metrics, not replacements for the underlying SQL calculations.
- Keep the frontend API URL configurable for local and deployed environments.

## Future Improvements

Potential extensions include:

- Dynamic date ranges for expected-interval generation.
- Additional automated data-quality checks.
- Scheduled pipeline runs.
- Model evaluation and insight caching.
- Deployment documentation and CI/CD integration.

## License

Add the license applicable to this repository before distributing it publicly.
