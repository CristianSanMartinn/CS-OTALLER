import { Appointment } from "@/features/shared/types/domain";
import { EmptyState } from "@/components/ui/primitives";
import { AppointmentCard } from "./AppointmentCard";
export function AppointmentList({
  appointments,
  onEdit,
}: {
  appointments: Appointment[];
  onEdit?: (a: Appointment) => void;
}) {
  return (
    <div className="appointment-list">
      {appointments.length ? (
        [...appointments]
          .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
          .map((a) => (
            <AppointmentCard key={a.id} appointment={a} onEdit={onEdit} />
          ))
      ) : (
        <EmptyState title="Sin citas para esta selección" />
      )}
    </div>
  );
}
