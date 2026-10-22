import type { Maintenance, Vehicle } from "@/features/shared/types/domain";
import type { MaintenanceThresholds } from "../../../../../packages/types/src/maintenance.types";
import { summarizeMaintenance } from "@/features/shared/services/maintenanceRules";

export function dashboardMaintenanceSummary(
  vehicles: Vehicle[],
  records: Maintenance[],
  workshopId: string,
  day: string,
  thresholds?: MaintenanceThresholds,
) {
  const counts = {
    overdue: 0,
    soon: 0,
    current: 0,
    unscheduled: 0,
    withoutHistory: 0,
  };
  const grouped = new Map<string, Maintenance[]>();
  for (const record of records) {
    if (record.workshopId !== workshopId) continue;
    const rows = grouped.get(record.vehicleId) ?? [];
    rows.push(record);
    grouped.set(record.vehicleId, rows);
  }
  for (const vehicle of vehicles) {
    if (vehicle.workshopId !== workshopId) continue;
    const history = grouped.get(vehicle.id) ?? [];
    const result = summarizeMaintenance(
      history,
      vehicle.mileage,
      day,
      thresholds,
    );
    if (
      result.tone === "overdue" ||
      result.tone === "soon" ||
      result.tone === "current"
    )
      counts[result.tone]++;
    else if (history.length) counts.unscheduled++;
    else counts.withoutHistory++;
  }
  return counts;
}
