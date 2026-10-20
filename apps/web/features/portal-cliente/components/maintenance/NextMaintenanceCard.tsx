import maintenanceStyles from "./Maintenance.module.css";
import portalStyles from "../../Portal.module.css";
import {
  Droplets,
  CalendarDays,
  Gauge,
  ChevronRight,
  Phone,
} from "lucide-react";
import { dateLabel, km } from "@/utils/format";
import type { PortalMaintenance } from "../../types/maintenance.types";
import { MaintenanceStatusBadge } from "./MaintenanceStatusBadge";
import { MaintenanceProgress } from "./MaintenanceProgress";
import styles from "./NextMaintenanceCard.module.css";
export function NextMaintenanceCard({
  record,
  mileage,
  status,
  tone,
  phone,
}: {
  record?: PortalMaintenance;
  mileage: number;
  status: string;
  tone: string;
  phone: string;
}) {
  return (
    <section className={`${portalStyles.portalSection} next-maintenance-card`}>
      <div className={`${styles.maintenanceCardTitle} maintenance-card-title`}>
        <span className={`${styles.maintenanceIcon} amber`}>
          <Droplets size={30} />
        </span>
        <div>
          <p>Próxima mantención</p>
          <h2>{record?.type ?? "Próximo cuidado"}</h2>
        </div>
        <MaintenanceStatusBadge label={status} tone={tone} />
      </div>
      {record ? (
        <>
          <MaintenanceProgress
            current={mileage}
            start={record.mileage}
            target={record.nextMileage}
          />
          <div className={maintenanceStyles.metricPair}>
            <div>
              <CalendarDays />
              <span>
                Fecha recomendada
                <strong>
                  {record.nextDate ? dateLabel(record.nextDate) : "Por definir"}
                </strong>
              </span>
            </div>
            <div>
              <Gauge />
              <span>
                Próximo kilometraje
                <strong>
                  {record.nextMileage ? km(record.nextMileage) : "Por definir"}
                </strong>
              </span>
            </div>
          </div>
          <p className={portalStyles.portalMuted}>
            Realiza el servicio por fecha o kilometraje, lo que ocurra primero.
          </p>
        </>
      ) : (
        <p className={portalStyles.portalMuted}>
          El taller agregará aquí la fecha o el kilometraje de tu próximo
          servicio.
        </p>
      )}
      {phone ? (
        <a
          className={styles.portalPrimaryButton}
          href={"tel:" + phone.replace(/[^+0-9]/g, "")}
        >
          <Phone size={20} />
          Contactar para agendar
          <ChevronRight size={20} />
        </a>
      ) : (
        <p className={portalStyles.portalMuted}>
          Consulta al taller para coordinar tu próxima visita.
        </p>
      )}
    </section>
  );
}
