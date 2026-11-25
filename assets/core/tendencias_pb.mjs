// Tendencias (colección «tendencias»), parte 1: viviendas en planta baja. Modelos propios inspirados en los programas
// y tipos más demandados; no se copian planos de terceros. Cada modelo lleva coleccion: 'tendencias'.
// Fuentes y señal extraída de cada una: docs/TENDENCIAS.md. Convenio: y crece hacia el sur, x hacia el este; acceso
// por el norte salvo indicación; estancias de día al sur; todo en la trama de 0,75 m (casi todo en el módulo de 1,50).
const R = (tipo, x, y, w, h, extra) => Object.assign({ tipo, x, y, w, h }, typeof extra === 'string' ? { nombre: extra, nombreFijo: true } : extra || {});
const NF = (nombre, extra) => Object.assign({ nombre, nombreFijo: true }, extra || {});
const T = (d) => Object.assign({ coleccion: 'tendencias' }, d);

export const TENDENCIAS_PB = [
  // 1 · ADU / casita de jardín
  T({
    id: 'ten-pb-adu-34', nombre: 'ADU de jardín 34', familia: 'basic', perfiles: ['solo', 'inversor', 'multigeneracional'], acceso: 'N',
    desc: 'Tendencia: la vivienda accesoria en el jardín (ADU) para un hijo, los abuelos o alquiler, que crece en los portales de planos. Pieza de 6,75 × 6,00 m: vestíbulo central que reparte baño y dormitorio, cocina abierta al estar y porche corrido al sur. Una sola agua hacia el jardín.',
    acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'cesped', cubierta: { tipo: 'una', material: 'chapa', color: 'grafito', alero: 0.5 },
    plantas: [[
      R('bano', 0, 0, 1.5, 2.25), R('recibidor', 1.5, 0, 2.25, 2.25, 'Entrada'), R('cocina', 3.75, 0, 3, 2.25),
      R('dormitorio', 0, 2.25, 3, 3.75), R('salon', 3, 2.25, 3.75, 3.75, 'Estar · comedor'),
      R('porche', 0, 6, 6.75, 1.5),
    ]],
  }),
  // 2 · Casita accesible para mayores
  T({
    id: 'ten-pb-mayores-48', nombre: 'Casita accesible para mayores 48', familia: 'basic', perfiles: ['senior', 'multigeneracional', 'solo'], acceso: 'N',
    desc: 'Tendencia: envejecer en casa y la vivienda de los abuelos junto a la familia. Una planta sin escalones de 8,25 × 6,00 m: vestíbulo de 2,25 m que da paso al baño adaptado (giro de 1,50 m) y al dormitorio con puertas de 0,825; cocina abierta al estar con despensa-lavadora, y porche a cota del salón.',
    acabados: { fachada: 'mineral', carpinteria: 'clara' }, jardin: 'mediterraneo',
    plantas: [[
      R('despensa', 0, 0, 1.5, 2.25, 'Despensa · lavadora'), R('cocina', 1.5, 0, 2.25, 2.25), R('recibidor', 3.75, 0, 2.25, 2.25, 'Vestíbulo'), R('bano', 6, 0, 2.25, 2.25, 'Baño adaptado'),
      R('salon', 0, 2.25, 4.5, 3.75, 'Estar · comedor'), R('dormitorio_principal', 4.5, 2.25, 3.75, 3.75, 'Dormitorio'),
      R('porche', 0, 6, 8.25, 2.25, 'Porche a cota'),
    ]],
  }),
  // 3 · Refugio a dos aguas
  T({
    id: 'ten-pb-refugio-60', nombre: 'Refugio a dos aguas 60', familia: 'myway', perfiles: ['pareja', 'senior', 'inversor'], acceso: 'N',
    desc: 'Tendencia: la «modern cottage» y la cabaña rústica de dos dormitorios con chimenea, de las más citadas en la prensa de casas industrializadas. Cuadrado de 9,75 × 7,50 m bajo dos aguas: los dos dormitorios y el baño al oeste sobre un paso de 1,50; al este, cocina al norte y salón con chimenea de 24 m² bajo la cubierta, abierto al porche.',
    acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'bosque', cubierta: { tipo: 'dos', material: 'chapa', color: 'grafito', pendiente: 35, alero: 0.5 },
    plantas: [[
      R('dormitorio_principal', 0, 0, 3.75, 3), R('bano', 0, 3, 3.75, 1.5), R('dormitorio', 0, 4.5, 3.75, 3),
      R('recibidor', 3.75, 0, 1.5, 1.5, 'Entrada'), R('pasillo', 3.75, 1.5, 1.5, 6, 'Paso'),
      R('cocina', 5.25, 0, 4.5, 2.25), R('salon', 5.25, 2.25, 4.5, 5.25, 'Salón · chimenea'),
      R('porche', 5.25, 7.5, 4.5, 2.25),
    ]],
  }),
  // 4 · Compacta de tres dormitorios
  T({
    id: 'ten-pb-compacta-3d', nombre: 'Compacta 3D 80', familia: 'basic', perfiles: ['familia', 'pareja', 'inversor'], acceso: 'N',
    desc: 'Tendencia: «right-sizing» (la mitad de los planos vendidos en 2025 son de 90 a 185 m² construidos) y la casa industrializada de 75–80 m² con tres dormitorios, la más repetida en España. Volumen de 11,25 × 8,25 m: baño, aseo-lavadora y vestíbulo al norte; pasillo de 1,50 que reparte los tres dormitorios; salón-comedor en la esquina sureste abierto a la cocina.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'praderia',
    plantas: [[
      R('dormitorio', 0, 0, 3, 3), R('bano', 3, 0, 1.5, 3), R('aseo', 4.5, 0, 1.5, 3, 'Aseo · lavadora'), R('recibidor', 6, 0, 1.5, 3, 'Vestíbulo'), R('cocina', 7.5, 0, 3.75, 3),
      R('pasillo', 0, 3, 7.5, 1.5),
      R('dormitorio_principal', 0, 4.5, 3.75, 3.75), R('dormitorio', 3.75, 4.5, 3.75, 3.75), R('salon', 7.5, 3, 3.75, 5.25, 'Salón · comedor'),
    ]],
  }),
  // 5 · Dormitorios separados (split-bedroom)
  T({
    id: 'ten-pb-split-3d', nombre: 'Split 3D · suite apartada', familia: 'line', perfiles: ['familia', 'teletrabajo'], acceso: 'N',
    desc: 'Tendencia: el «split-bedroom», presente en la mayoría de los cien planos más populares: la suite en un extremo y los hijos en el otro, con la zona de día en medio. Ala oeste con dos dormitorios, baño y armario sobre su paso; en el centro cocina con isla, vestíbulo con aseo de cortesía y salón-comedor de 37 m² al porche; al este, la suite con antesala, baño y vestidor.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'mediterraneo',
    plantas: [[
      R('dormitorio', 0, 0, 3.75, 3.75), R('dormitorio', 0, 3.75, 3.75, 3.75), R('bano', 3.75, 0, 1.5, 2.25, 'Baño hijos'), R('pasillo', 3.75, 2.25, 1.5, 3, 'Paso de dormitorios'), R('vestidor', 3.75, 5.25, 1.5, 2.25, 'Armario'),
      R('cocina', 5.25, 0, 4.5, 3, 'Cocina · isla'), R('recibidor', 9.75, 0, 2.25, 3, 'Vestíbulo'), R('aseo', 12, 0, 1.5, 3, 'Aseo de cortesía'),
      R('comedor', 5.25, 3, 3.75, 4.5), R('salon', 9, 3, 4.5, 4.5),
      R('bano', 13.5, 0, 3, 3, NF('Baño suite', { suite: true })), R('vestidor', 16.5, 0, 3, 3), R('pasillo', 13.5, 3, 1.5, 4.5, 'Antesala suite'), R('dormitorio_principal', 15, 3, 4.5, 4.5, 'Suite'),
      R('porche', 5.25, 7.5, 8.25, 2.25),
    ]],
  }),
  // 6 · Porche envolvente
  T({
    id: 'ten-pb-porche-envolvente', nombre: 'Casa de porche envolvente', familia: 'line', perfiles: ['pareja', 'senior', 'teletrabajo'], acceso: 'N',
    desc: 'Tendencia: «indoor-outdoor flow» y el porche envolvente de la casa de campo (el porche delantero es deseado por el 81 % de los compradores). Volumen de 12,75 × 8,25 m rodeado al sur y al este por un porche en L de 2,25 m. Vestíbulo central, cocina con lavadero al norte, salón de 27 m² en la esquina sureste abierto a los dos porches, suite con baño y armario de ropa blanca, y segundo dormitorio.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'praderia', cubierta: { tipo: 'cuatro', material: 'teja', color: 'arena', pendiente: 25, alero: 0.5 },
    plantas: [[
      R('dormitorio', 0, 0, 3.75, 3), R('bano', 3.75, 0, 2.25, 3), R('recibidor', 6, 0, 1.5, 3, 'Vestíbulo'), R('cocina', 7.5, 0, 3.75, 3), R('lavadero', 11.25, 0, 1.5, 3),
      R('pasillo', 0, 3, 7.5, 1.5),
      R('dormitorio_principal', 0, 4.5, 3.75, 3.75), R('bano', 3.75, 4.5, 2.25, 3.75, NF('Baño suite', { suite: true })), R('vestidor', 6, 4.5, 1.5, 3.75, 'Armario · ropa blanca'),
      R('salon', 7.5, 3, 5.25, 5.25, 'Salón · comedor'),
      R('porche', 0, 8.25, 12.75, 2.25, 'Porche sur'), R('porche', 12.75, 0, 2.25, 10.5, 'Porche este'),
    ]],
  }),
  // 7 · Farmhouse con garaje doble y mudroom
  T({
    id: 'ten-pb-farmhouse', nombre: 'Farmhouse con garaje y mudroom', familia: 'line', perfiles: ['familia', 'familia_numerosa'], acceso: 'N',
    desc: 'Tendencia: la «modern farmhouse», un tercio de los planos vendidos en 2025, con lo que más se pide: lavadero (86 %), despensa (80 %) y garaje con almacenaje (81 %). Del garaje de dos plazas se entra por el mudroom-lavadero a la cocina con isla y su despensa; gran salón-comedor de 30 m² al porche trasero; suite tras el garaje, lejos de los hijos, que tienen su ala con baño al este.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped', cubierta: { tipo: 'dos', material: 'chapa', color: 'grafito', pendiente: 30, alero: 0.5 },
    plantas: [[
      R('garaje', 0, 0, 6, 6, 'Garaje · 2 plazas'), R('lavadero', 6, 0, 2.25, 3, 'Mudroom · lavadero'), R('despensa', 6, 3, 2.25, 3),
      R('cocina', 8.25, 0, 4.5, 4.5, 'Cocina · isla'), R('recibidor', 12.75, 0, 2.25, 4.5, 'Vestíbulo'),
      R('salon', 8.25, 4.5, 6.75, 4.5, 'Salón · comedor'),
      R('vestidor', 0, 6, 3.75, 2.25), R('bano', 0, 8.25, 3.75, 2.25, NF('Baño suite', { suite: true })), R('dormitorio_principal', 3.75, 6, 4.5, 4.5, 'Suite'),
      R('pasillo', 15, 0, 1.5, 9, 'Pasillo de dormitorios'),
      R('dormitorio', 16.5, 0, 3.75, 3.75), R('bano', 16.5, 3.75, 3.75, 1.5, 'Baño hijos'), R('dormitorio', 16.5, 5.25, 3.75, 3.75),
      R('porche', 8.25, 9, 6.75, 2.25, 'Porche trasero'),
    ]],
  }),
  // 8 · Teletrabajo con despacho a la entrada
  T({
    id: 'ten-pb-teletrabajo', nombre: 'Teletrabajo · despacho a la entrada', familia: 'basic', perfiles: ['teletrabajo', 'pareja'], acceso: 'N',
    desc: 'Tendencia: el despacho en casa, que sigue en los planos más vendidos tras el teletrabajo. Aquí el despacho se abre al vestíbulo, junto a un aseo de cortesía: se recibe a un cliente sin cruzar la casa. La zona de día queda al suroeste (salón y cocina-comedor abiertos) y la de noche al este, tras un pasillo con lavadero, baño y armarios.',
    acabados: { fachada: 'hormigon', carpinteria: 'oscura' }, jardin: 'praderia',
    plantas: [[
      R('despacho', 0, 0, 4.5, 3.75), R('recibidor', 4.5, 0, 2.25, 3.75, 'Vestíbulo'), R('aseo', 6.75, 0, 1.5, 2.25, 'Aseo de cortesía'), R('lavadero', 8.25, 0, 2.25, 2.25), R('bano', 10.5, 0, 3, 2.25), R('vestidor', 13.5, 0, 3, 2.25, 'Armarios'),
      R('pasillo', 6.75, 2.25, 9.75, 1.5),
      R('salon', 0, 3.75, 6, 4.5), R('cocina', 6, 3.75, 3.75, 4.5, 'Cocina · comedor'), R('dormitorio', 9.75, 3.75, 3, 4.5), R('dormitorio_principal', 12.75, 3.75, 3.75, 4.5),
    ]],
  }),
  // 9 · Dos suites
  T({
    id: 'ten-pb-dos-suites', nombre: 'Dos suites en planta', familia: 'line', perfiles: ['multigeneracional', 'senior', 'pareja'], acceso: 'N',
    desc: 'Tendencia: las dos suites principales (el 55 % de los compradores las prefiere) para familias de varias generaciones o parejas con horarios distintos. Una suite completa en cada extremo —antesala, baño y vestidor— y en el centro la vida común: cocina, vestíbulo con aseo, comedor y salón al porche.',
    acabados: { fachada: 'tapial', carpinteria: 'madera' }, jardin: 'mediterraneo', cubierta: { tipo: 'una', material: 'teja', color: 'mixta', alero: 0.75 },
    plantas: [[
      R('vestidor', 0, 0, 3, 3, 'Vestidor 1'), R('bano', 3, 0, 3, 3, NF('Baño suite 1', { suite: true })), R('dormitorio_principal', 0, 3, 4.5, 4.5, 'Suite 1'), R('pasillo', 4.5, 3, 1.5, 4.5, 'Antesala suite 1'),
      R('cocina', 6, 0, 4.5, 3), R('recibidor', 10.5, 0, 2.25, 3, 'Vestíbulo'), R('aseo', 12.75, 0, 1.5, 3),
      R('comedor', 6, 3, 3.75, 4.5), R('salon', 9.75, 3, 4.5, 4.5),
      R('bano', 14.25, 0, 3, 3, NF('Baño suite 2', { suite: true })), R('vestidor', 17.25, 0, 3, 3, 'Vestidor 2'), R('pasillo', 14.25, 3, 1.5, 4.5, 'Antesala suite 2'), R('dormitorio_principal', 15.75, 3, 4.5, 4.5, 'Suite 2'),
      R('porche', 6, 7.5, 8.25, 2.25),
    ]],
  }),
  // 10 · U con patio-jardín
  T({
    id: 'ten-pb-u-patio', nombre: 'Casa en U · patio de pérgola', familia: 'natura', perfiles: ['familia', 'teletrabajo'], acceso: 'N',
    desc: 'Tendencia: la casa que gira hacia un exterior propio y protegido («indoor-outdoor flow»). Tres crujías en U abrazan un patio con pérgola abierto al sur: día al oeste (cocina, comedor y salón al patio), entrada y servicios al norte sobre una galería, y noche al este con galería propia, dos dormitorios, baño y suite.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'madera' }, jardin: 'mediterraneo',
    plantas: [[
      R('cocina', 0, 0, 4.5, 2.25), R('recibidor', 4.5, 0, 2.25, 2.25, 'Vestíbulo'), R('lavadero', 6.75, 0, 2.25, 2.25), R('bano', 9, 0, 3, 2.25),
      R('pasillo', 4.5, 2.25, 7.5, 1.5, 'Galería norte'),
      R('comedor', 0, 2.25, 4.5, 4.5), R('salon', 0, 6.75, 4.5, 4.5),
      R('patio', 4.5, 3.75, 6, 7.5, NF('Patio', { pergola: true })),
      R('dormitorio', 12, 0, 4.5, 3.75), R('pasillo', 10.5, 3.75, 1.5, 7.5, 'Galería este'),
      R('dormitorio', 12, 3.75, 4.5, 3), R('dormitorio_principal', 12, 6.75, 3, 4.5), R('bano', 15, 6.75, 1.5, 4.5, NF('Baño suite', { suite: true })),
    ]],
  }),
  // 11 · Casa en H
  T({
    id: 'ten-pb-h-dos-patios', nombre: 'Casa en H · dos patios', familia: 'natura', perfiles: ['familia', 'senior'], acceso: 'N',
    desc: 'Tendencia: «zoned open concept»: día y noche en dos alas separadas por un vestíbulo-galería acristalado entre dos patios, uno de acceso al norte y otro de jardín al sur. Ala de día al oeste (cocina con lavadero y despensa, comedor y salón); ala de noche al este con galería sobre los patios, tres dormitorios, baño y suite.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'zen',
    plantas: [[
      R('cocina', 0, 0, 4.5, 4.5, 'Cocina · office'), R('lavadero', 4.5, 0, 1.5, 2.25), R('despensa', 4.5, 2.25, 1.5, 2.25),
      R('comedor', 0, 4.5, 6, 3), R('salon', 0, 7.5, 6, 4.5),
      R('patio', 6, 0, 3, 4.5, 'Patio de acceso'), R('recibidor', 6, 4.5, 3, 3, 'Vestíbulo · galería'), R('patio', 6, 7.5, 3, 4.5, 'Patio de jardín'),
      R('pasillo', 9, 0, 1.5, 12, 'Galería de dormitorios'),
      R('dormitorio', 10.5, 0, 4.5, 3.75), R('bano', 10.5, 3.75, 4.5, 1.5), R('dormitorio', 10.5, 5.25, 4.5, 3), R('dormitorio_principal', 10.5, 8.25, 4.5, 3.75),
      R('bano', 10.5, 12, 4.5, 1.5, NF('Baño suite', { suite: true })),
    ]],
  }),
  // 12 · Entre medianeras con dos patios
  T({
    id: 'ten-pb-medianeras-patios', nombre: 'Casa de pueblo · dos patios', familia: 'natura', perfiles: ['familia', 'pareja', 'senior'], acceso: 'N', medianeras: ['E', 'O'],
    desc: 'Tendencia: volver al casco y a la casa de una planta entre medianeras, con los patios como pulmón. Solar de 9 m de frente: patio de acceso a la calle al que se asoman los dormitorios; pasillo que reparte baños y lavadero, que miran al patio central; y al fondo cocina, comedor y salón entre el patio y el jardín. Las medianeras quedan ciegas: toda la luz entra por norte y sur.',
    acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'huerto', cubierta: { tipo: 'plana' },
    plantas: [[
      R('patio', 0, 0, 9, 3, 'Patio de acceso'),
      R('dormitorio', 0, 3, 3, 3.75), R('recibidor', 3, 3, 1.5, 3.75, 'Zaguán'), R('dormitorio_principal', 4.5, 3, 4.5, 3.75),
      R('pasillo', 0, 6.75, 9, 1.5),
      R('bano', 0, 8.25, 3, 2.25), R('lavadero', 3, 8.25, 1.5, 2.25), R('bano', 4.5, 8.25, 3, 2.25),
      R('pasillo', 7.5, 8.25, 1.5, 6, 'Paso'),
      R('patio', 0, 10.5, 7.5, 3.75, 'Patio central'),
      R('cocina', 0, 14.25, 4.5, 3), R('comedor', 4.5, 14.25, 4.5, 3),
      R('salon', 0, 17.25, 9, 4.5),
    ]],
  }),
  // 13 · Cortijo
  T({
    id: 'ten-pb-cortijo', nombre: 'Cortijo · patio de labor', familia: 'natura', perfiles: ['familia', 'multigeneracional', 'senior'], acceso: 'N',
    desc: 'Tendencia: la casa de campo de una planta y la vuelta a lo rural. Cortijo en U alrededor de un patio de labor con porche emparrado: zaguán con galería, cocina de diario con despensa y lavadero, comedor y salón con chimenea al oeste; dormitorios al norte y al este con dos baños, todos a galerías que miran al patio.',
    acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'huerto', cubierta: { tipo: 'dos', material: 'teja', color: 'roja', pendiente: 30, alero: 0.5 },
    plantas: [[
      R('despensa', 0, 0, 1.5, 2.25), R('lavadero', 0, 2.25, 1.5, 2.25), R('cocina', 1.5, 0, 4.5, 4.5, 'Cocina de diario'), R('recibidor', 6, 0, 3, 4.5, 'Zaguán'),
      R('dormitorio', 9, 0, 3.75, 4.5), R('bano', 12.75, 0, 2.25, 4.5, 'Baño'),
      R('pasillo', 6, 4.5, 9, 1.5, 'Galería norte'),
      R('comedor', 0, 4.5, 6, 3.75), R('salon', 0, 8.25, 6, 5.25, 'Salón · chimenea'),
      R('patio', 6, 6, 4.5, 5.25, 'Patio de labor'), R('porche', 6, 11.25, 4.5, 2.25, NF('Porche · emparrado', { pergola: true })),
      R('pasillo', 10.5, 6, 1.5, 7.5, 'Galería este'),
      R('dormitorio', 12, 6, 3, 3.75), R('bano', 12, 9.75, 3, 1.5), R('dormitorio_principal', 12, 11.25, 3, 4.5),
    ]],
  }),
  // 14 · Porche-cochera
  T({
    id: 'ten-pb-cochera', nombre: 'Casa con porche-cochera', familia: 'line', perfiles: ['familia', 'pareja'], acceso: 'N',
    desc: 'Tendencia: aparcar a cubierto sin pagar un garaje cerrado. Un porche-cochera de 6 × 6 m para dos coches protege la llegada y la puerta de casa. Barra de 14,25 m con cocina, vestíbulo, aseo, lavadero y baño al norte; salón-comedor al suroeste y tres dormitorios al sur sobre un pasillo de 1,50.',
    acabados: { fachada: 'hormigon_gris', carpinteria: 'oscura' }, jardin: 'cesped',
    plantas: [[
      R('porche', 0, 0, 6, 6, 'Porche · cochera 2 plazas'),
      R('cocina', 0, 6, 4.5, 2.25), R('recibidor', 4.5, 6, 2.25, 2.25, 'Vestíbulo'), R('aseo', 6.75, 6, 1.5, 2.25), R('lavadero', 8.25, 6, 2.25, 2.25), R('bano', 10.5, 6, 3.75, 2.25),
      R('salon', 0, 8.25, 4.5, 5.25, 'Salón · comedor'), R('pasillo', 4.5, 8.25, 9.75, 1.5),
      R('dormitorio', 4.5, 9.75, 3, 3.75), R('dormitorio', 7.5, 9.75, 3, 3.75), R('dormitorio_principal', 10.5, 9.75, 3.75, 3.75),
    ]],
  }),
  // 15 · Granero (barndominium) con garaje-taller
  T({
    id: 'ten-pb-granero-taller', nombre: 'Granero con garaje-taller', familia: 'myway', perfiles: ['pareja', 'teletrabajo', 'familia'], acceso: 'N',
    desc: 'Tendencia: el «barndominium», que pasa del 8 al 11 % de los planos vendidos: una nave a dos aguas con gran salón bajo cubierta y un garaje-taller generoso. Al oeste, garaje-taller de 6 × 9 m con mudroom-lavadero que entra a la cocina; en el centro, cocina con isla y gran salón de 36 m²; al este, entrada, paso y dos dormitorios con baño. Aseo y almacén en la junta entre taller y casa.',
    acabados: { fachada: 'chapa', carpinteria: 'oscura' }, jardin: 'praderia', cubierta: { tipo: 'dos', material: 'chapa', color: 'grafito', pendiente: 25, alero: 0.5 },
    plantas: [[
      R('garaje', 0, 0, 6, 9, NF('Garaje · taller', { taller: true })), R('lavadero', 6, 0, 1.5, 3, 'Mudroom · lavadero'), R('trastero', 6, 3, 1.5, 3, 'Almacén · leñero'), R('aseo', 6, 6, 1.5, 3),
      R('cocina', 7.5, 0, 6, 3, 'Cocina · isla'), R('salon', 7.5, 3, 6, 6, 'Gran salón bajo cubierta'),
      R('recibidor', 13.5, 0, 1.5, 3, 'Entrada'), R('pasillo', 13.5, 3, 1.5, 6, 'Paso'),
      R('dormitorio', 15, 0, 4.5, 3.75), R('bano', 15, 3.75, 4.5, 1.5), R('dormitorio_principal', 15, 5.25, 4.5, 3.75),
    ]],
  }),
  // 16 · Piscina y quincho
  T({
    id: 'ten-pb-piscina-quincho', nombre: 'Mediterránea con piscina y quincho', familia: 'line', perfiles: ['familia', 'pareja'], acceso: 'N',
    desc: 'Tendencia: la vida fuera —patio, cocina exterior y piscina— entre lo más pedido (el patio, por el 86 %). Barra de 16,50 m con servicios al norte y todas las estancias al sur, abiertas a una terraza corrida; delante, piscina de 9 × 3 m y quincho cubierto con barbacoa frente a la suite.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'clara' }, jardin: 'mediterraneo',
    plantas: [[
      R('cocina', 0, 0, 5.25, 2.25), R('recibidor', 5.25, 0, 2.25, 2.25, 'Vestíbulo'), R('aseo', 7.5, 0, 1.5, 2.25), R('lavadero', 9, 0, 2.25, 2.25), R('bano', 11.25, 0, 3, 2.25), R('vestidor', 14.25, 0, 2.25, 2.25, 'Armarios'),
      R('salon', 0, 2.25, 5.25, 5.25, 'Salón · comedor'), R('pasillo', 5.25, 2.25, 11.25, 1.5),
      R('dormitorio', 5.25, 3.75, 3, 3.75), R('dormitorio', 8.25, 3.75, 3, 3.75), R('dormitorio_principal', 11.25, 3.75, 5.25, 3.75),
      R('terraza', 0, 7.5, 16.5, 2.25), R('piscina', 0, 9.75, 9, 3), R('quincho', 11.25, 9.75, 5.25, 3.75, 'Quincho · barbacoa'),
    ]],
  }),
  // 17 · Familiar de cuatro dormitorios en L
  T({
    id: 'ten-pb-familiar-4d', nombre: 'Familiar 4D en L', familia: 'line', perfiles: ['familia', 'familia_numerosa'], acceso: 'N',
    desc: 'Tendencia: la casa de una planta con 3–4 dormitorios y suite apartada, el perfil más repetido entre los planos más populares. L con el ala de los hijos al oeste (tres dormitorios y baño sobre una galería que mira al porche) y una barra de día con vestíbulo, cocina con isla, lavadero-despensa, comedor y salón; la suite con antesala, baño y vestidor cierra la barra al este.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped',
    plantas: [[
      R('dormitorio', 0, 0, 3.75, 3.75), R('dormitorio', 0, 3.75, 3.75, 3.75), R('bano', 0, 7.5, 3.75, 1.5, 'Baño hijos'), R('dormitorio', 0, 9, 3.75, 3.75),
      R('pasillo', 3.75, 0, 1.5, 12.75, 'Galería de dormitorios'),
      R('recibidor', 5.25, 0, 2.25, 3, 'Vestíbulo'), R('cocina', 7.5, 0, 4.5, 3, 'Cocina · isla'), R('lavadero', 12, 0, 2.25, 3, 'Lavadero · despensa'),
      R('comedor', 5.25, 3, 4.5, 4.5), R('salon', 9.75, 3, 4.5, 4.5),
      R('bano', 14.25, 0, 3, 3, NF('Baño suite', { suite: true })), R('vestidor', 17.25, 0, 3, 3), R('pasillo', 14.25, 3, 1.5, 4.5, 'Antesala suite'), R('dormitorio_principal', 15.75, 3, 4.5, 4.5, 'Suite'),
      R('porche', 5.25, 7.5, 9, 3),
    ]],
  }),
  // 18 · Familia numerosa en U
  T({
    id: 'ten-pb-grande-5d', nombre: 'Familia numerosa 5D en U', familia: 'natura', perfiles: ['familia_numerosa', 'multigeneracional'], acceso: 'N',
    desc: 'Tendencia: la casa grande de una planta con despacho y dormitorio de invitados (los planos de 185–280 m² siguen siendo un tercio de las ventas). U abierta al sur alrededor de un porche: hijos al oeste con su baño; día en el centro (cocina con isla, lavadero-despensa, aseo, comedor y salón); al este, despacho, invitados con baño y la suite con vestidor y baño al fondo.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'oscura' }, jardin: 'mediterraneo', cubierta: { tipo: 'plana' },
    plantas: [[
      R('dormitorio', 0, 0, 3.75, 3.75), R('dormitorio', 0, 3.75, 3.75, 3.75), R('bano', 0, 7.5, 3.75, 1.5, 'Baño hijos'), R('dormitorio', 0, 9, 3.75, 3.75),
      R('pasillo', 3.75, 0, 1.5, 12.75, 'Galería oeste'),
      R('recibidor', 5.25, 0, 2.25, 3, 'Vestíbulo'), R('cocina', 7.5, 0, 4.5, 3, 'Cocina · isla'), R('lavadero', 12, 0, 2.25, 3, 'Lavadero · despensa'), R('aseo', 14.25, 0, 1.5, 3),
      R('comedor', 5.25, 3, 4.5, 4.5), R('salon', 9.75, 3, 6, 4.5),
      R('pasillo', 15.75, 0, 1.5, 11.25, 'Galería este'),
      R('despacho', 17.25, 0, 3.75, 3), R('dormitorio', 17.25, 3, 3.75, 3.75, 'Invitados'), R('bano', 17.25, 6.75, 3.75, 1.5), R('dormitorio_principal', 17.25, 8.25, 3.75, 4.5, 'Suite'),
      R('vestidor', 15.75, 11.25, 1.5, 1.5), R('bano', 15.75, 12.75, 5.25, 1.5, NF('Baño suite', { suite: true })),
      R('porche', 5.25, 7.5, 10.5, 3),
    ]],
  }),
  // 19 · Bienestar
  T({
    id: 'ten-pb-bienestar', nombre: 'Casa bienestar · patio zen', familia: 'natura', perfiles: ['pareja', 'teletrabajo', 'senior'], acceso: 'N',
    desc: 'Tendencia: las salas de bienestar (yoga, gimnasio, sauna) apartadas del ruido y con luz natural. Al final del pasillo, una sala de 17 m² abierta a un patio zen que también da al dormitorio principal; baño-spa con ducha y sauna, aseo, lavadero y armarios al norte; día al oeste con cocina-comedor y salón de 30 m².',
    acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'zen',
    plantas: [[
      R('cocina', 0, 0, 4.5, 3.75, 'Cocina · comedor'), R('recibidor', 4.5, 0, 2.25, 3.75, 'Vestíbulo'), R('salon', 0, 3.75, 6.75, 4.5),
      R('aseo', 6.75, 0, 1.5, 2.25), R('lavadero', 8.25, 0, 2.25, 2.25), R('bano', 10.5, 0, 3.75, 2.25, 'Baño spa · ducha y sauna'), R('vestidor', 14.25, 0, 1.5, 2.25, 'Armarios'),
      R('pasillo', 6.75, 2.25, 9, 1.5),
      R('dormitorio', 6.75, 3.75, 3.75, 4.5), R('dormitorio_principal', 10.5, 3.75, 5.25, 4.5),
      R('despacho', 15.75, 0, 3.75, 4.5, 'Sala de bienestar · yoga'), R('patio', 15.75, 4.5, 3.75, 3.75, 'Patio zen'),
    ]],
  }),
  // 20 · Cubo pasivo
  T({
    id: 'ten-pb-cubo-pasivo', nombre: 'Cubo pasivo 9 × 9', familia: 'basic', perfiles: ['pareja', 'senior', 'inversor'], acceso: 'N',
    desc: 'Tendencia: «better, not bigger» y la eficiencia (ventanas de alta prestación, entre lo más deseado). Cuadrado de 9 × 9 m, la forma con menos fachada por m²: cortavientos a la entrada, distribuidor central con el cuarto de ventilación con recuperación de calor, dos dormitorios y baño al oeste, y al este la secuencia cocina-comedor-salón con el salón en la esquina sureste.',
    acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'praderia',
    plantas: [[
      R('dormitorio', 0, 0, 3.75, 3.75), R('bano', 0, 3.75, 3.75, 1.5), R('dormitorio_principal', 0, 5.25, 3.75, 3.75),
      R('recibidor', 3.75, 0, 1.5, 2.25, 'Cortavientos'), R('distribuidor', 3.75, 2.25, 1.5, 4.5), R('instalaciones', 3.75, 6.75, 1.5, 2.25, 'Ventilación · recuperador'),
      R('cocina', 5.25, 0, 3.75, 3), R('comedor', 5.25, 3, 3.75, 2.25), R('salon', 5.25, 5.25, 3.75, 3.75),
    ]],
  }),
  // 21 · Pareada de una planta
  T({
    id: 'ten-pb-pareada', nombre: 'Pareada de una planta con garaje', familia: 'line', perfiles: ['pareja', 'senior', 'teletrabajo'], acceso: 'N', medianeras: ['E'],
    desc: 'Tendencia: el adosado o pareado, la vivienda unifamiliar más común en España (28 % de los hogares de la encuesta OCU), aquí en una sola planta. Medianera al este y frente de 15 m: garaje de una plaza con entrada por el lavadero a la cocina; despacho y salón-comedor al porche; dos dormitorios y baño al este, con luz norte y sur porque la medianera queda ciega.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped',
    plantas: [[
      R('garaje', 0, 0, 3, 6.75, 'Garaje · 1 plaza'), R('lavadero', 3, 0, 1.5, 2.25), R('cocina', 4.5, 0, 3, 2.25), R('recibidor', 7.5, 0, 1.5, 2.25, 'Vestíbulo'), R('bano', 9, 0, 2.25, 2.25),
      R('despacho', 3, 2.25, 3, 4.5), R('salon', 6, 2.25, 3.75, 4.5, 'Salón · comedor'), R('pasillo', 9.75, 2.25, 1.5, 4.5),
      R('dormitorio', 11.25, 0, 3.75, 3.75), R('dormitorio_principal', 11.25, 3.75, 3.75, 3),
      R('porche', 3, 6.75, 8.25, 2.25),
    ]],
  }),
  // 22 · Volúmenes desplazados
  T({
    id: 'ten-pb-desplazada', nombre: 'Casa de volúmenes desplazados', familia: 'basic', perfiles: ['familia', 'pareja'], acceso: 'N',
    desc: 'Tendencia: la zonificación día/noche llevada al volumen. Dos piezas desplazadas 2,25 m: la de día, más profunda, con cocina, despensa y lavadero, vestíbulo y un salón-comedor de 34 m² que avanza hacia la terraza; la de noche, retranqueada, forma un patio de llegada y alinea tres dormitorios, baño y suite sobre un pasillo con luz norte.',
    acabados: { fachada: 'hormigon_gris', carpinteria: 'oscura' }, jardin: 'praderia',
    plantas: [[
      R('lavadero', 0, 0, 1.5, 1.5), R('despensa', 0, 1.5, 1.5, 2.25), R('cocina', 1.5, 0, 3, 3.75), R('recibidor', 4.5, 0, 3, 3.75, 'Vestíbulo'),
      R('salon', 0, 3.75, 7.5, 4.5, 'Salón · comedor'), R('terraza', 0, 8.25, 7.5, 2.25),
      R('pasillo', 7.5, 2.25, 8.25, 1.5),
      R('dormitorio', 7.5, 3.75, 3, 3.75), R('bano', 10.5, 3.75, 2.25, 3.75), R('dormitorio', 12.75, 3.75, 3, 3.75),
      R('dormitorio_principal', 15.75, 2.25, 3.75, 3.75), R('bano', 15.75, 6, 3.75, 1.5, NF('Baño suite', { suite: true })),
    ]],
  }),
  // 23 · Villa vacacional de tres suites
  T({
    id: 'ten-pb-vacacional-suites', nombre: 'Villa vacacional · tres suites', familia: 'line', perfiles: ['inversor', 'familia', 'multigeneracional'], acceso: 'N',
    desc: 'Tendencia: la casa vacacional o de alquiler turístico donde cada dormitorio tiene su baño. Tres suites iguales al sur sobre un pasillo, con los baños emparejados para compartir bajantes; al norte, lavadero de ropa de cama, almacén de maletas y aseo; día al oeste con cocina y salón-comedor de 31 m², terraza corrida, piscina y chill out.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'madera' }, jardin: 'mediterraneo',
    plantas: [[
      R('cocina', 0, 0, 4.5, 3), R('recibidor', 4.5, 0, 1.5, 3, 'Entrada'), R('salon', 0, 3, 6, 5.25, 'Salón · comedor'),
      R('lavadero', 6, 0, 2.25, 3, 'Lavadero · ropa de cama'), R('trastero', 8.25, 0, 2.25, 3, 'Almacén · maletas'), R('aseo', 10.5, 0, 1.5, 3),
      R('pasillo', 6, 3, 15.75, 1.5, 'Pasillo de suites'),
      R('dormitorio', 6, 4.5, 3.75, 3.75, 'Suite 1'), R('bano', 9.75, 4.5, 1.5, 3.75, NF('Baño suite 1', { suite: true })), R('bano', 11.25, 4.5, 1.5, 3.75, NF('Baño suite 2', { suite: true })),
      R('dormitorio', 12.75, 4.5, 3.75, 3.75, 'Suite 2'), R('dormitorio_principal', 16.5, 4.5, 3.75, 3.75, 'Suite 3'), R('bano', 20.25, 4.5, 1.5, 3.75, NF('Baño suite 3', { suite: true })),
      R('terraza', 0, 8.25, 21.75, 2.25), R('chillout', 0, 10.5, 6, 3, 'Chill out'), R('piscina', 6, 10.5, 10.5, 3),
    ]],
  }),
  // 24 · Dos naves a dos aguas
  T({
    id: 'ten-pb-dos-naves', nombre: 'Dos naves a dos aguas', familia: 'myway', perfiles: ['familia', 'teletrabajo'], acceso: 'O',
    desc: 'Tendencia: la «modern heritage»: formas tradicionales de cubierta inclinada con interior abierto. Dos naves paralelas a dos aguas unidas por una galería de entrada acristalada: al norte la nave de noche (dos dormitorios, baño y suite); al sur la de día, con cocina-comedor, salón de 31 m², despacho, aseo y lavadero. Se entra por el testero oeste de la galería.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped', cubierta: { tipo: 'dos', material: 'teja', color: 'negra', pendiente: 30, alero: 0.25 },
    plantas: [[
      R('dormitorio', 0, 0, 3.75, 3.75), R('bano', 3.75, 0, 2.25, 3.75), R('dormitorio', 6, 0, 3.75, 3.75), R('dormitorio_principal', 9.75, 0, 4.5, 3.75), R('bano', 14.25, 0, 2.25, 3.75, NF('Baño suite', { suite: true })),
      R('pasillo', 1.5, 3.75, 13.5, 1.5, 'Galería'),
      R('cocina', 0, 5.25, 4.5, 5.25, 'Cocina · comedor'), R('salon', 4.5, 5.25, 6, 5.25), R('lavadero', 10.5, 5.25, 1.5, 2.25), R('aseo', 12, 5.25, 1.5, 2.25), R('despacho', 10.5, 7.5, 3, 3),
    ]],
  }),
  // 25 · Primera vivienda de dos dormitorios
  T({
    id: 'ten-pb-primera-2d', nombre: 'Primera vivienda 2D 55', familia: 'basic', perfiles: ['pareja', 'inversor', 'solo'], acceso: 'N',
    desc: 'Tendencia: la casa industrializada económica de unos 50 m² con dos dormitorios, la más difundida en la prensa española, para comprar en lugar de alquilar. Rectángulo de 10,50 × 6,75 m: cocina, entrada, baño y lavadero al norte; estar-comedor de 17 m² al suroeste; pasillo de 1,50 y dos dormitorios al sur, con porche corrido.',
    acabados: { fachada: 'chapa_clara', carpinteria: 'oscura' }, jardin: 'cesped', cubierta: { tipo: 'una', material: 'chapa', color: 'blanco', alero: 0.5 },
    plantas: [[
      R('cocina', 0, 0, 3.75, 2.25), R('recibidor', 3.75, 0, 1.5, 2.25, 'Entrada'), R('bano', 5.25, 0, 2.25, 2.25), R('lavadero', 7.5, 0, 3, 2.25, 'Lavadero · almacén'),
      R('salon', 0, 2.25, 3.75, 4.5, 'Estar · comedor'), R('pasillo', 3.75, 2.25, 6.75, 1.5),
      R('dormitorio', 3.75, 3.75, 3, 3), R('dormitorio_principal', 6.75, 3.75, 3.75, 3),
      R('porche', 0, 6.75, 10.5, 1.5),
    ]],
  }),
];
