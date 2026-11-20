import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarRange,
  CheckCircle2,
  Flame,
  Leaf,
  Lightbulb,
  Moon,
  Printer,
  Sun,
  Target,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { useData } from "@/state/DataContext";
import {
  aggregateDaily,
  computeTotals,
  getBuildingHourSeries,
  getBuildingSummaries,
  getDeltaPct,
  getPreviousRangePoints,
  getRangePoints,
  getZoneComparisons,
} from "@/lib/analytics";
import { buildRecommendations } from "@/lib/recommendations";
import { generateForecast } from "@/lib/forecasting";
import type { BuildingId } from "@/lib/types";
import {
  formatDayShort,
  formatNumber,
  formatPct,
  formatShortDate,
  pct,
  round,
  weekdayShort,
} from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  InfoNote,
  PageHeader,
  SectionTitle,
  Segmented,
  StatCard,
} from "@/components/ui";
import { AXIS_PROPS, CHART, ChartLegend, ChartTooltip, GRID_PROPS } from "@/components/charts";
import { RangeSelector, rangeLabel } from "@/components/RangeSelector";

function compact(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

export default function Insights() {
  const { dataset, rangeDays, isAcknowledged, notify, regenerate } = useData();
  const [comparisonMetric, setComparisonMetric] = useState<"total" | "intensity">("total");
  const [heatmapBuilding, setHeatmapBuilding] = useState<BuildingId | "campus">("campus");

  const points = useMemo(() => getRangePoints(dataset, rangeDays), [dataset, rangeDays]);
  const daily = useMemo(() => aggregateDaily(points), [points]);
  const totals = useMemo(() => computeTotals(points), [points]);
  const previous = useMemo(() => computeTotals(getPreviousRangePoints(dataset, rangeDays)), [dataset, rangeDays]);
  const buildings = useMemo(() => getBuildingSummaries(dataset, rangeDays), [dataset, rangeDays]);
  const zones = useMemo(() => getZoneComparisons(dataset, rangeDays), [dataset, rangeDays]);

  const effectiveAlerts = useMemo(
    () =>
      dataset.alerts.map((alert) => ({
        ...alert,
        status: isAcknowledged(alert.id) ? ("acknowledged" as const) : alert.status,
      })),
    [dataset.alerts, isAcknowledged],
  );

  const forecast = useMemo(
    () => generateForecast(getBuildingHourSeries(dataset, "campus"), "campus", "Campus total", 24),
    [dataset],
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

  const comparisonData = buildings.map((building) => ({
    id: building.meta.id,
    name: building.meta.short,
    fullLabel: building.meta.name,
    subLabel: building.meta.category,
    value:
      comparisonMetric === "total"
        ? building.totalKwh
        : building.intensityKwhPerM2,
    sharePct: building.sharePct,
    color: building.meta.color,
  }));

  const solarData = daily.map((day) => ({
    label: day.shortLabel,
    fullLabel: day.label,
    subLabel: day.isWeekend ? "Weekend · simulated daily total" : "Weekday · simulated daily total",
    solarUsedKwh: day.solarUsedKwh,
    solarSharePct: round(pct(day.solarUsedKwh, day.loadKwh), 1),
    loadKwh: day.loadKwh,
  }));

  const maxSolarShare = Math.max(1, ...solarData.map((day) => day.solarSharePct));
  const solarShareDomainMax = Math.max(25, Math.ceil((maxSolarShare + 8) / 10) * 10);

  const bestSolarDay = [...daily].sort((a, b) => b.solarUsedKwh - a.solarUsedKwh)[0];
  const worstSolarDay = [...daily].sort((a, b) => a.solarUsedKwh - b.solarUsedKwh)[0];

  const heatmap = useMemo(() => {
    const series = getBuildingHourSeries(dataset, heatmapBuilding).slice(-14 * 24);
    const days = Array.from(new Set(series.map((point) => point.dayKey)));
    const max = Math.max(...series.map((point) => point.loadKwh));
    const min = Math.min(...series.map((point) => point.loadKwh));
    const rows = days.map((dayKey) => {
      const dayPoints = series.filter((point) => point.dayKey === dayKey);
      return {
        dayKey,
        label: `${weekdayShort(dayKey)} ${formatDayShort(dayKey)}`,
        cells: Array.from({ length: 24 }, (_, hour) => {
          const point = dayPoints.find((p) => p.hour === hour);
          return {
            hour,
            kwh: point?.loadKwh ?? 0,
            occupancyPct: point?.occupancyPct ?? 0,
          };
        }),
      };
    });
    return { rows, max, min };
  }, [dataset, heatmapBuilding]);

  const profile = useMemo(() => {
    const recent = dataset.hourly.slice(-14 * 24);
    return Array.from({ length: 24 }, (_, hour) => {
      const atHour = recent.filter((point) => point.hour === hour);
      const weekday = atHour.filter((point) => !["Sat", "Sun"].includes(weekdayShort(point.dayKey)));
      const weekend = atHour.filter((point) => ["Sat", "Sun"].includes(weekdayShort(point.dayKey)));
      return {
        label: `${String(hour).padStart(2, "0")}:00`,
        fullLabel: `${String(hour).padStart(2, "0")}:00 · average hourly demand`,
        subLabel: "Last 14 simulated days",
        weekday: weekday.length ? round(weekday.reduce((a, p) => a + p.loadKwh, 0) / weekday.length, 1) : 0,
        weekend: weekend.length ? round(weekend.reduce((a, p) => a + p.loadKwh, 0) / weekend.length, 1) : 0,
      };
    });
  }, [dataset]);

  const wasteByBuilding = buildings
    .map((building) => {
      const alerts = dataset.alerts.filter((alert) => alert.buildingId === building.meta.id);
      const waste = round(alerts.reduce((acc, alert) => acc + alert.wastedKwh, 0), 1);
      return {
        building,
        alerts,
        waste,
        critical: alerts.filter((a) => a.severity === "critical").length,
      };
    })
    .sort((a, b) => b.waste - a.waste);

  const totalFlaggedWaste = round(wasteByBuilding.reduce((acc, row) => acc + row.waste, 0), 1);
  const maxWaste = Math.max(1, ...wasteByBuilding.map((row) => row.waste));
  const intensityLeader = [...buildings].sort((a, b) => b.intensityKwhPerM2 - a.intensityKwhPerM2)[0];
  const intensityAverage =
    buildings.reduce((acc, b) => acc + b.intensityKwhPerM2, 0) / Math.max(1, buildings.length);
  const intensityDelta =
    intensityLeader && intensityAverage
      ? round(((intensityLeader.intensityKwhPerM2 - intensityAverage) / intensityAverage) * 100, 0)
      : 0;

  const avgDaily = totals.loadKwh / Math.max(1, rangeDays);
  const prevAvgDaily = previous.loadKwh / Math.max(1, rangeDays);
  const co2Avoided = round(totals.solarUsedKwh * dataset.emissionFactorKgPerKwh, 0);

  const activeAlerts = effectiveAlerts.filter((alert) => alert.status === "active");

  const summaryInsights = [
    {
      icon: Sun,
      tone: "amber" as const,
      title: `Solar supplied ${formatPct(totals.solarSharePct)} of demand`,
      body:
        totals.solarSharePct > 0
          ? `Solar covered ${formatNumber(totals.solarUsedKwh)} kWh in ${rangeLabel(rangeDays)}. The strongest day was ${bestSolarDay ? formatShortDate(bestSolarDay.timestamp) : "—"} at ${formatNumber(bestSolarDay?.solarUsedKwh ?? 0)} kWh; the weakest was ${worstSolarDay ? formatShortDate(worstSolarDay.timestamp) : "—"}.`
          : "No solar contribution was recorded in this period.",
    },
    {
      icon: Flame,
      tone: "blue" as const,
      title: `${intensityLeader?.meta.name ?? "Campus"} has the highest energy intensity`,
      body: `${intensityLeader?.intensityKwhPerM2 ?? 0} kWh/m² versus a five-building average of ${round(intensityAverage, 2)} kWh/m² — about ${intensityDelta}% above average in ${rangeLabel(rangeDays)}.`,
    },
    {
      icon: Activity,
      tone: "green" as const,
      title: `Weekday demand averages ${Math.round(profile.slice(9, 17).reduce((a, p) => a + p.weekday, 0) / 8)} kWh/h`,
      body: `In daytime hours, weekend demand averages ${Math.round(profile.slice(9, 17).reduce((a, p) => a + p.weekend, 0) / 8)} kWh/h. Occupied-hour demand is ${zones.occupancyDeltaPct}% higher than quiet-hour demand, so occupancy remains the strongest driver.`,
    },
    {
      icon: TriangleAlert,
      tone: "red" as const,
      title: `${formatNumber(totalFlaggedWaste, 1)} kWh of idle energy flagged`,
      body: `${dataset.alerts.length} simulated alert events across ${wasteByBuilding.filter((r) => r.alerts.length > 0).length} buildings. ${activeAlerts.length} remain active after any acknowledgements in this session; the rest are historical examples.`,
    },
  ];

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Analytics"
        title="Campus energy insights"
        description={`Patterns, building comparisons and transparent waste signals for ${rangeLabel(rangeDays)}. All output is derived from the simulated demo dataset.`}
        actions={
          <>
            <RangeSelector />
            <Button
              size="sm"
              icon={Printer}
              onClick={() => {
                notify("Opening print view", "Choose “Save as PDF” to export this analytics view.", "info");
                window.setTimeout(() => window.print(), 250);
              }}
            >
              Print / PDF
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Average daily demand"
          value={formatNumber(avgDaily)}
          unit="kWh/day"
          icon={CalendarRange}
          delta={getDeltaPct(avgDaily, prevAvgDaily)}
          deltaLabel={rangeDays === 1 ? "vs previous day" : "vs previous period"}
          footnote={`Peak ${Math.round(totals.peakKw)} kWh/h · ${formatPct(totals.avgOccupancyPct)} average occupancy`}
          sparkline={daily.map((d) => d.loadKwh)}
        />
        <StatCard
          label="Solar contribution"
          value={totals.solarSharePct.toFixed(1)}
          unit="% of demand"
          icon={Sun}
          accent="amber"
          delta={round(totals.solarSharePct - previous.solarSharePct, 1)}
          deltaLabel="vs previous period"
          deltaUnit="pts"
          footnote={`${formatNumber(totals.solarUsedKwh)} kWh used · ${formatNumber(totals.solarExcessKwh)} kWh unabsorbed`}
          sparkline={daily.map((d) => d.solarUsedKwh)}
        />
        <StatCard
          label="CO₂ avoided by solar"
          value={formatNumber(co2Avoided)}
          unit="kg CO₂e"
          icon={Leaf}
          accent="blue"
          footnote="Illustrative: solar kWh × 0.71 kg CO₂e/kWh grid factor"
        />
        <StatCard
          label="Idle energy flagged"
          value={formatNumber(totalFlaggedWaste, 1)}
          unit="kWh"
          icon={TriangleAlert}
          accent="navy"
          footnote={`${dataset.alerts.length} alert events · ${activeAlerts.length} still active this session`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader
            icon={Building2}
            title="Building comparison"
            subtitle={
              comparisonMetric === "total"
                ? `Total consumption · ${rangeLabel(rangeDays)}`
                : `Energy intensity per floor area · ${rangeLabel(rangeDays)}`
            }
            action={
              <Segmented
                ariaLabel="Building comparison metric"
                size="sm"
                value={comparisonMetric}
                onChange={setComparisonMetric}
                options={[
                  { value: "total", label: "Total kWh" },
                  { value: "intensity", label: "kWh/m²" },
                ]}
              />
            }
          />
          <div className="h-[278px] px-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                layout="vertical"
                margin={{ top: 0, right: 34, left: 8, bottom: 0 }}
                barCategoryGap="26%"
              >
                <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
                <XAxis
                  type="number"
                  {...AXIS_PROPS}
                  tickFormatter={(value: number) => compact(value)}
                  width={46}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...AXIS_PROPS}
                  width={68}
                  tick={{ fill: CHART.ink, fontSize: 11 }}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      unit={comparisonMetric === "total" ? "kWh" : "kWh/m²"}
                      decimals={comparisonMetric === "total" ? 0 : 2}
                    />
                  }
                  cursor={{ fill: "rgba(11,31,42,0.03)" }}
                />
                <Bar dataKey="value" name={comparisonMetric === "total" ? "Consumption" : "Intensity"} radius={[0, 4, 4, 0]} barSize={22}>
                  {comparisonData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-5 py-3 text-[10.5px] text-ink-400 sm:px-6">
            <span>
              Highest intensity: <span className="font-medium text-ink-700">{intensityLeader?.meta.name}</span> ·{" "}
              {intensityLeader?.intensityKwhPerM2} kWh/m²
            </span>
            <span>Area-adjusted intensity is illustrative, not a benchmark.</span>
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader
            icon={Sun}
            title="Solar contribution trend"
            subtitle="Daily solar energy used and its share of demand"
            action={<Badge tone="amber">{formatPct(totals.solarSharePct)} overall</Badge>}
          />
          <div className="mt-2 px-5 sm:px-6">
            <ChartLegend
              items={[
                { label: "Solar used", color: CHART.amber },
                { label: "Solar share", color: CHART.violet, dashed: true },
              ]}
            />
          </div>
          <div className="h-[248px] px-2 pt-2 sm:px-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={solarData} margin={{ top: 8, right: 2, left: -16, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={16} tickMargin={8} />
                <YAxis yAxisId="left" {...AXIS_PROPS} width={46} tickFormatter={(v: number) => compact(v)} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  {...AXIS_PROPS}
                  width={34}
                  tickFormatter={(v: number) => `${v}%`}
                  domain={[0, solarShareDomainMax]}
                />
                <Tooltip content={<ChartTooltip unit="kWh" />} cursor={{ fill: "rgba(11,31,42,0.03)" }} />
                <Bar yAxisId="left" dataKey="solarUsedKwh" name="Solar used" fill={CHART.amber} radius={[3, 3, 0, 0]} barSize={12} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="solarSharePct"
                  name="Solar share"
                  stroke={CHART.violet}
                  strokeWidth={1.6}
                  strokeDasharray="4 3"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="border-t border-line/70 px-5 py-3 text-[10.5px] leading-relaxed text-ink-400 sm:px-6">
            Solar share compares used solar kWh with total demand. Generation that exceeded campus load is not included
            in the share.
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          icon={BarChart3}
          title="Demand pattern heatmap"
          subtitle="Hourly load intensity across the last 14 simulated days"
          action={
            <>
              <label className="sr-only" htmlFor="heatmap-building">
                Select heatmap building
              </label>
              <select
                id="heatmap-building"
                value={heatmapBuilding}
                onChange={(event) => setHeatmapBuilding(event.target.value as BuildingId | "campus")}
                className="h-8 rounded-lg border border-line bg-white px-2.5 text-[11px] font-medium text-ink-600 shadow-sm"
              >
                <option value="campus">Campus total</option>
                {dataset.buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.short}
                  </option>
                ))}
              </select>
            </>
          }
        />
        <div className="mt-3 overflow-x-auto px-4 pb-2 sm:px-5">
          <div className="min-w-[700px]">
            <div className="mb-1 grid grid-cols-[62px_repeat(24,minmax(0,1fr))] gap-[3px]">
              <span />
              {Array.from({ length: 24 }, (_, hour) => (
                <span key={hour} className="text-center text-[8.5px] font-medium text-ink-400">
                  {hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}
                </span>
              ))}
            </div>
            <div className="space-y-[3px]">
              {heatmap.rows.map((row) => (
                <div key={row.dayKey} className="grid grid-cols-[62px_repeat(24,minmax(0,1fr))] gap-[3px]">
                  <span className="pr-1 text-right text-[9px] leading-6 text-ink-400">{row.label}</span>
                  {row.cells.map((cell) => {
                    const ratio =
                      heatmap.max > heatmap.min
                        ? (cell.kwh - heatmap.min) / (heatmap.max - heatmap.min)
                        : 0.5;
                    const alpha = 0.08 + ratio * 0.82;
                    return (
                      <div
                        key={cell.hour}
                        title={`${row.label} · ${String(cell.hour).padStart(2, "0")}:00 — ${cell.kwh} kWh · ${cell.occupancyPct}% occupancy (simulated)`}
                        className="h-6 rounded-[4px] transition-transform duration-100 hover:scale-[1.12] hover:ring-2 hover:ring-brand-500/50"
                        style={{
                          backgroundColor: `rgba(30, 164, 103, ${alpha.toFixed(2)})`,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-[9.5px] text-ink-400">
            <span>Lower</span>
            <span
              className="h-2 w-28 rounded-full"
              style={{
                background: "linear-gradient(to right, rgba(30,164,103,0.10), rgba(30,164,103,0.9))",
              }}
            />
            <span>Higher</span>
            <span className="ml-2">· {formatNumber(heatmap.min)}–{formatNumber(heatmap.max)} kWh per hour</span>
          </div>
          <span className="text-[9.5px] text-ink-400">Hover a cell for the simulated reading</span>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-6">
          <CardHeader
            icon={Activity}
            title="Weekday vs weekend demand"
            subtitle="Average hourly load · last 14 simulated days"
            action={
              <Badge tone="outline">
                <Moon className="h-3 w-3" /> Overnight base visible
              </Badge>
            }
          />
          <div className="mt-2 px-5 sm:px-6">
            <ChartLegend
              items={[
                { label: "Weekday", color: CHART.blue },
                { label: "Weekend", color: CHART.green },
              ]}
            />
          </div>
          <div className="h-[236px] px-2 pt-2 sm:px-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={profile} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="label" {...AXIS_PROPS} interval={3} tickMargin={8} />
                <YAxis {...AXIS_PROPS} width={46} tickFormatter={(v: number) => compact(v)} />
                <Tooltip content={<ChartTooltip unit="kWh" />} cursor={{ stroke: CHART.ink, strokeOpacity: 0.1 }} />
                <Area
                  type="monotone"
                  dataKey="weekday"
                  name="Weekday"
                  stroke={CHART.blue}
                  strokeWidth={2}
                  fill={CHART.blueSoft}
                  fillOpacity={0.25}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="weekend"
                  name="Weekend"
                  stroke={CHART.green}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="border-t border-line/70 px-5 py-3 text-[10.5px] leading-relaxed text-ink-400 sm:px-6">
            Daytime occupancy drives a clear weekday plateau; weekends retain a lower but non-zero base load from
            always-on equipment and student facilities.
          </p>
        </Card>

        <Card className="xl:col-span-6">
          <CardHeader
            icon={TriangleAlert}
            title="Waste indicators"
            subtitle="Flagged idle energy by building across all simulated alert events"
            action={<Badge tone="red">{formatNumber(totalFlaggedWaste, 1)} kWh</Badge>}
          />
          <div className="space-y-3 px-5 pb-2 pt-4 sm:px-6">
            {wasteByBuilding.map((row) => (
              <div key={row.building.meta.id}>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex items-center gap-2 text-ink-700">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: row.building.meta.color }}
                    />
                    {row.building.meta.name}
                    {row.critical > 0 ? (
                      <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[8.5px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                        {row.critical} critical
                      </span>
                    ) : null}
                  </span>
                  <span className="num text-ink-500">
                    <span className="font-semibold text-ink-800">{formatNumber(row.waste, 1)}</span> kWh ·{" "}
                    {row.alerts.length} alerts
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-400"
                    style={{ width: `${Math.max(2, (row.waste / maxWaste) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mx-5 mt-3 grid grid-cols-2 gap-2 sm:mx-6">
            <div className="rounded-lg bg-ink-50/70 px-3 py-2">
              <p className="text-[9px] uppercase tracking-wide text-ink-400">Occupied-hour average</p>
              <p className="num mt-0.5 text-sm font-semibold text-ink-800">{zones.occupiedAvgKw} kWh/h</p>
            </div>
            <div className="rounded-lg bg-ink-50/70 px-3 py-2">
              <p className="text-[9px] uppercase tracking-wide text-ink-400">Quiet-hour average</p>
              <p className="num mt-0.5 text-sm font-semibold text-ink-800">{zones.unoccupiedAvgKw} kWh/h</p>
            </div>
          </div>
          <p className="px-5 py-4 text-[10.5px] leading-relaxed text-ink-400 sm:px-6">
            Waste figures are estimated from rule-based alert events (load × duration), not metered waste. Quiet hours
            are defined as campus occupancy below 25%.
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          icon={Lightbulb}
          title="Summary insights"
          subtitle="Computed directly from the selected simulated period"
          action={<Badge tone="green">Auto-generated</Badge>}
        />
        <div className="grid grid-cols-1 gap-3 px-5 pb-5 pt-4 sm:grid-cols-2 sm:px-6">
          {summaryInsights.map((insight) => (
            <div key={insight.title} className="flex gap-3 rounded-xl border border-line bg-white p-3.5">
              <span
                className={
                  insight.tone === "amber"
                    ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100"
                    : insight.tone === "blue"
                      ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100"
                      : insight.tone === "red"
                        ? "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100"
                        : "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100"
                }
              >
                <insight.icon className="h-4 w-4" strokeWidth={1.9} />
              </span>
              <div>
                <p className="text-[11.5px] font-semibold leading-snug text-ink-800">{insight.title}</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-ink-500">{insight.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <section id="recommendations" className="mt-8 scroll-mt-24">
        <SectionTitle
          title="Sustainability recommendations"
          description="Generated from alerts, forecast and building analytics. Energy opportunities are illustrative, not verified savings."
          action={<Badge tone="outline">{recommendations.length} actions</Badge>}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="flex flex-col p-5 transition-shadow hover:shadow-lift">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone={rec.priority === "High" ? "amber" : rec.priority === "Medium" ? "blue" : "neutral"}>
                    {rec.priority} priority
                  </Badge>
                  <Badge tone="outline">{rec.category}</Badge>
                </div>
                {rec.impactKwhPerWeek > 0 ? (
                  <span className="text-right text-[9.5px] leading-tight text-ink-400">
                    ≈ <span className="font-semibold text-ink-600">{rec.impactKwhPerWeek} kWh</span>
                    <br />
                    per week*
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2.5 text-[13.5px] font-semibold leading-snug tracking-[-0.01em] text-ink-900">
                {rec.title}
              </h3>
              <p className="mt-1.5 flex-1 text-[11px] leading-relaxed text-ink-500">{rec.description}</p>
              <div className="mt-3 flex gap-2 rounded-lg border border-brand-100 bg-brand-50/70 px-2.5 py-2 text-[10.5px] leading-relaxed text-brand-900">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                <p>
                  <span className="font-semibold">Action: </span>
                  {rec.action}
                </p>
              </div>
              <div className="mt-2.5 flex items-start justify-between gap-2 border-t border-line/70 pt-2.5">
                <p className="text-[9.5px] leading-relaxed text-ink-400">{rec.evidence}</p>
                <Target className="h-3.5 w-3.5 shrink-0 text-ink-300" />
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-1 rounded-xl border border-line bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <InfoNote>
            *Illustrative weekly energy opportunity if the observed pattern repeats. Assumes no rebound effect and is
            not a verified or guaranteed saving.
          </InfoNote>
          <Button size="sm" variant="ghost" icon={Zap} onClick={regenerate}>
            Try another scenario
          </Button>
        </div>
      </section>
    </div>
  );
}
