"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { User } from "@/features/shared/types/domain";
import { useStore } from "@/features/shared/components/StoreProvider";
import { Panel, PageHeading, SearchBox } from "@/components/ui/primitives";
import { Modal } from "@/components/Modal/Modal";
import { WorkersTable } from "./WorkersTable";
import { WorkerForm } from "./WorkerForm";
import { WorkerDetails } from "./WorkerDetails";
export function WorkersPage() {
  const { data, user, update, notify } = useStore();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<User>();
  const [detail, setDetail] = useState<User>();
  const [toggle, setToggle] = useState<User>();
  if (user?.role !== "ADMIN") return null;
  return (
    <>
      <PageHeading
        title="Trabajadores"
        description="Administra tu equipo, sus especialidades y accesos al taller."
        action={
          <Link href="/trabajadores/nuevo" className="button primary">
            <Plus size={18} />
            Nuevo trabajador
          </Link>
        }
      />
      <Panel>
        <div className="toolbar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Buscar nombre, correo o especialidad..."
          />
          <span className="muted">
            {data.users.filter((u) => u.active).length} activos
          </span>
        </div>
        <WorkersTable
          workers={data.users.filter((u) =>
            (u.name + u.email + u.specialty)
              .toLowerCase()
              .includes(query.toLowerCase()),
          )}
          currentId={user.id}
          onEdit={setEditing}
          onView={setDetail}
          onToggle={setToggle}
        />
      </Panel>
      {editing && (
        <Modal title="Editar trabajador" onClose={() => setEditing(undefined)}>
          <WorkerForm
            worker={editing}
            onCancel={() => setEditing(undefined)}
            onSave={(u) => {
              update((d) => ({
                ...d,
                users: d.users.map((x) => (x.id === u.id ? u : x)),
              }));
              setEditing(undefined);
              notify("Trabajador actualizado");
            }}
          />
        </Modal>
      )}
      {detail && (
        <Modal
          title="Ficha del trabajador"
          onClose={() => setDetail(undefined)}
        >
          <WorkerDetails worker={detail} />
        </Modal>
      )}
      {toggle && (
        <Modal
          title={
            toggle.active ? "Desactivar trabajador" : "Reactivar trabajador"
          }
          onClose={() => setToggle(undefined)}
        >
          <div className="panel-padding">
            <p>
              {toggle.name}{" "}
              {toggle.active
                ? "no podrá iniciar sesión. Sus trabajos registrados se conservarán."
                : "recuperará el acceso al taller."}
            </p>
          </div>
          <div className="form-actions">
            <button className="button" onClick={() => setToggle(undefined)}>
              Cancelar
            </button>
            <button
              className="button primary"
              onClick={() => {
                update((d) => ({
                  ...d,
                  users: d.users.map((u) =>
                    u.id === toggle.id ? { ...u, active: !u.active } : u,
                  ),
                }));
                notify(
                  toggle.active
                    ? "Trabajador desactivado"
                    : "Trabajador reactivado",
                );
                setToggle(undefined);
              }}
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
