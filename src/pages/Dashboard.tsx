import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CloudSun,
  Download,
  Fuel,
  Leaf,
  MapPin,
  Sparkles,
  Sun,
  TrendingUp,
  TriangleAlert,
  Users,
  Zap,
} from "lucide-react";
import { useData } from "@/state/DataContext";
import {
  aggregateDaily,
  computeTotals,
  getBuildingSummaries,
  getDeltaPct,
  getPreviousRangePoints,
  getRangePoints,
  getRoomStatusSummary,
} from "@/lib/analytics";
import { generateForecast } from "@/lib/forecasting";
import { getBuildingHourSeries } from "@/lib/analytics";
import { buildRecommendations } from "@/lib/recommendations";
import { SNAPSHOT_HOUR } from "@/lib/utils";
import {
  formatDayLabel,
  formatHour,
  formatNumber,
  formatPct,
  formatShortDate,
  pct,
  round,
} from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DemandBadge,
  EmptyState,
  InfoNote,
  PageHeader,
  Segmented,
  SeverityBadge,
  StatCard,
} from "@/components/ui";
import { AXIS_PROPS, CHART, ChartLegend, ChartTooltip, GRID_PROPS } from "@/components/charts";
import { RangeSelector, rangeLabel } from "@/components/RangeSelector";

function compact(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

const chartMargin = { top: 8, right: 8, left: -16, bottom: 0 };

export default function Dashboard() {
  const { dataset, rangeDays, acknowledge, isAcknowledged, notify } = useData();
  const [trendView, setTrendView] = useState<"daily" | "hourly">("daily");

  useEffect(() => {
    setTrendView(rangeDays === 1 ? "hourly" : "daily");
  }, [rangeDays]);

  const points = useMemo(() => getRangePoints(dataset, rangeDays), [dataset, rangeDays]);
  const daily = useMemo(() => aggregateDaily(points), [points]);
  const totals = useMemo(() => computeTotals(points), [points]);
  const previous = useMemo(() => computeTotals(getPreviousRangePoints(dataset, rangeDays)), [dataset, rangeDays]);
  const buildings = useMemo(() => getBuildingSummaries(dataset, rangeDays), [dataset, rangeDays]);
  const rooms = useMemo(() => getRoomStatusSummary(dataset.rooms), [dataset.rooms]);
  const forecast = useMemo(
    () => generateForecast(getBuildingHourSeries(dataset, "campus"), "campus", "Campus total", 24),
    [dataset],
  );

  const effectiveAlerts = useMemo(
    () =>
      dataset.alerts.map((alert) => ({
        ...alert,
        status: isAcknowledged(alert.id) ? ("acknowledged" as const) : ("active" as const),
      })),
    [dataset.alerts, isAcknowledged],
  );

  const recommendations = useMemo(
    () =>
      buildRecommendations({
        dataset,
        days: rangeDays,
        totals,
        alerts: effectiveAlerts,
        forecast,
      }),
    [dataset, rangeDays, totals, effectiveAlerts, forecast],
  );

  const activeAlerts = effectiveAlerts
    .filter((alert) => alert.status === "active")
    .sort((a, b) => b.detectedAt - a.detectedAt);

  const snapshot = useMemo(() => {
    return dataset.buildings
      .map((meta) => {
        const point = dataset.buildingHourly[meta.id].find(
          (p) => p.dayKey === dataset.anchorDate && p.hour === SNAPSHOT_HOUR,
        );
        return {
          meta,
          occupancy: point?.occupancyPct ?? 0,
          load: point?.loadKwh ?? 0,
          alerts: activeAlerts.filter((a) => a.buildingId === meta.id).length,
        };
      })
      .sort((a, b) => b.load - a.load);
  }, [dataset, activeAlerts]);

  const snapshotWeather = dataset.hourly.find(
    (p) => p.dayKey === dataset.anchorDate && p.hour === SNAPSHOT_HOUR,
  );

  const trendData = useMemo(() => {
    if (trendView === "hourly") {
      const count = Math.min(rangeDays * 24, 48);
      return points.slice(-count).map((point) => ({
        label: formatHour(point.hour),
        fullLabel: `${formatShortDate(point.timestamp)} · ${formatHour(point.hour)}`,
        subLabel: "Hourly simulated reading",
        loadKwh: round(point.loadKwh, 1),
        solarUsedKwh: round(point.solarUsedKwh, 1),
        gridKwh: round(point.gridKwh, 1),
      }));
    }
    return daily.map((day) => ({
      label: day.shortLabel,
      fullLabel: day.label,
      subLabel: day.isWeekend ? "Weekend · daily total" : "Weekday · daily total",
      loadKwh: day.loadKwh,
      solarUsedKwh: day.solarUsedKwh,
      gridKwh: day.gridKwh,
    }));
  }, [daily, points, rangeDays, trendView]);

  const mixData = [
    { name: "Solar (used)", value: totals.solarUsedKwh, color: CHART.amber },
    { name: "Grid import", value: totals.gridKwh, color: CHART.blue },
    { name: "Generator", value: totals.generatorKwh, color: CHART.gray },
  ].filter((item) => item.value > 0);

  const solarBars = daily.slice(-7).map((day) => ({
    label: day.shortLabel,
    fullLabel: day.label,
    solarUsedKwh: day.solarUsedKwh,
    gridKwh: day.gridKwh,
    generatorKwh: day.generatorKwh,
    solarKwh: day.solarKwh,
  }));

  const deltaLabel = rangeDays === 1 ? "vs previous day" : "vs previous period";
  const solarPoints = daily.map((d) => d.solarUsedKwh);
  const loadSpark = rangeDays === 1 ? points.map((p) => p.loadKwh) : daily.map((d) => d.loadKwh);
  const peakBuilding = buildings[0];
  const totalRooms = rooms.total;

  function exportDailyCsv() {
    const header = "date,day_type,total_kwh,solar_used_kwh,grid_kwh,generator_kwh,co2_kg,occupancy_pct";
    const rows = daily.map((day) =>
      [
        day.dayKey,
        day.isWeekend ? "weekend" : "weekday",
        day.loadKwh,
        day.solarUsedKwh,
        day.gridKwh,
        day.generatorKwh,
        day.co2Kg,
        day.occupancyPct,
      ].join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smartloop-simulated-${rangeDays}d-${dataset.seed}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify("CSV exported", `${daily.length} simulated day${daily.length === 1 ? "" : "s"} of data downloaded.`, "info");
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Campus overview"
        title="Energy command centre"
        description={`Simulated performance for ${rangeLabel(rangeDays)} across five campus buildings. Every value below is generated by the SmartLoop demo engine.`}
        actions={
          <>
            <RangeSelector />
            <Button icon={Download} onClick={exportDailyCsv} size="sm">
              Export CSV
            </Button>
          </>
        }
      />

      {points.length === 0 ? (
        <Card>
          <EmptyState
            icon={Zap}
            title="No consumption data"
            description="The selected range has no simulated readings. Regenerate the demo dataset or choose another period."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total energy consumption"
              value={formatNumber(totals.loadKwh)}
              unit="kWh"
              icon={Zap}
              delta={getDeltaPct(totals.loadKwh, previous.loadKwh)}
              deltaLabel={deltaLabel}
              footnote={`${Math.round(totals.loadKwh / (rangeDays * 24))} kWh/h average · peak ${Math.round(totals.peakKw)} kWh/h`}
              sparkline={loadSpark}
            />
            <StatCard
              label="Solar contribution"
              value={formatNumber(totals.solarUsedKwh)}
              unit="kWh"
              icon={Sun}
              accent="amber"
              delta={round(totals.solarSharePct - previous.solarSharePct, 1)}
              deltaLabel="vs previous period"
              deltaUnit="pts"
              footnote={`${formatPct(totals.solarSharePct)} of demand · ${formatNumber(totals.solarExcessKwh)} kWh unabsorbed`}
              sparkline={solarPoints}
            />
            <StatCard
              label="Backup generator"
              value={totals.generatorHours.toFixed(1)}
              unit="h runtime"
              icon={Fuel}
              accent="navy"
              delta={getDeltaPct(totals.generatorKwh, previous.generatorKwh)}
              deltaLabel={deltaLabel}
              footnote={`${formatNumber(totals.generatorKwh)} kWh generated in drills`}
              sparkline={daily.map((d) => d.generatorKwh)}
            />
            <StatCard
              label="Estimated CO₂ impact"
              value={formatNumber(totals.co2Kg)}
              unit="kg CO₂e"
              icon={CloudSun}
              accent="blue"
              delta={getDeltaPct(totals.co2Kg, previous.co2Kg)}
              deltaLabel={deltaLabel}
              footnote="Grid import × 0.71 kg CO₂e per kWh"
              sparkline={daily.map((d) => d.co2Kg)}
            />
          </div>

          {/* Trend + mix */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-8">
              <CardHeader
                icon={TrendingUp}
                title="Energy consumption trend"
                subtitle={
                  trendView === "daily"
                    ? `Daily demand across ${rangeLabel(rangeDays)} · solar and grid split`
                    : `Hourly demand for the final ${Math.min(rangeDays * 24, 48)} simulated hours`
                }
                action={
                  <Segmented
                    ariaLabel="Chart aggregation"
                    size="sm"
                    value={trendView}
                    onChange={setTrendView}
                    options={[
                      { value: "daily", label: "Daily" },
                      { value: "hourly", label: "Hourly" },
                    ]}
                  />
                }
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6">
                <ChartLegend
                  items={[
                    { label: "Total demand", color: CHART.green },
                    { label: "Solar used", color: CHART.amber },
                    { label: "Grid import", color: CHART.blue, dashed: true },
                  ]}
                />
                <span className="inline-flex items-center gap-1.5 text-[10.5px] text-ink-400">
                  <CalendarDays className="h-3 w-3" /> Peak {Math.round(totals.peakKw)} kWh/h ·{" "}
                  {new Date(totals.peakTimestamp).getUTCHours().toString().padStart(2, "0")}:00
                </span>
              </div>
              <div className="h-[286px] px-2 pt-3 sm:px-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={chartMargin}>
                    <defs>
                      <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.green} stopOpacity={0.18} />
                        <stop offset="100%" stopColor={CHART.green} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis
                      dataKey="label"
                      {...AXIS_PROPS}
                      minTickGap={26}
                      interval="preserveStartEnd"
                      tickMargin={8}
                    />
                    <YAxis {...AXIS_PROPS} width={48} tickFormatter={(v: number) => compact(v)} />
                    <Tooltip content={<ChartTooltip unit="kWh" />} cursor={{ stroke: CHART.ink, strokeOpacity: 0.12 }} />
                    <Area
                      type="monotone"
                      dataKey="loadKwh"
                      name="Total demand"
                      stroke={CHART.green}
                      strokeWidth={2}
                      fill="url(#loadFill)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="solarUsedKwh"
                      name="Solar used"
                      stroke={CHART.amber}
                      strokeWidth={1.8}
                      dot={false}
                      activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#fff" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="gridKwh"
                      name="Grid import"
                      stroke={CHART.blue}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#fff" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="border-t border-line/70 px-5 py-3 text-[10.5px] leading-relaxed text-ink-400 sm:px-6">
                Daily view aggregates the selected period. Hourly view shows up to 48 recent readings. Demand is total
                campus load; solar and grid lines show how that demand was served in the simulation.
              </p>
            </Card>

            <Card className="xl:col-span-4">
              <CardHeader
                icon={Leaf}
                title="Energy mix"
                subtitle={`Supply split for ${rangeLabel(rangeDays)}`}
              />
              <div className="relative mx-auto mt-1 h-[196px] w-full max-w-[270px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mixData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={84}
                      paddingAngle={2.5}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {mixData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip unit="kWh" />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-ink-400">Total</span>
                  <span className="num text-xl font-semibold tracking-[-0.02em] text-ink-900">
                    {formatNumber(totals.loadKwh)}
                  </span>
                  <span className="text-[10px] text-ink-400">kWh</span>
                </div>
              </div>
              <div className="mt-2 space-y-2 px-5 sm:px-6">
                {mixData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-[11.5px]">
                    <span className="flex items-center gap-2 text-ink-600">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="tabular text-ink-500">
                      <span className="font-semibold text-ink-800">{formatNumber(item.value)}</span> kWh ·{" "}
                      {formatPct(pct(item.value, totals.loadKwh))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mx-5 mt-4 rounded-lg bg-brand-50/70 px-3 py-2.5 text-[10.5px] leading-relaxed text-brand-900/70 ring-1 ring-inset ring-brand-100 sm:mx-6">
                <span className="font-semibold text-brand-900">{formatPct(totals.greenSharePct)}</span> of demand was
                served by solar plus the simulated generator. {formatNumber(totals.solarExcessKwh)} kWh of solar output
                had no matching campus load.
              </div>
              <div className="px-5 pb-5 pt-3 sm:px-6">
                <InfoNote>
                  Energy mix is calculated from simulated hourly supply. Solar is used on campus first; surplus is
                  treated as unabsorbed generation.
                </InfoNote>
              </div>
            </Card>
          </div>

          {/* Solar vs grid + snapshot */}
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-7">
              <CardHeader
                icon={Sun}
                title="Solar versus grid"
                subtitle="Daily supply comparison with solar generation potential"
                action={
                  <Badge tone="amber">
                    {formatPct(totals.solarSharePct)} solar share
                  </Badge>
                }
              />
              <div className="mt-3 px-5 sm:px-6">
                <ChartLegend
                  items={[
                    { label: "Solar used", color: CHART.amber },
                    { label: "Grid", color: CHART.blue },
                    { label: "Generator", color: CHART.gray },
                    { label: "Solar generated", color: "#a56c0f", dashed: true },
                  ]}
                />
              </div>
              <div className="h-[244px] px-2 pt-3 sm:px-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={solarBars} margin={{ ...chartMargin, bottom: 2 }}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis dataKey="label" {...AXIS_PROPS} tickMargin={8} minTickGap={8} />
                    <YAxis {...AXIS_PROPS} width={48} tickFormatter={(v: number) => compact(v)} />
                    <Tooltip content={<ChartTooltip unit="kWh" />} cursor={{ fill: "rgba(11,31,42,0.03)" }} />
                    <Bar dataKey="solarUsedKwh" name="Solar used" stackId="supply" fill={CHART.amber} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="gridKwh" name="Grid" stackId="supply" fill={CHART.blue} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="generatorKwh" name="Generator" stackId="supply" fill={CHART.gray} radius={[3, 3, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="solarKwh"
                      name="Solar generated"
                      stroke="#a56c0f"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="border-t border-line/70 px-5 py-3 text-[10.5px] leading-relaxed text-ink-400 sm:px-6">
                Last {solarBars.length} simulated days. The dashed line is total solar generation before self-consumption;
                the amber bar is the portion actually used by campus demand.
              </p>
            </Card>

            <Card className="xl:col-span-5">
              <CardHeader
                icon={Building2}
                title="Campus snapshot"
                subtitle={`Occupancy (% of scheduled peak) · ${String(SNAPSHOT_HOUR).padStart(2, "0")}:00 · ${snapshotWeather?.temperatureC ?? "—"}°C · ${snapshotWeather?.weather ?? "Simulated"}`}
                action={
                  <Link
                    to="/alerts"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Alerts <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />
              <div className="mt-3 space-y-3 px-5 sm:px-6">
                {snapshot.map(({ meta, occupancy, load, alerts }) => (
                  <div key={meta.id} className="group">
                    <div className="flex items-center justify-between gap-2 text-[11.5px]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                        <span className="truncate font-medium text-ink-700">{meta.name}</span>
                        {alerts > 0 ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                            <TriangleAlert className="h-2.5 w-2.5" /> {alerts}
                          </span>
                        ) : null}
                      </span>
                      <span className="num shrink-0 text-[10.5px] text-ink-400">
                        <span className="font-semibold text-ink-700">{Math.round(load)}</span> kWh/h ·{" "}
                        {Math.round(occupancy)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(3, occupancy)}%`,
                          backgroundColor: meta.color,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mx-5 mt-4 grid grid-cols-3 gap-2 sm:mx-6">
                <div className="rounded-lg bg-ink-50/80 px-2.5 py-2 text-center">
                  <p className="num text-sm font-semibold text-ink-800">{rooms.occupied}</p>
                  <p className="text-[9.5px] text-ink-400">Rooms in use</p>
                </div>
                <div className="rounded-lg bg-amber-50/80 px-2.5 py-2 text-center ring-1 ring-inset ring-amber-100">
                  <p className="num text-sm font-semibold text-amber-800">{rooms.unoccupiedWithLoad}</p>
                  <p className="text-[9.5px] text-amber-700/70">Idle with load</p>
                </div>
                <div className="rounded-lg bg-ink-50/80 px-2.5 py-2 text-center">
                  <p className="num text-sm font-semibold text-ink-800">{rooms.expectedContinuous}</p>
                  <p className="text-[9.5px] text-ink-400">Always-on areas</p>
                </div>
              </div>
              <p className="px-5 py-4 text-[10.5px] leading-relaxed text-ink-400 sm:px-6">
                {rooms.occupied} of {totalRooms} monitored rooms are occupied at the snapshot. Room-level telemetry is
                simulated; always-on areas are excluded from idle-room alerts.
              </p>
            </Card>
          </div>

          {/* Buildings + recommendations/alerts */}
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-8">
              <CardHeader
                icon={Building2}
                title="Building performance"
                subtitle={`Energy, intensity and occupancy across ${rangeLabel(rangeDays)}`}
                action={
                  <Link
                    to="/insights"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Compare <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />
              <div className="mt-4 overflow-x-auto px-1">
                <table className="w-full min-w-[620px] text-left text-[11.5px]">
                  <thead>
                    <tr className="border-y border-line bg-ink-50/50 text-[10px] uppercase tracking-[0.08em] text-ink-400">
                      <th className="px-5 py-2.5 font-medium sm:px-6">Building</th>
                      <th className="px-3 py-2.5 text-right font-medium">Energy</th>
                      <th className="px-3 py-2.5 font-medium">Share</th>
                      <th className="px-3 py-2.5 text-right font-medium">kWh/m²</th>
                      <th className="px-3 py-2.5 font-medium">Occupancy</th>
                      <th className="px-5 py-2.5 text-right font-medium sm:px-6">Alerts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildings.map((building) => (
                      <tr key={building.meta.id} className="border-b border-line/60 last:border-0 hover:bg-ink-50/30">
                        <td className="py-3 pl-5 pr-3 sm:pl-6">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-7 w-1 shrink-0 rounded-full"
                              style={{ backgroundColor: building.meta.color }}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink-800">{building.meta.name}</p>
                              <p className="truncate text-[10px] text-ink-400">{building.meta.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="num px-3 py-3 text-right">
                          <p className="font-medium text-ink-800">{formatNumber(building.totalKwh)} kWh</p>
                          <p className="text-[10px] text-ink-400">
                            {building.deltaPct === null
                              ? "—"
                              : `${building.deltaPct > 0 ? "+" : ""}${building.deltaPct}% vs prev`}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${building.sharePct}%`, backgroundColor: building.meta.color }}
                              />
                            </div>
                            <span className="num text-[10.5px] text-ink-500">{building.sharePct}%</span>
                          </div>
                        </td>
                        <td className="num px-3 py-3 text-right text-ink-600">{building.intensityKwhPerM2}</td>
                        <td className="px-3 py-3">
                          <Badge
                            tone={
                              building.occupancyLabel === "In use"
                                ? "green"
                                : building.occupancyLabel === "Partially used"
                                  ? "amber"
                                  : "neutral"
                            }
                            dot
                          >
                            {building.occupancyLabel} · {Math.round(building.occupancyPct)}%
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right sm:px-6">
                          {building.activeAlerts > 0 ? (
                            <Link
                              to="/alerts"
                              className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100"
                            >
                              {building.activeAlerts} active
                            </Link>
                          ) : (
                            <span className="text-[10px] text-ink-400">Clear</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-5 py-3 sm:px-6">
                <p className="text-[10.5px] text-ink-400">
                  Highest energy use: <span className="font-medium text-ink-600">{peakBuilding?.meta.name}</span> ·{" "}
                  {peakBuilding?.sharePct}% of campus demand
                </p>
                <Link
                  to="/insights"
                  className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand-700 hover:text-brand-800"
                >
                  Open analytics <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>

            <div className="space-y-4 xl:col-span-4">
              <Card>
                <CardHeader
                  icon={Sparkles}
                  title="Recommended actions"
                  subtitle="Generated from the current demo data"
                  action={
                    <Link
                      to="/insights#recommendations"
                      className="text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                    >
                      All
                    </Link>
                  }
                />
                <div className="mt-3 space-y-2.5 px-5 pb-5 sm:px-6">
                  {recommendations.slice(0, 2).map((rec) => (
                    <Link
                      key={rec.id}
                      to="/insights#recommendations"
                      className="block rounded-xl border border-line bg-white p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={rec.priority === "High" ? "amber" : rec.priority === "Medium" ? "blue" : "neutral"}>
                          {rec.priority} priority
                        </Badge>
                        {rec.impactKwhPerWeek > 0 ? (
                          <span className="text-[9.5px] text-ink-400">≈ {rec.impactKwhPerWeek} kWh/wk*</span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[12px] font-semibold leading-snug text-ink-800">{rec.title}</p>
                      <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-ink-500">{rec.description}</p>
                    </Link>
                  ))}
                  <p className="text-[9.5px] leading-relaxed text-ink-400">
                    *Illustrative weekly opportunity if the pattern repeats, not a verified saving.
                  </p>
                </div>
              </Card>

              <Card>
                <CardHeader
                  icon={TriangleAlert}
                  title="Latest active alerts"
                  subtitle={`${activeAlerts.length} open in this demo session`}
                  action={
                    <Link to="/alerts" className="text-[11px] font-semibold text-brand-700 hover:text-brand-800">
                      View all
                    </Link>
                  }
                />
                <div className="mt-3 divide-y divide-line/70 px-5 pb-2 sm:px-6">
                  {activeAlerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-2.5 py-2.5">
                      <span className="mt-0.5">
                        <SeverityBadge severity={alert.severity} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-medium text-ink-800">{alert.room}</p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-ink-400">
                          {alert.occupancy === "—" ? "Whole building" : alert.occupancy} · {alert.powerKw} kW
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => acknowledge(alert.id)}
                        className="shrink-0 rounded-md px-1.5 py-1 text-[9.5px] font-semibold text-ink-400 hover:bg-ink-50 hover:text-ink-700"
                        aria-label={`Acknowledge alert for ${alert.room}`}
                      >
                        Ack
                      </button>
                    </div>
                  ))}
                  {activeAlerts.length === 0 ? (
                    <p className="py-6 text-center text-[11px] text-ink-400">No active alerts. The demo is clear.</p>
                  ) : null}
                </div>
                <div className="px-5 pb-4 pt-1 sm:px-6">
                  <Link
                    to="/forecast"
                    className="flex items-center justify-between rounded-lg bg-ink-50/80 px-3 py-2 text-[10.5px] text-ink-600 transition-colors hover:bg-ink-100/70"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3 text-brand-600" />
                      Next hour forecast: <span className="font-semibold text-ink-800">{Math.round(forecast.nextHour.kwh)} kWh</span>
                    </span>
                    <DemandBadge demandClass={forecast.nextHour.demandClass} />
                  </Link>
                </div>
              </Card>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-line bg-white/60 px-4 py-3 text-[10.5px] leading-relaxed text-ink-400 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Hypothetical campus · {dataset.buildings.length} buildings ·{" "}
              {totalRooms} rooms · snapshot {formatDayLabel(dataset.anchorDate)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3 w-3" /> Average simulated occupancy {formatPct(totals.avgOccupancyPct)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
