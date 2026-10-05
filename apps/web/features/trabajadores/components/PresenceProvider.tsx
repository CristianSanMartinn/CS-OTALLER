"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  registerPresenceDeparture,
  workersService,
} from "../services/workers.service";
import type { WorkerPresence } from "../types/worker.types";

type Snapshot = {
  records: WorkerPresence[];
  available: boolean;
  owner: string;
};
const PresenceContext = createContext<Snapshot>({
  records: [],
  available: false,
  owner: "",
});
export function usePresenceSnapshot() {
  return useContext(PresenceContext);
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user, live, ready } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot>({
    records: [],
    available: false,
    owner: "",
  });
  const userId = user?.id,
    workshopId = user?.workshopId;
  useEffect(() => {
    if (!ready || !userId || !workshopId) return;
    const sessionId = crypto.randomUUID();
    let stopped = false,
      busy = false;
    const controller = new AbortController();
    const owner = workshopId + ":" + userId;
    async function heartbeat() {
      if (stopped || busy || !navigator.onLine) return;
      busy = true;
      try {
        const records = live
          ? await workersService.heartbeat(sessionId, controller.signal)
          : [
              {
                userId: userId!,
                workshopId: workshopId!,
                status: "ONLINE" as const,
                lastSeenAt: new Date().toISOString(),
              },
            ];
        if (!stopped) setSnapshot({ records, available: true, owner });
      } catch {
        if (!stopped)
          setSnapshot((previous) => ({ ...previous, available: false, owner }));
      } finally {
        busy = false;
      }
    }
    async function depart() {
      stopped = true;
      controller.abort();
      if (live)
        await workersService.disconnect(sessionId).catch(() => undefined);
    }
    const unregister = registerPresenceDeparture(depart);
    const reconnect = () => {
      void heartbeat();
    };
    const offline = () =>
      setSnapshot((previous) => ({ ...previous, available: false, owner }));
    const visibility = () => {
      if (document.visibilityState === "visible") reconnect();
    };
    const pageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) void depart();
    };
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", offline);
    window.addEventListener("pagehide", pageHide);
    document.addEventListener("visibilitychange", visibility);
    void heartbeat();
    const timer = setInterval(reconnect, 30000);
    return () => {
      clearInterval(timer);
      unregister();
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", offline);
      window.removeEventListener("pagehide", pageHide);
      document.removeEventListener("visibilitychange", visibility);
      void depart();
    };
  }, [userId, workshopId, live, ready]);
  const current = snapshot.owner === workshopId + ":" + userId;
  return (
    <PresenceContext
      value={current ? snapshot : { records: [], available: false, owner: "" }}
    >
      {children}
    </PresenceContext>
  );
}
