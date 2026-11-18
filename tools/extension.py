"""Extensión de cada unidad para el visor, en dos formas (shell-11, 2026-11-18):

- data/hex.json: celdas hexagonales en Web Mercator (lo que dibuja Leaflet) a cuatro tamaños, para ver de lejos sin fingir
  precisión. Cada celda lleva cuánto de ella cubre la unidad (k = 1..4 → <25 %, <50 %, <75 %, ≥75 %).
  Una celda entra si la unidad cubre ≥ 4 % de ella; cada unidad tiene al menos la celda de su afloramiento mayor.
- data/pol/<id>.json: el contorno de la GDB casi sin generalizar (~40 m, lo que trae geochile-vectores), solo se pide
  al acercarse con la unidad elegida.

Geometría de la celda (pointy-top, coordenadas axiales q, r; s = radio en metros Mercator):
  x = s·√3·(q + r/2),  y = 1,5·s·r  (y hacia el norte, como L.Projection.SphericalMercator).
"""
import json
import math
import os

import numpy as np
import shapely
from shapely.geometry import MultiPolygon, Polygon
from shapely.ops import unary_union

R = 6378137.0
NIVELES = [2000, 5000, 12000, 30000]   # radio de la celda en m Mercator; app.js elige uno según el zoom
F_MIN = 0.04
TOL_DET = 0.0002                       # ~20 m: solo bota vértices redundantes (la fuente ya viene a ~40 m)
S3 = math.sqrt(3)


def merc(geom):
    def f(c):
        x = np.radians(c[:, 0]) * R
        y = np.log(np.tan(np.pi / 4 + np.radians(np.clip(c[:, 1], -85, 85)) / 2)) * R
        return np.column_stack([x, y])
    return shapely.transform(geom, f)


def hexagonos(qs, rs, s):
    cx, cy = s * S3 * (qs + rs / 2), 1.5 * s * rs
    ang = np.radians(np.arange(6) * 60 + 30)
    xs = cx[:, None] + s * np.cos(ang)[None, :]
    ys = cy[:, None] + s * np.sin(ang)[None, :]
    return shapely.polygons(np.stack([xs, ys], axis=-1))


def celda_de(x, y, s):
    """Celda axial que contiene el punto (redondeo cúbico)."""
    q, r = (S3 / 3 * x - y / 3) / s, (2 / 3 * y) / s
    cx, cz = q, r
    cy = -cx - cz
    rx, ry, rz = round(cx), round(cy), round(cz)
    dx, dy, dz = abs(rx - cx), abs(ry - cy), abs(rz - cz)
    if dx > dy and dx > dz:
        rx = -ry - rz
    elif dy <= dz:
        rz = -rx - ry
    return int(rx), int(rz)


def celdas(gm, s):
    """gm: geometría en Mercator. Devuelve [q, r, k, q, r, k, …] ordenado."""
    x0, y0, x1, y1 = gm.bounds
    r0, r1 = math.floor(y0 / (1.5 * s)) - 1, math.ceil(y1 / (1.5 * s)) + 1
    qs, rs = [], []
    for r in range(r0, r1 + 1):
        q0 = math.floor(x0 / (s * S3) - r / 2) - 1
        q1 = math.ceil(x1 / (s * S3) - r / 2) + 1
        qs.extend(range(q0, q1 + 1))
        rs.extend([r] * (q1 - q0 + 1))
    qs, rs = np.array(qs), np.array(rs)
    hx = hexagonos(qs, rs, s)
    shapely.prepare(gm)
    toca = shapely.intersects(hx, gm)
    qs, rs, hx = qs[toca], rs[toca], hx[toca]
    area_h = 1.5 * S3 * s * s
    f = shapely.area(shapely.intersection(hx, gm)) / area_h
    salida = {}
    for q, r, fr in zip(qs.tolist(), rs.tolist(), f.tolist()):
        if fr >= F_MIN:
            salida[(q, r)] = 1 + min(3, int(fr / 0.25))
    if not salida:  # unidad chica: la celda de su afloramiento mayor
        partes = list(gm.geoms) if hasattr(gm, "geoms") else [gm]
        p = max(partes, key=lambda x: x.area).representative_point()
        salida[celda_de(p.x, p.y, s)] = 1
    plano = []
    for (q, r), k in sorted(salida.items(), key=lambda t: (t[0][1], t[0][0])):
        plano += [q, r, k]
    return plano


def detalle(geoms):
    g = unary_union(geoms).simplify(TOL_DET, preserve_topology=True)
    partes = [g] if isinstance(g, Polygon) else [x for x in getattr(g, "geoms", []) if isinstance(x, Polygon)]
    return [[[[round(x, 5), round(y, 5)] for x, y in r.coords] for r in [p.exterior, *p.interiors]] for p in partes if not p.is_empty]


def armar(geoms_por_unidad, raiz):
    """geoms_por_unidad: {id: [Polygon lon/lat]}. Escribe data/hex.json y data/pol/<id>.json."""
    carpeta = os.path.join(raiz, "data", "pol")
    os.makedirs(carpeta, exist_ok=True)
    for f in os.listdir(carpeta):
        if f.endswith(".json") and f[:-5] not in geoms_por_unidad:
            os.remove(os.path.join(carpeta, f))
    HEX = {"s": NIVELES, "u": {}}
    tam = 0
    for uid, geoms in geoms_por_unidad.items():
        det = detalle(geoms)
        ruta = os.path.join(carpeta, uid + ".json")
        json.dump(det, open(ruta, "w", encoding="utf-8"), separators=(",", ":"))
        tam += os.path.getsize(ruta)
        gm = merc(MultiPolygon([Polygon(a[0], a[1:]) for a in det]).buffer(0)).simplify(50)
        HEX["u"][uid] = [celdas(gm, s) for s in NIVELES]
    ruta = os.path.join(raiz, "data", "hex.json")
    json.dump(HEX, open(ruta, "w", encoding="utf-8"), separators=(",", ":"))
    n = [sum(len(v[i]) // 3 for v in HEX["u"].values()) for i in range(len(NIVELES))]
    print(f"hex.json {os.path.getsize(ruta) / 1e6:.2f} MB, celdas por nivel {dict(zip(NIVELES, n))} | "
          f"pol/ {len(geoms_por_unidad)} archivos, {tam / 1e6:.1f} MB en total")
