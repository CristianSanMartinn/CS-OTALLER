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
import {
  maintenanceCategories,
  maintenanceTypeCode,
} from "@/features/shared/services/maintenanceRules";
export function MaintenancePage({ orderId = "" }: { orderId?: string }) {
  const { data, notify } = useStore();
  const [open, setOpen] = useState(!!orderId);
  const [detail, setDetail] = useState<Maintenance>();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const rows = data.maintenance.filter(
    (m) =>
      (!type || maintenanceTypeCode(m) === type) &&
      (m.type + data.vehicles.find((v) => v.id === m.vehicleId)?.plate)
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="Mantenciones"
        description="Mantenimientos, reparaciones y próximos cuidados de cada vehículo."
        action={
          <button className="button primary" onClick={() => setOpen(true)}>
            <Plus size={18} />
            Registrar trabajo
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
            {maintenanceCategories.map((category) => (
              <option key={category.code} value={category.code}>
                {category.label}
              </option>
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
        <Modal title="Registrar trabajo" onClose={() => setOpen(false)}>
          <MaintenanceForm
            orderId={orderId}
            onCancel={() => setOpen(false)}
            onSave={() => {
              setOpen(false);
              notify("Trabajo registrado");
            }}
          />
        </Modal>
      )}
    </>
  );
}
