// Prompts de render para la IA de imagen. Patrón de las entregas Natura: una captura del 3D como referencia
// geométrica + prompt = base (invariantes numéricos del modelo) + vista. La IA no inventa volumen: lo viste.
import { fmt, H_PLANTA } from './trama.mjs';
import { bbox, bboxPlanta, superficies, vuelos } from './geometria.mjs';
import { rumbo } from './parcela.mjs';
import { describirPropuestaEn } from './cerramientos.mjs';
import { fichaModelo, vistaDe, promptVista, textoFichaEn } from './ficha.mjs'; // v.1.7 · ciclo ficha ↔ prompts: solo funciones en tiempo de llamada

export const MATERIALES = {
  mineral: { n: 'Mineral blanco cálido', en: 'crisp warm-white mineral render walls', color: '#efece4' },
  hormigon: { n: 'Hormigón texturizado', en: 'fine board-marked pale concrete walls', color: '#c9c5b8' },
  madera: { n: 'Lamas de madera', en: 'vertical natural timber cladding with visible grain', color: '#b98e62' },
  cobre: { n: 'Cobre con pátina', en: 'standing-seam copper cladding with soft brown patina', color: '#8a5a3c' },
  tapial: { n: 'Tierra · tapial', en: 'rammed-earth textured walls in warm sand tones', color: '#cdb596' },
  hormigon_blanco: { n: 'Hormigón blanco', en: 'smooth white architectural concrete with fine formwork joints', color: '#ecebe6' },
  hormigon_gris: { n: 'Hormigón gris', en: 'smooth grey architectural concrete with fine formwork joints', color: '#a9a8a2' },
  estuco_rosado: { n: 'Estuco rosado', en: 'soft dusty-pink mineral stucco with a fine hand-trowelled texture', color: '#dcc3b6' },
  chapa: { n: 'Chapa grecada grafito', en: 'graphite corrugated (trapezoidal) metal cladding with crisp vertical ribs', color: '#3d4043' },
  chapa_clara: { n: 'Chapa grecada clara', en: 'light silver-white corrugated metal cladding with vertical ribs', color: '#d9dad6' },
  // colección «Estilos y culturas» (core/culturas.mjs)
  encalado: { n: 'Encalado · cal blanca', en: 'thick hand-applied lime-wash walls in bright soft white, gently uneven with rounded edges', color: '#f4f1ea' },
  adobe: { n: 'Revoco de tierra · adobe', en: 'smooth hand-plastered earth (adobe) walls in warm ochre-pink tones with softly rounded corners', color: '#c49a74' },
  almagra: { n: 'Estuco almagra · rojo pompeyano', en: 'matt lime stucco walls in deep Pompeian red-ochre with a fine trowelled texture', color: '#9e4a35' },
  mamposteria: { n: 'Mampostería de piedra', en: 'rough coursed rubble-stone masonry walls in warm grey-beige limestone with deep shadowed joints', color: '#a39582' },
  ladrillo_rojo: { n: 'Ladrillo rojo visto', en: 'red handmade face brick in running bond with fine light mortar joints', color: '#9c4f3a' },
  ladrillo_gris: { n: 'Ladrillo gris', en: 'blue-grey fired bricks in fine running bond, as in old Beijing hutongs', color: '#7d8083' },
  madera_negra: { n: 'Madera quemada negra', en: 'vertical charred timber cladding (yakisugi) and dark lattice, deep black with a silver sheen', color: '#2c2a27' },
  madera_roja: { n: 'Tabla pintada rojo Falun', en: 'vertical board-and-batten timber cladding painted matt Falu red with white trims', color: '#8b2f23' },
  lacado: { n: 'Panel lacado de color', en: 'glossy lacquered panels in primary red, like oversized toy building blocks', color: '#c23b2c' },
};
export const CARPINTERIAS = {
  oscura: { n: 'Aluminio oscuro', en: 'slender dark anthracite window frames', color: '#2b2c28' },
  clara: { n: 'Aluminio claro', en: 'slender light champagne aluminium window frames', color: '#cfc8b8' },
  madera: { n: 'Madera', en: 'natural oak window frames', color: '#a67c52' },
};

// v.1.7: base y vistas desde la ficha estándar (core/ficha.mjs). Las funciones clásicas quedan como respaldo
// (promptBaseClasico / vistasRenderClasicas) por si la ficha no se puede calcular.
export function promptBase(modelo, propuesta, comp = null) {
  let F; try { F = fichaModelo(modelo, { propuesta, comp }); } catch { return promptBaseClasico(modelo, propuesta); }
  const u = propuesta?.ubicacion; const lugar = u?.municipio ? ` Setting: ${u.municipio}${u.provincia ? ', ' + u.provincia : ''}, Spain${u.entorno ? ' — ' + u.entorno : ''}.` : '';
  const cerca = (() => { const c = describirPropuestaEn(propuesta, modelo); return c ? ' ' + c : ''; })();
  return `Create one premium photorealistic architectural photograph, landscape 16:9, of ONE specific single-family house: the SINGLE house shown in the reference image and described below. The reference is a 3D massing capture from the same camera: keep its camera, volumes, proportions and openings exactly, and turn the simple 3D shapes into believable real materials. ${textoFichaEn(F)} Glass with subtle reflections. Restrained high-end European editorial architecture photography, perspective-correct verticals, believable shadows.${lugar}${cerca} No people, no text, no captions, no labels, no watermark, no sketch lines.`;
}
const ATMOS = {
  ext_01_acceso: 'Soft morning light. Pale stone path, low native planting.',
  ext_02_jardin: 'Golden hour, warm interior light just visible. Natural garden, gravel band along the façade.',
  ext_03_aerea: 'Late afternoon light with long soft shadows; garden, paths and boundary visible.',
  ext_04_noche: 'Blue hour: deep dusk sky, warm light glowing from every window listed, subtle garden lighting. Calm, quiet atmosphere.',
};
export function vistasRender(modelo, propuesta, comp) {
  let F; try { F = fichaModelo(modelo, { propuesta, comp }); } catch { return vistasRenderClasicas(modelo, propuesta, comp); }
  const v = [];
  const ext = (id, std, titulo) => { const x = vistaDe(F, std); if (!x || x.disponible === false) return; const p = promptVista(F, x, { modo: 'referencia' }); v.push({ id, tipo: 'exterior', camara: x.camara.visor || 'aerea', vistaEstandar: x.id, fachadas: x.fachadas, titulo, prompt: `${p.texto} ${ATMOS[id]}`, esperado: p.esperado }); };
  ext('ext_01_acceso', 'llegada', 'Llegar a casa'); ext('ext_02_jardin', 'jardin', 'La vida, hacia fuera'); ext('ext_03_aerea', 'aerea', 'Una casa en su lugar'); ext('ext_04_noche', 'jardin', 'La casa al anochecer');
  const int = (id, clave, cam, titulo, extra) => { const x = vistaDe(F, clave); if (!x || x.tipo !== 'interior') return; const p = promptVista(F, x, { modo: 'referencia' }); v.push({ id, tipo: 'interior', camara: cam, vistaEstandar: x.id, fachadas: x.fachadas, titulo, prompt: `${p.texto} ${extra}`, esperado: p.esperado }); };
  int('int_01_salon', 'salon', 'salon', 'Compartir el día', 'Oak floor, white walls and ceiling, warm neutral sofa, low table, linen curtains, soft daylight. Calm Mediterranean-Nordic atmosphere.');
  int('int_02_cocina', 'cocina', 'cocina', 'Cocinar y conversar', 'Oak-fronted cabinets along the wall, pale stone worktop, simple pendant lights, a dining table in the foreground. Soft daylight.');
  int('int_03_dormitorio', 'dormitorio', 'dormitorio', 'Descanso', 'Oak floor, white walls, timber headboard, linen bedding, two bedside tables. Calm morning light.');
  return v;
}

export function promptBaseClasico(modelo, propuesta) {
  const b = bbox(modelo), S = superficies(modelo), n = modelo.plantas.length;
  const mat = MATERIALES[modelo.acabados?.fachada] || MATERIALES.mineral, car = CARPINTERIAS[modelo.acabados?.carpinteria] || CARPINTERIAS.oscura;
  const plantas = modelo.plantas.map((p, i) => { const q = bboxPlanta(p, true); return `${['ground', 'first', 'second', 'third', 'fourth', 'fifth'][i] || 'upper'} floor about ${fmt(q.w, 1)} m by ${fmt(q.h, 1)} m`; }).join('; ');
  const vuelo = n > 1 ? vuelos(modelo, 1) : { celdas: [] };
  const lugar = propuesta?.ubicacion?.municipio ? ` Setting: ${propuesta.ubicacion.municipio}${propuesta.ubicacion.provincia ? ', ' + propuesta.ubicacion.provincia : ''}, Spain${propuesta.ubicacion.entorno ? ' — ' + propuesta.ubicacion.entorno : ''}.` : '';
  return `Create one premium photorealistic architectural photograph, landscape 16:9, of the SINGLE house shown in the reference image. The reference is geometry and composition guidance: keep its camera, volumes, proportions and openings exactly, and turn the simple 3D shapes into believable real materials. Strict invariants: ${n === 1 ? 'one storey' : n + ' storeys'}, ${fmt(n * H_PLANTA, 1)} m high, overall footprint ${fmt(b.w, 1)} m by ${fmt(b.h, 1)} m; ${plantas}; ${(() => { const c = modelo.cubierta || {}; const t = c.tipo === 'dos aguas' ? 'dos' : c.tipo; if (!t || t === 'plana') return 'flat roof with a narrow metal coping'; const n = { una: 'single-pitch (mono-pitch)', dos: 'gable (two-pitch)', tres: 'three-slope hip', cuatro: 'hipped (four-slope)' }[t]; const mat = { teja: 'ceramic tiles', tegola: 'asphalt shingles', chapa: 'standing-seam corrugated metal' }[c.material] || 'roofing'; const col = { grafito: 'graphite', blanco: 'white', rojo: 'oxide-red', verde: 'green', arena: 'sand-coloured', roja: 'red', mixta: 'mixed terracotta', negra: 'black', pizarra: 'slate-grey', marron: 'brown', gris: 'grey' }[c.color] || ''; return `${n} roof in ${col} ${mat}, about ${c.pendiente || 30} degrees${c.alero ? `, eaves overhang ${c.alero} m` : ''}`; })()}${vuelo.celdas.length ? (Number.isFinite(vuelo.max) ? `; the upper floor cantilevers ${fmt(vuelo.max, 1)} m with NO columns under the overhang` : '; part of the upper floor projects beyond the ground floor') : ''}. Materials: ${mat.en}, ${car.en}, glass with subtle reflections. Keep exact window and door positions and proportions. Do not add floors, wings, pools, columns or extra openings. Modular precast construction on a 0.75 m grid: crisp, precise joints. Restrained high-end European editorial architecture photography, perspective-correct verticals, believable shadows.${lugar}${(() => { const c = describirPropuestaEn(propuesta, modelo); return c ? ' ' + c : ''; })()} No people, no text, no captions, no labels, no watermark, no sketch lines.`;
}

export function vistasRenderClasicas(modelo, propuesta, comprob) {
  const S = superficies(modelo); const or = comprob?.luzSalon ? rumbo(comprob.luzSalon.azimut) : 'S';
  const todas = S.plantas.flatMap((p, pi) => p.estancias.map((e) => ({ ...e, pi })));
  const salon = todas.find((e) => e.tipo === 'salon'); const ppal = todas.find((e) => e.tipo === 'dormitorio_principal') || todas.find((e) => e.tipo === 'dormitorio');
  const alto = (e) => (e && e.pi > 0 ? ` This room is on the ${['ground', 'first', 'second'][e.pi]} floor, about ${e.pi * 3} m above the garden: the view through the window looks down slightly onto the garden and the surroundings.` : '');
  const v = [
    { id: 'ext_01_acceso', tipo: 'exterior', camara: 'acceso', titulo: 'Llegar a casa', prompt: 'Three-quarter view from the street side at eye level, soft morning light. Entrance door in natural timber. Pale stone path, low native planting, one olive tree in the front garden.' },
    { id: 'ext_02_jardin', tipo: 'exterior', camara: 'jardin', titulo: 'La vida, hacia fuera', prompt: `View from the garden towards the living side of the house at golden hour (main glazing faces ${or}). Large glazed openings as in the reference, warm interior light just visible. Natural lawn, gravel band along the facade, two small trees.` },
    { id: 'ext_03_aerea', tipo: 'exterior', camara: 'aerea', titulo: 'Una casa en su lugar', prompt: 'High oblique aerial view showing the whole house on its plot, roof geometry exactly as in the reference, garden, paths and boundary. Late afternoon light with long soft shadows.' },
    { id: 'ext_04_noche', tipo: 'exterior', camara: 'jardin', titulo: 'La casa al anochecer', prompt: 'Same garden view at blue hour: deep dusk sky, warm light glowing from every window, subtle garden lighting along the path. Calm, quiet atmosphere.' },
  ];
  if (salon) v.push({ id: 'int_01_salon', tipo: 'interior', camara: 'salon', titulo: 'Compartir el día', prompt: `Interior of the living space (${fmt(salon.util, 1)} square metres) seen towards the glazing and the garden. Oak floor, white walls and ceiling, warm neutral sofa, low table, linen curtains, soft daylight. Calm Mediterranean-Nordic atmosphere.${alto(salon)}` });
  v.push({ id: 'int_02_cocina', tipo: 'interior', camara: 'cocina', titulo: 'Cocinar y conversar', prompt: 'Kitchen area: oak-fronted cabinets along the wall, pale stone worktop, simple pendant lights, a dining table in the foreground. Soft daylight from the garden side.' });
  if (ppal) v.push({ id: 'int_03_dormitorio', tipo: 'interior', camara: 'dormitorio', titulo: 'Descanso', prompt: `Main bedroom of ${fmt(ppal.util, 1)} square metres: oak floor, white walls, timber headboard, linen bedding, two bedside tables, window as in the reference. Calm morning light.${alto(ppal)}` });
  return v;
}
