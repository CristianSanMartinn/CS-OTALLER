# Asignación de órdenes

WorkOrderAssignment ofrece Todos los mecánicos o un responsable individual. assignmentType es TEAM o INDIVIDUAL; las órdenes existentes conservan asignación individual. TEAM usa mechanicId vacío en frontend y NULL en PostgreSQL, nunca un UUID ficticio. El alcance se define por orden y no expone órdenes individuales anteriores del mismo vehículo.

Solo ADMIN cambia la asignación. Trabajadores del mismo taller pueden consultar y registrar avances en órdenes TEAM con sus transiciones permitidas. No ven precios ni obtienen permisos administrativos. Vehículos, clientes relacionados, actividad y mantenciones reconocen el alcance compartido. Agenda mantiene su asignación individual.

updatedAt permite detectar ediciones concurrentes: al guardar una orden compartida, expectedUpdatedAt debe coincidir con la versión actual. Si alguien ya guardó, se rechaza con 409 y se solicita recargar la ficha. No se implementa edición colaborativa en vivo.

Aplicar database/migrations/20261005_team_work_orders.sql antes de desplegar el backend.
