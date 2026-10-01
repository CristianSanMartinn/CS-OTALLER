"use client";
import { useState } from "react";
import { Customer } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Panel, SelectField, EmptyState } from "@/components/ui/primitives";
import { latestMaintenance } from "@/features/mantenciones/services/reminderService";
import {
  buildReminderPreview,
  ReminderChannel,
} from "../services/reminderPreviewService";
import { dateLabel } from "@/utils/format";
export function ReminderMessagePreview({ client }: { client: Customer }) {
  const { data, notify } = useStore();
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
  const [channel, setChannel] = useState<ReminderChannel>("email");
  const [simulation, setSimulation] = useState("");
  const record = records.find((m) => m.id === selected) ?? records[0];
  const vehicle = vehicles.find((v) => v.id === record?.vehicleId);
  const origin =
    typeof window === "undefined"
      ? "http://localhost:3000"
      : window.location.origin;
  const preview =
    record && vehicle
      ? buildReminderPreview(client, vehicle, record, channel, origin)
      : null;
  return (
    <Panel
      title="Vista previa del recordatorio"
      subtitle="Simulación local · no se envían correos ni mensajes de WhatsApp"
    >
      {preview ? (
        <>
          <div className="form-grid">
            <SelectField
              label="Vehículo y mantención"
              value={record!.id}
              onChange={(e) => {
                setSelected(e.target.value);
                setSimulation("");
              }}
            >
              {records.map((m) => (
                <option value={m.id} key={m.id}>
                  {vehicles.find((v) => v.id === m.vehicleId)?.plate} · {m.type}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Canal de vista previa"
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value as ReminderChannel);
                setSimulation("");
              }}
            >
              <option value="email">Correo electrónico</option>
              <option value="whatsapp">WhatsApp</option>
            </SelectField>
          </div>
          <div className="message-preview">
            <span className="demo-label">
              BORRADOR · {channel === "email" ? "CORREO" : "WHATSAPP"}
            </span>
            <p>
              <strong>Para:</strong>{" "}
              {preview.destination || "Sin contacto registrado"}
            </p>
            {channel === "email" && (
              <p>
                <strong>Asunto:</strong> {preview.subject}
              </p>
            )}
            <p>
              <strong>Fecha estimada del aviso:</strong>{" "}
              {dateLabel(preview.scheduledDate)}
            </p>
            <blockquote>{preview.text}</blockquote>
            {!preview.eligible && (
              <p className="error" role="status">
                {preview.blockReason}
              </p>
            )}
            <button
              className="button primary"
              disabled={!preview.eligible}
              onClick={() => {
                setSimulation(
                  "Simulación completada. El mensaje no se envió a " +
                    preview.destination +
                    ".",
                );
                notify("Recordatorio simulado; ningún mensaje fue enviado");
              }}
            >
              Simular envío · no envía
            </button>
            {simulation && (
              <p role="status" className="simulation-result">
                {simulation}
              </p>
            )}
            <p className="help-text">
              El aviso se preparará por fecha. Para avisos por kilometraje se
              necesita un registro actualizado. Guardar preferencias no programa
              un envío real.
            </p>
          </div>
        </>
      ) : (
        <EmptyState
          title="Sin mantenciones para previsualizar"
          description="Registra la próxima fecha y kilometraje en uno de los vehículos del cliente."
        />
      )}
    </Panel>
  );
}
