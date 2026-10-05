import { Customer, Store } from "@/features/shared/types/domain";
import { customerVehicle } from "./customerPortalService";
// Los clientes mock previos tienen un código estable; los nuevos reciben un UUID.
// En producción estos enlaces públicos deberán resolverse en el backend.
export const clientAccessToken = (
  customer: Pick<Customer, "id" | "publicAccessToken">,
) => customer.publicAccessToken ?? "demo-client-" + customer.id;
export const clientAccessPath = (
  customer: Pick<Customer, "id" | "publicAccessToken">,
) => "/mi-taller/" + encodeURIComponent(clientAccessToken(customer));
export const clientVehiclePath = (token: string, vehicleId: string) =>
  "/mi-taller/" +
  encodeURIComponent(token) +
  "/vehiculos/" +
  encodeURIComponent(vehicleId);
export function clientAccess(data: Store, token: string) {
  const customer = data.customers.find(
    (c) =>
      c.workshopId === data.workshop.id &&
      c.active !== false &&
      clientAccessToken(c) === token,
  );
  if (!customer) return null;
  return {
    token,
    workshop: {
      name: data.workshop.name,
      phone: data.workshop.phone,
      logo: data.workshop.logo,
    },
    vehicles: data.vehicles
      .filter(
        (v) =>
          v.customerId === customer.id && v.workshopId === customer.workshopId,
      )
      .map((v) => ({
        id: v.id,
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        year: v.year,
        mileage: v.mileage,
        maintenance: data.maintenance
          .filter(
            (m) => m.vehicleId === v.id && m.workshopId === customer.workshopId,
          )
          .map((m) => ({
            id: m.id,
            type: m.type,
            date: m.date,
            mileage: m.mileage,
            nextMileage: m.nextMileage,
            nextDate: m.nextDate,
          })),
      })),
  };
}
export function clientVehicle(data: Store, token: string, vehicleId: string) {
  const access = clientAccess(data, token);
  if (!access?.vehicles.some((v) => v.id === vehicleId)) return null;
  return customerVehicle(data, "demo-" + vehicleId);
}
