import styles from "./WorkerStatusBadge.module.css";
import type { WorkerPresenceStatus } from "../../types/worker.types";
const labels: Record<WorkerPresenceStatus, string> = {
  ONLINE: "Conectado",
  OFFLINE: "Desconectado",
  DISABLED: "Cuenta desactivada",
  UNKNOWN: "Sin confirmar",
};
export function WorkerStatusBadge({
  status,
  compact = false,
}: {
  status: WorkerPresenceStatus;
  compact?: boolean;
}) {
  return (
    <span
      className={
        styles.presenceBadge + " " +
        status.toLowerCase() +
        (compact ? " compact" : "")
      }
    >
      <span className={styles.presenceDot} aria-hidden="true" />
      {labels[status]}
    </span>
  );
}
