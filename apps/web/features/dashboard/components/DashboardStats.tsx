import {
  CarFront,
  ClipboardList,
  CircleCheck,
  Clock3,
  Package,
  Users,
  CalendarDays,
  Wrench,
} from "lucide-react";
import { useStore } from "@/features/shared/components/StoreProvider";
import { today } from "@/utils/format";
import { StatCard } from "./StatCard";
export function DashboardStats() {
  const { data, user } = useStore();
  const admin = user?.role === "ADMIN";
  const active = data.orders.filter(
    (o) => !["DELIVERED", "CANCELLED"].includes(o.status),
  );
  return (
    <>
      <div className="stats-grid">
        <StatCard
          label={
            admin ? "Vehículos en reparación" : "Mis vehículos en reparación"
          }
          value={data.orders.filter((o) => o.status === "IN_REPAIR").length}
          note="Trabajos en curso"
          icon={CarFront}
        />
        <StatCard
          label={admin ? "Trabajos de hoy" : "Mis trabajos de hoy"}
          value={data.orders.filter((o) => o.date === today()).length}
          note="Ingresados durante la jornada"
          icon={ClipboardList}
          tone="purple"
        />
        <StatCard
          label="Listos para entregar"
          value={data.orders.filter((o) => o.status === "READY").length}
          note="Reparación completada"
          icon={CircleCheck}
          tone="green"
        />
        <StatCard
          label="Trabajos pendientes"
          value={
            active.filter(
              (o) => o.status !== "READY" && o.status !== "IN_REPAIR",
            ).length
          }
          note="Pendientes de completar"
          icon={Clock3}
          tone="orange"
        />
      </div>
      <div className="quick-stats">
        <div>
          <Package size={18} />
          <span>Esperando repuestos</span>
          <b>
            {data.orders.filter((o) => o.status === "WAITING_PARTS").length}
          </b>
        </div>
        <div>
          <CalendarDays size={18} />
          <span>Próximas citas</span>
          <b>
            {
              data.appointments.filter(
                (a) =>
                  a.date >= today() &&
                  !["Cancelada", "Finalizada"].includes(a.status),
              ).length
            }
          </b>
        </div>
        <div>
          {admin ? <Users size={18} /> : <Wrench size={18} />}
          <span>{admin ? "Clientes registrados" : "Órdenes asignadas"}</span>
          <b>
            {admin
              ? data.customers.filter((c) => c.active !== false).length
              : data.orders.length}
          </b>
        </div>
        <div>
          <CarFront size={18} />
          <span>{admin ? "Vehículos registrados" : "Vehículos asignados"}</span>
          <b>{data.vehicles.length}</b>
        </div>
      </div>
    </>
  );
}
