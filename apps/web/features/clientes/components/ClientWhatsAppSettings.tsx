"use client";
import { FormEvent, useState } from "react";
import { apiRequest } from "@/lib/http";
import { latestMaintenance } from "@/features/mantenciones/services/reminderService";
import { dateLabel, km } from "@/utils/format";
import { Customer } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Panel, SelectField } from "@/components/ui/primitives";
export function ClientWhatsAppSettings({ client }: { client: Customer }) {
  const { data, saveCustomer, notify } = useStore();
  const vehicles = data.vehicles.filter(
    (v) => v.customerId === client.id && v.workshopId === client.workshopId,
  );
  const records = latestMaintenance(
    data.maintenance.filter(
      (m) =>
        m.workshopId === client.workshopId &&
        vehicles.some((v) => v.id === m.vehicleId),
    ),
  );
  const [selected, setSelected] = useState(records[0]?.id ?? "");
  const record = records.find((m) => m.id === selected) ?? records[0];
  const [draft, setDraft] = useState<{ text: string; url: string } | null>(
    null,
  );
  const [enabled, setEnabled] = useState(
    client.reminderPreferences?.whatsappEnabled ?? false,
  );
  const [consent, setConsent] = useState(
    client.reminderPreferences?.consent ?? false,
  );
  const [days, setDays] = useState<7 | 15 | 30>(
    client.reminderPreferences?.daysBefore ?? 7,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function prepare() {
    if (!record) return;
    setBusy(true);
    setError("");
    setDraft(null);
    try {
      if (
        !client.reminderPreferences?.consent ||
        !client.reminderPreferences.whatsappEnabled
      )
        throw new Error(
          "Guarda primero la autorización y la preferencia de WhatsApp.",
        );
      const phone = client.phone.replace(/[\s()-]/g, "");
      if (!/^\+[1-9]\d{7,14}$/.test(phone))
        throw new Error("Registra el teléfono con código de país.");
      const { token } = await apiRequest<{ token: string }>(
        "customers/" + client.id + "/portal",
        "POST",
        {},
      );
      const vehicle = vehicles.find((v) => v.id === record.vehicleId)!;
      const text =
        "Hola " +
        client.name +
        ". " +
        data.workshop.name +
        " te recuerda la próxima mantención de tu " +
        vehicle.brand +
        " " +
        vehicle.model +
        " (" +
        vehicle.plate +
        "): " +
        record.type +
        ". Próxima fecha: " +
        dateLabel(record.nextDate) +
        "; kilometraje: " +
        km(record.nextMileage) +
        ". Revisa tu historial: " +
        window.location.origin +
        "/mi-taller/" +
        token +
        ". Puedes contactarnos para coordinar una hora.";
      setDraft({
        text,
        url:
          "https://wa.me/" +
          phone.slice(1) +
          "?text=" +
          encodeURIComponent(text),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveCustomer(
        {
          ...client,
          reminderPreferences: {
            emailEnabled: false,
            whatsappEnabled: enabled,
            consent,
            daysBefore: days,
          },
        },
        true,
      );
      notify(
        "Preferencias de WhatsApp guardadas. El envío automático está pendiente de conectar.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel
      title="Recordatorios por WhatsApp"
      subtitle="Próxima mantención por fecha · preferencias del cliente"
    >
      <form onSubmit={submit}>
        <p>
          Teléfono registrado: <strong>{client.phone || "Sin teléfono"}</strong>
          . Usa el código de país, por ejemplo +56912345678.
        </p>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />{" "}
          Solicita recordatorios por WhatsApp
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />{" "}
          El cliente autorizó recibir recordatorios de mantención
        </label>
        <SelectField
          label="Anticipación del aviso"
          value={days}
          onChange={(e) => setDays(Number(e.target.value) as 7 | 15 | 30)}
        >
          <option value="7">7 días antes</option>
          <option value="15">15 días antes</option>
          <option value="30">30 días antes</option>
        </SelectField>
        <p className="info-box">
          Envío automático pendiente de conectar WhatsApp Business Platform.
          Guardar estas preferencias todavía no envía mensajes.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button className="button primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar preferencias"}
          </button>
        </div>
      </form>
      {records.length > 0 && (
        <>
          <SelectField
            label="Mantención para el recordatorio"
            value={record?.id ?? ""}
            onChange={(e) => {
              setSelected(e.target.value);
              setDraft(null);
            }}
          >
            {records.map((m) => (
              <option key={m.id} value={m.id}>
                {vehicles.find((v) => v.id === m.vehicleId)?.plate} · {m.type} ·{" "}
                {dateLabel(m.nextDate)}
              </option>
            ))}
          </SelectField>
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={prepare}
          >
            Preparar mensaje de WhatsApp
          </button>
          {draft && (
            <div className="message-preview">
              <blockquote>{draft.text}</blockquote>
              <a
                className="button primary"
                href={draft.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir borrador en WhatsApp
              </a>
              <p className="help-text">
                Revisa el mensaje y pulsa Enviar en WhatsApp. Este botón no lo
                envía automáticamente.
              </p>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
