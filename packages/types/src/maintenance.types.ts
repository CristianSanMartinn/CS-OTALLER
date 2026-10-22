export type MaintenanceTypeCode =
  | "OIL_CHANGE"
  | "COOLANT"
  | "BRAKE_FLUID"
  | "SPARK_PLUGS"
  | "TIMING"
  | "AIR_FILTER"
  | "CABIN_FILTER"
  | "FUEL_FILTER"
  | "FILTERS"
  | "OTHER";

export interface MaintenanceThresholds {
  nearMileage: number;
  nearDays: number;
}

export interface MaintenanceClassification {
  /** Optional while older API responses and mock records remain supported. */
  maintenanceTypeCode?: MaintenanceTypeCode;
  /** Free text shown to the customer; never used instead of an explicit code. */
  type: string;
}
