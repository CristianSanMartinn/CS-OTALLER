"use client";
import { useStore } from "@/features/shared/components/StoreProvider";
import { usePublicPortal } from "./usePublicPortal";
import { clientVehicle, clientAccess } from "../services/clientAccessService";
import { customerVehicle } from "../services/customerPortalService";
import type { PortalView } from "../types/portal.types";
export function useVehicleDetail(token: string, vehicleId?: string) {
  const { data, live } = useStore();
  const remote = usePublicPortal<PortalView>(
    "portal/" +
      encodeURIComponent(token) +
      "/vehicles/" +
      encodeURIComponent(vehicleId ?? ""),
    live && !!vehicleId,
  );
  const listing = usePublicPortal<NonNullable<ReturnType<typeof clientAccess>>>(
    "portal/" + encodeURIComponent(token),
    live && !!vehicleId,
  );
  const view = live
    ? remote.data
    : vehicleId
      ? clientVehicle(data, token, vehicleId)
      : customerVehicle(data, token);
  return {
    view,
    live,
    loading: live && !!vehicleId && !view && !remote.error,
    error: remote.error,
    vehicles: (live ? listing.data : clientAccess(data, token))?.vehicles ?? [],
  };
}
