"use client";
import { CustomerAccessCard } from "./CustomerAccessCard";
import { VehiclePhotoGallery } from "./VehiclePhotoGallery";
import { OilChangeSummary } from "@/features/mantenciones/components/OilChangeSummary";
import Link from "next/link";
import { useStore } from "@/features/shared/components/StoreProvider";
import {
  PageHeading,
  Panel,
  Breadcrumb,
  EmptyState,
  DetailGrid,
} from "@/components/ui/primitives";
import { VehicleHistory } from "./VehicleHistory";
import { VehicleMaintenanceHistory } from "./VehicleMaintenanceHistory";
import { NextMaintenanceCard } from "@/features/mantenciones/components/NextMaintenanceCard";
import { km } from "@/utils/format";
export function VehicleDetails({ id }: { id: string }) {
  const { data } = useStore();
  const v = data.vehicles.find((v) => v.id === id);
  if (!v) return <EmptyState title="Vehículo no encontrado o sin acceso" />;
  const orders = data.orders.filter((o) => o.vehicleId === id);
  const maintenance = data.maintenance.filter((m) => m.vehicleId === id);
  const oil = [...maintenance]
    .filter((m) => m.type === "Cambio de aceite")
    .sort((a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage)[0];
  return (
    <>
      <Breadcrumb label="Vehículos" href="/vehiculos" current={v.plate} />
      <PageHeading
        title={v.brand + " " + v.model}
        description={v.plate + " · " + v.year + " · Historial del vehículo"}
        action={
          <Link
            className="button primary"
            href={"/ordenes/nueva?vehiculo=" + id}
          >
            Nueva orden
          </Link>
        }
      />
      <Panel title="Datos generales">
        <DetailGrid
          items={[
            ["Patente", v.plate],
            [
              "Propietario",
              data.customers.find((c) => c.id === v.customerId)?.name,
            ],
            ["Kilometraje", km(v.mileage)],
            ["Versión", v.version],
            ["VIN", v.vin],
            ["Motor", v.engine],
            ["Combustible", v.fuel],
            ["Transmisión", v.transmission],
            ["Color", v.color],
          ]}
        />
      </Panel>
      <CustomerAccessCard customerId={v.customerId} plate={v.plate} />
      {oil && <OilChangeSummary record={oil} />}
      <NextMaintenanceCard records={maintenance} />
      <Panel title="Órdenes anteriores">
        <VehicleHistory orders={orders} />
      </Panel>
      <Panel title="Diagnósticos y reparaciones">
        <div className="record-list">
          {orders.map((o) => (
            <div key={o.id}>
              <Link className="text-link" href={"/ordenes/" + o.id}>
                {o.number}
              </Link>
              <p>{o.diagnosis || "Diagnóstico pendiente"}</p>
              <small>
                {o.services
                  .map((s) => s.name + " (" + s.status + ")")
                  .join(" · ")}
              </small>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Mantenciones">
        <VehicleMaintenanceHistory records={maintenance} />
      </Panel>
      <VehiclePhotoGallery vehicle={v} />
    </>
  );
}
