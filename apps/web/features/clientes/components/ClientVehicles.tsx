import { Vehicle } from "@/features/shared/types/domain";
import { VehicleCard } from "@/features/vehiculos/components/VehicleCard";
import { EmptyState } from "@/components/ui/primitives";
export function ClientVehicles({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <div className="cards-grid">
      {vehicles.length ? (
        vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)
      ) : (
        <EmptyState title="Sin vehículos asociados" />
      )}
    </div>
  );
}
