/* SAIRA cafe & bakery — portada con scroll, carta y pedido por WhatsApp. Sin dependencias. */
(() => {
  'use strict';

  // [PENDIENTE] Confirmar que este número (Google Maps) recibe WhatsApp.
  const WA_NUMBER = '51980820574';

  // [PENDIENTE] Lista de ejemplo basada en las reseñas públicas. Reemplazar por la carta real.
  const PRODUCTS = [
    { id: 'carrot-tajada', name: 'Tajada de carrot cake', unit: 'tajada', desc: 'Con frosting y frutos secos.' },
    { id: 'carrot-entera', name: 'Carrot cake entera', unit: 'torta', desc: 'Por encargo. Tamaño y anticipación se confirman en el chat.' },
    { id: 'galletas', name: 'Galletas', unit: 'unidad', desc: 'Pregunta por las del día.' },
    { id: 'cafe', name: 'Café de la casa', unit: 'taza', desc: 'Dinos en las notas cómo lo prefieres.' },
    { id: 'iced-latte', name: 'Iced latte', unit: 'vaso', desc: 'Café con leche y hielo.' },
    { id: 'frappe', name: 'Frappé', unit: 'vaso', desc: 'Bebida helada y batida.' },
  ];

  const FRAMES_MANIFEST = 'manifest.json';
  const TERRACE_IMAGE = 'terraza.webp';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  /* ------------------------------------------------------------------
     Portada: secuencia de fotogramas ligada al scroll
     ------------------------------------------------------------------ */
  const hero = document.querySelector('.hero');
  const header = document.querySelector('.top');
  const canvas = hero.querySelector('.hero__canvas');
  const ctx = canvas.getContext('2d');
  const steps = [...hero.querySelectorAll('.hero__step')];
  const trackItems = [...hero.querySelectorAll('.hero__track li')];

  let manifest = null;
  let seq = null;          // { key, count, width, height, src(i), imgs[] }
  let progress = 0;
  let drawnIndex = -1;
  let frameQueued = false;

  const isStatic = () => reduceMotion.matches;

  function measure() {
    if (isStatic()) { progress = 0.5; return; }
    const rect = hero.getBoundingClientRect();
    const travel = hero.offsetHeight - window.innerHeight;
    progress = travel > 0 ? clamp(-rect.top / travel) : 0;
  }

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      drawnIndex = -1;
    }
  }

  function nearestLoaded(i) {
    const { imgs, count } = seq;
    if (imgs[i]) return i;
    for (let d = 1; d < count; d++) {
      if (i - d >= 0 && imgs[i - d]) return i - d;
      if (i + d < count && imgs[i + d]) return i + d;
    }
    return -1;
  }

  function drawFrame() {
    if (!seq) return;
    const target = Math.round(progress * (seq.count - 1));
    const i = nearestLoaded(target);
    if (i < 0 || i === drawnIndex) return;
    const img = seq.imgs[i];
    const cw = canvas.width, ch = canvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    drawnIndex = i;
  }

  function updateCopy() {
    hero.style.setProperty('--p', progress.toFixed(4));
    // Respaldo ilustrado: corte (0–45 %) y alejamiento hacia el valle (45–100 %)
    hero.style.setProperty('--cut', clamp(progress / 0.45).toFixed(4));
    hero.style.setProperty('--pull', clamp((progress - 0.45) / 0.55).toFixed(4));
    if (isStatic()) return;
    steps.forEach((step) => {
      const on = progress >= +step.dataset.from && progress < +step.dataset.to;
      step.classList.toggle('is-active', on);
    });
    const phase = Math.min(trackItems.length - 1, Math.floor(progress * trackItems.length));
    trackItems.forEach((li, n) => li.classList.toggle('is-on', n <= phase));
  }

  function updateHeader() {
    // Fondo sólido en cuanto la portada deja de estar detrás de la cabecera (con margen por los anclajes)
    header.classList.toggle('is-solid', hero.getBoundingClientRect().bottom < header.offsetHeight + 40);
  }

  function render() {
    frameQueued = false;
    measure();
    updateCopy();
    drawFrame();
    updateHeader();
  }

  function queueRender() {
    if (!frameQueued) {
      frameQueued = true;
      requestAnimationFrame(render);
    }
  }

  function useFallback() {
    seq = null;
    hero.classList.remove('hero--ready');
    hero.classList.add('hero--fallback');
  }

  function pickSet() {
    if (!manifest) return;
    const portrait = window.innerWidth / window.innerHeight < 0.8;
    const key = portrait && manifest.mobile ? 'mobile' : 'desktop';
    const set = manifest[key];
    if (!set || !set.count) return useFallback();
    if (seq && seq.key === key) return;

    seq = {
      key,
      count: set.count,
      imgs: new Array(set.count),
      src: (i) => set.path.replace('{n}', String(i + 1).padStart(4, '0')),
    };
    drawnIndex = -1;
    loadSequence(seq);
  }

  // Primero el fotograma inicial y el final; luego pasadas cada vez más finas,
  // para que la secuencia se pueda recorrer antes de terminar de cargar.
  function loadOrder(count) {
    const order = [0, count - 1];
    const seen = new Set(order);
    for (let stride = 16; stride >= 1; stride = Math.floor(stride / 2)) {
      for (let i = 0; i < count; i += stride) {
        if (!seen.has(i)) { seen.add(i); order.push(i); }
      }
    }
    return order;
  }

  function loadSequence(target) {
    const queue = loadOrder(target.count);
    let active = 0;
    const MAX = 6;

    const next = () => {
      if (seq !== target) return; // cambió de escritorio a celular: abandonar esta carga
      while (active < MAX && queue.length) {
        const i = queue.shift();
        active++;
        const img = new Image();
        img.decoding = 'async';
        // onload en lugar de img.decode(): decode() puede quedarse colgado en algunos navegadores embebidos
        new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = target.src(i); })
          .then(() => {
            if (seq !== target) return;
            target.imgs[i] = img;
            if (i === 0) {
              hero.classList.add('hero--ready');
              hero.classList.remove('hero--fallback');
            }
            queueRender();
          })
          .catch(() => { if (i === 0 && seq === target) useFallback(); })
          .finally(() => { active--; next(); });
      }
    };
    next();
  }

  function applyMotionMode() {
    hero.classList.toggle('is-static', isStatic());
    sizeCanvas();
    queueRender();
  }

  fetch(FRAMES_MANIFEST, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('sin fotogramas'))))
    .then((m) => { manifest = m; pickSet(); })
    .catch(useFallback);

  window.addEventListener('scroll', queueRender, { passive: true });
  window.addEventListener('resize', () => { sizeCanvas(); pickSet(); queueRender(); });
  reduceMotion.addEventListener('change', applyMotionMode);
  applyMotionMode();

  /* ------------------------------------------------------------------
     Carta y pedido por WhatsApp
     ------------------------------------------------------------------ */
  const menu = document.querySelector('[data-menu]');
  const linesEl = document.querySelector('[data-lines]');
  const form = document.querySelector('[data-order-form]');
  const preview = document.querySelector('[data-preview]');
  const sendLabel = document.querySelector('[data-send-label]');
  const deliveryHint = document.querySelector('[data-delivery-hint]');
  const dock = document.querySelector('[data-dock]');
  const dockCount = document.querySelector('[data-dock-count]');
  const ticket = document.getElementById('tu-pedido');
  const qty = new Map(PRODUCTS.map((p) => [p.id, 0]));
  let lastChanged = null;

  menu.innerHTML = PRODUCTS.map((p) => `
    <li class="menu__item" data-id="${p.id}">
      <h3 class="menu__name">${p.name}</h3>
      <p class="menu__desc">${p.desc}</p>
      <div class="menu__qty">
        <button class="qty__btn" type="button" data-step="-1" aria-label="Quitar ${p.unit} de ${p.name}" disabled>−</button>
        <span class="qty__num" aria-label="Cantidad de ${p.name}">0</span>
        <button class="qty__btn qty__btn--add" type="button" data-step="1" aria-label="Agregar ${p.unit} de ${p.name}">+</button>
      </div>
    </li>`).join('');

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-step]');
    if (!btn) return;
    const item = btn.closest('.menu__item');
    const id = item.dataset.id;
    const value = clamp(qty.get(id) + Number(btn.dataset.step), 0, 20);
    qty.set(id, value);
    lastChanged = id;
    item.querySelector('.qty__num').textContent = value;
    item.querySelector('[data-step="-1"]').disabled = value === 0;
    item.classList.toggle('has-qty', value > 0);
    renderOrder();
  });

  const todayISO = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };
  form.day.min = todayISO();

  function formatDay(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function chosen() {
    return PRODUCTS.filter((p) => qty.get(p.id) > 0).map((p) => ({ ...p, n: qty.get(p.id) }));
  }

  function buildMessage() {
    const items = chosen();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const notes = String(data.get('notes') || '').trim();
    const day = formatDay(String(data.get('day') || ''));
    const mode = data.get('mode') === 'entrega'
      ? 'entrega a domicilio (¿llegan a mi zona?)'
      : 'recojo en el local';

    if (!items.length) {
      return [
        'Hola SAIRA, quiero consultar por un pedido.',
        name && `Soy ${name}.`,
        notes && `Notas: ${notes}`,
      ].filter(Boolean).join('\n');
    }

    const lines = [
      'Hola SAIRA, quiero hacer este pedido:',
      ...items.map((p) => `• ${p.n} × ${p.name}`),
      '',
      `Recibo: ${mode}`,
    ];
    if (day) lines.push(`Para: ${day}`);
    if (name) lines.push(`Nombre: ${name}`);
    if (notes) lines.push(`Notas: ${notes}`);
    return lines.join('\n');
  }

  function renderOrder() {
    const items = chosen();
    const total = items.reduce((sum, p) => sum + p.n, 0);

    linesEl.innerHTML = items.length
      ? `<ul class="ticket__list">${items.map((p) => `
          <li${p.id === lastChanged ? ' class="is-new"' : ''}><span>${p.name}</span><span>× ${p.n}</span></li>`).join('')}
        </ul>`
      : '<p class="ticket__empty">Todavía no elegiste nada. Suma productos desde la carta.</p>';

    lastChanged = null; // el destello solo marca el cambio de cantidad, no cada tecla del formulario
    sendLabel.textContent = items.length ? 'Enviar pedido por WhatsApp' : 'Escribir por WhatsApp';
    deliveryHint.hidden = form.mode.value !== 'entrega';
    preview.textContent = buildMessage();
    dockCount.textContent = `${total} ${total === 1 ? 'producto' : 'productos'}`;
    updateDock();
  }

  form.addEventListener('input', renderOrder);
  form.addEventListener('change', renderOrder);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(buildMessage())}`;
    const win = window.open(url, '_blank', 'noopener');
    if (!win) window.location.href = url;
  });

  // Barra inferior en celular: visible con productos elegidos y el resumen fuera de pantalla
  let ticketVisible = false;
  const mobileQuery = window.matchMedia('(max-width: 900px)');
  function updateDock() {
    const hasItems = chosen().length > 0;
    const on = mobileQuery.matches && hasItems && !ticketVisible;
    dock.classList.toggle('is-on', on);
    dock.setAttribute('aria-hidden', String(!on));
    dock.tabIndex = on ? 0 : -1;
    syncFab();
  }
  new IntersectionObserver(([entry]) => {
    ticketVisible = entry.isIntersecting;
    updateDock();
  }, { threshold: 0.15 }).observe(ticket);
  mobileQuery.addEventListener('change', updateDock);

  renderOrder();

  /* ------------------------------------------------------------------
     Terraza: imagen (si existe) y mapa diferido
     ------------------------------------------------------------------ */
  const figure = document.querySelector('[data-terrace]');
  const terrace = new Image();
  terrace.className = 'place__img';
  terrace.alt = 'Mesa de vidrio con la carrot cake en una terraza de piso de terracota, con muro de piedra y el valle al fondo (ilustración 3D conceptual)';
  terrace.width = 1600;
  terrace.height = 900;
  terrace.decoding = 'async';
  terrace.onload = () => {
    const note = figure.querySelector('[data-terrace-note]');
    figure.insertBefore(terrace, note); // encima de la textura de piedra, debajo de la nota
    note.hidden = false;
  };
  terrace.src = TERRACE_IMAGE;

  // Mapa de Google: solo se carga si el visitante lo pide (instala cookies de Google).
  const MAP_KEY = 'saira-mapa-google';
  const mapBox = document.querySelector('[data-map]');
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
  };
  function loadMap() {
    const frame = document.createElement('iframe');
    frame.title = 'Mapa de SAIRA cafe & bakery en Cieneguilla';
    frame.src = 'https://www.google.com/maps?q=-12.1125719,-76.8210869&z=16&output=embed';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    mapBox.replaceChildren(frame);
  }
  mapBox.querySelector('[data-map-load]').addEventListener('click', () => {
    store.set(MAP_KEY, 'si');
    loadMap();
  });
  if (store.get(MAP_KEY) === 'si') loadMap();

  /* ------------------------------------------------------------------
     Botones y detalles de interfaz
     ------------------------------------------------------------------ */
  const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  document.querySelectorAll('[data-wa]').forEach((a) => {
    a.href = waLink(a.dataset.wa);
    a.target = '_blank';
    a.rel = 'noopener';
  });

  // Aviso breve
  const toast = document.querySelector('[data-toast]');
  let toastTimer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2400);
  }

  // Copiar dirección
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        say('Dirección copiada');
      } catch {
        say('No se pudo copiar. Mantén presionada la dirección para copiarla.');
      }
    });
  });

  // Compartir
  document.querySelectorAll('[data-share]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const data = { title: 'SAIRA cafe & bakery', text: 'Carrot cake, café y terraza en Cieneguilla.', url: location.href.split('#')[0] };
      if (navigator.share) {
        try { await navigator.share(data); } catch { /* compartir cancelado */ }
        return;
      }
      try {
        await navigator.clipboard.writeText(data.url);
        say('Enlace copiado');
      } catch {
        say('Copia el enlace desde la barra del navegador.');
      }
    });
  });

  // Menú en celular
  const menuBtn = document.querySelector('[data-menu-toggle]');
  const setMenu = (open) => {
    header.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.querySelector('.sr-only').textContent = open ? 'Cerrar menú' : 'Abrir menú';
  };
  menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
  document.getElementById('menu-principal').addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
  });

  // Botón flotante: aparece tras la portada y cede su lugar a la barra de pedido
  function syncFab() {
    // Se busca aquí porque updateDock() lo llama antes de llegar a esta parte del archivo
    const fab = document.querySelector('[data-fab]');
    if (!fab) return;
    const pastHero = hero.getBoundingClientRect().bottom < window.innerHeight * 0.4;
    const footerIn = document.querySelector('.foot').getBoundingClientRect().top < window.innerHeight;
    const on = pastHero && !footerIn && !dock.classList.contains('is-on');
    fab.classList.toggle('is-on', on);
    fab.tabIndex = on ? 0 : -1;
  }
  window.addEventListener('scroll', syncFab, { passive: true });
  syncFab();

  // Secciones: entrada de títulos (una vez) y animaciones de fondo solo a la vista
  const seen = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-seen'); seen.unobserve(en.target); }
    });
  }, { threshold: 0.2 });
  const visible = new IntersectionObserver((entries) => {
    entries.forEach((en) => en.target.classList.toggle('is-visible', en.isIntersecting));
  });
  document.querySelectorAll('[data-anim], .marquee').forEach((el) => { seen.observe(el); visible.observe(el); });
})();
