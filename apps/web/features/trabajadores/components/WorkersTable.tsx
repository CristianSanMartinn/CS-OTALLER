import { User } from "@/features/shared/types/domain";
import { Avatar, EmptyState } from "@/components/ui/primitives";
import { WorkerStatus } from "./WorkerStatus";
export function WorkersTable({
  workers,
  onEdit,
  onToggle,
  onView,
  currentId,
}: {
  workers: User[];
  onEdit: (u: User) => void;
  onToggle: (u: User) => void;
  onView: (u: User) => void;
  currentId: string;
}) {
  if (!workers.length) return <EmptyState />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Trabajador</th>
            <th>Especialidad</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {workers.map((u) => (
            <tr key={u.id}>
              <td>
                <button
                  className="person-inline text-button"
                  onClick={() => onView(u)}
                >
                  <Avatar name={u.name} src={u.avatarUrl} />
                  <span>
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </span>
                </button>
              </td>
              <td>{u.specialty}</td>
              <td>{u.role === "ADMIN" ? "Administrador" : "Mecánico"}</td>
              <td>
                <WorkerStatus active={u.active} />
              </td>
              <td>
                <div className="row-actions">
                  <button className="text-button" onClick={() => onEdit(u)}>
                    Editar
                  </button>
                  {u.id !== currentId && (
                    <button
                      className={"text-button " + (u.active ? "danger" : "")}
                      onClick={() => onToggle(u)}
                    >
                      {u.active ? "Desactivar" : "Reactivar"}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
