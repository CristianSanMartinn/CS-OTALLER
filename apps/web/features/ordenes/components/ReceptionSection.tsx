import { Panel, Field, TextField } from "@/components/ui/primitives";
import { OrderSectionProps } from "../types/editor.types";
export function ReceptionSection({ order, onChange }: OrderSectionProps) {
  return (
    <Panel title="02 · Recepción" subtitle="Condición del vehículo al ingresar">
      <div className="form-grid">
        <Field
          label="Fecha de ingreso"
          type="date"
          required
          value={order.date}
          onChange={(e) => onChange({ date: e.target.value })}
        />
        <Field
          label="Hora"
          type="time"
          required
          value={order.time}
          onChange={(e) => onChange({ time: e.target.value })}
        />
        <Field
          label="Kilometraje de ingreso"
          type="number"
          min={0}
          required
          value={order.mileage}
          onChange={(e) => onChange({ mileage: Number(e.target.value) })}
        />
        <Field
          label="Motivo de ingreso"
          required
          value={order.reason}
          onChange={(e) => onChange({ reason: e.target.value })}
        />
        <TextField
          label="Síntomas informados por el cliente"
          value={order.symptoms}
          onChange={(e) => onChange({ symptoms: e.target.value })}
        />
      </div>
    </Panel>
  );
}
