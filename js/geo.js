// ===== Geocoding, Location & Search =====
import { state } from './state.js';
import { fetchWeather } from './weather.js';
import { renderApp, showError } from './ui.js';

const GEO_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function reverseGeocode(lat, lon) {
  const cacheKey = `sundose_geo_${lat.toFixed(3)}_${lon.toFixed(3)}`;

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached && (Date.now() - cached.timestamp) < GEO_CACHE_TTL) {
      return cached.name;
    }
  } catch {}

  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`);
    const data = await resp.json();
    const addr = data.address;
    const name = addr.city || addr.town || addr.village || addr.municipality || addr.county || `${lat.toFixed(2)}°N`;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ name, timestamp: Date.now() }));
    } catch {}
    return name;
  } catch {
    return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  }
}

export async function searchPlace(query) {
  try {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&accept-language=fr&limit=5&addressdetails=1`);
    return await resp.json();
  } catch {
    return [];
  }
}

export async function setLocation(lat, lon, name, geolocated) {
  state.lat = lat;
  state.lon = lon;
  state.locationName = name;
  state.isGeolocated = geolocated;

  // Initial render with solar-only data (no weather yet)
  renderApp();

  // Fetch weather (with cache), then re-render with cloud data
  await fetchWeather(lat, lon);
  renderApp();
}

export function initSearchInput(inputId, resultsId) {
  const input = document.getElementById(inputId);
  const resultsContainer = document.getElementById(resultsId);
  if (!input || !resultsContainer) return;

  let debounceTimer = null;

  input.addEventListener('focus', () => input.select());

  input.addEventListener('input', () => {
    const query = input.value.trim();
    clearTimeout(debounceTimer);

    if (query.length < 2) {
      resultsContainer.style.display = 'none';
      return;
    }

    resultsContainer.innerHTML = '<div class="search-loading">Recherche…</div>';
    resultsContainer.style.display = 'block';

    debounceTimer = setTimeout(async () => {
      const results = await searchPlace(query);
      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-loading">Aucun résultat</div>';
        return;
      }

      resultsContainer.innerHTML = results.map(r => {
        const name = r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || r.display_name.split(',')[0];
        const country = r.address?.country || '';
        const region = r.address?.state || r.address?.county || '';
        const detail = [region, country].filter(Boolean).join(', ');
        return `
          <div class="search-result-item" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${name}">
            <div class="result-icon">📍</div>
            <div class="result-info">
              <div class="result-name">${name}</div>
              <div class="result-detail">${detail}</div>
            </div>
          </div>
        `;
      }).join('');

      resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const lat = parseFloat(item.dataset.lat);
          const lon = parseFloat(item.dataset.lon);
          const name = item.dataset.name;
          resultsContainer.style.display = 'none';
          input.value = name;
          setLocation(lat, lon, name, false);
        });
      });
    }, 350);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
      resultsContainer.style.display = 'none';
    }
  });
}

export function requestLocation() {
  const app = document.getElementById('app');
  let geoResolved = false;

  if (!state.lat) {
    app.innerHTML = `
      <div class="loading-state" id="loading">
        <div class="loading-spinner"></div>
        <p>Recherche de votre position…</p>
        <div id="loading-fallback" style="display:none;margin-top:1.5rem;animation:slideUp 0.4s ease-out">
          <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.8rem">La géolocalisation prend du temps ?<br>Recherchez un lieu manuellement :</p>
          <div class="location-search" style="margin-bottom:0;max-width:400px;margin-left:auto;margin-right:auto">
            <div class="search-wrapper">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input type="text" class="search-input" id="search-input-loading" placeholder="Paris, Lyon, Marseille…" autocomplete="off" />
              <div class="search-results" id="search-results-loading" style="display:none"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    setTimeout(() => {
      if (geoResolved) return;
      const fb = document.getElementById('loading-fallback');
      if (fb) {
        fb.style.display = 'block';
        initSearchInput('search-input-loading', 'search-results-loading');
      }
    }, 3000);
  }

  if (!navigator.geolocation) {
    showError("Votre navigateur ne supporte pas la géolocalisation. Essayez un navigateur plus récent.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      geoResolved = true;
      const { latitude: lat, longitude: lon } = pos.coords;
      let locationName;
      try {
        locationName = await reverseGeocode(lat, lon);
      } catch {
        locationName = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
      }
      setLocation(lat, lon, locationName, true);
    },
    (err) => {
      geoResolved = true;
      if (state.lat) return;
      if (err.code === 1) {
        showError("Vous avez refusé l'accès à votre position. Autorisez la géolocalisation ou recherchez un lieu manuellement.");
      } else {
        showError("Impossible d'obtenir votre position. Recherchez un lieu manuellement.");
      }
    },
    { enableHighAccuracy: false, timeout: 15000 }
  );
}
