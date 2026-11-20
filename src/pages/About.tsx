import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BatteryCharging,
  BellRing,
  BrainCircuit,
  Building2,
  CheckCircle2,
  CircuitBoard,
  CloudSun,
  Database,
  FlaskConical,
  Gauge,
  Layers,
  Leaf,
  ListChecks,
  Lock,
  Radar,
  Recycle,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";
import { useData } from "@/state/DataContext";
import { computeTotals, getRangePoints } from "@/lib/analytics";
import { formatFullDate, formatNumber, round } from "@/lib/utils";
import { Badge, Card, CardHeader, InfoNote, SectionTitle } from "@/components/ui";

const PROBLEM_CARDS = [
  {
    icon: Radar,
    title: "Consumption is invisible",
    body: "Campus electricity is usually reviewed monthly through a bill. By then, wasteful operating patterns have already repeated for weeks.",
  },
  {
    icon: BellRing,
    title: "Waste is found late",
    body: "Empty labs with PCs running or halls cooled after closing are hard to spot without room-level context and timely signals.",
  },
  {
    icon: TrendingUp,
    title: "Peaks are a surprise",
    body: "Without a demand outlook, scheduling tomorrow's high-power sessions becomes reactive rather than planned.",
  },
  {
    icon: Sun,
    title: "Solar is under-observed",
    body: "Solar generation without visible self-consumption data makes it hard to align flexible loads with the sunniest hours.",
  },
];

const STEPS = [
  {
    title: "Simulate the campus",
    body: "A seeded engine generates 63 days of hourly demand for five buildings, room-level snapshots, solar output, weather conditions, occupancy and generator drill windows.",
    icon: Database,
  },
  {
    title: "Analyse and forecast",
    body: "Hourly data is aggregated into daily and building views. A weekly-seasonal model projects the next 12–24 hours, while transparent rules scan for idle-room load and above-baseline consumption.",
    icon: BrainCircuit,
  },
  {
    title: "Explain the signal",
    body: "Each alert shows the rule, evidence, severity and a recommended action. Recommendations quote the demo figures that produced them, so nothing is a black box.",
    icon: LightbulbIcon,
  },
  {
    title: "Support a decision",
    body: "Operators can filter alerts, acknowledge them and read a prioritised action list. The dashboard ties energy, solar, cost and carbon together in one operating view.",
    icon: ListChecks,
  },
];

function LightbulbIcon(props: { className?: string }) {
  return <Sparkles {...props} />;
}

const STACK = [
  { name: "React 18", role: "UI", icon: Layers },
  { name: "TypeScript 5", role: "Type safety", icon: ShieldCheck },
  { name: "Vite 6", role: "Build", icon: Zap },
  { name: "Tailwind CSS 3", role: "Design system", icon: Recycle },
  { name: "Recharts 2", role: "Charts", icon: BarChart3 },
  { name: "React Router 6", role: "Navigation", icon: ArrowRight },
  { name: "Lucide", role: "Icons", icon: Sparkles },
  { name: "Vitest 2", role: "Tests", icon: CheckCircle2 },
];

const LIMITATIONS = [
  "Every reading is simulated. SmartLoop is not connected to HCST meters, bills, IoT sensors or campus systems.",
  "The forecast is a transparent weekly-seasonal baseline, not a trained ML model. Its reported error is a backtest on simulated data only.",
  "Alerts use deterministic rules, not a trained anomaly-detection model. Severity thresholds are design choices.",
  "Weather, holidays, exams and equipment faults are approximated in the generator but not modelled by the forecast.",
  "CO₂ and cost figures are illustrative estimates using a flat grid factor and tariff; they are not verified environmental or financial outcomes.",
  "There is no authentication, database or multi-user persistence. Acknowledgements reset with the demo session or dataset.",
  "Building areas and room inventories are hypothetical and used only for relative intensity comparisons.",
];

const FUTURE = [
  {
    icon: Wifi,
    title: "Live meter integration",
    body: "Connect Modbus/MQTT smart meters and room sensors through a secure ingestion layer, with data-quality checks before scoring.",
  },
  {
    icon: CloudSun,
    title: "Weather-aware forecasting",
    body: "Add temperature, humidity and solar irradiance features, then benchmark gradient boosting against the seasonal baseline.",
  },
  {
    icon: BatteryCharging,
    title: "Flexible load orchestration",
    body: "Coordinate EV charging, battery storage and deferrable HVAC/lab loads around solar availability and forecast peaks.",
  },
  {
    icon: BrainCircuit,
    title: "Human-reviewed AI briefs",
    body: "Use an LLM to draft weekly sustainability briefs from verified analytics, always with source figures and human sign-off.",
  },
  {
    icon: Building2,
    title: "Multi-campus portfolio view",
    body: "Normalise energy intensity and carbon metrics across sites, with role-based access for facility teams.",
  },
  {
    icon: Lock,
    title: "Privacy and governance",
    body: "Occupancy signals can be inferred without cameras; add retention limits, access control and audit logs before any pilot.",
  },
];

export default function About() {
  const { dataset, seed, regenerate } = useData();
  const monthTotals = computeTotals(getRangePoints(dataset, 30));
  const fivePercentKwh = round(monthTotals.loadKwh * 0.05, 0);
  const fivePercentCo2 = round(fivePercentKwh * dataset.emissionFactorKgPerKwh, 0);
  const fivePercentCost = round(fivePercentKwh * dataset.tariffPerKwh, 0);
  const totalHourlyReadings = dataset.days * 24;

  return (
    <div className="animate-fade-up">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-ink-900 px-5 py-8 text-white shadow-lift sm:px-8 sm:py-10">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #41be83, transparent 70%)" }}
        />
        <div className="relative grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-brand-200 ring-1 ring-inset ring-brand-300/30">
                <Leaf className="h-3 w-3" /> Green Skills &amp; Applied AI
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 ring-1 ring-inset ring-white/10">
                Phase 2 prototype
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-amber-200 ring-1 ring-inset ring-white/10">
                <FlaskConical className="h-3 w-3" /> Demo mode
              </span>
            </div>
            <h1 className="mt-4 text-balance text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[2.45rem]">
              Make campus energy visible, predictable and actionable.
            </h1>
            <p className="mt-3 max-w-xl text-pretty text-[13px] leading-relaxed text-white/60">
              SmartLoop is a working prototype for AI-enabled campus energy monitoring and demand forecasting. It turns
              simulated smart-meter and room data into a clear operating picture — then explains what to do next.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link
                to="/"
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-500 px-4 text-[12.5px] font-semibold text-ink-900 transition-colors hover:bg-brand-400"
              >
                Explore the dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/forecast"
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-[12.5px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                How forecasting works
              </Link>
              <a
                href="#limitations"
                className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-[12px] font-medium text-white/50 transition-colors hover:text-white/80"
              >
                Limitations
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white/40">System flow</p>
            <div className="mt-3 space-y-2.5">
              {[
                { icon: Database, label: "Simulated campus telemetry", meta: `${totalHourlyReadings.toLocaleString("en-IN")} hourly readings · ${dataset.rooms.length} rooms` },
                { icon: BrainCircuit, label: "Rules + forecast engine", meta: "R-01 / R-02 · 24h seasonal model" },
                { icon: Gauge, label: "Decision workspace", meta: "Dashboard · forecast · alerts · insights" },
                { icon: Target, label: "Prioritised actions", meta: "Human-reviewed · evidence attached" },
              ].map((layer, index) => (
                <div key={layer.label} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.08] text-brand-300 ring-1 ring-inset ring-white/10">
                    <layer.icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-white/90">{layer.label}</p>
                    <p className="text-[9.5px] text-white/40">{layer.meta}</p>
                  </div>
                  {index < 3 ? <span className="text-[10px] text-white/20">→</span> : <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />}
                </div>
              ))}
            </div>
            <p className="mt-3 border-t border-white/10 pt-2.5 text-[9px] leading-relaxed text-white/40">
              Runs entirely in the browser. No cloud account, API key or paid service required.
            </p>
          </div>
        </div>
      </section>

      {/* Impact strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 shadow-card sm:grid-cols-4">
        {[
          { value: `${dataset.days} days`, label: "Simulated history" },
          { value: `${dataset.buildings.length} buildings`, label: "Campus coverage" },
          { value: `${dataset.rooms.length} rooms`, label: "Room-level snapshots" },
          { value: "0", label: "Live sensors connected" },
        ].map((item) => (
          <div key={item.label} className="text-center sm:text-left">
            <p className="num text-[15px] font-semibold tracking-[-0.01em] text-ink-900">{item.value}</p>
            <p className="text-[10px] text-ink-400">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Problem + solution */}
      <section className="mt-8">
        <SectionTitle
          title="The problem"
          description="Campuses have meters, but rarely a timely, room-level picture of what the energy is doing."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PROBLEM_CARDS.map((card) => (
            <Card key={card.title} className="p-4">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-50 text-ink-600 ring-1 ring-inset ring-line">
                <card.icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <h3 className="mt-2.5 text-[12.5px] font-semibold text-ink-800">{card.title}</h3>
              <p className="mt-1 text-[10.5px] leading-relaxed text-ink-500">{card.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-brand-200/70 bg-brand-50/60 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-inset ring-brand-100">
            <Recycle className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-[12.5px] font-semibold text-brand-950">The proposed solution</p>
            <p className="mt-1 max-w-4xl text-[11px] leading-relaxed text-brand-900/70">
              A single operating layer that combines consumption, solar, occupancy and equipment state; forecasts the
              next day of demand; flags avoidable waste with explainable rules; and converts those signals into a
              prioritised sustainability action list. Built to be demonstrated today and extended to real telemetry
              later.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-8">
        <SectionTitle
          title="How SmartLoop works"
          description="From a reproducible demo dataset to an explainable decision — four transparent stages."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-7">
            <div className="space-y-0 p-5 sm:p-6">
              {STEPS.map((step, index) => (
                <div key={step.title} className="flex gap-3.5 pb-5 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-900 text-[11px] font-semibold text-brand-300">
                      {index + 1}
                    </span>
                    {index < STEPS.length - 1 ? <span className="mt-1 w-px flex-1 bg-line" /> : null}
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-2">
                      <step.icon className="h-3.5 w-3.5 text-brand-600" />
                      <p className="text-[12.5px] font-semibold text-ink-900">{step.title}</p>
                    </div>
                    <p className="mt-1 text-[10.5px] leading-relaxed text-ink-500">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="xl:col-span-5">
            <CardHeader icon={CircuitBoard} title="Architecture at a glance" subtitle="Static frontend · no backend required" />
            <div className="space-y-2 px-5 pb-5 pt-4 sm:px-6">
              {[
                { label: "Experience layer", value: "React SPA, responsive sidebar, routed pages", tone: "green" },
                { label: "Analysis layer", value: "Aggregations, rule engine, forecaster, recommendations", tone: "blue" },
                { label: "Data layer", value: "Seeded in-browser simulation (63 days × 24 h)", tone: "amber" },
                { label: "External services", value: "None — no API keys, paid APIs or cloud dependencies", tone: "neutral" },
              ].map((layer) => (
                <div key={layer.label} className="rounded-lg border border-line bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">{layer.label}</p>
                    <Badge tone={layer.tone as "green" | "blue" | "amber" | "neutral"}>{layer.tone === "neutral" ? "offline" : "in-browser"}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-ink-700">{layer.value}</p>
                </div>
              ))}
              <p className="pt-1 text-[9.5px] leading-relaxed text-ink-400">
                The code is split into <span className="font-mono text-ink-500">lib/</span> (simulation, forecasting,
                analytics, recommendations), <span className="font-mono text-ink-500">components/</span> (design system
                and layout) and <span className="font-mono text-ink-500">pages/</span> (five routed views).
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Stack */}
      <section className="mt-8">
        <SectionTitle title="Technology stack" description="Chosen for reliable local development and simple static deployment." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STACK.map((tech) => (
            <div key={tech.name} className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5 shadow-card">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-600">
                <tech.icon className="h-3.5 w-3.5" strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-ink-800">{tech.name}</p>
                <p className="text-[9.5px] text-ink-400">{tech.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Impact */}
      <section className="mt-8">
        <SectionTitle
          title="Expected environmental impact"
          description="Potential benefits of better visibility and planning — not achieved or verified outcomes."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-7">
            <CardHeader icon={Leaf} title="Where SmartLoop could help" subtitle="Directional benefits, subject to real-world validation" />
            <div className="grid grid-cols-1 gap-2.5 px-5 pb-5 pt-4 sm:grid-cols-2 sm:px-6">
              {[
                { icon: Gauge, text: "Improved awareness of where and when campus energy is used." },
                { icon: BellRing, text: "Earlier identification of avoidable idle-room consumption." },
                { icon: TrendingUp, text: "Better planning for forecast demand peaks and backup readiness." },
                { icon: Sun, text: "Improved utilisation of solar generation in daylight hours." },
                { icon: Target, text: "Evidence to support sustainability decisions and prioritise upgrades." },
                { icon: BarChart3, text: "A consistent baseline for tracking initiatives over time." },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-2 rounded-lg bg-ink-50/60 px-2.5 py-2">
                  <item.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                  <p className="text-[10.5px] leading-relaxed text-ink-600">{item.text}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="xl:col-span-5">
            <CardHeader icon={FlaskConical} title="Illustrative calculation" subtitle="Transparent assumptions, clearly hypothetical" />
            <div className="px-5 pb-5 pt-4 sm:px-6">
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3">
                <p className="text-[10.5px] leading-relaxed text-amber-900">
                  If <span className="font-semibold">5%</span> of the last 30 simulated days of demand were avoided, the
                  demo would show roughly:
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white/70 px-2 py-2">
                    <p className="num text-sm font-semibold text-ink-900">{formatNumber(fivePercentKwh)}</p>
                    <p className="text-[8.5px] text-ink-400">kWh</p>
                  </div>
                  <div className="rounded-lg bg-white/70 px-2 py-2">
                    <p className="num text-sm font-semibold text-ink-900">{formatNumber(fivePercentCo2)}</p>
                    <p className="text-[8.5px] text-ink-400">kg CO₂e</p>
                  </div>
                  <div className="rounded-lg bg-white/70 px-2 py-2">
                    <p className="num text-sm font-semibold text-ink-900">₹{formatNumber(fivePercentCost)}</p>
                    <p className="text-[8.5px] text-ink-400">illustrative</p>
                  </div>
                </div>
              </div>
              <dl className="mt-3 divide-y divide-line/60 text-[10.5px]">
                <div className="flex items-center justify-between py-2">
                  <dt className="text-ink-500">Grid emission factor</dt>
                  <dd className="font-medium text-ink-800">0.71 kg CO₂e/kWh</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-ink-500">Demo tariff</dt>
                  <dd className="font-medium text-ink-800">₹{dataset.tariffPerKwh.toFixed(2)}/kWh</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-ink-500">Solar capacity (simulated)</dt>
                  <dd className="font-medium text-ink-800">{dataset.solarCapacityKwp} kWp</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-ink-500">CO₂ avoided by solar (30d)</dt>
                  <dd className="font-medium text-ink-800">
                    {formatNumber(round(monthTotals.solarUsedKwh * dataset.emissionFactorKgPerKwh, 0))} kg
                  </dd>
                </div>
              </dl>
              <InfoNote className="mt-2">
                These are illustrative calculations using simulated data and flat factors. They are not verified
                environmental or financial outcomes and do not represent HCST measurements or savings.
              </InfoNote>
            </div>
          </Card>
        </div>
      </section>

      {/* Demo scenario */}
      <section className="mt-8">
        <SectionTitle title="Sample demo scenario" description="A short walkthrough of what evaluators can reproduce." />
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-12">
            <div className="border-b border-line p-5 sm:p-6 xl:col-span-7 xl:border-b-0 xl:border-r">
              <Badge tone="amber">Simulated day · {formatFullDate(dataset.anchorTimestamp)}</Badge>
              <h3 className="mt-3 text-[15px] font-semibold tracking-[-0.01em] text-ink-900">
                After lunch, three rooms stay powered while empty
              </h3>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">
                At the 14:00 snapshot, the cafeteria has finished lunch service, a computer lab session has ended and the
                library reading hall is closed for maintenance. All three still show active equipment load. Meanwhile the
                forecast sees a high-demand window approaching in the evening.
              </p>
              <ol className="mt-3 space-y-2">
                {[
                  "Open Waste & Alerts and filter to Critical. Review the cafeteria, AI & Data Lab and library alerts.",
                  "Read the rule, evidence and recommended action on each card, then acknowledge a critical alert.",
                  "Open Demand Forecast and switch between campus and a building. Compare the forecast peak with its backtest error.",
                  "Open Insights to see the building comparison, heatmap and prioritised recommendations generated from the same data.",
                  "Regenerate the demo dataset from the top bar to show a different but internally consistent scenario.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-2.5 text-[10.5px] leading-relaxed text-ink-600">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[9px] font-semibold text-brand-800 ring-1 ring-inset ring-brand-100">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-ink-50/40 p-5 sm:p-6 xl:col-span-5">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">Reproducibility</p>
              <div className="mt-3 space-y-2 text-[10.5px]">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-line">
                  <span className="text-ink-500">Dataset</span>
                  <span className="font-mono text-[9.5px] text-ink-700">{seed}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-line">
                  <span className="text-ink-500">History</span>
                  <span className="font-medium text-ink-700">{dataset.days} days · {dataset.hourly.length.toLocaleString("en-IN")} hours</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-line">
                  <span className="text-ink-500">Snapshot</span>
                  <span className="font-medium text-ink-700">14:00 simulated</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-line">
                  <span className="text-ink-500">Alerts</span>
                  <span className="font-medium text-ink-700">{dataset.alerts.length} events · {dataset.alerts.filter((a) => a.status === "active").length} initially active</span>
                </div>
              </div>
              <button
                type="button"
                onClick={regenerate}
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink-900 px-3 text-[10.5px] font-semibold text-white transition-colors hover:bg-ink-800"
              >
                <FlaskConical className="h-3 w-3" /> Generate a fresh scenario
              </button>
              <p className="mt-2 text-[9px] leading-relaxed text-ink-400">
                The same seed always reproduces the same dataset. Regenerating creates a new seed.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Limitations + roadmap */}
      <section id="limitations" className="mt-8 scroll-mt-24">
        <SectionTitle
          title="Limitations and future development"
          description="What this prototype does not do — stated plainly, followed by the path to a real pilot."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <Card className="xl:col-span-6">
            <CardHeader
              icon={ShieldCheck}
              title="Prototype limitations"
              subtitle="Simulated data · demonstrated logic · no live deployment"
              action={<Badge tone="amber">Read before evaluating</Badge>}
            />
            <ul className="space-y-2.5 px-5 pb-5 pt-4 sm:px-6">
              {LIMITATIONS.map((item) => (
                <li key={item} className="flex gap-2 text-[10.5px] leading-relaxed text-ink-500">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="xl:col-span-6">
            <CardHeader
              icon={Wrench}
              title="Future development"
              subtitle="A realistic sequence from prototype to pilot"
              action={<Badge tone="green">Roadmap</Badge>}
            />
            <div className="grid grid-cols-1 gap-3 px-5 pb-5 pt-4 sm:grid-cols-2 sm:px-6">
              {FUTURE.map((item) => (
                <div key={item.title} className="rounded-xl border border-line bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-50 text-brand-700">
                      <item.icon className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-[10.5px] font-semibold text-ink-800">{item.title}</p>
                  </div>
                  <p className="mt-1.5 text-[9.5px] leading-relaxed text-ink-500">{item.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Disclosure */}
      <section className="mt-8">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70">
                <FlaskConical className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="text-[12.5px] font-semibold text-ink-900">Data disclosure</p>
                <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-ink-500">
                  SmartLoop currently operates using simulated data. No live campus meters or sensors are connected.
                  Simulated results are not real campus measurements and are not claims of achieved energy savings.
                </p>
                <p className="mt-1.5 text-[10px] text-ink-400">
                  Dataset generated {new Date(dataset.generatedAt).toLocaleString()} · snapshot{" "}
                  {formatFullDate(dataset.anchorTimestamp)} · seed {seed}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                to="/alerts"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[10.5px] font-medium text-ink-600 shadow-sm transition-colors hover:bg-ink-50"
              >
                <BellRing className="h-3 w-3" /> See alerts
              </Link>
              <Link
                to="/insights#recommendations"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-[10.5px] font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <Leaf className="h-3 w-3" /> Recommendations
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: Lock, title: "Private by design", body: "No accounts, tracking, API keys or external AI calls." },
            { icon: CircuitBoard, title: "Static deployable", body: "Production build can be hosted on any static web host." },
            { icon: CheckCircle2, title: "Tested logic", body: "Simulation consistency and forecast error are covered by automated tests." },
          ].map((item) => (
            <div key={item.title} className="flex gap-2.5 rounded-xl border border-line bg-white/70 px-3 py-3">
              <item.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
              <div>
                <p className="text-[10.5px] font-semibold text-ink-700">{item.title}</p>
                <p className="mt-0.5 text-[9.5px] leading-relaxed text-ink-400">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
