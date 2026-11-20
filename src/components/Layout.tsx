import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";
import {
  BarChart3,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  Info,
  LayoutDashboard,
  Menu,
  RefreshCw,
  TrendingUp,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import { useData } from "@/state/DataContext";
import { formatFullDate } from "@/lib/utils";
import { Badge, Button } from "@/components/ui";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/forecast", label: "Demand Forecast", icon: TrendingUp },
  { to: "/alerts", label: "Waste & Alerts", icon: BellRing },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/about", label: "About SmartLoop", icon: Info },
];

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "relative grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-ink-900 text-brand-300 shadow-sm",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M4.7 14.9a8 8 0 0 1 11.5-9.6M19.3 9.1a8 8 0 0 1-11.5 9.6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M15.9 5.1h4.2v4.1M8.1 18.9H3.9v-4.1"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12.7 10.2c1.7.3 2.3 1.4 2.1 3.4-2.2.1-3.3-.7-3.4-2.4"
          stroke="#79d8aa"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { activeAlertCount, dataset, resetDemo, loading } = useData();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] items-center gap-2.5 px-5">
        <BrandMark />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight tracking-[-0.02em] text-ink-900">SmartLoop</p>
          <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-400">
            Campus Energy Intelligence
          </p>
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center justify-between rounded-xl border border-line bg-ink-50/60 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-ink-700">Green Campus Initiative</p>
            <p className="mt-0.5 truncate text-[10px] text-ink-400">Hypothetical campus · 5 buildings</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-300" />
        </div>
      </div>

      <nav className="mt-6 flex-1 overflow-y-auto px-3" aria-label="Main navigation">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
          Workspace
        </p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  clsx(
                    "group flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] transition-colors duration-150",
                    isActive
                      ? "bg-brand-50 font-semibold text-brand-900 ring-1 ring-inset ring-brand-100"
                      : "font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={clsx("h-[17px] w-[17px] shrink-0", isActive ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600")}
                      strokeWidth={1.9}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.to === "/alerts" && activeAlertCount > 0 ? (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-100 px-1.5 text-[10px] font-semibold text-rose-700">
                        {activeAlertCount > 99 ? "99+" : activeAlertCount}
                      </span>
                    ) : null}
                    {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> : null}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
          Data status
        </p>
        <div className="mx-1 rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            <p className="text-[11px] font-semibold text-brand-900">Demo mode active</p>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-brand-900/70">
            Simulated data only. No live meters, bills or campus systems are connected.
          </p>
          <div className="mt-2 flex items-center justify-between border-t border-brand-200/60 pt-2 text-[10px] text-brand-900/60">
            <span className="font-mono">seed: {dataset.seed.slice(-10)}</span>
            <span>v1.0</span>
          </div>
        </div>
      </nav>

      <div className="border-t border-line p-4">
        <button
          type="button"
          onClick={() => {
            resetDemo();
            onNavigate?.();
          }}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[11px] font-medium text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-800 disabled:opacity-50"
        >
          <RefreshCw className="h-3 w-3" /> Reset demo session
        </button>
        <p className="mt-1 text-center text-[9.5px] text-ink-300">Prototype · simulated results only</p>
      </div>
    </div>
  );
}

function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { dataset, regenerate, loading } = useData();
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex h-[64px] w-full max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-ink-600 shadow-sm lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <BrandMark className="h-8 w-8 rounded-[9px]" />
            <span className="text-sm font-semibold tracking-[-0.01em]">SmartLoop</span>
          </div>
          <div className="hidden items-center gap-2.5 lg:flex">
            <Badge tone="green" dot>
              Demo Mode
            </Badge>
            <span className="h-3.5 w-px bg-line" />
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-500">
              <CalendarDays className="h-3.5 w-3.5 text-ink-400" />
              Simulated operating day
              <span className="font-medium text-ink-700">{formatFullDate(dataset.anchorTimestamp)}</span>
            </span>
          </div>
          <span className="lg:hidden">
            <Badge tone="green" dot>
              Demo
            </Badge>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50/80 px-2.5 py-1 text-[10px] font-medium text-amber-800 sm:flex">
            <FlaskConical className="h-3 w-3" />
            Simulated data
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={regenerate}
            loading={loading}
            className="shrink-0"
            aria-label="Regenerate simulated dataset"
          >
            <span className="hidden sm:inline">{loading ? "Rebuilding…" : "Regenerate demo data"}</span>
            <span className="sm:hidden">Rebuild</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function DemoBanner() {
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-amber-900 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-start gap-2">
        <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
        <p>
          <span className="font-semibold">Simulated data only.</span> SmartLoop currently operates using simulated
          data. No live campus meters or sensors are connected.
        </p>
      </div>
      <NavLink
        to="/about#limitations"
        className="shrink-0 pl-[22px] text-[10.5px] font-semibold text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950 sm:pl-0"
      >
        Data & limitations
      </NavLink>
    </div>
  );
}

function Footer() {
  const { dataset } = useData();
  return (
    <footer className="mt-10 flex flex-col gap-2 border-t border-line/80 pb-2 pt-5 text-[10.5px] leading-relaxed text-ink-400 sm:flex-row sm:items-center sm:justify-between">
      <p>
        SmartLoop · Green Skills &amp; Applied AI hackathon prototype. Not a live campus deployment.
      </p>
      <p className="font-mono">
        {dataset.days}-day simulation · {dataset.buildings.length} buildings · {dataset.rooms.length} monitored rooms
      </p>
    </footer>
  );
}

function Toast() {
  const { toast, dismissToast } = useData();
  if (!toast) return null;
  const Icon = toast.tone === "error" ? XCircle : toast.tone === "info" ? Info : CheckCircle2;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-4 z-50 w-[calc(100%-2rem)] max-w-sm animate-fade-up rounded-2xl border border-line bg-white p-3.5 shadow-lift sm:right-6"
    >
      <div className="flex items-start gap-2.5">
        <span
          className={clsx(
            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
            toast.tone === "error"
              ? "bg-rose-50 text-rose-600"
              : toast.tone === "info"
                ? "bg-sky-50 text-sky-600"
                : "bg-brand-50 text-brand-700",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-ink-900">{toast.title}</p>
          {toast.description ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismissToast}
          className="rounded p-1 text-ink-300 transition-colors hover:bg-ink-50 hover:text-ink-600"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { loading, error } = useData();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-canvas">
      {loading ? (
        <div className="fixed inset-x-0 top-0 z-[80] h-[3px] overflow-hidden bg-brand-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-500" />
        </div>
      ) : null}

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] border-r border-line bg-white lg:block">
        <SidebarContent />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-[286px] animate-fade-in border-r border-line bg-white shadow-lift">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-50 hover:text-ink-700"
              aria-label="Close navigation menu"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-screen flex-col lg:pl-[272px]">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main
          className={clsx(
            "mx-auto w-full max-w-[1500px] flex-1 px-4 transition-opacity duration-200 sm:px-6 lg:px-8",
            loading && "pointer-events-none opacity-60",
          )}
          aria-busy={loading}
        >
          <DemoBanner />
          {error ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}
          <div className="pt-5">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>

      {loading ? (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-[11px] font-medium text-ink-600 shadow-lift">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-r-transparent" />
          Generating simulated dataset…
        </div>
      ) : null}

      <Toast />
    </div>
  );
}
