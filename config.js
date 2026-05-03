// Agri-I public runtime configuration for GitHub Pages.
// Safe to edit in GitHub's web UI.
// Do NOT paste service-account JSON, private keys, client secrets, or refresh tokens here.
// For client-side Earth Engine, users authenticate with their own Google/Earth Engine account.
window.AGRII_CONFIG = {
  // Required for Google Sign-In and Earth Engine client-side OAuth.
  // Example: "1234567890-abc123def456.apps.googleusercontent.com"
  GOOGLE_OAUTH_CLIENT_ID: "",

  // Required by newer Earth Engine projects. Example: "agri-i-demo-project"
  GEE_CLOUD_PROJECT_ID: "agri-i-dashboard",

  // Not used by this GitHub Pages build. Keep blank to avoid billable Maps API usage.
  GOOGLE_MAPS_API_KEY: "",

  // Sentinel-2 Surface Reflectance Harmonized collection.
  SENTINEL2_COLLECTION: "COPERNICUS/S2_SR_HARMONIZED",

  // Cloud filter for Sentinel-2 images.
  SENTINEL2_CLOUD_FILTER_PERCENT: 70,

  // Initial visible map window: 500m × 1000m around the selected field.
  // Width is east-west, height is north-south.
  VIEW_WIDTH_METERS: 1000,
  VIEW_HEIGHT_METERS: 500,

  // Larger panning canvas loaded around the selected field: 5000m × 10000m.
  // Width is east-west, height is north-south.
  LOAD_WIDTH_METERS: 10000,
  LOAD_HEIGHT_METERS: 5000,

  // Backward compatibility with older UI labels.
  AOI_SIDE_METERS: 500,

  // CH4 → CO2e conversion factor. AR6 GWP100 for non-fossil methane.
  CH4_GWP100: 27.0,

  // CSV file path in this GitHub Pages site.
  CSV_PATH: "data/ch4_predictions.csv"
};
