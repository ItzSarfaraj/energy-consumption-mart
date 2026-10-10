
CREATE OR REPLACE TABLE hourly_consumption_mart AS

SELECT
    meter_id,
    site_id,
    DATE_TRUNC('hour', interval_start) AS hour_start,

    SUM(consumption_kwh) AS total_consumption_kwh,

    COUNT(*) AS expected_or_observed_intervals,

    COUNT(consumption_kwh) AS valid_intervals,

    COUNT(*) FILTER (
        WHERE interval_status = 'valid'
    ) AS valid_status_intervals,

    ROUND(
        100.0 * COUNT(consumption_kwh) / 4,
        2
    ) AS completeness_pct

FROM fct_interval_consumption

GROUP BY
    meter_id,
    site_id,
    DATE_TRUNC('hour', interval_start);
