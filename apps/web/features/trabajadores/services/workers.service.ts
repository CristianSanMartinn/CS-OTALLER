import { apiRequest } from "@/lib/http";
import type { WorkerPresence } from "../types/worker.types";

let leave: (() => Promise<void>) | undefined;
export function registerPresenceDeparture(callback: () => Promise<void>) {
  leave = callback;
  return () => {
    if (leave === callback) leave = undefined;
  };
}
export async function disconnectCurrentPresence() {
  await leave?.();
}
export const workersService = {
  heartbeat(sessionId: string, signal: AbortSignal) {
    return apiRequest<WorkerPresence[]>(
      "presence/heartbeat",
      "POST",
      { sessionId },
      { signal },
    );
  },
  disconnect(sessionId: string) {
    return apiRequest(
      "presence/disconnect",
      "POST",
      { sessionId },
      { keepalive: true },
    );
  },
};
