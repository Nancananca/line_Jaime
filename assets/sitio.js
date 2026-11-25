// Interacciones de la web de cliente (sin dependencias ni peticiones externas):
// entrada del hero, apariciones y contadores al hacer scroll, índice de capítulos y barra de progreso,
// plantas con lámina fija, comparadores, sol y orientación, visor de imágenes accesible y maqueta 3D
// (se carga solo al pedirla; necesita servirse por http, no abre desde file://).
// Todo el movimiento respeta prefers-reduced-motion.
const d = document, raiz = d.documentElement, raf = requestAnimationFrame;
const $ = (s, c = d) => c.querySelector(s), $$ = (s, c = d) => [...c.querySelectorAll(s)];
const mq = matchMedia('(prefers-reduced-motion: reduce)'); let calma = mq.matches; mq.addEventListener?.('change', (e) => (calma = e.matches));
const suave = () => (calma ? 'auto' : 'smooth');
const fmtN = (v, dec) => v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const dos = (n) => String(n).padStart(2, '0');

// ---------- entrada del hero ----------
const heroImg = $('.hero-media img'); let listo = false;
const arrancar = () => { if (!listo) { listo = true; d.body.classList.add('listo'); } };
if (heroImg && !heroImg.complete) { heroImg.addEventListener('load', arrancar, { once: true }); heroImg.addEventListener('error', arrancar, { once: true }); setTimeout(arrancar, 1800); } else raf(() => raf(arrancar));

// ---------- apariciones y contadores ----------
const contar = (el) => {
  const fin = Number(el.dataset.n), dec = Number(el.dataset.dec || 0), suf = el.dataset.suf || ''; if (!isFinite(fin)) return;
  if (calma) { el.textContent = fmtN(fin, dec) + suf; return; }
  const t0 = performance.now(), dur = 1400 + Math.min(800, fin * 3);
  const paso = (t) => { const k = Math.min(1, (t - t0) / dur), q = 1 - Math.pow(1 - k, 4); el.textContent = fmtN(fin * q, dec) + suf; if (k < 1) raf(paso); }; raf(paso);
};
if (!calma) $$('[data-n]').forEach((el) => (el.textContent = fmtN(0, Number(el.dataset.dec || 0)) + (el.dataset.suf || '')));
const pistas = new Set();
const vistos = new IntersectionObserver((es) => es.forEach((en) => {
  if (!en.isIntersecting) return; const el = en.target; el.classList.add('on'); vistos.unobserve(el);
  $$('[data-n]', el).forEach(contar); if (el.matches('[data-n]')) contar(el); if (el.matches('.comparar')) pistas.forEach((f) => f(el));
}), { threshold: 0, rootMargin: '0px 0px -12% 0px' });
$$('.rev, .sol-fig').forEach((el) => vistos.observe(el));

// ---------- barra: fondo, progreso, parallax (si no hay scroll-timeline) e índice ----------
const barra = $('.barra'), prog = $('.progreso i'), media = $('.hero-media');
const timeline = !!CSS.supports?.('animation-timeline: scroll()');
let tick = 0;
const alScroll = () => {
  tick = 0; const y = scrollY; barra?.classList.toggle('solida', y > innerHeight * 0.55);
  if (!timeline || calma) { const h = raiz.scrollHeight - innerHeight; if (prog) prog.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h).toFixed(4) : 0})`; }
  if (!timeline && !calma && media && y < innerHeight * 1.3) media.style.transform = `translate3d(0,${(y * 0.14).toFixed(1)}px,0)`;
};
addEventListener('scroll', () => { if (!tick) tick = raf(alScroll); }, { passive: true }); alScroll();
const enlaces = $$('[data-cap-link]'), capAct = $('.cap-actual');
const capObs = new IntersectionObserver((es) => es.forEach((en) => {
  if (!en.isIntersecting) return; const id = en.target.id; let txt = 'Índice';
  enlaces.forEach((a) => { const on = a.dataset.capLink === id; a.classList.toggle('activo', on); if (on) { a.setAttribute('aria-current', 'true'); txt = `${a.firstElementChild?.textContent || ''} ${a.lastChild?.textContent || ''}`.trim(); } else a.removeAttribute('aria-current'); });
  if (capAct) capAct.textContent = txt;
}), { rootMargin: '-45% 0px -54% 0px' });
$$('[data-cap], #inicio').forEach((s) => capObs.observe(s));
const ib = $('.indice-btn');
const menu = (ab) => { barra?.classList.toggle('abierta', ab); ib?.setAttribute('aria-expanded', String(ab)); };
ib?.addEventListener('click', () => menu(!barra.classList.contains('abierta')));
$$('.indice a').forEach((a) => a.addEventListener('click', () => menu(false)));

// ---------- visor de imágenes y planos ----------
const luz = $('#luz'), esc = luz && $('.luz-esc', luz);
let grupo = [], pos = 0, previo = null;
const contenido = (el) => {
  if (el.tagName === 'A') { const im = new Image(); im.decoding = 'async'; im.alt = el.dataset.titulo || ''; im.src = el.getAttribute('href'); return im; }
  const s = el.querySelector('svg'); if (!s) return null;
  const w = d.createElement('div'); w.className = 'luz-svg'; const c = s.cloneNode(true); c.removeAttribute('width'); c.removeAttribute('height');
  const vb = s.viewBox?.baseVal; if (vb?.width) w.style.setProperty('--ar', (vb.width / vb.height).toFixed(3)); w.append(c); return w;
};
const mostrar = (i) => {
  pos = (i + grupo.length) % grupo.length; const el = grupo[pos]; const n = contenido(el);
  esc.replaceChildren(...(n ? [n] : [])); $('.luz-n', luz).textContent = `${dos(pos + 1)} / ${dos(grupo.length)}`; $('.luz-t', luz).textContent = el.dataset.titulo || '';
  luz.classList.toggle('uno', grupo.length < 2);
};
const fondo = () => [...d.body.children].filter((x) => x !== luz && x.tagName !== 'SCRIPT');
const abrir = (el) => {
  if (!luz || !el) return; grupo = $$(`[data-grupo="${el.dataset.grupo}"]`); if (!grupo.length) grupo = [el];
  previo = d.activeElement; mostrar(Math.max(0, grupo.indexOf(el))); luz.hidden = false; fondo().forEach((x) => (x.inert = true)); d.body.style.overflow = 'hidden'; $('.luz-x', luz).focus();
};
const cerrar = () => { if (!luz || luz.hidden) return; luz.hidden = true; esc.replaceChildren(); fondo().forEach((x) => (x.inert = false)); d.body.style.overflow = ''; previo?.focus?.({ preventScroll: true }); };
d.addEventListener('click', (ev) => { const z = ev.target.closest?.('a.zoom, [data-zoom]'); if (z && !luz.contains(z)) { ev.preventDefault(); abrir(z); } });
if (luz) {
  $('.luz-x', luz).addEventListener('click', cerrar); $('.luz-ant', luz).addEventListener('click', () => mostrar(pos - 1)); $('.luz-sig', luz).addEventListener('click', () => mostrar(pos + 1));
  luz.addEventListener('click', (ev) => { if (ev.target === luz || ev.target === esc) cerrar(); });
  let x0 = null; luz.addEventListener('pointerdown', (ev) => { x0 = ev.pointerType === 'mouse' ? null : ev.clientX; });
  luz.addEventListener('pointerup', (ev) => { if (x0 == null) return; const dx = ev.clientX - x0; x0 = null; if (Math.abs(dx) > 50 && grupo.length > 1) mostrar(pos + (dx < 0 ? 1 : -1)); });
}
d.addEventListener('keydown', (ev) => {
  if (!luz || luz.hidden) {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches?.('[data-zoom][role=button]')) { ev.preventDefault(); abrir(ev.target); }
    if (ev.key === 'Escape') { menu(false); const m = $('.marco3d.pseudo-fs'); if (m) { m.classList.remove('pseudo-fs'); d.body.style.overflow = ''; } }
    return;
  }
  if (ev.key === 'Escape') cerrar();
  else if (ev.key === 'ArrowRight') mostrar(pos + 1);
  else if (ev.key === 'ArrowLeft') mostrar(pos - 1);
  else if (ev.key === 'Tab') { const bs = $$('button', luz).filter((b) => b.offsetParent !== null); const i = bs.indexOf(d.activeElement); ev.preventDefault(); bs[(i + (ev.shiftKey ? -1 : 1) + bs.length) % bs.length]?.focus(); }
});

// ---------- plantas: lámina fija, cambio de planta y estancias ----------
const rec = $('.recorrido');
if (rec) {
  const figs = $$('.plano-v', rec), pasos = $$('.paso', rec), tabs = $$('[data-ir]', rec); let act = 0, bloqueo = 0, marcadas = [];
  const marcar = (id) => {
    marcadas.forEach((x) => x.classList.remove('on')); marcadas = []; if (!id) return;
    const s = `[data-sala="${CSS.escape(id)}"]`; marcadas = [...$$(s, figs[act]), ...$$(s, pasos[act] || d.createElement('i'))]; marcadas.forEach((x) => x.classList.add('on'));
  };
  const activar = (i) => {
    if (!figs[i] || i === act) return; act = i; marcar(null);
    figs.forEach((f, k) => f.classList.toggle('activa', k === i)); pasos.forEach((p, k) => p.classList.toggle('activo', k === i)); tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
  };
  tabs.forEach((t) => t.addEventListener('click', () => { const i = Number(t.dataset.ir); activar(i); bloqueo = Date.now() + 1200; pasos[i]?.scrollIntoView({ behavior: suave(), block: 'start' }); }));
  $('[data-ampliar]', rec)?.addEventListener('click', () => abrir(figs[act]));
  if (pasos.length > 1) {
    const movil = matchMedia('(max-width: 980px)'); let obs = null;
    const observar = () => { obs?.disconnect(); obs = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting && Date.now() > bloqueo) activar(Number(en.target.dataset.planta)); }), { rootMargin: movil.matches ? '-74% 0px -25% 0px' : '-45% 0px -54% 0px' }); pasos.forEach((p) => obs.observe(p)); };
    observar(); movil.addEventListener?.('change', observar);
  }
  const sobre = (ev) => { const s = ev.target.closest?.('[data-sala]'); if (!s) return marcar(null); const p = s.closest('.paso, .plano-v'); const i = Number(p?.dataset.planta ?? act); if (i !== act) activar(i); marcar(s.dataset.sala); };
  rec.addEventListener('pointerover', sobre); rec.addEventListener('pointerleave', () => marcar(null));
  rec.addEventListener('focusin', sobre); rec.addEventListener('focusout', () => marcar(null));
}

// ---------- comparadores: maqueta / imagen y día / noche ----------
$$('.comparar').forEach((c) => {
  const r = $('input', c); let tocado = false, arr = false;
  const fijar = (v) => { v = Math.max(0, Math.min(100, v)); c.style.setProperty('--p', v.toFixed(2) + '%'); r.value = String(Math.round(v)); };
  const x = (ev) => { const b = c.getBoundingClientRect(); fijar(((ev.clientX - b.left) / b.width) * 100); };
  r.addEventListener('input', () => { tocado = true; fijar(Number(r.value)); });
  c.addEventListener('pointerdown', (ev) => { tocado = true; arr = true; if (ev.pointerType === 'mouse') { x(ev); c.setPointerCapture?.(ev.pointerId); } });
  c.addEventListener('pointermove', (ev) => { if (arr) x(ev); });
  const fin = () => { arr = false; }; c.addEventListener('pointerup', fin); c.addEventListener('pointercancel', fin); c.addEventListener('lostpointercapture', fin);
  // pista suave la primera vez que aparece: invita a deslizar
  pistas.add((el) => { if (el !== c || calma) return; const t0 = performance.now(); const k = [50, 34, 64, 50]; const f = (t) => { if (tocado) return; const u = Math.min(1, (t - t0) / 2200) * 3, i = Math.min(2, Math.floor(u)), q = u - i, e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2; fijar(k[i] + (k[i + 1] - k[i]) * e); if (u < 3) raf(f); }; setTimeout(() => raf(f), 400); });
});
$$('.dianoche').forEach((f) => { const bs = $$('button[data-modo]', f); bs.forEach((b) => b.addEventListener('click', () => { f.dataset.modo = b.dataset.modo; bs.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); })); });

// ---------- sol y orientación ----------
const sc = $('.sol-cap');
if (sc) {
  let datos = {}; try { datos = JSON.parse(sc.dataset.pts || '{}'); } catch { /* sin datos */ }
  const punto = $('.sol-punto', sc), lect = $('.sol-lectura', sc); let est = sc.dataset.est || 'equinoccio', vis = false, t0 = performance.now(), anim = 0;
  const hhmm = (m) => `${dos(Math.floor(m / 60) % 24)}:${dos(Math.floor(m % 60))}`;
  const situar = (k) => {
    const P = datos[est]?.p; if (!P?.length || !punto) return; const f = k * (P.length - 1), i = Math.floor(f), u = f - i, a = P[i], b = P[Math.min(i + 1, P.length - 1)];
    punto.setAttribute('cx', (a[0] + (b[0] - a[0]) * u).toFixed(1)); punto.setAttribute('cy', (a[1] + (b[1] - a[1]) * u).toFixed(1));
    if (lect) lect.textContent = `${datos[est].f} · ${hhmm(a[2] + (b[2] - a[2]) * u)} h · sol a ${Math.round(a[3] + (b[3] - a[3]) * u)}°`;
  };
  const mediodia = () => { const P = datos[est]?.p || []; let m = 0; P.forEach((q, i) => { if (q[3] > P[m][3]) m = i; }); situar(P.length > 1 ? m / (P.length - 1) : 0); };
  const bucle = (t) => { anim = 0; if (!vis || calma) return; situar(((t - t0) / 12000) % 1); anim = raf(bucle); };
  new IntersectionObserver(([en]) => { vis = en.isIntersecting; if (vis && !anim) { if (calma) mediodia(); else { t0 = performance.now(); anim = raf(bucle); } } }, { threshold: 0.15 }).observe(sc);
  const bEst = $$('.estaciones button', sc);
  bEst.forEach((b) => b.addEventListener('click', () => { est = b.dataset.est; sc.dataset.est = est; bEst.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); t0 = performance.now(); if (calma) mediodia(); }));
  const marcarF = (l) => $$('[data-lado]', sc).forEach((x) => x.classList.toggle('on', x.dataset.lado === l));
  $$('.fac', sc).forEach((f) => { const on = () => marcarF(f.dataset.lado), off = () => marcarF(null); f.addEventListener('pointerenter', on); f.addEventListener('pointerleave', off); f.addEventListener('focus', on); f.addEventListener('blur', off); });
  mediodia();
}

// ---------- película del proceso CUEVA (pausable; quieta con movimiento reducido) ----------
const peli = $('[data-pelicula]');
if (peli) {
  const cuadros = $$('.pl-cuadro', peli), arts = $$('.pl-txt article', peli), bots = $$('.pl-pasos button', peli), pb = $('.pl-pausa', peli);
  const DUR = 6500; let i = 0, t0 = 0, vis = false, parado = calma, anim = 0;
  const ir = (k) => {
    i = (k + cuadros.length) % cuadros.length; t0 = performance.now();
    cuadros.forEach((c, j) => c.classList.toggle('on', j === i)); arts.forEach((a, j) => { a.classList.toggle('on', j === i); a.toggleAttribute('aria-hidden', j !== i); });
    bots.forEach((b, j) => { if (j === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); b.style.setProperty('--k', j < i || (parado && j === i) ? 1 : 0); });
  };
  const bucle = (t) => { anim = 0; if (!vis || parado) return; const k = Math.min(1, (t - t0) / DUR); bots[i].style.setProperty('--k', k.toFixed(3)); if (k >= 1) ir(i + 1); anim = raf(bucle); };
  const seguir = () => { if (!anim && vis && !parado) { t0 = performance.now() - (parseFloat(bots[i].style.getPropertyValue('--k')) || 0) * DUR; anim = raf(bucle); } };
  const pausar = (p) => { parado = p; pb.setAttribute('aria-pressed', String(p)); pb.setAttribute('aria-label', p ? 'Reanudar la secuencia' : 'Pausar la secuencia'); seguir(); };
  new IntersectionObserver(([en]) => { vis = en.isIntersecting; seguir(); }, { threshold: 0.3 }).observe(peli);
  bots.forEach((b, j) => b.addEventListener('click', () => { ir(j); seguir(); }));
  pb.addEventListener('click', () => pausar(!parado)); pausar(parado); ir(0);
  let x0 = null; const esc = $('.pl-escena', peli);
  esc.addEventListener('pointerdown', (ev) => { x0 = ev.pointerType === 'mouse' ? null : ev.clientX; });
  esc.addEventListener('pointerup', (ev) => { if (x0 == null) return; const dx = ev.clientX - x0; x0 = null; if (Math.abs(dx) > 50) { ir(i + (dx < 0 ? 1 : -1)); seguir(); } });
}

// ---------- obra real: tira de vídeo y fotos (flechas) ----------
const tira = $('.obra-tira');
if (tira) $$('[data-ot]').forEach((b) => b.addEventListener('click', () => tira.scrollBy({ left: Number(b.dataset.ot) * tira.clientWidth * 0.8, behavior: calma ? 'auto' : 'smooth' })));

// ---------- montaje de la casa (axonometría por fases) ----------
const mt = $('[data-montaje]');
if (mt) {
  const svg = $('svg.axo', mt), cap = $('.mt-cap', mt), lis = $$('.mt-fases li', mt), barM = $('.mt-barra i', mt), bPlay = $('[data-montar]', mt);
  const n = (svg?.dataset.piezas || '').split(',').map(Number); const durs = [0, 1, 2, 3, 4].map((k) => (calma ? 900 : 1300 + Math.min(2200, (n[k] || 1) * 40)));
  const total = durs.reduce((a, b) => a + b, 0); let anim = 0, t0 = 0, actual = 4;
  const poner = (k, barra) => {
    actual = k; for (let j = 0; j < 5; j++) svg.classList.toggle('f' + j, j <= k);
    lis.forEach((l, j) => { l.classList.toggle('on', j === k); l.classList.toggle('hecho', j < k); $('button', l).setAttribute('aria-pressed', String(j === k)); });
    if (barra != null) barM.style.setProperty('--k', barra);
    if (cap) { cap.style.visibility = k < 0 ? 'hidden' : ''; if (k >= 0) { cap.firstChild.textContent = dos(k + 1); cap.lastChild.textContent = $('span', lis[k]).textContent; } }
  };
  const vaciar = () => { svg.classList.add('sin-t'); poner(-1, 0); svg.getBoundingClientRect(); raf(() => raf(() => svg.classList.remove('sin-t'))); };
  const etiqueta = (t) => { if (bPlay) bPlay.textContent = t; };
  const parar = () => { if (anim) cancelAnimationFrame(anim); anim = 0; };
  const paso = (t) => {
    const el = t - t0; if (el < 0) { anim = raf(paso); return; }
    let k = 0, acc = 0; while (k < 4 && el > acc + durs[k]) acc += durs[k++];
    if (k !== actual) poner(k); barM.style.setProperty('--k', Math.min(1, el / total).toFixed(3));
    if (el < total) anim = raf(paso); else { anim = 0; etiqueta('↻ Repetir el montaje'); }
  };
  const montar2D = () => { parar(); vaciar(); t0 = performance.now() + 300; etiqueta('■ Detener'); anim = raf(paso); };
  bPlay?.addEventListener('click', () => { if (anim) { parar(); poner(4, 1); etiqueta('↻ Repetir el montaje'); } else montar2D(); });
  lis.forEach((l, j) => $('button', l).addEventListener('click', () => { parar(); etiqueta('▶ Ver el montaje'); poner(j, durs.slice(0, j + 1).reduce((a, b) => a + b, 0) / total); }));
  poner(4, 1);
  if (!calma) { let hecho = false; vaciar(); new IntersectionObserver(([en], o) => { if (en.isIntersecting && !hecho) { hecho = true; o.disconnect(); montar2D(); } }, { threshold: 0.45 }).observe($('.mt-fig', mt)); }
}

// ---------- maqueta 3D (se carga al pedirla; el montaje 3D usa v.montaje si el visor lo ofrece) ----------
const btn = $('#abrir3d'); let cargando = null;
const abrir3D = () => cargando || (cargando = (async () => {
  if (btn) { btn.textContent = 'Cargando la maqueta…'; btn.disabled = true; }
  try {
    const { Visor } = await import('./js/visor3d.js'); const dat = JSON.parse($('#datos').textContent);
    const caja = $('#visor'); $$('.poster, .visor-velo, .reg', caja).forEach((x) => x.remove()); btn?.remove();
    const v = new Visor(caja); v.setModelo(dat.modelo, { parcela: dat.parcela, casa: dat.casa, lat: dat.lat, lon: dat.lon, ortoUrl: dat.parcela?.orto?.url });
    const ctl = $('.visor-ctl'); ctl.hidden = false;
    const pulsar = (sel, b) => $$(sel, ctl).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    // luz: hora legible y estación
    const hora = $('#hora', ctl), hv = $('#hora-v', ctl); let mes = 2;
    const hm = (h) => `${dos(Math.floor(h))}:${dos(Math.round((h % 1) * 60))}`;
    const luzSol = () => { v.setSol(mes, Number(hora.value)); hv.textContent = hm(Number(hora.value)); };
    hora.addEventListener('input', luzSol); $$('[data-mes]', ctl).forEach((b) => b.addEventListener('click', () => { mes = Number(b.dataset.mes); pulsar('[data-mes]', b); luzSol(); })); luzSol();
    // vistas
    const todas = $('[data-planta=""]', ctl);
    $$('[data-vista]', ctl).forEach((b) => b.addEventListener('click', () => { v.vista(b.dataset.vista); pulsar('[data-vista]', b); pulsar('[data-planta]', todas); }));
    // plantas (usa los métodos del visor si existen)
    const nv = v.niveles?.(); const nNiv = Array.isArray(nv) ? nv.length : typeof nv === 'number' ? nv : dat.modelo.plantas.length;
    const nombres = v.nombresNiveles?.();
    $$('[data-planta]', ctl).forEach((b) => { if (b.dataset.planta === '') return; const k = Number(b.dataset.planta); if (k >= nNiv) b.hidden = true; else if (nombres?.[k]) b.textContent = nombres[k]; });
    if (nNiv < 2) $('[data-plantas]', ctl).hidden = true;
    const verPlanta = (n) => {
      if (n == null) { if (typeof v.verExterior === 'function') return v.verExterior(); v.techo?.(true); return; }
      if (typeof v.verPlanta === 'function') return v.verPlanta(n);
      v.vista('planta'); pulsar('[data-vista]', $('[data-vista="planta"]', ctl)); v.techo?.(false, n);
    };
    $$('[data-planta]', ctl).forEach((b) => b.addEventListener('click', () => { verPlanta(b.dataset.planta === '' ? null : Number(b.dataset.planta)); pulsar('[data-planta]', b); }));
    // montaje 3D
    if (typeof v.montaje === 'function') { $('[data-grupo-montaje]', ctl).hidden = false; $('[data-montaje3d-chip]', ctl).addEventListener('click', () => montaje3D()); }
    // pantalla completa (API nativa o, en iPhone, a ventana completa)
    const marco = $('#marco3d'), fsb = $('[data-pantalla]', ctl);
    const enFS = () => d.fullscreenElement === marco || marco.classList.contains('pseudo-fs');
    const estadoFS = () => { const on = enFS(); fsb.setAttribute('aria-pressed', String(on)); $('span', fsb).textContent = on ? 'Salir' : 'Pantalla completa'; d.body.style.overflow = marco.classList.contains('pseudo-fs') ? 'hidden' : ''; };
    fsb.addEventListener('click', async () => {
      if (enFS()) { if (d.fullscreenElement) await d.exitFullscreen().catch(() => {}); marco.classList.remove('pseudo-fs'); }
      else if (marco.requestFullscreen && d.fullscreenEnabled) { try { await marco.requestFullscreen(); } catch { marco.classList.add('pseudo-fs'); } }
      else marco.classList.add('pseudo-fs');
      estadoFS();
    });
    d.addEventListener('fullscreenchange', estadoFS);
    new MutationObserver(estadoFS).observe(marco, { attributes: true, attributeFilter: ['class'] });
    return v;
  } catch (e) { cargando = null; if (btn?.isConnected) { btn.disabled = false; btn.textContent = 'La maqueta 3D necesita abrirse desde un servidor (usa ARRANCAR.cmd)'; } console.error(e); throw e; }
})());
btn?.addEventListener('click', () => abrir3D().catch(() => {}));

// Montaje sobre la maqueta 3D: v.montaje({ duracion (s), alFase(i) }); los rótulos siguen su propio reloj si el visor no avisa.
const m3d = $('.m3d'); let m3dAnim = 0, m3dFin = 0, m3dVez = 0;
async function montaje3D() {
  const v = await abrir3D(); if (typeof v?.montaje !== 'function' || !m3d) return false;
  const lis = $$('li', m3d), bar = $('i i', m3d), DUR = calma ? 6 : 12; let fase = -1, avisa = false;
  const marcar = (k) => { if (k === fase) return; fase = k; lis.forEach((l, j) => { l.classList.toggle('on', j === k); l.classList.toggle('hecho', j < k); }); };
  cancelAnimationFrame(m3dAnim); clearTimeout(m3dFin); m3d.hidden = false; marcar(0); bar.style.setProperty('--k', 0);
  // alDetener: el visor avisa al acabar o si el montaje se corta (otra vista, planta): los rótulos no siguen solos
  let cortado = false; const yo = ++m3dVez;
  try { v.montaje({ duracion: DUR, alFase: (k) => { avisa = true; marcar(Math.max(0, Math.min(4, k))); }, alDetener: (completo) => { if (completo) return; cortado = true; if (yo !== m3dVez) return; cancelAnimationFrame(m3dAnim); m3d.hidden = true; } }); } catch (e) { console.error(e); m3d.hidden = true; return false; }
  const t0 = performance.now();
  const paso = (t) => { if (cortado) return; const k = Math.min(1, (t - t0) / (DUR * 1000)); if (!avisa) marcar(Math.min(4, Math.floor(k * 5))); bar.style.setProperty('--k', k.toFixed(3)); if (k < 1) m3dAnim = raf(paso); else { marcar(4); m3dFin = setTimeout(() => (m3d.hidden = true), 2600); } };
  m3dAnim = raf(paso); return true;
}
$$('[data-montaje3d]').forEach((a) => a.addEventListener('click', async (ev) => {
  ev.preventDefault(); $('#marco3d')?.scrollIntoView({ behavior: suave(), block: 'center' });
  try { await montaje3D(); } catch { /* sin 3D (file://): se queda en el capítulo */ }
}));
