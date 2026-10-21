BEGIN;

SET LOCAL lock_timeout = '5s';

-- NULL preserves unclassified historical services and old-client compatibility.
ALTER TABLE public.work_order_services
  ADD COLUMN IF NOT EXISTS maintenance_type_code varchar(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.work_order_services'::regclass
      AND conname = 'work_order_services_maintenance_type_code_check'
  ) THEN
    ALTER TABLE public.work_order_services
      ADD CONSTRAINT work_order_services_maintenance_type_code_check
      CHECK (
        maintenance_type_code IS NULL OR maintenance_type_code IN (
          'OIL_CHANGE', 'COOLANT', 'BRAKE_FLUID',
          'SPARK_PLUGS', 'TIMING', 'FILTERS', 'OTHER'
        )
      ) NOT VALID;
  END IF;
END $$;

COMMIT;

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.work_order_services
  VALIDATE CONSTRAINT work_order_services_maintenance_type_code_check;

COMMIT;
