ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS assignment_type varchar(20) NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE work_orders ALTER COLUMN mechanic_id DROP NOT NULL;
ALTER TABLE work_order_services ALTER COLUMN mechanic_id DROP NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='work_orders_assignment_type_check' AND conrelid='work_orders'::regclass) THEN
    ALTER TABLE work_orders ADD CONSTRAINT work_orders_assignment_type_check
      CHECK (assignment_type IN ('INDIVIDUAL','TEAM') AND (assignment_type <> 'TEAM' OR mechanic_id IS NULL));
  END IF;
END $$;
