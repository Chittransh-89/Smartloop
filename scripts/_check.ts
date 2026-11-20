import { generateDataset } from "../src/lib/simulation";

const d = generateDataset("smartloop-demo-v1");
const expected = (kw: number) => (kw >= 3 ? "critical" : kw >= 1.5 ? "high" : kw >= 0.7 ? "medium" : "low");
for (const a of d.alerts) {
  const label = `${a.id} ${a.source} ${a.room} · ${a.powerKw} kW × ${a.durationHours} h = ${a.wastedKwh} kWh`;
  if (a.source === "room") {
    console.log(`${label} · severity ${a.severity} (expected ${expected(a.powerKw)}) ${expected(a.powerKw) === a.severity ? "OK" : "MISMATCH"}`);
  } else {
    const exp = a.powerKw >= 42 ? "high" : a.powerKw >= 22 ? "medium" : "low";
    console.log(`${label} · severity ${a.severity} (expected ${exp}) ${exp === a.severity ? "OK" : "MISMATCH"}`);
  }
}
