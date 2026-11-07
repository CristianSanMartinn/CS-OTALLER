import { Panel, Field, TextField } from "@/components/ui/primitives";
import { km } from "@/utils/format";
import { OrderSectionProps } from "../../../types/editor.types";
export function ReceptionSection({
  order,
  onChange,
  receptionOnly = false,
  mileageInput,
  onMileageChange,
  referenceMileage,
  onUsePreviousMileage,
}: OrderSectionProps & {
  receptionOnly?: boolean;
  mileageInput: string;
  onMileageChange: (value: string) => void;
  referenceMileage?: number;
  onUsePreviousMileage: () => void;
}) {
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
          max={2147483647}
          step={1}
          value={mileageInput}
          aria-describedby="reception-mileage-reference"
          onChange={(e) => onMileageChange(e.target.value)}
        />
        <div className="field full">
          <p id="reception-mileage-reference" className="muted">
            {referenceMileage !== undefined
              ? "Último kilometraje registrado: " +
                km(referenceMileage) +
                ". Es una referencia, no una lectura confirmada del ingreso."
              : "Sin kilometraje histórico válido para usar como referencia."}
          </p>
          {referenceMileage !== undefined && (
            <button
              type="button"
              className="button"
              onClick={onUsePreviousMileage}
            >
              Usar kilometraje anterior
            </button>
          )}
        </div>
        <Field
          label="Motivo de ingreso"
          required
          value={order.reason}
          onChange={(e) => onChange({ reason: e.target.value })}
        />
        {!receptionOnly && (
          <TextField
            label="Síntomas informados por el cliente"
            value={order.symptoms}
            onChange={(e) => onChange({ symptoms: e.target.value })}
          />
        )}
      </div>
    </Panel>
  );
}
