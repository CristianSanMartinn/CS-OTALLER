"use client";
import { useState } from "react";
import { CancelVisitDialog } from "@/components/Modal/CancelVisitDialog";
import { CancellationDetails } from "@/components/ui/CancellationDetails";
import { Appointment } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { CalendarDays } from "lucide-react";
export function AppointmentCard({
  appointment: a,
  onEdit,
}: {
  appointment: Appointment;
  onEdit?: (a: Appointment) => void;
}) {
  const { data, user } = useStore();
  const [cancelOpen, setCancelOpen] = useState(false);
  return (
    <div className="appointment-card">
      <div className="appointment-time">
        <CalendarDays size={18} />
        <strong>{a.time}</strong>
        <small>{a.date}</small>
      </div>
      <div className="appointment-card-main">
        <strong>
          {data.customers.find((c) => c.id === a.customerId)?.name}
        </strong>
        <p>{a.service}</p>
        <small>
          {data.vehicles.find((v) => v.id === a.vehicleId)?.plate} ·{" "}
          {data.users.find((u) => u.id === a.mechanicId)?.name ??
            "Mecánico asignado"}
        </small>
        {a.notes && <p>{a.notes}</p>}
        {a.status === "Cancelada" && (
          <CancellationDetails cancellation={a.cancellation} />
        )}
      </div>
      <span
        className={
          "badge " +
          (a.status === "Cancelada"
            ? "cancelled"
            : a.status === "Finalizada"
              ? "ready"
              : "received")
        }
      >
        {a.status}
      </span>
      {user?.role === "ADMIN" &&
        !["Cancelada", "Finalizada"].includes(a.status) && (
          <button
            type="button"
            className="text-button"
            onClick={() => setCancelOpen(true)}
          >
            Cancelar visita
          </button>
        )}
      {cancelOpen && (
        <CancelVisitDialog
          targets={[
            {
              kind: "appointment",
              id: a.id,
              label: "Cita " + a.date + " " + a.time + " · " + a.service,
            },
          ]}
          onClose={() => setCancelOpen(false)}
        />
      )}
      {onEdit && (
        <button className="text-button" onClick={() => onEdit(a)}>
          Editar
        </button>
      )}
    </div>
  );
}
