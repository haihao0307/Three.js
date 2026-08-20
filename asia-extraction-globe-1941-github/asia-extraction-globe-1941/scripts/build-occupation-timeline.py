"""Build a single-channel occupation atlas for the 1941–45 timeline.

Pixel values encode the first timeline step at which a territory or locality
should become visible. The browser shader compares the sampled value with one
uniform, so the whole chronology costs one texture and one draw call.
"""

from pathlib import Path

import shapefile
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "natural-earth-data" / "ne_10m_admin_0_countries.shp"
OUTPUT = ROOT / "public" / "occupation-timeline-4k.png"
WIDTH, HEIGHT = 4096, 2048
STEP_VALUE = 12


def xy(lon: float, lat: float) -> tuple[float, float]:
    return ((lon + 180.0) / 360.0 * WIDTH, (90.0 - lat) / 180.0 * HEIGHT)


def rings(shape):
    stops = list(shape.parts) + [len(shape.points)]
    for start, stop in zip(stops, stops[1:]):
        ring = shape.points[start:stop]
        if len(ring) > 2:
            yield ring


# Timeline indices match TIMELINE_POINTS in app/page.tsx.
# Step 0 records territories already under Japanese rule before July 1941.
COUNTRY_STEP = {
    "PLW": 0,
    "MHL": 0,
    "FSM": 0,
    "MNP": 0,
    "VNM": 1,
    "LAO": 1,
    "KHM": 1,
    "GUM": 3,
    "HKG": 4,
    "MYS": 8,
    "SGP": 8,
    "BRN": 8,
    "IDN": 10,
    "PHL": 12,
    "MMR": 13,
}

reader = shapefile.Reader(str(SOURCE))
fields = [field[0] for field in reader.fields[1:]]
iso_index = fields.index("ADM0_A3")
atlas = Image.new("L", (WIDTH, HEIGHT), 0)
draw = ImageDraw.Draw(atlas)

for shape_record in reader.iterShapeRecords():
    iso = shape_record.record[iso_index]
    step = COUNTRY_STEP.get(iso)
    if step is None:
        continue
    value = (step + 1) * STEP_VALUE
    for ring in rings(shape_record.shape):
        draw.polygon([xy(lon, lat) for lon, lat in ring], fill=value)


def mark_locality(lon: float, lat: float, step: int, radius: int = 8) -> None:
    x, y = xy(lon, lat)
    value = (step + 1) * STEP_VALUE
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=value)


def mark_polygon(points: list[tuple[float, float]], step: int) -> None:
    value = (step + 1) * STEP_VALUE
    draw.polygon([xy(lon, lat) for lon, lat in points], fill=value)


# Natural Earth cannot keep the smallest islands legible at globe distance.
for lon, lat in [(134.58, 7.52), (145.75, 15.18), (151.84, 7.45), (158.18, 6.92), (167.73, 8.72)]:
    mark_locality(lon, lat, 0, 7)

# Areas occupied before the opening 1941 frame. These are deliberately local
# historical overlays rather than claims that all of China was occupied.
mark_polygon([
    (119.0, 42.1), (117.2, 46.7), (120.3, 50.1), (126.2, 53.3),
    (133.8, 48.2), (131.0, 43.0), (127.4, 41.1), (123.0, 39.8),
], 0)                                       # Manchukuo
mark_locality(116.40, 39.90, 0, 7)         # Peiping
mark_locality(120.38, 36.07, 0, 7)         # Tsingtao
mark_locality(121.47, 31.23, 0, 7)         # Shanghai
mark_locality(110.35, 19.20, 0, 12)        # Hainan, occupied in 1939
for lon, lat in [
    (118.80, 32.06),  # Nanking
    (120.58, 31.30),  # Soochow
    (120.15, 30.27),  # Hangchow
    (117.00, 36.65),  # Tsinan
    (112.55, 37.87),  # Taiyuan
    (117.20, 34.26),  # Hsuchow
    (118.08, 24.48),  # Amoy
    (114.30, 30.59),  # Wuhan
    (113.26, 23.13),  # Canton
    (117.20, 39.08),  # Tientsin
    (114.51, 38.04),  # Shihkiachwang
    (114.30, 34.80),  # Kaifeng
]:
    mark_locality(lon, lat, 0, 7)

mark_locality(144.79, 13.44, 3, 7)       # Guam, 10 Dec 1941
mark_locality(114.17, 22.30, 4, 6)       # Hong Kong, 25 Dec 1941
mark_locality(120.98, 14.60, 5, 8)       # Manila, 2 Jan 1942
mark_locality(101.69, 3.14, 6, 8)        # Kuala Lumpur, 11 Jan 1942
mark_locality(152.18, -4.20, 7, 11)      # Rabaul, 23 Jan 1942
mark_locality(147.00, -6.73, 10, 9)      # Lae, 8 Mar 1942
mark_locality(147.04, -7.04, 10, 8)      # Salamaua, 8 Mar 1942
mark_locality(160.15, -9.10, 11, 8)      # Tulagi, 3 May 1942
mark_locality(160.05, -9.45, 11, 7)      # Northern Guadalcanal military zone
mark_locality(113.62, 34.75, 17, 8)      # Chengchow, 1944 ICHIGO
mark_locality(112.45, 34.62, 17, 8)      # Loyang, 1944 ICHIGO
mark_locality(112.94, 28.23, 17, 8)      # Changsha, 1944 ICHIGO
mark_locality(112.57, 26.89, 17, 8)      # Hengyang, 8 Aug 1944
mark_locality(110.29, 25.27, 19, 8)      # Kweilin, 10 Nov 1944
mark_locality(109.42, 24.33, 19, 8)      # Liuchow, 10 Nov 1944
mark_locality(108.32, 22.82, 19, 8)      # Nanning, 24 Nov 1944

# A one-pixel expansion keeps archipelagos readable without changing borders.
atlas = atlas.filter(ImageFilter.MaxFilter(3))
atlas.save(OUTPUT, optimize=True)
print(OUTPUT)
