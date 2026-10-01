"use client";
import Link from "next/link";
import { CarFront, Wrench, Phone, ArrowLeft } from "lucide-react";
import { useStore } from "@/features/shared/components/StoreProvider";
import { EmptyState, Panel } from "@/components/ui/primitives";
import { OilChangeSummary } from "@/features/mantenciones/components/OilChangeSummary";
import { MaintenanceHistory } from "@/features/mantenciones/components/MaintenanceHistory";
import { clientVehicle } from "../services/clientAccessService";
import { customerVehicle } from "../services/customerPortalService";
import { CustomerReminders } from "./CustomerReminders";
import { PhotoGallery } from "@/components/ImageUploader/PhotoGallery";
import { CustomerWorkHistory } from "./CustomerWorkHistory";
import { km } from "@/utils/format";
export function CustomerPortal({
  token,
  clientVehicleId,
}: {
  token: string;
  clientVehicleId?: string;
}) {
  const { data, user } = useStore();
  const view = clientVehicleId
    ? clientVehicle(data, token, clientVehicleId)
    : customerVehicle(data, token);
  const home = clientVehicleId
    ? "/mi-taller/" + encodeURIComponent(token)
    : "/mi-vehiculo/" + encodeURIComponent(token);
  if (!view)
    return (
      <div className="customer-portal">
        <EmptyState
          title="Ficha no disponible"
          description="Este enlace de demostración no corresponde a un vehículo de esta sesión. Solicita al taller un enlace válido."
        />
        {user && (
          <Link className="button" href="/vehiculos">
            Volver a vehículos
          </Link>
        )}
      </div>
    );
  const oil = [...view.maintenance]
    .filter((m) => m.type === "Cambio de aceite")
    .sort((a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage)[0];
  return (
    <div className="customer-portal">
      <header className="customer-header">
        <Link href={home} className="customer-brand">
          <span className="brand-icon">
            <Wrench size={21} />
          </span>
          <span>
            C.S.OTALLER<small>MI VEHÍCULO</small>
          </span>
        </Link>
        <span className="demo-label">VISTA CLIENTE · DEMO</span>
      </header>
      <main>
        {clientVehicleId && (
          <Link className="portal-back text-link" href={home}>
            <ArrowLeft size={16} /> Ver todos mis vehículos
          </Link>
        )}
        <div className="customer-intro">
          <span className="eyebrow">{view.workshop.name}</span>
          <h1>Tu vehículo, al día.</h1>
          <p>
            Consulta sus cuidados, trabajos anteriores y próxima mantención.
          </p>
        </div>
        <section className="customer-vehicle">
          <div className="customer-car-icon">
            <CarFront size={40} />
          </div>
          <div>
            <span className="plate">{view.vehicle.plate}</span>
            <h2>
              {view.vehicle.brand} {view.vehicle.model}
            </h2>
            <p>
              {view.vehicle.year} · Último registro: {km(view.vehicle.mileage)}
            </p>
          </div>
        </section>
        {oil ? (
          <OilChangeSummary record={oil} />
        ) : (
          <Panel title="Cambio de aceite">
            <EmptyState
              title="Aún no hay un cambio de aceite registrado"
              description="Aquí aparecerán el kilometraje del cambio y la fecha del próximo servicio."
            />
          </Panel>
        )}
        <CustomerReminders
          records={view.maintenance}
          mileage={view.vehicle.mileage}
        />
        <CustomerWorkHistory orders={view.orders} />
        <Panel title="Historial de mantenciones">
          <MaintenanceHistory records={view.maintenance} />
        </Panel>
        <PhotoGallery photos={view.photos} />
        <section className="customer-contact">
          <div>
            <h2>{view.workshop.name}</h2>
            <p>{view.workshop.address}</p>
            <small>{view.workshop.hours}</small>
          </div>
          <a
            className="button primary"
            href={"tel:" + view.workshop.phone.replace(/[^+0-9]/g, "")}
          >
            <Phone size={16} />
            {view.workshop.phone}
          </a>
        </section>
        {user && (
          <Link className="text-link" href={"/vehiculos/" + view.vehicle.id}>
            <ArrowLeft size={14} /> Volver a la ficha del taller
          </Link>
        )}
        <footer className="customer-footer">
          Vista pública: cualquier persona con el QR puede consultar este
          historial. Demostración con datos mock. Las modificaciones y
          fotografías de esta sesión no se sincronizan con otros dispositivos.
        </footer>
      </main>
    </div>
  );
}
