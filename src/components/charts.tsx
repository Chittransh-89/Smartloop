import type { ReactNode } from "react";
import clsx from "clsx";

export const CHART = {
  green: "#1ea467",
  greenSoft: "#9be1bf",
  blue: "#256c9e",
  blueSoft: "#b6d6e9",
  amber: "#d99a2b",
  amberSoft: "#f5d29a",
  violet: "#7c5cd6",
  violetSoft: "#d8cef4",
  gray: "#8598a3",
  grid: "#eaf0ee",
  axis: "#7c909c",
  ink: "#0b1f2a",
};

export interface TooltipEntry {
  name?: string;
  dataKey?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
  stroke?: string;
  fill?: string;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit = "kWh",
  decimals = 0,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  unit?: string;
  decimals?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as Record<string, unknown> | undefined;
  const heading = (row?.fullLabel as string | undefined) ?? String(label ?? "");
  const subheading = row?.subLabel as string | undefined;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">
        <span>{heading}</span>
        <span className="rounded bg-ink-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-400">
          Simulated
        </span>
      </div>
      {subheading ? <p className="mb-1.5 text-[10.5px] text-ink-400">{subheading}</p> : null}
      <div className="space-y-1">
        {payload
          .filter((entry) => entry.value !== null && entry.value !== undefined && entry.value !== "")
          .map((entry, index) => (
            <div key={`${String(entry.dataKey)}-${index}`} className="chart-tooltip-row">
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color ?? entry.stroke ?? CHART.green }}
                />
                {entry.name}
              </span>
              <span className="font-semibold tabular text-ink-900">
                {typeof entry.value === "number"
                  ? `${entry.value.toLocaleString("en-IN", {
                      minimumFractionDigits: decimals,
                      maximumFractionDigits: decimals,
                    })} ${unit}`
                  : String(entry.value)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; color: string; dashed?: boolean; value?: string }[];
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
          <span
            className={clsx("h-2 w-2 rounded-full", item.dashed && "rounded-none")}
            style={{ backgroundColor: item.color }}
          />
          {item.label}
          {item.value ? <span className="tabular text-ink-400">{item.value}</span> : null}
        </span>
      ))}
    </div>
  );
}

export function ChartNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 border-t border-line/70 px-5 pb-4 pt-3 text-[10.5px] leading-relaxed text-ink-400 sm:px-6">
      {children}
    </p>
  );
}

export const AXIS_PROPS = {
  tick: { fill: CHART.axis, fontSize: 10.5 },
  axisLine: false as const,
  tickLine: false as const,
};

export const GRID_PROPS = {
  stroke: CHART.grid,
  strokeDasharray: "3 3",
  vertical: false as const,
};
