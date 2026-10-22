ALTER TABLE work_order_services ADD COLUMN IF NOT EXISTS intervention_type varchar(20) CHECK(intervention_type IN ('MAINTENANCE','REPAIR'));
ALTER TABLE work_order_services ADD COLUMN IF NOT EXISTS intervention_reason varchar(20) CHECK(intervention_reason IN ('SCHEDULED','WEAR','FAULT','OTHER'));
ALTER TABLE work_order_services ADD COLUMN IF NOT EXISTS work_details jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(work_details)='array');
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS intervention_type varchar(20) CHECK(intervention_type IN ('MAINTENANCE','REPAIR'));
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS intervention_reason varchar(20) CHECK(intervention_reason IN ('SCHEDULED','WEAR','FAULT','OTHER'));
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS work_details jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(work_details)='array');
ALTER TABLE maintenance_records ALTER COLUMN next_mileage DROP NOT NULL;
ALTER TABLE maintenance_records ALTER COLUMN next_date DROP NOT NULL;
