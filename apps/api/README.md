# C.S.OTALLER API

NestJS con PostgreSQL (Neon), autenticación JWT, permisos ADMIN/WORKER y aislamiento por taller. Los registros de clientes, vehículos y perfil se guardan en la base de datos. Órdenes, servicios, repuestos, scanner, fotografías, agenda, mantenciones y configuración también están conectados. El portal QR y recordatorios automáticos todavía no tienen integración real.

Desde esta carpeta: pnpm install y pnpm start:dev. Configura .env.local según .env.example. DATABASE_URL, JWT_SECRET y SETUP_TOKEN pertenecen exclusivamente al servidor. Nunca los publiques en Git ni uses NEXT_PUBLIC_ para estas variables.

Comprobaciones: GET /api/health, GET /api/database/health. Clientes y vehículos requieren Authorization: Bearer <token>; no reciben workshop_id del navegador. El taller se obtiene del usuario autenticado. Los trabajadores solo consultan vehículos de sus órdenes asignadas.

El primer administrador se crea desde /setup del frontend con SETUP_TOKEN y una contraseña elegida por el propietario. Se admite una sola configuración inicial; no es un registro SaaS público.

Validación: pnpm build y pnpm test:integration. Las pruebas necesitan Neon configurado y revierten sus datos dentro de una transacción.

Despliegue: consulta ../../DEPLOYMENT.md. Vercel detecta src/main.ts como entrada NestJS. Este directorio tiene su propio workspace pnpm.
