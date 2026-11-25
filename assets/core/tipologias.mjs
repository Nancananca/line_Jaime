// Tipologías de vivienda (colección «tipologías»): 15 modelos de partida de tipos distintos, en el mismo formato de
// entrada que los de core/estandar.mjs (plantas → estancias rectangulares en metros sobre la trama de 0,75 m).
// Convenio: y crece hacia el sur; acceso por el norte salvo indicación; estancias de día al sur.
const R = (tipo, x, y, w, h, extra) => Object.assign({ tipo, x, y, w, h }, typeof extra === 'string' ? { nombre: extra, nombreFijo: true } : extra || {});
const NF = (nombre, extra) => Object.assign({ nombre, nombreFijo: true }, extra || {});

export const TIPOLOGIAS = [
  // 1 · Casa patio
  {
    id: 'tipo-casa-patio', coleccion: 'tipologias', desc: 'Una planta alrededor de un patio de 4,50 × 4,50 m. Galería acristalada al norte y al este; día en L al oeste y al sur (cocina, comedor y salón abiertos al patio y al jardín); tres dormitorios al este, suite con vestidor, y despacho junto al vestíbulo.', nombre: 'Casa patio', familia: 'natura', perfiles: ['familia', 'teletrabajo', 'senior'], acceso: 'N',
    acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'mediterraneo',
    plantas: [[
      R('despacho', 0, 0, 4.5, 3, 'Despacho · biblioteca'), R('lavadero', 0, 3, 2.25, 1.5), R('despensa', 2.25, 3, 2.25, 1.5),
      R('cocina', 0, 4.5, 4.5, 4.5), R('comedor', 0, 9, 4.5, 4.5),
      R('recibidor', 4.5, 0, 3, 3, 'Vestíbulo'), R('aseo', 7.5, 0, 1.5, 3), R('pasillo', 9, 0, 1.5, 3, 'Paso'),
      R('pasillo', 4.5, 3, 6, 1.5, NF('Galería norte', { huecos: { S: { tipo: 'ventanal', ancho: 3.75 } } })),
      R('patio', 4.5, 4.5, 4.5, 4.5, 'Patio'),
      R('pasillo', 9, 4.5, 1.5, 9, NF('Galería este', { huecos: { O: { tipo: 'ventanal', ancho: 3.75 } } })),
      R('salon', 4.5, 9, 4.5, 4.5),
      R('dormitorio', 10.5, 0, 3.75, 3.75), R('dormitorio', 10.5, 3.75, 3.75, 3.75), R('bano', 10.5, 7.5, 3.75, 1.5),
      R('vestidor', 10.5, 9, 1.5, 1.5), R('bano', 12, 9, 2.25, 1.5, { suite: true }), R('dormitorio_principal', 10.5, 10.5, 3.75, 3),
    ]],
  },
  // 2 · Pasante entre medianeras de 6 m con patio de luces
  {
    id: 'tipo-pasante-6', coleccion: 'tipologias', desc: 'Entre medianeras con 6 m de frente. Zaguán y cocina a la calle; escalera y paso junto a un patio de luces de 3,00 × 3,75 m que ilumina la cocina y ventila aseo y baño; salón-comedor al jardín. Arriba, suite a la calle y dos dormitorios al jardín.', nombre: 'Pasante 6 m · patio', familia: 'natura', perfiles: ['familia', 'pareja'], acceso: 'N', medianeras: ['E', 'O'],
    acabados: { fachada: 'estuco_rosado', carpinteria: 'oscura' }, jardin: 'cesped',
    plantas: [[
      R('recibidor', 0, 0, 3, 3.75, 'Zaguán'), R('cocina', 3, 0, 3, 3.75, 'Cocina · office'),
      R('escalera', 0, 3.75, 1.5, 5.25), R('pasillo', 1.5, 3.75, 1.5, 5.25, 'Paso'), R('patio', 3, 3.75, 3, 3.75, 'Patio de luces'),
      R('aseo', 3, 7.5, 3, 1.5, 'Aseo · lavadero'), R('salon', 0, 9, 6, 4.5, 'Salón · comedor'),
    ], [
      R('bano', 0, 0, 1.5, 3.75, NF('Baño suite', { suite: true })), R('dormitorio_principal', 1.5, 0, 4.5, 3.75),
      R('escalera', 0, 3.75, 1.5, 5.25), R('pasillo', 1.5, 3.75, 1.5, 5.25, 'Distribuidor'), R('patio', 3, 3.75, 3, 3.75, 'Patio de luces'),
      R('bano', 3, 7.5, 3, 1.5), R('pasillo', 0, 9, 6, 1.5, 'Paso'), R('dormitorio', 0, 10.5, 3, 3), R('dormitorio', 3, 10.5, 3, 3),
    ]],
  },
  // 3 · Adosada en hilera, 7,50 m, con terraza-patio en planta alta
  {
    id: 'tipo-hilera', coleccion: 'tipologias', desc: 'Adosada de 7,50 m en dos crujías unidas por un patio central de doble altura. Despacho o invitados a la calle; salón y cocina-comedor al jardín. Arriba, tres dormitorios y dos baños con galería al patio. Aparcamiento en el frente de la parcela.', nombre: 'Adosada en hilera 7,5 m', familia: 'natura', perfiles: ['familia', 'teletrabajo'], acceso: 'N', medianeras: ['E', 'O'],
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'cesped',
    plantas: [[
      R('aseo', 0, 0, 1.5, 2.25), R('escalera', 0, 2.25, 1.5, 5.25), R('recibidor', 1.5, 0, 1.5, 7.5, 'Vestíbulo'),
      R('despacho', 3, 0, 4.5, 3.75, 'Despacho · invitados'), R('patio', 3, 3.75, 4.5, 3.75, 'Patio'),
      R('salon', 0, 7.5, 4.5, 5.25), R('cocina', 4.5, 7.5, 3, 5.25, 'Cocina · comedor'),
    ], [
      R('bano', 0, 0, 1.5, 2.25), R('escalera', 0, 2.25, 1.5, 5.25), R('pasillo', 1.5, 0, 1.5, 7.5, 'Distribuidor'),
      R('dormitorio', 3, 0, 4.5, 3.75), R('patio', 3, 3.75, 4.5, 3.75, 'Patio'),
      R('pasillo', 0, 7.5, 7.5, 1.5, NF('Galería', { huecos: { N: { tipo: 'ventanal', ancho: 3 } } })),
      R('dormitorio', 0, 9, 3, 3.75), R('bano', 3, 9, 1.5, 3.75), R('dormitorio_principal', 4.5, 9, 3, 3.75),
    ]],
  },
  // 4 · Pareada (medianera al oeste) con garaje
  {
    id: 'tipo-pareada', coleccion: 'tipologias', desc: 'Pareada con medianera al oeste y fachada lateral libre. Garaje de una plaza con lavadero y paso directo a la cocina; salón y comedor al jardín. Arriba, cuatro dormitorios (suite con vestidor y terraza), baño al este y tendedero.', nombre: 'Pareada con garaje', familia: 'natura', perfiles: ['familia', 'familia_numerosa'], acceso: 'N', medianeras: ['O'],
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'praderia',
    plantas: [[
      R('aseo', 0, 0, 1.5, 2.25), R('escalera', 0, 2.25, 1.5, 5.25), R('recibidor', 1.5, 0, 1.5, 7.5, 'Vestíbulo'),
      R('cocina', 3, 0, 3, 7.5, 'Cocina · office'), R('garaje', 6, 0, 3.75, 5.25, 'Garaje · 1 plaza'), R('lavadero', 6, 5.25, 3.75, 2.25),
      R('salon', 0, 7.5, 6, 4.5), R('comedor', 6, 7.5, 3.75, 4.5),
    ], [
      R('lavadero', 0, 0, 1.5, 2.25, 'Tendedero'), R('escalera', 0, 2.25, 1.5, 5.25), R('pasillo', 1.5, 0, 1.5, 7.5, 'Distribuidor'),
      R('dormitorio', 3, 0, 3.75, 3.75), R('dormitorio', 6.75, 0, 3, 3.75), R('pasillo', 3, 3.75, 6.75, 1.5, 'Paso'),
      R('vestidor', 3, 5.25, 3.75, 2.25), R('bano', 6.75, 5.25, 3, 2.25),
      R('pasillo', 0, 7.5, 3, 1.5, 'Meseta'), R('dormitorio', 0, 9, 3, 3), R('dormitorio_principal', 3, 7.5, 3.75, 4.5, { huecos: { S: { tipo: 'ventanal', ancho: 2.25 }, E: { tipo: 'ventanal', ancho: 1.5 } } }),
      R('bano', 6.75, 7.5, 3, 2.25, NF('Baño suite', { suite: true })), R('terraza', 6.75, 9.75, 3, 2.25),
    ]],
  },
  // 5 · Casa en L con porche en el rincón
  {
    id: 'tipo-l-porche', coleccion: 'tipologias', desc: 'Dos alas en L que abrazan un porche de 34 m² abierto al sureste. Ala de día al oeste con salón y cocina-comedor al porche; ala de noche al norte con tres dormitorios al sur, baño y suite.', nombre: 'Casa en L con porche', familia: 'line', perfiles: ['familia', 'pareja', 'senior'], acceso: 'N',
    acabados: { fachada: 'hormigon', carpinteria: 'oscura' }, jardin: 'mediterraneo',
    plantas: [[
      R('lavadero', 0, 0, 2.25, 3.75), R('aseo', 2.25, 0, 1.5, 2.25), R('recibidor', 3.75, 0, 2.25, 2.25, 'Vestíbulo'), R('recibidor', 2.25, 2.25, 3.75, 1.5, 'Vestíbulo'),
      R('salon', 0, 3.75, 6, 5.25), R('cocina', 0, 9, 6, 4.5, NF('Cocina · comedor', { huecos: { E: { tipo: 'ventanal', ancho: 2.25 } } })),
      R('pasillo', 6, 0, 9.75, 1.5, 'Pasillo'), R('bano', 15.75, 0, 2.25, 1.5, NF('Baño suite', { suite: true })),
      R('dormitorio', 6, 1.5, 3, 4.5), R('bano', 9, 1.5, 1.5, 4.5), R('dormitorio', 10.5, 1.5, 3.75, 4.5), R('dormitorio_principal', 14.25, 1.5, 3.75, 4.5),
      R('porche', 6, 6, 4.5, 7.5, 'Porche'),
    ]],
  },
  // 6 · Compacta pasiva
  {
    id: 'tipo-passivhaus', coleccion: 'tipologias', desc: 'Volumen compacto de 9,75 × 9,00 m en dos plantas (poca envolvente por m²). Fachada norte casi ciega con servicios y el cuarto de ventilación con recuperación de calor; huecos grandes al sur y al oeste. Tres dormitorios y dos baños arriba.', nombre: 'Compacta pasiva', familia: 'basic', perfiles: ['familia', 'pareja', 'teletrabajo'], acceso: 'N',
    acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'praderia',
    plantas: [[
      R('cocina', 0, 0, 4.5, 3.75, 'Cocina · comedor'), R('salon', 0, 3.75, 4.5, 5.25),
      R('recibidor', 4.5, 0, 3, 1.5, 'Cortavientos'), R('escalera', 4.5, 1.5, 1.5, 5.25), R('pasillo', 6, 1.5, 1.5, 5.25, 'Paso'),
      R('aseo', 7.5, 0, 2.25, 2.25), R('instalaciones', 7.5, 2.25, 2.25, 2.25, 'Instalaciones · ventilación'), R('despensa', 7.5, 4.5, 2.25, 2.25),
      R('comedor', 4.5, 6.75, 5.25, 2.25, 'Estar · comedor'),
    ], [
      R('dormitorio', 0, 0, 4.5, 3.75), R('vestidor', 0, 3.75, 4.5, 1.5), R('dormitorio_principal', 0, 5.25, 4.5, 3.75),
      R('pasillo', 4.5, 0, 3, 1.5, 'Distribuidor'), R('escalera', 4.5, 1.5, 1.5, 5.25), R('pasillo', 6, 1.5, 1.5, 5.25, 'Paso'), R('pasillo', 4.5, 6.75, 1.5, 2.25, 'Meseta'),
      R('bano', 7.5, 0, 2.25, 2.25), R('lavadero', 7.5, 2.25, 2.25, 2.25), R('bano', 7.5, 4.5, 2.25, 2.25), R('dormitorio', 6, 6.75, 3.75, 2.25),
    ]],
  },
  // 7 · Accesible en una planta
  {
    id: 'tipo-accesible', coleccion: 'tipologias', desc: 'Todo en planta y sin escalones. Plaza de garaje accesible unida al vestíbulo, pasillo de 1,50 m, baño adaptado con giro de 1,50 m y segundo baño, dos dormitorios amplios al sur y porche a cota del salón.', nombre: 'Accesible en una planta', familia: 'line', perfiles: ['senior', 'pareja'], acceso: 'N',
    acabados: { fachada: 'mineral', carpinteria: 'clara' }, jardin: 'cesped',
    plantas: [[
      R('garaje', 0.75, 0, 3.75, 5.25, 'Garaje · plaza accesible'), R('recibidor', 4.5, 0, 2.25, 2.25, 'Vestíbulo'), R('cocina', 6.75, 0, 4.5, 2.25),
      R('salon', 4.5, 2.25, 6.75, 5.25, 'Salón · comedor'),
      R('bano', 11.25, 0, 3, 2.25, 'Baño adaptado'), R('lavadero', 14.25, 0, 2.25, 2.25), R('bano', 16.5, 0, 3, 2.25),
      R('pasillo', 11.25, 2.25, 8.25, 1.5, 'Pasillo'), R('dormitorio', 11.25, 3.75, 3.75, 3.75), R('dormitorio_principal', 15, 3.75, 4.5, 3.75),
      R('porche', 4.5, 7.5, 6.75, 2.25, 'Porche'),
    ]],
  },
  // 8 · Bioclimática con galería sur
  {
    id: 'tipo-bioclimatica', coleccion: 'tipologias', desc: 'Barra este-oeste con la banda de servicios al norte como colchón térmico y una galería solar al sur delante del salón: invernadero en invierno, abierta en verano. Dormitorios con sol directo, alero de 0,75 m, pérgola y cubierta a un agua.', nombre: 'Bioclimática · galería sur', familia: 'line', perfiles: ['familia', 'teletrabajo'], acceso: 'N',
    acabados: { fachada: 'tapial', carpinteria: 'madera' }, jardin: 'huerto', cubierta: { tipo: 'una', material: 'chapa', color: 'arena', alero: 0.75 },
    plantas: [[
      R('lavadero', 0, 0, 2.25, 2.25), R('cocina', 2.25, 0, 4.5, 2.25), R('recibidor', 6.75, 0, 1.5, 2.25, 'Vestíbulo'),
      R('salon', 0, 2.25, 6.75, 3.75, 'Salón · comedor'), R('pasillo', 6.75, 3.75, 1.5, 2.25, 'Paso'),
      R('pasillo', 0, 6, 8.25, 1.5, NF('Galería solar', { huecos: { S: { tipo: 'ventanal', ancho: 6 } } })),
      R('pasillo', 6.75, 2.25, 11.25, 1.5, 'Pasillo'),
      R('bano', 8.25, 0, 2.25, 2.25), R('vestidor', 10.5, 0, 3, 2.25, 'Armarios'), R('instalaciones', 13.5, 0, 2.25, 2.25, 'Instalaciones · ACS solar'), R('bano', 15.75, 0, 2.25, 2.25),
      R('dormitorio', 8.25, 3.75, 3, 3.75), R('dormitorio', 11.25, 3.75, 3, 3.75), R('dormitorio_principal', 14.25, 3.75, 3.75, 3.75),
      R('terraza', 8.25, 7.5, 9.75, 2.25, NF('Terraza · pérgola', { pergola: true })),
    ]],
  },
  // 9 · Casa con estudio-taller independiente
  {
    id: 'tipo-taller', coleccion: 'tipologias', desc: 'Casa de dos dormitorios en barra y, al otro lado de un porche que hace de paso cubierto, un pabellón de taller o estudio con aseo, almacén y entrada propia: trabajar en casa sin mezclarlo con la vida doméstica.', nombre: 'Casa y taller', familia: 'myway', perfiles: ['teletrabajo', 'pareja'], acceso: 'N',
    acabados: { fachada: 'madera', carpinteria: 'oscura' }, jardin: 'bosque', cubierta: { tipo: 'dos', material: 'chapa', color: 'grafito', pendiente: 30, alero: 0.5 },
    plantas: [[
      R('cocina', 0, 0, 3.75, 2.25), R('recibidor', 3.75, 0, 1.5, 2.25, 'Vestíbulo'), R('bano', 5.25, 0, 2.25, 2.25),
      R('salon', 0, 2.25, 6, 5.25, 'Salón · comedor'), R('pasillo', 6, 2.25, 1.5, 5.25, 'Paso'),
      R('dormitorio', 7.5, 0, 4.5, 3.75), R('dormitorio_principal', 7.5, 3.75, 4.5, 3.75),
      R('porche', 12, 0, 3, 7.5, 'Porche · paso cubierto'),
      R('despacho', 15, 0, 5.25, 4.5, 'Taller · estudio'), R('aseo', 15, 4.5, 1.5, 1.5), R('trastero', 16.5, 4.5, 3.75, 1.5, 'Almacén'),
      R('terraza', 0, 7.5, 12, 2.25, 'Deck'),
    ]],
  },
  // 10 · Intergeneracional: casa de dos plantas y apartamento independiente en planta baja
  {
    id: 'tipo-intergeneracional', coleccion: 'tipologias', desc: 'Casa familiar de dos plantas y apartamento independiente de un dormitorio en planta baja, accesible y con entrada propia, unidos por un porche-zaguán común. Cuatro dormitorios y tres baños en total.', nombre: 'Intergeneracional · casa y apartamento', familia: 'myway', perfiles: ['multigeneracional', 'familia'], acceso: 'N',
    acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'huerto',
    plantas: [[
      R('aseo', 0, 0, 1.5, 2.25), R('escalera', 0, 2.25, 1.5, 5.25), R('recibidor', 1.5, 0, 1.5, 7.5, 'Vestíbulo'),
      R('cocina', 3, 0, 4.5, 3.75), R('comedor', 3, 3.75, 4.5, 3.75), R('salon', 0, 7.5, 7.5, 3.75),
      R('porche', 7.5, 0, 2.25, 6.75, 'Porche · zaguán común'),
      R('salon', 9.75, 2.25, 3.75, 4.5, 'Estar apartamento'), R('dormitorio', 13.5, 2.25, 3, 4.5, 'Dormitorio apartamento'),
      R('cocina', 9.75, 0, 2.25, 2.25, 'Cocina apartamento'), R('bano', 12, 0, 2.25, 2.25, 'Baño adaptado'), R('vestidor', 14.25, 0, 2.25, 2.25, 'Armario'),
    ], [
      R('bano', 0, 0, 1.5, 2.25), R('escalera', 0, 2.25, 1.5, 5.25), R('pasillo', 1.5, 0, 1.5, 7.5, 'Distribuidor'),
      R('dormitorio', 3, 0, 4.5, 3.75), R('dormitorio', 3, 3.75, 4.5, 3.75),
      R('pasillo', 0, 7.5, 3, 1.5, 'Meseta'), R('bano', 0, 9, 3, 2.25), R('dormitorio_principal', 3, 7.5, 4.5, 3.75),
    ]],
  },
  // 11 · Minicasa de jardín
  {
    id: 'tipo-minicasa', coleccion: 'tipologias', desc: 'Vivienda de jardín de 7,50 × 5,25 m: estar-comedor con cocina, dormitorio, baño y armario en unos 35 m² útiles, con porche corrido. Se entra desde el jardín.', nombre: 'Minicasa de jardín', familia: 'basic', perfiles: ['solo', 'inversor', 'pareja'], acceso: 'S',
    acabados: { fachada: 'chapa_clara', carpinteria: 'oscura' }, jardin: 'zen', cubierta: { tipo: 'una', material: 'chapa', color: 'grafito', alero: 0.5 },
    plantas: [[
      R('cocina', 0, 0, 3, 1.5), R('bano', 3, 0, 2.25, 1.5), R('vestidor', 5.25, 0, 2.25, 1.5, 'Armario'),
      R('salon', 0, 1.5, 4.5, 3.75, 'Estar · comedor'), R('dormitorio', 4.5, 1.5, 3, 3.75),
      R('porche', 0, 5.25, 7.5, 2.25),
    ]],
  },
  // 12 · Loft dúplex con doble altura
  {
    id: 'tipo-loft', coleccion: 'tipologias', desc: 'Pieza de 7,50 × 9,00 m con el salón a doble altura bajo cubierta a dos aguas, cocina y comedor a la calle. Arriba, dormitorio en altillo, pasarela asomada al salón y baño.', nombre: 'Loft dúplex · doble altura', familia: 'myway', perfiles: ['pareja', 'solo', 'inversor'], acceso: 'N',
    acabados: { fachada: 'hormigon_gris', carpinteria: 'oscura' }, jardin: 'zen', cubierta: { tipo: 'dos', material: 'chapa', color: 'grafito', pendiente: 35, alero: 0.25 },
    plantas: [[
      R('cocina', 0, 0, 3.75, 3), R('comedor', 3.75, 0, 2.25, 3), R('recibidor', 6, 0, 1.5, 1.5, 'Entrada'), R('escalera', 6, 1.5, 1.5, 5.25, { sube: 'N' }),
      R('aseo', 6, 6.75, 1.5, 2.25), R('salon', 0, 3, 6, 6, 'Salón · doble altura'), R('terraza', 0, 9, 7.5, 2.25),
    ], [
      R('dormitorio_principal', 0, 0, 4.5, 3, 'Dormitorio · altillo'), R('pasillo', 4.5, 0, 3, 1.5, 'Distribuidor'), R('escalera', 6, 1.5, 1.5, 5.25),
      R('pasillo', 4.5, 1.5, 1.5, 5.25, 'Pasarela'), R('bano', 4.5, 6.75, 3, 2.25), R('doble_altura', 0, 3, 4.5, 6, 'Doble altura del salón'),
    ]],
  },
  // 13 · Casa con torre mirador (tres plantas)
  {
    id: 'tipo-torre-mirador', coleccion: 'tipologias', desc: 'Casa de dos plantas con torre de tres en el testero este: escalera iluminada y, en la planta segunda, un estudio-mirador abierto a una terraza de 49 m² sobre la casa. Tres dormitorios.', nombre: 'Casa con torre mirador', familia: 'natura', perfiles: ['familia', 'teletrabajo'], acceso: 'N',
    acabados: { fachada: 'hormigon_blanco', carpinteria: 'oscura' }, jardin: 'mediterraneo',
    plantas: [[
      R('cocina', 0, 0, 6, 3.75, 'Cocina · comedor'), R('aseo', 6, 0, 1.5, 2.25), R('despensa', 6, 2.25, 1.5, 1.5),
      R('recibidor', 7.5, 0, 3, 1.5, 'Vestíbulo'), R('pasillo', 7.5, 1.5, 1.5, 6.75, 'Paso'), R('escalera', 9, 1.5, 1.5, 5.25, { sube: 'S' }), R('pasillo', 9, 6.75, 1.5, 1.5, 'Paso al jardín'),
      R('salon', 0, 3.75, 7.5, 4.5),
    ], [
      R('dormitorio', 0, 0, 3.75, 3.75), R('bano', 3.75, 0, 2.25, 3.75), R('lavadero', 6, 0, 1.5, 3.75),
      R('pasillo', 7.5, 0, 3, 1.5, 'Distribuidor'), R('pasillo', 7.5, 1.5, 1.5, 6.75, 'Pasillo'), R('escalera', 9, 1.5, 1.5, 5.25, { sube: 'S' }), R('pasillo', 9, 6.75, 1.5, 1.5, 'Meseta'),
      R('pasillo', 0, 3.75, 7.5, 1.5, 'Paso'), R('dormitorio_principal', 0, 5.25, 4.5, 3), R('dormitorio', 4.5, 5.25, 3, 3),
    ], [
      R('terraza', 0, 0, 6, 8.25, 'Terraza mirador'), R('despacho', 6, 0, 3, 6.75, NF('Mirador · estudio', { huecos: { O: { tipo: 'ventanal', ancho: 3 }, N: { tipo: 'ventana', ancho: 1.5 } } })), R('aseo', 9, 0, 1.5, 1.5),
      R('escalera', 9, 1.5, 1.5, 5.25), R('pasillo', 6, 6.75, 4.5, 1.5, 'Meseta'),
    ]],
  },
  // 14 · Aislada para familia numerosa con garaje de dos plazas
  {
    id: 'tipo-familia-garaje', coleccion: 'tipologias', desc: 'Para familia numerosa. Garaje de dos plazas con lavadero de entrada y paso a la cocina con isla; salón y comedor al jardín. Arriba, cinco dormitorios (suite con vestidor), baño, armario de ropa blanca y tendedero.', nombre: 'Aislada familiar · garaje doble', familia: 'natura', perfiles: ['familia_numerosa', 'familia', 'multigeneracional'], acceso: 'N',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped', cubierta: { tipo: 'cuatro', material: 'tegola', color: 'pizarra', alero: 0.5 },
    plantas: [[
      R('aseo', 0, 0, 1.5, 2.25), R('escalera', 0, 2.25, 1.5, 5.25), R('recibidor', 1.5, 0, 1.5, 7.5, 'Vestíbulo'),
      R('cocina', 3, 0, 3.75, 7.5, 'Cocina · office con isla'), R('garaje', 6.75, 0, 6, 6, 'Garaje · 2 plazas'), R('lavadero', 6.75, 6, 6, 1.5, 'Lavadero · acceso desde el garaje'),
      R('salon', 0, 7.5, 6.75, 4.5), R('comedor', 6.75, 7.5, 6, 4.5),
    ], [
      R('lavadero', 0, 0, 1.5, 2.25, 'Tendedero'), R('escalera', 0, 2.25, 1.5, 5.25), R('pasillo', 1.5, 0, 1.5, 7.5, 'Distribuidor'),
      R('dormitorio', 3, 0, 3.75, 3.75), R('dormitorio', 6.75, 0, 3, 3.75), R('dormitorio', 9.75, 0, 3, 3.75),
      R('pasillo', 3, 3.75, 9.75, 1.5, 'Pasillo'), R('vestidor', 3, 5.25, 3.75, 2.25, 'Vestidor'), R('vestidor', 6.75, 5.25, 3, 2.25, 'Armario · ropa blanca'), R('bano', 9.75, 5.25, 3, 2.25),
      R('pasillo', 0, 7.5, 3, 1.5, 'Meseta'), R('dormitorio', 0, 9, 3, 3), R('dormitorio_principal', 3, 7.5, 3.75, 4.5),
      R('vestidor', 6.75, 7.5, 2.25, 2.25, 'Vestidor suite'), R('bano', 6.75, 9.75, 2.25, 2.25, NF('Baño suite', { suite: true })),
    ]],
  },
  // 15 · Casa rural de una planta, cubierta a cuatro aguas
  {
    id: 'tipo-rural', coleccion: 'tipologias', desc: 'Una planta bajo cubierta de teja a cuatro aguas: zaguán y pasillo central, cocina-comedor de diario con despensa y lavadero, salón al sur, tres dormitorios al este y porche corrido.', nombre: 'Casa rural · cuatro aguas', familia: 'basic', perfiles: ['familia', 'senior'], acceso: 'N',
    acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'huerto', cubierta: { tipo: 'cuatro', material: 'teja', color: 'mixta', pendiente: 30, alero: 0.5 },
    plantas: [[
      R('lavadero', 0, 0, 2.25, 2.25), R('despensa', 2.25, 0, 2.25, 2.25), R('aseo', 4.5, 0, 1.5, 2.25),
      R('cocina', 0, 2.25, 6, 4.5, 'Cocina · comedor'), R('salon', 0, 6.75, 6, 5.25),
      R('recibidor', 6, 0, 1.5, 3, 'Zaguán'), R('pasillo', 6, 3, 1.5, 9, 'Pasillo'),
      R('dormitorio', 7.5, 0, 3.75, 3.75), R('bano', 7.5, 3.75, 3.75, 1.5), R('dormitorio', 7.5, 5.25, 3.75, 3), R('dormitorio_principal', 7.5, 8.25, 3.75, 3.75),
      R('porche', 0, 12, 11.25, 2.25),
    ]],
  },
];
