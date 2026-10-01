"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Appointment } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Panel, PageHeading } from "@/components/ui/primitives";
import { Modal } from "@/components/Modal/Modal";
import { today, dateLabel } from "@/utils/format";
import { AppointmentCalendar } from "./AppointmentCalendar";
import { AppointmentList } from "./AppointmentList";
import { AppointmentFilters } from "./AppointmentFilters";
import { AppointmentForm } from "./AppointmentForm";
export function AgendaPage() {
  const { data, user, update, notify } = useStore();
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment>();
  const admin = user?.role === "ADMIN";
  return (
    <>
      <PageHeading
        title="Agenda"
        description={
          admin
            ? "Planifica las recepciones y organiza el trabajo del equipo."
            : "Consulta tus próximas citas y tareas asignadas."
        }
        action={
          admin && (
            <button
              className="button primary"
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus size={18} />
              Nueva cita
            </button>
          )
        }
      />
      <div className="agenda-layout">
        <Panel>
          <AppointmentCalendar
            date={date}
            onChange={setDate}
            appointments={data.appointments}
          />
          <div className="panel-padding">
            <button
              className="button full-width"
              onClick={() => setDate(today())}
            >
              Ir a hoy
            </button>
          </div>
        </Panel>
        <Panel
          title={"Citas · " + dateLabel(date)}
          action={<AppointmentFilters value={filter} onChange={setFilter} />}
        >
          <AppointmentList
            appointments={data.appointments.filter(
              (a) => a.date === date && (!filter || a.status === filter),
            )}
            onEdit={
              admin
                ? (a) => {
                    setEditing(a);
                    setOpen(true);
                  }
                : undefined
            }
          />
        </Panel>
      </div>
      {open && admin && (
        <Modal
          title={editing ? "Editar cita" : "Nueva cita"}
          onClose={() => setOpen(false)}
        >
          <AppointmentForm
            appointment={editing}
            date={date}
            onCancel={() => setOpen(false)}
            onSave={(a) => {
              update((d) => ({
                ...d,
                appointments: editing
                  ? d.appointments.map((x) => (x.id === a.id ? a : x))
                  : [a, ...d.appointments],
              }));
              notify("Cita guardada");
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
