// v.1.6 · Planta sótano (bajo rasante) y rampa de acceso de vehículos.
// El sótano es un campo aparte, `modelo.sotano` (id 'S1'), y NO entra en `modelo.plantas`: los índices de las plantas
// (0 = planta baja) no cambian y un modelo sin sótano se comporta exactamente igual que antes. Estas funciones lo
// integran en la geometría (`derivar(m, -1)`), las reglas, los planos, el 3D, el presupuesto y el editor.
// Construcción: el sótano NO es sistema CUEVA en seco: muros de contención y losa de hormigón armado, impermeabilizados
// por el trasdós, con drenaje perimetral. Valores de rampa: los de una ordenanza tipo (Madrid y similares): pendiente
// ≤ 16 % en recta y ≤ 12 % en curva, mesetas de 4,50 m al 5 % como máximo en los extremos, ancho ≥ 3,00 m en un
// sentido y ≥ 5,00 m en doble sentido, gálibo ≥ 2,20 m. Evidencia «concepto»: cada ayuntamiento manda.
import { T, TE, r3, snap, clamp, uid, onGrid, fmt, E_FORJADO, E_FACHADA } from './trama.mjs';
import { TIPOS, esInt, esDorm, HABITABLES } from './catalogo.mjs';
import { celdasPlanta, muros, huecosFachada, puertas, bbox, superficies } from './geometria.mjs';

export const SOTANO = {
  id: 'S1', nombre: 'Planta sótano',
  libre: 2.74, libreMin: 2.5, libreMax: 3.5,  // altura libre (suelo del sótano → cara inferior del forjado de planta baja)
  muro: 0.3,                                   // muro de contención de hormigón armado (espesor)
  losa: 0.4,                                   // losa de cimentación del sótano
  sobreexc: 0.6,                               // sobreexcavación perimetral para encofrar, impermeabilizar y drenar
  patio: 1.2, patioMin: 0.8, patioMax: 3.0,    // ancho libre del patio inglés
};
export const RAMPA = {
  anchoUno: 3.0, anchoDoble: 5.0,              // ancho mínimo en un sentido / en doble sentido
  pendRecta: 0.16, pendCurva: 0.12,            // pendiente máxima en recta y en curva (o rellano de giro)
  pendMeseta: 0.05, meseta: 4.5,               // mesetas de 4,50 m al 5 % como máximo en los extremos
  acuerdo: 2.0,                                // tramo de acuerdo a media pendiente entre meseta y rampa
  galibo: 2.2, radioEje: 6.0,                  // gálibo mínimo; radio mínimo recomendado en el eje de una curva
  pendiente: 0.15, pendMesetaDef: 0.04, puertaAlto: 2.4,
};
export const FORMAS_RAMPA = { recta: 'Recta', L: 'En L (giro de 90° con rellano)', curva: 'Curva (por tramos)' };
export const PROGRAMAS_SOTANO = { garaje: 'Garaje', bodega: 'Bodega', completo: 'Garaje, bodega, trastero e instalaciones', vacio: 'Solo la escalera' };
const PORTON_MODELOS = ['seccional', 'basculante', 'enrollable', 'corredera', 'batiente']; // = claves de PORTONES (geometria)
const LADOS = ['N', 'S', 'E', 'O'];
const DIR = { N: [0, -1], S: [0, 1], E: [1, 0], O: [-1, 0] };
export const LADO_TXT = { N: 'arriba (N)', S: 'abajo (S)', E: 'derecha (E)', O: 'izquierda (O)' };
const num = (v, d) => (v != null && v !== '' && !Array.isArray(v) && Number.isFinite(+v) ? +v : d);
export const pct = (v) => fmt(v * 100, Math.abs(v * 100 - Math.round(v * 100)) < 0.05 ? 0 : 1) + ' %';
export const tipoSotanoOk = (t) => !!TIPOS[t] && esInt(t) && t !== 'doble_altura';
export const cotaSotano = (m) => (m?.sotano ? m.sotano.cota : 0);

// ---------- datos ----------
// Sanea `modelo.sotano` (lo llama normalizar()). Sin sótano no toca nada.
export function normalizarSotano(m) {
  if (!m || !('sotano' in m)) return m;
  const s = m.sotano;
  if (!s || typeof s !== 'object' || Array.isArray(s)) { delete m.sotano; return m; }
  s.id = SOTANO.id; s.nombre = SOTANO.nombre;
  s.libre = r3(clamp(Math.round(num(s.libre, SOTANO.libre) * 100) / 100, SOTANO.libreMin, SOTANO.libreMax));
  s.altura = r3(s.libre + E_FORJADO); s.cota = r3(-s.altura);
  s.apoyos = (Array.isArray(s.apoyos) ? s.apoyos : []).filter((a) => a && Number.isFinite(+a.x) && Number.isFinite(+a.y)).map((a) => ({ x: snap(+a.x), y: snap(+a.y) }));
  s.estancias = (Array.isArray(s.estancias) ? s.estancias : []).filter((e) => e && typeof e === 'object' && tipoSotanoOk(e.tipo));
  for (const e of s.estancias) {
    e.id = e.id || uid(); e.x = snap(num(e.x, 0)); e.y = snap(num(e.y, 0)); e.w = Math.max(T, snap(num(e.w, 3))); e.h = Math.max(T, snap(num(e.h, 3)));
  }
  for (const k of ['huecosFijos', 'huecosManual', 'puertasManual', 'huecosEst', 'bordes']) delete s[k]; // en el sótano los huecos son automáticos
  if (s.patio != null) {
    const l = [...new Set((Array.isArray(s.patio?.lados) ? s.patio.lados : []).filter((x) => LADOS.includes(x)))];
    if (!l.length) delete s.patio; else s.patio = { lados: l, ancho: r3(clamp(Math.round(num(s.patio.ancho, SOTANO.patio) * 20) / 20, SOTANO.patioMin, SOTANO.patioMax)) };
  }
  if (s.rampa != null) { const r = sanearRampa(s.rampa, m); if (r) s.rampa = r; else delete s.rampa; }
  return m;
}
// Configuración de la rampa con sus valores por defecto (no corrige lo que incumple: eso lo dice la validación).
export function sanearRampa(r0, m) {
  if (!r0 || typeof r0 !== 'object' || Array.isArray(r0)) return null;
  const r = {};
  r.sentido = r0.sentido === 'doble' ? 'doble' : 'uno';
  r.ancho = r3(clamp(Math.round(num(r0.ancho, r.sentido === 'doble' ? RAMPA.anchoDoble : RAMPA.anchoUno) * 20) / 20, 2, 8));
  r.forma = Object.hasOwn(FORMAS_RAMPA, r0.forma) ? r0.forma : 'recta';
  r.lado = LADOS.includes(r0.lado) ? r0.lado : LADOS.includes(m?.acceso) ? m.acceso : 'N';
  r.pos = r0.pos == null || r0.pos === '' || !Number.isFinite(+r0.pos) ? null : r3(clamp(Math.round(+r0.pos * 20) / 20, -500, 500));
  r.giro = r0.giro === 'izq' ? 'izq' : 'der';
  r.pendiente = r3(clamp(num(r0.pendiente, RAMPA.pendiente), 0.02, 0.3));
  r.pendMeseta = r3(clamp(num(r0.pendMeseta, RAMPA.pendMesetaDef), 0, 0.1));
  r.mesetaSup = r3(clamp(num(r0.mesetaSup, RAMPA.meseta), 0, 12));
  r.mesetaInf = r3(clamp(num(r0.mesetaInf, RAMPA.meseta), 0, 12));
  r.acuerdo = r3(clamp(num(r0.acuerdo, RAMPA.acuerdo), 0, 6));
  r.tramo1 = r3(clamp(num(r0.tramo1, 0), 0, 40));
  r.radio = r3(clamp(num(r0.radio, RAMPA.radioEje), 3, 30));
  r.angulo = [90, 180].includes(+r0.angulo) ? +r0.angulo : 90;
  r.puerta = PORTON_MODELOS.includes(r0.puerta) ? r0.puerta : 'seccional';
  r.puertaAlto = r3(clamp(num(r0.puertaAlto, RAMPA.puertaAlto), 1.8, 3.2));
  return r;
}
// Modelo «extendido» para dibujar el sótano con las herramientas de las plantas: el sótano en el índice 0 y la planta
// baja encima (la escalera del sótano sube a ella). Solo para planos, mobiliario y 3D; nunca se guarda.
export const modeloConSotano = (m) => ({ ...m, plantas: [m.sotano, ...m.plantas] });
// Modelo auxiliar para la geometría del sótano: el sótano en el índice 1 (así huecosFachada no pone puerta de entrada).
const modeloAux = (m) => ({ ...m, medianeras: [], plantas: [{ id: 'aux', estancias: [] }, m.sotano] });

// ---------- geometría derivada (derivar(m, -1)) ----------
// Muros, huecos y puertas del sótano: el perímetro es muro de contención (sin huecos) salvo en los lados con patio
// inglés (ventanas automáticas); la puerta de garaje es la de la rampa. Mismo formato que derivar().
export function derivarSotano(m) {
  const s = m?.sotano; const vacio = { segs: [], huecos: [], puertas: [], sinAcceso: [], vuelos: { max: 0, celdas: [], viola: [] }, cubierta: [], sotano: true, rampa: null };
  if (!s || !s.estancias?.length) return vacio;
  const V = modeloAux(m); const segs = muros(s);
  const lados = new Set(s.patio?.lados || []);
  let hf = lados.size ? huecosFachada(V, 1, segs).filter((h) => lados.has(h.lado) && !['porton', 'puerta'].includes(h.tipo)) : [];
  const R = s.rampa ? geometriaRampa(m) : null; const extra = [];
  if (R?.ok) {
    const p = R.puerta; const hor = p.o === 'h';
    hf = hf.filter((h) => !(h.o === p.o && (hor ? Math.abs(h.y - p.y) < 1e-6 && Math.abs(h.x - p.x) < (h.ancho + p.ancho) / 2 + 0.2 : Math.abs(h.x - p.x) < 1e-6 && Math.abs(h.y - p.y) < (h.ancho + p.ancho) / 2 + 0.2)));
    hf.push({ ...p }); extra.push(p.est);
  }
  const pu = puertas(V, 1, segs, hf, extra);
  return { ...vacio, segs, huecos: hf, puertas: pu.puertas, sinAcceso: pu.sinAcceso, rampa: R };
}

// ---------- rampa ----------
const gira = (v, a) => { const c = Math.cos(a), sn = Math.sin(a); return [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c]; }; // a > 0: a la derecha (horario en planta, y hacia abajo)
const nIzq = (t) => [t[1], -t[0]];
const unit = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
export function dentroPoligono(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c; } return c; }
const distSeg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const l2 = dx * dx + dy * dy; const t = l2 ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, 0, 1) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
const areaPoli = (p) => Math.abs(p.reduce((a, q, i) => { const n = p[(i + 1) % p.length]; return a + q[0] * n[1] - n[0] * q[1]; }, 0) / 2);

// Geometría completa de la rampa: perfil por tramos (de la puerta del garaje, abajo, a la calle, arriba), eje, bordes,
// contorno en planta (coordenadas del modelo), tramos con su cota y la puerta de garaje. null si no hay rampa;
// { ok: false, error } si no encuentra la fachada del sótano por la que entra.
export function geometriaRampa(m) {
  const s = m?.sotano; const r = s?.rampa; if (!r) return null;
  const D = r3(s.altura || SOTANO.libre + E_FORJADO); const hor = r.lado === 'N' || r.lado === 'S';
  const res = { r, D, ancho: r.ancho, lado: r.lado, ok: false, error: null };
  const segs = muros(s).filter((q) => q.clase === 'fachada' && q.lado === r.lado);
  const a0 = (q) => (hor ? q.x1 : q.y1), a1 = (q) => (hor ? q.x2 : q.y2), lin = (q) => (hor ? q.y1 : q.x1);
  const fuera = (q) => ({ N: -q.y1, S: q.y1, E: q.x1, O: -q.x1 })[r.lado];
  let pos = r.pos;
  if (pos == null) { // centrada en la fachada del garaje de ese lado (la más exterior y larga); si no, en la fachada más larga
    const q = segs.filter((x) => x.int.tipo === 'garaje').sort((p, x) => fuera(x) - fuera(p) || x.len - p.len)[0] || segs.slice().sort((p, x) => x.len - p.len)[0];
    if (q) pos = (a0(q) + a1(q)) / 2;
  }
  if (pos == null) return { ...res, error: 'sinFachada' };
  const seg = segs.filter((q) => a0(q) <= pos + 1e-6 && a1(q) >= pos - 1e-6).sort((p, q) => fuera(q) - fuera(p))[0];
  if (!seg) return { ...res, pos, error: 'sinFachada' };
  const L0 = a0(seg), L1 = a1(seg); const pw = r3(Math.max(0.6, Math.min(clamp(r.ancho - 0.5, 2.4, 6), seg.len - 0.3)));
  pos = L1 - L0 < pw + 0.3 ? r3((L0 + L1) / 2) : r3(clamp(pos, L0 + pw / 2 + 0.15, L1 - pw / 2 - 0.15));
  const P0 = hor ? [pos, lin(seg)] : [lin(seg), pos];
  const puerta = { tipo: 'porton', ancho: pw, alto: r.puertaAlto, alf: 0, o: seg.o, lado: r.lado, est: seg.int.id, auto: false, rampa: true, modelo: r.puerta, x: r3(P0[0]), y: r3(P0[1]) };
  // perfil: meseta inferior · acuerdo · rampa [· giro · rampa] · acuerdo · meseta superior
  const p = r.pendiente, pm = r.pendMeseta, La = r.acuerdo, w = r.ancho; const giro = r.forma !== 'recta';
  const A = (r.angulo * Math.PI) / 180, nA = Math.max(2, Math.ceil(r.angulo / 15)), cuerda = 2 * r.radio * Math.sin(A / nA / 2);
  const Lg = r.forma === 'L' ? w : r.forma === 'curva' ? nA * cuerda : 0;
  const piezas = [
    { k: 'mesetaInf', n: 'Meseta inferior', L: r.mesetaInf, p: pm },
    { k: 'acuerdoInf', n: 'Acuerdo', L: La, p: p / 2 },
    { k: 'tramo1', n: 'Rampa', L: giro ? r.tramo1 : null, p },
    ...(giro ? [{ k: 'giro', n: r.forma === 'L' ? 'Rellano de giro' : 'Curva', L: Lg, p: Math.min(p, RAMPA.pendCurva), giro: true }, { k: 'tramo2', n: 'Rampa', L: null, p }] : []),
    { k: 'acuerdoSup', n: 'Acuerdo', L: La, p: p / 2 },
    { k: 'mesetaSup', n: 'Meseta superior', L: r.mesetaSup, p: pm },
  ];
  const fijo = piezas.filter((q) => q.L != null).reduce((a, q) => a + q.L * q.p, 0); const vari = piezas.find((q) => q.L == null);
  if (D - fijo >= 0) vari.L = (D - fijo) / p;
  else { vari.L = 0; const f = D / fijo; for (const q of piezas) q.p *= f; } // lo fijo ya baja de más: se suavizan todas las pendientes
  const vivas = piezas.filter((q) => q.L > 1e-6 || q.giro);
  // eje: de la puerta hacia fuera; cota de -D a 0
  let P = [...P0], d = [...DIR[r.lado]], z = -D, sA = 0; const sg = r.giro === 'izq' ? -1 : 1;
  const V = [{ x: P[0], y: P[1], z, s: 0, k: 0 }];
  const paso = (L, k, pz) => { if (L < 1e-6) return; P = [P[0] + d[0] * L, P[1] + d[1] * L]; z += L * pz; sA += L; V.push({ x: P[0], y: P[1], z, s: sA, k }); };
  vivas.forEach((q, k) => {
    q.z0 = z; q.s0 = sA;
    if (!q.giro) paso(q.L, k, q.p);
    else if (r.forma === 'L') { paso(w / 2, k, q.p); d = gira(d, (sg * Math.PI) / 2); paso(w / 2, k, q.p); }
    else { const a = (sg * A) / nA; for (let i = 0; i < nA; i++) { d = gira(d, a / 2); paso(cuerda, k, q.p); d = gira(d, a / 2); } }
    q.z1 = z; q.s1 = sA;
  });
  V[V.length - 1].z = 0; for (const v of V) { v.x = r3(v.x); v.y = r3(v.y); v.z = r3(v.z) || 0; v.s = r3(v.s); }
  // bordes izquierdo y derecho (subiendo) con inglete en los vértices
  const t = V.slice(1).map((v, i) => unit([v.x - V[i].x, v.y - V[i].y]));
  const izq = [], der = [];
  V.forEach((v, i) => {
    let nm, k = w / 2;
    if (i === 0) nm = nIzq(t[0]); else if (i === V.length - 1) nm = nIzq(t[t.length - 1]);
    else { const na = nIzq(t[i - 1]), nb = nIzq(t[i]); nm = unit([na[0] + nb[0], na[1] + nb[1]]); const c = nm[0] * na[0] + nm[1] * na[1]; k = w / 2 / Math.max(0.3, c); }
    izq.push([r3(v.x + nm[0] * k), r3(v.y + nm[1] * k)]); der.push([r3(v.x - nm[0] * k), r3(v.y - nm[1] * k)]);
  });
  const contorno = [...izq, ...der.slice().reverse()];
  const tramos = V.slice(1).map((v, i) => ({ a: V[i], b: v, i0: izq[i], i1: izq[i + 1], d0: der[i], d1: der[i + 1], k: v.k, p: vivas[v.k].p, L: r3(v.s - V[i].s) }));
  const xs = contorno.map((q) => q[0]), ys = contorno.map((q) => q[1]);
  const fin = V[V.length - 1];
  return {
    ...res, ok: true, pos, seg: { o: seg.o, x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2, len: seg.len, est: seg.int.id }, puerta,
    piezas: vivas.map((q) => ({ k: q.k, n: q.n, L: r3(q.L), p: r3(q.p), z0: r3(q.z0) || 0, z1: r3(q.z1) || 0, s0: r3(q.s0), s1: r3(q.s1) })),
    vertices: V, izq, der, contorno, tramos, longitud: r3(sA), superficie: r3(areaPoli(contorno)),
    arranque: { x: fin.x, y: fin.y, dir: d.map(r3) }, pendienteMax: r3(Math.max(...vivas.map((q) => q.p))),
    bbox: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
  };
}
// Cota de la rampa en un punto de planta (o null si no cae en ella): por el tramo que lo contiene.
export function cotaRampa(R, x, y) {
  if (!R?.ok) return null;
  for (const q of R.tramos) {
    if (!dentroPoligono([x, y], [q.i0, q.i1, q.d1, q.d0])) continue;
    const dx = q.b.x - q.a.x, dy = q.b.y - q.a.y, l2 = dx * dx + dy * dy || 1; const u = clamp(((x - q.a.x) * dx + (y - q.a.y) * dy) / l2, 0, 1);
    return q.a.z + (q.b.z - q.a.z) * u;
  }
  return null;
}
// Caja de planta que abarca la casa (b), el sótano, su rampa y sus patios ingleses (encuadre de alzados y secciones).
export function cajaSotano(m, b) {
  const s = m?.sotano; if (!s?.estancias?.length) return b; let { x0, y0, x1, y1 } = b; const R = geometriaRampa(m);
  for (const r of [...s.estancias.map((e) => ({ x0: e.x, y0: e.y, x1: e.x + e.w, y1: e.y + e.h })), ...(R?.ok ? [R.bbox] : []), ...patiosIngleses(m).map((p) => ({ x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h }))]) { x0 = Math.min(x0, r.x0); y0 = Math.min(y0, r.y0); x1 = Math.max(x1, r.x1); y1 = Math.max(y1, r.y1); }
  return { ...b, x0: r3(x0), y0: r3(y0), x1: r3(x1), y1: r3(y1), w: r3(x1 - x0), h: r3(y1 - y0) };
}
// Patios ingleses: una franja de su ancho por fuera de cada fachada del sótano en los lados elegidos.
export function patiosIngleses(m) {
  const s = m?.sotano; if (!s?.patio?.lados?.length || !s.estancias.length) return [];
  const a = s.patio.ancho, e = SOTANO.muro / 2; const out = [];
  for (const q of muros(s)) {
    if (q.clase !== 'fachada' || !s.patio.lados.includes(q.lado)) continue;
    const r = q.lado === 'N' ? { x: q.x1, y: q.y1 - e - a, w: q.len, h: a } : q.lado === 'S' ? { x: q.x1, y: q.y1 + e, w: q.len, h: a } : q.lado === 'O' ? { x: q.x1 - e - a, y: q.y1, w: a, h: q.len } : { x: q.x1 + e, y: q.y1, w: a, h: q.len };
    out.push({ lado: q.lado, est: q.int.id, ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, r3(v)])) });
  }
  return out;
}

// ---------- superficies, reglas y mediciones ----------
export function superficiesSotano(m) {
  if (!m?.sotano) return null; const P = superficies({ plantas: [m.sotano] }).plantas[0];
  return { id: SOTANO.id, nombre: SOTANO.nombre, cota: m.sotano.cota, estancias: P.estancias, util: P.util, construida: P.construida };
}
const transformadorSitio = (m, casa) => { const b = bbox(m); const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; const g = ((casa.giro || 0) * Math.PI) / 180, c = Math.cos(g), s = Math.sin(g); return (mx, my) => { const dx = mx - cx, dy = -(my - cy); return [casa.x + dx * c + dy * s, casa.y - dx * s + dy * c]; }; };
const muestras = (poly, paso = 0.5) => { const out = []; poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length]; const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / paso)); for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); }); return out; };

// Comprobaciones de la rampa: [{ nivel, regla: 'RAMPA', texto, ids?, planta: -1 }]. ctx (opcional): { parcela, casa }
// (parcela normalizada) para comprobar que cabe en la parcela y los retranqueos.
export function comprobarRampa(m, ctx = {}) {
  const R = geometriaRampa(m); if (!R) return []; const L = []; const r = R.r;
  const add = (nivel, texto, extra) => L.push({ nivel, regla: 'RAMPA', texto, planta: -1, ...(extra || {}) });
  if (!R.ok) { add('error', `La rampa no llega al sótano: no hay fachada del sótano hacia ${LADO_TXT[r.lado]}${r.pos != null ? ` en la posición ${fmt(r.pos)} m` : ''}. Cambia el lado o la posición de la rampa.`); return L; }
  const min = r.sentido === 'doble' ? RAMPA.anchoDoble : RAMPA.anchoUno;
  if (r.ancho < min - 1e-6) add('error', `Rampa de ${fmt(r.ancho)} m de ancho: ${r.sentido === 'doble' ? 'en doble sentido' : 'en un sentido'} necesita al menos ${fmt(min)} m.`);
  if (r.pendiente > RAMPA.pendRecta + 1e-6) add('error', `Pendiente del ${pct(r.pendiente)} en tramo recto: el máximo de ordenanza tipo es el ${pct(RAMPA.pendRecta)} (${pct(RAMPA.pendCurva)} en curva).`);
  if (r.pendMeseta > RAMPA.pendMeseta + 1e-6) add('error', `Las mesetas tienen un ${pct(r.pendMeseta)} de pendiente: como máximo el ${pct(RAMPA.pendMeseta)}.`);
  for (const [k, n] of [['mesetaSup', 'superior (junto a la calle)'], ['mesetaInf', 'inferior (delante de la puerta)']]) if (r[k] < RAMPA.meseta - 1e-6) add('aviso', `Meseta ${n} de ${fmt(r[k])} m: la ordenanza tipo pide ${fmt(RAMPA.meseta)} m al ${pct(RAMPA.pendMeseta)} como máximo.`);
  if (r.pendiente > RAMPA.pendCurva + 1e-6 && r.acuerdo < 1.5 - 1e-6) add('aviso', `Tramos de acuerdo de ${fmt(r.acuerdo)} m con un ${pct(r.pendiente)}: los coches pueden rozar en los cambios de rasante. Usa acuerdos de 1,50–3,00 m a media pendiente.`);
  if (r.forma === 'curva') {
    if (r.radio - r.ancho / 2 < 1) add('error', `La curva (radio ${fmt(r.radio)} m en el eje) es más cerrada que el ancho de la rampa: aumenta el radio.`);
    else if (r.radio < RAMPA.radioEje - 1e-6) add('aviso', `Radio de la curva de ${fmt(r.radio)} m en el eje (${fmt(r.radio - r.ancho / 2)} m en el borde interior): conviene al menos ${fmt(RAMPA.radioEje)} m en el eje.`);
  }
  if (r.forma !== 'recta' && r.pendiente > RAMPA.pendCurva + 1e-6) add('info', `En el ${r.forma === 'L' ? 'rellano de giro' : 'tramo curvo'} la pendiente baja al ${pct(RAMPA.pendCurva)} (máximo en curva).`);
  const gal = Math.min(r.puertaAlto, m.sotano.libre);
  if (gal < RAMPA.galibo - 1e-6) add('error', `Gálibo de ${fmt(gal)} m en la puerta del garaje: el mínimo es ${fmt(RAMPA.galibo)} m.`);
  if (R.puerta.ancho < 2.4 - 1e-6) add('aviso', `La puerta del garaje queda en ${fmt(R.puerta.ancho)} m: la fachada del sótano en ese punto es corta. Mueve la rampa o alarga la fachada.`);
  const est = m.sotano.estancias.find((e) => e.id === R.puerta.est); if (est && est.tipo !== 'garaje') add('aviso', `La rampa llega a «${est.nombre || TIPOS[est.tipo].n}», que no es un garaje.`, { ids: [est.id] });
  // no pisa la casa ni se mete en el sótano (centros de celda dentro del contorno)
  const pisa = (planta) => { const out = new Map(); for (const [k, e] of celdasPlanta(planta).m) { const [i, j] = k.split(',').map(Number); if (dentroPoligono([(i + 0.5) * T, (j + 0.5) * T], R.contorno)) out.set(e.id, e); } return [...out.values()]; };
  const casa = pisa(m.plantas[0]);
  if (casa.length) add('error', `La rampa pisa la casa: ${casa.map((e) => '«' + (e.nombre || TIPOS[e.tipo].n) + '»').join(', ')}. Cambia el lado, la posición o la forma de la rampa.`, { ids: casa.map((e) => e.id), planta: 0 });
  const dentro = pisa(m.sotano);
  if (dentro.length) add('error', `La rampa se mete dentro del sótano (${dentro.map((e) => '«' + (e.nombre || TIPOS[e.tipo].n) + '»').join(', ')}): con giro ${r.giro === 'izq' ? 'a la izquierda' : 'a la derecha'} vuelve contra el edificio. Gira hacia el otro lado o alarga el primer tramo.`, { ids: dentro.map((e) => e.id) });
  // parcela: que quepa y que no invada los retranqueos (si los hay)
  const par = ctx?.parcela; const poly = par?.poligono;
  if (Array.isArray(poly) && poly.length >= 3 && ctx.casa) {
    const tr = transformadorSitio(m, ctx.casa); const pts = muestras(R.contorno).map(([x, y]) => tr(x, y));
    const enBorde = (q) => poly.some((a, i) => distSeg(q, a, poly[(i + 1) % poly.length]) <= 0.01);
    const fuera = pts.filter((q) => !dentroPoligono(q, poly) && !enBorde(q));
    if (fuera.length) {
      const exc = Math.max(...fuera.map((q) => Math.min(...poly.map((a, i) => distSeg(q, a, poly[(i + 1) % poly.length])))));
      add('error', `La rampa no cabe en la parcela: se sale ${fmt(exc)} m por fuera del lindero. Necesita ${fmt(R.longitud, 1)} m de desarrollo para bajar ${fmt(R.D)} m (rampa al ${pct(r.pendiente)}, mesetas de ${fmt(r.mesetaInf)} y ${fmt(r.mesetaSup)} m). Prueba en L o en curva, arráncala por otro lado o separa la casa de ese lindero.`);
    } else if (par.retranqueos) {
      const med = new Set(par.medianeras || []); let peor = null;
      poly.forEach((a, i) => { if (med.has(i)) return; const req = i === (par.frente || 0) ? +par.retranqueos.frente || 0 : +par.retranqueos.resto || 0; if (!(req > 0)) return; const d = Math.min(...pts.map((q) => distSeg(q, a, poly[(i + 1) % poly.length]))); if (d < req - 0.01 && (!peor || req - d > peor.req - peor.d)) peor = { i, d, req }; });
      if (peor) add('aviso', `La rampa invade el retranqueo ${peor.i === (par.frente || 0) ? 'de fachada' : 'a lindero'} (a ${fmt(peor.d)} m; mínimo ${fmt(peor.req)} m). Muchas ordenanzas admiten la rampa en el retranqueo: compruébalo en la del municipio.`);
    }
  }
  return L;
}

// Reglas del sótano (las llama validar()): solapes, trama, mínimos, acceso, escalera bajo la de planta baja, luz
// (patio inglés), garaje y rampa. add(nivel, regla, texto, extra) como en validar().
export function reglasSotano(m, ctx, add) {
  const s = m?.sotano; if (!s) return;
  const pi = -1; const nom = (id) => { const e = s.estancias.find((q) => q.id === id); return e ? e.nombre || TIPOS[e.tipo].n : id; };
  const garajes = s.estancias.filter((e) => e.tipo === 'garaje');
  add('info', 'SOTANO', `Planta sótano a cota ${fmt(s.cota)} m (altura libre ${fmt(s.libre)} m): muros de contención y losa de hormigón armado impermeabilizados, no módulos en seco CUEVA. Estructura a calcular con estudio geotécnico.${garajes.length ? ' Garaje: ventilación natural o forzada y vestíbulo o puerta resistente al fuego hacia la vivienda (CTE DB-SI y DB-HS 3).' : ''}`, { planta: pi });
  if (!s.estancias.length) { add('aviso', 'SOTANO', 'La planta sótano está vacía: añade estancias (garaje, bodega, trastero…) o quítala.', { planta: pi }); return; }
  const g = derivarSotano(m);
  for (const [a, b] of celdasPlanta(s).solapes) add('error', 'SOLAPE', `Planta sótano: «${nom(a)}» y «${nom(b)}» se pisan.`, { ids: [a, b], planta: pi });
  for (const e of s.estancias) {
    const t = TIPOS[e.tipo]; const n = e.nombre || t.n;
    if (![e.x, e.y, e.w, e.h].every((v) => onGrid(v))) add('error', 'TRAMA', `«${n}» (sótano) está fuera de la trama de 37,5 cm.`, { ids: [e.id], planta: pi });
    else if (![e.x, e.y, e.w, e.h].every((v) => onGrid(v, TE))) add('info', 'TRAMA', `«${n}» (sótano) usa medidas de 37,5 cm fuera de la trama de 0,75 m.`, { ids: [e.id], planta: pi });
    const a = e.w * e.h, lado = Math.min(e.w, e.h);
    if (a < t.minA - 1e-6) add('aviso', 'MINIMOS', `«${n}» (sótano) tiene ${fmt(a)} m²; el mínimo recomendado es ${fmt(t.minA)} m².`, { ids: [e.id], planta: pi });
    else if (lado < t.minL - 1e-6) add('aviso', 'MINIMOS', `«${n}» (sótano) tiene un lado de ${fmt(lado)} m; conviene al menos ${fmt(t.minL)} m.`, { ids: [e.id], planta: pi });
    // luz: bodega, garaje, trastero, instalaciones… no la piden; las piezas vivideras, solo con patio inglés
    const luz = g.huecos.some((h) => h.est === e.id && !['puerta', 'porton'].includes(h.tipo));
    if (esDorm(e.tipo)) add(luz ? 'info' : 'aviso', 'LUZ', luz ? `«${n}» es un dormitorio en sótano con patio inglés: comprueba que la ordenanza admite piezas habitables bajo rasante.` : `«${n}» es un dormitorio en sótano sin luz ni ventilación natural: solo es admisible con patio inglés (actívalo en su fachada).`, { ids: [e.id], planta: pi });
    else if (HABITABLES.includes(e.tipo) && !luz) add('aviso', 'LUZ', `«${n}» está bajo rasante sin patio inglés: no tiene luz ni ventilación natural.`, { ids: [e.id], planta: pi });
    else if (e.tipo === 'gimnasio' && !luz) add('info', 'LUZ', `«${n}» (sótano) sin patio inglés: necesita ventilación mecánica.`, { ids: [e.id], planta: pi });
  }
  for (const id of g.sinAcceso) add('error', 'ACCESO', `Planta sótano: no se puede llegar a «${nom(id)}».`, { ids: [id], planta: pi });
  // escalera: en el mismo hueco que la de planta baja
  const mismo = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
  const escS = s.estancias.filter((e) => e.tipo === 'escalera'), escB = m.plantas[0].estancias.filter((e) => e.tipo === 'escalera');
  if (!escS.length) add(s.rampa ? 'aviso' : 'error', s.rampa ? 'ESCALERA' : 'ACCESO', s.rampa ? 'El sótano no tiene escalera a la planta baja: solo se entra por la rampa.' : 'El sótano no tiene escalera ni rampa: no se puede llegar a él.', { planta: pi });
  else if (!escS.some((a) => escB.some((b) => mismo(a, b)))) add('error', 'ESCALERA', escB.length ? 'La escalera del sótano no coincide con la de planta baja: deben ocupar el mismo hueco.' : 'Falta la escalera de planta baja que baja al sótano (en el mismo hueco).', { planta: pi, ids: escS.map((e) => e.id) });
  // garaje y rampa
  if (garajes.length && !s.rampa) add('aviso', 'RAMPA', `${garajes.map((e) => '«' + (e.nombre || 'Garaje') + '»').join(', ')} en sótano sin rampa de acceso: configúrala.`, { ids: garajes.map((e) => e.id), planta: pi });
  for (const x of comprobarRampa(m, ctx || {})) add(x.nivel, x.regla, x.texto, { planta: x.planta ?? pi, ...(x.ids ? { ids: x.ids } : {}) });
  // patio inglés bajo la casa
  const pb = celdasPlanta(m.plantas[0]).m;
  for (const p of patiosIngleses(m)) {
    let bajo = false; for (let x = p.x + T / 2; x < p.x + p.w && !bajo; x += T) for (let y = p.y + T / 2; y < p.y + p.h && !bajo; y += T) { const e = pb.get(Math.floor(x / T) + ',' + Math.floor(y / T)); if (e && !TIPOS[e.tipo].vacio) bajo = true; }
    if (bajo) add('aviso', 'SOTANO', `El patio inglés del lado ${LADO_TXT[p.lado]} queda bajo la planta baja: la fachada del sótano debe estar fuera de la huella de la casa para abrirle un patio.`, { ids: [p.est], planta: pi });
  }
}

// Mediciones del sótano (null sin sótano). Los precios y capítulos están en core/presupuesto.mjs: este módulo se
// copia a la web de cliente y NO lleva precios.
export function medicionSotano(m) {
  const s = m?.sotano; if (!s) return null;
  const cel = celdasPlanta(s).m; const area = r3(cel.size * T * T); const segs = muros(s);
  const per = r3(segs.filter((q) => q.clase === 'fachada').reduce((a, q) => a + q.len, 0)); const tab = segs.filter((q) => q.clase === 'tabique').reduce((a, q) => a + q.len, 0);
  const h = s.altura; const muros_m2 = r3(per * (h + SOTANO.losa));
  const pb = celdasPlanta(m.plantas[0]).m; let fuera = 0; for (const k of cel.keys()) { const e = pb.get(k); if (!e || TIPOS[e.tipo].vacio || e.tipo === 'piscina') fuera++; }
  const so = SOTANO.sobreexc; const excS = (area + per * so + 4 * so * so) * (h + SOTANO.losa + 0.1);
  const R = geometriaRampa(m); let rampa = null, excR = 0;
  if (R?.ok) {
    let mur = 0; for (const q of R.tramos) { const prof = -(q.a.z + q.b.z) / 2; excR += q.L * (R.ancho + 0.6) * (prof + 0.35); mur += 2 * q.L * (prof + 0.35 + 0.15); }
    rampa = { superficie: R.superficie, longitud: R.longitud, muros: r3(mur), ancho: R.ancho, desnivel: R.D };
  }
  const PI = patiosIngleses(m); const patioMl = r3(PI.reduce((a, p) => a + Math.max(p.w, p.h), 0)); const excP = PI.reduce((a, p) => a + Math.max(p.w, p.h) * (Math.min(p.w, p.h) + 0.4) * (h + 0.3), 0);
  const g = derivarSotano(m); const sup = superficiesSotano(m);
  return {
    area, perimetro: per, muros: muros_m2, excavacion: r3(excS + excR + excP), impermeabilizacion: r3(muros_m2 + area), drenaje: per, losa: area, techo: r3(fuera * T * T),
    tabiques: r3(tab * s.libre), puertas: g.puertas.length, util: sup.util, construida: sup.construida, portones: R?.ok ? 1 : 0, escalera: s.estancias.some((e) => e.tipo === 'escalera') ? 1 : 0,
    huecos: r3(g.huecos.filter((x) => x.tipo !== 'porton').reduce((a, x) => a + x.ancho * x.alto, 0)), rampa, patio: PI.length ? { ml: patioMl, muros: r3(patioMl * (h + 0.3)) } : null,
  };
}
// ---------- transformaciones (espejo, giro, recolocar, estirar): las llama core/modelo.mjs ----------
const SW = { x: { E: 'O', O: 'E' }, y: { N: 'S', S: 'N' } };
export function espejoSotano(m, eje, b) {
  const s = m?.sotano; if (!s) return; const sw = SW[eje] || SW.x; const S0 = eje === 'x' ? b.x0 + b.x1 : b.y0 + b.y1;
  for (const e of s.estancias) {
    if (eje === 'x') e.x = r3(S0 - e.x - e.w); else e.y = r3(S0 - e.y - e.h);
    if (e.huecos) { const n = {}; for (const k in e.huecos) n[sw[k] || k] = e.huecos[k]; e.huecos = n; }
  }
  for (const a of s.apoyos || []) { if (eje === 'x') a.x = r3(S0 - a.x); else a.y = r3(S0 - a.y); }
  const r = s.rampa; if (r) { const hor = r.lado === 'N' || r.lado === 'S'; if (r.pos != null && (eje === 'x') === hor) r.pos = r3(S0 - r.pos); r.lado = sw[r.lado] || r.lado; r.giro = r.giro === 'izq' ? 'der' : 'izq'; }
  if (s.patio) s.patio.lados = s.patio.lados.map((l) => sw[l] || l);
}
export function rotarSotano(m, b) { // 90° en sentido horario, como rotar()
  const s = m?.sotano; if (!s) return; const g = { N: 'E', E: 'S', S: 'O', O: 'N' };
  for (const e of s.estancias) {
    const nx = b.y1 - (e.y + e.h), ny = e.x - b.x0; [e.x, e.y, e.w, e.h] = [r3(nx), r3(ny), e.h, e.w];
    if (e.huecos) { const n = {}; for (const k in e.huecos) n[g[k]] = e.huecos[k]; e.huecos = n; }
    if (Array.isArray(e.mobiliario)) for (const it of e.mobiliario) { const ndx = r3(e.w - it.dy - it.h), ndy = it.dx; [it.dx, it.dy, it.w, it.h] = [ndx, ndy, it.h, it.w]; it.giro = ((it.giro || 0) + 90) % 360; }
    const ex = e.espejoX, ey = e.espejoY; e.espejoX = ey; e.espejoY = ex; if (e.sube) e.sube = g[e.sube];
  }
  for (const a of s.apoyos || []) { const nx = b.y1 - a.y, ny = a.x - b.x0; a.x = r3(nx); a.y = r3(ny); }
  const r = s.rampa; if (r) { const hor = r.lado === 'N' || r.lado === 'S'; if (r.pos != null) r.pos = r3(hor ? r.pos - b.x0 : b.y1 - r.pos); r.lado = g[r.lado]; }
  if (s.patio) s.patio.lados = s.patio.lados.map((l) => g[l]);
}
export function recolocarSotano(m, b) {
  const s = m?.sotano; if (!s) return;
  for (const e of s.estancias) { e.x = r3(e.x - b.x0); e.y = r3(e.y - b.y0); }
  for (const a of s.apoyos || []) { a.x = r3(a.x - b.x0); a.y = r3(a.y - b.y0); }
  const r = s.rampa; if (r && r.pos != null) r.pos = r3(r.pos - (r.lado === 'N' || r.lado === 'S' ? b.x0 : b.y0));
}
export function estirarSotano(m, eje, pos, delta) {
  const s = m?.sotano; if (!s || !delta) return; const [c, d] = eje === 'x' ? ['x', 'w'] : ['y', 'h'];
  for (const e of s.estancias) {
    if (e[c] >= pos - 1e-6) e[c] = r3(e[c] + delta);
    else if (e[c] + e[d] > pos + 1e-6) e[d] = Math.max(T, r3(e[d] + delta));
    else if (delta < 0 && Math.abs(e[c] + e[d] - pos) < 1e-6) e[d] = Math.max(T, r3(e[d] + delta));
  }
  for (const a of s.apoyos || []) if (a[c] >= pos - 1e-6) a[c] = r3(a[c] + delta);
  const r = s.rampa; if (r && r.pos != null && (eje === 'x') === (r.lado === 'N' || r.lado === 'S') && r.pos >= pos - 1e-6) r.pos = r3(r.pos + delta);
}

// ---------- resumen (MCP / API) ----------
export function resumenSotano(m) {
  const s = m?.sotano; if (!s) return null; const R = geometriaRampa(m); const S = superficiesSotano(m);
  return {
    id: s.id, nombre: s.nombre, cota: s.cota, libre: s.libre, altura: s.altura, util: S.util, construida: S.construida,
    estancias: s.estancias.map((e) => ({ id: e.id, tipo: e.tipo, nombre: e.nombre, x: e.x, y: e.y, w: e.w, h: e.h })), patio: s.patio || null,
    rampa: s.rampa ? { ...s.rampa, calculo: R?.ok ? { desnivel: R.D, longitud: R.longitud, superficie: R.superficie, eje: R.pos, puerta: { x: R.puerta.x, y: R.puerta.y, ancho: R.puerta.ancho, alto: R.puerta.alto, estancia: R.puerta.est }, arranque: R.arranque, tramos: R.piezas.map((q) => ({ tramo: q.n, largo: q.L, pendiente: q.p, desde: q.z0, hasta: q.z1 })) } : { error: R?.error || 'sin calcular' } } : null,
    nota: 'Cotas respecto a la planta baja (±0,00 ≈ terreno). Rampa: pendiente ≤ 16 % recta / 12 % curva, mesetas de 4,50 m al 5 % máx., ancho ≥ 3,00 (un sentido) / 5,00 m (doble), gálibo ≥ 2,20 m (ordenanza tipo: confirmar en el municipio).',
  };
}
