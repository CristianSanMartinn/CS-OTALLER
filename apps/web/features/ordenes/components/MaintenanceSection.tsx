import Link from "next/link";
import { Panel } from "@/components/ui/primitives";
import { MaintenanceHistory } from "@/features/mantenciones/components/MaintenanceHistory";
import { useStore } from "@/features/shared/components/StoreProvider";
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
      title="07 · Mantenciones"
      action={
        !isNew && (
          <Link className="text-link" href={"/mantenciones?orden=" + orderId}>
            Registrar mantención →
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
