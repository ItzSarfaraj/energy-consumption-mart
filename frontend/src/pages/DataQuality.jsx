
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Clock3,
  Database,
  Activity,
} from "lucide-react";

import api from "../services/api";

const statusStyles = {
  valid: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  missing_reading: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  negative_reading: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  possible_meter_reset: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  invalid_interval: "border-orange-400/20 bg-orange-400/10 text-orange-300",
};

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("en-IN");
}

function formatStatus(status) {
  return status.replaceAll("_", " ");
}

function SummaryCard({ title, value, description, icon: Icon, accent }) {
  const styles = {
    amber: "border-amber-400/15 bg-amber-400/10 text-amber-300",
    emerald: "border-emerald-400/15 bg-emerald-400/10 text-emerald-300",
  };

  return (
    <article className="em-card em-card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-4 text-3xl font-bold tracking-tight text-white">
            {formatNumber(value)}
          </p>
        </div>
        <span className={`grid size-11 place-items-center rounded-xl border ${styles[accent]}`}>
          <Icon size={21} />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

export default function DataQuality() {
  const [quality, setQuality] = useState(null);
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadQuality() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/quality", {
        params: { limit },
      });
      setQuality(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load data quality information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuality();
  }, [limit]);

  const statusSummary = quality?.status_summary ?? [];
  const incompleteHours = quality?.incomplete_hours ?? [];

  const invalidCount = statusSummary
    .filter((item) => item.interval_status !== "valid")
    .reduce((sum, item) => sum + Number(item.interval_count || 0), 0);

  return (
    <main className="page-enter space-y-7">
      {/* Heading */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.09] via-[#0d1828] to-cyan-500/[0.04] p-6 sm:p-7">
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              <ShieldCheck size={13} />
              Data Governance
            </span>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
              Data <span className="em-gradient-text">Quality</span>
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Inspect interval anomalies and incomplete meter-hours.
            </p>
          </div>

          <button
            onClick={loadQuality}
            disabled={loading}
            className="em-button self-start sm:self-auto"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      {/* Error */}
      {error && (
        <section
          role="alert"
          className="rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={19} className="mt-0.5 text-rose-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-200">
                Unable to load data quality
              </p>
              <p className="mt-1 break-words text-sm text-rose-200/70">
                {error}
              </p>
              <button
                onClick={loadQuality}
                className="mt-3 rounded-lg border border-rose-400/20 px-3 py-2 text-xs text-rose-200 hover:bg-rose-400/10"
              >
                Try again
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Loading */}
      {loading && !quality ? (
        <section className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((item) => (
            <div key={item} className="em-card em-pulse p-6">
              <div className="h-4 w-36 rounded bg-slate-700" />
              <div className="mt-5 h-9 w-24 rounded bg-slate-700" />
              <div className="mt-4 h-3 w-48 max-w-full rounded bg-slate-800" />
            </div>
          ))}
        </section>
      ) : quality ? (
        <>
          {/* Summary cards */}
          <section className="grid gap-4 sm:grid-cols-2">
            <SummaryCard
              title="Non-valid intervals"
              value={invalidCount}
              description="Interval records classified as non-valid."
              icon={AlertTriangle}
              accent="amber"
            />

            <SummaryCard
              title="Incomplete meter-hours"
              value={incompleteHours.length}
              description={`Incomplete hours returned by the current limit of ${limit} records.`}
              icon={Clock3}
              accent="emerald"
            />
          </section>

          {/* Interval status breakdown */}
          <section className="em-card overflow-hidden p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.08] text-cyan-300">
                <Database size={19} />
              </span>
              <div>
                <h2 className="font-semibold text-white">
                  Interval status breakdown
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Classification results from the interval fact table.
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-white/[0.08] text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 text-right font-medium">Records</th>
                    <th className="px-3 py-3 font-medium">Classification</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.05]">
                  {statusSummary.map((item) => {
                    const status = item.interval_status;
                    const isValid = status === "valid";

                    return (
                      <tr key={status} className="transition hover:bg-white/[0.025]">
                        <td className="px-3 py-3.5 font-medium capitalize text-slate-200">
                          {formatStatus(status)}
                        </td>
                        <td className="px-3 py-3.5 text-right font-medium tabular-nums text-white">
                          {formatNumber(item.interval_count)}
                        </td>
                        <td className="px-3 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                              statusStyles[status] ??
                              "border-slate-400/20 bg-slate-400/10 text-slate-300"
                            }`}
                          >
                            {isValid ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              <AlertTriangle size={13} />
                            )}
                            {isValid ? "Accepted" : "Review"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {statusSummary.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                        No interval status records available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Incomplete hours */}
          <section className="em-card overflow-hidden p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl border border-amber-400/15 bg-amber-400/[0.08] text-amber-300">
                  <Activity size={19} />
                </span>
                <div>
                  <h2 className="font-semibold text-white">Incomplete hours</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Hours with less than 100% interval completeness.
                  </p>
                </div>
              </div>

              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="em-input w-auto text-xs"
                aria-label="Number of incomplete hours to show"
              >
                <option value={25}>Show 25</option>
                <option value={100}>Show 100</option>
                <option value={500}>Show 500</option>
                <option value={1000}>Show 1000</option>
              </select>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b border-white/[0.08] text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">Meter</th>
                    <th className="px-3 py-3 font-medium">Site</th>
                    <th className="px-3 py-3 font-medium">Hour</th>
                    <th className="px-3 py-3 text-right font-medium">Valid / expected</th>
                    <th className="px-3 py-3 text-right font-medium">Complete</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.05]">
                  {incompleteHours.map((row) => {
                    const completeness = Number(row.completeness_pct) || 0;

                    return (
                      <tr
                        key={`${row.meter_id}-${row.hour_start}`}
                        className="transition hover:bg-white/[0.025]"
                      >
                        <td className="px-3 py-3.5 font-medium text-white">
                          {row.meter_id}
                        </td>
                        <td className="px-3 py-3.5 text-slate-400">
                          {row.site_id}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-xs text-slate-400">
                          {new Date(row.hour_start).toLocaleString()}
                        </td>
                        <td className="px-3 py-3.5 text-right tabular-nums text-slate-300">
                          {row.valid_intervals} / {row.expected_intervals}
                        </td>
                        <td className="px-3 py-3.5 text-right">
                          <span
                            className={`font-semibold ${
                              completeness >= 90
                                ? "text-amber-300"
                                : "text-rose-300"
                            }`}
                          >
                            {completeness.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {incompleteHours.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center">
                        <CheckCircle2 size={22} className="mx-auto text-emerald-400" />
                        <p className="mt-2 text-sm text-slate-300">
                          No incomplete hours found in this result.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
