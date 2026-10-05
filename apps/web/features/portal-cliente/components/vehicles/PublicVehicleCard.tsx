import Link from "next/link";
import {
  CalendarDays,
  Gauge,
  Wrench,
  ChevronRight,
  CheckCircle2,
  Clock3,
  AlertCircle,
} from "lucide-react";
import { VehicleBrandLogo } from "./VehicleBrandLogo";
import {
  vehicleMaintenanceSummary,
  PublicMaintenance,
} from "../../services/vehicleMaintenanceSummary";
import { clientVehiclePath } from "../../services/clientAccessService";
import { dateLabel, km } from "@/utils/format";
interface PublicVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  maintenance?: PublicMaintenance[];
}
export function PublicVehicleCard({
  vehicle: v,
  token,
}: {
  vehicle: PublicVehicle;
  token: string;
}) {
  const summary = vehicleMaintenanceSummary(v.maintenance ?? [], v.mileage);
  const next = summary.next;
  const nextLabel = !next
    ? "Por definir"
    : next.rank === 0
      ? "Mantención vencida"
      : next.distance !== Infinity
        ? next.distance <= 0
          ? "Mantención vencida"
          : "En " + km(next.distance)
        : dateLabel(next.record.nextDate ?? "");
  const Icon =
    summary.tone === "current"
      ? CheckCircle2
      : summary.tone === "overdue"
        ? AlertCircle
        : Clock3;
  return (
    <Link
      href={clientVehiclePath(token, v.id)}
      className="public-vehicle-card"
      aria-label={
        "Ver historial de " + v.plate + " · " + v.brand + " " + v.model
      }
    >
      <div className="public-vehicle-top">
        <VehicleBrandLogo brand={v.brand} />
        <div className="public-vehicle-name">
          <h3>{v.plate}</h3>
          <strong>
            {v.brand} {v.model}
          </strong>
          <p>
            {v.year} · {km(v.mileage)}
          </p>
        </div>
        <div className="public-vehicle-right">
          <ChevronRight size={22} />
          <span className={"public-maintenance-status " + summary.tone}>
            <Icon size={15} />
            {summary.status}
          </span>
        </div>
      </div>
      <div className="public-vehicle-metrics">
        <div>
          <CalendarDays size={19} />
          <span>Última mantención</span>
          <strong>
            {summary.lastDate ? dateLabel(summary.lastDate) : "Sin registros"}
          </strong>
        </div>
        <div>
          <Gauge size={19} />
          <span>Kilometraje actual</span>
          <strong>{km(v.mileage)}</strong>
        </div>
        <div>
          <Wrench size={19} />
          <span>Próxima mantención</span>
          <strong>{nextLabel}</strong>
          {next?.record.nextDate && next.distance !== Infinity && (
            <small>{dateLabel(next.record.nextDate)}</small>
          )}
        </div>
      </div>
      <span className="public-vehicle-action">
        Ver historial y próxima mantención <ChevronRight size={17} />
      </span>
    </Link>
  );
}
