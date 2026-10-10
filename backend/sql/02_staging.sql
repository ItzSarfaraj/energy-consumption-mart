
-- Stage anomalous readings and calculate data-quality flags.
-- Raw data remains unchanged.

CREATE OR REPLACE TABLE stg_anomalous_readings AS
WITH duplicate_check AS (
    SELECT
        *,
        COUNT(*) OVER (
            PARTITION BY meter_id, reading_timestamp
        ) AS duplicate_count
    FROM raw_anomalous_readings
),
ordered_readings AS (
    SELECT
        *,
        LAG(reading_timestamp) OVER (
            PARTITION BY meter_id
            ORDER BY reading_timestamp, cumulative_kwh NULLS LAST
        ) AS previous_timestamp,

        LAG(cumulative_kwh) OVER (
            PARTITION BY meter_id
            ORDER BY reading_timestamp, cumulative_kwh NULLS LAST
        ) AS previous_cumulative_kwh
    FROM duplicate_check
)
SELECT
    meter_id,
    site_id,
    reading_timestamp,
    cumulative_kwh,
    previous_timestamp,
    previous_cumulative_kwh,

    -- Duplicate readings
    duplicate_count > 1 AS is_duplicate,

    -- Missing or invalid cumulative values
    cumulative_kwh IS NULL AS is_null_reading,
    cumulative_kwh < 0 AS is_negative_reading,

    -- Time gaps greater than the expected 15 minutes
    CASE
        WHEN previous_timestamp IS NULL THEN FALSE
        ELSE reading_timestamp - previous_timestamp
             > INTERVAL '15 minutes'
    END AS has_time_gap,

    -- A cumulative counter decrease may indicate a reset
    CASE
        WHEN previous_cumulative_kwh IS NULL
          OR cumulative_kwh IS NULL
        THEN FALSE
        ELSE cumulative_kwh < previous_cumulative_kwh
    END AS possible_meter_reset

FROM ordered_readings;
