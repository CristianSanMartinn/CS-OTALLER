"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Customer } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { PageHeading, Panel } from "@/components/ui/primitives";
import { Modal } from "@/components/Modal/Modal";
import { ClientSearch } from "./ClientSearch";
import { ClientFilters } from "./ClientFilters";
import { ClientsTable } from "./ClientsTable";
import { ClientForm } from "./ClientForm";
export function ClientsPage() {
  const { data, update, notify, user } = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Customer | undefined>();
  const [open, setOpen] = useState(false);
  if (user?.role !== "ADMIN") return null;
  const rows = data.customers.filter(
    (c) =>
      (c.name + c.rut + c.email).toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "vehicles") ===
          data.vehicles.some((v) => v.customerId === c.id)),
  );
  return (
    <>
      <PageHeading
        title="Clientes"
        description="Toda la información de tus clientes, en un solo lugar."
        action={
          <button
            className="button primary"
            onClick={() => {
              setEditing(undefined);
              setOpen(true);
            }}
          >
            <Plus size={18} />
            Nuevo cliente
          </button>
        }
      />
      <Panel>
        <div className="toolbar">
          <ClientSearch value={query} onChange={setQuery} />
          <ClientFilters value={filter} onChange={setFilter} />
          <span className="muted">{rows.length} clientes</span>
        </div>
        <ClientsTable
          clients={rows}
          onEdit={(c) => {
            setEditing(c);
            setOpen(true);
          }}
        />
      </Panel>
      {open && (
        <Modal
          title={editing ? "Editar cliente" : "Nuevo cliente"}
          onClose={() => setOpen(false)}
        >
          <ClientForm
            client={editing}
            onCancel={() => setOpen(false)}
            onSave={(c) => {
              update((d) => ({
                ...d,
                customers: editing
                  ? d.customers.map((x) => (x.id === c.id ? c : x))
                  : [c, ...d.customers],
              }));
              notify("Cliente guardado correctamente");
              setOpen(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
