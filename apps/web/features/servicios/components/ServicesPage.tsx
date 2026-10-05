"use client";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/features/shared/components/StoreProvider";
import {
  PageHeading,
  Panel,
  SearchBox,
  EmptyState,
} from "@/components/ui/primitives";
import { money } from "@/utils/format";
export function ServicesPage() {
  const { data, user } = useStore();
  const [q, setQ] = useState("");
  if (user?.role !== "ADMIN") return null;
  const rows = data.orders
    .flatMap((o) =>
      o.services.map((s) => ({ ...s, orderId: o.id, number: o.number })),
    )
    .filter((s) =>
      (s.name + s.description).toLowerCase().includes(q.toLowerCase()),
    );
  return (
    <>
      <PageHeading
        title="Servicios"
        description="Trabajos registrados en las órdenes del taller. Agrega y edita servicios desde cada orden."
        action={
          <Link href="/ordenes/nueva" className="button primary">
            Registrar servicio en una orden
          </Link>
        }
      />
      <Panel>
        <div className="toolbar">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Buscar servicio..."
          />
        </div>
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Orden</th>
                  <th>Mecánico</th>
                  <th>Estado</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.orderId + s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      <small>{s.description}</small>
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={"/ordenes/" + s.orderId}
                      >
                        {s.number}
                      </Link>
                    </td>
                    <td>
                      {data.users.find((u) => u.id === s.mechanicId)?.name}
                    </td>
                    <td>{s.status}</td>
                    <td>{money(s.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
      </Panel>
    </>
  );
}
