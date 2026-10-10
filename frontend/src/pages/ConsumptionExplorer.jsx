
import { useEffect, useState } from "react";
import {
  Download,
  Filter,
  RefreshCw,
  Database,
  Zap,
  Activity,
  CalendarDays,
  BarChart3,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { getDaily, getHourly } from "../services/api";

function downloadCSV(rows, period) {
  if (!rows.length) return;

  const columns =
    period === "daily"
      ? [
          "meter_id",
          "site_id",
          "consumption_date",
          "daily_consumption_kwh",
          "valid_intervals",
          "expected_intervals",
          "completeness_pct",
        ]
      : [
          "meter_id",
          "site_id",
          "hour_start",
          "consumption_kwh",
          "valid_intervals",
          "expected_intervals",
          "completeness_pct",
        ];

  const escapeCSV = (value) => {
    const text = value == null ? "" : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  };

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => escapeCSV(row[column])).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `energy-consumption-${period}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function SummaryCard({ title, value, unit, icon: Icon, accent }) {
  const accents = {
    emerald: "border-emerald-400/15 bg-emerald-400/10 text-emerald-300",
    cyan: "border-cyan-400/15 bg-cyan-400/10 text-cyan-300",
    violet: "border-violet-400/15 bg-violet-400/10 text-violet-300",
  };

  return (
    <article className="em-card em-card-hover p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-400">{title}</p>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-white">
            {value}
            {unit && (
              <span className="ml-1.5 text-xs font-medium text-slate-400">
                {unit}
              </span>
            )}
          </p>
        </div>

        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl border ${accents[accent]}`}
        >
          <Icon size={19} />
        </span>
      </div>
    </article>
  );
}

export default function ConsumptionExplorer() {
  const [period, setPeriod] = useState("daily");
  const [meterId, setMeterId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    if (startDate && endDate && startDate > endDate) {
      setError("Start date must be on or before the end date.");
      setRows([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = {};

      if (meterId) params.meter_id = meterId;
      if (siteId) params.site_id = siteId;

      if (period === "hourly") {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const result = await getHourly(params);
        setRows(result);
      } else {
        const result = await getDaily(params);

        const filtered = result.filter((row) => {
          const date = row.consumption_date;
          return (
            (!startDate || date >= startDate) &&
            (!endDate || date <= endDate)
          );
        });

        setRows(filtered);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load consumption data."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [period, meterId, siteId, startDate, endDate]);

  const totalConsumption = rows.reduce((sum, row) => {
    const value =
      period === "daily"
        ? row.daily_consumption_kwh
        : row.consumption_kwh;

    return sum + (Number(value) || 0);
  }, 0);

  const averageCompleteness = rows.length
    ? rows.reduce(
        (sum, row) => sum + (Number(row.completeness_pct) || 0),
        0
      ) / rows.length
    : 0;

  const meterOptions = Array.from({ length: 10 }, (_, index) => {
    const id = `M${String(index + 1).padStart(3, "0")}`;
    return { value: id, label: id };
  });

  const siteOptions = Array.from({ length: 5 }, (_, index) => {
    const id = `SITE${String(index + 1).padStart(2, "0")}`;
    return { value: id, label: id };
  });

  function resetFilters() {
    setMeterId("");
    setSiteId("");
    setStartDate("");
    setEndDate("");
  }

  return (
    <div className="page-enter space-y-6">
      {/* Page heading */}
      <header className="relative overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.09] via-[#0d1828] to-cyan-500/[0.04] p-6 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              <Activity size={13} />
              Analytics Workspace
            </span>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
              Consumption <span className="em-gradient-text">Explorer</span>
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Filter, inspect, and export meter consumption records.
            </p>
          </div>

          <span className="inline-flex items-center gap-2 self-start rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-400 sm:self-auto">
            <Database size={15} className="text-cyan-300" />
            Analytics database
          </span>
        </div>
      </header>

      {/* Filters */}
      <section className="em-card p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.08] text-cyan-300">
            <Filter size={18} />
          </span>

          <div>
            <h2 className="font-semibold text-white">Explore records</h2>
            <p className="mt-1 text-xs text-slate-500">
              Select a period, meter, site, or date range.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-2 text-xs font-medium text-slate-400">
            Aggregation
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="em-input text-sm"
            >
              <option value="daily">Daily</option>
              <option value="hourly">Hourly</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-xs font-medium text-slate-400">
            Meter
            <select
              value={meterId}
              onChange={(event) => setMeterId(event.target.value)}
              className="em-input text-sm"
            >
              <option value="">All meters</option>
              {meterOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-xs font-medium text-slate-400">
            Site
            <select
              value={siteId}
              onChange={(event) => setSiteId(event.target.value)}
              className="em-input text-sm"
            >
              <option value="">All sites</option>
              {siteOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-2">
              <CalendarDays size={14} />
              Start date
            </span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
              className="em-input text-sm"
            />
          </label>

          <label className="flex flex-col gap-2 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-2">
              <CalendarDays size={14} />
              End date
            </span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              className="em-input text-sm"
            />
          </label>

          <div className="flex items-end gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="em-button min-h-10 flex-1"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              {loading ? "Loading..." : "Refresh"}
            </button>

            <button
              onClick={resetFilters}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4 text-sm text-rose-200"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-300" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Unable to load records</p>
            <p className="mt-1 break-words text-rose-200/70">{error}</p>
          </div>
        </div>
      )}

      {/* Summary metrics */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          title="Records returned"
          value={loading ? "…" : rows.length.toLocaleString("en-IN")}
          icon={Database}
          accent="cyan"
        />

        <SummaryCard
          title="Total consumption"
          value={
            loading
              ? "…"
              : totalConsumption.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })
          }
          unit="kWh"
          icon={Zap}
          accent="emerald"
        />

        <SummaryCard
          title="Average completeness"
          value={loading ? "…" : `${averageCompleteness.toFixed(2)}%`}
          icon={Activity}
          accent="violet"
        />
      </section>

      {/* Records table */}
      <section className="em-card overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:p-5">
          <div>
            <h2 className="font-semibold text-white">Consumption records</h2>
            <p className="mt-1 text-xs text-slate-500">
              Showing {period} aggregated data.
              {rows.length > 500 && " Display is limited to 500 rows."}
            </p>
          </div>

          <button
            onClick={() => downloadCSV(rows, period)}
            disabled={!rows.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Meter</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">
                  {period === "daily" ? "Date" : "Hour"}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Consumption (kWh)
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Valid / expected
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Completeness
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <RefreshCw size={18} className="mx-auto animate-spin text-emerald-400" />
                    <p className="mt-2 text-sm">Loading records...</p>
                  </td>
                </tr>
              ) : rows.length ? (
                rows.slice(0, 500).map((row, index) => {
                  const consumption =
                    period === "daily"
                      ? row.daily_consumption_kwh
                      : row.consumption_kwh;

                  const completeness = Number(row.completeness_pct) || 0;

                  return (
                    <tr
                      key={`${row.meter_id}-${period === "daily" ? row.consumption_date : row.hour_start}-${index}`}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {row.meter_id}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{row.site_id}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                        {period === "daily"
                          ? row.consumption_date
                          : new Date(row.hour_start).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-200">
                        {Number(consumption).toLocaleString("en-IN", {
                          maximumFractionDigits: 3,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                        {row.valid_intervals} / {row.expected_intervals}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium ${
                            completeness >= 99
                              ? "text-emerald-300"
                              : completeness >= 90
                                ? "text-amber-300"
                                : "text-rose-300"
                          }`}
                        >
                          {completeness >= 99 && <CheckCircle2 size={13} />}
                          {completeness.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Database size={24} className="mx-auto text-slate-600" />
                    <p className="mt-3 text-sm font-medium text-slate-300">
                      No records found
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Try changing the selected filters or date range.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {rows.length > 500 && (
          <div className="border-t border-white/[0.06] px-4 py-3 text-xs text-slate-500">
            Displaying the first 500 of {rows.length.toLocaleString("en-IN")} records.
            CSV export includes all returned records.
          </div>
        )}
      </section>
    </div>
  );
}
