import styles from "./ClientForm.module.css";
import { ImageUploader } from "@/components/ImageUploader/ImageUploader";
import { Panel } from "@/components/ui/primitives";
import { Photo } from "@/features/shared/types/domain";
import { FormEvent, useState } from "react";
import { ReminderPreferenceFields } from "../reminders/ReminderPreferenceFields";
import {
  defaultReminderPreferences,
  validateReminderPreferences,
  withConsentTimestamp,
} from "../../services/reminderPreferences";
import { Customer } from "@/features/shared/types/domain";
import { Field, TextField } from "@/components/ui/primitives";
import { useStore } from "@/features/shared/components/store/StoreProvider";
import { today, uid } from "@/utils/format";
export function ClientForm({
  client,
  onSave,
  onCancel,
  mode = "full",
}: {
  client?: Customer;
  mode?: "full" | "reception";
  onSave: (c: Customer) => void;
  onCancel: () => void;
}) {
  const { data, user, live, saveCustomer } = useStore();
  const quick = mode === "reception" && !client;
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>(client?.photos ?? []);
  const [error, setError] = useState("");
  const [preferences, setPreferences] = useState(
    client?.reminderPreferences ?? defaultReminderPreferences,
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || preparing) return;
    const f = new FormData(e.currentTarget);
    const get = (key: string) => String(f.get(key) ?? "").trim();
    if (!get("name")) {
      setError("Ingresa el nombre completo del cliente.");
      return;
    }
    const rut = get("rut");
    const normalizedRut = rut.replace(/[.\s-]/g, "").toLowerCase();
    if (
      normalizedRut &&
      data.customers.some(
        (c) =>
          c.id !== client?.id &&
          c.rut.replace(/[.\s-]/g, "").toLowerCase() === normalizedRut,
      )
    ) {
      setError("Ya existe un cliente con este RUT.");
      return;
    }
    const preferenceError = validateReminderPreferences(preferences, {
      email: get("email"),
      phone: get("phone"),
    });
    if (preferenceError) {
      setError(preferenceError);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveCustomer(
        {
          publicAccessToken:
            client?.publicAccessToken ??
            (client ? "demo-client-" + client.id : "demo-" + uid()),
          reminderPreferences: withConsentTimestamp(
            preferences,
            client?.reminderPreferences,
          ),
          photos,
          id: client?.id ?? uid(),
          workshopId: user!.workshopId,
          name: get("name"),
          rut,
          phone: get("phone"),
          email: get("email"),
          address: get("address"),
          notes: get("notes"),
          createdAt: client?.createdAt ?? today(),
        },
        !!client,
      );
      onSave(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const additionalFields = (
    <>
      <Field
        label="Correo electrónico"
        name="email"
        type="email"
        defaultValue={client?.email}
      />
      <Field label="Dirección" name="address" defaultValue={client?.address} />
      <TextField
        label="Observaciones"
        name="notes"
        defaultValue={client?.notes}
      />
    </>
  );
  const photographs = (
    <Panel
      title="Fotografías del cliente y su vehículo"
      subtitle="Puedes tomar fotos durante la recepción o agregar las que entregó el cliente."
    >
      <ImageUploader
        photos={photos}
        onChange={setPhotos}
        onBusyChange={setPreparing}
        userId={user!.id}
      />
    </Panel>
  );
  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <Field
          label="Nombre completo"
          name="name"
          required
          defaultValue={client?.name}
        />
        <Field
          label="RUT (opcional)"
          name="rut"
          placeholder="12.345.678-9"
          defaultValue={client?.rut}
        />
        <Field
          label={quick ? "Teléfono (opcional)" : "Teléfono"}
          name="phone"
          type="tel"
          required={!quick}
          defaultValue={client?.phone}
        />
        {!quick && additionalFields}
      </div>
      {!quick && !live && (
        <ReminderPreferenceFields
          value={preferences}
          onChange={setPreferences}
        />
      )}
      {quick && (
        <details className={styles.additionalDetails}>
          <summary>Completar más datos (opcional)</summary>
          <p className="section-hint">
            Puedes agregarlos ahora o después desde la ficha del cliente.
          </p>
          <div className="form-grid">{additionalFields}</div>
          {!live && (
            <ReminderPreferenceFields
              value={preferences}
              onChange={setPreferences}
            />
          )}
          {photographs}
        </details>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!quick && photographs}
      <div className="form-actions">
        <button
          type="button"
          className="button"
          onClick={onCancel}
          disabled={busy || preparing}
        >
          Cancelar
        </button>
        <button className="button primary" disabled={busy || preparing}>
          {busy ? "Guardando…" : "Guardar cliente"}
        </button>
      </div>
    </form>
  );
}
