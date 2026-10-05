import { WorkOrder } from "@/features/shared/types/domain";
import { PageHeading, Breadcrumb } from "@/components/ui/primitives";
import { WorkOrderStatus } from "./WorkOrderStatus";
export function WorkOrderHeader({
  order,
  isNew,
  canMarkReady = false,
  busy = false,
  onCancel,
}: {
  order: WorkOrder;
  isNew: boolean;
  canMarkReady?: boolean;
  busy?: boolean;
  onCancel?: () => void;
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
        action={
          <div className="row-actions">
            <WorkOrderStatus status={order.status} />
            {onCancel && (
              <button
                type="button"
                className="button"
                onClick={onCancel}
                disabled={busy}
              >
                Cancelar orden
              </button>
            )}
            {canMarkReady && (
              <button
                type="submit"
                form="work-order-editor"
                name="intent"
                value="ready"
                className="button primary"
                disabled={busy}
              >
                Vehículo listo para retirar
              </button>
            )}
          </div>
        }
      />
    </>
  );
}
