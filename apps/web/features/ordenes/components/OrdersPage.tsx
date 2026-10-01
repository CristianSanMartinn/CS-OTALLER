"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { useStore } from "@/features/shared/components/StoreProvider";
import { PageHeading, Panel, SearchBox } from "@/components/ui/primitives";
import { WorkOrdersTable } from "./WorkOrdersTable";
import { statusLabels } from "../types/order.constants";
export function OrdersPage({
  initialStatus = "ALL",
}: {
  initialStatus?: string;
}) {
  const { data, user } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(
    initialStatus in statusLabels ? initialStatus : "ALL",
  );
  const rows = data.orders.filter(
    (o) =>
      (status === "ALL" || o.status === status) &&
      (
        o.number +
        o.reason +
        data.vehicles.find((v) => v.id === o.vehicleId)?.plate +
        data.customers.find((c) => c.id === o.customerId)?.name
      )
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title={
          user?.role === "ADMIN"
            ? "Órdenes de trabajo"
            : "Mis órdenes de trabajo"
        }
        description="Del ingreso a la entrega. Cada detalle del trabajo, registrado."
        action={
          <Link className="button primary" href="/ordenes/nueva">
            <Plus size={18} />
            Nueva orden
          </Link>
        }
      />
      <div className="order-overview">
        <ClipboardList size={24} />
        <div>
          <strong>{data.orders.length} órdenes registradas</strong>
          <p>
            {
              data.orders.filter(
                (o) => !["DELIVERED", "CANCELLED"].includes(o.status),
              ).length
            }{" "}
            activas · {data.orders.filter((o) => o.status === "READY").length}{" "}
            listas para entregar
          </p>
        </div>
      </div>
      <Panel>
        <div className="toolbar">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Buscar orden, patente o cliente..."
          />
          <select
            aria-label="Estado de la orden"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">Todos los estados</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <span className="muted">{rows.length} resultados</span>
        </div>
        <WorkOrdersTable orders={rows} />
      </Panel>
    </>
  );
}
