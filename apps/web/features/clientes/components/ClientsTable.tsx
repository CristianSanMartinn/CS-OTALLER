import Link from "next/link";
import { Pencil, ArrowUpRight } from "lucide-react";
import { Customer } from "@/features/shared/types/domain";
import { Avatar, EmptyState } from "@/components/ui/primitives";
export function ClientsTable({
  clients,
  onEdit,
  onDelete,
}: {
  clients: Customer[];
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}) {
  if (!clients.length) return <EmptyState />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>RUT</th>
            <th>Teléfono</th>
            <th>Correo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>
                <Link className="person-inline" href={"/clientes/" + c.id}>
                  <Avatar name={c.name} />
                  <strong>{c.name}</strong>
                </Link>
              </td>
              <td>{c.rut}</td>
              <td>{c.phone}</td>
              <td>{c.email}</td>
              <td>
                <div className="row-actions">
                  <button
                    type="button"
                    className="text-button"
                    aria-label={
                      (c.active === false ? "Restaurar " : "Eliminar ") + c.name
                    }
                    onClick={() => onDelete(c)}
                  >
                    {c.active === false ? "Restaurar" : "Eliminar"}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={"Editar " + c.name}
                    disabled={c.active === false}
                    onClick={() => onEdit(c)}
                  >
                    <Pencil size={16} />
                  </button>
                  <Link
                    className="icon-button"
                    aria-label={"Ver ficha de " + c.name}
                    href={"/clientes/" + c.id}
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
