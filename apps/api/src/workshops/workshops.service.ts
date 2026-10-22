import { BadRequestException, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { AuthUser } from "../auth/auth.types.js";
import { bodyObject, text, email } from "../common/validation.js";
@Injectable()
export class WorkshopsService {
  constructor(private readonly db: DatabaseService) {}
  async update(u: AuthUser, body: unknown) {
    const b = bodyObject(body, [
      "name",
      "rut",
      "phone",
      "email",
      "address",
      "hours",
      "preference",
      "logo",
    ]);
    const logo = text(b, "logo", 1500000);
    if (
      logo &&
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo)
    )
      throw new BadRequestException("Logo inválido.");
    await this.db.query(
      "UPDATE workshops SET name=$1,rut=$2,phone=$3,email=$4,address=$5,business_hours=$6::jsonb,preferences=$7::jsonb,logo_url=$8,updated_at=now() WHERE id=$9",
      [
        text(b, "name", 150, true),
        text(b, "rut", 20),
        text(b, "phone", 30),
        email(text(b, "email", 150)),
        text(b, "address", 255),
        JSON.stringify({ text: text(b, "hours", 10000) }),
        JSON.stringify({ regional: text(b, "preference", 100) }),
        logo || null,
        u.workshopId,
      ],
    );
    return { message: "Configuración guardada." };
  }
  async activity(u: AuthUser) {
    const r = await this.db.query(
      "SELECT id,workshop_id,user_id,description,created_at,entity_id,entity_type FROM activity_logs WHERE workshop_id=$1 AND ($2::uuid IS NULL OR user_id=$2 OR (entity_type='work_order' AND EXISTS(SELECT 1 FROM work_orders w WHERE w.id=entity_id AND w.workshop_id=$1 AND (w.mechanic_id=$2 OR w.assignment_type='TEAM')))) ORDER BY created_at DESC LIMIT 100",
      [u.workshopId, u.role === "ADMIN" ? null : u.id],
    );
    return r.rows.map((x) => ({
      id: x.id,
      workshopId: x.workshop_id,
      userId: x.user_id ?? "",
      text: x.description ?? "",
      date: x.created_at.toISOString(),
      ...(x.entity_type === "work_order" ? { orderId: x.entity_id } : {}),
    }));
  }
  async customers(u: AuthUser) {
    const r = await this.db.query(
      "SELECT DISTINCT c.* FROM customers c JOIN vehicles v ON v.customer_id=c.id AND v.workshop_id=c.workshop_id JOIN work_orders o ON o.vehicle_id=v.id AND o.workshop_id=v.workshop_id WHERE c.workshop_id=$1 AND (o.mechanic_id=$2 OR o.assignment_type='TEAM') AND c.active",
      [u.workshopId, u.id],
    );
    return r.rows;
  }
}
