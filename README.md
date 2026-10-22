# C.S.OTALLER

Sistema web de gestión para talleres mecánicos, en estabilización previa al
lanzamiento comercial como SaaS multiempresa.

## Arquitectura actual

```text
Navegador → Next.js → proxy del servidor → NestJS → Neon PostgreSQL
```

- `apps/web/app/`: rutas y composición de páginas con Next.js App Router.
- `apps/web/features/`: componentes, hooks, servicios y tipos por funcionalidad.
- `apps/web/components/`: componentes reutilizables.
- `apps/api/src/`: API NestJS con autenticación y módulos operativos conectados.
- `database/migrations/`: cambios incrementales del esquema; todavía falta una
  migración inicial completa que reconstruya una base vacía.
- `packages/`: ubicación prevista para paquetes compartidos; su extracción y
  configuración como paquetes independientes sigue pendiente.

## Ejecución local

Cada aplicación conserva sus dependencias y comandos. Desde la raíz:

```powershell
pnpm --dir apps/api install
pnpm --dir apps/web install
```

Configurar los archivos privados `apps/api/.env.local` y
`apps/web/.env.local` usando los respectivos `.env.example` como guía.
Nunca copiar credenciales a Git ni al navegador.

En una terminal, iniciar la API:

```powershell
pnpm --dir apps/api run start:dev
```

En otra terminal, iniciar el frontend:

```powershell
pnpm --dir apps/web run dev
```

La API usa normalmente el puerto 3001 y el frontend el 3000. Configurar
`API_URL=http://localhost:3001/api` en el entorno del servidor Next.js para
probar contra la API local. La API requiere una conexión Neon válida,
`JWT_SECRET`, configuración de origen y, para el primer acceso, `SETUP_TOKEN`.
Consultar [despliegue](DEPLOYMENT.md) para los detalles y limitaciones.

No existe todavía un comando raíz que ejecute ambas aplicaciones.

## Verificación

```powershell
pnpm --dir apps/web run build
pnpm --dir apps/api run build
```

Los builds locales fueron verificados el 15 de octubre de 2026 sobre la base
`a315f19`. Las actualizaciones posteriores de esta entrega son documentación
y exclusiones de respaldos; no cambian el código de las aplicaciones.
Los tests de integración no deben ejecutarse contra producción: aunque
reviertan datos, pueden escribir, bloquear recursos o activar efectos secundarios.

## Funcionalidades conectadas

Autenticación, registro de talleres, roles ADMIN/WORKER, clientes, vehículos,
órdenes de trabajo, diagnóstico y scanner, servicios y repuestos de órdenes,
mantenciones, agenda, equipo, perfil, configuración, estadísticas operativas,
portal QR, presencia y notificaciones persistentes.

El QR corresponde al cliente y permite elegir entre sus vehículos. El portal
expone historial automotriz sin los campos personales y administrativos que
se reservan al sistema interno. El enlace es accesible para quien lo tenga.

Con `API_URL` definido se utilizan los módulos conectados. Sin esa variable
existe un modo demo con mocks que no representa la persistencia, autorización
ni sincronización del sistema real. No usar la demo para aceptar entregas.

## Limitaciones relevantes

- La recuperación automática de contraseña y las sesiones revocables requieren
  la fase de autenticación del plan de estabilización.
- Las fotos y logos todavía se guardan como datos de imagen en Neon; falta
  trasladarlos a almacenamiento de objetos.
- Las reglas de mantenciones requieren un tipo interno estable y un estado
  unificado entre administración, portal y recordatorios.
- WhatsApp se prepara para envío manual desde el teléfono; no hay envío
  automático ni confirmación automática de entrega.
- Servicios y repuestos reflejan lo registrado en órdenes; no hay inventario
  completo ni catálogo independiente.
- No están implementados pagos, suscripciones, SUPER_ADMIN, facturación,
  firma digital ni generación de PDF.
- Faltan completar la base reproducible y la validación integral
  multiempresa antes de abrir la venta general.

## Producción y estabilización

Frontend: https://csotaller.vercel.app

API: https://csotaller-api.vercel.app/api

Consultar [despliegue](DEPLOYMENT.md). Antes de aplicar migraciones,
identificar la base de destino, crear un respaldo reciente y comprobar su
restauración en un entorno aislado.
