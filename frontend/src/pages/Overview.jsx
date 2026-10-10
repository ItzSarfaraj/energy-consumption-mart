
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  BarChart3,
  CheckCircle2,
  Database,
  Gauge,
  MapPin,
  RefreshCw,
  Server,
  Zap,
  AlertCircle,
  Clock3,
} from "lucide-react";

import { getOverview } from "../services/api";
import ConsumptionChart from "../components/ConsumptionChart";

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined) {
    return "—";
  }

  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  description,
  accent = "emerald",
}) {
  const accents = {
    emerald: {
      icon: "border-emerald-400/15 bg-emerald-400/10 text-emerald-300",
      glow: "bg-emerald-400/[0.07]",
      line: "from-emerald-400 to-emerald-600",
    },
    cyan: {
      icon: "border-cyan-400/15 bg-cyan-400/10 text-cyan-300",
      glow: "bg-cyan-400/[0.07]",
      line: "from-cyan-400 to-blue-500",
    },
    violet: {
      icon: "border-violet-400/15 bg-violet-400/10 text-violet-300",
      glow: "bg-violet-400/[0.07]",
      line: "from-violet-400 to-purple-600",
    },
    amber: {
      icon: "border-amber-400/15 bg-amber-400/10 text-amber-300",
      glow: "bg-amber-400/[0.07]",
      line: "from-amber-400 to-orange-500",
    },
  };

  const colors = accents[accent] || accents.emerald;

  return (
    <article className="em-card em-card-hover group relative overflow-hidden p-5 sm:p-6">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-12 -top-12 size-36 rounded-full blur-3xl ${colors.glow}`}
      />

      <div
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${colors.line} opacity-60`}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-400">{title}</p>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="break-words text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {value}
            </span>

            {unit && (
              <span className="text-sm font-medium text-slate-400">
                {unit}
              </span>
            )}
          </div>
        </div>

        <span
          className={`grid size-12 shrink-0 place-items-center rounded-2xl border transition duration-300 group-hover:scale-105 ${colors.icon}`}
        >
          <Icon size={22} strokeWidth={1.8} />
        </span>
      </div>

      <div className="relative mt-5 flex items-start gap-2 border-t border-white/[0.06] pt-4">
        <Activity size={14} className="mt-0.5 shrink-0 text-slate-500" />
        <p className="text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </article>
  );
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            {eyebrow}
          </p>
        )}

        <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
          {title}
        </h2>

        {description && (
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="em-card em-pulse p-6">
      <div className="h-4 w-32 rounded bg-slate-700/70" />
      <div className="mt-6 h-9 w-40 rounded-lg bg-slate-700/70" />
      <div className="mt-5 h-3 w-48 max-w-full rounded bg-slate-800" />
    </div>
  );
}

export default function Overview() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOverview() {
    setLoading(true);
    setError("");

    try {
      const data = await getOverview();
      setOverview(data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const completeness = Math.min(
    100,
    Math.max(0, Number(overview?.completeness_pct) || 0)
  );

  const qualityColor =
    completeness >= 99
      ? "text-emerald-300"
      : completeness >= 90
        ? "text-amber-300"
        : "text-rose-300";

  return (
    <div className="page-enter space-y-9">
      {/* Page heading */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.10] via-[#0d1828] to-cyan-500/[0.05] p-6 sm:p-8 lg:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-emerald-400/[0.08] blur-[90px]"
        />

        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5">
              <Zap size={13} className="text-emerald-300" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                Energy Intelligence
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Consumption{" "}
              <span className="em-gradient-text">Overview</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
              Monitor electricity consumption, track meter coverage, and
              understand the quality of your analytics data.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <Database size={14} className="text-cyan-300" />
                DuckDB Analytics
              </span>

              <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <Activity size={14} className="text-emerald-300" />
                Computed Metrics
              </span>
            </div>
          </div>

          <button
            onClick={loadOverview}
            disabled={loading}
            className="em-button shrink-0 self-start sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            {loading ? "Refreshing..." : "Refresh data"}
          </button>
        </div>
      </section>

      {/* Connection status */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Dashboard metrics
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Analytical results calculated from the database
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${
            error
              ? "border-rose-400/20 bg-rose-400/[0.07] text-rose-300"
              : loading
                ? "border-amber-400/20 bg-amber-400/[0.07] text-amber-300"
                : overview
                  ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                  : "border-slate-400/20 bg-slate-400/[0.05] text-slate-400"
          }`}
        >
          <span
            className={`size-2 rounded-full ${
              error
                ? "bg-rose-400"
                : loading
                  ? "animate-pulse bg-amber-400"
                  : overview
                    ? "bg-emerald-400"
                    : "bg-slate-500"
            }`}
          />
          {error
            ? "Connection issue"
            : loading
              ? "Fetching analytics"
              : overview
                ? "API connected"
                : "Awaiting data"}
        </div>
      </section>

      {/* API error */}
      {error && (
        <section
          role="alert"
          className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              size={21}
              className="mt-0.5 shrink-0 text-rose-300"
            />

            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-rose-200">
                Unable to load analytics
              </h2>

              <p className="mt-2 break-words text-sm leading-6 text-rose-200/75">
                {error}
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Verify that FastAPI is running and the frontend API URL is
                configured correctly.
              </p>

              <button
                onClick={loadOverview}
                className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-400/[0.14]"
              >
                Try again
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Loading state */}
      {loading && !overview ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <LoadingCard key={index} />
          ))}
        </section>
      ) : overview ? (
        <>
          {/* KPI cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total consumption"
              value={formatNumber(overview.total_consumption_kwh, 2)}
              unit="kWh"
              icon={Zap}
              accent="emerald"
              description="Sum of valid interval consumption"
            />

            <MetricCard
              title="Data completeness"
              value={formatNumber(overview.completeness_pct, 2)}
              unit="%"
              icon={Gauge}
              accent="cyan"
              description="Valid intervals versus expected intervals"
            />

            <MetricCard
              title="Active meters"
              value={formatNumber(overview.total_meters)}
              icon={Database}
              accent="violet"
              description="Unique meters in the analytics mart"
            />

            <MetricCard
              title="Sites covered"
              value={formatNumber(overview.total_sites)}
              icon={MapPin}
              accent="amber"
              description="Unique sites represented in the dataset"
            />
          </section>

          {/* Quality overview */}
          <section>
            <SectionHeading
              eyebrow="Data reliability"
              title="Quality at a glance"
              description="Understand the completeness of the readings behind your analytics."
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Interval coverage */}
              <article className="em-card em-card-hover relative overflow-hidden p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-300">
                      <BarChart3 size={21} />
                    </span>

                    <div>
                      <h3 className="font-semibold text-white">
                        Interval coverage
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Valid versus expected readings
                      </p>
                    </div>
                  </div>

                  <span className={`text-lg font-bold ${qualityColor}`}>
                    {formatNumber(overview.completeness_pct, 2)}%
                  </span>
                </div>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {formatNumber(overview.valid_intervals)}
                  </span>
                  <span className="text-sm text-slate-500">
                    / {formatNumber(overview.expected_intervals)} intervals
                  </span>
                </div>

                <div
                  className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-800"
                  role="progressbar"
                  aria-label="Data completeness"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={completeness}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-700 ease-out"
                    style={{ width: `${completeness}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">Data completeness</span>
                  <span className={qualityColor}>
                    {completeness >= 99
                      ? "Excellent coverage"
                      : completeness >= 90
                        ? "Coverage needs review"
                        : "Low coverage"}
                  </span>
                </div>
              </article>

              {/* Incomplete hours */}
              <article className="em-card em-card-hover relative overflow-hidden p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-amber-400/15 bg-amber-400/10 text-amber-300">
                      <Clock3 size={21} />
                    </span>

                    <div>
                      <h3 className="font-semibold text-white">
                        Incomplete hours
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Hours below full interval completeness
                      </p>
                    </div>
                  </div>

                  <span className="text-2xl font-bold text-white">
                    {formatNumber(overview.incomplete_hours)}
                  </span>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-400">
                  Meter-hours with less than 100% expected interval
                  completeness.
                </p>

                <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-4 text-xs">
                  {Number(overview.incomplete_hours) > 0 ? (
                    <>
                      <ArrowDownRight
                        size={15}
                        className="text-amber-300"
                      />
                      <span className="text-amber-200">
                        Incomplete periods detected
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={15}
                        className="text-emerald-300"
                      />
                      <span className="text-emerald-300">
                        No incomplete hours detected
                      </span>
                    </>
                  )}
                </div>
              </article>
            </div>
          </section>
        </>
      ) : !error ? (
        <div className="em-card p-8 text-center">
          <Database size={28} className="mx-auto text-slate-500" />
          <h3 className="mt-4 font-semibold text-white">
            No overview data available
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            The API returned no dashboard data.
          </p>
          <button onClick={loadOverview} className="em-button mt-5">
            <RefreshCw size={15} />
            Reload data
          </button>
        </div>
      ) : null}

      {/* Consumption chart */}
      <section>
        <SectionHeading
          eyebrow="Consumption trends"
          title="Energy usage over time"
          description="Explore consumption patterns using the processed meter readings."
        />

        <ConsumptionChart />
      </section>
    </div>
  );
}
