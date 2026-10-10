
CREATE OR REPLACE TABLE fct_interval_consumption AS

WITH deduplicated AS (
    SELECT
        meter_id,
        site_id,
        reading_timestamp,
        cumulative_kwh
    FROM raw_anomalous_readings
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY meter_id, reading_timestamp
        ORDER BY cumulative_kwh NULLS LAST
    ) = 1
),

ordered AS (
    SELECT
        *,
        LAG(reading_timestamp) OVER (
            PARTITION BY meter_id
            ORDER BY reading_timestamp
        ) AS previous_timestamp,

        LAG(cumulative_kwh) OVER (
            PARTITION BY meter_id
            ORDER BY reading_timestamp
        ) AS previous_cumulative_kwh

    FROM deduplicated
),

calculated AS (
    SELECT
        *,
        cumulative_kwh - previous_cumulative_kwh
            AS consumption_delta_kwh,

        CASE
            WHEN cumulative_kwh IS NULL
              OR previous_cumulative_kwh IS NULL
                THEN 'missing_reading'

            WHEN cumulative_kwh < 0
                THEN 'negative_reading'

            WHEN cumulative_kwh < previous_cumulative_kwh
                THEN 'possible_meter_reset'

            WHEN reading_timestamp - previous_timestamp
                 <> INTERVAL '15 minutes'
                THEN 'invalid_interval'

            ELSE 'valid'
        END AS interval_status

    FROM ordered
)

SELECT
    meter_id,
    site_id,

    -- Assign consumption to the interval's starting timestamp
    previous_timestamp AS interval_start,
    reading_timestamp AS interval_end,

    cumulative_kwh,
    previous_cumulative_kwh,

    CASE
        WHEN interval_status = 'valid'
        THEN consumption_delta_kwh
        ELSE NULL
    END AS consumption_kwh,

    interval_status

FROM calculated
WHERE previous_timestamp IS NOT NULL;
