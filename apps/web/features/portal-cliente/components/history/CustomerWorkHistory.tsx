import type { PortalOrder } from "../../types/portal.types";
import { PortalSection } from "../layout/PortalSection";
import { WorkHistoryItem } from "./WorkHistoryItem";
export function CustomerWorkHistory({ orders }: { orders: PortalOrder[] }) {
  return (
    <PortalSection title="Trabajos realizados">
      {orders.length ? (
        [...orders]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((o) => <WorkHistoryItem key={o.id} order={o} />)
      ) : (
        <p className="portal-muted">Todavía no hay órdenes registradas.</p>
      )}
    </PortalSection>
  );
}
