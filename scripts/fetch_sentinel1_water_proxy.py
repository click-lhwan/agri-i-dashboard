"""Optional: fetch Sentinel-1 SAR water-index proxy with Google Earth Engine.

This script is included for the real production pipeline. It will not run until you
have Earth Engine access and authenticate your machine.

Setup:
    pip install -r requirements.txt
    earthengine authenticate
    python scripts/fetch_sentinel1_water_proxy.py

What it does:
    - Reads field polygons from data/dashboard_data.json.
    - Pulls COPERNICUS/S1_GRD VV/VH data in 5-day windows.
    - Computes a simple Sentinel-1 water proxy using the SDWI-style formula:
        S1W = ln(10 * VV_linear * VH_linear) - 8
      where VV/VH are converted from dB to linear sigma0.
    - Replaces each field.waterIndexSeries in dashboard_data.json.

Important:
    Sentinel-1 is radar. It does not provide optical NDWI. Treat this as an
    'S1 water index proxy' for water/inundation monitoring. If you need the
    classic NDWI = (Green - NIR) / (Green + NIR), use Sentinel-2 instead.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

import ee

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "dashboard_data.json"


def init_ee() -> None:
    try:
        ee.Initialize()
    except Exception:
        ee.Authenticate()
        ee.Initialize()


def s1_water_proxy(image: ee.Image) -> ee.Image:
    vv = ee.Image(10).pow(image.select("VV").divide(10))
    vh = ee.Image(10).pow(image.select("VH").divide(10))
    return vv.multiply(vh).multiply(10).log().subtract(8).rename("S1_WATER_PROXY")


def reduce_window(poly_coords_lonlat, start_date: str, end_date: str):
    geom = ee.Geometry.Polygon([poly_coords_lonlat])
    collection = (
        ee.ImageCollection("COPERNICUS/S1_GRD")
        .filterBounds(geom)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.eq("instrumentMode", "IW"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
        .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
    )
    image = collection.median()
    proxy = s1_water_proxy(image)
    stats = proxy.reduceRegion(reducer=ee.Reducer.mean(), geometry=geom, scale=10, maxPixels=1e7)
    value = stats.get("S1_WATER_PROXY").getInfo()
    return value


def main():
    init_ee()
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    for field in data["fields"]:
        # Convert [lat, lon] from app JSON to [lon, lat] for Earth Engine.
        poly_lonlat = [[p[1], p[0]] for p in field["polygon"]]
        dates = [datetime.fromisoformat(x["date"]) for x in field["ch4Series"]]
        series = []
        for d in dates:
            start = d.strftime("%Y-%m-%d")
            end = (d + timedelta(days=5)).strftime("%Y-%m-%d")
            try:
                value = reduce_window(poly_lonlat, start, end)
                series.append({"date": start, "value": round(float(value), 4), "source": "sentinel1_gee"})
            except Exception as exc:
                print(f"{field['id']} {start} failed: {exc}")
                series.append({"date": start, "value": None, "source": "sentinel1_gee_failed"})
        field["waterIndexSeries"] = series
        field["waterIndexNote"] = "Sentinel-1 SAR water proxy from COPERNICUS/S1_GRD via Google Earth Engine. Not optical NDWI."
        # update latest valid value
        valid = [x for x in series if x["value"] is not None]
        if valid:
            field["latest"]["waterIndex"] = valid[-1]["value"]
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Updated {DATA_PATH} with Sentinel-1 water proxy series")


if __name__ == "__main__":
    main()
