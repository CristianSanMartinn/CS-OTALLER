# Presencia del equipo

PresenceProvider vive dentro de StoreProvider y mantiene una sesión por pestaña. usePresence consulta ese contexto; useWorkers compone búsqueda y cantidad de conectados. WorkerStatusBadge y WorkerLastSeen se reutilizan en tabla, ficha y perfil del encabezado.

Verde significa conexión reciente, blanco desconectado y rojo cuenta desactivada. Una falla al consultar presencia se muestra como Sin confirmar; no se inventa un estado online. Estar conectado no equivale a estar libre de trabajos.

La API usa HTTP autenticado: POST /presence/heartbeat cada 30 segundos, POST /presence/disconnect al salir y GET /presence para consulta. Después de 90 segundos sin señales una sesión vence. Otra sesión vigente mantiene al usuario conectado. El ADMIN recibe únicamente la presencia de su taller; WORKER solo recibe su propio registro. Ningún endpoint público del QR expone presencia.

Neon persiste las sesiones y la última conexión; no se usan mapas en memoria del servidor. Aplicar database/migrations/20261005_user_presence.sql antes de desplegar la API. La presencia funciona con los despliegues actuales sin requerir un gateway WebSocket ni servicios adicionales. Las sesiones viejas se limpian al siguiente heartbeat del usuario y su última conexión se conserva en users.

En modo demo solo la sesión actual se marca conectada; los demás trabajadores no se simulan online. Al apagar el equipo o perder internet puede demorar hasta 90 segundos más el siguiente refresco del observador en verse desconectado. El cierre normal se comunica inmediatamente cuando el navegador permite completar la solicitud.
