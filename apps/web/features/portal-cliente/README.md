# Portal del cliente

El QR permanente abre la lista de vehículos del cliente. Cada tarjeta abre la ficha del vehículo en la misma ruta pública. El token se valida en la API; la ficha no requiere iniciar sesión.

## Organización

- app/mi-taller/[token]/page.tsx compone la lista de vehículos.
- app/mi-taller/[token]/vehiculos/[vehicleId]/page.tsx compone CustomerPortal.
- components/layout: cabecera y contenedor de secciones.
- components/vehicles: lista, tarjeta, marca y selector de vehículo.
- components/portal: carga de la ficha y composición de sus vistas.
- components/maintenance: próxima mantención, progreso, última mantención y detalle de productos.
- components/history: órdenes, diagnósticos, servicios y repuestos públicos.
- components/photos: adaptación de la galería global para fotos del vehículo o del servicio.
- components/reminders: avisos calculados con los registros del taller.
- hooks: consulta de datos públicos y derivación del resumen de mantenciones.
- types: contratos de vista derivados de la proyección pública existente.
- services: proyecciones mock y cálculo de próximas mantenciones.

Se reutilizan utils/format.ts y la galería global para evitar duplicar formatos y previews. No se incluyen documentos ni generación de PDF.

## Comportamiento

Resumen, Historial y Fotos son vistas del mismo vehículo. Al seleccionar una mantención se abre su detalle, con productos registrados y trabajos/fotografías de su orden asociada. Si no hay orden o fotos, se muestra un estado vacío. Los iconos de productos son ilustrativos; no representan fotografías reales ni marcas no registradas.

El progreso usa el kilometraje registrado, no seguimiento en tiempo real. El botón Contactar para agendar abre una llamada al teléfono configurado; no crea una cita automáticamente. Los avisos de esta ficha no envían recordatorios automáticos.

El frontend y la API conservan el aislamiento por taller y cliente. Nunca se toman los datos de otro vehículo por coincidencia de tipo de mantención.

## Animaciones

PortalEntrance muestra herramientas vectoriales, destello cian y logo durante un mínimo de 1 segundo, seguido de 250 ms de salida. Espera a que los datos o el error de la consulta estén disponibles. Se omite al navegar dentro del mismo QR durante la sesión de la página; una recarga vuelve a mostrarlo. Las tarjetas entran en 350 ms, el progreso en 800 ms y el cambio de vehículo sale en 150 ms. prefers-reduced-motion elimina desplazamientos, rotaciones y destellos.

La galería presenta hasta cuatro fotos en horizontal y permite consultar todas con filtros de categoría. Los productos y trabajos no se inventan; Completado se muestra cuando la orden está lista o entregada.
