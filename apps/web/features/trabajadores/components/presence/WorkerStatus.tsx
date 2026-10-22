export function WorkerStatus({ active }: { active: boolean }) {
  return (
    <span className={"badge " + (active ? "ready" : "cancelled")}>
      <i />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}
