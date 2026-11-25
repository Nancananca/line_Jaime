// Referencias de autor · maestros históricos (antes de 1975). Mismo formato y mismo criterio de traducción a la trama que
// core/referencias.mjs: INTERPRETACIONES ESQUEMÁTICAS PROPIAS (solo medidas globales publicadas y organización espacial; no
// se copian planos, imágenes ni textos). Se prioriza la trama de 0,75 y el módulo de 1,50; lo que se desvía > 3,5 % de un
// múltiplo de 0,75 va a la malla de 0,375 (pieza especial). Formas no ortogonales, sótanos, rampas y alturas especiales se
// explican en `notas`. Hay una sección propia en docs/REFERENCIAS.md. Prueba: test/referencias_hist.test.mjs.
import { prepararReferencias } from './referencias.mjs';

const R = (tipo, x, y, w, h, extra) => Object.assign({ tipo, x, y, w, h }, typeof extra === 'string' ? { nombre: extra, nombreFijo: true } : extra || {});
const Md = (n, orig, trama, u = 'm') => ({ n, orig, trama, u });
const FT = 0.3048; // pie → m
const ft = (p, pulg = 0) => Math.round((p + pulg / 12) * FT * 1000) / 1000;

const DEF = [
  // ------------------------------------------------------------------ Jean Prouvé · industrialización en seco
  {
    id: 'ref-prouve-6x6', obra: 'Maison démontable 6 × 6', arquitecto: 'Jean Prouvé', anio: 1944, lugar: 'Lorena (Francia) · casas para damnificados de la guerra',
    familia: 'basic', perfiles: ['pareja', 'solo', 'inversor'], acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'praderia', acceso: 'N',
    cubierta: { tipo: 'dos', material: 'chapa', color: 'grafito', pendiente: 15, alero: 0.3 },
    confianza: 'alta', fuentes: ['https://www.patrickseguin.com/en/?p=42620', 'https://www.patrickseguin.com/en/?p=39467', 'https://www.patrickseguin.com/en/?p=34508'],
    desc: 'La casa desmontable encargada por el Ministerio de la Reconstrucción: un cuadrado de 6 × 6 m (36 m²) que se monta en un día sobre un pórtico axial de acero plegado que lleva la cumbrera; paneles de madera estandarizados rellenan las fachadas. Una planta: estar a todo el ancho y, detrás, dormitorio, cocina y baño.',
    notas: 'Es el antecedente directo del sistema CUEVA: estructura ligera industrializada y paneles de fachada intercambiables. El original (36 m²) se repartía en tres piezas sin cotas publicadas: la distribución es interpretada. El pórtico axial se dibuja con dos apoyos en el eje de la cumbrera. La variante 6 × 9 (54 m²) se obtiene añadiendo dos módulos de 1,50.',
    medidas: [Md('Lado', 6, 6), Md('Superficie', 36, 0, 'm2')],
    apoyos: [[{ x: 3, y: 0 }, { x: 3, y: 6 }]],
    plantas: [[
      R('salon', 0, 0, 6, 3, { nombre: 'Estar · comedor', nombreFijo: true, entrada: true }),
      R('dormitorio', 0, 3, 3.75, 3), R('cocina', 3.75, 3, 2.25, 1.5), R('bano', 3.75, 4.5, 2.25, 1.5),
    ]],
  },
  {
    id: 'ref-maison-tropicale', obra: 'Maison Tropicale (unidad de vivienda de Brazzaville)', arquitecto: 'Jean Prouvé', anio: 1951, lugar: 'Brazzaville (Congo)',
    familia: 'line', perfiles: ['pareja', 'familia'], acabados: { fachada: 'chapa_clara', carpinteria: 'clara' }, jardin: 'praderia', acceso: 'N',
    cubierta: { tipo: 'dos', material: 'chapa', color: 'blanco', pendiente: 10, alero: 0.75 },
    confianza: 'media', fuentes: ['https://arquitecturaviva.com/works/maison-tropicale-1', 'https://archeyes.com/jean-prouves-maison-tropicale-prefabricated-tropical-homes-in-africa-1949-1951/', 'https://voices.uchicago.edu/expositionsmagazine/2022/02/08/prouves-moving-houses'],
    desc: 'Casa de aluminio que viajó en avión de carga: ninguna pieza pasa de 4 m ni de 100 kg. La unidad de vivienda mide unos 10 × 18 m: un núcleo cerrado bajo una cubierta ventilada doble que vuela sobre dos galerías corridas protegidas por lamas de aluminio, que son el verdadero estar.',
    notas: 'Se modela la unidad de vivienda (10 × 18); la segunda unidad (oficina de 10 × 14) y la pasarela que las une no se modelan, ni los pilotes de acero que la separan del suelo. La retícula del original es de 1 × 1 m (paneles de suelo y techo), que no cae en la de 0,75: las piezas se dimensionan en la trama. Las galerías se modelan como porches de 1,50 m a norte y sur; su fondo no está publicado.',
    medidas: [Md('Largo de la unidad', 18, 18), Md('Ancho de la unidad', 10, 9.75)],
    plantas: [[
      R('porche', 0, 0, 18, 1.5, 'Galería norte · lamas de aluminio'),
      R('dormitorio_principal', 0, 1.5, 4.5, 4.5), R('bano', 0, 6, 2.25, 2.25, { suite: true }), R('vestidor', 2.25, 6, 2.25, 2.25),
      R('pasillo', 4.5, 1.5, 1.5, 6.75, 'Paso'),
      R('salon', 6, 1.5, 6, 4.5, { nombre: 'Estar', nombreFijo: true, entrada: true }), R('cocina', 6, 6, 3, 2.25), R('comedor', 9, 6, 3, 2.25),
      R('pasillo', 12, 1.5, 1.5, 6.75, 'Paso'),
      R('dormitorio', 13.5, 1.5, 4.5, 4.5), R('bano', 13.5, 6, 4.5, 2.25),
      R('porche', 0, 8.25, 18, 1.5, 'Galería sur · lamas de aluminio'),
    ]],
  },
  // ------------------------------------------------------------------ Buckminster Fuller
  {
    id: 'ref-dymaxion', obra: 'Dymaxion House (Wichita House)', arquitecto: 'Richard Buckminster Fuller', anio: 1946, lugar: 'Wichita, Kansas (EE. UU.) · hoy en The Henry Ford, Dearborn',
    familia: 'myway', perfiles: ['pareja', 'familia'], acabados: { fachada: 'chapa_clara', carpinteria: 'clara' }, jardin: 'praderia', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.thehenryford.org/collections/explore/artifact/1012', 'https://www.moma.org/collection/works/82394', 'https://www.thehenryford.org/explore/blog/the-dymaxion-house-a-new-way-of-living'],
    desc: 'Casa de aluminio de fabricación aeronáutica: un disco de 36 pies (10,97 m) de diámetro colgado de un mástil central de acero, con unos 95 m² en una planta. Vestíbulo, estar, dos dormitorios, cocina, lavadero y dos baños «Dymaxion» se reparten en sectores alrededor del mástil.',
    notas: 'FORMA NO ORTOGONAL: el círculo se aproxima con una cruz de 11,25 m (esquinas recortadas de 3,00 × 3,00) y los sectores con rectángulos; los baños y el distribuidor ocupan el centro, junto al mástil (dibujado como apoyo). La cúpula y el ventilador giratorio de cubierta no se representan (cubierta plana). Distribución interpretada.',
    medidas: [Md('Diámetro (36 pies)', ft(36), 11.25), Md('Superficie', 94.6, 0, 'm2')],
    apoyos: [[{ x: 5.625, y: 5.625 }]],
    plantas: [[
      R('lavadero', 3, 0, 1.5, 3), R('recibidor', 4.5, 0, 2.25, 3, { nombre: 'Vestíbulo', nombreFijo: true, entrada: true }), R('cocina', 6.75, 0, 1.5, 3),
      R('dormitorio', 0, 3, 3, 5.25),
      R('bano', 3, 3, 1.5, 3), R('distribuidor', 4.5, 3, 2.25, 3, 'Núcleo · mástil'), R('bano', 6.75, 3, 1.5, 3),
      R('dormitorio_principal', 8.25, 3, 3, 5.25),
      R('salon', 3, 6, 5.25, 5.25, { nombre: 'Estar · sector mayor', nombreFijo: true }),
    ]],
  },
  // ------------------------------------------------------------------ Kocher & Frey
  {
    id: 'ref-aluminaire', obra: 'Aluminaire House', arquitecto: 'A. Lawrence Kocher y Albert Frey', anio: 1931, lugar: 'Nueva York (EE. UU.) · reconstruida en Palm Springs',
    familia: 'myway', perfiles: ['pareja', 'solo'], acabados: { fachada: 'chapa_clara', carpinteria: 'oscura' }, jardin: 'cesped', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.architecturalrecord.com/articles/2962-house-of-light-and-air-seeks-new-home', 'https://en.wikipedia.org/wiki/Aluminaire_House'],
    desc: 'La primera casa de metal ligero de EE. UU., montada en diez días para una exposición: 22 × 28 pies (6,71 × 8,53 m) y tres niveles sobre seis pilares de tubo de aluminio, con paneles de aluminio corrugado de 3 pies y muros de 3 pulgadas. Abajo, pilotis con porche, vestíbulo, calderas y garaje; en medio, el estar a doble altura con cocina, dormitorio y baño; arriba, la biblioteca con lucernario y la terraza-jardín.',
    notas: 'El largo de 8,53 se lleva a 8,25 (−3,3 %, trama de 0,75). El cuarto de ejercicio de la segunda planta se omite (sin cotas). La superficie publicada (≈ 1.200 pies²) no incluye el garaje y no se usa como medida. Avisos esperados: ninguno.',
    medidas: [Md('Ancho (22 pies)', ft(22), 6.75), Md('Largo (28 pies)', ft(28), 8.25)],
    plantas: [[
      R('garaje', 0, 0, 3, 6, 'Garaje pasante'), R('recibidor', 3, 0, 2.25, 3, { nombre: 'Vestíbulo', nombreFijo: true, entrada: true }), R('escalera', 5.25, 0, 1.5, 4.5),
      R('aseo', 3, 3, 2.25, 1.5), R('instalaciones', 3, 4.5, 3.75, 1.5, 'Calderas'),
      R('porche', 0, 6, 6.75, 2.25, 'Porche bajo los pilotis'),
    ], [
      R('dormitorio', 0, 0, 3, 4.5), R('bano', 3, 0, 2.25, 2.25, { suite: true }), R('cocina', 3, 2.25, 2.25, 2.25), R('escalera', 5.25, 0, 1.5, 4.5),
      R('salon', 0, 4.5, 6.75, 3.75, { nombre: 'Estar · comedor · doble altura', nombreFijo: true }),
    ], [
      R('despacho', 0, 0, 3, 4.5, 'Biblioteca · lucernario'), R('aseo', 3, 0, 2.25, 1.5), R('distribuidor', 3, 1.5, 2.25, 3), R('escalera', 5.25, 0, 1.5, 4.5),
      R('doble_altura', 0, 4.5, 4.5, 3.75, 'Doble altura del estar'), R('terraza', 4.5, 4.5, 2.25, 3.75, 'Terraza-jardín'),
    ]],
  },
  // ------------------------------------------------------------------ Adolf Loos
  {
    id: 'ref-steiner', obra: 'Casa Steiner', arquitecto: 'Adolf Loos', anio: 1910, lugar: 'St.-Veit-Gasse, Viena (Austria)',
    familia: 'myway', perfiles: ['familia_numerosa', 'multigeneracional'], acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'cesped', acceso: 'N',
    confianza: 'media', fuentes: ['https://en.wikiarquitectura.com/building/steiner-house/', 'https://www.archiweb.cz/en/b/haus-steiner'],
    desc: 'Un bloque revocado de 14,5 × 13,5 m sin un adorno: hacia la calle, una sola planta bajo la célebre cubierta de chapa en cuarto de círculo que exigía la ordenanza; hacia el jardín, tres plantas de fachada simétrica y cubierta plana. Entrada, cocina y estudio a la calle; estar, comedor y sala de música al jardín; dormitorios encima.',
    notas: 'El fondo de 13,5 m COINCIDE con la trama. Se modelan las dos plantas completas (baja elevada y primera); el semisótano de servicio no se modela, y por eso la superficie queda por debajo de la publicada (410 m² con el semisótano). La bóveda de chapa hacia la calle no se representa (cubierta plana). Distribución interpretada de la descripción.',
    medidas: [Md('Ancho', 14.5, 14.25), Md('Fondo', 13.5, 13.5), Md('Superficie construida', 410, 0, 'm2')],
    plantas: [[
      R('cocina', 0, 0, 4.5, 4.5), R('recibidor', 4.5, 0, 3, 3, { nombre: 'Vestíbulo', nombreFijo: true, entrada: true }), R('aseo', 4.5, 3, 1.5, 1.5), R('vestidor', 6, 3, 1.5, 1.5, 'Guardarropa'),
      R('escalera', 7.5, 0, 2.25, 4.5), R('despacho', 9.75, 0, 4.5, 4.5, 'Estudio'),
      R('distribuidor', 0, 4.5, 14.25, 1.5, 'Hall'),
      R('comedor', 0, 6, 4.5, 7.5), R('salon', 4.5, 6, 5.25, 7.5, { nombre: 'Estar', nombreFijo: true }), R('salon', 9.75, 6, 4.5, 7.5, 'Sala de música'),
    ], [
      R('dormitorio_principal', 0, 0, 4.5, 4.5), R('bano', 4.5, 0, 3, 2.25, { suite: true }), R('vestidor', 4.5, 2.25, 3, 2.25, 'Armarios'),
      R('escalera', 7.5, 0, 2.25, 4.5), R('dormitorio', 9.75, 0, 4.5, 4.5),
      R('distribuidor', 0, 4.5, 14.25, 1.5),
      R('dormitorio', 0, 6, 4.5, 7.5), R('bano', 4.5, 6, 2.25, 3), R('terraza', 4.5, 9, 2.25, 4.5, 'Balcón al jardín'),
      R('dormitorio', 6.75, 6, 3, 7.5), R('dormitorio', 9.75, 6, 4.5, 7.5),
    ]],
  },
  // ------------------------------------------------------------------ Gerrit Rietveld
  {
    id: 'ref-schroder', obra: 'Casa Rietveld Schröder', arquitecto: 'Gerrit Rietveld', anio: 1924, lugar: 'Prins Hendriklaan, Utrecht (Países Bajos)',
    familia: 'myway', perfiles: ['familia', 'teletrabajo'], medianeras: ['E'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped', acceso: 'N',
    confianza: 'media', fuentes: ['https://link.springer.com/article/10.1007/s00004-018-0372-1', 'https://en.wikipedia.org/wiki/Rietveld_Schr%C3%B6der_House'],
    desc: 'Casa De Stijl al final de una hilera, de unos 13 × 8 m y dos plantas. Abajo, en torno a la escalera central, cocina-comedor, estudio, cuarto de servicio y taller; arriba, una sola planta abierta que paneles correderos dividen en estar-comedor, tres dormitorios, baño y aseo. Planos, líneas y colores primarios desmontan la caja.',
    notas: 'Huella (≈ 13 × 8 m) medida a escala sobre los planos publicados (artículo de Nexus Network Journal), aproximada. 13,00 → 12,75 (−1,9 %) y 8,00 → 8,25 (+3,1 %). Los paneles correderos de la planta alta se representan con tabiques fijos (posición de día); los balcones volados no se modelan. Medianera al este.',
    medidas: [Md('Largo', 13, 12.75), Md('Ancho', 8, 8.25)],
    plantas: [[
      R('cocina', 0, 0, 4.5, 3, 'Cocina · comedor'), R('recibidor', 4.5, 0, 2.25, 3, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('escalera', 6.75, 0, 2.25, 3), R('despacho', 9, 0, 3.75, 3, 'Estudio · lectura'),
      R('pasillo', 0, 3, 12.75, 1.5, 'Paso'),
      R('dormitorio', 0, 4.5, 3.75, 3.75, 'Servicio'), R('aseo', 3.75, 4.5, 1.5, 3.75), R('despacho', 5.25, 4.5, 3.75, 3.75, 'Taller'), R('despacho', 9, 4.5, 3.75, 3.75, 'Sala'),
    ], [
      R('salon', 0, 0, 4.5, 8.25, { nombre: 'Estar · comedor · ventana en esquina', nombreFijo: true }),
      R('bano', 4.5, 0, 2.25, 3), R('escalera', 6.75, 0, 2.25, 3), R('dormitorio_principal', 9, 0, 3.75, 3),
      R('pasillo', 4.5, 3, 8.25, 1.5, 'Paso · paneles correderos'),
      R('dormitorio', 4.5, 4.5, 3.75, 3.75), R('aseo', 8.25, 4.5, 1.5, 3.75), R('dormitorio', 9.75, 4.5, 3, 3.75),
    ]],
  },
  // ------------------------------------------------------------------ Walter Gropius
  {
    id: 'ref-gropius', obra: 'Gropius House', arquitecto: 'Walter Gropius', anio: 1938, lugar: 'Lincoln, Massachusetts (EE. UU.)',
    familia: 'line', perfiles: ['familia', 'teletrabajo'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped', acceso: 'N',
    confianza: 'media', fuentes: ['https://en.wikipedia.org/wiki/Gropius_House', 'https://npgallery.nps.gov/NRHP/GetAsset/NHLS/00000709_text'],
    desc: 'La casa del director de la Bauhaus en Nueva Inglaterra: tablas verticales de madera pintadas de blanco, pavés y perfiles de acero sobre una caja de 21¾ × 54⅔ pies (6,63 × 16,66 m) y dos plantas. Abajo, estar al oeste, estudio y comedor en L, hall central, cocina y servicio al este, y un porche con mosquitera al sur; arriba, los dormitorios y una terraza sobre el estar.',
    notas: 'El porche de 11½ × 23 pies se lleva a 3,375 × 7,125 (malla de 0,375). El ligero vuelo de la planta alta al este y la escalera de caracol de la terraza no se modelan. La superficie publicada (≈ 2.300 pies²) incluye el vuelo y el sótano: no se usa como medida.',
    medidas: [Md('Ancho', ft(21, 9), 6.75), Md('Largo', ft(54, 8), 16.5), Md('Estar (ancho)', ft(14, 6), 4.5), Md('Porche (fondo)', ft(11, 6), 3.375), Md('Porche (largo)', ft(23), 7.125)],
    plantas: [[
      R('salon', 0, 0, 4.5, 6.75, { nombre: 'Estar', nombreFijo: true }), R('despacho', 4.5, 0, 3.75, 3, 'Estudio'), R('comedor', 4.5, 3, 3.75, 3.75),
      R('recibidor', 8.25, 0, 1.5, 3, { nombre: 'Hall', nombreFijo: true, entrada: true }), R('escalera', 9.75, 0, 2.25, 3),
      R('cocina', 8.25, 3, 3.75, 3.75), R('dormitorio', 12, 0, 4.5, 3.75, 'Servicio'), R('bano', 12, 3.75, 2.25, 3, { suite: true, nombre: 'Baño de servicio', nombreFijo: true }), R('porche', 14.25, 3.75, 2.25, 3, 'Porche de servicio'),
      R('porche', 4.5, 6.75, 7.125, 3.375, 'Porche con mosquitera'),
    ], [
      R('terraza', 0, 0, 4.5, 6.75, 'Terraza sobre el estar'),
      R('dormitorio_principal', 4.5, 0, 3.75, 3.75), R('vestidor', 4.5, 3.75, 1.5, 3), R('bano', 6, 3.75, 2.25, 3, { suite: true }),
      R('distribuidor', 8.25, 0, 1.5, 6.75, 'Hall alto'), R('escalera', 9.75, 0, 2.25, 3), R('dormitorio', 9.75, 3, 2.25, 3.75, 'Dormitorio de la hija'),
      R('pasillo', 12, 0, 1.5, 6.75), R('dormitorio', 13.5, 0, 3, 3.75, 'Invitados'), R('bano', 13.5, 3.75, 3, 3),
    ]],
  },
  // ------------------------------------------------------------------ Marcel Breuer
  {
    id: 'ref-breuer', obra: 'Casa Breuer en New Canaan (Breuer House II)', arquitecto: 'Marcel Breuer', anio: 1947, lugar: 'New Canaan, Connecticut (EE. UU.)',
    familia: 'myway', perfiles: ['familia', 'pareja'], acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'bosque', acceso: 'O',
    confianza: 'media', fuentes: ['https://en.wikipedia.org/wiki/Marcel_Breuer_House_II'],
    desc: 'Una caja de madera de 74 × 20 pies (22,56 × 6,10 m) en equilibrio sobre un zócalo de hormigón de 54 × 16 pies, con voladizos de unos 10 pies en los testeros. Arriba, la vida: estar al norte junto a la chimenea, comedor y cocina en el centro, pasillo a poniente y dormitorios al sur; abajo, entrada, cuarto infantil, sala de juegos, taller y almacenes.',
    notas: 'Los voladizos de 3,05 m del original (que acabaron colgados de tirantes de acero) superan el vuelo máximo de 1,50 del sistema: se apoyan en tres pilares bajo cada testero. El zócalo (4,88 → 4,875, malla de 0,375) se enrasa con la fachada este, de modo que el vuelo lateral (0,61 + 0,61 en el original) queda todo al oeste (1,125). El porche lateral no se modela.',
    medidas: [Md('Caja · largo (74 pies)', ft(74), 22.5), Md('Caja · ancho (20 pies)', ft(20), 6), Md('Zócalo · largo (54 pies)', ft(54), 16.5), Md('Zócalo · ancho (16 pies)', ft(16), 4.875), Md('Voladizo de testero', ft(10), 3)],
    apoyos: [[0.75, 3, 5.25].flatMap((x) => [0.75, 21.75].map((y) => ({ x, y })))],
    plantas: [[
      R('dormitorio', 1.125, 3, 4.875, 3.75, 'Cuarto infantil'),
      R('recibidor', 1.125, 6.75, 4.875, 3, { nombre: 'Entrada', nombreFijo: true, entrada: true }),
      R('pasillo', 1.125, 9.75, 1.5, 7.5, 'Paso'), R('bano', 2.625, 9.75, 1.875, 2.25), R('trastero', 2.625, 12, 1.875, 2.25, 'Almacén'), R('escalera', 4.5, 9.75, 1.5, 4.5),
      R('despacho', 2.625, 14.25, 3.375, 3, 'Sala de juegos'), R('despacho', 1.125, 17.25, 4.875, 2.25, 'Taller'),
    ], [
      R('salon', 0, 0, 6, 6, { nombre: 'Estar · chimenea', nombreFijo: true }),
      R('pasillo', 0, 6, 1.5, 12.75, 'Pasillo a poniente'), R('comedor', 1.5, 6, 4.5, 3.75), R('cocina', 1.5, 9.75, 3, 3), R('escalera', 4.5, 9.75, 1.5, 4.5),
      R('bano', 1.5, 12.75, 3, 1.5), R('dormitorio', 1.5, 14.25, 4.5, 2.25), R('dormitorio', 1.5, 16.5, 4.5, 2.25),
      R('dormitorio_principal', 0, 18.75, 6, 3.75),
    ]],
  },
  // ------------------------------------------------------------------ Alvar Aalto
  {
    id: 'ref-muuratsalo', obra: 'Casa experimental de Muuratsalo', arquitecto: 'Alvar Aalto', anio: 1953, lugar: 'Isla de Muuratsalo, Jyväskylä (Finlandia)',
    familia: 'natura', perfiles: ['pareja', 'teletrabajo'], acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'bosque', acceso: 'N',
    cubierta: { tipo: 'una', material: 'tegola', color: 'pizarra', pendiente: 15, alero: 0.3 },
    confianza: 'media', fuentes: ['https://es.wikiarquitectura.com/edificio/casa-en-muuratsalo/', 'https://www.alvaraalto.fi/en/architecture/muuratsalo-experimental-house/'],
    desc: 'La casa de verano-laboratorio de Aalto junto al lago: un cuadrado de unos 14 m partido en nueve, del que la casa en L ocupa cinco partes y un patio de 9 × 9 m las otras cuatro, cerrado por muros sueltos de ladrillo con huecos al sur y al oeste. En sus muros y su suelo, 50 paneles de ladrillo y cerámica a prueba; en el centro, el hogar.',
    notas: 'El patio de 9 m COINCIDE con la trama. El lado de 14 → 14,25 deja un ala de 5,25. Los muros del patio se representan con celosía de hormigón en sus lados sur y oeste (el original es ladrillo con grandes huecos). El ala de invitados encadenada al este, la leñera y la sauna no se modelan; el altillo-estudio sobre el estar tampoco (una planta).',
    medidas: [Md('Lado del conjunto', 14, 14.25), Md('Patio', 9, 9)],
    plantas: [[
      R('salon', 0, 0, 6, 5.25, { nombre: 'Estar · hogar · altillo de pintura', nombreFijo: true }), R('comedor', 6, 0, 3, 5.25),
      R('recibidor', 9, 0, 1.5, 3, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('cocina', 10.5, 0, 3.75, 3),
      R('pasillo', 9, 3, 1.5, 11.25, 'Galería al patio'), R('bano', 10.5, 3, 3.75, 2.25),
      R('dormitorio_principal', 10.5, 5.25, 3.75, 3.75), R('dormitorio', 10.5, 9, 3.75, 3), R('bano', 10.5, 12, 3.75, 2.25, 'Baño de invitados'),
      R('patio', 0, 5.25, 9, 9, { nombre: 'Patio de los ensayos', nombreFijo: true, celosia: { lados: ['S', 'O'], altura: 'simple', material: 'hormigon' } }),
    ]],
  },
  // ------------------------------------------------------------------ Paul Rudolph
  {
    id: 'ref-walker', obra: 'Walker Guest House', arquitecto: 'Paul Rudolph', anio: 1952, lugar: 'Sanibel Island, Florida (EE. UU.)',
    familia: 'basic', perfiles: ['pareja', 'solo'], acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'praderia', acceso: 'N',
    confianza: 'alta', fuentes: ['https://paulrudolph.org/project/walker-guest-house', 'https://en.wikipedia.org/wiki/Walker_Guest_House'],
    desc: 'El «cangrejo» de Sanibel: un cuadrado de 24 × 24 pies (53,5 m²) en 3 × 3 crujías de 8 pies, sobre la arena. En cada lado, dos de las tres crujías se cierran con paneles de contrachapado que se abren como alas sobre contrapesos de 77 libras. Media planta es estar-comedor; la otra, el dormitorio y una franja de cocina y baño.',
    notas: 'La crujía de 8 pies (2,44) no cae en la trama: se lleva a 2,25 (−7,7 %) para que el lado, 7,32 → 7,50 (+2,5 %), sea de 10 tramas de 0,75. Los paneles abatibles no se representan (los huecos son automáticos). El baño, único, se usa desde el dormitorio como en el original (es una casa de invitados).',
    medidas: [Md('Lado (24 pies)', ft(24), 7.5), Md('Crujía (8 pies)', ft(8), 2.25), Md('Superficie', 53.5, 0, 'm2')],
    plantas: [[
      R('salon', 0, 0, 7.5, 3.75, { nombre: 'Estar · comedor', nombreFijo: true, entrada: true }),
      R('dormitorio_principal', 0, 3.75, 4.5, 3.75, 'Dormitorio'), R('cocina', 4.5, 3.75, 3, 1.5), R('bano', 4.5, 5.25, 3, 2.25, { suite: true }),
    ]],
  },
  // ------------------------------------------------------------------ Josep Lluís Sert
  {
    id: 'ref-sert', obra: 'Casa Sert en Cambridge', arquitecto: 'Josep Lluís Sert', anio: 1958, lugar: 'Francis Avenue, Cambridge, Massachusetts (EE. UU.)',
    familia: 'natura', perfiles: ['pareja', 'senior'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped', acceso: 'N',
    confianza: 'baja', fuentes: ['https://www.usmodernist.org/sert.htm', 'https://issuu.com/annezhoudesign/docs/finalpaper_annezhou', 'https://themodernhouse.com/journal/house-of-the-day-cambridge-house-by-josep-lluis-sert'],
    desc: 'La casa patio mediterránea trasladada a Nueva Inglaterra: un rectángulo de unos 40 × 100 pies cerrado por muros de ladrillo de 7½ pies hasta los linderos, en una planta, con tres patios que suman más superficie que la casa. El estar con lucernario corrido forma un cuadrado con el patio de entrada; el patio central, de 24 × 24 pies, tiene un cornejo; los dormitorios se abren al patio del fondo.',
    notas: 'Cifras globales de un trabajo académico sobre el proceso de proyecto (Sert hablaba de un rectángulo de 40 × 100 pies que cupiera en un solar tipo de 50 × 100; la parcela real es un trapecio de ≈ 10.000 pies² y la casa tiene ≈ 2.000 pies² interiores): confianza baja. Los muros de los patios se representan con celosía de hormigón de 2,25 m (el original es ladrillo ciego). Distribución interpretada; el mural de Nivola no se representa.',
    medidas: [Md('Ancho (40 pies)', ft(40), 12), Md('Largo (100 pies)', ft(100), 30.75), Md('Patio central (24 pies)', ft(24), 7.5), Md('Superficie interior', 185.8, 0, 'm2')],
    plantas: [[
      R('patio', 0, 0, 12, 4.5, { nombre: 'Patio de entrada', nombreFijo: true, celosia: { lados: ['N', 'E', 'O'], altura: 'simple', alto: 2.25, material: 'hormigon' } }),
      R('salon', 0, 4.5, 7.5, 4.5, { nombre: 'Estar · lucernario corrido', nombreFijo: true }), R('recibidor', 7.5, 4.5, 1.5, 4.5, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('despacho', 9, 4.5, 3, 4.5, 'Estudio'),
      R('comedor', 0, 9, 4.5, 3), R('cocina', 4.5, 9, 3, 3),
      R('pasillo', 7.5, 9, 1.5, 15, 'Galería'), R('aseo', 9, 9, 3, 1.5), R('lavadero', 9, 10.5, 3, 1.5),
      R('patio', 0, 12, 7.5, 7.5, { nombre: 'Patio del cornejo', nombreFijo: true, celosia: { lados: ['O'], altura: 'simple', alto: 2.25, material: 'hormigon' } }),
      R('bano', 9, 12, 3, 2.25, { suite: true }), R('dormitorio', 9, 14.25, 3, 5.25),
      R('dormitorio_principal', 0, 19.5, 7.5, 4.5), R('bano', 9, 19.5, 3, 2.25), R('vestidor', 9, 21.75, 3, 2.25),
      R('patio', 0, 24, 12, 6.75, { nombre: 'Patio de los dormitorios', nombreFijo: true, celosia: { lados: ['S', 'E', 'O'], altura: 'simple', alto: 2.25, material: 'hormigon' } }),
    ]],
  },
  // ------------------------------------------------------------------ Pierre Koenig
  {
    id: 'ref-stahl', obra: 'Stahl House (Case Study House n.º 22)', arquitecto: 'Pierre Koenig', anio: 1960, lugar: 'Hollywood Hills, Los Ángeles (EE. UU.)',
    familia: 'line', perfiles: ['pareja', 'familia'], acabados: { fachada: 'chapa', carpinteria: 'oscura' }, jardin: 'mediterraneo', acceso: 'N',
    cubierta: { tipo: 'plana', alero: 1.5 },
    confianza: 'media', fuentes: ['https://en.wikipedia.org/wiki/Stahl_House', 'https://archeyes.com/the-stahl-house-by-pierre-koenig-case-study-house-22/', 'https://npgallery.nps.gov/GetAsset/5655dcf7-8f1d-4255-aeeb-571aa646c512'],
    desc: 'Acero y vidrio sobre el vacío de Los Ángeles: una L de una planta (≈ 2.250 pies²) en módulos de 20 × 20 pies entre pilares de acero, con cubierta de chapa plegada que vuela como alero. El ala de día (estar, comedor, cocina) mira a la ciudad; el ala de dormitorios cierra la L hacia el carport; la piscina ocupa el ángulo.',
    notas: 'El módulo de 20 pies (6,10) se lleva a 6,00 (−1,6 %): toda la L se cuenta en módulos de 6 × 6. El vuelo del estar sobre el barranco no se modela; el alero de 7–8 pies se limita a 1,50 (máximo del sistema). Se añade una galería de 1,50 a lo largo de los dormitorios (el original no tiene pasillos: se cruza por los cuartos).',
    medidas: [Md('Módulo (20 pies)', ft(20), 6), Md('Superficie', 209, 0, 'm2')],
    plantas: [[
      R('porche', 0, 0, 6, 6, 'Carport'),
      R('dormitorio', 0, 6, 4.5, 4.5, 'Dormitorio infantil'), R('dormitorio_principal', 0, 10.5, 4.5, 4.5), R('bano', 0, 15, 4.5, 3, 'Baño principal'),
      R('pasillo', 4.5, 6, 1.5, 12, { nombre: 'Galería a la piscina', nombreFijo: true, entrada: true }),
      R('cocina', 0, 18, 6, 3), R('lavadero', 0, 21, 3, 3, 'Servicio'), R('aseo', 3, 21, 3, 3),
      R('comedor', 6, 18, 6, 6), R('salon', 12, 18, 12, 6, { nombre: 'Estar · mirador sobre la ciudad', nombreFijo: true }),
      R('piscina', 6, 12, 7.5, 6), R('terraza', 13.5, 12, 10.5, 6, 'Terraza mirador'),
    ]],
  },
  // ------------------------------------------------------------------ Kiyonori Kikutake
  {
    id: 'ref-sky-house', obra: 'Sky House', arquitecto: 'Kiyonori Kikutake', anio: 1958, lugar: 'Bunkyō, Tokio (Japón)',
    familia: 'myway', perfiles: ['pareja'], acabados: { fachada: 'hormigon', carpinteria: 'madera' }, jardin: 'zen', acceso: 'N',
    cubierta: { tipo: 'cuatro', material: 'tegola', color: 'pizarra', pendiente: 20, alero: 0.75 },
    confianza: 'media', fuentes: ['https://ja.wikipedia.org/wiki/%E3%82%B9%E3%82%AB%E3%82%A4%E3%83%8F%E3%82%A6%E3%82%B9', 'https://archeyes.com/sky-house-kiyonori-kikutake/', 'https://docomomojapan.com/?p=5303'],
    desc: 'Manifiesto metabolista: una plataforma de 10 × 10 m levantada unos 5 m sobre cuatro muros-pilar de hormigón, uno en el centro de cada lado, con las esquinas libres y una cubierta de paraboloides hiperbólicos. Dentro, una sola sala rodeada por un corredor-engawa, con la cocina, el baño y los armarios como «movenettes» enchufables en el perímetro.',
    notas: 'El lado de 10 → 9,75. La planta alta descansa sobre el porche de pilotis de la baja (el jardín bajo la casa) y los cuatro muros-pilar se dibujan como apoyos; el vestíbulo y el aseo de la baja corresponden al cierre posterior. El engawa se modela en los lados norte y oeste (la sala toma de él la luz), y la zona de dormir, separada por cortinas en el original, se marca como dormitorio. Las cápsulas colgadas después bajo la losa no se modelan.',
    medidas: [Md('Lado de la plataforma', 10, 9.75)],
    apoyos: [[{ x: 4.875, y: 0 }, { x: 0, y: 4.875 }, { x: 9.75, y: 4.875 }, { x: 4.875, y: 9.75 }]],
    plantas: [[
      R('porche', 0, 0, 9.75, 5.25, 'Pilotis · jardín bajo la casa'),
      R('escalera', 0, 5.25, 1.5, 4.5), R('recibidor', 1.5, 5.25, 3, 4.5, { nombre: 'Vestíbulo', nombreFijo: true, entrada: true }), R('aseo', 4.5, 5.25, 1.5, 4.5),
      R('porche', 6, 5.25, 3.75, 4.5, 'Pilotis'),
    ], [
      R('pasillo', 0, 0, 9.75, 1.5, 'Engawa'), R('pasillo', 0, 1.5, 1.5, 3.75, 'Engawa'), R('escalera', 0, 5.25, 1.5, 4.5),
      R('salon', 1.5, 1.5, 6, 4.5, { nombre: 'Sala única', nombreFijo: true }), R('dormitorio_principal', 1.5, 6, 6, 3.75, 'Zona de dormir · cortinas'),
      R('cocina', 7.5, 1.5, 2.25, 3, 'Movenette · cocina'), R('bano', 7.5, 4.5, 2.25, 2.25, 'Movenette · baño'), R('vestidor', 7.5, 6.75, 2.25, 3, 'Movenette · armario'),
    ]],
  },
  // ------------------------------------------------------------------ Walter Segal
  {
    id: 'ref-segal', obra: 'Little House in the Garden (casa de Highgate)', arquitecto: 'Walter Segal', anio: 1963, lugar: 'Highgate, Londres (Reino Unido)',
    familia: 'basic', perfiles: ['familia', 'pareja'], acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'bosque', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.themodernhouse.com/journal/architect-walter-segal-self-build/', 'https://tftk.iau.usp.br/wp-content/uploads/tainacan-items/34365/35208/PSS_BOOKLET-HUGH_web-R02_compressed.pdf'],
    desc: 'La casa provisional que dio origen al método Segal de autoconstrucción: 715 pies² (66,4 m²) casi cuadrados, montados en dos semanas con piezas de catálogo sin cortar —tableros de virutas de 2 pies, montantes de 4 × 2 pulgadas— sobre 20 postes que apoyan en losetas sobre arena, sin cimentación. El estar en el centro y los cuartos abiertos a él por tres lados.',
    notas: 'Superficie publicada; el lado (≈ 8,15 m) se DEDUCE de ella para una planta casi cuadrada y se lleva a 8,25. La retícula «tartán» de 600 + 50 mm no cae en la de 0,75 (afín en espíritu: todo se dimensiona por piezas enteras). Del programa original (cuatro dormitorios, estudio, baño, aseo y cocina en 66 m²) se dejan tres dormitorios para respetar los mínimos; el estar central toma la luz del vestíbulo y la cocina a los que se abre.',
    medidas: [Md('Lado (deducido)', 8.15, 8.25), Md('Superficie (715 pies²)', 66.4, 0, 'm2')],
    plantas: [[
      R('dormitorio_principal', 0, 0, 3.75, 3), R('dormitorio', 3.75, 0, 3, 3), R('bano', 6.75, 0, 1.5, 3),
      R('aseo', 0, 3, 1.5, 3, 'WC'), R('salon', 1.5, 3, 6.75, 3, { nombre: 'Estar central', nombreFijo: true }),
      R('cocina', 0, 6, 3, 2.25), R('recibidor', 3, 6, 1.5, 2.25, { nombre: 'Vestíbulo', nombreFijo: true, entrada: true }), R('dormitorio', 4.5, 6, 3.75, 2.25),
    ]],
  },
  // ------------------------------------------------------------------ Robert Venturi
  {
    id: 'ref-vanna-venturi', obra: 'Casa Vanna Venturi', arquitecto: 'Robert Venturi', anio: 1964, lugar: 'Chestnut Hill, Filadelfia (EE. UU.)',
    familia: 'myway', perfiles: ['senior', 'pareja'], acabados: { fachada: 'mineral', carpinteria: 'clara' }, jardin: 'cesped', acceso: 'N',
    cubierta: { tipo: 'dos', material: 'tegola', color: 'pizarra', pendiente: 35, alero: 0.3 },
    confianza: 'baja', fuentes: ['https://en.wikipedia.org/wiki/Vanna_Venturi_House', 'https://www.phila.gov/media/20211214082052/8330-Millman-St.pdf'],
    desc: 'La casa de la madre de Venturi, manifiesto de «complejidad y contradicción»: una fachada-frontón partido de unos 58 pies con un arco aplicado, sobre una planta de unos 1.800 pies². En la baja, estar-comedor, dormitorio principal, cuarto de la cuidadora, cocina y baño en torno a un núcleo descentrado de escalera y chimenea; arriba, bajo la cubierta, un estudio-dormitorio con ventana termal y balcón.',
    notas: 'Frente (58′3″ = 17,75 m) leído en un esquema del expediente municipal: se lleva a 18,00. El fondo no está publicado: se fija en 8,25 para la superficie. La escalera que se estrecha junto a la chimenea se resume en un hueco recto. Superficie del modelo por encima de la publicada (+7 %): la planta alta se dibuja completa hasta la escalera.',
    medidas: [Md('Frente (58 pies 3 pulg.)', ft(58, 3), 18), Md('Superficie', 167.2, 0, 'm2')],
    plantas: [[
      R('salon', 0, 0, 7.5, 4.5, { nombre: 'Estar', nombreFijo: true }), R('recibidor', 7.5, 0, 3, 4.5, { nombre: 'Entrada bajo el frontón', nombreFijo: true, entrada: true }), R('escalera', 10.5, 0, 1.5, 4.5, 'Escalera · chimenea'),
      R('dormitorio_principal', 12, 0, 4.5, 4.5), R('vestidor', 16.5, 0, 1.5, 4.5),
      R('comedor', 0, 4.5, 4.5, 3.75), R('cocina', 4.5, 4.5, 3, 3.75),
      R('pasillo', 7.5, 4.5, 10.5, 1.5), R('bano', 7.5, 6, 3, 2.25), R('dormitorio', 10.5, 6, 3.75, 2.25, 'Cuidadora'), R('lavadero', 14.25, 6, 3.75, 2.25),
    ], [
      R('dormitorio', 6, 0, 4.5, 4.5, 'Estudio-dormitorio · ventana termal'), R('escalera', 10.5, 0, 1.5, 4.5, 'Escalera · chimenea'), R('aseo', 12, 0, 1.5, 2.25, 'Aseo del rellano'),
      R('terraza', 6, 4.5, 6, 1.5, 'Balcón'),
    ]],
  },
  // ------------------------------------------------------------------ Paulo Mendes da Rocha
  {
    id: 'ref-butanta', obra: 'Casa Butantã (casa del arquitecto)', arquitecto: 'Paulo Mendes da Rocha', anio: 1966, lugar: 'Butantã, São Paulo (Brasil)',
    familia: 'myway', perfiles: ['familia', 'teletrabajo'], acabados: { fachada: 'hormigon', carpinteria: 'madera' }, jardin: 'bosque', acceso: 'N',
    confianza: 'baja', fuentes: ['https://archeyes.com/es/casa-mendes-da-rocha-manifiesto-brutalista-sao-paulo/', 'https://themodernhouse.com/journal/house-of-the-day-casa-butanta-paulo-mendes-da-rocha'],
    desc: 'Manifiesto brutalista: una losa de hormigón visto casi cuadrada (≈ 200 m²) levantada sobre solo cuatro pilares, con el jardín pasando por debajo. Arriba, estar, comedor y cocina forman un espacio continuo; los dormitorios, en el centro, se iluminan por lucernarios. Su gemela, la casa Mariante, está al lado.',
    notas: 'Solo hay superficie y proporción: el lado (≈ 14,1 m) se DEDUCE para una losa cuadrada de 200 m² y se lleva a 14,25. Los dormitorios centrales con lucernario no son posibles en el sistema (las piezas vivideras necesitan fachada): se pasan a la fachada sur, sobre una terraza-jardín. La baja es pilotis (porche) con vestíbulo, escalera y aseo; los cuatro pilares se dibujan como apoyos.',
    medidas: [Md('Lado de la losa (deducido)', 14.14, 14.25), Md('Superficie', 200, 0, 'm2')],
    apoyos: [[{ x: 3, y: 0 }, { x: 11.25, y: 0 }, { x: 3, y: 14.25 }, { x: 11.25, y: 14.25 }]],
    plantas: [[
      R('porche', 0, 0, 6, 14.25, 'Jardín bajo la losa'),
      R('recibidor', 6, 0, 2.25, 3, { nombre: 'Vestíbulo', nombreFijo: true, entrada: true }), R('escalera', 6, 3, 2.25, 3), R('aseo', 6, 6, 2.25, 1.5),
      R('porche', 6, 7.5, 2.25, 6.75, 'Pilotis'), R('porche', 8.25, 0, 6, 14.25, 'Jardín bajo la losa'),
    ], [
      R('salon', 0, 0, 6, 6, { nombre: 'Estar', nombreFijo: true }), R('comedor', 6, 0, 4.5, 3), R('escalera', 6, 3, 2.25, 3), R('aseo', 8.25, 3, 2.25, 3),
      R('cocina', 10.5, 0, 3.75, 3.75), R('lavadero', 10.5, 3.75, 3.75, 2.25),
      R('pasillo', 0, 6, 14.25, 1.5, 'Paso'),
      R('dormitorio_principal', 0, 7.5, 4.5, 4.5), R('bano', 4.5, 7.5, 2.25, 4.5), R('dormitorio', 6.75, 7.5, 3.75, 4.5), R('dormitorio', 10.5, 7.5, 3.75, 4.5),
      R('terraza', 0, 12, 14.25, 2.25, 'Terraza-jardín'),
    ]],
  },
  // ------------------------------------------------------------------ Frank Lloyd Wright
  {
    id: 'ref-robie', obra: 'Casa Robie', arquitecto: 'Frank Lloyd Wright', anio: 1910, lugar: 'Hyde Park, Chicago (EE. UU.)',
    familia: 'line', perfiles: ['familia_numerosa', 'multigeneracional'], acabados: { fachada: 'tapial', carpinteria: 'madera' }, jardin: 'praderia', acceso: 'O',
    cubierta: { tipo: 'cuatro', material: 'teja', color: 'roja', pendiente: 15, alero: 1.5 },
    confianza: 'media', fuentes: ['https://en.wikipedia.org/wiki/Frederick_C._Robie_House', 'https://franklloydwrightsites.com/robiehouse/', 'https://www.getty.edu/foundation/pdfs/kim/robie_house_franklloydwright_cmp.pdf'],
    desc: 'La casa de la pradera por excelencia: unos 60 × 155 pies (18,3 × 47,2 m) de ladrillo romano bajo cubiertas a cuatro aguas que vuelan sobre vigas de acero. Dos cuerpos desplazados: al sur, los espacios comunes (billar y juegos abajo; estar y comedor separados solo por la chimenea arriba, con balcón corrido y porche volado al oeste); al norte, el servicio y el garaje. Tres dormitorios en la tercera planta, sobre el núcleo.',
    notas: 'Se toma la huella global; los dos cuerpos se interpretan con fondos de 6 m. El garaje para tres coches queda al este, separado por un patio de servicio. El cuarto de servicio sobre el garaje no se modela (no tiene escalera propia en el modelo). Alero limitado a 1,50 m (en el original llega a unos 6 m en el porche oeste). Superficie publicada (≈ 9.000 pies²) con sótano, porches y muros: no se usa como medida.',
    medidas: [Md('Ancho (60 pies)', ft(60), 18), Md('Largo (154 pies 9 pulg.)', ft(154, 9), 47.25)],
    plantas: [[
      R('patio', 0, 0, 12, 6, 'Patio de entrada · muro bajo'),
      R('recibidor', 12, 0, 3, 6, { nombre: 'Vestíbulo', nombreFijo: true, entrada: true }), R('escalera', 15, 0, 3, 3), R('despacho', 18, 0, 6, 3, 'Taller'),
      R('pasillo', 15, 3, 9, 1.5, 'Paso de servicio'), R('aseo', 15, 4.5, 1.5, 1.5), R('instalaciones', 16.5, 4.5, 3, 1.5, 'Calderas'), R('lavadero', 19.5, 4.5, 4.5, 1.5),
      R('patio', 24, 0, 11.25, 6, 'Patio de servicio'), R('garaje', 35.25, 0, 12, 6, 'Garaje · tres coches'),
      R('porche', 0, 6, 3, 6, 'Pórtico bajo el porche oeste'), R('despacho', 3, 6, 9, 6, 'Billar'), R('distribuidor', 12, 6, 3, 6, 'Hall bajo'), R('despacho', 15, 6, 6, 6, 'Sala de juegos'), R('porche', 21, 6, 3, 6, 'Pórtico este'),
      R('terraza', 3, 12, 30, 6, 'Terraza del jardín · muro bajo'),
    ], [
      R('dormitorio', 12, 0, 3, 3, 'Invitados'), R('escalera', 15, 0, 3, 3), R('cocina', 18, 0, 6, 3),
      R('pasillo', 12, 3, 12, 1.5), R('bano', 12, 4.5, 3, 1.5), R('pasillo', 15, 4.5, 3, 1.5), R('despensa', 18, 4.5, 6, 1.5, 'Office'),
      R('porche', 0, 6, 3, 6, 'Porche oeste en voladizo'), R('salon', 3, 6, 12, 6, { nombre: 'Estar', nombreFijo: true }), R('pasillo', 15, 6, 3, 6, 'Paso junto a la chimenea'), R('comedor', 18, 6, 6, 6),
      R('terraza', 3, 12, 18, 1.5, 'Balcón corrido al sur'),
    ], [
      R('dormitorio', 12, 0, 3, 3), R('escalera', 15, 0, 3, 3), R('bano', 18, 0, 3, 3), R('dormitorio', 21, 0, 3, 3),
      R('pasillo', 12, 3, 12, 1.5),
      R('dormitorio_principal', 12, 4.5, 6, 4.5), R('bano', 18, 4.5, 3, 2.25, { suite: true }), R('vestidor', 18, 6.75, 3, 2.25), R('terraza', 21, 4.5, 3, 4.5, 'Terraza'),
    ]],
  },
  // ------------------------------------------------------------------ Arne Jacobsen
  {
    id: 'ref-kubeflex', obra: 'Kubeflex', arquitecto: 'Arne Jacobsen', anio: 1970, lugar: 'Orø (Dinamarca) · hoy en el museo Trapholt, Kolding',
    familia: 'basic', perfiles: ['pareja', 'solo', 'inversor'], acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'praderia', acceso: 'N',
    confianza: 'alta', fuentes: ['https://arnejacobsen.com/kubeflex/'],
    desc: 'Casa de vacaciones por módulos cúbicos de 3,36 × 3,36 m (unos 10 m²), el mayor tamaño que cabía en un camión: un módulo de estar, uno de cocina, uno de baño y uno de dormitorio se combinan libremente y crecen con la familia. Madera, grandes correderas de vidrio y una plataforma de madera.',
    notas: 'El módulo de 3,36 m queda a 1,5 cm de 3,375 (9 tramas de 0,375): CASI coincidente, y toda la casa se cuenta en módulos de 3,375 (pieza especial: no cae en 0,75). Se modela una combinación de cuatro módulos en fila con la plataforma al sur; el módulo de baño se reparte en entrada y baño. Las patas de apoyo no se modelan.',
    medidas: [Md('Módulo', 3.36, 3.375)],
    plantas: [[
      R('salon', 0, 0, 3.375, 3.375, { nombre: 'Módulo de estar', nombreFijo: true }), R('cocina', 3.375, 0, 3.375, 3.375, 'Módulo de cocina'),
      R('recibidor', 6.75, 0, 3.375, 1.5, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('bano', 6.75, 1.5, 3.375, 1.875, 'Módulo de baño'),
      R('dormitorio_principal', 10.125, 0, 3.375, 3.375, 'Módulo de dormir'),
      R('terraza', 0, 3.375, 6.75, 3.375, 'Plataforma de madera'),
    ]],
  },
  // ------------------------------------------------------------------ Craig Ellwood
  {
    id: 'ref-csh16', obra: 'Case Study House n.º 16', arquitecto: 'Craig Ellwood', anio: 1953, lugar: 'Bel Air, Los Ángeles (EE. UU.)',
    familia: 'line', perfiles: ['pareja', 'teletrabajo'], acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'mediterraneo', acceso: 'N',
    confianza: 'alta', fuentes: ['https://npgallery.nps.gov/GetAsset/5655dcf7-8f1d-4255-aeeb-571aa646c512', 'https://en.wikipedia.org/wiki/Case_Study_Houses'],
    desc: 'Pórtico de acero visto de 28 × 56 pies sobre un módulo de 4 pies (7 × 14 módulos), con paneles flotantes intercambiables de vidrio, madera y ladrillo. A la calle, un frente de vidrio translúcido cierra los patios de los dormitorios; al sur, el estar acristalado sobre la terraza mirador.',
    notas: 'El módulo de 4 pies (1,219) no cae en la trama y se lleva a 1,125 (−7,7 %); el ancho, 8,53 → 8,25 (−3,3 %) y el largo, 17,07 → 17,25 (+1,1 %). Los patios de los dormitorios se dibujan con celosía de aluminio en la fachada de calle (el original es vidrio translúcido). El carport y la chimenea exterior de piedra no se modelan.',
    medidas: [Md('Ancho (28 pies)', ft(28), 8.25), Md('Largo (56 pies)', ft(56), 17.25), Md('Módulo (4 pies)', ft(4), 1.125)],
    plantas: [[
      R('patio', 0, 0, 7.5, 1.5, { nombre: 'Patios de dormitorio', nombreFijo: true, celosia: { lados: ['N'], altura: 'simple', material: 'aluminio' } }),
      R('dormitorio_principal', 0, 1.5, 3.75, 3.75), R('dormitorio', 3.75, 1.5, 3.75, 3.75),
      R('recibidor', 7.5, 0, 2.25, 3, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('pasillo', 7.5, 3, 2.25, 2.25, 'Paso'),
      R('pasillo', 0, 5.25, 9.75, 1.5, 'Galería'),
      R('bano', 0, 6.75, 3.75, 1.5), R('bano', 3.75, 6.75, 3.75, 1.5), R('lavadero', 7.5, 6.75, 2.25, 1.5),
      R('cocina', 9.75, 0, 3, 3), R('comedor', 12.75, 0, 4.5, 3), R('salon', 9.75, 3, 7.5, 5.25, { nombre: 'Estar sobre la terraza mirador', nombreFijo: true }),
    ]],
  },
  // ------------------------------------------------------------------ Harry Seidler
  {
    id: 'ref-rose-seidler', obra: 'Rose Seidler House', arquitecto: 'Harry Seidler', anio: 1950, lugar: 'Wahroonga, Sídney (Australia)',
    familia: 'myway', perfiles: ['familia', 'multigeneracional'], acabados: { fachada: 'mineral', carpinteria: 'clara' }, jardin: 'bosque', acceso: 'S',
    confianza: 'baja', fuentes: ['https://en.wikipedia.org/wiki/Rose_Seidler_House', 'https://seidler.net.au/?id=187', 'https://mhnsw.au/stories/general/a-new-way-of-living/'],
    desc: 'La casa con la que Seidler trajo la Bauhaus a Australia: un cuadrado «vaciado» de unos 200 m² levantado sobre el terreno por los lados norte y este, con planta binuclear —día y noche separados, unidos por la sala de juegos y el solárium al que sube una rampa—. Debajo, sobre los muros de piedra, el garaje doble, el recreo cubierto y el piso del guarda.',
    notas: 'Solo hay superficie: el lado (≈ 14,1 m) se DEDUCE de los 200 m² de la planta principal y se lleva a 14,25. El hueco del cuadrado es el solárium (terraza), al norte, porque en el hemisferio sur el sol llega por el norte. La rampa exterior no se modela. La planta baja, abierta en el original bajo los lados elevados, se modela como recreo cubierto (porche) más las piezas cerradas.',
    medidas: [Md('Lado del cuadrado (deducido)', 14.14, 14.25)],
    plantas: [[
      R('porche', 0, 0, 14.25, 4.5, 'Recreo cubierto bajo el solárium'),
      R('despacho', 0, 4.5, 6, 3.75, 'Sala de recreo'), R('pasillo', 6, 4.5, 1.5, 6, 'Paso'), R('dormitorio', 7.5, 4.5, 3.75, 3.75, 'Piso del guarda'), R('bano', 11.25, 4.5, 3, 3.75, { suite: true, nombre: 'Baño del guarda', nombreFijo: true }),
      R('trastero', 0, 8.25, 6, 2.25, 'Almacén'), R('aseo', 7.5, 8.25, 1.5, 2.25), R('garaje', 9, 8.25, 5.25, 6, 'Garaje doble · muros de piedra'),
      R('porche', 0, 10.5, 4.5, 3.75, 'Porche de servicio'), R('escalera', 4.5, 10.5, 2.25, 3.75), R('recibidor', 6.75, 10.5, 2.25, 3.75, { nombre: 'Vestíbulo', nombreFijo: true, entrada: true }),
    ], [
      R('salon', 0, 0, 6, 6, { nombre: 'Estar · vista al norte', nombreFijo: true }), R('terraza', 6, 0, 4.5, 6, 'Solárium · hueco del cuadrado'),
      R('pasillo', 10.5, 0, 1.5, 9, 'Galería de dormitorios'), R('dormitorio', 12, 0, 2.25, 4.5), R('dormitorio', 12, 4.5, 2.25, 4.5),
      R('comedor', 0, 6, 6, 3), R('despacho', 6, 6, 4.5, 3, 'Sala de juegos · une las dos alas'),
      R('cocina', 0, 9, 4.5, 3), R('lavadero', 0, 12, 4.5, 2.25), R('pasillo', 4.5, 9, 9.75, 1.5, 'Paso'),
      R('escalera', 4.5, 10.5, 2.25, 3.75), R('bano', 6.75, 10.5, 2.25, 3.75), R('dormitorio_principal', 9, 10.5, 3.75, 3.75), R('bano', 12.75, 10.5, 1.5, 3.75, { suite: true }),
    ]],
  },
];

export const REFERENCIAS_HIST = prepararReferencias(DEF);
