import { Plus, Trash2 } from "lucide-react";
import { Panel, Field } from "@/components/ui/primitives";
import { OrderSectionProps } from "../types/editor.types";
import { PartItem } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { uid, money } from "@/utils/format";
export function PartsSection({ order, onChange }: OrderSectionProps) {
  const { user } = useStore();
  const edit = (id: string, patch: Partial<PartItem>) =>
    onChange({
      parts: order.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  return (
    <Panel
      title="05 · Repuestos utilizados"
      action={
        <button
          type="button"
          className="button small"
          onClick={() =>
            onChange({
              parts: [
                ...order.parts,
                {
                  id: uid(),
                  name: "",
                  brand: "",
                  partNumber: "",
                  quantity: 1,
                  price: 0,
                  notes: "",
                },
              ],
            })
          }
        >
          <Plus size={16} />
          Agregar repuesto
        </button>
      }
    >
      {!order.parts.length && (
        <p className="section-hint">
          Aún no se registran repuestos en esta orden.
        </p>
      )}
      {order.parts.map((p) => (
        <div className="repeat-row" key={p.id}>
          <div className="form-grid">
            <Field
              label="Nombre"
              required
              value={p.name}
              onChange={(e) => edit(p.id, { name: e.target.value })}
            />
            <Field
              label="Marca"
              value={p.brand}
              onChange={(e) => edit(p.id, { brand: e.target.value })}
            />
            <Field
              label="Número de parte"
              value={p.partNumber}
              onChange={(e) => edit(p.id, { partNumber: e.target.value })}
            />
            <Field
              label="Cantidad"
              required
              type="number"
              min={1}
              step={1}
              value={p.quantity}
              onChange={(e) => edit(p.id, { quantity: Number(e.target.value) })}
            />
            {user?.role === "ADMIN" && (
              <>
                <Field
                  label="Precio unitario (CLP)"
                  required
                  type="number"
                  min={0}
                  step={1}
                  value={p.price}
                  onChange={(e) =>
                    edit(p.id, { price: Number(e.target.value) })
                  }
                />
                <div className="field">
                  <span>Total</span>
                  <strong>{money(p.price * p.quantity)}</strong>
                </div>
              </>
            )}
            <Field
              label="Observaciones"
              value={p.notes}
              onChange={(e) => edit(p.id, { notes: e.target.value })}
            />
          </div>
          <button
            type="button"
            className="icon-button danger"
            aria-label="Eliminar repuesto"
            onClick={() =>
              onChange({ parts: order.parts.filter((x) => x.id !== p.id) })
            }
          >
            <Trash2 size={17} />
          </button>
        </div>
      ))}
    </Panel>
  );
}
