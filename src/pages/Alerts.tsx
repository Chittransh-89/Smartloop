import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BellOff,
  Check,
  CheckCheck,
  Clipboard,
  ClipboardCheck,
  Filter,
  Gauge,
  Lightbulb,
  Power,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { useData } from "@/state/DataContext";
import type { BuildingId, EnergyAlert, Severity } from "@/lib/types";
import { computeTotals, getBuildingHourSeries, getRangePoints, getRoomStatusSummary } from "@/lib/analytics";
import { buildRecommendations } from "@/lib/recommendations";
import { generateForecast } from "@/lib/forecasting";
import {
  formatDateTime,
  formatKwh,
  formatNumber,
  formatShortDate,
  severityRank,
} from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  InfoNote,
  PageHeader,
  Segmented,
  SeverityBadge,
} from "@/components/ui";

const SEVERITIES: { value: "all" | Severity; label: string }[] = [
  { value: "all", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function relativeDay(anchor: string, ts: number): string {
  const dayKey = new Date(ts).toISOString().slice(0, 10);
  const anchorDate = new Date(`${anchor}T00:00:00Z`).getTime();
  const tsDate = new Date(`${dayKey}T00:00:00Z`).getTime();
  const diff = Math.round((anchorDate - tsDate) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatShortDate(ts);
}

export default function Alerts() {
  const { dataset, isAcknowledged, acknowledge, acknowledgeMany, notify, regenerate } = useData();
  const [severity, setSeverity] = useState<"all" | Severity>("all");
  const [building, setBuilding] = useState<"all" | BuildingId>("all");
  const [status, setStatus] = useState<"all" | "active" | "acknowledged">("all");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"recent" | "severity">("recent");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const alerts: EnergyAlert[] = useMemo(
    () =>
      dataset.alerts.map((alert) => ({
        ...alert,
        status: isAcknowledged(alert.id) ? "acknowledged" : "active",
      })),
    [dataset.alerts, isAcknowledged],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = alerts.filter((alert) => {
      if (severity !== "all" && alert.severity !== severity) return false;
      if (building !== "all" && alert.buildingId !== building) return false;
      if (status !== "all" && alert.status !== status) return false;
      if (q) {
        const haystack = `${alert.room} ${alert.buildingId} ${alert.reason} ${alert.equipment} ${alert.rule}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return result.sort((a, b) => {
      if (sortMode === "severity") {
        const severityDiff = severityRank(b.severity) - severityRank(a.severity);
        if (severityDiff !== 0) return severityDiff;
      }
      return b.detectedAt - a.detectedAt;
    });
  }, [alerts, severity, building, status, query, sortMode]);

  const activeAlerts = alerts.filter((alert) => alert.status === "active");
  const visibleActive = filtered.filter((alert) => alert.status === "active");
  const highPriority = activeAlerts.filter(
    (alert) => alert.severity === "critical" || alert.severity === "high",
  );
  const wasteKwh = activeAlerts.reduce((acc, alert) => acc + alert.wastedKwh, 0);
  const rooms = getRoomStatusSummary(dataset.rooms);
  const severityCounts = useMemo(
    () =>
      alerts.reduce(
        (acc, alert) => {
          acc[alert.severity] += 1;
          return acc;
        },
        { critical: 0, high: 0, medium: 0, low: 0 } as Record<Severity, number>,
      ),
    [alerts],
  );

  const forecast = useMemo(
    () => generateForecast(getBuildingHourSeries(dataset, "campus"), "campus", "Campus total", 24),
    [dataset],
  );
  const totals = useMemo(() => computeTotals(getRangePoints(dataset, 7)), [dataset]);
  const recommendations = useMemo(
    () => buildRecommendations({ dataset, days: 7, totals, alerts, forecast }),
    [dataset, totals, alerts, forecast],
  );

  const filtersActive = severity !== "all" || building !== "all" || status !== "all" || query.trim() !== "";

  function clearFilters() {
    setSeverity("all");
    setBuilding("all");
    setStatus("all");
    setQuery("");
  }

  async function copyAlert(alert: EnergyAlert) {
    const text = [
      `SmartLoop alert · ${alert.severity.toUpperCase()}`,
      `${alert.room} (${alert.buildingId}) · detected ${formatDateTime(alert.detectedAt)}`,
      `Occupancy: ${alert.occupancy}`,
      `Equipment: ${alert.equipment}`,
      `Power: ${alert.powerKw} kW for ~${alert.durationHours} h`,
      `Estimated energy: ${alert.wastedKwh} kWh`,
      `Rule: ${alert.rule}`,
      `Reason: ${alert.reason}`,
      `Recommended action: ${alert.action}`,
      "Simulated data — not a live campus measurement.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(alert.id);
      window.setTimeout(() => setCopiedId(null), 1800);
      notify("Alert copied", "The alert details were copied as text.", "info");
    } catch {
      notify("Copy unavailable", "The browser blocked clipboard access. Select the text manually instead.", "error");
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Waste detection"
        title="Waste & anomaly alerts"
        description="Transparent rule-based checks flag rooms that are unoccupied while equipment is still drawing power, plus building loads above their usual baseline."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={CheckCheck}
            disabled={visibleActive.length === 0}
            onClick={() => acknowledgeMany(visibleActive.map((alert) => alert.id))}
          >
            Acknowledge {visibleActive.length > 0 ? `${visibleActive.length} visible` : "all"}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-ink-500">Active alerts</p>
            <BellOff className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink-900">{activeAlerts.length}</p>
          <p className="mt-1 text-[10px] text-ink-400">Require attention in this demo session</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-ink-500">Critical + high</p>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink-900">{highPriority.length}</p>
          <p className="mt-1 text-[10px] text-ink-400">Highest-priority open items</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-ink-500">Identified idle energy</p>
            <Power className="h-4 w-4 text-brand-600" />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink-900">{formatNumber(wasteKwh, 1)}</p>
          <p className="mt-1 text-[10px] text-ink-400">kWh already consumed in flagged rooms</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-ink-500">Idle rooms with load</p>
            <Gauge className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink-900">{rooms.unoccupiedWithLoad}</p>
          <p className="mt-1 text-[10px] text-ink-400">At the 14:00 simulated snapshot</p>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-8">
          <Card>
            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex w-full flex-wrap items-center gap-1.5">
                    <Filter className="mr-1 h-3.5 w-3.5 text-ink-400" />
                    {SEVERITIES.map((option) => {
                      const active = severity === option.value;
                      const count =
                        option.value === "all"
                          ? alerts.length
                          : severityCounts[option.value as Severity];
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSeverity(option.value)}
                          aria-pressed={active}
                          className={
                            active
                              ? "inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1.5 text-[10.5px] font-semibold text-white"
                              : "inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-[10.5px] font-medium text-ink-500 hover:border-ink-200 hover:text-ink-800"
                          }
                        >
                          {option.label}
                          <span className={active ? "text-white/60" : "text-ink-400"}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Segmented
                    ariaLabel="Sort alerts"
                    size="sm"
                    value={sortMode}
                    onChange={setSortMode}
                    options={[
                      { value: "recent", label: "Newest" },
                      { value: "severity", label: "Severity" },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search room, reason or rule…"
                      aria-label="Search alerts"
                      className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-8 text-[12px] text-ink-800 placeholder:text-ink-400 focus:border-brand-400"
                    />
                    {query ? (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                        aria-label="Clear search"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <label className="sr-only" htmlFor="alert-building">
                      Filter by building
                    </label>
                    <select
                      id="alert-building"
                      value={building}
                      onChange={(event) => setBuilding(event.target.value as "all" | BuildingId)}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 text-[11.5px] font-medium text-ink-600 sm:w-40"
                    >
                      <option value="all">All buildings</option>
                      {dataset.buildings.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.short}
                        </option>
                      ))}
                    </select>
                    <label className="sr-only" htmlFor="alert-status">
                      Filter by status
                    </label>
                    <select
                      id="alert-status"
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value as "all" | "active" | "acknowledged")
                      }
                      className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 text-[11.5px] font-medium text-ink-600 sm:w-36"
                    >
                      <option value="all">Any status</option>
                      <option value="active">Active</option>
                      <option value="acknowledged">Acknowledged</option>
                    </select>
                    {filtersActive ? (
                      <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-line/70 bg-ink-50/30 px-5 py-2 text-[10.5px] text-ink-500">
              <span>
                Showing <span className="font-semibold text-ink-700">{filtered.length}</span> of {alerts.length} simulated
                alerts
              </span>
              <span className="hidden items-center gap-1 sm:inline-flex">
                <SlidersHorizontal className="h-3 w-3" /> Filters update instantly
              </span>
            </div>
          </Card>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={BellOff}
                title="No alerts match these filters"
                description={
                  alerts.length === 0
                    ? "The simulated campus is currently clear. Regenerate the demo dataset to explore a different scenario."
                    : "Try clearing the search or widening the severity, building or status filters."
                }
                action={
                  alerts.length === 0 ? (
                    <Button onClick={regenerate} icon={Sparkles}>
                      Generate a new dataset
                    </Button>
                  ) : (
                    <Button onClick={clearFilters} icon={Filter}>
                      Clear all filters
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((alert) => {
                const meta = dataset.buildings.find((b) => b.id === alert.buildingId);
                const acknowledged = alert.status === "acknowledged";
                return (
                  <Card
                    key={alert.id}
                    className="relative overflow-hidden transition-shadow duration-150 hover:shadow-lift"
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-1"
                      style={{
                        backgroundColor:
                          alert.severity === "critical"
                            ? "#e11d48"
                            : alert.severity === "high"
                              ? "#d99a2b"
                              : alert.severity === "medium"
                                ? "#256c9e"
                                : "#9bafba",
                      }}
                    />
                    <div className="p-4 pl-5 sm:p-5 sm:pl-6">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <SeverityBadge severity={alert.severity} />
                          <Badge tone="outline">{meta?.short ?? alert.buildingId}</Badge>
                          <Badge tone="neutral">{alert.rule}</Badge>
                          {alert.source === "room" ? (
                            <Badge tone="violet">Room rule</Badge>
                          ) : (
                            <Badge tone="blue">Building rule</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-ink-400">
                            {relativeDay(dataset.anchorDate, alert.detectedAt)} ·{" "}
                            {new Date(alert.detectedAt).getUTCHours().toString().padStart(2, "0")}:
                            {new Date(alert.detectedAt).getUTCMinutes().toString().padStart(2, "0")}
                          </span>
                          {acknowledged ? (
                            <Badge tone="green">
                              <Check className="h-2.5 w-2.5" /> Acknowledged
                            </Badge>
                          ) : (
                            <Badge tone="red" dot>
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>

                      <h3 className="mt-2.5 text-[14px] font-semibold tracking-[-0.01em] text-ink-900">
                        {alert.room}
                      </h3>

                      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-lg bg-ink-50/70 px-2.5 py-2">
                          <p className="text-[9px] uppercase tracking-wide text-ink-400">Occupancy</p>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-ink-700">{alert.occupancy}</p>
                        </div>
                        <div className="rounded-lg bg-ink-50/70 px-2.5 py-2">
                          <p className="text-[9px] uppercase tracking-wide text-ink-400">Load</p>
                          <p className="num mt-0.5 text-[11px] font-medium text-ink-700">
                            {alert.powerKw} kW · {alert.durationHours} h
                          </p>
                        </div>
                        <div className="rounded-lg bg-ink-50/70 px-2.5 py-2">
                          <p className="text-[9px] uppercase tracking-wide text-ink-400">Energy</p>
                          <p className="num mt-0.5 text-[11px] font-medium text-ink-700">
                            {formatKwh(alert.wastedKwh, 1)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-ink-50/70 px-2.5 py-2">
                          <p className="text-[9px] uppercase tracking-wide text-ink-400">Equipment</p>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-ink-700" title={alert.equipment}>
                            {alert.equipment}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 text-[11px] leading-relaxed">
                        <p className="text-ink-600">
                          <span className="font-semibold text-ink-800">Why it triggered: </span>
                          {alert.reason}
                        </p>
                        <div className="flex gap-2 rounded-lg border border-brand-100 bg-brand-50/60 px-2.5 py-2 text-brand-900">
                          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                          <p>
                            <span className="font-semibold">Recommended action: </span>
                            {alert.action}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3">
                        <p className="text-[9.5px] text-ink-400">
                          Detected {formatDateTime(alert.detectedAt)} · simulated telemetry
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={copiedId === alert.id ? ClipboardCheck : Clipboard}
                            onClick={() => copyAlert(alert)}
                          >
                            {copiedId === alert.id ? "Copied" : "Copy"}
                          </Button>
                          {!acknowledged ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={Check}
                              onClick={() => acknowledge(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-[10.5px] font-medium text-brand-800">
                              <Check className="h-3 w-3" /> Handled in demo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4 xl:col-span-4">
          <Card>
            <CardHeader
              icon={ShieldAlert}
              title="How alerts are generated"
              subtitle="Rules, not a black box"
              action={<Badge tone="green">Transparent</Badge>}
            />
            <div className="space-y-3 px-5 pb-5 pt-4 sm:px-6">
              <div className="rounded-xl border border-line bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] font-semibold text-ink-800">R-01 · Idle room load</p>
                  <Badge tone="violet">Room level</Badge>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-ink-500">
                  Flags a room when occupancy is <span className="font-medium">Unoccupied</span> or{" "}
                  <span className="font-medium">Scheduled vacant</span>, equipment is ON, and the circuit is drawing
                  above its idle threshold. Always-on areas (servers, records, utilities) are excluded.
                </p>
                <p className="mt-1.5 text-[9.5px] text-ink-400">
                  Severity scales with power draw: ≥3 kW critical · ≥1.5 kW high · ≥0.7 kW medium · otherwise low.
                </p>
              </div>
              <div className="rounded-xl border border-line bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11.5px] font-semibold text-ink-800">R-02 · Above-baseline use</p>
                  <Badge tone="blue">Building level</Badge>
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-ink-500">
                  Compares each hour with the same hour and day type over the preceding three weeks. A load at least 18%
                  above baseline becomes an alert; larger excess loads rank higher.
                </p>
              </div>
              <div className="rounded-xl border border-dashed border-line bg-ink-50/60 p-3">
                <p className="text-[10px] leading-relaxed text-ink-500">
                  <span className="font-semibold text-ink-700">Honest scope:</span> these are deterministic, explainable
                  rules. SmartLoop does not claim a trained anomaly-detection model or real campus accuracy.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={Sparkles}
              title="Response priorities"
              subtitle="From active alerts and forecast"
              action={
                <Link to="/insights#recommendations" className="text-[11px] font-semibold text-brand-700">
                  All
                </Link>
              }
            />
            <div className="space-y-2.5 px-5 pb-5 pt-4 sm:px-6">
              {recommendations.slice(0, 3).map((rec) => (
                <div key={rec.id} className="rounded-lg border border-line p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={rec.priority === "High" ? "amber" : rec.priority === "Medium" ? "blue" : "neutral"}>
                      {rec.priority}
                    </Badge>
                    {rec.impactKwhPerWeek > 0 ? (
                      <span className="text-[9px] text-ink-400">≈ {rec.impactKwhPerWeek} kWh/wk*</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] font-semibold leading-snug text-ink-800">{rec.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-ink-500">{rec.description}</p>
                </div>
              ))}
              <InfoNote>
                *Illustrative weekly opportunity if the simulated pattern repeats. Not a verified saving.
              </InfoNote>
            </div>
          </Card>

          <Card className="bg-ink-900 text-white">
            <div className="p-5">
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 text-amber-300" />
                <p className="text-[12px] font-semibold">Demo walkthrough</p>
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-white/60">
                At the 14:00 simulated snapshot, the cafeterias, labs and library have closed for lunch or maintenance,
                yet equipment is still drawing power. Acknowledge a critical alert to see it move into the handled log.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/5 px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-wide text-white/40">Open critical</p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {activeAlerts.filter((a) => a.severity === "critical").length}
                  </p>
                </div>
                <div className="rounded-lg bg-white/5 px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-wide text-white/40">Open high</p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {activeAlerts.filter((a) => a.severity === "high").length}
                  </p>
                </div>
              </div>
              <Link
                to="/forecast"
                className="mt-3 flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-[10.5px] font-medium text-white/80 transition-colors hover:bg-white/20"
              >
                See what demand is coming next
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
