
-- Clean baseline: known-good synthetic readings
CREATE TABLE IF NOT EXISTS raw_clean_readings (
    meter_id VARCHAR,
    site_id VARCHAR,
    reading_timestamp TIMESTAMP,
    cumulative_kwh DOUBLE
);

-- Test dataset: intentionally contains data-quality anomalies
CREATE TABLE IF NOT EXISTS raw_anomalous_readings (
    meter_id VARCHAR,
    site_id VARCHAR,
    reading_timestamp TIMESTAMP,
    cumulative_kwh DOUBLE
);
