# C.S.OTALLER — Frontend MVP

Next.js App Router, React, TypeScript, CSS responsive y Lucide React. Todas las páginas son composiciones; la lógica está organizada por funcionalidad en features. Los componentes transversales están en components.

## Ejecución

Desde apps/web: pnpm dev. Verificación: pnpm typecheck, pnpm lint y pnpm test. Producción: pnpm build y pnpm start.

## Accesos de demostración

- Administrador: admin@otaller.cl
- Mecánico: mecanico@otaller.cl
- Contraseña de ambos: Taller2026!

Los cambios se conservan en memoria durante la sesión de la página. Al recargar se restauran los mocks. Recordarme conserva únicamente el ID de la sesión demo; no se guardan contraseñas. Las credenciales de trabajadores creados funcionan solo durante esa sesión.

## Flujos

Clientes → registrar vehículo → nueva orden → recepción → diagnóstico → códigos scanner → trabajos y repuestos → fotos → guardar → registrar mantención vinculada → listo → entregado (admin).

Agenda permite crear y editar citas, filtrar por fecha y estado. Trabajadores permite creación, edición, desactivación y reactivación. Configuración permite editar información del taller y previsualizar un logo local. Servicios y repuestos muestran registros de órdenes, sin implementar inventario. Estadísticas muestra únicamente un conteo operativo básico.

## Modelos y permisos

features/shared/types/domain.ts contiene modelos independientes de React, preparados para migrar a packages/types. Las entidades incluyen workshopId. La demo filtra órdenes y vehículos asignados al mecánico, y restringe rutas administrativas. Los cambios de estado del mecánico siguen transiciones permitidas; entregar y cancelar quedan a cargo del administrador. Los precios solo se muestran al administrador.

Esta autenticación y estos controles son simulaciones de interfaz, no seguridad real. En el futuro el backend deberá validar identidad, pertenencia al taller, permisos y relaciones. No hay implementación SaaS real.

## Fotografías

Imágenes JPG, PNG, WebP y GIF de hasta 8 MB, hasta 20 por orden. Las vistas previas son URLs de datos locales en memoria. No hay subida a servidores ni almacenamiento persistente.

## Alcance

No se implementaron backend, base de datos, endpoints, pagos, suscripciones, WhatsApp, QR, firma, PDF, facturación, inventario ni notificaciones automáticas. El botón de notificaciones informa que esa función es futura.

## Vista del cliente y QR (demo)

Desde Vehículos → ficha del vehículo, usa **Ver como cliente** o **Ver QR**. Ejemplo: /mi-vehiculo/demo-v1. No requiere login en esta demo; no es un enlace privado real y no debe usarse para datos reales de clientes. La vista solo presenta la ficha seleccionada, sin RUT, contacto del propietario, precios ni administración. Los controles reales de acceso quedan pendientes del backend.

La ficha destaca el último cambio de aceite, kilometraje realizado, próximo kilometraje y próxima fecha. Los recordatorios se calculan al abrir la vista: pendientes si fecha/km alcanzados, cercanos a 30 días o 1.000 km. La simulación permite cambiar la fecha sin alterar registros ni enviar notificaciones. Se considera el último registro por tipo de mantención.

La galería del vehículo admite fotos sin crear una orden y se suma a las evidencias de órdenes en la vista cliente. Todo permanece en memoria: abrir un QR en otro navegador o recargar restablece los mocks, no sincroniza cambios. Para escanear desde un celular, el sitio debe ser accesible por red; localhost solo sirve en el mismo computador.

## QR por cliente y recordatorios (actualización)

El QR ahora corresponde al registro del cliente, no a su RUT ni patente. En Clientes → ficha o Vehículos → ficha se abre el mismo enlace para el mismo dueño. Ejemplo: /mi-taller/demo-client-c1 muestra Toyota y Mazda; al seleccionar un auto se consulta únicamente su historial. El código no cambia al editar contacto, patente o añadir un mantenimiento. Los clientes nuevos reciben un token mock al registrarse. Las rutas antiguas /mi-vehiculo siguen disponibles como demostraciones individuales, pero las etiquetas nuevas apuntan a /mi-taller.

La vista es pública para quien tenga el enlace. No muestra datos personales de contacto, RUT, preferencias ni importes administrativos. No se implementa seguridad real de backend. La etiqueta imprimible mide 80 mm de ancho, con QR de 55 mm, y no incluye el RUT. Usar escala 100% sin encabezados/pies del navegador. Las etiquetas definitivas necesitan URL estable y persistencia; no imprimir localhost para uso real en otros dispositivos.

En crear/editar cliente y en su ficha administrativa se configuran correo, WhatsApp, autorización y anticipación de 7/15/30 días. Se valida contacto y consentimiento antes de activar canales. La vista previa usa las preferencias guardadas y la última mantención por tipo y vehículo. Simular envío no abre WhatsApp ni correo, no envía mensajes y no programa tareas. No se han conectado proveedores ni backend.

## Perfil de usuario

El botón de usuario junto a las notificaciones abre Mi perfil y Cerrar sesión. ADMIN y WORKER pueden editar sus propios nombre, correo, teléfono, especialidad y foto (JPG/PNG/WebP, hasta 1 MB). Rol, RUT, estado y taller se mantienen protegidos. El correo actualizado sirve para iniciar sesión en la demo. Solo los perfiles se conservan en localStorage de este navegador; los otros registros siguen en memoria y no hay sincronización ni backend.
