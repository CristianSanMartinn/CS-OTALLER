# OCR 1B.0: preparación privada mediante worker local

## Alcance y archivos

- components/forms/PrivateRegistrationCapture.tsx: acción explícita, archivo original temporal, estado de preparación y descarte.
- services/privateImagePreparation.ts: controlador del worker y resultado Blob temporal, independiente de Vehicle/Photo.
- public/workers/private-registration-image.js: decodificación, orientación y PNG sin escalado, exclusivamente dentro del worker.
- scripts/test-private-registration.mjs: regresiones de controlador, runtime y captura.
- Este documento.

No se modifican VehicleForm, guardado, CSS, helpers de la miniatura, API, proxy, base de datos, permisos, contratos persistentes ni dependencias. No hay Tesseract ni OCR/autocompletado. Otros cambios pendientes del repositorio pertenecen a bloques anteriores.

## Arquitectura y ciclo de vida

El botón Preparar imagen para reconocimiento crea un solo Worker del mismo origen (/workers/private-registration-image.js). Primero comprueba Worker, OffscreenCanvas y createImageBitmap en el navegador, y después el worker comprueba las capacidades reales, contexto 2D y convertToBlob. No hay fallback de procesamiento completo al hilo principal. Fallos de carga, CSP o capacidades muestran explicación y conservan el registro manual.

El protocolo temporal READY → PREPARE(id, File, turns) → RESULT(id, Blob, width, height) no es un endpoint ni un contrato persistente. File/Blob se comunican mediante structured clone; no se convierten en texto/base64 ni se suben por HTTP. El archivo es el original seleccionado; la miniatura nunca entra al worker. createImageBitmap usa la orientación documental que interprete el navegador (from-image); el giro manual de 0/90/180/270 se aplica adicionalmente sobre esa representación, igual que la vista previa. No hay inferencia de orientación.

El worker dibuja a las dimensiones originales, sin filtros ni escalado, y exporta PNG. PNG es una representación sin pérdidas del raster preparado, no una copia binaria de JPEG/WebP ni garantía de retención de EXIF o perfiles de color. El archivo original permanece intacto. El resultado puede ocupar más bytes que el JPEG de entrada: 12 MiB es límite del archivo original, no del PNG resultante.

El controlador solo acepta el id vigente, Blob PNG no vacío y dimensiones completas esperadas. Termina y desconecta callbacks del worker al completar, fallar, cancelar o agotar 30 segundos. bitmap.close y canvas a cero limpian el camino normal/errores dentro del worker; terminate aborta el trabajo pendiente y descarta su contexto. El componente invalida su propia secuencia además del id del controlador y elimina el resultado anterior antes de repetir.

Girar, reemplazar, cancelar o desmontar invalida preparación y Blob preparado. Cancelar el selector de archivos sin elegir otro conserva la foto existente. El key ya existente en VehicleForm remonta la captura al cambiar usuario, taller, rol o propietario; no se modificó ese contrato. La vista previa y sus giros CSS conservan el comportamiento de OCR 1A.1. La selección inicial y miniatura siguen usando su camino existente; este bloque traslada exclusivamente la preparación completa bajo demanda.

## Comparación medida en escritorio

Edge sin interfaz, JPEG sintéticos con texto y textura, tres giros desde el mismo original, mismo navegador en cada pareja temporal. Tiempo total incluye arranque del worker. El monitor del hilo principal usa intervalo de 16 ms y longtask. No son mediciones de celular físico ni percentiles estadísticos.

| Imagen | Total anterior, mediana ms | Total worker, mediana ms | Mayor intervalo anterior ms | Mayor intervalo worker ms | Cancelar y rechazar promesa ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1800 × 1200 | 108.3 | 153.2 | 64.3 | 17.4 | 0.2 |
| 4000 × 3000 | 481.8 | 543.6 | 104.2 | 21.1 | 0.1 |
| 6000 × 4000 | 954.8 | 1039.9 | 227.6 | 44.5 | 0.1 |

No se observaron tareas largas en el hilo principal durante el camino del worker. Hay mejor respuesta, no aceleración garantizada de la codificación. En imágenes pequeñas el arranque añade costo. La cancelación mide solicitud de terminate y rechazo de la promesa, no devolución inmediata de toda la RAM al sistema operativo.

## Memoria aproximada

Evaluación adicional con navegador nuevo por resolución y modo. Fixtures generados en otro navegador cerrado. Suma de memoria privada de procesos QA; muestras antes, durante/al terminar y después de soltar el resultado. Se solicitó GC solo en el arnés de evaluación para reducir basura transitoria antes de base y después del descarte. No mide pico, RAM física exacta ni memoria exclusiva del componente, y no reproduce la política de GC de producción.

| Imagen | Aumento observado anterior MiB | Aumento observado worker MiB | Total procesos tras descartar resultado worker MiB |
| --- | ---: | ---: | ---: |
| 1800 × 1200 | 50.3 | 68.4 | 262.0 |
| 4000 × 3000 | 171.7 | 225.4 | 428.4 |
| 6000 × 4000 | 367.7 | 409.6 | 631.4 |

El worker no reduce memoria: puede añadir presión por decodificación separada y el PNG conservado. Una superficie original de 12 MP ocupa 45,8 MiB; 24 MP, 91,6 MiB. Decodificación, canvas, codificación y Blob pueden coexistir. Terminar worker y quitar referencias no garantizan caída inmediata de memoria privada del navegador. Un trabajo simultáneo y descarte explícito limitan acumulación; no certifican seguridad bajo presión en celulares.

No cambiar límites ni reducir resolución automáticamente. Antes de conectar Tesseract es recomendable medir celular físico y el costo conjunto de la preparación y WASM OCR, preferiblemente de forma secuencial. Si no cabe en memoria, mantener registro manual; posibles alternativas requieren aprobación: limitar resolución de la etapa OCR con aviso o probar una representación raster transferible para evitar PNG intermedio. No implementadas aquí.

## Pruebas y evidencia

- Comparación independiente de píxeles de PNG sintético opaco en 0/90/180/270; dimensiones exactas y bytes originales intactos.
- Controlador: handshake, un solo trabajo, ids antiguos, cancelación, errores sanitizados, tamaño de salida inesperado, falta de capacidades y timeout.
- Runtime: cierre del bitmap, canvas liberado, orientación sin escalado y errores sin contenido documental.
- Captura: preparación explícita desde el File original, giro/reemplazo/cancelación/desmontaje y resultados tardíos.
- Navegador local real con negocio simulado: conservar formulario/cliente/km/recepción; preparación y descarte; ninguna solicitud externa o subida; almacenamiento local/sesión sin cambios; payload de guardado simulado sin documentos. Responsive 320/375/390/768/1440 y ambos temas.
- Typecheck, 180 pruebas frontend (141 dominio, 11 patentes, 28 captura/preparación), build y git diff --check.

Informes fuera del repositorio: dashboard-validation/ocr1b0-performance.json, ocr1b0-memory.json y ocr1b0-browser.json en el workspace de trabajo. Capturas ocr1b0-preview-light-390.png y ocr1b0-dark-1440.png.

## Limitaciones y siguiente paso

Solo Edge de escritorio ejecutado realmente; ausencia de APIs y rechazo del worker también probados mediante simulación. No afirmar compatibilidad universal ni precisión de EXIF/cámara física sin probar dispositivos. CSP, modos de privacidad, límite de memoria o APIs parciales pueden impedir preparación; el fallo se hace visible sin fallback pesado.

El futuro OCR podrá recibir directamente el Blob preparado junto con sus dimensiones, sin tocar el original ni VehicleForm. Todavía no hay consumidor OCR ni persistencia. No avanzar a OCR 1B.1 en este bloque. Sin commit, push ni despliegue.

La prueba de cancelación anterior solo podía descartar lógicamente: el helper no dispone de aborto. Después de pedir cancelación a los 30 ms, sus recursos tardaron todavía 61.8 / 455.3 / 785.7 ms en completar y limpiarse (2,16 / 12 / 24 MP). El worker rechazó/terminó la operación en 0.2 / 0.1 / 0.1 ms. Esto no mide la devolución física de memoria al SO.
