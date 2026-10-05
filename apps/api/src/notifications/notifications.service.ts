import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AuthUser } from '../auth/auth.types.js';
import { uuid } from '../common/validation.js';
// Re-check assignment on every read: reassignment must revoke old notifications too.
const visible = `n.workshop_id=$1 AND n.user_id=$2 AND ($3::boolean OR n.kind IN ('customer','vehicle') OR
 (n.kind='order' AND EXISTS(SELECT 1 FROM work_orders w WHERE w.id=n.entity_id AND w.workshop_id=n.workshop_id AND (w.assignment_type='TEAM' OR w.mechanic_id=$2))) OR
 (n.kind='maintenance' AND EXISTS(SELECT 1 FROM maintenance_records m JOIN work_orders w ON w.vehicle_id=m.vehicle_id AND w.workshop_id=m.workshop_id WHERE m.id=n.entity_id AND m.workshop_id=n.workshop_id AND (w.assignment_type='TEAM' OR w.mechanic_id=$2))))`;
@Injectable()
export class NotificationsService {
 constructor(private readonly db: DatabaseService) {}
 async inbox(u:AuthUser) {
  const params=[u.workshopId,u.id,u.role==='ADMIN'];
  const r=await this.db.query(`SELECT n.*,count(*) FILTER(WHERE read_at IS NULL) OVER() AS unread_total FROM user_notifications n WHERE ${visible} ORDER BY created_at DESC,id DESC LIMIT 50`,params);
  return {unread:Number(r.rows[0]?.unread_total??0),items:r.rows.map(n=>({id:n.id,kind:n.kind,title:n.title,message:n.message,createdAt:n.created_at,readAt:n.read_at,href:n.kind==='order'?'/ordenes/'+n.entity_id:n.kind==='maintenance'?'/mantenciones':u.role==='ADMIN'?(n.kind==='customer'?'/clientes/':'/vehiculos/')+n.entity_id:undefined}))};
 }
 async read(u:AuthUser,id?:string) {
  const r=await this.db.query(`UPDATE user_notifications n SET read_at=COALESCE(read_at,now()) WHERE ${visible}${id?' AND n.id=$4':''} RETURNING n.id`,[u.workshopId,u.id,u.role==='ADMIN',...(id?[uuid(id)]:[])]);
  if(id && !r.rows.length)throw new NotFoundException('Aviso no disponible.');
  return {updated:r.rowCount};
 }
}
