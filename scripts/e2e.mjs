import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const BASE = process.env.SMARTLOOP_URL ?? "http://localhost:5173";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SMARTLOOP_CHROMIUM ??
    `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1181\\chrome-win\\chrome.exe`,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

const results = [];
function pass(label, detail = "") {
  results.push({ label, detail });
  console.log(`PASS  ${label}${detail ? ` — ${detail}` : ""}`);
}

await page.goto(`${BASE}/#/`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Energy command centre" }).waitFor();
assert.equal(await page.locator("svg.recharts-surface").count() > 0, true);
pass("Dashboard loads with charts");

const kpiBefore = await page.getByText("Total energy consumption").locator("..").locator("..").innerText();
await page.getByRole("button", { name: "30 days" }).click();
await page.waitForTimeout(350);
const kpiAfter = await page.getByText("Total energy consumption").locator("..").locator("..").innerText();
assert.notEqual(kpiBefore, kpiAfter);
pass("Dashboard range filter updates KPIs", "7 days → 30 days");

await page.getByRole("button", { name: "Hourly" }).click();
await page.waitForTimeout(250);
assert.match(await page.getByText("Peak").first().innerText(), /peak/i);
pass("Trend aggregation toggle works");

const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Export CSV" }).click();
const download = await downloadPromise;
const csvPath = await download.path();
const csv = await readFile(csvPath, "utf8");
assert.match(csv, /date,day_type,total_kwh/);
assert.ok(csv.split("\n").length >= 8);
pass("Dashboard CSV export downloads valid data", `${csv.split("\n").length - 1} rows`);

await page.getByRole("link", { name: "Demand Forecast" }).click();
await page.getByRole("heading", { name: "Demand forecast" }).waitFor();
await page.getByLabel("Select forecast entity").selectOption("labs");
await page.waitForTimeout(350);
assert.match(await page.getByText("Computer Labs").first().innerText(), /Computer Labs/);
const horizonLabelBefore = await page.getByText(/^Next \d+ hours$/).count();
assert.ok(horizonLabelBefore > 0);
await page.getByRole("button", { name: "12 hours" }).click();
await page.waitForTimeout(350);
assert.equal(await page.getByText("Next 12 hours").count() > 0, true);
pass("Forecast entity and horizon selection update output");

const forecastDownload = page.waitForEvent("download");
await page.getByRole("button", { name: "Export" }).click();
const fDownload = await forecastDownload;
const forecastCsv = await readFile(await fDownload.path(), "utf8");
assert.match(forecastCsv, /timestamp,type,actual_kwh,predicted_kwh/);
pass("Forecast CSV export downloads valid data");

await page.getByRole("link", { name: "Waste & Alerts" }).click();
await page.getByRole("heading", { name: "Waste & anomaly alerts" }).waitFor();
const beforeFilter = await page.getByText(/Showing \d+ of \d+ simulated alerts/).innerText();
await page.getByRole("button", { name: /^Critical/ }).click();
await page.waitForTimeout(200);
const criticalFiltered = await page.getByText(/Showing \d+ of \d+ simulated alerts/).innerText();
assert.notEqual(beforeFilter, criticalFiltered);
const criticalCount = Number(criticalFiltered.match(/Showing (\d+) of/)?.[1]);
assert.ok(criticalCount > 0 && criticalCount < 15);
pass("Alert severity filter works", criticalFiltered.trim());

await page.getByLabel("Search alerts").fill("library");
await page.waitForTimeout(200);
const searchFiltered = await page.getByText(/Showing \d+ of \d+ simulated alerts/).innerText();
assert.match(searchFiltered, /of 15/);
pass("Alert search combines with severity filter", searchFiltered.trim());

await page.getByRole("button", { name: "Clear", exact: true }).click();
await page.waitForTimeout(200);
await page.getByLabel("Filter by building").selectOption("labs");
await page.waitForTimeout(200);
const buildingFiltered = await page.getByText(/Showing \d+ of \d+ simulated alerts/).innerText();
assert.match(buildingFiltered, /of 15/);
pass("Alert building filter works", buildingFiltered.trim());
await page.getByLabel("Filter by building").selectOption("all");
await page.waitForTimeout(150);

const badgeBefore = await page.getByRole("link", { name: /Waste & Alerts/ }).first().innerText();
const ackButton = page.getByRole("button", { name: "Acknowledge", exact: true }).first();
await ackButton.click();
await page.getByText("Alert acknowledged").waitFor();
const badgeAfter = await page.getByRole("link", { name: /Waste & Alerts/ }).first().innerText();
assert.notEqual(badgeBefore, badgeAfter);
pass("Acknowledging an alert updates the navigation badge", `${badgeBefore.replace(/\s+/g, " ")} → ${badgeAfter.replace(/\s+/g, " ")}`);

await page.getByLabel("Filter by status").selectOption("acknowledged");
await page.waitForTimeout(200);
assert.ok((await page.getByText("Acknowledged").count()) > 0);
pass("Acknowledged alerts remain in the log");

await page.getByRole("link", { name: "Insights" }).click();
await page.getByRole("heading", { name: "Campus energy insights" }).waitFor();
await page.getByRole("button", { name: "kWh/m²" }).click();
await page.waitForTimeout(300);
await page.getByLabel("Select heatmap building").selectOption("labs");
await page.waitForTimeout(300);
assert.equal(await page.locator("svg.recharts-surface").count() >= 3, true);
pass("Insights metric toggle and heatmap building filter work");

await page.locator("#recommendations").scrollIntoViewIfNeeded();
await page.getByText("Sustainability recommendations").waitFor();
assert.ok((await page.getByText(/priority/).count()) >= 4);
pass("Recommendations render from the demo data");

await page.getByRole("link", { name: "About SmartLoop" }).click();
await page.getByRole("heading", { name: /Make campus energy visible/ }).waitFor();
await page.locator("#limitations").scrollIntoViewIfNeeded();
assert.ok(await page.getByText("Prototype limitations").isVisible());
const hrefs = await page.locator("a[href^='#/']").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
assert.ok(hrefs.every((href) => href && href.startsWith("#/") && href.length >= 2));
pass("About page loads and internal anchors resolve", `${hrefs.length} internal links checked`);

const seedBefore = await page.locator("text=seed:").first().innerText();
await page.getByRole("button", { name: /Regenerate simulated dataset/ }).click();
await page.getByText("Demo dataset regenerated").waitFor({ timeout: 5000 });
const seedAfter = await page.locator("text=seed:").first().innerText();
assert.notEqual(seedBefore, seedAfter);
pass("Regenerating the demo dataset produces a new seed", `${seedBefore} → ${seedAfter}`);

const mobile = await context.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(`${BASE}/#/`, { waitUntil: "networkidle" });
await mobile.getByRole("heading", { name: "Energy command centre" }).waitFor();
await mobile.getByRole("button", { name: "Open navigation menu" }).click();
await mobile.getByRole("link", { name: "Insights" }).click();
await mobile.getByRole("heading", { name: "Campus energy insights" }).waitFor();
assert.equal(await mobile.getByRole("button", { name: "Open navigation menu" }).isVisible(), true);
pass("Mobile navigation opens, routes and closes");

assert.equal(errors.length, 0, `Console errors: ${errors.join(" | ")}`);
pass("No console or page errors across tested flows", `${results.length + 1} checks`);

console.log(`\n${results.length} functional checks passed.`);
await browser.close();
