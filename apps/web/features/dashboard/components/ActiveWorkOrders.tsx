import Link from "next/link";
import { Panel } from "@/components/ui/primitives";
import { useStore } from "@/features/shared/components/StoreProvider";
import { WorkOrdersTable } from "@/features/ordenes/components/WorkOrdersTable";
export function ActiveWorkOrders() {
  const { data } = useStore();
  return (
    <Panel
      title="Órdenes de trabajo"
      subtitle="Seguimiento de los últimos ingresos"
      action={
        <Link className="text-link" href="/ordenes">
          Ver todas →
        </Link>
      }
    >
      <WorkOrdersTable orders={data.orders.slice(0, 5)} />
      <div className="panel-foot">
        <span className="online-dot" />{" "}
        {
          data.orders.filter(
            (o) => !["DELIVERED", "CANCELLED"].includes(o.status),
          ).length
        }{" "}
        órdenes activas en el taller
      </div>
    </Panel>
  );
}
