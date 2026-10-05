import { useMemo } from "react";
import { vehicleMaintenanceSummary } from "../services/vehicleMaintenanceSummary";
import type { PortalView } from "../types/portal.types";
export function useMaintenanceDetail(view: PortalView) {
  return useMemo(() => {
    const records = [...view.maintenance].sort(
      (a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage,
    );
    return {
      records,
      last: records[0],
      summary: vehicleMaintenanceSummary(records, view.vehicle.mileage),
    };
  }, [view]);
}
