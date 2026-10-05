"use client";
import { useRouter } from "next/navigation";
import { useStore } from "@/features/shared/components/StoreProvider";
import { PageHeading, Panel, Breadcrumb } from "@/components/ui/primitives";
import { WorkerForm } from "./WorkerForm";
export function NewWorkerPage() {
  const { user, notify } = useStore();
  const router = useRouter();
  if (user?.role !== "ADMIN") return null;
  return (
    <>
      <Breadcrumb
        label="Trabajadores"
        href="/trabajadores"
        current="Nuevo trabajador"
      />
      <PageHeading
        title="Nuevo trabajador"
        description="Agrega un integrante al equipo y define su acceso."
      />
      <Panel className="narrow-panel">
        <WorkerForm
          onCancel={() => router.push("/trabajadores")}
          onSave={() => {
            notify(
              "Trabajador creado. Entrega las credenciales que acabas de definir.",
            );
            router.push("/trabajadores");
          }}
        />
      </Panel>
    </>
  );
}
