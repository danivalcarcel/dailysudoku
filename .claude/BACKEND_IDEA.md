# Idea a futuro: backend opcional para sincronizar historial/progreso

**Estado: no implementado, no decidido.** Esto vive en su propia rama
(`idea/cloud-sync-google-auth`) precisamente porque es una idea, no un
compromiso — no la mezcles en `main` sin que el usuario lo pida
explícitamente. Ver también `.claude/DECISIONS.md` ("No backend, ever (so
far)") y `.claude/ROADMAP.md` ("Cross-device sync", "Real leaderboard"),
que ya apuntaban a esto.

## Por qué surgió

Todo el progreso/puntuación/historial vive hoy solo en `localStorage` del
navegador — no sigue al jugador entre dispositivos. La idea es ofrecer
login opcional con Google para quien quiera que su historial y progreso se
sincronicen en la nube, sin obligar a nadie: sin login, la app sigue
funcionando exactamente igual que ahora (100% local).

## Alcance propuesto (deliberadamente acotado)

- Solo se sincroniza **historial de puntuaciones** y **progreso de
  puzzles** (board/notes/tiempo/fallos por día+dificultad) — no se plantea
  mover ninguna otra lógica (generación del puzzle, i18n, etc.) al backend.
- Sin login: comportamiento actual sin cambios.
- Con login: los mismos datos que hoy están en `boardStorage.js`,
  `score.js` y `scoreHistory.js` viven también en el backend.

## Piezas técnicas (todo dentro de Cloudflare, sin cambiar de plataforma)

- **Auth**: botón "Iniciar sesión con Google" (Google Identity Services)
  en el frontend. El Worker verifica el ID token recibido de Google y
  emite su propia cookie de sesión firmada (HttpOnly).
- **Base de datos**: Cloudflare D1 (SQLite serverless), con tablas
  equivalentes a lo que ya persiste `localStorage` hoy: progreso por
  usuario+fecha+dificultad, e historial por usuario+fecha.
- **API**: rutas añadidas al mismo Worker que ya sirve la app estática
  (por ejemplo con Hono), tipo `POST /api/auth/google`,
  `GET/PUT /api/progress`, `GET/PUT /api/history`. No hace falta un
  servicio ni despliegue separado.
- **Frontend**: capa de sincronización que, si hay sesión, lee/escribe
  contra la API además de (o en vez de) `localStorage`.

## Cosas pendientes de aclarar antes de empezar

- **Migración del progreso ya existente en local**: la primera vez que
  alguien se loguea y ya tenía historial/progreso local, ¿se sube una vez
  y a partir de ahí manda el backend? ¿Se descarta? ¿Se pide elegir?
- **Qué pasa si juega en dos sitios a la vez** (móvil sin conexión y
  escritorio): política de conflicto entre lo local y lo remoto.
- **Vida de la sesión**: cuánto dura la cookie, si hay refresh, qué pasa
  al expirar en medio de una partida.
- **Borrado de cuenta / derecho al olvido**: si hay datos personales
  (email de Google) en D1, hace falta al menos poder borrarlos a
  petición.
- **Coste/límites gratuitos de D1** a la escala esperada de la app (probablemente irrelevante, pero conviene confirmarlo antes de comprometerse).
- **Si merece la pena un leaderboard real** una vez hay cuentas, o si el
  alcance se queda solo en "que no pierdas tu progreso al cambiar de
  dispositivo" (ver `.claude/ROADMAP.md`).

## Pasos que requieren acción manual del usuario (no los puede hacer Claude)

- Crear un proyecto y credencial OAuth (Client ID) en Google Cloud
  Console para "Sign in with Google".
- Crear la base D1 en la cuenta de Cloudflare del usuario
  (`wrangler d1 create`), lo cual requiere estar logueado
  (`wrangler login`) — mismo patrón que el resto de la infra de
  Cloudflare, ver `.claude/DEV_SETUP.md`.

## Estimación

Del orden de una tarde/día de trabajo enfocado una vez se resuelvan las
dudas de arriba, no una reescritura grande — pero es la primera vez que
el proyecto tendría un backend real, así que es un cambio de arquitectura
deliberado, no una feature más.
