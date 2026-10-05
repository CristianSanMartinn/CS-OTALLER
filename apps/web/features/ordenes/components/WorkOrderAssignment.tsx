"use client";
import { SelectField } from "@/components/ui/primitives";
import { useStore } from "@/features/shared/components/StoreProvider";
import type { OrderSectionProps } from "../types/editor.types";
export function WorkOrderAssignment({ order, onChange }: OrderSectionProps) {
  const { user, data } = useStore();
  const team = order.assignmentType === "TEAM";
  const mechanics = data.users.filter((worker) => worker.active);
  return (
    <div>
      <SelectField
        label="Asignar trabajo a"
        required
        disabled={user?.role === "WORKER"}
        value={team ? "__team__" : order.mechanicId}
        onChange={(event) => {
          const value = event.target.value;
          const shared = value === "__team__";
          onChange({
            assignmentType: shared ? "TEAM" : "INDIVIDUAL",
            mechanicId: shared ? "" : value,
            services: shared
              ? order.services
              : order.services.map((service) => ({
                  ...service,
                  mechanicId: service.mechanicId || value,
                })),
          });
        }}
      >
        <option value="">Seleccionar asignación</option>
        <option value="__team__">Todos los mecánicos</option>
        {mechanics.map((worker) => (
          <option key={worker.id} value={worker.id}>
            {worker.name}
          </option>
        ))}
      </SelectField>
      <small className="muted">
        {team
          ? "Orden compartida: todos los trabajadores del taller pueden verla y registrar avances."
          : "Orden visible para el administrador y el mecánico seleccionado."}
      </small>
    </div>
  );
}
