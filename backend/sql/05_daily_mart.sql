
CREATE OR REPLACE TABLE daily_consumption_mart AS

WITH daily_totals AS (
    SELECT
        meter_id,
        site_id,
        CAST(hour_start AS DATE) AS consumption_date,

        SUM(total_consumption_kwh) AS daily_consumption_kwh,

        SUM(valid_intervals) AS valid_intervals,

        COUNT(*) * 4 AS expected_intervals,

        ROUND(
            100.0 * SUM(valid_intervals) / (COUNT(*) * 4),
            2
        ) AS completeness_pct

    FROM hourly_consumption_mart

    GROUP BY
        meter_id,
        site_id,
        CAST(hour_start AS DATE)
),

daily_peaks AS (
    SELECT
        meter_id,
        site_id,
        CAST(hour_start AS DATE) AS consumption_date,
        hour_start AS peak_hour,
        total_consumption_kwh AS peak_hour_consumption_kwh,

        ROW_NUMBER() OVER (
            PARTITION BY meter_id, CAST(hour_start AS DATE)
            ORDER BY total_consumption_kwh DESC, hour_start
        ) AS peak_rank

    FROM hourly_consumption_mart
)

SELECT
    d.meter_id,
    d.site_id,
    d.consumption_date,
    d.daily_consumption_kwh,
    d.valid_intervals,
    d.expected_intervals,
    d.completeness_pct,
    p.peak_hour,
    p.peak_hour_consumption_kwh

FROM daily_totals d

LEFT JOIN daily_peaks p
    ON d.meter_id = p.meter_id
    AND d.site_id = p.site_id
    AND d.consumption_date = p.consumption_date
    AND p.peak_rank = 1;
