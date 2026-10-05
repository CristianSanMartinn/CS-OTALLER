import Image from "next/image";
import { CarFront } from "lucide-react";
import { VehicleBrandLogo } from "./VehicleBrandLogo";
import type { PortalVehicle } from "../../types/vehicle.types";
import type { PortalPhoto } from "../../types/portal.types";
import { km } from "@/utils/format";
export function VehicleSelector({
  vehicle,
  vehicles,
  photo,
  onChange,
}: {
  vehicle: PortalVehicle;
  vehicles: PortalVehicle[];
  photo?: PortalPhoto;
  onChange: (id: string) => void;
}) {
  return (
    <section
      className="vehicle-selector-card"
      aria-label="Vehículo seleccionado"
    >
      <div className="vehicle-selector-info">
        <VehicleBrandLogo brand={vehicle.brand} />
        <div>
          <h2>
            {vehicle.brand} {vehicle.model}
          </h2>
          <p>
            {vehicle.year} · {km(vehicle.mileage)}
          </p>
        </div>
        <strong className="vehicle-selector-plate">{vehicle.plate}</strong>
      </div>
      <div className="vehicle-selector-photo">
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.description || "Fotografía del vehículo"}
            width={300}
            height={160}
            unoptimized
          />
        ) : (
          <CarFront size={105} strokeWidth={1} />
        )}
      </div>
      {vehicles.length > 1 && (
        <label className="vehicle-switcher">
          Cambiar vehículo
          <select
            aria-label="Cambiar vehículo"
            value={vehicle.id}
            onChange={(e) => onChange(e.target.value)}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} · {v.brand} {v.model}
              </option>
            ))}
          </select>
        </label>
      )}
    </section>
  );
}
