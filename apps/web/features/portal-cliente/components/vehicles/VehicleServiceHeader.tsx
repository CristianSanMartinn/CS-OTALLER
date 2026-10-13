import Image from "next/image";
import { CarFront, Gauge, ClipboardList } from "lucide-react";
import type { PortalView } from "../../types/portal.types";
import { VehicleBrandLogo } from "./VehicleBrandLogo";
import { MaintenanceStatusBadge } from "../maintenance/MaintenanceStatusBadge";
import { km } from "@/utils/format";
export function VehicleServiceHeader({
  view,
  vehicles,
  status,
  tone,
  onChange,
}: {
  view: PortalView;
  vehicles: PortalView["vehicle"][];
  status: string;
  tone: string;
  onChange: (id: string) => void;
}) {
  const vehicle = view.vehicle;
  const servicePhotoIds = new Set(
    view.orders.flatMap((order) => order.photos.map((photo) => photo.id)),
  );
  const photo = view.photos.find((photo) => !servicePhotoIds.has(photo.id));
  return (
    <section
      className="service-vehicle-header"
      aria-label="Ficha del vehículo seleccionado"
    >
      <div
        className={"service-vehicle-hero" + (!photo ? " without-photo" : "")}
      >
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.description || "Fotografía registrada del vehículo"}
            fill
            sizes="(max-width: 720px) 100vw, 650px"
            unoptimized
            priority
          />
        ) : (
          <div className="service-vehicle-placeholder">
            <CarFront size={160} strokeWidth={0.8} />
            <span>Historial digital de tu vehículo</span>
          </div>
        )}
        <div className="service-vehicle-identity">
          <span className="service-record-label">FICHA DE TU VEHÍCULO</span>
          <h2>{vehicle.plate}</h2>
          <p>
            {vehicle.brand} {vehicle.model} · {vehicle.year}
          </p>
          <VehicleBrandLogo brand={vehicle.brand} />
        </div>
      </div>
      <div className="service-vehicle-information">
        <div className="service-vehicle-metric">
          <span>
            <Gauge size={18} />
            Kilometraje registrado
          </span>
          <strong>{km(vehicle.mileage)}</strong>
        </div>
        <div className="service-vehicle-metric">
          <span>
            <ClipboardList size={18} />
            Mantenciones registradas
          </span>
          <strong>{view.maintenance.length.toLocaleString("es-CL")}</strong>
        </div>
        <div className="service-vehicle-metric">
          <span>Estado de mantención</span>
          <MaintenanceStatusBadge label={status} tone={tone} />
        </div>
        {vehicles.length > 1 && (
          <label className="service-vehicle-switcher">
            Consultar otro vehículo
            <select
              value={vehicle.id}
              onChange={(event) => onChange(event.target.value)}
            >
              {vehicles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.plate} · {item.brand} {item.model}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="service-data-note">
          Información actualizada por el taller en cada visita.
        </p>
      </div>
    </section>
  );
}
