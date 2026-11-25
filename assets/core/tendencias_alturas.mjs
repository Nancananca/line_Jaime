// Tendencias (colección «tendencias»), parte 2: viviendas de dos plantas y edificios de hasta 6 alturas.
// Cada modelo lleva coleccion: 'tendencias'. Modelos PROPIOS: los portales de planos y los informes de tendencias
// (ver docs/TENDENCIAS_ALTURAS.md) se usan solo como señal de qué programas y tipos gustan; no se copia ningún plano.
// Convenio: y crece hacia el sur; acceso por el norte salvo indicación; estancias de día al sur; trama de 0,75 m.
const R = (tipo, x, y, w, h, extra) => Object.assign({ tipo, x, y, w, h }, typeof extra === 'string' ? { nombre: extra, nombreFijo: true } : extra || {});
const NF = (nombre, extra) => Object.assign({ nombre, nombreFijo: true }, extra || {});
const T = (d) => Object.assign({ coleccion: 'tendencias' }, d);

// ───────────── Edificios plurifamiliares (v.1.5: estancia.vivienda, ascensor, portal, rellano) ─────────────
// Estancias de vivienda (etiqueta v) y simetría respecto al eje del bloque (las viviendas B son espejo de las A).
const V = (tipo, x, y, w, h, v, extra) => Object.assign({ tipo, x, y, w, h, vivienda: v }, typeof extra === 'string' ? { nombre: extra, nombreFijo: true } : extra || {});
const espX = (lista, W) => lista.map((e) => Object.assign({}, e, { x: W - e.x - e.w }));
// Bloque pasante de 24,00 × 10,50 m: dos viviendas por planta de 9,75 m de crujía y núcleo central de 4,50 m pegado a la
// fachada sur (escalera común en U de 3,00 × 4,50 con su ventana al sur, ascensor 1,50 × 2,25 y patinillo de
// instalaciones registrable desde la meseta). El rellano de 4,50 × 1,50 toca la escalera, la puerta del ascensor y las
// dos viviendas; encima del rellano, junto a la fachada norte, cada vivienda gana 2,25 m de crujía («quiebro»).
const WP = 24;
const nucleoP = (asc = true) => [R('escalera', 9.75, 6, 3, 4.5, NF('Escalera común', { sube: 'S' })), ...(asc ? [R('ascensor', 12.75, 6, 1.5, 2.25), R('instalaciones', 12.75, 8.25, 1.5, 2.25, 'Patinillo de instalaciones')] : [R('instalaciones', 12.75, 6, 1.5, 4.5, 'Instalaciones · contadores')])];
const rellanoP = () => R('distribuidor', 9.75, 4.5, 4.5, 1.5, 'Rellano');
const portalP = () => R('recibidor', 9.75, 0, 4.5, 6, 'Portal');
// 3 dormitorios pasante, para vivienda de testero (el baño de la suite ventila por la fachada lateral)
const A3 = (v, terraza = true) => [
  V('dormitorio_principal', 0, 0, 3.75, 4.5, v), V('bano', 3.75, 0, 1.5, 4.5, v, 'Baño'), V('dormitorio', 5.25, 0, 3, 4.5, v, 'Dormitorio 2'), V('dormitorio', 8.25, 0, 3.75, 4.5, v, 'Dormitorio 3'),
  V('bano', 0, 4.5, 2.25, 1.5, v, NF('Baño suite', { suite: true })), V('pasillo', 2.25, 4.5, 7.5, 1.5, v, 'Pasillo'),
  V('cocina', 0, 6, 3.75, 4.5, v), V('salon', 3.75, 6, 6, 4.5, v, 'Salón · comedor'),
  ...(terraza ? [V('terraza', 3.75, 10.5, 6, 1.5, v, 'Terraza')] : []),
];
// 3 dormitorios pasante entre medianeras: los dos baños a fachada (norte y sur)
const A3m = (v) => [
  V('dormitorio_principal', 0, 0, 3.75, 4.5, v), V('bano', 3.75, 0, 1.5, 4.5, v, 'Baño'), V('dormitorio', 5.25, 0, 3, 4.5, v, 'Dormitorio 2'), V('dormitorio', 8.25, 0, 3.75, 4.5, v, 'Dormitorio 3'),
  V('pasillo', 0, 4.5, 9.75, 1.5, v, 'Pasillo'), V('cocina', 0, 6, 3, 4.5, v), V('bano', 3, 6, 1.5, 4.5, v, 'Baño 2'), V('salon', 4.5, 6, 5.25, 4.5, v, 'Salón · comedor'),
  V('terraza', 4.5, 10.5, 5.25, 1.5, v, 'Terraza'),
];
// 2 dormitorios y despacho al sur (teletrabajo)
const B2m = (v) => [
  V('dormitorio_principal', 0, 0, 3.75, 4.5, v), V('bano', 3.75, 0, 1.5, 4.5, v, 'Baño'), V('cocina', 5.25, 0, 3, 4.5, v), V('dormitorio', 8.25, 0, 3.75, 4.5, v, 'Dormitorio 2'),
  V('pasillo', 0, 4.5, 9.75, 1.5, v, 'Pasillo'), V('salon', 0, 6, 6, 4.5, v, 'Salón · comedor'), V('despacho', 6, 6, 3.75, 4.5, v, 'Despacho'),
  V('terraza', 0, 10.5, 6, 1.5, v, 'Terraza'),
];
// planta baja accesible de 2 dormitorios con jardín privado (baño adaptado de 2,25 × 4,50 y paso de 1,50)
const PB2 = (v, jardin = 3) => [
  V('dormitorio_principal', 0, 0, 4.5, 4.5, v), V('bano', 4.5, 0, 2.25, 4.5, v, 'Baño adaptado'), V('dormitorio', 6.75, 0, 3, 4.5, v, 'Dormitorio 2'),
  V('pasillo', 0, 4.5, 9.75, 1.5, v, 'Pasillo'), V('cocina', 0, 6, 3.75, 4.5, v), V('salon', 3.75, 6, 6, 4.5, v, 'Salón · comedor'),
  ...(jardin ? [V('terraza', 0, 10.5, 9.75, jardin, v, 'Jardín privado')] : []),
];
// ático de 2 dormitorios retranqueado con terraza en L
const atico = (v) => [
  V('dormitorio_principal', 0, 0, 3.75, 4.5, v), V('bano', 3.75, 0, 1.5, 4.5, v, 'Baño'), V('dormitorio', 5.25, 0, 3, 4.5, v, 'Dormitorio 2'), V('cocina', 8.25, 0, 3.75, 4.5, v),
  V('bano', 0, 4.5, 2.25, 1.5, v, NF('Baño suite', { suite: true })), V('pasillo', 2.25, 4.5, 7.5, 1.5, v, 'Pasillo'),
  V('salon', 0, 6, 6, 3, v, 'Salón · comedor'), V('terraza', 6, 6, 3.75, 4.5, v, 'Terraza'), V('terraza', 0, 9, 6, 1.5, v, 'Terraza'),
];
// dos plantas bajas: garaje común de 3 plazas con portón y trasteros que se abren desde él
const garajeP = () => [R('garaje', 0, 0, 9.75, 6, 'Garaje común · 3 plazas'), R('trastero', 0, 6, 3.75, 4.5, 'Trastero 1'), R('trastero', 3.75, 6, 3, 4.5, 'Trastero 2'), R('trastero', 6.75, 6, 3, 4.5, 'Trastero 3')];
const dosLados = (fA, fB, a, b) => [...fA(a), ...espX(fB(b), WP)];

// Edificio estrecho entre medianeras (7,50 × 15,00 m), una vivienda por planta. Núcleo en el lado este: ascensor e
// instalaciones a la calle, rellano de 3,00 × 1,50 y escalera común en U detrás; la vivienda rodea el núcleo.
const nucleoN = (pb) => [pb ? R('recibidor', 4.5, 0, 1.5, 3, 'Portal') : R('instalaciones', 4.5, 0, 1.5, 3, 'Instalaciones'), R('ascensor', 6, 0, 1.5, 3), R('distribuidor', 4.5, 3, 3, 1.5, 'Rellano'), R('escalera', 4.5, 4.5, 3, 4.5, NF('Escalera común', { sube: 'S' }))];
const vivN = (v, ext) => [
  V('dormitorio', 0, 0, 3, 3, v, 'Dormitorio 2'), V('bano', 3, 0, 1.5, 3, v, 'Baño'), V('pasillo', 0, 3, 4.5, 1.5, v, 'Recibidor'),
  V('lavadero', 0, 4.5, 3, 2.25, v), V('vestidor', 0, 6.75, 3, 3.75, v, 'Armarios'), V('pasillo', 3, 4.5, 1.5, 6, v, 'Pasillo'),
  V('salon', 0, 10.5, 4.5, 4.5, v, 'Salón · cocina'), V('dormitorio_principal', 4.5, 9, 3, 6, v),
  ...(ext ? [V('terraza', 0, 15, 7.5, ext, v, ext > 1.5 ? 'Patio' : 'Balcón')] : []),
];

export const TENDENCIAS_ALT = [
  // ───────────── DOS PLANTAS ─────────────
  // 1 · Suite principal en planta baja (envejecer en casa)
  T({
    id: 'ten-alt-suite-pb', nombre: 'Suite en planta baja', familia: 'natura', perfiles: ['familia', 'senior', 'multigeneracional'], acceso: 'N', tendencia: 'Dormitorio principal en planta baja',
    desc: 'Dos plantas con la suite principal abajo, para no depender de la escalera con los años: dormitorio con vestidor, baño y terraza propia en un ala de una planta. El día en L (cocina con lavadero-despensa, salón y comedor) abre al porche del sur; la escalera arranca del vestíbulo. Arriba, dos dormitorios dobles, baño y un rellano-mirador de lectura.',
    acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'mediterraneo',
    plantas: [[
      R('lavadero', 0, 0, 1.5, 3.75, 'Lavadero · despensa'), R('cocina', 1.5, 0, 4.5, 3.75, 'Cocina · isla'), R('salon', 0, 3.75, 6, 6, 'Salón'),
      R('recibidor', 6, 0, 3, 2.25, 'Vestíbulo'), R('escalera', 6, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 7.5, 2.25, 1.5, 4.5, 'Paso'), R('comedor', 6, 6.75, 3, 3),
      R('aseo', 9, 0, 1.5, 2.25), R('bano', 10.5, 0, 3, 2.25, NF('Baño suite', { suite: true })), R('vestidor', 9, 2.25, 1.5, 1.5, 'Armario'), R('vestidor', 10.5, 2.25, 3, 1.5),
      R('dormitorio_principal', 9, 3.75, 4.5, 4.5, 'Dormitorio principal'), R('terraza', 9, 8.25, 4.5, 1.5, 'Terraza de la suite'),
      R('porche', 0, 9.75, 9, 2.25, 'Porche'),
    ], [
      R('dormitorio', 0, 0, 4.5, 3.75, 'Dormitorio 2'), R('bano', 0, 3.75, 4.5, 1.5, 'Baño'), R('dormitorio', 0, 5.25, 4.5, 4.5, 'Dormitorio 3'),
      R('pasillo', 4.5, 0, 1.5, 6.75, 'Paso'), R('vestidor', 6, 0, 1.5, 2.25, 'Armario · ropa blanca'), R('escalera', 6, 2.25, 1.5, 4.5, { sube: 'S' }),
      R('distribuidor', 4.5, 6.75, 3, 3, NF('Rellano · lectura', { huecos: { S: { tipo: 'ventanal', ancho: 2.25 } } })),
    ]],
  }),
  // 2 · Dos suites principales (multigeneracional)
  T({
    id: 'ten-alt-dos-suites', nombre: 'Dos suites · tres generaciones', familia: 'myway', perfiles: ['multigeneracional', 'familia_numerosa'], acceso: 'N', tendencia: 'Doble suite principal',
    desc: 'Una suite en cada planta: abajo la de los mayores, con baño adaptado, aseo de visitas al lado y porche propio al sur, sin pisar un escalón; arriba la de los padres, con vestidor y baño, y dos dormitorios. Una galería de 1,50 m cose la planta baja y recoge la escalera de tramo recto, que arranca del vestíbulo y llega a un distribuidor.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'cesped',
    plantas: [[
      R('bano', 0, 0, 3, 2.25, NF('Baño adaptado · suite', { suite: true })), R('aseo', 3, 0, 1.5, 2.25), R('dormitorio_principal', 0, 2.25, 4.5, 5.25, 'Suite de los mayores'), R('porche', 0, 7.5, 4.5, 3, 'Porche de la suite'),
      R('recibidor', 4.5, 0, 3, 3.75, 'Vestíbulo'), R('lavadero', 7.5, 0, 2.25, 2.25, 'Lavadero · mudroom'), R('despensa', 9.75, 0, 2.25, 2.25), R('escalera', 7.5, 2.25, 4.5, 1.5, { sube: 'E' }),
      R('cocina', 12, 0, 3, 5.25), R('pasillo', 4.5, 3.75, 7.5, 1.5, 'Galería'),
      R('salon', 4.5, 5.25, 6, 5.25, 'Salón'), R('comedor', 10.5, 5.25, 4.5, 5.25),
    ], [
      R('dormitorio', 4.5, 0, 3, 3.75, 'Dormitorio 2'), R('bano', 7.5, 0, 4.5, 2.25, 'Baño · dos lavabos'), R('distribuidor', 12, 0, 1.5, 5.25), R('escalera', 7.5, 2.25, 4.5, 1.5, { sube: 'E' }),
      R('pasillo', 4.5, 3.75, 7.5, 1.5, 'Galería'),
      R('dormitorio', 4.5, 5.25, 3, 4.5, 'Dormitorio 3'), R('dormitorio_principal', 7.5, 5.25, 4.5, 4.5, 'Suite de los padres'), R('vestidor', 12, 5.25, 1.5, 2.25), R('bano', 12, 7.5, 1.5, 2.25, NF('Baño suite', { suite: true })),
    ]],
  }),
  // 3 · Adosada de 6 m con patio
  T({
    id: 'ten-alt-adosada-6', nombre: 'Adosada 6 m · patio y terraza', familia: 'natura', perfiles: ['pareja', 'teletrabajo', 'familia'], acceso: 'N', medianeras: ['E', 'O'], tendencia: 'Vivienda en hilera estrecha con patio',
    desc: 'Entre medianeras con 6 m de frente y 15 de fondo. Un patio de 3,00 × 3,00 m en el centro da luz a la cocina, al paso y a los baños, que de otro modo serían ciegos. Zaguán y cocina a la calle, salón-comedor de 36 m² al jardín. Arriba, dormitorio a la calle, suite al jardín con baño al patio y terraza con pérgola.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'madera' }, jardin: 'zen',
    plantas: [[
      R('recibidor', 0, 0, 3, 2.25, 'Zaguán'), R('cocina', 3, 0, 3, 4.5, 'Cocina · office'),
      R('escalera', 0, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 2.25, 1.5, 6.75, 'Paso'), R('patio', 3, 4.5, 3, 3, 'Patio'),
      R('despensa', 0, 6.75, 1.5, 2.25), R('aseo', 3, 7.5, 3, 1.5, 'Aseo · lavadero'), R('salon', 0, 9, 6, 6, 'Salón · comedor'),
    ], [
      R('bano', 0, 0, 3, 2.25), R('dormitorio', 3, 0, 3, 4.5, 'Dormitorio 2'),
      R('escalera', 0, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 2.25, 1.5, 6.75, 'Distribuidor'), R('patio', 3, 4.5, 3, 3, 'Patio'),
      R('pasillo', 0, 6.75, 1.5, 2.25, 'Meseta'), R('bano', 3, 7.5, 3, 1.5, NF('Baño suite', { suite: true })),
      R('dormitorio_principal', 0, 9, 6, 3.75), R('terraza', 0, 12.75, 6, 2.25, NF('Terraza · pérgola', { pergola: true })),
    ]],
  }),
  // 4 · Pareada con garaje y mudroom
  T({
    id: 'ten-alt-pareada-mudroom', nombre: 'Pareada · garaje y mudroom', familia: 'natura', perfiles: ['familia', 'familia_numerosa'], acceso: 'N', medianeras: ['O'], tendencia: 'Entrada de servicio con lavadero (mudroom)',
    desc: 'Pareada contra la medianera oeste. El garaje de una plaza y bicis entra al vestíbulo; detrás, un mudroom con lavadero que da a la cocina-comedor: se llega con la compra y la ropa sucia sin cruzar el salón. Despacho o cuarto de invitados con su baño y aseo de visitas. Arriba, cuatro dormitorios: suite al sureste con vestidor y baño.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'praderia', cubierta: { tipo: 'dos', material: 'teja', color: 'arena', alero: 0.5 },
    plantas: [[
      R('garaje', 0, 0, 3.75, 5.25, 'Garaje · 1 plaza y bicis'), R('lavadero', 0, 5.25, 3.75, 1.5, 'Mudroom · lavadero'),
      R('recibidor', 3.75, 0, 3, 2.25, 'Vestíbulo'), R('escalera', 3.75, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 5.25, 2.25, 1.5, 4.5, 'Paso'),
      R('aseo', 6.75, 0, 1.5, 2.25), R('bano', 8.25, 0, 3, 2.25, NF('Baño de invitados', { suite: true })), R('despacho', 6.75, 2.25, 4.5, 4.5, 'Despacho · invitados'),
      R('cocina', 0, 6.75, 4.5, 4.5, 'Cocina · comedor de diario'), R('salon', 4.5, 6.75, 6.75, 4.5, 'Salón · comedor'),
    ], [
      R('dormitorio', 0, 0, 3.75, 3.75, 'Dormitorio 2'), R('vestidor', 0, 3.75, 3.75, 3, 'Armarios · maletas'),
      R('distribuidor', 3.75, 0, 3, 2.25), R('escalera', 3.75, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 5.25, 2.25, 1.5, 4.5, 'Paso'),
      R('dormitorio', 6.75, 0, 4.5, 3, 'Dormitorio 3'), R('vestidor', 6.75, 3, 4.5, 1.5, 'Armario · ropa blanca'), R('vestidor', 6.75, 4.5, 1.5, 2.25), R('bano', 8.25, 4.5, 3, 2.25, NF('Baño suite', { suite: true })),
      R('distribuidor', 0, 6.75, 6.75, 1.5, 'Distribuidor sur'), R('dormitorio', 0, 8.25, 3.75, 3, 'Dormitorio 4'), R('bano', 3.75, 8.25, 3, 3, 'Baño · bañera'),
      R('dormitorio_principal', 6.75, 6.75, 4.5, 4.5),
    ]],
  }),
  // 5 · Salón a doble altura
  T({
    id: 'ten-alt-doble-altura', nombre: 'Salón a doble altura', familia: 'myway', perfiles: ['familia', 'pareja', 'teletrabajo'], acceso: 'N', tendencia: 'Gran salón a doble altura (great room)',
    desc: 'El salón de 36 m² sube dos plantas y recibe el sol del sur por un ventanal alto; desde arriba se asoma una pasarela que lleva a los dormitorios. Abajo, cocina de 27 m², comedor, despacho y un dormitorio de invitados con baño; arriba, suite asomada al vacío, dos dormitorios y baño.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'bosque', cubierta: { tipo: 'una', material: 'chapa', color: 'grafito', alero: 0.5 },
    plantas: [[
      R('cocina', 0, 0, 6, 4.5, 'Cocina · isla'), R('salon', 0, 4.5, 6, 6, 'Salón · doble altura'),
      R('recibidor', 6, 0, 3, 2.25, 'Vestíbulo'), R('escalera', 6, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 7.5, 2.25, 1.5, 4.5, 'Paso'), R('comedor', 6, 6.75, 3, 3.75),
      R('bano', 9, 0, 3, 2.25), R('dormitorio', 9, 2.25, 3, 4.5, 'Dormitorio · invitados'), R('despacho', 9, 6.75, 3, 3.75, NF('Despacho', { corredera: true })),
    ], [
      R('bano', 0, 0, 1.5, 2.25, NF('Baño suite', { suite: true })), R('vestidor', 0, 2.25, 1.5, 2.25), R('dormitorio_principal', 1.5, 0, 4.5, 4.5, 'Suite · asomada al salón'),
      R('doble_altura', 0, 4.5, 6, 6, NF('Doble altura del salón', { huecos: { S: { tipo: 'ventanal', ancho: 4.5 }, O: { tipo: 'ventana', ancho: 1.5 } } })),
      R('distribuidor', 6, 0, 3, 2.25), R('escalera', 6, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 7.5, 2.25, 1.5, 4.5, 'Paso'), R('pasillo', 6, 6.75, 3, 1.5, 'Pasarela'),
      R('dormitorio', 9, 0, 3, 3.75, 'Dormitorio 2'), R('bano', 9, 3.75, 3, 1.5), R('dormitorio', 9, 5.25, 3, 3.75, 'Dormitorio 3'),
    ]],
  }),
  // 6 · Estudio en alto con terraza propia
  T({
    id: 'ten-alt-estudio-alto', nombre: 'Casa con estudio en alto', familia: 'basic', perfiles: ['teletrabajo', 'pareja', 'familia'], acceso: 'N', tendencia: 'Despacho separado de la vida de casa',
    desc: 'Trabajar en casa sin trabajar en el salón: el estudio está arriba, en la esquina noroeste, con luz norte constante y su terraza de 13,5 m² sobre la cocina. Escalera de tramo recto a lo largo de la fachada norte. Abajo, salón-comedor de 27 m² al sur, cocina y un dormitorio con baño para invitados o para más adelante; arriba, dos dormitorios al sol y baño.',
    acabados: { fachada: 'madera', carpinteria: 'clara' }, jardin: 'praderia',
    plantas: [[
      R('recibidor', 0, 0, 3, 2.25, 'Entrada'), R('escalera', 3, 0, 4.5, 1.5, { sube: 'E' }), R('lavadero', 7.5, 0, 1.5, 1.5), R('bano', 9, 0, 1.5, 3),
      R('pasillo', 3, 1.5, 6, 1.5, 'Paso'), R('cocina', 0, 2.25, 3, 3.75), R('comedor', 0, 6, 3, 3), R('salon', 3, 3, 4.5, 6, 'Salón · comedor'),
      R('dormitorio', 7.5, 3, 3, 6, 'Dormitorio · invitados'),
    ], [
      R('despacho', 0, 0, 3, 4.5, 'Estudio'), R('escalera', 3, 0, 4.5, 1.5, { sube: 'E' }), R('distribuidor', 7.5, 0, 1.5, 3), R('bano', 9, 0, 1.5, 3),
      R('pasillo', 3, 1.5, 4.5, 1.5, 'Paso'), R('terraza', 0, 4.5, 3, 4.5, 'Terraza del estudio'),
      R('dormitorio', 3, 3, 3.75, 4.5, 'Dormitorio 2'), R('dormitorio_principal', 6.75, 3, 3.75, 4.5),
    ]],
  }),
  // 7 · Casa invertida: día arriba, noche abajo
  T({
    id: 'ten-alt-invertida', nombre: 'Casa invertida · día arriba', familia: 'line', perfiles: ['pareja', 'familia', 'teletrabajo'], acceso: 'N', tendencia: 'Vivienda invertida para vistas o ladera',
    desc: 'Pensada para una ladera que baja al sur o para buscar vistas en llano: los dormitorios quedan abajo, frescos y cerca del jardín, y el día sube a la planta alta, con cocina, comedor y salón abiertos a una terraza-mirador de 36 m² con pérgola. Una galería reparte tres dormitorios al sur (suite con baño y vestidor); la escalera de tramo recto arranca del vestíbulo.',
    acabados: { fachada: 'hormigon', carpinteria: 'oscura' }, jardin: 'mediterraneo',
    plantas: [[
      R('bano', 0, 0, 3, 2.25), R('vestidor', 0, 2.25, 3, 1.5, 'Armario'), R('recibidor', 3, 0, 3, 3.75, 'Vestíbulo'),
      R('lavadero', 6, 0, 4.5, 2.25, 'Lavadero · instalaciones'), R('escalera', 6, 2.25, 4.5, 1.5, { sube: 'E' }), R('bano', 10.5, 0, 1.5, 3.75, 'Baño 2'),
      R('pasillo', 0, 3.75, 12, 1.5, 'Galería'),
      R('bano', 0, 5.25, 1.5, 3, NF('Baño suite', { suite: true })), R('vestidor', 0, 8.25, 1.5, 2.25, 'Vestidor'), R('dormitorio_principal', 1.5, 5.25, 3.75, 5.25),
      R('dormitorio', 5.25, 5.25, 3.75, 5.25, 'Dormitorio 2'), R('dormitorio', 9, 5.25, 3, 5.25, 'Dormitorio 3'),
    ], [
      R('cocina', 0, 0, 6, 3.75, 'Cocina · isla'), R('despensa', 6, 0, 2.25, 2.25), R('aseo', 8.25, 0, 2.25, 2.25), R('distribuidor', 10.5, 0, 1.5, 3.75, 'Llegada'),
      R('escalera', 6, 2.25, 4.5, 1.5, { sube: 'E' }),
      R('comedor', 0, 3.75, 6, 3.75), R('salon', 6, 3.75, 6, 3.75),
      R('terraza', 0, 7.5, 12, 3, NF('Terraza mirador', { pergola: true })),
    ]],
  }),
  // 8 · Granero contemporáneo pasivo
  T({
    id: 'ten-alt-granero', nombre: 'Granero contemporáneo · pasiva', familia: 'myway', perfiles: ['familia', 'pareja', 'teletrabajo'], acceso: 'N', tendencia: 'Granero moderno (barn house) y casa pasiva',
    desc: 'Volumen de granero de 7,50 m de ancho bajo una cubierta de chapa a dos aguas: compacto, con poca envolvente y huecos grandes solo al sur. Se entra por un mudroom con bancos y abrigos; despacho o invitados, cocina con comedor y salón al jardín. Arriba, bajo la cubierta, suite con vestidor y baño, dos dormitorios, baño y el cuarto de la ventilación con recuperador de calor.',
    acabados: { fachada: 'chapa', carpinteria: 'madera' }, jardin: 'praderia', cubierta: { tipo: 'dos', material: 'chapa', color: 'grafito', pendiente: 35, alero: 0.25, cumbrera: 'y' },
    plantas: [[
      R('recibidor', 0, 0, 4.5, 2.25, 'Mudroom · entrada'), R('aseo', 4.5, 0, 3, 2.25, 'Aseo · lavadero'),
      R('escalera', 0, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 2.25, 1.5, 4.5, 'Paso'), R('despacho', 3, 2.25, 4.5, 4.5, 'Despacho · invitados'),
      R('comedor', 0, 6.75, 3, 3), R('cocina', 3, 6.75, 4.5, 3), R('salon', 0, 9.75, 7.5, 3.75),
    ], [
      R('bano', 0, 0, 3, 2.25), R('dormitorio', 3, 0, 4.5, 3.75, 'Dormitorio 2'),
      R('escalera', 0, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 2.25, 1.5, 4.5, 'Paso'), R('dormitorio', 3, 3.75, 4.5, 3, 'Dormitorio 3'),
      R('distribuidor', 0, 6.75, 3, 1.5), R('instalaciones', 3, 6.75, 4.5, 1.5, 'Ventilación · recuperador'),
      R('dormitorio_principal', 0, 8.25, 4.5, 4.5), R('bano', 4.5, 8.25, 3, 2.25, NF('Baño suite', { suite: true })), R('vestidor', 4.5, 10.5, 3, 2.25),
    ]],
  }),
  // 9 · Casa de campo moderna con porche corrido
  T({
    id: 'ten-alt-campo', nombre: 'Casa de campo · porche corrido', familia: 'line', perfiles: ['familia', 'familia_numerosa'], acceso: 'N', tendencia: 'Casa de campo moderna (modern farmhouse)',
    desc: 'La casa de campo de siempre con líneas de hoy: cubierta de teja a dos aguas, un porche de 15 m a lo largo de la fachada sur y un gran vestíbulo central. Cocina-office de 24 m² con comedor, salón en hilera al porche, despacho junto al vestíbulo y, al fondo de la galería, baño, lavadero y una sala de juegos o de invitados. Arriba, cuatro dormitorios al sur: la suite tiene vestidor y baño.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'huerto', cubierta: { tipo: 'dos', material: 'teja', color: 'mixta', pendiente: 30, alero: 0.5 },
    plantas: [[
      R('cocina', 0, 0, 4.5, 5.25, 'Cocina · office'),
      R('recibidor', 4.5, 0, 3, 3.75, 'Vestíbulo'), R('despacho', 7.5, 0, 4.5, 2.25, 'Despacho'), R('escalera', 7.5, 2.25, 4.5, 1.5, { sube: 'E' }),
      R('bano', 12, 0, 1.5, 3.75), R('lavadero', 13.5, 0, 1.5, 3.75, 'Lavadero'),
      R('pasillo', 4.5, 3.75, 10.5, 1.5, 'Galería'),
      R('comedor', 0, 5.25, 4.5, 4.5), R('salon', 4.5, 5.25, 6, 4.5), R('despacho', 10.5, 5.25, 4.5, 4.5, 'Sala de juegos · invitados'),
      R('porche', 0, 9.75, 15, 2.25, 'Porche corrido'),
    ], [
      R('dormitorio', 4.5, 0, 3, 3.75, 'Dormitorio 2'), R('escalera', 7.5, 2.25, 4.5, 1.5, { sube: 'E' }), R('bano', 12, 0, 3, 2.25), R('pasillo', 12, 2.25, 1.5, 1.5, 'Rellano'), R('vestidor', 13.5, 2.25, 1.5, 1.5, 'Armario'),
      R('pasillo', 4.5, 3.75, 10.5, 1.5, 'Distribuidor'),
      R('vestidor', 3, 5.25, 1.5, 2.25), R('bano', 3, 7.5, 1.5, 2.25, NF('Baño suite', { suite: true })), R('dormitorio_principal', 4.5, 5.25, 4.5, 4.5),
      R('dormitorio', 9, 5.25, 3, 4.5, 'Dormitorio 3'), R('dormitorio', 12, 5.25, 3, 4.5, 'Dormitorio 4'),
    ]],
  }),
  // 10 · Casa en L con porche en el rincón
  T({
    id: 'ten-alt-l-rincon', nombre: 'Casa en L · porche bajo los dormitorios', familia: 'line', perfiles: ['familia', 'pareja'], acceso: 'N', tendencia: 'Vida dentro-fuera (indoor-outdoor)',
    desc: 'Dos brazos en L. El ala de día, de una planta, abre cocina, comedor y salón al oeste y a un porche de 40 m² en el rincón; el ala de entrada sube a una planta alta que cubre el porche y lo convierte en una sala exterior en sombra. Se entra a la cocina directamente desde el vestíbulo; mudroom-lavadero con ventana al porche, baño y despensa; arriba, tres dormitorios al sur y baño.',
    acabados: { fachada: 'hormigon_gris', carpinteria: 'madera' }, jardin: 'mediterraneo',
    plantas: [[
      R('cocina', 0, 0, 6, 3.75, 'Cocina · isla'), R('comedor', 0, 3.75, 6, 3.75), R('salon', 0, 7.5, 6, 4.5),
      R('recibidor', 6, 0, 3, 3, 'Vestíbulo'), R('escalera', 9, 0, 4.5, 1.5, { sube: 'E' }), R('pasillo', 9, 1.5, 4.5, 1.5, 'Paso'), R('bano', 13.5, 0, 1.5, 3),
      R('lavadero', 6, 3, 3, 1.5, 'Mudroom · lavadero'), R('despensa', 9, 3, 6, 1.5, 'Despensa · armarios'),
      R('porche', 6, 4.5, 9, 4.5, 'Porche en el rincón'),
    ], [
      R('bano', 6, 0, 3, 1.5), R('escalera', 9, 0, 4.5, 1.5, { sube: 'E' }), R('pasillo', 13.5, 0, 1.5, 3, 'Rellano'), R('pasillo', 6, 1.5, 7.5, 1.5, 'Distribuidor'),
      R('dormitorio', 6, 3, 3, 4.5, 'Dormitorio 2'), R('dormitorio', 9, 3, 3, 4.5, 'Dormitorio 3'), R('dormitorio_principal', 12, 3, 3, 4.5),
    ]],
  }),
  // 11 · Sala de bienestar y garaje doble
  T({
    id: 'ten-alt-bienestar', nombre: 'Casa con sala de bienestar', familia: 'natura', perfiles: ['familia', 'teletrabajo'], acceso: 'N', tendencia: 'Sala de bienestar o flexible (yoga, gimnasio)',
    desc: 'Una pieza de 22 m² al sureste para yoga, gimnasio o música, con corredera al comedor y ventanales al jardín, separada de la cocina. Garaje de dos plazas con entrada al vestíbulo; cocina con despensa, comedor y salón al sur. Arriba, suite con baño y vestidor, dos dormitorios, baño, lavadero-plancha y terraza sobre el comedor.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'oscura' }, jardin: 'zen',
    plantas: [[
      R('garaje', 0, 0, 6, 6, 'Garaje · 2 plazas'), R('salon', 0, 6, 6, 4.5),
      R('recibidor', 6, 0, 3, 2.25, 'Vestíbulo'), R('escalera', 6, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 7.5, 2.25, 1.5, 4.5, 'Paso'), R('comedor', 6, 6.75, 3, 3.75),
      R('aseo', 9, 0, 1.5, 2.25), R('despensa', 10.5, 0, 4.5, 2.25), R('cocina', 9, 2.25, 6, 4.5, 'Cocina · office'),
      R('despacho', 9, 6.75, 6, 3.75, NF('Sala de bienestar · yoga', { corredera: true })),
    ], [
      R('dormitorio', 0, 0, 4.5, 3.75, 'Dormitorio 2'), R('bano', 0, 3.75, 4.5, 1.5), R('dormitorio', 0, 5.25, 4.5, 4.5, 'Dormitorio 3'),
      R('pasillo', 4.5, 0, 1.5, 6.75, 'Paso'), R('vestidor', 6, 0, 1.5, 2.25, 'Armario'), R('escalera', 6, 2.25, 1.5, 4.5, { sube: 'S' }),
      R('lavadero', 7.5, 2.25, 1.5, 4.5, 'Lavadero · plancha'), R('vestidor', 9, 2.25, 1.5, 4.5), R('bano', 10.5, 2.25, 4.5, 3, NF('Baño suite', { suite: true })), R('dormitorio_principal', 10.5, 5.25, 4.5, 4.5),
      R('distribuidor', 4.5, 6.75, 6, 1.5, NF('Distribuidor', { huecos: { S: { tipo: 'puerta' } } })), R('terraza', 4.5, 8.25, 6, 2.25),
    ]],
  }),
  // 12 · Casa semilla
  T({
    id: 'ten-alt-semilla', nombre: 'Casa semilla 7,5 × 7,5', familia: 'basic', perfiles: ['pareja', 'inversor', 'solo'], acceso: 'N', tendencia: 'Casa a la medida justa (right-sizing)',
    desc: 'Lo justo y bien hecho: un cubo de 7,50 × 7,50 m en dos plantas, unos 100 m² útiles. Abajo, salón-comedor de 27 m² en esquina al sur y al este, cocina abierta y aseo; arriba, dos dormitorios y baño. La escalera va pegada a la fachada oeste para dejar libre el resto y la parcela queda para jardín o para crecer.',
    acabados: { fachada: 'chapa_clara', carpinteria: 'oscura' }, jardin: 'cesped',
    plantas: [[
      R('recibidor', 0, 0, 3, 1.5, 'Entrada'), R('aseo', 3, 0, 1.5, 1.5), R('cocina', 4.5, 0, 3, 3),
      R('escalera', 0, 1.5, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 1.5, 3, 1.5, 'Paso'), R('despensa', 0, 6, 1.5, 1.5),
      R('salon', 1.5, 3, 6, 4.5, 'Salón · comedor'),
    ], [
      R('bano', 0, 0, 3, 1.5), R('dormitorio', 3, 0, 4.5, 3.75, 'Dormitorio 2'),
      R('escalera', 0, 1.5, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 1.5, 1.5, 4.5, 'Paso'), R('pasillo', 0, 6, 3, 1.5, 'Rellano'),
      R('dormitorio_principal', 3, 3.75, 4.5, 3.75),
    ]],
  }),
  // ───────────── TRES ALTURAS ─────────────
  // 13 · Entre medianeras con azotea
  T({
    id: 'ten-alt-medianera-azotea', nombre: 'Entre medianeras · azotea', familia: 'natura', perfiles: ['pareja', 'familia', 'teletrabajo'], acceso: 'N', medianeras: ['E', 'O'], tendencia: 'Casa urbana estrecha con terraza en cubierta',
    desc: 'Tres alturas en un solar de 6 × 12 m. La escalera de tramo recto se repite en el mismo hueco y siempre llega a una meseta al sur; un paso paralelo devuelve al arranque del tramo siguiente. Abajo, zaguán, aseo y salón con cocina abierto al patio trasero; en la primera, dos dormitorios y baño; arriba, la suite y una azotea-solárium de 22 m² con pérgola.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'madera' }, jardin: 'zen',
    plantas: [[
      R('recibidor', 0, 0, 3, 2.25, 'Zaguán'), R('aseo', 3, 0, 3, 2.25, 'Aseo · lavadero'),
      R('escalera', 0, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 2.25, 1.5, 4.5, 'Paso'), R('despensa', 3, 2.25, 3, 4.5, 'Despensa · instalaciones'),
      R('salon', 0, 6.75, 6, 5.25, 'Salón · cocina · comedor'),
    ], [
      R('distribuidor', 0, 0, 3, 2.25, NF('Distribuidor', { huecos: { N: { tipo: 'ventana', ancho: 1.5 } } })), R('dormitorio', 3, 0, 3, 4.5, 'Dormitorio 2'),
      R('escalera', 0, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 2.25, 1.5, 4.5, 'Paso'), R('vestidor', 3, 4.5, 3, 2.25, 'Armario · ropa blanca'),
      R('pasillo', 0, 6.75, 6, 1.5, 'Meseta'), R('bano', 0, 8.25, 1.5, 3.75), R('dormitorio', 1.5, 8.25, 4.5, 3.75, 'Dormitorio 3'),
    ], [
      R('bano', 0, 0, 3, 2.25, NF('Baño suite', { suite: true })), R('dormitorio_principal', 3, 0, 3, 4.5, 'Suite'),
      R('escalera', 0, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 2.25, 1.5, 4.5, 'Paso'), R('vestidor', 3, 4.5, 3, 2.25),
      R('pasillo', 0, 6.75, 6, 1.5, NF('Salida a la azotea', { huecos: { S: { tipo: 'puerta' } } })), R('terraza', 0, 8.25, 6, 3.75, NF('Azotea · solárium', { pergola: true })),
    ]],
  }),
  // 14 · Casa torre
  T({
    id: 'ten-alt-torre', nombre: 'Casa torre · 56 m² de huella', familia: 'basic', perfiles: ['pareja', 'teletrabajo', 'inversor'], acceso: 'E', tendencia: 'Vivienda vertical en parcela pequeña',
    desc: 'Una torre de 7,50 × 7,50 m que deja casi toda la parcela libre. Escalera en U de 3,00 × 3,75 m apilada en las tres plantas: arranca y llega siempre al mismo lado, sin pasos de vuelta. Abajo, salón-comedor en esquina, cocina y aseo; en la primera, dos dormitorios y baño; arriba, un estudio-mirador con terraza al sur.',
    acabados: { fachada: 'hormigon_gris', carpinteria: 'oscura' }, jardin: 'bosque',
    plantas: [[
      R('cocina', 0, 0, 4.5, 3), R('salon', 0, 3, 4.5, 4.5, 'Salón · comedor'),
      R('escalera', 4.5, 0, 3, 3.75, { sube: 'N' }), R('recibidor', 4.5, 3.75, 3, 1.5, 'Entrada'), R('aseo', 4.5, 5.25, 1.5, 2.25), R('despensa', 6, 5.25, 1.5, 2.25),
    ], [
      R('dormitorio', 0, 0, 4.5, 3.75, 'Dormitorio 2'), R('escalera', 4.5, 0, 3, 3.75, { sube: 'N' }),
      R('distribuidor', 0, 3.75, 7.5, 1.5), R('dormitorio', 0, 5.25, 4.5, 2.25, 'Dormitorio 1'), R('bano', 4.5, 5.25, 3, 2.25),
    ], [
      R('despacho', 0, 0, 4.5, 3.75, 'Estudio · mirador'), R('escalera', 4.5, 0, 3, 3.75, { sube: 'N' }),
      R('distribuidor', 0, 3.75, 7.5, 1.5, NF('Rellano', { huecos: { S: { tipo: 'puerta' } } })), R('terraza', 0, 5.25, 7.5, 2.25, 'Terraza alta'),
    ]],
  }),
  // 15 · Vivienda sobre garaje y taller
  T({
    id: 'ten-alt-garaje-taller', nombre: 'Casa sobre garaje y taller', familia: 'line', perfiles: ['familia', 'teletrabajo', 'pareja'], acceso: 'N', tendencia: 'Planta baja de garaje y taller, vivienda en alto',
    desc: 'Tres alturas: abajo el garaje de dos plazas, un taller de 22 m² al que se entra desde el garaje, su almacén y un baño con ducha para volver limpio; en la primera, el día con salón al sur y terraza volada 1,50 m; arriba, dos dormitorios, vestidor y baño. Escalera recta en el mismo hueco con meseta al sur y paso de vuelta al arranque.',
    acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'bosque', cubierta: { tipo: 'una', material: 'chapa', color: 'grafito', alero: 0.5 },
    plantas: [[
      R('garaje', 0, 0, 6, 6, 'Garaje · 2 plazas'), R('despacho', 0, 6, 6, 3.75, 'Taller'),
      R('recibidor', 6, 0, 3, 2.25, 'Portal'), R('escalera', 6, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 7.5, 2.25, 1.5, 4.5, 'Paso'),
      R('trastero', 6, 6.75, 1.5, 3, 'Almacén del taller'), R('bano', 7.5, 6.75, 1.5, 3, 'Baño · ducha'),
    ], [
      R('cocina', 0, 0, 6, 3, 'Cocina · comedor'), R('salon', 0, 3, 6, 6.75),
      R('distribuidor', 6, 0, 3, 2.25, NF('Recibidor alto', { huecos: { N: { tipo: 'ventana', ancho: 1.5 } } })), R('escalera', 6, 2.25, 1.5, 4.5, { sube: 'S' }), R('pasillo', 7.5, 2.25, 1.5, 4.5, 'Paso'),
      R('pasillo', 6, 6.75, 3, 1.5, 'Meseta'), R('aseo', 6, 8.25, 3, 1.5),
      R('terraza', 0, 9.75, 6, 1.5, 'Terraza volada'),
    ], [
      R('dormitorio', 0, 0, 4.5, 3.75, 'Dormitorio 2'), R('vestidor', 0, 3.75, 4.5, 1.5, 'Armario · vestidor'), R('dormitorio_principal', 0, 5.25, 4.5, 4.5),
      R('pasillo', 4.5, 0, 1.5, 8.25, 'Paso'), R('lavadero', 6, 0, 3, 2.25, 'Lavadero · tendedero'), R('escalera', 6, 2.25, 1.5, 4.5, { sube: 'S' }), R('vestidor', 7.5, 2.25, 1.5, 4.5, 'Armario'),
      R('pasillo', 6, 6.75, 3, 1.5, 'Meseta'), R('bano', 4.5, 8.25, 4.5, 1.5),
    ]],
  }),
  // ───────────── EDIFICIOS DE 3 A 6 ALTURAS ─────────────
  // 16 · Bloque de 4 alturas, bajos accesibles con jardín
  T({
    id: 'ten-alt-bloque-jardin', nombre: 'Bloque pasante · bajos con jardín', familia: 'line', perfiles: ['familia', 'senior', 'inversor'], acceso: 'N', tendencia: 'Plurifamiliar pequeño con ventilación cruzada y bajos con jardín',
    desc: 'Baja + 3 con dos viviendas por planta, todas pasantes norte-sur: dormitorios al norte, salón y cocina al sur. En la baja, dos viviendas accesibles de 2 dormitorios con baño adaptado y jardín privado; arriba, seis de 3 dormitorios y dos baños con terraza de 9 m². Núcleo de escalera en U y ascensor en el centro de la fachada sur; el portal atraviesa hasta él desde la calle.',
    acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'mediterraneo',
    plantas: [
      [portalP(), ...nucleoP(), ...dosLados(PB2, PB2, '0A', '0B')],
      ...[1, 2, 3].map((n) => [rellanoP(), ...nucleoP(), ...dosLados(A3, A3, n + 'A', n + 'B')]),
    ],
  }),
  // 17 · Seis alturas con garaje común y áticos
  T({
    id: 'ten-alt-bloque-garaje', nombre: 'Seis alturas · garaje común y áticos', familia: 'line', perfiles: ['familia', 'inversor', 'pareja'], acceso: 'N', tendencia: 'Bajo de garaje y trasteros, ático retranqueado con terraza',
    desc: 'Baja + 5. En la baja, el portal, un garaje común de tres plazas con portón a la calle, tres trasteros que se abren desde él y una vivienda accesible con jardín. De la primera a la cuarta, dos viviendas pasantes de 3 dormitorios y dos baños por planta; en la quinta, dos áticos de 2 dormitorios con terraza en L de 26 m². El ascensor para en todas las plantas.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'praderia',
    plantas: [
      [portalP(), ...nucleoP(), ...garajeP(), ...espX(PB2('0B'), WP)],
      ...[1, 2, 3, 4].map((n) => [rellanoP(), ...nucleoP(), ...dosLados(A3, A3, n + 'A', n + 'B')]),
      [rellanoP(), ...nucleoP(), ...dosLados(atico, atico, '5A', '5B')],
    ],
  }),
  // 18 · Entre medianeras, viviendas de 3 dormitorios y de 2 con despacho
  T({
    id: 'ten-alt-medianera-mixto', nombre: 'Entre medianeras · 3D y 2D con despacho', familia: 'natura', perfiles: ['familia', 'teletrabajo', 'inversor'], acceso: 'N', medianeras: ['E', 'O'], tendencia: 'Mezcla de tamaños y despacho en casa',
    desc: 'Baja + 4 entre medianeras con 24 m de frente. En cada planta alta, una vivienda de 3 dormitorios con un baño al norte y otro al sur, y una de 2 dormitorios con despacho al sur para trabajar en casa; todas pasantes, sin piezas que dependan de la medianera. En la baja, dos viviendas accesibles con jardín.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'oscura' }, jardin: 'zen',
    plantas: [
      [portalP(), ...nucleoP(), ...dosLados(PB2, PB2, '0A', '0B')],
      ...[1, 2, 3, 4].map((n) => [rellanoP(), ...nucleoP(), ...dosLados(A3m, B2m, n + 'A', n + 'B')]),
    ],
  }),
  // 19 · Bloque bioclimático con logias al sur
  T({
    id: 'ten-alt-logias', nombre: 'Bloque bioclimático · logias al sur', familia: 'natura', perfiles: ['familia', 'senior'], acceso: 'N', tendencia: 'Logias y filtros solares (vivienda bioclimática)',
    desc: 'Baja + 4. Delante del salón y la cocina de cada vivienda hay una logia de 1,50 m con celosía de lamas de madera: sombra en verano, sol bajo en invierno y una estancia exterior más. Viviendas pasantes de 3 dormitorios y dos baños con ventilación cruzada; en la baja, dos de 2 dormitorios accesibles con porche y jardín.',
    acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'cesped',
    plantas: (() => {
      const bajo = (v) => [...PB2(v, 0), V('porche', 0, 10.5, 9.75, 1.5, v, 'Porche'), V('terraza', 0, 12, 9.75, 3, v, 'Jardín privado')];
      const piso = (v) => [...A3(v, false), V('porche', 0, 10.5, 9.75, 1.5, v, NF('Logia', { celosia: { lados: ['S'], altura: 'simple', material: 'madera' } }))];
      return [[portalP(), ...nucleoP(), ...dosLados(bajo, bajo, '0A', '0B')], ...[1, 2, 3, 4].map((n) => [rellanoP(), ...nucleoP(), ...dosLados(piso, piso, n + 'A', n + 'B')])];
    })(),
  }),
  // 20 · Tres alturas sin ascensor
  T({
    id: 'ten-alt-tres-sin-ascensor', nombre: 'Tres alturas sin ascensor', familia: 'basic', perfiles: ['familia', 'inversor'], acceso: 'N', tendencia: 'Densidad media de baja altura (missing middle)',
    desc: 'Baja + 2 y seis viviendas: la escala de una calle de casas con la densidad de un bloque. Como solo hay dos plantas sobre el portal, el ascensor no es obligatorio; el núcleo deja ese sitio a un cuarto de contadores, junto a la escalera en U. Bajos accesibles con jardín y, arriba, viviendas pasantes de 3 dormitorios y dos baños.',
    acabados: { fachada: 'madera', carpinteria: 'clara' }, jardin: 'huerto', cubierta: { tipo: 'dos', material: 'teja', color: 'mixta', alero: 0.5 },
    plantas: [
      [portalP(), ...nucleoP(false), ...dosLados(PB2, PB2, '0A', '0B')],
      ...[1, 2].map((n) => [rellanoP(), ...nucleoP(false), ...dosLados(A3, A3, n + 'A', n + 'B')]),
    ],
  }),
  // 21 · Viviendas de alquiler de un dormitorio, cuatro por planta
  T({
    id: 'ten-alt-alquiler', nombre: 'Alquiler · cuatro por planta', familia: 'basic', perfiles: ['inversor', 'solo', 'pareja'], acceso: 'N', tendencia: 'Vivienda asequible de alquiler de un dormitorio',
    desc: 'Baja + 4 y veinte viviendas de un dormitorio para alquiler: cuatro por planta, dos al norte y dos al sur, todas en esquina con dos fachadas. Salón con cocina en la esquina, dormitorio y baño a fachada y un paso de 1,50 m. Las del norte entran por el quiebro del rellano; las del sur, por su costado.',
    acabados: { fachada: 'chapa_clara', carpinteria: 'oscura' }, jardin: 'praderia',
    plantas: (() => {
      const N = (v, wrap) => [V('salon', 0, 0, 4.5, 4.5, v, 'Salón · cocina'), V('dormitorio', 4.5, 0, 3.75, 3, v, 'Dormitorio'), V('bano', 8.25, 0, 1.5, 3, v, 'Baño'), V('pasillo', 4.5, 3, 5.25, 1.5, v, 'Paso'), ...(wrap ? [V('recibidor', 9.75, 0, 2.25, 4.5, v, 'Recibidor')] : [])];
      const S = (v) => [V('pasillo', 4.5, 4.5, 5.25, 1.5, v, 'Recibidor · paso'), V('salon', 0, 4.5, 4.5, 6, v, 'Salón · cocina'), V('dormitorio', 4.5, 6, 3.75, 4.5, v, 'Dormitorio'), V('bano', 8.25, 6, 1.5, 4.5, v, 'Baño')];
      const planta = (n, pb) => [pb ? portalP() : rellanoP(), ...nucleoP(), ...N(n + 'A', !pb), ...S(n + 'B'), ...espX([...N(n + 'C', !pb), ...S(n + 'D')], WP)];
      return [0, 1, 2, 3, 4].map((n) => planta(n, n === 0));
    })(),
  }),
  // 22 · Villa urbana: un piso por planta
  T({
    id: 'ten-alt-villa-urbana', nombre: 'Villa urbana · un piso por planta', familia: 'myway', perfiles: ['familia_numerosa', 'familia', 'multigeneracional'], acceso: 'N', tendencia: 'Casa de pisos: una gran vivienda por planta',
    desc: 'Baja + 3 aislada, con una sola vivienda de 4 dormitorios por planta y cuatro fachadas. El ascensor y la escalera desembarcan en un recibidor de 20 m². Al oeste, cocina, comedor, biblioteca y un salón de 36 m² al sur con terraza; al este, cuatro dormitorios (la suite con vestidor), baño y lavadero-tendedero. En la baja, garaje común de tres plazas con trasteros y una vivienda accesible con jardín.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'madera' }, jardin: 'bosque',
    plantas: (() => {
      const piso = (v) => [
        V('cocina', 0, 0, 3.75, 4.5, v), V('comedor', 3.75, 0, 6, 4.5, v), V('despacho', 0, 4.5, 3.75, 6, v, 'Biblioteca · estar'), V('salon', 3.75, 4.5, 6, 6, v, 'Salón'), V('terraza', 3.75, 10.5, 6, 1.5, v, 'Terraza'),
        V('recibidor', 9.75, 0, 4.5, 4.5, v, 'Recibidor'),
        V('pasillo', 14.25, 0, 1.5, 6, v, 'Pasillo'), V('dormitorio', 15.75, 0, 3, 4.5, v, 'Dormitorio 2'), V('bano', 18.75, 0, 2.25, 4.5, v, 'Baño'), V('dormitorio', 21, 0, 3, 4.5, v, 'Dormitorio 3'),
        V('pasillo', 15.75, 4.5, 8.25, 1.5, v, 'Pasillo de dormitorios'), V('lavadero', 14.25, 6, 2.25, 4.5, v, 'Lavadero · tendedero'), V('dormitorio', 16.5, 6, 3, 4.5, v, 'Dormitorio 4'),
        V('dormitorio_principal', 19.5, 6, 3, 4.5, v), V('bano', 22.5, 6, 1.5, 2.25, v, NF('Baño suite', { suite: true })), V('vestidor', 22.5, 8.25, 1.5, 2.25, v),
      ];
      const pb = [portalP(), ...nucleoP(), ...garajeP(), ...espX(PB2('0A'), WP)];
      return [pb, ...[1, 2, 3].map((n) => [rellanoP(), ...nucleoP(), ...piso(n + 'A')])];
    })(),
  }),
  // 23 · Casas apiladas: cuatro dúplex
  T({
    id: 'ten-alt-casas-apiladas', nombre: 'Casas apiladas · cuatro dúplex', familia: 'natura', perfiles: ['familia', 'teletrabajo'], acceso: 'N', tendencia: 'Dúplex apilados (stacked townhouses)',
    desc: 'Cuatro casas de dos plantas, dos sobre dos: las de abajo con jardín, las de arriba con terraza, cada una con su escalera interior. El día abajo (cocina de 24 m², salón de 40 m², despacho y aseo) y la noche arriba (suite con vestidor, dos dormitorios y baño). A las bajas se entra por el portal y a las altas por el rellano de la segunda, sin ascensor (solo se salvan dos plantas); en la primera hay trasteros comunes.',
    acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'huerto',
    plantas: (() => {
      const dia = (v, ext) => [
        V('cocina', 0, 0, 5.25, 4.5, v), V('aseo', 5.25, 0, 1.5, 2.25, v), V('despensa', 5.25, 2.25, 1.5, 2.25, v), V('recibidor', 6.75, 0, 3, 1.5, v, 'Recibidor'),
        V('pasillo', 6.75, 1.5, 1.5, 4.5, v, 'Paso'), V('escalera', 8.25, 1.5, 1.5, 4.5, v, { sube: 'S' }),
        V('salon', 0, 4.5, 6.75, 6, v, 'Salón · comedor'), V('despacho', 6.75, 6, 3, 4.5, v),
        ...(ext === 'jardin' ? [V('terraza', 0, 10.5, 9.75, 4.5, v, 'Jardín')] : [V('terraza', 0, 10.5, 9.75, 1.5, v, 'Terraza'), V('recibidor', 9.75, 0, 2.25, 4.5, v, 'Entrada')]),
      ];
      const noche = (v) => [
        V('dormitorio_principal', 0, 0, 3.75, 6, v), V('bano', 3.75, 0, 3, 2.25, v, NF('Baño suite', { suite: true })), V('vestidor', 3.75, 2.25, 3, 3.75, v),
        V('bano', 6.75, 0, 3, 1.5, v, 'Baño'), V('pasillo', 6.75, 1.5, 1.5, 4.5, v, 'Paso'), V('escalera', 8.25, 1.5, 1.5, 4.5, v, { sube: 'S' }),
        V('distribuidor', 0, 6, 9.75, 1.5, v, 'Distribuidor'), V('dormitorio', 0, 7.5, 4.5, 3, v, 'Dormitorio 2'), V('dormitorio', 4.5, 7.5, 5.25, 3, v, 'Dormitorio 3'),
      ];
      const lado = (f, a, b, ...r) => [...f(a, ...r), ...espX(f(b, ...r), WP)];
      return [
        [portalP(), ...nucleoP(false), ...lado(dia, '0A', '0B', 'jardin')],
        [rellanoP(), R('trastero', 9.75, 0, 4.5, 4.5, 'Trasteros comunes'), ...nucleoP(false), ...lado(noche, '0A', '0B')],
        [rellanoP(), ...nucleoP(false), ...lado(dia, '2A', '2B', 'terraza')],
        [...lado(noche, '2A', '2B')],
      ];
    })(),
  }),
  // 24 · Edificio estrecho: una vivienda por planta
  T({
    id: 'ten-alt-estrecho', nombre: 'Edificio estrecho · una vivienda por planta', familia: 'natura', perfiles: ['pareja', 'inversor', 'senior'], acceso: 'N', medianeras: ['E', 'O'], tendencia: 'Relleno urbano en solar estrecho',
    desc: 'Baja + 4 en un solar de 7,50 m de frente entre medianeras, con una vivienda de 2 dormitorios por planta. El núcleo va contra la medianera este: ascensor y patinillo a la calle, rellano y escalera en U detrás. La vivienda rodea el núcleo: dormitorio y baño a la calle, lavadero y armarios en el centro (sin luz, que no necesitan) y, al sur, salón con cocina, dormitorio principal y balcón. En la baja, la vivienda tiene patio.',
    acabados: { fachada: 'hormigon_gris', carpinteria: 'madera' }, jardin: 'zen',
    plantas: [[...nucleoN(true), ...vivN('0A', 3)], ...[1, 2, 3, 4].map((n) => [...nucleoN(false), ...vivN(n + 'A', 1.5)])],
  }),
  // 25 · Edificio estrecho con dúplex de remate
  T({
    id: 'ten-alt-estrecho-duplex', nombre: 'Estrecho · dúplex de remate', familia: 'myway', perfiles: ['pareja', 'familia', 'inversor'], acceso: 'N', medianeras: ['E', 'O'], tendencia: 'Dúplex de remate con terraza',
    desc: 'Baja + 5 en 7,50 m de frente: cuatro viviendas de 2 dormitorios, una por planta, y arriba un dúplex de remate. En la cuarta está el día (cocina, aseo, salón de 27 m² y comedor al sur); en la quinta, sin construir sobre el núcleo, dos dormitorios, baño, armarios y una terraza de 17 m². La escalera interior arranca del recibidor y llega a un distribuidor; el ascensor sube hasta la puerta del dúplex.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'zen',
    plantas: [
      [...nucleoN(true), ...vivN('0A', 3)],
      ...[1, 2, 3].map((n) => [...nucleoN(false), ...vivN(n + 'A', 1.5)]),
      [...nucleoN(false), V('cocina', 0, 0, 3, 3, '4A'), V('aseo', 3, 0, 1.5, 3, '4A'), V('pasillo', 0, 3, 4.5, 1.5, '4A', 'Recibidor'),
        V('lavadero', 0, 4.5, 1.5, 4.5, '4A', 'Lavadero · despensa'), V('pasillo', 1.5, 4.5, 1.5, 4.5, '4A', 'Paso'), V('escalera', 3, 4.5, 1.5, 4.5, '4A', { sube: 'S' }),
        V('salon', 0, 9, 4.5, 6, '4A', 'Salón'), V('comedor', 4.5, 9, 3, 6, '4A'), V('terraza', 0, 15, 7.5, 1.5, '4A', 'Balcón')],
      [V('bano', 0, 0, 4.5, 2.25, '4A', 'Baño'), V('vestidor', 0, 2.25, 1.5, 6.75, '4A', 'Armarios'), V('pasillo', 1.5, 2.25, 3, 2.25, '4A', 'Paso'), V('pasillo', 1.5, 4.5, 1.5, 4.5, '4A', 'Paso'),
        V('escalera', 3, 4.5, 1.5, 4.5, '4A', { sube: 'S' }), V('distribuidor', 0, 9, 4.5, 1.5, '4A', 'Distribuidor'),
        V('dormitorio', 0, 10.5, 4.5, 2.25, '4A', 'Dormitorio 2'), V('dormitorio_principal', 4.5, 9, 3, 3.75, '4A'), V('terraza', 0, 12.75, 7.5, 2.25, '4A', 'Terraza de remate')],
    ],
  }),
];
