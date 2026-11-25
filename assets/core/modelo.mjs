// Operaciones sobre un modelo de vivienda. Todas ajustan a la trama de 0,75 m y mutan el modelo recibido.
import { T, snap, r3, uid, clamp, H_PLANTA, VUELO_MAX } from './trama.mjs';
import { TIPOS, esDorm, esInt, CUBIERTA_MATERIALES } from './catalogo.mjs';
import { celdasPlanta, bbox, muros, huecosFachada } from './geometria.mjs';
import { sanearBordes, transformarBordes } from './bordes.mjs';
import { normViv, esEdificio, siguienteVivienda } from './edificio.mjs';
import { normalizarCimentacion, normalizarExteriores, transformarCimentacion, desplazarExteriores } from './cimentacion.mjs';
import { normalizarSotano, espejoSotano, rotarSotano, recolocarSotano, estirarSotano, sanearRampa, tipoSotanoOk, SOTANO } from './sotano.mjs'; // v.1.6: planta sótano

export const NOMBRES_PLANTA = ['Planta baja', 'Planta primera', 'Planta segunda', 'Planta tercera', 'Planta cuarta', 'Planta quinta'];
export const IDS_PLANTA = ['PB', 'P1', 'P2', 'P3', 'P4', 'P5'];

export function nuevoModelo(nombre = 'Modelo nuevo') {
  return normalizar({ id: uid('m'), nombre, familia: 'myway', acceso: 'N', plantas: [{ estancias: [] }] });
}

export function normalizar(m) {
  m.id = m.id || uid('m');
  m.acceso = m.acceso || 'N';
  m.cubierta = Object.assign({ tipo: 'plana', alero: 0 }, m.cubierta || {});
  if (m.cubierta.tipo === 'dos aguas') m.cubierta.tipo = 'dos';
  if (!CUBIERTA_MATERIALES[m.cubierta.material]) m.cubierta.material = m.cubierta.tipo === 'plana' ? 'grava' : m.familia === 'myway' ? 'chapa' : 'teja';
  if (!CUBIERTA_MATERIALES[m.cubierta.material].colores[m.cubierta.color]) m.cubierta.color = Object.keys(CUBIERTA_MATERIALES[m.cubierta.material].colores)[0];
  if (m.cubierta.pendiente == null) m.cubierta.pendiente = CUBIERTA_MATERIALES[m.cubierta.material].pend;
  m.cubierta.cumbrera = m.cubierta.cumbrera || 'auto';
  if (m.cubierta.caida !== undefined && !['N', 'S', 'E', 'O'].includes(m.cubierta.caida)) delete m.cubierta.caida; // v.1.6: caída de la cubierta a un agua
  if (m.cimentacion !== undefined) { const c = normalizarCimentacion(m.cimentacion); if (c) m.cimentacion = c; else delete m.cimentacion; } // v.1.6: forjado sanitario
  if (m.exteriores !== undefined) { const x = normalizarExteriores(m.exteriores); if (x?.length) m.exteriores = x; else delete m.exteriores; } // v.1.6: escaleras, rampas y plataformas
  m.jardin = m.jardin || 'sin';
  m.cubierta.alero = clamp(snap(m.cubierta.alero || 0, 0.25), 0, VUELO_MAX);
  m.acabados = Object.assign({ fachada: 'mineral', carpinteria: 'oscura', nivel: 'confort' }, m.acabados || {});
  m.complementos = m.complementos || [];
  m.medianeras = m.medianeras || [];
  m.plantas = (m.plantas || []).slice(0, 6); // baja + 5 (como addPlanta)
  if (!m.plantas.length) m.plantas.push({ estancias: [] });
  m.plantas.forEach((p, i) => {
    p.id = IDS_PLANTA[i]; p.nombre = NOMBRES_PLANTA[i]; p.altura = H_PLANTA;
    p.apoyos = (p.apoyos || []).map((a) => ({ x: snap(a.x), y: snap(a.y) }));
    p.estancias = (p.estancias || []).filter((e) => TIPOS[e.tipo]);
    for (const e of p.estancias) {
      e.id = e.id || uid();
      e.x = snap(e.x); e.y = snap(e.y); e.w = Math.max(T, snap(e.w)); e.h = Math.max(T, snap(e.h));
      if (e.vivienda !== undefined) { const v = normViv(e.vivienda); if (v) e.vivienda = v; else delete e.vivienda; } // v.1.5: edificios
      if (e.entrada !== undefined && typeof e.entrada !== 'boolean') e.entrada = !!e.entrada;
    }
    if (p.bordes !== undefined) { const b = sanearBordes(p.bordes); if (b) p.bordes = b; else delete p.bordes; } // v.1.3: anulaciones de bordes
  });
  if (m.sotano !== undefined) normalizarSotano(m); // v.1.6: planta sótano (campo aparte, fuera de m.plantas)
  renombrar(m);
  return m;
}

// Nombres automáticos («Dormitorio 2») para las estancias sin nombre propio. En un edificio (v.1.5) se numeran por
// vivienda, y las zonas comunes de paso se llaman «Portal» (recibidor común) y «Rellano» (distribuidor o pasillo común).
export function renombrar(m) {
  const U = (e) => e.vivienda || ''; const edif = esEdificio(m);
  const PL = m.sotano?.estancias ? [...m.plantas, m.sotano] : m.plantas; // v.1.6: el sótano también se numera
  const n = {};
  for (const p of PL) for (const e of p.estancias) {
    if (e.nombreFijo) continue;
    const base = TIPOS[e.tipo].n; const k = U(e) + '|' + e.tipo; n[k] = (n[k] || 0) + 1;
    e._n = n[k]; e._base = base;
  }
  for (const p of PL) for (const e of p.estancias) {
    if (e.nombreFijo) continue;
    e.nombre = n[U(e) + '|' + e.tipo] > 1 && !['escalera', 'pasillo', 'distribuidor', 'recibidor', 'ascensor'].includes(e.tipo) ? e._base + ' ' + e._n : e._base;
    if (edif && !U(e)) { if (e.tipo === 'recibidor') e.nombre = 'Portal'; else if (e.tipo === 'distribuidor' || e.tipo === 'pasillo') e.nombre = 'Rellano'; }
    delete e._n; delete e._base;
  }
  // dormitorios: el principal es el 1 (por vivienda)
  const d = {}; const hayPpal = {};
  for (const p of PL) for (const e of p.estancias) if (e.tipo === 'dormitorio_principal') hayPpal[U(e)] = true;
  for (const p of PL) for (const e of p.estancias) if (e.tipo === 'dormitorio' && !e.nombreFijo) { const u = U(e); d[u] = (d[u] || 1) + 1; e.nombre = 'Dormitorio ' + (hayPpal[u] ? d[u] : d[u] - 1); }
}

// v.1.6: planta por índice; -1 = planta sótano (modelo.sotano, fuera de m.plantas).
export const plantaDe = (m, pi) => (pi === -1 ? m?.sotano : m?.plantas?.[pi]);
export const buscar = (m, id) => { for (let pi = 0; pi < m.plantas.length; pi++) { const e = m.plantas[pi].estancias.find((x) => x.id === id); if (e) return { e, pi }; } const s = m.sotano?.estancias?.find((x) => x.id === id); return s ? { e: s, pi: -1 } : null; };

function libre(planta, x, y, w, h, salvo) {
  for (const e of planta.estancias) {
    if (e.id === salvo) continue;
    if (x < e.x + e.w - 1e-6 && x + w > e.x + 1e-6 && y < e.y + e.h - 1e-6 && y + h > e.y + 1e-6) return false;
  }
  return true;
}
// Busca hueco libre pegado a la huella existente (máximo contacto).
export function sitioLibre(m, pi, w, h) {
  const p = plantaDe(m, pi); if (!p.estancias.length) return { x: 0, y: 0 };
  const b = bbox({ plantas: [p] }); let best = null;
  const { m: cel } = celdasPlanta(p);
  for (let x = b.x0 - w; x <= b.x1 + 1e-6; x += T) for (let y = b.y0 - h; y <= b.y1 + 1e-6; y += T) {
    if (!libre(p, x, y, w, h)) continue;
    let contacto = 0;
    for (let a = 0; a < w / T; a++) { if (cel.has(Math.round(x / T + a) + ',' + Math.round(y / T - 1))) contacto++; if (cel.has(Math.round(x / T + a) + ',' + Math.round((y + h) / T))) contacto++; }
    for (let a = 0; a < h / T; a++) { if (cel.has(Math.round(x / T - 1) + ',' + Math.round(y / T + a))) contacto++; if (cel.has(Math.round((x + w) / T) + ',' + Math.round(y / T + a))) contacto++; }
    if (!contacto) continue;
    const crece = Math.max(0, b.x0 - x) + Math.max(0, x + w - b.x1) + Math.max(0, b.y0 - y) + Math.max(0, y + h - b.y1);
    const sc = contacto * 2 - crece * 3;
    if (!best || sc > best.sc) best = { x: r3(x), y: r3(y), sc };
  }
  return best ? { x: best.x, y: best.y } : { x: b.x1, y: b.y0 };
}

export function addEstancia(m, pi, d) {
  const t = TIPOS[d.tipo]; if (!t) throw new Error('Tipo de estancia desconocido: ' + d.tipo);
  const p = plantaDe(m, pi); if (!p) throw new Error(pi === -1 ? 'El modelo no tiene planta sótano' : 'Planta inexistente: ' + pi);
  if (pi === -1 && !tipoSotanoOk(d.tipo)) throw new Error(`En el sótano solo van estancias interiores (no ${t.n.toLowerCase()})`);
  const w = Math.max(T, snap(d.w || 3)), h = Math.max(T, snap(d.h || 3));
  const pos = d.x == null || d.y == null ? sitioLibre(m, pi, w, h) : { x: snap(d.x), y: snap(d.y) };
  const e = { id: uid(), tipo: d.tipo, x: pos.x, y: pos.y, w, h };
  if (d.nombre) { e.nombre = d.nombre; e.nombreFijo = true; }
  for (const k of ['suite', 'cerrada', 'huecos', 'comp']) if (d[k] != null) e[k] = d[k];
  if (d.vivienda != null && normViv(d.vivienda)) e.vivienda = normViv(d.vivienda); if (d.entrada) e.entrada = true;
  p.estancias.push(e); renombrar(m); return e;
}
export function editarEstancia(m, id, d) {
  const r = buscar(m, id); if (!r) throw new Error('Estancia no encontrada: ' + id);
  const e = r.e; const antes = { x: e.x, y: e.y, w: e.w, h: e.h };
  if (d.tipo && TIPOS[d.tipo] && (r.pi === -1 || d.planta === -1) && !tipoSotanoOk(d.tipo)) throw new Error('En el sótano solo van estancias interiores');
  if (d.tipo && TIPOS[d.tipo]) e.tipo = d.tipo;
  const num = (v) => { const n = Number(v); if (!Number.isFinite(n)) throw new Error('Valor no numérico: ' + v); return n; };
  for (const k of ['x', 'y']) if (d[k] != null) e[k] = snap(clamp(num(d[k]), -200, 200));
  for (const k of ['w', 'h']) if (d[k] != null) e[k] = Math.max(T, snap(clamp(num(d[k]), T, 60)));
  seguirHuecos(plantaDe(m, r.pi), antes, e);
  if (d.nombre != null) { if (d.nombre) { e.nombre = d.nombre; e.nombreFijo = true; } else delete e.nombreFijo; }
  for (const k of ['suite', 'cerrada', 'corredera', 'pilares']) if (d[k] != null) e[k] = !!d[k];
  if (d.taller != null) { if (d.taller && e.tipo === 'garaje') e.taller = true; else delete e.taller; } // garaje taller: la regla GARAJE admite más superficie
  if (d.huecos) e.huecos = Object.assign({}, e.huecos, d.huecos);
  if (d.vivienda != null) { const v = normViv(d.vivienda); if (v) e.vivienda = v; else delete e.vivienda; } // v.1.5: '' = zona común
  if (d.entrada != null) { if (d.entrada) e.entrada = true; else delete e.entrada; }
  if (d.planta != null && d.planta !== r.pi && !plantaDe(m, d.planta)) throw new Error('Planta inexistente: ' + d.planta);
  if (d.planta === -1 && r.pi !== -1 && !tipoSotanoOk(e.tipo)) throw new Error('En el sótano solo van estancias interiores'); // v.1.6
  if (d.planta != null && d.planta !== r.pi && plantaDe(m, d.planta)) {
    plantaDe(m, r.pi).estancias = plantaDe(m, r.pi).estancias.filter((x) => x.id !== id); plantaDe(m, d.planta).estancias.push(e);
  }
  renombrar(m); return e;
}
export function eliminarEstancia(m, id) {
  const r = buscar(m, id); if (!r) return false;
  const p = plantaDe(m, r.pi); p.estancias = p.estancias.filter((x) => x.id !== id); renombrar(m); return true;
}
export function duplicarEstancia(m, id) {
  const r = buscar(m, id); if (!r) return null;
  const pos = sitioLibre(m, r.pi, r.e.w, r.e.h);
  const e = Object.assign(JSON.parse(JSON.stringify(r.e)), { id: uid(), x: pos.x, y: pos.y }); delete e.nombreFijo;
  plantaDe(m, r.pi).estancias.push(e); renombrar(m); return e;
}

// Estira (delta > 0) o encoge (delta < 0) la casa a partir de una línea: mueve lo que está más allá y
// alarga lo que la cruza. eje 'x': línea vertical en x = pos. plantas: índice o 'todas'.
export function estirar(m, eje, pos, delta, plantas = 'todas') {
  delta = snap(delta); if (!delta) return m; // pos puede caer dentro de una celda: estira lo que cruza esa línea
  const [c, d] = eje === 'x' ? ['x', 'w'] : ['y', 'h'];
  m.plantas.forEach((p, pi) => {
    if (plantas !== 'todas' && plantas !== pi) return;
    for (const e of p.estancias) {
      if (e[c] >= pos - 1e-6) e[c] = r3(e[c] + delta);
      else if (e[c] + e[d] > pos + 1e-6) e[d] = Math.max(T, r3(e[d] + delta));
      else if (delta < 0 && Math.abs(e[c] + e[d] - pos) < 1e-6) e[d] = Math.max(T, r3(e[d] + delta)); // encoger: recorta lo que acaba en la línea
    }
    for (const a of p.apoyos || []) if (a[c] >= pos - 1e-6) a[c] = r3(a[c] + delta);
    for (const h of [...(p.huecosManual || []), ...(p.puertasManual || [])]) if (h[c] >= pos - 1e-6) h[c] = r3(h[c] + delta);
    const dn = Math.round(delta / T); // bordes: lo que queda más allá de la línea se desplaza con la casa
    transformarBordes(p, (q) => { const sobreEje = (q.o === 'v') === (eje === 'x'); const v = sobreEje ? q.line : q.pos; return v * T >= pos - 1e-6 ? (sobreEje ? { ...q, line: v + dn } : { ...q, pos: v + dn }) : q; });
  });
  if (plantas === 'todas' || plantas === 0) desplazarExteriores(m, (x, y) => (eje === 'x' ? [x >= pos - 1e-6 ? x + delta : x, y] : [x, y >= pos - 1e-6 ? y + delta : y])); // v.1.6
  if (plantas === 'todas' || plantas === -1) estirarSotano(m, eje, pos, delta); // v.1.6: el sótano se estira con la casa
  return m;
}

export function addPlanta(m, modo = 'escalera') {
  if (m.plantas.length >= 6) throw new Error('Máximo 6 plantas sobre rasante (baja + 5)');
  const inf = m.plantas[m.plantas.length - 1]; const pi = m.plantas.length;
  const nueva = { estancias: [], apoyos: [] };
  if (modo === 'copia') {
    nueva.estancias = inf.estancias.filter((e) => !TIPOS[e.tipo].ext && !TIPOS[e.tipo].vacio && e.tipo !== 'garaje').map((e) => Object.assign(JSON.parse(JSON.stringify(e)), { id: uid(), nombreFijo: false }));
    // v.1.5: en un edificio, las viviendas copiadas son viviendas nuevas (otra etiqueta), no dúplex de las de abajo
    const usadas = new Set(m.plantas.flatMap((p) => p.estancias.map((e) => e.vivienda).filter(Boolean))); const mapa = new Map();
    for (const e of nueva.estancias) if (e.vivienda && !mapa.has(e.vivienda)) {
      const v0 = e.vivienda; const num = /^\d+/.exec(v0); let v = num ? String(pi) + v0.slice(num[0].length) : '';
      if (!v || usadas.has(v)) v = siguienteVivienda({ plantas: [{ estancias: [...usadas].map((x) => ({ vivienda: x })) }] }, num ? pi : null);
      usadas.add(v); mapa.set(v0, v);
    }
    for (const e of nueva.estancias) if (e.vivienda) e.vivienda = mapa.get(e.vivienda);
  } else {
    let esc = inf.estancias.find((e) => e.tipo === 'escalera' && !e.vivienda) || inf.estancias.find((e) => e.tipo === 'escalera');
    if (!esc) { // crea la escalera abajo, en el mejor sitio libre, y arriba encima
      esc = addEstancia(m, m.plantas.length - 1, { tipo: 'escalera', w: 1.5, h: 4.5 });
    }
    const subir = [esc, ...inf.estancias.filter((e) => e.tipo === 'ascensor' && !e.vivienda)]; // v.1.5: el núcleo común sube entero
    for (const q of subir) { const c = { id: uid(), tipo: q.tipo, x: q.x, y: q.y, w: q.w, h: q.h }; if (q.vivienda) c.vivienda = q.vivienda; nueva.estancias.push(c); }
  }
  m.plantas.push(nueva); return normalizar(m);
}
export function removePlanta(m, pi) {
  if (m.plantas.length <= 1) throw new Error('La vivienda necesita al menos una planta');
  if (!Number.isInteger(pi) || pi < 0 || pi >= m.plantas.length) throw new Error('Planta inexistente: ' + pi);
  m.plantas.splice(pi, 1); return normalizar(m);
}

// v.1.6 · Planta sótano (modelo.sotano, ver core/sotano.mjs). programa: garaje | bodega | completo | vacio.
// La escalera baja en el mismo hueco que la de planta baja (si no hay, se crea en planta baja); el garaje se coloca
// junto a ella, bajo la casa y hacia el lado de acceso, y la rampa arranca de su fachada hacia ese lado.
export function addSotano(m, { libre, programa = 'garaje', rampa = true } = {}) {
  if (m.sotano) throw new Error('El modelo ya tiene planta sótano');
  if (!['garaje', 'bodega', 'completo', 'vacio'].includes(programa)) programa = 'garaje';
  const pb = m.plantas[0]; const acc = ['N', 'S', 'E', 'O'].includes(m.acceso) ? m.acceso : 'N';
  let esc = pb.estancias.find((e) => e.tipo === 'escalera' && !e.vivienda) || pb.estancias.find((e) => e.tipo === 'escalera');
  if (!esc && pb.estancias.length) esc = addEstancia(m, 0, { tipo: 'escalera', w: 1.5, h: 4.5 });
  m.sotano = { estancias: [], apoyos: [], libre: libre ?? SOTANO.libre };
  if (esc) m.sotano.estancias.push({ id: uid(), tipo: 'escalera', x: esc.x, y: esc.y, w: esc.w, h: esc.h, ...(esc.vivienda ? { vivienda: esc.vivienda } : {}) });
  if (programa === 'garaje' || programa === 'completo') {
    const G = 6; const casa = celdasPlanta(pb).m; const b = bbox(m); const borde = { N: b.y0, S: b.y1, E: b.x1, O: b.x0 }[acc];
    const cands = [];
    if (esc) for (let k = -Math.round(G / T); k <= Math.round(Math.max(esc.w, esc.h) / T); k++) { const o = k * T;
      cands.push([esc.x - G, esc.y + o], [esc.x + esc.w, esc.y + o], [esc.x + o, esc.y - G], [esc.x + o, esc.y + esc.h]); }
    else cands.push(acc === 'N' || acc === 'S' ? [snap((b.x0 + b.x1) / 2 - G / 2), acc === 'N' ? b.y0 : b.y1 - G] : [acc === 'O' ? b.x0 : b.x1 - G, snap((b.y0 + b.y1) / 2 - G / 2)]);
    let best = null;
    for (const [x0, y0] of cands) {
      const x = r3(x0), y = r3(y0); if (esc && (x < esc.x + esc.w - 1e-6 && x + G > esc.x + 1e-6 && y < esc.y + esc.h - 1e-6 && y + G > esc.y + 1e-6)) continue;
      if (esc) { const ox = Math.min(x + G, esc.x + esc.w) - Math.max(x, esc.x), oy = Math.min(y + G, esc.y + esc.h) - Math.max(y, esc.y); if (Math.max(ox, oy) < 1.5 - 1e-6) continue; } // comparte al menos 1,50 m con la escalera
      let bajo = 0; for (let i = 0; i < G / T; i++) for (let j = 0; j < G / T; j++) { const q = casa.get(Math.round(x / T + i) + ',' + Math.round(y / T + j)); if (q && !TIPOS[q.tipo].vacio) bajo++; }
      const lado = { N: y, S: y + G, E: x + G, O: x }[acc]; const sc = bajo - 6 * Math.abs(lado - borde) / T;
      if (!best || sc > best.sc) best = { x, y, sc };
    }
    if (best) m.sotano.estancias.push({ id: uid(), tipo: 'garaje', x: best.x, y: best.y, w: G, h: G });
  }
  if (programa === 'bodega' || programa === 'completo') addEstancia(m, -1, { tipo: 'bodega', w: 3, h: 3 });
  if (programa === 'completo') { addEstancia(m, -1, { tipo: 'trastero', w: 2.25, h: 3 }); addEstancia(m, -1, { tipo: 'instalaciones', w: 1.5, h: 2.25 }); }
  if (rampa && m.sotano.estancias.some((e) => e.tipo === 'garaje')) m.sotano.rampa = sanearRampa({ lado: acc }, m);
  return normalizar(m).sotano;
}
export function removeSotano(m) {
  if (!m.sotano) throw new Error('El modelo no tiene planta sótano');
  delete m.sotano; return normalizar(m);
}

export function espejo(m, eje = 'x') {
  const b = bbox(m);
  for (const p of m.plantas) {
    for (const e of p.estancias) {
      if (eje === 'x') e.x = r3(b.x0 + b.x1 - e.x - e.w); else e.y = r3(b.y0 + b.y1 - e.y - e.h);
      if (e.huecos) { const h = e.huecos, n = {}; const sw = eje === 'x' ? { E: 'O', O: 'E' } : { N: 'S', S: 'N' }; for (const k in h) n[sw[k] || k] = h[k]; e.huecos = n; }
      girarLados(e, eje === 'x' ? { E: 'O', O: 'E' } : { N: 'S', S: 'N' });
    }
    for (const a of p.apoyos || []) { if (eje === 'x') a.x = r3(b.x0 + b.x1 - a.x); else a.y = r3(b.y0 + b.y1 - a.y); }
    { const S0 = Math.round((eje === 'x' ? b.x0 + b.x1 : b.y0 + b.y1) / T); transformarBordes(p, (q) => (q.o === 'v') === (eje === 'x') ? { ...q, line: S0 - q.line } : { ...q, pos: S0 - 1 - q.pos }); }
  }
  for (const p of m.plantas) for (const h of [...(p.huecosManual || []), ...(p.puertasManual || [])]) { if (eje === 'x') h.x = r3(b.x0 + b.x1 - h.x); else h.y = r3(b.y0 + b.y1 - h.y); if (h.abre) h.abre = (eje === 'x') === (h.o === 'v') ? -h.abre : h.abre; if ((eje === 'x') === (h.o === 'h')) h.bisagra = h.bisagra === 'fin' ? 'ini' : 'fin'; }
  for (const p of m.plantas) for (const e of p.estancias) espejoEstancia(m, e.id, eje);
  if (m.sotano) { espejoSotano(m, eje, b); for (const e of m.sotano.estancias) espejoEstancia(m, e.id, eje); } // v.1.6
  const sw = eje === 'x' ? { E: 'O', O: 'E' } : { N: 'S', S: 'N' };
  m.acceso = sw[m.acceso] || m.acceso; m.medianeras = m.medianeras.map((l) => sw[l] || l);
  if (m.cubierta?.caida) m.cubierta.caida = sw[m.cubierta.caida] || m.cubierta.caida; // v.1.6: caída, vuelos del forjado sanitario y accesos exteriores
  transformarCimentacion(m, sw, (x, y) => (eje === 'x' ? [b.x0 + b.x1 - x, y] : [x, b.y0 + b.y1 - y]), true);
  return m;
}
export function rotar(m) { // 90° en sentido horario
  const b = bbox(m); const g = { N: 'E', E: 'S', S: 'O', O: 'N' };
  for (const p of m.plantas) {
    for (const e of p.estancias) {
      const nx = b.y1 - (e.y + e.h), ny = e.x - b.x0; [e.x, e.y, e.w, e.h] = [r3(nx), r3(ny), e.h, e.w];
      if (e.huecos) { const n = {}; for (const k in e.huecos) n[g[k]] = e.huecos[k]; e.huecos = n; }
      girarLados(e, g);
    }
    for (const a of p.apoyos || []) { const nx = b.y1 - a.y, ny = a.x - b.x0; a.x = r3(nx); a.y = r3(ny); }
    { const X0 = Math.round(b.x0 / T), Y1 = Math.round(b.y1 / T); transformarBordes(p, (q) => (q.o === 'h' ? { o: 'v', line: Y1 - q.line, pos: q.pos - X0 } : { o: 'h', line: q.line - X0, pos: Y1 - q.pos - 1 })); }
  }
  for (const p of m.plantas) {
    for (const h of [...(p.huecosManual || []), ...(p.puertasManual || [])]) { const nx = b.y1 - h.y, ny = h.x - b.x0; h.x = r3(nx); h.y = r3(ny); if (h.o === 'h') { if (h.abre) h.abre = -h.abre; } else h.bisagra = h.bisagra === 'fin' ? 'ini' : 'fin'; h.o = h.o === 'h' ? 'v' : 'h'; }
    for (const e of p.estancias) {
      if (Array.isArray(e.mobiliario)) for (const it of e.mobiliario) { const ndx = r3(e.w - it.dy - it.h), ndy = it.dx; [it.dx, it.dy, it.w, it.h] = [ndx, ndy, it.h, it.w]; it.giro = ((it.giro || 0) + 90) % 360; }
      const ex = e.espejoX, ey = e.espejoY; e.espejoX = ey; e.espejoY = ex; if (e.sube) e.sube = g[e.sube];
    }
  }
  rotarSotano(m, b); // v.1.6
  m.acceso = g[m.acceso]; m.medianeras = m.medianeras.map((l) => g[l]);
  if (m.cubierta) { if (m.cubierta.caida) m.cubierta.caida = g[m.cubierta.caida]; if (m.cubierta.cumbrera === 'x' || m.cubierta.cumbrera === 'y') m.cubierta.cumbrera = m.cubierta.cumbrera === 'x' ? 'y' : 'x'; } // v.1.6: la cubierta gira con la casa
  transformarCimentacion(m, g, (x, y) => [b.y1 - y, x - b.x0]);
  return m;
}
// Lleva la esquina superior izquierda de la huella a (0,0).
export function recolocar(m) {
  const b = bbox(m); if (!b.x0 && !b.y0) return m;
  for (const p of m.plantas) { for (const e of p.estancias) { e.x = r3(e.x - b.x0); e.y = r3(e.y - b.y0); } for (const a of [...(p.apoyos || []), ...(p.huecosManual || []), ...(p.puertasManual || [])]) { a.x = r3(a.x - b.x0); a.y = r3(a.y - b.y0); }
    const di = Math.round(b.x0 / T), dj = Math.round(b.y0 / T); transformarBordes(p, (q) => (q.o === 'h' ? { o: 'h', line: q.line - dj, pos: q.pos - di } : { o: 'v', line: q.line - di, pos: q.pos - dj })); }
  desplazarExteriores(m, (x, y) => [x - b.x0, y - b.y0]); // v.1.6
  recolocarSotano(m, b); // v.1.6
  return m;
}
// Lados de celosía y barandilla de una estancia tras un espejo o un giro de la casa (mapa de lados)
function girarLados(e, mapa) {
  if (Array.isArray(e.celosia?.lados)) e.celosia.lados = e.celosia.lados.map((l) => mapa[l] || l);
  if (Array.isArray(e.barandilla)) e.barandilla = e.barandilla.map((l) => mapa[l] || l);
}
export function toggleApoyo(m, pi, x, y) {
  const p = plantaDe(m, pi); if (!p) throw new Error('Planta inexistente: ' + pi); x = snap(x); y = snap(y); p.apoyos = p.apoyos || [];
  const i = p.apoyos.findIndex((a) => a.x === x && a.y === y);
  if (i >= 0) p.apoyos.splice(i, 1); else p.apoyos.push({ x, y });
  return i < 0;
}

// Generador paramétrico de una casa en barra (lógica Line): banda norte de servicio (1,5 m) y banda sur de estancias (3 m).
export function generarBarra({ dormitorios = 2, banos = 1, despacho = false, salon = 6, porche = true, nombre } = {}) {
  dormitorios = clamp(dormitorios, 0, 5); banos = clamp(banos, 1, 3);
  const E = []; let x = 0; const S = snap(clamp(salon, 4.5, 9));
  E.push({ tipo: 'salon', x: 0, y: 1.5, w: S, h: 3 }); E.push({ tipo: 'cocina', x: 0, y: 0, w: S - 1.5, h: 1.5 }); E.push({ tipo: 'recibidor', x: S - 1.5, y: 0, w: 1.5, h: 1.5 });
  x = S; const x0 = x;
  if (despacho) { E.push({ tipo: 'despacho', x, y: 1.5, w: 2.25, h: 3 }); x += 2.25; }
  for (let i = 1; i < dormitorios; i++) { E.push({ tipo: 'dormitorio', x, y: 1.5, w: 3, h: 3 }); x += 3; }
  if (dormitorios >= 1) { E.push({ tipo: 'dormitorio_principal', x, y: 1.5, w: 3.75, h: 3 }); x += 3.75; }
  let fin = x;
  if (banos >= 2 && dormitorios >= 1) { // suite al final de la barra
    E.push({ tipo: 'bano', x, y: 0, w: 2.25, h: 4.5, suite: true }); fin = x + 2.25;
  }
  // banda norte: pasillo + baños comunes al final
  const comunes = banos >= 2 && dormitorios >= 1 ? banos - 1 : banos;
  let bx = x - comunes * 2.25;
  if (bx < x0 + 1.5) { bx = x0 + 1.5; }
  E.push({ tipo: 'pasillo', x: x0, y: 0, w: Math.max(1.5, bx - x0), h: 1.5 });
  for (let i = 0; i < comunes; i++) { E.push({ tipo: i ? 'aseo' : 'bano', x: bx, y: 0, w: 2.25, h: 1.5 }); bx += 2.25; }
  fin = Math.max(fin, bx);
  if (bx < x) E.push({ tipo: 'despensa', x: bx, y: 0, w: x - bx, h: 1.5 });
  if (porche) E.push({ tipo: 'porche', x: 0, y: 4.5, w: S, h: 2.25 });
  return normalizar({ nombre: nombre || `Line ${Math.round(fin * 4.5)}`, familia: 'line', acceso: 'N', plantas: [{ estancias: E }] });
}

// ---------- v.1: espejo de estancia, huecos manuales y mobiliario fijado ----------
// Refleja la distribución interior (mobiliario) de una estancia sin mover la estancia.
export function espejoEstancia(m, id, eje = 'x') {
  const r = buscar(m, id); if (!r) throw new Error('Estancia no encontrada: ' + id); const e = r.e;
  if (eje === 'x') e.espejoX = !e.espejoX; else e.espejoY = !e.espejoY;
  if (Array.isArray(e.mobiliario)) for (const it of e.mobiliario) { const gi = ((+it.giro || 0) % 360 + 360) % 360; if (eje === 'x') { it.dx = r3(e.w - it.dx - it.w); it.giro = gi === 90 ? 270 : gi === 270 ? 90 : gi; } else { it.dy = r3(e.h - it.dy - it.h); it.giro = gi === 0 ? 180 : gi === 180 ? 0 : gi; } }
  if (e.tipo === 'escalera' && e.sube) e.sube = (eje === 'x' ? { E: 'O', O: 'E' } : { N: 'S', S: 'N' })[e.sube] || e.sube;
  return e;
}
// Copia los huecos y puertas automáticos de la planta a listas manuales editables (modo fijo).
// Si la planta ya estaba fijada, añade los automáticos que aún no lo son (estancias nuevas).
// Devuelve un Map «h:i» / «d:i» (índice en g.huecos / g.puertas) → id manual.
export function fijarHuecos(m, pi, g) {
  const p = m.plantas[pi]; const mapa = new Map();
  if (!p.huecosFijos) { p.huecosManual = []; p.puertasManual = []; }
  g.huecos.forEach((h, i) => {
    if (h.manual) { mapa.set('h:' + i, h.id); return; }
    const it = { id: uid('h'), x: h.x, y: h.y, o: h.o, tipo: h.tipo, ancho: h.ancho, entrada: !!h.entrada };
    if (h.tipo === 'puerta') { it.hacia = h.hacia === 'fuera' ? 'fuera' : 'dentro'; it.bisagra = h.bisagra === 'fin' ? 'fin' : 'ini'; }
    if (h.tipo === 'porton') { it.modelo = h.modelo || 'seccional'; if (h.alto && h.alto !== 2.5) it.alto = h.alto; }
    p.huecosManual.push(it); mapa.set('h:' + i, it.id);
  });
  g.puertas.forEach((d, i) => {
    if (d.manual) { mapa.set('d:' + i, d.id); return; }
    const it = { id: uid('d'), x: d.x, y: d.y, o: d.o, ancho: d.ancho, corredera: !!d.corredera, abre: d.abre === 1 || d.abre === -1 ? d.abre : 0, bisagra: d.bisagra === 'fin' ? 'fin' : 'ini', est: d.a };
    p.puertasManual.push(it); mapa.set('d:' + i, it.id);
  });
  p.huecosFijos = true; p.huecosEst = p.estancias.filter((e) => esInt(e.tipo)).map((e) => e.id);
  return mapa;
}
// Mueve los huecos/puertas manuales que estaban en el perímetro de una estancia cuando esta se mueve o cambia de tamaño.
export function seguirHuecos(p, antes, e) {
  if (!p || !p.huecosFijos || !antes) return;
  if (antes.x === e.x && antes.y === e.y && antes.w === e.w && antes.h === e.h) return;
  const tol = 1e-3; const dx = r3(e.x - antes.x), dy = r3(e.y - antes.y);
  const cl = (v, a, b) => (b < a ? (a + b) / 2 : Math.min(b, Math.max(a, v)));
  for (const h of [...(p.huecosManual || []), ...(p.puertasManual || [])]) {
    const mg = (h.ancho || 0.8) / 2 + 0.1;
    if (h.o === 'h' && h.x > antes.x - tol && h.x < antes.x + antes.w + tol) {
      const top = Math.abs(h.y - antes.y) < tol, bot = Math.abs(h.y - antes.y - antes.h) < tol; if (!top && !bot) continue;
      h.y = r3(top ? e.y : e.y + e.h); if (e.w === antes.w) h.x = r3(h.x + dx); h.x = r3(cl(h.x, e.x + mg, e.x + e.w - mg));
    } else if (h.o === 'v' && h.y > antes.y - tol && h.y < antes.y + antes.h + tol) {
      const izq = Math.abs(h.x - antes.x) < tol, der = Math.abs(h.x - antes.x - antes.w) < tol; if (!izq && !der) continue;
      h.x = r3(izq ? e.x : e.x + e.w); if (e.h === antes.h) h.y = r3(h.y + dy); h.y = r3(cl(h.y, e.y + mg, e.y + e.h - mg));
    }
  }
}
// Selector «Huecos de fachada» de la estancia: guarda la preferencia y, con la planta en modo manual, rehace los huecos de ese lado.
// cfg: { tipo: ''(automático)|'ninguno'|ventana|ventanal|alta|fijo|puerta|porton, ancho? }
export function huecoLado(m, pi, estId, lado, cfg = {}) {
  const p = m.plantas[pi]; const e = p.estancias.find((q) => q.id === estId); if (!e) throw new Error('Estancia no encontrada: ' + estId);
  e.huecos = e.huecos || {}; if (cfg.tipo) e.huecos[lado] = { ...e.huecos[lado], ...cfg }; else delete e.huecos[lado];
  if (!Object.keys(e.huecos).length) delete e.huecos;
  if (!p.huecosFijos) return e;
  const segs = muros(p).filter((s) => s.clase === 'fachada' && s.int.id === estId && s.lado === lado);
  const en = (h) => segs.some((s) => (s.o === 'h' ? h.o === 'h' && Math.abs(h.y - s.y1) < 1e-3 && h.x >= s.x1 - 1e-3 && h.x <= s.x2 + 1e-3 : h.o === 'v' && Math.abs(h.x - s.x1) < 1e-3 && h.y >= s.y1 - 1e-3 && h.y <= s.y2 + 1e-3));
  const conEntrada = (p.huecosManual || []).some((h) => h.entrada && en(h));
  p.huecosManual = (p.huecosManual || []).filter((h) => h.entrada || !en(h));
  const nuevos = huecosFachada(m, pi).filter((h) => h.est === estId && h.lado === lado && !h.entrada && !(conEntrada && h.tipo === 'puerta'));
  for (const h of nuevos) {
    const it = { id: uid('h'), x: h.x, y: h.y, o: h.o, tipo: h.tipo, ancho: h.ancho, entrada: false };
    if (h.tipo === 'puerta') { it.hacia = h.hacia || 'dentro'; it.bisagra = 'ini'; }
    if (h.tipo === 'porton') { it.modelo = h.modelo || 'seccional'; if (h.alto && h.alto !== 2.5) it.alto = h.alto; }
    p.huecosManual.push(it);
  }
  return e;
}
export function liberarHuecos(m, pi) { const p = m.plantas[pi]; delete p.huecosFijos; delete p.huecosManual; delete p.puertasManual; delete p.huecosEst; return p; }
export function addHueco(m, pi, d) {
  const p = m.plantas[pi]; if (!p.huecosFijos) throw new Error('Fija antes los huecos de la planta');
  const it = { id: uid(d.clase === 'puerta' ? 'd' : 'h'), x: r3(d.x), y: r3(d.y), o: d.o, ancho: d.ancho || (d.clase === 'puerta' ? 0.825 : 1.5) };
  if (d.clase === 'puerta') { Object.assign(it, { corredera: !!d.corredera, abre: 0, bisagra: 'ini' }); if (d.est) it.est = d.est; p.puertasManual.push(it); }
  else { it.tipo = d.tipo || 'ventana'; it.entrada = !!d.entrada; if (it.tipo === 'puerta') { it.hacia = d.hacia === 'fuera' ? 'fuera' : 'dentro'; it.bisagra = d.bisagra === 'fin' ? 'fin' : 'ini'; } if (it.tipo === 'porton') { it.modelo = d.modelo || 'seccional'; if (d.alto) it.alto = d.alto; } p.huecosManual.push(it); }
  return it;
}
export function buscarHueco(m, pi, id) { const p = m.plantas[pi]; return (p.huecosManual || []).find((h) => h.id === id) || (p.puertasManual || []).find((h) => h.id === id) || null; }
export function borrarHueco(m, pi, id) { const p = m.plantas[pi]; p.huecosManual = (p.huecosManual || []).filter((h) => h.id !== id); p.puertasManual = (p.puertasManual || []).filter((h) => h.id !== id); }
// Mobiliario fijado: guarda las piezas en coordenadas relativas a la estancia para poder moverlas a mano.
// items: piezas relativas {id, rol, dx, dy, w, h, giro, alto?, mat?} (fijarMobiliario de core/mobiliario.mjs) o absolutas {x, y, ...}.
export function fijarMobiliario(m, id, items) {
  const r = buscar(m, id); if (!r) throw new Error('Estancia no encontrada'); const e = r.e;
  if (items.every((it) => it.dx != null)) { e.mobiliario = items.map((it) => ({ ...it, id: it.id || uid('f'), giro: it.giro || 0 })); delete e.espejoX; delete e.espejoY; return e.mobiliario; }
  e.mobiliario = items.filter((it) => it.est === e.id || it.est == null).map((it) => ({ id: it.id || uid('f'), rol: it.rol, dx: r3(it.x - e.x), dy: r3(it.y - e.y), w: it.w, h: it.h, alto: it.alto, z0: it.z0, forma: it.forma, mat: it.mat, giro: it.giro || 0, eje: it.eje, redondeo: it.redondeo }));
  delete e.espejoX; delete e.espejoY; return e.mobiliario;
}
export function liberarMobiliario(m, id) { const r = buscar(m, id); if (r) delete r.e.mobiliario; }
