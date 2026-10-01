import { ShieldCheck } from "lucide-react";
import { Role } from "@/features/shared/types/domain";
export function WorkerPermissions({ role }: { role: Role }) {
  return (
    <div className="info-box">
      <ShieldCheck size={19} />
      <div>
        <strong>
          {role === "ADMIN" ? "Acceso administrativo" : "Acceso de mecánico"}
        </strong>
        <p>
          {role === "ADMIN"
            ? "Gestión de clientes, equipo, configuración y todas las órdenes del taller."
            : "Solo trabajos y vehículos asignados. Puede registrar diagnósticos, repuestos, mantenciones y fotografías. Sin acceso administrativo ni financiero."}
        </p>
      </div>
    </div>
  );
}
