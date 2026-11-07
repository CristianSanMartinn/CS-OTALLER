import {
  APPLICABLE_REGISTRATION_FIELDS,
  validateRegistrationApplication,
  registrationSnapshotMatches,
  registrationOverwrites,
  type RegistrationApplication,
  type RegistrationFormSnapshot,
  type RegistrationApplyResult,
} from "../../services/registrationReview";
import { usePlateRegistrationCheck } from "../../hooks/usePlateRegistrationCheck";
import { PlateRegistrationCheck } from "./PlateRegistrationCheck";
import { PrivateRegistrationCapture } from "./PrivateRegistrationCapture";
import styles from "./VehicleForm.module.css";
import { FormEvent, useRef, useState } from "react";
import { Vehicle } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/store/StoreProvider";
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
  const [plateInput, setPlateInput] = useState(vehicle?.plate ?? "");
  const [captureOwner, setCaptureOwner] = useState(
    ownerId ?? vehicle?.customerId ?? "",
  );
  const canCheck = !vehicle && user?.role === "ADMIN";
  const plateCheck = usePlateRegistrationCheck(
    plateInput,
    JSON.stringify([user?.id, user?.workshopId, user?.role]),
    canCheck,
  );
  const quick = Boolean(ownerId) && !vehicle;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const contextKey = JSON.stringify([
    user?.id,
    user?.workshopId,
    user?.role,
    ownerId ?? captureOwner,
  ]);
  const latestContext = useRef({ key: contextKey, enabled: canCheck && !busy });
  latestContext.current = { key: contextKey, enabled: canCheck && !busy };
  function readRegistrationForm(): RegistrationFormSnapshot | null {
    const form = formRef.current;
    if (!form) return null;
    const snapshot = {} as RegistrationFormSnapshot;
    for (const key of APPLICABLE_REGISTRATION_FIELDS) {
      const input = form.elements.namedItem(key) as HTMLInputElement | null;
      if (!input || typeof input.value !== "string") return null;
      snapshot[key] = input.value;
    }
    return snapshot;
  }
  function applyRegistrationFields(
    values: RegistrationApplication,
    expected: RegistrationFormSnapshot,
    overwrite: boolean,
  ): RegistrationApplyResult {
    if (
      latestContext.current.key !== contextKey ||
      !latestContext.current.enabled ||
      !validateRegistrationApplication(values)
    )
      return "INVALID";
    const current = readRegistrationForm();
    if (!current || !registrationSnapshotMatches(values, expected, current))
      return "STALE";
    if (!overwrite && registrationOverwrites(values, current).length)
      return "OVERWRITE_REQUIRED";
    // Only this allowlist can change. Saving stays exclusively in submit below.
    for (const key of APPLICABLE_REGISTRATION_FIELDS) {
      if (!Object.hasOwn(values, key)) continue;
      const value = values[key];
      if (value === undefined) continue;
      const input = formRef.current!.elements.namedItem(
        key,
      ) as HTMLInputElement;
      input.value = value;
      if (key === "plate") setPlateInput(value);
    }
    setError("");
    return "APPLIED";
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || plateCheck.busy || plateCheck.blocked) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const plate = get("plate").toUpperCase();
    if (!plate.replace(/[^A-Z0-9]/g, "") || !get("brand") || !get("model")) {
      setError("Completa patente, marca y modelo.");
      return;
    }
    const rawYear = get("year");
    const rawMileage = get("mileage");
    if (!rawYear || !rawMileage) {
      setError("Completa el año y el kilometraje real del vehículo.");
      return;
    }
    const year = Number(rawYear);
    const mileage = Number(rawMileage);
    if (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > new Date().getFullYear() + 1
    ) {
      setError("Ingresa un año válido.");
      return;
    }
    if (!Number.isInteger(mileage) || mileage < 0 || mileage > 2147483647) {
      setError("Ingresa un kilometraje válido.");
      return;
    }
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
          year,
          vin: get("vin"),
          engine: get("engine"),
          fuel: get("fuel"),
          transmission: get("transmission"),
          mileage,
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
  const fuels = ["Gasolina", "Diésel", "Híbrido", "Eléctrico"];
  const transmissions = ["Manual", "Automática"];
  const technicalFields = (
    <>
      <Field
        label="Versión"
        name="version"
        maxLength={100}
        defaultValue={vehicle?.version}
      />
      <Field
        label="VIN"
        name="vin"
        maxLength={50}
        defaultValue={vehicle?.vin}
      />
      <Field
        label="Motor"
        name="engine"
        maxLength={100}
        defaultValue={vehicle?.engine}
      />
      <SelectField
        label="Combustible"
        name="fuel"
        defaultValue={vehicle?.fuel ?? ""}
      >
        <option value="">Sin seleccionar</option>
        {vehicle?.fuel && !fuels.includes(vehicle.fuel) && (
          <option value={vehicle.fuel}>{vehicle.fuel}</option>
        )}
        {fuels.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Transmisión"
        name="transmission"
        defaultValue={vehicle?.transmission ?? ""}
      >
        <option value="">Sin seleccionar</option>
        {vehicle?.transmission &&
          !transmissions.includes(vehicle.transmission) && (
            <option value={vehicle.transmission}>{vehicle.transmission}</option>
          )}
        {transmissions.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </SelectField>
      <Field
        label="Color"
        name="color"
        maxLength={50}
        defaultValue={vehicle?.color}
      />
    </>
  );
  return (
    <form ref={formRef} onSubmit={submit}>
      {canCheck && (
        <PrivateRegistrationCapture
          readForm={readRegistrationForm}
          applyFields={applyRegistrationFields}
          key={JSON.stringify([
            user?.id,
            user?.workshopId,
            user?.role,
            ownerId ?? captureOwner,
          ])}
        />
      )}
      <div className="form-grid">
        <SelectField
          label="Propietario"
          name="customerId"
          required
          defaultValue={ownerId ?? vehicle?.customerId ?? ""}
          disabled={!!ownerId}
          onChange={(event) => setCaptureOwner(event.target.value)}
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
        <Field
          label="Patente"
          name="plate"
          required
          maxLength={20}
          value={plateInput}
          onChange={(event) => setPlateInput(event.target.value)}
        />
        {canCheck && (
          <div className="field full">
            <PlateRegistrationCheck
              {...plateCheck}
              onCheck={plateCheck.check}
            />
          </div>
        )}
        <Field
          label="Marca"
          name="brand"
          required
          maxLength={100}
          defaultValue={vehicle?.brand}
        />
        <Field
          label="Modelo"
          name="model"
          required
          maxLength={100}
          defaultValue={vehicle?.model}
        />
        <Field
          label="Año"
          name="year"
          type="number"
          required
          min={1900}
          max={new Date().getFullYear() + 1}
          step={1}
          defaultValue={vehicle?.year}
        />
        <Field
          label="Kilometraje"
          name="mileage"
          type="number"
          required
          min={0}
          max={2147483647}
          step={1}
          defaultValue={vehicle?.mileage}
        />
        {!quick && technicalFields}
      </div>
      {quick && (
        <details className={styles.technicalDetails}>
          <summary>Completar datos técnicos</summary>
          <p className="section-hint">
            Puedes completarlos ahora o después desde la ficha del vehículo.
          </p>
          <div className="form-grid">{technicalFields}</div>
        </details>
      )}
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
        <button
          className="button primary"
          disabled={busy || plateCheck.busy || plateCheck.blocked}
        >
          {busy ? "Guardando…" : "Guardar vehículo"}
        </button>
      </div>
    </form>
  );
}
