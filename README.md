# Air Quality connector for Claude

A remote MCP server, hosted on Cloudflare Workers, that gives Claude current, forecast and historical air quality for any place on Earth. Users need no account or sign-in.

## Tools

All tools are read-only.

| Tool | What it returns |
| --- | --- |
| `get_current_air_quality` | US AQI and European AQI with category and health advice, dominant pollutant, PM2.5, PM10, NO2, O3, SO2, CO, comparison with WHO guidelines, dust, UV |
| `get_air_quality_forecast` | Up to 7 days, per local day: peak and mean AQI, cleanest and worst hour, pollutant means |
| `get_air_quality_history` | Daily values for a range of up to 92 days (from about Aug 2022) plus a summary |
| `compare_air_quality` | 2 to 25 places ranked cleanest first |

Prompt: `air_quality_briefing`.

## Routes

| Path | Purpose |
| --- | --- |
| `POST /mcp` | MCP endpoint (Streamable HTTP, stateless, JSON responses) |
| `/` | Documentation page |
| `/privacy` | Privacy policy |
| `/icon.svg` | Icon |
| `/health` | Health check |

## Develop and deploy

```bash
npm install
npm run dev                                       # local Worker on http://localhost:8787
npm test                                          # live smoke test against MCP_URL (default localhost)
npx wrangler login                                # once, in the Cloudflare account that should own it
npm run deploy
MCP_URL=https://aqi-mcp.<subdomain>.workers.dev/mcp npm test
```

## Privacy Policy

The server receives only tool arguments (place name or coordinates, days, dates), forwards them to Open-Meteo to get the data, and returns the result. It stores nothing and keeps no request logs (Worker observability is off). Full policy: `/privacy` on the deployed server.

## Data

[Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api), based on Copernicus CAMS, CC BY 4.0. Values are modelled, not ground-station readings.
