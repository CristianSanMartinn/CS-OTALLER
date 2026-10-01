import Link from "next/link";
import { Package } from "lucide-react";
import { useStore } from "@/features/shared/components/StoreProvider";
export function PendingVehicles() {
  const { data } = useStore();
  const rows = data.orders.filter((o) => o.status === "WAITING_PARTS");
  return (
    <div className="attention-card">
      <Package size={23} />
      <div>
        <strong>
          {rows.length} vehículo{rows.length !== 1 ? "s" : ""} esperando
          repuestos
        </strong>
        <p>Revisa las piezas pendientes para continuar los trabajos.</p>
      </div>
      <Link href="/ordenes?estado=WAITING_PARTS">Revisar →</Link>
    </div>
  );
}
