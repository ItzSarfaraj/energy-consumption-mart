
CREATE OR REPLACE TABLE expected_intervals AS

WITH time_grid AS (
    SELECT
        unnest(
            generate_series(
                TIMESTAMP '2026-01-01 00:00:00',
                TIMESTAMP '2026-01-30 23:45:00',
                INTERVAL '15 minutes'
            )
        ) AS interval_start
),

meters AS (
    SELECT DISTINCT meter_id, site_id
    FROM raw_clean_readings
)

SELECT
    m.meter_id,
    m.site_id,
    t.interval_start
FROM meters m
CROSS JOIN time_grid t;
