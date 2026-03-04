// ===== Entry Point =====
import { state } from './state.js';
import { renderApp } from './ui.js';
import { requestLocation, initSearchInput, setLocation } from './geo.js';

// Expose functions needed by inline HTML event handlers
window.requestLocation = requestLocation;
window.initSearchInput = initSearchInput;

window.setPhototype = (id) => {
  state.phototype = id;
  renderApp();
};

// Start the app
requestLocation();
