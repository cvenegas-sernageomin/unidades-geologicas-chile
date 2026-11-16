/* Unidades geológicas de Chile · visor: localidades tipo, polígonos de las GDB de las unidades elegidas, filtros por tipo, litología, ambiente y
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
const poner = (dest, ...h) => { dest.replaceChildren(); for (const x of h.flat(Infinity)) if (x) dest.append(x); };
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

let U = [], BYID = {}, CARTAS = {}, ICS = null, HOJAS = [], META = {};
const filtro = { q: '', tipos: new Set(), lito: new Set(), amb: '', ints: [], rev: false, pol: false, gen: false };
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
  if (filtro.pol && !u.pol) return false;
  if (filtro.tipos.size && !filtro.tipos.has(tipoDe(u))) return false;
  if (filtro.lito.size && !u.cl.some(c => filtro.lito.has(c))) return false;
  if (filtro.amb && !u.amb.includes(filtro.amb)) return false;
  if (filtro.q && !u._txt.includes(filtro.q)) return false;
  return true;
}
const solapa = (u, b, t) => u.mx != null && u.mn < b - 1e-9 && u.mx > t + 1e-9 || (u.mx != null && u.mx === u.mn && u.mx <= b && u.mx >= t);
// varias edades elegidas: pasa la unidad que toca cualquiera de ellas
const pasa = u => pasaSinEdad(u) && (!filtro.ints.length || filtro.ints.some(i => solapa(u, i.base, i.techo)));

/* ---------------- mapa ---------------- */
const guardado = { leer(k, d) { try { const v = localStorage.getItem('unidades-' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  poner(k, v) { try { localStorage.setItem('unidades-' + k, JSON.stringify(v)); } catch { /* sin almacenamiento: no pasa nada */ } } };
const mapa = L.map('mapa', { zoomControl: false, preferCanvas: true, minZoom: 3, worldCopyJump: true }).setView([-33, -70.5], 5);
L.control.zoom({ position: 'bottomright' }).addTo(mapa);
const BASES = {
  'Gris claro (Esri)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: '© Esri, HERE, Garmin, © OpenStreetMap' }),
  'Relieve (OpenTopoMap)': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 16, attribution: '© OpenStreetMap, SRTM · OpenTopoMap (CC-BY-SA)' }),
  'Satélite (Esri)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, attribution: 'Imágenes © Esri' }),
};
let baseActual = guardado.leer('base', 'Gris claro (Esri)');
if (!BASES[baseActual]) baseActual = 'Gris claro (Esri)';
BASES[baseActual].addTo(mapa);
// los polígonos van debajo de los puntos
mapa.createPane('polP'); mapa.getPane('polP').style.zIndex = 390;
const rendPol = L.canvas({ pane: 'polP', padding: 0.3 });
const rend = L.canvas({ padding: 0.3, tolerance: 4 });
const capaPol = L.layerGroup(), capaLT = L.layerGroup(), capaAprox = L.layerGroup(), capaSel = L.layerGroup(), capaEnl = L.layerGroup();
const capaRes = L.layerGroup().addTo(mapa);  // anillo de la unidad abierta: siempre visible

/* ---- capas: un solo botón para prender y apagar todo (reemplaza a L.control.layers) ---- */
const CAPAS = [];
const estadoCapas = guardado.leer('capas', {});
function registrarCapa(id, nombre, capa, nota, apagada) {
  const c = { id, nombre, capa, nota };
  CAPAS.push(c);
  if (estadoCapas[id] ?? !apagada) capa.addTo(mapa);
  pintarPanelCapas();
  return c;
}
function alternarCapa(c, on) {
  on ? c.capa.addTo(mapa) : c.capa.remove();
  estadoCapas[c.id] = on; guardado.poner('capas', estadoCapas);
  mapa.fire(on ? 'overlayadd' : 'overlayremove', { layer: c.capa });
}
// yac.js registra su capa con la interfaz de L.control.layers
const layersControl = { addOverlay(capa, nombre) {
  const c = registrarCapa('yac', nombre, capa, 'Puntos de la pestaña «Yacimientos»');
  // si quedó apagada la vez anterior: avisar cuando yac.js ya esté escuchando
  if (estadoCapas.yac === false) setTimeout(() => mapa.fire('overlayremove', { layer: c.capa }), 0);
} };
const cajaCapas = el('div', { id: 'capas', class: 'tarjeta', hidden: true });
function pintarPanelCapas() {
  poner(cajaCapas,
    el('b', {}, 'Capas del mapa'),
    CAPAS.map(c => el('label', { class: 'chk', title: c.nota || null },
      el('input', { type: 'checkbox', checked: mapa.hasLayer(c.capa) ? true : null, onchange: e => alternarCapa(c, e.target.checked) }), c.nombre)),
    el('b', {}, 'Mapa base'),
    Object.keys(BASES).map(n => el('label', { class: 'chk' },
      el('input', { type: 'radio', name: 'base', checked: n === baseActual ? true : null, onchange: () => { BASES[baseActual].remove(); baseActual = n; BASES[n].addTo(mapa); guardado.poner('base', n); } }), n)));
}
const ControlCapas = L.Control.extend({ options: { position: 'topright' }, onAdd() {
  const caja = el('div', { class: 'ctl-capas' },
    el('button', { id: 'btn-capas', class: 'tarjeta', title: 'Capas del mapa', 'aria-label': 'Capas del mapa',
      onclick: () => { pintarPanelCapas(); cajaCapas.hidden = !cajaCapas.hidden; },
      html: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3 2.5 8 12 13l9.5-5L12 3Z"/><path d="m2.5 12 9.5 5 9.5-5"/><path d="m2.5 16 9.5 5 9.5-5"/></svg>' }),
    cajaCapas);
  L.DomEvent.disableClickPropagation(caja); L.DomEvent.disableScrollPropagation(caja);
  return caja;
} });
mapa.addControl(new ControlCapas());
registrarCapa('lt', 'Localidades tipo', capaLT, 'Punto lleno: localidad tipo según el texto de la carta; semilleno: referencia cercana');
// apagada al partir: son ~900 anillos que tapan las localidades tipo; siguen en la lista y, al abrir una, se marca en el mapa
registrarCapa('aprox', 'Unidades sin localidad tipo ubicada', capaAprox, 'Anillo: punto indicativo en sus polígonos o en la carta que la describe; no es la localidad tipo', true);
registrarCapa('pol', 'Polígonos de las unidades elegidas', capaPol, 'Unidades cartografiadas en las GDB de las cartas (polígonos generalizados)');
registrarCapa('enl', 'Líneas de correlación', capaEnl, 'Une la unidad abierta con las que el texto correlaciona');
registrarCapa('marcos', 'Marcos de las cartas', capaSel, 'Cartas que describen la unidad abierta');

/* ---- puntos: localidad tipo (lleno), referencia cercana (semilleno) o ubicación aproximada (anillo) ---- */
const EXACTAS = new Set(['exacta', 'toponimo', 'toponimo+desplazamiento', 'a mano']);
const PREC_TXT = {
  exacta: 'coordenadas dadas en el texto', toponimo: 'topónimo nombrado en el texto; el punto es la posición del topónimo, no la sección tipo',
  'toponimo+desplazamiento': 'topónimo más la distancia y la dirección que da el texto',
  cercania: 'lugar de referencia cercano, no el sitio exacto', 'rasgo extenso': 'rasgo extenso (río, valle, sierra): punto indicativo',
  'nombre de la unidad': 'lugar del que la unidad toma su nombre; el texto no precisa el sitio',
};
const claseLT = u => !u.lt ? 'aprox' : EXACTAS.has(u.lt.p) ? 'lt' : 'ref';
const MARCAS = {};  // id -> circleMarkers
function construirCapas() {
  for (const u of U) {
    const k = claseLT(u);
    const ptos = u.lt ? [[u.lt.x, u.lt.y]] : u.pol ? (u.c ? [u.c] : []) : u.pts;
    MARCAS[u.id] = ptos.map(([x, y]) => {
      const m = L.circleMarker([y, x], { renderer: rend, radius: k === 'aprox' ? 4 : 5.5, weight: k === 'aprox' ? 1.6 : 1.1 });
      m.on('click', ev => { L.DomEvent.stop(ev); elegir(u.id, false); });
      m.bindTooltip(`${u.n} · ${k === 'lt' ? 'localidad tipo' : k === 'ref' ? 'referencia cercana a la localidad tipo (aproximada)' : 'sin localidad tipo ubicada (punto indicativo)'}`, { className: 'etiqueta-u' });
      return m;
    });
  }
}
function pintarMapa() {
  capaLT.clearLayers(); capaAprox.clearLayers();
  const vis = U.filter(pasa);
  for (const u of vis) {
    const c = colorDe(u), k = claseLT(u);
    for (const m of MARCAS[u.id]) {
      m.setStyle(k === 'aprox' ? { color: shade(c, -0.35), fillColor: c, fillOpacity: 0.1 } : { color: '#2b2420', fillColor: c, fillOpacity: k === 'lt' ? 0.95 : 0.45 });
      (k === 'aprox' ? capaAprox : capaLT).addLayer(m);
    }
  }
  pintarPol();
  return vis;
}

/* ---- polígonos de las unidades elegidas (y de la que está abierta), generalizados según el zoom ---- */
const POLS = { lejos: null, cerca: null }, cargandoPol = {};
const ZOOM_CERCA = 9;
let elegidas = [];  // ids fijados en el mapa
const BORDES = ['#111111', '#8a3b12', '#1f5fa8', '#2f7d4f', '#7b3fa0', '#c0392b', '#0e7c86', '#8d6e00'];
const bordeDe = id => BORDES[Math.max(0, elegidas.indexOf(id)) % BORDES.length];
function cargarPol(nivel) {
  if (POLS[nivel]) return Promise.resolve(POLS[nivel]);
  return cargandoPol[nivel] ||= fetch(`data/pol_${nivel}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => (POLS[nivel] = d))
    .catch(e => { delete cargandoPol[nivel]; throw e; });
}
const nivelPol = () => mapa.getZoom() >= ZOOM_CERCA ? 'cerca' : 'lejos';
let nivelDibujado = null;
function pintarPol() {
  capaPol.clearLayers();
  const ids = [...new Set([...elegidas, ...(sel ? [sel] : [])])].map(id => BYID[id]).filter(u => u?.pol);
  nivelDibujado = nivelPol();
  if (!ids.length) return;
  if (!POLS[nivelDibujado]) cargarPol(nivelDibujado).then(pintarPol).catch(e => console.error('polígonos:', e));
  const P = POLS[nivelDibujado] || POLS.lejos || POLS.cerca;
  if (!P) return;
  // las más antiguas abajo
  for (const u of ids.sort((a, b) => (b.mx ?? 0) - (a.mx ?? 0))) {
    const partes = P[u.id];
    if (!partes) continue;
    const fijada = elegidas.includes(u.id);
    const pol = L.polygon(partes.map(anillos => anillos.map(a => a.map(([x, y]) => [y, x]))), { renderer: rendPol, pane: 'polP',
      color: fijada ? bordeDe(u.id) : '#111', weight: u.id === sel ? 2.2 : 1.3, dashArray: fijada ? null : '5 4', fillColor: colorDe(u), fillOpacity: 0.55 });
    pol.on('click', ev => { L.DomEvent.stop(ev); elegir(u.id, false); });
    pol.bindTooltip(u.n, { sticky: true, className: 'etiqueta-u' });
    capaPol.addLayer(pol);
  }
}
mapa.on('zoomend', () => { if (nivelPol() !== nivelDibujado) pintarPol(); });
function alternarElegida(id) {
  elegidas = elegidas.includes(id) ? elegidas.filter(x => x !== id) : [...elegidas, id];
  if (elegidas.includes(id) && !mapa.hasLayer(capaPol)) { const c = CAPAS.find(c => c.id === 'pol'); alternarCapa(c, true); pintarPanelCapas(); }
  pintarPol(); pintarLista(U.filter(pasa)); ponerHash();
  if (sel && $('#p-ficha').classList.contains('on')) pintarFicha(BYID[sel]);
}
function verElegidas() {
  const cajas = elegidas.map(id => BYID[id].bb).filter(Boolean);
  if (cajas.length) mapa.flyToBounds([[Math.min(...cajas.map(b => b[1])), Math.min(...cajas.map(b => b[0]))], [Math.max(...cajas.map(b => b[3])), Math.max(...cajas.map(b => b[2]))]], { padding: [40, 40], maxZoom: 10, duration: 0.8 });
}
// punto dentro de un polígono con huecos (anillos [[x, y], …])
function dentro(anillos, x, y) {
  let d = false;
  for (const a of anillos) for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
    const [xi, yi] = a[i], [xj, yj] = a[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d;
  }
  return d;
}
function ponerHash() {
  const p = [];
  if (sel) p.push('u=' + encodeURIComponent(BYID[sel].n));
  if (elegidas.length) p.push('m=' + elegidas.map(id => encodeURIComponent(BYID[id].n)).join('|'));
  history.replaceState(null, '', p.length ? '#' + p.join('&') : location.pathname + location.search);
}
const oscuro = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b < 140; };
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ---------------- leyenda ---------------- */
function pintarLeyenda(vis) {
  const caja = $('#leyenda');
  const simbolos = [el('div', { class: 'sep' }), el('div', {}, el('i', { class: 'sim lleno' }), 'Localidad tipo (topónimo o coordenadas del texto)'),
    el('div', {}, el('i', { class: 'sim medio' }), 'Referencia cercana a la localidad tipo'),
    el('div', {}, el('i', { class: 'sim anillo' }), 'Sin localidad tipo ubicada: punto indicativo')];
  if (colorPor === 'edad') {
    const cuenta = new Map();
    for (const u of vis) { const x = u._icsPer; if (x) cuenta.set(x, (cuenta.get(x) || 0) + 1); }
    const per = [...cuenta.keys()].sort((a, b) => a.techo - b.techo);
    poner(caja, el('b', { onclick: plegarLeyenda }, 'Edad (período)'), per.map(x => el('div', {}, el('i', { style: `background:${x.color}` }), `${x.nombre} · ${cuenta.get(x)}`)),
      el('div', {}, el('i', { style: 'background:#9e9e9e' }), 'Sin edad reconocida'), simbolos);
  } else if (colorPor === 'tipo') {
    poner(caja, el('b', { onclick: plegarLeyenda }, 'Tipo de unidad'), TIPOS.map(([k, n, c]) => el('div', {}, el('i', { style: `background:${c}` }), n)), simbolos);
  } else {
    poner(caja, el('b', { onclick: plegarLeyenda }, 'Litología principal'), CLASES.map(([k, n, c]) => el('div', {}, el('i', { style: `background:${c}` }), n)), simbolos);
  }
}

function plegarLeyenda() { $('#leyenda').classList.toggle('plegada'); }
// en el teléfono parte plegada (ancho 0 = pestaña oculta al cargar: no cuenta como teléfono)
if (innerWidth > 0 && innerWidth <= 760) $('#leyenda').classList.add('plegada');

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
const chipEdad = i => el('span', { class: 'chip on', style: `background:${i.color};border-color:${shade(i.color, -0.3)};color:${oscuro(i.color) ? '#fff' : '#111'}`,
  title: `${escMa(i.base)} – ${escMa(i.techo)}` }, i.nombre, el('button', { class: 'quitar', title: 'Quitar', onclick: e => { e.stopPropagation(); e.preventDefault(); elegirIntervalo(i); } }, '✕'));
function pintarLista(vis) {
  const conLT = vis.filter(u => u.lt).length, conPol = vis.filter(u => u.pol).length;
  poner($('#resumen'), el('b', {}, fmt(vis.length)), ` unidades · ${fmt(conLT)} con localidad tipo o referencia cercana en el mapa · ${fmt(conPol)} con polígonos de las GDB`);
  // unidades fijadas en el mapa
  poner($('#en-mapa'), elegidas.length ? [el('span', { class: 'rot' }, `En el mapa (${elegidas.length}):`),
    elegidas.map(id => el('span', { class: 'chip fijada', style: `border-color:${bordeDe(id)}` },
      el('i', { style: `background:${colorDe(BYID[id])};border:2px solid ${bordeDe(id)}` }),
      el('button', { class: 'enlace', onclick: () => elegir(id, true) }, BYID[id].n),
      el('button', { class: 'quitar', title: 'Quitar del mapa', onclick: () => alternarElegida(id) }, '✕'))),
    el('button', { class: 'enlace', onclick: verElegidas }, 'ver todas'),
    el('button', { class: 'enlace', onclick: () => { elegidas = []; pintarPol(); pintarLista(U.filter(pasa)); ponerHash(); } }, 'quitar todas')] : null);
  $('#en-mapa').hidden = !elegidas.length;
  const orden = [...vis].sort((a, b) => (b.rev - a.rev) || (b.nf + b.cartas.length * 3) - (a.nf + a.cartas.length * 3));
  $('#lista-titulo').textContent = `Unidades (${fmt(vis.length)})`;
  poner($('#lista'), orden.slice(0, LIM).map(u => el('li', { class: u.id === sel ? 'sel' : null, onclick: () => elegir(u.id, true) },
    el('i', { style: `background:${colorDe(u)}` }),
    el('span', {}, u.n, u.rev ? el('em', {}, ' ✔') : null, el('small', {}, [u.edad.replace(/\[[^\]]*\]|\([^)]*CGCH[^)]*\)/g, '').slice(0, 70) || 'Edad sin dato', u.cl.length ? ' · ' + u.cl.map(c => CL[c].n.split(' ')[0]).join(', ') : ''].join(''))),
    u.pol ? el('button', { class: 'fijar' + (elegidas.includes(u.id) ? ' on' : ''), title: elegidas.includes(u.id) ? 'Quitar sus polígonos del mapa' : 'Mostrar sus polígonos en el mapa',
      'aria-pressed': elegidas.includes(u.id) ? 'true' : 'false', onclick: e => { e.stopPropagation(); alternarElegida(u.id); } }, elegidas.includes(u.id) ? '✓ en el mapa' : '＋ mapa') : null)),
    orden.length > LIM ? el('li', {}, el('button', { class: 'btn mas', onclick: e => { e.stopPropagation(); LIM += 200; pintarLista(vis); } }, `Ver ${fmt(Math.min(200, orden.length - LIM))} más`)) : null);
}

// edad en la pestaña Unidades: períodos de un toque + tabla completa plegable
function pintarEdadRapida() {
  const pasan = U.filter(pasaSinEdad).filter(u => u.mx != null);
  const cuenta = x => pasan.reduce((n, u) => n + solapa(u, x.base, x.techo), 0);
  const per = ICS.X.filter(x => x.tipo === 'periodo').sort((a, b) => a.techo - b.techo);
  const pre = ICS.X.filter(x => x.tipo === 'eon' && x.techo >= 538);
  poner($('#edad-rapida'), [...per, ...pre].map(x => {
    const n = cuenta(x), on = filtro.ints.some(i => i.id === x.id);
    return n || on ? el('button', { class: 'per' + (on ? ' on' : ''), style: `background:${x.color};color:${oscuro(x.color) ? '#fff' : '#111'}`,
      title: `${x.nombre}: ${escMa(x.base)} a ${escMa(x.techo)} · ${fmt(n)} unidades`, 'aria-pressed': on ? 'true' : 'false', onclick: () => elegirIntervalo(x) },
    x.nombre, el('small', {}, fmt(n))) : null;
  }));
  poner($('#edad-elegidas'), filtro.ints.length ? [filtro.ints.map(chipEdad),
    el('button', { class: 'enlace', onclick: () => { filtro.ints = []; aplicar(); } }, filtro.ints.length > 1 ? 'quitar todas' : 'quitar')] : null);
  $('#edad-elegidas').hidden = !filtro.ints.length;
  const nf = filtro.tipos.size + filtro.lito.size + (filtro.amb ? 1 : 0) + filtro.rev + filtro.pol + filtro.gen;
  $('#n-filtros').textContent = nf ? ` · ${nf} activo${nf === 1 ? '' : 's'}` : '';
}

/* ---------------- panel: edad ---------------- */
function pintarTiempo() {
  const pasan = U.filter(pasaSinEdad), conEdad = pasan.filter(u => u.mx != null), sin = pasan.length - conEdad.length;
  const cuenta = x => conEdad.reduce((s, u) => s + solapa(u, x.base, x.techo), 0);
  const elegida = x => filtro.ints.some(i => i.id === x.id);
  const filas = [];
  const maxN = Math.max(1, ...ICS.hojas.map(cuenta));
  const celda = (x, hoja) => {
    return el('td', { class: `ics-${x.tipo}` + (hoja ? ' ics-hoja' : '') + (elegida(x) ? ' on' : ''), style: `background:${x.color};color:${oscuro(x.color) ? '#fff' : '#111'}`,
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
  poner($('#tabla-edad'),
    el('p', { class: 'nota' }, 'Toca uno o varios eones, eras, períodos, épocas o pisos: la lista y el mapa muestran solo las unidades de esas edades. Tócalo de nuevo para quitarlo. Una unidad cuenta en cada intervalo que toca su rango de edad.'),
    el('div', { class: 'tabla-scroll' }, el('table', { class: 'ics' },
      el('thead', {}, el('tr', {}, ['Eón', 'Era', 'Per.', 'Época', 'Piso', 'Ma', 'N.º'].map(h => el('th', {}, h)))),
      el('tbody', {}, filas))),
    el('p', { class: 'nota' }, 'Tabla Cronoestratigráfica Internacional (Comisión Internacional de Estratigrafía, versión 2024/12), con sus colores oficiales. «Ma»: edad de la base de cada piso. «N.º»: unidades (con los demás filtros) cuyo rango de edad toca ese piso.'),
    sin ? el('p', { class: 'nota' }, `${fmt(sin)} unidades no tienen una edad reconocible en el texto: aparecen solo cuando no hay ninguna edad elegida.`) : null,
    el('p', { class: 'nota' }, el('a', { href: 'https://stratigraphy.org/chart', target: '_blank', rel: 'noopener' }, 'Tabla oficial en stratigraphy.org ↗')));
}
function elegirIntervalo(x) {
  const ya = filtro.ints.some(i => i.id === x.id);
  filtro.ints = ya ? filtro.ints.filter(i => i.id !== x.id) : [...filtro.ints, { id: x.id, nombre: x.etiqueta ?? x.nombre, base: x.base, techo: x.techo, color: x.color }];
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
    filtro.ints = [{ id: x.id, nombre: x.etiqueta, base: x.base, techo: x.techo, color: x.color }];
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
  if (limpiar) { filtro.ints = []; aplicar(); }
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
function elegir(id, volar) {
  sel = id;
  const u = BYID[id];
  capaSel.clearLayers(); capaEnl.clearLayers(); capaRes.clearLayers();
  for (const m of MARCAS[u.id]) L.circleMarker(m.getLatLng(), { interactive: false, radius: 10, color: '#111', weight: 2.5, fill: false }).addTo(capaRes);
  for (const c of u.cartas) if (CARTAS[c]) {
    const [s, n, w, e] = CARTAS[c].b;
    L.rectangle([[s, w], [n, e]], { interactive: false, color: '#8a3b12', weight: 1.5, dashArray: '6 5', fill: false }).addTo(capaSel);
  }
  // correlaciones: líneas a las unidades nombradas en el texto
  const pos = v => v.lt ? [v.lt.y, v.lt.x] : v.c ? [v.c[1], v.c[0]] : null;
  for (const o of u.enl) { const v = BYID[o]; if (v && pos(v) && pos(u)) L.polyline([pos(u), pos(v)], { color: '#8a3b12', weight: 2, dashArray: '2 6', opacity: 0.9, interactive: false }).addTo(capaEnl); }
  if (volar) volarA(u);
  pintarPol();
  pintarFicha(u);
  abrir('ficha');
  ponerHash();
  if ($('#p-perfil').classList.contains('on')) pintarPerfil(U.filter(pasa));
}
function volarA(u) {
  if (u.bb) {
    const b = L.latLngBounds([[u.bb[1], u.bb[0]], [u.bb[3], u.bb[2]]]);
    if (u.lt) b.extend([u.lt.y, u.lt.x]);
    mapa.flyToBounds(b, { padding: [40, 40], maxZoom: 10, duration: 0.8 });
  } else if (u.lt) mapa.flyTo([u.lt.y, u.lt.x], 10, { duration: 0.8 });
}
const gms = (v, pos, neg) => { const a = Math.abs(v), g = Math.floor(a), m = Math.round((a - g) * 60); return `${m === 60 ? g + 1 : g}°${String(m === 60 ? 0 : m).padStart(2, '0')}′${v < 0 ? neg : pos}`; };
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
      u.loc || u.lt ? [el('dt', {}, 'Localidad tipo'), el('dd', {}, citas(u.loc || 'Sin texto en la tabla.'),
        u.lt ? el('div', { class: 'ref lt-geo' }, el('i', { class: 'sim ' + (claseLT(u) === 'lt' ? 'lleno' : 'medio') }),
          `En el mapa: ${u.lt.t ? u.lt.t + ' · ' : ''}${gms(u.lt.y, 'N', 'S')}, ${gms(u.lt.x, 'E', 'O')} · ${PREC_TXT[u.lt.p] || u.lt.p}${u.lt.f ? ` (${u.lt.f === 'IGM' ? 'toponimia IGM 1:50.000' : u.lt.f})` : ''}. `,
          el('button', { class: 'enlace', onclick: () => mapa.flyTo([u.lt.y, u.lt.x], Math.max(mapa.getZoom(), 11), { duration: 0.8 }) }, claseLT(u) === 'lt' ? 'Ir a la localidad tipo' : 'Ir al punto en el mapa'))
          : el('div', { class: 'ref' }, 'Sin georreferenciar: el texto no nombra un lugar que se pueda ubicar con certeza.'))] : null,
      filaDD('Litología', u.lit),
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
      typeof filaYacimientosDe === 'function' ? filaYacimientosDe(u) : null,
      el('dt', {}, 'Ubicación en el mapa'),
      el('dd', {}, u.pol ? `Polígonos de las GDB: ${fmt(u.na)} polígono${u.na === 1 ? '' : 's'} (ya generalizados), de ${u.gdb} registro${u.gdb === 1 ? '' : 's'} de la unidad en las cartas. Con el país a la vista se dibujan generalizados a ~1 km; al acercarse, a ~250 m. No sirven para medir superficies ni para ubicar contactos.` : u.pts.length ? 'Sin polígonos en las GDB: el punto marca la carta que la describe (marco punteado), no un afloramiento.' : u.lt ? 'Sin polígonos ni carta georreferenciada: solo la localidad tipo.' : 'Sin ubicación: no hay carta georreferenciada que la describa.'),
      contemporaneas.length ? [el('dt', {}, 'Contemporáneas y cercanas (±1,5°)'), el('dd', {}, contemporaneas.map(v => el('div', {}, el('button', { class: 'enlace', onclick: () => elegir(v.id, true) }, v.n), el('span', { class: 'ref' }, ` · ${escMa(v.mx)}–${escMa(v.mn)}`))))] : null),
    el('div', { class: 'fila-btns' },
      u.bb || u.lt ? el('button', { class: 'btn', onclick: () => volarA(u) }, 'Ver en el mapa') : null,
      u.pol ? el('button', { class: 'btn' + (elegidas.includes(u.id) ? ' primario' : ''), onclick: () => alternarElegida(u.id) }, elegidas.includes(u.id) ? '✓ Fijada en el mapa' : '＋ Fijar sus polígonos') : null,
      el('button', { class: 'btn', onclick: () => { filtro.q = norm(u.n); $('#q').value = u.n; aplicar(); abrir('unidades'); } }, 'Solo esta'),
      el('button', { class: 'btn', onclick: () => { navigator.clipboard?.writeText(location.href); } }, 'Copiar enlace'))));
}

/* ---------------- ¿qué hay aquí? ---------------- */
mapa.on('click', ev => {
  const { lat, lng } = ev.latlng, p0 = mapa.latLngToContainerPoint(ev.latlng);
  const P = POLS.cerca || POLS.lejos || {};
  const enPol = U.filter(u => pasa(u) && u.pol && u.bb && lng >= u.bb[0] && lng <= u.bb[2] && lat >= u.bb[1] && lat <= u.bb[3] && (P[u.id] || []).some(a => dentro(a, lng, lat)));
  const cartas = Object.entries(CARTAS).filter(([, c]) => lat >= c.b[0] && lat <= c.b[1] && lng >= c.b[2] && lng <= c.b[3]).map(([k]) => k);
  const enCarta = U.filter(u => pasa(u) && !enPol.includes(u) && u.cartas.some(c => cartas.includes(c)));
  const ys = typeof yacimientosCerca === 'function' ? yacimientosCerca(ev) : [];
  if (!enPol.length && !enCarta.length && !ys.length) return;
  void p0;
  const b = u => el('button', { class: 'enlace', onclick: () => { mapa.closePopup(); elegir(u.id, false); } }, el('i', { style: `display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;background:${colorDe(u)}` }), u.n);
  const byY = r => el('button', { class: 'enlace', onclick: () => { mapa.closePopup(); elegirY(r.i, false); } }, el('i', { style: `display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;background:${colorY(r)}` }), r.n,
    el('span', { class: 'ref' }, r.mx != null ? ` · ${escMa(r.mx)}–${escMa(r.mn)}` : ''));
  L.popup({ maxWidth: Math.min(300, innerWidth - 60), maxHeight: 280 }).setLatLng(ev.latlng).setContent(el('div', {},
    ys.length ? [el('b', {}, 'Yacimientos aquí'), ys.map(byY)] : null,
    enPol.length ? [el('b', {}, 'Cartografiadas aquí o en las inmediaciones (polígonos generalizados de las GDB)'), enPol.map(b)] : null,
    enCarta.length ? [el('b', {}, `Descritas en ${cartas.length > 1 ? 'las cartas que cubren' : 'la carta que cubre'} este punto (no necesariamente presentes aquí)`),
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
  if (p === 'yac' && typeof pintarYacPanel === 'function') pintarYacPanel();
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
  Object.assign(filtro, { q: '', amb: '', ints: [], rev: false, pol: false, gen: false }); filtro.tipos.clear(); filtro.lito.clear();
  q.value = ''; $('#f-rev').checked = $('#f-pol').checked = $('#f-gen').checked = false;
  $$('#f-amb button').forEach(x => x.classList.toggle('on', x.dataset.a === '')); aplicar();
};
$('#maquina').onclick = iniciarMaquina;
$('#d-edad').addEventListener('toggle', () => { if ($('#d-edad').open) pintarTiempo(); });

function aplicar(reiniciarLista = true) {
  if (reiniciarLista) LIM = 80;
  const vis = pintarMapa();
  pintarLeyenda(vis); pintarChips(); pintarEdadRapida(); pintarLista(vis);
  if (typeof pintarYac === 'function') pintarYac();  // yac.js: los yacimientos siguen las edades elegidas
  if ($('#d-edad').open) pintarTiempo();
  if ($('#p-perfil').classList.contains('on')) pintarPerfil(vis);
}

/* ---------------- arranque ---------------- */
(async () => {
  const j = n => fetch(n).then(r => r.json());
  const [du, dc, di] = await Promise.all([j('data/unidades.json'), j('data/cartas.json'), j('data/ics.json')]);
  U = du.unidades; CARTAS = dc; ICS = armarICS(di.unidades);
  $('#fecha-datos').textContent = `Datos generados el ${du.generado}: ${fmt(U.length)} unidades, ${fmt(U.filter(u => u.lt).length)} con localidad tipo georreferenciada o con una referencia cercana, ${fmt(U.filter(u => u.pol).length)} con polígonos de las GDB.`;
  for (const u of U) {
    BYID[u.id] = u;
    u._txt = norm([u.n, u.loc, u.lt?.t, u.lit, u.corr, u.rocas.join(' '), u.aut, u.sig, u.libro].join(' '));
    const m = medio(u);
    if (m != null) { const x = icsDe(m, 3); u._colEdad = x?.color; u._icsPer = icsDe(m, 2); }
  }
  construirCapas();
  aplicar();
  if (typeof cargarYac === 'function') cargarYac().catch(e => console.error('yacimientos:', e));
  cargarPol('lejos').then(pintarPol).catch(e => console.error('polígonos:', e));  // liviano: también sirve a «¿qué hay aquí?»
  const hp = new URLSearchParams(location.hash.slice(1).replace(/\+/g, '%2B'));
  const porNombre = n => U.find(u => u.n === n);
  elegidas = (hp.get('m') || '').split('|').map(porNombre).filter(u => u?.pol).map(u => u.id);
  const u0 = hp.get('u') && porNombre(hp.get('u'));
  if (elegidas.length) aplicar();
  if (u0) elegir(u0.id, true); else if (elegidas.length) setTimeout(verElegidas, 300);
  // en localhost no: el caché del SW escondería los cambios mientras se trabaja
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
