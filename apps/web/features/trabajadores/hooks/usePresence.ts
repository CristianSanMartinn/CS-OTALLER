"use client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePresenceSnapshot } from "../components/PresenceProvider";
import type { User } from "@/features/shared/types/domain";
import type { WorkerPresence } from "../types/worker.types";
export function usePresence() {
  const { records, available } = usePresenceSnapshot();
  const { live } = useAuth();
  function forWorker(worker: User): WorkerPresence {
    const record = records.find(
      (item) =>
        item.userId === worker.id && item.workshopId === worker.workshopId,
    );
    return {
      userId: worker.id,
      workshopId: worker.workshopId,
      status: !worker.active
        ? "DISABLED"
        : !available
          ? "UNKNOWN"
          : (record?.status ?? (live ? "UNKNOWN" : "OFFLINE")),
      lastSeenAt: record?.lastSeenAt ?? null,
    };
  }
  return { forWorker, available };
}
