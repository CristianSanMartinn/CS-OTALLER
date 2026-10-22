import { Maintenance } from "@/features/shared/types/domain";
import type { MaintenanceThresholds } from "../../../../../packages/types/src/maintenance.types";
import {
  latestMaintenanceByType,
  maintenanceState,
} from "@/features/shared/services/maintenanceRules";

export function latestMaintenance(records: Maintenance[]) {
  return latestMaintenanceByType(records).filter(
    (record) => record.nextMileage || record.nextDate,
  );
}

export function maintenanceReminder(
  record: Maintenance,
  mileage: number,
  date: string,
  thresholds?: MaintenanceThresholds,
) {
  const result = maintenanceState(record, mileage, date, thresholds);
  return {
    days: result.days,
    remaining: result.remaining,
    status:
      result.status === "VENCIDA"
        ? "due"
        : result.status === "PROXIMA"
          ? "soon"
          : result.status === "AL_DIA"
            ? "scheduled"
            : "unscheduled",
    label:
      result.status === "VENCIDA"
        ? "Mantención pendiente"
        : result.status === "PROXIMA"
          ? "Próxima mantención cercana"
          : result.status === "AL_DIA"
            ? "Mantención programada"
            : "Sin programación",
  };
}
