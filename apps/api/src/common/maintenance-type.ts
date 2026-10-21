import { BadRequestException } from "@nestjs/common";

const codes = [
  "OIL_CHANGE",
  "COOLANT",
  "BRAKE_FLUID",
  "SPARK_PLUGS",
  "TIMING",
  "AIR_FILTER",
  "CABIN_FILTER",
  "FUEL_FILTER",
  "FILTERS",
  "OTHER",
] as const;
export type MaintenanceTypeCode = (typeof codes)[number];

function isMaintenanceTypeCode(value: unknown): value is MaintenanceTypeCode {
  return (
    typeof value === "string" && (codes as readonly string[]).includes(value)
  );
}

export function inferMaintenanceType(name: string): MaintenanceTypeCode {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const aliases: Record<string, MaintenanceTypeCode> = {
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
  const inferred = Object.hasOwn(aliases, normalized)
    ? aliases[normalized]
    : undefined;
  return isMaintenanceTypeCode(inferred) ? inferred : "OTHER";
}

export function readMaintenanceTypeCode(
  value: unknown,
  name: string,
): MaintenanceTypeCode {
  // Accept old clients during the rollout; new clients always send a code.
  const code = value === undefined ? inferMaintenanceType(name) : value;
  if (!isMaintenanceTypeCode(code)) {
    throw new BadRequestException("Categoría de mantención inválida.");
  }
  return code;
}
