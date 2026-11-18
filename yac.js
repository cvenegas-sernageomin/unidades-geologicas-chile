/* Capa de yacimientos: edad del depósito, tipo de yacimiento y roca de caja (unidad geológica del visor).
   Datos: data/yacimientos.json, generados por tools/armar_yacimientos.py desde SERNAGEOMIN (GDB), USGS MRDS y la tabla de
   edades de Maksaev et al. (2007) y de Camus (2003). Se carga después de app.js y usa sus funciones (mapa, filtro, elegir, abrir…). */
'use strict';
const yac = { on: true, sus: new Set(), tipos: new Set(), fuentes: new Set(), soloEdad: true, soloCaja: false, usarEdades: true, q: '', ul: null, color: 'tipo', lim: 60 };
let Y = [], YTIPO = {}, YVIS = [], YSEL = null, YREF = '';
const SUST_PRINC = ['Cu', 'Au', 'Ag', 'Fe', 'Mn', 'Pb', 'Zn', 'Mo'];
const SUST_NOM = { Cu: 'Cobre', Au: 'Oro', Ag: 'Plata', Fe: 'Hierro', Mn: 'Manganeso', Pb: 'Plomo', Zn: 'Zinc', Mo: 'Molibdeno', otros: 'Otros metálicos', nm: 'No metálicos' };
const FUENTES = [['GDB', 'SERNAGEOMIN (GDB)'], ['MRDS', 'USGS MRDS'], ['Maksaev', 'Maksaev y Townley (libro y apuntes)'], ['Camus', 'Camus (2003), sistemas porfíricos']];
const EF_TXT = { dep: 'edad del depósito', asoc: 'edad de la roca o del evento asociado (no del depósito mismo)', cinturon: 'edad del cinturón metalogénico al que pertenece (no medida en este depósito)', sup: 'edad supérgena: de la formación del depósito exótico, no de un pórfido' };

mapa.createPane('yacP'); mapa.getPane('yacP').style.zIndex = 450;
const rendY = L.canvas({ pane: 'yacP', padding: 0.3, tolerance: 5 });
const capaYac = L.layerGroup();
layersControl.addOverlay(capaYac, 'Yacimientos');  // parte apagada salvo que el usuario la haya dejado prendida
yac.on = mapa.hasLayer(capaYac); $('#y-on').checked = yac.on;
mapa.on('overlayadd', e => { if (e.layer === capaYac) { yac.on = true; $('#y-on').checked = true; } });
mapa.on('overlayremove', e => { if (e.layer === capaYac) { yac.on = false; $('#y-on').checked = false; } });
// al entrar a la pestaña se prenden (sin guardarlo: la próxima vez vuelven a partir apagados)
let yacPrendidoPorPestana = false;
function entrarYac() {
  if (!yac.on && !yacPrendidoPorPestana) {
    yacPrendidoPorPestana = true; yac.on = true; $('#y-on').checked = true; capaYac.addTo(mapa); pintarPanelCapas();
  }
  pintarYacPanel();
}
// rombo en vez de círculo: el yacimiento no se confunde con la localidad tipo de una unidad
const Rombo = L.CircleMarker.extend({ _updatePath() {
  const R = this._renderer;
  if (!R._drawing || this._empty()) return;
  const p = this._point, c = R._ctx, s = Math.max(this._radius, 1);
  c.beginPath(); c.moveTo(p.x, p.y - s); c.lineTo(p.x + s, p.y); c.lineTo(p.x, p.y + s); c.lineTo(p.x - s, p.y); c.closePath();
  R._fillStroke(c, this);
} });

const claseSust = r => r.nm ? ['nm'] : (() => { const s = r.s.filter(x => SUST_PRINC.includes(x)); return s.length ? s : ['otros']; })();
const colorY = r => $('#y-franjas')?.checked ? (metalico(r) && franjaDe(r)?.c || '#bdbdbd') : yac.color === 'edad' ? (r._ce || '#9e9e9e') : (YTIPO[r.t]?.c || '#bdc3c7');

/* ---------------- filtro ---------------- */
function pasaY(r, omitir) {
  if (yac.soloEdad && r.mx == null) return false;
  if (yac.usarEdades && filtro.ints.length && !(r.mx != null && filtro.ints.some(i => solapa(r, i.base, i.techo)))) return false;
  if (omitir !== 'sus' && yac.sus.size && !claseSust(r).some(c => yac.sus.has(c)) && !r.s.some(s => yac.sus.has(s))) return false;
  if (omitir !== 'tipo' && yac.tipos.size && !yac.tipos.has(r.t)) return false;
  if (omitir !== 'fu' && yac.fuentes.size && ![...yac.fuentes].some(f => r.fu.includes(f))) return false;
  if (yac.soloCaja && !(r.cu || r.cl)) return false;
  if (yac.ul && r.ul !== yac.ul) return false;
  if (yac.q && !r._txt.includes(yac.q)) return false;
  return true;
}

/* ---------------- capa ---------------- */
// el tamaño crece con el zoom: con todo el país a la vista los 2.000 puntos se tapan entre sí
// (radio del rombo = media diagonal: algo mayor que el del círculo para la misma superficie)
const radioY = () => { const z = mapa.getZoom(); return z <= 5 ? 3.4 : z <= 6 ? 4.2 : z <= 8 ? 5.4 : 7; };
mapa.on('zoomend', () => { const r = radioY(); for (const o of YVIS) o._m.setRadius(r); });
function crearMarcasY() {
  for (const r of Y) {
    const m = new Rombo([r.y, r.x], { renderer: rendY, radius: radioY(), weight: 1, color: '#2b2420', fillOpacity: 0.95, dashArray: r.ap ? '2 2' : null });
    m.on('click', ev => { L.DomEvent.stop(ev); elegirY(r.i, false); });
    m.on('mouseover', () => { if (!m.getTooltip()) m.bindTooltip(r.n, { className: 'etiqueta-u' }); m.openTooltip(); });
    r._m = m;
  }
}
function pintarYac() {
  if (!Y.length) return;
  capaYac.clearLayers();
  YVIS = Y.filter(r => pasaY(r));
  const rad = radioY();
  for (const r of YVIS) { r._m.setStyle({ fillColor: colorY(r), fillOpacity: 0.95, opacity: 1 }); r._m.setRadius(rad); capaYac.addLayer(r._m); }
  pintarYacPanel();
  pintarFranjas();
}

/* ---------------- panel ---------------- */
function chipY(set, clave, texto, color, n) {
  return el('button', { class: 'chip' + (set.has(clave) ? ' on' : ''), onclick: () => { set.has(clave) ? set.delete(clave) : set.add(clave); yac.lim = 60; pintarYac(); } },
    color ? el('i', { style: `background:${color}` }) : null, texto, el('small', {}, fmt(n)));
}
function pintarYacPanel() {
  if (!$('#p-yac')) return;
  const cuenta = (omitir, f) => { const m = new Map(); for (const r of Y) if (pasaY(r, omitir)) for (const k of f(r)) m.set(k, (m.get(k) || 0) + 1); return m; };
  const cS = cuenta('sus', r => new Set([...claseSust(r), ...r.s])), cT = cuenta('tipo', r => [r.t]), cF = cuenta('fu', r => FUENTES.filter(([k]) => r.fu.includes(k)).map(([k]) => k));
  const conUl = YVIS.filter(r => r.ul).length;
  // «N de M»: que se vea que hay filtros escondiendo yacimientos
  poner($('#y-resumen'), el('b', {}, fmt(YVIS.length)), YVIS.length < Y.length ? ` de ${fmt(Y.length)} yacimientos` : ' yacimientos', ` · ${fmt(conUl)} con unidad del visor`);
  $('#y-ver-n').textContent = YVIS.length ? `Ver ${fmt(YVIS.length)} yacimiento${YVIS.length === 1 ? '' : 's'}` : 'Ninguno: quita algún filtro';
  // filtros activos como chips removibles (incluido el acoplamiento con las edades de «Unidades»)
  const chipQ = (texto, quitar) => el('span', { class: 'chip on' }, texto,
    el('button', { class: 'quitar', title: 'Quitar', 'aria-label': `Quitar ${texto}`, onclick: e => { e.stopPropagation(); quitar(); yac.lim = 60; pintarYac(); } }, '✕'));
  const act = [
    yac.soloEdad ? chipQ('Solo con edad del depósito', () => { yac.soloEdad = false; $('#y-soloedad').checked = false; }) : null,
    yac.usarEdades && filtro.ints.length ? chipQ(`Edades de «Unidades»: ${filtro.ints.map(i => i.nombre).join(', ')}`, () => { yac.usarEdades = false; $('#y-usaredades').checked = false; }) : null,
    yac.ul ? chipQ(`Roca de caja: ${BYID[yac.ul]?.n || ''}`, () => { yac.ul = null; }) : null,
    [...yac.sus].map(k => chipQ(SUST_NOM[k] || k, () => yac.sus.delete(k))),
    [...yac.tipos].map(k => chipQ(YTIPO[k]?.n || k, () => yac.tipos.delete(k))),
    [...yac.fuentes].map(k => chipQ(FUENTES.find(f => f[0] === k)?.[1] || k, () => yac.fuentes.delete(k))),
    yac.soloCaja ? chipQ('Solo con roca de caja', () => { yac.soloCaja = false; $('#y-solocaja').checked = false; }) : null].flat().filter(Boolean);
  poner($('#y-activos'), act.length ? [act, el('button', { class: 'enlace', onclick: () => $('#y-limpiar').click() }, 'quitar todo')] : null);
  $('#y-activos').hidden = !act.length;
  $('#y-n-filtros').textContent = act.length ? ` · ${act.length}` : '';
  poner($('#y-f-sus'), [...SUST_PRINC, 'otros', 'nm'].map(k => chipY(yac.sus, k, `${SUST_NOM[k]}${SUST_PRINC.includes(k) ? ' (' + k + ')' : ''}`, null, cS.get(k) || 0)));
  poner($('#y-f-tipo'), Object.entries(YTIPO).map(([k, t]) => chipY(yac.tipos, k, t.n, t.c, cT.get(k) || 0)));
  poner($('#y-f-fu'), FUENTES.map(([k, n]) => chipY(yac.fuentes, k, n, null, cF.get(k) || 0)));
  const orden = [...YVIS].sort((a, b) => ((/Maksaev|Camus/.test(b.fu)) - (/Maksaev|Camus/.test(a.fu))) || (!!b.ul - !!a.ul) || ((b.mx != null) - (a.mx != null)) || a.n.localeCompare(b.n, 'es'));
  if (!YVIS.length) {
    const s = [...(yac.q ? [[`la búsqueda «${$('#y-q').value.trim()}»`, () => { yac.q = ''; $('#y-q').value = ''; pintarYac(); }]] : []),
      ...act.length ? [['todos los filtros', () => $('#y-limpiar').click()]] : []];
    poner($('#y-lista'), vacio('yacimientos', s));
  } else poner($('#y-lista'), orden.slice(0, yac.lim).map(r => el('li', { onclick: () => elegirY(r.i, true) },
    el('i', { style: `background:${colorY(r)}` }),
    el('span', {}, r.n, el('small', {}, [r.mx != null ? `${escMa(r.mx)}–${escMa(r.mn)}` : 'sin edad', YTIPO[r.t]?.n, r.s.join('/') || (r.nm ? 'no metálico' : '')].filter(Boolean).join(' · '))))),
    orden.length > yac.lim ? el('li', {}, el('button', { class: 'btn mas', onclick: e => { e.stopPropagation(); yac.lim += 200; pintarYacPanel(); } }, `Ver ${fmt(Math.min(200, orden.length - yac.lim))} más`)) : null);
  // leyenda de los puntos
  const ley = $('#y-leyenda');
  if (ley) poner(ley, yac.color === 'tipo' ? Object.entries(YTIPO).filter(([k]) => cT.get(k)).map(([k, t]) => el('span', { class: 'ley-y' }, el('i', { style: `background:${t.c}` }), t.n)) :
    [el('span', { class: 'nota' }, 'Colores de los puntos: período de la edad del depósito (tabla ICS).')]);
}

/* ---------------- ficha del yacimiento ---------------- */
function elegirY(i, volar) {
  const r = Y[i]; YSEL = i;
  capaSel.clearLayers(); capaEnl.clearLayers();
  L.circleMarker([r.y, r.x], { interactive: false, radius: 10, color: '#111', weight: 3, fillColor: '#fff', fillOpacity: 0.25 }).addTo(capaSel);
  abrir('ficha', volar ? 'alta' : 'media');
  if (volar && mapa.getSize().x) centrar([r.y, r.x], Math.max(mapa.getZoom(), 10));
  pintarFichaY(r);
}
function pintarFichaY(r) {
  const fila = (t, v) => v ? [el('dt', {}, t), el('dd', {}, v)] : null;
  const unidad = r.ul ? BYID[r.ul] : null;
  const fuentes = r.fu.split(' + ').map(f => ({ GDB: 'SERNAGEOMIN, base de Recursos Minerales de las cartas', MRDS: 'USGS, Mineral Resources Data System (2012)', Maksaev: 'Maksaev, Townley et al. (libro de 2007 y apuntes de los cursos)', Camus: 'Camus (2003), Geología de los sistemas porfíricos en los Andes de Chile (SERNAGEOMIN)' }[f] || f));
  const hermanos = r.ul ? Y.filter(o => o.ul === r.ul).length : 0;
  poner($('#p-ficha'), navFicha('yac'), el('div', { class: 'ficha' },
    el('h2', {}, r.n, el('span', { class: 'insignia auto' }, 'yacimiento')),
    el('div', { class: 'sub' }, [YTIPO[r.t]?.n, r.s.length ? r.s.join(' · ') : (r.nm ? 'No metálico o industrial' : ''), r.es].filter(Boolean).join(' · ')),
    el('div', { class: 'fila-btns' }, el('button', { class: 'btn primario', onclick: () => verEnMapa(() => centrar([r.y, r.x], Math.max(mapa.getZoom(), 11))) }, 'Ver en el mapa')),
    el('dl', {},
      el('dt', {}, 'Edad del depósito'),
      el('dd', {}, r.ed ? citas(r.ed) : 'Sin registro de edad en las fuentes',
        r.mx != null ? el('div', { class: 'ref' }, `Rango usado en el visor: ${escMa(r.mx)} – ${escMa(r.mn)} (${EF_TXT[r.ef] || 'edad registrada en la base'})`) : null, barraEdad(r)),
      el('dt', {}, 'Tipo de yacimiento'),
      el('dd', {}, [r.to ? `${r.to}${r.fo ? ' · forma: ' + r.fo : ''}` : (r.fo ? `Forma: ${r.fo}` : 'Sin clasificación en las fuentes'), el('div', { class: 'ref' }, `Categoría en el visor: ${YTIPO[r.t]?.n || '—'}`)]),
      el('dt', {}, 'Roca de caja'),
      el('dd', {}, r.cu || r.cl ? [r.cu ? (unidad ? el('div', {}, 'Unidad del visor: ', el('button', { class: 'enlace', onclick: () => elegir(unidad.id, true) }, unidad.n), el('span', { class: 'ref' }, ` (en la fuente: ${r.cu})`)) : el('div', {}, `Unidad o roca encajante: ${r.cu}`)) : null,
        r.cl ? el('div', {}, `Litología: ${r.cl}`) : null] : 'Sin registro de roca de caja'),
      fila('Distrito', r.di), fila('Región', r.re?.replace(/\|/g, ', ')), fila('Tamaño', r.ta),
      el('dt', {}, 'Fuentes'), el('dd', {}, el('ul', { class: 'lista-cartas' }, fuentes.map(f => el('li', {}, f)))),
      r.mk || r.ca ? [el('dt', {}, 'Referencia de la edad y la roca de caja'), el('dd', {}, [r.ca ? el('div', {}, r.ca + '.') : null, r.mk ? el('div', {}, r.mk + '.') : null])] : null,
      r.ap ? [el('dt', {}, 'Ubicación'), el('dd', {}, 'Aproximada (centro del distrito): no calzó con ningún registro de las bases.')] : null,
      hermanos > 1 ? [el('dt', {}, 'Misma roca de caja'), el('dd', {}, el('button', { class: 'enlace', onclick: () => verYacDe(r.ul) }, `Ver los ${fmt(hermanos)} yacimientos de ${unidad.n}`))] : null)));
}
function verYacDe(ul) {
  yac.ul = ul; yac.soloEdad = false; $('#y-soloedad').checked = false;
  if (!yac.on) { yac.on = true; $('#y-on').checked = true; capaYac.addTo(mapa); pintarPanelCapas(); }
  yac.lim = 60; pintarYac(); abrir('yac', 'media');
  const ys = Y.filter(r => r.ul === ul);
  if (ys.length) encuadre(L.latLngBounds(ys.map(r => [r.y, r.x])), 9);
}
// fila para la ficha de una unidad: cuántos yacimientos la tienen de roca de caja
function filaYacimientosDe(u) {
  const n = Y.filter(r => r.ul === u.id).length;
  return n ? [el('dt', {}, 'Yacimientos en esta unidad'), el('dd', {}, el('button', { class: 'enlace', onclick: () => verYacDe(u.id) }, `Ver ${fmt(n)} yacimiento${n === 1 ? '' : 's'} que la tienen de roca de caja`))] : null;
}
// «¿qué hay aquí?»: yacimientos a menos de 12 px del toque
function yacimientosCerca(ev) {
  if (!yac.on) return [];
  const p0 = mapa.latLngToContainerPoint(ev.latlng);
  return YVIS.filter(r => p0.distanceTo(mapa.latLngToContainerPoint([r.y, r.x])) < 12).slice(0, 12);
}

/* ---------------- controles ---------------- */
$('#y-on').onchange = e => { yac.on = e.target.checked; yac.on ? capaYac.addTo(mapa) : capaYac.remove(); if (typeof pintarPanelCapas === 'function') pintarPanelCapas(); };
$('#y-soloedad').onchange = e => { yac.soloEdad = e.target.checked; yac.lim = 60; pintarYac(); };
$('#y-solocaja').onchange = e => { yac.soloCaja = e.target.checked; yac.lim = 60; pintarYac(); };
$('#y-usaredades').onchange = e => { yac.usarEdades = e.target.checked; yac.lim = 60; pintarYac(); };
$$('#y-color button').forEach(b => b.onclick = () => { yac.color = b.dataset.c; $$('#y-color button').forEach(x => x.classList.toggle('on', x === b)); pintarYac(); });
let tyq;
$('#y-q').addEventListener('input', e => { clearTimeout(tyq); tyq = setTimeout(() => { yac.q = norm(e.target.value.trim()); yac.lim = 60; pintarYac(); }, 150); });
$('#y-limpiar').onclick = () => {
  Object.assign(yac, { q: '', ul: null, soloCaja: false, soloEdad: true, usarEdades: true, lim: 60 }); yac.sus.clear(); yac.tipos.clear(); yac.fuentes.clear();
  $('#y-q').value = ''; $('#y-solocaja').checked = false; $('#y-soloedad').checked = true; $('#y-usaredades').checked = true; pintarYac();
};

async function cargarYac() {
  const d = await fetch('data/yacimientos.json').then(r => r.json());
  YREF = d.ref_maksaev; YTIPO = Object.fromEntries(d.tipos.map(([k, n, c]) => [k, { n, c }]));
  Y = d.r;
  Y.forEach((r, i) => {
    r.i = i; r.s = r.s || [];
    r._txt = norm([r.n, r.di, r.cu, r.cl, r.to, r.re].join(' '));
    const m = r.mx != null ? medio(r) : null;
    if (m != null) r._ce = icsDe(m, 2)?.color;
  });
  crearMarcasY();
  $('#y-fecha').textContent = `${fmt(Y.length)} yacimientos: ${fmt(Y.filter(r => r.mx != null).length)} con edad, ${fmt(Y.filter(r => r.ul).length)} con la roca de caja enlazada a una unidad del visor.`;
  pintarYac();
}

/* ---------------- franjas por edad (shell-12) ----------------
   No es un mapa de calor: un conteo pondría a la Cordillera de la Costa (muchas vetas chicas del Cretácico, donde hay GDB) por encima
   de la franja de los pórfidos gigantes del Eoceno–Oligoceno, que tiene pocos registros. La franja es la envolvente de los yacimientos
   de cada intervalo: un disco de FR_KM alrededor de cada uno, fundidos. Entran los que tienen otro de la misma franja a menos de
   FR_VEC_KM, o que son de los principales (Maksaev, Camus); los sueltos suelen ser edades mal asignadas (la de la roca de caja).
   Intervalos y colores propios (no los de la ICS: Paleoceno, Eoceno y Oligoceno tienen casi el mismo naranjo). */
const FRANJAS = [
  { k: 'pz', n: 'Paleozoico–Triásico', b: 541, t: 201.4, c: '#7a7a7a' },
  { k: 'j', n: 'Jurásico', b: 201.4, t: 145, c: '#2f6db5' },
  { k: 'ki', n: 'Cretácico Inferior', b: 145, t: 100.5, c: '#3f9a3a' },
  { k: 'ks', n: 'Cretácico Superior', b: 100.5, t: 66, c: '#a3b82a' },
  { k: 'pe', n: 'Paleoceno–Eoceno temprano', b: 66, t: 45, c: '#e8743b' },
  { k: 'eo', n: 'Eoceno tardío–Oligoceno temprano', b: 45, t: 30, c: '#c0392b' },
  { k: 'm', n: 'Oligoceno tardío–Mioceno medio', b: 30, t: 11.6, c: '#c99a06' },
  { k: 'p', n: 'Mioceno tardío–Cuaternario', b: 11.6, t: 0, c: '#8e5ea2' }];
const FR_KM = 30, FR_VEC_KM = 40, FR_RANGO_MAX = 60;
const principal = r => /Maksaev|Camus/.test(r.fu);
// franja de un yacimiento: por el punto medio de su edad; sin franja si la edad es supérgena o el rango es muy amplio
function franjaDe(r) {
  if (r.mx == null || r.ef === 'sup' || r.mx - r.mn > FR_RANGO_MAX) return null;
  const m = (r.mx + r.mn) / 2;
  return FRANJAS.find(f => m <= f.b && m > f.t) || null;
}
// las franjas son metalogénicas: los no metálicos (salares, caliche, áridos) entran solo si se eligen en «Sustancia»
const metalico = r => !r.nm || yac.sus.has('nm');
const franjasOff = new Set();
// tocar una franja con todas a la vista la deja sola; después cada toque prende o apaga; si se apagan todas, vuelven todas
function tocarFranja(k) {
  if (!franjasOff.size) FRANJAS.forEach(f => { if (f.k !== k) franjasOff.add(f.k); });
  else if (franjasOff.has(k)) franjasOff.delete(k);
  else franjasOff.add(k);
  if (franjasOff.size === FRANJAS.length) franjasOff.clear();
  pintarFranjas();
}
let FR_GRUPOS = [];
function armarFranjas() {
  const km = (a, b) => 111.2 * Math.hypot((a.x - b.x) * Math.cos(a.y * Math.PI / 180), a.y - b.y);
  FR_GRUPOS = FRANJAS.map(f => {
    const todos = YVIS.filter(r => franjaDe(r) === f && metalico(r));
    const dentro = todos.filter(r => principal(r) || todos.some(o => o !== r && km(r, o) < FR_VEC_KM));
    return { f, todos, dentro };
  });
}
const CapaFranjas = L.Layer.extend({
  onAdd(map) {
    this._c = L.DomUtil.create('canvas', 'capa-franjas leaflet-zoom-hide');
    map.getPanes().overlayPane.appendChild(this._c);
    map.on('moveend zoomend resize', this.redibujar, this);
    this.redibujar();
  },
  onRemove(map) { this._c.remove(); map.off('moveend zoomend resize', this.redibujar, this); },
  redibujar() {
    const map = this._map; if (!map) return;
    const tam = map.getSize(), dpr = window.devicePixelRatio || 1, c = this._c;
    c.width = tam.x * dpr; c.height = tam.y * dpr; c.style.width = tam.x + 'px'; c.style.height = tam.y + 'px';
    L.DomUtil.setPosition(c, map.containerPointToLayerPoint([0, 0]));
    const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    const centro = map.getCenter(), p0 = map.latLngToContainerPoint(centro);
    const R = Math.max(5, p0.distanceTo(map.latLngToContainerPoint([centro.lat + FR_KM / 111.2, centro.lng])));
    const b = map.getBounds().pad(0.2);
    // dos pasadas por franja en lienzos aparte: el borde (disco R+2 menos disco R) y el relleno (unión de discos), cada uno con su opacidad
    const borde = document.createElement('canvas'), relleno = document.createElement('canvas');
    for (const o of [borde, relleno]) { o.width = c.width; o.height = c.height; }
    const discos = (g, ptos, r) => { g.beginPath(); for (const p of ptos) { g.moveTo(p.x + r, p.y); g.arc(p.x, p.y, r, 0, 2 * Math.PI); } g.fill(); };
    for (const { f, dentro } of FR_GRUPOS) {
      if (!dentro.length || franjasOff.has(f.k)) continue;
      const ptos = dentro.filter(r => b.contains([r.y, r.x])).map(r => map.latLngToContainerPoint([r.y, r.x]));
      if (!ptos.length) continue;
      const gb = borde.getContext('2d'), gr = relleno.getContext('2d');
      for (const g of [gb, gr]) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, tam.x, tam.y); g.globalCompositeOperation = 'source-over'; }
      gb.fillStyle = shade(f.c, -0.35); discos(gb, ptos, R + 2);
      gb.globalCompositeOperation = 'destination-out'; discos(gb, ptos, R);
      gr.fillStyle = f.c; discos(gr, ptos, R);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 0.3; ctx.drawImage(relleno, 0, 0);
      ctx.globalAlpha = 0.85; ctx.drawImage(borde, 0, 0);
    }
  } });
const capaFranjas = new CapaFranjas();
function pintarFranjas() {
  const on = $('#y-franjas').checked;
  if (on) { armarFranjas(); if (!mapa.hasLayer(capaFranjas)) capaFranjas.addTo(mapa); else capaFranjas.redibujar(); }
  else capaFranjas.remove();
  // rombos: los de franjas ocultas (o sin franja) quedan tenues
  if (on) for (const r of YVIS) {
    const f = metalico(r) && franjaDe(r), ve = f && !franjasOff.has(f.k);
    r._m.setStyle(ve ? { fillOpacity: 0.95, opacity: 1 } : { fillOpacity: 0.12, opacity: 0.15 });
  }
  const ley = $('#y-franjas-ley');
  ley.hidden = !on;
  if (!on) return;
  const grupos = FR_GRUPOS.filter(g => g.todos.length);
  poner(ley, grupos.length ? [
    el('p', { class: 'nota' }, franjasOff.size ? ['Toca otras para sumarlas. ', el('button', { class: 'enlace', onclick: () => { franjasOff.clear(); pintarFranjas(); } }, 'Ver todas')] : 'Toca una franja para verla sola.'),
    grupos.map(({ f, todos, dentro }) => el('button', { class: 'franja' + (franjasOff.has(f.k) ? ' off' : ''), 'aria-pressed': franjasOff.has(f.k) ? 'false' : 'true',
      title: `${f.n}: ${escMa(f.b)} – ${escMa(f.t)}. ${fmt(dentro.length)} yacimientos dibujan la franja; ${fmt(todos.length - dentro.length)} quedan sueltos. Toca para verla sola, o para sumarla o quitarla.`,
      onclick: () => tocarFranja(f.k) },
      el('i', { style: `background:${f.c}` }), f.n, el('small', {}, fmt(dentro.length)))),
    el('p', { class: 'nota' }, `Cada franja une discos de ${FR_KM} km alrededor de los yacimientos de esa edad (punto medio del rango) que tienen otro de la misma edad a menos de ${FR_VEC_KM} km, o que son de los principales (Maksaev, Camus). No cuenta yacimientos: un prospecto y un pórfido gigante pesan igual, y la densidad de registros depende de dónde hay cartas con GDB. Quedan fuera las edades supérgenas, los rangos de más de ${FR_RANGO_MAX} Ma y los no metálicos (salvo que elijas «No metálicos» en Sustancia). Con las franjas prendidas, los rombos se colorean por franja.`)]
    : el('p', { class: 'nota' }, 'Ningún yacimiento con edad pasa los filtros.'));
}
$('#y-franjas').onchange = () => { if ($('#y-franjas').checked && !yac.on) { yac.on = true; $('#y-on').checked = true; capaYac.addTo(mapa); pintarPanelCapas(); } pintarYac(); };

/* ---------------- diagrama edad–longitud (pestaña «Diagramas») ---------------- */
function pintarDiagY() {
  const caja = $('#perfil');
  if (!Y.length) { poner(caja, el('p', { class: 'nota' }, 'Cargando yacimientos…')); return; }
  const W = Math.max(300, caja.clientWidth || 360), H = 560, m = { l: 36, r: 10, t: 12, b: 30 };
  const vista = $('#diag-vista').checked ? mapa.getBounds() : null;
  const datos = YVIS.filter(r => franjaDe(r) && metalico(r) && (!vista || vista.contains([r.y, r.x])));
  if (!datos.length) { poner(caja, el('p', { class: 'nota' }, 'Ningún yacimiento con edad pasa los filtros' + (vista ? ' en la vista del mapa.' : '.'))); return; }
  const xs = datos.map(r => r.x).sort((a, b) => a - b), q = p => xs[Math.floor(p * (xs.length - 1))];
  const lon0 = Math.floor((q(0.005) - 0.1) * 2) / 2, lon1 = Math.ceil((q(0.995) + 0.1) * 2) / 2;
  const tMax = Math.min(541, Math.max(5, ...datos.map(r => (r.mx + r.mn) / 2)) * 1.05);
  const fy = escalaT === 'raiz' ? (t => Math.sqrt(t / tMax)) : (t => t / tMax);
  const X = lo => m.l + (W - m.l - m.r) * (lo - lon0) / (lon1 - lon0);
  const Yt = t => m.t + (H - m.t - m.b) * fy(Math.min(t, tMax));  // hoy arriba, lo antiguo abajo
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  const mk = (t, a, txt) => { const e = document.createElementNS(ns, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; return e; };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  for (const f of FRANJAS.filter(f => f.t < tMax)) {
    const y0 = Yt(f.t), y1 = Yt(Math.min(f.b, tMax));
    svg.append(mk('rect', { x: m.l, y: y0, width: W - m.l - m.r, height: Math.max(0, y1 - y0), fill: f.c, opacity: 0.1 }));
    svg.append(mk('rect', { x: W - m.r - 3, y: y0, width: 3, height: Math.max(0, y1 - y0), fill: f.c }));
  }
  const marcas = escalaT === 'raiz' ? [0, 5, 11.6, 30, 45, 66, 100, 145, 201, 252, 300, 400, 500] : [0, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500];
  for (const t of marcas.filter(t => t <= tMax)) {
    svg.append(mk('line', { x1: m.l, x2: W - m.r, y1: Yt(t), y2: Yt(t), stroke: 'currentColor', 'stroke-opacity': 0.1 }));
    svg.append(mk('text', { x: m.l - 4, y: Yt(t) + 3, 'text-anchor': 'end' }, fmt(t)));
  }
  svg.append(mk('text', { x: 2, y: H - 4 }, 'Ma'));
  const paso = lon1 - lon0 > 4 ? 1 : 0.5;
  for (let lo = Math.ceil(lon0 / paso) * paso; lo <= lon1 + 1e-9; lo += paso) {
    svg.append(mk('line', { x1: X(lo), x2: X(lo), y1: m.t, y2: H - m.b, stroke: 'currentColor', 'stroke-opacity': 0.08 }));
    svg.append(mk('text', { x: X(lo), y: H - m.b + 13, 'text-anchor': 'middle' }, `${fmt(-lo)}°O`));
  }
  svg.append(mk('text', { x: m.l, y: H - 3 }, '← costa'));
  svg.append(mk('text', { x: W - m.r, y: H - 3, 'text-anchor': 'end' }, 'cordillera →'));
  // los principales al final: quedan encima
  for (const r of [...datos].sort((a, b) => principal(a) - principal(b))) {
    const f = franjaDe(r), x = X(r.x), g = mk('g', { class: 'punto-y' });
    // la línea del rango solo si es acotado: los rangos de un período entero (comunes en la GDB) llenarían el diagrama de rayas
    if (r.mx - r.mn > 0 && (r.mx - r.mn <= 25 || principal(r))) g.append(mk('line', { x1: x, x2: x, y1: Yt(r.mn), y2: Yt(r.mx), stroke: f.c, 'stroke-opacity': 0.4, 'stroke-width': 1 }));
    g.append(mk('circle', { cx: x, cy: Yt((r.mx + r.mn) / 2), r: principal(r) ? 4.2 : 2.3, fill: f.c, 'fill-opacity': principal(r) ? 1 : 0.7,
      stroke: principal(r) ? '#111' : 'none', 'stroke-width': 1 }));
    g.append(mk('title', {}, `${r.n} · ${escMa(r.mx)} – ${escMa(r.mn)} · ${(-r.y).toFixed(1)}°S ${(-r.x).toFixed(2)}°O · ${YTIPO[r.t]?.n || ''}`));
    g.addEventListener('click', () => elegirY(r.i, true));
    svg.append(g);
  }
  if (YSEL != null && datos.includes(Y[YSEL])) { const r = Y[YSEL]; svg.append(mk('circle', { cx: X(r.x), cy: Yt((r.mx + r.mn) / 2), r: 8, fill: 'none', stroke: '#000', 'stroke-width': 2 })); }
  const lats = datos.map(r => r.y);
  poner(caja, svg, el('p', { class: 'nota' }, `${fmt(datos.length)} yacimientos con edad, entre ${fmt(Math.round(-Math.max(...lats)))}° y ${fmt(Math.round(-Math.min(...lats)))}° S. `,
    `${fmt(datos.filter(principal).length)} principales (círculo con borde). Bandas: las franjas de edad del mapa.`));
}
