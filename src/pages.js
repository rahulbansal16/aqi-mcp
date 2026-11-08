// Public pages for the directory listing: documentation, privacy policy, icon.
export const REPO = "https://github.com/rahulbansal16/aqi-mcp";
const UPDATED = "2026-11-09";

export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0f766e"/><path d="M14 26h24a6 6 0 1 0-6-6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M14 36h30a6 6 0 1 1-6 6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M14 46h12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`;

const page = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><link rel="icon" href="/icon.svg">
<style>
body{font:16px/1.6 system-ui,-apple-system,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1f2937}
h1{font-size:28px;margin-bottom:4px}h2{font-size:20px;margin-top:32px}
code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:14px}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left;vertical-align:top}
.muted{color:#6b7280;font-size:14px}a{color:#0f766e}
</style></head><body>${body}</body></html>`;

export function homePage(origin) {
  return page(
    "Air Quality connector for Claude",
    `<h1>Air Quality connector for Claude</h1>
<p class="muted">Current, forecast and historical air quality for any place on Earth.</p>

<h2>Connect</h2>
<p>MCP server URL: <code>${origin}/mcp</code></p>
<p>In Claude, open Settings, then Connectors, choose Add custom connector and paste the URL above. No account or sign-in is needed.</p>

<h2>Tools</h2>
<table>
<tr><th>Tool</th><th>What it returns</th></tr>
<tr><td><code>get_current_air_quality</code></td><td>US AQI and European AQI with category and health advice, dominant pollutant, PM2.5, PM10, NO2, O3, SO2 and CO in µg/m³, comparison with WHO guidelines, dust and UV index.</td></tr>
<tr><td><code>get_air_quality_forecast</code></td><td>Up to 7 days ahead, per local day: peak and mean US AQI, category, cleanest and worst hour, pollutant means.</td></tr>
<tr><td><code>get_air_quality_history</code></td><td>Daily values for a date range of up to 92 days (data from about August 2022), with a summary of average AQI, days above the WHO PM2.5 guideline, and the worst and cleanest day.</td></tr>
<tr><td><code>compare_air_quality</code></td><td>2 to 25 places ranked cleanest first.</td></tr>
</table>
<p>Prompt: <code>air_quality_briefing</code> gives a short "should I go outside?" briefing for a place.</p>
<p>All tools are read-only. Locations can be a place name such as <code>Delhi</code> or <code>Paris, France</code>, or coordinates such as <code>28.61,77.21</code>.</p>

<h2>Example prompts</h2>
<ul>
<li>What is the air quality in Delhi right now, and should I go for a run?</li>
<li>When is the cleanest time to be outside in Beijing over the next 3 days?</li>
<li>Rank London, Lahore, São Paulo and Reykjavik by air quality right now.</li>
<li>How many days in October was PM2.5 in Lagos above the WHO guideline?</li>
</ul>

<h2>Data and limits</h2>
<p>Data comes from the <a href="https://open-meteo.com/en/docs/air-quality-api">Open-Meteo Air Quality API</a>, based on the Copernicus Atmosphere Monitoring Service (CAMS) model, licensed under CC BY 4.0. Values are modelled on a grid of about 11 km in Europe and 25 to 45 km elsewhere. They are not readings from a ground station and can miss very local spikes, such as next to a busy road or a single fire.</p>

<h2>Support</h2>
<p>Report a problem or ask a question: <a href="${REPO}/issues">${REPO}/issues</a></p>
<p><a href="/privacy">Privacy policy</a> · <a href="${REPO}">Source code</a></p>`,
  );
}

export function privacyPage() {
  return page(
    "Privacy policy: Air Quality connector",
    `<h1>Privacy policy</h1>
<p class="muted">Air Quality connector for Claude. Last updated ${UPDATED}.</p>

<h2>What we collect</h2>
<p>The connector receives only the tool arguments Claude sends: a place name or coordinates, and for some tools a number of days or a date range. It does not receive your name, email, account details, conversation history or files. It has no accounts and no sign-in.</p>

<h2>How it is used</h2>
<p>The place name is sent to the Open-Meteo geocoding API to find its coordinates. The coordinates and dates are sent to the Open-Meteo Air Quality API to get the air quality data. The result is returned to Claude. Nothing else is done with it.</p>

<h2>Storage and retention</h2>
<p>We do not store tool arguments or results. We keep no request logs: logging is turned off for the server. Each request is handled and then discarded.</p>

<h2>Third parties</h2>
<ul>
<li><a href="https://open-meteo.com/en/terms#privacy">Open-Meteo</a> receives place names, coordinates and dates to answer the request.</li>
<li><a href="https://www.cloudflare.com/privacypolicy/">Cloudflare</a> hosts the server and processes network traffic, including IP addresses, to deliver requests.</li>
</ul>
<p>We do not sell or share data with anyone else, and we use no analytics or advertising.</p>

<h2>Contact</h2>
<p>Questions about privacy: <a href="${REPO}/issues">${REPO}/issues</a></p>`,
  );
}
