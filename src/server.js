import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { resolveLocation, current, forecast, history, compare } from "./aq.js";

const READ_ONLY = { readOnlyHint: true, openWorldHint: true, idempotentHint: true };
const location = z
  .string()
  .min(1)
  .describe('Place name ("Delhi", "Paris, France", "Springfield, Illinois, US") or coordinates "lat,lon" ("28.61,77.21").');

const SOURCE = "Source: Open-Meteo Air Quality API (Copernicus CAMS model). Modelled values, not a ground station reading.";

function ok(data) {
  return { content: [{ type: "text", text: JSON.stringify({ ...data, source: SOURCE }, null, 2) }] };
}

function fail(err) {
  return { isError: true, content: [{ type: "text", text: String(err?.message || err) }] };
}

const wrap = (fn) => async (args) => {
  try {
    return ok(await fn(args));
  } catch (e) {
    return fail(e);
  }
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export function createServer() {
  const server = new McpServer({ name: "aqi", version: "0.1.0" });

  server.registerTool(
    "get_current_air_quality",
    {
      title: "Current air quality",
      description:
        "Current air quality for any place on Earth: US AQI and European AQI with category and health advice, dominant pollutant, PM2.5, PM10, NO2, O3, SO2, CO (µg/m³), comparison with WHO guidelines, dust and UV index.",
      inputSchema: { location },
      annotations: READ_ONLY,
    },
    wrap(async ({ location }) => current(await resolveLocation(location))),
  );

  server.registerTool(
    "get_air_quality_forecast",
    {
      title: "Air quality forecast",
      description:
        "Hourly air quality forecast up to 7 days ahead, summarised per local day: peak and mean US AQI, category, cleanest and worst hour (good for planning a run or a window-open time), mean PM2.5/PM10/NO2 and peak ozone.",
      inputSchema: {
        location,
        days: z.number().int().min(1).max(7).default(3).describe("Days ahead, 1-7. Default 3."),
      },
      annotations: READ_ONLY,
    },
    wrap(async ({ location, days }) => forecast(await resolveLocation(location), days ?? 3)),
  );

  server.registerTool(
    "get_air_quality_history",
    {
      title: "Air quality history",
      description:
        "Past air quality for a place between two dates (max 92 days per call; global data from about August 2022). Returns daily peak/mean US AQI and pollutant means plus a summary: average AQI, average PM2.5, days above the WHO PM2.5 guideline, worst and cleanest day.",
      inputSchema: {
        location,
        start_date: isoDate.describe("First day, YYYY-MM-DD."),
        end_date: isoDate.describe("Last day, YYYY-MM-DD (inclusive)."),
      },
      annotations: READ_ONLY,
    },
    wrap(async ({ location, start_date, end_date }) => {
      const span = (Date.parse(end_date) - Date.parse(start_date)) / 86400000;
      if (!(span >= 0)) throw new Error("end_date must be on or after start_date.");
      if (span > 91) throw new Error("Range too long: max 92 days per call. Split it into several calls.");
      return history(await resolveLocation(location), start_date, end_date);
    }),
  );

  server.registerTool(
    "compare_air_quality",
    {
      title: "Compare air quality",
      description:
        "Compare current air quality across 2-25 places worldwide, ranked cleanest first, with US AQI, category, European AQI, dominant pollutant, PM2.5 and PM10.",
      inputSchema: {
        locations: z.array(location).min(2).max(25).describe("Places to compare."),
      },
      annotations: READ_ONLY,
    },
    wrap(async ({ locations }) => {
      const settled = await Promise.allSettled(locations.map(resolveLocation));
      const places = settled.filter((s) => s.status === "fulfilled").map((s) => s.value);
      const unresolved = settled
        .map((s, i) => (s.status === "rejected" ? { location: locations[i], error: s.reason.message } : null))
        .filter(Boolean);
      if (!places.length) throw new Error(`No locations could be resolved: ${unresolved.map((u) => u.error).join(" | ")}`);
      return { ...(await compare(places)), ...(unresolved.length ? { unresolved } : {}) };
    }),
  );

  server.registerPrompt(
    "air_quality_briefing",
    {
      title: "Air quality briefing",
      description: "Should I go outside? A plain-language briefing for a place, now and the next 3 days.",
      argsSchema: { location: z.string().describe("City or lat,lon") },
    },
    ({ location }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Give me an air quality briefing for ${location}. Use get_current_air_quality and get_air_quality_forecast (3 days). Tell me the current AQI and what it means for health, the main pollutant, the best times in the next 3 days for outdoor exercise, and whether to wear a mask or run a purifier. Keep it short.`,
          },
        },
      ],
    }),
  );

  return server;
}
