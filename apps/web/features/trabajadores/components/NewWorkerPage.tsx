"use client";
import { useRouter } from "next/navigation";
import { useStore } from "@/features/shared/components/StoreProvider";
import { PageHeading, Panel, Breadcrumb } from "@/components/ui/primitives";
import { WorkerForm } from "./WorkerForm";
import { authService } from "@/features/auth/services/authService";
export function NewWorkerPage() {
  const { user, update, notify } = useStore();
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
          onSave={(u, password) => {
            if (password) authService.registerCredential(u.id, password);
            update((d) => ({ ...d, users: [...d.users, u] }));
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
