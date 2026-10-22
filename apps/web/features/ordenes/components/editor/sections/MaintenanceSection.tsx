import Link from "next/link";
import { Panel } from "@/components/ui/primitives";
import { MaintenanceHistory } from "@/features/mantenciones/components/history/MaintenanceHistory";
import { useStore } from "@/features/shared/components/store/StoreProvider";
export function MaintenanceSection({
  vehicleId,
  orderId,
  isNew,
}: {
  vehicleId: string;
  orderId: string;
  isNew: boolean;
}) {
  const { data } = useStore();
  return (
    <Panel
      title="07 · Mantenimientos y reparaciones"
      action={
        !isNew && (
          <Link className="text-link" href={"/mantenciones?orden=" + orderId}>
            Registrar trabajo →
          </Link>
        )
      }
    >
      <MaintenanceHistory
        records={data.maintenance.filter((m) => m.vehicleId === vehicleId)}
      />
      {isNew && (
        <p className="section-hint">
          Guarda la orden para registrar una mantención vinculada.
        </p>
      )}
    </Panel>
  );
}
