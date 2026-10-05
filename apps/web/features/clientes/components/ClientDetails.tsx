"use client";
import { ClientWhatsAppSettings } from "./ClientWhatsAppSettings";

import { useState } from "react";
import {
  CancelVisitDialog,
  CancellationTarget,
} from "@/components/Modal/CancelVisitDialog";
import Link from "next/link";
import { PhotoGallery } from "@/components/ImageUploader/PhotoGallery";
import { CustomerAccessCard } from "@/components/CustomerAccess/CustomerAccessCard";
import { ClientReminderSettings } from "./ClientReminderSettings";
import { useStore } from "@/features/shared/components/StoreProvider";
import {
  PageHeading,
  Panel,
  Breadcrumb,
  EmptyState,
} from "@/components/ui/primitives";
import { DeleteClientDialog } from "./DeleteClientDialog";
import { ClientCard } from "./ClientCard";
import { ClientVehicles } from "./ClientVehicles";
import { ClientHistory } from "./ClientHistory";
import { MaintenanceHistory } from "@/features/mantenciones/components/MaintenanceHistory";
import { AppointmentList } from "@/features/agenda/components/AppointmentList";
export function ClientDetails({ id }: { id: string }) {
  const { data, user, live } = useStore();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const client = data.customers.find((c) => c.id === id);
  if (user?.role !== "ADMIN") return null;
  if (!client) return <EmptyState title="Cliente no encontrado" />;
  const vehicles = data.vehicles.filter((v) => v.customerId === id);
  const plate = (vehicleId: string) =>
    data.vehicles.find((v) => v.id === vehicleId)?.plate ?? "";
  const targets: CancellationTarget[] = [
    ...data.orders
      .filter(
        (o) =>
          o.customerId === id && !["DELIVERED", "CANCELLED"].includes(o.status),
      )
      .map((o) => ({
        kind: "order" as const,
        id: o.id,
        label: o.number + " · " + plate(o.vehicleId) + " · " + o.reason,
      })),
    ...data.appointments
      .filter(
        (a) =>
          a.customerId === id &&
          !["Finalizada", "Cancelada"].includes(a.status),
      )
      .map((a) => ({
        kind: "appointment" as const,
        id: a.id,
        label:
          "Cita " +
          a.date +
          " " +
          a.time +
          " · " +
          plate(a.vehicleId) +
          " · " +
          a.service,
      })),
  ];
  return (
    <>
      {deleteOpen && (
        <DeleteClientDialog
          client={client}
          onClose={() => setDeleteOpen(false)}
        />
      )}
      {client.active === false && (
        <p role="status">
          Cliente eliminado de la lista. Su historial se conserva.
        </p>
      )}
      {cancelOpen && (
        <CancelVisitDialog
          targets={targets}
          onClose={() => setCancelOpen(false)}
        />
      )}
      <Breadcrumb label="Clientes" href="/clientes" current={client.name} />
      <PageHeading
        title={client.name}
        description="Ficha del cliente e historial de atención."
        action={
          <div className="row-actions">
            <button
              type="button"
              className="button"
              onClick={() => setDeleteOpen(true)}
            >
              {client.active === false
                ? "Restaurar cliente"
                : "Eliminar cliente"}
            </button>
            <button
              type="button"
              className="button"
              disabled={!targets.length}
              onClick={() => setCancelOpen(true)}
            >
              Cancelar visita
            </button>
            {client.active !== false && (
              <Link
                className="button primary"
                href={"/ordenes/nueva?cliente=" + id}
              >
                Crear orden
              </Link>
            )}
          </div>
        }
      />
      <Panel title="Información del cliente">
        <ClientCard client={client} />
      </Panel>
      {client.active !== false && <CustomerAccessCard customerId={client.id} />}
      <Panel title="Fotografías del registro del cliente">
        <PhotoGallery photos={client.photos ?? []} />
      </Panel>
      {client.active !== false &&
        (live ? (
          <ClientWhatsAppSettings key={client.id} client={client} />
        ) : (
          <ClientReminderSettings key={client.id} client={client} />
        ))}
      <Panel title="Vehículos asociados">
        <ClientVehicles vehicles={vehicles} />
      </Panel>
      <Panel title="Historial de órdenes">
        <ClientHistory
          orders={data.orders.filter((o) => o.customerId === id)}
        />
      </Panel>
      <Panel title="Mantenciones">
        <MaintenanceHistory
          records={data.maintenance.filter((m) =>
            vehicles.some((v) => v.id === m.vehicleId),
          )}
        />
      </Panel>
      <Panel title="Citas">
        <AppointmentList
          appointments={data.appointments.filter((a) => a.customerId === id)}
        />
      </Panel>
    </>
  );
}
