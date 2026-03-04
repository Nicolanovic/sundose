// Shared mutable application state
export const state = {
  lat: null,
  lon: null,
  locationName: '',
  isGeolocated: false,
  phototype: 3,       // Default: Fitzpatrick Type III
  weatherData: null,  // { hourly, timezone, fetched }
  timezone: null,     // IANA timezone string, e.g. "Europe/Paris"
};
