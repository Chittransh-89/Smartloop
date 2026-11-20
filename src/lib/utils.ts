import type { DemandClass, Severity } from "./types";

export const EMISSION_FACTOR_KG_PER_KWH = 0.71;
export const DEMO_TARIFF_PER_KWH = 8.1;
export const SOLAR_CAPACITY_KWP = 480;
export const HISTORY_DAYS = 63;
export const ANCHOR_ISO = "2026-11-18";
export const SNAPSHOT_HOUR = 14;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n: number) => String(n).padStart(2, "0");

export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG — identical seed always produces an identical dataset. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dayKeyFromTs(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function isWeekendTs(ts: number): boolean {
  const day = new Date(ts).getUTCDay();
  return day === 0 || day === 6;
}

export function formatHour(hour: number): string {
  return `${pad(hour)}:00`;
}

export function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function formatFullDate(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${formatShortDate(ts)}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function formatDayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[date.getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

export function formatDayShort(dayKey: string): string {
  const [, m, d] = dayKey.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export function weekdayShort(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatKwh(value: number, decimals = 0): string {
  return `${formatNumber(value, decimals)} kWh`;
}

export function formatCo2(kg: number): string {
  if (kg >= 1000) return `${formatNumber(kg / 1000, 2)} t`;
  return `${formatNumber(kg, 0)} kg`;
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatSignedPct(value: number, decimals = 1): string {
  const rounded = Number(value.toFixed(decimals));
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(decimals)}%`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = (sortedValues.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedValues[lo];
  return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * (idx - lo);
}

export function classifyDemand(value: number, lowThreshold: number, highThreshold: number): DemandClass {
  if (value < lowThreshold) return "Low";
  if (value >= highThreshold) return "High";
  return "Moderate";
}

export function severityRank(severity: Severity): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity];
}

export function demandTone(cls: DemandClass): string {
  if (cls === "High") return "text-rose-700 bg-rose-50 ring-rose-200";
  if (cls === "Moderate") return "text-amber-700 bg-amber-50 ring-amber-200";
  return "text-brand-700 bg-brand-50 ring-brand-200";
}

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
