import { Store, User, WorkOrder } from "@/features/shared/types/domain";
import { canChangeStatus } from "@/features/shared/services/permissions";
import { uid } from "@/utils/format";
export function saveOrder(data: Store, user: User, order: WorkOrder): Store {
  const previous = data.orders.find((o) => o.id === order.id);
  const vehicle = data.vehicles.find(
    (v) => v.id === order.vehicleId && v.workshopId === user.workshopId,
  );
  const customer = data.customers.find(
    (c) => c.id === order.customerId && c.workshopId === user.workshopId,
  );
  const mechanic = data.users.find(
    (u) =>
      u.id === order.mechanicId && u.workshopId === user.workshopId && u.active,
  );
  if (
    order.workshopId !== user.workshopId ||
    !vehicle ||
    !customer ||
    vehicle.customerId !== customer.id ||
    !mechanic
  )
    throw new Error("Verifica el cliente, el vehículo y el mecánico asignado.");
  if (
    user.role === "WORKER" &&
    (order.mechanicId !== user.id ||
      (!previous &&
        !data.orders.some(
          (o) => o.vehicleId === order.vehicleId && o.mechanicId === user.id,
        )))
  )
    throw new Error(
      "Solo puedes registrar fichas para tus vehículos asignados.",
    );
  if (previous && !canChangeStatus(user, previous, order.status))
    throw new Error("No tienes permiso para realizar este cambio de estado.");
  if (!previous && user.role === "WORKER" && order.status !== "RECEIVED")
    throw new Error("La ficha debe iniciar como recibida.");
  if (
    !order.reason.trim() ||
    !order.date ||
    !order.time ||
    !Number.isFinite(order.mileage) ||
    order.mileage < 0
  )
    throw new Error("Completa los datos de recepción.");
  if (
    order.mileage < vehicle.mileage &&
    (!previous || order.mileage !== previous.mileage)
  )
    throw new Error("El kilometraje no puede ser menor al último registrado.");
  if (
    order.services.some(
      (s) => !s.name.trim() || s.price < 0 || !Number.isFinite(s.price),
    ) ||
    order.parts.some(
      (p) =>
        !p.name.trim() ||
        p.quantity < 1 ||
        p.price < 0 ||
        !Number.isFinite(p.price) ||
        !Number.isInteger(p.quantity),
    )
  )
    throw new Error("Revisa los servicios, cantidades y precios.");
  const saved =
    user.role === "WORKER"
      ? {
          ...order,
          services: order.services.map((s) => ({
            ...s,
            price: previous?.services.find((x) => x.id === s.id)?.price ?? 0,
          })),
          parts: order.parts.map((p) => ({
            ...p,
            price: previous?.parts.find((x) => x.id === p.id)?.price ?? 0,
          })),
        }
      : { ...order };
  if (!previous)
    saved.number =
      "OT-" +
      (Math.max(
        1000,
        ...data.orders
          .filter((o) => o.workshopId === user.workshopId)
          .map((o) => Number(o.number.replace("OT-", ""))),
      ) +
        1);
  return {
    ...data,
    orders: previous
      ? data.orders.map((o) => (o.id === order.id ? saved : o))
      : [saved, ...data.orders],
    vehicles: data.vehicles.map((v) =>
      v.id === vehicle.id
        ? { ...v, mileage: Math.max(v.mileage, order.mileage) }
        : v,
    ),
    activity: [
      {
        id: uid(),
        workshopId: user.workshopId,
        text: order.number + (previous ? " actualizada" : " creada"),
        date: new Date().toISOString(),
        userId: user.id,
        orderId: order.id,
      },
      ...data.activity,
    ],
  };
}
