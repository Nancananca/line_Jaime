// Familias NANCA ampliadas (colección «familias»): derivados de Basic, Line, Natura y My Way (8 por familia) y
// pequeños edificios de la marca. Mismo formato de entrada que core/estandar.mjs; cada modelo lleva coleccion: 'familias'.
// Convenio: y crece hacia el sur, x hacia el este; acceso por el norte salvo indicación; día al sur (jardín).
// Todas las estancias caen en la trama de 0,75 m; pasillos y distribuidores de 1,50 m; escaleras en el mismo hueco en
// todas las plantas. Las escaleras rectas apiladas suben siempre en el mismo sentido (3 m de paso libre bajo el tramo
// superior) y cada planta intermedia lleva un paso de vuelta junto al hueco; las escaleras en U (3 × 3 m) salen y
// llegan por el mismo lado. Entre medianeras E/O la luz entra solo por los lados N/S de fachadas y patios.
const R = (tipo, x, y, w, h, extra) => Object.assign({ tipo, x, y, w, h }, typeof extra === 'string' ? { nombre: extra, nombreFijo: true } : extra || {});
const NF = (nombre, extra) => Object.assign({ nombre, nombreFijo: true }, extra || {});
const F = (familia, logica) => ({ coleccion: 'familias', familia, derivado: `Familia ${{ basic: 'Basic', line: 'Line', natura: 'Natura', myway: 'My Way' }[familia]} · ${logica}` });

// ---------------------------------------------------------------- BASIC: lo esencial, una planta, crece por adición
const BASIC = [
  {
    id: 'fam-basic-semilla', ...F('basic', 'pieza semilla: el porche reserva el sitio de la siguiente pieza'), nombre: 'Basic Semilla 30 · estudio con porche', perfiles: ['solo', 'inversor'], estudio: true,
    desc: 'La pieza mínima del sistema: 7,50 × 4,50 m con banda de servicio al norte (cocina lineal, entrada y baño) y una sola estancia de estar y dormir abierta a la terraza del jardín. El porche del testero este ocupa exactamente la huella de la siguiente pieza: cuando llegue, se cierra sin tocar lo construido.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'praderia',
    plantas: [[
      R('cocina', 0, 0, 3.75, 1.5), R('recibidor', 3.75, 0, 1.5, 1.5, 'Entrada'), R('bano', 5.25, 0, 2.25, 1.5),
      R('salon', 0, 1.5, 7.5, 3, 'Estar · dormir'),
      R('porche', 7.5, 0, 3, 4.5, 'Porche · sitio de la segunda pieza'), R('terraza', 0, 4.5, 7.5, 1.5, 'Terraza al jardín'),
    ]],
  },
  {
    id: 'fam-basic-l-estudio', ...F('basic', 'adición en L: pieza de día y pieza de trabajo y descanso'), nombre: 'Basic L 80 · casa y estudio', perfiles: ['pareja', 'teletrabajo'],
    desc: 'Dos piezas Basic en L unidas por un vestíbulo en el codo. El ala oeste es la de día (cocina, comedor y salón, que se abre al oeste, al sur y a la terraza del rincón); el ala norte lleva el despacho, el dormitorio y el baño con un pasillo propio pegado a la fachada norte. La terraza queda abrazada y protegida.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'praderia',
    plantas: [[
      R('cocina', 0, 0, 4.5, 3), R('comedor', 0, 3, 4.5, 3), R('salon', 0, 6, 4.5, 4.5),
      R('recibidor', 4.5, 0, 1.5, 4.5, 'Vestíbulo'), R('pasillo', 6, 0, 5.25, 1.5, 'Pasillo norte'), R('bano', 11.25, 0, 2.25, 1.5),
      R('despacho', 6, 1.5, 3, 3), R('dormitorio_principal', 9, 1.5, 4.5, 3),
      R('terraza', 4.5, 4.5, 9, 3, 'Terraza del rincón'),
    ]],
  },
  {
    id: 'fam-basic-peine', ...F('basic', 'peine: tres piezas colgadas de una galería, con jardines entre ellas'), nombre: 'Basic Peine 130 · tres piezas', perfiles: ['familia', 'senior'],
    desc: 'Una galería al norte de la que cuelgan tres piezas Basic separadas por jardines de 3 m: la de día al oeste, la de los hijos (dos dormitorios con baño entre ellos) en el centro y la suite con vestidor al este. Todo en planta y sin escalones; cada pieza se puede construir en una fase y los jardines entre piezas dan luz al sur a la galería.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped',
    plantas: [[
      R('lavadero', 0, 0, 2.25, 1.5), R('despensa', 2.25, 0, 1.5, 1.5), R('aseo', 3.75, 0, 2.25, 1.5), R('recibidor', 6, 0, 4.5, 1.5, 'Vestíbulo'),
      R('cocina', 0, 1.5, 3.75, 3), R('comedor', 3.75, 1.5, 3.75, 3), R('salon', 0, 4.5, 7.5, 3),
      R('pasillo', 10.5, 0, 14.25, 1.5, NF('Galería', { huecos: { S: { tipo: 'ventanal', ancho: 2.25 } } })), R('trastero', 24.75, 0, 2.25, 1.5, 'Almacén'),
      R('dormitorio', 10.5, 1.5, 3, 4.5), R('bano', 13.5, 1.5, 1.5, 4.5), R('dormitorio', 15, 1.5, 3, 4.5),
      R('dormitorio_principal', 21, 1.5, 3.75, 4.5), R('vestidor', 24.75, 1.5, 2.25, 2.25), R('bano', 24.75, 3.75, 2.25, 2.25, NF('Baño suite', { suite: true })),
    ]],
  },
  {
    id: 'fam-basic-patio-medianeras', ...F('basic', 'entre medianeras: la pieza se parte con un patio para traer la luz'), nombre: 'Basic Patio 70 · entre medianeras', perfiles: ['pareja', 'inversor'], medianeras: ['E', 'O'],
    desc: 'Una planta en un solar de 7,50 m entre medianeras. Zaguán y paso pegados a la medianera oeste; el dormitorio con su baño mira a la calle y a un patio de 6,00 × 3,00 m que también ilumina la cocina; el salón-comedor y la terraza dan al jardín. La luz entra solo por el norte, el patio y el sur.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'zen',
    plantas: [[
      R('recibidor', 0, 0, 1.5, 1.5, 'Zaguán'), R('pasillo', 0, 1.5, 1.5, 7.5, 'Paso'),
      R('dormitorio_principal', 1.5, 0, 4.5, 3.75), R('bano', 6, 0, 1.5, 3.75, NF('Baño suite', { suite: true })),
      R('patio', 1.5, 3.75, 6, 3, 'Patio'),
      R('cocina', 1.5, 6.75, 4.5, 2.25), R('aseo', 6, 6.75, 1.5, 2.25, 'Aseo · lavadora'),
      R('salon', 0, 9, 7.5, 4.5, 'Salón · comedor'), R('terraza', 0, 13.5, 7.5, 2.25),
    ]],
  },
  {
    id: 'fam-basic-pareada', ...F('basic', 'pareada: dos crujías contra la medianera, jardín al sur y al este'), nombre: 'Basic Pareada 90', perfiles: ['pareja', 'senior'], medianeras: ['O'],
    desc: 'Pareada de una planta con la medianera al oeste. A la calle, un dormitorio y el baño junto al vestíbulo y la cocina-office en la esquina; un pasillo corto reparte a la suite y al salón-comedor, que se abren al sur y al este sobre el porche. Sin escalones.',
    acabados: { fachada: 'mineral', carpinteria: 'clara' }, jardin: 'huerto',
    plantas: [[
      R('dormitorio', 0, 0, 3.75, 3.75), R('bano', 3.75, 0, 2.25, 3.75), R('recibidor', 6, 0, 1.5, 5.25, 'Vestíbulo'), R('cocina', 7.5, 0, 3, 5.25, 'Cocina · office'),
      R('pasillo', 0, 3.75, 6, 1.5),
      R('dormitorio_principal', 0, 5.25, 4.5, 4.5), R('salon', 4.5, 5.25, 6, 4.5, 'Salón · comedor'),
      R('porche', 4.5, 9.75, 6, 2.25),
    ]],
  },
  {
    id: 'fam-basic-doble-crujia', ...F('basic', 'doble crujía: dos filas de piezas a lo largo de un pasillo'), nombre: 'Basic Doble crujía 210 · cinco dormitorios', perfiles: ['familia_numerosa'],
    desc: 'Para familia numerosa en una planta: una barra de 21,75 × 10,50 m en dos crujías. Al norte, cuatro dormitorios a lo largo de dos pasillos y los dos baños a ambos lados del vestíbulo; al sur, cocina, comedor y salón seguidos sobre la terraza, despacho y la suite con baño y vestidor en el testero este.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'cesped',
    plantas: [[
      R('dormitorio', 0, 0, 3.75, 4.5), R('dormitorio', 3.75, 0, 3.75, 4.5), R('bano', 7.5, 0, 2.25, 4.5, 'Baño · dos lavabos'),
      R('recibidor', 9.75, 0, 2.25, 6, 'Vestíbulo'),
      R('bano', 12, 0, 2.25, 4.5, 'Baño · dos lavabos'), R('dormitorio', 14.25, 0, 3.75, 4.5), R('dormitorio', 18, 0, 3.75, 4.5),
      R('pasillo', 0, 4.5, 9.75, 1.5), R('pasillo', 12, 4.5, 9.75, 1.5),
      R('cocina', 0, 6, 3.75, 4.5), R('comedor', 3.75, 6, 3.75, 4.5), R('salon', 7.5, 6, 5.25, 4.5),
      R('despacho', 12.75, 6, 2.25, 4.5), R('dormitorio_principal', 15, 6, 3.75, 4.5),
      R('bano', 18.75, 6, 3, 2.25, NF('Baño suite', { suite: true })), R('vestidor', 18.75, 8.25, 3, 2.25),
      R('terraza', 0, 10.5, 12.75, 2.25, 'Terraza al jardín'),
    ]],
  },
  {
    id: 'fam-basic-anexo', ...F('basic', 'adición de una segunda casa: anexo independiente tras un porche común'), nombre: 'Basic Casa y anexo 130', perfiles: ['multigeneracional', 'familia'],
    desc: 'La casa familiar (tres dormitorios, dos baños, cocina-comedor y salón al sur) y, al otro lado de un porche común, un anexo de un dormitorio con estar, cocina y baño propios para los abuelos o un hijo mayor. Una sola entrada desde la calle; el anexo tiene su puerta bajo el porche.',
    acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'huerto',
    plantas: [[
      R('dormitorio', 0, 0, 3, 3), R('bano', 3, 0, 1.5, 3), R('bano', 4.5, 0, 1.5, 3, 'Baño 2 · lavadora'), R('recibidor', 6, 0, 1.5, 3, 'Vestíbulo'), R('cocina', 7.5, 0, 4.5, 4.5, 'Cocina · comedor'),
      R('pasillo', 0, 3, 7.5, 1.5),
      R('dormitorio', 0, 4.5, 3, 3.75), R('dormitorio_principal', 3, 4.5, 3.75, 3.75), R('salon', 6.75, 4.5, 5.25, 3.75),
      R('porche', 12, 0, 3, 8.25, 'Porche común'),
      R('bano', 15, 0, 2.25, 3.75, 'Baño anexo'), R('dormitorio', 17.25, 0, 3.75, 3.75, 'Dormitorio anexo'),
      R('salon', 15, 3.75, 3.75, 4.5, 'Estar anexo'), R('cocina', 18.75, 3.75, 2.25, 4.5, 'Cocina anexo'),
    ]],
  },
  {
    id: 'fam-basic-apilada', ...F('basic', 'adición en vertical: tres piezas apiladas entre medianeras'), nombre: 'Basic Apilada 3 alturas · 6 m', perfiles: ['pareja', 'teletrabajo'], medianeras: ['E', 'O'],
    desc: 'Tres piezas Basic de 6,00 × 11,25 m apiladas en un solar estrecho. Una banda central con la escalera recta, que sube siempre hacia el este, y su paso de vuelta separa la crujía de calle de la de jardín. Abajo, despacho y aseo a la calle y cocina-comedor y salón al jardín; en la primera, dos dormitorios y baño; arriba, estudio, tendedero y terraza en cubierta con pérgola.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'zen',
    plantas: [[
      R('recibidor', 0, 0, 1.5, 3.75, 'Zaguán'), R('aseo', 1.5, 0, 1.5, 3.75, 'Aseo · lavadora'), R('despacho', 3, 0, 3, 3.75, 'Despacho · invitados'),
      R('pasillo', 0, 3.75, 6, 1.5, 'Paso'), R('escalera', 0, 5.25, 4.5, 1.5, { sube: 'E' }), R('pasillo', 4.5, 5.25, 1.5, 1.5, 'Paso'),
      R('cocina', 0, 6.75, 3, 4.5, 'Cocina · comedor'), R('salon', 3, 6.75, 3, 4.5),
    ], [
      R('dormitorio', 0, 0, 3.75, 3.75), R('bano', 3.75, 0, 2.25, 3.75),
      R('pasillo', 0, 3.75, 6, 1.5, 'Paso'), R('escalera', 0, 5.25, 4.5, 1.5, { sube: 'E' }), R('pasillo', 4.5, 5.25, 1.5, 1.5, 'Rellano'),
      R('vestidor', 0, 6.75, 1.5, 4.5, 'Armario'), R('dormitorio_principal', 1.5, 6.75, 4.5, 4.5),
    ], [
      R('despacho', 0, 0, 4.5, 3.75, 'Estudio'), R('lavadero', 4.5, 0, 1.5, 3.75, 'Tendedero'),
      R('pasillo', 0, 3.75, 6, 1.5, 'Paso'), R('escalera', 0, 5.25, 4.5, 1.5, { sube: 'E' }), R('pasillo', 4.5, 5.25, 1.5, 1.5, NF('Rellano', { huecos: { S: { tipo: 'puerta' } } })),
      R('terraza', 0, 6.75, 6, 4.5, NF('Terraza en cubierta · pérgola', { pergola: true })),
    ]],
  },
];

// ---------------------------------------------------------------- LINE: una línea abierta al paisaje, alas y porche
const LINE = [
  {
    id: 'fam-line-refugio', ...F('line', 'porche partido: dos tramos de la línea separados por el salón exterior'), nombre: 'Line Refugio 45 · porche partido', perfiles: ['solo', 'inversor'],
    desc: 'Una línea de 15 m partida por un porche de 3 m: a un lado, el tramo de día (cocina lineal, entrada, aseo y estar-comedor); al otro, la alcoba con baño y vestidor, a la que se llega cruzando el porche. Dormir al otro lado del salón exterior; para alquilar, dos piezas que funcionan por separado.',
    acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'mediterraneo',
    plantas: [[
      R('vestidor', 0, 0, 2.25, 1.5), R('bano', 2.25, 0, 2.25, 1.5, NF('Baño suite', { suite: true })), R('dormitorio_principal', 0, 1.5, 4.5, 3, 'Alcoba'),
      R('porche', 4.5, 0, 3, 4.5, 'Salón exterior'),
      R('cocina', 7.5, 0, 3.75, 1.5), R('recibidor', 11.25, 0, 1.5, 1.5, 'Entrada'), R('aseo', 12.75, 0, 2.25, 1.5),
      R('salon', 7.5, 1.5, 7.5, 3, 'Estar · comedor'),
      R('terraza', 0, 4.5, 15, 1.5, 'Tarima'),
    ]],
  },
  {
    id: 'fam-line-alas-z', ...F('line', 'alas desplazadas: dos tramos en Z articulados por el vestíbulo y el porche'), nombre: 'Line Alas en Z 110', perfiles: ['familia'],
    desc: 'Dos alas desplazadas 3 m que se articulan en el vestíbulo. El ala de noche, al oeste, ordena tres dormitorios a lo largo de un pasillo norte (la suite con su baño); el ala de día, al este y adelantada hacia el jardín, encadena comedor, cocina pasante y salón. En el quiebro, un porche orientado al sur hace de salón exterior.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'mediterraneo',
    plantas: [[
      R('pasillo', 0, 0, 12.75, 1.5, 'Pasillo de noche'),
      R('dormitorio_principal', 0, 1.5, 3.75, 3), R('bano', 3.75, 1.5, 1.5, 3, NF('Baño suite', { suite: true })), R('dormitorio', 5.25, 1.5, 3, 3), R('bano', 8.25, 1.5, 1.5, 3), R('dormitorio', 9.75, 1.5, 3, 3),
      R('recibidor', 12.75, 0, 3, 4.5, 'Vestíbulo'),
      R('comedor', 15.75, 3, 3.75, 4.5), R('cocina', 19.5, 3, 3, 4.5, 'Cocina pasante'), R('salon', 22.5, 3, 5.25, 4.5),
      R('porche', 9.75, 4.5, 6, 3, 'Porche del quiebro'), R('terraza', 15.75, 7.5, 12, 2.25, 'Terraza de piedra'),
    ]],
  },
  {
    id: 'fam-line-u-agua', ...F('line', 'dos alas y un frente: la línea se pliega en U alrededor del agua'), nombre: 'Line U 180 · patio de agua', perfiles: ['familia_numerosa', 'familia'],
    desc: 'La línea se pliega en U alrededor de un patio con lámina de agua abierto al sur. El frente norte es el de día (cocina, comedor y salón de 27 m² sobre el porche) con el vestíbulo y el despacho; el ala oeste, con galería al patio, lleva tres dormitorios y dos baños; el ala este, la suite con vestidor y baño.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'mediterraneo',
    plantas: [[
      R('cocina', 0, 0, 3.75, 4.5), R('comedor', 3.75, 0, 3.75, 4.5), R('salon', 7.5, 0, 6, 4.5), R('recibidor', 13.5, 0, 1.5, 4.5, 'Vestíbulo'), R('despacho', 15, 0, 4.5, 3.75),
      R('pasillo', 4.5, 4.5, 1.5, 14.25, 'Galería del patio'),
      R('dormitorio', 0, 4.5, 4.5, 3.75), R('bano', 0, 8.25, 4.5, 1.5), R('dormitorio', 0, 9.75, 4.5, 3.75), R('bano', 0, 13.5, 4.5, 1.5), R('dormitorio', 0, 15, 4.5, 3.75),
      R('pasillo', 13.5, 4.5, 1.5, 5.25, 'Galería este'),
      R('dormitorio_principal', 15, 3.75, 4.5, 3.75), R('vestidor', 15, 7.5, 2.25, 2.25), R('bano', 17.25, 7.5, 2.25, 2.25, NF('Baño suite', { suite: true })),
      R('porche', 6, 4.5, 7.5, 3, 'Porche al agua'), R('piscina', 7.5, 9, 4.5, 6, 'Lámina de agua'),
    ]],
  },
  {
    id: 'fam-line-senior', ...F('line', 'línea sin escalones con un dormitorio en cada extremo'), nombre: 'Line Sénior 110 · dos extremos', perfiles: ['senior', 'pareja'],
    desc: 'Barra de 20,25 m en una planta y sin escalones. Una galería norte de 1,50 m une el vestíbulo con los dos extremos: al oeste, un dormitorio para invitados o cuidador junto al baño adaptado (giro de 1,50 m); al este, la suite. En el centro, cocina y salón-comedor abiertos al porche del sur.',
    acabados: { fachada: 'cobre', carpinteria: 'clara' }, jardin: 'mediterraneo',
    plantas: [[
      R('pasillo', 0, 0, 9.75, 1.5, 'Galería norte'), R('recibidor', 9.75, 0, 2.25, 1.5, 'Vestíbulo'), R('pasillo', 12, 0, 5.25, 1.5, 'Galería'), R('bano', 17.25, 0, 3, 1.5, NF('Baño suite', { suite: true })),
      R('dormitorio', 0, 1.5, 3.75, 4.5, 'Dormitorio · invitados o cuidador'), R('bano', 3.75, 1.5, 2.25, 4.5, 'Baño adaptado'), R('cocina', 6, 1.5, 3.75, 4.5),
      R('salon', 9.75, 1.5, 6, 4.5, 'Salón · comedor'), R('dormitorio_principal', 15.75, 1.5, 4.5, 4.5),
      R('porche', 6, 6, 9.75, 2.25),
    ]],
  },
  {
    id: 'fam-line-pasante', ...F('line', 'línea pasante entre medianeras con el salón exterior en medio'), nombre: 'Line Pasante 135 · entre medianeras', perfiles: ['familia', 'teletrabajo'], medianeras: ['E', 'O'],
    desc: 'En un solar de 9 m entre medianeras la línea corre de la calle al jardín y se abre en medio a un patio-porche con pérgola. Delante, dos dormitorios, zaguán y aseo; junto al patio, la suite y el baño; detrás, comedor y cocina mirando al patio y salón y despacho al jardín. Una galería pegada a la medianera oeste cose las tres partes.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'madera' }, jardin: 'zen',
    plantas: [[
      R('dormitorio', 0, 0, 3.75, 3.75), R('recibidor', 3.75, 0, 1.5, 3.75, 'Zaguán'), R('aseo', 5.25, 0, 1.5, 3.75), R('dormitorio', 6.75, 0, 2.25, 3.75),
      R('pasillo', 0, 3.75, 9, 1.5), R('pasillo', 0, 5.25, 1.5, 7.5, 'Galería'),
      R('bano', 1.5, 5.25, 2.25, 3), R('dormitorio_principal', 3.75, 5.25, 5.25, 3),
      R('terraza', 1.5, 8.25, 7.5, 4.5, NF('Patio-porche · pérgola', { pergola: true })),
      R('comedor', 0, 12.75, 4.5, 3), R('cocina', 4.5, 12.75, 4.5, 3),
      R('salon', 0, 15.75, 6, 4.5), R('despacho', 6, 15.75, 3, 4.5),
    ]],
  },
  {
    id: 'fam-line-t-trabajo', ...F('line', 'línea en T: un brazo al norte para el trabajo junto a la entrada'), nombre: 'Line T 115 · trabajo en casa', perfiles: ['teletrabajo', 'familia'],
    desc: 'Una barra este-oeste con un brazo corto hacia la calle: el despacho, el aseo y el lavadero quedan junto al vestíbulo, de modo que quien viene a trabajar no cruza la casa. La barra lleva tres dormitorios y el baño al oeste y comedor, cocina y salón al este, sobre un porche corrido.',
    acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'praderia',
    plantas: [[
      R('despacho', 6, 0, 3.75, 3), R('aseo', 6, 3, 1.5, 1.5), R('lavadero', 7.5, 3, 2.25, 1.5), R('recibidor', 9.75, 0, 2.25, 4.5, 'Vestíbulo'),
      R('bano', 0, 4.5, 3, 1.5), R('pasillo', 3, 4.5, 6.75, 1.5),
      R('dormitorio_principal', 0, 6, 3.75, 3), R('dormitorio', 3.75, 6, 3, 3), R('dormitorio', 6.75, 6, 3, 3),
      R('comedor', 9.75, 4.5, 3.75, 4.5), R('cocina', 13.5, 4.5, 3, 4.5), R('salon', 16.5, 4.5, 6, 4.5),
      R('porche', 9.75, 9, 12.75, 2.25),
    ]],
  },
  {
    id: 'fam-line-dos-casas', ...F('line', 'línea larga con dos casas: abuelos en un extremo y familia en el otro'), nombre: 'Line Dos casas en línea 175', perfiles: ['multigeneracional', 'familia_numerosa'],
    desc: 'Una sola línea de 31,50 m para tres generaciones: al oeste, el apartamento de los abuelos (estar con cocina, dormitorio y baño adaptado) con su propio paso; en el centro, el vestíbulo común, la cocina lineal, el comedor y el salón; al este, el ala de noche de la familia con pasillo norte, dos dormitorios, baño y suite. Un porche común recorre el frente de día.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'madera' }, jardin: 'huerto',
    plantas: [[
      R('bano', 0, 0, 3, 1.5, 'Baño adaptado'), R('pasillo', 3, 0, 6, 1.5, 'Paso apartamento'),
      R('dormitorio', 0, 1.5, 4.5, 4.5, 'Dormitorio abuelos'), R('salon', 4.5, 1.5, 4.5, 4.5, 'Estar · cocina abuelos'),
      R('recibidor', 9, 0, 3, 1.5, 'Vestíbulo común'), R('cocina', 12, 0, 4.5, 1.5, 'Cocina lineal'),
      R('comedor', 9, 1.5, 3.75, 4.5), R('salon', 12.75, 1.5, 6, 4.5),
      R('pasillo', 16.5, 0, 12, 1.5, 'Pasillo de noche'), R('bano', 28.5, 0, 3, 1.5, NF('Baño suite', { suite: true })),
      R('dormitorio', 18.75, 1.5, 3, 4.5), R('bano', 21.75, 1.5, 2.25, 4.5), R('dormitorio', 24, 1.5, 3, 4.5), R('dormitorio_principal', 27, 1.5, 4.5, 4.5),
      R('porche', 0, 6, 18.75, 2.25, 'Porche común'),
    ]],
  },
  {
    id: 'fam-line-torre', ...F('line', 'línea con torre: el testero sube tres alturas hasta un mirador'), nombre: 'Line Torre mirador · 3 alturas', perfiles: ['familia', 'teletrabajo'],
    desc: 'Una barra de una planta (dos dormitorios, baño, cocina y salón-comedor sobre el porche) que en su testero este se levanta en torre de tres alturas con una escalera en U: vestíbulo y aseo abajo, biblioteca con salida a la terraza sobre el salón en la primera y, arriba, un mirador acristalado sobre el paisaje.',
    acabados: { fachada: 'cobre', carpinteria: 'oscura' }, jardin: 'mediterraneo',
    plantas: [[
      R('dormitorio_principal', 0, 0, 3.75, 4.5), R('pasillo', 3.75, 0, 9, 1.5), R('bano', 3.75, 1.5, 2.25, 3), R('dormitorio', 6, 1.5, 3, 3),
      R('cocina', 9, 1.5, 3.75, 3), R('salon', 12.75, 0, 5.25, 4.5, 'Salón · comedor'),
      R('recibidor', 18, 0, 3, 3, 'Vestíbulo'), R('aseo', 18, 3, 3, 1.5), R('escalera', 21, 0, 3, 3, { sube: 'N' }), R('pasillo', 21, 3, 3, 1.5, 'Rellano'),
      R('porche', 9, 4.5, 9, 2.25),
    ], [
      R('terraza', 12.75, 0, 5.25, 4.5, 'Terraza sobre el salón'),
      R('despacho', 18, 0, 3, 4.5, NF('Biblioteca', { huecos: { O: { tipo: 'puerta' }, S: { tipo: 'ventanal', ancho: 2.25 }, N: { tipo: 'ventana', ancho: 1.5 } } })), R('escalera', 21, 0, 3, 3, { sube: 'N' }), R('pasillo', 21, 3, 3, 1.5, 'Rellano'),
    ], [
      R('despacho', 18, 0, 3, 4.5, NF('Mirador', { huecos: { S: { tipo: 'ventanal', ancho: 2.25 }, O: { tipo: 'ventanal', ancho: 3 }, N: { tipo: 'ventana', ancho: 1.5 } } })), R('escalera', 21, 0, 3, 3, { sube: 'N' }), R('pasillo', 21, 3, 3, 1.5, 'Rellano'),
    ]],
  },
];

// ---------------------------------------------------------------- NATURA: patio, lamas, sombra, terrazas
const LAMAS = (lados, altura = 'doble') => ({ lados, altura, material: 'madera' });
const NATURA = [
  {
    id: 'fam-natura-estudio-patio', ...F('natura', 'patio de lamas en miniatura junto a la pieza'), nombre: 'Natura Estudio 35 · patio de lamas', perfiles: ['solo', 'inversor'],
    desc: 'Una pieza de 6,75 × 6,00 m con un dormitorio y un patio estrecho de lamas de madera en el costado este: el baño y el dormitorio se abren a él con luz tamizada y vistas filtradas. El estar-comedor da a una terraza con pérgola al sur.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'madera' }, jardin: 'zen',
    plantas: [[
      R('cocina', 0, 0, 3, 1.5), R('recibidor', 3, 0, 1.5, 1.5, 'Entrada'), R('bano', 4.5, 0, 2.25, 1.5),
      R('salon', 0, 1.5, 3.75, 4.5, 'Estar · comedor'), R('dormitorio', 3.75, 1.5, 3, 4.5),
      R('patio', 6.75, 0, 2.25, 6, NF('Patio de lamas', { celosia: LAMAS(['N', 'E', 'S'], 'simple'), pergola: true })),
      R('terraza', 0, 6, 6.75, 2.25, NF('Terraza · pérgola', { pergola: true })),
    ]],
  },
  {
    id: 'fam-natura-medianeras-3', ...F('natura', 'entre medianeras: patio de luces que atraviesa tres alturas'), nombre: 'Natura Patio de luces · 3 alturas', perfiles: ['familia', 'familia_numerosa'], medianeras: ['E', 'O'],
    desc: 'Casa de 7,50 m de frente entre medianeras, en tres plantas alrededor de un patio de luces de 4,50 × 3,00 m que baja hasta la planta baja. La escalera recta, junto a la medianera oeste, sube siempre hacia el jardín con un paso de vuelta a su lado. Abajo, despacho a la calle y salón y cocina al jardín; en la primera, tres dormitorios y dos baños; arriba, la suite y una terraza en cubierta con pérgola.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'oscura' }, jardin: 'cesped',
    plantas: [[
      R('recibidor', 0, 0, 3, 3.75, 'Zaguán'), R('despacho', 3, 0, 4.5, 3.75, 'Despacho · invitados'),
      R('escalera', 0, 3.75, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 3.75, 1.5, 4.5, 'Paso'),
      R('patio', 3, 3.75, 4.5, 3, 'Patio de luces'), R('aseo', 3, 6.75, 4.5, 1.5, 'Aseo · lavadero'),
      R('salon', 0, 8.25, 4.5, 4.5, 'Salón · comedor'), R('cocina', 4.5, 8.25, 3, 4.5),
    ], [
      R('bano', 0, 0, 3, 2.25), R('distribuidor', 0, 2.25, 3, 1.5), R('dormitorio', 3, 0, 4.5, 3.75),
      R('escalera', 0, 3.75, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 3.75, 1.5, 4.5, 'Paso'),
      R('patio', 3, 3.75, 4.5, 3, 'Patio de luces'), R('bano', 3, 6.75, 4.5, 1.5),
      R('distribuidor', 0, 8.25, 7.5, 1.5, 'Rellano'), R('dormitorio', 0, 9.75, 3.75, 3), R('dormitorio', 3.75, 9.75, 3.75, 3),
    ], [
      R('bano', 0, 0, 3, 2.25, NF('Baño suite', { suite: true })), R('distribuidor', 0, 2.25, 3, 1.5), R('dormitorio_principal', 3, 0, 4.5, 3.75, 'Suite en cubierta'),
      R('escalera', 0, 3.75, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 3.75, 1.5, 4.5, 'Paso'),
      R('patio', 3, 3.75, 4.5, 3, 'Patio de luces'), R('vestidor', 3, 6.75, 4.5, 1.5, 'Armarios'),
      R('pasillo', 0, 8.25, 3, 1.5, NF('Rellano', { huecos: { S: { tipo: 'puerta' } } })),
      R('terraza', 3, 8.25, 4.5, 4.5, NF('Terraza en cubierta · pérgola', { pergola: true })), R('terraza', 0, 9.75, 3, 3, 'Terraza en cubierta'),
    ]],
  },
  {
    id: 'fam-natura-pareada', ...F('natura', 'pareada con el patio lateral de lamas a doble altura'), nombre: 'Natura Pareada 160 · patio lateral', perfiles: ['familia'], medianeras: ['O'],
    desc: 'Pareada de dos plantas con la medianera al oeste y, en el costado libre, el patio lateral de lamas de la familia: dos patios abiertos a doble altura y, entre ellos, un tramo cubierto que en la planta alta es terraza. Abajo, vestíbulo con aseo, cocina-comedor al patio y salón al jardín; arriba, dos dormitorios, baño, tendedero y suite con vestidor.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'madera' }, jardin: 'cesped',
    plantas: [[
      R('recibidor', 0, 0, 3, 3, 'Vestíbulo'), R('aseo', 3, 0, 1.5, 3), R('lavadero', 4.5, 0, 3, 3, 'Lavadero · despensa'),
      R('escalera', 0, 3, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 3, 1.5, 4.5, 'Paso'), R('cocina', 3, 3, 4.5, 4.5, 'Cocina · comedor'),
      R('salon', 0, 7.5, 7.5, 4.5),
      R('patio', 7.5, 0, 3, 4.5, NF('Patio de lamas', { celosia: LAMAS(['N', 'E']), pergola: true })),
      R('porche', 7.5, 4.5, 3, 4.5, NF('Patio de lamas · cubierto', { celosia: LAMAS(['E'], 'simple') })),
      R('patio', 7.5, 9, 3, 3, NF('Patio de lamas', { celosia: LAMAS(['E', 'S']), pergola: true })),
    ], [
      R('dormitorio', 0, 0, 3, 3), R('dormitorio', 3, 0, 4.5, 4.5),
      R('escalera', 0, 3, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 3, 1.5, 4.5, 'Paso'),
      R('bano', 3, 4.5, 4.5, 1.5), R('lavadero', 3, 6, 4.5, 1.5, 'Tendedero'),
      R('pasillo', 0, 7.5, 7.5, 1.5),
      R('dormitorio_principal', 0, 9, 4.5, 3), R('vestidor', 4.5, 9, 3, 1.5), R('bano', 4.5, 10.5, 3, 1.5, NF('Baño suite', { suite: true })),
      R('terraza', 7.5, 4.5, 3, 4.5, 'Terraza sobre el patio'),
    ]],
  },
  {
    id: 'fam-natura-claustro', ...F('natura', 'claustro: base en U alrededor del patio y volumen alto asimétrico al sur'), nombre: 'Natura Claustro 190', perfiles: ['familia', 'familia_numerosa', 'teletrabajo'],
    desc: 'La planta baja rodea un patio cuadrado: galería y servicios al norte, cocina y comedor al oeste, escalera y despacho al este y, al sur, el salón y un porche de lamas. Sobre el frente sur se apoya un único volumen alto, asimétrico, con cuatro dormitorios (la suite asomada al este) y un pasillo que mira al patio desde arriba.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'oscura' }, jardin: 'mediterraneo',
    plantas: [[
      R('cocina', 0, 0, 4.5, 4.5, 'Cocina · office'), R('recibidor', 4.5, 0, 4.5, 3, 'Vestíbulo'), R('aseo', 9, 0, 1.5, 3), R('lavadero', 10.5, 0, 3, 3),
      R('pasillo', 4.5, 3, 9, 1.5, NF('Galería norte', { huecos: { S: { tipo: 'ventanal', ancho: 3 } } })),
      R('comedor', 0, 4.5, 4.5, 4.5), R('patio', 4.5, 4.5, 4.5, 4.5, 'Patio'), R('escalera', 9, 4.5, 1.5, 4.5, { sube: 'S' }), R('despacho', 10.5, 4.5, 3, 4.5),
      R('salon', 0, 9, 6, 4.5), R('porche', 6, 9, 7.5, 4.5, NF('Porche de lamas', { celosia: LAMAS(['S'], 'simple') })),
    ], [
      R('escalera', 9, 4.5, 1.5, 4.5, { sube: 'S' }), R('bano', 10.5, 4.5, 3, 1.5, NF('Baño suite', { suite: true })), R('dormitorio_principal', 10.5, 6, 3, 4.5),
      R('dormitorio', 0, 9, 3, 4.5), R('pasillo', 3, 9, 7.5, 1.5, 'Pasillo al patio'),
      R('dormitorio', 3, 10.5, 3, 3), R('dormitorio', 6, 10.5, 3, 3), R('bano', 9, 10.5, 1.5, 3), R('vestidor', 10.5, 10.5, 3, 3, 'Vestidor suite'),
    ]],
  },
  {
    id: 'fam-natura-senior', ...F('natura', 'una planta en L abrazando un patio de lamas'), nombre: 'Natura Sénior 130 · patio y sombra', perfiles: ['senior', 'pareja'],
    desc: 'Todo en planta, sin escalones, en L alrededor de un patio de 6,00 × 6,75 m cerrado al sur por lamas de madera y cubierto en parte por una pérgola: sombra en verano y sol en invierno. La galería del patio lleva del vestíbulo al baño adaptado, al dormitorio de invitados y a la suite; cocina, comedor y salón ocupan el ala oeste.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'madera' }, jardin: 'praderia',
    plantas: [[
      R('cocina', 0, 0, 4.5, 4.5), R('recibidor', 4.5, 0, 2.25, 3, 'Vestíbulo'), R('lavadero', 6.75, 0, 2.25, 3), R('bano', 9, 0, 3, 3, 'Baño adaptado'), R('dormitorio', 12, 0, 4.5, 3, 'Dormitorio invitados'),
      R('pasillo', 4.5, 3, 12, 1.5, NF('Galería del patio', { huecos: { S: { tipo: 'ventanal', ancho: 3 } } })),
      R('comedor', 0, 4.5, 6, 3), R('salon', 0, 7.5, 6, 3.75),
      R('patio', 6, 4.5, 6, 6.75, NF('Patio de lamas', { celosia: LAMAS(['S'], 'simple'), pergola: true })),
      R('dormitorio_principal', 12, 4.5, 4.5, 4.5), R('vestidor', 12, 9, 2.25, 2.25), R('bano', 14.25, 9, 2.25, 2.25, NF('Baño suite', { suite: true })),
      R('terraza', 0, 11.25, 6, 2.25, NF('Terraza · pérgola', { pergola: true })),
    ]],
  },
  {
    id: 'fam-natura-patio-vertical', ...F('natura', 'patio de lamas a doble altura dentro de la caja de dos plantas'), nombre: 'Natura Patio vertical 185 · teletrabajo', perfiles: ['teletrabajo', 'familia'],
    desc: 'Caja de 10,50 × 12,00 m en dos plantas vaciada por un patio de lamas a doble altura en su costado este, que ilumina la cocina, la suite y su baño. El despacho queda junto al vestíbulo, separado de la vida doméstica; el salón-comedor ocupa todo el frente del jardín. Arriba, dos dormitorios y baño a la calle y la suite con vestidor abierta a terrazas con pérgola.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'oscura' }, jardin: 'cesped',
    plantas: [[
      R('recibidor', 0, 0, 3, 3, 'Vestíbulo'), R('despacho', 3, 0, 4.5, 3), R('aseo', 7.5, 0, 3, 3, 'Aseo · lavadero'),
      R('escalera', 0, 3, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 3, 9, 1.5, 'Paso'), R('pasillo', 1.5, 4.5, 1.5, 3, 'Paso al salón'),
      R('cocina', 3, 4.5, 3, 3), R('patio', 6, 4.5, 4.5, 3, NF('Patio de lamas', { celosia: LAMAS(['E']), pergola: true })),
      R('salon', 0, 7.5, 10.5, 4.5, 'Salón · comedor'),
    ], [
      R('dormitorio', 0, 0, 3.75, 3), R('bano', 3.75, 0, 2.25, 3), R('dormitorio', 6, 0, 4.5, 3),
      R('escalera', 0, 3, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 3, 9, 1.5, 'Distribuidor'),
      R('pasillo', 1.5, 4.5, 1.5, 4.5, 'Paso'), R('pasillo', 0, 7.5, 1.5, 1.5, NF('Rellano', { huecos: { S: { tipo: 'puerta' } } })),
      R('vestidor', 3, 4.5, 3, 3), R('patio', 6, 4.5, 4.5, 3, 'Patio de lamas'),
      R('dormitorio_principal', 3, 7.5, 4.5, 3), R('bano', 7.5, 7.5, 3, 3, NF('Baño suite', { suite: true })),
      R('terraza', 0, 9, 3, 3, 'Terraza'), R('terraza', 3, 10.5, 7.5, 1.5, NF('Terraza · pérgola', { pergola: true })),
    ]],
  },
  {
    id: 'fam-natura-dos-casas', ...F('natura', 'dos casas alrededor de un patio común de lamas'), nombre: 'Natura Dos casas, un patio · tres generaciones', perfiles: ['multigeneracional', 'familia_numerosa'],
    desc: 'Una casa familiar de dos plantas y un apartamento de una, enfrentadas sobre un patio de lamas de 4,50 × 7,50 m y unidas al norte por el zaguán común, la única entrada. La casa tiene cocina y comedor, salón y biblioteca al jardín y, arriba, tres dormitorios y terraza con pérgola; el apartamento, accesible, tiene dormitorio, baño adaptado, cocina y estar en torno a un patio propio con pérgola.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'madera' }, jardin: 'huerto',
    plantas: [[
      R('lavadero', 0, 0, 3, 3), R('cocina', 3, 0, 3, 3), R('pasillo', 6, 0, 3, 3, 'Paso'),
      R('comedor', 0, 3, 7.5, 4.5), R('escalera', 7.5, 3, 1.5, 4.5, { sube: 'S' }),
      R('salon', 0, 7.5, 6, 4.5), R('aseo', 6, 7.5, 3, 1.5), R('despacho', 6, 9, 3, 3, 'Biblioteca'),
      R('recibidor', 9, 0, 4.5, 4.5, 'Zaguán común'),
      R('patio', 9, 4.5, 4.5, 7.5, NF('Patio de lamas', { celosia: LAMAS(['S']), pergola: true })),
      R('dormitorio', 13.5, 0, 3.75, 3, 'Dormitorio apartamento'), R('bano', 17.25, 0, 2.25, 3, 'Baño adaptado'), R('vestidor', 19.5, 0, 1.5, 3, 'Armario'),
      R('pasillo', 13.5, 3, 7.5, 1.5, 'Paso apartamento'),
      R('cocina', 13.5, 4.5, 3, 3, 'Cocina apartamento'), R('terraza', 16.5, 4.5, 4.5, 3, NF('Patio del apartamento', { pergola: true })),
      R('salon', 13.5, 7.5, 7.5, 4.5, 'Estar apartamento'),
    ], [
      R('dormitorio', 0, 0, 3.75, 3), R('bano', 3.75, 0, 2.25, 3), R('dormitorio', 6, 0, 3, 3),
      R('pasillo', 0, 3, 7.5, 1.5), R('escalera', 7.5, 3, 1.5, 4.5, { sube: 'S' }),
      R('dormitorio_principal', 0, 4.5, 4.5, 4.5), R('vestidor', 4.5, 4.5, 1.5, 4.5), R('pasillo', 6, 4.5, 1.5, 4.5, 'Paso'), R('pasillo', 7.5, 7.5, 1.5, 1.5, NF('Rellano', { huecos: { S: { tipo: 'puerta' } } })),
      R('bano', 0, 9, 3, 3, NF('Baño suite', { suite: true })), R('terraza', 3, 9, 6, 3, NF('Terraza · pérgola', { pergola: true })),
    ]],
  },
  {
    id: 'fam-natura-duplex', ...F('natura', 'dúplex compacto con la terraza y la sombra en la planta alta'), nombre: 'Natura Dúplex 115 · terraza y lamas', perfiles: ['pareja', 'teletrabajo'],
    desc: 'Dúplex de 7,50 × 9,00 m: abajo, entrada con aseo, cocina a la calle y un salón-comedor de 36 m² abierto al sur y al este; la escalera arranca junto a la salida al jardín. Arriba, un distribuidor que hace de rincón de lectura, el dormitorio principal, un segundo dormitorio, el baño y una terraza con pérgola sobre el jardín.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'madera' }, jardin: 'zen',
    plantas: [[
      R('aseo', 0, 0, 1.5, 3), R('recibidor', 1.5, 0, 1.5, 3, 'Entrada'), R('cocina', 3, 0, 4.5, 3),
      R('escalera', 0, 3, 1.5, 4.5, { sube: 'N' }), R('salon', 1.5, 3, 6, 6, 'Salón · comedor'), R('pasillo', 0, 7.5, 1.5, 1.5, 'Salida al jardín'),
    ], [
      R('distribuidor', 0, 0, 3, 3, 'Distribuidor · lectura'), R('dormitorio_principal', 3, 0, 4.5, 3),
      R('escalera', 0, 3, 1.5, 4.5, { sube: 'N' }), R('pasillo', 1.5, 3, 1.5, 4.5, NF('Paso', { huecos: { S: { tipo: 'puerta' } } })),
      R('bano', 3, 3, 4.5, 2.25), R('dormitorio', 3, 5.25, 4.5, 3.75),
      R('terraza', 0, 7.5, 3, 1.5, NF('Terraza · pérgola', { pergola: true, celosia: LAMAS(['O'], 'simple') })),
    ]],
  },
];

// ---------------------------------------------------------------- MY WAY: cubierta a dos aguas, doble altura, altillo
const DOS = (extra) => Object.assign({ tipo: 'dos', material: 'chapa', color: 'grafito', pendiente: 35, alero: 0.5 }, extra || {});
const MYWAY = [
  {
    id: 'fam-myway-refugio', ...F('myway', 'una nave a dos aguas con porche en el hastial'), nombre: 'My Way Refugio 35 · una nave', perfiles: ['solo', 'pareja'],
    desc: 'Una sola nave de 4,50 × 9,00 m bajo cubierta de chapa a dos aguas, con el techo de madera visto hasta la cumbrera. Cocina y entrada al norte, estar-comedor en el centro con ventanas a los dos costados, alcoba y baño al fondo y un porche en el hastial sur.',
    acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'bosque', cubierta: DOS({ pendiente: 40 }),
    plantas: [[
      R('cocina', 0, 0, 3, 1.5), R('recibidor', 3, 0, 1.5, 1.5, 'Entrada'),
      R('salon', 0, 1.5, 4.5, 4.5, 'Estar · comedor'),
      R('dormitorio', 0, 6, 3, 3, 'Alcoba'), R('bano', 3, 6, 1.5, 3),
      R('porche', 0, 9, 4.5, 2.25, 'Porche en el hastial'),
    ]],
  },
  {
    id: 'fam-myway-dos-naves', ...F('myway', 'dos naves paralelas unidas por una rótula de entrada'), nombre: 'My Way Dos naves 150 · casa y estudio', perfiles: ['teletrabajo', 'pareja'],
    desc: 'Dos naves de 6 m a dos aguas, paralelas y unidas por una rótula acristalada que es la entrada. La nave oeste es la de día: cocina-comedor al norte, salón a doble altura al jardín y, sobre la cocina, un estudio en altillo al que se sube por una escalera junto al salón. La nave este es la de noche, con pasillo propio, dos dormitorios y baño.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'bosque', cubierta: DOS(),
    plantas: [[
      R('cocina', 0, 0, 6, 3, 'Cocina · comedor'), R('escalera', 0, 3, 4.5, 1.5, { sube: 'E' }), R('pasillo', 4.5, 3, 1.5, 1.5, 'Arranque'),
      R('salon', 0, 4.5, 6, 6, 'Salón · doble altura'),
      R('recibidor', 6, 3, 3, 4.5, 'Rótula de entrada'),
      R('pasillo', 9, 0, 1.5, 10.5, 'Pasillo'), R('dormitorio', 10.5, 0, 4.5, 3.75), R('bano', 10.5, 3.75, 4.5, 2.25), R('dormitorio_principal', 10.5, 6, 4.5, 4.5),
    ], [
      R('despacho', 0, 0, 6, 3, 'Estudio · altillo'), R('escalera', 0, 3, 4.5, 1.5, { sube: 'E' }), R('pasillo', 4.5, 3, 1.5, 1.5, 'Rellano'),
      R('doble_altura', 0, 4.5, 6, 6, 'Doble altura del salón'),
    ]],
  },
  {
    id: 'fam-myway-granero', ...F('myway', 'granero: gran nave con doble altura y altillo de juegos'), nombre: 'My Way Granero 200', perfiles: ['familia_numerosa', 'familia'],
    desc: 'Una nave de 9 m de luz a dos aguas, como un granero. Abajo, dormitorio y baño junto al vestíbulo, una cocina-comedor de 27 m² y un salón de 54 m² a doble altura abierto al porche. Arriba, tres dormitorios y baño a lo largo de un pasillo y un altillo de juegos asomado al salón; la escalera arranca del propio salón.',
    acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'bosque', cubierta: DOS({ pendiente: 40, alero: 0.75 }),
    plantas: [[
      R('bano', 0, 0, 2.25, 3, 'Baño planta baja'), R('lavadero', 2.25, 0, 1.5, 3), R('recibidor', 3.75, 0, 1.5, 3, 'Vestíbulo'), R('dormitorio', 5.25, 0, 3.75, 3, 'Dormitorio planta baja'),
      R('pasillo', 0, 3, 9, 1.5),
      R('cocina', 0, 4.5, 6, 4.5, 'Cocina · comedor'), R('pasillo', 6, 4.5, 1.5, 4.5, 'Paso al salón'), R('escalera', 7.5, 4.5, 1.5, 4.5, { sube: 'N' }),
      R('salon', 0, 9, 9, 6, 'Salón · doble altura'), R('porche', 0, 15, 9, 2.25),
    ], [
      R('dormitorio', 0, 0, 3.75, 3), R('bano', 3.75, 0, 1.5, 3), R('dormitorio', 5.25, 0, 3.75, 3),
      R('pasillo', 0, 3, 9, 1.5),
      R('dormitorio_principal', 0, 4.5, 3.75, 4.5), R('distribuidor', 3.75, 4.5, 3.75, 4.5, 'Altillo · juegos'), R('escalera', 7.5, 4.5, 1.5, 4.5, { sube: 'N' }),
      R('doble_altura', 0, 9, 9, 6, 'Doble altura del salón'),
    ]],
  },
  {
    id: 'fam-myway-senior', ...F('myway', 'dos cubiertas cruzadas en L sobre una planta'), nombre: 'My Way Sénior 135 · cubiertas cruzadas', perfiles: ['senior', 'pareja'],
    desc: 'Una planta en L sin escalones bajo dos cubiertas a dos aguas que se cruzan: la barra de noche (dos dormitorios, baño adaptado y suite con su baño) y la nave de día, con cocina, comedor y un salón alto bajo la cumbrera. En el rincón, un porche de 27 m² al sur.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'madera' }, jardin: 'praderia', cubierta: DOS({ pendiente: 30, alero: 0.75 }),
    plantas: [[
      R('dormitorio', 0, 0, 3.75, 3), R('bano', 3.75, 0, 2.25, 3, 'Baño adaptado'), R('recibidor', 6, 0, 3, 3, 'Vestíbulo'),
      R('pasillo', 0, 3, 9, 1.5),
      R('dormitorio_principal', 0, 4.5, 3.75, 3), R('bano', 3.75, 4.5, 2.25, 3, NF('Baño suite', { suite: true })), R('lavadero', 6, 4.5, 3, 3, 'Lavadero · despensa'),
      R('cocina', 9, 0, 6, 3), R('comedor', 9, 3, 6, 4.5), R('salon', 9, 7.5, 6, 6, 'Salón bajo la cumbrera'),
      R('porche', 0, 7.5, 9, 3, 'Porche del rincón'),
    ]],
  },
  {
    id: 'fam-myway-hilera-3', ...F('myway', 'entre medianeras: tres alturas con la suite bajo la cubierta'), nombre: 'My Way Hilera 3 alturas · suite bajo cubierta', perfiles: ['familia', 'familia_numerosa'], medianeras: ['E', 'O'],
    desc: 'Casa en hilera de 6 m de frente y tres plantas, con la cumbrera paralela a la calle. Una escalera en U de 3 × 3 m, que sale y llega por el mismo lado, ocupa la banda central junto a un paso y los armarios. Abajo, despacho y aseo a la calle y cocina y salón al jardín; en la primera, tres dormitorios y baño; bajo la cubierta, la suite con baño y un estudio.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'cesped', cubierta: DOS({ cumbrera: 'x', alero: 0.25 }),
    plantas: [[
      R('despacho', 0, 0, 3, 3.75), R('recibidor', 3, 0, 1.5, 3.75, 'Zaguán'), R('aseo', 4.5, 0, 1.5, 3.75),
      R('escalera', 0, 3.75, 3, 3, { sube: 'N' }), R('pasillo', 3, 3.75, 1.5, 3, 'Paso'), R('despensa', 4.5, 3.75, 1.5, 3),
      R('pasillo', 0, 6.75, 6, 1.5, 'Paso'),
      R('cocina', 0, 8.25, 2.25, 4.5), R('salon', 2.25, 8.25, 3.75, 4.5, 'Salón · comedor'),
    ], [
      R('dormitorio', 0, 0, 3, 3.75), R('pasillo', 3, 0, 1.5, 6.75, 'Paso'), R('bano', 4.5, 0, 1.5, 3.75),
      R('escalera', 0, 3.75, 3, 3, { sube: 'N' }), R('lavadero', 4.5, 3.75, 1.5, 3, 'Tendedero'),
      R('pasillo', 0, 6.75, 6, 1.5, 'Rellano'),
      R('dormitorio', 0, 8.25, 3, 4.5), R('dormitorio', 3, 8.25, 3, 4.5),
    ], [
      R('despacho', 0, 0, 3, 3.75, 'Estudio bajo cubierta'), R('pasillo', 3, 0, 1.5, 6.75, 'Paso'), R('trastero', 4.5, 0, 1.5, 3.75, 'Trastero bajo cubierta'),
      R('escalera', 0, 3.75, 3, 3, { sube: 'N' }), R('vestidor', 4.5, 3.75, 1.5, 3, 'Armarios'),
      R('pasillo', 0, 6.75, 6, 1.5, 'Rellano'),
      R('dormitorio_principal', 0, 8.25, 3.75, 4.5, 'Suite bajo cubierta'), R('bano', 3.75, 8.25, 2.25, 4.5, NF('Baño suite', { suite: true })),
    ]],
  },
  {
    id: 'fam-myway-casa-casita', ...F('myway', 'pabellones: casa a doble altura y casita de una planta bajo un porche común'), nombre: 'My Way Casa y casita · dos generaciones', perfiles: ['multigeneracional', 'familia'],
    desc: 'Dos pabellones a dos aguas unidos por un porche que hace de paso cubierto. La casa principal tiene cocina, comedor y un salón con la doble altura al sur cruzada por una pasarela; arriba, dos dormitorios, baño y un altillo-biblioteca. La casita, de una planta y accesible, tiene estar, cocina, dormitorio y baño adaptado, con su puerta bajo el porche.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'bosque', cubierta: DOS(),
    plantas: [[
      R('recibidor', 0, 0, 3, 3, 'Vestíbulo'), R('aseo', 3, 0, 1.5, 3), R('cocina', 4.5, 0, 4.5, 3),
      R('escalera', 0, 3, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 3, 1.5, 4.5, 'Paso'), R('comedor', 3, 3, 6, 4.5),
      R('salon', 0, 7.5, 9, 4.5, 'Salón · doble altura'),
      R('porche', 9, 3, 3, 6, 'Porche · paso cubierto'), R('terraza', 9, 9, 3, 3.75, 'Deck'),
      R('salon', 12, 3, 4.5, 4.5, 'Estar casita'), R('cocina', 16.5, 3, 3, 4.5, 'Cocina casita'), R('pasillo', 12, 7.5, 7.5, 1.5, 'Paso casita'),
      R('dormitorio', 12, 9, 4.5, 3.75, 'Dormitorio casita'), R('bano', 16.5, 9, 3, 3.75, 'Baño adaptado'),
    ], [
      R('dormitorio', 0, 0, 4.5, 3), R('dormitorio', 4.5, 0, 4.5, 3),
      R('escalera', 0, 3, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 3, 7.5, 1.5), R('pasillo', 1.5, 4.5, 1.5, 3, 'Paso'),
      R('distribuidor', 3, 4.5, 3.75, 3, 'Altillo · biblioteca'), R('bano', 6.75, 4.5, 2.25, 3),
      R('pasillo', 0, 7.5, 9, 1.5, 'Pasarela'), R('doble_altura', 0, 9, 9, 3, 'Doble altura del salón'),
    ]],
  },
  {
    id: 'fam-myway-casa-larga', ...F('myway', 'casa larga con el hastial de doble altura al jardín'), nombre: 'My Way Casa larga 175 · hastial al jardín', perfiles: ['familia', 'teletrabajo'],
    desc: 'Una nave de 7,50 × 15,00 m en dos plantas que termina, hacia el jardín, en un salón a doble altura con todo el hastial acristalado. Abajo, vestíbulo con aseo y lavadero, cocina, comedor y salón en enfilada; arriba, dos dormitorios a la calle, baño, la suite con su baño y un balcón interior sobre el salón.',
    acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'bosque', cubierta: DOS({ pendiente: 40 }),
    plantas: [[
      R('recibidor', 0, 0, 3, 3, 'Vestíbulo'), R('aseo', 3, 0, 1.5, 3), R('lavadero', 4.5, 0, 3, 3),
      R('escalera', 0, 3, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 3, 1.5, 4.5, 'Paso'), R('cocina', 3, 3, 4.5, 4.5),
      R('comedor', 0, 7.5, 7.5, 3), R('salon', 0, 10.5, 7.5, 4.5, 'Salón · doble altura'),
    ], [
      R('dormitorio', 0, 0, 3.75, 3), R('dormitorio', 3.75, 0, 3.75, 3),
      R('escalera', 0, 3, 1.5, 4.5, { sube: 'S' }), R('pasillo', 1.5, 3, 6, 1.5), R('pasillo', 1.5, 4.5, 1.5, 4.5, 'Paso'), R('pasillo', 0, 7.5, 1.5, 1.5, 'Rellano'),
      R('bano', 3, 4.5, 4.5, 1.5), R('bano', 3, 6, 4.5, 1.5, NF('Baño suite', { suite: true })), R('dormitorio_principal', 3, 7.5, 4.5, 3),
      R('distribuidor', 0, 9, 3, 1.5, 'Balcón interior'), R('doble_altura', 0, 10.5, 7.5, 4.5, 'Doble altura del salón'),
    ]],
  },
  {
    id: 'fam-myway-duplex', ...F('myway', 'dúplex compacto con dormitorio en altillo sobre el salón a doble altura'), nombre: 'My Way Dúplex 70 · altillo', perfiles: ['inversor', 'pareja'],
    desc: 'Una pieza de 6,00 × 9,00 m a dos aguas. Abajo, aseo, entrada y cocina al norte y un salón de 27 m² a doble altura; la escalera sube desde la salida al jardín hasta un rellano sobre la entrada. Arriba, el dormitorio en altillo con su baño, asomado al salón. Pensada para alquilar o para una primera vivienda.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'zen', cubierta: DOS({ pendiente: 40, alero: 0.25 }),
    plantas: [[
      R('aseo', 0, 0, 1.5, 3), R('recibidor', 1.5, 0, 1.5, 3, 'Entrada'), R('cocina', 3, 0, 3, 3),
      R('escalera', 0, 3, 1.5, 4.5, { sube: 'N' }), R('salon', 1.5, 3, 4.5, 6, 'Salón · doble altura'), R('pasillo', 0, 7.5, 1.5, 1.5, 'Salida al jardín'),
    ], [
      R('pasillo', 0, 0, 1.5, 3, 'Rellano'), R('dormitorio_principal', 1.5, 0, 4.5, 3, 'Dormitorio · altillo'),
      R('escalera', 0, 3, 1.5, 4.5, { sube: 'N' }), R('bano', 4.5, 3, 1.5, 3, NF('Baño suite', { suite: true })),
      R('doble_altura', 1.5, 3, 3, 6, 'Doble altura del salón'), R('doble_altura', 4.5, 6, 1.5, 3, 'Doble altura del salón'),
    ]],
  },
];

// ---------------------------------------------------------------- BLOQUES (fase 2): pequeños edificios de la marca
// Receta v.1.5 (docs/CONTRATO_v1.md): núcleo común igual en todas las plantas con escalera en U de 3,00 × 4,50, ascensor
// de 1,50 × 2,25 e instalaciones; rellano de 4,50 × 1,50 al sur del núcleo; portal en planta baja abierto a la calle (acceso S,
// la fachada de día) y dos viviendas por planta, simétricas, con su pasillo pegado al rellano. Las viviendas se dibujan a
// la izquierda (A) y se reflejan a la derecha (B) respecto al eje del núcleo.
const V = (tipo, x, y, w, h, viv, extra) => Object.assign({ tipo, x, y, w, h, vivienda: viv }, typeof extra === 'string' ? { nombre: extra, nombreFijo: true } : extra || {});
const LADO = { E: 'O', O: 'E', N: 'N', S: 'S' };
const reflejar = (lista, W, viv) => lista.map((e) => {
  const c = Object.assign({}, e, { x: W - e.x - e.w, vivienda: viv });
  if (e.celosia) c.celosia = Object.assign({}, e.celosia, { lados: e.celosia.lados.map((l) => LADO[l]) });
  if (e.huecos) c.huecos = Object.fromEntries(Object.entries(e.huecos).map(([l, h]) => [LADO[l], h]));
  return c;
});
const nucleo = (c) => [R('escalera', c, 0, 3, 4.5, 'Escalera común'), R('instalaciones', c + 3, 0, 1.5, 2.25, 'Instalaciones · patinillo'), R('ascensor', c + 3, 2.25, 1.5, 2.25)];
const portal = (c) => R('recibidor', c, 4.5, 4.5, 4.5, 'Portal');
const rellano = (c) => R('distribuidor', c, 4.5, 4.5, 1.5, 'Rellano');
const planta = (c, W, A, pi, comun) => [...nucleo(c), ...(comun || [pi === 0 ? portal(c) : rellano(c)]), ...A(pi + 'A', pi), ...reflejar(A(pi + 'B', pi), W, pi + 'B')];

const BLOQUES = [
  {
    id: 'fam-basic-bloque-3', ...F('basic', 'bloque: la pieza Basic de un dormitorio repetida y apilada'), nombre: 'Basic Bloque 3 alturas · 6 viviendas', perfiles: ['inversor', 'solo', 'pareja'], acceso: 'S',
    desc: 'Pequeño bloque de baja + 2 con la pieza esencial Basic repetida: seis viviendas de un dormitorio, dos por planta, a ambos lados de un núcleo con escalera, ascensor y patinillo. Dormitorio y baño al norte; salón-comedor y cocina al sur, con terraza en voladizo de 1,50 m en las plantas altas y patio propio en la baja. Cubierta plana.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'praderia',
    plantas: [0, 1, 2].map((pi) => planta(6, 16.5, (v) => [
      V('dormitorio_principal', 0, 0, 4.5, 4.5, v), V('bano', 4.5, 0, 1.5, 4.5, v),
      V('pasillo', 0, 4.5, 6, 1.5, v),
      ...(pi === 0 ? [V('cocina', 0, 6, 2.25, 3, v), V('salon', 2.25, 6, 3.75, 3, v, 'Salón · comedor'), V('terraza', 0, 9, 6, 2.25, v, 'Patio')]
        : [V('salon', 0, 6, 6, 3, v, 'Salón · comedor'), V('cocina', 6, 6, 2.25, 3, v), V('terraza', 0, 9, 6, 1.5, v, 'Terraza')]),
    ], pi)),
  },
  {
    id: 'fam-line-bloque-4', ...F('line', 'bloque: viviendas en barra con terraza corrida al paisaje'), nombre: 'Line Bloque 4 alturas · terrazas corridas', perfiles: ['familia', 'pareja', 'inversor'], acceso: 'S',
    desc: 'Una barra de 22,50 m y baja + 3 con ocho viviendas de dos dormitorios, cada una de 9 m de fachada: dormitorios y baño con lavadora al norte; salón, cocina y comedor en línea al sur, abiertos a una terraza corrida con pérgola que recorre todo el frente. Núcleo central con escalera y ascensor.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'mediterraneo',
    plantas: [0, 1, 2, 3].map((pi) => planta(9, 22.5, (v) => [
      V('dormitorio', 0, 0, 3, 4.5, v), V('dormitorio_principal', 3, 0, 3.75, 4.5, v), V('bano', 6.75, 0, 2.25, 4.5, v, 'Baño · lavadora'),
      V('pasillo', 0, 4.5, 9, 1.5, v), V('salon', 0, 6, 6, 3, v, 'Salón'), V('cocina', 6, 6, 3, 3, v),
      ...(pi === 0 ? [V('terraza', 0, 9, 9, 2.25, v, 'Jardín privado')]
        : [V('comedor', 9, 6, 2.25, 3, v), V('terraza', 0, 9, 9, 1.5, v, NF('Terraza corrida · pérgola', { pergola: true }))]),
    ], pi)),
  },
  {
    id: 'fam-natura-bloque-3', ...F('natura', 'bloque: logias de lamas talladas en el volumen y patios en la baja'), nombre: 'Natura Bloque 3 alturas · logias de lamas', perfiles: ['familia', 'pareja', 'teletrabajo'], acceso: 'S',
    desc: 'Bloque de baja + 2 con seis viviendas de dos dormitorios. En las plantas altas, cada salón se abre a una logia tallada en el volumen y cerrada al sur por lamas de madera: sombra en verano, intimidad y luz tamizada. En la baja, las viviendas tienen un patio de lamas propio. Estuco rosado y madera.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'madera' }, jardin: 'cesped',
    plantas: [0, 1, 2].map((pi) => planta(7.5, 19.5, (v) => [
      V('dormitorio', 0, 0, 3, 4.5, v), V('bano', 3, 0, 1.5, 4.5, v), V('dormitorio_principal', 4.5, 0, 3, 4.5, v),
      V('pasillo', 0, 4.5, 7.5, 1.5, v),
      ...(pi === 0 ? [V('salon', 0, 6, 5.25, 3, v, 'Salón · comedor'), V('cocina', 5.25, 6, 2.25, 3, v), V('patio', 0, 9, 7.5, 3, v, NF('Patio de lamas', { celosia: LAMAS(['S', 'O'], 'simple'), pergola: true }))]
        : [V('porche', 0, 6, 2.25, 3, v, NF('Logia de lamas', { celosia: LAMAS(['S'], 'simple') })), V('salon', 2.25, 6, 5.25, 3, v, 'Salón · comedor'), V('cocina', 7.5, 6, 2.25, 3, v)]),
    ], pi)),
  },
  {
    id: 'fam-myway-bloque-4', ...F('myway', 'bloque: dúplex bajo la cubierta a dos aguas con salón a doble altura'), nombre: 'My Way Bloque 4 alturas · dúplex bajo cubierta', perfiles: ['familia', 'pareja', 'teletrabajo'], acceso: 'S',
    desc: 'Bloque de baja + 3 bajo una cubierta de chapa a dos aguas con la cumbrera paralela a la fachada. Abajo, cuatro viviendas de dos dormitorios; arriba, dos dúplex con la entrada en la planta segunda (dormitorio, baño, lavadero y salón a doble altura) y, bajo la cubierta, la habitación principal con baño y una pasarela asomada al salón. El núcleo sube hasta los trasteros comunes bajo cubierta.',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'bosque', cubierta: DOS({ cumbrera: 'x', pendiente: 35, alero: 0.5 }),
    plantas: [
      ...[0, 1].map((pi) => planta(7.5, 19.5, (v) => [
        V('dormitorio', 0, 0, 3, 4.5, v), V('bano', 3, 0, 1.5, 4.5, v), V('dormitorio_principal', 4.5, 0, 3, 4.5, v),
        V('pasillo', 0, 4.5, 7.5, 1.5, v),
        ...(pi === 0 ? [V('salon', 0, 6, 5.25, 3, v, 'Salón · comedor'), V('cocina', 5.25, 6, 2.25, 3, v)] : [V('salon', 0, 6, 7.5, 3, v, 'Salón · comedor'), V('cocina', 7.5, 6, 2.25, 3, v)]),
      ], pi)),
      planta(7.5, 19.5, (v) => [
        V('dormitorio', 0, 0, 3, 4.5, v), V('bano', 3, 0, 1.5, 4.5, v), V('lavadero', 4.5, 0, 1.5, 4.5, v), V('escalera', 6, 0, 1.5, 4.5, v, { sube: 'N' }),
        V('pasillo', 0, 4.5, 7.5, 1.5, v), V('salon', 0, 6, 7.5, 3, v, 'Salón · doble altura'), V('cocina', 7.5, 6, 2.25, 3, v),
      ], 2),
      [...nucleo(7.5), rellano(7.5), R('trastero', 7.5, 6, 4.5, 3, 'Trasteros bajo cubierta'),
        ...[['2A', (v) => v], ['2B', (v) => reflejar(v, 19.5, '2B')]].flatMap(([v, f]) => f([
          V('dormitorio_principal', 0, 0, 3, 4.5, v, 'Dormitorio bajo cubierta'), V('bano', 3, 0, 1.5, 4.5, v), V('pasillo', 4.5, 0, 1.5, 4.5, v, 'Paso'), V('escalera', 6, 0, 1.5, 4.5, v, { sube: 'N' }),
          V('pasillo', 0, 4.5, 7.5, 1.5, v, 'Pasarela'), V('doble_altura', 0, 6, 7.5, 3, v, 'Doble altura del salón'),
        ]))],
    ],
  },
];

export const FAMILIAS_EXT = [...BASIC, ...LINE, ...NATURA, ...MYWAY, ...BLOQUES];
