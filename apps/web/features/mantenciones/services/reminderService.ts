import { Maintenance } from "@/features/shared/types/domain";
export function latestMaintenance(records: Maintenance[]) {
  const latest = new Map<string, Maintenance>();
  for (const record of records) {
    const key = record.workshopId + ":" + record.vehicleId + ":" + record.type;
    const previous = latest.get(key);
    if (
      !previous ||
      record.date > previous.date ||
      (record.date === previous.date && record.mileage > previous.mileage)
    )
      latest.set(key, record);
  }
  return Array.from(latest.values());
}
export function maintenanceReminder(
  record: Maintenance,
  mileage: number,
  date: string,
) {
  const days = record.nextDate
    ? Math.round(
        (Date.parse(record.nextDate + "T12:00:00Z") -
          Date.parse(date + "T12:00:00Z")) /
          86400000,
      )
    : null;
  const remaining =
    record.nextMileage > 0 ? record.nextMileage - mileage : null;
  const due =
    (days !== null && days <= 0) || (remaining !== null && remaining <= 0);
  const soon =
    !due &&
    ((days !== null && days <= 30) ||
      (remaining !== null && remaining <= 1000));
  return {
    days,
    remaining,
    status: due ? "due" : soon ? "soon" : "scheduled",
    label: due
      ? "Mantención pendiente"
      : soon
        ? "Próxima mantención cercana"
        : "Mantención programada",
  };
}
