// v.1.6 · Forjado sanitario y accesos exteriores (escaleras, rampas y plataformas).
// Módulo puro (navegador y servidor): una sola fuente para planos, 3D, presupuesto, reglas, editor y MCP.
//
// modelo.cimentacion = { tipo: 'losa' | 'forjado_sanitario', altura, vuelos: { N, S, E, O }, murete: { espesor, material }, accesosAuto? }
//   · Sin `cimentacion` (o tipo 'losa') la casa se comporta exactamente como antes: losa sobre el terreno.
//   · `altura`: altura libre de la cámara ventilada (terreno → cara inferior del forjado) = altura de los muretes.
//     El suelo de planta baja queda a altura + E_FORJADO (cotaPB).
//   · `vuelos`: lo que la planta baja vuela por cada lado más allá de la línea de muretes (0 = murete enrasado).
// modelo.exteriores = [ elemento ] (complementos configurables de acceso):
//   · manual: { id, tipo: 'escalera'|'rampa'|'plataforma', x, y, lado, ancho, sentido?, huella?, descansillo?, fondo?, pendiente?, barandilla?, escalera?, altura? }
//     (x, y) = punto de arranque arriba, sobre el borde de la plataforma de la casa; `lado` = hacia dónde sale.
//   · anulación de un acceso automático: { id, ref, ...cambios } o { id, ref, quitar: true }.
import { T, TE, r3, snap, clamp, VUELO_MAX, E_FORJADO, uid } from './trama.mjs';
import { TIPOS, esInt } from './catalogo.mjs';
import { celdasPlanta, derivar } from './geometria.mjs';

export const CIMENTACION_TIPOS = { losa: 'Losa sobre el terreno', forjado_sanitario: 'Forjado sanitario sobre muretes' };
export const MURETE_MATERIALES = {
  hormigon: { n: 'Hormigón armado', color: '#b8b4aa' },
  bloque: { n: 'Bloque de hormigón', color: '#a8a59c' },
  piedra: { n: 'Mampostería de piedra', color: '#b29e83' },
};
// altura (cámara): 0,30–1,20 m (0,30 = mínimo para ventilar y registrar la cámara). Vuelo máximo = VUELO_MAX (1,50 m,
// sistema.voladizoMax = 1500 mm): los 1,60 m del Line original de Menorca se llevan a 1,50 m, sobre la trama de 0,375 m.
export const CIM = { altura: 0.5, alturaMin: 0.3, alturaMax: 1.2, vuelo: 0.75, vueloMax: VUELO_MAX, espesor: 0.25, luzMax: 6, rejillaCada: 3, zocalo: 0.12 };
export const EXTERIORES_TIPOS = { escalera: 'Escalera exterior', rampa: 'Rampa accesible', plataforma: 'Plataforma · porche elevado' };
// CTE DB-SUA: huella 0,28–0,32, tabica 0,15–0,185; protección a partir de 0,55 m de desnivel; rampas de itinerario
// accesible ≤ 10 % (tramo < 3 m), ≤ 8 % (< 6 m), ≤ 6 % (resto), tramos ≤ 9 m, mesetas de 1,50 m y ancho ≥ 1,20.
export const ESC = { huella: 0.3, huellaMin: 0.28, huellaMax: 0.32, tabicaMin: 0.15, tabicaMax: 0.185, ancho: 1.2, anchoMin: 0.8, protege: 0.55 };
export const RAMPA = { ancho: 1.2, anchoMin: 1.2, meseta: 1.5, tramoMax: 9 };
export const LADOS = ['N', 'S', 'E', 'O'];
const DIR = { N: [0, -1], S: [0, 1], E: [1, 0], O: [-1, 0] };
const K = (i, j) => i + ',' + j;
const num = (v, d) => (v === null || v === '' || v === undefined || !Number.isFinite(+v) ? d : +v);

// ---------- cimentación ----------
export const esSanitario = (m) => m?.cimentacion?.tipo === 'forjado_sanitario';
export function cimentacionDe(m) { return normalizarCimentacion(m?.cimentacion) || normalizarCimentacion({ tipo: 'losa' }); }
// Cota del suelo terminado de planta baja sobre el terreno (planos). Con losa, 0 (el zócalo de 12 cm es solo del 3D).
export const cotaPB = (m) => (esSanitario(m) ? r3(cimentacionDe(m).altura + E_FORJADO) : 0);
// Altura que salvan los accesos exteriores (con losa, el zócalo del 3D).
export const alturaAcceso = (m) => (esSanitario(m) ? cotaPB(m) : CIM.zocalo);

export function normalizarCimentacion(c) {
  if (c == null || typeof c !== 'object' || Array.isArray(c)) return null;
  const out = { tipo: c.tipo === 'forjado_sanitario' ? 'forjado_sanitario' : 'losa' };
  out.altura = r3(clamp(snap(num(c.altura, CIM.altura), 0.05), 0.15, 1.5));
  const v = c.vuelos && typeof c.vuelos === 'object' && !Array.isArray(c.vuelos) ? c.vuelos : {};
  out.vuelos = Object.fromEntries(LADOS.map((l) => [l, r3(clamp(snap(Math.max(0, num(v[l], CIM.vuelo))), 0, 3))]));
  const mu = c.murete && typeof c.murete === 'object' && !Array.isArray(c.murete) ? c.murete : {};
  out.murete = { espesor: r3(clamp(snap(num(mu.espesor, CIM.espesor), 0.05), 0.15, 0.5)), material: MURETE_MATERIALES[mu.material] ? mu.material : 'hormigon' };
  if (c.accesosAuto === false) out.accesosAuto = false;
  return out;
}
// Celdas de planta baja que lleva el forjado sanitario: todo lo que no es vacío (patio) ni piscina.
export function huellaSanitario(m) {
  const out = new Set(); const p = m.plantas?.[0]; if (!p) return out;
  for (const [k, e] of celdasPlanta(p).m) if (!TIPOS[e.tipo]?.vacio && e.tipo !== 'piscina') out.add(k);
  return out;
}
// Muretes del forjado sanitario: contorno de la huella retranqueado por lado (vuelos) + muretes intermedios donde la
// luz del forjado pasa de 6,00 m. Devuelve segmentos sobre la trama (eje del murete) y la medición.
export function muretes(m) {
  const c = cimentacionDe(m); const F = huellaSanitario(m); const n = Object.fromEntries(LADOS.map((l) => [l, Math.round(c.vuelos[l] / T)]));
  const A = new Set();
  for (const k of F) {
    const [i, j] = k.split(',').map(Number); let ok = true;
    for (let q = 1; ok && q <= n.N; q++) ok = F.has(K(i, j - q)); for (let q = 1; ok && q <= n.S; q++) ok = F.has(K(i, j + q));
    for (let q = 1; ok && q <= n.O; q++) ok = F.has(K(i - q, j)); for (let q = 1; ok && q <= n.E; q++) ok = F.has(K(i + q, j));
    if (ok) A.add(k);
  }
  const ar = [];
  for (const k of A) {
    const [i, j] = k.split(',').map(Number);
    if (!A.has(K(i, j - 1))) ar.push({ o: 'h', line: j, pos: i, lado: 'N' }); if (!A.has(K(i, j + 1))) ar.push({ o: 'h', line: j + 1, pos: i, lado: 'S' });
    if (!A.has(K(i - 1, j))) ar.push({ o: 'v', line: i, pos: j, lado: 'O' }); if (!A.has(K(i + 1, j))) ar.push({ o: 'v', line: i + 1, pos: j, lado: 'E' });
  }
  const perimetro = juntar(ar);
  // intermedios: el forjado salva la dirección corta de la zona de apoyo; si pasa de luzMax, líneas paralelas al lado largo
  const intermedios = []; let i0 = Infinity, i1 = -Infinity, j0 = Infinity, j1 = -Infinity;
  for (const k of A) { const [i, j] = k.split(',').map(Number); i0 = Math.min(i0, i); i1 = Math.max(i1, i + 1); j0 = Math.min(j0, j); j1 = Math.max(j1, j + 1); }
  if (A.size) {
    const W = (i1 - i0) * T, H = (j1 - j0) * T; const corto = Math.min(W, H);
    if (corto > CIM.luzMax + 1e-6) {
      const nl = Math.ceil(corto / CIM.luzMax - 1e-9) - 1; const ai = [];
      const hor = H <= W; // líneas horizontales (dividen la altura) si la dirección corta es y
      for (let q = 1; q <= nl; q++) {
        const v = (hor ? j0 * T : i0 * T) + (corto * q) / (nl + 1); const line = Math.round(snap(v, TE) / T);
        for (let p = hor ? i0 : j0; p < (hor ? i1 : j1); p++) { const a = hor ? K(p, line - 1) : K(line - 1, p), b = hor ? K(p, line) : K(line, p); if (A.has(a) && A.has(b)) ai.push({ o: hor ? 'h' : 'v', line, pos: p, lado: '' }); }
      }
      intermedios.push(...juntar(ai));
    }
  }
  const ml = r3(perimetro.reduce((a, s) => a + s.len, 0)), mlInt = r3(intermedios.reduce((a, s) => a + s.len, 0));
  const rejillas = [];
  for (const s of perimetro) { const nr = Math.max(1, Math.floor(s.len / CIM.rejillaCada)); for (let q = 0; q < nr; q++) { const u = (s.o === 'h' ? s.x1 : s.y1) + ((q + 0.5) * s.len) / nr; rejillas.push({ o: s.o, lado: s.lado, x: s.o === 'h' ? r3(u) : s.x1, y: s.o === 'h' ? s.y1 : r3(u) }); } }
  return { cimentacion: c, huella: F, apoyo: A, perimetro, intermedios, ml, mlInt, rejillas, area: r3(F.size * T * T), areaApoyo: r3(A.size * T * T) };
}
function juntar(ar) {
  ar.sort((p, q) => (p.o < q.o ? -1 : p.o > q.o ? 1 : p.line - q.line || (p.lado < q.lado ? -1 : p.lado > q.lado ? 1 : 0) || p.pos - q.pos));
  const out = []; let cur = null;
  for (const a of ar) { if (cur && cur.o === a.o && cur.line === a.line && cur.lado === a.lado && cur.end === a.pos) { cur.end++; continue; } if (cur) out.push(cur); cur = { o: a.o, line: a.line, lado: a.lado, start: a.pos, end: a.pos + 1 }; }
  if (cur) out.push(cur);
  return out.map((s) => { const h = s.o === 'h'; const c = r3(s.line * T), a = r3(s.start * T), b = r3(s.end * T); return { o: s.o, lado: s.lado, x1: h ? a : c, y1: h ? c : a, x2: h ? b : c, y2: h ? c : b, len: r3(b - a) }; });
}

// ---------- accesos exteriores ----------
// Puertas de planta baja que necesitan acceso exterior con forjado sanitario: la de entrada, las puertas exteriores y
// los ventanales que dan a una terraza o porche. Desde la puerta se camina hacia fuera por la plataforma elevada
// (porche, terraza) hasta su borde: ahí arranca el acceso.
export function puntosAcceso(m, g0) {
  const p = m.plantas?.[0]; if (!p) return [];
  g0 = g0 || derivar(m, 0); const F = huellaSanitario(m); const cel = celdasPlanta(p).m; const out = [];
  for (const h of g0.huecos) {
    if (!h.lado || !DIR[h.lado]) continue;
    const d = DIR[h.lado]; const hor = h.o === 'h';
    let i = hor ? Math.floor(h.x / T) : Math.round(h.x / T) - (h.lado === 'O' ? 1 : 0), j = hor ? Math.round(h.y / T) - (h.lado === 'N' ? 1 : 0) : Math.floor(h.y / T);
    const primera = cel.get(K(i, j)); const daAExterior = !!primera && !!TIPOS[primera.tipo]?.ext;
    if (!(h.tipo === 'puerta' || (h.tipo === 'ventanal' && daAExterior && F.has(K(i, j))))) continue;
    let k = 0; let ok = true;
    while (F.has(K(i, j)) && k < 160) { const e = cel.get(K(i, j)); if (!e || !TIPOS[e.tipo]?.ext) { ok = false; break; } i += d[0]; j += d[1]; k++; }
    if (!ok) continue;
    const x = hor ? r3(h.x) : r3(h.x + d[0] * k * T), y = hor ? r3(h.y + d[1] * k * T) : r3(h.y);
    const ref = h.entrada ? 'entrada' : h.manual ? h.id : `${h.est}:${h.lado}:${h.tipo}`;
    if (out.some((q) => q.lado === h.lado && (hor ? Math.abs(q.y - y) < 1e-6 && Math.abs(q.x - x) < 2 : Math.abs(q.x - x) < 1e-6 && Math.abs(q.y - y) < 2))) continue;
    out.push({ ref, x, y, lado: h.lado, tipo: h.tipo, entrada: !!h.entrada, hacia: h.hacia || 'dentro', anchoHueco: h.ancho, est: h.est, sobrePlataforma: k > 0 });
  }
  return out;
}
export function normalizarExteriores(lista) {
  if (!Array.isArray(lista)) return null;
  const out = [];
  for (const e of lista.slice(0, 60)) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) continue;
    const q = { id: typeof e.id === 'string' && e.id ? e.id.slice(0, 40) : uid('x') };
    if (typeof e.ref === 'string' && e.ref) { q.ref = e.ref.slice(0, 80); if (e.quitar) { q.quitar = true; out.push(q); continue; } }
    if (e.tipo != null) { if (!EXTERIORES_TIPOS[e.tipo]) continue; q.tipo = e.tipo; } else if (!q.ref) continue;
    if (!q.ref) { const x = num(e.x, NaN), y = num(e.y, NaN); if (!Number.isFinite(x) || !Number.isFinite(y) || !DIR[e.lado]) continue; q.x = r3(clamp(x, -500, 500)); q.y = r3(clamp(y, -500, 500)); q.lado = e.lado; }
    if (e.ancho != null) q.ancho = r3(clamp(snap(num(e.ancho, 1.2), 0.05), 0.6, 12));
    if (e.fondo != null) q.fondo = r3(clamp(snap(num(e.fondo, 2.25), 0.05), 0.6, 12));
    if (e.huella != null) q.huella = r3(clamp(num(e.huella, ESC.huella), 0.22, 0.45));
    if (e.pendiente != null) q.pendiente = r3(clamp(num(e.pendiente, 8), 2, 20));
    if (e.altura != null) q.altura = r3(clamp(num(e.altura, 0.5), 0, 3));
    if (['frente', 'izq', 'der'].includes(e.sentido)) q.sentido = e.sentido;
    if (e.barandilla === true || e.barandilla === false) q.barandilla = e.barandilla;
    for (const b of ['descansillo', 'escalera']) if (e[b] === true || e[b] === false) q[b] = e[b];
    out.push(q);
  }
  return out;
}
// Elementos resueltos (automáticos + anulaciones + manuales), con su geometría.
export function accesosExteriores(m, g0) {
  const lista = Array.isArray(m.exteriores) ? m.exteriores : []; const H0 = alturaAcceso(m); const out = [];
  if (esSanitario(m) && cimentacionDe(m).accesosAuto !== false) {
    const anul = new Map(lista.filter((e) => e.ref).map((e) => [e.ref, e]));
    for (const pa of puntosAcceso(m, g0)) {
      const ov = anul.get(pa.ref); if (ov?.quitar) continue;
      const base = { id: 'auto:' + pa.ref, ref: pa.ref, auto: true, tipo: 'escalera', x: pa.x, y: pa.y, lado: pa.lado, ancho: ESC.ancho, sentido: 'frente', descansillo: pa.hacia === 'fuera', entrada: pa.entrada };
      const el = Object.assign(base, ov ? Object.fromEntries(Object.entries(ov).filter(([k]) => !['id', 'ref', 'x', 'y', 'lado'].includes(k))) : {});
      if (ov) el.editado = true;
      out.push(geometriaExterior(el, H0));
    }
  }
  for (const e of lista) if (!e.ref && e.tipo && DIR[e.lado]) out.push(geometriaExterior({ ...e, auto: false }, H0));
  return out;
}
// Geometría de un elemento: piezas en planta con su cota, barandillas, caja y medición. Marco local: s hacia fuera
// (lado), t a la derecha mirando hacia fuera; (x, y) es el arranque arriba.
export function geometriaExterior(el, H0) {
  const d = DIR[el.lado] || DIR.S; const r = [-d[1], d[0]]; const H = r3(el.altura != null ? el.altura : H0);
  const P = (s, t) => [el.x + d[0] * s + r[0] * t, el.y + d[1] * s + r[1] * t];
  const rect = (s0, s1, t0, t1) => { const a = P(s0, t0), b = P(s1, t1); return { x: r3(Math.min(a[0], b[0])), y: r3(Math.min(a[1], b[1])), w: r3(Math.abs(b[0] - a[0])), h: r3(Math.abs(b[1] - a[1])) }; };
  const piezas = [], barandillas = [], avisos = []; const med = { peldanos: 0, peldanosMl: 0, rampa: 0, meseta: 0, plataforma: 0, barandilla: 0 };
  const bar = (s0, t0, z0, s1, t1, z1) => { const a = P(s0, t0), b = P(s1, t1); barandillas.push({ x1: r3(a[0]), y1: r3(a[1]), z1: r3(z0), x2: r3(b[0]), y2: r3(b[1]), z2: r3(z1) }); med.barandilla += Math.hypot(b[0] - a[0], b[1] - a[1]); };
  const lado = (s, t) => { const v = [d[0] * s + r[0] * t, d[1] * s + r[1] * t]; return Math.abs(v[0]) > Math.abs(v[1]) ? (v[0] > 0 ? 'E' : 'O') : v[1] > 0 ? 'S' : 'N'; };
  const tipo = EXTERIORES_TIPOS[el.tipo] ? el.tipo : 'escalera';
  const conBar = (def) => (el.barandilla === true || el.barandilla === false ? el.barandilla : def);
  const out = { id: el.id, ref: el.ref || null, auto: !!el.auto, editado: !!el.editado, entrada: !!el.entrada, tipo, x: el.x, y: el.y, lado: el.lado, altura: H, piezas, barandillas, avisos, medicion: med };
  // tramo de escalera desde s = s0 a lo largo de (ds, dt) con ancho w centrado en tc (marco local)
  const escalera = (s0, t0, ds, dt, w, hu, n, tz) => {
    // n contrahuellas: n − 1 huellas entre la cota de arriba (H) y el terreno; cada huella, una pieza a su cota
    for (let k = 1; k < n; k++) {
      const a = (k - 1) * hu, b = k * hu; const z = r3(H - k * tz);
      const pz = ds ? rect(s0 + a, s0 + b, t0 - w / 2, t0 + w / 2) : rect(s0 - w / 2, s0 + w / 2, t0 + dt * a, t0 + dt * b);
      piezas.push({ k: 'peldano', ...pz, z, n: k, baja: ds ? lado(1, 0) : lado(0, dt) });
    }
    med.peldanos += Math.max(0, n - 1); med.peldanosMl += Math.max(0, n - 1) * w;
    return Math.max(0, n - 1) * hu;
  };
  if (tipo === 'escalera' || tipo === 'plataforma') {
    const hu = clamp(num(el.huella, ESC.huella), 0.22, 0.45); const n = H > 0.01 ? Math.max(1, Math.ceil(H / ESC.tabicaMax - 1e-9)) : 0; const tz = n ? H / n : 0;
    Object.assign(out, { huella: r3(hu), contrahuellas: n, tabica: r3(tz) });
    if (n && (tz > ESC.tabicaMax + 1e-6 || (n > 1 && tz < ESC.tabicaMin - 1e-6))) avisos.push(`tabica de ${(tz * 100).toFixed(1)} cm fuera de 15–18,5 cm`);
    if (hu < ESC.huellaMin - 1e-6 || hu > ESC.huellaMax + 1e-6) avisos.push(`huella de ${(hu * 100).toFixed(0)} cm fuera de 28–32 cm`);
    if (tipo === 'escalera') {
      const w = clamp(num(el.ancho, ESC.ancho), 0.6, 6); const sentido = el.sentido === 'izq' || el.sentido === 'der' ? el.sentido : 'frente'; const sg = sentido === 'der' ? 1 : -1;
      Object.assign(out, { ancho: r3(w), sentido, descansillo: sentido !== 'frente' || !!el.descansillo });
      if (w < ESC.anchoMin - 1e-6) avisos.push(`ancho de ${w.toFixed(2)} m: mínimo ${ESC.anchoMin.toFixed(2)} m`);
      const b = conBar(H > ESC.protege + 1e-6); out.barandilla = b;
      if (sentido === 'frente') {
        let s = 0; if (out.descansillo) { const f = Math.max(1, w); piezas.push({ k: 'meseta', ...rect(0, f, -w / 2, w / 2), z: H }); med.meseta += f * w; s = f; }
        const L = escalera(s, 0, 1, 0, w, hu, n, tz);
        if (b) for (const t of [-w / 2, w / 2]) { if (s) bar(0, t, H, s, t, H); if (L) bar(s, t, H, s + L, t, tz); }
      } else {
        const f = Math.max(1, w); piezas.push({ k: 'meseta', ...rect(0, f, -w / 2, w / 2), z: H }); med.meseta += f * w;
        const L = escalera(w / 2, sg * (w / 2), 0, sg, w, hu, n, tz);
        if (b) { bar(f, -w / 2, H, f, w / 2, H); bar(0, -sg * w / 2, H, f, -sg * w / 2, H); if (L) bar(w, sg * w / 2, H, w, sg * (w / 2 + L), tz); if (f > w + 1e-6) bar(w, sg * w / 2, H, f, sg * w / 2, H); }
      }
    } else {
      const w = clamp(num(el.ancho, 3), 0.9, 12), f = clamp(num(el.fondo, 2.25), 0.6, 12); const conEsc = el.escalera !== false; const we = Math.min(ESC.ancho, w);
      Object.assign(out, { ancho: r3(w), fondo: r3(f), escalera: conEsc });
      piezas.push({ k: 'plataforma', ...rect(0, f, -w / 2, w / 2), z: H }); med.plataforma += w * f;
      const L = conEsc ? escalera(f, 0, 1, 0, we, hu, n, tz) : 0;
      const b = conBar(H > ESC.protege + 1e-6); out.barandilla = b;
      if (b) {
        bar(0, -w / 2, H, f, -w / 2, H); bar(0, w / 2, H, f, w / 2, H);
        if (conEsc) { if (w / 2 - we / 2 > 0.05) { bar(f, -w / 2, H, f, -we / 2, H); bar(f, we / 2, H, f, w / 2, H); } if (L) for (const t of [-we / 2, we / 2]) bar(f, t, H, f + L, t, tz); }
        else bar(f, -w / 2, H, f, w / 2, H);
      }
      if (!conEsc && H > 0.2) avisos.push('plataforma elevada sin escalera ni rampa');
    }
  } else {
    // rampa
    const w = clamp(num(el.ancho, RAMPA.ancho), 0.9, 6); const sentido = el.sentido === 'izq' || el.sentido === 'der' ? el.sentido : 'frente'; const sg = sentido === 'der' ? 1 : -1;
    const auto = H / 0.1 <= 3 + 1e-6 ? 10 : H / 0.08 <= 6 + 1e-6 ? 8 : 6; const pc = el.pendiente != null ? clamp(num(el.pendiente, auto), 2, 20) : auto; const p = pc / 100;
    const L = H > 0.01 ? H / p : 0; const nt = Math.max(1, Math.ceil(L / RAMPA.tramoMax - 1e-9)); const Lt = L / nt; const fm = RAMPA.meseta;
    const max = Lt <= 3 + 1e-6 ? 10 : Lt <= 6 + 1e-6 ? 8 : 6;
    Object.assign(out, { ancho: r3(w), sentido, pendiente: r3(pc), longitud: r3(L), tramos: L ? nt : 0 });
    if (pc > max + 1e-6) avisos.push(`pendiente del ${pc} % en tramos de ${Lt.toFixed(2)} m: máximo ${max} %`);
    if (w < RAMPA.anchoMin - 1e-6) avisos.push(`ancho de ${w.toFixed(2)} m: una rampa accesible necesita 1,20 m`);
    const b = conBar(H > 0.185); out.barandilla = b;
    const wm = Math.max(fm, w);
    piezas.push({ k: 'meseta', ...rect(0, sentido === 'frente' ? fm : wm, -wm / 2, wm / 2), z: H }); med.meseta += (sentido === 'frente' ? fm : wm) * wm;
    let u = sentido === 'frente' ? fm : wm / 2; let z = H;
    const tramo = (u0, u1, za, zb) => {
      const pz = sentido === 'frente' ? rect(u0, u1, -w / 2, w / 2) : rect(0, w, sg * u0, sg * u1);
      piezas.push({ k: 'rampa', ...pz, z0: r3(za), z1: r3(zb), z: r3(za), baja: sentido === 'frente' ? lado(1, 0) : lado(0, sg) }); med.rampa += (u1 - u0) * w;
      if (b) for (const t of [-w / 2, w / 2]) { if (sentido === 'frente') bar(u0, t, za, u1, t, zb); else bar(w / 2 + t, sg * u0, za, w / 2 + t, sg * u1, zb); }
    };
    for (let q = 0; q < nt && L; q++) {
      tramo(u, u + Lt, z, z - Lt * p); u += Lt; z -= Lt * p;
      if (q < nt - 1) { const pz = sentido === 'frente' ? rect(u, u + fm, -w / 2, w / 2) : rect(0, w, sg * u, sg * (u + fm)); piezas.push({ k: 'meseta', ...pz, z: r3(z) }); med.meseta += fm * w; if (b) for (const t of [-w / 2, w / 2]) { if (sentido === 'frente') bar(u, t, z, u + fm, t, z); else bar(w / 2 + t, sg * u, z, w / 2 + t, sg * (u + fm), z); } u += fm; }
    }
    if (b && sentido !== 'frente') { bar(wm, -wm / 2, H, wm, wm / 2, H); bar(0, -sg * wm / 2, H, wm, -sg * wm / 2, H); }
    else if (b) for (const t of [-wm / 2, wm / 2]) bar(0, t, H, fm, t, H);
  }
  if (out.barandilla === false && H > ESC.protege + 1e-6) avisos.push(`sin barandilla con ${H.toFixed(2)} m de desnivel (obligatoria a partir de 0,55 m)`);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of piezas) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x + q.w); y1 = Math.max(y1, q.y + q.h); }
  out.caja = Number.isFinite(x0) ? { x0: r3(x0), y0: r3(y0), x1: r3(x1), y1: r3(y1) } : { x0: el.x, y0: el.y, x1: el.x, y1: el.y };
  for (const k of Object.keys(med)) med[k] = r3(med[k]);
  return out;
}
// Caja de la casa con sus accesos exteriores (planos: encuadre).
export function cajaExteriores(m, b, X) {
  X = X || accesosExteriores(m); if (!X.length) return b;
  let { x0, y0, x1, y1 } = b; for (const e of X) { x0 = Math.min(x0, e.caja.x0); y0 = Math.min(y0, e.caja.y0); x1 = Math.max(x1, e.caja.x1); y1 = Math.max(y1, e.caja.y1); }
  return { x0: r3(x0), y0: r3(y0), x1: r3(x1), y1: r3(y1), w: r3(x1 - x0), h: r3(y1 - y0) };
}

// ---------- reglas (core/reglas.mjs las llama) ----------
export function reglasCimentacion(m, add, g0) {
  const X = esSanitario(m) || (m.exteriores || []).length ? accesosExteriores(m, g0) : [];
  if (esSanitario(m)) {
    const c = cimentacionDe(m); const M = muretes(m); const fmt = (v) => Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (c.altura < CIM.alturaMin - 1e-6) add('error', 'CIMENTACION', `La cámara del forjado sanitario mide ${fmt(c.altura)} m: el mínimo es ${fmt(CIM.alturaMin)} m para ventilarla y registrarla.`);
    else if (c.altura > CIM.alturaMax + 1e-6) add('aviso', 'CIMENTACION', `Cámara de ${fmt(c.altura)} m: por encima de ${fmt(CIM.alturaMax)} m los muretes pasan a ser muros de sótano (cálculo específico).`);
    for (const l of LADOS) if (c.vuelos[l] > VUELO_MAX + 1e-6) add('error', 'CIMENTACION', `El forjado sanitario vuela ${fmt(c.vuelos[l])} m por el lado ${l}: el sistema CUEVA admite como máximo ${fmt(VUELO_MAX)} m de voladizo (sistema.voladizoMax = 1500 mm).`);
    if (!M.apoyo.size) add('error', 'CIMENTACION', 'Con esos vuelos no queda superficie de apoyo para los muretes: reduce los vuelos.', { planta: 0 });
    else {
      const nMax = Math.floor(VUELO_MAX / T + 1e-6); const lejos = [];
      for (const k of M.huella) { if (M.apoyo.has(k)) continue; const [i, j] = k.split(',').map(Number); let ok = false; for (let a = -nMax; a <= nMax && !ok; a++) for (let b = -nMax; b <= nMax && !ok; b++) ok = M.apoyo.has(K(i + a, j + b)); if (!ok) lejos.push(k); }
      if (lejos.length) { const cel = celdasPlanta(m.plantas[0]).m; add('error', 'CIMENTACION', `${lejos.length} celdas de la planta baja quedan a más de ${fmt(VUELO_MAX)} m de un murete (alas estrechas que los vuelos dejan sin apoyo): reduce los vuelos.`, { planta: 0, ids: [...new Set(lejos.map((k) => cel.get(k)?.id).filter(Boolean))] }); }
    }
    const fuera = LADOS.filter((l) => c.vuelos[l] > 0 && Math.abs(c.vuelos[l] / TE - Math.round(c.vuelos[l] / TE)) > 1e-6);
    if (fuera.length) add('info', 'TRAMA', `Muretes del forjado sanitario fuera de la trama estructural de 0,75 m (vuelo ${fuera.map((l) => `${l} ${fmt(c.vuelos[l])} m`).join(', ')}): pieza especial de borde.`);
    const p0 = m.plantas[0]; const gar = p0.estancias.filter((e) => e.tipo === 'garaje');
    if (gar.length) add('aviso', 'CIMENTACION', `El garaje queda a ${fmt(cotaPB(m))} m sobre el terreno: necesita rampa de vehículos (≤ 16 %) o resolver esa zona sobre losa.`, { planta: 0, ids: gar.map((e) => e.id) });
    if (p0.estancias.some((e) => e.tipo === 'piscina')) add('info', 'CIMENTACION', 'La piscina queda sobre el terreno, fuera del forjado sanitario.', { planta: 0 });
    // la puerta de entrada (y las demás puertas exteriores) necesitan un acceso
    const pts = puntosAcceso(m, g0);
    for (const pa of pts) {
      const sirve = X.some((e) => e.ref === pa.ref || cubre(e, pa));
      if (!sirve) add(pa.entrada ? 'error' : 'aviso', 'ACCESO', pa.entrada ? `La puerta de entrada queda a ${fmt(cotaPB(m))} m del terreno: añade una escalera, rampa o plataforma.` : `Una puerta a ${pa.tipo === 'ventanal' ? 'la terraza' : 'fachada'} (lado ${pa.lado}) queda a ${fmt(cotaPB(m))} m del terreno sin escalera ni rampa.`, { planta: 0, ...(pa.est ? { ids: [pa.est] } : {}) });
    }
    const ent = pts.find((pa) => pa.entrada); if (ent && !X.some((e) => e.tipo === 'rampa' && (e.ref === ent.ref || cubre(e, ent)))) add('info', 'ACCESIBILIDAD', `La entrada salva ${fmt(cotaPB(m))} m con peldaños: para un acceso accesible cámbiala por rampa (≤ 6–10 %, ancho 1,20 m, mesetas de 1,50 m).`, { planta: 0 });
  }
  // elementos: avisos propios y choques con la casa
  const cel = m.plantas?.[0] ? celdasPlanta(m.plantas[0]).m : new Map();
  for (const e of X) {
    const nombre = EXTERIORES_TIPOS[e.tipo] + (e.auto ? (e.entrada ? ' de la entrada' : '') : '');
    for (const a of e.avisos) add('aviso', 'ACCESO_EXT', `${nombre}: ${a}.`, { planta: 0 });
    const choca = e.piezas.some((q) => { for (let i = Math.floor(q.x / T + 1e-6); i < Math.ceil((q.x + q.w) / T - 1e-6); i++) for (let j = Math.floor(q.y / T + 1e-6); j < Math.ceil((q.y + q.h) / T - 1e-6); j++) { const o = cel.get(K(i, j)); if (o && esInt(o.tipo)) return true; } return false; });
    if (choca) add('aviso', 'ACCESO_EXT', `${nombre} invade la planta baja: colócala por fuera de la casa.`, { planta: 0 });
  }
}
// ¿El elemento arranca junto al punto de acceso (mismo borde, solapando la puerta)?
function cubre(e, pa) {
  if (e.lado !== pa.lado) return false; const hor = pa.lado === 'N' || pa.lado === 'S'; const w = (e.ancho || 1) / 2 + 0.3;
  return hor ? Math.abs(e.y - pa.y) < 0.2 && Math.abs(e.x - pa.x) <= w : Math.abs(e.x - pa.x) < 0.2 && Math.abs(e.y - pa.y) <= w;
}

// ---------- medición (core/presupuesto.mjs) ----------
export function medicionCimentacion(m) {
  const out = {};
  if (esSanitario(m)) { const M = muretes(m); Object.assign(out, { muretes: M.ml, muretesIntermedios: M.mlInt, forjadoSanitario: M.area, rejillas: M.rejillas.length, alturaCamara: M.cimentacion.altura }); }
  const X = (m.exteriores || []).length || esSanitario(m) ? accesosExteriores(m) : [];
  if (X.length) { const s = (k) => r3(X.reduce((a, e) => a + (e.medicion[k] || 0), 0)); Object.assign(out, { accesosExt: X.length, peldanosExt: s('peldanos'), peldanosExtMl: s('peldanosMl'), rampaExt: s('rampa'), mesetaExt: r3(s('meseta') + s('plataforma')), barandillaExt: s('barandilla') }); }
  return out;
}

// ---------- transformaciones del modelo (espejo, giro, estirar, recolocar) ----------
const giraRef = (ref, mapa) => { const p = String(ref).split(':'); if (p.length === 3 && mapa[p[1]]) p[1] = mapa[p[1]]; return p.join(':'); };
// mapa: lados (p. ej. { N: 'E', E: 'S', S: 'O', O: 'N' }); f(x, y) → [x', y'] para los elementos manuales; espejo: invierte izq/der
export function transformarCimentacion(m, mapa, f, espejo = false) {
  if (m.cimentacion?.vuelos && typeof m.cimentacion.vuelos === 'object') { const v = m.cimentacion.vuelos, n = {}; for (const l of LADOS) if (v[l] != null) n[mapa[l] || l] = v[l]; m.cimentacion.vuelos = Object.fromEntries(LADOS.filter((l) => n[l] != null).map((l) => [l, n[l]])); }
  if (Array.isArray(m.exteriores)) for (const e of m.exteriores) {
    if (!e || typeof e !== 'object') continue;
    if (e.ref) { e.ref = giraRef(e.ref, mapa); continue; }
    if (f && Number.isFinite(e.x) && Number.isFinite(e.y)) { const [x, y] = f(e.x, e.y); e.x = r3(x); e.y = r3(y); }
    if (e.lado) e.lado = mapa[e.lado] || e.lado;
    if (espejo && (e.sentido === 'izq' || e.sentido === 'der')) e.sentido = e.sentido === 'izq' ? 'der' : 'izq';
  }
}
export function desplazarExteriores(m, f) { if (Array.isArray(m.exteriores)) for (const e of m.exteriores) if (e && !e.ref && Number.isFinite(e.x) && Number.isFinite(e.y)) { const [x, y] = f(e.x, e.y); e.x = r3(x); e.y = r3(y); } }

// ---------- edición (una sola lógica para Diseño, la API y el MCP) ----------
const CAMPOS_EXT = ['tipo', 'ancho', 'fondo', 'huella', 'pendiente', 'altura', 'sentido', 'barandilla', 'descansillo', 'escalera'];
// cambios: { tipo?, altura?, vuelos?: { N?, S?, E?, O? }, vuelo? (todos), murete?: { espesor?, material? }, accesosAuto? }
export function setCimentacion(m, cambios = {}) {
  const c = cimentacionDe(m); const n = { ...c, vuelos: { ...c.vuelos }, murete: { ...c.murete } };
  if (cambios.tipo) n.tipo = cambios.tipo;
  if (cambios.altura != null) n.altura = +cambios.altura;
  if (cambios.vuelo != null) for (const l of LADOS) n.vuelos[l] = +cambios.vuelo;
  if (cambios.vuelos && typeof cambios.vuelos === 'object') for (const l of LADOS) if (cambios.vuelos[l] != null) n.vuelos[l] = +cambios.vuelos[l];
  if (cambios.murete && typeof cambios.murete === 'object') Object.assign(n.murete, cambios.murete);
  if (cambios.accesosAuto != null) { if (cambios.accesosAuto) delete n.accesosAuto; else n.accesosAuto = false; }
  m.cimentacion = normalizarCimentacion(n); return m.cimentacion;
}
const limpiarCampos = (d) => Object.fromEntries(CAMPOS_EXT.filter((k) => d[k] !== undefined).map((k) => [k, d[k]]));
// Añade un elemento. Con `ref` (o sin posición, en la puerta de entrada si tiene acceso automático) sustituye al automático.
export function anadirExterior(m, d = {}) {
  if (!EXTERIORES_TIPOS[d.tipo]) throw new Error('Tipo de complemento exterior desconocido: ' + d.tipo + '. Tipos: ' + Object.keys(EXTERIORES_TIPOS).join(', '));
  const lista = Array.isArray(m.exteriores) ? m.exteriores : (m.exteriores = []);
  let ref = d.ref || null; let pos = d.x != null && d.y != null && DIR[d.lado] ? { x: +d.x, y: +d.y, lado: d.lado } : null;
  if (!ref && !pos) {
    const pts = puntosAcceso(m); const ent = pts.find((q) => q.entrada) || pts[0];
    const auto = esSanitario(m) && cimentacionDe(m).accesosAuto !== false;
    if (ent && auto && !lista.some((e) => e.ref === ent.ref && !e.quitar)) ref = ent.ref;
    else if (ent) pos = { x: ent.x, y: ent.y, lado: ent.lado };
    else throw new Error('Indica dónde: «x», «y» (arranque sobre el borde de la casa) y «lado» (N, S, E, O)');
  }
  if (ref) { const i = lista.findIndex((e) => e.ref === ref); const q = { id: i >= 0 ? lista[i].id : uid('x'), ref, ...limpiarCampos(d) }; if (i >= 0) lista[i] = q; else lista.push(q); }
  else lista.push({ id: uid('x'), ...pos, ...limpiarCampos(d) });
  m.exteriores = normalizarExteriores(lista);
  const id = ref ? 'auto:' + ref : m.exteriores[m.exteriores.length - 1].id;
  return accesosExteriores(m).find((e) => e.id === id) || null;
}
// id: el de un elemento manual o «auto:<ref>» de uno automático (se guarda como anulación)
export function editarExterior(m, id, d = {}) {
  const lista = Array.isArray(m.exteriores) ? m.exteriores : (m.exteriores = []); id = String(id || '');
  if (id.startsWith('auto:')) {
    const ref = id.slice(5); if (!accesosExteriores(m).some((e) => e.id === id) && !lista.some((e) => e.ref === ref)) throw new Error('Complemento no encontrado: ' + id);
    const i = lista.findIndex((e) => e.ref === ref); const q = { ...(i >= 0 ? lista[i] : { id: uid('x'), ref }), ...limpiarCampos(d) }; delete q.quitar;
    if (i >= 0) lista[i] = q; else lista.push(q);
  } else {
    const e = lista.find((q) => q.id === id && !q.ref); if (!e) throw new Error('Complemento no encontrado: ' + id);
    Object.assign(e, limpiarCampos(d)); for (const k of ['x', 'y']) if (d[k] != null) e[k] = +d[k]; if (DIR[d.lado]) e.lado = d.lado;
  }
  m.exteriores = normalizarExteriores(lista); return accesosExteriores(m).find((e) => e.id === id) || null;
}
export function quitarExterior(m, id) {
  const lista = Array.isArray(m.exteriores) ? m.exteriores : []; id = String(id || '');
  if (id.startsWith('auto:')) { const ref = id.slice(5); const i = lista.findIndex((e) => e.ref === ref); const q = { id: i >= 0 ? lista[i].id : uid('x'), ref, quitar: true }; if (i >= 0) lista[i] = q; else lista.push(q); }
  else { const n = lista.length; const r = lista.filter((e) => e.id !== id); if (r.length === n) throw new Error('Complemento no encontrado: ' + id); lista.length = 0; lista.push(...r); }
  m.exteriores = lista; if (!m.exteriores.length) delete m.exteriores; return true;
}
// Vuelve a los accesos automáticos (quita las anulaciones; los manuales se quedan salvo «todo»).
export function exterioresAuto(m, todo = false) { if (Array.isArray(m.exteriores)) m.exteriores = todo ? [] : m.exteriores.filter((e) => !e.ref); if (!m.exteriores?.length) delete m.exteriores; return accesosExteriores(m); }
