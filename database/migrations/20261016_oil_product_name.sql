BEGIN;
ALTER TABLE oil_change_details ADD COLUMN IF NOT EXISTS product_name varchar(150) NOT NULL DEFAULT '';
COMMIT;
