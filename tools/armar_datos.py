"""Arma los datos del visor de unidades geológicas de Chile.

Entrada:
  - Unidades_geologicas_Chile.xlsx (RAG-Bibliografia/informes): la tabla revisada a mano, fuente de verdad.
  - geochile-vectores/cartas/*.json: polígonos de las GDB oficiales (93 cartas) -> geometría real de cada unidad.
  - cartas-geologicas-sernageomin/manifest.json + BOUNDS_MANUAL: marco de cada carta, para ubicar las unidades
    que no tienen polígono (punto dentro del marco de cada carta que la describe).
Salida (data/): unidades.json, poligonos.json, cartas.json.

Uso: python tools/armar_datos.py
"""
import json, os, re, sys, glob, hashlib, unicodedata, collections
from openpyxl import load_workbook
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.ops import unary_union

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
PROY = os.path.dirname(RAIZ)
XLSX = os.path.join(PROY, "RAG-Bibliografia", "informes", "Unidades_geologicas_Chile.xlsx")
VECT = os.path.join(PROY, "geochile-vectores")
MANIF = os.path.join(PROY, "cartas-geologicas-sernageomin", "manifest.json")
sys.path.insert(0, os.path.join(PROY, "RAG-Bibliografia", "tools", "unidades"))
from parsear import limpiar_nombre  # noqa: E402
from agregar import clave_es  # noqa: E402

TOL = 0.0025          # simplificación de polígonos (grados, ~250 m)
AREA_MIN = 4e-6       # descarta astillas (< ~0,05 km²)

# Marcos leídos del texto de cada carta antigua (s, n, w, e). «Costa» y «frontera» van aproximados.
BOUNDS_MANUAL = {
    "CGCH_02": (-27.75, -27.5, -70.25, -70.0), "CGCH_04": (-27.25, -27.0, -70.25, -70.0),
    "CGCH_19_20": (-18.75, -18.5, -70.5, -70.0), "CGCH_27": (-27.0, -26.33, -70.9, -70.25),
    "CGCH_38": (-28.5, -28.0, -70.5, -70.0), "CGCH_40": (-22.0, -21.0, -69.0, -68.4),
    "CGCH_41_44": (-31.5, -30.75, -70.75, -70.25), "CGCH_45_48": (-22.0, -21.5, -70.0, -69.5),
    "CGCH_49_50": (-22.25, -21.25, -70.0, -69.5), "CGCH_51": (-22.0, -21.0, -70.2, -69.0),
    "CGCH_52": (-33.0, -32.0, -70.75, -70.0), "CGCH_53": (-27.5, -27.0, -70.0, -69.5),
    "CGCH_54": (-24.0, -23.0, -69.0, -67.5), "CGCH_55": (-30.0, -28.0, -71.6, -70.5),
    "CGCH_56": (-27.5, -27.0, -69.5, -69.0), "CGCH_57": (-38.0, -37.0, -71.5, -71.0),
    "CGCH_58": (-23.0, -22.0, -69.0, -67.9), "CGCH_59": (-21.0, -20.0, -69.0, -68.4),
    "CGCH_60_61": (-47.0, -45.0, -73.0, -71.6), "CGCH_62_63": (-26.5, -25.0, -70.75, -69.0),
    "CGCH_64": (-37.0, -36.0, -71.5, -70.6), "CGCH_65": (-56.0, -54.7, -71.0, -67.5),
    "CGCH_66": (-23.2, -22.0, -67.5, -67.0), "CGCH_67": (-30.0, -29.0, -70.5, -69.8),
    "CGCH_70": (-25.0, -24.0, -70.6, -69.0), "CGCH_71": (-39.0, -38.0, -72.25, -71.0),
    "CGCH_GB_143": (-23.5, -23.0, -69.0, -68.5),
    "AGUIRRE_1960": (-33.1, -32.75, -70.6, -70.0), "KLOHN_1960": (-35.38, -33.25, -70.75, -69.9),
}
TITULOS_MANUAL = {"AGUIRRE_1960": "Aguirre (1960): Geología de los Andes de Chile central (Aconcagua)",
                  "KLOHN_1960": "Klohn (1960): Geología de la cordillera de los Andes de Chile central",
                  "CGCH_67": "Hoja Guanta, regiones de Atacama y Coquimbo"}
# nombres de archivo del corpus -> id de carta
ALIAS = {
    "54 Toconao  Texto y mapa": "CGCH_54", "58 Calama  Texto y mapa": "CGCH_58", "66 Zapaleri Texto y Mapa": "CGCH_66",
    "Calama": "CGCH_GB_199", "Quehuita": "CGCH_GB_207", "M204_Iquique-Pozo Almonte": "CGCH_GB_162_163",
    "MAPA_M207_SIERRA_VAQUILLAS_ALTAS": "CGCH_GB_159", "TEXTO_VAQUILLAS_ALTAS": "CGCH_GB_159",
    "Pisco Elqui y Paso del Agua Negra": "CGCH_GB_211_212", "Ovalle y Peña Blanca": "CGCH_GB_208_209",
    "El Transito-Lagunillas": "CGCH_GB_149", "Cerros de Cantaritos-Laguna Chica": "CGCH_GB_181",
    "Aguirre 1960 IIG - Geología de los Andes Centrales de Chile (Aconcagua)": "AGUIRRE_1960",
    "Klohn 1960 Geologia de la cordillera de los Andes de Chile central": "KLOHN_1960",
}

# GDB del portal sin número GB en el índice de geochile-vectores
M_A_GB = {"M213": "CGCH_GB_149", "M314": "CGCH_GB_181", "M159": "CGCH_GB_208_209", "M312": "CGCH_GB_199",
          "M341": "CGCH_GB_207"}


def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def nrm(s):
    return re.sub(r"\s+", " ", sin_tildes(s or "").lower()).strip()


def id_carta(fuente):
    f = fuente.strip()
    if f in ALIAS:
        return ALIAS[f]
    f = re.sub(r"_(TextoyMapa|Mapa)$", "", f)
    return f


def gb_a_id(gb):  # "GB-162-163" -> "CGCH_GB_162_163"
    return "CGCH_" + gb.replace("-", "_")


# ---------------------------------------------------------------- cartas
def cargar_cartas():
    C = {}
    for m in json.load(open(MANIF, encoding="utf-8"))["mapas"]:
        b = m["bounds"]
        caja = (b["s"], b["n"], b["w"], b["e"])
        ids = {id_carta(m["id"])}
        inf = (m.get("informe") or "")
        if re.match(r"GB-\d", inf):
            ids.add(gb_a_id(inf))
        if m["id"] == "geo_F28_carta64":
            ids.add("CGCH_64")
        for i in ids:
            C.setdefault(i, {"t": m["titulo"], "b": caja, "esc": m.get("escala", ""), "anio": m.get("anio", "")})
    idx = json.load(open(os.path.join(VECT, "index.json"), encoding="utf-8"))
    for c in idx["cartas"]:
        if not c.get("gb"):
            continue
        i = gb_a_id(c["gb"])
        s, w, n, e = c["bounds"][1], c["bounds"][0], c["bounds"][3], c["bounds"][2]
        C.setdefault(i, {"t": c["titulo"], "b": (s, n, w, e), "esc": "", "anio": ""})
    for i, b in BOUNDS_MANUAL.items():
        C.setdefault(i, {"t": TITULOS_MANUAL.get(i, ""), "b": b, "esc": "", "anio": "", "aprox": 1})
    return C


# ---------------------------------------------------------------- edades
ICS = json.load(open(os.path.join(RAIZ, "data", "ics.json"), encoding="utf-8"))["unidades"]
POR_NOMBRE = collections.defaultdict(list)
for _id, nombre, tipo, base, techo, color in ICS:
    POR_NOMBRE[nrm(nombre)].append((tipo, base, techo, _id))
# subdivisiones informales de las épocas que la tabla no parte en Inferior/Medio/Superior
SUBDIV = {
    "pleistoceno": {"inferior": (2.58, 0.774), "medio": (0.774, 0.129), "superior": (0.129, 0.0117)},
    "plioceno": {"inferior": (5.333, 3.6), "superior": (3.6, 2.58)},
    "mioceno": {"inferior": (23.04, 15.98), "medio": (15.98, 11.63), "superior": (11.63, 5.333)},
    "oligoceno": {"inferior": (33.9, 27.3), "superior": (27.3, 23.04)},
    "eoceno": {"inferior": (56.0, 47.8), "medio": (47.8, 37.71), "superior": (37.71, 33.9)},
    "paleoceno": {"inferior": (66.0, 61.66), "medio": (61.66, 59.24), "superior": (59.24, 56.0)},
    "paleozoico": {"inferior": (538.8, 419.62), "superior": (358.86, 251.902)},
    "terciario": {"inferior": (66.0, 23.04), "superior": (23.04, 2.58)},
    "proterozoico": {"superior": (1000, 538.8)},
}
EXTRA = {"terciario": (66.0, 2.58), "lias": (201.4, 174.7), "dogger": (174.7, 161.5), "malm": (161.5, 143.1),
         "neocomiano": (143.1, 126.5), "precambrico": (4000, 538.8), "paleozoico": (538.8, 251.902),
         "mesozoico": (251.902, 66.0), "cenozoico": (66.0, 0.0), "cuaternario": (2.58, 0.0), "holoceno": (0.0117, 0.0),
         "actual": (0.0117, 0.0), "reciente": (0.0117, 0.0), "precordillera": None}
# nombre de época/piso en español sin el sufijo («Jurásico Superior» -> período + época)
PERIODOS_CON_EPOCAS = {"jurasico", "cretacico", "triasico", "devonico", "silurico", "ordovicico", "cambrico",
                       "carbonifero", "permico"}
RX_TERM = re.compile(r"[a-záéíóúñ]+(?:\s+(?:inferior|medio|superior|temprano|tardio|tardío))?", re.I)


def rango_nombre(nombre, cal):
    """Rango (base, techo) de un nombre de la escala, con calificativo opcional."""
    nombre, cal = nrm(nombre), nrm(cal or "")
    cal = {"temprano": "inferior", "tardio": "superior"}.get(cal, cal)
    if cal and nombre in SUBDIV and cal in SUBDIV[nombre]:
        return SUBDIV[nombre][cal]
    if cal and nombre in PERIODOS_CON_EPOCAS:
        hijos = [x for x in POR_NOMBRE.get(cal, []) if x[0] == "epoca"]
        per = [x for x in POR_NOMBRE.get(nombre, []) if x[0] == "periodo"]
        if per:
            pb, pt = per[0][1], per[0][2]
            for t, b, te, _ in hijos:
                if te >= pt - 1e-6 and b <= pb + 1e-6:
                    return (b, te)
    if nombre in EXTRA and EXTRA[nombre]:
        return EXTRA[nombre]
    cands = [x for x in POR_NOMBRE.get(nombre, []) if x[0] != "eon" or nombre == "fanerozoico"]
    if cands:
        return (cands[0][1], cands[0][2])
    return None


NOMBRES_ESCALA = set(POR_NOMBRE) | set(EXTRA) | set(SUBDIV)
VARIANTES = {"caloviano": "calloviano", "kimeridgiano": "kimmeridgiano", "titoniano": "titoniano", "tithoniano": "titoniano",
             "bathoniano": "batoniano", "hauteriviense": "hauteriviano", "maestrichtiano": "maastrichtiano",
             "chatiano": "chattiano", "ypresiense": "ypresiano", "neogeno": "neogeno", "paleogeno": "paleogeno",
             "glaciar": None, "pliensbaquiano": "pliensbachiano", "senoniano": None, "eopaleozoico": "paleozoico"}


def termino_escala(w):
    """Forma canónica de una palabra de edad («jurásicas» -> «jurasico»); '' si no es de la escala."""
    for c in (w, w[:-1] if w.endswith("s") else w, re.sub(r"as?$", "o", w), re.sub(r"es$", "", w)):
        c = VARIANTES.get(c, c)
        if c and c in NOMBRES_ESCALA:
            return c
    return ""
RX_NUM = re.compile(r"(\d+(?:[.,]\d+)?)\s*(?:[-–—a]\s*(\d+(?:[.,]\d+)?)\s*)?(Ma|ka|m\.a\.)", re.I)


def num(s):
    return float(s.replace(".", "").replace(",", ".")) if re.match(r"^\d{1,3}(\.\d{3})+$", s) else float(s.replace(",", "."))


def parse_edad(txt):
    """Devuelve (max, min) en Ma a partir del texto de edad; None si no se reconoce."""
    if not txt:
        return None
    t = re.sub(r"\[[^\]]*\]", " ", txt)  # citas [CGCH_...]
    t = re.sub(r"\([^)]*CGCH[^)]*\)", " ", t)
    t = re.sub(r"\s*±\s*\d+(?:[.,]\d+)?", "", t)  # errores analíticos
    vals = []
    for a, b, u in RX_NUM.findall(t):
        f = 0.001 if u.lower() == "ka" else 1.0
        try:
            x = num(a) * f
            vals.append(x)
            if b:
                vals.append(num(b) * f)
        except ValueError:
            pass
    vals = [v for v in vals if 0 <= v < 4000]
    if vals and not re.search(r"\bAP\b|años", t):
        return (max(vals), min(vals))
    rangos = []
    pal = re.findall(r"[A-Za-zÁÉÍÓÚáéíóúÑñ]+", t)
    for i, w in enumerate(pal):
        w0 = termino_escala(nrm(w))
        if not w0 or w0 in ("superior", "inferior", "medio"):
            continue
        cal = nrm(pal[i + 1]) if i + 1 < len(pal) and nrm(pal[i + 1]) in ("inferior", "medio", "superior", "temprano", "tardio") else ""
        r = rango_nombre(w0, cal)
        if r:
            rangos.append(r)
    # «Mioceno Inferior-Medio»: el calificativo suelto después de un guion hereda el nombre anterior
    for m in re.finditer(r"([A-Za-zÁÉÍÓÚáéíóú]+)\s+(Inferior|Medio|Superior)\s*[-–]\s*(Inferior|Medio|Superior)\b", t, re.I):
        r = rango_nombre(m.group(1), m.group(3))
        if r:
            rangos.append(r)
    if not rangos:
        return None
    return (max(r[0] for r in rangos), min(r[1] for r in rangos))


# ---------------------------------------------------------------- litología
CLASES = [
    ("volc", "Volcánicas", r"lava|andesit|basalt|dacit|riolit|traquit|volcanit|volcánic|colada|domo|latit"),
    ("piro", "Piroclásticas", r"toba|ignimbrit|piroclást|tefra|lapilli|ceniza|pómez|pomez|brecha volc"),
    ("clas", "Sedimentarias clásticas", r"conglomerad|arenisc|lutit|limolit|fangolit|grauvac|arcosa|brecha sediment|litarenit|turbidit|sedimentari"),
    ("carb", "Carbonatos y evaporitas", r"caliz|calcáre|calcarenit|calcilutit|yeso|evaporit|anhidrit|dolomit|marga|coquina|salar|sal\b"),
    ("plut", "Plutónicas", r"granit|granodiorit|tonalit|diorit|monzonit|monzogranit|gabro|sienit|plutón|batolit|intrusiv"),
    ("subv", "Subvolcánicas", r"pórfid|porfid|dique|hipabisal|subvolcán|filón|stock"),
    ("meta", "Metamórficas", r"esquist|gneis|filit|pizarr|metamórf|migmatit|mármol|metabasit|cuarcit|anfibolit|metased|metavolc"),
    ("depo", "Depósitos no consolidados", r"grava|depósito|ripio|arena\b|arenas\b|morrena|aluvi|coluvi|eólic|lahar|avalancha|till|glaciar"),
]
RX_CLASES = [(k, n, re.compile(r, re.I)) for k, n, r in CLASES]
AMBIENTES = [("marino", r"marin|amonit|fosilíf|bivalv|turbidit|plataforma"), ("continental", r"continental|aluvial|fluvial|lacustre|eólic")]


def clases(*txts):
    t = " ".join(x for x in txts if x)
    return [k for k, _, rx in RX_CLASES if rx.search(t)]


def clases_unidad(nombre, cat, lit_rev, rocas, resumen, lc_gdb):
    """Clases litológicas: la litología revisada y los términos más frecuentes mandan; el resumen libre solo si no hay más
    (cita rocas vecinas: «intruye a granitos»). Los depósitos son depósitos."""
    if cat == "Depósitos":
        return sorted({"depo"} | ({"piro"} if re.search(r"pirocl|lahar|ceniza|ignimbr", nombre, re.I) else set()))
    cl = set(clases(lit_rev, " ".join(rocas[:5]), nombre))
    cl |= {dict((n, k) for k, n, _ in CLASES).get(x, "") for x in lc_gdb} - {""}
    if not cl:
        cl = set(clases(resumen))
    if cat in ("Intrusivo", "Batolito", "Plutón") or re.match(r"(granit|granodiorit|tonalit|diorit|monzo|gabro|plut|batolit|supe?runidad)", nrm(nombre)):
        cl -= {"depo", "clas", "carb"}
    return sorted(cl)


# ---------------------------------------------------------------- polígonos GDB
def clave_gdb(n):
    n = re.split(r"\.\s*\(|\s\(|:\s", n)[0]
    n = re.sub(r"\.$", "", n.strip())
    return clave_es(limpiar_nombre(n))


def cargar_gdb():
    """clave -> lista de (carta_id, código, mx, mn, lc, polígonos shapely) y (carta, código) -> clave."""
    por_clave = collections.defaultdict(list)
    por_codigo = {}
    for fn in sorted(glob.glob(os.path.join(VECT, "cartas", "*.json"))):
        c = json.load(open(fn, encoding="utf-8"))
        cid = gb_a_id(c["gb"]) if c.get("gb") else M_A_GB.get(c["m"], c["m"])
        geoms = collections.defaultdict(list)
        for ui, tipo, coords in c["p"]:
            for poli in (coords if tipo == 1 else [coords]):  # tipo 1: multipolígono
                try:
                    pol = Polygon(poli[0], poli[1:])
                    if not pol.is_valid:
                        pol = pol.buffer(0)
                    geoms[ui].append(pol)
                except Exception as e:
                    print("polígono malo", fn, ui, e)
        for ui, u in enumerate(c["u"]):
            if not geoms.get(ui):
                continue
            k = clave_gdb(u["n"] or "")
            reg = {"carta": cid, "c": u.get("c"), "mx": u.get("mx"), "mn": u.get("mn"), "lc": u.get("lc"),
                   "lr": u.get("lr") or [], "g": geoms[ui], "n": u["n"]}
            if k and k[1]:
                por_clave[k].append(reg)
            if u.get("c"):
                por_codigo[(cid, u["c"])] = reg
    return por_clave, por_codigo


def simplificar(geoms):
    g = unary_union(geoms).simplify(TOL, preserve_topology=True)
    partes = [g] if isinstance(g, Polygon) else list(getattr(g, "geoms", []))
    salida = []
    for p in partes:
        if not isinstance(p, Polygon) or p.area < AREA_MIN:
            continue
        anillos = [p.exterior] + [r for r in p.interiors if Polygon(r).area > AREA_MIN * 4]
        salida.append([[[round(x, 4), round(y, 4)] for x, y in r.coords] for r in anillos])
    return salida


# ---------------------------------------------------------------- unidades
# nombres sin topónimo («Depósitos aluviales», «Intrusivos hipabisales»): no son una unidad con extensión propia
PALABRAS_GENERICAS = set("""depositos deposito intrusivos intrusivo rocas gravas secuencias secuencia sedimentos aluviales aluvial
fluviales fluvial coluviales coluvial remocion en masa de del y o a e eolicos eolico morrenicos morrenico salinos salino antropicos
hipabisales graniticos granitico dioriticos dioritico glaciales glacial fluvioglaciales fluvioglacial lacustres lacustre litorales
litoral marinos marino playa laharicos piroclasticos piroclastico volcanicos volcanico gravitacionales aterrazados antiguos
antiguas modernos activos inactivos indiferenciados indiferenciadas evaporiticos estuarinos deltaicos aluvionales glaciofluviales
glaciolacustres mixtos coluvio aluviales-coluviales abanicos abanico talud escombros avalancha volcanica lahares lahar
cenizas caida flujo flujos domos lavas basalticas andesiticas dacitas riolitas porfidos porfido diques dique stocks stock
granitoides granitoide mesozoicos paleozoicos cenozoicos terciarios cuaternarios jurasicos cretacicos superiores inferiores
medios recientes actuales holocenos pleistocenos miocenos edad""".split())


def generica(nombre):
    pal = re.findall(r"[a-zñ]+", nrm(nombre))
    return bool(pal) and all(w in PALABRAS_GENERICAS for w in pal)

HOJAS = {"Formaciones y unidades estratificadas": "E", "Complejos e intrusivos": "C", "Volcanes y depósitos": "V"}


def val(x):
    return "" if x is None or str(x) == "None" else str(x).strip()


def punto_en(caja, semilla, i, n):
    """Punto determinista dentro del 70 % central del marco, repartido para que no se apilen."""
    s, nn, w, e = caja
    h = int(hashlib.md5(semilla.encode()).hexdigest()[:8], 16)
    fx, fy = (h % 1000) / 1000, ((h // 1000) % 1000) / 1000
    return [round(w + (e - w) * (0.15 + 0.7 * fx), 4), round(s + (nn - s) * (0.15 + 0.7 * fy), 4)]


def main():
    cartas = cargar_cartas()
    gdb_clave, gdb_codigo = cargar_gdb()
    wb = load_workbook(XLSX, read_only=True)
    U, POL, usadas = [], {}, set()
    sin_marco = collections.Counter()
    for ws in wb.worksheets:
        hoja = next((v for k, v in HOJAS.items() if k.startswith(ws.title) or ws.title.startswith(k)), None)
        if not hoja:
            continue
        filas = ws.iter_rows(values_only=True)
        h = [val(x) for x in next(filas)]
        col = {n: i for i, n in enumerate(h)}
        for r in filas:
            g = lambda n: val(r[col[n]]) if n in col else ""
            nombre = g("Unidad")
            if not nombre:
                continue
            rev = g("Revisada a mano") == "Sí"
            fuentes = [re.sub(r"\s+p\.\s*\d+.*$", "", x).strip() for x in g("Cartas fuente [página del PDF]").split(";") if x.strip()]
            cids = []
            for f in fuentes:
                ci = id_carta(f)
                if ci not in cids:
                    cids.append(ci)
            edad_txt = g("Edad (revisada)") or g("Edad según carta(s) [carta]")
            rango = parse_edad(edad_txt) or parse_edad(g("Edades numéricas citadas (Ma)"))
            fuente_edad = ("revisada" if g("Edad (revisada)") else "carta") if rango else ""
            lit = g("Litología (revisada)") or g("Resumen litológico (texto de la carta)")
            rocas = [x.strip() for x in g("Tipos de roca (términos más frecuentes)").split(",") if x.strip()]
            uid = "u%04d" % len(U)
            # geometría: por nombre y, dentro de las cartas que la describen, por sigla
            k = clave_es(limpiar_nombre(nombre))
            regs = list(gdb_clave.get(k, [])) if k and k[1] else []
            for m in re.finditer(r"([^;()]+?)\s*\((CGCH_[^)]+)\)", g("Sigla(s) [carta]")):
                for sg in re.split(r"[,/]\s*|\s+también\s+", m.group(1)):
                    sg = sg.strip().replace("también", "").strip()
                    reg = gdb_codigo.get((m.group(2).strip(), sg))
                    if sg and reg and reg not in regs:
                        regs.append(reg)
            lc_gdb = sorted({x["lc"] for x in regs if x.get("lc")})
            if not rango:
                mx = [x["mx"] for x in regs if x.get("mx") is not None]
                mn = [x["mn"] for x in regs if x.get("mn") is not None]
                if mx and mn:
                    rango, fuente_edad = (max(mx), min(mn)), "gdb"
            gen = generica(nombre)
            pol = simplificar([p for x in regs for p in x["g"]]) if regs and not gen else []
            for x in regs:
                usadas.add((x["carta"], x["c"]))
            if pol:
                POL[uid] = pol
            pts = []
            for i, ci in enumerate(cids):
                if ci in cartas:
                    pts.append(punto_en(cartas[ci]["b"], nombre + ci, i, len(cids)))
                else:
                    sin_marco[ci] += 1
            if pol:
                g_s = MultiPolygon([Polygon(a[0], a[1:]) for a in pol])
                rp, bb = g_s.representative_point(), g_s.bounds
                centro, caja = [round(rp.x, 4), round(rp.y, 4)], [round(x, 4) for x in bb]
            elif pts:
                xs, ys = [p[0] for p in pts], [p[1] for p in pts]
                centro = [round(sum(xs) / len(xs), 4), round(sum(ys) / len(ys), 4)]
                caja = [min(cartas[c]["b"][2] for c in cids if c in cartas), min(cartas[c]["b"][0] for c in cids if c in cartas),
                        max(cartas[c]["b"][3] for c in cids if c in cartas), max(cartas[c]["b"][1] for c in cids if c in cartas)]
            else:
                centro, caja = None, None
            u = {
                "id": uid, "c": centro, "bb": caja, "n": nombre, "h": hoja, "cat": g("Categoría"), "rev": 1 if rev else 0,
                "loc": g("Localidad tipo (revisada)") or g("Localidad tipo / definición (mejor dato disponible)"),
                "lit": lit, "edad": edad_txt, "corr": g("Correlaciones (revisadas)") or g("Correlaciones: unidades nombradas"),
                "nota": g("Notas de la revisión"), "aut": g("Autor y año de definición"), "sig": g("Sigla(s) [carta]"),
                "rocas": rocas[:8], "esp": g("Espesor citado"), "libro": g("Libro Geology of Chile (2007): nombre"),
                "nf": int(g("N.º fuentes bibliográficas que la nombran") or 0), "cartas": cids,
                "mx": round(rango[0], 4) if rango else None, "mn": round(rango[1], 4) if rango else None, "fe": fuente_edad,
                "cl": clases_unidad(nombre, g("Categoría"), g("Litología (revisada)"), rocas,
                                    g("Resumen litológico (texto de la carta)"), lc_gdb),
                "amb": [a for a, rx in AMBIENTES if re.search(rx, lit + " " + g("Resumen litológico (texto de la carta)"), re.I)],
                "pts": pts, "gdb": len(regs), "gen": 1 if gen else 0,
            }
            U.append(u)
    # enlaces de correlación: nombres de otras unidades citados en el texto de correlaciones
    por_nombre = {}
    for u in U:
        nn = nrm(re.sub(r"\s+[A-Z][A-Za-z]{0,5}\d?$", "", u["n"]))
        if u["gen"] or re.match(r"(miembro|unidad|secuencia) (inferior|superior|medio|basal|[ivx]+\b|\d)", nn):
            continue
        if len(nn.split()) >= 2 and len(nn) >= 9:
            por_nombre.setdefault(nn, u["id"])
    nombres = sorted(por_nombre, key=len, reverse=True)
    for u in U:
        t = nrm(u["corr"])
        t = re.sub(r"formaciones ([^.;\[]+)", lambda m: " ".join("formacion " + x for x in re.split(r",\s*|\s+y\s+|\s+e\s+", m.group(1))), t)
        enl = []
        for nn in nombres:
            if nn in t and por_nombre[nn] != u["id"] and por_nombre[nn] not in enl:
                enl.append(por_nombre[nn])
                t = t.replace(nn, " ")
        u["enl"] = enl
    usadas_cartas = {c for u in U for c in u["cartas"]}
    C = {k: {"t": v["t"], "b": v["b"], **({"aprox": 1} if v.get("aprox") else {})} for k, v in cartas.items() if k in usadas_cartas}
    os.makedirs(os.path.join(RAIZ, "data"), exist_ok=True)
    dump = lambda o, n: json.dump(o, open(os.path.join(RAIZ, "data", n), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    dump({"generado": __import__("datetime").date.today().isoformat(), "unidades": U}, "unidades.json")
    dump(POL, "poligonos.json")
    dump(C, "cartas.json")
    n_pol = sum(1 for u in U if u["id"] in POL)
    n_edad = sum(1 for u in U if u["mx"] is not None)
    print(f"unidades {len(U)} | con polígono {n_pol} | con punto {sum(1 for u in U if u['pts'])} | "
          f"sin ubicación {sum(1 for u in U if not u['pts'] and u['id'] not in POL)} | con edad {n_edad} "
          f"({collections.Counter(u['fe'] for u in U)}) | genéricas {sum(u['gen'] for u in U)} | con enlaces {sum(1 for u in U if u['enl'])}")
    print("cartas sin marco:", sin_marco.most_common(15))
    for n in ("unidades.json", "poligonos.json", "cartas.json"):
        print(n, round(os.path.getsize(os.path.join(RAIZ, "data", n)) / 1e6, 2), "MB")


if __name__ == "__main__":
    main()
