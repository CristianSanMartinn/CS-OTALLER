import { BadRequestException } from "@nestjs/common";

const codes = [
  "OIL_CHANGE",
  "COOLANT",
  "BRAKE_FLUID",
  "SPARK_PLUGS",
  "TIMING",
  "FILTERS",
  "OTHER",
] as const;
export type MaintenanceTypeCode = (typeof codes)[number];

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
    "filtro de aire": "FILTERS",
    "cambio de filtro de aire": "FILTERS",
    "filtro combustible": "FILTERS",
    "filtro de combustible": "FILTERS",
    "cambio de filtro de combustible": "FILTERS",
    "filtro de cabina": "FILTERS",
    "cambio de filtro de cabina": "FILTERS",
  };
  return aliases[normalized] ?? "OTHER";
}

export function readMaintenanceTypeCode(
  value: unknown,
  name: string,
): MaintenanceTypeCode {
  // Accept old clients during the rollout; new clients always send a code.
  if (value === undefined) return inferMaintenanceType(name);
  if (
    typeof value !== "string" ||
    !(codes as readonly string[]).includes(value)
  ) {
    throw new BadRequestException("Categoría de mantención inválida.");
  }
  return value as MaintenanceTypeCode;
}
