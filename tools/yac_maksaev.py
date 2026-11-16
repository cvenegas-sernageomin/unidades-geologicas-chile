"""Yacimientos con edad citada en Maksaev, Townley, Palacios y Camus (2007), «Metallic ore deposits», cap. 6 de
*The Geology of Chile* (Moreno y Gibbons, eds.). Tabla armada a mano desde el texto del capítulo: cada fila lleva las
edades tal como las da el capítulo (Ma), el tipo y la roca de caja que menciona, y la página.

Campos: n nombre · alias (para calzar con las bases GDB/MRDS) · lat/lon ubicación aproximada del distrito (se reemplaza por
la de la base si calza) · t tipo · mx/mn edad (Ma) · et texto de la edad · ef 'dep' si la edad es del depósito, 'asoc' si es de
la roca o evento asociado, 'cinturon' si es la del cinturón metalogénico al que pertenece · cu unidad de caja · cl litología de
caja · p páginas del libro.
No se incluyen los depósitos del capítulo sin ubicación segura.
"""

PORF = "Pórfido Cu–Mo–Au"
EPI = "Epitermal Au–Ag"
IOCG = "Óxidos de Fe–Cu–Au (IOCG)"
IOA = "Óxidos de Fe–apatito (IOA)"
ESTR = "Estratoligado Cu–(Ag), tipo manto"
VETA = "Veta"
SUS_CU = ["Cu", "Mo"]

# (n, alias, lat, lon, tipo, sustancias, mx, mn, texto de edad, ef, unidad de caja, litología de caja, páginas)
FILAS = [
    # --- cinturón pórfido Eoceno tardío–Oligoceno temprano (Camus 2003) ---
    ("Copaquire", ["copaquire"], -20.93, -68.89, PORF, ["Cu", "Mo"], 38, 36, "38–36 Ma (mayoría de los grandes pórfidos del cinturón)", "cinturon", "", "Stocks porfídicos granodioríticos a monzoníticos cuarcíferos en rocas de caja diversas", "183–185"),
    ("Rosario de Collahuasi", ["rosario", "collahuasi"], -20.99, -68.73, PORF, ["Cu", "Mo"], 38, 36, "38–36 Ma (mayoría de los grandes pórfidos del cinturón)", "cinturon", "", "Stocks porfídicos granodioríticos a monzoníticos cuarcíferos; capa de alteración argílica avanzada tardía", "183–185"),
    ("Ujina", ["ujina"], -20.96, -68.68, PORF, ["Cu", "Mo"], 38, 36, "38–36 Ma (mayoría de los grandes pórfidos del cinturón)", "cinturon", "", "Stocks porfídicos granodioríticos a monzoníticos cuarcíferos", "183–185"),
    ("Quebrada Blanca", ["quebrada blanca"], -21.00, -68.81, PORF, ["Cu", "Mo"], 38, 36, "38–36 Ma (mayoría de los grandes pórfidos del cinturón)", "cinturon", "", "Stocks porfídicos; brecha con matriz de turmalina", "183–185"),
    ("El Abra", ["el abra"], -21.92, -68.83, PORF, ["Cu", "Mo"], 38, 36, "38–36 Ma (mayoría de los grandes pórfidos del cinturón)", "cinturon", "Granodiorita Sur (precursor plutónico)", "Stocks porfídicos en la Granodiorita Sur; brecha con matriz de biotita", "183–185"),
    ("Cerro Zaldívar", ["zaldivar"], -24.22, -69.08, PORF, ["Cu"], 38, 36, "38–36 Ma (mayoría de los grandes pórfidos del cinturón)", "cinturon", "", "Stocks porfídicos granodioríticos a monzoníticos cuarcíferos", "183–185"),
    ("La Escondida", ["escondida"], -24.27, -69.07, PORF, ["Cu", "Mo"], 38, 36, "38–36 Ma (mayoría de los grandes pórfidos del cinturón)", "cinturon", "", "Stocks porfídicos; domo y dique riolíticos postmineralización; capa de alteración argílica avanzada", "183–185"),
    ("Potrerillos", ["potrerillos"], -26.43, -69.47, PORF, ["Cu", "Mo"], 38, 36, "38–36 Ma (mayoría de los grandes pórfidos del cinturón)", "cinturon", "", "Stocks porfídicos granodioríticos a monzoníticos cuarcíferos", "183–185"),
    ("El Salvador", ["el salvador"], -26.25, -69.57, PORF, ["Cu", "Mo"], 42, 41, "42–41 Ma", "dep", "", "Intrusiones porfídicas pre, sin y postmineralización (diques latíticos); capa de alteración argílica avanzada", "183–185"),
    ("Chuquicamata", ["chuquicamata"], -22.29, -68.90, PORF, ["Cu", "Mo"], 34, 31, "34–31 Ma (pórfidos más jóvenes y más ricos del cinturón)", "dep", "Complejo Granodiorítico Fortuna (precursor plutónico)", "Pórfidos en el Complejo Granodiorítico Fortuna; superposición de alteración potásica y fílica controlada por falla", "183–185"),
    ("Radomiro Tomic", ["radomiro tomic"], -22.22, -68.90, PORF, ["Cu", "Mo"], 34, 31, "34–31 Ma (pórfidos más jóvenes y más ricos del cinturón)", "dep", "", "Stocks porfídicos granodioríticos a monzoníticos cuarcíferos", "183–185"),
    # --- Mioceno tardío–Plioceno temprano, Chile central ---
    ("El Teniente", ["teniente"], -34.09, -70.35, PORF, ["Cu", "Mo"], 6.46, 4.37, "6,46–4,37 Ma (Deckart et al. 2003; Maksaev et al. 2004)", "dep", "Rocas máficas miocenas (andesíticas–basálticas–gabroicas)", "Más de 70 % de la mena en rocas máficas miocenas biotitizadas; brecha Braden", "184–185"),
    ("Río Blanco–Los Bronces", ["rio blanco", "los bronces"], -33.15, -70.28, PORF, ["Cu", "Mo"], 6.46, 4.37, "6,46–4,37 Ma (Deckart et al. 2003; Maksaev et al. 2004)", "dep", "Batolito San Francisco (Mioceno Medio) y rocas volcánicas miocenas", "Granodiorita del Batolito San Francisco y volcanitas miocenas; ~50 % de la mena en matriz de brechas hidrotermales", "184–185"),
    ("Los Pelambres", ["pelambres"], -31.71, -70.50, PORF, ["Cu", "Mo"], 13, 10, "~13–10 Ma (Bertens et al. 2003)", "dep", "Rocas volcánicas y sedimentarias del Cretácico Inferior", "Stocks porfídicos en rocas volcánicas y sedimentarias del Cretácico Inferior", "184–185"),
    # --- Paleoceno–Eoceno temprano ---
    ("Cerro Colorado", ["cerro colorado"], -20.00, -69.25, PORF, ["Cu", "Mo"], 55.5, 52.8, "52,8 Ma (Ar/Ar) y 55,5 Ma (Re–Os en molibdenita)", "dep", "Andesitas cretácicas", "Pórfidos tonalíticos y monzoníticos en una secuencia de andesitas del Cretácico", "186"),
    ("Mocha", ["mocha"], -19.82, -69.28, PORF, ["Cu", "Mo"], 60, 50, "Cinturón del Paleoceno–Eoceno temprano (60–50 Ma)", "cinturon", "", "", "186"),
    ("Spence", ["spence"], -22.78, -69.28, PORF, ["Cu", "Mo"], 57.0, 56.6, "57,0 y 56,6 Ma (Ar/Ar en biotita magmática)", "dep", "Pórfidos dacíticos paleocenos", "Tres stocks de pórfido dacítico paleoceno con brechas con turmalina bajo ~70 m de gravas; el enriquecimiento supérgeno es de 44–28 Ma", "186"),
    ("Sierra Gorda", ["sierra gorda"], -22.88, -69.32, PORF, ["Cu", "Mo"], 60, 50, "Cinturón del Paleoceno–Eoceno temprano (60–50 Ma)", "cinturon", "", "Brecha de turmalina Copucha", "186"),
    ("Lomas Bayas", ["lomas bayas"], -23.43, -69.51, PORF, ["Cu"], 60, 50, "Cinturón del Paleoceno–Eoceno temprano (60–50 Ma)", "cinturon", "", "", "186"),
    ("Polo Sur", ["polo sur"], -23.19, -69.32, PORF, ["Cu", "Mo"], 60, 50, "Cinturón del Paleoceno–Eoceno temprano (60–50 Ma)", "cinturon", "", "", "186"),
    # --- Cretácico Inferior ---
    ("Andacollo", ["andacollo"], -30.23, -71.09, PORF, ["Cu", "Au"], 112, 98, "112 ± 10 a 98 ± 2 Ma (K–Ar en biotita y roca total)", "dep", "Rocas volcánicas aptiano–albianas", "Rocas volcánicas andesíticas y dacíticas del Aptiano–Albiano y pequeños stocks de pórfido tonalítico potásico", "187"),
    ("Dos Amigos (Domeyko)", ["dos amigos"], -28.98, -70.88, PORF, ["Cu"], 132, 97, "Cinturón del Cretácico Inferior (132–97 Ma)", "cinturon", "", "", "186–187"),
    ("Galenosa", ["galenosa"], -21.97, -69.81, PORF, ["Cu"], 132, 97, "Cinturón del Cretácico Inferior (132–97 Ma)", "cinturon", "", "", "186–187"),
    ("Puntillas", ["puntillas"], -22.03, -69.77, PORF, ["Cu"], 132, 97, "Cinturón del Cretácico Inferior (132–97 Ma)", "cinturon", "", "", "186–187"),
    # --- Epitermales miocenos ---
    ("El Indio", ["el indio"], -29.77, -69.98, EPI, ["Au", "Ag", "Cu"], 7.62, 6.21, "7,62 ± 0,29 y 6,21 ± 0,26 Ma (Ar/Ar; Bissig et al.)", "dep", "Toba Amiga (27–21 Ma)", "Toba riolítica a dacítica miocena", "188–189"),
    ("El Tambo", ["tambo"], -29.78, -69.95, EPI, ["Au", "Ag", "Cu"], 8.24, 7.08, "8,24 ± 0,29 a 7,08 ± 0,19 Ma (Ar/Ar; Bissig et al.)", "dep", "Rocas volcánicas miocenas", "Brechas con mena y alteración argílica avanzada", "188–189"),
    ("Pascua", ["pascua"], -29.32, -70.02, EPI, ["Au", "Ag"], 8.73, 8.10, "8,73 ± 0,23 y 8,10 ± 0,19 Ma (Ar/Ar; Bissig et al.)", "dep", "Granito y riolita del Paleozoico Superior", "Granito y riolita del Paleozoico Superior; diseminación y stockwork de oro", "188–189"),
    ("Choquelimpie", ["choquelimpie"], -18.30, -69.28, EPI, ["Au", "Ag"], 6.8, 6.4, "Estratovolcán huésped fechado en 6,6 ± 0,2 Ma (Gröpper et al. 1991)", "asoc", "Complejo de domos dacíticos en un estratovolcán andesítico", "Brechas en un complejo de domos dacíticos", "189"),
    ("La Coipa", ["coipa"], -26.83, -69.27, EPI, ["Ag", "Au"], 24, 22, "Complejos de domos dacíticos de 22–24 Ma asociados (Oviedo et al. 1991; Moscoso et al. 1993)", "asoc", "Dacitas miocenas sobre lutitas triásicas", "Dacita miocena que continúa en el basamento de lutitas triásicas; mineralización diseminada", "189"),
    ("La Pepa", ["la pepa"], -27.26, -69.27, EPI, ["Au", "Cu"], 24, 22, "24–22 Ma (Maricunga)", "dep", "Edificios volcánicos miocenos de Maricunga", "Sistema de vetas controlado por fallas", "189"),
    ("Refugio", ["refugio"], -27.38, -69.27, PORF, ["Au", "Cu"], 24, 22, "24–22 Ma (Maricunga)", "dep", "Edificios volcánicos miocenos de Maricunga", "Pórfido de Au en edificio volcánico mioceno", "189, 195"),
    ("Marte", ["marte"], -27.17, -69.02, PORF, ["Au", "Cu"], 14, 13, "14–13 Ma (Maricunga)", "dep", "Volcán Pastillitos (cono parásito del Copiapó)", "Pórfido de Au en el núcleo del volcán Pastillitos", "189, 195"),
    ("Lobo", ["lobo"], -27.23, -69.03, PORF, ["Au", "Cu"], 14, 13, "14–13 Ma (Maricunga)", "dep", "Edificios volcánicos miocenos de Maricunga", "Pórfido de Au en edificio volcánico mioceno", "189, 195"),
    ("Cerro Casale", ["casale"], -27.78, -69.28, PORF, ["Au", "Cu"], 14, 13, "14–13 Ma (Maricunga)", "dep", "Edificios volcánicos miocenos de Maricunga", "Pórfido de Au con brecha hidrotermal rica (17,7 g/t Au y 1,5 % Cu en un sondaje)", "189, 195"),
    # --- Paleoceno–Eoceno temprano, metales preciosos ---
    ("El Guanaco", ["guanaco"], -25.11, -69.53, EPI, ["Au"], 66, 48, "Cinturón del Paleoceno–Eoceno temprano", "cinturon", "Rocas volcánicas paleógenas (caldera)", "Vetas epitermales de alta sulfidación, asociadas a calderas volcánicas", "189"),
    ("Cachinal de la Sierra", ["cachinal"], -24.96, -69.53, EPI, ["Ag"], 66, 48, "Cinturón del Paleoceno–Eoceno temprano", "cinturon", "Rocas volcánicas paleógenas (caldera)", "Vetas meso- a epitermales de plata en una caldera volcánica", "189"),
    ("Caracoles", ["caracoles"], -23.05, -69.00, VETA, ["Ag"], 66, 48, "Cinturón del Paleoceno–Eoceno temprano", "cinturon", "Rocas volcánicas paleógenas", "Vetas meso- a epitermales de plata", "189"),
    ("Challacollo", ["challacollo"], -20.95, -69.34, VETA, ["Ag"], 66, 48, "Cinturón del Paleoceno–Eoceno temprano", "cinturon", "Rocas volcánicas paleógenas", "Vetas meso- a epitermales de plata", "189"),
    ("Vaquillas", ["vaquillas"], -25.38, -69.30, VETA, ["Ag", "Pb"], 66, 48, "Cinturón del Paleoceno–Eoceno temprano", "cinturon", "Rocas volcánicas paleógenas", "Vetas meso- a epitermales de plata", "189"),
    # --- IOCG ---
    ("Candelaria", ["candelaria"], -27.52, -70.38, IOCG, ["Cu", "Au"], 115.2, 114.1, "114,2 y 115,2 Ma (Re–Os en molibdenita); 115,14 Ma (Ar/Ar en biotita)", "dep", "Formación Punta del Cobre (andesitas del Cretácico Inferior)", "Andesitas y brechas de toba andesítica del Cretácico Inferior, en el aureola de contacto de un batolito granodiorítico de 117–110 Ma", "190–191"),
    ("Punta del Cobre", ["punta del cobre"], -27.50, -70.17, IOCG, ["Cu", "Au"], 115.2, 110.7, "Edades Ar/Ar de 115–110,7 Ma (Punta del Cobre–Candelaria)", "dep", "Formación Punta del Cobre (andesitas del Cretácico Inferior)", "Vetas, brechas tabulares, stockwork y mantos con ganga de óxidos de hierro", "190–191"),
    ("Manto Verde", ["manto verde", "mantoverde"], -26.55, -70.22, IOCG, ["Cu", "Au"], 128.9, 126.4, "128,9 ± 0,6 Ma (U–Pb en circón) y 126,4 ± 0,5 Ma (U–Pb en titanita) del dique asociado", "dep", "Plutón Sierra Dieciocho y rocas volcánicas", "Brechas con matriz de especularita y magnetita en el Sistema de Falla de Atacama", "191"),
    # --- IOA ---
    ("El Romeral", ["romeral"], -29.71, -71.25, IOA, ["Fe"], 112, 108, "112–108 Ma (K–Ar; Munizaga et al. 1985)", "dep", "Metandesitas del Cretácico Inferior", "Metandesitas del Cretácico Inferior junto a plutones dioríticos a granodioríticos de 100–120 Ma", "191–192"),
    ("El Laco", ["el laco"], -23.84, -67.50, IOA, ["Fe"], 5.3, 2.6, "Estratovolcán pliocénico (Mioceno tardío–Plioceno)", "asoc", "Estratovolcán pliocénico", "Siete cuerpos de magnetita masiva en un estratovolcán", "191"),
    # --- Estratoligados de Cu–(Ag) ---
    ("Mantos Blancos", ["mantos blancos"], -23.43, -70.06, ESTR, ["Cu", "Ag"], 150, 140, "~150–140 Ma (K–Ar y Rb–Sr mínimos, grupo jurásico)", "dep", "Formación La Negra (Jurásico)", "Suite bimodal riolítica–andesítica: sills, diques y brechas intrusivas mineralizados", "192–194"),
    ("Susana (Michilla)", ["susana"], -22.67, -70.16, ESTR, ["Cu", "Ag"], 150, 140, "~150–140 Ma (grupo jurásico de la Cordillera de la Costa)", "dep", "Formación La Negra (Jurásico)", "Lavas basálticas a andesíticas porfídicas y brechas, en la parte amigdaloide", "192–194"),
    ("Juárez (Michilla)", ["juarez"], -22.74, -70.22, ESTR, ["Cu", "Ag"], 150, 140, "~150–140 Ma (grupo jurásico de la Cordillera de la Costa)", "dep", "Formación La Negra (Jurásico)", "Lavas basálticas a andesíticas porfídicas; mena casi solo de óxidos", "192–194"),
    ("Buena Esperanza", ["buena esperanza"], -22.51, -70.23, ESTR, ["Cu", "Ag"], 150, 140, "~150–140 Ma (grupo jurásico de la Cordillera de la Costa)", "dep", "Formación La Negra (Jurásico)", "Lavas basálticas a andesíticas con brecha central; mena solo de sulfuros", "192–194"),
    ("El Soldado", ["el soldado"], -32.61, -71.13, ESTR, ["Cu"], 106, 100.5, "106 ± 1,1 a 100,5 ± 1,5 Ma (media 103 Ma, Ar/Ar en feldespato K hidrotermal; Wilson et al. 2003)", "dep", "Miembro Superior de la Formación Lo Prado (Cretácico Inferior)", "Riolitas, basaltos, tobas y sedimentitas del Miembro Superior de la Formación Lo Prado", "193–194"),
    ("Lo Aguirre", ["lo aguirre"], -33.45, -70.93, ESTR, ["Cu"], 113, 102, "102 ± 5 Ma (Ar/Ar en albita); 110 ± 4 Ma (K–Ar) y 113 ± 3 Ma (Rb–Sr)", "dep", "Formación Veta Negra (Aptiano–Albiano)", "Lavas andesíticas y brechas de la Formación Veta Negra", "194"),
    # --- vetas de Cu en batolitos jurásicos ---
    ("Distrito Tocopilla", ["tocopilla"], -22.09, -70.20, VETA, ["Cu"], 167, 140, "167–140 Ma (K–Ar y Ar/Ar de los batolitos jurásicos huéspedes)", "asoc", "Batolitos jurásicos dioríticos a granodioríticos", "Vetas de cobre con óxidos de hierro en batolitos del Jurásico Superior (veta Minita–Despreciada)", "195"),
    ("Distrito Gatico", ["gatico"], -22.50, -70.25, VETA, ["Cu"], 167, 140, "167–140 Ma (K–Ar y Ar/Ar de los batolitos jurásicos huéspedes)", "asoc", "Batolitos jurásicos dioríticos a granodioríticos", "Vetas de cobre con óxidos de hierro en batolitos del Jurásico Superior (veta Toldo–Velarde)", "195"),
]

REF = "Maksaev, Townley, Palacios y Camus (2007), «Metallic ore deposits», cap. 6 de The Geology of Chile, pp. 179–200"
