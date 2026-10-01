import { Droplets, CalendarClock, Gauge } from "lucide-react";
import { Maintenance } from "@/features/shared/types/domain";
import { dateLabel, km } from "@/utils/format";
export function OilChangeSummary({
  record,
  title = "Tu último cambio de aceite",
}: {
  record: Maintenance;
  title?: string;
}) {
  return (
    <section className="oil-summary">
      <div className="oil-summary-heading">
        <span className="oil-icon">
          <Droplets size={24} />
        </span>
        <div>
          <span className="eyebrow">CUIDADO DEL MOTOR</span>
          <h2>{title}</h2>
          <p>
            {dateLabel(record.date)} · {record.brand} {record.viscosity}
          </p>
        </div>
      </div>
      <div className="oil-metrics">
        <div>
          <Gauge size={18} />
          <span>Kilometraje del cambio</span>
          <strong>{km(record.mileage)}</strong>
        </div>
        <div>
          <Gauge size={18} />
          <span>Próximo cambio de aceite</span>
          <strong>{km(record.nextMileage)}</strong>
        </div>
        <div>
          <CalendarClock size={18} />
          <span>Próximo cambio por fecha</span>
          <strong>{dateLabel(record.nextDate)}</strong>
        </div>
      </div>
      <p className="oil-detail">
        {record.oilType} · {record.quantity} L · Filtro {record.filterBrand}{" "}
        {record.filter}
      </p>
      <small>
        Realiza el próximo cambio por fecha o kilometraje, lo que ocurra
        primero.
      </small>
    </section>
  );
}
