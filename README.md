# Striking Motion Lab — web inmersiva (versión entregada: v27)

Este README describe **solo** el estado real de esta versión. Lo anterior (generaciones previas, decisiones históricas, valores
antiguos) está en [`docs/HISTORICO.md`](docs/HISTORICO.md); el código retirado, en [`src/_legacy/`](src/_legacy/README.md).

React 18 + Vite 5 + GSAP/ScrollTrigger + React Three Fiber (three 0.169) + Zustand. Despliegue en Netlify (`netlify.toml`).

```bash
npm install
npm run dev       # desarrollo (API de grupos en memoria; atajo D = panel técnico de scroll)
npm run build     # producción → dist/
```
Panel técnico (tecla **D**): solo en desarrollo o añadiendo `?debug` a la URL. En producción el visitante no tiene acceso.

---

# ARQUITECTURA ACTUAL

## 1. Idea
Un **único Canvas 3D fijo** (`Scene/SceneCanvas.jsx`) y una **capa DOM** encima. La cámara viaja por el mundo (eje Z) según el scroll;
el DOM cuenta, el 3D explica. La persona también puede saltar directamente a cualquier sección. Hay una puerta lateral, **Experiences**
(B2B), que se abre como overlay sin tocar cámara ni scroll.

## 2. Recorrido actual
Seis capítulos separados por umbrales de scroll (`Data/Content.js → chapters`, longitud en `vh`):

| # | Capítulo (módulo interno) | Sección visible | Scroll |
|---|---|---|---|
| 01 | `entrada` | Inicio (HOME) | 210vh |
| ↳ | umbral `entrada>character-select` = **Bridge** | (sigue siendo HOME) | 180vh |
| 02 | `character-select` | Explore | 135vh |
| 03 | `asesoria-lab` | Método | 250vh escritorio · flujo libre en móvil |
| 04 | `slot` | Entrenamiento | flujo libre (`Chapter flow`) |
| ↳ | FAQ (no es capítulo) | — | DOM normal, entre 04 y 05 |
| 05 | `proof-chen` | Sobre Chen (Founder) | 260vh (umbral previo 100vh) |
| 06 | `reserva` | Reserva (Book) | 140vh |
| — | Footer | cierre, contacto | DOM normal |

Los demás umbrales miden 50vh. Los ids técnicos (`character-select`, `asesoria-lab`, `slot`, `proof-chen`) son nombres internos de módulo;
el usuario ve los rótulos de la columna «Sección visible».

## 3. Escenas actuales
**01 · Inicio** (`Experience/Entrada`, mundo en `Scene/Environment/Entrada`). Título y salidas visibles desde el primer fotograma; el
scroll mete la cámara en el laboratorio. Salidas: **Reservar**, **Explorar SML →** y el enlace secundario a Empresas. Foto de fondo
(`PhotoBackdrop`, `hero-lab.jpg`) solo en esta escena. Cotas del corredor en `Entrada/constants.js`; luz de estudio en `Lighting/EntradaStudio.jsx`.

**Bridge** (`Experience/Entrada/Bridge.jsx` + `Scene/Environment/Bridge/BridgeHall.jsx`). Vive *dentro* del umbral 01→02: cuerpo → combate
(Tyson / McGregor) → mapa → striking → disciplinas. Reparto del umbral (`Scene/Transitions/scrollState.js`): `0…BRIDGE_END (0,70)` corre el
copy; `BRIDGE_END…BRIDGE_OUT_END (0,82)` el Bridge sale; `REVEAL_START (= 0,82)…1` se revelan los luchadores. HOME sigue activo mientras dura.
`TransitionFrame.jsx` (Entrada) es el puente 3D entre el corredor y las vitrinas. Copy en `Data/Content.js → bridge`.

**02 · Explore** (`Experience/Explore`). Una pantalla de decisión, sin película. Dos elecciones, en cualquier orden y cambiables siempre:
1. *¿Cómo quieres entrenar?* — Aprender · Entrenar · Vivir el entrenamiento de un peleador · Sparring · Competir → `selectedTrainingMode`. No son niveles.
2. *Después elegimos cómo* — Boxeo · K1 / Kickboxing · Muay Thai → `selectedDiscipline`. Solo la elegida se expande (qué es, cómo se entrena, qué desarrolla).

La selección es la causa: UI, personaje y vídeo (`Fighter.jsx`, `RosterGroup.jsx`), luz (`CharacterSelectLighting.jsx`) y cámara leen el mismo
estado. Tocar al luchador 3D equivale a tocar su tarjeta. Sin glosario de términos básicos. Copy: `Data/Content.js → seleccion, explore`, `Data/Disciplines.js`.

**03 · Método** (`Experience/AsesoriaLab`). «No empezamos por el entrenamiento. Empezamos por ti.» Cinco pasos (Te conozco · Te observo · Entrenamos ·
Adaptamos · Seguimos) + cierre; la Evaluación inicial (30 €) lleva a Reserva. Escritorio: pantalla fija donde el scroll reparte los pasos (`substage`);
móvil (≤700px): los cinco pasos en vertical, abiertos. La sala (16 × 5 × 22 m, plataforma, máquina de selección, zona de entrenamiento y sacos)
está en `Environment/Room`, `Machine`, `Floor`.

**04 · Entrenamiento** (`Experience/Slot`) · «De las posibilidades a tu caso». La máquina 3D (`Environment/Slot/HybridRack.jsx`) ya no es un peaje: es un
**instrumento opcional**. Dos caminos:
- *Elección directa* (principal, visible de entrada, sin recorrer la máquina): **1:1** → Reserva (`pullLever` + `goToSection('book')`) · **Parejas** → WhatsApp ·
  **Grupo reducido** → `GrupoFinder` (barrio → franja → unirme / proponer). Sin precio en el rótulo: el importe (30 € · 20 € · 15 € / «desde 55 €/mes») sale en el detalle,
  en tipografía secundaria. `selectedFormat` = `'1-1' | 'duo' | 'grupo'`; `selectedGoal` puede quedar `null`.
- *Configurar frecuencia* (opcional, entra en la máquina): frecuencia deseada (aguja, `slotState.freq`) → combinación **1:1 + grupo reducido** (bandeja) → resultado (palanca).
  Regla determinista (`Data/Slot.js → propuestaCombinacion`): 1 día = 1 × 1:1 · 2 días = 1 × 1:1 + 1 × grupo · 3 días = 1 × 1:1 + 2 × grupo; el total es la frecuencia
  (no 4) y +/− la ajusta (mínimo 2 formatos con N ≥ 2). `planHibrido` se escribe con `armarPlan`. La bandeja tiene 4 huecos físicos (`RACK.N`, capacidad, no tamaño del plan).
  El precio aparece en el resultado como importes unitarios; no existe precio oficial de la mezcla y no se calcula. Planes 1:1 y Starter Kit: referencia secundaria, nunca un paso.
La máquina refleja, no decide (`reflectDrum`, `pingMachine`, `pullLever`; `launchDrum` sigue retirado). Estaciones: `Slot/rackSpec.js` (Formato · Frecuencia · Combinación [bandeja, id `opcion`] · Acción).
Datos: `Data/Slot.js` (vivo) sobre `Data/Programs.js` (fuente de precios). `EnPractica.jsx` ya no se monta en este capítulo.

**Estudio de combate** (`Experience/Estudio`, datos en `Data/Estudio.js`). Nivel 2 (opcional) del MÉTODO SML: overlay propio como Experiences (`estudioOpen/openEstudio/closeEstudio`; no toca capítulos, cámara ni scroll; `#estudio` abre directo, Esc cierra). Ocho capítulos — Tesis · Origen · Compresión del conocimiento · Por qué separar las disciplinas · Estudio individual · Integración · Estudio de combate · Resultado — con el texto maestro íntegro y literal. Entradas: navegación («Estudio de combate»), enlace secundario en Explore y `goToSection('estudio')`. Cierre: Explorar SML / Reservar. El Método existente (03), Bridge, hero, precios y Reserva no se han tocado.

**FAQ** (`Experience/Faq`). Acordeón entre Entrenamiento y Sobre Chen; `Content.js → faq`. Accesible desde el menú móvil.

**05 · Sobre Chen** (`Experience/ProofChen`, archivo 3D en `Environment/Archive`). Exposición editorial en cuatro estaciones: la persona → la trayectoria →
la experiencia de los alumnos (reseñas de Google) → el siguiente paso (Evaluación inicial). Fotos: `chen-azotea.jpg`, `chen-ring.jpg`. Copy: `Content.js → dossierItems, resenasGoogle`.

**06 · Reserva** (`Experience/Reserva`). Dos caminos: *Ya sé lo que quiero* (calendario inline de Calendly, Sesión Privada 30 €) y *Todavía no lo tengo claro* (vuelve a Explore).
Aviso legal enlazado. WhatsApp y formulario viven en el Footer.

**Experiences / B2B** (`Experience/B2B`, datos en `Data/B2B.js`). Overlay `#xp`, scroll vertical: Experiences → Categorías (Empresas · Hoteles · Residenciales · Eventos · Marcas)
→ Selected Work (El Corte Inglés) → Case Study → Contacto (brief por WhatsApp). Sin escena 3D propia. Enlace directo `/#empresas`. Lo no documentado se guarda como `null` y no se pinta.

**Páginas legales** (`UI/Legal`): `/privacidad` y `/aviso-legal`, sin canvas 3D.

## 3 bis. 03–06: DOM ligado a los objetos 3D (estaciones)
En 03–06 el contenido ya no es una pantalla plana sobre el 3D: cada paso es una **pieza que ya existía** y el DOM cuelga de ella.
`Scene/Camera/waypoints.js` (`stageCamera`, `stationWorld`) es la fuente única: la cámara se asienta en cada estación con meseta y planea a la siguiente;
`Camera/index.jsx` proyecta esos puntos a pantalla cada fotograma (`scrollState.station`) y `Experience/useStation.js` mueve/escala la placa (profundidad Z → escala,
inclinación mínima). En ≤700 px la placa se acopla abajo y el 3D sube. No hay geometría ni líneas nuevas.
| Cap. | Estaciones (pieza 3D) | Líneas que responden |
|---|---|---|
| 03 | Te conozco · Te observo · Entrenamos · Adaptamos · Seguimos = los cinco módulos de la máquina (`machineSpec`) | arista de la plataforma (respira con la cámara) y rodillo de cada módulo |
| 04 | Formato = elección directa (ventana del tambor) · Frecuencia (aguja) · Combinación (bandeja) · Resultado (palanca) — `Slot/rackSpec.js` | la propia máquina (tambor, huecos) |
| 05 | Los pilares que el archivo ya ilumina por estación (`ARCHIVE_STATION_SLABS`); la foto cuelga del primero | aristas del archivo (mismos pesos) |
| 06 | Aproximación → puerta → reserva sobre el aro de `Door.jsx` (con la reserva abierta la cámara ya está dentro) | filo luminoso del aro |

## 3 ter. 03→06: un solo travelling
03–06 se perciben como un único edificio, no como cuatro salas con un fundido entre ellas.
- **Anclas**: `anchorZ` (waypoints.js) deja 01→03 como estaba (40 m) y compacta 04, 05 y 06 a 24 m una de otra (z = −104, −128, −152; siempre pares para que las juntas de los suelos caigan sobre la retícula de 2 m).
- **Cámara**: los tres umbrales (03→04, 04→05, 05→06) usan `thresholdCamera` (waypoints.js): un camino de Catmull-Rom por longitud de cuerda, con los extremos EXACTAMENTE en `stageCamera` al aspect real (sin tirón al entrar/salir del umbral, tampoco en móvil) y dos puntos intermedios que **rodean** la pieza que se deja atrás (lado de la plataforma de 03 y hueco del marco del fondo · izquierda del bastidor de 04 · extremo de la hilera de volúmenes de 05) en lugar de atravesarla. Misma óptica (50 mm), siempre mirando hacia delante.
- **Sin velo**: `TransitionVeil.jsx` ya no oscurece 03→04, 04→05 ni 05→06 (`NO_VEIL`). 02→03 conserva su velo.
- **Visibilidad solapada** (progreso de scroll real, determinista y reversible): la sala 03 se apaga *después* de cruzar el fondo y su panel trasero se disuelve (`RoomArchitecture.jsx`, 10 %→45 % del umbral) dejando el marco como umbral abierto; el bastidor de 04, el archivo de 05 y los suelos pulidos se asoman a lo lejos pronto y se retiran tarde (`roomGain.js`, `machineGain.js`, `floorGain.js`), de modo que la cámara nunca cruza un vacío.
- **03 → 04, la misma nave (v27→v28)**: la máquina de 04 es el siguiente instrumento del laboratorio, no otro mundo. `HybridRack.jsx` usa la paleta de la máquina de 03 (`machineSpec.PALETTE`: grafito, acero, aluminio; filete `PALETTE.light` en lugar del rojo de feria), el mismo entorno de reflexión (`SelectionMachine.makeStudioEnv`, exportado) y grabados con Inter Tight / JetBrains Mono como `machinePaint.js`. `Slot/SlotHall.jsx` pone detrás del rack techo con las luminarias de `FINISH.lights` (`paintCeiling`), el marco del fondo y las cornisas de la sala 03 (`roomBeams`, sin marco frontal ni paredes laterales ni suelo propio): su borde delantero toca el fondo de la sala 03 y el suelo pulido (`FinishedFloor`) llega hasta el rack. Ganancias en `machineGain.js`: `getHallGain` (0 → 40 % del umbral) y `getSlotGain` adelantado (5 % → 50 %) se solapan con la sala 03 (se apaga 40 % → 80 %): no hay tramo de hangar. **Una sola voz**: `Experience/useThresholdFade.js` atenúa el DOM por el progreso real del umbral 03→04 (copy de Método 0 → 35 %; «De las posibilidades a tu caso» 55 % → 90 %, cuando el rack ya tiene cuerpo). No es un velo (`NO_VEIL` sigue igual); cámara, `scrollState` y `waypoints` no se han tocado. El CTA fijo de 30 € ya está OFF en Método y Entrenamiento (`StickyCTA` → `LOCAL_CTA`), también durante el umbral.
- **Móvil**: altura mínima de cámara `MIN_EYE_Y = 0,4 m` en `stageCamera` (la aproximación a la puerta en vertical dejaba la cámara bajo el suelo); el punto de mira conserva su elevación, así que el encuadre apenas cambia.

## 4. Sistema de navegación
- **Secciones** (`App/sections.js`): `home · explore · method · training · experiences · founder · book`. La **sección** manda; el capítulo 3D la ilustra.
- Menú (`UI/Navigation`): Disciplinas · Método · Entrenamiento · Sobre Chen · Empresas · Reservar (acción con acento); móvil: botón MENÚ con las mismas entradas. **DESCUBRIR no es entrada del menú**: es una de las dos acciones de la portada (RESERVAR / DESCUBRIR → `goToSection('explore')`, Explore/`exploreFocus` intactos) y sigue en el footer y Estudio. La entrada resaltada es `activeSection`.
- `goToSection(id)` (`Scene/Transitions/navigation.js`) salta directo: un velo breve cubre el cambio y la cámara se coloca en destino. Desde HOME hacia Explore recorre el
  Bridge con scroll animado (hay copy que leer). `irAReservar()` abre el calendario y salta a Reserva (hero, CTA fijo, menú y footer).
- **Recorrido del cliente (corrección sobre V27)**: DESCUBRIR (`explore`, foco `modos`) y DISCIPLINAS (foco `disciplinas`) son dos puertas del mismo capítulo; cambiar de puerta NO borra ninguna selección (`selectedDiscipline`, `selectedTrainingMode`, `selectedFormat`, `selectedFrequency`, `planHibrido`); `selectedDiscipline` solo se limpia por una acción explícita («Ver las 3» o volver a tocar la disciplina). Vuelta a DESCUBRIR (siempre `goToSection('explore')`): enlace «No sé qué quiero → Descubrir» en Entrenamiento y en Disciplinas, camino «Todavía no lo tengo claro» de Reserva, hero y footer. Sobre Chen ofrece «Elegir mi entrenamiento» además de Reservar. El CTA fijo de character-select: desde Disciplinas → Descubrir; dentro de Descubrir → Método («Ver el método»).
- CTA fijo contextual (`UI/StickyCTA`), una acción primaria por contexto: Disciplinas/Descubrir → DESCUBRIR MI ENTRENAMIENTO · Método → RESERVAR EVALUACIÓN · 30 € · Entrenamiento → ELEGIR MI ENTRENAMIENTO · Sobre Chen/FAQ → RESERVAR · 30 € · Home/Reserva/footer → sin CTA fijo. Controles ↑/↓ (`UI/Controls`): capítulo anterior / siguiente.
- B2B no altera el scroll: al cerrar (`VOLVER AL LAB`, Esc) se vuelve donde estaba.

## 5. Estado y datos
- **Continuo** (progreso de scroll, sin renders de React): `Scene/Transitions/scrollState.js`.
- **Discreto** (`App/store.js`): `activeSection`, `activeChapter`, `selectedTrainingMode`, `selectedDiscipline` (Explore) · `selectedGoal`, `selectedFormat`, `selectedFrequency`, `planHibrido` (Entrenamiento) ·
  `substage` (Método) · `bookingState` (`idle|open|pending|confirmed`) · `b2bOpen` · `debug`.
- Estado mutable de la máquina del Slot: `Experience/Slot/slotState.js`.
- Contenido: `Data/Content.js` (capítulos, hero, Bridge, Explore, Método, Sobre Chen, FAQ, Reserva, `site` con teléfono/Instagram/Maps/Calendly), `Data/Disciplines.js`, `Data/Programs.js`, `Data/Slot.js`, `Data/B2B.js`, `Data/Grupos.js`, `Data/Legal.js`, `Data/Media.js` (assets).

## 6. Interacción
- Scroll continuo + salto directo por sección. Todo lo importante es táctil: sin hover obligatorio; en Explore un toque enfoca/selecciona (`blockouts.jsx → CharacterHitArea`).
- `prefers-reduced-motion` desactiva animación no esencial; `isCoarsePointer` (scrollState) adapta puntero táctil.
- Foco visible en todo lo interactivo; botones ↑/↓ y menú con `aria-label`.

## 7. Cámara
`Scene/Camera/waypoints.js` (poses por tramo, `segmentEase` con punto magnético en Entrada, lentes) y `Scene/Camera/index.jsx`. Capítulos 01→03 separados 40 m en Z (`CHAPTER_SPACING`); 03–06 forman un recorrido continuo con anclas a 24 m (`CONTINUOUS_SPACING`, ver «3 ter»).
En Explore la cámara calcula distancia y fov para que las tres vitrinas quepan siempre (cualquier aspecto) y usa `setViewOffset` para dejar sitio al panel; el desplazamiento
lateral al elegir solo insinúa el giro. Fuera de Explore el offset se desactiva.

## 8. Responsive
- Puntos de corte principales: **≤700 px** (móvil: Método y Entrenamiento en flujo vertical, menú desplegable) y **≤900 px** (tablet/estrecho); además ≤380 px, alturas bajas y `hover`/`pointer`.
- Explore: `aspect ≥ 1,1` → panel a la izquierda (≈40 %) y 3D a la derecha; `aspect < 1,1` → 3D en la franja superior (32 %) y panel debajo con el vídeo local de la disciplina
  (`Scene/Environment/cells.js → exploreRegion`, mismo corte que `.ex__panel`).
- Los volúmenes 3D escalan con `layoutK`; la máquina del Slot se centra en vertical y se desplaza a la derecha en apaisado.

## 9. Assets (`src/Assets`)
Todos los archivos presentes están referenciados desde `Data/Media.js` o el 3D.
| Grupo | Archivos | Uso |
|---|---|---|
| Hero | `Images/hero-lab.jpg` | fondo de Inicio |
| Bridge | `Video/TYSON_Bridge.mp4`, `MCGREGOR_Bridge.mp4`, `Images/bridge-hall-reference.jpg` | Bridge y muro de fondo |
| Luchadores | `Video/{boxeo,k1,muay-thai}-cell.mp4`, `Images/still-*.jpg` | vitrinas de Explore (vídeo sobre negro, mezcla aditiva) |
| Conjunto | `Video/roster-completo.mp4` + `Images/roster-completo-poster.jpg` | `RosterGroup` |
| Chen | `Images/chen-azotea.jpg`, `chen-ring.jpg` | Sobre Chen |
| El Corte Inglés | `Images/eci/*`, `Video/eci/*` | caso de B2B |
| Entrenamiento | `Video/entrenamiento/{sala,exterior}.mp4` + pósters | `EnPractica` (se detectan por nombre) |
Preparar clips nuevos: `scripts/prepare-media.sh` (requiere ffmpeg). `Assets/3D` y `Assets/Audio` están vacíos (sin uso).

## 10. Grupos reducidos (backend)
Buscador por demanda acumulada: `Experience/Slot/GrupoFinder.jsx` → `Data/gruposApi.js` → `/api/grupos` (`netlify/functions/grupos.mjs`, Netlify Blobs). Lógica única en `server/demand.js`
(clave = barrio + día + franja + frecuencia; capacidad 4). Estados `abierto` (<4), `completo` (4/4, pendiente de SML), `confirmado` (lo marca SML). `GET` solo devuelve demanda agregada.
Administración: definir `SML_ADMIN_TOKEN` en Netlify; `GET /api/grupos?vista=admin` (cabecera `x-sml-admin`) y `PUT {clave, confirmado}`. En `npm run dev` la API es en memoria y empieza vacía.

## 11. Estado de cada módulo
| Módulo | Estado |
|---|---|
| Inicio + Bridge + Explore | Completo (flujo de selección, 3D, cámara, responsive). |
| Método | Completo (escritorio con pin, móvil en flujo). |
| Entrenamiento | Completo, incluida la máquina híbrida (tambor, palanca, clic y piloto responden a +/−). |
| Grupos reducidos | Completo en front y función Netlify; requiere `SML_ADMIN_TOKEN` en producción para la vista de administración. |
| Sobre Chen | Completo. |
| Reserva | Completo (Calendly inline; confirmación por `postMessage`). |
| Experiences / B2B | Completo con el único caso documentado; el resto de datos del caso no se inventa (`null`). |
| Footer, legales, CTA fijo | Completo. |

**Pendiente conocido (heredado, no reverificado en esta entrega):** el vídeo de Muay Thai tenía una mancha junto al pie derecho en algunos instantes; conviene regenerarlo con los mismos ajustes que el boxeador.
**No incluido:** scroll suave (Lenis) y audio (`Assets/Audio` vacío).

---

# HISTÓRICO / LEGACY
Fuera de esta arquitectura, y sin mezclarse con ella:
- `docs/HISTORICO.md` — README anterior íntegro (generaciones previas).
- `src/_legacy/` — código retirado y aislado: Slot anterior, Umbral «¿Qué vienes a buscar?», campos retirados del store, estilos huérfanos. Ver `src/_legacy/README.md`.

**Continuidad visual** (`styles/global.css`, bloque final «CONTINUIDAD VISUAL GLOBAL»). Capa aditiva de tokens `--cx-*` (viñeta, velos, superficies translúcidas, líneas, halos, cotas de esquina) y ajustes de presentación por escena (Bridge, Explore, Método, Entrenamiento, FAQ, Chen, Reserva, Estudio, Navegación). Cada `<section>` de capítulo lleva `data-scene`. No se ha tocado copy, precios, lógica, escena 3D ni orden de capas. Estado anterior: commit «backup v27 antes de continuidad visual».

## MI SML · zona privada (`/mi-sml`)

Aplicación independiente de la experiencia pública (`src/Client/`, sin canvas 3D). **Pasos 1–3 = entrada, autenticación y API privada**; todavía no hay Airtable, ni datos, ni dashboard.

```
NAVEGADOR → MI SML → clientApi.js → GET /api/mi-sml/me → valida la sesión (Auth0) → identidad (sub del token) → [PASO 4] fuente de datos
```

- **Autenticación** (paso 2): Auth0 (Universal Login, Authorization Code + PKCE, `@auth0/auth0-spa-js`), tokens en memoria. Estados en `MiSML.jsx`: `loading` · `unauthenticated` · `authenticated` · `error`.
- **API privada** (paso 3): `netlify/functions/mi-sml-me.mjs` (ruta en `netlify.toml`; en desarrollo, el middleware `devMiSml` de `vite.config.js`). Lógica en `server/miSml.js` (autorización e identidad) y `server/miSmlAuth.js` (validación del JWT con `jose` y las claves públicas del tenant, solo RS256, emisor y audiencia comprobados).
- **Identidad**: sale únicamente del token validado. El endpoint no lee query, cuerpo ni parámetros: no hay forma de pedir «otro cliente». La fuente de datos (paso 4) recibirá solo `{ sub }`.
- **Respuestas** de `GET /api/mi-sml/me`: `200 {session:'valid', data:'not-connected'}` (hoy) · `401` (`unauthenticated` / `invalid-session` / `session-expired`) · `403` · `404` · `405` · `500 {error:'internal'}`. Nunca tokens, trazas ni datos de otras personas.
- **Una sola capa en el frontend** (`clientApi.js`): habla solo con `/api/mi-sml/me`, con el token en la cabecera `Authorization` (nunca en la URL).
- **Variables** (ver `.env.example`): públicas `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`; de servidor (sin `VITE_`) `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`. Sin secretos en el navegador.
- **Auth0 (externo)**: aplicación SPA con *Allowed Callback URLs*, *Allowed Logout URLs* y *Allowed Web Origins* = `https://<dominio>/mi-sml` (y `http://localhost:5173/mi-sml`); una **API** registrada con su *Identifier* (= audiencia) y algoritmo RS256. Recomendado un dominio propio de Auth0 (restauración silenciosa de sesión en Safari/Firefox).
- **Pruebas**: `npm run test:mi-sml` (lógica de autorización, sin red ni dependencias).
