import type {
  AlertStatus,
  BuildingHour,
  BuildingId,
  BuildingMeta,
  Dataset,
  EnergyAlert,
  HourlyPoint,
  OccupancyState,
  Room,
  Severity,
} from "./types";
import {
  ANCHOR_ISO,
  EMISSION_FACTOR_KG_PER_KWH,
  HISTORY_DAYS,
  SNAPSHOT_HOUR,
  SOLAR_CAPACITY_KWP,
  clamp,
  dayKeyFromTs,
  hashSeed,
  isWeekendTs,
  mulberry32,
  round,
} from "./utils";

export const BUILDINGS: BuildingMeta[] = [
  {
    id: "academic",
    name: "Academic Block",
    short: "Academic",
    category: "Teaching & learning",
    description: "Lecture halls, smart classrooms and faculty offices across four floors.",
    areaM2: 6400,
    roomCount: 42,
    color: "#1ea467",
    baseKw: 16,
    variableKw: 88,
    acFactor: 0.12,
  },
  {
    id: "labs",
    name: "Computer Labs",
    short: "Labs",
    category: "Computing & research",
    description: "AI/ML lab, networking lab and high-density workstation rooms.",
    areaM2: 2800,
    roomCount: 18,
    color: "#1d6fb8",
    baseKw: 26,
    variableKw: 120,
    acFactor: 0.22,
  },
  {
    id: "library",
    name: "Library",
    short: "Library",
    category: "Learning commons",
    description: "Reading halls, digital resource zone and discussion rooms.",
    areaM2: 2200,
    roomCount: 12,
    color: "#7c5cd6",
    baseKw: 13,
    variableKw: 55,
    acFactor: 0.14,
  },
  {
    id: "admin",
    name: "Administrative Block",
    short: "Admin",
    category: "Administration",
    description: "Offices, accounts, records and meeting rooms.",
    areaM2: 1900,
    roomCount: 24,
    color: "#c27a1a",
    baseKw: 11,
    variableKw: 32,
    acFactor: 0.12,
  },
  {
    id: "student",
    name: "Student Facilities",
    short: "Facilities",
    category: "Campus life",
    description: "Cafeteria, student commons, gymnasium and innovation studio.",
    areaM2: 3100,
    roomCount: 16,
    color: "#d4505d",
    baseKw: 18,
    variableKw: 66,
    acFactor: 0.16,
  },
];

const WEATHER_OPTIONS: HourlyPoint["weather"][] = ["Clear", "Partly cloudy", "Overcast", "Light rain"];

const OCCUPANCY_WEIGHTS: Record<BuildingId, number> = {
  academic: 0.34,
  labs: 0.2,
  library: 0.12,
  admin: 0.13,
  student: 0.21,
};

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function windowProfile(hour: number, startA: number, startB: number, endA: number, endB: number): number {
  const h = hour + 0.5;
  return smoothstep(startA, startB, h) * (1 - smoothstep(endA, endB, h));
}

function occupancyFor(building: BuildingId, hour: number, weekend: boolean): number {
  switch (building) {
    case "academic":
      return weekend
        ? 0.05 + 0.13 * windowProfile(hour, 9, 11, 13, 16)
        : 0.04 + 0.94 * windowProfile(hour, 7.2, 9.2, 16.4, 18.6);
    case "labs":
      return weekend
        ? 0.18 + 0.48 * windowProfile(hour, 9, 11, 16, 18)
        : 0.12 + 0.86 * windowProfile(hour, 7.6, 9.2, 21, 22.4);
    case "library":
      return weekend
        ? 0.22 + 0.58 * windowProfile(hour, 9, 10.5, 17, 19)
        : 0.08 + 0.9 * windowProfile(hour, 7.6, 9, 21, 22.3);
    case "admin":
      return weekend
        ? 0.03
        : 0.03 + 0.93 * windowProfile(hour, 8.4, 9.3, 17, 18.4);
    case "student":
      return weekend
        ? 0.25 + 0.55 * windowProfile(hour, 8.5, 10.5, 21, 23)
        : 0.24 + 0.64 * windowProfile(hour, 6.6, 8.6, 21.8, 23.2);
    default:
      return 0.1;
  }
}

function weatherLabel(factor: number): HourlyPoint["weather"] {
  if (factor >= 0.88) return "Clear";
  if (factor >= 0.72) return "Partly cloudy";
  if (factor >= 0.55) return "Overcast";
  return "Light rain";
}

interface RoomTemplate {
  id: string;
  name: string;
  buildingId: BuildingId;
  type: string;
  capacity: number;
  equipmentDetail: string;
  baseKw: number;
  expectedContinuous?: boolean;
  override?: {
    occupancy: OccupancyState;
    equipment: "ON" | "OFF" | "STANDBY";
    powerKw: number;
    note: string;
  };
}

const ROOM_TEMPLATES: RoomTemplate[] = [
  // Academic Block
  { id: "A-101", name: "Lecture Hall A-101", buildingId: "academic", type: "Lecture hall", capacity: 90, equipmentDetail: "Lighting + 2 projectors", baseKw: 2.1 },
  { id: "A-203", name: "Smart Classroom A-203", buildingId: "academic", type: "Smart classroom", capacity: 60, equipmentDetail: "2 split ACs + display panels ON", baseKw: 2.4, override: { occupancy: "Unoccupied", equipment: "ON", powerKw: 2.4, note: "Timetable shows the room free since 12:00" } },
  { id: "A-105", name: "Seminar Room A-105", buildingId: "academic", type: "Seminar room", capacity: 45, equipmentDetail: "Projector + 12 lights ON", baseKw: 0.9, override: { occupancy: "Unoccupied", equipment: "ON", powerKw: 0.9, note: "No seminar scheduled this afternoon" } },
  { id: "A-208", name: "Tutorial Room A-208", buildingId: "academic", type: "Tutorial room", capacity: 35, equipmentDetail: "Lighting + displays", baseKw: 0.8 },
  { id: "A-310", name: "Faculty Room A-310", buildingId: "academic", type: "Faculty office", capacity: 12, equipmentDetail: "Workstations + AC", baseKw: 1.3 },
  // Computer Labs
  { id: "L-201", name: "AI & Data Lab L-201", buildingId: "labs", type: "Computer lab", capacity: 48, equipmentDetail: "18 workstation PCs + 2 projectors ON", baseKw: 3.4, override: { occupancy: "Unoccupied", equipment: "ON", powerKw: 3.4, note: "Lab session ended at 12:15" } },
  { id: "L-202", name: "Computer Lab L-202", buildingId: "labs", type: "Computer lab", capacity: 60, equipmentDetail: "30 workstations + AC", baseKw: 3.9 },
  { id: "L-204", name: "Networking Lab L-204", buildingId: "labs", type: "Networking lab", capacity: 30, equipmentDetail: "Lab switches + access points ON", baseKw: 1.7, override: { occupancy: "Unoccupied", equipment: "ON", powerKw: 1.7, note: "No practical class in progress" } },
  { id: "L-301", name: "Project Lab L-301", buildingId: "labs", type: "Project lab", capacity: 24, equipmentDetail: "Workstations + 3D printer", baseKw: 1.9 },
  { id: "L-105", name: "Server Room L-105", buildingId: "labs", type: "Server room", capacity: 0, equipmentDetail: "Racks + precision cooling", baseKw: 4.6, expectedContinuous: true },
  // Library
  { id: "LB-01", name: "Reading Hall LB-01", buildingId: "library", type: "Reading hall", capacity: 120, equipmentDetail: "Lighting + HVAC running", baseKw: 2.8, override: { occupancy: "Scheduled vacant", equipment: "ON", powerKw: 2.8, note: "Hall closed for floor maintenance" } },
  { id: "LB-02", name: "Digital Resource Zone", buildingId: "library", type: "Digital zone", capacity: 40, equipmentDetail: "24 thin clients + AC", baseKw: 2.2 },
  { id: "LB-04", name: "Discussion Room LB-04", buildingId: "library", type: "Discussion room", capacity: 12, equipmentDetail: "Display + lighting", baseKw: 0.6 },
  { id: "LB-07", name: "Archive Room", buildingId: "library", type: "Archive", capacity: 0, equipmentDetail: "Dehumidifier + lighting", baseKw: 0.7, expectedContinuous: true },
  // Admin
  { id: "AD-101", name: "Administrative Office AD-101", buildingId: "admin", type: "Office", capacity: 14, equipmentDetail: "PCs, printer + AC", baseKw: 1.6 },
  { id: "AD-204", name: "Accounts Office AD-204", buildingId: "admin", type: "Office", capacity: 8, equipmentDetail: "PCs, printer + AC ON", baseKw: 1.5, override: { occupancy: "Unoccupied", equipment: "ON", powerKw: 1.5, note: "Staff at lunch break until 14:30" } },
  { id: "AD-301", name: "Meeting Room AD-301", buildingId: "admin", type: "Meeting room", capacity: 18, equipmentDetail: "Meeting room AC ON", baseKw: 1.4, override: { occupancy: "Scheduled vacant", equipment: "ON", powerKw: 1.4, note: "No meeting booked this afternoon" } },
  { id: "AD-108", name: "Records Room AD-108", buildingId: "admin", type: "Records", capacity: 0, equipmentDetail: "Dehumidifier + lighting", baseKw: 0.5, expectedContinuous: true },
  // Student facilities
  { id: "SF-01", name: "Cafeteria", buildingId: "student", type: "Food service", capacity: 160, equipmentDetail: "Kitchen exhaust + display refrigerators ON", baseKw: 4.2, override: { occupancy: "Unoccupied", equipment: "ON", powerKw: 3.8, note: "Lunch service ended at 14:00" } },
  { id: "SF-02", name: "Student Commons", buildingId: "student", type: "Common room", capacity: 80, equipmentDetail: "Lighting + AC", baseKw: 1.8 },
  { id: "SF-03", name: "Gymnasium", buildingId: "student", type: "Sports", capacity: 50, equipmentDetail: "Lighting + ventilation", baseKw: 1.4 },
  { id: "SF-04", name: "Innovation Studio", buildingId: "student", type: "Maker space", capacity: 30, equipmentDetail: "Workstations + equipment", baseKw: 2.0 },
  { id: "SF-05", name: "Utility Room", buildingId: "student", type: "Utility", capacity: 0, equipmentDetail: "Pumps + water heating", baseKw: 1.2, expectedContinuous: true },
];

interface AlertTemplate {
  roomId: string;
  hour: number;
  minute: number;
  dayOffset: number;
  durationHours: number;
  severity: Severity;
  powerKw?: number;
  reason: string;
  action: string;
  status: AlertStatus;
}

const ALERT_TEMPLATES: AlertTemplate[] = [
  {
    roomId: "SF-01",
    hour: 13,
    minute: 55,
    dayOffset: 0,
    durationHours: 2.5,
    severity: "critical",
    reason: "Lunch service ended but kitchen exhaust and display refrigerators are still drawing power with no occupancy detected.",
    action: "Switch off non-essential kitchen equipment and move display units to the scheduled shutdown checklist.",
    status: "active",
  },
  {
    roomId: "L-201",
    hour: 13,
    minute: 40,
    dayOffset: 0,
    durationHours: 1.6,
    severity: "critical",
    reason: "Lab session ended at 12:15. Workstation PCs and projectors remain ON with the room unoccupied.",
    action: "Enable workstation auto-sleep after 15 minutes idle and verify the lab shutdown checklist.",
    status: "active",
  },
  {
    roomId: "A-203",
    hour: 12,
    minute: 25,
    dayOffset: 0,
    durationHours: 2.2,
    severity: "high",
    reason: "Timetable shows no class, but two split ACs and display panels are consuming power in an unoccupied room.",
    action: "Have the academic office switch off the AC units and confirm the timetable-linked HVAC rule.",
    status: "active",
  },
  {
    roomId: "LB-01",
    hour: 10,
    minute: 15,
    dayOffset: 0,
    durationHours: 3.4,
    severity: "critical",
    powerKw: 3.2,
    reason: "Reading hall is closed for maintenance, yet lighting and HVAC have been running for several hours.",
    action: "Turn off lighting and HVAC for the maintenance window; restore before the hall reopens.",
    status: "active",
  },
  {
    roomId: "AD-301",
    hour: 11,
    minute: 5,
    dayOffset: 0,
    durationHours: 2.0,
    severity: "high",
    powerKw: 1.6,
    reason: "No meeting is booked, but the meeting room AC is ON and the room is scheduled vacant.",
    action: "Switch off the AC and add room-booking integration to the HVAC schedule.",
    status: "active",
  },
  {
    roomId: "L-204",
    hour: 9,
    minute: 35,
    dayOffset: 0,
    durationHours: 3.0,
    severity: "high",
    reason: "Networking lab is unoccupied with switches and access points drawing more than the expected idle load.",
    action: "Separate always-on network equipment from lab power circuits and schedule the remainder to shut down.",
    status: "active",
  },
  {
    roomId: "AD-204",
    hour: 12,
    minute: 50,
    dayOffset: 0,
    durationHours: 1.5,
    severity: "medium",
    powerKw: 1.4,
    reason: "Accounts office is empty during the lunch break while PCs, printer and AC remain ON.",
    action: "Enable sleep mode on office PCs and set a lunch-break AC setback.",
    status: "active",
  },
  {
    roomId: "A-105",
    hour: 9,
    minute: 45,
    dayOffset: 0,
    durationHours: 2.6,
    severity: "medium",
    reason: "Seminar room has no booking but the projector and 12 lights are still ON.",
    action: "Assign room-level accountability for shutdown and add a projector auto-off timer.",
    status: "active",
  },
  {
    roomId: "L-201",
    hour: 19,
    minute: 25,
    dayOffset: 1,
    durationHours: 5.5,
    severity: "high",
    powerKw: 2.4,
    reason: "After-hours total for this lab was 31% above its usual weekday baseline, with equipment left on until late evening.",
    action: "Review the evening lab schedule and enable a 19:00 shutdown sweep on weekdays.",
    status: "acknowledged",
  },
  {
    roomId: "LB-01",
    hour: 21,
    minute: 40,
    dayOffset: 1,
    durationHours: 2.5,
    severity: "high",
    powerKw: 2.8,
    reason: "Library HVAC continued running after closing, consuming above the usual closing-hour baseline.",
    action: "Link HVAC to the library closing schedule with a 20-minute cooldown.",
    status: "acknowledged",
  },
  {
    roomId: "SF-02",
    hour: 23,
    minute: 10,
    dayOffset: 2,
    durationHours: 4.0,
    severity: "medium",
    reason: "Student commons lighting and AC stayed on past midnight while occupancy sensors reported no movement.",
    action: "Apply an after-midnight lighting schedule and motion-based AC setback.",
    status: "acknowledged",
  },
  {
    roomId: "AD-101",
    hour: 20,
    minute: 5,
    dayOffset: 2,
    durationHours: 3.0,
    severity: "low",
    reason: "A small standby load persisted after office hours, slightly above the expected night baseline.",
    action: "Check printer and display standby settings; a small persistent load can add up over a month.",
    status: "acknowledged",
  },
];

function roomForTemplate(template: RoomTemplate, occupied: boolean): Room {
  if (template.override) {
    return {
      id: template.id,
      name: template.name,
      buildingId: template.buildingId,
      type: template.type,
      capacity: template.capacity,
      occupancy: template.override.occupancy,
      occupancyPct: 0,
      equipment: template.override.equipment,
      equipmentDetail: template.equipmentDetail,
      powerKw: template.override.powerKw,
      expectedContinuous: Boolean(template.expectedContinuous),
      note: template.override.note,
    };
  }
  return {
    id: template.id,
    name: template.name,
    buildingId: template.buildingId,
    type: template.type,
    capacity: template.capacity,
    occupancy: occupied ? "Occupied" : "Unoccupied",
    occupancyPct: occupied ? 55 : 0,
    equipment: occupied ? "ON" : "STANDBY",
    equipmentDetail: template.equipmentDetail,
    powerKw: occupied ? template.baseKw : round(template.baseKw * 0.12, 1),
    expectedContinuous: Boolean(template.expectedContinuous),
    note: occupied ? "In use as scheduled" : template.expectedContinuous ? "Always-on equipment area" : "Standby — within expected range",
  };
}

export function generateDataset(seed = "smartloop-demo-v1"): Dataset {
  const rand = mulberry32(hashSeed(seed));
  const days = HISTORY_DAYS;
  const anchorDayStart = Date.UTC(2026, 10, 18, 0, 0, 0); // 18 Nov 2026, simulated campus date
  const startDay = anchorDayStart - (days - 1) * 86_400_000;
  const anchorTimestamp = anchorDayStart + 23 * 3_600_000;

  const hourly: HourlyPoint[] = [];
  const buildingHourly = Object.fromEntries(
    BUILDINGS.map((b) => [b.id, [] as BuildingHour[]]),
  ) as Record<BuildingId, BuildingHour[]>;

  // Day-level weather evolves smoothly instead of jumping randomly each day.
  const weatherByDay: number[] = [];
  let weatherState = 0.84;
  for (let d = 0; d < days; d += 1) {
    weatherState = clamp(weatherState + (rand() - 0.45) * 0.15, 0.5, 1);
    if (rand() < 0.09) weatherState = clamp(weatherState - 0.16, 0.45, 0.9);
    weatherByDay.push(weatherState);
  }

  // Pick two simulated backup-generator drill windows in the final two weeks.
  const generatorEvents: Record<number, number> = {};
  const usedEventDays = new Set<number>();
  for (let attempt = 0; attempt < 30 && Object.keys(generatorEvents).length < 2; attempt += 1) {
    const dayIndex = days - 1 - Math.floor(rand() * 13);
    if (usedEventDays.has(dayIndex)) continue;
    usedEventDays.add(dayIndex);
    generatorEvents[dayIndex] = rand() < 0.5 ? 18 : 19;
  }

  // A few deliberate above-baseline load events in the last two days give the
  // rule engine realistic building-level anomalies to detect.
  const buildingSpikes: Partial<Record<BuildingId, { dayIndex: number; hour: number; factor: number }>> = {};
  const spikeCandidates = [...BUILDINGS];
  for (let i = 0; i < 3; i += 1) {
    const pickIndex = Math.floor(rand() * spikeCandidates.length);
    const [building] = spikeCandidates.splice(pickIndex, 1);
    buildingSpikes[building.id] = {
      dayIndex: days - 1 - Math.floor(rand() * 2),
      hour: 10 + Math.floor(rand() * 8),
      factor: 1.3 + rand() * 0.16,
    };
  }

  for (let d = 0; d < days; d += 1) {
    const dayStart = startDay + d * 86_400_000;
    const dayKey = dayKeyFromTs(dayStart);
    const weekend = isWeekendTs(dayStart);
    const weatherFactor = weatherByDay[d];
    const weather = weatherLabel(weatherFactor);
    const dayTempOffset = (rand() - 0.5) * 3;

    const loads: Record<BuildingId, number> = {
      academic: 0,
      labs: 0,
      library: 0,
      admin: 0,
      student: 0,
    };
    const occupancies: Record<BuildingId, number> = {
      academic: 0,
      labs: 0,
      library: 0,
      admin: 0,
      student: 0,
    };
    const temps: number[] = [];

    for (let hour = 0; hour < 24; hour += 1) {
      const timestamp = dayStart + hour * 3_600_000;
      const temperature = round(
        21.5 + 6.5 * Math.cos(((hour - 15) / 24) * Math.PI * 2) + dayTempOffset + (rand() - 0.5) * 0.8,
        1,
      );
      temps.push(temperature);

      for (const building of BUILDINGS) {
        const occ = occupancyFor(building.id, hour, weekend);
        const occupancyPct = round(occ * 100, 1);
        const acMultiplier = 1 + building.acFactor * (Math.max(0, temperature - 26) / 8);
        const noise = 1 + (rand() - 0.5) * 0.07;
        let load = (building.baseKw + building.variableKw * occ * acMultiplier) * noise;
        const spike = buildingSpikes[building.id];
        if (spike && spike.dayIndex === d && spike.hour === hour) {
          load *= spike.factor;
        }
        loads[building.id] = round(load, 2);
        occupancies[building.id] = occupancyPct;
        buildingHourly[building.id].push({
          timestamp,
          dayKey,
          hour,
          loadKwh: round(load, 2),
          occupancyPct,
        });
      }

      const totalLoad = round(
        BUILDINGS.reduce((acc, b) => acc + loads[b.id], 0),
        2,
      );
      const solarShape = Math.max(0, Math.sin((Math.PI * (hour + 0.5 - 6.2)) / 11.6));
      const solarKwh = round(SOLAR_CAPACITY_KWP * 0.84 * weatherFactor * solarShape, 2);
      const solarUsedKwh = round(Math.min(totalLoad, solarKwh), 2);
      const solarExcessKwh = round(Math.max(0, solarKwh - totalLoad), 2);

      const generatorEvent = generatorEvents[d] === hour;
      const generatorKwh = generatorEvent ? totalLoad : 0;
      const gridKwh = generatorEvent ? 0 : round(Math.max(0, totalLoad - solarUsedKwh), 2);

      const campusOccupancy = round(
        BUILDINGS.reduce((acc, b) => acc + occupancies[b.id] * OCCUPANCY_WEIGHTS[b.id], 0),
        1,
      );

      hourly.push({
        timestamp,
        dayKey,
        hour,
        loadKwh: totalLoad,
        solarKwh,
        solarUsedKwh,
        solarExcessKwh,
        gridKwh,
        generatorKwh,
        occupancyPct: campusOccupancy,
        temperatureC: temperature,
        weather,
        generatorEvent,
      });
    }
  }

  const snapshotIndex = hourly.findIndex(
    (point) => point.timestamp === anchorDayStart + SNAPSHOT_HOUR * 3_600_000,
  );
  const snapshotOccupancy = snapshotIndex >= 0 ? hourly[snapshotIndex].occupancyPct : 0.6;

  const rooms: Room[] = ROOM_TEMPLATES.map((template) => {
    const buildingOcc = occupancyFor(template.buildingId, SNAPSHOT_HOUR, false);
    const occupied = template.expectedContinuous
      ? true
      : buildingOcc > 0.45 && rand() > 0.22;
    return roomForTemplate(template, occupied && snapshotOccupancy > 0);
  });

  const alerts: EnergyAlert[] = ALERT_TEMPLATES.map((template, index): EnergyAlert => {
    const room = ROOM_TEMPLATES.find((r) => r.id === template.roomId);
    const detectedAt =
      anchorDayStart +
      template.dayOffset * -86_400_000 +
      template.hour * 3_600_000 +
      template.minute * 60_000;
    const powerKw = room?.override?.powerKw ?? room?.baseKw ?? 1;
    return {
      id: `alert-${String(index + 1).padStart(2, "0")}`,
      buildingId: room?.buildingId ?? "academic",
      roomId: room?.id,
      room: room?.name ?? "Campus",
      occupancy: room?.override?.occupancy ?? "Unoccupied",
      equipment: room?.equipmentDetail ?? "Equipment ON",
      powerKw: round(powerKw, 1),
      severity: template.severity,
      detectedAt,
      durationHours: template.durationHours,
      wastedKwh: round(powerKw * template.durationHours, 1),
      rule: template.severity === "critical" || template.severity === "high" ? "R-01 · Unoccupied room with active load" : "R-01 · Unoccupied room with standby load",
      reason: template.reason,
      action: template.action,
      status: template.status,
      source: "room",
    };
  }).filter((alert) => alert.room !== "Campus");

  // Transparent building-level anomaly rule: compare each hour to the building's
  // same-hour, same-day-type baseline from the preceding three weeks.
  const buildingAnomalies: EnergyAlert[] = [];
  for (const building of BUILDINGS) {
    const series = buildingHourly[building.id];
    let best: { hour: BuildingHour; excessKw: number; expectedKw: number } | null = null;
    for (let i = series.length - 72; i < series.length; i += 1) {
      const point = series[i];
      if (!point) continue;
      const weekend = isWeekendTs(point.timestamp);
      const baselineValues = series
        .slice(Math.max(0, i - 21 * 24), i - 24)
        .filter((p) => p.hour === point.hour && isWeekendTs(p.timestamp) === weekend)
        .map((p) => p.loadKwh);
      if (baselineValues.length < 6) continue;
      const baseline = baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length;
      const excess = point.loadKwh - baseline;
      const ratio = point.loadKwh / Math.max(1, baseline);
      if (ratio > 1.18 && excess > 4 && (!best || excess > best.excessKw)) {
        best = { hour: point, excessKw: round(excess, 1), expectedKw: round(baseline, 1) };
      }
    }
    if (!best) continue;
    const severity: Severity = best.excessKw >= 42 ? "high" : best.excessKw >= 22 ? "medium" : "low";
    buildingAnomalies.push({
      id: `alert-b-${building.id}`,
      buildingId: building.id,
      room: `${building.name} · whole building`,
      occupancy: "—",
      equipment: "Building load profile",
      powerKw: best.excessKw,
      severity,
      detectedAt: best.hour.timestamp + 45 * 60_000,
      durationHours: 1,
      wastedKwh: best.excessKw,
      rule: "R-02 · Consumption above same-hour baseline",
      reason: `Consumption reached ${round(best.hour.loadKwh, 0)} kWh in hour ${String(best.hour.hour).padStart(2, "0")}:00 versus a typical ${best.expectedKw} kWh for this hour and day type.`,
      action: "Review HVAC scheduling and after-hours equipment use in this building. Confirm whether the load was operationally required.",
      status: best.hour.timestamp >= anchorDayStart - 86_400_000 ? "active" : "acknowledged",
      source: "building",
    });
  }

  const allAlerts = [...alerts, ...buildingAnomalies].sort((a, b) => b.detectedAt - a.detectedAt);

  return {
    seed,
    generatedAt: Date.now(),
    anchorDate: ANCHOR_ISO,
    anchorTimestamp,
    snapshotHour: SNAPSHOT_HOUR,
    days,
    buildings: BUILDINGS,
    hourly,
    buildingHourly,
    rooms,
    alerts: allAlerts,
    solarCapacityKwp: SOLAR_CAPACITY_KWP,
    tariffPerKwh: 8.1,
    emissionFactorKgPerKwh: EMISSION_FACTOR_KG_PER_KWH,
  };
}

export function randomSeed(): string {
  return `smartloop-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function getWeatherOptions(): string[] {
  return WEATHER_OPTIONS;
}
