"use client";
import styles from "./WorkOrderForm.module.css";
import { Modal } from "@/components/Modal/Modal";
import type { WorkOrderDraft } from "../../types/editor.types";
import { CancelVisitDialog } from "@/components/Modal/CancelVisitDialog";
import { CancellationDetails } from "@/components/ui/CancellationDetails";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Customer, Vehicle, WorkOrder } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/store/StoreProvider";
import { Field, Panel, EmptyState } from "@/components/ui/primitives";
import { today, uid } from "@/utils/format";
import { scopedData } from "@/features/shared/services/permissions";
import { WorkOrderAssignment } from "../assignment/WorkOrderAssignment";
import { WorkOrderHeader } from "../header/WorkOrderHeader";
import { OrderRegistrationModal } from "../registration/OrderRegistrationModal";
import { CustomerSection } from "./sections/CustomerSection";
import { VehicleSection } from "./sections/VehicleSection";
import { ReceptionSection } from "./sections/ReceptionSection";
import { DiagnosisSection } from "./sections/DiagnosisSection";
import { ScannerCodesSection } from "./sections/ScannerCodesSection";
import { ServicesSection } from "./sections/ServicesSection";
import { PartsSection } from "./sections/PartsSection";
import { PhotoEvidenceSection } from "./sections/PhotoEvidenceSection";
import { ObservationsSection } from "./sections/ObservationsSection";
import { WorkOrderSummary } from "../summary/WorkOrderSummary";
import { MaintenanceSection } from "./sections/MaintenanceSection";
type VehicleSelection = {
  customerId: string;
  vehicleId: string;
  registeredVehicle?: Vehicle;
  continueRegistration?: boolean;
};
function withoutMileage({
  mileage: _mileage,
  ...draft
}: WorkOrder): WorkOrderDraft {
  return draft;
}
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
  const [vehicleRegistrationBlocked, setVehicleRegistrationBlocked] =
    useState(false);
  const canRegister = user?.role === "ADMIN" && !id;
  const [mileageInput, setMileageInput] = useState(() =>
    existing && Number.isFinite(existing.mileage)
      ? String(existing.mileage)
      : "",
  );
  const [pendingSelection, setPendingSelection] =
    useState<VehicleSelection | null>(null);
  const availableVehicles = user
    ? scopedData(data, user).vehicles.filter(
        (vehicle) => !("active" in vehicle) || vehicle.active !== false,
      )
    : [];
  const [order, setOrder] = useState<WorkOrderDraft>(() => {
    if (existing) return withoutMileage(structuredClone(existing));
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
      assignmentType: "INDIVIDUAL",
      mechanicId: user?.role === "WORKER" ? user.id : "",
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
  const change = (patch: Partial<WorkOrderDraft>) =>
    setOrder((current) => ({ ...current, ...patch }));
  const selectedVehicle = availableVehicles.find(
    (vehicle) => vehicle.id === order.vehicleId,
  );
  const referenceMileage =
    selectedVehicle &&
    Number.isInteger(selectedVehicle.mileage) &&
    selectedVehicle.mileage >= 0 &&
    selectedVehicle.mileage <= 2147483647
      ? selectedVehicle.mileage
      : undefined;
  function applySelection(selection: VehicleSelection, clearMileage = false) {
    const vehicle =
      availableVehicles.find((item) => item.id === selection.vehicleId) ??
      selection.registeredVehicle;
    if (
      selection.vehicleId &&
      (!vehicle ||
        vehicle.workshopId !== user?.workshopId ||
        vehicle.customerId !== selection.customerId)
    ) {
      setError(
        "El vehículo ya no está disponible para este cliente. Revisa la selección.",
      );
      setPendingSelection(null);
      return;
    }
    setError("");
    change({
      customerId: selection.customerId,
      vehicleId: selection.vehicleId,
    });
    if (clearMileage) setMileageInput("");
    setPendingSelection(null);
    if (selection.continueRegistration) setRegistration("vehicle");
  }
  function cancelSelection() {
    setPendingSelection(null);
    setError("");
  }
  function requestSelection(selection: VehicleSelection) {
    if (
      selection.customerId === order.customerId &&
      selection.vehicleId === order.vehicleId
    )
      return;
    if (mileageInput.trim()) setPendingSelection(selection);
    else applySelection(selection);
  }
  function registerCustomer(customer: Customer) {
    setRegistration(null);
    setError("");
    notify("Cliente registrado. Ahora puedes agregar su vehículo.");
    requestSelection({
      customerId: customer.id,
      vehicleId: "",
      continueRegistration: true,
    });
  }
  function registerVehicle(vehicle: Vehicle) {
    setRegistration(null);
    setError("");
    notify(
      "Vehículo registrado. Confirma su selección y el kilometraje de ingreso.",
    );
    requestSelection({
      customerId: order.customerId,
      vehicleId: vehicle.id,
      registeredVehicle: vehicle,
    });
  }
  function selectVehicle(vehicleId: string) {
    if (vehicleId === order.vehicleId) return;
    const vehicle = availableVehicles.find(
      (item) => item.id === vehicleId && item.customerId === order.customerId,
    );
    if (vehicleId && !vehicle) return;
    requestSelection({ customerId: order.customerId, vehicleId });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || preparingPhotos) return;
    if (pendingSelection) {
      setError("Confirma o cancela el cambio de vehículo antes de guardar.");
      return;
    }
    const reading = mileageInput.trim();
    if (!reading) {
      setError("Confirma el kilometraje de ingreso antes de guardar.");
      return;
    }
    const mileage = Number(reading);
    if (!Number.isInteger(mileage) || mileage < 0 || mileage > 2147483647) {
      setError("Ingresa un kilometraje válido.");
      return;
    }
    const completeOrder: WorkOrder = { ...order, mileage };
    const button = (e.nativeEvent as SubmitEvent).submitter;
    const markReady =
      button?.getAttribute("name") === "intent" &&
      button.getAttribute("value") === "ready";
    setBusy(true);
    setError("");
    try {
      const saved = await saveWorkOrder(
        markReady ? { ...completeOrder, status: "READY" } : completeOrder,
        Boolean(id),
      );
      setOrder(withoutMileage(saved));
      setMileageInput(String(saved.mileage));
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
              ...withoutMileage(structuredClone(existing)),
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
      <form
        id="work-order-editor"
        onSubmit={submit}
        className={
          styles.orderEditor + (!id ? " " + styles.quickReception : "")
        }
      >
        {!id && (
          <p className={styles.receptionHint}>
            Registra el ingreso ahora. El diagnóstico, los trabajos y los
            repuestos se completan después de crear la orden.
          </p>
        )}
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
                  requestSelection({ customerId, vehicleId: "" })
                }
              />
              <VehicleSection
                userId={user?.id}
                onRegistrationBlockedChange={setVehicleRegistrationBlocked}
                searchVehicles={availableVehicles}
                workshopId={user?.workshopId ?? ""}
                customerId={order.customerId}
                vehicles={availableVehicles.filter(
                  (v) => v.customerId === order.customerId,
                )}
                value={order.vehicleId}
                onCreate={
                  canRegister && order.customerId
                    ? () => {
                        if (!vehicleRegistrationBlocked)
                          setRegistration("vehicle");
                      }
                    : undefined
                }
                disabled={!!id || !order.customerId}
                onChange={selectVehicle}
              />
              <WorkOrderAssignment order={order} onChange={change} />
              {id && (
                <Field label="Número de orden" value={order.number} readOnly />
              )}
            </div>
            {canRegister && (
              <details className={styles.orderRegistrationActions}>
                <summary>¿Necesitas registrar un cliente o vehículo?</summary>
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
                    disabled={!order.customerId || vehicleRegistrationBlocked}
                    onClick={() => {
                      if (!vehicleRegistrationBlocked)
                        setRegistration("vehicle");
                    }}
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
              </details>
            )}
          </Panel>
          <ReceptionSection
            {...props}
            mileageInput={mileageInput}
            onMileageChange={setMileageInput}
            referenceMileage={referenceMileage}
            onUsePreviousMileage={() => {
              if (referenceMileage !== undefined)
                setMileageInput(String(referenceMileage));
            }}
            receptionOnly={!id}
          />
          {id && (
            <>
              <DiagnosisSection {...props} />
              <ScannerCodesSection {...props} />
              <ServicesSection {...props} />
              <PartsSection {...props} />
              <PhotoEvidenceSection
                {...props}
                onBusyChange={setPreparingPhotos}
              />
              <MaintenanceSection
                vehicleId={order.vehicleId}
                orderId={order.id}
                isNew={!id}
              />
              <ObservationsSection {...props} />
            </>
          )}
          <div className="form-actions">
            <Link className="button" href="/ordenes">
              Volver a órdenes
            </Link>
            <button
              className="button primary"
              disabled={busy || preparingPhotos}
            >
              {busy
                ? "Guardando…"
                : id
                  ? "Guardar cambios"
                  : "Crear orden y continuar"}
            </button>
          </div>
        </div>
        {id && (
          <aside>
            <WorkOrderSummary
              order={order}
              initialStatus={existing?.status ?? "RECEIVED"}
              onStatus={(status) => {
                if (
                  status === "CANCELLED" &&
                  existing?.status !== "CANCELLED"
                ) {
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
        )}
      </form>
      {pendingSelection && (
        <Modal title="Confirmar cambio de vehículo" onClose={cancelSelection}>
          <div className="panel-padding">
            <p>
              Nueva selección:{" "}
              {availableVehicles.find(
                (vehicle) => vehicle.id === pendingSelection.vehicleId,
              )?.plate ??
                pendingSelection.registeredVehicle?.plate ??
                "sin vehículo seleccionado"}
              .
            </p>
            <p>
              Ya ingresaste una lectura de {mileageInput} km. El cambio de
              selección todavía no se ha aplicado.
            </p>
            <p>
              ¿Quieres conservar esa lectura para la nueva selección o ingresar
              una nueva? El motivo, la fecha y la asignación se conservarán.
            </p>
          </div>
          <div className="form-actions">
            <button type="button" className="button" onClick={cancelSelection}>
              Cancelar cambio
            </button>
            <button
              type="button"
              className="button"
              onClick={() => applySelection(pendingSelection, true)}
            >
              Cambiar e ingresar nueva lectura
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => applySelection(pendingSelection)}
            >
              Cambiar y conservar lectura
            </button>
          </div>
        </Modal>
      )}
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
