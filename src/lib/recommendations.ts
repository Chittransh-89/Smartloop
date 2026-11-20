import type { Dataset, EnergyAlert, ForecastResult, Totals } from "./types";
import { getBuildingSummaries, getHourlyProfile, getRangePoints } from "./analytics";
import { formatDateTime, formatHour, round, sum } from "./utils";

export type RecommendationPriority = "High" | "Medium" | "Low";
export type RecommendationIcon = "power" | "alert" | "clock" | "sun" | "building" | "generator";

export interface Recommendation {
  id: string;
  priority: RecommendationPriority;
  category: string;
  title: string;
  description: string;
  action: string;
  evidence: string;
  impactKwhPerWeek: number;
  icon: RecommendationIcon;
}

interface RecommendationInput {
  dataset: Dataset;
  days: number;
  totals: Totals;
  alerts: EnergyAlert[];
  forecast: ForecastResult;
}

export function buildRecommendations({
  dataset,
  days,
  totals,
  alerts,
  forecast,
}: RecommendationInput): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const activeRoomAlerts = alerts.filter((a) => a.source === "room" && a.status === "active");
  const activeAlerts = alerts.filter((a) => a.status === "active");
  const roomWasteToday = round(sum(activeRoomAlerts.map((a) => a.wastedKwh)), 1);
  const dailyWasteEstimate = round(roomWasteToday, 1);

  if (activeRoomAlerts.length > 0) {
    recommendations.push({
      id: "rec-idle-rooms",
      priority: "High",
      category: "Waste reduction",
      title: `Clear idle loads in ${activeRoomAlerts.length} unoccupied rooms`,
      description:
        `${activeRoomAlerts.length} occupied-room rules are currently active. The largest is ${activeRoomAlerts[0].room} at ` +
        `${activeRoomAlerts[0].powerKw} kW. If these loads are left running for the rest of the simulated day, ` +
        `they would add roughly ${roomWasteToday} kWh of avoidable demand.`,
      action:
        "Start with a room-by-room shutdown sweep and enable 15-minute auto-sleep on lab and office equipment.",
      evidence: `Based on ${activeRoomAlerts.length} active R-01 room alerts · ${dailyWasteEstimate} kWh already identified today`,
      impactKwhPerWeek: round(dailyWasteEstimate * 7, 0),
      icon: "power",
    });
  }

  const highForecastHours = forecast.points.filter(
    (p) => p.isForecast && p.demandClass === "High",
  );
  if (highForecastHours.length > 0) {
    recommendations.push({
      id: "rec-peak",
      priority: "High",
      category: "Demand planning",
      title: `Prepare for a high-demand window at ${formatHour(new Date(forecast.peak.timestamp).getUTCHours())}`,
      description:
        `The forecast puts ${highForecastHours.length} upcoming hour${highForecastHours.length === 1 ? "" : "s"} in the High band, ` +
        `peaking at ${Math.round(forecast.peak.kwh)} kWh. Moving deferrable lab, charging or HVAC pre-cooling loads ` +
        `outside this window can reduce pressure on the campus supply.`,
      action:
        "Reschedule flexible loads by 60–90 minutes and pre-cool large rooms before the peak rather than during it.",
      evidence: `Forecast peak ${Math.round(forecast.peak.kwh)} kWh · ${formatDateTime(forecast.peak.timestamp)} · backtest MAPE ${forecast.mape}%`,
      impactKwhPerWeek: round(forecast.peak.kwh * 0.6, 0),
      icon: "clock",
    });
  }

  const rangePoints = getRangePoints(dataset, days);
  const solarProduced = round(sum(rangePoints.map((p) => p.solarKwh)), 1);
  const solarExcess = round(sum(rangePoints.map((p) => p.solarExcessKwh)), 1);
  const solarUsed = totals.solarUsedKwh;
  const utilisation = solarProduced > 0 ? (solarUsed / solarProduced) * 100 : 0;
  if (solarExcess > 0 || utilisation < 90) {
    recommendations.push({
      id: "rec-solar",
      priority: utilisation < 88 ? "Medium" : "Low",
      category: "Solar utilisation",
      title: "Shift flexible daytime loads into the solar window",
      description:
        `Solar supplied ${totals.solarSharePct}% of demand in this period. About ${Math.round(solarExcess)} kWh of solar ` +
        `generation had no campus load to serve during low-occupancy midday hours. Aligning lab sessions, EV/device ` +
        `charging and water heating with 10:00–15:00 can absorb more of that output.`,
      action:
        "Move deferrable loads to the 10:00–15:00 window and schedule high-power lab sessions when solar output is strongest.",
      evidence: `Solar used ${Math.round(solarUsed)} of ${Math.round(solarProduced)} kWh generated · ${utilisation.toFixed(1)}% utilisation`,
      impactKwhPerWeek: round((solarExcess / Math.max(1, days)) * 7, 0),
      icon: "sun",
    });
  } else {
    recommendations.push({
      id: "rec-solar-maintain",
      priority: "Low",
      category: "Solar utilisation",
      title: "Protect the strong solar contribution",
      description:
        `${totals.solarSharePct}% of consumed energy came from solar in this period, with ${utilisation.toFixed(1)}% of ` +
        `generation used on campus. Keep heavy daytime loads inside the solar window to preserve this performance.`,
      action: "Continue scheduling deferrable loads in daylight hours and review inverter performance monthly.",
      evidence: `Solar used ${Math.round(solarUsed)} kWh · ${totals.solarSharePct}% of demand`,
      impactKwhPerWeek: round((solarUsed / Math.max(1, days)) * 0.05 * 7, 0),
      icon: "sun",
    });
  }

  const buildings = getBuildingSummaries(dataset, days);
  const highestIntensity = [...buildings].sort(
    (a, b) => b.intensityKwhPerM2 - a.intensityKwhPerM2,
  )[0];
  if (highestIntensity) {
    recommendations.push({
      id: "rec-building",
      priority: "Medium",
      category: "Building performance",
      title: `Investigate ${highestIntensity.meta.name}'s energy intensity`,
      description:
        `${highestIntensity.meta.name} uses ${highestIntensity.intensityKwhPerM2} kWh/m² over the selected period — the highest ` +
        `intensity of the five simulated buildings. It accounts for ${highestIntensity.sharePct}% of campus demand and ` +
        `has ${highestIntensity.activeAlerts} active alert${highestIntensity.activeAlerts === 1 ? "" : "s"}.`,
      action:
        "Compare its operating schedule with the other buildings and inspect HVAC runtime and equipment idle loads.",
      evidence: `${highestIntensity.intensityKwhPerM2} kWh/m² · ${highestIntensity.totalKwh.toLocaleString("en-IN")} kWh in range`,
      impactKwhPerWeek: round((highestIntensity.totalKwh / Math.max(1, days)) * 0.05 * 7, 0),
      icon: "building",
    });
  }

  const profile = getHourlyProfile(rangePoints);
  const nightHours = profile.filter((p) => p.hour >= 1 && p.hour <= 5);
  const nightAvg = round(sum(nightHours.map((p) => p.avgKwh)) / Math.max(1, nightHours.length), 1);
  if (nightAvg > 0) {
    recommendations.push({
      id: "rec-night",
      priority: "Medium",
      category: "After-hours load",
      title: "Trim the overnight baseline",
      description:
        `Between 01:00 and 05:00 the simulated campus still draws an average of ${nightAvg} kWh per hour. Some of this is ` +
        `essential (servers, security, refrigeration), but unoccupied spaces and standby equipment can inflate it.`,
      action:
        "Audit after-hours loads in one building per week and label essential vs. avoidable night loads.",
      evidence: `01:00–05:00 average ${nightAvg} kWh/hour · ${totals.avgOccupancyPct}% average campus occupancy`,
      impactKwhPerWeek: round(nightAvg * 0.06 * 7, 0),
      icon: "clock",
    });
  }

  if (totals.generatorKwh > 0) {
    recommendations.push({
      id: "rec-generator",
      priority: "Low",
      category: "Backup readiness",
      title: "Review the simulated generator support windows",
      description:
        `The demo recorded ${totals.generatorHours} hour${totals.generatorHours === 1 ? "" : "s"} of backup-generator support and ` +
        `${Math.round(totals.generatorKwh)} kWh generated during the selected period. Generator energy is typically more ` +
        `carbon-intensive than grid supply, so it should remain a resilience measure rather than routine capacity.`,
      action:
        "Verify that the simulated drill windows are intentional and keep generator use documented as a backup event.",
      evidence: `${totals.generatorHours} h runtime · ${Math.round(totals.generatorKwh)} kWh · ${totals.generatorSharePct}% of supply`,
      impactKwhPerWeek: 0,
      icon: "generator",
    });
  }

  if (activeAlerts.length === 0) {
    recommendations.push({
      id: "rec-monitor",
      priority: "Low",
      category: "Monitoring",
      title: "No active anomalies — keep monitoring",
      description:
        "All simulated rooms are within their expected operating rules at the current snapshot. Continue monitoring the forecast and after-hours baseline.",
      action: "Re-check the alert queue after the next simulated occupancy change.",
      evidence: "Rule engine evaluated the current simulated snapshot",
      impactKwhPerWeek: 0,
      icon: "alert",
    });
  }

  const rank: Record<RecommendationPriority, number> = { High: 0, Medium: 1, Low: 2 };
  return recommendations.sort((a, b) => rank[a.priority] - rank[b.priority]);
}

export function recommendationToText(rec: Recommendation): string {
  return [
    `SmartLoop recommendation [${rec.priority}] — ${rec.title}`,
    rec.description,
    `Suggested action: ${rec.action}`,
    `Evidence: ${rec.evidence}`,
    rec.impactKwhPerWeek > 0
      ? `Illustrative weekly energy opportunity: ${rec.impactKwhPerWeek} kWh (simulated estimate, not a verified saving)`
      : "No quantified energy opportunity; operational recommendation.",
    "SmartLoop operates on simulated data. This is not a verified campus measurement.",
  ].join("\n");
}
