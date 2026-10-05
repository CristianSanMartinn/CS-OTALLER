import { Droplets, CalendarDays, Gauge, Package, Wrench } from "lucide-react";
import type { PortalMaintenance } from "../../types/maintenance.types";
import type { PortalOrder } from "../../types/portal.types";
import { dateLabel, km } from "@/utils/format";
import { PortalSection } from "../layout/PortalSection";
import { WorkPerformedList } from "../history/WorkPerformedList";
export function MaintenanceSummaryCard({
  record: m,
  order,
}: {
  record: PortalMaintenance;
  order?: PortalOrder;
}) {
  const completed = order && ["READY", "DELIVERED"].includes(order.status);
  const oil = /aceite/i.test(m.type);
  return (
    <PortalSection
      title={oil && m.filter ? m.type + " y filtro" : m.type}
      action={
        <span className="maintenance-record-badge">
          {completed ? "Completado" : "Registrada"}
        </span>
      }
      className="maintenance-detail-card"
    >
      <div className="maintenance-detail-meta">
        <span>
          <CalendarDays size={18} />
          {dateLabel(m.date)}
        </span>
        <span>
          <Gauge size={18} />
          {km(m.mileage)}
        </span>
        <span>
          <Wrench size={18} />
          Mantención registrada
        </span>
      </div>
      {oil && (
        <>
          <h3>Productos utilizados</h3>
          <div className="maintenance-products">
            <article>
              <span className="product-illustration">
                <Droplets size={58} />
              </span>
              <h4>Aceite de motor</h4>
              <strong>
                {[m.brand, m.viscosity].filter(Boolean).join(" ") ||
                  "Sin marca registrada"}
              </strong>
              <p>
                {m.oilType || "Tipo sin registrar"}
                {m.quantity ? " · " + m.quantity + " litros" : ""}
              </p>
            </article>
            <article>
              <span className="product-illustration">
                <Package size={58} />
              </span>
              <h4>Filtro de aceite</h4>
              <strong>{m.filterBrand || "Sin marca registrada"}</strong>
              <p>{m.filter || "Sin filtro registrado"}</p>
            </article>
          </div>
        </>
      )}
      <h3>Trabajos realizados</h3>
      {order ? (
        <WorkPerformedList services={order.services} />
      ) : (
        <p className="portal-muted">
          {m.type} registrada por el taller. No hay una orden asociada con más
          detalles.
        </p>
      )}
      {order?.parts.length ? (
        <>
          <h3>Repuestos del servicio</h3>
          <ul className="maintenance-parts">
            {order.parts.map((p) => (
              <li key={p.id}>
                {p.quantity} × {p.name} {p.brand}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="maintenance-next-strip">
        <h3>Próximo servicio</h3>
        <div className="maintenance-metric-pair">
          <div>
            <Gauge />
            <span>
              Kilometraje recomendado
              <strong>
                {m.nextMileage ? km(m.nextMileage) : "Por definir"}
              </strong>
            </span>
          </div>
          <div>
            <CalendarDays />
            <span>
              Fecha recomendada
              <strong>
                {m.nextDate ? dateLabel(m.nextDate) : "Por definir"}
              </strong>
            </span>
          </div>
        </div>
        <p>Por fecha o kilometraje, lo que ocurra primero.</p>
      </div>
    </PortalSection>
  );
}
