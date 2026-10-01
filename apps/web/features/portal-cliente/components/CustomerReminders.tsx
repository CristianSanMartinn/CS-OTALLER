"use client";
import { useState } from "react";
import { Bell, CalendarClock } from "lucide-react";
import { Maintenance } from "@/features/shared/types/domain";
import { Field } from "@/components/ui/primitives";
import {
  latestMaintenance,
  maintenanceReminder,
} from "@/features/mantenciones/services/reminderService";
import { today, dateLabel, km } from "@/utils/format";
export function CustomerReminders({
  records,
  mileage,
}: {
  records: Maintenance[];
  mileage: number;
}) {
  const [date, setDate] = useState(today);
  const [simulation, setSimulation] = useState(false);
  const reminders = latestMaintenance(records);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>
            <Bell size={17} /> Recordatorios de mantención
          </h2>
          <p>Avisos dentro de esta demostración</p>
        </div>
        <button
          type="button"
          className="text-button"
          onClick={() => setSimulation(!simulation)}
        >
          {simulation ? "Cerrar simulación" : "Simular paso del tiempo"}
        </button>
      </div>
      {simulation && (
        <div className="panel-padding">
          <Field
            label="Fecha de simulación"
            type="date"
            required
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
          <button className="text-button" onClick={() => setDate(today())}>
            Volver a hoy
          </button>
        </div>
      )}
      <div className="reminders-list" aria-live="polite">
        {reminders.length ? (
          reminders.map((m) => {
            const reminder = maintenanceReminder(m, mileage, date);
            return (
              <article key={m.id} className={"reminder " + reminder.status}>
                <CalendarClock size={22} />
                <div>
                  <strong>
                    {reminder.label} · {m.type}
                  </strong>
                  <p>
                    {dateLabel(m.nextDate)} o {km(m.nextMileage)}
                  </p>
                  <small>
                    {reminder.days !== null
                      ? reminder.days < 0
                        ? "La fecha recomendada ya pasó."
                        : reminder.days === 0
                          ? "La fecha recomendada es hoy."
                          : "Faltan " +
                            reminder.days +
                            " días para la fecha recomendada."
                      : "Sin fecha registrada"}{" "}
                    {reminder.remaining !== null && reminder.remaining <= 0
                      ? "El último kilometraje registrado alcanzó el próximo cambio."
                      : ""}
                  </small>
                </div>
              </article>
            );
          })
        ) : (
          <p className="section-hint">
            Cuando el taller registre una mantención, verás aquí tu próximo
            cuidado.
          </p>
        )}
      </div>
      <p className="section-hint">
        Demo: estos avisos se calculan al abrir esta pantalla. No se envían
        mensajes ni notificaciones al teléfono. El kilometraje corresponde al
        último registro del taller.
      </p>
    </section>
  );
}
