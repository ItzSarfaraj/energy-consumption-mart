
CREATE OR REPLACE TABLE hourly_quality_mart AS

SELECT
    e.meter_id,
    e.site_id,
    DATE_TRUNC('hour', e.interval_start) AS hour_start,

    COUNT(*) AS expected_intervals,

    COUNT(f.consumption_kwh) AS valid_intervals,

    ROUND(
        100.0 * COUNT(f.consumption_kwh) / COUNT(*),
        2
    ) AS completeness_pct,

    COALESCE(SUM(f.consumption_kwh), 0)
        AS total_valid_consumption_kwh

FROM expected_intervals e

LEFT JOIN fct_interval_consumption f
    ON e.meter_id = f.meter_id
    AND e.site_id = f.site_id
    AND e.interval_start = f.interval_start

GROUP BY
    e.meter_id,
    e.site_id,
    DATE_TRUNC('hour', e.interval_start);
