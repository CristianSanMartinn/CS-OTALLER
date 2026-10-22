-- Production preparation only: no default, no backfill, no NOT NULL.
-- Run before the work-order code migration and the filter-code expansion.
BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.maintenance_records
  ADD COLUMN IF NOT EXISTS maintenance_type_code varchar(20) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.maintenance_records'::regclass
      AND conname = 'maintenance_records_type_code_check'
  ) THEN
    ALTER TABLE public.maintenance_records
      ADD CONSTRAINT maintenance_records_type_code_check
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

ALTER TABLE public.maintenance_records
  VALIDATE CONSTRAINT maintenance_records_type_code_check;

COMMIT;
