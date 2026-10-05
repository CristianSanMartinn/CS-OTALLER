# Apariencia y avisos del taller

Cada cuenta puede elegir Claro u Oscuro desde el botón de sol/luna del encabezado o desde Mi perfil. En producción se guarda en users.theme; en demostración se conserva por usuario y taller en el navegador. El portal público y la animación mantienen su identidad propia.

La campana consulta GET /api/notifications al entrar, al abrirse, tras altas locales y cada 30 segundos mientras la pestaña está visible. Los avisos nacen dentro de la transacción que registra un cliente, vehículo, orden o mantención. Una operación revertida no envía avisos. No son mensajes de WhatsApp ni notificaciones del navegador.

Clientes y vehículos generan avisos genéricos para usuarios activos del mismo taller, sin datos personales. Las órdenes individuales avisan al responsable y a los administradores; las compartidas, a todo el equipo. Las mantenciones avisan a quienes tienen acceso al vehículo y a administradores. Cada consulta vuelve a comprobar los permisos de asignación. El estado leído es individual y persiste en Neon. Se muestran los 50 avisos recientes y el contador incluye todos los pendientes. No se generan avisos retroactivos.

Aplicar database/migrations/20261005_notifications_theme.sql antes de publicar la API. El script de prueba scripts/test-notifications.cjs usa una transacción que revierte todas sus altas.
