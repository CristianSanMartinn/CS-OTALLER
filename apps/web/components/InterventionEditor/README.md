# Registro de trabajos automotrices

InterventionEditor se reutiliza en Servicios de órdenes y en Registrar trabajo del módulo Mantenciones. El buscador ofrece sugerencias locales por términos y sinónimos, pero admite nombres y detalles personalizados. La clasificación MAINTENANCE/REPAIR y el motivo SCHEDULED/WEAR/FAULT/OTHER los confirma el operador. No se infiere automáticamente el diagnóstico.

workDetails guarda hasta 30 descripciones de 150 caracteres. Kit completo y componentes individuales son opciones excluyentes. El resumen se compone de nombre, clasificación, motivo y detalles; no reemplaza la descripción libre de una orden.

La migración 20261013_intervention_details.sql añade campos a work_order_services y maintenance_records. Los registros anteriores quedan sin clasificación; se conservan al editar desde clientes antiguos que omiten los nuevos campos. El backend verifica los valores y los permisos existentes.

El formulario de aceite aparece para Cambio de aceite / Cambio de aceite de motor; exige próxima fecha y kilometraje. Los demás trabajos admiten programación opcional por fecha, kilometraje o ninguna. Una reparación sin programación no genera un recordatorio ni sustituye un mantenimiento programado del mismo tipo. El QR muestra la clasificación y detalles sin incluir precios ni identidad del propietario.

Pruebas: pnpm test en apps/web y node scripts/test-interventions.cjs en apps/api después de compilar. Las pruebas API usan una transacción con ROLLBACK.
