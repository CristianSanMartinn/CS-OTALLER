import {
  latestMaintenanceByType,
  summarizeMaintenance,
  type ScheduledMaintenance,
} from "@/features/shared/services/maintenanceRules";

export { summarizeMaintenance as vehicleMaintenanceSummary } from "@/features/shared/services/maintenanceRules";
export type { ScheduledMaintenance as PublicMaintenance } from "@/features/shared/services/maintenanceRules";

// A historical record can only raise a present-day alert while it remains current.
export function maintenanceRecordSummary(
  records: ScheduledMaintenance[],
  recordId: string,
  mileage: number,
  day?: string,
) {
  const current = latestMaintenanceByType(records).find(
    (record) => record.id === recordId,
  );
  return current ? summarizeMaintenance([current], mileage, day) : null;
}
