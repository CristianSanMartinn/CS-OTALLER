import { Panel, EmptyState } from "@/components/ui/primitives";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Check } from "lucide-react";
export function RecentActivity() {
  const { data } = useStore();
  return (
    <Panel title="Actividad reciente" subtitle="Últimos movimientos del taller">
      <div className="activity-list">
        {data.activity.length ? (
          data.activity.slice(0, 4).map((a) => (
            <div key={a.id}>
              <span className="activity-icon">
                <Check size={15} />
              </span>
              <div>
                <strong>{a.text}</strong>
                <small>
                  {new Date(a.date).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  ·{" "}
                  {data.users.find((u) => u.id === a.userId)?.name ??
                    "Equipo del taller"}
                </small>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="Sin actividad todavía" />
        )}
      </div>
    </Panel>
  );
}
