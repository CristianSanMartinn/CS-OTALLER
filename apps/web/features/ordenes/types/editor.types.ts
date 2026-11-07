import { WorkOrder } from "@/features/shared/types/domain";
export type WorkOrderDraft = Omit<WorkOrder, "mileage">;
export interface OrderSectionProps {
  order: WorkOrderDraft;
  onChange: (patch: Partial<WorkOrderDraft>) => void;
}
