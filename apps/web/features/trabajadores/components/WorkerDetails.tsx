import { User } from "@/features/shared/types/domain";
import { DetailGrid } from "@/components/ui/primitives";
import { WorkerCard } from "./WorkerCard";
import { WorkerPermissions } from "./WorkerPermissions";
export function WorkerDetails({ worker }: { worker: User }) {
  return (
    <>
      <WorkerCard worker={worker} />
      <DetailGrid
        items={[
          ["RUT", worker.rut],
          ["Teléfono", worker.phone],
          ["Correo", worker.email],
          ["Rol", worker.role === "ADMIN" ? "Administrador" : "Mecánico"],
        ]}
      />
      <WorkerPermissions role={worker.role} />
    </>
  );
}
