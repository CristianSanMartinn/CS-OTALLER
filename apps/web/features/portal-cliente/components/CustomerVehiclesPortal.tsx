"use client";
import Link from "next/link";
import { CarFront, ArrowUpRight, Wrench, ScanLine } from "lucide-react";
import { useStore } from "@/features/shared/components/StoreProvider";
import { EmptyState } from "@/components/ui/primitives";
import {
  clientAccess,
  clientVehiclePath,
} from "../services/clientAccessService";
import { km } from "@/utils/format";
export function CustomerVehiclesPortal({ token }: { token: string }) {
  const { data } = useStore();
  const access = clientAccess(data, token);
  if (!access)
    return (
      <div className="customer-portal">
        <EmptyState
          title="Código no disponible"
          description="Solicita al taller el QR correspondiente a tu registro."
        />
      </div>
    );
  return (
    <div className="customer-portal">
      <header className="customer-header">
        <div className="customer-brand">
          <span className="brand-icon">
            <Wrench size={21} />
          </span>
          <span>
            C.S.OTALLER<small>HISTORIAL DIGITAL</small>
          </span>
        </div>
        <span className="demo-label">VISTA PÚBLICA · DEMO</span>
      </header>
      <main>
        <div className="customer-intro">
          <span className="eyebrow">{access.workshop.name}</span>
          <h1>Mis vehículos</h1>
          <p>
            Selecciona un vehículo para consultar sus trabajos, fotografías y
            próximas mantenciones.
          </p>
        </div>
        <div className="client-qr-note">
          <ScanLine size={22} />
          <div>
            <strong>Un mismo QR para todos tus vehículos</strong>
            <p>
              En cada visita, el taller agrega los nuevos trabajos al vehículo
              correspondiente. Conserva tu etiqueta.
            </p>
          </div>
        </div>
        <div className="portal-vehicle-grid">
          {access.vehicles.length ? (
            access.vehicles.map((v) => (
              <Link
                key={v.id}
                href={clientVehiclePath(token, v.id)}
                className="portal-vehicle-card"
              >
                <div className="vehicle-card-top">
                  <CarFront size={35} />
                  <ArrowUpRight size={21} />
                </div>
                <span className="plate">{v.plate}</span>
                <h2>
                  {v.brand} {v.model}
                </h2>
                <p>
                  {v.year} · {km(v.mileage)}
                </p>
                <span className="text-link">
                  Ver historial y próximo mantenimiento →
                </span>
              </Link>
            ))
          ) : (
            <EmptyState
              title="Aún no hay vehículos asociados"
              description="El taller puede registrar tus vehículos sin cambiar este QR."
            />
          )}
        </div>
        <footer className="customer-footer">
          Cualquier persona con este enlace puede consultar los vehículos y sus
          mantenciones. No se muestran RUT, teléfono, correo ni dirección del
          propietario. Demo: los cambios de esta sesión no se sincronizan con
          otros dispositivos.
        </footer>
      </main>
    </div>
  );
}
