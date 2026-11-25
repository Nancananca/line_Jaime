// Visor 3D de la propuesta: construye la casa desde el modelo (misma geometría que los planos), con mobiliario,
// materiales procedurales, cubiertas y entorno; la sitúa en su parcela con el sol real (cielo físico, sombras,
// oclusión ambiental) y saca capturas de referencia para los renders. Lo usan el generador y el site del cliente.
//
// API pública (compatible con la anterior):
//   new Visor(el, { maqueta, alpha, sinBucle, pixelRatio, mundo, calidadAdaptativa })
//                                            · maqueta = true → maqueta de cartón blanco (sin texturas)
//                                            · alpha = true → fondo transparente real (sin cielo ni fondo; el entorno se
//                                              oculta con ctx.sinEntorno o v.sitio.visible = false)
//                                            · sinBucle = true → sin bucle de render propio: nada se pinta hasta renderAhora()
//                                              (el montaje, si se lanza, se anima con su propio bucle mientras dura)
//                                            · pixelRatio: fijo (desactiva la calidad adaptativa); por defecto min(2, dpr)
//                                            · mundo: 'paisaje' (por defecto) | 'estudio' (fondo neutro, sin parcela)
//                                            · calidadAdaptativa (true): baja la resolución si el giro baja de ~40 fps
//   listo                                    · promesa: resuelve cuando el posproceso (oclusión, SMAA) está cargado
//   renderAhora({ calidad = true } = {})     · pinta YA un fotograma (con oclusión si calidad) y devuelve el canvas
//   vistaActual (getter)                     · { nombre, modo, nivel, corte, estancia, camara: { posicion, objetivo, fov } }
//   setMundo('paisaje' | 'estudio')          · paisaje = parcela, cielo y contexto; estudio = ciclorama neutro
//   setModelo(modelo, ctx)                   · ctx: { parcela, casa, lat, lon, ortoUrl, sinArboles, pergola, sinEntorno }
//   setSol(mes, hora)                        · mes 0-11, hora solar local; devuelve { azimut, elevacion }
//   vista(nombre, animar = true | opciones)  · aerea | acceso | jardin | cenital | planta | salon | cocina | dormitorio | estancia
//                                              opciones: { animar, nivel, id, corte }
//   verPlanta(nivel, { corte, animar, camara }) · corte de la planta «nivel» (oculta lo de encima, muros cortados a 1,60)
//   verExterior(animar)                      · vuelve a la casa completa (vista aérea)
//   verEstancia(id, animar)                  · cámara interior en cualquier estancia (por id del modelo)
//   niveles() → nº de plantas · nombresNiveles() → ['Planta baja', …] · estancias(nivel?) → [{ id, tipo, nombre, nivel }]
//   techo(ver, nivel)                        · compatibilidad: techo(false, n) = verPlanta(n) sin mover la cámara
//   captura(w, h, tipo) → dataURL renderizado con la misma cadena (oclusión + antialias) a ese tamaño
//   montaje({ duracion = 18, alTerminar, alFase })
//                                            · anima el montaje CUEVA planta a planta: cimentación → por cada planta, forjado,
//                                              estructura y cerramiento (paneles de 1,50 m, carpinterías exteriores) y módulos
//                                              de interior (suelos, tabiques, baños y cocina como módulos, escalera, puertas,
//                                              mobiliario) → cubierta en piezas (paneles, faldones, petos y albardillas por
//                                              tramos) → exteriores (barandillas, celosías, pérgolas, piscina, cerramientos de
//                                              parcela y jardín). Cada pieza baja de grúa con un ligero rebote.
//                                              alFase(k, info): k = 0 cimentación · 1 forjado de planta baja · 2 plantas
//                                              (muros, interiores, forjados altos) · 3 cubierta · 4 exteriores (compatible con
//                                              las cinco fases de la web); info = { i, n, nombre, planta, k }.
//   detenerMontaje()                         · corta la animación y deja la casa terminada · montando → bool
//   escena() · alFotograma(fn) · sueloEn(x, z, desde)
//                                            · invitados en la escena (Hilván 3D): escena, cámara, puntos de interés
//                                              (puerta, piscina, porche, terraza, cubierta) y gancho por fotograma
//   dispose()
//
// Modelo v.1 (docs/CONTRATO_v1.md): cubierta { tipo plana|una|dos|tres|cuatro, alero, material, color, pendiente,
// cumbrera }, fachadas nuevas (hormigón blanco/gris, chapa), jardin (paisajismo), estancias doble_altura, piscina,
// chillout, quincho, fogonero, e.celosia, e.pergola, e.sube, e.mobiliario (vía core/mobiliario.mjs).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { T, H_PLANTA, E_FACHADA, E_TABIQUE, E_FORJADO } from '../core/trama.mjs';
import * as CAT from '../core/catalogo.mjs';
import { derivar, bbox, rectangulos, cubierta, celdasPlanta, esMedianera, caidaCubierta } from '../core/geometria.mjs';
import { esSanitario, cotaPB, muretes as muretesSanitario, accesosExteriores } from '../core/cimentacion.mjs'; // v.1.6: forjado sanitario y accesos exteriores
import { LIGERO, PR_LIGERO, glAlta } from './ligero.js'; // móviles y poca memoria: menos resolución, sin posproceso, contextos WebGL limitados
import { sol } from '../core/parcela.mjs';
import { MATERIALES, CARPINTERIAS } from '../core/prompts.mjs';
import { resolverCerramientos, tramosCerramiento, geometriaLado, enLado, ladoCerramiento, puntosAcceso, CERRAMIENTOS as CERR } from '../core/cerramientos.mjs';
import { mobiliario, barridoPuerta, llegadaEscalera, CATALOGO_MUEBLES } from '../core/mobiliario.mjs';
import { derivarSotano, patiosIngleses, modeloConSotano, dentroPoligono, SOTANO } from '../core/sotano.mjs'; // v.1.6: planta sótano y rampa
const CAT_MUEBLE = new Map((CATALOGO_MUEBLES || []).map((m) => [m.rol, m.cat])); // rol → categoría (bano, cocina…) para los módulos del montaje
// v.1.3: celosías, barandillas de borde y pérgolas por paños continuos (misma fuente que planos, editor y presupuesto)
import { contextoBordes, bordesPlanta, pergolasPlanta, tienePergola, LAMAS, PERGOLA, ALTO_PETO, E_ALBARDILLA } from '../core/bordes.mjs';
// Barandilla del borde de un hueco (escalera o doble altura) en el segmento s.
// e.barandilla: sin definir = automática (todo el borde salvo el desembarco de la escalera); [lados] = solo esos lados; [] = ninguna.
function tramosBaranda(e, s, lleg) {
  const hor = s.o === 'h'; const lado = hor ? (Math.abs(s.y1 - e.y) < 1e-3 ? 'N' : 'S') : (Math.abs(s.x1 - e.x) < 1e-3 ? 'O' : 'E');
  if (Array.isArray(e.barandilla)) return e.barandilla.includes(lado) ? [s] : [];
  if (!lleg || lleg.lado !== lado) return [s];
  if (!lleg.tramo) return []; // escalera recta: el lado de llegada queda libre
  const a0 = hor ? s.x1 : s.y1, a1 = a0 + s.len, b0 = (hor ? e.x : e.y) + lleg.tramo[0], b1 = (hor ? e.x : e.y) + lleg.tramo[1];
  const sub = (u0, u1) => (u1 - u0 > 0.05 ? [hor ? { ...s, x1: u0, x2: u1, len: u1 - u0 } : { ...s, y1: u0, y2: u1, len: u1 - u0 }] : []);
  return [...sub(a0, Math.min(a1, b0)), ...sub(Math.max(a0, b1), a1)];
}

const { TIPOS, esInt } = CAT;
const CUB_MAT = CAT.CUBIERTA_MATERIALES || { grava: { pend: 0, colores: { gris: '#9a978e' } }, teja: { pend: 30, colores: { roja: '#a5482d' } }, chapa: { pend: 15, colores: { grafito: '#3a3d40' } } };
const CEL_MAT = CAT.CELOSIA_MATERIALES || { madera: { color: '#a67c52' }, aluminio: { color: '#8d8f8c' }, hormigon: { color: '#cfcbc2' } };
const rad = (d) => (d * Math.PI) / 180;
const ZOC = 0.12;                      // la planta baja arranca 12 cm sobre el terreno
const CORTE = 1.6;                     // plano de corte de la vista en planta, sobre el suelo de cada planta
const H_TAB = H_PLANTA - E_FORJADO;    // altura libre bajo forjado
const NOMBRES = ['Planta baja', 'Planta primera', 'Planta segunda', 'Planta tercera', 'Planta cuarta', 'Planta quinta', 'Planta sexta'];
const K = (i, j) => i + ',' + j;
const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const OPUESTO = { N: 'S', S: 'N', E: 'O', O: 'E' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tipoCub = (m) => { const t = m?.cubierta?.tipo; return t === 'dos aguas' ? 'dos' : ['una', 'dos', 'tres', 'cuatro'].includes(t) ? t : 'plana'; };
const PANEL = 1.5;                     // ancho de panel CUEVA para el montaje
const horizL = (l) => l === 'N' || l === 'S';
// Descomposición en rectángulos de mayor área primero (para cubiertas inclinadas: el cuerpo principal manda y las alas
// se le adosan; la voraz por filas de geometria.rectangulos() parte una L en tiras paralelas).
function rectangulosMax(keys) {
  const S = new Set(keys); const out = [];
  while (S.size) {
    let i0 = Infinity, j0 = Infinity, i1 = -Infinity, j1 = -Infinity;
    for (const k of S) { const [i, j] = k.split(',').map(Number); i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i); j1 = Math.max(j1, j); }
    const W = i1 - i0 + 1, alt = new Int32Array(W); let best = null;
    for (let j = j0; j <= j1; j++) {
      for (let i = 0; i < W; i++) alt[i] = S.has(K(i0 + i, j)) ? alt[i] + 1 : 0;
      const pila = []; // rectángulo máximo bajo el histograma
      for (let i = 0; i <= W; i++) {
        const h = i < W ? alt[i] : 0; let ini = i;
        while (pila.length && pila[pila.length - 1][1] >= h) { const [p, ph] = pila.pop(); const a = ph * (i - p); if (ph && (!best || a > best.a)) best = { a, i: i0 + p, j: j - ph + 1, w: i - p, h: ph }; ini = p; }
        pila.push([ini, h]);
      }
    }
    if (!best) break;
    for (let a = 0; a < best.w; a++) for (let c = 0; c < best.h; c++) S.delete(K(best.i + a, best.j + c));
    out.push({ x: best.i * T, y: best.j * T, w: best.w * T, h: best.h * T });
  }
  return out;
}
// ---------------------------------------------------------------------------------------------------------
// Azar determinista, ruido y texturas procedurales (CanvasTexture). Las UV del visor están en metros: cada
// textura declara cuántos metros cubre y se repite con repeat = 1/metros.
// ---------------------------------------------------------------------------------------------------------
function azar(semilla) { let s = semilla >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const sem = (R) => (R() * 2147483647) | 0;
// Ruido de valor fractal y periódico (se repite sin costuras). cx, cy: celdas de la primera octava en x / y.
function ruido(n, cx, cy, oct, semilla) {
  const out = new Float32Array(n * n); const R = azar(semilla); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const gx = cx << o, gy = cy << o; const g = new Float32Array(gx * gy); for (let i = 0; i < g.length; i++) g[i] = R();
    for (let y = 0; y < n; y++) {
      const fy = (y * gy) / n, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty), r0 = y0 * gx, r1 = ((y0 + 1) % gy) * gx;
      for (let x = 0; x < n; x++) {
        const fx = (x * gx) / n, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % gx;
        const a = g[r0 + x0], b = g[r0 + x1], c = g[r1 + x0], d = g[r1 + x1];
        out[y * n + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
      }
    }
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
const hsl = (h, s, l, a = 1) => `hsla(${h.toFixed(1)},${s.toFixed(1)}%,${l.toFixed(1)}%,${a})`;
function modular(g, n, N, amp) {
  const d = g.getImageData(0, 0, n, n), p = d.data;
  for (let j = 0, i = 0; j < N.length; j++, i += 4) { const f = 1 + (N[j] - 0.5) * amp; p[i] = Math.min(255, p[i] * f); p[i + 1] = Math.min(255, p[i + 1] * f); p[i + 2] = Math.min(255, p[i + 2] * f); }
  g.putImageData(d, 0, 0);
}
function gris(g, n, N, lo, hi) {
  const d = g.createImageData(n, n), p = d.data;
  for (let j = 0, i = 0; j < N.length; j++, i += 4) { const v = lo + (hi - lo) * N[j]; p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255; }
  g.putImageData(d, 0, 0);
}
// Dibuja una pieza pequeña y sus copias junto a los bordes para que la textura se repita sin cortes.
function envolver(n, x, y, m, fn) { const xs = [0], ys = [0]; if (x < m) xs.push(n); if (x > n - m) xs.push(-n); if (y < m) ys.push(n); if (y > n - m) ys.push(-n); for (const dx of xs) for (const dy of ys) fn(x + dx, y + dy); }

const TEX = new Map();
function textura(clave, metros, n, pintar) {
  if (TEX.has(clave)) return TEX.get(clave);
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
  const c = mk(), b = mk(); const g = c.getContext('2d', { willReadFrequently: true }), gb = b.getContext('2d', { willReadFrequently: true });
  gb.fillStyle = '#808080'; gb.fillRect(0, 0, n, n);
  const R = azar(hash(clave)); const conBump = pintar(g, gb, n, n / metros, R) !== false;
  const tx = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / metros, 1 / metros); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; };
  const r = { map: tx(c, true), bump: conBump ? tx(b, false) : null };
  TEX.set(clave, r); return r;
}

// Tarima de roble: lamas de 20 cm, largos variables, vetas y algún nudo.
const texRoble = () => textura('roble', 3.2, 1024, (g, gb, n, k, R) => {
  const filas = 16, fh = n / filas;
  for (let f = 0; f < filas; f++) {
    const y = f * fh; let x = R() * n; const xf = x + n;
    while (x < xf - 1) {
      const end = Math.min(x + (1.0 + R() * 1.2) * k, xf); const sp = sem(R);
      for (const dx of [0, -n]) {
        const r = azar(sp); const h = 29 + r() * 7, s = 30 + r() * 14, l = 54 + r() * 12;
        g.fillStyle = hsl(h, s, l); g.fillRect(x + dx, y, end - x, fh);
        for (let v = 0; v < 22; v++) {
          const vy = y + 2 + r() * (fh - 4), amp = r() * 2.5, fr = 0.003 + r() * 0.012, ph = r() * 6;
          g.strokeStyle = hsl(h - 3, s + 8, l - 12 - r() * 14, 0.07 + r() * 0.13); g.lineWidth = 0.5 + r() * 1.6; g.beginPath(); g.moveTo(x + dx, vy);
          for (let t = x; t <= end + 12; t += 12) g.lineTo(t + dx, vy + Math.sin(t * fr + ph) * amp);
          g.stroke();
        }
        if (r() < 0.25) { const kx = x + r() * (end - x), ky = y + fh * (0.3 + r() * 0.4); g.fillStyle = hsl(h - 4, s + 10, l - 26, 0.5); g.beginPath(); g.ellipse(kx + dx, ky, 3 + r() * 5, 2 + r() * 3, 0, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(45,28,16,.6)'; g.fillRect(end + dx - 1, y, 1.5, fh);
        gb.fillStyle = '#1a1a1a'; gb.fillRect(end + dx - 1.5, y, 2.5, fh);
      }
      x = end;
    }
    g.fillStyle = 'rgba(45,28,16,.55)'; g.fillRect(0, y, n, 1.5); gb.fillStyle = '#1a1a1a'; gb.fillRect(0, y, n, 2.5);
  }
  modular(g, n, ruido(n, 3, 48, 4, sem(R)), 0.18);
});
// Tarima exterior (madera tratada, algo agrisada).
const texTarima = () => textura('tarima', 2.4, 512, (g, gb, n, k, R) => {
  const filas = 16, fh = n / filas;
  for (let f = 0; f < filas; f++) {
    const y = f * fh, cut = R() * n; const h = 26 + R() * 8, s = 18 + R() * 12, l = 44 + R() * 13;
    g.fillStyle = hsl(h, s, l); g.fillRect(0, y, n, fh);
    for (let v = 0; v < 10; v++) { g.fillStyle = hsl(h, s + 5, l - 10 - R() * 10, 0.12 + R() * 0.15); g.fillRect(0, y + 2 + R() * (fh - 4), n, 0.6 + R() * 1.2); }
    g.fillStyle = 'rgba(25,18,12,.85)'; g.fillRect(0, y, n, 2); g.fillRect(cut, y, 1.5, fh);
    gb.fillStyle = '#000'; gb.fillRect(0, y, n, 2.5); gb.fillRect(cut, y, 2, fh);
  }
  modular(g, n, ruido(n, 4, 32, 4, sem(R)), 0.22);
});
// Revoco mineral fino.
const texEstuco = (color) => textura('estuco' + color, 2, 512, (g, gb, n, k, R) => {
  g.fillStyle = color; g.fillRect(0, 0, n, n); modular(g, n, ruido(n, 5, 5, 5, sem(R)), 0.06);
  for (let i = 0; i < 9000; i++) { g.fillStyle = R() < 0.5 ? `rgba(0,0,0,${(0.02 + R() * 0.05).toFixed(3)})` : `rgba(255,255,255,${(0.05 + R() * 0.08).toFixed(3)})`; g.fillRect(R() * n, R() * n, 1 + R(), 1 + R()); }
  gris(gb, n, ruido(n, 64, 64, 2, sem(R)), 95, 165);
});
// Hormigón visto con encofrado de tablilla horizontal y berenjenos.
const texHormigon = () => textura('hormigon', 2.4, 1024, (g, gb, n, k, R) => {
  g.fillStyle = MATERIALES.hormigon.color; g.fillRect(0, 0, n, n);
  const filas = 16, fh = n / filas;
  for (let f = 0; f < filas; f++) {
    const y = f * fh; g.fillStyle = R() < 0.5 ? `rgba(255,255,255,${(R() * 0.07).toFixed(3)})` : `rgba(0,0,0,${(R() * 0.06).toFixed(3)})`; g.fillRect(0, y, n, fh);
    for (let v = 0; v < 14; v++) { g.fillStyle = `rgba(70,62,50,${(0.03 + R() * 0.05).toFixed(3)})`; g.fillRect(0, y + R() * fh, n, 0.8 + R() * 1.5); }
    g.fillStyle = 'rgba(40,36,30,.22)'; g.fillRect(0, y, n, 1.2); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, y + 1.2, n, 1);
    gb.fillStyle = '#404040'; gb.fillRect(0, y, n, 2);
  }
  modular(g, n, ruido(n, 4, 40, 4, sem(R)), 0.12); modular(g, n, ruido(n, 8, 8, 4, sem(R)), 0.08);
  const sx = n / 4, sy = fh * 4;
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
    const x = sx * (a + 0.5), y = sy * b + fh * 2;
    g.fillStyle = 'rgba(60,56,50,.55)'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 9, 0, 7); g.stroke();
    gb.fillStyle = '#101010'; gb.beginPath(); gb.arc(x, y, 6, 0, 7); gb.fill();
  }
});
// Lamas verticales de madera con junta abierta.
const texLamas = () => textura('lamas', 2.4, 1024, (g, gb, n, k, R) => {
  const nb = 16, bw = n / nb;
  for (let b = 0; b < nb; b++) {
    const x = b * bw; const h = 27 + R() * 7, s = 34 + R() * 12, l = 46 + R() * 12;
    g.fillStyle = hsl(h, s, l); g.fillRect(x, 0, bw, n);
    for (let v = 0; v < 16; v++) { g.fillStyle = hsl(h - 3, s + 6, l - 12 - R() * 12, 0.1 + R() * 0.15); g.fillRect(x + 3 + R() * (bw - 6), 0, 0.6 + R() * 1.4, n); }
    if (R() < 0.4) { const y = R() * n; g.fillStyle = 'rgba(30,20,12,.6)'; g.fillRect(x, y, bw, 1.5); gb.fillStyle = '#202020'; gb.fillRect(x, y, bw, 2); }
    g.fillStyle = 'rgba(18,12,8,.88)'; g.fillRect(x, 0, 5, n); gb.fillStyle = '#000'; gb.fillRect(x, 0, 6, n);
  }
  modular(g, n, ruido(n, 48, 3, 4, sem(R)), 0.22);
});
// Cobre de junta alzada con pátina parda y algún verdete.
const texCobre = () => textura('cobre', 3.2, 1024, (g, gb, n, k, R) => {
  const A = ruido(n, 4, 4, 5, sem(R)), B = ruido(n, 6, 6, 4, sem(R)), S = ruido(n, 80, 3, 3, sem(R));
  const d = g.createImageData(n, n), p = d.data;
  for (let j = 0, i = 0; j < A.length; j++, i += 4) {
    const a = suave(0.3, 0.7, A[j]); let r = 146 - 56 * a, gg = 94 - 36 * a, bb = 62 - 20 * a; const v = Math.max(0, B[j] - 0.62) * 2.2;
    r += (104 - r) * v; gg += (126 - gg) * v; bb += (102 - bb) * v; const st = 0.88 + 0.24 * S[j];
    p[i] = r * st; p[i + 1] = gg * st; p[i + 2] = bb * st; p[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const pan = n / 8;
  for (let a = 0; a < 8; a++) { const x = a * pan; g.fillStyle = 'rgba(255,215,170,.28)'; g.fillRect(x, 0, 3, n); g.fillStyle = 'rgba(0,0,0,.38)'; g.fillRect(x + 3, 0, 3, n); gb.fillStyle = '#f0f0f0'; gb.fillRect(x - 2, 0, 5, n); gb.fillStyle = '#303030'; gb.fillRect(x + 3, 0, 2, n); }
});
// Tapial: tongadas horizontales de tierra apisonada.
const texTapial = () => textura('tapial', 3, 1024, (g, gb, n, k, R) => {
  let y = 0;
  while (y < n) { const th = (0.02 + R() * 0.07) * k; g.fillStyle = hsl(29 + R() * 8, 24 + R() * 14, 62 + R() * 12); g.fillRect(0, y, n, th + 1); const v = (105 + R() * 50) | 0; gb.fillStyle = `rgb(${v},${v},${v})`; gb.fillRect(0, y, n, th + 1); y += th; }
  for (let y2 = 0.4 * k * R(); y2 < n; y2 += 0.85 * k) { g.fillStyle = 'rgba(90,65,40,.32)'; g.fillRect(0, y2, n, 2); gb.fillStyle = '#303030'; gb.fillRect(0, y2, n, 3); }
  modular(g, n, ruido(n, 6, 20, 5, sem(R)), 0.18);
  for (let i = 0; i < 2500; i++) { const x = R() * n, yy = R() * n, rr = 0.6 + R() * 2.2; g.fillStyle = hsl(25 + R() * 15, 10 + R() * 20, 35 + R() * 40, 0.7); g.beginPath(); g.arc(x, yy, rr, 0, 7); g.fill(); }
});
// Baños: porcelánico en tono arena (como los baños de la web de NANCA). Paredes en gran formato 120 × 60 a
// matajunta con junta fina; solado 60 × 60 con veladura de piedra.
const texAzulejo = () => textura('azulejo2', 2.4, 1024, (g, gb, n, k, R) => {
  g.fillStyle = '#b9ae9c'; g.fillRect(0, 0, n, n); gb.fillStyle = '#383838'; gb.fillRect(0, 0, n, n);
  const tw = n / 2, th = n / 4; const V = ruido(n, 5, 5, 5, sem(R));
  for (let f = 0; f < 4; f++) for (let c = -1; c < 3; c++) { const x = c * tw + (f % 2) * tw / 2, y = f * th; g.fillStyle = hsl(36 + R() * 3, 20 + R() * 4, 80 + R() * 3); g.fillRect(x + 1, y + 1, tw - 2, th - 2); gb.fillStyle = '#a8a8a8'; gb.fillRect(x + 1, y + 1, tw - 2, th - 2); }
  modular(g, n, V, 0.07);
});
const texLosa = () => textura('losa2', 1.2, 512, (g, gb, n, k, R) => {
  g.fillStyle = '#a49884'; g.fillRect(0, 0, n, n); gb.fillStyle = '#303030'; gb.fillRect(0, 0, n, n);
  const tw = n / 2;
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { g.fillStyle = hsl(35 + R() * 3, 17 + R() * 4, 72 + R() * 4); g.fillRect(a * tw + 1, b * tw + 1, tw - 2, tw - 2); gb.fillStyle = '#a0a0a0'; gb.fillRect(a * tw + 1, b * tw + 1, tw - 2, tw - 2); }
  modular(g, n, ruido(n, 6, 6, 5, sem(R)), 0.12);
  for (let i = 0; i < 14; i++) { g.strokeStyle = `rgba(120,104,84,${(0.05 + R() * 0.07).toFixed(3)})`; g.lineWidth = 0.6 + R() * 1.4; const x0 = R() * n, y0 = R() * n; g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + (R() - 0.5) * 200, y0 + (R() - 0.5) * 200, x0 + (R() - 0.5) * 200, y0 + (R() - 0.5) * 200, x0 + (R() - 0.5) * 260, y0 + (R() - 0.5) * 260); g.stroke(); }
});
// Rugosidad: variación lenta (0,72–1) que rompe el brillo uniforme de suelos, lacados y porcelánicos (canal G).
let RUG = null;
function texRugosidad() {
  if (RUG) return RUG; const n = 256; const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
  const N = ruido(n, 4, 4, 5, 7331), d = g.createImageData(n, n), p = d.data;
  for (let j = 0, i = 0; j < N.length; j++, i += 4) { const v = (255 * (0.72 + 0.28 * suave(0.2, 0.8, N[j]))) | 0; p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255; }
  g.putImageData(d, 0, 0); RUG = new THREE.CanvasTexture(c); RUG.wrapS = RUG.wrapT = THREE.RepeatWrapping; RUG.repeat.set(1 / 2.7, 1 / 2.7); RUG.colorSpace = THREE.NoColorSpace; return RUG;
}
// Hormigón liso neutro (se tiñe con el color del material): forjados, zócalo, medianeras, solados de servicio.
const texHormigonLiso = () => textura('hliso', 2, 512, (g, gb, n, k, R) => {
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, n, n); modular(g, n, ruido(n, 6, 6, 5, sem(R)), 0.12);
  for (let i = 0; i < 1800; i++) { const x = R() * n, y = R() * n, r = 0.4 + R() * 1.1; g.fillStyle = `rgba(40,40,40,${(0.15 + R() * 0.25).toFixed(3)})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); gb.fillStyle = '#202020'; gb.beginPath(); gb.arc(x, y, r + 0.3, 0, 7); gb.fill(); }
});
const texGrano = () => textura('grano', 1.5, 256, (g, gb, n, k, R) => { g.fillStyle = '#f5f5f5'; g.fillRect(0, 0, n, n); const N = ruido(n, 16, 16, 3, sem(R)); modular(g, n, N, 0.05); gris(gb, n, N, 100, 160); });
const texGrava = () => textura('grava', 1, 512, (g, gb, n, k, R) => {
  g.fillStyle = '#8b847a'; g.fillRect(0, 0, n, n); gb.fillStyle = '#303030'; gb.fillRect(0, 0, n, n);
  for (let i = 0; i < 5200; i++) {
    const x = R() * n, y = R() * n, rx = 2 + R() * 4.5, ry = rx * (0.6 + R() * 0.4), a = R() * 3.14, h = 28 + R() * 18, s = 5 + R() * 10, l = 48 + R() * 32, v = (120 + R() * 110) | 0;
    envolver(n, x, y, 8, (px, py) => {
      g.fillStyle = hsl(h, s, l); g.beginPath(); g.ellipse(px, py, rx, ry, a, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.ellipse(px - rx * 0.25, py - ry * 0.3, rx * 0.5, ry * 0.4, a, 0, 7); g.fill();
      gb.fillStyle = `rgb(${v},${v},${v})`; gb.beginPath(); gb.ellipse(px, py, rx, ry, a, 0, 7); gb.fill();
    });
  }
});
const texCesped = () => textura('cesped', 2, 512, (g, gb, n, k, R) => {
  g.fillStyle = '#6a8446'; g.fillRect(0, 0, n, n); modular(g, n, ruido(n, 6, 6, 5, sem(R)), 0.35);
  g.lineCap = 'round';
  for (let i = 0; i < 15000; i++) { const x = R() * n, y = R() * n, l = 2 + R() * 5, a = -1.57 + (R() - 0.5) * 1.3; g.strokeStyle = hsl(72 + R() * 32, 28 + R() * 25, 22 + R() * 30, 0.55); g.lineWidth = 0.8 + R() * 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  gris(gb, n, ruido(n, 64, 64, 2, sem(R)), 60, 200);
});
const texSeto = () => textura('seto', 1, 256, (g, gb, n, k, R) => {
  g.fillStyle = '#34482a'; g.fillRect(0, 0, n, n); gb.fillStyle = '#202020'; gb.fillRect(0, 0, n, n);
  for (let i = 0; i < 2600; i++) { const x = R() * n, y = R() * n, rx = 2 + R() * 3.5, a = R() * 3.14, h = 82 + R() * 30, l = 18 + R() * 24, v = (90 + R() * 160) | 0; envolver(n, x, y, 6, (px, py) => { g.fillStyle = hsl(h, 30 + R() * 15, l); g.beginPath(); g.ellipse(px, py, rx, rx * 0.55, a, 0, 7); g.fill(); gb.fillStyle = `rgb(${v},${v},${v})`; gb.beginPath(); gb.ellipse(px, py, rx, rx * 0.55, a, 0, 7); gb.fill(); }); }
});
const texChapa = () => textura('chapa', 2, 512, (g, gb, n, k, R) => {
  g.fillStyle = '#5a5e61'; g.fillRect(0, 0, n, n); modular(g, n, ruido(n, 32, 2, 4, sem(R)), 0.08);
  const pan = n / 4;
  for (let a = 0; a < 4; a++) { const x = a * pan; g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, 0, 3, n); g.fillStyle = 'rgba(0,0,0,.42)'; g.fillRect(x + 3, 0, 3, n); gb.fillStyle = '#f0f0f0'; gb.fillRect(x - 2, 0, 5, n); gb.fillStyle = '#303030'; gb.fillRect(x + 3, 0, 2, n); }
});
// Roble de mueble: veta continua, sin juntas.
const texVeta = () => textura('veta', 1.2, 512, (g, gb, n, k, R) => {
  g.fillStyle = hsl(31, 36, 60); g.fillRect(0, 0, n, n);
  for (let v = 0; v < 260; v++) { const y = R() * n, amp = R() * 4, fr = (Math.PI * 2 * (1 + ((R() * 3) | 0))) / n, ph = R() * 6; g.strokeStyle = hsl(28, 40, 42 + R() * 14, 0.06 + R() * 0.12); g.lineWidth = 0.5 + R() * 1.5; g.beginPath(); for (let x = 0; x <= n; x += 8) g.lineTo(x, y + Math.sin(x * fr + ph) * amp); g.stroke(); }
  modular(g, n, ruido(n, 2, 24, 4, sem(R)), 0.16);
  return false;
});
const texTejido = () => textura('tejido', 0.12, 128, (g, gb, n, k, R) => {
  const d = g.createImageData(n, n), p = d.data, db = gb.createImageData(n, n), pb = db.data;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const urd = ((x >> 1) + (y >> 1)) % 2; const v = 222 + R() * 26 - (urd ? 14 : 0); const i = (y * n + x) * 4;
    p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255; const b = urd ? 90 : 170; pb[i] = pb[i + 1] = pb[i + 2] = b; pb[i + 3] = 255;
  }
  g.putImageData(d, 0, 0); gb.putImageData(db, 0, 0);
});
const texSeccional = () => textura('seccional', 2, 256, (g, gb, n, k, R) => {
  g.fillStyle = '#efefef'; g.fillRect(0, 0, n, n); modular(g, n, ruido(n, 4, 4, 3, sem(R)), 0.05);
  for (let y = 0; y < n; y += n / 4) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y, n, 2); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(0, y + 2, n, 1); gb.fillStyle = '#101010'; gb.fillRect(0, y, n, 3); }
});
const texPiedra = () => textura('piedra', 1.5, 512, (g, gb, n, k, R) => {
  g.fillStyle = '#e9e5dd'; g.fillRect(0, 0, n, n); modular(g, n, ruido(n, 5, 5, 5, sem(R)), 0.05);
  for (let i = 0; i < 9; i++) { g.strokeStyle = `rgba(150,140,128,${(0.08 + R() * 0.12).toFixed(3)})`; g.lineWidth = 0.6 + R() * 1.8; g.beginPath(); const x0 = R() * n, y0 = R() * n; g.moveTo(x0, y0); g.bezierCurveTo(x0 + (R() - 0.5) * n, y0 + (R() - 0.5) * n, x0 + (R() - 0.5) * n, y0 + (R() - 0.5) * n, x0 + (R() - 0.5) * n, y0 + (R() - 0.5) * n); g.stroke(); }
  return false;
});

// ---- texturas v.1: con mapa de normales (relieve real bajo luz rasante) ----
// textura con normales: pintar(g, h, n, k, R) pinta el color en g y una altura en escala de grises en h.
function texturaN(clave, metros, n, fuerza, pintar) {
  if (TEX.has(clave)) return TEX.get(clave);
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };
  const c = mk(), hc = mk(), nc = mk(); const g = c.getContext('2d', { willReadFrequently: true }), gh = hc.getContext('2d', { willReadFrequently: true });
  gh.fillStyle = '#808080'; gh.fillRect(0, 0, n, n);
  pintar(g, gh, n, n / metros, azar(hash(clave)));
  const H = gh.getImageData(0, 0, n, n).data; const gn = nc.getContext('2d'); const D = gn.createImageData(n, n), p = D.data;
  const h = (x, y) => H[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * fuerza, dy = (h(x, y + 1) - h(x, y - 1)) * fuerza; const l = Math.hypot(dx, dy, 1); const i = (y * n + x) * 4;
    p[i] = (-dx / l * 0.5 + 0.5) * 255; p[i + 1] = (dy / l * 0.5 + 0.5) * 255; p[i + 2] = (1 / l * 0.5 + 0.5) * 255; p[i + 3] = 255;
  }
  gn.putImageData(D, 0, 0);
  const tx = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / metros, 1 / metros); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; };
  const r = { map: tx(c, true), normal: tx(nc, false) }; TEX.set(clave, r); return r;
}
const hexRGB = (c) => { const v = parseInt(String(c).replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const tono = (c, f, a = 1) => { const [r, g, b] = hexRGB(c); return `rgba(${Math.min(255, r * f) | 0},${Math.min(255, g * f) | 0},${Math.min(255, b * f) | 0},${a})`; };
// Hormigón arquitectónico liso: tableros de encofrado de 2,40 × 1,20 con junta fina y berenjenos de los latiguillos.
const texHormigonArq = (color) => textura('harq' + color, 2.4, 1024, (g, gb, n, k, R) => {
  g.fillStyle = color; g.fillRect(0, 0, n, n); modular(g, n, ruido(n, 3, 3, 5, sem(R)), 0.07); modular(g, n, ruido(n, 14, 14, 3, sem(R)), 0.03);
  gris(gb, n, ruido(n, 64, 64, 2, sem(R)), 118, 140);
  for (let f = 0; f < 2; f++) { g.fillStyle = R() < 0.5 ? `rgba(255,255,255,${(R() * 0.045).toFixed(3)})` : `rgba(0,0,0,${(R() * 0.04).toFixed(3)})`; g.fillRect(0, f * n / 2, n, n / 2); }
  g.fillStyle = 'rgba(55,52,48,.30)'; for (const y of [0, n / 2]) g.fillRect(0, y, n, 1.6); g.fillRect(0, 0, 1.6, n);
  gb.fillStyle = '#4a4a4a'; for (const y of [0, n / 2]) gb.fillRect(0, y, n, 2.2); gb.fillRect(0, 0, 2.2, n);
  for (const xm of [0.4, 1.2, 2.0]) for (const ym of [0.3, 0.9, 1.5, 2.1]) {
    const x = xm * k, y = ym * k; g.fillStyle = 'rgba(70,66,60,.6)'; g.beginPath(); g.arc(x, y, 0.011 * k, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 0.024 * k, 0, 7); g.stroke(); gb.fillStyle = '#141414'; gb.beginPath(); gb.arc(x, y, 0.012 * k, 0, 7); gb.fill();
  }
  for (let i = 0; i < 2200; i++) { const x = R() * n, y = R() * n, r = 0.3 + R() * 0.9; g.fillStyle = `rgba(50,48,44,${(0.12 + R() * 0.2).toFixed(3)})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); gb.fillStyle = '#303030'; gb.beginPath(); gb.arc(x, y, r + 0.3, 0, 7); gb.fill(); }
});
// Chapa grecada (perfil trapezoidal de 25 cm): nervios verticales por normales (fachada) o en el sentido de la pendiente (cubierta).
const texChapaGrecada = (color) => texturaN('grecada' + color, 1.0, 512, 9, (g, h, n, k, R) => {
  g.fillStyle = color; g.fillRect(0, 0, n, n); modular(g, n, ruido(n, 24, 2, 4, sem(R)), 0.06);
  const paso = 0.25 * k; const perfil = (t) => (t < 0.16 ? 1 : t < 0.28 ? 1 - (t - 0.16) / 0.12 : t < 0.88 ? 0 : (t - 0.88) / 0.12);
  const d = h.getImageData(0, 0, n, n), p = d.data;
  for (let x = 0; x < n; x++) { const v = (40 + perfil((x % paso) / paso) * 175) | 0; for (let y = 0; y < n; y++) { const i = (y * n + x) * 4; p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255; } }
  h.putImageData(d, 0, 0);
  for (let x = 0; x < n; x += paso) { g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(x, 0, 0.04 * k, n); g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(x + 0.07 * k, 0, 0.03 * k, n); }
});
// Teja curva cerámica: canales de 22 cm, hiladas de 33 cm, cada pieza con su tono y sombra en el labio.
const texTeja = (color, var_) => texturaN('teja' + color + var_, 1.32, 1024, 6, (g, h, n, k, R) => {
  const tw = 0.22 * k, th = 0.33 * k; const nu = Math.round(n / tw), nv = Math.round(n / th); const mixta = var_ === 'mixta';
  const d = h.getImageData(0, 0, n, n), p = d.data;
  for (let y = 0; y < n; y++) { const fv = (y % th) / th; for (let x = 0; x < n; x++) { const fu = (x % tw) / tw; const v = (30 + 150 * Math.sin(Math.PI * fu) * 0.85 + 70 * fv) | 0; const i = (y * n + x) * 4; p[i] = p[i + 1] = p[i + 2] = Math.min(255, v); p[i + 3] = 255; } }
  h.putImageData(d, 0, 0);
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const f = 0.82 + R() * 0.3 + (mixta ? (R() - 0.5) * 0.35 : 0); const x = i * tw, y = j * th;
    const gr = g.createLinearGradient(x, 0, x + tw, 0); gr.addColorStop(0, tono(color, f * 0.62)); gr.addColorStop(0.5, tono(color, f * 1.08)); gr.addColorStop(1, tono(color, f * 0.62));
    g.fillStyle = gr; g.fillRect(x, y, tw, th);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x, y + th - 0.025 * k, tw, 0.025 * k); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + tw * 0.3, y, tw * 0.25, th * 0.8);
  }
  modular(g, n, ruido(n, 16, 16, 4, sem(R)), 0.14);
});
// Tégola asfáltica: lengüetas de 33 × 14 cm a matajunta, granulado mineral.
const texTegola = (color) => texturaN('tegola' + color, 1.0, 1024, 5, (g, h, n, k, R) => {
  const tw = n / 3, th = n / 7; g.fillStyle = color; g.fillRect(0, 0, n, n);
  const d = h.getImageData(0, 0, n, n), p = d.data;
  for (let y = 0; y < n; y++) { const fila = Math.floor(y / th), fv = (y % th) / th; const off = (fila % 2) * tw / 2; for (let x = 0; x < n; x++) { const fu = ((x + off) % tw) / tw; const ranura = fu < 0.015 || fu > 0.985; const v = ranura ? 20 : (60 + 150 * fv) | 0; const i = (y * n + x) * 4; p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255; } }
  h.putImageData(d, 0, 0);
  for (let j = 0; j < 7; j++) for (let i = -1; i < 4; i++) { const x = i * tw + (j % 2) * tw / 2, y = j * th; g.fillStyle = tono(color, 0.8 + R() * 0.35); g.fillRect(x + 2, y, tw - 4, th); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + th - 4, tw, 4); g.fillRect(x, y, 2.5, th); }
  for (let i = 0; i < 26000; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.14)'; g.fillRect(R() * n, R() * n, 1.4, 1.4); }
});
// Gresite (mosaico vítreo de 2,5 cm) con cáusticas pintadas para el fondo del vaso.
const texGresite = (fondo) => textura('gresite' + (fondo ? 'f' : ''), 0.5, 512, (g, gb, n, k, R) => {
  g.fillStyle = '#d7e9e6'; g.fillRect(0, 0, n, n); gb.fillStyle = '#2a2a2a'; gb.fillRect(0, 0, n, n); const t = n / 20;
  for (let a = 0; a < 20; a++) for (let b = 0; b < 20; b++) { g.fillStyle = hsl(182 + R() * 14, 28 + R() * 20, 72 + R() * 12); g.fillRect(a * t + 1, b * t + 1, t - 2, t - 2); gb.fillStyle = '#b0b0b0'; gb.fillRect(a * t + 1, b * t + 1, t - 2, t - 2); }
  if (fondo) { g.lineCap = 'round'; for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(255,255,255,${(0.10 + R() * 0.18).toFixed(3)})`; g.lineWidth = 1.5 + R() * 3; const x = R() * n, y = R() * n; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + (R() - 0.5) * 120, y + (R() - 0.5) * 120, x + (R() - 0.5) * 120, y + (R() - 0.5) * 120, x + (R() - 0.5) * 160, y + (R() - 0.5) * 160); g.stroke(); } }
  return true;
});
// Lámina de agua: rizado periódico (solo normales).
const texOlas = () => texturaN('olas', 3, 256, 3.5, (g, h, n, k, R) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n); gris(h, n, ruido(n, 6, 6, 4, sem(R)), 40, 215); });
// Muro de piedra seca: mampuestos calizos irregulares con llagas en sombra.
const texPiedraSeca = () => textura('pseca', 1.2, 512, (g, gb, n, k, R) => {
  g.fillStyle = '#5b5145'; g.fillRect(0, 0, n, n); gb.fillStyle = '#101010'; gb.fillRect(0, 0, n, n);
  let y = 0; while (y < n) { const hh = (0.1 + R() * 0.12) * k; let x = -R() * 40; while (x < n) { const w = (0.14 + R() * 0.26) * k; const l = 60 + R() * 22; envolver(n, x + w / 2, y + hh / 2, w, (px, py) => { g.fillStyle = hsl(34 + R() * 10, 14 + R() * 14, l); g.beginPath(); g.ellipse(px, py, w / 2 - 2, hh / 2 - 2, (R() - 0.5) * 0.2, 0, 7); g.fill(); gb.fillStyle = `rgb(${(140 + R() * 90) | 0},128,128)`; gb.beginPath(); gb.ellipse(px, py, w / 2 - 2, hh / 2 - 2, 0, 0, 7); gb.fill(); }); x += w; } y += hh; }
  modular(g, n, ruido(n, 8, 8, 4, sem(R)), 0.16);
});
// Grava rastrillada (jardín zen): árido claro con surcos paralelos.
const texGravaZen = () => textura('gzen', 2, 512, (g, gb, n, k, R) => {
  g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, n, n); gb.fillStyle = '#808080'; gb.fillRect(0, 0, n, n);
  for (let i = 0; i < 16000; i++) { const x = R() * n, y = R() * n, r = 0.8 + R() * 1.8, l = 70 + R() * 24; g.fillStyle = hsl(40, 6, l); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  for (let y = 0; y < n; y += n / 24) { g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(0, y, n, 3); gb.fillStyle = '#303030'; gb.fillRect(0, y, n, 4); gb.fillStyle = '#c8c8c8'; gb.fillRect(0, y + 6, n, 6); }
});
// Mantillo de bosque: tierra parda, hojarasca y pinocha.
const texMantillo = () => textura('mantillo', 2, 512, (g, gb, n, k, R) => {
  g.fillStyle = '#6d5a43'; g.fillRect(0, 0, n, n); modular(g, n, ruido(n, 6, 6, 5, sem(R)), 0.3); gris(gb, n, ruido(n, 48, 48, 2, sem(R)), 70, 190);
  for (let i = 0; i < 5000; i++) { const x = R() * n, y = R() * n; g.fillStyle = hsl(20 + R() * 30, 30 + R() * 30, 22 + R() * 35, 0.7); g.beginPath(); g.ellipse(x, y, 2 + R() * 4, 1 + R() * 2, R() * 3, 0, 7); g.fill(); }
  g.lineCap = 'round'; for (let i = 0; i < 1500; i++) { const x = R() * n, y = R() * n, a = R() * 6.28; g.strokeStyle = hsl(30, 35, 30 + R() * 25, 0.6); g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); g.stroke(); }
});
// Ladrillo visto a soga (24 × 5,5 cm + junta de 1 cm), cada pieza con su tono (colección «Estilos y culturas»).
const texLadrillo = (color) => textura('ladrillo' + color, 1.25, 512, (g, gb, n, k, R) => {
  g.fillStyle = '#cfc8bb'; g.fillRect(0, 0, n, n); gb.fillStyle = '#202020'; gb.fillRect(0, 0, n, n);
  const lw = 0.25 * k, lh = 0.065 * k, j = 0.01 * k;
  for (let f = 0, y = 0; y < n; f++, y += lh) for (let x = (f % 2) * -lw / 2; x < n; x += lw) { g.fillStyle = tono(color, 0.8 + R() * 0.35); g.fillRect(x + j / 2, y + j / 2, lw - j, lh - j); gb.fillStyle = '#b0b0b0'; gb.fillRect(x + j / 2, y + j / 2, lw - j, lh - j); }
  modular(g, n, ruido(n, 8, 8, 4, sem(R)), 0.12);
});

// ---------------------------------------------------------------------------------------------------------
// Montaje: cada vértice de la casa lleva el índice de su pieza; una textura de datos guarda el desplazamiento de
// cada pieza y el sombreador de vértices la mueve (una sola llamada de dibujo por material, también en sombras).
// ---------------------------------------------------------------------------------------------------------
function inyectarMontaje(mat, U) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.tMontaje = U.tex; sh.uniforms.uMontaje = U.activo; sh.uniforms.uMontajeTam = U.tam;
    sh.vertexShader = 'attribute float pieza;\nuniform sampler2D tMontaje;\nuniform float uMontaje;\nuniform vec2 uMontajeTam;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nif (uMontaje > 0.5 && pieza > 0.5) { vec2 qm = (vec2(mod(pieza, uMontajeTam.x), floor(pieza / uMontajeTam.x)) + 0.5) / uMontajeTam; transformed += texture2D(tMontaje, qm).xyz; }');
  };
  mat.customProgramCacheKey = () => 'montaje-v1';
}
// Variación de color a gran escala en coordenadas de mundo (rompe la repetición de terreno y céspedes a distancia).
// Se encadena con el montaje; la clave de programa cambia para no compartir sombreador con los demás materiales.
function variacionMacro(mat, fuerza = 0.2) {
  const prev = mat.onBeforeCompile; const f = fuerza.toFixed(3);
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMundoM;').replace('#include <project_vertex>', '#include <project_vertex>\nvMundoM = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vMundoM;\nfloat hM(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat nM(vec2 p){ vec2 i = floor(p), u = fract(p); u = u * u * (3.0 - 2.0 * u); return mix(mix(hM(i), hM(i + vec2(1.0, 0.0)), u.x), mix(hM(i + vec2(0.0, 1.0)), hM(i + vec2(1.0, 1.0)), u.x), u.y); }')
      .replace('#include <map_fragment>', `#include <map_fragment>\n{ vec2 q = vMundoM.xz; float m = nM(q * 0.031) * 0.55 + nM(q * 0.13) * 0.3 + nM(q * 0.52) * 0.15; diffuseColor.rgb *= 1.0 + (m - 0.5) * ${f} * 2.0; diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.07, 1.0, 0.82), smoothstep(0.55, 0.85, nM(q * 0.018 + 7.0)) * ${f} * 1.6); }`);
  };
  mat.customProgramCacheKey = () => 'montaje-v1|macro' + f;
}

// ---------------------------------------------------------------------------------------------------------
// Materiales. En maqueta todo es cartón blanco/gris, sin texturas.
// ---------------------------------------------------------------------------------------------------------
const MAQUETA = {
  fachada: '#f5f4f0', medianera: '#e9e8e3', yeso: '#f6f5f1', techo: '#f6f5f1', forjado: '#efeee9', zocalo: '#e0dfda', poche: '#54534e',
  roble: '#ebe8e1', tarima: '#e6e4dd', losa: '#efeee9', azulejo: '#f1f0ec', hormigonSuelo: '#e6e5df', grava: '#e1e0da', cesped: '#ebeae3',
  terreno: '#e7e6e0', seto: '#e2e1da', muro: '#f2f1ed', losaExt: '#efeee8', vecino: '#e6e5df', marco: '#cdccc6', puerta: '#dedcd5',
  seccional: '#dedcd5', albardilla: '#d3d2cc', poste: '#d6d5cf', madera: '#e2e0d9', cubierta: '#e6e5e0', negro: '#b9b8b2', hoja: '#e9e8e1',
  corteza: '#d9d7d0', coche: '#d2d1cb', cocheClaro: '#ecebe6', cristalCoche: '#c4c6c6', neumatico: '#b3b2ad', espejo: '#e3e6e6', cromo: '#dcdcd8',
  gresite: '#e9ecec', gresiteFondo: '#e4e8e8', coronacion: '#f0efea', piedraSeca: '#e4e2dc', brasas: '#d0cec8', techoMadera: '#f3f2ee',
};
function materiales(modelo, mq, U) {
  const ac = modelo.acabados || {}; const fz = MATERIALES[ac.fachada] ? ac.fachada : 'mineral'; const F = MATERIALES[fz];
  const colF = /^#[0-9a-f]{6}$/i.test(ac.colorFachada || '') ? ac.colorFachada : F.color;
  const ca = CARPINTERIAS[ac.carpinteria] ? ac.carpinteria : 'oscura'; const C = CARPINTERIAS[ca]; const madera = ca === 'madera';
  const S = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, o));
  const tx = (f, bs = 0.6) => { if (mq) return {}; const t = f(); return t.bump ? { map: t.map, bumpMap: t.bump, bumpScale: bs } : { map: t.map }; };
  const txN = (f, s = 1) => { if (mq) return {}; const t = f(); return { map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(s, s) }; };
  const rg = () => (mq ? {} : { roughnessMap: texRugosidad() }); // brillo no uniforme (suelos, lacados, porcelánicos)
  const fachada = (() => {
    if (fz === 'hormigon') return S({ ...tx(texHormigon, 0.8), roughness: 0.9 });
    if (fz === 'hormigon_blanco' || fz === 'hormigon_gris') return S({ ...tx(() => texHormigonArq(colF), 0.45), roughness: fz === 'hormigon_blanco' ? 0.78 : 0.82 });
    if (fz === 'madera') return S({ ...tx(texLamas, 1.2), roughness: 0.78 });
    if (fz === 'cobre') return S({ ...tx(texCobre, 1.2), roughness: 0.5, metalness: 0.4 });
    if (fz === 'tapial') return S({ ...tx(texTapial, 0.8), roughness: 0.97 });
    // colección «Estilos y culturas»: piedra, ladrillo y tablas teñidas (cal, adobe, almagra y lacado van como estuco de su color)
    if (fz === 'mamposteria') return S({ ...tx(texPiedraSeca, 1.0), roughness: 0.95 });
    if (fz === 'ladrillo_rojo' || fz === 'ladrillo_gris') return S({ ...tx(() => texLadrillo(colF), 0.9), roughness: 0.9 });
    if (fz === 'madera_negra' || fz === 'madera_roja') return S({ ...tx(texLamas, 1.2), color: fz === 'madera_negra' ? '#3a3734' : '#c0473a', roughness: 0.8 });
    if (fz === 'lacado') return S({ ...tx(() => texEstuco(colF), 0.15), roughness: 0.35 });
    if (fz === 'chapa' || fz === 'chapa_clara') return S({ ...txN(() => texChapaGrecada(colF), 1.4), roughness: fz === 'chapa' ? 0.46 : 0.36, metalness: 0.55 });
    return S({ ...tx(() => texEstuco(colF), 0.5), roughness: 0.95 }); // mineral y estucos (color propio o acabados.colorFachada)
  })();
  // cubierta: material y color del catálogo (grava solo en plana; en inclinada se toma como chapa)
  const cub = modelo.cubierta || {}; const plana = tipoCub(modelo) === 'plana';
  let cm = CUB_MAT[cub.material] ? cub.material : plana ? 'grava' : 'teja'; if (!plana && cm === 'grava') cm = 'chapa';
  const cols = CUB_MAT[cm]?.colores || {}; const ccol = cols[cub.color] || Object.values(cols)[0] || '#8a8780';
  const cubiertaM = cm === 'teja' ? S({ ...txN(() => texTeja(ccol, cub.color || ''), 1.6), roughness: 0.72 })
    : cm === 'tegola' ? S({ ...txN(() => texTegola(ccol), 1.2), roughness: 0.93 })
    : cm === 'chapa' ? S({ ...txN(() => texChapaGrecada(ccol), 1.5), roughness: 0.4, metalness: 0.5 })
    : S({ color: cub.color === 'clara' ? '#ffffff' : '#c6c1b7', ...tx(texGrava, 1.0), roughness: 1 });
  const albardilla = S({ color: ca === 'clara' ? '#bdb8ac' : '#3b3c3a', roughness: 0.4, metalness: 0.6 });
  const celC = (k) => CEL_MAT[k]?.color || '#a67c52';
  const M = {
    fachada, albardilla, canto: albardilla, cubierta: cubiertaM,
    medianera: S({ color: '#d9d6cf', ...tx(texHormigonLiso, 0.4), roughness: 0.95 }),
    yeso: S({ color: '#f3f1ec', ...tx(texGrano, 0.2), roughness: 0.95 }),
    techo: S({ color: '#f6f5f1', roughness: 0.96 }),
    // bajo cubierta inclinada: techo de madera (como el My Way de la web de NANCA); acabados.techo = 'yeso' lo quita
    techoMadera: S({ color: '#f7ebdc', ...tx(texRoble, 0.25), ...rg(), roughness: 0.72 }),
    forjado: S({ color: '#ecebe6', ...tx(texGrano, 0.15), roughness: 0.94 }),
    zocalo: S({ color: '#cbc7bf', ...tx(texHormigonLiso, 0.4), roughness: 0.95 }),
    poche: S({ color: '#2f2e2a', roughness: 1 }),
    roble: S({ ...tx(texRoble, 0.5), ...rg(), roughness: 0.6 }),
    mueble: S({ ...tx(texVeta), ...rg(), roughness: 0.62 }),
    tarima: S({ ...tx(texTarima, 0.9), roughness: 0.8 }),
    losa: S({ ...tx(texLosa, 0.6), ...rg(), roughness: 0.42 }),
    azulejo: S({ ...tx(texAzulejo, 0.6), ...rg(), roughness: 0.3 }),
    hormigonSuelo: S({ color: '#d4d1ca', ...tx(texHormigonLiso, 0.3), ...rg(), roughness: 0.62 }),
    grava: S({ ...tx(texGrava, 1.0), roughness: 1 }),
    gravaCalida: S({ color: '#f2dcc0', ...tx(texGrava, 1.0), roughness: 1 }),
    gravaZen: S({ ...tx(texGravaZen, 0.9), roughness: 1 }),
    mantillo: S({ ...tx(texMantillo, 1.0), roughness: 1 }),
    cesped: S({ ...tx(texCesped, 0.8), roughness: 1 }),
    pradera: S({ color: '#e6dc9e', ...tx(texCesped, 0.8), roughness: 1 }),
    terreno: S({ color: '#e2d6b6', ...tx(texCesped, 0.5), roughness: 1 }),
    seto: S({ ...tx(texSeto, 1.4), roughness: 1 }),
    piedraSeca: S({ ...tx(texPiedraSeca, 1.6), roughness: 0.95 }),
    muro: S({ ...tx(() => texEstuco('#ece8df'), 0.5), roughness: 0.95 }),
    losaExt: S({ color: '#e2dccf', ...tx(texHormigonLiso, 0.4), roughness: 0.85 }),
    vecino: S({ color: '#e0ddd5', roughness: 0.95 }),
    marco: S({ color: C.color, roughness: madera ? 0.6 : 0.38, metalness: madera ? 0 : 0.55 }),
    puerta: S({ color: '#d2ad84', ...tx(texRoble, 0.3), roughness: 0.55 }),
    seccional: S({ color: C.color, ...tx(texSeccional, 0.6), roughness: 0.45, metalness: madera ? 0 : 0.4 }),
    poste: S({ color: madera ? '#a67c52' : C.color, roughness: 0.5, metalness: madera ? 0 : 0.5 }),
    madera: S({ color: '#e6cdb0', ...tx(texTarima, 0.3), roughness: 0.75 }),
    cel_madera: S({ color: mq ? celC('madera') : '#f6e2c8', ...tx(texVeta, 0.3), roughness: 0.7 }),
    cel_aluminio: S({ color: celC('aluminio'), roughness: 0.35, metalness: 0.75 }),
    cel_hormigon: S({ color: celC('hormigon'), ...tx(texHormigonLiso, 0.4), roughness: 0.92 }),
    vidrio: mq ? S({ color: '#dbe4e6', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false })
      : new THREE.MeshPhysicalMaterial({ color: '#e6f0ee', roughness: 0.03, metalness: 0, transmission: 1, thickness: 0.01, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.4, emissive: '#ffcf96', emissiveIntensity: 0 }),
    // piscina
    agua: mq ? S({ color: '#cfe3e6', roughness: 0.1, transparent: true, opacity: 0.5, depthWrite: false })
      : S({ color: '#3d9fb0', roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.66, depthWrite: false, envMapIntensity: 1.5, ...(() => { const o = txN(texOlas, 0.35); delete o.map; return o; })(), emissive: '#0d7488', emissiveIntensity: 0 }),
    gresite: S({ ...tx(() => texGresite(false), 0.5), roughness: 0.18 }),
    gresiteFondo: S({ ...tx(() => texGresite(true), 0.5), roughness: 0.2 }),
    coronacion: S({ color: '#eee8dc', ...tx(texPiedra), roughness: 0.6 }),
    // mobiliario
    lacado: S({ color: '#f1efea', ...rg(), roughness: 0.36 }),
    tela: S({ color: '#c9bfae', ...tx(texTejido, 0.4), roughness: 1 }),
    lino: S({ color: '#f0ece4', ...tx(texTejido, 0.3), roughness: 1 }),
    manta: S({ color: '#b47d55', ...tx(texTejido, 0.5), roughness: 1 }),
    alfombra: S({ color: '#cbb89c', ...tx(texTejido, 0.8), roughness: 1 }),
    piedra: S({ ...tx(texPiedra), roughness: 0.25 }),
    ceramica: S({ color: '#f7f7f4', roughness: 0.12 }),
    cromo: S({ color: '#dedede', roughness: 0.12, metalness: 1 }),
    acero: S({ color: '#a3a4a1', roughness: 0.35, metalness: 0.85 }),
    negro: S({ color: '#242423', roughness: 0.45 }),
    espejo: S({ color: '#ffffff', roughness: 0.02, metalness: 1 }),
    lampara: S({ color: '#f3e9d8', roughness: 0.9, emissive: '#ffc98a', emissiveIntensity: 0 }),
    teca: S({ color: '#ddc0a0', ...tx(texTarima, 0.3), roughness: 0.7 }),
    telaExt: S({ color: '#e7e1d6', ...tx(texTejido, 0.4), roughness: 1 }),
    hormigon: S({ color: '#c8c4bb', ...tx(texHormigonLiso, 0.5), roughness: 0.95 }),
    barro: S({ color: '#b26b4c', roughness: 0.9 }),
    hoja: S({ color: '#5d7a43', roughness: 0.9, flatShading: true }),
    corteza: S({ color: '#6b5643', roughness: 1 }),
    tierra: S({ color: '#5a4636', roughness: 1 }),
    brasas: S({ color: '#2a1208', roughness: 1, emissive: '#ff5a14', emissiveIntensity: 0.6 }),
    coche: S({ color: '#3c4147', roughness: 0.3, metalness: 0.6 }),
    cocheClaro: S({ color: '#e8e8e4', roughness: 0.3, metalness: 0.4 }),
    cristalCoche: S({ color: '#1c2026', roughness: 0.08, metalness: 0.5 }),
    neumatico: S({ color: '#1a1a1a', roughness: 0.9 }),
  };
  M.vidrio.userData.sinSombra = true; M.agua.userData.sinSombra = true;
  for (const [k, m] of Object.entries(M)) {
    m.name = k;
    if (mq && !['vidrio', 'lampara', 'poche', 'agua'].includes(k)) { m.color.set(MAQUETA[k] || '#e8e6e0'); m.metalness = 0; m.roughness = Math.max(m.roughness, k === 'espejo' || k === 'cromo' ? 0.4 : 0.85); m.flatShading = false; if (m.emissive) m.emissiveIntensity = 0; }
  }
  for (const m of new Set(Object.values(M))) inyectarMontaje(m, U);
  if (!mq) { variacionMacro(M.terreno, 0.22); for (const k of ['cesped', 'pradera', 'gravaCalida', 'mantillo']) variacionMacro(M[k], 0.14); }
  return M;
}

// ---------------------------------------------------------------------------------------------------------
// Lote: acumula caras por material y las entrega como una malla por material (pocas llamadas de dibujo).
// Coordenadas three: X = x de planta, Y = altura, Z = y de planta. UV proyectadas en metros según la normal.
// Cada vértice lleva la pieza de montaje activa (lote.tag).
// ---------------------------------------------------------------------------------------------------------
const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const proy = (p, n) => { const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]); return ay >= ax && ay >= az ? [p[0], p[2]] : ax >= az ? [p[2], p[1]] : [p[0], p[1]]; };
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m3 = new THREE.Matrix3();
class Lote {
  constructor() { this.m = new Map(); this.tag = 0; }
  _a(mat) { let a = this.m.get(mat); if (!a) this.m.set(mat, (a = { p: [], n: [], u: [], k: [] })); return a; }
  _v(a, P, N, U) { a.p.push(P[0], P[1], P[2]); a.n.push(N[0], N[1], N[2]); a.u.push(U[0], U[1]); a.k.push(this.tag); }
  quad(mat, A, B, C, D, hint, uvs) {
    if (!mat) return;
    let n = cruz(resta(B, A), resta(C, A));
    if (punto(n, hint) < 0) { [B, D] = [D, B]; if (uvs) uvs = [uvs[0], uvs[3], uvs[2], uvs[1]]; n = [-n[0], -n[1], -n[2]]; }
    const l = Math.hypot(n[0], n[1], n[2]); if (l < 1e-12) return; n = [n[0] / l, n[1] / l, n[2] / l];
    const U = uvs || [proy(A, n), proy(B, n), proy(C, n), proy(D, n)]; const a = this._a(mat);
    this._v(a, A, n, U[0]); this._v(a, B, n, U[1]); this._v(a, C, n, U[2]); this._v(a, A, n, U[0]); this._v(a, C, n, U[2]); this._v(a, D, n, U[3]);
  }
  tri(mat, A, B, C, hint, uvs) {
    if (!mat) return;
    let n = cruz(resta(B, A), resta(C, A)); if (punto(n, hint) < 0) { [B, C] = [C, B]; if (uvs) uvs = [uvs[0], uvs[2], uvs[1]]; n = [-n[0], -n[1], -n[2]]; }
    const l = Math.hypot(n[0], n[1], n[2]); if (l < 1e-12) return; n = [n[0] / l, n[1] / l, n[2] / l];
    const a = this._a(mat); const U = uvs || [proy(A, n), proy(B, n), proy(C, n)]; this._v(a, A, n, U[0]); this._v(a, B, n, U[1]); this._v(a, C, n, U[2]);
  }
  // caja en coordenadas de planta: (x, y) esquina, z base; w a lo largo de x, d a lo largo de y, h de alto
  caja(mat, x, y, z, w, d, h, o) {
    if (!mat || !(w > 1e-5 && d > 1e-5 && h > 1e-5)) return;
    const X0 = x, X1 = x + w, Y0 = z, Y1 = z + h, Z0 = y, Z1 = y + d; const rot = o && o.rot;
    const q = (A, B, C, D, n) => this.quad(mat, A, B, C, D, n, rot && n[1] ? [A, B, C, D].map((p) => [p[2], p[0]]) : null);
    q([X1, Y0, Z0], [X1, Y1, Z0], [X1, Y1, Z1], [X1, Y0, Z1], [1, 0, 0]);
    q([X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0], [-1, 0, 0]);
    q([X0, Y1, Z0], [X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0], [0, 1, 0]);
    if (!(o && o.sinBase)) q([X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0, Z1], [X0, Y0, Z1], [0, -1, 0]);
    q([X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1], [0, 0, 1]);
    q([X0, Y0, Z0], [X0, Y1, Z0], [X1, Y1, Z0], [X1, Y0, Z0], [0, 0, -1]);
  }
  geo(mat, geom, mtx) {
    if (!mat) return;
    const g = geom.index ? geom.toNonIndexed() : geom; const P = g.attributes.position, N = g.attributes.normal; _m3.getNormalMatrix(mtx); const a = this._a(mat);
    for (let i = 0; i < P.count; i++) { _v.fromBufferAttribute(P, i).applyMatrix4(mtx); _n.fromBufferAttribute(N, i).applyMatrix3(_m3).normalize(); const p = [_v.x, _v.y, _v.z], n = [_n.x, _n.y, _n.z]; this._v(a, p, n, proy(p, n)); }
    if (g !== geom) g.dispose();
  }
  mallas(grupo, sombra = true, depth = null) {
    for (const [mat, a] of this.m) {
      if (!a.p.length) continue;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(a.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(a.u, 2));
      g.setAttribute('pieza', new THREE.Float32BufferAttribute(a.k, 1)); g.computeBoundingSphere();
      const me = new THREE.Mesh(g, mat); const tr = mat.transparent || mat.transmission > 0 || mat.userData.sinSombra;
      me.castShadow = sombra && !tr; me.receiveShadow = true; me.name = mat.name; if (depth && me.castShadow) me.customDepthMaterial = depth; grupo.add(me);
    }
    this.m.clear(); return grupo;
  }
}

// Geometrías unitarias para el mobiliario (se transforman y se funden en el lote).
let UNIT = null;
const unidad = () => (UNIT || (UNIT = { cil: new THREE.CylinderGeometry(0.5, 0.5, 1, 24), esf: new THREE.SphereGeometry(0.5, 18, 12) }));

// Vegetación low-poly instanciada: copas de árbol (frondoso, ciprés, olivo, pino), matas, gramíneas, rocas, losas.
let COPAS = null;
function copas() {
  if (COPAS) return COPAS;
  const bulto = (det, sx, sy, sz, dx, dy, dz, amp, s) => {
    const g = new THREE.IcosahedronGeometry(1, det); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const f = 1 + amp * Math.sin(x * 3.1 + s) * Math.cos(y * 2.7 + s * 0.7) * Math.sin(z * 3.3 + s * 1.3); p.setXYZ(i, x * f * sx + dx, y * f * sy + dy, z * f * sz + dz); }
    g.computeVertexNormals(); return g;
  };
  const cip = bulto(2, 0.34, 1, 0.34, 0, 0, 0, 0.12, 6); const p = cip.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); const t = 1 - 0.55 * suave(-0.6, 1, y); p.setX(i, p.getX(i) * t); p.setZ(i, p.getZ(i) * t); }
  cip.computeVertexNormals();
  // gramínea: abanico de hojas finas
  const hojas = []; for (let i = 0; i < 9; i++) { const c = new THREE.ConeGeometry(0.035, 1, 3, 1, true); c.translate(0, 0.5, 0); const a = (i / 9) * Math.PI * 2, inc = 0.25 + (i % 3) * 0.12; c.rotateZ(inc); c.rotateY(a); c.scale(1, 0.75 + (i % 4) * 0.08, 1); hojas.push(c); }
  const gram = mergeGeometries(hojas.map((h) => h.toNonIndexed())); gram.computeVertexNormals();
  const roca = bulto(1, 1, 0.6, 0.85, 0, 0.25, 0, 0.18, 11);
  COPAS = {
    frondoso: mergeGeometries([bulto(2, 1, 0.9, 1, 0, 0, 0, 0.16, 1), bulto(1, 0.7, 0.6, 0.7, 0.55, 0.25, 0.2, 0.2, 2), bulto(1, 0.65, 0.6, 0.65, -0.5, 0.2, -0.3, 0.2, 3), bulto(1, 0.6, 0.55, 0.6, 0.1, 0.45, -0.5, 0.2, 4), bulto(1, 0.6, 0.5, 0.6, -0.2, -0.25, 0.55, 0.2, 5)]),
    cipres: cip,
    olivo: mergeGeometries([bulto(1, 0.8, 0.45, 0.8, 0, 0, 0, 0.25, 7), bulto(1, 0.6, 0.4, 0.6, 0.6, 0.15, 0.3, 0.25, 8), bulto(1, 0.55, 0.4, 0.55, -0.55, 0.1, -0.25, 0.25, 9)]),
    pino: mergeGeometries([bulto(1, 1, 0.32, 1, 0, 0, 0, 0.22, 12), bulto(1, 0.62, 0.26, 0.62, 0.45, 0.12, 0.2, 0.2, 13), bulto(1, 0.6, 0.24, 0.6, -0.4, 0.08, -0.3, 0.2, 14)]),
    mata: bulto(1, 1, 0.8, 1, 0, 0.35, 0, 0.22, 15),
    gram, roca,
    losa: new THREE.CylinderGeometry(0.5, 0.5, 1, 9).translate(0, 0.5, 0),
    tronco: new THREE.CylinderGeometry(0.35, 0.5, 1, 7).translate(0, 0.5, 0),
  };
  for (const g of Object.values(COPAS)) g.userData.compartida = true;
  return COPAS;
}

function nuevoCielo(disco) {
  const s = new Sky(); const m = s.material; m.uniforms.brillo = { value: 1 };
  let f = 'uniform float brillo;\n' + m.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * brillo, 1.0 );');
  if (!disco) f = f.replace('L0 += ( vSunE * 19000.0 * Fex ) * sundisk;', '');
  m.fragmentShader = f; return s;
}
// ---- texturas de cerramientos de parcela (v.1) ----
// Bloque de hormigón 40 × 20 cm a rompejuntas, con llagas marcadas.
const texBloque = () => textura('bloque', 1.6, 512, (g, gb, n, k, R) => {
  const bw = 0.4 * k, bh = 0.2 * k, j = 3; g.fillStyle = '#8e8a83'; g.fillRect(0, 0, n, n); gb.fillStyle = '#383838'; gb.fillRect(0, 0, n, n);
  for (let f = 0; f < Math.round(n / bh); f++) for (let c = -1; c <= Math.round(n / bw); c++) {
    const x = c * bw + (f % 2 ? bw / 2 : 0), y = f * bh; const l = 63 + R() * 9;
    for (const dx of [0, n]) { g.fillStyle = hsl(40, 4 + R() * 4, l); g.fillRect(x + j - dx, y + j, bw - j, bh - j); gb.fillStyle = '#b4b4b4'; gb.fillRect(x + j - dx, y + j, bw - j, bh - j); }
  }
  for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},${(0.04 + R() * 0.08).toFixed(3)})`; g.fillRect(R() * n, R() * n, 1 + R() * 1.5, 1 + R() * 1.5); }
  modular(g, n, ruido(n, 6, 6, 4, sem(R)), 0.08);
});
// Malla de simple torsión: rombos de 5 cm en alambre (fondo transparente; se tiñe con el color del material).
const texMalla = () => textura('mallaST', 0.5, 512, (g, gb, n) => {
  const s = n / 10; g.strokeStyle = '#ffffff'; g.lineWidth = 2.4; g.lineCap = 'round';
  for (let i = -12; i <= 22; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s + n, n); g.stroke(); g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s - n, n); g.stroke(); }
  return false;
});
// Rejilla electrosoldada de gavión: 10 × 10 cm.
const texRejilla = () => textura('rejillaG', 1, 256, (g, gb, n) => {
  g.fillStyle = '#ffffff'; const s = n / 10; for (let i = 0; i < 10; i++) { g.fillRect(i * s, 0, 2, n); g.fillRect(0, i * s, n, 2); } g.fillRect(0, 0, 4, n); g.fillRect(0, 0, n, 4);
  return false;
});

// geometría plana en planta
const enPoli =(x, y, P) => { let d = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi) d = !d; } return d; };
const dSeg = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1; const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2, 0, 1); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
const dBorde = (x, y, P) => { let m = Infinity; for (let i = 0; i < P.length; i++) m = Math.min(m, dSeg(x, y, P[i], P[(i + 1) % P.length])); return m; };

// ---------------------------------------------------------------------------------------------------------
export class Visor {
  constructor(el, opt = {}) {
    this.el = el; this.opt = Object.assign({ maqueta: false, alpha: false, sinBucle: false, pixelRatio: null, mundo: 'paisaje', calidadAdaptativa: true }, opt);
    this._glBaja = glAlta('visor', () => { if (!this._fin) this.dispose(); }); // modo ligero: si ya hay 2 WebGL vivos, se suelta el más antiguo antes de crear este
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!this.opt.alpha, preserveDrawingBuffer: true, powerPreference: LIGERO ? 'low-power' : 'high-performance' }));
    if (this.opt.alpha) r.setClearColor(0x000000, 0);
    // resolución: fija si se pide; si no, min(2, dpr) con calidad adaptativa (baja por escalones si el giro va lento)
    const prFijo = Number(this.opt.pixelRatio) > 0 ? clamp(Number(this.opt.pixelRatio), 0.5, 4) : null;
    this.pr = Math.min(LIGERO ? PR_LIGERO : Infinity, prFijo || Math.min(2, window.devicePixelRatio || 1)); this._prMax = this.pr; this._prAuto = this.pr;
    this._adapt = !prFijo && this.opt.calidadAdaptativa !== false && !this.opt.sinBucle; this._q = { ema: 0, n: 0, rapido: 0, directo: false, tPrev: 0 };
    r.setPixelRatio(this.pr);
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = false; this._sombra = true; // la sombra solo se recalcula si cambia algo (sol, modelo, visibilidad, montaje), no al girar
    r.toneMapping = THREE.AgXToneMapping; r.toneMappingExposure = 1.0; el.appendChild(r.domElement);
    this.scene = new THREE.Scene(); this.scene.fog = new THREE.Fog('#dfe7ea', 220, 1500);
    this.cam = new THREE.PerspectiveCamera(42, 1, 0.1, 2800);
    this.ctl = new OrbitControls(this.cam, r.domElement); this.ctl.enableDamping = !this.opt.sinBucle; this.ctl.maxPolarAngle = Math.PI / 2 - 0.02; this.ctl.addEventListener('change', () => this.pedir());
    this.ctl.addEventListener('start', () => { this.ctl.autoRotate = false; }); // el usuario manda: se acaba el giro suave del montaje
    // cielo físico (visible) y su copia sin disco solar para la luz de entorno (PMREM)
    this.sky = nuevoCielo(true); this.sky.scale.setScalar(2400); this.scene.add(this.sky);
    this.envScene = new THREE.Scene(); this.envSky = nuevoCielo(false); this.envSky.scale.setScalar(800); this.envScene.add(this.envSky);
    // suelo cálido en el entorno: la luz rebotada del terreno compensa el azul del cielo en los interiores
    this.envSuelo = new THREE.Mesh(new THREE.CircleGeometry(600, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#000000' })); this.envSuelo.position.y = -2; this.envScene.add(this.envSuelo);
    this.pmrem = new THREE.PMREMGenerator(r); this._envRT = null; this._envSucio = true;
    this.hemi = new THREE.HemisphereLight('#dfe9f5', '#a49a85', 0.5); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff4e2', 3.0); this.sun.castShadow = true;
    const sm = LIGERO ? 1024 : r.capabilities.maxTextureSize >= 8192 ? 4096 : 2048; this.sun.shadow.mapSize.set(sm, sm); this.sun.shadow.bias = -0.0002; this.sun.shadow.normalBias = 0.025;
    this.scene.add(this.sun, this.sun.target);
    // luces de interior (número fijo: no recompila sombreadores): luz de ventana, rebote del sol y lámparas
    this.lucesInt = []; for (let i = 0; i < 4; i++) { const l = new THREE.PointLight('#ffffff', 0, 7, 1.6); this.scene.add(l); this.lucesInt.push(l); }
    // montaje: textura de desplazamientos por pieza (compartida por todos los materiales de la casa)
    this._U = { tex: { value: null }, activo: { value: 0 }, tam: { value: new THREE.Vector2(256, 1) } };
    this._depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); inyectarMontaje(this._depth, this._U);
    this.casa = new THREE.Group(); this.sitio = new THREE.Group(); this.scene.add(this.sitio, this.casa);
    this.mes = 2; this.hora = 11; this.lat = 40.4; this.lon = -3.7; this.noche = 0; this.sinTecho = false; this.nivel = 0; this._pend = false;
    this.estado = { modo: 'exterior', nivel: 0, corte: true }; this.niv = []; this.luces = []; this.fuegos = []; this.muebles = []; this.geos = []; this._mats = []; this._pz = [null]; this._int = null;
    this._ro = new ResizeObserver(() => this.ajustar()); this._ro.observe(el);
    this.post = null; this.ajustar(); this.listo = this._initPost();
    // bucle: pinta solo si algo cambia (rápido mientras se mueve; con oclusión al quedarse quieto). Con sinBucle no hay
    // bucle propio: el montaje lanza uno temporal mientras dura (_bucleMontaje).
    const loop = () => {
      if (this._fin) return; requestAnimationFrame(loop);
      if (this._comp) return; // shaders compilándose en paralelo (_precompilar): se pinta en cuanto estén
      const t = performance.now(); if (this._mont) this._pasoMontaje(t);
      if (this._alF?.size) this._invitados(t); else this._tInv = 0;
      const mov = this.ctl.update();
      if (mov || this._pend) { this._pend = false; this._medir(t); this.render(false); this._tq = this._mont ? 0 : t + 220; }
      else { this._q.tPrev = 0; if (this._tq && t > this._tq) { this._tq = 0; if (this.post) this.render(true); } }
    };
    if (!this.opt.sinBucle) loop();
  }
  pedir() { this._pend = true; }
  get zoc() { return this._zoc ?? ZOC; } // cota del suelo de planta baja: 12 cm de zócalo o, con forjado sanitario, cámara + forjado (v.1.6)
  // ---- Invitados en la escena (Hilván 3D, app/js/hilvan.js). API aditiva: no cambia nada del visor si no se usa. ----
  // escena() → { THREE, scene, camera, renderer, controles, casa, sitio, raiz, metro: 1, puntos, sueloEn } o null sin
  //   modelo. Mundo en metros, Y arriba. puntos (cacheados por modelo): puerta { fuera, umbral, dentro, normal, lado },
  //   piscina { centro, borde, fuera, agua, normal }, porche y terraza { centro, interior, exterior, normal },
  //   cubierta { centro }, centro. Si la casa se reconstruye (setModelo), raiz cambia: los invitados lo comprueban.
  // alFotograma(fn) → quitar(): fn(dt, t) en cada vuelta del bucle; si devuelve true, ese fotograma se repinta.
  // sueloEn(x, z, desde) → cota (m) de la primera superficie visible de la casa o del sitio bajo (x, z) desde «desde».
  escena() {
    if (!this.modelo || !this.raiz || this._fin) return null;
    return { THREE, scene: this.scene, camera: this.cam, renderer: this.renderer, controles: this.ctl, casa: this.casa, sitio: this.sitio, raiz: this.raiz, metro: 1, noche: this.noche || 0, puntos: this._puntos(), sueloEn: (x, z, d) => this.sueloEn(x, z, d), alFotograma: (fn) => this.alFotograma(fn) };
  }
  alFotograma(fn) { if (typeof fn !== 'function') return () => {}; (this._alF ||= new Set()).add(fn); this.pedir(); return () => { this._alF?.delete(fn); this.pedir(); }; }
  _invitados(t) {
    const dt = this._tInv ? Math.min(0.25, (t - this._tInv) / 1000) : 1 / 60; this._tInv = t; // tiempo real (hasta 0,25 s): el invitado subdivide
    for (const f of [...this._alF]) { try { if (f(dt, t)) this._pend = true; } catch (e) { console.warn('Visor 3D: invitado retirado.', e); this._alF.delete(f); } }
  }
  sueloEn(x, z, desde = 60) {
    const rc = (this._rcSuelo ||= new THREE.Raycaster()); rc.set(new THREE.Vector3(x, desde, z), new THREE.Vector3(0, -1, 0)); rc.far = desde + 5;
    this.scene.updateMatrixWorld(); const vis = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
    const h = rc.intersectObjects([this.casa, this.sitio], true).find((i) => vis(i.object) && !i.object.isPoints && !i.object.isLine && !i.object.isSprite);
    return h ? h.point.y : 0;
  }
  _puntos() {
    if (this._ptsRaiz === this.raiz) return this._pts;
    const m = this.modelo, pts = {}; const L = { N: [0, -1], S: [0, 1], E: [1, 0], O: [-1, 0] };
    const enSuelo = (v, desde) => { v.y = this.sueloEn(v.x, v.z, desde); return v; };
    try {
      const ints = m.plantas[0].estancias.filter((e) => CAT.esInt(e.tipo)); const bx = ints.length ? bbox({ plantas: [{ estancias: ints }] }) : this.b;
      const hc = [(bx.x0 + bx.x1) / 2, (bx.y0 + bx.y1) / 2];
      pts.centro = enSuelo(this.mundo(hc[0], hc[1], 0), 2.2); pts.radio = Math.hypot(bx.x1 - bx.x0, bx.y1 - bx.y0) / 2 + 1.2; // para rodear la casa sin atravesarla
      const g0 = this.geos?.[0]; const ent = g0?.huecos?.find((h) => h.entrada) || g0?.huecos?.find((h) => h.tipo === 'puerta');
      if (ent && L[ent.lado]) { const d = L[ent.lado]; pts.puerta = { fuera: enSuelo(this.mundo(ent.x + d[0] * 1.5, ent.y + d[1] * 1.5, 0), 2.2), umbral: this.mundo(ent.x, ent.y, this.zoc), dentro: this.mundo(ent.x - d[0] * 1.4, ent.y - d[1] * 1.4, this.zoc), normal: this.dir(ent.lado).normalize(), lado: ent.lado, ancho: ent.ancho }; }
      const pis = this._piscinas?.[0];
      if (pis) {
        const c = [pis.x + pis.w / 2, pis.y + pis.h / 2]; const lados = pis.w >= pis.h ? [['N', [c[0], pis.y]], ['S', [c[0], pis.y + pis.h]]] : [['O', [pis.x, c[1]]], ['E', [pis.x + pis.w, c[1]]]];
        lados.sort((a, b) => Math.hypot(a[1][0] - hc[0], a[1][1] - hc[1]) - Math.hypot(b[1][0] - hc[0], b[1][1] - hc[1]));
        const [lado, q] = lados[0]; const d = L[lado]; const agua = 0.08 - 0.13;
        pts.piscina = { centro: this.mundo(c[0], c[1], agua), borde: this.mundo(q[0] + d[0] * 0.25, q[1] + d[1] * 0.25, 0.08), fuera: enSuelo(this.mundo(q[0] + d[0] * 1.8, q[1] + d[1] * 1.8, 0), 2.2), agua, normal: this.dir(lado).normalize() };
      }
      // exterior pegado a la casa (porche en planta baja, terraza arriba): punto junto a la fachada y punto al borde
      const exterior = (e, pi) => {
        const c = [e.x + e.w / 2, e.y + e.h / 2]; const dx = hc[0] - c[0], dy = hc[1] - c[1]; const hor = Math.abs(dx) / Math.max(e.w, 0.1) > Math.abs(dy) / Math.max(e.h, 0.1);
        const u = hor ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1]; const semi = hor ? e.w / 2 : e.h / 2; const z0 = pi * H_PLANTA + this.zoc + 1.5; // en planta baja, fuera del vuelo de la cubierta del porche (si no, desde la vista aérea no se ve); arriba, dentro de la barandilla
        const fe = pi ? semi * 0.6 : semi + 0.8, fb = pi ? semi * 0.5 : semi + 0.35;
        const lado = hor ? (u[0] > 0 ? 'O' : 'E') : (u[1] > 0 ? 'N' : 'S'); // lado del exterior hacia fuera (opuesto a la casa)
        return { centro: enSuelo(this.mundo(c[0], c[1], 0), z0), interior: enSuelo(this.mundo(c[0] + u[0] * semi * 0.7, c[1] + u[1] * semi * 0.7, 0), z0), exterior: enSuelo(this.mundo(c[0] - u[0] * fe, c[1] - u[1] * fe, 0), z0), borde: enSuelo(this.mundo(c[0] - u[0] * fb, c[1] - u[1] * fb, 0), z0), normal: this.dir(lado).normalize() };
      };
      const area = (e) => e.w * e.h;
      const por = m.plantas[0].estancias.filter((e) => e.tipo === 'porche' && !/cochera|bajo la planta/i.test(e.nombre || '')).sort((a, b) => area(b) - area(a))[0];
      if (por) pts.porche = exterior(por, 0);
      for (let pi = m.plantas.length - 1; pi >= 1 && !pts.terraza; pi--) { const t = m.plantas[pi].estancias.filter((e) => e.tipo === 'terraza').sort((a, b) => area(b) - area(a))[0]; if (t) pts.terraza = exterior(t, pi); }
      const np = m.plantas.length; const top = m.plantas[np - 1].estancias.filter((e) => CAT.esInt(e.tipo) && e.tipo !== 'doble_altura').sort((a, b) => area(b) - area(a))[0];
      if (top) { const v = this.mundo(top.x + top.w / 2, top.y + top.h / 2, 0); v.y = this.sueloEn(v.x, v.z, 80); if (v.y > 1) pts.cubierta = { centro: v }; }
      if (pts.puerta && this._hojaEntrada) pts.puerta.hoja = { abrir: (k) => this.abrirPuerta(k) };
      // bordes de la cubierta (para descolgarse): un punto arriba junto a cada fachada y dónde se llega abajo
      if (pts.cubierta) {
        const iT = m.plantas[np - 1].estancias.filter((e) => CAT.esInt(e.tipo)); const bt = bbox({ plantas: [{ estancias: iT }] }); const mx = (bt.x0 + bt.x1) / 2, my = (bt.y0 + bt.y1) / 2;
        pts.cubierta.bordes = [['N', mx, bt.y0], ['S', mx, bt.y1], ['O', bt.x0, my], ['E', bt.x1, my]].map(([lado, x, y]) => {
          const d = L[lado]; const arriba = this.mundo(x - d[0] * 0.45, y - d[1] * 0.45, 0); arriba.y = this.sueloEn(arriba.x, arriba.z, 80);
          const abajo = this.mundo(x + d[0] * 0.75, y + d[1] * 0.75, 0); abajo.y = this.sueloEn(abajo.x, abajo.z, Math.max(1, arriba.y - 0.6));
          const borde = this.mundo(x + d[0] * 0.05, y + d[1] * 0.05, 0); borde.y = arriba.y;
          return { lado, arriba, borde, abajo, normal: this.dir(lado).normalize() };
        }).filter((b) => b.arriba.y - b.abajo.y > 1.5);
      }
      // mobiliario exterior: tumbonas, barbacoas y fogoneros (cajas de cada pieza a partir de sus primitivas)
      const piezas = new Map(); (this.muebles || []).forEach((lista, pi) => { for (const it of lista || []) { if (!['tumbona', 'barbacoa', 'fogon'].includes(it.pieza)) continue; const k = pi + '|' + it.id; const q = piezas.get(k) || { pieza: it.pieza, pi, est: it.est, x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, z1: 0, brasa: null }; q.x0 = Math.min(q.x0, it.x); q.y0 = Math.min(q.y0, it.y); q.x1 = Math.max(q.x1, it.x + it.w); q.y1 = Math.max(q.y1, it.y + it.h); q.z1 = Math.max(q.z1, it.z0 + it.alto); if (it.fuego) q.brasa = it; piezas.set(k, q); } });
      const estDe = (pi, id) => m.plantas[pi]?.estancias.find((e) => e.id === id);
      for (const q of piezas.values()) {
        const z0 = q.pi * H_PLANTA + (q.pi ? this.zoc : 0); const cx = (q.x0 + q.x1) / 2, cy = (q.y0 + q.y1) / 2; const largoX = q.x1 - q.x0 >= q.y1 - q.y0;
        if (q.pieza === 'tumbona') {
          const a = largoX ? [q.x0 + 0.35, cy] : [cx, q.y0 + 0.35], b = largoX ? [q.x1 - 0.3, cy] : [cx, q.y1 - 0.3]; const lat = largoX ? [0, 1] : [1, 0];
          (pts.tumbonas ||= []).push({ centro: enSuelo(this.mundo(cx, cy, 0), z0 + 1.5), cabeza: this.mundo(...a, 0), pies: this.mundo(...b, 0), lado: enSuelo(this.mundo(cx + lat[0] * 0.75, cy + lat[1] * 0.75, 0), z0 + 1.2), alto: z0 + 0.36 });
        } else {
          const e = estDe(q.pi, q.est); const ec = e ? [e.x + e.w / 2, e.y + e.h / 2] : [hc[0], hc[1]];
          let dx = ec[0] - cx, dy = ec[1] - cy; if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl; if (!dx && !dy) dy = 1;
          const fondo = Math.abs(dx) ? (q.x1 - q.x0) / 2 : (q.y1 - q.y0) / 2; const br = q.brasa ? [q.brasa.x + q.brasa.w / 2, q.brasa.y + q.brasa.h / 2, z0 + q.brasa.z0 + 0.06] : [cx, cy, z0 + q.z1];
          (pts.fuegos ||= []).push({ tipo: q.pieza, centro: this.mundo(cx, cy, z0), frente: enSuelo(this.mundo(cx + dx * (fondo + 0.5), cy + dy * (fondo + 0.5), 0), z0 + 1.6), brasa: this.mundo(br[0], br[1], br[2]), radio: fondo });
        }
      }
      // ventanas de las plantas altas (para saludar desde dentro): punto dentro, junto al vidrio, mirando fuera
      for (let pi = 1; pi < m.plantas.length; pi++) for (const h of this.geos?.[pi]?.huecos || []) {
        if (!['ventanal', 'ventana'].includes(h.tipo) || !L[h.lado] || (h.alf || 0) > 0.95) continue; const d = L[h.lado]; const zf = pi * H_PLANTA + this.zoc;
        const dentro = this.mundo(h.x - d[0] * 0.42, h.y - d[1] * 0.42, 0); dentro.y = this.sueloEn(dentro.x, dentro.z, zf + 1.3);
        if (Math.abs(dentro.y - zf) > 0.5) continue; (pts.ventanas ||= []).push({ dentro, normal: this.dir(h.lado).normalize(), tipo: h.tipo, alf: h.alf || 0 });
      }
      // un punto del jardín (para regar), al lado contrario de la calle
      { const op = { N: 'S', S: 'N', E: 'O', O: 'E' }[m.acceso || 'N']; const d = L[op]; const r = Math.max(bx.x1 - bx.x0, bx.y1 - bx.y0) / 2 + 2.5; const j = this.mundo(hc[0] + d[0] * r, hc[1] + d[1] * r, 0); j.y = this.sueloEn(j.x, j.z, 2.2); pts.jardin = { punto: j, normal: this.dir(op).normalize() }; }
    } catch (e) { console.warn('Visor 3D: puntos de interés incompletos.', e); }
    this._ptsRaiz = this.raiz; this._pts = pts; return pts;
  }
  sombraSucia() { this._sombra = true; this.pedir(); } // si se toca la escena desde fuera (piezas, peanas…), recalcular la sombra
  get montando() { return !!this._mont; }
  // Render a demanda (miniaturas, capturas en lote): pinta ya un fotograma y devuelve el canvas.
  renderAhora({ calidad = true } = {}) { if (this._fin) return null; this.ctl.update(); this.render(!!calidad); return this.renderer.domElement; }
  // Vista actual: nombre de la vista, modo (exterior | planta | interior), nivel, corte, estancia y cámara.
  get vistaActual() {
    const st = this.estado || {}; const I = this._int;
    return { nombre: this._vista || null, modo: I ? 'interior' : st.modo || 'exterior', nivel: st.nivel ?? 0, corte: st.corte !== false, estancia: I?.e?.id || null, mundo: this._mundo || 'paisaje',
      camara: { posicion: this.cam.position.toArray(), objetivo: this.ctl.target.toArray(), fov: this.cam.fov } };
  }
  // Cámara explícita (Estudio de imagen · capturas estándar y repetir una captura): pos y obj en mundo, fov vertical.
  // Con «estancia», modo interior de esa estancia (luces de ventana y sombra ajustada); sin ella, exterior completo.
  ponerCamara({ pos, obj, fov = 42 } = {}, { estancia = null, vista = null } = {}) {
    if (!this.modelo || !Array.isArray(pos) || !Array.isArray(obj)) return false;
    if (this._mont) this.detenerMontaje(); this._anim = (this._anim || 0) + 1; // corta una transición en curso
    let hit = null; if (estancia) this.modelo.plantas.forEach((p, pi) => { const e = p.estancias.find((q) => q.id === estancia); if (e && !hit) hit = { e, pi }; });
    const interior = !!hit; this._vista = vista || (interior ? 'estancia' : 'manual');
    this.estado = { modo: 'exterior', nivel: this.estado.nivel, corte: true }; this._int = hit;
    this._encuadreSombra(); this._ajusteInterior(); this.aplicarVisibilidad(); this._aoModo(interior);
    this.cam.fov = clamp(Number(fov) || 42, 10, 100); this.cam.near = interior ? 0.05 : 0.1; this.cam.updateProjectionMatrix();
    this.ctl.minDistance = interior ? 0.05 : 0.5; this.ctl.maxDistance = interior ? 8 : 900; this.ctl.maxPolarAngle = interior ? Math.PI * 0.9 : Math.PI / 2 - 0.02;
    const P = new THREE.Vector3().fromArray(pos), Q = new THREE.Vector3().fromArray(obj);
    if (interior) Q.sub(P).normalize().multiplyScalar(0.8).add(P); // pivote a 0,8 m: girar la cabeza sin salir de la estancia
    this.cam.position.copy(P); this.ctl.target.copy(Q); this.ctl.update(); this.pedir(); return true;
  }
  // Calidad adaptativa: media móvil del tiempo entre fotogramas seguidos mientras se mueve la cámara. Por debajo de
  // ~38 fps baja la resolución en escalones de 0,25 (hasta 1) y, como último escalón, pinta sin posproceso al moverse
  // (MSAA nativo); si va sobrada varios segundos, sube de nuevo hasta la resolución de partida.
  _medir(t) {
    const q = this._q; const dt = q.tPrev ? t - q.tPrev : 0; q.tPrev = t;
    if (!this._adapt || this._mont || !(dt > 0 && dt < 250) || this.pr !== this._prAuto || document.visibilityState !== 'visible') return;
    q.ema = q.n ? q.ema * 0.92 + dt * 0.08 : dt; q.n++;
    if (q.n < 40) return;
    if (q.ema > 26) {
      if (this.pr > 1) { q.fallo = Math.min(q.fallo || Infinity, this.pr); this.pr = this._prAuto = Math.max(1, this.pr - 0.25); this.ajustar(); }
      else if (!q.directo) q.directo = true;
      q.n = 0; q.rapido = 0;
    } else if (q.ema < 18) { // ≥ 55 fps sostenidos: se recupera un escalón (nunca el que ya falló: sin vaivén)
      if (++q.rapido > 360) { if (q.directo) q.directo = false; else if (this.pr + 0.25 < Math.min(this._prMax + 1e-6, q.fallo || Infinity)) { this.pr = this._prAuto = this.pr + 0.25; this.ajustar(); } q.n = 0; q.rapido = 0; }
    } else q.rapido = 0;
  }
  ajustar() {
    const w = this.el.clientWidth || (LIGERO ? 320 : 800), h = this.el.clientHeight || (LIGERO ? 200 : 500); const r = this.renderer; // modo ligero: contenedor oculto → lienzo pequeño
    r.setPixelRatio(this.pr); r.setSize(w, h, false); r.domElement.style.cssText = 'width:100%;height:100%;display:block';
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    if (this.post) { this.post.comp.setPixelRatio(this.pr); this.post.comp.setSize(w, h); if (this.post.acabado) this.post.acabado.uniforms.uAsp.value = w / h; }
    this.pedir();
  }
  // Oclusión ambiental (GTAO) + SMAA + salida con tono. Si algo falla, se renderiza directo.
  async _initPost() {
    if (LIGERO) { this.post = null; return; } // modo ligero: render directo (MSAA nativo), sin GTAO ni SMAA ni acabado
    try {
      const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { SMAAPass }, { OutputPass }, { ShaderPass }] = await Promise.all([
        import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'), import('three/addons/postprocessing/GTAOPass.js'),
        import('three/addons/postprocessing/SMAAPass.js'), import('three/addons/postprocessing/OutputPass.js'), import('three/addons/postprocessing/ShaderPass.js')]);
      if (this._fin) return;
      const w = this.el.clientWidth || 800, h = this.el.clientHeight || 500;
      const comp = new EffectComposer(this.renderer); comp.setPixelRatio(this.pr); comp.setSize(w, h);
      comp.addPass(new RenderPass(this.scene, this.cam));
      const ao = new GTAOPass(this.scene, this.cam, w * this.pr, h * this.pr); ao.output = GTAOPass.OUTPUT.Default; ao.blendIntensity = 1;
      ao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 2, thickness: 2, scale: 1.8, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
      ao.updatePdMaterial?.({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
      comp.addPass(ao); const smaa = new SMAAPass(w * this.pr, h * this.pr); comp.addPass(smaa); comp.addPass(new OutputPass());
      // acabado sobrio (tras el tono, en sRGB): curva de contraste suave, algo de saturación, viñeta ligera y tramado
      // contra las bandas del cielo. Solo con cielo visible: en maqueta, estudio o fondo transparente no se aplica.
      const acabado = new ShaderPass({
        uniforms: { tDiffuse: { value: null }, uVin: { value: 0.16 }, uAsp: { value: w / h } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform sampler2D tDiffuse; uniform float uVin; uniform float uAsp; varying vec2 vUv;
          void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 k = clamp(c.rgb, 0.0, 1.0);
            k = mix(k, k * k * (3.0 - 2.0 * k), 0.14); float l = dot(k, vec3(0.2126, 0.7152, 0.0722)); k = clamp(mix(vec3(l), k, 1.06), 0.0, 1.0);
            vec2 d = (vUv - 0.5) * vec2(uAsp, 1.0) / max(uAsp, 1.0); k *= 1.0 - uVin * smoothstep(0.32, 0.92, length(d) * 1.35);
            k += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
            gl_FragColor = vec4(k, c.a); }`,
      });
      comp.addPass(acabado);
      this.post = { comp, ao, smaa, acabado }; this.ajustar(); this._aoModo(!!this._int);
    } catch (e) { console.warn('Visor 3D: sin posproceso (se renderiza directo).', e); this.post = null; }
  }
  // Oclusión ambiental según la escena: dentro, radio corto (rincones y rodapiés sin halos); fuera, más amplio (asiento
  // de la casa en el terreno, aleros, celosías).
  _aoModo(interior) {
    const ao = this.post?.ao; if (!ao || this._aoInt === interior) return; this._aoInt = interior;
    ao.updateGtaoMaterial(interior ? { radius: 0.5, scale: 1.5, thickness: 1.2, distanceExponent: 1.6 } : { radius: 1.1, scale: 1.8, thickness: 2.4, distanceExponent: 2 });
  }
  render(calidad = true) {
    if (this._envSucio) this.actualizarEnv();
    if (this._hojaEntrada) this._hojaEntrada.g.visible = !this._mont && this.estado?.modo !== 'planta'; // en el montaje y en planta, como el resto de la carpintería
    const ag = this.M?.agua?.normalMap; if (ag && this._hayAgua) { const s = performance.now() / 1000; ag.offset.set(s * 0.011, s * 0.007); }
    if (this._sombra || calidad || this._mont) { this.renderer.shadowMap.needsUpdate = true; this._sombra = false; }
    const p = this.post;
    if (p && !(this._q.directo && !calidad)) {
      p.ao.enabled = calidad && !this.opt.sinAO && !this._mont;
      p.acabado.enabled = !this.opt.alpha && !this.opt.sinAcabado && this.sky.visible && this.scene.background == null;
      try { p.comp.render(); return; } catch (e) { console.warn('Visor 3D: posproceso desactivado.', e); this.post = null; }
    }
    this.renderer.render(this.scene, this.cam);
  }
  actualizarEnv() {
    this._envSucio = false;
    try {
      const rt = this.pmrem.fromScene(this.envScene, 0, 1, 2000); if (this._envRT) this._envRT.dispose(); this._envRT = rt; this.scene.environment = rt.texture;
    } catch (e) { console.warn('Visor 3D: sin luz de entorno.', e); }
    if (this.opt.maqueta || this._mundo === 'estudio' || this.scene.background) return;
    // la niebla toma el color del cielo en el horizonte: el terreno se funde con el cielo sin línea
    try {
      if (!this._rtH) { this._rtH = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType }); this._camH = new THREE.PerspectiveCamera(16, 1, 1, 2000); }
      const sp = this.envSky.material.uniforms.sunPosition.value; const az = Math.atan2(sp.z, sp.x) + Math.PI / 2;
      this._camH.position.set(0, 0, 0); this._camH.lookAt(Math.cos(az), 0.04, Math.sin(az)); this._camH.updateMatrixWorld();
      const r = this.renderer, prev = r.getRenderTarget(); r.setRenderTarget(this._rtH); r.render(this.envScene, this._camH); r.setRenderTarget(prev);
      const b = new Uint16Array(64); r.readRenderTargetPixels(this._rtH, 0, 0, 4, 4, b);
      let cr = 0, cg = 0, cb = 0; for (let i = 0; i < 16; i++) { cr += THREE.DataUtils.fromHalfFloat(b[i * 4]); cg += THREE.DataUtils.fromHalfFloat(b[i * 4 + 1]); cb += THREE.DataUtils.fromHalfFloat(b[i * 4 + 2]); }
      if (isFinite(cr + cg + cb)) this.scene.fog.color.setRGB(cr / 16, cg / 16, cb / 16, THREE.LinearSRGBColorSpace);
    } catch (e) { /* sin lectura de color: se queda la niebla anterior */ }
  }
  dispose() {
    this._fin = true; this._mont = null; this._ro.disconnect(); this.limpiar(this.casa); this.limpiar(this.sitio); this._liberarMats();
    try { this.post?.comp.dispose(); this.post?.ao.dispose?.(); this.post?.smaa.dispose?.(); this.post?.acabado?.dispose?.(); } catch (e) { /* nada */ }
    if (this._cable) { this._cable.geometry.dispose(); this._cable.material.dispose(); this._cable = null; }
    for (const k of ['_estudio', '_captor']) if (this[k]) { this[k].geometry.dispose(); this[k].material.dispose(); this[k] = null; }
    this._envRT?.dispose(); this._rtH?.dispose(); this.pmrem.dispose(); this.envSuelo.geometry.dispose(); this.envSuelo.material.dispose(); this.sky.material.dispose(); this.envSky.material.dispose();
    this._U.tex.value?.dispose(); this._depth.dispose(); try { this.ctl.dispose(); } catch { /* nada */ }
    this._glBaja?.(); this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch { /* ya perdido */ } this.renderer.domElement.remove(); // libera el contexto WebGL al momento: si no, se acumulan al cambiar de vista («Too many active WebGL contexts»)
  }
  limpiar(g) { g.traverse((o) => { if (o.geometry && !o.geometry.userData.compartida) o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); }); g.clear(); }
  _liberarMats() { if (this.M) for (const m of new Set(Object.values(this.M))) m.dispose(); for (const m of this._mats) m.dispose(); this._mats = []; this.M = null; }

  // ------------------------------------------------------------------------------------------------------
  setModelo(modelo, ctx = {}) {
    this.detenerMontaje();
    this.modelo = modelo; this.ctx = ctx || {};
    if (this.ctx.lat) { this.lat = this.ctx.lat; this.lon = this.ctx.lon ?? this.lon; }
    this.limpiar(this.casa); this.limpiar(this.sitio); this._liberarMats();
    const mq = this.opt.maqueta; this.M = materiales(modelo, mq, this._U); this.b = bbox(modelo); this._zoc = esSanitario(modelo) ? Math.max(ZOC, cotaPB(modelo)) : ZOC;
    this.construir();
    const casa = this.ctx.casa, parcela = this.ctx.parcela;
    if (parcela && casa) { this.casa.position.set(casa.x, 0, -casa.y); this.casa.rotation.y = -rad(casa.giro || 0); } else { this.casa.position.set(0, 0, 0); this.casa.rotation.y = 0; }
    this.casa.updateMatrixWorld(true);
    try { this.entorno(parcela); } catch (e) { console.warn('Visor 3D: entorno incompleto.', e); }
    this._aplicarFondo();
    const n = modelo.plantas.length; if (this.estado.nivel >= n) this.estado.nivel = n - 1;
    if (this._int && !modelo.plantas[this._int.pi]?.estancias.some((q) => q.id === this._int.e.id)) this._int = null;
    else if (this._int) this._int.e = modelo.plantas[this._int.pi].estancias.find((q) => q.id === this._int.e.id);
    this.aplicarVisibilidad(); this.setSol(this.mes, this.hora);
    if (!this._vista) this.vista('aerea', false);
    this.pedir(); this._precompilar();
  }
  // Rendimiento: compila los shaders nuevos en paralelo (KHR_parallel_shader_compile) antes de que el bucle vuelva a
  // pintar, para que la interfaz no se congele mientras el driver compila (en Windows/D3D11, segundos la primera vez).
  // Solo frena el bucle propio: render() directo (capturas, miniaturas, montaje) compila al momento como siempre.
  _precompilar() {
    const r = this.renderer; if (this.opt.sinBucle || !r?.compileAsync || !r.extensions?.has?.('KHR_parallel_shader_compile')) return;
    const yo = (this._comp = {}); const fin = () => { if (this._comp === yo) { this._comp = null; this.pedir(); } };
    try {
      const prev = r.getRenderTarget(); const rt = (this._rtComp ||= new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
      const ps = []; for (const d of [null, rt]) { r.setRenderTarget(d); ps.push(r.compileAsync(this.scene, this.cam)); } // lienzo y destino intermedio (posproceso, transmisión)
      r.setRenderTarget(prev); Promise.all(ps).then(fin, fin); setTimeout(fin, 20000);
    } catch { this._comp = null; }
  }

  // Mundo: «paisaje» (cielo físico, parcela, vegetación y contexto) o «estudio» (ciclorama neutro sin parcela, como el
  // modo Estudio del visor de la web de NANCA). Con alpha no hay cielo ni fondo; en maqueta, fondo de cartón.
  setMundo(nombre = 'paisaje') { this._mundo = nombre === 'estudio' ? 'estudio' : 'paisaje'; if (this.modelo) this._aplicarFondo(); return this._mundo; }
  _aplicarFondo() {
    if (!this._mundo) this._mundo = this.opt.mundo === 'estudio' ? 'estudio' : 'paisaje';
    const mq = this.opt.maqueta, est = this._mundo === 'estudio', al = !!this.opt.alpha; const fog = this.scene.fog;
    this.sky.visible = !mq && !est && !al;
    this.scene.background = al ? null : mq ? new THREE.Color('#e9e8e3') : est ? new THREE.Color('#e6e4de') : null;
    if (this.scene.background) fog.color.copy(this.scene.background);
    this.sitio.visible = !est && !this.ctx?.sinEntorno;
    const tam = this.b ? Math.max(this.b.w, this.b.h, (this.modelo?.plantas.length || 1) * H_PLANTA) : 20;
    if (est) {
      if (!this._estudio) { this._estudio = new THREE.Mesh(new THREE.CircleGeometry(700, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e2e0d9', roughness: 0.96 })); this._estudio.receiveShadow = true; this.scene.add(this._estudio); }
      this._estudio.position.set(this.casa.position.x, -0.02, this.casa.position.z); fog.near = 70 + tam * 2.5; fog.far = fog.near + 300;
    } else { fog.near = 220; fog.far = 1500; }
    if (this._estudio) this._estudio.visible = est;
    // fondo transparente sin entorno: «captor» de sombras (solo la sombra de la casa sobre el vacío, para miniaturas)
    const captor = al && !est && !this.sitio.visible;
    if (captor && !this._captor) { this._captor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.22 })); this._captor.receiveShadow = true; this.scene.add(this._captor); }
    if (this._captor) { this._captor.visible = captor; const s = tam * 4 + 40; this._captor.scale.set(s, 1, s); this._captor.position.set(this.casa.position.x, -0.01, this.casa.position.z); }
    this._envSucio = true; this._sombra = true; this.pedir();
  }

  // Pieza de montaje: fija la etiqueta de todos los lotes de la casa. st: etapa (orden CUEVA), x/y/z: centro en planta.
  _tag(k, st, x = 0, y = 0, z = 0) {
    let i = this._pzK.get(k); if (i == null) { i = this._pz.length; this._pz.push({ st, x, y, z, k }); this._pzK.set(k, i); }
    for (const L of this._LL) for (const l of Object.values(L)) l.tag = i; this._ext.tag = 0; return i;
  }
  _tag0() { for (const L of this._LL) for (const l of Object.values(L)) l.tag = 0; }
  // Caja vertical repartida por plantas (grupo de la planta en la que cae cada tramo) y partida por el plano de corte.
  cajaV(mat, x, y, zb, w, d, h, grupo = 'auto') {
    const LL = this._LL; let z = zb; const zt = zb + h;
    while (z < zt - 1e-4) {
      const pi = clamp(Math.floor((z - this.zoc + 1e-6) / H_PLANTA), 0, LL.length - 1); const z0 = pi * H_PLANTA + this.zoc;
      const fin = pi < LL.length - 1 ? Math.min(zt, z0 + H_PLANTA) : zt; const c = z0 + CORTE; const L = LL[pi];
      if (grupo !== 'auto') L[grupo].caja(mat, x, y, z, w, d, fin - z);
      else if (z < c - 1e-6 && fin > c + 1e-6) { L.base.caja(mat, x, y, z, w, d, c - z); L.alto.caja(mat, x, y, c, w, d, fin - c); }
      else (fin <= c + 1e-6 ? L.base : L.alto).caja(mat, x, y, z, w, d, fin - z);
      z = fin;
    }
  }

  construir() {
    const modelo = this.modelo, M = this.M, b = this.b; const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; const np = modelo.plantas.length;
    const raiz = (this.raiz = new THREE.Group()); raiz.position.set(-cx, 0, -cy); this.casa.add(raiz); this._hojaEntrada = null;
    const cel = (this.cel = modelo.plantas.map((p) => celdasPlanta(p).m));
    const geos = (this.geos = modelo.plantas.map((p, pi) => derivar(modelo, pi)));
    this.muebles = modelo.plantas.map((p, pi) => { try { return mobiliario(modelo, pi, geos[pi]); } catch (e) { console.warn('Visor 3D: mobiliario', e); return []; } });
    this.niv = []; this.luces = []; this.fuegos = []; this._pz = [null]; this._pzK = new Map(); this._piscinas = []; this._hayAgua = false;
    // Etapas de montaje (orden CUEVA), planta a planta: forjado → estructura y cerramiento (muros de fachada, pilares,
    // carpinterías exteriores) → módulos de interior (suelos, tabiques, baños/cocina/escalera como módulos, puertas,
    // mobiliario) → cubierta de esa planta en piezas (paneles/faldones, petos, grava y albardillas) → siguiente planta.
    // Al final, exteriores (suelos de terraza, piscina, barandillas, celosías, pérgolas) y, en el sitio, cerramientos de
    // parcela y jardín. Etapa = 10 + 20·planta + paso (deja hueco para nuevas etapas sin reordenar).
    const E0 = (pi) => 10 + 20 * pi; const EXT = E0(np);
    const ST = (this._ST = {
      pads: 0, muretes: 1, losa: (pi) => E0(pi), muro: (pi) => E0(pi) + 1, carp: (pi) => E0(pi) + 2,
      suelo: (pi) => E0(pi) + 3, tab: (pi) => E0(pi) + 4, modulo: (pi) => E0(pi) + 5, puertas: (pi) => E0(pi) + 6, mob: (pi) => E0(pi) + 7,
      cub: (pi) => E0(pi) + 8, peto: (pi) => E0(pi) + 9, remate: (pi) => E0(pi) + 10,
      ext: EXT, baranda: EXT + 1, celosia: EXT + 2, pergola: EXT + 3, cerr: EXT + 4, jardin: EXT + 5, fin: EXT,
    });
    // fases legibles (rótulos de alFase): k = fase de la web (0 cimentación · 1 forjado PB · 2 plantas · 3 cubierta · 4 exteriores)
    const nomP = (pi) => NOMBRES[pi] || 'Planta ' + pi; const cubTop = (pi) => pi === np - 1 || !(modelo.plantas[pi + 1]?.estancias || []).length;
    const fases = (this._fases = new Map([[0, { k: 0, nombre: 'Cimentación', planta: null }], [1, { k: 0, nombre: 'Cimentación · muretes del forjado sanitario', planta: null }]]));
    for (let pi = 0; pi < np; pi++) {
      const f = (k, nombre) => ({ k, nombre, planta: pi });
      fases.set(ST.losa(pi), f(pi ? 2 : 1, pi ? `${nomP(pi)} · forjado` : 'Planta baja · losa y forjado'));
      for (const s of [ST.muro(pi), ST.carp(pi)]) fases.set(s, f(2, `${nomP(pi)} · estructura y cerramiento`));
      for (const s of [ST.suelo(pi), ST.tab(pi), ST.modulo(pi), ST.puertas(pi), ST.mob(pi)]) fases.set(s, f(2, `${nomP(pi)} · módulos de interior`));
      for (const s of [ST.cub(pi), ST.peto(pi), ST.remate(pi)]) fases.set(s, cubTop(pi) ? f(3, 'Cubierta en piezas') : f(2, `${nomP(pi)} · cubierta y terrazas`));
    }
    for (const s of [ST.ext, ST.baranda, ST.celosia, ST.pergola]) fases.set(s, { k: 4, nombre: 'Exteriores · terrazas, celosías y pérgolas', planta: null });
    fases.set(ST.cerr, { k: 4, nombre: 'Exteriores · cerramientos de parcela', planta: null }); fases.set(ST.jardin, { k: 4, nombre: 'Exteriores · jardín', planta: null });
    ST.sot = { exc: 2, losa: 3, muro: 4, int: 5, mob: 6, rampa: 7, techo: 8 }; // v.1.6: sótano primero: excavación → losa → muros → interiores → rampa → forjado
    if (modelo.sotano?.estancias?.length) for (const [st, n] of [[2, 'excavación'], [3, 'losa de cimentación'], [4, 'muros de contención'], [5, 'tabiques y puertas'], [6, 'interiores'], [7, 'rampa de acceso'], [8, 'forjado de techo']]) fases.set(st, { k: 0, nombre: 'Sótano · ' + n, planta: -1 });
    const escSot = new Set((modelo.sotano?.estancias || []).filter((e) => e.tipo === 'escalera').map((e) => [e.x, e.y, e.w, e.h].join()));
    const ext = (this._ext = new Lote()); const med = new Set(modelo.medianeras || []);
    const LL = (this._LL = modelo.plantas.map(() => ({ base: new Lote(), alto: new Lote(), techo: new Lote(), corte: new Lote() })));
    const tag = (k, st, x, y, z) => this._tag(k, st, x, y, z);
    const plana = tipoCub(modelo) === 'plana';
    const optB = { pergola: !!(this.ctx.pergola || modelo.acabados?.pergola) }; this._optB = optB; this._XB = contextoBordes(modelo);
    const celdasDe = (e) => { const out = []; const i0 = Math.round(e.x / T), j0 = Math.round(e.y / T); for (let i = 0; i < Math.round(e.w / T); i++) for (let j = 0; j < Math.round(e.h / T); j++) out.push(K(i0 + i, j0 + j)); return out; };
    const enSeg = (s, h) => h.o === s.o && (s.o === 'h' ? Math.abs(h.y - s.y1) < 1e-6 && h.x > s.x1 && h.x < s.x2 : Math.abs(h.x - s.x1) < 1e-6 && h.y > s.y1 && h.y < s.y2);
    const humedo = (e) => !!e && ['bano', 'aseo', 'lavadero'].includes(e.tipo);
    const suelo = (e) => (['quincho', 'fogonero'].includes(e.tipo) ? M.losaExt : TIPOS[e.tipo].ext ? M.tarima : humedo(e) ? M.losa : ['garaje', 'instalaciones', 'trastero'].includes(e.tipo) ? M.hormigonSuelo : M.roble);
    const PRIV = new Set(['bano', 'aseo', 'lavadero', 'instalaciones', 'trastero', 'despensa', 'vestidor']);
    const candLuz = [];

    const sanitario = esSanitario(modelo);
    if (sanitario) this.forjadoSanitario(ext);
    // zapatas (solo se ven durante el montaje: quedan bajo la losa y el terreno)
    if (!sanitario) {
      const nodos = new Set(); const paso = Math.round(3 / T);
      for (const [k, e] of cel[0]) { if (TIPOS[e.tipo].vacio || e.tipo === 'piscina' || (TIPOS[e.tipo].ext && !TIPOS[e.tipo].cubierto)) continue; const [i, j] = k.split(',').map(Number); for (const [a, c] of [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]]) if (a % paso === 0 && c % paso === 0) nodos.add(K(a, c)); }
      if (modelo.sotano?.estancias?.length) { const cs = celdasPlanta(modelo.sotano).m; for (const n of [...nodos]) { const [i, j] = n.split(',').map(Number); if ([[i, j], [i - 1, j], [i, j - 1], [i - 1, j - 1]].some(([a, c]) => cs.has(K(a, c)))) nodos.delete(n); } } // v.1.6: bajo el sótano cimenta su losa
      for (const n of nodos) { const [i, j] = n.split(',').map(Number); const x = i * T, y = j * T; ext.tag = this._tag('z|' + n, ST.pads, x, y, 0); ext.tag = this._pzK.get('z|' + n); ext.caja(M.hormigon, x - 0.3, y - 0.3, -0.38, 0.6, 0.6, 0.36); }
      ext.tag = 0;
    }

    modelo.plantas.forEach((p, pi) => {
      const z0 = pi * H_PLANTA + this.zoc; const g = geos[pi]; const C = cel[pi], inf = cel[pi - 1], sup = cel[pi + 1]; const L = LL[pi];
      const interiorEn = (i, j) => { const q = C.get(K(i, j)); return q && esInt(q.tipo) && q.tipo !== 'doble_altura'; };
      const postes = (e, alto, mat, s = 0.12) => { // pilares en las esquinas que no tocan muro interior
        for (const [px, py] of [[e.x, e.y], [e.x + e.w, e.y], [e.x, e.y + e.h], [e.x + e.w, e.y + e.h]]) {
          const i = Math.round(px / T), j = Math.round(py / T);
          if ([[i, j], [i - 1, j], [i, j - 1], [i - 1, j - 1]].some(([a, c]) => interiorEn(a, c))) continue;
          tag(`p|${pi}|${px}|${py}`, ST.muro(pi), px, py, z0);
          L.base.caja(mat, px - s / 2 + (px === e.x ? 0.1 : -0.1), py - s / 2 + (py === e.y ? 0.1 : -0.1), z0, s, s, alto);
        }
      };
      for (const e of p.estancias) {
        const t = TIPOS[e.tipo]; if (!t) continue; const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2;
        if (e.tipo === 'piscina') { tag(`pis|${pi}|${e.id}`, ST.ext, ecx, ecy, z0); this.piscina(L.base, e, z0, pi); continue; }
        if (e.tipo === 'doble_altura') continue; // vacío: sin forjado ni suelo (su celosía va con los bordes de la planta)
        if (e.tipo === 'ascensor') { // v.1.5: hueco abierto entre plantas (solo el canto del forjado); foso, suelo y cabina en la parada más baja; casetón sobre cubierta plana
          const sobreAsc = pi > 0 && inf && celdasDe(e).every((k) => inf.get(k)?.tipo === 'ascensor');
          tag(`s|${pi}|${e.id}`, ST.losa(pi), ecx, ecy, z0);
          if (sobreAsc) { for (const r of [[e.x - 0.06, e.y - 0.06, e.w + 0.12, 0.12], [e.x - 0.06, e.y + e.h - 0.06, e.w + 0.12, 0.12], [e.x - 0.06, e.y, 0.12, e.h], [e.x + e.w - 0.06, e.y, 0.12, e.h]]) L.base.caja(M.forjado, r[0], r[1], z0 - E_FORJADO, r[2], r[3], E_FORJADO + 0.01); }
          else {
            if (pi === 0) L.base.caja(M.zocalo, e.x, e.y, -0.1, e.w, e.h, z0 + 0.1); else L.base.caja(M.forjado, e.x, e.y, z0 - E_FORJADO, e.w, e.h, E_FORJADO);
            L.base.caja(M.hormigonSuelo, e.x, e.y, z0, e.w, e.h, 0.01, { sinBase: true });
            tag(`esc|${pi}|asc-${e.id}`, ST.modulo(pi), ecx, ecy, z0); // cabina accesible (módulo)
            const cw = Math.max(0.4, e.w - 0.3), ch = Math.max(0.4, e.h - 0.3), hc = Math.min(2.2, H_TAB - 0.1);
            L.base.caja(M.lacado, e.x + (e.w - cw) / 2, e.y + (e.h - ch) / 2, z0 + 0.02, cw, ch, CORTE - 0.04);
            L.alto.caja(M.lacado, e.x + (e.w - cw) / 2, e.y + (e.h - ch) / 2, z0 + CORTE - 0.02, cw, ch, hc - CORTE + 0.02);
          }
          if (plana && !celdasDe(e).every((k) => sup?.get(k)?.tipo === 'ascensor') && !(sup && celdasDe(e).some((k) => sup.get(k) && !TIPOS[sup.get(k).tipo]?.vacio))) {
            tag(`cs|${pi}|${e.id}`, ST.cub(pi), ecx, ecy, z0 + H_PLANTA); L.alto.caja(M.fachada, e.x - 0.15, e.y - 0.15, z0 + H_PLANTA, e.w + 0.3, e.h + 0.3, 1.2);
          }
          continue;
        }
        if (t.vacio) {
          if (pi === 0) ext.caja(M.grava, e.x, e.y, 0, e.w, e.h, 0.03);
          continue;
        }
        const vacioEsc = e.tipo === 'escalera' && ((pi > 0 && inf && celdasDe(e).every((k) => inf.get(k)?.tipo === 'escalera')) || (pi === 0 && escSot.has([e.x, e.y, e.w, e.h].join()))); // v.1.6: también la que baja al sótano
        if (vacioEsc) {
          tag(`s|${pi}|${e.id}`, ST.losa(pi), ecx, ecy, z0);
          for (const r of [[e.x - 0.06, e.y - 0.06, e.w + 0.12, 0.12], [e.x - 0.06, e.y + e.h - 0.06, e.w + 0.12, 0.12], [e.x - 0.06, e.y, 0.12, e.h], [e.x + e.w - 0.06, e.y, 0.12, e.h]]) L.base.caja(M.forjado, r[0], r[1], z0 - E_FORJADO, r[2], r[3], E_FORJADO + 0.01);
          tag(`b|${pi}|${e.id}`, ST.puertas(pi), ecx, ecy, z0);
          const bajo = this.modelo.plantas[pi - 1]?.estancias.find((q) => q.tipo === 'escalera' && q.x < ecx && q.x + q.w > ecx && q.y < ecy && q.y + q.h > ecy);
          const lleg = bajo ? llegadaEscalera(this.modelo, pi - 1, bajo) : null;
          for (const s of g.segs) if (s.clase === 'abierto' && (s.a.id === e.id || s.b.id === e.id)) for (const t of tramosBaranda(e, s, lleg)) this.barandilla(L.base, z0, t);
        } else {
          // losa o forjado en paneles de 1,50 m (montaje), acabado de suelo aparte
          const lx = e.w >= e.h; const Lr = lx ? e.w : e.h; const n = Math.max(1, Math.round(Lr / PANEL));
          for (let i = 0; i < n; i++) {
            const a0 = (i * Lr) / n, a1 = ((i + 1) * Lr) / n; const [px, py, pw, ph] = lx ? [e.x + a0, e.y, a1 - a0, e.h] : [e.x, e.y + a0, e.w, a1 - a0];
            tag(`s|${pi}|${e.id}|${i}`, ST.losa(pi), px + pw / 2, py + ph / 2, z0);
            if (pi === 0 && !sanitario) L.base.caja(M.zocalo, px, py, -0.1, pw, ph, z0 + 0.1); else L.base.caja(M.forjado, px, py, z0 - E_FORJADO, pw, ph, E_FORJADO); // v.1.6: con forjado sanitario, placa sobre los muretes
          }
          tag(`f|${pi}|${e.id}`, t.ext ? ST.ext : ST.suelo(pi), ecx, ecy, z0);
          L.base.caja(suelo(e), e.x, e.y, z0, e.w, e.h, 0.01, { rot: e.h > e.w, sinBase: true });
        }
        if ((e.tipo === 'porche' || e.tipo === 'quincho') && !tienePergola(e, optB)) { // con pérgola, la estructura es la de la pérgola
          const bajoCub = !e.pergola && celdasDe(e).every((k) => !sup?.get(k) || TIPOS[sup.get(k).tipo]?.vacio);
          const alto = !plana && bajoCub ? H_PLANTA : H_TAB; const s = M.poste.metalness ? 0.1 : 0.14;
          postes(e, alto, M.poste, s);
          if (!plana && bajoCub) { // viga de borde bajo la cubierta inclinada
            tag(`v|${pi}|${e.id}`, ST.muro(pi), ecx, ecy, z0);
            const lados = { N: [e.x, e.y, e.w, 0], S: [e.x, e.y + e.h, e.w, 0], O: [e.x, e.y, 0, e.h], E: [e.x + e.w, e.y, 0, e.h] };
            for (const [l, [x, y, w, h]] of Object.entries(lados)) {
              const cs = l === 'N' || l === 'S' ? Array.from({ length: Math.round(w / T) }, (_, q) => [Math.round(x / T) + q, Math.round(y / T) - (l === 'N' ? 1 : 0)]) : Array.from({ length: Math.round(h / T) }, (_, q) => [Math.round(x / T) - (l === 'O' ? 1 : 0), Math.round(y / T) + q]);
              if (cs.every(([a, c]) => interiorEn(a, c))) continue;
              const vw = 0.14, vh = 0.26; if (w) L.alto.caja(M.poste, x, y - (l === 'N' ? -0.03 : vw + 0.03), z0 + H_PLANTA - vh, w, vw, vh); else L.alto.caja(M.poste, x - (l === 'O' ? -0.03 : vw + 0.03), y, z0 + H_PLANTA - vh, vw, h, vh);
            }
          }
        }
        if (esInt(e.tipo) && !['pasillo', 'escalera', 'instalaciones', 'despensa', 'trastero', 'doble_altura'].includes(e.tipo) && e.w * e.h >= 2) candLuz.push({ e, pi, z0, area: e.w * e.h });
      }
      for (const a of p.apoyos || []) { tag(`a|${pi}|${a.x}|${a.y}`, ST.muro(pi), a.x, a.y, z0); L.base.caja(M.poste, a.x - 0.1, a.y - 0.1, z0, 0.2, 0.2, H_TAB); }
      // muros, carpinterías y barandillas (la doble altura lleva barandilla de vidrio hacia las demás estancias)
      for (const s of g.segs) {
        const da = s.a?.tipo === 'doble_altura' ? s.a : s.b?.tipo === 'doble_altura' ? s.b : null; const otro = da ? (da === s.a ? s.b : s.a) : null;
        const cxs = (s.x1 + s.x2) / 2, cys = (s.y1 + s.y2) / 2;
        if (s.clase === 'fachada') {
          const ia = s.a && esInt(s.a.tipo); const rev = (e) => (humedo(e) ? 'azulejo' : 'yeso');
          this.muro(L, z0, s, E_FACHADA, H_PLANTA, esMedianera(modelo, s) ? 'medianera' : 'fachada', ia ? rev(s.a) : null, ia ? null : rev(s.b), g.huecos.filter((h) => enSeg(s, h)), true, p, pi);
        } else if (s.clase === 'tabique') {
          if (da && otro && !PRIV.has(otro.tipo) && otro.tipo !== 'doble_altura') { tag(`b|${pi}|${cxs}|${cys}`, ST.puertas(pi), cxs, cys, z0); for (const t of tramosBaranda(da, s, null)) this.barandilla(L.base, z0, t); }
          else if (!da || otro?.tipo !== 'doble_altura') this.muro(L, z0, s, (s.a.vivienda || '') !== (s.b.vivienda || '') || s.a.tipo === 'ascensor' || s.b.tipo === 'ascensor' ? 0.2 : E_TABIQUE, H_TAB, 'yeso', humedo(s.a) ? 'azulejo' : null, humedo(s.b) ? 'azulejo' : null, da ? [] : g.puertas.filter((d) => enSeg(s, d)), false, p, pi);
        } else if (s.clase === 'abierto' && da) { tag(`b|${pi}|${cxs}|${cys}`, ST.puertas(pi), cxs, cys, z0); for (const t of tramosBaranda(da, s, null)) this.barandilla(L.base, z0, t); }
      }
      this.bordes3D(pi, z0); // celosías, barandillas de borde y pérgolas de la planta, por paños
      // mobiliario
      // baños y cocinas llegan como módulos completos (todas sus piezas a la vez); la escalera, como un módulo; el
      // mobiliario de terrazas y porches, con los exteriores
      const porId = new Map(p.estancias.map((q) => [q.id, q]));
      for (const it of this.muebles[pi] || []) {
        const eq = porId.get(it.est); const cat = CAT_MUEBLE.get(it.pieza);
        if (it.pieza === 'escalera') tag(`esc|${pi}|${it.id}`, ST.modulo(pi), it.x, it.y, z0);
        else if (eq && TIPOS[eq.tipo]?.ext) tag(`mob|${pi}|${it.id || it.est}`, ST.ext, it.x, it.y, z0);
        else if (cat === 'bano' || cat === 'cocina') tag(`mod|${pi}|${cat}|${it.est}`, ST.modulo(pi), eq ? eq.x + eq.w / 2 : it.x, eq ? eq.y + eq.h / 2 : it.y, z0);
        else tag(`mob|${pi}|${it.id || it.est}`, ST.mob(pi), it.x, it.y, z0);
        this.pieza(L, it, z0 + 0.01);
        if (it.fuego && this.fuegos.length < 3) this.fuegos.push({ x: it.x + it.w / 2, y: it.y + it.h / 2, z: z0 + it.z0 + 0.3 });
      }
      // cubiertas
      this.cubiertas(pi, z0);
    });
    if (sanitario || (modelo.exteriores || []).length) this.accesos3D(ext); // v.1.6: escaleras, rampas y plataformas exteriores
    this._LS = null; this._rampaS = null; this._huecosTerreno = []; // v.1.6: planta sótano (sus lotes cuelgan de _LL mientras se construye para recibir las etiquetas de montaje)
    if (modelo.sotano?.estancias?.length) { const LS = { base: new Lote(), alto: new Lote(), techo: new Lote(), corte: new Lote() }; LL.push(LS); try { this.sotano3D(LS); this._LS = LS; } catch (e) { console.warn('Visor 3D: sótano', e); } finally { LL.pop(); } }
    // grava perimetral y patios a ras de suelo
    const huella = new Set(); for (const e of modelo.plantas[0].estancias) if (!TIPOS[e.tipo]?.vacio) for (const k of celdasDe(e)) huella.add(k);
    const B = 0.6; const RS = this._rampaS; const gr = (x, y, w, d) => { if (!RS || !dentroPoligono([x + w / 2, y + d / 2], RS.contorno)) ext.caja(M.grava, x, y, 0, w, d, 0.025); }; // v.1.6: no sobre la rampa
    for (const k of huella) {
      const [i, j] = k.split(',').map(Number); const x = i * T, y = j * T;
      if (!huella.has(K(i, j - 1))) gr(x - B, y - B, T + 2 * B, B);
      if (!huella.has(K(i, j + 1))) gr(x - B, y + T, T + 2 * B, B);
      if (!huella.has(K(i - 1, j))) gr(x - B, y, B, T);
      if (!huella.has(K(i + 1, j))) gr(x + T, y, B, T);
    }
    LL.forEach((L, pi) => { const G = {}; for (const k of Object.keys(L)) { G[k] = new THREE.Group(); G[k].name = k + pi; L[k].mallas(G[k], k !== 'corte', this._depth); raiz.add(G[k]); } this.niv.push(G); });
    this.nivS = null; if (this._LS) { const G = {}; for (const k of Object.keys(this._LS)) { G[k] = new THREE.Group(); G[k].name = k + 'S'; this._LS[k].mallas(G[k], k !== 'corte', this._depth); raiz.add(G[k]); } this.nivS = G; } // v.1.6
    const GE = new THREE.Group(); GE.name = 'exterior'; ext.mallas(GE, true, this._depth); raiz.add(GE);
    // textura de montaje (una fila de 256 piezas por línea)
    const W = 256, Hh = Math.max(1, Math.ceil(this._pz.length / W)); this._U.tex.value?.dispose();
    const dt = new THREE.DataTexture(new Float32Array(W * Hh * 4), W, Hh, THREE.RGBAFormat, THREE.FloatType); dt.magFilter = dt.minFilter = THREE.NearestFilter; dt.needsUpdate = true;
    this._U.tex.value = dt; this._U.tam.value.set(W, Hh);
    // luces cálidas de noche (número fijo por modelo: no recompila sombreadores al cambiar la hora)
    candLuz.sort((a, c) => c.area - a.area);
    for (const c of candLuz.slice(0, 8)) { // pocas luces puntuales: cada una se evalúa en todos los píxeles
      const l = new THREE.PointLight('#ffcf9c', 0, Math.hypot(c.e.w, c.e.h) * 0.8 + 1.5, 2);
      l.position.set(c.e.x + c.e.w / 2, c.z0 + 2.3, c.e.y + c.e.h / 2); l.userData = { nivel: c.pi, base: 1.4 + c.area * 0.09 }; raiz.add(l); this.luces.push(l);
    }
    // fuego (barbacoa, fogonero): resplandor anaranjado al caer la tarde
    this._lucesFuego = this.fuegos.map((f, i) => { const l = new THREE.PointLight('#ff8a3c', 0, 7, 1.8); l.position.set(f.x, f.z, f.y); l.userData = { base: 6, fase: i }; raiz.add(l); return l; });
  }

  // v.1.6 · Planta sótano (modelo.sotano, core/sotano.mjs). Bajo rasante y NO en seco: encachado sobre la excavación,
  // losa de cimentación, muros de contención de hormigón (con la puerta de garaje y las ventanas a patio inglés),
  // tabiques, puertas, mobiliario y escalera; patio inglés; rampa con su pendiente real, muros laterales y canaleta;
  // forjado de techo donde no hay casa encima. Montaje: excavación → losa → muros → interiores → rampa → forjado,
  // antes de la planta baja. Deja en _huecosTerreno los huecos que el terreno abre (rampa y patios).
  sotano3D(LS) {
    const m = this.modelo, s = m.sotano, M = this.M, S = this._ST.sot; const zS = this.zoc - s.altura, top = -0.1;
    const g = (this.geoS = derivarSotano(m)); const cel = celdasPlanta(s).m; const R = g.rampa?.ok ? g.rampa : null; this._rampaS = R;
    const tag = (k, st, x, y, z) => this._tag(k, st, x, y, z);
    const humedo = (e) => !!e && ['bano', 'aseo', 'lavadero'].includes(e.tipo); const bruto = (e) => !!e && ['garaje', 'instalaciones', 'trastero', 'bodega'].includes(e.tipo);
    const rects = rectangulos([...cel.keys()]);
    rects.forEach((r, i) => { // excavación (encachado) y losa
      tag(`sx|${i}`, S.exc, r.x + r.w / 2, r.y + r.h / 2, zS); LS.base.caja(M.grava, r.x - 0.6, r.y - 0.6, zS - SOTANO.losa - 0.2, r.w + 1.2, r.h + 1.2, 0.2);
      tag(`sl|${i}`, S.losa, r.x + r.w / 2, r.y + r.h / 2, zS); LS.base.caja(M.hormigon, r.x - 0.15, r.y - 0.15, zS - SOTANO.losa, r.w + 0.3, r.h + 0.3, SOTANO.losa - 0.01);
    });
    for (const e of s.estancias) { tag(`sf|${e.id}`, S.int, e.x + e.w / 2, e.y + e.h / 2, zS); LS.base.caja(humedo(e) ? M.losa : bruto(e) || e.tipo === 'gimnasio' ? M.hormigonSuelo : M.roble, e.x, e.y, zS - 0.01, e.w, e.h, 0.01, { rot: e.h > e.w, sinBase: true }); }
    // muros de contención y tabiques (etapas propias del sótano mientras se construyen)
    const ST0 = this._ST; this._ST = { ...ST0, muro: () => S.muro, carp: () => S.muro, tab: () => S.int, puertas: () => S.int };
    const enSeg = (sg, h) => h.o === sg.o && (sg.o === 'h' ? Math.abs(h.y - sg.y1) < 1e-6 && h.x > sg.x1 && h.x < sg.x2 : Math.abs(h.x - sg.x1) < 1e-6 && h.y > sg.y1 && h.y < sg.y2);
    try {
      for (const sg of g.segs) {
        if (sg.clase === 'fachada') { const ia = sg.a && esInt(sg.a.tipo); const int = ia ? sg.a : sg.b; const rev = bruto(int) ? null : humedo(int) ? 'azulejo' : 'yeso';
          this.muro(LS, zS, sg, SOTANO.muro, top - zS, 'hormigon', ia ? rev : null, ia ? null : rev, g.huecos.filter((h) => enSeg(sg, h)), true, s, 'S'); }
        else if (sg.clase === 'tabique') this.muro(LS, zS, sg, E_TABIQUE, top - zS, 'yeso', humedo(sg.a) ? 'azulejo' : null, humedo(sg.b) ? 'azulejo' : null, g.puertas.filter((d) => enSeg(sg, d)), false, s, 'S');
      }
    } finally { this._ST = ST0; }
    // mobiliario y escalera (sube a la planta baja)
    let mu = []; try { mu = mobiliario(modeloConSotano(m), 0, g); } catch (e) { console.warn('Visor 3D: mobiliario del sótano', e); }
    for (const it of mu) { tag(it.pieza === 'escalera' ? `esc|S|${it.id}` : `mob|S|${it.id || it.est}`, it.pieza === 'escalera' ? S.int : S.mob, it.x, it.y, zS); this.pieza(LS, it, zS + 0.01); }
    // patios ingleses: fondo de grava, muro exterior con remate sobre el terreno y barandilla
    const huecos = [];
    patiosIngleses(m).forEach((p, i) => {
      if (R && !(p.x > R.bbox.x1 || p.x + p.w < R.bbox.x0 || p.y > R.bbox.y1 || p.y + p.h < R.bbox.y0)) return; // donde llega la rampa, manda la rampa
      tag(`pi|${i}`, S.muro, p.x + p.w / 2, p.y + p.h / 2, zS); const e = 0.2; const hor = p.lado === 'N' || p.lado === 'S';
      LS.base.caja(M.grava, p.x, p.y, zS - 0.12, p.w, p.h, 0.1);
      const ext = { N: [p.x - e, p.y - e, p.w + 2 * e, e], S: [p.x - e, p.y + p.h, p.w + 2 * e, e], O: [p.x - e, p.y - e, e, p.h + 2 * e], E: [p.x + p.w, p.y - e, e, p.h + 2 * e] }[p.lado];
      LS.base.caja(M.hormigon, ext[0], ext[1], zS - 0.3, ext[2], ext[3], 0.45 - zS);
      for (const c of hor ? [[p.x - e, p.y, e, p.h], [p.x + p.w, p.y, e, p.h]] : [[p.x, p.y - e, p.w, e], [p.x, p.y + p.h, p.w, e]]) LS.base.caja(M.hormigon, c[0], c[1], zS - 0.3, c[2], c[3], 0.45 - zS);
      const L = hor ? { o: 'h', x1: p.x, y1: ext[1] + e / 2, x2: p.x + p.w, y2: ext[1] + e / 2, len: p.w } : { o: 'v', x1: ext[0] + e / 2, y1: p.y, x2: ext[0] + e / 2, y2: p.y + p.h, len: p.h };
      this.barandilla(LS.base, 0.15, L);
      huecos.push([[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]]);
    });
    // rampa: losa por tramos con su pendiente, muros laterales con remate sobre el terreno y canaleta delante de la puerta
    if (R) {
      const zr = (z) => (-zS * z) / R.D; const ew = 0.2, cr = 0.15; // cota real (de la puerta, abajo, a la calle, a cota 0)
      const out = (P, A, d) => { const dx = P[0] - A.x, dy = P[1] - A.y, l = Math.hypot(dx, dy) || 1; return [P[0] + (dx / l) * d, P[1] + (dy / l) * d]; };
      R.tramos.forEach((q, i) => {
        const za = zr(q.a.z), zb = zr(q.b.z); tag(`ra|${i}`, S.rampa, (q.a.x + q.b.x) / 2, (q.a.y + q.b.y) / 2, Math.min(za, zb));
        LS.base.quad(M.losaExt, [q.i0[0], za, q.i0[1]], [q.i1[0], zb, q.i1[1]], [q.d1[0], zb, q.d1[1]], [q.d0[0], za, q.d0[1]], [0, 1, 0]);
        LS.base.quad(M.hormigon, [q.i0[0], za - 0.25, q.i0[1]], [q.i1[0], zb - 0.25, q.i1[1]], [q.d1[0], zb - 0.25, q.d1[1]], [q.d0[0], za - 0.25, q.d0[1]], [0, -1, 0]);
        for (const [P0, P1] of [[q.i0, q.i1], [q.d0, q.d1]]) { // muro lateral: cara interior, exterior y remate
          const O0 = out(P0, q.a, ew), O1 = out(P1, q.b, ew); const hint = [q.a.x - P0[0], 0, q.a.y - P0[1]];
          LS.base.quad(M.hormigon, [P0[0], za, P0[1]], [P1[0], zb, P1[1]], [P1[0], cr, P1[1]], [P0[0], cr, P0[1]], hint);
          LS.base.quad(M.hormigon, [O0[0], za - 0.3, O0[1]], [O1[0], zb - 0.3, O1[1]], [O1[0], cr, O1[1]], [O0[0], cr, O0[1]], hint.map((v) => -v));
          LS.base.quad(M.hormigon, [P0[0], cr, P0[1]], [P1[0], cr, P1[1]], [O1[0], cr, O1[1]], [O0[0], cr, O0[1]], [0, 1, 0]);
        }
      });
      const q0 = R.tramos[0]; if (q0) { const d = [q0.b.x - q0.a.x, q0.b.y - q0.a.y]; const l = Math.hypot(d[0], d[1]) || 1; const u = [(d[0] / l) * 0.3, (d[1] / l) * 0.3]; const z0 = zr(q0.a.z) + 0.004;
        LS.base.quad(M.poche, [q0.i0[0], z0, q0.i0[1]], [q0.i0[0] + u[0], z0, q0.i0[1] + u[1]], [q0.d0[0] + u[0], z0, q0.d0[1] + u[1]], [q0.d0[0], z0, q0.d0[1]], [0, 1, 0]); } // canaleta
      huecos.push(R.contorno);
    }
    // forjado de techo donde no hay casa encima (bajo el jardín)
    const pb = this.cel[0]; const fuera = [...cel.keys()].filter((k) => { const e = pb.get(k); return !e || TIPOS[e.tipo]?.vacio || e.tipo === 'piscina'; });
    rectangulos(fuera).forEach((r, i) => { tag(`st|${i}`, S.techo, r.x + r.w / 2, r.y + r.h / 2, 0); LS.techo.caja(M.forjado, r.x - 0.15, r.y - 0.15, top - E_FORJADO, r.w + 0.3, r.h + 0.3, E_FORJADO); });
    this._huecosTerreno = huecos;
  }
  // Un tramo de muro con sus huecos. pz parte cada pieza por el plano de corte (1,60) en base/alto y pone tapa.
  // Para el montaje, el muro se trocea en paneles de 1,50 m y cada carpintería es una pieza de acabados.
  muro(L, z0, s, esp, alto, core, linA, linB, ab, fach, planta, pi = 0) {
    this._ctxMuro = { hor: s.o === 'h', c: s.o === 'h' ? s.y1 : s.x1, z0, pi };
    const M = this.M; const hor = s.o === 'h'; const c = hor ? s.y1 : s.x1; const a0 = hor ? s.x1 : s.y1, a1 = a0 + s.len; const ex = esp / 2; const ST = this._ST;
    const box = (lote, mat, u0, u1, zb, zt, o0, o1) => (hor ? lote.caja(mat, u0, c + o0, z0 + zb, u1 - u0, o1 - o0, zt - zb) : lote.caja(mat, c + o0, u0, z0 + zb, o1 - o0, u1 - u0, zt - zb));
    const pz = (mat, u0, u1, zb, zt, o0, o1, tapa = false) => {
      if (u1 - u0 < 1e-4 || zt - zb < 1e-4) return;
      if (zt <= CORTE + 1e-6) box(L.base, mat, u0, u1, zb, zt, o0, o1);
      else if (zb >= CORTE - 1e-6) box(L.alto, mat, u0, u1, zb, zt, o0, o1);
      else { box(L.base, mat, u0, u1, zb, CORTE, o0, o1); box(L.alto, mat, u0, u1, CORTE, zt, o0, o1); if (tapa) box(L.corte, M.poche, u0, u1, CORTE, CORTE + 0.006, o0 - 0.012, o1 + 0.012); }
    };
    const tramo = (u0, u1, zb, zt) => {
      let u = u0;
      while (u < u1 - 1e-4) {
        const v = Math.min(u1, (Math.floor((u + 1e-6) / PANEL) + 1) * PANEL); const um = (u + v) / 2;
        // fachada: estructura y cerramiento de la planta; tabique: módulo de interior (después)
        this._tag(`${fach ? 'm' : 'mt'}|${pi}|${s.o}|${c}|${Math.floor(um / PANEL)}`, fach ? ST.muro(pi) : ST.tab(pi), hor ? um : c, hor ? c : um, z0);
        pz(M[core], u, v, zb, zt, -ex, ex, true);
        const v0 = Math.max(u, a0), v1 = Math.min(v, a1);
        if (v1 - v0 > 1e-4) {
          if (linA) pz(M[linA], v0, v1, zb, zt, -ex - 0.008, -ex); if (linB) pz(M[linB], v0, v1, zb, zt, ex, ex + 0.008);
          if (zb < 1e-6 && !this.opt.maqueta) { // rodapié lacado de 7 cm en los paramentos de yeso (no en alicatados)
            if (linA === 'yeso') pz(M.lacado, v0, v1, 0.005, 0.075, -ex - 0.02, -ex - 0.008);
            if (linB === 'yeso') pz(M.lacado, v0, v1, 0.005, 0.075, ex + 0.008, ex + 0.02);
          }
        }
        u = v;
      }
    };
    const lista = ab.map((h) => ({ h, c: hor ? h.x : h.y })).sort((p, q) => p.c - q.c);
    let u = a0 - ex;
    for (const { h, c: hc } of lista) {
      const h0 = hc - h.ancho / 2, h1 = hc + h.ancho / 2; const alf = fach ? h.alf || 0 : 0; const top = Math.min(alto - 0.05, alf + (h.alto || 2.05));
      tramo(u, h0, 0, alto); if (alf > 0) tramo(h0, h1, 0, alf); tramo(h0, h1, top, alto);
      this._tag(`c|${pi}|${h.x}|${h.y}`, fach ? ST.carp(pi) : ST.puertas(pi), h.x, h.y, z0);
      if (fach) this.carpinteria(pz, s, h, h0, h1, alf, top, ex, linA || linB);
      else this.paso(pz, s, h, h0, h1, top, ex, planta);
      u = Math.max(u, h1);
    }
    tramo(u, a1 + ex, 0, alto);
  }
  carpinteria(pz, s, h, h0, h1, alf, top, ex, rev) {
    const M = this.M; const sg = s.lado === 'S' || s.lado === 'E' ? 1 : -1; const oF = sg * (ex - 0.09), fd = 0.035, F0 = oF - fd, F1 = oF + fd;
    const [i0, i1] = sg > 0 ? [-ex, F0] : [F1, ex]; const R = M[rev || 'yeso'];
    pz(R, h0, h0 + 0.01, alf, top, i0, i1); pz(R, h1 - 0.01, h1, alf, top, i0, i1); pz(R, h0, h1, top - 0.01, top, i0, i1);
    if (h.tipo === 'porton') {
      pz(M.marco, h0, h0 + 0.04, 0, top, F0, F1); pz(M.marco, h1 - 0.04, h1, 0, top, F0, F1); pz(M.marco, h0 + 0.04, h1 - 0.04, top - 0.04, top, F0, F1);
      const md = h.modelo || 'seccional'; const a0 = h0 + 0.04, a1 = h1 - 0.04, zt = top - 0.04; const ext = sg > 0 ? ex + 0.02 : -ex - 0.02; // cara exterior del muro
      if (md === 'basculante') { pz(M.puerta, a0, a1, 0, zt, oF - 0.025, oF + 0.025); for (const zz of [zt * 0.33, zt * 0.66]) pz(M.marco, a0, a1, zz - 0.015, zz + 0.015, oF - 0.03, oF + 0.03); }
      else if (md === 'enrollable') { pz(M.seccional, a0, a1, 0, zt, oF - 0.012, oF + 0.012); for (let zz = 0.1; zz < zt - 0.05; zz += 0.1) pz(M.marco, a0, a1, zz, zz + 0.008, oF - 0.016, oF + 0.016); pz(M.lacado, a0, a1, zt - 0.28, zt, sg > 0 ? -ex - 0.3 : ex, sg > 0 ? -ex : ex + 0.3); }
      else if (md === 'corredera') { const o0 = sg > 0 ? ext : ext - 0.05, o1 = o0 + 0.05; pz(M.puerta, h0, h1 + 0.06, 0.02, zt, o0, o1); for (let u = h0 + 0.12; u < h1; u += 0.12) pz(M.marco, u, u + 0.012, 0.02, zt, sg > 0 ? o1 : o0 - 0.006, sg > 0 ? o1 + 0.006 : o0); pz(M.marco, h0, h1 + (h1 - h0), zt, zt + 0.06, o0 - 0.01, o1 + 0.01); }
      else if (md === 'batiente') { const mid = (a0 + a1) / 2; pz(M.puerta, a0, mid - 0.006, 0, zt, oF - 0.025, oF + 0.025); pz(M.puerta, mid + 0.006, a1, 0, zt, oF - 0.025, oF + 0.025); for (const u of [mid - 0.1, mid + 0.075]) pz(M.cromo, u, u + 0.025, 1.0, 1.25, sg > 0 ? oF + 0.025 : oF - 0.07, sg > 0 ? oF + 0.07 : oF - 0.025); }
      else pz(M.seccional, a0, a1, 0, zt, oF - 0.025, oF + 0.025);
      return;
    }
    const mk = 0.055, umb = alf > 0 ? mk : 0.025;
    pz(M.marco, h0, h0 + mk, alf, top, F0, F1); pz(M.marco, h1 - mk, h1, alf, top, F0, F1); pz(M.marco, h0 + mk, h1 - mk, top - mk, top, F0, F1); pz(M.marco, h0 + mk, h1 - mk, alf, alf + umb, F0, F1);
    const zb = alf + umb, zt = top - mk;
    if (h.tipo === 'puerta' && !h.exterior && h.entrada && this._ctxMuro?.pi === 0 && this.raiz && !this._hojaEntrada) { this._hojaPuerta(h, h0, h1, mk, zb, zt, oF, sg); return; } // hoja aparte: se puede abrir (Hilván)
    if (h.tipo === 'puerta' && !h.exterior) {
      pz(M.puerta, h0 + mk, h1 - mk, zb, zt, oF - 0.028, oF + 0.028);
      const tu = h.bisagra === 'ini' ? h1 - mk - 0.115 : h0 + mk + 0.09;
      pz(M.cromo, tu, tu + 0.025, 0.85, 1.75, sg > 0 ? oF + 0.028 : oF - 0.085, sg > 0 ? oF + 0.085 : oF - 0.028);
      pz(M.cromo, tu, tu + 0.025, 0.95, 1.15, sg > 0 ? oF - 0.07 : oF + 0.028, sg > 0 ? oF - 0.028 : oF + 0.07);
      return;
    }
    const an = h1 - h0; let cortes = [];
    if (an >= 3.6) cortes = [h0 + an / 3, h0 + (2 * an) / 3]; else if (an >= 2.2 || (h.tipo === 'ventana' && an >= 1.2) || h.tipo === 'puerta') cortes = an >= 1.2 ? [(h0 + h1) / 2] : [];
    for (const cu of cortes) pz(M.marco, cu - 0.035, cu + 0.035, zb, zt, F0, F1);
    pz(M.vidrio, h0 + mk, h1 - mk, zb, zt, oF - 0.006, oF + 0.006);
    if (alf > 0.1) { // vierteaguas por fuera, alféizar de piedra por dentro
      pz(M.albardilla, h0 - 0.03, h1 + 0.03, alf, alf + 0.025, sg > 0 ? F1 : -ex - 0.04, sg > 0 ? ex + 0.04 : F0);
      pz(M.piedra, h0 - 0.02, h1 + 0.02, alf, alf + 0.02, sg > 0 ? -ex - 0.03 : F1, sg > 0 ? F0 : ex + 0.03);
    }
  }
  // Hoja de la puerta de entrada como pieza aparte con su bisagra (misma madera, mismos tiradores) para poder abrirla:
  // gira hacia donde abre (h.hacia, por defecto hacia dentro) sobre su bisagra (h.bisagra); si es corredera, se desliza.
  _hojaPuerta(h, h0, h1, mk, zb, zt, oF, sg) {
    const M = this.M; const { hor, c, z0 } = this._ctxMuro; const w = h1 - h0 - 2 * mk, alto = zt - zb;
    const ini = h.bisagra === 'ini'; const uH = ini ? h0 + mk : h1 - mk, dirU = ini ? 1 : -1;
    const g = new THREE.Group(); if (hor) g.position.set(uH, z0 + zb, c + oF); else { g.position.set(c + oF, z0 + zb, uH); g.rotation.y = -Math.PI / 2; }
    const piv = new THREE.Group(); g.add(piv); const oz = hor ? 1 : -1; // eje o del muro → z local
    const caja = (mat, lx, ly, lz, sx, sy, sz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(lx, ly, lz); m.castShadow = m.receiveShadow = true; piv.add(m); return m; };
    caja(M.puerta, (dirU * w) / 2, alto / 2, 0, w, alto, 0.056);
    const tu = (ini ? h1 - mk - 0.115 : h0 + mk + 0.09) + 0.0125 - uH;
    caja(M.cromo, tu, 1.3 - zb, oz * sg * 0.0565, 0.025, 0.9, 0.057); caja(M.cromo, tu, 1.05 - zb, -oz * sg * 0.049, 0.025, 0.2, 0.042);
    const lado = h.hacia === 'fuera' ? sg : -sg; // lado del muro al que va la hoja al abrir (sg: exterior)
    this._hojaEntrada = { g, piv, w, dirU, zs: lado * oz, corredera: !!h.corredera, k: 0 };
    this.raiz.add(g);
  }
  // Abre (k = 1) o cierra (k = 0) la puerta de entrada; devuelve false si no hay hoja animable.
  abrirPuerta(k = 1) {
    const H = this._hojaEntrada; if (!H) return false; H.k = clamp(k, 0, 1); const e = H.k * H.k * (3 - 2 * H.k);
    if (H.corredera) H.piv.position.x = -H.dirU * H.w * 0.92 * e; else H.piv.rotation.y = -H.zs * H.dirU * 1.48 * e;
    this._sombra = true; this.pedir(); return true;
  }
  // Puerta de paso: hoja abierta a 90° hacia donde abre (barridoPuerta: abre/bisagra del contrato o automático).
  paso(pz, s, d, h0, h1, top, ex, planta) {
    const M = this.M; const o0 = -ex - 0.012, o1 = ex + 0.012;
    pz(M.lacado, h0, h0 + 0.03, 0, top, o0, o1); pz(M.lacado, h1 - 0.03, h1, 0, top, o0, o1); pz(M.lacado, h0 + 0.03, h1 - 0.03, top - 0.03, top, o0, o1);
    if (d.ascensor) { const mid = (h0 + h1) / 2; pz(M.cromo, h0 + 0.03, mid - 0.004, 0.01, top - 0.03, -0.02, 0.02); pz(M.cromo, mid + 0.004, h1 - 0.03, 0.01, top - 0.03, -0.02, 0.02); return; } // v.1.5: puertas de cabina telescópicas, cerradas
    if (d.corredera) return; // corredera embutida en el tabique
    const { lado, bisagra } = barridoPuerta(d, planta); const fin = bisagra === 'fin';
    const lw = d.ancho - 0.07; const [l0, l1] = lado > 0 ? [o1, o1 + lw] : [o0 - lw, o0];
    const b0 = fin ? h1 - 0.07 : h0 + 0.03; pz(d.vivienda ? M.puerta : M.lacado, b0, b0 + (d.vivienda ? 0.055 : 0.04), 0.01, top - 0.035, l0, l1); // v.1.5: puerta de vivienda (seguridad) en madera
    const mo = lado > 0 ? l1 - 0.09 : l0 + 0.07; const t0 = fin ? h1 - 0.13 : h0 + 0.07; pz(M.cromo, t0, t0 + 0.06, 0.98, 1.0, mo, mo + 0.02);
  }
  barandilla(lote, z0, s, off = 0) { // off: desplazamiento perpendicular a la línea (lejos de un muro)
    const M = this.M; const hor = s.o === 'h'; const c = (hor ? s.y1 : s.x1) + off; const a0 = hor ? s.x1 : s.y1, a1 = a0 + s.len;
    const box = (mat, u0, u1, zb, zt, o0, o1) => (hor ? lote.caja(mat, u0, c + o0, z0 + zb, u1 - u0, o1 - o0, zt - zb) : lote.caja(mat, c + o0, u0, z0 + zb, o1 - o0, u1 - u0, zt - zb));
    box(M.albardilla, a0, a1, 0, 0.07, -0.035, 0.035); box(M.vidrio, a0 + 0.01, a1 - 0.01, 0.07, 1.04, -0.008, 0.008); box(M.albardilla, a0, a1, 1.04, 1.09, -0.025, 0.025);
  }
  // v.1.3 · Bordes exteriores de la planta por paños (core/bordes.mjs). Celosías: lamas en rejilla global (paños contiguos
  // casan), recortadas bajo forjados, por fuera de la cara de muros y petos, enrasadas con el remate de cubierta. Pérgola:
  // unión de las estancias con pérgola, marco y lamas a la cota de las celosías que la rodean. Barandillas de vidrio por paños.
  bordes3D(pi, z0) {
    const M = this.M, modelo = this.modelo, ST = this._ST, L = this._LL[pi]; const X = this._XB || (this._XB = contextoBordes(modelo)); const opt = this._optB || {};
    const B = bordesPlanta(modelo, pi, opt, X); const PG = pergolasPlanta(modelo, pi, opt, X, B); const C = X.C[pi];
    const matDe = (k) => M['cel_' + (CEL_MAT[k] && M['cel_' + k] ? k : 'madera')] || M.madera;
    const suelo = (i, j) => { const e = C.get(K(i, j)); return !!e && !(TIPOS[e.tipo]?.vacio); };
    const coronas = new Set(); for (const g of PG) for (const k of g.coronas) coronas.add(k);
    // celosías: índice de extremos para resolver las esquinas (la más alta, o la horizontal, pasa; la otra se retira)
    const cels = B.panos.filter((p) => p.celosia); const ext = new Map();
    const vk = (x, y) => Math.round(x / T) + ',' + Math.round(y / T);
    for (const p of cels) for (const [x, y, fin] of [[p.x1, p.y1, 0], [p.x2, p.y2, 1]]) { const k = vk(x, y); if (!ext.has(k)) ext.set(k, []); ext.get(k).push({ p, fin }); }
    const retiro = (p, fin) => { // cuánto se retira el extremo «fin» (0 inicio, 1 final) del paño p por una celosía perpendicular
      const [x, y] = fin ? [p.x2, p.y2] : [p.x1, p.y1]; let r = 0;
      for (const { p: q, fin: fq } of ext.get(vk(x, y)) || []) {
        if (q === p || q.o === p.o) continue;
        if ((fq ? -1 : 1) !== p.place) continue;   // q se extiende hacia el lado de las lamas de p
        if (q.place !== (fin ? -1 : 1)) continue;  // y sus lamas caen dentro de p
        if (q.celosia.top > p.celosia.top + 1e-6 || (Math.abs(q.celosia.top - p.celosia.top) < 1e-6 && q.o === 'h')) r = Math.max(r, q.celosia.off + LAMAS[q.celosia.material].dp + 0.005);
      }
      return r;
    };
    for (const p of cels) {
      const c = p.celosia; const mk = LAMAS[c.material] ? c.material : 'madera'; const { tk, dp, paso } = LAMAS[mk]; const mat = matDe(mk);
      const hz = p.o === 'h'; const lin = p.line * T; const n0 = lin + p.place * c.off, n1 = lin + p.place * (c.off + dp); const o0 = Math.min(n0, n1), o1 = Math.max(n0, n1);
      const a0 = (hz ? p.x1 : p.y1) + Math.max(0.03, retiro(p, 0)), a1 = (hz ? p.x2 : p.y2) - Math.max(0.03, retiro(p, 1)); if (a1 - a0 < tk) continue;
      const conSuelo = p.claves.every((k) => { const a = B.aristas.get(k); return a && suelo(a.pc[0], a.pc[1]); });
      const zb = pi === 0 && !conSuelo ? 0.03 : z0; const zt = z0 + c.top; if (zt - zb < 0.3) continue;
      const corona = p.claves.some((k) => coronas.has(k)); const hc = corona ? PERGOLA.canto : 0.06, hr = 0.05;
      const box = (u0, u1, v0, v1, z, h) => (hz ? this.cajaV(mat, u0, v0, z, u1 - u0, v1 - v0, h) : this.cajaV(mat, v0, u0, z, v1 - v0, u1 - u0, h));
      this._tag(`cel|${pi}|${p.id}`, ST.celosia, hz ? (a0 + a1) / 2 : lin, hz ? lin : (a0 + a1) / 2, zb);
      for (let k = Math.ceil((a0 + tk / 2) / paso - 1e-9); k * paso + tk / 2 <= a1 + 1e-9; k++) { const u = k * paso; box(u - tk / 2, u + tk / 2, o0, o1, zb + hr, zt - hc - zb - hr); }
      box(a0, a1, o0 + dp * 0.25, o1 - dp * 0.25, zb, hr);
      if (corona) box(a0, a1, o0, o1, zt - hc, hc); else box(a0, a1, o0 + dp * 0.25, o1 - dp * 0.25, zt - hc, hc);
    }
    // pérgolas
    PG.forEach((g, gi) => {
      const mat = matDe(g.material); const zt = z0 + g.top; const P = PERGOLA; const [ci, cj] = g.celdas[0].split(',').map(Number);
      this._tag(`per|${pi}|${gi}`, ST.pergola, (ci + 0.5) * T, (cj + 0.5) * T, zt);
      for (const v of g.vigas) this.cajaV(mat, v.x, v.y, zt - P.canto, v.w, v.h, P.canto, 'techo');
      for (const l of g.lamas) { if (Math.abs(l.x1 - l.x2) < 1e-6) this.cajaV(mat, l.x1 - P.lama / 2, l.y1, zt - P.alto, P.lama, l.y2 - l.y1, P.alto, 'techo'); else this.cajaV(mat, l.x1, l.y1 - P.lama / 2, zt - P.alto, l.x2 - l.x1, P.lama, P.alto, 'techo'); }
      for (const q of g.postes) { const zb = pi === 0 && !suelo(Math.floor(q.x / T), Math.floor(q.y / T)) ? 0.03 : z0; this.cajaV(mat, q.x - P.poste / 2, q.y - P.poste / 2, zb, P.poste, P.poste, zt - P.canto - zb); }
    });
    // barandillas de vidrio por paños (anulables y forzables desde la herramienta «Bordes»)
    for (const p of B.panos) {
      if (!p.barandilla) continue;
      this._tag(`b|${pi}|${p.id}`, ST.baranda, (p.x1 + p.x2) / 2, (p.y1 + p.y2) / 2, z0);
      this.barandilla(L.base, z0, p, p.otro === 'muro' ? p.place * (E_FACHADA / 2 + 0.05) : 0);
    }
  }
  // Piscina: vaso con gresite, coronación de piedra y lámina de agua (en planta baja se abre el terreno).
  piscina(lote, e, z0, pi) {
    const M = this.M; const prof = clamp(+e.piscina?.prof || 1.4, 0.4, 3); const c = clamp(Math.min(e.w, e.h) / 6, 0.2, 0.35);
    const zc = pi === 0 ? 0.08 : z0 + 0.45; const zt = zc - 0.05, zw = zc - 0.13, zf = pi === 0 ? zc - prof : Math.max(z0 + 0.05, zc - prof);
    lote.caja(M.coronacion, e.x, e.y, zt, e.w, c, 0.05); lote.caja(M.coronacion, e.x, e.y + e.h - c, zt, e.w, c, 0.05);
    lote.caja(M.coronacion, e.x, e.y + c, zt, c, e.h - 2 * c, 0.05); lote.caja(M.coronacion, e.x + e.w - c, e.y + c, zt, c, e.h - 2 * c, 0.05);
    const x0 = e.x + c, x1 = e.x + e.w - c, y0 = e.y + c, y1 = e.y + e.h - c;
    lote.quad(M.gresite, [x0, zf, y0], [x1, zf, y0], [x1, zt, y0], [x0, zt, y0], [0, 0, 1]); lote.quad(M.gresite, [x0, zf, y1], [x1, zf, y1], [x1, zt, y1], [x0, zt, y1], [0, 0, -1]);
    lote.quad(M.gresite, [x0, zf, y0], [x0, zf, y1], [x0, zt, y1], [x0, zt, y0], [1, 0, 0]); lote.quad(M.gresite, [x1, zf, y0], [x1, zf, y1], [x1, zt, y1], [x1, zt, y0], [-1, 0, 0]);
    lote.quad(M.gresiteFondo, [x0, zf, y0], [x1, zf, y0], [x1, zf, y1], [x0, zf, y1], [0, 1, 0]);
    // escalón de entrada en una esquina del lado largo
    const ex = e.w >= e.h; const sw = Math.min(1.2, (ex ? x1 - x0 : y1 - y0) * 0.3);
    for (let k = 0; k < 3; k++) { const zz = zt - (k + 1) * 0.3; if (zz <= zf) break; if (ex) lote.caja(M.gresite, x1 - sw, y0, zf, sw, 0.3 * (3 - k), zz - zf); else lote.caja(M.gresite, x0, y1 - sw, zf, 0.3 * (3 - k), sw, zz - zf); }
    lote.quad(M.agua, [x0, zw, y0], [x1, zw, y0], [x1, zw, y1], [x0, zw, y1], [0, 1, 0]);
    if (pi > 0) for (const [A, B, n] of [[[e.x, e.y], [e.x + e.w, e.y], [0, 0, -1]], [[e.x, e.y + e.h], [e.x + e.w, e.y + e.h], [0, 0, 1]], [[e.x, e.y], [e.x, e.y + e.h], [-1, 0, 0]], [[e.x + e.w, e.y], [e.x + e.w, e.y + e.h], [1, 0, 0]]]) lote.quad(M.coronacion, [A[0], z0, A[1]], [B[0], z0, B[1]], [B[0], zt, B[1]], [A[0], zt, A[1]], n);
    if (pi === 0) this._piscinas.push({ x: e.x, y: e.y, w: e.w, h: e.h });
    this._hayAgua = true;
  }
  // Una pieza de mobiliario de mobiliario.mjs (z: cota del suelo terminado de su planta).
  pieza(L, it, z) {
    const M = this.M; const zc = CORTE - 0.01;
    // lo que queda por encima del plano de corte (armarios altos, lámparas) desaparece en la vista en planta
    if (!it.forma || it.forma === 'caja') {
      if (!it.redondeo && it.z0 < zc && it.z0 + it.alto > zc + 0.02) { this.pieza(L, Object.assign({}, it, { alto: zc - it.z0 }), z); this.pieza(L, Object.assign({}, it, { z0: zc, alto: it.z0 + it.alto - zc }), z); return; }
    }
    const lote = it.z0 >= zc - 1e-6 ? L.alto : L.base; const mat = (it.mat === 'roble' ? M.mueble : M[it.mat]) || M.mueble; const zb = z + it.z0;
    const mtx = new THREE.Matrix4(); const cxp = it.x + it.w / 2, cyp = it.y + it.h / 2, czp = zb + it.alto / 2;
    if (it.forma === 'cilindro') {
      const eje = it.eje || 'z'; const U = unidad().cil; const q = new THREE.Quaternion(); let s;
      if (eje === 'x') { q.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)); const d = Math.min(it.h, it.alto); s = new THREE.Vector3(d, it.w, d); }
      else if (eje === 'y') { q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)); const d = Math.min(it.w, it.alto); s = new THREE.Vector3(d, it.h, d); }
      else s = new THREE.Vector3(it.w, it.alto, it.h);
      mtx.compose(new THREE.Vector3(cxp, czp, cyp), q, s); lote.geo(mat, U, mtx);
    } else if (it.forma === 'esfera') {
      mtx.compose(new THREE.Vector3(cxp, czp, cyp), new THREE.Quaternion(), new THREE.Vector3(it.w, it.alto, it.h)); lote.geo(mat, unidad().esf, mtx);
    } else if (it.redondeo) {
      const r = Math.max(0.002, Math.min(it.redondeo, it.w / 2 - 0.001, it.h / 2 - 0.001, it.alto / 2 - 0.001));
      const g = new RoundedBoxGeometry(it.w, it.alto, it.h, 2, r); mtx.makeTranslation(cxp, czp, cyp); lote.geo(mat, g, mtx); g.dispose();
    } else lote.caja(mat, it.x, it.y, zb, it.w, it.h, it.alto);
  }

  // ------------------------------------------------------------------------------------------------------
  // Cubiertas de la planta pi. Se excluyen las celdas bajo una doble altura (las cubre la cubierta de arriba) y los
  // porches con pérgola. Plana: forjado + grava + petos (o vuelo con alero). Inclinadas: campo de alturas.
  // v.1.6 · Forjado sanitario: zapata corrida (solo en el montaje), muretes retranqueados según los vuelos, en piezas de
  // 1,50 m (etapa «muretes», antes del forjado de planta baja) y rejillas de ventilación de la cámara.
  forjadoSanitario(ext) {
    const M = this.M, ST = this._ST; const MU = muretesSanitario(this.modelo); const c = MU.cimentacion; const e = c.murete.espesor, h = c.altura;
    const matM = c.murete.material === 'piedra' && M.piedraSeca ? M.piedraSeca : M.zocalo; // hormigón o bloque: el del zócalo
    MU.perimetro.concat(MU.intermedios).forEach((sg, si) => {
      const hz = sg.o === 'h'; const L = sg.len; const n = Math.max(1, Math.round(L / PANEL)); const a0 = hz ? sg.x1 : sg.y1; const c0 = hz ? sg.y1 : sg.x1;
      for (let q = 0; q < n; q++) {
        const u0 = a0 + (q * L) / n - (q === 0 ? e / 2 : 0), u1 = a0 + ((q + 1) * L) / n + (q === n - 1 ? e / 2 : 0);
        const [x, y, w, d] = hz ? [u0, c0 - e / 2, u1 - u0, e] : [c0 - e / 2, u0, e, u1 - u0];
        ext.tag = this._tag(`zc|${si}|${q}`, ST.pads, x + w / 2, y + d / 2, 0); ext.caja(M.hormigon, x - 0.15, y - 0.15, -0.38, w + 0.3, d + 0.3, 0.36);
        ext.tag = this._tag(`mu|${si}|${q}`, ST.muretes, x + w / 2, y + d / 2, 0); ext.caja(matM, x, y, -0.02, w, d, h + 0.02);
      }
    });
    const dark = M.poche || M.marco;
    for (const r of MU.rejillas) { const hz = r.o === 'h'; const sg = { N: -1, S: 1, O: -1, E: 1 }[r.lado] || 1; const off = (e / 2) * sg; ext.tag = this._pzK.get(`mu|0|0`) ?? 0;
      if (hz) ext.caja(dark, r.x - 0.2, r.y + off - (sg < 0 ? 0.012 : 0), h * 0.45, 0.4, 0.012, Math.min(0.14, h * 0.4)); else ext.caja(dark, r.x + off - (sg < 0 ? 0.012 : 0), r.y - 0.2, h * 0.45, 0.012, 0.4, Math.min(0.14, h * 0.4)); }
    ext.tag = 0;
  }
  // v.1.6 · Escaleras, rampas y plataformas exteriores (core/cimentacion.mjs): peldaños y mesetas macizos desde el terreno,
  // rampas como prisma inclinado y barandillas de montantes y pasamanos. Se montan con los exteriores.
  accesos3D(ext) {
    const M = this.M, ST = this._ST; let X = []; try { X = accesosExteriores(this.modelo, this.geos?.[0]); } catch (e) { console.warn('Visor 3D: accesos exteriores', e); }
    const P3 = (x, y, z) => [x, z, y]; const mat = M.losaExt;
    for (const A of X) {
      const cx = (A.caja.x0 + A.caja.x1) / 2, cy = (A.caja.y0 + A.caja.y1) / 2; ext.tag = this._tag(`acc|${A.id}`, ST.ext, cx, cy, 0);
      for (const q of A.piezas) {
        if (q.k !== 'rampa') { ext.caja(mat, q.x, q.y, -0.02, q.w, q.h, Math.max(0.03, q.z + 0.02)); continue; }
        const { x, y, w, h } = q; const zf = (px, py) => { const t = q.baja === 'E' ? (px - x) / w : q.baja === 'O' ? (x + w - px) / w : q.baja === 'S' ? (py - y) / h : (y + h - py) / h; return q.z0 + (q.z1 - q.z0) * Math.max(0, Math.min(1, t)); };
        const C = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => [px, py, zf(px, py)]);
        ext.quad(mat, P3(...C[0]), P3(...C[1]), P3(...C[2]), P3(...C[3]), [0, 1, 0]);
        for (let k = 0; k < 4; k++) { const a = C[k], b = C[(k + 1) % 4]; const nn = k === 0 ? [0, 0, -1] : k === 1 ? [1, 0, 0] : k === 2 ? [0, 0, 1] : [-1, 0, 0]; if (Math.max(a[2], b[2]) > 0.005) ext.quad(mat, P3(a[0], a[1], -0.02), P3(b[0], b[1], -0.02), P3(b[0], b[1], b[2]), P3(a[0], a[1], a[2]), nn); }
      }
      for (const r of A.barandillas) {
        const L = Math.hypot(r.x2 - r.x1, r.y2 - r.y1); if (L < 0.05) continue; const n = Math.max(1, Math.round(L / 1.2)); const z = (t) => r.z1 + (r.z2 - r.z1) * t; const pt = (t) => [r.x1 + (r.x2 - r.x1) * t, r.y1 + (r.y2 - r.y1) * t];
        for (let k = 0; k <= n; k++) { const [px, py] = pt(k / n); ext.caja(M.poste, px - 0.022, py - 0.022, z(k / n), 0.044, 0.044, 0.95); }
        const m = Math.max(1, Math.ceil(L / 0.3)); for (let k = 0; k < m; k++) { const [ax, ay] = pt(k / m), [bx, by] = pt((k + 1) / m); const za = z(k / m) + 0.93, zb = z((k + 1) / m) + 0.93; ext.caja(M.poste, Math.min(ax, bx) - 0.025, Math.min(ay, by) - 0.025, Math.min(za, zb), Math.abs(bx - ax) + 0.05, Math.abs(by - ay) + 0.05, Math.abs(zb - za) + 0.04); }
      }
    }
    ext.tag = 0;
  }
  cubiertas(pi, z0) {
    const modelo = this.modelo; const act = this.cel[pi]; const supM = this.cel[pi + 1] || new Map();
    const keys = cubierta(modelo, pi).filter((k) => { if (supM.get(k)?.tipo === 'doble_altura') return false; const e = act.get(k); return !(e && e.pergola && TIPOS[e.tipo]?.ext); });
    if (!keys.length) return;
    const tipo = tipoCub(modelo);
    if (tipo === 'plana') this.cubPlana(pi, z0, keys); else this.cubInclinada(pi, z0, keys, tipo);
  }
  cubPlana(pi, z0, keys) {
    const M = this.M, modelo = this.modelo; const lote = this._LL[pi].techo; const ST = this._ST; const act = this.cel[pi];
    const S = new Set(keys); const supM = this.cel[pi + 1] || new Map();
    const arribaInt = (k) => { const q = supM.get(k); return !!q && esInt(q.tipo); };
    const arribaAlgo = (k) => { const q = supM.get(k); return !!q && !TIPOS[q.tipo].vacio; };
    const quincho = (k) => act.get(k)?.tipo === 'quincho';
    const zE = z0 + H_PLANTA; const al = clamp(+modelo.cubierta?.alero || 0, 0, 1.5);
    rectangulos(keys).forEach((r, ri) => {
      const i0 = Math.round(r.x / T), j0 = Math.round(r.y / T), ni = Math.round(r.w / T), nj = Math.round(r.h / T);
      const ex = { N: 0, S: 0, O: 0, E: 0 };
      const pab = (al > 0) || Array.from({ length: ni * nj }, (_, q) => K(i0 + (q % ni), j0 + Math.floor(q / ni))).every(quincho);
      if (pab) {
        const v = Math.max(al, 0.3); const libre = (cs) => cs.every((k) => !S.has(k) && !arribaInt(k));
        const fila = (j) => Array.from({ length: ni }, (_, a) => K(i0 + a, j)), col = (i) => Array.from({ length: nj }, (_, c) => K(i, j0 + c));
        if (libre(fila(j0 - 1))) ex.N = v; if (libre(fila(j0 + nj))) ex.S = v; if (libre(col(i0 - 1))) ex.O = v; if (libre(col(i0 + ni))) ex.E = v;
      }
      const lx = r.w >= r.h; const Lr = lx ? r.w : r.h; const n = Math.max(1, Math.round(Lr / PANEL));
      for (let i = 0; i < n; i++) {
        const a0 = (i * Lr) / n, a1 = ((i + 1) * Lr) / n; const [px, py, pw, ph] = lx ? [r.x + a0, r.y, a1 - a0, r.h] : [r.x, r.y + a0, r.w, a1 - a0];
        const e0 = lx ? [i === 0 ? ex.O : 0, ex.N, i === n - 1 ? ex.E : 0, ex.S] : [ex.O, i === 0 ? ex.N : 0, ex.E, i === n - 1 ? ex.S : 0];
        // montaje: el panel de cubierta (con su vuelo) primero; la grava/acabado, en piezas, después de los petos
        this._tag(`r|${pi}|${ri}|${i}`, ST.cub(pi), px + pw / 2, py + ph / 2, zE);
        lote.caja(M.forjado, px - e0[0], py - e0[1], zE - E_FORJADO, pw + e0[0] + e0[2], ph + e0[1] + e0[3], E_FORJADO);
        this._tag(`rg|${pi}|${ri}|${i}`, ST.remate(pi), px + pw / 2, py + ph / 2, zE);
        lote.caja(M.cubierta, px, py, zE, pw, ph, 0.05);
      }
    });
    if (al > 0) return;
    // petos: aristas del contorno que no se apoyan en un volumen o terraza de la planta superior (ni en pabellones)
    const ar = [];
    for (const k of S) {
      if (quincho(k)) continue; const [i, j] = k.split(',').map(Number);
      const chk = (ni, nj, o, line, pos) => { const nk = K(ni, nj); if (S.has(nk) || arribaAlgo(nk)) return; ar.push({ o, line, pos }); };
      chk(i, j - 1, 'h', j, i); chk(i, j + 1, 'h', j + 1, i); chk(i - 1, j, 'v', i, j); chk(i + 1, j, 'v', i + 1, j);
    }
    ar.sort((p, q) => (p.o < q.o ? -1 : p.o > q.o ? 1 : p.line - q.line || p.pos - q.pos));
    const segs = []; let cur = null;
    for (const a of ar) { if (cur && cur.o === a.o && cur.line === a.line && cur.end === a.pos) { cur.end++; continue; } if (cur) segs.push(cur); cur = { o: a.o, line: a.line, start: a.pos, end: a.pos + 1 }; }
    if (cur) segs.push(cur);
    const hp = ALTO_PETO, e2 = E_FACHADA / 2; // remate a ALTO_PETO + E_ALBARDILLA: «hasta cubierta» enrasa aquí (core/bordes.mjs)
    for (const s of segs) {
      const u0 = s.start * T - e2, u1 = s.end * T + e2, c = s.line * T;
      for (let u = u0; u < u1 - 1e-4;) {
        const v = Math.min(u1, u + 1.5); const mx = s.o === 'h' ? (u + v) / 2 : c, my = s.o === 'h' ? c : (u + v) / 2; // peto en tramos de 1,50 m
        this._tag(`pe|${pi}|${s.o}|${c}|${u.toFixed(2)}`, ST.peto(pi), mx, my, zE);
        if (s.o === 'h') lote.caja(M.fachada, u, c - e2, zE, v - u, E_FACHADA, hp); else lote.caja(M.fachada, c - e2, u, zE, E_FACHADA, v - u, hp);
        this._tag(`pa|${pi}|${s.o}|${c}|${u.toFixed(2)}`, ST.remate(pi), mx, my, zE + hp);
        if (s.o === 'h') lote.caja(M.albardilla, u - 0.02, c - e2 - 0.02, zE + hp, v - u + 0.04, E_FACHADA + 0.04, E_ALBARDILLA); else lote.caja(M.albardilla, c - e2 - 0.02, u - 0.02, zE + hp, E_FACHADA + 0.04, v - u + 0.04, E_ALBARDILLA);
        u = v;
      }
    }
  }

  // Cubierta inclinada (una, dos, tres o cuatro aguas) sobre las celdas de cubierta de una planta.
  // Cada rectángulo de cubierta (rectangulos()) aporta una función de altura z = k·min(distancias a sus aleros) en su
  // dominio (rectángulo + alero; los extremos que se unen a otro rectángulo se prolongan dentro de él). La cubierta es
  // la envolvente superior de todas: así aparecen solas las limahoyas en L/T y las limatesas de los faldones.
  // Hastiales, cerramientos bajo cubierta y cantos se generan donde el campo de alturas lo pide.
  cubInclinada(pi, z0, keys, tipo) {
    const M = this.M, modelo = this.modelo, cub = modelo.cubierta || {}; const lote = this._LL[pi].techo; const ST = this._ST;
    const techoM = modelo.acabados?.techo === 'yeso' || !M.techoMadera ? M.techo : M.techoMadera; // techo de madera bajo cubierta inclinada
    const S = new Set(keys); const supM = this.cel[pi + 1] || new Map(); const act = this.cel[pi];
    const zE = z0 + H_PLANTA; const al = clamp(+cub.alero || 0, 0, 1.5);
    const mat0 = CUB_MAT[cub.material] ? cub.material : 'teja'; const pend = clamp(+cub.pendiente || CUB_MAT[mat0]?.pend || 25, 3, 60); const k = Math.tan(rad(pend)); const t = 0.2;
    const eLib = Math.max(al, 0.2); const e2 = E_FACHADA / 2; const acc = modelo.acceso || 'N';
    const alto = (kk) => { const q = supM.get(kk); return !!q && esInt(q.tipo); }; // en la celda vecina se levanta un volumen superior
    const OPL = OPUESTO;
    // 'una' agua: un plano para toda la planta (cae hacia el jardín, o lejos del volumen al que se adosa)
    let unaDir = null;
    if (tipo === 'una') {
      const cuenta = { N: 0, S: 0, E: 0, O: 0 };
      for (const kk of S) { const [i, j] = kk.split(',').map(Number); if (alto(K(i, j - 1))) cuenta.N++; if (alto(K(i, j + 1))) cuenta.S++; if (alto(K(i - 1, j))) cuenta.O++; if (alto(K(i + 1, j))) cuenta.E++; }
      const ap = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0];
      if (ap[1] > 0) unaDir = OPL[ap[0]]; // cae hacia el lado opuesto al muro alto
      else unaDir = caidaCubierta(modelo); // v.1.6: cubierta.caida (girable en Diseño) o, sin ella, la de siempre (core/geometria.mjs)
    }
    let gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
    for (const kk of S) { const [i, j] = kk.split(',').map(Number); gx0 = Math.min(gx0, i * T); gy0 = Math.min(gy0, j * T); gx1 = Math.max(gx1, (i + 1) * T); gy1 = Math.max(gy1, (j + 1) * T); }
    const rects = rectangulosMax(keys).map((r) => {
      const i0 = Math.round(r.x / T), j0 = Math.round(r.y / T), ni = Math.round(r.w / T), nj = Math.round(r.h / T);
      const fila = (j) => Array.from({ length: ni }, (_, q) => K(i0 + q, j)), col = (i) => Array.from({ length: nj }, (_, q) => K(i, j0 + q));
      const celdas = { N: (q) => fila(j0 - q), S: (q) => fila(j0 + nj - 1 + q), O: (q) => col(i0 - q), E: (q) => col(i0 + ni - 1 + q) };
      const frac = (cs, f) => cs.filter(f).length / cs.length;
      const est = {}; const prof = {};
      for (const l of ['N', 'S', 'E', 'O']) {
        const cs = celdas[l](1); est[l] = frac(cs, alto) >= 0.6 ? 'apoyado' : frac(cs, (c) => S.has(c)) >= 0.6 ? 'unido' : 'libre';
        let d = 0; if (est[l] === 'unido') for (let q = 1; q < 160; q++) { if (frac(celdas[l](q), (c) => S.has(c)) < 0.6) break; d = q; } prof[l] = d * T;
      }
      const ejeX = cub.cumbrera === 'x' ? true : cub.cumbrera === 'y' ? false : Math.abs(r.w - r.h) > 1e-6 ? r.w > r.h : gx1 - gx0 >= gy1 - gy0;
      const largos = ejeX ? ['N', 'S'] : ['O', 'E'], fines = ejeX ? ['O', 'E'] : ['N', 'S']; const half = (ejeX ? r.h : r.w) / 2;
      const linea = { N: [r.y, 1, 'y'], S: [r.y + r.h, -1, 'y'], O: [r.x, 1, 'x'], E: [r.x + r.w, -1, 'x'] };
      let lados = []; let kk = k, cap = Infinity, span = 2 * half;
      if (tipo === 'una') { lados = []; }
      else {
        const lg = largos.filter((l) => est[l] !== 'apoyado'); lados = lg;
        if (lg.length === 1) { kk = Math.min(k, (H_PLANTA - 0.45) / span); cap = H_PLANTA - 0.45; } // a un agua contra el volumen alto
        if (tipo === 'cuatro' || tipo === 'tres') {
          let fs = fines.filter((l) => est[l] === 'libre');
          if (tipo === 'tres') { const hip = fines.includes(OPL[acc]) ? OPL[acc] : fines[1]; fs = fs.filter((l) => l === hip); }
          lados = lados.concat(fs);
        }
      }
      // dominio: alero en lados libres; los extremos unidos se prolongan (hasta la cumbrera vecina o atravesándola)
      const ext = {};
      for (const l of ['N', 'S', 'E', 'O']) {
        if (est[l] === 'libre') ext[l] = eLib;
        else if (est[l] === 'unido' && fines.includes(l)) ext[l] = half <= prof[l] / 2 + 1e-6 ? Math.min(prof[l], half + 0.1) : prof[l] + (frac(celdas[l](Math.round(prof[l] / T) + 1), (c) => !S.has(c) && !alto(c)) > 0.5 ? eLib : 0);
        else ext[l] = 0;
      }
      const dom = [r.x - ext.O, r.y - ext.N, r.x + r.w + ext.E, r.y + r.h + ext.S];
      const f = (x, y) => { let m = Infinity; for (const l of lados) { const [c0, sg, ax] = linea[l]; const d = sg * ((ax === 'x' ? x : y) - c0); if (d < m) m = d; } return m === Infinity ? 0 : Math.min(cap, kk * m); };
      return { r, dom, f, ejeX };
    });
    // una agua: plano único sobre la caja de la planta
    if (tipo === 'una') {
      const span = horizL(unaDir) ? gy1 - gy0 : gx1 - gx0; const kk = Math.min(k, 4.5 / Math.max(span, 0.1));
      const base = { N: [gy0, 1, 'y'], S: [gy1, -1, 'y'], O: [gx0, 1, 'x'], E: [gx1, -1, 'x'] }[unaDir];
      for (const R of rects) R.f = (x, y) => kk * base[1] * ((base[2] === 'x' ? x : y) - base[0]);
    }
    const dentroDom = (R, x, y, e = 1e-6) => x >= R.dom[0] - e && x <= R.dom[2] + e && y >= R.dom[1] - e && y <= R.dom[3] + e;
    const Hf = (x, y) => { let h = -Infinity; for (const R of rects) if (dentroDom(R, x, y)) { const v = R.f(x, y); if (v > h) h = v; } return h; };
    // rejilla: líneas de dominio, de rectángulo y de cumbrera + subdivisión regular
    const g = T / 2; const xs = [], ys = [];
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity; for (const R of rects) { bx0 = Math.min(bx0, R.dom[0]); by0 = Math.min(by0, R.dom[1]); bx1 = Math.max(bx1, R.dom[2]); by1 = Math.max(by1, R.dom[3]); }
    for (const R of rects) { xs.push(R.dom[0], R.dom[2], R.r.x, R.r.x + R.r.w, R.r.x + R.r.w / 2); ys.push(R.dom[1], R.dom[3], R.r.y, R.r.y + R.r.h, R.r.y + R.r.h / 2); }
    for (let x = Math.ceil(bx0 / g) * g; x < bx1; x += g) xs.push(x); for (let y = Math.ceil(by0 / g) * g; y < by1; y += g) ys.push(y);
    const uniq = (a) => { a.sort((p, q) => p - q); const o = []; for (const v of a) if (!o.length || v - o[o.length - 1] > 0.02) o.push(v); return o; };
    const X = uniq(xs), Y = uniq(ys); const nx = X.length, ny = Y.length;
    const hv = new Float64Array(nx * ny); for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) hv[i * ny + j] = Hf(X[i], Y[j]);
    const dentro = new Uint8Array(nx * ny);
    for (let i = 0; i < nx - 1; i++) for (let j = 0; j < ny - 1; j++) { const mx = (X[i] + X[i + 1]) / 2, my = (Y[j] + Y[j + 1]) / 2; if (rects.some((R) => dentroDom(R, mx, my, -1e-6))) dentro[i * ny + j] = 1; }
    const den = (i, j) => i >= 0 && j >= 0 && i < nx - 1 && j < ny - 1 && dentro[i * ny + j] === 1;
    const P3 = (x, y, h) => [x, zE + h, y];
    // UV de teja/chapa: u a lo largo de la curva de nivel, v en la línea de máxima pendiente (longitud real)
    const uvTecho = (A, B, C) => {
      const x1 = B[0] - A[0], y1 = B[2] - A[2], z1 = B[1] - A[1], x2 = C[0] - A[0], y2 = C[2] - A[2], z2 = C[1] - A[1]; const det = x1 * y2 - x2 * y1;
      if (Math.abs(det) < 1e-9) return null; const gxx = (z1 * y2 - z2 * y1) / det, gyy = (x1 * z2 - x2 * z1) / det; const gl = Math.hypot(gxx, gyy);
      if (gl < 1e-3) return [[A[0], A[2]], [B[0], B[2]], [C[0], C[2]]];
      const dx = gxx / gl, dy = gyy / gl, sec = Math.sqrt(1 + gl * gl); const f = (P) => [-P[0] * dy + P[2] * dx, (P[0] * dx + P[2] * dy) * sec]; return [f(A), f(B), f(C)];
    };
    for (let i = 0; i < nx - 1; i++) for (let j = 0; j < ny - 1; j++) {
      if (!den(i, j)) continue;
      const xa = X[i], xb = X[i + 1], ya = Y[j], yb = Y[j + 1]; const h00 = hv[i * ny + j], h10 = hv[(i + 1) * ny + j], h11 = hv[(i + 1) * ny + j + 1], h01 = hv[i * ny + j + 1];
      const hc = Hf((xa + xb) / 2, (ya + yb) / 2); const diagA = Math.abs((h00 + h11) / 2 - hc) <= Math.abs((h10 + h01) / 2 - hc);
      this._tag(`r|${pi}|${Math.floor((xa + xb) / 2 / PANEL)}|${Math.floor((ya + yb) / 2 / 3)}`, ST.cub(pi), (xa + xb) / 2, (ya + yb) / 2, zE);
      const tris = diagA ? [[[xa, ya, h00], [xb, ya, h10], [xb, yb, h11]], [[xa, ya, h00], [xb, yb, h11], [xa, yb, h01]]] : [[[xa, ya, h00], [xb, ya, h10], [xa, yb, h01]], [[xb, ya, h10], [xb, yb, h11], [xa, yb, h01]]];
      for (const tr of tris) {
        const A = P3(tr[0][0], tr[0][1], tr[0][2] + t), B = P3(tr[1][0], tr[1][1], tr[1][2] + t), C = P3(tr[2][0], tr[2][1], tr[2][2] + t);
        lote.tri(M.cubierta, A, B, C, [0, 1, 0], uvTecho(A, B, C));
        lote.tri(techoM, P3(...tr[0]), P3(...tr[1]), P3(...tr[2]), [0, -1, 0]);
      }
      // cantos (frentes de alero y de hastial)
      const canto = (x0, y0, ha, x1, y1, hb, n) => lote.quad(M.canto, P3(x0, y0, ha), P3(x1, y1, hb), P3(x1, y1, hb + t), P3(x0, y0, ha + t), n);
      if (!den(i, j - 1)) canto(xa, ya, h00, xb, ya, h10, [0, 0, -1]); if (!den(i, j + 1)) canto(xa, yb, h01, xb, yb, h11, [0, 0, 1]);
      if (!den(i - 1, j)) canto(xa, ya, h00, xa, yb, h01, [-1, 0, 0]); if (!den(i + 1, j)) canto(xb, ya, h10, xb, yb, h11, [1, 0, 0]);
    }
    // hastiales y testeros: en el contorno de la planta, del muro (zE) a la cara inferior de la cubierta
    const ar = [];
    for (const kk of S) {
      const [i, j] = kk.split(',').map(Number);
      const chk = (a, c, o, line, pos, sg) => { const nk = K(a, c); if (S.has(nk) || alto(nk)) return; ar.push({ o, line, pos, sg, e: act.get(kk) }); };
      chk(i, j - 1, 'h', j, i, -1); chk(i, j + 1, 'h', j + 1, i, 1); chk(i - 1, j, 'v', i, j, -1); chk(i + 1, j, 'v', i + 1, j, 1);
    }
    ar.sort((p, q) => (p.o < q.o ? -1 : p.o > q.o ? 1 : p.line - q.line || p.sg - q.sg || p.pos - q.pos));
    const runs = []; let cur = null;
    for (const a of ar) { const vid = a.e?.tipo === 'doble_altura'; if (cur && cur.o === a.o && cur.line === a.line && cur.sg === a.sg && cur.end === a.pos && cur.vid === vid) { cur.end++; continue; } if (cur) runs.push(cur); cur = { o: a.o, line: a.line, sg: a.sg, start: a.pos, end: a.pos + 1, vid, int: a.e && esInt(a.e.tipo) }; }
    if (cur) runs.push(cur);
    for (const s of runs) {
      const c = s.line * T; const hz = s.o === 'h'; const fo = c + s.sg * e2, fi = c - s.sg * e2; const n = hz ? [0, 0, s.sg] : [s.sg, 0, 0];
      const pt = (u, v) => (hz ? [u, v] : [v, u]);
      // cara vertical bajo la cubierta: de zE (o de h − banda) a la cara inferior de la cubierta (menos recorte)
      const cara = (v, u0, u1, mat, nn, recorte = 0, banda = 0) => {
        const pasos = Math.max(1, Math.ceil((u1 - u0) / g)); const du = (u1 - u0) / pasos;
        for (let q = 0; q < pasos; q++) {
          const a = u0 + q * du, b = a + du; const [ax, ay] = pt(a, v), [bx, by] = pt(b, v); const ha = Hf(ax, ay) - recorte, hb = Hf(bx, by) - recorte;
          if (!(ha > 0.01 || hb > 0.01) || !isFinite(ha) || !isFinite(hb)) continue;
          this._tag(`r|${pi}|${Math.floor((ax + bx) / 2 / PANEL)}|${Math.floor((ay + by) / 2 / 3)}`, ST.cub(pi), (ax + bx) / 2, (ay + by) / 2, zE);
          const za = banda ? Math.max(0, ha - banda) : 0, zb = banda ? Math.max(0, hb - banda) : 0;
          lote.quad(mat, P3(ax, ay, za), P3(bx, by, zb), P3(bx, by, Math.max(0, hb)), P3(ax, ay, Math.max(0, ha)), nn);
        }
      };
      if (s.vid) { // hastial acristalado sobre la doble altura (My Way): vidrio con montantes y banda maciza bajo el canto
        cara(c, s.start * T, s.end * T, M.vidrio, n, 0.14); cara(fo, s.start * T - e2, s.end * T + e2, M.fachada, n, 0, 0.16); cara(fi, s.start * T + e2, s.end * T - e2, M.yeso, n.map((v) => -v), 0, 0.16);
        cara(c, s.start * T, s.end * T, M.marco, n, 0.1, 0.05);
        for (let u = s.start * T + 1.2; u < s.end * T - 0.2; u += 1.2) { const [x, y] = pt(u, c); const hh = Hf(x, y); if (hh > 0.2) this.cajaV(M.marco, x - (hz ? 0.03 : 0.04), y - (hz ? 0.04 : 0.03), zE, hz ? 0.06 : 0.08, hz ? 0.08 : 0.06, hh - 0.05, 'techo'); }
        // marco perimetral: solo los bordes inclinados quedan dentro del canto de cubierta
        continue;
      }
      cara(fo, s.start * T - e2, s.end * T + e2, M.fachada, n);
      cara(fi, s.start * T + e2, s.end * T - e2, s.int ? M.yeso : M.fachada, n.map((v) => -v));
    }
    // tabiques de la última planta: se cierran hasta la cubierta inclinada
    const g0 = this.geos[pi];
    for (const s of g0.segs) {
      if (s.clase !== 'tabique') continue; const hz = s.o === 'h'; const c = hz ? s.y1 : s.x1; const a0 = hz ? s.x1 : s.y1, a1 = a0 + s.len;
      if (s.a?.tipo === 'doble_altura' || s.b?.tipo === 'doble_altura') continue;
      const pasos = Math.max(1, Math.ceil(s.len / g)); const du = s.len / pasos;
      this._tag(`rt|${pi}|${s.o}|${c}|${a0.toFixed(2)}`, ST.peto(pi), hz ? a0 + s.len / 2 : c, hz ? c : a0 + s.len / 2, zE); // remate del tabique hasta la cubierta
      for (let q = 0; q < pasos; q++) {
        const u0 = a0 + q * du, u1 = u0 + du; const [ax, ay] = hz ? [u0, c] : [c, u0], [bx, by] = hz ? [u1, c] : [c, u1];
        const ha = Hf(ax, ay), hb = Hf(bx, by); if (!isFinite(ha) || !isFinite(hb)) continue;
        const za = H_TAB - H_PLANTA; // del techo del tabique (2,74) a la cubierta
        for (const sg of [-1, 1]) { const o = c + sg * E_TABIQUE / 2; const [pa, pb] = hz ? [[ax, o], [bx, o]] : [[o, ay], [o, by]]; lote.quad(M.yeso, P3(pa[0], pa[1], za), P3(pb[0], pb[1], za), P3(pb[0], pb[1], Math.max(za, hb)), P3(pa[0], pa[1], Math.max(za, ha)), hz ? [0, 0, sg] : [sg, 0, 0]); }
      }
    }
  }

  // ------------------------------------------------------------------------------------------------------
  // Entorno: terreno (con el hueco de las piscinas), camino, parcela, linderos, vecinos y paisajismo.
  entorno(parcela) {
    const M = this.M, mq = this.opt.maqueta, ctx = this.ctx; const L = new Lote();
    const JS = CAT.JARDINES || {}; const J = this.modelo.jardin && this.modelo.jardin !== 'sin' && (JS[this.modelo.jardin] || ['mediterraneo', 'praderia', 'cesped', 'huerto', 'zen', 'bosque'].includes(this.modelo.jardin)) ? this.modelo.jardin : 'sin';
    const sueloJ = { mediterraneo: M.gravaCalida, praderia: M.pradera, zen: M.gravaZen, bosque: M.mantillo }[J] || M.cesped;
    const forma = (poly) => { const s = new THREE.Shape(); poly.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); return s; };
    // huecos de piscina en coordenadas de parcela (x, −z del mundo)
    const huecos = [...(this._piscinas || []).map((r) => [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]]), ...(this._huecosTerreno || [])].map((poly) => poly.map(([x, y]) => { const v = this.mundo(x, y); return [v.x, -v.z]; })); // v.1.6: rampa y patios ingleses del sótano
    this._terrenoOpaco = undefined;
    const conHuecos = (sh, dentroDe) => { for (const h of huecos) if (!dentroDe || h.every(([x, y]) => enPoli(x, y, dentroDe))) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y)))); return sh; };
    const plano = (poly, mat, y, dentroDe, uvf) => {
      const g = new THREE.ShapeGeometry(conHuecos(forma(poly), dentroDe)); if (uvf) { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const [u, v] = uvf(p.getX(i), p.getY(i)); uv.setXY(i, u, v); } }
      const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; m.userData.terreno = true; this.sitio.add(m); return m;
    };
    const G = 2000; plano([[-G, -G], [G, -G], [G, G], [-G, G]], M.terreno, -0.03);
    const caja = (mat, cx, cz, ang, largo, alto, fondo, y0 = 0) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(cx, y0 + alto / 2, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ang, 0)), new THREE.Vector3(1, 1, 1)); const g = new THREE.BoxGeometry(largo, alto, fondo); L.geo(mat, g, m); g.dispose(); };
    // camino: de la puerta de entrada a la calle
    const g0 = this.geos[0]; const puerta = g0 && (g0.huecos.find((h) => h.entrada) || g0.huecos.find((h) => h.tipo === 'puerta'));
    let tPuerta = null; const piernas = [];
    if (puerta) {
      const o = { N: [0, -1], S: [0, 1], E: [1, 0], O: [-1, 0] }[puerta.lado] || [0, -1];
      const A = this.mundo(puerta.x + o[0] * 0.4, puerta.y + o[1] * 0.4), Bp = this.mundo(puerta.x + o[0] * 2.4, puerta.y + o[1] * 2.4);
      let Sp = null;
      if (parcela) {
        const P = parcela.poligono, f = parcela.frente || 0, a = P[f], b = P[(f + 1) % P.length]; const bx = Bp.x, by = -Bp.z;
        const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy; const tt = Math.max(0.05, Math.min(0.95, ((bx - a[0]) * dx + (by - a[1]) * dy) / (l2 || 1)));
        Sp = new THREE.Vector3(a[0] + dx * tt, 0, -(a[1] + dy * tt)); tPuerta = tt;
        const pg = this._peatonal(parcela); if (pg) Sp = new THREE.Vector3(pg[0], 0, -pg[1]); // el camino llega a la puerta peatonal
      } else Sp = Bp.clone().add(Bp.clone().sub(A).normalize().multiplyScalar(6));
      piernas.push([A, Bp], [Bp, Sp]);
      if (this._rampaS) { const V = this._rampaS.vertices; for (let i = 1; i < V.length; i++) piernas.push([this.mundo(V[i - 1].x, V[i - 1].y), this.mundo(V[i].x, V[i].y)]); } // v.1.6: el jardín deja libre la rampa
      for (const [p0, p1] of piernas) {
        const d = p1.clone().sub(p0); d.y = 0; const Ld = d.length(); if (Ld < 0.3) continue; d.normalize(); const ang = Math.atan2(-d.z, d.x);
        const n = Math.max(1, Math.floor((Ld + 0.08) / 0.62));
        for (let i = 0; i < n; i++) { const c = p0.clone().addScaledVector(d, 0.31 + i * 0.62); caja(M.losaExt, c.x, c.z, ang, 0.54, 0.045, 1.1); }
      }
    }
    let region;
    if (parcela) {
      region = parcela.poligono;
      if (parcela.orto && ctx.ortoUrl && !mq) {
        const b = parcela.orto.bbox; const tx = new THREE.TextureLoader().load(ctx.ortoUrl, () => this.pedir()); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
        const mo = new THREE.MeshStandardMaterial({ map: tx, roughness: 1 }); this._mats.push(mo); mo.userData.tex = tx;
        plano([[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]], mo, -0.015, null, (x, y) => [(x - b[0]) / (b[2] - b[0]), (y - b[1]) / (b[3] - b[1])]);
      }
      plano(parcela.poligono, sueloJ, 0, parcela.poligono);
      const ml = new THREE.LineBasicMaterial({ color: mq ? '#12130f' : '#3a3a35' }), mv = new THREE.LineBasicMaterial({ color: '#8d8c84' }); this._mats.push(ml, mv);
      const pts = parcela.poligono.concat([parcela.poligono[0]]).map((p) => new THREE.Vector3(p[0], 0.06, -p[1])); this.sitio.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ml));
      for (const v of parcela.entorno?.parcelas || []) { const q = v.concat([v[0]]).map((p) => new THREE.Vector3(p[0], 0.04, -p[1])); this.sitio.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(q), mv)); }
      const rx = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
      for (const ed of parcela.entorno?.edificios || []) { if (ed.existente) continue; const g = new THREE.ExtrudeGeometry(forma(ed.poly), { depth: Math.max(1, ed.plantas) * 3, bevelEnabled: false }); L.geo(M.vecino, g, rx); g.dispose(); }
      // linderos: cerramientos de parcela por lado con sus puertas (ver _cerramientos)
      const n0 = this.sitio.children.length; // lo que añaden los cerramientos se anima al final del montaje
      try { piernas.push(...this._cerramientos(parcela)); } catch (e) { console.warn('Visor 3D: cerramientos de parcela', e); }
      for (const o of this.sitio.children.slice(n0)) o.userData.montaje = 'cerr';
    } else {
      const c = this.casa.position; const r = Math.max(this.b.w, this.b.h) / 2 + 12;
      region = [[c.x - r, -c.z - r], [c.x + r, -c.z - r], [c.x + r, -c.z + r], [c.x - r, -c.z + r]];
      plano(region, sueloJ, -0.005, region);
    }
    L.mallas(this.sitio);
    const n1 = this.sitio.children.length;
    if (J !== 'sin') { try { this.jardin(J, region, piernas, !!parcela); } catch (e) { console.warn('Visor 3D: paisajismo', e); } }
    else if (!ctx.sinArboles) this.arboles(parcela);
    for (const o of this.sitio.children.slice(n1)) o.userData.montaje = 'jardin';
    if (!mq) { try { this.lejanias(); } catch (e) { console.warn('Visor 3D: lejanías', e); } }
  }
  // Contexto lejano: anillo de lomas bajas a 0,7–1,4 km (relieve suave por ruido), que la niebla funde con el cielo.
  // Da horizonte (como el valle de la portada de NANCA) sin coste: una malla, sin sombras.
  lejanias() {
    const R = azar(hash('lejos|' + (this.modelo.id || '')) ); const s1 = R() * 9, s2 = R() * 9, s3 = R() * 9; const NA = 160, NR = 7;
    const pos = [], col = [], idx = []; const c0 = new THREE.Color('#7f8a63'), c1 = new THREE.Color('#a49a7a'), c = new THREE.Color();
    for (let i = 0; i <= NA; i++) {
      const a = (i / NA) * Math.PI * 2;
      const hBase = 18 + 46 * (0.5 + 0.5 * Math.sin(a * 3 + s1)) * (0.6 + 0.4 * Math.sin(a * 7 + s2)) + 14 * Math.sin(a * 17 + s3);
      for (let j = 0; j <= NR; j++) {
        const t = j / NR; const r = 700 + 760 * t; const prof = Math.sin(Math.PI * Math.min(1, t * 1.25)); const h = Math.max(0, hBase * prof * (0.75 + 0.25 * Math.sin(a * 11 + t * 5)));
        pos.push(Math.cos(a) * r, h - 2 - (1 - prof) * 6, Math.sin(a) * r); c.copy(c0).lerp(c1, 0.35 + 0.5 * t + 0.15 * Math.sin(a * 5)); col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < NA; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + NR + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }); this._mats.push(m);
    const me = new THREE.Mesh(g, m); me.position.set(this.casa.position.x, 0, this.casa.position.z); me.name = 'lejanias'; me.frustumCulled = false; this.sitio.add(me);
  }
  // ------------------------------------------------------------------------------------------------------
  // Cerramientos de parcela (core/cerramientos.mjs): muro de bloque, prefabricado de hormigón, malla de simple
  // torsión, murete con valla o lamas, lamas de madera, seto y gavión, con machones y puertas (vehículos: corredera,
  // batiente o basculante; peatonal) y la losa del acceso rodado. Devuelve sendas que el paisajismo deja libres.
  // Coordenadas: sitio (x este, y norte) → mundo (x, altura, −y). o = distancia hacia dentro desde el lindero.
  _cfgCerr(parcela) { try { return resolverCerramientos(parcela, this.modelo, this.ctx?.casa); } catch (e) { return null; } }
  _peatonal(parcela) {
    const cfg = this._cfgCerr(parcela); if (!cfg) return null; const f = parcela.frente || 0;
    const p = cfg.puertas.find((q) => q.clase === 'peaton' && q.lado === f) || cfg.puertas.find((q) => q.clase === 'peaton'); if (!p) return null;
    return enLado(geometriaLado(parcela, p.lado), p.t, (CERR[ladoCerramiento(cfg, p.lado).tipo]?.e || 0) + 0.45);
  }
  _cerramientos(parcela) {
    const cfg = this._cfgCerr(parcela); if (!cfg) return [];
    const mq = this.opt.maqueta, M = this.M, L = new Lote(), sendas = []; const R = azar(hash('cerr|' + (this.modelo.id || '')));
    // materiales (se liberan con this._mats); en maqueta, cartón sin texturas
    const cache = new Map();
    const mat = (k, o, maq = '#ecebe6') => { if (cache.has(k)) return cache.get(k); const q = Object.assign({ roughness: 0.85, metalness: 0 }, o); if (mq) { delete q.map; delete q.bumpMap; q.color = maq; q.metalness = 0; q.roughness = 0.9; if (q.transparent) q.opacity = 0.45; }
      const m = new THREE.MeshStandardMaterial(q); m.name = 'cerr_' + k; this._mats.push(m); cache.set(k, m); return m; };
    const tx = (f, bs = 0.5) => { const t = f(); return t.bump ? { map: t.map, bumpMap: t.bump, bumpScale: bs } : { map: t.map }; };
    const enfoscado = () => mat('enfoscado', { color: '#ffffff', ...tx(() => texEstuco('#ebe7de'), 0.5), roughness: 0.95 }, '#f2f1ed');
    const coronacion = () => mat('coronacion', { color: '#dedad1', ...tx(texHormigonLiso, 0.4), roughness: 0.8 }, '#e6e5df');
    const metal = (col, k = col) => mat('metal' + k, { color: col, roughness: 0.42, metalness: 0.55 }, '#d6d5cf');
    const chapa = (col) => mat('chapa' + col, { color: col, ...tx(texChapa, 0.6), roughness: 0.45, metalness: 0.45 }, '#dcdbd5');
    const muroDe = (s) => {
      const c = s.T.acabados[s.acabado]?.color || '#cccccc';
      if (s.tipo === 'bloque') return s.acabado === 'visto' ? mat('bloque', { color: '#ffffff', ...tx(texBloque, 0.9), roughness: 0.95 }, '#eeede8') : enfoscado();
      if (s.tipo === 'prefabricado') return mat('pref' + s.acabado, { color: String(s.acabado).startsWith('gris') ? '#b9b8b3' : '#f4f2ec', ...tx(texHormigonLiso, 0.25), roughness: 0.82 }, '#ebeae5');
      if (s.tipo === 'gavion') return mat('gav' + s.acabado, { color: s.acabado === 'granito' ? '#b9b8b4' : '#fff4dc', ...tx(texPiedraSeca, 1.8), roughness: 0.95 }, '#e4e2dc');
      return enfoscado();
    };
    const colMetal = (s) => (['murete_valla', 'murete_lamas', 'malla'].includes(s.tipo) && s.T.acabados[s.acabado]?.color) || '#3b3d3e';
    const reciclado = (s) => mat('rec' + s.acabado, { color: s.T.acabados[s.acabado]?.color || '#3f4142', roughness: 0.55, metalness: 0.02 }, '#dddcd6');
    const madera = (s) => mat('mad' + s.acabado, { color: { natural: '#f6d8b2', gris: '#d2d0cb', oscura: '#8d6a50' }[s.acabado] || '#f6d8b2', ...tx(texTarima, 0.4), roughness: 0.8 }, '#e2e0d9');
    const malla = (col) => mat('malla' + col, { color: col, ...tx(texMalla), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.5, metalness: 0.35 }, '#cfcdc6');
    const rejilla = () => mat('rejilla', { color: '#9a9c99', ...tx(texRejilla), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.4, metalness: 0.7 }, '#cfcdc6');
    const seto = (s) => mat('seto' + s.acabado, { color: { aligustre: '#ffffff', cipres: '#9db596', laurel: '#eef3d6' }[s.acabado] || '#ffffff', ...tx(texSeto, 1.4), roughness: 1 }, '#e2e1da');
    // primitivas a lo largo de un lindero G
    const P3 = (q, h) => [q[0], h, -q[1]];
    const prisma = (m, G, t0, t1, o0, o1, z0, z1) => {
      if (!m || t1 - t0 < 1e-3 || o1 - o0 < 1e-4 || z1 - z0 < 1e-3) return;
      const A = (t, o, z) => P3(enLado(G, t, o), z); const n3 = [G.n[0], 0, -G.n[1]], u3 = [G.u[0], 0, -G.u[1]];
      L.quad(m, A(t0, o0, z0), A(t1, o0, z0), A(t1, o0, z1), A(t0, o0, z1), [-n3[0], 0, -n3[2]], [[t0, z0], [t1, z0], [t1, z1], [t0, z1]]);
      L.quad(m, A(t0, o1, z0), A(t1, o1, z0), A(t1, o1, z1), A(t0, o1, z1), n3, [[t0, z0], [t1, z0], [t1, z1], [t0, z1]]);
      L.quad(m, A(t0, o0, z1), A(t1, o0, z1), A(t1, o1, z1), A(t0, o1, z1), [0, 1, 0], [[t0, o0], [t1, o0], [t1, o1], [t0, o1]]);
      L.quad(m, A(t0, o0, z0), A(t0, o1, z0), A(t0, o1, z1), A(t0, o0, z1), [-u3[0], 0, -u3[2]], [[o0, z0], [o1, z0], [o1, z1], [o0, z1]]);
      L.quad(m, A(t1, o0, z0), A(t1, o1, z0), A(t1, o1, z1), A(t1, o0, z1), u3, [[o0, z0], [o1, z0], [o1, z1], [o0, z1]]);
    };
    const lamina = (m, G, t0, t1, o, z0, z1) => { const A = (t, z) => P3(enLado(G, t, o), z); L.quad(m, A(t0, z0), A(t1, z0), A(t1, z1), A(t0, z1), [G.n[0], 0, -G.n[1]], [[t0, z0], [t1, z0], [t1, z1], [t0, z1]]); };
    const tubo = (m, G, t, o, d, z0, z1) => { const q = enLado(G, t, o); const mx = new THREE.Matrix4().compose(new THREE.Vector3(q[0], (z0 + z1) / 2, -q[1]), new THREE.Quaternion(), new THREE.Vector3(d, z1 - z0, d)); L.geo(m, unidad().cil, mx); };
    const cada = (t0, t1, paso, fn) => { const k = Math.max(1, Math.round((t1 - t0) / paso)); for (let j = 0; j <= k; j++) fn(t0 + ((t1 - t0) * j) / k, j, k); };
    const conCoronacion = (G, t0, t1, e, z) => { prisma(muroDe(G), G, t0, t1, 0, e, 0, z - 0.04); prisma(coronacion(), G, t0, t1, -0.025, e + 0.025, z - 0.04, z); };
    const barrotes = (m, G, t0, t1, o, z0, z1, paso = 0.11) => { prisma(m, G, t0, t1, o - 0.02, o + 0.02, z1 - 0.04, z1); prisma(m, G, t0, t1, o - 0.02, o + 0.02, z0, z0 + 0.04); for (let t = t0 + paso / 2; t < t1 - 0.02; t += paso) prisma(m, G, t - 0.006, t + 0.006, o - 0.02, o + 0.02, z0 + 0.04, z1 - 0.04); };
    const lamas = (m, G, t0, t1, o, z0, z1, h = 0.1, hueco = 0.025, g = 0.02) => { for (let z = z0; z + h <= z1 + 1e-6; z += h + hueco) prisma(m, G, t0, t1, o - g / 2, o + g / 2, z, z + h); };
    const tr = tramosCerramiento(parcela, cfg);
    for (const s of tr) {
      const e = s.e, H = s.alto, T = s.T; if (s.L < 0.5) continue;
      for (const [t0, t1] of s.tramos) {
        if (t1 - t0 < 0.05) continue;
        if (s.tipo === 'bloque') { conCoronacion(s, t0, t1, e, H); cada(t0, t1, T.poste, (t, j, k) => { if (j && j < k) prisma(muroDe(s), s, t - 0.15, t + 0.15, e, e + 0.1, 0, H - 0.04); }); }
        else if (s.tipo === 'prefabricado') { // paneles CUEVA verticales de 1,50 m, junta de 1 cm, sin postes
          const mod = T.modulo || 1.5; const k = Math.max(1, Math.round((t1 - t0) / mod)), lg = (t1 - t0) / k;
          for (let j = 0; j < k; j++) prisma(muroDe(s), s, t0 + j * lg + (j ? 0.005 : 0), t0 + (j + 1) * lg - (j < k - 1 ? 0.005 : 0), 0, e, 0, H);
          prisma(mat('juntaPref', { color: '#6d6c68', roughness: 0.9 }, '#bdbcb6'), s, t0, t1, e * 0.3, e * 0.7, 0.002, H - 0.002);
        } else if (s.tipo === 'malla') {
          const c = colMetal(s), mm = metal(c); lamina(malla(c), s, t0, t1, e / 2 + 0.012, 0.04, H);
          for (const z of [0.12, H / 2, H - 0.06]) prisma(mm, s, t0, t1, e / 2 - 0.003, e / 2 + 0.003, z, z + 0.006);
          cada(t0, t1, T.poste, (t, j, k) => tubo(mm, s, t, e / 2, j === 0 || j === k ? 0.06 : 0.048, 0, H + 0.06));
        } else if (s.tipo === 'murete_valla' || s.tipo === 'murete_lamas') {
          const h0 = Math.min(T.murete, H - 0.4), mm = metal(colMetal(s)); conCoronacion(s, t0, t1, e, h0);
          cada(t0, t1, T.poste, (t) => prisma(mm, s, t - 0.03, t + 0.03, e / 2 - 0.03, e / 2 + 0.03, h0, H));
          if (s.tipo === 'murete_valla') barrotes(mm, s, t0, t1, e / 2, h0 + 0.04, H);
          else lamas(s.acabado === 'madera' ? mat('lamaMad', { color: '#c79566', ...tx(texVeta), roughness: 0.6 }, '#e2e0d9') : mm, s, t0, t1, e / 2, h0 + 0.05, H);
        } else if (s.tipo === 'panel_reciclado') { // paneles macizos de plástico reciclado de 2 m entre postes de aluminio
          const mp = reciclado(s), ma = metal('#4a4c4d', 'posteAlu'); const mod = T.modulo || 2; const k = Math.max(1, Math.round((t1 - t0) / mod)), lg = (t1 - t0) / k;
          for (let j = 0; j < k; j++) { const a = t0 + j * lg + 0.035, b = t0 + (j + 1) * lg - 0.035; prisma(mp, s, a, b, 0.005, e - 0.005, 0.06, H - 0.02); for (let z = 0.35; z < H - 0.2; z += 0.3) prisma(mp, s, a, b, -0.004, 0.006, z, z + 0.012); }
          cada(t0, t1, mod, (t) => prisma(ma, s, t - 0.035, t + 0.035, -0.01, e + 0.01, 0, H + 0.02));
        } else if (s.tipo === 'lamas_madera' || s.tipo === 'lamas_reciclado') {
          const rec = s.tipo === 'lamas_reciclado'; const mp = rec ? reciclado(s) : mat('posteMad', { color: '#8d6a50', ...tx(texTarima, 0.3), roughness: 0.85 }, '#d9d7d0');
          cada(t0, t1, T.poste, (t) => prisma(mp, s, t - 0.045, t + 0.045, e / 2 - 0.045, e / 2 + 0.045, 0, H + 0.03));
          lamas(rec ? reciclado(s) : madera(s), s, t0, t1, e / 2 - 0.06, 0.05, H, rec ? 0.12 : 0.09, 0.02, 0.024);
        } else if (s.tipo === 'seto') {
          const ms = seto(s); const k = Math.max(1, Math.round((t1 - t0) / 1.25)); const lg = (t1 - t0) / k; const ang = Math.atan2(s.u[1], s.u[0]);
          for (let j = 0; j < k; j++) {
            const h = H * (0.95 + R() * 0.09), w = e * (0.9 + R() * 0.15), q = enLado(s, t0 + lg * (j + 0.5), e / 2 + (R() - 0.5) * 0.06);
            const g = new RoundedBoxGeometry(lg + 0.12, h, w, 2, Math.min(0.18, w / 2 - 0.01)); const mx = new THREE.Matrix4().compose(new THREE.Vector3(q[0], h / 2, -q[1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ang, 0)), new THREE.Vector3(1, 1, 1));
            L.geo(ms, g, mx); g.dispose();
          }
        } else if (s.tipo === 'gavion') {
          const mr = rejilla(); const k = Math.max(1, Math.round(t1 - t0)), lg = (t1 - t0) / k;
          for (let j = 0; j < k; j++) prisma(muroDe(s), s, t0 + j * lg + 0.005, t0 + (j + 1) * lg - 0.005, 0.01, e - 0.01, 0, H - 0.01);
          lamina(mr, s, t0, t1, -0.004, 0, H); lamina(mr, s, t0, t1, e + 0.004, 0, H);
          const A = (t, o) => P3(enLado(s, t, o), H + 0.004); L.quad(mr, A(t0, 0), A(t1, 0), A(t1, e), A(t0, e), [0, 1, 0], [[t0, 0], [t1, 0], [t1, e], [t0, e]]);
        }
      }
      // puertas del lindero
      for (const p of s.puertas) {
        const w = p.ancho, Hg = clamp(s.tipo === 'ninguno' ? 1.8 : H, 1.5, 2.2), oc = Math.max(e / 2, 0.05);
        const colH = colMetal(s), mm = metal(colH), estilo = T.puerta;
        // machones (obra) o postes
        for (const [a, b] of [[p.t0 - 0.3, p.t0], [p.t1, p.t1 + 0.3]]) {
          if (T.obra) { const hp = Math.max(H, Hg) + 0.1; prisma(s.tipo === 'gavion' || s.tipo === 'ninguno' ? enfoscado() : muroDe(s), s, a, b, oc - 0.15, oc + 0.15, 0, hp - 0.04); prisma(coronacion(), s, a - 0.02, b + 0.02, oc - 0.17, oc + 0.17, hp - 0.04, hp); }
          else if (s.tipo === 'lamas_reciclado' || s.tipo === 'panel_reciclado') prisma(reciclado(s), s, (a + b) / 2 - 0.06, (a + b) / 2 + 0.06, oc - 0.06, oc + 0.06, 0, Hg + 0.08);
          else if (s.tipo === 'lamas_madera') prisma(mat('posteMad', { color: '#8d6a50', ...tx(texTarima, 0.3), roughness: 0.85 }, '#d9d7d0'), s, (a + b) / 2 - 0.06, (a + b) / 2 + 0.06, oc - 0.06, oc + 0.06, 0, Hg + 0.08);
          else prisma(metal('#3b3d3e', 'poste'), s, (a + b) / 2 - 0.05, (a + b) / 2 + 0.05, oc - 0.05, oc + 0.05, 0, Hg + 0.06);
        }
        const hoja = (ta, tb, o, z0, z1, est = estilo) => {
          const mk = est === 'malla' ? mm : metal('#3b3d3e', 'marco'); const f = 0.045;
          prisma(mk, s, ta, ta + f, o - 0.022, o + 0.022, z0, z1); prisma(mk, s, tb - f, tb, o - 0.022, o + 0.022, z0, z1);
          prisma(mk, s, ta, tb, o - 0.022, o + 0.022, z0, z0 + f); prisma(mk, s, ta, tb, o - 0.022, o + 0.022, z1 - f, z1);
          if (est === 'chapa') prisma(chapa(colH), s, ta + f, tb - f, o - 0.008, o + 0.008, z0 + f, z1 - f);
          else if (est === 'barrotes') { for (let t = ta + f + 0.055; t < tb - f - 0.02; t += 0.11) prisma(mm, s, t - 0.006, t + 0.006, o - 0.015, o + 0.015, z0 + f, z1 - f); }
          else if (est === 'lamas') lamas(s.tipo === 'lamas_reciclado' ? reciclado(s) : s.tipo === 'lamas_madera' ? madera(s) : s.acabado === 'madera' ? mat('lamaMad', { color: '#c79566', ...tx(texVeta), roughness: 0.6 }, '#e2e0d9') : mm, s, ta + f, tb - f, o, z0 + f + 0.01, z1 - f, s.tipo === 'lamas_madera' ? 0.09 : 0.1, 0.02, 0.02);
          else { lamina(malla(colH), s, ta + f, tb - f, o, z0 + f, z1 - f); prisma(mk, s, ta, tb, o - 0.015, o + 0.015, (z0 + z1) / 2 - 0.02, (z0 + z1) / 2 + 0.02); }
        };
        if (p.clase === 'peaton') {
          hoja(p.t0 + 0.015, p.t1 - 0.015, oc, 0.05, Hg);
          const tm = p.bisagra === 'fin' ? p.t0 + 0.09 : p.t1 - 0.09; prisma(metal('#9fa1a0', 'tirador'), s, tm - 0.012, tm + 0.012, oc - 0.06, oc + 0.06, 1.0, 1.16);
          if (T.obra) { const tb = p.bisagra === 'fin' ? p.t0 - 0.15 : p.t1 + 0.15; prisma(metal('#2b2c2c', 'buzon'), s, tb - 0.13, tb + 0.13, oc - 0.18, oc - 0.15, 1.05, 1.45); } // buzón en el machón
        } else if (p.modelo === 'corredera') {
          const d = p.sentido || 1, o = e + 0.11; hoja(p.t0 - 0.05, p.t1 + 0.05, o, 0.06, Hg);
          const r0 = d > 0 ? p.t0 - 0.05 : p.t0 - w - 0.1, r1 = d > 0 ? p.t1 + w + 0.1 : p.t1 + 0.05; prisma(metal('#6d6f6e', 'carril'), s, Math.max(0, r0), Math.min(s.L, r1), o - 0.03, o + 0.03, 0, 0.03);
          const tg = d > 0 ? p.t1 + w + 0.12 : p.t0 - w - 0.12; if (tg > 0 && tg < s.L) prisma(metal('#3b3d3e', 'marco'), s, tg - 0.05, tg + 0.05, o - 0.08, o + 0.08, 0, Hg + 0.05); // poste guía de recogida
        } else if (p.modelo === 'batiente') { hoja(p.t0 + 0.02, p.t - 0.008, oc, 0.06, Hg); hoja(p.t + 0.008, p.t1 - 0.02, oc, 0.06, Hg); }
        else { hoja(p.t0 + 0.02, p.t1 - 0.02, oc, 0.05, Hg - 0.05, 'chapa'); prisma(metal('#3b3d3e', 'marco'), s, p.t0 - 0.02, p.t1 + 0.02, oc - 0.06, oc + 0.06, Hg, Hg + 0.12); }
        // acceso rodado: losa desde la puerta de vehículos hasta el portón del garaje (o 5 m hacia dentro)
        if (p.clase === 'vehiculos') {
          const a0 = enLado(s, p.t, e + 0.05); let b0 = enLado(s, p.t, e + 5.5); const acc = puntosAcceso(this.modelo, this.ctx?.casa);
          if (acc.porton) { const q = acc.porton.fuera ? [acc.porton.p[0] + acc.porton.fuera[0] * 0.25, acc.porton.p[1] + acc.porton.fuera[1] * 0.25] : acc.porton.p; const dd = Math.hypot(q[0] - a0[0], q[1] - a0[1]); if (dd > 1 && dd < 40 && (q[0] - a0[0]) * s.n[0] + (q[1] - a0[1]) * s.n[1] > 0.5) b0 = q; }
          const dx = b0[0] - a0[0], dy = b0[1] - a0[1], Ld = Math.hypot(dx, dy) || 1, px = -dy / Ld, py = dx / Ld, hw = Math.max(w, acc.porton?.ancho || 0) / 2;
          const c = (q, k) => [q[0] + px * hw * k, 0.012, -(q[1] + py * hw * k)]; L.quad(mat('rodado', { color: '#d9d4c9', ...tx(texHormigonLiso, 0.4), roughness: 0.85 }, '#efeee8'), c(a0, -1), c(a0, 1), c(b0, 1), c(b0, -1), [0, 1, 0]);
          for (let k = -(hw - 0.9); k <= hw - 0.9 + 1e-6; k += Math.max(0.5, (2 * hw - 1.8) / Math.max(1, Math.ceil((2 * hw - 1.8) / 1.8)))) sendas.push([new THREE.Vector3(a0[0] + px * k, 0, -(a0[1] + py * k)), new THREE.Vector3(b0[0] + px * k, 0, -(b0[1] + py * k))]);
        }
      }
    }
    L.mallas(this.sitio);
    return sendas;
  }
  // Vistas a pie de calle y de jardín: ningún árbol alto se interpone (cámara → casa).
  _cercaVistas() {
    const c0 = this.casa.position; const tam = Math.max(this.b.w, this.b.h, 4); const ejes = [];
    for (const kk of [1, 1.3, 1.7]) for (const n of ['acceso', 'jardin']) { const p = this._posVista(n, kk, tam); ejes.push([p.x, p.z]); }
    return (x, z, m = 4.5) => ejes.some(([px, pz]) => { const dx = c0.x - px, dz = c0.z - pz, l2 = dx * dx + dz * dz; const t = Math.max(0, Math.min(1, ((x - px) * dx + (z - pz) * dz) / l2)); return Math.hypot(x - px - t * dx, z - pz - t * dz) < m; });
  }
  // Paisajismo por preset (modelo.jardin): vegetación instanciada dentro de la parcela, fuera de casa, caminos y piscinas.
  jardin(J, region, piernas, conParcela) {
    const C = copas(); const R = azar(hash(J + '|' + (this.modelo.id || ''))); const sinArb = !!this.ctx.sinArboles;
    const b = this.b; const casaPoly = [[b.x0 - 1.4, b.y0 - 1.4], [b.x1 + 1.4, b.y0 - 1.4], [b.x1 + 1.4, b.y1 + 1.4], [b.x0 - 1.4, b.y1 + 1.4]].map(([x, y]) => { const v = this.mundo(x, y); return [v.x, -v.z]; });
    const casaArb = [[b.x0 - 3.4, b.y0 - 3.4], [b.x1 + 3.4, b.y0 - 3.4], [b.x1 + 3.4, b.y1 + 3.4], [b.x0 - 3.4, b.y1 + 3.4]].map(([x, y]) => { const v = this.mundo(x, y); return [v.x, -v.z]; });
    const sendas = piernas.map(([a, c]) => [[a.x, -a.z], [c.x, -c.z]]);
    const pisc = (this._piscinas || []).map((r) => [[r.x - 1, r.y - 1], [r.x + r.w + 1, r.y - 1], [r.x + r.w + 1, r.y + r.h + 1], [r.x - 1, r.y + r.h + 1]].map(([x, y]) => { const v = this.mundo(x, y); return [v.x, -v.z]; }));
    const cerca = this._cercaVistas();
    const libre = (x, y, borde = 0.8) => enPoli(x, y, region) && dBorde(x, y, region) > borde && !enPoli(x, y, casaPoly) && !sendas.some(([a, c]) => dSeg(x, y, a, c) < 1.1) && !pisc.some((p) => enPoli(x, y, p));
    let rx0 = Infinity, ry0 = Infinity, rx1 = -Infinity, ry1 = -Infinity; for (const [x, y] of region) { rx0 = Math.min(rx0, x); ry0 = Math.min(ry0, y); rx1 = Math.max(rx1, x); ry1 = Math.max(ry1, y); }
    const s1 = R() * 9, s2 = R() * 9, s3 = R() * 9; const ruidoJ = (x, y, f = 1) => (Math.sin(x * 0.33 * f + s1) * Math.sin(y * 0.29 * f + s2) + Math.sin((x + y) * 0.17 * f + s3)) / 2;
    const muestra = (paso, fn, max = 3000) => { let n = 0; for (let x = rx0 + paso / 2; x < rx1; x += paso) for (let y = ry0 + paso / 2; y < ry1; y += paso) { if (n >= max) return; const px = x + (R() - 0.5) * paso * 0.9, py = y + (R() - 0.5) * paso * 0.9; if (fn(px, py)) n++; } };
    const inst = {}; const pon = (geo, x, y, sx, sy, sz, col, y0 = 0, rot = R() * 6.28, sombra = true) => { if (geo !== 'losa' && sy + y0 > 0.5 && cerca(x, -y, 3)) return; (inst[geo + (sombra ? '' : '~')] = inst[geo + (sombra ? '' : '~')] || []).push({ x, z: -y, sx, sy, sz, col, y0, rot }); };
    const tronco = []; const arbol = (tipo, x, y, H, col) => {
      if (sinArb || cerca(x, -y) || enPoli(x, y, casaArb)) return false;
      const [sx, sy, cy, th, r] = tipo === 'cipres' ? [H * 0.5, H * 0.47, H * 0.55, H * 0.15, 0.18] : tipo === 'olivo' ? [H * 0.45, H * 0.36, H * 0.72, H * 0.45, 0.3] : tipo === 'pino' ? [H * 0.32, H * 0.28, H * 0.86, H * 0.86, 0.22] : [H * 0.33, H * 0.32, H * 0.64, H * 0.45, 0.24];
      tronco.push({ x, z: -y, r, th }); pon(tipo, x, y, sx, sy, sx, col, cy); return true;
    };
    const cl = (h, s, l) => new THREE.Color().setHSL(h, s, l);
    const ocup = []; const lejos = (x, y, d) => !ocup.some(([a, c, r]) => Math.hypot(a - x, c - y) < Math.max(d, r));
    if (J === 'mediterraneo') {
      muestra(7.5, (x, y) => (libre(x, y, 2) && lejos(x, y, 5) && arbol('olivo', x, y, 3 + R() * 1.6, cl(0.2, 0.2, 0.3 + R() * 0.06)) ? (ocup.push([x, y, 3]), true) : false), 40);
      muestra(4.5, (x, y) => (conParcela && dBorde(x, y, region) < 2.6 && libre(x, y, 1.6) && lejos(x, y, 2.5) && arbol('cipres', x, y, 6 + R() * 3, cl(0.3, 0.28, 0.17 + R() * 0.05)) ? (ocup.push([x, y, 1.5]), true) : false), 30);
      // lavanda en manchas (macollas pequeñas, violeta) y romero / lentisco más oscuros, con claros de grava
      muestra(0.75, (x, y) => { if (!libre(x, y, 0.5) || !lejos(x, y, 0.9) || R() < 0.22) return false; const n = ruidoJ(x, y); if (n > 0.32) { pon('gram', x, y, 0.55 + R() * 0.15, 0.5 + R() * 0.15, 0.55 + R() * 0.15, cl(0.72 + R() * 0.04, 0.3 + R() * 0.15, 0.5 + R() * 0.08), 0, R() * 6, false); pon('mata', x, y, 0.2, 0.12, 0.2, cl(0.25, 0.12, 0.42), 0, 0, false); } else if (n < -0.45) pon('mata', x, y, 0.32 + R() * 0.12, 0.34, 0.32 + R() * 0.12, cl(0.25 + R() * 0.04, 0.22, 0.24 + R() * 0.06), 0, R() * 6, false); else return false; return true; }, 2400);
    } else if (J === 'praderia') {
      muestra(13, (x, y) => (libre(x, y, 2) && lejos(x, y, 6) && arbol('frondoso', x, y, 5 + R() * 3, cl(0.24 + R() * 0.04, 0.34, 0.3 + R() * 0.06)) ? (ocup.push([x, y, 3]), true) : false), 12);
      muestra(0.55, (x, y) => { if (!libre(x, y, 0.4) || !lejos(x, y, 1.0)) return false; const n = ruidoJ(x, y, 1.3); if (n < -0.25) return false; const h = 0.55 + R() * 0.55; pon('gram', x, y, h * 0.75, h, h * 0.75, n > 0.3 ? cl(0.11 + R() * 0.03, 0.42, 0.62 + R() * 0.1) : cl(0.2 + R() * 0.05, 0.3, 0.45 + R() * 0.1), 0, R() * 6, false); return true; }, 3500);
      // vivaces: matas verdes bajas con flores (cabezuelas pequeñas por encima)
      muestra(0.9, (x, y) => { if (!libre(x, y, 0.4) || !lejos(x, y, 1.0) || R() < 0.35) return false; const c = [cl(0.76, 0.55, 0.5), cl(0.12, 0.85, 0.55), cl(0, 0, 0.92), cl(0.96, 0.6, 0.55)][(R() * 4) | 0]; pon('mata', x, y, 0.26, 0.28, 0.26, cl(0.26, 0.35, 0.3), 0, R() * 6, false); for (let q = 0; q < 4; q++) pon('mata', x + (R() - 0.5) * 0.4, y + (R() - 0.5) * 0.4, 0.06, 0.06, 0.06, c, 0.45 + R() * 0.2, 0, false); return true; }, 900);
    } else if (J === 'cesped') {
      muestra(9, (x, y) => (libre(x, y, 3) && lejos(x, y, 7) && arbol('frondoso', x, y, 6 + R() * 3.5, cl(0.24 + R() * 0.05, 0.36, 0.26 + R() * 0.08)) ? (ocup.push([x, y, 4]), true) : false), 8);
      muestra(1.3, (x, y) => (dBorde(x, y, region) < (conParcela ? 2.6 : 3.5) && libre(x, y, 1.2) && lejos(x, y, 1.0) ? (pon('mata', x, y, 0.55 + R() * 0.3, 0.6 + R() * 0.3, 0.55 + R() * 0.3, cl(0.28 + R() * 0.04, 0.4, 0.24 + R() * 0.08)), true) : false), 400);
    } else if (J === 'huerto') {
      const Lt = new Lote(); const bancales = []; const garden = this.dir(OPUESTO[this.modelo.acceso || 'N']); const c0 = this.casa.position; const tam = Math.max(b.w, b.h) / 2 + 4;
      for (let k = 0; k < 120 && bancales.length < 8; k++) {
        const ang = Math.atan2(garden.z, garden.x) + (R() - 0.5) * 1.6, d = tam + R() * 8; const x = c0.x + Math.cos(ang) * d, y = -(c0.z + Math.sin(ang) * d);
        const esq = [[-0.7, -1.6], [0.7, -1.6], [0.7, 1.6], [-0.7, 1.6], [0, 0]].map(([a, c]) => [x + a, y + c]);
        if (!esq.every(([a, c]) => libre(a, c, 0.8)) || bancales.some(([a, c]) => Math.abs(a - x) < 2.1 && Math.abs(c - y) < 3.9)) continue;
        bancales.push([x, y]); ocup.push([x, y, 2]);
      }
      for (const [x, y] of bancales) {
        const z = -y; Lt.caja(this.M.madera, x - 0.6, z - 1.5, 0, 1.2, 0.06, 0.4); Lt.caja(this.M.madera, x - 0.6, z + 1.44, 0, 1.2, 0.06, 0.4); Lt.caja(this.M.madera, x - 0.6, z - 1.5, 0, 0.06, 3, 0.4); Lt.caja(this.M.madera, x + 0.54, z - 1.5, 0, 0.06, 3, 0.4);
        Lt.caja(this.M.tierra, x - 0.54, z - 1.44, 0, 1.08, 2.88, 0.36);
        for (let a = -1.25; a <= 1.26; a += 0.35) for (const o of [-0.28, 0, 0.28]) pon('mata', x + o, y + a, 0.16 + R() * 0.06, 0.2 + R() * 0.1, 0.16 + R() * 0.06, cl(0.25 + R() * 0.08, 0.5, 0.32 + R() * 0.12), 0.36, R() * 6, false);
      }
      Lt.mallas(this.sitio);
      muestra(5.5, (x, y) => (libre(x, y, 2) && lejos(x, y, 3.5) && arbol('frondoso', x, y, 3 + R() * 1.2, cl(0.22, 0.4, 0.34 + R() * 0.06)) ? (ocup.push([x, y, 2.2]), true) : false), 16);
    } else if (J === 'zen') {
      muestra(8, (x, y) => (libre(x, y, 2) && lejos(x, y, 5) && arbol('frondoso', x, y, 3 + R() * 1.5, cl(0.01 + R() * 0.05, 0.62, 0.4 + R() * 0.08)) ? (ocup.push([x, y, 2.5]), true) : false), 7);
      muestra(6.5, (x, y) => { if (!libre(x, y, 1.5) || !lejos(x, y, 3)) return false; ocup.push([x, y, 2]); for (let q = 0; q < 3; q++) { const s = 0.4 + R() * 0.6; pon('roca', x + (R() - 0.5) * 1.6, y + (R() - 0.5) * 1.6, s, s * 0.8, s, cl(0.1, 0.04, 0.42 + R() * 0.12)); } for (let q = 0; q < 5; q++) pon('mata', x + (R() - 0.5) * 2.4, y + (R() - 0.5) * 2.4, 0.4 + R() * 0.3, 0.16, 0.4 + R() * 0.3, cl(0.27, 0.45, 0.28 + R() * 0.06), 0, 0, false); return true; }, 10);
      muestra(2.2, (x, y) => (dBorde(x, y, region) < 2.5 && libre(x, y, 1.2) && lejos(x, y, 1.2) ? (pon('mata', x, y, 0.6, 0.55, 0.6, cl(0.3, 0.38, 0.22 + R() * 0.05)), true) : false), 200);
      for (const [a, c] of sendas) { const L2 = Math.hypot(c[0] - a[0], c[1] - a[1]); const ux = (c[0] - a[0]) / (L2 || 1), uy = (c[1] - a[1]) / (L2 || 1); for (let d = 0.6; d < L2; d += 0.8) { const ox = -uy * (1.6 + Math.sin(d * 0.7) * 0.3), oy = ux * (1.6 + Math.sin(d * 0.7) * 0.3); const x = a[0] + ux * d + ox, y = a[1] + uy * d + oy; if (enPoli(x, y, region) && !enPoli(x, y, casaPoly)) pon('losa', x, y, 0.55, 0.04, 0.42, cl(0.08, 0.05, 0.6 + R() * 0.08), 0, R() * 3, false); } }
    } else if (J === 'bosque') {
      muestra(6.2, (x, y) => { if (!libre(x, y, 1.6) || !lejos(x, y, 4)) return false; const pino = R() < 0.4; if (!arbol(pino ? 'pino' : 'frondoso', x, y, pino ? 8 + R() * 4 : 5 + R() * 2.5, pino ? cl(0.27, 0.32, 0.2 + R() * 0.05) : cl(0.22 + R() * 0.03, 0.3, 0.2 + R() * 0.05))) return false; ocup.push([x, y, 2.5]); return true; }, 80);
      muestra(1.6, (x, y) => (libre(x, y, 0.6) && lejos(x, y, 1.2) && ruidoJ(x, y) > -0.1 ? (pon('mata', x, y, 0.5 + R() * 0.5, 0.45 + R() * 0.4, 0.5 + R() * 0.5, cl(0.25 + R() * 0.05, 0.32, 0.2 + R() * 0.07)), true) : false), 900);
    }
    // instancias
    const mq = this.opt.maqueta;
    const mh = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, envMapIntensity: 0.55 }); const mt = new THREE.MeshStandardMaterial({ color: mq ? '#dddbd4' : '#6b5643', roughness: 1 }); this._mats.push(mh, mt);
    const q = new THREE.Quaternion(), e = new THREE.Euler(), m = new THREE.Matrix4(), v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color('#eceae3');
    for (const [clave, arr] of Object.entries(inst)) {
      if (!arr.length) continue; const geo = clave.replace('~', ''); const im = new THREE.InstancedMesh(C[geo], mh, arr.length); im.castShadow = !clave.endsWith('~'); im.receiveShadow = true;
      arr.forEach((a, i) => { e.set(0, a.rot, 0); m.compose(v.set(a.x, a.y0 + (geo === 'mata' || geo === 'roca' || geo === 'gram' || geo === 'losa' ? 0 : 0), a.z), q.setFromEuler(e), s.set(a.sx, a.sy, a.sz)); im.setMatrixAt(i, m); im.setColorAt(i, mq ? col : a.col); });
      this.sitio.add(im);
    }
    if (tronco.length) { const tr = new THREE.InstancedMesh(C.tronco, mt, tronco.length); tr.castShadow = tr.receiveShadow = true; tronco.forEach((a, i) => { m.compose(v.set(a.x, 0, a.z), q.identity(), s.set(a.r, a.th, a.r)); tr.setMatrixAt(i, m); }); this.sitio.add(tr); }
  }
  arboles(parcela) {
    const mq = this.opt.maqueta; const lista = []; let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const tipo = () => { const r = rnd(); return r < 0.5 ? 'frondoso' : r < 0.78 ? 'cipres' : 'olivo'; };
    const radio = Math.max(this.b.w, this.b.h) / 2 + 5;
    if (parcela) {
      const P = parcela.poligono; const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]); const cp = this.ctx.casa || { x: c[0], y: c[1] };
      P.forEach((a, i) => {
        if (i === parcela.frente) return; const b2 = P[(i + 1) % P.length]; const L = Math.hypot(b2[0] - a[0], b2[1] - a[1]);
        for (let d = 4 + rnd() * 4; d < L - 3; d += 6 + rnd() * 6) {
          const t = d / L; let x = a[0] + (b2[0] - a[0]) * t, y = a[1] + (b2[1] - a[1]) * t; x += (c[0] - x) * 0.12; y += (c[1] - y) * 0.12;
          if (Math.hypot(x - cp.x, y - cp.y) < radio) continue; lista.push({ x, z: -y, t: tipo(), h: rnd() });
        }
      });
    } else {
      const op = OPUESTO[this.modelo.acceso || 'N']; const base = this.dir(op); const a0 = Math.atan2(base.z, base.x);
      for (let i = 0; i < 7; i++) { const ang = a0 + (i - 3) * 0.45 + (rnd() - 0.5) * 0.2, d = radio + 3 + rnd() * 9; lista.push({ x: Math.cos(ang) * d, z: Math.sin(ang) * d, t: tipo(), h: rnd() }); }
    }
    const cerca = this._cercaVistas();
    for (let i = lista.length - 1; i >= 0; i--) if (cerca(lista[i].x, lista[i].z)) lista.splice(i, 1);
    if (!lista.length) return;
    const C = copas(); const col = new THREE.Color(); const q = new THREE.Quaternion(), e = new THREE.Euler(), m = new THREE.Matrix4();
    const mt = new THREE.MeshStandardMaterial({ color: mq ? '#dddbd4' : '#6b5643', roughness: 1 }); const mh = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, envMapIntensity: 0.55 }); this._mats.push(mt, mh);
    const tr = new THREE.InstancedMesh(C.tronco, mt, lista.length); tr.castShadow = tr.receiveShadow = true;
    const grupos = { frondoso: [], cipres: [], olivo: [] }; lista.forEach((a) => grupos[a.t].push(a));
    lista.forEach((a, i) => {
      const H = a.t === 'cipres' ? 6 + a.h * 3 : a.t === 'olivo' ? 3 + a.h * 1.5 : 4.5 + a.h * 3; a.H = H;
      const th = a.t === 'cipres' ? H * 0.15 : H * 0.45, r = a.t === 'cipres' ? 0.18 : a.t === 'olivo' ? 0.3 : 0.24;
      m.compose(new THREE.Vector3(a.x, 0, a.z), q.identity(), new THREE.Vector3(r, th, r)); tr.setMatrixAt(i, m);
    });
    this.sitio.add(tr);
    for (const [t, arr] of Object.entries(grupos)) {
      if (!arr.length) continue; const im = new THREE.InstancedMesh(C[t], mh, arr.length); im.castShadow = im.receiveShadow = true;
      arr.forEach((a, i) => {
        const H = a.H; const [sx, sy, cy] = t === 'cipres' ? [H * 0.5, H * 0.47, H * 0.55] : t === 'olivo' ? [H * 0.45, H * 0.36, H * 0.72] : [H * 0.33, H * 0.32, H * 0.64];
        e.set(0, a.h * 6.28, 0); m.compose(new THREE.Vector3(a.x, cy, a.z), q.setFromEuler(e), new THREE.Vector3(sx, sy, sx)); im.setMatrixAt(i, m);
        if (mq) col.set('#eceae3'); else if (t === 'cipres') col.setHSL(0.3, 0.28, 0.17 + a.h * 0.05); else if (t === 'olivo') col.setHSL(0.21, 0.16, 0.42 + a.h * 0.07); else col.setHSL(0.24 + a.h * 0.05, 0.36, 0.26 + a.h * 0.08);
        im.setColorAt(i, col);
      });
      this.sitio.add(im);
    }
  }

  // ------------------------------------------------------------------------------------------------------
  setSol(mes, hora) {
    this.mes = mes; this.hora = hora; const utc = hora - this.lon / 15; const hh = Math.floor(utc), mm = Math.round((utc - hh) * 60);
    const s = sol(this.lat, this.lon, new Date(Date.UTC(2026, mes, 21, hh, mm)));
    const az = rad(s.azimut - (this.ctx?.parcela?.norte || 0)); const el = s.elevacion;
    const v = (e) => new THREE.Vector3(Math.sin(az) * Math.cos(rad(e)), Math.sin(rad(e)), -Math.cos(az) * Math.cos(rad(e)));
    this._solDir = v(Math.max(el, 2)).normalize(); this._elev = el;
    const vs = v(Math.max(el, -4.5)); const bajo = 1 - suave(2, 35, el);
    for (const sk of [this.sky, this.envSky]) { const u = sk.material.uniforms; u.sunPosition.value.copy(vs); u.turbidity.value = 2.2 + 5 * bajo; u.rayleigh.value = 1.0 + 1.8 * bajo; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8; u.brillo.value = 0.55; }
    const dia = suave(-4, 10, el), alto = suave(3, 35, el); this._dia = dia;
    this.sun.intensity = el > 0 ? 0.5 + 3.0 * Math.pow(suave(0, 40, el), 0.7) : 0;
    this.sun.color.set('#ffae6e').lerp(new THREE.Color('#fff6ea'), alto);
    this.hemi.color.set('#f3f0ea'); this.hemi.groundColor.set('#b9ad95');
    this._amb = { hemi: 0.08 + 0.55 * dia, env: 0.12 + 0.45 * dia };
    this.envSuelo.material.color.setRGB(0.2, 0.18, 0.14, THREE.LinearSRGBColorSpace).multiplyScalar(0.03 + 0.97 * dia * (0.35 + 0.65 * alto));
    this.noche = 1 - suave(-3, 6, el);
    this._encuadreSombra(); this._ajusteInterior(); this._luces(); this._envSucio = true; this._sombra = true; this.pedir(); return s;
  }
  // Sombra del sol: toda la casa, o ajustada a la estancia cuando la cámara está dentro (sombras de ventana nítidas).
  _encuadreSombra() {
    const I = this._int; let c, r;
    if (I && this.modelo) { c = this.mundo(I.e.x + I.e.w / 2, I.e.y + I.e.h / 2, I.pi * H_PLANTA + this.zoc + 1.2); r = Math.max(I.e.w, I.e.h) / 2 + 7; }
    else { c = this.casa.position; r = Math.max(this.b ? Math.max(this.b.w, this.b.h) / 2 : 10, 8) + 9 + (this.modelo ? Math.max(0, this.modelo.plantas.length - 2) * H_PLANTA * 0.8 : 0); } // casas altas: sombra más larga
    this._sombra = true; this.sun.position.copy(c).addScaledVector(this._solDir || new THREE.Vector3(0, 1, 0), 90); this.sun.target.position.copy(c); this.sun.target.updateMatrixWorld();
    const sc = this.sun.shadow.camera; sc.left = sc.bottom = -r; sc.right = sc.top = r; sc.near = 1; sc.far = 220; sc.updateProjectionMatrix();
  }
  // Interiores: luz que entra por los huecos (relleno frío), rebote cálido del sol en el suelo y menos cielo «fantasma».
  _ajusteInterior() {
    for (const l of this.lucesInt) l.intensity = 0;
    const I = this._int, amb = this._amb || { hemi: 0.5, env: 0.5 }; const dia = this._dia ?? 1;
    let fi = 0;
    if (I && this.modelo && this.geos[I.pi]) {
      fi = 1; const { e, pi } = I; const g = this.geos[I.pi]; const zl = pi * H_PLANTA + this.zoc;
      const hs = g.huecos.filter((h) => h.est === e.id && h.tipo !== 'porton').sort((a, b) => b.ancho * (b.alto || 1) - a.ancho * (a.alto || 1));
      const dentroN = { N: [0, 1], S: [0, -1], O: [1, 0], E: [-1, 0] }; let k = 0;
      for (const h of hs.slice(0, 2)) {
        const n = dentroN[h.lado] || [0, 0]; const area = h.ancho * Math.min(h.alto || 1.35, 2.25); const zc = zl + (h.alf || 0) + Math.min(h.alto || 1.35, 2.2) * 0.62;
        const l = this.lucesInt[k++]; l.position.copy(this.mundo(h.x + n[0] * 0.9, h.y + n[1] * 0.9, zc)); l.color.set('#dfe8f7').lerp(new THREE.Color('#fff1dc'), 0.35); l.distance = 6 + area; l.decay = 1.5; l.intensity = dia * (0.6 + area * 0.55);
      }
      if (this.sun.intensity > 0.05 && this._solDir) for (const h of hs) {
        if (k >= 3) break; const n = dentroN[h.lado]; if (!n) continue; const fuera = this.dir(OPUESTO[h.lado]).negate().multiplyScalar(-1); // normal exterior del hueco
        const cs = this._solDir.dot(this.dir(h.lado)); if (cs < 0.12) continue;
        const zc = zl + (h.alf || 0) + Math.min(h.alto || 1.35, 2.2) * 0.5; const w = this.mundo(h.x, h.y, zc); const d = this._solDir.clone().negate();
        const tt = Math.min((zc - zl) / Math.max(0.15, -d.y), Math.min(e.w, e.h) * 0.9); const p = w.clone().addScaledVector(d, tt); p.y = Math.max(zl + 0.35, p.y + 0.3);
        const l = this.lucesInt[k++]; l.position.copy(p); l.color.set('#ffd2a0'); l.distance = 5.5; l.decay = 1.6; l.intensity = this.sun.intensity * cs * h.ancho * Math.min(h.alto || 1.35, 2.25) * 0.42; void fuera;
      }
      if (k < 4 && dia > 0.2) { // rebote del suelo hacia el techo: el techo no queda gris
        const l = this.lucesInt[k++]; l.position.copy(this.mundo(e.x + e.w / 2, e.y + e.h / 2, zl + 0.5)); l.color.set('#fff0dd'); l.distance = Math.hypot(e.w, e.h) * 0.7 + 2.5; l.decay = 1.2; l.intensity = dia * (0.55 + Math.min(e.w * e.h, 40) * 0.04) * (hs.length ? 1 : 0.5);
      }
      const lamps = (this.muebles[pi] || []).filter((it) => it.est === e.id && it.luz).slice(0, 4 - k);
      for (const it of lamps) { const l = this.lucesInt[k++]; l.position.copy(this.mundo(it.x + it.w / 2, it.y + it.h / 2, zl + it.z0 + it.alto * 0.4)); l.color.set('#ffc98a'); l.distance = 3.5; l.decay = 2; l.intensity = 0.25 + 2.2 * this.noche; }
    }
    this._fi = fi;
    this.hemi.intensity = amb.hemi * (1 - 0.55 * fi); this.scene.environmentIntensity = amb.env * (1 - 0.4 * fi) + 0.05 * fi;
    this.renderer.toneMappingExposure = 1.0 + 0.6 * (this.noche || 0) + 0.32 * fi * dia;
  }
  _luces() {
    const n = this.noche || 0, st = this.estado;
    for (const l of this.luces) l.intensity = st.modo !== 'planta' || l.userData.nivel <= st.nivel ? n * l.userData.base : 0;
    for (const l of this._lucesFuego || []) l.intensity = 0.4 + n * l.userData.base;
    if (this.M) { this.M.lampara.emissiveIntensity = 2.4 * n; if (this.M.vidrio.emissive) this.M.vidrio.emissiveIntensity = 0.1 * n; if (this.M.brasas) this.M.brasas.emissiveIntensity = 0.7 + 2.5 * n; if (this.M.agua?.emissive) this.M.agua.emissiveIntensity = 0.75 * n; }
  }
  aplicarVisibilidad() {
    const st = this.estado; const pl = st.modo === 'planta';
    if (st.nivel < 0 && !this.nivS) st.nivel = 0; const sot = pl && st.nivel < 0; // v.1.6: nivel -1 = planta sótano
    if (this.nivS) { this.nivS.base.visible = true; this.nivS.alto.visible = !(sot && st.corte); this.nivS.techo.visible = !sot; this.nivS.corte.visible = sot && st.corte; }
    this._terrenoVer(!sot);
    this.niv.forEach((G, i) => {
      G.base.visible = !pl || i <= st.nivel;
      G.alto.visible = !pl || i < st.nivel || (i === st.nivel && !st.corte);
      G.techo.visible = !pl || i < st.nivel;
      G.corte.visible = pl && i === st.nivel && st.corte;
    });
    this.sinTecho = pl; this.nivel = st.nivel; this._luces(); this._sombra = true; this.pedir();
  }
  techo(ver, nivel = 0) { this.estado = { modo: ver ? 'exterior' : 'planta', nivel: this._nivelValido(nivel), corte: true }; this.aplicarVisibilidad(); }
  niveles() { return this.modelo ? this.modelo.plantas.length : 0; }
  nombresNiveles() { return Array.from({ length: this.niveles() }, (_, i) => NOMBRES[i] || 'Planta ' + i); }
  estancias(nivel) { if (!this.modelo) return []; return this.modelo.plantas.flatMap((p, pi) => (nivel == null || nivel === pi ? p.estancias.map((e) => ({ id: e.id, tipo: e.tipo, nombre: e.nombre || TIPOS[e.tipo]?.n || e.tipo, nivel: pi, interior: esInt(e.tipo) && e.tipo !== 'doble_altura' })) : [])); }
  verPlanta(nivel = 0, o = {}) { if (o.camara === false) { this.estado = { modo: 'planta', nivel: this._nivelValido(nivel), corte: o.corte !== false }; this._int = null; this._ajusteInterior(); this._encuadreSombra(); this.aplicarVisibilidad(); return; } this.vista('planta', Object.assign({}, o, { nivel })); }
  verExterior(animar = true) { this.vista('aerea', animar); }
  verEstancia(id, animar = true) { this.vista('estancia', { id, animar }); }
  _nivelValido(n) { const k = this.niveles() || 1; return Math.max(0, Math.min(k - 1, Math.round(Number(n) || 0))); }

  // Vector del lado del modelo (N,S,E,O) en coordenadas de mundo.
  dir(lado) { const v = { N: [0, -1], S: [0, 1], E: [1, 0], O: [-1, 0] }[lado] || [0, -1]; return new THREE.Vector3(v[0], 0, v[1]).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.casa.rotation.y); }
  mundo(mx, my, z = 0) { const cx = (this.b.x0 + this.b.x1) / 2, cy = (this.b.y0 + this.b.y1) / 2; return new THREE.Vector3(mx - cx, z, my - cy).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.casa.rotation.y).add(this.casa.position); }

  vista(n, animar = true) {
    let o = {}; if (animar && typeof animar === 'object') { o = animar; animar = o.animar !== false; }
    if (this.opt.sinBucle) animar = false; // sin bucle propio no hay transición: la cámara salta (pinta con renderAhora)
    if (!this.modelo) return; if (this._mont && n !== 'aerea') this.detenerMontaje(); this._vista = n;
    const c = this.casa.position.clone(); const tam = Math.max(this.b.w, this.b.h, 4); const alto = this.modelo.plantas.length * H_PLANTA;
    const acc = this.modelo.acceso || 'N', op = OPUESTO[acc]; let pos, obj = c.clone().setY(alto * 0.45), fov = 42, interior = false, hit = null;
    const lat = this.dir(acc === 'N' || acc === 'S' ? 'E' : 'S');
    const k = Math.max(1, 1.35 / Math.max(0.3, this.cam.aspect)); // encuadre en visores estrechos
    let estado = { modo: 'exterior', nivel: this.estado.nivel, corte: true };
    const tamA = Math.max(tam, alto * 1.05); // casas altas (hasta 6 plantas): el encuadre aéreo también cuenta la altura
    if (n === 'aerea') pos = c.clone().add(this.dir(op).multiplyScalar(tamA * 1.45 * k)).add(lat.multiplyScalar(tamA * 0.95 * k)).setY((tamA * 1.15 + alto) * k);
    else if (n === 'acceso' || n === 'jardin') pos = this._posVista(n, k, tam);
    else if (n === 'cenital') { obj = c.clone().setY(alto * 0.3); pos = c.clone().add(this.dir(op).multiplyScalar(0.02 * tamA)).setY(alto + tamA * 2.2 * k); fov = 36; } // planta de cubiertas desde arriba
    else if (n === 'sotano' && this.nivS) { estado = { modo: 'planta', nivel: -1, corte: o.corte !== false }; ({ pos, obj, fov } = this._camSotano(k)); } // v.1.6
    else if (n === 'planta') { const nivel = this._nivelValido(o.nivel ?? 0); estado = { modo: 'planta', nivel, corte: o.corte !== false }; ({ pos, obj, fov } = this._camPlanta(nivel, k)); }
    else { const r = this._camInterior(n, o); if (!r) return this.vista('aerea', animar); ({ pos, obj, fov, hit } = r); interior = true; }
    this.estado = estado; this._int = interior && hit ? { e: hit.e, pi: hit.pi } : null; this._encuadreSombra(); this._ajusteInterior(); this.aplicarVisibilidad(); this._aoModo(interior);
    this.cam.fov = fov; this.cam.near = interior ? 0.05 : 0.1; this.cam.updateProjectionMatrix();
    this.ctl.minDistance = interior ? 0.05 : 2; this.ctl.maxDistance = interior ? 8 : 900; this.ctl.maxPolarAngle = interior ? Math.PI * 0.9 : Math.PI / 2 - 0.02;
    if (interior) obj = pos.clone().add(obj.clone().sub(pos).normalize().multiplyScalar(0.8)); // girar la cabeza: pivote a 0,8 m
    if (!animar) { this.cam.position.copy(pos); this.ctl.target.copy(obj); this.ctl.update(); this.pedir(); return; }
    const p0 = this.cam.position.clone(), o0 = this.ctl.target.clone(); const t0 = performance.now(); const id = (this._anim = (this._anim || 0) + 1);
    const paso = (t) => { if (id !== this._anim) return; const kk = Math.min(1, (t - t0) / 900), q = kk < 0.5 ? 4 * kk * kk * kk : 1 - Math.pow(-2 * kk + 2, 3) / 2; this.cam.position.lerpVectors(p0, pos, q); this.ctl.target.lerpVectors(o0, obj, q); this.pedir(); if (kk < 1 && !this._fin) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }
  _posVista(n, k, tam) {
    const c = this.casa.position.clone(); const acc = this.modelo.acceso || 'N', op = OPUESTO[acc]; const lat = this.dir(acc === 'N' || acc === 'S' ? 'E' : 'S');
    const d = Math.max(tam * 0.9 + 10, this.modelo.plantas.length * H_PLANTA * 1.7 + 6); // casas altas: más lejos para verlas enteras
    if (n === 'acceso') return c.add(this.dir(acc).multiplyScalar(d * k)).add(lat.multiplyScalar(-tam * 0.5 * k)).setY(1.7);
    return c.add(this.dir(op).multiplyScalar(d * k)).add(lat.multiplyScalar(tam * 0.45 * k)).setY(1.7);
  }
  // Encuadre «casa de muñecas» de una planta: oblicua desde el jardín, a ~55°.
  // v.1.6 · Encuadre de la planta sótano (con su rampa), como el de una planta.
  _camSotano(k) {
    const s = this.modelo.sotano; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const e of s.estancias) { x0 = Math.min(x0, e.x); y0 = Math.min(y0, e.y); x1 = Math.max(x1, e.x + e.w); y1 = Math.max(y1, e.y + e.h); }
    for (const v of this._rampaS?.vertices || []) if (v.s <= 7) { x0 = Math.min(x0, v.x); y0 = Math.min(y0, v.y); x1 = Math.max(x1, v.x); y1 = Math.max(y1, v.y); } // el arranque de la rampa, no toda
    const sz = Math.max(x1 - x0, y1 - y0, 6) * 0.8; const obj = this.mundo((x0 + x1) / 2, (y0 + y1) / 2, this.zoc - s.altura + 0.6);
    const acc = this.modelo.acceso || 'N'; const lat = this.dir(acc === 'N' || acc === 'S' ? 'E' : 'S');
    const h = this.dir(OPUESTO[acc]).multiplyScalar(0.8).add(lat.multiplyScalar(0.5)).normalize(); const fov = 36, el = rad(58);
    const dist = ((sz * 0.62) / Math.tan(rad(fov / 2))) * k;
    return { pos: obj.clone().addScaledVector(h, dist * Math.cos(el)).add(new THREE.Vector3(0, dist * Math.sin(el), 0)), obj, fov };
  }
  // v.1.6 · Terreno visible (normal) o cortado (vista del sótano: se quitan terreno y jardín y se ven la excavación, los muros y la rampa).
  _terrenoVer(opaco) {
    if (this._terrenoOpaco === opaco || !this.sitio) return; this._terrenoOpaco = opaco;
    for (const o of this.sitio.children) { if (!o.userData?.terreno && o.userData?.montaje !== 'jardin') continue; // terreno, parcela y jardín: fuera (corte del terreno)
      if (!opaco) { o.userData.visSot = o.visible; o.visible = false; } else if (o.userData.visSot != null) { o.visible = o.userData.visSot; delete o.userData.visSot; } }
    this._sombra = true;
  }
  _camPlanta(nivel, k) {
    const p = this.modelo.plantas[nivel]; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const e of p.estancias) { if (TIPOS[e.tipo]?.vacio) continue; x0 = Math.min(x0, e.x); y0 = Math.min(y0, e.y); x1 = Math.max(x1, e.x + e.w); y1 = Math.max(y1, e.y + e.h); }
    if (!isFinite(x0)) ({ x0, y0, x1, y1 } = this.b);
    const s = Math.max(x1 - x0, y1 - y0, 6); const obj = this.mundo((x0 + x1) / 2, (y0 + y1) / 2, nivel * H_PLANTA + this.zoc + 0.6);
    const acc = this.modelo.acceso || 'N'; const lat = this.dir(acc === 'N' || acc === 'S' ? 'E' : 'S');
    const h = this.dir(OPUESTO[acc]).multiplyScalar(0.8).add(lat.multiplyScalar(0.5)).normalize(); const fov = 36, el = rad(56);
    const dist = ((s * 0.62) / Math.tan(rad(fov / 2))) * k;
    const pos = obj.clone().addScaledVector(h, dist * Math.cos(el)).add(new THREE.Vector3(0, dist * Math.sin(el), 0));
    return { pos, obj, fov };
  }
  // Cámara a la altura de los ojos dentro de una estancia, mirando a lo que importa (ventanal, cocina, cama).
  _camInterior(n, o) {
    const pls = this.modelo.plantas; let hit = null;
    if (o.id) pls.forEach((p, pi) => { const e = p.estancias.find((q) => q.id === o.id); if (e && !hit) hit = { e, pi }; });
    if (!hit) {
      const tipos = { salon: ['salon', 'comedor', 'cocina'], cocina: ['cocina', 'salon', 'comedor'], dormitorio: ['dormitorio_principal', 'dormitorio'] }[n] || [n];
      const orden = o.nivel != null ? [this._nivelValido(o.nivel), ...pls.map((_, i) => i).filter((i) => i !== this._nivelValido(o.nivel))] : pls.map((_, i) => i);
      for (const t of tipos) {
        for (const pi of orden) {
          const ests = (pls[pi]?.estancias || []).filter((q) => q.tipo === t).sort((a, b) => b.w * b.h - a.w * a.h);
          const e = n === 'cocina' && t === 'salon' ? ests.find((q) => /cocina/i.test(q.nombre || '')) || ests[0] : ests[0];
          if (e) { hit = { e, pi }; break; }
        }
        if (hit) break;
      }
    }
    if (!hit) return null;
    const { e, pi } = hit; const g = this.geos[pi] || derivar(this.modelo, pi); const items = (this.muebles[pi] || []).filter((it) => it.est === e.id);
    const zl = pi * H_PLANTA + this.zoc + 0.01; let foco = null;
    const huecos = g.huecos.filter((h) => h.est === e.id && h.tipo !== 'puerta' && h.tipo !== 'porton').sort((a, b) => b.ancho * b.alto - a.ancho * a.alto);
    const de = (rol) => items.filter((it) => it.rol === rol).sort((a, b) => b.w * b.h - a.w * a.h)[0];
    const tipo = n === 'estancia' ? e.tipo : n;
    if (tipo === 'cocina' || (n === 'estancia' && e.tipo === 'cocina')) { const r = de('encimera'); if (r) foco = [r.x + r.w / 2, r.y + r.h / 2, 1.05]; }
    else if (tipo === 'dormitorio' || tipo === 'dormitorio_principal') { const r = de('cama'); if (r) foco = [r.x + r.w / 2, r.y + r.h / 2, 0.75]; }
    if (!foco && huecos[0]) { const h = huecos[0]; foco = [h.x, h.y, (h.alf || 0) + Math.min(h.alto, 2.2) / 2]; }
    if (!foco) foco = [e.x + e.w / 2 + 1, e.y + e.h / 2, 1.2];
    const altos = items.filter((it) => it.z0 + it.alto > 1.0 && it.z0 < 1.7);
    const m = Math.min(0.55, Math.min(e.w, e.h) * 0.25); let best = null;
    for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) {
      const px = e.x + m + ((e.w - 2 * m) * a) / 8, py = e.y + m + ((e.h - 2 * m) * b) / 8;
      const dentro = altos.some((it) => px > it.x - 0.3 && px < it.x + it.w + 0.3 && py > it.y - 0.3 && py < it.y + it.h + 0.3);
      const roce = items.some((it) => it.z0 + it.alto > 0.5 && px > it.x - 0.45 && px < it.x + it.w + 0.45 && py > it.y - 0.45 && py < it.y + it.h + 0.45);
      const sc = Math.hypot(px - foco[0], py - foco[1]) - (dentro ? 100 : 0) - (roce ? 1.2 : 0);
      if (!best || sc > best.sc) best = { sc, px, py };
    }
    const ojo = tipo === 'dormitorio' || tipo === 'dormitorio_principal' ? 1.4 : 1.5;
    return { pos: this.mundo(best.px, best.py, zl + ojo), obj: this.mundo(foco[0], foco[1], zl + foco[2]), fov: 64, hit };
  }

  // ------------------------------------------------------------------------------------------------------
  // Montaje CUEVA planta a planta (ver etapas en construir()): cimentación → por planta, forjado, estructura y
  // cerramiento, módulos de interior y su cubierta en piezas → exteriores y, en el sitio, cerramientos de parcela y jardín.
  // Cada pieza baja de grúa (cable visible en las piezas grandes), con un leve balanceo y un ligero rebote al apoyar.
  // Usa la geometría real ya construida: una textura de datos guarda el desplazamiento de cada pieza (sin draw calls extra).
  montaje({ duracion = 18, alTerminar, alFase, alDetener } = {}) {
    if (!this.modelo || this._pz.length < 2 || !this._U.tex.value) { alTerminar?.(); alDetener?.(true); return false; }
    this.detenerMontaje();
    if (this.estado.modo !== 'exterior' || this._int || !['aerea', 'acceso', 'jardin', 'cenital'].includes(this._vista)) this.vista('aerea', !this.opt.sinBucle);
    const ST = this._ST, n = this._pz.length; const porSt = new Map();
    for (let i = 1; i < n; i++) { const p = this._pz[i]; if (!porSt.has(p.st)) porSt.set(p.st, []); porSt.get(p.st).push(i); }
    // en el sitio: cerramientos de parcela y jardín crecen desde el suelo al final
    const sitio = this.sitio.visible ? this.sitio.children.filter((o) => o.userData.montaje) : [];
    const grupoSitio = { [ST.cerr]: sitio.filter((o) => o.userData.montaje === 'cerr'), [ST.jardin]: sitio.filter((o) => o.userData.montaje === 'jardin') };
    for (const s of [ST.cerr, ST.jardin]) if (grupoSitio[s].length) porSt.set(s, []);
    const sts = [...porSt.keys()].sort((a, b) => a - b); const D = Math.max(4, +duracion || 18) * 1000;
    // orden espacial: desde el lado de acceso (por donde llega el camión y está la grúa), en filas que van y vuelven;
    // fachadas, carpinterías, petos y albardillas, recorriendo el perímetro; cubierta, de un testero al otro
    const cx = (this.b.x0 + this.b.x1) / 2, cy = (this.b.y0 + this.b.y1) / 2; const dA = { N: [0, -1], S: [0, 1], E: [1, 0], O: [-1, 0] }[this.modelo.acceso || 'N'] || [0, -1];
    const P = (i) => this._pz[i];
    const barrido = (ids, d = dA, paso = 1.5) => {
      const pr = (i) => (P(i).x - cx) * d[0] + (P(i).y - cy) * d[1], pe = (i) => -(P(i).x - cx) * d[1] + (P(i).y - cy) * d[0];
      const mx = Math.max(...ids.map(pr)); const fila = (i) => Math.floor((mx - pr(i)) / paso + 1e-6);
      return ids.sort((a, b) => fila(a) - fila(b) || (fila(a) % 2 ? pe(b) - pe(a) : pe(a) - pe(b)));
    };
    const a0 = Math.atan2(dA[1], dA[0]); const ang = (i) => { let a = Math.atan2(P(i).y - cy, P(i).x - cx) - a0; while (a < 0) a += Math.PI * 2; return a; };
    const perimetro = (ids) => ids.sort((a, b) => ang(a) - ang(b) || P(a).z - P(b).z);
    const testeros = (ids) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const i of ids) { x0 = Math.min(x0, P(i).x); x1 = Math.max(x1, P(i).x); y0 = Math.min(y0, P(i).y); y1 = Math.max(y1, P(i).y); } return barrido(ids, x1 - x0 >= y1 - y0 ? [-1, 0] : [0, -1], 1.4); };
    const tipoSt = (s) => { if (s === ST.pads || s === ST.muretes) return 'pads'; if (s > ST.muretes && s < 10) return ['', '', 'pads', 'losa', 'muro', 'tab', 'mob', 'losa', 'losa', 'mob'][s] || 'mob'; /* v.1.6: sótano */ if (s >= ST.ext) return s === ST.ext ? 'ext' : s === ST.baranda ? 'baranda' : s === ST.celosia ? 'celosia' : 'pergola'; return ['losa', 'muro', 'carp', 'suelo', 'tab', 'modulo', 'puertas', 'mob', 'cub', 'peto', 'remate'][(s - 10) % 20] || 'mob'; };
    // altura de caída (m), balanceo y si cuelga de la grúa
    const CAIDA = { pads: [3, 0.04, 0], losa: [4.5, 0.06, 1], muro: [4.2, 0.07, 1], carp: [1.6, 0.02, 0], suelo: [0.9, 0, 0], tab: [2.6, 0.04, 0], modulo: [3.6, 0.06, 1], puertas: [1.1, 0.02, 0],
      mob: [1.3, 0.02, 0], cub: [4.2, 0.07, 1], peto: [2.6, 0.04, 0], remate: [1.6, 0.02, 0], ext: [1.6, 0.03, 0], baranda: [1.8, 0.03, 0], celosia: [3.2, 0.05, 1], pergola: [3, 0.05, 1] };
    // tiempo por etapa: proporcional al peso, con un mínimo por pieza para que las grandes (paneles de cubierta,
    // forjados, módulos) se lean una a una y nunca caigan a la vez como una losa
    const MULT = { pads: 0.6, losa: 0.75, muro: 1, carp: 0.55, suelo: 0.5, tab: 1, modulo: 1.25, puertas: 0.55, mob: 1, cub: 1.2, peto: 0.6, remate: 0.55, ext: 2, baranda: 1.6, celosia: 2, pergola: 2 };
    const peso = sts.map((s) => (grupoSitio[s] ? 5 : (MULT[tipoSt(s)] || 1) * (1 + 0.9 * Math.sqrt(porSt.get(s).length)))); const tot = peso.reduce((a, b) => a + b, 0);
    const MINP = { losa: 50, muro: 45, tab: 45, modulo: 220, mob: 35, cub: 300, peto: 70, remate: 40, celosia: 150, pergola: 260 };
    const minS = sts.map((s) => (grupoSitio[s] ? 0 : Math.min(D * 0.22, (MINP[tipoSt(s)] || 0) * porSt.get(s).length)));
    let spans = peso.map((p) => (D - 900) * (p / tot));
    for (let it = 0; it < 4; it++) { spans = spans.map((x, j) => Math.max(x, minS[j])); const sum = spans.reduce((a, b) => a + b, 0); spans = spans.map((x) => (x * (D - 900)) / sum); }
    const plan = new Float32Array(n * 4); const cable = new Uint8Array(n); const fases = []; const crecer = [];
    let t = 350, kPrev = 0;
    sts.forEach((s, j) => {
      const span = spans[j]; const f = this._fases?.get(s) || { k: 4, nombre: 'Acabados', planta: null }; const k = Math.max(kPrev, f.k); kPrev = k;
      if (!fases.length || fases[fases.length - 1].nombre !== f.nombre) fases.push({ t, k, nombre: f.nombre, planta: f.planta });
      if (grupoSitio[s]) { for (const o of grupoSitio[s]) crecer.push({ o, t0: t, dur: Math.max(700, span * 0.9) }); t += span; return; }
      const ty = tipoSt(s); let ids = porSt.get(s);
      if (ty === 'muro' || ty === 'carp' || ty === 'peto') ids = perimetro(ids);
      else if (ty === 'cub') ids = testeros(ids);
      else if (ty === 'remate') { const pk = (i) => (P(i).k?.startsWith('rg|') ? 0 : 1); const g0 = ids.filter((i) => !pk(i)), g1 = ids.filter((i) => pk(i)); ids = [...barrido(g0), ...perimetro(g1)]; }
      else ids = barrido(ids);
      const [h0, sw, cb] = CAIDA[ty] || [2, 0.03, 0];
      const dur = clamp(span * 0.6, 420, 1150); const paso = ids.length > 1 ? Math.max(0, span - dur * 0.55) / (ids.length - 1) : 0;
      ids.forEach((i, q) => { plan[i * 4] = t + q * paso; plan[i * 4 + 1] = dur; plan[i * 4 + 2] = h0 + (ty === 'losa' || ty === 'muro' || ty === 'cub' ? P(i).z * 0.3 : 0); plan[i * 4 + 3] = sw; cable[i] = cb; });
      t += span;
    });
    fases.forEach((f, i) => { f.i = i; f.n = fases.length; });
    for (const c of crecer) { c.vis = c.o.visible; c.o.visible = false; c.o.scale.y = 1e-3; }
    this._mont = { t0: performance.now(), plan, cable, fin: t + 700, alTerminar, alFase, alDetener, fases, iFase: -1, crecer };
    this._U.activo.value = 1;
    if (!this.opt.sinBucle) { this.ctl.autoRotate = true; this.ctl.autoRotateSpeed = 0.32; } // giro lento mientras se monta (se corta al tocar)
    this._pasoMontaje(this._mont.t0); this.pedir();
    if (this.opt.sinBucle) this._bucleMontaje();
    return true;
  }
  // Sin bucle propio (sinBucle): el montaje se anima con un bucle temporal que muere al terminar.
  _bucleMontaje() {
    const m = this._mont; const paso = () => { if (this._fin || this._mont !== m) return; requestAnimationFrame(paso); this._pasoMontaje(performance.now()); this.ctl.update(); this.render(false); };
    requestAnimationFrame(paso);
  }
  _pasoMontaje(now) {
    const m = this._mont; if (!m) return; const t = now - m.t0; const tex = this._U.tex.value; const d = tex.image.data; const n = this._pz.length; const pl = m.plan;
    const colgadas = [];
    for (let i = 1; i < n; i++) {
      const s = pl[i * 4], du = pl[i * 4 + 1], h = pl[i * 4 + 2], sw = pl[i * 4 + 3]; const k = (t - s) / du;
      let y = 0, dx = 0, dz = 0;
      if (k <= 0) y = 1e4;
      else if (k < 0.8) { // descenso de grúa: arranca suave, llega con algo de velocidad; balanceo que se amortigua
        const u = k / 0.8; const S = 0.72 * u * u * (3 - 2 * u) + 0.28 * u; y = h * (1 - S);
        const amp = sw * Math.pow(1 - u, 1.5), ph = i * 1.7; dx = Math.sin(u * 7.5 + ph) * amp; dz = Math.cos(u * 6.1 + ph) * amp * 0.6;
        if (m.cable[i] && colgadas.length < 24) colgadas.push([i, y]);
      } else if (k < 1) { const u = (k - 0.8) / 0.2; y = Math.sin(Math.PI * u) * (1 - u) * Math.min(0.07, 0.012 * h + 0.012); } // ligero rebote al apoyar
      d[i * 4] = dx; d[i * 4 + 1] = y; d[i * 4 + 2] = dz;
    }
    tex.needsUpdate = true;
    for (const c of m.crecer) { const u = clamp((t - c.t0) / c.dur, 0, 1); const e = u <= 0 ? 1e-3 : 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2); c.o.visible = u > 0 && c.vis; c.o.scale.y = Math.max(1e-3, u >= 1 ? 1 : e); }
    this._cables(colgadas);
    // fases (rótulos): alFase(k, info) al empezar cada una
    while (m.iFase + 1 < m.fases.length && t >= m.fases[m.iFase + 1].t) { // todas, en orden, aunque un fotograma salte varias
      const F = m.fases[++m.iFase]; this._faseMontaje = F;
      if (m.alFase) { try { m.alFase(F.k, { i: F.i, n: F.n, nombre: F.nombre, planta: F.planta, k: F.k }); } catch (e) { console.warn(e); } }
    }
    this.pedir();
    if (t > m.fin) this._finMontaje(true);
  }
  // Cables de grúa de las piezas que están bajando: cable vertical y eslingas hasta la pieza (una sola malla de líneas).
  _cables(lista) {
    if (!lista.length && !this._cable) return;
    if (!this._cable) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 6 * 3), 3));
      this._cable = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#2b2c2a', transparent: true, opacity: 0.55, depthWrite: false }));
      this._cable.frustumCulled = false; this._cable.renderOrder = 2; this.scene.add(this._cable);
    }
    const a = this._cable.geometry.attributes.position; let v = 0; const lado = this.dir('E').multiplyScalar(0.55);
    const TOP = { muro: 2.9, modulo: 2.5, celosia: 3, pergola: 0.2 };
    for (const [i, y] of lista) {
      const p = this._pz[i]; const top = TOP[p.k?.startsWith('m|') ? 'muro' : p.k?.startsWith('mod|') || p.k?.startsWith('esc|') ? 'modulo' : p.k?.startsWith('cel|') ? 'celosia' : ''] || 0.3;
      const base = this.mundo(p.x, p.y, p.z + y + top); const gancho = base.clone(); gancho.y += 0.9;
      const put = (q) => { a.setXYZ(v++, q.x, q.y, q.z); };
      put(gancho); put(gancho.clone().setY(gancho.y + 60)); put(gancho); put(base.clone().add(lado)); put(gancho); put(base.clone().sub(lado));
    }
    this._cable.geometry.setDrawRange(0, v); a.needsUpdate = true; this._cable.visible = v > 0;
  }
  get faseMontaje() { return this._mont ? this._faseMontaje || null : null; }
  _finMontaje(avisar) {
    const m = this._mont; this._mont = null; this._U.activo.value = 0; const tex = this._U.tex.value; if (tex) { tex.image.data.fill(0); tex.needsUpdate = true; }
    for (const c of m?.crecer || []) { c.o.scale.y = 1; c.o.visible = c.vis; }
    if (this._cable) this._cable.visible = false; this.ctl.autoRotate = false; this._faseMontaje = null;
    this._tq = performance.now() + 50; this.pedir(); if (this.opt.sinBucle && !this._fin) this.render(true);
    if (avisar && m?.alTerminar) { try { m.alTerminar(); } catch (e) { console.warn(e); } }
    // alDetener(completo): SIEMPRE al acabar, también si se corta (otra vista, setModelo, detenerMontaje): la interfaz no se queda en «■ …»
    if (m?.alDetener) { try { m.alDetener(!!avisar); } catch (e) { console.warn(e); } }
  }
  detenerMontaje() { if (this._mont) this._finMontaje(false); }

  captura(w = 1536, h = 1024, tipo = 'image/jpeg') {
    const r = this.renderer; r.setPixelRatio(1); r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.ctl.update();
    if (this.post) { this.post.comp.setPixelRatio(1); this.post.comp.setSize(w, h); }
    this.render(true); const url = r.domElement.toDataURL(tipo, 0.92);
    this.ajustar(); return url;
  }
}
