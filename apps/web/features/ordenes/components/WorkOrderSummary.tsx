import { WorkOrder } from "@/features/shared/types/domain";
import { Panel, SelectField } from "@/components/ui/primitives";
import { useStore } from "@/features/shared/components/StoreProvider";
import { money } from "@/utils/format";
import { statusLabels, workerTransitions } from "../types/order.constants";
export function WorkOrderSummary({
  order,
  initialStatus,
  onStatus,
  isNew,
  busy = false,
}: {
  order: WorkOrder;
  initialStatus: WorkOrder["status"];
  onStatus: (s: WorkOrder["status"]) => void;
  isNew: boolean;
  busy?: boolean;
}) {
  const { user, data, live } = useStore();
  const admin = user?.role === "ADMIN";
  const services = order.services.reduce((n, s) => n + s.price, 0);
  const parts = order.parts.reduce((n, p) => n + p.quantity * p.price, 0);
  const allowed = admin
    ? Object.keys(statusLabels)
    : isNew
      ? ["RECEIVED"]
      : [initialStatus, ...workerTransitions[initialStatus]];
  return (
    <Panel title="Resumen de la orden" className="order-summary">
      <div className="panel-padding">
        <SelectField
          label="Estado de la orden"
          value={order.status}
          onChange={(e) => onStatus(e.target.value as WorkOrder["status"])}
        >
          {allowed.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s as WorkOrder["status"]]}
            </option>
          ))}
        </SelectField>
        <dl className="summary-lines">
          <div>
            <dt>Vehículo</dt>
            <dd>
              {data.vehicles.find((v) => v.id === order.vehicleId)?.plate ??
                "Por seleccionar"}
            </dd>
          </div>
          <div>
            <dt>Asignación</dt>
            <dd>
              {order.assignmentType === "TEAM"
                ? "Todos los mecánicos"
                : (data.users.find((worker) => worker.id === order.mechanicId)
                    ?.name ?? "Mecánico asignado")}
            </dd>
          </div>
          <div>
            <dt>Trabajos</dt>
            <dd>{order.services.length}</dd>
          </div>
          <div>
            <dt>Repuestos</dt>
            <dd>{order.parts.length}</dd>
          </div>
          <div>
            <dt>Fotografías</dt>
            <dd>{order.photos.length}</dd>
          </div>
          {admin && (
            <>
              <div>
                <dt>Servicios</dt>
                <dd>{money(services)}</dd>
              </div>
              <div>
                <dt>Repuestos</dt>
                <dd>{money(parts)}</dd>
              </div>
              <div className="summary-total">
                <dt>Total registrado</dt>
                <dd>{money(services + parts)}</dd>
              </div>
            </>
          )}
        </dl>
        <button
          className="button primary full-width"
          type="submit"
          disabled={busy}
        >
          {isNew ? "Crear orden de trabajo" : "Guardar cambios"}
        </button>
        <p className="help-text">
          {live
            ? "Los cambios se guardan en el historial del taller."
            : "Los cambios se guardan en la sesión de demostración."}
        </p>
      </div>
    </Panel>
  );
}
