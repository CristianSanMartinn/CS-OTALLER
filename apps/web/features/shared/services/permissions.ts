import { Store, User, WorkOrder } from "../types/domain";
import { workerTransitions } from "@/features/ordenes/types/order.constants";
export function scopedData(data: Store, user: User): Store {
  const admin = user.role === "ADMIN";
  const own = <T extends { workshopId: string }>(rows: T[]) =>
    rows.filter((x) => x.workshopId === user.workshopId);
  const orders = own(data.orders).filter(
    (o) => admin || o.mechanicId === user.id,
  );
  const vehicleIds = new Set(orders.map((o) => o.vehicleId));
  const vehicles = own(data.vehicles).filter(
    (v) => admin || vehicleIds.has(v.id),
  );
  const customerIds = new Set(vehicles.map((v) => v.customerId));
  return {
    ...data,
    orders,
    vehicles,
    customers: own(data.customers).filter(
      (c) => admin || customerIds.has(c.id),
    ),
    users: own(data.users).filter((u) => admin || u.id === user.id),
    maintenance: own(data.maintenance).filter(
      (m) => admin || vehicleIds.has(m.vehicleId),
    ),
    appointments: own(data.appointments).filter(
      (a) => admin || a.mechanicId === user.id,
    ),
    activity: own(data.activity).filter(
      (a) =>
        admin || a.userId === user.id || orders.some((o) => o.id === a.orderId),
    ),
  };
}
export function canChangeStatus(
  user: User,
  previous: WorkOrder,
  next: WorkOrder["status"],
) {
  return (
    user.workshopId === previous.workshopId &&
    (user.role === "ADMIN" ||
      (previous.mechanicId === user.id &&
        (previous.status === next ||
          workerTransitions[previous.status].includes(next))))
  );
}
export const adminRoutes = [
  "/clientes",
  "/trabajadores",
  "/configuracion",
  "/estadisticas",
  "/servicios",
  "/repuestos",
];
