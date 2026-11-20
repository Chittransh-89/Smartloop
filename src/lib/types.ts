export type BuildingId = "academic" | "labs" | "library" | "admin" | "student";

export type Severity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "active" | "acknowledged";
export type OccupancyState = "Occupied" | "Unoccupied" | "Scheduled vacant";
export type EquipmentState = "ON" | "OFF" | "STANDBY";
export type DemandClass = "Low" | "Moderate" | "High";

export interface BuildingMeta {
  id: BuildingId;
  name: string;
  short: string;
  category: string;
  description: string;
  areaM2: number;
  roomCount: number;
  color: string;
  baseKw: number;
  variableKw: number;
  acFactor: number;
}

export interface HourlyPoint {
  timestamp: number;
  dayKey: string;
  hour: number;
  loadKwh: number;
  solarKwh: number;
  solarUsedKwh: number;
  solarExcessKwh: number;
  gridKwh: number;
  generatorKwh: number;
  occupancyPct: number;
  temperatureC: number;
  weather: "Clear" | "Partly cloudy" | "Overcast" | "Light rain";
  generatorEvent: boolean;
}

export interface BuildingHour {
  timestamp: number;
  dayKey: string;
  hour: number;
  loadKwh: number;
  occupancyPct: number;
}

export interface Room {
  id: string;
  name: string;
  buildingId: BuildingId;
  type: string;
  capacity: number;
  occupancy: OccupancyState;
  occupancyPct: number;
  equipment: EquipmentState;
  equipmentDetail: string;
  powerKw: number;
  expectedContinuous: boolean;
  note: string;
}

export interface EnergyAlert {
  id: string;
  buildingId: BuildingId;
  roomId?: string;
  room: string;
  occupancy: OccupancyState | "—";
  equipment: string;
  powerKw: number;
  severity: Severity;
  detectedAt: number;
  durationHours: number;
  wastedKwh: number;
  rule: string;
  reason: string;
  action: string;
  status: AlertStatus;
  source: "room" | "building";
}

export interface Dataset {
  seed: string;
  generatedAt: number;
  anchorDate: string;
  anchorTimestamp: number;
  snapshotHour: number;
  days: number;
  buildings: BuildingMeta[];
  hourly: HourlyPoint[];
  buildingHourly: Record<BuildingId, BuildingHour[]>;
  rooms: Room[];
  alerts: EnergyAlert[];
  solarCapacityKwp: number;
  tariffPerKwh: number;
  emissionFactorKgPerKwh: number;
}

export interface DailyAggregate {
  dayKey: string;
  timestamp: number;
  label: string;
  shortLabel: string;
  loadKwh: number;
  solarKwh: number;
  solarUsedKwh: number;
  solarExcessKwh: number;
  gridKwh: number;
  generatorKwh: number;
  co2Kg: number;
  occupancyPct: number;
  isWeekend: boolean;
}

export interface Totals {
  loadKwh: number;
  solarUsedKwh: number;
  solarKwh: number;
  solarExcessKwh: number;
  gridKwh: number;
  generatorKwh: number;
  generatorHours: number;
  co2Kg: number;
  peakKw: number;
  peakTimestamp: number;
  avgOccupancyPct: number;
  solarSharePct: number;
  gridSharePct: number;
  generatorSharePct: number;
  greenSharePct: number;
}

export interface ForecastPoint {
  timestamp: number;
  label: string;
  fullLabel: string;
  actual: number | null;
  predicted: number | null;
  lower: number | null;
  upper: number | null;
  demandClass: DemandClass | null;
  isForecast: boolean;
}

export interface ForecastResult {
  entityId: string;
  entityLabel: string;
  horizonHours: number;
  generatedAt: number;
  points: ForecastPoint[];
  nextHour: { timestamp: number; kwh: number; demandClass: DemandClass };
  next24TotalKwh: number;
  peak: { timestamp: number; kwh: number; demandClass: DemandClass };
  dayDemandClass: DemandClass;
  mae: number;
  mape: number;
  backtestHours: number;
  thresholds: { low: number; high: number; median: number };
  method: string;
  summary: string;
  confidenceNote: string;
}
