// build-cities.mjs — Programmatic SEO: generate data/cities.json
// Run with: node scripts/build-cities.mjs
// Imports solar.js directly (pure math, no browser APIs needed)

import { getVitDWindow, estimateOzone, estimateUVI } from '../js/solar.js';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function slugify(str) {
  return str.toLowerCase().replace(/ +/g, "-").replace(/[^a-z0-9-]/g, "");
}
// ─── CITY DATASET ────────────────────────────────────────────────────────────
// slug: lowercase ASCII hyphenated, unique
// nameFr: French display name (use French name for French copy)
// countryFr: French country name
// continent: "Europe" | "Africa" | "Asia" | "Americas" | "Oceania"
const CITIES_RAW = [
  // ── EUROPE ──
  { slug: 'paris', name: 'Paris', nameFr: 'Paris', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 48.8566, lon: 2.3522, timezone: 'Europe/Paris', population: 2161000 },
  { slug: 'marseille', name: 'Marseille', nameFr: 'Marseille', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 43.2965, lon: 5.3698, timezone: 'Europe/Paris', population: 861635 },
  { slug: 'lyon', name: 'Lyon', nameFr: 'Lyon', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 45.7640, lon: 4.8357, timezone: 'Europe/Paris', population: 522969 },
  { slug: 'toulouse', name: 'Toulouse', nameFr: 'Toulouse', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 43.6047, lon: 1.4442, timezone: 'Europe/Paris', population: 493465 },
  { slug: 'nice', name: 'Nice', nameFr: 'Nice', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 43.7102, lon: 7.2620, timezone: 'Europe/Paris', population: 342522 },
  { slug: 'nantes', name: 'Nantes', nameFr: 'Nantes', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 47.2184, lon: -1.5536, timezone: 'Europe/Paris', population: 314138 },
  { slug: 'strasbourg', name: 'Strasbourg', nameFr: 'Strasbourg', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 48.5734, lon: 7.7521, timezone: 'Europe/Paris', population: 284677 },
  { slug: 'montpellier', name: 'Montpellier', nameFr: 'Montpellier', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 43.6108, lon: 3.8767, timezone: 'Europe/Paris', population: 295542 },
  { slug: 'bordeaux', name: 'Bordeaux', nameFr: 'Bordeaux', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 44.8378, lon: -0.5792, timezone: 'Europe/Paris', population: 257804 },
  { slug: 'lille', name: 'Lille', nameFr: 'Lille', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 50.6292, lon: 3.0573, timezone: 'Europe/Paris', population: 234475 },
  { slug: 'rennes', name: 'Rennes', nameFr: 'Rennes', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 48.1173, lon: -1.6778, timezone: 'Europe/Paris', population: 222001 },
  { slug: 'reims', name: 'Reims', nameFr: 'Reims', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 49.2583, lon: 4.0317, timezone: 'Europe/Paris', population: 184702 },
  { slug: 'saint-etienne', name: 'Saint-Étienne', nameFr: 'Saint-Étienne', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 45.4347, lon: 4.3900, timezone: 'Europe/Paris', population: 172565 },
  { slug: 'toulon', name: 'Toulon', nameFr: 'Toulon', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 43.1242, lon: 5.9280, timezone: 'Europe/Paris', population: 176198 },
  { slug: 'grenoble', name: 'Grenoble', nameFr: 'Grenoble', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 45.1885, lon: 5.7245, timezone: 'Europe/Paris', population: 157650 },
  { slug: 'dijon', name: 'Dijon', nameFr: 'Dijon', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 47.3220, lon: 5.0415, timezone: 'Europe/Paris', population: 156920 },
  { slug: 'brest', name: 'Brest', nameFr: 'Brest', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 48.3905, lon: -4.4860, timezone: 'Europe/Paris', population: 143928 },
  { slug: 'angers', name: 'Angers', nameFr: 'Angers', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 47.4784, lon: -0.5632, timezone: 'Europe/Paris', population: 157667 },
  { slug: 'le-havre', name: 'Le Havre', nameFr: 'Le Havre', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 49.4938, lon: 0.1077, timezone: 'Europe/Paris', population: 172074 },
  { slug: 'clermont-ferrand', name: 'Clermont-Ferrand', nameFr: 'Clermont-Ferrand', country: 'France', countryFr: 'France', countryCode: 'FR', continent: 'Europe', lat: 45.7772, lon: 3.0870, timezone: 'Europe/Paris', population: 147827 },

  // Belgique
  { slug: 'bruxelles', name: 'Bruxelles', nameFr: 'Bruxelles', country: 'Belgium', countryFr: 'Belgique', countryCode: 'BE', continent: 'Europe', lat: 50.8503, lon: 4.3517, timezone: 'Europe/Brussels', population: 1219970 },
  { slug: 'anvers', name: 'Antwerp', nameFr: 'Anvers', country: 'Belgium', countryFr: 'Belgique', countryCode: 'BE', continent: 'Europe', lat: 51.2194, lon: 4.4025, timezone: 'Europe/Brussels', population: 530504 },
  { slug: 'gand', name: 'Ghent', nameFr: 'Gand', country: 'Belgium', countryFr: 'Belgique', countryCode: 'BE', continent: 'Europe', lat: 51.0543, lon: 3.7174, timezone: 'Europe/Brussels', population: 264257 },
  { slug: 'liege', name: 'Liège', nameFr: 'Liège', country: 'Belgium', countryFr: 'Belgique', countryCode: 'BE', continent: 'Europe', lat: 50.6451, lon: 5.5735, timezone: 'Europe/Brussels', population: 198280 },

  // Suisse
  { slug: 'geneve', name: 'Genève', nameFr: 'Genève', country: 'Switzerland', countryFr: 'Suisse', countryCode: 'CH', continent: 'Europe', lat: 46.2044, lon: 6.1432, timezone: 'Europe/Zurich', population: 203856 },
  { slug: 'zurich', name: 'Zurich', nameFr: 'Zurich', country: 'Switzerland', countryFr: 'Suisse', countryCode: 'CH', continent: 'Europe', lat: 47.3769, lon: 8.5417, timezone: 'Europe/Zurich', population: 434335 },
  { slug: 'berne', name: 'Berne', nameFr: 'Berne', country: 'Switzerland', countryFr: 'Suisse', countryCode: 'CH', continent: 'Europe', lat: 46.9480, lon: 7.4474, timezone: 'Europe/Zurich', population: 133883 },
  { slug: 'lausanne', name: 'Lausanne', nameFr: 'Lausanne', country: 'Switzerland', countryFr: 'Suisse', countryCode: 'CH', continent: 'Europe', lat: 46.5197, lon: 6.6323, timezone: 'Europe/Zurich', population: 140202 },

  // Luxembourg
  { slug: 'luxembourg', name: 'Luxembourg', nameFr: 'Luxembourg', country: 'Luxembourg', countryFr: 'Luxembourg', countryCode: 'LU', continent: 'Europe', lat: 49.6116, lon: 6.1319, timezone: 'Europe/Luxembourg', population: 128381 },

  // Royaume-Uni
  { slug: 'london', name: 'London', nameFr: 'Londres', country: 'United Kingdom', countryFr: 'Royaume-Uni', countryCode: 'GB', continent: 'Europe', lat: 51.5074, lon: -0.1278, timezone: 'Europe/London', population: 8982000 },
  { slug: 'birmingham', name: 'Birmingham', nameFr: 'Birmingham', country: 'United Kingdom', countryFr: 'Royaume-Uni', countryCode: 'GB', continent: 'Europe', lat: 52.4862, lon: -1.8904, timezone: 'Europe/London', population: 1141400 },
  { slug: 'manchester', name: 'Manchester', nameFr: 'Manchester', country: 'United Kingdom', countryFr: 'Royaume-Uni', countryCode: 'GB', continent: 'Europe', lat: 53.4808, lon: -2.2426, timezone: 'Europe/London', population: 553230 },
  { slug: 'glasgow', name: 'Glasgow', nameFr: 'Glasgow', country: 'United Kingdom', countryFr: 'Royaume-Uni', countryCode: 'GB', continent: 'Europe', lat: 55.8642, lon: -4.2518, timezone: 'Europe/London', population: 635640 },
  { slug: 'edinburgh', name: 'Edinburgh', nameFr: 'Édimbourg', country: 'United Kingdom', countryFr: 'Royaume-Uni', countryCode: 'GB', continent: 'Europe', lat: 55.9533, lon: -3.1883, timezone: 'Europe/London', population: 518500 },
  { slug: 'liverpool', name: 'Liverpool', nameFr: 'Liverpool', country: 'United Kingdom', countryFr: 'Royaume-Uni', countryCode: 'GB', continent: 'Europe', lat: 53.4084, lon: -2.9916, timezone: 'Europe/London', population: 498042 },
  { slug: 'bristol', name: 'Bristol', nameFr: 'Bristol', country: 'United Kingdom', countryFr: 'Royaume-Uni', countryCode: 'GB', continent: 'Europe', lat: 51.4545, lon: -2.5879, timezone: 'Europe/London', population: 470000 },
  { slug: 'leeds', name: 'Leeds', nameFr: 'Leeds', country: 'United Kingdom', countryFr: 'Royaume-Uni', countryCode: 'GB', continent: 'Europe', lat: 53.8008, lon: -1.5491, timezone: 'Europe/London', population: 793139 },
  { slug: 'cardiff', name: 'Cardiff', nameFr: 'Cardiff', country: 'United Kingdom', countryFr: 'Royaume-Uni', countryCode: 'GB', continent: 'Europe', lat: 51.4816, lon: -3.1791, timezone: 'Europe/London', population: 362400 },

  // Allemagne
  { slug: 'berlin', name: 'Berlin', nameFr: 'Berlin', country: 'Germany', countryFr: 'Allemagne', countryCode: 'DE', continent: 'Europe', lat: 52.5200, lon: 13.4050, timezone: 'Europe/Berlin', population: 3769000 },
  { slug: 'hambourg', name: 'Hamburg', nameFr: 'Hambourg', country: 'Germany', countryFr: 'Allemagne', countryCode: 'DE', continent: 'Europe', lat: 53.5753, lon: 10.0153, timezone: 'Europe/Berlin', population: 1841000 },
  { slug: 'munich', name: 'Munich', nameFr: 'Munich', country: 'Germany', countryFr: 'Allemagne', countryCode: 'DE', continent: 'Europe', lat: 48.1351, lon: 11.5820, timezone: 'Europe/Berlin', population: 1471508 },
  { slug: 'cologne', name: 'Cologne', nameFr: 'Cologne', country: 'Germany', countryFr: 'Allemagne', countryCode: 'DE', continent: 'Europe', lat: 50.9333, lon: 6.9500, timezone: 'Europe/Berlin', population: 1083498 },
  { slug: 'francfort', name: 'Frankfurt', nameFr: 'Francfort', country: 'Germany', countryFr: 'Allemagne', countryCode: 'DE', continent: 'Europe', lat: 50.1109, lon: 8.6821, timezone: 'Europe/Berlin', population: 763380 },
  { slug: 'stuttgart', name: 'Stuttgart', nameFr: 'Stuttgart', country: 'Germany', countryFr: 'Allemagne', countryCode: 'DE', continent: 'Europe', lat: 48.7758, lon: 9.1829, timezone: 'Europe/Berlin', population: 634830 },
  { slug: 'dusseldorf', name: 'Düsseldorf', nameFr: 'Düsseldorf', country: 'Germany', countryFr: 'Allemagne', countryCode: 'DE', continent: 'Europe', lat: 51.2217, lon: 6.7762, timezone: 'Europe/Berlin', population: 619294 },
  { slug: 'dortmund', name: 'Dortmund', nameFr: 'Dortmund', country: 'Germany', countryFr: 'Allemagne', countryCode: 'DE', continent: 'Europe', lat: 51.5136, lon: 7.4653, timezone: 'Europe/Berlin', population: 588462 },
  { slug: 'leipzig', name: 'Leipzig', nameFr: 'Leipzig', country: 'Germany', countryFr: 'Allemagne', countryCode: 'DE', continent: 'Europe', lat: 51.3397, lon: 12.3731, timezone: 'Europe/Berlin', population: 605407 },
  { slug: 'dresde', name: 'Dresden', nameFr: 'Dresde', country: 'Germany', countryFr: 'Allemagne', countryCode: 'DE', continent: 'Europe', lat: 51.0504, lon: 13.7373, timezone: 'Europe/Berlin', population: 556780 },
  { slug: 'nuremberg', name: 'Nuremberg', nameFr: 'Nuremberg', country: 'Germany', countryFr: 'Allemagne', countryCode: 'DE', continent: 'Europe', lat: 49.4521, lon: 11.0767, timezone: 'Europe/Berlin', population: 518370 },
  { slug: 'breme', name: 'Bremen', nameFr: 'Brême', country: 'Germany', countryFr: 'Allemagne', countryCode: 'DE', continent: 'Europe', lat: 53.0793, lon: 8.8017, timezone: 'Europe/Berlin', population: 567559 },

  // Espagne
  { slug: 'madrid', name: 'Madrid', nameFr: 'Madrid', country: 'Spain', countryFr: 'Espagne', countryCode: 'ES', continent: 'Europe', lat: 40.4168, lon: -3.7038, timezone: 'Europe/Madrid', population: 3334730 },
  { slug: 'barcelone', name: 'Barcelona', nameFr: 'Barcelone', country: 'Spain', countryFr: 'Espagne', countryCode: 'ES', continent: 'Europe', lat: 41.3851, lon: 2.1734, timezone: 'Europe/Madrid', population: 1636762 },
  { slug: 'valence-espagne', name: 'Valencia', nameFr: 'Valence', country: 'Spain', countryFr: 'Espagne', countryCode: 'ES', continent: 'Europe', lat: 39.4699, lon: -0.3763, timezone: 'Europe/Madrid', population: 800666 },
  { slug: 'seville', name: 'Seville', nameFr: 'Séville', country: 'Spain', countryFr: 'Espagne', countryCode: 'ES', continent: 'Europe', lat: 37.3891, lon: -5.9845, timezone: 'Europe/Madrid', population: 688592 },
  { slug: 'bilbao', name: 'Bilbao', nameFr: 'Bilbao', country: 'Spain', countryFr: 'Espagne', countryCode: 'ES', continent: 'Europe', lat: 43.2630, lon: -2.9350, timezone: 'Europe/Madrid', population: 346574 },
  { slug: 'malaga', name: 'Málaga', nameFr: 'Malaga', country: 'Spain', countryFr: 'Espagne', countryCode: 'ES', continent: 'Europe', lat: 36.7213, lon: -4.4213, timezone: 'Europe/Madrid', population: 578460 },
  { slug: 'saragosse', name: 'Zaragoza', nameFr: 'Saragosse', country: 'Spain', countryFr: 'Espagne', countryCode: 'ES', continent: 'Europe', lat: 41.6488, lon: -0.8891, timezone: 'Europe/Madrid', population: 675121 },
  { slug: 'palma', name: 'Palma', nameFr: 'Palma', country: 'Spain', countryFr: 'Espagne', countryCode: 'ES', continent: 'Europe', lat: 39.5696, lon: 2.6502, timezone: 'Europe/Madrid', population: 416065 },
  { slug: 'las-palmas', name: 'Las Palmas', nameFr: 'Las Palmas', country: 'Spain', countryFr: 'Espagne', countryCode: 'ES', continent: 'Europe', lat: 28.1235, lon: -15.4363, timezone: 'Atlantic/Canary', population: 379925 },

  // Italie
  { slug: 'rome', name: 'Rome', nameFr: 'Rome', country: 'Italy', countryFr: 'Italie', countryCode: 'IT', continent: 'Europe', lat: 41.9028, lon: 12.4964, timezone: 'Europe/Rome', population: 2873494 },
  { slug: 'milan', name: 'Milan', nameFr: 'Milan', country: 'Italy', countryFr: 'Italie', countryCode: 'IT', continent: 'Europe', lat: 45.4654, lon: 9.1859, timezone: 'Europe/Rome', population: 1396059 },
  { slug: 'naples', name: 'Naples', nameFr: 'Naples', country: 'Italy', countryFr: 'Italie', countryCode: 'IT', continent: 'Europe', lat: 40.8518, lon: 14.2681, timezone: 'Europe/Rome', population: 962003 },
  { slug: 'turin', name: 'Turin', nameFr: 'Turin', country: 'Italy', countryFr: 'Italie', countryCode: 'IT', continent: 'Europe', lat: 45.0703, lon: 7.6869, timezone: 'Europe/Rome', population: 886837 },
  { slug: 'palerme', name: 'Palermo', nameFr: 'Palerme', country: 'Italy', countryFr: 'Italie', countryCode: 'IT', continent: 'Europe', lat: 38.1157, lon: 13.3615, timezone: 'Europe/Rome', population: 663401 },
  { slug: 'genes', name: 'Genoa', nameFr: 'Gênes', country: 'Italy', countryFr: 'Italie', countryCode: 'IT', continent: 'Europe', lat: 44.4056, lon: 8.9463, timezone: 'Europe/Rome', population: 580097 },
  { slug: 'bologne', name: 'Bologna', nameFr: 'Bologne', country: 'Italy', countryFr: 'Italie', countryCode: 'IT', continent: 'Europe', lat: 44.4949, lon: 11.3426, timezone: 'Europe/Rome', population: 391740 },
  { slug: 'florence', name: 'Florence', nameFr: 'Florence', country: 'Italy', countryFr: 'Italie', countryCode: 'IT', continent: 'Europe', lat: 43.7696, lon: 11.2558, timezone: 'Europe/Rome', population: 382258 },
  { slug: 'venise', name: 'Venice', nameFr: 'Venise', country: 'Italy', countryFr: 'Italie', countryCode: 'IT', continent: 'Europe', lat: 45.4408, lon: 12.3155, timezone: 'Europe/Rome', population: 261905 },
  { slug: 'catane', name: 'Catania', nameFr: 'Catane', country: 'Italy', countryFr: 'Italie', countryCode: 'IT', continent: 'Europe', lat: 37.5079, lon: 15.0830, timezone: 'Europe/Rome', population: 311584 },

  // Portugal
  { slug: 'lisbonne', name: 'Lisbon', nameFr: 'Lisbonne', country: 'Portugal', countryFr: 'Portugal', countryCode: 'PT', continent: 'Europe', lat: 38.7223, lon: -9.1393, timezone: 'Europe/Lisbon', population: 548703 },
  { slug: 'porto', name: 'Porto', nameFr: 'Porto', country: 'Portugal', countryFr: 'Portugal', countryCode: 'PT', continent: 'Europe', lat: 41.1579, lon: -8.6291, timezone: 'Europe/Lisbon', population: 249633 },

  // Pays-Bas
  { slug: 'amsterdam', name: 'Amsterdam', nameFr: 'Amsterdam', country: 'Netherlands', countryFr: 'Pays-Bas', countryCode: 'NL', continent: 'Europe', lat: 52.3676, lon: 4.9041, timezone: 'Europe/Amsterdam', population: 872680 },
  { slug: 'rotterdam', name: 'Rotterdam', nameFr: 'Rotterdam', country: 'Netherlands', countryFr: 'Pays-Bas', countryCode: 'NL', continent: 'Europe', lat: 51.9244, lon: 4.4777, timezone: 'Europe/Amsterdam', population: 651157 },
  { slug: 'la-haye', name: 'The Hague', nameFr: 'La Haye', country: 'Netherlands', countryFr: 'Pays-Bas', countryCode: 'NL', continent: 'Europe', lat: 52.0705, lon: 4.3007, timezone: 'Europe/Amsterdam', population: 548320 },

  // Scandinavie
  { slug: 'stockholm', name: 'Stockholm', nameFr: 'Stockholm', country: 'Sweden', countryFr: 'Suède', countryCode: 'SE', continent: 'Europe', lat: 59.3293, lon: 18.0686, timezone: 'Europe/Stockholm', population: 975551 },
  { slug: 'gothenburg', name: 'Gothenburg', nameFr: 'Göteborg', country: 'Sweden', countryFr: 'Suède', countryCode: 'SE', continent: 'Europe', lat: 57.7089, lon: 11.9746, timezone: 'Europe/Stockholm', population: 587549 },
  { slug: 'oslo', name: 'Oslo', nameFr: 'Oslo', country: 'Norway', countryFr: 'Norvège', countryCode: 'NO', continent: 'Europe', lat: 59.9139, lon: 10.7522, timezone: 'Europe/Oslo', population: 702543 },
  { slug: 'bergen', name: 'Bergen', nameFr: 'Bergen', country: 'Norway', countryFr: 'Norvège', countryCode: 'NO', continent: 'Europe', lat: 60.3913, lon: 5.3221, timezone: 'Europe/Oslo', population: 285911 },
  { slug: 'tromso', name: 'Tromsø', nameFr: 'Tromsø', country: 'Norway', countryFr: 'Norvège', countryCode: 'NO', continent: 'Europe', lat: 69.6496, lon: 18.9560, timezone: 'Europe/Oslo', population: 76085 },
  { slug: 'copenhague', name: 'Copenhagen', nameFr: 'Copenhague', country: 'Denmark', countryFr: 'Danemark', countryCode: 'DK', continent: 'Europe', lat: 55.6761, lon: 12.5683, timezone: 'Europe/Copenhagen', population: 794128 },
  { slug: 'helsinki', name: 'Helsinki', nameFr: 'Helsinki', country: 'Finland', countryFr: 'Finlande', countryCode: 'FI', continent: 'Europe', lat: 60.1699, lon: 24.9384, timezone: 'Europe/Helsinki', population: 657052 },
  { slug: 'reykjavik', name: 'Reykjavik', nameFr: 'Reykjavik', country: 'Iceland', countryFr: 'Islande', countryCode: 'IS', continent: 'Europe', lat: 64.1355, lon: -21.8954, timezone: 'Atlantic/Reykjavik', population: 131136 },

  // Europe centrale & orientale
  { slug: 'vienne', name: 'Vienna', nameFr: 'Vienne', country: 'Austria', countryFr: 'Autriche', countryCode: 'AT', continent: 'Europe', lat: 48.2082, lon: 16.3738, timezone: 'Europe/Vienna', population: 1897491 },
  { slug: 'prague', name: 'Prague', nameFr: 'Prague', country: 'Czech Republic', countryFr: 'République tchèque', countryCode: 'CZ', continent: 'Europe', lat: 50.0755, lon: 14.4378, timezone: 'Europe/Prague', population: 1309000 },
  { slug: 'varsovie', name: 'Warsaw', nameFr: 'Varsovie', country: 'Poland', countryFr: 'Pologne', countryCode: 'PL', continent: 'Europe', lat: 52.2297, lon: 21.0122, timezone: 'Europe/Warsaw', population: 1793579 },
  { slug: 'cracovie', name: 'Krakow', nameFr: 'Cracovie', country: 'Poland', countryFr: 'Pologne', countryCode: 'PL', continent: 'Europe', lat: 50.0647, lon: 19.9450, timezone: 'Europe/Warsaw', population: 779115 },
  { slug: 'budapest', name: 'Budapest', nameFr: 'Budapest', country: 'Hungary', countryFr: 'Hongrie', countryCode: 'HU', continent: 'Europe', lat: 47.4979, lon: 19.0402, timezone: 'Europe/Budapest', population: 1752286 },
  { slug: 'bucarest', name: 'Bucharest', nameFr: 'Bucarest', country: 'Romania', countryFr: 'Roumanie', countryCode: 'RO', continent: 'Europe', lat: 44.4268, lon: 26.1025, timezone: 'Europe/Bucharest', population: 1883425 },
  { slug: 'sofia', name: 'Sofia', nameFr: 'Sofia', country: 'Bulgaria', countryFr: 'Bulgarie', countryCode: 'BG', continent: 'Europe', lat: 42.6977, lon: 23.3219, timezone: 'Europe/Sofia', population: 1238438 },
  { slug: 'belgrade', name: 'Belgrade', nameFr: 'Belgrade', country: 'Serbia', countryFr: 'Serbie', countryCode: 'RS', continent: 'Europe', lat: 44.7866, lon: 20.4489, timezone: 'Europe/Belgrade', population: 1659440 },
  { slug: 'zagreb', name: 'Zagreb', nameFr: 'Zagreb', country: 'Croatia', countryFr: 'Croatie', countryCode: 'HR', continent: 'Europe', lat: 45.8150, lon: 15.9819, timezone: 'Europe/Zagreb', population: 805997 },
  { slug: 'athenes', name: 'Athens', nameFr: 'Athènes', country: 'Greece', countryFr: 'Grèce', countryCode: 'GR', continent: 'Europe', lat: 37.9838, lon: 23.7275, timezone: 'Europe/Athens', population: 664046 },
  { slug: 'thessalonique', name: 'Thessaloniki', nameFr: 'Thessalonique', country: 'Greece', countryFr: 'Grèce', countryCode: 'GR', continent: 'Europe', lat: 40.6401, lon: 22.9444, timezone: 'Europe/Athens', population: 325182 },
  { slug: 'skopje', name: 'Skopje', nameFr: 'Skopje', country: 'North Macedonia', countryFr: 'Macédoine du Nord', countryCode: 'MK', continent: 'Europe', lat: 41.9973, lon: 21.4280, timezone: 'Europe/Skopje', population: 544086 },
  { slug: 'kiev', name: 'Kyiv', nameFr: 'Kiev', country: 'Ukraine', countryFr: 'Ukraine', countryCode: 'UA', continent: 'Europe', lat: 50.4501, lon: 30.5234, timezone: 'Europe/Kiev', population: 2952301 },
  { slug: 'moscou', name: 'Moscow', nameFr: 'Moscou', country: 'Russia', countryFr: 'Russie', countryCode: 'RU', continent: 'Europe', lat: 55.7558, lon: 37.6173, timezone: 'Europe/Moscow', population: 12506468 },
  { slug: 'saint-petersbourg', name: 'Saint Petersburg', nameFr: 'Saint-Pétersbourg', country: 'Russia', countryFr: 'Russie', countryCode: 'RU', continent: 'Europe', lat: 59.9343, lon: 30.3351, timezone: 'Europe/Moscow', population: 5383890 },
  { slug: 'riga', name: 'Riga', nameFr: 'Riga', country: 'Latvia', countryFr: 'Lettonie', countryCode: 'LV', continent: 'Europe', lat: 56.9496, lon: 24.1052, timezone: 'Europe/Riga', population: 614618 },
  { slug: 'vilnius', name: 'Vilnius', nameFr: 'Vilnius', country: 'Lithuania', countryFr: 'Lituanie', countryCode: 'LT', continent: 'Europe', lat: 54.6872, lon: 25.2797, timezone: 'Europe/Vilnius', population: 580020 },
  { slug: 'tallinn', name: 'Tallinn', nameFr: 'Tallinn', country: 'Estonia', countryFr: 'Estonie', countryCode: 'EE', continent: 'Europe', lat: 59.4370, lon: 24.7536, timezone: 'Europe/Tallinn', population: 447672 },

  // Péninsule ibérique / Med
  { slug: 'lisbonne-portugal', name: 'Lisbon', nameFr: 'Lisbonne', country: 'Portugal', countryFr: 'Portugal', countryCode: 'PT', continent: 'Europe', lat: 38.7223, lon: -9.1393, timezone: 'Europe/Lisbon', population: 548703 },

  // ── AFRIQUE ──
  { slug: 'le-caire', name: 'Cairo', nameFr: 'Le Caire', country: 'Egypt', countryFr: 'Égypte', countryCode: 'EG', continent: 'Africa', lat: 30.0444, lon: 31.2357, timezone: 'Africa/Cairo', population: 20900604 },
  { slug: 'lagos', name: 'Lagos', nameFr: 'Lagos', country: 'Nigeria', countryFr: 'Nigéria', countryCode: 'NG', continent: 'Africa', lat: 6.5244, lon: 3.3792, timezone: 'Africa/Lagos', population: 14800000 },
  { slug: 'kinshasa', name: 'Kinshasa', nameFr: 'Kinshasa', country: 'DR Congo', countryFr: 'RD Congo', countryCode: 'CD', continent: 'Africa', lat: -4.3217, lon: 15.3222, timezone: 'Africa/Kinshasa', population: 14342439 },
  { slug: 'johannesburg', name: 'Johannesburg', nameFr: 'Johannesburg', country: 'South Africa', countryFr: 'Afrique du Sud', countryCode: 'ZA', continent: 'Africa', lat: -26.2041, lon: 28.0473, timezone: 'Africa/Johannesburg', population: 5635127 },
  { slug: 'luanda', name: 'Luanda', nameFr: 'Luanda', country: 'Angola', countryFr: 'Angola', countryCode: 'AO', continent: 'Africa', lat: -8.8368, lon: 13.2343, timezone: 'Africa/Luanda', population: 8329926 },
  { slug: 'nairobi', name: 'Nairobi', nameFr: 'Nairobi', country: 'Kenya', countryFr: 'Kenya', countryCode: 'KE', continent: 'Africa', lat: -1.2921, lon: 36.8219, timezone: 'Africa/Nairobi', population: 4397073 },
  { slug: 'dar-es-salaam', name: 'Dar es Salaam', nameFr: 'Dar es-Salam', country: 'Tanzania', countryFr: 'Tanzanie', countryCode: 'TZ', continent: 'Africa', lat: -6.7924, lon: 39.2083, timezone: 'Africa/Dar_es_Salaam', population: 7776400 },
  { slug: 'abidjan', name: 'Abidjan', nameFr: 'Abidjan', country: "Côte d'Ivoire", countryFr: "Côte d'Ivoire", countryCode: 'CI', continent: 'Africa', lat: 5.3600, lon: -4.0083, timezone: 'Africa/Abidjan', population: 5170000 },
  { slug: 'khartoum', name: 'Khartoum', nameFr: 'Khartoum', country: 'Sudan', countryFr: 'Soudan', countryCode: 'SD', continent: 'Africa', lat: 15.5007, lon: 32.5599, timezone: 'Africa/Khartoum', population: 6160327 },
  { slug: 'accra', name: 'Accra', nameFr: 'Accra', country: 'Ghana', countryFr: 'Ghana', countryCode: 'GH', continent: 'Africa', lat: 5.6037, lon: -0.1870, timezone: 'Africa/Accra', population: 2270000 },
  { slug: 'addis-abeba', name: 'Addis Ababa', nameFr: 'Addis-Abeba', country: 'Ethiopia', countryFr: 'Éthiopie', countryCode: 'ET', continent: 'Africa', lat: 9.0320, lon: 38.7470, timezone: 'Africa/Addis_Ababa', population: 3352000 },
  { slug: 'casablanca', name: 'Casablanca', nameFr: 'Casablanca', country: 'Morocco', countryFr: 'Maroc', countryCode: 'MA', continent: 'Africa', lat: 33.5731, lon: -7.5898, timezone: 'Africa/Casablanca', population: 3752000 },
  { slug: 'rabat', name: 'Rabat', nameFr: 'Rabat', country: 'Morocco', countryFr: 'Maroc', countryCode: 'MA', continent: 'Africa', lat: 33.9716, lon: -6.8498, timezone: 'Africa/Casablanca', population: 577827 },
  { slug: 'tunis', name: 'Tunis', nameFr: 'Tunis', country: 'Tunisia', countryFr: 'Tunisie', countryCode: 'TN', continent: 'Africa', lat: 36.8065, lon: 10.1815, timezone: 'Africa/Tunis', population: 1056247 },
  { slug: 'alger', name: 'Algiers', nameFr: 'Alger', country: 'Algeria', countryFr: 'Algérie', countryCode: 'DZ', continent: 'Africa', lat: 36.7538, lon: 3.0588, timezone: 'Africa/Algiers', population: 3415811 },
  { slug: 'dakar', name: 'Dakar', nameFr: 'Dakar', country: 'Senegal', countryFr: 'Sénégal', countryCode: 'SN', continent: 'Africa', lat: 14.7167, lon: -17.4677, timezone: 'Africa/Dakar', population: 3732000 },
  { slug: 'maputo', name: 'Maputo', nameFr: 'Maputo', country: 'Mozambique', countryFr: 'Mozambique', countryCode: 'MZ', continent: 'Africa', lat: -25.9692, lon: 32.5732, timezone: 'Africa/Maputo', population: 1102466 },
  { slug: 'kampala', name: 'Kampala', nameFr: 'Kampala', country: 'Uganda', countryFr: 'Ouganda', countryCode: 'UG', continent: 'Africa', lat: 0.3476, lon: 32.5825, timezone: 'Africa/Kampala', population: 1659600 },
  { slug: 'bamako', name: 'Bamako', nameFr: 'Bamako', country: 'Mali', countryFr: 'Mali', countryCode: 'ML', continent: 'Africa', lat: 12.6392, lon: -8.0029, timezone: 'Africa/Bamako', population: 2515000 },
  { slug: 'lome', name: 'Lomé', nameFr: 'Lomé', country: 'Togo', countryFr: 'Togo', countryCode: 'TG', continent: 'Africa', lat: 6.1375, lon: 1.2123, timezone: 'Africa/Lome', population: 1477660 },
  { slug: 'antananarivo', name: 'Antananarivo', nameFr: 'Antananarivo', country: 'Madagascar', countryFr: 'Madagascar', countryCode: 'MG', continent: 'Africa', lat: -18.9137, lon: 47.5361, timezone: 'Indian/Antananarivo', population: 1391433 },
  { slug: 'cape-town', name: 'Cape Town', nameFr: 'Le Cap', country: 'South Africa', countryFr: 'Afrique du Sud', countryCode: 'ZA', continent: 'Africa', lat: -33.9249, lon: 18.4241, timezone: 'Africa/Johannesburg', population: 4618000 },

  // ── ASIE ──
  { slug: 'tokyo', name: 'Tokyo', nameFr: 'Tokyo', country: 'Japan', countryFr: 'Japon', countryCode: 'JP', continent: 'Asia', lat: 35.6762, lon: 139.6503, timezone: 'Asia/Tokyo', population: 13960000 },
  { slug: 'osaka', name: 'Osaka', nameFr: 'Osaka', country: 'Japan', countryFr: 'Japon', countryCode: 'JP', continent: 'Asia', lat: 34.6937, lon: 135.5023, timezone: 'Asia/Tokyo', population: 2691185 },
  { slug: 'seoul', name: 'Seoul', nameFr: 'Séoul', country: 'South Korea', countryFr: 'Corée du Sud', countryCode: 'KR', continent: 'Asia', lat: 37.5665, lon: 126.9780, timezone: 'Asia/Seoul', population: 9776000 },
  { slug: 'pekin', name: 'Beijing', nameFr: 'Pékin', country: 'China', countryFr: 'Chine', countryCode: 'CN', continent: 'Asia', lat: 39.9042, lon: 116.4074, timezone: 'Asia/Shanghai', population: 21516000 },
  { slug: 'shanghai', name: 'Shanghai', nameFr: 'Shanghai', country: 'China', countryFr: 'Chine', countryCode: 'CN', continent: 'Asia', lat: 31.2304, lon: 121.4737, timezone: 'Asia/Shanghai', population: 24256800 },
  { slug: 'guangzhou', name: 'Guangzhou', nameFr: 'Canton', country: 'China', countryFr: 'Chine', countryCode: 'CN', continent: 'Asia', lat: 23.1291, lon: 113.2644, timezone: 'Asia/Shanghai', population: 14904400 },
  { slug: 'shenzhen', name: 'Shenzhen', nameFr: 'Shenzhen', country: 'China', countryFr: 'Chine', countryCode: 'CN', continent: 'Asia', lat: 22.5431, lon: 114.0579, timezone: 'Asia/Shanghai', population: 12528300 },
  { slug: 'chengdu', name: 'Chengdu', nameFr: 'Chengdu', country: 'China', countryFr: 'Chine', countryCode: 'CN', continent: 'Asia', lat: 30.5728, lon: 104.0668, timezone: 'Asia/Shanghai', population: 9040000 },
  { slug: 'hong-kong', name: 'Hong Kong', nameFr: 'Hong Kong', country: 'Hong Kong', countryFr: 'Hong Kong', countryCode: 'HK', continent: 'Asia', lat: 22.3193, lon: 114.1694, timezone: 'Asia/Hong_Kong', population: 7496981 },
  { slug: 'taipei', name: 'Taipei', nameFr: 'Taipei', country: 'Taiwan', countryFr: 'Taïwan', countryCode: 'TW', continent: 'Asia', lat: 25.0330, lon: 121.5654, timezone: 'Asia/Taipei', population: 2646204 },
  { slug: 'mumbai', name: 'Mumbai', nameFr: 'Mumbai', country: 'India', countryFr: 'Inde', countryCode: 'IN', continent: 'Asia', lat: 19.0760, lon: 72.8777, timezone: 'Asia/Kolkata', population: 20667656 },
  { slug: 'delhi', name: 'Delhi', nameFr: 'Delhi', country: 'India', countryFr: 'Inde', countryCode: 'IN', continent: 'Asia', lat: 28.6139, lon: 77.2090, timezone: 'Asia/Kolkata', population: 29000000 },
  { slug: 'bangalore', name: 'Bangalore', nameFr: 'Bangalore', country: 'India', countryFr: 'Inde', countryCode: 'IN', continent: 'Asia', lat: 12.9716, lon: 77.5946, timezone: 'Asia/Kolkata', population: 12765000 },
  { slug: 'calcutta', name: 'Kolkata', nameFr: 'Calcutta', country: 'India', countryFr: 'Inde', countryCode: 'IN', continent: 'Asia', lat: 22.5726, lon: 88.3639, timezone: 'Asia/Kolkata', population: 14850000 },
  { slug: 'chennai', name: 'Chennai', nameFr: 'Chennai', country: 'India', countryFr: 'Inde', countryCode: 'IN', continent: 'Asia', lat: 13.0827, lon: 80.2707, timezone: 'Asia/Kolkata', population: 7380000 },
  { slug: 'hyderabad', name: 'Hyderabad', nameFr: 'Hyderabad', country: 'India', countryFr: 'Inde', countryCode: 'IN', continent: 'Asia', lat: 17.3850, lon: 78.4867, timezone: 'Asia/Kolkata', population: 6809970 },
  { slug: 'karachi', name: 'Karachi', nameFr: 'Karachi', country: 'Pakistan', countryFr: 'Pakistan', countryCode: 'PK', continent: 'Asia', lat: 24.8607, lon: 67.0011, timezone: 'Asia/Karachi', population: 14910352 },
  { slug: 'lahore', name: 'Lahore', nameFr: 'Lahore', country: 'Pakistan', countryFr: 'Pakistan', countryCode: 'PK', continent: 'Asia', lat: 31.5204, lon: 74.3587, timezone: 'Asia/Karachi', population: 11126285 },
  { slug: 'dhaka', name: 'Dhaka', nameFr: 'Dacca', country: 'Bangladesh', countryFr: 'Bangladesh', countryCode: 'BD', continent: 'Asia', lat: 23.8103, lon: 90.4125, timezone: 'Asia/Dhaka', population: 21006000 },
  { slug: 'rangoun', name: 'Yangon', nameFr: 'Rangoun', country: 'Myanmar', countryFr: 'Myanmar', countryCode: 'MM', continent: 'Asia', lat: 16.8661, lon: 96.1951, timezone: 'Asia/Rangoon', population: 5161000 },
  { slug: 'bangkok', name: 'Bangkok', nameFr: 'Bangkok', country: 'Thailand', countryFr: 'Thaïlande', countryCode: 'TH', continent: 'Asia', lat: 13.7563, lon: 100.5018, timezone: 'Asia/Bangkok', population: 10539415 },
  { slug: 'ho-chi-minh', name: 'Ho Chi Minh City', nameFr: 'Hô-Chi-Minh-Ville', country: 'Vietnam', countryFr: 'Vietnam', countryCode: 'VN', continent: 'Asia', lat: 10.8231, lon: 106.6297, timezone: 'Asia/Ho_Chi_Minh', population: 8993082 },
  { slug: 'hanoi', name: 'Hanoi', nameFr: 'Hanoï', country: 'Vietnam', countryFr: 'Vietnam', countryCode: 'VN', continent: 'Asia', lat: 21.0285, lon: 105.8542, timezone: 'Asia/Bangkok', population: 8054000 },
  { slug: 'manille', name: 'Manila', nameFr: 'Manille', country: 'Philippines', countryFr: 'Philippines', countryCode: 'PH', continent: 'Asia', lat: 14.5995, lon: 120.9842, timezone: 'Asia/Manila', population: 13923452 },
  { slug: 'djakarta', name: 'Jakarta', nameFr: 'Djakarta', country: 'Indonesia', countryFr: 'Indonésie', countryCode: 'ID', continent: 'Asia', lat: -6.2088, lon: 106.8456, timezone: 'Asia/Jakarta', population: 10562088 },
  { slug: 'surabaya', name: 'Surabaya', nameFr: 'Surabaya', country: 'Indonesia', countryFr: 'Indonésie', countryCode: 'ID', continent: 'Asia', lat: -7.2575, lon: 112.7521, timezone: 'Asia/Jakarta', population: 2874699 },
  { slug: 'singapour', name: 'Singapore', nameFr: 'Singapour', country: 'Singapore', countryFr: 'Singapour', countryCode: 'SG', continent: 'Asia', lat: 1.3521, lon: 103.8198, timezone: 'Asia/Singapore', population: 5850342 },
  { slug: 'kuala-lumpur', name: 'Kuala Lumpur', nameFr: 'Kuala Lumpur', country: 'Malaysia', countryFr: 'Malaisie', countryCode: 'MY', continent: 'Asia', lat: 3.1390, lon: 101.6869, timezone: 'Asia/Kuala_Lumpur', population: 1782000 },
  { slug: 'teheran', name: 'Tehran', nameFr: 'Téhéran', country: 'Iran', countryFr: 'Iran', countryCode: 'IR', continent: 'Asia', lat: 35.6892, lon: 51.3890, timezone: 'Asia/Tehran', population: 8693706 },
  { slug: 'bagdad', name: 'Baghdad', nameFr: 'Bagdad', country: 'Iraq', countryFr: 'Irak', countryCode: 'IQ', continent: 'Asia', lat: 33.3152, lon: 44.3661, timezone: 'Asia/Baghdad', population: 6643000 },
  { slug: 'riyad', name: 'Riyadh', nameFr: 'Riyad', country: 'Saudi Arabia', countryFr: 'Arabie saoudite', countryCode: 'SA', continent: 'Asia', lat: 24.7136, lon: 46.6753, timezone: 'Asia/Riyadh', population: 7538200 },
  { slug: 'djeddah', name: 'Jeddah', nameFr: 'Djeddah', country: 'Saudi Arabia', countryFr: 'Arabie saoudite', countryCode: 'SA', continent: 'Asia', lat: 21.4858, lon: 39.1925, timezone: 'Asia/Riyadh', population: 4697000 },
  { slug: 'dubai', name: 'Dubai', nameFr: 'Dubaï', country: 'UAE', countryFr: 'Émirats arabes unis', countryCode: 'AE', continent: 'Asia', lat: 25.2048, lon: 55.2708, timezone: 'Asia/Dubai', population: 3604000 },
  { slug: 'abu-dhabi', name: 'Abu Dhabi', nameFr: 'Abou Dabi', country: 'UAE', countryFr: 'Émirats arabes unis', countryCode: 'AE', continent: 'Asia', lat: 24.4539, lon: 54.3773, timezone: 'Asia/Dubai', population: 1482816 },
  { slug: 'doha', name: 'Doha', nameFr: 'Doha', country: 'Qatar', countryFr: 'Qatar', countryCode: 'QA', continent: 'Asia', lat: 25.2854, lon: 51.5310, timezone: 'Asia/Qatar', population: 2382000 },
  { slug: 'koweit', name: 'Kuwait City', nameFr: 'Koweït', country: 'Kuwait', countryFr: 'Koweït', countryCode: 'KW', continent: 'Asia', lat: 29.3759, lon: 47.9774, timezone: 'Asia/Kuwait', population: 2989000 },
  { slug: 'amman', name: 'Amman', nameFr: 'Amman', country: 'Jordan', countryFr: 'Jordanie', countryCode: 'JO', continent: 'Asia', lat: 31.9539, lon: 35.9106, timezone: 'Asia/Amman', population: 4007526 },
  { slug: 'beyrouth', name: 'Beirut', nameFr: 'Beyrouth', country: 'Lebanon', countryFr: 'Liban', countryCode: 'LB', continent: 'Asia', lat: 33.8938, lon: 35.5018, timezone: 'Asia/Beirut', population: 2424000 },
  { slug: 'damas', name: 'Damascus', nameFr: 'Damas', country: 'Syria', countryFr: 'Syrie', countryCode: 'SY', continent: 'Asia', lat: 33.5138, lon: 36.2765, timezone: 'Asia/Damascus', population: 2079000 },
  { slug: 'tel-aviv', name: 'Tel Aviv', nameFr: 'Tel Aviv', country: 'Israel', countryFr: 'Israël', countryCode: 'IL', continent: 'Asia', lat: 32.0853, lon: 34.7818, timezone: 'Asia/Jerusalem', population: 460613 },
  { slug: 'almaty', name: 'Almaty', nameFr: 'Almaty', country: 'Kazakhstan', countryFr: 'Kazakhstan', countryCode: 'KZ', continent: 'Asia', lat: 43.2220, lon: 76.8512, timezone: 'Asia/Almaty', population: 2000900 },
  { slug: 'tachkent', name: 'Tashkent', nameFr: 'Tachkent', country: 'Uzbekistan', countryFr: 'Ouzbékistan', countryCode: 'UZ', continent: 'Asia', lat: 41.2995, lon: 69.2401, timezone: 'Asia/Tashkent', population: 2571668 },
  { slug: 'kaboul', name: 'Kabul', nameFr: 'Kaboul', country: 'Afghanistan', countryFr: 'Afghanistan', countryCode: 'AF', continent: 'Asia', lat: 34.5553, lon: 69.2075, timezone: 'Asia/Kabul', population: 4601789 },
  { slug: 'colombo', name: 'Colombo', nameFr: 'Colombo', country: 'Sri Lanka', countryFr: 'Sri Lanka', countryCode: 'LK', continent: 'Asia', lat: 6.9271, lon: 79.8612, timezone: 'Asia/Colombo', population: 752000 },
  { slug: 'katmandou', name: 'Kathmandu', nameFr: 'Katmandou', country: 'Nepal', countryFr: 'Népal', countryCode: 'NP', continent: 'Asia', lat: 27.7172, lon: 85.3240, timezone: 'Asia/Kathmandu', population: 1442271 },
  { slug: 'rangoon', name: 'Mandalay', nameFr: 'Mandalay', country: 'Myanmar', countryFr: 'Myanmar', countryCode: 'MM', continent: 'Asia', lat: 21.9588, lon: 96.0891, timezone: 'Asia/Rangoon', population: 1225553 },
  { slug: 'phnom-penh', name: 'Phnom Penh', nameFr: 'Phnom Penh', country: 'Cambodia', countryFr: 'Cambodge', countryCode: 'KH', continent: 'Asia', lat: 11.5564, lon: 104.9282, timezone: 'Asia/Phnom_Penh', population: 2129371 },
  { slug: 'vientiane', name: 'Vientiane', nameFr: 'Vientiane', country: 'Laos', countryFr: 'Laos', countryCode: 'LA', continent: 'Asia', lat: 17.9757, lon: 102.6331, timezone: 'Asia/Vientiane', population: 948477 },

  // ── AMÉRIQUES ──
  { slug: 'new-york', name: 'New York', nameFr: 'New York', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 40.7128, lon: -74.0060, timezone: 'America/New_York', population: 8336817 },
  { slug: 'los-angeles', name: 'Los Angeles', nameFr: 'Los Angeles', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 34.0522, lon: -118.2437, timezone: 'America/Los_Angeles', population: 3979576 },
  { slug: 'chicago', name: 'Chicago', nameFr: 'Chicago', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 41.8781, lon: -87.6298, timezone: 'America/Chicago', population: 2693976 },
  { slug: 'houston', name: 'Houston', nameFr: 'Houston', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 29.7604, lon: -95.3698, timezone: 'America/Chicago', population: 2304580 },
  { slug: 'phoenix', name: 'Phoenix', nameFr: 'Phoenix', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 33.4484, lon: -112.0740, timezone: 'America/Phoenix', population: 1608139 },
  { slug: 'philadelphia', name: 'Philadelphia', nameFr: 'Philadelphie', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 39.9526, lon: -75.1652, timezone: 'America/New_York', population: 1584064 },
  { slug: 'san-antonio', name: 'San Antonio', nameFr: 'San Antonio', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 29.4241, lon: -98.4936, timezone: 'America/Chicago', population: 1434625 },
  { slug: 'san-diego', name: 'San Diego', nameFr: 'San Diego', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 32.7157, lon: -117.1611, timezone: 'America/Los_Angeles', population: 1386932 },
  { slug: 'dallas', name: 'Dallas', nameFr: 'Dallas', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 32.7767, lon: -96.7970, timezone: 'America/Chicago', population: 1304379 },
  { slug: 'san-francisco', name: 'San Francisco', nameFr: 'San Francisco', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 37.7749, lon: -122.4194, timezone: 'America/Los_Angeles', population: 881549 },
  { slug: 'miami', name: 'Miami', nameFr: 'Miami', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 25.7617, lon: -80.1918, timezone: 'America/New_York', population: 470914 },
  { slug: 'seattle', name: 'Seattle', nameFr: 'Seattle', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 47.6062, lon: -122.3321, timezone: 'America/Los_Angeles', population: 737000 },
  { slug: 'denver', name: 'Denver', nameFr: 'Denver', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 39.7392, lon: -104.9903, timezone: 'America/Denver', population: 727211 },
  { slug: 'boston', name: 'Boston', nameFr: 'Boston', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 42.3601, lon: -71.0589, timezone: 'America/New_York', population: 692600 },
  { slug: 'atlanta', name: 'Atlanta', nameFr: 'Atlanta', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 33.7490, lon: -84.3880, timezone: 'America/New_York', population: 498715 },
  { slug: 'las-vegas', name: 'Las Vegas', nameFr: 'Las Vegas', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 36.1699, lon: -115.1398, timezone: 'America/Los_Angeles', population: 641903 },
  { slug: 'minneapolis', name: 'Minneapolis', nameFr: 'Minneapolis', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 44.9778, lon: -93.2650, timezone: 'America/Chicago', population: 429954 },
  { slug: 'portland', name: 'Portland', nameFr: 'Portland', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Americas', lat: 45.5231, lon: -122.6765, timezone: 'America/Los_Angeles', population: 652503 },

  // Canada
  { slug: 'toronto', name: 'Toronto', nameFr: 'Toronto', country: 'Canada', countryFr: 'Canada', countryCode: 'CA', continent: 'Americas', lat: 43.6532, lon: -79.3832, timezone: 'America/Toronto', population: 2930000 },
  { slug: 'montreal', name: 'Montréal', nameFr: 'Montréal', country: 'Canada', countryFr: 'Canada', countryCode: 'CA', continent: 'Americas', lat: 45.5017, lon: -73.5673, timezone: 'America/Toronto', population: 1704694 },
  { slug: 'vancouver', name: 'Vancouver', nameFr: 'Vancouver', country: 'Canada', countryFr: 'Canada', countryCode: 'CA', continent: 'Americas', lat: 49.2827, lon: -123.1207, timezone: 'America/Vancouver', population: 631486 },
  { slug: 'calgary', name: 'Calgary', nameFr: 'Calgary', country: 'Canada', countryFr: 'Canada', countryCode: 'CA', continent: 'Americas', lat: 51.0447, lon: -114.0719, timezone: 'America/Edmonton', population: 1336000 },
  { slug: 'edmonton', name: 'Edmonton', nameFr: 'Edmonton', country: 'Canada', countryFr: 'Canada', countryCode: 'CA', continent: 'Americas', lat: 53.5461, lon: -113.4938, timezone: 'America/Edmonton', population: 1010899 },
  { slug: 'ottawa', name: 'Ottawa', nameFr: 'Ottawa', country: 'Canada', countryFr: 'Canada', countryCode: 'CA', continent: 'Americas', lat: 45.4215, lon: -75.6972, timezone: 'America/Toronto', population: 994837 },
  { slug: 'winnipeg', name: 'Winnipeg', nameFr: 'Winnipeg', country: 'Canada', countryFr: 'Canada', countryCode: 'CA', continent: 'Americas', lat: 49.8951, lon: -97.1384, timezone: 'America/Winnipeg', population: 749607 },
  { slug: 'quebec', name: 'Québec', nameFr: 'Québec', country: 'Canada', countryFr: 'Canada', countryCode: 'CA', continent: 'Americas', lat: 46.8139, lon: -71.2080, timezone: 'America/Toronto', population: 531902 },

  // Mexique & Amérique centrale
  { slug: 'mexico', name: 'Mexico City', nameFr: 'Mexico', country: 'Mexico', countryFr: 'Mexique', countryCode: 'MX', continent: 'Americas', lat: 19.4326, lon: -99.1332, timezone: 'America/Mexico_City', population: 9209944 },
  { slug: 'guadalajara', name: 'Guadalajara', nameFr: 'Guadalajara', country: 'Mexico', countryFr: 'Mexique', countryCode: 'MX', continent: 'Americas', lat: 20.6597, lon: -103.3496, timezone: 'America/Mexico_City', population: 1495182 },
  { slug: 'monterrey', name: 'Monterrey', nameFr: 'Monterrey', country: 'Mexico', countryFr: 'Mexique', countryCode: 'MX', continent: 'Americas', lat: 25.6866, lon: -100.3161, timezone: 'America/Monterrey', population: 1135550 },
  { slug: 'panama', name: 'Panama City', nameFr: 'Panama', country: 'Panama', countryFr: 'Panama', countryCode: 'PA', continent: 'Americas', lat: 8.9936, lon: -79.5197, timezone: 'America/Panama', population: 880691 },
  { slug: 'san-jose-costa-rica', name: 'San José', nameFr: 'San José', country: 'Costa Rica', countryFr: 'Costa Rica', countryCode: 'CR', continent: 'Americas', lat: 9.9281, lon: -84.0907, timezone: 'America/Costa_Rica', population: 339131 },
  { slug: 'guatemala', name: 'Guatemala City', nameFr: 'Guatemala', country: 'Guatemala', countryFr: 'Guatemala', countryCode: 'GT', continent: 'Americas', lat: 14.6349, lon: -90.5069, timezone: 'America/Guatemala', population: 1022000 },
  { slug: 'havane', name: 'Havana', nameFr: 'La Havane', country: 'Cuba', countryFr: 'Cuba', countryCode: 'CU', continent: 'Americas', lat: 23.1136, lon: -82.3666, timezone: 'America/Havana', population: 2130081 },

  // Amérique du Sud
  { slug: 'sao-paulo', name: 'São Paulo', nameFr: 'São Paulo', country: 'Brazil', countryFr: 'Brésil', countryCode: 'BR', continent: 'Americas', lat: -23.5505, lon: -46.6333, timezone: 'America/Sao_Paulo', population: 12325000 },
  { slug: 'rio-de-janeiro', name: 'Rio de Janeiro', nameFr: 'Rio de Janeiro', country: 'Brazil', countryFr: 'Brésil', countryCode: 'BR', continent: 'Americas', lat: -22.9068, lon: -43.1729, timezone: 'America/Sao_Paulo', population: 6748000 },
  { slug: 'buenos-aires', name: 'Buenos Aires', nameFr: 'Buenos Aires', country: 'Argentina', countryFr: 'Argentine', countryCode: 'AR', continent: 'Americas', lat: -34.6037, lon: -58.3816, timezone: 'America/Argentina/Buenos_Aires', population: 3054300 },
  { slug: 'lima', name: 'Lima', nameFr: 'Lima', country: 'Peru', countryFr: 'Pérou', countryCode: 'PE', continent: 'Americas', lat: -12.0464, lon: -77.0428, timezone: 'America/Lima', population: 10750000 },
  { slug: 'bogota', name: 'Bogotá', nameFr: 'Bogotá', country: 'Colombia', countryFr: 'Colombie', countryCode: 'CO', continent: 'Americas', lat: 4.7110, lon: -74.0721, timezone: 'America/Bogota', population: 7963000 },
  { slug: 'santiago', name: 'Santiago', nameFr: 'Santiago', country: 'Chile', countryFr: 'Chili', countryCode: 'CL', continent: 'Americas', lat: -33.4489, lon: -70.6693, timezone: 'America/Santiago', population: 5614000 },
  { slug: 'caracas', name: 'Caracas', nameFr: 'Caracas', country: 'Venezuela', countryFr: 'Venezuela', countryCode: 'VE', continent: 'Americas', lat: 10.4806, lon: -66.9036, timezone: 'America/Caracas', population: 2900000 },
  { slug: 'quito', name: 'Quito', nameFr: 'Quito', country: 'Ecuador', countryFr: 'Équateur', countryCode: 'EC', continent: 'Americas', lat: -0.1807, lon: -78.4678, timezone: 'America/Guayaquil', population: 1619146 },
  { slug: 'medellin', name: 'Medellín', nameFr: 'Medellín', country: 'Colombia', countryFr: 'Colombie', countryCode: 'CO', continent: 'Americas', lat: 6.2518, lon: -75.5636, timezone: 'America/Bogota', population: 2529403 },
  { slug: 'montevideo', name: 'Montevideo', nameFr: 'Montevideo', country: 'Uruguay', countryFr: 'Uruguay', countryCode: 'UY', continent: 'Americas', lat: -34.9011, lon: -56.1645, timezone: 'America/Montevideo', population: 1305082 },
  { slug: 'la-paz', name: 'La Paz', nameFr: 'La Paz', country: 'Bolivia', countryFr: 'Bolivie', countryCode: 'BO', continent: 'Americas', lat: -16.5000, lon: -68.1500, timezone: 'America/La_Paz', population: 789541 },
  { slug: 'asuncion', name: 'Asunción', nameFr: 'Asunción', country: 'Paraguay', countryFr: 'Paraguay', countryCode: 'PY', continent: 'Americas', lat: -25.2867, lon: -57.6470, timezone: 'America/Asuncion', population: 524559 },

  // ── OCÉANIE ──
  { slug: 'sydney', name: 'Sydney', nameFr: 'Sydney', country: 'Australia', countryFr: 'Australie', countryCode: 'AU', continent: 'Oceania', lat: -33.8688, lon: 151.2093, timezone: 'Australia/Sydney', population: 5312000 },
  { slug: 'melbourne', name: 'Melbourne', nameFr: 'Melbourne', country: 'Australia', countryFr: 'Australie', countryCode: 'AU', continent: 'Oceania', lat: -37.8136, lon: 144.9631, timezone: 'Australia/Melbourne', population: 5078000 },
  { slug: 'brisbane', name: 'Brisbane', nameFr: 'Brisbane', country: 'Australia', countryFr: 'Australie', countryCode: 'AU', continent: 'Oceania', lat: -27.4698, lon: 153.0251, timezone: 'Australia/Brisbane', population: 2482000 },
  { slug: 'perth', name: 'Perth', nameFr: 'Perth', country: 'Australia', countryFr: 'Australie', countryCode: 'AU', continent: 'Oceania', lat: -31.9505, lon: 115.8605, timezone: 'Australia/Perth', population: 2085000 },
  { slug: 'adelaide', name: 'Adelaide', nameFr: 'Adélaïde', country: 'Australia', countryFr: 'Australie', countryCode: 'AU', continent: 'Oceania', lat: -34.9285, lon: 138.6007, timezone: 'Australia/Adelaide', population: 1402393 },
  { slug: 'auckland', name: 'Auckland', nameFr: 'Auckland', country: 'New Zealand', countryFr: 'Nouvelle-Zélande', countryCode: 'NZ', continent: 'Oceania', lat: -36.8485, lon: 174.7633, timezone: 'Pacific/Auckland', population: 1628900 },
  { slug: 'wellington', name: 'Wellington', nameFr: 'Wellington', country: 'New Zealand', countryFr: 'Nouvelle-Zélande', countryCode: 'NZ', continent: 'Oceania', lat: -41.2924, lon: 174.7787, timezone: 'Pacific/Auckland', population: 412500 },
  { slug: 'port-moresby', name: 'Port Moresby', nameFr: 'Port Moresby', country: 'Papua New Guinea', countryFr: 'Papouasie-Nouvelle-Guinée', countryCode: 'PG', continent: 'Oceania', lat: -9.4438, lon: 147.1803, timezone: 'Pacific/Port_Moresby', population: 364145 },
  { slug: 'suva', name: 'Suva', nameFr: 'Suva', country: 'Fiji', countryFr: 'Fidji', countryCode: 'FJ', continent: 'Oceania', lat: -18.1416, lon: 178.4419, timezone: 'Pacific/Fiji', population: 93970 },
  { slug: 'honolulu', name: 'Honolulu', nameFr: 'Honolulu', country: 'United States', countryFr: 'États-Unis', countryCode: 'US', continent: 'Oceania', lat: 21.3069, lon: -157.8583, timezone: 'Pacific/Honolulu', population: 350964 },

  // ── MOYEN-ORIENT extra ──
  { slug: 'ankara', name: 'Ankara', nameFr: 'Ankara', country: 'Turkey', countryFr: 'Turquie', countryCode: 'TR', continent: 'Asia', lat: 39.9334, lon: 32.8597, timezone: 'Europe/Istanbul', population: 5503985 },
  { slug: 'istanbul', name: 'Istanbul', nameFr: 'Istanbul', country: 'Turkey', countryFr: 'Turquie', countryCode: 'TR', continent: 'Asia', lat: 41.0082, lon: 28.9784, timezone: 'Europe/Istanbul', population: 15519267 },
  { slug: 'muscat', name: 'Muscat', nameFr: 'Mascate', country: 'Oman', countryFr: 'Oman', countryCode: 'OM', continent: 'Asia', lat: 23.5880, lon: 58.3829, timezone: 'Asia/Muscat', population: 1090797 },
  { slug: 'manama', name: 'Manama', nameFr: 'Manama', country: 'Bahrain', countryFr: 'Bahreïn', countryCode: 'BH', continent: 'Asia', lat: 26.2235, lon: 50.5876, timezone: 'Asia/Bahrain', population: 411854 },
  { slug: 'jerusalem', name: 'Jerusalem', nameFr: 'Jérusalem', country: 'Israel', countryFr: 'Israël', countryCode: 'IL', continent: 'Asia', lat: 31.7683, lon: 35.2137, timezone: 'Asia/Jerusalem', population: 952000 },
  { slug: 'nicosie', name: 'Nicosia', nameFr: 'Nicosie', country: 'Cyprus', countryFr: 'Chypre', countryCode: 'CY', continent: 'Asia', lat: 35.1856, lon: 33.3823, timezone: 'Asia/Nicosia', population: 330000 },

  // Asie centrale / Caucase
  { slug: 'bakou', name: 'Baku', nameFr: 'Bakou', country: 'Azerbaijan', countryFr: 'Azerbaïdjan', countryCode: 'AZ', continent: 'Asia', lat: 40.4093, lon: 49.8671, timezone: 'Asia/Baku', population: 2293100 },
  { slug: 'tbilissi', name: 'Tbilisi', nameFr: 'Tbilissi', country: 'Georgia', countryFr: 'Géorgie', countryCode: 'GE', continent: 'Asia', lat: 41.6938, lon: 44.8015, timezone: 'Asia/Tbilisi', population: 1100000 },
  { slug: 'erevan', name: 'Yerevan', nameFr: 'Erevan', country: 'Armenia', countryFr: 'Arménie', countryCode: 'AM', continent: 'Asia', lat: 40.1872, lon: 44.5152, timezone: 'Asia/Yerevan', population: 1083000 },

  // Asie du Sud-Est sup.
  { slug: 'bandung', name: 'Bandung', nameFr: 'Bandung', country: 'Indonesia', countryFr: 'Indonésie', countryCode: 'ID', continent: 'Asia', lat: -6.9175, lon: 107.6191, timezone: 'Asia/Jakarta', population: 2575478 },
  { slug: 'medan', name: 'Medan', nameFr: 'Medan', country: 'Indonesia', countryFr: 'Indonésie', countryCode: 'ID', continent: 'Asia', lat: 3.5952, lon: 98.6722, timezone: 'Asia/Jakarta', population: 2435252 },
  { slug: 'quezon-city', name: 'Quezon City', nameFr: 'Quezon City', country: 'Philippines', countryFr: 'Philippines', countryCode: 'PH', continent: 'Asia', lat: 14.6760, lon: 121.0437, timezone: 'Asia/Manila', population: 2936116 },
  { slug: 'cebu', name: 'Cebu', nameFr: 'Cebu', country: 'Philippines', countryFr: 'Philippines', countryCode: 'PH', continent: 'Asia', lat: 10.3157, lon: 123.8854, timezone: 'Asia/Manila', population: 922611 },

  // Chine sup.
  { slug: 'wuhan', name: 'Wuhan', nameFr: 'Wuhan', country: 'China', countryFr: 'Chine', countryCode: 'CN', continent: 'Asia', lat: 30.5928, lon: 114.3055, timezone: 'Asia/Shanghai', population: 8176000 },
  { slug: 'xian', name: "Xi'an", nameFr: "Xi'an", country: 'China', countryFr: 'Chine', countryCode: 'CN', continent: 'Asia', lat: 34.3416, lon: 108.9398, timezone: 'Asia/Shanghai', population: 8705600 },
  { slug: 'tianjin', name: 'Tianjin', nameFr: 'Tianjin', country: 'China', countryFr: 'Chine', countryCode: 'CN', continent: 'Asia', lat: 39.3434, lon: 117.3616, timezone: 'Asia/Shanghai', population: 15600000 },
  { slug: 'nankin', name: 'Nanjing', nameFr: 'Nankin', country: 'China', countryFr: 'Chine', countryCode: 'CN', continent: 'Asia', lat: 32.0603, lon: 118.7969, timezone: 'Asia/Shanghai', population: 8505500 },
  { slug: 'harbin', name: 'Harbin', nameFr: 'Harbin', country: 'China', countryFr: 'Chine', countryCode: 'CN', continent: 'Asia', lat: 45.8038, lon: 126.5340, timezone: 'Asia/Shanghai', population: 5878000 },
  { slug: 'chongqing', name: 'Chongqing', nameFr: 'Chongqing', country: 'China', countryFr: 'Chine', countryCode: 'CN', continent: 'Asia', lat: 29.4316, lon: 106.9123, timezone: 'Asia/Shanghai', population: 8638000 },
];

// ─── DEDUP CHECK ─────────────────────────────────────────────────────────────
const slugSet = new Set();
for (const c of CITIES_RAW) {
  if (slugSet.has(c.slug)) {
    console.error(`DUPLICATE SLUG: ${c.slug}`);
    process.exit(1);
  }
  slugSet.add(c.slug);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function daysInMonth(month) { // month 1-12
  return new Date(2024, month, 0).getDate();
}

function toHHMM(date) {
  if (!date) return null;
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function monthName(m) { // 1-12
  return ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][m - 1];
}

// ─── COMPUTE CITIES ──────────────────────────────────────────────────────────
const cities = [];
let skipped = 0;

for (const raw of CITIES_RAW) {
  const { lat, lon } = raw;
  const seasonal = [];

  for (let m = 1; m <= 12; m++) {
    const date = new Date(Date.UTC(2024, m - 1, 15));
    const win = getVitDWindow(date, lat, lon);
    const ozone = estimateOzone(lat, m - 1);
    const peakUVI = parseFloat(estimateUVI(win.maxElevation, ozone).toFixed(2));

    seasonal.push({
      month: m,
      maxElevation: parseFloat(win.maxElevation.toFixed(1)),
      peakUVI,
      optimalWindowMinutes: win.optimal ? Math.round(win.optimal.duration) : 0,
      extendedWindowMinutes: win.extended ? Math.round(win.extended.duration) : 0,
      optimalStart: win.optimal ? toHHMM(win.optimal.start) : null,
      optimalEnd: win.optimal ? toHHMM(win.optimal.end) : null,
      extendedStart: win.extended ? toHHMM(win.extended.start) : null,
      extendedEnd: win.extended ? toHHMM(win.extended.end) : null,
      hasVitaminD: !!(win.optimal || win.extended),
    });
  }

  const bestMonths = seasonal.filter(s => s.optimalWindowMinutes > 0).map(s => s.month);
  const goodMonths = seasonal.filter(s => s.hasVitaminD).map(s => s.month);

  // Skip cities with absolutely no vitamin D windows at all
  if (goodMonths.length === 0) {
    console.log(`Skipped (no windows): ${raw.name}`);
    skipped++;
    continue;
  }

  // Peak month: best optimalWindowMinutes, fallback to extendedWindowMinutes
  const peakMonth = seasonal.reduce((best, s) => {
    const score = s.optimalWindowMinutes * 2 + s.extendedWindowMinutes;
    const bestScore = best.optimalWindowMinutes * 2 + best.extendedWindowMinutes;
    return score > bestScore ? s : best;
  });

  // Count actual days with optimal/extended windows across all 365 days of 2024
  let annualOptimalDays = 0;
  let annualExtendedDays = 0;
  for (let doy = 1; doy <= 365; doy++) {
    const d = new Date(Date.UTC(2024, 0, doy));
    const w = getVitDWindow(d, lat, lon);
    if (w.optimal) annualOptimalDays++;
    if (w.optimal || w.extended) annualExtendedDays++;
  }

  const maxPeakUVI = Math.max(...seasonal.map(s => s.peakUVI));

  cities.push({
    slug: raw.slug,
    countrySlug: slugify(raw.country),
    name: raw.name,
    nameFr: raw.nameFr,
    country: raw.country,
    countryFr: raw.countryFr,
    countryCode: raw.countryCode,
    continent: raw.continent,
    lat,
    lon,
    timezone: raw.timezone,
    population: raw.population,
    hemisphere: lat >= 0 ? 'north' : 'south',
    isPolar: Math.abs(lat) > 63,
    seasonal,
    bestMonths,
    goodMonths,
    peakMonth: peakMonth.month,
    peakOptimalMinutes: peakMonth.optimalWindowMinutes,
    peakExtendedMinutes: peakMonth.extendedWindowMinutes,
    annualOptimalDays,
    annualExtendedDays,
    maxPeakUVI: parseFloat(maxPeakUVI.toFixed(2)),
  });
}

// ─── WRITE OUTPUT ─────────────────────────────────────────────────────────────
const outPath = join(__dirname, '../data/cities.json');
writeFileSync(outPath, JSON.stringify(cities, null, 2), 'utf8');

console.log(`\n✓ Generated ${cities.length} cities → data/cities.json`);
if (skipped > 0) console.log(`  (${skipped} cities skipped — no vitamin D windows)`);
console.log(`\nSpot check:`);
['paris', 'sydney', 'singapour', 'tromso', 'new-york'].forEach(slug => {
  const c = cities.find(x => x.slug === slug);
  if (!c) { console.log(`  ${slug}: NOT FOUND`); return; }
  console.log(`  ${c.nameFr}: bestMonths=[${c.bestMonths.join(',')}] peak=${c.peakMonth} (${c.peakOptimalMinutes}min opt)`);
});
