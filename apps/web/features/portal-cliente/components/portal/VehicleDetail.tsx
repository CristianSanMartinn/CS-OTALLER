"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  CalendarDays,
  Images,
  Phone,
  ChevronRight,
} from "lucide-react";
import { useMaintenanceDetail } from "../../hooks/useMaintenanceDetail";
import { clientVehiclePath } from "../../services/clientAccessService";
import type { PortalView, PortalTab } from "../../types/portal.types";
import { PortalHeader } from "../layout/PortalHeader";
import { PortalSection } from "../layout/PortalSection";
import { VehicleSelector } from "../vehicles/VehicleSelector";
import { NextMaintenanceCard } from "../maintenance/NextMaintenanceCard";
import { LastMaintenanceCard } from "../maintenance/LastMaintenanceCard";
import { MaintenanceSummaryCard } from "../maintenance/MaintenanceSummaryCard";
import { CustomerWorkHistory } from "../history/CustomerWorkHistory";
import { ServicePhotos } from "../photos/ServicePhotos";
import { CustomerReminders } from "../reminders/CustomerReminders";
import { dateLabel, km } from "@/utils/format";
export function VehicleDetail({
  view,
  token,
  vehicles,
  live,
  legacy,
}: {
  view: PortalView;
  token: string;
  vehicles: PortalView["vehicle"][];
  live: boolean;
  legacy: boolean;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (switchTimer.current) clearTimeout(switchTimer.current);
    },
    [],
  );
  const switchVehicle = (id: string) => {
    if (switching || id === view.vehicle.id) return;
    setSwitching(true);
    switchTimer.current = setTimeout(
      () => router.push(clientVehiclePath(token, id)),
      150,
    );
  };
  const [tab, setTab] = useState<PortalTab>("summary");
  const [selected, setSelected] = useState<string | null>(null);
  const heading = useRef<HTMLDivElement>(null);
  const interacted = useRef(false);
  const { records, last, summary } = useMaintenanceDetail(view);
  const maintenance = records.find((m) => m.id === selected);
  const order = maintenance
    ? view.orders.find((o) => o.id === maintenance.orderId)
    : undefined;
  const nextRecord = records.find((m) => m.id === summary.next?.record.id);
  const home = legacy
    ? "/mi-vehiculo/" + encodeURIComponent(token)
    : "/mi-taller/" + encodeURIComponent(token);
  const open = (id: string) => {
    interacted.current = true;
    setSelected(id);
  };
  const showTab = (value: PortalTab) => {
    interacted.current = true;
    setSelected(null);
    setTab(value);
  };
  useEffect(() => {
    if (interacted.current) heading.current?.focus();
  }, [selected, tab]);
  return (
    <div
      className={
        "vehicle-detail-portal portal-vehicle-transition" +
        (switching ? " is-switching" : "")
      }
    >
      <main className="vehicle-detail-content">
        <div ref={heading} tabIndex={-1} className="portal-heading-anchor">
          <PortalHeader
            workshop={view.workshop}
            home={home}
            detail={maintenance?.type}
            onBack={
              maintenance
                ? () => {
                    interacted.current = true;
                    setSelected(null);
                  }
                : undefined
            }
          />
        </div>
        {maintenance ? (
          <div className="maintenance-detail-layout">
            <MaintenanceSummaryCard record={maintenance} order={order} />
            <div>
              <ServicePhotos photos={order?.photos ?? []} service />
              <CustomerReminders
                records={[maintenance]}
                mileage={view.vehicle.mileage}
              />
            </div>
          </div>
        ) : (
          <>
            <VehicleSelector
              vehicle={view.vehicle}
              vehicles={vehicles}
              onChange={switchVehicle}
            />
            <nav
              className="vehicle-portal-tabs"
              aria-label="Secciones del vehículo"
            >
              {(
                [
                  { id: "summary", label: "Resumen", Icon: Wrench },
                  { id: "history", label: "Historial", Icon: CalendarDays },
                  { id: "photos", label: "Fotos", Icon: Images },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  aria-pressed={tab === id}
                  onClick={() => showTab(id)}
                >
                  <Icon size={23} />
                  {label}
                </button>
              ))}
            </nav>
            {tab === "summary" && (
              <div className="vehicle-summary-layout">
                <NextMaintenanceCard
                  record={nextRecord}
                  mileage={view.vehicle.mileage}
                  status={summary.status}
                  tone={summary.tone}
                  phone={view.workshop.phone}
                />
                <LastMaintenanceCard
                  record={last}
                  others={records.slice(1)}
                  photo={
                    view.orders.find((o) => o.id === last?.orderId)?.photos[0]
                  }
                  onOpen={open}
                  onHistory={() => showTab("history")}
                />
                <CustomerReminders
                  records={records}
                  mileage={view.vehicle.mileage}
                />
                <aside className="portal-appointment-callout">
                  <CalendarDays size={36} />
                  <div>
                    <h2>¿Necesitas una mantención?</h2>
                    <p>Coordina tu próxima visita con el taller.</p>
                  </div>
                  {view.workshop.phone && (
                    <a
                      aria-label="Llamar al taller para agendar"
                      href={
                        "tel:" + view.workshop.phone.replace(/[^+0-9]/g, "")
                      }
                    >
                      <Phone size={20} />
                      <ChevronRight size={20} />
                    </a>
                  )}
                </aside>
              </div>
            )}
            {tab === "history" && (
              <div className="vehicle-history-layout">
                <PortalSection title="Historial de mantenciones">
                  {records.length ? (
                    records.map((m) => (
                      <button
                        key={m.id}
                        className="maintenance-history-row"
                        onClick={() => open(m.id)}
                      >
                        <Wrench />
                        <span>
                          <strong>{m.type}</strong>
                          <small>
                            {dateLabel(m.date)} · {km(m.mileage)}
                          </small>
                        </span>
                        <ChevronRight />
                      </button>
                    ))
                  ) : (
                    <p className="portal-muted">
                      No hay mantenciones registradas todavía.
                    </p>
                  )}
                </PortalSection>
                <CustomerWorkHistory orders={view.orders} />
              </div>
            )}
            {tab === "photos" && <ServicePhotos photos={view.photos} />}
          </>
        )}
        <footer className="vehicle-detail-footer">
          <strong>{view.workshop.name}</strong>
          <span>{view.workshop.hours}</span>
          <p>
            Historial público: cualquier persona que tenga este QR puede
            consultarlo. El taller actualiza los registros con cada visita.
          </p>
          {!live && <small>Demostración con datos de prueba.</small>}
        </footer>
      </main>
    </div>
  );
}
