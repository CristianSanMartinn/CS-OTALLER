import { FormEvent, useState } from "react";
import { Vehicle } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Field, SelectField } from "@/components/ui/primitives";
import { uid } from "@/utils/format";
export function VehicleForm({
  vehicle,
  ownerId,
  onSave,
  onCancel,
}: {
  vehicle?: Vehicle;
  ownerId?: string;
  onSave: (v: Vehicle) => void;
  onCancel: () => void;
}) {
  const { data, user, saveVehicle } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const plate = get("plate").toUpperCase();
    if (
      data.vehicles.some(
        (v) =>
          v.id !== vehicle?.id &&
          v.plate.replace(/[^A-Z0-9]/g, "") === plate.replace(/[^A-Z0-9]/g, ""),
      )
    ) {
      setError("Esta patente ya está registrada.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveVehicle(
        {
          id: vehicle?.id ?? uid(),
          workshopId: user!.workshopId,
          customerId: ownerId ?? get("customerId"),
          plate,
          brand: get("brand"),
          model: get("model"),
          version: get("version"),
          year: Number(get("year")),
          vin: get("vin"),
          engine: get("engine"),
          fuel: get("fuel"),
          transmission: get("transmission"),
          mileage: Number(get("mileage")),
          color: get("color"),
          photos: vehicle?.photos,
        },
        !!vehicle,
      );
      onSave(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <SelectField
          label="Propietario"
          name="customerId"
          required
          defaultValue={ownerId ?? vehicle?.customerId ?? ""}
          disabled={!!ownerId}
        >
          <option value="">Seleccionar cliente</option>
          {data.customers
            .filter((c) => c.active !== false)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </SelectField>
        {(
          [
            "plate",
            "brand",
            "model",
            "version",
            "year",
            "vin",
            "engine",
            "mileage",
            "color",
          ] as const
        ).map((key, i) => (
          <Field
            key={key}
            label={
              [
                "Patente",
                "Marca",
                "Modelo",
                "Versión",
                "Año",
                "VIN",
                "Motor",
                "Kilometraje",
                "Color",
              ][i]
            }
            name={key}
            required={["plate", "brand", "model", "year", "mileage"].includes(
              key,
            )}
            type={key === "year" || key === "mileage" ? "number" : "text"}
            min={key === "year" ? 1900 : 0}
            max={key === "year" ? new Date().getFullYear() + 1 : undefined}
            defaultValue={vehicle?.[key]}
          />
        ))}
        <SelectField
          label="Combustible"
          name="fuel"
          defaultValue={vehicle?.fuel}
        >
          {["Gasolina", "Diésel", "Híbrido", "Eléctrico"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </SelectField>
        <SelectField
          label="Transmisión"
          name="transmission"
          defaultValue={vehicle?.transmission}
        >
          <option>Manual</option>
          <option>Automática</option>
        </SelectField>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          type="button"
          className="button"
          onClick={onCancel}
          disabled={busy}
        >
          Cancelar
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? "Guardando…" : "Guardar vehículo"}
        </button>
      </div>
    </form>
  );
}
