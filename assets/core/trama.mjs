// Trama del generador v.1: 37,5 × 37,5 cm (mitad de la trama canónica CUEVA de 0,75 m).
// Cápsula geometria/trama-modulo@1.0.0: la trama estructural es 0,75 m (módulo 1,50 m, planta 3,00 m) y la
// subrejilla de 0,375 m es de dibujo. El editor permite 0,375 m para ajustar espacios; lo que no cae en 0,75 m
// se señala en la validación (pieza especial) para que una persona lo decida.
export const T = 0.375;         // trama de edición (m)
export const TE = 0.75;         // trama estructural CUEVA (m)
export const M = 1.5;           // módulo (m)
export const H_PLANTA = 3.0;    // altura de planta (m)
export const VUELO_MAX = 1.5;   // vuelo máximo sin apoyo (m) — sistema.voladizoMax = 1500 mm
export const E_FACHADA = 0.30;  // espesor nominal de fachada terminada (m) — concepto, para superficies útiles
export const E_TABIQUE = 0.10;  // tabique tipo T110 PLIEGA ≈ 0,11 (m)
export const E_FORJADO = 0.26;  // canto de forjado (m) — H_P1 de las propuestas Natura

export const r3 = (v) => Math.round(v * 1000) / 1000;
export const snap = (v, paso = T) => r3(Math.round(v / paso) * paso);
export const onGrid = (v, paso = T) => Math.abs(v / paso - Math.round(v / paso)) < 1e-6;
export const ci = (v) => Math.round(v / T);       // metros → índice de celda
export const cm = (i) => r3(i * T);               // índice de celda → metros
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const fmt = (v, d = 2) => Number(v).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
export const uid = (p = 'e') => p + Math.random().toString(36).slice(2, 8);
export const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'sin-nombre';
