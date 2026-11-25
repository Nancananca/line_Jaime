// Cerramientos de parcela (v.1): catálogo de tipos y puertas, valores por defecto, normalización, tramos por
// lindero, medición, descripción para los renders y grafismo 2D. Módulo puro (navegador y servidor).
// Marco del sitio: x → este, y → norte (m). Lado i = lindero de poligono[i] a poligono[i + 1].
// Puerta: t = metros desde poligono[lado] hasta el CENTRO del hueco, medidos a lo largo del lindero.
// Este archivo se copia a la web de cliente: NO lleva precios (están en core/presupuesto.mjs, PRECIOS.cerramiento_ml).
import { r3, clamp, fmt, uid } from './trama.mjs';
import { bbox, derivar } from './geometria.mjs';

const METAL = { grafito: { n: 'Grafito', color: '#3b3d3e', en: 'graphite' }, blanco: { n: 'Blanco', color: '#eeede8', en: 'white' }, corten: { n: 'Corten', color: '#8a4b2c', en: 'weathered corten-steel' } };
// puerta: estilo de las hojas de las puertas de ese lindero · obra: machones de fábrica a los lados de las puertas
export const CERRAMIENTOS = {
  murete_valla: { n: 'Murete con valla metálica', corto: 'Murete + valla', alto: 1.8, min: 1.2, max: 2.4, e: 0.2, murete: 0.6, poste: 2.5, acabado: 'grafito', acabados: METAL, puerta: 'barrotes', obra: true,
    en: (a) => `a low white rendered wall about 0.6 m high topped with slender vertical ${a.en || 'graphite'} steel railings` },
  murete_lamas: { n: 'Murete con lamas metálicas', corto: 'Murete + lamas', alto: 1.8, min: 1.2, max: 2.4, e: 0.2, murete: 0.5, poste: 2, acabado: 'grafito', acabados: { grafito: METAL.grafito, blanco: METAL.blanco, madera: { n: 'Imitación madera', color: '#9c7148', en: 'wood-effect' } }, puerta: 'lamas', obra: true,
    en: (a) => `a low white rendered wall topped with horizontal ${a.en || 'graphite'} aluminium louvres` },
  bloque: { n: 'Muro de bloque', corto: 'Bloque', alto: 2, min: 1, max: 3, e: 0.2, poste: 3.5, acabado: 'enfoscado', acabados: { enfoscado: { n: 'Enfoscado y pintado', color: '#ebe7de', en: 'rendered and white-painted concrete block' }, visto: { n: 'Bloque visto', color: '#b3afa6', en: 'exposed grey concrete block' } }, puerta: 'chapa', obra: true,
    en: (a) => `${a.en || 'rendered concrete block'} walls with a simple coping` },
  prefabricado: { n: 'Panel prefabricado CUEVA', corto: 'Panel CUEVA', alto: 2, min: 1, max: 3, e: 0.12, modulo: 1.5, acabado: 'blanco_12', acabados: {
      blanco_12: { n: 'Blanco · 12 cm', color: '#eeece6', e: 0.12, en: 'smooth white' }, gris_12: { n: 'Gris · 12 cm', color: '#a9a8a3', e: 0.12, en: 'smooth mid-grey' },
      blanco_8: { n: 'Blanco · 8 cm', color: '#eeece6', e: 0.08, en: 'slim smooth white' }, gris_8: { n: 'Gris · 8 cm', color: '#a9a8a3', e: 0.08, en: 'slim smooth mid-grey' } }, puerta: 'chapa', obra: true,
    en: (a) => `${a.en || 'smooth white'} CUEVA precast concrete panels, 1.5 m wide vertical modules with fine joints, no posts` },
  malla: { n: 'Malla de simple torsión', corto: 'Malla', alto: 1.5, min: 1, max: 2.5, e: 0.05, poste: 2.5, acabado: 'verde', acabados: { verde: { n: 'Plastificada verde', color: '#3d6a3c', en: 'green plastic-coated' }, galvanizada: { n: 'Galvanizada', color: '#a8aca9', en: 'galvanised' } }, puerta: 'malla', obra: false,
    en: (a) => `${a.en || 'green'} chain-link mesh fencing on slim round posts` },
  lamas_madera: { n: 'Valla de lamas de madera', corto: 'Lamas de madera', alto: 1.8, min: 1, max: 2.2, e: 0.1, poste: 2, acabado: 'natural', acabados: { natural: { n: 'Pino tratado', color: '#b88c5d', en: 'natural pine' }, gris: { n: 'Envejecida', color: '#9a948a', en: 'silver-weathered' }, oscura: { n: 'Tostada', color: '#6a4a33', en: 'dark-stained' } }, puerta: 'lamas', obra: false,
    en: (a) => `a fence of horizontal ${a.en || 'natural'} timber slats on timber posts` },
  lamas_reciclado: { n: 'Valla de lamas de plástico reciclado', corto: 'Lamas recicladas', alto: 1.8, min: 1, max: 2.2, e: 0.1, poste: 2, acabado: 'grafito', acabados: { grafito: { n: 'Grafito', color: '#3f4142', en: 'graphite' }, gris: { n: 'Gris piedra', color: '#8f8d88', en: 'stone-grey' }, arena: { n: 'Arena', color: '#c9b79a', en: 'sand-coloured' }, tierra: { n: 'Tierra', color: '#6b5443', en: 'earth-brown' } }, puerta: 'lamas', obra: false,
    en: (a) => `a fence of horizontal ${a.en || 'graphite'} recycled-plastic slats on matching posts` },
  panel_reciclado: { n: 'Panel prefabricado de plástico reciclado', corto: 'Panel reciclado', alto: 2, min: 1, max: 2.4, e: 0.06, modulo: 2, acabado: 'grafito', acabados: { grafito: { n: 'Grafito', color: '#3f4142', en: 'graphite' }, gris: { n: 'Gris piedra', color: '#8f8d88', en: 'stone-grey' }, arena: { n: 'Arena', color: '#c9b79a', en: 'sand-coloured' }, verde: { n: 'Verde oliva', color: '#5d6a4c', en: 'olive-green' } }, puerta: 'chapa', obra: false,
    en: (a) => `${a.en || 'graphite'} solid recycled-plastic fence panels, 2 m wide modules between slim aluminium posts` },
  seto: { n: 'Seto vegetal', corto: 'Seto', alto: 1.6, min: 0.8, max: 3, e: 0.7, acabado: 'aligustre', acabados: { aligustre: { n: 'Aligustre', color: '#4e6b36', en: 'privet' }, cipres: { n: 'Ciprés', color: '#2f4a2c', en: 'cypress' }, laurel: { n: 'Laurel', color: '#5a7440', en: 'bay laurel' } }, puerta: 'malla', obra: false,
    en: (a) => `a dense clipped ${a.en || 'evergreen'} hedge` },
  gavion: { n: 'Gavión de piedra', corto: 'Gavión', alto: 1, min: 0.5, max: 2, e: 0.5, poste: 1, acabado: 'caliza', acabados: { caliza: { n: 'Caliza', color: '#d3c5a5', en: 'pale limestone' }, granito: { n: 'Granito', color: '#9d9b95', en: 'grey granite' } }, puerta: 'chapa', obra: true,
    en: (a) => `${a.en || 'stone'} gabion walls (stone-filled steel wire baskets)` },
  ninguno: { n: 'Sin cerramiento', corto: 'Sin cerramiento', alto: 0, min: 0, max: 0, e: 0, acabado: '', acabados: {}, puerta: 'chapa', obra: false, en: () => 'no fence' },
};
export const PUERTAS_PARCELA = {
  vehiculos: { n: 'Puerta de vehículos', corto: 'Vehículos', ancho: 4, min: 3, max: 6, modelo: 'corredera', modelos: { corredera: { n: 'Corredera', en: 'sliding' }, batiente: { n: 'Batiente de dos hojas', en: 'double-leaf swing' }, basculante: { n: 'Basculante', en: 'up-and-over' } } },
  peaton: { n: 'Puerta peatonal', corto: 'Peatonal', ancho: 1, min: 0.9, max: 1.2, modelo: 'batiente', modelos: { batiente: { n: 'Batiente', en: 'hinged' } } },
};
const BASE = { tipo: 'malla', alto: 1.5, acabado: 'verde' };
const POR_DEFECTO = { frente: { tipo: 'murete_valla', alto: 1.8, acabado: 'grafito' }, medianera: { tipo: 'bloque', alto: 2, acabado: 'enfoscado' }, resto: BASE };

// ---------- geometría de los linderos ----------
const areaS = (P) => P.reduce((a, q, i) => { const n = P[(i + 1) % P.length]; return a + q[0] * n[1] - n[0] * q[1]; }, 0) / 2;
// Lindero i: extremos, largo, dirección u (de a a b) y normal n hacia dentro de la parcela.
export function geometriaLado(parcela, i) {
  const P = parcela.poligono, k = P.length; const a = P[i], b = P[(i + 1) % k]; const dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1e-9;
  const u = [dx / L, dy / L]; const s = areaS(P) >= 0 ? 1 : -1;
  return { i, a, b, L, u, n: [-u[1] * s, u[0] * s], frente: i === (parcela.frente || 0), medianera: (parcela.medianeras || []).includes(i) };
}
export const enLado = (G, t, o = 0) => [G.a[0] + G.u[0] * t + G.n[0] * o, G.a[1] + G.u[1] * t + G.n[1] * o];
export const proyectarEnLado = (G, p) => (p[0] - G.a[0]) * G.u[0] + (p[1] - G.a[1]) * G.u[1];
// Misma transformación que parcela.transformador (se repite aquí para no importar parcela.mjs, que importa este módulo).
function aSitio(modelo, casa) {
  const b = bbox(modelo); const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; const g = ((casa.giro || 0) * Math.PI) / 180, c = Math.cos(g), s = Math.sin(g);
  return (mx, my) => { const dx = mx - cx, dy = -(my - cy); return [casa.x + dx * c + dy * s, casa.y - dx * s + dy * c]; };
}
// Puerta de entrada y portón del garaje (o el centro del garaje) en coordenadas del sitio.
export function puntosAcceso(modelo, casa) {
  const out = { entrada: null, porton: null }; if (!modelo?.plantas?.length || !casa) return out;
  let g; try { g = derivar(modelo, 0); } catch { return out; }
  const tr = aSitio(modelo, casa); const fuera = { N: [0, -1], S: [0, 1], E: [1, 0], O: [-1, 0] };
  const pt = (h) => { const p = tr(h.x, h.y); const d = fuera[h.lado] || [0, 0]; const q = tr(h.x + d[0], h.y + d[1]); return { p, fuera: [q[0] - p[0], q[1] - p[1]], ancho: h.ancho }; };
  const en = g.huecos.find((h) => h.entrada) || g.huecos.find((h) => h.tipo === 'puerta'); if (en) out.entrada = pt(en);
  const po = g.huecos.find((h) => h.tipo === 'porton'); const gar = modelo.plantas[0].estancias.find((e) => e.tipo === 'garaje');
  if (po) out.porton = pt(po); else if (gar) out.porton = { p: tr(gar.x + gar.w / 2, gar.y + gar.h / 2), fuera: null, ancho: Math.min(gar.w, gar.h) };
  return out;
}

// ---------- valores por defecto y normalización ----------
// Puertas propuestas en el frente: peatonal frente a la puerta de entrada y de vehículos frente al garaje
// (o en el extremo con más sitio). Nunca se solapan: entre ambas queda un machón.
export function puertasPorDefecto(parcela, modelo, casa) {
  const n = parcela.poligono.length; const f = Math.min(Math.max(0, parcela.frente || 0), n - 1); const G = geometriaLado(parcela, f); const out = [];
  if (G.L < 1.8) return out;
  const acc = puntosAcceso(modelo, casa); const wp = PUERTAS_PARCELA.peaton.ancho; const m = 0.35;
  const lim = (t, w) => clamp(t, w / 2 + m, Math.max(w / 2 + m, G.L - w / 2 - m));
  let tp = acc.entrada ? proyectarEnLado(G, acc.entrada.p) : G.L / 2; tp = lim(tp, wp);
  const wv = Math.min(PUERTAS_PARCELA.vehiculos.ancho, Math.floor((G.L - wp - 1.8) * 4) / 4); let conPeaton = true;
  if (wv >= PUERTAS_PARCELA.vehiculos.min) {
    let tv = acc.porton ? proyectarEnLado(G, acc.porton.p) : tp > G.L / 2 ? wv / 2 + 0.6 : G.L - wv / 2 - 0.6; tv = lim(tv, wv);
    const sep = (wv + wp) / 2 + 0.5; // machón de 50 cm entre las dos puertas
    if (Math.abs(tp - tv) < sep) {
      const a = tv - sep, b = tv + sep; const okA = a >= wp / 2 + m, okB = b <= G.L - wp / 2 - m;
      if (okA && (!okB || Math.abs(a - tp) <= Math.abs(b - tp))) tp = a; else if (okB) tp = b; else conPeaton = false;
    }
    out.push({ id: 'pv1', lado: f, t: r3(tv), clase: 'vehiculos', modelo: 'corredera', ancho: r3(wv) });
  }
  if (conPeaton) out.push({ id: 'pp1', lado: f, t: r3(tp), clase: 'peaton', modelo: 'batiente', ancho: wp });
  return out;
}
export function cerramientosPorDefecto(parcela, modelo, casa) {
  const n = parcela.poligono.length; const f = Math.min(Math.max(0, parcela.frente || 0), n - 1); const lados = {};
  for (const i of parcela.medianeras || []) if (i !== f && i >= 0 && i < n) lados[i] = { ...POR_DEFECTO.medianera };
  lados[f] = { ...POR_DEFECTO.frente };
  return { porDefecto: { ...POR_DEFECTO.resto }, lados, puertas: puertasPorDefecto(parcela, modelo, casa) };
}
const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
function normLado(x, base) {
  x = x || {}; const tipo = CERRAMIENTOS[x.tipo] ? x.tipo : base.tipo; const T = CERRAMIENTOS[tipo];
  const a0 = num(x.alto) ?? (tipo === base.tipo ? base.alto : T.alto);
  const viejo = tipo === 'prefabricado' ? { gris: 'gris_12', blanco: 'blanco_12', piedra: 'gris_12' }[x.acabado] : null; // acabados de la v.1.2
  const acabado = T.acabados[x.acabado] ? x.acabado : viejo || (tipo === base.tipo && T.acabados[base.acabado] ? base.acabado : T.acabado);
  return { tipo, alto: tipo === 'ninguno' ? 0 : r3(clamp(a0, T.min, T.max)), acabado };
}
export function normalizarPuerta(d, parcela) {
  const n = parcela.poligono.length; const lado = Math.round(num(d?.lado) ?? -1); if (lado < 0 || lado >= n) return null;
  const clase = PUERTAS_PARCELA[d.clase] ? d.clase : 'peaton'; const C = PUERTAS_PARCELA[clase]; const G = geometriaLado(parcela, lado);
  const ancho = r3(clamp(num(d.ancho) ?? C.ancho, C.min, C.max)); if (G.L < ancho + 0.1) return null;
  const t = r3(clamp(num(d.t) ?? G.L / 2, ancho / 2, G.L - ancho / 2));
  const o = { id: String(d.id || uid('pq')).slice(0, 24), lado, t, clase, modelo: C.modelos[d.modelo] ? d.modelo : C.modelo, ancho };
  if (o.modelo === 'corredera' && (d.sentido === 1 || d.sentido === -1)) o.sentido = d.sentido;
  if (clase === 'peaton' && (d.bisagra === 'ini' || d.bisagra === 'fin')) o.bisagra = d.bisagra;
  return o;
}
export function normalizarCerramientos(c, parcela) {
  c = c && typeof c === 'object' ? c : {}; const n = parcela.poligono.length;
  const porDefecto = normLado(c.porDefecto, BASE); const lados = {};
  for (const [k, v] of Object.entries(c.lados || {})) { const i = Number(k); if (Number.isInteger(i) && i >= 0 && i < n && v) lados[i] = normLado(v, porDefecto); }
  const vistos = new Set(); const puertas = [];
  for (const d of Array.isArray(c.puertas) ? c.puertas : []) { const p = normalizarPuerta(d, parcela); if (!p) continue; while (vistos.has(p.id)) p.id = uid('pq'); vistos.add(p.id); puertas.push(p); }
  return { porDefecto, lados, puertas };
}
// Configuración efectiva: la guardada en parcela.cerramientos o, si no hay, la propuesta automática (auto: true).
export function resolverCerramientos(parcela, modelo, casa) {
  if (!parcela?.poligono || parcela.poligono.length < 3) return null;
  const auto = !parcela.cerramientos; const c = normalizarCerramientos(auto ? cerramientosPorDefecto(parcela, modelo, casa) : parcela.cerramientos, parcela);
  c.auto = auto; return c;
}
export const ladoCerramiento = (cfg, i) => cfg.lados[i] || cfg.porDefecto;
// Al invertir el sentido del polígono (normalizarParcela), el lado i pasa a ser n − 2 − i y t se mide desde el otro extremo.
export function invertirCerramientos(c, poligonoAntes) {
  if (!c || typeof c !== 'object') return c; const n = poligonoAntes.length; const j = (i) => (((n - 2 - i) % n) + n) % n;
  const L = (i) => { const a = poligonoAntes[i], b = poligonoAntes[(i + 1) % n]; return Math.hypot(b[0] - a[0], b[1] - a[1]); };
  const lados = {}; for (const [k, v] of Object.entries(c.lados || {})) lados[j(Number(k))] = v;
  const puertas = (c.puertas || []).map((p) => ({ ...p, lado: j(p.lado), t: r3(L(p.lado) - p.t), ...(p.sentido ? { sentido: -p.sentido } : {}), ...(p.bisagra ? { bisagra: p.bisagra === 'ini' ? 'fin' : 'ini' } : {}) }));
  return { ...c, lados, puertas };
}

// ---------- tramos y medición ----------
// Por lindero: geometría, tipo, alto, acabado, puertas con sus límites (t0, t1) y tramos macizos [[t0, t1], …].
export function tramosCerramiento(parcela, cfg) {
  return parcela.poligono.map((_, i) => {
    const G = geometriaLado(parcela, i); const l = ladoCerramiento(cfg, i); const T = CERRAMIENTOS[l.tipo];
    const puertas = cfg.puertas.filter((p) => p.lado === i).map((p) => ({ ...p, t0: r3(p.t - p.ancho / 2), t1: r3(p.t + p.ancho / 2), sentido: p.modelo === 'corredera' ? p.sentido || sentidoAuto(G, cfg.puertas, p) : undefined })).sort((a, b) => a.t0 - b.t0);
    const tramos = []; let t = 0; for (const p of puertas) { if (p.t0 - t > 0.02) tramos.push([r3(t), p.t0]); t = Math.max(t, p.t1); } if (G.L - t > 0.02) tramos.push([r3(t), r3(G.L)]);
    return { ...G, ...l, e: T.acabados[l.acabado]?.e || T.e, T, puertas, tramos };
  });
}
// La hoja corredera se recoge hacia el lado con más muro libre.
function sentidoAuto(G, puertas, p) {
  const otras = puertas.filter((q) => q.lado === G.i && q !== p && q.id !== p.id);
  const libre = (d) => { const a = d > 0 ? p.t + p.ancho / 2 : 0, b = d > 0 ? G.L : p.t - p.ancho / 2; let m = b - a; for (const q of otras) { const q0 = q.t - q.ancho / 2, q1 = q.t + q.ancho / 2; if (d > 0 && q0 >= a) m = Math.min(m, q0 - a); if (d < 0 && q1 <= b) m = Math.min(m, b - q1); } return m; };
  return libre(1) >= libre(-1) ? 1 : -1;
}
export function medicionCerramientos(parcela, cfg) {
  const tr = tramosCerramiento(parcela, cfg); const por = new Map(); let total = 0;
  for (const s of tr) {
    if (s.tipo === 'ninguno') continue; const ml = s.tramos.reduce((a, [t0, t1]) => a + t1 - t0, 0); if (ml < 0.01) continue;
    const k = s.tipo + '|' + s.acabado; const x = por.get(k) || { tipo: s.tipo, acabado: s.acabado, nombre: s.T.n + (s.T.acabados[s.acabado] ? ' · ' + s.T.acabados[s.acabado].n.toLowerCase() : ''), ml: 0, sAlto: 0 };
    x.ml += ml; x.sAlto += ml * s.alto; total += ml; por.set(k, x);
  }
  const tipos = [...por.values()].map((x) => ({ tipo: x.tipo, acabado: x.acabado, nombre: x.nombre, ml: r3(x.ml), alto: r3(x.sAlto / x.ml) }));
  const puertas = cfg.puertas.map((p) => ({ id: p.id, clase: p.clase, modelo: p.modelo, ancho: p.ancho, lado: p.lado, nombre: `${PUERTAS_PARCELA[p.clase].n} ${PUERTAS_PARCELA[p.clase].modelos[p.modelo].n.toLowerCase()}` }));
  return { tipos, puertas, ml: r3(total) };
}
// Resumen legible (MCP y paneles): sin precios.
export function resumenCerramientos(parcela, cfg) {
  const tr = tramosCerramiento(parcela, cfg);
  return {
    auto: !!cfg.auto, porDefecto: cfg.porDefecto,
    lados: tr.map((s) => ({ lado: s.i, largo: r3(s.L), frente: s.frente, medianera: s.medianera, tipo: s.tipo, nombre: s.T.n, alto: s.alto, acabado: s.acabado, acabadoNombre: s.T.acabados[s.acabado]?.n || '', puertas: s.puertas.map((p) => ({ id: p.id, clase: p.clase, modelo: p.modelo, ancho: p.ancho, t: p.t, sentido: p.sentido })) })),
    medicion: medicionCerramientos(parcela, cfg),
  };
}

// ---------- descripción para la IA de imagen (inglés, corta) ----------
const m1 = (v) => String(Math.round(v * 10) / 10);
export function describirCerramientosEn(parcela, cfg) {
  const tr = tramosCerramiento(parcela, cfg); const f = tr[parcela.frente || 0]; if (!f) return '';
  const frase = (s) => (s.tipo === 'ninguno' ? 'left open, with no fence' : `${s.T.en(s.T.acabados[s.acabado] || {})}, about ${m1(s.alto)} m high`);
  const pv = f.puertas.find((p) => p.clase === 'vehiculos'), pp = f.puertas.find((p) => p.clase === 'peaton');
  const col = (f.T.acabados[f.acabado] && ['murete_valla', 'murete_lamas'].includes(f.tipo) ? f.T.acabados[f.acabado].en : 'graphite');
  const g = [pv && `a ${PUERTAS_PARCELA.vehiculos.modelos[pv.modelo].en} ${col} vehicle gate about ${m1(pv.ancho)} m wide`, pp && 'a matching pedestrian gate'].filter(Boolean);
  const resto = new Map(); for (const s of tr) if (s !== f) { const k = s.tipo + '|' + s.acabado; resto.set(k, (resto.get(k) || { s, n: 0, med: 0 })); resto.get(k).n++; if (s.medianera) resto.get(k).med++; }
  const otros = [...resto.values()].sort((a, b) => b.n - a.n).slice(0, 2).map(({ s, med, n }) => `${med === n ? 'party-wall boundaries' : 'side and rear boundaries'}: ${frase(s)}`);
  if (f.tipo === 'ninguno' && !g.length && otros.every((x) => x.endsWith('no fence'))) return '';
  return `Plot boundary: on the street side ${frase(f)}${g.length ? ', with ' + g.join(' and ') : ''}${otros.length ? '; ' + otros.join('; ') : ''}.`;
}
export function describirPropuestaEn(propuesta, modelo) {
  try { const par = propuesta?.parcela; if (!par?.poligono || par.poligono.length < 3) return ''; const cfg = resolverCerramientos(par, modelo || propuesta.modelo, propuesta.casa); return cfg ? describirCerramientosEn(par, cfg) : ''; } catch { return ''; }
}

// ---------- grafismo 2D (SVG en coordenadas del SITIO; quien llama aplica su transformación) ----------
// No lleva textos (la transformación puede invertir el eje y). opt.sel: id de puerta resaltada.
export function svgCerramientos(tramos, opt = {}) {
  const S = []; const P = (q) => `${r3(q[0])} ${r3(q[1])}`; const INK = '#12130f';
  const banda = (G, t0, t1, o0, o1, at) => S.push(`<polygon points="${[enLado(G, t0, o0), enLado(G, t1, o0), enLado(G, t1, o1), enLado(G, t0, o1)].map(P).join(' ')}" ${at}/>`);
  const linea = (G, t0, t1, o, at) => S.push(`<path d="M${P(enLado(G, t0, o))}L${P(enLado(G, t1, o))}" fill="none" ${at}/>`);
  const cuadro = (G, t, o, w, at) => banda(G, t - w / 2, t + w / 2, o - w / 2, o + w / 2, at);
  const postes = (G, t0, t1, paso, o, w, at) => { const k = Math.max(1, Math.round((t1 - t0) / paso)); for (let j = 0; j <= k; j++) cuadro(G, t0 + ((t1 - t0) * j) / k, o, w, at); };
  const curva = (pts) => 'M' + pts.map(P).join('L');
  for (const s of tramos) {
    const A = s.T.acabados[s.acabado] || {}; const col = A.color || '#55564f'; const e = s.e;
    for (const [t0, t1] of s.tramos) {
      if (s.tipo === 'bloque') {
        if (s.acabado === 'visto') { banda(s, t0, t1, 0, e, `fill="#d9d5cb" stroke="${INK}" stroke-width=".025"`); linea(s, t0, t1, e / 2, `stroke="#8f8b82" stroke-width="${r3(e * 0.8)}" stroke-dasharray=".38 .02"`); }
        else banda(s, t0, t1, 0, e, `fill="#6f706a" stroke="${INK}" stroke-width=".025"`);
        postes(s, t0, t1, s.T.poste, e + 0.05, 0.1, `fill="#6f706a"`);
      } else if (s.tipo === 'prefabricado') { // paneles CUEVA de 1,50 m con junta
        banda(s, t0, t1, 0, e, `fill="${col}" stroke="${INK}" stroke-width=".025"`); for (let t = t0 + s.T.modulo; t < t1 - 0.05; t += s.T.modulo) S.push(`<path d="M${P(enLado(s, t, 0))}L${P(enLado(s, t, e))}" stroke="${INK}" stroke-width=".012"/>`);
      } else if (s.tipo === 'malla') {
        linea(s, t0, t1, e / 2, `stroke="${col}" stroke-width=".05"`); linea(s, t0, t1, e / 2, `stroke="${INK}" stroke-width=".012" stroke-dasharray=".12 .08"`);
        postes(s, t0, t1, s.T.poste, e / 2, 0.08, `fill="${INK}"`);
      } else if (s.tipo === 'murete_valla' || s.tipo === 'murete_lamas') {
        banda(s, t0, t1, 0, e, `fill="#e9e6de" stroke="${INK}" stroke-width=".025"`);
        linea(s, t0, t1, e / 2, s.tipo === 'murete_valla' ? `stroke="${col}" stroke-width=".06" stroke-dasharray=".03 .09"` : `stroke="${col}" stroke-width=".07"`);
        postes(s, t0, t1, s.T.poste, e / 2, 0.07, `fill="${INK}"`);
      } else if (s.tipo === 'panel_reciclado') {
        banda(s, t0, t1, 0, e, `fill="${col}" stroke="${INK}" stroke-width=".02"`); postes(s, t0, t1, s.T.modulo, e / 2, 0.07, `fill="${INK}"`);
      } else if (s.tipo === 'lamas_madera' || s.tipo === 'lamas_reciclado') {
        banda(s, t0, t1, 0, e, `fill="${col}" fill-opacity=".85" stroke="${INK}" stroke-width=".02"`); postes(s, t0, t1, s.T.poste, e / 2, 0.12, `fill="#4a3424"`);
      } else if (s.tipo === 'seto') {
        linea(s, t0 + e / 2, t1 - e / 2, e / 2, `stroke="${col}" stroke-opacity=".8" stroke-width="${r3(e)}" stroke-linecap="round"`);
        linea(s, t0 + e / 2, t1 - e / 2, e / 2, `stroke="#22331b" stroke-opacity=".5" stroke-width="${r3(e * 0.55)}" stroke-linecap="round" stroke-dasharray=".08 .22"`);
      } else if (s.tipo === 'gavion') {
        banda(s, t0, t1, 0, e, `fill="${col}" stroke="${INK}" stroke-width=".025"`); const k = Math.max(1, Math.round(t1 - t0));
        for (let j = 1; j < k; j++) { const t = t0 + ((t1 - t0) * j) / k; S.push(`<path d="M${P(enLado(s, t, 0))}L${P(enLado(s, t, e))}" stroke="${INK}" stroke-width=".015"/>`); }
        linea(s, t0, t1, e / 2, `stroke="${INK}" stroke-width=".01" stroke-dasharray=".1 .1"`);
      }
    }
    // puertas: machones, hoja cerrada y su barrido o recogida
    for (const p of s.puertas) {
      const w = p.ancho, on = opt.sel === p.id; const tinta = on ? '#6f52d9' : INK; const oh = Math.max(e / 2, 0.06);
      const mach = s.T.obra ? 0.3 : 0.1; for (const t of [p.t0 - mach / 2, p.t1 + mach / 2]) cuadro(s, t, s.T.obra ? Math.max(e / 2, mach / 2) : oh, mach, `fill="${s.T.obra ? '#6f706a' : INK}" stroke="${INK}" stroke-width=".02"`);
      linea(s, p.t0, p.t1, oh, `stroke="${tinta}" stroke-width="${on ? 0.09 : 0.06}"`);
      const arco = (tb, dir, r) => { const q = []; for (let k = 0; k <= 10; k++) { const a = (k / 10) * (Math.PI / 2); q.push(enLado(s, tb + dir * r * Math.cos(a), oh + r * Math.sin(a))); } return q; };
      if (p.clase === 'peaton' || p.modelo === 'batiente') {
        const hojas = p.clase === 'peaton' ? [[p.bisagra === 'fin' ? p.t1 : p.t0, p.bisagra === 'fin' ? -1 : 1, w]] : [[p.t0, 1, w / 2], [p.t1, -1, w / 2]];
        for (const [tb, dir, r] of hojas) { S.push(`<path d="M${P(enLado(s, tb, oh))}L${P(enLado(s, tb, oh + r))}" stroke="${tinta}" stroke-width=".035"/>`); S.push(`<path d="${curva(arco(tb, dir, r))}" fill="none" stroke="${tinta}" stroke-width=".018" stroke-dasharray=".12 .08"/>`); }
      } else if (p.modelo === 'corredera') {
        const d = p.sentido || 1; const o2 = e + 0.12; linea(s, p.t0, p.t1, o2, `stroke="${tinta}" stroke-width=".05"`);
        const a = d > 0 ? p.t1 : p.t0; linea(s, a, a + d * w, o2, `stroke="${tinta}" stroke-width=".025" stroke-dasharray=".15 .1"`);
        const pnt = enLado(s, a + d * (w - 0.05), o2), b1 = enLado(s, a + d * (w - 0.4), o2 + 0.18), b2 = enLado(s, a + d * (w - 0.4), o2 - 0.18);
        S.push(`<path d="M${P(b1)}L${P(pnt)}L${P(b2)}" fill="none" stroke="${tinta}" stroke-width=".03"/>`);
      } else if (p.modelo === 'basculante') {
        banda(s, p.t0, p.t1, oh, oh + Math.min(2.2, s.alto || 2) * 0.55, `fill="none" stroke="${tinta}" stroke-width=".025" stroke-dasharray=".15 .1"`);
      }
    }
  }
  return S.join('');
}

// Texto corto de un lindero para paneles: «Murete + valla · 1,80 m».
export const etiquetaLado = (l) => (l.tipo === 'ninguno' ? CERRAMIENTOS.ninguno.n : `${CERRAMIENTOS[l.tipo].corto} · ${fmt(l.alto)} m`);
