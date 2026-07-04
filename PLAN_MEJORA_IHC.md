# Plan de Mejora — Auditoría IHC / UX / Integración

> **Estado (02 Jul 2026): EJECUTADO.** Los puntos 1–8 de la hoja de ruta fueron implementados y verificados de extremo a extremo: autenticación real contra `/api/auth/login` (SHA-256, rol decidido por el servidor), fuente única `/api/users` consumida por Directorio/Perfil/Admin/Certificador, pujas persistidas vía `POST /api/auctions/:id/bids` con validación de servidor y ranking real (sin postores ficticios), panel del certificador conectado a `/api/certifications`, fix del sidebar en `AppLayout`, i18n completa, Mascotas conectado a `/api/mascots` con fallback avisado, `VITE_BACKEND_URL` respetado y estados de error visibles en Home/Subasta. Pendientes: auditoría de accesibilidad (§12) y paginación del feed (§2).

> Documento de trabajo derivado de una evaluación crítica de usabilidad (heurísticas de Nielsen), consistencia visual e integración real frontend↔backend. No es una lista de "nice to haves": cada punto marcado 🔴 representa algo que rompe la confianza del usuario o la integridad de los datos.

**Leyenda de severidad**
- 🔴 Crítico — el sistema miente sobre su propio estado (dato falso, no persistido, o inseguro)
- 🟠 Alto — rompe una heurística de usabilidad de forma visible y reproducible
- 🟡 Medio — inconsistencia o deuda técnica con impacto UX moderado
- 🟢 Pulido — mejora de calidad, no bloqueante

---

## 0. Hallazgo transversal — "Islas de datos" sin fuente única

Antes de ir módulo por módulo, el problema estructural que explica la mayoría de los síntomas:

**No existe un endpoint `/api/users`.** Cada pantalla que necesita mostrar personas (Directorio, Perfil, Admin, Panel del Certificador, Sidebar) define **su propio arreglo hardcodeado** de usuarios de prueba, con datos que ni siquiera coinciden entre sí:

| Archivo | `u1` coins | `u1` certs |
|---|---|---|
| `CertifierDashboard.jsx:57` | 24 | 8 |
| `UserSearch.jsx:46` | 24 | 8 (`certifications`) |
| `AdminDashboard.jsx:46` | 24 | 8 |

Hoy coinciden por casualidad porque nadie las ha tocado por separado — pero son 4 fuentes de verdad independientes. El día que se edite un perfil en un módulo, los otros tres quedarán desincronizados sin que nadie lo note.

**Plan:** crear `backend/src/routes/users.routes.js` + `users.controller.js` + `data/users.json` como fuente única, y un `usersService.js` en frontend que sea el único punto de lectura. Esto es prerrequisito para casi todo lo demás (autenticación, directorio, admin).

---

## 1. Autenticación — 🔴 Crítico (bloqueante, hacer primero)

**Estado actual:** tres sistemas de credenciales que no se comunican:
1. `Login.jsx` — 4 cuentas hardcodeadas en el propio componente, escribe directo a `localStorage`.
2. `authService.js` — cuenta hardcodeada distinta, **código muerto**, nadie lo importa.
3. `backend/auth.controller.js` — cuenta hardcodeada distinta, **endpoint nunca invocado**.

**Riesgo:** cualquiera puede escribir `localStorage.numismatic_user` desde la consola del navegador y entrar como `admin` sin credenciales. No hay sesión real, no hay expiración, no hay backend involucrado en absoluto.

**Plan de acción:**
- [ ] Decidir: ¿el backend valida contra `users.json` (con contraseña hasheada, aunque sea bcrypt simple para el prototipo) o se asume explícitamente "modo demo sin backend"? Elegir uno y **eliminar el otro código muerto**.
- [ ] Si se elige backend real: `Login.jsx` debe hacer `POST /api/auth/login` y guardar solo el token/usuario que el backend confirme — nunca decidir el rol en el cliente.
- [ ] Eliminar `authService.js` si no se usa, o convertirlo en el único punto de entrada (hoy compite con la lógica inline de `Login.jsx`).
- [ ] Agregar expiración de sesión simulada (ej. 24h) para que "cerrar sesión" tenga sentido más allá de un botón decorativo.
- [ ] Roles: verificar en el backend, no solo en `RequireRole` del frontend (hoy un usuario que edite su propio `localStorage` puede saltarse el control de rol en cualquier fetch directo a la API, porque el backend no valida quién hace la petición).

---

## 2. Módulo Noticias / Home — 🟠

**Lo que funciona bien:** feed conectado a `/api/posts`, likes/comentarios persisten en backend, buen uso de toasts.

**Problemas:**
- 🟠 El feed mezcla posts, ventas y subastas en una sola lista sin distinción visual fuerte de tipo (solo un ícono pequeño) — un usuario que hojea rápido no distingue "esto es una noticia" de "esto es un lote de subasta a punto de cerrar".
- 🟡 Sin estado de carga (skeleton) — el feed pasa de vacío a lleno de golpe. Con conexión lenta o backend caído, la pantalla queda en blanco sin indicación.
- 🟡 Sin paginación / scroll infinito — todos los posts se cargan de una vez; no escala.

**Plan:**
- [ ] Skeleton loaders para el feed mientras `fetchPosts()` resuelve.
- [ ] Diferenciar tarjetas de subasta/venta con badge de color y CTA propio ("Ver lote →") en vez de tratarlas como un post más.
- [ ] Paginación o "cargar más" cuando el dataset crezca.

---

## 3. Módulo Inventario (Ledger) — 🟡

**Lo que funciona bien:** CRUD completo contra `/api/coins`, confirmación + **Deshacer** al eliminar (buen patrón, mantenerlo como estándar del resto del sistema).

**Problemas:**
- 🟡 Placeholder `"Search record book..."` en inglés ([Ledger.jsx:892](numismatic-archive/src/pages/Ledger.jsx:892)) — todo el resto de la app está en español.
- 🟡 Botón `Filter` en inglés ([Ledger.jsx:928](numismatic-archive/src/pages/Ledger.jsx:928)) junto a `REGISTRAR PIEZA` en español.
- 🟡 Badge `CERTIFIED` en inglés ([Ledger.jsx:96](numismatic-archive/src/pages/Ledger.jsx:96)).
- 🟢 Los botones de vista (grid/lista) tienen `title` pero no `aria-label` — un lector de pantalla los anuncia peor que el resto de botones de la app, que sí usan `aria-label` consistentemente.

**Plan:**
- [ ] Pasada global de i18n: buscar y traducir todos los strings en inglés (`Search record book...`, `Search archives...`, `Filter`, `CERTIFIED`).
- [ ] Añadir `aria-label` a los toggles de vista.
- [ ] Replicar el patrón "confirmar + deshacer" de este módulo en Ventas y Certificaciones si no lo tienen ya.

---

## 4. Módulo Ventas (Sales) — 🟡

Mismos problemas de idioma que Inventario (comparten patrón de código):
- 🟡 `"Search record book..."` ([Sales.jsx:492](numismatic-archive/src/pages/Sales.jsx:492)).
- 🟡 Botón `Filter` ([Sales.jsx:530](numismatic-archive/src/pages/Sales.jsx:530)).

**Plan:** mismo fix de i18n que Inventario. Considerar extraer un componente `<SearchToolbar>` compartido entre Ledger/Sales/Certification para no duplicar el mismo bug tres veces (ya se duplicó dos).

---

## 5. Módulo Certificaciones — 🟡

- 🟡 `"Search archives..."` en inglés ([Certification.jsx:281](numismatic-archive/src/pages/Certification.jsx:281)).
- ⚠️ Pendiente de auditar a fondo: verificar que el flujo de "solicitar certificación" → panel del certificador → resolución esté realmente conectado extremo a extremo (el panel del certificador si usa su propio array de clientes hardcodeado, ver punto 8).

**Plan:**
- [ ] Fix de i18n.
- [ ] Prueba de extremo a extremo: crear solicitud como `usuario`, verificar que aparece en `CertifierDashboard` para el rol `certificador`, resolverla, y confirmar que el estado se refleja de vuelta en el inventario del usuario original.

---

## 6. Módulo Subasta — 🔴 Crítico

**Este es el módulo más aparatoso del sistema y el menos real.**

- 🔴 Pujar (`Ofertar`) **nunca llama al backend**. `updateAuctionAPI` existe en `coinsService.js` pero `AuctionRoom.jsx` no lo invoca al confirmar una puja ([AuctionRoom.jsx:165-172](numismatic-archive/src/pages/AuctionRoom.jsx:165)). Refrescar la página borra tu puja.
- 🔴 El ranking de "competidores" es un guion fijo: `Don_Historiador` y `Curadora_Lurn` siempre pujan `tu_oferta - 50` y `tu_oferta - 100` ([AuctionRoom.jsx:167-169](numismatic-archive/src/pages/AuctionRoom.jsx:167)). No hay otros usuarios reales ni concurrencia.
- 🟡 El temporizador de cierre sí es real (usa `auctionDate` del backend) — es la única parte honesta del módulo.

**Plan:**
- [ ] Conectar `handleBid` a `updateAuctionAPI(lot.id, { currentBid, bidderId })` de verdad.
- [ ] Decidir el alcance real: si no habrá multi-usuario concurrente en este proyecto, **quitar los nombres de competidores falsos** y reemplazar por un historial de pujas real (aunque sea de un solo usuario) — es más honesto que simular personas que no existen.
- [ ] Si se quiere simular concurrencia, hacerlo desde el backend (ej. un cron/job de pruebas que genere pujas), nunca hardcodeado en el componente de UI.
- [ ] Persistir el bid limit / alertas de límite también en backend, no solo en `localStorage` por lote.

---

## 7. Módulo Mensajería — 🟢

**El mejor conectado del sistema.** Usa `fetchConversations`, `sendMessageAPI`, soporta adjuntos de imagen/audio vía `/api/images/upload/messages`.

**Problemas menores:**
- 🟡 Sin indicador de "escribiendo..." ni estado de entrega/lectura — esperable en un sistema de mensajería, aunque sea simulado.
- 🟢 Falta manejo visible de error si `sendMessageAPI` falla (verificar toast de error en el catch).

**Plan:** usar este módulo como **referencia de patrón de integración** para el resto (Mascotas, Directorio).

---

## 8. Directorio de Usuarios / Perfil / Admin / Panel Certificador — 🔴 Crítico

Ya cubierto en el punto 0, pero desglosado por pantalla:

| Módulo | Fuente de datos actual | Problema |
|---|---|---|
| `UserSearch.jsx` | Array local `u1..u7` | No hay backend, resultados de búsqueda son estáticos |
| `UserProfile.jsx` | Objeto local por id | Perfil "público" no refleja datos reales del inventario/certificaciones de esa persona |
| `AdminDashboard.jsx` | Array local `u1, c1...` | Panel de "gestión de usuarios" no gestiona nada real — cualquier acción de admin (suspender, cambiar rol) no persiste |
| `CertifierDashboard.jsx` | Array local `u1...` | Lista de "clientes" del certificador es ficticia, no correlaciona con solicitudes reales de Certificación |

**Plan:**
- [ ] Crear el endpoint `/api/users` (ver punto 0) y migrar los 4 módulos a consumirlo.
- [ ] `AdminDashboard`: cualquier acción (cambiar estado, rol) debe hacer `PUT /api/users/:id` y reflejarse de inmediato — hoy es un dashboard de utilería.
- [ ] `UserProfile`: el inventario/certificaciones/ventas mostradas en el perfil de otro usuario deben venir de las mismas colecciones reales (`/api/coins?ownerId=`, etc.), no de un objeto estático con `coins: 24` fijo.

---

## 9. Módulo Mascotas — 🟠

- 🟠 El backend tiene `mascots.controller.js` y `mascots.routes.js` completos, pero **el frontend nunca los llama** — `Mascots.jsx` no importa ningún `mascotsService`. Es decoración funcional: existe una API que nadie usa.

**Plan:**
- [ ] O se conecta `Mascots.jsx` a `GET /api/mascots` (para que insignias/desbloqueos sean reales y persistan), o se elimina el backend muerto para no mantener código sin propósito. Cualquiera de las dos opciones es mejor que el estado actual de "API fantasma".

---

## 10. Layout / Navegación global — 🟠

- 🟠 **Bug confirmado en código:** `AppLayout.jsx:9` inicializa `sidebarOpen` una sola vez con `useState(() => isDesktop(window.innerWidth))`. Si el usuario redimensiona la ventana después de montar la página, el sidebar no se resincroniza con el nuevo ancho, mientras el resto del layout sí reacciona (línea 8). Provoc a estados visuales inconsistentes (contenido corrido sin sidebar visible, o viceversa).
- 🟡 El botón hamburguesa es "siempre visible" incluso en desktop con sidebar persistente — dos formas de controlar lo mismo sin necesidad aparente.
- 🟡 El colapso total de navegación ocurre por debajo de 1024px — cubre resoluciones de portátiles reales (1280×800 con zoom, ventanas en split-screen), forzando el hamburguesa con más frecuencia de la deseable.

**Plan:**
- [ ] Corregir `AppLayout.jsx` para que `sidebarOpen` se derive de `desktop` (el valor reactivo de `useWindowSize`) en vez de un `useState` congelado — o sincronizarlo con un `useEffect` que escuche el cambio de `desktop`.
- [ ] Revisar si el hamburguesa debe ocultarse en desktop cuando el sidebar es persistente (reduce ambigüedad de "¿para qué sirve este botón si el menú ya está ahí?").
- [ ] Evaluar subir el breakpoint de colapso total, o usar un colapso "solo íconos" en vez de ocultar el nav por completo entre 768–1024px.

---

## 11. Consistencia visual / idioma — 🟡 (transversal)

Resumen de todos los strings en inglés detectados (pasada de `grep`, hacer una ronda final antes de cerrar el proyecto):

- `"Search record book..."` — Ledger.jsx, Sales.jsx
- `"Search archives..."` — Certification.jsx
- `"Filter"` — Ledger.jsx, Sales.jsx
- `"CERTIFIED"` — Ledger.jsx

**Plan:**
- [ ] Grep final de palabras en inglés comunes (`Search`, `Filter`, `Sort`, `Loading`, `Save`, `Cancel`) antes de dar por cerrado cualquier sprint.
- [ ] Considerar extraer estos textos a un diccionario simple (`i18n/es.js`) aunque el proyecto sea monolingüe hoy — evita que un copy/paste reintroduzca inglés (que es exactamente cómo se duplicó el mismo bug en Ledger y Sales).

---

## 12. Accesibilidad — 🟡 (no auditada a fondo, pendiente)

Lo detectado de pasada:
- Botones ícono-only son mayormente consistentes con `aria-label` (buena práctica ya establecida) — pero hay excepciones puntuales (ver punto 3).
- Pendiente: contraste de color del texto de navegación no activo (`rgba(255,255,255,0.55)`) sobre el degradado oscuro del sidebar — verificar contra WCAG AA.
- Pendiente: navegación completa por teclado (¿se puede operar el Tutorial, los modales y el selector de mascota sin mouse?).

**Plan:**
- [ ] Auditoría de contraste con una herramienta automatizada (axe, Lighthouse) sobre cada pantalla.
- [ ] Prueba manual de navegación por teclado en los 3 flujos críticos: login, registrar pieza, pujar en subasta.

---

## 13. Infraestructura / configuración — 🟡

- 🟡 `coinsService.js` tiene `http://localhost:3001/api` hardcodeado; la variable `VITE_BACKEND_URL` del `.env` existe pero nunca se lee. Cualquier despliegue fuera de `localhost` rompe todo el fetching sin aviso.
- 🟡 Persistencia en backend vía escritura directa a archivos `.json` sin bloqueo — aceptable para prototipo, pero anotar como deuda técnica si el proyecto crece a uso concurrente real.
- 🟡 Endpoints de mutación (`DELETE /api/coins/:id`, `DELETE /api/posts/:id`, etc.) no verifican propietario ni rol — cualquier request autenticado (o no) puede borrar cualquier recurso.

**Plan:**
- [ ] Usar `import.meta.env.VITE_BACKEND_URL` en vez del string fijo.
- [ ] Middleware mínimo de "¿este recurso pertenece a este usuario?" antes de permitir `PUT`/`DELETE`, una vez exista autenticación real (depende del punto 1).

---

## Hoja de ruta sugerida (orden de ejecución)

1. **Autenticación real** (§1) — todo lo demás depende de tener un usuario/rol confiable.
2. **Endpoint `/api/users` + migración de Directorio/Perfil/Admin/Certificador** (§0, §8) — elimina la mayor fuente de datos duplicados/falsos.
3. **Conectar Subasta a backend de verdad** (§6) — es el módulo más visible y el más falso.
4. **Bug de `AppLayout` sidebar** (§10) — fix pequeño, alto impacto en percepción de calidad.
5. **Pasada de i18n global** (§11) — barata, rápida, mejora percepción de pulido inmediatamente.
6. **Conectar o eliminar Mascotas** (§9).
7. **Accesibilidad y skeleton loaders** (§2, §12) — pulido final antes de considerar el sistema "presentable".
