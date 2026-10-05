import {
  Customer,
  Store,
  Vehicle,
  User,
  Workshop,
  WorkOrder,
  Maintenance,
  Appointment,
  Activity,
} from "../types/domain";
import { apiRequest } from "@/lib/http";
type Row = Record<string, unknown>;
const str = (r: Row, k: string) => String(r[k] ?? "");
export function customerFromRow(r: Row): Customer {
  return {
    id: str(r, "id"),
    workshopId: str(r, "workshop_id"),
    publicAccessToken: str(r, "portal_token") || undefined,
    active: r.active !== false,
    name: [str(r, "first_name"), str(r, "last_name")].filter(Boolean).join(" "),
    rut: str(r, "rut"),
    phone: str(r, "phone"),
    email: str(r, "email"),
    address: str(r, "address"),
    notes: str(r, "notes"),
    createdAt: str(r, "registered_at").slice(0, 10),
    reminderPreferences:
      r.reminder_preferences as Customer["reminderPreferences"],
    photos: (Array.isArray(r.photos) ? r.photos : []) as Customer["photos"],
  };
}
export function vehicleFromRow(r: Row): Vehicle {
  return {
    id: str(r, "id"),
    workshopId: str(r, "workshop_id"),
    customerId: str(r, "customer_id"),
    photos: (Array.isArray(r.photos) ? r.photos : []) as Vehicle["photos"],
    plate: str(r, "license_plate"),
    brand: str(r, "brand"),
    model: str(r, "model"),
    version: str(r, "version"),
    year: Number(r.year ?? 0),
    vin: str(r, "vin"),
    engine: str(r, "engine"),
    fuel: str(r, "fuel_type"),
    transmission: str(r, "transmission"),
    mileage: Number(r.mileage ?? 0),
    color: str(r, "color"),
  };
}
export function emptyData(): Store {
  return {
    users: [],
    customers: [],
    vehicles: [],
    orders: [],
    maintenance: [],
    appointments: [],
    activity: [],
    workshop: {
      id: "",
      workshopId: "",
      name: "C.S.OTALLER",
      rut: "",
      phone: "",
      email: "",
      address: "",
      hours: "",
      logo: "",
      preference: "Kilómetros · CLP",
    },
  };
}
export async function loadLiveData() {
  const session = await apiRequest<{ user: User; workshop: Workshop }>(
    "auth/me",
  );
  const [
    customers,
    vehicles,
    users,
    orders,
    maintenance,
    appointments,
    activity,
  ] = await Promise.all([
    session.user.role === "ADMIN"
      ? apiRequest<Row[]>("customers")
      : apiRequest<Row[]>("workshop/related-customers"),
    apiRequest<Row[]>("vehicles"),
    session.user.role === "ADMIN"
      ? apiRequest<User[]>("users")
      : Promise.resolve([session.user]),
    apiRequest<WorkOrder[]>("work-orders"),
    apiRequest<Maintenance[]>("maintenance"),
    apiRequest<Appointment[]>("appointments"),
    apiRequest<Activity[]>("workshop/activity"),
  ]);
  return {
    user: session.user,
    data: {
      ...emptyData(),
      users,
      orders,
      maintenance,
      appointments,
      activity,
      workshop: session.workshop,
      customers: customers.map(customerFromRow),
      vehicles: vehicles.map(vehicleFromRow),
    },
  };
}
export async function saveLiveCustomer(customer: Customer, editing: boolean) {
  const names = customer.name.trim().split(/\s+/),
    first = names.shift() ?? "";
  const row = await apiRequest<Row>(
    "customers" + (editing ? "/" + customer.id : ""),
    editing ? "PATCH" : "POST",
    {
      first_name: first,
      last_name: names.join(" "),
      rut: customer.rut,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
      photos: customer.photos ?? [],
      reminderPreferences: customer.reminderPreferences,
    },
  );
  return customerFromRow(row);
}
export async function saveLiveVehicle(vehicle: Vehicle, editing: boolean) {
  const row = await apiRequest<Row>(
    "vehicles" + (editing ? "/" + vehicle.id : ""),
    editing ? "PATCH" : "POST",
    {
      customer_id: vehicle.customerId,
      license_plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      version: vehicle.version,
      year: vehicle.year,
      vin: vehicle.vin,
      engine: vehicle.engine,
      fuel_type: vehicle.fuel,
      transmission: vehicle.transmission,
      mileage: vehicle.mileage,
      color: vehicle.color,
      photos: vehicle.photos,
    },
  );
  return vehicleFromRow(row);
}
