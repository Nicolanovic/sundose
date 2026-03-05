// ===== Fitzpatrick Skin Types & Vitamin D Calculations =====
import { getVitDWindow } from './solar.js';

export const FITZPATRICK = [
  { id: 1, label: 'I',   name: 'Very fair', color: '#FDEBD0', desc: 'Always burns, never tans',          factor: 0.66 },
  { id: 2, label: 'II',  name: 'Fair',      color: '#F5CBA7', desc: 'Burns easily, tans minimally',      factor: 0.83 },
  { id: 3, label: 'III', name: 'Medium',    color: '#E0B07B', desc: 'Burns moderately, tans gradually',  factor: 1.0  },
  { id: 4, label: 'IV',  name: 'Olive',     color: '#C49A6C', desc: 'Burns minimally, tans well',        factor: 1.5  },
  { id: 5, label: 'V',   name: 'Brown',     color: '#8D6E4C', desc: 'Rarely burns, tans darkly',         factor: 2.5  },
  { id: 6, label: 'VI',  name: 'Dark',      color: '#5C4033', desc: 'Never burns',                       factor: 4.2  },
];

// Estimate vitamin D synthesis time (minutes) for 1000 IU
// Based on: Scientific Reports (2024) — at peak UV for skin type III ~7.6 min
export function getExposureTime(uvi, phototype) {
  if (uvi < 1) return null;
  const ft = FITZPATRICK[phototype - 1];
  const baseMinutes = 60 / uvi;
  return Math.round(baseMinutes * ft.factor);
}

// ===== Daily Score (0-100) =====
// Combines: solar elevation potential, estimated UV, weather
export function computeDailyScore(maxElev, peakUVI, cloudPct) {
  // Solar component (0-40)
  let solarScore = 0;
  if (maxElev >= 60) solarScore = 40;
  else if (maxElev >= 45) solarScore = 25 + (maxElev - 45) / 15 * 15;
  else if (maxElev >= 30) solarScore = 10 + (maxElev - 30) / 15 * 15;
  else solarScore = Math.max(0, maxElev / 30 * 10);

  // UV component (0-35)
  let uvScore = 0;
  if (peakUVI >= 6) uvScore = 35;
  else if (peakUVI >= 3) uvScore = 15 + (peakUVI - 3) / 3 * 20;
  else if (peakUVI >= 1) uvScore = (peakUVI - 1) / 2 * 15;

  // Weather component (0-25)
  let weatherScore = 25;
  if (cloudPct !== null) {
    if (cloudPct >= 95) weatherScore = 8;
    else if (cloudPct >= 75) weatherScore = 12;
    else if (cloudPct >= 50) weatherScore = 17;
    else if (cloudPct >= 25) weatherScore = 21;
    else weatherScore = 25;
  }

  return Math.max(0, Math.min(100, Math.round(solarScore + uvScore + weatherScore)));
}

export function scoreColor(s) {
  if (s >= 70) return '#4CAF50';
  if (s >= 45) return '#FF9800';
  if (s >= 20) return '#FF5722';
  return '#9E9E9E';
}

export function scoreLabel(s) {
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Very good';
  if (s >= 45) return 'Good';
  if (s >= 30) return 'Fair';
  if (s >= 15) return 'Low';
  return 'None';
}

export function scoreDesc(s) {
  if (s >= 70) return 'Ideal conditions for vitamin D synthesis. A short exposure is enough.';
  if (s >= 45) return 'Good conditions. Synthesis is possible — make the most of the window.';
  if (s >= 25) return 'Average conditions. Slow synthesis — aim for breaks in the clouds.';
  if (s >= 10) return 'Poor conditions. Vitamin D synthesis is very limited today.';
  return 'No significant synthesis possible today. Supplementation recommended.';
}

// Return vitamin D windows for the next `days` days
export function getUpcomingWindows(lat, lon, days = 30) {
  const results = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    results.push(getVitDWindow(d, lat, lon));
  }
  return results;
}
