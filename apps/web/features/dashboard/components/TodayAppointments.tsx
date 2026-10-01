import Link from "next/link";
import { Panel, EmptyState } from "@/components/ui/primitives";
import { useStore } from "@/features/shared/components/StoreProvider";
import { today } from "@/utils/format";
export function TodayAppointments() {
  const { data } = useStore();
  const rows = data.appointments.filter(
    (a) => a.date === today() && a.status !== "Cancelada",
  );
  return (
    <Panel
      title="Agenda de hoy"
      subtitle="Recepciones programadas"
      action={
        <Link href="/agenda" className="text-link">
          Ver agenda →
        </Link>
      }
    >
      <div className="appointment-mini">
        {rows.length ? (
          rows.map((a) => (
            <div key={a.id}>
              <time>{a.time}</time>
              <span className="timeline-line" />
              <div>
                <strong>
                  {data.customers.find((c) => c.id === a.customerId)?.name}
                </strong>
                <p>{a.service}</p>
                <small>
                  {data.vehicles.find((v) => v.id === a.vehicleId)?.plate} ·{" "}
                  {a.status}
                </small>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="Jornada sin citas" />
        )}
      </div>
    </Panel>
  );
}
