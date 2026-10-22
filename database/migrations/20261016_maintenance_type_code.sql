BEGIN;

ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS maintenance_type_code varchar(20);

-- Keep every original name and record. Existing oil details are authoritative.
WITH classified AS (
  SELECT m.id,
    CASE
      WHEN EXISTS (SELECT 1 FROM oil_change_details o WHERE o.maintenance_id=m.id AND o.workshop_id=m.workshop_id)
        OR normalized.name IN ('aceite','cambio de aceite','cambio aceite','cambio de aceite de motor','cambio de aceite y filtro','cambio aceite y filtro','cambio de aceite de motor y filtro') THEN 'OIL_CHANGE'
      WHEN normalized.name IN ('refrigerante','cambio de refrigerante') THEN 'COOLANT'
      WHEN normalized.name IN ('liquido de frenos','cambio de liquido de frenos') THEN 'BRAKE_FLUID'
      WHEN normalized.name IN ('bujias','cambio de bujias') THEN 'SPARK_PLUGS'
      WHEN normalized.name IN ('distribucion','cambio de distribucion','correa de distribucion','cambio de correa de distribucion','cadena de distribucion') THEN 'TIMING'
      WHEN normalized.name IN ('filtro de aire','cambio de filtro de aire','filtro combustible','filtro de combustible','cambio de filtro de combustible','filtro de cabina','cambio de filtro de cabina') THEN 'FILTERS'
      ELSE 'OTHER'
    END AS code
  FROM maintenance_records m
  CROSS JOIN LATERAL (SELECT trim(regexp_replace(translate(lower(m.maintenance_type),'áéíóúüñ','aeiouun'),'\s+',' ','g')) AS name) normalized
  WHERE m.maintenance_type_code IS NULL
)
UPDATE maintenance_records m SET maintenance_type_code=c.code FROM classified c WHERE m.id=c.id;

ALTER TABLE maintenance_records ALTER COLUMN maintenance_type_code SET DEFAULT 'OTHER';
ALTER TABLE maintenance_records ALTER COLUMN maintenance_type_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='maintenance_records'::regclass AND conname='maintenance_records_type_code_check') THEN
    ALTER TABLE maintenance_records ADD CONSTRAINT maintenance_records_type_code_check
      CHECK (maintenance_type_code IN ('OIL_CHANGE','COOLANT','BRAKE_FLUID','SPARK_PLUGS','TIMING','FILTERS','OTHER'));
  END IF;
END $$;

COMMIT;
