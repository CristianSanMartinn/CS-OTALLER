import { Panel, TextField } from "@/components/ui/primitives";
import { OrderSectionProps } from "../types/editor.types";
export function DiagnosisSection({ order, onChange }: OrderSectionProps) {
  return (
    <Panel title="03 · Diagnóstico">
      <div className="form-grid">
        <TextField
          label="Diagnóstico del mecánico"
          value={order.diagnosis}
          onChange={(e) => onChange({ diagnosis: e.target.value })}
        />
        <TextField
          label="Fallas encontradas"
          value={order.findings}
          onChange={(e) => onChange({ findings: e.target.value })}
        />
      </div>
    </Panel>
  );
}
