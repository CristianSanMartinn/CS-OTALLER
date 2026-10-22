# Carga de la aplicación

ApplicationLoading es el componente global de entrada, reutilizado por AppShell y PortalEntrance. Espera un mínimo de 1 segundo y realiza un fundido de 250 ms cuando ready es true.

AppShell lo reinicia al cambiar el pathname; filtros, búsquedas, modales y ediciones en la misma ruta no lo repiten. Se mantiene la autorización previa a mostrar rutas administrativas.

rememberKey recuerda la entrada a un portal QR durante la navegación, sin almacenar tokens en localStorage. logo, brandName, message y contextLabel adaptan la identidad y el mensaje a cada pantalla.

La preferencia prefers-reduced-motion elimina desplazamientos y destellos. El contenido permanece inert hasta finalizar. El fondo oscuro pertenece únicamente a la carga y los módulos mantienen su fondo habitual.

Por petición del taller, la secuencia de carga conserva las animaciones de las herramientas, el engranaje, el logo y la línea de progreso incluso con movimiento reducido. Las microinteracciones del contenido siguen respetando esa preferencia.
