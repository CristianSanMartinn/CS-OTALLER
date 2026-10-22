import styles from "./MaintenanceProgress.module.css";
import portalStyles from "../../Portal.module.css";
import { km } from "@/utils/format";
export function MaintenanceProgress({
  current,
  start,
  target,
}: {
  current: number;
  start: number;
  target: number;
}) {
  if (!target || target <= start)
    return (
      <p className={portalStyles.portalMuted}>
        El taller aún no ha definido el próximo kilometraje.
      </p>
    );
  const progress = Math.max(
    0,
    Math.min(100, ((current - start) / (target - start)) * 100),
  );
  const remaining = Math.max(0, target - current);
  return (
    <div className={styles.maintenanceProgress}>
      <div
        role="progressbar"
        aria-label="Kilometraje recorrido desde la mantención"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={styles.maintenanceProgressTrack}
      >
        <span style={{ width: progress + "%" }} />
      </div>
      <div>
        <strong>
          {remaining
            ? "Faltan " + km(remaining)
            : "Kilometraje de mantención alcanzado"}
        </strong>
        <span>{km(target)}</span>
      </div>
      <small>Según el último kilometraje registrado por el taller.</small>
    </div>
  );
}
