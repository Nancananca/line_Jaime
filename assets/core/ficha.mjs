// Ficha estándar del modelo (determinista, sin IA): todos los datos verificables de la casa y de su implantación, la
// ÚNICA fuente de los prompts de imagen, de la verificación automática y de los textos de respaldo.
//   fichaModelo(modelo, { propuesta, parcela, casa, comp })  → ficha (JSON)
//   fichaPropuesta(propuesta)                                → ficha (con parcela, casa y cerramientos de la propuesta)
//   textoFicha(ficha) (castellano) · textoFichaEn(ficha) (inglés técnico para prompts)
//   vistasFicha(ficha) · vistaDe(ficha, id) · promptVista(ficha, id, o) · esperadoVista(ficha, id) · textosRespaldo(ficha)
// Marco del modelo (planta): x → derecha (E), y → abajo (S). Lados: N = y mínima (arriba en planta), S, E, O.
// «Izquierda → derecha» de una fachada = mirándola desde fuera (igual que los alzados de core/planos.mjs):
//   S: de O a E · N: de E a O · E: de S a N · O: de N a S.
// Módulo puro (navegador y servidor). Se copia a la web de cliente porque core/prompts.mjs lo importa: no lleva precios.
import { H_PLANTA, T, r3, ci } from './trama.mjs';
import { bbox, bboxPlanta, derivar, superficies, celdasPlanta, vuelos, caidaCubierta, tipoCubierta, cumbreraEnX, rectangulos, esMedianera } from './geometria.mjs';
import { TIPOS, esInt, esExt, CUBIERTA_MATERIALES, JARDINES, COMPLEMENTOS } from './catalogo.mjs';
import { normalizarParcela, colocarAuto, comprobar, transformador, inversoTransformador, azimutLado, rumbo, soleamiento, dentroPoli, centroide } from './parcela.mjs';
import { resolverCerramientos, tramosCerramiento, CERRAMIENTOS, PUERTAS_PARCELA } from './cerramientos.mjs';
import { MATERIALES, CARPINTERIAS } from './prompts.mjs';
import { esSanitario, cimentacionDe } from './cimentacion.mjs';

export const VERSION_FICHA = 1;
const LADOS = ['N', 'S', 'E', 'O'];
const OP = { N: 'S', S: 'N', E: 'O', O: 'E' };
const HOR = { N: true, S: true, E: false, O: false };
const INV = { N: true, E: true, S: false, O: false }; // u medido desde el extremo alto (x o y máximos)
const IZQ = { S: 'O', N: 'E', E: 'S', O: 'N' }; // qué punto cardinal queda a la izquierda mirando la fachada desde fuera
const DIR = { N: [0, -1], S: [0, 1], E: [1, 0], O: [-1, 0] }; // normal exterior en el marco del modelo
const LADO_N = { N: 'norte', S: 'sur', E: 'este', O: 'oeste' };
const LADO_EN = { N: 'north', S: 'south', E: 'east', O: 'west' };
const ROL_ES = { llegada: 'llegada', jardin: 'jardín', lateral: 'lateral', medianera: 'medianera' };
const PISO_ES = ['planta baja', 'planta primera', 'planta segunda', 'planta tercera', 'planta cuarta', 'planta quinta'];
const PISO_EN = ['ground floor', 'first floor', 'second floor', 'third floor', 'fourth floor', 'fifth floor'];
// esquina de la cámara → [fachada a la izquierda de la imagen, fachada a la derecha]
const ESQ = { SE: ['S', 'E'], SO: ['O', 'S'], NE: ['E', 'N'], NO: ['N', 'O'] };
const esquina = (a, b) => { const ns = [a, b].find((x) => x === 'N' || x === 'S'), eo = [a, b].find((x) => x === 'E' || x === 'O'); return ns && eo ? ns + eo : null; };

const n1 = (v) => String(Math.round(Number(v) * 10) / 10);
const n2 = (v) => String(Math.round(Number(v) * 100) / 100);
const es1 = (v) => n1(v).replace('.', ',');
const es2 = (v) => n2(v).replace('.', ',');
const pct = (u, L) => (L > 0 ? Math.round((u / L) * 100) : 0);
const EPS = 1e-6;

export const TIPOS_HUECO = {
  puerta_entrada: { n: 'Puerta de entrada', en: 'the FRONT ENTRANCE DOOR (solid timber leaf, full height)', puerta: true },
  puerta_exterior: { n: 'Puerta exterior secundaria', en: 'a secondary exterior door (narrow, solid leaf)', puerta: true },
  corredera: { n: 'Puerta corredera', en: 'a sliding glass door', puerta: true },
  porton: { n: 'Portón de garaje', en: 'a garage door', puerta: true },
  ventanal: { n: 'Ventanal de suelo a techo', en: 'a floor-to-ceiling glazed panel (a glass wall from floor to ceiling, NOT a framed door)' },
  ventana: { n: 'Ventana', en: 'a window' },
  ventana_alta: { n: 'Ventana alta', en: 'a high horizontal strip window' },
  fijo: { n: 'Fijo vertical', en: 'a narrow full-height fixed glass slot' },
};
const EST_EN = { salon: 'living room', comedor: 'dining room', cocina: 'kitchen', recibidor: 'entrance hall', escalera: 'staircase', porche: 'porch', terraza: 'terrace', patio: 'courtyard', dormitorio: 'bedroom', dormitorio_principal: 'main bedroom', despacho: 'study', distribuidor: 'hall', pasillo: 'corridor', bano: 'bathroom', aseo: 'WC', lavadero: 'utility room', garaje: 'garage', vestidor: 'dressing room', despensa: 'pantry', trastero: 'storage room', instalaciones: 'plant room', piscina: 'swimming pool', quincho: 'barbecue pavilion', chillout: 'outdoor lounge', fogonero: 'fire pit', doble_altura: 'double-height void', bodega: 'wine cellar', gimnasio: 'gym', ascensor: 'lift' };
const RUMBO_EN = { N: 'N', NE: 'NE', E: 'E', SE: 'SE', S: 'S', SO: 'SW', O: 'W', NO: 'NW' };
const COLOR_EN = { gris: 'grey', clara: 'pale', roja: 'red clay', mixta: 'mixed red-brown clay', arena: 'sand-coloured', negra: 'black', pizarra: 'slate-grey', verde: 'green', marron: 'brown', grafito: 'graphite', blanco: 'white', rojo: 'oxide-red' };
const estEn = (t) => EST_EN[t] || String(t).replace(/_/g, ' ');
const nombreDe = (e) => e.nombre || TIPOS[e.tipo]?.n || e.tipo;
const tipoHueco = (h) => (h.tipo === 'puerta' ? (h.entrada ? 'puerta_entrada' : h.corredera ? 'corredera' : 'puerta_exterior') : h.tipo === 'alta' ? 'ventana_alta' : TIPOS_HUECO[h.tipo] ? h.tipo : 'ventana');
const esPuerta = (t) => !!TIPOS_HUECO[t]?.puerta;
const materialSuelo = (e) => { const t = `${e.nombre || ''}`.toLowerCase(); return /piedra|stone/.test(t) ? ['de piedra', 'pale natural-stone'] : /madera|tarima|deck/.test(t) ? ['de madera', 'timber-decked'] : /hormig/.test(t) ? ['de hormigón', 'concrete'] : /grava/.test(t) ? ['de grava', 'gravel'] : ['pavimentada', 'paved']; };

// Huella determinista (FNV-1a de 32 bits) de un objeto JSON: identifica la ficha usada en cada render.
export function huella(o) { const s = JSON.stringify(o) || ''; let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }

// Caja de la casa (interiores + porches: el volumen construido y cubierto), en todas las plantas.
function cajaCasa(modelo) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of modelo.plantas) for (const e of p.estancias) { if (!(esInt(e.tipo) || e.tipo === 'porche')) continue; x0 = Math.min(x0, e.x); y0 = Math.min(y0, e.y); x1 = Math.max(x1, e.x + e.w); y1 = Math.max(y1, e.y + e.h); }
  if (!isFinite(x0)) { const b = bbox(modelo); return b; }
  return { x0: r3(x0), y0: r3(y0), x1: r3(x1), y1: r3(y1), w: r3(x1 - x0), h: r3(y1 - y0) };
}
const ejeU = (B, L) => (HOR[L] ? [B.x0, B.x1] : [B.y0, B.y1]);
const uDe = (B, L, v) => { const [a, b] = ejeU(B, L); return r3(INV[L] ? b - v : v - a); };
const profDe = (B, L, x, y) => r3(L === 'S' ? B.y1 - y : L === 'N' ? y - B.y0 : L === 'E' ? B.x1 - x : x - B.x0);

// ¿Qué fracción del tramo [a, b] de la línea (lado L, coordenada perpendicular c) queda tapada por volumen interior
// de la misma planta en la dirección L? (patios y muros que dan a un porche entre dos alas: no se ven desde fuera)
function ocultacion(m, L, c, a, b) {
  const n = Math.max(1, Math.round((b - a) / T)); let tap = 0;
  for (let k = 0; k < n; k++) {
    const v = a + (k + 0.5) * ((b - a) / n); const i0 = HOR[L] ? Math.floor(v / T + EPS) : ci(c); const j0 = HOR[L] ? ci(c) : Math.floor(v / T + EPS);
    let oc = false;
    for (let s = 0; s < 400 && !oc; s++) {
      const i = HOR[L] ? i0 : L === 'E' ? i0 + s : i0 - 1 - s; const j = HOR[L] ? (L === 'S' ? j0 + s : j0 - 1 - s) : j0;
      const e = m.get(i + ',' + j); if (e && esInt(e.tipo)) oc = true;
    }
    if (oc) tap++;
  }
  return tap / n;
}
function segDe(g, h) { return g.segs.find((s) => s.clase === 'fachada' && s.lado === h.lado && s.o === h.o && (s.o === 'h' ? Math.abs(s.y1 - h.y) < 1e-6 && h.x >= s.x1 - 1e-6 && h.x <= s.x2 + 1e-6 : Math.abs(s.x1 - h.x) < 1e-6 && h.y >= s.y1 - 1e-6 && h.y <= s.y2 + 1e-6)); }

// Masas a lo largo del eje largo de la casa en planta baja: tramos de interior, porche y vacío (barras y alas).
function masas(modelo, B) {
  const m = celdasPlanta(modelo.plantas[0]).m; const largoX = B.w >= B.h; const n = Math.round((largoX ? B.w : B.h) / T); const out = [];
  const i0 = ci(largoX ? B.x0 : B.y0);
  for (let k = 0; k < n; k++) {
    let hayInt = false, hayPor = false; const nn = Math.round((largoX ? B.h : B.w) / T); const j0 = ci(largoX ? B.y0 : B.x0);
    for (let q = 0; q < nn; q++) { const e = m.get(largoX ? `${i0 + k},${j0 + q}` : `${j0 + q},${i0 + k}`); if (!e) continue; if (esInt(e.tipo)) hayInt = true; else if (e.tipo === 'porche') hayPor = true; }
    const t = hayInt ? 'volumen' : hayPor ? 'porche' : 'vacio'; const v0 = r3((i0 + k) * T);
    if (out.length && out.at(-1).tipo === t) out.at(-1).hasta = r3(v0 + T); else out.push({ tipo: t, desde: v0, hasta: r3(v0 + T) });
  }
  return { eje: largoX ? 'x' : 'y', tramos: out.map((x) => ({ ...x, largo: r3(x.hasta - x.desde) })) };
}

// ---------- cubierta ----------
function datosCubierta(modelo, B) {
  const c = modelo.cubierta || {}; const tipo = tipoCubierta(modelo);
  const material = CUBIERTA_MATERIALES[c.material] ? c.material : tipo === 'plana' ? 'grava' : 'teja'; const CM = CUBIERTA_MATERIALES[material];
  const color = CM.colores[c.color] ? c.color : Object.keys(CM.colores)[0]; const pendiente = tipo === 'plana' ? 0 : Math.round(c.pendiente ?? CM.pend ?? 25); const alero = Math.max(0, Number(c.alero) || 0);
  const ejeX = tipo === 'plana' || tipo === 'una' ? null : cumbreraEnX(modelo, { w: B.w, h: B.h }, B);
  const caida = tipo === 'una' ? caidaCubierta(modelo) : null;
  const k = Math.tan((pendiente * Math.PI) / 180); const span = tipo === 'una' ? (caida === 'N' || caida === 'S' ? B.h : B.w) : ejeX == null ? 0 : ejeX ? B.h / 2 : B.w / 2;
  const remate = tipo === 'plana' ? 0 : r3(Math.min(k * span, tipo === 'una' ? 4.5 : 99));
  const fines = ejeX == null ? [] : ejeX ? ['O', 'E'] : ['N', 'S']; const acc = OP[modelo.acceso] ? modelo.acceso : 'N';
  const hip = tipo === 'cuatro' ? fines : tipo === 'tres' ? [fines.includes(OP[acc]) ? OP[acc] : fines[1]] : [];
  const vista = {}; // cómo se ve la cubierta desde cada fachada
  for (const L of LADOS) {
    if (tipo === 'plana') vista[L] = { es: `cubierta plana: línea de remate fina${alero ? `, losa volada ${es2(alero)} m` : ''}`, en: `flat roof: only a slim straight coping line on top${alero ? `, the roof slab projecting ${n2(alero)} m as a thin floating eave` : ''}; no pitched roof` };
    else if (tipo === 'una') vista[L] = L === caida ? { es: 'alero bajo de la cubierta a un agua', en: 'the LOW eave of the mono-pitch roof: the roof slope falls towards this façade' } : L === OP[caida] ? { es: 'lado alto de la cubierta a un agua (muro más alto)', en: 'the HIGH side of the mono-pitch roof: this wall rises to the top edge of the roof' } : { es: `cubierta a un agua de perfil, baja hacia el ${LADO_N[caida]}`, en: `the mono-pitch roof seen in profile, low on the ${IZQ[L] === caida ? 'LEFT' : 'RIGHT'} and high on the ${IZQ[L] === caida ? 'RIGHT' : 'LEFT'}` };
    else if (fines.includes(L)) vista[L] = hip.includes(L) ? { es: 'faldón de cubierta a la vista (limatesas)', en: 'a hipped roof end: a sloping triangular roof plane, no gable wall' } : { es: 'hastial: muro triangular hasta la cumbrera', en: 'a GABLE end: the wall rises in a triangle up to the ridge' };
    else vista[L] = { es: 'alero y faldón de cubierta (la cumbrera corre paralela a la fachada)', en: 'the eaves line with the roof plane rising behind it; the ridge runs parallel to this façade' };
  }
  const mats = { grava: ['grava', 'gravel'], teja: ['teja cerámica', 'ceramic roof tiles'], tegola: ['tégola', 'asphalt shingles'], chapa: ['chapa grecada', 'ribbed metal roof panels'] }[material];
  return { tipo, material, color, pendiente, alero, caida, cumbrera: ejeX == null ? null : ejeX ? 'paralela a E-O' : 'paralela a N-S', remate, vista,
    es: `${{ plana: 'Plana', una: 'A un agua', dos: 'A dos aguas', tres: 'A tres aguas', cuatro: 'A cuatro aguas' }[tipo]}${tipo === 'plana' ? '' : ` (${pendiente}°)`} · ${mats[0]} ${color}${alero ? ` · alero ${es2(alero)} m` : ' · sin alero'}${caida ? ` · cae hacia el ${LADO_N[caida]}` : ''}`,
    en: tipo === 'plana' ? `flat roof finished in ${COLOR_EN[color] || color} ${mats[1]} (visible only from above)${alero ? `, slab projecting ${n2(alero)} m on every side` : ', flush edges, no overhang'}` : `${{ una: 'mono-pitch', dos: 'dual-pitch gable', tres: 'three-slope', cuatro: 'four-slope hipped' }[tipo]} roof at about ${pendiente}°, ${COLOR_EN[color] || color} ${mats[1]}${alero ? `, eaves overhanging ${n2(alero)} m` : ', crisp flush eaves'}${caida ? `, falling towards the ${LADO_EN[caida]} façade` : ''}` };
}

// ---------- parcela: qué hay delante de cada fachada ----------
function rayo(P, o, d) { let best = null; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; const ex = b[0] - a[0], ey = b[1] - a[1]; const den = d[0] * ey - d[1] * ex; if (Math.abs(den) < 1e-12) continue; const t = ((a[0] - o[0]) * ey - (a[1] - o[1]) * ex) / den; const s = ((a[0] - o[0]) * d[1] - (a[1] - o[1]) * d[0]) / den; if (t > 1e-6 && s >= -1e-9 && s <= 1 + 1e-9 && (!best || t < best.t)) best = { t, i }; } return best; }
function parcelaFachadas(modelo, parcela, casa, B) {
  const tr = transformador(modelo, casa); const inv = inversoTransformador(modelo, casa); let cfg = null; try { cfg = resolverCerramientos(parcela, modelo, casa); } catch { /* sin cerramientos */ }
  const tramos = cfg ? tramosCerramiento(parcela, cfg) : null; const out = {}; const P = parcela.poligono; const fr = parcela.frente || 0;
  const cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2; const c0 = tr(cx, cy);
  for (const L of LADOS) {
    const [dx, dy] = DIR[L]; const mx = HOR[L] ? cx : L === 'E' ? B.x1 : B.x0, my = HOR[L] ? (L === 'S' ? B.y1 : B.y0) : cy;
    const p0 = tr(mx, my), p1 = tr(mx + dx, my + dy); const d = [p1[0] - p0[0], p1[1] - p0[1]];
    const hit = rayo(P, p0, d); const f = { distancia: hit ? r3(hit.t) : null, lindero: hit ? hit.i : null };
    if (hit) {
      const i = hit.i; f.frente = i === fr; f.medianera = (parcela.medianeras || []).includes(i); f.tipo = f.frente ? 'calle' : f.medianera ? 'medianera' : 'lindero';
      const s = tramos?.[i]; if (s) { f.cerramiento = { tipo: s.tipo, nombre: s.T.n, alto: s.alto, acabado: s.T.acabados[s.acabado]?.n || '', en: s.tipo === 'ninguno' ? 'no fence' : `${s.T.en(s.T.acabados[s.acabado] || {})}, about ${n1(s.alto)} m high` };
        f.puertas = s.puertas.map((q) => { const G = s; const pt = [G.a[0] + G.u[0] * q.t, G.a[1] + G.u[1] * q.t]; const mm = inv(pt[0], pt[1]); const u = uDe(B, L, HOR[L] ? mm[0] : mm[1]); const C = PUERTAS_PARCELA[q.clase]; return { clase: q.clase, nombre: C.n, modelo: q.modelo, ancho: q.ancho, u, pct: pct(u, HOR[L] ? B.w : B.h), en: `a ${C.modelos[q.modelo]?.en || ''} ${q.clase === 'vehiculos' ? 'vehicle' : 'pedestrian'} gate ${n1(q.ancho)} m wide` }; }); }
    }
    // vecinos: edificios del entorno (fuera de la parcela) delante de esta fachada, a menos de 60 m
    const ve = []; for (const e of parcela.entorno?.edificios || []) { if (e.existente) continue; const c = centroide(e.poly); const v = [c[0] - c0[0], c[1] - c0[1]]; const dist = Math.hypot(...v); if (dist > 60 || dist < 1) continue; const cos = (v[0] * d[0] + v[1] * d[1]) / (dist * Math.hypot(...d)); if (cos > 0.64) ve.push({ distancia: r3(dist), plantas: e.plantas || 1 }); }
    if (ve.length) f.vecinos = { n: ve.length, masCercano: Math.min(...ve.map((x) => x.distancia)), plantasMax: Math.max(...ve.map((x) => x.plantas)) };
    out[L] = f;
  }
  // lado de calle: el de la fachada que mira al lindero de frente (o el más alineado con su normal exterior)
  let calle = LADOS.find((L) => out[L].frente);
  if (!calle) { const a = P[fr], b = P[(fr + 1) % P.length]; const ce = centroide(P); let n = [-(b[1] - a[1]), b[0] - a[0]]; const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if ((ce[0] - mid[0]) * n[0] + (ce[1] - mid[1]) * n[1] > 0) n = [-n[0], -n[1]];
    let best = -Infinity; for (const L of LADOS) { const [dx, dy] = DIR[L]; const p0 = tr(cx, cy), p1 = tr(cx + dx, cy + dy); const dd = (p1[0] - p0[0]) * n[0] + (p1[1] - p0[1]) * n[1]; if (dd > best) { best = dd; calle = L; } } }
  return { fachadas: out, calle, cfg };
}

// ---------- ficha ----------
export function fichaPropuesta(propuesta, comp = null) {
  if (!propuesta?.modelo) throw new Error('Propuesta sin modelo');
  return fichaModelo(propuesta.modelo, { propuesta, comp });
}

export function fichaModelo(modelo, ctx = {}) {
  const prop = ctx.propuesta || null; const avisos = [];
  let parcela = ctx.parcela || null, casa = ctx.casa || null, comp = ctx.comp || null;
  if (!parcela && prop?.parcela?.poligono) { try { parcela = normalizarParcela(JSON.parse(JSON.stringify(prop.parcela))); } catch { parcela = null; } }
  if (parcela && !casa) { try { casa = prop?.casa || colocarAuto(modelo, parcela); } catch { casa = null; } }
  if (parcela && casa && !comp) { try { comp = comprobar(modelo, parcela, casa); } catch { comp = null; } }
  const B = cajaCasa(modelo); const BT = bbox(modelo); const S = superficies(modelo); const nP = modelo.plantas.length;
  const zc = esSanitario(modelo) ? r3(cimentacionDe(modelo).altura) : 0;
  const cub = datosCubierta(modelo, B);
  const G = modelo.plantas.map((_, pi) => derivar(modelo, pi)); const M = modelo.plantas.map((p) => celdasPlanta(p).m);
  const fk = MATERIALES[modelo.acabados?.fachada] ? modelo.acabados.fachada : 'mineral'; const ck = CARPINTERIAS[modelo.acabados?.carpinteria] ? modelo.acabados.carpinteria : 'oscura';
  const jk = JARDINES[modelo.jardin] ? modelo.jardin : 'sin';
  const acabados = { fachada: { k: fk, n: MATERIALES[fk].n, en: MATERIALES[fk].en }, carpinteria: { k: ck, n: CARPINTERIAS[ck].n, en: CARPINTERIAS[ck].en }, jardin: { k: jk, n: JARDINES[jk].n, en: JARDINES[jk].en }, nivel: modelo.acabados?.nivel || null };

  // implantación y orientación
  let pf = null; try { if (parcela && casa) pf = parcelaFachadas(modelo, parcela, casa, B); } catch (e) { avisos.push('Parcela: ' + e.message); }
  const accModelo = OP[modelo.acceso] ? modelo.acceso : null;
  if (comp && comp.dentro === false) avisos.push('Con la implantación guardada la casa no cabe dentro de la parcela: revisa «Parcela» antes de generar imágenes con el entorno.');
  if (pf?.calle && (modelo.medianeras || []).includes(pf.calle)) { avisos.push(`La fachada que mira a la calle (${LADO_N[pf.calle]}) es una medianera del modelo: la implantación parece girada; se usa el acceso del modelo.`); pf.calle = null; }
  const llegada = pf?.calle || accModelo || 'N';
  const fuenteLlegada = pf?.calle ? 'parcela' : accModelo ? 'modelo' : 'supuesta';
  if (pf?.calle && accModelo && pf.calle !== accModelo) avisos.push(`El modelo tiene el acceso por el ${LADO_N[accModelo]} pero, tal como está implantada, la fachada que mira a la calle es la ${LADO_N[pf.calle]}.`);
  const jardinL = OP[llegada];
  const orient = {}; for (const L of LADOS) { const az = parcela && casa ? azimutLado(L, parcela, casa) : { N: 0, E: 90, S: 180, O: 270 }[L]; orient[L] = { azimut: r3(az), rumbo: rumbo(az) }; }
  let sol = null; if (parcela && casa) { try { sol = soleamiento(parcela, casa, prop?.ubicacion?.lat || 40.4, prop?.ubicacion?.lon || -3.7); } catch { sol = null; } }

  // estancias por planta, con sus fachadas
  const plantas = modelo.plantas.map((p, pi) => {
    const g = G[pi]; const sp = S.plantas[pi];
    const q = bboxPlanta(p, true); return { indice: pi, nombre: p.nombre || PISO_ES[pi] || `Planta ${pi}`, util: sp.util, construida: sp.construida, ancho: q.w, fondo: q.h,
      estancias: p.estancias.map((e) => { const x = sp.estancias.find((q) => q.id === e.id) || {}; const lados = [...new Set(g.segs.filter((s) => s.clase === 'fachada' && s.int?.id === e.id && !esMedianera(modelo, s, BT)).map((s) => s.lado))];
        return { id: e.id, tipo: e.tipo, nombre: nombreDe(e), x: e.x, y: e.y, w: e.w, h: e.h, util: x.util ?? r3(e.w * e.h), exterior: esExt(e.tipo), fachadas: lados, huecos: g.huecos.filter((h) => h.est === e.id).length }; }) };
  });

  // exteriores (planta baja y terrazas altas): posición respecto a la casa
  const exteriores = [];
  modelo.plantas.forEach((p, pi) => { for (const e of p.estancias) {
    if (!esExt(e.tipo)) continue;
    const sal = { S: r3(e.y + e.h - B.y1), N: r3(B.y0 - e.y), E: r3(e.x + e.w - B.x1), O: r3(B.x0 - e.x) };
    const lados = LADOS.filter((L) => sal[L] > 0.05).sort((a, b) => sal[b] - sal[a]);
    const dentro = !lados.length; const mat = materialSuelo(e);
    const x = { id: e.id, tipo: e.tipo, nombre: nombreDe(e), planta: pi, x: e.x, y: e.y, w: e.w, h: e.h, area: r3(e.w * e.h), lados, dentro, cubierto: !!TIPOS[e.tipo]?.cubierto, material: e.tipo === 'terraza' ? mat[0] : null, materialEn: e.tipo === 'terraza' ? mat[1] : null };
    if (e.tipo === 'piscina' && e.piscina?.prof) x.profundidad = e.piscina.prof;
    // abierto hacia: para piezas dentro de la caja (porches entre alas, patios), por dónde se abren
    if (dentro) x.abiertoA = LADOS.filter((L) => { const c = L === 'S' ? e.y + e.h : L === 'N' ? e.y : L === 'E' ? e.x + e.w : e.x; const [a, b] = HOR[L] ? [e.x, e.x + e.w] : [e.y, e.y + e.h]; return ocultacion(M[pi], L, c, a, b) < 0.5; });
    exteriores.push(x);
  } });
  for (const c of modelo.complementos || []) { const def = COMPLEMENTOS.find((x) => x.k === c.k); if (!def?.estancia || exteriores.some((x) => x.tipo === def.estancia)) continue; exteriores.push({ id: 'compl-' + c.k, tipo: def.estancia, nombre: def.n, planta: 0, lados: [], dentro: false, sinPosicion: true }); }

  // fachadas
  const fachadas = {};
  for (const L of LADOS) {
    const [U0, U1] = ejeU(B, L); const largo = r3(U1 - U0); const items = []; const ocultos = []; const tramosProf = [];
    let plantasLado = 0; const medTodo = (modelo.medianeras || []).includes(L);
    modelo.plantas.forEach((p, pi) => {
      const g = G[pi]; const m = M[pi];
      for (const s of g.segs) { if (s.clase !== 'fachada' || s.lado !== L) continue; const med = esMedianera(modelo, s, BT); const a = HOR[L] ? s.x1 : s.y1, b = HOR[L] ? s.x2 : s.y2; const c = HOR[L] ? s.y1 : s.x1;
        const oc = ocultacion(m, L, c, a, b); if (oc >= 0.5) continue; plantasLado = Math.max(plantasLado, pi + 1);
        const u0 = Math.min(uDe(B, L, a), uDe(B, L, b)), u1 = Math.max(uDe(B, L, a), uDe(B, L, b)); tramosProf.push({ planta: pi, desde: u0, hasta: u1, profundidad: profDe(B, L, s.x1, s.y1), medianera: med }); }
      for (const h of g.huecos) {
        if (h.lado !== L) continue; const s = segDe(g, h); const c = HOR[L] ? h.y : h.x; const v = HOR[L] ? h.x : h.y;
        const tipo = tipoHueco(h); const est = p.estancias.find((e) => e.id === h.est);
        const it = { clase: 'hueco', tipo, n: TIPOS_HUECO[tipo].n, planta: pi, ancho: h.ancho, alto: h.alto, alfeizar: h.alf || 0, u: uDe(B, L, v), estancia: est ? nombreDe(est) : '', estanciaTipo: est?.tipo || '', estanciaId: h.est, profundidad: profDe(B, L, h.x, h.y), daA: s?.extr ? { tipo: s.extr.tipo, nombre: nombreDe(s.extr), id: s.extr.id } : null, entrada: !!h.entrada, manual: !!h.manual };
        if (ocultacion(m, L, c, v - h.ancho / 2, v + h.ancho / 2) >= 0.5) { ocultos.push(it); continue; }
        items.push(it);
      }
      // porches y terrazas altas que se abren a esta fachada (huecos de volumen)
      for (const x of exteriores) {
        if (x.planta !== pi || x.sinPosicion || !(x.tipo === 'porche' || (x.tipo === 'terraza' && (pi > 0 || x.dentro)))) continue;
        const abierto = x.dentro ? (x.abiertoA || []).includes(L) : x.lados.includes(L);
        if (!abierto) continue;
        const a = HOR[L] ? x.x : x.y, b = HOR[L] ? x.x + x.w : x.y + x.h; const u0 = Math.min(uDe(B, L, a), uDe(B, L, b)), u1 = Math.max(uDe(B, L, a), uDe(B, L, b));
        const atraviesa = x.dentro && (x.abiertoA || []).includes(OP[L]);
        items.push({ clase: 'porche', tipo: x.tipo, n: x.nombre, planta: pi, u: r3((u0 + u1) / 2), desde: u0, hasta: u1, ancho: r3(u1 - u0), fondo: HOR[L] ? x.h : x.w, atraviesa, id: x.id, cubierto: x.cubierto, muros: [] });
      }
    });
    items.sort((a, b) => a.planta - b.planta || a.u - b.u);
    // muros interiores de cada porche (vistos a través de su abertura): izquierdo, derecho y fondo
    for (const it of items.filter((x) => x.clase === 'porche')) {
      const g = G[it.planta];
      for (const h of g.huecos) { const s = segDe(g, h); if (s?.extr?.id !== it.id) continue; if (h.lado === L || h.lado === OP[L]) continue; // el fondo (mira hacia fuera) ya está en la lista; el que mira hacia dentro no se ve
        const muro = h.lado === IZQ[L] ? 'derecho' : 'izquierdo'; // un muro que mira al oeste, en la fachada S, es el muro DERECHO del porche
        const tipo = tipoHueco(h); const est = modelo.plantas[it.planta].estancias.find((e) => e.id === h.est);
        it.muros.push({ muro, tipo, n: TIPOS_HUECO[tipo].n, ancho: h.ancho, alto: h.alto, alfeizar: h.alf || 0, estancia: est ? nombreDe(est) : '', estanciaTipo: est?.tipo || '', entrada: !!h.entrada }); }
      it.muros.sort((a, b) => ['izquierdo', 'fondo', 'derecho'].indexOf(a.muro) - ['izquierdo', 'fondo', 'derecho'].indexOf(b.muro));
    }
    const hs = items.filter((x) => x.clase === 'hueco');
    hs.forEach((h, k) => { h.orden = k + 1; h.desde = r3(h.u - h.ancho / 2); h.hasta = r3(h.u + h.ancho / 2); h.pct = pct(h.u, largo); });
    items.filter((x) => x.clase === 'porche').forEach((x) => { x.pctDesde = pct(x.desde, largo); x.pctHasta = pct(x.hasta, largo); });
    const delante = exteriores.filter((x) => !x.dentro && x.planta === 0 && !x.sinPosicion && x.lados.includes(L)).map((x) => {
      const a = HOR[L] ? x.x : x.y, b = HOR[L] ? x.x + x.w : x.y + x.h; const u0 = Math.min(uDe(B, L, a), uDe(B, L, b)), u1 = Math.max(uDe(B, L, a), uDe(B, L, b));
      const cerca = L === 'S' ? x.y - B.y1 : L === 'N' ? B.y0 - (x.y + x.h) : L === 'E' ? x.x - B.x1 : B.x0 - (x.x + x.w);
      const p0 = pct(u0, largo), p1 = pct(u1, largo); const pc = (p0 + p1) / 2; const pos = p1 - p0 >= 85 ? 'todo' : pc < 38 ? 'izquierda' : pc > 62 ? 'derecha' : 'centro';
      return { tipo: x.tipo, nombre: x.nombre, id: x.id, desde: u0, hasta: u1, pctDesde: p0, pctHasta: p1, ancho: r3(u1 - u0), fondo: HOR[L] ? x.h : x.w, distancia: r3(Math.max(0, cerca)), posicion: pos, principal: x.lados[0] === L, material: x.material, materialEn: x.materialEn, profundidad: x.profundidad || null };
    }).sort((a, b) => a.distancia - b.distancia || a.desde - b.desde);
    const puertas = hs.filter((h) => esPuerta(h.tipo)); const ventanas = hs.filter((h) => !esPuerta(h.tipo));
    const porches = items.filter((x) => x.clase === 'porche');
    const medianera = medTodo && (tramosProf.length === 0 || tramosProf.every((t) => t.medianera || t.profundidad > 0.05));
    const rol = medianera ? 'medianera' : L === llegada ? 'llegada' : L === jardinL ? 'jardin' : 'lateral';
    const nombre = { medianera: `Medianera ${LADO_N[L]}`, llegada: `Fachada de llegada (${fuenteLlegada === 'parcela' ? 'calle' : 'acceso'}) · ${LADO_N[L]}`, jardin: `Fachada al jardín · ${LADO_N[L]}`, lateral: `Fachada lateral ${LADO_N[L]}` }[rol];
    const nombreEn = { medianera: `${LADO_EN[L]} party wall`, llegada: `arrival (${fuenteLlegada === 'parcela' ? 'street-side' : 'entrance-side'}) façade`, jardin: 'garden façade', lateral: `${LADO_EN[L]} side façade` }[rol];
    // profundidades distintas = retranqueos
    const profs = [...new Set(tramosProf.filter((t) => !t.medianera).map((t) => n2(t.profundidad)))].map(Number).sort((a, b) => a - b);
    const retranqueos = profs.length > 1 ? tramosProf.filter((t) => t.profundidad > 0.05 && !t.medianera).map((t) => ({ planta: t.planta, desde: t.desde, hasta: t.hasta, profundidad: t.profundidad })) : [];
    const no = []; const noEn = [];
    if (medianera && !hs.length && !porches.length) { no.push('sin ventanas ni puertas: medianera ciega'); noEn.push('blank party wall: NO windows, NO doors'); }
    else {
      if (!hs.some((h) => h.tipo === 'puerta_entrada')) { no.push('sin puerta de entrada'); noEn.push('NO entrance door on this façade'); }
      if (!puertas.length) { no.push('sin puertas'); noEn.push('NO doors of any kind on this façade'); }
      if (!hs.length && !porches.length) { no.push('fachada ciega, sin huecos'); noEn.push('a completely blank wall with NO openings'); }
      if (!hs.some((h) => h.tipo === 'porton')) noEn.push('no garage door');
    }
    if (!delante.some((d) => d.tipo === 'piscina')) { no.push('sin piscina delante'); noEn.push('NO swimming pool in front of this façade'); }
    if (!delante.some((d) => d.tipo === 'terraza') && !porches.length) { no.push('sin terraza delante'); }
    if (nP === 1) noEn.push('single storey: nothing above the roof line');
    fachadas[L] = {
      lado: L, ladoNombre: LADO_N[L], rol, nombre, nombreEn, rumbo: orient[L].rumbo, azimut: orient[L].azimut, largo, altura: r3(Math.max(plantasLado, medianera ? nP : 0) * H_PLANTA + zc), plantas: plantasLado,
      izquierda: IZQ[L], derecha: OP[IZQ[L]], cubierta: cub.vista[L], retranqueos, medianera,
      elementos: items.map((x) => (x.clase === 'hueco' ? x : { ...x })), huecos: hs, ocultos,
      cuenta: { huecos: hs.length, puertas: puertas.length, ventanas: ventanas.length, entrada: hs.some((h) => h.tipo === 'puerta_entrada'), porches: porches.length, porton: hs.some((h) => h.tipo === 'porton') },
      delante, parcela: pf?.fachadas?.[L] || null, sol: sol ? sol[L] : null, no, noEn,
    };
  }

  // entrada
  const ent = (() => { for (const [pi, g] of G.entries()) { const h = g.huecos.find((q) => q.entrada); if (h) return { h, pi, g }; } return null; })();
  let entrada = null;
  if (ent) {
    const F = fachadas[ent.h.lado]; const enLista = F.huecos.find((x) => x.entrada); const s = segDe(ent.g, ent.h); const est = modelo.plantas[ent.pi].estancias.find((e) => e.id === ent.h.est);
    const porche = !enLista ? Object.values(fachadas).flatMap((f) => f.elementos.filter((x) => x.clase === 'porche' && x.muros.some((m) => m.entrada)).map((x) => ({ f: f.lado, x }))) : [];
    const visibleDesde = enLista ? [ent.h.lado] : [...new Set(porche.map((p) => p.f))];
    entrada = { fachada: ent.h.lado, rol: F.rol, u: enLista?.u ?? null, pct: enLista?.pct ?? null, ancho: ent.h.ancho, alto: ent.h.alto, estancia: est ? nombreDe(est) : '', estanciaTipo: est?.tipo || '', daA: s?.extr ? { tipo: s.extr.tipo, nombre: nombreDe(s.extr) } : null, enPorche: !enLista, visibleDesde, manual: !!ent.h.manual };
    const porLlegada = visibleDesde.includes(llegada);
    const porchePaso = exteriores.find((x) => x.tipo === 'porche' && x.dentro && (x.abiertoA || []).includes(llegada) && ((x.abiertoA || []).includes(ent.h.lado) || porche.some((p) => p.x.id === x.id)));
    entrada.recorrido = porLlegada ? (entrada.enPorche ? 'desde la calle, entrando en el porche' : 'directa desde la llegada') : porchePaso ? `desde la llegada, cruzando el porche «${porchePaso.nombre}» hasta la fachada ${LADO_N[ent.h.lado]}` : `rodeando la casa hasta la fachada ${LADO_N[ent.h.lado]}`;
    entrada.recorridoEn = porLlegada ? 'reached directly from the arrival side' : porchePaso ? `reached from the arrival side by walking through the open covered porch to the ${LADO_EN[ent.h.lado]} side` : `reached by walking around the house to the ${LADO_EN[ent.h.lado]} side`;
    if (!porLlegada && F.rol === 'jardin') avisos.push(`La puerta de entrada (${entrada.estancia}) está en la fachada al jardín (${LADO_N[ent.h.lado]})${F.delante.some((d) => d.tipo === 'piscina') ? ', la de la piscina,' : ''} y la llegada es por el ${LADO_N[llegada]}: si no es lo previsto, muévela en Diseño → Huecos (H) o marca otra estancia como entrada.`);
  } else avisos.push('El modelo no tiene puerta de entrada derivada.');

  const piscinas = exteriores.filter((x) => x.tipo === 'piscina');
  const piscina = piscinas.length ? piscinas.map((x) => { const L = x.lados[0] || null; const d = L ? fachadas[L].delante.find((q) => q.id === x.id) : null; return { id: x.id, nombre: x.nombre, w: x.w, h: x.h, largo: Math.max(x.w || 0, x.h || 0), anchoCorto: Math.min(x.w || 0, x.h || 0), profundidad: x.profundidad || null, lado: L, lados: x.lados, rol: L ? fachadas[L].rol : null, distancia: d?.distancia ?? null, posicion: d?.posicion || null, pctDesde: d?.pctDesde ?? null, pctHasta: d?.pctHasta ?? null, sinPosicion: !!x.sinPosicion, dentro: x.dentro }; }) : [];

  const v = nP > 1 ? vuelos(modelo, 1) : { celdas: [] };
  const F = {
    version: VERSION_FICHA, modelo: { id: modelo.id || null, nombre: modelo.nombre || '', familia: modelo.familia || '' }, propuesta: prop ? { id: prop.id, nombre: prop.nombre } : null,
    dimensiones: { ancho: B.w, fondo: B.h, eje: B.w >= B.h ? 'x' : 'y', huellaTotal: { ancho: BT.w, fondo: BT.h }, plantas: nP, alturaPlanta: H_PLANTA, altura: r3(nP * H_PLANTA + zc), alturaMax: r3(nP * H_PLANTA + zc + cub.remate), forjadoSanitario: zc || 0, util: S.util, construida: S.construida, exterior: S.exterior, dormitorios: S.dormitorios, banos: S.banos, aseos: S.aseos,
      vuelo: v.celdas.length ? (Number.isFinite(v.max) ? r3(v.max) : 'sí') : 0 },
    masas: masas(modelo, B), cubierta: cub, acabados, plantas, exteriores, piscina, entrada,
    llegada: { lado: llegada, fuente: fuenteLlegada, accesoModelo: accModelo }, jardin: { lado: jardinL },
    orientacion: { lados: orient, supuesta: !(parcela && casa), norteParcela: parcela?.norte || 0, giro: casa?.giro || 0, luzSalon: comp?.luzSalon || null },
    fachadas, parcela: parcela ? { area: parcela.area, frente: parcela.frente, retranqueos: parcela.retranqueos, medianeras: parcela.medianeras || [], cerramientos: pf?.cfg ? { auto: !!pf.cfg.auto } : null } : null,
    ubicacion: prop?.ubicacion ? { municipio: prop.ubicacion.municipio || '', provincia: prop.ubicacion.provincia || '', entorno: prop.ubicacion.entorno || '' } : null,
    avisos,
  };
  F.huella = huella({ ...F, avisos: undefined });
  return F;
}

// ---------- vistas estándar ----------
// id: llegada | jardin | aerea | cenital | fachada_N|S|E|O | oblicua_NE|NO|SE|SO | interior:<estancia>
// fachadas: [izquierda de la imagen, derecha] (la principal se marca); camara.visor: nombre de la cámara del visor 3D
// equivalente (app/js/visor3d.js · vista()), si la hay; camara.desde: punto cardinal (marco del modelo) desde el que mira.
export function vistasFicha(F) {
  const acc = F.llegada.lado, op = OP[acc]; const lat = acc === 'N' || acc === 'S' ? 'E' : 'S'; const latOp = OP[lat];
  const par = (a, b, principal) => { const k = esquina(a, b); const o = k ? ESQ[k] : [a, b]; return { fachadas: o, principal, esquina: k }; };
  const V = [];
  const pisc = (F.piscina || []).filter((p) => p.lado);
  const add = (id, nombre, tipo, f, camara, extra = {}) => { const vis = f.fachadas || []; const pv = tipo === 'aerea' || tipo === 'cenital' ? pisc.length > 0 : pisc.some((p) => p.lados.some((l) => vis.includes(l)));
    const pp = tipo === 'exterior' && pisc.some((p) => p.lado === f.principal);
    const ev = !!F.entrada && (tipo === 'aerea' ? true : tipo === 'cenital' ? false : F.entrada.visibleDesde.some((l) => vis.includes(l)));
    V.push({ id, nombre, tipo, ...f, camara, piscinaVisible: pv, piscinaPrimerPlano: pp, entradaVisible: ev, disponible: true, ...extra }); };
  const ll = par(acc, latOp, acc); add('llegada', 'Llegada · tres cuartos desde la calle', 'exterior', ll, { desde: ll.esquina || acc, altura: 1.6, visor: 'acceso' }, F.llegada.fuente === 'supuesta' ? { disponible: false, motivo: 'Sin datos de acceso' } : {});
  const ja = par(op, lat, op); add('jardin', 'Jardín · tres cuartos desde el jardín', 'exterior', ja, { desde: ja.esquina || op, altura: 1.6, visor: 'jardin' });
  add('aerea', 'Aérea de dron 45°', 'aerea', { ...par(op, lat, null) }, { desde: esquina(op, lat), altura: 'aerea', visor: 'aerea' });
  add('cenital', 'Cenital', 'cenital', { fachadas: [], principal: null, esquina: null }, { desde: 'arriba', altura: 'cenital', visor: 'cenital' });
  for (const L of LADOS) { const f = F.fachadas[L]; add('fachada_' + L, `Frontal · ${f.nombre}`, 'exterior', { fachadas: [L], principal: L, esquina: null }, { desde: L, altura: 1.6, visor: L === acc ? 'acceso' : L === op ? 'jardin' : null }, f.medianera ? { disponible: false, motivo: 'Medianera: no se ve desde la parcela' } : {}); }
  for (const k of ['NE', 'NO', 'SE', 'SO']) { const [a, b] = ESQ[k]; const m = F.fachadas[a].medianera || F.fachadas[b].medianera; add('oblicua_' + k, `Oblicua ${k} · ${F.fachadas[a].nombre.split(' · ')[0].toLowerCase()} y ${F.fachadas[b].nombre.split(' · ')[0].toLowerCase()}`, 'exterior', { fachadas: [a, b], principal: null, esquina: k }, { desde: k, altura: 1.6, visor: k === esquina(op, lat) ? 'jardin' : k === esquina(acc, latOp) ? 'acceso' : null }, m ? { disponible: false, motivo: 'Una de las dos fachadas es medianera' } : {}); }
  for (const p of F.plantas) for (const e of p.estancias) { if (e.exterior || ['pasillo', 'distribuidor', 'instalaciones', 'ascensor', 'doble_altura', 'escalera', 'despensa', 'trastero'].includes(e.tipo)) continue;
    V.push({ id: 'interior:' + e.id, nombre: `Interior · ${e.nombre}${p.indice ? ' (' + PISO_ES[p.indice] + ')' : ''}`, tipo: 'interior', estancia: e.id, fachadas: e.fachadas, principal: null, camara: { desde: 'dentro', altura: 1.5, visor: { salon: 'salon', cocina: 'cocina', dormitorio_principal: 'dormitorio', dormitorio: 'dormitorio' }[e.tipo] || 'estancia', estancia: e.id }, piscinaVisible: false, piscinaPrimerPlano: false, entradaVisible: false, disponible: true }); }
  return V;
}
// Normaliza un id de vista (estándar, de captura o del visor antiguo) a una vista de la ficha.
export function vistaDe(F, id, fachadas = null) {
  const V = vistasFicha(F); let k = String(id || '').trim();
  const visor = { acceso: 'llegada', calle: 'fachada_' + F.llegada.lado, jardin: 'jardin', aerea: 'aerea', cenital: 'cenital', planta: 'cenital' }[k]; if (visor) k = visor;
  if (/^(fachada|frontal)[_:-]?[NSEO]$/i.test(k)) k = 'fachada_' + k.slice(-1).toUpperCase();
  if (/^oblicua[_:-]?(NE|NO|SE|SO)$/i.test(k)) k = 'oblicua_' + k.slice(-2).toUpperCase();
  if (/^(estancia|interior)[:_]/.test(k)) k = 'interior:' + k.replace(/^(estancia|interior)[:_]/, '');
  if (['salon', 'cocina', 'dormitorio', 'bano', 'despacho'].includes(k)) { const t = { dormitorio: ['dormitorio_principal', 'dormitorio'], bano: ['bano', 'aseo'] }[k] || [k]; const e = F.plantas.flatMap((p) => p.estancias).filter((x) => t.includes(x.tipo)).sort((a, b) => t.indexOf(a.tipo) - t.indexOf(b.tipo) || b.util - a.util)[0]; k = e ? 'interior:' + e.id : 'jardin'; }
  let v = V.find((x) => x.id === k) || null; if (!v) return null;
  if (Array.isArray(fachadas) && fachadas.length && v.tipo === 'exterior') { const f = fachadas.filter((l) => LADOS.includes(l)).slice(0, 2); if (f.length) { const kk = f.length === 2 ? esquina(f[0], f[1]) : null; v = { ...v, fachadas: kk ? ESQ[kk] : f, principal: f.length === 1 ? f[0] : v.principal && f.includes(v.principal) ? v.principal : null, esquina: kk, fachadasDeCaptura: true }; } }
  return v;
}

// ---------- textos de huecos ----------
function huecoEn(h, L, o = {}) {
  const T = TIPOS_HUECO[h.tipo]; const dim = `${n2(h.ancho)} m wide × ${n2(h.alto)} m tall`;
  const alt = h.tipo === 'ventana' ? `, sill at ${n2(h.alfeizar)} m` : h.tipo === 'ventana_alta' ? `, sill at ${n2(h.alfeizar)} m (high up, near the ceiling)` : ', from floor level';
  return `${T.en}, ${dim}${alt}${h.estancia && !o.interior ? ` (${estEn(h.estanciaTipo) || h.estancia})` : ''}${h.profundidad > 0.05 && !o.interior ? `, set back ${n2(h.profundidad)} m from the main façade plane` : ''}`;
}
function huecoEs(h) {
  return `${h.n} ${es2(h.ancho)} × ${es2(h.alto)} m${h.tipo === 'ventana' || h.tipo === 'ventana_alta' ? ` (alféizar ${es2(h.alfeizar)} m)` : ''}${h.estancia ? ' · ' + h.estancia : ''}`;
}
function porcheEn(x, F) {
  const muros = x.muros.map((m) => `${m.muro === 'izquierdo' ? 'on its LEFT wall' : m.muro === 'derecho' ? 'on its RIGHT wall' : 'on its back wall'} ${TIPOS_HUECO[m.tipo].en} ${n2(m.ancho)} m wide${m.estanciaTipo ? ` (${estEn(m.estanciaTipo)})` : ''}`);
  return `an OPEN covered ${x.tipo === 'porche' ? 'porch' : 'terrace'} ${n2(x.ancho)} m wide and ${n2(x.fondo)} m deep${x.atraviesa ? ' that passes RIGHT THROUGH the house (you can see through it to the other side)' : ''}; the roof continues over it as a flat slab${muros.length ? '; inside it: ' + muros.join('; ') : '; its inner walls are blank'}`;
}

// ---------- texto legible (castellano) ----------
export function textoFicha(F) {
  const L = []; const d = F.dimensiones;
  L.push(`FICHA DEL MODELO · ${F.modelo.nombre}${F.propuesta ? ` · ${F.propuesta.nombre}` : ''}`);
  L.push(`Huella ${es2(d.ancho)} × ${es2(d.fondo)} m · ${d.plantas} planta${d.plantas > 1 ? 's' : ''} · altura ${es2(d.altura)} m${d.alturaMax > d.altura ? ` (máx. ${es2(d.alturaMax)} m)` : ''} · ${es1(d.construida)} m² construidos · ${es1(d.util)} m² útiles · ${d.dormitorios} dormitorios · ${d.banos} baños${d.aseos ? ` + ${d.aseos} aseo(s)` : ''}.`);
  const vol = F.masas.tramos.filter((t) => t.tipo !== 'vacio'); if (vol.length > 1) L.push(`Volumen: ${vol.map((t) => `${t.tipo === 'porche' ? 'porche abierto' : 'volumen'} de ${es2(t.largo)} m`).join(' + ')} (a lo largo del eje ${F.masas.eje === 'x' ? 'este-oeste del plano' : 'norte-sur del plano'}).`);
  L.push(`Cubierta: ${F.cubierta.es}. Fachada: ${F.acabados.fachada.n}. Carpintería: ${F.acabados.carpinteria.n}. Jardín: ${F.acabados.jardin.n}.`);
  L.push(`Llegada por el ${LADO_N[F.llegada.lado]} (${{ parcela: 'según la parcela', modelo: 'acceso del modelo', supuesta: 'supuesta' }[F.llegada.fuente]}); jardín al ${LADO_N[F.jardin.lado]}.${F.orientacion.supuesta ? ' Orientación supuesta (sin parcela: el norte del plano es el norte).' : ''}`);
  if (F.entrada) L.push(`Entrada: ${F.entrada.estancia}, fachada ${LADO_N[F.entrada.fachada]} (${ROL_ES[F.fachadas[F.entrada.fachada].rol]})${F.entrada.pct != null ? ` al ${F.entrada.pct} % desde la izquierda` : ' dentro del porche'}; ${F.entrada.recorrido}.`);
  for (const p of F.piscina || []) L.push(p.sinPosicion ? `Piscina contratada sin posición dibujada.` : `Piscina ${es2(p.w)} × ${es2(p.h)} m al ${LADO_N[p.lado]} (${ROL_ES[p.rol] || p.rol}), a ${es2(p.distancia)} m de la fachada, ${{ izquierda: 'a la izquierda', derecha: 'a la derecha', centro: 'centrada', todo: 'a todo lo ancho' }[p.posicion] || ''} (${p.pctDesde}–${p.pctHasta} %).`);
  L.push('');
  for (const p of F.plantas) L.push(`${p.nombre}: ${p.estancias.map((e) => `${e.nombre} ${es1(e.util)} m²${e.fachadas.length ? ' [' + e.fachadas.join('') + ']' : ''}`).join(' · ')}.`);
  for (const l of LADOS) {
    const f = F.fachadas[l]; L.push(''); L.push(`${f.nombre.toUpperCase()} · mira al ${f.rumbo} · ${es2(f.largo)} m × ${es2(f.altura)} m · ${f.cuenta.huecos} huecos (${f.cuenta.puertas} puertas) · cubierta: ${f.cubierta.es}`);
    if (f.medianera && !f.elementos.length) { L.push('  Medianera: sin huecos.'); continue; }
    if (f.medianera) L.push('  Medianera: el muro de lindero es ciego; solo hay huecos en los tramos retranqueados.');
    f.elementos.forEach((x) => { if (x.clase === 'hueco') L.push(`  ${x.orden}. ${huecoEs(x)} · a ${es2(x.u)} m (${x.pct} %)${x.planta ? ' · ' + PISO_ES[x.planta] : ''}${x.profundidad > 0.05 ? ` · retranqueado ${es2(x.profundidad)} m` : ''}${x.daA ? ' · da a ' + x.daA.nombre.toLowerCase() : ''}`);
      else L.push(`  ▭ ${x.n}: hueco abierto de ${es2(x.ancho)} m (${x.pctDesde}–${x.pctHasta} %)${x.atraviesa ? ', atraviesa la casa' : ''}${x.muros.length ? '; dentro: ' + x.muros.map((m) => `muro ${m.muro}: ${m.n.toLowerCase()} ${es2(m.ancho)} m${m.estancia ? ' (' + m.estancia + ')' : ''}`).join('; ') : ''}`); });
    if (f.retranqueos.length) L.push(`  Retranqueos: ${f.retranqueos.map((r) => `${es2(r.desde)}–${es2(r.hasta)} m, ${es2(r.profundidad)} m hacia dentro`).join('; ')}.`);
    if (f.delante.length) L.push(`  Delante: ${f.delante.map((x) => `${x.nombre} ${es2(x.ancho)} × ${es2(x.fondo)} m a ${es2(x.distancia)} m (${x.pctDesde}–${x.pctHasta} %)`).join('; ')}.`);
    const pp = f.parcela; if (pp) L.push(`  Parcela: ${pp.distancia != null ? `${es1(pp.distancia)} m hasta el lindero (${pp.tipo})` : 'sin lindero delante'}${pp.cerramiento ? ` · ${pp.cerramiento.nombre} ${es1(pp.cerramiento.alto)} m` : ''}${pp.puertas?.length ? ` · ${pp.puertas.map((q) => q.nombre.toLowerCase() + ' ' + es1(q.ancho) + ' m').join(', ')}` : ''}${pp.vecinos ? ` · ${pp.vecinos.n} edificio(s) vecino(s), el más cercano a ${Math.round(pp.vecinos.masCercano)} m` : ''}.`);
    if (f.sol) L.push(`  Sol directo: ${es2(f.sol.invierno)} h en invierno, ${es2(f.sol.verano)} h en verano.`);
    if (f.no.length) L.push(`  NO hay: ${f.no.join('; ')}.`);
  }
  if (F.avisos.length) { L.push(''); L.push('AVISOS'); for (const a of F.avisos) L.push('  · ' + a); }
  return L.join('\n');
}

// ---------- texto técnico (inglés) para prompts ----------
export function textoFichaEn(F) {
  const d = F.dimensiones; const P = [];
  P.push(`HOUSE: ${d.plantas === 1 ? 'one storey' : d.plantas + ' storeys'}, ${n1(d.altura)} m high${d.alturaMax > d.altura ? ` (${n1(d.alturaMax)} m at the top of the roof)` : ''}, built footprint ${n2(d.ancho)} × ${n2(d.fondo)} m${d.ancho / Math.max(d.fondo, 0.1) > 2.4 || d.fondo / Math.max(d.ancho, 0.1) > 2.4 ? ' (a long, low, narrow bar)' : ''}.${d.vuelo ? ` The upper floor cantilevers ${typeof d.vuelo === 'number' ? n1(d.vuelo) + ' m' : ''} with NO columns underneath.` : ''}${d.forjadoSanitario ? ` The house floats ${n2(d.forjadoSanitario)} m above the ground on a raised ventilated floor with short concrete steps at the doors.` : ''}`);
  const vol = F.masas.tramos.filter((t) => t.tipo !== 'vacio'); if (vol.length > 1) P.push(`MASSING along its length: ${vol.map((t) => (t.tipo === 'porche' ? `an open covered porch ${n2(t.largo)} m wide` : `a closed volume ${n2(t.largo)} m long`)).join(', then ')}.`);
  P.push(`ROOF: ${F.cubierta.en}. FAÇADES: ${F.acabados.fachada.en}; ${F.acabados.carpinteria.en}. Modular precast construction on a 0.75 m grid, crisp joints.`);
  return P.join(' ');
}

// ---------- bloque de prompt por vista ----------
function fachadaEn(F, L, papel) {
  const f = F.fachadas[L]; const P = [];
  P.push(`${papel} — the ${f.nombreEn} (faces ${RUMBO_EN[f.rumbo] || f.rumbo}), ${n2(f.largo)} m long, ${n1(f.altura)} m high; roof seen from here: ${f.cubierta.en}.`);
  if (f.medianera && !f.elementos.length) { P.push('It is a blank party wall: no windows, no doors.'); return P.join(' '); }
  if (f.medianera) P.push('It is a party wall: the boundary wall itself is blank; openings exist only in the set-back parts listed below.');
  const hs = f.elementos;
  if (!hs.length) P.push('It is a completely BLANK wall: no openings at all.');
  else {
    P.push(`From LEFT to RIGHT (as seen from outside) it has exactly ${f.cuenta.huecos} opening${f.cuenta.huecos === 1 ? '' : 's'}${f.cuenta.porches ? ` and ${f.cuenta.porches} open porch gap${f.cuenta.porches > 1 ? 's' : ''}` : ''}:`);
    let k = 0; for (const x of hs) { if (x.clase === 'hueco') P.push(`(${++k}) at ${x.pct}% of the length: ${huecoEn(x, L)}${x.planta ? `, on the ${PISO_EN[x.planta]}` : ''};`); else P.push(`(gap) from ${x.pctDesde}% to ${x.pctHasta}%: ${porcheEn(x, F)};`); }
    P.push(`Everything else on this façade is plain solid wall.`);
  }
  if (f.retranqueos.length) P.push(`Set-backs: ${f.retranqueos.map((r) => `from ${pct(r.desde, f.largo)}% to ${pct(r.hasta, f.largo)}% the wall steps back ${n2(r.profundidad)} m`).join('; ')}.`);
  const doors = f.huecos.filter((h) => esPuerta(h.tipo)); const pd = f.elementos.filter((x) => x.clase === 'porche').flatMap((x) => x.muros.filter((m) => esPuerta(m.tipo)));
  P.push(doors.length ? `Doors on this façade: exactly ${doors.length} (${doors.map((h) => h.tipo === 'puerta_entrada' ? 'the entrance door' : h.tipo === 'porton' ? 'the garage door' : 'a secondary door').join(', ')})${pd.length ? `, plus ${pd.length} inside the porch` : ''}.` : `NO doors on this façade${pd.length ? ` (only ${pd.length} inside the porch, on its side wall)` : ''}.`);
  return P.join(' ');
}
function delanteEn(F, L, primerPlano) {
  const f = F.fachadas[L]; if (!f.delante.length) return '';
  const pos = { izquierda: 'on the LEFT part', derecha: 'on the RIGHT part', centro: 'in the CENTRE', todo: 'along the WHOLE length' };
  return `${primerPlano ? 'FOREGROUND (between the camera and the façade)' : `In front of the ${f.nombreEn}`}: ${f.delante.map((x) => x.tipo === 'piscina' ? `a rectangular swimming pool ${n2(x.ancho)} × ${n2(x.fondo)} m with flush pale stone coping, ${x.distancia > 0.05 ? n2(x.distancia) + ' m away from the wall' : 'right against the wall'}, ${pos[x.posicion]} (from ${x.pctDesde}% to ${x.pctHasta}% of the façade length)` : x.tipo === 'terraza' ? `a ${x.materialEn || 'paved'} terrace ${n2(x.fondo)} m deep ${pos[x.posicion]} (${x.pctDesde}%–${x.pctHasta}%)` : `${estEn(x.tipo)} ${n2(x.ancho)} × ${n2(x.fondo)} m ${pos[x.posicion]}`).join('; ')}.`;
}
function parcelaEn(F, L) {
  const p = F.fachadas[L].parcela; if (!p || p.distancia == null) return '';
  return `Beyond, ${n1(p.distancia)} m from this façade: the plot boundary${p.tipo === 'calle' ? ' on the STREET' : p.tipo === 'medianera' ? ' (party-wall boundary)' : ''}${p.cerramiento ? ` with ${p.cerramiento.en}` : ''}${p.puertas?.length ? `, with ${p.puertas.map((q) => q.en).join(' and ')}` : ''}${p.vecinos ? `; neighbouring houses beyond (${p.vecinos.plantasMax} storey${p.vecinos.plantasMax > 1 ? 's' : ''}, nearest about ${Math.round(p.vecinos.masCercano)} m away)` : ''}.`;
}
// Lo que se espera ver en la vista (para el prompt y la verificación automática)
export function esperadoVista(F, id, fachadas = null) {
  const v = typeof id === 'object' && id ? id : vistaDe(F, id, fachadas); if (!v) return null;
  const nP = F.dimensiones.plantas; const cub = F.cubierta.tipo === 'plana' ? 'plana' : 'inclinada';
  if (v.tipo === 'interior') { const e = F.plantas.flatMap((p) => p.estancias).find((x) => x.id === v.estancia); return { vista: v.id, tipo: 'interior', estancia: e?.nombre || '', huecos: e?.huecos ?? null, piscina: { visible: false } }; }
  const vis = v.tipo === 'aerea' ? LADOS : v.fachadas; const prin = v.principal ? [v.principal] : v.fachadas;
  const pu = (Ls) => Ls.reduce((a, L) => a + (F.fachadas[L]?.huecos || []).filter((h) => esPuerta(h.tipo)).length, 0);
  const porchePu = vis.reduce((a, L) => a + (F.fachadas[L]?.elementos || []).filter((x) => x.clase === 'porche').reduce((b, x) => b + x.muros.filter((m) => esPuerta(m.tipo)).length, 0), 0);
  const pisc = (F.piscina || []).filter((p) => p.lado); const pv = v.tipo === 'aerea' || v.tipo === 'cenital' ? pisc.length > 0 : pisc.some((p) => p.lados.some((l) => vis.includes(l)));
  let posicion = 'ninguna'; if (pv && (v.tipo === 'exterior' || v.tipo === 'aerea')) { const p = pisc.find((q) => vis.includes(q.lado)) || pisc.find((q) => q.lados.some((l) => vis.includes(l))); if (p) posicion = v.principal === p.lado || v.fachadas.length === 1 ? p.posicion : v.fachadas.length === 2 ? (p.lado === v.fachadas[0] ? 'izquierda' : p.lado === v.fachadas[1] ? 'derecha' : 'centro') : p.posicion; }
  return {
    vista: v.id, tipo: v.tipo, fachadas: v.fachadas, plantas: nP, cubierta: cub,
    puertas: v.tipo === 'cenital' ? { min: 0, max: 0 } : v.tipo === 'aerea' ? { min: 0, max: pu(LADOS) + porchePu } : { min: Math.min(pu(prin), pu(vis)), max: pu(vis) + porchePu },
    entrada: v.entradaVisible ? (F.entrada?.enPorche ? 'parcial' : 'visible') : 'no',
    piscina: { visible: pv, posicion, primerPlano: !!v.piscinaPrimerPlano },
    porche: vis.some((L) => F.fachadas[L].cuenta.porches > 0),
  };
}

// Bloque en inglés de la vista. o.modo: 'captura' (la imagen de entrada ES la captura 3D de esta vista: conservarla),
// 'referencia' (captura 3D adjunta como guía), 'texto' (sin imagen: describir todo).
export function promptVista(F, id, o = {}) {
  const v = typeof id === 'object' && id ? id : vistaDe(F, id, o.fachadas); if (!v) return { texto: '', vista: null };
  const P = []; const esp = esperadoVista(F, v);
  if (v.tipo === 'interior') {
    const e = F.plantas.flatMap((p) => p.estancias.map((x) => ({ ...x, pi: p.indice }))).find((x) => x.id === v.estancia);
    if (!e) return { texto: '', vista: v, esperado: esp };
    const hs = LADOS.flatMap((L) => [...F.fachadas[L].huecos, ...F.fachadas[L].ocultos].filter((h) => h.estanciaId === e.id && h.planta === e.pi).map((h) => ({ ...h, L })));
    P.push(`VIEW: interior of the ${estEn(e.tipo)} (${n1(e.util)} m², about ${n2(e.w)} × ${n2(e.h)} m${e.pi ? `, on the ${PISO_EN[e.pi]}` : ''}), eye level 1.5 m.`);
    P.push(hs.length ? `Its exterior openings, exactly ${hs.length}: ${hs.map((h) => `${huecoEn(h, h.L, { interior: true })} in the ${LADO_EN[h.L]} wall, looking out to ${F.fachadas[h.L].delante.length ? F.fachadas[h.L].delante.map((x) => x.tipo === 'piscina' ? 'the swimming pool' : x.tipo === 'terraza' ? `the ${x.materialEn || 'paved'} terrace` : estEn(x.tipo)).join(' and ') : h.daA ? 'the ' + estEn(h.daA.tipo) : F.fachadas[h.L].rol === 'llegada' ? 'the front garden and the street side' : 'the garden'}`).join('; ')}. No other windows or exterior doors in this room.` : 'This room has no exterior windows (inner room): light from the adjoining spaces only.');
    P.push('Do not add columns, beams, stairs, fireplaces, extra windows or doors.');
    return { texto: P.join(' '), vista: v, esperado: esp };
  }
  const acc = F.llegada.lado; const modo = o.modo || 'referencia';
  if (v.tipo === 'cenital') {
    P.push(`VIEW: straight top-down aerial view of the whole house and plot. Roof: ${F.cubierta.en}. The arrival/street side is the ${LADO_EN[acc]} side.`);
  } else if (v.tipo === 'aerea') {
    const [a, b] = v.fachadas;
    P.push(`VIEW: high oblique drone view at about 45°, from the ${v.esquina || ''} corner: the ${F.fachadas[a].nombreEn} is on the LEFT and the ${F.fachadas[b].nombreEn} on the RIGHT; the whole roof is visible (${F.cubierta.en}).`);
    for (const L of [a, b]) P.push(fachadaEn(F, L, L === a ? 'LEFT façade' : 'RIGHT façade'));
    const otros = (F.exteriores || []).filter((x) => !x.dentro && x.planta === 0 && !x.sinPosicion);
    if (otros.length) P.push(`On the plot, exactly: ${otros.map((x) => `${x.tipo === 'piscina' ? 'one rectangular swimming pool' : x.tipo === 'terraza' ? `a ${x.materialEn || 'paved'} terrace` : estEn(x.tipo)} ${n2(x.w)} × ${n2(x.h)} m on the ${x.lados.map((l) => LADO_EN[l]).join('-')} side of the house (${x.lados.map((l) => F.fachadas[l].nombreEn).join(' / ')})`).join('; ')}.`);
  } else {
    const [a, b] = v.fachadas;
    if (v.fachadas.length === 1) P.push(`VIEW: frontal, almost elevation-like eye-level view (1.6 m) of the ${F.fachadas[a].nombreEn}, centred, verticals corrected. Only this façade is seen; the side walls are at most a thin sliver.`);
    else if (v.principal) { const sec = v.fachadas.find((x) => x !== v.principal); P.push(`VIEW: eye-level (1.6 m) three-quarter view mainly of the ${F.fachadas[v.principal].nombreEn}, seen slightly from the ${LADO_EN[sec]} side: the ${F.fachadas[sec].nombreEn} appears foreshortened on the ${sec === b ? 'RIGHT' : 'LEFT'} edge of the house.`); }
    else P.push(`VIEW: eye-level (1.6 m) corner view from the ${v.esquina}: the ${F.fachadas[a].nombreEn} on the LEFT, the ${F.fachadas[b].nombreEn} on the RIGHT, meeting at the corner nearest the camera.`);
    for (const L of v.fachadas) P.push(fachadaEn(F, L, v.fachadas.length === 1 ? 'FAÇADE SEEN' : L === v.principal ? 'MAIN FAÇADE' : L === a ? 'LEFT façade' : 'RIGHT façade'));
    // primer plano y lo que queda detrás
    const prin = v.principal || (v.fachadas.length === 1 ? a : null);
    for (const L of v.fachadas) { const t = delanteEn(F, L, L === prin); if (t) P.push(t); }
    if (prin) { const t = parcelaEn(F, prin); if (t) P.push(t); }
    const ocultos = (F.exteriores || []).filter((x) => !x.dentro && x.planta === 0 && !x.sinPosicion && !x.lados.some((l) => v.fachadas.includes(l)));
    if (ocultos.length) P.push(`HIDDEN in this view (they are behind the house, on the ${[...new Set(ocultos.flatMap((x) => x.lados))].map((l) => LADO_EN[l]).join('/')} side): ${ocultos.map((x) => (x.tipo === 'piscina' ? 'the swimming pool' : x.tipo === 'terraza' ? 'the terrace' : 'the ' + estEn(x.tipo))).join(', ')} — do NOT show them.`);
  }
  // entrada
  if (F.entrada && v.tipo !== 'cenital') {
    const E = F.entrada; const fe = F.fachadas[E.fachada];
    if (esp.entrada === 'visible') P.push(`ENTRANCE: the front door is visible, on the ${fe.nombreEn} at ${E.pct}% from its left end (${estEn(E.estanciaTipo)}); it is the only front door of the house.`);
    else if (esp.entrada === 'parcial') P.push(`ENTRANCE: the front door is inside the open porch, on its side wall; at most partly visible in the porch shadow.`);
    else P.push(`ENTRANCE: the front door is NOT visible in this view (it is on the ${fe.nombreEn}, ${E.recorridoEn}). Do NOT draw any entrance door on the façades seen here.`);
  }
  // piscina
  const pis = (F.piscina || []).filter((p) => !p.sinPosicion);
  if (!pis.length) P.push('There is NO swimming pool anywhere: do not add water features.');
  else if (!esp.piscina.visible) P.push('The swimming pool is NOT in this view: no water, no pool anywhere in the image.');
  else if (v.tipo === 'exterior') P.push(`The swimming pool appears exactly once, ${esp.piscina.primerPlano ? 'in the FOREGROUND, ' : ''}${{ izquierda: 'on the LEFT', derecha: 'on the RIGHT', centro: 'in the CENTRE', todo: 'across the whole width' }[esp.piscina.posicion] || ''} of the image, at the position given above.`);
  // prohibiciones
  const doors = esp.puertas;
  P.push(`STRICT: ${F.dimensiones.plantas === 1 ? 'ONE storey only' : `exactly ${F.dimensiones.plantas} storeys`}; ${F.cubierta.tipo === 'plana' ? 'flat roof only' : 'the roof exactly as described'}. ${v.tipo === 'exterior' ? `Visible exterior doors: ${doors.min === doors.max ? `exactly ${doors.min}` : `between ${doors.min} and ${doors.max}`}. ` : ''}Do not add doors, windows, pools, stairs, ramps, balconies, columns, chimneys, dormers or volumes that are not listed. Floor-to-ceiling glazing is glass wall, not a door.${modo === 'texto' ? ' No other buildings on the plot.' : ''}`);
  return { texto: P.join(' '), vista: v, esperado: esp };
}

// ---------- textos de respaldo (web y dossier, deterministas) ----------
export function textosRespaldo(F) {
  const d = F.dimensiones; const pl = d.plantas === 1 ? 'una sola planta' : `${d.plantas} plantas`;
  const forma = d.ancho / Math.max(d.fondo, 0.1) > 2.4 || d.fondo / Math.max(d.ancho, 0.1) > 2.4 ? 'una barra larga y baja' : 'un volumen compacto';
  const vol = F.masas.tramos.filter((t) => t.tipo !== 'vacio'); const porche = vol.find((t) => t.tipo === 'porche') && F.exteriores.find((x) => x.tipo === 'porche' && x.dentro);
  const fj = F.fachadas[F.jardin.lado], fl = F.fachadas[F.llegada.lado];
  const pis = (F.piscina || []).find((p) => !p.sinPosicion); const terr = fj.delante.find((x) => x.tipo === 'terraza');
  const titular = `${F.modelo.nombre}: ${forma} de ${pl} y ${Math.round(d.construida)} m²`;
  const casa = `${F.modelo.nombre} es ${forma} de ${pl}, ${es2(d.ancho)} × ${es2(d.fondo)} m de huella y ${es1(d.altura)} m de altura, con ${Math.round(d.construida)} m² construidos y ${Math.round(d.util)} m² útiles: ${d.dormitorios} dormitorios y ${d.banos} baños.${porche ? ` En el centro, el porche «${porche.nombre}» (${es2(porche.w)} × ${es2(porche.h)} m) separa ${vol.filter((t) => t.tipo === 'volumen').length} alas y une la llegada con el jardín.` : ''} Cubierta ${F.cubierta.es.toLowerCase()}; fachadas en ${F.acabados.fachada.n.toLowerCase()} y carpintería de ${F.acabados.carpinteria.n.toLowerCase()}.`;
  const llegada = `Se llega por el ${LADO_N[F.llegada.lado]}: ${fl.cuenta.huecos ? `una fachada serena con ${fl.cuenta.ventanas} ventana${fl.cuenta.ventanas === 1 ? '' : 's'}${fl.cuenta.porches ? ' y el porche abierto' : ''}` : 'una fachada ciega que protege la casa'}${F.entrada ? `; la puerta de entrada está ${F.entrada.fachada === F.llegada.lado ? 'en esta misma fachada' : `en la fachada ${LADO_N[F.entrada.fachada]} (${F.entrada.recorrido})`}` : ''}.`;
  const jardin = `Hacia el ${LADO_N[F.jardin.lado]} la casa se abre al jardín${fj.cuenta.huecos ? ` con ${fj.huecos.filter((h) => h.tipo === 'ventanal').length ? fj.huecos.filter((h) => h.tipo === 'ventanal').length + ' ventanal' + (fj.huecos.filter((h) => h.tipo === 'ventanal').length > 1 ? 'es' : '') + ' de suelo a techo y ' : ''}${fj.huecos.filter((h) => h.tipo === 'ventana').length} ventanas` : ''}${terr ? `, sobre una terraza ${terr.material || ''} de ${es2(terr.fondo)} m de fondo` : ''}${pis ? `${terr ? ' y' : ','} una piscina de ${es2(pis.w)} × ${es2(pis.h)} m${pis.lado !== F.jardin.lado ? ` en el lado ${LADO_N[pis.lado]}` : ''}` : ''}.${fj.sol ? ` Esta fachada recibe ${es2(fj.sol.invierno)} h de sol directo en invierno.` : ''}`;
  const orient = F.orientacion.supuesta ? '' : `Orientación: la fachada al jardín mira al ${fj.rumbo} y la de llegada al ${fl.rumbo}.`;
  const cifras = [`${Math.round(d.construida)} m² construidos`, `${Math.round(d.util)} m² útiles`, `${d.dormitorios} dormitorios`, `${d.banos} baños`, pl, `${es2(d.ancho)} × ${es2(d.fondo)} m`];
  const pies = {}; for (const v of vistasFicha(F)) { if (v.tipo === 'interior') { const e = F.plantas.flatMap((p) => p.estancias).find((x) => x.id === v.estancia); pies[v.id] = `${e.nombre}: ${es1(e.util)} m²${e.fachadas.length ? `, luz desde ${e.fachadas.map((l) => LADO_N[l]).join(' y ')}` : ''}.`; }
    else if (v.tipo === 'exterior') pies[v.id] = `${v.fachadas.map((l) => F.fachadas[l].nombre.split(' · ')[0]).join(' y ')}${v.piscinaVisible ? ', con la piscina' : ''}.`; else pies[v.id] = v.tipo === 'aerea' ? `La casa en su parcela${pis ? ', con la terraza y la piscina' : ''}.` : 'La cubierta desde arriba.'; }
  return { titular, entradilla: casa, casa, llegada, jardin, orientacion: orient, cifras, pies, fuente: 'ficha', huella: F.huella };
}

// ---------- verificación (determinista): veredicto del modelo de visión frente a lo esperado ----------
// esperado: esperadoVista(); r: respuesta con el esquema de server/externo.mjs · ESQUEMA_VERIFICACION.
// → { estado: 'ok' | 'revisar' | 'omitida', fallos: [{ k, texto }] }
export function evaluarVerificacion(esperado, r) {
  if (!esperado || esperado.tipo === 'interior') return { estado: 'omitida', fallos: [], motivo: 'Vista interior: sin comprobación automática' };
  if (!r || typeof r !== 'object') return { estado: 'revisar', fallos: [{ k: 'respuesta', texto: 'Sin respuesta de verificación' }] };
  const f = []; const add = (k, texto) => f.push({ k, texto });
  if (Number.isInteger(r.plantas) && r.plantas > 0 && esperado.plantas && r.plantas !== esperado.plantas) add('plantas', `Se ven ${r.plantas} plantas y la casa tiene ${esperado.plantas}.`);
  if (esperado.cubierta && r.cubierta && r.cubierta !== 'no_se_ve' && r.cubierta !== esperado.cubierta) add('cubierta', `Cubierta ${r.cubierta} y la casa la tiene ${esperado.cubierta}.`);
  const P = esperado.puertas; const n = Number(r.puertas_exteriores);
  if (P && Number.isFinite(n) && esperado.tipo === 'exterior') { if (n > P.max) add('puertas', `Se ven ${n} puertas exteriores y en esta vista hay como mucho ${P.max}.`); else if (n < P.min) add('puertas', `Se ven ${n} puertas exteriores y en esta vista hay al menos ${P.min}.`); }
  if (esperado.entrada === 'no' && r.puerta_entrada_visible === true && (!P || P.max === 0 || n > P.max)) add('entrada', 'Aparece una puerta de entrada en una fachada que no la tiene.');
  const E = esperado.piscina || {};
  if (typeof r.piscina_visible === 'boolean' && typeof E.visible === 'boolean' && r.piscina_visible !== E.visible) add('piscina', E.visible ? 'Falta la piscina, que en esta vista debe verse.' : 'Aparece una piscina y en esta vista no debe verse.');
  else if (E.visible && r.piscina_visible && ['izquierda', 'derecha'].includes(E.posicion) && ['izquierda', 'derecha'].includes(r.piscina_posicion) && r.piscina_posicion !== E.posicion) add('piscina_lado', `La piscina está a la ${r.piscina_posicion} y debe estar a la ${E.posicion}.`);
  const an = (Array.isArray(r.anadidos) ? r.anadidos : []).map((x) => String(x).trim()).filter(Boolean);
  if (an.length) add('anadidos', `Elementos que no existen: ${an.slice(0, 6).join(', ')}.`);
  if (r.fachadas_coinciden === false && esperado.tipo === 'exterior') add('fachadas', 'Los huecos de las fachadas no coinciden con la ficha.');
  return { estado: f.length ? 'revisar' : 'ok', fallos: f };
}
