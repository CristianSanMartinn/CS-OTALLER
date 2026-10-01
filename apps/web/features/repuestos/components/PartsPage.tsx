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
export function PartsPage() {
  const { data, user } = useStore();
  const [q, setQ] = useState("");
  if (user?.role !== "ADMIN") return null;
  const rows = data.orders
    .flatMap((o) =>
      o.parts.map((p) => ({ ...p, orderId: o.id, number: o.number })),
    )
    .filter((p) =>
      (p.name + p.brand + p.partNumber).toLowerCase().includes(q.toLowerCase()),
    );
  return (
    <>
      <PageHeading
        title="Repuestos"
        description="Piezas utilizadas en las órdenes de trabajo. La gestión de inventario se incorporará posteriormente."
      />
      <Panel>
        <div className="toolbar">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Buscar repuesto, marca o número de parte..."
          />
        </div>
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Repuesto</th>
                  <th>Marca / referencia</th>
                  <th>Orden</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.orderId + p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <small>{p.notes}</small>
                    </td>
                    <td>
                      {p.brand}
                      <small>{p.partNumber}</small>
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={"/ordenes/" + p.orderId}
                      >
                        {p.number}
                      </Link>
                    </td>
                    <td>{p.quantity}</td>
                    <td>{money(p.price)}</td>
                    <td>{money(p.price * p.quantity)}</td>
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
