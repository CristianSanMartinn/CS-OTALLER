# OCR 1B.1 — reconocimiento local y borrador temporal

Implementación local terminada para revisión. No aplica candidatos al vehículo. No se hicieron commit, push, despliegue, SQL ni cambios de backend. No se procesaron documentos reales.

## Archivos exactos del bloque

Rutas relativas a `apps/web`:

1. `features/vehiculos/components/forms/PrivateRegistrationCapture.tsx` — integración y ciclo de vida.
2. `features/vehiculos/components/forms/RegistrationRecognitionDraft.tsx` — candidatos pendientes de revisión, sin inputs enlazados al vehículo.
3. `features/vehiculos/components/forms/RegistrationRecognitionDraft.module.css` — estilos exclusivos, responsive y variables de tema.
4. `features/vehiculos/services/privateRegistrationRecognition.ts` — controlador del worker nativo y extracción temporal.
5. `features/vehiculos/services/registrationExtraction.ts` — modelo independiente, etiquetas y asociación espacial.
6. `public/workers/private-registration-ocr.js` — bootstrap privado del worker nativo.
7. `scripts/test-registration-ocr.mjs` — 21 regresiones específicas.
8. `package.json` — incorpora la nueva suite al comando test existente; no agrega dependencias de Node.
9. `features/vehiculos/OCR_1B1_RECOGNITION.md` — este informe.

Recursos estáticos nuevos bajo `public/ocr/tesseract-7.0.0/` (sin documentos):

- `worker.min.js`
- `core/tesseract-core.wasm.js`
- `core/tesseract-core-lstm.wasm.js`
- `core/tesseract-core-simd.wasm.js`
- `core/tesseract-core-simd-lstm.wasm.js`
- `core/tesseract-core-relaxedsimd.wasm.js`
- `core/tesseract-core-relaxedsimd-lstm.wasm.js`
- `languages/spa.traineddata.gz`
- `languages/eng.traineddata.gz`
- `TESSERACT_LICENSE.md`
- `CORE_LICENSE.txt`
- `manifest.json` con versiones, procedencia y SHA-256 por recurso.

Total: 21 archivos de este bloque. Los demás cambios locales anteriores se conservan fuera de este alcance. VehicleForm, domain.ts, preparación/recorte previos, API, proxy y PostgreSQL no fueron modificados por este bloque.

## Arquitectura y funcionamiento

Captura original → orientación/recorte confirmado → worker de preparación → PNG temporal máximo 3,2 MP → terminar preparación → acción «Reconocer padrón localmente» → worker Tesseract → borrador temporal → terminar reconocimiento.

Se usa la versión evaluada del laboratorio: Tesseract.js 7.0.0, core 7.0.0 y spa+eng. Los artefactos se copiaron de los paquetes fijados del laboratorio; no hay importaciones a rutas locales externas en el producto. El despliegue futuro debe incluir estos archivos estáticos. Total publicado de recursos: aproximadamente 45,2 MB (43,1 MiB); cada reconocimiento carga solo el core elegido y ambos idiomas, no las seis variantes. Los recursos son locales al mismo origen, se solicitan bajo demanda y no se carga ningún CDN. El cache HTTP de recursos públicos del navegador puede utilizarse; el cache IndexedDB de Tesseract está desactivado mediante cacheMethod:none. No se guardan documentos en esos caches.

El controlador implementa el subconjunto fijado del protocolo nativo 7.0.0: load → loadLanguage → initialize → setParameters → recognize. Posee directamente el Worker, por lo que cancelarlo termina el proceso incluso durante la carga de idiomas; no necesita esperar a que createWorker resuelva ni utiliza un worker anidado. Una actualización de Tesseract debe verificar este adaptador y el manifiesto: no cambiar versiones automáticamente.

El worker recibe únicamente bytes PNG de la copia preparada, transferidos como ArrayBuffer; no usa la miniatura, una URL remota, base64 ni otro canvas en el hilo principal. Reconoce con OEM LSTM 1 y PSM AUTO 3. Se solicitan bloques/palabras/coordenadas y se deshabilitan texto concatenado, hOCR, TSV, PDF, imágenes de salida y debug. La selección de candidatos es un helper acotado en el hilo principal; el reconocimiento pesado y WASM se ejecutan en el worker. Se limita a 4.000 palabras.

El bootstrap silencia diagnósticos de la biblioteca y limita fetch/importScripts a la ruta local versionada; rechaza subidas y destinos externos. Los errores que llegan a la interfaz son genéricos y no interpolan texto OCR. La transferencia temporal de bloques ocurre solo entre el worker y el navegador, no por HTTP.

## Borrador y decisiones de mapeo

Tipo independiente de Vehicle y Photo; no contiene propietario, RUT, dirección, ownerId, kilometraje ni enlace de guardado. Sus ocho campos son patente, marca, modelo, año-modelo, año de fabricación, número de motor, número de chasis y VIN. Cada candidato contiene valor leído literalmente, confianza OCR y procedencia reducida a etiqueta permitida y rectángulo.

Estados soportados: DETECTED, DOUBTFUL, ABSENT, ILLEGIBLE y NOT_ANALYZED. Antes de un reconocimiento exitoso no se muestra un borrador parcial. «Ausente» significa que no se identificó una etiqueta, no que el documento necesariamente carezca del dato. «Ilegible» significa que una etiqueta no produjo un valor utilizable; no es un detector fiable de desenfoque.

Se agrupan palabras por coordenadas y se asocian valores a la derecha o en la fila inmediatamente inferior de su columna. Otra etiqueta delimita el valor e impide cruzar campos. No se utiliza texto concatenado como fallback. Etiquetas personales y desconocidas delimitan la extracción; se descartan valores contaminados con etiquetas personales, correos o patrones de RUT. No se expone texto completo ni procedencia libre. Las pruebas no sustituyen la evaluación con formatos reales autorizados: una etiqueta/layout mal reconocidos pueden causar candidatos incorrectos y siempre requieren revisión.

Los números de motor y chasis solo se asocian a etiquetas explícitas de número; «MOTOR» genérico no se transforma en número de motor. Chasis nunca se convierte en VIN. «AÑO» genérico no se decide como año-modelo ni fabricación. No se cambian 0/O ni I/1, no se rellenan campos ausentes y no hay consulta externa para validar identidades. Confianza menor de 85, sintaxis no plausible o candidatos distintos para el mismo campo requieren revisión. La confianza no garantiza exactitud: incluso un candidato detectado puede estar equivocado.

La pantalla presenta los valores como candidatos de solo lectura pendientes de revisión. No incluye «Aplicar», no cambia el formulario y no tiene callback de guardado. El usuario conserva el registro manual existente.

## Cancelación y privacidad

- Máximo un OCR por captura y un worker activo entre preparación y reconocimiento.
- Cancelar termina físicamente el worker, invalida su identificador y rechaza la promesa; los eventos tardíos se descartan.
- Cambiar orientación, recorte o foto descarta PNG, borrador y OCR. Cancelar solo reconocimiento conserva el PNG confirmado para repetirlo.
- Cerrar el formulario desmonta y termina los workers. La key ya existente en VehicleForm depende de usuario/taller/rol/propietario; no se modificó ese mecanismo de contexto.
- Timeout total de 90 segundos. Incompatibilidad, errores de recursos, límites y errores de worker mantienen el registro manual.
- Bitmap y canvas de preparación se cierran antes de iniciar OCR. Al terminar OCR se destruye su memoria WASM; permanece solo el PNG vigente para repetir y el borrador reducido. El texto/bloques completos no se conservan en estado.
- Sin localStorage, sessionStorage, IndexedDB, CacheStorage documental, galerías, Photo, Portal ni logs de contenido. No se agregaron peticiones a endpoints de negocio.

## Calidad medida

34 pruebas reales en Edge: 31 muestras sintéticas del laboratorio más tres orientaciones manuales adicionales. Cinco diseños ficticios, una y dos columnas, legibles, resolución media, baja resolución, oscuridad/desenfoque, reflejo, vacío y giros corregidos de 0/90/180/270. Todos pasan por preparación y el nuevo worker; no se usan las respuestas esperadas para extraer candidatos.

Exactitud del candidato único en campos presentes, incluyendo deliberadamente muestras difíciles:

| Campo | Exactos / presentes | Porcentaje |
|---|---:|---:|
| Patente | 23/33 | 69,7 % |
| Marca | 27/33 | 81,8 % |
| Modelo | 24/33 | 72,7 % |
| Año-modelo | 26/33 | 78,8 % |
| Año fabricación | 24/33 | 72,7 % |
| Número motor | 16/28 | 57,1 % |
| Número chasis | 9/33 | 27,3 % |
| VIN | 16/27 | 59,3 % |

El denominador excluye datos deliberadamente ausentes/ocultos; incluye repeticiones de los mismos diseños bajo distintas condiciones y NO es una estimación poblacional. Un candidato exacto puede estar marcado dudoso: exactitud y confianza no son lo mismo.

Por condición (ocho campos por documento; ausencia correcta cuenta como acierto): legibles 36/40; media 32/40; giradas 90° corregidas 36/40; baja resolución 4/40; oscuridad/desenfoque 11/40; reflejo 36/40; documento vacío 8/8. Los tres giros manuales adicionales obtuvieron 7/8 cada uno, mismo resultado del original de ese diseño. Los errores frecuentes son caracteres de identificadores y omisión de etiquetas. Hubo tres candidatos erróneos con confianza suficiente para DETECTED (una marca y dos modelos), por lo que no se debe tratar DETECTED como validación automática. No se corrigieron por suposición.

Estas muestras no certifican padrones reales ni cámara física. La revisión humana es necesaria, especialmente para motor/chasis/VIN.

## Tiempo y memoria del flujo completo

Navegador Edge de escritorio nuevo por tamaño; JPEG sintético de 12/24 MP, recorte confirmado conocido, tres operaciones completas secuenciales con workers nuevos. Se conserva el archivo original; no hay GC forzado ni OCR paralelo. Medición aislada del pipeline, no memoria total de toda la aplicación móvil. No se mide el tiempo que toma capturar/confirmar manualmente.

| Fuente | Primera preparación+OCR | Mediana de tres operaciones | Máximo intervalo del hilo principal | Incremento máximo observado de memoria privada |
|---|---:|---:|---:|---:|
| 12 MP (4000×3000) | 2103 ms | 2022 ms | 17,5 ms | 270,5 MiB |
| 24 MP (6000×4000) | 2572 ms | 2080 ms | 22,2 ms | 260,5 MiB |

Salidas: 2208×1449 y 2342×1366, siempre bajo 3,2 MP. Sin long tasks observadas en estas muestras. Cancelar devolvió control y rechazó la tarea en 0,1–0,2 ms; esto no certifica el instante de devolución física de toda la RAM al sistema operativo.

La memoria es la suma privada de procesos del navegador QA por muestreo con intervalos reales hasta 220/380 ms. Puede perder picos breves y es sensible a GC, cachés y planificación. Que el caso 24 MP tenga un incremento menor no implica que necesite menos memoria: ambos están dominados por el mismo OCR limitado y tienen baselines/variación diferentes.

Los 262–263 MiB de la auditoría anterior también eran mediciones de escritorio del pipeline con otro tamaño/método. El rango actual 260–271 MiB está en ese orden; NO demuestra una mejora del OCR ni un presupuesto móvil seguro. La reducción a 68/123 MiB del bloque anterior correspondía SOLO a preparación. Tesseract sigue teniendo un costo importante.

Las muestras generales pequeñas tardaron aproximadamente 1,1–1,8 segundos por preparación+OCR en esta máquina; descargas de recursos por una conexión móvil lenta y otros dispositivos pueden elevar mucho ese tiempo. No se probó celular físico ni Safari/iOS. Un cierre de pestaña por OOM del sistema puede no capturarse en JavaScript.

## Validaciones y evidencia

- pnpm typecheck: correcto.
- pnpm test: 205 pruebas aprobadas (141 dominio + 64 captura/patentes/OCR, incluidas 21 nuevas OCR).
- pnpm build: correcto.
- git diff --check: correcto, más revisión de archivos nuevos.
- UI real local, endpoints de negocio simulados: OCR real, cancelación DURANTE reconocimiento, cambios durante trabajo, recurso fallido, cierre/desmontaje, formulario y recepción invariantes.
- 11 workers creados/terminados, máximo uno; URLs de imágenes revocadas.
- Storage antes/después: localStorage, sessionStorage, IndexedDB y CacheStorage sin cambios por OCR.
- Sin llamadas externas ni subidas documentales. El benchmark intercepta y bloquea cualquier request fuera de recursos locales aprobados.
- Responsive 320/375/390/768/1440 en claro/oscuro sin desbordamiento.

Evidencias fuera del repositorio, en `C:/Users/Cristian/Documents/ChatGPT/taller/dashboard-validation/`:

- `ocr1b1-browser.json` y capturas `ocr1b1-{light,dark}-{390,1440}.png`.
- `ocr1b1-evaluation.json` con resultados por campo/caso.
- `ocr1b1-performance.json` con tiempos, muestras de memoria y ciclo de workers.
- `ocr1b1-final-summary.json` con hashes, archivos y comprobaciones finales.

## Limitaciones y punto de parada

No se certifica precisión real ni presupuesto de memoria móvil. Antes de habilitarlo fuera de desarrollo debe probarse en Android de gama media y Safari de iPhone con documentos sintéticos, repitiendo captura/recorte/OCR/cancelación y observando cierres, latencia y memoria. No hay garantía de lectura en documentos inclinados, reflejados, borrosos o recortados incompletos; se recomienda repetir la fotografía. No se implementa perspectiva automática.

La implementación queda detenida en borrador temporal. No se aplican campos y no se avanza al siguiente bloque. La futura aplicación necesitará aprobación y validación explícita de cada campo y del mapeo documental.

Referencia técnica primaria consultada y contrastada con el código instalado 7.0.0: https://github.com/naptha/tesseract.js/blob/master/docs/api.md y https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md .
