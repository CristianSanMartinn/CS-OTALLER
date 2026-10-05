import { CancellationDetails } from "@/components/ui/CancellationDetails";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { WorkOrder } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { WorkOrderStatus } from "./WorkOrderStatus";
import { EmptyState, Avatar } from "@/components/ui/primitives";
export function WorkOrdersTable({ orders }: { orders: WorkOrder[] }) {
  const { data } = useStore();
  if (!orders.length) return <EmptyState title="Sin órdenes de trabajo" />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Orden / ingreso</th>
            <th>Vehículo</th>
            <th>Cliente</th>
            <th>Trabajo solicitado</th>
            <th>Responsable</th>
            <th>Estado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const v = data.vehicles.find((v) => v.id === o.vehicleId);
            const c = data.customers.find((c) => c.id === o.customerId);
            const u = data.users.find((u) => u.id === o.mechanicId);
            return (
              <tr key={o.id}>
                <td>
                  <Link className="order-link" href={"/ordenes/" + o.id}>
                    {o.number}
                  </Link>
                  <small>{o.time} h</small>
                </td>
                <td>
                  <strong>
                    {v?.brand} {v?.model}
                  </strong>
                  <small>
                    <span className="plate">{v?.plate}</span>
                  </small>
                </td>
                <td>{c?.name}</td>
                <td className="wrap-cell">{o.reason}</td>
                <td>
                  <div className="person-inline">
                    <Avatar
                      name={
                        o.assignmentType === "TEAM"
                          ? "Equipo"
                          : (u?.name ?? "Mecánico")
                      }
                    />
                    <span>
                      {o.assignmentType === "TEAM"
                        ? "Todos los mecánicos"
                        : (u?.name?.split(" ")[0] ?? "Asignado")}
                    </span>
                  </div>
                </td>
                <td>
                  <WorkOrderStatus status={o.status} />
                  {o.status === "CANCELLED" && (
                    <CancellationDetails cancellation={o.cancellation} />
                  )}
                </td>
                <td>
                  <Link
                    className="icon-button"
                    aria-label={"Abrir " + o.number}
                    href={"/ordenes/" + o.id}
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
