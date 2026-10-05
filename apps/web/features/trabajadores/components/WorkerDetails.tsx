import Image from "next/image";
import { User } from "@/features/shared/types/domain";
import { DetailGrid } from "@/components/ui/primitives";
import { WorkerCard } from "./WorkerCard";
import { WorkerPermissions } from "./WorkerPermissions";
export function WorkerDetails({ worker }: { worker: User }) {
  return (
    <>
      {worker.avatarUrl ? (
        <div className="panel-padding" style={{ textAlign: "center" }}>
          <Image
            unoptimized
            src={worker.avatarUrl}
            alt={"Fotografía de " + worker.name}
            width={240}
            height={240}
            style={{ maxWidth: "100%", height: "auto", borderRadius: 16 }}
          />
        </div>
      ) : (
        <p className="panel-padding muted">
          Este trabajador aún no tiene una fotografía. Puedes agregarla desde
          Editar.
        </p>
      )}
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
