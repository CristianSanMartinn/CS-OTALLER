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
  const edit = (id: string, patch: Partial<ScannerCode>) =>
    onChange({
      codes: order.codes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  return (
    <Panel
      title="Códigos de scanner"
      subtitle="Diagnóstico electrónico del vehículo"
      action={
        <button
          type="button"
          className="button small"
          onClick={() =>
            onChange({
              codes: [
                ...order.codes,
                {
                  id: uid(),
                  code: "",
                  description: "",
                  status: "Activo",
                  notes: "",
                },
              ],
            })
          }
        >
          <Plus size={16} />
          Agregar código
        </button>
      }
    >
      {!order.codes.length && (
        <p className="section-hint">No se han registrado códigos de falla.</p>
      )}
      {order.codes.map((c) => (
        <div className="repeat-row" key={c.id}>
          <div className="form-grid">
            <Field
              label="Código"
              placeholder="P0300"
              required
              pattern="[PBCUpbcu][0-9A-Fa-f]{4}"
              value={c.code}
              onChange={(e) =>
                edit(c.id, { code: e.target.value.toUpperCase() })
              }
            />
            <Field
              label="Descripción"
              required
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
            aria-label="Eliminar código"
            onClick={() =>
              onChange({ codes: order.codes.filter((x) => x.id !== c.id) })
            }
          >
            <Trash2 size={17} />
          </button>
        </div>
      ))}
    </Panel>
  );
}
