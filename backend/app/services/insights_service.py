
"""
Energy Consumption Mart: AI insights service.

DuckDB supplies authoritative metrics. The AI explains the metrics;
it does not calculate or replace the source-of-truth values.
"""

from copy import deepcopy
from threading import Lock

from app.ai.chat_model_provider import get_chat_model
from app.data.database import query_database


_cached_report = None
_cache_lock = Lock()
_generation_lock = Lock()


def clear_insights_cache():
    """Invalidate the cached report after analytics data changes."""
    global _cached_report

    with _cache_lock:
        _cached_report = None


def collect_energy_metrics() -> dict:
    """Collect summary, peak-hour, and interval-quality metrics."""

    overview_rows = query_database("""
        SELECT
            ROUND(
                COALESCE(SUM(total_valid_consumption_kwh), 0), 2
            ) AS total_consumption_kwh,
            COALESCE(SUM(valid_intervals), 0) AS valid_intervals,
            COALESCE(SUM(expected_intervals), 0) AS expected_intervals,
            ROUND(
                100.0 * SUM(valid_intervals)
                / NULLIF(SUM(expected_intervals), 0),
                2
            ) AS completeness_pct,
            COUNT(DISTINCT meter_id) AS total_meters,
            COUNT(DISTINCT site_id) AS total_sites,
            COUNT(*) FILTER (
                WHERE completeness_pct < 100
            ) AS incomplete_hours
        FROM hourly_quality_mart
    """)

    peak_rows = query_database("""
        SELECT
            hour_start,
            ROUND(SUM(total_valid_consumption_kwh), 2)
                AS consumption_kwh
        FROM hourly_quality_mart
        GROUP BY hour_start
        ORDER BY consumption_kwh DESC, hour_start ASC
        LIMIT 5
    """)

    quality_rows = query_database("""
        SELECT
            interval_status,
            COUNT(*) AS interval_count
        FROM fct_interval_consumption
        GROUP BY interval_status
        ORDER BY interval_count DESC, interval_status ASC
    """)

    return {
        "overview": overview_rows[0] if overview_rows else {},
        "peak_hours": peak_rows,
        "interval_quality": quality_rows,
    }


def build_fallback_insights(metrics: dict) -> str:
    """Create a deterministic report without an AI provider."""

    overview = metrics.get("overview") or {}
    peak_hours = metrics.get("peak_hours") or []
    quality_rows = metrics.get("interval_quality") or []

    lines = [
        "# Executive Summary",
        (
            "This report analyzes a synthetic smart-meter dataset. "
            f"Total valid consumption is "
            f"{overview.get('total_consumption_kwh', 'unavailable')} kWh, "
            f"and measured completeness is "
            f"{overview.get('completeness_pct', 'unavailable')}%."
        ),
        "",
        "# Key Findings",
        (
            f"- **Meters monitored:** "
            f"{overview.get('total_meters', 'unavailable')}."
        ),
        (
            f"- **Sites monitored:** "
            f"{overview.get('total_sites', 'unavailable')}."
        ),
        (
            f"- **Valid intervals:** "
            f"{overview.get('valid_intervals', 'unavailable')}."
        ),
        (
            f"- **Expected intervals:** "
            f"{overview.get('expected_intervals', 'unavailable')}."
        ),
        (
            f"- **Incomplete hours:** "
            f"{overview.get('incomplete_hours', 'unavailable')}."
        ),
        "",
        "# Data-Quality Observations",
    ]

    if quality_rows:
        for item in quality_rows:
            lines.append(
                f"- **{item.get('interval_status', 'Unknown')}:** "
                f"{item.get('interval_count', 0)} interval(s)."
            )
    else:
        lines.append("- No interval-quality records were returned.")

    invalid_rows = [
        item for item in quality_rows
        if str(item.get("interval_status", "")).lower()
        not in {"valid", "accepted"}
        and (item.get("interval_count") or 0) > 0
    ]

    if invalid_rows:
        lines.append(
            "- **Review required:** non-valid interval statuses "
            "are present. Investigate them before drawing operational "
            "conclusions."
        )
    else:
        lines.append(
            "- No non-valid statuses were returned by this query. "
            "This alone does not establish that every reading is correct."
        )

    lines.extend(["", "# Highest-Consumption Hours"])

    if peak_hours:
        for item in peak_hours:
            lines.append(
                f"- **{item.get('hour_start', 'Unknown time')}:** "
                f"{item.get('consumption_kwh', 'unavailable')} kWh."
            )
    else:
        lines.append("- No peak-hour data is available.")

    lines.extend([
        "",
        "# Recommended Actions",
        "- Investigate incomplete hourly records.",
        "- Review every non-valid interval status against its source reading.",
        "- Validate possible meter resets and negative readings.",
        "- Examine high-consumption hours before attributing a cause.",
        "",
        "The dataset is synthetic. These findings describe the supplied "
        "analytics and do not establish real-world causes.",
    ])

    return "\n".join(lines)


def _generate_report(metrics: dict) -> dict:
    """Generate a grounded AI narrative or use the deterministic fallback."""

    prompt = f"""
You are a careful energy analytics analyst reviewing a SYNTHETIC
smart-meter dataset.

The supplied values come from SQL queries against DuckDB.
They are the authoritative source of numerical facts.

STRICT REQUIREMENTS:
- Use only supplied metrics for numerical claims.
- Do not invent facts, counts, percentages, causes, or trends.
- Explicitly state that the dataset is synthetic.
- Never equate high completeness with the absence of data-quality issues.
- Discuss every interval status and its count.
- Explicitly identify non-valid statuses and recommend investigation.
- Distinguish measured facts from possible explanations.
- Do not claim an anomaly's root cause without supporting evidence.
- Describe peak hours as observed consumption, not a forecast.
- Do not claim the peak hours represent typical daily patterns;
  the supplied list contains only the five highest grouped hours.
- If information is unavailable, say so.
- Do not recalculate authoritative totals when supplied metrics exist.

FORMAT THE REPORT IN MARKDOWN:

## 1. Executive Summary
Summarize consumption, completeness, and the key data-quality findings.
Avoid unsupported labels such as "excellent" or "no significant issues."

## 2. Key Findings
Use concise bullets for meters, sites, interval counts, incomplete hours,
and the highest observed consumption hours.

## 3. Data-Quality Observations
List each supplied interval status and its count.
Explain that non-valid statuses require interpretation and review.
Keep interval counts distinct from incomplete-hour counts.

## 4. Recommended Actions
Give practical actions based on the metrics.
Do not invent causes or claim an issue has been resolved.

SQL-DERIVED METRICS:
{metrics}
"""

    try:
        response = get_chat_model().invoke(prompt)
        narrative = str(response.content).strip()

        if not narrative:
            raise ValueError("AI provider returned an empty response.")

        return {
            "metrics": metrics,
            "insights": narrative,
            "generation_mode": "ai",
        }

    except Exception:
        return {
            "metrics": metrics,
            "insights": build_fallback_insights(metrics),
            "generation_mode": "fallback",
        }


def generate_energy_insights(force_refresh: bool = False) -> dict:
    """Return cached insights or generate a fresh report."""

    global _cached_report

    if not force_refresh:
        with _cache_lock:
            if _cached_report is not None:
                return deepcopy(_cached_report)

    with _generation_lock:
        # Another request may have filled the cache while we waited.
        if not force_refresh:
            with _cache_lock:
                if _cached_report is not None:
                    return deepcopy(_cached_report)

        metrics = collect_energy_metrics()
        report = _generate_report(metrics)

        with _cache_lock:
            _cached_report = deepcopy(report)

        return deepcopy(report)
