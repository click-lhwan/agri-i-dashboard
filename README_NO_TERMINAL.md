# Agri-I Dashboard — No Terminal Guide

This version is designed for environments where a terminal is unavailable.

## Option A — GitHub Pages, recommended for presentation

This app is a fully static website: HTML, CSS, JavaScript, and CSV.
It builds the CH4 chart directly in the browser from `data/ch4_predictions.csv`.

### How to deploy without terminal

1. Create a new GitHub repository, for example `agri-i-dashboard`.
2. Upload all files in this folder through GitHub's web UI.
3. Make sure `index.html` is at the repository root.
4. Go to **Settings → Pages**.
5. Set **Source** to **Deploy from a branch**.
6. Select `main` branch and `/root`, then save.
7. Wait a few minutes. The site should open at:
   `https://YOUR_ID.github.io/agri-i-dashboard/`

### Updating CH4 data later

Replace only this file via the GitHub web UI:

`data/ch4_predictions.csv`

Keep the same columns:

- `위도`
- `경도`
- `시작시간`
- `종료시간`
- `CH4_추정량`

The graph updates automatically because the browser parses the CSV.
No Python rebuild is required.

## Option B — Google Colab

Use `Agri-I_Dashboard_Colab_Run.ipynb`.
Open it in Colab, upload this ZIP, and run cells from top to bottom.
It starts a small Python static server inside Colab and displays the page in an iframe.

## Important limitation

The satellite image layer is live map tiles. The field polygon is a demo polygon generated from CSV latitude/longitude. Replace it with a true parcel GeoJSON before field testing.

Sentinel-1 live NDWI is not available in a static GitHub Pages app. The dashboard currently visualizes a lightweight `S1 Water Index (NDWI proxy)` for UI demonstration. For actual Sentinel-1 values, use Google Earth Engine or Sentinel Hub and export a 5-day water-index CSV.
