// Validación de un modelo: trama, solapes, vuelos ≤ 1,50 m, programa, habitabilidad, accesos, luz, escalera y luces.
// Niveles y pesos como la cápsula reglas/habitabilidad@1.0.0: error 25 · aviso 8 · info 1. Puntuación 0–100.
// Todo lo que aquí se deduce es evidencia «concepto»: orienta el diseño y no sustituye la validación técnica.
import { T, TE, onGrid, VUELO_MAX, fmt } from './trama.mjs';
import { TIPOS, esInt, esDorm, HABITABLES, grupo } from './catalogo.mjs';
import { celdasPlanta, derivar, superficies, bbox, esMedianera } from './geometria.mjs';
import { esEdificio, viviendas, plantasAcceso, circComun, EDIFICIO } from './edificio.mjs';
import { reglasCimentacion } from './cimentacion.mjs';
import { reglasSotano, superficiesSotano } from './sotano.mjs'; // v.1.6: planta sótano y rampa

const PESO = { error: 25, aviso: 8, info: 1, ok: 0 };

export function validar(modelo, parcela) {
  const L = [];
  const add = (nivel, regla, texto, extra) => L.push(Object.assign({ nivel, regla, texto }, extra || {}));
  const S = superficies(modelo);
  const todas = modelo.plantas.flatMap((p, pi) => p.estancias.map((e) => ({ e, pi })));
  if (!todas.length) { add('error', 'PROGRAMA', 'El modelo está vacío: añade estancias.'); return cierre(L, S); }
  const edif = esEdificio(modelo); const G = []; // v.1.5: edificio plurifamiliar (estancia.vivienda)
  const banosViv = (v) => todas.filter(({ e }) => e.vivienda === v && (e.tipo === 'bano' || e.tipo === 'aseo')).length;

  modelo.plantas.forEach((p, pi) => {
    const g = derivar(modelo, pi); G[pi] = g;
    const { solapes } = celdasPlanta(p);
    const nom = (id) => (p.estancias.find((e) => e.id === id) || {}).nombre || id;
    for (const [a, b] of solapes) add('error', 'SOLAPE', `${p.nombre}: «${nom(a)}» y «${nom(b)}» se pisan.`, { ids: [a, b], planta: pi });
    for (const e of p.estancias) {
      const t = TIPOS[e.tipo];
      if (![e.x, e.y, e.w, e.h].every((v) => onGrid(v))) add('error', 'TRAMA', `«${e.nombre}» está fuera de la trama de 37,5 cm.`, { ids: [e.id], planta: pi });
      else if (!TIPOS[e.tipo].ext && ![e.x, e.y, e.w, e.h].every((v) => onGrid(v, TE))) add('info', 'TRAMA', `«${e.nombre}» usa medidas de 37,5 cm fuera de la trama estructural de 0,75 m: requerirá pieza especial.`, { ids: [e.id], planta: pi });
      const a = e.w * e.h, lado = Math.min(e.w, e.h);
      if (a < t.minA - 1e-6) add('aviso', 'MINIMOS', `«${e.nombre}» tiene ${fmt(a)} m²; el mínimo recomendado para ${t.n.toLowerCase()} es ${fmt(t.minA)} m².`, { ids: [e.id], planta: pi });
      else if (lado < t.minL - 1e-6) add('aviso', 'MINIMOS', `«${e.nombre}» tiene un lado de ${fmt(lado)} m; conviene al menos ${fmt(t.minL)} m.`, { ids: [e.id], planta: pi });
      if (e.tipo === 'garaje' && !e.taller) { // plazas por ancho libre: ~2,6 m cada una; fondo útil 5,0–6,0 m
        const largo = Math.max(e.w, e.h); const plazas = Math.max(1, Math.floor((lado + 0.4) / 2.6)) * Math.max(1, Math.floor(largo / 4.75)); // en batería y en línea (plaza ≥ 4,75 m de fondo)
        const max = plazas * 3.375 * 6.375 + 1e-6;
        if (a > max) add('aviso', 'GARAJE', `«${e.nombre}» tiene ${fmt(a)} m² para ${plazas} plaza${plazas > 1 ? 's' : ''}: está sobredimensionado (≈ ${fmt(plazas * 3.375 * 5.625)} m² bastan). Si es garaje taller, márcalo como tal (e.taller) o usa un complemento.`, { ids: [e.id], planta: pi });
      }
      if ((e.tipo === 'pasillo') && lado < 1.5 - 1e-6) add('aviso', 'PASO', `«${e.nombre}» mide ${fmt(lado)} m de ancho a ejes: el paso libre queda por debajo de 0,90 m. Usa 1,50 m.`, { ids: [e.id], planta: pi });
      if (esInt(e.tipo) && lado > 6 + 1e-6) add('aviso', 'LUCES', `«${e.nombre}» salva ${fmt(lado)} m de luz: necesita jácena o pilar intermedio (luz modular orientativa 6,00 m — cápsula estructura/luces-vigas, a validar).`, { ids: [e.id], planta: pi });
      const conFachada = (id) => g.segs.some((s) => s.clase === 'fachada' && s.int.id === id && !esMedianera(modelo, s));
      const prestada = grupo(e.tipo) === 'dia' && g.segs.some((s) => s.clase === 'abierto' && (s.a.id === e.id || s.b.id === e.id) && conFachada(s.a.id === e.id ? s.b.id : s.a.id));
      if (HABITABLES.includes(e.tipo) && !conFachada(e.id) && prestada) add('info', 'LUZ', `«${e.nombre}» toma la luz del espacio abierto contiguo (segunda luz).`, { ids: [e.id], planta: pi });
      else if (HABITABLES.includes(e.tipo) && !conFachada(e.id))
        add('error', 'LUZ', `«${e.nombre}» no tiene fachada: una estancia vividera necesita luz y ventilación natural.`, { ids: [e.id], planta: pi });
      else if (HABITABLES.includes(e.tipo) && conFachada(e.id) && !g.huecos.some((h) => h.est === e.id && h.tipo !== 'puerta'))
        add('aviso', 'LUZ', `«${e.nombre}» no tiene ventana.`, { ids: [e.id], planta: pi });
    }
    for (const id of g.sinAcceso) add('error', 'ACCESO', `${p.nombre}: no se puede llegar a «${nom(id)}».`, { ids: [id], planta: pi });
    if (g.huerfanos?.length) add('aviso', 'HUECOS', `${p.nombre}: ${g.huerfanos.length} hueco(s) colocados a mano ya no están sobre un muro (se movieron las estancias). Muévelos o vuelve a automático.`, { planta: pi });
    // puertas que obligan a cruzar un dormitorio o un baño
    for (const d of g.puertas) {
      const a = p.estancias.find((e) => e.id === d.a), b = p.estancias.find((e) => e.id === d.b); if (!a || !b) continue;
      if (esDorm(b.tipo) && esDorm(a.tipo)) add('aviso', 'ACCESO', `A «${a.nombre}» se entra cruzando «${b.nombre}». Acércalo a un pasillo o distribuidor.`, { ids: [a.id], planta: pi });
      if (grupo(a.tipo) === 'humedo' && !a.suite && esDorm(b.tipo) && (edif ? banosViv(a.vivienda || '') : S.banos + S.aseos) <= 1) add('aviso', 'ACCESO', `El único baño se usa desde «${b.nombre}».`, { ids: [a.id], planta: pi });
    }
    if (pi === 0 && !g.huecos.some((h) => h.entrada)) add('error', 'ACCESO', 'No hay sitio para la puerta de entrada: deja 1,50 m de fachada en recibidor, pasillo o salón.', { planta: 0 });
    // vuelos
    if (pi > 0) {
      const v = g.vuelos;
      if (v.viola.length) {
        const mx = Math.max(...v.viola.map((c) => (isFinite(c.d) ? c.d : 99)));
        add('error', 'VUELO', `${p.nombre}: ${v.viola.length} celdas vuelan ${mx >= 99 ? 'sin ningún apoyo debajo' : fmt(mx) + ' m'} — el máximo sin apoyo es ${fmt(VUELO_MAX)} m. Añade pilares o recoge el volumen.`, { planta: pi, celdas: v.viola.map((c) => [c.x, c.y]), ids: [...new Set(v.viola.map((c) => c.est))] });
      } else if (v.celdas.length) add('info', 'VUELO', `${p.nombre}: vuelo de ${fmt(v.max)} m, dentro del máximo de ${fmt(VUELO_MAX)} m.`, { planta: pi });
      // escalera
      if (edif) { escalerasEdificio(modelo, pi, add); return; }
      const eAb = modelo.plantas[pi - 1].estancias.filter((e) => e.tipo === 'escalera'), eAr = p.estancias.filter((e) => e.tipo === 'escalera');
      if (!eAr.length || !eAb.length) add('error', 'ESCALERA', `Falta la escalera entre ${modelo.plantas[pi - 1].nombre.toLowerCase()} y ${p.nombre.toLowerCase()}.`, { planta: pi });
      else if (!eAr.some((a) => eAb.some((b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h)))
        add('error', 'ESCALERA', `La escalera de ${p.nombre.toLowerCase()} no coincide con la de abajo: deben ocupar el mismo hueco.`, { planta: pi, ids: eAr.map((e) => e.id) });
    }
  });
  if ((modelo.cubierta?.alero || 0) > VUELO_MAX) add('error', 'VUELO', `El alero de cubierta supera ${fmt(VUELO_MAX)} m.`);
  reglasCimentacion(modelo, add, G[0]); // v.1.6: forjado sanitario y accesos exteriores (sin ellos no añade nada)

  if (edif) reglasEdificio(modelo, S, G, todas, add);
  else {
  // programa
  const hay = (t) => todas.some(({ e }) => e.tipo === t);
  if (!hay('salon')) add('error', 'PROGRAMA', 'Falta el salón o estar.');
  if (!hay('cocina') && !todas.some(({ e }) => e.tipo === 'salon' && /cocina/i.test(e.nombre || ''))) add('error', 'PROGRAMA', 'Falta la cocina.');
  if (!S.banos) add('error', 'PROGRAMA', 'Falta un baño completo.');
  if (!S.dormitorios && !modelo.estudio) add('aviso', 'PROGRAMA', 'No hay dormitorios (correcto solo si es un estudio).');
  if (S.dormitorios >= 3 && S.banos + S.aseos < 2) add('aviso', 'PROGRAMA', `${S.dormitorios} dormitorios con un solo baño: conviene un segundo baño o aseo.`);
  if (modelo.plantas.length > 1 && !modelo.plantas[0].estancias.some((e) => grupo(e.tipo) === 'humedo')) add('aviso', 'PROGRAMA', 'La planta baja no tiene aseo ni baño.');
  // núcleos húmedos apilados
  if (modelo.plantas.length > 1) {
    const hum = (p) => p.estancias.filter((e) => TIPOS[e.tipo].humedo);
    const sup = hum(modelo.plantas[1]), inf = hum(modelo.plantas[0]);
    const cerca = (a, b) => a.x < b.x + b.w + 1.5 && a.x + a.w > b.x - 1.5 && a.y < b.y + b.h + 1.5 && a.y + a.h > b.y - 1.5;
    const lejos = sup.filter((a) => !inf.some((b) => cerca(a, b)));
    if (lejos.length) add('info', 'INSTALACIONES', `${lejos.map((e) => '«' + e.nombre + '»').join(', ')} no cae${lejos.length > 1 ? 'n' : ''} sobre un cuarto húmedo de la planta baja: la bajante necesitará patinillo.`, { ids: lejos.map((e) => e.id) });
  }
  const b = bbox(modelo);
  if (b.w / b.h > 5 || b.h / b.w > 5) add('info', 'FORMA', `Huella muy alargada (${fmt(b.w)} × ${fmt(b.h)} m): revisa recorridos y envolvente.`);

  }
  // v.1.6 · planta sótano y rampa (parcela.parcela y parcela.casa, si llegan, para comprobar que la rampa cabe)
  if (modelo.sotano) { reglasSotano(modelo, parcela?.parcela ? { parcela: parcela.parcela, casa: parcela.casa } : null, add); S.sotano = superficiesSotano(modelo); }
  // parcela
  if (parcela && parcela.comprobaciones) {
    const c = parcela.comprobaciones;
    if (!c.dentro) add('error', 'PARCELA', 'La vivienda se sale de la parcela.');
    else if (!c.retranqueosOk) add('error', 'PARCELA', `La vivienda invade los retranqueos (distancia mínima a lindero ${fmt(c.dmin)} m).`);
    if (c.ocupacionMax && c.ocupacion > c.ocupacionMax + 1e-6) add('error', 'PARCELA', `Ocupación ${fmt(c.ocupacion, 1)} % sobre el máximo de ${fmt(c.ocupacionMax, 1)} %.`);
    if (c.edificabilidadMax && c.edificabilidad > c.edificabilidadMax + 1e-6) add('error', 'PARCELA', `Edificabilidad ${fmt(c.edificabilidad)} m²/m² sobre el máximo de ${fmt(c.edificabilidadMax)}.`);
    if (c.plantasMax && modelo.plantas.length > c.plantasMax) add('error', 'PARCELA', `${modelo.plantas.length} plantas sobre un máximo de ${c.plantasMax}.`);
  }
  return cierre(L, S);
}

// ---------- v.1.5 · edificios plurifamiliares ----------
// Escalera común continua y alineada en todas las plantas con zonas comunes; escalera de dúplex con continuación.
function escalerasEdificio(modelo, pi, add) {
  const p = modelo.plantas[pi], q = modelo.plantas[pi - 1]; const mismo = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
  const com = (pl) => pl.estancias.filter((e) => e.tipo === 'escalera' && !e.vivienda);
  if (p.estancias.some((e) => !e.vivienda && esInt(e.tipo))) {
    const eAr = com(p), eAb = com(q);
    if (!eAr.length || !eAb.length) add('error', 'ESCALERA', `Falta la escalera común entre ${q.nombre.toLowerCase()} y ${p.nombre.toLowerCase()}.`, { planta: pi });
    else if (!eAr.some((a) => eAb.some((b) => mismo(a, b)))) add('error', 'ESCALERA', `La escalera común de ${p.nombre.toLowerCase()} no coincide con la de abajo: deben ocupar el mismo hueco en todas las plantas.`, { planta: pi, ids: eAr.map((e) => e.id) });
  }
  for (const e of p.estancias) if (e.tipo === 'escalera' && e.vivienda && !q.estancias.some((b) => b.tipo === 'escalera' && b.vivienda === e.vivienda && mismo(e, b)) && !modelo.plantas[pi + 1]?.estancias.some((b) => b.tipo === 'escalera' && b.vivienda === e.vivienda && mismo(e, b)))
    add('error', 'ESCALERA', `La escalera de la vivienda ${e.vivienda} (${p.nombre.toLowerCase()}) no continúa en la planta de abajo ni en la de arriba en el mismo hueco.`, { planta: pi, ids: [e.id] });
  if (pi === 1) for (const e of q.estancias) if (e.tipo === 'escalera' && e.vivienda && !p.estancias.some((b) => b.tipo === 'escalera' && b.vivienda === e.vivienda && mismo(e, b)))
    add('error', 'ESCALERA', `La escalera de la vivienda ${e.vivienda} (${q.nombre.toLowerCase()}) no continúa arriba en el mismo hueco.`, { planta: 0, ids: [e.id] });
}
function reglasEdificio(modelo, S, G, todas, add) {
  const vivs = viviendas(modelo); const NP = modelo.plantas.map((p) => p.nombre.toLowerCase());
  const porId = new Map(todas.map(({ e, pi }) => [e.id, { e, pi }]));
  // programa y superficie de cada vivienda
  for (const v of vivs) {
    const est = todas.filter(({ e }) => e.vivienda === v).map(({ e }) => e); const ids = est.map((e) => e.id); const hay = (t) => est.some((e) => e.tipo === t);
    const sv = (S.viviendas || []).find((x) => x.id === v) || { util: 0, dormitorios: 0, banos: 0, aseos: 0 };
    if (!hay('salon')) add('error', 'PROGRAMA', `La vivienda ${v} no tiene salón o estar.`, { ids });
    if (!hay('cocina') && !est.some((e) => e.tipo === 'salon' && /cocina/i.test(e.nombre || ''))) add('error', 'PROGRAMA', `La vivienda ${v} no tiene cocina.`, { ids });
    if (!sv.banos) add('error', 'PROGRAMA', `La vivienda ${v} no tiene un baño completo.`, { ids });
    if (sv.dormitorios >= 3 && sv.banos + sv.aseos < 2) add('aviso', 'PROGRAMA', `La vivienda ${v} tiene ${sv.dormitorios} dormitorios con un solo baño: conviene un segundo baño o aseo.`, { ids });
    const min = EDIFICIO.utilMin[Math.min(sv.dormitorios, EDIFICIO.utilMin.length - 1)];
    if (sv.util < min - 1e-6) add('aviso', 'VIVIENDA', `La vivienda ${v} tiene ${fmt(sv.util)} m² útiles: para ${sv.dormitorios ? sv.dormitorios + ' dormitorio' + (sv.dormitorios > 1 ? 's' : '') : 'un estudio'} conviene al menos ${fmt(min, 0)} m².`, { ids });
    if (!plantasAcceso(modelo, v).length && !G.some((g) => g.huecos.some((h) => (h.tipo === 'puerta' || h.tipo === 'porton') && ids.includes(h.est)))) add('error', 'ACCESO', `La vivienda ${v} no linda con ningún rellano ni portal: no tiene puerta de vivienda.`, { ids });
  }
  modelo.plantas.forEach((p, pi) => {
    const g = G[pi]; const est = (id) => p.estancias.find((e) => e.id === id);
    for (const d of g.puertas) {
      const a = est(d.a), b = est(d.b); if (!a || !b) continue;
      if (a.vivienda && b.vivienda && a.vivienda !== b.vivienda) add('error', 'VIVIENDAS', `${p.nombre}: hay una puerta entre las viviendas ${a.vivienda} y ${b.vivienda} («${a.nombre}» – «${b.nombre}»). Cada vivienda solo abre a zona común.`, { ids: [a.id, b.id], planta: pi });
    }
    // dormitorios pasantes: un dormitorio con puerta a más de una pieza (salvo su baño en suite o su vestidor)
    for (const e of p.estancias) if (esDorm(e.tipo) && e.vivienda) {
      const otros = g.puertas.filter((d) => d.a === e.id || d.b === e.id).map((d) => est(d.a === e.id ? d.b : d.a)).filter((o) => o && !(o.tipo === 'vestidor' || ((o.tipo === 'bano' || o.tipo === 'aseo') && o.suite)));
      if (otros.length > 1) add('aviso', 'ACCESO', `«${e.nombre}» (vivienda ${e.vivienda}) es pasante: se cruza para llegar a ${otros.map((o) => '«' + o.nombre + '»').join(', ')}.`, { ids: [e.id], planta: pi });
    }
    // rellanos y pasos comunes de 1,50 m como mínimo
    for (const e of p.estancias) if (circComun(e) && e.tipo !== 'escalera' && Math.min(e.w, e.h) < EDIFICIO.rellano - 1e-6) add('aviso', 'RELLANO', `«${e.nombre}» (${p.nombre.toLowerCase()}) mide ${fmt(Math.min(e.w, e.h))} m: los rellanos y pasos comunes necesitan al menos ${fmt(EDIFICIO.rellano)} m (giro de 1,50 delante de las puertas).`, { ids: [e.id], planta: pi });
    for (const e of p.estancias) if (e.tipo === 'ascensor') {
      if (!g.puertas.some((d) => d.ascensor && d.a === e.id)) add('aviso', 'ASCENSOR', `«${e.nombre}» (${p.nombre.toLowerCase()}) no da a ningún rellano: su puerta de cabina necesita un tabique hacia una zona común de paso.`, { ids: [e.id], planta: pi });
      if (Math.min(e.w, e.h) < 1.5 - 1e-6 || Math.max(e.w, e.h) < 2.25 - 1e-6) add('info', 'ASCENSOR', `El hueco de «${e.nombre}» (${fmt(e.w)} × ${fmt(e.h)} m) es el mínimo: para cabina accesible se recomienda ${fmt(EDIFICIO.ascensor.w)} × ${fmt(EDIFICIO.ascensor.h)} m.`, { ids: [e.id], planta: pi });
    }
  });
  // portal: la entrada del edificio es una zona común de planta baja
  const hayComun = todas.some(({ e }) => !e.vivienda && esInt(e.tipo));
  const ent = G[0].huecos.find((h) => h.entrada); const eEnt = ent && porId.get(ent.est)?.e;
  if (hayComun && (!eEnt || eEnt.vivienda)) add('error', 'PORTAL', 'Falta el portal: la puerta de entrada del edificio debe abrir a una zona común de planta baja (recibidor común con 1,50 m de fachada).', { planta: 0 });
  // ascensor (CTE DB-SUA 9: obligatorio si hay que salvar más de dos plantas hasta alguna vivienda o más de 12 viviendas por encima del acceso)
  const acc = vivs.map((v) => plantasAcceso(modelo, v)); const maxAcc = Math.max(0, ...acc.flat()); const nAlto = acc.filter((a) => a.length && Math.min(...a) > 0).length;
  const ascs = modelo.plantas.map((p) => p.estancias.filter((e) => e.tipo === 'ascensor' && !e.vivienda));
  const hayAsc = ascs.some((a) => a.length);
  if (!hayAsc && (maxAcc > EDIFICIO.plantasSinAscensor || nAlto > EDIFICIO.viviendasSinAscensor)) add('aviso', 'ASCENSOR', `El edificio necesita ascensor accesible: hay viviendas con acceso en ${NP[maxAcc]}${nAlto > EDIFICIO.viviendasSinAscensor ? ` y ${nAlto} viviendas por encima del portal` : ''}. Hueco recomendado ${fmt(EDIFICIO.ascensor.w)} × ${fmt(EDIFICIO.ascensor.h)} m junto a la escalera, en la misma posición en todas las plantas.`);
  else if (!hayAsc && maxAcc === EDIFICIO.plantasSinAscensor) add('info', 'ASCENSOR', `Hay viviendas con acceso en ${NP[maxAcc]}: el ascensor no es obligatorio (solo se salvan dos plantas), pero mejora la accesibilidad.`);
  if (hayAsc) {
    const mismo = (a, b) => a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
    const base = ascs[0][0] || ascs.find((a) => a.length)[0];
    for (let pi = 0; pi <= maxAcc && pi < modelo.plantas.length; pi++) {
      const conViv = acc.some((a) => a.includes(pi)) || pi === 0;
      if (conViv && !ascs[pi].some((e) => mismo(e, base))) add('aviso', 'ASCENSOR', ascs[pi].length ? `El ascensor de ${NP[pi]} no ocupa el mismo hueco que en ${NP[0]}.` : `El ascensor no llega a ${NP[pi]}, que tiene viviendas: debe parar en todas las plantas con acceso.`, { planta: pi, ids: ascs[pi].map((e) => e.id) });
    }
  }
  // núcleos húmedos apilados (información para bajantes)
  for (let pi = 1; pi < modelo.plantas.length; pi++) {
    const hum = (p) => p.estancias.filter((e) => TIPOS[e.tipo].humedo);
    const sup = hum(modelo.plantas[pi]), inf = hum(modelo.plantas[pi - 1]);
    const cerca = (a, b) => a.x < b.x + b.w + 1.5 && a.x + a.w > b.x - 1.5 && a.y < b.y + b.h + 1.5 && a.y + a.h > b.y - 1.5;
    const lejos = sup.filter((a) => !inf.some((b) => cerca(a, b)));
    if (lejos.length) add('info', 'INSTALACIONES', `${modelo.plantas[pi].nombre}: ${lejos.map((e) => '«' + e.nombre + '»').join(', ')} no cae${lejos.length > 1 ? 'n' : ''} sobre un cuarto húmedo de la planta de abajo: la bajante necesitará patinillo.`, { ids: lejos.map((e) => e.id), planta: pi });
  }
  const b = bbox(modelo);
  if (b.w / b.h > 5 || b.h / b.w > 5) add('info', 'FORMA', `Huella muy alargada (${fmt(b.w)} × ${fmt(b.h)} m): revisa recorridos y envolvente.`);
}

function cierre(L, S) {
  const orden = { error: 0, aviso: 1, info: 2 };
  L.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
  // los avisos informativos (p. ej. piezas especiales fuera de la trama de 0,75) restan como mucho 3 puntos en total
  const pen = L.reduce((a, x) => a + (x.nivel === 'info' ? 0 : PESO[x.nivel]), 0) + Math.min(3, L.filter((x) => x.nivel === 'info').length * (PESO.info || 0));
  const score = Math.max(0, Math.min(100, 100 - pen));
  return { lista: L, errores: L.filter((x) => x.nivel === 'error').length, avisos: L.filter((x) => x.nivel === 'aviso').length, puntuacion: score, superficies: S, evidencia: 'concepto' };
}
