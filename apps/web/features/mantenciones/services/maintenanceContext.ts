import type { WorkOrder, Maintenance } from "@/features/shared/types/domain";
import { maintenanceTypeCode } from "@/features/shared/services/maintenanceRules";

export function maintenanceOrderContext(
  order: WorkOrder | undefined,
): Partial<Maintenance> {
  if (!order) return { orderId: "" };
  const service = order.services.length === 1 ? order.services[0] : undefined;
  return {
    orderId: order.id,
    vehicleId: order.vehicleId,
    mileage: order.mileage,
    ...(service
      ? {
          type: service.name,
          maintenanceTypeCode: maintenanceTypeCode({ type: service.name }),
          interventionType: service.interventionType ?? "MAINTENANCE",
          interventionReason: service.interventionReason ?? "SCHEDULED",
          workDetails: [...(service.workDetails ?? [])],
        }
      : {}),
  };
}
