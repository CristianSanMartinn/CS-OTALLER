import Link from "next/link";
import { WorkOrder } from "@/features/shared/types/domain";
import { WorkOrderStatus } from "./WorkOrderStatus";
export function WorkOrderCard({ order }: { order: WorkOrder }) {
  return (
    <Link className="list-card" href={"/ordenes/" + order.id}>
      <strong>{order.number}</strong>
      <span>{order.reason}</span>
      <WorkOrderStatus status={order.status} />
    </Link>
  );
}
