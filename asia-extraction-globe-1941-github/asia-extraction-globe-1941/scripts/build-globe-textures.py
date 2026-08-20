import json
import math
from pathlib import Path

import shapefile
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "natural-earth-data" / "ne_10m_admin_0_countries.shp"
OUT = ROOT / "public"
WIDTH, HEIGHT = 4096, 2048


def xy(lon, lat):
    return ((lon + 180.0) / 360.0 * WIDTH, (90.0 - lat) / 180.0 * HEIGHT)


def parts(shape):
    stops = list(shape.parts) + [len(shape.points)]
    for start, stop in zip(stops, stops[1:]):
        ring = shape.points[start:stop]
        if len(ring) > 2:
            yield ring


reader = shapefile.Reader(str(SOURCE))
fields = [field[0] for field in reader.fields[1:]]
index = {name: fields.index(name) for name in fields}

border = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
border_draw = ImageDraw.Draw(border)
control_mask = Image.new("L", (WIDTH, HEIGHT), 0)
control_draw = ImageDraw.Draw(control_mask)

for shape_record in reader.iterShapeRecords():
    record = shape_record.record
    iso = record[index["ADM0_A3"]]
    for ring in parts(shape_record.shape):
        points = [xy(lon, lat) for lon, lat in ring]
        border_draw.line(points + [points[0]], fill=(226, 217, 184, 168), width=1, joint="curve")
        if iso in {"JPN", "KOR", "PRK", "TWN"}:
            control_draw.polygon(points, fill=255)

# Treat New Guinea as one geographic island in the display. Natural Earth draws
# today's Indonesia–Papua New Guinea boundary close to 141°E; erase only its
# inland portion while retaining the island's coastline.
border_draw.line([xy(141.0, -8.85), xy(141.0, -2.75)], fill=(0, 0, 0, 0), width=8)

border.save(OUT / "country-borders-4k.png", optimize=True)

glow = control_mask.filter(ImageFilter.GaussianBlur(20))
core = control_mask.filter(ImageFilter.GaussianBlur(1.3))
red = Image.new("RGBA", (WIDTH, HEIGHT), (105, 0, 5, 0))
red.putalpha(glow.point(lambda value: int(value * 0.48)))
red_rgb = Image.new("RGBA", (WIDTH, HEIGHT), (96, 4, 8, 0))
red_rgb.putalpha(core.point(lambda value: int(value * 0.8)))
red = Image.alpha_composite(red, red_rgb)
red.save(OUT / "imperial-control-4k.png", optimize=True)

contract = {
    "asset": {
        "name": "High-resolution Asia-Pacific globe",
        "role": "hero",
        "sourceMethod": "procedural",
        "provenance": [
            "NASA Blue Marble Next Generation 5400x2700 earth texture",
            "Natural Earth 1:10m Admin-0 Countries v5.1.1",
        ],
        "licenseNotes": "NASA imagery and Natural Earth public map data; overlays are project-authored.",
    },
    "visual": {
        "approvedReferences": ["1935日滿中國original_full.jpg", "1941少年俱樂部大東亞地圖.jpg"],
        "closestCameraMeters": 1.26,
        "maximumScreenCoveragePercent": 96,
        "silhouetteCriticalViews": ["East Asia", "Western Pacific", "South China Sea"],
        "artDirectionNotes": "1930年代復古航空畫報：楷體、舊紙、雙色套印、網點與航圖圖例；藍色海運依參考圖形成港口匯聚的連續貼海弧形，紅色高弧連接佔領城市與日本、黃色高弧由日本出發。1943—1945航線隨潛艇戰、特魯克空襲與飢餓行動逐步稀疏、斷裂、熄滅。",
    },
    "runtime": {
        "renderer": "Three.js",
        "targetDevices": ["desktop WebGL2", "mobile WebGL2"],
        "weakestTestDevice": "integrated mobile GPU",
        "animation": True,
        "physics": False,
        "requiredNodeNames": ["earth", "countryBoundaries", "imperialControl", "occupationTimeline", "historicalPorts", "shippingLayers"],
        "requiredExtensions": [],
    },
    "budgets": {
        "downloadMiB": 9,
        "decodedTextureMiB": 128,
        "triangles": 49152,
        "primitives": 10,
        "materials": 10,
        "drawCalls": 12,
        "bones": 0,
        "frameTimeMs": 10,
    },
    "variants": [
        {"name": "desktop", "trigger": "devicePixelRatio and width", "texturePolicy": "5.4K earth + 4K overlays", "geometryPolicy": "128x96 globe"},
        {"name": "mobile", "trigger": "renderer pixel ratio capped", "texturePolicy": "same compressed source with mipmaps", "geometryPolicy": "96x64 globe"},
    ],
    "acceptanceEvidence": {
        "lockedCameraComparisons": [],
        "neutralLightingCapture": "",
        "targetDeviceCapture": "",
        "validatorReport": "npm test",
        "glbAuditReport": "not applicable: procedural sphere",
    },
}
(ROOT / "asset-contract.globe.json").write_text(json.dumps(contract, ensure_ascii=False, indent=2), encoding="utf-8")
