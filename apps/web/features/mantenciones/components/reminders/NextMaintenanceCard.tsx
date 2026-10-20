import { Maintenance } from "@/features/shared/types/domain";
import { summarizeMaintenance } from "@/features/shared/services/maintenanceRules";
import { CalendarClock } from "lucide-react";
import { dateLabel, km, today } from "@/utils/format";

export function NextMaintenanceCard({
  records,
  mileage,
}: {
  records: Maintenance[];
  mileage: number;
}) {
  const summary = summarizeMaintenance(records, mileage, today());
  const next = summary.next?.record;
  if (!next) return null;
  const interval = [
    next.nextMileage ? km(next.nextMileage) : "",
    next.nextDate ? dateLabel(next.nextDate) : "",
  ]
    .filter(Boolean)
    .join(" o ");
  return (
    <div className="attention-card blue-attention">
      <CalendarClock size={25} />
      <div>
        <strong>Próxima mantención · {next.type}</strong>
        <p>{interval}, lo que ocurra primero.</p>
        <small>{summary.status}</small>
      </div>
    </div>
  );
}
