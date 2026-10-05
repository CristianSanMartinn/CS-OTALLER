import { ChevronDown } from "lucide-react";
import type { PortalOrder } from "../../types/portal.types";
import { WorkOrderStatus } from "@/features/ordenes/components/WorkOrderStatus";
import { dateLabel, km } from "@/utils/format";
import { WorkPerformedList } from "./WorkPerformedList";
export function WorkHistoryItem({ order: o }: { order: PortalOrder }) {
  return (
    <details className="portal-work-history-item">
      <summary>
        <span>
          <strong>{o.reason}</strong>
          <small>
            {dateLabel(o.date)} · {o.number} · {km(o.mileage)}
          </small>
        </span>
        <WorkOrderStatus status={o.status} />
        <ChevronDown size={18} />
      </summary>
      <div className="portal-work-history-body">
        <h3>Diagnóstico</h3>
        <p>{o.diagnosis || "El taller aún no registra un diagnóstico."}</p>
        <h3>Trabajos realizados</h3>
        <WorkPerformedList services={o.services} />
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
  );
}
