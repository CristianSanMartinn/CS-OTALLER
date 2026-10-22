import type { customerVehicle } from "../services/customerPortalService";
export type PortalView = NonNullable<ReturnType<typeof customerVehicle>>;
export type PortalWorkshop = PortalView["workshop"] & { logo?: string };
export type PortalOrder = PortalView["orders"][number];
export type PortalPhoto = PortalView["photos"][number];
export type PortalTab = "summary" | "history" | "photos";
