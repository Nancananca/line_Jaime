// Referencias de autor · arquitectura contemporánea (1975 en adelante). Mismo formato que core/referencias.mjs.
// INTERPRETACIONES ESQUEMÁTICAS PROPIAS: de cada obra solo se toman las medidas globales publicadas (superficies, frentes,
// lados, retículas) y la organización espacial descrita por las fuentes; no se copian planos, imágenes ni textos. Donde
// solo hay superficie publicada, la planta se dimensiona en la trama para esa superficie y se dice en `notas`; cuando una
// medida lineal se DEDUCE de una superficie, su nombre lo indica y la confianza baja.
// Criterio de trama (core/referencias.mjs): múltiplo de 0,75 si la desviación es ≤ 3,5 %; si no, malla de 0,375.
import { prepararReferencias } from './referencias.mjs';

const R = (tipo, x, y, w, h, extra) => Object.assign({ tipo, x, y, w, h }, typeof extra === 'string' ? { nombre: extra, nombreFijo: true } : extra || {});
// medida: nombre, valor original, valor en el modelo, unidad y, si la medida lineal se DEDUCE de una superficie (no está
// publicada), `deducida` = true: se registra con su desviación pero nunca cuenta como coincidencia de trama.
const Md = (n, orig, trama, u = 'm', deducida = false) => Object.assign({ n, orig, trama, u }, deducida ? { deducida: true } : {});
// estancia de una vivienda (edificios v.1.5): V('A', extra)
const V = (v, extra) => Object.assign({ vivienda: v }, typeof extra === 'string' ? { nombre: extra, nombreFijo: true } : extra || {});

const DEF = [
  // ------------------------------------------------------------------ ELEMENTAL · Alejandro Aravena
  {
    id: 'ref-quinta-monroy', obra: 'Quinta Monroy · «edificio paralelo» (casa en planta baja + dúplex)', arquitecto: 'ELEMENTAL (Alejandro Aravena)', anio: 2004, lugar: 'Iquique (Chile)',
    familia: 'basic', perfiles: ['familia', 'inversor'], medianeras: ['E', 'O'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'sin', acceso: 'N',
    confianza: 'baja', fuentes: ['https://arquitecturaviva.com/obras/viviendas-quinta-monroy', 'https://minerva-access.unimelb.edu.au/server/api/core/bitstreams/cb0d89b5-eefd-5c82-9d14-caacb1051062/content', 'https://www.engineeringforchange.org/solutions/product/elemental-quinta-monroy/'],
    desc: 'Vivienda social incremental: la «media casa buena». Un «edificio paralelo» de solo el primer y el último piso: abajo, una casa con patio (36 m² iniciales, 70 ampliada) que crece hacia la crujía lateral y el patio trasero; encima, un dúplex (25 m² iniciales, 72 ampliado) con escalera propia desde la calle, que crece en el vacío entre unidades. Se entrega lo difícil (baños, cocinas, escaleras, medianeras y estructura) dimensionado para el estado final. 93 viviendas en el solar original del campamento.',
    notas: 'EDIFICIO DE DOS VIVIENDAS en tres plantas, en estado ampliado: A = casa de planta baja (núcleo de 6 × 6 + crujía de 3 m + ampliación hacia el patio), B = dúplex en las plantas primera y segunda con su escalera propia, que arranca de un zaguán común de 1,50 a la calle (en el original la escalera abre directamente a la calle). La crujía vacía del dúplex en la primera planta se deja como terraza (reserva de ampliación). Las medidas lineales se DEDUCEN de las superficies publicadas (81 m² = 9 × 9; 36 m² = 6 × 6; 18 m² = 3 × 6): se registran pero no cuentan como coincidencia de trama.',
    medidas: [Md('Parcela (lado, deducido de 81 m²)', 9, 9, 'm', true), Md('Núcleo inicial (lado, deducido de 36 m²)', 6, 6, 'm', true), Md('Crujía de ampliación (deducida de 18 m²)', 3, 3, 'm', true), Md('Conjunto ampliado (casa 70 + dúplex 72 m²)', 142, 0, 'm2')],
    plantas: [[
      R('salon', 0, 0, 6, 3, V('A', { nombre: 'Estar · comedor (núcleo inicial)', nombreFijo: true, entrada: true })),
      R('recibidor', 6, 0, 1.5, 1.5, 'Zaguán común'), R('escalera', 7.5, 0, 1.5, 4.5, V('B', 'Escalera propia del dúplex')),
      R('lavadero', 6, 1.5, 1.5, 3, V('A')),
      R('cocina', 0, 3, 3, 3, V('A', 'Cocina (núcleo inicial)')), R('bano', 3, 3, 1.5, 3, V('A', 'Baño (núcleo inicial)')), R('pasillo', 4.5, 3, 1.5, 4.5, V('A', 'Paso')),
      R('dormitorio', 6, 4.5, 3, 3, V('A', 'Dormitorio en la crujía ampliada')), R('dormitorio', 0, 6, 4.5, 3, V('A', 'Dormitorio ampliado hacia el patio')),
      R('patio', 4.5, 7.5, 4.5, 1.5, V('A', 'Patio trasero')),
    ], [
      R('terraza', 0, 0, 3, 6, V('B', 'Vacío de ampliación del dúplex')),
      R('salon', 3, 0, 4.5, 3.75, V('B', 'Estar del dúplex')), R('escalera', 7.5, 0, 1.5, 4.5, V('B', 'Escalera propia del dúplex')),
      R('cocina', 3, 3.75, 2.25, 2.25, V('B')), R('bano', 5.25, 3.75, 2.25, 2.25, V('B')), R('terraza', 7.5, 4.5, 1.5, 1.5, V('B', 'Balcón')),
    ], [
      R('dormitorio', 3, 0, 4.5, 3, V('B')), R('escalera', 7.5, 0, 1.5, 4.5, V('B', 'Escalera propia del dúplex')),
      R('dormitorio', 3, 3, 3, 3, V('B')), R('distribuidor', 6, 3, 1.5, 3, V('B', 'Paso')), R('aseo', 7.5, 4.5, 1.5, 1.5, V('B')),
    ]],
  },
  {
    id: 'ref-villa-verde', obra: 'Viviendas Villa Verde (casa ampliada)', arquitecto: 'ELEMENTAL (Alejandro Aravena)', anio: 2013, lugar: 'Constitución (Chile)',
    familia: 'basic', perfiles: ['familia', 'pareja'], medianeras: ['E', 'O'], acabados: { fachada: 'madera', carpinteria: 'clara' }, jardin: 'huerto', acceso: 'N',
    cubierta: { tipo: 'dos', material: 'chapa', color: 'grafito', alero: 0.3 },
    confianza: 'baja', fuentes: ['https://arquitecturaviva.com/obras/viviendas-villa-verde', 'https://www.archdaily.com/447381/villa-verde-housing-elemental'],
    desc: 'Casa en hilera de dos alturas bajo cubierta a dos aguas: se entrega la mitad del volumen construida (escalera, baño, cocina, forjados y cubierta) y la otra mitad vacía para que cada familia la complete con un forjado y dos paneles de fachada. 57 m² iniciales, 85 m² ampliada.',
    notas: 'Se modela el estado ampliado. Las fuentes no publican ancho ni fondo: la casa se dimensiona en dos crujías de 3,00 (la construida y la de ampliación) por 7,50 de fondo para la superficie ampliada publicada (85 m²). Desviación +5,9 %.',
    medidas: [Md('Vivienda ampliada', 85, 0, 'm2')],
    plantas: [[
      R('salon', 0, 0, 4.5, 3.75, { nombre: 'Estar', nombreFijo: true, entrada: true }), R('escalera', 4.5, 0, 1.5, 4.5),
      R('cocina', 0, 3.75, 3, 3.75, 'Cocina · comedor'), R('pasillo', 3, 3.75, 1.5, 3.75, 'Paso'), R('bano', 4.5, 4.5, 1.5, 3),
    ], [
      R('dormitorio_principal', 0, 0, 4.5, 3), R('escalera', 4.5, 0, 1.5, 4.5),
      R('pasillo', 3, 3, 1.5, 4.5, 'Paso'), R('dormitorio', 0, 3, 3, 4.5, 'Dormitorio en la mitad ampliada'), R('bano', 4.5, 4.5, 1.5, 3),
    ]],
  },
  // ------------------------------------------------------------------ Tatiana Bilbao
  {
    id: 'ref-bilbao-sustentable', obra: 'Vivienda Sustentable (prototipo)', arquitecto: 'Tatiana Bilbao Estudio', anio: 2015, lugar: 'Bienal de Arquitectura de Chicago · prototipo para México',
    familia: 'basic', perfiles: ['familia', 'pareja'], acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'huerto', acceso: 'N',
    cubierta: { tipo: 'dos', material: 'chapa', color: 'grafito', alero: 0.3 },
    confianza: 'baja', fuentes: ['https://en.wikipedia.org/wiki/Tatiana_Bilbao', 'https://www.archdaily.com/775233/tatiana-bilbaos-8000-house-could-solve-mexicos-social-housing-shortage', 'https://www.designboom.com/architecture/chicago-architecture-biennial-tatiana-bilbao-sustainable-housing-mexico-10-12-2015/'],
    desc: 'Vivienda social por fases: un núcleo rígido de bloque de hormigón con cocina y baño, rodeado de módulos ligeros de madera que la familia añade por fases. La base tiene 62 m².',
    notas: 'Se modela la vivienda base en una planta: núcleo rígido (cocina, paso y baño en una franja de 1,50) entre la zona de día y los dos dormitorios. Las fuentes no publican cotas: se dimensiona para los 62 m² publicados. Las fases de ampliación no se modelan.',
    medidas: [Md('Vivienda base', 62, 0, 'm2')],
    plantas: [[
      R('salon', 0, 0, 4.5, 4.5, { nombre: 'Estar', nombreFijo: true, entrada: true }), R('comedor', 0, 4.5, 4.5, 2.25),
      R('cocina', 4.5, 0, 1.5, 2.25, 'Cocina · núcleo rígido'), R('pasillo', 4.5, 2.25, 1.5, 2.25, 'Paso · núcleo rígido'), R('bano', 4.5, 4.5, 1.5, 2.25, 'Baño · núcleo rígido'),
      R('dormitorio_principal', 6, 0, 3, 3.75, 'Módulo de madera · dormitorio'), R('dormitorio', 6, 3.75, 3, 3, 'Módulo de madera · dormitorio'),
    ]],
  },
  // ------------------------------------------------------------------ Pezo von Ellrichshausen
  {
    id: 'ref-poli', obra: 'Casa Poli', arquitecto: 'Pezo von Ellrichshausen', anio: 2005, lugar: 'Península de Coliumo, Tomé (Chile)',
    familia: 'myway', perfiles: ['pareja', 'teletrabajo'], acabados: { fachada: 'hormigon', carpinteria: 'madera' }, jardin: 'sin', acceso: 'N',
    confianza: 'media', fuentes: ['https://arquitecturaviva.com/obras/casa-poli', 'https://www.archdaily.com/476/poli-house-pezo-von-ellrichshausen', 'https://architecturalrecord.com/articles/8721-casa-poli'],
    desc: 'Un prisma de hormigón de planta cuadrada sobre el acantilado, a la vez casa de veraneo y centro cultural. Un muro perimetral muy grueso aloja escaleras, cocina, baños y almacenaje, y libera dentro unas salas sin nombre, interconectadas, partidas por una cruz asimétrica, en dos alturas. 180 m².',
    notas: 'La cruz asimétrica y el muro grueso se interpretan con franjas de servicio de 1,50 al oeste (escalera y cocina) y al este (aseo y almacenaje). Sin cotas publicadas del cuadrado: se dimensiona para los 180 m² (9,75 × 9,00, casi cuadrado, para quedar en la trama de 0,75). Los niveles intermedios de la planta baja, que siguen la pendiente, no se modelan.',
    medidas: [Md('Superficie construida', 180, 0, 'm2')],
    plantas: [[
      R('cocina', 0, 0, 1.5, 4.5, 'Cocina en el muro'), R('escalera', 0, 4.5, 1.5, 4.5, 'Escalera en el muro'),
      R('salon', 1.5, 0, 6.75, 5.25, { nombre: 'Sala grande', nombreFijo: true, entrada: true }),
      R('comedor', 1.5, 5.25, 3.75, 3.75, 'Sala del comedor'), R('despacho', 5.25, 5.25, 3, 3.75, 'Sala'),
      R('aseo', 8.25, 0, 1.5, 2.25, 'Aseo en el muro'), R('trastero', 8.25, 2.25, 1.5, 6.75, 'Almacén en el muro'),
    ], [
      R('dormitorio_principal', 1.5, 0, 4.5, 4.5, 'Sala-dormitorio'), R('dormitorio', 6, 0, 3.75, 4.5, 'Sala-dormitorio'),
      R('escalera', 0, 4.5, 1.5, 4.5, 'Escalera en el muro'), R('pasillo', 1.5, 4.5, 8.25, 1.5, 'Brazo de la cruz'),
      R('dormitorio', 1.5, 6, 3.75, 3, 'Sala-dormitorio'), R('bano', 5.25, 6, 1.5, 3, 'Baño en el muro'), R('despacho', 6.75, 6, 3, 3, 'Sala'),
    ]],
  },
  // ------------------------------------------------------------------ Smiljan Radić
  {
    id: 'ref-poema-angulo-recto', obra: 'Casa para el Poema del Ángulo Recto', arquitecto: 'Smiljan Radić', anio: 2012, lugar: 'Vilches, región del Maule (Chile)',
    familia: 'natura', perfiles: ['familia', 'teletrabajo'], acabados: { fachada: 'hormigon_gris', carpinteria: 'oscura' }, jardin: 'bosque', acceso: 'N',
    confianza: 'baja', fuentes: ['https://www.redalyc.org/pdf/375/37525388013.pdf', 'https://www.dezeen.com/2020/05/08/house-for-the-poem-of-the-right-angle-smiljan-radic-vilches-chile/', 'https://www.moma.org/collection/works/187688'],
    desc: 'Casa familiar de hormigón negro en un bosque de robles, levantada donde ardió su Casa A: un volumen casi ciego que se ilumina desde arriba por tres grandes lucernarios girados. Una sala central bajo la luz cenital, con las piezas de noche y de servicio a los lados. 165 m².',
    notas: 'Organización interpretada (las fuentes describen el volumen y los lucernarios, no la distribución): sala y comedor en una franja central de 6,00, dormitorios al oeste y servicio y estudio al este. Los tres lucernarios no se representan (los huecos son automáticos). Dimensionada para la superficie publicada (165 m²).',
    medidas: [Md('Superficie construida', 165, 0, 'm2')],
    plantas: [[
      R('dormitorio_principal', 0, 0, 4.5, 4.5), R('bano', 0, 4.5, 4.5, 2.25), R('dormitorio', 0, 6.75, 4.5, 4.5),
      R('salon', 4.5, 0, 6, 6, { nombre: 'Sala bajo el gran lucernario', nombreFijo: true, entrada: true }), R('comedor', 4.5, 6, 6, 5.25, 'Comedor bajo los lucernarios'),
      R('cocina', 10.5, 0, 4.5, 4.5), R('lavadero', 10.5, 4.5, 2.25, 2.25), R('aseo', 12.75, 4.5, 2.25, 2.25), R('despacho', 10.5, 6.75, 4.5, 4.5, 'Estudio'),
    ]],
  },
  // ------------------------------------------------------------------ Carla Juaçaba
  {
    id: 'ref-rio-bonito', obra: 'Casa Rio Bonito', arquitecto: 'Carla Juaçaba', anio: 2005, lugar: 'Rio Bonito, Nova Friburgo, Río de Janeiro (Brasil)',
    familia: 'line', perfiles: ['pareja', 'senior'], medianeras: ['E', 'O'], acabados: { fachada: 'tapial', carpinteria: 'oscura' }, jardin: 'bosque', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.archdaily.com/457077/rio-bonito-house-carla-juacaba', 'https://arquitecturaviva.com/works/casa-rio-bonito-nova-friburgo', 'https://smallhousebliss.com/2013/12/21/casa-rio-bonito-a-modern-cabin-in-the-brazilian-rainforest/'],
    desc: 'Refugio de fin de semana junto a un río: dos muros de piedra de 1,10 m de espesor en los extremos sostienen cuatro vigas de acero que cargan la losa de suelo y la de cubierta. Entre ellos, una sola planta de 70 m² abierta por completo al bosque por las dos fachadas largas de vidrio.',
    notas: 'Los dos muros de piedra se representan como medianeras ciegas (este y oeste): la casa solo se abre a norte y sur, como el original. Sin cotas publicadas de la luz entre muros: se dimensiona para los 70 m² (10,50 × 6,75). El espesor de los muros (1,10 m) queda fuera de la superficie modelada.',
    medidas: [Md('Superficie', 70, 0, 'm2')],
    plantas: [[
      R('dormitorio_principal', 0, 0, 3.75, 4.5, 'Dormitorio'), R('bano', 0, 4.5, 2.25, 2.25), R('pasillo', 2.25, 4.5, 1.5, 2.25, 'Paso'),
      R('salon', 3.75, 0, 6.75, 4.5, { nombre: 'Estar entre los muros de piedra', nombreFijo: true, entrada: true }),
      R('comedor', 3.75, 4.5, 4.5, 2.25), R('cocina', 8.25, 4.5, 2.25, 2.25),
    ]],
  },
  // ------------------------------------------------------------------ Anupama Kundoo
  {
    id: 'ref-wall-house', obra: 'Wall House', arquitecto: 'Anupama Kundoo', anio: 2000, lugar: 'Auromodele, Auroville (India)',
    familia: 'natura', perfiles: ['pareja', 'teletrabajo'], acabados: { fachada: 'tapial', carpinteria: 'madera' }, jardin: 'mediterraneo', acceso: 'N',
    confianza: 'baja', fuentes: ['https://en.wikipedia.org/wiki/Anupama_Kundoo', 'https://www.metalocus.es/es/noticias/arquitectura-lenta-o-arquitectura-de-la-felicidad-casa-muro-de-anupama-kundoo'],
    desc: 'La casa propia de la arquitecta, laboratorio de construcción económica con medios locales: planta en L en torno a un patio, muros de ladrillo cocido in situ, cubiertas planas transitables de piezas trapezoidales sobre viguetas en parte prefabricadas y aligeradas con piezas de barro cocido, y una doble altura que activa la ventilación natural. 100 m².',
    notas: 'Sin cotas publicadas: la L se dimensiona para los 100 m² (rama oeste de 4,50 y rama norte con el estar a doble altura de 6,00 × 4,50). El estudio alto y la cubierta-terraza se interpretan sobre la rama oeste. Desviación +4,6 %.',
    medidas: [Md('Superficie construida', 100, 0, 'm2')],
    plantas: [[
      R('comedor', 0, 0, 4.5, 3.75), R('salon', 4.5, 0, 6, 4.5, { nombre: 'Estar a doble altura', nombreFijo: true, entrada: true }),
      R('cocina', 0, 3.75, 3, 3), R('escalera', 3, 3.75, 1.5, 4.5), R('bano', 0, 6.75, 3, 3), R('pasillo', 3, 8.25, 1.5, 1.5, 'Paso'),
      R('dormitorio_principal', 0, 9.75, 4.5, 3, 'Dormitorio'),
      R('patio', 4.5, 4.5, 6, 8.25, 'Patio'),
    ], [
      R('terraza', 0, 0, 4.5, 3.75, 'Cubierta-terraza'), R('despacho', 0, 3.75, 3, 4.5, 'Estudio alto'), R('escalera', 3, 3.75, 1.5, 4.5),
      R('doble_altura', 4.5, 0, 6, 4.5, 'Doble altura del estar · ventilación'),
    ]],
  },
  // ------------------------------------------------------------------ Lacaton & Vassal
  {
    id: 'ref-latapie', obra: 'Casa Latapie', arquitecto: 'Lacaton & Vassal', anio: 1993, lugar: 'Floirac, Burdeos (Francia)',
    familia: 'line', perfiles: ['familia', 'pareja'], acabados: { fachada: 'chapa_clara', carpinteria: 'clara' }, jardin: 'cesped', acceso: 'O',
    confianza: 'baja', fuentes: ['https://lacatonvassal.com/data/documents/20140220-110133LV_FchA4_HabitatMaisons_LAT_bd.pdf', 'https://arquitecturaviva.com/obras/casa-latapie', 'https://journals.open.tudelft.nl/dash/article/view/4745'],
    desc: 'Con los medios de una casa de 80 m², el doble de espacio: un volumen simple de planta cuadrada y estructura de acero, partido en dos mitades iguales. A la calle, una caja aislada de madera y fibrocemento con las piezas en dos plantas en torno a un núcleo de escalera y servicios; al jardín, un invernadero hortícola de policarbonato que es un segundo estar. Las dos fachadas se abren por completo. 185 m².',
    notas: 'Ninguna fuente publica el lado del cuadrado: se DEDUCE de los 185 m² (planta baja entera + planta alta solo en la caja: 1,5 × lado² → 11,10 m) y se lleva a 11,25. Cada mitad mide 5,625 (malla de 0,375, pieza especial). El invernadero, a doble altura en el original, se modela en una planta (sobre él no hay nada) y se parte en dos piezas para no superar la luz de 6,00.',
    medidas: [Md('Lado de la base cuadrada (deducido de 185 m²)', 11.1, 11.25, 'm', true), Md('Superficie', 185, 0, 'm2')],
    plantas: [[
      R('salon', 0, 0, 5.625, 3.375, { nombre: 'Estar de la caja', nombreFijo: true, entrada: true }),
      R('escalera', 0, 3.375, 1.5, 4.5, 'Escalera del núcleo'), R('aseo', 1.5, 3.375, 2.25, 2.25), R('instalaciones', 3.75, 3.375, 1.875, 2.25, 'Núcleo técnico'),
      R('cocina', 1.5, 5.625, 4.125, 2.25, 'Cocina abierta'), R('comedor', 0, 7.875, 5.625, 3.375),
      R('salon', 5.625, 0, 5.625, 5.625, 'Invernadero · jardín de invierno'), R('salon', 5.625, 5.625, 5.625, 5.625, 'Invernadero · jardín de invierno'),
    ], [
      R('dormitorio_principal', 0, 0, 5.625, 3.375), R('escalera', 0, 3.375, 1.5, 4.5, 'Escalera del núcleo'), R('pasillo', 1.5, 3.375, 1.5, 4.5, 'Paso'),
      R('bano', 3, 3.375, 2.625, 2.25), R('distribuidor', 3, 5.625, 2.625, 2.25),
      R('dormitorio', 0, 7.875, 2.625, 3.375), R('dormitorio', 2.625, 7.875, 3, 3.375),
    ]],
  },
  // ------------------------------------------------------------------ Ryue Nishizawa · Kazuyo Sejima (SANAA)
  {
    id: 'ref-weekend-house', obra: 'Weekend House', arquitecto: 'Ryue Nishizawa', anio: 1998, lugar: 'Usui, Gunma (Japón)',
    familia: 'myway', perfiles: ['pareja', 'teletrabajo'], acabados: { fachada: 'chapa_clara', carpinteria: 'clara' }, jardin: 'bosque', acceso: 'N',
    confianza: 'media', fuentes: ['https://arquitecturaviva.com/works/casa-de-fin-de-semana-gunma-7', 'https://structuredenvironment.squarespace.com/weekend-house'],
    desc: 'Una planta cuadrada de 13 m de lado bajo una cubierta plana, sobre una retícula estructural de 2,40 m de pilares finos que solo llevan carga vertical; la fachada de chapa ondulada toma la horizontal. Tres patios de proporciones distintas tocan la piel y llevan la luz y el bosque al interior de una casa casi ciega.',
    notas: 'Lado de 13 m → 12,75 (trama de 0,75). La retícula de 2,40 no cae en la de 0,75: se lleva a 2,25 (−6,3 %) en el ancho de las piezas de la franja este; no se dibujan los pilares. Los tres patios se colocan contra la piel norte-este, oeste y sur, como describe la fuente; la distribución es interpretada.',
    medidas: [Md('Lado del cuadrado', 13, 12.75), Md('Retícula estructural', 2.4, 2.25)],
    plantas: [[
      R('dormitorio_principal', 0, 0, 4.5, 4.5), R('salon', 4.5, 0, 6, 4.5, { nombre: 'Sala', nombreFijo: true, entrada: true }), R('patio', 10.5, 0, 2.25, 4.5, 'Patio norte'),
      R('patio', 0, 4.5, 3, 3.75, 'Patio oeste'), R('comedor', 3, 4.5, 6, 3.75), R('cocina', 9, 4.5, 3.75, 3.75),
      R('dormitorio', 0, 8.25, 4.5, 4.5), R('bano', 4.5, 8.25, 3, 2.25), R('aseo', 4.5, 10.5, 3, 2.25, { suite: true }),
      R('patio', 7.5, 8.25, 3, 4.5, 'Patio sur'), R('despacho', 10.5, 8.25, 2.25, 4.5, 'Estudio'),
    ]],
  },
  {
    id: 'ref-moriyama', obra: 'Moriyama House', arquitecto: 'Ryue Nishizawa (SANAA)', anio: 2005, lugar: 'Ohta-ku, Tokio (Japón)',
    familia: 'myway', perfiles: ['inversor', 'multigeneracional'], acabados: { fachada: 'chapa_clara', carpinteria: 'clara' }, jardin: 'zen', acceso: 'N',
    confianza: 'media', fuentes: ['https://backnumber.japan-architect.co.jp/english/2maga/ja/ja0066/works/020.html', 'https://post.moma.org/?p=199', 'https://www.dezeen.com/2025/01/11/ryue-nishizawa-moriyama-house-21-century-buildings/'],
    desc: 'Una casa deshecha en diez cajas blancas de acero de una a tres alturas, esparcidas por un solar de 290 m² sin vallas, entre jardines y senderos. El propietario vive repartido en varias cajas (el estar en una, el baño en otra, los dormitorios y la sala de audio en la torre) y alquila otras cinco como mini-casas, cada una con su cocina y su baño. Salir al jardín para ir de una pieza a otra es parte de la vida. 263,32 m² construidos.',
    notas: 'EDIFICIO DE SEIS VIVIENDAS en diez cajas: A = propietario (torre de tres alturas con la sala de audio, que en el original está en el sótano, y los dos dormitorios; caja C con el estar y la cocina; caja D, el baño; caja E, el estudio; caja B, el lavadero) y R1–R5 = alquileres (R1–R3 dúplex de 4,50 × 4,50, R4 y R5 estudios de una planta). Las cajas de una planta abren al jardín con puerta propia; las de varias alturas, a un umbral común de 1,50 junto a la calle (el jardín compartido no es interior en el modelo). Sin cotas publicadas de cada caja: se dimensionan para la superficie total construida (263,32 m²); la ocupación del modelo es algo mayor que la publicada (130,09 m²).',
    medidas: [Md('Superficie total construida', 263.32, 0, 'm2')],
    plantas: [[
      R('escalera', 0, 0, 1.5, 4.5, V('A', 'Escalera de la torre')), R('despacho', 1.5, 0, 2.25, 4.5, V('A', 'Sala de audio')),
      R('recibidor', 3.75, 0, 1.5, 1.5, 'Umbral común'),
      R('cocina', 5.25, 0, 3, 2.25, V('R1')), R('bano', 5.25, 2.25, 3, 2.25, V('R1')), R('escalera', 8.25, 0, 1.5, 4.5, V('R1')),
      R('despacho', 11.25, 0, 3.75, 3, V('A', { nombre: 'Caja E · estudio', nombreFijo: true, huecos: { O: { tipo: 'puerta' }, N: { tipo: 'ventana' } } })),
      R('lavadero', 11.25, 4.5, 2.25, 3, V('A', { nombre: 'Caja B · lavadero', nombreFijo: true, huecos: { N: { tipo: 'puerta' } } })),
      R('salon', 0, 6, 4.5, 3.75, V('A', { nombre: 'Caja C · estar del propietario', nombreFijo: true, huecos: { N: { tipo: 'puerta' } } })), R('cocina', 0, 9.75, 4.5, 1.5, V('A', 'Caja C · cocina')),
      R('bano', 6, 6, 3, 2.25, V('A', { nombre: 'Caja D · baño del propietario', nombreFijo: true, huecos: { N: { tipo: 'puerta' } } })),
      R('escalera', 6, 9.75, 1.5, 4.5, V('R2')), R('cocina', 7.5, 9.75, 3, 2.25, V('R2')), R('bano', 7.5, 12, 3, 2.25, V('R2')),
      R('recibidor', 10.5, 9.75, 1.5, 1.5, { nombre: 'Umbral común', nombreFijo: true, huecos: { N: { tipo: 'puerta' } } }),
      R('cocina', 12, 9.75, 3, 2.25, V('R3')), R('bano', 12, 12, 3, 2.25, V('R3')), R('escalera', 15, 9.75, 1.5, 4.5, V('R3')),
      R('salon', 0, 13.5, 4.5, 3.75, V('R4', { nombre: 'Estudio en alquiler', nombreFijo: true, huecos: { N: { tipo: 'puerta' } } })), R('cocina', 0, 17.25, 2.25, 3, V('R4')), R('bano', 2.25, 17.25, 2.25, 3, V('R4')),
      R('salon', 6, 15.75, 4.5, 4.5, V('R5', { nombre: 'Estudio en alquiler', nombreFijo: true, huecos: { N: { tipo: 'puerta' } } })), R('cocina', 10.5, 15.75, 2.25, 2.25, V('R5')), R('bano', 10.5, 18, 2.25, 2.25, V('R5')),
    ], [
      R('escalera', 0, 0, 1.5, 4.5, V('A', 'Escalera de la torre')), R('dormitorio', 1.5, 0, 2.25, 4.5, V('A')),
      R('salon', 5.25, 0, 3, 4.5, V('R1', 'Estar-dormitorio')), R('escalera', 8.25, 0, 1.5, 4.5, V('R1')),
      R('escalera', 6, 9.75, 1.5, 4.5, V('R2')), R('salon', 7.5, 9.75, 3, 4.5, V('R2', 'Estar-dormitorio')),
      R('salon', 12, 9.75, 3, 4.5, V('R3', 'Estar-dormitorio')), R('escalera', 15, 9.75, 1.5, 4.5, V('R3')),
    ], [
      R('escalera', 0, 0, 1.5, 4.5, V('A', 'Escalera de la torre')), R('dormitorio', 1.5, 0, 2.25, 4.5, V('A', 'Dormitorio alto')),
    ]],
  },
  {
    id: 'ref-small-house', obra: 'Small House', arquitecto: 'Kazuyo Sejima', anio: 2000, lugar: 'Aoyama, Tokio (Japón)',
    familia: 'basic', perfiles: ['pareja', 'solo'], acabados: { fachada: 'chapa_clara', carpinteria: 'clara' }, jardin: 'sin', acceso: 'N',
    confianza: 'media', fuentes: ['https://arquitecturaviva.com/obras/casa-pequena-tokio', 'https://architecture-tokyo.com/2017/06/14/2000-small-house-kazuyo-sejima/', 'https://data.shinkenchiku.online/en/projects/articles/SK_2000_11_184-0'],
    desc: 'Torre mínima en un solar de 60 m², de los que solo 36 se ocupan en planta baja: cuatro niveles de forjados girados en torno a una escalera de caracol que es a la vez estructura y chimenea térmica. Dormitorio principal en el semisótano, el de invitados en el nivel de entrada, el estar-comedor-cocina (el nivel mayor y más alto) encima y, arriba del todo, el baño abierto a la terraza de cubierta.',
    notas: 'EDIFICIO DE 4 NIVELES: el semisótano se modela como planta baja (con la entrada; en el original se entra por el nivel del dormitorio de invitados). El lado de la planta baja se DEDUCE de los 36 m² ocupados (6 × 6): se registra pero no cuenta como coincidencia de trama. El giro de los forjados se resume en el nivel del estar, que vuela 1,50 al sur (máximo del sistema); la escalera de caracol se modela recta. Aviso esperado: la planta baja no tiene baño (está arriba, junto a la terraza, como en el original).',
    medidas: [Md('Lado de la planta baja (deducido de 36 m²)', 6, 6, 'm', true)],
    plantas: [[
      R('recibidor', 0, 0, 4.5, 1.5, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('escalera', 4.5, 0, 1.5, 4.5, 'Escalera-chimenea'),
      R('dormitorio_principal', 0, 1.5, 4.5, 4.5, 'Dormitorio principal (semisótano)'), R('vestidor', 4.5, 4.5, 1.5, 1.5, 'Armario'),
    ], [
      R('dormitorio', 0, 0, 4.5, 6, 'Dormitorio de invitados'), R('escalera', 4.5, 0, 1.5, 4.5, 'Escalera-chimenea'), R('distribuidor', 4.5, 4.5, 1.5, 1.5, 'Rellano'),
    ], [
      R('salon', 0, 0, 4.5, 4.5, { nombre: 'Estar · comedor (el nivel mayor)', nombreFijo: true }), R('escalera', 4.5, 0, 1.5, 4.5, 'Escalera-chimenea'),
      R('cocina', 0, 4.5, 6, 3, 'Cocina · vuelo de 1,50'),
    ], [
      R('bano', 0, 0, 4.5, 2.25, 'Baño abierto a la terraza'), R('escalera', 4.5, 0, 1.5, 4.5, 'Escalera-chimenea'),
      R('terraza', 0, 2.25, 4.5, 2.25, 'Terraza de cubierta'), R('terraza', 0, 4.5, 6, 3, 'Terraza de cubierta'),
    ]],
  },
  // ------------------------------------------------------------------ Sou Fujimoto
  {
    id: 'ref-house-na', obra: 'House NA', arquitecto: 'Sou Fujimoto', anio: 2011, lugar: 'Suginami, Tokio (Japón)',
    familia: 'myway', perfiles: ['pareja', 'solo'], acabados: { fachada: 'mineral', carpinteria: 'clara' }, jardin: 'sin', acceso: 'N',
    confianza: 'baja', fuentes: ['https://www.architecturalrecord.com/articles/8801-house-na', 'https://www.archdaily.com/230533', 'https://mooponto.com/?p=8527'],
    desc: 'Una casa-árbol de vidrio y acero blanco en un solar de unos 55 m²: veintiuna bandejas de 2 a 7,5 m² a alturas distintas, como ramas, que hacen a la vez de suelo, mesa, banco y estante. Abajo, la entrada y la habitación de invitados; en medio, la cocina, el comedor y el estar; arriba, dormir y biblioteca, terrazas y, coronando, el baño.',
    notas: 'Las 21 bandejas a medias alturas se resumen en tres plantas de 4,50 de ancho (la intermedia vuela 1,50 al sur, máximo del sistema). Se toma la superficie de 66,03 m² (otras fuentes dan 85 m²); sin cotas publicadas de la planta. Aviso esperado: la planta baja no tiene baño (el baño corona la casa, como en el original).',
    medidas: [Md('Superficie construida', 66.03, 0, 'm2')],
    plantas: [[
      R('escalera', 0, 0, 1.5, 4.5), R('recibidor', 1.5, 0, 3, 1.5, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('dormitorio', 1.5, 1.5, 3, 3, 'Habitación de invitados'),
    ], [
      R('escalera', 0, 0, 1.5, 4.5), R('cocina', 1.5, 0, 3, 2.25, 'Cocina · comedor'), R('salon', 1.5, 2.25, 3, 3.75, { nombre: 'Estar en bandejas', nombreFijo: true }),
      R('terraza', 0, 4.5, 1.5, 1.5, 'Bandeja exterior'),
    ], [
      R('escalera', 0, 0, 1.5, 4.5), R('dormitorio', 1.5, 0, 3, 3, 'Dormir · biblioteca'), R('distribuidor', 1.5, 3, 3, 1.5, 'Bandeja de paso'),
      R('bano', 0, 4.5, 2.25, 1.5, 'Baño en lo alto'), R('terraza', 2.25, 4.5, 2.25, 1.5, 'Terraza alta'),
    ]],
  },
  // ------------------------------------------------------------------ Atelier Bow-Wow
  {
    id: 'ref-mini-house', obra: 'Mini House', arquitecto: 'Atelier Bow-Wow (Yoshiharu Tsukamoto y Momoyo Kaijima)', anio: 1999, lugar: 'Nerima, Tokio (Japón)',
    familia: 'basic', perfiles: ['pareja', 'familia'], acabados: { fachada: 'chapa_clara', carpinteria: 'clara' }, jardin: 'sin', acceso: 'N',
    confianza: 'baja', fuentes: ['https://architectuul.com/architecture/mini-house', 'https://www.worldconstructionnetwork.com/features/feature49404', 'https://domusweb.it/en/architecture/2004/09/23/atelier-bow-wow-pockets-pets-and-petites-maisons.html'],
    desc: 'Una «casa mascota» en un solar de 77 m²: ocupa solo 41 m² para dejar jardín alrededor, y la planta alta vuela sobre la plaza del coche. 90 m² en dos alturas y media, con los dormitorios y el estudio abajo y la vida de día arriba.',
    notas: 'Cifras de una sola fuente secundaria (77 m² de solar, 41 m² de huella, 90 m² construidos; otras dan 84 u 88 m²). Huella dimensionada en 6,00 × 6,75 (40,5 m²); la planta alta vuela 1,50 (máximo del sistema) sobre el aparcamiento, que no se modela. La media planta (altillo) no se modela.',
    medidas: [Md('Superficie construida', 90, 0, 'm2')],
    plantas: [[
      R('escalera', 0, 0, 1.5, 4.5), R('recibidor', 1.5, 0, 1.5, 4.5, { nombre: 'Entrada · paso', nombreFijo: true, entrada: true }), R('bano', 3, 0, 3, 2.25),
      R('dormitorio', 3, 2.25, 3, 4.5), R('despacho', 0, 4.5, 3, 2.25, 'Estudio'),
    ], [
      R('escalera', 0, 0, 1.5, 4.5), R('salon', 1.5, 0, 4.5, 4.5, { nombre: 'Estar', nombreFijo: true }),
      R('cocina', 0, 4.5, 3, 3.75), R('comedor', 3, 4.5, 3, 3.75, 'Comedor · vuelo sobre el coche'),
    ]],
  },
  // ------------------------------------------------------------------ Toyo Ito
  {
    id: 'ref-white-u', obra: 'White U (casa en Nakano-Honcho)', arquitecto: 'Toyo Ito', anio: 1976, lugar: 'Nakano, Tokio (Japón) · demolida en 1997',
    familia: 'natura', perfiles: ['familia', 'senior'], acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'cesped', acceso: 'N',
    confianza: 'media', fuentes: ['https://archeyes.com/white-house-u-toyo-ito/', 'https://www.archify.com/au/archifynow/white-u', 'https://www.archdaily.com/345857/ad-classics-white-u-toyo-ito'],
    desc: 'Casa de una planta para la hermana del arquitecto y sus hijas tras la muerte de su marido: un anillo de hormigón blanco en U, ciego al exterior, en torno a un jardín cerrado. Un único corredor curvo va del dormitorio de la madre, en un extremo, a los de las hijas en el otro, pasando por la cocina, el baño y el estar sin muros en la curva. 148,25 m².',
    notas: 'FORMA NO ORTOGONAL: la U curva se aproxima con tres alas rectas de 4,50 (piezas de 3,00 + corredor de 1,50 al patio). Sin cotas publicadas del anillo: se dimensiona para la superficie total (148,25 m²). Desviación +4,7 %.',
    medidas: [Md('Superficie total', 148.25, 0, 'm2')],
    plantas: [[
      R('comedor', 0, 0, 4.5, 4.5), R('salon', 4.5, 0, 9, 4.5, { nombre: 'Estar sin muros en la curva', nombreFijo: true, entrada: true }), R('despacho', 13.5, 0, 3, 4.5, 'Estudio'),
      R('cocina', 0, 4.5, 3, 3), R('bano', 0, 7.5, 3, 2.25), R('dormitorio_principal', 0, 9.75, 3, 3.75, 'Dormitorio de la madre'), R('pasillo', 3, 4.5, 1.5, 9, 'Corredor curvo'),
      R('patio', 4.5, 4.5, 7.5, 9, 'Jardín cerrado'),
      R('pasillo', 12, 4.5, 1.5, 9, 'Corredor curvo'), R('dormitorio', 13.5, 4.5, 3, 3, 'Dormitorio de las hijas'), R('aseo', 13.5, 7.5, 3, 2.25), R('dormitorio', 13.5, 9.75, 3, 3.75, 'Dormitorio de las hijas'),
    ]],
  },
  // ------------------------------------------------------------------ Aires Mateus
  {
    id: 'ref-alenquer', obra: 'Casa en Alenquer', arquitecto: 'Aires Mateus', anio: 2002, lugar: 'Alenquer (Portugal)',
    familia: 'natura', perfiles: ['familia', 'pareja'], acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'mediterraneo', acceso: 'N',
    confianza: 'media', fuentes: ['https://arquitecturaviva.com/works/casa-en-alenquer-3', 'https://www.estudoprevio.net/aires-mateus-the-house-in-alenquer-as-a-process/?lang=en'],
    desc: 'Dentro de los muros de una casa en ruinas, encalados y conservados como cerca con sus huecos, se posa un bloque nuevo de prismas blancos superpuestos que no los toca. Entre la ruina y la casa, un patio perimetral. Abajo, el estar con la cocina; arriba, tres habitaciones, el baño y la escalera de madera. 115 m².',
    notas: 'Los muros de la ruina se representan con celosía de hormigón en el borde exterior del patio perimetral (son muros macizos con huecos); el ancho del patio (3,00) es interpretado. Sin cotas publicadas del bloque: se dimensiona en 7,50 × 7,50 para los 115 m² (−2,2 %).',
    medidas: [Md('Superficie construida', 115, 0, 'm2')],
    plantas: [[
      R('patio', 0, 0, 13.5, 3, { nombre: 'Patio entre la ruina y la casa', nombreFijo: true, celosia: { lados: ['N', 'E', 'O'], altura: 'simple', material: 'hormigon' } }),
      R('patio', 0, 3, 3, 7.5, { nombre: 'Patio entre la ruina y la casa', nombreFijo: true, celosia: { lados: ['O'], altura: 'simple', material: 'hormigon' } }),
      R('salon', 3, 3, 6, 4.5, { nombre: 'Estar', nombreFijo: true }), R('recibidor', 9, 3, 1.5, 3, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('escalera', 9, 6, 1.5, 4.5, 'Escalera de madera'),
      R('cocina', 3, 7.5, 4.5, 3), R('aseo', 7.5, 7.5, 1.5, 3),
      R('patio', 10.5, 3, 3, 7.5, { nombre: 'Patio entre la ruina y la casa', nombreFijo: true, celosia: { lados: ['E'], altura: 'simple', material: 'hormigon' } }),
      R('patio', 0, 10.5, 13.5, 3, { nombre: 'Patio entre la ruina y la casa', nombreFijo: true, celosia: { lados: ['S', 'E', 'O'], altura: 'simple', material: 'hormigon' } }),
    ], [
      R('dormitorio', 3, 3, 3.75, 3), R('dormitorio_principal', 6.75, 3, 3.75, 3, 'Dormitorio'),
      R('pasillo', 3, 6, 6, 1.5, 'Paso'), R('escalera', 9, 6, 1.5, 4.5, 'Escalera de madera'),
      R('dormitorio', 3, 7.5, 3, 3), R('bano', 6, 7.5, 3, 3),
    ]],
  },
  // ------------------------------------------------------------------ Harquitectes
  {
    id: 'ref-casa-1014', obra: 'Casa 1014', arquitecto: 'Harquitectes', anio: 2014, lugar: 'Granollers, Barcelona',
    familia: 'natura', perfiles: ['multigeneracional', 'familia_numerosa'], medianeras: ['E', 'O'], acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'mediterraneo', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.metalocus.es/es/noticias/dos-viviendas-en-una-casa-casa-1014-por-h-arquitectes', 'https://www.archdaily.com/589438/house-1014-h-arquitectes'],
    desc: 'Dos viviendas en una casa entre medianeras, en una parcela de 6,5 m de ancho que atraviesa la manzana de calle a calle. La planta baja, de 53 m de largo, es un distribuidor continuo: patio de acceso con cubierta retráctil, la parte más doméstica a la calle principal, un jardín-patio central y, al fondo, la parte ligada al acceso de vehículos con su propio patio. Los patios extremos se templan solos entre 15 y 25 °C.',
    notas: 'El ancho de 6,50 no cae en la trama (6,75 se desvía +3,8 %): se lleva a 6,375 (malla de 0,375, pieza especial), con una banda de paso de 1,50 y piezas de 4,875. El largo de 53 m → 53,25. Los patios de acceso, semicubiertos, se modelan como porches. Se interpreta la planta alta solo sobre la parte de la calle (con un patio de luz); el sótano no se modela.',
    medidas: [Md('Ancho de la parcela', 6.5, 6.375), Md('Largo de la planta baja', 53, 53.25)],
    plantas: [[
      R('porche', 0, 0, 6.375, 4.5, 'Patio de acceso · cubierta retráctil'),
      R('recibidor', 0, 4.5, 1.5, 4.5, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('salon', 1.5, 4.5, 4.875, 6, 'Estar'),
      R('escalera', 0, 9, 1.5, 4.5), R('comedor', 1.5, 10.5, 4.875, 3.75),
      R('pasillo', 0, 13.5, 1.5, 3.75, 'Distribuidor continuo'), R('aseo', 0, 17.25, 1.5, 2.25), R('cocina', 1.5, 14.25, 4.875, 5.25, 'Cocina al jardín'),
      R('patio', 0, 19.5, 6.375, 12, 'Jardín-patio central'),
      R('escalera', 0, 31.5, 1.5, 4.5, 'Escalera al sótano'), R('salon', 1.5, 31.5, 4.875, 6, 'Estar de la segunda vivienda'),
      R('pasillo', 0, 36, 1.5, 12.75, 'Distribuidor continuo'), R('cocina', 1.5, 37.5, 4.875, 3.75), R('bano', 1.5, 41.25, 3, 2.25), R('lavadero', 4.5, 41.25, 1.875, 2.25),
      R('garaje', 1.5, 43.5, 4.875, 5.25),
      R('porche', 0, 48.75, 6.375, 4.5, 'Patio de acceso de vehículos · cubierta retráctil'),
    ], [
      R('pasillo', 0, 4.5, 1.5, 4.5, 'Paso'), R('dormitorio_principal', 1.5, 4.5, 4.875, 3.75), R('bano', 1.5, 8.25, 4.875, 2.25),
      R('escalera', 0, 9, 1.5, 4.5), R('patio', 1.5, 10.5, 4.875, 3, 'Patio de luz'),
      R('pasillo', 0, 13.5, 1.5, 6, 'Paso'), R('dormitorio', 1.5, 13.5, 4.875, 3), R('dormitorio', 1.5, 16.5, 4.875, 3),
    ]],
  },
  // ------------------------------------------------------------------ Fran Silvestre
  {
    id: 'ref-ladera-castillo', obra: 'Casa en la ladera de un castillo', arquitecto: 'Fran Silvestre Arquitectos', anio: 2025, lugar: 'Ayora, Valencia',
    familia: 'line', perfiles: ['pareja', 'teletrabajo'], acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'mediterraneo', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.metalocus.es/es/noticias/abstraccion-y-tradicion-casa-en-la-ladera-de-un-castillo-por-fran-silvestre'],
    desc: 'Casa blanca de tres niveles escalonada en la ladera bajo el castillo, en una parcela de 477 m²: abajo, garaje y bodega; en medio, dos dormitorios a la calle; arriba, dos piezas hacia el valle, una de ellas el estudio junto al vacío de doble altura que aloja la circulación, paralelo al corte de la roca, y la zona de día abierta al jardín de la montaña. 230 m².',
    notas: 'Sin cotas publicadas: se dimensiona en 7,50 × 10,50 por nivel para los 230 m² (−3,2 %). La bodega excavada se modela como trastero del fondo. El vacío de doble altura se dibuja sobre la circulación de la planta intermedia.',
    medidas: [Md('Superficie construida', 230, 0, 'm2')],
    plantas: [[
      R('garaje', 0, 0, 3, 6), R('recibidor', 3, 0, 3, 3, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('escalera', 6, 0, 1.5, 4.5),
      R('distribuidor', 3, 3, 3, 3), R('aseo', 6, 4.5, 1.5, 2.25), R('trastero', 0, 6, 6, 4.5, 'Bodega excavada'), R('instalaciones', 6, 6.75, 1.5, 3.75),
    ], [
      R('dormitorio', 0, 0, 3, 4.5), R('dormitorio', 3, 0, 3, 4.5), R('escalera', 6, 0, 1.5, 4.5),
      R('pasillo', 0, 4.5, 7.5, 1.5, 'Paso'), R('bano', 0, 6, 3, 2.25), R('vestidor', 3, 6, 1.5, 2.25), R('lavadero', 0, 8.25, 4.5, 2.25),
      R('distribuidor', 4.5, 6, 3, 4.5, 'Circulación a doble altura junto a la roca'),
    ], [
      R('despacho', 0, 0, 3, 4.5, 'Estudio al valle'), R('dormitorio_principal', 3, 0, 3, 4.5, 'Dormitorio al valle'), R('escalera', 6, 0, 1.5, 4.5),
      R('pasillo', 0, 4.5, 7.5, 1.5, 'Paso'), R('salon', 0, 6, 4.5, 4.5, { nombre: 'Estar · comedor · cocina al jardín', nombreFijo: true }),
      R('doble_altura', 4.5, 6, 3, 4.5, 'Vacío de doble altura'),
    ]],
  },
  // ------------------------------------------------------------------ Ensamble Studio
  {
    id: 'ref-cyclopean', obra: 'Cyclopean House', arquitecto: 'Ensamble Studio (Antón García-Abril y Débora Mesa)', anio: 2015, lugar: 'Brookline, Massachusetts (EE. UU.)',
    familia: 'myway', perfiles: ['pareja', 'teletrabajo'], acabados: { fachada: 'hormigon_gris', carpinteria: 'oscura' }, jardin: 'bosque', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.dezeen.com/2017/10/07/cyclopean-house-parking-garage-extension-brookline-massachusetts-ensamble-studio/', 'https://www.archdaily.com/806709/cyclopean-house-ensamble-studio'],
    desc: 'Una caja de 240 m² de vivienda montada sobre un garaje existente con piezas industrializadas: cerchas de acero y paneles de piedra en bruto ensamblados como un muro ciclópeo. Un estar diáfano a doble altura bajo las cerchas; en el muro oeste, el rincón de cocina, el baño y el almacenaje; en el muro sur, la cama abatible y los armarios; una escalera metálica sube al altillo y a la cubierta-terraza.',
    notas: 'El garaje existente (taller, aparcamiento e instalaciones) se modela como porche cubierto bajo la caja, con la entrada y un aseo: no cuenta en la superficie. Sin cotas publicadas de la caja: se dimensiona en 12,75 × 12,75 para los 240 m² (−7,0 %). La doble altura se parte en piezas de 6,00 de luz.',
    medidas: [Md('Caja de vivienda', 240, 0, 'm2')],
    plantas: [[
      R('recibidor', 0, 0, 3, 3, { nombre: 'Entrada', nombreFijo: true, entrada: true }), R('escalera', 3, 0, 1.5, 4.5, 'Escalera metálica'), R('aseo', 0, 3, 3, 1.5, 'Aseo · servicios del garaje'),
      R('porche', 4.5, 0, 8.25, 12.75, 'Garaje existente · aparcamiento cubierto'), R('porche', 0, 4.5, 4.5, 8.25, 'Garaje existente · taller'),
    ], [
      R('distribuidor', 0, 0, 3, 4.5), R('escalera', 3, 0, 1.5, 4.5, 'Escalera metálica'),
      R('cocina', 0, 4.5, 3, 3.75, 'Rincón de cocina en el muro oeste'), R('bano', 0, 8.25, 3, 2.25, 'Baño en el muro oeste'), R('trastero', 0, 10.5, 3, 2.25, 'Almacenaje en el muro oeste'),
      R('pasillo', 3, 4.5, 1.5, 6, 'Paso'),
      R('salon', 4.5, 0, 6, 6, { nombre: 'Estar a doble altura bajo las cerchas', nombreFijo: true }), R('comedor', 4.5, 6, 6, 4.5, 'Comedor a doble altura'),
      R('despacho', 10.5, 0, 2.25, 10.5, 'Taller · biblioteca'),
      R('dormitorio', 3, 10.5, 9.75, 2.25, 'Cama abatible y armarios en el muro sur'),
    ], [
      R('despacho', 0, 0, 3, 4.5, 'Altillo'), R('escalera', 3, 0, 1.5, 4.5, 'Escalera metálica'),
      R('dormitorio_principal', 0, 4.5, 3, 4.5, 'Dormitorio en el altillo'), R('pasillo', 3, 4.5, 1.5, 4.5, 'Paso del altillo'),
      R('terraza', 0, 9, 4.5, 3.75, 'Cubierta-terraza'),
      R('doble_altura', 4.5, 0, 6, 6, 'Doble altura del estar'), R('doble_altura', 4.5, 6, 6, 4.5, 'Doble altura del comedor'),
    ]],
  },
  // ------------------------------------------------------------------ Guillermo Vázquez Consuegra
  {
    id: 'ref-a11', obra: 'Casa A11', arquitecto: 'Vázquez Consuegra', anio: 2019, lugar: 'Casco histórico de Sevilla',
    familia: 'natura', perfiles: ['familia', 'teletrabajo'], medianeras: ['E', 'O'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'mediterraneo', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.metalocus.es/es/noticias/organizacion-tipologica-de-las-casas-sevillanas-casa-a11-por-vazquez-consuegra', 'https://www.archdaily.com/924278/a11-house-in-sevilla-vazquez-consuegra', 'https://arquitecturaviva.com/obras/casa-a11-en-sevilla'],
    desc: 'Casa entre medianeras en una parcela muy desigual, estrecha y alargada, con solo 2,20 m de fachada. Recupera la secuencia sevillana zaguán – patio – estancia – jardín: un zaguán de doble cierre, una galería y la escalera junto a una medianera marcan un eje largo de la calle al jardín. Reutiliza la estructura de acero existente; dos vuelos sobre el jardín: en la primera planta, la terraza del comedor de verano; en la segunda, más largo, la escalera a la azotea.',
    notas: 'Frente de 2,20 → 2,25. La planta se ensancha tras el zaguán hasta 12,00 (ancho interpretado: las fuentes no lo publican) para la superficie publicada (4.811 pies² ≈ 447 m², convertida). Los vuelos se limitan a 1,50 (máximo del sistema); la azotea y la escalera volada no se modelan.',
    medidas: [Md('Frente a la calle', 2.2, 2.25), Md('Superficie (4.811 pies²)', 447, 0, 'm2')],
    plantas: [[
      R('recibidor', 0, 0, 2.25, 6, { nombre: 'Zaguán', nombreFijo: true, entrada: true }),
      R('pasillo', 0, 6, 2.25, 6, 'Galería junto al patio'), R('patio', 2.25, 6, 9.75, 6, 'Patio'),
      R('escalera', 0, 12, 1.5, 4.5), R('salon', 1.5, 12, 6, 6, 'Estancia'), R('despacho', 7.5, 12, 4.5, 6, 'Sala al patio'),
      R('aseo', 0, 16.5, 1.5, 2.25), R('despensa', 0, 18.75, 1.5, 5.25),
      R('comedor', 1.5, 18, 6, 6), R('cocina', 7.5, 18, 4.5, 3), R('lavadero', 7.5, 21, 4.5, 3, 'Lavadero · office'),
      R('patio', 0, 24, 12, 9, 'Jardín'),
    ], [
      R('escalera', 0, 12, 1.5, 4.5), R('dormitorio_principal', 1.5, 12, 6, 4.5), R('dormitorio', 7.5, 12, 4.5, 4.5),
      R('pasillo', 0, 16.5, 12, 1.5, 'Paso'),
      R('bano', 0, 18, 3, 3), R('vestidor', 0, 21, 3, 3), R('dormitorio', 3, 18, 4.5, 6), R('comedor', 7.5, 18, 4.5, 6, 'Comedor de verano'),
      R('terraza', 7.5, 24, 4.5, 1.5, 'Terraza volada sobre el jardín'),
    ], [
      R('escalera', 0, 12, 1.5, 4.5), R('despacho', 1.5, 12, 6, 4.5, 'Estudio'), R('salon', 7.5, 12, 4.5, 4.5, 'Estar alto'),
      R('pasillo', 0, 16.5, 12, 1.5, 'Paso'), R('bano', 0, 18, 3, 3), R('dormitorio', 3, 18, 4.5, 4.5),
      R('terraza', 7.5, 18, 4.5, 6, 'Terraza'),
    ]],
  },
  // ------------------------------------------------------------------ OMA / Rem Koolhaas
  {
    id: 'ref-bordeaux', obra: 'Maison à Bordeaux', arquitecto: 'OMA · Rem Koolhaas', anio: 1998, lugar: 'Floirac, Burdeos (Francia)',
    familia: 'myway', perfiles: ['familia', 'teletrabajo'], acabados: { fachada: 'hormigon', carpinteria: 'oscura' }, jardin: 'cesped', acceso: 'N',
    confianza: 'media', fuentes: ['https://www.oma.com/projects/maison-a-bordeaux', 'https://en.wikiarquitectura.com/building/house-in-bordeaux/', 'https://www.archdaily.com/104724/ad-classics-maison-bordeaux-oma'],
    desc: 'Tres casas superpuestas para un cliente en silla de ruedas: abajo, cuevas excavadas en la colina (entrada, cocina, bodega, lavadero, sala de televisión y el apartamento de servicio); en medio, el estar de vidrio, medio dentro y medio fuera, con el estudio y la terraza; arriba, la caja de hormigón con los dormitorios de los hijos y de los padres, perforada por ojos de buey. Una plataforma elevadora de 3 × 3,5 m, que es a la vez su despacho, recorre los tres niveles. 500 m².',
    notas: 'La plataforma de 3,00 × 3,50 se lleva a 3,00 × 3,375 (malla de 0,375): se dibuja como despacho en la planta baja y como vacío en las de encima (sube y baja). El estar medio fuera se modela como porche cubierto bajo la caja. La caja colgada de una viga sobre la escalera cilíndrica se apoya en el modelo sobre la planta intermedia. Sin cotas publicadas de la caja: se dimensiona en 22,50 × 7,50 para los 500 m².',
    medidas: [Md('Plataforma elevadora (ancho)', 3, 3), Md('Plataforma elevadora (largo)', 3.5, 3.375), Md('Superficie construida', 500, 0, 'm2')],
    plantas: [[
      R('recibidor', 0, 0, 4.5, 3, { nombre: 'Entrada en la cueva', nombreFijo: true, entrada: true }), R('escalera', 4.5, 0, 1.5, 4.5, 'Escalera cilíndrica'),
      R('despacho', 6, 0, 3.375, 3, 'Plataforma elevadora · despacho'), R('pasillo', 6, 3, 3.375, 1.5, 'Paso de la plataforma'), R('cocina', 9.375, 0, 4.125, 4.5),
      R('despensa', 13.5, 0, 3, 4.5), R('lavadero', 16.5, 0, 3, 4.5), R('dormitorio', 19.5, 0, 3, 4.5, 'Apartamento de servicio'),
      R('salon', 0, 3, 4.5, 6, 'Sala de televisión'), R('pasillo', 4.5, 4.5, 18, 1.5, 'Galería excavada'),
      R('aseo', 4.5, 6, 2.25, 3), R('comedor', 6.75, 6, 6.75, 3, 'Comedor de diario'), R('trastero', 13.5, 6, 3, 3, 'Bodega'), R('instalaciones', 16.5, 6, 3, 3),
      R('bano', 19.5, 6, 3, 3, 'Baño del apartamento'),
    ], [
      R('porche', 0, 0, 4.5, 7.5, 'Estar exterior bajo la caja'), R('escalera', 4.5, 0, 1.5, 4.5, 'Escalera cilíndrica'),
      R('doble_altura', 6, 0, 3.375, 3, 'Hueco de la plataforma'), R('distribuidor', 4.5, 4.5, 4.875, 3), R('pasillo', 6, 3, 3.375, 1.5, 'Paso de la plataforma'),
      R('salon', 9.375, 0, 6, 7.5, { nombre: 'Estar de vidrio', nombreFijo: true }), R('comedor', 15.375, 0, 3, 7.5),
      R('despacho', 18.375, 0, 4.125, 4.5, 'Estudio'), R('aseo', 18.375, 4.5, 4.125, 3),
    ], [
      R('dormitorio', 0, 0, 4.5, 3, 'Hijos'), R('pasillo', 0, 3, 4.5, 1.5, 'Paso de los hijos'), R('dormitorio', 0, 4.5, 4.5, 3, 'Hijos'), R('escalera', 4.5, 0, 1.5, 4.5, 'Escalera cilíndrica'),
      R('doble_altura', 6, 0, 3.375, 3, 'Hueco de la plataforma'), R('pasillo', 4.5, 4.5, 18, 1.5, 'Pasillo de la caja'), R('pasillo', 6, 3, 3.375, 1.5, 'Paso de la plataforma'),
      R('bano', 4.5, 6, 4.875, 1.5, 'Baño de los hijos'), R('bano', 9.375, 0, 3, 4.5),
      R('salon', 12.375, 0, 4.5, 4.5, 'Estar de los padres'), R('dormitorio_principal', 16.875, 0, 5.625, 4.5, 'Padres'),
      R('vestidor', 9.375, 6, 6, 1.5, 'Armarios'), R('terraza', 15.375, 6, 7.125, 1.5, 'Terraza de la caja'),
    ]],
  },
  // ------------------------------------------------------------------ Glenn Murcutt
  {
    id: 'ref-magney', obra: 'Casa Magney', arquitecto: 'Glenn Murcutt', anio: 1984, lugar: 'Bingie Point, Nueva Gales del Sur (Australia)',
    familia: 'line', perfiles: ['familia', 'multigeneracional'], acabados: { fachada: 'chapa_clara', carpinteria: 'clara' }, jardin: 'praderia', acceso: 'N',
    cubierta: { tipo: 'una', material: 'chapa', color: 'blanco', pendiente: 10, alero: 0.75 },
    confianza: 'baja', fuentes: ['https://ozetecture.org/magney-house-bingie-point', 'https://en.wikiarquitectura.com/building/magney-house/', 'https://www.architectmagazine.com/?p=263523'],
    desc: 'Un pabellón largo, de una sola crujía, abierto al norte con vidrio y cerrado al sur con un muro de ladrillo, bajo una cubierta de chapa en ala de gaviota que recoge la lluvia. Un patio abierto central lo parte en dos casas casi completas: en cada una, dormitorios y estar-comedor al norte, cocina, baño y lavadero al sur, y un paso entre ambas franjas.',
    notas: 'Sin cotas publicadas: la crujía se interpreta en 4,50 (norte) + 1,50 (paso) + 2,25 (servicios), y el largo se ajusta a la superficie construida (240; la fuente no da la unidad, se toma en m²: confianza baja). La cubierta en ala de gaviota se resume a un agua.',
    medidas: [Md('Superficie construida', 240, 0, 'm2')],
    plantas: [[
      R('dormitorio_principal', 0, 0, 4.5, 4.5), R('salon', 4.5, 0, 6, 4.5, { nombre: 'Estar · comedor al norte', nombreFijo: true, entrada: true }), R('comedor', 10.5, 0, 2.25, 4.5, 'Rincón de comer'),
      R('pasillo', 0, 4.5, 12.75, 1.5, 'Paso'),
      R('bano', 0, 6, 3, 2.25), R('vestidor', 3, 6, 3, 2.25), R('cocina', 6, 6, 4.5, 2.25), R('despensa', 10.5, 6, 2.25, 2.25, 'Mostrador al patio'),
      R('patio', 12.75, 0, 4.5, 8.25, 'Patio central abierto'),
      R('salon', 17.25, 0, 4.5, 4.5, 'Segundo estar · comedor'), R('dormitorio', 21.75, 0, 3.75, 4.5), R('dormitorio', 25.5, 0, 3.75, 4.5), R('dormitorio', 29.25, 0, 3, 4.5, 'Literas · almacén'),
      R('pasillo', 17.25, 4.5, 15, 1.5, 'Paso'),
      R('cocina', 17.25, 6, 4.5, 2.25, 'Segunda cocina'), R('bano', 21.75, 6, 3, 2.25, 'Ducha · aseo'), R('lavadero', 24.75, 6, 3, 2.25), R('trastero', 27.75, 6, 4.5, 2.25),
    ]],
  },
];

export const REFERENCIAS_ACT = prepararReferencias(DEF);
