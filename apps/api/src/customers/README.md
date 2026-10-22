# Clientes

GET /api/customers, POST /api/customers y PATCH /api/customers/:id requieren sesión JWT válida y rol ADMIN.

Campos de escritura: first_name, last_name, rut, phone, email, address y notes. El workshop_id se toma de la sesión y no se acepta en el cuerpo. Las lecturas y ediciones se filtran por ese taller; no existe acceso global entre talleres.

El controlador original se conserva en customers.service.ts.before-fix.txt como respaldo y se excluye del despliegue.
