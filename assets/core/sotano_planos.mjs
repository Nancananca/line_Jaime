// v.1.6 · Planos del sótano y de la rampa: planta sótano (con rampa, patio inglés y cotas de nivel), capas bajo
// rasante para alzados y secciones (terreno a cota 0, sótano, rampa con su pendiente), perfil longitudinal de la
// rampa (vista previa del editor) y DXF de la planta sótano. Mismo estilo gráfico que core/planos.mjs.
import { r3, fmt, E_FORJADO } from './trama.mjs';
import { TIPOS } from './catalogo.mjs';
import { planoPlanta } from './planos.mjs';
import { SOTANO, modeloConSotano, derivarSotano, geometriaRampa, patiosIngleses, comprobarRampa, cotaRampa, pct } from './sotano.mjs';

const INK = '#12130f', GRIS = '#8d8c84', COTA = '#657351', TIERRA = '#e9e2d4', TIERRA_L = '#cdbfa6';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n2 = (v) => (r3(v) || 0).toFixed(2).replace('.', ',').replace('-', '−');
const nivel = (z) => (Math.abs(z) < 1e-6 ? '±0,00' : (z > 0 ? '+' : '') + n2(z));
const pts = (L) => L.map((q) => `${r3(q[0])},${r3(q[1])}`).join(' ');

// Altura extra (m) que necesitan alzados y secciones por debajo de la cota 0 (0 sin sótano: el plano no cambia).
export const bajoRasante = (m) => (m?.sotano ? r3(m.sotano.altura + SOTANO.losa + 0.9) : 0);

// ---------- planta sótano ----------
// Mismas opciones que planoPlanta (k, cotas, rotulos, muebles, rejilla, margen, id…). Devuelve { svg, interior, ox, oy,
// w, h, util, construida } en coordenadas del modelo (el editor usa «interior»).
export function planoSotano(modelo, opt = {}) {
  const s = modelo?.sotano; if (!s) return null;
  const id = opt.id || 'ps'; const g = derivarSotano(modelo); const R = g.rampa?.ok ? g.rampa : null; const PI = patiosIngleses(modelo);
  const base = planoPlanta(modeloConSotano(modelo), 0, { ...opt, id, g, norte: null });
  let ox = base.ox, oy = base.oy, x1 = base.ox + base.w, y1 = base.oy + base.h; const mg = opt.cotas === false ? 0.6 : 1.4;
  for (const b of [R?.bbox, ...PI.map((p) => ({ x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h }))]) if (b) { ox = Math.min(ox, b.x0 - mg); oy = Math.min(oy, b.y0 - mg); x1 = Math.max(x1, b.x1 + mg); y1 = Math.max(y1, b.y1 + mg); }
  const W = x1 - ox, H = y1 - oy; const k = opt.k || 48;
  const P = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r3(ox)} ${r3(oy)} ${r3(W)} ${r3(H)}" width="${Math.round(W * k)}" height="${Math.round(H * k)}" font-family="Manrope, 'Segoe UI', Arial, sans-serif">`];
  P.push(`<rect x="${r3(ox)}" y="${r3(oy)}" width="${r3(W)}" height="${r3(H)}" fill="#fff"/>`);
  P.push(base.interior);
  P.push(capaSotanoPlanta(modelo, { id, R, PI, rotulos: opt.rotulos !== false, ox, oy, W, H }));
  if (opt.norte != null) P.push(`<g transform="translate(${r3(ox + W - 1)} ${r3(oy + 1)}) rotate(${r3(opt.norte)})"><circle r=".55" fill="#fff" stroke="${INK}" stroke-width=".03"/><path d="M0 -.45L.18 .28L0 .12L-.18 .28Z" fill="${INK}"/></g>`);
  P.push('</svg>');
  return { svg: P.join('\n'), interior: P.slice(1, -1).join('\n'), ox, oy, w: W, h: H, util: base.util, construida: base.construida, cota: s.cota };
}
// Capa propia del sótano sobre la planta: patios ingleses, rampa (pendientes, mesetas, niveles, muros) y rótulo de cota.
export function capaSotanoPlanta(modelo, o = {}) {
  const s = modelo.sotano; const R = o.R !== undefined ? o.R : (geometriaRampa(modelo)?.ok ? geometriaRampa(modelo) : null); const PI = o.PI || patiosIngleses(modelo); const P = [];
  for (const p of PI) {
    P.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#f4f6ee"/>`);
    const hor = p.lado === 'N' || p.lado === 'S'; const n = Math.max(2, Math.round((hor ? p.w : p.h) / 0.15)); let d = '';
    for (let i = 1; i < n; i++) d += hor ? `M${r3(p.x + (i * p.w) / n)} ${p.y}v${p.h}` : `M${p.x} ${r3(p.y + (i * p.h) / n)}h${p.w}`;
    P.push(`<path d="${d}" stroke="${GRIS}" stroke-width=".012"/>`); // rejilla tramex
    const ext = { N: [p.x, p.y, p.x + p.w, p.y], S: [p.x, p.y + p.h, p.x + p.w, p.y + p.h], O: [p.x, p.y, p.x, p.y + p.h], E: [p.x + p.w, p.y, p.x + p.w, p.y + p.h] }[p.lado];
    P.push(`<path d="M${ext[0]} ${ext[1]}L${ext[2]} ${ext[3]}" stroke="${INK}" stroke-width=".2"/>`);
    if (o.rotulos !== false && (hor ? p.w : p.h) >= 2.5) P.push(`<text x="${r3(p.x + p.w / 2)}" y="${r3(p.y + p.h / 2 + 0.07)}" text-anchor="middle" font-size=".18" fill="#55564f"${hor ? '' : ` transform="rotate(-90 ${r3(p.x + p.w / 2)} ${r3(p.y + p.h / 2)})"`}>PATIO INGLÉS</text>`);
  }
  if (R) {
    const malo = comprobarRampa(modelo).some((x) => x.nivel === 'error'); const col = malo ? '#c0392b' : INK;
    P.push(`<polygon points="${pts(R.contorno)}" fill="#f1efe8"/><polygon points="${pts(R.contorno)}" fill="url(#ry${o.id || 'ps'})" fill-opacity=".55"/>`);
    // cambios de tramo
    const V = R.vertices; let d = '';
    for (let i = 1; i < V.length - 1; i++) if (V[i].k !== V[i + 1].k) d += `M${R.izq[i][0]} ${R.izq[i][1]}L${R.der[i][0]} ${R.der[i][1]}`;
    if (d) P.push(`<path d="${d}" stroke="${GRIS}" stroke-width=".03"/>`);
    // muros laterales de la rampa
    P.push(`<polyline points="${pts(R.izq)}" fill="none" stroke="${col}" stroke-width=".2"/><polyline points="${pts(R.der)}" fill="none" stroke="${col}" stroke-width=".2"/>`);
    if (R.r.sentido === 'doble') P.push(`<polyline points="${pts(V.map((v) => [v.x, v.y]))}" fill="none" stroke="${GRIS}" stroke-width=".03" stroke-dasharray=".4 .25"/>`);
    // flechas de subida con la pendiente de cada tramo, en su mitad
    if (o.rotulos !== false) for (const q of R.piezas) {
      if (q.L < 1.2) continue; const sm = (q.s0 + q.s1) / 2; const i = V.findIndex((v, j) => j > 0 && v.s >= sm - 1e-6); if (i < 1) continue;
      const a = V[i - 1], b = V[i]; const u = (sm - a.s) / Math.max(1e-6, b.s - a.s); const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u;
      const dx = (b.x - a.x) / Math.max(1e-6, b.s - a.s), dy = (b.y - a.y) / Math.max(1e-6, b.s - a.s); let ang = (Math.atan2(dy, dx) * 180) / Math.PI; const fl = ang > 90 || ang < -90; if (fl) ang += 180;
      const largo = Math.min(1.6, q.L * 0.6); const meseta = /Meseta/.test(q.n);
      P.push(`<g transform="translate(${r3(x)} ${r3(y)}) rotate(${r3(ang)})"><path d="M${fl ? largo / 2 : -largo / 2} 0H${fl ? -largo / 2 : largo / 2}" stroke="${INK}" stroke-width=".035"/><path d="M${fl ? -largo / 2 : largo / 2} 0l${fl ? 0.18 : -0.18} -.09v.18Z" fill="${INK}"/><text y="-.12" text-anchor="middle" font-size=".2" font-weight="700" fill="${INK}" style="paint-order:stroke" stroke="#f1efe8" stroke-width=".06">${meseta ? 'MESETA ' : ''}${pct(q.p)}</text><text y=".3" text-anchor="middle" font-size=".16" fill="#55564f">${esc(q.n.toLowerCase())} · ${n2(q.L)} m</text></g>`);
    }
    // niveles: puerta y arranque
    const ni = (x, y, z) => `<g transform="translate(${r3(x)} ${r3(y)})"><path d="M-.14 -.14L0 0L.14 -.14Z" fill="${COTA}"/><text x=".2" y="-.04" font-size=".2" fill="${COTA}" style="paint-order:stroke" stroke="#fff" stroke-width=".06">${nivel(z)}</text></g>`;
    P.push(ni(V[0].x, V[0].y, V[0].z), ni(V[V.length - 1].x, V[V.length - 1].y, 0));
    if (o.rotulos !== false) { const f = V[V.length - 1]; P.push(`<text x="${r3(f.x + R.arranque.dir[0] * 0.5)}" y="${r3(f.y + R.arranque.dir[1] * 0.5 + 0.3)}" text-anchor="middle" font-size=".2" font-weight="700" fill="${col}">RAMPA ${n2(R.ancho)} m · ${n2(R.longitud)} m${malo ? ' · NO VÁLIDA' : ''}</text>`); }
  }
  // cota de la planta y nota constructiva
  if (o.rotulos !== false && s.estancias.length) {
    const x0 = Math.min(...s.estancias.map((e) => e.x)), y0 = Math.min(...s.estancias.map((e) => e.y));
    P.push(`<text x="${r3(x0)}" y="${r3(y0 - 0.25)}" font-size=".22" font-weight="700" fill="${COTA}">PLANTA SÓTANO · NPT ${nivel(s.cota)} · altura libre ${n2(s.libre)} m</text>`);
    const ym = Math.max(...s.estancias.map((e) => e.y + e.h));
    P.push(`<text x="${r3(x0)}" y="${r3(ym + 0.45)}" font-size=".16" fill="#77776f">Muros de contención (e = ${n2(SOTANO.muro)}) y losa de hormigón armado impermeabilizados · no es sistema CUEVA en seco</text>`);
  }
  return P.join('\n');
}

// ---------- alzados ----------
// Capa bajo rasante de un alzado: terreno, contorno oculto del sótano, rampa en proyección y puerta de garaje si se
// ve desde ese lado. c: { px(x, y) → coordenada horizontal del alzado, Z(z) → vertical, W } (las de alzado()).
export function capaSotanoAlzado(modelo, lado, c) {
  const s = modelo?.sotano; if (!s) return ''; const { px, Z, W } = c; const P = []; const id = 'tz' + lado; const fondo = s.cota - SOTANO.losa - 0.6;
  P.push(`<defs><pattern id="${id}" width=".3" height=".3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V.3" stroke="${TIERRA_L}" stroke-width=".03"/></pattern></defs>`);
  P.push(`<rect x="0" y="${Z(0)}" width="${r3(W)}" height="${r3(-fondo)}" fill="${TIERRA}"/><rect x="0" y="${Z(0)}" width="${r3(W)}" height="${r3(-fondo)}" fill="url(#${id})"/>`);
  if (s.estancias.length) {
    const xs = s.estancias.flatMap((e) => [px(e.x, e.y), px(e.x + e.w, e.y + e.h)]); const a = Math.min(...xs), b = Math.max(...xs);
    P.push(`<rect x="${r3(a)}" y="${Z(0)}" width="${r3(b - a)}" height="${r3(-(s.cota - SOTANO.losa))}" fill="#fff" fill-opacity=".55" stroke="${GRIS}" stroke-width=".035" stroke-dasharray=".25 .15"/>`);
    P.push(`<text x="${r3(a + 0.25)}" y="${r3(Z(s.cota) - 0.25)}" font-size=".24" fill="#77776f" letter-spacing=".06">SÓTANO ${nivel(s.cota)}</text>`);
  }
  const R = geometriaRampa(modelo);
  if (R?.ok) {
    const borde = [...R.izq.map((q, i) => [q[0], q[1], R.vertices[i].z]), ...R.der.map((q, i) => [q[0], q[1], R.vertices[i].z]).reverse()];
    const proy = borde.map(([x, y, z]) => [px(x, y), Z(z)]); // superficie de la rampa vista desde fuera
    const arriba = borde.map(([x, y]) => [px(x, y), Z(0)]);
    const xa = Math.min(...arriba.map((q) => q[0])), xb = Math.max(...arriba.map((q) => q[0]));
    P.push(`<polygon points="${pts([...proy])}" fill="#f6f5f0" stroke="${INK}" stroke-width=".03"/>`);
    P.push(`<path d="M${r3(xa)} ${Z(0)}H${r3(xb)}" stroke="${INK}" stroke-width=".06"/>`);
    if (R.puerta.lado === lado) { const u0 = px(R.puerta.x, R.puerta.y); const w = R.puerta.ancho; P.push(`<rect x="${r3(u0 - w / 2)}" y="${Z(s.cota + R.puerta.alto)}" width="${r3(w)}" height="${r3(R.puerta.alto)}" fill="#b98e62" stroke="${INK}" stroke-width=".03"/>`); for (let k = 1; k < 6; k++) P.push(`<path d="M${r3(u0 - w / 2)} ${r3(Z(s.cota + (k * R.puerta.alto) / 6))}h${r3(w)}" stroke="#8a6238" stroke-width=".015"/>`); }
    P.push(`<text x="${r3((xa + xb) / 2)}" y="${r3(Z(0) - 0.12)}" text-anchor="middle" font-size=".18" fill="${COTA}">rampa ${pct(R.r.pendiente)}</text>`);
  }
  P.push(`<g font-size=".22" fill="${COTA}" stroke="${COTA}" stroke-width=".02"><path d="M${r3(W - 0.95)} ${Z(s.cota)}h.5"/><text stroke="none" x="${r3(W - 0.42)}" y="${r3(Z(s.cota) + 0.08)}">${n2(s.cota)}</text></g>`);
  P.push(`<path d="M0 ${Z(0)}H${r3(W)}" stroke="${INK}" stroke-width=".07"/>`);
  return P.join('\n');
}

// ---------- secciones ----------
// Capa bajo rasante de una sección por x = pos (eje 'x', se ve a lo largo de y) o y = pos (eje 'y'): terreno, estancias
// del sótano cortadas (losa, muros de contención, forjado fuera de la casa) y la rampa cortada con su pendiente.
// c: { X(u) → horizontal del plano, Z(z) → vertical, W }.
export function capaSotanoSeccion(modelo, eje, pos, c) {
  const s = modelo?.sotano; if (!s) return ''; const { X, Z, W } = c; const P = []; const id = 'ts' + eje; const fondo = s.cota - SOTANO.losa - 0.6;
  const cruza = (e) => (eje === 'x' ? e.x < pos && e.x + e.w > pos : e.y < pos && e.y + e.h > pos); const U = (e) => (eje === 'x' ? [e.y, e.y + e.h] : [e.x, e.x + e.w]);
  P.push(`<defs><pattern id="${id}" width=".3" height=".3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V.3" stroke="${TIERRA_L}" stroke-width=".03"/></pattern></defs>`);
  P.push(`<rect x="0" y="${Z(0)}" width="${r3(W)}" height="${r3(-fondo)}" fill="${TIERRA}"/><rect x="0" y="${Z(0)}" width="${r3(W)}" height="${r3(-fondo)}" fill="url(#${id})"/>`);
  const corta = s.estancias.filter(cruza).map((e) => ({ e, u: U(e) })).sort((a, b) => a.u[0] - b.u[0]);
  // tramos continuos (para los muros de contención de los extremos)
  const runs = []; for (const q of corta) { const r = runs[runs.length - 1]; if (r && Math.abs(r[1] - q.u[0]) < 1e-6) r[1] = q.u[1]; else runs.push([q.u[0], q.u[1]]); }
  const pb = modelo.plantas[0].estancias.filter((e) => !TIPOS[e.tipo].vacio && e.tipo !== 'piscina' && cruza(e)).map(U);
  const libreSup = s.libre; const zt = -E_FORJADO;
  for (const [a, b] of runs) {
    P.push(`<rect x="${X(a - 0.15)}" y="${Z(zt)}" width="${r3(b - a + 0.3)}" height="${r3(libreSup)}" fill="#fff"/>`); // vacío del sótano
    P.push(`<rect x="${X(a - 0.3)}" y="${Z(s.cota)}" width="${r3(b - a + 0.6)}" height="${SOTANO.losa}" fill="${INK}"/>`); // losa
    for (const u of [a, b]) P.push(`<rect x="${X(u - 0.15)}" y="${Z(0)}" width=".3" height="${r3(-s.cota)}" fill="${INK}"/>`); // muros de contención
    // forjado de techo donde no hay casa encima (la casa ya dibuja su forjado de suelo)
    let cur = a; const cubre = pb.filter(([p0, p1]) => p1 > a && p0 < b).sort((x, y) => x[0] - y[0]);
    for (const [p0, p1] of cubre) { if (p0 > cur + 1e-6) P.push(`<rect x="${X(cur)}" y="${Z(0)}" width="${r3(p0 - cur)}" height="${E_FORJADO}" fill="${INK}"/>`); cur = Math.max(cur, p1); }
    if (cur < b - 1e-6) P.push(`<rect x="${X(cur)}" y="${Z(0)}" width="${r3(b - cur)}" height="${E_FORJADO}" fill="${INK}"/>`);
  }
  for (const { e, u } of corta) {
    const t = TIPOS[e.tipo]; const w = u[1] - u[0];
    P.push(`<rect x="${X(u[0])}" y="${Z(zt)}" width="${r3(w)}" height="${r3(libreSup)}" fill="${t.color}" fill-opacity=".45"/>`);
    P.push(`<path d="M${X(u[0])} ${Z(s.cota)}V${Z(zt)}M${X(u[1])} ${Z(s.cota)}V${Z(zt)}" stroke="${INK}" stroke-width=".08"/>`);
    if (w >= 1.5) P.push(`<text x="${X(u[0] + w / 2)}" y="${Z(s.cota + 1.3)}" text-anchor="middle" font-size="${w < 3 ? 0.2 : 0.25}" font-weight="700" fill="${INK}">${esc((e.nombre || t.n).toUpperCase().slice(0, Math.max(6, Math.floor(w * 5))))}</text>`);
  }
  // rampa cortada: muestreo de la línea de corte dentro de la rampa
  const R = geometriaRampa(modelo);
  if (R?.ok) {
    const [u0, u1] = eje === 'x' ? [R.bbox.y0, R.bbox.y1] : [R.bbox.x0, R.bbox.x1]; const L = []; let cur = null;
    for (let u = u0; u <= u1 + 1e-6; u += 0.05) { const z = eje === 'x' ? cotaRampa(R, pos, u) : cotaRampa(R, u, pos); if (z == null) { if (cur) L.push(cur); cur = null; continue; } (cur ||= []).push([u, z]); }
    if (cur) L.push(cur);
    for (const t of L) {
      if (t.length < 2) continue; const sup = t.map(([u, z]) => [X(u), Z(z)]), inf = t.map(([u, z]) => [X(u), Z(z - 0.25)]).reverse();
      P.push(`<rect x="${X(t[0][0])}" y="${Z(0)}" width="${r3(t[t.length - 1][0] - t[0][0])}" height="${r3(-Math.min(...t.map((q) => q[1])))}" fill="#fff"/>`); // hueco de la rampa en el terreno
      P.push(`<polygon points="${pts([...sup, ...inf])}" fill="${GRIS}" stroke="${INK}" stroke-width=".03"/>`);
      const zm = t[Math.floor(t.length / 2)]; const pend = Math.abs(t[t.length - 1][1] - t[0][1]) / Math.max(0.01, t[t.length - 1][0] - t[0][0]);
      P.push(`<text x="${X(zm[0])}" y="${r3(Z(zm[1]) - 0.15)}" text-anchor="middle" font-size=".2" fill="${COTA}">rampa${pend > 0.005 ? ' ' + pct(pend) : ''}</text>`);
    }
  }
  P.push(`<g font-size=".22" fill="${COTA}" stroke="${COTA}" stroke-width=".02"><path d="M.15 ${Z(s.cota)}h.45"/><text stroke="none" x=".15" y="${r3(Z(s.cota) - 0.08)}">${n2(s.cota)}</text></g>`);
  P.push(`<path d="M0 ${Z(0)}H${r3(W)}" stroke="${INK}" stroke-width=".05"/>`);
  return P.join('\n');
}

// ---------- perfil longitudinal de la rampa (vista previa del editor y planos) ----------
// Desarrollo de la rampa (de la puerta a la calle) con la escala vertical exagerada ×3: pendiente y largo de cada
// tramo, cotas, gálibo en la puerta y terreno. Devuelve '' si no hay rampa calculable.
export function svgPerfilRampa(modelo, { ancho = 320, exag = 3 } = {}) {
  const R = geometriaRampa(modelo); if (!R?.ok) return ''; const s = modelo.sotano;
  const pad = 14, L = R.longitud, D = R.D; const kx = (ancho - 2 * pad - 30) / Math.max(1, L), ky = kx * exag;
  const top = 22, alto = Math.round(top + (D + SOTANO.losa + 0.5) * ky + 34);
  const X = (u) => r3(pad + 30 + u * kx), Y = (z) => r3(top + -z * ky);
  const prof = R.vertices.map((v) => [X(v.s), Y(v.z)]);
  const P = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" width="100%" font-family="Manrope, 'Segoe UI', Arial, sans-serif" role="img" aria-label="Perfil de la rampa">`];
  P.push(`<rect x="0" y="${Y(0)}" width="${ancho}" height="${r3(alto - Y(0))}" fill="${TIERRA}"/>`);
  P.push(`<polygon points="${pts([...prof, [X(0), Y(0)]])}" fill="#fff"/>`); // hueco de la rampa (entre la rampa y el terreno)
  P.push(`<rect x="${X(-0.6)}" y="${Y(0)}" width="${r3(0.6 * kx + 1)}" height="${r3((D + SOTANO.losa) * ky)}" fill="#fff"/>`);
  P.push(`<rect x="${X(-0.6)}" y="${Y(0)}" width="${r3(0.3 * kx)}" height="${r3((D + SOTANO.losa) * ky)}" fill="${INK}"/>`); // muro del sótano
  P.push(`<rect x="${X(-0.6)}" y="${Y(0)}" width="${r3(0.6 * kx)}" height="${r3(E_FORJADO * ky)}" fill="${INK}"/>`); // forjado de planta baja
  P.push(`<polygon points="${pts([...prof, ...prof.map(([x, y]) => [x, r3(y + 0.25 * ky)]).reverse()])}" fill="${GRIS}"/>`);
  P.push(`<polyline points="${pts(prof)}" fill="none" stroke="${INK}" stroke-width="1.6"/>`);
  P.push(`<path d="M0 ${Y(0)}H${ancho}" stroke="${INK}" stroke-width="1"/>`);
  // gálibo en la puerta
  const ga = Math.min(R.r.puertaAlto, s.libre); const malo = ga < 2.2 - 1e-6;
  P.push(`<path d="M${X(0.15)} ${Y(-D)}V${Y(-D + ga)}" stroke="${malo ? '#c0392b' : COTA}" stroke-width="1" stroke-dasharray="3 2"/><text x="${X(0.3)}" y="${r3(Y(-D + ga) + 9)}" font-size="8.5" fill="${malo ? '#c0392b' : COTA}">gálibo ${n2(ga)}</text>`);
  // tramos
  for (const q of R.piezas) {
    const xm = X((q.s0 + q.s1) / 2), ym = Y((q.z0 + q.z1) / 2); const mal = (/Meseta/.test(q.n) && q.p > 0.05 + 1e-6) || (q.p > 0.16 + 1e-6);
    P.push(`<path d="M${X(q.s1)} ${r3(Y(q.z1) - 4)}v8" stroke="${GRIS}" stroke-width=".8"/>`);
    if (q.L * kx >= 22) P.push(`<text x="${xm}" y="${r3(ym - 6)}" text-anchor="middle" font-size="9" font-weight="700" fill="${mal ? '#c0392b' : INK}">${pct(q.p)}</text><text x="${xm}" y="${r3(ym + 15)}" text-anchor="middle" font-size="7.5" fill="#55564f">${n2(q.L)}</text>`);
  }
  P.push(`<text x="${X(0)}" y="${r3(Y(-D) + 30)}" font-size="8.5" fill="${COTA}">${n2(-D)}</text><text x="${pad}" y="${r3(Y(0) - 4)}" font-size="8.5" fill="${COTA}">±0,00</text>`);
  P.push(`<text x="${ancho - pad}" y="${alto - 6}" text-anchor="end" font-size="8.5" fill="#55564f">desarrollo ${n2(L)} m · desnivel ${n2(D)} m · vertical ×${exag}</text></svg>`);
  return P.join('');
}
