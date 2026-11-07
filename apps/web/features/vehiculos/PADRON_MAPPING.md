# Padrón: mapeo documental pendiente de aprobación

Este bloque solo incorpora captura local temporal. No reconoce, aplica ni guarda información documental.
Fuentes revisadas: VehicleForm.tsx; shared/types/domain.ts; shared/services/liveData.ts; API vehicles.service.ts; vehiculos/components/details/VehicleDetails.tsx; shared/services/mockData.ts. No se inspeccionaron datos personales ni bases de datos.

| Campo actual | Significado observado y validación | Candidato documental futuro | Decisión |
| --- | --- | --- | --- |
| plate (frontend), license_plate (API/SQL) | Patente obligatoria, hasta 20 caracteres; API convierte a mayúsculas y elimina no alfanuméricos. licensePlate no es un campo actual del contrato. | Patente/PPU identificada en el documento. | Solo valor legible y confirmado; usar búsqueda y comprobación existentes. No inferir caracteres dudosos. |
| brand | Marca obligatoria, texto hasta 100 caracteres. | Campo Marca. | Candidato tras revisión; sin deducir por patente o modelo. |
| model | Modelo obligatorio, texto hasta 100 caracteres. | Campo Modelo. | Mantener separado de versión y tipo de vehículo. |
| year | Entero obligatorio entre 1900 y año actual + 1. No existe distinción contractual entre fabricación y año-modelo. | Año identificado explícitamente como correspondiente al vehículo. | Aprobar si se usará año-modelo o fabricación. No tomar emisión/inscripción como año del vehículo. Si hay dos años, revisión manual. |
| mileage | Lectura manual obligatoria, entero entre 0 y 2147483647; cero solo cuando es real. | Ninguno por defecto. | Nunca extraer del padrón ni representar desconocido como cero. Conservar lectura escrita y reglas actuales. |
| vin | Texto opcional hasta 50 caracteres, etiqueta VIN; no hay validación semántica ni longitud 17 obligatoria en API. | Campo explícito VIN. | Chasis y VIN no son equivalentes automáticamente. 17 caracteres no prueban equivalencia. Sin campo independiente de chasis, dejar ese candidato sin aplicar. |
| engine | Texto opcional hasta 100 caracteres, etiqueta Motor. MockData usa version.split(' ')[0], con valores descriptivos como cilindrada; no prueba el contenido histórico real. | Descripción técnica del motor, si coincide el significado. | No mapear Número de motor a engine. Definir semántica y revisar históricos antes de autocompletar; extraer número de motor separado en futuro borrador. |

## Invariantes

- Propietario, customerId, ownerId, taller y permisos no proceden del documento.
- No cambiar tipos persistentes ni agregar campos de chasis/número de motor en este bloque.
- Un futuro borrador podrá distinguir VIN, chasis, número de motor y descripción del motor sin forzar su persistencia.
- Aplicación futura solo de campos seleccionados y confirmados; hoy no hay autocompletado.
- Fotografía excluida de Photo[], store, FormData con nombre, payload, galerías, Portal, localStorage, sessionStorage y almacenamiento permanente.
- Vista previa mediante blob URL local, revocada al reemplazar, cancelar o desmontar/cambiar contexto. La fotografía original del dispositivo no se elimina.

## Límites de captura local

JPG/PNG/WebP, firma binaria coherente con MIME si existe, máximo 12 MiB y 24 megapíxeles tras decodificación. Se comprueba que el navegador pueda abrirla. No se comprime ni se envía. HEIC/PDF/SVG/GIF no admitidos; el registro manual sigue disponible. La cámara física y su selector dependen del navegador/dispositivo.
