import portalStyles from "../../Portal.module.css";
import { isEngineOil } from "@/features/shared/services/interventions";
import {
  Droplets,
  Filter,
  CalendarClock,
  ClipboardList,
  ChevronRight,
  BellRing,
} from "lucide-react";
import type { PortalView } from "../../types/portal.types";
import type { PortalMaintenance } from "../../types/maintenance.types";
import { MaintenanceProgress } from "./MaintenanceProgress";
import { km, dateLabel } from "@/utils/format";
import styles from "./VehicleServiceOverview.module.css";
export function VehicleServiceOverview({
  view,
  records,
  next,
  tone,
  onOpen,
  onHistory,
}: {
  view: PortalView;
  records: PortalMaintenance[];
  next?: PortalMaintenance;
  tone: string;
  onOpen: (id: string) => void;
  onHistory: () => void;
}) {
  const oil = records.find((record) =>
    isEngineOil(record.type, record.maintenanceTypeCode),
  );
  const oilOrder = view.orders.find((order) => order.id === oil?.orderId);
  const filters = Array.from(
    new Set(
      [
        oil?.filter
          ? [oil.filterBrand, oil.filter].filter(Boolean).join(" ")
          : "",
        ...(oilOrder?.parts
          .filter((part) => /filtro/i.test(part.name))
          .map((part) => [part.name, part.brand].filter(Boolean).join(" ")) ??
          []),
      ].filter(Boolean),
    ),
  );
  const remaining = next?.nextMileage
    ? next.nextMileage - view.vehicle.mileage
    : null;
  const nextDistance =
    remaining === null
      ? "Kilometraje por definir"
      : remaining > 0
        ? "En " + km(remaining)
        : "Kilometraje alcanzado";
  const oilDescription = oil
    ? [oil.brand, oil.oilProductName, oil.viscosity, oil.oilType]
        .filter(Boolean)
        .join(" · ")
    : "";
  const cards = [
    {
      key: "oil",
      label: "ACEITE UTILIZADO",
      value: oilDescription || "Sin aceite registrado",
      detail: oil
        ? dateLabel(oil.date) +
          (oil.quantity ? " · " + oil.quantity + " litros" : "")
        : "Se mostrará después del primer cambio de aceite.",
      Icon: Droplets,
      action: oil ? () => onOpen(oil.id) : undefined,
    },
    {
      key: "filters",
      label: "FILTROS REGISTRADOS",
      value: filters.join(" · ") || "Sin filtros registrados",
      detail: "Productos del último cambio de aceite registrado.",
      Icon: Filter,
      action: oil ? () => onOpen(oil.id) : undefined,
    },
    {
      key: "next",
      label: "PRÓXIMO SERVICIO",
      value: next?.type || "Sin programación",
      detail: next
        ? nextDistance + (next.nextDate ? " · " + dateLabel(next.nextDate) : "")
        : "El taller indicará el próximo intervalo.",
      Icon: CalendarClock,
      action: next ? () => onOpen(next.id) : undefined,
    },
    {
      key: "history",
      label: "HISTORIAL DE MANTENCIONES",
      value:
        records.length +
        " " +
        (records.length === 1 ? "registro" : "registros"),
      detail: "Trabajos, productos y fotografías de cada visita.",
      Icon: ClipboardList,
      action: onHistory,
    },
  ];
  return (
    <section className={styles.serviceOverview} aria-label="Resumen de servicios">
      <div className={styles.serviceOverviewHeading}>
        <span className={portalStyles.serviceRecordLabel}>CUIDADO Y MANTENIMIENTO</span>
        <h2>Todo el historial, en un solo lugar</h2>
      </div>
      <div className={styles.serviceOverviewGrid}>
        {cards.map(({ key, label, value, detail, Icon, action }) => {
          const content = (
            <>
              <span className={`${styles.serviceCardIcon} ` + key}>
                <Icon size={30} />
              </span>
              <span className={styles.serviceCardCopy}>
                <small>{label}</small>
                <strong>{value}</strong>
                <span>{detail}</span>
              </span>
              {action && (
                <ChevronRight size={20} className={styles.serviceCardArrow} />
              )}
            </>
          );
          return action ? (
            <button
              type="button"
              key={key}
              className={styles.serviceSummaryCard}
              onClick={action}
            >
              {content}
            </button>
          ) : (
            <div key={key} className={styles.serviceSummaryCard}>
              {content}
            </div>
          );
        })}
      </div>
      <article className={`${styles.serviceNextNotice} ` + tone}>
        <div className={styles.serviceNoticeTitle}>
          <span>
            <BellRing size={23} />
          </span>
          <div>
            <small>PRÓXIMA VISITA AL TALLER</small>
            <h3>
              {tone === "overdue"
                ? "Tu vehículo tiene una mantención pendiente"
                : tone === "soon"
                  ? "Tu próxima mantención está cerca"
                  : next
                    ? "Tu próximo cuidado está programado"
                    : "Mantén tu historial actualizado"}
            </h3>
          </div>
        </div>
        {next ? (
          <>
            <p>
              <strong>
                {view.vehicle.brand} {view.vehicle.model} · {view.vehicle.plate}
              </strong>
              <br />
              {next.type}: {nextDistance.toLowerCase()}
              {next.nextDate ? " o el " + dateLabel(next.nextDate) : ""}, lo que
              ocurra primero.
            </p>
            <MaintenanceProgress
              current={view.vehicle.mileage}
              start={next.mileage}
              target={next.nextMileage}
            />
            <button
              type="button"
              className={styles.serviceDetailsButton}
              onClick={() => onOpen(next.id)}
            >
              Ver detalles del mantenimiento
              <ChevronRight size={18} />
            </button>
          </>
        ) : (
          <p>
            En tu próxima visita el taller puede registrar los trabajos y
            programar los siguientes cuidados de tu vehículo.
          </p>
        )}
        <small className={styles.serviceNoticeFootnote}>
          El cálculo utiliza el último kilometraje registrado. No estima cuánto
          conduces ni envía mensajes automáticos.
        </small>
      </article>
    </section>
  );
}
