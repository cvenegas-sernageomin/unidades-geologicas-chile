"""Georreferencia la localidad tipo de cada unidad -> data/localidades_tipo.json (clave: nombre de la unidad).

Entrada: data/unidades.json (texto «loc», cartas, de armar_datos.py), data/cartas.json (marcos), data/poligonos.json
(solo para VALIDAR, nunca para elegir), tools/cache_igm/*.json (toponimia IGM 1:50.000, descargar_igm.py),
data/yacimientos.json (minas y prospectos), ../geolente-repo/data/{cumbres,localidades}.json (GeoNames) y
tools/loc_manual.json (resueltas a mano, mandan).

Cascada: 1) a mano  2) coordenadas explícitas en el texto (lat/lon o UTM)  3) topónimo del texto buscado dentro
del marco de las cartas que describen la unidad (IGM -> yacimientos -> GeoNames), con desplazamiento «N km al SE de».
Salida extra (raíz del proyecto): localidades_tipo_resumen.txt y localidades_por_revisar.csv.

Uso: python tools/geocodificar_localidades.py
"""
import collections, csv, glob, json, math, os, re, sys, unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
PROY = os.path.dirname(RAIZ)
MARGEN = 0.25       # grados que se agranda el marco de la carta al buscar
LEJOS_KM = 15       # más lejos que esto del afloramiento GDB -> a revisión


def nrm(s):
    s = "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9ñ ]", " ", s.lower().replace("ñ", "ñ"))).strip()


def km(a, b):
    (x1, y1), (x2, y2) = a, b
    return math.hypot((x1 - x2) * 111.32 * math.cos(math.radians((y1 + y2) / 2)), (y1 - y2) * 110.57)


# ------------------------------------------------------------------ gazetteers
# término genérico -> forma canónica (para comparar «Qda. X» con «Quebrada X»)
GENERICOS = {
    "quebrada": "quebrada", "qda": "quebrada", "quebradas": "quebrada", "cerro": "cerro", "cerros": "cerro", "co": "cerro",
    "cos": "cerro", "rio": "rio", "rios": "rio", "sierra": "sierra", "sierras": "sierra", "salar": "salar", "cordon": "cordon",
    "cordillera": "cordillera", "estero": "estero", "laguna": "laguna", "lagunas": "laguna", "lago": "lago", "volcan": "volcan",
    "mina": "mina", "minas": "mina", "portezuelo": "portezuelo", "pampa": "pampa", "punta": "punta", "caleta": "caleta",
    "bahia": "bahia", "isla": "isla", "islas": "isla", "peninsula": "peninsula", "aguada": "aguada", "loma": "loma",
    "lomas": "loma", "morro": "morro", "valle": "valle", "llano": "llano", "llanos": "llano", "cuesta": "cuesta",
    "nevado": "nevado", "nevados": "nevado", "paso": "paso", "puerto": "puerto", "playa": "playa", "cajon": "cajon",
    "termas": "termas", "banos": "banos", "fiordo": "fiordo", "canal": "canal", "seno": "seno", "estancia": "estancia",
    "hacienda": "hacienda", "fundo": "fundo", "estacion": "estacion", "oficina": "oficina", "prospecto": "mina",
    "yacimiento": "mina", "distrito": "mina", "mineral": "mina", "alto": "alto", "altos": "alto", "cabo": "cabo",
    "monte": "monte", "montes": "monte", "arroyo": "arroyo", "vega": "vega", "vegas": "vega", "ojos": "ojos",
    "campo": "campo", "meseta": "meseta", "planicie": "planicie", "ensenada": "ensenada", "estrecho": "estrecho",
    "golfo": "golfo", "archipielago": "archipielago", "cumbre": "cumbre", "filo": "filo", "puntilla": "punta",
    "rincon": "rincon", "pozo": "pozo", "embalse": "embalse", "tranque": "embalse", "abra": "portezuelo",
    "caldera": "caldera", "domo": "cerro", "pico": "cerro", "macizo": "cerro", "farellones": "farellones",
}
ARTIC = {"de", "del", "la", "las", "los", "el", "y"}
# «Localidad de Guanta», «Entornos de Galvarino»: la palabra de entrada no es parte del nombre
ENTRADA = {"localidad", "localidades", "sector", "pueblo", "poblado", "ciudad", "caserio", "entornos", "inmediaciones",
           "cercanias", "alrededores", "zona", "area", "villorrio", "aldea", "comuna"}
# rasgos largos (decenas de km): un rótulo cualquiera no ubica la localidad tipo
EXTENSOS = {"rio", "valle", "cordillera", "sierra", "cordon", "canal", "fiordo", "seno", "estrecho", "golfo", "pampa",
            "llano", "lago", "salar", "isla", "peninsula", "archipielago", "cajon", "estero", "arroyo"}


def partir(nombre):
    """«Quebrada del Chaco» -> ('quebrada', 'chaco'); «Tierra Amarilla» -> ('', 'tierra amarilla')."""
    pal = nrm(nombre).split()
    gen = ""
    while len(pal) > 1 and (pal[0] in ENTRADA or pal[0] in ARTIC):
        pal = pal[1:]
    if pal and len(pal) > 1 and pal[0] not in GENERICOS and pal[0].endswith("s") and pal[0][:-1] in GENERICOS:
        pal[0] = pal[0][:-1]
    if pal and pal[0] in GENERICOS and len(pal) > 1:
        gen, pal = GENERICOS[pal[0]], pal[1:]
    while pal and pal[0] in ARTIC:
        pal = pal[1:]
    return gen, " ".join(pal)


class Gazetteer:
    def __init__(self):
        self.idx = collections.defaultdict(list)   # nombre propio -> [(gen, x, y, fuente)]
        self.n = collections.Counter()

    def agregar(self, texto, x, y, fuente, gen_forzado=None):
        gen, propio = partir(texto)
        if gen_forzado is not None and not gen:
            gen = gen_forzado
        if len(propio) < 3:
            return
        self.idx[propio].append((gen, x, y, fuente))
        self.n[fuente] += 1

    def buscar(self, gen, propio, caja):
        w, s, e, n = caja
        return [h for h in self.idx.get(propio, []) if w <= h[1] <= e and s <= h[2] <= n]


def cargar_gazetteer():
    G = Gazetteer()
    for fn in sorted(glob.glob(os.path.join(AQUI, "cache_igm", "*.json"))):
        for t, x, y in json.load(open(fn, encoding="utf-8")):
            G.agregar(t, x, y, "IGM")
    yac = os.path.join(RAIZ, "data", "yacimientos.json")
    if os.path.exists(yac):
        for r in json.load(open(yac, encoding="utf-8"))["r"]:
            if r.get("n") and nrm(r["n"]) != "sin nombre":
                G.agregar(r["n"], r["x"], r["y"], "yacimiento", "mina")
    geo = os.path.join(PROY, "geolente-repo", "data")
    if os.path.exists(os.path.join(geo, "cumbres.json")):
        for c in json.load(open(os.path.join(geo, "cumbres.json"), encoding="utf-8"))["c"]:
            G.agregar(c[3], c[0], c[1], "GeoNames")
    if os.path.exists(os.path.join(geo, "localidades.json")):
        for l in json.load(open(os.path.join(geo, "localidades.json"), encoding="utf-8"))["l"]:
            G.agregar(l[0], l[2], l[1], "GeoNames", "poblado")
    return G


# ------------------------------------------------------------------ texto -> candidatos
_GEN = "|".join(sorted({k for k in GENERICOS} | {"quebrada", "río", "cordón", "volcán", "bahía", "península", "cajón",
                                                 "baños", "estación", "rincón", "qda.", "co."}, key=len, reverse=True))
_MAY = r"[A-ZÁÉÍÓÚÑ][\wáéíóúñü'’]+"
_PROPIO = rf"(?:(?:de|del|de la|de los|de las|la|las|los|el)\s+)*{_MAY}(?:\s+(?:(?:de|del|de la|de los|de las|la|los|las|el)\s+)?{_MAY})*"
RX_TOPO = re.compile(rf"\b((?i:{_GEN}))\.?\s+({_PROPIO})")
RX_SUELTO = re.compile(rf"\b((?:(?i:localidad|sector|pueblo|poblado|ciudad|entornos|inmediaciones|cercan[ií]as|alrededores)\s+(?:de|del)\s+(?:la\s+|el\s+|los\s+|las\s+)?)?{_MAY}(?:\s+(?:(?:de|del|la|los|las|el)\s+)?{_MAY}){{0,3}})")
RUMBOS = {"n": 0, "norte": 0, "nne": 22.5, "ne": 45, "noreste": 45, "nororiente": 45, "ene": 67.5, "e": 90, "este": 90,
          "oriente": 90, "ese": 112.5, "se": 135, "sureste": 135, "sudeste": 135, "suroriente": 135, "sse": 157.5, "s": 180,
          "sur": 180, "sso": 202.5, "ssw": 202.5, "so": 225, "sw": 225, "suroeste": 225, "sudoeste": 225, "surponiente": 225,
          "oso": 247.5, "wsw": 247.5, "o": 270, "w": 270, "oeste": 270, "poniente": 270, "ono": 292.5, "wnw": 292.5,
          "no": 315, "nw": 315, "noroeste": 315, "norponiente": 315, "nno": 337.5, "nnw": 337.5}
RX_DESPL = re.compile(r"(\d+(?:[.,]\d+)?)\s*km\s+(?:al|hacia el)\s+([A-Za-z]+)\s+(?:de|del)\b", re.I)
# no son localidad: nombres de la propia unidad, autores, hojas y cartas
RX_NO_LUGAR = re.compile(r"^(CARTA|CORPUS|LIBRO|Vertiente|Margen|Cuenca|Mitad|Extremo|Frontera|Ambos|Norte|Sur|Este|Oeste|Oriente|Poniente|"
                         r"Noreste|Noroeste|Sureste|Suroeste|Costa|Centro|Interior|Curso|Nacientes|Desembocadura|Confluencia|"
                         r"Afloramientos?|Inmediatamente|Aproximadamente|Principalmente|Originalmente|Hoja|Carta|Cuadr[aá]ngulo|Formaci[oó]n|Estratos|Grupo|Complejo|Miembro|Unidad|Secuencia|"
                         r"Chile|Argentina|Bolivia|Per[uú]|Regi[oó]n|No|Sin|Seg[uú]n|Zona|[AÁ]rea|Sector|Al|En|Entre|"
                         r"Flanco|Ladera|Borde|Parte|Franja|Tambi[eé]n|Su|Se|La|El|Los|Las|"
                         r"Definid[ao]|Nombre|Localidad tipo|Secci[oó]n|Perfil|Cordillera de la Costa|Cordillera Principal|"
                         r"Precordillera|Depresi[oó]n|Jur[aá]sico|Cret[aá]cico|Tri[aá]sico|Mioceno|Plioceno|Eoceno|"
                         r"Oligoceno|Paleoceno|Pleistoceno|Holoceno|UTM|TEXTO|CGCH)\b")


def limpiar_texto(t):
    t = re.sub(r"\[[^\]]*\]", " ", t or "")                      # citas [CGCH_GB_76 p20]
    t = re.sub(r"\b[A-ZÁÉÍÓÚÑ][\w\-áéíóúñ]+(?:\s+(?:y|et al\.?|e)\s+[A-Z]?[\wáéíóúñ.]*)*\s*\(\d{4}[a-z]?\)", " ", t)  # Thomas (1970)
    t = re.sub(r"\([^()]*\b(?:19|20)\d{2}[a-z]?\b[^()]*\)", " ", t)   # (Blanco et al., 2003)
    return re.sub(r"\s+", " ", t).strip()


def coordenadas_explicitas(t):
    """(lon, lat) si el texto trae un par lat/lon o UTM (punto medio de la sección)."""
    m = re.search(r"(\d{2})\s*°\s*(\d{1,2})?\s*['′’]?\s*(?:\d{1,2}\s*[\"″”])?\s*S\b[^\d]{0,12}(\d{2})\s*°\s*(\d{1,2})?\s*['′’]?\s*"
                  r"(?:\d{1,2}\s*[\"″”])?\s*[WO]\b", t)
    if m:
        la = -(int(m.group(1)) + int(m.group(2) or 0) / 60)
        lo = -(int(m.group(3)) + int(m.group(4) or 0) / 60)
        if -57 < la < -17 and -76 < lo < -66:
            return lo, la
    n_ = [float(a.replace(".", "")) for a in re.findall(r"\b(\d\.\d{3}\.\d{3})\s*m?\s*N\b", t)]
    e_ = [float(a.replace(".", "")) for a in re.findall(r"\b(\d{3}\.\d{3})\s*m?\s*E\b", t)]
    if n_ and e_ and len(n_) == len(e_):
        from pyproj import Transformer
        tr = Transformer.from_crs("EPSG:32719", "EPSG:4326", always_xy=True)
        lo, la = tr.transform(sum(e_) / len(e_), sum(n_) / len(n_))
        if -57 < la < -17 and -76 < lo < -66:
            return lo, la
    return None


def latitud_citada(t):
    m = re.search(r"(\d{2})\s*°\s*(\d{1,2})?\s*['′’]?\s*(?:lat\.?\s*)?S\b", t)
    return -(int(m.group(1)) + int(m.group(2) or 0) / 60) if m else None


def candidatos(t):
    """Topónimos del texto en orden de aparición: (gen, propio, original, despl) con despl = (km, rumbo°) o None."""
    out, vistos = [], set()
    for m in RX_TOPO.finditer(t):
        gen, propio = partir(m.group(1) + " " + m.group(2))
        if not gen or len(propio) < 3 or (gen, propio) in vistos:
            continue
        vistos.add((gen, propio))
        despl = None
        d = None
        for d in RX_DESPL.finditer(t[max(0, m.start() - 60):m.start() + 4]):
            pass
        if d and nrm(d.group(2)) in RUMBOS:
            despl = (float(d.group(1).replace(",", ".")), RUMBOS[nrm(d.group(2))])
        out.append((gen, propio, m.group(0), despl, m.start()))
    for m in RX_SUELTO.finditer(t):   # nombres propios sin genérico («Tierra Amarilla», «Copiapó»)
        if RX_NO_LUGAR.match(m.group(1)) or re.search(r"(?i)\b(hoja|hojas|carta|cartas|cuadr[aá]ngulos?|leyenda de|regi[oó]n|regiones|provincia|"
                                                         r"comuna|lagos?|r[ií]os?|plut[oó]n|falla|volc[aá]n(?:ico)?|complejo)\s+((de|del|de la|de los|la|los|el)\s+)?$",
                                                         t[max(0, m.start() - 26):m.start()]):
            continue
        gen, propio = partir(m.group(1))
        if propio in GENERICOS or propio in ENTRADA or re.search(r"(?i)argentina|bolivia|per[uú]\b", t):
            continue
        if len(propio) < 4 or any(propio == v[1] or propio in v[1] for v in out):
            continue
        out.append(("", propio, m.group(1), None, m.start()))
    return sorted(out, key=lambda c: c[4])


RX_PREF_UNIDAD = re.compile(
    r"^(formaci[oó]n|estratos|grupo|complejo|miembro|unidad|secuencia|ignimbritas?|gravas|capas|lavas|tobas|dacitas?|"
    r"andesitas?|basaltos?|riolitas?|granitos?|granodioritas?|tonalitas?|dioritas?|monzodioritas?|monzogranitos?|gabros?|"
    r"p[oó]rfidos?|plut[oó]n|batolito|intrusivos?|volc[aá]n|domos?|sienogranitos?|monzonitas?|superunidad|esquistos|"
    r"metamorfitas|calizas|areniscas|conglomerados?|brechas?|dep[oó]sitos)\b\s*", re.I)
RX_ADJ_UNIDAD = re.compile(r"^(plut[oó]nico|volc[aá]nico|metam[oó]rfico|intrusivo|[ií]gneo|sedimentari[oa]|estratificad[oa]|"
                           r"volcano-?sedimentari[oa]|epimetam[oó]rfico|subvolc[aá]nico|hipabisal|de|del|la|el|los|las)\b\s*", re.I)


def nombre_propio_unidad(n):
    n = re.sub(r"\(.*$", "", n).strip()
    for _ in range(4):
        n2 = RX_ADJ_UNIDAD.sub("", RX_PREF_UNIDAD.sub("", n, count=1), count=1)
        if n2 == n:
            break
        n = n2
    return n.strip()


def desplazar(x, y, dist_km, rumbo):
    r = math.radians(rumbo)
    return (x + dist_km * math.sin(r) / (111.32 * math.cos(math.radians(y))), y + dist_km * math.cos(r) / 110.57)


def elegir_punto(hits, gen, centro, lat, cerca_pol=None):
    """De los rótulos con ese nombre dentro del marco, el mejor: mismo genérico primero; si un mismo rasgo tiene varios
    rótulos (una quebrada larga), el del medio; si son rasgos distintos, el más cercano a la latitud citada o al centro
    de la carta (NO a los polígonos: esos quedan para validar)."""
    mismos = [h for h in hits if gen and h[0] == gen]
    ambiguo = False
    if mismos:
        hits = mismos
    orden = {"IGM": 0, "yacimiento": 1, "GeoNames": 2}
    f0 = min(orden[h[3]] for h in hits)
    hits = [h for h in hits if orden[h[3]] == f0]
    cx, cy = sum(h[1] for h in hits) / len(hits), sum(h[2] for h in hits) / len(hits)
    disp = max(km((h[1], h[2]), (cx, cy)) for h in hits)
    modo = "unico"
    if disp <= 12 and gen not in EXTENSOS:
        h = min(hits, key=lambda h: km((h[1], h[2]), (cx, cy)))
    elif disp <= 25 and gen in EXTENSOS and not cerca_pol and lat is None:
        h = min(hits, key=lambda h: km((h[1], h[2]), (cx, cy)))   # un solo rasgo largo: el rótulo del medio
    elif lat is not None:
        h, modo = min(hits, key=lambda h: abs(h[2] - lat)), "latitud"
    elif cerca_pol:
        h, modo = min(hits, key=lambda h: cerca_pol(h[1], h[2])), "afloramiento"
    else:
        ambiguo = True
        h = min(hits, key=lambda h: km((h[1], h[2]), centro))
    return h, ambiguo, len(hits), modo


RX_FRASE_TIPO = re.compile(r"localidad(?:es)? tipo|secci[oó]n tipo|perfil tipo|[aá]rea tipo|localidad t[ií]pica|"
                           r"type (?:locality|section|area)", re.I)
RX_SIN = re.compile(r"^\s*(no (indicada|nombrada|definida|se indica|hay)|sin (dato|localidad)|fuera de chile)|"
                    r"\b(argentina|bolivia|per[uú])\b[^.;]{0,40}(fuera de chile)|fuera de chile", re.I)


def main():
    U = json.load(open(os.path.join(RAIZ, "data", "unidades.json"), encoding="utf-8"))["unidades"]
    CARTAS = json.load(open(os.path.join(RAIZ, "data", "cartas.json"), encoding="utf-8"))
    polf = os.path.join(RAIZ, "data", "pol_cerca.json")
    if not os.path.exists(polf):
        polf = os.path.join(RAIZ, "data", "poligonos.json")
    POL = json.load(open(polf, encoding="utf-8")) if os.path.exists(polf) else {}
    manf = os.path.join(AQUI, "loc_manual.json")
    MANUAL = json.load(open(manf, encoding="utf-8")) if os.path.exists(manf) else {}
    G = cargar_gazetteer()
    print("gazetteer:", dict(G.n), "| nombres distintos:", len(G.idx))
    from shapely.geometry import Point, Polygon, MultiPolygon

    def dist_pol(uid, x, y):
        if uid not in POL:
            return None
        g = MultiPolygon([Polygon(a[0], a[1:]) for a in POL[uid]])
        p = Point(x, y)
        if g.contains(p):
            return 0.0
        from shapely.ops import nearest_points
        q = nearest_points(g, p)[0]
        return km((x, y), (q.x, q.y))

    OUT, revisar, cuenta, todas_d = {}, [], collections.Counter(), []
    for u in U:
        if u.get("gen"):
            continue
        man = MANUAL.get(u["n"])
        if man and man.get("sin"):
            cuenta["a mano: sin localidad georreferenciable"] += 1
            continue
        if man:
            OUT[u["n"]] = {"x": round(man["x"], 5), "y": round(man["y"], 5), "m": "a mano", "p": man.get("p", "toponimo"),
                           "t": man.get("t", ""), "f": man.get("f", ""), **({"cita": man["cita"]} if man.get("cita") else {})}
            cuenta["a mano"] += 1
            continue
        txt = u.get("loc") or ""
        if not txt:
            cuenta["sin texto de localidad tipo"] += 1
            continue
        t = limpiar_texto(txt)
        if not u["rev"]:
            mt = RX_FRASE_TIPO.search(t)
            if not mt:
                cuenta["texto automático que no nombra la localidad tipo"] += 1
                continue
            t = t[mt.end():mt.end() + 220]
        cajas = [CARTAS[c]["b"] for c in u["cartas"] if c in CARTAS]
        if RX_SIN.search(t):
            cuenta["texto dice que no hay / fuera de Chile"] += 1
            continue
        res = None
        xy = coordenadas_explicitas(t)
        if xy:
            res = {"x": xy[0], "y": xy[1], "m": "coordenadas del texto", "p": "exacta", "t": "", "f": "texto de la carta"}
        elif cajas:
            w = min(b[2] for b in cajas) - MARGEN; e = max(b[3] for b in cajas) + MARGEN
            s = min(b[0] for b in cajas) - MARGEN; n = max(b[1] for b in cajas) + MARGEN
            centro = ((w + e) / 2, (s + n) / 2)
            lat = latitud_citada(t)
            # solo la primera oración: lo que sigue suele ser contexto (autor, otra hoja, extensión regional)
            primera = re.split(r";|\.\s+(?=[A-ZÁÉÍÓÚ])", t)[0]
            propio_u = nombre_propio_unidad(u["n"])
            if propio_u:
                primera = re.sub(r"(?i)\b(\w+)\s+hom[oó]nim[oa]s?\b", lambda m: f"{m.group(1)} {propio_u.title()}", primera)
            cands = candidatos(primera)[:4]
            # si el texto solo da un rasgo largo (un río, un valle) o nada ubicable, el nombre de la unidad suele ser
            # el del lugar donde se definió: se prueba como topónimo, y se declara así en el resultado
            homon = [(partir(propio_u)[0], partir(propio_u)[1], propio_u, None, 10 ** 6)] if len(partir(propio_u)[1]) >= 4 else []
            cands = [c for c in cands if c[0] not in EXTENSOS] + homon + [c for c in cands if c[0] in EXTENSOS]
            for gen, propio, orig, despl, _pos in cands:
                hits = G.buscar(gen, propio, (w, s, e, n))
                if not hits:
                    continue
                cp = (lambda x, y: dist_pol(u["id"], x, y)) if u["id"] in POL else None
                h, amb, nh, modo = elegir_punto(hits, gen, centro, lat, cp)
                x, y = h[1], h[2]
                prec = "toponimo"
                if despl:
                    x, y = desplazar(x, y, *despl)
                    prec = "toponimo+desplazamiento"
                elif re.search(r"\b(al|hacia el)\s+(norte|sur|este|oeste|oriente|poniente|n|s|e|o|w|ne|no|nw|se|so|sw|"
                               r"noreste|noroeste|sureste|suroeste)\s+(de|del)\b", primera[max(0, _pos - 45):_pos + 2], re.I):
                    prec = "cercania"
                if gen in EXTENSOS and prec == "toponimo":
                    prec = "rasgo extenso"
                if not gen and prec == "toponimo":
                    prec = "cercania"   # nombre suelto (un poblado o un sector): referencia, no el lugar exacto
                if _pos == 10 ** 6:
                    if modo != "unico":
                        continue   # el nombre de la unidad con homónimos dispersos no sirve
                    prec = "nombre de la unidad"
                res = {"x": x, "y": y, "m": h[3], "p": prec, "t": orig.strip(), "f": h[3], "amb": 1 if amb else 0, "nh": nh,
                       "modo": modo}
                break
        if not res:
            cuenta["sin calce (texto sin topónimo ubicable)"] += 1
            revisar.append([u["n"], "sin calce", "", "", "", ";".join(u["cartas"]), "sí" if u["rev"] else "no", txt[:300]])
            continue
        d = dist_pol(u["id"], res["x"], res["y"])
        res["d"] = None if d is None else round(d, 1)
        if d is not None and res.get("modo") == "unico":
            todas_d.append(round(d, 1))   # solo las que NO usaron el polígono para elegir
        motivo = ""
        una_carta = len(cajas) <= 1
        if d is not None and d > LEJOS_KM and (una_carta or res.get("modo") != "unico" or res["p"] in ("cercania", "nombre de la unidad")):
            motivo = f"a {d:.0f} km del afloramiento GDB"
        elif res.get("amb") and d is None:
            motivo = "topónimo ambiguo y sin polígono para contrastar"
        elif not u["rev"] and res["m"] != "coordenadas del texto" and d is None:
            motivo = "texto no revisado a mano y sin polígono para contrastar"
        if motivo:
            cuenta["a revisión: " + ("lejos del afloramiento GDB (> %d km)" % LEJOS_KM if motivo.startswith("a ") else motivo)] += 1
            revisar.append([u["n"], motivo, res.get("t", ""), round(res["x"], 4), round(res["y"], 4), ";".join(u["cartas"]),
                            "sí" if u["rev"] else "no", txt[:300]])
            continue
        cuenta[f"publicada: {res['p']} ({res['m']})"] += 1
        OUT[u["n"]] = {"x": round(res["x"], 5), "y": round(res["y"], 5), "m": res["m"], "p": res["p"], "t": res.get("t", ""),
                       "f": res["f"], **({"d": res["d"]} if res["d"] is not None else {})}
    json.dump(OUT, open(os.path.join(RAIZ, "data", "localidades_tipo.json"), "w", encoding="utf-8"), ensure_ascii=False,
              separators=(",", ":"), sort_keys=True)
    with open(os.path.join(RAIZ, "localidades_por_revisar.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w_ = csv.writer(f, delimiter=";")
        w_.writerow(["unidad", "motivo", "toponimo", "lon", "lat", "cartas", "revisada", "texto"])
        w_.writerows(revisar)
    ds = sorted(todas_d)   # topónimo único (sin homónimos) y con polígono, incluidas las mandadas a revisión
    lineas = [f"Localidades tipo georreferenciadas: {len(OUT)} de {sum(1 for u in U if not u.get('gen'))} unidades con nombre propio", ""]
    lineas += [f"{n:5d}  {k}" for k, n in sorted(cuenta.items(), key=lambda kv: -kv[1])]
    if ds:
        q = lambda p: ds[min(len(ds) - 1, int(p * len(ds)))]
        lineas += ["", f"Control independiente (no usado para elegir): distancia al afloramiento GDB más cercano, n={len(ds)}",
                   f"  dentro del polígono: {sum(1 for d in ds if d == 0)} | a <= 5 km: {sum(1 for d in ds if d <= 5)} | a <= {LEJOS_KM} km: {sum(1 for d in ds if d <= LEJOS_KM)} | mediana {q(.5)} km | p75 {q(.75)} km | p90 {q(.9)} km"]
    open(os.path.join(RAIZ, "localidades_tipo_resumen.txt"), "w", encoding="utf-8").write("\n".join(lineas) + "\n")
    print("\n".join(lineas))


if __name__ == "__main__":
    sys.exit(main())
