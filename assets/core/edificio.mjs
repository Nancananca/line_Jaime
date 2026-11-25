// v.1.5 · Edificios plurifamiliares pequeños (hasta baja + 5). Módulo puro (navegador y servidor), sin dependencias
// de geometria.mjs para que geometria, reglas, planos y la interfaz lo puedan usar sin ciclos.
//
// Convenio de datos: `estancia.vivienda` = etiqueta corta ('A', 'B', '1A', '2B'…). Si alguna estancia del modelo la
// tiene, el modelo es un EDIFICIO: las estancias sin vivienda son zonas comunes (portal = recibidor, escalera común,
// rellano = distribuidor o pasillo, ascensor, instalaciones, trasteros, garaje común…). Un modelo sin ninguna
// vivienda se comporta exactamente como siempre (una sola vivienda).
import { TIPOS, esInt, grupo, esDorm } from './catalogo.mjs';
import { T } from './trama.mjs';
import { memoPlanta } from './memo.mjs';

// Medidas recomendadas (las usa la documentación, el editor y las reglas). Metros a ejes sobre la trama de 0,75.
export const EDIFICIO = {
  escaleraComun: { w: 3.0, h: 4.5 },   // dos tramos en U de 1,30 m con meseta (dibujo y 3D «doble» desde 2,90 de ancho)
  escaleraMin: { w: 1.5, h: 4.5 },     // tramo recto (solo vivienda unifamiliar o dúplex)
  ascensor: { w: 1.5, h: 2.25 },       // hueco recomendado (cabina accesible 1,10 × 1,40); mínimo 1,50 × 1,50
  ascensorMin: { w: 1.5, h: 1.5 },
  rellano: 1.5,                        // lado mínimo de rellano y paso común (círculo de 1,50 delante de puertas)
  crujia: [4.5, 6.0],                  // crujías habituales de vivienda (luz modular orientativa ≤ 6,00)
  plantasSinAscensor: 2,               // CTE DB-SUA 9: ascensor accesible si hay que salvar más de dos plantas
  viviendasSinAscensor: 12,            // … o más de 12 viviendas por encima de la planta de acceso
  utilMin: [25, 35, 50, 65, 80],       // m² útiles mínimos razonables por nº de dormitorios (0 = estudio … 4+)
};

// Etiqueta saneada: mayúsculas, sin espacios, 1–8 caracteres [A-Z 0-9 . -]; '' = zona común / sin vivienda.
export function normViv(v) {
  if (v == null || v === false) return '';
  const s = String(v).trim().toUpperCase().replace(/\s+/g, '').slice(0, 8);
  return /^[A-Z0-9][A-Z0-9.\-]*$/.test(s) ? s : '';
}
export const unidad = (e) => (e && e.vivienda) || '';
export const esEdificio = (m) => !!m?.plantas?.some((p) => (p.estancias || []).some((e) => e && e.vivienda));
const orden = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true });
// Viviendas del modelo (etiquetas ordenadas).
export function viviendas(m) {
  const s = new Set(); for (const p of m?.plantas || []) for (const e of p.estancias || []) if (e?.vivienda) s.add(e.vivienda);
  return [...s].sort(orden);
}
// Siguiente etiqueta libre: con plantas numeradas ('1A') sigue el patrón de la planta pi; si no, la siguiente letra.
export function siguienteVivienda(m, pi = null) {
  const usadas = new Set(viviendas(m));
  const numeradas = [...usadas].some((v) => /^\d/.test(v));
  if (numeradas && pi != null) { for (let c = 65; c < 91; c++) { const v = String(pi) + String.fromCharCode(c); if (!usadas.has(v)) return v; } }
  for (let c = 65; c < 91; c++) { const v = String.fromCharCode(c); if (!usadas.has(v)) return v; }
  for (let n = 1; n < 999; n++) if (!usadas.has('V' + n)) return 'V' + n;
  return 'X';
}
// Plantas (índices) en las que la vivienda v tiene estancias.
export function plantasVivienda(m, v) { return (m?.plantas || []).map((p, pi) => ((p.estancias || []).some((e) => e.vivienda === v) ? pi : -1)).filter((pi) => pi >= 0); }
// Zona común de paso a la que puede abrir una puerta de vivienda (portal, rellano, pasillo común, escalera común).
export const circComun = (e) => !!e && !e.vivienda && esInt(e.tipo) && grupo(e.tipo) === 'circ' && e.tipo !== 'ascensor' && e.tipo !== 'doble_altura';
const interiorUtil = (e) => !!e && esInt(e.tipo) && !TIPOS[e.tipo].vacio && e.tipo !== 'ascensor';

function celdas(p) {
  const m = new Map();
  for (const e of p?.estancias || []) {
    const i0 = Math.round(e.x / T), j0 = Math.round(e.y / T), ni = Math.min(Math.round(e.w / T), 400), nj = Math.min(Math.round(e.h / T), 400);
    if (![i0, j0, ni, nj].every(Number.isFinite)) continue;
    for (let i = i0; i < i0 + ni; i++) for (let j = j0; j < j0 + nj; j++) { const k = i + ',' + j; if (!m.has(k)) m.set(k, e); }
  }
  return m;
}
// Longitud (en módulos de 0,375) de contacto entre la vivienda v y la circulación común en la planta pi.
// Rendimiento: se recuerda por planta y vivienda (core/memo.mjs); plantasAcceso() lo pide por cada estancia y planta.
export function contactoComun(m, v, pi) {
  const p = m?.plantas?.[pi]; if (!p) return 0;
  return memoPlanta(p, 'contacto:' + typeof v + ':' + String(v), () => _contactoComun(p, v));
}
function _contactoComun(p, v) {
  const C = celdas(p); let n = 0;
  for (const [k, e] of C) {
    if (e.vivienda !== v || !interiorUtil(e)) continue; const [i, j] = k.split(',').map(Number);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (circComun(C.get(i + di + ',' + (j + dj)))) n++;
  }
  return n;
}
// Plantas en las que la vivienda v tiene puerta de vivienda (desde zona común). Por defecto: en cada planta en la que
// linda con un rellano; un dúplex (vivienda con escalera propia) solo en la más baja, salvo que alguna de sus estancias
// lleve `entrada: true` (entonces, en las plantas de esas estancias).
export function plantasAcceso(m, v) {
  const ps = plantasVivienda(m, v); const adj = ps.filter((pi) => contactoComun(m, v, pi) >= 2);
  const marcadas = adj.filter((pi) => m.plantas[pi].estancias.some((e) => e.vivienda === v && e.entrada));
  if (marcadas.length) return marcadas;
  const duplex = ps.some((pi) => m.plantas[pi].estancias.some((e) => e.vivienda === v && e.tipo === 'escalera'));
  if (!duplex) return adj;
  return adj.length ? [Math.min(...adj)] : [];
}
// Resumen por vivienda sin superficies (las superficies las da superficies() de geometria.mjs → S.viviendas).
export function resumenViviendas(m) {
  return viviendas(m).map((v) => {
    const est = m.plantas.flatMap((p, pi) => p.estancias.filter((e) => e.vivienda === v).map((e) => ({ e, pi })));
    const n = (f) => est.filter(({ e }) => f(e)).length;
    return { id: v, plantas: plantasVivienda(m, v), acceso: plantasAcceso(m, v), estancias: est.length, dormitorios: n((e) => esDorm(e.tipo)), banos: n((e) => e.tipo === 'bano'), aseos: n((e) => e.tipo === 'aseo'), duplex: plantasVivienda(m, v).length > 1 };
  });
}
// Tinte suave por vivienda (planos y editor): paleta fija y legible sobre los colores de estancia.
const TINTES = ['#5b8def', '#e0794c', '#3fa37a', '#b05fc9', '#d1a72b', '#3aa3b8', '#c8506f', '#7a8a2e'];
export function tinteVivienda(m, v) { const i = viviendas(m).indexOf(v); return i < 0 ? null : TINTES[i % TINTES.length]; }
