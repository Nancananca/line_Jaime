// Parcela, implantación, comprobaciones urbanísticas geométricas, sol y plano de emplazamiento.
// Marco del sitio: x → este, y → norte (metros). parcela.norte = azimut del eje +y (0 si +y es el norte real).
// casa = { x, y, giro }: centro de la huella del modelo en el sitio y giro en grados (horario).
import { r3, fmt } from './trama.mjs';
import { TIPOS, esInt } from './catalogo.mjs';
import { bbox, celdasPlanta, rectangulos, superficies, derivar } from './geometria.mjs';
import { flechaNorte } from './planos.mjs';
import { invertirCerramientos, resolverCerramientos, tramosCerramiento, svgCerramientos } from './cerramientos.mjs';

const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
export const areaPoli = (p) => Math.abs(p.reduce((a, q, i) => { const n = p[(i + 1) % p.length]; return a + q[0] * n[1] - n[0] * q[1]; }, 0) / 2);
export const centroide = (p) => { let a = 0, cx = 0, cy = 0; p.forEach((q, i) => { const n = p[(i + 1) % p.length]; const f = q[0] * n[1] - n[0] * q[1]; a += f; cx += (q[0] + n[0]) * f; cy += (q[1] + n[1]) * f; }); return a ? [cx / (3 * a), cy / (3 * a)] : p[0]; };
export function dentroPoli(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c; } return c; }
// Dentro o sobre el borde (tolerancia 1 cm): una casa enrasada con las medianeras está dentro de la parcela.
export const dentroOBorde = (pt, poly, tol = 0.01) => dentroPoli(pt, poly) || poly.some((a, k) => distSeg(pt, a, poly[(k + 1) % poly.length]) <= tol);
export function distSeg(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1]; const l2 = dx * dx + dy * dy; const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }

export function parcelaRect(frente = 15, fondo = 30) {
  return { poligono: [[0, 0], [frente, 0], [frente, fondo], [0, fondo]], frente: 0, norte: 0, origen: 'manual' };
}
// Limpia el anillo: quita vértices no numéricos, repetidos consecutivos y el de cierre (Catastro los trae a veces).
// Los índices de lindero (frente, medianeras, cerramientos) se reasignan: el lado i pasa al del vértice que lo
// representa, que es el siguiente lado no degenerado.
function limpiarAnillo(p) {
  const P0 = Array.isArray(p.poligono) ? p.poligono : []; const n0 = P0.length; const nuevo = [], rep = new Array(n0).fill(-1); const igual = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
  const num = (x) => (typeof x === 'number' || (typeof x === 'string' && x.trim() !== '')) && Number.isFinite(Number(x));
  P0.forEach((q, k) => { if (!Array.isArray(q) || !num(q[0]) || !num(q[1])) { rep[k] = nuevo.length ? nuevo.length - 1 : -1; return; } const v = [Number(q[0]), Number(q[1])]; if (nuevo.length && igual(nuevo[nuevo.length - 1], v)) rep[k] = nuevo.length - 1; else { nuevo.push(v); rep[k] = nuevo.length - 1; } });
  if (nuevo.length > 1 && igual(nuevo[0], nuevo[nuevo.length - 1])) { const u = nuevo.length - 1; nuevo.pop(); for (let k = 0; k < n0; k++) if (rep[k] === u) rep[k] = 0; }
  for (let k = 0; k < n0; k++) if (rep[k] < 0) rep[k] = 0;
  const cambio = nuevo.length !== n0 || P0.some((q, k) => !Array.isArray(q) || q[0] !== nuevo[rep[k]]?.[0] || q[1] !== nuevo[rep[k]]?.[1]);
  if (nuevo.length < 3 || Math.abs(nuevo.reduce((a, q, i) => { const n = nuevo[(i + 1) % nuevo.length]; return a + q[0] * n[1] - n[0] * q[1]; }, 0)) < 1e-6) { // sin superficie: parcela tipo
    Object.assign(p, parcelaRect(15, 30)); p.medianeras = []; delete p.cerramientos; return;
  }
  if (!cambio) return;
  const m = (i) => (Number.isInteger(i) && i >= 0 && i < n0 ? rep[i] : 0);
  p.poligono = nuevo; if (p.frente != null) p.frente = m(p.frente);
  if (Array.isArray(p.medianeras)) p.medianeras = [...new Set(p.medianeras.map(m))];
  if (p.cerramientos && typeof p.cerramientos === 'object') { const c = p.cerramientos; const lados = {}; for (const [k, v] of Object.entries(c.lados || {})) lados[m(Number(k))] = v; p.cerramientos = { ...c, lados, puertas: (c.puertas || []).map((d) => ({ ...d, lado: m(d.lado) })) }; }
}
export function normalizarParcela(p) {
  p = p || {}; if (!p.poligono || p.poligono.length < 3) Object.assign(p, parcelaRect(15, 30));
  limpiarAnillo(p);
  // sentido antihorario
  const s = p.poligono.reduce((a, q, i) => { const n = p.poligono[(i + 1) % p.poligono.length]; return a + q[0] * n[1] - n[0] * q[1]; }, 0);
  if (s < 0) { const antes = p.poligono.map((q) => q.slice()); const n = antes.length; p.poligono.reverse(); if (p.frente != null) p.frente = (n - 2 - p.frente + n) % n;
    if (Array.isArray(p.medianeras)) p.medianeras = p.medianeras.map((i) => (((n - 2 - i) % n) + n) % n); // los índices de lindero siguen al polígono invertido
    if (p.cerramientos) p.cerramientos = invertirCerramientos(p.cerramientos, antes); }
  p.frente = Math.min(p.poligono.length - 1, p.frente || 0); p.norte = p.norte || 0;
  p.retranqueos = Object.assign({ frente: 5, resto: 3 }, p.retranqueos || {}); p.medianeras = p.medianeras || [];
  p.normativa = Object.assign({ ocupacionMax: null, edificabilidadMax: null, plantasMax: 2 }, p.normativa || {});
  p.area = r3(areaPoli(p.poligono));
  return p;
}

export function transformador(modelo, casa) {
  const b = bbox(modelo); const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; const g = rad(casa.giro || 0), c = Math.cos(g), s = Math.sin(g);
  return (mx, my) => { const dx = mx - cx, dy = -(my - cy); return [casa.x + dx * c + dy * s, casa.y - dx * s + dy * c]; };
}
// Inversa de transformador: del sitio (x este, y norte) al marco del modelo (x derecha, y abajo).
// matriz: la misma transformación como matrix(a b c d e f) de SVG (sitio → modelo), para dibujar en el editor.
export function inversoTransformador(modelo, casa) {
  const b = bbox(modelo); const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; const g = rad(casa.giro || 0), c = Math.cos(g), s = Math.sin(g);
  const f = (X, Y) => { const u = X - casa.x, v = Y - casa.y; return [cx + u * c - v * s, cy - (u * s + v * c)]; };
  f.matriz = [c, -s, -s, -c, cx - c * casa.x + s * casa.y, cy + s * casa.x + c * casa.y];
  return f;
}
// Huella por planta en coordenadas del sitio: [{planta, rects:[[4 puntos]]}]
export function huellaSitio(modelo, casa) {
  const tr = transformador(modelo, casa);
  return modelo.plantas.map((p, pi) => {
    const keys = [...celdasPlanta(p).m].filter(([, e]) => esInt(e.tipo) || e.tipo === 'porche').map(([k]) => k);
    const ext = [...celdasPlanta(p).m].filter(([, e]) => e.tipo === 'terraza').map(([k]) => k);
    const q = (r) => [tr(r.x, r.y), tr(r.x + r.w, r.y), tr(r.x + r.w, r.y + r.h), tr(r.x, r.y + r.h)];
    return { planta: pi, rects: rectangulos(keys).map(q), terrazas: rectangulos(ext).map(q) };
  });
}
export const azimutLado = (lado, parcela, casa) => (((parcela.norte || 0) + (casa.giro || 0) + { N: 0, E: 90, S: 180, O: 270 }[lado]) % 360 + 360) % 360;
export const rumbo = (az) => ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(az / 45) % 8];

export function comprobar(modelo, parcela, casa) {
  const P = parcela.poligono; const H = huellaSitio(modelo, casa); const pts = H.flatMap((h) => h.rects.flat());
  const n = P.length; const lados = [];
  let dentro = pts.length > 0 && pts.every((p) => dentroOBorde(p, P)); let retOk = true, dmin = Infinity;
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n]; const d = pts.length ? Math.min(...pts.map((p) => distSeg(p, a, b))) : 0;
    const med = (parcela.medianeras || []).includes(i); const req = med ? 0 : i === parcela.frente ? parcela.retranqueos.frente : parcela.retranqueos.resto;
    const ok = d >= req - 0.01; if (!ok) retOk = false; if (!med) dmin = Math.min(dmin, d);
    lados.push({ i, largo: r3(Math.hypot(b[0] - a[0], b[1] - a[1])), distancia: r3(d), requerido: req, ok, frente: i === parcela.frente, medianera: med });
  }
  const S = superficies(modelo); const area = areaPoli(P);
  const g0 = derivar(modelo, 0); const entrada = g0.huecos.find((h) => h.entrada);
  const or = {}; for (const l of ['N', 'E', 'S', 'O']) { const az = azimutLado(l, parcela, casa); or[l] = { azimut: r3(az), rumbo: rumbo(az) }; }
  // lado principal de luz del salón
  const salon = modelo.plantas.flatMap((p, pi) => p.estancias.map((e) => ({ e, pi }))).find((x) => x.e.tipo === 'salon');
  let luzSalon = null;
  if (salon) { const g = derivar(modelo, salon.pi); const hs = g.huecos.filter((h) => h.est === salon.e.id && h.tipo !== 'puerta').sort((a, b) => b.ancho * b.alto - a.ancho * a.alto); if (hs[0]) luzSalon = { lado: hs[0].lado, ...or[hs[0].lado] }; }
  return {
    dentro, retranqueosOk: dentro && retOk, dmin: r3(isFinite(dmin) ? dmin : 0), lados,
    areaParcela: r3(area), huella: S.huella, ocupacion: area > 0 ? r3((S.huella / area) * 100) : 0, edificabilidad: area > 0 ? r3(S.plantas.reduce((a, p) => a + p.construida, 0) / area) : 0,
    ocupacionMax: parcela.normativa.ocupacionMax, edificabilidadMax: parcela.normativa.edificabilidadMax, plantasMax: parcela.normativa.plantasMax,
    orientaciones: or, accesoA: entrada ? or[entrada.lado] : null, luzSalon, evidencia: 'concepto',
  };
}

// Colocación automática: el acceso mira al frente de parcela, a la distancia del retranqueo, centrada.
export function colocarAuto(modelo, parcela) {
  const P = parcela.poligono, n = P.length; let f = parcela.frente || 0;
  for (let k = 0; k < n && Math.hypot(P[(f + 1) % n][0] - P[f][0], P[(f + 1) % n][1] - P[f][1]) < 1e-9; k++) f = (f + 1) % n; // lado degenerado: el siguiente
  const a = P[f], b = P[(f + 1) % n];
  const ex = [b[0] - a[0], b[1] - a[1]]; const L = Math.hypot(...ex) || 1; ex[0] /= L; ex[1] /= L;
  let nin = [-ex[1], ex[0]]; const c = centroide(P); if ((c[0] - a[0]) * nin[0] + (c[1] - a[1]) * nin[1] < 0) nin = [ex[1], -ex[0]]; // normal hacia dentro
  // el lado de acceso del modelo debe mirar hacia fuera (−nin)
  const azFuera = (deg(Math.atan2(-nin[0], -nin[1])) + 360) % 360; // azimut en el marco del sitio (0 = +y)
  const giro0 = (azFuera - { N: 0, E: 90, S: 180, O: 270 }[modelo.acceso || 'N'] + 360) % 360;
  const bb = bbox(modelo); const fondo = ['N', 'S'].includes(modelo.acceso || 'N') ? bb.h : bb.w;
  let mejor = null;
  for (const extra of [0, 0.5, 1, 2, 3, 5]) for (const lat of [0, -2, 2, -4, 4, -6, 6]) {
    const d = parcela.retranqueos.frente + extra + fondo / 2;
    const casa = { x: r3((a[0] + b[0]) / 2 + ex[0] * lat + nin[0] * d), y: r3((a[1] + b[1]) / 2 + ex[1] * lat + nin[1] * d), giro: r3(giro0) };
    const k = comprobar(modelo, parcela, casa); const sc = (k.retranqueosOk ? 1000 : k.dentro ? 500 : 0) - extra * 10 - Math.abs(lat) * 5;
    if (!mejor || sc > mejor.sc) mejor = { sc, casa }; if (k.retranqueosOk && !extra && !lat) return casa;
  }
  return mejor.casa;
}

// Ajustes de implantación (Diseño y MCP). modo:
//   'frente'        la casa a la distancia del retranqueo de calle
//   'lindero'       al lindero `lado` (a su retranqueo; 0 si es medianera: adosada)
//   'centrar_ancho' a igual distancia de los dos linderos contiguos al frente
//   'centrar'       centro de la huella en el centroide de la parcela
//   'paralelo'      gira lo mínimo para que la casa quede paralela a la calle (con el acceso hacia ella si es posible)
//   'auto'          colocarAuto
export function alinearCasa(modelo, parcela, casa, modo, lado) {
  const P = parcela.poligono, n = P.length; const f = parcela.frente || 0; let c = { x: casa.x, y: casa.y, giro: casa.giro || 0 };
  const geo = (i) => { const a = P[i], b = P[(i + 1) % n]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; let nin = [-u[1], u[0]]; const ce = centroide(P); if ((ce[0] - a[0]) * nin[0] + (ce[1] - a[1]) * nin[1] < 0) nin = [u[1], -u[0]]; return { a, b, u, nin }; };
  const req = (i) => ((parcela.medianeras || []).includes(i) ? 0 : i === f ? parcela.retranqueos?.frente ?? 5 : parcela.retranqueos?.resto ?? 3);
  const dist = (i, cc) => { const pts = huellaSitio(modelo, cc).flatMap((h) => h.rects.flat()); const { a, b } = geo(i); return pts.length ? Math.min(...pts.map((p) => distSeg(p, a, b))) : 0; };
  const pegar = (i, obj) => { const { nin } = geo(i); for (let k = 0; k < 4; k++) { const d = dist(i, c) - obj; if (Math.abs(d) < 0.003) break; c = { ...c, x: c.x - nin[0] * d, y: c.y - nin[1] * d }; } };
  if (modo === 'auto') return colocarAuto(modelo, parcela);
  if (modo === 'frente') pegar(f, req(f));
  else if (modo === 'lindero') { const i = Number(lado); if (!(i >= 0 && i < n)) throw new Error('Lindero no válido: ' + lado); pegar(i, req(i)); }
  else if (modo === 'centrar') { const ce = centroide(P); c = { ...c, x: ce[0], y: ce[1] }; }
  else if (modo === 'centrar_ancho') {
    const iA = (f - 1 + n) % n, iB = (f + 1) % n; const { u } = geo(f);
    for (let k = 0; k < 5; k++) { const s = (dist(iB, c) - dist(iA, c)) / 2; if (Math.abs(s) < 0.003) break; c = { ...c, x: c.x + u[0] * s, y: c.y + u[1] * s }; }
  } else if (modo === 'paralelo') {
    const { nin } = geo(f); const azFuera = (deg(Math.atan2(-nin[0], -nin[1])) + 360) % 360; const g0 = (azFuera - { N: 0, E: 90, S: 180, O: 270 }[modelo.acceso || 'N'] + 360) % 360;
    let mejor = g0, dmin = Infinity; for (let k = 0; k < 4; k++) { const g = (g0 + k * 90) % 360; let d = Math.abs(g - c.giro) % 360; d = Math.min(d, 360 - d); if (d < dmin - 1e-6) { dmin = d; mejor = g; } }
    c = { ...c, giro: mejor };
  } else throw new Error('Modo de alineación desconocido: ' + modo);
  return { x: r3(c.x), y: r3(c.y), giro: r3(((c.giro % 360) + 360) % 360) };
}

// ---------- sol ----------
export function sol(lat, lon, fecha) { // fecha: Date (UTC). Devuelve azimut (0 = N, horario) y elevación en grados.
  const d = (fecha.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;
  const g = rad((357.529 + 0.98560028 * d) % 360), q = (280.459 + 0.98564736 * d) % 360;
  const L = rad(q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)); const e = rad(23.439 - 0.00000036 * d);
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24; const lst = rad(((gmst * 15 + lon) % 360 + 360) % 360);
  const ha = lst - ra, la = rad(lat);
  const el = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(ha));
  return { azimut: (deg(az) + 360) % 360, elevacion: deg(el) };
}
// Horas de sol directo que recibe cada fachada el día 21 de diciembre, marzo y junio.
export function soleamiento(parcela, casa, lat = 40.4, lon = -3.7) {
  const out = {}; const dias = { invierno: [11, 21], equinoccio: [2, 21], verano: [5, 21] };
  for (const l of ['N', 'E', 'S', 'O']) { out[l] = {}; const az = azimutLado(l, parcela, casa);
    for (const [k, [m, d]] of Object.entries(dias)) { let h = 0; for (let t = 0; t < 24 * 4; t++) { const s = sol(lat, lon, new Date(Date.UTC(2026, m, d, 0, t * 15))); let da = Math.abs(s.azimut - az); if (da > 180) da = 360 - da; if (s.elevacion > 3 && da < 80) h += 0.25; } out[l][k] = h; } }
  return out;
}

// ---------- plano de emplazamiento ----------
export function planoEmplazamiento(modelo, parcela, casa, opt = {}) {
  const o = Object.assign({ k: 14, margen: 6, orto: null, entorno: true }, opt);
  const P = parcela.poligono; const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
  const x0 = Math.min(...xs) - o.margen, x1 = Math.max(...xs) + o.margen, y0 = Math.min(...ys) - o.margen, y1 = Math.max(...ys) + o.margen;
  const W = x1 - x0, H = y1 - y0; const X = (x) => r3(x - x0), Y = (y) => r3(y1 - y); const pt = (p) => X(p[0]) + ' ' + Y(p[1]); const poly = (q) => q.map(pt).join(' ');
  const S = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r3(W)} ${r3(H)}" width="${Math.round(W * o.k)}" height="${Math.round(H * o.k)}" font-family="Manrope, 'Segoe UI', Arial, sans-serif">`, `<rect width="${r3(W)}" height="${r3(H)}" fill="#f7f7f3"/>`];
  if (o.orto && parcela.orto) { const b = parcela.orto.bbox; S.push(`<image href="${o.orto}" x="${X(b[0])}" y="${Y(b[3])}" width="${r3(b[2] - b[0])}" height="${r3(b[3] - b[1])}" opacity=".55" preserveAspectRatio="none"/>`); }
  if (o.entorno && parcela.entorno) {
    for (const v of parcela.entorno.parcelas || []) S.push(`<polygon points="${poly(v)}" fill="none" stroke="#a9a79c" stroke-width=".12"/>`);
    for (const e of parcela.entorno.edificios || []) S.push(`<polygon points="${poly(e.poly)}" fill="#d8d4c8" fill-opacity=".8" stroke="#8d8c84" stroke-width=".1"/>`);
  }
  S.push(`<polygon points="${poly(P)}" fill="#fff" fill-opacity="${o.orto && parcela.orto ? 0.35 : 0.9}" stroke="#12130f" stroke-width="${o.cerramientos !== false ? '.1' : '.28'}"/>`); // con cerramientos, el lindero lo dibujan sus muros y vallas
  // retranqueos: paralela interior a cada lindero
  const c = centroide(P);
  P.forEach((a, i) => {
    const b = P[(i + 1) % P.length]; const med = (parcela.medianeras || []).includes(i); const req = med ? 0 : i === parcela.frente ? parcela.retranqueos.frente : parcela.retranqueos.resto;
    const ex = [b[0] - a[0], b[1] - a[1]]; const L = Math.hypot(...ex); let nn = [-ex[1] / L, ex[0] / L]; if ((c[0] - a[0]) * nn[0] + (c[1] - a[1]) * nn[1] < 0) nn = [-nn[0], -nn[1]];
    if (req > 0) S.push(`<path d="M${pt([a[0] + nn[0] * req, a[1] + nn[1] * req])}L${pt([b[0] + nn[0] * req, b[1] + nn[1] * req])}" stroke="#7d4d38" stroke-width=".1" stroke-dasharray=".6 .35"/>`);
    const m = [(a[0] + b[0]) / 2 - nn[0] * 1.3, (a[1] + b[1]) / 2 - nn[1] * 1.3]; let ang = -deg(Math.atan2(ex[1], ex[0])); if (ang > 90 || ang < -90) ang += 180;
    S.push(`<text transform="translate(${pt(m)}) rotate(${r3(ang)})" text-anchor="middle" font-size="1" fill="#55564f">${fmt(L)} m${i === parcela.frente ? ' · FRENTE' : med ? ' · MEDIANERA' : ''}</text>`);
  });
  // cerramientos de parcela y sus puertas (core/cerramientos.mjs), en coordenadas del sitio
  if (o.cerramientos !== false) { try { const cfg = resolverCerramientos(parcela, modelo, casa); if (cfg) S.push(`<g transform="matrix(1 0 0 -1 ${r3(-x0)} ${r3(y1)})">${svgCerramientos(tramosCerramiento(parcela, cfg))}</g>`); } catch { /* sin cerramientos */ } }
  const Hs = huellaSitio(modelo, casa);
  for (const h of Hs) for (const r of h.terrazas) S.push(`<polygon points="${poly(r)}" fill="#ecebe4" stroke="#12130f" stroke-width=".08" stroke-dasharray=".3 .2"/>`);
  // piezas del jardín (piscina, barbacoa cubierta, chill out, fogonero): también se ven dentro de la parcela
  { const tr = transformador(modelo, casa); const JARDIN = { piscina: '#bfe0e8', quincho: '#e6dccb', chillout: '#e9e4d2', fogonero: '#e8dccf' };
    for (const e of modelo.plantas[0]?.estancias || []) if (JARDIN[e.tipo]) S.push(`<polygon points="${poly([tr(e.x, e.y), tr(e.x + e.w, e.y), tr(e.x + e.w, e.y + e.h), tr(e.x, e.y + e.h)])}" fill="${JARDIN[e.tipo]}" stroke="#12130f" stroke-width=".08"/>`); }
  Hs.forEach((h, i) => { for (const r of h.rects) S.push(`<polygon points="${poly(r)}" fill="${i ? '#12130f' : '#55564f'}" fill-opacity="${i ? 0.9 : 0.75}" stroke="#12130f" stroke-width=".06"/>`); });
  // entrada
  const g0 = derivar(modelo, 0); const en = g0.huecos.find((h) => h.entrada);
  if (en) { const tr = transformador(modelo, casa); const d = { N: [0, -1.6], S: [0, 1.6], E: [1.6, 0], O: [-1.6, 0] }[en.lado]; const p1 = tr(en.x + d[0], en.y + d[1]), p2 = tr(en.x + d[0] * 0.3, en.y + d[1] * 0.3);
    S.push(`<path d="M${pt(p1)}L${pt(p2)}" stroke="#12130f" stroke-width=".22"/><circle cx="${X(p1[0])}" cy="${Y(p1[1])}" r=".55" fill="#dfff57" stroke="#12130f" stroke-width=".12"/>`); }
  S.push(`<g transform="scale(${r3(W / 30)})">` + flechaNorte(30 - 2.2, 2.6, -(parcela.norte || 0), 1.1).replace(/font-size="[^"]+"/, 'font-size=".8"') + '</g>');
  // escala gráfica
  S.push(`<g transform="translate(${r3(1.5)} ${r3(H - 1.6)})"><path d="M0 0h10M0 -.3v.6M5 -.3v.6M10 -.3v.6" stroke="#12130f" stroke-width=".12"/><text x="0" y="-.6" font-size=".8" fill="#12130f">0</text><text x="10" y="-.6" font-size=".8" text-anchor="end" fill="#12130f">10 m</text></g>`);
  S.push('</svg>');
  return { svg: S.join('\n'), w: W, h: H, x0, y1, k: o.k };
}

// ---------- UTM (ETRS89 huso 30, EPSG:25830) → lat/lon ----------
export function utmALatLon(E, N, huso = 30) {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9996; const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const x = E - 500000, M = N / k0; const mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const p1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) + ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu);
  const C1 = ep2 * Math.cos(p1) ** 2, T1 = Math.tan(p1) ** 2, N1 = a / Math.sqrt(1 - e2 * Math.sin(p1) ** 2), R1 = (a * (1 - e2)) / (1 - e2 * Math.sin(p1) ** 2) ** 1.5, D = x / (N1 * k0);
  const lat = p1 - ((N1 * Math.tan(p1)) / R1) * ((D * D) / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4) / 24 + ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6) / 720);
  const lon = (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5) / 120) / Math.cos(p1);
  return { lat: deg(lat), lon: (huso * 6 - 183) + deg(lon) };
}
