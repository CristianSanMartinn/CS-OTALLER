import { OilChangeSummary } from "./OilChangeSummary";
import { Maintenance } from "@/features/shared/types/domain";
import { EmptyState } from "@/components/ui/primitives";
import { dateLabel, km } from "@/utils/format";
export function MaintenanceHistory({ records }: { records: Maintenance[] }) {
  return records.length ? (
    <div className="record-list">
      {records.map((m) => (
        <div key={m.id}>
          {m.type === "Cambio de aceite" && (
            <OilChangeSummary record={m} title="Cambio de aceite registrado" />
          )}
          <div className="record-title">
            <strong>{m.type}</strong>
            <small>{dateLabel(m.date)}</small>
          </div>
          <p>
            {km(m.mileage)}
            {m.type === "Cambio de aceite" &&
              " · " +
                m.oilType +
                " " +
                m.viscosity +
                " · " +
                m.brand +
                " · " +
                m.quantity +
                " L"}
          </p>
          {m.type === "Cambio de aceite" && (
            <small>
              Filtro: {m.filter} · {m.filterBrand}
            </small>
          )}
          <small>
            Próxima: {km(m.nextMileage)} o {dateLabel(m.nextDate)}
          </small>
          {m.notes && <p>{m.notes}</p>}
        </div>
      ))}
    </div>
  ) : (
    <EmptyState title="Sin mantenciones registradas" />
  );
}
