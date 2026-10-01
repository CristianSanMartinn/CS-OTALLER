import { Maintenance } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { dateLabel, km } from "@/utils/format";
import { EmptyState } from "@/components/ui/primitives";
export function MaintenanceTable({
  records,
  onOpen,
}: {
  records: Maintenance[];
  onOpen: (m: Maintenance) => void;
}) {
  const { data } = useStore();
  if (!records.length) return <EmptyState />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Vehículo</th>
            <th>Mantención</th>
            <th>Fecha</th>
            <th>Kilometraje</th>
            <th>Próxima mantención</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {records.map((m) => (
            <tr key={m.id}>
              <td>
                <span className="plate">
                  {data.vehicles.find((v) => v.id === m.vehicleId)?.plate}
                </span>
              </td>
              <td>
                <strong>{m.type}</strong>
                <small>
                  {m.viscosity} {m.brand}
                </small>
              </td>
              <td>{dateLabel(m.date)}</td>
              <td>{km(m.mileage)}</td>
              <td>
                {km(m.nextMileage)}
                <small>{dateLabel(m.nextDate)}</small>
              </td>
              <td>
                <button className="text-button" onClick={() => onOpen(m)}>
                  Ver detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
