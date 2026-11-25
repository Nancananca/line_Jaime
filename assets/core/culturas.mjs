// Línea «Estilos y culturas» (colección «culturas»): modelos que traducen a la trama y al sistema CUEVA el modo de
// habitar de civilizaciones, culturas y lenguajes de diseño. Cada modelo lleva coleccion: 'culturas'.
// Mismo formato que core/tipologias.mjs: plantas → estancias rectangulares en metros sobre la trama de 0,75 m
// (casi todo en módulos de 1,50 m). Convenio: y crece hacia el sur; acceso por el norte salvo indicación.
// `cultura = { origen, epoca, claves[], fuentes[] }` documenta el referente (ver docs/CULTURAS.md).
// Los nombres de marcas comerciales NO se usan: los lenguajes de diseño industrial se traducen a su principio.
const R = (tipo, x, y, w, h, extra) => Object.assign({ tipo, x, y, w, h }, typeof extra === 'string' ? { nombre: extra, nombreFijo: true } : extra || {});
const NF = (nombre, extra) => Object.assign({ nombre, nombreFijo: true }, extra || {});
const V = (lado, ancho, tipo = 'ventanal') => ({ huecos: { [lado]: { tipo, ancho } } }); // hueco fijado en un lado (galerías)
const CEL = (lados, material = 'madera', altura = 'simple') => ({ celosia: { lados, altura, material } });

export const CULTURAS = [
  // 1 · Domus romana: fauces → atrio con impluvio → tablinum → peristilo → triclinio, en un eje
  {
    id: 'cul-domus', coleccion: 'culturas', nombre: 'Domus · atrio y peristilo', familia: 'natura', perfiles: ['familia', 'familia_numerosa', 'teletrabajo'], acceso: 'N',
    desc: 'Casa introvertida en un eje norte-sur: las fauces llevan al atrio, una galería cubierta alrededor del impluvio (lámina de agua bajo el compluvio); a sus lados, los cubículos. El tablinum (salón) une el atrio con el peristilo, un jardín de 36 m² rodeado de pórticos acristalados, y al fondo el triclinio y la exedra abren al jardín. Las tabernae de la calle son hoy garaje y estudio con puerta propia hacia el vestíbulo.',
    acabados: { fachada: 'almagra', carpinteria: 'madera' }, jardin: 'mediterraneo', cubierta: { tipo: 'cuatro', material: 'teja', color: 'roja', pendiente: 22, alero: 0.5 },
    cultura: { origen: 'Roma y Campania (Pompeya, Herculano)', epoca: 's. II a. C. – s. I d. C.', claves: ['eje fauces–atrio–tablinum–peristilo', 'impluvio y compluvio', 'cubículos al atrio', 'fachada ciega con tabernae', 'triclinio al jardín'], fuentes: ['https://es.wikipedia.org/wiki/Domus', 'https://en.wikipedia.org/wiki/Domus', 'https://en.wikipedia.org/wiki/House_of_the_Vettii'] },
    plantas: [[
      R('garaje', 0, 0, 6, 3, 'Taberna · garaje'), R('recibidor', 6, 0, 3, 3, 'Fauces · vestíbulo'), R('despacho', 9, 0, 6, 3, 'Taberna · estudio'),
      R('dormitorio', 0, 3, 4.5, 3, 'Cubículo 1'), R('dormitorio', 0, 6, 4.5, 3, 'Cubículo 2'),
      R('pasillo', 4.5, 3, 6, 1.5, NF('Atrio · norte', V('S', 3))), R('pasillo', 4.5, 4.5, 1.5, 3, 'Atrio · oeste'), R('pasillo', 9, 4.5, 1.5, 3, 'Atrio · este'), R('pasillo', 4.5, 7.5, 6, 1.5, NF('Atrio · sur', V('N', 3))),
      R('piscina', 6, 4.5, 3, 3, NF('Impluvio · lámina de agua', { piscina: { prof: 0.4 } })),
      R('bano', 10.5, 3, 4.5, 1.5, 'Baño · balneum'), R('lavadero', 10.5, 4.5, 4.5, 1.5), R('dormitorio', 10.5, 6, 4.5, 3, 'Cubículo 3'),
      R('cocina', 0, 9, 3, 4.5, 'Culina · cocina'), R('salon', 3, 9, 9, 4.5, 'Tablinum · salón'), R('aseo', 12, 9, 3, 1.5), R('vestidor', 12, 10.5, 3, 3),
      R('pasillo', 3, 13.5, 1.5, 6, NF('Pórtico oeste', V('E', 4.5))), R('patio', 4.5, 13.5, 6, 6, 'Peristilo · jardín'), R('pasillo', 10.5, 13.5, 1.5, 6, NF('Pórtico este', V('O', 4.5))),
      R('dormitorio_principal', 12, 13.5, 3, 3.75), R('bano', 12, 17.25, 3, 2.25, NF('Baño suite', { suite: true })),
      R('comedor', 3, 19.5, 4.5, 4.5, 'Triclinio · comedor'), R('salon', 7.5, 19.5, 4.5, 4.5, 'Exedra · estar de verano'), R('porche', 3, 24, 9, 1.5, 'Pórtico al jardín'),
    ]],
  },
  // 2 · Casa griega de pastas (Olinto): patio al sur, pastas porticada delante de las salas, andrón junto a la entrada
  {
    id: 'cul-pastas', coleccion: 'culturas', nombre: 'Casa griega · patio y pastas', familia: 'natura', perfiles: ['familia', 'teletrabajo'], acceso: 'E',
    desc: 'La casa de Olinto: un patio (aulé) abierto al sur y, delante de las salas, la pastas, una galería porticada (aquí comedor acristalado) que recoge el sol de invierno. El oikos con el hogar y la cocina quedan detrás; el andrón, sala de banquetes e invitados, junto al zaguán para no cruzar la casa. Arriba, el gineceo: tres dormitorios al sur y un baño.',
    acabados: { fachada: 'encalado', carpinteria: 'madera' }, jardin: 'mediterraneo', cubierta: { tipo: 'dos', material: 'teja', color: 'roja', pendiente: 20, alero: 0.5 },
    cultura: { origen: 'Grecia clásica (Olinto, Calcídica)', epoca: 's. V – IV a. C.', claves: ['patio meridional (aulé)', 'pastas porticada al sur', 'andrón junto a la entrada', 'gineceo en planta alta', 'fachada a la calle casi ciega'], fuentes: ['https://en.wikipedia.org/wiki/Ancient_Greek_architecture#Domestic_architecture', 'https://en.wikipedia.org/wiki/Olynthus', 'https://es.wikipedia.org/wiki/Gineceo'] },
    plantas: [[
      R('escalera', 0, 0, 3, 3), R('aseo', 0, 3, 3, 1.5), R('pasillo', 0, 4.5, 3, 3, 'Distribuidor'),
      R('salon', 3, 0, 6, 4.5, 'Oikos · sala del hogar'), R('cocina', 9, 0, 4.5, 4.5, 'Cocina · hogar'),
      R('comedor', 3, 4.5, 10.5, 3, NF('Pastas · comedor porticado', V('S', 6))),
      R('despacho', 0, 7.5, 4.5, 4.5, 'Andrón · sala de invitados'), R('patio', 4.5, 7.5, 6, 7.5, 'Aulé · patio del altar'), R('patio', 0, 12, 4.5, 3, 'Aulé · rincón del pozo'),
      R('recibidor', 10.5, 7.5, 3, 3, 'Prothyron · zaguán'), R('lavadero', 10.5, 10.5, 3, 4.5, 'Lavadero · almacén'),
    ], [
      R('escalera', 0, 0, 3, 3), R('bano', 3, 0, 4.5, 1.5), R('vestidor', 7.5, 0, 6, 1.5, 'Armarios'), R('pasillo', 3, 1.5, 10.5, 1.5, 'Distribuidor'),
      R('dormitorio_principal', 0, 3, 4.5, 4.5, 'Gineceo · dormitorio principal'), R('dormitorio', 4.5, 3, 4.5, 4.5), R('dormitorio', 9, 3, 4.5, 4.5),
    ]],
  },
  // 3 · Riad / casa andalusí: patio con alberca, cuatro crujías, zaguán en recodo, galería alta con celosía
  {
    id: 'cul-riad', coleccion: 'culturas', nombre: 'Riad · patio de la alberca', familia: 'natura', perfiles: ['familia', 'multigeneracional', 'senior'], acceso: 'N',
    desc: 'Cuatro crujías de 3 m alrededor de un patio con alberca, mirando hacia dentro. Se entra por un zaguán en recodo que impide ver el patio desde la calle. Salón de invierno al norte (mira al sur) y salón de verano al sur; cocina y comedor al este; suite al oeste. Arriba, una galería con celosía de madera sobre el patio, dos dormitorios y azoteas para las noches de verano.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'madera' }, jardin: 'mediterraneo', cubierta: { tipo: 'plana', material: 'grava', color: 'clara' },
    cultura: { origen: 'Al-Ándalus y Magreb (Granada, Córdoba, Fez, Marrakech)', epoca: 's. X – XIX', claves: ['patio central con agua', 'crujías estrechas y alargadas', 'zaguán en recodo', 'salas de invierno y de verano', 'galería alta con celosía', 'azotea'], fuentes: ['https://es.wikipedia.org/wiki/Riad_(arquitectura)', 'https://en.wikipedia.org/wiki/Riad', 'https://es.wikipedia.org/wiki/Casa_andalus%C3%AD'] },
    plantas: [[
      R('escalera', 0, 0, 3, 3), R('recibidor', 3, 0, 1.5, 3, 'Zaguán en recodo'), R('salon', 4.5, 0, 7.5, 3, 'Salón de invierno'), R('cocina', 12, 0, 3, 4.5),
      R('pasillo', 3, 3, 9, 1.5, NF('Galería norte', V('S', 4.5))), R('pasillo', 3, 10.5, 9, 1.5, NF('Galería sur', V('N', 4.5))),
      R('pasillo', 3, 4.5, 1.5, 6, NF('Galería oeste', V('E', 4.5))), R('pasillo', 10.5, 4.5, 1.5, 6, NF('Galería este', V('O', 4.5))),
      R('patio', 4.5, 4.5, 6, 1.5, 'Patio'), R('patio', 4.5, 9, 6, 1.5, 'Patio'), R('patio', 4.5, 6, 1.5, 3, 'Patio'), R('patio', 9, 6, 1.5, 3, 'Patio'),
      R('piscina', 6, 6, 3, 3, NF('Alberca · fuente', { piscina: { prof: 0.5 } })),
      R('dormitorio_principal', 0, 3, 3, 4.5), R('bano', 0, 7.5, 3, 2.25, NF('Baño suite', { suite: true })), R('aseo', 0, 9.75, 3, 2.25),
      R('comedor', 12, 4.5, 3, 4.5), R('lavadero', 12, 9, 3, 1.5), R('despensa', 12, 10.5, 3, 1.5),
      R('salon', 0, 12, 12, 3, 'Salón de verano'), R('despacho', 12, 12, 3, 3, 'Despacho · biblioteca'),
    ], [
      R('escalera', 0, 0, 3, 3), R('dormitorio', 3, 0, 4.5, 3), R('bano', 7.5, 0, 1.5, 3), R('dormitorio', 9, 0, 3, 3),
      R('pasillo', 0, 3, 12, 1.5, 'Galería alta'), R('pasillo', 3, 10.5, 9, 1.5, 'Galería alta'), R('pasillo', 3, 4.5, 1.5, 6, 'Galería alta'), R('pasillo', 10.5, 4.5, 1.5, 6, 'Galería alta'),
      R('patio', 4.5, 4.5, 6, 6, NF('Patio · celosía de la galería', CEL(['N', 'S', 'E', 'O']))),
      R('terraza', 0, 4.5, 3, 7.5, 'Azotea'), R('terraza', 0, 12, 12, 3, 'Azotea'), R('terraza', 12, 0, 3, 15, 'Azotea'),
    ]],
  },
  // 4 · Casa patio cordobesa entre medianeras: zaguán con cancela, patio porticado, galería alta
  {
    id: 'cul-patio-cordobes', coleccion: 'culturas', nombre: 'Casa patio cordobesa', familia: 'natura', perfiles: ['familia', 'familia_numerosa'], acceso: 'N', medianeras: ['E', 'O'],
    desc: 'Solar urbano de 9 m de frente entre medianeras. El zaguán con cancela deja ver desde la calle el patio de las macetas, rodeado de galerías por tres lados y con la escalera en el cuarto. Sala de la reja a la calle, aseo y lavadero en la primera crujía; cocina y salón-comedor al fondo, abiertos al emparrado. Arriba, cuatro dormitorios y dos baños asomados a la galería.',
    acabados: { fachada: 'encalado', carpinteria: 'oscura' }, jardin: 'mediterraneo', cubierta: { tipo: 'dos', material: 'teja', color: 'mixta', pendiente: 25, alero: 0.25 },
    cultura: { origen: 'Córdoba (barrios de San Basilio y Santa Marina)', epoca: 's. XVI – XX', claves: ['zaguán y cancela', 'patio porticado con pozo y macetas', 'galería alta', 'cal blanca', 'emparrado'], fuentes: ['https://es.wikipedia.org/wiki/Fiesta_de_los_Patios_de_C%C3%B3rdoba', 'https://ich.unesco.org/es/RL/la-fiesta-de-los-patios-de-cordoba-00846', 'https://es.wikipedia.org/wiki/Zagu%C3%A1n'] },
    plantas: [[
      R('despacho', 0, 0, 3, 4.5, 'Sala de la reja'), R('recibidor', 3, 0, 3, 4.5, 'Zaguán y cancela'), R('aseo', 6, 0, 3, 2.25), R('lavadero', 6, 2.25, 3, 2.25),
      R('pasillo', 0, 4.5, 9, 1.5, NF('Galería norte', V('S', 4.5))), R('pasillo', 0, 6, 1.5, 5.25, NF('Galería oeste', V('E', 3.75))),
      R('patio', 1.5, 6, 6, 5.25, 'Patio de las macetas · pozo'), R('escalera', 7.5, 6, 1.5, 5.25),
      R('pasillo', 0, 11.25, 9, 1.5, NF('Galería sur', V('N', 4.5))), R('cocina', 0, 12.75, 3, 4.5), R('salon', 3, 12.75, 6, 4.5, 'Salón · comedor'),
      R('terraza', 0, 17.25, 9, 2.25, NF('Emparrado', { pergola: true })),
    ], [
      R('dormitorio', 0, 0, 3, 4.5), R('dormitorio', 3, 0, 3, 4.5, 'Dormitorio con baño'), R('bano', 6, 0, 3, 2.25, NF('Baño suite', { suite: true })), R('vestidor', 6, 2.25, 3, 2.25, 'Armario de ropa'),
      R('pasillo', 0, 4.5, 9, 1.5, NF('Galería alta', V('S', 4.5))), R('pasillo', 0, 6, 1.5, 5.25, 'Galería alta'), R('patio', 1.5, 6, 6, 5.25, 'Patio'), R('escalera', 7.5, 6, 1.5, 5.25),
      R('pasillo', 0, 11.25, 9, 1.5, NF('Galería alta', V('N', 4.5))),
      R('dormitorio', 0, 12.75, 3, 4.5), R('bano', 3, 12.75, 1.5, 4.5), R('dormitorio_principal', 4.5, 12.75, 4.5, 4.5),
    ]],
  },
  // 5 · Siheyuan: patio con cuatro pabellones en eje norte-sur, galerías youlang, puerta al sureste
  {
    id: 'cul-siheyuan', coleccion: 'culturas', nombre: 'Siheyuan · cuatro pabellones', familia: 'natura', perfiles: ['multigeneracional', 'familia_numerosa', 'familia'], acceso: 'S',
    desc: 'Cuatro pabellones alrededor de un patio con eje norte-sur. Se entra por la esquina sureste, frente a un muro pantalla. El pabellón norte (zhengfang) es la sala principal, que mira al sur, con la habitación de los mayores a un lado y un dormitorio con baño al otro. Al oeste, los hijos; al este, la cocina y el comedor; al sur, el estudio y los invitados. Dos galerías cubiertas (youlang) unen los pabellones sin cruzar el patio.',
    acabados: { fachada: 'ladrillo_gris', carpinteria: 'madera' }, jardin: 'huerto', cubierta: { tipo: 'dos', material: 'teja', color: 'negra', pendiente: 30, alero: 0.75 },
    cultura: { origen: 'China del norte (hutongs de Pekín)', epoca: 'dinastías Yuan a Qing (s. XIII – XX)', claves: ['patio cuadrado con eje N-S', 'zhengfang al norte para los mayores', 'xiangfang este y oeste', 'puerta al sureste y yingbi', 'galerías youlang', 'ladrillo gris y teja oscura'], fuentes: ['https://es.wikipedia.org/wiki/Siheyuan', 'https://en.wikipedia.org/wiki/Siheyuan', 'https://en.wikipedia.org/wiki/Hutong'] },
    plantas: [[
      R('dormitorio_principal', 0, 0, 4.5, 4.5, 'Habitación de los mayores'), R('salon', 4.5, 0, 7.5, 4.5, 'Zhengfang · sala principal'), R('bano', 12, 0, 1.5, 4.5), R('dormitorio', 13.5, 0, 3, 4.5, 'Ěrfáng · dormitorio'),
      R('pasillo', 0, 4.5, 16.5, 1.5, NF('Youlang · galería norte', V('S', 6))),
      R('dormitorio', 0, 6, 4.5, 3.75, 'Xiangfang oeste · dormitorio'), R('bano', 0, 9.75, 4.5, 2.25), R('patio', 4.5, 6, 7.5, 6, 'Patio · granado y pecera'), R('cocina', 12, 6, 4.5, 3), R('comedor', 12, 9, 4.5, 3, 'Xiangfang este · comedor'),
      R('pasillo', 0, 12, 16.5, 1.5, NF('Youlang · galería sur', V('N', 6))),
      R('despacho', 0, 13.5, 4.5, 3, 'Estudio'), R('dormitorio', 4.5, 13.5, 4.5, 3, 'Daozuofang · invitados'), R('aseo', 9, 13.5, 1.5, 3), R('lavadero', 10.5, 13.5, 3, 3), R('recibidor', 13.5, 13.5, 3, 3, 'Puerta del sureste · muro pantalla'),
    ]],
  },
  // 6 · Hanok en ㄱ: daecheong maru entre el anbang y el geonneonbang, toenmaru a lo largo del madang
  {
    id: 'cul-hanok', coleccion: 'culturas', nombre: 'Hanok · maru y madang', familia: 'line', perfiles: ['pareja', 'teletrabajo', 'senior'], acceso: 'N',
    desc: 'Casa coreana en ㄱ alrededor del madang, un patio de tierra batida. En el centro del ala principal está el daecheong maru, la sala de suelo de madera abierta al patio, entre el anbang (dormitorio principal) y el geonneonbang. El buok (cocina) y el comedor ocupan la esquina y el ala oeste, con el baño y el sarangbang (estudio) al fondo. Un toenmaru, galería de madera, recorre el patio y une todas las piezas. Cubierta de teja oscura con aleros de 1,25 m.',
    acabados: { fachada: 'encalado', carpinteria: 'madera' }, jardin: 'huerto', cubierta: { tipo: 'cuatro', material: 'teja', color: 'negra', pendiente: 30, alero: 1.25 },
    cultura: { origen: 'Corea (aldeas de Bukchon, Hahoe, Yangdong)', epoca: 'dinastía Joseon (1392 – 1897)', claves: ['planta en ㄱ', 'daecheong maru', 'ondol en los cuartos', 'toenmaru', 'madang vacío', 'aleros profundos de giwa'], fuentes: ['https://es.wikipedia.org/wiki/Hanok', 'https://en.wikipedia.org/wiki/Hanok', 'https://en.wikipedia.org/wiki/Ondol'] },
    plantas: [[
      R('cocina', 0, 0, 4.5, 4.5, 'Buok · cocina'), R('recibidor', 4.5, 0, 1.5, 4.5, 'Daemun · zaguán'), R('dormitorio_principal', 6, 0, 4.5, 4.5, 'Anbang · dormitorio principal'),
      R('salon', 10.5, 0, 6, 4.5, 'Daecheong · maru'), R('dormitorio', 16.5, 0, 4.5, 4.5, 'Geonneonbang · dormitorio'),
      R('pasillo', 4.5, 4.5, 16.5, 1.5, NF('Toenmaru · galería de madera', V('S', 6))),
      R('comedor', 0, 4.5, 4.5, 4.5), R('bano', 0, 9, 4.5, 1.5), R('aseo', 0, 10.5, 4.5, 1.5, 'Aseo · lavadero'), R('despacho', 0, 12, 4.5, 3, 'Sarangbang · estudio'),
      R('pasillo', 4.5, 6, 1.5, 9, NF('Toenmaru oeste', V('E', 4.5))),
      R('terraza', 6, 6, 7.5, 6, 'Madang · patio de tierra batida'),
    ]],
  },
  // 7 · Machiya de Kioto: estrecha y profunda, tōriniwa, tsuboniwa, zashiki al jardín del fondo
  {
    id: 'cul-machiya', coleccion: 'culturas', nombre: 'Machiya · casa de Kioto', familia: 'myway', perfiles: ['pareja', 'teletrabajo', 'familia'], acceso: 'N', medianeras: ['E', 'O'],
    desc: 'Casa urbana de 7,50 m de frente y 18 de fondo, la «cama de la anguila». El tōriniwa, un paso de tierra junto a la medianera, va de la calle al fondo. El mise, antiguo taller o tienda, da a la calle; detrás, el naka-no-ma con la cocina y la escalera de cajón, luego el tsuboniwa, un jardín de bolsillo que ilumina tres piezas, y el zashiki con su engawa frente al jardín del fondo. Arriba, tres dormitorios y un baño junto al fukinuke, el vacío sobre el tōriniwa.',
    acabados: { fachada: 'madera_negra', carpinteria: 'madera' }, jardin: 'zen', cubierta: { tipo: 'dos', material: 'teja', color: 'negra', pendiente: 25, alero: 0.5, cumbrera: 'x' },
    cultura: { origen: 'Kioto (Japón)', epoca: 'periodo Edo – Meiji (s. XVII – XIX)', claves: ['frente estrecho y gran fondo', 'tōriniwa', 'tsuboniwa', 'mise a la calle', 'zashiki y engawa al okuniwa', 'fukinuke'], fuentes: ['https://en.wikipedia.org/wiki/Machiya', 'https://es.wikipedia.org/wiki/Machiya', 'https://en.wikipedia.org/wiki/Tsuboniwa'] },
    plantas: [[
      R('recibidor', 0, 0, 1.5, 3, 'Genkan · entrada'), R('despacho', 1.5, 0, 6, 4.5, 'Mise · estudio a la calle'),
      R('pasillo', 0, 3, 1.5, 9.75, 'Tōriniwa · paso de tierra'),
      R('escalera', 1.5, 4.5, 1.5, 5.25, 'Escalera de cajón'), R('salon', 3, 4.5, 3, 5.25, 'Naka-no-ma · comedor y estar'), R('cocina', 6, 4.5, 1.5, 5.25, 'Hashiri · cocina'),
      R('aseo', 1.5, 9.75, 1.5, 1.5), R('patio', 3, 9.75, 4.5, 1.5, 'Tsuboniwa · jardín de bolsillo'), R('patio', 1.5, 11.25, 6, 1.5, 'Tsuboniwa · jardín de bolsillo'),
      R('salon', 0, 12.75, 7.5, 4.5, 'Zashiki · sala de tatami'), R('porche', 0, 17.25, 7.5, 1.5, 'Engawa'),
    ], [
      R('dormitorio', 0, 0, 4.5, 4.5), R('dormitorio_principal', 4.5, 0, 3, 4.5), R('doble_altura', 0, 4.5, 1.5, 5.25, 'Fukinuke · vacío sobre el tōriniwa'),
      R('escalera', 1.5, 4.5, 1.5, 5.25), R('pasillo', 3, 4.5, 4.5, 1.5, 'Distribuidor'), R('bano', 3, 6, 2.25, 3.75), R('dormitorio', 5.25, 6, 2.25, 3.75),
    ]],
  },
  // 8 · Minka con engawa: doma de tierra, hiroma con irori, cuatro cuartos en «田» de tatami, engawa en L
  {
    id: 'cul-minka', coleccion: 'culturas', nombre: 'Minka · irori y engawa', familia: 'line', perfiles: ['pareja', 'senior'], acceso: 'N',
    desc: 'Casa rural japonesa con cuatro cuartos en cuadrícula (yomadori) y medidas de tatami llevadas a la trama: un cuarto de 8 tatamis (3,64 m) queda en 3,75 × 3,75 m. Se entra al doma, el zaguán de tierra con la cocina. Desde ahí se sube a la hiroma con el irori (hogar), y a su lado están el chanoma (comedor), el nando (dormitorio) y el zashiki de invitados, que se comunican por fusuma como en el original. Un engawa en L protege el este y el sur bajo aleros de 1 m. El ofuro abre a la cocina, como en las minka.',
    acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'bosque', cubierta: { tipo: 'cuatro', material: 'chapa', color: 'grafito', pendiente: 40, alero: 1 },
    cultura: { origen: 'Japón rural (Shirakawa-gō, Kantō)', epoca: 'periodo Edo (1603 – 1868)', claves: ['doma de tierra', 'irori', 'yomadori (cuatro cuartos)', 'módulo de tatami ≈ 0,91 × 1,82 m', 'engawa', 'gran cubierta de paja (aquí chapa)'], fuentes: ['https://en.wikipedia.org/wiki/Minka', 'https://es.wikipedia.org/wiki/Minka', 'https://en.wikipedia.org/wiki/Engawa', 'https://en.wikipedia.org/wiki/Tatami'] },
    plantas: [[
      R('recibidor', 0, 0, 4.5, 3, 'Doma · zaguán de tierra'), R('cocina', 0, 3, 4.5, 4.5, 'Doma · cocina'), R('bano', 0, 7.5, 4.5, 1.5, 'Ofuro · baño'),
      R('salon', 4.5, 0, 3.75, 3.75, 'Hiroma · irori (8 tatamis)'), R('dormitorio_principal', 8.25, 0, 3.75, 3.75, 'Nando · dormitorio (8 tatamis)'),
      R('comedor', 4.5, 3.75, 3.75, 3.75, 'Chanoma · comedor (8 tatamis)'), R('dormitorio', 8.25, 3.75, 3.75, 3.75, 'Zashiki · invitados (8 tatamis)'),
      R('porche', 12, 0, 1.5, 7.5, 'Engawa este'), R('porche', 4.5, 7.5, 9, 1.5, 'Engawa sur'),
    ]],
  },
  // 9 · Casa ibicenca / cicládica: volúmenes blancos encadenados alrededor del porxo
  {
    id: 'cul-ibicenca', coleccion: 'culturas', nombre: 'Casa ibicenca · cubos encalados', familia: 'basic', perfiles: ['pareja', 'inversor', 'senior'], acceso: 'N',
    desc: 'Cubos encalados que se suman alrededor del porxo, la sala central a la que dan todas las piezas, como en el casament ibicenco o en las islas Cícladas. Los volúmenes se desplazan 0,75 m y cada uno se lee por separado. La cocina tiene chimenea; las dos cambras dan al porxo y la grande tiene baño propio. Al sur, el porxet de arcos, un emparrado y un aljibe convertido en alberca. Cubiertas planas y huecos pequeños: inercia y sombra.',
    acabados: { fachada: 'encalado', carpinteria: 'madera' }, jardin: 'mediterraneo', cubierta: { tipo: 'plana', material: 'grava', color: 'clara' },
    cultura: { origen: 'Ibiza (casament pagès) y Cícladas', epoca: 'arquitectura vernácula s. XVII – XX; estudiada por Raoul Hausmann y Erwin Broner (1930)', claves: ['crecimiento por adición de cubos', 'porxo central', 'porxet al sur', 'cal blanca', 'cubierta plana', 'aljibe'], fuentes: ['https://ca.wikipedia.org/wiki/Casa_pagesa_eivissenca', 'https://es.wikipedia.org/wiki/Arquitectura_de_las_C%C3%ADcladas', 'https://en.wikipedia.org/wiki/Erwin_Broner'] },
    plantas: [[
      R('cocina', 0, 1.5, 4.5, 4.5, 'Cuina · cocina con chimenea'), R('recibidor', 6, 1.5, 3, 1.5, 'Entrada'), R('bano', 9, 1.5, 3, 1.5),
      R('salon', 4.5, 3, 6, 4.5, 'Porxo · sala principal'), R('dormitorio', 10.5, 3, 3.75, 4.5, 'Cambra · dormitorio'),
      R('dormitorio_principal', 0.75, 6, 3.75, 4.5, 'Cambra gran · dormitorio principal'), R('bano', 0.75, 10.5, 3.75, 1.5, NF('Baño suite', { suite: true })),
      R('porche', 4.5, 7.5, 6, 3, 'Porxet · porche de arcos'), R('terraza', 10.5, 7.5, 4.5, 3, NF('Emparrado · terraza con parra', { pergola: true })),
      R('piscina', 4.5, 12, 6, 2.25, 'Aljibe · alberca'),
    ]],
  },
  // 10 · Masía catalana: tres crujías, entrada central bajo el hastial, sala en la planta noble
  {
    id: 'cul-masia', coleccion: 'culturas', nombre: 'Masía · tres crujías', familia: 'myway', perfiles: ['familia_numerosa', 'multigeneracional', 'familia'], acceso: 'S',
    desc: 'Masía de tres crujías y dos plantas, con el hastial a dos aguas en la fachada sur. Abajo, la entrada central con portal de piedra, la cocina con llar de foc y el comedor a un lado, y el antiguo establo, hoy garaje-taller, al otro; detrás, la bodega y el lavadero. Arriba, la sala central abierta al sur es el corazón de la casa y reparte cuatro cambras y dos baños.',
    acabados: { fachada: 'mamposteria', carpinteria: 'madera' }, jardin: 'huerto', cubierta: { tipo: 'dos', material: 'teja', color: 'roja', pendiente: 30, alero: 0.5, cumbrera: 'y' },
    cultura: { origen: 'Cataluña (Empordà, Osona, Vallès)', epoca: 's. XV – XIX (tipo basilical)', claves: ['tres crujías', 'cumbrera perpendicular a la fachada', 'entrada central', 'sala en planta noble', 'llar de foc', 'mampostería y portal adovelado'], fuentes: ['https://es.wikipedia.org/wiki/Mas%C3%ADa', 'https://ca.wikipedia.org/wiki/Mas_(casa)', 'https://en.wikipedia.org/wiki/Mas%C3%ADa'] },
    plantas: [[
      R('aseo', 0, 0, 4.5, 1.5), R('cocina', 0, 1.5, 4.5, 4.5, 'Cuina · llar de foc'), R('comedor', 0, 6, 4.5, 4.5, 'Menjador · comedor'),
      R('trastero', 4.5, 0, 5.25, 4.5, 'Celler · bodega'), R('escalera', 4.5, 4.5, 5.25, 1.5), R('recibidor', 4.5, 6, 5.25, 4.5, 'Entrada · portal adovelado'),
      R('lavadero', 9.75, 0, 4.5, 4.5), R('garaje', 9.75, 4.5, 4.5, 6, NF('Estable · garaje y taller', { taller: true })),
    ], [
      R('vestidor', 0, 0, 4.5, 1.5, 'Armario'), R('dormitorio', 0, 1.5, 4.5, 4.5, 'Cambra'), R('dormitorio_principal', 0, 6, 4.5, 4.5, 'Cambra gran'),
      R('bano', 4.5, 0, 5.25, 1.5), R('distribuidor', 4.5, 1.5, 5.25, 3), R('escalera', 4.5, 4.5, 5.25, 1.5), R('salon', 4.5, 6, 5.25, 4.5, NF('Sala · galería al sur', V('S', 3.75))),
      R('bano', 9.75, 0, 4.5, 1.5, NF('Baño suite', { suite: true })), R('dormitorio', 9.75, 1.5, 4.5, 4.5, 'Cambra'), R('dormitorio', 9.75, 6, 4.5, 4.5, 'Cambra'),
    ]],
  },
  // 11 · Casa de adobe del suroeste (pueblo): volúmenes escalonados, azoteas, portal de vigas, chimenea kiva
  {
    id: 'cul-pueblo', coleccion: 'culturas', nombre: 'Casa de adobe · pueblo escalonado', familia: 'natura', perfiles: ['familia', 'teletrabajo'], acceso: 'N',
    desc: 'Muros gruesos de tierra y volúmenes que se escalonan: la planta alta, más pequeña, deja azoteas sobre la planta baja, como en Taos o Acoma. Zaguán, cocina con horno, comedor y sala con chimenea kiva en esquina; un dormitorio de invitados abajo y dos arriba con baño. Al sur, un portal de vigas y latillas y un fogón exterior.',
    acabados: { fachada: 'adobe', carpinteria: 'madera' }, jardin: 'mediterraneo', cubierta: { tipo: 'plana', material: 'grava', color: 'clara' },
    cultura: { origen: 'Suroeste de Norteamérica (Taos, Acoma, Santa Fe)', epoca: 'pueblos ancestrales (s. XI –) y estilo Pueblo Revival (s. XX)', claves: ['adobe', 'volúmenes escalonados y azoteas', 'vigas y latillas', 'chimenea kiva', 'portal'], fuentes: ['https://en.wikipedia.org/wiki/Pueblo_Revival_architecture', 'https://es.wikipedia.org/wiki/Taos_Pueblo', 'https://en.wikipedia.org/wiki/Adobe'] },
    plantas: [[
      R('cocina', 0, 0, 4.5, 3, 'Cocina · horno'), R('recibidor', 4.5, 0, 3, 3, 'Zaguán'), R('escalera', 7.5, 0, 3, 3), R('aseo', 10.5, 0, 3, 3, 'Aseo · lavadero'),
      R('comedor', 0, 3, 4.5, 6), R('pasillo', 4.5, 3, 9, 1.5, 'Corredor'), R('salon', 4.5, 4.5, 4.5, 4.5, 'Sala · chimenea kiva'), R('dormitorio', 9, 4.5, 4.5, 4.5, 'Dormitorio de invitados'),
      R('terraza', 0, 9, 9, 2.25, NF('Portal · vigas y latillas', { pergola: true })), R('fogonero', 9.75, 9.75, 3, 2.25, 'Horno · fogón exterior'),
    ], [
      R('terraza', 0, 0, 4.5, 9, 'Azotea'), R('bano', 4.5, 0, 3, 3), R('escalera', 7.5, 0, 3, 3), R('dormitorio', 10.5, 0, 3, 4.5),
      R('pasillo', 4.5, 3, 6, 1.5, 'Distribuidor'), R('dormitorio_principal', 4.5, 4.5, 4.5, 4.5), R('terraza', 9, 4.5, 4.5, 4.5, 'Azotea'),
    ]],
  },
  // 12 · Solar maya: pabellones (na) alrededor de un patio, cocina de fogón aparte, cubiertas empinadas
  {
    id: 'cul-maya', coleccion: 'culturas', nombre: 'Solar maya · pabellones y patio', familia: 'line', perfiles: ['pareja', 'familia', 'senior'], acceso: 'N',
    desc: 'Pabellones de una sola pieza (na), cada uno con su cubierta empinada, alrededor del patio del solar, como en el grupo doméstico maya. Se entra por el hueco entre la sala y la cocina de fogón (k\'oben). Un corredor acristalado une el granero, la sala y los dos pabellones de dormir, cada uno con su baño. En el patio, el fogón de tres piedras.',
    acabados: { fachada: 'encalado', carpinteria: 'madera' }, jardin: 'huerto', cubierta: { tipo: 'cuatro', material: 'tegola', color: 'marron', pendiente: 45, alero: 0.75 },
    cultura: { origen: 'Península de Yucatán y tierras bajas mayas', epoca: 'del Preclásico (s. X a. C.) a la casa maya actual', claves: ['grupo de patio', 'pabellones de una pieza (na)', 'cocina aparte (k\'oben)', 'cubierta de palma empinada (aquí tégola)', 'enlucido de cal (sascab)'], fuentes: ['https://es.wikipedia.org/wiki/Casa_maya', 'https://en.wikipedia.org/wiki/Maya_architecture#Residential', 'https://es.wikipedia.org/wiki/Arquitectura_maya'] },
    plantas: [[
      R('despensa', 0, 0, 3, 4.5, 'Troje · granero'), R('salon', 3, 0, 6, 4.5, 'Na · sala'), R('recibidor', 9, 0, 1.5, 4.5, 'Paso de entrada'), R('cocina', 10.5, 0, 4.5, 4.5, "K'oben · cocina de fogón"),
      R('pasillo', 0, 4.5, 15, 1.5, NF('Corredor del patio', V('S', 4.5))),
      R('dormitorio', 0, 6, 4.5, 3.75, 'Na de dormir'), R('bano', 0, 9.75, 4.5, 2.25, NF('Baño · na de dormir', { suite: true })),
      R('patio', 4.5, 6, 6, 6, 'Patio del solar'),
      R('dormitorio_principal', 10.5, 6, 4.5, 4.5, 'Na principal'), R('bano', 10.5, 10.5, 4.5, 2.25, NF('Baño suite', { suite: true })),
      R('fogonero', 6, 13.5, 3, 2.25, 'Fogón de tres piedras'),
    ]],
  },
  // 13 · Casa egipcia de patio: qa'a con durqa'a y malqaf, sahn con fuente, takhtabush, maq'ad con mashrabiya
  {
    id: 'cul-malqaf', coleccion: 'culturas', nombre: "Casa de patio · malqaf y qa'a", familia: 'natura', perfiles: ['familia', 'multigeneracional'], acceso: 'N',
    desc: "Casa de El Cairo para el calor. La qa'a, la sala principal, tiene en el centro una durqa'a a doble altura rematada por un malqaf, una torre de viento abierta al norte (celosía alta en la fachada norte) que mete el aire fresco en la casa. Se entra por un majaz en recodo. Galerías alrededor del sahn, el patio con fuente. El takhtabush, una logia en sombra, une el patio con el jardín, y arriba el maq'ad mira al patio tras una celosía de madera (mashrabiya).",
    acabados: { fachada: 'tapial', carpinteria: 'madera' }, jardin: 'mediterraneo', cubierta: { tipo: 'plana', material: 'grava', color: 'clara' },
    cultura: { origen: 'El Cairo (Bayt al-Suhaymi) y la arquitectura de tierra de Hassan Fathy', epoca: 's. XVII – XVIII; Nueva Gurna (1945 – 1948)', claves: ['malqaf (torre de viento)', "qa'a con durqa'a", 'sahn con fuente', 'takhtabush', "maq'ad", 'mashrabiya', 'entrada en recodo'], fuentes: ['https://en.wikipedia.org/wiki/Malqaf', 'https://en.wikipedia.org/wiki/Bayt_al-Suhaymi', 'https://es.wikipedia.org/wiki/Hassan_Fathy', 'https://en.wikipedia.org/wiki/Mashrabiya'] },
    plantas: [[
      R('recibidor', 0, 0, 3, 4.5, 'Majaz · entrada en recodo'), R('salon', 3, 0, 7.5, 4.5, "Qa'a · sala con durqa'a"), R('escalera', 10.5, 0, 3, 3), R('bano', 10.5, 3, 3, 1.5),
      R('pasillo', 0, 4.5, 13.5, 1.5, NF('Galería norte', V('S', 4.5))),
      R('cocina', 0, 6, 3, 3.75, 'Matbakh · cocina'), R('aseo', 0, 9.75, 3, 2.25), R('pasillo', 3, 6, 1.5, 6, NF('Galería oeste', V('E', 3))),
      R('patio', 4.5, 6, 6, 1.5, 'Sahn · patio'), R('patio', 4.5, 10.5, 6, 1.5, 'Sahn · patio'), R('patio', 4.5, 7.5, 1.5, 3, 'Sahn · patio'), R('patio', 9, 7.5, 1.5, 3, 'Sahn · patio'),
      R('piscina', 6, 7.5, 3, 3, NF('Fisqiyya · fuente', { piscina: { prof: 0.4 } })),
      R('comedor', 10.5, 6, 3, 6), R('porche', 4.5, 12, 6, 2.25, 'Takhtabush · logia de sombra'),
    ], [
      R('dormitorio', 0, 0, 4.5, 4.5, 'Dormitorio · haramlik'), R('doble_altura', 4.5, 0, 4.5, 4.5, NF("Durqa'a · doble altura y malqaf", CEL(['N'], 'madera', 'cubierta'))), R('bano', 9, 0, 1.5, 4.5),
      R('escalera', 10.5, 0, 3, 3), R('pasillo', 10.5, 3, 3, 1.5, 'Distribuidor'),
      R('pasillo', 0, 4.5, 13.5, 1.5, "Maq'ad · galería alta"), R('patio', 4.5, 6, 6, 6, NF('Sahn · mashrabiya del maq\'ad', CEL(['N']))),
      R('dormitorio', 0, 6, 4.5, 3.75), R('dormitorio_principal', 10.5, 6, 3, 4.5),
    ]],
  },
  // 14 · Casa nórdica: vindfang (entrada de barro), sauna, estufa en el estar, altillo bajo cubierta empinada
  {
    id: 'cul-nordica', coleccion: 'culturas', nombre: 'Casa nórdica · sauna y estufa', familia: 'myway', perfiles: ['familia', 'teletrabajo'], acceso: 'N',
    desc: 'Volumen compacto de 9 × 12 m bajo una cubierta empinada para la nieve, con tablas pintadas de rojo Falun. Se entra por el vindfang, la entrada de barro donde se dejan botas y abrigos, que hace de cortavientos. Al norte, la escalera y la sauna con ducha; al sur, el estar con estufa a doble altura y la cocina-comedor. Arriba, una galería asomada al estar reparte tres dormitorios y el baño. Deck de madera al sur.',
    acabados: { fachada: 'madera_roja', carpinteria: 'clara' }, jardin: 'bosque', cubierta: { tipo: 'dos', material: 'chapa', color: 'grafito', pendiente: 40, alero: 0.5 },
    cultura: { origen: 'Escandinavia (Suecia, Noruega, Finlandia)', epoca: 'tradición rural y casa de verano (stuga), s. XVIII – XXI', claves: ['vindfang / entrada de barro', 'sauna', 'estufa central (kakelugn)', 'pintura roja de Falun', 'cubierta empinada', 'altillo'], fuentes: ['https://en.wikipedia.org/wiki/Falu_red', 'https://es.wikipedia.org/wiki/Sauna', 'https://en.wikipedia.org/wiki/Tiled_stove', 'https://en.wikipedia.org/wiki/Mudroom'] },
    plantas: [[
      R('recibidor', 0, 0, 3, 3, 'Vindfang · entrada de barro'), R('escalera', 3, 0, 3, 3), R('bano', 6, 0, 3, 3, 'Bastu · sauna y ducha'),
      R('pasillo', 0, 3, 9, 1.5, 'Paso · colgadores'),
      R('cocina', 0, 4.5, 3, 4.5), R('comedor', 0, 9, 3, 3), R('salon', 3, 4.5, 6, 7.5, 'Estar con estufa · doble altura'),
      R('terraza', 0, 12, 9, 2.25, 'Deck · terraza de madera'),
    ], [
      R('dormitorio', 0, 0, 3, 3), R('escalera', 3, 0, 3, 3), R('bano', 6, 0, 3, 3), R('pasillo', 0, 3, 9, 1.5, 'Distribuidor'),
      R('dormitorio_principal', 0, 4.5, 4.5, 4.5), R('dormitorio', 0, 9, 4.5, 3), R('pasillo', 4.5, 4.5, 1.5, 7.5, 'Galería sobre el estar'), R('doble_altura', 6, 4.5, 3, 7.5, 'Doble altura del estar'),
    ]],
  },
  // 15 · Shaker / colonial americana (saltbox): hall central y escalera, cocina-keeping room atrás, simetría
  {
    id: 'cul-shaker', coleccion: 'culturas', nombre: 'Colonial Shaker · saltbox', familia: 'basic', perfiles: ['familia', 'multigeneracional'], acceso: 'S',
    desc: 'Casa colonial de Nueva Inglaterra con planta de hall central y orden Shaker: simetría, nada superfluo, colgadores de madera y armarios empotrados. La fachada principal, de dos plantas, mira al sur con el parlor, el hall y el comedor; detrás, bajo el faldón largo del saltbox, están la keeping room (cocina con hogar), el borning room (dormitorio de planta baja) y el aseo. Arriba, dos dormitorios simétricos y el baño. Ladrillo, como las casas de las comunidades Shaker.',
    acabados: { fachada: 'ladrillo_rojo', carpinteria: 'clara' }, jardin: 'huerto', cubierta: { tipo: 'dos', material: 'tegola', color: 'pizarra', pendiente: 40, alero: 0.25, cumbrera: 'x' },
    cultura: { origen: 'Nueva Inglaterra (EE. UU.); comunidades Shaker de Hancock y Canterbury', epoca: 's. XVII – XIX', claves: ['planta de hall central', 'saltbox (faldón largo al norte)', 'keeping room', 'borning room', 'colgadores y armarios Shaker', 'simetría'], fuentes: ['https://en.wikipedia.org/wiki/Saltbox', 'https://en.wikipedia.org/wiki/Shakers', 'https://en.wikipedia.org/wiki/Shaker_furniture', 'https://en.wikipedia.org/wiki/Hancock_Shaker_Village'] },
    plantas: [[
      R('dormitorio', 0, 0, 4.5, 4.5, 'Borning room · dormitorio'), R('aseo', 4.5, 0, 3, 1.5), R('distribuidor', 4.5, 1.5, 3, 1.5, 'Back hall · colgadores'), R('cocina', 7.5, 0, 4.5, 4.5, 'Keeping room · cocina con hogar'),
      R('escalera', 4.5, 3, 3, 3), R('salon', 0, 4.5, 4.5, 4.5, 'Parlor · salón'), R('recibidor', 4.5, 6, 3, 3, 'Hall · entrada'), R('comedor', 7.5, 4.5, 4.5, 4.5),
    ], [
      R('escalera', 4.5, 3, 3, 3), R('distribuidor', 4.5, 6, 3, 1.5), R('bano', 4.5, 7.5, 3, 1.5),
      R('dormitorio_principal', 0, 4.5, 4.5, 4.5, 'Chamber · dormitorio principal'), R('dormitorio', 7.5, 4.5, 4.5, 4.5, 'Chamber · dormitorio'),
    ]],
  },
  // 16 · Casa tropical sobre pilotes: kolong ventilado, una crujía con ventilación cruzada, serambi
  {
    id: 'cul-pilotes', coleccion: 'culturas', nombre: 'Casa sobre pilotes · ventilación cruzada', familia: 'line', perfiles: ['pareja', 'teletrabajo', 'inversor'], acceso: 'N',
    desc: 'Casa larga elevada una planta sobre el terreno, como la rumah melayu o la casa Queenslander. Abajo solo hay el zaguán con la escalera, un aseo y el kolong, una sombra ventilada para estar, trabajar o aparcar. Arriba, una sola crujía de 4,50 m con ventilación cruzada entre la galería norte y el serambi, una veranda ventilada al sur con celosías en los extremos. Cubierta de chapa con aleros de 1 m.',
    acabados: { fachada: 'madera', carpinteria: 'madera' }, jardin: 'bosque', cubierta: { tipo: 'dos', material: 'chapa', color: 'rojo', pendiente: 30, alero: 1 },
    cultura: { origen: 'Sudeste asiático (rumah Melayu) y Queensland (Australia)', epoca: 'vernácula; Queenslander 1840 – 1960', claves: ['planta elevada sobre pilotes', 'kolong ventilado', 'una crujía con ventilación cruzada', 'veranda (serambi)', 'lamas y celosías', 'cubierta de chapa'], fuentes: ['https://en.wikipedia.org/wiki/Malay_house', 'https://en.wikipedia.org/wiki/Queenslander_(architecture)', 'https://es.wikipedia.org/wiki/Palafito'] },
    plantas: [[
      R('porche', 0, 0, 9.75, 8.25, 'Kolong · sombra bajo la casa'), R('porche', 9.75, 0, 3, 1.5, 'Kolong'), R('escalera', 9.75, 1.5, 1.5, 4.5, { sube: 'N' }),
      R('porche', 11.25, 1.5, 1.5, 2.25, 'Kolong'), R('aseo', 11.25, 3.75, 1.5, 2.25), R('recibidor', 9.75, 6, 3, 2.25, 'Zaguán bajo la casa'), R('porche', 12.75, 0, 7.5, 8.25, 'Kolong · aparcamiento a la sombra'),
    ], [
      R('pasillo', 0, 0, 20.25, 1.5, NF('Selang · galería de lamas', V('N', 4.5, 'ventana'))),
      R('dormitorio', 0, 1.5, 3.75, 4.5, 'Bilik · dormitorio'), R('dormitorio_principal', 3.75, 1.5, 3.75, 4.5, 'Bilik utama · dormitorio principal'), R('bano', 7.5, 1.5, 2.25, 4.5),
      R('escalera', 9.75, 1.5, 1.5, 4.5), R('lavadero', 11.25, 1.5, 1.5, 4.5), R('salon', 12.75, 1.5, 4.5, 4.5, 'Rumah ibu · sala'), R('cocina', 17.25, 1.5, 3, 4.5, 'Dapur · cocina'),
      R('terraza', 0, 6, 20.25, 2.25, NF('Serambi · veranda ventilada', CEL(['E', 'O']))),
    ]],
  },
  // 17 · Bauhaus (casas de los maestros, Dessau): cubos de alturas distintas, escalera acristalada, atelier al norte
  {
    id: 'cul-bauhaus', coleccion: 'culturas', nombre: 'Bauhaus · casa de maestros', familia: 'myway', perfiles: ['teletrabajo', 'familia', 'pareja'], acceso: 'N',
    desc: 'Cubos blancos de distinta altura que encajan, con cubierta plana, como las casas de los maestros que Walter Gropius construyó en Dessau en 1926. La escalera tiene una vidriera vertical a la calle. Abajo, salón y comedor abiertos al jardín, cocina funcional, aseo y un cuarto de invitados con baño. Arriba, un atelier con luz norte, el dormitorio principal con vestidor y balcón volado de 1,50 m, otro dormitorio, el baño y una azotea sobre el volumen bajo.',
    acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'bosque', cubierta: { tipo: 'plana', material: 'grava', color: 'gris' },
    cultura: { origen: 'Dessau (Alemania) · Walter Gropius, Bauhaus', epoca: '1925 – 1926', claves: ['volúmenes cúbicos que se encajan', 'cubierta plana y azotea', 'escalera con vidriera', 'atelier con luz norte', 'balcón volado', 'blanco y carpintería oscura'], fuentes: ['https://es.wikipedia.org/wiki/Casas_de_los_maestros', 'https://en.wikipedia.org/wiki/Masters%27_Houses', 'https://whc.unesco.org/es/list/729'] },
    plantas: [[
      R('cocina', 0, 0, 4.5, 3), R('aseo', 4.5, 0, 1.5, 3), R('recibidor', 6, 0, 3, 3), R('escalera', 9, 0, 1.5, 5.25, 'Escalera · vidriera'), R('dormitorio', 10.5, 0, 3, 3.75, 'Habitación de invitados'),
      R('comedor', 0, 3, 4.5, 6), R('salon', 4.5, 3, 4.5, 6), R('pasillo', 10.5, 3.75, 3, 1.5, 'Paso'), R('bano', 10.5, 5.25, 3, 2.25), R('pasillo', 9, 5.25, 1.5, 3.75, 'Paso al jardín'),
      R('terraza', 0, 9, 10.5, 1.5, 'Terraza'),
    ], [
      R('terraza', 0, 0, 4.5, 9, 'Azotea'), R('despacho', 4.5, 0, 4.5, 3.75, 'Atelier · luz norte'), R('escalera', 9, 0, 1.5, 5.25), R('dormitorio', 10.5, 0, 3, 3.75),
      R('pasillo', 4.5, 3.75, 4.5, 1.5, 'Distribuidor'), R('pasillo', 10.5, 3.75, 3, 1.5, 'Distribuidor'),
      R('dormitorio_principal', 4.5, 5.25, 4.5, 3.75), R('vestidor', 9, 5.25, 1.5, 3.75), R('bano', 10.5, 5.25, 3, 2.25),
      R('terraza', 4.5, 9, 4.5, 1.5, 'Balcón volado'),
    ]],
  },
  // 18 · Art Déco / Streamline Moderne: bandas horizontales, torre de pavés, cubierta de barco, piscina
  {
    id: 'cul-streamline', coleccion: 'culturas', nombre: 'Streamline · casa transatlántico', familia: 'line', perfiles: ['pareja', 'teletrabajo'], acceso: 'N',
    desc: 'La casa como un transatlántico del Streamline Moderne de los años 30, como en Miami Beach. Bandas horizontales de ventana corrida, una cubierta plana con alero fino que hace de visera, terrazas como cubiertas de barco con barandilla y una escalera de pavés que sube como una torre. Abajo, vestíbulo, cocina-office, comedor, salón de 34 m² y garaje para dos coches. Arriba, dos dormitorios y el baño entre solárium y terraza de proa. Piscina al sur.',
    acabados: { fachada: 'estuco_rosado', carpinteria: 'clara' }, jardin: 'cesped', cubierta: { tipo: 'plana', material: 'grava', color: 'clara', alero: 0.5 },
    cultura: { origen: 'EE. UU. y Europa · Miami Beach, Los Ángeles (Richard Neutra, Robert Mallet-Stevens)', epoca: '1930 – 1940', claves: ['líneas horizontales', 'ventana corrida', 'visera continua', 'escalera de pavés en torre', 'terrazas como cubiertas de barco', 'colores pastel'], fuentes: ['https://es.wikipedia.org/wiki/Streamline_Moderne', 'https://en.wikipedia.org/wiki/Streamline_Moderne', 'https://en.wikipedia.org/wiki/Miami_Beach_Architectural_District'] },
    plantas: [[
      R('comedor', 0, 0, 4.5, 4.5, 'Comedor · bow window'), R('recibidor', 4.5, 0, 3, 3, 'Vestíbulo'), R('aseo', 7.5, 0, 1.5, 3), R('garaje', 9, 0, 6, 5.25, 'Garaje · 2 plazas'),
      R('escalera', 4.5, 3, 1.5, 6, 'Escalera · torre de pavés'), R('distribuidor', 6, 3, 3, 2.25), R('cocina', 0, 4.5, 4.5, 4.5, 'Cocina · office al solárium'), R('salon', 6, 5.25, 9, 3.75, 'Salón · ventana corrida'),
      R('terraza', 0, 9, 15, 1.5, 'Solárium'), R('piscina', 6, 10.5, 9, 3),
    ], [
      R('terraza', 0, 0, 4.5, 9, 'Solárium · cubierta de barco'), R('bano', 6, 0, 3, 3), R('terraza', 9, 0, 6, 3, 'Terraza de proa'),
      R('escalera', 4.5, 3, 1.5, 6), R('pasillo', 6, 3, 9, 1.5), R('dormitorio_principal', 6, 4.5, 4.5, 4.5), R('dormitorio', 10.5, 4.5, 4.5, 4.5),
    ]],
  },
  // 19 · Brutalismo doméstico: hormigón tablillado, escalera escultórica, doble altura, voladizo con brise-soleil
  {
    id: 'cul-brutalista', coleccion: 'culturas', nombre: 'Brutalista · hormigón y voladizo', familia: 'myway', perfiles: ['familia', 'teletrabajo'], acceso: 'N',
    desc: 'Casa de hormigón visto, encofrado con tablilla, en la línea del brutalismo paulista y del béton brut. Una escalera escultórica sale del vestíbulo junto a un comedor a doble altura. La planta alta vuela 1,50 m sobre el salón y termina en un balcón con brise-soleil de hormigón al sur. Abajo, cocina, salón al jardín, aseo y un cuarto de invitados; arriba, dos dormitorios, un tercero al norte y el baño.',
    acabados: { fachada: 'hormigon', carpinteria: 'oscura' }, jardin: 'praderia', cubierta: { tipo: 'plana', material: 'grava', color: 'gris' },
    cultura: { origen: 'Le Corbusier (béton brut), Alison y Peter Smithson, escuela paulista (Vilanova Artigas, Paulo Mendes da Rocha)', epoca: '1950 – 1975', claves: ['hormigón visto tablillado', 'masa y voladizo', 'brise-soleil', 'doble altura', 'escalera como escultura', 'honestidad material'], fuentes: ['https://es.wikipedia.org/wiki/Brutalismo', 'https://en.wikipedia.org/wiki/Paulista_School', 'https://es.wikipedia.org/wiki/Paulo_Mendes_da_Rocha', 'https://en.wikipedia.org/wiki/Brise_soleil'] },
    plantas: [[
      R('cocina', 0, 0, 4.5, 5.25), R('escalera', 4.5, 0, 1.5, 5.25, 'Escalera escultórica'), R('recibidor', 6, 0, 3, 3), R('aseo', 9, 0, 1.5, 3), R('dormitorio', 10.5, 0, 3, 3, 'Dormitorio de invitados'),
      R('pasillo', 6, 3, 7.5, 1.5, 'Paso'), R('comedor', 0, 5.25, 6, 3.75, 'Comedor · doble altura'), R('salon', 6, 4.5, 7.5, 4.5),
    ], [
      R('terraza', 0, 0, 4.5, 5.25, 'Azotea'), R('escalera', 4.5, 0, 1.5, 5.25), R('bano', 6, 0, 3, 3), R('despacho', 9, 0, 4.5, 3, 'Estudio'),
      R('pasillo', 6, 3, 7.5, 1.5, 'Distribuidor'), R('doble_altura', 0, 5.25, 6, 3.75, 'Doble altura del comedor'),
      R('dormitorio', 6, 4.5, 3.75, 4.5), R('dormitorio_principal', 9.75, 4.5, 3.75, 4.5),
      R('terraza', 6, 9, 7.5, 1.5, NF('Balcón · brise-soleil de hormigón', CEL(['S'], 'hormigon'))),
    ]],
  },
  // 20 · Wabi-sabi / zen: genkan, rōka, tsuboniwa, ofuro, chashitsu de 4,5 tatamis, engawa al jardín seco
  {
    id: 'cul-wabisabi', coleccion: 'culturas', nombre: 'Wabi-sabi · casa del té', familia: 'basic', perfiles: ['pareja', 'senior', 'solo'], acceso: 'N',
    desc: 'Casa pequeña de tierra y madera que acepta la imperfección. Del genkan sale el rōka, un corredor acristalado que mira al tsuboniwa, un jardín de bolsillo tras una celosía. A él abren el ofuro (baño de inmersión con vista al jardín), el dormitorio de futones, la sala con tokonoma, la cocina-comedor y el chashitsu, una sala de té de 4,5 tatamis (2,73 m, aquí 3,00 × 3,00 m) con su mizuya. Un engawa mira al jardín seco del sur.',
    acabados: { fachada: 'adobe', carpinteria: 'madera' }, jardin: 'zen', cubierta: { tipo: 'dos', material: 'chapa', color: 'grafito', pendiente: 20, alero: 1 },
    cultura: { origen: 'Japón · estética de la ceremonia del té (Sen no Rikyū)', epoca: 's. XVI – actualidad', claves: ['wabi-sabi', 'chashitsu de 4,5 tatamis', 'tokonoma', 'tsuboniwa', 'engawa', 'muros de tierra (tsuchikabe)'], fuentes: ['https://es.wikipedia.org/wiki/Wabi-sabi', 'https://en.wikipedia.org/wiki/Chashitsu', 'https://es.wikipedia.org/wiki/Sen_no_Riky%C5%AB', 'https://en.wikipedia.org/wiki/Tokonoma'] },
    plantas: [[
      R('recibidor', 0, 0, 3, 3, 'Genkan'), R('aseo', 3, 0, 1.5, 3), R('patio', 4.5, 0, 3, 3, NF('Tsuboniwa · jardín de bolsillo', CEL(['N']))), R('bano', 7.5, 0, 3, 3, 'Ofuro · baño de inmersión'),
      R('dormitorio_principal', 10.5, 0, 4.5, 4.5, 'Dormitorio · futones'),
      R('pasillo', 0, 3, 10.5, 1.5, NF('Rōka · corredor', V('N', 3))),
      R('salon', 0, 4.5, 6, 4.5, 'Ima · sala con tokonoma'), R('cocina', 6, 4.5, 3, 4.5, 'Daidokoro · cocina comedor'), R('despacho', 9, 4.5, 3, 3, 'Chashitsu · sala de té (4,5 tatamis)'), R('despensa', 9, 7.5, 3, 1.5, 'Mizuya · preparación del té'),
      R('porche', 0, 9, 12, 1.5, 'Engawa · veranda de madera'),
    ]],
  },
  // 21 · «Menos pero mejor»: principios del diseño industrial alemán de los años 60 (Dieter Rams, escuela de Ulm)
  {
    id: 'cul-menos-mejor', coleccion: 'culturas', nombre: 'Menos pero mejor', familia: 'line', perfiles: ['pareja', 'teletrabajo', 'senior'], acceso: 'N',
    desc: 'Una barra de 16,50 × 7,50 m con el máximo orden: una banda de servicio al norte (cocina en línea, aseo, baño, lavadero y un muro de almacenaje continuo) y todas las piezas vivideras al sur, con la misma profundidad y la terraza a lo largo. Sin nada superfluo, todo en módulos de 0,75 m, aluminio claro y vidrio. Inspirada en los diez principios del buen diseño de Dieter Rams y en la escuela de Ulm, no en ningún producto.',
    acabados: { fachada: 'chapa_clara', carpinteria: 'clara' }, jardin: 'praderia', cubierta: { tipo: 'plana', material: 'grava', color: 'clara' },
    cultura: { origen: 'Diseño industrial alemán · Dieter Rams, Hans Gugelot, Hochschule für Gestaltung de Ulm', epoca: '1955 – 1975', claves: ['«menos, pero mejor»', 'banda servidora y banda servida', 'muro de almacenaje modular', 'retícula estricta', 'gris y blanco neutros', 'durabilidad'], fuentes: ['https://es.wikipedia.org/wiki/Dieter_Rams', 'https://en.wikipedia.org/wiki/Dieter_Rams#%22Good_design%22_principles', 'https://es.wikipedia.org/wiki/Escuela_de_Ulm'] },
    plantas: [[
      R('cocina', 0, 0, 6, 2.25, 'Cocina · línea de trabajo'), R('recibidor', 6, 0, 1.5, 2.25), R('aseo', 7.5, 0, 1.5, 2.25), R('bano', 9, 0, 3, 2.25), R('lavadero', 12, 0, 1.5, 2.25), R('vestidor', 13.5, 0, 3, 2.25, 'Muro de almacenaje'),
      R('salon', 0, 2.25, 6, 5.25, 'Salón · comedor'), R('pasillo', 6, 2.25, 10.5, 1.5, 'Paso'),
      R('despacho', 6, 3.75, 3, 3.75), R('dormitorio', 9, 3.75, 3.75, 3.75), R('dormitorio_principal', 12.75, 3.75, 3.75, 3.75),
      R('terraza', 0, 7.5, 16.5, 1.5, NF('Terraza', { pergola: true })),
    ]],
  },
  // 22 · «Bloque y encaje»: la modularidad del juguete de construcción (piezas que encajan por un módulo común)
  {
    id: 'cul-bloque-encaje', coleccion: 'culturas', nombre: 'Bloque y encaje', familia: 'myway', perfiles: ['familia', 'pareja'], acceso: 'N',
    desc: 'Dos bloques que se cruzan como piezas de un juguete de construcción que encajan sobre un módulo común (aquí el de 1,50 m). El bloque bajo va de este a oeste, con cocina, comedor, salón, entrada y aseo. El alto va de norte a sur, vuela 1,50 m sobre la entrada y sobre el jardín y guarda dos dormitorios, un baño y los armarios. Sobre el bloque bajo queda una terraza. Paneles lacados de color primario.',
    acabados: { fachada: 'lacado', carpinteria: 'oscura' }, jardin: 'cesped', cubierta: { tipo: 'plana', material: 'grava', color: 'clara' },
    cultura: { origen: 'Juguetes de construcción modulares (bloques de Friedrich Fröbel; ladrillo de encaje de Ole Kirk y Godtfred Kirk Christiansen, Dinamarca)', epoca: '1840 (Fröbel) · 1958 (ladrillo de encaje)', claves: ['módulo común', 'apilar y cruzar', 'voladizo por encaje', 'colores primarios', 'crecer por piezas'], fuentes: ['https://en.wikipedia.org/wiki/Froebel_gifts', 'https://es.wikipedia.org/wiki/Ole_Kirk_Christiansen', 'https://en.wikipedia.org/wiki/Modular_design'] },
    plantas: [[
      R('cocina', 0, 1.5, 3, 3), R('recibidor', 3, 1.5, 3, 1.5, 'Entrada bajo el voladizo'), R('aseo', 6, 1.5, 3, 1.5), R('escalera', 9, 1.5, 1.5, 6),
      R('comedor', 0, 4.5, 3, 3), R('salon', 3, 3, 6, 4.5),
    ], [
      R('terraza', 0, 1.5, 3, 6, 'Terraza sobre el bloque'), R('dormitorio', 3, 0, 4.5, 3.75), R('vestidor', 7.5, 0, 1.5, 1.5, 'Armario'),
      R('pasillo', 7.5, 1.5, 1.5, 6, 'Distribuidor'), R('escalera', 9, 1.5, 1.5, 6), R('bano', 3, 3.75, 4.5, 1.5),
      R('dormitorio_principal', 3, 5.25, 4.5, 3.75), R('vestidor', 7.5, 7.5, 1.5, 1.5, 'Vestidor'),
    ]],
  },
];
