/* Optional Google Earth Engine configuration.
   Current build uses no-key Sentinel-2 Cloudless tiles for GitHub Pages.
   To experiment with live GEE tiles, fill these fields and adapt buildGeeTileLayer() in app.js. */
window.AGRII_GEE_CONFIG = {
  enabled: false,
  googleCloudProjectId: '',
  oauthClientId: '',
  earthEngineAsset: 'COPERNICUS/S2_SR_HARMONIZED',
  notes: 'Optional only. The shipped prototype does not require an API key.'
};
