import type { PlateRegistrationStatus } from "../../services/plateRegistrationCheck";
import styles from "./PlateRegistrationCheck.module.css";

const messages: Record<PlateRegistrationStatus, string> = {
  ACTIVE:
    "La patente ya tiene un registro activo en este taller. Revisa los vehículos disponibles; no se creará otra ficha.",
  INACTIVE:
    "La patente está asociada a un vehículo inactivo en este taller. Requiere revisión administrativa; no se reactivará ni se creará otra ficha.",
  AMBIGUOUS:
    "Hay varias fichas que coinciden al normalizar esta patente. Requiere revisión manual; no se creará otra ficha.",
  NO_MATCH:
    "No se encontraron coincidencias en esta comprobación. Puedes continuar; esto no garantiza que la patente esté disponible al guardar.",
};
export function PlateRegistrationCheck({
  busy,
  result,
  error,
  onCheck,
}: {
  busy: boolean;
  result?: PlateRegistrationStatus;
  error?: string;
  onCheck: () => void;
}) {
  return (
    <div className={styles.check}>
      <button
        type="button"
        className="button"
        disabled={busy}
        onClick={onCheck}
      >
        {busy ? "Comprobando registro…" : "Comprobar registro en el taller"}
      </button>
      {result && (
        <p role={result === "NO_MATCH" ? "status" : "alert"}>
          {messages[result]}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
