"use client";
import { useStore } from "@/features/shared/components/StoreProvider";
import { usePresence } from "./usePresence";
export function useWorkers(query: string) {
  const { data } = useStore();
  const { forWorker, available } = usePresence();
  const workers = data.users.filter((worker) =>
    (worker.name + worker.email + worker.specialty)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return {
    workers,
    online: data.users.filter((worker) => forWorker(worker).status === "ONLINE")
      .length,
    available,
  };
}
