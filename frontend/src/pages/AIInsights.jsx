
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { getAIInsights } from "../services/api";

// --------------------------------------------------
// Formatting utilities
// --------------------------------------------------

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString("en-IN", {
        maximumFractionDigits: digits,
      })
    : String(value);
}

function formatTimestamp(value) {
  if (!value) return "Unknown time";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getReadableError(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.msg ?? "Invalid request",
      )
      .join("; ");
  }

  if (detail && typeof detail === "object") {
    return detail.message ?? detail.msg ?? "Unexpected server error.";
  }

  return error?.message ?? "Unable to load AI insights.";
}

function formatStatus(status) {
  return String(status ?? "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// --------------------------------------------------
// Safe, lightweight Markdown rendering
// --------------------------------------------------

function renderInlineMarkdown(text, prefix) {
  const parts = String(text).split(
    /(\*\*.+?\*\*|__.+?__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g,
  );

  return parts.map((part, index) => {
    const key = `${prefix}-${index}`;

    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      return (
        <strong key={key} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={key}
          className="rounded-md border border-white/10 bg-slate-950/70 px-1.5 py-0.5 font-mono text-xs text-cyan-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      return (
        <em key={key} className="text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}

function MarkdownNarrative({ content }) {
  if (typeof content !== "string" || !content.trim()) {
    return (
      <p className="text-sm text-slate-400">
        No narrative was returned. Refresh the report to try again.
      </p>
    );
  }

  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];

  let paragraph = [];
  let listItems = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;

    blocks.push({
      type: "paragraph",
      content: paragraph.join(" "),
      key: `paragraph-${blocks.length}`,
    });

    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;

    blocks.push({
      type: listType,
      items: [...listItems],
      key: `list-${blocks.length}`,
    });

    listItems = [];
    listType = null;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const markdownHeading = line.match(/^(#{1,3})\s+(.+)$/);

    // Also support headings such as "1. Executive Summary"
    // when the model does not include Markdown hash prefixes.
    const numberedHeading = line.match(
      /^(\d+[.)])\s+(.{1,80})$/,
    );

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    const numberedList = line.match(/^\d+[.)]\s+(.+)$/);

    const isNumberedHeading =
      numberedHeading &&
      !/[.!?]$/.test(numberedHeading[2]) &&
      numberedHeading[2].split(/\s+/).length <= 8;

    if (markdownHeading || isNumberedHeading) {
      flushParagraph();
      flushList();

      const headingText = markdownHeading
        ? markdownHeading[2]
        : numberedHeading[2];

      const level = markdownHeading
        ? markdownHeading[1].length
        : 2;

      blocks.push({
        type: "heading",
        content: headingText,
        level,
        key: `heading-${blocks.length}`,
      });

      return;
    }

    if (bullet || numberedList) {
      flushParagraph();

      const nextType = bullet ? "bullet" : "numbered";

      if (listType && listType !== nextType) {
        flushList();
      }

      listType = nextType;
      listItems.push(
        bullet ? bullet[1] : numberedList[1],
      );

      return;
    }

    flushList();

    // Remove a Markdown blockquote marker while keeping the text safe.
    paragraph.push(line.replace(/^>\s?/, ""));
  });

  flushParagraph();
  flushList();

  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        if (block.type === "heading") {
          return (
            <h3
              key={block.key}
              className={
                block.level === 1
                  ? "border-b border-white/10 pb-3 text-xl font-semibold text-white"
                  : block.level === 2
                    ? "pt-2 text-base font-semibold text-emerald-200"
                    : "pt-1 text-sm font-semibold text-cyan-200"
              }
            >
              {renderInlineMarkdown(block.content, block.key)}
            </h3>
          );
        }

        if (block.type === "bullet" || block.type === "numbered") {
          const ListTag = block.type === "numbered" ? "ol" : "ul";

          return (
            <ListTag
              key={block.key}
              className={`space-y-2 pl-6 text-sm leading-7 text-slate-300 ${
                block.type === "numbered"
                  ? "list-decimal marker:text-cyan-300"
                  : "list-disc marker:text-emerald-300"
              }`}
            >
              {block.items.map((item, index) => (
                <li key={index} className="pl-1">
                  {renderInlineMarkdown(item, `${block.key}-${index}`)}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p
            key={block.key}
            className="break-words text-sm leading-7 text-slate-300"
          >
            {renderInlineMarkdown(block.content, block.key)}
          </p>
        );
      })}
    </div>
  );
}

// --------------------------------------------------
// Reusable dashboard components
// --------------------------------------------------

function MetricCard({
  title,
  value,
  suffix = "",
  icon: Icon,
  description,
  accent = "emerald",
}) {
  const accentStyles = {
    emerald:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    amber:
      "border-amber-400/20 bg-amber-400/10 text-amber-300",
    violet:
      "border-violet-400/20 bg-violet-400/10 text-violet-300",
  };

  return (
    <article className="em-card min-w-0 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{title}</p>

          <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-white">
            {value}
            {suffix}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`shrink-0 rounded-xl border p-3 ${accentStyles[accent]}`}
        >
          <Icon size={20} />
        </div>
      </div>
    </article>
  );
}

function Section({ title, icon: Icon, children, subtitle }) {
  return (
    <section className="em-card min-w-0 p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="shrink-0 rounded-xl border border-cyan-400/10 bg-cyan-400/10 p-2.5 text-cyan-300">
          <Icon size={19} />
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

// --------------------------------------------------
// Main page
// --------------------------------------------------

export default function AIInsights() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrievedAt, setRetrievedAt] = useState(null);

  const loadInsights = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError("");

    try {
      // api.js accepts a boolean: false uses the cache;
      // true requests fresh generation.
      const data = await getAIInsights(forceRefresh);

      setReport(data);
      setRetrievedAt(new Date());
    } catch (err) {
      setError(getReadableError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights(false);
  }, [loadInsights]);

  if (loading && !report) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="em-card flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-center"
      >
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-300">
          <BrainCircuit size={30} />
        </div>

        <div>
          <h2 className="font-semibold text-white">
            Preparing your AI insights
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Retrieving analytics and preparing the report...
          </p>
        </div>

        <span className="size-5 animate-spin rounded-full border-2 border-emerald-400/25 border-t-emerald-400" />
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="em-card p-6 sm:p-8" role="alert">
        <div className="flex items-center gap-3 text-rose-300">
          <AlertCircle size={22} />
          <h2 className="font-semibold text-white">
            Could not load AI insights
          </h2>
        </div>

        <p className="mt-3 break-words text-sm leading-6 text-slate-400">
          {error}
        </p>

        <button
          type="button"
          onClick={() => loadInsights(true)}
          disabled={loading}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Try again
        </button>
      </div>
    );
  }

  const metrics = report?.metrics ?? {};
  const overview = metrics.overview ?? {};

  const peakHours = Array.isArray(metrics.peak_hours)
    ? metrics.peak_hours
    : [];

  const intervalQuality = Array.isArray(metrics.interval_quality)
    ? metrics.interval_quality
    : [];

  const maxPeak = Math.max(
    0,
    ...peakHours.map(
      (item) => Number(item?.consumption_kwh) || 0,
    ),
  );

  const invalidStatuses = intervalQuality.filter((item) => {
    const status = String(item?.interval_status ?? "").toLowerCase();

    return (
      !["valid", "accepted"].includes(status) &&
      Number(item?.interval_count) > 0
    );
  });

  const invalidIntervalCount = invalidStatuses.reduce(
    (total, item) => total + (Number(item?.interval_count) || 0),
    0,
  );

  const completeness = Number(overview.completeness_pct);
  const completenessAvailable = Number.isFinite(completeness);

  const isAiGenerated = report?.generation_mode === "ai";

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 text-xs font-medium text-emerald-300">
            <BrainCircuit size={15} />
            AI-powered analytics
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            AI Insights
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Turn energy-consumption data into understandable findings,
            data-quality observations, and practical recommendations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadInsights(true)}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-emerald-400/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          {loading ? "Generating report..." : "Refresh report"}
        </button>
      </header>

      {/* Refresh error */}
      {error && report && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm leading-6 text-rose-200"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p>
            Refresh failed: {error} The previously loaded report is
            still displayed.
          </p>
        </div>
      )}

      {/* Report metadata */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
              isAiGenerated
                ? "border border-emerald-400/15 bg-emerald-400/10 text-emerald-300"
                : "border border-amber-400/15 bg-amber-400/10 text-amber-300"
            }`}
          >
            {isAiGenerated ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}

            {isAiGenerated ? "AI-generated report" : "Fallback report"}
          </span>

          <span className="text-xs text-slate-500">
            Synthetic smart-meter dataset
          </span>
        </div>

        {retrievedAt && (
          <p className="text-xs text-slate-500">
            Last retrieved:{" "}
            <span className="text-slate-300">
              {retrievedAt.toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </p>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          title="Total consumption"
          value={formatNumber(overview.total_consumption_kwh)}
          suffix=" kWh"
          icon={Zap}
          description="Total valid energy consumption"
          accent="emerald"
        />

        <MetricCard
          title="Data completeness"
          value={formatNumber(overview.completeness_pct)}
          suffix="%"
          icon={ShieldCheck}
          description="Valid intervals versus expected intervals"
          accent="cyan"
        />

        <MetricCard
          title="Meters monitored"
          value={formatNumber(overview.total_meters, 0)}
          icon={Database}
          description={`${formatNumber(overview.total_sites, 0)} sites represented`}
          accent="violet"
        />

        <MetricCard
          title="Incomplete hours"
          value={formatNumber(overview.incomplete_hours, 0)}
          icon={Clock3}
          description="Hours with less than full completeness"
          accent="amber"
        />
      </div>

      {/* Data-quality alert */}
      {invalidIntervalCount > 0 && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.045] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-xl border border-amber-400/15 bg-amber-400/10 p-2.5 text-amber-300">
              <AlertTriangle size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-amber-200">
                Data-quality items need review
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-300">
                The interval-quality query returned{" "}
                <strong className="text-white">
                  {formatNumber(invalidIntervalCount, 0)} interval(s)
                </strong>{" "}
                in non-valid categories. High completeness does not
                mean that every reading is valid.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {invalidStatuses.map((item, index) => (
                  <span
                    key={`${item.interval_status}-${index}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-400/10 bg-slate-950/30 px-3 py-1.5 text-xs text-slate-300"
                  >
                    <span className="text-amber-300">
                      {formatStatus(item.interval_status)}
                    </span>

                    <span className="rounded bg-white/5 px-1.5 py-0.5 font-semibold text-white">
                      {formatNumber(item.interval_count, 0)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics panels */}
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <Section
          title="Highest-consumption hours"
          icon={Activity}
          subtitle="Top five hourly totals returned by DuckDB"
        >
          {peakHours.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
              No peak-hour data is available.
            </div>
          ) : (
            <div className="space-y-5">
              {peakHours.map((item, index) => {
                const consumption =
                  Number(item?.consumption_kwh) || 0;

                const width =
                  maxPeak > 0
                    ? Math.max(0, (consumption / maxPeak) * 100)
                    : 0;

                return (
                  <div
                    key={`${item?.hour_start ?? "hour"}-${index}`}
                  >
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-xs text-slate-400">
                          {index + 1}
                        </span>

                        <span className="break-words text-sm text-slate-300">
                          {formatTimestamp(item?.hour_start)}
                        </span>
                      </div>

                      <span className="pl-8 text-sm font-semibold tabular-nums text-white sm:pl-0">
                        {formatNumber(consumption)} kWh
                      </span>
                    </div>

                    <div
                      className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]"
                      role="progressbar"
                      aria-label={`Consumption for ${formatTimestamp(item?.hour_start)}`}
                      aria-valuemin={0}
                      aria-valuemax={maxPeak}
                      aria-valuenow={consumption}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 flex items-start gap-2 border-t border-white/10 pt-4">
            <TrendingUp
              size={15}
              className="mt-0.5 shrink-0 text-cyan-300"
            />

            <p className="text-xs leading-5 text-slate-500">
              These are observed hourly totals, not a forecast. A
              high value should be investigated in context before
              inferring its cause.
            </p>
          </div>
        </Section>

        <Section
          title="Interval data quality"
          icon={ShieldCheck}
          subtitle="Distribution of interval statuses in the source mart"
        >
          {intervalQuality.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
              No interval-quality breakdown is available.
            </div>
          ) : (
            <div className="space-y-4">
              {intervalQuality.map((item, index) => {
                const count = Number(item?.interval_count) || 0;

                const totalCount = intervalQuality.reduce(
                  (sum, row) =>
                    sum + (Number(row?.interval_count) || 0),
                  0,
                );

                const percentage =
                  totalCount > 0 ? (count / totalCount) * 100 : 0;

                const isValid = ["valid", "accepted"].includes(
                  String(item?.interval_status ?? "").toLowerCase(),
                );

                return (
                  <div
                    key={`${item?.interval_status ?? "status"}-${index}`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`size-2 shrink-0 rounded-full ${
                            isValid ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />

                        <span className="break-words text-sm text-slate-300">
                          {formatStatus(item?.interval_status)}
                        </span>
                      </div>

                      <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
                        {formatNumber(count, 0)}
                      </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isValid
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                        }`}
                        style={{
                          width: `${Math.min(100, percentage)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
            Status counts describe interval records. They should not
            be interpreted as the number of incomplete hours; those
            are a separate metric.
          </p>
        </Section>
      </div>

      {/* AI narrative */}
      <Section
        title="AI analysis and recommendations"
        icon={BrainCircuit}
        subtitle="A narrative grounded in the supplied SQL metrics"
      >
        <div className="rounded-2xl border border-white/[0.07] bg-slate-950/20 p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <span className="size-2 rounded-full bg-emerald-400" />
              Analytics report
            </div>

            <span className="text-xs text-slate-500">
              {isAiGenerated ? "Generated by AI" : "Deterministic fallback"}
            </span>
          </div>

          <MarkdownNarrative content={report?.insights ?? ""} />
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <Database
            size={17}
            className="mt-0.5 shrink-0 text-cyan-300"
          />

          <p className="text-xs leading-5 text-slate-500">
            <strong className="text-slate-300">Source of truth:</strong>{" "}
            numerical metrics are collected from DuckDB. AI-generated
            explanations can be imperfect and do not establish the
            root cause of an anomaly. This project uses synthetic data.
          </p>
        </div>
      </Section>
    </div>
  );
}
