ALTER TABLE users ADD COLUMN IF NOT EXISTS theme varchar(10) NOT NULL DEFAULT 'light' CHECK(theme IN ('light','dark'));
CREATE TABLE IF NOT EXISTS user_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind varchar(30) NOT NULL,
 entity_id uuid NOT NULL, title text NOT NULL, message text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz,
 UNIQUE(user_id,kind,entity_id)
);
CREATE INDEX IF NOT EXISTS user_notifications_inbox ON user_notifications(workshop_id,user_id,created_at DESC);
CREATE OR REPLACE FUNCTION notify_workshop_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE event_kind text; event_title text; event_message text; vehicle uuid; order_mechanic uuid; team boolean;
BEGIN
 IF TG_TABLE_NAME='customers' THEN
  event_kind:='customer';event_title:='Nuevo cliente';event_message:='Se agregó un nuevo cliente al taller.';
 ELSIF TG_TABLE_NAME='vehicles' THEN
  event_kind:='vehicle';event_title:='Nuevo vehículo';event_message:='Se registró un nuevo vehículo en el taller.';
 ELSIF TG_TABLE_NAME='work_orders' THEN
  event_kind:='order';event_title:='Vehículo ingresado al taller';event_message:='Se creó una nueva orden de trabajo para mantenimiento o reparación.';
  order_mechanic:=NEW.mechanic_id;team:=NEW.assignment_type='TEAM';
 ELSE
  event_kind:='maintenance';event_title:='Mantención registrada';event_message:='Se agregó una nueva mantención al historial de un vehículo.';vehicle:=NEW.vehicle_id;
 END IF;
 INSERT INTO user_notifications(workshop_id,user_id,kind,entity_id,title,message)
 SELECT NEW.workshop_id,u.id,event_kind,NEW.id,event_title,event_message FROM users u
 WHERE u.workshop_id=NEW.workshop_id AND u.active AND (
  u.role='ADMIN' OR event_kind IN ('customer','vehicle') OR
  (event_kind='order' AND (team OR u.id=order_mechanic)) OR
  (event_kind='maintenance' AND EXISTS(SELECT 1 FROM work_orders w WHERE w.workshop_id=NEW.workshop_id AND w.vehicle_id=vehicle AND (w.assignment_type='TEAM' OR w.mechanic_id=u.id)))
 ) ON CONFLICT(user_id,kind,entity_id) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_customer_insert ON customers;
CREATE TRIGGER notify_customer_insert AFTER INSERT ON customers FOR EACH ROW EXECUTE FUNCTION notify_workshop_insert();
DROP TRIGGER IF EXISTS notify_vehicle_insert ON vehicles;
CREATE TRIGGER notify_vehicle_insert AFTER INSERT ON vehicles FOR EACH ROW EXECUTE FUNCTION notify_workshop_insert();
DROP TRIGGER IF EXISTS notify_order_insert ON work_orders;
CREATE TRIGGER notify_order_insert AFTER INSERT ON work_orders FOR EACH ROW EXECUTE FUNCTION notify_workshop_insert();
DROP TRIGGER IF EXISTS notify_maintenance_insert ON maintenance_records;
CREATE TRIGGER notify_maintenance_insert AFTER INSERT ON maintenance_records FOR EACH ROW EXECUTE FUNCTION notify_workshop_insert();
