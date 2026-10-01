"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Maintenance } from "@/features/shared/types/domain";
import { Panel, PageHeading, SearchBox } from "@/components/ui/primitives";
import { Modal } from "@/components/Modal/Modal";
import { MaintenanceForm } from "./MaintenanceForm";
import { MaintenanceTable } from "./MaintenanceTable";
import { MaintenanceHistory } from "./MaintenanceHistory";
import { maintenanceTypes } from "../types/maintenance.constants";
export function MaintenancePage({ orderId = "" }: { orderId?: string }) {
  const { data, update, notify } = useStore();
  const [open, setOpen] = useState(!!orderId);
  const [detail, setDetail] = useState<Maintenance>();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const rows = data.maintenance.filter(
    (m) =>
      (!type || m.type === type) &&
      (m.type + data.vehicles.find((v) => v.id === m.vehicleId)?.plate)
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Mantenciones"
        description="Historial preventivo y próximos cuidados de cada vehículo."
        action={
          <button className="button primary" onClick={() => setOpen(true)}>
            <Plus size={18} />
            Registrar mantención
          </button>
        }
      />
      <Panel>
        <div className="toolbar">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Buscar patente o mantención..."
          />
          <select
            aria-label="Tipo de mantención"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {maintenanceTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <MaintenanceTable records={rows} onOpen={setDetail} />
      </Panel>
      {detail && (
        <Modal
          title="Detalle de mantención"
          onClose={() => setDetail(undefined)}
        >
          <MaintenanceHistory records={[detail]} />
        </Modal>
      )}
      {open && (
        <Modal title="Registrar mantención" onClose={() => setOpen(false)}>
          <MaintenanceForm
            orderId={orderId}
            onCancel={() => setOpen(false)}
            onSave={(m) => {
              update((d) => ({
                ...d,
                maintenance: [m, ...d.maintenance],
                vehicles: d.vehicles.map((v) =>
                  v.id === m.vehicleId
                    ? { ...v, mileage: Math.max(v.mileage, m.mileage) }
                    : v,
                ),
              }));
              setOpen(false);
              notify("Mantención registrada");
            }}
          />
        </Modal>
      )}
    </>
  );
}
