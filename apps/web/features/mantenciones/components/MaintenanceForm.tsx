import { FormEvent, useState } from "react";
import { Maintenance } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Field, SelectField, TextField } from "@/components/ui/primitives";
import { OilChangeForm } from "./OilChangeForm";
import { maintenanceTypes } from "../types/maintenance.constants";
import { today, uid } from "@/utils/format";
export function MaintenanceForm({
  orderId = "",
  onSave,
  onCancel,
}: {
  orderId?: string;
  onSave: (m: Maintenance) => void;
  onCancel: () => void;
}) {
  const { data, user, saveMaintenance } = useStore();
  const order = data.orders.find((o) => o.id === orderId);
  const [value, setValue] = useState<Maintenance>({
    id: uid(),
    workshopId: user!.workshopId,
    vehicleId: order?.vehicleId ?? "",
    orderId: order?.id ?? "",
    mechanicId: user!.id,
    type: "Cambio de aceite",
    mileage: order?.mileage ?? 0,
    oilType: "Sintético",
    viscosity: "",
    brand: "",
    quantity: 4.5,
    filter: "",
    filterBrand: "",
    date: today(),
    nextMileage: 0,
    nextDate: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (patch: Partial<Maintenance>) =>
    setValue((m) => ({ ...m, ...patch }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = data.vehicles.find((v) => v.id === value.vehicleId);
    if (!v || value.mileage < v.mileage) {
      setError(
        "El kilometraje no puede ser menor al último registrado del vehículo.",
      );
      return;
    }
    if (
      value.nextMileage <= value.mileage ||
      !value.nextDate ||
      value.nextDate <= value.date
    ) {
      setError(
        "La próxima mantención debe ser posterior en fecha y kilometraje.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveMaintenance(value);
      onSave(saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {value.type === "Cambio de aceite" && (
        <div className="oil-form-banner">
          <strong>Cambio de aceite · ficha de mantenimiento</strong>
          <p>
            Registra el kilometraje de hoy y el próximo cambio. El cliente verá
            estos datos destacados en su ficha digital.
          </p>
        </div>
      )}
      <div className="form-grid">
        <SelectField
          label="Vehículo"
          required
          value={value.vehicleId}
          disabled={!!order}
          onChange={(e) =>
            change({
              vehicleId: e.target.value,
              mileage:
                data.vehicles.find((v) => v.id === e.target.value)?.mileage ??
                0,
              orderId: "",
            })
          }
        >
          <option value="">Seleccionar vehículo</option>
          {data.vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plate} · {v.brand} {v.model}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Orden vinculada"
          value={value.orderId}
          disabled={!!order}
          onChange={(e) => change({ orderId: e.target.value })}
        >
          <option value="">Sin orden vinculada</option>
          {data.orders
            .filter((o) => o.vehicleId === value.vehicleId)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.number}
              </option>
            ))}
        </SelectField>
        <SelectField
          label="Tipo de mantención"
          value={value.type}
          onChange={(e) => change({ type: e.target.value })}
        >
          {maintenanceTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </SelectField>
        <Field
          label="Fecha"
          type="date"
          required
          value={value.date}
          onChange={(e) => change({ date: e.target.value })}
        />
        <Field
          label={
            value.type === "Cambio de aceite"
              ? "Kilometraje del cambio de aceite"
              : "Kilometraje actual"
          }
          type="number"
          min={0}
          required
          value={value.mileage}
          onChange={(e) => change({ mileage: Number(e.target.value) })}
        />
        {value.type === "Cambio de aceite" && (
          <OilChangeForm value={value} onChange={change} />
        )}
        <Field
          label="Próximo cambio (km)"
          type="number"
          min={value.mileage + 1}
          required
          value={value.nextMileage}
          onChange={(e) => change({ nextMileage: Number(e.target.value) })}
        />
        <Field
          label="Próximo cambio (fecha)"
          type="date"
          min={value.date}
          required
          value={value.nextDate}
          onChange={(e) => change({ nextDate: e.target.value })}
        />
        <TextField
          label="Observaciones"
          value={value.notes}
          onChange={(e) => change({ notes: e.target.value })}
        />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancelar
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar mantención"}
        </button>
      </div>
    </form>
  );
}
