# C.S.OTALLER: frontend

Next.js App Router, React, TypeScript, CSS responsive y Lucide React.
Las páginas de `app/` componen los módulos; la lógica de cada funcionalidad
se organiza en `features/`, y los componentes transversales en `components/`.

## Ejecución y verificación

Desde `apps/web`:

```powershell
pnpm install
pnpm run dev
```

Compilación para producción y ejecución del resultado:

```powershell
pnpm run build
pnpm run start
```

Otros comandos disponibles: `pnpm run typecheck`, `pnpm run lint` y
`pnpm run test`. Su disponibilidad no implica que todos se hayan ejecutado en
cada entrega; el registro de avance identifica las verificaciones realizadas.

## Modo conectado

Configurar `API_URL` en `.env.local` o en las variables de servidor de Vercel.
Para la API local, el valor habitual es `http://localhost:3001/api`.
No usar `NEXT_PUBLIC_API_URL` ni incluir credenciales de Neon en el frontend.

El navegador llama a `/api/backend`; el servidor Next.js comunica la petición
a NestJS y gestiona la cookie de autenticación HttpOnly. La API valida
identidad, permisos y pertenencia al taller.

Clientes, vehículos, órdenes, mantenciones, agenda, equipo, perfil,
configuración, estadísticas operativas, portal QR, presencia y notificaciones
utilizan los módulos conectados. La persistencia depende de NestJS y Neon.
Crear las cuentas mediante el flujo real; las credenciales de demostración
no son cuentas de producción.

## Modo demo

Sin `API_URL` existe una simulación con mocks. Sus registros, sesiones y
permisos no equivalen al modo conectado y no verifican persistencia real.
Usar ese modo solo para revisar interfaz, nunca para dar por terminado un
flujo que deba guardar datos en Neon.

## Portal QR y fotografías

El enlace `/mi-taller/[token]` representa al cliente y reúne sus vehículos.
El detalle se abre en `/mi-taller/[token]/vehiculos/[vehicleId]`.
El visitante consulta historial, fotos del trabajo y próximas mantenciones.
No se deben mostrar RUT, contacto del propietario ni precios administrativos.
La API limita la consulta al alcance del token; quien posea el enlace puede
abrirlo. No publicar tokens reales en documentación o capturas.

El selector de imágenes comprime las fotos antes de enviarlas. Durante esta
etapa siguen almacenándose como datos de imagen en Neon, con límites de
archivo y del JSON descritos en la documentación de despliegue. El traslado
a almacenamiento de objetos es una fase pendiente, no una capacidad actual.

## Alcance y pendientes

Los servicios y repuestos se registran en órdenes; no hay inventario completo.
WhatsApp funciona como preparación de un envío manual, sin programación
automática. Recuperación automática de contraseña, sesiones revocables,
pagos, suscripciones, SUPER_ADMIN, PDF y firma digital siguen pendientes.

Consultar el [README principal](../../README.md),
[despliegue](../../DEPLOYMENT.md),
[fase 1 y rollback](../../docs/FASE_1_BASE_SEGURA.md) y
[registro de avance](../../docs/REGISTRO_AVANCE_PLAN_MAESTRO.md).
