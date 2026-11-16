"""Busca en el RAG de Cartas y en «The Geology of Chile» (RAG-Bibliografia) las frases que nombran la localidad
tipo de cada unidad -> tools/loc_rag.json  {unidad: [{"txt": frase, "ref": "fuente, p. N"}]}.

Solo lectura: abre los chroma.sqlite3 con ?mode=ro y usa su tabla FTS5 (sin embeddings, sin cliente Chroma).
La frase debe traer a la vez la expresión («localidad tipo», «type locality»…) y el nombre de la unidad pegado a su
palabra de unidad («Formación X», «X Formation»). Uso: python tools/buscar_localidades_rag.py
"""
import collections, json, os, re, sqlite3, sys, unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
PROY = os.path.dirname(RAIZ)
DB_CARTAS = os.path.join(PROY, "RAG-Cartas-SGB", "rag_db", "chroma.sqlite3")
DB_BIBLIO = os.path.join(PROY, "RAG-Bibliografia", "rag_db", "chroma.sqlite3")
FRASES = ["localidad tipo", "localidades tipo", "sección tipo", "seccion tipo", "localidad típica", "área tipo", "perfil tipo",
          "estratotipo", "type locality", "type section", "type area"]
RX_FRASE = re.compile(r"localidad(?:es)? tipo|secci[oó]n tipo|localidad t[ií]pica|[aá]rea tipo|perfil tipo|estratotipo|"
                      r"type (?:locality|section|area)", re.I)
TW = (r"(?:formacion|formation|fm|grupo|group|complejo|complex|estratos|beds|batolito|batholith|ignimbritas?|ignimbrite|"
      r"miembro|member|pluton|strata|unidad|secuencia|sequence|gravas|capas|superunidad|granodiorita|granito|tonalita|diorita|"
      r"monzodiorita|monzogranito|porfido|lavas|tobas|complejo (?:plutonico|volcanico|metamorfico|intrusivo))")
RX_LIBRO = re.compile(r"(?i)geology of chile 2007|^chapter\s*\d+\.pdf$")


def nrm(s):
    s = "".join(c for c in unicodedata.normalize("NFD", s or "") if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9ñ ]", " ", s.lower())).strip()


def oraciones(t):
    t = re.sub(r"\s+", " ", re.sub(r"^\[[^\]]*\]\s*", "", t or ""))
    return [x.strip() for x in re.split(r"(?<=[.;])\s+(?=[A-ZÁÉÍÓÚ(«])", t) if x.strip()]


def main():
    sys.path.insert(0, AQUI)
    from geocodificar_localidades import nombre_propio_unidad
    U = json.load(open(os.path.join(RAIZ, "data", "unidades.json"), encoding="utf-8"))["unidades"]
    claves = {}
    for u in U:
        if u.get("gen"):
            continue
        ks = set()
        k = nrm(nombre_propio_unidad(u["n"]))
        if len(k) >= 5:
            ks.add(k)
        if u.get("libro"):
            k2 = nrm(re.sub(r"\s+(Formation|Group|Complex|Beds|Batholith|Ignimbrite|Member|Strata|Pluton|Unit|Sequence)\b.*$", "",
                            u["libro"], flags=re.I))
            if len(k2) >= 5:
                ks.add(k2)
        for k in ks:
            claves.setdefault(k, []).append(u["n"])
    rx_ady = {k: re.compile(r"\b" + TW + r"\s+(?:de\s+|del\s+|de la\s+|de los\s+|la\s+|el\s+|los\s+|las\s+)?" + re.escape(k) + r"\b|\b"
                            + re.escape(k) + r"\s+" + TW + r"\b") for k in claves}
    # índice por primera palabra para no probar 1.400 regex por oración
    por_palabra = collections.defaultdict(list)
    for k in claves:
        por_palabra[k.split()[0]].append(k)
    OUT = collections.defaultdict(list)
    for db, solo_libro in ((DB_CARTAS, False), (DB_BIBLIO, True)):
        if not os.path.exists(db):
            print("no está", db)
            continue
        c = sqlite3.connect("file:" + db + "?mode=ro", uri=True)
        ids = set()
        for fr in FRASES:
            try:
                ids |= {r[0] for r in c.execute("select rowid from embedding_fulltext_search where string_value match ?",
                                                ('"' + fr + '"',))}
            except sqlite3.Error as e:
                print("FTS", fr, e)
        print(os.path.basename(os.path.dirname(os.path.dirname(db))), "fragmentos con la frase:", len(ids))
        n = 0
        for i in ids:
            meta = dict((k, (s if s is not None else iv)) for k, s, iv in c.execute(
                "select key, string_value, int_value from embedding_metadata where id=? and key in ('fuente','pagina','chroma:document','tipo')", (i,)))
            fu = meta.get("fuente") or ""
            if solo_libro and not RX_LIBRO.search(fu):
                continue
            if meta.get("tipo") in ("gdb_ficha", "norma"):
                continue
            ors = oraciones(meta.get("chroma:document") or "")
            for j, s in enumerate(ors):
                if not RX_FRASE.search(s) or len(s) > 600:
                    continue
                ns = nrm(s)
                pal = set(ns.split())
                for w in pal & set(por_palabra):
                    for k in por_palabra[w]:
                        if rx_ady[k].search(ns):
                            ref = f"{re.sub(r'[.]pdf$', '', fu, flags=re.I)}, p. {meta.get('pagina', '?')}"
                            for nombre in claves[k]:
                                if not any(x["txt"] == s for x in OUT[nombre]):
                                    OUT[nombre].append({"txt": s, "ref": ref, "libro": 1 if solo_libro else 0})
                                    n += 1
        print("  frases asignadas:", n)
        c.close()
    json.dump(OUT, open(os.path.join(AQUI, "loc_rag.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=True)
    print("unidades con alguna frase:", len(OUT))


if __name__ == "__main__":
    main()
