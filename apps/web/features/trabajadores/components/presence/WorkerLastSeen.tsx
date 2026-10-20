import styles from "./WorkerLastSeen.module.css";
export function WorkerLastSeen({
  lastSeenAt,
  connected = false,
}: {
  lastSeenAt: string | null;
  connected?: boolean;
}) {
  if (connected)
    return <small className={styles.lastSeen}>En el sistema ahora</small>;
  if (!lastSeenAt)
    return (
      <small className={styles.lastSeen}>Sin conexiones registradas</small>
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
    <small className={styles.lastSeen}>
      Última conexión: <time dateTime={lastSeenAt}>{label}</time>
    </small>
  );
}
