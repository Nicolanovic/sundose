// ===== UI Rendering =====
import { state } from './state.js';
import { solarPosition, getVitDWindow, estimateOzone, estimateUVI } from './solar.js';
import { FITZPATRICK, getExposureTime, computeDailyScore, scoreColor, scoreLabel, scoreDesc, getUpcomingWindows } from './vitaminD.js';
import { getDayCloudCover, getCloudCover, cloudEmoji, cloudImpact, cloudUVBFactor } from './weather.js';
import { buildChartHTML } from './chart.js';

export function formatTime(d) {
  const opts = { hour: '2-digit', minute: '2-digit' };
  if (state.timezone) opts.timeZone = state.timezone;
  return d.toLocaleTimeString('fr-FR', opts);
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
  if (dateStr === todayStr) return "Aujourd'hui";
  if (dateStr === tomorrowStr) return 'Demain';
  const opts = { weekday: 'long', day: 'numeric', month: 'long' };
  if (state.timezone) opts.timeZone = state.timezone;
  return date.toLocaleDateString('fr-FR', opts);
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
            placeholder="Rechercher un lieu…"
            value="${locationName}"
            autocomplete="off"
          />
          <div class="search-results" id="search-results" style="display:none"></div>
        </div>
        <button class="btn-geolocate ${isGeolocated ? 'active' : ''}" onclick="window.requestLocation()" title="Utiliser ma position GPS">
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
        <div class="meter-label">Score vitamine D du jour</div>
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
          <span>☀️ Soleil ${todayWindow.maxElevation.toFixed(0)}°</span>
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

    // --- Info card ---
    html += buildInfoCard();

    app.innerHTML = html;

    // Attach search listeners after render
    setTimeout(() => window.initSearchInput('search-input', 'search-results'), 50);

  } catch (err) {
    console.error('renderApp error:', err);
    app.innerHTML = `
      <div class="error-state">
        <div class="emoji">⚠️</div>
        <h3>Une erreur est survenue</h3>
        <p>Impossible d'afficher les données. Vérifiez votre connexion et réessayez.</p>
        <button class="btn-retry" onclick="window.requestLocation()">Réessayer</button>
      </div>
    `;
  }
}

function buildStatusCard(now, todayWindow, upcoming, inOptimal, inExtended) {
  const nowCloud = getCloudCover(now);
  const isHeavyClouds = nowCloud !== null && nowCloud >= 95;
  const isModClouds = nowCloud !== null && nowCloud >= 75;
  const cloudLine = nowCloud !== null
    ? `<div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(0,0,0,0.06);font-size:0.85rem;color:var(--text-soft)">${cloudEmoji(nowCloud)} Nébulosité : <strong>${nowCloud}%</strong> — ${cloudImpact(nowCloud)}</div>`
    : '';

  if (inOptimal) {
    const remaining = Math.round((todayWindow.optimal.end.getTime() - now.getTime()) / 60000);
    const extInfo = todayWindow.extended ? ` (synthèse réduite jusqu'à ${formatTime(todayWindow.extended.end)})` : '';
    let statusEmoji = '☀️', statusMsg = 'Sortez profiter du soleil !';
    let statusAdvice = '10 à 20 min d\'exposition des bras et du visage suffisent.';
    if (isHeavyClouds) {
      statusEmoji = '☁️'; statusMsg = 'Créneau optimal, mais ciel très couvert';
      statusAdvice = 'Le soleil est bien positionné. Environ 30–45 % des UVB passent quand même — la synthèse est possible mais 2 à 3× plus lente. Guettez les éclaircies.';
    } else if (isModClouds) {
      statusEmoji = '🌥️'; statusMsg = 'Créneau optimal, nuages épais';
      statusAdvice = 'Les UVB sont réduits de moitié environ. Prévoyez une exposition 2× plus longue, ou attendez une éclaircie.';
    } else if (nowCloud !== null && nowCloud >= 50) {
      statusEmoji = '⛅'; statusMsg = 'Créneau optimal, partiellement nuageux';
      statusAdvice = '50 à 75 % des UVB passent entre les nuages. Bonne synthèse, légèrement ralentie.';
    }
    return `
      <div class="status-card ${isHeavyClouds ? '' : 'active'}" ${isModClouds && !isHeavyClouds ? 'style="border-left:4px solid var(--orange)"' : isHeavyClouds ? 'style="border-left:4px solid #9E9E9E"' : ''}>
        <div class="status-badge ${isHeavyClouds ? '' : 'available'}" ${isHeavyClouds ? 'style="background:#F5F5F5;color:#757575"' : isModClouds ? 'style="background:#FFF3E0;color:#E65100"' : ''}>
          <span class="dot" ${isHeavyClouds ? 'style="background:#9E9E9E"' : isModClouds ? 'style="background:var(--orange)"' : ''}></span>
          ${isHeavyClouds ? 'Synthèse très lente — couvert' : isModClouds ? 'Synthèse ralentie' : 'Synthèse optimale en cours'}
        </div>
        <div class="status-main">${statusEmoji} ${statusMsg}</div>
        <div class="status-detail">
          Créneau optimal jusqu'à <strong>${formatTime(todayWindow.optimal.end)}</strong> — il reste <strong>${formatDuration(remaining)}</strong>.<br>
          ${statusAdvice}${extInfo ? `<br><span style="color:var(--text-muted);font-size:0.85rem">↳ ${extInfo}</span>` : ''}
          ${cloudLine}
        </div>
      </div>
    `;
  }

  if (inExtended) {
    const remaining = Math.round((todayWindow.extended.end.getTime() - now.getTime()) / 60000);
    let statusEmoji = '🌤️', statusMsg = 'Vitamine D possible, mais lentement';
    let statusAdvice = 'Le soleil est entre 30° et 45° — les UVB passent en quantité réduite. Prévoyez 30 à 45 min.';
    if (isHeavyClouds) {
      statusEmoji = '☁️'; statusMsg = 'Créneau réduit et ciel très couvert';
      statusAdvice = 'Le soleil est bas et le ciel couvert laisse passer ~35 % des UVB. La synthèse est possible mais très lente — prévoyez une longue exposition ou attendez un meilleur créneau.';
    } else if (isModClouds) {
      statusEmoji = '🌥️'; statusMsg = 'Créneau réduit et nuageux';
      statusAdvice = 'Le soleil est bas et les nuages réduisent encore les UVB (~40–55 % transmis). Synthèse très lente.';
    } else if (nowCloud !== null && nowCloud >= 50) {
      statusEmoji = '⛅'; statusMsg = 'Créneau réduit, partiellement nuageux';
      statusAdvice = 'Le soleil est bas et partiellement voilé. Synthèse lente mais possible.';
    }
    return `
      <div class="status-card" style="border-left:4px solid ${isHeavyClouds ? '#9E9E9E' : 'var(--orange)'}">
        <div class="status-badge" style="background:${isHeavyClouds ? '#F5F5F5' : '#FFF3E0'};color:${isHeavyClouds ? '#757575' : '#E65100'}">
          <span class="dot" style="background:${isHeavyClouds ? '#9E9E9E' : 'var(--orange)'}"></span>
          ${isHeavyClouds ? 'Synthèse très lente — couvert' : 'Synthèse réduite possible'}
        </div>
        <div class="status-main">${statusEmoji} ${statusMsg}</div>
        <div class="status-detail">
          ${statusAdvice}<br>
          Créneau étendu jusqu'à <strong>${formatTime(todayWindow.extended.end)}</strong> — il reste <strong>${formatDuration(remaining)}</strong>.
          ${todayWindow.optimal
            ? `<br><span style="color:var(--text-muted);font-size:0.85rem">↳ Créneau optimal terminé à ${formatTime(todayWindow.optimal.end)}</span>`
            : `<br><span style="color:var(--text-muted);font-size:0.85rem">↳ Le soleil n'atteint pas 45° aujourd'hui (max ${todayWindow.maxElevation.toFixed(1)}°)</span>`}
          ${cloudLine}
        </div>
      </div>
    `;
  }

  if (todayWindow.available && todayWindow.extended && now < todayWindow.extended.start) {
    const startWindow = todayWindow.optimal || todayWindow.extended;
    const windowMidCloud = getCloudCover(startWindow.start);
    const futureCloudLine = windowMidCloud !== null
      ? `<div style="margin-top:0.5rem;padding-top:0.5rem;border-top:1px solid rgba(0,0,0,0.06);font-size:0.85rem;color:var(--text-soft)">${cloudEmoji(windowMidCloud)} Prévision début de créneau : <strong>${windowMidCloud}%</strong> — ${cloudImpact(windowMidCloud)}</div>`
      : '';
    return `
      <div class="status-card inactive">
        <div class="status-badge unavailable"><span class="dot"></span> Pas encore disponible</div>
        <div class="status-main">⏳ Patience, c'est pour bientôt</div>
        <div class="status-detail">
          ${todayWindow.extended ? `Créneau étendu (≥30°) : <strong>${formatTime(todayWindow.extended.start)}</strong> → <strong>${formatTime(todayWindow.extended.end)}</strong> (${formatDuration(todayWindow.extended.duration)})` : ''}
          ${todayWindow.optimal ? `<br>Créneau optimal (≥45°) : <strong>${formatTime(todayWindow.optimal.start)}</strong> → <strong>${formatTime(todayWindow.optimal.end)}</strong> (${formatDuration(todayWindow.optimal.duration)})` : ''}
          ${futureCloudLine}
        </div>
      </div>
    `;
  }

  const nextAvail = upcoming.findIndex((w, i) => i > 0 && w.available);
  return `
    <div class="status-card inactive">
      <div class="status-badge unavailable"><span class="dot"></span> Non disponible</div>
      <div class="status-main">🌙 Le soleil n'est pas assez haut</div>
      <div class="status-detail">
        ${todayWindow.available
          ? "Les créneaux d'aujourd'hui sont terminés."
          : `Élévation max aujourd'hui : ${todayWindow.maxElevation.toFixed(1)}° (il faut au moins 30° pour une synthèse même réduite).`}
        ${nextAvail > 0
          ? `<br>Prochain créneau : <strong>${capitalize(getDayName(upcoming[nextAvail].date))}</strong>.`
          : `<br>Pas de créneau prévu dans les 21 prochains jours à cette latitude.`}
      </div>
    </div>
  `;
}

function cloudPctColor(pct) {
  if (pct < 25) return '#4CAF50';  // vert — dégagé
  if (pct < 50) return '#8BC34A';  // vert clair — peu nuageux
  if (pct < 75) return '#FF9800';  // orange — nuageux
  if (pct < 95) return '#F44336';  // rouge — très nuageux
  return '#9E9E9E';                 // gris — couvert
}

function buildTimeline(lat, lon, now, upcoming, phototype) {
  const windowsToShow = upcoming.filter(w => w.available).slice(0, 7);

  if (windowsToShow.length === 0) {
    return `
      <div class="timeline-card">
        <div class="timeline-title">Prochains créneaux</div>
        <div class="timeline-row">
          <div class="timeline-info">
            <div class="timeline-date">Aucun créneau dans les 21 prochains jours</div>
            <div class="timeline-hours">À votre latitude (${lat.toFixed(1)}°), la vitamine D solaire est surtout disponible d'avril à septembre. Une supplémentation est recommandée.</div>
          </div>
        </div>
      </div>
    `;
  }

  let html = `<div class="timeline-card"><div class="timeline-title">Prochains créneaux vitamine D</div>`;

  windowsToShow.forEach((w, i) => {
    const hasOptimal = !!w.optimal;
    const mainWindow = w.optimal || w.extended;
    const dayCloud = getDayCloudCover(w.date);
    const cloudTag = dayCloud !== null ? `<span style="font-size:0.8rem;color:${cloudPctColor(dayCloud)};margin-left:4px;font-weight:500">${cloudEmoji(dayCloud)} ${dayCloud}%</span>` : '';

    const maxElev = w.maxElevation;
    const ozone = estimateOzone(lat, w.date.getMonth());
    const peakUvi = estimateUVI(maxElev, ozone);
    const dc = dayCloud;
    const idc = dc !== null && dc >= 75;
    const idvc = dc !== null && dc >= 95;

    let detailRows = '';

    if (hasOptimal) {
      detailRows += `<div class="detail-row"><span class="detail-icon">☀️</span><span><strong>Optimal</strong> ${formatTime(w.optimal.start)} – ${formatTime(w.optimal.end)} <span class="dr-meta">${formatDuration(w.optimal.duration)}</span></span></div>`;
    }
    if (w.extended) {
      detailRows += `<div class="detail-row"><span class="detail-icon">🌤️</span><span><strong>Étendu</strong> ${formatTime(w.extended.start)} – ${formatTime(w.extended.end)} <span class="dr-meta">${formatDuration(w.extended.duration)}</span></span></div>`;
    }

    function uvC(v) { return v < 3 ? '#7C4DFF' : v < 6 ? '#FF9800' : v < 8 ? '#FF5722' : v < 11 ? '#D32F2F' : '#7B1FA2'; }

    detailRows += `<div class="detail-row"><span class="detail-icon">📐</span><span>Élévation max <strong>${maxElev.toFixed(1)}°</strong> &nbsp;·&nbsp; UV max <strong style="color:${uvC(peakUvi)}">${peakUvi.toFixed(1)}</strong></span></div>`;

    if (dc !== null) {
      let weatherAdvice = '';
      if (idvc) weatherAdvice = '~35 % UVB — synthèse très lente';
      else if (idc) weatherAdvice = '~40–55 % UVB — prévoyez 2× plus de temps';
      else if (dc >= 50) weatherAdvice = '~60 % UVB — synthèse ralentie';
      else if (dc >= 25) weatherAdvice = '~80 % UVB — bonnes conditions';
      else weatherAdvice = '~90 % UVB — conditions idéales';
      detailRows += `<div class="detail-row"><span class="detail-icon">${cloudEmoji(dc)}</span><span>Nébulosité <strong style="color:${cloudPctColor(dc)}">${dc}%</strong> <span class="dr-meta">${weatherAdvice}</span></span></div>`;
    }

    let verdict = '';
    if (idvc && !hasOptimal) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">⚠️</span> <strong>Verdict :</strong> créneau réduit + ciel couvert. Synthèse très lente — à tenter en cas d'éclaircie.</div>`;
    } else if (idvc) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">🤞</span> <strong>Verdict :</strong> créneau optimal mais couvert. La synthèse reste possible (~35 % UVB) — prévoyez plus de temps ou guettez les éclaircies.</div>`;
    } else if (idc && !hasOptimal) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">⚠️</span> <strong>Verdict :</strong> créneau réduit et nuageux. Synthèse très lente — prévoyez une longue exposition.</div>`;
    } else if (idc) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">🤞</span> <strong>Verdict :</strong> créneau optimal mais nuageux. Prévoyez environ 2× plus de temps qu'en ciel clair.</div>`;
    } else if (hasOptimal && dc !== null && dc < 50) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">✅</span> <strong>Verdict :</strong> bonnes conditions ! 10–20 min d'exposition suffiront.</div>`;
    } else if (hasOptimal) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">👍</span> <strong>Verdict :</strong> créneau optimal, quelques nuages. Conditions correctes.</div>`;
    } else if (dc !== null && dc < 50) {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">🆗</span> <strong>Verdict :</strong> créneau réduit mais ciel assez dégagé. Prévoyez 30–45 min.</div>`;
    } else {
      verdict = `<div class="detail-row" style="margin-top:4px;padding-top:6px;border-top:1px solid rgba(0,0,0,0.06);color:var(--text)"><span class="detail-icon">🆗</span> <strong>Verdict :</strong> créneau réduit, conditions correctes.</div>`;
    }
    detailRows += verdict;

    html += `
      <div class="timeline-row" id="tl-${i}">
        <div class="timeline-header" onclick="document.getElementById('tl-${i}').classList.toggle('open')">
          <div class="timeline-info">
            <div class="timeline-date">${capitalize(getDayName(w.date))}${cloudTag}</div>
            <div class="timeline-hours">${hasOptimal ? `☀️ ${formatTime(w.optimal.start)} → ${formatTime(w.optimal.end)}` : `🌤️ ${formatTime(w.extended.start)} → ${formatTime(w.extended.end)}`} <span style="color:var(--text-muted);font-size:0.8rem">(${hasOptimal ? 'optimal' : 'réduit'})</span></div>
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
      <div class="meter-label">Durée d'exposition personnalisée</div>
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
          <div style="font-size:1.1rem;color:var(--text);font-weight:500">⏱️ Environ <strong style="font-family:'Instrument Serif',serif;font-size:1.6rem">${exposureTime} min</strong></div>
          <div style="font-size:0.82rem;color:var(--text-soft);margin-top:4px;line-height:1.5">
            Durée estimée pour synthétiser votre dose quotidienne de vitamine D (1000 UI).<br>
            Bras et visage exposés, sans crème solaire, au pic UV du jour (${peakUVIForExposure.toFixed(1)}).
            ${showCloudAdjust ? `<br>${cloudEmoji(dayCloudForExposure)} Ajusté pour la nébulosité (${dayCloudForExposure}%) — en ciel clair ce serait ~${clearSkyTime} min.` : ''}
          </div>
          ${peakUVIForExposure >= 6 ? `<div style="font-size:0.8rem;color:#E65100;margin-top:6px">🧴 Appliquez une crème SPF 30+ immédiatement après cette durée.</div>` : ''}
          ${peakUVIForExposure >= 8 ? `<div style="font-size:0.8rem;color:#D32F2F;margin-top:2px">🛡️ UV très élevé — ne dépassez pas cette durée sans protection.</div>` : ''}
        </div>
      ` : `
        <div style="margin-top:1rem;padding-top:0.8rem;border-top:1px solid rgba(0,0,0,0.06)">
          <div style="font-size:0.88rem;color:var(--text-muted)">Les UV ne sont pas assez forts aujourd'hui pour une synthèse significative.</div>
        </div>
      `}
    </div>
  `;
}

function buildInfoCard() {
  return `
    <div class="info-card">
      <div class="meter-label">Comment ça marche ?</div>
      <div class="info-item">
        <span class="icon">🔬</span>
        <p>La peau synthétise la vitamine D grâce aux <strong>UVB</strong>. Leur passage à travers l'atmosphère dépend de l'élévation du soleil.</p>
      </div>
      <div class="info-item">
        <span class="icon">☀️</span>
        <p><strong>≥ 45° (optimal)</strong> — Les UVB atteignent le sol en quantité suffisante. 10 à 20 min d'exposition des bras et du visage suffisent. Votre ombre est plus courte que vous.</p>
      </div>
      <div class="info-item">
        <span class="icon">🌤️</span>
        <p><strong>30°–45° (réduit)</strong> — Les UVB passent en quantité réduite. La synthèse est possible mais plus lente, prévoyez 30 à 45 min. Votre ombre est plus longue que vous.</p>
      </div>
      <div class="info-item">
        <span class="icon">⏱️</span>
        <p>Ces durées sont indicatives. L'altitude, la couverture nuageuse et la pollution influencent fortement la synthèse réelle.</p>
      </div>
      <div class="info-item">
        <span class="icon">💊</span>
        <p>Au-dessus de ~40° de latitude nord, les créneaux sont <strong>rares en hiver</strong>. Une supplémentation en vitamine D peut être recommandée d'octobre à mars.</p>
      </div>
      <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid rgba(0,0,0,0.06)">
        <div class="info-item" style="margin-bottom:0.8rem">
          <span class="icon">⚠️</span>
          <p style="color:var(--text)"><strong>Attention aux UV</strong> — Les mêmes UVB qui synthétisent la vitamine D endommagent aussi l'ADN de la peau. Ne dépassez jamais le temps d'exposition recommandé et appliquez une crème solaire SPF 30+ après vos 10–20 min de synthèse. Les peaux claires sont particulièrement vulnérables.</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:0.82rem;line-height:1.45">
          <thead>
            <tr style="text-align:left;border-bottom:2px solid rgba(0,0,0,0.08)">
              <th style="padding:6px 8px;font-weight:600;color:var(--text)">Indice UV</th>
              <th style="padding:6px 8px;font-weight:600;color:var(--text)">Niveau</th>
              <th style="padding:6px 8px;font-weight:600;color:var(--text)">Effets & recommandations</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid rgba(0,0,0,0.04)">
              <td style="padding:6px 8px;font-weight:600;color:#4CAF50">0 – 2</td>
              <td style="padding:6px 8px;color:#4CAF50">Faible</td>
              <td style="padding:6px 8px;color:var(--text-soft)">Risque minimal. Pas de bronzage significatif. Lunettes de soleil si forte réverbération.</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(0,0,0,0.04)">
              <td style="padding:6px 8px;font-weight:600;color:#FF9800">3 – 5</td>
              <td style="padding:6px 8px;color:#FF9800">Modéré</td>
              <td style="padding:6px 8px;color:var(--text-soft)">Bronzage possible. Coup de soleil en 30–45 min sans protection. Crème SPF 30+, chapeau.</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(0,0,0,0.04)">
              <td style="padding:6px 8px;font-weight:600;color:#FF5722">6 – 7</td>
              <td style="padding:6px 8px;color:#FF5722">Élevé</td>
              <td style="padding:6px 8px;color:var(--text-soft)">Bronzage rapide mais risque de brûlure en 15–25 min. Éviter le soleil entre 11h et 16h. Protection indispensable.</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(0,0,0,0.04)">
              <td style="padding:6px 8px;font-weight:600;color:#D32F2F">8 – 10</td>
              <td style="padding:6px 8px;color:#D32F2F">Très élevé</td>
              <td style="padding:6px 8px;color:var(--text-soft)">Brûlure en moins de 15 min. Rester à l'ombre, crème SPF 50+, vêtements couvrants, lunettes.</td>
            </tr>
            <tr>
              <td style="padding:6px 8px;font-weight:600;color:#7B1FA2">11+</td>
              <td style="padding:6px 8px;color:#7B1FA2">Extrême</td>
              <td style="padding:6px 8px;color:var(--text-soft)">Brûlure en moins de 10 min. Éviter toute exposition directe. Dommages cutanés graves et rapides.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div style="text-align:center;font-size:0.72rem;color:var(--text-muted);margin-top:0.5rem;opacity:0.6">
      Calculs solaires : algorithmes NOAA · Indice UV : formule de Madronich (2007) · Météo : <a href="https://open-meteo.com/" target="_blank" style="color:inherit">Open-Meteo.com</a> (CC BY 4.0)
    </div>
  `;
}

export function showError(message) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="error-state">
      <div class="emoji">📍</div>
      <h3>Localisation nécessaire</h3>
      <p>${message}</p>
      <div style="display:flex;flex-direction:column;gap:12px;align-items:center">
        <button class="btn-retry" onclick="window.requestLocation()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Autoriser la localisation
        </button>
        <span style="color:var(--text-muted);font-size:0.85rem">ou recherchez un lieu ci-dessous</span>
        <div class="location-search" style="margin-bottom:0;width:100%;max-width:400px">
          <div class="search-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input type="text" class="search-input" id="search-input-fallback" placeholder="Paris, Lyon, Marseille…" autocomplete="off" />
            <div class="search-results" id="search-results-fallback" style="display:none"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => window.initSearchInput('search-input-fallback', 'search-results-fallback'), 50);
}
