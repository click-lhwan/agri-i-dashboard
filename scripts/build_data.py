"""Build Agri-I dashboard JSON from ch4_predictions.csv.

Usage:
    python scripts/build_data.py

Input:
    data/ch4_predictions.csv with columns:
    위도, 경도, 시작시간, 종료시간, CH4_추정량

Output:
    data/dashboard_data.json

Notes:
    - CH4 graph values are loaded from the CSV.
    - The display series is interpolated to a 5-day grid using only CSV values.
    - Estimated CO2e reduction uses IPCC AR6 non-fossil methane GWP100 = 27.0.
    - The current demo uses the maximum observed CH4 per field as a placeholder baseline.
      Replace this with your project baseline once validated.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "data" / "ch4_predictions.csv"
OUT_PATH = ROOT / "data" / "dashboard_data.json"
GWP100_CH4_NON_FOSSIL_AR6 = 27.0

FIELD_NAMES = [
    "Haenam Demo Farm",
    "Gimje AWD Plot",
    "Iksan Rice Group",
    "Cheorwon Test Field",
    "Northern Rice Block",
]


def rough_polygon(lat: float, lon: float, idx: int) -> list[list[float]]:
    """Generate a demo polygon around a centroid.

    Replace the polygon with a real parcel GeoJSON boundary before field use.
    Leaflet expects [lat, lon] pairs in app.js.
    """
    dlat = 0.015 + (idx % 3) * 0.002
    dlon = 0.020 + (idx % 2) * 0.003
    return [
        [lat + dlat, lon - dlon],
        [lat + dlat * 0.8, lon + dlon * 0.7],
        [lat - dlat * 0.6, lon + dlon],
        [lat - dlat, lon - dlon * 0.5],
        [lat + dlat, lon - dlon],
    ]


def build() -> dict:
    df = pd.read_csv(CSV_PATH).rename(
        columns={"위도": "lat", "경도": "lon", "시작시간": "start", "종료시간": "end", "CH4_추정량": "ch4"}
    )
    df["start"] = pd.to_datetime(df["start"])
    df["end"] = pd.to_datetime(df["end"])
    df = df.sort_values(["lat", "lon", "start"])

    fields = []
    for idx, ((lat, lon), g) in enumerate(df.groupby(["lat", "lon"]), start=1):
        g = g.sort_values("start").reset_index(drop=True)
        field_id = f"KR-RICE-{idx:03d}"
        farm_name = FIELD_NAMES[idx - 1] if idx <= len(FIELD_NAMES) else f"Demo Farm {idx}"
        area = round(2.25 + idx * 0.47, 2)

        s = pd.Series(g["ch4"].astype(float).to_list(), index=g["start"]).sort_index()
        grid = pd.date_range(s.index.min(), s.index.max(), freq="5D")
        interp = s.reindex(s.index.union(grid).sort_values()).interpolate(method="time").reindex(grid)
        max_ch4 = float(s.max())
        min_ch4 = float(s.min())

        ch4_series = []
        for dt, val in interp.items():
            v = float(val)
            reduction = max(0.0, max_ch4 - v)
            ch4_series.append(
                {
                    "date": dt.strftime("%Y-%m-%d"),
                    "ch4": round(v, 4),
                    "co2e_reduction": round(reduction * GWP100_CH4_NON_FOSSIL_AR6, 4),
                }
            )

        # Demo water-index proxy until real Sentinel-1 output is written.
        vals = [x["ch4"] for x in ch4_series]
        mn, mx = min(vals), max(vals)
        water_index_series = []
        for x in ch4_series:
            norm = (x["ch4"] - mn) / (mx - mn) if mx > mn else 0.5
            water_index_series.append(
                {"date": x["date"], "value": round(-0.45 + norm * 1.1, 4), "source": "demo_from_ch4_until_sentinel1"}
            )

        fields.append(
            {
                "id": field_id,
                "farmName": farm_name,
                "areaHa": area,
                "crop": "Rice (AWD)",
                "lat": float(lat),
                "lon": float(lon),
                "polygon": rough_polygon(float(lat), float(lon), idx),
                "ch4Series": ch4_series,
                "waterIndexSeries": water_index_series,
                "rawCsvRows": int(len(g)),
                "sourceIntervalNote": "CH4 values are loaded from uploaded CSV and interpolated to a 5-day display grid.",
                "waterIndexNote": "Demo Sentinel-1 water index proxy. Replace by running fetch_sentinel1_water_proxy.py.",
                "latest": {
                    "date": ch4_series[-1]["date"],
                    "ch4": ch4_series[-1]["ch4"],
                    "co2eReduction": ch4_series[-1]["co2e_reduction"],
                    "waterIndex": water_index_series[-1]["value"],
                },
            }
        )

    data = {
        "kpis": {
            "participatingFarms": len(fields),
            "monitoredParcels": len(fields),
            "managedHectares": round(sum(f["areaHa"] for f in fields), 2),
            "estimatedCo2eReduction": round(sum(f["latest"]["co2eReduction"] for f in fields), 2),
            "gwp100_ch4": GWP100_CH4_NON_FOSSIL_AR6,
            "conversionNote": "CO2e = CH4 mass × 27.0, using IPCC AR6 100-year GWP for non-fossil methane. Units follow the CH4 CSV unit.",
        },
        "fields": fields,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    return data


if __name__ == "__main__":
    OUT_PATH.write_text(json.dumps(build(), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH}")
