# Design Note — Energy Consumption Mart

## 1. Objective

Energy Consumption Mart transforms synthetic cumulative smart-meter readings into reusable interval, hourly, and daily consumption models. It identifies data-quality issues, measures completeness, and presents analytical results through a dashboard with AI-assisted insights.

The primary design goal is to create a reproducible, testable analytics pipeline using lightweight technologies without requiring complex infrastructure.

## 2. Architecture and Data Flow

The solution uses Python and Pandas for data ingestion, DuckDB for analytical storage, SQL for transformations, FastAPI for backend services, and React with Recharts for visualization.

**Data flow:**

Synthetic CSV files → Python ingestion → DuckDB raw tables → SQL staging → interval consumption fact → hourly and daily marts → FastAPI → React dashboard.

A separate expected-interval model supports completeness assessment by feeding into the hourly quality mart. The insights service uses analytical metrics to generate AI-assisted narratives through a local Ollama model, with fallback behavior when AI generation fails.

The pipeline is divided into independent stages so that transformations, quality checks, API behavior, and application functionality can be tested separately.

## 3. Key Design Decisions and Trade-offs

| Decision | Reason | Trade-off or alternative |
|---|---|---|
| DuckDB for analytical storage | Lightweight, local, and well suited to SQL-based analytical workloads | A managed warehouse or PostgreSQL could be considered for production requirements involving concurrency, availability, and centralized operations |
| SQL-based transformations | Makes analytical logic explicit, reusable, and independently verifiable | A transformation framework such as dbt could improve dependency management and documentation as the project grows |
| Synthetic data | Enables reproducible tests and controlled anomaly scenarios without exposing real customer data | Public or authorized production meter data would be needed to evaluate real-world behavior |
| Separate expected-interval model | Measures missing data instead of relying only on observed readings | More advanced quality frameworks could provide configurable rules and historical monitoring |
| FastAPI backend | Separates data processing from frontend presentation and provides documented REST endpoints | Authentication, monitoring, and deployment hardening are needed for production |
| React and Recharts | Provides interactive consumption and data-quality visualizations | Larger datasets may require pagination, aggregation, or additional performance optimization |
| Local Ollama model with fallback | Demonstrates AI-assisted analysis without requiring a hosted model API for the configured workflow | Local inference has hardware and latency constraints; deterministic summaries or a hosted model are alternatives |

## 4. Data Model and Quality Strategy

The SQL pipeline separates raw readings, staging data, interval consumption, hourly and daily marts, expected intervals, and hourly quality metrics.

Interval consumption is calculated from consecutive cumulative readings. Invalid intervals are classified so that missing values, negative differences, and potential meter resets are not blindly treated as valid consumption.

The expected-interval model supports completeness checks, while the verification script checks row counts and duplicate keys. This approach makes data-quality problems visible before the metrics are consumed by the dashboard.

## 5. Assumptions and Limitations

The documented synthetic dataset uses 10 meters across 5 sites, 15-minute reading intervals, and a 30-day period. The documented reporting window is fixed to January 1–30, 2026.

Synthetic readings do not establish real-world electricity-consumption patterns. The local DuckDB setup is intended for a reproducible assessment project rather than a high-availability production platform. AI-generated narratives may be inaccurate, so analytical metrics remain the source of truth.

Previously recorded validation results include 28,800 expected intervals, 7,200 hourly quality rows, zero duplicate keys in both checked models, and 99.98% average completeness. The latest recorded backend test suite passed 12 tests. These results should be revalidated after code or data changes.

## 6. Future Improvements

For production use, I would introduce configurable reporting dates, scheduled pipeline execution, stronger schema and quality validation, structured logging and alerting, authentication and authorization, and automated deployment. I would also evaluate AI narrative accuracy and latency, improve fallback monitoring, and consider a managed analytical warehouse if workload requirements outgrow the local database.