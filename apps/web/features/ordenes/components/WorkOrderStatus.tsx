import { OrderStatus } from "@/features/shared/types/domain";
import { statusLabels } from "../types/order.constants";
export function WorkOrderStatus({ status }: { status: OrderStatus }) {
  return (
    <span className={"badge " + status.toLowerCase()}>
      <i />
      {statusLabels[status]}
    </span>
  );
}
