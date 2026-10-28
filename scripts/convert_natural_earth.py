#!/usr/bin/env python3
"""
Convert Natural Earth ne_10m_admin_0_countries shapefile to optimized GeoJSON.
Preserves country boundaries, names, ISO codes, and continent/region metadata.
Reduces vertex redundancy for 60 FPS Three.js WebGL globe rendering.
"""

import os
import sys
import json
import math
import shapefile

def perpendicular_distance(pt, line_start, line_end):
    dx = line_end[0] - line_start[0]
    dy = line_end[1] - line_start[1]
    mag = math.hypot(dx, dy)
    if mag == 0:
        return math.hypot(pt[0] - line_start[0], pt[1] - line_start[1])
    u = ((pt[0] - line_start[0]) * dx + (pt[1] - line_start[1]) * dy) / (mag * mag)
    u = max(0.0, min(1.0, u))
    ix = line_start[0] + u * dx
    iy = line_start[1] + u * dy
    return math.hypot(pt[0] - ix, pt[1] - iy)

def simplify_points(pts, tol=0.035):
    if len(pts) <= 2:
        return pts
    dmax = 0.0
    index = 0
    for i in range(1, len(pts) - 1):
        d = perpendicular_distance(pts[i], pts[0], pts[-1])
        if d > dmax:
            index = i
            dmax = d
    if dmax > tol:
        rec1 = simplify_points(pts[:index+1], tol)
        rec2 = simplify_points(pts[index:], tol)
        return rec1[:-1] + rec2
    else:
        return [pts[0], pts[-1]]

def process_ring(ring, tol=0.035):
    if len(ring) < 3:
        return ring
    is_closed = (ring[0][0] == ring[-1][0] and ring[0][1] == ring[-1][1])
    simplified = simplify_points(ring, tol)
    if is_closed and len(simplified) < 4:
        simplified = ring
    if is_closed and (simplified[0][0] != simplified[-1][0] or simplified[0][1] != simplified[-1][1]):
        simplified.append(simplified[0])
    return [[round(p[0], 3), round(p[1], 3)] for p in simplified]

def convert():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    shp_path = os.path.join(base_dir, 'data', 'natural-earth', 'ne_10m_admin_0_countries', 'ne_10m_admin_0_countries.shp')

    if not os.path.exists(shp_path):
        print(f"Error: Shapefile not found at {shp_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Reading shapefile: {shp_path}...")
    sf = shapefile.Reader(shp_path)
    total_shapes = len(sf)
    print(f"Loaded {total_shapes} country shapes.")

    fields_to_keep = [
        'NAME', 'NAME_LONG', 'SOVEREIGNT', 'SOV_A3', 'ADM0_A3',
        'ISO_A2', 'ISO_A3', 'CONTINENT', 'SUBREGION', 'REGION_UN',
        'POP_EST', 'GDP_MD', 'ECONOMY', 'INCOME_GRP'
    ]

    features = []
    total_points_before = 0
    total_points_after = 0

    for i, sr in enumerate(sf.shapeRecords()):
        rec = sr.record.as_dict()
        props = {}
        for k in fields_to_keep:
            val = rec.get(k)
            if val is not None:
                if isinstance(val, (int, float, str)):
                    props[k] = val

        # Add normalized country coordinates and primary code
        iso2 = rec.get('ISO_A2')
        adm0 = rec.get('ADM0_A3')
        iso3 = rec.get('ISO_A3')
        props['code'] = iso2 if (iso2 and iso2 != '-99') else (adm0 if adm0 else iso3)
        if rec.get('LABEL_Y') is not None and rec.get('LABEL_X') is not None:
            props['lat'] = round(float(rec['LABEL_Y']), 3)
            props['lon'] = round(float(rec['LABEL_X']), 3)

        geom = sr.shape.__geo_interface__
        gtype = geom['type']
        coords = geom['coordinates']

        if gtype == 'Polygon':
            new_coords = []
            for r in coords:
                total_points_before += len(r)
                pr = process_ring(r)
                total_points_after += len(pr)
                if len(pr) >= 3:
                    new_coords.append(pr)
        elif gtype == 'MultiPolygon':
            new_coords = []
            for poly in coords:
                new_poly = []
                for r in poly:
                    total_points_before += len(r)
                    pr = process_ring(r)
                    total_points_after += len(pr)
                    if len(pr) >= 3:
                        new_poly.append(pr)
                if new_poly:
                    new_coords.append(new_poly)
        else:
            new_coords = coords

        features.append({
            'type': 'Feature',
            'properties': props,
            'geometry': {
                'type': gtype,
                'coordinates': new_coords
            }
        })

    geojson = {
        'type': 'FeatureCollection',
        'name': 'ne_10m_admin_0_countries',
        'crs': {
            'type': 'name',
            'properties': { 'name': 'urn:ogc:def:crs:OGC:1.3:CRS84' }
        },
        'metadata': {
            'source': 'Natural Earth Admin 0 - Countries',
            'scale': '1:10m',
            'version': '5.1.1',
            'totalFeatures': len(features),
            'optimizedForWebGL': True
        },
        'features': features
    }

    # Outputs
    public_data_dir = os.path.join(base_dir, 'public', 'data')
    os.makedirs(public_data_dir, exist_ok=True)
    out_geojson = os.path.join(public_data_dir, 'countries.geojson')
    out_json = os.path.join(public_data_dir, 'countries.json')

    geojson_str = json.dumps(geojson, separators=(',', ':'))
    with open(out_geojson, 'w', encoding='utf-8') as f:
        f.write(geojson_str)

    with open(out_json, 'w', encoding='utf-8') as f:
        f.write(geojson_str)

    # Also save in data/natural-earth/
    ne_out = os.path.join(base_dir, 'data', 'natural-earth', 'ne_10m_admin_0_countries.geojson')
    with open(ne_out, 'w', encoding='utf-8') as f:
        f.write(geojson_str)

    size_mb = len(geojson_str) / (1024 * 1024)
    print(f"Vertex reduction: {total_points_before:,} -> {total_points_after:,} points ({(1 - total_points_after/total_points_before)*100:.1f}% reduction)")
    print(f"Saved optimized GeoJSON: {out_geojson} ({size_mb:.2f} MB)")
    print(f"Saved alias JSON: {out_json} ({size_mb:.2f} MB)")
    print(f"Saved local copy: {ne_out} ({size_mb:.2f} MB)")

if __name__ == '__main__':
    convert()
