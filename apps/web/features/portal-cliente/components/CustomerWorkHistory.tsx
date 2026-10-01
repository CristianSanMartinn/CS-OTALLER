import { customerVehicle } from "../services/customerPortalService";
import { Panel, EmptyState } from "@/components/ui/primitives";
import { WorkOrderStatus } from "@/features/ordenes/components/WorkOrderStatus";
import { dateLabel, km } from "@/utils/format";
type Order = NonNullable<ReturnType<typeof customerVehicle>>["orders"][number];
export function CustomerWorkHistory({ orders }: { orders: Order[] }) {
  return (
    <Panel
      title="Trabajos realizados en tu vehículo"
      subtitle="Historial de atención del taller"
    >
      {orders.length ? (
        <div className="customer-history">
          {[...orders]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((o) => (
              <details key={o.id}>
                <summary>
                  <span>
                    <strong>{o.reason}</strong>
                    <small>
                      {dateLabel(o.date)} · {o.number} · {km(o.mileage)}
                    </small>
                  </span>
                  <WorkOrderStatus status={o.status} />
                </summary>
                <div className="customer-history-body">
                  <h3>Diagnóstico</h3>
                  <p>
                    {o.diagnosis || "El taller aún no registra un diagnóstico."}
                  </p>
                  <h3>Servicios y trabajos</h3>
                  {o.services.length ? (
                    <ul>
                      {o.services.map((s) => (
                        <li key={s.id}>
                          <strong>{s.name}</strong> · {s.status}
                          {s.description && <p>{s.description}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>Sin trabajos registrados todavía.</p>
                  )}
                  {o.parts.length > 0 && (
                    <>
                      <h3>Repuestos utilizados</h3>
                      <ul>
                        {o.parts.map((p) => (
                          <li key={p.id}>
                            {p.quantity} × {p.name} {p.brand}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </details>
            ))}
        </div>
      ) : (
        <EmptyState title="Todavía no hay trabajos registrados" />
      )}
    </Panel>
  );
}
