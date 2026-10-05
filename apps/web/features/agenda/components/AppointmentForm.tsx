import { FormEvent, useState } from "react";
import { Appointment } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Field, SelectField, TextField } from "@/components/ui/primitives";
import { today, uid } from "@/utils/format";
export function AppointmentForm({
  appointment,
  date,
  onSave,
  onCancel,
}: {
  appointment?: Appointment;
  date?: string;
  onSave: (a: Appointment) => void;
  onCancel: () => void;
}) {
  const { data, user, saveAppointment } = useStore();
  const [customer, setCustomer] = useState(appointment?.customerId ?? "");
  const [vehicle, setVehicle] = useState(appointment?.vehicleId ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    const mechanicId = get("mechanicId");
    if (
      data.appointments.some(
        (a) =>
          a.id !== appointment?.id &&
          a.date === get("date") &&
          a.time === get("time") &&
          a.mechanicId === mechanicId &&
          !["Cancelada", "Finalizada"].includes(a.status),
      )
    ) {
      setError(
        "El mecánico ya tiene una cita a esta hora. Selecciona otro horario.",
      );
      return;
    }
    const value: Appointment = {
      id: appointment?.id ?? uid(),
      workshopId: user!.workshopId,
      customerId: customer,
      vehicleId: vehicle,
      mechanicId,
      service: get("service"),
      date: get("date"),
      time: get("time"),
      notes: get("notes"),
      status: get("status") as Appointment["status"],
    };
    setBusy(true);
    setError("");
    try {
      const saved = await saveAppointment(value, Boolean(appointment));
      onSave(saved);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <SelectField
          label="Cliente"
          required
          value={customer}
          onChange={(e) => {
            setCustomer(e.target.value);
            setVehicle("");
          }}
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
        <SelectField
          label="Vehículo / patente"
          required
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value)}
        >
          <option value="">Seleccionar vehículo</option>
          {data.vehicles
            .filter((v) => v.customerId === customer)
            .map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} · {v.brand}
              </option>
            ))}
        </SelectField>
        <Field
          label="Servicio solicitado"
          name="service"
          required
          defaultValue={appointment?.service}
        />
        <SelectField
          label="Mecánico"
          name="mechanicId"
          required
          defaultValue={appointment?.mechanicId ?? ""}
        >
          <option value="">Seleccionar mecánico</option>
          {data.users
            .filter((u) => u.active)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </SelectField>
        <Field
          label="Fecha"
          name="date"
          type="date"
          required
          defaultValue={appointment?.date ?? date ?? today()}
        />
        <Field
          label="Hora"
          name="time"
          type="time"
          required
          defaultValue={appointment?.time ?? "09:00"}
        />
        <SelectField
          label="Estado"
          name="status"
          defaultValue={appointment?.status ?? "Programada"}
        >
          {[
            "Programada",
            "Confirmada",
            "En taller",
            "Finalizada",
            "Cancelada",
          ].map((s) => (
            <option
              key={s}
              disabled={
                s === "Cancelada" && appointment?.status !== "Cancelada"
              }
            >
              {s}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Observaciones"
          name="notes"
          defaultValue={appointment?.notes}
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
          {busy ? "Guardando…" : "Guardar cita"}
        </button>
      </div>
    </form>
  );
}
