"use client";
import { CancelVisitDialog } from "@/components/Modal/CancelVisitDialog";
import { CancellationDetails } from "@/components/ui/CancellationDetails";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Customer, Vehicle, WorkOrder } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import {
  Field,
  SelectField,
  Panel,
  EmptyState,
} from "@/components/ui/primitives";
import { today, uid } from "@/utils/format";
import { WorkOrderHeader } from "./WorkOrderHeader";
import { OrderRegistrationModal } from "./OrderRegistrationModal";
import { CustomerSection } from "./CustomerSection";
import { VehicleSection } from "./VehicleSection";
import { ReceptionSection } from "./ReceptionSection";
import { DiagnosisSection } from "./DiagnosisSection";
import { ScannerCodesSection } from "./ScannerCodesSection";
import { ServicesSection } from "./ServicesSection";
import { PartsSection } from "./PartsSection";
import { PhotoEvidenceSection } from "./PhotoEvidenceSection";
import { ObservationsSection } from "./ObservationsSection";
import { WorkOrderSummary } from "./WorkOrderSummary";
import { MaintenanceSection } from "./MaintenanceSection";
export function WorkOrderForm({
  id,
  initialCustomerId = "",
  initialVehicleId = "",
}: {
  id?: string;
  initialCustomerId?: string;
  initialVehicleId?: string;
}) {
  const { data, user, saveWorkOrder, notify } = useStore();
  const router = useRouter();
  const existing = data.orders.find((o) => o.id === id);
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [registration, setRegistration] = useState<
    "customer" | "vehicle" | null
  >(null);
  const canRegister = user?.role === "ADMIN" && !id;
  const [order, setOrder] = useState<WorkOrder>(() => {
    if (existing) return structuredClone(existing);
    const v = data.vehicles.find((v) => v.id === initialVehicleId);
    return {
      id: uid(),
      workshopId: user!.workshopId,
      number:
        "OT-" +
        (Math.max(
          1000,
          ...data.orders.map((o) => Number(o.number.replace("OT-", ""))),
        ) +
          1),
      date: today(),
      time: new Date().toTimeString().slice(0, 5),
      customerId: v?.customerId ?? initialCustomerId,
      vehicleId: v?.id ?? "",
      mechanicId: user?.role === "WORKER" ? user.id : "",
      mileage: v?.mileage ?? 0,
      reason: "",
      symptoms: "",
      diagnosis: "",
      findings: "",
      observations: "",
      status: "RECEIVED",
      codes: [],
      services: [],
      parts: [],
      photos: [],
    };
  });
  if (id && !existing)
    return <EmptyState title="Orden no encontrada o sin acceso" />;
  const change = (patch: Partial<WorkOrder>) =>
    setOrder((o) => ({ ...o, ...patch }));
  function registerCustomer(customer: Customer) {
    change({ customerId: customer.id, vehicleId: "", mileage: 0 });
    setError("");
    notify("Cliente registrado. Ahora puedes agregar su vehículo.");
    setRegistration("vehicle");
  }
  function registerVehicle(vehicle: Vehicle) {
    change({ vehicleId: vehicle.id, mileage: vehicle.mileage });
    setError("");
    notify("Vehículo registrado y seleccionado en la orden.");
    setRegistration(null);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || preparingPhotos) return;
    const button = (e.nativeEvent as SubmitEvent).submitter;
    const markReady =
      button?.getAttribute("name") === "intent" &&
      button.getAttribute("value") === "ready";
    setBusy(true);
    setError("");
    try {
      const saved = await saveWorkOrder(
        markReady ? { ...order, status: "READY" } : order,
        Boolean(id),
      );
      setOrder(saved);
      notify(
        markReady
          ? "Vehículo listo para retirar. Estado guardado."
          : id
            ? "Orden actualizada correctamente"
            : "Orden creada correctamente",
      );
      if (!id) router.push("/ordenes/" + saved.id);
    } catch (err) {
      setError((err as Error).message);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  }
  const props = { order, onChange: change };
  return (
    <>
      <WorkOrderHeader
        order={order}
        isNew={!id}
        onCancel={
          existing &&
          user?.role === "ADMIN" &&
          !["DELIVERED", "CANCELLED"].includes(existing.status)
            ? () => setCancelOpen(true)
            : undefined
        }
        busy={busy || preparingPhotos}
        canMarkReady={
          !!existing &&
          user?.role === "ADMIN" &&
          !["READY", "DELIVERED", "CANCELLED"].includes(existing.status)
        }
      />
      {order.status === "CANCELLED" && (
        <Panel title="Atención cancelada">
          <CancellationDetails cancellation={order.cancellation} />
        </Panel>
      )}
      {cancelOpen && existing && (
        <CancelVisitDialog
          targets={[{ kind: "order", id: existing.id, label: existing.number }]}
          onClose={() => setCancelOpen(false)}
          onCancelled={(_, cancellation) =>
            setOrder({
              ...structuredClone(existing),
              status: "CANCELLED",
              cancellation,
            })
          }
        />
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form id="work-order-editor" onSubmit={submit} className="order-editor">
        <div>
          <Panel
            title="01 · Cliente y vehículo"
            subtitle="Relaciona la ficha con el propietario y su vehículo"
          >
            <div className="form-grid">
              <CustomerSection
                customers={data.customers}
                value={order.customerId}
                onCreate={
                  canRegister ? () => setRegistration("customer") : undefined
                }
                disabled={!!id}
                onChange={(customerId) =>
                  change({ customerId, vehicleId: "", mileage: 0 })
                }
              />
              <VehicleSection
                vehicles={data.vehicles.filter(
                  (v) => v.customerId === order.customerId,
                )}
                value={order.vehicleId}
                onCreate={
                  canRegister && order.customerId
                    ? () => setRegistration("vehicle")
                    : undefined
                }
                disabled={!!id || !order.customerId}
                onChange={(vehicleId) =>
                  change({
                    vehicleId,
                    mileage:
                      data.vehicles.find((v) => v.id === vehicleId)?.mileage ??
                      0,
                  })
                }
              />
              <SelectField
                label="Mecánico responsable"
                required
                value={order.mechanicId}
                disabled={user?.role === "WORKER"}
                onChange={(e) => change({ mechanicId: e.target.value })}
              >
                <option value="">Seleccionar mecánico</option>
                {data.users
                  .filter((u) => u.active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </SelectField>
              <Field label="Número de orden" value={order.number} readOnly />
            </div>
            {canRegister && (
              <div className="order-registration-actions">
                <p>
                  ¿Es su primera visita? Registra al cliente y su vehículo aquí.
                </p>
                <div className="actions">
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => setRegistration("customer")}
                  >
                    + Registrar nuevo cliente
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={!order.customerId}
                    onClick={() => setRegistration("vehicle")}
                  >
                    + Registrar nuevo vehículo
                  </button>
                </div>
                {!order.customerId && (
                  <small>
                    Primero selecciona o registra un cliente para agregar su
                    vehículo.
                  </small>
                )}
              </div>
            )}
          </Panel>
          <ReceptionSection {...props} />
          <DiagnosisSection {...props} />
          <ScannerCodesSection {...props} />
          <ServicesSection {...props} />
          <PartsSection {...props} />
          <PhotoEvidenceSection {...props} onBusyChange={setPreparingPhotos} />
          <MaintenanceSection
            vehicleId={order.vehicleId}
            orderId={order.id}
            isNew={!id}
          />
          <ObservationsSection {...props} />
          <div className="form-actions">
            <Link className="button" href="/ordenes">
              Volver a órdenes
            </Link>
            <button
              className="button primary"
              disabled={busy || preparingPhotos}
            >
              {busy ? "Guardando…" : id ? "Guardar cambios" : "Crear orden"}
            </button>
          </div>
        </div>
        <aside>
          <WorkOrderSummary
            order={order}
            initialStatus={existing?.status ?? "RECEIVED"}
            onStatus={(status) => {
              if (status === "CANCELLED" && existing?.status !== "CANCELLED") {
                if (existing) setCancelOpen(true);
                else
                  setError(
                    "Primero guarda la orden para poder cancelarla indicando el motivo.",
                  );
              } else if (
                existing?.status === "CANCELLED" &&
                status !== "CANCELLED"
              )
                setError(
                  "La orden cancelada conserva su estado. Crea una nueva orden para otra visita.",
                );
              else change({ status });
            }}
            isNew={!id}
            busy={busy || preparingPhotos}
          />
        </aside>
      </form>
      {canRegister && registration && (
        <OrderRegistrationModal
          key={registration}
          kind={registration}
          customerId={order.customerId}
          onClose={() => setRegistration(null)}
          onCustomerSave={registerCustomer}
          onVehicleSave={registerVehicle}
        />
      )}
    </>
  );
}
