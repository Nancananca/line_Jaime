// Mobiliario derivado del modelo (una sola fuente para el plano 2D y el visor 3D).
//
// Dos niveles:
//   · PIEZAS: muebles completos tal como los ve el usuario (cama, sofá, cocina lineal, ducha…): huella en planta,
//     giro y rol. Son lo que el editor arrastra y lo que se guarda en e.mobiliario (coordenadas relativas).
//   · PRIMITIVAS: las cajas, cilindros y esferas que componen cada pieza, que es lo que dibuja el 3D.
//
// mobiliario(modelo, pi, g?) → [{ id, rol, x, y, w, h, z0, alto, forma, mat, est, pieza, eje?, redondeo?, luz?, fuego? }]
//   x, y, w, h: rectángulo en planta (metros; x → derecha, y → abajo), igual que las estancias.
//   z0, alto:   cota de la base sobre el suelo terminado de la planta y altura de la primitiva (m).
//   forma:      'caja' | 'cilindro' | 'esfera' (la esfera es un elipsoide inscrito en la caja).
//   eje:        en cilindros, 'z' (vertical, por defecto), 'x' o 'y' (tumbado a lo largo de ese eje en planta).
//   id, pieza:  id y rol de la pieza a la que pertenece (agrupa las primitivas de un mueble).
// piezasMobiliario(modelo, pi, g?) → [{ id, rol, x, y, w, h, giro, est, mat? }]  · huellas de las piezas
// fijarMobiliario(modelo, pi, estanciaId) → [{ id, rol, dx, dy, w, h, giro, alto?, mat? }]  · formato de e.mobiliario
// subeEscalera(modelo, pi, e) → 'N'|'S'|'E'|'O'  · sentido de subida efectivo (e.sube o el automático)
// zonasPuertas(modelo, pi, g?) → [[x, y, w, h], …]  · barridos y pasos de todas las puertas (nada se amuebla ahí)
// barridoPuerta(d, planta) → { lado: 1|-1, bisagra: 'ini'|'fin' }  · hacia dónde abre una puerta (lo usa el 3D)
// CATALOGO_MUEBLES = [{ rol, n, w, h, alto, forma, cat }]  · paleta del editor (w: a lo largo del muro, h: fondo)
//
// Giro de una pieza: lado del respaldo / muro de apoyo. 0 → N, 90 → E, 180 → S, 270 → O. w y h son siempre las
// medidas en planta (ya giradas). Función pura: no toca el modelo. Nunca lanza: una estancia rara queda vacía.
import { r3, T, H_PLANTA, E_FORJADO } from './trama.mjs';
import { TIPOS, esInt, esDorm, grupo } from './catalogo.mjs';
import { derivar, celdasPlanta } from './geometria.mjs';
import { esEdificio } from './edificio.mjs';

const OP = { N: 'S', S: 'N', E: 'O', O: 'E' };
const GIRO = { N: 0, E: 90, S: 180, O: 270 };
const LADO_G = { 0: 'N', 90: 'E', 180: 'S', 270: 'O' };
const horiz = (l) => l === 'N' || l === 'S';
const solapa = (a, b, m = 0) => a[0] < b[0] + b[2] + m && b[0] < a[0] + a[2] + m && a[1] < b[1] + b[3] + m && b[1] < a[1] + a[3] + m;
const giroN = (g) => ((Math.round((Number(g) || 0) / 90) * 90) % 360 + 360) % 360;
const TECHO = H_PLANTA - E_FORJADO; // cara inferior del forjado sobre el suelo terminado

// ---------------------------------------------------------------------------------------------------------
// Puertas: hacia dónde abren y qué superficie barren
// ---------------------------------------------------------------------------------------------------------
const PEQ = new Set(['vestidor', 'despensa', 'instalaciones', 'trastero', 'lavadero', 'aseo']);
export function barridoPuerta(d, planta) {
  const hor = d.o === 'h'; const c = hor ? d.y : d.x;
  let lado;
  if (d.abre === 1 || d.abre === -1) lado = d.abre;
  else if ((d.tipo === 'puerta' || d.tipo === 'porton') && d.lado) { lado = { N: 1, S: -1, O: 1, E: -1 }[d.lado] || 1; if (d.hacia === 'fuera' || (d.tipo === 'porton' && d.modelo === 'batiente')) lado = -lado; } // de fachada: hacia dentro salvo «fuera»
  else if (d.tipo === 'puerta' && planta) { // hueco manual sin lado: hacia la celda interior
    const m = celdasPlanta(planta).m; const k = (x, y) => m.get(Math.floor(x / T + 1e-6) + ',' + Math.floor(y / T + 1e-6));
    const mas = hor ? k(d.x, d.y + T / 2) : k(d.x + T / 2, d.y); lado = mas && esInt(mas.tipo) ? 1 : -1;
  } else {
    // abre hacia la estancia que pide la puerta (d.a); los cuartos pequeños de servicio (≤ 2,4 m²) abren hacia fuera
    let A = planta?.estancias.find((q) => q.id === d.a);
    if (A && A.w * A.h <= 2.4 + 1e-6 && PEQ.has(A.tipo)) A = planta.estancias.find((q) => q.id === d.b) || A;
    lado = A ? (hor ? (A.y + A.h / 2 > c ? 1 : -1) : (A.x + A.w / 2 > c ? 1 : -1)) : 1;
  }
  return { lado, bisagra: d.bisagra === 'fin' ? 'fin' : 'ini' };
}
// Zona: { r: [x, y, w, h], c?: [x, y] bisagra, rad?: radio del barrido } (con c, solo cuenta el cuarto de círculo).
function zonas(planta, g) {
  const out = [];
  const add = (d, fach) => {
    const hor = d.o === 'h'; const c = hor ? d.y : d.x; const a0 = (hor ? d.x : d.y) - d.ancho / 2; const ex = fach ? 0.15 : 0.05;
    const banda = (s, dd) => { const v0 = s > 0 ? c + ex : c - ex - dd; return hor ? [a0 - 0.05, v0, d.ancho + 0.1, dd] : [v0, a0 - 0.05, dd, d.ancho + 0.1]; };
    if (d.corredera) { out.push({ r: banda(1, 0.6) }, { r: banda(-1, 0.6) }); return; }
    const { lado, bisagra } = barridoPuerta(d, planta); const hoja = Math.min(1.1, d.ancho) - 0.02; // hoja ≈ paso − 7 cm de cerco, + 5 cm de holgura
    const ha = bisagra === 'fin' ? a0 + d.ancho : a0, hv = c + lado * ex;
    out.push({ r: banda(lado, hoja), c: hor ? [ha, hv] : [hv, ha], rad: hoja }); // barrido de la hoja (cuarto de círculo)
    out.push({ r: banda(-lado, fach ? 1.2 : 0.6) });                           // paso libre al otro lado (en fachada, el acceso exterior)
  };
  for (const d of g.puertas || []) add(d, false);
  for (const h of g.huecos || []) if (h.tipo === 'puerta') add(h, true);
  return out;
}
// Caja envolvente de la intersección de un rectángulo con una zona (o null si no se tocan).
function interZona(r, z) {
  const q = z.r; const x0 = Math.max(r[0], q[0]), y0 = Math.max(r[1], q[1]), x1 = Math.min(r[0] + r[2], q[0] + q[2]), y1 = Math.min(r[1] + r[3], q[1] + q[3]);
  if (x1 - x0 < 0.01 || y1 - y0 < 0.01) return null; if (!z.c) return [x0, y0, x1, y1];
  const [cx, cy] = z.c; const dx = cx < x0 ? x0 - cx : cx > x1 ? cx - x1 : 0, dy = cy < y0 ? y0 - cy : cy > y1 ? cy - y1 : 0;
  if (dx * dx + dy * dy >= z.rad * z.rad - 1e-4) return null;
  const hx = Math.sqrt(z.rad * z.rad - dy * dy), hy = Math.sqrt(z.rad * z.rad - dx * dx);
  return [Math.max(x0, cx - hx), Math.max(y0, cy - hy), Math.min(x1, cx + hx), Math.min(y1, cy + hy)];
}
export function zonasPuertas(modelo, pi, g, detalle = false) {
  const p = modelo?.plantas?.[pi]; if (!p) return []; const zs = zonas(p, g || derivar(modelo, pi));
  return detalle ? zs.map((z) => Object.assign({ r: z.r.map(r3) }, z.c ? { c: z.c.map(r3), rad: r3(z.rad) } : {})) : zs.map((z) => z.r.map(r3));
}
export const tocaZona = (r, z) => !!interZona(r, z.r ? z : { r: z });

// ---------------------------------------------------------------------------------------------------------
// Entorno de una estancia: huecos por lado (intervalos a lo largo del lado), retranqueo de cada muro y zonas
// prohibidas. Se puede reflejar (espejoX/Y): se amuebla el entorno reflejado y se refleja el resultado.
// ---------------------------------------------------------------------------------------------------------
function entorno(e, g, zs) {
  const oc = { N: [], S: [], E: [], O: [] }; const ins = { N: 0.02, S: 0.02, E: 0.02, O: 0.02 };
  const lado = (h) => {
    if (h.o === 'h') { if (h.x < e.x - 1e-6 || h.x > e.x + e.w + 1e-6) return null; if (Math.abs(h.y - e.y) < 1e-6) return 'N'; if (Math.abs(h.y - e.y - e.h) < 1e-6) return 'S'; }
    else { if (h.y < e.y - 1e-6 || h.y > e.y + e.h + 1e-6) return null; if (Math.abs(h.x - e.x) < 1e-6) return 'O'; if (Math.abs(h.x - e.x - e.w) < 1e-6) return 'E'; }
    return null;
  };
  const pon = (l, c, ancho, x) => oc[l].push(Object.assign({ u0: c - ancho / 2, u1: c + ancho / 2, ancho }, x));
  for (const h of g.huecos || []) { const l = lado(h); if (l) pon(l, horiz(l) ? h.x - e.x : h.y - e.y, h.ancho, { tipo: h.tipo, alf: h.alf || 0, top: (h.alf || 0) + (h.alto || 2.25), puerta: h.tipo === 'puerta' || h.tipo === 'porton' }); }
  for (const p of g.puertas || []) { const l = lado(p); if (l) pon(l, horiz(l) ? p.x - e.x : p.y - e.y, p.ancho, { tipo: 'paso', alf: 0, top: 2.1, puerta: true }); }
  for (const s of g.segs || []) {
    const toca = s.o === 'h' ? (s.x1 < e.x + e.w - 1e-6 && s.x2 > e.x + 1e-6 ? (Math.abs(s.y1 - e.y) < 1e-6 ? 'N' : Math.abs(s.y1 - e.y - e.h) < 1e-6 ? 'S' : null) : null)
      : (s.y1 < e.y + e.h - 1e-6 && s.y2 > e.y + 1e-6 ? (Math.abs(s.x1 - e.x) < 1e-6 ? 'O' : Math.abs(s.x1 - e.x - e.w) < 1e-6 ? 'E' : null) : null);
    if (!toca) continue;
    if (s.clase === 'fachada') ins[toca] = Math.max(ins[toca], 0.17); else if (s.clase === 'tabique') ins[toca] = Math.max(ins[toca], 0.07);
    if (s.clase === 'abierto' && (s.a?.id === e.id || s.b?.id === e.id)) { const u0 = s.o === 'h' ? s.x1 - e.x : s.y1 - e.y; oc[toca].push({ u0, u1: u0 + s.len, ancho: s.len, abierto: true, alf: 0, top: 99 }); }
  }
  return { e, oc, ins, zonas: zs.filter((z) => interZona([e.x, e.y, e.w, e.h], z)) };
}
function espejarEntorno(en, mx, my) {
  const e = en.e; const oc = {}; const ins = {};
  for (const l of ['N', 'S', 'E', 'O']) {
    let nl = l; if (mx && !horiz(l)) nl = OP[l]; if (my && horiz(l)) nl = OP[l];
    const L = horiz(l) ? e.w : e.h; const inv = (horiz(l) && mx) || (!horiz(l) && my);
    oc[nl] = en.oc[l].map((q) => (inv ? Object.assign({}, q, { u0: L - q.u1, u1: L - q.u0 }) : q)); ins[nl] = en.ins[l];
  }
  const zonas = en.zonas.map((z) => { const [x, y, w, h] = z.r; const o = { r: [mx ? 2 * e.x + e.w - x - w : x, my ? 2 * e.y + e.h - y - h : y, w, h] }; if (z.c) { o.c = [mx ? 2 * e.x + e.w - z.c[0] : z.c[0], my ? 2 * e.y + e.h - z.c[1] : z.c[1]]; o.rad = z.rad; } return o; });
  return { e, oc, ins, zonas };
}
const reflejar = (it, e, mx, my) => { if (mx) it.x = r3(2 * e.x + e.w - it.x - it.w); if (my) it.y = r3(2 * e.y + e.h - it.y - it.h); return it; };
const reflejarGiro = (g, mx, my) => { let r = g; if (mx && (r === 90 || r === 270)) r = 360 - r; if (my && (r === 0 || r === 180)) r = (r + 180) % 360; return r; };

// ---------------------------------------------------------------------------------------------------------
// Sala: colocación de piezas sin choques (zonas de puertas, otras piezas, huecos de fachada a su altura)
// ---------------------------------------------------------------------------------------------------------
class Sala {
  constructor(en, modelo, pi) { this.en = en; this.e = en.e; this.modelo = modelo; this.pi = pi; this.res = []; this.piezas = []; this.n = 0; }
  ap(l) { // marco apoyado en el lado l: u a lo largo (desde la esquina N/O), d separación del muro terminado
    const e = this.e, I = this.en.ins; const hz = horiz(l); const L = hz ? e.w : e.h; const m = I[l];
    const s0 = hz ? I.O : I.N, s1 = hz ? I.E : I.S; const D = (hz ? e.h : e.w) - m - I[OP[l]];
    const rect = (u, d, w, h) => (l === 'N' ? [e.x + u, e.y + m + d, w, h] : l === 'S' ? [e.x + u, e.y + e.h - m - d - h, w, h] : l === 'O' ? [e.x + m + d, e.y + u, h, w] : [e.x + e.w - m - d - h, e.y + u, h, w]);
    return { L, D, u0: s0, u1: L - s1, rect, lado: l };
  }
  dentro(r) { const e = this.e, I = this.en.ins; return r[0] >= e.x + I.O - 1e-6 && r[1] >= e.y + I.N - 1e-6 && r[0] + r[2] <= e.x + e.w - I.E + 1e-6 && r[1] + r[3] <= e.y + e.h - I.S + 1e-6; }
  enZona(r) { const q = [r[0] - 0.02, r[1] - 0.02, r[2] + 0.04, r[3] + 0.04]; return this.en.zonas.some((z) => interZona(q, z)); }
  libre(r, m = 0.03) { return this.dentro(r) && !this.enZona(r) && !this.res.some((q) => solapa(r, q, m)); }
  reservar(r) { this.res.push(r); return r; }
  pon(rol, r, giro = 0, x = {}) {
    const p = { id: `${this.e.id}-${rol}-${++this.n}`, rol, x: r3(r[0]), y: r3(r[1]), w: r3(r[2]), h: r3(r[3]), giro, est: this.e.id };
    if (x.mat) p.mat = x.mat; this.piezas.push(p); if (x.reservar !== false) this.res.push(r); return p;
  }
  // ¿Hay hueco de fachada / lado abierto en el lado l entre u0 y u1 a esa altura?
  huecoEn(l, u0, u1, z0, alto) { return this.en.oc[l].some((q) => q.u0 - 0.06 < u1 && q.u1 + 0.06 > u0 && (q.abierto || (q.alf < z0 + alto - 1e-6 && q.top > z0))); }
  libres(l, d0, D, z0, alto, m = 0.03) { // tramos libres del lado l para una pieza de fondo D a d0 del muro
    const a = this.ap(l), e = this.e; const banda = a.rect(0, d0, a.L, D); const cortes = [];
    const proy = (r) => (horiz(l) ? [r[0] - e.x, r[0] + r[2] - e.x] : [r[1] - e.y, r[1] + r[3] - e.y]);
    const bp = [banda[0] - 0.02, banda[1] - 0.02, banda[2] + 0.04, banda[3] + 0.04]; // mismo margen que enZona
    for (const z of this.en.zonas) { const b = interZona(bp, z); if (b) { const [p0, p1] = proy([b[0], b[1], b[2] - b[0], b[3] - b[1]]); cortes.push([p0 - 0.025, p1 + 0.025]); } }
    for (const q of this.res) if (solapa(banda, q, m)) { const [p0, p1] = proy(q); cortes.push([p0 - m, p1 + m]); }
    if (d0 < 0.3) for (const q of this.en.oc[l]) if (q.abierto || (q.alf < z0 + alto - 1e-6 && q.top > z0)) cortes.push([q.u0 - 0.06, q.u1 + 0.06]);
    cortes.sort((p, q) => p[0] - q[0]);
    const out = []; let u = a.u0;
    for (const [c0, c1] of cortes) { if (c0 > u) out.push([u, Math.min(c0, a.u1)]); u = Math.max(u, c1); }
    if (a.u1 > u) out.push([u, a.u1]);
    return out.filter((t) => t[1] - t[0] > 0.05);
  }
  maxLibre(l, D, z0, alto) { return Math.max(0, ...this.libres(l, 0, D, z0, alto).map((t) => t[1] - t[0])); }
  // Coloca una pieza de largo len (o menos, hasta o.min) contra el lado l.
  colocar(rol, l, len, D, o = {}) {
    const a = this.ap(l); const d0 = o.d0 || 0, hg = o.holgura || 0, min = o.min ?? len;
    if (a.D < D + d0 + (o.paso ?? 0.5) - 1e-6) return null;
    let best = null;
    for (const [t0, t1] of this.libres(l, d0, D, o.z0 || 0, o.alto ?? 1, o.m ?? 0.03)) {
      const av = t1 - t0 - 2 * hg; if (av < min - 1e-6) continue; const ln = Math.min(len, av);
      const lo = t0 + hg, hi = t1 - hg - ln;
      const c = o.pref === 'ini' ? lo + ln / 2 : o.pref === 'fin' ? hi + ln / 2 : typeof o.pref === 'number' ? o.pref : a.L / 2;
      const u = Math.max(lo, Math.min(hi, c - ln / 2)); const sc = ln * 2 - Math.abs(u + ln / 2 - c);
      if (!best || sc > best.sc) best = { sc, u, ln };
    }
    if (!best) return null;
    const r = a.rect(best.u, d0, best.ln, D); if (!this.libre(r, o.m ?? 0.03)) return null;
    const p = this.pon(rol, r, GIRO[l], o); p._u = best.u; p._l = l; return p;
  }
  // Busca sitio libre para una pieza exenta (mesa, isla…) cerca de un punto.
  buscar(rol, L, D, o = {}) {
    const e = this.e; const giros = o.giros || [0, 90]; const paso = Math.max(0.1, Math.min(0.25, Math.max(e.w, e.h) / 32)); const hg = o.holgura ?? 0.3;
    const [tx, ty] = o.cerca || [e.x + e.w / 2, e.y + e.h / 2]; let best = null;
    for (const g of giros) {
      const w = g % 180 ? D : L, h = g % 180 ? L : D;
      for (let x = e.x; x + w <= e.x + e.w + 1e-6; x += paso) for (let y = e.y; y + h <= e.y + e.h + 1e-6; y += paso) {
        const r = [x, y, w, h];
        if (!this.dentro(r) || this.enZona(r) || this.res.some((q) => solapa(r, q, hg))) continue;
        const sc = -Math.hypot(x + w / 2 - tx, y + h / 2 - ty) + (o.bonus ? o.bonus(r, g) : 0);
        if (!best || sc > best.sc) best = { sc, r, g };
      }
    }
    return best ? this.pon(rol, best.r, best.g, o) : null;
  }
  mejorLado(D, minL, pref = ['N', 'O', 'E', 'S'], z0 = 0, alto = 1.2) {
    let best = null;
    pref.forEach((l, i) => { const lib = this.maxLibre(l, D, z0, alto); const sinH = !this.en.oc[l].length; const sc = (lib >= minL ? 10 : 0) + (sinH ? 3 : 0) - i * 0.5 + lib * 0.2; if (!best || sc > best.sc) best = { sc, l }; });
    return best.l;
  }
}

// ---------------------------------------------------------------------------------------------------------
// Constructores de piezas: emiten primitivas en el marco local de la pieza (u a lo largo del respaldo, v fondo)
// ---------------------------------------------------------------------------------------------------------
function expandir(pz, en, out) {
  const { x, y, w, h } = pz; const g = giroN(pz.giro); const gi = g === 90 || g === 270; const L = gi ? h : w, D = gi ? w : h;
  const pt = (u, v) => (g === 0 ? [x + u, y + v] : g === 90 ? [x + w - v, y + u] : g === 180 ? [x + w - u, y + h - v] : [x + v, y + h - u]);
  const R = (u0, v0, lu, lv) => { const [ax, ay] = pt(u0, v0), [bx, by] = pt(u0 + lu, v0 + lv); return [Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)]; };
  const P = (rol, r, z0, alto, mat, ex) => out.push(Object.assign({ id: pz.id, rol, x: r3(r[0]), y: r3(r[1]), w: r3(r[2]), h: r3(r[3]), z0: r3(z0), alto: r3(alto), forma: 'caja', mat, est: pz.est, pieza: pz.rol }, ex));
  const C = (rol, u, v, rad, z0, alto, mat, ex) => { const [cx, cy] = pt(u, v); P(rol, [cx - rad, cy - rad, 2 * rad, 2 * rad], z0, alto, mat, Object.assign({ forma: 'cilindro' }, ex)); };
  // huecos del muro de respaldo, en u local (solo si la pieza está pegada a ese muro)
  const e = en?.e; const lado = LADO_G[g];
  const pegado = !!e && ({ N: y - e.y, S: e.y + e.h - (y + h), O: x - e.x, E: e.x + e.w - (x + w) }[lado] < (en.ins[lado] || 0) + 0.3);
  const loc = (au) => (g === 0 ? au - (x - e.x) : g === 180 ? x + w - e.x - au : g === 90 ? au - (y - e.y) : y + h - e.y - au);
  const cortes = (z0, alto) => (!pegado ? [] : en.oc[lado].filter((q) => q.abierto || (q.alf < z0 + alto - 1e-6 && q.top > z0)).map((q) => { const a = loc(q.u0), b = loc(q.u1); return [Math.min(a, b) - 0.08, Math.max(a, b) + 0.08]; }));
  const bloq = (u0, u1, z0, alto) => cortes(z0, alto).some(([a, b]) => a < u1 && b > u0);
  const libres = (u0, u1, z0, alto) => { if (!pegado) return []; const cs = cortes(z0, alto).sort((p, q) => p[0] - q[0]); const o = []; let u = u0; for (const [a, b] of cs) { if (a > u) o.push([u, Math.min(a, u1)]); u = Math.max(u, b); } if (u1 > u) o.push([u, u1]); return o.filter((t) => t[1] - t[0] > 0.05); };
  // ¿el canto u (0 o L) de la pieza toca un muro de la estancia?
  const pared = (u) => { if (!e) return true; const [px, py] = pt(u, D / 2); return px < e.x + (en.ins.O || 0) + 0.06 || px > e.x + e.w - (en.ins.E || 0) - 0.06 || py < e.y + (en.ins.N || 0) + 0.06 || py > e.y + e.h - (en.ins.S || 0) - 0.06; };
  const k = { L, D, R, P, C, pt, ejeU: gi ? 'y' : 'x', ejeV: gi ? 'x' : 'y', bloq, libres, pared, mat: pz.mat, pz };
  const f = CONS[pz.rol];
  if (f) f(k); else P(pz.rol, R(0, 0, L, D), pz.z0 || 0, pz.alto || 0.75, pz.mat || 'roble', pz.forma && pz.forma !== 'caja' ? { forma: pz.forma } : {});
}

const silla = (k, cu, lejos, mt) => { // silla de 0,42 centrada en cu; respaldo hacia fuera de la mesa
  const { R, P, D } = k; const v0 = lejos ? D - 0.44 : 0.02, s0 = cu - 0.21;
  P('silla', R(s0 + 0.02, v0 + 0.02, 0.38, 0.38), 0.43, 0.04, mt);
  for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) P('silla', R(s0 + 0.03 + fx * 0.33, v0 + 0.03 + fy * 0.33, 0.03, 0.03), 0, 0.43, mt);
  P('silla', lejos ? R(s0 + 0.02, v0 + 0.365, 0.38, 0.035) : R(s0 + 0.02, v0 + 0.02, 0.38, 0.035), 0.47, 0.38, mt);
};
const colgantes = (k, z, n) => { const { L, D, C } = k; const us = n === 1 ? [L / 2] : [L * 0.3, L * 0.7]; for (const u of us) { C('lampara', u, D / 2, 0.13, z, 0.2, 'lampara', { luz: true }); C('cable', u, D / 2, 0.006, z + 0.2, Math.max(0.05, TECHO - z - 0.2), 'negro'); } };
const sofaK = (k, bajo) => {
  const { L, D, R, P } = k; const mt = bajo ? 'telaExt' : 'tela'; const zs = bajo ? 0.06 : 0.08, hs = bajo ? 0.24 : 0.34, zb = zs + hs;
  P('sofa', R(0, 0, L, D), zs, hs, mt, { redondeo: 0.04 }); P('sofa', R(0.05, 0.05, L - 0.1, D - 0.1), 0, zs, bajo ? 'teca' : 'negro');
  P('sofa', R(0, 0, L, 0.24), zb, bajo ? 0.32 : 0.42, mt, { redondeo: 0.07 });
  P('sofa', R(0, 0.2, 0.2, D - 0.2), zb, 0.2, mt, { redondeo: 0.06 }); P('sofa', R(L - 0.2, 0.2, 0.2, D - 0.2), zb, 0.2, mt, { redondeo: 0.06 });
  const nc = L >= 2.0 ? 2 : 1; for (let i = 0; i < nc; i++) P('cojin', R(0.3 + i * (L - 1.05), 0.2, 0.45, 0.16), zb + 0.03, bajo ? 0.36 : 0.42, i ? 'lino' : 'manta', { redondeo: 0.07 });
};
const mesaK = (k, tipo) => { // tipo: int | ext | muta | larga
  const { L, D, R, P } = k; const ext = tipo === 'ext' || tipo === 'larga'; const mt = ext ? 'teca' : 'roble';
  const td = Math.max(0.6, D - 0.92), v0 = (D - td) / 2;
  if (tipo === 'muta') {
    const nu = Math.max(1, Math.round(L / 0.6)), nv = Math.max(1, Math.round(td / 0.5)), tu = L / nu, tv = td / nv;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) P('mesa', R(i * tu + 0.004, v0 + j * tv + 0.004, tu - 0.008, tv - 0.008), 0.72, 0.04, k.mat || ((i + j) % 2 ? 'piedra' : 'roble'));
    for (const f of [0.18, 0.82]) P('mesa', R(L * f - 0.07, v0 + td * 0.25, 0.14, td * 0.5), 0, 0.72, 'negro');
  } else {
    P('mesa', R(0, v0, L, td), 0.72, 0.04, mt);
    for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) P('mesa', R(0.06 + fx * (L - 0.17), v0 + 0.06 + fy * (td - 0.17), 0.05, 0.05), 0, 0.72, mt);
  }
  if (tipo === 'larga') { for (const v of [0.02, D - 0.38]) { P('banco', R(0.1, v, L - 0.2, 0.36), 0.42, 0.05, 'teca'); for (const f of [0.15, L - 0.25]) P('banco', R(f, v + 0.05, 0.1, 0.26), 0, 0.42, 'teca'); } }
  else { const n = Math.max(1, Math.floor(L / 0.6)); for (let i = 0; i < n; i++) { const cu = (i + 0.5) * (L / n); silla(k, cu, false, mt); silla(k, cu, true, mt); } }
  if (!ext) { k.C('lampara', L / 2, D / 2, 0.2, 1.62, 0.22, 'lampara', { luz: true }); k.C('cable', L / 2, D / 2, 0.006, 1.84, TECHO - 1.84, 'negro'); }
};
const estanteK = (k, mt, zs) => { const { L, D, R, P } = k; for (const z of zs) P('estante', R(0, 0, L, D), z, 0.025, mt); P('estante', R(0, 0, 0.025, D), 0, zs[zs.length - 1] + 0.05, mt); P('estante', R(L - 0.025, 0, 0.025, D), 0, zs[zs.length - 1] + 0.05, mt); };
const plantaK = (k, s) => { const { L, D, C, P, R } = k; s = s || Math.min(L, D) / 0.6; C('maceta', L / 2, D / 2, 0.2 * s, 0, 0.42 * s, 'barro'); P('planta', R(L / 2 - 0.36 * s, D / 2 - 0.36 * s, 0.72 * s, 0.72 * s), 0.36 * s, 0.85 * s, 'hoja', { forma: 'esfera' }); };
const isla = (k, muta) => {
  const { L, D, R, P } = k;
  P('isla', R(0.05, 0.05, L - 0.1, D - 0.1), 0, 0.1, 'negro'); P('isla', R(0, 0, L, D), 0.1, 0.76, muta ? 'lacado' : 'roble');
  if (muta) { const n = Math.max(1, Math.round(L / 0.6)), tu = L / n; for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) P('encimera', R(i * tu + 0.004, j * D / 2 + 0.004, tu - 0.008, D / 2 - 0.008), 0.86, 0.04, i === 1 && j === 0 ? 'negro' : 'piedra'); if (n > 2) P('fregadero', R(tu * (n - 1) + 0.08, D / 2 + 0.1, tu - 0.16, D / 2 - 0.2), 0.9, 0.006, 'acero'); }
  else P('encimera', R(-0.02, -0.02, L + 0.04, D + 0.04), 0.86, 0.04, 'piedra');
  colgantes(k, 1.7, L >= 1.4 ? 2 : 1);
};

const CONS = {
  cama: (k) => {
    const { L, D, R, P } = k; const bw = Math.max(0.7, L - 0.3), bl = Math.max(1.6, D - 0.07); const ppal = bw >= 1.5;
    P('cabecero', R(0, 0, L, 0.07), 0, ppal ? 1.15 : 0.95, ppal ? 'tela' : 'roble', ppal ? { redondeo: 0.02 } : {});
    P('cama', R(0.15, 0.07, bw, bl), 0.06, 0.24, 'roble'); P('cama', R(0.23, 0.15, bw - 0.16, bl - 0.16), 0, 0.06, 'negro');
    P('colchon', R(0.17, 0.09, bw - 0.04, bl - 0.04), 0.3, 0.2, 'lino', { redondeo: 0.05 });
    P('plaid', R(0.125, 0.07 + bl * 0.64, bw + 0.05, bl * 0.32), 0.47, 0.05, 'manta', { redondeo: 0.025 });
    const np = bw > 1.2 ? 2 : 1, pw = (bw - 0.2 - (np - 1) * 0.06) / np;
    for (let i = 0; i < np; i++) P('almohada', R(0.25 + i * (pw + 0.06), 0.14, pw, 0.42), 0.48, 0.14, 'lino', { redondeo: 0.06 });
  },
  mesilla: (k) => { const { L, D, R, P, C } = k; P('mesilla', R(0, 0, L, D), 0.12, 0.38, 'roble'); P('mesilla', R(0.05, 0.05, L - 0.1, D - 0.1), 0, 0.12, 'negro'); C('lampara', L / 2, D / 2, 0.03, 0.5, 0.22, 'cromo'); C('lampara', L / 2, D / 2, 0.12, 0.66, 0.2, 'lampara', { luz: true }); },
  armario: (k) => {
    const { L, D, R, P } = k; const mt = k.mat || 'lacado'; P('armario', R(0, 0, L, D - 0.014), 0, 2.4, mt);
    const n = Math.max(1, Math.round(L / 0.55)), pw = L / n; for (let i = 0; i < n; i++) P('armario', R(i * pw + 0.003, D - 0.014, pw - 0.006, 0.012), 0.05, 2.32, mt);
  },
  comoda: (k) => { const { L, D, R, P } = k; P('comoda', R(0, 0, L, D), 0.08, 0.72, 'roble'); P('comoda', R(0.05, 0.05, L - 0.1, D - 0.1), 0, 0.08, 'negro'); },
  alfombra: (k) => k.P('alfombra', k.R(0, 0, k.L, k.D), 0, 0.012, k.mat || 'alfombra'),
  sofa: (k) => sofaK(k, false),
  sofa_bajo: (k) => sofaK(k, true),
  sillon: (k) => sofaK(k, false),
  mesa_centro: (k) => { const { L, D, R, P } = k; P('mesa centro', R(0, 0, L, D), 0.06, 0.32, 'roble'); P('mesa centro', R(0.08, 0.08, L - 0.16, D - 0.16), 0, 0.06, 'negro'); },
  mesa_baja: (k) => { const { L, D, R, P } = k; P('mesa centro', R(0, 0, L, D), 0.3, 0.05, 'teca'); P('mesa centro', R(0.06, 0.06, L - 0.12, D - 0.12), 0, 0.3, 'hormigon'); },
  mueble_tv: (k) => { const { L, D, R, P } = k; P('mueble tv', R(0, 0, L, D), 0.22, 0.4, 'lacado'); const tw = Math.min(1.24, L); P('tv', R(L / 2 - tw / 2, 0.03, tw, 0.04), 0.95, tw * 0.58, 'negro'); },
  planta: (k) => plantaK(k),
  mesa_comedor: (k) => mesaK(k, 'int'),
  mesa_exterior: (k) => mesaK(k, 'ext'),
  mesa_muta: (k) => mesaK(k, 'muta'),
  mesa_larga: (k) => mesaK(k, 'larga'),
  silla: (k) => { const { L, D } = k; const kk = Object.assign({}, k, { D }); silla(kk, L / 2, false, 'roble'); },
  taburete: (k) => { const { L, D, C } = k; const r = Math.min(L, D) / 2; C('taburete', L / 2, D / 2, r, 0.62, 0.04, 'roble'); C('taburete', L / 2, D / 2, 0.025, 0, 0.62, 'negro'); },
  isla: (k) => isla(k, false),
  isla_muta: (k) => isla(k, true),
  cocina: (k) => {
    const { L, R, P, C, bloq } = k; let col = 0, ini = false;
    if (L >= 3.0) { if (!bloq(L - 0.62, L, 0, 2.2)) col = 0.62; else if (!bloq(0, 0.62, 0, 2.2)) { col = 0.62; ini = true; } }
    const u0 = ini ? col : 0, lb = L - col;
    if (col) P('columna', R(ini ? 0 : L - 0.6, 0, 0.6, 0.62), 0, 2.2, 'lacado');
    P('zocalo', R(u0, 0.06, lb, 0.54), 0, 0.1, 'negro'); P('mueble bajo', R(u0, 0, lb, 0.6), 0.1, 0.76, 'roble'); P('encimera', R(u0 - 0.01, 0, lb + 0.01, 0.63), 0.86, 0.04, 'piedra');
    const fu = u0 + Math.max(0.1, lb * 0.22);
    if (lb >= 1.3) { P('fregadero', R(fu, 0.1, 0.5, 0.4), 0.9, 0.006, 'acero'); C('grifo', fu + 0.25, 0.06, 0.018, 0.9, 0.3, 'cromo'); }
    if (lb >= 1.9) P('placa', R(u0 + lb * 0.62, 0.06, Math.min(0.6, lb * 0.3), 0.5), 0.9, 0.008, 'negro');
    for (const [s0, s1] of k.libres(u0, u0 + lb, 1.45, 0.75)) if (s1 - s0 >= 0.55) P('mueble alto', R(s0, 0, s1 - s0, 0.35), 1.48, 0.72, 'lacado');
  },
  lavabo: (k) => {
    const { L, D, R, P, C } = k; const n = L >= 1.1 ? 2 : 1;
    P('mueble lavabo', R(0, 0, L, D), 0.42, 0.4, 'roble');
    for (let i = 0; i < n; i++) { const cu = (i + 0.5) * (L / n); P('lavabo', R(cu - 0.28, 0.02, 0.56, D - 0.04), 0.82, 0.06, 'ceramica', { redondeo: 0.02 }); C('grifo', cu, 0.05, 0.015, 0.88, 0.2, 'cromo'); }
    if (!k.bloq(0.04, L - 0.04, 1.1, 0.78)) P('espejo', R(0.04, -0.03, L - 0.08, 0.025), 1.1, 0.78, 'espejo');
  },
  inodoro: (k) => { const { L, D, R, P } = k; P('inodoro', R(0.01, 0.18, L - 0.02, D - 0.19), 0, 0.4, 'ceramica', { redondeo: 0.1 }); P('inodoro', R(0.01, 0, L - 0.02, 0.18), 0.2, 0.62, 'ceramica', { redondeo: 0.03 }); },
  ducha: (k) => {
    const { L, D, R, P, C, pared } = k; P('plato ducha', R(0, 0, L, D), 0, 0.04, 'ceramica');
    const p0 = pared(0), p1 = pared(L);
    if (p0 && p1) P('mampara', R(0, D - 0.01, L * 0.62, 0.01), 0.04, 1.96, 'vidrio');
    else if (p0) P('mampara', R(0, D - 0.01, L * 0.62, 0.01), 0.04, 1.96, 'vidrio');
    else P('mampara', R(L * 0.38, D - 0.01, L * 0.62, 0.01), 0.04, 1.96, 'vidrio');
    if (!p0) P('mampara', R(0, 0, 0.01, D), 0.04, 1.96, 'vidrio'); if (!p1) P('mampara', R(L - 0.01, 0, 0.01, D), 0.04, 1.96, 'vidrio');
    C('rociador', L / 2, D / 2, 0.12, 2.05, 0.012, 'cromo'); C('rociador', L / 2, 0.02, 0.012, 2.05, 0.012, 'cromo');
  },
  banera: (k) => { const { L, D, R, P } = k; P('banera', R(0, 0, L, D), 0, 0.55, 'ceramica', { redondeo: 0.05 }); P('banera', R(0.08, 0.08, L - 0.16, D - 0.16), 0.4, 0.152, 'agua'); },
  toallero: (k) => k.P('toallero', k.R(0, 0, k.L, k.D), 1.0, 0.7, 'cromo'),
  escritorio: (k) => {
    const { L, R, P, C } = k; const dw = L;
    P('escritorio', R(0, 0, dw, 0.7), 0.72, 0.035, k.mat || 'roble'); for (const s of [0, 1]) P('escritorio', R(0.05 + s * (dw - 0.13), 0.05, 0.03, 0.6), 0, 0.72, 'negro');
    P('pantalla', R(L / 2 - 0.3, 0.12, 0.6, 0.03), 0.9, 0.38, 'negro');
    const sv = 1.05; C('silla', L / 2, sv, 0.26, 0.45, 0.07, 'negro'); C('silla', L / 2, sv, 0.03, 0.08, 0.37, 'cromo'); C('silla', L / 2, sv, 0.3, 0, 0.06, 'negro');
    P('silla', R(L / 2 - 0.23, sv + 0.22, 0.46, 0.05), 0.52, 0.45, 'negro', { redondeo: 0.02 });
  },
  libreria: (k) => {
    const { L, D, R, P } = k; P('libreria', R(0, 0, 0.03, D), 0, 2.0, 'roble'); P('libreria', R(L - 0.03, 0, 0.03, D), 0, 2.0, 'roble');
    for (const z of [0, 0.5, 1.0, 1.5, 1.97]) P('libreria', R(0, 0, L, D), z, 0.03, 'roble');
    for (let i = 0; i < Math.floor(L / 0.35); i++) P('libros', R(0.08 + i * 0.33, 0.05, 0.22, Math.min(0.24, D - 0.08)), 0.53 + (i % 3) * 0.5, 0.25, i % 2 ? 'manta' : 'lino');
  },
  lavadora: (k) => { const { L, D, R, P, ejeV } = k; P('lavadora', R(0, 0, L, D), 0, 0.85, 'lacado'); P('lavadora', R(L / 2 - 0.2, D, 0.4, 0.03), 0.25, 0.4, 'cristalCoche', { forma: 'cilindro', eje: ejeV }); },
  secadora: (k) => { const { L, D, R, P, ejeV } = k; P('secadora', R(0, 0, L, D), 0, 0.85, 'lacado'); P('secadora', R(L / 2 - 0.2, D, 0.4, 0.03), 0.25, 0.4, 'cristalCoche', { forma: 'cilindro', eje: ejeV }); },
  encimera: (k) => k.P('encimera', k.R(0, 0, k.L, k.D), 0.86, 0.04, 'piedra'),
  mueble_alto: (k) => k.P('mueble alto', k.R(0, 0, k.L, k.D), 1.5, 0.7, 'lacado'),
  estanteria: (k) => estanteK(k, k.mat || 'acero', [0.15, 0.6, 1.05, 1.5, 1.95]),
  acumulador: (k) => k.C('acumulador', k.L / 2, k.D / 2, Math.min(k.L, k.D) / 2 - 0.02, 0, 1.85, 'lacado'),
  cuadro: (k) => k.P('cuadro', k.R(0, 0, k.L, k.D), 1.2, 0.7, 'lacado'),
  banco: (k) => { const { L, D, R, P } = k; P('banco', R(0, 0, L, D), 0.1, 0.36, 'roble'); P('banco', R(0.06, 0.06, L - 0.12, D - 0.12), 0, 0.1, 'negro'); if (!k.bloq(L / 2 - 0.3, L / 2 + 0.3, 0.9, 1.0)) P('espejo', R(L / 2 - 0.3, -0.04, 0.6, 0.02), 0.9, 1.0, 'espejo'); },
  consola: (k) => { const { L, D, R, P } = k; P('consola', R(0, 0, L, D), 0.7, 0.04, 'roble'); P('consola', R(0.04, 0.04, 0.03, D - 0.08), 0, 0.7, 'negro'); P('consola', R(L - 0.07, 0.04, 0.03, D - 0.08), 0, 0.7, 'negro'); },
  isla_vestidor: (k) => { const { L, D, R, P } = k; P('isla vestidor', R(0, 0, L, D), 0, 0.9, 'roble'); P('isla vestidor', R(-0.02, -0.02, L + 0.04, D + 0.04), 0.9, 0.03, 'piedra'); },
  coche: (k) => { // L ancho del coche (a lo largo del muro), D largo (morro hacia el muro)
    const { L, D, R, P, C, ejeU } = k; const mat = k.mat || 'coche';
    const Rc = (a0, u0, la, lu) => R(a0, u0, la, lu); // a: ancho, u: largo
    P('coche', Rc(0.04, 0.05, L - 0.08, D - 0.1), 0.28, 0.5, mat, { redondeo: 0.14 });
    P('coche', Rc(0.12, D * 0.28, L - 0.24, D * 0.47), 0.72, 0.5, 'cristalCoche', { redondeo: 0.16 });
    P('coche', Rc(0.1, D * 0.33, L - 0.2, D * 0.36), 1.16, 0.08, mat, { redondeo: 0.04 });
    for (const v of [0.85, D - 0.85]) for (const a of [0.13, L - 0.13]) P('rueda', R(a - 0.11, v - 0.33, 0.22, 0.66), 0, 0.66, 'neumatico', { forma: 'cilindro', eje: ejeU });
  },
  arbol: (k) => {
    const { L, C, P, R } = k; const cx = L / 2, cy = k.D / 2; const rr = Math.min(1.1, L / 2.55), hA = Math.min(4.2, 2.4 + L * 0.41), dc = L;
    C('alcorque', cx, cy, rr, 0, 0.35, 'hormigon'); C('tierra', cx, cy, rr - 0.06, 0.3, 0.06, 'tierra'); C('tronco', cx, cy, 0.09, 0.3, hA * 0.55, 'corteza');
    P('copa', R(cx - dc / 2, cy - dc / 2, dc, dc), hA * 0.42, hA * 0.6, 'hoja', { forma: 'esfera' });
    P('copa', R(cx - dc * 0.35 + 0.2, cy - dc * 0.3, dc * 0.62, dc * 0.62), hA * 0.62, hA * 0.38, 'hoja', { forma: 'esfera' });
  },
  arbusto: (k) => k.P('arbusto', k.R(0, 0, k.L, k.D), 0, Math.min(k.L, k.D) * 0.95, 'hoja', { forma: 'esfera' }),
  macetero: (k) => { const { L, D, R, P } = k; P('macetero', R(0, 0, L, D), 0, 0.5, 'hormigon'); P('planta', R(L / 2 - 0.33 * L / 0.5, D / 2 - 0.33 * D / 0.5, 0.66 * L / 0.5, 0.66 * D / 0.5), 0.38, 0.8, 'hoja', { forma: 'esfera' }); },
  tumbona: (k) => { const { L, D, R, P } = k; P('tumbona', R(0, 0, L, D), 0.12, 0.14, 'telaExt', { redondeo: 0.05 }); P('tumbona', R(0.05, 0.05, L - 0.1, D - 0.1), 0, 0.12, 'teca'); P('tumbona', R(0, 0, L, 0.55), 0.26, 0.3, 'telaExt', { redondeo: 0.06 }); },
  parasol: (k) => { // parasol de brazo: mástil en la esquina (0,25; 0,25), lona centrada en la huella
    const { L, D, R, P, C } = k; C('parasol', 0.25, 0.25, 0.22, 0, 0.06, 'hormigon'); C('parasol', 0.25, 0.25, 0.035, 0.06, 2.55, 'acero');
    P('parasol', R(0.25, 0.22, L / 2 - 0.25, 0.06), 2.5, 0.05, 'acero'); C('lona', L / 2, D / 2, Math.min(L, D) / 2, 2.32, 0.18, 'telaExt'); C('lona', L / 2, D / 2, 0.06, 2.25, 0.3, 'acero');
  },
  barbacoa: (k) => { // obra de fábrica, parrilla con brasas y campana con chimenea
    const { L, D, R, P, C } = k;
    P('barbacoa', R(0, 0, L, D), 0, 0.86, 'hormigon'); P('encimera', R(-0.02, -0.02, L + 0.04, D + 0.04), 0.86, 0.04, 'piedra');
    const gu = L * 0.12, gl = Math.min(0.9, L * 0.6); P('brasas', R(gu, 0.1, gl, D - 0.25), 0.9, 0.02, 'brasas', { fuego: true }); P('parrilla', R(gu - 0.02, 0.08, gl + 0.04, D - 0.21), 0.97, 0.008, 'negro');
    P('campana', R(gu - 0.08, 0, gl + 0.16, Math.min(0.55, D)), 1.75, 0.45, 'hormigon'); C('chimenea', gu + gl / 2, 0.18, 0.12, 2.2, 0.75, 'acero');
  },
  encimera_exterior: (k) => { const { L, D, R, P, C } = k; P('mueble bajo', R(0, 0, L, D), 0, 0.86, 'hormigon'); P('encimera', R(-0.02, -0.02, L + 0.04, D + 0.04), 0.86, 0.04, 'piedra'); if (L >= 1.0) { P('fregadero', R(L * 0.3, 0.12, 0.45, 0.38), 0.9, 0.006, 'acero'); C('grifo', L * 0.3 + 0.22, 0.06, 0.018, 0.9, 0.3, 'cromo'); } },
  fogon: (k) => { // pozo de fuego de piedra con brasas y leña
    const { L, D, C, P, R, ejeU } = k; const r = Math.min(L, D) / 2;
    C('fogon', L / 2, D / 2, r, 0, 0.36, 'piedra'); C('brasas', L / 2, D / 2, r - 0.12, 0.36, 0.03, 'brasas', { fuego: true });
    for (const s of [-1, 1]) P('lena', R(L / 2 - r * 0.45, D / 2 + s * 0.07 - 0.05, r * 0.9, 0.1), 0.38, 0.1, 'corteza', { forma: 'cilindro', eje: ejeU });
  },
  puf: (k) => { const { L, D, C } = k; C('puf', L / 2, D / 2, Math.min(L, D) / 2, 0, 0.42, 'telaExt'); },
  banco_exterior: (k) => { const { L, D, R, P } = k; P('banco', R(0, 0, L, D), 0.4, 0.06, 'teca'); for (const f of [0.1, L - 0.2]) P('banco', R(f, 0.04, 0.1, D - 0.08), 0, 0.4, 'hormigon'); },
  pliega_cama: (k) => { // cartucho «Habitar»: cama abatible plegada en el tabique
    const { L, D, R, P } = k; P('pliega', R(0, 0, L, D - 0.02), 0, 2.4, 'lacado');
    const bw = Math.min(1.6, L - 0.3), u0 = (L - bw) / 2; P('pliega', R(u0, D - 0.02, bw, 0.015), 0.25, 2.0, 'roble'); P('pliega', R(u0 + bw / 2 - 0.3, D - 0.006, 0.6, 0.008), 1.98, 0.03, 'cromo');
    P('pliega', R(0.02, D - 0.02, u0 - 0.04, 0.015), 0.05, 2.3, 'lacado'); P('pliega', R(u0 + bw + 0.02, D - 0.02, L - u0 - bw - 0.04, 0.015), 0.05, 2.3, 'lacado');
  },
  pliega_escritorio: (k) => { // cartucho «Trabajar»: baldas y tablero abatido a 0,74
    const { L, D, R, P } = k; P('pliega', R(0, 0, L, 0.3), 0, 0.7, 'lacado'); P('pliega', R(0, 0, L, 0.3), 1.2, 1.05, 'lacado');
    for (const z of [1.55, 1.9]) P('estante', R(0.03, 0.02, L - 0.06, 0.28), z, 0.02, 'roble');
    const tw = Math.min(1.1, L - 0.1); P('escritorio', R((L - tw) / 2, 0, tw, Math.min(0.64, D)), 0.74, 0.03, 'roble'); P('lampara', R(0.05, 0.25, L - 0.1, 0.02), 1.18, 0.015, 'lampara', { luz: true });
  },
  pliega_armario: (k) => { const { L, D, R, P } = k; P('armario', R(0, 0, L, D), 0, 2.4, 'lacado'); for (const v of [-0.012, D]) { const n = Math.max(1, Math.round(L / 0.55)), pw = L / n; for (let i = 0; i < n; i++) P('armario', R(i * pw + 0.003, v, pw - 0.006, 0.012), 0.05, 2.32, 'roble'); } },
};
CONS.cama_individual = CONS.cama;

// Catálogo para la paleta del editor (w a lo largo del muro de apoyo, h fondo; medidas por defecto).
export const CATALOGO_MUEBLES = [
  ['cama', 'Cama doble 160', 1.9, 2.07, 1.15, 'dormir'], ['cama_individual', 'Cama individual 90', 1.2, 1.97, 0.95, 'dormir'], ['mesilla', 'Mesilla', 0.46, 0.4, 0.86, 'dormir'],
  ['armario', 'Armario', 1.8, 0.6, 2.4, 'dormir'], ['comoda', 'Cómoda', 1.2, 0.46, 0.8, 'dormir'], ['alfombra', 'Alfombra', 2.2, 1.6, 0.01, 'estar'],
  ['sofa', 'Sofá', 2.4, 0.95, 0.84, 'estar'], ['sillon', 'Sillón', 0.9, 0.9, 0.84, 'estar'], ['mesa_centro', 'Mesa de centro', 1.1, 0.6, 0.38, 'estar'], ['mueble_tv', 'Mueble de televisión', 1.8, 0.42, 1.67, 'estar'],
  ['planta', 'Planta en maceta', 0.6, 0.6, 1.2, 'estar'], ['mesa_comedor', 'Mesa de comedor con sillas', 1.8, 1.92, 0.9, 'comer'], ['silla', 'Silla', 0.46, 0.46, 0.85, 'comer'], ['taburete', 'Taburete', 0.36, 0.36, 0.66, 'comer'],
  ['cocina', 'Cocina lineal', 3.0, 0.62, 2.2, 'cocina'], ['isla', 'Isla de cocina', 1.8, 0.9, 0.9, 'cocina'], ['encimera', 'Encimera', 1.2, 0.62, 0.9, 'cocina'], ['mueble_alto', 'Mueble alto', 1.2, 0.35, 0.7, 'cocina'],
  ['lavabo', 'Lavabo con mueble', 0.6, 0.46, 1.88, 'bano'], ['inodoro', 'Inodoro', 0.4, 0.65, 0.82, 'bano'], ['ducha', 'Ducha', 1.2, 0.9, 2.06, 'bano'], ['banera', 'Bañera', 1.7, 0.75, 0.55, 'bano'], ['toallero', 'Toallero', 0.5, 0.06, 0.7, 'bano'],
  ['escritorio', 'Escritorio con silla', 1.6, 1.35, 1.3, 'trabajo'], ['libreria', 'Librería', 1.8, 0.36, 2.0, 'trabajo'],
  ['lavadora', 'Lavadora', 0.6, 0.6, 0.85, 'servicio'], ['secadora', 'Secadora', 0.6, 0.6, 0.85, 'servicio'], ['estanteria', 'Estantería', 1.2, 0.4, 2.0, 'servicio'], ['acumulador', 'Acumulador ACS', 0.6, 0.6, 1.85, 'servicio'],
  ['cuadro', 'Cuadro eléctrico', 0.5, 0.18, 0.7, 'servicio'], ['banco', 'Banco de recibidor', 1.2, 0.36, 1.9, 'estar'], ['consola', 'Consola', 1.2, 0.36, 0.74, 'estar'], ['isla_vestidor', 'Isla de vestidor', 1.2, 0.6, 0.93, 'dormir'],
  ['coche', 'Coche', 1.8, 4.4, 1.24, 'vehiculo'],
  ['pliega_cama', 'PLIEGA · cama abatible', 2.25, 0.45, 2.4, 'PLIEGA'], ['pliega_escritorio', 'PLIEGA · escritorio abatible', 1.5, 0.65, 2.25, 'PLIEGA'], ['pliega_armario', 'PLIEGA · armario pasante R600', 1.5, 0.6, 2.4, 'PLIEGA'],
  ['mesa_muta', 'MUTA · mesa Origen', 2.4, 1.92, 0.76, 'MUTA'], ['isla_muta', 'MUTA · isla', 2.4, 1.2, 0.9, 'MUTA'],
  ['mesa_exterior', 'Mesa exterior con sillas', 1.8, 1.82, 0.76, 'exterior'], ['tumbona', 'Tumbona · piscina', 0.65, 1.9, 0.56, 'exterior'], ['macetero', 'Macetero', 0.5, 0.5, 1.18, 'exterior'],
  ['sofa_bajo', 'Sofá bajo exterior', 2.2, 0.9, 0.62, 'exterior'], ['mesa_baja', 'Mesa baja exterior', 1.0, 1.0, 0.35, 'exterior'], ['parasol', 'Parasol de brazo', 2.6, 2.6, 2.6, 'exterior'],
  ['barbacoa', 'Barbacoa de obra', 1.5, 0.7, 2.95, 'exterior'], ['encimera_exterior', 'Encimera exterior', 1.5, 0.65, 0.9, 'exterior'], ['mesa_larga', 'Mesa larga con bancos', 2.4, 1.62, 0.76, 'exterior'],
  ['banco_exterior', 'Banco exterior', 1.6, 0.4, 0.46, 'exterior'], ['fogon', 'Fogonero · pozo de fuego', 1.0, 1.0, 0.4, 'exterior'], ['puf', 'Asiento de fogonero', 0.55, 0.55, 0.42, 'exterior'],
  ['arbol', 'Árbol en alcorque', 2.4, 2.4, 3.8, 'vegetacion'], ['arbusto', 'Arbusto', 0.64, 0.64, 0.6, 'vegetacion'],
].map(([rol, n, w, h, alto, cat]) => ({ rol, n, w, h, alto, forma: ['puf', 'fogon', 'acumulador', 'taburete'].includes(rol) ? 'cilindro' : ['arbusto'].includes(rol) ? 'esfera' : 'caja', cat }));

// ---------------------------------------------------------------------------------------------------------
// Amueblado automático por tipo de estancia (en el marco del entorno, reflejado o no)
// ---------------------------------------------------------------------------------------------------------
function esquinaConHueco(oc, e, cx, cy) {
  const near = (l, u) => oc[l].some((q) => q.u0 - 0.5 < u && q.u1 + 0.5 > u);
  const lx = cx - e.x < e.w / 2 ? 'O' : 'E', ly = cy - e.y < e.h / 2 ? 'N' : 'S';
  return near(ly, cx - e.x) || near(lx, cy - e.y);
}
function esquinas(S, rol, t, max = 1, conHueco = false) {
  const e = S.e, I = S.en.ins; let n = 0;
  for (const [cx, cy] of [[e.x + I.O + 0.08 + t / 2, e.y + I.N + 0.08 + t / 2], [e.x + e.w - I.E - 0.08 - t / 2, e.y + I.N + 0.08 + t / 2], [e.x + I.O + 0.08 + t / 2, e.y + e.h - I.S - 0.08 - t / 2], [e.x + e.w - I.E - 0.08 - t / 2, e.y + e.h - I.S - 0.08 - t / 2]]) {
    const r = [cx - t / 2, cy - t / 2, t, t]; if (!S.libre(r, 0.1) || (!conHueco && esquinaConHueco(S.en.oc, e, cx, cy))) continue;
    S.pon(rol, r, 0); if (++n >= max) break;
  }
}

function dormitorio(S) {
  const e = S.e, ppal = e.tipo === 'dormitorio_principal'; const corto = Math.min(e.w, e.h);
  const tam = ppal && corto >= 3 ? [1.6, 1.5, 0.9] : corto >= 2.9 ? [1.5, 0.9] : [0.9];
  let cama = null;
  // de lo ideal a lo posible: cama más corta y, en último caso, con el cabecero bajo una ventana
  for (const [bw, corta, rel] of [0, 1].flatMap((rl) => tam.flatMap((b) => [[b, 0, rl], [b, 1, rl], [b, 2, rl]]))) {
    let best = null; const L = bw + 0.3;
    for (const l of ['N', 'O', 'E', 'S']) {
      const a = S.ap(l); const bl = [a.D >= 2.7 ? 2.0 : Math.max(1.8, a.D - 0.6), 1.9, 1.8][corta]; const D = bl + 0.07; if (a.D < D + (rel ? 0.3 : 0.45)) continue;
      for (const [t0, t1] of S.libres(l, 0, D, 0, rel ? 0 : 0.7)) {
        if (t1 - t0 < L) continue; const c = a.L / 2; const u = Math.max(t0, Math.min(t1 - L, c - L / 2));
        const r = a.rect(u, 0, L, D); if (!S.libre(r)) continue;
        const pie = a.rect(u, D, L, Math.min(0.6, a.D - D)); const libPie = !S.enZona(pie);
        const sc = -Math.abs(u + L / 2 - c) * 0.6 + ((u - t0 >= 0.52) + (t1 - u - L >= 0.52)) * 0.7 + (S.huecoEn(l, u, u + L, 0, 2.0) ? -0.6 : 0.8) + (libPie ? 0.8 : -1.5) + (l === 'N' ? 0.2 : 0) - (S.en.oc[l].some((q) => q.puerta) ? 0.8 : 0);
        if (!best || sc > best.sc) best = { sc, l, u, D, bl, r };
      }
    }
    if (best) { cama = best; break; }
  }
  if (!cama) return;
  const { l, u, D, bl } = cama; const a = S.ap(l); const L = cama.r[l === 'N' || l === 'S' ? 2 : 3];
  S.pon(L < 1.5 ? 'cama_individual' : 'cama', cama.r, GIRO[l]);
  S.reservar(a.rect(u, D, L, Math.min(0.55, a.D - D)));
  for (const s of [-1, 1]) { const r = a.rect(s < 0 ? u - 0.52 : u + L + 0.06, 0.03, 0.46, 0.4); if (S.libre(r, 0.01)) S.pon('mesilla', r, GIRO[l]); }
  if (a.D >= D + 1.4) { const r = a.rect(u - 0.3, 0.07 + bl * 0.45, L + 0.6, bl * 0.55 + 0.55); if (S.dentro(r) && !S.enZona(r)) S.pon('alfombra', r, GIRO[l], { reservar: false }); }
  // armario: enfrente o en un lado contiguo; si no cabe, cómoda baja
  const op = OP[l]; const lados = [op, ...(horiz(l) ? ['O', 'E'] : ['N', 'S'])];
  let hecho = null;
  for (const lc of lados) { hecho = S.colocar('armario', lc, 2.15, 0.6, { alto: 2.4, min: 1.0, pref: lc === op ? undefined : 'fin', paso: 0.6 }); if (hecho) break; }
  if (!hecho) for (const lc of lados) { if (S.colocar('comoda', lc, 1.4, 0.46, { alto: 0.82, min: 0.9, paso: 0.6 })) break; }
}

function salon(S) {
  const e = S.e, area = e.w * e.h; const l = S.mejorLado(0.95, 2.4, ['O', 'E', 'N', 'S'], 0, 0.9); const a = S.ap(l);
  const sw = Math.min(2.4, a.L - 0.8);
  let sofa = S.colocar('sofa', l, sw, 0.95, { alto: 0.9, min: 1.6, pref: area >= 22 ? a.L * 0.3 : a.L / 2, paso: 1.2 });
  // si ningún muro ciego lo admite, delante del ventanal (respaldo bajo el vidrio)
  if (!sofa) for (const lc of ladosPorLibre(S, 0.95, 0, 0)) { sofa = S.colocar('sofa', lc, sw, 0.95, { z0: 0, alto: 0, min: 1.6, paso: 1.2 }); if (sofa) { return salonCon(S, sofa, lc, area); } }
  return salonCon(S, sofa, l, area);
}
function salonCon(S, sofa, l, area) {
  const e = S.e; const a = S.ap(l); const sw = Math.min(2.4, a.L - 0.8); void sw;
  let cu = a.L / 2;
  if (sofa) {
    const u = sofa._u, w = horiz(l) ? sofa.w : sofa.h; cu = u + w / 2;
    if (a.D > 2.4) { const rt = a.rect(cu - 0.55, 1.3, 1.1, 0.6); if (S.libre(rt)) S.pon('mesa_centro', rt, GIRO[l]); }
    const ra = a.rect(u - 0.25, 0.85, w + 0.5, Math.min(2.2, a.D - 0.9)); if (S.dentro(ra) && !S.enZona(ra)) S.pon('alfombra', ra, GIRO[l], { reservar: false });
    if (a.D >= 3.4) S.colocar('mueble_tv', OP[l], Math.min(1.8, w), 0.42, { alto: 1.6, min: 1.2, pref: cu, paso: 1.5 });
    S.reservar(a.rect(u, 0.95, w, Math.max(0.3, Math.min(2.4, a.D - 1.4)))); // la sala de estar queda libre
  }
  // salón-cocina: cocina en otro lado, en su tramo libre más largo, lejos del sofá
  const hayCocina = (S.modelo.plantas[S.pi]?.estancias || []).some((x) => x.tipo === 'cocina');
  if (/cocina/i.test(e.nombre || '') || (!hayCocina && area >= 24)) {
    let best = null;
    for (const lc of ['N', 'S', 'E', 'O']) {
      if (lc === l) continue; const b = S.ap(lc);
      for (const [t0, t1] of S.libres(lc, 0, 0.62, 0, 0.9)) {
        const len = Math.min(t1 - t0, 4.2); if (len < 1.8) continue;
        const sc = len + (lc === OP[l] ? 0.3 : 0) + (b.D >= 3.6 ? 0.4 : 0);
        if (!best || sc > best.sc) best = { sc, lc, len, t0, t1 };
      }
    }
    if (best) {
      const lejos = best.lc === OP[l] ? (cu < S.ap(best.lc).L / 2 ? 'fin' : 'ini') : (l === 'N' || l === 'O' ? 'fin' : 'ini');
      const coc = S.colocar('cocina', best.lc, best.len, 0.62, { alto: 0.9, min: 1.8, pref: lejos, paso: 1.0 });
      if (coc) {
        const b = S.ap(best.lc); const cl = horiz(best.lc) ? coc.w : coc.h;
        if (b.D >= 3.6 && cl >= 2.4) { const iw = Math.min(2.2, cl - 0.4); const r = b.rect(coc._u + (cl - iw) / 2, 1.65, iw, 0.95); if (S.libre(r, 0.5)) S.pon('isla', r, GIRO[best.lc]); }
      }
    }
  }
  if (area >= 20) S.buscar('mesa_comedor', area >= 30 ? 2.0 : 1.6, 1.92, { holgura: 0.35 });
  esquinas(S, 'planta', 0.6, 1);
}
function comedor(S) {
  const e = S.e; const largo = Math.max(e.w, e.h); const L = Math.min(2.4, Math.max(1.2, largo - 1.6));
  S.buscar('mesa_comedor', L, 1.92, { holgura: 0.3 }) || S.buscar('mesa_comedor', 1.2, 1.72, { holgura: 0.2 });
  if (e.w * e.h >= 9) esquinas(S, 'planta', 0.5, 1);
}
function cocina(S) {
  const e = S.e; const largo = Math.max(e.w, e.h);
  const l = S.mejorLado(0.62, 1.8, largo === e.w ? ['N', 'S', 'O', 'E'] : ['O', 'E', 'N', 'S'], 0, 0.9); const a = S.ap(l);
  const coc = S.colocar('cocina', l, a.L, 0.62, { alto: 0.9, min: 1.2, paso: 0.6 });
  if (!coc) { for (const lc of ['N', 'S', 'E', 'O']) if (S.colocar('cocina', lc, S.ap(lc).L, 0.62, { alto: 0.9, min: 1.2, paso: 0.3 })) break; return; }
  const cl = horiz(l) ? coc.w : coc.h;
  if (a.D >= 2.6 && a.L >= 2.6) {
    const iw = Math.min(1.8, a.L - 1.2); const r = a.rect((a.L - iw) / 2, 1.6, iw, 0.9);
    if (S.libre(r, 0.2)) {
      S.pon('isla', r, GIRO[l]);
      if (a.D >= 3.3) { const ns = Math.max(1, Math.floor(iw / 0.6)); for (let i = 0; i < ns; i++) { const rr = a.rect((a.L - iw) / 2 + (i + 0.5) * (iw / ns) - 0.18, 1.6 + 0.9 + 0.12, 0.36, 0.36); if (S.libre(rr, 0)) S.pon('taburete', rr, GIRO[l]); } }
      return;
    }
  }
  if (a.D >= 2.4 && largo >= 3) S.buscar('mesa_comedor', 1.2, 1.72, { holgura: 0.25 });
  void cl;
}
function bano(S) {
  const e = S.e, area = e.w * e.h; const conDucha = e.tipo === 'bano';
  const zc = S.en.zonas.length ? S.en.zonas.map((z) => [z[0] + z[2] / 2, z[1] + z[3] / 2]) : [];
  const lejos = (r) => (zc.length ? Math.min(...zc.map(([x, y]) => Math.hypot(r[0] + r[2] / 2 - x, r[1] + r[3] / 2 - y))) : 0);
  if (conDucha) {
    const banera = area >= 6.7; let best = null;
    for (const l of ['N', 'S', 'E', 'O']) {
      const a = S.ap(l);
      const tams = banera ? [[1.7, 0.75], [1.2, 0.9]] : [[Math.min(1.2, a.u1 - a.u0 - 0.05), 0.9], [0.9, 0.9], [0.8, 0.8]];
      for (const [w, d] of tams) {
        if (w < 0.75 || a.D < d + 0.55) continue;
        for (const fin of [false, true]) {
          const u = fin ? a.u1 - w : a.u0; const r = a.rect(u, 0, w, d); if (!S.libre(r, 0.01)) continue;
          const sc = lejos(r) * 1.5 + w + (S.huecoEn(l, u, u + w, 0, 1.6) ? -2 : 0) + (banera && w >= 1.7 ? 2 : 0);
          if (!best || sc > best.sc) best = { sc, r, l, w };
        }
      }
    }
    if (best) S.pon(best.w >= 1.6 ? 'banera' : 'ducha', best.r, GIRO[best.l]);
  }
  const orden = (D) => ['N', 'S', 'E', 'O'].map((l) => ({ l, lib: S.maxLibre(l, D, 0, 0.9), p: S.en.oc[l].some((q) => q.puerta) })).sort((a, b) => (a.p - b.p) || b.lib - a.lib).map((x) => x.l);
  const lav = Math.max(e.w, e.h) >= 3.7 && conDucha ? 1.2 : 0.6;
  for (const l of orden(0.46)) if (S.colocar('lavabo', l, lav, 0.46, { alto: 0.9, min: 0.6, holgura: 0.05, pref: 'ini', paso: 0.55 })) break;
  for (const l of orden(0.65)) if (S.colocar('inodoro', l, 0.4, 0.65, { alto: 0.8, holgura: 0.2, pref: 'fin', paso: 0.5 })) break;
  if (conDucha) for (const l of orden(0.06)) if (S.colocar('toallero', l, 0.5, 0.06, { z0: 0.95, alto: 0.8, paso: 0.6, m: 0.05 })) break;
}
function despacho(S) {
  const l = S.mejorLado(1.35, 1.6, ['N', 'O', 'E', 'S'], 0, 0.8); const a = S.ap(l);
  S.colocar('escritorio', l, Math.min(1.6, a.L - 0.4), 1.35, { alto: 0.8, min: 1.0, paso: 0.3 });
  for (const lc of [OP[l], ...(horiz(l) ? ['O', 'E'] : ['N', 'S'])]) if (S.colocar('libreria', lc, 1.8, 0.36, { alto: 2.0, min: 1.0, paso: 0.6 })) break;
}
// Lados ordenados por largo libre (para piezas de fondo D), los que tienen puerta al final.
const ladosPorLibre = (S, D, z0 = 0, alto = 1) => ['N', 'S', 'E', 'O'].map((l) => ({ l, lib: S.maxLibre(l, D, z0, alto), p: S.en.oc[l].some((q) => q.puerta) })).sort((a, b) => (a.p - b.p) || b.lib - a.lib).map((x) => x.l);
function vestidor(S) {
  const e = S.e; const corto = Math.min(e.w, e.h); let n = 0;
  for (const l of ladosPorLibre(S, 0.58, 0, 2.4)) {
    if (n >= 2) break; const a = S.ap(l); if (a.D < 0.58 + 0.6) continue;
    for (const [t0, t1] of S.libres(l, 0, 0.58, 0, 2.4)) if (t1 - t0 >= 0.6) { const r = a.rect(t0, 0, t1 - t0, 0.58); if (S.libre(r, -0.02)) { S.pon('armario', r, GIRO[l], { mat: 'roble' }); n++; } }
  }
  if (corto >= 2.25) { const r = [e.x + e.w / 2 - 0.6, e.y + e.h / 2 - 0.3, 1.2, 0.6]; if (S.libre(r, 0.3)) S.pon('isla_vestidor', r, e.w >= e.h ? 0 : 90); }
}
function lavadero(S) {
  for (const l of ladosPorLibre(S, 0.6, 0, 0.9)) {
    const p1 = S.colocar('lavadora', l, 0.6, 0.6, { alto: 0.9, pref: 'ini', paso: 0.45 }); if (!p1) continue;
    S.colocar('secadora', l, 0.6, 0.6, { alto: 0.9, pref: 'ini', paso: 0.45, m: 0.01 });
    const a = S.ap(l); const libres = S.libres(l, 0, 0.62, 1.5, 0.7, -1).filter((t) => t[1] - t[0] >= 0.6);
    if (libres[0] && a.D >= 1.2) S.pon('mueble_alto', a.rect(libres[0][0], 0, libres[0][1] - libres[0][0], 0.35), GIRO[l], { reservar: false });
    break;
  }
}
function almacen(S) {
  const e = S.e; const mt = e.tipo === 'despensa' || e.tipo === 'bodega' ? 'roble' : 'acero'; let n = 0; const max = e.tipo === 'bodega' ? 3 : e.tipo === 'gimnasio' ? 1 : 2; // v.1.6: botelleros en la bodega
  for (const l of ladosPorLibre(S, 0.35, 0, 2.1)) {
    if (n >= max) break; const a = S.ap(l); const d = Math.min(0.4, a.D - 0.55); if (d < 0.25) continue;
    if (S.colocar('estanteria', l, a.L, d, { alto: 2.1, min: 0.6, paso: 0.5, mat: mt })) n++;
  }
}
function garaje(S) {
  const e = S.e; const hor = e.w > e.h; const an = hor ? e.h : e.w, la = hor ? e.w : e.h;
  const nc = Math.max(1, Math.min(3, Math.floor(an / 2.7))); const nl = Math.max(1, Math.floor(la / 5.2)); let k = 0;
  for (let i = 0; i < nc; i++) for (let j = 0; j < Math.min(nl, nc === 1 ? 2 : 1); j++) {
    const cx = (i + 0.5) * (an / nc), cy = la - 0.5 - 2.2 - j * 5.0;
    const r = hor ? [e.x + cy - 2.2, e.y + cx - 0.9, 4.4, 1.8] : [e.x + cx - 0.9, e.y + cy - 2.2, 1.8, 4.4];
    if (S.libre(r, 0.05)) S.pon('coche', r, hor ? 90 : 180, { mat: k++ % 2 ? 'cocheClaro' : 'coche' });
  }
  S.colocar('estanteria', hor ? 'N' : 'O', 2.4, 0.4, { alto: 2.2, min: 1.2, paso: 0.4, mat: 'acero' });
}
function exterior(S) { // porche y terraza
  const e = S.e; const largo = Math.max(e.w, e.h), corto = Math.min(e.w, e.h), area = e.w * e.h; const hor = e.w >= e.h;
  if (corto >= 2.25 && area >= 9) {
    const mw = Math.min(1.8, Math.max(1.2, largo * 0.4));
    S.buscar('mesa_exterior', mw, 1.82, { holgura: 0.25, giros: [hor ? 0 : 90], cerca: hor ? [e.x + Math.max(1.2, e.w * 0.3), e.y + e.h / 2] : [e.x + e.w / 2, e.y + Math.max(1.2, e.h * 0.3)] });
  }
  if (largo >= 4.5 && corto >= 2.25 && area >= 12) {
    for (let k = 0; k < 2; k++) {
      const r = hor ? [e.x + e.w - 0.9 - k * 0.85 - 0.65, e.y + e.h / 2 - 0.95, 0.65, 1.9] : [e.x + e.w / 2 - 0.95, e.y + e.h - 0.9 - k * 0.85 - 0.65, 1.9, 0.65];
      if (S.libre(r, 0.05)) S.pon('tumbona', r, hor ? 0 : 270);
    }
  }
  esquinas(S, 'macetero', 0.5, area < 9 ? 1 : 4, true);
}
function chillout(S) {
  const e = S.e; const largo = Math.max(e.w, e.h); let best = null;
  for (const [l1, l2] of [['N', 'O'], ['N', 'E'], ['S', 'O'], ['S', 'E']]) for (const sw of [Math.min(2.6, largo - 1.0), 2.0, 1.6]) {
    if (sw < 1.4) continue; const a = S.ap(l1), b = S.ap(l2);
    const u1 = l2 === 'O' ? a.u0 : a.u1 - sw; const r1 = a.rect(u1, 0, sw, 0.9);
    const u2 = l1 === 'N' ? b.u0 + 0.9 : b.u1 - 0.9 - Math.min(2.0, sw); const r2 = b.rect(u2, 0, Math.min(2.0, sw), 0.9);
    if (!S.libre(r1) || !S.libre(r2)) continue;
    const sc = sw + (S.en.oc[l1].length ? 0 : 0.5) + (S.en.oc[l2].length ? 0 : 0.5);
    if (!best || sc > best.sc) best = { sc, l1, l2, r1, r2 };
  }
  if (best) {
    S.pon('sofa_bajo', best.r1, GIRO[best.l1]); S.pon('sofa_bajo', best.r2, GIRO[best.l2]);
    const cx = (best.l2 === 'O' ? best.r1[0] + 0.9 : best.r1[0] + best.r1[2] - 0.9) + (best.l2 === 'O' ? 0.55 : -1.55);
    const cy = best.l1 === 'N' ? best.r1[1] + 0.9 + 0.45 : best.r1[1] - 1.45;
    const rt = [cx, cy, 1.0, 1.0]; if (S.libre(rt, 0.1)) {
      S.pon('mesa_baja', rt, 0); const ra = [rt[0] - 0.6, rt[1] - 0.6, 2.2, 2.2]; if (S.dentro(ra) && !S.enZona(ra)) S.pon('alfombra', ra, 0, { reservar: false, mat: 'telaExt' });
      if (!S.cubierto) { // parasol de brazo con el mástil en la esquina libre
        for (const g of [0, 90, 180, 270]) { const pr = [rt[0] + 0.5 - 1.3, rt[1] + 0.5 - 1.3, 2.6, 2.6]; const L = 2.6; const pt = g === 0 ? [pr[0] + 0.25, pr[1] + 0.25] : g === 90 ? [pr[0] + L - 0.25, pr[1] + 0.25] : g === 180 ? [pr[0] + L - 0.25, pr[1] + L - 0.25] : [pr[0] + 0.25, pr[1] + L - 0.25]; const pole = [pt[0] - 0.25, pt[1] - 0.25, 0.5, 0.5]; if (S.dentro(pr) && S.libre(pole, 0.02)) { S.pon('parasol', pr, g, { reservar: false }); S.reservar(pole); break; } }
      }
    }
  }
  esquinas(S, 'macetero', 0.5, 2, true);
}
function quincho(S) {
  const e = S.e; const lados = ['N', 'S', 'E', 'O'].sort((a, b) => (S.en.ins[b] - S.en.ins[a]) || (S.ap(b).L - S.ap(a).L));
  let bbq = null;
  for (const l of lados) { bbq = S.colocar('barbacoa', l, 1.5, 0.7, { alto: 3, min: 1.2, pref: 'ini', paso: 1.2 }); if (bbq) { S.colocar('encimera_exterior', l, 1.8, 0.65, { alto: 1, min: 0.9, pref: 'ini', paso: 1.2, m: 0.01 }); break; } }
  const largo = Math.max(e.w, e.h); S.buscar('mesa_larga', Math.max(1.6, Math.min(3.0, largo - 1.6)), 1.62, { holgura: 0.4, giros: [e.w >= e.h ? 0 : 90] });
}
function fogonero(S) {
  const e = S.e; const corto = Math.min(e.w, e.h); const cx = e.x + e.w / 2, cy = e.y + e.h / 2; const d = Math.min(1.1, corto * 0.35);
  if (!S.libre([cx - d / 2, cy - d / 2, d, d])) return; S.pon('fogon', [cx - d / 2, cy - d / 2, d, d], 0);
  const R = Math.min(1.6, corto / 2 - 0.4); if (R < d / 2 + 0.55) return; const n = Math.max(4, Math.min(9, Math.floor((2 * Math.PI * R) / 0.85)));
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.3; const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R; const r = [px - 0.27, py - 0.27, 0.54, 0.54]; if (S.libre(r, 0.02)) S.pon('puf', r, 0); }
}
function patio(S) {
  const e = S.e; const corto = Math.min(e.w, e.h); const dc = Math.min(3.0, corto * 0.85); const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  S.pon('arbol', [cx - dc / 2, cy - dc / 2, dc, dc], 0, { reservar: false }); S.reservar([cx - dc / 4, cy - dc / 4, dc / 2, dc / 2]);
  if (corto >= 2.2) for (const [px, py] of [[e.x + 0.45, e.y + 0.45], [e.x + e.w - 0.45, e.y + e.h - 0.45]]) { const r = [px - 0.32, py - 0.32, 0.64, 0.64]; if (S.libre(r, 0.02)) S.pon('arbusto', r, 0); }
}

function amueblarAuto(S) {
  const t = S.e.tipo; const area = S.e.w * S.e.h;
  if (esDorm(t)) dormitorio(S);
  else if (t === 'salon') salon(S);
  else if (t === 'comedor') comedor(S);
  else if (t === 'cocina') cocina(S);
  else if (t === 'bano' || t === 'aseo') bano(S);
  else if (t === 'despacho') despacho(S);
  else if (t === 'vestidor') vestidor(S);
  else if (t === 'lavadero') lavadero(S);
  else if (t === 'despensa' || t === 'trastero' || t === 'bodega' || t === 'gimnasio') almacen(S); // v.1.6: bodega y gimnasio · sala
  else if (t === 'instalaciones') {
    const lav = /lavadora|lavander/i.test(S.e.nombre || '');
    for (const l of ladosPorLibre(S, 0.6, 0, 1.9)) { const p = S.colocar(lav ? 'lavadora' : 'acumulador', l, 0.6, 0.6, { alto: lav ? 0.9 : 1.9, pref: 'ini', paso: 0 }); if (p) { if (!lav) S.colocar('cuadro', l, 0.5, 0.18, { z0: 1.2, alto: 0.7, pref: 'fin', paso: 0 }); break; } }
  }
  else if (t === 'recibidor' || (t === 'distribuidor' && area >= 3.3)) { for (const l of ['N', 'O', 'E', 'S']) if (S.colocar(t === 'recibidor' ? 'banco' : 'consola', l, 1.2, 0.36, { alto: t === 'recibidor' ? 1.9 : 0.8, min: 1.0, paso: 0.75 })) break; }
  else if (t === 'garaje') garaje(S);
  else if (t === 'patio') patio(S);
  else if ((t === 'porche' || t === 'terraza') && area >= 4.5) exterior(S);
  else if (t === 'chillout') chillout(S);
  else if (t === 'quincho') quincho(S);
  else if (t === 'fogonero') fogonero(S);
  // piscina, doble_altura, pasillo, escalera: sin piezas movibles (la escalera se construye aparte)
}

// ---------------------------------------------------------------------------------------------------------
// Escalera: dirección de subida (e.sube o automática) y peldaños
// ---------------------------------------------------------------------------------------------------------
// Nota de un extremo de la escalera en una planta: media, a lo largo del lado corto, de lo que hay justo al otro lado
// (pieza de paso 3, otra pieza interior 1). En un edificio solo cuenta lo de su misma unidad (zona común o su vivienda).
function notaExtremo(e, planta, alto, hor, edif) {
  if (!planta) return 0; const m = celdasPlanta(planta).m; const n = Math.round((hor ? e.h : e.w) / T); let s = 0;
  for (let k = 0; k < n; k++) {
    const x = hor ? (alto ? e.x + e.w + T / 2 : e.x - T / 2) : e.x + (k + 0.5) * T, y = hor ? e.y + (k + 0.5) * T : (alto ? e.y + e.h + T / 2 : e.y - T / 2);
    const q = m.get(Math.floor(x / T + 1e-6) + ',' + Math.floor(y / T + 1e-6));
    if (!q || !TIPOS[q.tipo] || !esInt(q.tipo) || ['escalera', 'ascensor', 'doble_altura'].includes(q.tipo)) continue;
    if (edif && (q.vivienda || '') !== (e.vivienda || '')) continue;
    s += grupo(q.tipo) === 'circ' ? 3 : 1;
  }
  return n ? s / n : 0;
}
const mismoHueco = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
function datosEscalera(e, modelo, pi, prof = 0) {
  const hor = e.w > e.h; const largo = Math.max(e.w, e.h), corto = Math.min(e.w, e.h); const eje = hor ? ['O', 'E'] : ['N', 'S']; const doble = corto >= 2.9;
  let dir;
  if (e.sube && eje.includes(e.sube)) dir = e.sube === eje[1] ? 1 : -1;
  else {
    const sup = modelo?.plantas?.[pi + 1];
    // última planta: la escalera es el desembarco de la de abajo y se dibuja igual que ella
    const bajo = !sup && pi > 0 && prof < 8 ? modelo?.plantas?.[pi - 1]?.estancias.find((q) => q.tipo === 'escalera' && mismoHueco(q, e) && (q.vivienda || '') === (e.vivienda || '')) : null;
    if (bajo) return datosEscalera(bajo, modelo, pi - 1, prof + 1);
    if (!sup) dir = doble ? 1 : (hor ? 1 : -1);
    else {
      // v.1.5: el arranque (esta planta) y la llegada (la de arriba) dan a la pieza de paso con la que la escalera comparte más
      // lado. En U arranque y llegada están en el mismo extremo (la meseta, en el otro); en tramo recto, en extremos opuestos.
      // Con d > 0 arranca en el extremo de x/y mínimos. Empate: el sentido de siempre (tramo recto: el de la llegada).
      const edif = esEdificio(modelo); const cur = modelo.plantas[pi];
      const sc = (d) => (doble ? notaExtremo(e, cur, d < 0, hor, edif) + notaExtremo(e, sup, d < 0, hor, edif) : notaExtremo(e, cur, d < 0, hor, edif) + notaExtremo(e, sup, d > 0, hor, edif));
      const m = celdasPlanta(sup).m; const pieza = (x, y) => m.get(Math.floor(x / T + 1e-6) + ',' + Math.floor(y / T + 1e-6));
      const nota = (q) => (!q || q.tipo === 'escalera' || !esInt(q.tipo) ? 0 : grupo(q.tipo) === 'circ' ? 3 : 1);
      const fin = (d) => (hor ? nota(pieza(d > 0 ? e.x + e.w + T / 2 : e.x - T / 2, e.y + e.h / 2)) : nota(pieza(e.x + e.w / 2, d > 0 ? e.y + e.h + T / 2 : e.y - T / 2)));
      const defecto = doble ? 1 : hor ? 1 : -1; const a = sc(defecto), b = sc(-defecto);
      dir = b > a + 1e-9 ? -defecto : a > b + 1e-9 || doble ? defecto : (fin(-defecto) > fin(defecto) ? -defecto : defecto);
    }
    if (hor ? e.espejoX : e.espejoY) dir = -dir;
  }
  const vflip = doble && !!(hor ? e.espejoY : e.espejoX);
  return { hor, largo, corto, doble, dir, vflip, sube: dir > 0 ? eje[1] : eje[0] };
}
// Desembarco de la escalera en la planta de arriba: lado del hueco por el que se llega y, en escaleras en U,
// el tramo de ese lado ocupado por la llegada ([u0, u1] relativo al lado corto, o null si es todo el lado).
export function llegadaEscalera(modelo, pi, e) {
  if (typeof e === 'string') e = modelo?.plantas?.[pi]?.estancias.find((q) => q.id === e);
  if (!e || e.tipo !== 'escalera') return null; const d = datosEscalera(e, modelo, pi);
  const op = { N: 'S', S: 'N', E: 'O', O: 'E' };
  if (!d.doble) return { lado: d.sube, tramo: null };
  const w = (d.corto - 0.4) / 2; const segundo = d.vflip ? [0.15, 0.15 + w + 0.1] : [d.corto - 0.15 - w - 0.1, d.corto - 0.15]; // el segundo tramo va por la otra mitad
  return { lado: op[d.sube], tramo: segundo };
}
export function subeEscalera(modelo, pi, e) {
  if (typeof e === 'string') e = modelo?.plantas?.[pi]?.estancias.find((q) => q.id === e);
  if (!e || e.tipo !== 'escalera') return null; return datosEscalera(e, modelo, pi).sube;
}
function escalera(e, modelo, pi, out) {
  if (!modelo.plantas[pi + 1]) return;
  const { hor, largo, corto, doble, dir, vflip } = datosEscalera(e, modelo, pi);
  const n = 17, sub = H_PLANTA / n, tz = 0.05; const base = { id: e.id + '-escalera', est: e.id, pieza: 'escalera', forma: 'caja' };
  const P = (rol, r, z0, alto, mat) => out.push(Object.assign({ rol, x: r3(r[0]), y: r3(r[1]), w: r3(r[2]), h: r3(r[3]), z0: r3(z0), alto: r3(alto), mat }, base));
  const R = (u0, v0, lu, lv, d = dir) => { const a = d > 0 ? u0 : largo - u0 - lu; const b = vflip ? corto - v0 - lv : v0; return hor ? [e.x + a, e.y + b, lu, lv] : [e.x + b, e.y + a, lv, lu]; };
  if (doble) { // dos tramos con meseta al fondo
    const w = (corto - 0.4) / 2, paso = (largo - 0.3 - 1.0) / 8;
    for (let k = 0; k < 8; k++) P('peldano', R(0.15 + k * paso, 0.15, paso + 0.02, w), (k + 1) * sub - tz, tz, 'roble');
    P('meseta', R(largo - 0.15 - 1.0, 0.15, 1.0, corto - 0.3), 9 * sub - 0.12, 0.12, 'roble');
    for (let k = 0; k < 8; k++) P('peldano', R(largo - 0.15 - 1.0 - (k + 1) * paso, corto - 0.15 - w, paso + 0.02, w), (10 + k) * sub - tz, tz, 'roble');
    P('barandilla', R(0.15, 0.15 + w + 0.02, largo - 1.3, 0.06), 0, H_PLANTA * 0.5 + 0.9, 'lacado');
    return;
  }
  const an = Math.min(1.2, corto - 0.3), v0 = (corto - an) / 2, L = largo - 0.3, paso = L / n;
  for (let k = 0; k < n; k++) P('peldano', R(0.15 + k * paso, v0, paso + 0.02, an), (k + 1) * sub - tz, tz, 'roble');
}

// ---------------------------------------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------------------------------------
function calcular(modelo, pi, g, soloId) {
  const planta = modelo?.plantas?.[pi]; if (!planta) return { piezas: [], prims: [] };
  g = g || derivar(modelo, pi); const zs = zonas(planta, g);
  const piezas = [], prims = [];
  for (const e of planta.estancias) {
    if (soloId && e.id !== soloId) continue;
    if (!TIPOS[e.tipo]) continue; const n0 = prims.length, p0 = piezas.length;
    try {
      if (e.tipo === 'escalera') { if (!soloId) escalera(e, modelo, pi, prims); continue; }
      const en0 = entorno(e, g, zs);
      if (Array.isArray(e.mobiliario)) { // fijado a mano: coordenadas relativas a la estancia
        for (const it of e.mobiliario) {
          if (!it || !it.rol) continue; const p = { id: it.id || `${e.id}-${it.rol}-${piezas.length}`, rol: it.rol, x: r3(e.x + (+it.dx || 0)), y: r3(e.y + (+it.dy || 0)), w: +it.w || 0.5, h: +it.h || 0.5, giro: giroN(it.giro), est: e.id, manual: true };
          for (const c of ['alto', 'mat', 'forma', 'z0']) if (it[c] != null) p[c] = it[c];
          piezas.push(p); expandir(p, en0, prims);
        }
        continue;
      }
      const mx = !!e.espejoX, my = !!e.espejoY; const en = mx || my ? espejarEntorno(en0, mx, my) : en0;
      const S = new Sala(en, modelo, pi); S.cubierto = !!TIPOS[e.tipo].cubierto || !!e.pergola; amueblarAuto(S);
      const q0 = prims.length; for (const p of S.piezas) { delete p._u; delete p._l; expandir(p, en, prims); }
      if (mx || my) { for (let i = q0; i < prims.length; i++) reflejar(prims[i], e, mx, my); for (const p of S.piezas) { reflejar(p, e, mx, my); p.giro = reflejarGiro(p.giro, mx, my); } }
      piezas.push(...S.piezas);
    } catch (err) { prims.length = n0; piezas.length = p0; } // una estancia rara no rompe el resto
  }
  const ok = (it) => it.w > 0.003 && it.h > 0.003 && it.alto > 0.001 && [it.x, it.y, it.w, it.h, it.z0, it.alto].every(Number.isFinite);
  return { piezas, prims: prims.filter(ok) };
}
export function mobiliario(modelo, pi, g) { return calcular(modelo, pi, g).prims; }
export function piezasMobiliario(modelo, pi, g) { return calcular(modelo, pi, g).piezas; }
export function fijarMobiliario(modelo, pi, estanciaId, g) {
  const e = modelo?.plantas?.[pi]?.estancias.find((q) => q.id === estanciaId); if (!e) return [];
  return calcular(modelo, pi, g, estanciaId).piezas.map((p) => {
    const o = { id: p.id, rol: p.rol, dx: r3(p.x - e.x), dy: r3(p.y - e.y), w: p.w, h: p.h, giro: p.giro || 0 };
    const c = CATALOGO_MUEBLES.find((q) => q.rol === p.rol); if (c) o.alto = c.alto; if (p.mat) o.mat = p.mat; return o;
  });
}
