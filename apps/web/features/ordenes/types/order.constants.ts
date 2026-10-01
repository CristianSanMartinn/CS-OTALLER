import { OrderStatus } from "@/features/shared/types/domain";
export const statusLabels: Record<OrderStatus, string> = {
  RECEIVED: "Recibido",
  DIAGNOSIS: "Diagnóstico",
  WAITING_PARTS: "Esperando repuestos",
  IN_REPAIR: "En reparación",
  READY: "Listo para entregar",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};
export const workerTransitions: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ["DIAGNOSIS"],
  DIAGNOSIS: ["WAITING_PARTS", "IN_REPAIR"],
  WAITING_PARTS: ["IN_REPAIR"],
  IN_REPAIR: ["WAITING_PARTS", "READY"],
  READY: [],
  DELIVERED: [],
  CANCELLED: [],
};
