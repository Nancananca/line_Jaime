// Referencias de autor · Emilio Sánchez-Horneros (TASH · Taller de Arquitectura Sánchez-Horneros; «TASH and Partners»).
// Mismo formato que core/referencias.mjs. INTERPRETACIONES ESQUEMÁTICAS PROPIAS: solo se toman las medidas globales
// publicadas y la organización espacial descrita por las fuentes; no se copian planos, imágenes ni textos.
//
// Quién es (documentado): Emilio Sánchez-Horneros Viver-Sánchez (Toledo, 1978), arquitecto por la ETSAM-UPM (2004),
// colaborador de Álvaro Siza (2000-2003), socio fundador en 2005 de TASH (Taller de Arquitectura Sánchez-Horneros
// S.L.P., Toledo · Madrid · Zaragoza) y su director/CEO; Juan Manuel Castillo Malo figura como director general de
// «TASH and Partners». Obra sobre todo sanitaria y de vivienda colectiva; pocas viviendas unifamiliares publicadas y
// casi ninguna con cotas. Por eso:
//  · Casa Elena: organización DESCRITA por las fuentes (tres alas día/noche/servicio, vuelo del dormitorio principal,
//    lado mural y lado acristalado con visera); sin superficie publicada → dimensiones estimadas, confianza baja.
//  · Adosada de Parque Olloki: superficie construida publicada por la comercializadora; la atribución de la fase II a
//    TASH se deduce de la lista de obras del estudio → confianza baja.
//  · 92 viviendas R6: datos publicados por la ingeniería de estructuras (plantas, intereje del reticular de 72 cm);
//    se modela UN PORTAL del bloque (soporte de edificios v.1.5) → confianza baja en la distribución.
//  · «Roca del Búho» y «Cigarral Daphnie»: solo se conoce el nombre y una fotografía publicada → modelos «EN EL
//    LENGUAJE DE» TASH, marcados así en el nombre y en las notas, confianza baja.
// Cuando una medida no está publicada se rotula «estimación propia (no publicada)»: compara el modelo con el programa
// supuesto, no con la obra.
import { prepararReferencias } from './referencias.mjs';

const R = (tipo, x, y, w, h, extra) => Object.assign({ tipo, x, y, w, h }, typeof extra === 'string' ? { nombre: extra, nombreFijo: true } : extra || {});
const Md = (n, orig, trama, u = 'm') => ({ n, orig, trama, u });
const NF = (nombre, extra) => Object.assign({ nombre, nombreFijo: true }, extra || {});
// edificio (v.1.5): estancia de una vivienda
const V = (tipo, x, y, w, h, viv, extra) => Object.assign({ tipo, x, y, w, h, vivienda: viv }, extra || {});

const ARQ = 'Emilio Sánchez-Horneros · TASH (Tash & Partners)';
const F = {
  cic: 'https://www.cicconstruccion.com/file/downloadname/TASH.pdf',
  web: 'https://www.tash.es',
  metalocus: 'https://www.metalocus.es/es/autor/sanchez-horneros-viver-sanchez',
  montesion: 'https://qubeingenieria.com/fichapdf/33ef9996d8cf8df8ec2aa469f6154db8/594',
  elena: 'https://www.trendencias.com/lujo/casa-elena-mencion-de-honor-por-porcelanosa',
  olloki: 'https://en.viviendasnuevas.com/developments/parque-olloki-fase-ii_olloqui/tipology/6543',
  r6: 'https://qubeingenieria.com/fichapdf/4cdeb288377a94f806532b2f3622f12a/586',
  ecobarrio: 'https://www.dezeen.com/2011/11/16/protected-collective-houses-in-toledo-by-tash/',
};

// núcleo común del portal de la R6 (x 6–10,50): escalera en U 3,00 × 4,50, instalaciones, ascensor 1,50 × 2,25
const nucleo = () => [R('escalera', 6, 0, 3, 4.5), R('instalaciones', 9, 0, 1.5, 2.25), R('ascensor', 9, 2.25, 1.5, 2.25)];
// vivienda de dos dormitorios a dos fachadas (noche al norte, día al sur); A al oeste del núcleo, B al este
const vivA = (v) => [V('dormitorio_principal', 0, 0, 3, 4.5, v), V('dormitorio', 3, 0, 3, 4.5, v), V('pasillo', 0, 4.5, 6, 1.5, v),
  V('bano', 0, 6, 2.25, 4.5, v), V('salon', 2.25, 6, 3.75, 4.5, v), V('cocina', 6, 6, 2.25, 4.5, v)];
const vivB = (v) => [V('dormitorio', 10.5, 0, 3, 4.5, v), V('dormitorio_principal', 13.5, 0, 3, 4.5, v), V('pasillo', 10.5, 4.5, 6, 1.5, v),
  V('cocina', 8.25, 6, 2.25, 4.5, v), V('salon', 10.5, 6, 3.75, 4.5, v), V('bano', 14.25, 6, 2.25, 4.5, v)];

const DEF = [
  // ------------------------------------------------------------------ 1 · Casa Elena (Montesión, Toledo)
  {
    id: 'ref-tash-casa-elena', obra: 'Casa Elena · vivienda en la urbanización Montesión', arquitecto: ARQ, anio: 2010, lugar: 'Urbanización Montesión, Toledo',
    familia: 'line', perfiles: ['familia', 'familia_numerosa'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped', acceso: 'N',
    cubierta: { tipo: 'plana' },
    confianza: 'baja', fuentes: [F.montesion, F.elena, F.web, F.cic],
    desc: 'Casa en ladera que se extiende por el lugar en tres cuerpos con funciones claramente separadas: servicio, noche (dos plantas, con el dormitorio principal en vuelo y testero ciego) y día (una planta). Un lado mural guarda la intimidad frente al acceso; el otro se abre entero en vidrio a la terraza bajo una gran visera de hormigón visto, al césped y a la piscina.',
    notas: 'Organización documentada (tres alas día/noche/servicio, vuelo del dormitorio principal, lado mural y lado acristalado con visera de hormigón, piscina y césped delante, huerto al este respetando el arbolado). NINGUNA FUENTE PUBLICA LA SUPERFICIE: se dimensiona para un programa de cuatro dormitorios (estimación propia) y por eso la confianza es baja. El vuelo se fija en 1,50 (máximo del sistema) hacia el jardín; en el original resuelto con losas de distinto canto. El frente acristalado mira al sur del modelo (en el original, a la ladera noroeste): se puede girar. El muro de piedra y el revestimiento claro de lamas horizontales se resumen en el acabado mineral blanco.',
    medidas: [Md('Superficie (estimación propia: no publicada)', 270, 0, 'm2')],
    plantas: [[
      // servicio
      R('garaje', 0, 0, 5.25, 6), R('lavadero', 0, 6, 3, 3), R('instalaciones', 3, 6, 2.25, 3),
      // noche (planta baja)
      R('recibidor', 5.25, 0, 3, 4.5, NF('Vestíbulo', { entrada: true })), R('escalera', 8.25, 0, 1.5, 4.5), R('dormitorio', 9.75, 0, 3, 4.5, 'Invitados'),
      R('pasillo', 5.25, 4.5, 7.5, 1.5, 'Galería'), R('bano', 5.25, 6, 2.25, 3), R('despacho', 7.5, 6, 5.25, 3, 'Estudio'),
      // día
      R('cocina', 12.75, 0, 4.5, 3.75), R('comedor', 17.25, 0, 4.5, 3.75),
      R('salon', 12.75, 3.75, 9, 5.25, 'Estar acristalado'),
      R('porche', 7.5, 9, 14.25, 2.25, 'Terraza bajo la visera de hormigón'),
      R('piscina', 12.75, 11.25, 10.5, 3),
    ], [
      R('dormitorio', 5.25, 0, 3, 4.5), R('escalera', 8.25, 0, 1.5, 4.5), R('dormitorio', 9.75, 0, 3, 4.5),
      R('pasillo', 5.25, 4.5, 7.5, 1.5),
      R('bano', 5.25, 6, 2.25, 2.25), R('vestidor', 5.25, 8.25, 2.25, 2.25),
      R('dormitorio_principal', 7.5, 6, 3.75, 4.5, 'Dormitorio principal en vuelo'), R('bano', 11.25, 6, 1.5, 4.5, { suite: true }),
    ]],
  },
  // ------------------------------------------------------------------ 2 · Adosada en Parque Olloki (Olloqui, Navarra)
  {
    id: 'ref-tash-olloki', obra: 'Vivienda adosada en Parque Olloki (fase II)', arquitecto: ARQ, anio: 2022, lugar: 'Parque Olloki, Olloqui (Navarra)',
    familia: 'natura', perfiles: ['familia_numerosa', 'familia'], medianeras: ['E', 'O'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'cesped', acceso: 'N',
    cubierta: { tipo: 'plana' },
    confianza: 'baja', fuentes: [F.olloki, F.web, F.cic],
    desc: 'Casa adosada de dos plantas con cuatro dormitorios, garaje, trastero y terraza al jardín: en planta baja, garaje, entrada y escalera a la calle, una franja central de servicio (aseo, trastero, lavadero) y la cocina-comedor y el estar abiertos al jardín; arriba, dos dormitorios a cada fachada.',
    notas: 'Datos publicados de la fase II (comercializadora): 12 viviendas adosadas, 2 plantas, 4 dormitorios, garaje, trastero, terraza, 254–298 m² construidos. TASH incluye «viviendas unifamiliares en Parque Olloki» en su lista de obras, pero la ficha de la fase II no nombra al arquitecto: la atribución es deducida (confianza baja). Frente (9,00) y fondo (13,50) interpretados; la distribución es interpretada a partir del programa. Se compara con el tipo menor (254 m² construidos; la medida compara la suma de estancias a ejes, 243 m²; la superficie construida que calcula el generador, con muros, es de unos 256 m²).',
    medidas: [Md('Superficie construida (tipo menor publicado)', 254, 0, 'm2')],
    plantas: [[
      R('garaje', 0, 0, 3.75, 5.25), R('recibidor', 3.75, 0, 3.75, 2.25, { entrada: true }), R('escalera', 7.5, 0, 1.5, 4.5),
      R('distribuidor', 3.75, 2.25, 3.75, 3), R('despensa', 7.5, 4.5, 1.5, 0.75),
      R('trastero', 0, 5.25, 3.75, 3), R('aseo', 3.75, 5.25, 1.5, 3), R('pasillo', 5.25, 5.25, 1.5, 3), R('lavadero', 6.75, 5.25, 2.25, 3),
      R('cocina', 0, 8.25, 3.75, 5.25, 'Cocina · comedor'), R('salon', 3.75, 8.25, 5.25, 5.25),
      R('terraza', 0, 13.5, 9, 3, 'Terraza al jardín'),
    ], [
      R('dormitorio', 0, 0, 3.75, 4.5), R('dormitorio', 3.75, 0, 3.75, 4.5), R('escalera', 7.5, 0, 1.5, 4.5),
      R('pasillo', 0, 4.5, 9, 1.5),
      R('bano', 0, 6, 3, 2.25), R('pasillo', 3, 6, 1.5, 2.25, 'Paso'), R('vestidor', 4.5, 6, 1.5, 2.25), R('bano', 6, 6, 3, 2.25, { suite: true }),
      R('dormitorio', 0, 8.25, 3.75, 5.25), R('dormitorio_principal', 3.75, 8.25, 5.25, 5.25),
    ]],
  },
  // ------------------------------------------------------------------ 3 · 92 viviendas, parcela R6 (Toledo) · un portal
  {
    id: 'ref-tash-r6', obra: '92 viviendas en la parcela R6 de Santa María de Benquerencia · un portal', arquitecto: ARQ, anio: 2014, lugar: 'Polígono de Santa María de Benquerencia, Toledo',
    familia: 'basic', perfiles: ['pareja', 'inversor'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'sin', acceso: 'S',
    cubierta: { tipo: 'plana' },
    confianza: 'baja', fuentes: [F.r6, F.ecobarrio, F.cic],
    desc: 'EDIFICIO PLURIFAMILIAR. Tres bloques paralelos alineados a las calles y perpendiculares a la pendiente, con imagen rítmica y serena: un basamento comercial de material parecido pero de otro color y textura, y cinco plantas de viviendas encima. Aquí, un portal del bloque: núcleo de escalera y ascensor al norte, dos viviendas de dos dormitorios por planta, a dos fachadas (noche al norte, día al sur).',
    notas: 'Datos publicados (ingeniería de estructuras): 92 viviendas en tres bloques paralelos, dos sótanos (no se modelan), planta baja comercial y cinco niveles de viviendas (6 plantas: el máximo del sistema); forjados reticulares de 30 + 5 cm con INTEREJE DE 72 cm, que queda a 3 cm de la trama de 0,75: toda la planta se cuenta en interejes de 0,75. Se modela UN PORTAL (10 viviendas), no el bloque entero; la distribución de las viviendas, el frente (16,50) y el fondo (10,50) son interpretados. Los locales del basamento se modelan como piezas sin vivienda con acceso por el portal (en el original tienen entrada propia desde la calle).',
    medidas: [Md('Intereje del forjado reticular', 0.72, 0.75)],
    plantas: [
      [...nucleo(), R('recibidor', 6, 4.5, 4.5, 6, 'Portal'), R('despacho', 0, 0, 6, 10.5, 'Local comercial (basamento)'), R('despacho', 10.5, 0, 6, 10.5, 'Local comercial 2 (basamento)')],
      ...[1, 2, 3, 4, 5].map((pi) => [...nucleo(), R('distribuidor', 6, 4.5, 4.5, 1.5), ...vivA(pi + 'A'), ...vivB(pi + 'B')]),
    ],
  },
  // ------------------------------------------------------------------ 4 · en el lenguaje de «Roca del Búho» (El Escorial)
  {
    id: 'ref-tash-roca-buho', obra: 'Casa entre encinas, en el lenguaje de «Roca del Búho» (El Escorial)', arquitecto: ARQ, anio: 2022, lugar: 'El Escorial (Madrid)',
    familia: 'line', perfiles: ['pareja', 'familia', 'senior'], acabados: { fachada: 'mineral', carpinteria: 'oscura' }, jardin: 'bosque', acceso: 'N',
    cubierta: { tipo: 'plana', alero: 0.75 },
    confianza: 'baja', fuentes: [F.cic, F.web],
    desc: 'EN EL LENGUAJE DE TASH: un prisma blanco de una planta posado en el césped entre encinas, con un testero de piedra oscura, el frente largo acristalado de suelo a techo y una losa de cubierta que vuela como visera. El estar ocupa el extremo con las dos fachadas; los dormitorios se alinean al jardín detrás de una galería.',
    notas: 'MODELO «EN EL LENGUAJE DE»: de «Roca del Búho» solo se publica el nombre y una fotografía (prisma blanco de una planta, testero de piedra, frente acristalado, losa en vuelo, encinas). La distribución, la superficie y las medidas son una ESTIMACIÓN PROPIA (no publicadas): no es una reproducción de la obra. El testero de piedra se resume en el acabado; el vuelo de la losa, en un alero de 0,75 y un porche corrido.',
    medidas: [Md('Superficie (estimación propia: no publicada)', 160, 0, 'm2')],
    plantas: [[
      R('salon', 0, 0, 6, 7.5, 'Estar a dos fachadas'), R('cocina', 6, 0, 3, 3), R('comedor', 6, 3, 3, 4.5),
      R('recibidor', 9, 0, 3, 3, { entrada: true }), R('bano', 12, 0, 2.25, 3), R('lavadero', 14.25, 0, 2.25, 3), R('vestidor', 16.5, 0, 3.75, 3), R('despacho', 20.25, 0, 2.25, 3),
      R('pasillo', 9, 3, 13.5, 1.5, 'Galería'),
      R('dormitorio', 9, 4.5, 3.75, 3), R('dormitorio', 12.75, 4.5, 3.75, 3), R('dormitorio_principal', 16.5, 4.5, 3.75, 3), R('bano', 20.25, 4.5, 2.25, 3, { suite: true }),
      R('porche', 0, 7.5, 16.5, 1.5, 'Porche bajo la losa'),
    ]],
  },
  // ------------------------------------------------------------------ 5 · en el lenguaje del «Cigarral Daphnie» (Toledo)
  {
    id: 'ref-tash-cigarral', obra: 'Casa-cigarral, en el lenguaje del «Cigarral Daphnie» (Toledo)', arquitecto: ARQ, anio: 2022, lugar: 'Cigarrales de Toledo',
    familia: 'natura', perfiles: ['familia', 'multigeneracional'], acabados: { fachada: 'mineral', carpinteria: 'madera' }, jardin: 'mediterraneo', acceso: 'N',
    cubierta: { tipo: 'dos', material: 'teja', color: 'mixta', pendiente: 22, alero: 0.3 },
    confianza: 'baja', fuentes: [F.cic, F.web],
    desc: 'EN EL LENGUAJE DE TASH: volúmenes blancos de aristas vivas en un cigarral, con huecos pequeños y profundos de madera, una pieza de dos plantas para la noche y una de una planta para el día, cubiertas de teja, y una lámina de agua elevada que ordena un patio cerrado por tapias, con cipreses y olivos.',
    notas: 'MODELO «EN EL LENGUAJE DE»: del «Cigarral Daphnie» solo se publica el nombre y una fotografía (volúmenes enfoscados en blanco, una cubierta de teja, ventana de madera, lámina de agua, cipreses); TASH lista además «viviendas unifamiliares en Cigarrales de Vistahermosa». Distribución, superficie y medidas son una ESTIMACIÓN PROPIA (no publicadas). Las tapias del patio se representan con celosía de hormigón de 2,50 m (son muros); la lámina de agua, como piscina.',
    medidas: [Md('Superficie (estimación propia: no publicada)', 230, 0, 'm2')],
    plantas: [[
      R('recibidor', 0, 0, 3, 4.5, { entrada: true }), R('escalera', 3, 0, 1.5, 4.5), R('cocina', 4.5, 0, 3, 4.5),
      R('distribuidor', 0, 4.5, 7.5, 1.5),
      R('dormitorio_principal', 0, 6, 4.5, 4.5), R('bano', 4.5, 6, 3, 2.25, { suite: true }), R('vestidor', 4.5, 8.25, 3, 2.25),
      R('comedor', 7.5, 0, 3, 4.5), R('salon', 10.5, 0, 6, 7.5), R('aseo', 7.5, 4.5, 1.5, 3), R('despensa', 9, 4.5, 1.5, 3),
      R('piscina', 7.5, 7.5, 9, 2.25, 'Lámina de agua'),
      R('patio', 7.5, 9.75, 9, 5.25, NF('Patio de los cipreses', { celosia: { lados: ['S', 'E', 'O'], altura: 'simple', alto: 2.5, material: 'hormigon' } })),
    ], [
      R('dormitorio', 0, 0, 3, 4.5), R('escalera', 3, 0, 1.5, 4.5), R('despacho', 4.5, 0, 3, 4.5),
      R('distribuidor', 0, 4.5, 7.5, 1.5),
      R('dormitorio', 0, 6, 3.75, 4.5), R('bano', 3.75, 6, 1.5, 4.5), R('dormitorio', 5.25, 6, 2.25, 4.5),
    ]],
  },
];

export const REFERENCIAS_TASH = prepararReferencias(DEF);
