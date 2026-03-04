// ===== SVG Chart: Solar Elevation + UV Index =====
import { state } from './state.js';
import { solarPosition, estimateOzone, estimateUVI } from './solar.js';

function formatTimeLocal(date) {
  const opts = { hour: '2-digit', minute: '2-digit' };
  if (state.timezone) opts.timeZone = state.timezone;
  return date.toLocaleTimeString('fr-FR', opts);
}

function uvColor(v) {
  return v < 3 ? '#7C4DFF' : v < 6 ? '#FF9800' : v < 8 ? '#FF5722' : v < 11 ? '#D32F2F' : '#7B1FA2';
}

/**
 * Build the SVG elevation + UV chart HTML block.
 * Returns an HTML string ready to inject into the page.
 */
export function buildChartHTML(lat, lon) {
  const now = new Date();
  const ozoneDU = estimateOzone(lat, now.getMonth());
  const currentElev = solarPosition(now, lat, lon).elevation;
  const chartDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const solarNoonH = 12 - (lon / 15);

  const chartPts = [];
  for (let m = (solarNoonH - 9) * 60; m <= (solarNoonH + 9) * 60; m += 10) {
    const t = new Date(chartDate.getTime() + m * 60000);
    const el = solarPosition(t, lat, lon).elevation;
    chartPts.push({ m, elev: el, uvi: estimateUVI(el, ozoneDU) });
  }
  const sp = chartPts.filter(p => p.elev > 0);

  if (sp.length < 2) {
    return `<div class="elevation-meter">
      <div class="meter-label">Courbe solaire du jour</div>
      <p style="color:var(--text-muted);font-size:0.9rem">Le soleil ne se lève pas aujourd'hui à cette latitude.</p>
    </div>`;
  }

  const W = 500, H = 220, PL = 38, PR = 38, PT = 14, PB = 28;
  const cW = W - PL - PR, cH = H - PT - PB;
  const mxE = Math.max(...sp.map(p => p.elev), 50);
  const mxU = Math.max(...sp.map(p => p.uvi), 3);
  const eC = Math.ceil(mxE / 10) * 10;
  const uC = Math.ceil(mxU);
  const m0 = sp[0].m, m1 = sp[sp.length - 1].m;
  const xS = m => PL + ((m - m0) / (m1 - m0)) * cW;
  const yE = e => PT + cH - (Math.max(0, e) / eC) * cH;
  const yU = u => PT + cH - (Math.max(0, u) / uC) * cH;

  let eP = '', uP = '';
  sp.forEach((p, i) => {
    const x = xS(p.m).toFixed(1), ye = yE(p.elev).toFixed(1), yu = yU(p.uvi).toFixed(1);
    eP += (i ? 'L' : 'M') + x + ',' + ye;
    uP += (i ? 'L' : 'M') + x + ',' + yu;
  });

  const bY = yE(0).toFixed(1), fX = xS(m0).toFixed(1), lX = xS(m1).toFixed(1);
  const eA = eP + 'L' + lX + ',' + bY + 'L' + fX + ',' + bY + 'Z';
  const uA = uP + 'L' + lX + ',' + bY + 'L' + fX + ',' + bY + 'Z';
  const y30 = yE(30), y45 = yE(45);

  // "Now" marker
  const nowMin = (now.getTime() - chartDate.getTime()) / 60000;
  const nowUvi = estimateUVI(currentElev, ozoneDU);
  let nowMarker = '';
  if (nowMin >= m0 && nowMin <= m1 && currentElev > 0) {
    const nx = xS(nowMin).toFixed(1), ne = yE(currentElev).toFixed(1), nu = yU(nowUvi).toFixed(1);
    nowMarker = `<line x1="${nx}" x2="${nx}" y1="${PT}" y2="${bY}" stroke="#2C1810" stroke-width="1" stroke-dasharray="2,2" opacity="0.25"/>
      <circle cx="${nx}" cy="${ne}" r="4.5" fill="#E8890C" stroke="white" stroke-width="2"/>
      <circle cx="${nx}" cy="${nu}" r="3.5" fill="#7C4DFF" stroke="white" stroke-width="1.5"/>
      <text x="${nx}" y="${PT - 2}" fill="#2C1810" font-size="8" text-anchor="middle" font-family="DM Sans,sans-serif" font-weight="500">maintenant</text>`;
  }

  // Time labels
  const timeLabels = [];
  for (let h = Math.ceil(m0 / 60); h <= Math.floor(m1 / 60); h++) {
    if (h % 2 === 0 || (m1 - m0) / 60 < 10) {
      const x = xS(h * 60);
      if (x > PL + 10 && x < W - PR - 10) {
        const ld = new Date(chartDate.getTime() + h * 3600000);
        timeLabels.push({ x, l: formatTimeLocal(ld) });
      }
    }
  }

  const eT = [];
  for (let e = 0; e <= eC; e += eC <= 30 ? 10 : 15) eT.push(e);
  const uSt = uC <= 4 ? 1 : uC <= 8 ? 2 : 3;
  const uT = [];
  for (let u = 0; u <= uC; u += uSt) uT.push(u);

  const maxUvi = Math.max(...sp.map(p => p.uvi));

  return `
    <div class="elevation-meter">
      <div class="meter-label">Courbe solaire du jour</div>
      <div class="chart-values">
        <div class="chart-value-block">
          <div class="chart-value-num">${currentElev > 0 ? currentElev.toFixed(1) + '°' : '—'}</div>
          <div class="chart-value-label">Élévation</div>
        </div>
        <div class="chart-value-block">
          <div class="chart-value-num" style="color:${uvColor(nowUvi)}">${currentElev > 0 ? nowUvi.toFixed(1) : '—'}</div>
          <div class="chart-value-label">Indice UV (est.)</div>
        </div>
        <div class="chart-value-block">
          <div class="chart-value-num">${solarPosition(new Date(chartDate.getTime() + solarNoonH * 3600000), lat, lon).elevation.toFixed(1)}°</div>
          <div class="chart-value-label">Éléva. max</div>
        </div>
        <div class="chart-value-block">
          <div class="chart-value-num" style="color:${uvColor(maxUvi)}">${maxUvi.toFixed(1)}</div>
          <div class="chart-value-label">UV max</div>
        </div>
      </div>
      <div class="chart-container">
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="eG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#E8890C" stop-opacity="0.18"/>
              <stop offset="100%" stop-color="#E8890C" stop-opacity="0.02"/>
            </linearGradient>
            <linearGradient id="uG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#7C4DFF" stop-opacity="0.13"/>
              <stop offset="100%" stop-color="#7C4DFF" stop-opacity="0.01"/>
            </linearGradient>
          </defs>

          <!-- Grid -->
          ${eT.map(e => `<line x1="${PL}" x2="${W - PR}" y1="${yE(e).toFixed(1)}" y2="${yE(e).toFixed(1)}" stroke="#E8E0D4" stroke-width="${e === 0 ? 1 : 0.5}"/>`).join('')}

          <!-- Threshold zones -->
          ${y45 >= PT && eC >= 45 ? `<rect x="${PL}" y="${y45.toFixed(1)}" width="${cW}" height="${Math.max(0, y30 - y45).toFixed(1)}" fill="#FF9800" opacity="0.05" rx="2"/>
            <rect x="${PL}" y="${PT}" width="${cW}" height="${Math.max(0, y45 - PT).toFixed(1)}" fill="#4CAF50" opacity="0.05" rx="2"/>` : ''}
          ${eC >= 30 ? `<line x1="${PL}" x2="${W - PR}" y1="${y30.toFixed(1)}" y2="${y30.toFixed(1)}" stroke="#FF9800" stroke-width="1" stroke-dasharray="4,3" opacity="0.45"/>` : ''}
          ${eC >= 45 ? `<line x1="${PL}" x2="${W - PR}" y1="${y45.toFixed(1)}" y2="${y45.toFixed(1)}" stroke="#4CAF50" stroke-width="1" stroke-dasharray="4,3" opacity="0.45"/>` : ''}
          ${eC >= 30 ? `<text x="${PL + 4}" y="${(y30 - 4).toFixed(1)}" fill="#FF9800" font-size="7.5" font-family="DM Sans,sans-serif" opacity="0.7">30°</text>` : ''}
          ${eC >= 45 ? `<text x="${PL + 4}" y="${(y45 - 4).toFixed(1)}" fill="#4CAF50" font-size="7.5" font-family="DM Sans,sans-serif" opacity="0.7">45°</text>` : ''}

          <!-- Area fills -->
          <path d="${eA}" fill="url(#eG)"/>
          <path d="${uA}" fill="url(#uG)"/>

          <!-- Curves -->
          <path d="${eP}" fill="none" stroke="#E8890C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${uP}" fill="none" stroke="#7C4DFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6,3"/>

          <!-- Left Y-axis: Elevation -->
          ${eT.map(e => `<text x="${PL - 5}" y="${yE(e).toFixed(1)}" fill="#E8890C" font-size="9" text-anchor="end" alignment-baseline="middle" font-family="DM Sans,sans-serif" font-weight="500">${e}°</text>`).join('')}
          <text x="4" y="${PT + cH / 2}" fill="#E8890C" font-size="8" text-anchor="middle" font-family="DM Sans,sans-serif" font-weight="600" transform="rotate(-90, 10, ${PT + cH / 2})" opacity="0.7">Élévation (°)</text>

          <!-- Right Y-axis: UV Index -->
          ${uT.map(u => `<text x="${W - PR + 5}" y="${yU(u).toFixed(1)}" fill="#7C4DFF" font-size="9" text-anchor="start" alignment-baseline="middle" font-family="DM Sans,sans-serif" font-weight="500" opacity="0.8">${u}</text>`).join('')}
          <text x="${W - 4}" y="${PT + cH / 2}" fill="#7C4DFF" font-size="8" text-anchor="middle" font-family="DM Sans,sans-serif" font-weight="600" transform="rotate(90, ${W - 10}, ${PT + cH / 2})" opacity="0.7">Indice UV</text>

          <!-- Time labels -->
          ${timeLabels.map(t => `<text x="${t.x.toFixed(1)}" y="${H - 5}" fill="#A89279" font-size="9" text-anchor="middle" font-family="DM Sans,sans-serif">${t.l}</text>`).join('')}

          <!-- Now marker -->
          ${nowMarker}
        </svg>
      </div>
      <div class="chart-legend" style="gap:1.5rem;margin-top:0.7rem">
        <div class="chart-legend-item" style="font-size:0.82rem">
          <svg width="20" height="6" style="flex-shrink:0"><line x1="0" y1="3" x2="20" y2="3" stroke="#E8890C" stroke-width="2.5" stroke-linecap="round"/></svg>
          Élévation solaire
        </div>
        <div class="chart-legend-item" style="font-size:0.82rem">
          <svg width="20" height="6" style="flex-shrink:0"><line x1="0" y1="3" x2="20" y2="3" stroke="#7C4DFF" stroke-width="2" stroke-dasharray="4,2" stroke-linecap="round"/></svg>
          Indice UV (ciel clair)
        </div>
      </div>
    </div>
  `;
}
