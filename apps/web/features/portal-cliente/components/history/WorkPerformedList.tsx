import styles from "./WorkPerformedList.module.css";
import portalStyles from "../../Portal.module.css";
import { CheckCircle2, Clock3 } from "lucide-react";
import type { PortalOrder } from "../../types/portal.types";
import { interventionLabel } from "@/features/shared/services/interventions";
export function WorkPerformedList({
  services,
}: {
  services: PortalOrder["services"];
}) {
  return services.length ? (
    <ul className={styles.performedWorkList}>
      {services.map((s) => (
        <li key={s.id}>
          {["Completado", "Finalizado"].includes(s.status) ? (
            <CheckCircle2 />
          ) : (
            <Clock3 />
          )}
          <div>
            <strong>{s.name}</strong>
            <small>
              {s.status}
              {s.interventionType ? " · " + interventionLabel(s) : ""}
            </small>
            {!!s.workDetails?.length && (
              <ul className={`${portalStyles.publicInterventionDetails} ${styles.nestedDetails}`}>
                {s.workDetails.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            )}
            {s.description && <p>{s.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <p className={portalStyles.portalMuted}>Sin trabajos adicionales registrados.</p>
  );
}
