import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import type { DemandClass, Severity } from "@/lib/types";
import { formatSignedPct } from "@/lib/utils";

/* ------------------------------------------------------------------ Card */

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return <Tag className={clsx("card", className)}>{children}</Tag>;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon: Icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Button */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type ButtonSize = "sm" | "md";

export function Button({
  children,
  variant = "secondary",
  size = "md",
  icon: Icon,
  className,
  loading,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 border border-brand-700/10",
    secondary:
      "bg-white text-ink-800 border border-line shadow-sm hover:border-ink-200 hover:bg-ink-50/60",
    ghost: "text-ink-600 hover:bg-ink-100/70 hover:text-ink-900 border border-transparent",
    danger: "bg-rose-600 text-white hover:bg-rose-700 border border-rose-700/10 shadow-sm",
    soft: "bg-brand-50 text-brand-800 border border-brand-100 hover:bg-brand-100",
  };
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-[38px] px-3.5 text-[13px]",
        variants[variant],
        className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : Icon ? (
        <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2} />
      ) : null}
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- Badge */

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue" | "violet" | "outline";
  className?: string;
  dot?: boolean;
}) {
  const tones = {
    neutral: "bg-ink-50 text-ink-600 ring-ink-200/70",
    green: "bg-brand-50 text-brand-700 ring-brand-200/70",
    amber: "bg-amber-50 text-amber-700 ring-amber-200/80",
    red: "bg-rose-50 text-rose-700 ring-rose-200/80",
    blue: "bg-sky-50 text-sky-700 ring-sky-200/80",
    violet: "bg-violet-50 text-violet-700 ring-violet-200/80",
    outline: "bg-white text-ink-500 ring-line",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" /> : null}
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const map = {
    critical: { tone: "red" as const, label: "Critical" },
    high: { tone: "amber" as const, label: "High" },
    medium: { tone: "blue" as const, label: "Medium" },
    low: { tone: "neutral" as const, label: "Low" },
  };
  return (
    <Badge tone={map[severity].tone} dot>
      {map[severity].label}
    </Badge>
  );
}

export function DemandBadge({ demandClass }: { demandClass: DemandClass }) {
  const tone = demandClass === "High" ? "red" : demandClass === "Moderate" ? "amber" : "green";
  return (
    <Badge tone={tone} dot>
      {demandClass} demand
    </Badge>
  );
}

/* ------------------------------------------------------------- Stat card */

export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  delta,
  deltaLabel,
  deltaUnit = "%",
  footnote,
  accent = "green",
  className,
  sparkline,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  delta?: number | null;
  deltaLabel?: string;
  deltaUnit?: "%" | "pts";
  footnote?: ReactNode;
  accent?: "green" | "blue" | "amber" | "navy";
  className?: string;
  sparkline?: number[];
}) {
  const accents = {
    green: "bg-brand-50 text-brand-700 ring-brand-100",
    blue: "bg-sky-50 text-sky-700 ring-sky-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    navy: "bg-ink-50 text-ink-700 ring-ink-100",
  };
  return (
    <Card className={clsx("relative overflow-hidden p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-ink-500">{label}</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="metric-value">{value}</span>
            {unit ? <span className="text-[12px] font-medium text-ink-400">{unit}</span> : null}
          </div>
        </div>
        <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset", accents[accent])}>
          <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
        </span>
      </div>
      <div className="mt-3.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {delta !== undefined ? <Delta value={delta} label={deltaLabel} unit={deltaUnit} /> : null}
          {footnote ? <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-400">{footnote}</p> : null}
        </div>
        {sparkline && sparkline.length > 1 ? (
          <Sparkline values={sparkline} className="h-8 w-20 shrink-0" />
        ) : null}
      </div>
    </Card>
  );
}

export function Delta({ value, label, unit = "%" }: { value: number | null; label?: string; unit?: "%" | "pts" }) {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-400">
        <Minus className="h-3 w-3" /> No prior comparison
      </span>
    );
  }
  const up = value > 0;
  const neutral = Math.abs(value) < 0.05;
  const display = unit === "%" ? formatSignedPct(value) : `${neutral ? "" : up ? "+" : ""}${Number(value.toFixed(1)).toFixed(1)} pts`;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
      <span
        className={clsx(
          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5",
          neutral ? "bg-ink-50 text-ink-500" : up ? "bg-rose-50 text-rose-700" : "bg-brand-50 text-brand-700",
        )}
      >
        {neutral ? (
          <Minus className="h-3 w-3" />
        ) : up ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : (
          <ArrowDownRight className="h-3 w-3" />
        )}
        {display}
      </span>
      <span className="text-ink-400">{label ?? "vs previous period"}</span>
    </span>
  );
}

/* -------------------------------------------------------------- Sparkline */

export function Sparkline({
  values,
  className,
  stroke = "#1ea467",
}: {
  values: number[];
  className?: string;
  stroke?: string;
}) {
  const width = 96;
  const height = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (width - 4) + 2;
      const y = height - 3 - ((v - min) / range) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const areaPoints = `2,${height - 2} ${points} ${width - 2},${height - 2}`;
  const id = `spark-${stroke.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------- Segmented */

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  className,
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={clsx(
        "inline-flex items-center gap-0.5 rounded-lg border border-line bg-ink-50/70 p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-[7px] font-medium transition-all duration-150",
              size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-[12px]",
              active
                ? "bg-white text-ink-900 shadow-sm ring-1 ring-inset ring-line"
                : "text-ink-500 hover:text-ink-800",
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={1.9} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- Feedback */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-50 text-ink-400 ring-1 ring-inset ring-line">
        <Icon className="h-5 w-5" strokeWidth={1.7} />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-ink-800">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} aria-hidden="true" />;
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="px-5 pb-5 pt-4 sm:px-6" style={{ height }} aria-hidden="true">
      <div className="flex h-full items-end gap-2">
        {[42, 60, 48, 74, 55, 82, 66, 90, 58, 72, 50, 78].map((h, i) => (
          <div key={i} className="skeleton flex-1 rounded-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- PageHeader */

export function PageHeader({
  eyebrow,
  title,
  description,
  descriptionClassName,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  descriptionClassName?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 pb-6 pt-1 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">{eyebrow}</p>
        ) : null}
        <h1 className="text-balance text-[1.65rem] font-semibold tracking-[-0.025em] text-ink-900 sm:text-[1.9rem]">
          {title}
        </h1>
        {description ? (
          <p
            className={clsx(
              "mt-1.5 text-pretty text-[13px] leading-relaxed text-ink-500",
              descriptionClassName ?? "max-w-2xl",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-ink-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="num text-right text-xs font-medium text-ink-800">{value}</dd>
    </div>
  );
}

export function InfoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx("text-[11px] leading-relaxed text-ink-400", className)}>{children}</p>
  );
}
