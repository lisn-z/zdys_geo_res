"""Convert the downloaded NOAA source subsets into a small browser JSON bundle.

Usage: python scripts/ocean-atmosphere/source-data/build-climate-data.py scripts/ocean-atmosphere/dist
Requires numpy and h5py. Source downloads stay beside this script, outside public.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
import hashlib
import json
import re
import sys

import h5py
import numpy as np


SCENARIOS = {"normal": "201312", "elnino": "201512", "lanina": "201012"}
ERSST_URL = "https://www.ncei.noaa.gov/pub/data/cmb/ersst/v5/netcdf/"
SLP_URL = "https://psl.noaa.gov/thredds/dodsC/Datasets/ncep.reanalysis.derived/surface/slp.mon.mean.nc"


def field(values, lat, lon, units, source, date, baseline=None):
    values = np.asarray(values)
    result = {
        "width": len(lon), "height": len(lat),
        "lonStart": float(lon[0]), "latStart": float(lat[0]),
        "lonStep": float(lon[1] - lon[0]), "latStep": float(lat[1] - lat[0]),
        "values": [None if not np.isfinite(v) or v < -900 else round(float(v), 2) for v in values.ravel()],
        "units": units, "source": source, "date": date,
    }
    if baseline:
        result["baseline"] = baseline
    assert len(result["values"]) == len(lon) * len(lat)
    assert np.allclose(np.diff(lat), result["latStep"])
    assert np.allclose(np.diff(lon), result["lonStep"])
    return result


def read_ersst(path, date):
    with h5py.File(path) as f:
        stamp = datetime(1854, 1, 15) + timedelta(days=float(f["time"][0]))
        assert stamp.strftime("%Y-%m") == date, (path.name, stamp, date)
        lat, lon = f["lat"][:], f["lon"][:]
        sst = field(f["sst"][0, 0], lat, lon, "°C", "NOAA ERSST v5", date)
        anomaly = field(f["ssta"][0, 0], lat, lon, "°C", "NOAA ERSST v5", date, "1971—2000 年同期月平均")
        ocean = np.array([np.nan if v is None else v for v in anomaly["values"]]).reshape(len(lat), len(lon))
        nino34 = ocean[np.ix_((lat >= -5) & (lat <= 5), (lon >= 190) & (lon <= 240))]
        print(date, "Nino3.4 gridded anomaly (not ONI):", round(float(np.nanmean(nino34)), 3))
        return sst, anomaly


def read_slp(path, date):
    text = path.read_text(encoding="utf-8")
    rows = re.findall(r"^\[0\]\[(\d+)\], (.+)$", text, re.MULTILINE)
    assert len(rows) == 73, (path.name, "Unexpected latitude count")
    values = np.array([[float(v) for v in line.split(",")] for _, line in rows])
    assert values.shape == (73, 144)
    assert [int(index) for index, _ in rows] == list(range(73))
    def coordinate(name):
        match = re.search(rf"slp\.{name}\[\d+\]\s*\n([^\n]+)", text)
        assert match, name
        return np.array([float(v) for v in match.group(1).split(",")])
    stamp = datetime(1800, 1, 1) + timedelta(hours=float(coordinate("time")[0]))
    assert stamp.strftime("%Y-%m") == date, (path.name, stamp, date)
    assert float(np.min(values)) > 870 and float(np.max(values)) < 1150
    # The source units are millibars; 1 millibar = 1 hPa, so no factor of 100.
    return field(values, coordinate("lat"), coordinate("lon"), "hPa", "NCEP/NCAR Reanalysis 1", date)


def main():
    root = Path(sys.argv[1]).resolve()
    root.mkdir(parents=True, exist_ok=True)
    source = Path(__file__).resolve().parent
    bundle = {}
    manifest = {
        "title": "海—气相互作用教学资源 · 历史月平均资料",
        "processedAt": datetime.now(timezone.utc).isoformat(),
        "scenarios": {},
        "method": "保留 NOAA 原格网；逐格转换为 JSON，四舍五入至 0.01；缺测转 null；未生成或补造观测。",
        "limitations": [
            "资料为历史月平均分析/再分析，不是实时观测，也不是教学动画每一步的天气预报。",
            "SST 为 ERSST v5 2° 格网，海平面气压为 NCEP/NCAR Reanalysis 1 2.5° 格网。",
            "距平直接来自 ERSST v5 ssta，基准期为 1971—2000；并非 CPC 使用滑动基准期的 ONI。",
            "三种 ENSO 示例均取 12 月，减少季节差异；单月案例不能代表所有 ENSO 事件或所有区域的固定影响。",
            "气流、洋流、云雨和垂直剖面为教学机制示意，没有把这些动画标为实测流场。",
            "大陆轮廓来自 Natural Earth 1:110m；陆地高程沿用诗境山河 Open-Elevation 2° 格网。",
            "高程范围为 60°S—84°N；没有真实海底地形；陆地高程在展示中可能进行垂直夸张。",
        ],
        "sources": [
            {"name": "NOAA ERSST v5", "url": "https://www.ncei.noaa.gov/products/extended-reconstructed-sst", "doi": "https://doi.org/10.7289/V5T72FNM", "resolution": "2° × 2°", "baseline": "1971—2000"},
            {"name": "NCEP/NCAR Reanalysis 1, NOAA PSL", "url": "https://psl.noaa.gov/data/gridded/data.ncep.reanalysis.html", "resolution": "2.5° × 2.5°", "units": "hPa (source: millibars)"},
            {"name": "Natural Earth", "url": "https://www.naturalearthdata.com/", "license": "Public domain", "copiedFrom": "world-literature-atlas-vue3/public/data/world-countries.geojson"},
            {"name": "Open-Elevation", "url": "https://www.open-elevation.com/", "copiedFrom": "world-literature-atlas-vue3/public/data/world-elevation.json"},
        ],
        "assetDelivery": "教学格网、地形与背景从 /geo-resources-folder/images/ocean-atmosphere/ 加载；水体法线、太阳纹理和 Logo 保留原有 OSS 地址；public 不再保留副本。",
        "runtimeAssetDirectory": "/geo-resources-folder/images/ocean-atmosphere/",
        "assets": {
            "climate-snapshots.json": "https://zdys.szjx.ai-study.net/geo-resources-folder/images/ocean-atmosphere/climate-snapshots.json",
            "world-countries.geojson": "https://zdys.szjx.ai-study.net/geo-resources-folder/images/ocean-atmosphere/world-countries.geojson",
            "world-elevation.json": "https://zdys.szjx.ai-study.net/geo-resources-folder/images/ocean-atmosphere/world-elevation.json",
            "ocean-atmosphere-backdrop.png": "https://zdys.szjx.ai-study.net/geo-resources-folder/images/ocean-atmosphere/ocean-atmosphere-backdrop.png",
            "waternormals.jpg": "https://zdys.szjx.ai-study.net/geo-resources-folder/images/waternormals.jpg",
            "sun.png": "https://zdys.szjx.ai-study.net/geo-resources-folder/images/sun.png",
            "logo.png": "https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png",
        },
        "rawFilesDirectory": "scripts/ocean-atmosphere/source-data",
        "rawFiles": {},
    }
    for scenario, compact_date in SCENARIOS.items():
        date = f"{compact_date[:4]}-{compact_date[4:]}"
        sst, anomaly = read_ersst(source / f"ersst.v5.{compact_date}.nc", date)
        pressure = read_slp(source / f"slp.{compact_date}.ascii", date)
        bundle[scenario] = {"sst": sst, "pressure": pressure, "anomaly": anomaly}
        month_index = (int(compact_date[:4]) - 1948) * 12 + int(compact_date[4:]) - 1
        manifest["scenarios"][scenario] = {
            "date": date,
            "sstUrl": f"{ERSST_URL}ersst.v5.{compact_date}.nc",
            "pressureUrl": f"{SLP_URL}.ascii?slp[{month_index}:1:{month_index}][0:1:72][0:1:143]",
        }
        for name, item in bundle[scenario].items():
            valid = [v for v in item["values"] if v is not None]
            print(scenario, name, item["width"], item["height"], "valid", len(valid), "range", min(valid), max(valid))
    for path in sorted(source.iterdir()):
        if path.is_file():
            manifest["rawFiles"][path.name] = {"bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
    target = root / "climate-snapshots.json"
    target.write_text(json.dumps(bundle, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    (root / "sources.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Saved", target, target.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
