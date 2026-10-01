import { Maintenance } from "@/features/shared/types/domain";
import { CalendarClock } from "lucide-react";
import { dateLabel, km } from "@/utils/format";
export function NextMaintenanceCard({ records }: { records: Maintenance[] }) {
  const latest = [...records].sort((a, b) => b.date.localeCompare(a.date))[0];
  return latest ? (
    <div className="attention-card blue-attention">
      <CalendarClock size={25} />
      <div>
        <strong>Próxima mantención · {latest.type}</strong>
        <p>
          {km(latest.nextMileage)} o {dateLabel(latest.nextDate)}, lo que ocurra
          primero.
        </p>
      </div>
    </div>
  ) : null;
}
