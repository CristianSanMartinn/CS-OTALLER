import { OilChangeSummary } from "./OilChangeSummary";
import { Maintenance } from "@/features/shared/types/domain";
import { EmptyState } from "@/components/ui/primitives";
import { dateLabel, km } from "@/utils/format";
import {
  interventionLabel,
  isEngineOil,
} from "@/features/shared/services/interventions";
export function MaintenanceHistory({ records }: { records: Maintenance[] }) {
  return records.length ? (
    <div className="record-list">
      {records.map((m) => (
        <div key={m.id}>
          {isEngineOil(m.type, m.maintenanceTypeCode) && (
            <OilChangeSummary record={m} title="Cambio de aceite registrado" />
          )}
          <div className="record-title">
            <strong>{m.type}</strong>
            <small>{dateLabel(m.date)}</small>
          </div>
          <small>{interventionLabel(m)}</small>
          {!!m.workDetails?.length && (
            <ul>
              {m.workDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
          <p>
            {km(m.mileage)}
            {isEngineOil(m.type, m.maintenanceTypeCode) &&
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
          {isEngineOil(m.type, m.maintenanceTypeCode) && (
            <small>
              Filtro: {m.filter} · {m.filterBrand}
            </small>
          )}
          <small>
            Próximo servicio:{" "}
            {[
              m.nextMileage ? km(m.nextMileage) : "",
              m.nextDate ? dateLabel(m.nextDate) : "",
            ]
              .filter(Boolean)
              .join(" o ") || "Sin programación"}
          </small>
          {m.notes && <p>{m.notes}</p>}
        </div>
      ))}
    </div>
  ) : (
    <EmptyState title="Sin mantenciones registradas" />
  );
}
