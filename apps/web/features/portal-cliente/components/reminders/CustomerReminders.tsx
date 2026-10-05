import { CalendarClock } from "lucide-react";
import type { PortalMaintenance } from "../../types/maintenance.types";
import { vehicleMaintenanceSummary } from "../../services/vehicleMaintenanceSummary";
import { PortalSection } from "../layout/PortalSection";
export function CustomerReminders({
  records,
  mileage,
}: {
  records: PortalMaintenance[];
  mileage: number;
}) {
  const summary = vehicleMaintenanceSummary(records, mileage);
  return (
    <PortalSection title="Recomendación del taller">
      <div className="portal-care-note">
        <CalendarClock />
        <p>
          {summary.tone === "overdue"
            ? "Hay una mantención pendiente. Contacta al taller para coordinar la revisión."
            : summary.tone === "soon"
              ? "Tu próxima mantención está cerca. Coordina una visita con el taller."
              : "Consulta los intervalos registrados y las indicaciones del taller para cuidar tu vehículo."}
        </p>
      </div>
      <p className="portal-muted">
        Los avisos se calculan con los registros del taller. Esta pantalla no
        envía mensajes automáticos.
      </p>
    </PortalSection>
  );
}
