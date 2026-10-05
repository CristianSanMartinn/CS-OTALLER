"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Vehicle } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { PageHeading, Panel } from "@/components/ui/primitives";
import { Modal } from "@/components/Modal/Modal";
import { VehicleSearch } from "./VehicleSearch";
import { VehiclesTable } from "./VehiclesTable";
import { VehicleForm } from "./VehicleForm";
export function VehiclesPage() {
  const { data, notify, user } = useStore();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Vehicle>();
  const [open, setOpen] = useState(false);
  const admin = user?.role === "ADMIN";
  const rows = data.vehicles.filter((v) =>
    (v.plate + v.brand + v.model).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title={admin ? "Vehículos" : "Mis vehículos asignados"}
        description="El historial completo de cada vehículo que pasa por el taller."
        action={
          admin && (
            <button
              className="button primary"
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus size={18} />
              Registrar vehículo
            </button>
          )
        }
      />
      <Panel>
        <div className="toolbar">
          <VehicleSearch value={q} onChange={setQ} />
          <span className="muted">{rows.length} vehículos</span>
        </div>
        <VehiclesTable
          vehicles={rows}
          onEdit={
            admin
              ? (v) => {
                  setEditing(v);
                  setOpen(true);
                }
              : undefined
          }
        />
      </Panel>
      {open && (
        <Modal
          title={editing ? "Editar vehículo" : "Registrar vehículo"}
          onClose={() => setOpen(false)}
        >
          <VehicleForm
            vehicle={editing}
            onCancel={() => setOpen(false)}
            onSave={() => {
              notify("Vehículo guardado");
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
