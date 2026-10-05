import { Cancellation, Store, VisitKind } from "../types/domain";
export function applyCancellation(
  data: Store,
  kind: VisitKind,
  id: string,
  cancellation: Cancellation,
): Store {
  return kind === "order"
    ? {
        ...data,
        orders: data.orders.map((o) =>
          o.id === id ? { ...o, status: "CANCELLED", cancellation } : o,
        ),
      }
    : {
        ...data,
        appointments: data.appointments.map((a) =>
          a.id === id ? { ...a, status: "Cancelada", cancellation } : a,
        ),
      };
}
