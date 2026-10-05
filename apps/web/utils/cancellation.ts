import { CancellationReason } from "@/features/shared/types/domain";
export const cancellationReasons: Record<CancellationReason, string> = {
  CLIENT_CANCELLED: "Cliente cancela visita",
  NO_BUDGET: "No tiene presupuesto",
  DIAGNOSIS_ONLY: "Solo diagnóstico",
  OTHER: "Otros",
};
