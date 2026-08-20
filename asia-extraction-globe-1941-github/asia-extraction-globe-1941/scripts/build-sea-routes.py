"""Build ocean-only shipping polylines from the authored historical anchors.

The authored anchors keep the historical port/strait intent readable in the
TypeScript source. This script snaps those anchors to water and inserts the
minimum additional turns needed to keep every rendered great-circle segment
off Natural Earth land polygons.
"""

from __future__ import annotations

import ast
import heapq
import json
import math
import re
from functools import lru_cache
from pathlib import Path

import shapefile
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "app" / "components" / "ExtractionGlobe.tsx"
SHAPEFILE = ROOT / "natural-earth-data" / "ne_10m_admin_0_countries.shp"
OUTPUT = ROOT / "app" / "data" / "shipping-routes.generated.json"
WIDTH, HEIGHT = 7200, 3600


def parse_record(source: str, name: str) -> dict[str, list[float]]:
    block = re.search(
        rf"const {name}: Record<string, \[number, number\]> = \{{(.*?)\n\}};",
        source,
        re.S,
    )
    if not block:
        raise RuntimeError(f"Could not find {name}")
    return {
        key: ast.literal_eval(value)
        for key, value in re.findall(r"(\w+):\s*(\[[^\]]+\])", block.group(1))
    }


def parse_lanes(source: str) -> list[dict]:
    ports = parse_record(source, "PORTS")
    hubs = parse_record(source, "HUBS")
    block = re.search(
        r"const SHIPPING_LANE_ANCHORS: ShippingLane\[\] = \[(.*?)\n\];",
        source,
        re.S,
    )
    if not block:
        raise RuntimeError("Could not find SHIPPING_LANE_ANCHORS")

    lanes = []
    for line in block.group(1).splitlines():
        if "path:" not in line:
            continue
        path_match = re.search(r"path:\s*(\[.*\])\s*\}", line)
        flow_match = re.search(r'flow:\s*"(inbound|outbound)"', line)
        if not path_match or not flow_match:
            raise RuntimeError(f"Could not parse lane: {line}")
        expression = re.sub(
            r"PORTS\.(\w+)", lambda match: repr(ports[match.group(1)]), path_match.group(1)
        )
        expression = re.sub(
            r"HUBS\.(\w+)", lambda match: repr(hubs[match.group(1)]), expression
        )
        lane = {
            "flow": flow_match.group(1),
            "path": ast.literal_eval(expression),
        }
        weight = re.search(r"weight:\s*([0-9.]+)", line)
        if weight:
            lane["weight"] = float(weight.group(1))
        if re.search(r"projected:\s*true", line):
            lane["projected"] = True
        lanes.append(lane)
    return lanes


def build_land_mask() -> Image.Image:
    mask = Image.new("1", (WIDTH, HEIGHT), 0)
    draw = ImageDraw.Draw(mask)
    reader = shapefile.Reader(str(SHAPEFILE))
    for shape in reader.shapes():
        stops = list(shape.parts) + [len(shape.points)]
        for start, stop in zip(stops, stops[1:]):
            ring = [
                (
                    (lon + 180.0) / 360.0 * (WIDTH - 1),
                    (90.0 - lat) / 180.0 * (HEIGHT - 1),
                )
                for lon, lat in shape.points[start:stop]
            ]
            if len(ring) > 2:
                draw.polygon(ring, fill=1)
    return mask


def pixel_to_latlon(point: tuple[int, int]) -> list[float]:
    x, y = point
    return [
        round(90.0 - (y + 0.5) / HEIGHT * 180.0, 4),
        round((x + 0.5) / WIDTH * 360.0 - 180.0, 4),
    ]


def latlon_to_pixel(point: list[float]) -> tuple[int, int]:
    lat, lon = point
    return (
        int(round((lon + 180.0) / 360.0 * (WIDTH - 1))) % WIDTH,
        max(0, min(HEIGHT - 1, int(round((90.0 - lat) / 180.0 * (HEIGHT - 1))))),
    )


def great_circle_points(a: tuple[int, int], b: tuple[int, int]) -> list[tuple[int, int]]:
    a_lat, a_lon = pixel_to_latlon(a)
    b_lat, b_lon = pixel_to_latlon(b)

    def xyz(lat: float, lon: float) -> tuple[float, float, float]:
        phi, theta = math.radians(lat), math.radians(lon)
        return (
            math.cos(phi) * math.cos(theta),
            math.sin(phi),
            math.cos(phi) * math.sin(theta),
        )

    u, v = xyz(a_lat, a_lon), xyz(b_lat, b_lon)
    dot = max(-1.0, min(1.0, sum(left * right for left, right in zip(u, v))))
    omega = math.acos(dot)
    sample_count = max(8, int(omega * 180.0 / math.pi * 18.0))
    if omega < 1e-8:
        return [a, b]
    sin_omega = math.sin(omega)
    points = []
    for index in range(sample_count + 1):
        t = index / sample_count
        vector = tuple(
            math.sin((1.0 - t) * omega) / sin_omega * left
            + math.sin(t * omega) / sin_omega * right
            for left, right in zip(u, v)
        )
        norm = math.sqrt(sum(value * value for value in vector))
        x, y, z = (value / norm for value in vector)
        points.append(
            latlon_to_pixel(
                [math.degrees(math.asin(y)), math.degrees(math.atan2(z, x))]
            )
        )
    return points


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    lanes = parse_lanes(source)
    land = build_land_mask()

    def is_land(point: tuple[int, int]) -> bool:
        return bool(land.getpixel(point))

    @lru_cache(maxsize=None)
    def snap_to_water(point: tuple[int, int]) -> tuple[int, int]:
        if not is_land(point):
            return point
        x, y = point
        for radius in range(1, 40):
            candidates = []
            for offset in range(-radius, radius + 1):
                candidates.extend(
                    [
                        ((x + offset) % WIDTH, max(0, y - radius)),
                        ((x + offset) % WIDTH, min(HEIGHT - 1, y + radius)),
                        ((x - radius) % WIDTH, max(0, min(HEIGHT - 1, y + offset))),
                        ((x + radius) % WIDTH, max(0, min(HEIGHT - 1, y + offset))),
                    ]
                )
            water = [candidate for candidate in candidates if not is_land(candidate)]
            if water:
                return min(
                    water,
                    key=lambda candidate: (candidate[0] - x) ** 2 + (candidate[1] - y) ** 2,
                )
        raise RuntimeError(f"No water near {point}")

    @lru_cache(maxsize=None)
    def clear_line(a: tuple[int, int], b: tuple[int, int]) -> bool:
        return all(not is_land(point) for point in great_circle_points(a, b))

    @lru_cache(maxsize=None)
    def clear_smooth_curve(
        previous: tuple[int, int],
        start: tuple[int, int],
        end: tuple[int, int],
        following: tuple[int, int],
    ) -> bool:
        """Mirror the renderer's Catmull-style sea controls and test the curve."""

        previous_ll = pixel_to_latlon(previous)
        start_ll = pixel_to_latlon(start)
        end_ll = pixel_to_latlon(end)
        following_ll = pixel_to_latlon(following)
        tension = 0.08
        control1_ll = [
            start_ll[0] + (end_ll[0] - previous_ll[0]) * tension,
            start_ll[1] + (end_ll[1] - previous_ll[1]) * tension,
        ]
        control2_ll = [
            end_ll[0] - (following_ll[0] - start_ll[0]) * tension,
            end_ll[1] - (following_ll[1] - start_ll[1]) * tension,
        ]

        def vector(point: list[float]) -> tuple[float, float, float]:
            lat, lon = map(math.radians, point)
            return (
                math.cos(lat) * math.cos(-lon),
                math.sin(lat),
                math.cos(lat) * math.sin(-lon),
            )

        p0, p1 = vector(start_ll), vector(control1_ll)
        p2, p3 = vector(control2_ll), vector(end_ll)
        sample_count = max(24, min(256, len(great_circle_points(start, end)) * 2))
        for index in range(sample_count + 1):
            t = index / sample_count
            u = 1.0 - t
            x, y, z = (
                u * u * u * p0[axis]
                + 3.0 * u * u * t * p1[axis]
                + 3.0 * u * t * t * p2[axis]
                + t * t * t * p3[axis]
                for axis in range(3)
            )
            norm = math.sqrt(x * x + y * y + z * z)
            lat = math.degrees(math.asin(y / norm))
            lon = -math.degrees(math.atan2(z, x))
            if is_land(latlon_to_pixel([lat, lon])):
                return False
        return True

    @lru_cache(maxsize=None)
    def route_segment(a: tuple[int, int], b: tuple[int, int]) -> tuple[tuple[int, int], ...]:
        start, goal = snap_to_water(a), snap_to_water(b)
        if clear_line(start, goal):
            return (start, goal)

        queue: list[tuple[float, float, tuple[int, int]]] = [(0.0, 0.0, start)]
        came_from: dict[tuple[int, int], tuple[int, int]] = {}
        best_cost = {start: 0.0}
        directions = (
            (-1, -1, math.sqrt(2.0)),
            (0, -1, 1.0),
            (1, -1, math.sqrt(2.0)),
            (-1, 0, 1.0),
            (1, 0, 1.0),
            (-1, 1, math.sqrt(2.0)),
            (0, 1, 1.0),
            (1, 1, math.sqrt(2.0)),
        )
        explored = 0
        while queue:
            _, cost, current = heapq.heappop(queue)
            if cost != best_cost.get(current):
                continue
            if current == goal:
                break
            explored += 1
            if explored > 500_000:
                raise RuntimeError(f"Ocean route search exhausted: {start} -> {goal}")
            x, y = current
            latitude = 90.0 - y / HEIGHT * 180.0
            longitude_scale = max(0.35, math.cos(math.radians(latitude)))
            for dx, dy, base_step in directions:
                neighbor = ((x + dx) % WIDTH, y + dy)
                if neighbor[1] < 0 or neighbor[1] >= HEIGHT or is_land(neighbor):
                    continue
                if dx and dy and (
                    is_land(((x + dx) % WIDTH, y)) or is_land((x, y + dy))
                ):
                    continue
                step_cost = base_step * (longitude_scale if dx and not dy else 1.0)
                next_cost = cost + step_cost
                if next_cost >= best_cost.get(neighbor, math.inf):
                    continue
                best_cost[neighbor] = next_cost
                came_from[neighbor] = current
                delta_x = abs(neighbor[0] - goal[0])
                delta_x = min(delta_x, WIDTH - delta_x)
                delta_y = abs(neighbor[1] - goal[1])
                heuristic = math.hypot(delta_x * longitude_scale, delta_y)
                heapq.heappush(queue, (next_cost + heuristic, next_cost, neighbor))
        else:
            raise RuntimeError(f"No ocean route: {start} -> {goal}")

        path = [goal]
        while path[-1] != start:
            path.append(came_from[path[-1]])
        path.reverse()

        simplified = [path[0]]
        cursor = 0
        while cursor < len(path) - 1:
            candidate = len(path) - 1
            while candidate > cursor + 1 and not clear_line(path[cursor], path[candidate]):
                candidate -= 1
            simplified.append(path[candidate])
            cursor = candidate
        return tuple(simplified)

    output = []
    for lane_index, lane in enumerate(lanes):
        anchors = [snap_to_water(latlon_to_pixel(point)) for point in lane["path"]]
        routed: list[tuple[int, int]] = []
        for segment_index, (start, end) in enumerate(zip(anchors, anchors[1:])):
            try:
                segment = list(route_segment(start, end))
            except RuntimeError as error:
                raise RuntimeError(
                    f"Lane {lane_index}, segment {segment_index}: {error}"
                ) from error
            if routed:
                segment = segment[1:]
            routed.extend(segment)
        built_lane = {key: value for key, value in lane.items() if key != "path"}
        built_lane["path"] = [pixel_to_latlon(point) for point in routed]
        built_lane["smooth"] = [
            clear_smooth_curve(
                routed[max(0, index - 1)],
                routed[index],
                routed[index + 1],
                routed[min(len(routed) - 1, index + 2)],
            )
            for index in range(len(routed) - 1)
        ]
        output.append(built_lane)

    violations = []
    for lane_index, lane in enumerate(output):
        pixels = [latlon_to_pixel(point) for point in lane["path"]]
        for segment_index, (start, end) in enumerate(zip(pixels, pixels[1:])):
            if not clear_line(start, end):
                violations.append((lane_index, segment_index, start, end))
    if violations:
        raise RuntimeError(f"Generated routes still cross land: {violations[:10]}")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    segment_count = sum(len(lane["path"]) - 1 for lane in output)
    smooth_count = sum(sum(lane["smooth"]) for lane in output)
    print(
        f"Wrote {len(output)} ocean-only lanes / {segment_count} segments "
        f"({smooth_count} safely smoothed) to "
        f"{OUTPUT.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
