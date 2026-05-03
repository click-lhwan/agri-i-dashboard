# Agri-I Dashboard – Pan Map Fix

This is a GitHub Pages static dashboard build for Agri-I.

## What changed

- Replaced the previous single 500m x 500m static image overlay map with a georeferenced Leaflet imagery layer.
- Initial map view is now 500m x 1000m around the selected field.
- The pannable map context is now 5000m x 10000m around the selected field.
- Field polygons are drawn as Leaflet geographic vector layers in a high-z-index custom pane. They stay fixed to their real lat/lon coordinates when the user pans.
- Sentinel-2 RGB layer loaded via Earth Engine now covers the larger 5000m x 10000m context, not just the field polygon.
- Added cache-busting query strings to CSS/JS script references.

## Files to upload to GitHub repository root

Upload these files/folders to the root of your `agri-i-dashboard` repository:

```text
index.html
styles.css
app.js
config.js
data/ch4_predictions.csv
.nojekyll
README.md
```

## Required configuration

Edit `config.js`:

```js
window.AGRII_CONFIG = {
  GOOGLE_OAUTH_CLIENT_ID: "YOUR_CLIENT_ID.apps.googleusercontent.com",
  GEE_CLOUD_PROJECT_ID: "your-earth-engine-project-id",
  GOOGLE_MAPS_API_KEY: "",
  SENTINEL2_COLLECTION: "COPERNICUS/S2_SR_HARMONIZED",
  SENTINEL2_CLOUD_FILTER_PERCENT: 70,
  VIEW_WIDTH_METERS: 1000,
  VIEW_HEIGHT_METERS: 500,
  LOAD_WIDTH_METERS: 10000,
  LOAD_HEIGHT_METERS: 5000,
  CH4_GWP100: 27.0,
  CSV_PATH: "data/ch4_predictions.csv"
};
```

No Google Maps API key is required.

## After uploading

GitHub Pages may cache old JS/CSS for a few minutes. Do a hard refresh:

- Windows: Ctrl + Shift + R
- Mac: Cmd + Shift + R

If the old polygon persists from browser localStorage, click `Reset` or open DevTools and clear localStorage keys beginning with `agrii.field.polygons`.
