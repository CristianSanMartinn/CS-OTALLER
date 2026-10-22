import styles from "./CustomerReminders.module.css";
import portalStyles from "../../Portal.module.css";
import { CalendarClock } from "lucide-react";
import type { PortalMaintenance } from "../../types/maintenance.types";
import { maintenanceRecordSummary } from "../../services/vehicleMaintenanceSummary";
import { PortalSection } from "../layout/PortalSection";
export function CustomerReminders({
  records,
  recordId,
  mileage,
}: {
  records: PortalMaintenance[];
  recordId: string;
  mileage: number;
}) {
  const summary = maintenanceRecordSummary(records, recordId, mileage);
  return (
    <PortalSection
      title={summary ? "Recomendación del taller" : "Registro histórico"}
    >
      <div className={styles.portalCareNote}>
        <CalendarClock />
        <p>
          {!summary
            ? "Este trabajo se conserva en el historial. Los próximos objetivos de esta ficha no representan una programación vigente; consulta el resumen del vehículo para conocer sus próximos servicios."
            : summary.tone === "overdue"
              ? "Hay una mantención pendiente. Contacta al taller para coordinar la revisión."
              : summary.tone === "soon"
                ? "Tu próxima mantención está cerca. Coordina una visita con el taller."
                : "Consulta los intervalos registrados y las indicaciones del taller para cuidar tu vehículo."}
        </p>
      </div>
      <p className={portalStyles.portalMuted}>
        Los avisos se calculan con los registros del taller. Esta pantalla no
        envía mensajes automáticos.
      </p>
    </PortalSection>
  );
}
