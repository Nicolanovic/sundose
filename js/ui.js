// ===== UI Rendering =====
import { state } from './state.js';
import { solarPosition, getVitDWindow, estimateOzone, estimateUVI } from './solar.js';
import { FITZPATRICK, getExposureTime, computeDailyScore, scoreColor, scoreLabel, scoreDesc, getUpcomingWindows } from './vitaminD.js';
import { getDayCloudCover, getCloudCover, cloudEmoji, cloudImpact, cloudUVBFactor } from './weather.js';
import { buildChartHTML } from './chart.js';

export function formatTime(d) {
  const opts = { hour: '2-digit', minute: '2-digit' };
  if (state.timezone) opts.timeZone = state.timezone;
  return d.toLocaleTimeString('en-GB', opts);
}

export function formatDuration(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export function localDateStr(date) {
  if (state.timezone) {
    return date.toLocaleDateString('sv-SE', { timeZone: state.timezone });
  }
  return date.toISOString().slice(0, 10);
}

export function localHour(date) {
  if (state.timezone) {
    return parseInt(date.toLocaleTimeString('en-GB', { timeZone: state.timezone, hour: '2-digit', hour12: false }));
  }
  return date.getUTCHours();
}

export function getDayName(date) {
  const today = new Date();
  const todayStr = localDateStr(today);
  const tomorrowStr = localDateStr(new Date(today.getTime() + 86400000));
  const dateStr = localDateStr(date);
  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';
  const opts = { weekday: 'long', day: 'numeric', month: 'long' };
  if (state.timezone) opts.timeZone = state.timezone;
  return date.toLocaleDateString('en-US', opts);
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

export function renderApp() {
  const { lat, lon, locationName, isGeolocated, phototype } = state;
  const app = document.getElementById('app');

  try {
    const now = new Date();
    const currentElev = solarPosition(now, lat, lon).elevation;
    const todayWindow = getVitDWindow(now, lat, lon);
    const upcoming = getUpcomingWindows(lat, lon, 21);

    const inOptimal = todayWindow.optimal && now >= todayWindow.optimal.start && now <= todayWindow.optimal.end;
    const inExtended = !inOptimal && todayWindow.extended && now >= todayWindow.extended.start && now <= todayWindow.extended.end;

    let html = '';

    // --- Location search bar ---
    html += `
      <div class="location-search" id="location-search">
        <div class="search-wrapper">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            class="search-input"
            id="search-input"
            placeholder="Search for a location…"
            value="${locationName}"
            autocomplete="off"
          />
          <div class="search-results" id="search-results" style="display:none"></div>
        </div>
        <button class="btn-geolocate ${isGeolocated ? 'active' : ''}" onclick="window.requestLocation()" title="Use my GPS location">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
            <circle cx="12" cy="12" r="8"/>
          </svg>
        </button>
      </div>
    `;

    // --- Daily Score ---
    const ozoneDUScore = estimateOzone(lat, now.getMonth());
    const peakUVIScore = estimateUVI(todayWindow.maxElevation, ozoneDUScore);
    const dayCloudScore = getDayCloudCover(now);
    const dailyScore = computeDailyScore(todayWindow.maxElevation, peakUVIScore, dayCloudScore);
    const sColor = scoreColor(dailyScore);
    const circumference = 2 * Math.PI * 54;
    const dashOffset = circumference - (dailyScore / 100) * circumference;

    html += `
      <div class="score-card">
        <div class="meter-label">Today's vitamin D score</div>
        <div class="score-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#F0EAE0" stroke-width="8"/>
            <circle cx="60" cy="60" r="54" fill="none" stroke="${sColor}" stroke-width="8" stroke-linecap="round"
              stroke-dasharray="${circumference.toFixed(1)}" stroke-dashoffset="${dashOffset.toFixed(1)}"
              style="transition: stroke-dashoffset 1s ease-out"/>
          </svg>
          <div class="score-num">${dailyScore}<span class="score-label">${scoreLabel(dailyScore)}</span></div>
        </div>
        <div class="score-desc">${scoreDesc(dailyScore)}</div>
        <div class="score-breakdown">
          <span>☀️ Sun ${todayWindow.maxElevation.toFixed(0)}°</span>
          <span style="color:#7C4DFF">UV ${peakUVIScore.toFixed(1)}</span>
          ${dayCloudScore !== null ? `<span>${cloudEmoji(dayCloudScore)} ${dayCloudScore}%</span>` : ''}
        </div>
      </div>
    `;

    // --- Status card ---
    html += buildStatusCard(now, todayWindow, upcoming, inOptimal, inExtended);

    // --- Solar chart ---
    html += buildChartHTML(lat, lon);

    // --- Upcoming windows timeline ---
    html += buildTimeline(lat, lon, now, upcoming, phototype);

    // --- Phototype selector ---
    html += buildPhototypeBar(lat, lon, now, todayWindow, phototype);

    // --- Info cards ---
    html += buildInfoCard();
    html += buildUVSafetyCard();

    app.innerHTML = html;

    // Attach search listeners after render
    setTimeout(() => window.initSearchInput('search-input', 'search-results'), 50);

  } catch (err) {
    console.error('renderApp error:', err);
    app.innerHTML = `
      <div class="error-state">
        <div class="emoji">⚠️</div>
        <h3>Something went wrong</h3>
        <p>Unable to display data. Check your connection and try again.</p>
        <button class="btn-retry" onclick="window.requestLocation()">Retry</button>
      </div>
    `;
  }
}

function buildStatusCard(now, todayWindow, upcoming, inOptimal, inExtended) {
  const nowCloud = getCloudCover(now);
  const isHeavyClouds = nowCloud !== null && nowCloud >= 95;
  const isModClouds = nowCloud !== null && nowCloud >= 75;
  const cloudLine = nowCloud !== null
    ? `<div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(0,0,0,0.06);font-size:0.85rem;color:var(--text-soft)">${cloudEmoji(nowCloud)} Cloud cover: <strong>${nowCloud}%</strong> — ${cloudImpact(nowCloud)}</div>`
    : '';

  if (inOptimal) {
    const remaining = Math.round((todayWindow.optimal.end.getTime() - now.getTime()) / 60000);
    const extInfo = todayWindow.extended ? ` (reduced synthesis until ${formatTime(todayWindow.extended.end)})` : '';
    let statusEmoji = '☀️', statusMsg = 'Get outside and soak up the sun!';
    let statusAdvice = '10–20 min of arms and face exposed is enough.';
    if (isHeavyClouds) {
      statusEmoji = '☁️'; statusMsg = 'Optimal window, but heavily overcast';
      statusAdvice = 'Sun is well positioned. About 30–45% of UVB still gets through — synthesis is possible but 2–3× slower. Watch for breaks in the clouds.';
    } else if (isModClouds) {
      statusEmoji = '🌥️'; statusMsg = 'Optimal window, thick clouds';
      statusAdvice = 'UVB is roughly halved. Allow 2× longer exposure, or wait for a sunny spell.';
    } else if (nowCloud !== null && nowCloud >= 50) {
      statusEmoji = '⛅'; statusMsg = 'Optimal window, partly cloudy';
      statusAdvice = '50–75% of UVB gets through the clouds. Good synthesis, slightly slower.';
    }
    return `
      <div class="status-card ${isHeavyClouds ? '' : 'active'}" ${isModClouds && !isHeavyClouds ? 'style="border-left:4px solid var(--orange)"' : isHeavyClouds ? 'style="border-left:4px solid #9E9E9E"' : ''}>
        <div class="status-badge ${isHeavyClouds ? '' : 'available'}" ${isHeavyClouds ? 'style="background:#F5F5F5;color:#757575"' : isModClouds ? 'style="background:#FFF3E0;color:#E65100"' : ''}>
          <span class="dot" ${isHeavyClouds ? 'style="background:#9E9E9E"' : isModClouds ? 'style="background:var(--orange)"' : ''}></span>
          ${isHeavyClouds ? 'Very slow synthesis — overcast' : isModClouds ? 'Reduced synthesis' : 'Optimal synthesis in progress'}
        </div>
        <div class="status-main">${statusEmoji} ${statusMsg}</div>
        <div class="status-detail">
          Optimal window until <strong>${formatTime(todayWindow.optimal.end)}</strong> — <strong>${formatDuration(remaining)}</strong> remaining.<br>
          ${statusAdvice}${extInfo ? `<br><span style="color:var(--text-muted);font-size:0.85rem">↳ ${extInfo}</span>` : ''}
          ${cloudLine}
        </div>
      </div>
    `;
  }

  if (inExtended) {
    const remaining = Math.round((todayWindow.extended.end.getTime() - now.getTime()) / 60000);
    let statusEmoji = '🌤️', statusMsg = 'Vitamin D possible, but slowly';
    let statusAdvice = 'Sun is between 30° and 45° — UVB is limited. Allow 30–45 min.';
    if (isHeavyClouds) {
      statusEmoji = '☁️'; statusMsg = 'Reduced window and heavily overcast';
      statusAdvice = 'Sun is low and the overcast sky lets through ~35% of UVB. Synthesis is possible but very slow — plan a long exposure or wait for a better window.';
    } else if (isModClouds) {
      statusEmoji = '🌥️'; statusMsg = 'Reduced window and cloudy';
      statusAdvice = 'Sun is low and clouds further reduce UVB (~40–55% transmitted). Very slow synthesis.';
    } else if (nowCloud !== null && nowCloud >= 50) {
      statusEmoji = '⛅'; statusMsg = 'Reduced window, partly cloudy';
      statusAdvice = 'Sun is low and partly veiled. Slow but possible synthesis.';
    }
    return `
      <div class="status-card" style="border-left:4px solid ${isHeavyClouds ? '#9E9E9E' : 'var(--orange)'}">
        <div class="status-badge" style="background:${isHeavyClouds ? '#F5F5F5' : '#FFF3E0'};color:${isHeavyClouds ? '#757575' : '#E65100'}">
          <span class="dot" style="background:${isHeavyClouds ? '#9E9E9E' : 'var(--orange)'}"></span>
          ${isHeavyClouds ? 'Very slow synthesis — overcast' : 'Reduced synthesis possible'}
        </div>
        <div class="status-main">${statusEmoji} ${statusMsg}</div>
        <div class="status-detail">
          ${statusAdvice}<br>
          Extended window until <strong>${formatTime(todayWindow.extended.end)}</strong> — <strong>${formatDuration(remaining)}</strong> remaining.
          ${todayWindow.optimal
            ? `<br><span style="color:var(--text-muted);font-size:0.85rem">↳ Optimal window ended at ${formatTime(todayWindow.optimal.end)}</span>`
            : `<br><span style="color:var(--text-muted);font-size:0.85rem">↳ Sun does not reach 45° today (max ${todayWindow.maxElevation.toFixed(1)}°)</span>`}
          ${cloudLine}
        </div>
      </div>
    `;
  }

  if (todayWindow.available && todayWindow.extended && now < todayWindow.extended.start) {
    const startWindow = todayWindow.optimal || todayWindow.extended;
    const windowMidCloud = getCloudCover(startWindow.start);
    const futureCloudLine = windowMidCloud !== null
      ? `<div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(0,0,0,0.06);font-size:0.85rem;color:var(--text-soft)">${cloudEmoji(windowMidCloud)} Forecast at window start: <strong>${windowMidCloud}%</strong> — ${cloudImpact(windowMidCloud)}</div>`
      : '';
    return `
      <div class="status-card inactive">
        <div class="status-badge unavailable"><span class="dot"></span> Not yet available</div>
        <div class="status-main">⏳ Coming up soon</div>
        <div class="status-detail">
          ${todayWindow.extended ? `Extended window (≥30°): <strong>${formatTime(todayWindow.extended.start)}</strong> → <strong>${formatTime(todayWindow.extended.end)}</strong> (${formatDuration(todayWindow.extended.duration)})` : ''}
          ${todayWindow.optimal ? `<br>Optimal window (≥45°): <strong>${formatTime(todayWindow.optimal.start)}</strong> → <strong>${formatTime(todayWindow.optimal.end)}</strong> (${formatDuration(todayWindow.optimal.duration)})` : ''}
          ${futureCloudLine}
        </div>
      </div>
    `;
  }

  const nextAvail = upcoming.findIndex((w, i) => i > 0 && w.available);
  return `
    <div class="status-card inactive">
      <div class="status-badge unavailable"><span class="dot"></span> Not available</div>
      <div class="status-main">🌙 Sun is not high enough</div>
      <div class="status-detail">
        ${todayWindow.available
          ? "Today's windows are over."
          : `Max elevation today: ${todayWindow.maxElevation.toFixed(1)}° (at least 30° is needed for any synthesis).`}
        ${nextAvail > 0
          ? `<br>Next window: <strong>${capitalize(getDayName(upcoming[nextAvail].date))}</strong>.`
          : `<br>No window expected in the next 21 days at this latitude.`}
      </div>
    </div>
  `;
}

function buildTimeline(lat, lon, now, upcoming, phototype) {
  const windowsToShow = upcoming.filter(w => w.available).slice(0, 7);

  if (windowsToShow.length === 0) {
    return `
      <div class="timeline-card">
        <div class="timeline-title">Upcoming windows</div>
        <div class="timeline-row">
          <div class="timeline-info">
            <div class="timeline-date">No windows in the next 21 days</div>
            <div class="timeline-hours">At your latitude (${lat.toFixed(1)}°), solar vitamin D is mainly available from April to September. Supplementation is recommended.</div>
          </div>
        </div>
      </div>
    `;
  }

  let html = `<div class="timeline-card"><div class="timeline-title">Upcoming vitamin D windows</div>`;

  windowsToShow.forEach((w, i) => {
    const hasOptimal = !!w.optimal;
    const mainWindow = w.optimal || w.extended;
    const dayCloud = getDayCloudCover(w.date);
    const cloudTag = dayCloud !== null ? `<span style="font-size:0.8rem;color:var(--text-muted);margin-left:4px">${cloudEmoji(dayCloud)} ${dayCloud}%</span>` : '';

    const maxElev = w.maxElevation;
    const ozone = estimateOzone(lat, w.date.getMonth());
    const peakUvi = estimateUVI(maxElev, ozone);
    const dc = dayCloud;
    const idc = dc !== null && dc >= 75;
    const idvc = dc !== null && dc >= 95;

    let detailRows = '';

    if (hasOptimal) {
      detailRows += `<div class="detail-row"><span class="detail-icon">☀️</span> Optimal window (≥45°): ${formatTime(w.optimal.start)} → ${formatTime(w.optimal.end)} (${formatDuration(w.optimal.duration)})</div>`;
    }
    if (w.extended) {
      detailRows += `<div class="detail-row"><span class="detail-icon">🌤️</span> Extended window (≥30°): ${formatTime(w.extended.start)} → ${formatTime(w.extended.end)} (${formatDuration(w.extended.duration)})</div>`;
    }

    const cloudFactorDay = cloudUVBFactor(dc);
    const effectiveUviDay = peakUvi * cloudFactorDay;
    const expTime = getExposureTime(effectiveUviDay, phototype);
    const clearTime = getExposureTime(peakUvi, phototype);
    const ftLabel = FITZPATRICK[phototype - 1].name.toLowerCase();

    function uvC(v) { return v < 3 ? '#7C4DFF' : v < 6 ? '#FF9800' : v < 8 ? '#FF5722' : v < 11 ? '#D32F2F' : '#7B1FA2'; }

    detailRows += `<div class="detail-row"><span class="detail-icon">📐</span>Max elevation: <strong>${maxElev.toFixed(1)}°</strong> &nbsp;·&nbsp; Max UV: <strong style="color:${uvC(peakUvi)}">${peakUvi.toFixed(1)}</strong></div>`;

    if (expTime) {
      const cloudAdj = dc !== null && dc >= 25 && clearTime ? ` (${clearTime} min in clear sky)` : '';
      detailRows += `<div class="detail-row"><span class="detail-icon">⏱️</span> Estimated time for your skin type (${ftLabel}): <strong>${expTime} min</strong>${cloudAdj}</div>`;
    }

    if (peakUvi >= 8) {
      detailRows += `<div class="detail-row"><span class="detail-icon">🛡️</span> Very high UV — SPF 50+ sunscreen essential after your dose. Quick burn risk.</div>`;
    } else if (peakUvi >= 6) {
      detailRows += `<div class="detail-row"><span class="detail-icon">🧴</span> High UV — apply SPF 30+ sunscreen after your exposure.</div>`;
    } else if (peakUvi >= 3) {
      detailRows += `<div class="detail-row"><span class="detail-icon">🧴</span> Moderate UV — protection recommended beyond the synthesis window.</div>`;
    } else {
      detailRows += `<div class="detail-row"><span class="detail-icon">ℹ️</span> Low UV — low burn risk, but synthesis is slower.</div>`;
    }

    if (dc !== null) {
      let weatherAdvice = '';
      if (idvc) weatherAdvice = 'Heavy overcast — ~35% of UVB gets through. Synthesis possible but 2–3× slower. Watch for sunny spells.';
      else if (idc) weatherAdvice = 'Very cloudy — ~40–55% of UVB gets through. Allow about 2× longer exposure.';
      else if (dc >= 50) weatherAdvice = 'Partly cloudy — ~60% of UVB gets through. Synthesis slightly slower.';
      else if (dc >= 25) weatherAdvice = 'Mostly clear — ~80% of UVB gets through. Good conditions.';
      else weatherAdvice = 'Clear sky — ~90% of UVB gets through. Ideal conditions.';
      detailRows += `<div class="detail-row"><span class="detail-icon">${cloudEmoji(dc)}</span> Forecast cloud cover (10am–4pm): <strong>${dc}%</strong> — ${weatherAdvice}</div>`;
    }

    let verdict = '';
    if (idvc && !hasOptimal) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">⚠️</span> <strong>Verdict:</strong> reduced window + overcast. Very slow synthesis — try during any sunny spell.</div>`;
    } else if (idvc) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">🤞</span> <strong>Verdict:</strong> optimal window but overcast. Synthesis still possible (~35% UVB) — allow more time or watch for sunny spells.</div>`;
    } else if (idc && !hasOptimal) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">⚠️</span> <strong>Verdict:</strong> reduced window and cloudy. Very slow synthesis — plan a long exposure.</div>`;
    } else if (idc) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">🤞</span> <strong>Verdict:</strong> optimal window but cloudy. Allow about 2× longer than in clear sky.</div>`;
    } else if (hasOptimal && dc !== null && dc < 50) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">✅</span> <strong>Verdict:</strong> great conditions! 10–20 min of exposure will do.</div>`;
    } else if (hasOptimal) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">👍</span> <strong>Verdict:</strong> optimal window with some clouds. Decent conditions.</div>`;
    } else if (dc !== null && dc < 50) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">🆗</span> <strong>Verdict:</strong> reduced window but fairly clear. Allow 30–45 min.</div>`;
    } else {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">🆗</span> <strong>Verdict:</strong> reduced window, decent conditions.</div>`;
    }
    detailRows += verdict;

    html += `
      <div class="timeline-row" id="tl-${i}">
        <div class="timeline-header" onclick="document.getElementById('tl-${i}').classList.toggle('open')">
          <div class="timeline-info">
            <div class="timeline-date">${capitalize(getDayName(w.date))}${cloudTag}</div>
            <div class="timeline-hours">${hasOptimal ? `☀️ ${formatTime(w.optimal.start)} → ${formatTime(w.optimal.end)}` : `🌤️ ${formatTime(w.extended.start)} → ${formatTime(w.extended.end)}`} <span style="color:var(--text-muted);font-size:0.8rem">(${hasOptimal ? 'optimal' : 'reduced'})</span></div>
          </div>
          <div class="timeline-duration">${formatDuration(mainWindow.duration)}</div>
          <svg class="timeline-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="timeline-detail">
          <div class="timeline-detail-inner">${detailRows}</div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  return html;
}

function buildPhototypeBar(lat, lon, now, todayWindow, phototype) {
  const ft = FITZPATRICK[phototype - 1];
  const peakUVIForExposure = estimateUVI(todayWindow.maxElevation, estimateOzone(lat, now.getMonth()));
  const dayCloudForExposure = getDayCloudCover(now);
  const cloudFactor = cloudUVBFactor(dayCloudForExposure);
  const effectiveUVI = peakUVIForExposure * cloudFactor;
  const exposureTime = getExposureTime(effectiveUVI, phototype);
  const clearSkyTime = getExposureTime(peakUVIForExposure, phototype);
  const showCloudAdjust = dayCloudForExposure !== null && dayCloudForExposure >= 25 && clearSkyTime && exposureTime;

  return `
    <div class="phototype-bar">
      <div class="meter-label">Personalised exposure time</div>
      <div class="phototype-options">
        ${FITZPATRICK.map(f => `
          <div class="phototype-btn ${f.id === phototype ? 'active' : ''}" onclick="window.setPhototype(${f.id})">
            <div class="phototype-dot" style="background:${f.color}"></div>
            ${f.label}
          </div>
        `).join('')}
      </div>
      <div class="phototype-info">${ft.label} · ${ft.name} — ${ft.desc}</div>
      ${exposureTime ? `
        <div style="margin-top:1rem;padding-top:0.8rem;border-top:1px solid rgba(0,0,0,0.06)">
          <div style="font-size:1.1rem;color:var(--text);font-weight:500">⏱️ About <strong style="font-family:'Instrument Serif',serif;font-size:1.6rem">${exposureTime} min</strong></div>
          <div style="font-size:0.82rem;color:var(--text-soft);margin-top:4px;line-height:1.5">
            Estimated time to synthesise your daily vitamin D dose (1000 IU).<br>
            Arms and face exposed, no sunscreen, at today's peak UV (${peakUVIForExposure.toFixed(1)}).
            ${showCloudAdjust ? `<br>${cloudEmoji(dayCloudForExposure)} Adjusted for cloud cover (${dayCloudForExposure}%) — in clear sky it would be ~${clearSkyTime} min.` : ''}
          </div>
          ${peakUVIForExposure >= 6 ? `<div style="font-size:0.8rem;color:#E65100;margin-top:6px">🧴 Apply SPF 30+ sunscreen immediately after this time.</div>` : ''}
          ${peakUVIForExposure >= 8 ? `<div style="font-size:0.8rem;color:#D32F2F;margin-top:2px">🛡️ Very high UV — do not exceed this time without protection.</div>` : ''}
        </div>
      ` : `
        <div style="margin-top:1rem;padding-top:0.8rem;border-top:1px solid rgba(0,0,0,0.06)">
          <div style="font-size:0.88rem;color:var(--text-muted)">UV is not strong enough today for significant synthesis.</div>
        </div>
      `}
    </div>
  `;
}

function buildInfoCard() {
  return `
    <div class="info-card">
      <div class="meter-label">How does it work?</div>
      <div class="info-item">
        <span class="icon">🔬</span>
        <p>Skin synthesises vitamin D using <strong>UVB</strong> rays. How much reaches the ground depends on the sun's elevation.</p>
      </div>
      <div class="info-item">
        <span class="icon">☀️</span>
        <p><strong>≥ 45° (optimal)</strong> — Enough UVB reaches the ground. 10–20 min of arms and face exposed is sufficient. Your shadow is shorter than you.</p>
      </div>
      <div class="info-item">
        <span class="icon">🌤️</span>
        <p><strong>30°–45° (reduced)</strong> — UVB is limited. Synthesis is possible but slower — allow 30–45 min. Your shadow is longer than you.</p>
      </div>
      <div class="info-item">
        <span class="icon">⏱️</span>
        <p>These times are estimates. Altitude, cloud cover and air pollution significantly affect actual synthesis.</p>
      </div>
      <div class="info-item">
        <span class="icon">💊</span>
        <p>Above ~40° north latitude, windows are <strong>rare in winter</strong>. Vitamin D supplementation is often recommended from October to March.</p>
      </div>
    </div>
  `;
}

function buildUVSafetyCard() {
  return `
    <div class="info-card">
      <div class="meter-label">UV safety</div>
      <div class="info-item" style="margin-bottom:0.8rem">
        <span class="icon">⚠️</span>
        <p>The same UVB that makes vitamin D also damages skin DNA. Never exceed the recommended exposure time, and apply SPF 30+ sunscreen after your 10–20 min synthesis window. Fair skin is especially vulnerable.</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:0.82rem;line-height:1.45">
        <thead>
          <tr style="text-align:left;border-bottom:2px solid rgba(0,0,0,0.08)">
            <th style="padding:6px 8px;font-weight:600;color:var(--text)">UV Index</th>
            <th style="padding:6px 8px;font-weight:600;color:var(--text)">Level</th>
            <th style="padding:6px 8px;font-weight:600;color:var(--text)">Effects & recommendations</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid rgba(0,0,0,0.04)">
            <td style="padding:6px 8px;font-weight:600;color:#4CAF50">0 – 2</td>
            <td style="padding:6px 8px;color:#4CAF50">Low</td>
            <td style="padding:6px 8px;color:var(--text-soft)">Minimal risk. No significant tanning. Sunglasses if high glare.</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(0,0,0,0.04)">
            <td style="padding:6px 8px;font-weight:600;color:#FF9800">3 – 5</td>
            <td style="padding:6px 8px;color:#FF9800">Moderate</td>
            <td style="padding:6px 8px;color:var(--text-soft)">Tanning possible. Sunburn in 30–45 min without protection. SPF 30+, hat.</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(0,0,0,0.04)">
            <td style="padding:6px 8px;font-weight:600;color:#FF5722">6 – 7</td>
            <td style="padding:6px 8px;color:#FF5722">High</td>
            <td style="padding:6px 8px;color:var(--text-soft)">Quick tanning but burn risk within 15–25 min. Avoid sun between 11am–4pm. Protection essential.</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(0,0,0,0.04)">
            <td style="padding:6px 8px;font-weight:600;color:#D32F2F">8 – 10</td>
            <td style="padding:6px 8px;color:#D32F2F">Very high</td>
            <td style="padding:6px 8px;color:var(--text-soft)">Burn in under 15 min. Seek shade, SPF 50+, cover-up clothing, sunglasses.</td>
          </tr>
          <tr>
            <td style="padding:6px 8px;font-weight:600;color:#7B1FA2">11+</td>
            <td style="padding:6px 8px;color:#7B1FA2">Extreme</td>
            <td style="padding:6px 8px;color:var(--text-soft)">Burn in under 10 min. Avoid all direct exposure. Severe and rapid skin damage.</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

export function showError(message) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="error-state">
      <div class="emoji">📍</div>
      <h3>Location required</h3>
      <p>${message}</p>
      <div style="display:flex;flex-direction:column;gap:12px;align-items:center">
        <button class="btn-retry" onclick="window.requestLocation()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Allow location access
        </button>
        <span style="color:var(--text-muted);font-size:0.85rem">or search for a location below</span>
        <div class="location-search" style="margin-bottom:0;width:100%;max-width:400px">
          <div class="search-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input type="text" class="search-input" id="search-input-fallback" placeholder="New York, London, Paris…" autocomplete="off" />
            <div class="search-results" id="search-results-fallback" style="display:none"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => window.initSearchInput('search-input-fallback', 'search-results-fallback'), 50);
}
