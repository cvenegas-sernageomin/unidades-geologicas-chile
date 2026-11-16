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
SKARN = "Skarn"
HIDRO = "Brecha hidrotermal con turmalina"


def M07(pp):
    return f"Maksaev et al. (2007), cap. 6, págs. {pp}"


def M01(pp):
    return f"Maksaev (2001), «Reseña metalogénica de Chile» (apuntes del curso, U. de Chile), {pp}"


MK_ES = "Maksaev, apuntes del curso (U. de Chile), cap. 13 «El Salvador»"
MK_FE = "Maksaev, apuntes del curso, cap. 19 «Yacimientos de hierro chilenos»; Townley, presentación «Fe chilenos» (DEGY 2011)"
MK_FECUAU = "Maksaev, apuntes del curso, cap. 20 «Óxidos de Fe–Cu–Au»"
MK_EST = "Maksaev, apuntes del curso, cap. 18 «Yacimientos estratoligados de Cu»"
MK_EPI = "Maksaev, apuntes del curso, cap. 16 «Depósitos epitermales»"
MK_SKARN = "Maksaev, apuntes del curso, cap. 15 «Skarn»; Townley, presentación «Skarns» (DEGY 2011)"
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
    ("Potrerillos", ["potrerillos"], -26.43, -69.47, PORF, ["Cu", "Mo"], 35.68, 35.62, "35,65 ± 0,03 Ma (Marsh et al. 1997, citado en Maksaev 2001)", "dep", "", "Stocks porfídicos granodioríticos a monzoníticos cuarcíferos", M01("p. 38") + "; " + M07("183–185")),
    ("El Salvador", ["el salvador"], -26.25, -69.57, PORF, ["Cu", "Mo"], 42.4, 41.2, "Re–Os en molibdenita 42,2 ± 0,19 y 42,0 ± 0,20 Ma; isocrona Re–Os de sulfuros tardíos 42,37 ± 0,45 Ma; dique latítico postmineral 41,2 Ma; en otros apuntes, 41 ± 2 Ma (Eoceno Superior)", "dep", "Andesitas cretácicas y pórfidos riolítico (44–43 Ma) y granodiorítico (43–42 Ma)", "Complejo intrusivo porfídico que intruye andesitas y sedimentitas clásticas del Cretácico; diques latíticos postmineralización; capa de alteración argílica avanzada", "Watanabe y Hedenquist (2001), Econ. Geol. 96 (carpeta Townley); " + MK_ES + "; " + M07("183–185")),
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
    ("Pascua", ["pascua"], -29.32, -70.02, EPI, ["Au", "Ag"], 9.2, 7.83, "Ar/Ar en alunita: etapa I 9,0 ± 0,2 Ma; etapa II 8,6 ± 0,4 y 8,76 ± 0,63 Ma; diques riodacíticos que cortan la mena 7,83–7,86 Ma; mineralización principal entre 8,76 y 7,85 Ma (Bissig et al. 2001; Chouinard et al. 2005)", "dep", "Granitos del Triásico Superior (191–193 Ma) y riolita", "Granitos del Triásico Superior («complejo intrusivo Pascua-Lama») y riolita; diseminación, brechas y stockwork de Au–Ag–Cu con alteración argílica avanzada", "Chouinard et al. (2005), Econ. Geol. 100 (carpeta Townley); " + M07("188–189")),
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
    ("Candelaria", ["candelaria"], -27.52, -70.38, IOCG, ["Cu", "Au"], 116.5, 110.7, "Re–Os en molibdenita 114,2 y 115,2 Ma; Ar/Ar en biotita 116,5 (temprana), 115,14 (asociada a calcopirita–pirita), 114,9 y 114,2 Ma; Ar/Ar 111,7 Ma en anfíbola asociada a calcopirita y 111,0–110,7 Ma en biotita (evento posterior o de cizalle)", "dep", "Formación Punta del Cobre (Jurásico Superior–Cretácico Inferior)", "Tobas y andesitas de la Formación Punta del Cobre, en el aureola de contacto de un batolito granodiorítico de 117–110 Ma; cuerpos mantiformes o lenticulares", M07("190–191") + "; Townley, presentación «Fe-Cu-Au chilenos» (DEGY 2011); " + MK_FECUAU),
    ("Punta del Cobre", ["punta del cobre"], -27.50, -70.17, IOCG, ["Cu", "Au"], 115.2, 110.7, "Edades Ar/Ar de 115–110,7 Ma (Punta del Cobre–Candelaria)", "dep", "Formación Punta del Cobre (andesitas del Cretácico Inferior)", "Vetas, brechas tabulares, stockwork y mantos con ganga de óxidos de hierro", "190–191"),
    ("Manto Verde", ["manto verde", "mantoverde"], -26.55, -70.22, IOCG, ["Cu", "Au"], 128.9, 126.4, "128,9 ± 0,6 Ma (U–Pb en circón) y 126,4 ± 0,5 Ma (U–Pb en titanita) del dique asociado", "dep", "Plutón Sierra Dieciocho y rocas volcánicas", "Brechas con matriz de especularita y magnetita en el Sistema de Falla de Atacama", "191"),
    # --- IOA ---
    ("El Romeral", ["romeral"], -29.71, -71.25, IOA, ["Fe"], 112, 108, "112–108 Ma (K–Ar; Munizaga et al. 1985)", "dep", "Metandesitas del Cretácico Inferior", "Metandesitas del Cretácico Inferior junto a plutones dioríticos a granodioríticos de 100–120 Ma", "191–192"),
    ("El Laco", ["el laco"], -23.84, -67.50, IOA, ["Fe"], 2.3, 1.8, "Pico Laco (huésped) fechado en 2,0 ± 0,3 Ma (K–Ar en roca total; Gardeweg y Ramírez 1985) y 2,1 ± 0,1 Ma (trazas de fisión en apatito; Maksaev et al. 1988)", "asoc", "Estratovolcán pliocénico (Pico Laco)", "Siete cuerpos de magnetita–apatito masiva en un aparato volcánico andesítico a riodacítico", M07("191") + "; " + MK_FE),
    # --- Estratoligados de Cu–(Ag) ---
    ("Mantos Blancos", ["mantos blancos"], -23.43, -70.06, ESTR, ["Cu", "Ag"], 150, 147, "~150 Ma (isocrona Rb–Sr en rocas alteradas; Tassinari et al. 1993); diques andesíticos que cortan la mena: 147–149 ± 13 Ma (K–Ar; Chávez 1985)", "dep", "Andesitas y cuarzo-dacitas jurásicas (Formación La Negra)", "Andesitas y cuarzo-dacitas intruidas por filones manto y diques dioríticos; suite bimodal riolítica–andesítica; el depósito más oriental de la franja jurásica", M07("192–194") + "; " + MK_EST + "; Townley, apunte del curso (2006)"),
    ("Susana (Michilla)", ["susana"], -22.67, -70.16, ESTR, ["Cu", "Ag"], 160, 140, "Pulsos de mineralización entre ~160 y ~140 Ma en el distrito de Michilla (Re–Os 160 ± 16 Ma en Lince–Estefanía; Tristá-Aguilera et al. 2006)", "dep", "Formación La Negra (Jurásico)", "Cuerpos mantiformes de hasta ≥100 m desde la brecha Susana, en lavas basálticas a andesíticas porfídicas", M07("192–194") + "; Tristá-Aguilera et al. (2006), Miner. Deposita 41; Townley et al. (2007), Miner. Deposita 42"),
    ("Juárez (Michilla)", ["juarez"], -22.74, -70.22, ESTR, ["Cu", "Ag"], 154.4, 138.1, "Ar/Ar en minerales de alteración: 138,1 ± 2,0 a 154,4 ± 3,9 Ma (Oliveros 2005, citado en Tristá-Aguilera et al. 2006)", "dep", "Formación La Negra (Jurásico)", "Lavas basálticas a andesíticas porfídicas; mena casi solo de óxidos", "Tristá-Aguilera et al. (2006), Miner. Deposita 41, pp. 99–105; " + M07("192–194")),
    ("Buena Esperanza", ["buena esperanza"], -22.51, -70.23, ESTR, ["Cu", "Ag"], 150, 140, "~150–140 Ma (grupo jurásico de la Cordillera de la Costa)", "dep", "Formación La Negra (Jurásico)", "Lavas basálticas a andesíticas con brecha central; mena solo de sulfuros", "192–194"),
    ("El Soldado", ["el soldado"], -32.61, -71.13, ESTR, ["Cu"], 106, 100.5, "106 ± 1,1 a 100,5 ± 1,5 Ma (media 103 Ma, Ar/Ar en feldespato K hidrotermal; Wilson et al. 2003)", "dep", "Miembro Superior de la Formación Lo Prado (Cretácico Inferior)", "Riolitas, basaltos, tobas y sedimentitas del Miembro Superior de la Formación Lo Prado", "193–194"),
    ("Lo Aguirre", ["lo aguirre"], -33.45, -70.93, ESTR, ["Cu"], 113, 102, "102 ± 5 Ma (Ar/Ar en albita); 110 ± 4 Ma (K–Ar) y 113 ± 3 Ma (Rb–Sr)", "dep", "Formación Veta Negra (Aptiano–Albiano)", "Lavas andesíticas y brechas de la Formación Veta Negra", "194"),
    # --- vetas de Cu en batolitos jurásicos ---
    ("Distrito Tocopilla", ["tocopilla"], -22.09, -70.20, VETA, ["Cu"], 167, 140, "167–140 Ma (K–Ar y Ar/Ar de los batolitos jurásicos huéspedes)", "asoc", "Batolitos jurásicos dioríticos a granodioríticos", "Vetas de cobre con óxidos de hierro en batolitos del Jurásico Superior (veta Minita–Despreciada)", "195"),
    ("Distrito Gatico", ["gatico"], -22.50, -70.25, VETA, ["Cu"], 167, 140, "167–140 Ma (K–Ar y Ar/Ar de los batolitos jurásicos huéspedes)", "asoc", "Batolitos jurásicos dioríticos a granodioríticos", "Vetas de cobre con óxidos de hierro en batolitos del Jurásico Superior (veta Toldo–Velarde)", "195"),
    # --- ampliación con los apuntes de Maksaev (curso U. de Chile) y de Townley (DEGY 2011) y los artículos de su carpeta ---
    ("El Hueso (Potrerillos)", ["el hueso"], -26.49, -69.39, EPI, ["Au"], 40.30, 40.20, "40,25 ± 0,05 Ma (Marsh et al. 1997, citado en Maksaev 2001): unos 5 Ma más antiguo que el pórfido de Potrerillos (35,65 Ma), de la misma época metalogénica", "dep", "Calizas silicificadas", "Oro epitermal en calizas silicificadas (agotado); evento de mineralización separado del pórfido de Potrerillos", M01("p. 38")),
    ("Chimborazo", ["chimborazo"], -24.15, -69.14, PORF, ["Cu", "Au"], 38, 36, "38–36 Ma (mayoría de los grandes pórfidos del cinturón)", "cinturon", "", "Pórfido no explotado del cinturón del Eoceno Superior–Oligoceno Inferior", M07("183–185") + "; " + M01("p. 38")),
    ("Santa Cecilia (Maricunga)", ["santa cecilia"], -27.69, -69.34, PORF, ["Au", "Cu"], 24, 22, "24–22 Ma (Maricunga; grupo del Mioceno Inferior)", "dep", "Edificios volcánicos miocenos de Maricunga", "Pórfido de Au en edificio volcánico mioceno", M07("189, 195") + "; " + M01("p. 39")),
    ("El Bronce de Petorca", ["el bronce"], -32.18, -70.94, EPI, ["Au", "Ag", "Cu", "Pb", "Zn"], 86, 79, "86–79 Ma: veta epitermal polimetálica y brecha cuprífera Dulcinea (K–Ar: pórfido de Petorca 86 ± 3; dique anular 80–79; alteración 82–79; sericita 79 ± 3 Ma; Camus et al. 1991)", "dep", "Formación Lo Valle y pórfido de Petorca (Cretácico Superior)", "Tobas dacíticas y flujos andesíticos de la Formación Lo Valle (83–80 Ma) y pórfido de Petorca, en la caldera Morro Hediondo", "Camus et al. (1991), Econ. Geol. 86 (carpeta Townley); " + MK_EPI + "; " + M01("p. 36")),
    ("Río del Medio", ["rio del medio"], -29.73, -69.98, EPI, ["Au", "Ag", "Pb", "Zn"], 7.27, 6.89, "7,08 ± 0,19 Ma (Ar/Ar; Bissig et al.)", "dep", "Andesitas miocenas cloritizadas", "Veta de cuarzo–rodocrosita bandeada de baja sulfidación, 4,5 km al norte de El Indio, en andesitas miocenas oscuras cloritizadas", M07("188–189") + "; " + MK_EPI),
    ("Fachinal", ["fachinal"], -46.51, -71.97, EPI, ["Au", "Ag"], 201.4, 143.1, "Jurásico (único epitermal jurásico de la lista de Maksaev, apuntes)", "dep", "", "", MK_EPI),
    ("San Cristóbal (Antofagasta)", ["san cristobal"], -23.53, -69.58, EPI, ["Au"], 66, 48, "Cinturón del Paleoceno–Eoceno temprano", "cinturon", "Rocas volcánicas paleógenas", "Vetas epitermales auríferas de baja sulfidación", M07("189") + "; " + M01("p. 37")),
    ("Cachiyuyo de Llampos", ["cachiyuyo de llampos"], -27.08, -69.97, HIDRO, ["Cu", "Mo"], 66, 56, "Plutones granodioríticos paleocenos que alojan las brechas (distritos San Pedro de Cachiyuyo, Cachiyuyo de Llampos, Los Azules y Cabeza de Vaca)", "asoc", "Plutones granodioríticos equigranulares del Paleoceno", "Chimeneas verticales de brecha con matriz de turmalina (<100 m de diámetro); mineralización de Cu–Mo en la matriz, a veces con Au o W", M07("186") + "; " + M01("p. 37")),
    ("Lince–Estefanía (Michilla)", ["lince"], -22.68, -70.18, ESTR, ["Cu", "Ag"], 160, 140, "Isocrona Re–Os 160 ± 16 Ma (calcosina y calcosina–bornita; primera edad directa de la mena); pulsos entre ~160 y ~140 Ma", "dep", "Formación La Negra (Jurásico)", "Lavas basálticas a andesíticas; calcosina y bornita hipógenas, óxidos sobre ~500 m s.n.m.", "Tristá-Aguilera et al. (2006), Miner. Deposita 41, pp. 99–105; Townley et al. (2007), Miner. Deposita 42"),
    # franja ferrífera (Albiano ~110–100 Ma) y skarns del Cretácico Inferior
    ("Cerro Imán", ["cerro iman"], -27.26, -70.42, IOA, ["Fe"], 110, 100, "Franja ferrífera chilena (26–32°S): intrusivos del Albiano, ~110–100 Ma", "cinturon", "Metaandesitas del Cretácico Inferior", "Magnetita–apatito en metaandesitas del Cretácico Inferior junto a plutones dioríticos a granodioríticos del Albiano; Sistema de Falla de Atacama", MK_FE),
    ("El Tofo", ["el tofo"], -29.45, -71.24, IOA, ["Fe"], 110, 100, "Franja ferrífera chilena (26–32°S): intrusivos del Albiano, ~110–100 Ma", "cinturon", "Metaandesitas del Cretácico Inferior", "Magnetita–apatito en metaandesitas del Cretácico Inferior junto a plutones dioríticos a granodioríticos del Albiano", MK_FE),
    ("El Algarrobo", ["algarrobo"], -28.79, -70.99, IOA, ["Fe"], 112, 108, "112–108 Ma (K–Ar; Munizaga et al. 1985) en las minas explotadas de la franja ferrífera", "dep", "Metaandesitas del Cretácico Inferior", "Tipo Algarrobo: cuerpos irregulares en rocas volcánicas cerca de contactos con intrusivos (los de mayor tamaño y los únicos en explotación)", M07("191–192") + "; " + MK_FE),
    ("Los Colorados (Huasco)", ["los colorados"], -28.31, -70.82, IOA, ["Fe"], 112, 108, "112–108 Ma (K–Ar; Munizaga et al. 1985) en las minas explotadas de la franja ferrífera", "dep", "Metaandesitas del Cretácico Inferior", "Tipo Algarrobo: cuerpos irregulares en rocas volcánicas cerca de contactos con intrusivos; en explotación desde 1998 (reservas 245 Mt, 48 % Fe)", M07("191–192") + "; " + MK_FE),
    ("Manolete", ["manolete"], -27.58, -70.35, SKARN, ["Fe"], 143.1, 100.5, "Skarn en rocas calcáreas del Neocomiano, intruidas por plutones cretácicos o terciarios (edad del huésped; la del skarn no está medida)", "asoc", "Grupo Chañarcillo (Neocomiano)", "Rocas calcáreas marinas skarnificadas", MK_SKARN),
    ("Las Pintadas", ["las pintadas"], -27.57, -70.32, SKARN, ["Fe"], 143.1, 100.5, "Skarn en rocas calcáreas del Neocomiano, intruidas por plutones cretácicos o terciarios (edad del huésped; la del skarn no está medida)", "asoc", "Grupo Chañarcillo (Neocomiano)", "Rocas calcáreas marinas skarnificadas", MK_SKARN),
    ("Recompensa (Copiapó)", ["recompensa"], -27.57, -70.33, SKARN, ["Fe"], 143.1, 100.5, "Skarn en rocas calcáreas del Neocomiano, intruidas por plutones cretácicos o terciarios (edad del huésped; la del skarn no está medida)", "asoc", "Grupo Chañarcillo (Neocomiano)", "Rocas calcáreas marinas skarnificadas", MK_SKARN),
    ("Distrito Cabildo", ["distrito cabildo"], -32.42, -71.07, SKARN, ["Cu"], 113, 100.5, "Skarns de Cu en el contacto con intrusivos albianos (Albiano, Cretácico Inferior alto)", "asoc", "Formación Lo Prado (Cretácico Inferior)", "Sulfuros de cobre en niveles calcáreos skarnificados de la Formación Lo Prado, cerca del contacto con intrusivos del Albiano", MK_SKARN + "; " + M01("p. 36")),
    ("Panulcillo", ["panulcillo"], -30.45, -71.21, SKARN, ["Cu"], 113, 100.5, "Skarn de Cu entre intrusivos del Albiano y calizas neocomianas (Albiano)", "asoc", "Calizas del Neocomiano (Cretácico Inferior)", "Niveles calcáreos de secuencias del Cretácico Inferior skarnificados", MK_SKARN + "; " + M01("p. 36")),
    ("El Toqui", ["el toqui"], -45.03, -71.94, SKARN, ["Zn", "Pb", "Au"], 143.1, 100.5, "Skarn de Zn–Pb–(Au) en rocas calcáreas del Cretácico Inferior (edad del huésped; la del skarn no está medida)", "asoc", "Rocas calcáreas del Cretácico Inferior", "Rocas calcáreas skarnificadas; único productor de Zn de Chile", MK_SKARN),
    ("Chañarcillo", ["chanarcillo"], -27.81, -70.41, VETA, ["Ag"], 100.5, 66, "Franja metalogénica del Cretácico Superior (vetas mesotermales argentíferas); no medida en el distrito", "cinturon", "Calizas neocomianas (Grupo Chañarcillo)", "Vetas mesotermales de plata hospedadas en rocas carbonatadas neocomianas", M01("p. 36")),
    ("Arqueros", ["arqueros"], -29.84, -70.92, VETA, ["Ag"], 100.5, 66, "Franja metalogénica del Cretácico Superior (vetas mesotermales argentíferas); no medida en el distrito", "cinturon", "Rocas carbonatadas neocomianas (Formación Arqueros)", "Vetas mesotermales de plata hospedadas en rocas carbonatadas neocomianas", M01("p. 36")),
]

import re as _re
# las filas del capítulo traen solo las páginas: se completan con la cita
FILAS = [f[:-1] + ((M07(f[-1]),) if _re.fullmatch(r"[\d–, ]+", f[-1]) else (f[-1],)) for f in FILAS]

REF = "Maksaev, Townley, Palacios y Camus (2007), «Metallic ore deposits», cap. 6 de The Geology of Chile, pp. 179–200"
