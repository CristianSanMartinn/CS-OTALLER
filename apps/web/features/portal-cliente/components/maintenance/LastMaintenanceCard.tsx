import {
  CalendarCheck,
  ChevronRight,
  Droplets,
  Filter,
  Gauge,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import { dateLabel, km } from "@/utils/format";
import type { PortalMaintenance } from "../../types/maintenance.types";
import type { PortalPhoto } from "../../types/portal.types";
import { PortalSection } from "../layout/PortalSection";
export function LastMaintenanceCard({
  record,
  others,
  photo,
  onOpen,
  onHistory,
}: {
  record?: PortalMaintenance;
  others: PortalMaintenance[];
  photo?: PortalPhoto;
  onOpen: (id: string) => void;
  onHistory: () => void;
}) {
  return (
    <PortalSection
      title="Última mantención"
      action={
        record ? (
          <span className="portal-muted">{dateLabel(record.date)}</span>
        ) : undefined
      }
    >
      {record ? (
        <button
          className="last-maintenance-button"
          onClick={() => onOpen(record.id)}
        >
          <span className="last-maintenance-visual">
            {photo ? (
              <Image
                src={photo.url}
                alt={photo.description || record.type}
                width={180}
                height={180}
                unoptimized
              />
            ) : (
              <Droplets size={65} strokeWidth={1.5} />
            )}
          </span>
          <span className="last-maintenance-info">
            <strong>{record.type}</strong>
            <span>
              <Gauge size={17} />
              {km(record.mileage)}
            </span>
            {record.brand && (
              <span>
                <Droplets size={17} />
                {record.brand} {record.viscosity}
              </span>
            )}
            {record.filter && (
              <span>
                <Filter size={17} />
                Filtro {record.filterBrand || record.filter}
              </span>
            )}
          </span>
          <ChevronRight size={23} />
        </button>
      ) : (
        <p className="portal-muted">
          Todavía no hay mantenciones registradas para este vehículo.
        </p>
      )}
      {others.length > 0 && (
        <>
          <div className="other-services-heading">
            <h3>Otros servicios registrados</h3>
            <button onClick={onHistory} className="portal-text-button">
              Ver todos
            </button>
          </div>
          <div className="other-services-grid">
            {others.slice(0, 3).map((m) => (
              <button key={m.id} onClick={() => onOpen(m.id)}>
                <Wrench size={25} />
                <strong>{m.type}</strong>
                <small>
                  <CalendarCheck size={13} />
                  {dateLabel(m.date)}
                </small>
              </button>
            ))}
          </div>
        </>
      )}
    </PortalSection>
  );
}
