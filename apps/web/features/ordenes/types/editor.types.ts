import { WorkOrder } from "@/features/shared/types/domain";
export interface OrderSectionProps {
  order: WorkOrder;
  onChange: (patch: Partial<WorkOrder>) => void;
}
