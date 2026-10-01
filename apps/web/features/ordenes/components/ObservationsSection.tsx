import { Panel, TextField } from "@/components/ui/primitives";
import { OrderSectionProps } from "../types/editor.types";
export function ObservationsSection({ order, onChange }: OrderSectionProps) {
  return (
    <Panel title="Observaciones finales">
      <div className="form-grid">
        <TextField
          label="Indicaciones, recomendaciones y observaciones"
          value={order.observations}
          onChange={(e) => onChange({ observations: e.target.value })}
        />
      </div>
    </Panel>
  );
}
