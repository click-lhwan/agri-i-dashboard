# Agri-I Sentinel-2 AWD dMRV Dashboard for GitHub Pages

This is a no-terminal, static GitHub Pages dashboard for Agri-I.
It is designed for a weak development environment where local terminal execution is not available.

## What changed in this version

- Uses **Sentinel-2 NDWI** logic instead of Sentinel-1 proxy.
- CH4 graph uses only `data/ch4_predictions.csv` and interpolates display points to 5-day intervals.
- Desktop chart infinite scroll bug is fixed by fixed-height chart containers and `maintainAspectRatio: false`.
- Map is restricted to a **500m x 500m AOI** around the selected field to reduce tile loading.
- Field boundary polygon can be drawn manually on the map and saved in browser localStorage.
- Field GeoJSON polygon can be pasted and applied.
- Google account login UI is included.
- Google/GEE config area is included in both `config.js` and the on-page **GEE Config** dialog.

## How to deploy on GitHub Pages

1. Create a GitHub repository, for example `agri-i-dashboard`.
2. Upload every file in this folder to the repository root.
3. Go to **Settings → Pages**.
4. Set source to **Deploy from a branch**.
5. Select branch `main` and folder `/root`.
6. Open the generated URL.

## Required files

```text
index.html
styles.css
app.js
config.js
data/ch4_predictions.csv
.nojekyll
README.md
```

## Google / GEE setup

Edit `config.js` or open **GEE Config** in the website UI.

```js
window.AGRII_CONFIG = {
  GOOGLE_OAUTH_CLIENT_ID: "YOUR_CLIENT_ID.apps.googleusercontent.com",
  GEE_CLOUD_PROJECT_ID: "your-earth-engine-project-id",
  GOOGLE_MAPS_API_KEY: "", // optional in this Leaflet version
  SENTINEL2_COLLECTION: "COPERNICUS/S2_SR_HARMONIZED"
};
```

Do **not** paste service account private keys, client secrets, refresh tokens, or JSON key files into GitHub Pages.
Client-side Earth Engine apps require users to authenticate with their own Google/Earth Engine account.

## Sentinel-2 NDWI

When Earth Engine is connected, the app queries:

```text
COPERNICUS/S2_SR_HARMONIZED
```

NDWI is computed as:

```text
NDWI = (B3 - B8) / (B3 + B8)
```

The app computes mean NDWI over the selected field polygon for each 5-day interval.
If GEE is not connected, the app shows a demo NDWI curve so the UI still works.

## Field boundary

The app starts with a generated demo polygon. For real use:

- click **Draw Boundary** and trace the rice field on the map, then click **Finish**, or
- paste a GeoJSON Polygon into the Field Details panel and click **Apply GeoJSON**.

The boundary is saved in browser localStorage, not in a database.

## Current limitations

- GitHub Pages has no backend database.
- Google login is client-side only and does not secure private data.
- Earth Engine access requires a user account with Earth Engine permission and a configured OAuth client ID.
- For actual MRV use, CH4 unit and baseline methodology must be confirmed.
- The first map is Esri World Imagery for speed; Sentinel-2 overlay is added after GEE connection.


## 2026-05 map loading fix

This build does **not** use Google Maps API keys for the base map. The 500m x 500m AOI is loaded as a single Esri World Imagery export image instead of many small map tiles. This fixes partial / broken tile mosaics in restricted network environments and keeps the demo lightweight.

Minimum Google setup for Sentinel-2 NDWI:

1. Google OAuth Client ID
2. Earth Engine enabled Cloud Project ID

Do not add service-account JSON, private keys, client secrets, refresh tokens, or unrestricted API keys to GitHub Pages.

## Cost control recommendation

For the GitHub Pages demo, leave GOOGLE_MAPS_API_KEY blank. Earth Engine noncommercial use may be free if the project is verified for noncommercial use, but other Google Cloud services can still generate charges. In Google Cloud Billing, create a budget alert (e.g., $10 / $25 / $50) and restrict/avoid billable APIs. If you later enable Google Maps Platform, create a separate restricted API key with HTTP referrer restrictions for your GitHub Pages origin only and set API quotas.
