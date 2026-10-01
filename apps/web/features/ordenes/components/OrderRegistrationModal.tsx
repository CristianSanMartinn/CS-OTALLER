"use client";
import { Customer, Vehicle } from "@/features/shared/types/domain";
import { ClientForm } from "@/features/clientes/components/ClientForm";
import { VehicleForm } from "@/features/vehiculos/components/VehicleForm";
import { Modal } from "@/components/Modal/Modal";

export function OrderRegistrationModal({
  kind,
  customerId,
  onClose,
  onCustomerSave,
  onVehicleSave,
}: {
  kind: "customer" | "vehicle";
  customerId: string;
  onClose: () => void;
  onCustomerSave: (customer: Customer) => void;
  onVehicleSave: (vehicle: Vehicle) => void;
}) {
  return (
    <Modal
      title={
        kind === "customer"
          ? "Registrar nuevo cliente"
          : "Registrar nuevo vehículo"
      }
      onClose={onClose}
    >
      <p className="section-hint">
        {kind === "customer"
          ? "Escribe los datos del cliente. Al guardar, podrás registrar su vehículo y continuar con esta orden."
          : "El vehículo quedará asociado al cliente seleccionado y se agregará a esta orden."}
      </p>
      {kind === "customer" ? (
        <ClientForm onSave={onCustomerSave} onCancel={onClose} />
      ) : (
        <VehicleForm
          ownerId={customerId}
          onSave={onVehicleSave}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
}
