// Air quality data layer. Uses Open-Meteo (CAMS global model, ~11 km in Europe,
// ~25-45 km elsewhere), which covers every point on Earth with no API key.

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const UA = "aqi-mcp/0.1 (+https://github.com/modelcontextprotocol)";

export const POLLUTANTS = [
  "pm2_5",
  "pm10",
  "nitrogen_dioxide",
  "ozone",
  "sulphur_dioxide",
  "carbon_monoxide",
];
const EXTRA = ["dust", "uv_index", "aerosol_optical_depth"];
const AQI = ["us_aqi", "european_aqi"];
const US_SUB = ["us_aqi_pm2_5", "us_aqi_pm10", "us_aqi_nitrogen_dioxide", "us_aqi_ozone", "us_aqi_sulphur_dioxide", "us_aqi_carbon_monoxide"];

// WHO 2021 Air Quality Guidelines, 24-hour (8-hour for ozone) levels in µg/m³.
export const WHO_24H = {
  pm2_5: 15,
  pm10: 45,
  nitrogen_dioxide: 25,
  ozone: 100,
  sulphur_dioxide: 40,
  carbon_monoxide: 4000,
};

const US_BANDS = [
  [50, "Good", "Air quality is satisfactory. Enjoy outdoor activity."],
  [100, "Moderate", "Acceptable. Unusually sensitive people should consider reducing prolonged or heavy outdoor exertion."],
  [150, "Unhealthy for Sensitive Groups", "Children, older adults, and people with heart or lung disease should reduce prolonged or heavy outdoor exertion."],
  [200, "Unhealthy", "Everyone should reduce prolonged or heavy exertion outdoors. Sensitive groups should avoid it."],
  [300, "Very Unhealthy", "Everyone should avoid prolonged or heavy exertion outdoors. Sensitive groups should stay indoors. Consider an N95 mask and an air purifier."],
  [Infinity, "Hazardous", "Health warning of emergency conditions. Everyone should avoid all outdoor activity and keep windows closed."],
];

const EU_BANDS = [
  [20, "Good"],
  [40, "Fair"],
  [60, "Moderate"],
  [80, "Poor"],
  [100, "Very Poor"],
  [Infinity, "Extremely Poor"],
];

export function usCategory(aqi) {
  if (aqi == null) return null;
  const [, label, advice] = US_BANDS.find(([max]) => aqi <= max);
  return { label, advice };
}

export function euCategory(aqi) {
  if (aqi == null) return null;
  return EU_BANDS.find(([max]) => aqi <= max)[1];
}

async function getJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new Error(`Upstream error (${res.status}): ${body.reason || res.statusText}`);
  }
  return body;
}

const COORD_RE = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

/**
 * Resolve "Paris", "Paris, France", "Springfield, Illinois, US" or "48.85,2.35"
 * to a single place with coordinates.
 */
export async function resolveLocation(query) {
  const m = COORD_RE.exec(query);
  if (m) {
    const latitude = Number(m[1]);
    const longitude = Number(m[2]);
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new Error(`Coordinates out of range: ${query}`);
    }
    return { name: `${latitude}, ${longitude}`, latitude, longitude };
  }

  const [name, ...qualifiers] = query.split(",").map((s) => s.trim()).filter(Boolean);
  if (!name) throw new Error("Location is empty.");
  const url = `${GEO_URL}?name=${encodeURIComponent(name)}&count=20&language=en&format=json`;
  const { results = [] } = await getJSON(url);
  if (!results.length) {
    throw new Error(`Could not find a place called "${query}". Try a larger nearby city or pass "lat,lon".`);
  }

  const q = qualifiers.map((s) => s.toLowerCase());
  const matches = (r) =>
    q.every((part) =>
      [r.country, r.country_code, r.admin1, r.admin2, r.admin3]
        .filter(Boolean)
        .some((v) => v.toLowerCase() === part || v.toLowerCase().startsWith(part)),
    );
  const pool = q.length ? results.filter(matches) : results;
  if (!pool.length) {
    throw new Error(`Found "${name}" but none in "${qualifiers.join(", ")}". Candidates: ${results.slice(0, 5).map(label).join("; ")}`);
  }
  // Open-Meteo ranks by relevance; prefer the most populous among the top hits.
  const best = pool.slice(0, 5).reduce((a, b) => ((b.population || 0) > (a.population || 0) ? b : a));
  return {
    name: label(best),
    latitude: best.latitude,
    longitude: best.longitude,
    timezone: best.timezone,
    country_code: best.country_code,
  };
}

function label(r) {
  return [r.name, r.admin1, r.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
}

function round(v, d = 1) {
  return v == null ? null : Math.round(v * 10 ** d) / 10 ** d;
}

function dominant(subIndices) {
  let best = null;
  for (const [k, v] of Object.entries(subIndices)) {
    if (v != null && (best == null || v > best[1])) best = [k, v];
  }
  return best ? best[0].replace("us_aqi_", "") : null;
}

function whoCompare(values) {
  const out = {};
  for (const p of POLLUTANTS) {
    if (values[p] == null) continue;
    out[p] = `${round(values[p] / WHO_24H[p], 1)}x WHO 24h guideline (${WHO_24H[p]} µg/m³)`;
  }
  return out;
}

export async function current(place) {
  const vars = [...AQI, ...US_SUB, ...POLLUTANTS, ...EXTRA].join(",");
  const url = `${AQ_URL}?latitude=${place.latitude}&longitude=${place.longitude}&current=${vars}&timezone=auto`;
  const d = await getJSON(url);
  const c = d.current;
  const sub = Object.fromEntries(US_SUB.map((k) => [k, c[k]]));
  const pollutants = Object.fromEntries(POLLUTANTS.map((p) => [p, round(c[p])]));
  return {
    location: place.name,
    coordinates: { latitude: place.latitude, longitude: place.longitude },
    local_time: c.time,
    timezone: d.timezone,
    us_aqi: c.us_aqi,
    us_category: usCategory(c.us_aqi)?.label,
    health_advice: usCategory(c.us_aqi)?.advice,
    european_aqi: c.european_aqi,
    european_category: euCategory(c.european_aqi),
    dominant_pollutant: dominant(sub),
    pollutants_ugm3: pollutants,
    vs_who_guideline: whoCompare(pollutants),
    dust_ugm3: round(c.dust),
    uv_index: round(c.uv_index),
    aerosol_optical_depth: round(c.aerosol_optical_depth, 2),
  };
}

function groupDaily(times, series) {
  const days = new Map();
  times.forEach((t, i) => {
    const day = t.slice(0, 10);
    if (!days.has(day)) days.set(day, []);
    days.get(day).push(i);
  });
  return [...days.entries()].map(([date, idx]) => {
    const pick = (k) => idx.map((i) => series[k]?.[i]).filter((v) => v != null);
    const aqi = idx.map((i) => [times[i], series.us_aqi?.[i]]).filter(([, v]) => v != null);
    const max = (a) => (a.length ? Math.max(...a) : null);
    const mean = (a) => (a.length ? round(a.reduce((s, v) => s + v, 0) / a.length) : null);
    const best = aqi.reduce((a, b) => (a == null || b[1] < a[1] ? b : a), null);
    const worst = aqi.reduce((a, b) => (a == null || b[1] > a[1] ? b : a), null);
    const peak = max(aqi.map(([, v]) => v));
    return {
      date,
      us_aqi_max: peak,
      us_aqi_mean: mean(aqi.map(([, v]) => v)),
      category_at_peak: usCategory(peak)?.label ?? null,
      cleanest_hour: best ? { time: best[0].slice(11), us_aqi: best[1] } : null,
      worst_hour: worst ? { time: worst[0].slice(11), us_aqi: worst[1] } : null,
      pm2_5_mean: mean(pick("pm2_5")),
      pm10_mean: mean(pick("pm10")),
      ozone_max: round(max(pick("ozone"))),
      nitrogen_dioxide_mean: mean(pick("nitrogen_dioxide")),
      hours_with_data: aqi.length,
    };
  });
}

const HOURLY = ["us_aqi", "european_aqi", ...POLLUTANTS].join(",");

export async function forecast(place, days) {
  const url = `${AQ_URL}?latitude=${place.latitude}&longitude=${place.longitude}&hourly=${HOURLY}&forecast_days=${days}&timezone=auto`;
  const d = await getJSON(url);
  return {
    location: place.name,
    coordinates: { latitude: place.latitude, longitude: place.longitude },
    timezone: d.timezone,
    daily: groupDaily(d.hourly.time, d.hourly),
    note: "Hourly CAMS model forecast summarised per local day. Times are local.",
  };
}

export async function history(place, start, end) {
  const url = `${AQ_URL}?latitude=${place.latitude}&longitude=${place.longitude}&hourly=${HOURLY}&start_date=${start}&end_date=${end}&timezone=auto`;
  const d = await getJSON(url);
  const daily = groupDaily(d.hourly.time, d.hourly).filter((r) => r.hours_with_data > 0);
  const aqis = daily.map((r) => r.us_aqi_mean).filter((v) => v != null);
  const pm = daily.map((r) => r.pm2_5_mean).filter((v) => v != null);
  const avg = (a) => (a.length ? round(a.reduce((s, v) => s + v, 0) / a.length) : null);
  return {
    location: place.name,
    coordinates: { latitude: place.latitude, longitude: place.longitude },
    timezone: d.timezone,
    period: { start, end },
    summary: {
      days_with_data: daily.length,
      mean_us_aqi: avg(aqis),
      mean_pm2_5_ugm3: avg(pm),
      days_pm2_5_above_who_24h: daily.filter((r) => r.pm2_5_mean > WHO_24H.pm2_5).length,
      worst_day: daily.reduce((a, b) => (a == null || (b.us_aqi_max ?? -1) > (a.us_aqi_max ?? -1) ? b : a), null)?.date ?? null,
      cleanest_day: daily.reduce((a, b) => (a == null || (b.us_aqi_mean ?? Infinity) < (a.us_aqi_mean ?? Infinity) ? b : a), null)?.date ?? null,
    },
    daily,
  };
}

export async function compare(places) {
  const lat = places.map((p) => p.latitude).join(",");
  const lon = places.map((p) => p.longitude).join(",");
  const vars = ["us_aqi", "european_aqi", ...US_SUB, "pm2_5", "pm10"].join(",");
  const url = `${AQ_URL}?latitude=${lat}&longitude=${lon}&current=${vars}&timezone=auto`;
  let d = await getJSON(url);
  if (!Array.isArray(d)) d = [d];
  const rows = places.map((p, i) => {
    const c = d[i].current;
    return {
      location: p.name,
      us_aqi: c.us_aqi,
      us_category: usCategory(c.us_aqi)?.label,
      european_aqi: c.european_aqi,
      dominant_pollutant: dominant(Object.fromEntries(US_SUB.map((k) => [k, c[k]]))),
      pm2_5_ugm3: round(c.pm2_5),
      pm10_ugm3: round(c.pm10),
      local_time: c.time,
    };
  });
  rows.sort((a, b) => (a.us_aqi ?? Infinity) - (b.us_aqi ?? Infinity));
  rows.forEach((r, i) => (r.rank_cleanest_first = i + 1));
  return { ranked: rows };
}
