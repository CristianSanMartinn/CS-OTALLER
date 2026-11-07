import { apiRequest } from "@/lib/http";
import { normalizePlate } from "./vehiclePlateSearch";

export type PlateRegistrationStatus =
  "ACTIVE" | "INACTIVE" | "AMBIGUOUS" | "NO_MATCH";
export async function checkPlateRegistration(
  input: string,
  signal: AbortSignal,
): Promise<PlateRegistrationStatus> {
  if (!input.trim() || input.length > 20 || !normalizePlate(input))
    throw new Error("Ingresa una patente válida de hasta 20 caracteres.");
  const response = await apiRequest<{ status: PlateRegistrationStatus }>(
    "vehicles/plate-check?" +
      new URLSearchParams({ plate: normalizePlate(input) }),
    "GET",
    undefined,
    { signal },
  );
  if (
    !["ACTIVE", "INACTIVE", "AMBIGUOUS", "NO_MATCH"].includes(response?.status)
  )
    throw new Error("La comprobación devolvió una respuesta inválida.");
  return response.status;
}
