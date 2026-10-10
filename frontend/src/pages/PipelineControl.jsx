
import { useEffect, useState } from "react";
import {
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  LoaderCircle,
  Workflow,
  Activity,
  Database,
  Timer,
  History,
  AlertCircle,
} from "lucide-react";

import {
  getPipelineStatus,
  runPipeline,
} from "../services/pipelineApi";

const formatDuration = (seconds) => `${Number(seconds ?? 0).toFixed(2)}s`;

function StatusBadge({ status }) {
  const styles = {
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    failed: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    running: "border-blue-400/20 bg-blue-400/10 text-blue-300",
    already_running: "border-blue-400/20 bg-blue-400/10 text-blue-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
        styles[status] ??
        "border-white/10 bg-white/[0.04] text-slate-400"
      }`}
    >
      {status?.replaceAll("_", " ") || "Not run"}
    </span>
  );
}

function MetricCard({ title, value, icon: Icon, accent }) {
  const styles = {
    emerald: "border-emerald-400/15 bg-emerald-400/10 text-emerald-300",
    cyan: "border-cyan-400/15 bg-cyan-400/10 text-cyan-300",
    violet: "border-violet-400/15 bg-violet-400/10 text-violet-300",
    amber: "border-amber-400/15 bg-amber-400/10 text-amber-300",
  };

  return (
    <article className="em-card em-card-hover p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">{title}</p>
        <span className={`grid size-9 place-items-center rounded-lg border ${styles[accent]}`}>
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-4 break-words text-2xl font-bold text-white">{value}</p>
    </article>
  );
}

export default function PipelineControl() {
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = async () => {
    try {
      const data = await getPipelineStatus();
      setPipeline(data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load pipeline status. Check the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setError("");

    try {
      const result = await runPipeline();

      setPipeline((previous) => ({
        ...previous,
        latest_run: result,
        history: [
          result,
          ...(previous?.history || []).filter(
            (item) => item.started_at !== result.started_at
          ),
        ].slice(0, 20),
      }));

      if (result.status !== "success") {
        setError(result.error || result.message || "Pipeline did not complete.");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "Pipeline execution failed."
      );
      await loadStatus();
    } finally {
      setRunning(false);
    }
  };

  const latestRun = pipeline?.latest_run;
  const history = pipeline?.history || [];
  const steps = latestRun?.steps || [];
  const successfulSteps = steps.filter(
    (step) => step.status === "success"
  ).length;

  return (
    <main className="page-enter space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-500/[0.09] via-[#0d1828] to-cyan-500/[0.04] p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              <Workflow size={13} />
              Analytics Engineering
            </span>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
              Pipeline <span className="em-gradient-text">Control</span>
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Ingest readings, transform data, and refresh analytical marts.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadStatus}
              disabled={loading || running}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              onClick={handleRun}
              disabled={running || loading}
              className="em-button"
            >
              {running ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              {running ? "Running..." : "Run pipeline"}
            </button>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <section
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4 text-sm text-rose-200"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-300" />
          <div className="min-w-0">
            <p className="font-semibold">Pipeline notice</p>
            <p className="mt-1 break-words text-rose-200/70">{error}</p>
          </div>
        </section>
      )}

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          title="Latest status"
          value={latestRun?.status?.replaceAll("_", " ") || "Not run"}
          icon={Activity}
          accent="emerald"
        />
        <MetricCard
          title="Last duration"
          value={latestRun ? formatDuration(latestRun.duration_seconds) : "—"}
          icon={Timer}
          accent="cyan"
        />
        <MetricCard
          title="Recorded runs"
          value={history.length}
          icon={History}
          accent="violet"
        />
        <MetricCard
          title="Pipeline steps"
          value={pipeline?.pipeline_steps?.length ?? 7}
          icon={Database}
          accent="amber"
        />
      </section>

      {/* Execution details */}
      <section className="em-card p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.08] text-cyan-300">
              <Workflow size={19} />
            </span>
            <div>
              <h2 className="font-semibold text-white">Execution details</h2>
              <p className="mt-1 text-xs text-slate-500">
                Latest run and individual transformation results.
              </p>
            </div>
          </div>

          {latestRun && <StatusBadge status={latestRun.status} />}
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-400">Loading pipeline...</p>
        ) : !latestRun ? (
          <div className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center">
            <Workflow size={25} className="mx-auto text-slate-600" />
            <p className="mt-3 text-sm text-slate-300">
              No execution recorded yet.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Run the pipeline to see ingestion and transformation results.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5">
                <p className="text-xs text-slate-500">Started at</p>
                <p className="mt-1.5 break-words text-sm text-slate-200">
                  {latestRun.started_at
                    ? new Date(latestRun.started_at).toLocaleString()
                    : "—"}
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5">
                <p className="text-xs text-slate-500">Finished at</p>
                <p className="mt-1.5 break-words text-sm text-slate-200">
                  {latestRun.finished_at
                    ? new Date(latestRun.finished_at).toLocaleString()
                    : "In progress"}
                </p>
              </div>
            </div>

            {steps.length > 0 && (
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Step progress</span>
                  <span className="text-slate-300">
                    {successfulSteps} / {steps.length} successful
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                    style={{
                      width: `${(successfulSteps / steps.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {steps.map((step, index) => (
                <article
                  key={`${step.name}-${index}`}
                  className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3.5 transition hover:border-white/[0.12] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {step.status === "success" ? (
                      <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-emerald-300"
                      />
                    ) : step.status === "failed" ? (
                      <XCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-rose-300"
                      />
                    ) : (
                      <Clock
                        size={18}
                        className="mt-0.5 shrink-0 text-blue-300"
                      />
                    )}

                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-slate-200">
                        {step.name}
                      </p>
                      {step.error && (
                        <p className="mt-1 break-words text-xs text-rose-300">
                          {step.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pl-7 sm:pl-0">
                    <StatusBadge status={step.status} />
                    <span className="whitespace-nowrap text-xs tabular-nums text-slate-400">
                      {formatDuration(step.duration_seconds)}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            {latestRun.error && (
              <p className="mt-4 break-words rounded-xl border border-rose-400/15 bg-rose-400/[0.05] p-3 text-sm text-rose-300">
                {latestRun.error}
              </p>
            )}
          </>
        )}
      </section>

      {/* Run history */}
      <section className="em-card overflow-hidden p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl border border-violet-400/15 bg-violet-400/[0.08] text-violet-300">
            <History size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-white">Run history</h2>
            <p className="mt-1 text-xs text-slate-500">
              Recent executions recorded by the backend.
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">No previous runs available.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-white/[0.08] text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 pr-4 font-medium">Started</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Duration</th>
                  <th className="py-3 font-medium">Steps</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.05]">
                {history.map((run, index) => (
                  <tr
                    key={run.started_at || index}
                    className="transition hover:bg-white/[0.025]"
                  >
                    <td className="whitespace-nowrap py-3 pr-4 text-xs text-slate-400">
                      {run.started_at
                        ? new Date(run.started_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-slate-300">
                      {formatDuration(run.duration_seconds)}
                    </td>
                    <td className="py-3 text-slate-300">
                      {run.steps?.length ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
