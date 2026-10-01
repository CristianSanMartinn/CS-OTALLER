# C.S.OTALLER

Estructura del SaaS para talleres.

- apps/web/app: rutas Next.js. Las nuevas paginas son plantillas minimas.
- apps/web/features: componentes, servicios, tipos y hooks por funcionalidad.
- apps/web/components: componentes compartidos.
- apps/web/lib, hooks, utils y public/images: integraciones y recursos.
- apps/api/src: carpetas reservadas para NestJS; main.ts y app.module.ts son plantillas sin implementacion.
- packages/ui, types y utils: codigo compartido pendiente de implementar y configurar como paquetes.
- database/schema, migrations y seeds: organizacion de la base de datos.

Se conservaron los archivos existentes, sin instalar dependencias ni cambiar scripts.
Los archivos .gitkeep conservan las carpetas vacias en Git.

pnpm-workspace.yaml declara el workspace raiz. Se conserva el workspace local existente en apps/web.
turbo.json prepara las tareas; Turbo requiere instalacion y scripts cuando se integre el monorepo.
El backend aun requiere inicializar NestJS y sus dependencias.

Para ejecutar el frontend existente: pnpm dev desde apps/web.