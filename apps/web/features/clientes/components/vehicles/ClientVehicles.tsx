import styles from "./ClientVehicles.module.css";
import { Vehicle } from "@/features/shared/types/domain";
import { VehicleCard } from "@/features/vehiculos/components/details/VehicleCard";
import { EmptyState } from "@/components/ui/primitives";
export function ClientVehicles({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <div className={styles.cardsGrid}>
      {vehicles.length ? (
        vehicles.map((v) => <VehicleCard key={v.id} vehicle={v} />)
      ) : (
        <EmptyState title="Sin vehículos asociados" />
      )}
    </div>
  );
}
