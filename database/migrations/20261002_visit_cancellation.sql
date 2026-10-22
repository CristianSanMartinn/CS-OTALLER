BEGIN;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS cancellation jsonb;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation jsonb;
COMMIT;
