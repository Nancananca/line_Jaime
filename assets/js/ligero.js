// Modo ligero: móviles, tabletas y equipos con poca memoria (en iOS Safari la pestaña se cae por memoria de GPU).
// Se activa solo con iOS/iPadOS (también el iPad que se anuncia como Mac con pantalla táctil), con puntero táctil y
// ancho ≤ 1024 px, o con navigator.deviceMemory ≤ 4. «?ligero=1» lo fuerza y «?ligero=0» lo quita (se recuerda en la
// pestaña: sessionStorage); «?ligero=auto» vuelve a la detección. En escritorio no cambia nada.
//
// Qué hace la app en modo ligero (cada módulo lo consulta):
//   · miniaturas.js  · no genera maquetas 3D en el navegador: la tarjeta usa la miniatura en caché si existe (solo la
//                      imagen fija, sin tira de giro) o el plano de planta SVG (core/planos.mjs).
//   · visor3d.js     · resolución ≤ 1,5 (≤ 1 en iOS), sin posproceso (GTAO, SMAA, acabado), sombras de 1024.
//   · hilvan.js      · lienzo a resolución 1.
//   · guia.js        · no arranca sola: ofrece «Ver la guía»; se salta los pasos que lanzan el 3D pesado.
//   · inicio.js      · de las fotos de cabecera, solo la primera.
//   · muestras.js    · sin render 3D de muestras (colores planos).
// Límite global de contextos WebGL vivos (glAlta): en modo ligero, como mucho LIMITE_GL; al pedir otro se libera el
// más antiguo (primero los que no piden conservarse, como el Hilván de la guía). Depuración: window.__ligero.
const W = typeof window !== 'undefined' ? window : null;
const nav = typeof navigator !== 'undefined' ? navigator : {};
const ua = String(nav.userAgent || '');
export const IOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1);
function forzado() {
  if (!W) return null; let q = null;
  try { q = new URLSearchParams(location.search).get('ligero'); } catch { /* sin URL */ }
  try {
    if (q === '1' || q === '0') sessionStorage.setItem('nanca.ligero', q); else if (q === 'auto') sessionStorage.removeItem('nanca.ligero');
    const s = sessionStorage.getItem('nanca.ligero'); if (s === '1' || s === '0') return s === '1';
  } catch { if (q === '1' || q === '0') return q === '1'; }
  return null;
}
function detectar() {
  if (!W) return false; if (IOS) return true;
  let tactil = false; try { tactil = matchMedia('(pointer: coarse)').matches && Math.min(innerWidth || 9999, (screen && screen.width) || 9999) <= 1024; } catch { /* nada */ }
  const mem = Number(nav.deviceMemory); return tactil || (mem > 0 && mem <= 4);
}
const F = forzado();
export const LIGERO = F ?? detectar();
export const LIGERO_FORZADO = F != null;
export const LIMITE_GL = 2;
// resolución máxima del 3D en modo ligero
export const PR_LIGERO = IOS ? 1 : 1.5;

// ---------- contador de contextos WebGL vivos ----------
const vivos = []; // { etq, liberar, conservar, t }
// Llamar ANTES de crear el WebGLRenderer. liberar(): suelta ese contexto (dispose + forceContextLoss). Devuelve baja().
export function glAlta(etq, liberar, { conservar = false } = {}) {
  if (LIGERO) {
    while (vivos.length >= LIMITE_GL) {
      let i = vivos.findIndex((v) => !v.conservar); if (i < 0) i = 0;
      const [v] = vivos.splice(i, 1); console.info(`Modo ligero: se libera el WebGL «${v.etq}» para abrir «${etq}»`);
      try { v.liberar(); } catch (e) { console.warn('Modo ligero: no se pudo liberar', v.etq, e); }
    }
  }
  const reg = { etq, liberar, conservar, t: Date.now() }; vivos.push(reg);
  return () => { const i = vivos.indexOf(reg); if (i >= 0) vivos.splice(i, 1); };
}
export const glVivos = () => vivos.map((v) => v.etq);

if (W) {
  try { document.documentElement.classList.toggle('ligero', LIGERO); } catch { /* nada */ }
  W.__ligero = { activo: LIGERO, forzado: LIGERO_FORZADO, ios: IOS, prMax: LIGERO ? PR_LIGERO : null, gl: glVivos };
  // decodificación asíncrona de todas las imágenes (las que ya llevan loading se respetan)
  if (LIGERO && typeof MutationObserver !== 'undefined') {
    const fija = (im) => { if (!im.hasAttribute('decoding')) im.decoding = 'async'; };
    const mo = new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType !== 1) continue; if (n.tagName === 'IMG') fija(n); else if (n.querySelectorAll) for (const im of n.querySelectorAll('img:not([decoding])')) fija(im); } });
    const ir = () => { try { mo.observe(document.documentElement, { childList: true, subtree: true }); } catch { /* nada */ } };
    if (document.documentElement) ir(); else addEventListener('DOMContentLoaded', ir, { once: true });
  }
}
