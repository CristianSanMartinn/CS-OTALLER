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
  const { data } = useStore();
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
      {onEdit && (
        <button className="text-button" onClick={() => onEdit(a)}>
          Editar
        </button>
      )}
    </div>
  );
}
