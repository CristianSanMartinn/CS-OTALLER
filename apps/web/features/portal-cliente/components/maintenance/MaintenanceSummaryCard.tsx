import maintenanceStyles from "./Maintenance.module.css";
import portalStyles from "../../Portal.module.css";
import { isEngineOil } from "@/features/shared/services/interventions";
import { Droplets, CalendarDays, Gauge, Package, Wrench } from "lucide-react";
import type { PortalMaintenance } from "../../types/maintenance.types";
import type { PortalOrder } from "../../types/portal.types";
import { dateLabel, km } from "@/utils/format";
import { PortalSection } from "../layout/PortalSection";
import { WorkPerformedList } from "../history/WorkPerformedList";
import { interventionLabel } from "@/features/shared/services/interventions";
import styles from "./MaintenanceSummaryCard.module.css";
export function MaintenanceSummaryCard({
  record: m,
  order,
}: {
  record: PortalMaintenance;
  order?: PortalOrder;
}) {
  const completed = order && ["READY", "DELIVERED"].includes(order.status);
  const oil = isEngineOil(m.type, m.maintenanceTypeCode);
  return (
    <PortalSection
      title={oil && m.filter ? m.type + " y filtro" : m.type}
      action={
        <span className={styles.maintenanceRecordBadge}>
          {completed ? "Completado" : "Registrada"}
        </span>
      }
      className="maintenance-detail-card"
    >
      <div className={styles.maintenanceDetailMeta}>
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
      <p className={portalStyles.portalMuted}>{interventionLabel(m)}</p>
      {!!m.workDetails?.length && (
        <ul className={portalStyles.publicInterventionDetails}>
          {m.workDetails.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
      {oil && (
        <>
          <h3>Productos utilizados</h3>
          <div className={styles.maintenanceProducts}>
            <article>
              <span className={styles.productIllustration}>
                <Droplets size={58} />
              </span>
              <h4>Aceite de motor</h4>
              <strong>
                {[m.brand, m.viscosity].filter(Boolean).join(" ") ||
                  "Sin marca registrada"}
              </strong>
              <p>
                {[m.oilProductName, m.oilType].filter(Boolean).join(" · ") ||
                  "Tipo sin registrar"}
                {m.quantity ? " · " + m.quantity + " litros" : ""}
              </p>
            </article>
            <article>
              <span className={styles.productIllustration}>
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
        <p className={portalStyles.portalMuted}>
          {m.type} registrada por el taller. No hay una orden asociada con más
          detalles.
        </p>
      )}
      {order?.parts.length ? (
        <>
          <h3>Repuestos del servicio</h3>
          <ul className={styles.maintenanceParts}>
            {order.parts.map((p) => (
              <li key={p.id}>
                {p.quantity} × {p.name} {p.brand}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className={styles.maintenanceNextStrip}>
        <h3>Próximo servicio</h3>
        <div className={maintenanceStyles.metricPair}>
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
