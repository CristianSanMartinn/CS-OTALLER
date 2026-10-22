-- Expand accepted codes only. Do not reclassify historical records.
BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.maintenance_records
  DROP CONSTRAINT IF EXISTS maintenance_records_type_code_check,
  ADD CONSTRAINT maintenance_records_type_code_check
  CHECK (maintenance_type_code IN (
    'OIL_CHANGE', 'COOLANT', 'BRAKE_FLUID', 'SPARK_PLUGS', 'TIMING',
    'FILTERS', 'OTHER', 'AIR_FILTER', 'CABIN_FILTER', 'FUEL_FILTER'
  )) NOT VALID;

ALTER TABLE public.work_order_services
  DROP CONSTRAINT IF EXISTS work_order_services_maintenance_type_code_check,
  ADD CONSTRAINT work_order_services_maintenance_type_code_check
  CHECK (maintenance_type_code IS NULL OR maintenance_type_code IN (
    'OIL_CHANGE', 'COOLANT', 'BRAKE_FLUID', 'SPARK_PLUGS', 'TIMING',
    'FILTERS', 'OTHER', 'AIR_FILTER', 'CABIN_FILTER', 'FUEL_FILTER'
  )) NOT VALID;

COMMIT;

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.maintenance_records
  VALIDATE CONSTRAINT maintenance_records_type_code_check;

ALTER TABLE public.work_order_services
  VALIDATE CONSTRAINT work_order_services_maintenance_type_code_check;

COMMIT;
