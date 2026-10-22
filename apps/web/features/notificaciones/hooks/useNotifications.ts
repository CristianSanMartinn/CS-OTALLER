"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { apiRequest } from "@/lib/http";
import { NotificationInbox } from "../types/notification.types";
export function useNotifications() {
  const { user, live, data } = useAuth();
  const key = user?.id ?? "";
  const [snapshot, setSnapshot] = useState<{
    key: string;
    inbox: NotificationInbox;
  }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!key || !live) return;
      try {
        const inbox = await apiRequest<NotificationInbox>(
          "notifications",
          "GET",
          undefined,
          { signal },
        );
        if (!signal?.aborted) {
          setSnapshot({ key, inbox });
          setError("");
        }
      } catch {
        if (!signal?.aborted) setError("No se pudieron actualizar los avisos.");
      }
    },
    [key, live],
  );
  useEffect(() => {
    const abort = new AbortController();
    const initial = setTimeout(() => void refresh(abort.signal), 0);
    const update = () => {
      if (document.visibilityState === "visible") void refresh(abort.signal);
    };
    const timer = setInterval(update, 30000);
    document.addEventListener("visibilitychange", update);
    return () => {
      abort.abort();
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, [
    refresh,
    data.customers.length,
    data.vehicles.length,
    data.orders.length,
    data.maintenance.length,
  ]);
  async function read(id?: string) {
    setBusy(true);
    try {
      await apiRequest(
        id ? "notifications/" + id + "/read" : "notifications/read-all",
        "POST",
        {},
      );
      await refresh();
    } catch {
      setError("No se pudo marcar el aviso como leído.");
    } finally {
      setBusy(false);
    }
  }
  const inbox =
    snapshot?.key === key ? snapshot.inbox : { items: [], unread: 0 };
  return { ...inbox, error, busy, refresh, read, live };
}
