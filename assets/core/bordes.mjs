// Bordes exteriores de una planta (v.1.3): celosías, barandillas y pérgolas por PAÑOS continuos.
// Módulo puro (navegador y servidor). Lo usan el visor 3D, los planos 2D, el editor (herramienta «Bordes»), el servicio/MCP
// y el presupuesto interno: una sola fuente para todos.
//
// Conjuntos exteriores: las estancias exteriores contiguas de una planta (terraza, porche, patio, chill out, quincho…)
// forman una sola forma; sus aristas internas NO son borde. Un borde es una arista de celda de trama (0,375 m) entre una
// celda de un conjunto y lo que no es de ese conjunto (exterior libre, fachada de interior, otro conjunto). Las celdas
// colineales contiguas con el mismo estado y configuración se unen en paños.
//
// Estado por celda: automático (celosía desde e.celosia.lados de cada estancia; barandilla de vidrio en los bordes de
// planta alta que caen al vacío y no llevan celosía) + anulaciones manuales en planta.bordes (docs/CONTRATO_v1.md, v.1.3):
//   planta.bordes = { [clave]: { c?: 0|1, b?: 0|1, cfg?: { altura?, alto?, material? } } }
//   clave = «h<línea>:<celda>» (arista horizontal en y = línea·T, celda x de celda·T a (celda+1)·T)
//         | «v<línea>:<celda>» (arista vertical en x = línea·T, celda y). Índices enteros de trama (pueden ser negativos).
import { T, H_PLANTA, E_FORJADO, E_FACHADA, r3, cm, clamp } from './trama.mjs';
import { TIPOS, esInt, CELOSIA_MATERIALES } from './catalogo.mjs';
import { celdasPlanta } from './geometria.mjs';

// ---------- cotas (las mismas que dibuja el visor 3D) ----------
export const ALTO_PETO = 0.45, E_ALBARDILLA = 0.03;   // peto de cubierta plana + albardilla (remate a 0,48 sobre el forjado)
export const CANTO_INCLINADA = 0.2;                     // canto de la cubierta inclinada sobre la línea de fachada
export const ALTO_SIMPLE = r3(H_PLANTA - E_FORJADO);    // 2,74: una planta, bajo el forjado superior
export const SEP_BASE = 0.05;                           // separación de la celosía a la línea del borde
export const SEP_MURO = r3(E_FACHADA / 2 + 0.03);       // separación cuando hay muro o peto en la línea (por fuera de la cara)
export const ALTURAS = ['simple', 'doble', 'cubierta'];
// Lamas verticales por material: tk grueso (a lo largo del paño), dp fondo, paso entre ejes (rejilla global: u = k · paso).
export const LAMAS = { madera: { tk: 0.045, dp: 0.1, paso: 0.12 }, aluminio: { tk: 0.03, dp: 0.12, paso: 0.1 }, hormigon: { tk: 0.08, dp: 0.16, paso: 0.24 } };
// Pérgola: lamas horizontales de 5 × 14 cm cada 0,25 m (rejilla global u = (k + ½) · 0,25: simétrica en cada módulo de 0,75)
export const PERGOLA = { paso: 0.25, lama: 0.05, alto: 0.14, viga: 0.1, canto: 0.2, poste: 0.12, sep: 0.04 };
export const CLAVE = /^([hv])(-?\d{1,4}):(-?\d{1,4})$/;

const K = (i, j) => i + ',' + j;
const kB = (o, line, pos) => o + line + ':' + pos;
export function parseClave(k) { const m = CLAVE.exec(String(k)); return m ? { o: m[1], line: Number(m[2]), pos: Number(m[3]) } : null; }
const matOk = (k) => (CELOSIA_MATERIALES[k] ? k : 'madera');

// Grupo de una celda para unir formas: 'ext' (exteriores con suelo; en planta baja también los patios), 'hueco' (patio en
// planta alta: es un vacío, no se une con las terrazas) y 'da' (doble altura). El resto (interiores) no forma conjunto.
function grupoDe(e, pi) {
  const t = e && TIPOS[e.tipo]; if (!t) return null;
  if (e.tipo === 'doble_altura') return 'da';
  if (!t.ext) return null;
  return pi > 0 && t.vacio ? 'hueco' : 'ext';
}
const PRIO = { ext: 3, hueco: 2, da: 1 };
const cerrado = (e) => !!e && !!TIPOS[e.tipo] && (esInt(e.tipo) || !!TIPOS[e.tipo].cubierto);          // muro, peto o borde de cubierta en su contorno
const macizo = (e) => !!e && !!TIPOS[e.tipo] && !(TIPOS[e.tipo].ext && TIPOS[e.tipo].vacio);            // todo menos un patio: tiene forjado o es interior
export const tienePergola = (e, opt = {}) => !!e && !!TIPOS[e.tipo]?.ext && (!!e.pergola || (e.tipo === 'terraza' && (!!opt.pergola || /p[eé]rgola/i.test(e.nombre || ''))));

// Config de celosía normalizada (la de la estancia o la de una anulación)
export function cfgCelosia(c = {}) {
  const o = { altura: ALTURAS.includes(c.altura) ? c.altura : 'simple', material: matOk(c.material) };
  if (+c.alto > 0) o.alto = r3(clamp(+c.alto, 0.6, 12));
  return o;
}
// Remate de la cubierta sobre la cara superior del último forjado: peto + albardilla (plana), canto (inclinada), losa (plana con alero)
export function remateCubierta(modelo) {
  const c = modelo.cubierta || {}; const t = c.tipo === 'dos aguas' ? 'dos' : c.tipo;
  if (['una', 'dos', 'tres', 'cuatro'].includes(t)) return CANTO_INCLINADA;
  return (+c.alero || 0) > 0 ? 0.05 : r3(ALTO_PETO + E_ALBARDILLA);
}

// Contexto de cálculo de un modelo (celdas de todas las plantas). Se puede reutilizar entre plantas.
export function contextoBordes(modelo) {
  return { modelo, C: modelo.plantas.map((p) => celdasPlanta(p).m), remate: remateCubierta(modelo), n: modelo.plantas.length };
}

// ---------- bordes de una planta ----------
// Devuelve { pi, aristas: Map(clave → arista), panos: [...], comps } con la arista:
//   { k, o, line, pos, own (estancia dueña), otr (la de enfrente o null), sg (+1: dueña en el lado + de la línea), place (lado
//     donde van las lamas), lado (N|S|E|O de la dueña), otro: libre|muro|vacio, cel: cfg+{top, off} | null, bar: bool,
//     auto: { cel, bar }, manual: bool, comp }
export function bordesPlanta(modelo, pi, opt = {}, X = contextoBordes(modelo)) {
  const C = X.C[pi]; const pl = modelo.plantas[pi]; const ov = (pl && pl.bordes) || {};
  const A = new Map(); if (!C) return { pi, aristas: A, panos: [], comps: new Map() };
  const g = (i, j) => grupoDe(C.get(K(i, j)), pi);
  // componentes conexas de cada grupo (para «hasta cubierta» y para unir terrazas)
  const comp = new Map(); let nc = 0;
  for (const [k, e] of C) {
    const gr = grupoDe(e, pi); if (!gr || comp.has(k)) continue; const id = nc++; const pila = [k]; comp.set(k, id);
    while (pila.length) { const [i, j] = pila.pop().split(',').map(Number); for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) { const kk = K(a, b); if (!comp.has(kk) && g(a, b) === gr) { comp.set(kk, id); pila.push(kk); } } }
  }
  // cota de cubierta de cada componente: la planta más alta construida junto a ella (o encima)
  const kc = new Map();
  for (const [k, id] of comp) {
    const [i, j] = k.split(',').map(Number);
    for (let q = X.n - 1; q >= pi; q--) {
      if ((kc.get(id) ?? -1) >= q) break;
      let hay = false; for (let a = -1; a <= 1 && !hay; a++) for (let b = -1; b <= 1 && !hay; b++) { const e = X.C[q].get(K(i + a, j + b)); if (e && cerrado(e) && !TIPOS[e.tipo].vacio) hay = true; }
      if (hay) { kc.set(id, q); break; }
    }
  }
  const techo = (q) => r3((q + 1 - pi) * H_PLANTA + X.remate);
  // aristas
  const add = (o, line, pos, ca, cb, ia, ja, ib, jb) => { // ca: celda en el lado − de la línea, cb: en el lado +
    const k = kB(o, line, pos); if (A.has(k)) return;
    const ga = grupoDe(ca, pi), gb = grupoDe(cb, pi); if (ga === gb || (!ga && !gb)) return;
    const own = (PRIO[gb] || 0) >= (PRIO[ga] || 0) ? 'b' : 'a';
    const [oe, te, oi, oj, ti, tj] = own === 'b' ? [cb, ca, ib, jb, ia, ja] : [ca, cb, ia, ja, ib, jb];
    const sg = own === 'b' ? 1 : -1; const gO = grupoDe(oe, pi), gT = grupoDe(te, pi);
    if (gO === 'da' && te) return; // la doble altura solo tiene borde hacia el exterior libre (hacia dentro: barandilla del hueco)
    const otro = !te ? 'libre' : esInt(te.tipo) ? 'muro' : gT === 'hueco' ? 'vacio' : 'libre';
    const da = gO === 'da'; // la celosía de la doble altura va por fuera de su fachada
    A.set(k, { k, o, line, pos, own: oe, otr: te || null, grupo: gO, sg, place: da ? -sg : sg, pc: da ? [ti, tj] : [oi, oj], oc: [oi, oj], tc: [ti, tj],
      lado: o === 'h' ? (sg > 0 ? 'N' : 'S') : (sg > 0 ? 'O' : 'E'), otro, comp: comp.get(K(oi, oj)), cel: null, bar: false, auto: { cel: null, bar: false }, manual: false });
  };
  for (const [k, e] of C) {
    if (!grupoDe(e, pi)) continue; const [i, j] = k.split(',').map(Number);
    add('h', j, i, C.get(K(i, j - 1)), e, i, j - 1, i, j); add('h', j + 1, i, e, C.get(K(i, j + 1)), i, j, i, j + 1);
    add('v', i, j, C.get(K(i - 1, j)), e, i - 1, j, i, j); add('v', i + 1, j, e, C.get(K(i + 1, j)), i, j, i + 1, j);
  }
  // celosía automática: lados de cada estancia que caen sobre un borde (la dueña manda sobre la de enfrente)
  for (const e of pl.estancias) {
    const c = e.celosia; if (!c || !Array.isArray(c.lados) || !c.lados.length || !grupoDe(e, pi)) continue;
    const i0 = Math.round(e.x / T), j0 = Math.round(e.y / T), ni = Math.round(e.w / T), nj = Math.round(e.h / T); if (![i0, j0, ni, nj].every(Number.isFinite)) continue;
    const cfg = cfgCelosia(c);
    for (const l of new Set(c.lados)) {
      const ks = l === 'N' ? Array.from({ length: ni }, (_, q) => kB('h', j0, i0 + q)) : l === 'S' ? Array.from({ length: ni }, (_, q) => kB('h', j0 + nj, i0 + q))
        : l === 'O' ? Array.from({ length: nj }, (_, q) => kB('v', i0, j0 + q)) : l === 'E' ? Array.from({ length: nj }, (_, q) => kB('v', i0 + ni, j0 + q)) : [];
      for (const k of ks) { const a = A.get(k); if (!a) continue; if (!a.auto.cel || a.own === e) a.auto.cel = cfg; }
    }
  }
  // estado final con anulaciones, altura real (recortada) y separación
  for (const a of A.values()) {
    const o = ov[a.k] && typeof ov[a.k] === 'object' ? ov[a.k] : null; a.manual = !!o;
    let cfg = a.auto.cel;
    if (o && o.c === 0) cfg = null;
    else if (o && (o.c === 1 || (cfg && o.cfg))) cfg = cfgCelosia({ ...(cfg || { altura: 'simple', material: 'madera' }), ...(o.cfg || {}) });
    a.bar = false;
    if (cfg) {
      const obj = +cfg.alto > 0 ? cfg.alto : cfg.altura === 'cubierta' ? techo(kc.get(a.comp) ?? pi) : cfg.altura === 'doble' ? techo(pi + 1) : ALTO_SIMPLE;
      const tope = topeCelda(X, pi, a.pc[0], a.pc[1], opt); const top = r3(Math.min(obj, tope));
      // separación: muro, peto o canto de cubierta en la línea en alguna de las plantas que cruza la celosía
      let off = a.grupo === 'da' ? SEP_MURO : SEP_BASE;
      if (off < SEP_MURO) {
        const qMax = Math.min(X.n - 1, pi + Math.floor((top - 1e-3) / H_PLANTA));
        for (let q = pi; q <= qMax && off < SEP_MURO; q++) { const ot = X.C[q].get(K(a.tc[0], a.tc[1])), ow = X.C[q].get(K(a.oc[0], a.oc[1])); if (cerrado(ot) && !(q > pi && cerrado(ow))) off = SEP_MURO; }
      }
      a.cel = { ...cfg, top, objetivo: r3(obj), off };
    } else a.cel = null;
    // barandilla automática: planta alta, suelo propio, cae al vacío o al exterior y sin celosía (no duplicar; nunca contra un muro)
    a.auto.bar = pi > 0 && a.grupo === 'ext' && (a.otro === 'libre' || a.otro === 'vacio') && !a.cel;
    a.bar = o && (o.b === 0 || o.b === 1) ? o.b === 1 : a.auto.bar;
  }
  return { pi, aristas: A, panos: unirPanos(A, pi), comps: kc, techo };
}
// Altura libre sobre el suelo de la planta pi en la columna de la celda (i, j): bajo el primer forjado o volumen que haya encima
// (o bajo la cubierta del propio porche).
export function topeCelda(X, pi, i, j, opt = {}) {
  const k = K(i, j); const e = X.C[pi].get(k);
  if (e && TIPOS[e.tipo]?.cubierto && !tienePergola(e, opt)) return ALTO_SIMPLE;
  for (let q = pi + 1; q < X.n; q++) if (macizo(X.C[q].get(k))) return r3((q - pi) * H_PLANTA - E_FORJADO);
  return Infinity;
}
const firma = (a) => (a.cel ? `${a.cel.material}|${a.cel.top}|${a.cel.off}|${a.cel.altura}|${a.cel.alto || 0}` : '-') + '|' + (a.bar ? 1 : 0);
function unirPanos(A, pi) {
  const L = [...A.values()].sort((p, q) => (p.o < q.o ? -1 : p.o > q.o ? 1 : p.line - q.line || p.sg - q.sg || p.pos - q.pos));
  const out = []; let cur = null;
  for (const a of L) {
    if (cur && cur.o === a.o && cur.line === a.line && cur.sg === a.sg && cur.place === a.place && cur.i1 === a.pos && cur.f === firma(a)) { cur.i1++; cur.cel_.push(a); continue; }
    if (cur) out.push(cur);
    cur = { o: a.o, line: a.line, sg: a.sg, place: a.place, i0: a.pos, i1: a.pos + 1, f: firma(a), cel_: [a] };
  }
  if (cur) out.push(cur);
  return out.map((p) => {
    const h = p.o === 'h'; const a0 = p.cel_[0]; const c = cm(p.line);
    const otros = new Set(p.cel_.map((a) => a.otro));
    return {
      id: a0.k, pi, o: p.o, line: p.line, sg: p.sg, place: p.place, i0: p.i0, i1: p.i1, lado: a0.lado,
      x1: h ? cm(p.i0) : c, y1: h ? c : cm(p.i0), x2: h ? cm(p.i1) : c, y2: h ? c : cm(p.i1), len: cm(p.i1 - p.i0),
      claves: p.cel_.map((a) => a.k), celosia: a0.cel ? { ...a0.cel, auto: p.cel_.every((a) => !a.manual) } : null, barandilla: a0.bar,
      manual: p.cel_.some((a) => a.manual), otro: otros.size === 1 ? [...otros][0] : 'mixto', estancias: [...new Set(p.cel_.map((a) => a.own.id))],
    };
  });
}

// ---------- pérgolas ----------
// Unión de las celdas con pérgola de la planta (estancias con e.pergola contiguas = una sola pérgola), sin las que tienen
// algo construido encima por debajo de su cota. Cota = la mayor de las celosías que la rodean (enrasa con ellas) o 2,74.
// Devuelve [{ top, celdas, area, material, vigas: [{x,y,w,h}], lamas: [{x1,y1,x2,y2}], postes: [{x,y}], coronas: Set(claves) }]
export function pergolasPlanta(modelo, pi, opt = {}, X = contextoBordes(modelo), B = bordesPlanta(modelo, pi, opt, X)) {
  const C = X.C[pi]; if (!C) return [];
  const S = new Set(); for (const [k, e] of C) if (tienePergola(e, opt)) S.add(k);
  if (!S.size) return [];
  const out = []; const visto = new Set();
  for (const k0 of S) {
    if (visto.has(k0)) continue; const cs = []; const pila = [k0]; visto.add(k0);
    while (pila.length) { const k = pila.pop(); cs.push(k); const [i, j] = k.split(',').map(Number); for (const kk of [K(i + 1, j), K(i - 1, j), K(i, j + 1), K(i, j - 1)]) if (S.has(kk) && !visto.has(kk)) { visto.add(kk); pila.push(kk); } }
    const enC = new Set(cs);
    // cota: celosías cuyo lado de lamas cae en la pérgola
    let top = 0, mat = null;
    for (const a of B.aristas.values()) if (a.cel && enC.has(K(a.pc[0], a.pc[1]))) { if (a.cel.objetivo > top) top = a.cel.objetivo; mat = mat || a.cel.material; }
    for (const k of cs) { const e = C.get(k); if (e.celosia?.material && !mat) mat = matOk(e.celosia.material); }
    if (!top) top = ALTO_SIMPLE;
    const R = new Set(cs.filter((k) => { const [i, j] = k.split(',').map(Number); return topeCelda(X, pi, i, j, opt) >= top - 0.01; }));
    if (!R.size) continue;
    out.push(geometriaPergola(X, pi, R, r3(top), mat || 'madera', B));
  }
  return out;
}
function geometriaPergola(X, pi, R, top, material, B) {
  const P = PERGOLA; const has = (i, j) => R.has(K(i, j)); const Cp = X.C[pi];
  const qTop = Math.min(X.n - 1, pi + Math.floor((top - 1e-3) / H_PLANTA));
  const alero = clamp(+X.modelo.cubierta?.alero || 0, 0, 1.5);
  // banda ocupada desde la línea del contorno hacia dentro: celosía que corona (su fondo), muro o peto en la línea, o viga
  const banda = new Map(); const coronas = new Set();
  const bandaDe = (o, line, pos, ii, ij, ti, tj) => {
    const k = kB(o, line, pos); if (banda.has(k)) return banda.get(k);
    const a = B.aristas.get(k); let r;
    if (a && a.cel && a.cel.top >= top - 0.02 && a.pc[0] === ii && a.pc[1] === ij) { coronas.add(k); r = { cel: true, ins: a.cel.off, b: a.cel.off + LAMAS[a.cel.material].dp }; }
    else {
      let muro = false; for (let q = pi; q <= qTop && !muro; q++) if (cerrado(X.C[q].get(K(ti, tj)))) muro = true;
      const ins = muro ? Math.max(SEP_MURO, alero > 0 ? r3(alero + 0.05) : 0) : P.sep; r = { cel: false, ins, b: ins + P.viga }; // por fuera del muro, del peto y del alero
    }
    banda.set(k, r); return r;
  };
  // contorno
  const ar = [];
  for (const k of R) {
    const [i, j] = k.split(',').map(Number);
    if (!has(i, j - 1)) ar.push({ o: 'h', line: j, pos: i, sg: 1, ...bandaDe('h', j, i, i, j, i, j - 1) });
    if (!has(i, j + 1)) ar.push({ o: 'h', line: j + 1, pos: i, sg: -1, ...bandaDe('h', j + 1, i, i, j, i, j + 1) });
    if (!has(i - 1, j)) ar.push({ o: 'v', line: i, pos: j, sg: 1, ...bandaDe('v', i, j, i, j, i - 1, j) });
    if (!has(i + 1, j)) ar.push({ o: 'v', line: i + 1, pos: j, sg: -1, ...bandaDe('v', i + 1, j, i, j, i + 1, j) });
  }
  ar.sort((p, q) => (p.o < q.o ? -1 : p.o > q.o ? 1 : p.line - q.line || p.sg - q.sg || p.pos - q.pos));
  const runs = []; let cur = null;
  for (const a of ar) { if (cur && cur.o === a.o && cur.line === a.line && cur.sg === a.sg && cur.i1 === a.pos && cur.cel === a.cel && cur.ins === a.ins) { cur.i1++; continue; } if (cur) runs.push(cur); cur = { ...a, i0: a.pos, i1: a.pos + 1 }; }
  if (cur) runs.push(cur);
  const bandaEn = (o, line, pos) => banda.get(kB(o, line, pos));
  // vigas perimetrales (las horizontales pasan; las verticales se recortan contra ellas en las esquinas)
  const vigas = [];
  for (const r of runs) {
    if (r.cel) continue; const c = cm(r.line); const n0 = c + r.sg * r.ins, n1 = c + r.sg * (r.ins + P.viga);
    let a0 = cm(r.i0), a1 = cm(r.i1);
    if (r.o === 'v') { // esquinas: dentro de la celda inicial/final, ¿hay contorno horizontal?
      const ci = r.sg > 0 ? r.line : r.line - 1;
      const bi = !has(ci, r.i0 - 1) ? bandaEn('h', r.i0, ci) : null; if (bi) a0 += bi.b;
      const bf = !has(ci, r.i1) ? bandaEn('h', r.i1, ci) : null; if (bf) a1 -= bf.b;
    } else { // las horizontales se acortan solo frente a una celosía que corona (su esquina la cierra la celosía)
      const cj = r.sg > 0 ? r.line : r.line - 1;
      const bi = !has(r.i0 - 1, cj) ? bandaEn('v', r.i0, cj) : null; if (bi?.cel) a0 += bi.b;
      const bf = !has(r.i1, cj) ? bandaEn('v', r.i1, cj) : null; if (bf?.cel) a1 -= bf.b;
    }
    if (a1 - a0 < 0.05) continue; const [m0, m1] = n0 < n1 ? [n0, n1] : [n1, n0];
    vigas.push(r.o === 'h' ? { x: r3(a0), y: r3(m0), w: r3(a1 - a0), h: r3(m1 - m0) } : { x: r3(m0), y: r3(a0), w: r3(m1 - m0), h: r3(a1 - a0) });
  }
  // lamas: rejilla global, perpendiculares al lado largo de la pérgola
  let i0 = Infinity, j0 = Infinity, i1 = -Infinity, j1 = -Infinity; for (const k of R) { const [i, j] = k.split(',').map(Number); i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i + 1); j1 = Math.max(j1, j + 1); }
  const enX = i1 - i0 >= j1 - j0; // lamas en posiciones x (cortas, a lo largo de y)
  const lamas = []; const hw = P.lama / 2;
  const u0 = cm(enX ? i0 : j0), u1 = cm(enX ? i1 : j1);
  for (let kk = Math.ceil(u0 / P.paso - 0.5 - 1e-9); (kk + 0.5) * P.paso < u1; kk++) {
    const u = (kk + 0.5) * P.paso; const ci = Math.floor(u / T + 1e-9); const du = u - ci * T;
    let ini = null;
    const cierra = (jfin) => { // tramo de celdas [ini, jfin) en la columna/fila ci
      if (ini == null) return; let v0 = cm(ini), v1 = cm(jfin);
      const b0 = enX ? bandaEn('h', ini, ci) : bandaEn('v', ini, ci), b1 = enX ? bandaEn('h', jfin, ci) : bandaEn('v', jfin, ci);
      if (b0) v0 += b0.b; if (b1) v1 -= b1.b; ini = null;
      if (v1 - v0 > 0.1) lamas.push(enX ? { x1: r3(u), y1: r3(v0), x2: r3(u), y2: r3(v1) } : { x1: r3(v0), y1: r3(u), x2: r3(v1), y2: r3(u) });
    };
    for (let q = enX ? j0 : i0; q <= (enX ? j1 : i1); q++) {
      const dentro = enX ? has(ci, q) : has(q, ci);
      // la lama no puede caer dentro de la banda de un contorno paralelo (viga, muro o celosía) de esta celda
      let libre = dentro;
      if (dentro) {
        const bA = enX ? (!has(ci - 1, q) ? bandaEn('v', ci, q) : null) : (!has(q, ci - 1) ? bandaEn('h', ci, q) : null);
        const bB = enX ? (!has(ci + 1, q) ? bandaEn('v', ci + 1, q) : null) : (!has(q, ci + 1) ? bandaEn('h', ci + 1, q) : null);
        if ((bA && du - hw < bA.b) || (bB && T - du - hw < bB.b)) libre = false;
      }
      if (libre && ini == null) ini = q; else if (!libre && ini != null) cierra(q);
    }
    cierra(enX ? j1 + 1 : i1 + 1);
  }
  // postes en las esquinas salientes que no apoyan en muro interior ni en celosía
  const postes = [];
  for (const k of R) {
    const [i, j] = k.split(',').map(Number);
    for (const [di, dj] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      if (has(i + di, j) || has(i, j + dj)) continue; // solo esquinas salientes
      const vx = di < 0 ? i : i + 1, vy = dj < 0 ? j : j + 1;
      if ([[vx, vy], [vx - 1, vy], [vx, vy - 1], [vx - 1, vy - 1]].some(([a, b]) => { const e = Cp.get(K(a, b)); return e && esInt(e.tipo); })) continue;
      const bh = bandaEn('h', dj < 0 ? j : j + 1, i), bv = bandaEn('v', di < 0 ? i : i + 1, j); if (bh?.cel || bv?.cel) continue;
      const ox = (bv ? bv.ins : P.sep) + P.viga / 2, oy = (bh ? bh.ins : P.sep) + P.viga / 2;
      postes.push({ x: r3(cm(vx) - di * ox), y: r3(cm(vy) - dj * oy) });
    }
  }
  return { pi, top, material, celdas: [...R], area: r3(R.size * T * T), vigas, lamas, postes, coronas, enX };
}

// ---------- edición (editor, servicio y MCP) ----------
// cambios: { celosia?: true|false|'auto', altura?, alto? (m; 0/null = según altura), material?, barandilla?: true|false|'auto' }
export function editarBordes(modelo, pi, claves, cambios = {}) {
  const pl = modelo.plantas[pi]; if (!pl) throw new Error('Planta inexistente: ' + pi);
  const B = bordesPlanta(modelo, pi); const ov = { ...(pl.bordes || {}) }; let n = 0;
  const cfgNueva = {}; if (cambios.altura != null) { cfgNueva.altura = ALTURAS.includes(cambios.altura) ? cambios.altura : 'simple'; if (cambios.alto === undefined) cfgNueva.alto = 0; }
  if (cambios.alto !== undefined) cfgNueva.alto = +cambios.alto > 0 ? r3(clamp(+cambios.alto, 0.6, 12)) : 0;
  if (cambios.material != null) cfgNueva.material = matOk(cambios.material);
  const hayCfg = Object.keys(cfgNueva).length > 0;
  for (const k of new Set(claves || [])) {
    const a = B.aristas.get(k); if (!a) continue; n++;
    const o = { ...(ov[k] || {}) };
    if (cambios.celosia === 'auto') { delete o.c; delete o.cfg; }
    else if (cambios.celosia != null) o.c = cambios.celosia ? 1 : 0;
    if (hayCfg && o.c !== 0 && cambios.celosia !== 'auto') { o.cfg = { ...(o.cfg || {}), ...cfgNueva }; if (o.c == null && !a.auto.cel) o.c = 1; }
    if (o.c === 0) delete o.cfg;
    if (cambios.barandilla === 'auto') delete o.b; else if (cambios.barandilla != null) o.b = cambios.barandilla ? 1 : 0;
    if (Object.keys(o).length) ov[k] = sanearAnulacion(o); else delete ov[k];
  }
  // las anulaciones que ya no caen en ningún borde (estancias movidas o borradas) se descartan
  for (const k of Object.keys(ov)) if (!B.aristas.has(k)) delete ov[k];
  if (Object.keys(ov).length) pl.bordes = ov; else delete pl.bordes;
  return n;
}
export function bordesAuto(modelo, pi, claves) {
  const pl = modelo.plantas[pi]; if (!pl?.bordes) return 0; let n = 0;
  if (!claves) { n = Object.keys(pl.bordes).length; delete pl.bordes; return n; }
  for (const k of claves) if (pl.bordes[k]) { delete pl.bordes[k]; n++; }
  if (!Object.keys(pl.bordes).length) delete pl.bordes; return n;
}
function sanearAnulacion(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null; const r = {};
  if (o.c === 0 || o.c === 1) r.c = o.c; if (o.b === 0 || o.b === 1) r.b = o.b;
  if (r.c !== 0 && o.cfg && typeof o.cfg === 'object') {
    const c = {}; if (ALTURAS.includes(o.cfg.altura)) c.altura = o.cfg.altura; if (CELOSIA_MATERIALES[o.cfg.material]) c.material = o.cfg.material;
    if (o.cfg.alto != null && Number.isFinite(+o.cfg.alto)) c.alto = +o.cfg.alto > 0 ? r3(clamp(+o.cfg.alto, 0.6, 12)) : 0;
    if (Object.keys(c).length) r.cfg = c;
  }
  return Object.keys(r).length ? r : null;
}
// Limpia planta.bordes (formato): lo usa normalizar(). Idempotente.
export function sanearBordes(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null; const out = {}; let n = 0;
  for (const [k, v] of Object.entries(b)) { if (!CLAVE.test(k) || n >= 20000) continue; const s = sanearAnulacion(v); if (s) { out[k] = s; n++; } }
  return n ? out : null;
}
// Transforma las claves de las anulaciones (espejo, giro, estirar, recolocar): f({o, line, pos}) → {o, line, pos} | null
export function transformarBordes(planta, f) {
  if (!planta?.bordes) return; const out = {};
  for (const [k, v] of Object.entries(planta.bordes)) { const p = parseClave(k); if (!p) continue; const q = f(p); if (!q || ![q.line, q.pos].every(Number.isInteger)) continue; out[kB(q.o, q.line, q.pos)] = v; }
  if (Object.keys(out).length) planta.bordes = out; else delete planta.bordes;
}

// ---------- resúmenes ----------
// Paños para el MCP / API (sin referencias circulares)
export function verBordes(modelo, pi, opt = {}) {
  const X = contextoBordes(modelo); const B = bordesPlanta(modelo, pi, opt, X); const P = pergolasPlanta(modelo, pi, opt, X, B);
  return {
    planta: pi, nota: 'Paños de borde exterior: celosía (altura sobre el suelo de la planta, ya recortada bajo forjados) y barandilla. «claves» identifican cada módulo de 0,375 m para editarlos con bordes_editar. «otro»: libre | muro (fachada enfrente: la celosía va por fuera de la cara) | vacio.',
    panos: B.panos.map((p) => ({ id: p.id, lado: p.lado, x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, largo: p.len, otro: p.otro, estancias: p.estancias, manual: p.manual,
      celosia: p.celosia ? { altura: p.celosia.alto ? 'a medida' : p.celosia.altura, alto: p.celosia.top, material: p.celosia.material, auto: p.celosia.auto } : null, barandilla: p.barandilla, claves: p.claves })),
    pergolas: P.map((g) => ({ cota: g.top, area: g.area, material: g.material, lamas: g.lamas.length, postes: g.postes.length })),
  };
}
// Mediciones de todo el modelo: m² de celosía (cara vista), ml de barandilla y m² de pérgola (real, por paños)
export function medicionBordes(modelo, opt = {}) {
  const X = contextoBordes(modelo); let cel = 0, bar = 0, per = 0;
  modelo.plantas.forEach((p, pi) => {
    const B = bordesPlanta(modelo, pi, opt, X);
    for (const q of B.panos) { if (q.celosia) cel += q.len * q.celosia.top; if (q.barandilla) bar += q.len; }
    for (const g of pergolasPlanta(modelo, pi, opt, X, B)) per += g.area;
  });
  return { celosia: r3(cel), barandilla: r3(bar), pergola: r3(per) };
}
