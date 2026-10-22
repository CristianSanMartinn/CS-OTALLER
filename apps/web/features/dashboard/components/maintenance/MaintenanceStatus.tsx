import { todayInSantiago } from "@/utils/format";
import dashboardStyles from "../Dashboard.module.css";
import Link from "next/link";
import {  CalendarClock, CircleCheck, CircleHelp, TriangleAlert } from "lucide-react";
import { Panel } from "@/components/ui/primitives";
import { useStore } from "@/features/shared/components/store/StoreProvider";
import { dashboardMaintenanceSummary } from "../../services/maintenanceSummary";
import { StatCard } from "../stats/StatCard";

export function MaintenanceStatus() {
  const { data, user, ready } = useStore();
  if (!ready || !user) return null;
  const day = todayInSantiago();
  const counts = dashboardMaintenanceSummary(
    data.vehicles,
    data.maintenance,
    user.workshopId,
    day,
  );
  return (
    <Panel
      title="Estado de mantenciones"
      subtitle="Vehículos según su mantención más urgente por fecha o kilometraje"
      action={
        <Link href="/mantenciones" className="text-link">
          Ver mantenciones →
        </Link>
      }
    >
      <div className={dashboardStyles.statsGrid}>
        <StatCard
          label="Vencidas"
          value={counts.overdue}
          note="Vehículos con mantenciones pendientes"
          icon={TriangleAlert}
          tone="orange"
        />
        <StatCard
          label="Próximas"
          value={counts.soon}
          note="A 2.500 km o 30 días del próximo servicio"
          icon={CalendarClock}
          tone="purple"
        />
        <StatCard
          label="Al día"
          value={counts.current}
          note="Con próximos servicios programados"
          icon={CircleCheck}
          tone="green"
        />
        <StatCard
          label="Sin programación"
          value={counts.unscheduled + counts.withoutHistory}
          note={`${counts.withoutHistory} sin historial · ${counts.unscheduled} sin próximo servicio`}
          icon={CircleHelp}
        />
      </div>
      <p className={dashboardStyles.panelFoot}>
        Cada vehículo se cuenta una sola vez.{" "}
        {user.role === "WORKER"
          ? "Se muestran solo los vehículos de tus órdenes asignadas o compartidas."
          : "Se muestran los vehículos de tu taller."}
      </p>
    </Panel>
  );
}
