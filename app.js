/* Unidades geológicas de Chile · visor: polígonos de las GDB y puntos por carta, filtros por tipo, litología, ambiente y
   edad (tabla cronoestratigráfica como en Fósiles de Chile), máquina del tiempo, diagrama tiempo–latitud y fichas con
   enlaces de correlación. Datos: data/*.json, generados por tools/armar_datos.py desde la tabla revisada. */
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, attrs, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat(Infinity)) if (h != null && h !== false) e.append(h.nodeType ? h : document.createTextNode(h));
  return e;
}
const poner = (dest, ...h) => { dest.replaceChildren(); for (const x of h.flat()) if (x) dest.append(x); };
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmt = n => n.toLocaleString('es-CL');
const ma = x => x == null ? '¿?' : x >= 100 ? fmt(Math.round(x)) : x >= 1 ? fmt(+x.toFixed(1)) : x >= 0.0117 ? fmt(+x.toFixed(3)) : `${fmt(Math.round(x * 1000))} ka`.replace(' ka', '') + ' ka';
const escMa = x => x < 0.0117 ? `${fmt(Math.round(x * 1e3 * 10) / 10)} ka` : `${ma(x)} Ma`;

const CLASES = [
  ['volc', 'Volcánicas', '#c0392b'], ['piro', 'Piroclásticas', '#e67e22'], ['clas', 'Sedimentarias clásticas', '#d4ac0d'],
  ['carb', 'Carbonatos y evaporitas', '#5dade2'], ['plut', 'Plutónicas', '#e84393'], ['subv', 'Subvolcánicas', '#a569bd'],
  ['meta', 'Metamórficas', '#27ae60'], ['depo', 'Depósitos no consolidados', '#bfb6a8']];
const CL = Object.fromEntries(CLASES.map(([k, n, c]) => [k, { n, c }]));
// tipos de unidad (columna «Categoría» de la tabla)
const TIPOS = [
  ['Formación', 'Formaciones', '#8e6c3f', 'Formación'], ['Estratos', 'Estratos', '#b08d57', 'Estratos'], ['Grupo', 'Grupos', '#6e4b2a', 'Grupo'],
  ['Miembro', 'Miembros', '#c9a66b', 'Miembro'], ['Secuencia', 'Secuencias y unidades', '#9a8f80', 'Secuencia o unidad'],
  ['Ignimbrita', 'Ignimbritas', '#e67e22', 'Ignimbrita'], ['Complejo', 'Complejos', '#16a085', 'Complejo'],
  ['Intrusivo', 'Intrusivos', '#e84393', 'Intrusivo'], ['Volcán / centro eruptivo', 'Volcanes', '#c0392b', 'Volcán o centro eruptivo'],
  ['Depósitos', 'Depósitos', '#bfb6a8', 'Depósitos']];
const tipoDe = u => u.cat === 'Unidad' ? 'Secuencia' : (TIPOS.some(t => t[0] === u.cat) ? u.cat : 'Secuencia');
const TIPO = Object.fromEntries(TIPOS.map(([k, n, c, s1]) => [k, { n, c, s1 }]));

let U = [], BYID = {}, POL = {}, CARTAS = {}, ICS = null, HOJAS = [], META = {};
const filtro = { q: '', tipos: new Set(), lito: new Set(), amb: '', int: null, rev: false, pol: false, gen: false };
let colorPor = 'edad', sel = null, escalaT = 'raiz';

/* ---------------- tabla cronoestratigráfica ---------------- */
const NIVELES = ['eon', 'era', 'periodo', 'epoca', 'piso'];
function armarICS(u) {
  const X = u.map(([id, nombre, tipo, base, techo, color]) => ({ id, nombre, tipo, base, techo, color, nivel: NIVELES.indexOf(tipo), hijos: [] }));
  const dentro = (h, p) => h.techo >= p.techo - 1e-6 && h.base <= p.base + 1e-6;
  for (const h of X) {
    let padre = null;
    for (const p of X) if (p.nivel < h.nivel && dentro(h, p) && (!padre || p.nivel > padre.nivel)) padre = p;
    h.padre = padre; if (padre) padre.hijos.push(h);
  }
  for (const x of X) x.hijos.sort((a, b) => a.techo - b.techo);
  for (const x of X) x.etiqueta = /^(Inferior|Medio|Superior|Temprano|Tardío)$/.test(x.nombre) && x.padre ? `${x.padre.nombre} ${x.nombre}` : x.nombre;
  const hojas = x => x.hijos.length ? x.hijos.flatMap(hojas) : [x];
  for (const x of X) x.nh = hojas(x).length;
  return { X, raices: X.filter(x => !x.padre).sort((a, b) => a.techo - b.techo), hojas: X.filter(x => !x.hijos.length).sort((a, b) => b.base - a.base) };
}
// color de la edad: el de la época (o período) que contiene el punto medio del rango
function icsDe(edad, nivelMax = 3) {
  let mejor = null;
  for (const x of ICS.X) if (x.nivel <= nivelMax && edad <= x.base && edad >= x.techo && (!mejor || x.nivel > mejor.nivel)) mejor = x;
  return mejor;
}
// punto medio para colorear: geométrico en rangos cortos (Holoceno–Pleistoceno), aritmético en los largos o que llegan a 0
const medio = u => u.mx == null ? null : u.mn > 0 && u.mx / u.mn < 10 ? Math.sqrt(u.mx * u.mn) : (u.mx + u.mn) / 2;

function colorDe(u) {
  if (colorPor === 'edad') return u._colEdad || '#9e9e9e';
  if (colorPor === 'tipo') return TIPO[tipoDe(u)].c;
  const k = u.cl.find(c => c !== 'depo') || u.cl[0];
  return k ? CL[k].c : '#9e9e9e';
}

/* ---------------- filtro ---------------- */
function pasaSinEdad(u) {
  if (!filtro.gen && u.gen) return false;
  if (filtro.rev && !u.rev) return false;
  if (filtro.pol && !POL[u.id]) return false;
  if (filtro.tipos.size && !filtro.tipos.has(tipoDe(u))) return false;
  if (filtro.lito.size && !u.cl.some(c => filtro.lito.has(c))) return false;
  if (filtro.amb && !u.amb.includes(filtro.amb)) return false;
  if (filtro.q && !u._txt.includes(filtro.q)) return false;
  return true;
}
const solapa = (u, b, t) => u.mx != null && u.mn < b - 1e-9 && u.mx > t + 1e-9 || (u.mx != null && u.mx === u.mn && u.mx <= b && u.mx >= t);
const pasa = u => pasaSinEdad(u) && (!filtro.int || solapa(u, filtro.int.base, filtro.int.techo));

/* ---------------- mapa ---------------- */
const mapa = L.map('mapa', { zoomControl: false, preferCanvas: true, minZoom: 3, worldCopyJump: true }).setView([-33, -70.5], 5);
L.control.zoom({ position: 'bottomright' }).addTo(mapa);
const BASES = {
  'Relieve (OpenTopoMap)': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 16, attribution: '© OpenStreetMap, SRTM · OpenTopoMap (CC-BY-SA)' }),
  'Gris claro (Esri)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: '© Esri, HERE, Garmin, © OpenStreetMap' }),
  'Satélite (Esri)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, attribution: 'Imágenes © Esri' }),
};
BASES['Gris claro (Esri)'].addTo(mapa);
const rend = L.canvas({ padding: 0.3, tolerance: 4 });
const capaPol = L.layerGroup().addTo(mapa), capaPts = L.layerGroup().addTo(mapa), capaSel = L.layerGroup().addTo(mapa);
const capaEnl = L.layerGroup().addTo(mapa);
L.control.layers(BASES, { 'Polígonos (GDB)': capaPol, 'Puntos por carta': capaPts }, { position: 'bottomright' }).addTo(mapa);
const LAYERS = {};  // id -> {pol, pts[]}

function construirCapas() {
  for (const u of U) {
    const L1 = LAYERS[u.id] = { pol: null, pts: [] };
    if (POL[u.id]) {
      L1.pol = L.polygon(POL[u.id].map(p => p.map(r => r.map(([x, y]) => [y, x]))), { renderer: rend, weight: 0.6, fillOpacity: 0.62 });
      L1.pol.on('click', ev => { L.DomEvent.stop(ev); elegir(u.id, false, ev.latlng); });
      L1.pol.bindTooltip(u.n, { sticky: true, className: 'etiqueta-u' });
    } else {
      for (const [x, y] of u.pts) {
        const m = L.circleMarker([y, x], { renderer: rend, radius: 4, weight: 0.8, color: '#2b2420', fillOpacity: 0.85 });
        m.on('click', ev => { L.DomEvent.stop(ev); elegir(u.id, false); });
        m.bindTooltip(u.n, { className: 'etiqueta-u' });
        L1.pts.push(m);
      }
    }
  }
}

function pintarMapa() {
  capaPol.clearLayers(); capaPts.clearLayers();
  const vis = U.filter(pasa);
  // primero las unidades viejas y grandes, encima las jóvenes
  vis.sort((a, b) => (b.mx ?? 0) - (a.mx ?? 0));
  for (const u of vis) {
    const L1 = LAYERS[u.id], c = colorDe(u);
    if (L1.pol) { L1.pol.setStyle({ color: shade(c, -0.35), fillColor: c }); capaPol.addLayer(L1.pol); }
    for (const m of L1.pts) { m.setStyle({ fillColor: c }); capaPts.addLayer(m); }
  }
  return vis;
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ---------------- leyenda ---------------- */
function pintarLeyenda(vis) {
  const caja = $('#leyenda');
  if (colorPor === 'edad') {
    const cuenta = new Map();
    for (const u of vis) { const x = u._icsPer; if (x) cuenta.set(x, (cuenta.get(x) || 0) + 1); }
    const per = [...cuenta.keys()].sort((a, b) => a.techo - b.techo);
    poner(caja, el('b', { onclick: plegarLeyenda }, 'Edad (período)'), per.map(x => el('div', {}, el('i', { style: `background:${x.color}` }), `${x.nombre} · ${cuenta.get(x)}`)),
      el('div', {}, el('i', { style: 'background:#9e9e9e' }), 'Sin edad reconocida'));
  } else if (colorPor === 'tipo') {
    poner(caja, el('b', { onclick: plegarLeyenda }, 'Tipo de unidad'), TIPOS.map(([k, n, c]) => el('div', {}, el('i', { style: `background:${c}` }), n)));
  } else {
    poner(caja, el('b', { onclick: plegarLeyenda }, 'Litología principal'), CLASES.map(([k, n, c]) => el('div', {}, el('i', { style: `background:${c}` }), n)));
  }
}

function plegarLeyenda() { $('#leyenda').classList.toggle('plegada'); }
if (matchMedia('(max-width: 760px)').matches) $('#leyenda').classList.add('plegada');

/* ---------------- panel: unidades ---------------- */
function pintarChips() {
  const cuentaT = {}, cuentaL = {};
  for (const u of U) if (!(!filtro.gen && u.gen)) { cuentaT[tipoDe(u)] = (cuentaT[tipoDe(u)] || 0) + 1; for (const c of u.cl) cuentaL[c] = (cuentaL[c] || 0) + 1; }
  poner($('#f-tipo'), TIPOS.map(([k, n, c]) => el('button', { class: 'chip' + (filtro.tipos.has(k) ? ' on' : ''), onclick: () => alternar(filtro.tipos, k) },
    el('i', { style: `background:${c}` }), n, el('small', {}, fmt(cuentaT[k] || 0)))));
  poner($('#f-lito'), CLASES.map(([k, n, c]) => el('button', { class: 'chip' + (filtro.lito.has(k) ? ' on' : ''), onclick: () => alternar(filtro.lito, k) },
    el('i', { style: `background:${c}` }), n, el('small', {}, fmt(cuentaL[k] || 0)))));
}
function alternar(set, k) { set.has(k) ? set.delete(k) : set.add(k); aplicar(); }

let LIM = 80;
function pintarLista(vis) {
  const conPol = vis.filter(u => POL[u.id]).length;
  poner($('#resumen'), el('b', {}, fmt(vis.length)), ` unidades a la vista · ${fmt(conPol)} con polígono · ${fmt(vis.length - conPol)} ubicadas por carta`,
    filtro.int ? el('div', {}, 'Edad: ', el('b', { style: 'font-size:1em' }, filtro.int.nombre), ` (${escMa(filtro.int.base)} – ${escMa(filtro.int.techo)}) `,
      el('button', { class: 'enlace', onclick: () => { filtro.int = null; aplicar(); } }, 'quitar')) : null);
  const orden = [...vis].sort((a, b) => (b.rev - a.rev) || (b.nf + b.cartas.length * 3) - (a.nf + a.cartas.length * 3));
  $('#lista-titulo').textContent = `Unidades (${fmt(vis.length)})`;
  poner($('#lista'), orden.slice(0, LIM).map(u => el('li', { onclick: () => elegir(u.id, true) },
    el('i', { style: `background:${colorDe(u)}` }),
    el('span', {}, u.n, u.rev ? el('em', {}, ' ✔') : null, el('small', {}, [u.edad.replace(/\[[^\]]*\]|\([^)]*CGCH[^)]*\)/g, '').slice(0, 70) || 'Edad sin dato', u.cl.length ? ' · ' + u.cl.map(c => CL[c].n.split(' ')[0]).join(', ') : ''].join(''))))),
    orden.length > LIM ? el('li', {}, el('button', { class: 'btn mas', onclick: e => { e.stopPropagation(); LIM += 200; pintarLista(vis); } }, `Ver ${fmt(Math.min(200, orden.length - LIM))} más`)) : null);
}

/* ---------------- panel: edad ---------------- */
function pintarTiempo() {
  const pasan = U.filter(pasaSinEdad), conEdad = pasan.filter(u => u.mx != null), sin = pasan.length - conEdad.length;
  const cuenta = x => conEdad.reduce((s, u) => s + solapa(u, x.base, x.techo), 0);
  const elegida = x => filtro.int?.id === x.id;
  const filas = [];
  const maxN = Math.max(1, ...ICS.hojas.map(cuenta));
  const celda = (x, hoja) => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(x.color.slice(i, i + 2), 16)), oscuro = 0.299 * r + 0.587 * g + 0.114 * b < 140;
    return el('td', { class: `ics-${x.tipo}` + (hoja ? ' ics-hoja' : '') + (elegida(x) ? ' on' : ''), style: `background:${x.color};color:${oscuro ? '#fff' : '#111'}`,
      rowspan: x.nh > 1 ? x.nh : null, colspan: hoja && x.nivel < 4 ? 5 - x.nivel : null,
      title: `${x.etiqueta}: ${escMa(x.base)} a ${escMa(x.techo)} · ${fmt(cuenta(x))} unidades`, onclick: () => elegirIntervalo(x) },
    el('span', {}, x.nombre));
  };
  const recorrer = (x, fila) => {
    fila.push(celda(x, !x.hijos.length));
    if (!x.hijos.length) {
      const n = cuenta(x);
      fila.push(el('td', { class: 'ics-ma' }, x.base.toLocaleString('es-CL', { maximumFractionDigits: 4 })),
        el('td', { class: 'ics-n' + (n ? '' : ' cero') }, el('b', { style: `width:${Math.round(100 * n / maxN)}%` }), n ? fmt(n) : ''));
      filas.push(el('tr', { class: x.base > 538.8 ? 'ics-precambrico' : null }, fila)); return;
    }
    x.hijos.forEach((h, k) => recorrer(h, k === 0 ? fila : []));
  };
  ICS.raices.forEach(r => recorrer(r, []));
  poner($('#p-edad'),
    el('p', { class: 'nota' }, 'Toca un eón, era, período, época o piso para ver solo las unidades de esa edad. Una unidad cuenta en cada intervalo que toca su rango de edad.'),
    el('div', { class: 'fila-btns' },
      el('button', { class: 'btn' + (!filtro.int ? ' primario' : ''), onclick: () => { filtro.int = null; aplicar(); } }, 'Todas las edades'),
      el('button', { class: 'btn', onclick: iniciarMaquina }, '▶ Máquina del tiempo')),
    el('table', { class: 'ics' },
      el('thead', {}, el('tr', {}, ['Eón', 'Era', 'Per.', 'Época', 'Piso', 'Ma', 'N.º'].map(h => el('th', {}, h)))),
      el('tbody', {}, filas)),
    el('p', { class: 'nota' }, 'Tabla Cronoestratigráfica Internacional (Comisión Internacional de Estratigrafía, versión 2024/12), con sus colores oficiales. «Ma»: edad de la base de cada piso. «N.º»: unidades (con los demás filtros) cuyo rango de edad toca ese piso.'),
    sin ? el('p', { class: 'nota' }, `${fmt(sin)} unidades no tienen una edad reconocible en el texto: aparecen solo con «Todas las edades».`) : null,
    el('p', { class: 'nota' }, el('a', { href: 'https://stratigraphy.org/chart', target: '_blank', rel: 'noopener' }, 'Tabla oficial en stratigraphy.org ↗')));
}
function elegirIntervalo(x) {
  filtro.int = filtro.int?.id === x.id ? null : { id: x.id, nombre: x.etiqueta, base: x.base, techo: x.techo };
  aplicar();
}

/* ---------------- máquina del tiempo ---------------- */
let reloj = null;
function iniciarMaquina() {
  // recorre los pisos del Fanerozoico (y el Precámbrico en un paso) del más antiguo al actual
  const pasos = ICS.hojas.filter(x => x.base <= 541 && U.some(u => pasaSinEdad(u) && solapa(u, x.base, x.techo)));
  if (!pasos.length) return;
  let i = 0;
  detenerMaquina(false);
  $('#reloj').hidden = false;
  const paso = () => {
    const x = pasos[i];
    filtro.int = { id: x.id, nombre: x.etiqueta, base: x.base, techo: x.techo };
    $('#reloj-nombre').textContent = `${x.padre?.padre && x.padre.padre.tipo === 'periodo' ? x.padre.padre.nombre + ' · ' : x.padre?.tipo === 'periodo' ? x.padre.nombre + ' · ' : ''}${x.etiqueta}`;
    $('#reloj-ma').textContent = `${escMa(x.base)} – ${escMa(x.techo)}`;
    $('#reloj').style.borderColor = x.color; $('#reloj').style.boxShadow = `0 0 0 3px ${x.color}, var(--sombra)`;
    aplicar(false);
    i++;
    if (i >= pasos.length) { clearInterval(reloj.t); reloj.t = null; $('#reloj-pausa').textContent = '↺'; }
  };
  reloj = { t: setInterval(paso, 900), paso, reiniciar: () => { i = 0; } };
  paso();
}
function detenerMaquina(limpiar = true) {
  if (reloj?.t) clearInterval(reloj.t);
  reloj = null; $('#reloj').hidden = true;
  if (limpiar) { filtro.int = null; aplicar(); }
}
$('#reloj-cerrar').onclick = () => detenerMaquina(true);
$('#reloj-pausa').onclick = () => {
  if (!reloj) return;
  if (reloj.t) { clearInterval(reloj.t); reloj.t = null; $('#reloj-pausa').textContent = '▶'; }
  else { if ($('#reloj-pausa').textContent === '↺') reloj.reiniciar(); reloj.t = setInterval(reloj.paso, 900); $('#reloj-pausa').textContent = '⏸'; }
};

/* ---------------- diagrama tiempo–latitud ---------------- */
function pintarPerfil(vis) {
  const caja = $('#perfil');
  if (!$('#p-perfil').classList.contains('on')) return;
  const W = Math.max(300, caja.clientWidth || 360), H = 620, m = { l: 34, r: 8, t: 26, b: 28 };
  // fuera los rangos de más de 300 Ma: son unidades con edad mal leída o sin acotar y tapan el resto
  const datos = vis.filter(u => u.mx != null && u.c && u.mx - u.mn <= 300);
  const tMax = Math.max(1, ...datos.map(u => Math.min(u.mx, 600)));
  const fx = escalaT === 'raiz' ? (t => Math.sqrt(t / tMax)) : (t => t / tMax);
  const X = t => m.l + (W - m.l - m.r) * (1 - fx(Math.min(t, tMax)));  // pasado a la izquierda, hoy a la derecha
  const lat0 = -17.4, lat1 = -56;
  const Y = la => m.t + (H - m.t - m.b) * (la - lat0) / (lat1 - lat0);
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  const mk = (t, a, txt) => { const e = document.createElementNS(ns, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; return e; };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  // bandas de los períodos
  for (const p of ICS.X.filter(x => x.tipo === 'periodo' && x.techo < tMax)) {
    const x0 = X(Math.min(p.base, tMax)), x1 = X(p.techo);
    svg.append(mk('rect', { x: x0, y: m.t, width: Math.max(0, x1 - x0), height: H - m.t - m.b, fill: p.color, opacity: 0.22 }));
    if (x1 - x0 > 16) svg.append(mk('text', { x: (x0 + x1) / 2, y: m.t - 6, 'text-anchor': 'middle' }, p.nombre.length > (x1 - x0) / 6 ? p.nombre.slice(0, 3) + '.' : p.nombre));
    svg.append(mk('rect', { x: x0, y: m.t - 3, width: Math.max(0, x1 - x0), height: 3, fill: p.color }));
  }
  for (const la of [-20, -25, -30, -35, -40, -45, -50, -55]) {
    svg.append(mk('line', { x1: m.l, x2: W - m.r, y1: Y(la), y2: Y(la), stroke: 'currentColor', 'stroke-opacity': 0.12 }));
    svg.append(mk('text', { x: m.l - 4, y: Y(la) + 3, 'text-anchor': 'end' }, `${-la}°`));
  }
  const marcas = escalaT === 'raiz' ? [0, 2.6, 23, 66, 145, 201, 252, 299, 359, 419, 485] : [0, 50, 100, 150, 200, 250, 300, 400, 500];
  for (const t of marcas.filter(t => t <= tMax)) svg.append(mk('text', { x: X(t), y: H - m.b + 14, 'text-anchor': 'middle' }, fmt(t)));
  svg.append(mk('text', { x: W - m.r, y: H - 4, 'text-anchor': 'end' }, 'Ma'));
  datos.sort((a, b) => b.mx - a.mx);
  for (const u of datos) {
    const x0 = X(Math.min(u.mx, tMax)), x1 = X(u.mn), y = Y(u.c[1]);
    const r = mk('rect', { class: 'barra-u', x: x0, y: y - 1.6, width: Math.max(2.5, x1 - x0), height: 3.2, rx: 1, fill: colorDe(u), 'fill-opacity': 0.85 });
    r.append(mk('title', {}, `${u.n} · ${escMa(u.mx)} – ${escMa(u.mn)} · ${(-u.c[1]).toFixed(1)}°S`));
    r.addEventListener('click', () => elegir(u.id, true));
    svg.append(r);
  }
  if (sel) { const u = BYID[sel]; if (u?.mx != null && u.c) svg.append(mk('circle', { cx: (X(u.mx) + X(u.mn)) / 2, cy: Y(u.c[1]), r: 6, fill: 'none', stroke: '#000', 'stroke-width': 2 })); }
  poner(caja, svg, el('p', { class: 'nota' }, `${fmt(datos.length)} unidades con edad y ubicación. Latitud: centro de los polígonos o de las cartas que la describen.`));
}

/* ---------------- ficha ---------------- */
function elegir(id, volar, latlng) {
  sel = id;
  const u = BYID[id];
  capaSel.clearLayers(); capaEnl.clearLayers();
  if (POL[id]) L.polygon(POL[id].map(p => p.map(r => r.map(([x, y]) => [y, x]))), { interactive: false, color: '#111', weight: 2.5, fill: false }).addTo(capaSel);
  for (const c of u.cartas) if (CARTAS[c]) {
    const [s, n, w, e] = CARTAS[c].b;
    L.rectangle([[s, w], [n, e]], { interactive: false, color: '#8a3b12', weight: 1.5, dashArray: '6 5', fill: false }).addTo(capaSel);
  }
  // correlaciones: líneas a las unidades nombradas en el texto
  for (const o of u.enl) { const v = BYID[o]; if (v?.c && u.c) L.polyline([[u.c[1], u.c[0]], [v.c[1], v.c[0]]], { color: '#8a3b12', weight: 2, dashArray: '2 6', opacity: 0.9, interactive: false }).addTo(capaEnl); }
  if (volar && u.bb) mapa.flyToBounds([[u.bb[1], u.bb[0]], [u.bb[3], u.bb[2]]], { padding: [40, 40], maxZoom: 10, duration: 0.8 });
  pintarFicha(u);
  abrir('ficha');
  location.hash = 'u=' + encodeURIComponent(u.n);
  if ($('#p-perfil').classList.contains('on')) pintarPerfil(U.filter(pasa));
}
function barraEdad(u) {
  if (u.mx == null) return null;
  const per = ICS.X.filter(x => x.tipo === 'periodo' && x.base <= 541);
  const t = x => 1 - Math.sqrt(x / 541);
  const izq = t(Math.min(u.mx, 541)) * 100, der = t(u.mn) * 100;
  return el('div', { class: 'barra-edad', title: 'Fanerozoico en escala de raíz cuadrada: a la izquierda lo antiguo' },
    per.sort((a, b) => b.base - a.base).map(p => el('span', { style: `background:${p.color};flex:${(t(p.techo) - t(p.base)) * 100}`, title: p.nombre })),
    el('b', { style: `left:${izq}%;width:${Math.max(0.8, der - izq)}%` }));
}
const citas = s => (s || '').split(/(\[[^\]]+\])/).map(p => /^\[.*\]$/.test(p) ? el('span', { class: 'ref' }, p) : p);
function pintarFicha(u) {
  const filaDD = (t, v) => v ? [el('dt', {}, t), el('dd', {}, citas(v))] : null;
  const enl = u.enl.map(o => BYID[o]).filter(Boolean);
  const contemporaneas = u.mx == null || !u.c ? [] : U.filter(v => v !== u && !v.gen && v.c && v.mx != null && solapa(v, u.mx, u.mn) &&
    Math.abs(v.c[1] - u.c[1]) < 1.5 && Math.abs(v.c[0] - u.c[0]) < 1.5).sort((a, b) => b.nf - a.nf).slice(0, 8);
  poner($('#p-ficha'), el('div', { class: 'ficha' },
    el('h2', {}, u.n, el('span', { class: 'insignia' + (u.rev ? '' : ' auto') }, u.rev ? 'revisada a mano' : 'extracción automática')),
    el('div', { class: 'sub' }, [TIPO[tipoDe(u)].s1, u.cl.map(c => CL[c].n).join(', '), u.amb.join(' / ')].filter(Boolean).join(' · ')),
    el('dl', {},
      el('dt', {}, 'Edad'), el('dd', {}, citas(u.edad || 'Sin dato'),
        u.mx != null ? el('div', { class: 'ref' }, `Rango usado en el visor: ${escMa(u.mx)} – ${escMa(u.mn)}${u.fe === 'gdb' ? ' (de la GDB)' : ''}`) : null, barraEdad(u)),
      filaDD('Localidad tipo', u.loc), filaDD('Litología', u.lit),
      u.rocas.length ? [el('dt', {}, 'Rocas más mencionadas'), el('dd', {}, u.rocas.join(', '))] : null,
      filaDD('Correlaciones', u.corr),
      enl.length ? [el('dt', {}, 'Ir a las unidades correlacionadas'), el('dd', {}, enl.map(v => el('div', {}, el('button', { class: 'enlace', onclick: () => elegir(v.id, true) }, v.n))))] : null,
      filaDD('Autor de la definición', u.aut), filaDD('Siglas en las cartas', u.sig), filaDD('Espesor citado', u.esp),
      u.libro ? [el('dt', {}, 'En «The Geology of Chile» (2007)'), el('dd', {}, u.libro)] : null,
      filaDD('Nota de la revisión', u.nota),
      el('dt', {}, 'Cartas que la describen'),
      el('dd', {}, u.cartas.length ? el('ul', { class: 'lista-cartas' }, u.cartas.map(c => el('li', {},
        CARTAS[c] ? el('button', { class: 'enlace', onclick: () => { const [s, n, w, e] = CARTAS[c].b; mapa.flyToBounds([[s, w], [n, e]], { padding: [30, 30] }); } },
          c.replace('CGCH_GB_', 'GB-').replace('CGCH_', 'Carta ').replace(/_/g, '-')) : c,
        CARTAS[c]?.t ? ` · ${CARTAS[c].t.replace(/^\d{4}\.\s*/, '').slice(0, 80)}` : '', CARTAS[c]?.aprox ? ' (marco aproximado)' : ''))) : 'Solo en la bibliografía'),
      el('dt', {}, 'Ubicación en el mapa'),
      el('dd', {}, POL[u.id] ? `Polígonos de ${u.gdb} unidad${u.gdb === 1 ? '' : 'es'} de las GDB.` : u.pts.length ? 'Sin polígono: el punto marca la carta que la describe (marco punteado).' : 'Sin ubicación: no hay carta georreferenciada que la describa.'),
      contemporaneas.length ? [el('dt', {}, 'Contemporáneas y cercanas (±1,5°)'), el('dd', {}, contemporaneas.map(v => el('div', {}, el('button', { class: 'enlace', onclick: () => elegir(v.id, true) }, v.n), el('span', { class: 'ref' }, ` · ${escMa(v.mx)}–${escMa(v.mn)}`))))] : null),
    el('div', { class: 'fila-btns' },
      u.bb ? el('button', { class: 'btn', onclick: () => mapa.flyToBounds([[u.bb[1], u.bb[0]], [u.bb[3], u.bb[2]]], { padding: [40, 40], maxZoom: 10 }) }, 'Ver en el mapa') : null,
      el('button', { class: 'btn', onclick: () => { filtro.q = norm(u.n); $('#q').value = u.n; aplicar(); abrir('unidades'); } }, 'Solo esta'),
      el('button', { class: 'btn', onclick: () => { navigator.clipboard?.writeText(location.href); } }, 'Copiar enlace'))));
}

/* ---------------- ¿qué hay aquí? ---------------- */
function dentroAnillo(x, y, r) {
  let d = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d;
  }
  return d;
}
mapa.on('click', ev => {
  const { lat, lng } = ev.latlng;
  const enPol = U.filter(u => pasa(u) && POL[u.id] && POL[u.id].some(p => dentroAnillo(lng, lat, p[0]) && !p.slice(1).some(h => dentroAnillo(lng, lat, h))));
  const cartas = Object.entries(CARTAS).filter(([, c]) => lat >= c.b[0] && lat <= c.b[1] && lng >= c.b[2] && lng <= c.b[3]).map(([k]) => k);
  const enCarta = U.filter(u => pasa(u) && !enPol.includes(u) && u.cartas.some(c => cartas.includes(c)));
  if (!enPol.length && !enCarta.length) return;
  const b = u => el('button', { class: 'enlace', onclick: () => { mapa.closePopup(); elegir(u.id, false); } }, el('i', { style: `display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;background:${colorDe(u)}` }), u.n);
  L.popup({ maxWidth: 300, maxHeight: 280 }).setLatLng(ev.latlng).setContent(el('div', {},
    enPol.length ? [el('b', {}, 'Aflora aquí'), enPol.map(b)] : null,
    enCarta.length ? [el('b', {}, `Descritas en ${cartas.length > 1 ? 'las cartas' : 'la carta'} de este lugar`),
      enCarta.slice(0, 40).map(b), enCarta.length > 40 ? el('div', { class: 'ref' }, `y ${enCarta.length - 40} más…`) : null] : null)).openOn(mapa);
});

/* ---------------- búsqueda ---------------- */
const q = $('#q'), sug = $('#sugerencias');
let tq;
q.addEventListener('input', () => {
  clearTimeout(tq);
  tq = setTimeout(() => {
    const t = norm(q.value.trim());
    if (!t) { sug.hidden = true; filtro.q = ''; aplicar(); return; }
    const porNombre = U.filter(u => norm(u.n).includes(t)).sort((a, b) => norm(a.n).indexOf(t) - norm(b.n).indexOf(t) || b.nf - a.nf).slice(0, 8);
    poner(sug, porNombre.map(u => el('button', { onclick: () => { sug.hidden = true; elegir(u.id, true); } }, el('span', {}, '🪨'), u.n)),
      el('button', { onclick: () => { sug.hidden = true; filtro.q = t; aplicar(); abrir('unidades'); } }, el('span', {}, '🔎'), `Filtrar todo lo que menciona «${q.value.trim()}»`));
    sug.hidden = false;
  }, 120);
});
q.addEventListener('keydown', e => { if (e.key === 'Enter') { sug.hidden = true; filtro.q = norm(q.value.trim()); aplicar(); abrir('unidades'); } if (e.key === 'Escape') sug.hidden = true; });

/* ---------------- controles ---------------- */
function abrir(p) {
  $$('#pestanas button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  $$('.pag').forEach(s => s.classList.toggle('on', s.id === 'p-' + p));
  $('#panel').classList.remove('min'); document.body.classList.remove('panel-min');
  if (p === 'perfil') pintarPerfil(U.filter(pasa));
  if (p === 'edad') pintarTiempo();
}
$$('#pestanas button').forEach(b => b.onclick = () => abrir(b.dataset.p));
$('#asa').onclick = () => { $('#panel').classList.toggle('min'); document.body.classList.toggle('panel-min'); };
$$('#color-por button').forEach(b => b.onclick = () => { colorPor = b.dataset.c; $$('#color-por button').forEach(x => x.classList.toggle('on', x === b)); aplicar(false); });
$$('#f-amb button').forEach(b => b.onclick = () => { filtro.amb = b.dataset.a; $$('#f-amb button').forEach(x => x.classList.toggle('on', x === b)); aplicar(); });
$$('#escala-t button').forEach(b => b.onclick = () => { escalaT = b.dataset.e; $$('#escala-t button').forEach(x => x.classList.toggle('on', x === b)); pintarPerfil(U.filter(pasa)); });
$('#f-rev').onchange = e => { filtro.rev = e.target.checked; aplicar(); };
$('#f-pol').onchange = e => { filtro.pol = e.target.checked; aplicar(); };
$('#f-gen').onchange = e => { filtro.gen = e.target.checked; aplicar(); };
$('#limpiar').onclick = () => {
  Object.assign(filtro, { q: '', amb: '', int: null, rev: false, pol: false, gen: false }); filtro.tipos.clear(); filtro.lito.clear();
  q.value = ''; $('#f-rev').checked = $('#f-pol').checked = $('#f-gen').checked = false;
  $$('#f-amb button').forEach(x => x.classList.toggle('on', x.dataset.a === '')); aplicar();
};
$('#maquina').onclick = iniciarMaquina;

function aplicar(reiniciarLista = true) {
  if (reiniciarLista) LIM = 80;
  const vis = pintarMapa();
  pintarLeyenda(vis); pintarChips(); pintarLista(vis);
  if ($('#p-edad').classList.contains('on')) pintarTiempo();
  if ($('#p-perfil').classList.contains('on')) pintarPerfil(vis);
}

/* ---------------- arranque ---------------- */
(async () => {
  const j = n => fetch(n).then(r => r.json());
  const [du, dp, dc, di] = await Promise.all([j('data/unidades.json'), j('data/poligonos.json'), j('data/cartas.json'), j('data/ics.json')]);
  U = du.unidades; POL = dp; CARTAS = dc; ICS = armarICS(di.unidades);
  $('#fecha-datos').textContent = `Datos generados el ${du.generado}: ${fmt(U.length)} unidades, ${fmt(Object.keys(POL).length)} con polígono.`;
  for (const u of U) {
    BYID[u.id] = u;
    u._txt = norm([u.n, u.loc, u.lit, u.corr, u.rocas.join(' '), u.aut, u.sig, u.libro].join(' '));
    const m = medio(u);
    if (m != null) { const x = icsDe(m, 3); u._colEdad = x?.color; u._icsPer = icsDe(m, 2); }
  }
  construirCapas();
  aplicar();
  const h = decodeURIComponent(location.hash.replace(/^#u=/, ''));
  const u0 = h && U.find(u => u.n === h);
  if (u0) elegir(u0.id, true);
  // en localhost no: el caché del SW escondería los cambios mientras se trabaja
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
