import type { Store, Intervention, MaintenanceTypeCode } from "../types/domain";

export interface WorkHistoryEntry extends Intervention {
  name: string;
  maintenanceTypeCode?: MaintenanceTypeCode;
  date?: string;
}

export function workshopWorkHistory(
  data: Store,
  workshopId: string,
): WorkHistoryEntry[] {
  return [
    ...data.orders
      .filter(
        (order) =>
          order.workshopId === workshopId && order.status !== "CANCELLED",
      )
      .flatMap((order) =>
        order.services.map((service) => ({ ...service, date: order.date })),
      ),
    ...data.maintenance
      .filter((record) => record.workshopId === workshopId)
      .map((record) => ({ ...record, name: record.type })),
  ].filter(
    (entry) =>
      entry.name.trim() && entry.interventionType && entry.interventionReason,
  );
}
