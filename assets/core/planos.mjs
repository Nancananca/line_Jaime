// Planos vectoriales (SVG) generados desde el modelo: plantas, alzados, sección y emplazamiento.
// Estilo gráfico Nanca: muro macizo casi negro, mobiliario en línea fina, exteriores rayados, fondo blanco.
import { T, r3, fmt, E_FACHADA, E_TABIQUE, E_FORJADO, H_PLANTA } from './trama.mjs';
import { TIPOS, esInt, esExt, esDorm, grupo, CUBIERTA_MATERIALES } from './catalogo.mjs';
import { mobiliario, subeEscalera, barridoPuerta } from './mobiliario.mjs';
import { derivar, bbox, celdasPlanta, superficies, rectangulos, cubierta, esMedianera, alturasCubierta, caidaCubierta, cumbreraEnX } from './geometria.mjs';
import { esSanitario, cotaPB, muretes as muretesSanitario, accesosExteriores, cajaExteriores, cimentacionDe, MURETE_MATERIALES } from './cimentacion.mjs';
import { contextoBordes, bordesPlanta, pergolasPlanta, remateCubierta, LAMAS } from './bordes.mjs';
import { esEdificio, tinteVivienda } from './edificio.mjs';
import { planoSotano, capaSotanoAlzado, capaSotanoSeccion, bajoRasante } from './sotano_planos.mjs'; import { cajaSotano } from './sotano.mjs'; // v.1.6: planta sótano y rampa

const INK = '#12130f', GRIS = '#8d8c84', COTA = '#657351', FINO = '#b9b7ad';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n2 = (v) => r3(v).toFixed(2).replace('.', ',');

// ---------- mobiliario ----------
function ocupados(e, g) { // lados de la estancia con algún hueco o puerta
  const o = { N: [], S: [], E: [], O: [] };
  const lado = (h) => {
    if (h.o === 'h') { if (h.x < e.x || h.x > e.x + e.w) return null; if (Math.abs(h.y - e.y) < 1e-6) return 'N'; if (Math.abs(h.y - e.y - e.h) < 1e-6) return 'S'; }
    else { if (h.y < e.y || h.y > e.y + e.h) return null; if (Math.abs(h.x - e.x) < 1e-6) return 'O'; if (Math.abs(h.x - e.x - e.w) < 1e-6) return 'E'; }
    return null;
  };
  for (const h of g.huecos) { const l = lado(h); if (l) o[l].push(h); }
  for (const p of g.puertas) { const l = lado(p); if (l) o[l].push(p); }
  // un lado «abierto» a otra estancia también cuenta como ocupado
  for (const s of g.segs) if (s.clase === 'abierto' && (s.a.id === e.id || s.b.id === e.id)) {
    const l = s.o === 'h' ? (Math.abs(s.y1 - e.y) < 1e-6 ? 'N' : 'S') : (Math.abs(s.x1 - e.x) < 1e-6 ? 'O' : 'E');
    o[l].push({ abierto: true, ancho: s.len });
  }
  return o;
}
// Marco local: devuelve una función que coloca un rectángulo (a lo largo, fondo) apoyado en el lado dado.
function apoyo(e, lado, m = 0.18) {
  const L = lado === 'N' || lado === 'S' ? e.w : e.h, D = lado === 'N' || lado === 'S' ? e.h : e.w;
  const rect = (u, d, w, h) => { // u: a lo largo desde el inicio, d: separación del muro, w: ancho, h: fondo
    if (lado === 'N') return [e.x + u, e.y + m + d, w, h];
    if (lado === 'S') return [e.x + u, e.y + e.h - m - d - h, w, h];
    if (lado === 'O') return [e.x + m + d, e.y + u, h, w];
    return [e.x + e.w - m - d - h, e.y + u, h, w];
  };
  return { L, D: D - 2 * m, rect };
}
function mejorLado(e, oc, minL, pref = ['N', 'O', 'E', 'S']) {
  const libres = pref.filter((l) => !oc[l].length && (l === 'N' || l === 'S' ? e.w : e.h) >= minL);
  if (libres.length) return libres[0];
  return pref.slice().sort((a, b) => oc[a].length - oc[b].length || ((b === 'N' || b === 'S' ? e.w : e.h) - (a === 'N' || a === 'S' ? e.w : e.h)))[0];
}

function muebles(e, g) {
  const out = []; const oc = ocupados(e, g);
  const R = (r, rx = 0.04, extra = '') => out.push(`<rect x="${r3(r[0])}" y="${r3(r[1])}" width="${r3(r[2])}" height="${r3(r[3])}" rx="${rx}" ${extra}/>`);
  const C = (x, y, r) => out.push(`<circle cx="${r3(x)}" cy="${r3(y)}" r="${r}"/>`);
  const Ln = (x1, y1, x2, y2) => out.push(`<path d="M${r3(x1)} ${r3(y1)}L${r3(x2)} ${r3(y2)}"/>`);
  const cen = (r) => [r[0] + r[2] / 2, r[1] + r[3] / 2];
  const t = e.tipo; const largo = Math.max(e.w, e.h), corto = Math.min(e.w, e.h);
  if (esDorm(t)) {
    const doble = corto >= 2.9; const bw = t === 'dormitorio_principal' && corto >= 3 ? 1.6 : doble ? 1.5 : 0.9;
    const l = mejorLado(e, oc, bw + 0.3); const a = apoyo(e, l); const u = (a.L - bw) / 2;
    R(a.rect(u, 0, bw, 2.0)); R(a.rect(u + 0.08, 0.08, bw - 0.16, 0.45), 0.08);
    if (a.L >= bw + 1.3) { R(a.rect(u - 0.5, 0, 0.42, 0.4)); R(a.rect(u + bw + 0.08, 0, 0.42, 0.4)); }
    // armario en el lado opuesto si cabe
    const op = { N: 'S', S: 'N', E: 'O', O: 'E' }[l];
    if (a.D >= 2.0 + 0.6 + 0.7 && !oc[op].some((h) => !h.abierto && h.tipo !== 'ventana')) { const b = apoyo(e, op); const w = Math.min(2.15, b.L - 1.1); if (w > 0.9) { const r = b.rect(0.15, 0, w, 0.58); R(r); Ln(r[0], r[1], r[0] + r[2], r[1] + r[3]); } }
  } else if (t === 'salon') {
    const l = mejorLado(e, oc, 2.4, ['O', 'E', 'N', 'S']); const a = apoyo(e, l); const sw = Math.min(2.4, a.L - 0.8);
    const u = Math.max(0.3, (a.L * (e.w * e.h >= 22 ? 0.3 : 0.5)) - sw / 2);
    R(a.rect(u, 0, sw, 0.9), 0.1); R(a.rect(u + 0.1, 0.1, sw - 0.2, 0.25), 0.06);
    if (a.D > 2.4) R(a.rect(u + sw / 2 - 0.5, 1.35, 1.0, 0.55), 0.05);
    if (e.w * e.h >= 20 && a.L - (u + sw) >= 2.2 && a.D >= 2.2) { // mesa de comedor
      const r = a.rect(u + sw + 0.9, Math.min(1.0, a.D - 1.6), 1.0, 1.6 > a.D - 0.6 ? a.D - 0.8 : 1.6); R(r); sillas(r);
    }
  } else if (t === 'comedor') {
    const w = Math.min(2.0, e.w - 1.5), h = Math.min(1.0, e.h - 1.5); const hor = e.w >= e.h;
    const r = hor ? [e.x + e.w / 2 - w / 2, e.y + e.h / 2 - 0.5, w, 1.0] : [e.x + e.w / 2 - 0.5, e.y + e.h / 2 - Math.min(2, e.h - 1.5) / 2, 1.0, Math.min(2, e.h - 1.5)];
    void h; R(r); sillas(r);
  } else if (t === 'cocina') {
    const l = mejorLado(e, oc, 1.8, largo === e.w ? ['N', 'S', 'O', 'E'] : ['O', 'E', 'N', 'S']); const a = apoyo(e, l);
    const w = a.L - 0.36; const r = a.rect(0.18, 0, w, 0.6); R(r, 0.02);
    const f = a.rect(0.18 + w * 0.2, 0.08, 0.5, 0.42); R(f, 0.06);
    const h = a.rect(0.18 + w * 0.62, 0.06, 0.58, 0.48); R(h, 0.02); const c = cen(h); C(c[0] - 0.13, c[1] - 0.1, 0.07); C(c[0] + 0.13, c[1] - 0.1, 0.07); C(c[0] - 0.13, c[1] + 0.1, 0.07); C(c[0] + 0.13, c[1] + 0.1, 0.07);
    if (a.D >= 2.6 && a.L >= 2.6) R(a.rect((a.L - Math.min(1.8, a.L - 1.2)) / 2, 1.6, Math.min(1.8, a.L - 1.2), 0.9), 0.03);
  } else if (t === 'bano' || t === 'aseo') {
    const l = mejorLado(e, oc, 1.3, largo === e.w ? ['N', 'S', 'O', 'E'] : ['O', 'E', 'N', 'S']); const a = apoyo(e, l, 0.14);
    let u = 0.12;
    const lav = a.rect(u, 0, 0.6, 0.45); R(lav, 0.08); C(...cen(lav), 0.1); u += 0.78;
    if (a.L - u >= 0.5) { const ino = a.rect(u, 0, 0.38, 0.62); R(ino, 0.16); R(a.rect(u, 0, 0.38, 0.16)); u += 0.56; }
    if (t === 'bano') {
      const resto = a.L - u - 0.1;
      if (e.w * e.h >= 6.7 && resto >= 1.7) { const b = a.rect(a.L - 1.8, 0, 1.7, 0.72); R(b, 0.12); R([b[0] + 0.08, b[1] + 0.08, b[2] - 0.16, b[3] - 0.16], 0.2); }
      else if (resto >= 0.8) { const d = a.rect(a.L - 0.1 - Math.min(1.2, resto), 0, Math.min(1.2, resto), Math.min(0.9, a.D)); R(d, 0.02); Ln(d[0], d[1], d[0] + d[2], d[1] + d[3]); Ln(d[0] + d[2], d[1], d[0], d[1] + d[3]); }
      else if (a.D >= 1.9) { const d = apoyo(e, { N: 'S', S: 'N', E: 'O', O: 'E' }[l], 0.14).rect(0.12, 0, 0.9, 0.9); R(d, 0.02); Ln(d[0], d[1], d[0] + d[2], d[1] + d[3]); }
    }
  } else if (t === 'escalera') {
    const hor = e.w > e.h; const n = 17;
    if (corto >= 2.9) { // dos tramos
      const w = (corto - 0.3) / 2; const paso = (largo - 1.2) / 9;
      for (let k = 0; k <= 8; k++) { const d = 0.15 + k * paso; if (hor) { Ln(e.x + d, e.y + 0.15, e.x + d, e.y + 0.15 + w); Ln(e.x + d, e.y + e.h - 0.15 - w, e.x + d, e.y + e.h - 0.15); } else { Ln(e.x + 0.15, e.y + d, e.x + 0.15 + w, e.y + d); Ln(e.x + e.w - 0.15 - w, e.y + d, e.x + e.w - 0.15, e.y + d); } }
      if (hor) Ln(e.x + 0.15, e.y + e.h / 2, e.x + largo - 1.05, e.y + e.h / 2); else Ln(e.x + e.w / 2, e.y + 0.15, e.x + e.w / 2, e.y + largo - 1.05);
    } else {
      const paso = (largo - 0.3) / n;
      for (let k = 0; k <= n; k++) { const d = 0.15 + k * paso; if (hor) Ln(e.x + d, e.y + 0.2, e.x + d, e.y + e.h - 0.2); else Ln(e.x + 0.2, e.y + d, e.x + e.w - 0.2, e.y + d); }
      if (hor) { Ln(e.x + 0.3, e.y + e.h / 2, e.x + e.w - 0.4, e.y + e.h / 2); out.push(`<path d="M${r3(e.x + e.w - 0.4)} ${r3(e.y + e.h / 2)}l-.22 -.12v.24z" fill="${GRIS}"/>`); }
      else { Ln(e.x + e.w / 2, e.y + e.h - 0.3, e.x + e.w / 2, e.y + 0.4); out.push(`<path d="M${r3(e.x + e.w / 2)} ${r3(e.y + 0.4)}l-.12 .22h.24z" fill="${GRIS}"/>`); }
    }
  } else if (t === 'garaje') {
    const hor = e.w > e.h; const nc = Math.max(1, Math.min(3, Math.floor((hor ? e.h : e.w) / 2.7))); const nl = Math.max(1, Math.floor((hor ? e.w : e.h) / 5.2));
    const an = hor ? e.h : e.w, la = hor ? e.w : e.h;
    for (let i = 0; i < nc; i++) for (let j = 0; j < Math.min(nl, nc === 1 ? 2 : 1); j++) {
      const cx = (i + 0.5) * (an / nc), cy = la - 0.5 - 2.2 - j * 5.0;
      const r = hor ? [e.x + cy - 2.2, e.y + cx - 0.9, 4.4, 1.8] : [e.x + cx - 0.9, e.y + cy - 2.2, 1.8, 4.4];
      R(r, 0.35); R(hor ? [r[0] + 0.9, r[1] + 0.15, 2.0, 1.5] : [r[0] + 0.15, r[1] + 1.3, 1.5, 2.0], 0.2);
    }
  } else if (t === 'despacho') {
    const l = mejorLado(e, oc, 1.6); const a = apoyo(e, l); const r = a.rect((a.L - 1.4) / 2, 0, 1.4, 0.65); R(r); const c = a.rect((a.L - 0.5) / 2, 0.85, 0.5, 0.5); C(...cen(c), 0.25);
  } else if (t === 'vestidor') {
    const hor = e.w >= e.h; const ls = hor ? ['N', 'S'] : ['O', 'E'];
    for (const l of ls) { if (oc[l].length && corto < 2.2) continue; const a = apoyo(e, l); if (a.D < 1.25 && l === ls[1]) continue; const r = a.rect(0.12, 0, a.L - 0.24, 0.55); R(r); Ln(r[0], r[1], r[0] + r[2], r[1] + r[3]); }
  } else if (t === 'lavadero') {
    const l = mejorLado(e, oc, 1.3); const a = apoyo(e, l, 0.14); for (let k = 0; k < 2 && 0.12 + (k + 1) * 0.64 < a.L; k++) { const r = a.rect(0.12 + k * 0.64, 0, 0.6, 0.6); R(r); C(...cen(r), 0.2); }
  } else if (t === 'patio') {
    C(e.x + e.w / 2, e.y + e.h / 2, Math.min(1.1, corto / 3)); C(e.x + e.w / 2, e.y + e.h / 2, 0.12);
  } else if ((t === 'porche' || t === 'terraza') && e.w * e.h >= 9) {
    const cx = e.x + e.w * 0.3, cy = e.y + e.h / 2; C(cx, cy, 0.5); for (let k = 0; k < 4; k++) C(cx + Math.cos(k * 1.57 + 0.78) * 0.8, cy + Math.sin(k * 1.57 + 0.78) * 0.8, 0.2);
  }
  function sillas(r) {
    const hor = r[2] >= r[3]; const n = Math.max(1, Math.floor((hor ? r[2] : r[3]) / 0.6));
    for (let k = 0; k < n; k++) { const d = (k + 0.5) * ((hor ? r[2] : r[3]) / n);
      if (hor) { R([r[0] + d - 0.2, r[1] - 0.42, 0.4, 0.36], 0.08); R([r[0] + d - 0.2, r[1] + r[3] + 0.06, 0.4, 0.36], 0.08); }
      else { R([r[0] - 0.42, r[1] + d - 0.2, 0.36, 0.4], 0.08); R([r[0] + r[2] + 0.06, r[1] + d - 0.2, 0.36, 0.4], 0.08); } }
  }
  return out.join('');
}

// ---------- planta ----------
export function planoPlanta(modelo, pi, opt = {}) {
  if (pi === -1) return planoSotano(modelo, opt); // v.1.6: planta sótano (modelo.sotano)
  const o = Object.assign({ k: 48, cotas: true, rotulos: true, muebles: true, rejilla: true, color: true, margen: opt.cotas === false ? 1.0 : 2.4, norte: null, id: 'p' + pi }, opt);
  const planta = modelo.plantas[pi]; const g = opt.g || derivar(modelo, pi); const b = bbox(modelo); // opt.g: geometría ya derivada (sótano)
  const S = superficies(modelo).plantas[pi]; const util = new Map(S.estancias.map((e) => [e.id, e.util]));
  const XA = conAccesos(modelo) ? accesosExteriores(modelo, pi === 0 ? g : undefined) : []; const bv = XA.length ? cajaExteriores(modelo, b, XA) : b; // v.1.6: el encuadre incluye escaleras y rampas
  const W = bv.w + 2 * o.margen, H = bv.h + 2 * o.margen; const ox = bv.x0 - o.margen, oy = bv.y0 - o.margen;
  const P = [];
  P.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r3(ox)} ${r3(oy)} ${r3(W)} ${r3(H)}" width="${Math.round(W * o.k)}" height="${Math.round(H * o.k)}" font-family="Manrope, 'Segoe UI', Arial, sans-serif">`);
  P.push(`<defs><pattern id="ry${o.id}" width="0.25" height="0.25" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V.25" stroke="${FINO}" stroke-width=".035"/></pattern>
<pattern id="gr${o.id}" width="${T}" height="${T}" patternUnits="userSpaceOnUse"><path d="M${T} 0H0V${T}" fill="none" stroke="#e7e6df" stroke-width=".02"/></pattern></defs>`);
  P.push(`<rect x="${r3(ox)}" y="${r3(oy)}" width="${r3(W)}" height="${r3(H)}" fill="#fff"/>`);
  if (o.rejilla) P.push(`<rect x="${r3(Math.floor(ox / T) * T)}" y="${r3(Math.floor(oy / T) * T)}" width="${r3(W + T)}" height="${r3(H + T)}" fill="url(#gr${o.id})"/>`);
  // suelos
  for (const e of planta.estancias) {
    const t = TIPOS[e.tipo];
    if (t.ext) P.push(`<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="${t.vacio ? '#f4f6ee' : '#fff'}"/>` + (t.vacio ? '' : `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="url(#ry${o.id})"/>`));
    else P.push(`<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="${o.color ? t.color : '#fff'}" fill-opacity="${o.color ? 0.55 : 1}"/>`);
  }
  // v.1.5 · edificio: tinte suave por vivienda (las zonas comunes quedan sin tinte)
  const edif = esEdificio(modelo);
  if (edif && o.viviendas !== false) for (const e of planta.estancias) { const c = e.vivienda && tinteVivienda(modelo, e.vivienda); if (c) P.push(`<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="${c}" fill-opacity=".13"/>`); }
  // proyección de la planta superior (línea de trazos) y vuelos
  if (modelo.plantas[pi + 1]) {
    const sup = celdasPlanta(modelo.plantas[pi + 1]).m, act = celdasPlanta(planta).m;
    const fuera = [...sup].filter(([k, e]) => !TIPOS[e.tipo].vacio && !(act.has(k) && !TIPOS[act.get(k).tipo].ext)).map(([k]) => k);
    for (const r of rectangulos(fuera)) P.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="${GRIS}" stroke-width=".04" stroke-dasharray=".22 .14"/>`);
  }
  if (pi > 0 && g.vuelos.celdas.length) for (const c of g.vuelos.celdas) P.push(`<rect x="${c.x}" y="${c.y}" width="${T}" height="${T}" fill="${c.ok ? '#dfff57' : '#ff7a59'}" fill-opacity=".28"/>`);
  // mobiliario
  if (o.muebles) {
    let items = null; try { items = mobiliario(modelo, pi, g); } catch { items = null; }
    P.push(`<g fill="#fff" fill-opacity=".85" stroke="${GRIS}" stroke-width=".03">`);
    if (items) P.push(mueblesDesde(items, planta)); else for (const e of planta.estancias) P.push(muebles(e, g));
    P.push('</g>');
  }
  // celosías (lamas en planta), piscinas y dobles alturas
  for (const e of planta.estancias) {
    if (e.tipo === 'piscina') P.push(`<rect x="${r3(e.x + 0.3)}" y="${r3(e.y + 0.3)}" width="${r3(e.w - 0.6)}" height="${r3(e.h - 0.6)}" fill="#bfe0e8" stroke="#3a6f8f" stroke-width=".04"/><path d="M${r3(e.x + 0.6)} ${r3(e.y + e.h / 2)}q.4 -.15 .8 0t.8 0t.8 0" fill="none" stroke="#fff" stroke-width=".04"/>`);
    if (e.tipo === 'ascensor') P.push(`<g fill="none" stroke="${INK}"><rect x="${r3(e.x + 0.2)}" y="${r3(e.y + 0.2)}" width="${r3(e.w - 0.4)}" height="${r3(e.h - 0.4)}" stroke-width=".025"/><path d="M${e.x} ${e.y}L${r3(e.x + e.w)} ${r3(e.y + e.h)}M${r3(e.x + e.w)} ${e.y}L${e.x} ${r3(e.y + e.h)}" stroke-width=".03"/></g>`);
    if (e.tipo === 'doble_altura') P.push(`<path d="M${e.x} ${e.y}L${e.x + e.w} ${e.y + e.h}M${e.x + e.w} ${e.y}L${e.x} ${e.y + e.h}" stroke="${GRIS}" stroke-width=".02" stroke-dasharray=".2 .12"/>`);
    if (e.tipo === 'escalera') { let sb = null; try { sb = subeEscalera(modelo, pi, e); } catch { sb = null; } P.push(flechaEscalera(e, sb)); }
  }
  // v.1.3 · celosías, barandillas y pérgolas por paños (core/bordes.mjs: la misma geometría que el 3D)
  try { P.push(svgBordes(modelo, pi, o.pergola ? { pergola: true } : {})); } catch { /* sin bordes: el plano sigue */ }
  // muros
  const eF = E_FACHADA, eT = E_TABIQUE;
  P.push(`<g stroke="${INK}" stroke-linecap="square" fill="none">`);
  for (const s of g.segs) {
    if (s.clase === 'fachada') P.push(`<path d="M${s.x1} ${s.y1}L${s.x2} ${s.y2}" stroke-width="${eF}"${esMedianera(modelo, s) ? ' stroke="#55564f"' : ''}/>`);
    else if (s.clase === 'tabique') P.push(`<path d="M${s.x1} ${s.y1}L${s.x2} ${s.y2}" stroke-width="${edif && ((s.a.vivienda || '') !== (s.b.vivienda || '') || s.a.tipo === 'ascensor' || s.b.tipo === 'ascensor') ? 0.2 : eT}"/>`); // v.1.5: separación acústica entre viviendas y con zonas comunes
    else if (s.clase === 'borde') P.push(`<path d="M${s.x1} ${s.y1}L${s.x2} ${s.y2}" stroke-width=".05" stroke="${GRIS}" stroke-linecap="butt"/>`);
  }
  P.push('</g>');
  if (pi === 0 && esSanitario(modelo)) P.push(svgMuretes(modelo)); // v.1.6: línea de muretes del forjado sanitario (bajo el forjado, a trazos)
  if (pi === 0 && XA.length) P.push(svgAccesos(XA));
  // huecos de fachada
  for (const h of g.huecos) {
    const hor = h.o === 'h'; const a = h.ancho, e = eF + 0.04;
    const x = hor ? h.x - a / 2 : h.x - e / 2, y = hor ? h.y - e / 2 : h.y - a / 2, w = hor ? a : e, hh = hor ? e : a;
    P.push(`<rect x="${r3(x)}" y="${r3(y)}" width="${r3(w)}" height="${r3(hh)}" fill="#fff"/>`);
    if (h.tipo === 'puerta') { const bp = barridoPuerta(h, planta); if (h.corredera) P.push(hor ? `<path d="M${r3(x)} ${r3(h.y + 0.1 * bp.lado)}h${a}" stroke="${INK}" stroke-width=".05"/>` : `<path d="M${r3(h.x + 0.1 * bp.lado)} ${r3(y)}v${a}" stroke="${INK}" stroke-width=".05"/>`); else P.push(hoja(h, a, eF, bp.lado, hor, INK, 0.05, bp.bisagra)); }
    else if (h.tipo === 'porton') P.push(porton(h, a, eF, hor, barridoPuerta(h, planta).lado));
    else {
      const c = '#3a6f8f';
      P.push(`<rect x="${r3(x)}" y="${r3(y)}" width="${r3(w)}" height="${r3(hh)}" fill="none" stroke="${INK}" stroke-width=".03"/>`);
      P.push(hor ? `<path d="M${r3(x)} ${h.y}h${a}" stroke="${c}" stroke-width=".05"/>` : `<path d="M${h.x} ${r3(y)}v${a}" stroke="${c}" stroke-width=".05"/>`);
      if (h.tipo === 'ventanal') P.push(hor ? `<path d="M${r3(h.x)} ${r3(y)}v${e}" stroke="${INK}" stroke-width=".03"/>` : `<path d="M${r3(x)} ${r3(h.y)}h${e}" stroke="${INK}" stroke-width=".03"/>`);
    }
  }
  // puertas interiores
  for (const d of g.puertas) {
    const hor = d.o === 'h'; const a = d.ancho, e = eT + 0.04;
    const x = hor ? d.x - a / 2 : d.x - e / 2, y = hor ? d.y - e / 2 : d.y - a / 2;
    P.push(`<rect x="${r3(x)}" y="${r3(y)}" width="${r3(hor ? a : e)}" height="${r3(hor ? e : a)}" fill="#fff"/>`);
    const bp = barridoPuerta(d, planta); const hacia = bp.lado; // misma regla que el mobiliario y el 3D
    if (d.corredera) P.push(hor ? `<path d="M${r3(x)} ${r3(d.y + 0.07 * hacia)}h${a}" stroke="${INK}" stroke-width=".04"/>` : `<path d="M${r3(d.x + 0.07 * hacia)} ${r3(y)}v${a}" stroke="${INK}" stroke-width=".04"/>`);
    else P.push(hoja(d, a, eT, hacia, hor, INK, 0.035, bp.bisagra));
  }
  // pilares
  for (const a of planta.apoyos || []) P.push(`<rect x="${r3(a.x - 0.12)}" y="${r3(a.y - 0.12)}" width=".24" height=".24" fill="${INK}"/>`);
  for (const e of planta.estancias) if (e.tipo === 'porche') for (const [px, py] of [[e.x, e.y], [e.x + e.w, e.y], [e.x, e.y + e.h], [e.x + e.w, e.y + e.h]]) {
    const cel = celdasPlanta(planta).m; const i = Math.round(px / T), j = Math.round(py / T);
    const interior = [[i, j], [i - 1, j], [i, j - 1], [i - 1, j - 1]].some(([a, c]) => { const q = cel.get(a + ',' + c); return q && esInt(q.tipo); });
    if (!interior) P.push(`<rect x="${r3(px - 0.1)}" y="${r3(py - 0.1)}" width=".2" height=".2" fill="${INK}"/>`);
  }
  // rótulos
  if (o.rotulos) for (const e of planta.estancias) {
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2; const peq = Math.min(e.w, e.h) < 2.2 || e.w < 2.9;
    const fs = peq ? 0.2 : 0.26; const nombre = (e.nombre || TIPOS[e.tipo].n).toUpperCase();
    const partes = nombre.length * fs * 0.62 > e.w - 0.3 ? partir(nombre) : [nombre];
    const vertical = e.w < 1.6 && e.h > 2.5;
    const tr = vertical ? ` transform="rotate(-90 ${r3(cx)} ${r3(cy)})"` : '';
    const y0 = cy - (partes.length - 1) * fs * 0.6 - (o.muebles && !peq ? 0 : 0.08);
    P.push(`<g text-anchor="middle"${tr} style="paint-order:stroke" stroke="#fff" stroke-width=".09" stroke-linejoin="round">`);
    partes.forEach((p, k) => P.push(`<text x="${r3(cx)}" y="${r3(y0 + k * fs * 1.15)}" font-size="${fs}" font-weight="700" letter-spacing=".02" fill="${INK}">${esc(p)}</text>`));
    P.push(`<text x="${r3(cx)}" y="${r3(y0 + partes.length * fs * 1.15 + 0.02)}" font-size="${fs * 0.9}" fill="#55564f">${n2(esExt(e.tipo) ? e.w * e.h : util.get(e.id))} m²</text></g>`);
  }
  if (edif && o.rotulos) {
    const mayor = new Map(); for (const e of planta.estancias) if (e.vivienda && esInt(e.tipo) && (!mayor.has(e.vivienda) || e.w * e.h > mayor.get(e.vivienda).w * mayor.get(e.vivienda).h)) mayor.set(e.vivienda, e);
    for (const [v, e] of mayor) { const r = 0.26 + 0.06 * Math.min(4, v.length); const cx = r3(e.x + 0.2 + r), cy = r3(e.y + 0.2 + r);
      P.push(`<g><circle cx="${cx}" cy="${cy}" r="${r3(r)}" fill="${tinteVivienda(modelo, v)}" stroke="#fff" stroke-width=".05"/><text x="${cx}" y="${r3(cy + 0.09)}" text-anchor="middle" font-size=".26" font-weight="700" fill="#fff">${esc(v)}</text></g>`); }
  }
  // cotas
  if (o.cotas && planta.estancias.some((e) => !TIPOS[e.tipo].vacio)) { // sin estancias no hay cotas (evita Infinity/NaN)
    const ints = planta.estancias.filter((e) => !TIPOS[e.tipo].vacio);
    const bx = { x0: Math.min(...ints.map((e) => e.x)), x1: Math.max(...ints.map((e) => e.x + e.w)), y0: Math.min(...ints.map((e) => e.y)), y1: Math.max(...ints.map((e) => e.y + e.h)) };
    const xs = [...new Set(ints.filter((e) => Math.abs(e.y - bx.y0) < 1e-6).flatMap((e) => [e.x, e.x + e.w]).concat([bx.x0, bx.x1]))].sort((a, c) => a - c);
    const ys = [...new Set(ints.filter((e) => Math.abs(e.x - bx.x0) < 1e-6).flatMap((e) => [e.y, e.y + e.h]).concat([bx.y0, bx.y1]))].sort((a, c) => a - c);
    P.push(`<g stroke="${COTA}" stroke-width=".025" fill="${COTA}" font-size=".24" text-anchor="middle">`);
    const cotaH = (x1, x2, y) => `<path d="M${x1} ${y}H${x2}M${x1} ${y - 0.12}v.24M${x2} ${y - 0.12}v.24"/><text stroke="none" x="${r3((x1 + x2) / 2)}" y="${r3(y - 0.1)}">${n2(x2 - x1)}</text>`;
    const cotaV = (y1, y2, x) => `<path d="M${x} ${y1}V${y2}M${x - 0.12} ${y1}h.24M${x - 0.12} ${y2}h.24"/><text stroke="none" transform="rotate(-90 ${r3(x - 0.1)} ${r3((y1 + y2) / 2)})" x="${r3(x - 0.1)}" y="${r3((y1 + y2) / 2)}">${n2(y2 - y1)}</text>`;
    const yT = b.y0 - 0.75, xL = b.x0 - 0.75;
    if (xs.length > 2) for (let i = 0; i < xs.length - 1; i++) P.push(cotaH(xs[i], xs[i + 1], yT));
    P.push(cotaH(bx.x0, bx.x1, yT - (xs.length > 2 ? 0.6 : 0)));
    if (ys.length > 2) for (let i = 0; i < ys.length - 1; i++) P.push(cotaV(ys[i], ys[i + 1], xL));
    P.push(cotaV(bx.y0, bx.y1, xL - (ys.length > 2 ? 0.6 : 0)));
    P.push('</g>');
  }
  if (o.norte != null) P.push(flechaNorte(ox + W - 1.0, oy + 1.0, o.norte, 0.55));
  P.push('</svg>');
  return { svg: P.join('\n'), interior: P.slice(1, -1).join('\n'), ox, oy, w: W, h: H, util: S.util, construida: S.construida };
}
// Celosías (banda de lamas en su posición real, ticks en la rejilla global), barandillas de vidrio y pérgolas de una planta.
export const COLOR_CELOSIA = { madera: '#8a6238', aluminio: '#5f625f', hormigon: '#8f8b80' };
export function svgBordes(modelo, pi, opt = {}, X = contextoBordes(modelo)) {
  const B = bordesPlanta(modelo, pi, opt, X); const PG = pergolasPlanta(modelo, pi, opt, X, B); const P = [];
  for (const g of PG) {
    let d = ''; for (const l of g.lamas) d += `M${l.x1} ${l.y1}L${l.x2} ${l.y2}`;
    P.push(`<g class="pergola" fill="none" stroke="#a67c52">${d ? `<path d="${d}" stroke-width=".03" stroke-dasharray=".3 .1"/>` : ''}${g.vigas.map((v) => `<rect x="${v.x}" y="${v.y}" width="${v.w}" height="${v.h}" stroke-width=".02"/>`).join('')}${g.postes.map((q) => `<rect x="${r3(q.x - 0.06)}" y="${r3(q.y - 0.06)}" width=".12" height=".12" fill="#a67c52" stroke="none"/>`).join('')}</g>`);
  }
  for (const p of B.panos) {
    const hz = p.o === 'h'; const lin = p.line * T;
    if (p.celosia) {
      const c = p.celosia; const L = LAMAS[c.material] || LAMAS.madera; const col = COLOR_CELOSIA[c.material] || COLOR_CELOSIA.madera;
      const n0 = lin + p.place * c.off, n1 = lin + p.place * (c.off + L.dp); const a0 = (hz ? p.x1 : p.y1) + 0.03, a1 = (hz ? p.x2 : p.y2) - 0.03;
      let d = ''; for (let k = Math.ceil((a0 + L.tk / 2) / L.paso - 1e-9); k * L.paso + L.tk / 2 <= a1 + 1e-9; k++) { const u = r3(k * L.paso); d += hz ? `M${u} ${r3(n0)}V${r3(n1)}` : `M${r3(n0)} ${u}H${r3(n1)}`; }
      const m = r3((n0 + n1) / 2);
      P.push(`<g class="celosia" stroke="${col}" fill="none"><path d="${d}" stroke-width="${r3(Math.max(0.025, L.tk))}"/><path d="${hz ? `M${r3(a0)} ${m}H${r3(a1)}` : `M${m} ${r3(a0)}V${r3(a1)}`}" stroke-width=".018"/></g>`);
    }
    if (p.barandilla) {
      const off = p.otro === 'muro' ? p.place * (E_FACHADA / 2 + 0.05) : 0; const c = r3(lin + off);
      P.push(`<path class="barandilla" d="${hz ? `M${p.x1} ${c}H${p.x2}` : `M${c} ${p.y1}V${p.y2}`}" stroke="#3a6f8f" stroke-width=".04" fill="none"/>`);
    }
  }
  return P.join('');
}
function partir(s) { const p = s.split(/\s+/); if (p.length < 2) return [s]; const m = Math.ceil(p.length / 2); return [p.slice(0, m).join(' '), p.slice(m).join(' ')].filter((x) => x && x !== '·'); }
// Portón de garaje en planta según su modelo. s: +1/−1 hacia donde barre (dentro, o fuera si es batiente).
function porton(h, a, e, hor, s) {
  const md = h.modelo || 'seccional'; const u0 = (hor ? h.x : h.y) - a / 2; const c = hor ? h.y : h.x;
  const L = (p0, q0, p1, q1, extra = '') => (hor ? `<path d="M${r3(p0)} ${r3(q0)}L${r3(p1)} ${r3(q1)}" ${extra}/>` : `<path d="M${r3(q0)} ${r3(p0)}L${r3(q1)} ${r3(p1)}" ${extra}/>`);
  const st = `stroke="${INK}" fill="none"`;
  if (md === 'corredera') return L(u0, c - s * (e / 2 + 0.06), u0 + 2 * a, c - s * (e / 2 + 0.06), `${st} stroke-width=".05"`) + L(u0, c, u0 + a, c, `${st} stroke-width=".02"`);
  if (md === 'batiente') {
    const m = a / 2; const arc = (b, d) => { const p0 = b, p1 = b + d * m; const q = c + s * (e / 2); const qa = q + s * m;
      return hor ? `<path d="M${r3(p0)} ${r3(q)}L${r3(p0)} ${r3(qa)}M${r3(p0)} ${r3(qa)}A${r3(m)} ${r3(m)} 0 0 ${(d > 0) === (s > 0) ? 0 : 1} ${r3(p1)} ${r3(q)}" ${st} stroke-width=".03"/>`
        : `<path d="M${r3(q)} ${r3(p0)}L${r3(qa)} ${r3(p0)}M${r3(qa)} ${r3(p0)}A${r3(m)} ${r3(m)} 0 0 ${(d > 0) === (s > 0) ? 1 : 0} ${r3(q)} ${r3(p1)}" ${st} stroke-width=".03"/>`; };
    return arc(u0, 1) + arc(u0 + a, -1);
  }
  const fondo = md === 'basculante' ? Math.min(2.4, 0.85 * 2.5) : md === 'enrollable' ? 0.3 : 2.5; // proyección de la hoja dentro, a trazos
  const q0 = c + s * (e / 2 + 0.05), q1 = q0 + s * fondo;
  return L(u0, c, u0 + a, c, `${st} stroke-width=".06"`) + (hor ? `<rect x="${r3(u0)}" y="${r3(Math.min(q0, q1))}" width="${r3(a)}" height="${r3(Math.abs(q1 - q0))}" ${st} stroke-width=".02" stroke-dasharray=".2 .1"/>` : `<rect x="${r3(Math.min(q0, q1))}" y="${r3(u0)}" width="${r3(Math.abs(q1 - q0))}" height="${r3(a)}" ${st} stroke-width=".02" stroke-dasharray=".2 .1"/>`);
}
function hoja(d, a, e, hacia, hor, color, sw, bisagra) {
  // bisagra en el extremo inicial (o final); la hoja abre hacia «hacia» (±1) perpendicular al muro
  if (bisagra === 'fin') { const s = hoja(d, a, e, hacia, hor, color, sw); return `<g transform="${hor ? `translate(${r3(2 * d.x)} 0) scale(-1 1)` : `translate(0 ${r3(2 * d.y)}) scale(1 -1)`}">${s}</g>`; }
  if (hor) { const x0 = d.x - a / 2, y0 = d.y; return `<path d="M${r3(x0)} ${r3(y0)}v${r3(a * hacia)}" stroke="${color}" stroke-width="${sw}" fill="none"/><path d="M${r3(x0)} ${r3(y0 + a * hacia)}A${a} ${a} 0 0 ${hacia > 0 ? 0 : 1} ${r3(x0 + a)} ${r3(y0)}" stroke="${GRIS}" stroke-width=".02" fill="none"/>`; }
  const x0 = d.x, y0 = d.y - a / 2; return `<path d="M${r3(x0)} ${r3(y0)}h${r3(a * hacia)}" stroke="${color}" stroke-width="${sw}" fill="none"/><path d="M${r3(x0 + a * hacia)} ${r3(y0)}A${a} ${a} 0 0 ${hacia > 0 ? 1 : 0} ${r3(x0)} ${r3(y0 + a)}" stroke="${GRIS}" stroke-width=".02" fill="none"/>`;
}
export function flechaNorte(x, y, giro = 0, r = 0.55) {
  return `<g transform="translate(${r3(x)} ${r3(y)}) rotate(${r3(giro)})"><circle r="${r}" fill="#fff" stroke="${INK}" stroke-width=".03"/><path d="M0 ${-r * 0.82}L${r * 0.32} ${r * 0.5}L0 ${r * 0.22}L${-r * 0.32} ${r * 0.5}Z" fill="${INK}"/><text y="${-r - 0.12}" text-anchor="middle" font-size="${r * 0.55}" font-weight="700" fill="${INK}" font-family="Manrope, Arial, sans-serif">N</text></g>`;
}

// ---------- alzados ----------
// lado: N | S | E | O (lado del modelo que se mira desde fuera)
export function alzado(modelo, lado, opt = {}) {
  const o = Object.assign({ k: 48, margen: 1.2 }, opt);
  const b0 = bbox(modelo); const XA = conAccesos(modelo) ? accesosExteriores(modelo) : []; const b = cajaSotano(modelo, XA.length ? cajaExteriores(modelo, b0, XA) : b0); const hor = lado === 'N' || lado === 'S'; // v.1.6: el encuadre incluye sótano y rampa
  const zc = cotaPB(modelo); // v.1.6: con forjado sanitario la casa entera sube a la cota del suelo de planta baja
  const U0 = hor ? b.x0 : b.y0, U1 = hor ? b.x1 : b.y1; const inv = lado === 'N' || lado === 'E';
  const u = (v) => (inv ? U1 - v : v - U0);                       // posición horizontal en el alzado
  const prof = (s) => (lado === 'S' ? b.y1 - s.y1 : lado === 'N' ? s.y1 - b.y0 : lado === 'E' ? b.x1 - s.x1 : s.x1 - b.x0); // 0 = primer plano
  const nP = modelo.plantas.length; const rem = remateCubierta(modelo); const XB = contextoBordes(modelo); let Hmax = nP * H_PLANTA + rem + zc;
  const items = [];
  modelo.plantas.forEach((p, pi) => {
    const g = derivar(modelo, pi); const z0 = zc + pi * H_PLANTA;
    for (const s of g.segs) {
      if (s.clase === 'fachada' && s.lado === lado) {
        const a = hor ? u(s.x1) : u(s.y1), c = hor ? u(s.x2) : u(s.y2); const x = Math.min(a, c), w = Math.abs(c - a);
        const hs = g.huecos.filter((h) => h.lado === lado && h.o === s.o && (hor ? Math.abs(h.y - s.y1) < 1e-6 && h.x > s.x1 && h.x < s.x2 : Math.abs(h.x - s.x1) < 1e-6 && h.y > s.y1 && h.y < s.y2));
        items.push({ d: prof(s), x, w, z0, tipo: 'muro', hs: hs.map((h) => ({ x: u(hor ? h.x : h.y) - h.ancho / 2, w: h.ancho, alf: h.alf, alto: h.alto, tipo: h.tipo })) });
      }
    }
    // v.1.3: barandillas y celosías por paños (core/bordes.mjs)
    for (const q of bordesPlanta(modelo, pi, {}, XB).panos) {
      if (q.lado !== lado) continue; const a = hor ? u(q.x1) : u(q.y1), c = hor ? u(q.x2) : u(q.y2); const x = Math.min(a, c), w = Math.abs(c - a);
      if (q.barandilla) items.push({ d: prof(q), x, w, z0, tipo: 'baranda' });
      if (q.celosia) { const L = LAMAS[q.celosia.material] || LAMAS.madera; const v0 = hor ? q.x1 : q.y1, v1 = hor ? q.x2 : q.y2; const us = [];
        for (let k = Math.ceil((v0 + 0.03 + L.tk / 2) / L.paso - 1e-9); k * L.paso + L.tk / 2 <= v1 - 0.03 + 1e-9; k++) us.push(u(k * L.paso));
        const off = q.celosia.off * q.place; const pr = prof({ x1: q.x1 + (hor ? 0 : off), y1: q.y1 + (hor ? off : 0) });
        items.push({ d: pr - 0.02, x, w, z0, tipo: 'celosia', top: q.celosia.top, us, col: COLOR_CELOSIA[q.celosia.material] || COLOR_CELOSIA.madera }); Hmax = Math.max(Hmax, z0 + q.celosia.top); }
    }
    for (const e of p.estancias) if (e.tipo === 'porche') {
      const a = hor ? u(e.x) : u(e.y), c = hor ? u(e.x + e.w) : u(e.y + e.h);
      const d = lado === 'S' ? b.y1 - (e.y + e.h) : lado === 'N' ? e.y - b.y0 : lado === 'E' ? b.x1 - (e.x + e.w) : e.x - b.x0;
      items.push({ d: d - 0.01, x: Math.min(a, c), w: Math.abs(c - a), z0, tipo: 'porche' });
    }
  });
  // v.1.6 · cubiertas inclinadas (silueta según caída / cumbrera), cámara del forjado sanitario y accesos exteriores
  const colCub = colorCubierta(modelo);
  modelo.plantas.forEach((p, pi) => {
    const A = alturasCubierta(modelo, pi); if (!A) return; const zE = zc + (pi + 1) * H_PLANTA; const t = 0.2; const paso = T / 2;
    for (const R of A.rects) {
      const ua = hor ? R.x0 : R.y0, ub = hor ? R.x1 : R.y1, va = hor ? R.y0 : R.x0, vb = hor ? R.y1 : R.x1; const pts = [];
      const n = Math.max(1, Math.ceil((ub - ua) / paso - 1e-9));
      for (let q = 0; q <= n; q++) {
        const w = ua + ((ub - ua) * q) / n; let hm = -Infinity;
        for (let v = va; v <= vb + 1e-6; v += paso) { const hh = hor ? A.H(w, v) : A.H(v, w); if (hh > hm) hm = hh; }
        if (Number.isFinite(hm)) pts.push([u(w), Math.max(-0.6, hm)]);
      }
      if (pts.length < 2) continue; pts.sort((p1, p2) => p1[0] - p2[0]);
      // de frente se ve el faldón; de costado, el hastial (o el muro alto de la cubierta a un agua que cae hacia atrás)
      const faldon = A.tipo === 'una' ? A.caida === lado : A.tipo === 'dos' ? R.ejeX === hor : true;
      const d = lado === 'S' ? b.y1 - R.y1 : lado === 'N' ? R.y0 - b.y0 : lado === 'E' ? b.x1 - R.x1 : R.x0 - b.x0;
      items.push({ d: d - 0.03, tipo: 'cub', z0: zE, pts, t, faldon }); Hmax = Math.max(Hmax, zE + t + Math.max(...pts.map((q) => q[1])));
    }
  });
  if (esSanitario(modelo)) {
    const MU = muretesSanitario(modelo); const c = MU.cimentacion; const colM = MURETE_MATERIALES[c.murete.material]?.color || '#b8b4aa';
    for (const sg of MU.perimetro) if (sg.lado === lado) { const a = hor ? u(sg.x1) : u(sg.y1), e2 = hor ? u(sg.x2) : u(sg.y2); const pr = lado === 'S' ? b.y1 - sg.y1 : lado === 'N' ? sg.y1 - b.y0 : lado === 'E' ? b.x1 - sg.x1 : sg.x1 - b.x0;
      items.push({ d: pr, tipo: 'murete', x: Math.min(a, e2), w: Math.abs(e2 - a), alto: c.altura, col: colM, rej: MU.rejillas.filter((q) => q.lado === lado && (hor ? Math.abs(q.y - sg.y1) < 1e-6 && q.x >= sg.x1 && q.x <= sg.x2 : Math.abs(q.x - sg.x1) < 1e-6 && q.y >= sg.y1 && q.y <= sg.y2)).map((q) => u(hor ? q.x : q.y)) }); }
    for (const r of rectangulos([...MU.huella])) { const a = hor ? u(r.x) : u(r.y), e2 = hor ? u(r.x + r.w) : u(r.y + r.h); const pr = lado === 'S' ? b.y1 - (r.y + r.h) : lado === 'N' ? r.y - b.y0 : lado === 'E' ? b.x1 - (r.x + r.w) : r.x - b.x0;
      items.push({ d: pr - 0.005, tipo: 'canto', x: Math.min(a, e2), w: Math.abs(e2 - a), z0: c.altura, alto: zc - c.altura }); }
  }
  for (const X of XA) {
    for (const q of X.piezas) {
      const a = hor ? u(q.x) : u(q.y), e2 = hor ? u(q.x + q.w) : u(q.y + q.h); const pr = lado === 'S' ? b.y1 - (q.y + q.h) : lado === 'N' ? q.y - b.y0 : lado === 'E' ? b.x1 - (q.x + q.w) : q.x - b.x0;
      let za = q.z, zb = q.z;
      if (q.k === 'rampa') { const along = hor ? q.baja === 'E' || q.baja === 'O' : q.baja === 'N' || q.baja === 'S'; if (along) { const bajaFin = hor ? q.baja === 'E' : q.baja === 'S'; [za, zb] = bajaFin ? [q.z0, q.z1] : [q.z1, q.z0]; if (a > e2) [za, zb] = [zb, za]; } else za = zb = Math.max(q.z0, q.z1); }
      items.push({ d: pr - 0.002, tipo: 'acc', x: Math.min(a, e2), w: Math.abs(e2 - a), za, zb, k: q.k });
    }
    for (const r of X.barandillas) { const pr = Math.min(...[[r.x1, r.y1], [r.x2, r.y2]].map(([x, y]) => (lado === 'S' ? b.y1 - y : lado === 'N' ? y - b.y0 : lado === 'E' ? b.x1 - x : x - b.x0))); items.push({ d: pr - 0.004, tipo: 'bacc', u1: u(hor ? r.x1 : r.y1), u2: u(hor ? r.x2 : r.y2), z1: r.z1, z2: r.z2 }); }
  }
  items.sort((p, q) => q.d - p.d);
  const Ht = Math.max(nP * H_PLANTA + 0.45 + zc, Hmax); const W = (U1 - U0) + 2 * o.margen, H = Ht + 1.6 + bajoRasante(modelo); // v.1.6: sótano bajo rasante
  const Z = (z) => r3(Ht + 0.5 - z); const X = (v) => r3(v + o.margen);
  const P = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r3(W)} ${r3(H)}" width="${Math.round(W * o.k)}" height="${Math.round(H * o.k)}" font-family="Manrope, 'Segoe UI', Arial, sans-serif">`, `<rect width="${r3(W)}" height="${r3(H)}" fill="#fff"/>`];
  const maxD = Math.max(1, ...items.map((i) => i.d));
  const med = (modelo.medianeras || []).includes(lado);
  for (const it of items) {
    const tono = Math.round(250 - 26 * (it.d / maxD)); const col = `rgb(${tono},${tono},${tono - 4})`;
    if (it.tipo === 'muro') {
      P.push(`<rect x="${X(it.x)}" y="${Z(it.z0 + H_PLANTA + rem)}" width="${r3(it.w)}" height="${r3(H_PLANTA + rem)}" fill="${med ? '#e3e2db' : col}" stroke="${INK}" stroke-width=".035"/>`);
      P.push(`<path d="M${X(it.x - 0.04)} ${Z(it.z0 + H_PLANTA + rem)}h${r3(it.w + 0.08)}" stroke="${INK}" stroke-width=".09"/>`);
      for (const h of it.hs) {
        const y = Z(it.z0 + h.alf + h.alto);
        if (h.tipo === 'puerta' || h.tipo === 'porton') {
          P.push(`<rect x="${X(h.x)}" y="${y}" width="${r3(h.w)}" height="${r3(h.alto)}" fill="#b98e62" stroke="${INK}" stroke-width=".03"/>`);
          const n = Math.max(2, Math.round(h.w / 0.14)); for (let k = 1; k < n; k++) P.push(`<path d="M${X(h.x + (k * h.w) / n)} ${y}v${r3(h.alto)}" stroke="#8a6238" stroke-width=".012"/>`);
        } else {
          P.push(`<rect x="${X(h.x)}" y="${y}" width="${r3(h.w)}" height="${r3(h.alto)}" fill="#cfdfe6" stroke="${INK}" stroke-width=".04"/>`);
          const n = h.w >= 2.2 ? 2 : h.w >= 3.5 ? 3 : 1; for (let k = 1; k <= n - 1 + (h.w >= 2.2 ? 0 : 0); k++) P.push(`<path d="M${X(h.x + (k * h.w) / n)} ${y}v${r3(h.alto)}" stroke="${INK}" stroke-width=".03"/>`);
          P.push(`<path d="M${X(h.x + h.w * 0.15)} ${r3(y + h.alto * 0.75)}L${X(h.x + h.w * 0.4)} ${r3(y + h.alto * 0.2)}" stroke="#fff" stroke-width=".03"/>`);
        }
      }
    } else if (it.tipo === 'celosia') {
      const y = Z(it.z0 + it.top); P.push(`<g stroke="${it.col}"><rect x="${X(it.x)}" y="${y}" width="${r3(it.w)}" height="${r3(it.top)}" fill="#fff" fill-opacity=".35" stroke-width=".025"/><path d="${it.us.map((v) => `M${X(v)} ${y}V${Z(it.z0)}`).join('')}" stroke-width=".02"/></g>`);
    } else if (it.tipo === 'baranda') {
      P.push(`<rect x="${X(it.x)}" y="${Z(it.z0 + 1.05)}" width="${r3(it.w)}" height="1.05" fill="#cfdfe6" fill-opacity=".55" stroke="${INK}" stroke-width=".025"/>`);
    } else if (it.tipo === 'cub') { // v.1.6
      const top = it.pts.map(([x, h]) => `${X(x)} ${Z(it.z0 + it.t + h)}`).join('L'); const x0 = it.pts[0][0], x1 = it.pts[it.pts.length - 1][0];
      if (it.faldon) P.push(`<path d="M${X(x0)} ${Z(it.z0)}L${top}L${X(x1)} ${Z(it.z0)}Z" fill="${colCub}" fill-opacity=".85" stroke="${INK}" stroke-width=".035"/>`);
      else { P.push(`<path d="M${X(x0)} ${Z(it.z0)}L${it.pts.map(([x, h]) => `${X(x)} ${Z(it.z0 + Math.max(0, h))}`).join('L')}L${X(x1)} ${Z(it.z0)}Z" fill="${med ? '#e3e2db' : '#f2f1ec'}" stroke="${INK}" stroke-width=".03"/>`); P.push(`<path d="M${top}" fill="none" stroke="${colCub}" stroke-width="${r3(it.t)}" stroke-linejoin="round"/><path d="M${top}" fill="none" stroke="${INK}" stroke-width=".03"/>`); }
    } else if (it.tipo === 'murete') {
      P.push(`<rect x="${X(it.x)}" y="${Z(it.alto)}" width="${r3(it.w)}" height="${r3(it.alto)}" fill="${it.col}" stroke="${INK}" stroke-width=".025"/><rect x="${X(it.x)}" y="${Z(it.alto)}" width="${r3(it.w)}" height="${r3(Math.min(0.12, it.alto))}" fill="#12130f" fill-opacity=".25"/>`);
      for (const r of it.rej) P.push(`<g class="rejilla"><rect x="${X(r - 0.2)}" y="${Z(it.alto * 0.62)}" width=".4" height=".14" fill="#55564f" stroke="${INK}" stroke-width=".015"/><path d="M${X(r - 0.18)} ${r3(Z(it.alto * 0.62) + 0.045)}h.36M${X(r - 0.18)} ${r3(Z(it.alto * 0.62) + 0.095)}h.36" stroke="#d9d6cd" stroke-width=".015"/></g>`);
    } else if (it.tipo === 'canto') {
      P.push(`<rect x="${X(it.x)}" y="${Z(it.z0 + it.alto)}" width="${r3(it.w)}" height="${r3(it.alto)}" fill="#d9d6cd" stroke="${INK}" stroke-width=".035"/>`);
    } else if (it.tipo === 'acc') {
      P.push(`<path d="M${X(it.x)} ${Z(0)}L${X(it.x)} ${Z(it.za)}L${X(it.x + it.w)} ${Z(it.zb)}L${X(it.x + it.w)} ${Z(0)}Z" fill="${it.k === 'peldano' ? '#e9e7e0' : '#efeee8'}" stroke="${INK}" stroke-width=".025"/>`);
    } else if (it.tipo === 'bacc') {
      P.push(`<path d="M${X(it.u1)} ${Z(it.z1 + 0.95)}L${X(it.u2)} ${Z(it.z2 + 0.95)}" stroke="#3a6f8f" stroke-width=".035" fill="none"/><path d="M${X(it.u1)} ${Z(it.z1)}V${Z(it.z1 + 0.95)}M${X(it.u2)} ${Z(it.z2)}V${Z(it.z2 + 0.95)}" stroke="#3a6f8f" stroke-width=".02"/>`);
    } else if (it.tipo === 'porche') {
      P.push(`<rect x="${X(it.x)}" y="${Z(it.z0 + H_PLANTA + 0.05)}" width="${r3(it.w)}" height=".26" fill="#f1f0ea" stroke="${INK}" stroke-width=".035"/>`);
      for (const px of [it.x + 0.05, it.x + it.w - 0.19]) P.push(`<rect x="${X(px)}" y="${Z(it.z0 + H_PLANTA - 0.21)}" width=".14" height="${r3(H_PLANTA - 0.21)}" fill="#8a6238" stroke="${INK}" stroke-width=".02"/>`);
    }
  }
  P.push(`<path d="M0 ${Z(0)}H${r3(W)}" stroke="${INK}" stroke-width=".07"/><rect x="0" y="${Z(0)}" width="${r3(W)}" height=".5" fill="#ecebe4"/>`);
  P.push(`<g font-size=".22" fill="${COTA}" stroke="${COTA}" stroke-width=".02">`);
  for (let pi = 0; pi <= nP; pi++) { const z = zc + pi * H_PLANTA; P.push(`<path d="M${r3(W - 0.95)} ${Z(z)}h.5" /><text stroke="none" x="${r3(W - 0.42)}" y="${r3(Z(z) + 0.08)}">${z >= 0 ? '+' : ''}${n2(z)}</text>`); }
  if (zc) P.push(`<path d="M${r3(W - 0.95)} ${Z(0)}h.5" /><text stroke="none" x="${r3(W - 0.42)}" y="${r3(Z(0) + 0.3)}">±0,00</text>`);
  P.push('</g>');
  if (modelo.sotano) P.push(capaSotanoAlzado(modelo, lado, { px: (x, y) => X(u(hor ? x : y)), Z, W })); // v.1.6: sótano y rampa bajo rasante
  if (med) P.push(`<text x="${r3(W / 2)}" y="${Z(Ht / 2)}" text-anchor="middle" font-size=".3" fill="#77776f" letter-spacing=".08">MEDIANERA</text>`);
  P.push('</svg>');
  return { svg: P.join('\n'), w: W, h: H };
}

// ---------- sección ----------
export function seccion(modelo, eje = 'x', pos = null, opt = {}) {
  // eje 'x': corte por una línea x = pos (se ve el fondo de la casa a lo largo de y)
  const o = Object.assign({ k: 48, margen: 1.2 }, opt); const b = cajaSotano(modelo, bbox(modelo)); // v.1.6: el encuadre incluye sótano y rampa
  if (pos == null) { // por la estancia más grande de la planta baja
    const mayor = modelo.plantas[0].estancias.filter((e) => esInt(e.tipo)).sort((a, c) => c.w * c.h - a.w * a.h)[0];
    pos = mayor ? (eje === 'x' ? mayor.x + mayor.w / 2 : mayor.y + mayor.h / 2) : (eje === 'x' ? (b.x0 + b.x1) / 2 : (b.y0 + b.y1) / 2);
  }
  pos = Math.floor(pos / T) * T + T / 2; // siempre por el centro de una celda, nunca por una línea de muro
  const U0 = eje === 'x' ? b.y0 : b.x0, U1 = eje === 'x' ? b.y1 : b.x1; const nP = modelo.plantas.length;
  const zc = cotaPB(modelo); const inclinada = cubiertaTipo(modelo) !== 'plana'; // v.1.6: forjado sanitario y perfil de la cubierta inclinada
  const perfiles = inclinada ? modelo.plantas.map((p, pi) => alturasCubierta(modelo, pi)) : []; const hCub = Math.max(0, ...perfiles.filter(Boolean).flatMap((A) => A.rects.map((R) => { let m = 0; for (let v = eje === 'x' ? R.y0 : R.x0; v <= (eje === 'x' ? R.y1 : R.x1) + 1e-6; v += T / 2) { const h = eje === 'x' ? A.H(pos, v) : A.H(v, pos); if (Number.isFinite(h)) m = Math.max(m, h); } return m; })));
  const Ht = nP * H_PLANTA + 0.45 + zc + (inclinada ? Math.max(0, hCub + 0.2 - 0.45) : 0); const W = U1 - U0 + 2 * o.margen, H = Ht + 1.8 + bajoRasante(modelo); const Z = (z) => r3(Ht + 0.5 - z), X = (v) => r3(v - U0 + o.margen);
  const P = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r3(W)} ${r3(H)}" width="${Math.round(W * o.k)}" height="${Math.round(H * o.k)}" font-family="Manrope, 'Segoe UI', Arial, sans-serif">`, `<rect width="${r3(W)}" height="${r3(H)}" fill="#fff"/>`];
  P.push(`<rect x="0" y="${Z(0)}" width="${r3(W)}" height="1.3" fill="#ecebe4"/>`);
  if (modelo.sotano) P.push(capaSotanoSeccion(modelo, eje, pos, { X, Z, W })); // v.1.6: sótano y rampa cortados bajo rasante
  modelo.plantas.forEach((p, pi) => {
    const z0 = zc + pi * H_PLANTA; const corta = p.estancias.filter((e) => (eje === 'x' ? e.x < pos && e.x + e.w > pos : e.y < pos && e.y + e.h > pos)).sort((a, c) => (eje === 'x' ? a.y - c.y : a.x - c.x));
    for (const e of corta) {
      const u0 = eje === 'x' ? e.y : e.x, w = eje === 'x' ? e.h : e.w; const t = TIPOS[e.tipo];
      if (t.vacio) continue;
      // forjado de suelo
      P.push(`<rect x="${X(u0)}" y="${Z(z0)}" width="${r3(w)}" height="${E_FORJADO}" fill="${INK}"/>`);
      if (t.ext && !t.cubierto) { P.push(`<rect x="${X(u0)}" y="${Z(z0 + 1.05)}" width=".04" height="1.05" fill="${GRIS}"/><rect x="${X(u0 + w - 0.04)}" y="${Z(z0 + 1.05)}" width=".04" height="1.05" fill="${GRIS}"/>`); }
      else {
        const arriba = modelo.plantas[pi + 1] && modelo.plantas[pi + 1].estancias.some((q) => !TIPOS[q.tipo].vacio && (eje === 'x' ? q.x < pos && q.x + q.w > pos && q.y < e.y + e.h && q.y + q.h > e.y : q.y < pos && q.y + q.h > pos && q.x < e.x + e.w && q.x + q.w > e.x));
        if (!arriba && !inclinada) P.push(`<rect x="${X(u0 - 0.1)}" y="${Z(z0 + H_PLANTA + 0.12)}" width="${r3(w + 0.2)}" height="${E_FORJADO + 0.12}" fill="${INK}"/>`);
        if (!t.ext) {
          P.push(`<rect x="${X(u0)}" y="${Z(z0 + H_PLANTA - E_FORJADO)}" width="${r3(w)}" height="${r3(H_PLANTA - E_FORJADO)}" fill="${t.color}" fill-opacity=".45"/>`);
          P.push(`<path d="M${X(u0)} ${Z(z0)}V${Z(z0 + H_PLANTA)}M${X(u0 + w)} ${Z(z0)}V${Z(z0 + H_PLANTA)}" stroke="${INK}" stroke-width=".12"/>`);
        }
      }
      if (w >= 1.5) P.push(`<text x="${X(u0 + w / 2)}" y="${Z(z0 + 1.3)}" text-anchor="middle" font-size="${w < 3 ? 0.2 : 0.25}" font-weight="700" fill="${INK}">${esc((e.nombre || t.n).toUpperCase().slice(0, Math.max(6, Math.floor(w * 5))))}</text>`);
    }
  });
  // v.1.6 · cubierta inclinada cortada: faldón según caída / cumbrera (canto de 0,20 sobre el campo de alturas)
  perfiles.forEach((A, pi) => {
    if (!A) return; const zE = zc + (pi + 1) * H_PLANTA; let ua = Infinity, ub = -Infinity;
    for (const R of A.rects) if (eje === 'x' ? R.x0 <= pos && R.x1 >= pos : R.y0 <= pos && R.y1 >= pos) { ua = Math.min(ua, eje === 'x' ? R.y0 : R.x0); ub = Math.max(ub, eje === 'x' ? R.y1 : R.x1); }
    if (!Number.isFinite(ua)) return; const n = Math.max(2, Math.ceil((ub - ua) / (T / 2))); let run = [];
    const cierra = () => { if (run.length > 1) P.push(`<path d="M${run.map(([v, h]) => `${X(v)} ${Z(zE + h + 0.2)}`).join('L')}L${run.slice().reverse().map(([v, h]) => `${X(v)} ${Z(zE + h)}`).join('L')}Z" fill="${INK}"/>`); run = []; };
    for (let q = 0; q <= n; q++) { const v = ua + ((ub - ua) * q) / n; const h = eje === 'x' ? A.H(pos, v) : A.H(v, pos); if (Number.isFinite(h)) run.push([v, h]); else cierra(); }
    cierra();
  });
  // v.1.6 · forjado sanitario: muretes cortados sobre el terreno y cámara ventilada bajo el forjado de planta baja
  if (esSanitario(modelo)) {
    const MU = muretesSanitario(modelo); const c = MU.cimentacion; const e = c.murete.espesor;
    for (const sg of [...MU.perimetro, ...MU.intermedios]) {
      if (eje === 'x' ? sg.o === 'h' && sg.x1 < pos && sg.x2 > pos : sg.o === 'v' && sg.y1 < pos && sg.y2 > pos) { const v = eje === 'x' ? sg.y1 : sg.x1; P.push(`<rect x="${X(v - e / 2)}" y="${Z(c.altura)}" width="${r3(e)}" height="${r3(c.altura + 0.35)}" fill="${INK}"/><rect x="${X(v - e / 2 - 0.15)}" y="${Z(-0.35)}" width="${r3(e + 0.3)}" height=".3" fill="${INK}" fill-opacity=".8"/>`); }
    }
    P.push(`<text x="${X((U0 + U1) / 2)}" y="${Z(c.altura / 2 - 0.08)}" text-anchor="middle" font-size=".18" fill="#55564f">CÁMARA VENTILADA ${n2(c.altura)} m</text>`);
  }
  for (const XA of conAccesos(modelo) ? accesosExteriores(modelo) : []) for (const q of XA.piezas) { // accesos cortados por la sección
    if (!(eje === 'x' ? q.x < pos && q.x + q.w > pos : q.y < pos && q.y + q.h > pos)) continue; const v0 = eje === 'x' ? q.y : q.x, v1 = v0 + (eje === 'x' ? q.h : q.w);
    let za = q.z, zb = q.z; if (q.k === 'rampa') { const along = eje === 'x' ? q.baja === 'N' || q.baja === 'S' : q.baja === 'E' || q.baja === 'O'; if (along) { const fin = eje === 'x' ? q.baja === 'S' : q.baja === 'E'; [za, zb] = fin ? [q.z0, q.z1] : [q.z1, q.z0]; } else za = zb = Math.max(q.z0, q.z1); }
    P.push(`<path d="M${X(v0)} ${Z(0)}L${X(v0)} ${Z(za)}L${X(v1)} ${Z(zb)}L${X(v1)} ${Z(0)}Z" fill="#cfccc3" stroke="${INK}" stroke-width=".03"/>`);
  }
  P.push(`<path d="M0 ${Z(0)}H${r3(W)}" stroke="${INK}" stroke-width=".05"/>`);
  P.push(`<g font-size=".22" fill="${COTA}" stroke="${COTA}" stroke-width=".02">`);
  for (let pi = 0; pi <= nP; pi++) { const z = zc + pi * H_PLANTA; P.push(`<path d="M.15 ${Z(z)}h.45"/><text stroke="none" x=".15" y="${r3(Z(z) - 0.08)}">+${n2(z)}</text>`); }
  if (zc) P.push(`<path d="M.15 ${Z(0)}h.45"/><text stroke="none" x=".15" y="${r3(Z(0) - 0.08)}">±0,00</text>`);
  P.push(`</g><text x="${r3(W - 0.2)}" y="${r3(H - 0.25)}" text-anchor="end" font-size=".2" fill="#77776f">Altura libre orientativa ≈ 2,66 m · planta 3,00 m a ejes</text></svg>`);
  return { svg: P.join('\n'), w: W, h: H, pos };
}

// ---------- cubiertas ----------
export function planoCubierta(modelo, opt = {}) {
  const o = Object.assign({ k: 40, margen: 1.6 }, opt); const b = bbox(modelo); const al = modelo.cubierta?.alero || 0;
  const W = b.w + 2 * o.margen, H = b.h + 2 * o.margen;
  const P = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r3(b.x0 - o.margen)} ${r3(b.y0 - o.margen)} ${r3(W)} ${r3(H)}" width="${Math.round(W * o.k)}" height="${Math.round(H * o.k)}" font-family="Manrope, Arial, sans-serif"><rect x="${r3(b.x0 - o.margen)}" y="${r3(b.y0 - o.margen)}" width="${r3(W)}" height="${r3(H)}" fill="#fff"/>
<defs><pattern id="rc" width="0.25" height="0.25" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V.25" stroke="${FINO}" stroke-width=".035"/></pattern></defs>`];
  const caidaPl = (pi) => (cubiertaTipo(modelo) === 'una' ? alturasCubierta(modelo, pi)?.caida || caidaCubierta(modelo) : null); // v.1.6
  modelo.plantas.forEach((p, pi) => {
    const tono = ['#e6e5de', '#f1f0ea', '#fafaf6', '#fcfcf9', '#fefefc', '#fefefd'][pi] || '#fefefc'; // hasta baja + 5
    for (const r of rectangulos(cubierta(modelo, pi))) {
      P.push(`<rect x="${r3(r.x - al)}" y="${r3(r.y - al)}" width="${r3(r.w + 2 * al)}" height="${r3(r.h + 2 * al)}" fill="${tono}" stroke="${INK}" stroke-width=".05"/>`);
      if (pi === modelo.plantas.length - 1 || cubiertaTipo(modelo) !== 'plana') P.push(faldones(modelo, { x: r.x - al, y: r.y - al, w: r.w + 2 * al, h: r.h + 2 * al }, caidaPl(pi)));
      if (r.w >= 2.2 && r.h >= 1.4 && cubiertaTipo(modelo) === 'plana') P.push(`<text x="${r3(r.x + r.w / 2)}" y="${r3(r.y + r.h / 2 + 0.08)}" text-anchor="middle" font-size=".24" fill="#55564f">CUBIERTA +${n2((pi + 1) * H_PLANTA)}</text>`);
    }
    if (pi > 0) for (const e of p.estancias) if (e.tipo === 'terraza') P.push(`<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="url(#rc)" stroke="${INK}" stroke-width=".04"/><text x="${r3(e.x + e.w / 2)}" y="${r3(e.y + e.h / 2 + 0.08)}" text-anchor="middle" font-size=".24" fill="${INK}" font-weight="700">TERRAZA ${n2(e.w * e.h)} m²</text>`);
  });
  P.push('</svg>');
  return { svg: P.join('\n'), w: W, h: H };
}

// ---------- mobiliario en planta a partir de mobiliario() (misma fuente que el 3D) ----------
const OCULTOS = new Set(['lampara', 'cable', 'grifo', 'espejo', 'rociador', 'pantalla', 'plaid', 'cojin', 'libros', 'zocalo', 'toallero', 'tronco', 'tierra', 'alcorque', 'rueda', 'tv', 'colchon', 'meseta', 'barandilla', 'estante', 'acumulador', 'peldano']);
function mueblesDesde(items, planta) {
  const out = []; const R = (x, y, w, h, rx = 0.04, ex = '') => out.push(`<rect x="${r3(x)}" y="${r3(y)}" width="${r3(w)}" height="${r3(h)}" rx="${rx}" ${ex}/>`);
  const C = (x, y, r, ex = '') => out.push(`<circle cx="${r3(x)}" cy="${r3(y)}" r="${r3(r)}" ${ex}/>`); const Ln = (x1, y1, x2, y2) => out.push(`<path d="M${r3(x1)} ${r3(y1)}L${r3(x2)} ${r3(y2)}"/>`);
  const orden = (r) => ({ alfombra: 0, cama: 2, almohada: 3, cabecero: 3 }[r] ?? 1);
  for (const it of items.slice().sort((a, b) => orden(a.rol) - orden(b.rol))) {
    const { x, y, w, h, rol } = it; if (OCULTOS.has(rol) || (it.z0 || 0) > 1.3) continue; const cx = x + w / 2, cy = y + h / 2;
    switch (rol) {
      case 'alfombra': R(x, y, w, h, 0.02, 'fill="none" stroke-dasharray=".12 .08"'); break;
      case 'cama': R(x, y, w, h, 0.05); break;
      case 'almohada': R(x, y, w, h, 0.08); break;
      case 'cabecero': R(x, y, w, h, 0.02, 'fill="#e9e6de"'); break;
      case 'armario': case 'comoda': case 'mueble bajo': case 'columna': case 'libreria': case 'estanteria': case 'consola': case 'mueble tv': R(x, y, w, h, 0.02); Ln(x, y, x + w, y + h); break;
      case 'mueble alto': R(x, y, w, h, 0.02, 'fill="none" stroke-dasharray=".1 .07"'); break;
      case 'plato ducha': R(x, y, w, h, 0.03); Ln(x, y, x + w, y + h); Ln(x + w, y, x, y + h); break;
      case 'mampara': R(x, y, w, h, 0, 'fill="#cfdfe6"'); break;
      case 'banera': R(x, y, w, h, 0.12); R(x + 0.08, y + 0.08, w - 0.16, h - 0.16, 0.2); break;
      case 'inodoro': R(x, y, w, h, Math.min(w, h) / 2.2); break;
      case 'lavabo': case 'fregadero': R(x, y, w, h, 0.06); C(cx, cy, Math.min(w, h) / 4); break;
      case 'mueble lavabo': case 'encimera': case 'isla': case 'escritorio': case 'banco': R(x, y, w, h, 0.02); break;
      case 'placa': R(x, y, w, h, 0.02); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) C(cx + a * w / 4, cy + b * h / 4, Math.min(w, h) / 7); break;
      case 'lavadora': case 'secadora': R(x, y, w, h, 0.03); C(cx, cy, Math.min(w, h) / 3); break;
      case 'sofa': R(x, y, w, h, 0.1); break;
      case 'silla': case 'taburete': if (it.forma === 'cilindro') C(cx, cy, Math.min(w, h) / 2); else R(x, y, w, h, 0.06); break;
      case 'coche': R(x, y, w, h, 0.35); R(x + w * 0.2, y + h * 0.1, w * 0.6, h * 0.8, 0.2); break;
      case 'copa': case 'arbusto': case 'planta': C(cx, cy, Math.min(w, h) / 2, 'fill="#eef0e6"'); break;
      case 'macetero': case 'maceta': R(x, y, w, h, 0.05, 'fill="#f1efe7"'); break;
      default: if (it.forma === 'cilindro' || it.forma === 'esfera') C(cx, cy, Math.min(w, h) / 2); else R(x, y, w, h, 0.03);
    }
  }
  void planta; return out.join('');
}
// Flecha de subida de la escalera según e.sube (o el lado largo por defecto)
function flechaEscalera(e, sb) {
  const hor = e.w > e.h; const sube = sb || e.sube || (hor ? 'E' : 'N');
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2; const L = (sube === 'E' || sube === 'O' ? e.w : e.h) / 2 - 0.35;
  const d = { N: [0, -1], S: [0, 1], E: [1, 0], O: [-1, 0] }[sube]; const x1 = cx - d[0] * L, y1 = cy - d[1] * L, x2 = cx + d[0] * L, y2 = cy + d[1] * L;
  const px = -d[1] * 0.12, py = d[0] * 0.12;
  return `<g stroke="${INK}" stroke-width=".035" fill="${INK}"><circle cx="${r3(x1)}" cy="${r3(y1)}" r=".07"/><path d="M${r3(x1)} ${r3(y1)}L${r3(x2)} ${r3(y2)}" fill="none"/><path d="M${r3(x2 + d[0] * 0.2)} ${r3(y2 + d[1] * 0.2)}L${r3(x2 + px)} ${r3(y2 + py)}L${r3(x2 - px)} ${r3(y2 - py)}Z"/></g><text x="${r3(x2 + d[0] * 0.35)}" y="${r3(y2 + d[1] * 0.35 + 0.07)}" text-anchor="middle" font-size=".18" font-weight="700" fill="${INK}">SUBE</text>`;
}

// ---------- cubiertas inclinadas en planta: cumbreras, limatesas y sentido de caída ----------
export const cubiertaTipo = (m) => (m.cubierta?.tipo === 'dos aguas' ? 'dos' : m.cubierta?.tipo || 'plana');
function faldones(modelo, r, caidaR) {
  const t = cubiertaTipo(modelo); if (t === 'plana') return '';
  const largoX = cumbreraEnX(modelo, r);
  const st = `stroke="${INK}" stroke-width=".04" fill="none"`; const x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.h; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const caida = (xa, ya, xb, yb) => `<path d="M${r3(xa)} ${r3(ya)}L${r3(xb)} ${r3(yb)}" stroke="${INK}" stroke-width=".025" marker-end="url(#fl)"/>`;
  const mat = CUBIERTA_MATERIALES[modelo.cubierta?.material]; const etiqueta = r.w < 3 ? '' : `<text x="${r3(cx)}" y="${r3(cy + (largoX ? 0.45 : 0))}" text-anchor="middle" font-size="${r3(Math.min(0.2, r.w / 30))}" fill="#55564f" style="paint-order:stroke" stroke="#fff" stroke-width=".06">${mat ? mat.n.toUpperCase() : ''} · ${t === 'una' ? '1' : t === 'dos' ? '2' : t === 'tres' ? '3' : '4'} AGUAS · ${modelo.cubierta?.pendiente ?? ''}°</text>`;
  const defs = `<defs><marker id="fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${INK}"/></marker></defs>`;
  if (t === 'una') { const cae = caidaR || caidaCubierta(modelo); const [xa, ya, xb, yb] = { S: [cx, y0 + 0.3, cx, y1 - 0.3], N: [cx, y1 - 0.3, cx, y0 + 0.3], O: [x1 - 0.3, cy, x0 + 0.3, cy], E: [x0 + 0.3, cy, x1 - 0.3, cy] }[cae]; return defs + caida(xa, ya, xb, yb) + `<path d="M${r3(cae === 'E' ? x1 : x0)} ${r3(cae === 'S' ? y1 : y0)}${cae === 'N' || cae === 'S' ? `H${r3(x1)}` : `V${r3(y1)}`}" stroke="${INK}" stroke-width=".09"/>` + etiqueta; } // v.1.6: la flecha y el alero bajo siguen a cubierta.caida
  const m = Math.min(r.w, r.h) / 2;
  if (t === 'dos') return defs + (largoX ? `<path d="M${r3(x0)} ${r3(cy)}H${r3(x1)}" ${st}/>` + caida(cx, cy - 0.2, cx, y0 + 0.3) + caida(cx, cy + 0.2, cx, y1 - 0.3) : `<path d="M${r3(cx)} ${r3(y0)}V${r3(y1)}" ${st}/>` + caida(cx - 0.2, cy, x0 + 0.3, cy) + caida(cx + 0.2, cy, x1 - 0.3, cy)) + etiqueta;
  if (largoX) {
    const a = x0 + m, b = x1 - m; const tres = t === 'tres'; const ini = tres && (modelo.acceso === 'O') ? x0 : a; void ini;
    const izq = tres ? `M${r3(x0)} ${r3(cy)}H${r3(b)}` : `M${r3(a)} ${r3(cy)}H${r3(b)}M${r3(x0)} ${r3(y0)}L${r3(a)} ${r3(cy)}L${r3(x0)} ${r3(y1)}`;
    return defs + `<path d="${izq}M${r3(x1)} ${r3(y0)}L${r3(b)} ${r3(cy)}L${r3(x1)} ${r3(y1)}" ${st}/>` + caida(cx, cy - 0.2, cx, y0 + 0.3) + caida(cx, cy + 0.2, cx, y1 - 0.3) + etiqueta;
  }
  const a = y0 + m, b = y1 - m; const tres = t === 'tres';
  const sup = tres ? `M${r3(cx)} ${r3(y0)}V${r3(b)}` : `M${r3(cx)} ${r3(a)}V${r3(b)}M${r3(x0)} ${r3(y0)}L${r3(cx)} ${r3(a)}L${r3(x1)} ${r3(y0)}`;
  return defs + `<path d="${sup}M${r3(x0)} ${r3(y1)}L${r3(cx)} ${r3(b)}L${r3(x1)} ${r3(y1)}" ${st}/>` + caida(cx - 0.2, cy, x0 + 0.3, cy) + caida(cx + 0.2, cy, x1 - 0.3, cy) + etiqueta;
}

// ---------- v.1.6 · forjado sanitario y accesos exteriores en planta ----------
const conAccesos = (m) => esSanitario(m) || (Array.isArray(m.exteriores) && m.exteriores.length > 0);
export const colorCubierta = (m) => { const mt = CUBIERTA_MATERIALES[m.cubierta?.material]; return (mt && (mt.colores[m.cubierta?.color] || Object.values(mt.colores)[0])) || '#8d8c84'; };
// Línea de muretes (bajo el forjado de planta baja): caras a trazos; los intermedios, más finos.
export function svgMuretes(modelo) {
  const MU = muretesSanitario(modelo); const e = MU.cimentacion.murete.espesor / 2; const P = [];
  const caras = (sg) => (sg.o === 'h' ? `M${sg.x1} ${r3(sg.y1 - e)}H${sg.x2}M${sg.x1} ${r3(sg.y1 + e)}H${sg.x2}` : `M${r3(sg.x1 - e)} ${sg.y1}V${sg.y2}M${r3(sg.x1 + e)} ${sg.y1}V${sg.y2}`);
  P.push(`<g class="muretes" fill="none" stroke="#55564f" stroke-dasharray=".2 .12" stroke-linecap="butt"><path d="${MU.perimetro.map(caras).join('')}" stroke-width=".03"/>${MU.intermedios.length ? `<path d="${MU.intermedios.map(caras).join('')}" stroke-width=".02" stroke-opacity=".7"/>` : ''}</g>`);
  const s0 = MU.perimetro.slice().sort((a, b) => b.len - a.len)[0];
  if (s0 && s0.len >= 3) { const hz = s0.o === 'h'; const x = hz ? (s0.x1 + s0.x2) / 2 : s0.x1 + (s0.lado === 'E' ? -0.3 : 0.3), y = hz ? s0.y1 + (s0.lado === 'S' ? -0.25 : 0.4) : (s0.y1 + s0.y2) / 2;
    P.push(`<text x="${r3(x)}" y="${r3(y)}" text-anchor="middle" font-size=".17" fill="#55564f" style="paint-order:stroke" stroke="#fff" stroke-width=".06"${hz ? '' : ` transform="rotate(-90 ${r3(x)} ${r3(y)})"`}>MURETES · FORJADO SANITARIO +${n2(cotaPB(modelo))}</text>`); }
  return P.join('');
}
// Escaleras, rampas y plataformas exteriores (accesosExteriores de core/cimentacion.mjs).
export function svgAccesos(XA) {
  const P = [];
  for (const X of XA) {
    P.push(`<g class="acceso" data-acc="${esc(X.id)}">`);
    for (const q of X.piezas) {
      P.push(`<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="${q.k === 'peldano' ? '#fff' : q.k === 'rampa' ? '#f3f2ec' : '#f7f6f1'}" stroke="${INK}" stroke-width=".025"/>`);
      if (q.k === 'rampa') { const cx = q.x + q.w / 2, cy = q.y + q.h / 2; const d = { N: [0, -1], S: [0, 1], E: [1, 0], O: [-1, 0] }[q.baja] || [0, 1]; const L = Math.max(0.3, (d[0] ? q.w : q.h) / 2 - 0.3);
        P.push(`<path d="M${r3(cx + d[0] * L)} ${r3(cy + d[1] * L)}L${r3(cx - d[0] * L)} ${r3(cy - d[1] * L)}" stroke="${INK}" stroke-width=".025"/><path d="M${r3(cx - d[0] * (L + 0.2))} ${r3(cy - d[1] * (L + 0.2))}l${r3(d[0] * 0.2 - d[1] * 0.1)} ${r3(d[1] * 0.2 + d[0] * 0.1)}l${r3(d[1] * 0.2)} ${r3(-d[0] * 0.2)}z" fill="${INK}"/>`); }
    }
    for (const r of X.barandillas) P.push(`<path d="M${r.x1} ${r.y1}L${r.x2} ${r.y2}" stroke="#3a6f8f" stroke-width=".04"/>`);
    const pe = X.piezas.filter((q) => q.k === 'peldano').sort((a, b) => a.n - b.n);
    if (pe.length) { const a = pe[pe.length - 1], c = pe[0]; const x1 = a.x + a.w / 2, y1 = a.y + a.h / 2, x2 = c.x + c.w / 2, y2 = c.y + c.h / 2; P.push(`<path d="M${r3(x1)} ${r3(y1)}L${r3(x2)} ${r3(y2)}" stroke="${INK}" stroke-width=".03"/><circle cx="${r3(x1)}" cy="${r3(y1)}" r=".06" fill="${INK}"/>`); }
    const lab = X.tipo === 'rampa' ? `RAMPA ${String(X.pendiente).replace('.', ',')} %` : X.tipo === 'plataforma' ? 'PLATAFORMA' : `${X.contrahuellas} PELD.`;
    const big = X.piezas.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];
    if (big) P.push(`<text x="${r3(big.x + big.w / 2)}" y="${r3(big.y + big.h / 2 + 0.06)}" text-anchor="middle" font-size=".15" font-weight="700" fill="${INK}" style="paint-order:stroke" stroke="#fff" stroke-width=".05">${lab}</text>`);
    P.push('</g>');
  }
  return P.join('');
}
