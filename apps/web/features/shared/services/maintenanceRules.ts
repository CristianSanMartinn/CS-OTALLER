import type {
  MaintenanceClassification,
  MaintenanceThresholds,
  MaintenanceTypeCode,
} from "../../../../../packages/types/src/maintenance.types";

export const maintenanceCategories: {
  code: MaintenanceTypeCode;
  label: string;
}[] = [
  { code: "OIL_CHANGE", label: "Aceite de motor" },
  { code: "COOLANT", label: "Refrigerante" },
  { code: "BRAKE_FLUID", label: "Líquido de frenos" },
  { code: "SPARK_PLUGS", label: "Bujías" },
  { code: "TIMING", label: "Distribución" },
  { code: "AIR_FILTER", label: "Filtro de aire" },
  { code: "CABIN_FILTER", label: "Filtro de cabina" },
  { code: "FUEL_FILTER", label: "Filtro de combustible" },
  { code: "FILTERS", label: "Filtros (heredado, sin especificar)" },
  { code: "OTHER", label: "Otros mantenimientos o reparaciones" },
];

export const defaultMaintenanceThresholds: Readonly<MaintenanceThresholds> = {
  nearMileage: 2500,
  nearDays: 30,
};

export const normalizeMaintenanceName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const legacyNames: Record<string, MaintenanceTypeCode> = {
  aceite: "OIL_CHANGE",
  "cambio de aceite": "OIL_CHANGE",
  "cambio aceite": "OIL_CHANGE",
  "cambio de aceite de motor": "OIL_CHANGE",
  "cambio de aceite y filtro": "OIL_CHANGE",
  "cambio aceite y filtro": "OIL_CHANGE",
  "cambio de aceite de motor y filtro": "OIL_CHANGE",
  refrigerante: "COOLANT",
  "cambio de refrigerante": "COOLANT",
  "liquido de frenos": "BRAKE_FLUID",
  "cambio de liquido de frenos": "BRAKE_FLUID",
  bujias: "SPARK_PLUGS",
  "cambio de bujias": "SPARK_PLUGS",
  distribucion: "TIMING",
  "cambio de distribucion": "TIMING",
  "correa de distribucion": "TIMING",
  "cambio de correa de distribucion": "TIMING",
  "cadena de distribucion": "TIMING",
  "filtro de aire": "AIR_FILTER",
  "cambio de filtro de aire": "AIR_FILTER",
  "filtro combustible": "FUEL_FILTER",
  "filtro de combustible": "FUEL_FILTER",
  "cambio de filtro de combustible": "FUEL_FILTER",
  "filtro de cabina": "CABIN_FILTER",
  "cambio de filtro de cabina": "CABIN_FILTER",
};

export function maintenanceTypeCode(
  record: MaintenanceClassification,
): MaintenanceTypeCode {
  if (record.maintenanceTypeCode != null) return record.maintenanceTypeCode;
  const name = normalizeMaintenanceName(record.type);
  const inferred = Object.hasOwn(legacyNames, name)
    ? legacyNames[name]
    : "OTHER";
  return maintenanceCategories.some((category) => category.code === inferred)
    ? inferred
    : "OTHER";
}

export function maintenanceGroupKey(record: MaintenanceClassification) {
  const code = maintenanceTypeCode(record);
  // Unclassified repairs must not cancel reminders for unrelated services.
  return code === "OTHER"
    ? "OTHER:" + normalizeMaintenanceName(record.type)
    : code;
}

export interface ScheduledMaintenance extends MaintenanceClassification {
  id: string;
  workshopId?: string;
  vehicleId?: string;
  interventionType?: "MAINTENANCE" | "REPAIR";
  date: string;
  mileage: number;
  nextMileage: number | null;
  nextDate: string | null;
}

export function latestMaintenanceByType<T extends ScheduledMaintenance>(
  records: T[],
): T[] {
  const latest = new Map<string, T>();
  const sorted = [...records].sort(
    (a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage,
  );
  for (const record of sorted) {
    if (
      record.interventionType === "REPAIR" &&
      !record.nextMileage &&
      !record.nextDate
    )
      continue;
    const key = [
      record.workshopId ?? "",
      record.vehicleId ?? "",
      maintenanceGroupKey(record),
    ].join(":");
    if (!latest.has(key)) latest.set(key, record);
  }
  return [...latest.values()];
}

export function maintenanceState(
  record: Pick<ScheduledMaintenance, "nextMileage" | "nextDate">,
  mileage: number,
  day: string,
  thresholds: MaintenanceThresholds = defaultMaintenanceThresholds,
) {
  const settings = {
    nearMileage:
      Number.isFinite(thresholds.nearMileage) && thresholds.nearMileage >= 0
        ? thresholds.nearMileage
        : defaultMaintenanceThresholds.nearMileage,
    nearDays:
      Number.isFinite(thresholds.nearDays) && thresholds.nearDays >= 0
        ? thresholds.nearDays
        : defaultMaintenanceThresholds.nearDays,
  };
  const remaining =
    (record.nextMileage ?? 0) > 0 ? record.nextMileage! - mileage : null;
  const parsedDays = record.nextDate
    ? (Date.parse(record.nextDate + "T12:00:00Z") -
        Date.parse(day + "T12:00:00Z")) /
      86400000
    : NaN;
  const days = Number.isFinite(parsedDays) ? parsedDays : null;
  const status =
    remaining === null && days === null
      ? "UNSCHEDULED"
      : (remaining !== null && remaining <= 0) || (days !== null && days <= 0)
        ? "VENCIDA"
        : (remaining !== null && remaining <= settings.nearMileage) ||
            (days !== null && days <= settings.nearDays)
          ? "PROXIMA"
          : "AL_DIA";
  return { status, days, remaining } as const;
}

export function summarizeMaintenance(
  records: ScheduledMaintenance[],
  mileage: number,
  day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
  thresholds?: MaintenanceThresholds,
) {
  const sorted = [...records].sort(
    (a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage,
  );
  const upcoming = latestMaintenanceByType(records).filter(
    (record) => (record.nextMileage ?? 0) > 0 || record.nextDate,
  );
  const next = upcoming
    .map((record) => {
      const state = maintenanceState(record, mileage, day, thresholds);
      return {
        record,
        distance: state.remaining ?? Infinity,
        days: state.days ?? Infinity,
        rank:
          state.status === "VENCIDA" ? 0 : state.status === "PROXIMA" ? 1 : 2,
      };
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        Math.min(a.days, a.distance / 100) - Math.min(b.days, b.distance / 100),
    )[0];
  return {
    lastDate: sorted[0]?.date ?? "",
    next,
    status: !next
      ? records.length
        ? "Sin programación"
        : "Sin historial"
      : next.rank === 0
        ? "Vencida"
        : next.rank === 1
          ? "Próxima"
          : "Al día",
    tone: !next
      ? "neutral"
      : next.rank === 0
        ? "overdue"
        : next.rank === 1
          ? "soon"
          : "current",
  };
}
