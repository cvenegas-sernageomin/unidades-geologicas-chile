"""Arma data/yacimientos.json, la capa de yacimientos del visor: edad del depósito, tipo de yacimiento y unidad de la roca de caja.

Tres fuentes (cada registro dice de cuál viene):
  GDB     — SERNAGEOMIN: Recursos Minerales de las cartas, 8.100 yacimientos ya cargados en GeoChile (datos/yacimientos.json).
  MRDS    — USGS Mineral Resources Data System (2012, selección de Chile, dominio público): tipo y roca de caja, sin edad.
  Maksaev — edades y rocas de caja citadas en Maksaev et al. (2007), cap. 6 (tools/yac_maksaev.py, armado a mano).
  Camus   — edades, unidades de caja y litología de Camus (2003), «Geología de los sistemas porfíricos en los Andes de Chile»
            (tools/yac_camus.py, extraído del OCR del libro con la frase de cada edad). Va al final: completa o precisa lo anterior.
Una GDB y un MRDS a menos de ~800 m son el mismo yacimiento: se funden y el MRDS solo completa lo que falta.

Uso: python tools/armar_yacimientos.py
"""
import json, os, re, sys, math, datetime, collections, unicodedata, warnings

warnings.filterwarnings("ignore")
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import armar_datos as A  # noqa: E402  (parse_edad, clave_es, limpiar_nombre, nrm, constantes de ruta)
from yac_maksaev import FILAS, REF  # noqa: E402
from yac_camus import FILAS as FILAS_CAMUS, REF as REF_CAMUS  # noqa: E402

RAIZ, PROY = A.RAIZ, A.PROY
GDB_YAC = os.path.join(PROY, "Geo_Repo_Maule_Sernageomin", "datos", "yacimientos.json")
MRDS = os.environ.get("MRDS_SHP") or os.path.join(
    os.path.expanduser("~"), "OneDrive - Sernageomin", "Punta Negra-Guanaqueros", "04 Datos y resultados", "03 Datos antecedentes",
    "BDs Yacimientos", "BD_USGS_2012", "Chile_ARCMAP", "Chile_Seleccion_ARCMAP.shp")
TOL_FUSION = 0.008   # ° (~800 m)
TOL_MAKS = 0.35      # ° para calzar una fila de Maksaev con un registro de las bases

nrm = A.nrm

# ------------------------------------------------------------------ vocabulario
TIPOS = [
    ("porfido", "Pórfido Cu–Mo–Au", "#c0392b"), ("epitermal", "Epitermal Au–Ag", "#f1c40f"), ("iocg", "Óxidos de Fe–Cu–Au (IOCG)", "#8e44ad"),
    ("hierro", "Hierro (óxidos de Fe, IOA)", "#7f8c8d"), ("estrato", "Estratoligado / manto de Cu–(Ag)", "#e67e22"), ("veta", "Veta", "#2980b9"),
    ("skarn", "Skarn", "#16a085"), ("placer", "Placer", "#d4ac0d"), ("sedim", "Sedimentario, evaporita", "#95a5a6"),
    ("exotico", "Exótico de Cu (supérgeno)", "#2ecc71"), ("magm", "Magmático, pegmatítico", "#e84393"), ("metam", "Metamórfico", "#27ae60"), ("hidro", "Hidrotermal sin precisar", "#34495e"),
    ("otro", "Sin clasificar", "#bdc3c7")]
TIPO_NOM = {k: n for k, n, _ in TIPOS}
MAKS_A_TIPO = {"Pórfido Cu–Mo–Au": "porfido", "Epitermal Au–Ag": "epitermal", "Óxidos de Fe–Cu–Au (IOCG)": "iocg",
               "Óxidos de Fe–apatito (IOA)": "hierro", "Estratoligado Cu–(Ag), tipo manto": "estrato", "Veta": "veta",
               "Skarn": "skarn", "Brecha hidrotermal con turmalina": "hidro"}

SUST = [  # símbolo, regex sobre texto sin tildes en minúscula
    ("Cu", r"\bcu\b|copper|cobre|cuprif|calcopirita|chalcopyrite|bornita|bornite|malaquita|malachite|crisocola|chrysocolla|atacamita|atacamite|calcosina|chalcocite|enargita"),
    ("Au", r"\bau\b|\bgold\b|\boro\b|electrum"), ("Ag", r"\bag\b|silver|plata|argent"),
    ("Fe", r"\bfe\b|\biron\b|hierro|magnetit|hematit|siderit"), ("Mn", r"\bmn\b|mangan"),
    ("Pb", r"\bpb\b|\blead\b|plomo|galena"), ("Zn", r"\bzn\b|\bzinc\b|sphalerite|esfalerita|blenda"),
    ("Mo", r"\bmo\b|molyb|molib"), ("W", r"\bw\b|tungst|wolfram|scheelita"), ("Sb", r"\bsb\b|antimon|stibn"),
    ("Hg", r"\bhg\b|mercur|cinabr"), ("Co", r"\bco\b|cobalt"), ("Ni", r"\bni\b|nickel|niquel"),
    ("Cr", r"\bcr\b|chrom|cromo|cromit"), ("Ti", r"\bti\b|titan|rutilo|ilmenit"), ("U", r"\bu\b|uranium|uranio"),
    ("Sn", r"\bsn\b|\btin\b|estano|casiterit"), ("As", r"\bas\b|arsen|arsenopir"), ("Bi", r"\bbi\b|bismuth|bismuto")]
METALICOS = {s for s, _ in SUST}

LIT_EN = {  # litologías de MRDS al español
    "andesite": "andesita", "diorite": "diorita", "limestone": "caliza", "sandstone": "arenisca", "granite": "granito",
    "conglomerate": "conglomerado", "granodiorite": "granodiorita", "rhyolite": "riolita", "dacite": "dacita", "tonalite": "tonalita",
    "monzonite": "monzonita", "basalt": "basalto", "tuff": "toba", "shale": "lutita", "quartzite": "cuarcita", "schist": "esquisto",
    "gneiss": "gneis", "slate": "pizarra", "phyllite": "filita", "marble": "mármol", "siltstone": "limolita", "mudstone": "fangolita",
    "breccia": "brecha", "gabbro": "gabro", "quartz diorite": "diorita cuarcífera", "quartz monzonite": "monzonita cuarcífera",
    "porphyry": "pórfido", "dolomite": "dolomita", "volcanic rock (aphanitic)": "roca volcánica afanítica", "latite": "latita",
    "syenite": "sienita", "trachyte": "traquita", "ignimbrite": "ignimbrita", "agglomerate": "aglomerado", "pegmatite": "pegmatita",
    "metamorphic rock": "roca metamórfica", "sedimentary rock": "roca sedimentaria", "igneous rock": "roca ígnea", "chert": "chert",
    "amphibolite": "anfibolita", "greenstone": "roca verde", "diabase": "diabasa", "arkose": "arcosa", "gypsum": "yeso", "evaporite": "evaporita",
    "volcanic rock": "roca volcánica", "intrusive rock": "roca intrusiva", "hornfels": "corneana", "skarn": "skarn", "tourmaline breccia": "brecha de turmalina"}

ABREV_EDAD = {"kinf": "Cretácico Inferior", "ksup": "Cretácico Superior", "k": "Cretácico", "jsup": "Jurásico Superior", "jmed": "Jurásico Medio",
              "jinf": "Jurásico Inferior", "j": "Jurásico", "tsup": "Triásico Superior", "tmed": "Triásico Medio", "tinf": "Triásico Inferior",
              "piacenzian": "Piacenziano", "neogeno": "Neógeno", "paleogeno": "Paleógeno"}


def sin_tildes(s):
    return "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")


def limpio(s):
    s = (s or "").strip()
    return "" if re.match(r"^(sin informaci|sin antecedentes|<nulo>|no se conocen|no especif|nan$|none$|s/i$|\?$)", sin_tildes(s).lower()) else s


def sustancias(*txts):
    t = " ".join(sin_tildes(x).lower() for x in txts if x)
    out = [s for s, rx in SUST if re.search(rx, t)]
    return out


def tipo_de(tipo_orig, forma, model, dep_type, ore, sust, mena="", metal=True):
    """Categoría de tipo de yacimiento a partir de los textos de las bases (la clasificación original se guarda aparte)."""
    t = sin_tildes(" ".join(x for x in (tipo_orig, forma, model, dep_type) if x)).lower()
    f = sin_tildes(forma or "").lower().strip()
    gen = sin_tildes(tipo_orig or "").lower()
    if not metal:   # industriales y no metálicos: solo importa de qué origen son
        if re.search(r"sedimentari|evaporit|lacustrine|chemical|biogenic|biogen|clastic|caolin", t): return "sedim"
        if re.search(r"pegmat|magmati|magmatic|intrusivo", t): return "magm"
        if re.search(r"metamorf", t): return "metam"
        if re.search(r"hidrotermal|hydrothermal", t): return "hidro"
        return "otro"
    if re.search(r"porfid|porphyry", t): return "porfido"
    if re.search(r"epitermal|epithermal|alunit", t): return "epitermal"
    if re.search(r"iocg|oxidos de fe|iron oxide.*cu", t): return "iocg"
    if re.search(r"skarn|metamorfismo de contacto|contact meta", t): return "skarn"
    if re.search(r"placer", t): return "placer"
    estrat = re.search(r"estratolig|stratabound|stratiform|volcanic[- ]hosted cu", t) or re.fullmatch(r"(manto|estratiforme|estratoligado)( y/o irregular)?", f) or "manto" in sin_tildes(dep_type or "").lower()
    if estrat and (set(sust) & {"Cu", "Ag", "Mn", "Pb", "Zn"} or not sust): return "estrato"
    if re.search(r"veta|vein|filon|stockwork|relleno de fractura", t): return "veta"
    if "Fe" in sust and re.search(r"magnet|hematit|apatit|kiruna", sin_tildes(mena + " " + ore).lower()): return "hierro"
    if re.search(r"sedimentari|evaporit|lacustrine|chemical|biogenic|biogen|clastic", t): return "sedim"
    if re.search(r"pegmat|magmati|magmatic|intrusivo", t): return "magm"
    if re.search(r"metamorf", t): return "metam"
    if re.search(r"hidrotermal|hydrothermal|polimetal|replacement|brecha|breccia|chimenea|supergen", t): return "hidro"
    return "otro"


def edad_de(txt):
    """(máx, mín) en Ma desde el texto de edad del yacimiento, o None."""
    t = (txt or "").replace("+/-", "±").replace("+-", "±")
    t = re.sub(r"\b(kinf|ksup|jsup|jmed|jinf|tsup|tmed|tinf|k|j)\b", lambda m: ABREV_EDAD[m.group(1).lower()], t, flags=re.I)
    t = re.sub(r"(?i)piacenzian\b", "Piacenziano", t)
    r = A.parse_edad(t)
    if r and r[0] - r[1] > 4000: return None
    return r


def es_lit(txt):
    parts = [p.strip() for p in re.split(r"[,;]", txt or "") if p.strip()]
    return ", ".join(LIT_EN.get(p.lower(), p.lower()) for p in parts)


def unidad_es(txt):
    """Nombre de unidad de MRDS/GDB en español para buscarlo entre las unidades del visor."""
    s = (txt or "").strip()
    s = re.sub(r"^(incluida en|incluido en):?\s*", "", s, flags=re.I)
    s = re.sub(r"\s*\(.*?\)", "", s)  # «(precursor plutónico)», «(Aptiano–Albiano)»
    s = re.split(r"[;,]|\by\b|\band\b", s)[0].strip()
    s = re.sub(r"\bQda\.?\b", "Quebrada", s)
    s = re.sub(r"^F\.\s*", "Formación ", s)
    s = re.sub(r"^(?:Fm|Fmn)\.\s*", "Formación ", s)
    m = re.match(r"^(.*?)\s+(Formation|Group|Batholith|Complex|Member|Pluton|Stock|Porphyry|Granodiorite|Diorite|Intrusive|Intrusives)$", s)
    if m:
        pre = {"Formation": "Formación", "Group": "Grupo", "Batholith": "Batolito", "Complex": "Complejo", "Member": "Miembro", "Pluton": "Plutón",
               "Stock": "Stock", "Porphyry": "Pórfido", "Granodiorite": "Granodiorita", "Diorite": "Diorita", "Intrusive": "Intrusivo", "Intrusives": "Intrusivos"}[m.group(2)]
        s = f"{pre} {m.group(1)}"
    return s


# ------------------------------------------------------------------ unidades del visor para enlazar la roca de caja
def indice_unidades():
    U = json.load(open(os.path.join(RAIZ, "data", "unidades.json"), encoding="utf-8"))["unidades"]
    d = collections.defaultdict(list)
    for u in U:
        if u.get("gen"): continue
        k = A.clave_es(A.limpiar_nombre(u["n"]))
        if k and k[1]: d[k].append(u)
    return {k: max(v, key=lambda u: (u["rev"], len(u["cartas"]), u["nf"]))["id"] for k, v in d.items()}


def enlazar(idx, *textos):
    for t in textos:
        if not t: continue
        for cand in (unidad_es(t),):
            k = A.clave_es(A.limpiar_nombre(cand))
            if k and k[1] and k in idx: return idx[k]
    return None


# ------------------------------------------------------------------ lectura de fuentes
def leer_gdb():
    d = json.load(open(GDB_YAC, encoding="utf-8"))
    esc = d["esc"]

    def f(k, i):
        fld = d.get(k)
        if not isinstance(fld, dict): return ""
        v = fld["v"][i]
        return "" if v is None or v < 0 else fld["d"][v]

    out = []
    for i in range(d["n"]):
        sub = f("subtipo", i)
        out.append({
            "x": round(d["lon"][i] / esc, 5), "y": round(d["lat"][i] / esc, 5), "n": limpio(f("nombre", i)) or "Sin nombre",
            "sus_t": f("sustancia", i), "mena": f("mena", i), "tipo_o": limpio(f("tipo_yacimiento", i)), "forma": limpio(f("forma", i)),
            "edad_o": limpio(f("edad_yac", i)), "unidad": limpio(f("unidad", i)), "lito": limpio(f("litologia_caja", i)),
            "estado": limpio(f("estado", i)), "tam": limpio(f("tamano", i)), "metal": sub.startswith("Met"), "dist": limpio(f("distrito", i)),
            "reg": f("region", i), "obs": f("observacion", i), "ref": f("referencia", i), "src": "GDB"})
    return out


def leer_mrds():
    import pyogrio
    df = pyogrio.read_dataframe(MRDS)
    out = []
    for r in df.itertuples():
        g = lambda a: limpio(str(getattr(r, a, "") or ""))
        out.append({
            "x": round(r.geometry.x, 5), "y": round(r.geometry.y, 5), "n": g("site_name") or "Sin nombre",
            "sus_t": ", ".join(x for x in (g("commod1"), g("commod2"), g("commod3")) if x), "mena": g("ore"), "tipo_o": g("model") or g("dep_type"),
            "forma": g("orebody_fm"), "edad_o": "", "unidad": g("hrock_unit"), "lito": es_lit(g("hrock_type")), "estado": g("dev_stat"),
            "tam": g("prod_size"), "metal": True, "dist": "", "reg": "", "obs": g("ore_ctrl"), "ref": g("ref"), "src": "MRDS",
            "dep_type": g("dep_type"), "model": g("model")})
    return out


def main():
    idx = indice_unidades()
    gdb, mrds = leer_gdb(), leer_mrds()
    print("GDB", len(gdb), "MRDS", len(mrds))

    # --- fusión GDB + MRDS por cercanía (rejilla de 0,01°)
    rej = collections.defaultdict(list)
    for r in gdb: rej[(round(r["x"] / 0.01), round(r["y"] / 0.01))].append(r)
    fund = 0
    sueltos = []
    for m in mrds:
        cx, cy = round(m["x"] / 0.01), round(m["y"] / 0.01)
        mejor, dm = None, 9
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for g in rej.get((cx + dx, cy + dy), ()):
                    d = math.hypot(g["x"] - m["x"], g["y"] - m["y"])
                    if d < dm: mejor, dm = g, d
        if mejor is not None and dm <= TOL_FUSION:
            fund += 1
            for k in ("unidad", "lito", "forma"):
                if not mejor[k] and m[k]: mejor[k + "_m"] = m[k]
            if not mejor["tipo_o"] and m["tipo_o"]: mejor["tipo_o"] = m["tipo_o"]
            mejor["model"], mejor["dep_type"] = m.get("model", ""), m.get("dep_type", "")
            if not mejor["mena"] and m["mena"]: mejor["mena"] = m["mena"]
            mejor["src"] = "GDB + MRDS"
        else:
            sueltos.append(m)
    print("fundidos GDB+MRDS", fund, "MRDS sueltos", len(sueltos))
    reg = gdb + sueltos

    # --- normalización de cada registro
    R = []
    for r in reg:
        unidad = r["unidad"] or r.pop("unidad_m", "")
        lito = r["lito"] or r.pop("lito_m", "")
        sus = sustancias(r["sus_t"]) or sustancias(r["mena"])
        if r["src"] == "GDB" and not sus: sus = []
        ed = edad_de(r["edad_o"]) if r["edad_o"] else None
        no_met = (not r["metal"]) or (r["src"] == "MRDS" and not sus)
        tipo = tipo_de(r["tipo_o"], r["forma"] or r.get("forma_m", ""), r.get("model", ""), r.get("dep_type", ""), r["mena"], sus, r["mena"], metal=not no_met)
        ul = enlazar(idx, unidad)
        o = {"n": r["n"], "x": r["x"], "y": r["y"], "s": sus, "t": tipo, "fu": r["src"]}
        if r["tipo_o"]: o["to"] = r["tipo_o"]
        if r["forma"] or r.get("forma_m"): o["fo"] = r["forma"] or r["forma_m"]
        if r["edad_o"]: o["ed"] = r["edad_o"]
        if ed: o["mx"], o["mn"], o["ef"] = round(ed[0], 3), round(ed[1], 3), "dep"
        if unidad: o["cu"] = unidad
        if lito: o["cl"] = lito
        if ul: o["ul"] = ul
        if r["estado"]: o["es"] = r["estado"]
        if r["tam"] and r["src"] != "MRDS": o["ta"] = r["tam"]
        if r["dist"]: o["di"] = r["dist"]
        if r["reg"]: o["re"] = r["reg"]
        if no_met: o["nm"] = 1
        R.append(o)

    # --- Maksaev et al. (2007)
    ya, nuevos = 0, 0
    for (n, alias, lat, lon, tipo, sus, mx, mn, et, ef, cu, cl, pp) in FILAS:
        mejor, dm = None, 9
        for o in R:
            if abs(o["y"] - lat) > TOL_MAKS or abs(o["x"] - lon) > TOL_MAKS: continue
            nn = nrm(o["n"])
            if not any(re.search(r"\b" + re.escape(nrm(a)) + r"\b", nn) for a in alias): continue
            if sus and o["s"] and not set(sus) & set(o["s"]): continue
            d = math.hypot(o["y"] - lat, o["x"] - lon)
            if d < dm: mejor, dm = o, d
        if mejor is not None:
            ya += 1
            o = mejor
            o["fu"] = o["fu"] + " + Maksaev"
            if o.get("ed"): o["ed"] = f"{et}; en la base: {o['ed']}"
            else: o["ed"] = et
            o["mx"], o["mn"], o["ef"] = mx, mn, ef
            o["t"] = MAKS_A_TIPO[tipo]
            o["mk"] = pp
            o["to"] = (o["to"] + "; " if o.get("to") else "") + f"{tipo} (Maksaev et al. 2007)"
            if cu:
                o["cu"] = cu
                ul = enlazar(idx, cu)
                if ul: o["ul"] = ul
            if cl: o["cl"] = cl
            o["n"] = n if len(nrm(n)) >= len(nrm(o["n"])) else o["n"]
        else:
            nuevos += 1
            o = {"n": n, "x": lon, "y": lat, "s": sus, "t": MAKS_A_TIPO[tipo], "fu": "Maksaev", "to": tipo + " (Maksaev et al. 2007)", "ed": et, "mx": mx, "mn": mn, "ef": ef,
                 "ap": 1, "mk": pp}
            if cu: o["cu"] = cu
            if cl: o["cl"] = cl
            ul = enlazar(idx, cu)
            if ul: o["ul"] = ul
            R.append(o)
    print("Maksaev: calzadas con una base", ya, "nuevas (ubicación aproximada)", nuevos, [o["n"] for o in R if o.get("ap")])


    # --- Camus (2003): precisa edad y roca de caja; manda sobre Maksaev salvo que su edad sea de menor rango (asoc < dep)
    RANGO = {"dep": 3, "sup": 2, "asoc": 2, "cinturon": 1, None: 0}
    ya, nuevos = 0, 0
    for (n, alias, lat, lon, tipo, sus, mx, mn, et, ef, cu, cl, pp, cita) in FILAS_CAMUS:
        mejor, dm = None, 9
        for o in R:
            if abs(o["y"] - lat) > TOL_MAKS or abs(o["x"] - lon) > TOL_MAKS: continue
            nn = nrm(o["n"])
            if not any(re.search(r"\b" + re.escape(nrm(a)) + r"\b", nn) for a in alias): continue
            d = math.hypot(o["y"] - lat, o["x"] - lon) - (0.5 if "Maksaev" in o["fu"] else 0)
            if d < dm: mejor, dm = o, d
        cita_txt = f"Camus (2003), págs. {pp}"
        if mejor is None:
            nuevos += 1
            o = {"n": n, "x": lon, "y": lat, "s": sus, "t": tipo or "porfido", "fu": "Camus", "ap": 1}
            R.append(o)
        else:
            ya += 1
            o = mejor
            o["fu"] = o["fu"] + " + Camus"
            o["n"] = n if len(nrm(n)) >= len(nrm(o["n"])) else o["n"]
            if sus: o["s"] = sorted(set(o.get("s") or []) | set(sus))
        o["ca"] = cita_txt
        if tipo: o["t"] = tipo
        if mx is not None:
            # las edades de las figuras de las fajas (cap. 3, págs. < 127) son redondeadas: no pisan una edad del depósito ya medida
            de_figura = all(int(x) < 127 for x in re.findall(r"\d+", pp))
            if "mx" not in o or (RANGO.get(ef, 0) >= RANGO.get(o.get("ef"), 0) and not (de_figura and o.get("ef") == "dep")):
                previo = o.get("ed")
                o["mx"], o["mn"], o["ef"] = mx, mn, ef
                o["ed"] = f"Camus (2003): {et}" + (f" · Otras fuentes: {previo}" if previo else "")
            else:
                o["ed"] = f"{o['ed']} · Camus (2003): {et}"
        partes = [p.strip() for p in re.split(r";", cu or "") if p.strip()]
        if partes:
            o["cu"] = cu
            for p in partes:
                ul = enlazar(idx, re.sub(r"\s*\(.*?\)", "", p))
                if ul: o["ul"] = ul; break
        if cl: o["cl"] = cl
    print("Camus: calzadas", ya, "nuevas", nuevos)

    con_edad = sum(1 for o in R if "mx" in o)
    completos = sum(1 for o in R if "mx" in o and o.get("t") != "otro" and (o.get("cu") or o.get("cl")))
    print("registros", len(R), "con edad", con_edad, "con edad+tipo+caja", completos, "con unidad enlazada", sum(1 for o in R if "ul" in o))
    print("por fuente", collections.Counter(o["fu"] for o in R))
    print("por tipo", collections.Counter(o["t"] for o in R).most_common())
    out = {"generado": datetime.date.today().isoformat(), "ref_maksaev": REF, "ref_camus": REF_CAMUS, "tipos": [[k, n, c] for k, n, c in TIPOS], "r": R}
    p = os.path.join(RAIZ, "data", "yacimientos.json")
    json.dump(out, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("yacimientos.json", round(os.path.getsize(p) / 1e6, 2), "MB")


if __name__ == "__main__":
    main()
