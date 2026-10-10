
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Clock3,
  Filter,
  Zap,
} from "lucide-react";

import { getDaily, getHourly } from "../services/api";

function formatNumber(value, digits = 2) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const value = payload[0].value;

  return (
    <div className="rounded-lg border border-white/10 bg-[#101c2d]/95 px-3 py-2.5 shadow-xl backdrop-blur-xl">
      <p className="mb-1.5 text-xs text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-white">
        {value == null ? "Hidden extreme value" : `${formatNumber(value)} kWh`}
      </p>
    </div>
  );
}

function SelectFilter({ label, icon: Icon, value, onChange, options }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <Icon size={13} />
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="em-input text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ConsumptionChart() {
  const [period, setPeriod] = useState("daily");
  const [meterId, setMeterId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [hideOutliers, setHideOutliers] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadChart() {
      setLoading(true);
      setError("");

      try {
        const params = {};
        if (meterId) params.meter_id = meterId;
        if (siteId) params.site_id = siteId;

        const result =
          period === "daily"
            ? await getDaily(params)
            : await getHourly(params);

        if (!cancelled) {
          const formatted = result.map((row) => {
            const timestamp =
              period === "daily"
                ? row.consumption_date
                : row.hour_start;

            return {
              ...row,
              chartTime: timestamp,
              chartLabel:
                period === "daily"
                  ? timestamp
                  : new Date(timestamp).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                    }),
              consumption:
                period === "daily"
                  ? Number(row.daily_consumption_kwh ?? 0)
                  : Number(row.consumption_kwh ?? 0),
            };
          });

          setData(formatted);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
              err.message ||
              "Unable to load consumption data."
          );
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadChart();

    return () => {
      cancelled = true;
    };
  }, [period, meterId, siteId]);

  // Keep the hourly default readable when no meter is selected.
  const chartData =
    period === "hourly" && !meterId
      ? data.filter((row) => row.meter_id === "M001")
      : data;

  // Use the 75th percentile as a simple display threshold.
  // This changes plotted values only, never the underlying data.
  const visibleChartData = (() => {
    const values = chartData
      .map((row) => row.consumption)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    const upperIndex = Math.floor(values.length * 0.75);
    const upperQuartile = values[upperIndex];

    const upperLimit =
      values.length >= 5 ? upperQuartile * 2.5 : Infinity;

    return chartData.map((row) => ({
      ...row,
      chartValue:
        hideOutliers && row.consumption > upperLimit
          ? null
          : row.consumption,
    }));
  })();

  const displayedValues = visibleChartData
    .map((row) => row.chartValue)
    .filter((value) => value !== null && Number.isFinite(value));

  const totalConsumption = displayedValues.reduce(
    (sum, value) => sum + value,
    0
  );

  const peakConsumption =
    displayedValues.length > 0 ? Math.max(...displayedValues) : 0;

  const averageConsumption =
    displayedValues.length > 0
      ? totalConsumption / displayedValues.length
      : 0;

  const hiddenCount = visibleChartData.filter(
    (row) => row.chartValue === null
  ).length;

  const meterOptions = [
    { value: "", label: "All meters" },
    ...Array.from({ length: 10 }, (_, index) => {
      const id = `M${String(index + 1).padStart(3, "0")}`;
      return { value: id, label: id };
    }),
  ];

  const siteOptions = [
    { value: "", label: "All sites" },
    ...Array.from({ length: 5 }, (_, index) => {
      const id = `SITE${String(index + 1).padStart(2, "0")}`;
      return { value: id, label: id };
    }),
  ];

  return (
    <section className="em-card relative mt-5 overflow-hidden p-4 sm:p-5">
      {/* Heading and period switch */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.08] text-cyan-300">
            <Activity size={19} />
          </span>

          <div>
            <h3 className="font-semibold text-white">
              Consumption trends
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {period === "daily" ? "Daily" : "Hourly"} energy consumption
            </p>
          </div>
        </div>

        <div
          className="inline-flex self-start rounded-lg border border-white/[0.08] bg-[#080f1b] p-1"
          aria-label="Consumption period"
        >
          <button
            type="button"
            onClick={() => setPeriod("daily")}
            aria-pressed={period === "daily"}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition ${
              period === "daily"
                ? "bg-emerald-400/15 text-emerald-300"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CalendarDays size={14} />
            Daily
          </button>

          <button
            type="button"
            onClick={() => setPeriod("hourly")}
            aria-pressed={period === "hourly"}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition ${
              period === "hourly"
                ? "bg-emerald-400/15 text-emerald-300"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock3 size={14} />
            Hourly
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <Filter size={13} className="text-emerald-300" />
          Filters
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectFilter
            label="Meter"
            icon={Zap}
            value={meterId}
            onChange={setMeterId}
            options={meterOptions}
          />

          <SelectFilter
            label="Site"
            icon={BarChart3}
            value={siteId}
            onChange={setSiteId}
            options={siteOptions}
          />
        </div>
      </div>

      {/* Compact summary */}
      {!loading && !error && chartData.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            {
              label: "Total shown",
              value: formatNumber(totalConsumption),
            },
            {
              label: "Peak shown",
              value: formatNumber(peakConsumption),
            },
            {
              label: "Average shown",
              value: formatNumber(averageConsumption),
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            >
              <p className="truncate text-[11px] text-slate-500">
                {metric.label}
              </p>
              <p className="mt-1 break-words text-sm font-semibold text-white">
                {metric.value}
                <span className="ml-1 text-[10px] font-normal text-slate-500">
                  kWh
                </span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Outlier display control */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {hideOutliers && hiddenCount > 0
            ? `${hiddenCount} extreme value(s) hidden from chart`
            : `${chartData.length.toLocaleString("en-IN")} periods`}
        </p>

        <button
          type="button"
          onClick={() => setHideOutliers((value) => !value)}
          aria-pressed={hideOutliers}
          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
            hideOutliers
              ? "border-amber-400/25 bg-amber-400/[0.08] text-amber-300"
              : "border-white/10 text-slate-400 hover:border-emerald-400/30 hover:text-emerald-300"
          }`}
        >
          {hideOutliers ? "Show all values" : "Hide extreme spikes"}
        </button>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="mt-3 grid h-64 place-items-center rounded-xl bg-white/[0.015] text-sm text-slate-400">
          Loading consumption...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4 text-sm text-rose-300"
        >
          {error}
        </div>
      ) : chartData.length === 0 ? (
        <div className="mt-3 grid h-64 place-items-center rounded-xl border border-dashed border-white/10 text-sm text-slate-500">
          No consumption data found for these filters.
        </div>
      ) : (
        <div className="mt-2 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={visibleChartData}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <CartesianGrid
                stroke="rgba(148,163,184,0.10)"
                strokeDasharray="3 5"
                vertical={false}
              />

              <XAxis
                dataKey="chartLabel"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                minTickGap={35}
                tickMargin={8}
              />

              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={53}
                tickMargin={6}
                tickFormatter={(value) =>
                  Number(value).toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })
                }
              />

              <Tooltip
                content={<ChartTooltip />}
                cursor={{
                  stroke: "rgba(52,211,153,0.25)",
                  strokeDasharray: "4 4",
                }}
              />

              <Line
                type="monotone"
                dataKey="chartValue"
                name="Consumption"
                stroke="#34d399"
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#22d3ee",
                  stroke: "#101c2d",
                  strokeWidth: 2,
                }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-2 border-t border-white/[0.06] pt-3 text-xs leading-5 text-slate-500">
        {period === "daily"
          ? "Daily totals from the analytical data."
          : meterId
            ? `Hourly readings for ${meterId}.`
            : "Hourly view defaults to M001 for readability."}
        {hideOutliers &&
          hiddenCount > 0 &&
          " Extreme values are hidden visually, not removed from the dataset."}
      </div>
    </section>
  );
}
