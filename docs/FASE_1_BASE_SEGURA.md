# Fase 1: base segura para modificar C.S.OTALLER

Revisión: 15 de octubre de 2026, zona America/Santiago.

## Estado comprobado

- [x] Rama local `codex/estabilizacion-mvp`, creada desde `release/saas-mvp`.
- [x] Commit local de referencia: `a315f1934975f30640ad15d5a77dd5320e527aea`.
- [ ] Backup identificado de producción, con restauración de prueba completada.
- [x] Revisión de archivos sensibles y secretos configurados en Git local.
- [x] README principal y frontend actualizados con capacidades y pendientes actuales.
- [ ] Confirmar correspondencia de variables de producción y base de Neon.
- [x] Compilación local de frontend y API.
- [x] Despliegues existentes de producción en Vercel en estado Ready.
- [ ] Build en Vercel de la rama de estabilización; esta revisión no la publica.
- [ ] Relacionar de forma verificable el commit y el esquema con producción.

La fase sigue abierta. Un commit local, un despliegue Ready y un backup de
datos son referencias diferentes. Ninguna sustituye a las otras dos.

El [registro del plan maestro](REGISTRO_AVANCE_PLAN_MAESTRO.md) detalla cada
entrega y contiene un texto breve para actualizar el registro del PDF.

## Referencia de código

La rama de estabilización parte exactamente del commit indicado arriba.
`release/saas-mvp` se conserva sin modificaciones. La referencia local creada
es el tag `mvp-base-estabilizacion-2026-10-15`, apuntando a ese mismo commit.
No debe identificarse como una copia exacta de producción hasta verificarlo.

Comprobaciones desde la raíz del repositorio:

```powershell
git status --short
git show --no-patch mvp-base-estabilizacion-2026-10-15
git merge-base release/saas-mvp codex/estabilizacion-mvp
```

El tag y la rama locales no constituyen un respaldo remoto. La consulta de
GitHub no encontró `release/saas-mvp` ni `codex/estabilizacion-mvp` en el remoto
durante esta revisión. Debe confirmarse su publicación en Git antes de depender
de ellos como recuperación fuera del PC.

## Producción observada

Cuenta de Vercel: `crsanmartinoreact-7459s-projects`.

| Aplicación | Proyecto | Deployment ID | Estado |
| --- | --- | --- | --- |
| Frontend | cso_taller | dpl_ADk1bU7M2rKqF9Fh1SCwqXnhuj2m | Ready |
| API | csotaller-api | dpl_J4xFDSTSQ1peRhuK79GujhqUM51K | Ready |

Despliegues creados el 13 de octubre de 2026. Sus alias observados son
https://csotaller.vercel.app y https://csotaller-api.vercel.app.

Comprobaciones HTTP realizadas sin sesión y sin leer datos de clientes:

| Ruta | Resultado |
| --- | --- |
| Frontend /login | 200 |
| API /api/health | 200 |
| API /api/database/health | 200 |
| API /api/customers | 401 |

Estas comprobaciones no certifican todos los flujos funcionales ni la igualdad
entre el código local y el desplegado.

## Compilación local

Ambos comandos terminaron con código de salida 0, sin errores de compilación:

```powershell
pnpm --dir apps/web run build
pnpm --dir apps/api run build
```

Next.js completó TypeScript y generó las 21 páginas estáticas indicadas por
el build. NestJS completó `nest build`. No se ejecutaron pruebas que creen
registros en Neon como parte de esta verificación.

## Variables de entorno y Git

La inspección del historial local alcanzable revisó 9 commits y 411 objetos
de texto: no detectó archivos sensibles versionados, claves privadas,
patrones de tokens reconocidos ni coincidencias con los secretos configurados.
Es una revisión limitada por patrones y por las referencias locales;
no certifica forks, logs externos ni historial remoto eliminado.

Los archivos `.env`, `.env.*`, `.neon` y `.vercel/` están ignorados.
Se permite versionar únicamente `.env.example` con valores de ejemplo.
Los dumps y las carpetas privadas de backup también deben permanecer fuera de Git.

| Aplicación | Variables que revisar en el entorno correspondiente |
| --- | --- |
| API | DATABASE_URL, JWT_SECRET, SETUP_TOKEN, CORS_ORIGINS, PORT, HOST |
| Frontend | API_URL, solo en servidor; sin credenciales de Neon |

No copiar valores en documentación, incidencias, capturas ni comandos que
queden en el historial. Vercel exportó las variables sensibles de Production
como marcadores ocultos, por lo que esa exportación no permite compararlas.
La revisión de Git no demuestra que las variables de Vercel sean correctas.

## Backup pendiente y condición para migrar

La conexión local de la API responde con PostgreSQL 18 y 17 tablas públicas.
Su correspondencia con la base y rama de producción todavía no está confirmada.
Las herramientas PostgreSQL 16 instaladas no sirven para generar un dump de
un servidor PostgreSQL 18. No existe aún un archivo de backup verificado
registrado por esta revisión.

Antes de cualquier migración:

1. Identificar en Neon el proyecto, la rama y la base que utiliza Production
   del proyecto `csotaller-api`. Compararlos privadamente con la configuración
   local, sin compartir la URL de conexión ni la contraseña.
2. Usar herramientas PostgreSQL 18 y una conexión directa, sin pooler.
3. Crear un dump consistente en formato custom (`pg_dump --format=custom`).
   Entregar la conexión mediante variables de proceso o un archivo de
   contraseñas protegido; nunca escribir la contraseña en el comando.
4. Guardarlo fuera del repositorio, en una carpeta con acceso restringido.
   Registrar ID, fecha UTC, proyecto/rama/base, versión de PostgreSQL, tamaño,
   SHA-256, commit y huella del esquema. No registrar credenciales ni datos personales.
5. Comprobar el índice con `pg_restore --list` y restaurarlo en una base nueva
   y aislada usando `--exit-on-error --single-transaction --no-owner --no-acl`.
   Verificar tablas, restricciones y conteos contra la misma instantánea del dump.
6. Registrar resultado de la restauración y conservar una copia protegida
   fuera del PC. Un archivo custom de PostgreSQL no está cifrado por sí mismo.

El esquema debe obtenerse de la base confirmada y conservarse privadamente
junto al backup. Los archivos de `database/migrations/` describen cambios
previstos, pero no prueban cuáles están aplicados en producción.

Referencias oficiales:
[backup de Neon con pg_dump](https://neon.com/docs/manage/backup-pg-dump),
[pg_dump de PostgreSQL](https://www.postgresql.org/docs/current/app-pgdump.html).

## Rollback de la aplicación

Este procedimiento está documentado; no se ha ejecutado durante la revisión.
El rollback de Vercel no revierte Neon ni restaura variables de entorno.

1. Detener nuevas publicaciones y cambios de esquema. Identificar el incidente,
   el último despliegue sano y su compatibilidad con el esquema actual.
2. Si el esquema sigue siendo compatible, volver al deployment de referencia
   del proyecto afectado. Verificar primero que sigue disponible en Vercel.
3. Ejecutar solo el comando correspondiente al proyecto afectado, desde su
   carpeta vinculada. Los siguientes IDs son las referencias observadas en
   esta revisión; actualizar la referencia después de una nueva versión validada.

Frontend, desde la raíz del repositorio:

```powershell
pnpm dlx vercel@62.1.0 rollback dpl_ADk1bU7M2rKqF9Fh1SCwqXnhuj2m --scope crsanmartinoreact-7459s-projects
```

API, desde `apps/api`:

```powershell
pnpm dlx vercel@62.1.0 rollback dpl_J4xFDSTSQ1peRhuK79GujhqUM51K --scope crsanmartinoreact-7459s-projects
```

4. Confirmar alias y estado Ready, `/login`, health de API y base, rechazo de
   solicitudes sin sesión y acceso de un usuario autorizado al taller correcto.
5. Probar lectura de clientes, vehículos y portal QR, y registrar el resultado.
   Cualquier prueba de escritura debe usar un entorno de pruebas separado.

## Recuperación de datos

Si hubo una migración incompatible o pérdida de datos, no basta con revertir
la aplicación. No ejecutar una restauración destructiva sobre producción.

1. Suspender escrituras y conservar una copia del estado afectado, junto con
   la hora de corte, para poder reconciliar operaciones posteriores al backup.
2. Verificar el SHA-256 del backup identificado y restaurarlo en una rama/base
   aislada de Neon con herramientas compatibles, según el ensayo anterior.
3. Validar esquema, relaciones, conteos, separación entre talleres y compatibilidad
   con la versión de la aplicación elegida. No publicar filas o credenciales.
4. Antes del cambio, acordar el punto de recuperación y el tratamiento de los
   registros posteriores al backup; restaurar una copia antigua puede perderlos.
5. Cambiar privadamente la conexión de la API a la base restaurada validada,
   redesplegar la API y verificar los flujos antes de reabrir las escrituras.
6. Conservar la base afectada hasta completar la reconciliación y aprobación.

La recuperación de datos no está ensayada todavía. No ejecutar migraciones
hasta cerrar la identificación de producción, el backup y su restauración de prueba.
