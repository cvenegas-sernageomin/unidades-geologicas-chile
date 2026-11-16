"""Baja la toponimia IGM 1:50.000 (secciones A–L) a tools/cache_igm/<sec>.json para buscar por nombre sin red.

Fuente: Instituto Geográfico Militar, https://gis.inv.igm.cl/host/rest/services/Hosted/{A..L}/FeatureServer/0
Reanudable: no vuelve a bajar una sección que ya está completa. Uso: python tools/descargar_igm.py
"""
import json, os, re, sys, time, urllib.parse, urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(AQUI, "cache_igm")
URL = "https://gis.inv.igm.cl/host/rest/services/Hosted/%s/FeatureServer/0/query"
RX_MOJI = re.compile("Ã[\x80-\xBF]")


def arreglar(t):
    """UTF-8 doblemente codificado («MarÃ­a»): solo se corrige si calza con el patrón."""
    if t and RX_MOJI.search(t):
        try:
            return t.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return t
    return t


def pedir(sec, **p):
    p.setdefault("f", "json")
    q = urllib.parse.urlencode(p)
    for intento in range(4):
        try:
            req = urllib.request.Request(URL % sec + "?" + q, headers={"User-Agent": "python-urllib"})
            d = json.load(urllib.request.urlopen(req, timeout=90))
            if "error" in d:
                raise RuntimeError(d["error"])
            return d
        except Exception as e:  # noqa: BLE001
            print("  reintento", sec, intento, e, flush=True)
            time.sleep(3 + 4 * intento)
    raise SystemExit("no se pudo bajar la sección " + sec)


def main():
    os.makedirs(CACHE, exist_ok=True)
    for sec in "ABCDEFGHIJKL":
        fn = os.path.join(CACHE, sec + ".json")
        total = pedir(sec, where="1=1", returnCountOnly="true")["count"]
        if os.path.exists(fn) and len(json.load(open(fn, encoding="utf-8"))) >= total:
            print(sec, "ya está", total)
            continue
        filas, off = [], 0
        while off < total:
            d = pedir(sec, where="1=1", outFields="texto", outSR=4326, returnGeometry="true",
                      orderByFields="fid", resultOffset=off, resultRecordCount=2000)
            fs = d.get("features", [])
            if not fs:
                break
            for f in fs:
                g, t = f.get("geometry"), arreglar((f["attributes"].get("texto") or "").strip())
                if g and t:
                    filas.append([t, round(g["x"], 5), round(g["y"], 5)])
            off += len(fs)
            print(sec, off, "/", total, flush=True)
        json.dump(filas, open(fn, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("listo")


if __name__ == "__main__":
    sys.exit(main())
