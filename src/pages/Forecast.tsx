import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BrainCircuit,
  CalendarClock,
  Clock3,
  Download,
  Gauge,
  Info,
  Layers,
  RotateCcw,
  Target,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { useData } from "@/state/DataContext";
import { getBuildingHourSeries, getRangePoints, computeTotals } from "@/lib/analytics";
import { forecastToCsv, generateForecast } from "@/lib/forecasting";
import type { BuildingId } from "@/lib/types";
import {
  formatDateTime,
  formatFullDate,
  formatHour,
  formatNumber,
  formatPct,
} from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  DemandBadge,
  EmptyState,
  InfoNote,
  KeyValue,
  PageHeader,
  Segmented,
  StatCard,
} from "@/components/ui";
import { AXIS_PROPS, CHART, ChartLegend, ChartTooltip, GRID_PROPS } from "@/components/charts";

function compact(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

export default function Forecast() {
  const { dataset, notify, regenerate } = useData();
  const [entity, setEntity] = useState<BuildingId | "campus">("campus");
  const [horizon, setHorizon] = useState<12 | 24>(24);

  const entityLabel =
    entity === "campus"
      ? "Campus total"
      : dataset.buildings.find((building) => building.id === entity)?.name ?? "Campus total";

  const series = useMemo(() => getBuildingHourSeries(dataset, entity), [dataset, entity]);
  const forecast = useMemo(
    () => generateForecast(series, entity, entityLabel, horizon),
    [series, entity, entityLabel, horizon],
  );

  const totals = useMemo(() => computeTotals(getRangePoints(dataset, 7)), [dataset]);
  const forecastPoints = forecast.points.filter((point) => point.isForecast);
  const historyPoints = forecast.points.filter((point) => !point.isForecast);
  const lastActual = historyPoints[historyPoints.length - 1];
  const highHours = forecastPoints.filter((p) => p.demandClass === "High");
  const lowHours = forecastPoints.filter((p) => p.demandClass === "Low");
  const buildingMeta = dataset.buildings.find((b) => b.id === entity);

  const correct = forecastPoints.reduce((acc, point) => acc + (point.predicted ?? 0), 0);
  const horizonTotalKwh = Math.round(correct);

  const chartData = useMemo(
    () =>
      forecast.points.map((point) => ({
        ts: point.timestamp,
        fullLabel: point.fullLabel,
        actual: point.actual,
        predicted: point.predicted,
        lower: point.lower,
        upper: point.upper,
      })),
    [forecast.points],
  );

  function exportForecast() {
    const csv = forecastToCsv(forecast);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smartloop-forecast-${entity}-${horizon}h-${dataset.seed}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify("Forecast exported", "Historical and predicted hourly points downloaded as CSV.", "info");
  }

  if (series.length < 24 * 7) {
    return (
      <Card>
        <EmptyState
          icon={CalendarClock}
          title="Not enough history to forecast"
          description="The forecasting model needs at least seven days of hourly data. Regenerate the demo dataset to continue."
          action={<Button onClick={regenerate}>Regenerate demo data</Button>}
        />
      </Card>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Predictive operations"
        title="Demand forecast"
        description={`A transparent weekly-seasonal model projects the next ${horizon} hours from simulated historical demand. Accuracy is measured with a walk-forward backtest — not assumed.`}
        descriptionClassName="max-w-xl"
        actions={
          <>
            <label className="sr-only" htmlFor="forecast-entity">
              Select forecast entity
            </label>
            <select
              id="forecast-entity"
              value={entity}
              onChange={(event) => setEntity(event.target.value as BuildingId | "campus")}
              className="h-[38px] rounded-xl border border-line bg-white px-3 text-[12.5px] font-medium text-ink-700 shadow-sm focus:border-brand-400"
            >
              <option value="campus">Campus total</option>
              {dataset.buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
            <Segmented
              ariaLabel="Forecast horizon"
              value={horizon}
              onChange={setHorizon}
              options={[
                { value: 12, label: "12 hours" },
                { value: 24, label: "24 hours" },
              ]}
            />
            <Button size="sm" icon={Download} onClick={exportForecast}>
              Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Next hour"
          value={formatNumber(forecast.nextHour.kwh, 0)}
          unit="kWh"
          icon={Clock3}
          footnote={`${formatHour(new Date(forecast.nextHour.timestamp).getUTCHours())} · ${formatDateTime(forecast.nextHour.timestamp)}`}
          sparkline={forecastPoints.slice(0, 12).map((p) => p.predicted ?? 0)}
        />
        <StatCard
          label={`Next ${horizon} hours`}
          value={formatNumber(horizonTotalKwh)}
          unit="kWh"
          icon={CalendarClock}
          accent="navy"
          footnote="Gross demand · solar supply not netted out"
          sparkline={forecastPoints.map((p) => p.predicted ?? 0)}
        />
        <StatCard
          label="Forecast peak"
          value={formatNumber(forecast.peak.kwh)}
          unit="kWh/h"
          icon={Gauge}
          accent="amber"
          footnote={`${formatDateTime(forecast.peak.timestamp)} · ${highHours.length} high-band hour${highHours.length === 1 ? "" : "s"}`}
          sparkline={forecastPoints.map((p) => p.predicted ?? 0)}
        />
        <StatCard
          label="Backtest error (MAPE)"
          value={forecast.mape.toFixed(1)}
          unit="%"
          icon={Target}
          accent="blue"
          footnote={`MAE ${forecast.mae} kWh/h across ${forecast.backtestHours} holdout hours · simulated data`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader
            icon={TrendingUp}
            title="Historical demand and forecast"
            subtitle={`${entityLabel} · 36 historical hours + ${horizon} forecast hours`}
            action={<DemandBadge demandClass={forecast.dayDemandClass} />}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6">
            <ChartLegend
              items={[
                { label: "Actual (simulated)", color: CHART.green },
                { label: "Forecast", color: CHART.violet, dashed: true },
                { label: "Uncertainty band", color: CHART.violetSoft },
              ]}
            />
            <span className="inline-flex items-center gap-1.5 text-[10.5px] text-ink-400">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              Forecast origin {formatDateTime(lastActual?.timestamp ?? dataset.anchorTimestamp)}
            </span>
          </div>
          <div className="h-[310px] px-2 pt-3 sm:px-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis
                  dataKey="ts"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  scale="time"
                  {...AXIS_PROPS}
                  minTickGap={44}
                  tickMargin={9}
                  tickFormatter={(value: number) => {
                    const d = new Date(value);
                    return `${formatHour(d.getUTCHours())}`;
                  }}
                />
                <YAxis {...AXIS_PROPS} width={48} tickFormatter={(v: number) => compact(v)} />
                <Tooltip content={<ChartTooltip unit="kWh" />} cursor={{ stroke: CHART.ink, strokeOpacity: 0.12 }} />
                <ReferenceLine
                  x={lastActual?.timestamp}
                  stroke={CHART.violet}
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{ value: "now", position: "insideTopRight", fill: CHART.violet, fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="upper"
                  name="Upper band"
                  stroke={CHART.violetSoft}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="lower"
                  name="Lower band"
                  stroke={CHART.violetSoft}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual demand"
                  stroke={CHART.green}
                  strokeWidth={2.1}
                  dot={false}
                  activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#fff" }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Predicted demand"
                  stroke={CHART.violet}
                  strokeWidth={2.1}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#fff" }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-line/70 px-5 py-3 text-[10.5px] text-ink-400 sm:px-6">
            <span>{forecast.summary}</span>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-4">
          <Card>
            <CardHeader
              icon={BrainCircuit}
              title="Forecast outlook"
              subtitle={forecast.method}
              action={<Badge tone="violet">Statistical model</Badge>}
            />
            <div className="px-5 pt-3 sm:px-6">
              <div className="flex items-center justify-between rounded-xl bg-ink-50/70 px-3.5 py-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">Peak demand band</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink-900">{forecast.dayDemandClass} demand</p>
                </div>
                <DemandBadge demandClass={forecast.dayDemandClass} />
              </div>
              <dl className="mt-2 divide-y divide-line/60">
                <KeyValue label="Next hour" value={`${formatNumber(forecast.nextHour.kwh, 1)} kWh`} />
                <KeyValue label="Forecast peak" value={`${formatNumber(forecast.peak.kwh, 1)} kWh/h`} />
                <KeyValue
                  label="Peak hour"
                  value={formatDateTime(forecast.peak.timestamp)}
                />
                <KeyValue label="High-band hours" value={`${highHours.length} of ${horizon}`} />
                <KeyValue label="Low-band hours" value={`${lowHours.length} of ${horizon}`} />
                <KeyValue label="Backtest MAPE" value={`${forecast.mape.toFixed(1)}%`} />
                <KeyValue label="Backtest MAE" value={`${forecast.mae} kWh/h`} />
              </dl>
            </div>
            <div className="px-5 pb-5 pt-3 sm:px-6">
              <p className="rounded-lg bg-amber-50/80 px-3 py-2.5 text-[10px] leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-200/70">
                <TriangleAlert className="mr-1 inline h-3 w-3 align-[-2px]" />
                {forecast.confidenceNote}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader
            icon={Layers}
            title="Hourly forecast"
            subtitle={`Next ${horizon} hours · predicted demand and uncertainty`}
            action={<Badge tone="outline">{entityLabel}</Badge>}
          />
          <div className="mt-3 overflow-x-auto px-1">
            <table className="w-full min-w-[520px] text-left text-[11.5px]">
              <thead>
                <tr className="border-y border-line bg-ink-50/50 text-[10px] uppercase tracking-[0.08em] text-ink-400">
                  <th className="px-5 py-2.5 font-medium sm:px-6">Hour</th>
                  <th className="px-3 py-2.5 text-right font-medium">Forecast</th>
                  <th className="px-3 py-2.5 text-right font-medium">Range</th>
                  <th className="px-5 py-2.5 text-right font-medium sm:px-6">Demand</th>
                </tr>
              </thead>
              <tbody>
                {forecastPoints.slice(0, 8).map((point) => (
                  <tr key={point.timestamp} className="border-b border-line/60 last:border-0 hover:bg-ink-50/30">
                    <td className="px-5 py-2.5 sm:px-6">
                      <p className="font-medium text-ink-800">
                        {new Date(point.timestamp).getUTCHours().toString().padStart(2, "0")}:00
                      </p>
                      <p className="text-[10px] text-ink-400">
                        {formatDateTime(point.timestamp).split(",")[0]}
                      </p>
                    </td>
                    <td className="num px-3 py-2.5 text-right font-medium text-ink-800">
                      {formatNumber(point.predicted ?? 0, 1)} kWh
                    </td>
                    <td className="num px-3 py-2.5 text-right text-[10.5px] text-ink-500">
                      {formatNumber(point.lower ?? 0)}–{formatNumber(point.upper ?? 0)} kWh
                    </td>
                    <td className="px-5 py-2.5 text-right sm:px-6">
                      {point.demandClass ? (
                        <Badge
                          tone={
                            point.demandClass === "High"
                              ? "red"
                              : point.demandClass === "Moderate"
                                ? "amber"
                                : "green"
                          }
                          dot
                        >
                          {point.demandClass}
                        </Badge>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line/70 px-5 py-3 text-[10.5px] text-ink-400 sm:px-6">
            <span>Showing the first 8 forecast hours</span>
            <button
              type="button"
              onClick={exportForecast}
              className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800"
            >
              <Download className="h-3 w-3" /> Download all {horizon} hours
            </button>
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader icon={Info} title="How this forecast works" subtitle="Explainable by design" />
          <div className="px-5 pb-5 pt-4 sm:px-6">
            <ol className="space-y-3">
              {[
                {
                  title: "Seasonal shape",
                  body: "For each future hour, SmartLoop averages the same hour on comparable days (weekday or weekend), weighting recent days more heavily.",
                },
                {
                  title: "Recent level correction",
                  body: "The seasonal baseline is scaled by how the last 24 hours compared with what the baseline expected, so the forecast follows the current demand level.",
                },
                {
                  title: "Honest evaluation",
                  body: `The final ${forecast.backtestHours} hours are held out. Each is predicted using only earlier data, then compared with the simulated actual. MAPE is ${forecast.mape.toFixed(1)}% and MAE is ${forecast.mae} kWh/h.`,
                },
                {
                  title: "No weather or event model",
                  body: "Rain, exams, holidays and occupancy shocks are not explicitly modelled. Those are stated limitations, not hidden assumptions.",
                },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-800 ring-1 ring-inset ring-brand-100">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[11.5px] font-semibold text-ink-800">{step.title}</p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-500">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-lg border border-line bg-ink-50/60 px-3 py-2.5">
              <p className="text-[10px] leading-relaxed text-ink-500">
                <span className="font-semibold text-ink-700">Scope:</span> total electricity demand is forecast. Solar
                generation is not predicted here, so this is gross demand rather than net grid import.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[10px] text-ink-400">
                <RotateCcw className="mr-1 inline h-3 w-3" /> Recalculated instantly on selection
              </span>
              <Badge tone="green">{formatPct((totals.solarSharePct), 1)} solar share · 7d</Badge>
            </div>
            {buildingMeta ? (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-50/60 px-3 py-2 text-[10.5px] text-brand-900/70 ring-1 ring-inset ring-brand-100">
                <span>
                  {buildingMeta.name} · {buildingMeta.areaM2.toLocaleString("en-IN")} m² · {buildingMeta.roomCount} rooms
                </span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            ) : null}
            <p className="mt-3 text-[9.5px] leading-relaxed text-ink-400">
              Forecast origin: {formatFullDate(dataset.anchorTimestamp)}. All inputs and results are simulated. The
              reported error is a backtest on this demo dataset and does not establish real-world accuracy.
            </p>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_1.35fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                <Gauge className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-ink-900">Demand classification</p>
                <p className="text-[11px] text-ink-500">
                  Low, Moderate and High bands from the last 30 simulated days
                </p>
              </div>
            </div>
            <InfoNote className="mt-2.5">
              The 40th and 80th percentiles of historical hourly demand define these bands for the selected series. They
              are relative to this simulation, not universal campus thresholds.
            </InfoNote>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              {
                label: "Low",
                range: `< ${formatNumber(forecast.thresholds.low)} kWh`,
                tone: "green" as const,
                count: lowHours.length,
                color: CHART.green,
              },
              {
                label: "Moderate",
                range: `${formatNumber(forecast.thresholds.low)} – ${formatNumber(forecast.thresholds.high)} kWh`,
                tone: "amber" as const,
                count: forecastPoints.filter((p) => p.demandClass === "Moderate").length,
                color: CHART.amber,
              },
              {
                label: "High",
                range: `≥ ${formatNumber(forecast.thresholds.high)} kWh`,
                tone: "red" as const,
                count: highHours.length,
                color: "#e11d48",
              },
            ].map((band) => (
              <div key={band.label} className="rounded-xl border border-line bg-white px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={band.tone} dot>
                    {band.label}
                  </Badge>
                  <span className="text-[9.5px] text-ink-400">{band.range}</span>
                </div>
                <p className="mt-2 text-[15px] font-semibold tracking-[-0.01em] text-ink-900">
                  {band.count} <span className="text-[10px] font-medium text-ink-400">hours</span>
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(2, (band.count / Math.max(1, horizon)) * 100)}%`,
                      backgroundColor: band.color,
                    }}
                  />
                </div>
                <p className="mt-1 text-[9.5px] text-ink-400">
                  {Math.round((band.count / Math.max(1, horizon)) * 100)}% of the {horizon}-hour horizon
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
