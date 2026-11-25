// Catálogo de tipos de estancia, componentes interiores (cápsula interior/modulado-41@1.0.0),
// tabiques PLIEGA (cápsula tabiques/pliega@1.0.0) y complementos de fase 2 (PLIEGA funciones, mesa MUTA).

// grupo: dia | noche | humedo | circ | servicio | exterior
export const TIPOS = {
  salon:        { n: 'Salón', grupo: 'dia', color: '#E9DCC3', minA: 11.25, minL: 3.0, luz: true },
  comedor:      { n: 'Comedor', grupo: 'dia', color: '#EADFCB', minA: 6.75, minL: 2.25, luz: true },
  cocina:       { n: 'Cocina', grupo: 'dia', color: '#E3D2B5', minA: 3.375, minL: 1.5, luz: true, humedo: true },
  dormitorio_principal: { n: 'Dormitorio principal', grupo: 'noche', color: '#CFDCD2', minA: 11.25, minL: 3.0, luz: true },
  dormitorio:   { n: 'Dormitorio', grupo: 'noche', color: '#D7E2D9', minA: 8.4375, minL: 2.25, luz: true },
  despacho:     { n: 'Despacho', grupo: 'noche', color: '#D5DDE3', minA: 5.0, minL: 2.25, luz: true },
  vestidor:     { n: 'Vestidor', grupo: 'noche', color: '#DDE3DA', minA: 2.25, minL: 1.5 },
  bano:         { n: 'Baño', grupo: 'humedo', color: '#C9DDE6', minA: 3.375, minL: 1.5, humedo: true },
  aseo:         { n: 'Aseo', grupo: 'humedo', color: '#D2E3EA', minA: 2.25, minL: 1.5, humedo: true },
  lavadero:     { n: 'Lavadero', grupo: 'servicio', color: '#D9E0E3', minA: 2.25, minL: 1.5, humedo: true },
  despensa:     { n: 'Despensa', grupo: 'servicio', color: '#E2DDD2', minA: 1.125, minL: 0.75 },
  instalaciones:{ n: 'Instalaciones', grupo: 'servicio', color: '#DAD9D4', minA: 1.125, minL: 0.75 },
  trastero:     { n: 'Trastero', grupo: 'servicio', color: '#DEDBD3', minA: 2.25, minL: 1.5 },
  garaje:       { n: 'Garaje', grupo: 'servicio', color: '#D4D3CE', minA: 15.75, minL: 3.0 },
  // v.1.6 · piezas típicas de sótano (también valen sobre rasante): no piden luz natural
  bodega:       { n: 'Bodega', grupo: 'servicio', color: '#D8CDBF', minA: 2.25, minL: 1.5 },
  gimnasio:     { n: 'Gimnasio · sala', grupo: 'servicio', color: '#D9D6E0', minA: 6.75, minL: 2.25 },
  recibidor:    { n: 'Recibidor', grupo: 'circ', color: '#EFE9DC', minA: 2.25, minL: 1.5 },
  pasillo:      { n: 'Pasillo', grupo: 'circ', color: '#F0EBDF', minA: 1.125, minL: 0.75 },
  distribuidor: { n: 'Distribuidor', grupo: 'circ', color: '#EFEADF', minA: 2.25, minL: 1.5 },
  escalera:     { n: 'Escalera', grupo: 'circ', color: '#E6E0D2', minA: 6.75, minL: 1.5 },
  // v.1.5 · hueco de ascensor (edificios): ocupa la misma posición en todas las plantas que sirve; mínimo 1,50 × 1,50,
  // recomendado 1,50 × 2,25 (cabina accesible 1,10 × 1,40). Siempre cerrado con tabique; puerta de cabina corredera.
  ascensor:     { n: 'Ascensor', grupo: 'circ', color: '#CFCBC0', minA: 2.25, minL: 1.5, nucleo: true },
  porche:       { n: 'Porche', grupo: 'exterior', color: '#E4E6D4', ext: true, cubierto: true, minA: 2.25, minL: 1.5 },
  terraza:      { n: 'Terraza', grupo: 'exterior', color: '#E9EBDD', ext: true, minA: 2.25, minL: 1.5 },
  patio:        { n: 'Patio', grupo: 'exterior', color: '#EEF0E6', ext: true, vacio: true, minA: 2.25, minL: 1.5 },
  doble_altura: { n: 'Doble altura', grupo: 'circ', color: '#F4F1E8', vacio: true, minA: 2.25, minL: 1.5 },
  piscina:      { n: 'Piscina', grupo: 'exterior', color: '#BFE0E8', ext: true, agua: true, minA: 8, minL: 2.25 },
  chillout:     { n: 'Chill out', grupo: 'exterior', color: '#E9E4D2', ext: true, minA: 6.75, minL: 2.25 },
  quincho:      { n: 'Quincho · barbacoa', grupo: 'exterior', color: '#E6DCCB', ext: true, cubierto: true, minA: 9, minL: 2.25 },
  fogonero:     { n: 'Fogonero', grupo: 'exterior', color: '#E8DCCF', ext: true, minA: 4.5, minL: 2.25 },
};
// Tipos que no son suelo (vacíos): no cuentan en superficies ni llevan forjado.
export const esVacio = (t) => !!(TIPOS[t] && TIPOS[t].vacio);

// ---------- Cubiertas (v.1) ----------
export const CUBIERTA_TIPOS = { plana: 'Plana', una: 'Una agua', dos: 'Dos aguas', tres: 'Tres aguas', cuatro: 'Cuatro aguas' };
export const CUBIERTA_MATERIALES = {
  grava:  { n: 'Grava · cubierta plana', pend: 0, colores: { gris: '#9a978e', clara: '#c9c5bb' } },
  teja:   { n: 'Teja cerámica', pend: 30, colores: { roja: '#a5482d', mixta: '#9a5a3a', arena: '#c9a27a', negra: '#2e2d2b' } },
  tegola: { n: 'Tégola americana', pend: 25, colores: { pizarra: '#3f4447', roja: '#7a3a2a', verde: '#3e5a44', marron: '#5a4434' } },
  chapa:  { n: 'Panel de chapa grecada', pend: 15, colores: { grafito: '#3a3d40', blanco: '#e8e8e4', rojo: '#8a3326', verde: '#3c5a48', arena: '#b9a988' } },
};
// ---------- Paisajismo del jardín (v.1) ----------
export const JARDINES = {
  sin: { n: 'Sin paisajismo', en: '' },
  mediterraneo: { n: 'Mediterráneo seco', en: 'a dry Mediterranean garden: olive trees, lavender, rosemary, gravel and dry-stone edges' },
  praderia: { n: 'Pradera de gramíneas', en: 'a naturalistic meadow garden of ornamental grasses and perennials' },
  cesped: { n: 'Césped y sombra', en: 'a calm lawn garden with shade trees and a few shrubs' },
  huerto: { n: 'Huerto y frutales', en: 'a productive garden: raised vegetable beds and fruit trees' },
  zen: { n: 'Zen · grava y arces', en: 'a Japanese-inspired garden: raked gravel, stepping stones, maples and moss' },
  bosque: { n: 'Bosque nativo', en: 'a native woodland garden: holm oaks, pines and wild understorey' },
};
// ---------- Celosías ----------
export const CELOSIA_MATERIALES = { madera: { n: 'Lamas de madera', color: '#a67c52' }, aluminio: { n: 'Lamas de aluminio', color: '#8d8f8c' }, hormigon: { n: 'Celosía de hormigón', color: '#cfcbc2' } };
export const esExt = (t) => !!(TIPOS[t] && TIPOS[t].ext);
export const esInt = (t) => !!TIPOS[t] && !TIPOS[t].ext;
export const grupo = (t) => (TIPOS[t] ? TIPOS[t].grupo : 'servicio');
export const esDorm = (t) => t === 'dormitorio' || t === 'dormitorio_principal';
export const esBano = (t) => t === 'bano' || t === 'aseo';
export const HABITABLES = ['salon', 'comedor', 'cocina', 'dormitorio', 'dormitorio_principal', 'despacho'];

// ¿Dos estancias contiguas se comunican sin tabique?
export function abierto(a, b) {
  if (!a || !b) return false;
  if (a.cerrada || b.cerrada) return false;
  if (a.tipo === 'ascensor' || b.tipo === 'ascensor') return false; // el hueco del ascensor siempre va cerrado
  if ((a.vivienda || '') !== (b.vivienda || '')) return false;     // v.1.5: entre viviendas, o vivienda y zona común, siempre tabique
  const ga = grupo(a.tipo), gb = grupo(b.tipo);
  if (ga === 'dia' && gb === 'dia') return true;
  if (ga === 'circ' && gb === 'circ') return true;
  const par = (x, y) => (a.tipo === x && b.tipo === y) || (a.tipo === y && b.tipo === x);
  if (par('recibidor', 'salon') || par('recibidor', 'comedor')) return true;
  if (par('escalera', 'salon') || par('distribuidor', 'salon') || par('pasillo', 'salon') || par('pasillo', 'comedor')) return true;
  return false;
}

// 41 componentes estándar de interior — fuente: capsules/interior/modulado-41@1.0.0 (documentado)
// [k, tipo, nombre, L, A, mobiliario]
const C = [
  ['do-min', 'dormitorio', 'Dormitorio mínimo', 3.75, 2.25, 'Cama 110 + mesilla + armario 140'],
  ['do-minp', 'dormitorio', 'Dormitorio mínimo con pasillo', 4.5, 2.25, 'Cama 110 + mesilla + armario 140 + pasillo'],
  ['do-mindp', 'dormitorio', 'Dormitorio mínimo doble con pasillo', 4.5, 4.5, '2 camas 110 + 2 armarios 140 + pasillo'],
  ['do-base', 'dormitorio', 'Base de dormitorio doble', 3, 3, 'Cama queen size'],
  ['do-arm', 'vestidor', 'Base de armario', 3, 0.75, 'Armario empotrado o visto 215'],
  ['do-dmin', 'dormitorio', 'Dormitorio doble mínimo', 3.75, 3, 'Cama queen + armario 215'],
  ['do-dminp', 'dormitorio_principal', 'Dormitorio doble mínimo con pasillo', 4.5, 3, 'Cama queen + armario 215 + pasillo'],
  ['do-fondo', 'dormitorio_principal', 'Dormitorio de fondo en esquina', 4.5, 3, 'Cama queen + armario 215 + patinillo'],
  ['do-vest', 'vestidor', 'Extra · vestidor', 1.5, 3, 'Vestidor con armario 215'],
  ['do-vesti', 'vestidor', 'Extra · vestidor con isla', 2.25, 3, 'Vestidor con armario 215 + isla 150'],
  ['do-fv', 'dormitorio_principal', 'Dormitorio de fondo con vestidor', 6, 3, 'Cama king + armario + vestidor'],
  ['do-fvi', 'dormitorio_principal', 'Dormitorio de fondo con vestidor e isla', 7.5, 3, 'Cama king + armario + vestidor con isla'],
  ['ba-aseo', 'aseo', 'Aseo mínimo', 1.5, 1.5, 'Lavabo + inodoro'],
  ['ba-aspas', 'aseo', 'Aseo con pasillo', 3, 1.5, 'Lavabo + inodoro + pasillo'],
  ['ba-min', 'bano', 'Baño mínimo', 2.25, 1.5, 'Lavabo + inodoro + ducha'],
  ['ba-mas', 'bano', 'Baño mínimo + aseo mínimo', 4.5, 1.5, 'Baño con ducha + aseo'],
  ['ba-bas', 'bano', 'Baño basic', 3, 1.5, 'Lavabo + inodoro + ducha'],
  ['ba-comp', 'bano', 'Baño basic completo', 3, 1.5, 'Lavabo + inodoro + bidé + ducha'],
  ['ba-ind', 'bano', 'Baño con inodoro independiente', 3.75, 1.5, 'Lavabo doble + ducha + inodoro independiente'],
  ['ba-pas', 'bano', 'Baño basic con pasillo', 4.5, 1.5, 'Lavabo + inodoro + ducha + pasillo'],
  ['ba-nuc', 'bano', 'Núcleo de baños', 4.5, 3, '2 baños completos + pasillo o almacenaje'],
  ['ba-ban', 'bano', 'Baño con bañera basic', 3, 2.25, 'Lavabo doble + inodoro + bidé + bañera'],
  ['co-alm', 'cocina', 'Cocina abierta con almacenaje', 3, 1.5, 'Hasta 5 módulos de 60 cm'],
  ['co-ab', 'cocina', 'Cocina abierta', 3, 1.5, '3 módulos de 60 + fregadero + fuegos'],
  ['co-enf', 'cocina', 'Cocina enfrentada mínima', 3, 2.25, '8 módulos de 60 + fregadero + fuegos'],
  ['co-isla', 'cocina', 'Isla abierta', 3, 3.75, '8 módulos + isla + circulación 1,15 m'],
  ['co-banco', 'cocina', 'Isla banco de trabajo', 3, 3, '8 módulos + isla + circulación 0,90 m'],
  ['co-com', 'despensa', 'Módulo comodín', 1.5, 1.5, 'Comodín'],
  ['co-com2', 'lavadero', 'Módulo comodín doble', 3, 1.5, 'Comodín doble'],
  ['sc-min', 'salon', 'Salón comedor mínimo', 3, 3.75, 'Sofá 2-3 plazas + mesa 2 sillas + TV'],
  ['sc-bas', 'salon', 'Salón comedor basic', 3, 4.5, 'Sofá + mesa de centro + sillón + mesa 4 sillas + TV'],
  ['sc-a4', 'salon', 'Salón comedor amplio · 4 personas', 6, 3, 'Sofás + mesa de centro + mesa 4 sillas + TV'],
  ['sc-a4p', 'salon', 'Salón comedor amplio plus · 4 personas', 6, 3.75, 'Sofás + mesa 6 sillas + TV + amplitud'],
  ['sc-a6', 'salon', 'Salón comedor amplio · 6 personas', 7.5, 4.5, 'Sofás 4 plazas + mesa 8 sillas (7 × 4,5 en origen, llevado a trama)'],
  ['cm-p100', 'pasillo', 'Tramo de pasillo', 3, 0.75, 'Pasillo (1,00 en origen; 0,75 en trama, mejor 1,50)'],
  ['cm-p150', 'pasillo', 'Tramo de pasillo 1,50', 3, 1.5, 'Pasillo de comunicaciones'],
  ['cm-p225', 'distribuidor', 'Tramo de pasillo 2,25', 3, 2.25, 'Distribuidor'],
  ['cm-p300', 'distribuidor', 'Tramo de pasillo 3,00', 3, 3, 'Distribuidor amplio'],
  ['cm-e2', 'escalera', 'Escalera · doble tramo', 3, 3, '17 escalones, huella 30, tabica 17,65'],
  ['cm-er', 'escalera', 'Escalera · tramo recto', 6, 1.5, '17 escalones para 3,00 m de planta (6 × 3 con pasillo en origen)'],
  ['cm-ep', 'escalera', 'Escalera pública', 6, 3, '18 escalones + pasillo 6 × 1'],
];
export const COMPONENTES = C.map(([k, tipo, n, L, A, mob]) => ({ k, tipo, n, L, A, mob, m2: L * A }));

// Tabiques PLIEGA — fuente: capsules/tabiques/pliega@1.0.0 (documentado; acústica «a ensayar»)
export const PLIEGA_TABIQUES = {
  T110: { n: 'Tabique 110', e: 0.11, rw: 44, ei: 30, kg: 26, uso: 'División ligera entre estancias' },
  A160: { n: 'Acústico 160', e: 0.16, rw: 52, ei: 60, kg: 38, uso: 'Dormitorios, entre usos, salas' },
  C200: { n: 'Cabecero 200', e: 0.20, rw: 48, ei: 60, kg: 34, uso: 'Cabecero de cama con luz, baldas y tomas' },
  T300: { n: 'Técnico 300', e: 0.30, rw: 50, ei: 60, kg: 45, uso: 'Muro húmedo cocina ↔ baño, montantes' },
  R600: { n: 'Armario 600', e: 0.60, rw: 46, ei: 30, kg: 60, uso: 'Armario o despensa entre estancias' },
};

// Complementos fase 2. Los precios son «concepto» (orientativos, pendientes de validar con el fabricante).
export const COMPLEMENTOS = [
  { k: 'pl-cama', fam: 'PLIEGA', n: 'Cama abatible en tabique', desc: 'Cartucho «Habitar» de 1,50 o 2,25 m. Convierte un despacho en dormitorio de invitados.', tipos: ['despacho', 'dormitorio', 'salon'], ancho: [1.5, 2.25], img: 'pliega-vivienda.webp' },
  { k: 'pl-escritorio', fam: 'PLIEGA', n: 'Escritorio abatible', desc: 'Cartucho «Trabajar»: tablero 1,10 × 0,62 a 0,74 m, con tomas y luz.', tipos: ['dormitorio', 'dormitorio_principal', 'salon', 'despacho', 'pasillo', 'distribuidor'], ancho: [1.5, 2.25], img: 'pliega-vivienda.webp' },
  { k: 'pl-armario', fam: 'PLIEGA', n: 'Armario pasante R600', desc: 'Tabique-armario de 0,60 m entre dos estancias. Sustituye al armario de obra.', tipos: ['dormitorio', 'dormitorio_principal', 'recibidor', 'pasillo', 'distribuidor'], ancho: [0.75, 1.5, 2.25], img: 'pliega-piezas.jpg' },
  { k: 'pl-cabecero', fam: 'PLIEGA', n: 'Cabecero C200', desc: 'Tabique cabecero con luz, baldas y tomas integradas.', tipos: ['dormitorio', 'dormitorio_principal'], ancho: [2.25], img: 'pliega-pasillo.jpg' },
  { k: 'pl-humedo', fam: 'PLIEGA', n: 'Muro húmedo T300', desc: 'Tabique técnico registrable entre cocina y baño: montantes y desagües accesibles.', tipos: ['bano', 'aseo', 'cocina', 'lavadero'], ancho: [1.5, 2.25], img: 'pliega-instalaciones.jpg' },
  { k: 'pl-corredera', fam: 'PLIEGA', n: 'Corredera integrada', desc: 'Puerta corredera alojada en el tabique. Libera el barrido de la hoja.', tipos: ['bano', 'aseo', 'vestidor', 'cocina', 'despacho', 'lavadero'], ancho: [0.75, 1.5], img: 'pliega-combinacion.jpg' },
  { k: 'pl-pdlc', fam: 'PLIEGA', n: 'Vidrio PDLC', desc: 'Paño de vidrio de opacidad conmutable entre estancias.', tipos: ['despacho', 'bano', 'salon', 'cocina'], ancho: [0.75, 1.5], img: 'pliega-combinacion.jpg' },
  { k: 'mu-mesa', fam: 'MUTA', n: 'Mesa MUTA Origen', desc: 'Mesa modular de teselas de 0,60 m: 1,8 / 2,4 / 3,0 × 1,0 m. Pieles intercambiables.', tipos: ['salon', 'comedor'], largo: [1.8, 2.4, 3.0], fondo: 1.0, img: 'muta-r013.webp' },
  { k: 'mu-isla', fam: 'MUTA', n: 'Isla MUTA', desc: 'Isla de cocina 0,90 de alto y 1,20 de fondo con inducción y fregadero en tesela.', tipos: ['cocina', 'salon'], largo: [1.8, 2.4, 3.0], fondo: 1.2, img: 'muta-r009.webp' },
  { k: 'mu-mural', fam: 'MUTA', n: 'Escritorio MUTA Mural', desc: 'Escritorio volado a pared de 0,60 de fondo.', tipos: ['despacho', 'dormitorio', 'dormitorio_principal'], largo: [1.2, 1.8, 2.4], fondo: 0.6, img: 'muta-r194.webp' },
  { k: 'ex-piscina', fam: 'Exterior', n: 'Piscina', desc: 'Lámina de agua con coronación de piedra. Se dibuja como estancia «Piscina» en el plano.', tipos: ['piscina'], img: 'pliega-combinacion.jpg', estancia: 'piscina' },
  { k: 'ex-quincho', fam: 'Exterior', n: 'Quincho · barbacoa cubierta', desc: 'Pabellón cubierto con barbacoa, encimera y mesa larga.', tipos: ['quincho'], img: 'pliega-combinacion.jpg', estancia: 'quincho' },
  { k: 'ex-chillout', fam: 'Exterior', n: 'Chill out', desc: 'Zona de estar exterior con sofás bajos, mesa y sombra.', tipos: ['chillout'], img: 'pliega-combinacion.jpg', estancia: 'chillout' },
  { k: 'ex-fogonero', fam: 'Exterior', n: 'Fogonero', desc: 'Fuego exterior con asientos en círculo.', tipos: ['fogonero'], img: 'pliega-combinacion.jpg', estancia: 'fogonero' },
  { k: 'ex-celosia', fam: 'Exterior', n: 'Celosía de lamas', desc: 'Filtro de lamas para terrazas, patios y dobles alturas (se configura en la estancia).', tipos: ['patio', 'terraza', 'porche', 'doble_altura'], img: 'pliega-combinacion.jpg' },
  { k: 'ex-pergola', fam: 'Exterior', n: 'Pérgola', desc: 'Pérgola de lamas sobre terraza o porche (se configura en la estancia).', tipos: ['terraza', 'porche'], img: 'pliega-combinacion.jpg' },
  { k: 'mu-exterior', fam: 'MUTA', n: 'Mesa MUTA Exterior', desc: 'Versión para porche o terraza, solo con pieles aptas para exterior.', tipos: ['porche', 'terraza'], largo: [1.8, 2.4, 3.0], fondo: 1.0, img: 'muta-r062.webp' },
];

export const PERFILES_CLIENTE = {
  pareja:   { n: 'Pareja joven', desc: 'Primera vivienda compacta que puede crecer', dorm: [1, 2], m2: [55, 95] },
  familia:  { n: 'Familia', desc: '3-4 dormitorios, zonas de día amplias', dorm: [3, 4], m2: [110, 170] },
  familia_numerosa: { n: 'Familia numerosa', desc: '4-5 dormitorios y doble zona de estar', dorm: [4, 5], m2: [160, 240] },
  senior:   { n: 'Sénior · una planta', desc: 'Todo en planta baja, accesible', dorm: [2, 3], m2: [80, 130] },
  teletrabajo: { n: 'Teletrabajo', desc: 'Despacho independiente y luz', dorm: [2, 3], m2: [90, 140] },
  inversor: { n: 'Inversor · alquiler', desc: 'Máximo rendimiento por m²', dorm: [1, 2], m2: [35, 70] },
  solo:     { n: 'Una persona', desc: 'Estudio o un dormitorio', dorm: [0, 1], m2: [25, 55] },
  multigeneracional: { n: 'Multigeneracional', desc: 'Dos unidades conectadas bajo un techo', dorm: [3, 5], m2: [140, 220] },
};
