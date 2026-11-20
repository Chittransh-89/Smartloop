import type { BuildingHour, DemandClass, ForecastPoint, ForecastResult } from "./types";
import {
  classifyDemand,
  clamp,
  formatDateTime,
  formatHour,
  isWeekendTs,
  percentile,
  round,
  sum,
} from "./utils";

/**
 * Weekly-seasonal baseline with a recent level correction.
 *
 * For every future hour we take a recency-weighted average of that same hour on
 * comparable days (weekday vs weekend), then scale it by the ratio between the
 * last 24 hours of actual demand and the level the seasonal baseline expected.
 * This is a transparent statistical forecaster — not a trained neural network —
 * and its error is measured with a walk-forward backtest on the simulated data.
 */
function seasonalBaseline(
  values: number[],
  timestamps: number[],
  targetTs: number,
  availableUntil: number,
): number {
  const targetHour = new Date(targetTs).getUTCHours();
  const targetWeekend = isWeekendTs(targetTs);
  const targetDay = Math.floor(targetTs / 86_400_000);

  const sameType: { value: number; ageDays: number }[] = [];
  const fallback: { value: number; ageDays: number }[] = [];

  for (let i = availableUntil - 1; i >= 0; i -= 1) {
    const ts = timestamps[i];
    if (new Date(ts).getUTCHours() !== targetHour) continue;
    const ageDays = targetDay - Math.floor(ts / 86_400_000);
    if (ageDays <= 0 || ageDays > 28) continue;
    const entry = { value: values[i], ageDays };
    if (isWeekendTs(ts) === targetWeekend) sameType.push(entry);
    else fallback.push(entry);
    if (sameType.length >= 14) break;
  }

  const pool = sameType.length >= 3 ? sameType : [...sameType, ...fallback];
  if (pool.length === 0) return values[availableUntil - 1] ?? 0;

  let weighted = 0;
  let weights = 0;
  for (const entry of pool) {
    const weight = Math.pow(0.9, Math.max(0, entry.ageDays - 1));
    weighted += entry.value * weight;
    weights += weight;
  }
  return weights > 0 ? weighted / weights : 0;
}

function levelCorrection(
  values: number[],
  timestamps: number[],
  availableUntil: number,
): number {
  const start = Math.max(1, availableUntil - 24);
  let actual = 0;
  let expected = 0;
  for (let i = start; i < availableUntil; i += 1) {
    actual += values[i];
    expected += seasonalBaseline(values, timestamps, timestamps[i], i);
  }
  if (expected <= 0) return 1;
  return clamp(actual / expected, 0.8, 1.2);
}

function predictAt(
  values: number[],
  timestamps: number[],
  targetTs: number,
  availableUntil: number,
  level: number,
): number {
  const base = seasonalBaseline(values, timestamps, targetTs, availableUntil);
  return round(base * level, 1);
}

function demandClassFor(kwh: number, low: number, high: number): DemandClass {
  return classifyDemand(kwh, low, high);
}

const HOUR = 3_600_000;

export function generateForecast(
  series: BuildingHour[],
  entityId: string,
  entityLabel: string,
  horizonHours: 12 | 24 = 24,
): ForecastResult {
  const values = series.map((p) => p.loadKwh);
  const timestamps = series.map((p) => p.timestamp);
  const endIndex = values.length;
  const lastTs = timestamps[endIndex - 1];

  const last30Days = values.slice(-30 * 24).sort((a, b) => a - b);
  const lowThreshold = round(percentile(last30Days, 0.4), 1);
  const highThreshold = round(percentile(last30Days, 0.8), 1);
  const median = round(percentile(last30Days, 0.5), 1);

  const level = levelCorrection(values, timestamps, endIndex);
  const future: { ts: number; kwh: number }[] = [];
  for (let h = 1; h <= 24; h += 1) {
    const ts = lastTs + h * HOUR;
    future.push({ ts, kwh: predictAt(values, timestamps, ts, endIndex, level) });
  }

  // Walk-forward backtest: predict each of the final 72 hours using only the
  // data that would have been available immediately before that hour.
  const backtestErrors: { abs: number; pct: number }[] = [];
  const backtestStart = Math.max(24 * 7, values.length - 72);
  for (let i = backtestStart; i < values.length; i += 1) {
    const levelAt = levelCorrection(values, timestamps, i);
    const predicted = predictAt(values, timestamps, timestamps[i], i, levelAt);
    const actual = values[i];
    backtestErrors.push({
      abs: Math.abs(predicted - actual),
      pct: actual > 0 ? (Math.abs(predicted - actual) / actual) * 100 : 0,
    });
  }
  const mae = round(sum(backtestErrors.map((e) => e.abs)) / Math.max(1, backtestErrors.length), 1);
  const mape = round(sum(backtestErrors.map((e) => e.pct)) / Math.max(1, backtestErrors.length), 1);

  const historyPoints = 36;
  const chartStart = Math.max(0, endIndex - historyPoints);
  const points: ForecastPoint[] = [];

  for (let i = chartStart; i < endIndex; i += 1) {
    const ts = timestamps[i];
    const date = new Date(ts);
    points.push({
      timestamp: ts,
      label: `${formatHour(date.getUTCHours())}`,
      fullLabel: formatDateTime(ts),
      actual: round(values[i], 1),
      predicted: null,
      lower: null,
      upper: null,
      demandClass: null,
      isForecast: false,
    });
  }

  for (let h = 0; h < horizonHours; h += 1) {
    const entry = future[h];
    const spread = mae * 1.35 * Math.sqrt((h + 1) / 12);
    points.push({
      timestamp: entry.ts,
      label: formatHour(new Date(entry.ts).getUTCHours()),
      fullLabel: formatDateTime(entry.ts),
      actual: null,
      predicted: entry.kwh,
      lower: round(Math.max(0, entry.kwh - spread), 1),
      upper: round(entry.kwh + spread, 1),
      demandClass: demandClassFor(entry.kwh, lowThreshold, highThreshold),
      isForecast: true,
    });
  }

  const peakEntry = future.reduce((best, item) => (item.kwh > best.kwh ? item : best), future[0]);
  const next24TotalKwh = round(sum(future.map((f) => f.kwh)), 1);
  const dayClass = demandClassFor(peakEntry.kwh, lowThreshold, highThreshold);
  const nextHour = future[0];
  const forecastPoints = points.filter((p) => p.isForecast);
  const peakPoint = forecastPoints.reduce(
    (best, p) => ((p.predicted ?? 0) > (best.predicted ?? 0) ? p : best),
    forecastPoints[0],
  );
  const lowHours = forecastPoints.filter((p) => p.demandClass === "Low").length;
  const highHours = forecastPoints.filter((p) => p.demandClass === "High").length;

  const summary =
    `${entityLabel} demand is forecast to peak at ${Math.round(peakPoint.predicted ?? 0)} kWh in the ` +
    `${formatHour(new Date(peakPoint.timestamp).getUTCHours())} hour on ` +
    `${formatDateTime(peakPoint.timestamp).split(",")[0]}. ` +
    `${highHours > 0 ? `${highHours} hour${highHours === 1 ? "" : "s"} fall in the High band` : "No hours fall in the High demand band"}, ` +
    `${lowHours > 0 ? `${lowHours} in Low` : "none in Low"}. ` +
    `The model uses the recent weekday/weekend rhythm plus a level correction; it does not model weather or campus events.`;

  return {
    entityId,
    entityLabel,
    horizonHours,
    generatedAt: Date.now(),
    points,
    nextHour: {
      timestamp: nextHour.ts,
      kwh: nextHour.kwh,
      demandClass: demandClassFor(nextHour.kwh, lowThreshold, highThreshold),
    },
    next24TotalKwh,
    peak: {
      timestamp: peakEntry.ts,
      kwh: peakEntry.kwh,
      demandClass: demandClassFor(peakEntry.kwh, lowThreshold, highThreshold),
    },
    dayDemandClass: dayClass,
    mae,
    mape,
    backtestHours: backtestErrors.length,
    thresholds: { low: lowThreshold, high: highThreshold, median },
    method: "Weekly-seasonal baseline + recent level correction",
    summary,
    confidenceNote: `Walk-forward backtest on the final ${backtestErrors.length} hours of simulated data: MAE ${mae} kWh/hour, MAPE ${mape}%. The synthetic pattern is highly regular, so this error is optimistic for real meter data. It is not a guarantee of real-world accuracy.`,
  };
}

export function forecastToCsv(result: ForecastResult): string {
  const rows = [
    "timestamp,type,actual_kwh,predicted_kwh,lower_bound_kwh,upper_bound_kwh,demand_class",
    ...result.points.map((p) => {
      const iso = new Date(p.timestamp).toISOString();
      const type = p.isForecast ? "forecast" : "history";
      return [
        iso,
        type,
        p.actual ?? "",
        p.predicted ?? "",
        p.lower ?? "",
        p.upper ?? "",
        p.demandClass ?? "",
      ].join(",");
    }),
  ];
  return rows.join("\n");
}
