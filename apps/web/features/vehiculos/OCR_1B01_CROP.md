# OCR 1B.0.1 — recorte privado y preparación optimizada

## Alcance

Recorte rectangular manual, confirmado explícitamente, sobre la vista previa orientada. No reconoce texto, no aplica datos y no cambia VehicleForm ni su guardado. La fotografía original continúa en memoria e intacta. El PNG preparado es un Blob temporal utilizable por un futuro consumidor OCR.

Archivos de este bloque (relativos a apps/web):

- features/vehiculos/components/forms/PrivateRegistrationCapture.tsx
- features/vehiculos/components/forms/PrivateRegistrationCapture.module.css
- features/vehiculos/components/forms/RegistrationCropEditor.tsx
- features/vehiculos/components/forms/RegistrationCropEditor.module.css
- features/vehiculos/services/registrationCrop.ts
- features/vehiculos/services/privateImagePreparation.ts
- public/workers/private-registration-image.js
- scripts/test-private-registration.mjs
- features/vehiculos/OCR_1B01_CROP.md

## Selección y confirmación

Se puede dibujar un rectángulo, moverlo, ajustar sus cuatro esquinas o usar controles porcentuales con teclado. Flechas desplazan los controles; Shift aumenta el paso. Todos los controles de acción son botones sin submit. Cancelar el recorte vuelve al área completa y elimina su confirmación. No cancela el formulario.

Preparar imagen exige confirmar primero el área. Cambiar área, fotografía u orientación invalida confirmación, operación y resultado. Reemplazar, cancelar y desmontar terminan el worker y revocan las URLs temporales. El contexto de sesión/formulario ya provoca desmontaje mediante el componente padre, sin cambiar ese contrato.

Se muestra tamaño previsto y reducción. Se recomienda incluir TODO el documento y repetir una fotografía inclinada: no se corrige perspectiva ni se comprueba automáticamente que el rectángulo incluya todos los datos.

## Coordenadas y calidad

El recorte se guarda normalizado respecto a la imagen ya orientada, no respecto a la miniatura sin girar. Las coordenadas visibles se escalan al tamaño original orientado. Bordes iniciales se redondean hacia abajo y finales hacia arriba para no cortar una franja por redondeo.

Sean W,H las dimensiones originales y x0,y0,x1,y1 los bordes orientados; cw=x1-x0 y ch=y1-y0. La inversa del giro horario produce el rectángulo fuente:

| Giro | x fuente | y fuente | ancho | alto |
|---|---|---|---|---|
| 0 | x0 | y0 | cw | ch |
| 90 | y0 | H-x1 | ch | cw |
| 180 | W-x1 | H-y1 | cw | ch |
| 270 | W-y1 | x0 | ch | cw |

La escala es min(1,sqrt(3200000/(cw*ch))). Se redondean dimensiones finales hacia abajo: máximo 3.200.000 píxeles y sin ampliaciones. La proporción solo tiene el error inevitable inferior a un píxel. La reducción puede perder texto pequeño y se advierte explícitamente; PNG no recupera ese detalle.

Las pruebas descubrieron diferencias importantes al recortar directamente mediante createImageBitmap en JPEG con EXIF. La solución conserva UNA decodificación original normalizada con imageOrientation:from-image y usa drawImage con rectángulo fuente sobre el canvas final limitado. No crea otro bitmap recortado ni un canvas de resolución completa.

## Worker y recursos

Un trabajo por instancia, identificador de operación, timeout de 30 segundos, cancelación por terminate y descarte de respuestas tardías. Sin fallback pesado al hilo principal. Se verifica compatibilidad real con createImageBitmap y OffscreenCanvas; si falla, queda disponible el registro manual.

El bitmap original se cierra justo después de dibujar, ANTES de codificar PNG. El canvas se pone a tamaño cero antes de publicar el resultado. También se limpian recursos ante errores. El componente conserva únicamente el Blob preparado vigente y lo descarta al cambiar contexto; no genera una URL adicional para ese resultado.

La decodificación original sigue costando aproximadamente 45,8 MiB RGBA para 12 MP y 91,6 MiB para 24 MP, aparte de buffers internos del navegador. El límite de 3,2 MP afecta al canvas de trabajo, NO garantiza que el decodificador use esa misma memoria. Se conservan límites de entrada de 12 MiB, 24 MP y lado de 12.000 píxeles. Un cierre del proceso por falta de memoria puede no ser recuperable mediante JavaScript.

## Mediciones locales

Edge de escritorio, JPEG sintético, cuatro preparaciones 0/90/180/270 por caso, navegador nuevo por combinación. Sin OCR. La comparación anterior usa el worker congelado de 1B.0 a resolución completa; la nueva incluye recorte y límite. No se fuerza GC.

| Entrada | Primera anterior/nueva | Mediana de 3 repeticiones anterior/nueva | Mayor intervalo observado hilo principal anterior/nueva | Incremento máximo muestreado de memoria privada anterior/nueva |
|---|---|---|---|---|
| 4000×3000 | 1060 / 860 ms | 498 / 279 ms | 26 / 22,2 ms | 574 / 68 MiB |
| 6000×4000 | 1764 / 1007 ms | 1057 / 386 ms | 41,5 / 17,7 ms | 1176 / 123 MiB |

La nueva salida fue 2018×1585 (3.198.530 píxeles) para 12 MP y 2140×1495 (3.199.300) para 24 MP, o dimensiones intercambiadas según giro. Cancelar devolvió control en 0,1–0,2 ms; no significa que el sistema operativo haya devuelto físicamente toda la memoria en ese instante. No hubo long tasks observadas en los casos nuevos. Una repetición de 12 MP tardó 845 ms: existe variabilidad.

El muestreo de procesos tuvo intervalos reales aproximadamente de 200–310 ms y puede perder picos breves. Las cifras representan máximos observados durante CUATRO preparaciones, no memoria garantizada ni memoria de un celular. Las cifras anteriores de 262–263 MiB del laboratorio incluían Tesseract y dos idiomas, con otro protocolo: NO son directamente comparables con estos 68/123 MiB de preparación. No se certifica aún el presupuesto del flujo OCR completo.

## Verificaciones

- Typecheck frontend correcto.
- 184 pruebas frontend correctas: 141 de dominio, 11 de patente y 32 de captura/preparación/recorte.
- Build frontend correcto.
- Comprobaciones de whitespace mediante git diff --check y revisión de archivos nuevos.
- 72 casos de píxeles: horizontal/vertical, PNG y JPEG EXIF 1–8, giros 0/90/180/270. PNG coincide exactamente con referencia independiente. JPEG conserva ubicación y presenta diferencia máxima de 1 nivel por canal respecto a rasterizar HTMLImage (redondeo de decodificación). Bytes originales intactos.
- Navegador real con datos de negocio simulados: mouse, teclado, touch emulado, confirmación, cancelar/reemplazar, resultados tardíos, incompatibilidad, conservación del formulario y payload sin documentos. Sin API real ni SQL.
- Responsive 320/375/390/768/1440, claro/oscuro, sin desbordamientos. Workers creados y terminados equilibrados; máximo activo uno; URLs revocadas al desmontar.
- Sin solicitudes externas, subidas ni persistencia documental. No se añade almacenamiento de texto/imagen ni se envía al guardado habitual.

Evidencia local fuera del repositorio: dashboard-validation/ocr1b01-browser.json, ocr1b01-quality.json, ocr1b01-performance.json y capturas ocr1b01-preview-{light,dark}-{390,1440}.png.

## Límites y siguiente revisión

No se probó cámara ni memoria en celular físico. Antes de OCR, probar fotografías sintéticas de 12/24 MP en Android de gama media y Safari iPhone: seleccionar, recortar, girar, confirmar, preparar, cancelar y repetir cinco veces; comprobar respuesta táctil, ausencia de cierres/reloads y lectura visual del PNG. La emulación táctil de escritorio no sustituye esta prueba.

No se midió precisión de identificadores porque este bloque no ejecuta OCR. La revisión visual y los tests de coordenadas verifican geometría/calidad de raster, no legibilidad universal. Fotografías borrosas, reflejos y perspectiva exigen repetir captura. El futuro OCR podrá recibir el PNG temporal preparado, después de finalizar el worker de preparación, sin alterar el original; no se integró ni se inició automáticamente.

Sin modificaciones de API, proxy, base de datos, contratos, propietario, kilometraje, órdenes, mantenciones o Portal. Sin commit, push ni despliegue.
