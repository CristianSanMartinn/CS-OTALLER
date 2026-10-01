import { ChevronLeft, ChevronRight } from "lucide-react";
import { Appointment } from "@/features/shared/types/domain";
export function AppointmentCalendar({
  date,
  onChange,
  appointments,
}: {
  date: string;
  onChange: (v: string) => void;
  appointments: Appointment[];
}) {
  const d = new Date(date + "T12:00:00");
  const year = d.getFullYear();
  const month = d.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const key = (day: number) =>
    year +
    "-" +
    String(month + 1).padStart(2, "0") +
    "-" +
    String(day).padStart(2, "0");
  function move(delta: number) {
    const next = new Date(year, month + delta, 1);
    onChange(
      next.getFullYear() +
        "-" +
        String(next.getMonth() + 1).padStart(2, "0") +
        "-01",
    );
  }
  return (
    <div className="calendar">
      <div className="calendar-heading">
        <button
          className="icon-button"
          aria-label="Mes anterior"
          onClick={() => move(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <strong>
          {d.toLocaleDateString("es-CL", { month: "long", year: "numeric" })}
        </strong>
        <button
          className="icon-button"
          aria-label="Mes siguiente"
          onClick={() => move(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="calendar-grid">
        {["L", "M", "M", "J", "V", "S", "D"].map((x, i) => (
          <small key={i}>{x}</small>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={"empty" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => i + 1).map((day) => (
          <button
            key={day}
            aria-label={key(day)}
            aria-pressed={date === key(day)}
            onClick={() => onChange(key(day))}
            className={date === key(day) ? "selected" : ""}
          >
            {day}
            {appointments.some(
              (a) => a.date === key(day) && a.status !== "Cancelada",
            ) && <i />}
          </button>
        ))}
      </div>
    </div>
  );
}
