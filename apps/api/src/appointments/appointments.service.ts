import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";
import { AuthUser } from "../auth/auth.types.js";
import { bodyObject, text, uuid } from "../common/validation.js";
import {
  choice,
  date,
  time,
  reference,
  activity,
} from "../common/operations.js";
const states: Record<string, string> = {
  Programada: "SCHEDULED",
  Confirmada: "CONFIRMED",
  "En taller": "IN_PROGRESS",
  Finalizada: "COMPLETED",
  Cancelada: "CANCELLED",
};
@Injectable()
export class AppointmentsService {
  constructor(private readonly db: DatabaseService) {}
  async findAll(u: AuthUser) {
    const r = await this.db.query(
      "SELECT *,appointment_date::text AS day,appointment_time::text AS hour FROM appointments WHERE workshop_id=$1 AND ($2::uuid IS NULL OR mechanic_id=$2) ORDER BY appointment_date,appointment_time",
      [u.workshopId, u.role === "ADMIN" ? null : u.id],
    );
    return r.rows.map((x) => ({
      id: x.id,
      workshopId: x.workshop_id,
      customerId: x.customer_id,
      vehicleId: x.vehicle_id ?? "",
      mechanicId: x.mechanic_id ?? "",
      service: x.requested_service,
      date: x.day,
      time: x.hour.slice(0, 5),
      notes: x.observations ?? "",
      cancellation:
        x.status === "CANCELLED" ? (x.cancellation ?? undefined) : undefined,
      status:
        Object.keys(states).find((k) => states[k] === x.status) ?? "Cancelada",
    }));
  }
  async save(u: AuthUser, body: unknown, id?: string) {
    const b = bodyObject(body, [
      "customerId",
      "vehicleId",
      "mechanicId",
      "service",
      "date",
      "time",
      "notes",
      "status",
    ]);
    if (id) uuid(id);
    const day = date(b.date, "fecha"),
      hour = time(b.time),
      status = states[choice(b.status, Object.keys(states), "Estado")],
      service = text(b, "service", 255, true),
      notes = text(b, "notes", 20000);
    return this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        u.workshopId,
      ]);
      await reference(c, "customers", b.customerId, u.workshopId);
      const v = await reference(c, "vehicles", b.vehicleId, u.workshopId);
      if (v.customer_id !== b.customerId)
        throw new BadRequestException("El vehículo no corresponde al cliente.");
      await reference(c, "users", b.mechanicId, u.workshopId);
      if (
        id &&
        !(
          await c.query(
            "SELECT id FROM appointments WHERE id=$1 AND workshop_id=$2",
            [id, u.workshopId],
          )
        ).rows[0]
      )
        throw new NotFoundException("Cita no encontrada.");
      const previous = id
        ? (
            await c.query(
              "SELECT status FROM appointments WHERE id=$1 AND workshop_id=$2 FOR UPDATE",
              [id, u.workshopId],
            )
          ).rows[0]
        : null;
      if (
        (status === "CANCELLED" && previous?.status !== "CANCELLED") ||
        (previous?.status === "CANCELLED" && status !== "CANCELLED")
      )
        throw new BadRequestException(
          "Utiliza Cancelar visita e indica el motivo. Una cita cancelada debe conservar su estado.",
        );
      const collision = await c.query(
        "SELECT id FROM appointments WHERE workshop_id=$1 AND mechanic_id=$2 AND appointment_date=$3 AND appointment_time=$4 AND status NOT IN ('CANCELLED','COMPLETED','NO_SHOW') AND ($5::uuid IS NULL OR id<>$5)",
        [u.workshopId, b.mechanicId, day, hour, id ?? null],
      );
      if (!["CANCELLED", "COMPLETED"].includes(status) && collision.rows[0])
        throw new ConflictException(
          "El mecánico ya tiene una cita a esa hora.",
        );
      const values = [
        b.customerId,
        b.vehicleId,
        b.mechanicId,
        service,
        day,
        hour,
        notes,
        status,
        u.workshopId,
      ];
      const r = id
        ? await c.query(
            "UPDATE appointments SET customer_id=$1,vehicle_id=$2,mechanic_id=$3,requested_service=$4,appointment_date=$5,appointment_time=$6,observations=$7,status=$8,updated_at=now() WHERE workshop_id=$9 AND id=$10 RETURNING id",
            [...values, id],
          )
        : await c.query(
            "INSERT INTO appointments(customer_id,vehicle_id,mechanic_id,requested_service,appointment_date,appointment_time,observations,status,workshop_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",
            values,
          );
      await activity(
        c,
        u.workshopId,
        u.id,
        "appointment",
        r.rows[0].id,
        "Cita " + (id ? "actualizada" : "programada") + ": " + service,
      );
      return r.rows[0];
    });
  }
}
