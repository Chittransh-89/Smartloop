import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.SMARTLOOP_URL ?? "http://localhost:5173";
const OUT = "docs/screenshots";
const tabs = [
  { path: "/", name: "dashboard", wait: "Energy command centre" },
  { path: "/forecast", name: "forecast", wait: "Historical demand and forecast" },
  { path: "/alerts", name: "alerts", wait: "Waste & anomaly alerts" },
  { path: "/insights", name: "insights", wait: "Campus energy insights" },
  { path: "/about", name: "about", wait: "Make campus energy visible" },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SMARTLOOP_CHROMIUM ??
    `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1181\\chrome-win\\chrome.exe`,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

for (const tab of tabs) {
  await page.goto(`${BASE}/#${tab.path}`, { waitUntil: "networkidle" });
  await page.getByText(tab.wait).first().waitFor({ timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${tab.name}.png`, fullPage: true });
  await page.screenshot({ path: `${OUT}/${tab.name}-viewport.png`, fullPage: false });
  console.log(`captured ${tab.name}`);
}

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
});
mobile.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(`mobile: ${message.text()}`);
});
await mobile.goto(`${BASE}/#/`, { waitUntil: "networkidle" });
await mobile.getByText("Energy command centre").first().waitFor({ timeout: 15000 });
await mobile.evaluate(() => document.fonts.ready);
await mobile.waitForTimeout(700);
await mobile.screenshot({ path: `${OUT}/dashboard-mobile.png`, fullPage: true });
await mobile.getByRole("button", { name: "Open navigation menu" }).click();
await mobile.waitForTimeout(300);
await mobile.screenshot({ path: `${OUT}/mobile-navigation.png`, fullPage: false });
console.log("captured mobile");

await writeFile(`${OUT}/console-errors.json`, JSON.stringify(consoleErrors, null, 2));
console.log(`console errors: ${consoleErrors.length}`);
if (consoleErrors.length) console.log(consoleErrors.join("\n"));

await browser.close();
