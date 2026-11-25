// Geometría derivada de un modelo: celdas, muros, huecos, puertas, vuelos, cubiertas y superficies.
// Todo se calcula sobre la trama de 0,75 m. Ejes del modelo: x → derecha, y → abajo en planta.
// Lados: N = y mínima (arriba), S = y máxima (abajo), O = x mínima, E = x máxima.
import { T, TE, ci, cm, r3, VUELO_MAX, E_FACHADA, E_TABIQUE } from './trama.mjs';
// Un pilar sostiene un recuadro de 1,50 × 1,50 m centrado en su nudo (2 × 2 celdas de la trama estructural).
const R_PILAR = Math.round(TE / T);
import { TIPOS, esExt, esInt, grupo, abierto, esDorm, esBano } from './catalogo.mjs';
import { esEdificio, unidad, circComun, plantasAcceso } from './edificio.mjs';
import { memoPlanta } from './memo.mjs';
import { derivarSotano } from './sotano.mjs'; // v.1.6: derivar(m, -1) = planta sótano

const K = (i, j) => i + ',' + j;
const IJ = (k) => k.split(',').map(Number);

// ---------- celdas ----------
// Rendimiento: celdasPlanta() y muros() se recuerdan por planta (core/memo.mjs: misma planta, mismas estancias, mismo
// contenido). muros() devuelve segmentos nuevos; el Map de celdas es de SOLO LECTURA (set/delete/clear lanzan error:
// para modificarlo, cópialo con new Map(m)). El cálculo real está en _celdasPlanta() y _muros().
class CeldasSoloLectura extends Map {
  set() { throw new TypeError('celdasPlanta().m es de solo lectura (caché): cópialo con new Map(m)'); }
  delete() { throw new TypeError('celdasPlanta().m es de solo lectura (caché): cópialo con new Map(m)'); }
  clear() { throw new TypeError('celdasPlanta().m es de solo lectura (caché): cópialo con new Map(m)'); }
}
const celdasCache = (planta) => { const r = _celdasPlanta(planta); const m = new CeldasSoloLectura(); for (const [k, e] of r.m) Map.prototype.set.call(m, k, e); return { m, solapes: r.solapes }; };
export function celdasPlanta(planta) { const r = memoPlanta(planta, 'celdas', celdasCache); return { m: r.m, solapes: r.solapes.map((s) => s.slice()) }; }
function _celdasPlanta(planta) {
  const m = new Map(); const solapes = [];
  for (const e of planta.estancias) {
    const i0 = ci(e.x), j0 = ci(e.y), ni = Math.min(ci(e.w), 400), nj = Math.min(ci(e.h), 400); // límite: 150 m por lado
    if (![i0, j0, ni, nj].every(Number.isFinite)) continue;
    for (let i = i0; i < i0 + ni; i++) for (let j = j0; j < j0 + nj; j++) {
      const k = K(i, j);
      if (m.has(k)) { const o = m.get(k); if (!solapes.some(s => (s[0] === o.id && s[1] === e.id))) solapes.push([o.id, e.id]); }
      else m.set(k, e);
    }
  }
  return { m, solapes };
}
// v.1.5: un muro de fachada es MEDIANERA solo si su lado está marcado y está en el borde exterior del edificio por
// ese lado (el lindero). Las caras de patios, retranqueos y terrazas que miran al este u oeste de una casa entre
// medianeras son fachada y llevan huecos.
export function esMedianera(modelo, s, b) {
  if (!s || !(modelo.medianeras || []).includes(s.lado)) return false;
  b = b || bbox(modelo); const ok = (v, w) => Math.abs(v - w) < 1e-6;
  return s.lado === 'E' ? ok(s.x1, b.x1) : s.lado === 'O' ? ok(s.x1, b.x0) : s.lado === 'N' ? ok(s.y1, b.y0) : s.lado === 'S' ? ok(s.y1, b.y1) : false;
}
export function bbox(modelo) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of modelo.plantas) for (const e of p.estancias) {
    x0 = Math.min(x0, e.x); y0 = Math.min(y0, e.y); x1 = Math.max(x1, e.x + e.w); y1 = Math.max(y1, e.y + e.h);
  }
  if (!isFinite(x0)) return { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 };
  return { x0: r3(x0), y0: r3(y0), x1: r3(x1), y1: r3(y1), w: r3(x1 - x0), h: r3(y1 - y0) };
}
export function bboxPlanta(planta, soloInt = false) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of planta.estancias) {
    if (soloInt && esExt(e.tipo)) continue;
    x0 = Math.min(x0, e.x); y0 = Math.min(y0, e.y); x1 = Math.max(x1, e.x + e.w); y1 = Math.max(y1, e.y + e.h);
  }
  if (!isFinite(x0)) return { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 };
  return { x0, y0, x1, y1, w: r3(x1 - x0), h: r3(y1 - y0) };
}

// Descompone un conjunto de celdas en rectángulos máximos (voraz). Devuelve [{x,y,w,h}] en metros.
export function rectangulos(keys) {
  const set = new Set(keys); const out = [];
  const orden = [...set].map(IJ).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [i, j] of orden) {
    if (!set.has(K(i, j))) continue;
    let w = 1; while (set.has(K(i + w, j))) w++;
    let h = 1;
    outer: while (true) { for (let a = 0; a < w; a++) if (!set.has(K(i + a, j + h))) break outer; h++; }
    for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) set.delete(K(i + a, j + b));
    out.push({ x: cm(i), y: cm(j), w: cm(w), h: cm(h) });
  }
  return out;
}

// ---------- muros ----------
// clase: fachada | tabique | abierto | borde (límite de porche/terraza)
function clase(a, b) {
  if (!a && !b) return null;
  if (a && b && a.id === b.id) return null;
  const ia = a && esInt(a.tipo), ib = b && esInt(b.tipo);
  if (ia && ib && (a.tipo === 'ascensor' || b.tipo === 'ascensor' || (a.vivienda || '') !== (b.vivienda || ''))) return 'tabique'; // v.1.5
  if (ia && ib) { const da = a.tipo === 'doble_altura' ? b : b.tipo === 'doble_altura' ? a : null; // el vacío se abre a día y circulación; dormitorios y servicios lo cierran
    if (da) return da.tipo === 'doble_altura' || ['dia', 'circ'].includes(grupo(da.tipo)) ? 'abierto' : 'tabique';
    return abierto(a, b) ? 'abierto' : 'tabique'; }
  if (ia || ib) return 'fachada';
  // ninguno interior
  const va = a && !TIPOS[a.tipo].vacio, vb = b && !TIPOS[b.tipo].vacio;
  if ((va && !b) || (vb && !a)) return 'borde';
  if (a && b && (va !== vb)) return 'borde';
  return null;
}

// Segmentos de muro de una planta. Cada uno: {o:'h'|'v', x1,y1,x2,y2,len, a,b (estancias), clase, int, lado}
export function muros(planta) { return memoPlanta(planta, 'muros', _muros).map((s) => ({ ...s })); }
function _muros(planta) {
  const { m } = celdasPlanta(planta);
  const aristas = []; // {o, line, pos, a, b, cl}
  const visto = new Set();
  const add = (o, line, pos, a, b) => {
    const id = o + line + ':' + pos; if (visto.has(id)) return; visto.add(id);
    const cl = clase(a, b); if (cl) aristas.push({ o, line, pos, a, b, cl });
  };
  for (const [k, e] of m) {
    const [i, j] = IJ(k);
    add('h', j, i, m.get(K(i, j - 1)) || null, e);       // arista norte: a = arriba, b = abajo
    add('h', j + 1, i, e, m.get(K(i, j + 1)) || null);   // arista sur
    add('v', i, j, m.get(K(i - 1, j)) || null, e);       // arista oeste: a = izquierda, b = derecha
    add('v', i + 1, j, e, m.get(K(i + 1, j)) || null);   // arista este
  }
  aristas.sort((p, q) => (p.o < q.o ? -1 : p.o > q.o ? 1 : p.line - q.line || p.pos - q.pos));
  const segs = [];
  let cur = null;
  const idp = (x) => (x ? x.id : '');
  for (const ar of aristas) {
    if (cur && cur.o === ar.o && cur.line === ar.line && cur.end === ar.pos && idp(cur.a) === idp(ar.a) && idp(cur.b) === idp(ar.b) && cur.cl === ar.cl) { cur.end++; continue; }
    if (cur) segs.push(cur);
    cur = { o: ar.o, line: ar.line, start: ar.pos, end: ar.pos + 1, a: ar.a, b: ar.b, cl: ar.cl };
  }
  if (cur) segs.push(cur);
  return segs.map((s) => {
    const h = s.o === 'h';
    const seg = {
      o: s.o, clase: s.cl, a: s.a, b: s.b,
      x1: h ? cm(s.start) : cm(s.line), y1: h ? cm(s.line) : cm(s.start),
      x2: h ? cm(s.end) : cm(s.line), y2: h ? cm(s.line) : cm(s.end),
      len: cm(s.end - s.start),
    };
    if (s.cl === 'fachada') {
      const ia = s.a && esInt(s.a.tipo);
      seg.int = ia ? s.a : s.b; seg.extr = ia ? s.b : s.a;
      // lado exterior hacia el que mira la fachada
      seg.lado = h ? (ia ? 'S' : 'N') : (ia ? 'E' : 'O');
    }
    return seg;
  });
}

// ---------- huecos de fachada ----------
const PREF = { // reglas automáticas por tipo: [tipo de hueco, ancho deseado]
  salon: ['ventanal', 3.0], comedor: ['ventanal', 2.25], cocina: ['ventana', 1.5],
  dormitorio_principal: ['ventanal', 1.5], dormitorio: ['ventana', 1.5], despacho: ['ventana', 1.5],
  bano: ['alta', 0.75], aseo: ['alta', 0.75], escalera: ['fijo', 0.75], lavadero: ['alta', 0.75],
  garaje: ['porton', 3.0],
};
export const HUECOS = {
  ventana:  { n: 'Ventana', alto: 1.35, alf: 0.9 },
  ventanal: { n: 'Ventanal', alto: 2.25, alf: 0.0 },
  alta:     { n: 'Ventana alta', alto: 0.6, alf: 1.65 },
  fijo:     { n: 'Fijo vertical', alto: 2.25, alf: 0.0 },
  puerta:   { n: 'Puerta de entrada', alto: 2.25, alf: 0.0 },
  porton:   { n: 'Portón de garaje', alto: 2.5, alf: 0.0 },
  ninguno:  { n: 'Sin hueco' },
};
const ordenLados = (acceso) => {
  // lado «principal» de luz: opuesto al acceso (jardín); después el resto
  const op = { N: 'S', S: 'N', E: 'O', O: 'E' }[acceso || 'N'];
  return [op, ...['S', 'E', 'O', 'N'].filter((l) => l !== op)];
};

function hueco(seg, tipo, ancho, est, auto, c0) {
  const w = Math.min(ancho, Math.max(0.6, seg.len - 0.3));
  const c = c0 ?? seg.len / 2;
  const h = seg.o === 'h';
  return {
    tipo, ancho: r3(w), alto: HUECOS[tipo].alto, alf: HUECOS[tipo].alf, o: seg.o, lado: seg.lado, est: est.id, auto: !!auto,
    x: h ? r3(seg.x1 + c) : seg.x1, y: h ? seg.y1 : r3(seg.y1 + c),
  };
}

export function huecosFachada(modelo, pi, segs) {
  const planta = modelo.plantas[pi];
  segs = segs || muros(planta);
  const out = [];
  const BB = bbox(modelo);
  const fach = segs.filter((s) => s.clase === 'fachada' && !esMedianera(modelo, s, BB));
  const porEst = new Map();
  for (const s of fach) { if (!porEst.has(s.int.id)) porEst.set(s.int.id, []); porEst.get(s.int.id).push(s); }
  const lados = ordenLados(modelo.acceso);
  // puerta de entrada (solo planta 0)
  let entrada = null;
  if (pi === 0) {
    const cand = ['recibidor', 'pasillo', 'distribuidor', 'salon', 'comedor', 'cocina'];
    const acc = modelo.acceso || 'N';
    let best = null;
    // v.1.5: en un edificio la entrada es la del portal (zona común de paso); solo si no hay, la de siempre
    const soloComun = esEdificio(modelo) && planta.estancias.some((e) => circComun(e) && e.tipo !== 'escalera' && (porEst.get(e.id) || []).some((s) => s.len >= 1.5 - 1e-6));
    for (const e of planta.estancias) {
      if (soloComun && e.vivienda) continue;
      const r = cand.indexOf(e.tipo); if (r < 0) continue;
      for (const s of porEst.get(e.id) || []) {
        if (s.len < 1.5 - 1e-6 && e.tipo !== 'pasillo') continue;
        const score = r * 10 + (s.lado === acc ? 0 : 60) + (e.entrada ? -100 : 0);
        if (!best || score < best.score) best = { score, s, e };
      }
    }
    if (best) { const larga = best.s.len >= 3 - 1e-6; entrada = hueco(best.s, 'puerta', 1.05, best.e, true, larga ? 0.75 : undefined); entrada.entrada = true; entrada._seg = best.s; entrada._larga = larga; out.push(entrada); }
  }
  for (const e of planta.estancias) {
    if (!esInt(e.tipo)) continue;
    const mis = porEst.get(e.id) || [];
    const ov = e.huecos || {};
    const pref = PREF[e.tipo];
    const usados = new Set();
    // manuales por lado
    for (const lado of ['N', 'S', 'E', 'O']) {
      const o = ov[lado]; if (!o) continue;
      usados.add(lado);
      if (o.tipo === 'ninguno') continue;
      const ss = mis.filter((s) => s.lado === lado && !(entrada && entrada._seg === s)).sort((a, b) => b.len - a.len);
      if (!ss.length) continue;
      const def = { ventana: 1.5, ventanal: 2.25, alta: 0.75, fijo: 0.75, puerta: 1.05, porton: 3.0 }[o.tipo] || 1.5;
      if (!HUECOS[o.tipo]) continue; const hm = hueco(ss[0], o.tipo, o.ancho || def, e, false);
      if (o.tipo === 'puerta') { hm.exterior = true; if (o.hacia === 'fuera') hm.hacia = 'fuera'; }
      if (o.tipo === 'porton') { hm.modelo = PORTONES[o.modelo] ? o.modelo : 'seccional'; if (Number.isFinite(+o.alto) && +o.alto > 0) hm.alto = Math.min(2.8, Math.max(2.0, +o.alto)); }
      out.push(hm);
    }
    if (!pref) continue;
    // automáticos: un hueco principal en el mejor lado + secundarios en estancias de día
    const ocupada = (s) => entrada && entrada._seg === s && !entrada._larga; // una fachada larga admite puerta y ventana
    const hx = (s, tipo, ancho) => (entrada && entrada._seg === s ? hueco(s, tipo, Math.min(ancho, s.len - 1.8), e, true, 1.5 + (s.len - 1.5) / 2) : hueco(s, tipo, ancho, e, true));
    const libres = mis.filter((s) => !usados.has(s.lado) && !ocupada(s) && s.len >= 1.5 - 1e-6 || (s.len >= 0.75 && ['alta', 'fijo'].includes(pref[0]) && !usados.has(s.lado) && !ocupada(s)));
    if (!libres.length) continue;
    if ([...usados].some((l) => ov[l] && ov[l].tipo !== 'ninguno') && grupo(e.tipo) !== 'dia') continue; // ya tiene uno manual
    const rank = (s) => (e.tipo === 'garaje' ? (s.lado === (modelo.acceso || 'N') ? 0 : 5) : lados.indexOf(s.lado)) * 100 - s.len;
    libres.sort((a, b) => rank(a) - rank(b));
    const s0 = libres[0];
    // un ventanal a un porche/terraza es bienvenido; a un patio también
    const h0 = hx(s0, pref[0], pref[1]); if (h0.tipo === 'porton') h0.modelo = 'seccional'; out.push(h0);
    if (grupo(e.tipo) === 'dia' && e.tipo !== 'cocina') {
      for (const s of libres.slice(1)) if (s.lado !== s0.lado && s.len >= 2.25) out.push(hx(s, 'ventana', 1.5));
    } else if (['noche', 'dia'].includes(grupo(e.tipo)) && e.tipo !== 'vestidor') {
      // segunda ventana hacia el acceso: la fachada de calle no queda ciega
      const sa = libres.find((s) => s.lado === (modelo.acceso || 'N') && s.lado !== s0.lado && s.len >= 2.25);
      if (sa) out.push(hx(sa, 'ventana', 1.5));
    }
  }
  for (const h of out) { delete h._seg; delete h._larga; }
  return out;
}

// ---------- puertas interiores ----------
export function puertas(modelo, pi, segs, hf, extra = []) {
  const planta = modelo.plantas[pi];
  segs = segs || muros(planta);
  const ints = planta.estancias.filter((e) => esInt(e.tipo) && e.tipo !== 'doble_altura' && e.tipo !== 'ascensor'); // el vacío de la doble altura no lleva puertas ni da acceso; el ascensor lleva su puerta de cabina aparte
  const byId = new Map(ints.map((e) => [e.id, e]));
  const edif = esEdificio(modelo); const U = edif ? unidad : () => ''; // v.1.5: en un edificio, cada vivienda y la zona común son unidades separadas
  // unión por espacios abiertos
  const padre = new Map(ints.map((e) => [e.id, e.id]));
  const find = (x) => { while (padre.get(x) !== x) x = padre.get(x); return x; };
  const une = (a, b) => padre.set(find(a), find(b));
  for (const s of segs) if (s.clase === 'abierto' && padre.has(s.a.id) && padre.has(s.b.id)) une(s.a.id, s.b.id);
  const tabsTodos = segs.filter((s) => s.clase === 'tabique' && s.len >= 0.75 - 1e-6 && padre.has(s.a.id) && padre.has(s.b.id));
  const tabs = edif ? tabsTodos.filter((s) => U(s.a) === U(s.b)) : tabsTodos; // nunca puertas de paso entre unidades distintas
  const vecinos = (id) => tabs.filter((s) => s.a.id === id || s.b.id === id).map((s) => ({ s, o: s.a.id === id ? s.b : s.a }));
  const prio = (e, o) => {
    if (e.tipo === 'vestidor' && o.tipo === 'dormitorio_principal') return -5;
    if (esBano(e.tipo) && e.suite && esDorm(o.tipo)) return -5;
    if (esDorm(e.tipo) && o.tipo === 'vestidor') return 5;
    if ((e.tipo === 'lavadero' || e.tipo === 'despensa') && o.tipo === 'cocina') return 1;
    if (o.tipo === 'escalera' && grupo(e.tipo) !== 'circ') return 20;
    const g = grupo(o.tipo);
    if (g === 'circ') return o.tipo === 'escalera' ? 2 : 0;
    if (g === 'dia') return o.tipo === 'cocina' ? 4 : 3;
    if (o.tipo === 'lavadero' || o.tipo === 'garaje') return 6;
    if (esDorm(o.tipo)) return esBano(e.tipo) || e.tipo === 'vestidor' ? 5 : 9;
    return 8;
  };
  const out = []; const hechas = new Set();
  const pon = (s, e, o) => {
    const key = [e.id, o.id].sort().join('|'); if (hechas.has(key)) return; hechas.add(key);
    const registro = edif && e.tipo === 'instalaciones' && !U(e); // v.1.5: patinillo común → puerta de registro estrecha
    const ancho = registro ? 0.6 : s.len >= 1.5 - 1e-6 ? 0.825 : 0.625;
    const h = s.o === 'h';
    // junto al extremo más cercano al centro de la estancia de destino
    const co = h ? o.x + o.w / 2 : o.y + o.h / 2; const a0 = h ? s.x1 : s.y1, a1 = h ? s.x2 : s.y2;
    const off = Math.min(0.2 + ancho / 2, s.len / 2);
    const pos = Math.abs(co - a0) < Math.abs(co - a1) ? a0 + off : a1 - off;
    out.push({ tipo: 'paso', ancho, alto: 2.05, o: s.o, x: h ? r3(pos) : s.x1, y: h ? s.y1 : r3(pos), a: e.id, b: o.id, corredera: !!(e.corredera), ...(registro ? { registro: true } : {}) });
    une(e.id, o.id);
  };
  const necesita = ints.filter((e) => !['salon', 'comedor', 'recibidor', 'pasillo', 'distribuidor', 'escalera'].includes(e.tipo) || e.cerrada);
  necesita.sort((a, b) => (grupo(a.tipo) === 'dia' ? -1 : 0) - (grupo(b.tipo) === 'dia' ? -1 : 0));
  for (const e of necesita) {
    if (grupo(e.tipo) === 'dia' && !e.cerrada && segs.some((s) => s.clase === 'abierto' && (s.a.id === e.id || s.b.id === e.id))) continue;
    const vs = vecinos(e.id).sort((p, q) => prio(e, p.o) - prio(e, q.o) || q.s.len - p.s.len);
    if (vs.length) pon(vs[0].s, e, vs[0].o);
  }
  // conectividad: unir componentes sueltos
  const entrada = (hf || []).find((h) => h.entrada);
  const conectar = (raiz, tabsU) => {
    for (let it = 0; it < 12; it++) {
      let cambio = false;
      const enRaiz = (s) => (find(s.a.id) === find(raiz) ? s.a : s.b);
      const pr = (s) => { const g = grupo(enRaiz(s).tipo); return (g === 'circ' ? 0 : g === 'dia' ? 1 : 3) * 100 - s.len; };
      const cruzan = tabsU.filter((s) => raiz && (find(s.a.id) === find(raiz)) !== (find(s.b.id) === find(raiz))).sort((a, b) => pr(a) - pr(b));
      for (const s of cruzan) {
        if (!raiz) break;
        const ra = find(s.a.id) === find(raiz), rb = find(s.b.id) === find(raiz);
        if (ra !== rb) { const [e, o] = ra ? [s.b, s.a] : [s.a, s.b]; pon(s, e, o); cambio = true; break; }
      }
      if (!cambio) break;
    }
  };
  if (edif) { // v.1.5 · edificio
    // puerta de vivienda (de seguridad): una por vivienda en cada planta con acceso, desde la circulación común a su
    // pieza de entrada (recibidor, pasillo, salón…; nunca un dormitorio o un baño si hay otra opción)
    const ORD = ['recibidor', 'pasillo', 'distribuidor', 'salon', 'comedor', 'cocina', 'escalera', 'despacho'];
    const rk = (e) => (e.entrada ? -10 : 0) + (ORD.includes(e.tipo) ? ORD.indexOf(e.tipo) : esDorm(e.tipo) || grupo(e.tipo) === 'humedo' ? 40 : 20);
    const raizU = new Map(); const vivs = [...new Set(ints.map(U).filter(Boolean))];
    for (const v of vivs) {
      if (!plantasAcceso(modelo, v).includes(pi)) continue;
      const cand = tabsTodos.filter((s) => (U(s.a) === v && circComun(s.b)) || (U(s.b) === v && circComun(s.a))).map((s) => {
        const priv = U(s.a) === v ? s.a : s.b, com = priv === s.a ? s.b : s.a;
        return { s, priv, com, sc: rk(priv) * 10 + (com.tipo === 'escalera' ? 5 : 0) - Math.min(s.len, 3) };
      }).sort((p, q) => p.sc - q.sc);
      if (!cand.length) continue;
      const { s, priv, com } = cand[0]; const h = s.o === 'h';
      const ancho = s.len >= 1.5 - 1e-6 ? 0.9 : 0.825; const co = h ? com.x + com.w / 2 : com.y + com.h / 2; const a0 = h ? s.x1 : s.y1, a1 = h ? s.x2 : s.y2;
      const off = Math.min(0.2 + ancho / 2, s.len / 2); const pos = Math.abs(co - a0) < Math.abs(co - a1) ? a0 + off : a1 - off;
      out.push({ tipo: 'paso', ancho, alto: 2.05, o: s.o, x: h ? r3(pos) : s.x1, y: h ? s.y1 : r3(pos), a: priv.id, b: com.id, corredera: false, vivienda: v });
      raizU.set(v, priv.id);
    }
    for (const v of vivs) if (!raizU.has(v)) { // dúplex: la escalera propia da acceso a la planta sin puerta de vivienda
      const esc = ints.find((e) => U(e) === v && e.tipo === 'escalera'); if (esc && plantasAcceso(modelo, v).some((q) => q !== pi)) raizU.set(v, esc.id);
    }
    const raizC = entrada && byId.has(entrada.est) && !U(byId.get(entrada.est)) ? entrada.est : (ints.find((e) => !U(e) && e.tipo === 'escalera') || ints.find((e) => circComun(e)) || ints.find((e) => !U(e)) || {}).id;
    if (raizC) raizU.set('', raizC);
    for (const [u, r] of raizU) conectar(r, tabs.filter((s) => U(s.a) === u));
    out.push(...puertasAscensor(modelo, pi, segs));
    return { puertas: out, sinAcceso: accesoUnidades(modelo, pi, ints, segs, out, hf), raiz: raizC };
  }
  const raiz = entrada ? entrada.est : (ints.find((e) => grupo(e.tipo) === 'circ') || ints.find((e) => e.tipo === 'salon') || ints[0] || {}).id;
  for (const r of extra) if (raiz && padre.has(r)) une(r, raiz); // piezas con puerta propia al exterior (pabellones, patio)
  conectar(raiz, tabs);
  out.push(...puertasAscensor(modelo, pi, segs));
  const sinAcceso = raiz ? ints.filter((e) => find(e.id) !== find(raiz)).map((e) => e.id) : [];
  return { puertas: out, sinAcceso, raiz };
}
// v.1.5 · Puerta de cabina del ascensor en cada planta: corredera, en el tabique hacia la circulación de su misma unidad
// (rellano común; o pieza de paso / de día de la vivienda si es un ascensor privado).
export function puertasAscensor(modelo, pi, segs) {
  const planta = modelo.plantas[pi]; segs = segs || muros(planta); const out = [];
  for (const e of planta.estancias) {
    if (e.tipo !== 'ascensor') continue;
    const c = segs.filter((s) => s.clase === 'tabique' && s.a && s.b && (s.a.id === e.id || s.b.id === e.id) && s.len >= 0.75 - 1e-6).map((s) => {
      const o = s.a.id === e.id ? s.b : s.a; if (!o || !esInt(o.tipo) || o.tipo === 'ascensor' || o.tipo === 'doble_altura' || (o.vivienda || '') !== (e.vivienda || '')) return null;
      const g = grupo(o.tipo); const r = g === 'circ' ? (o.tipo === 'escalera' ? 1 : 0) : g === 'dia' ? 2 : null; if (r == null) return null;
      return { s, o, sc: r * 100 - s.len };
    }).filter(Boolean).sort((p, q) => p.sc - q.sc);
    if (!c.length) continue;
    const { s, o } = c[0]; const h = s.o === 'h'; const ancho = r3(Math.max(0.6, Math.min(0.9, s.len - 0.3))); const pos = (h ? s.x1 + s.x2 : s.y1 + s.y2) / 2;
    out.push({ tipo: 'paso', ancho, alto: 2.05, o: s.o, x: h ? r3(pos) : s.x1, y: h ? s.y1 : r3(pos), a: e.id, b: o.id, corredera: true, ascensor: true });
  }
  return out;
}
// v.1.5 · Acceso en un edificio: cada estancia de vivienda se alcanza desde SU puerta de vivienda (o su escalera propia
// en un dúplex, o su puerta a la calle en planta baja) sin salir de ella; las zonas comunes, desde el portal (planta baja)
// o la escalera común (plantas altas). Devuelve los ids sin acceso.
export function accesoUnidades(modelo, pi, ints, segs, doors, huecos) {
  const U = unidad; const byId = new Map(ints.map((e) => [e.id, e]));
  const padre = new Map(ints.map((e) => [e.id, e.id])); const find = (x) => { while (padre.get(x) !== x) x = padre.get(x); return x; };
  const une = (a, b) => { if (padre.has(a) && padre.has(b)) padre.set(find(a), find(b)); };
  for (const s of segs) if (s.clase === 'abierto' && s.a && s.b && byId.has(s.a.id) && byId.has(s.b.id) && U(s.a) === U(s.b)) une(s.a.id, s.b.id);
  const cruces = [];
  for (const d of doors || []) { const a = byId.get(d.a), b = byId.get(d.b); if (!a || !b) continue; if (U(a) === U(b)) une(a.id, b.id); else cruces.push([a, b]); }
  const raices = [];
  if (pi === 0) for (const h of huecos || []) if ((h.tipo === 'puerta' || h.tipo === 'porton') && byId.has(h.est)) raices.push(h.est);
  for (const e of ints) if (e.tipo === 'escalera') { if (!U(e)) { if (pi > 0) raices.push(e.id); } else if (plantasAcceso(modelo, U(e)).some((q) => q !== pi)) raices.push(e.id); }
  const ok = new Set(raices.map(find));
  for (const [a, b] of cruces) { const [c, v] = !U(a) ? [a, b] : !U(b) ? [b, a] : [null, null]; if (c && ok.has(find(c.id))) ok.add(find(v.id)); }
  return ints.filter((e) => !TIPOS[e.tipo].vacio && !ok.has(find(e.id))).map((e) => e.id);
}

// ---------- vuelos ----------
// Celdas de la planta pi que no descansan sobre la planta inferior ni sobre un apoyo.
export function vuelos(modelo, pi) {
  if (pi === 0) return { max: 0, celdas: [], viola: [] };
  const sup = celdasPlanta(modelo.plantas[pi]).m;
  const inf = celdasPlanta(modelo.plantas[pi - 1]).m;
  const apoyada = new Set();
  for (const [k, e] of inf) { const t = TIPOS[e.tipo]; if (!t.ext || t.cubierto || e.pilares) apoyada.add(k); }
  for (const a of modelo.plantas[pi - 1].apoyos || []) { // pilar en nodo (x,y): sostiene el recuadro de 1,50 m que lo rodea
    const i = ci(a.x), j = ci(a.y);
    for (let di = -R_PILAR; di < R_PILAR; di++) for (let dj = -R_PILAR; dj < R_PILAR; dj++) apoyada.add(K(i + di, j + dj));
  }
  const ocup = (k) => { const e = sup.get(k); return e && !TIPOS[e.tipo].vacio; };
  const celdas = []; let max = 0;
  for (const [k, e] of sup) {
    if (TIPOS[e.tipo].vacio || apoyada.has(k)) continue;
    const [i, j] = IJ(k);
    let best = Infinity;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let n = 1; n <= 40; n++) {
        const kk = K(i + di * n, j + dj * n);
        if (!ocup(kk)) break;
        if (apoyada.has(kk)) { best = Math.min(best, n); break; }
      }
    }
    const d = isFinite(best) ? r3(best * T) : Infinity;
    celdas.push({ i, j, x: cm(i), y: cm(j), d, est: e.id, ok: d <= VUELO_MAX + 1e-6 });
    if (isFinite(d)) max = Math.max(max, d); else max = Infinity;
  }
  return { max, celdas, viola: celdas.filter((c) => !c.ok) };
}

// Propone pilares (nodos) que dejan todos los vuelos ≤ 1,50 m. Voraz: el nodo que más celdas en infracción cubre.
export function proponerApoyos(modelo, pi) {
  const copia = JSON.parse(JSON.stringify(modelo)); const nuevos = [];
  for (let it = 0; it < 60; it++) {
    const v = vuelos(copia, pi); if (!v.viola.length) break;
    const cuenta = new Map();
    // prioriza la celda más alejada: pilar en su esquina exterior
    const peor = v.viola.slice().sort((a, b) => (b.d === a.d ? 0 : b.d > a.d ? 1 : -1))[0];
    for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const n = K(peor.i + di, peor.j + dj);
      let c = 0; const [ni, nj] = IJ(n);
      for (const q of v.viola) if (q.i >= ni - R_PILAR && q.i < ni + R_PILAR && q.j >= nj - R_PILAR && q.j < nj + R_PILAR) c++;
      cuenta.set(n, c);
    }
    const [n] = [...cuenta].sort((a, b) => b[1] - a[1])[0]; const [ni, nj] = IJ(n);
    const ap = { x: cm(ni), y: cm(nj) };
    copia.plantas[pi - 1].apoyos = [...(copia.plantas[pi - 1].apoyos || []), ap]; nuevos.push(ap);
  }
  return nuevos;
}

// ---------- cubiertas ----------
// Celdas interiores (o porches) de la planta pi que no tienen nada encima → cubierta.
export function cubierta(modelo, pi) {
  const act = celdasPlanta(modelo.plantas[pi]).m;
  const sup = modelo.plantas[pi + 1] ? celdasPlanta(modelo.plantas[pi + 1]).m : new Map();
  const keys = [];
  for (const [k, e] of act) {
    const t = TIPOS[e.tipo];
    if (t.ext && !t.cubierto) continue;
    const arriba = sup.get(k);
    if (arriba && !TIPOS[arriba.tipo].vacio) continue;
    keys.push(k);
  }
  return keys;
}
// v.1.6 · Orientación de las cubiertas inclinadas (una sola regla para 3D, planos, axonometría y prompts).
// caidaCubierta: lado hacia el que CAE la cubierta a un agua (su lado bajo). `cubierta.caida` manda; sin ella, la de
// siempre: hacia el jardín (opuesto al acceso) dentro del eje de `cumbrera` ('x' → cae a N/S, 'y' → a E/O).
export const OPUESTO_LADO = { N: 'S', S: 'N', E: 'O', O: 'E' };
export const tipoCubierta = (m) => { const t = m?.cubierta?.tipo; return t === 'dos aguas' ? 'dos' : ['una', 'dos', 'tres', 'cuatro'].includes(t) ? t : 'plana'; };
export function caidaCubierta(m) {
  const c = m?.cubierta || {}; if (OPUESTO_LADO[c.caida]) return c.caida;
  const acc = OPUESTO_LADO[m?.acceso] ? m.acceso : 'N'; const op = OPUESTO_LADO[acc];
  const eje = c.cumbrera === 'x' ? ['N', 'S'] : c.cumbrera === 'y' ? ['O', 'E'] : acc === 'N' || acc === 'S' ? ['N', 'S'] : ['O', 'E'];
  return eje.includes(op) ? op : eje[1];
}
// Cumbrera de un rectángulo de dos/tres/cuatro aguas: true = paralela a x. g = caja de toda la cubierta (desempate).
export function cumbreraEnX(m, r, g) { const c = m?.cubierta?.cumbrera; if (c === 'x') return true; if (c === 'y') return false; if (Math.abs(r.w - r.h) > 1e-6) return r.w > r.h; return g ? g.w >= g.h : true; }
// Campo de alturas de la cubierta inclinada de la planta pi (planos: alzados y secciones), sobre la cara superior del
// forjado de cubierta: { rects: [{ x0, y0, x1, y1, f, ejeX }], H(x, y) (−Infinity fuera), tipo, caida? }. Versión
// simplificada del 3D (sin prolongar los extremos unidos): cada rectángulo con su alero, envolvente superior.
export function alturasCubierta(modelo, pi) {
  const tipo = tipoCubierta(modelo); if (tipo === 'plana') return null;
  const keys = cubierta(modelo, pi); if (!keys.length) return null;
  const c = modelo.cubierta || {}; const al = Math.max(0, Math.min(1.5, +c.alero || 0)); const eLib = Math.max(al, 0.2);
  const pend = Math.max(3, Math.min(60, +c.pendiente || 25)); const k = Math.tan((pend * Math.PI) / 180);
  const sup = modelo.plantas[pi + 1] ? celdasPlanta(modelo.plantas[pi + 1]).m : new Map(); const alto = (kk) => { const q = sup.get(kk); return !!q && esInt(q.tipo); };
  let gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity; const S = new Set(keys);
  for (const kk of keys) { const [i, j] = IJ(kk); gx0 = Math.min(gx0, i * T); gy0 = Math.min(gy0, j * T); gx1 = Math.max(gx1, (i + 1) * T); gy1 = Math.max(gy1, (j + 1) * T); }
  const G = { w: gx1 - gx0, h: gy1 - gy0 }; const acc = OPUESTO_LADO[modelo.acceso] ? modelo.acceso : 'N';
  const rs = rectangulos(keys); let caida = null;
  if (tipo === 'una') { // contra un volumen más alto cae lejos de él (como el 3D); si no, la caída de la cubierta
    const cuenta = { N: 0, S: 0, E: 0, O: 0 };
    for (const kk of S) { const [i, j] = IJ(kk); if (alto(K(i, j - 1))) cuenta.N++; if (alto(K(i, j + 1))) cuenta.S++; if (alto(K(i - 1, j))) cuenta.O++; if (alto(K(i + 1, j))) cuenta.E++; }
    const ap = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0]; caida = ap[1] > 0 ? OPUESTO_LADO[ap[0]] : caidaCubierta(modelo);
  }
  const rects = rs.map((r) => {
    const x0 = r.x - eLib, y0 = r.y - eLib, x1 = r.x + r.w + eLib, y1 = r.y + r.h + eLib; let f; let ejeX = null;
    if (tipo === 'una') {
      const span = caida === 'N' || caida === 'S' ? G.h : G.w; const kk = Math.min(k, 4.5 / Math.max(span, 0.1));
      f = caida === 'N' ? (x, y) => kk * (y - gy0) : caida === 'S' ? (x, y) => kk * (gy1 - y) : caida === 'O' ? (x) => kk * (x - gx0) : (x) => kk * (gx1 - x);
    } else {
      ejeX = cumbreraEnX(modelo, r, G); const fines = ejeX ? ['O', 'E'] : ['N', 'S'];
      const hip = tipo === 'cuatro' ? fines : tipo === 'tres' ? [fines.includes(OPUESTO_LADO[acc]) ? OPUESTO_LADO[acc] : fines[1]] : [];
      const d = { N: (x, y) => y - r.y, S: (x, y) => r.y + r.h - y, O: (x) => x - r.x, E: (x) => r.x + r.w - x };
      const lados = [...(ejeX ? ['N', 'S'] : ['O', 'E']), ...hip];
      f = (x, y) => k * Math.min(...lados.map((l) => d[l](x, y)));
    }
    return { x0, y0, x1, y1, f, ejeX };
  });
  const H = (x, y) => { let h = -Infinity; for (const R of rects) if (x >= R.x0 - 1e-6 && x <= R.x1 + 1e-6 && y >= R.y0 - 1e-6 && y <= R.y1 + 1e-6) h = Math.max(h, R.f(x, y)); return h; };
  return { tipo, caida, rects, H, k };
}

// ---------- superficies ----------
export function superficies(modelo) {
  const plantas = []; let util = 0, cons = 0, ext = 0, huella = new Set();
  const edif = esEdificio(modelo); const V = new Map(); // v.1.5: vivienda ('' = zonas comunes) → acumulados
  const acum = (v) => { if (!V.has(v)) V.set(v, { id: v, util: 0, construida: 0, exterior: 0, dormitorios: 0, banos: 0, aseos: 0, plantas: new Set() }); return V.get(v); };
  modelo.plantas.forEach((p, pi) => {
    const segs = muros(p);
    const est = p.estancias.map((e) => {
      const bruta = e.w * e.h; let desc = 0;
      if (esInt(e.tipo)) for (const s of segs) {
        if (s.clase === 'fachada' && s.int.id === e.id) desc += s.len * (E_FACHADA / 2);
        else if (s.clase === 'tabique' && (s.a.id === e.id || s.b.id === e.id)) desc += s.len * (E_TABIQUE / 2);
      }
      const vac = !esExt(e.tipo) && !!TIPOS[e.tipo].vacio;
      return { id: e.id, tipo: e.tipo, nombre: e.nombre || TIPOS[e.tipo].n, bruta: r3(vac ? 0 : bruta), util: r3(vac ? 0 : Math.max(0, bruta - desc)), ext: esExt(e.tipo), vacio: vac };
    });
    if (edif) p.estancias.forEach((e, k) => { const r = acum(e.vivienda || ''); const x = est[k]; r.plantas.add(pi);
      if (x.ext) r.exterior += e.w * e.h; else { r.util += x.util; r.construida += x.bruta; }
      if (esDorm(e.tipo)) r.dormitorios++; if (e.tipo === 'bano') r.banos++; if (e.tipo === 'aseo') r.aseos++; });
    if (edif) for (const s of segs) if (s.clase === 'fachada') acum(s.int.vivienda || '').construida += s.len * (E_FACHADA / 2);
    const uInt = est.filter((e) => !e.ext).reduce((a, e) => a + e.util, 0);
    const bInt = est.filter((e) => !e.ext).reduce((a, e) => a + e.bruta, 0);
    const perFach = segs.filter((s) => s.clase === 'fachada').reduce((a, s) => a + s.len, 0);
    const c = bInt + perFach * (E_FACHADA / 2);
    const porches = p.estancias.filter((e) => e.tipo === 'porche').reduce((a, e) => a + e.w * e.h, 0);
    const terr = p.estancias.filter((e) => e.tipo === 'terraza').reduce((a, e) => a + e.w * e.h, 0);
    for (const [k, e] of celdasPlanta(p).m) if (!TIPOS[e.tipo].vacio && (esInt(e.tipo) || e.tipo === 'porche')) huella.add(k);
    plantas.push({ id: p.id, nombre: p.nombre, estancias: est, util: r3(uInt), construida: r3(c), porches: r3(porches), terrazas: r3(terr), perimetroFachada: r3(perFach) });
    util += uInt; cons += c + porches * 0.5; ext += porches + terr;
  });
  const cnt = (f) => modelo.plantas.reduce((a, p) => a + p.estancias.filter(f).length, 0);
  return {
    plantas, util: r3(util), construida: r3(cons), exterior: r3(ext), huella: r3(huella.size * T * T),
    dormitorios: cnt((e) => esDorm(e.tipo)), banos: cnt((e) => e.tipo === 'bano'), aseos: cnt((e) => e.tipo === 'aseo'),
    nPlantas: modelo.plantas.length,
    ...(edif ? resumenSup(V) : {}),
  };
}
// v.1.5: S.viviendas = [{ id, util, construida, exterior, dormitorios, banos, aseos, plantas }], S.nViviendas, S.comunes
function resumenSup(V) {
  const f = (r) => ({ id: r.id, util: r3(r.util), construida: r3(r.construida), exterior: r3(r.exterior), dormitorios: r.dormitorios, banos: r.banos, aseos: r.aseos, plantas: [...r.plantas].sort((a, b) => a - b) });
  const viv = [...V.values()].filter((r) => r.id).map(f).sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }));
  const c = V.get(''); return { viviendas: viv, nViviendas: viv.length, comunes: c ? f(c) : { id: '', util: 0, construida: 0, exterior: 0, dormitorios: 0, banos: 0, aseos: 0, plantas: [] } };
}

// Geometría completa de una planta (cacheable por llamada).
// ---------- huecos y puertas manuales (v.1) ----------
// Busca el segmento de muro que contiene el punto (x, y) con orientación o.
export function segmentoEn(segs, x, y, o, clases = ['fachada', 'tabique']) {
  let mejor = null;
  for (const s of segs) {
    if (!clases.includes(s.clase) || s.o !== o) continue;
    const d = o === 'h' ? Math.abs(y - s.y1) : Math.abs(x - s.x1); if (d > 0.2) continue;
    const u = o === 'h' ? x : y, a0 = o === 'h' ? s.x1 : s.y1, a1 = o === 'h' ? s.x2 : s.y2;
    if (u < a0 - 1e-6 || u > a1 + 1e-6) continue;
    if (!mejor || d < mejor.d) mejor = { s, d };
  }
  return mejor ? mejor.s : null;
}
// Portones de garaje: modelo de hoja (planos, 3D, prompts).
export const PORTONES = {
  seccional: { n: 'Seccional', d: 'paneles horizontales que suben al techo' },
  basculante: { n: 'Basculante', d: 'hoja única que bascula hacia arriba' },
  enrollable: { n: 'Enrollable', d: 'lamas que se enrollan en un cajón' },
  corredera: { n: 'Corredera', d: 'hoja que se desliza por fuera del muro' },
  batiente: { n: 'Batiente', d: 'dos hojas que abren hacia fuera' },
};
// Coloca un hueco de ancho a dentro del segmento s sin salirse (holgura m a cada extremo).
function encaje(s, u, a, m) {
  const a0 = s.o === 'h' ? s.x1 : s.y1, L = s.len; const w = r3(Math.max(0.45, Math.min(a, L - 2 * m)));
  const lo = a0 + m + w / 2, hi = a0 + L - m - w / 2; return { u: r3(hi < lo ? a0 + L / 2 : Math.min(hi, Math.max(lo, u))), w: r3(Math.min(w, L)) };
}
// De dos estancias separadas por una puerta, la que «pide» la puerta (hacia la que abre): la cerrada frente a la de paso,
// y entre dos cerradas la más pequeña (baño o vestidor frente a dormitorio). Misma idea que puertas().
const PASO = new Set(['salon', 'comedor', 'recibidor', 'pasillo', 'distribuidor', 'escalera']);
function quienPide(a, b) {
  const pa = PASO.has(a.tipo) && !a.cerrada, pb = PASO.has(b.tipo) && !b.cerrada;
  if (pa !== pb) return pa ? b : a;
  return a.w * a.h <= b.w * b.h ? a : b;
}
// Estancias interiores que tienen algún hueco o puerta manual en su perímetro.
function tocadas(planta, segs) {
  const out = new Set();
  for (const h of planta.huecosManual || []) { const s = segmentoEn(segs, h.x, h.y, h.o, ['fachada']); if (s) out.add(s.int.id); }
  for (const d of planta.puertasManual || []) { const s = segmentoEn(segs, d.x, d.y, d.o, ['tabique']); if (s) { out.add(s.a.id); out.add(s.b.id); } }
  return out;
}
function derivarFijo(modelo, pi, segs) {
  const planta = modelo.plantas[pi]; const huecos = [], puertasM = [], huerfanos = [];
  for (const h of planta.huecosManual || []) {
    const s = segmentoEn(segs, h.x, h.y, h.o, ['fachada']); if (!s) { huerfanos.push(h.id); continue; }
    const tipo = HUECOS[h.tipo] && h.tipo !== 'ninguno' ? h.tipo : 'ventana'; const hor = s.o === 'h';
    const { u, w } = encaje(s, hor ? h.x : h.y, h.ancho || 1.5, 0.12);
    const alto = tipo === 'porton' && Number.isFinite(+h.alto) && +h.alto > 0 ? Math.min(2.8, Math.max(2.0, +h.alto)) : HUECOS[tipo].alto;
    const it = { id: h.id, manual: true, tipo, ancho: w, alto, alf: HUECOS[tipo].alf, o: s.o, lado: s.lado, est: s.int.id, auto: false,
      x: hor ? u : s.x1, y: hor ? s.y1 : u, entrada: !!h.entrada, exterior: tipo === 'puerta' && !h.entrada };
    if (tipo === 'puerta') { it.hacia = h.hacia === 'fuera' ? 'fuera' : 'dentro'; it.bisagra = h.bisagra === 'fin' ? 'fin' : 'ini'; if (h.corredera) it.corredera = true; }
    if (tipo === 'porton') it.modelo = PORTONES[h.modelo] ? h.modelo : 'seccional';
    huecos.push(it);
  }
  for (const d of planta.puertasManual || []) {
    const s = segmentoEn(segs, d.x, d.y, d.o, ['tabique']); if (!s) { huerfanos.push(d.id); continue; }
    const hor = s.o === 'h'; const { u, w } = encaje(s, hor ? d.x : d.y, d.ancho || 0.825, 0.1);
    const a = d.est && (d.est === s.a.id || d.est === s.b.id) ? d.est : quienPide(s.a, s.b).id; const b = a === s.a.id ? s.b.id : s.a.id; // abre hacia la estancia que pide la puerta
    const pm = { id: d.id, manual: true, tipo: 'paso', ancho: w, alto: 2.05, o: s.o, x: hor ? u : s.x1, y: hor ? s.y1 : u, a, b, corredera: !!d.corredera, abre: d.abre === 1 || d.abre === -1 ? d.abre : 0, bisagra: d.bisagra === 'fin' ? 'fin' : 'ini' };
    if (s.a.tipo === 'ascensor' || s.b.tipo === 'ascensor') pm.ascensor = true; // v.1.5
    else if ((s.a.vivienda || '') !== (s.b.vivienda || '')) pm.vivienda = s.a.vivienda || s.b.vivienda;
    puertasM.push(pm);
  }
  // Estancias nuevas (añadidas después de fijar) y sin nada manual: reciben sus huecos y puertas automáticos.
  if (Array.isArray(planta.huecosEst)) {
    const conocidas = new Set(planta.huecosEst); const toc = tocadas(planta, segs);
    const nuevas = new Set(planta.estancias.filter((e) => esInt(e.tipo) && !conocidas.has(e.id) && !toc.has(e.id)).map((e) => e.id));
    if (nuevas.size) {
      const hf = huecosFachada(modelo, pi, segs).filter((h) => nuevas.has(h.est) && !h.entrada);
      for (const h of hf) huecos.push(Object.assign(h, { id: 'auto-' + h.est + '-' + h.lado + '-' + r3(h.o === 'h' ? h.x : h.y) }));
      const pu = puertas(modelo, pi, segs, [...huecos.filter((h) => h.entrada), ...hf]).puertas.filter((d) => nuevas.has(d.a) || nuevas.has(d.b));
      for (const d of pu) if (!puertasM.some((q) => (q.a === d.a && q.b === d.b) || (q.a === d.b && q.b === d.a))) puertasM.push(d);
    }
  }
  if (!huecos.some((h) => h.entrada) && pi === 0) { const p = huecos.find((h) => h.tipo === 'puerta'); if (p) { p.entrada = true; p.exterior = false; } }
  // accesibilidad con las puertas manuales
  const ints = planta.estancias.filter((e) => esInt(e.tipo) && e.tipo !== 'doble_altura' && e.tipo !== 'ascensor'); const padre = new Map(ints.map((e) => [e.id, e.id]));
  const find = (x) => { while (padre.get(x) !== x) x = padre.get(x); return x; }; const une = (a, b) => { if (padre.has(a) && padre.has(b)) padre.set(find(a), find(b)); };
  for (const s of segs) if (s.clase === 'abierto') une(s.a.id, s.b.id);
  for (const d of puertasM) une(d.a, d.b);
  const raices = huecos.filter((h) => h.tipo === 'puerta' || h.tipo === 'porton' || (h.tipo === 'ventanal' && pi === 0)).map((h) => h.est);
  const esc = ints.filter((e) => e.tipo === 'escalera').map((e) => e.id); if (pi > 0) raices.push(...esc);
  const r0 = raices[0]; for (const r of raices) une(r, r0);
  const sinAcceso = esEdificio(modelo) ? accesoUnidades(modelo, pi, ints, segs, puertasM, huecos) : r0 ? ints.filter((e) => find(e.id) !== find(r0) && !TIPOS[e.tipo].vacio).map((e) => e.id) : [];
  return { segs, huecos, puertas: puertasM, sinAcceso, huerfanos, fijo: true, vuelos: vuelos(modelo, pi), cubierta: cubierta(modelo, pi) };
}

export function derivar(modelo, pi) {
  if (pi === -1) return derivarSotano(modelo); // v.1.6: planta sótano (modelo.sotano)
  const planta = modelo.plantas[pi];
  const segs = muros(planta);
  if (planta.huecosFijos) return derivarFijo(modelo, pi, segs);
  const hf = huecosFachada(modelo, pi, segs);
  let pu = puertas(modelo, pi, segs, hf); const extra = [];
  // Pabellones y casas patio: una pieza sin acceso interior que da a porche, terraza o patio recibe su propia puerta exterior.
  const BB = bbox(modelo);
  for (let it = 0; it < 8 && pu.sinAcceso.length && !esEdificio(modelo); it++) {
    let cand = null;
    for (const id of pu.sinAcceso) {
      const e = planta.estancias.find((q) => q.id === id); if (!e || grupo(e.tipo) === 'humedo') continue;
      const ss = segs.filter((s) => s.clase === 'fachada' && s.int.id === id && s.extr && TIPOS[s.extr.tipo].ext && !esMedianera(modelo, s, BB) && s.len >= 1.5 - 1e-6).sort((a, b) => b.len - a.len);
      const pr = grupo(e.tipo) === 'circ' ? 0 : grupo(e.tipo) === 'dia' ? 1 : 2;
      if (ss[0] && (!cand || pr < cand.pr)) cand = { e, s: ss[0], pr };
    }
    if (!cand) break;
    const { e, s } = cand; const enSeg = (h) => h.o === s.o && (s.o === 'h' ? Math.abs(h.y - s.y1) < 1e-6 && h.x > s.x1 && h.x < s.x2 : Math.abs(h.x - s.x1) < 1e-6 && h.y > s.y1 && h.y < s.y2);
    const c = s.len >= 3 - 1e-6 ? 0.75 : s.len / 2;
    if (s.len < 3 - 1e-6) for (let i = hf.length - 1; i >= 0; i--) if (enSeg(hf[i])) hf.splice(i, 1);
    const d = hueco(s, 'puerta', 0.9, e, true, c); d.exterior = true; hf.push(d);
    extra.push(e.id); pu = puertas(modelo, pi, segs, hf, extra);
  }
  return { segs, huecos: hf, puertas: pu.puertas, sinAcceso: pu.sinAcceso, vuelos: vuelos(modelo, pi), cubierta: cubierta(modelo, pi) };
}
