export function WorkerLastSeen({
  lastSeenAt,
  connected = false,
}: {
  lastSeenAt: string | null;
  connected?: boolean;
}) {
  if (connected)
    return <small className="worker-last-seen">En el sistema ahora</small>;
  if (!lastSeenAt)
    return (
      <small className="worker-last-seen">Sin conexiones registradas</small>
    );
  const date = new Date(lastSeenAt);
  if (!Number.isFinite(date.getTime())) return null;
  const label = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(date);
  return (
    <small className="worker-last-seen">
      Última conexión: <time dateTime={lastSeenAt}>{label}</time>
    </small>
  );
}
