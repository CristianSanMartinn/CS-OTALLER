export type WorkerPresenceStatus =
  "ONLINE" | "OFFLINE" | "DISABLED" | "UNKNOWN";
export interface WorkerPresence {
  userId: string;
  workshopId: string;
  status: WorkerPresenceStatus;
  lastSeenAt: string | null;
}
