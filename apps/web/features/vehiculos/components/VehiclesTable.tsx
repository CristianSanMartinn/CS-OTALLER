import Link from "next/link";
import { Pencil, ArrowUpRight } from "lucide-react";
import { Vehicle } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { km } from "@/utils/format";
import { EmptyState } from "@/components/ui/primitives";
export function VehiclesTable({
  vehicles,
  onEdit,
}: {
  vehicles: Vehicle[];
  onEdit?: (v: Vehicle) => void;
}) {
  const { data } = useStore();
  if (!vehicles.length) return <EmptyState />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Patente</th>
            <th>Vehículo</th>
            <th>Año</th>
            <th>Propietario</th>
            <th>Kilometraje</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id}>
              <td>
                <Link className="plate" href={"/vehiculos/" + v.id}>
                  {v.plate}
                </Link>
              </td>
              <td>
                <strong>
                  {v.brand} {v.model}
                </strong>
                <small>{v.version}</small>
              </td>
              <td>{v.year}</td>
              <td>{data.customers.find((c) => c.id === v.customerId)?.name}</td>
              <td>{km(v.mileage)}</td>
              <td>
                <div className="row-actions">
                  {onEdit && (
                    <button
                      className="icon-button"
                      aria-label={"Editar " + v.plate}
                      onClick={() => onEdit(v)}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  <Link
                    className="icon-button"
                    aria-label={"Ficha " + v.plate}
                    href={"/vehiculos/" + v.id}
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
