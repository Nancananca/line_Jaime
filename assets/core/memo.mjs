// Caché por planta para cálculos puros que se repiten muchas veces sobre la misma planta (celdas, muros, contacto
// con zonas comunes…): validar, derivar, superficies, planos y el 3D los piden una y otra vez en cada repintado.
// Módulo puro (navegador y servidor), sin dependencias.
//
// Regla de validez: el resultado se reutiliza mientras la planta sea el MISMO objeto y sus estancias sean los mismos
// objetos (misma identidad y mismo orden) con el mismo contenido (firma JSON de la lista de estancias). Cualquier
// cambio (mover, redimensionar, cambiar tipo o vivienda, añadir o quitar) invalida la entrada. La caché es un WeakMap:
// se libera sola con la planta. Quien use memoPlanta() debe devolver COPIAS de lo cacheado si el resultado es mutable.
const CACHE = new WeakMap(); // planta → { firma, est: [estancias], v: { clave: valor } }

function entrada(planta) {
  const est = planta?.estancias; if (!planta || typeof planta !== 'object' || !Array.isArray(est)) return null;
  let firma; try { firma = JSON.stringify(est); } catch { return null; } // estructura rara (ciclos…): sin caché
  let c = CACHE.get(planta);
  if (c && c.firma === firma && c.est.length === est.length && c.est.every((e, i) => e === est[i])) return c;
  c = { firma, est: est.slice(), v: new Map() }; CACHE.set(planta, c); return c;
}
// Devuelve calc(planta) recordado bajo `clave` para esta planta (o lo calcula sin recordar si la planta no es cacheable).
export function memoPlanta(planta, clave, calc) {
  const c = entrada(planta); if (!c) return calc(planta);
  if (c.v.has(clave)) return c.v.get(clave);
  const r = calc(planta); c.v.set(clave, r); return r;
}
