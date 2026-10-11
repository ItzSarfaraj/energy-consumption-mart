
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  ChartNoAxesCombined,
  Database,
  LayoutDashboard,
  ShieldCheck,
  Workflow,
  Zap,
  ChevronRight,
  BrainCircuit
} from "lucide-react";
import { useEffect } from "react";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/quality", label: "Data Quality", icon: ShieldCheck },
  { to: "/explorer", label: "Explorer", icon: ChartNoAxesCombined },
  { to: "/ai-insights", label: "AI Insights", icon: BrainCircuit },
  { to: "/pipeline", label: "Pipeline Control", icon: Workflow },
];

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip text-slate-200">
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-48 top-24 size-96 rounded-full bg-emerald-500/[0.06] blur-[120px]" />
        <div className="absolute -right-48 top-72 size-96 rounded-full bg-cyan-500/[0.045] blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#080f1b]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <NavLink
            to="/"
            className="group flex min-w-0 items-center gap-3"
            aria-label="EnergyMart home"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/20 to-emerald-700/10 text-emerald-300 shadow-lg shadow-emerald-950/20 transition duration-300 group-hover:border-emerald-300/40 group-hover:shadow-emerald-500/10">
              <Zap size={22} strokeWidth={2.2} />
            </span>

            <span className="min-w-0">
              <span className="block text-lg font-bold tracking-tight text-white sm:text-xl">
                Energy<span className="text-emerald-400">Mart</span>
              </span>
              <span className="hidden text-[10px] tracking-[0.16em] text-slate-500 sm:block">
                ANALYTICS ENGINEERING
              </span>
            </span>
          </NavLink>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2 md:flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-30" />
                <span className="relative size-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-medium text-emerald-300">
                Analytics Workspace
              </span>
            </div>

            <div
              className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-2 sm:px-3"
              title="This project uses generated sample readings"
            >
              <Database size={14} className="shrink-0 text-cyan-400" />
              <span className="text-[11px] text-slate-400 sm:text-xs">
                Synthetic Data
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        className="sticky top-[65px] z-40 border-b border-white/[0.06] bg-[#0a1220]/90 backdrop-blur-xl sm:top-[69px]"
      >
        <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    "group relative inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 sm:gap-2.5 sm:px-4 sm:py-3 sm:text-sm",
                    isActive
                      ? "bg-emerald-400/[0.10] text-emerald-300"
                      : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={17}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      className={
                        isActive
                          ? "text-emerald-300"
                          : "text-slate-500 transition-colors group-hover:text-slate-300"
                      }
                    />
                    <span>{label}</span>
                    {isActive && (
                      <span className="absolute inset-x-3 -bottom-2 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)] sm:inset-x-4" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/[0.07] bg-[#080f1b]/65">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 px-4 py-5 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Zap size={14} className="text-emerald-400" />
            <span className="font-medium text-slate-400">
              Energy Consumption Mart
            </span>
            <span className="text-slate-700">·</span>
            <span>DAI-025</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Activity size={13} className="text-cyan-400" />
            <span>React</span>
            <ChevronRight size={12} className="text-slate-700" />
            <span>FastAPI</span>
            <ChevronRight size={12} className="text-slate-700" />
            <span>DuckDB</span>
            <ChevronRight size={12} className="text-slate-700" />
            <span>SQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
