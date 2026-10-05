import { CheckCircle2, Clock3 } from "lucide-react";
import type { PortalOrder } from "../../types/portal.types";
export function WorkPerformedList({
  services,
}: {
  services: PortalOrder["services"];
}) {
  return services.length ? (
    <ul className="performed-work-list">
      {services.map((s) => (
        <li key={s.id}>
          {s.status === "Completado" ? <CheckCircle2 /> : <Clock3 />}
          <div>
            <strong>{s.name}</strong>
            <small>{s.status}</small>
            {s.description && <p>{s.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <p className="portal-muted">Sin trabajos adicionales registrados.</p>
  );
}
