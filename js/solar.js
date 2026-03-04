// ===== Solar calculation engine =====
// Based on NOAA Solar Calculator algorithms

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export function julianDay(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let jy = y, jm = m;
  if (m <= 2) { jy--; jm += 12; }
  const A = Math.floor(jy / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (jy + 4716)) + Math.floor(30.6001 * (jm + 1)) + d + h / 24 + B - 1524.5;
}

export function solarPosition(date, lat, lon) {
  const JD = julianDay(date);
  const T = (JD - 2451545.0) / 36525.0;

  // Geometric mean longitude & anomaly
  let L0 = (280.46646 + T * (36000.76983 + 0.0003032 * T)) % 360;
  const M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) % 360;
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

  // Equation of center
  const C = (1.914602 - T * (0.004817 + 0.000014 * T)) * Math.sin(M * DEG)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * M * DEG)
          + 0.000289 * Math.sin(3 * M * DEG);

  const sunLon = L0 + C;
  const sunAnomaly = M + C;
  const sunR = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(sunAnomaly * DEG));

  // Apparent longitude
  const omega = 125.04 - 1934.136 * T;
  const lambda = sunLon - 0.00569 - 0.00478 * Math.sin(omega * DEG);

  // Obliquity
  const obliq = 23.439291 - T * (0.0130042 + 0.00000016 * T);
  const obliqCorr = obliq + 0.00256 * Math.cos(omega * DEG);

  // Declination
  const sinDec = Math.sin(obliqCorr * DEG) * Math.sin(lambda * DEG);
  const dec = Math.asin(sinDec) * RAD;

  // Equation of time
  const y2 = Math.tan(obliqCorr / 2 * DEG) ** 2;
  const EqTime = 4 * RAD * (
    y2 * Math.sin(2 * L0 * DEG)
    - 2 * e * Math.sin(M * DEG)
    + 4 * e * y2 * Math.sin(M * DEG) * Math.cos(2 * L0 * DEG)
    - 0.5 * y2 * y2 * Math.sin(4 * L0 * DEG)
    - 1.25 * e * e * Math.sin(2 * M * DEG)
  );

  // True solar time
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolarTime = (utcMinutes + EqTime + 4 * lon) % 1440;

  // Hour angle
  let hourAngle = trueSolarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  // Solar zenith / elevation
  const cosZenith = Math.sin(lat * DEG) * Math.sin(dec * DEG)
                  + Math.cos(lat * DEG) * Math.cos(dec * DEG) * Math.cos(hourAngle * DEG);
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZenith))) * RAD;
  const elevation = 90 - zenith;

  return { elevation, declination: dec, eqTime: EqTime };
}

// Find time when sun reaches a given elevation on a given day
export function findElevationTime(dateUTCMidnight, lat, lon, targetElev, rising) {
  const solarNoonH = 12 - (lon / 15);

  let lo, hi;
  if (rising) {
    lo = new Date(dateUTCMidnight.getTime() + ((solarNoonH - 8) * 3600000));
    hi = new Date(dateUTCMidnight.getTime() + (solarNoonH * 3600000));
  } else {
    lo = new Date(dateUTCMidnight.getTime() + (solarNoonH * 3600000));
    hi = new Date(dateUTCMidnight.getTime() + ((solarNoonH + 8) * 3600000));
  }

  const noonTime = new Date(dateUTCMidnight.getTime() + (solarNoonH * 3600000));
  const noonElev = solarPosition(noonTime, lat, lon).elevation;
  if (noonElev < targetElev) return null;

  for (let i = 0; i < 50; i++) {
    const mid = new Date((lo.getTime() + hi.getTime()) / 2);
    const elev = solarPosition(mid, lat, lon).elevation;
    if ((rising && elev < targetElev) || (!rising && elev > targetElev)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return new Date((lo.getTime() + hi.getTime()) / 2);
}

// Get vitamin D window for a given date — two thresholds
export function getVitDWindow(date, lat, lon) {
  const OPTIMAL = 45;  // degrees — strong UVB, efficient synthesis
  const POSSIBLE = 30; // degrees — reduced UVB, slower but real synthesis

  const dateUTCMidnight = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const solarNoonH = 12 - (lon / 15);
  const noonTime = new Date(dateUTCMidnight.getTime() + (solarNoonH * 3600000));

  let maxElev = -90;
  for (let m = -60; m <= 60; m++) {
    const t = new Date(noonTime.getTime() + m * 60000);
    const e = solarPosition(t, lat, lon).elevation;
    if (e > maxElev) maxElev = e;
  }

  const result = { maxElevation: maxElev, date: new Date(date), optimal: null, extended: null };

  if (maxElev >= OPTIMAL) {
    const rise = findElevationTime(dateUTCMidnight, lat, lon, OPTIMAL, true);
    const set = findElevationTime(dateUTCMidnight, lat, lon, OPTIMAL, false);
    if (rise && set) {
      result.optimal = { start: rise, end: set, duration: (set - rise) / 60000 };
    }
  }

  if (maxElev >= POSSIBLE) {
    const rise = findElevationTime(dateUTCMidnight, lat, lon, POSSIBLE, true);
    const set = findElevationTime(dateUTCMidnight, lat, lon, POSSIBLE, false);
    if (rise && set) {
      result.extended = { start: rise, end: set, duration: (set - rise) / 60000 };
    }
  }

  const best = result.optimal || result.extended;
  result.available = !!best;
  if (best) { result.start = best.start; result.end = best.end; result.duration = best.duration; }
  return result;
}

// Estimate clear-sky UV Index — Madronich (2007) formula
export function estimateUVI(elevation, ozoneDU) {
  if (elevation <= 0) return 0;
  const sza = 90 - elevation;
  const mu0 = Math.cos(sza * DEG);
  const omega = ozoneDU || 300;
  return Math.max(0, 12.5 * Math.pow(mu0, 2.42) * Math.pow(omega / 300, -1.23));
}

// Estimate seasonal ozone column (rough, based on latitude and month)
export function estimateOzone(lat, month) {
  const absLat = Math.abs(lat);
  const base = absLat < 20 ? 260 : absLat < 40 ? 300 : absLat < 60 ? 320 : 340;
  const seasonFactor = lat >= 0
    ? 1 + 0.1 * Math.cos((month - 3) * Math.PI / 6)
    : 1 + 0.1 * Math.cos((month - 9) * Math.PI / 6);
  return base * seasonFactor;
}
