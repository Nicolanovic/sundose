// ===== Fitzpatrick Skin Types & Vitamin D Calculations =====
import { getVitDWindow } from './solar.js';

export const FITZPATRICK = [
  { id: 1, label: 'I',   name: 'Très claire', color: '#FDEBD0', desc: 'Brûle toujours, ne bronze jamais',         factor: 0.66 },
  { id: 2, label: 'II',  name: 'Claire',       color: '#F5CBA7', desc: 'Brûle facilement, bronze peu',             factor: 0.83 },
  { id: 3, label: 'III', name: 'Médium',        color: '#E0B07B', desc: 'Brûle modérément, bronze graduellement',  factor: 1.0  },
  { id: 4, label: 'IV',  name: 'Mate',          color: '#C49A6C', desc: 'Brûle peu, bronze bien',                  factor: 1.5  },
  { id: 5, label: 'V',   name: 'Foncée',        color: '#8D6E4C', desc: 'Brûle rarement, bronze foncé',            factor: 2.5  },
  { id: 6, label: 'VI',  name: 'Très foncée',   color: '#5C4033', desc: 'Ne brûle jamais',                         factor: 4.2  },
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
  if (s >= 60) return 'Très bon';
  if (s >= 45) return 'Bon';
  if (s >= 30) return 'Moyen';
  if (s >= 15) return 'Faible';
  return 'Insuffisant';
}

export function scoreDesc(s) {
  if (s >= 70) return 'Conditions idéales pour synthétiser votre vitamine D. Une courte exposition suffit.';
  if (s >= 45) return 'Bonnes conditions. La synthèse est possible, profitez du créneau.';
  if (s >= 25) return 'Conditions moyennes. Synthèse lente — privilégiez les éclaircies.';
  if (s >= 10) return 'Conditions défavorables. La synthèse est très limitée aujourd\'hui.';
  return 'Pas de synthèse significative possible aujourd\'hui. Supplémentation recommandée.';
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
