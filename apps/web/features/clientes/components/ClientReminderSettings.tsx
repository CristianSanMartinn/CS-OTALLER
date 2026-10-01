"use client";
import { useState, FormEvent } from "react";
import { Customer } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Panel, Field } from "@/components/ui/primitives";
import { ReminderPreferenceFields } from "./ReminderPreferenceFields";
import { ReminderMessagePreview } from "./ReminderMessagePreview";
import {
  defaultReminderPreferences,
  validateReminderPreferences,
  withConsentTimestamp,
} from "../services/reminderPreferences";
export function ClientReminderSettings({ client }: { client: Customer }) {
  const { update, notify } = useStore();
  const [preferences, setPreferences] = useState(
    client.reminderPreferences ?? defaultReminderPreferences,
  );
  const [email, setEmail] = useState(client.email);
  const [phone, setPhone] = useState(client.phone);
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const err = validateReminderPreferences(preferences, { email, phone });
    if (err) {
      setError(err);
      return;
    }
    const next = withConsentTimestamp(preferences, client.reminderPreferences);
    update((d) => ({
      ...d,
      customers: d.customers.map((c) =>
        c.id === client.id && c.workshopId === client.workshopId
          ? {
              ...c,
              email: email.trim(),
              phone: phone.trim(),
              reminderPreferences: next,
            }
          : c,
      ),
    }));
    setError("");
    notify("Preferencias guardadas en esta sesión; envíos simulados");
  }
  return (
    <>
      <Panel
        title="Correo y WhatsApp"
        subtitle="Preferencias de contacto del cliente · solo visibles en administración"
      >
        <form onSubmit={submit}>
          <div className="form-grid">
            <Field
              label="Correo para recordatorios"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="WhatsApp con código de país"
              type="tel"
              placeholder="+56 9 1234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <ReminderPreferenceFields
            value={preferences}
            onChange={setPreferences}
          />
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="button primary">Guardar preferencias</button>
          </div>
        </form>
      </Panel>
      <ReminderMessagePreview
        key={
          JSON.stringify(client.reminderPreferences) +
          client.email +
          client.phone
        }
        client={client}
      />
    </>
  );
}
