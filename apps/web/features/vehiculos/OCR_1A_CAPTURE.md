# OCR 1A.1: vista previa ligera y orientación privada

## Auditoría y separación

Antes cada giro decodificaba la imagen completa, dibujaba un canvas de resolución completa, codificaba un nuevo PNG y cargaba ese PNG en la vista previa. Original, decodificación, canvas y resultado podían coexistir. No se requería ningún cambio persistente para eliminar ese trabajo repetido.

Ahora hay tres conceptos separados:

1. Original temporal: archivo y URL local intactos, con sus dimensiones completas. No se sobrescribe ni se sube.
2. Vista previa: miniatura local de hasta 1024 píxeles en el lado mayor, creada una sola vez por selección. Si el original ya cabe, se reutiliza su URL. Solo esta representación visual se reduce.
3. Futuro trabajo OCR: todavía no se genera desde la interfaz. El helper existente rotatePrivateRegistrationImage(original, quarterTurns) puede generarlo a resolución completa cuando una futura acción aprobada lo solicite. Nunca debe recibir la miniatura como fuente.

Los giros cambian únicamente el estado local quarter-turns y transform CSS. Se ajustan el tamaño y la proporción del contenedor para que 90/270 grados no desborden ni se recorten. No hay canvas, codificación PNG, nueva URL ni procesamiento del original por pulsación. Cuatro giros y restaurar vuelven a cero sin remuestreo acumulativo.

## Recursos y privacidad

Original y miniatura se revocan al reemplazar, cancelar o desmontar. Una sustitución fallida conserva la captura válida anterior y su orientación. Se descartan y revocan resultados asíncronos tardíos. Los decodificadores limpian src y los canvas se reducen a cero al terminar, también en errores. Cancelar no puede interrumpir inmediatamente una decodificación/toBlob ya iniciada: sus recursos se limpian cuando finaliza o alcanza su límite. El navegador puede conservar cachés; revocar URLs no garantiza una caída inmediata de RAM.

No se cambia VehicleForm, su guardado, ownerId ni campos. No hay OCR, endpoints, subida de documentos, almacenamiento persistente ni cambios de contratos.

## Mediciones locales

Documentos completamente sintéticos; Edge de escritorio sin interfaz. Mismo archivo para ambos helpers. Tres giros 90/180/270; tiempo incluye decodificación y PNG para el camino anterior y dos animation frames para ambos caminos. La creación de miniatura se mide separadamente. Medianas en milisegundos:

| Imagen | Giro anterior | Giro CSS | Miniatura inicial |
| --- | ---: | ---: | ---: |
| 1000 x 650 | 19,9 | 9,9 | 0 (reutilizada) |
| 1800 x 1200 | 34,9 | 10,0 | 27,6 |
| 4000 x 3000 (12 MP) | 164,8 | 10,0 | 91,4 |

Validar/decodificar inicialmente el archivo de 12 MP costó 56,1 ms adicionales en esta ejecución. En la aplicación real, un giro de esa imagen midió 19 ms desde Playwright hasta el estado visible. Cero codificaciones durante los giros y bytes originales conservados. Son muestras de escritorio con imágenes sintéticas, no un presupuesto de latencia de cámara real ni una comparación con la antigua sesión QA de 7,1 segundos (medida con carga diferente).

Una superficie RGBA original de 12 MP ocupa 45,8 MiB (48 MB decimales); la miniatura 1024 x 768 ocupa 3 MiB. Se elimina la superficie de trabajo de 12 MP y su PNG por giro. La decodificación inicial del original sigue siendo necesaria y puede mantener cachés. Una imagen de 24 MP necesita 91,6 MiB por superficie original.

Muestras de memoria privada de todos los procesos del navegador QA nuevo: 908 MiB antes de la imagen grande, 1058 MiB tras prepararla, 1059 MiB tras girar y 1058 MiB tras cancelar. Incluyen generación de fixtures, página, capturas y cachés: no representan memoria neta del componente ni pico, y no demuestran liberación inmediata al SO. No se ha medido celular físico, batería ni memoria bajo presión. El límite 24 MP/12 MiB es una protección, no garantía de memoria disponible. La miniatura se prepara una vez con canvas y decode asíncronos; el dibujo sigue ocurriendo en el hilo principal. No se añadió worker innecesario para los giros CSS.

## Verificaciones y límites

- Pruebas unitarias: 90/180/270, izquierda, cuatro giros, restaurar, actualizaciones agrupadas, misma URL sin llamada al helper pesado, miniatura acotada, trabajo futuro completo desde original, fallos, reemplazo, cancelación y desmontaje durante preparación.
- Navegador local: geometría transformada coincide con el contenedor, original binariamente idéntico, cero nuevas codificaciones por giro, URLs revocadas, formularios/cliente/recepción intactos y guardado simulado sin datos documentales.
- Responsive 320/375/390/768/1440, claro y oscuro, sin desbordamiento horizontal. Datos y respuestas de negocio simulados; ninguna consulta SQL ni acceso productivo.
- Se mantienen formatos JPEG/PNG/WebP, rechazo de firmas falsas/extremos y avisos de baja resolución/proporción/memoria. No se detectan reflejos, desenfoque, perspectiva ni orientación automática.
- La vista previa ligera no sirve para certificar legibilidad de caracteres pequeños; repetir captura si es necesario. El original conserva toda la resolución para una futura evaluación OCR. EXIF y cámara física siguen pendientes de prueba manual.

## Siguiente bloque no implementado

Al aprobar OCR, capturar conjuntamente el original temporal y su orientación elegida, y generar el trabajo completo una sola vez bajo demanda. Cancelación, reemplazo y fin del trabajo deberán descartar también ese recurso. No conectar todavía Tesseract ni autocompletado.

Validación final: typecheck correcto, 170 pruebas frontend aprobadas (141 de dominio + 11 de consulta de patente + 18 de captura privada), build correcto y git diff --check sin errores.
