/* Páginas legales: preferencia del mapa y Libro de Reclamaciones. */
(() => {
  'use strict';

  const WA_NUMBER = '51980820574'; // [PENDIENTE] confirmar WhatsApp del local

  // Política de cookies: olvidar la preferencia del mapa
  const forget = document.querySelector('[data-forget-map]');
  if (forget) {
    forget.addEventListener('click', () => {
      try { localStorage.removeItem('saira-mapa-google'); } catch { /* sin almacenamiento */ }
      document.querySelector('[data-forget-status]').textContent = 'Listo: volveremos a preguntarte antes de cargar el mapa.';
    });
  }

  const form = document.getElementById('libro');
  if (!form) return;

  const summary = document.getElementById('form-summary');
  const sheet = document.getElementById('sheet');
  const sheetData = document.getElementById('sheet-data');
  const waBtn = document.getElementById('sheet-wa');
  const menor = document.getElementById('menor');
  const apoderadoField = document.getElementById('apoderado-field');
  const apoderado = document.getElementById('apoderado');

  const messages = {
    nombre: 'Escribe tus nombres y apellidos.',
    tipo_doc: 'Elige el tipo de documento.',
    num_doc: 'Escribe el número de documento.',
    domicilio: 'Escribe tu domicilio.',
    telefono: 'Escribe un teléfono de contacto.',
    correo: 'Escribe un correo válido, por ejemplo nombre@correo.com.',
    apoderado: 'Escribe el nombre de tu padre, madre o apoderado.',
    bien: 'Indica si fue un producto o un servicio.',
    descripcion: 'Indica qué producto o servicio compraste.',
    tipo: 'Elige si es un reclamo o una queja.',
    detalle: 'Cuéntanos qué pasó.',
    pedido: 'Indica qué solicitas.',
    acepto: 'Debes aceptar el tratamiento de tus datos para registrar la hoja.',
  };

  menor.addEventListener('change', () => {
    apoderadoField.hidden = !menor.checked;
    apoderado.required = menor.checked;
  });

  const clearErrors = () => {
    form.querySelectorAll('.field-error').forEach((e) => e.remove());
    form.querySelectorAll('[aria-invalid]').forEach((e) => {
      e.removeAttribute('aria-invalid');
      e.removeAttribute('aria-describedby');
    });
  };

  const showError = (name, text) => {
    const els = form.querySelectorAll(`[name="${name}"]`);
    const first = els[0];
    const msg = document.createElement('p');
    msg.className = 'field-error';
    msg.id = `err-${name}`;
    msg.textContent = text;
    els.forEach((el) => {
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', msg.id);
    });
    const anchor = first.type === 'radio' ? first.closest('.choices')
      : first.type === 'checkbox' ? first.closest('.check') : first;
    anchor.insertAdjacentElement('afterend', msg);
    return first;
  };

  const validate = () => {
    clearErrors();
    const errors = [];
    for (const name of Object.keys(messages)) {
      const els = [...form.querySelectorAll(`[name="${name}"]`)];
      if (!els.length || !els[0].required) continue;
      const el = els[0];
      let ok;
      if (el.type === 'radio') ok = els.some((r) => r.checked);
      else if (el.type === 'checkbox') ok = el.checked;
      else if (el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
      else ok = el.value.trim() !== '';
      if (!ok) errors.push(showError(name, messages[name]));
    }
    return errors;
  };

  const fmtDate = (d) => new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short',
  }).format(d);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const errors = validate();
    if (errors.length) {
      summary.textContent = errors.length === 1
        ? 'Falta completar 1 campo. Revísalo abajo.'
        : `Faltan completar ${errors.length} campos. Revísalos abajo.`;
      summary.hidden = false;
      errors[0].focus();
      return;
    }
    summary.hidden = true;

    const f = new FormData(form);
    const rows = [
      ['Fecha', fmtDate(new Date())],
      ['N.° de hoja', 'Lo asigna SAIRA al registrarla'],
      ['Proveedor', 'SAIRA cafe & bakery, RUC [PENDIENTE]'],
      ['Consumidor', f.get('nombre')],
      ['Documento', `${f.get('tipo_doc')} ${f.get('num_doc')}`],
      ['Domicilio', f.get('domicilio')],
      ['Teléfono', f.get('telefono')],
      ['Correo', f.get('correo')],
    ];
    if (menor.checked) rows.push(['Padre, madre o apoderado', f.get('apoderado')]);
    rows.push(
      ['Bien contratado', `${f.get('bien')}: ${f.get('descripcion')}`],
      ['Monto reclamado', f.get('monto') ? `S/ ${f.get('monto')}` : 'No indicado'],
      ['Tipo', f.get('tipo')],
      ['Detalle', f.get('detalle')],
      ['Pedido', f.get('pedido')],
      ['Acciones del proveedor', 'Pendiente de respuesta'],
    );

    sheetData.replaceChildren();
    rows.forEach(([k, v]) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = v;
      sheetData.append(dt, dd);
    });

    const body = ['Libro de Reclamaciones - SAIRA cafe & bakery', '', ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n');
    waBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(body)}`;

    form.hidden = true;
    sheet.hidden = false;
    sheet.focus();
    sheet.scrollIntoView({ block: 'start' });
  });

  document.getElementById('sheet-print').addEventListener('click', () => window.print());
  document.getElementById('sheet-edit').addEventListener('click', () => {
    sheet.hidden = true;
    form.hidden = false;
    form.querySelector('input').focus();
  });
})();
