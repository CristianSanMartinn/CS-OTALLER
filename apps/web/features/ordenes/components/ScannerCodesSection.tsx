import { Plus, Trash2 } from "lucide-react";
import {
  Panel,
  Field,
  SelectField,
  TextField,
} from "@/components/ui/primitives";
import { OrderSectionProps } from "../types/editor.types";
import { ScannerCode } from "@/features/shared/types/domain";
import { uid } from "@/utils/format";
export function ScannerCodesSection({ order, onChange }: OrderSectionProps) {
  const addCode = () =>
    onChange({
      codes: [
        ...order.codes,
        { id: uid(), code: "", description: "", status: "Activo", notes: "" },
      ],
    });
  const edit = (id: string, patch: Partial<ScannerCode>) =>
    onChange({
      codes: order.codes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  return (
    <Panel
      title="Códigos de scanner"
      subtitle="Agrega un registro por cada código de falla: P0011, P0014, P0300…"
      action={
        <button type="button" className="button small" onClick={addCode}>
          <Plus size={16} />
          Agregar código
        </button>
      }
    >
      {!order.codes.length && (
        <p className="section-hint">No se han registrado códigos de falla.</p>
      )}
      {order.codes.map((c, index) => (
        <div className="repeat-row" key={c.id}>
          <div className="form-grid">
            <Field
              label={"Código " + (index + 1)}
              placeholder="P0300"
              required
              pattern="[PBCUpbcu][0-9A-Fa-f]{4}"
              value={c.code}
              onChange={(e) =>
                edit(c.id, { code: e.target.value.toUpperCase() })
              }
            />
            <Field
              label="Descripción (opcional)"
              value={c.description}
              onChange={(e) => edit(c.id, { description: e.target.value })}
            />
            <SelectField
              label="Estado"
              value={c.status}
              onChange={(e) => edit(c.id, { status: e.target.value })}
            >
              <option>Activo</option>
              <option>Pendiente</option>
              <option>Resuelto</option>
            </SelectField>
            <TextField
              label="Observación"
              value={c.notes}
              onChange={(e) => edit(c.id, { notes: e.target.value })}
            />
          </div>
          <button
            type="button"
            className="icon-button danger"
            aria-label={"Eliminar código " + (index + 1)}
            onClick={() =>
              onChange({ codes: order.codes.filter((x) => x.id !== c.id) })
            }
          >
            <Trash2 size={17} />
          </button>
        </div>
      ))}
      {order.codes.length > 0 && (
        <div className="panel-padding">
          <button type="button" className="button" onClick={addCode}>
            <Plus size={16} /> Agregar otro código
          </button>
          <p className="help-text">
            {order.codes.length} códigos en esta orden. Se guardan todos al
            guardar la orden.
          </p>
        </div>
      )}
    </Panel>
  );
}
