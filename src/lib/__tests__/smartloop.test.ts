import { describe, expect, it } from "vitest";
import { generateDataset } from "@/lib/simulation";
import { aggregateDaily, computeTotals, getBuildingSummaries, getRangePoints } from "@/lib/analytics";
import { generateForecast } from "@/lib/forecasting";
import { buildRecommendations } from "@/lib/recommendations";
import { getBuildingHourSeries } from "@/lib/analytics";

const dataset = generateDataset("smartloop-test-seed");

describe("simulated campus dataset", () => {
  it("is reproducible for a given seed", () => {
    const again = generateDataset("smartloop-test-seed");
    expect(again.hourly.length).toBe(dataset.hourly.length);
    expect(again.hourly[100].loadKwh).toBe(dataset.hourly[100].loadKwh);
    expect(again.alerts.map((a) => a.id)).toEqual(dataset.alerts.map((a) => a.id));
  });

  it("has 63 days of hourly data and five buildings", () => {
    expect(dataset.days).toBe(63);
    expect(dataset.hourly.length).toBe(63 * 24);
    expect(dataset.buildings.length).toBe(5);
    for (const building of dataset.buildings) {
      expect(dataset.buildingHourly[building.id].length).toBe(dataset.hourly.length);
    }
  });

  it("keeps building loads consistent with the campus total", () => {
    for (const point of dataset.hourly) {
      const buildingSum = dataset.buildings.reduce((acc, building) => {
        const match = dataset.buildingHourly[building.id].find((p) => p.timestamp === point.timestamp);
        return acc + (match?.loadKwh ?? 0);
      }, 0);
      expect(Math.abs(buildingSum - point.loadKwh)).toBeLessThan(0.05);
    }
  });

  it("has a physically consistent supply mix", () => {
    for (const point of dataset.hourly) {
      expect(point.solarUsedKwh).toBeLessThanOrEqual(point.loadKwh + 0.01);
      expect(point.gridKwh).toBeGreaterThanOrEqual(0);
      expect(point.solarExcessKwh).toBeGreaterThanOrEqual(0);
      expect(
        Math.abs(point.solarUsedKwh + point.gridKwh + point.generatorKwh - point.loadKwh),
      ).toBeLessThan(0.05);
      if (point.generatorEvent) {
        expect(point.generatorKwh).toBeGreaterThan(0);
        expect(point.gridKwh).toBe(0);
      }
    }
    expect(dataset.hourly.some((p) => p.generatorEvent)).toBe(true);
  });

  it("produces consistent daily aggregates and CO2 estimates", () => {
    const points = getRangePoints(dataset, 7);
    const daily = aggregateDaily(points);
    expect(daily.length).toBe(7);
    const totals = computeTotals(points);
    const dailySum = daily.reduce((acc, day) => acc + day.loadKwh, 0);
    expect(Math.abs(dailySum - totals.loadKwh)).toBeLessThan(1);
    expect(totals.co2Kg).toBeCloseTo(totals.gridKwh * 0.71, 1);
    expect(totals.solarSharePct).toBeGreaterThan(0);
    expect(totals.solarSharePct).toBeLessThan(100);
  });

  it("generates room alerts only for unexpected idle loads", () => {
    const roomAlerts = dataset.alerts.filter((a) => a.source === "room");
    expect(roomAlerts.length).toBeGreaterThan(0);
    for (const alert of roomAlerts) {
      expect(alert.occupancy === "Unoccupied" || alert.occupancy === "Scheduled vacant").toBe(true);
      expect(alert.powerKw).toBeGreaterThan(0);
      expect(alert.wastedKwh).toBeGreaterThan(0);
      expect(alert.reason.length).toBeGreaterThan(20);
      expect(alert.action.length).toBeGreaterThan(10);
      expect(alert.id.startsWith("alert-b-")).toBe(false);
    }
    const continuousRoomIds = ["L-105", "AD-108", "SF-05", "LB-07"];
    for (const roomId of continuousRoomIds) {
      expect(roomAlerts.some((alert) => alert.roomId === roomId)).toBe(false);
    }
  });

  it("keeps building summaries aligned with the range total", () => {
    const summaries = getBuildingSummaries(dataset, 7);
    const totals = computeTotals(getRangePoints(dataset, 7));
    const sum = summaries.reduce((acc, summary) => acc + summary.totalKwh, 0);
    expect(Math.abs(sum - totals.loadKwh)).toBeLessThan(2);
    expect(summaries.reduce((acc, summary) => acc + summary.sharePct, 0)).toBeCloseTo(100, 0);
  });
});

describe("forecasting model", () => {
  it("produces a 24-hour forecast with an honest backtest", () => {
    const series = getBuildingHourSeries(dataset, "campus");
    const forecast = generateForecast(series, "campus", "Campus total", 24);
    const predictions = forecast.points.filter((point) => point.isForecast);
    expect(predictions).toHaveLength(24);
    expect(forecast.backtestHours).toBe(72);
    expect(Number.isFinite(forecast.mae)).toBe(true);
    expect(Number.isFinite(forecast.mape)).toBe(true);
    expect(forecast.mae).toBeGreaterThan(0);
    expect(forecast.mape).toBeGreaterThan(0);
    // A deliberately loose upper bound: the model is simple, so the demo must
    // not pretend it is near-perfect. This catches regressions without
    // overstating real-world accuracy.
    expect(forecast.mape).toBeLessThan(25);
    for (const point of predictions) {
      expect(point.predicted).not.toBeNull();
      expect(point.predicted as number).toBeGreaterThan(0);
      expect(point.predicted as number).toBeLessThan(2000);
      expect(["Low", "Moderate", "High"]).toContain(point.demandClass);
      expect(point.lower as number).toBeLessThanOrEqual(point.upper as number);
    }
    expect(forecast.thresholds.low).toBeLessThan(forecast.thresholds.high);
    expect(forecast.next24TotalKwh).toBeGreaterThan(0);
    expect(forecast.nextHour.kwh).toBeGreaterThan(0);
  });

  it("recomputes per building and respects the selected horizon", () => {
    const series = getBuildingHourSeries(dataset, "labs");
    const forecast = generateForecast(series, "labs", "Computer Labs", 12);
    expect(forecast.points.filter((p) => p.isForecast)).toHaveLength(12);
    expect(forecast.entityLabel).toBe("Computer Labs");
    expect(forecast.next24TotalKwh).toBeGreaterThan(0);
  });
});

describe("recommendation engine", () => {
  it("derives actionable recommendations from the demo state", () => {
    const totals = computeTotals(getRangePoints(dataset, 7));
    const forecast = generateForecast(getBuildingHourSeries(dataset, "campus"), "campus", "Campus total", 24);
    const effectiveAlerts = dataset.alerts.map((alert) => ({ ...alert, status: "active" as const }));
    const recs = buildRecommendations({
      dataset,
      days: 7,
      totals,
      alerts: effectiveAlerts,
      forecast,
    });
    expect(recs.length).toBeGreaterThanOrEqual(3);
    expect(recs.some((rec) => rec.priority === "High")).toBe(true);
    for (const rec of recs) {
      expect(rec.title.length).toBeGreaterThan(5);
      expect(rec.action.length).toBeGreaterThan(10);
      expect(rec.evidence.length).toBeGreaterThan(10);
      expect(rec.impactKwhPerWeek).toBeGreaterThanOrEqual(0);
    }
  });
});
