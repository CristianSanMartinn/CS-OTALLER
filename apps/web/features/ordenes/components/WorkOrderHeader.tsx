import { WorkOrder } from "@/features/shared/types/domain";
import { PageHeading, Breadcrumb } from "@/components/ui/primitives";
import { WorkOrderStatus } from "./WorkOrderStatus";
export function WorkOrderHeader({
  order,
  isNew,
}: {
  order: WorkOrder;
  isNew: boolean;
}) {
  return (
    <>
      <Breadcrumb
        label="Órdenes de trabajo"
        href="/ordenes"
        current={isNew ? "Nueva orden" : order.number}
      />
      <PageHeading
        title={isNew ? "Nueva orden de trabajo" : order.number}
        description="Ficha de atención y seguimiento técnico del vehículo."
        action={<WorkOrderStatus status={order.status} />}
      />
    </>
  );
}
