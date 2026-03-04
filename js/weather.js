// ===== Weather API (Open-Meteo) + cloud helpers =====
import { state } from './state.js';

const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function fetchWeather(lat, lon) {
  const cacheKey = `sundose_weather_${lat.toFixed(3)}_${lon.toFixed(3)}`;

  // Try cache first
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached && (Date.now() - cached.timestamp) < WEATHER_CACHE_TTL) {
      state.weatherData = cached.data;
      state.timezone = cached.data.timezone;
      return;
    }
  } catch {}

  // Fetch from API
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=cloud_cover,weather_code&forecast_days=7&timezone=auto`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Weather fetch failed');
    const data = await resp.json();
    const weatherData = {
      hourly: data.hourly,
      timezone: data.timezone,
      fetched: Date.now(),
    };
    state.weatherData = weatherData;
    state.timezone = data.timezone;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: weatherData, timestamp: Date.now() }));
    } catch {}
  } catch (e) {
    console.warn('Weather data unavailable:', e);
    state.weatherData = null;
  }
}

// Get cloud cover for a given Date from weatherData
export function getCloudCover(date) {
  if (!state.weatherData || !state.weatherData.hourly) return null;
  const times = state.weatherData.hourly.time;
  const clouds = state.weatherData.hourly.cloud_cover;
  const ds = localDateStr(date);
  const h = localHour(date);
  const targetISO = ds + 'T' + String(h).padStart(2, '0') + ':00';
  const idx = times.indexOf(targetISO);
  if (idx >= 0) return clouds[idx];
  // Fallback: find nearest within 2h
  const ts = date.getTime();
  let best = 0, bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - ts);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return bestDiff < 7200000 ? clouds[best] : null;
}

// Get weather code for a given Date
export function getWeatherCode(date) {
  if (!state.weatherData || !state.weatherData.hourly) return null;
  const times = state.weatherData.hourly.time;
  const codes = state.weatherData.hourly.weather_code;
  const ds = localDateStr(date);
  const h = localHour(date);
  const targetISO = ds + 'T' + String(h).padStart(2, '0') + ':00';
  const idx = times.indexOf(targetISO);
  if (idx >= 0) return codes[idx];
  const ts = date.getTime();
  let best = 0, bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - ts);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return bestDiff < 7200000 ? codes[best] : null;
}

// Get average cloud cover for a date's midday window (10h-16h local)
export function getDayCloudCover(date) {
  if (!state.weatherData || !state.weatherData.hourly) return null;
  const times = state.weatherData.hourly.time;
  const clouds = state.weatherData.hourly.cloud_cover;
  const dayStr = localDateStr(date);
  let sum = 0, count = 0;
  for (let i = 0; i < times.length; i++) {
    if (times[i].startsWith(dayStr)) {
      const h = parseInt(times[i].substring(11, 13));
      if (h >= 10 && h <= 16) { sum += clouds[i]; count++; }
    }
  }
  return count > 0 ? Math.round(sum / count) : null;
}

export function cloudEmoji(pct) {
  if (pct === null) return '';
  if (pct < 20) return '☀️';
  if (pct < 50) return '⛅';
  if (pct < 80) return '🌥️';
  return '☁️';
}

// Cloud impact description — calibrated on NWS/EPA + Parisi et al. 2012
export function cloudImpact(pct) {
  if (pct === null) return '';
  if (pct < 25) return 'Ciel dégagé — ~90 % des UVB passent, conditions idéales';
  if (pct < 50) return 'Peu nuageux — ~75–90 % des UVB passent, bon créneau';
  if (pct < 75) return 'Nuageux — ~50–75 % des UVB passent, synthèse plus lente';
  if (pct < 95) return 'Très nuageux — ~30–55 % des UVB passent, prévoyez 2× plus de temps';
  return 'Couvert dense — ~30–45 % des UVB passent, synthèse possible mais très lente';
}

// Cloud attenuation factor (0 to 1) — how much UVB gets through
export function cloudUVBFactor(pct) {
  if (pct === null) return 1;
  if (pct < 25) return 0.9;
  if (pct < 50) return 0.8;
  if (pct < 75) return 0.6;
  if (pct < 95) return 0.42;
  return 0.35;
}

// Helpers (duplicated here to avoid circular imports with ui.js)
function localDateStr(date) {
  if (state.timezone) {
    return date.toLocaleDateString('sv-SE', { timeZone: state.timezone });
  }
  return date.toISOString().slice(0, 10);
}

function localHour(date) {
  if (state.timezone) {
    return parseInt(date.toLocaleTimeString('en-GB', { timeZone: state.timezone, hour: '2-digit', hour12: false }));
  }
  return date.getUTCHours();
}
