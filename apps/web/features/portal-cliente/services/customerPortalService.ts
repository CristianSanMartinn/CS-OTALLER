import { Store } from "@/features/shared/types/domain";
export const customerPath = (vehicleId: string) =>
  "/mi-vehiculo/demo-" + encodeURIComponent(vehicleId);
// Proyección explícita de datos de demostración. No sustituye autorización de backend.
export function customerVehicle(data: Store, token: string) {
  if (!token.startsWith("demo-")) return null;
  const vehicle = data.vehicles.find(
    (v) => v.id === token.slice(5) && v.workshopId === data.workshop.id,
  );
  if (!vehicle) return null;
  const sameWorkshop = (x: { workshopId: string }) =>
    x.workshopId === vehicle.workshopId;
  const photo = (p: NonNullable<typeof vehicle.photos>[number]) => ({
    id: p.id,
    url: p.url,
    category: p.category,
    description: p.description,
    date: p.date,
  });
  const orders = data.orders.filter(
    (o) =>
      sameWorkshop(o) && o.vehicleId === vehicle.id && o.status !== "CANCELLED",
  );
  return {
    vehicle: {
      id: vehicle.id,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      mileage: vehicle.mileage,
    },
    workshop: {
      name: data.workshop.name,
      phone: data.workshop.phone,
      address: data.workshop.address,
      hours: data.workshop.hours,
    },
    maintenance: data.maintenance
      .filter((m) => sameWorkshop(m) && m.vehicleId === vehicle.id)
      .map((m) => ({ ...m, notes: "", mechanicId: "" })),
    orders: orders.map((o) => ({
      id: o.id,
      number: o.number,
      date: o.date,
      mileage: o.mileage,
      status: o.status,
      reason: o.reason,
      diagnosis: o.diagnosis,
      services: o.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        status: s.status,
      })),
      parts: o.parts.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        quantity: p.quantity,
      })),
      photos: o.photos.map(photo),
    })),
    photos: [
      ...(vehicle.photos ?? []).map(photo),
      ...orders.flatMap((o) => o.photos.map(photo)),
    ],
  };
}
