# SAIRA cafe & bakery — web

Sitio estático (HTML, CSS y JavaScript sin dependencias). Ver decisiones en `PROJECT_BRIEF.md` y
diseño en `DESIGN_SPEC.md`.

## Ver la web
Cualquier servidor estático sirve. Desde la carpeta del estudio:

```bash
py -m http.server 4210 --directory saira-cafe
```

Abrir http://localhost:4210

## Animación 3D del corte (Remotion)
La portada usa hoy una animación 3D propia hecha con Remotion 4.0.530 + Three.js, en `remotion/`.
Es ilustrativa (no es la torta ni el local reales) y se puede reemplazar por video real o IA.

```bash
cd saira-cafe/remotion
npm install
npm run studio      # vista previa interactiva en el navegador
npm run render      # escribe ../assets/source/corte-16x9.mp4 y corte-9x16.mp4
```

Después se extraen los fotogramas con FFmpeg (sección siguiente). Escena, cámara y tiempos están en
`remotion/src/Corte.tsx`; texturas en `remotion/src/textures.ts`.

**Licencia de Remotion:** gratis para personas, empresas con fines de lucro de hasta 3 empleados y
organizaciones sin fines de lucro; las demás necesitan una Company License (remotion.pro).

## Poner el video del corte (portada)
Requiere FFmpeg (instalado con `winget install Gyan.FFmpeg`; versión 9.0.2, licencia GPL-3.0).

1. Generar los videos con los prompts de `PROMPTS_IA.md`.
2. Copiarlos a `assets/source/`. Para que se detecten solos, el nombre debe incluir `16x9` (u
   `horizontal`) y `9x16` (o `vertical`): por ejemplo `corte-16x9.mp4` y `corte-9x16.mp4`.
   Sirve cualquier formato que lea FFmpeg (MP4, MOV de iPhone en HEVC, WebM…); los videos de
   celular grabados en vertical se enderezan solos.
3. Desde la carpeta del estudio:
   ```bash
   node saira-cafe/tools/extract-frames.mjs
   ```
   Opciones: `--desktop archivo`, `--mobile archivo`, `--desktop-count 120`, `--desktop-width 1600`,
   `--mobile-count 90`, `--mobile-width 720`, `--quality 80`, `--no-terrace`.
4. Se regeneran `assets/frames/desktop/`, `assets/frames/mobile/`, `assets/frames/manifest.json` y
   `assets/terraza.webp` (último fotograma del video horizontal, usado en «La terraza»).
   Sin video vertical, el celular usa la secuencia horizontal recortada.
5. Recargar la web. Sin `manifest.json` la portada muestra la ilustración de respaldo.

`assets/source/` no se publica: solo hacen falta `frames/` y `terraza.webp`.

**Respaldo sin FFmpeg:** `node saira-cafe/tools/frame-server.mjs` y abrir
http://localhost:4211/tools/extract-frames.html. Extrae en el navegador (solo formatos que lea Chrome).

## Editar contenido
- **WhatsApp:** `WA_NUMBER` al inicio de `js/app.js`.
- **Carta:** lista `PRODUCTS` en `js/app.js` (nombre, unidad, descripción).
- **Textos, horario y datos del local:** `index.html`.
- **Colores y tipografías:** variables al inicio de `css/styles.css`.

## Secciones y páginas
- `index.html`: portada 3D, franja animada, Cómo pedir, Carta y pedido, Encargos, Opiniones de Google,
  La terraza (mapa solo con permiso), Preguntas frecuentes, cierre y pie.
- Legales: `privacidad.html`, `terminos.html`, `cookies.html`, `libro-reclamaciones.html`. Se generan
  desde `partials/` (cabecera y pie compartidos):
  ```bash
  node saira-cafe/tools/build-legal.mjs
  ```
  Edita los `partials/*.body.html` y vuelve a ejecutar el comando; no edites las páginas generadas.
- El Libro de Reclamaciones valida el formulario, arma la hoja imprimible y la envía por WhatsApp. No
  numera ni guarda las hojas: eso requiere un servidor o un proceso manual del negocio.

## Animaciones de fondo
Migas y nueces flotando (carta), sello giratorio (encargos), comillas que flotan (opiniones), sol y nubes
(terraza), franja de productos y letras del pie. Solo corren con la sección a la vista y se apagan con
«reducir movimiento».

## Qué hace y qué no hace el pedido
Compone un mensaje con productos, cantidades, modalidad, fecha, nombre y notas, y abre WhatsApp con
el texto listo. **No** cobra, no reserva stock ni confirma disponibilidad: eso se resuelve en el chat.

## Pendientes antes de publicar
- Confirmar número de WhatsApp, carta real, precios (no se muestran), horario completo y zonas de entrega.
- Reemplazar imágenes conceptuales (IA) por fotos/video reales cuando existan y quitar las notas
  «Imagen conceptual».
- Publicación (dominio/hosting) no configurada.
