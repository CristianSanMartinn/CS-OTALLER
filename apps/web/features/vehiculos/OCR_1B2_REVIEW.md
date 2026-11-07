# OCR 1B.2 — revisión humana y aplicación selectiva

Bloque implementado para revisión. No se hicieron commit, push ni despliegue. No se cambiaron API, proxy, esquema, contratos persistentes, órdenes, mantenciones ni Portal QR.

## Archivos exactos de este bloque

Rutas relativas a apps/web:

1. features/vehiculos/components/forms/VehicleForm.tsx
2. features/vehiculos/components/forms/PrivateRegistrationCapture.tsx
3. features/vehiculos/components/forms/RegistrationRecognitionDraft.tsx
4. features/vehiculos/components/forms/RegistrationRecognitionDraft.module.css
5. features/vehiculos/services/registrationReview.ts (nuevo)
6. scripts/test-registration-review.mjs (nuevo)
7. scripts/test-domain.mjs (solo el adaptador de pruebas del formulario para useRef y el import nuevo)
8. package.json (incorporar la suite al comando test)
9. features/vehiculos/OCR_1B2_REVIEW.md (este informe)

Los recursos Tesseract, workers de OCR/preparación, extracción espacial y contratos Vehicle/Photo del bloque previo permanecen iguales. Los scripts, informes y capturas de verificación están fuera del repositorio, en dashboard-validation del workspace documental.

## Flujo completo

Fotografiar o seleccionar → orientar y recortar → confirmar recorte → preparar PNG privado → reconocer localmente → revisar/corregir candidatos → confirmar cada campo → Aplicar campos seleccionados → confirmar sobrescritura si corresponde → revisar formulario → Guardar vehículo.

Toda decisión inicia PENDING, independientemente de la confianza OCR. Un candidato único se presenta para editar, pero nunca queda aceptado automáticamente. Con candidatos ambiguos hay que elegir uno explícitamente antes de confirmarlo; se puede corregir su valor. Rechazar retira la selección. Editar un valor confirmado lo devuelve a pendiente y elimina cualquier confirmación de sobrescritura abierta. Los campos sin candidato no permiten inventar una aplicación desde OCR: se completan en el formulario manual.

Cada candidato tiene un campo editable sin name: no participa directamente en FormData ni en el POST del vehículo. Enter dentro de los inputs de revisión se intercepta para que no envíe el formulario padre. Los botones de revisión son type=button.

La acción Aplicar construye únicamente la selección confirmada. Si un destino no vacío difiere del candidato, muestra su valor actual y el propuesto; Cancelar aplicación no cambia nada. Confirmar sobrescritura vuelve a leer los destinos: si alguno cambió desde el aviso, se rechaza toda la aplicación sin modificaciones parciales y se exige revisar de nuevo.

Después de aplicar se desmarcan los destinos aplicados, se informa que aún no se guardó y el formulario sigue editable. Cancelar captura o descartar el borrador no revierte silenciosamente valores que el administrador ya aplicó de forma explícita; conserva el formulario actual.

## Mapeo permitido y validación

| Origen revisado | Destino | Condición |
|---|---|---|
| Patente | plate | Confirmación; normalizador existente (mayúsculas y solo alfanumérico), límite actual de 20 caracteres |
| Marca | brand | Confirmación, no vacío, máximo 100 |
| Modelo | model | Confirmación, no vacío, máximo 100 |
| Año-modelo | year | Etiqueta explícita ANO MODELO o ANO DEL MODELO; entero de cuatro cifras entre 1900 y año actual + 1 |
| VIN | vin | Etiqueta explícita VIN o NUMERO VIN; confirmación y 17 caracteres válidos sin I/O/Q |
| Año fabricación | Ninguno | Editable y confirmable solo como revisión; nunca sustituye year |
| Número motor | Ninguno | Editable y confirmable solo como revisión; nunca se escribe en engine |
| Número chasis | Ninguno | Editable y confirmable solo como revisión; nunca se escribe en vin |

Una fecha de inscripción o un año genérico no son fallback del año-modelo. No se almacenan números de motor/chasis. No se sustituyen caracteres dudosos por suposición. Si un VIN no cumple las condiciones, queda para revisión/manual, no se aplica automáticamente como chasis.

## Integración mínima con VehicleForm

El formulario mantiene sus inputs y el submit existente. Una referencia al formulario permite leer exclusivamente plate/brand/model/year/vin. La aplicación solo escribe esas claves propias y validadas; plate además actualiza plateInput para mantener el hook de comprobación sincronizado. No modifica ownerId, customerId, mileage ni datos técnicos no seleccionados.

El submit, la construcción de Vehicle, saveVehicle, FormData, contratos, validaciones y manejo de errores permanecen sin cambios. La revisión no posee callback de guardado. El nuevo helper valida un objeto temporal de aplicación, no una entidad persistente.

Al cambiar la patente aplicada se invalida el resultado previo del hook de consulta exacta. No se hace HTTP por tecla ni por aplicar: el administrador conserva la acción explícita Comprobar registro en el taller. El guardado sigue teniendo la comprobación local y la API conserva 409 como protección definitiva.

El bridge exige contexto administrativo actual, formulario montado y coincidencia de los valores revisados. Una referencia de un usuario/taller/rol anterior se rechaza. La captura sigue usando su key de usuario/taller/rol/propietario; imagen, recorte, orientación, cancelación y sesión invalidan resultados como en OCR 1B.1. La UI de revisión se monta con la secuencia del reconocimiento. No hay respuesta OCR que aplique campos por sí sola.

## Pruebas y resultados

- pnpm typecheck: correcto.
- pnpm test: 222 aprobadas (141 dominio + 81 suites de patentes/captura/OCR/revisión; 17 nuevas de revisión).
- pnpm build: correcto.
- git diff --check: correcto, además de revisión de whitespace de archivos nuevos.
- Suite nueva: selección parcial, corrección, rechazo, candidatos ambiguos, ausentes/ilegibles, año-modelo frente a fabricación/inscripción, VIN explícito, campos no compatibles, confirmación y cancelación, snapshot obsoleto, cambio de contexto, campos propios, conservación de cliente/km, guardado manual y Enter sin submit.
- Navegador local con negocio simulado: OCR real, aplicación individual de marca, cancelación, rechazo, normalización, bloqueo local de patente duplicada, consulta exacta ACTIVE, invalidación de NO_MATCH previo, cambios durante OCR y limpieza de recursos.
- Responsive 320/375/390/768/1440 en ambos temas, sin desbordamientos. Sin errores JavaScript ni API inesperados. 11 workers iniciados/terminados, máximo uno; URLs revocadas.
- Storage local/session, IndexedDB y CacheStorage sin cambios documentales. Sin llamadas externas con documentos ni endpoints nuevos.

### Integración real NestJS/PostgreSQL

El preflight verificó solo el endpoint de restauración/pruebas previamente autorizado, TLS y tablas esperadas. Nunca se conectó a producción. Se levantaron NestJS real y un frontend local aislado con JWT efímero y dos talleres QA. No se modificó código backend ni se ejecutó DDL.

Se comprobó por consulta directa que:

1. Antes de OCR había 1 vehículo base en el taller QA.
2. Reconocer, corregir, cancelar sobrescritura y aplicar dejaron el mismo total y cero POST de vehículos.
3. Un cambio manual mientras el aviso estaba abierto produjo STALE sin aplicación parcial.
4. Aplicar conservó customerId y 85.000 km; número de motor/chasis no llegaron a engine/vin y fabricación no sustituyó el año-modelo.
5. Solo pulsar Guardar vehículo generó POST 201 y un segundo vehículo, con exactamente los campos confirmados y los demás datos manuales.
6. El cuerpo de guardado no incluyó borrador, texto OCR, imagen documental, número de motor ni chasis. La cantidad de fotos no cambió.
7. Se conservó la confirmación de kilometraje ya existente al seleccionar el vehículo recién creado desde recepción. Tras confirmar «Cambiar y conservar lectura», ID, cliente, motivo y lectura fueron correctos.
8. El registro siguió disponible tras recargar. Un trabajador fue rechazado con 403, el propietario de otro taller con 400 y el duplicado con 409, sin filas extra.
9. Se eliminaron exclusivamente las filas de los talleres QA generados. Los fingerprints de todos los registros previos volvieron al estado inicial; no quedaron diferencias.

Los primeros verificadores necesitaron corregir dos expectativas de prueba: el selector exacto del label Propietario (incluye asterisco) y la confirmación de kilometraje de recepción ya existente. No se cambió el producto para saltarse esa confirmación. Los informes fallidos fueron preservados y sus datos QA se limpiaron correctamente; la ejecución final run03 fue satisfactoria.

## Evidencia local

Directorio C:/Users/Cristian/Documents/ChatGPT/taller/dashboard-validation/:

- ocr1b2-db-preflight.json
- ocr1b2-integration-run03.json (integración real final)
- ocr1b2-integration.json y ocr1b2-integration-run02.json (verificadores previos, conservados)
- ocr1b2-browser-browser.json (negocio simulado, OCR real y casos adicionales)
- ocr1b2-{light,dark}-{390,1440}.png (frontend local de prueba con API real)
- ocr1b2-browser-{light,dark}-{390,1440}.png (regresiones con negocio simulado)
- ocr1b2-final-summary.json (archivos, hashes, diff y comprobaciones)

## Riesgos y límites pendientes

- No se probó cámara, Safari ni memoria en un celular físico; las pruebas móviles son tamaños y touch emulados en Edge.
- La precisión y el consumo del OCR siguen teniendo las limitaciones documentadas en 1B.1. La revisión humana no valida la autenticidad de un padrón ni la identidad de un vehículo.
- Año genérico/inscripción y datos ausentes continúan manuales. Motor y chasis no se almacenan; no se amplió el modelo.
- La consulta de patente no reserva el número. Se mantiene la protección 409 ante concurrencia.
- La captura OCR conserva su alcance administrativo de alta nueva; no se amplió a otros roles o pantallas de edición.
- No se realizaron pruebas con documentos personales reales. Deben seguir sujetos a autorización y manejo privado.

El bloque termina aquí. No hay avance automático a funciones nuevas, commit, push ni despliegue. La siguiente revisión queda limitada a las pruebas finales que autorice el usuario.
