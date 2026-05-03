# Agri-I AWD dMRV Dashboard MVP

A lightweight responsive dashboard prototype inspired by the provided `ui1.png` and `ui2.png`.

- Mobile viewport: app-card layout similar to `ui1.png`
- Desktop viewport: SaaS dashboard layout similar to `ui2.png`
- CH4 chart: generated from the uploaded `data/ch4_predictions.csv`
- Satellite map: Leaflet + Esri World Imagery public map tiles
- CO2e conversion: CH4 mass × 27.0, IPCC AR6 GWP100 for non-fossil methane
- Sentinel-1 water graph: demo S1 water-index proxy for now; replace with real Earth Engine output using the optional script

## Local run

```bash
cd agri_i_dashboard
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

Do not open `index.html` directly with `file://`, because browsers block local JSON/CSV fetches.

## Update CH4 data

1. Replace `data/ch4_predictions.csv` with a new CSV using the same columns:
   - `위도`
   - `경도`
   - `시작시간`
   - `종료시간`
   - `CH4_추정량`
2. Rebuild JSON:

```bash
pip install -r requirements.txt
python scripts/build_data.py
```

The app displays a 5-day grid by interpolating from the CSV values only. If you add actual 5-day rows later, the graph will naturally become denser and more accurate.

## Sentinel-1 water-index proxy

Sentinel-1 is SAR radar. It does not produce the classic optical NDWI. The dashboard labels the graph as `S1 Water Index (NDWI proxy)`. For actual data:

```bash
pip install -r requirements.txt
earthengine authenticate
python scripts/fetch_sentinel1_water_proxy.py
```

This script reads the demo polygons from `dashboard_data.json`, queries `COPERNICUS/S1_GRD`, and writes a 5-day S1 water-proxy series back into `dashboard_data.json`.

For a real field, replace the generated demo polygon with the true parcel boundary in GeoJSON or edit the `polygon` field inside `data/dashboard_data.json`.

## Free hosting recommendation

Use **GitHub Pages** for the MVP because this dashboard is static: HTML, CSS, JS, and JSON. There is no server cost and the app stays lightweight.

If live Sentinel-1 computation must run on demand, static hosting is not enough. In that case, the lowest-friction Python options are:

- Streamlit Community Cloud for a public prototype
- Hugging Face Spaces with a small Gradio/Streamlit app
- A small scheduled GitHub Actions job that runs `scripts/fetch_sentinel1_water_proxy.py` and commits updated JSON

For now, the recommended lightweight route is:

```text
Python scripts locally or GitHub Actions → dashboard_data.json → GitHub Pages static dashboard
```

## Files

```text
index.html                    UI shell
styles.css                    responsive desktop/mobile styling
app.js                        data loading, charts, Leaflet map
/data/ch4_predictions.csv     uploaded CH4 CSV
/data/dashboard_data.json     generated dashboard data
/scripts/build_data.py        CSV → JSON builder
/scripts/fetch_sentinel1_water_proxy.py   optional Earth Engine Sentinel-1 extractor
requirements.txt              Python dependencies
```

## Known limitations

- The map currently uses rough demo polygons around CSV centroids. Replace these with real parcel boundaries.
- The current CO2e number assumes the CH4 CSV unit is a mass unit. If your CH4 value is flux or model score, define conversion to kg CH4 first.
- The estimated reduction currently uses the maximum observed CH4 value per field as a demo baseline. Replace this with a validated baseline/control scenario.
- The S1 water-index graph is a demo proxy until Earth Engine authentication and real field boundaries are supplied.
