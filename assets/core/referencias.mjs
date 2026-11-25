// Referencias de autor: viviendas (y algún edificio de hasta 5 alturas) de los arquitectos de referencia del estudio de
// imagen y de otros maestros, traducidas a la trama del generador. Son INTERPRETACIONES ESQUEMÁTICAS PROPIAS: solo se
// toman las medidas globales publicadas y la organización espacial; no se copian planos, imágenes ni textos.
//
// Cómo se traduce cada obra:
//  · Toda estancia es un rectángulo sobre la malla de 0,375 m (T). Se prioriza la trama constructiva de 0,75 m (TE) y el
//    módulo de 1,50 m: una medida original se lleva al múltiplo de 0,75 más cercano si se desvía ≤ 3,5 %; si no, al
//    múltiplo de 0,375 más cercano (queda como «pieza especial», aviso informativo de la validación).
//  · `referencia.medidas` guarda cada medida original → medida en trama, con su desviación. Se marca COINCIDENCIA cuando
//    la original cae a ±1 cm de un múltiplo de 0,75 (o de 1,50): `coincidencia` = 'exacta' (todas), 'parcial' (alguna)
//    o 'aproximada' (ninguna). `desviacionMax` y `desviacionMedia` en %.
//  · Formas no ortogonales (giros a 45°, octógonos, abanicos) se aproximan con rectángulos y se explica en `notas`.
//  · El generador admite hasta 5 plantas sobre rasante (baja + 4): los edificios se modelan con todas sus alturas
//    (los sótanos no se modelan).
// Evidencia: «concepto». Confianza de las medidas: alta (cota publicada por el autor o un registro oficial), media
// (fuente secundaria coherente) o baja (deducida de la superficie publicada y de la proporción del plano).
import { TE, M, T } from './trama.mjs';
import { TIPOS } from './catalogo.mjs';

const R = (tipo, x, y, w, h, extra) => Object.assign({ tipo, x, y, w, h }, typeof extra === 'string' ? { nombre: extra, nombreFijo: true } : extra || {});
// medida: nombre, valor original (m o m²), valor en el modelo, unidad
const Md = (n, orig, trama, u = 'm') => ({ n, orig, trama, u });

const en = (v, paso) => Math.abs(v / paso - Math.round(v / paso)) < 1e-6;
const r2 = (v) => Math.round(v * 100) / 100;
// superficie de suelo interior del modelo (sin exteriores ni vacíos), para comparar con la publicada
const supInterior = (plantas) => r2(plantas.flat().filter((e) => TIPOS[e.tipo] && !TIPOS[e.tipo].ext && !TIPOS[e.tipo].vacio).reduce((a, e) => a + e.w * e.h, 0));

// Analiza las medidas: desviación por medida, coincidencia con la trama y resumen.
export function analizarTrama(medidas) {
  const lista = medidas.map((m) => {
    const dev = m.orig ? r2(((m.trama - m.orig) / m.orig) * 100) : 0;
    const lineal = m.u === 'm';
    // `deducida: true` (medida lineal deducida de una superficie, no publicada): nunca cuenta como coincidencia
    const coincide = lineal && !m.deducida && [TE, M].some((p) => Math.abs(m.orig - Math.round(m.orig / p) * p) <= 0.01 + 1e-9) && Math.abs(m.trama - m.orig) <= 0.01 + 1e-9;
    const casi = lineal && !coincide && !m.deducida && Math.abs(m.trama - m.orig) <= 0.02 + 1e-9;
    const nivel = !lineal ? null : en(m.trama, M) ? 'módulo 1,50' : en(m.trama, TE) ? 'trama 0,75' : en(m.trama, T) ? 'malla 0,375 (pieza especial)' : 'fuera de trama';
    return Object.assign({}, m, { dev, coincide, casi, nivel });
  });
  const lin = lista.filter((m) => m.u === 'm');
  const n = lin.filter((m) => m.coincide).length;
  const coincidencia = lin.length && n === lin.length ? 'exacta' : n ? 'parcial' : 'aproximada';
  const desviacionMax = r2(Math.max(0, ...lista.map((m) => Math.abs(m.dev))));
  const desviacionMedia = r2(lista.reduce((a, m) => a + Math.abs(m.dev), 0) / (lista.length || 1));
  return { medidas: lista, coincidencia, desviacionMax, desviacionMedia };
}

const f = (v, d = 2) => Number(v).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const signo = (d) => (d > 0 ? '+' : d < 0 ? '−' : '±') + f(Math.abs(d), 1) + ' %';
// Frase de trama que se añade a la descripción
function notaTrama(a) {
  const lin = a.medidas.filter((m) => m.u === 'm');
  const co = lin.filter((m) => m.coincide).map((m) => `${m.n.toLowerCase()} ${f(m.orig)} m`);
  const cab = a.coincidencia === 'exacta' ? `COINCIDENCIA EXACTA CON LA TRAMA: ${co.join(', ')} caen en múltiplos de 0,75 m sin tocar una cota.`
    : a.coincidencia === 'parcial' ? `COINCIDENCIA PARCIAL CON LA TRAMA: ${co.join(', ')} ${co.length > 1 ? 'caen' : 'cae'} exacta${co.length > 1 ? 's' : ''} en la trama de 0,75 m.`
      : 'Llevada a la trama:';
  const resto = a.medidas.filter((m) => !m.coincide).map((m) => `${m.n.toLowerCase()} ${f(m.orig)} → ${f(m.trama)} ${m.u === 'm2' ? 'm²' : 'm'} (${signo(m.dev)})`);
  return `${cab}${resto.length ? (a.coincidencia === 'aproximada' ? ' ' : ' Resto: ') + resto.join(' · ') + '.' : ''} Desviación máxima ${f(a.desviacionMax, 1)} %.`;
}

const DEF = [
  // ------------------------------------------------------------------ Alberto Campo Baeza
  {
    id: 'ref-gaspar', obra: 'Casa Gaspar', arquitecto: 'Alberto Campo Baeza', anio: 1992, lugar: 'Zahora, Vejer de la Frontera (Cádiz)',
    familia: 'natura', perfiles: ['pareja', 'senior'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'mediterraneo', acceso: 'N',
    confianza: 'alta', fuentes: ['https://www.campobaeza.com/?p=121', 'https://arquitecturaviva.com/works/casa-gaspar-vejer-de-la-frontera', 'https://www.metalocus.es/es/noticias/un-clasico-hortus-conclusus-en-una-vivienda-andaluza-casa-gaspar-por-alberto-campo-baeza'],
    desc: 'Hortus conclusus: un cuadrado de 18 × 18 m cerrado por tapias de 3,5 m, partido en tres franjas iguales. Solo la central se cubre; dos muros transversales la dividen en A : 2A : A, con el estar de 9 × 6 en el centro (techo a 4,5 m) abierto a los dos patios por cuatro huecos de 2 × 2 en las esquinas. Dormitorios y servicios en los extremos.',
    notas: 'Las tapias de 3,5 m se representan con celosía de hormigón de 3,5 m de alto en el perímetro de los patios (el original es muro ciego); los cuatro huecos de 2 × 2 m no se fijan (los huecos son automáticos). El estar a 4,5 m de altura queda a la altura de planta del sistema (3,00 m).',
    medidas: [Md('Lado del cuadrado', 18, 18), Md('Franja (un tercio)', 6, 6), Md('Ala de servicio A', 4.5, 4.5), Md('Estar 2A', 9, 9)],
    plantas: [[
      R('patio', 0, 0, 18, 6, { nombre: 'Patio norte · limoneros', nombreFijo: true, celosia: { lados: ['N', 'E', 'O'], altura: 'simple', alto: 3.5, material: 'hormigon' } }),
      R('dormitorio_principal', 0, 6, 4.5, 3.75), R('bano', 0, 9.75, 4.5, 2.25),
      R('salon', 4.5, 6, 9, 6, { nombre: 'Estar · techo a 4,5 m', nombreFijo: true, entrada: true }),
      R('cocina', 13.5, 6, 4.5, 3), R('dormitorio', 13.5, 9, 4.5, 3),
      R('patio', 0, 12, 18, 6, { nombre: 'Patio sur · limoneros', nombreFijo: true, celosia: { lados: ['S', 'E', 'O'], altura: 'simple', alto: 3.5, material: 'hormigon' } }),
    ]],
  },
  {
    id: 'ref-guerrero', obra: 'Casa Guerrero', arquitecto: 'Alberto Campo Baeza', anio: 2005, lugar: 'Vejer de la Frontera (Cádiz)',
    familia: 'natura', perfiles: ['pareja', 'teletrabajo'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'mediterraneo', acceso: 'N',
    confianza: 'alta', fuentes: ['https://arquitecturaviva.com/works/casa-guerrero-', 'https://www.archiweb.cz/en/b/dum-guerrero-casa-guerrero', 'https://minimalissimo.com/articles/guerrero-house'],
    desc: 'Muros de 8 m de alto cierran un rectángulo de 33 × 18 m. La casa es la franja central de 9 × 18; su cuadrado central de 9 × 9 sube hasta los 8 m de las tapias y se abre a dos patios de 12 × 18 con naranjos. Dormitorios en un extremo, cocina y estudio en el otro.',
    notas: 'Las tapias de 8 m se representan con celosía de hormigón de 8 m en el perímetro de los patios (el original es muro ciego). El cuadrado de 9 × 9 se parte en estar (6 × 9) y comedor (3 × 9) abiertos entre sí para no superar la luz modular de 6 m sin jácena. Su altura de 8 m no se representa (una planta de 3,00 m).',
    medidas: [Md('Largo del recinto', 33, 33), Md('Ancho del recinto', 18, 18), Md('Franja de la casa', 9, 9), Md('Cuadrado central', 9, 9), Md('Patio lateral', 12, 12)],
    plantas: [[
      R('patio', 0, 0, 12, 18, { nombre: 'Patio oeste', nombreFijo: true, celosia: { lados: ['N', 'S', 'O'], altura: 'simple', alto: 8, material: 'hormigon' } }),
      R('dormitorio_principal', 12, 0, 4.5, 4.5), R('bano', 16.5, 0, 1.5, 4.5), R('dormitorio', 18, 0, 3, 4.5),
      R('salon', 12, 4.5, 6, 9, { nombre: 'Cuadrado central · estar', nombreFijo: true, entrada: true }), R('comedor', 18, 4.5, 3, 9, 'Cuadrado central · comedor'),
      R('cocina', 12, 13.5, 4.5, 4.5), R('aseo', 16.5, 13.5, 1.5, 4.5), R('despacho', 18, 13.5, 3, 4.5, 'Estudio'),
      R('patio', 21, 0, 12, 18, { nombre: 'Patio este', nombreFijo: true, celosia: { lados: ['N', 'S', 'E'], altura: 'simple', alto: 8, material: 'hormigon' } }),
    ]],
  },
  {
    id: 'ref-asencio', obra: 'Casa Asencio', arquitecto: 'Alberto Campo Baeza', anio: 2001, lugar: 'Chiclana de la Frontera (Cádiz)',
    familia: 'basic', perfiles: ['familia', 'familia_numerosa'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'mediterraneo', acceso: 'N',
    confianza: 'alta', fuentes: ['https://arquitecturaviva.com/obras/casa-asencio-chiclana-de-la-frontera', 'https://campobaeza.com/asencio-house', 'https://afasiaarchzine.com/2015/10/campo-baeza-2'],
    desc: 'Un volumen cúbico de 12 × 12 m cuya planta cuadrada se divide en cuatro partes iguales de 6 × 6, prolongado en planta baja por un porche. Abajo, día y servicio; arriba, la suite y tres dormitorios en torno a un distribuidor.',
    notas: 'Los patios de servicio que prolongan la planta baja se resumen en el porche sur. La superficie publicada (370 m²) incluye porches y patios.',
    medidas: [Md('Lado del cubo', 12, 12), Md('Cuarto de planta', 6, 6)],
    plantas: [[
      R('cocina', 0, 0, 6, 3.75), R('lavadero', 0, 3.75, 3, 2.25), R('aseo', 3, 3.75, 1.5, 2.25), R('despensa', 4.5, 3.75, 1.5, 2.25),
      R('recibidor', 6, 0, 3, 6, 'Vestíbulo'), R('escalera', 9, 0, 3, 3), R('despacho', 9, 3, 3, 3),
      R('salon', 0, 6, 6, 6, { nombre: 'Estar', nombreFijo: true }), R('comedor', 6, 6, 6, 6),
      R('porche', 0, 12, 12, 3),
    ], [
      R('dormitorio_principal', 0, 0, 6, 4.5), R('vestidor', 0, 4.5, 3, 1.5), R('bano', 3, 4.5, 3, 1.5, { suite: true }),
      R('distribuidor', 6, 0, 3, 6), R('escalera', 9, 0, 3, 3), R('bano', 9, 3, 3, 3),
      R('pasillo', 0, 6, 12, 1.5), R('dormitorio', 0, 7.5, 4.5, 4.5), R('dormitorio', 4.5, 7.5, 3.75, 4.5), R('dormitorio', 8.25, 7.5, 3.75, 4.5),
    ]],
  },
  {
    id: 'ref-turegano', obra: 'Casa Turégano', arquitecto: 'Alberto Campo Baeza', anio: 1988, lugar: 'Pozuelo de Alarcón (Madrid)',
    familia: 'myway', perfiles: ['familia', 'teletrabajo'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'bosque', acceso: 'N',
    confianza: 'alta', fuentes: ['https://arquitecturaviva.com/obras/casa-turegano', 'https://www.archweb.com/en/-civilians-architectures/turegano-house/', 'https://bdt.degruyter.com/?p=18776'],
    desc: 'Una «cabaña» blanca cúbica de 10 × 10 × 10 m en media ladera, partida en dos: la mitad norte sirve (escalera, cocina, baños) y la mitad sur es servida, con un espacio en diagonal que une estar, biblioteca y dormitorio a través de una doble altura.',
    notas: 'Tres niveles (semisótano, baja y primera en el original) en las tres plantas del sistema. La altura total queda en 9,00 m (3 × 3,00). Mitades 4,50 (servidora) y 5,25 (servida) para quedar en la trama de 0,75.',
    medidas: [Md('Lado del cubo', 10, 9.75)],
    plantas: [[
      R('recibidor', 0, 0, 2.25, 4.5, 'Entrada'), R('escalera', 2.25, 0, 1.5, 4.5), R('cocina', 3.75, 0, 3.75, 4.5),
      R('aseo', 7.5, 0, 2.25, 2.25), R('despensa', 7.5, 2.25, 2.25, 2.25),
      R('salon', 0, 4.5, 9.75, 5.25, { nombre: 'Estar · comedor', nombreFijo: true }),
    ], [
      R('bano', 0, 0, 2.25, 2.25), R('bano', 0, 2.25, 2.25, 2.25), R('escalera', 2.25, 0, 1.5, 4.5), R('dormitorio', 3.75, 0, 3, 4.5), R('dormitorio', 6.75, 0, 3, 4.5),
      R('pasillo', 0, 4.5, 9.75, 1.5, 'Galería'), R('doble_altura', 0, 6, 6, 3.75, 'Doble altura del estar'), R('despacho', 6, 6, 3.75, 3.75, 'Biblioteca'),
    ], [
      R('bano', 0, 0, 2.25, 4.5), R('escalera', 2.25, 0, 1.5, 4.5), R('vestidor', 3.75, 0, 2.25, 4.5), R('terraza', 6, 0, 3.75, 4.5, 'Terraza de cubierta'),
      R('pasillo', 0, 4.5, 9.75, 1.5), R('dormitorio_principal', 0, 6, 6, 3.75), R('despacho', 6, 6, 3.75, 3.75, 'Estudio alto'),
    ]],
  },
  // ------------------------------------------------------------------ Philip Johnson · Mies van der Rohe
  {
    id: 'ref-glass-house', obra: 'Glass House', arquitecto: 'Philip Johnson', anio: 1949, lugar: 'New Canaan, Connecticut (EE. UU.)',
    familia: 'line', perfiles: ['pareja', 'solo'], acabados: { fachada: 'chapa', carpinteria: 'oscura' }, jardin: 'cesped', acceso: 'N',
    confianza: 'alta', fuentes: ['https://sah-archipedia.org/node/83380', 'https://docomomo-us.org/register/glass-house', 'https://theglasshouse.org/'],
    desc: 'Un prisma de vidrio de 56 × 32 pies (17,07 × 9,75 m) y 10,5 pies de alto, sin más recinto cerrado que el cilindro de ladrillo del baño. Comedor y cocina a un extremo, estar central y dormitorio al otro, separado solo por armarios bajos de nogal.',
    notas: 'El cilindro se aproxima con un baño de 3 × 3 m. Los armarios de nogal (1,80 m de alto) se modelan como vestidor de 1,50 m. La altura libre (3,20 m) queda en la de planta del sistema.',
    medidas: [Md('Largo', 17.069, 17.25), Md('Ancho', 9.754, 9.75)],
    plantas: [[
      R('cocina', 0, 0, 4.5, 2.25), R('comedor', 0, 2.25, 4.5, 7.5),
      R('pasillo', 4.5, 0, 1.5, 3, 'Paso'), R('bano', 6, 0, 3, 3, 'Cilindro de ladrillo · baño'), R('pasillo', 9, 0, 1.5, 3, 'Paso'),
      R('salon', 4.5, 3, 6, 6.75, { nombre: 'Estar', nombreFijo: true, entrada: true }),
      R('vestidor', 10.5, 0, 1.5, 6, 'Armarios de nogal'), R('pasillo', 10.5, 6, 1.5, 3.75, 'Paso'),
      R('dormitorio_principal', 12, 0, 5.25, 9.75, 'Zona de dormir'),
    ]],
  },
  {
    id: 'ref-farnsworth', obra: 'Casa Farnsworth', arquitecto: 'Ludwig Mies van der Rohe', anio: 1951, lugar: 'Plano, Illinois (EE. UU.)',
    familia: 'line', perfiles: ['pareja', 'solo'], acabados: { fachada: 'mineral', carpinteria: 'clara' }, jardin: 'bosque', acceso: 'O',
    confianza: 'media', fuentes: ['https://npgallery.nps.gov/GetAsset/bdafd4cc-bd13-457f-92d5-24df171df7b6', 'https://en.wikipedia.org/wiki/Farnsworth_House', 'https://columbia.edu/cu/gsapp/BT/GATEWAY/FARNSWTH/farnswth.html'],
    desc: 'Losas blancas de acero suspendidas de ocho pilares a 6,60 m, elevadas 1,60 m sobre la crecida del río. Una sola sala de 55 × 28 pies con el núcleo de cocina, baños e instalaciones exento, y un porche de un vano al oeste.',
    notas: 'Largo total de la losa (77 pies) de fuente secundaria. La terraza baja exenta y la elevación de 1,60 m no se modelan. El núcleo se ordena en cocina lineal, dos baños e instalaciones; dormir y estar los separa en el original un armario de teca.',
    medidas: [Md('Largo de losa', 23.47, 23.25), Md('Sala cerrada', 16.764, 16.5), Md('Ancho', 8.534, 8.25), Md('Vano entre pilares', 6.6, 6.75), Md('Porche (un vano)', 6.706, 6.75)],
    plantas: [[
      R('porche', 0, 0, 6.75, 8.25, 'Porche de un vano'),
      R('salon', 6.75, 0, 4.5, 8.25, { nombre: 'Estar', nombreFijo: true, entrada: true }),
      R('cocina', 11.25, 0, 6, 1.5, 'Cocina lineal'), R('bano', 11.25, 1.5, 2.25, 3), R('instalaciones', 13.5, 1.5, 1.5, 3, 'Núcleo · instalaciones'), R('bano', 15, 1.5, 2.25, 3),
      R('comedor', 11.25, 4.5, 6, 3.75, 'Estar junto al hogar'),
      R('dormitorio_principal', 17.25, 0, 6, 8.25, 'Zona de dormir'),
    ]],
  },
  // ------------------------------------------------------------------ Le Corbusier
  {
    id: 'ref-savoye', obra: 'Villa Savoye', arquitecto: 'Le Corbusier y Pierre Jeanneret', anio: 1931, lugar: 'Poissy (Francia)',
    familia: 'myway', perfiles: ['familia', 'familia_numerosa'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.designingbuildings.co.uk/wiki/Villa_Savoye', 'https://en.wikipedia.org/wiki/Villa_Savoye', 'https://uvadoc.uva.es/bitstream/handle/10324/68427/9788413202839.pdf'],
    desc: 'Los cinco puntos: pilotis sobre una retícula de 4,75 m (5 × 5 pilares), planta libre, ventana corrida, fachada libre y cubierta-jardín. Abajo, llegada en coche bajo los pilotis, garaje y servicio; arriba, la vida en torno al jardín suspendido; en cubierta, el solárium. La rampa une los tres niveles.',
    notas: 'La crujía de 4,75 m no cae en la trama de 0,75 (4,50 o 5,25): se lleva a 4,875 (malla de 0,375, pieza especial) y la retícula a 19,50. El vuelo del original (planta alta mayor que la baja) se resuelve con pilotis como porche cubierto y 20 pilares en los nudos. La rampa y la escalera de caracol se resumen en un hueco de escalera; la curva de la planta baja se aproxima con rectángulos.',
    medidas: [Md('Crujía de la retícula', 4.75, 4.875), Md('Lado de la retícula', 19, 19.5)],
    apoyos: [[0, 4.875, 9.75, 14.625, 19.5].flatMap((x) => [0, 4.875, 14.625, 19.5].map((y) => ({ x, y })))],
    plantas: [[
      R('porche', 0, 0, 19.5, 4.875, 'Pilotis · llegada en coche'),
      R('garaje', 0, 4.875, 4.875, 9.75), R('recibidor', 4.875, 4.875, 3.375, 9.75, { nombre: 'Vestíbulo', nombreFijo: true, entrada: true }), R('escalera', 8.25, 4.875, 3, 4.875, 'Rampa · escalera'),
      R('dormitorio', 11.25, 4.875, 4.125, 4.875, 'Servicio'), R('lavadero', 15.375, 4.875, 4.125, 2.25), R('bano', 15.375, 7.125, 4.125, 2.625),
      R('dormitorio', 8.25, 9.75, 4.125, 4.875, 'Chófer'), R('trastero', 12.375, 9.75, 7.125, 4.875),
      R('porche', 0, 14.625, 19.5, 4.875, 'Pilotis'),
    ], [
      R('dormitorio', 0, 0, 4.875, 4.875), R('dormitorio', 4.875, 0, 4.875, 4.875), R('bano', 9.75, 0, 2.25, 4.875), R('dormitorio_principal', 12, 0, 4.5, 4.875), R('bano', 16.5, 0, 3, 4.875, { suite: true, nombre: 'Baño de la suite', nombreFijo: true }),
      R('pasillo', 0, 4.875, 8.25, 1.5, 'Corredor'), R('escalera', 8.25, 4.875, 3, 4.875, 'Rampa · escalera'), R('pasillo', 11.25, 4.875, 8.25, 1.5, 'Corredor'),
      R('cocina', 0, 6.375, 4.875, 3.375), R('despensa', 4.875, 6.375, 3.375, 3.375, 'Office'), R('despacho', 11.25, 6.375, 4.125, 3.375, 'Boudoir'), R('dormitorio', 15.375, 6.375, 4.125, 3.375, 'Invitados'),
      R('salon', 0, 9.75, 9.75, 4.875), R('comedor', 0, 14.625, 9.75, 4.875),
      R('terraza', 9.75, 9.75, 9.75, 9.75, 'Jardín suspendido'),
    ], [
      R('escalera', 8.25, 4.875, 3, 4.875, 'Rampa · escalera'), R('terraza', 11.25, 0, 8.25, 9.75, 'Solárium'),
    ]],
  },
  {
    id: 'ref-le-lac', obra: 'Villa Le Lac (Petite maison)', arquitecto: 'Le Corbusier y Pierre Jeanneret', anio: 1924, lugar: 'Corseaux, lago Lemán (Suiza)',
    familia: 'line', perfiles: ['senior', 'pareja'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.fondationlecorbusier.fr/en/work-architecture/achievements-little-villa-on-the-shores-of-lake-geneva-corseaux-switzerland-1923-1924/', 'https://villalelac.ch/en', 'https://archeyes.com/villa-le-lac-le-corbusiers-lakeside-house-in-corseaux/'],
    desc: 'La casa para sus padres: una barra de una sola crujía de unos 16 × 4 m (64 m²) entre la carretera y el lago, con una ventana de 11 m hacia los Alpes. Entrada, cocina y lavadero, estar con rincón de trabajo y cama de invitados plegable, dormitorio y baño, en fila.',
    notas: 'Largo y ancho globales (16 × 4) deducidos de la superficie publicada y de la «crujía única»; el ancho de 4 m cae entre 3,75 y 4,50, y se lleva a 4,125 (malla de 0,375). La cama de invitados del original es un mueble del estar.',
    medidas: [Md('Largo', 16, 15.75), Md('Ancho (una crujía)', 4, 4.125), Md('Superficie', 64, 0, 'm2')],
    plantas: [[
      R('recibidor', 0, 0, 1.5, 4.125, 'Entrada'), R('cocina', 1.5, 0, 2.25, 2.25), R('lavadero', 1.5, 2.25, 2.25, 1.875),
      R('salon', 3.75, 0, 7.5, 4.125, { nombre: 'Estar · trabajo · invitados', nombreFijo: true }),
      R('dormitorio_principal', 11.25, 0, 3, 4.125, 'Dormitorio'), R('bano', 14.25, 0, 1.5, 2.25, { suite: true }), R('vestidor', 14.25, 2.25, 1.5, 1.875, 'Armario'),
    ]],
  },
  {
    id: 'ref-cabanon', obra: 'Cabanon', arquitecto: 'Le Corbusier', anio: 1952, lugar: 'Roquebrune-Cap-Martin (Francia)',
    familia: 'basic', perfiles: ['solo', 'inversor'], estudio: true, acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'mediterraneo', acceso: 'N',
    cubierta: { tipo: 'una', material: 'chapa', color: 'grafito', pendiente: 10, alero: 0 },
    confianza: 'alta', fuentes: ['https://sites-le-corbusier.org/en/oeuvres/cabanon-de-le-corbusier-roquebrune-cap-martin/', 'https://www.archweb.com/en/-civilians-architectures/cabin-in-cap-martin/', 'https://www.uni-weimar.de/uploads/tx_showcase/barthold_und_grosser.pdf'],
    desc: 'La célula mínima del Modulor: un cuadrado de 3,66 × 3,66 m y 2,26 m de alto, con cama, mesa, lavabo, aseo y almacenaje; cocinaba el restaurante vecino. Fuera, una pequeña terraza junto al algarrobo y el mar.',
    notas: 'Interpretación de casa mínima: dentro del cuadrado se añade un rincón de agua-cocina para que el programa sea completo. Avisos esperados: estar de 8,4 m² y baño de 2,25 m² por debajo de los mínimos recomendados (es una célula de vacaciones). La altura del Modulor (2,26) queda en la de planta (3,00).',
    medidas: [Md('Lado', 3.66, 3.75)],
    plantas: [[
      R('bano', 0, 0, 1.5, 1.5, 'Lavabo · aseo · ducha'), R('cocina', 1.5, 0, 2.25, 1.5, 'Rincón de agua · mesa'),
      R('salon', 0, 1.5, 3.75, 2.25, { nombre: 'Estar · dormir', nombreFijo: true, entrada: true }),
      R('terraza', 0, 3.75, 3.75, 1.5, 'Terraza junto al algarrobo'),
    ]],
  },
  // ------------------------------------------------------------------ Tadao Ando
  {
    id: 'ref-sumiyoshi', obra: 'Casa Azuma (Row House en Sumiyoshi)', arquitecto: 'Tadao Ando', anio: 1976, lugar: 'Sumiyoshi, Osaka (Japón)',
    familia: 'natura', perfiles: ['pareja'], medianeras: ['E', 'O'], acabados: { fachada: 'hormigon', carpinteria: 'oscura' }, jardin: 'sin', acceso: 'N',
    confianza: 'media', fuentes: ['https://arquitecturaviva.com/works/casa-entre-medianeras', 'https://en.wikipedia.org/wiki/Tadao_Ando', 'https://jp.toto.com/gallerma/ex081003/space_e.htm'],
    desc: 'Casa entre medianeras de hormigón visto, ciega a la calle, en tres partes iguales: estar delante, patio descubierto en el centro (un tercio del solar) y comedor-cocina y baño detrás; arriba, dos dormitorios unidos por un puente sobre el patio. Para ir de una pieza a otra hay que salir al patio.',
    notas: 'Cotas globales de uso común (3,30 × 14,10 m); la búsqueda confirma la división en tercios y 64,72 m² construidos. El ancho de 3,30 cae entre 3,00 y 3,75 y se lleva a 3,375 (malla de 0,375). El muro medianero que cierra el patio se representa con celosía de hormigón a doble altura. La escalera y el puente, descubiertos en el original, se modelan como hueco de escalera junto al patio.',
    medidas: [Md('Ancho', 3.3, 3.375), Md('Largo', 14.1, 14.25), Md('Tercio (estar)', 4.7, 4.875), Md('Tercio (patio)', 4.7, 4.5)],
    plantas: [[
      R('salon', 0, 0, 3.375, 4.875, { nombre: 'Estar', nombreFijo: true, entrada: true }),
      R('escalera', 0, 4.875, 1.5, 4.5, 'Escalera del patio'), R('patio', 1.5, 4.875, 1.875, 4.5, { nombre: 'Patio', nombreFijo: true, celosia: { lados: ['E'], altura: 'doble', material: 'hormigon' } }),
      R('cocina', 0, 9.375, 3.375, 2.625, 'Comedor · cocina'), R('bano', 0, 12, 3.375, 2.25),
    ], [
      R('dormitorio_principal', 0, 0, 3.375, 4.875, 'Dormitorio'),
      R('escalera', 0, 4.875, 1.5, 4.5, 'Puente sobre el patio'), R('patio', 1.5, 4.875, 1.875, 4.5, 'Patio'),
      R('dormitorio', 0, 9.375, 3.375, 4.875),
    ]],
  },
  {
    id: 'ref-4x4', obra: 'Casa 4 × 4', arquitecto: 'Tadao Ando', anio: 2003, lugar: 'Tarumi, Kobe (Japón)',
    familia: 'basic', perfiles: ['solo', 'pareja'], acabados: { fachada: 'hormigon', carpinteria: 'oscura' }, jardin: 'sin', acceso: 'N',
    confianza: 'alta', fuentes: ['https://en.wikipedia.org/wiki/4x4_house', 'https://archeyes.com/tadao-andos-4x4-house-in-kobe-a-concrete-tower-house-on-the-hyogo-coast/', 'https://arquitecturaviva.com/obras/casa-4x4-kobe'],
    desc: 'Torre de hormigón de 4 × 4 m y cuatro alturas frente al mar interior de Seto: entrada y baño abajo, dormitorio encima, estudio en el tercer nivel y, en lo alto, el estar-cocina, un cubo desplazado 1 m hacia el mar con una ventana cuadrada al horizonte.',
    notas: 'EDIFICIO DE 4 ALTURAS sobre rasante (más un sótano, que no se modela): se modelan las cuatro plantas. El lado de 4 m cae entre 3,75 y 4,50: se lleva a 4,125 (malla de 0,375). El desplazamiento del cubo alto (1,00 → 1,125) es un vuelo dentro del máximo de 1,50. Aviso esperado: el estar mide 2,25 de ancho junto a la escalera (menos de 3,00 recomendado), como en el original.',
    medidas: [Md('Lado de la torre', 4, 4.125), Md('Desplazamiento del cubo alto', 1, 1.125)],
    plantas: [[
      R('escalera', 0, 0, 1.875, 4.125), R('bano', 1.875, 0, 2.25, 2.25), R('recibidor', 1.875, 2.25, 2.25, 1.875, 'Entrada'),
    ], [
      R('escalera', 0, 0, 1.875, 4.125), R('dormitorio', 1.875, 0, 2.25, 4.125),
    ], [
      R('escalera', 0, 0, 1.875, 4.125), R('despacho', 1.875, 0, 2.25, 4.125, 'Estudio'),
    ], [
      R('escalera', 0, 0, 1.875, 4.125), R('salon', 1.875, 0, 2.25, 5.25, { nombre: 'Estar · cocina · ventana al mar', nombreFijo: true }),
    ]],
  },
  // ------------------------------------------------------------------ Luis Barragán
  {
    id: 'ref-gilardi', obra: 'Casa Gilardi', arquitecto: 'Luis Barragán', anio: 1976, lugar: 'San Miguel Chapultepec, Ciudad de México',
    familia: 'natura', perfiles: ['pareja', 'teletrabajo'], medianeras: ['E', 'O'], acabados: { fachada: 'estuco_rosado', carpinteria: 'madera' }, jardin: 'cesped', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.barragan-foundation.org/works/list/gilardi-house', 'https://www.archdaily.com/1000290', 'https://domusweb.it/en/from-the-archive/2013/03/23/luis-barragan-seclusion-and-serenity.amp.html'],
    desc: 'Solar entre medianeras de 10 × 35 m: casa de tres plantas a la calle, patio con el jacarandá en el centro y, al fondo, el comedor junto a la alberca en un volumen aparte. Un corredor amarillo de luz filtrada los une. Garaje, cocina y servicio abajo; estar y biblioteca en la primera; dos dormitorios con baño arriba.',
    notas: 'Frente de 10 m → 9,75. Fondo del solar 35 m (36 m en otras fuentes): se modelan 30 m construidos y patio; el resto es jardín. La alberca interior del original se dibuja como piscina junto al comedor. Superficie publicada ≈ 430 m² con volúmenes auxiliares (aquí ≈ 260 m² útiles: no se usa como medida).',
    medidas: [Md('Frente del solar', 10, 9.75)],
    plantas: [[
      R('garaje', 0, 0, 3.75, 5.25), R('dormitorio', 0, 5.25, 3.75, 3.75, 'Servicio'),
      R('recibidor', 3.75, 0, 6, 3, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('escalera', 3.75, 3, 1.5, 4.5), R('pasillo', 3.75, 7.5, 1.5, 1.5, 'Paso'),
      R('lavadero', 5.25, 3, 3, 1.5), R('bano', 5.25, 4.5, 3, 1.5, 'Baño de servicio'), R('cocina', 5.25, 6, 3, 3),
      R('pasillo', 8.25, 3, 1.5, 18, 'Corredor amarillo'),
      R('patio', 0, 9, 8.25, 12, 'Patio del jacarandá'),
      R('comedor', 0, 21, 9.75, 4.5, 'Comedor junto a la alberca'), R('piscina', 0, 25.5, 9.75, 4.5, 'Alberca'),
    ], [
      R('salon', 0, 0, 3.75, 9, 'Estar'), R('despacho', 3.75, 0, 6, 3, 'Biblioteca'), R('escalera', 3.75, 3, 1.5, 4.5), R('distribuidor', 5.25, 3, 4.5, 2.25),
      R('aseo', 3.75, 7.5, 1.5, 1.5), R('terraza', 5.25, 5.25, 4.5, 3.75, 'Balcón entre muros'),
    ], [
      R('dormitorio_principal', 0, 0, 3.75, 5.25), R('bano', 0, 5.25, 3.75, 2.25, { suite: true }), R('pasillo', 3.75, 0, 1.5, 3), R('escalera', 3.75, 3, 1.5, 4.5),
      R('dormitorio', 5.25, 0, 4.5, 4.5), R('bano', 5.25, 4.5, 4.5, 2.25),
      R('terraza', 0, 7.5, 3.75, 1.5, 'Balcón al patio'),
    ]],
  },
  // ------------------------------------------------------------------ Charles y Ray Eames
  {
    id: 'ref-eames', obra: 'Casa Eames (Case Study House n.º 8)', arquitecto: 'Charles y Ray Eames', anio: 1949, lugar: 'Pacific Palisades, Los Ángeles (EE. UU.)',
    familia: 'myway', perfiles: ['pareja', 'teletrabajo'], acabados: { fachada: 'chapa', carpinteria: 'oscura' }, jardin: 'bosque', acceso: 'S',
    confianza: 'alta', fuentes: ['https://sah-archipedia.org/buildings/CA-01-037-0071', 'https://npgallery.nps.gov/GetAsset/69014eb9-9eb2-491a-910e-a3e9d3414a58', 'https://www.eamesinstitute.org/stories/case-study-house-8'],
    desc: 'Dos cajas de acero y vidrio de catálogo sobre crujías de 7 pies 4 pulgadas × 20 pies: la vivienda (8 crujías, estar a doble altura y dormitorios en el altillo) y el estudio (5 crujías), separados por un patio de 4 crujías, contra un muro de contención.',
    notas: 'La crujía de 2,235 m queda a 1,5 cm de la trama (2,25): casi coincidente, y por eso toda la casa se cuenta en crujías de 2,25. El ancho de 20 pies (6,10) se lleva a 6,00. El altillo del estudio no se modela (tendría acceso propio): el estudio queda en una planta.',
    medidas: [Md('Crujía', 2.235, 2.25), Md('Ancho', 6.096, 6), Md('Vivienda (8 crujías)', 17.88, 18), Md('Patio (4 crujías)', 8.94, 9), Md('Estudio (5 crujías)', 11.18, 11.25)],
    plantas: [[
      R('porche', 0, 0, 2.25, 6, 'Porche · crujía volada'),
      R('salon', 2.25, 0, 6.75, 6, { nombre: 'Estar · doble altura', nombreFijo: true }),
      R('escalera', 9, 0, 2.25, 3), R('recibidor', 9, 3, 2.25, 3, { nombre: 'Entrada', nombreFijo: true, entrada: true }),
      R('comedor', 11.25, 0, 2.25, 6), R('cocina', 13.5, 0, 2.25, 6), R('lavadero', 15.75, 0, 2.25, 3, 'Servicio'), R('aseo', 15.75, 3, 2.25, 3),
      R('patio', 18, 0, 9, 6, 'Patio entre cajas'),
      R('despacho', 27, 0, 9, 6, 'Estudio · doble altura'), R('aseo', 36, 0, 2.25, 3, 'Aseo del estudio'), R('trastero', 36, 3, 2.25, 3, 'Cuarto oscuro'),
    ], [
      R('doble_altura', 2.25, 0, 6.75, 6, 'Doble altura del estar'),
      R('escalera', 9, 0, 2.25, 3), R('dormitorio_principal', 11.25, 0, 3.75, 3), R('dormitorio', 15, 0, 3, 3),
      R('pasillo', 9, 3, 9, 1.5, 'Galería'),
      R('vestidor', 9, 4.5, 2.25, 1.5, 'Armario'), R('bano', 11.25, 4.5, 2.25, 1.5), R('bano', 13.5, 4.5, 2.25, 1.5), R('vestidor', 15.75, 4.5, 2.25, 1.5, 'Armario'),
    ]],
  },
  // ------------------------------------------------------------------ Kazuo Shinohara
  {
    id: 'ref-casa-blanca', obra: 'Casa en Blanco', arquitecto: 'Kazuo Shinohara', anio: 1966, lugar: 'Suginami, Tokio (Japón)',
    familia: 'myway', perfiles: ['pareja', 'senior'], acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'zen', acceso: 'S',
    cubierta: { tipo: 'cuatro', material: 'teja', color: 'negra', alero: 0.5 },
    confianza: 'media', fuentes: ['https://artscape.jp/artword/6091/', 'https://docomomojapan.com/?p=5333', 'https://data.shinkenchiku.online/en/projects/articles/SK_2025_08_105-2'],
    desc: 'Planta cuadrada de 10 × 10 m bajo una cubierta piramidal, con el pilar central como corazón simbólico. Una línea desplazada del centro separa la gran sala blanca de la franja de dormitorios, cocina y baño.',
    notas: 'Lado de 10 m → 9,75 (trama de 0,75). El pilar central se dibuja como apoyo en el centro del cuadrado.',
    medidas: [Md('Lado', 10, 9.75)],
    apoyos: [[{ x: 4.875, y: 4.875 }]],
    plantas: [[
      R('salon', 0, 0, 6, 9.75, { nombre: 'Sala blanca · pilar central', nombreFijo: true, entrada: true }),
      R('dormitorio_principal', 6, 0, 3.75, 3.75), R('bano', 6, 3.75, 3.75, 1.5), R('cocina', 6, 5.25, 3.75, 2.25), R('dormitorio', 6, 7.5, 3.75, 2.25),
    ]],
  },
  // ------------------------------------------------------------------ Álvaro Siza
  {
    id: 'ref-malagueira', obra: 'Casa patio de la Quinta da Malagueira (tipo A)', arquitecto: 'Álvaro Siza', anio: 1977, lugar: 'Évora (Portugal)',
    familia: 'natura', perfiles: ['familia', 'familia_numerosa'], medianeras: ['E', 'O'], acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'mediterraneo', acceso: 'N',
    confianza: 'media', fuentes: ['https://formaurbislab.fa.ulisboa.pt/the-block-evora', 'https://issuu.com/josephrquan/docs/assig3_final_qdm', 'https://revistas.rcaap.pt/etnografica/article/view/43213'],
    desc: 'Vivienda social evolutiva en hilera sobre parcelas de 8 × 12 m, con tapia de 3,5 m a la calle. En el tipo A el patio va delante: tras él, el estar, la cocina y un dormitorio; arriba, tres dormitorios y el baño. Mil doscientas casas blancas cosidas por un acueducto de instalaciones.',
    notas: 'El fondo de 12 m COINCIDE con la trama. El frente de 8 m cae entre 7,50 y 8,25 y se lleva a 8,25 (+3,1 %). Distribución interior interpretada a partir de la tipología (sin cotas publicadas de cada pieza).',
    medidas: [Md('Frente de parcela', 8, 8.25), Md('Fondo de parcela', 12, 12)],
    plantas: [[
      R('patio', 0, 0, 8.25, 4.5, 'Patio de entrada'),
      R('salon', 0, 4.5, 4.5, 5.25, { nombre: 'Estar', nombreFijo: true, entrada: true }), R('cocina', 4.5, 4.5, 3.75, 3), R('bano', 4.5, 7.5, 2.25, 2.25), R('escalera', 6.75, 7.5, 1.5, 4.5),
      R('dormitorio', 0, 9.75, 6.75, 2.25),
    ], [
      R('dormitorio', 0, 4.5, 3.75, 3), R('dormitorio', 3.75, 4.5, 4.5, 3),
      R('pasillo', 0, 7.5, 6.75, 1.5), R('escalera', 6.75, 7.5, 1.5, 4.5),
      R('dormitorio_principal', 0, 9, 4.5, 3), R('bano', 4.5, 9, 2.25, 3),
    ]],
  },
  // ------------------------------------------------------------------ Jørn Utzon
  {
    id: 'ref-can-lis', obra: 'Can Lis', arquitecto: 'Jørn Utzon', anio: 1972, lugar: 'Portopetro, Mallorca',
    familia: 'line', perfiles: ['pareja', 'senior'], acabados: { fachada: 'tapial', carpinteria: 'madera' }, jardin: 'mediterraneo', acceso: 'N',
    confianza: 'baja', fuentes: ['https://en.wikipedia.org/wiki/Can_Lis', 'https://www.coam.org/media/Default%20Files/fundacion/biblioteca/revista-arquitectura-100/2008-2012/docs/revista-articulos/revista-arquitectura-2009-n355-pag36-41.pdf', 'https://archeyes.com/can-lis-by-jorn-utzon-contextual-architecture-and-spatial-harmony/'],
    desc: 'Cuatro pabellones de marés en fila sobre el acantilado, unidos por muros y patios: cocina, comedor y estudio; la sala con techo de 7 m y cinco grandes huecos al mar; el dormitorio principal; y el pabellón de invitados.',
    notas: 'FORMA NO ORTOGONAL: en el original los pabellones giran levemente en abanico hacia el mar; aquí se alinean. Sin cotas publicadas de cada pabellón: se dimensionan para la superficie publicada (120 m², COAM) en piezas de 0,75. La altura de 7 m de la sala no se representa.',
    medidas: [Md('Superficie construida', 120, 0, 'm2')],
    plantas: [[
      R('cocina', 0, 0, 3, 3), R('despacho', 0, 3, 3, 3, 'Estudio'), R('comedor', 3, 0, 3, 6, { nombre: 'Comedor', nombreFijo: true, entrada: true }),
      R('porche', 6, 0, 3, 3, 'Galería cubierta'), R('patio', 6, 3, 3, 3, 'Patio'),
      R('salon', 9, 0, 6, 6, 'Sala frente al mar'),
      R('porche', 15, 0, 3, 6, 'Patio cubierto'),
      R('dormitorio_principal', 18, 0, 4.5, 3.75), R('bano', 18, 3.75, 2.25, 2.25, { suite: true }), R('vestidor', 20.25, 3.75, 2.25, 2.25),
      R('patio', 22.5, 0, 3, 6, 'Patio de invitados'),
      R('dormitorio', 25.5, 0, 4.5, 3.75, 'Invitados'), R('bano', 25.5, 3.75, 4.5, 2.25),
      R('terraza', 9, 6, 6, 3, 'Terraza sobre el acantilado'),
    ]],
  },
  // ------------------------------------------------------------------ John Lautner
  {
    id: 'ref-chemosphere', obra: 'Chemosphere (Casa Malin)', arquitecto: 'John Lautner', anio: 1960, lugar: 'Hollywood Hills, Los Ángeles (EE. UU.)',
    familia: 'myway', perfiles: ['pareja', 'familia'], acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'bosque', acceso: 'S',
    confianza: 'baja', fuentes: ['https://en.wikipedia.org/wiki/Chemosphere'],
    desc: 'Un octógono de una planta (unos 200 m²) en lo alto de un fuste de hormigón de 1,5 m de diámetro y casi 9 m de alto, en una ladera imposible: dormitorios y baños hacia la montaña y el estar-comedor abierto en abanico a la ciudad.',
    notas: 'FORMA NO ORTOGONAL: el octógono se aproxima con una cruz escalonada (esquinas recortadas 3,75 × 3,75). El ancho (≈ 15,7 m) se DEDUCE de la superficie publicada para un octógono regular. El fuste central se dibuja como apoyo; la cubierta en cúpula rebajada queda plana.',
    medidas: [Md('Ancho del octógono (deducido)', 15.7, 15.75), Md('Superficie', 204, 0, 'm2')],
    apoyos: [[{ x: 7.875, y: 7.875 }]],
    plantas: [[
      R('dormitorio', 3.75, 0, 3.75, 3.75), R('bano', 7.5, 0, 1.5, 3.75), R('dormitorio', 9, 0, 3, 3.75),
      R('dormitorio_principal', 0, 3.75, 3.75, 4.5), R('distribuidor', 3.75, 3.75, 8.25, 1.5), R('bano', 12, 3.75, 3.75, 2.25),
      R('despacho', 0, 8.25, 3.75, 3.75, 'Estudio'),
      R('salon', 3.75, 5.25, 6, 10.5, { nombre: 'Estar en abanico', nombreFijo: true, entrada: true }), R('comedor', 9.75, 5.25, 2.25, 10.5),
      R('cocina', 12, 6, 3.75, 6),
    ]],
  },
  // ------------------------------------------------------------------ Frank Lloyd Wright
  {
    id: 'ref-jacobs', obra: 'Casa Jacobs I (usoniana)', arquitecto: 'Frank Lloyd Wright', anio: 1937, lugar: 'Madison, Wisconsin (EE. UU.)',
    familia: 'line', perfiles: ['familia', 'pareja'], acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'praderia', acceso: 'N',
    cubierta: { tipo: 'plana', alero: 1.25 },
    confianza: 'baja', fuentes: ['https://en.wikipedia.org/wiki/Herbert_and_Katherine_Jacobs_First_House', 'https://sah-archipedia.org/buildings/WI-01-DA38'],
    desc: 'La primera casa usoniana: una L de una planta (144 m²) sobre una retícula de 2 × 4 pies. En el ala de día, el estar con rincón de comer; en el codo, el núcleo de cocina-taller y baño junto a la chimenea; en la otra ala, los dormitorios a lo largo de una galería abierta al jardín. Cubierta plana con grandes aleros y carport.',
    notas: 'SIN COINCIDENCIA: la retícula imperial de 2 × 4 pies (0,61 × 1,22 m) no cae en la de 0,75; las piezas se redimensionan a la trama para la superficie publicada. Alero de 1,25 m (máximo 1,50).',
    medidas: [Md('Módulo de la retícula (4 pies)', 1.219, 1.125), Md('Superficie', 144, 0, 'm2')],
    plantas: [[
      R('salon', 0, 0, 6, 6.75, { nombre: 'Estar', nombreFijo: true }), R('comedor', 6, 0, 3, 3, 'Rincón de comer'), R('cocina', 6, 3, 3, 3.75, 'Cocina-taller · núcleo'),
      R('recibidor', 9, 0, 3.75, 2.25, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('bano', 9, 2.25, 2.25, 4.5),
      R('pasillo', 11.25, 2.25, 1.5, 11.25, 'Galería'),
      R('dormitorio_principal', 12.75, 2.25, 3.75, 4.5), R('dormitorio', 12.75, 6.75, 3.75, 3.75), R('despacho', 12.75, 10.5, 3.75, 3, 'Estudio'),
      R('porche', 12.75, -3, 5.25, 5.25, 'Carport'),
    ]],
  },
  // ------------------------------------------------------------------ Le Corbusier · edificio de 4 niveles
  {
    id: 'ref-garches', obra: 'Villa Stein-de Monzie (Les Terrasses)', arquitecto: 'Le Corbusier y Pierre Jeanneret', anio: 1928, lugar: 'Garches-Vaucresson (Francia)',
    familia: 'myway', perfiles: ['familia_numerosa', 'multigeneracional'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.moma.org/docs/press_archives/4559/releases/MOMA_1970_July-December_0079.pdf', 'https://www.acsa-arch.org/proceedings/Annual%20Meeting%20Proceedings/ACSA.AM.86/ACSA.AM.86.81.pdf', 'https://www.fondationlecorbusier.fr/en/work-architecture/achievements-stein-de-monzie-villa-les-terrasses-france-1926-1928/'],
    desc: 'Tres forjados de hormigón sobre una retícula de pilares a 3,50 m en un sentido y a 5,00 y 2,50 m alternos en el otro (el ritmo A B A B A, 2 : 1 : 2 : 1 : 2). Cuatro niveles: entrada, servicio y garaje abajo; la planta noble con biblioteca, estar, comedor y la terraza suspendida al jardín; los dormitorios encima; y la cubierta-jardín con su pabellón.',
    notas: 'Los vanos de 5,00 y 2,50 no caen en la trama de 0,75: se llevan a 4,875 y 2,625 (malla de 0,375, pieza especial) para que el PAR A + B = 7,50 m COINCIDA EXACTO (5 módulos) y el frente quede en 19,875. La crujía de 3,50 en fondo se lleva a 3,375 y las 4 crujías del fondo (deducidas de la retícula publicada) a 13,50 (9 módulos). La planta noble no se superpone a la terraza suspendida en la segunda (sin apoyo, el vuelo superaría 1,50).',
    medidas: [Md('Vano A', 5, 4.875), Md('Vano B', 2.5, 2.625), Md('Par A + B', 7.5, 7.5), Md('Frente A B A B A', 20, 19.875), Md('Crujía en fondo', 3.5, 3.375), Md('Fondo (4 crujías)', 14, 13.5)],
    plantas: [[
      R('garaje', 0, 0, 4.875, 6.75), R('recibidor', 4.875, 0, 10.125, 3.375, { nombre: 'Vestíbulo', nombreFijo: true, entrada: true }), R('dormitorio', 15, 0, 4.875, 3.375, 'Guarda'),
      R('distribuidor', 4.875, 3.375, 7.5, 3.375), R('escalera', 12.375, 3.375, 2.625, 3.375), R('instalaciones', 15, 3.375, 4.875, 3.375, 'Calderas'),
      R('lavadero', 0, 6.75, 4.875, 3.375), R('trastero', 0, 10.125, 4.875, 3.375),
      R('despacho', 4.875, 6.75, 6, 6.75, 'Sala de juegos'), R('aseo', 10.875, 6.75, 1.5, 3.375), R('trastero', 10.875, 10.125, 1.5, 3.375, 'Bicicletas'),
      R('pasillo', 12.375, 6.75, 1.5, 6.75, 'Paso de servicio'), R('dormitorio', 13.875, 6.75, 6, 3.375, 'Servicio'), R('dormitorio', 13.875, 10.125, 3, 3.375, 'Servicio 2'), R('bano', 16.875, 10.125, 3, 3.375),
    ], [
      R('despacho', 0, 0, 4.875, 6.75, 'Biblioteca'), R('vestidor', 4.875, 0, 2.625, 6.75, 'Guardarropa'), R('distribuidor', 7.5, 0, 4.875, 6.75, 'Vestíbulo alto'),
      R('despensa', 12.375, 0, 2.625, 3.375, 'Office'), R('escalera', 12.375, 3.375, 2.625, 3.375), R('cocina', 15, 0, 4.875, 3.375), R('aseo', 15, 3.375, 2.25, 3.375), R('lavadero', 17.25, 3.375, 2.625, 3.375),
      R('salon', 0, 6.75, 4.875, 6.75, 'Salón'), R('comedor', 4.875, 6.75, 7.5, 3.375), R('salon', 4.875, 10.125, 7.5, 3.375, 'Gran estar'),
      R('terraza', 12.375, 6.75, 7.5, 6.75, 'Terraza suspendida'),
    ], [
      R('dormitorio', 0, 0, 4.875, 5.25), R('bano', 4.875, 0, 2.625, 5.25), R('dormitorio', 7.5, 0, 4.875, 5.25), R('vestidor', 12.375, 0, 2.625, 3.375, 'Armarios'),
      R('dormitorio_principal', 15, 0, 4.875, 4.5), R('bano', 15, 4.5, 4.875, 2.25, { suite: true }),
      R('pasillo', 0, 5.25, 12.375, 1.5, 'Corredor'), R('escalera', 12.375, 3.375, 2.625, 3.375),
      R('dormitorio', 0, 6.75, 4.875, 6.75), R('bano', 4.875, 6.75, 2.625, 3.375), R('vestidor', 4.875, 10.125, 2.625, 3.375, 'Armario'), R('dormitorio', 7.5, 6.75, 4.875, 6.75),
    ], [
      R('terraza', 0, 0, 12.375, 13.5, 'Cubierta-jardín'), R('escalera', 12.375, 3.375, 2.625, 3.375), R('despacho', 15, 0, 4.875, 6.75, 'Pabellón de cubierta'),
    ]],
  },
  // ------------------------------------------------------------------ Louis I. Kahn
  {
    id: 'ref-fisher', obra: 'Casa Fisher', arquitecto: 'Louis I. Kahn', anio: 1967, lugar: 'Hatboro, Pensilvania (EE. UU.)',
    familia: 'myway', perfiles: ['familia', 'teletrabajo'], acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'bosque', acceso: 'N',
    confianza: 'baja', fuentes: ['https://en.wikipedia.org/wiki/Fisher_House_(Hatboro,_Pennsylvania)', 'https://www.architectmagazine.com/design/why-louis-kahns-most-powerful-house-is-also-one-of-his-smallest', 'https://docomomo-us.org/register/fisher-house'],
    desc: 'Dos cubos de ciprés sobre zócalo de piedra (unos 186 m²): el de dormir, cuadrado y de dos plantas (entrada y dormitorio principal abajo, dos dormitorios arriba), y el de vivir, rectangular, con estar, comedor y cocina a doble altura.',
    notas: 'FORMA NO ORTOGONAL: en el original los cubos se tocan girados 45°; aquí se adosan alineados y desplazados. Sin cotas publicadas de los cubos: se dimensionan para la superficie (≈ 2.000 pies²). La doble altura del cubo de vivir se marca sin barandilla (es un volumen, no un altillo).',
    medidas: [Md('Superficie', 186, 0, 'm2')],
    plantas: [[
      R('comedor', 0, 2.25, 3, 3.75), R('cocina', 3, 2.25, 3, 3.75), R('salon', 0, 6, 6, 4.5, 'Estar · doble altura'),
      R('pasillo', 6, 0, 1.5, 8.25, { nombre: 'Pasillo de entrada', nombreFijo: true, entrada: true }), R('escalera', 7.5, 0, 2.25, 3),
      R('bano', 9.75, 0, 2.25, 3, { suite: true }), R('vestidor', 12, 0, 2.25, 3), R('dormitorio_principal', 7.5, 3, 6.75, 5.25),
    ], [
      R('doble_altura', 0, 2.25, 6, 8.25, { nombre: 'Doble altura del cubo de vivir', nombreFijo: true, barandilla: [] }),
      R('vestidor', 6, 0, 1.5, 3, 'Armario'), R('escalera', 7.5, 0, 2.25, 3), R('bano', 9.75, 0, 2.25, 3), R('vestidor', 12, 0, 2.25, 3, 'Armarios'),
      R('pasillo', 6, 3, 8.25, 1.5, 'Galería'), R('dormitorio', 6, 4.5, 4.125, 3.75), R('dormitorio', 10.125, 4.5, 4.125, 3.75),
    ]],
  },
];

// Prepara una lista DEF de referencias (este mismo formato) al formato de core/estandar.mjs: superficie modelada,
// análisis de trama y ficha `referencia`. Lo usan también core/referencias_hist.mjs y core/referencias_act.mjs.
export function prepararReferencias(DEF) {
for (const d of DEF) {
  const sup = supInterior(d.plantas);
  for (const m of d.medidas) if (m.u === 'm2') m.trama = sup;
  d.analisis = analizarTrama(d.medidas);
}

// Formato de entrada de core/estandar.mjs (id, nombre, familia, perfiles, desc, plantas, apoyos…) + `referencia`.
return DEF.map((d) => ({
  id: d.id,
  nombre: `Interpretación: ${d.obra} · ${d.arquitecto}`,
  familia: d.familia, perfiles: d.perfiles, acceso: d.acceso, medianeras: d.medianeras, estudio: d.estudio,
  cubierta: d.cubierta, acabados: d.acabados, jardin: d.jardin, apoyos: d.apoyos,
  derivado: `Referencia de autor · ${d.arquitecto} (${d.anio})`,
  desc: `${d.desc} ${notaTrama(d.analisis)}`,
  plantas: d.plantas,
  referencia: {
    arquitecto: d.arquitecto, obra: d.obra, anio: d.anio, lugar: d.lugar, fuentes: d.fuentes, confianza: d.confianza,
    coincidencia: d.analisis.coincidencia, desviacionMax: d.analisis.desviacionMax, desviacionMedia: d.analisis.desviacionMedia,
    medidas: d.analisis.medidas, notas: d.notas, evidencia: 'concepto', interpretacion: true,
  },
}));
}
export const REFERENCIAS = prepararReferencias(DEF);
