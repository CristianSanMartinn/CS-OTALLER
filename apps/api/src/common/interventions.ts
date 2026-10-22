import { inferMaintenanceType } from "./maintenance-type.js";
import { BadRequestException } from "@nestjs/common";
export function readIntervention(
  input: Record<string, unknown>,
  previous?: Record<string, unknown>,
) {
  const kind =
    input.interventionType === undefined
      ? (previous?.intervention_type ?? null)
      : input.interventionType;
  const reason =
    input.interventionReason === undefined
      ? (previous?.intervention_reason ?? null)
      : input.interventionReason;
  const details =
    input.workDetails === undefined
      ? (previous?.work_details ?? [])
      : input.workDetails;
  if (
    kind !== null &&
    (typeof kind !== "string" || !["MAINTENANCE", "REPAIR"].includes(kind))
  )
    throw new BadRequestException("Tipo de intervención inválido.");
  if (
    reason !== null &&
    (typeof reason !== "string" ||
      !["SCHEDULED", "WEAR", "FAULT", "OTHER"].includes(reason))
  )
    throw new BadRequestException("Motivo del trabajo inválido.");
  if ((kind === null) !== (reason === null))
    throw new BadRequestException(
      "Indica el tipo de intervención y su motivo.",
    );
  if (
    !Array.isArray(details) ||
    details.length > 30 ||
    details.some(
      (d) => typeof d !== "string" || !d.trim() || d.trim().length > 150,
    )
  )
    throw new BadRequestException("Revisa los detalles del trabajo.");
  const clean = [...new Set((details as string[]).map((d) => d.trim()))];
  if (
    clean.includes("Reemplazo de kit completo") &&
    clean.includes("Reemplazo de componentes individuales")
  )
    throw new BadRequestException(
      "Selecciona kit completo o componentes individuales.",
    );
  return { kind, reason, details: clean };
}
export const isEngineOil = (name: string) =>
  inferMaintenanceType(name) === "OIL_CHANGE";
