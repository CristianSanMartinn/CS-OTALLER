"use client";
import Link from "next/link";
import { CustomerAccessCard } from "@/components/CustomerAccess/CustomerAccessCard";
import { ClientReminderSettings } from "./ClientReminderSettings";
import { useStore } from "@/features/shared/components/StoreProvider";
import {
  PageHeading,
  Panel,
  Breadcrumb,
  EmptyState,
} from "@/components/ui/primitives";
import { ClientCard } from "./ClientCard";
import { ClientVehicles } from "./ClientVehicles";
import { ClientHistory } from "./ClientHistory";
import { MaintenanceHistory } from "@/features/mantenciones/components/MaintenanceHistory";
import { AppointmentList } from "@/features/agenda/components/AppointmentList";
export function ClientDetails({ id }: { id: string }) {
  const { data, user } = useStore();
  const client = data.customers.find((c) => c.id === id);
  if (user?.role !== "ADMIN") return null;
  if (!client) return <EmptyState title="Cliente no encontrado" />;
  const vehicles = data.vehicles.filter((v) => v.customerId === id);
  return (
    <>
      <Breadcrumb label="Clientes" href="/clientes" current={client.name} />
      <PageHeading
        title={client.name}
        description="Ficha del cliente e historial de atención."
        action={
          <Link
            className="button primary"
            href={"/ordenes/nueva?cliente=" + id}
          >
            Crear orden
          </Link>
        }
      />
      <Panel title="Información del cliente">
        <ClientCard client={client} />
      </Panel>
      <CustomerAccessCard customerId={client.id} />
      <ClientReminderSettings key={client.id} client={client} />
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
