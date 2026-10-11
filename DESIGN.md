# Design Note — Energy Consumption Mart

## 1. Objective

Energy Consumption Mart transforms synthetic cumulative smart-meter readings into reusable interval, hourly, and daily consumption models. It identifies peak-consumption periods, measures data completeness, and generates narrative insights grounded in warehouse metrics.

## 2. Architecture

The solution uses a React and Vite frontend, a FastAPI backend, and DuckDB as the analytical database. Pandas and NumPy generate and prepare synthetic data, while SQL performs the warehouse transformations. The frontend calls REST endpoints exposed by FastAPI.

**Data flow:** Synthetic CSV files → ingestion → raw reading tables → staging and quality flags → interval consumption fact → hourly and daily marts. An independent expected-interval grid joins the interval fact to produce hourly quality metrics. DuckDB metrics feed the insights service, which returns an AI-generated or deterministic fallback narrative.

## 3. Data Model

- **Raw tables:** Store clean baseline readings and readings containing intentional anomalies.
- **Staging table:** Adds flags for duplicate readings, null or negative values, timestamp gaps, and possible meter resets.
- **Interval fact:** Calculates consumption as the difference between consecutive cumulative readings. Invalid intervals are classified and their consumption is set to null.
- **Hourly mart:** Aggregates interval consumption and tracks valid intervals and completeness.
- **Daily mart:** Summarizes daily consumption and identifies the highest-consumption hour for each meter and day.
- **Expected intervals and hourly quality mart:** Generate the expected 15-minute timeline and compare it with valid fact records to measure completeness.

## 4. Data Quality and Assumptions

The reproducible synthetic dataset contains 10 meters across 5 sites, with 15-minute readings over 30 days. It deliberately introduces a duplicate, a missing reading, a null value, a negative reading, and a simulated meter reset.

The design preserves raw inputs and applies quality rules during transformation. Consumption is calculated only when the interval is classified as valid. The expected timeline assumes a fixed January 1–30, 2026 reporting window and four expected intervals per hour.

## 5. Technology Choices and Trade-offs

- **DuckDB:** Provides lightweight analytical SQL without requiring a separately managed database server.
- **FastAPI:** Exposes analytics and pipeline operations through HTTP endpoints.
- **React, Vite, and Recharts:** Support an interactive dashboard for consumption and quality analysis.
- **Synthetic data:** Makes the project reproducible and safe to share, but does not establish real-world energy-consumption patterns.
- **AI with deterministic fallback:** Adds readable explanations while allowing the application to return insights when model generation is unavailable.

## 6. Validation and Limitations

The current warehouse validation passed all four checks: 28,800 expected intervals, 7,200 hourly quality rows, and zero duplicate keys in both expected intervals and hourly quality records. The backend test suite passed all 10 tests.

The reporting window is currently hardcoded, and the synthetic dataset is not a substitute for production meter data. Future improvements include dynamic reporting dates, additional quality tests, scheduled execution, and expanded deployment documentation.
