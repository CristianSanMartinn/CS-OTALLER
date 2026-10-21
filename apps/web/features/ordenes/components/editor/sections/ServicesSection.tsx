import { maintenanceTypeCode } from "@/features/shared/services/maintenanceRules";
import { workshopWorkHistory } from "@/features/shared/services/workHistory";
import { Plus, Trash2 } from "lucide-react";
import { Panel, Field, SelectField } from "@/components/ui/primitives";
import { OrderSectionProps } from "../../../types/editor.types";
import { ServiceItem } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/store/StoreProvider";
import { uid } from "@/utils/format";
import { InterventionEditor } from "@/components/InterventionEditor/InterventionEditor";
export function ServicesSection({ order, onChange }: OrderSectionProps) {
  const { data, user } = useStore();
  const existingServices = new Set(
    data.orders
      .find((saved) => saved.id === order.id)
      ?.services.map((service) => service.id) ?? [],
  );
  const edit = (id: string, patch: Partial<ServiceItem>) =>
    onChange({
      services: order.services.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
  return (
    <Panel
      title="04 · Servicios y trabajos"
      action={
        <button
          type="button"
          className="button small"
          onClick={() =>
            onChange({
              services: [
                ...order.services,
                {
                  id: uid(),
                  name: "",
                  description: "",
                  mechanicId:
                    user?.role === "WORKER" ? user.id : order.mechanicId,
                  price: 0,
                  status: "Pendiente",
                },
              ],
            })
          }
        >
          <Plus size={16} />
          Agregar trabajo
        </button>
      }
    >
      {!order.services.length && (
        <p className="section-hint">
          Agrega los trabajos que se realizarán en este vehículo.
        </p>
      )}
      {order.services.map((s) => (
        <div className="repeat-row" key={s.id}>
          <div className="form-grid">
            <InterventionEditor
              value={s}
              history={workshopWorkHistory(data, user!.workshopId)}
              classificationRequired={
                !existingServices.has(s.id) ||
                !!s.interventionType ||
                !!s.interventionReason
              }
              onChoose={(suggestion) =>
                edit(s.id, {
                  name: suggestion.name,
                  maintenanceTypeCode:
                    suggestion.maintenanceTypeCode ??
                    maintenanceTypeCode({ type: suggestion.name }),
                  interventionType: suggestion.interventionType,
                  interventionReason: suggestion.interventionReason,
                  workDetails: suggestion.workDetails
                    ? [...suggestion.workDetails]
                    : suggestion.name !== s.name
                      ? []
                      : (s.workDetails ?? []),
                })
              }
              onChange={(patch) => edit(s.id, patch)}
            />
            <Field
              label="Descripción"
              value={s.description}
              onChange={(e) => edit(s.id, { description: e.target.value })}
            />
            <SelectField
              label="Mecánico"
              required={order.assignmentType !== "TEAM"}
              disabled={user?.role === "WORKER"}
              value={s.mechanicId}
              onChange={(e) => edit(s.id, { mechanicId: e.target.value })}
            >
              <option value="">
                {order.assignmentType === "TEAM"
                  ? "Todos los mecánicos"
                  : "Seleccionar"}
              </option>
              {s.mechanicId &&
                !data.users.some((worker) => worker.id === s.mechanicId) && (
                  <option value={s.mechanicId}>Mecánico del taller</option>
                )}
              {data.users
                .filter((u) => u.active)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </SelectField>
            <SelectField
              label="Estado"
              value={s.status}
              onChange={(e) => edit(s.id, { status: e.target.value })}
            >
              <option>Pendiente</option>
              <option>En curso</option>
              <option>Finalizado</option>
            </SelectField>
            {user?.role === "ADMIN" && (
              <Field
                label="Precio (CLP)"
                required
                type="number"
                min={0}
                step={1}
                value={s.price}
                onChange={(e) => edit(s.id, { price: Number(e.target.value) })}
              />
            )}
          </div>
          <button
            type="button"
            className="icon-button danger"
            aria-label="Eliminar trabajo"
            onClick={() =>
              onChange({
                services: order.services.filter((x) => x.id !== s.id),
              })
            }
          >
            <Trash2 size={17} />
          </button>
        </div>
      ))}
    </Panel>
  );
}
