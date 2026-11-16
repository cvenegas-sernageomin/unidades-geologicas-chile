/* Capa de yacimientos: edad del depósito, tipo de yacimiento y roca de caja (unidad geológica del visor).
   Datos: data/yacimientos.json, generados por tools/armar_yacimientos.py desde SERNAGEOMIN (GDB), USGS MRDS y la tabla de
   edades de Maksaev et al. (2007). Se carga después de app.js y usa sus funciones (mapa, filtro, elegir, abrir…). */
'use strict';
const yac = { on: true, sus: new Set(), tipos: new Set(), fuentes: new Set(), soloEdad: true, soloCaja: false, usarEdades: true, q: '', ul: null, color: 'tipo', lim: 60 };
let Y = [], YTIPO = {}, YVIS = [], YSEL = null, YREF = '';
const SUST_PRINC = ['Cu', 'Au', 'Ag', 'Fe', 'Mn', 'Pb', 'Zn', 'Mo'];
const SUST_NOM = { Cu: 'Cobre', Au: 'Oro', Ag: 'Plata', Fe: 'Hierro', Mn: 'Manganeso', Pb: 'Plomo', Zn: 'Zinc', Mo: 'Molibdeno', otros: 'Otros metálicos', nm: 'No metálicos' };
const FUENTES = [['GDB', 'SERNAGEOMIN (GDB)'], ['MRDS', 'USGS MRDS'], ['Maksaev', 'Maksaev y Townley (libro y apuntes)']];
const EF_TXT = { dep: 'edad del depósito', asoc: 'edad de la roca o del evento asociado (no del depósito mismo)', cinturon: 'edad del cinturón metalogénico al que pertenece (no medida en este depósito)' };

mapa.createPane('yacP'); mapa.getPane('yacP').style.zIndex = 450;
const rendY = L.canvas({ pane: 'yacP', padding: 0.3, tolerance: 5 });
const capaYac = L.layerGroup().addTo(mapa);
layersControl.addOverlay(capaYac, 'Yacimientos');
mapa.on('overlayadd', e => { if (e.layer === capaYac) { yac.on = true; $('#y-on').checked = true; } });
mapa.on('overlayremove', e => { if (e.layer === capaYac) { yac.on = false; $('#y-on').checked = false; } });

const claseSust = r => r.nm ? ['nm'] : (() => { const s = r.s.filter(x => SUST_PRINC.includes(x)); return s.length ? s : ['otros']; })();
const colorY = r => yac.color === 'edad' ? (r._ce || '#9e9e9e') : (YTIPO[r.t]?.c || '#bdc3c7');

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
const radioY = () => { const z = mapa.getZoom(); return z <= 5 ? 2.6 : z <= 6 ? 3.2 : z <= 8 ? 4.2 : 5.5; };
mapa.on('zoomend', () => { const r = radioY(); for (const o of YVIS) o._m.setRadius(r); });
function crearMarcasY() {
  for (const r of Y) {
    const m = L.circleMarker([r.y, r.x], { renderer: rendY, radius: radioY(), weight: 1.2, color: '#ffffff', fillOpacity: 1, dashArray: r.ap ? '2 2' : null });
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
  for (const r of YVIS) { r._m.setStyle({ fillColor: colorY(r) }); r._m.setRadius(rad); capaYac.addLayer(r._m); }
  pintarYacPanel();
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
  const conEdad = YVIS.filter(r => r.mx != null).length, conCaja = YVIS.filter(r => r.cu || r.cl).length, conUl = YVIS.filter(r => r.ul).length;
  poner($('#y-resumen'), el('b', {}, fmt(YVIS.length)), ` yacimientos a la vista · ${fmt(conEdad)} con edad · ${fmt(conCaja)} con roca de caja · ${fmt(conUl)} con unidad del visor`,
    yac.ul ? el('div', { class: 'edades-elegidas' }, 'Roca de caja: ', el('span', { class: 'chip on' }, BYID[yac.ul]?.n || '', el('button', { class: 'quitar', title: 'Quitar', onclick: () => { yac.ul = null; pintarYac(); } }, '✕'))) : null,
    yac.usarEdades && filtro.ints.length ? el('div', { class: 'nota' }, `Con las edades elegidas en la pestaña «Edad»: ${filtro.ints.map(i => i.nombre).join(', ')}.`) : null);
  poner($('#y-f-sus'), [...SUST_PRINC, 'otros', 'nm'].map(k => chipY(yac.sus, k, `${SUST_NOM[k]}${SUST_PRINC.includes(k) ? ' (' + k + ')' : ''}`, null, cS.get(k) || 0)));
  poner($('#y-f-tipo'), Object.entries(YTIPO).map(([k, t]) => chipY(yac.tipos, k, t.n, t.c, cT.get(k) || 0)));
  poner($('#y-f-fu'), FUENTES.map(([k, n]) => chipY(yac.fuentes, k, n, null, cF.get(k) || 0)));
  const orden = [...YVIS].sort((a, b) => (b.fu.includes('Maksaev') - a.fu.includes('Maksaev')) || (!!b.ul - !!a.ul) || ((b.mx != null) - (a.mx != null)) || a.n.localeCompare(b.n, 'es'));
  $('#y-lista-titulo').textContent = `Yacimientos (${fmt(YVIS.length)})`;
  poner($('#y-lista'), orden.slice(0, yac.lim).map(r => el('li', { onclick: () => elegirY(r.i, true) },
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
  if (volar && mapa.getSize().x) mapa.flyTo([r.y, r.x], Math.max(mapa.getZoom(), 10), { duration: 0.8 });
  pintarFichaY(r);
  abrir('ficha');
}
function pintarFichaY(r) {
  const fila = (t, v) => v ? [el('dt', {}, t), el('dd', {}, v)] : null;
  const unidad = r.ul ? BYID[r.ul] : null;
  const fuentes = r.fu.split(' + ').map(f => ({ GDB: 'SERNAGEOMIN, base de Recursos Minerales de las cartas', MRDS: 'USGS, Mineral Resources Data System (2012)', Maksaev: 'Maksaev, Townley et al. (libro de 2007 y apuntes de los cursos)' }[f] || f));
  const hermanos = r.ul ? Y.filter(o => o.ul === r.ul).length : 0;
  poner($('#p-ficha'), el('div', { class: 'ficha' },
    el('h2', {}, r.n, el('span', { class: 'insignia auto' }, 'yacimiento')),
    el('div', { class: 'sub' }, [YTIPO[r.t]?.n, r.s.length ? r.s.join(' · ') : (r.nm ? 'No metálico o industrial' : ''), r.es].filter(Boolean).join(' · ')),
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
      r.mk ? [el('dt', {}, 'Referencia de la edad y la roca de caja'), el('dd', {}, r.mk + '.')] : null,
      r.ap ? [el('dt', {}, 'Ubicación'), el('dd', {}, 'Aproximada (centro del distrito): no calzó con ningún registro de las bases.')] : null,
      hermanos > 1 ? [el('dt', {}, 'Misma roca de caja'), el('dd', {}, el('button', { class: 'enlace', onclick: () => verYacDe(r.ul) }, `Ver los ${fmt(hermanos)} yacimientos de ${unidad.n}`))] : null),
    el('div', { class: 'fila-btns' }, el('button', { class: 'btn', onclick: () => mapa.flyTo([r.y, r.x], Math.max(mapa.getZoom(), 11)) }, 'Ver en el mapa'),
      el('button', { class: 'btn', onclick: () => abrir('yac') }, 'Volver a la lista'))));
}
function verYacDe(ul) {
  yac.ul = ul; yac.soloEdad = false; $('#y-soloedad').checked = false;
  if (!yac.on) { yac.on = true; $('#y-on').checked = true; capaYac.addTo(mapa); }
  yac.lim = 60; pintarYac(); abrir('yac');
  const ys = Y.filter(r => r.ul === ul);
  if (ys.length) mapa.flyToBounds(L.latLngBounds(ys.map(r => [r.y, r.x])), { padding: [40, 40], maxZoom: 9 });
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
