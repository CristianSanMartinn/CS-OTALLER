import type { Vehicle } from "@/features/shared/types/domain";

type AvailableVehicle = Vehicle & { active?: boolean };
export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function indexVehiclePlates(
  vehicles: readonly AvailableVehicle[],
  workshopId: string,
) {
  return vehicles
    .filter(
      (vehicle) =>
        vehicle.workshopId === workshopId && vehicle.active !== false,
    )
    .map((vehicle) => ({ vehicle, plate: normalizePlate(vehicle.plate) }));
}

export function searchVehiclePlates(
  index: ReturnType<typeof indexVehiclePlates>,
  query: string,
  limit = 5,
) {
  const plate = normalizePlate(query);
  if (!plate) return { results: [], total: 0, exactCount: 0 };
  const matches = index
    .filter((entry) => entry.plate.includes(plate))
    .sort(
      (a, b) =>
        Number(b.plate === plate) - Number(a.plate === plate) ||
        a.plate.localeCompare(b.plate),
    );
  return {
    results: matches.slice(0, limit).map((entry) => entry.vehicle),
    total: matches.length,
    exactCount: matches.filter((entry) => entry.plate === plate).length,
  };
}
