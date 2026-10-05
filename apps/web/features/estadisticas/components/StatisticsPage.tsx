"use client";
import { useStore } from "@/features/shared/components/StoreProvider";
import { PageHeading, Panel } from "@/components/ui/primitives";
import { statusLabels } from "@/features/ordenes/types/order.constants";
export function StatisticsPage() {
  const { data, user } = useStore();
  if (user?.role !== "ADMIN") return null;
  return (
    <>
      <PageHeading
        title="Estadísticas"
        description="Resumen operativo de las órdenes registradas en tu taller."
      />
      <Panel
        title="Distribución por estado"
        subtitle="Conteo actual de órdenes del taller"
      >
        <div className="bar-chart">
          {Object.entries(statusLabels).map(([status, label]) => {
            const count = data.orders.filter((o) => o.status === status).length;
            return (
              <div key={status}>
                <span>{label}</span>
                <div className="bar-track">
                  <div
                    style={{
                      width:
                        (data.orders.length
                          ? (count / data.orders.length) * 100
                          : 0) + "%",
                    }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            );
          })}
        </div>
      </Panel>
      <p className="help-text">
        Las estadísticas avanzadas se incorporarán en una etapa posterior.
      </p>
    </>
  );
}
