# Despliegue C.S.OTALLER en Vercel

Usar dos proyectos en la misma cuenta: frontend Next.js con raíz apps/web y API NestJS con raíz apps/api. El repositorio es el mismo; las dependencias se instalan desde el workspace independiente de cada app.

## API

Vercel admite NestJS directamente: https://vercel.com/docs/frameworks/backend/nestjs . La entrada es src/main.ts. Configurar Node.js 22 o superior.

Variables privadas en Production: DATABASE_URL (conexión pooled de Neon), JWT_SECRET (secreto largo aleatorio), SETUP_TOKEN (código secreto de configuración inicial). CORS_ORIGINS debe contener el dominio del frontend; HOST=0.0.0.0 es opcional en Vercel porque el código ya lo detecta. No copiar estos valores al frontend ni a Git.

Comprobar /api/health y /api/database/health. /api/customers sin sesión debe devolver 401. Los permisos y el taller se validan en el backend para cada solicitud.

## Frontend

Configurar API_URL=https://DOMINIO-API.vercel.app/api como variable del servidor Next.js y volver a desplegar. No usar NEXT_PUBLIC_API_URL. El navegador llama a /api/backend; Next.js conserva el token en una cookie HttpOnly y lo envía a NestJS.

Con API_URL definido, el frontend usa los módulos conectados enumerados en Alcance actual. Sin API_URL se conserva el modo demo; no mezclar ambos modos al probar persistencia.

## Primer acceso

Abrir /setup en el frontend publicado. El propietario debe introducir SETUP_TOKEN y crear el taller, su correo y una contraseña de al menos 12 caracteres. Ningún administrador se crea automáticamente. Después, iniciar sesión y registrar un cliente y su vehículo; al recargar deben seguir apareciendo y pertenecer al mismo workshop_id en Neon.

La configuración se cierra al existir el primer usuario. Las pruebas automatizadas usan datos sintéticos y ROLLBACK, por lo que no dejan un administrador de prueba. No guardar contraseñas ni tokens en capturas o conversaciones.

## Alcance actual

Conectados: autenticación, clientes, vehículos, perfil, usuarios del equipo, órdenes de trabajo, códigos de scanner, servicios y repuestos de las órdenes, fotografías de las órdenes, agenda, mantenciones con detalles de aceite, configuración, actividad y estadísticas operativas calculadas con los registros reales.

Servicios y repuestos se agregan desde una orden de trabajo; sus secciones muestran los trabajos y piezas registrados. Todavía no existe catálogo independiente ni inventario. El portal QR está conectado a los registros reales. El envío automático de WhatsApp, PDF, pagos y suscripciones siguen pendientes; no forman parte del envío manual.

Las fotografías se guardan como datos de imagen en Neon durante esta etapa. Las imágenes de entrada de hasta 30 MB se comprimen automáticamente; cada ficha admite hasta 20 fotos dentro de un límite conjunto de 1.500.000 caracteres de imagen y el JSON completo debe caber en 2 MB. La próxima fase puede trasladar archivos a almacenamiento de objetos.

El límite de solicitudes de NestJS usa memoria por instancia; no es un límite distribuido entre todas las funciones. Las pruebas de integración usan datos sintéticos dentro de una transacción y los revierten con ROLLBACK.

## Publicación realizada

Frontend: https://csotaller.vercel.app
API: https://csotaller-api.vercel.app/api
Primer acceso: https://csotaller.vercel.app/setup

Se publicaron los archivos locales con Vercel CLI. El proyecto API no pudo vincular automáticamente el repositorio GitHub; eso no impide este despliegue, pero la publicación automática del backend en cada push queda pendiente. Los cambios locales deben conservarse en Git antes de futuras publicaciones desde el repositorio.

Para publicar cambios desde esta copia ya vinculada, ejecutar pnpm dlx vercel@latest deploy --prod --yes en la raíz (frontend), o desde apps/api (backend). No usar comandos de publicación desde database.


Para incorporar otro administrador del mismo taller, iniciar sesión con ADMIN, abrir Trabajadores > Nuevo trabajador y elegir Administrador. No usar /setup de nuevo. La contraseña inicial la introduce la persona que administra el taller; los hashes nunca se devuelven al navegador.

## Fotografías, QR y WhatsApp

Aplicar database/migrations/20261002_customer_photos.sql antes de desplegar. La API admite JSON hasta 2 MB y el frontend comprime las fotos seleccionadas (hasta 30 MB por archivo). Las fotos del registro se guardan en customers.photos; las de trabajos siguen en photos. No es todavía almacenamiento de archivos externo.

POST /api/customers/:id/portal crea o reutiliza el token permanente del cliente. GET /api/portal/:token lista sus vehículos; GET /api/portal/:token/vehicles/:id muestra su historial sin RUT, contacto del propietario ni precios. El token es público para quien tenga el QR; respeta active, revoked_at y expires_at. Las fotos del registro permanecen en la ficha administrativa; el portal muestra fotos asociadas a trabajos.

Las preferencias de WhatsApp y autorización del cliente se guardan en Neon. El envío automático sigue pendiente de credenciales de WhatsApp Business Platform, plantilla aprobada y programación del envío. No se han incorporado pagos ni suscripciones.

Con WhatsApp del teléfono se puede preparar el mensaje desde la ficha del cliente, abrir un borrador con el QR permanente y enviarlo manualmente. No hay envío automático ni confirmación de entrega al preparar el borrador.

## Registro de talleres independientes

/registro crea un taller y su administrador mediante POST /api/auth/register, en una transacción. Rechaza RUT de taller duplicado, aplica límite de solicitudes y exige contraseña de 12 caracteres como mínimo. El nuevo administrador no hereda registros de otros talleres. Si el mismo correo existe en varios talleres, el acceso requiere el código de taller (UUID) entregado al registrar; /login?taller=CODIGO lo completa. No implica verificación de correo, suscripción ni cobros. Para ampliar un equipo existente, usar Trabajadores; no registrar otro taller.
