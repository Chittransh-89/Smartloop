import type {
  BuildingHour,
  BuildingId,
  BuildingMeta,
  DailyAggregate,
  Dataset,
  HourlyPoint,
  Room,
  Totals,
} from "./types";
import {
  SNAPSHOT_HOUR,
  dayKeyFromTs,
  formatDayLabel,
  formatDayShort,
  formatShortDate,
  isWeekendTs,
  percentile,
  pct,
  round,
  sum,
} from "./utils";

export function getRangePoints(dataset: Dataset, days: number): HourlyPoint[] {
  const count = Math.max(1, Math.min(days, 30)) * 24;
  return dataset.hourly.slice(-count);
}

export function getPreviousRangePoints(dataset: Dataset, days: number): HourlyPoint[] {
  const clamped = Math.max(1, Math.min(days, 30));
  const end = dataset.hourly.length - clamped * 24;
  const start = Math.max(0, end - clamped * 24);
  return dataset.hourly.slice(start, end);
}

export function aggregateDaily(points: HourlyPoint[]): DailyAggregate[] {
  const byDay = new Map<string, HourlyPoint[]>();
  for (const point of points) {
    const list = byDay.get(point.dayKey) ?? [];
    list.push(point);
    byDay.set(point.dayKey, list);
  }
  return Array.from(byDay.entries()).map(([dayKey, list]) => {
    const loadKwh = round(sum(list.map((p) => p.loadKwh)), 1);
    const solarUsed = round(sum(list.map((p) => p.solarUsedKwh)), 1);
    const grid = round(sum(list.map((p) => p.gridKwh)), 1);
    const generator = round(sum(list.map((p) => p.generatorKwh)), 1);
    const timestamp = list[0]?.timestamp ?? 0;
    return {
      dayKey,
      timestamp,
      label: formatDayLabel(dayKey),
      shortLabel: formatDayShort(dayKey),
      loadKwh,
      solarKwh: round(sum(list.map((p) => p.solarKwh)), 1),
      solarUsedKwh: solarUsed,
      solarExcessKwh: round(sum(list.map((p) => p.solarExcessKwh)), 1),
      gridKwh: grid,
      generatorKwh: generator,
      co2Kg: round(grid * 0.71, 1),
      occupancyPct: round(sum(list.map((p) => p.occupancyPct)) / Math.max(1, list.length), 1),
      isWeekend: isWeekendTs(timestamp),
    };
  });
}

export function computeTotals(points: HourlyPoint[]): Totals {
  const loadKwh = round(sum(points.map((p) => p.loadKwh)), 1);
  const solarUsedKwh = round(sum(points.map((p) => p.solarUsedKwh)), 1);
  const solarKwh = round(sum(points.map((p) => p.solarKwh)), 1);
  const solarExcessKwh = round(sum(points.map((p) => p.solarExcessKwh)), 1);
  const gridKwh = round(sum(points.map((p) => p.gridKwh)), 1);
  const generatorKwh = round(sum(points.map((p) => p.generatorKwh)), 1);
  const peakPoint = points.reduce<HourlyPoint | null>(
    (best, point) => (!best || point.loadKwh > best.loadKwh ? point : best),
    null,
  );
  const avgOccupancyPct = points.length
    ? round(sum(points.map((p) => p.occupancyPct)) / points.length, 1)
    : 0;
  return {
    loadKwh,
    solarUsedKwh,
    solarKwh,
    solarExcessKwh,
    gridKwh,
    generatorKwh,
    generatorHours: points.filter((p) => p.generatorEvent).length,
    co2Kg: round(gridKwh * 0.71, 1),
    peakKw: peakPoint?.loadKwh ?? 0,
    peakTimestamp: peakPoint?.timestamp ?? 0,
    avgOccupancyPct,
    solarSharePct: round(pct(solarUsedKwh, loadKwh), 1),
    gridSharePct: round(pct(gridKwh, loadKwh), 1),
    generatorSharePct: round(pct(generatorKwh, loadKwh), 1),
    greenSharePct: round(pct(solarUsedKwh + generatorKwh, loadKwh), 1),
  };
}

export function getDeltaPct(current: number, previous: number): number | null {
  if (!previous) return null;
  return round(((current - previous) / previous) * 100, 1);
}

export interface BuildingSummary {
  meta: BuildingMeta;
  totalKwh: number;
  previousKwh: number;
  deltaPct: number | null;
  sharePct: number;
  todayKwh: number;
  occupancyPct: number;
  occupancyLabel: "In use" | "Partially used" | "Quiet";
  intensityKwhPerM2: number;
  activeAlerts: number;
  roomsTotal: number;
  roomsOccupied: number;
}

export function getBuildingSummaries(dataset: Dataset, days: number): BuildingSummary[] {
  const todayKey = dataset.anchorDate;
  const summaries = dataset.buildings.map((meta) => {
    const series = dataset.buildingHourly[meta.id];
    const current = series.slice(-days * 24);
    const previous = series.slice(-days * 48, -days * 24);
    const totalKwh = round(sum(current.map((p) => p.loadKwh)), 1);
    const previousKwh = round(sum(previous.map((p) => p.loadKwh)), 1);
    const today = series.filter((p) => p.dayKey === todayKey);
    const snapshot = series.find(
      (p) => p.dayKey === todayKey && p.hour === SNAPSHOT_HOUR,
    );
    const last = snapshot ?? current[current.length - 1];
    const occupancyPct = last?.occupancyPct ?? 0;
    const rooms = dataset.rooms.filter((r) => r.buildingId === meta.id);
    return {
      meta,
      totalKwh,
      previousKwh,
      deltaPct: getDeltaPct(totalKwh, previousKwh),
      sharePct: 0,
      todayKwh: round(sum(today.map((p) => p.loadKwh)), 1),
      occupancyPct,
      occupancyLabel:
        occupancyPct >= 55 ? ("In use" as const) : occupancyPct >= 20 ? ("Partially used" as const) : ("Quiet" as const),
      intensityKwhPerM2: round(totalKwh / meta.areaM2, 2),
      activeAlerts: dataset.alerts.filter(
        (a) => a.buildingId === meta.id && a.status === "active",
      ).length,
      roomsTotal: rooms.length,
      roomsOccupied: rooms.filter((r) => r.occupancy === "Occupied").length,
    };
  });
  const campusTotal = sum(summaries.map((s) => s.totalKwh)) || 1;
  return summaries
    .map((s) => ({ ...s, sharePct: round(pct(s.totalKwh, campusTotal), 1) }))
    .sort((a, b) => b.totalKwh - a.totalKwh);
}

export interface BuildingDayPoint {
  dayKey: string;
  shortLabel: string;
  [key: string]: string | number;
}

export function getBuildingDailySeries(dataset: Dataset, days: number): BuildingDayPoint[] {
  const count = days * 24;
  const start = dataset.hourly.length - count;
  const dayKeys = Array.from(
    new Set(dataset.hourly.slice(start).map((p) => p.dayKey)),
  );
  return dayKeys.map((dayKey) => {
    const row: BuildingDayPoint = {
      dayKey,
      shortLabel: formatDayShort(dayKey),
    };
    for (const building of dataset.buildings) {
      const points = dataset.buildingHourly[building.id].filter((p) => p.dayKey === dayKey);
      row[building.id] = round(sum(points.map((p) => p.loadKwh)), 1);
    }
    return row;
  });
}

export interface HourProfilePoint {
  hour: number;
  label: string;
  avgKwh: number;
  avgOccupancy: number;
  solarAvgKwh: number;
}

export function getHourlyProfile(points: HourlyPoint[]): HourProfilePoint[] {
  return Array.from({ length: 24 }, (_, hour) => {
    const atHour = points.filter((p) => p.hour === hour);
    return {
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      avgKwh: atHour.length ? round(sum(atHour.map((p) => p.loadKwh)) / atHour.length, 1) : 0,
      avgOccupancy: atHour.length ? round(sum(atHour.map((p) => p.occupancyPct)) / atHour.length, 1) : 0,
      solarAvgKwh: atHour.length ? round(sum(atHour.map((p) => p.solarKwh)) / atHour.length, 1) : 0,
    };
  });
}

export interface HeatmapCell {
  dayKey: string;
  shortLabel: string;
  hour: number;
  kwh: number;
  occupancyPct: number;
}

export function getHeatmap(points: HourlyPoint[], maxDays = 14): { cells: HeatmapCell[]; max: number; min: number } {
  const recent = points.slice(-maxDays * 24);
  const cells = recent.map((p) => ({
    dayKey: p.dayKey,
    shortLabel: formatDayShort(p.dayKey),
    hour: p.hour,
    kwh: round(p.loadKwh, 1),
    occupancyPct: p.occupancyPct,
  }));
  const values = cells.map((c) => c.kwh).sort((a, b) => a - b);
  return {
    cells,
    max: values[values.length - 1] ?? 0,
    min: values[0] ?? 0,
  };
}

export function getZoneComparisons(dataset: Dataset, days: number): {
  occupiedAvgKw: number;
  unoccupiedAvgKw: number;
  occupancyDeltaPct: number;
} {
  const count = days * 24;
  const points = dataset.hourly.slice(-count);
  const occupied = points.filter((p) => p.occupancyPct >= 50);
  const unoccupied = points.filter((p) => p.occupancyPct < 25);
  const occupiedAvg = occupied.length ? sum(occupied.map((p) => p.loadKwh)) / occupied.length : 0;
  const unoccupiedAvg = unoccupied.length ? sum(unoccupied.map((p) => p.loadKwh)) / unoccupied.length : 0;
  return {
    occupiedAvgKw: round(occupiedAvg, 0),
    unoccupiedAvgKw: round(unoccupiedAvg, 0),
    occupancyDeltaPct: round(pct(occupiedAvg - unoccupiedAvg, Math.max(1, unoccupiedAvg)), 0),
  };
}

export function getRoomStatusSummary(rooms: Room[]): {
  total: number;
  occupied: number;
  unoccupiedWithLoad: number;
  expectedContinuous: number;
} {
  return {
    total: rooms.length,
    occupied: rooms.filter((r) => r.occupancy === "Occupied").length,
    unoccupiedWithLoad: rooms.filter(
      (r) => r.occupancy !== "Occupied" && r.equipment === "ON" && !r.expectedContinuous,
    ).length,
    expectedContinuous: rooms.filter((r) => r.expectedContinuous).length,
  };
}

export function getDailyExtremes(daily: DailyAggregate[]): {
  highest: DailyAggregate | null;
  lowest: DailyAggregate | null;
} {
  if (daily.length === 0) return { highest: null, lowest: null };
  return daily.reduce(
    (acc, day) => ({
      highest: !acc.highest || day.loadKwh > acc.highest.loadKwh ? day : acc.highest,
      lowest: !acc.lowest || day.loadKwh < acc.lowest.loadKwh ? day : acc.lowest,
    }),
    { highest: null, lowest: null } as { highest: DailyAggregate | null; lowest: DailyAggregate | null },
  );
}

export function getDemandPercentiles(points: HourlyPoint[]): { p40: number; p80: number; median: number } {
  const values = points.map((p) => p.loadKwh).sort((a, b) => a - b);
  return {
    p40: round(percentile(values, 0.4), 1),
    p80: round(percentile(values, 0.8), 1),
    median: round(percentile(values, 0.5), 1),
  };
}

export function getBuildingHourSeries(dataset: Dataset, buildingId: BuildingId | "campus"): BuildingHour[] {
  if (buildingId === "campus") {
    return dataset.hourly.map((p) => ({
      timestamp: p.timestamp,
      dayKey: p.dayKey,
      hour: p.hour,
      loadKwh: p.loadKwh,
      occupancyPct: p.occupancyPct,
    }));
  }
  return dataset.buildingHourly[buildingId];
}

export function getRelativeDay(ts: number): string {
  const anchor = Date.UTC(2026, 10, 18);
  const day = Date.UTC(
    new Date(ts).getUTCFullYear(),
    new Date(ts).getUTCMonth(),
    new Date(ts).getUTCDate(),
  );
  const diff = Math.round((anchor - day) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatShortDate(ts);
}

export function groupAlertsByDay(alerts: { detectedAt: number }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const alert of alerts) {
    const key = dayKeyFromTs(alert.detectedAt);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}
